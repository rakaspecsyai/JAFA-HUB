import "next/dist/server/node-environment.js";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";
import { NextRequest } from "next/server";
import { createRequestStoreForAPI } from "next/dist/server/async-storage/request-store.js";
import { createWorkStore } from "next/dist/server/async-storage/work-store.js";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external.js";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external.js";
import { getURLFromRedirectError } from "next/dist/client/components/redirect.js";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";
import { hashPassword, tokenHash, verifyPassword } from "../../src/lib/passwords";
import { credentialUser } from "../../src/lib/credentials";
import { payloadSchema } from "../../src/lib/content-types";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pdfFixture } from "../fixtures/pdf";

function withRequest<T>(headers: Headers, run: () => Promise<T>) {
  // shortcut: this request harness uses pinned Next internals; adapt it when upgrading Next and keep HTTP/browser checks separate.
  const request = new NextRequest("http://localhost:3000/api/auth/sign-in/email", { headers });
  const store = createRequestStoreForAPI(request, { pathname: request.nextUrl.pathname }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined);
  const work = createWorkStore({ page: "/api/auth/[...all]/route", renderOpts: { assetPrefix: "", cacheComponents: false, cacheLifeProfiles: { default: { stale: 0, revalidate: 0, expire: 60 } }, staticPageGenerationTimeout: 60, validationLevel: "warning", experimental: { authInterrupts: true, useCacheTimeout: 5000, durableUseCacheEntries: false }, waitUntil: undefined, onClose: () => {}, onAfterTaskError: undefined }, buildId: "test", deploymentId: "test", previouslyRevalidatedTags: [] });
  return workAsyncStorage.run(work, () => workUnitAsyncStorage.run(store, async () => ({ result: await run(), cookies: store.mutableCookies })));
}

