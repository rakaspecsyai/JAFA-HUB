import { createHmac } from "node:crypto";
import { db } from "./db";
import { AppError } from "./errors";

export function clientKey(headers: Headers) {
  const trusted = process.env.TRUSTED_IP_HEADER;
  const value = trusted ? headers.get(trusted)?.split(",")[0]?.trim() ?? "unknown" : "direct";
  return privateKey(value);
}
export function privateKey(value: string) {
  const key = process.env.AUTH_RATE_LIMIT_KEY;
  if (!key) throw new Error("AUTH_RATE_LIMIT_KEY must be configured.");
  return createHmac("sha256", key).update(value).digest("hex");
}
export async function consumeRate(key: string, limit: number, seconds: number) {
  const now = new Date();
  const expiry = new Date(now.getTime() + seconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" (key, count, "expiresAt") VALUES (${key}, 1, ${expiry})
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE "RateLimit".count + 1 END,
    "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN ${expiry} ELSE "RateLimit"."expiresAt" END RETURNING count`;
  if (rows[0].count > limit) throw new AppError("Terlalu banyak percobaan. Tunggu beberapa saat lalu coba kembali.", 429);
}
