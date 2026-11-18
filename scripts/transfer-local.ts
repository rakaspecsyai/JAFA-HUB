import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { chmod, copyFile, lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { Pool, type PoolClient } from "pg";
import { z } from "zod";
import { AppError } from "../src/lib/errors";
import { createLocalDatabase } from "../src/lib/local-db";
import { canonical, inventory, separated } from "./local-backup";

const tables = ["User", "Account", "MediaAsset", "DocumentAsset", "ContentItem", "ContentRevision", "RevisionContributor", "SourceReference", "RevisionProfession", "RevisionMedia", "DocumentPage", "RevisionDocument", "KnowledgeChunk", "PublishedSearchEntry", "AuditEvent", "AiUsageMonth"] as const;
const omittedTables = ["Session", "Verification", "RateLimit"] as const;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const manifestSchema = z.object({
  format: z.literal("jafa-postgres-transfer-v1"), createdAt: z.iso.datetime(), dataSha256: hash,
  files: z.array(z.object({ path: z.string(), sha256: hash }).strict())
}).strict();
const dataSchema = z.object({
  metadata: z.object({ migrations: z.array(z.object({ name: z.string(), checksum: hash }).strict()), columns: z.array(z.string()) }).strict(),
  tables: z.record(z.enum(tables), z.array(z.string())),
  omitted: z.record(z.enum(omittedTables), z.number().int().nonnegative())
}).strict();

function inside(directory: string, target: string) {
  const path = relative(directory, target);
  return !path || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}
async function privateDirectory(path: string) {
  const root = await realpath(process.cwd()), requested = resolve(path), target = await canonical(path);
  const permitted = (value: string) => !inside(root, value) || inside(join(root, ".local"), value);
  if (!permitted(requested) || !permitted(target) || inside(await realpath(join(root, "public")), target)) throw new AppError("Gunakan .local atau direktori privat di luar repositori, tanpa symlink ke public atau sumber kode.");
  return target;
}
async function metadata(client: PoolClient) {
  const names = (await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename COLLATE \"C\"")).rows.map(row => row.tablename);
  if (!isDeepStrictEqual(names, [...tables, ...omittedTables, "_prisma_migrations"].sort())) throw new AppError("Daftar tabel tidak cocok dengan alat transfer; tinjau skema sebelum melanjutkan.");
  const migrations = (await client.query<{ name: string; checksum: string; finished: boolean }>('SELECT migration_name AS name, checksum, finished_at IS NOT NULL AS finished FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY migration_name COLLATE "C"')).rows;
  const expected: { name: string; checksum: string }[] = [];
  for (const entry of (await readdir("prisma/migrations", { withFileTypes: true })).filter(entry => entry.isDirectory()).sort((a, b) => a.name < b.name ? -1 : 1)) {
    expected.push({ name: entry.name, checksum: digest(await readFile(join("prisma/migrations", entry.name, "migration.sql"), "utf8")) });
  }
  if (migrations.some(row => !row.finished) || !isDeepStrictEqual(migrations.map(({ name, checksum }) => ({ name, checksum })), expected)) throw new AppError("Migrasi belum lengkap atau checksum berbeda. Backup dan terapkan migrasi secara terpisah; alat transfer tidak memigrasikan database.");
  const columns = (await client.query<{ row: string }>(`SELECT to_jsonb(c)::text AS row FROM (
    SELECT table_name, column_name, ordinal_position, udt_name, is_nullable, character_maximum_length, numeric_precision, numeric_scale, datetime_precision
    FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations'
    ORDER BY table_name COLLATE "C", ordinal_position
  ) c`)).rows.map(row => row.row);
  return { migrations: expected, columns };
}
async function rows(client: PoolClient) {
  const result = {} as z.infer<typeof dataSchema>["tables"];
  for (const table of tables) {
    // JSON tetap berupa teks PostgreSQL agar bigint dan angka dalam payload tidak dibulatkan JavaScript.
    result[table] = (await client.query<{ row: string }>(`SELECT to_jsonb(t)::text AS row FROM public."${table}" t ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows.map(row => row.row);
  }
  return result;
}
async function checkWorkflow(client: PoolClient) {
  const invalid = await client.query(`SELECT 1 FROM "ContentItem" i JOIN "ContentRevision" r ON r.id=i."publishedRevisionId"
    WHERE r."itemId" <> i.id OR r.status <> 'approved'
    UNION ALL SELECT 1 FROM "ContentRevision" r WHERE r.status='approved' AND (
      r."reviewerId"=r."authorId" OR r."reviewerId"=r."submitterId" OR EXISTS (
        SELECT 1 FROM "RevisionContributor" c WHERE c."revisionId"=r.id AND c."userId"=r."reviewerId"))
    UNION ALL SELECT 1 FROM "PublishedSearchEntry" s JOIN "ContentItem" i ON i.id=s."itemId"
      WHERE i.archived OR s."revisionId" IS DISTINCT FROM i."publishedRevisionId" OR s.kind <> i.kind
    UNION ALL SELECT 1 FROM "ContentItem" i WHERE i."publishedRevisionId" IS NOT NULL AND i.kind <> 'knowledge'
      AND NOT i.archived AND NOT EXISTS (SELECT 1 FROM "PublishedSearchEntry" s WHERE s."itemId"=i.id)
    LIMIT 1`);
  if (invalid.rowCount) throw new AppError("Publikasi, proyeksi pencarian atau larangan persetujuan sendiri tidak konsisten. Periksa sumber sebelum transfer.");
}
async function checkAssets(client: PoolClient, directory: string, files: z.infer<typeof manifestSchema>["files"]) {
  const available = new Map(files.map(file => [file.path, file.sha256]));
  const assets = await client.query<{ path: string; size: number; checksum: string | null }>(`SELECT "storageKey" AS path, size, NULL::text AS checksum FROM "MediaAsset"
    UNION ALL SELECT 'documents/' || "storageKey", size, checksum FROM "DocumentAsset"`);
  for (const asset of assets.rows) {
    if (!available.has(asset.path) || (asset.checksum && available.get(asset.path) !== asset.checksum) || (await stat(join(directory, asset.path))).size !== asset.size) throw new AppError("Media/PDF yang dirujuk hilang atau ukuran/checksum berbeda. Transfer dibatalkan.");
  }
}
async function copyMedia(source: string, target: string, files: z.infer<typeof manifestSchema>["files"]) {
  await mkdir(target, { mode: 0o700 });
  for (const file of files) {
    const segments = file.path.split("/");
    if (segments.some(segment => !segment || segment === "." || segment === ".." || segment.includes("\\"))) throw new AppError("Path media tidak sah.");
    await mkdir(join(target, ...segments.slice(0, -1)), { recursive: true, mode: 0o700 });
    const destination = join(target, file.path);
    await copyFile(join(source, file.path), destination, constants.COPYFILE_EXCL);
    await chmod(destination, 0o600);
  }
  if (!isDeepStrictEqual(await inventory(target, ""), files)) throw new AppError("Checksum salinan media tidak cocok. Pertahankan tujuan parsial untuk pemeriksaan.");
}
async function transactionSettings(client: PoolClient) {
  await client.query("SET LOCAL search_path TO public; SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle TO 'ISO, YMD'; SET LOCAL extra_float_digits TO 3");
}

export async function exportLocal(database: string, media: string, destination: string) {
  const source = await realpath(database), mediaSource = await canonical(media), target = await privateDirectory(destination);
  separated([source, mediaSource, target]);
  if (!(await lstat(join(source, "PG_VERSION"))).isFile()) throw new AppError("Database lokal belum tersedia; ekspor tidak membuat database baru.");
  const local = createLocalDatabase(source);
  try {
    const client = await local.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await transactionSettings(client);
      const schema = await metadata(client);
      await checkWorkflow(client);
      const data = { metadata: schema, tables: await rows(client), omitted: {} as z.infer<typeof dataSchema>["omitted"] };
      for (const table of omittedTables) data.omitted[table] = Number((await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM "${table}"`)).rows[0].count);
      let files: z.infer<typeof manifestSchema>["files"] = [];
      try {
        if (!(await lstat(mediaSource)).isDirectory()) throw new AppError("Sumber media harus berupa direktori biasa.");
        files = await inventory(mediaSource, "");
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      await checkAssets(client, mediaSource, files);
      const text = JSON.stringify(data);
      if (Buffer.byteLength(text) > 256 * 1024 * 1024) throw new AppError("Data logis melebihi batas transfer 256 MiB.");
      const manifest = JSON.stringify({ format: "jafa-postgres-transfer-v1", createdAt: new Date().toISOString(), dataSha256: digest(text), files });
      if (Buffer.byteLength(manifest) > 8 * 1024 * 1024) throw new AppError("Manifest media melebihi batas transfer 8 MiB.");
      await mkdir(target, { mode: 0o700 });
      await copyMedia(mediaSource, join(target, "media"), files);
      await writeFile(join(target, "data.json"), text, { flag: "wx", mode: 0o600 });
      await writeFile(join(target, "manifest.json"), manifest, { flag: "wx", mode: 0o600 });
      await client.query("COMMIT");
      return { rows: Object.values(data.tables).reduce((count, values) => count + values.length, 0), files: files.length, omitted: data.omitted };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await local.close(); }
}

