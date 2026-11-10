import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createMemoryPool } from "../integration/memory-pool";
import { applyLocalMigrations } from "../../scripts/local-migrations";
import { seedLoad } from "../../scripts/seed-load";

const memory = await createMemoryPool();
try {
  await applyLocalMigrations(memory.engine);
  (globalThis as unknown as { jafaDb: PrismaClient }).jafaDb = new PrismaClient({ adapter: new PrismaPg(memory.pool) });
  process.env.JAFA_LOAD_DATABASE_URL = "postgresql://fixture@127.0.0.1:54339/jafa_load_self_check";
  await seedLoad();
  const counts = await memory.engine.query<{ kind: string; count: number }>('SELECT kind, count(*)::int AS count FROM "ContentItem" GROUP BY kind');
  assert.deepEqual(Object.fromEntries(counts.rows.map(row => [row.kind, row.count])), { article: 1000, regulation: 500, faq: 500 });
  const revisions = await memory.engine.query<{ count: number }>('SELECT count(*)::int AS count FROM "ContentRevision" WHERE status=\'approved\' AND "authorId" != "reviewerId" AND "submitterId" != "reviewerId"');
  assert.equal(revisions.rows[0].count, 2000);
  const before = await memory.engine.query('SELECT count(*)::int AS count FROM "AuditEvent"');
  await assert.rejects(seedLoad(), /berisi data aplikasi/);
  assert.deepEqual((await memory.engine.query('SELECT count(*)::int AS count FROM "AuditEvent"')).rows, before.rows);
  console.log("Lulus: 2.000 fixture/workflow terpisah dan seed ulang ditolak tanpa penulisan. Engine PGlite in-memory; bukan PostgreSQL native atau hasil beban.");
} finally { await memory.pool.end(); await memory.engine.close(); }
