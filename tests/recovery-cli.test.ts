import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

test("CLI pemulihan menolak parameter kosong atau output noninteraktif sebelum membuka database", async t => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-recovery-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pg = join(directory, "pg");
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE: "true", JAFA_LOCAL_DATABASE_DIRECTORY: pg };
  const run = promisify(execFile);
  for (const args of [[], ["--email", "admin@uji.invalid", "--operator", "Petugas uji", "--reason", "Pengujian tanpa terminal interaktif."]]) {
    await assert.rejects(run(process.execPath, ["--import", "tsx", "scripts/recover-admin.ts", ...args], { env, timeout: 10000 }), error => (error as { code?: number }).code === 1);
    await assert.rejects(readdir(pg), { code: "ENOENT" });
  }
});