export function registerSecurityTests(database: () => PrismaClient) {
  test("HTTP PDF memisahkan akses unggah/pratinjau/file dan menolak origin/sesi yang salah", async () => {
    const db = database(), auth = await import("../../src/lib/auth");
    const upload = (await import("../../src/app/api/documents/route")).POST;
    const metadata = (await import("../../src/app/api/documents/[id]/route")).GET;
    const download = (await import("../../src/app/api/documents/[id]/file/route")).GET;
    const directory = await mkdtemp(join(tmpdir(), "jafa-document-http-")), previousMedia = process.env.MEDIA_DIRECTORY;
    process.env.MEDIA_DIRECTORY = directory;
    try {
      const sessions = new Map<string, Headers>(), users: User[] = [];
      const password = "pdf-http-password-123", hash = await hashPassword(password);
      for (const role of ["editor", "approver", "admin"] as const) {
        const user = await db.user.create({ data: credentialUser({ name: "Petugas PDF fixture", email: `pdf-${randomUUID()}@uji.invalid`, role, mustChangePassword: false }, hash) }); users.push(user);
        const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
        sessions.set(role, new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(login.cookies.get(auth.sessionCookieName())!.value)}` }));
      }
      const send = (headers: Headers, origin = "http://localhost:3000") => {
        const body = new FormData(); body.set("file", new File([pdfFixture()], "fixture.pdf", { type: "application/pdf" }));
        return withRequest(headers, () => upload(new Request("http://localhost:3000/api/documents", { method: "POST", headers: { origin }, body })));
      };
      const before = await db.documentAsset.count();
      assert.equal((await send(new Headers())).result.status, 401);
      for (const role of ["admin", "approver"]) assert.equal((await send(sessions.get(role)!)).result.status, 403);
      assert.equal((await send(sessions.get("editor")!, "https://asing.invalid")).result.status, 403);
      assert.equal(await db.documentAsset.count(), before);
      const result = (await send(sessions.get("editor")!)).result; assert.equal(result.status, 201);
      const { id } = await result.json(), params = { params: Promise.resolve({ id }) };
      for (const headers of [new Headers(), sessions.get("admin")!]) {
        assert.equal((await withRequest(headers, () => metadata(new Request(`http://localhost:3000/api/documents/${id}`), params))).result.status, 404);
        assert.equal((await withRequest(headers, () => download(new Request(`http://localhost:3000/api/documents/${id}/file`), params))).result.status, 404);
      }
      for (const role of ["editor", "approver"]) {
        const response = (await withRequest(sessions.get(role)!, () => metadata(new Request(`http://localhost:3000/api/documents/${id}`), params))).result;
        assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
        const page = await response.json(); assert.equal(page.pageCount, 1); assert.equal(page.storageKey, undefined); assert.match(page.pages[0].text, /Pasal 1/);
        const file = (await withRequest(sessions.get(role)!, () => download(new Request(`http://localhost:3000/api/documents/${id}/file`), params))).result;
        assert.equal(file.status, 200); assert.match(file.headers.get("content-disposition")!, /^attachment;/); assert.match(file.headers.get("content-security-policy")!, /sandbox/);
        assert.deepEqual(Buffer.from(await file.arrayBuffer()), pdfFixture());
      }
      assert.equal((await withRequest(sessions.get("editor")!, () => metadata(new Request(`http://localhost:3000/api/documents/${id}?page=0`), params))).result.status, 400);
      await db.session.updateMany({ where: { userId: users[0].id }, data: { expiresAt: new Date(0) } });
      assert.equal((await withRequest(sessions.get("editor")!, () => download(new Request(`http://localhost:3000/api/documents/${id}/file`), params))).result.status, 404);
    } finally { if (previousMedia === undefined) delete process.env.MEDIA_DIRECTORY; else process.env.MEDIA_DIRECTORY = previousMedia; await rm(directory, { recursive: true, force: true }); }
  });
  test("Server Action CMS membedakan sesi, akses dan konflik tanpa menimpa revisi", async () => {
    const db = database();
    const auth = await import("../../src/lib/auth"), actions = await import("../../src/lib/admin-actions");
    const service = await import("../../src/lib/content-service");
    const password = "action-recovery-password-123", passwordHash = await hashPassword(password);
    const actors: User[] = [], sessions: Headers[] = [];
    for (const role of ["editor", "editor", "approver"] as const) {
      const user = await db.user.create({ data: credentialUser({ email: `recovery-${randomUUID()}@uji.invalid`, name: "Petugas pemulihan uji", role, mustChangePassword: false }, passwordHash) });
      actors.push(user);
      const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
      const cookie = login.cookies.get(auth.sessionCookieName())!;
      sessions.push(new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` }));
    }
    const input = { kind: "article", slug: `recovery-${randomUUID()}`, payload: payloadSchema.parse({ title: "Draf awal", summary: "Ringkasan", body: "Isi awal." }), reviewedOn: "2026-10-21", sources: [], professions: [] };
    const form = (data: unknown) => { const result = new FormData(); result.set("data", JSON.stringify(data)); return result; };
    const first = await service.saveDraft(actors[0], input);
    const latest = await service.saveDraft(actors[0], { ...input, ...first, payload: { ...input.payload, title: "Versi tersimpan" } });
    const snapshot = async () => ({
      item: await db.contentItem.findUniqueOrThrow({ where: { id: first.itemId } }),
      revisions: await db.contentRevision.findMany({ where: { itemId: first.itemId }, orderBy: { number: "asc" } }),
      search: await db.publishedSearchEntry.findUnique({ where: { itemId: first.itemId } }),
      audits: await db.auditEvent.count({ where: { objectId: first.itemId } })
    });
    const before = await snapshot(), currentInput = { ...input, ...latest, payload: { ...input.payload, title: "Masukan yang dipertahankan" } }, currentForm = form(currentInput);
    for (const [headers, status] of [[new Headers(), 401], [sessions[2], 403]] as const) {
      const result = (await withRequest(headers, () => actions.saveDraftAction({}, currentForm))).result;
      assert.equal(result.status, status); assert.equal(result.ok, undefined);
      assert.deepEqual(await snapshot(), before);
    }
    const stale = (await withRequest(sessions[1], () => actions.saveDraftAction({}, form({ ...input, ...first })))).result;
    assert.equal(stale.status, 409); assert.equal(stale.ok, undefined); assert.doesNotMatch(stale.message!, /Muat ulang/);
    const submit = new FormData();
    for (const [key, value] of Object.entries({ itemId: first.itemId, revisionId: first.revisionId, version: first.version })) submit.set(key, String(value));
    assert.equal((await withRequest(sessions[1], () => actions.submitAction({}, submit))).result.status, 409);
    assert.deepEqual(await snapshot(), before);
    await db.session.updateMany({ where: { userId: actors[1].id }, data: { expiresAt: new Date(0) } });
    assert.equal((await withRequest(sessions[1], () => actions.saveDraftAction({}, currentForm))).result.status, 401);
    assert.deepEqual(await snapshot(), before);
    const login = await withRequest(new Headers(), () => auth.authenticate(actors[1].email, password, new Headers()));
    const cookie = login.cookies.get(auth.sessionCookieName())!;
    const headers = new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` });
    const actor = (await withRequest(headers, () => auth.requireStaff(["editor"]))).result;
    const retried = await service.saveDraft(actor, currentInput);
    assert.equal(retried.version, latest.version + 1);
    assert.equal(payloadSchema.parse((await db.contentRevision.findUniqueOrThrow({ where: { id: retried.revisionId } })).payload).title, "Masukan yang dipertahankan");
    assert.equal(await db.publishedSearchEntry.findUnique({ where: { itemId: first.itemId } }), null);
  });

  test("login generik, batas akun/IP, dan jendela yang pulih diperiksa lewat autentikasi nyata", async () => {
    const db = database(); const { authenticate } = await import("../../src/lib/auth");
    const { clientKey, privateKey } = await import("../../src/lib/rate-limit");
    await db.rateLimit.deleteMany();
    const headers = new Headers(); const email = `login-${randomUUID()}@uji.invalid`;
    const password = "Sandi-sintetis-login-123";
    const user = await db.user.create({ data: credentialUser({ email, name: "Uji login", role: "editor", mustChangePassword: false }, await hashPassword(password)) });
    const invalid = { message: "Email atau sandi tidak sesuai.", status: 401 };
    await assert.rejects(authenticate("tidak-ada@uji.invalid", password, headers), invalid);
    for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(authenticate(email, "salah", headers), invalid);
    await assert.rejects(authenticate(email, password, headers), { status: 429 });
    const pair = `login:pair:${privateKey(`${email}:${clientKey(headers)}`)}`;
    await db.rateLimit.update({ where: { key: pair }, data: { expiresAt: new Date(0) } });
    await withRequest(headers, () => authenticate(email, password, headers));
    assert.equal(await db.rateLimit.findUnique({ where: { key: pair } }), null);
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    await assert.rejects(authenticate(email, password, headers), invalid);
    await db.rateLimit.upsert({ where: { key: `login:ip:${clientKey(headers)}` }, create: { key: `login:ip:${clientKey(headers)}`, count: 50, expiresAt: new Date(Date.now() + 900000) }, update: { count: 50 } });
    await assert.rejects(authenticate("akun-lain@uji.invalid", password, headers), { status: 429 });
    await db.rateLimit.deleteMany();
  });

  test("login meng-upgrade hash lama atomik serta membuat cookie dan sesi maksimal delapan jam", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const email = `legacy-${randomUUID()}@uji.invalid`; const password = "Sandi-sintetis-lama-123";
    const salt = randomBytes(16).toString("hex");
    const legacyHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
    const user = await db.user.create({ data: credentialUser({ email, name: "Uji hash lama", role: "editor", mustChangePassword: true }, legacyHash) });
    const before = Date.now(); const previous = process.env.NODE_ENV;
    const previousUrl = process.env.APP_URL;
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      process.env.APP_URL = "https://portal.example.invalid";
      const { result, cookies } = await withRequest(new Headers(), () => auth.authenticate(` ${email.toUpperCase()} `, password, new Headers()));
      assert.equal(result.mustChangePassword, true);
      const cookie = cookies.get(auth.sessionCookieName())!;
      const token = decodeURIComponent(cookie.value).split(".")[0];
      assert.ok(token.length >= 32 && cookie.value.includes("."));
      assert.equal(cookie.httpOnly, true); assert.equal(cookie.secure, true); assert.equal(cookie.sameSite, "lax");
      assert.equal(cookie.path, "/"); assert.equal(cookie.maxAge, 8 * 3600);
      const session = await db.session.findUniqueOrThrow({ where: { tokenHash: tokenHash(token) } });
      assert.notEqual(session.tokenHash, token);
      assert.equal(session.userId, user.id);
      assert.equal(session.ipAddress, null); assert.equal(session.userAgent, null);
      assert.ok(session.expiresAt.getTime() >= before + 8 * 3600_000 && session.expiresAt.getTime() <= Date.now() + 8 * 3600_000);
      const upgraded = await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } });
      assert.match(upgraded.password!, /^scrypt-16384-8-5\$/);
      assert.equal(await verifyPassword(password, upgraded.password!), true);
      const headers = new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` });
      await assert.rejects(withRequest(headers, () => auth.requireStaff(["editor"])), { status: 403 });
      assert.equal((await withRequest(headers, () => auth.requireStaff(["editor"], true))).result.id, user.id);
      await withRequest(headers, () => auth.logout());
      assert.equal(await db.session.findUnique({ where: { tokenHash: tokenHash(token) } }), null);
      assert.equal((await withRequest(headers, () => auth.getStaff())).result, null);
    } finally {
      if (previous === undefined) delete env.NODE_ENV; else env.NODE_ENV = previous;
      if (previousUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousUrl;
    }
  });

  test("sesi kedaluwarsa/dicabut/nonaktif dan peran yang salah menolak akses privat", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const password = "Sandi-sintetis-sesi-123";
    const user = await db.user.create({ data: credentialUser({ email: `session-${randomUUID()}@uji.invalid`, name: "Uji sesi", role: "editor", mustChangePassword: false }, await hashPassword(password)) });
    const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
    const cookie = login.cookies.get(auth.sessionCookieName())!;
    const headers = new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` });
    const session = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    assert.equal((await withRequest(headers, () => auth.getStaff())).result?.role, "editor");
    assert.equal((await db.session.findUniqueOrThrow({ where: { id: session.id } })).expiresAt.getTime(), session.expiresAt.getTime());
    await assert.rejects(withRequest(headers, () => auth.requireStaff(["approver"])), { status: 403 });
    await db.user.update({ where: { id: user.id }, data: { role: "approver" } });
    assert.equal((await withRequest(headers, () => auth.getStaff())).result?.role, "approver");
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    await assert.rejects(withRequest(headers, () => auth.requireStaff()), { status: 401 });
    await db.user.update({ where: { id: user.id }, data: { active: true } });
    await db.session.update({ where: { id: session.id }, data: { expiresAt: new Date(0) } });
    await assert.rejects(withRequest(headers, () => auth.requireStaff()), { status: 401 });
    await db.session.deleteMany({ where: { id: session.id } });
    assert.equal((await withRequest(headers, () => auth.getStaff())).result, null);
    assert.equal((await withRequest(new Headers({ cookie: `${auth.SESSION_COOKIE}=bukan-token` }), () => auth.getStaff())).result, null);
  });

  test("kegagalan membuat sesi membatalkan upgrade hash lama", async () => {
    const db = database(); const { authenticate } = await import("../../src/lib/auth");
    const password = "Sandi-sintetis-rollback-123"; const salt = randomBytes(16).toString("hex");
    const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
    const user = await db.user.create({ data: credentialUser({ email: `rollback-${randomUUID()}@uji.invalid`, name: "Uji rollback", role: "editor" }, passwordHash) });
    await db.$executeRawUnsafe(`CREATE FUNCTION reject_test_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test session failure'; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER test_session_failure BEFORE INSERT ON "Session" FOR EACH ROW EXECUTE FUNCTION reject_test_session()');
    try {
      await assert.rejects(withRequest(new Headers(), () => authenticate(user.email, password, new Headers())));
      assert.equal((await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } })).password, passwordHash);
      assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER test_session_failure ON "Session"');
      await db.$executeRawUnsafe("DROP FUNCTION reject_test_session()");
    }
  });

  test("cookie ditandatangani, hash sesi tidak dapat dipakai ulang, dan respons login tidak membocorkan token", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const { POST } = await import("../../src/app/api/auth/[...all]/route");
    const password = "signed-cookie-test-password-123";
    const user = await db.user.create({ data: credentialUser({ email: `signed-${randomUUID()}@uji.invalid`, name: "Uji cookie", role: "editor", mustChangePassword: false }, await hashPassword(password)) });
    const origin = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
    const request = new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: user.email, password }) });
    const login = await withRequest(request.headers, () => POST(request, { params: Promise.resolve({ all: ["sign-in", "email"] }) }));
    assert.equal(login.result.status, 200);
    assert.deepEqual(await login.result.json(), { ok: true, mustChangePassword: false });
    const cookie = login.cookies.get(auth.sessionCookieName())!;
    const session = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    const signature = decodeURIComponent(cookie.value).split(".")[1];
    for (const value of [`${cookie.value}x`, `${session.tokenHash}.${signature}`, session.tokenHash]) {
      assert.equal((await withRequest(new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(value)}` }), () => auth.getStaff())).result, null);
    }
    assert.ok(await db.session.findUnique({ where: { id: session.id } }));
  });

  test("logout tidak mengumumkan berhasil jika penghapusan sesi database gagal", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const password = "logout-failure-test-password-123";
    const user = await db.user.create({ data: credentialUser({ email: `logout-${randomUUID()}@uji.invalid`, name: "Uji logout", role: "editor", mustChangePassword: false }, await hashPassword(password)) });
    const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
    const cookie = login.cookies.get(auth.sessionCookieName())!;
    const headers = new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` });
    await db.$executeRawUnsafe("CREATE FUNCTION reject_session_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test logout failure'; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER test_logout_failure BEFORE DELETE ON "Session" FOR EACH ROW EXECUTE FUNCTION reject_session_delete()');
    try {
      await assert.rejects(withRequest(headers, () => auth.logout()), /Session revocation failed/);
      assert.equal(await db.session.count({ where: { userId: user.id } }), 1);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER test_logout_failure ON "Session"');
      await db.$executeRawUnsafe("DROP FUNCTION reject_session_delete()");
    }
    await withRequest(headers, () => auth.logout());
    assert.equal((await withRequest(headers, () => auth.getStaff())).result, null);
  });

  test("penggantian sandi Better Auth mencabut cookie lama dan hanya menerima sandi baru", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const { changePassword } = await import("../../src/lib/account-service");
    const oldPassword = "old-password-change-test-123", newPassword = "new-password-change-test-456";
    const user = await db.user.create({ data: credentialUser({ email: `password-${randomUUID()}@uji.invalid`, name: "Uji ganti sandi", role: "editor", mustChangePassword: false }, await hashPassword(oldPassword)) });
    const login = await withRequest(new Headers(), () => auth.authenticate(user.email, oldPassword, new Headers()));
    const cookie = login.cookies.get(auth.sessionCookieName())!;
    const headers = new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` });
    const { result: staff } = await withRequest(headers, () => auth.requireStaff());
    await changePassword(staff, oldPassword, newPassword);
    assert.equal((await withRequest(headers, () => auth.getStaff())).result, null);
    await assert.rejects(auth.authenticate(user.email, oldPassword, new Headers()), { status: 401 });
    assert.equal((await withRequest(new Headers(), () => auth.authenticate(user.email, newPassword, new Headers()))).result.mustChangePassword, false);
  });

  test("Server Action akun menolak akses dan nilai akses rusak tanpa menonaktifkan target", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const { userAction } = await import("../../src/lib/admin-actions");
    const password = "account-action-test-password-123", passwordHash = await hashPassword(password);
    const sessions = new Map<string, Headers>();
    const users = [];
    for (const role of ["editor", "approver", "admin"] as const) {
      const user = await db.user.create({ data: credentialUser({ email: `action-account-${role}-${randomUUID()}@uji.invalid`, name: `Petugas action akun ${role}`, role, mustChangePassword: false }, passwordHash) });
      users.push(user);
      const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
      const cookie = login.cookies.get(auth.sessionCookieName())!;
      sessions.set(role, new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` }));
    }
    const target = users[0], admin = users[2];
    const form = new FormData();
    for (const [key, value] of Object.entries({ operation: "update", userId: target.id, role: "editor", active: "true" })) form.set(key, value);
    const snapshot = async () => ({
      user: await db.user.findUniqueOrThrow({ where: { id: target.id } }),
      account: await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: target.id } } }),
      sessions: await db.session.findMany({ where: { userId: target.id }, orderBy: { id: "asc" } }),
      users: await db.user.count(), audits: await db.auditEvent.count()
    });
    const before = await snapshot();
    for (const headers of [new Headers(), sessions.get("editor")!, sessions.get("approver")!]) {
      const { result } = await withRequest(headers, () => userAction({}, form));
      assert.match(result.message!, /Sesi Anda berakhir|Peran Anda tidak memiliki akses/);
      assert.equal(result.ok, undefined); assert.equal(result.password, undefined);
      assert.deepEqual(await snapshot(), before);
    }
    for (const active of ["tidak-sah", "", new File(["false"], "active.txt"), undefined]) {
      if (active === undefined) form.delete("active"); else form.set("active", active);
      const { result } = await withRequest(sessions.get("admin")!, () => userAction({}, form));
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: target.id } })).active, true, "Masukan akses rusak tidak boleh menonaktifkan akun.");
      assert.deepEqual(result.fields, { active: "Pilih akses Aktif atau Nonaktif." });
      assert.equal(result.ok, undefined); assert.equal(result.password, undefined);
      assert.deepEqual(await snapshot(), before);
    }
    form.set("active", "true"); form.set("role", new File(["admin"], "role.txt"));
    assert.deepEqual((await withRequest(sessions.get("admin")!, () => userAction({}, form))).result.fields, { role: "Pilih peran Editor, Penyetuju, atau Admin akun." });
    form.set("role", "editor"); form.set("userId", "bukan-id");
    const malformed = (await withRequest(sessions.get("admin")!, () => userAction({}, form))).result;
    assert.equal(malformed.message, "Formulir akun tidak sesuai."); assert.equal(malformed.fields, undefined);
    assert.deepEqual(await snapshot(), before);
    form.set("userId", target.id);
    await db.session.deleteMany({ where: { userId: admin.id } });
    const revoked = (await withRequest(sessions.get("admin")!, () => userAction({}, form))).result;
    assert.match(revoked.message!, /Sesi Anda berakhir/); assert.equal(revoked.ok, undefined);
    assert.deepEqual(await snapshot(), before);
  });

  test("Server Action ganti sandi memvalidasi kolom dan tipe tanpa membocorkan atau mengubah kredensial saat ditolak", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const { passwordAction } = await import("../../src/lib/admin-actions");
    const password = "action-password-test-old-123", nextPassword = "action-password-test-new-456";
    const user = await db.user.create({ data: credentialUser({ email: `action-password-${randomUUID()}@uji.invalid`, name: "Petugas action sandi", role: "editor", mustChangePassword: true }, await hashPassword(password)) });
    const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
    const cookie = login.cookies.get(auth.sessionCookieName())!;
    const headers = new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` });
    const form = new FormData();
    for (const [key, value] of Object.entries({ current: password, password: nextPassword, confirm: nextPassword })) form.set(key, value);
    const snapshot = async () => ({
      user: await db.user.findUniqueOrThrow({ where: { id: user.id } }),
      account: await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } }),
      sessions: await db.session.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } }),
      audits: await db.auditEvent.count({ where: { objectId: user.id } })
    });
    const before = await snapshot();
    const anonymous = (await withRequest(new Headers(), () => passwordAction({}, form))).result;
    assert.match(anonymous.message!, /Sesi Anda berakhir/); assert.equal(anonymous.ok, undefined);
    form.set("confirm", "konfirmasi-berbeda-123");
    const mismatch = (await withRequest(headers, () => passwordAction({}, form))).result;
    assert.deepEqual(mismatch, { status: 400, message: "Konfirmasi sandi baru tidak sama.", fields: { confirm: "Konfirmasi sandi baru tidak sama." } });
    form.set("confirm", nextPassword);
    for (const field of ["current", "password", "confirm"]) {
      const original = form.get(field)!;
      form.set(field, new File(["masukan-sintetis"], "password.txt"));
      assert.deepEqual((await withRequest(headers, () => passwordAction({}, form))).result, { status: 400, message: "Formulir sandi tidak sesuai.", fields: undefined });
      form.set(field, original);
    }
    assert.deepEqual(await snapshot(), before);
    await assert.rejects(withRequest(headers, () => passwordAction({}, form)), error => {
      assert.ok(isRedirectError(error));
      assert.equal(getURLFromRedirectError(error), "/admin/login?changed=1");
      return true;
    });
    const after = await snapshot();
    assert.equal(after.user.mustChangePassword, false); assert.equal(after.sessions.length, 0);
    assert.equal(after.audits, before.audits + 1);
    assert.equal(await verifyPassword(nextPassword, after.account.password!), true);
    assert.equal(await verifyPassword(password, after.account.password!), false);
    const revoked = (await withRequest(headers, () => passwordAction({}, form))).result;
    assert.match(revoked.message!, /Sesi Anda berakhir/); assert.equal(revoked.ok, undefined);
    assert.deepEqual(await snapshot(), after);
  });

  test("Server Actions catatan memvalidasi FormData dan sesi tanpa mengubah konten yang ditolak", async () => {
    const db = database(); const auth = await import("../../src/lib/auth");
    const actions = await import("../../src/lib/admin-actions");
    const service = await import("../../src/lib/content-service");
    const password = "action-note-test-password-123", passwordHash = await hashPassword(password);
    const editor = await db.user.create({ data: credentialUser({ email: `action-editor-${randomUUID()}@uji.invalid`, name: "Editor catatan uji", role: "editor", mustChangePassword: false }, passwordHash) });
    const approver = await db.user.create({ data: credentialUser({ email: `action-approver-${randomUUID()}@uji.invalid`, name: "Penyetuju catatan uji", role: "approver", mustChangePassword: false }, passwordHash) });
    const admin = await db.user.create({ data: credentialUser({ email: `action-admin-${randomUUID()}@uji.invalid`, name: "Admin catatan uji", role: "admin", mustChangePassword: false }, passwordHash) });
    const sessions = new Map<string, Headers>();
    for (const user of [editor, approver, admin]) {
      const login = await withRequest(new Headers(), () => auth.authenticate(user.email, password, new Headers()));
      const cookie = login.cookies.get(auth.sessionCookieName())!;
      sessions.set(user.id, new Headers({ cookie: `${auth.sessionCookieName()}=${encodeURIComponent(cookie.value)}` }));
    }
    const saved = await service.saveDraft(editor, {
      kind: "article", slug: `action-note-${randomUUID()}`,
      payload: payloadSchema.parse({ title: "Artikel catatan uji", summary: "Ringkasan catatan uji.", body: "Isi materi catatan uji." }),
      reviewedOn: "2026-10-21", professions: ["pp"],
      sources: [{ title: "Sumber catatan uji", url: "https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023", reviewedOn: "2026-10-21" }]
    });
    await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
    const decision = new FormData(), withdraw = new FormData();
    for (const [key, value] of Object.entries({ itemId: saved.itemId, revisionId: saved.revisionId, version: String(saved.version + 1), decision: "return", note: "Catatan uji." })) decision.set(key, value);
    for (const [key, value] of Object.entries({ itemId: saved.itemId, publishedRevisionId: saved.revisionId, archive: "on", note: "Catatan uji." })) withdraw.set(key, value);
    const snapshot = async () => ({
      item: await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } }),
      revision: await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } }),
      search: await db.publishedSearchEntry.findUnique({ where: { itemId: saved.itemId } }),
      audits: await db.auditEvent.count({ where: { objectId: saved.itemId } })
    });
    const submitted = await snapshot();
    for (const [action, input] of [[actions.decisionAction, decision], [actions.withdrawAction, withdraw]] as const) {
      for (const [headers, message, status] of [
        [new Headers(), "Sesi Anda berakhir. Silakan masuk kembali.", 401],
        [sessions.get(editor.id)!, "Peran Anda tidak memiliki akses untuk tindakan ini.", 403],
        [sessions.get(admin.id)!, "Peran Anda tidak memiliki akses untuk tindakan ini.", 403]
      ] as const) {
        const { result } = await withRequest(headers, () => action({}, input));
        assert.equal(result.message, message);
        assert.equal(result.status, status);
        assert.equal(result.ok, undefined); assert.equal(result.fields, undefined);
      }
      const approverHeaders = sessions.get(approver.id)!;
      const invalidForm = input === decision ? "Keputusan atau identitas revisi tidak sesuai." : "Isi alasan penarikan dan periksa identitas konten.";
      input.set("note", new File(["Catatan uji."], "note.txt"));
      assert.deepEqual((await withRequest(approverHeaders, () => action({}, input))).result, { status: 400, message: invalidForm, fields: undefined });
      input.set("note", "Catatan uji."); input.set("itemId", "bukan-uuid");
      assert.deepEqual((await withRequest(approverHeaders, () => action({}, input))).result, { status: 400, message: invalidForm, fields: undefined });
      input.set("itemId", saved.itemId);
    }
    for (const note of ["", " \t\n", "x".repeat(2001)]) {
      decision.set("note", note);
      const { result } = await withRequest(sessions.get(approver.id)!, () => actions.decisionAction({}, decision));
      assert.match(result.message!, /Pengembalian memerlukan catatan|Catatan keputusan maksimal/);
      assert.deepEqual(result.fields, { note: result.message }); assert.equal(result.ok, undefined);
    }
    assert.deepEqual(await snapshot(), submitted);

    await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Catatan uji.");
    const published = await snapshot();
    for (const note of ["", " \t\n", "x".repeat(2001)]) {
      withdraw.set("note", note);
      const { result } = await withRequest(sessions.get(approver.id)!, () => actions.withdrawAction({}, withdraw));
      assert.equal(result.message, "Isi alasan penarikan, maksimal 2.000 karakter.");
      assert.deepEqual(result.fields, { note: result.message }); assert.equal(result.ok, undefined);
    }
    assert.deepEqual(await snapshot(), published);
    await db.session.deleteMany({ where: { userId: approver.id } });
    const { result } = await withRequest(sessions.get(approver.id)!, () => actions.withdrawAction({}, withdraw));
    assert.match(result.message!, /Sesi Anda berakhir/); assert.equal(result.fields, undefined);
    assert.deepEqual(await snapshot(), published);
  });

  test("handler auth menolak registrasi dan origin lintas situs tanpa membuka sesi", async () => {
    const db = database(); const { POST } = await import("../../src/app/api/auth/[...all]/route");
    const previous = process.env.APP_URL; process.env.APP_URL = "https://portal.example.invalid";
    try {
      const before = await db.session.count();
      const request = (origin: string) => new Request("https://portal.example.invalid/api/auth/sign-up/email", { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
      const blocked = await POST(request("https://evil.invalid"), { params: Promise.resolve({ all: ["sign-in", "email"] }) });
      assert.equal(blocked.status, 403);
      const registration = await POST(request("https://portal.example.invalid"), { params: Promise.resolve({ all: ["sign-up", "email"] }) });
      assert.equal(registration.status, 403); assert.match((await registration.json()).error, /Registrasi publik/);
      const unknown = await POST(request("https://portal.example.invalid"), { params: Promise.resolve({ all: ["reset-password"] }) });
      assert.equal(unknown.status, 404);
      const recovery = await POST(request("https://portal.example.invalid"), { params: Promise.resolve({ all: ["recover-admin"] }) });
      assert.equal(recovery.status, 404);
      const { createAuth } = await import("../../src/lib/better-auth");
      const userCount = await db.user.count();
      const directSignUp = await createAuth().api.signUpEmail({ body: { email: "signup-rejected@uji.invalid", name: "Registrasi uji", password: "signup-rejected-test-password" }, asResponse: true });
      assert.notEqual(directSignUp.status, 200);
      assert.equal(await db.user.count(), userCount);
      assert.equal(registration.headers.get("cache-control"), "no-store");
      assert.equal(await db.session.count(), before);
    } finally { if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous; }
  });
}
