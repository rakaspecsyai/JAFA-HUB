import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { normalizeQuery } from "./content-types";
import { aiBudgetConfig } from "./ai-config";
import { withAiBudget } from "./ai-usage";

export const EMBEDDING_MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536, CHUNK_CHARS = 1200, PIECE = new RegExp(`.{1,${CHUNK_CHARS}}`, "gu");
export type Embed = (texts: string[]) => Promise<number[][]>;
export type KnowledgeHit = { id: string; revisionId: string; itemId: string; pageNumber: number; text: string; title: string; number: string; year: string; regulationStatus: "current" | "amended"; statusNote: string; officialUrl: string };

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
// Potongan tidak melintasi halaman agar rujukan halaman pasti; baris "Pasal N" yang terdeteksi memulai potongan baru.
export function chunkPages(pages: { number: number; text: string }[]) {
  const chunks: { pageNumber: number; position: number; text: string; checksum: string }[] = [];
  for (const page of pages) {
    let current = "";
    const flush = () => { const text = current.trim(); current = ""; if (text) chunks.push({ pageNumber: page.number, position: chunks.length, text, checksum: hash(text) }); };
    for (const line of page.text.split("\n")) {
      if (/^\s*Pasal\s+\d+/.test(line)) flush();
      for (const word of line.split(/\s+/).flatMap(part => part.match(PIECE) ?? [])) {
        if (current && current.length + 1 + word.length > CHUNK_CHARS) flush();
        current += (/\S$/.test(current) ? " " : "") + word;
      }
      if (current) current += "\n";
    }
    flush();
  }
  return chunks;
}

const STOPWORDS = new Set("yang dan di ke dari untuk dengan atau pada ini itu apa apakah bagaimana adalah dalam oleh sebagai tidak akan bisa dapat saya kami kita anda jika juga harus ada berapa siapa kapan mengapa kenapa tentang bagi para serta tersebut karena maka agar sudah belum telah".split(" "));
export function keywordTerms(question: string) {
  return [...new Set(normalizeQuery(question).match(/[\p{L}\p{N}]+/gu) ?? [])].filter(word => (word.length > 1 || /\d/.test(word)) && !STOPWORDS.has(word)).slice(0, 12);
}

function vectorLiteral(values: number[]) {
  if (values?.length !== DIMENSIONS || !values.every(Number.isFinite)) throw new Error("Hasil embedding tidak sesuai.");
  return `[${values.join(",")}]`;
}
const embeddingResponse = z.object({ data: z.array(z.object({ index: z.number().int().nonnegative(), embedding: z.array(z.number()).length(DIMENSIONS) })), usage: z.object({ total_tokens: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }) });
export async function openAiEmbed(texts: string[]) {
  const budget = aiBudgetConfig();
  if (!budget || !process.env.OPENAI_API_KEY) throw new Error("Konfigurasi key dan anggaran embedding belum lengkap.");
  return withAiBudget(budget, { input: 0, output: 0, embedding: texts.reduce((total, text) => total + Buffer.byteLength(text, "utf8") + 8, 0) }, async record => {
    const response = await fetch("https://api.openai.com/v1/embeddings", { method: "POST", signal: AbortSignal.timeout(30000),
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, encoding_format: "float" }) });
    if (!response.ok) throw new Error(`Layanan embedding menolak permintaan (HTTP ${response.status}).`);
    const result = embeddingResponse.safeParse(await response.json());
    if (!result.success || result.data.data.length !== texts.length) throw new Error("Respons embedding tidak sesuai.");
    record({ input: 0, output: 0, embedding: result.data.usage.total_tokens });
    return result.data.data.sort((a, b) => a.index - b.index).map((item, index) => {
      if (item.index !== index) throw new Error("Urutan hasil embedding tidak sesuai.");
      vectorLiteral(item.embedding);
      return item.embedding;
    });
  });
}
const defaultEmbed = () => process.env.OPENAI_API_KEY && aiBudgetConfig() ? openAiEmbed : undefined;

