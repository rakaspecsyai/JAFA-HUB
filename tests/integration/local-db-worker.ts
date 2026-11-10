import assert from "node:assert/strict";
import { getLocalDatabase, closeLocalDatabase } from "../../src/lib/local-db";

process.on("message", () => {});
try {
  const listeners = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM"), process.listenerCount("beforeExit")];
  const local = getLocalDatabase();
  await (await local.engine).exec("CREATE TABLE IF NOT EXISTS local_check (id TEXT PRIMARY KEY); INSERT INTO local_check VALUES ('data tetap ada') ON CONFLICT DO NOTHING;");
  if (process.argv.includes("--handoff")) {
    await closeLocalDatabase();
    assert.deepEqual([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM"), process.listenerCount("beforeExit")], listeners);
    assert.equal((await getLocalDatabase().pool.query("SELECT id FROM local_check")).rows[0].id, "data tetap ada");
  }
  process.send?.({ status: "ready" });
  if (process.argv.includes("--once")) process.disconnect();
} catch (error) {
  process.send?.({ status: "error", message: (error as Error).message });
  process.exitCode = 1;
  process.disconnect();
}
