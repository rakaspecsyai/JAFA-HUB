import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import type { BetterAuthOptions, DBAdapter, Where } from "better-auth";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
import { DUMMY_PASSWORD_HASH, hashPassword, tokenHash, verifyPassword } from "./passwords";

export const SESSION_COOKIE = "jafa_session";
export const sessionCookieName = () => process.env.NODE_ENV === "production" ? `__Secure-${SESSION_COOKIE}` : SESSION_COOKIE;

function sessionAdapter(client: PrismaClient | Prisma.TransactionClient) {
  return (options: BetterAuthOptions): DBAdapter => {
    const adapter = prismaAdapter(client, { provider: "postgresql", transaction: false })(options);
    const where = (model: string, clauses: Where[]) => model !== "session" ? clauses : clauses.map(clause => {
      if (clause.field !== "token") return clause;
      if (typeof clause.value !== "string") throw new Error("Session token lookup must use a string.");
      return { ...clause, value: tokenHash(clause.value) };
    });
    const restore = <T>(value: T, token: unknown): T => value && typeof value === "object" && typeof token === "string" ? { ...value, token } : value;
    // shortcut: only sign-in/get-session/sign-out are exposed; review token handling before enabling more session APIs.
    const wrapped: DBAdapter = {
      ...adapter,
      async create(input) {
        if (input.model !== "session") return adapter.create(input);
        const token = input.data.token;
        if (typeof token !== "string") throw new Error("Session token must be a string.");
        return restore(await adapter.create({ ...input, data: { ...input.data, token: tokenHash(token) } }), token);
      },
      async findOne<T>(input: Parameters<DBAdapter["findOne"]>[0]) {
        const token = input.where.find(clause => clause.field === "token")?.value;
        const result = await adapter.findOne<T>({ ...input, where: where(input.model, input.where) });
        return input.model === "session" ? restore(result, token) : result;
      },
      async findMany<T>(input: Parameters<DBAdapter["findMany"]>[0]) {
        const token = input.where?.find(clause => clause.field === "token")?.value;
        const results = await adapter.findMany<T>({ ...input, where: where(input.model, input.where ?? []) });
        return input.model === "session" ? results.map(result => restore(result, token)) : results;
      },
      delete: input => adapter.delete({ ...input, where: where(input.model, input.where) }),
      deleteMany: input => adapter.deleteMany({ ...input, where: where(input.model, input.where) }),
      transaction: callback => callback(wrapped)
    };
    return wrapped;
  };
}

export function createAuth(client: PrismaClient | Prisma.TransactionClient = db) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new AppError("Konfigurasi autentikasi belum siap.", 503);
  const baseURL = process.env.APP_URL ?? "http://localhost:3000";
  const url = new URL(baseURL);
  const trustedOrigins = [url.origin];
  if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
    const alias = new URL(url); alias.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
    trustedOrigins.push(alias.origin);
  }
  return betterAuth({
    appName: "Jafa Hub", baseURL, secret, trustedOrigins,
    database: sessionAdapter(client),
    emailAndPassword: {
      enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128,
      password: {
        async hash(password) {
          if (password.length < 12) { await verifyPassword(password, DUMMY_PASSWORD_HASH); return DUMMY_PASSWORD_HASH; }
          return hashPassword(password);
        },
        verify: ({ password, hash }) => verifyPassword(password, hash)
      }
    },
    session: { expiresIn: 8 * 3600, disableSessionRefresh: true, cookieCache: { enabled: false }, fields: { token: "tokenHash" } },
    user: { additionalFields: {
      role: { type: ["editor", "approver", "admin"], required: true, input: false },
      active: { type: "boolean", required: true, input: false },
      mustChangePassword: { type: "boolean", required: true, input: false }
    } },
    advanced: {
      database: { generateId: "uuid" }, useSecureCookies: process.env.NODE_ENV === "production",
      ipAddress: { disableIpTracking: true }, cookies: { session_token: { name: SESSION_COOKIE } }
    },
    // Both public login entry points use authenticate's persistent database limits.
    rateLimit: { enabled: false }, logger: { disabled: true }, telemetry: { enabled: false },
    databaseHooks: { session: { create: { async before(session) {
      const user = await client.user.findUnique({ where: { id: session.userId } });
      if (!user?.active) throw new APIError("UNAUTHORIZED", { message: "Invalid email or password" });
      return { data: { ...session, ipAddress: null, userAgent: null, expiresAt: new Date(Date.now() + 8 * 3600_000) } };
    } } } }
  });
}
