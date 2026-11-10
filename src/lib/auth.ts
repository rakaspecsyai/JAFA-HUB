import { cookies } from "next/headers";
import { db } from "./db";
import { hashPassword } from "./passwords";
import { createAuth, sessionCookieName } from "./better-auth";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { consumeRate, privateKey, clientKey } from "./rate-limit";
import { AppError } from "./errors";
import type { Staff } from "./content-types";

export { SESSION_COOKIE, sessionCookieName } from "./better-auth";
export async function getStaff(): Promise<Staff | null> {
  const jar = await cookies();
  if (!jar.get(sessionCookieName())?.value.includes(".")) return null;
  const session = await createAuth().api.getSession({ headers: new Headers({ cookie: jar.toString() }), query: { disableCookieCache: true, disableRefresh: true } });
  if (!session?.user.active || session.session.expiresAt <= new Date()) return null;
  const { id, name, email, role, mustChangePassword } = session.user;
  return { id, name, email, role, mustChangePassword };
}
export async function requireStaff(roles?: Staff["role"][], allowInitialPassword = false) {
  const staff = await getStaff();
  if (!staff) throw new AppError("Sesi Anda berakhir. Silakan masuk kembali.", 401);
  if (staff.mustChangePassword && !allowInitialPassword) throw new AppError("Ganti sandi sementara sebelum melanjutkan.", 403);
  if (roles && !roles.includes(staff.role)) throw new AppError("Peran Anda tidak memiliki akses untuk tindakan ini.", 403);
  return staff;
}
export async function authenticate(email: string, password: string, requestHeaders: Headers) {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || password.length > 128) throw new AppError("Email atau sandi tidak sesuai.", 401);
  const ip = clientKey(requestHeaders);
  const pair = `login:pair:${privateKey(`${normalized}:${ip}`)}`;
  const network = `login:ip:${ip}`;
  await consumeRate(network, 50, 900);
  await consumeRate(pair, 5, 900);
  const { response, mustChangePassword } = await db.$transaction(async tx => {
    let user = await tx.user.findUnique({ where: { email: normalized } });
    if (user) {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      user = await tx.user.findUnique({ where: { id: user.id } });
    }
    const response = await createAuth(tx).api.signInEmail({ body: { email: normalized, password, rememberMe: true }, headers: requestHeaders, asResponse: true });
    if (!response.ok) {
      if (response.status < 500) throw new AppError("Email atau sandi tidak sesuai.", 401);
      throw new Error("Authentication failed.");
    }
    const account = user ? await tx.account.findUnique({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } }) : null;
    if (account?.password?.startsWith("scrypt$")) await tx.account.update({ where: { id: account.id }, data: { password: await hashPassword(password) } });
    await tx.rateLimit.deleteMany({ where: { key: pair } });
    await tx.rateLimit.updateMany({ where: { key: network, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
    return { response, mustChangePassword: user!.mustChangePassword };
  }, { timeout: 15000 });
  const jar = await cookies();
  parseSetCookieHeader(response.headers.get("set-cookie") ?? "").forEach((cookie, name) => jar.set(name, cookie.value, toCookieOptions(cookie)));
  return { mustChangePassword };
}
export async function logout() {
  const jar = await cookies();
  if (jar.get(sessionCookieName())) {
    const auth = createAuth();
    const headers = new Headers({ cookie: jar.toString() });
    const current = await auth.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
    const response = await auth.api.signOut({ headers, asResponse: true });
    if (!response.ok) throw new Error("Logout failed.");
    // Better Auth's sign-out is best effort; never report success while the session is still valid.
    if (current && await db.session.findUnique({ where: { id: current.session.id }, select: { id: true } })) throw new Error("Session revocation failed.");
    parseSetCookieHeader(response.headers.get("set-cookie") ?? "").forEach((cookie, name) => jar.set(name, cookie.value, toCookieOptions(cookie)));
  }
  jar.delete("jafa_session");
}
