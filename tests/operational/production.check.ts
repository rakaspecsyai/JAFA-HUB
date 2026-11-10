import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createTestWorkspace } from "../../scripts/test-workspace";

const workspace = await createTestWorkspace("production-check-code-");
const directory = await mkdtemp(join(tmpdir(), "jafa-production-check-"));
const unavailable = createServer(socket => socket.destroy());
await new Promise<void>(resolve => unavailable.listen(0, "127.0.0.1", resolve));
const databasePort = (unavailable.address() as { port: number }).port;
const portProbe = createServer();
await new Promise<void>(resolve => portProbe.listen(0, "127.0.0.1", resolve));
const port = (portProbe.address() as { port: number }).port;
await new Promise<void>(resolve => portProbe.close(() => resolve()));
const origin = `http://127.0.0.1:${port}`;
const env: NodeJS.ProcessEnv = {
  ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", JAFA_LOCAL_DATABASE: "false", JAFA_CONTENT_PREVIEW: "false",
  DATABASE_URL: `postgresql://unused@127.0.0.1:${databasePort}/unavailable`, MEDIA_DIRECTORY: directory,
  APP_URL: "https://build.example.invalid", AUTH_RATE_LIMIT_KEY: randomBytes(32).toString("hex"), BETTER_AUTH_SECRET: randomBytes(32).toString("hex")
};
let child: ReturnType<typeof spawn> | undefined;
const stop = (signal: NodeJS.Signals) => { child?.kill(signal); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
try {
  child = spawn("npm", ["run", "build"], { cwd: workspace, stdio: "inherit", env });
  assert.equal((await once(child, "exit"))[0], 0, "Build produksi gagal.");
  child = spawn(process.execPath, ["scripts/production.mjs", "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: workspace, stdio: "inherit", env: { ...env, APP_URL: "https://runtime.example.invalid" } });
  const exited = once(child, "exit");
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    assert.equal(child.exitCode, null, "Server berhenti sebelum siap.");
    try { ready = (await fetch(`${origin}/admin/login`, { signal: AbortSignal.timeout(1000), redirect: "error" })).status === 200; } catch { /* Server sedang mulai. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, "Halaman login produksi belum siap.");
  const robots = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) });
  assert.equal(robots.status, 200);
  const text = await robots.text();
  assert.ok(text.includes("https://runtime.example.invalid/sitemap.xml"));
  assert.ok(!text.includes("build.example.invalid"));
  const health = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(5000) });
  assert.equal(health.status, 503); assert.deepEqual(await health.json(), { status: "unavailable" });
  child.kill("SIGTERM");
  assert.equal((await exited)[0], 0, "Shutdown server produksi gagal.");
  await assert.rejects(fetch(`${origin}/admin/login`, { signal: AbortSignal.timeout(1000) }));
  console.log("Smoke runtime produksi lulus: build, startup, origin runtime pada robots, health 503 aman dan SIGTERM. Tidak ada PostgreSQL native pada smoke ini.");
} finally {
  if (child?.exitCode === null && child.signalCode === null) { const closed = once(child, "exit"); child.kill("SIGTERM"); await closed; }
  process.off("SIGINT", stop); process.off("SIGTERM", stop);
  await new Promise<void>(resolve => unavailable.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
  await rm(workspace, { recursive: true, force: true });
}
