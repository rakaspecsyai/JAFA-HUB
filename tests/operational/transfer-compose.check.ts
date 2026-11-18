import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { exportLocal } from "../../scripts/transfer-local";
import { createTransferFixture, transferImageKey, transferPassword, transferPdfKey } from "../fixtures/transfer";

const docker = process.env.JAFA_TEST_DOCKER ?? "docker";
const project = `jafa-transfer-compose-${randomBytes(6).toString("hex")}`;
const appOrigin = "https://transfer-fixture.invalid";
const settings = {
  APP_URL: appOrigin, JAFA_RUNTIME_PORT: "0", TRUSTED_IP_HEADER: "",
  POSTGRES_ADMIN_PASSWORD: randomBytes(32).toString("hex"), POSTGRES_APP_PASSWORD: randomBytes(32).toString("hex"),
  AUTH_RATE_LIMIT_KEY: randomBytes(32).toString("hex"), BETTER_AUTH_SECRET: randomBytes(32).toString("hex")
};
const execute = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "jafa-compose-transfer-"));
await mkdir(".local", { recursive: true });
const artifact = await mkdtemp(resolve(".local", "transfer-compose-"));
const log = join(artifact, "commands.log"), steps: string[] = [];
let resources = false, passed = false, removed = false;

async function run(command: string, args: string[]) {
  try {
    const { stdout, stderr } = await execute(command, args, { env: { ...process.env, ...settings }, timeout: 360000 });
    await appendFile(log, stdout + stderr, { mode: 0o600 });
    return stdout.trim();
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };
    await appendFile(log, (stdout ?? "") + (stderr ?? ""), { mode: 0o600 });
    throw new Error(`Perintah gagal. Lihat log privat ${log}.`);
  }
}
const cliPath = async (path: string) => /\.exe$/i.test(docker) && process.platform !== "win32" ? run("wslpath", ["-w", path]) : path;
const envFile = join(directory, "fixture.env"), override = join(directory, "fixture.yaml");
await writeFile(envFile, Object.entries(settings).map(([key, value]) => `${key}=${value}`).join("\n"), { mode: 0o600 });
await writeFile(override, 'services:\n  app:\n    environment:\n      OPENAI_API_KEY: ""\n      JAFA_RAG_ENABLED: "false"\n  manage:\n    environment:\n      OPENAI_API_KEY: ""\n      JAFA_RAG_ENABLED: "false"\n', { mode: 0o600 });
const composeArgs = ["compose", "--project-name", project, "--env-file", await cliPath(envFile), "-f", await cliPath(resolve("compose.yaml")), "-f", await cliPath(override)];
const compose = (args: string[], mediaOverride: string[] = []) => run(docker, [...composeArgs, ...mediaOverride, ...args]);
const done = (step: string) => { steps.push(step); console.log(step); };
async function emptyProject() {
  for (const args of [["ps", "-aq"], ["volume", "ls", "-q"], ["network", "ls", "-q"]]) {
    if (await run(docker, [...args, "--filter", `label=com.docker.compose.project=${project}`])) return false;
  }
  return true;
}

try {
  await compose(["config", "--quiet"]);
  assert.ok(await emptyProject(), "Nama project fixture sudah digunakan.");
  await compose(["build", "app", "database"]);
  done("Image aplikasi dan PostgreSQL Compose dibangun dari source saat ini.");
  const fixture = await createTransferFixture(directory);
  const exported = await exportLocal(fixture.pg, fixture.media, fixture.bundle);
  const mediaPath = "/var/lib/jafa/media/transfer-fixture";
  const manage = ["run", "--rm", "-T"];
  resources = true;
  await compose(["up", "-d", "--wait", "database"]);
  await compose([...manage, "manage", "migrate"]);
  await compose(["stop", "app"]);
  const imported = await compose([...manage, "--volume", `${await cliPath(fixture.bundle)}:/run/jafa-transfer:ro`, "--entrypoint", "node", "manage", "--import", "tsx", "scripts/transfer-local.ts", "import", "/run/jafa-transfer", mediaPath]);
  assert.ok(imported.includes(`${exported.rows} baris, ${exported.files} berkas terverifikasi`));
  done("Layanan manage mengimpor bundle dari bind mount baca saja ke volume media bernama.");

  const mediaFile = join(directory, "media.yaml");
  await writeFile(mediaFile, `services:\n  app:\n    environment:\n      MEDIA_DIRECTORY: ${mediaPath}\n  manage:\n    environment:\n      MEDIA_DIRECTORY: ${mediaPath}\n`, { mode: 0o600 });
  const mediaOverride = ["-f", await cliPath(mediaFile)];
  await compose([...manage, "manage", "check"], mediaOverride);
  const imagePath = `/api/media/${fixture.imageId}`, pdfPath = `/api/documents/${fixture.documentId}/file`;
  const image = await readFile(join(fixture.media, transferImageKey)), pdf = await readFile(join(fixture.media, "documents", transferPdfKey));
  async function checkApp() {
    const address = await compose(["port", "app", "3000"], mediaOverride);
    assert.match(address, /^127\.0\.0\.1:[1-9]\d*$/);
    const get = (path: string, init?: RequestInit) => fetch(`http://${address}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15000), ...init });
    assert.equal((await get("/api/health")).status, 200);
    const page = await get("/insight/transfer-article");
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Isi revisi terbit sintetis/);
    assert.doesNotMatch(html, /Isi revisi draf sintetis/);
    const search = await get("/pencarian?q=terbit");
    assert.equal(search.status, 200);
    assert.match(await search.text(), /href="\/insight\/transfer-article"/);
    const publicImage = await get(imagePath);
    assert.equal(publicImage.status, 200);
    assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), image);
    assert.equal((await get(pdfPath)).status, 404);
    for (const role of ["editor", "admin"] as const) {
      const session = await get("/api/auth/sign-in/email", {
        method: "POST", headers: { Origin: appOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ email: `${role}@transfer.invalid`, password: transferPassword })
      });
      assert.equal(session.status, 200);
      const cookie = session.headers.getSetCookie().find(value => value.startsWith("__Secure-jafa_session="));
      assert.ok(cookie && /;\s*Secure(?:;|$)/i.test(cookie));
      const response = await get(pdfPath, { headers: { Cookie: cookie.split(";")[0] } });
      assert.equal(response.status, role === "editor" ? 200 : 404);
      if (role === "editor") assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    }
  }
  await compose(["up", "-d", "--wait", "app"], mediaOverride);
  await checkApp();
  done("Aplikasi membaca revisi terbit, pencarian, gambar, dan PDF privat dengan akun hasil transfer.");
  const containers = await compose(["ps", "-q", "app", "database"], mediaOverride);
  await compose(["down"], mediaOverride);
  await compose(["up", "-d", "--wait", "app"], mediaOverride);
  assert.notEqual(await compose(["ps", "-q", "app", "database"], mediaOverride), containers);
  await checkApp();
  done("Hasil transfer dan akses media tetap berlaku setelah container aplikasi dan database dibuat ulang.");
  passed = true;
} finally {
  try {
    if (resources) {
      await compose(["down", "--volumes", "--remove-orphans"]);
      removed = await emptyProject();
      assert.ok(removed, "Resource project fixture masih tersisa.");
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
    await writeFile(join(artifact, "result.json"), JSON.stringify({ passed, isolatedResourcesRemoved: removed, project, steps }, null, 2), { mode: 0o600 });
    console.log(`Bukti privat tersedia di ${artifact}/result.json`);
  }
}
