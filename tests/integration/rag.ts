import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { Staff } from "../../src/lib/content-types";
import { payloadSchema } from "../../src/lib/content-types";
import { aiBudgetConfig, aiCost } from "../../src/lib/ai-config";
import { AppError } from "../../src/lib/errors";

const month = () => new Date().toISOString().slice(0, 7);
const vector = Array<number>(1536).fill(0); vector[0] = 1;
const config = { OPENAI_API_KEY: "synthetic-rag-no-network", OPENAI_RAG_MODEL: "synthetic-model", JAFA_RAG_ENABLED: "true", JAFA_AI_MONTHLY_USD: "100", JAFA_AI_EMBEDDING_USD_PER_MILLION: "1", JAFA_AI_INPUT_USD_PER_MILLION: "1", JAFA_AI_OUTPUT_USD_PER_MILLION: "1" };
const answer = (id: string) => ({ answer: "Penilai Pemerintah melakukan penilaian sesuai sumber sintetis.", sourceIds: [id], insufficientEvidence: false });
const response = (value: unknown, overrides: Record<string, unknown> = {}) => Response.json({ status: "completed", usage: { input_tokens: 100, output_tokens: 20 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(value) }] }], ...overrides });

async function configured(db: PrismaClient, run: () => Promise<void>) {
  const previous = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]])), fetch = globalThis.fetch;
  Object.assign(process.env, config);
  globalThis.fetch = async () => { throw new Error("Tes RAG menolak seluruh jaringan yang tidak di-stub."); };
  await db.aiUsageMonth.deleteMany();
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "rag:" } } });
  await db.contentItem.updateMany({ where: { kind: "knowledge" }, data: { publishedRevisionId: null } });
  try { await run(); }
  finally {
    globalThis.fetch = fetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

async function source(db: PrismaClient, editor: Staff, approver: Staff) {
  const service = await import("../../src/lib/content-service"), knowledge = await import("../../src/lib/knowledge");
  const text = `Pasal 1\nPenilai Pemerintah melakukan penilaian objek sintetis sesuai peraturan. Fixture ${randomUUID()}.`;
  const document = await db.documentAsset.create({ data: { storageKey: `${randomUUID()}.pdf`, checksum: "synthetic-rag-source", size: 100, pageCount: 1, needsOcr: false, parserVersion: "synthetic-rag", uploadedBy: editor.id, pages: { create: { number: 1, text, checksum: "synthetic-rag-page" } } } });
  const saved = await service.saveDraft(editor, { kind: "knowledge", slug: `rag-${randomUUID()}`, payload: payloadSchema.parse({ title: "Peraturan Penilai Pemerintah sintetis", summary: "Ringkasan peraturan sintetis untuk tes RAG.", body: "", number: "UJI 1", year: "2026", publisher: "Instansi fixture", officialUrl: "https://jdih.kemenkeu.go.id/dok/fixture", statusNote: "Diubah oleh ketentuan sintetis; periksa ruang lingkup perubahan.", regulationStatus: "amended", documentId: document.id, documentReviewed: true }), reviewedOn: "2026-11-16", professions: ["pp"], sources: [{ title: "Sumber sintetis", url: "https://jdih.kemenkeu.go.id/dok/fixture", reviewedOn: "2026-11-16" }] });
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Fixture RAG terisolasi.");
  await knowledge.runIndexJobs(async texts => texts.map(() => vector));
  const chunk = await db.knowledgeChunk.findFirstOrThrow({ where: { revisionId: saved.revisionId } });
  return { ...saved, chunk, text };
}

function provider(generate: (body: Record<string, unknown>) => Promise<Response>) {
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(String(init?.body));
    if (url === "https://api.openai.com/v1/embeddings") return Response.json({ data: body.input.map((_: string, index: number) => ({ index, embedding: vector })), usage: { total_tokens: 10 } });
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(body.store, false); assert.deepEqual(body.tools, []);
    return generate(body);
  };
}

