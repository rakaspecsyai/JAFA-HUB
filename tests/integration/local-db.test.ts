import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { createLocalDatabase } from "../../src/lib/local-db";
import { lockLocalDirectory } from "../../src/lib/local-db-lock";

async function temporary(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "jafa-local-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, "pg");
  await mkdir(directory);
  return { root, directory, lock: `${directory}.jafa-lock` };
}

function worker(t: TestContext, directory: string, onceOnly = false) {
  const child = fork(new URL("./local-db-worker.ts", import.meta.url), onceOnly ? ["--once", "--handoff"] : [], {
    execArgv: ["--import", "tsx"], silent: true,
    env: { ...process.env, NODE_ENV: "development", JAFA_LOCAL_DATABASE_DIRECTORY: directory }
  });
  const exited = once(child, "exit");
  const ready = once(child, "message", { signal: AbortSignal.timeout(30000) })
    .then(([message]) => message as { status: "ready" | "error"; message?: string });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited;
  });
  return { child, ready, exited };
}

test("kunci aktif tetap terlindungi melalui alias dan waktu berkas yang lama", async t => {
  const { root, directory, lock } = await temporary(t);
  const release = await lockLocalDirectory(directory);
  try {
    const owner = await readdir(lock);
    await utimes(lock, new Date(0), new Date(0));
    await symlink(directory, join(root, "alias"));
    await assert.rejects(lockLocalDirectory(join(root, "alias")), /sedang digunakan/);
    assert.deepEqual(await readdir(lock), owner);
  } finally { await release(); }
  const nextRelease = await lockLocalDirectory(directory);
  await nextRelease();
  await nextRelease();
});

test("konstruksi dan penutupan tanpa kueri tidak membuka engine atau membuat direktori data", async t => {
  const { root } = await temporary(t);
  const directory = join(root, "never-opened");
  const local = createLocalDatabase(directory);
  await local.close();
  await assert.rejects(readdir(directory), { code: "ENOENT" });
  await assert.rejects(readdir(`${directory}.jafa-lock`), { code: "ENOENT" });
  await assert.rejects(local.engine, /closed/);
});

test("kunci tidak dikenal ditolak tanpa dihapus", async t => {
  const { directory, lock } = await temporary(t);
  await mkdir(lock);
  await writeFile(join(lock, "unknown"), "pertahankan");
  await assert.rejects(lockLocalDirectory(directory), /tidak dikenali/);
  assert.deepEqual(await readdir(lock), ["unknown"]);
});

test("kunci dari host atau namespace lain tidak dianggap mati", async t => {
  const { directory, lock } = await temporary(t);
  const release = await lockLocalDirectory(directory);
  try {
    const [owner] = await readdir(lock);
    await writeFile(join(lock, owner), JSON.stringify(["other-host", "other-namespace"]));
    await assert.rejects(lockLocalDirectory(directory), /Identitas host\/namespace/);
    assert.deepEqual(await readdir(lock), [owner]);
  } finally { await release(); }
});

test("kegagalan inisialisasi melepas kunci dan mempertahankan berkas sumber", async t => {
  const { directory, lock } = await temporary(t);
  await writeFile(join(directory, "source-marker"), "jangan dihapus");
  const create = t.mock.method(PGlite, "create", async () => {
    assert.equal((await readdir(lock)).length, 1);
    throw new Error("simulated initialization failure");
  });
  const local = createLocalDatabase(directory);
  await assert.rejects(local.engine, /simulated initialization failure/);
  await assert.rejects(local.close(), /simulated initialization failure/);
  assert.equal(create.mock.callCount(), 1);
  await assert.rejects(readdir(lock), { code: "ENOENT" });
  assert.deepEqual(await readdir(directory), ["source-marker"]);
  create.mock.restore();
  const release = await lockLocalDirectory(directory);
  await release();
});

test("dua proses bersaing: hanya satu boleh membuka engine", { timeout: 60000 }, async t => {
  const { directory, lock } = await temporary(t);
  const contenders = [worker(t, directory), worker(t, directory)];
  const results = await Promise.all(contenders.map(p => p.ready));
  assert.equal(results.filter(r => r.status === "ready").length, 1);
  const rejected = results.findIndex(r => r.status === "error");
  assert.match(results[rejected].message!, /sedang digunakan/);
  assert.equal((await contenders[rejected].exited)[0], 1);
  const owner = await readdir(lock);
  const blocked = createLocalDatabase(directory);
  await assert.rejects(blocked.engine, /sedang digunakan/);
  await assert.rejects(blocked.close(), /sedang digunakan/);
  assert.deepEqual(await readdir(lock), owner);
  const winner = contenders[1 - rejected];
  winner.child.kill("SIGTERM");
  assert.equal((await winner.exited)[0], 0);
  await assert.rejects(readdir(lock), { code: "ENOENT" });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  test(`${signal} menutup engine pada proses pemilik; restart mempertahankan data`, { timeout: 60000 }, async t => {
    const { directory, lock } = await temporary(t);
    const owner = worker(t, directory);
    assert.equal((await owner.ready).status, "ready");
    owner.child.kill(signal);
    assert.equal((await owner.exited)[0], 0);
    await assert.rejects(readdir(lock), { code: "ENOENT" });
    const local = createLocalDatabase(directory);
    try { assert.deepEqual((await local.pool.query("SELECT id FROM local_check")).rows, [{ id: "data tetap ada" }]); }
    finally { await Promise.all([local.close(), local.close()]); }
  });
}

test("SIGKILL meninggalkan kunci yang dapat diambil satu pemilik baru tanpa menghapus data", { timeout: 60000 }, async t => {
  const { directory, lock } = await temporary(t);
  const owner = worker(t, directory);
  assert.equal((await owner.ready).status, "ready");
  owner.child.kill("SIGKILL");
  assert.equal((await owner.exited)[1], "SIGKILL");
  assert.equal((await readdir(lock)).length, 1);
  const contenders = [worker(t, directory), worker(t, directory), worker(t, directory)];
  const results = await Promise.all(contenders.map(p => p.ready));
  assert.equal(results.filter(r => r.status === "ready").length, 1);
  const winner = contenders[results.findIndex(r => r.status === "ready")];
  for (const result of results.filter(r => r.status === "error")) assert.match(result.message!, /sedang digunakan/);
  assert.equal((await readdir(lock)).length, 1);
  winner.child.kill("SIGTERM");
  assert.equal((await winner.exited)[0], 0);
  const local = createLocalDatabase(directory);
  try { assert.deepEqual((await local.pool.query("SELECT id FROM local_check")).rows, [{ id: "data tetap ada" }]); }
  finally { await local.close(); }
});

test("penutupan melepas listener; buka ulang dan akhir proses normal menutup engine", { timeout: 60000 }, async t => {
  const { directory, lock } = await temporary(t);
  const owner = worker(t, directory, true);
  assert.equal((await owner.ready).status, "ready");
  assert.equal((await owner.exited)[0], 0);
  await assert.rejects(readdir(lock), { code: "ENOENT" });
});
