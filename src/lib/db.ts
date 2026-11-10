import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getLocalDatabase } from "./local-db";

const globalDb = globalThis as unknown as { jafaDb?: PrismaClient };
export const db = globalDb.jafaDb ?? new PrismaClient({
  adapter: process.env.JAFA_LOCAL_DATABASE === "true" && process.env.NODE_ENV !== "production"
    ? new PrismaPg(getLocalDatabase().pool)
    : new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 }),
  log: []
});
if (process.env.NODE_ENV !== "production") globalDb.jafaDb = db;
