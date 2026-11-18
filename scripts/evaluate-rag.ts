import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "../src/lib/errors";
import { MAX_EVALUATION_BYTES, parseEvaluation, scoreRetrieval, summarizeRetrieval, type EvaluationSet } from "../src/lib/rag-evaluation";

export async function evaluateRag(set: EvaluationSet) {
  const { retrieveKnowledge, readKnowledgePages, readKnowledgeHits } = await import("../src/lib/knowledge");
  const references = set.cases.flatMap(item => item.references), ids = [...new Set(references.map(ref => ref.revisionId))];
  async function checkReferences() {
    const pages = new Set((await readKnowledgePages(ids)).map(page => `${page.revisionId}:${page.pageNumber}`));
    for (const item of set.cases) if (item.references.some(ref => !pages.has(`${ref.revisionId}:${ref.pageNumber}`))) throw new AppError(`Halaman acuan kasus ${item.id} tidak tersedia pada revisi disetujui yang masih layak dan terindeks. Periksa revisi, status dan indeks.`);
  }
  await checkReferences();
  const cases: ReturnType<typeof scoreRetrieval>[] = [], captured: Awaited<ReturnType<typeof readKnowledgeHits>> = [];
  for (const item of set.cases) {
    const started = performance.now();
    // null mengunci pencarian kata kunci; undefined akan memakai embedding berbayar yang dikonfigurasi server.
    const result = await retrieveKnowledge(item.question, null, 6);
    captured.push(...result.items);
    cases.push(scoreRetrieval(item, result.items, performance.now() - started));
  }
  // shortcut: konsistensi hanya memeriksa sumber acuan/hasil; gunakan snapshot korpus jika evaluasi kelak harus berjalan bersama mutasi CMS.
  await checkReferences();
  const current = new Map((await readKnowledgeHits([...new Set(captured.map(hit => hit.id))])).map(hit => [hit.id, hit]));
  if (captured.some(hit => JSON.stringify(hit) !== JSON.stringify(current.get(hit.id)))) throw new AppError("Sumber berubah selama evaluasi. Ulangi pada korpus yang stabil.");
  return { name: set.name, createdAt: new Date().toISOString(), datasetSha256: createHash("sha256").update(JSON.stringify(set)).digest("hex"),
    mode: "keyword-only", providerCalls: 0, estimatedApiCostMicrousd: "0", generationEvaluated: false, betaReady: false,
    summary: summarizeRetrieval(cases), cases
  };
}

function inside(directory: string, target: string) {
  const path = relative(directory, target);
  return path === "" || (!path.startsWith(`..${sep}`) && !isAbsolute(path));
}
async function main() {
  const args = process.argv.slice(2);
  const usage = "Gunakan npm run rag:evaluate -- <dataset.json> <direktori-laporan-baru>. Hanya kata kunci, tanpa API berbayar; hentikan dev bila memakai PGlite yang sama.";
  if (args.length === 1 && args[0] === "--help") { console.log(usage); return; }
  if (args.length !== 2) throw new AppError(usage);
  const [input, output] = args;
  const info = await stat(input);
  if (!info.isFile() || info.size > MAX_EVALUATION_BYTES) throw new AppError("Dataset harus berkas JSON biasa maksimal 1 MiB.");
  const set = parseEvaluation(await readFile(input, "utf8"));
  const root = await realpath(process.cwd()), requested = resolve(output);
  const privatePath = (path: string) => !inside(root, path) || inside(join(root, ".local"), path);
  if (!privatePath(requested)) throw new AppError("Simpan laporan di .local atau direktori privat di luar repositori, bukan public atau sumber kode.");
  const destination = join(await realpath(dirname(requested)), basename(requested));
  if (!privatePath(destination) || inside(await realpath(join(root, "public")), destination)) throw new AppError("Direktori laporan tidak boleh mengarah ke sumber kode atau public melalui symlink.");
  if (!process.env.DATABASE_URL && !(process.env.JAFA_LOCAL_DATABASE === "true" && process.env.NODE_ENV !== "production")) throw new AppError("Konfigurasikan database korpus evaluasi sebelum menjalankan alat ini.");
  if (process.env.JAFA_LOCAL_DATABASE === "true" && process.env.NODE_ENV !== "production") {
    try { if (!(await stat(join(process.env.JAFA_LOCAL_DATABASE_DIRECTORY ?? ".local/development-pg", "PG_VERSION"))).isFile()) throw new Error(); }
    catch { throw new AppError("Database lokal evaluasi belum tersedia. Siapkan korpus terlebih dahulu; evaluator tidak membuat database baru."); }
  }
  try { await mkdir(destination, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new AppError("Direktori laporan sudah ada; pilih tujuan baru agar laporan lama tetap tersimpan."); throw error; }
  const { db } = await import("../src/lib/db");
  try {
    const report = await evaluateRag(set);
    await writeFile(join(destination, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(`${report.summary.foundReferencePages}/${report.summary.referencePages} halaman acuan ditemukan dalam enam hasil. Generasi AI belum diuji. Laporan privat: ${join(destination, "report.json")}`);
    if (report.summary.missingReferencePages) process.exitCode = 2;
  } finally {
    await db.$disconnect();
    const { closeLocalDatabase } = await import("../src/lib/local-db"); await closeLocalDatabase();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof AppError ? error.message : "Evaluasi belum selesai. Periksa berkas, direktori privat, koneksi, migrasi dan indeks korpus; jangan hapus data untuk mengulang."); process.exitCode = 1; });
}
