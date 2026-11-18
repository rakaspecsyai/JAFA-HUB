import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { createLocalDatabase } from "../../src/lib/local-db";
import { verifyPassword } from "../../src/lib/passwords";
import { applyLocalMigrations } from "../../scripts/local-migrations";
import { exportLocal, importTransfer } from "../../scripts/transfer-local";
import { createTransferFixture, transferImageKey, transferPassword, transferPdfKey, transferRows } from "../fixtures/transfer";

test("transfer logis mempertahankan nilai, publikasi, kredensial, PDF/vector dan biaya tanpa sesi lintas lingkungan", { timeout: 60000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), "jafa-transfer-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await createTransferFixture(root);
  const result = await exportLocal(fixture.pg, fixture.media, fixture.bundle);
  assert.deepEqual(result.omitted, { Session: 1, Verification: 1, RateLimit: 1 });
  const bytes = await readFile(join(fixture.bundle, "data.json"), "utf8");
  assert.ok(!/MUST-NOT-TRANSFER/.test(bytes)); assert.ok(bytes.includes("9007199254740993"));
  assert.equal((await stat(fixture.bundle)).mode & 0o777, 0o700);
  for (const name of ["data.json", "manifest.json", `media/${transferImageKey}`]) assert.equal((await stat(join(fixture.bundle, name))).mode & 0o777, 0o600);
  const target = createLocalDatabase(join(root, "target-pg"));
  try {
    await applyLocalMigrations(await target.engine);
    const restoredMedia = join(root, "restored-media"), before = await transferRows(target.pool);
    assert.deepEqual(await importTransfer(fixture.bundle, target.pool, restoredMedia), result);
    const actual = await transferRows(target.pool);
    for (const [table, rows] of Object.entries(fixture.expected)) {
      assert.deepEqual(actual[table], table === "_prisma_migrations" ? before[table] : table === "AuditEvent" ? [...rows, ...before.AuditEvent].sort() : ["Session", "Verification", "RateLimit"].includes(table) ? [] : rows, table);
    }
    const password = (await target.pool.query<{ password: string }>('SELECT password FROM "Account" LIMIT 1')).rows[0].password;
    assert.ok(await verifyPassword(transferPassword, password));
    assert.deepEqual(await readFile(join(restoredMedia, transferImageKey)), await readFile(join(fixture.media, transferImageKey)));
    assert.deepEqual(await readFile(join(restoredMedia, "documents", transferPdfKey)), await readFile(join(fixture.media, "documents", transferPdfKey)));
    await assert.rejects(importTransfer(fixture.bundle, target.pool, join(root, "repeat")), /tujuan harus kosong/);
    assert.deepEqual(await transferRows(target.pool), actual);
    await assert.rejects(stat(join(root, "repeat")), { code: "ENOENT" });
  } finally { await target.close(); }
  const source = createLocalDatabase(fixture.pg);
  try { assert.deepEqual(await transferRows(source.pool), fixture.expected); }
  finally { await source.close(); }
  await assert.rejects(exportLocal(fixture.pg, fixture.media, fixture.bundle), { code: "EEXIST" });
});

test("transfer menolak bundle berubah, skema salah dan relasi gagal dengan rollback seluruh data", { timeout: 60000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), "jafa-transfer-reject-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await createTransferFixture(root);
  await exportLocal(fixture.pg, fixture.media, fixture.bundle);
  const dataPath = join(fixture.bundle, "data.json"), manifestPath = join(fixture.bundle, "manifest.json");
  const original = await readFile(dataPath, "utf8"), originalManifest = await readFile(manifestPath, "utf8");
  const target = createLocalDatabase(join(root, "target-pg"));
  try {
    await applyLocalMigrations(await target.engine);
    const before = await transferRows(target.pool), media = join(root, "restored-media");
    await writeFile(dataPath, `${original} `);
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), /Checksum bundle/);
    await writeFile(dataPath, original);
    await writeFile(join(fixture.bundle, "media", "extra"), "tambahan");
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), /Checksum bundle/);
    await rm(join(fixture.bundle, "media", "extra"));
    await target.pool.query('UPDATE "_prisma_migrations" SET checksum=$1 WHERE migration_name=(SELECT min(migration_name) FROM "_prisma_migrations")', ["0".repeat(64)]);
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), /checksum berbeda/);
    for (const row of before._prisma_migrations.map(value => JSON.parse(value))) await target.pool.query('UPDATE "_prisma_migrations" SET checksum=$1 WHERE id=$2', [row.checksum, row.id]);
    async function changed(update: (data: { tables: Record<string, string[]> }) => void) {
      const data = JSON.parse(original); update(data);
      const text = JSON.stringify(data), manifest = JSON.parse(originalManifest);
      manifest.dataSha256 = createHash("sha256").update(text).digest("hex");
      await writeFile(dataPath, text); await writeFile(manifestPath, JSON.stringify(manifest));
    }
    await changed(data => { const row = JSON.parse(data.tables.RevisionMedia[0]); row.mediaId = randomUUID(); data.tables.RevisionMedia[0] = JSON.stringify(row); });
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), /foreign key constraint/);
    assert.deepEqual(await transferRows(target.pool), before);
    await changed(data => { data.tables.ContentRevision = data.tables.ContentRevision.map((value: string) => { const row = JSON.parse(value); if (row.status === "approved") row.reviewerId = row.authorId; return JSON.stringify(row); }); });
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), /larangan persetujuan sendiri/);
    assert.deepEqual(await transferRows(target.pool), before);
    await changed(data => { const row = JSON.parse(data.tables.User[0]); row.unknownColumn = "jangan dibuang diam-diam"; data.tables.User[0] = JSON.stringify(row); });
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), /Nilai hasil impor berbeda/);
    assert.deepEqual(await transferRows(target.pool), before);
    await writeFile(dataPath, original); await writeFile(manifestPath, originalManifest);
    await mkdir(media); await writeFile(join(media, "keep"), "pertahankan");
    await assert.rejects(importTransfer(fixture.bundle, target.pool, media), { code: "EEXIST" });
    assert.equal(await readFile(join(media, "keep"), "utf8"), "pertahankan");
    assert.deepEqual(await transferRows(target.pool), before);
  } finally { await target.close(); }
});

