import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createLocalDatabase } from "../../src/lib/local-db";
import { backupLocal } from "../../scripts/local-backup";
import { createTestWorkspace } from "../../scripts/test-workspace";

const port = 5196;
const origin = `http://127.0.0.1:${port}`;

async function deadline<T>(promise: Promise<T>, milliseconds: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]);
  } finally { clearTimeout(timer); }
}

async function check() {
  const probe = createServer();
  const listening = once(probe, "listening");
  probe.listen(port, "0.0.0.0");
  await listening;
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  console.log(`Port ${port}: bind berhasil.`);

  const directory = await mkdtemp(join(tmpdir(), "jafa-local-dev-check-"));
  const workspace = await createTestWorkspace("port-check-code-");
  const pg = join(directory, "pg"), media = join(directory, "media");
  const env: NodeJS.ProcessEnv = {
    ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE: "true", JAFA_LOCAL_DATABASE_DIRECTORY: pg,
    JAFA_CONTENT_PREVIEW: "false", MEDIA_DIRECTORY: media, APP_URL: `http://localhost:${port}`,
    DATABASE_URL: "postgresql://unused@127.0.0.1:1/local_check", AUTH_RATE_LIMIT_KEY: randomBytes(32).toString("hex"),
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    TRUSTED_IP_HEADER: "", NEXT_TELEMETRY_DISABLED: "1"
  };
  let server: ChildProcess | undefined;
  let exited: Promise<[number | null, NodeJS.Signals | null]> | undefined;
  let interrupted = false, passed = false;
  const cancel = () => { interrupted = true; server?.kill("SIGTERM"); };
  process.on("SIGINT", cancel); process.on("SIGTERM", cancel);

  async function start() {
    server = fork(join(workspace, "scripts", "dev.ts"), ["--port", String(port)], {
      execArgv: ["--env-file-if-exists=.env", "--import", "tsx"], cwd: workspace, env, stdio: ["ignore", "inherit", "inherit", "ipc"]
    });
    exited = once(server, "exit") as Promise<[number | null, NodeJS.Signals | null]>;
    void exited.catch(() => {});
    const until = Date.now() + 90000;
    let healthy = false;
    while (Date.now() < until && !healthy) {
      if (interrupted) throw new Error("Pengujian dihentikan.");
      if (server.exitCode !== null || server.signalCode !== null) throw new Error("Launcher berhenti sebelum health berhasil; periksa log di atas.");
      try {
        const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(15000) });
        if (response.status === 200) { assert.deepEqual(await response.json(), { status: "ok" }); healthy = true; }
      } catch (error) {
        if (["EPERM", "EACCES"].includes((error as { cause?: NodeJS.ErrnoException }).cause?.code ?? "")) throw error;
      }
      if (!healthy) await delay(300);
    }
    assert.ok(healthy, "Health belum berhasil dalam 90 detik.");
    const home = await fetch(origin, { signal: AbortSignal.timeout(30000) });
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Jafa Hub/);
    const admin = await fetch(`${origin}/admin`, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    assert.equal(admin.status, 307);
    assert.match(admin.headers.get("location") ?? "", /\/admin\/login/);
    const blocked = createLocalDatabase(pg);
    await assert.rejects(blocked.engine, /sedang digunakan/);
    await assert.rejects(blocked.close(), /sedang digunakan/);
    await assert.rejects(backupLocal(pg, media, join(directory, "blocked-backup")), /sedang digunakan/);
    await assert.rejects(readdir(join(directory, "blocked-backup")), { code: "ENOENT" });
    console.log("HTTP health/beranda 200; admin 307; proses kedua dan backup saat aktif ditolak.");
  }

  async function stop(signal: "SIGINT" | "SIGTERM") {
    assert.ok(server && exited);
    server.kill(signal);
    const [code, endedBy] = await deadline(exited, 40000, "Launcher belum berhenti setelah 40 detik.");
    assert.equal(code, 0, `Launcher keluar dengan ${code}/${endedBy}.`);
    await assert.rejects(readdir(`${pg}.jafa-lock`), { code: "ENOENT" });
    server = undefined;
    console.log(`${signal}: exit 0; kunci database terlepas.`);
  }

  async function digest() {
    const local = createLocalDatabase(pg);
    try {
      const engine = await local.engine;
      const { rows: tables } = await engine.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
      const rows: Record<string, { row: string }[]> = {};
      for (const { tablename } of tables) {
        rows[tablename] = (await engine.query<{ row: string }>(`SELECT row_to_json(t)::text AS row FROM "${tablename.replaceAll('"', '""')}" t ORDER BY row_to_json(t)::text`)).rows;
      }
      assert.equal(tables.length, 15);
      assert.equal(rows.ContentItem.length, 29);
      assert.equal(rows.ContentRevision.length, 29);
      assert.ok(rows.ContentRevision.every(({ row }) => JSON.parse(row).status === "draft"));
      return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    } finally { await local.close(); }
  }

  try {
    await start();
    await stop("SIGTERM");
    const first = await digest();
    await start();
    await stop("SIGINT");
    assert.equal(await digest(), first);
    passed = true;
    console.log("Lulus: dua startup Next, SIGTERM/SIGINT, restart, serta seluruh ID/nilai 15 tabel tetap sama; 29 materi tetap draf.");
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      server.kill("SIGTERM");
      try { await deadline(exited!, 40000, "Cleanup launcher belum selesai."); }
      catch { console.error("Proses uji belum dipastikan berhenti."); }
    }
    process.off("SIGINT", cancel); process.off("SIGTERM", cancel);
    if (passed) {
      await rm(directory, { recursive: true });
      await rm(workspace, { recursive: true });
    } else console.error(`Fixture dipertahankan untuk pemeriksaan: ${directory}; salinan kode: ${workspace}`);
  }
}

await check();