export function registerRagTests(database: () => PrismaClient, actors: () => { editor: Staff; approver: Staff }) {
  test("anggaran AI atomik untuk permintaan bersamaan dan tetap menahan tagihan timeout yang tidak diketahui", { timeout: 20000 }, async () => {
    const db = database();
    await configured(db, async () => {
      const { withAiBudget } = await import("../../src/lib/ai-usage");
      const budget = { ...aiBudgetConfig()!, monthly: 2000n };
      await assert.rejects(withAiBudget(budget, { input: 3000, output: 0, embedding: 0 }, async () => assert.fail("Reservasi melebihi anggaran tidak boleh memanggil provider.")), { status: 429 });
      assert.equal(await db.aiUsageMonth.count(), 0);
      const settled = await Promise.allSettled(Array.from({ length: 8 }, () => withAiBudget(budget, { input: 1000, output: 0, embedding: 0 }, async record => {
        assert.ok((await db.aiUsageMonth.findUniqueOrThrow({ where: { month: month() } })).costMicrousd <= budget.monthly);
        await new Promise(resolve => setTimeout(resolve, 10));
        record({ input: 1000, output: 0, embedding: 0 });
      })));
      assert.equal(settled.filter(result => result.status === "fulfilled").length, 2, settled.map(result => result.status === "rejected" ? String(result.reason) : "ok").join("\n"));
      assert.ok(settled.filter(result => result.status === "rejected").every(result => result.reason instanceof AppError && result.reason.status === 429));
      await db.aiUsageMonth.deleteMany();
      for (let index = 0; index < 2; index++) await withAiBudget(budget, { input: 1000, output: 0, embedding: 0 }, async record => { record({ input: 100, output: 0, embedding: 0 }); });
      let usage = await db.aiUsageMonth.findUniqueOrThrow({ where: { month: month() } });
      assert.equal(usage.costMicrousd, 200n); assert.equal(usage.inputTokens, 200n); assert.equal(usage.requests, 2);
      await assert.rejects(withAiBudget(budget, { input: 1800, output: 0, embedding: 0 }, async () => { throw new Error("synthetic timeout"); }), /timeout/);
      let called = false;
      await assert.rejects(withAiBudget(budget, { input: 1, output: 0, embedding: 0 }, async () => { called = true; }), { status: 429 });
      assert.equal(called, false);
      usage = await db.aiUsageMonth.findUniqueOrThrow({ where: { month: month() } });
      assert.equal(usage.costMicrousd, 2000n); assert.equal(usage.failedRequests, 1); assert.equal(usage.unmeteredRequests, 1);
      await db.aiUsageMonth.deleteMany();
      await assert.rejects(withAiBudget(budget, { input: 1, output: 0, embedding: 0 }, async record => { record({ input: 2, output: 0, embedding: 0 }); }), /melampaui batas/);
      usage = await db.aiUsageMonth.findUniqueOrThrow({ where: { month: month() } });
      assert.equal(usage.costMicrousd, 1n); assert.equal(usage.unmeteredRequests, 1);
    });
  });

  test("RAG merujuk potongan disetujui, menghitung token, dan membatalkan hasil bila sumber ditarik saat generasi", async () => {
    const db = database(), { editor, approver } = actors();
    await configured(db, async () => {
      const fixture = await source(db, editor, approver), { answerKnowledge } = await import("../../src/lib/rag");
      let generations = 0;
      provider(async body => { generations++; const context = JSON.parse(String(body.input)); assert.equal(context.sources[0].pageNumber, 1); assert.equal(context.sources[0].regulationStatus, "amended"); return response(answer(fixture.chunk.id)); });
      const result = await answerKnowledge("Apa tugas Penilai Pemerintah?");
      assert.equal(result.type, "answer");
      if (result.type !== "answer") return;
      assert.equal(result.sources[0].quote, fixture.text); assert.equal(result.sources[0].url, "https://jdih.kemenkeu.go.id/dok/fixture");
      assert.equal(result.sources[0].regulationStatus, "amended"); assert.equal(generations, 1);
      const usage = await db.aiUsageMonth.findUniqueOrThrow({ where: { month: month() } });
      assert.equal(usage.requests, 2); assert.equal(usage.inputTokens, 100n); assert.equal(usage.outputTokens, 20n); assert.equal(usage.embeddingTokens, 10n);
      assert.equal(usage.costMicrousd, aiCost({ input: 100, output: 20, embedding: 10 }, aiBudgetConfig()!));
      assert.ok(!JSON.stringify(usage, (_, value) => typeof value === "bigint" ? String(value) : value).includes("Apa tugas"));
      provider(async () => { await new Promise(resolve => setTimeout(resolve, 20)); return response(answer(fixture.chunk.id)); });
      const parallel = await Promise.allSettled(Array.from({ length: 3 }, () => answerKnowledge("Apa tugas Penilai Pemerintah?")));
      assert.equal(parallel.filter(value => value.status === "fulfilled").length, 2);
      assert.ok(parallel.some(value => value.status === "rejected" && value.reason instanceof AppError && value.reason.status === 429));
      provider(async () => { await (await import("../../src/lib/content-service")).withdrawContent(approver, fixture.itemId, fixture.revisionId, "Penarikan selama generasi fixture."); return response(answer(fixture.chunk.id)); });
      const changed = await answerKnowledge("Apa tugas Penilai Pemerintah?");
      assert.equal(changed.type, "fallback"); if (changed.type === "fallback") assert.equal(changed.reason, "sources_changed");
    });
  });

  test("RAG menolak ID/URL rekaan, respons parsial, penolakan dan gangguan provider tanpa retry", async () => {
    const db = database(), { editor, approver } = actors();
    await configured(db, async () => {
      const fixture = await source(db, editor, approver), { answerKnowledge } = await import("../../src/lib/rag");
      const cases = [
        () => response(answer(randomUUID())),
        () => response({ ...answer(fixture.chunk.id), sourceIds: [] }),
        () => response({ ...answer(fixture.chunk.id), sourceIds: [fixture.chunk.id, fixture.chunk.id] }),
        () => response({ ...answer(fixture.chunk.id), answer: "Lihat https://asing.invalid/rahasia" }),
        () => response(answer(fixture.chunk.id), { status: "incomplete" }),
        () => response(answer(fixture.chunk.id), { output: [{ type: "message", role: "assistant", content: [{ type: "refusal" }] }] }),
        () => Response.json({ secret: "synthetic-provider-private-error" }, { status: 503 })
      ];
      for (const bad of cases) {
        let calls = 0; provider(async () => { calls++; return bad(); });
        await assert.rejects(answerKnowledge("Apa tugas Penilai Pemerintah?"), error => error instanceof AppError && error.status === 503 && !error.message.includes("synthetic-provider-private-error"));
        assert.equal(calls, 1);
      }
      provider(async () => response({ answer: "Jangan tampilkan jawaban tanpa bukti ini.", sourceIds: [], insufficientEvidence: true }));
      const insufficient = await answerKnowledge("Apa tugas Penilai Pemerintah?");
      assert.equal(insufficient.type, "fallback"); if (insufficient.type === "fallback") assert.equal(insufficient.reason, "insufficient_evidence");
      await db.contentItem.update({ where: { id: fixture.itemId }, data: { publishedRevisionId: null } });
      provider(async () => { assert.fail("Tanpa korpus tidak boleh melakukan generasi."); });
      const missing = await answerKnowledge("Apa tugas Penilai Pemerintah?");
      assert.equal(missing.type, "fallback"); if (missing.type === "fallback") assert.equal(missing.reason, "no_evidence");
    });
  });

  test("HTTP RAG menolak origin/input/riwayat, membatasi laju, dan mati tanpa model/anggaran", async () => {
    const db = database();
    await configured(db, async () => {
      const { GET, POST } = await import("../../src/app/api/rag/route");
      const send = (body: unknown, origin = "http://localhost:3000") => POST(new Request("http://localhost:3000/api/rag", { method: "POST", headers: { origin }, body: JSON.stringify(body) }));
      assert.deepEqual(await GET().json(), { enabled: true });
      assert.equal((await send({ question: "tugas" }, "https://asing.invalid")).status, 403);
      assert.equal((await send({ question: "x".repeat(501) })).status, 400);
      assert.equal((await send({ question: "tugas", history: ["data pribadi"] })).status, 400);
      assert.equal((await send({ question: "x".repeat(9000) })).status, 413);
      await db.rateLimit.deleteMany({ where: { key: { startsWith: "rag:" } } });
      provider(async () => { assert.fail("Tidak ada korpus untuk generasi."); });
      for (let index = 0; index < 5; index++) assert.equal((await send({ question: "tugas" })).status, 200);
      const limited = await send({ question: "tugas" }); assert.equal(limited.status, 429); assert.equal(limited.headers.get("cache-control"), "no-store");
      delete process.env.OPENAI_RAG_MODEL;
      assert.deepEqual(await GET().json(), { enabled: false });
      const disabled = await send({ question: "tugas" }); assert.equal(disabled.status, 200); assert.equal((await disabled.json()).reason, "disabled");
    });
  });

  test("adapter embedding memakai anggaran bersama, key saja tetap menunggu dan cache tidak membayar ulang", async () => {
    const db = database(), { editor, approver } = actors();
    await configured(db, async () => {
      const fixture = await source(db, editor, approver), knowledge = await import("../../src/lib/knowledge");
      await db.$executeRaw`UPDATE "KnowledgeChunk" SET model = NULL, embedding = NULL WHERE "revisionId" = ${fixture.revisionId}::uuid`;
      delete process.env.JAFA_AI_MONTHLY_USD;
      let calls = 0;
      const pending = await knowledge.runIndexJobs(); assert.equal(pending.pending, 1);
      process.env.JAFA_AI_MONTHLY_USD = "100";
      globalThis.fetch = async (url, init) => { calls++; assert.equal(url, "https://api.openai.com/v1/embeddings"); const body = JSON.parse(String(init?.body)); return Response.json({ data: body.input.map((_: string, index: number) => ({ index, embedding: vector })), usage: { total_tokens: 10 } }); };
      assert.equal((await knowledge.runIndexJobs()).embedded, 1);
      assert.equal((await knowledge.runIndexJobs()).embedded, 0); assert.equal(calls, 1);
      const usage = await db.aiUsageMonth.findUniqueOrThrow({ where: { month: month() } }); assert.equal(usage.embeddingTokens, 10n); assert.equal(usage.requests, 1);
    });
  });

  test("evaluasi R4 membaca indeks disetujui tanpa API walau key/anggaran aktif, dan menolak acuan yang ditarik", async () => {
    const db = database(), { editor, approver } = actors();
    await configured(db, async () => {
      const fixture = await source(db, editor, approver);
      const { parseEvaluation } = await import("../../src/lib/rag-evaluation"), { evaluateRag } = await import("../../scripts/evaluate-rag");
      const set = parseEvaluation(JSON.stringify({ name: "Fixture R4 tanpa biaya", cases: [
        { id: "control", question: "Penilai Pemerintah", expected: "answer", references: [{ revisionId: fixture.revisionId, pageNumber: 1 }], notes: "Periksa teks/halaman fixture." },
        { id: "negative", question: "planet merkurius", expected: "fallback", references: [], notes: "Pertanyaan di luar korpus fixture." }
      ] }));
      let calls = 0; globalThis.fetch = async () => { calls++; throw new Error("Evaluasi kata kunci tidak boleh memakai jaringan."); };
      const before = await db.aiUsageMonth.findMany();
      const report = await evaluateRag(set);
      assert.equal(report.summary.pageRecallAt6, 1); assert.equal(report.summary.meanReciprocalRank, 1);
      assert.equal(report.cases[1].retrieved.length, 0); assert.equal(report.cases[0].retrieved[0].regulationStatus, "amended");
      assert.equal(report.generationEvaluated, false); assert.equal(report.betaReady, false); assert.equal(report.providerCalls, 0);
      assert.equal(calls, 0); assert.deepEqual(await db.aiUsageMonth.findMany(), before);
      await (await import("../../src/lib/content-service")).withdrawContent(approver, fixture.itemId, fixture.revisionId, "Uji acuan R4 basi.");
      await assert.rejects(evaluateRag(set), /Halaman acuan kasus control/); assert.equal(calls, 0);
    });
  });
}
