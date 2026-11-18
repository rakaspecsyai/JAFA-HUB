import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createLocalDatabase } from "../../src/lib/local-db";
import { applyLocalMigrations } from "../../scripts/local-migrations";
import { payloadSchema } from "../../src/lib/content-types";

const run = promisify(execFile), script = ["--import", "tsx", "scripts/evaluate-rag.ts"];
test("CLI R4 membuat laporan privat, menolak penimpaan, dan memakai exit 2 untuk halaman yang tidak ditemukan", { timeout: 60000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-r4-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pg = join(directory, "pg"), input = join(directory, "cases.json"), output = join(directory, "report"), missed = join(directory, "missed");
  const local = createLocalDatabase(pg), client = new PrismaClient({ adapter: new PrismaPg(local.pool) });
  let revisionId: string;
  try {
    await applyLocalMigrations(await local.engine);
    const item = await client.contentItem.create({ data: { kind: "knowledge", slug: "r4-cli-synthetic" } });
    const document = await client.documentAsset.create({ data: { storageKey: `${randomUUID()}.pdf`, checksum: "synthetic-r4", size: 100, pageCount: 1, needsOcr: false, parserVersion: "synthetic-r4", uploadedBy: randomUUID(), pages: { create: { number: 1, text: "Dokumen contoh mengatur persediaan sintetis.", checksum: "synthetic-r4-page" } } } });
    const revision = await client.contentRevision.create({ data: { itemId: item.id, number: 1, status: "approved", reviewedOn: "2026-11-16", payload: payloadSchema.parse({ title: "Dokumen sintetis R4", summary: "Fixture evaluasi kata kunci.", body: "", number: "UJI 1", year: "2026", publisher: "Fixture", officialUrl: "https://jdih.kemenkeu.go.id/dok/fixture", regulationStatus: "current", statusNote: "Berlaku pada fixture.", documentId: document.id, documentReviewed: true }), document: { create: { documentId: document.id } } } });
    revisionId = revision.id;
    await client.contentItem.update({ where: { id: item.id }, data: { publishedRevisionId: revision.id } });
    await client.knowledgeChunk.create({ data: { revisionId: revision.id, position: 0, pageNumber: 1, text: "Dokumen contoh mengatur persediaan sintetis.", checksum: "synthetic-r4-chunk" } });
  } finally { await client.$disconnect(); await local.close(); }
  const set = { name: "Fixture CLI R4", cases: [{ id: "control", question: "persediaan", expected: "answer", references: [{ revisionId: revisionId!, pageNumber: 1 }], notes: "Pokok jawaban sintetis diperiksa manusia." }] };
  await writeFile(input, JSON.stringify(set), { mode: 0o600 });
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE: "true", JAFA_LOCAL_DATABASE_DIRECTORY: pg, OPENAI_API_KEY: "", JAFA_RAG_ENABLED: "false", DATABASE_URL: "postgresql://unused@127.0.0.1:1/r4" };
  const success = await run(process.execPath, [...script, input, output], { env, timeout: 20000 });
  assert.match(success.stdout, /1\/1 halaman acuan/); assert.match(success.stdout, /Generasi AI belum diuji/);
  const report = JSON.parse(await readFile(join(output, "report.json"), "utf8"));
  assert.equal(report.summary.pageRecallAt6, 1); assert.equal(report.betaReady, false); assert.equal(report.generationEvaluated, false);
  assert.equal(report.mode, "keyword-only"); assert.equal(report.providerCalls, 0); assert.equal(report.estimatedApiCostMicrousd, "0");
  assert.equal((await stat(output)).mode & 0o777, 0o700); assert.equal((await stat(join(output, "report.json"))).mode & 0o777, 0o600);
  const original = await readFile(join(output, "report.json"));
  await assert.rejects(run(process.execPath, [...script, input, output], { env, timeout: 20000 }), error => (error as { code: number; stderr: string }).code === 1 && /sudah ada/.test((error as { stderr: string }).stderr), "Tujuan yang sudah ada harus ditolak.");
  assert.deepEqual(await readFile(join(output, "report.json")), original);
  set.cases[0].question = "kataacuanmustahil";
  await writeFile(input, JSON.stringify(set), { mode: 0o600 });
  await assert.rejects(run(process.execPath, [...script, input, missed], { env, timeout: 20000 }), error => (error as { code: number }).code === 2, "Halaman acuan yang hilang harus menghasilkan exit 2.");
  assert.equal(JSON.parse(await readFile(join(missed, "report.json"), "utf8")).summary.missingReferencePages, 1);
  const reopened = createLocalDatabase(pg), checked = new PrismaClient({ adapter: new PrismaPg(reopened.pool) });
  try { assert.equal(await checked.user.count(), 0); assert.equal(await checked.aiUsageMonth.count(), 0); assert.equal(await checked.knowledgeChunk.count(), 1); }
  finally { await checked.$disconnect(); await reopened.close(); }
});

test("CLI R4 menolak dataset salah, output publik dan alias symlink sebelum membuka database", async t => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-r4-boundary-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = join(directory, "cases.json"), pg = join(directory, "must-not-open"), report = join(directory, "report");
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE: "true", JAFA_LOCAL_DATABASE_DIRECTORY: pg, OPENAI_API_KEY: "", JAFA_RAG_ENABLED: "false" };
  await writeFile(input, await readFile("docs/examples/rag-evaluation.json"));
  const help = await run(process.execPath, [...script, "--help"], { env, timeout: 10000 }); assert.match(help.stdout, /tanpa API berbayar/);
  const reject = (output: string) => assert.rejects(run(process.execPath, [...script, input, output], { env, timeout: 10000 }), error => (error as { code: number }).code === 1);
  await reject(resolve("public", `r4-report-${randomUUID()}`));
  const alias = join(directory, "public-alias"); await symlink(resolve("public"), alias);
  await reject(join(alias, `r4-report-${randomUUID()}`));
  await reject(report);
  await writeFile(input, "bukan JSON"); await reject(report);
  await assert.rejects(stat(pg), { code: "ENOENT" }); await assert.rejects(stat(report), { code: "ENOENT" });
});
