import { spawn } from "node:child_process";
import { readFile, writeFile, access, appendFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";

try { await access(".env"); }
catch {
  await writeFile(".env", `${await readFile(".env.example", "utf8")}\nAUTH_RATE_LIMIT_KEY="${randomBytes(32).toString("hex")}"\n`, { mode: 0o600, flag: "wx" });
  process.loadEnvFile(".env");
}
if (!process.env.AUTH_RATE_LIMIT_KEY) {
  process.env.AUTH_RATE_LIMIT_KEY = randomBytes(32).toString("hex");
  await appendFile(".env", `\nAUTH_RATE_LIMIT_KEY="${process.env.AUTH_RATE_LIMIT_KEY}"\n`);
  await chmod(".env", 0o600);
}
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
  await appendFile(".env", `\nBETTER_AUTH_SECRET="${process.env.BETTER_AUTH_SECRET}"\n`);
  await chmod(".env", 0o600);
}
const arguments_ = process.argv.slice(2);
const portIndex = arguments_.lastIndexOf("--port");
const port = portIndex >= 0 ? arguments_[portIndex + 1] : "3000";
process.env.APP_URL = `http://localhost:${port}`;

function run(args: string[]) {
  return new Promise<void>((accept, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
    child.on("error", reject); child.on("exit", code => code === 0 ? accept() : reject(new Error(`Command failed (${code}).`)));
  });
}
if (process.env.JAFA_LOCAL_DATABASE === "true") {
  await run(["--import", "tsx", "scripts/setup-local.ts"]);
  // The worker owning PGlite must finish closing it before the Next CLI can force termination.
  process.env.NEXT_MANUAL_SIG_HANDLE = "true";
  process.env.NEXT_EXIT_TIMEOUT_MS = "30000";
}
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0", "--port", port], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => next.kill(signal));
next.on("exit", code => { process.exit(code ?? 0); });
next.on("error", error => { console.error(error.message); process.exitCode = 1; });
