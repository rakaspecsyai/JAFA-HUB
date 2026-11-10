import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createMemoryPool } from "./memory-pool";
import { verifyPassword } from "../../src/lib/passwords";

test("migrasi mempertahankan akun/hash/konten lama, mencabut sesi, dan memulihkan semua kontributor dari audit", async () => {
  const memory = await createMemoryPool();
  try {
    const engine = memory.engine;
    await engine.exec(await readFile("prisma/migrations/202610220001_initial/migration.sql", "utf8"));
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    const password = "legacy-migration-password-123";
    const salt = randomBytes(16).toString("hex");
    const legacy = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
    for (const [index, id] of ids.entries()) {
      await engine.query('INSERT INTO "User" (id, name, email, "passwordHash", role, "mustChangePassword", "updatedAt") VALUES ($1, $2, $3, $4, $5::"Role", false, now())', [id, `Petugas sintetis ${index}`, `migration-${index}@uji.invalid`, legacy, index === 2 ? "admin" : "editor"]);
    }
    const itemId = randomUUID(), revisionId = randomUUID();
    await engine.query('INSERT INTO "ContentItem" (id, kind, slug, "updatedAt") VALUES ($1, \'article\', \'legacy-migration\', now())', [itemId]);
    await engine.query('INSERT INTO "ContentRevision" (id, "itemId", number, payload, "reviewedOn", "authorId", "submitterId", "updatedAt") VALUES ($1, $2, 1, $3::jsonb, \'2026-10-26\', $4, $5, now())', [revisionId, itemId, JSON.stringify({ title: "Draf lama", body: "Isi tetap tersimpan" }), ids[0], ids[2]]);
    await engine.query('INSERT INTO "AuditEvent" (id, "actorId", "actorName", action, "objectId", "revisionId", "requestId") VALUES ($1, $2, \'Editor sintetis\', \'content.save\', $3, $4, $5)', [randomUUID(), ids[1], itemId, revisionId, randomUUID()]);
    await engine.query('INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt") VALUES ($1, \'synthetic-old-session\', $2, now() + interval \'1 hour\')', [randomUUID(), ids[2]]);
    const users = (await engine.query('SELECT id, name, email, role, active, "mustChangePassword", "createdAt", "updatedAt" FROM "User" ORDER BY id')).rows;
    const revisions = (await engine.query('SELECT row_to_json(t)::text AS row FROM "ContentRevision" t ORDER BY id')).rows;
    const sql = await readFile("prisma/migrations/202610260001_auth_governance/migration.sql", "utf8");
    await engine.exec("CREATE FUNCTION reject_auth_migration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'account.auth-migration' THEN RAISE EXCEPTION 'test migration rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_auth_migration_failure BEFORE INSERT ON \"AuditEvent\" FOR EACH ROW EXECUTE FUNCTION reject_auth_migration();");
    await assert.rejects(engine.exec(sql), /test migration rollback/);
    assert.equal((await engine.query('SELECT * FROM "User" WHERE "passwordHash" IS NOT NULL')).rows.length, ids.length);
    assert.equal((await engine.query('SELECT * FROM "Session"')).rows.length, 1);
    assert.equal((await engine.query<{ table: string | null }>("SELECT to_regclass('public.\"Account\"')::text AS table")).rows[0].table, null);
    await engine.exec('DROP TRIGGER test_auth_migration_failure ON "AuditEvent"; DROP FUNCTION reject_auth_migration();');
    await engine.transaction(tx => tx.exec(sql));
    assert.deepEqual((await engine.query('SELECT id, name, email, role, active, "mustChangePassword", "createdAt", "updatedAt" FROM "User" ORDER BY id')).rows, users);
    assert.deepEqual((await engine.query('SELECT row_to_json(t)::text AS row FROM "ContentRevision" t ORDER BY id')).rows, revisions);
    const accounts = (await engine.query<{ userId: string; accountId: string; providerId: string; password: string }>('SELECT "userId", "accountId", "providerId", password FROM "Account" ORDER BY "userId"')).rows;
    assert.equal(accounts.length, ids.length);
    for (const account of accounts) {
      assert.equal(account.accountId, account.userId);
      assert.equal(account.providerId, "credential");
      assert.equal(account.password, legacy);
      assert.equal(await verifyPassword(password, account.password), true);
    }
    assert.equal((await engine.query('SELECT * FROM "User" WHERE "passwordHash" IS NOT NULL')).rows.length, 0);
    assert.equal((await engine.query('SELECT * FROM "Session"')).rows.length, 0);
    assert.deepEqual((await engine.query<{ userId: string }>('SELECT "userId" FROM "RevisionContributor" WHERE "revisionId"=$1 ORDER BY "userId"', [revisionId])).rows.map(row => row.userId), [...ids].sort());
    assert.equal((await engine.query('SELECT * FROM "AuditEvent" WHERE action=\'account.auth-migration\'')).rows.length, 1);
  } finally { await memory.pool.end(); await memory.engine.close(); }
});
