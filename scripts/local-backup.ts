import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, cp, lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import { lockLocalDirectory } from "../src/lib/local-db-lock";

const manifestSchema = z.object({
  format: z.literal("jafa-local-backup-v1"),
  createdAt: z.iso.datetime(),
  files: z.array(z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict())
}).strict();
type FileDigest = z.infer<typeof manifestSchema>["files"][number];

async function canonical(path: string) {
  const absolute = resolve(path);
  try { return await realpath(absolute); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return join(await realpath(dirname(absolute)), basename(absolute));
  }
}

function separated(paths: string[]) {
  for (const [index, outer] of paths.entries()) {
    for (const inner of paths.slice(index + 1)) {
      const nested = (a: string, b: string) => {
        const path = relative(a, b);
        return !path || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
      };
      if (nested(outer, inner) || nested(inner, outer)) throw new Error("Direktori database, media, backup, dan tujuan harus terpisah, tanpa saling menampung.");
    }
  }
}

async function inventory(root: string, prefix: string): Promise<FileDigest[]> {
  const files: FileDigest[] = [];
  const entries = (await readdir(join(root, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const entry of entries) {
    const path = `${prefix ? `${prefix}/` : ""}${entry.name}`;
    if (entry.isDirectory()) files.push(...await inventory(root, path));
    else if (entry.isFile()) {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(join(root, path))) hash.update(chunk);
      files.push({ path, sha256: hash.digest("hex") });
    } else throw new Error("Snapshot lokal menolak symlink dan berkas khusus. Periksa sumber sebelum mengulang.");
  }
  return files;
}

async function snapshotFiles(directory: string) {
  for (const name of ["pg", "media"]) {
    if (!(await lstat(join(directory, name))).isDirectory()) throw new Error("Snapshot lokal menolak symlink dan berkas khusus pada direktori database/media.");
  }
  return [...await inventory(directory, "pg"), ...await inventory(directory, "media")];
}

async function checkBackup(directory: string) {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")));
  await access(join(directory, "pg", "PG_VERSION"));
  if (!isDeepStrictEqual(await snapshotFiles(directory), manifest.files)) throw new Error("Checksum backup tidak cocok. Restore dibatalkan.");
  return manifest;
}

export async function backupLocal(database: string, media: string, destination: string) {
  const source = await realpath(database);
  const mediaSource = await canonical(media);
  const target = await canonical(destination);
  separated([source, mediaSource, target]);
  await access(join(source, "PG_VERSION"));
  const release = await lockLocalDirectory(source);
  try {
    let hasMedia = false;
    try {
      if (!(await stat(mediaSource)).isDirectory()) throw new Error("Sumber media harus berupa direktori.");
      hasMedia = true;
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const sourceFiles = [
      ...(await inventory(source, "")).map(file => ({ ...file, path: `pg/${file.path}` })),
      ...(hasMedia ? (await inventory(mediaSource, "")).map(file => ({ ...file, path: `media/${file.path}` })) : [])
    ];
    await mkdir(target, { mode: 0o700 });
    await cp(source, join(target, "pg"), { recursive: true, force: false, errorOnExist: true });
    if (hasMedia) await cp(mediaSource, join(target, "media"), { recursive: true, force: false, errorOnExist: true });
    else await mkdir(join(target, "media"), { mode: 0o700 });
    if (!isDeepStrictEqual(await snapshotFiles(target), sourceFiles)) throw new Error("Salinan database/media tidak cocok; pertahankan tujuan parsial untuk pemeriksaan.");
    await writeFile(join(target, "manifest.json"), JSON.stringify({
      format: "jafa-local-backup-v1", createdAt: new Date().toISOString(), files: sourceFiles
    }, null, 2), { flag: "wx", mode: 0o600 });
    return sourceFiles.length;
  } finally { await release(); }
}

export async function restoreLocal(backup: string, destination: string) {
  const source = await realpath(backup);
  const target = await canonical(destination);
  separated([source, target]);
  const release = await lockLocalDirectory(join(source, "pg"));
  try {
    const manifest = await checkBackup(source);
    await mkdir(target, { mode: 0o700 });
    await mkdir(join(target, "pg"), { mode: 0o700 });
    const releaseTarget = await lockLocalDirectory(join(target, "pg"));
    try {
      for (const entry of await readdir(join(source, "pg"))) {
        await cp(join(source, "pg", entry), join(target, "pg", entry), { recursive: true, force: false, errorOnExist: true });
      }
      await cp(join(source, "media"), join(target, "media"), { recursive: true, force: false, errorOnExist: true });
      if (!isDeepStrictEqual(await snapshotFiles(target), manifest.files)) throw new Error("Checksum hasil restore tidak cocok; jangan gunakan tujuan parsial.");
      return manifest.files.length;
    } finally { await releaseTarget(); }
  } finally { await release(); }
}

if (process.argv[1]?.endsWith("local-backup.ts")) {
  try {
    if (process.env.NODE_ENV === "production" || process.env.JAFA_LOCAL_DATABASE !== "true") throw new Error("Perintah ini hanya untuk PGlite lokal dengan JAFA_LOCAL_DATABASE=true di luar produksi.");
    const { positionals } = parseArgs({ allowPositionals: true });
    const [operation, first, second] = positionals;
    if (operation === "backup" && first && positionals.length === 2) {
      const count = await backupLocal(process.env.JAFA_LOCAL_DATABASE_DIRECTORY ?? ".local/development-pg", process.env.MEDIA_DIRECTORY ?? ".local/media", first);
      console.log(`Backup lokal selesai; ${count} berkas database/media cocok dengan sumber. Simpan salinannya secara privat.`);
    } else if (operation === "restore" && first && second && positionals.length === 3) {
      const count = await restoreLocal(first, second);
      console.log(`Restore lokal selesai; ${count} checksum cocok. Database/media tersedia di pg/ dan media/ pada direktori tujuan baru.`);
    } else throw new Error("Gunakan local:backup -- <tujuan-baru> atau local:restore -- <backup> <tujuan-baru>.");
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