test("ekspor menolak engine aktif, sumber belum siap, media hilang dan jalur publik/symlink", { timeout: 60000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), "jafa-transfer-source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await createTransferFixture(root);
  const busy = createLocalDatabase(fixture.pg);
  try { await busy.engine; await assert.rejects(exportLocal(fixture.pg, fixture.media, fixture.bundle), /sedang digunakan/); }
  finally { await busy.close(); }
  await assert.rejects(stat(fixture.bundle), { code: "ENOENT" });
  await assert.rejects(exportLocal(join(root, "missing"), fixture.media, fixture.bundle), { code: "ENOENT" });
  await assert.rejects(exportLocal(fixture.pg, fixture.media, resolve("public", `transfer-${randomUUID()}`)), /direktori privat/);
  await symlink(resolve("public"), join(root, "public-alias"));
  await assert.rejects(exportLocal(fixture.pg, fixture.media, join(root, "public-alias", "bundle")), /direktori privat/);
  await symlink(join(fixture.pg, "PG_VERSION"), join(fixture.media, "linked"));
  await assert.rejects(exportLocal(fixture.pg, fixture.media, fixture.bundle), /menolak symlink/);
  await rm(join(fixture.media, "linked"));
  await rm(join(fixture.media, transferImageKey));
  await assert.rejects(exportLocal(fixture.pg, fixture.media, fixture.bundle), /dirujuk hilang/);
  await assert.rejects(stat(fixture.bundle), { code: "ENOENT" });
});

test("CLI transfer menolak mode salah sebelum koneksi dan mengembalikan exit 0/1 dengan data lokal utuh", { timeout: 60000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), "jafa-transfer-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const run = promisify(execFile), script = ["--import", "tsx", "scripts/transfer-local.ts"];
  await run(process.execPath, [...script, "--help"], { timeout: 10000 });
  const fixture = await createTransferFixture(root);
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE: "true", JAFA_LOCAL_DATABASE_DIRECTORY: fixture.pg, MEDIA_DIRECTORY: fixture.media, DATABASE_URL: "postgresql://unused@127.0.0.1:1/unused", OPENAI_API_KEY: "", JAFA_RAG_ENABLED: "false" };
  await assert.rejects(run(process.execPath, [...script, "export", fixture.bundle], { env: { ...env, NODE_ENV: "production" }, timeout: 10000 }), error => (error as { code: number }).code === 1);
  await assert.rejects(stat(fixture.bundle), { code: "ENOENT" });
  await assert.rejects(run(process.execPath, [...script, "import", fixture.bundle, join(root, "new-media")], { env, timeout: 10000 }), error => (error as { code: number }).code === 1);
  await run(process.execPath, [...script, "export", fixture.bundle], { env, timeout: 20000 });
  assert.deepEqual((await readdir(fixture.bundle)).sort(), ["data.json", "manifest.json", "media"]);
  await assert.rejects(run(process.execPath, [...script, "export", fixture.bundle], { env, timeout: 20000 }), error => (error as { code: number }).code === 1);
  const alias = join(root, "bundle-alias"); await cp(fixture.bundle, alias, { recursive: true });
  await rm(join(alias, "data.json")); await symlink(join(fixture.bundle, "data.json"), join(alias, "data.json"));
  const target = createLocalDatabase();
  try { await assert.rejects(importTransfer(alias, target.pool, join(root, "alias-media")), /menolak symlink/); }
  finally { await target.close(); }
});
