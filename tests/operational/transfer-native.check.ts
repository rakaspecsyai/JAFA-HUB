import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFile, mkdir, mkdtemp, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { exportLocal } from "../../scripts/transfer-local";
import { createTransferFixture, transferImageKey, transferPassword, transferPdfKey, transferRows } from "../fixtures/transfer";
import { verifyPassword } from "../../src/lib/passwords";

const docker = process.env.JAFA_TEST_DOCKER ?? "docker";
const project = `jafa-transfer-check-${randomBytes(6).toString("hex")}`;
const directory = await mkdtemp(join(tmpdir(), "jafa-native-transfer-"));
await mkdir(".local", { recursive: true });
const artifact = await mkdtemp(resolve(".local", "transfer-native-"));
const steps: string[] = [];
let created = false, passed = false, removed = false, pool: Pool | undefined, commandNumber = 0;
let volumes: string[] = [];
async function run(command: string, args: string[], env = process.env) {
  const number = ++commandNumber, output = join(artifact, `command-${number}.out`), errors = join(artifact, `command-${number}.err`);
  const stdout = await open(output, "wx", 0o600), stderr = await open(errors, "wx", 0o600);
  let code: number | null;
  try {
    const child = spawn(command, args, { env, timeout: 120000, stdio: ["ignore", stdout.fd, stderr.fd] });
    code = await new Promise<number | null>((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  } finally { await stdout.close(); await stderr.close(); }
  const text = await readFile(output, "utf8");
  await appendFile(join(artifact, "commands.log"), text + await readFile(errors, "utf8"), { mode: 0o600 });
  assert.equal(code, 0, `Perintah pemeriksaan gagal; lihat log privat ${artifact}/commands.log.`);
  return text.trim();
}
const done = (message: string) => { steps.push(message); console.log(message); };
async function waitForDatabase(pool: Pool) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await pool.query("SELECT 1"); return; } catch { await new Promise(resolve => setTimeout(resolve, 300)); }
  }
  throw new Error("Database fixture belum siap.");
}
try {
  await run(docker, ["info", "--format", "{{.ServerVersion}}"]);
  assert.equal(await run(docker, ["ps", "-aq", "--filter", `name=^/${project}$`]), "");
  const context = /\.exe$/i.test(docker) && process.platform !== "win32" ? await run("wslpath", ["-w", process.cwd()]) : process.cwd();
  const image = `${project}-database:local`;
  await run(docker, ["build", "--target", "database", "--tag", image, context]);
  const fixture = await createTransferFixture(directory);
  const result = await exportLocal(fixture.pg, fixture.media, fixture.bundle);
  const adminPassword = randomBytes(32).toString("hex"), appPassword = randomBytes(32).toString("hex");
  created = true;
  await run(docker, ["run", "--detach", "--name", project, "--label", `jafa.transfer-check=${project}`, "--publish", "127.0.0.1::5432", "--env", `POSTGRES_PASSWORD=${adminPassword}`, "--env", `POSTGRES_APP_PASSWORD=${appPassword}`, "--env", "POSTGRES_DB=jafa", image]);
  volumes = JSON.parse(await run(docker, ["inspect", "--format", "{{json .Mounts}}", project])).filter((mount: { Type: string }) => mount.Type === "volume").map((mount: { Name: string }) => mount.Name);
  const port = (await run(docker, ["port", project, "5432/tcp"])).split(":").pop()!;
  const url = `postgresql://jafa:${appPassword}@127.0.0.1:${port}/jafa`;
  pool = new Pool({ connectionString: url, connectionTimeoutMillis: 1000, max: 1 });
  await waitForDatabase(pool);
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: url, JAFA_LOCAL_DATABASE: "false", JAFA_CONTENT_PREVIEW: "false", OPENAI_API_KEY: "", JAFA_RAG_ENABLED: "false" };
  try { if ((await stat(".local/schema-engine")).isFile()) env.PRISMA_SCHEMA_ENGINE_BINARY = resolve(".local/schema-engine"); } catch { /* Gunakan engine Prisma terpasang bila override lokal tidak tersedia. */ }
  await run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], env);
  const role = (await pool.query("SELECT current_user AS name, rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0];
  assert.equal(role.name, "jafa"); assert.equal(role.rolsuper, false);
  done("PostgreSQL native/pgvector dimigrasikan oleh akun aplikasi non-superuser.");
  const before = await transferRows(pool), media = join(directory, "restored-media");
  await run(process.execPath, ["--import", "tsx", "scripts/transfer-local.ts", "import", fixture.bundle, media], env);
  const actual = await transferRows(pool);
  for (const [table, rows] of Object.entries(fixture.expected)) assert.deepEqual(actual[table], table === "_prisma_migrations" ? before[table] : table === "AuditEvent" ? [...rows, ...before.AuditEvent].sort() : ["Session", "Verification", "RateLimit"].includes(table) ? [] : rows, table);
  const password = (await pool.query<{ password: string }>('SELECT password FROM "Account" LIMIT 1')).rows[0].password;
  assert.ok(await verifyPassword(transferPassword, password));
  assert.deepEqual(await readFile(join(media, transferImageKey)), await readFile(join(fixture.media, transferImageKey)));
  assert.deepEqual(await readFile(join(media, "documents", transferPdfKey)), await readFile(join(fixture.media, "documents", transferPdfKey)));
  done("CLI impor native mempertahankan 16 tabel, bigint/JSON, hash sandi, revisi/proyeksi, PDF dan vector; tiga tabel sementara kosong.");
  await assert.rejects(run(process.execPath, ["--import", "tsx", "scripts/transfer-local.ts", "import", fixture.bundle, join(directory, "must-not-exist")], env));
  assert.deepEqual(await transferRows(pool), actual);
  await assert.rejects(stat(join(directory, "must-not-exist")), { code: "ENOENT" });
  done("Impor ulang ditolak tanpa perubahan data atau media tujuan.");
  await pool.end(); pool = undefined;
  await run(docker, ["restart", project]);
  const restartedUrl = new URL(url);
  restartedUrl.port = (await run(docker, ["port", project, "5432/tcp"])).split(":").pop()!;
  pool = new Pool({ connectionString: restartedUrl.toString(), connectionTimeoutMillis: 1000, max: 1 });
  await waitForDatabase(pool);
  assert.deepEqual(await transferRows(pool), actual);
  done("Seluruh nilai tetap sama setelah restart PostgreSQL native.");
  await writeFile(join(artifact, "transfer.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
  passed = true;
} finally {
  await pool?.end();
  try {
    if (created) {
      if (await run(docker, ["ps", "-aq", "--filter", `label=jafa.transfer-check=${project}`])) {
        assert.equal(await run(docker, ["inspect", "--format", '{{index .Config.Labels "jafa.transfer-check"}}', project]), project);
        await run(docker, ["rm", "--force", "--volumes", project]);
      }
      removed = await run(docker, ["ps", "-aq", "--filter", `label=jafa.transfer-check=${project}`]) === "";
      for (const volume of volumes) removed &&= await run(docker, ["volume", "ls", "-q", "--filter", `name=^${volume}$`]) === "";
    }
    if (passed && removed) await rm(directory, { recursive: true, force: true });
  } finally {
    await writeFile(join(artifact, "result.json"), JSON.stringify({ passed, isolatedResourcesRemoved: removed, project, volumes, steps, fixtureRemoved: passed && removed, artifact }, null, 2), { mode: 0o600 });
    console.log(`Bukti privat: ${artifact}/result.json`);
  }
}
