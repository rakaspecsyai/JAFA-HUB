import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, readlink, realpath, rename, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";

const code = (error: unknown) => (error as NodeJS.ErrnoException).code;
async function removeEmpty(directory: string) {
  try { await rmdir(directory); }
  catch (error) { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(code(error) ?? "")) throw error; }
}

// Publish a nonempty directory atomically, so stale-lock cleanup cannot remove a new owner's lock.
export async function lockLocalDirectory(directory: string) {
  const lock = `${await realpath(directory)}.jafa-lock`;
  const identity = JSON.stringify([hostname(), process.platform === "linux" ? await readlink("/proc/self/ns/pid") : null]);
  const candidate = await mkdtemp(`${lock}-`);
  const owner = `${process.pid}-${randomUUID()}`;
  try {
    await writeFile(join(candidate, owner), identity, { flag: "wx", mode: 0o600 });
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rename(candidate, lock);
        let release: Promise<void> | undefined;
        return () => release ??= (async () => {
          await unlink(join(lock, owner));
          await removeEmpty(lock);
        })();
      } catch (error) {
        if (!["ENOTEMPTY", "EEXIST"].includes(code(error) ?? "")) throw error;
      }
      let owners: string[];
      try { owners = await readdir(lock); }
      catch (error) { if (code(error) === "ENOENT") continue; throw error; }
      if (!owners.length) { await removeEmpty(lock); continue; }
      const match = owners.length === 1 && /^(\d+)-[a-f0-9-]{36}$/.exec(owners[0]);
      if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) <= 0) {
        throw new Error("Kunci database lokal tidak dikenali. Pertahankan berkasnya untuk pemeriksaan; jangan membuka engine.");
      }
      let ownerIdentity: string;
      try { ownerIdentity = await readFile(join(lock, owners[0]), "utf8"); }
      catch (error) { if (code(error) === "ENOENT") continue; throw error; }
      if (ownerIdentity !== identity) throw new Error("Identitas host/namespace pemilik kunci berbeda atau tidak dikenali. Pertahankan kunci; proses pemilik tidak dapat diperiksa dengan aman.");
      try {
        process.kill(Number(match[1]), 0);
      } catch (error) {
        if (code(error) !== "ESRCH") throw error;
        try { await unlink(join(lock, owners[0])); }
        catch (error) { if (code(error) !== "ENOENT") throw error; }
        await removeEmpty(lock);
        continue;
      }
      throw new Error(`Database lokal sedang digunakan proses ${match[1]}. Hentikan proses pemilik sebelum melanjutkan.`);
    }
    throw new Error("Kunci database lokal sedang diperebutkan. Coba lagi setelah proses lain berhenti.");
  } finally {
    await rm(candidate, { recursive: true, force: true });
  }
}
