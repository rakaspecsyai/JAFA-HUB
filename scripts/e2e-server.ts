import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testAccounts, testPassword } from "../tests/e2e/accounts";
import type { Staff } from "../src/lib/content-types";
import { createTestWorkspace } from "./test-workspace";

const port = Number(process.env.PLAYWRIGHT_PORT ?? "5184");
assert(Number.isInteger(port) && port > 0 && port < 65536, "PLAYWRIGHT_PORT harus berupa port yang sah.");
const directory = await mkdtemp(join(tmpdir(), "jafa-e2e-"));
let workspace: string | undefined;
Object.assign(process.env, {
  NODE_ENV: "development",
  JAFA_LOCAL_DATABASE: "true",
  JAFA_LOCAL_DATABASE_DIRECTORY: join(directory, "pg"),
  JAFA_CONTENT_PREVIEW: "false",
  MEDIA_DIRECTORY: join(directory, "media"),
  DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/e2e",
  APP_URL: `http://127.0.0.1:${port}`,
  AUTH_RATE_LIMIT_KEY: randomBytes(32).toString("hex"),
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  TRUSTED_IP_HEADER: "",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_MANUAL_SIG_HANDLE: "true",
  NEXT_EXIT_TIMEOUT_MS: "30000"
});

try {
  const { getLocalDatabase, closeLocalDatabase } = await import("../src/lib/local-db");
  const { db } = await import("../src/lib/db");
  try {
    const { applyLocalMigrations } = await import("./local-migrations");
    const { importContent } = await import("./import-content");
    const { hashPassword } = await import("../src/lib/passwords");
    const { credentialUser } = await import("../src/lib/credentials");
    const { submitRevision, reviewRevision } = await import("../src/lib/content-service");
    await applyLocalMigrations(await getLocalDatabase().engine);
    assert.equal(await db.user.count(), 0);
    assert.equal(await db.contentItem.count(), 0);
    const passwordHash = await hashPassword(testPassword);
    const staff = {} as Record<keyof typeof testAccounts, Staff>;
    for (const role of ["editor", "approver", "admin"] as const) {
      const user = await db.user.create({ data: credentialUser({ ...testAccounts[role], role, mustChangePassword: false }, passwordHash) });
      staff[role] = { id: user.id, name: user.name, email: user.email, role, mustChangePassword: false };
    }
    const { imported } = await importContent();
    assert.equal(await db.contentItem.count({ where: { publishedRevisionId: { not: null } } }), 0);
    const revisions = await db.contentRevision.findMany();
    assert.equal(revisions.length, imported);
    for (const revision of revisions) {
      await submitRevision(staff.editor, revision.itemId, revision.id, revision.version);
      await reviewRevision(staff.approver, revision.itemId, revision.id, revision.version + 1, "publish", "Fixture E2E pada database sementara; bukan persetujuan substansi.");
    }
    assert.equal(await db.contentItem.count({ where: { publishedRevisionId: { not: null } } }), imported);
    assert.equal(await db.publishedSearchEntry.count(), imported);
  } finally {
    await db.$disconnect();
    await closeLocalDatabase();
  }

  if (process.argv.includes("--check")) {
    const local = getLocalDatabase();
    try {
      assert.equal((await local.pool.query('SELECT count(*)::int AS count FROM "User"')).rows[0].count, 3);
    } finally { await closeLocalDatabase(); }
    console.log("Self-check E2E lulus: database sementara, migrasi, tiga peran, persetujuan fixture, dan persistensi.");
  } else {
    workspace = await createTestWorkspace("e2e-code-");
    const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: workspace, stdio: "inherit", env: process.env });
    let stopping = false;
    const stop = (signal: NodeJS.Signals) => { stopping = true; server.kill(signal); };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    try {
      const [code] = await once(server, "exit");
      process.exitCode = stopping ? 0 : code ?? 1;
    } finally {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    }
  }
} finally {
  if (workspace) await rm(workspace, { recursive: true, force: true });
  await rm(directory, { recursive: true, force: true });
}
