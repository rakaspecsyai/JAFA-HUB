import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getLocalDatabase } from "./local-db";

const globalDb = globalThis as unknown as { jafaDb?: PrismaClient };

function postgresAdapter() {
  const connectionString = process.env.DATABASE_URL;
  const ca = process.env.DATABASE_CA_CERT?.trim();
  if (ca) {
    if (!connectionString || !URL.canParse(connectionString)) throw new Error("DATABASE_CA_CERT memerlukan DATABASE_URL yang valid.");
    const params = new URL(connectionString).searchParams;
    // Parameter TLS dalam URL dapat menimpa CA yang dipakai node-postgres.
    if (["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"].some(key => params.has(key))) {
      throw new Error("Hapus parameter SSL dari DATABASE_URL saat memakai DATABASE_CA_CERT.");
    }
  }
  return new PrismaPg({ connectionString, max: 5, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) });
}

export const db = globalDb.jafaDb ?? new PrismaClient({
  adapter: process.env.JAFA_LOCAL_DATABASE === "true" && process.env.NODE_ENV !== "production"
    ? new PrismaPg(getLocalDatabase().pool)
    : postgresAdapter(),
  log: []
});
if (process.env.NODE_ENV !== "production") globalDb.jafaDb = db;
