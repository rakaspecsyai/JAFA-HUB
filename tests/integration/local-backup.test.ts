import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { createLocalDatabase } from "../../src/lib/local-db";
import { credentialUser } from "../../src/lib/credentials";
import { applyLocalMigrations } from "../../scripts/local-migrations";
import { backupLocal, restoreLocal } from "../../scripts/local-backup";

async function temporary(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "jafa-backup-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const pg = join(root, "pg"), media = join(root, "media"), backup = join(root, "backup"), restored = join(root, "restored");
  await mkdir(media);
  return { root, pg, media, backup, restored };
}

async function allRows(engine: PGlite) {
  const tables = await engine.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const rows: Record<string, unknown[]> = {};
  for (const { tablename } of tables.rows) {
    rows[tablename] = (await engine.query(`SELECT row_to_json(t)::text AS row FROM "${tablename.replaceAll('"', '""')}" t ORDER BY row_to_json(t)::text`)).rows;
  }
  return rows;
}

test("backup/restore database dan media mempertahankan seluruh ID, nilai, dan relasi", { timeout: 60000 }, async t => {
  const { pg, media, backup, restored } = await temporary(t);
  const local = createLocalDatabase(pg);
  const client = new PrismaClient({ adapter: new PrismaPg(local.pool) });
  let expected: Awaited<ReturnType<typeof allRows>>;
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#183c52" } }).webp().toBuffer();
  try {
    await applyLocalMigrations(await local.engine);
    const editor = await client.user.create({ data: credentialUser({ name: "Editor uji", email: "editor@uji.invalid", role: "editor" }, "synthetic-backup-only") });
    const approver = await client.user.create({ data: credentialUser({ name: "Penyetuju uji", email: "approver@uji.invalid", role: "approver" }, "synthetic-backup-only") });
    await client.session.create({ data: { tokenHash: "synthetic-session-only", userId: editor.id, expiresAt: new Date("2026-12-01T00:00:00Z") } });
    const asset = await client.mediaAsset.create({ data: { storageKey: "synthetic.webp", mime: "image/webp", size: bytes.length, width: 2, height: 2, attribution: "Fixture backup", uploadedBy: editor.id } });
    await writeFile(join(media, asset.storageKey), bytes);
    const item = await client.contentItem.create({ data: { kind: "article", slug: "fixture-backup" } });
    const approved = await client.contentRevision.create({ data: {
      itemId: item.id, number: 1, status: "approved", reviewedOn: "2026-10-26", payload: { title: "Materi terbit sintetis", body: "Isi tetap tersimpan." },
      authorId: editor.id, submitterId: editor.id, reviewerId: approver.id,
      sources: { create: { title: "Sumber uji", internalRef: "fixture", reviewedOn: "2026-10-26", order: 0 } },
      professions: { create: { key: "pp" } }, media: { create: { mediaId: asset.id, alt: "Media bersama uji" } },
      contributors: { create: { userId: editor.id } }
    } });
    await client.contentItem.update({ where: { id: item.id }, data: { publishedRevisionId: approved.id } });
    await client.contentRevision.create({ data: { itemId: item.id, number: 2, reviewedOn: "2026-10-26", payload: { title: "Draf sintetis" }, authorId: editor.id, media: { create: { mediaId: asset.id, alt: "Media revisi draf" } } } });
    await client.publishedSearchEntry.create({ data: { itemId: item.id, revisionId: approved.id, kind: "article", title: "Materi terbit sintetis", summary: "Ringkasan", text: "Isi tetap tersimpan.", path: "/insight/fixture-backup", professions: ["pp"], publishedAt: new Date("2026-10-26T00:00:00Z") } });
    await client.auditEvent.create({ data: { actorId: approver.id, actorName: approver.name, action: "content.publish", objectId: item.id, revisionId: approved.id, note: "Fixture terisolasi, bukan persetujuan materi pengguna." } });
    await client.rateLimit.create({ data: { key: "synthetic-rate-limit", count: 2, expiresAt: new Date("2026-12-01T00:00:00Z") } });
    expected = await allRows(await local.engine);
    assert.equal(Object.keys(expected).length, 15);
    assert.ok(Object.entries(expected).every(([table, rows]) => table === "Verification" || rows.length > 0));
    await assert.rejects(backupLocal(pg, media, backup), /sedang digunakan/);
    await assert.rejects(readdir(backup), { code: "ENOENT" });
  } finally { await client.$disconnect(); await local.close(); }
  const count = await backupLocal(pg, media, backup);
  assert.ok(count > 1);
  assert.equal(await restoreLocal(backup, restored), count);
  assert.deepEqual(await readFile(join(restored, "media", "synthetic.webp")), bytes);
  const restoredDatabase = createLocalDatabase(join(restored, "pg"));
  try { assert.deepEqual(await allRows(await restoredDatabase.engine), expected!); }
  finally { await restoredDatabase.close(); }
  await assert.rejects(restoreLocal(backup, restored), { code: "EEXIST" });
  await assert.rejects(backupLocal(pg, media, backup), { code: "EEXIST" });
});