// Kelayakan dibaca dari penunjuk terbit saat ini: penarikan/revisi baru langsung berlaku tanpa menghapus vektor. Status Dicabut tidak dicari.
const eligibleRevision = Prisma.sql`c.kind = 'knowledge' AND NOT c.archived AND r.status = 'approved' AND r.payload->>'regulationStatus' IN ('current', 'amended')`;
const eligibleChunks = Prisma.sql`FROM "KnowledgeChunk" k JOIN "ContentRevision" r ON r.id = k."revisionId" JOIN "ContentItem" c ON c."publishedRevisionId" = r.id AND c.id = r."itemId" WHERE ${eligibleRevision}`;
const hits = Prisma.sql`SELECT k.id, k."revisionId", c.id AS "itemId", k."pageNumber", k.text, r.payload->>'title' AS title, r.payload->>'number' AS number, r.payload->>'year' AS year, r.payload->>'regulationStatus' AS "regulationStatus", r.payload->>'statusNote' AS "statusNote", r.payload->>'officialUrl' AS "officialUrl" ${eligibleChunks}`;
export async function readKnowledgeHits(ids: string[]): Promise<KnowledgeHit[]> {
  return ids.length ? db.$queryRaw<KnowledgeHit[]>(Prisma.sql`${hits} AND k.id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})`) : [];
}
export async function readKnowledgePages(revisionIds: string[]): Promise<{ revisionId: string; pageNumber: number }[]> {
  return revisionIds.length ? db.$queryRaw<{ revisionId: string; pageNumber: number }[]>(Prisma.sql`SELECT DISTINCT k."revisionId", k."pageNumber" ${eligibleChunks} AND k."revisionId" IN (${Prisma.join(revisionIds.map(id => Prisma.sql`${id}::uuid`))})`) : [];
}
const searchable = Prisma.sql`to_tsvector('simple', translate(concat_ws(' ', r.payload->>'title', r.payload->>'number', r.payload->>'year', k.text), '/.', '  '))`;
const pendingTexts = async () => Number((await db.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(DISTINCT k.checksum) AS total ${eligibleChunks} AND k.embedding IS NULL`))[0].total);

async function indexPending(embed?: Embed) {
  const missing = await db.$queryRaw<{ revisionId: string; documentId: string }[]>(Prisma.sql`SELECT r.id AS "revisionId", d."documentId" FROM "ContentItem" c JOIN "ContentRevision" r ON r.id = c."publishedRevisionId" AND r."itemId" = c.id JOIN "RevisionDocument" d ON d."revisionId" = r.id WHERE ${eligibleRevision} AND NOT EXISTS (SELECT 1 FROM "KnowledgeChunk" k WHERE k."revisionId" = r.id)`);
  for (const { revisionId, documentId } of missing) {
    const pages = await db.documentPage.findMany({ where: { documentId }, orderBy: { number: "asc" } });
    await db.knowledgeChunk.createMany({ data: chunkPages(pages).map(chunk => ({ ...chunk, revisionId })), skipDuplicates: true });
  }
  // Teks identik dengan model yang sama memakai vektor yang sudah dibayar.
  await db.$executeRaw`UPDATE "KnowledgeChunk" k SET model = s.model, embedding = s.embedding FROM (SELECT DISTINCT ON (checksum) checksum, model, embedding FROM "KnowledgeChunk" WHERE model = ${EMBEDDING_MODEL}) s WHERE k.embedding IS NULL AND k.checksum = s.checksum`;
  let embedded = 0;
  // Batas putaran dihitung di awal agar kegagalan diam tidak mengulang pembayaran tanpa akhir; retry berikutnya lewat pemicu baru.
  for (let left = embed ? await pendingTexts() : 0; embed && left > 0;) {
    const batch = await db.$queryRaw<{ checksum: string; text: string }[]>(Prisma.sql`SELECT DISTINCT ON (k.checksum) k.checksum, k.text ${eligibleChunks} AND k.embedding IS NULL ORDER BY k.checksum LIMIT 64`);
    if (!batch.length) break;
    const vectors = await embed(batch.map(chunk => chunk.text));
    if (vectors.length !== batch.length) throw new Error("Jumlah hasil embedding tidak sesuai.");
    for (const [index, { checksum }] of batch.entries()) await db.$executeRaw`UPDATE "KnowledgeChunk" SET model = ${EMBEDDING_MODEL}, embedding = ${vectorLiteral(vectors[index])}::vector WHERE checksum = ${checksum} AND embedding IS NULL`;
    embedded += batch.length; left -= batch.length;
  }
  return { chunked: missing.length, embedded, pending: await pendingTexts() };
}
const queue = globalThis as unknown as { jafaIndexQueue?: Promise<unknown> };
// Satu putaran per proses pada satu waktu; pemicu berikutnya menunggu agar teks yang sama tidak dibayar dua kali.
export function runIndexJobs(embed: Embed | undefined = defaultEmbed()) {
  const run = (queue.jafaIndexQueue ?? Promise.resolve()).catch(() => {}).then(() => indexPending(embed));
  queue.jafaIndexQueue = run;
  return run;
}

// shortcut: tanpa indeks GIN/HNSW dan limit 6 belum dikalibrasi; tambah indeks/kalibrasi setelah korpus dan pertanyaan acuan tersedia.
export async function retrieveKnowledge(question: string, embed: Embed | null | undefined = defaultEmbed(), limit = 6) {
  const terms = keywordTerms(question).join(" | ");
  const keyword = terms ? await db.$queryRaw<KnowledgeHit[]>(Prisma.sql`${hits} AND ${searchable} @@ to_tsquery('simple', ${terms}) ORDER BY ts_rank(${searchable}, to_tsquery('simple', ${terms})) DESC, k.id LIMIT 20`) : [];
  const vector = embed && normalizeQuery(question) ? await embed([question.slice(0, 2000)]).then(([values]) => vectorLiteral(values)).catch(() => null) : null;
  const semantic = vector ? await db.$queryRaw<KnowledgeHit[]>(Prisma.sql`${hits} AND k.model = ${EMBEDDING_MODEL} ORDER BY k.embedding <=> ${vector}::vector, k.id LIMIT 20`) : [];
  // Reciprocal rank fusion menggabungkan urutan kata kunci dan makna tanpa menyetarakan skor berbeda skala.
  const ranked = new Map<string, { item: KnowledgeHit; score: number }>();
  for (const list of [keyword, semantic]) list.forEach((item, rank) => { const entry = ranked.get(item.id) ?? { item, score: 0 }; entry.score += 1 / (60 + rank); ranked.set(item.id, entry); });
  return { semantic: vector !== null, items: [...ranked.values()].sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id)).slice(0, limit).map(entry => entry.item) };
}
