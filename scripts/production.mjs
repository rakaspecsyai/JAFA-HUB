import { spawn } from "node:child_process";
import { once } from "node:events";
import { constants } from "node:fs";
import { access, readdir, realpath, stat } from "node:fs/promises";
import { isAbsolute, parse, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function inside(directory, target) {
  const path = relative(directory, target);
  return !path || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

/** @param {Partial<NodeJS.ProcessEnv>} env @param {string} directory */
export function validateProductionEnvironment(env, directory) {
  const errors = [];
  if (env.NODE_ENV !== "production") errors.push("NODE_ENV harus production.");
  for (const key of ["JAFA_LOCAL_DATABASE", "JAFA_CONTENT_PREVIEW"]) {
    if (env[key] !== "false") errors.push(`${key} harus false.`);
  }
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2 || url.hash) throw new Error();
  } catch { errors.push("DATABASE_URL harus URL PostgreSQL dengan akun, host dan nama database."); }
  try {
    const url = new URL(env.APP_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.origin !== env.APP_URL) throw new Error();
  } catch { errors.push("APP_URL harus origin HTTPS tanpa kredensial, path atau garis miring akhir."); }
  for (const key of ["AUTH_RATE_LIMIT_KEY", "BETTER_AUTH_SECRET"]) {
    if ((env[key]?.length ?? 0) < 32) errors.push(`${key} harus berisi sedikitnya 32 karakter acak.`);
  }
  if (env.AUTH_RATE_LIMIT_KEY && env.AUTH_RATE_LIMIT_KEY === env.BETTER_AUTH_SECRET) errors.push("Kedua rahasia harus berbeda.");
  const media = env.MEDIA_DIRECTORY;
  if (!media || !isAbsolute(media) || resolve(media) === parse(media).root || inside(directory, resolve(media))) {
    errors.push("MEDIA_DIRECTORY harus direktori absolut di luar artefak aplikasi, bukan root filesystem.");
  }
  return errors;
}

async function main() {
  const command = process.argv[2] ?? "check", extra = process.argv.slice(3);
  const commands = {
    start: ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
    migrate: ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    import: ["--import", "tsx", "scripts/import-content.ts"],
    bootstrap: ["--import", "tsx", "scripts/bootstrap-admin.ts"],
    recover: ["--import", "tsx", "scripts/recover-admin.ts"]
  };
  if (command !== "check" && !Object.hasOwn(commands, command)) throw new Error("Gunakan check, start, migrate, import, bootstrap, atau recover.");
  process.env.NODE_ENV = "production";
  const errors = validateProductionEnvironment(process.env, process.cwd());
  if (errors.length) throw new Error(errors.join(" "));
  const entries = await readdir(process.cwd());
  if (entries.some(name => (name === ".env" || name.startsWith(".env.")) && name !== ".env.example") || entries.includes(".local")) {
    throw new Error("Gunakan artefak rilis bersih tanpa berkas .env lokal atau direktori .local; jangan hapus data pengembangan.");
  }
  try {
    const media = await realpath(process.env.MEDIA_DIRECTORY);
    if (media === parse(media).root || inside(await realpath(process.cwd()), media) || !(await stat(media)).isDirectory()) throw new Error();
    await access(media, constants.R_OK | constants.W_OK);
  } catch { throw new Error("MEDIA_DIRECTORY harus tersedia, dapat dibaca/ditulis dan tetap di luar artefak setelah resolusi symlink."); }
  if (command === "check") {
    console.log("Konfigurasi runtime produksi valid; koneksi database belum diperiksa.");
    return;
  }
  if (["bootstrap", "recover"].includes(command) && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    throw new Error("Gunakan terminal privat interaktif untuk perintah akun; jangan arahkan sandi sementara ke log atau pipeline.");
  }
  const child = spawn(process.execPath, [...commands[command], ...extra], { stdio: "inherit", env: process.env });
  let requestedSignal;
  const stop = signal => { requestedSignal = signal; child.kill(signal); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  try {
    const [code, signal] = await once(child, "exit");
    process.exitCode = requestedSignal === "SIGTERM" && (signal === "SIGTERM" || code === 143) ? 0 : code ?? (signal === "SIGINT" ? 130 : 1);
  } finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
