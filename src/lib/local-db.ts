import { Duplex } from "node:stream";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { Pool, type PoolConfig } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { lockLocalDirectory } from "./local-db-lock";

// shortcut: the embedded PostgreSQL engine serves local development; use native PostgreSQL for production and load tests.
class LocalPgStream extends Duplex {
  constructor(private engine: () => Promise<PGlite>) { super(); }
  _read() {}
  connect() { this.engine().then(() => this.emit("connect"), error => this.destroy(error)); return this; }
  setNoDelay() { return this; }
  setKeepAlive() { return this; }
  ref() { return this; }
  unref() { return this; }
  _write(chunk: Buffer, _: BufferEncoding, callback: (error?: Error | null) => void) {
    this.engine().then(engine => engine.runExclusive(() => engine.execProtocolRawStream(chunk, { onRawData: data => { this.push(Buffer.from(data)); } })))
      .then(() => callback(), error => callback(error));
  }
  _final(callback: (error?: Error | null) => void) { this.push(null); callback(); }
}
export function createLocalDatabase(directory?: string) {
  let release: (() => Promise<void>) | undefined;
  let engine: Promise<PGlite> | undefined;
  let closing: Promise<void> | undefined;
  const open = async () => {
    if (!directory) return PGlite.create();
    const path = resolve(/* turbopackIgnore: true */ directory);
    await mkdir(path, { recursive: true });
    release = await lockLocalDirectory(path);
    try { return await PGlite.create(path); }
    catch (error) { await release(); throw error; }
  };
  const getEngine = () => {
    if (engine) return engine;
    if (closing) return Promise.reject(new Error("Local database is closed."));
    // Next's static-path workers import modules without querying; they must not open the persistent engine.
    engine = open();
    void engine.catch(() => {});
    return engine;
  };
  const pool = new Pool({ user: "postgres", database: "postgres", max: 1, idleTimeoutMillis: 0, stream: () => new LocalPgStream(getEngine) } as PoolConfig);
  const close = () => closing ??= (async () => {
    try { await pool.end(); }
    finally {
      if (engine) {
        await (await engine).close();
        await release?.();
      }
    }
  })();
  return { get engine() { return getEngine(); }, pool, close };
}
const localState = globalThis as unknown as {
  jafaLocalDatabase?: ReturnType<typeof createLocalDatabase>;
  jafaLocalDatabaseHooks?: { SIGINT: () => void; SIGTERM: () => void; beforeExit: () => void };
};
export function getLocalDatabase() {
  if (process.env.NODE_ENV === "production") throw new Error("Embedded database is unavailable in production.");
  if (!localState.jafaLocalDatabaseHooks) {
    const stop = async (signal?: NodeJS.Signals) => {
      try { await closeLocalDatabase(); }
      catch { console.error("Database lokal gagal ditutup; pertahankan data dan kunci untuk pemeriksaan."); process.exitCode = 1; }
      if (signal) process.exit(process.exitCode ?? 0);
    };
    const hooks = localState.jafaLocalDatabaseHooks = {
      SIGINT: () => { void stop("SIGINT"); }, SIGTERM: () => { void stop("SIGTERM"); }, beforeExit: () => { void stop(); }
    };
    process.on("SIGINT", hooks.SIGINT);
    process.on("SIGTERM", hooks.SIGTERM);
    process.once("beforeExit", hooks.beforeExit);
  }
  return localState.jafaLocalDatabase ??= createLocalDatabase(process.env.JAFA_LOCAL_DATABASE_DIRECTORY ?? ".local/development-pg");
}
export async function closeLocalDatabase() {
  const local = localState.jafaLocalDatabase;
  if (local) {
    await local.close();
    if (localState.jafaLocalDatabase === local) {
      delete localState.jafaLocalDatabase;
      const hooks = localState.jafaLocalDatabaseHooks;
      if (hooks) {
        process.off("SIGINT", hooks.SIGINT); process.off("SIGTERM", hooks.SIGTERM); process.off("beforeExit", hooks.beforeExit);
        delete localState.jafaLocalDatabaseHooks;
      }
    }
  }
}