test("backup menolak tujuan bertumpuk/alias, symlink, dan media yang bukan direktori", async t => {
  const { root, pg, media, backup } = await temporary(t);
  await mkdir(pg);
  await writeFile(join(pg, "PG_VERSION"), "17");
  await symlink(pg, join(root, "alias"));
  await assert.rejects(backupLocal(pg, media, join(root, "alias", "nested")), /harus terpisah/);
  await writeFile(join(root, "media-file"), "jangan dibuang");
  await assert.rejects(backupLocal(pg, join(root, "media-file"), backup), /harus berupa direktori/);
  await symlink(join(pg, "PG_VERSION"), join(media, "linked"));
  await assert.rejects(backupLocal(pg, media, backup), /menolak symlink/);
  await assert.rejects(readdir(backup), { code: "ENOENT" });
});

test("restore menolak perubahan isi/berkas tambahan dan mendukung instalasi tanpa media", async t => {
  const { root, pg, media, backup, restored } = await temporary(t);
  await mkdir(pg);
  await writeFile(join(pg, "PG_VERSION"), "17");
  await rm(media, { recursive: true });
  assert.equal(await backupLocal(pg, media, backup), 1);
  assert.equal(await restoreLocal(backup, restored), 1);
  assert.deepEqual(await readdir(join(restored, "media")), []);
  await writeFile(join(backup, "pg", "PG_VERSION"), "corrupt");
  const rejected = join(root, "rejected");
  await assert.rejects(restoreLocal(backup, rejected), /Checksum backup tidak cocok/);
  await assert.rejects(readdir(rejected), { code: "ENOENT" });
  await writeFile(join(backup, "pg", "PG_VERSION"), "17");
  await writeFile(join(backup, "media", "unexpected"), "tambahan");
  await assert.rejects(restoreLocal(backup, rejected), /Checksum backup tidak cocok/);
  await rm(join(backup, "media"), { recursive: true });
  await symlink(join(restored, "media"), join(backup, "media"));
  await assert.rejects(restoreLocal(backup, rejected), /menolak symlink/);
});

test("CLI backup/restore berfungsi dan menolak produksi sebelum menyalin", { timeout: 30000 }, async t => {
  const { root, pg, media, backup, restored } = await temporary(t);
  await mkdir(pg);
  await writeFile(join(pg, "PG_VERSION"), "17");
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE: "true", JAFA_LOCAL_DATABASE_DIRECTORY: pg, MEDIA_DIRECTORY: media };
  const run = promisify(execFile);
  const args = ["--import", "tsx", "scripts/local-backup.ts"];
  await run(process.execPath, [...args, "backup", backup], { env, timeout: 10000 });
  assert.deepEqual((await readdir(backup)).sort(), ["manifest.json", "media", "pg"]);
  await run(process.execPath, [...args, "restore", backup, restored], { env, timeout: 10000 });
  assert.equal(await readFile(join(restored, "pg", "PG_VERSION"), "utf8"), "17");
  const rejected = join(root, "production-rejected");
  await assert.rejects(run(process.execPath, [...args, "backup", rejected], { env: { ...env, NODE_ENV: "production" }, timeout: 10000 }), error => {
    assert.equal((error as { code?: number }).code, 1);
    return true;
  });
  await assert.rejects(readdir(rejected), { code: "ENOENT" });
});
