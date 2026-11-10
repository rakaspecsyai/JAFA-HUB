import { readdir, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";

export async function applyLocalMigrations(engine: PGlite) {
  await engine.exec(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0
  )`);
  const directories = (await readdir("prisma/migrations", { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
  for (const name of directories) {
    const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await engine.query<{ checksum: string }>('SELECT checksum FROM "_prisma_migrations" WHERE migration_name = $1 AND rolled_back_at IS NULL AND finished_at IS NOT NULL', [name]);
    if (applied.rows.length) {
      if (applied.rows[0].checksum !== checksum) throw new Error(`Migration ${name} changed after application; create a new migration instead.`);
      continue;
    }
    await engine.transaction(async tx => {
      await tx.exec(sql);
      await tx.query('INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES ($1, $2, $3, now(), 1)', [randomUUID(), checksum, name]);
    });
  }
}