export async function importTransfer(bundle: string, pool: Pool, mediaDestination: string) {
  const source = await privateDirectory(bundle), target = await privateDirectory(mediaDestination);
  separated([source, target]);
  for (const name of ["manifest.json", "data.json", "media"]) {
    const info = await lstat(join(source, name));
    if (name === "media" ? !info.isDirectory() : !info.isFile()) throw new AppError("Bundle menolak symlink dan berkas khusus.");
  }
  // shortcut: data logis dibaca di memori hingga 256 MiB; gunakan streaming jika korpus melampaui batas ini.
  if ((await stat(join(source, "data.json"))).size > 256 * 1024 * 1024 || (await stat(join(source, "manifest.json"))).size > 8 * 1024 * 1024) throw new AppError("Bundle melebihi batas ukuran transfer.");
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(source, "manifest.json"), "utf8")));
  const text = await readFile(join(source, "data.json"), "utf8");
  if (digest(text) !== manifest.dataSha256 || !isDeepStrictEqual(await inventory(join(source, "media"), ""), manifest.files)) throw new AppError("Checksum bundle tidak cocok. Impor dibatalkan.");
  const data = dataSchema.parse(JSON.parse(text));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await transactionSettings(client);
    await client.query("SET LOCAL lock_timeout TO '5s'");
    await client.query(`LOCK TABLE ${[...tables, ...omittedTables, "_prisma_migrations"].map(table => `"${table}"`).join(",")} IN ACCESS EXCLUSIVE MODE`);
    if (!isDeepStrictEqual(await metadata(client), data.metadata)) throw new AppError("Skema sumber dan tujuan berbeda. Gunakan versi sumber/migrasi yang sama.");
    const retainedAudit = (await client.query<{ row: string }>(`SELECT to_jsonb(a)::text AS row FROM "AuditEvent" a
      WHERE "actorId" IS NULL AND "revisionId" IS NULL AND "actorName"='Migrasi autentikasi'
      AND action='account.auth-migration' AND "objectId"='better-auth'`)).rows.map(row => row.row);
    for (const table of [...tables, ...omittedTables]) {
      const count = Number((await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM "${table}"`)).rows[0].count);
      if (table === "AuditEvent" ? count !== 1 || retainedAudit.length !== 1 : count !== 0) throw new AppError("Database tujuan harus kosong selain histori dan satu audit migrasi bawaan. Impor tidak menimpa data yang sudah ada.");
    }
    for (const table of tables) for (const row of data.tables[table]) {
      const value = table === "ContentItem" ? "jsonb_set($1::jsonb, '{publishedRevisionId}', 'null'::jsonb)" : "$1::jsonb";
      await client.query(`INSERT INTO public."${table}" SELECT * FROM jsonb_populate_record(NULL::public."${table}", ${value})`, [row]);
    }
    for (const row of data.tables.ContentItem) await client.query('UPDATE "ContentItem" SET "publishedRevisionId"=($1::jsonb->>\'publishedRevisionId\')::uuid WHERE id=($1::jsonb->>\'id\')::uuid', [row]);
    await checkWorkflow(client);
    const expected = { ...data.tables, AuditEvent: [...data.tables.AuditEvent, ...retainedAudit].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))) };
    if (!isDeepStrictEqual(await rows(client), expected)) throw new AppError("Nilai hasil impor berbeda dari sumber. Transaksi dibatalkan.");
    await checkAssets(client, join(source, "media"), manifest.files);
    await copyMedia(join(source, "media"), target, manifest.files);
    await checkAssets(client, target, manifest.files);
    await client.query("COMMIT");
    return { rows: Object.values(data.tables).reduce((count, values) => count + values.length, 0), files: manifest.files.length, omitted: data.omitted };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function main() {
  const args = process.argv.slice(2);
  const usage = "Gunakan db:transfer -- export <bundle-baru> atau db:transfer -- import <bundle> <media-baru>. Hentikan aplikasi, backup sumber, dan gunakan database tujuan baru yang sudah dimigrasikan.";
  if (args.length === 1 && args[0] === "--help") { console.log(usage); return; }
  let result;
  if (args.length === 2 && args[0] === "export") {
    if (process.env.NODE_ENV === "production" || process.env.JAFA_LOCAL_DATABASE !== "true") throw new AppError("Ekspor hanya untuk PGlite lokal dengan JAFA_LOCAL_DATABASE=true di luar produksi.");
    result = await exportLocal(process.env.JAFA_LOCAL_DATABASE_DIRECTORY ?? ".local/development-pg", process.env.MEDIA_DIRECTORY ?? ".local/media", args[1]);
  } else if (args.length === 3 && args[0] === "import") {
    if (process.env.JAFA_LOCAL_DATABASE !== "false" || !process.env.DATABASE_URL) throw new AppError("Impor memerlukan JAFA_LOCAL_DATABASE=false dan DATABASE_URL PostgreSQL tujuan baru.");
    let url: URL;
    try { url = new URL(process.env.DATABASE_URL); } catch { throw new AppError("DATABASE_URL tujuan tidak sah."); }
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2 || url.hash) throw new AppError("DATABASE_URL tujuan harus URL PostgreSQL dengan akun, host dan nama database.");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
    try { result = await importTransfer(args[1], pool, args[2]); }
    finally { await pool.end(); }
  } else throw new AppError(usage);
  console.log(`Transfer selesai: ${result.rows} baris, ${result.files} berkas terverifikasi. Session/Verification/RateLimit tidak dipindahkan; login ulang diperlukan. Simpan bundle secara privat dan arahkan MEDIA_DIRECTORY ke tujuan baru sebelum startup.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof AppError ? error.message : "Transfer belum selesai. Periksa database, skema, izin dan bundle privat; pertahankan sumber serta tujuan parsial. Rincian database tidak dicetak agar data/rahasia tetap privat."); process.exitCode = 1; });
}
