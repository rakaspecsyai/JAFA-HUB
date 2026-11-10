import { getLocalDatabase, closeLocalDatabase } from "../src/lib/local-db";
import { db } from "../src/lib/db";
import { importContent } from "./import-content";
import { applyLocalMigrations } from "./local-migrations";
if (process.env.JAFA_LOCAL_DATABASE !== "true" || process.env.NODE_ENV === "production") throw new Error("Local setup requires JAFA_LOCAL_DATABASE=true outside production.");
try {
  await applyLocalMigrations(await getLocalDatabase().engine);
  await importContent();
} finally { await db.$disconnect(); await closeLocalDatabase(); }
