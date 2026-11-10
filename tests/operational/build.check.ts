import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createTestWorkspace } from "../../scripts/test-workspace";

const workspace = await createTestWorkspace("build-check-code-");
const child = spawn("npm", ["run", "build"], { cwd: workspace, stdio: "inherit", env: {
  ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", JAFA_LOCAL_DATABASE: "false", JAFA_CONTENT_PREVIEW: "false",
  DATABASE_URL: "postgresql://unused@127.0.0.1:1/build_check", APP_URL: "https://build.example.invalid",
  AUTH_RATE_LIMIT_KEY: randomBytes(32).toString("hex"), BETTER_AUTH_SECRET: randomBytes(32).toString("hex")
} });
const stop = (signal: NodeJS.Signals) => { child.kill(signal); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
try {
  const [code] = await once(child, "exit");
  assert.equal(code, 0, `Build gagal; salinan dipertahankan: ${workspace}`);
  await access(join(workspace, ".next", "BUILD_ID"));
  await rm(workspace, { recursive: true });
  console.log("Build produksi terisolasi lulus; cache dev dan database aktif tidak dipakai.");
} finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
