import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateProductionEnvironment } from "../scripts/production.mjs";

const valid: NodeJS.ProcessEnv = {
  NODE_ENV: "production", JAFA_LOCAL_DATABASE: "false", JAFA_CONTENT_PREVIEW: "false",
  DATABASE_URL: "postgresql://tester:PRIVATE_DATABASE_PASSWORD@127.0.0.1:1/runtime_test",
  APP_URL: "https://runtime.example.invalid", MEDIA_DIRECTORY: "/var/lib/jafa/media",
  AUTH_RATE_LIMIT_KEY: "PRIVATE_RATE_LIMIT_KEY_".repeat(3), BETTER_AUTH_SECRET: "PRIVATE_BETTER_AUTH_SECRET_".repeat(3)
};

test("konfigurasi produksi menerima PostgreSQL/origin HTTPS dan menolak fallback pengembangan", () => {
  assert.deepEqual(validateProductionEnvironment(valid, "/app"), []);
  const invalid: Partial<NodeJS.ProcessEnv>[] = [
    { NODE_ENV: "development" }, { NODE_ENV: undefined }, { JAFA_LOCAL_DATABASE: "true" }, { JAFA_LOCAL_DATABASE: undefined },
    { JAFA_CONTENT_PREVIEW: "true" }, { JAFA_CONTENT_PREVIEW: undefined },
    { DATABASE_URL: undefined }, { DATABASE_URL: "file:///private" }, { DATABASE_URL: "postgresql://tester@host/" },
    { DATABASE_URL: `${valid.DATABASE_URL}#private` },
    { APP_URL: "http://localhost:3000" }, { APP_URL: "https://runtime.example.invalid/" },
    { APP_URL: "https://runtime.example.invalid/path" }, { APP_URL: "https://user:private@runtime.example.invalid" },
    { AUTH_RATE_LIMIT_KEY: "short" }, { BETTER_AUTH_SECRET: undefined }, { BETTER_AUTH_SECRET: valid.AUTH_RATE_LIMIT_KEY },
    { MEDIA_DIRECTORY: ".local/media" }, { MEDIA_DIRECTORY: "/app/media" }, { MEDIA_DIRECTORY: "/app" }, { MEDIA_DIRECTORY: "/" }
  ];
  for (const patch of invalid) {
    const errors = validateProductionEnvironment({ ...valid, ...patch }, "/app");
    assert.ok(errors.length > 0);
    assert.doesNotMatch(errors.join(" "), /PRIVATE_|user:private/);
  }
  assert.deepEqual(validateProductionEnvironment({ ...valid, MEDIA_DIRECTORY: "/app-media" }, "/app"), []);
});

test("CLI runtime memeriksa konfigurasi tanpa database dan menolak perintah akun noninteraktif", async t => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-runtime-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const code = join(directory, "app"), media = join(directory, "media");
  await mkdir(code); await mkdir(media);
  await cp("scripts/production.mjs", join(code, "production.mjs"));
  const run = promisify(execFile);
  const env = { ...process.env, ...valid, MEDIA_DIRECTORY: media };
  const check = await run(process.execPath, ["production.mjs", "check"], { cwd: code, env, timeout: 10000 });
  assert.match(check.stdout, /koneksi database belum diperiksa/);
  assert.doesNotMatch(check.stdout + check.stderr, /PRIVATE_/);
  for (const command of ["bootstrap", "recover", "constructor"]) {
    await assert.rejects(run(process.execPath, ["production.mjs", command], { cwd: code, env, timeout: 10000 }), error => {
      const result = error as { code: number; stdout: string; stderr: string };
      assert.equal(result.code, 1);
      assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_|Cannot find module|ECONNREFUSED/);
      return true;
    });
  }
});

test("CLI runtime mempertahankan env/data lokal dan menolak media yang bukan direktori terpisah", async t => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-runtime-paths-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const code = join(directory, "app"), media = join(directory, "media");
  await mkdir(code); await mkdir(media);
  await cp("scripts/production.mjs", join(code, "production.mjs"));
  const run = promisify(execFile);
  const reject = async (target: string) => {
    await assert.rejects(run(process.execPath, ["production.mjs", "check"], { cwd: code, env: { ...process.env, ...valid, MEDIA_DIRECTORY: target }, timeout: 10000 }), error => {
      const result = error as { code: number; stderr: string };
      assert.equal(result.code, 1); assert.doesNotMatch(result.stderr, /PRIVATE_/); return true;
    });
  };
  const localEnv = join(code, ".env.production");
  await writeFile(localEnv, "PRIVATE_ENV_VALUE"); await reject(media);
  await rm(localEnv);
  await mkdir(join(code, ".local")); await reject(media);
  await rm(join(code, ".local"), { recursive: true });
  const internal = join(code, "media"); await mkdir(internal);
  const alias = join(directory, "alias"); await symlink(internal, alias); await reject(alias);
  const file = join(directory, "file"); await writeFile(file, "PRIVATE_MEDIA_VALUE"); await reject(file);
  await reject(join(directory, "missing"));
});
