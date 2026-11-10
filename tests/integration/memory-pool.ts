import { createLocalDatabase } from "../../src/lib/local-db";
export async function createMemoryPool() {
  const local = createLocalDatabase();
  return { engine: await local.engine, pool: local.pool };
}
