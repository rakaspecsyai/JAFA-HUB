import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createMemoryPool } from "./memory-pool";
import type { DraftInput } from "../../src/lib/content-service";
import { payloadSchema, type Payload, type Staff } from "../../src/lib/content-types";
import { initialContent } from "../../src/lib/fixtures";
import { hashPassword, verifyPassword } from "../../src/lib/passwords";
import { credentialUser } from "../../src/lib/credentials";
import { applyLocalMigrations } from "../../scripts/local-migrations";
import { createLocalDatabase } from "../../src/lib/local-db";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerSecurityTests } from "./security";
import { AppError, publicError } from "../../src/lib/errors";
import { pdfFixture } from "../fixtures/pdf";

let memory: Awaited<ReturnType<typeof createMemoryPool>>;
let db: PrismaClient;
let service: typeof import("../../src/lib/content-service");
let repository: typeof import("../../src/lib/repository");
let accounts: typeof import("../../src/lib/account-service");
let media: typeof import("../../src/lib/media");
let editor: Staff, approver: Staff, admin: Staff;
before(async () => {
  process.env.JAFA_CONTENT_PREVIEW = "false";
  process.env.AUTH_RATE_LIMIT_KEY = "integration-test-only-isolated-key";
  process.env.BETTER_AUTH_SECRET = "integration-test-only-better-auth-secret";
  memory = await createMemoryPool();
  await applyLocalMigrations(memory.engine);
  await applyLocalMigrations(memory.engine);
  assert.equal((await memory.engine.query('SELECT * FROM "_prisma_migrations"')).rows.length, 3);
  db = new PrismaClient({ adapter: new PrismaPg(memory.pool) });
  (globalThis as unknown as { jafaDb: PrismaClient }).jafaDb = db;
  const passwordHash = await hashPassword("integration-password-123");
  for (const role of ["editor", "approver", "admin"] as const) {
    const user = await db.user.create({ data: credentialUser({ name: `Petugas ${role}`, email: `${role}@uji.invalid`, role, mustChangePassword: false }, passwordHash) });
    const staff = { id: user.id, name: user.name, email: user.email, role, mustChangePassword: false };
    if (role === "editor") editor = staff; else if (role === "approver") approver = staff; else admin = staff;
  }
  service = await import("../../src/lib/content-service"); repository = await import("../../src/lib/repository");
  accounts = await import("../../src/lib/account-service"); media = await import("../../src/lib/media");
});
after(async () => { if (db) await db.$disconnect(); if (memory) { await memory.pool.end(); await memory.engine.close(); } });
const draft = (overrides: Partial<DraftInput> = {}): DraftInput => ({ kind: "article", slug: `uji-${randomUUID()}`, payload: payloadSchema.parse({ title: "Artikel penilaian publik", summary: "Ringkasan penilaian aset", body: "Isi materi penilaian aset." }), reviewedOn: "2026-10-21", professions: ["pp"], sources: [{ title: "PMK 132 Tahun 2023", url: "https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023", reviewedOn: "2026-10-21" }], ...overrides });

test("alur revisi lengkap, pembatasan peran, konflik, proyeksi, dan penarikan", async () => {
  const input = draft(); const saved = await service.saveDraft(editor, input);
  assert.equal(await repository.getPublished("article", input.slug), null);
  await assert.rejects(service.saveDraft(admin, input), /Peran/);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await assert.rejects(service.saveDraft(editor, { ...input, ...saved, version: saved.version + 1 }), /sedang diperiksa/);
  await assert.rejects(service.reviewRevision(editor, saved.itemId, saved.revisionId, 2, "publish", ""), /Peran/);
  await assert.rejects(service.reviewRevision(admin, saved.itemId, saved.revisionId, 2, "publish", ""), /Peran/);
  await assert.rejects(service.reviewRevision(approver, saved.itemId, saved.revisionId, 2, "return", ""), /catatan/);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, 2, "return", "Lengkapi isi.");
  const revised = await service.saveDraft(editor, { ...input, ...saved, version: 3 });
  await assert.rejects(service.saveDraft(editor, { ...input, ...saved, version: 3 }), /Versi ini/);
  await service.submitRevision(editor, revised.itemId, revised.revisionId, revised.version);
  await service.reviewRevision(approver, revised.itemId, revised.revisionId, revised.version + 1, "publish", "Sumber diperiksa.");
  assert.equal((await repository.getPublished("article", input.slug))?.payload.title, input.payload.title);
  assert.equal((await repository.searchPublished("PENILAIAN aset")).total, 1);
  const approved = await db.contentRevision.findUniqueOrThrow({ where: { id: revised.revisionId } });
  const next = await service.saveDraft(editor, { ...input, ...revised, version: approved.version, payload: { ...input.payload, title: "Judul rahasia draf" } });
  assert.notEqual(next.revisionId, revised.revisionId);
  assert.equal((await repository.getPublished("article", input.slug))?.payload.title, input.payload.title);
  assert.equal((await repository.searchPublished("rahasia")).total, 0);
  await assert.rejects(service.saveDraft(editor, { ...input, ...next, slug: "slug-berubah" }), /dikunci/);
  await service.withdrawContent(approver, saved.itemId, revised.revisionId, "Tinjauan ulang.");
  assert.equal(await repository.getPublished("article", input.slug), null);
  assert.equal((await repository.searchPublished("penilaian")).total, 0);
  assert.ok(await db.auditEvent.count({ where: { objectId: saved.itemId } }) >= 8);
});

for (const kind of ["profession", "regulation"] as const) test(`validasi ${kind} menunjuk kolom tanpa mengubah revisi, publikasi, atau audit`, async () => {
  const fixture = initialContent.find(item => item.kind === kind)!;
  const input = draft({ kind, slug: `validasi-${randomUUID()}`, payload: fixture.payload, reviewedOn: fixture.reviewedOn, sources: fixture.sources, professions: fixture.professions as DraftInput["professions"] });
  if (kind === "profession") input.itemId = (await db.contentItem.create({ data: { kind, slug: input.slug } })).id;
  let saved = await service.saveDraft(editor, input);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Fixture validasi kolom.");
  saved.version = (await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } })).version;
  const published = await repository.getPublished(kind, input.slug);
  const patches: Partial<Payload>[] = kind === "profession" ? [
    { definition: "", category: "", grades: [], tasks: [], competencies: [], nomenclature: "" },
    { definition: "" }, { category: "" }, { grades: [] }, { tasks: [] }, { competencies: [] }, { nomenclature: "" },
    { grades: [" "] }, { tasks: ["Tugas sah", "\t"] }, { competencies: [""] }, { body: "", definition: "" }
  ] : [
    { number: "", year: "", publisher: "", officialUrl: "", statusNote: "" },
    { number: "" }, { year: "202" }, { year: "20x6" }, { publisher: "" },
    { officialUrl: "https://go.id.example.invalid/aturan" }, { officialUrl: "http://jdih.kemenkeu.go.id/aturan" }, { statusNote: "" }
  ];
  for (const patch of patches) {
    saved = await service.saveDraft(editor, { ...input, ...saved, payload: { ...input.payload, ...patch } });
    const snapshot = async () => ({
      item: await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } }),
      revision: await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } }),
      search: await db.publishedSearchEntry.findUnique({ where: { itemId: saved.itemId } }),
      contributors: await db.revisionContributor.findMany({ where: { revisionId: saved.revisionId }, orderBy: { userId: "asc" } }),
      audits: await db.auditEvent.count({ where: { objectId: saved.itemId } })
    });
    const before = await snapshot();
    await assert.rejects(service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version), error => {
      assert.ok(error instanceof AppError); assert.equal(error.status, 400);
      assert.deepEqual(Object.keys(publicError(error).fields ?? {}).sort(), Object.keys(patch).sort());
      return true;
    });
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(await repository.getPublished(kind, input.slug), published);
  }
  saved = await service.saveDraft(editor, { ...input, ...saved });
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  assert.deepEqual(await repository.getPublished(kind, input.slug), published);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Koreksi fixture diperiksa.");
  assert.equal((await repository.getPublished(kind, input.slug))?.revisionId, saved.revisionId);
});

test("tautan FAQ yang ditolak menunjuk kolom tanpa mengubah draf atau versi publik", async () => {
  const links = [{ label: "Profil jabatan", href: "/informasi/pelelang" }, { label: "Sumber resmi", href: "https://jdih.kemenkeu.go.id/" }];
  const input = draft({ kind: "faq", professions: [], payload: payloadSchema.parse({ title: "Pertanyaan tautan", summary: "Ringkasan", body: "Jawaban terkurasi.", relatedLinks: links }) });
  const saved = await service.saveDraft(editor, input);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Fixture tautan FAQ.");
  saved.version = (await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } })).version;
  const snapshot = async () => ({
    item: await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } }),
    revisions: await db.contentRevision.findMany({ where: { itemId: saved.itemId }, orderBy: { number: "asc" }, include: { sources: true, professions: true, media: true, contributors: true } }),
    search: await db.publishedSearchEntry.findUnique({ where: { itemId: saved.itemId } }),
    audits: await db.auditEvent.count({ where: { objectId: saved.itemId } })
  });
  const before = await snapshot();
  for (const href of ["javascript:alert(1)", "data:text/html,x", "//example.invalid", "/\\example.invalid", "http://example.invalid", "https://u:p@example.invalid"]) {
    const payload = { ...input.payload, relatedLinks: [links[0], { label: "Tautan yang ditolak", href }] };
    const invalidLinks = (error: unknown) => {
      assert.ok(error instanceof AppError); assert.equal(error.status, 400);
      assert.deepEqual(publicError(error).fields, { relatedLinks: "Tautan terkait harus berupa path lokal atau HTTPS." });
      return true;
    };
    await assert.rejects(service.saveDraft(editor, { ...input, ...saved, payload }), invalidLinks);
    assert.throws(() => service.validateForPublication("faq", payload, input.reviewedOn, input.sources, []), invalidLinks);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual((await repository.getPublished("faq", input.slug))?.payload.relatedLinks, links);
  }
  assert.throws(() => service.validateForPublication("faq", { ...input.payload, body: "", relatedLinks: [{ label: "Ditolak", href: "javascript:alert(1)" }] }, input.reviewedOn, input.sources, []), error => {
    assert.ok(error instanceof AppError);
    assert.deepEqual(error.fields, { body: "Isi konten belum lengkap.", relatedLinks: "Tautan terkait harus berupa path lokal atau HTTPS." });
    return true;
  });
  const corrected = await service.saveDraft(editor, { ...input, ...saved });
  assert.notEqual(corrected.revisionId, saved.revisionId);
  await service.submitRevision(editor, corrected.itemId, corrected.revisionId, corrected.version);
  assert.deepEqual((await repository.getPublished("faq", input.slug))?.payload.relatedLinks, links);
  await service.reviewRevision(approver, corrected.itemId, corrected.revisionId, corrected.version + 1, "publish", "Koreksi fixture tautan.");
  assert.equal((await repository.getPublished("faq", input.slug))?.revisionId, corrected.revisionId);
});

test("filter CMS hanya memakai judul, status dan bidang revisi terbaru", async () => {
  const { listWorkingContent } = await import("../../src/lib/admin-repository");
  const token = randomUUID();
  const input = draft({ payload: payloadSchema.parse({ title: `Histori ${token}`, summary: "Ringkasan", body: "Isi." }) });
  const first = await service.saveDraft(editor, input);
  await service.submitRevision(editor, first.itemId, first.revisionId, first.version);
  await service.reviewRevision(approver, first.itemId, first.revisionId, first.version + 1, "publish", "Fixture daftar CMS.");
  const approved = await db.contentRevision.findUniqueOrThrow({ where: { id: first.revisionId } });
  const next = await service.saveDraft(editor, { ...input, ...first, version: approved.version, professions: ["plb"], payload: { ...input.payload, title: `Kerja ${token}` } });
  assert.equal((await listWorkingContent("article", { q: token, status: "approved" })).total, 0);
  assert.equal((await listWorkingContent("article", { q: `Histori ${token}` })).total, 0);
  assert.equal((await listWorkingContent("article", { q: token, jf: "pp" })).total, 0);
  const latest = await listWorkingContent("article", { q: `kERJa ${token}`, status: "draft", jf: "plb" });
  assert.equal(latest.total, 1); assert.equal(latest.items[0].revisions[0].id, next.revisionId);
  assert.equal((await listWorkingContent("article", { q: `${token}' OR '1'='1` })).total, 0);
  assert.equal((await repository.getPublished("article", input.slug))?.payload.title, input.payload.title);
});

test("paginasi CMS stabil ketika waktu perubahan sama dan halaman melampaui hasil", async () => {
  const { listWorkingContent } = await import("../../src/lib/admin-repository");
  const token = randomUUID(), ids: string[] = [];
  for (let n = 0; n < 21; n++) ids.push((await service.saveDraft(editor, draft({ payload: payloadSchema.parse({ title: `Paginasi ${token} ${n}`, summary: "Ringkasan", body: "Isi." }) }))).itemId);
  await db.contentItem.updateMany({ where: { id: { in: ids } }, data: { updatedAt: new Date("2026-10-21T00:00:00Z") } });
  const first = await listWorkingContent("article", { q: token, status: "draft", page: 1 });
  const second = await listWorkingContent("article", { q: token, status: "draft", page: 2 });
  const empty = await listWorkingContent("article", { q: token, page: 3 });
  assert.equal(first.total, 21); assert.equal(second.total, 21); assert.equal(empty.total, 21);
  assert.deepEqual(first.items.map(item => item.id), ids.sort().slice(0, 20));
  assert.deepEqual(second.items.map(item => item.id), ids.slice(20));
  assert.deepEqual(empty.items, []);
});

test("kanal kontak tersimpan melalui revisi dan hanya berubah publik setelah persetujuan", async () => {
  const slug = `kontak-${randomUUID()}`;
  const item = await db.contentItem.create({ data: { kind: "page", slug } });
  const channels: Payload["contactChannels"] = [
    { type: "url", label: "Situs fixture", value: "https://uji.invalid/kontak" },
    { type: "email", label: "Email fixture", value: "layanan@uji.invalid" },
    { type: "phone", label: "Telepon fixture", value: "+1 (202) 555-0143" }
  ];
  const input = draft({ itemId: item.id, kind: "page", slug, professions: [], sources: [], payload: payloadSchema.parse({ title: "Kontak fixture", summary: "Ringkasan", body: "Data sintetis, bukan kontak instansi.", contactChannels: channels, serviceHours: "Jam fixture" }) });
  let saved = await service.saveDraft(editor, input);
  assert.equal(await repository.getPublished("page", slug), null);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Kontak sintetis untuk pengujian.");
  saved.version = (await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } })).version;
  const published = await repository.getPublished("page", slug);
  assert.deepEqual(published?.payload.contactChannels, channels); assert.equal(published?.payload.serviceHours, "Jam fixture");
  const snapshot = async () => ({
    item: await db.contentItem.findUnique({ where: { id: item.id } }),
    revisions: await db.contentRevision.findMany({ where: { itemId: item.id }, orderBy: { number: "asc" } }),
    search: await db.publishedSearchEntry.findUnique({ where: { itemId: item.id } }),
    audits: await db.auditEvent.count({ where: { objectId: item.id } })
  });
  const before = await snapshot();
  for (const channel of [{ type: "url", value: "javascript:alert(1)" }, { type: "email", value: "a@uji.invalid\r\nBcc:b@uji.invalid" }, { type: "phone", value: "123?x=1" }] as const) {
    await assert.rejects(service.saveDraft(editor, { ...input, ...saved, payload: { ...input.payload, contactChannels: [{ ...channel, label: "Ditolak" }] } }), error => {
      assert.ok(error instanceof AppError); assert.equal(error.status, 400);
      assert.ok(error.fields?.contactChannels); return true;
    });
    assert.deepEqual(await snapshot(), before);
  }
  saved = await service.saveDraft(editor, { ...input, ...saved, payload: { ...input.payload, contactChannels: [{ type: "email", label: "", value: "" }] } });
  const incomplete = await snapshot();
  await assert.rejects(service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version), error => { assert.ok(error instanceof AppError); assert.ok(error.fields?.contactChannels); return true; });
  assert.deepEqual(await snapshot(), incomplete); assert.deepEqual(await repository.getPublished("page", slug), published);
  const revised = [{ type: "email" as const, label: "Email baru fixture", value: "baru@uji.invalid" }];
  saved = await service.saveDraft(editor, { ...input, ...saved, payload: { ...input.payload, contactChannels: revised, serviceHours: "Jam baru fixture" } });
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  assert.deepEqual(await repository.getPublished("page", slug), published);
  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Revisi kontak sintetis.");
  assert.deepEqual((await repository.getPublished("page", slug))?.payload.contactChannels, revised);
  await service.withdrawContent(approver, item.id, saved.revisionId, "Akhir uji kontak.");
  assert.equal(await repository.getPublished("page", slug), null);
});

test("tidak boleh menyetujui revisi sendiri setelah peran berubah", async () => {
  const input = draft(); const saved = await service.saveDraft(editor, input);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await db.user.update({ where: { id: editor.id }, data: { role: "approver" } });
  try { await assert.rejects(service.reviewRevision({ ...editor, role: "approver" }, saved.itemId, saved.revisionId, 2, "publish", ""), /sendiri/); }
  finally { await db.user.update({ where: { id: editor.id }, data: { role: "editor" } }); }
});

test("catatan keputusan dan penarikan yang tidak sah menandai kolom tanpa mengubah publikasi", async () => {
  const input = draft(); const saved = await service.saveDraft(editor, input);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  const snapshot = async () => ({
    item: await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } }),
    revision: await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } }),
    search: await db.publishedSearchEntry.findUnique({ where: { itemId: saved.itemId } }),
    audits: await db.auditEvent.count({ where: { objectId: saved.itemId } })
  });
  const invalidNote = (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 400);
    assert.deepEqual(publicError(error).fields, { note: error.message });
    return true;
  };
  const submitted = await snapshot();
  for (const note of ["", " \t\n", "x".repeat(2001)]) {
    await assert.rejects(service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "return", note), invalidNote);
  }
  await assert.rejects(service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "x".repeat(2001)), invalidNote);
  assert.deepEqual(await snapshot(), submitted);

  await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "x".repeat(2000));
  const published = await snapshot();
  assert.equal(published.item.publishedRevisionId, saved.revisionId);
  assert.equal(published.revision.note.length, 2000);
  for (const note of ["", " \t\n", "x".repeat(2001)]) {
    await assert.rejects(service.withdrawContent(approver, saved.itemId, saved.revisionId, note, true), invalidNote);
  }
  assert.deepEqual(await snapshot(), published);
  await service.withdrawContent(approver, saved.itemId, saved.revisionId, "x".repeat(2000));
  assert.equal((await snapshot()).item.publishedRevisionId, null);
});

test("setiap kontributor dilarang memberi keputusan, termasuk setelah penyunting lain mengajukan", async () => {
  const user = await db.user.create({ data: credentialUser({ name: "Kontributor uji", email: `contributor-${randomUUID()}@uji.invalid`, role: "editor", mustChangePassword: false }, await hashPassword("contributor-test-password-123")) });
  const contributor: Staff = { id: user.id, name: user.name, email: user.email, role: "editor", mustChangePassword: false };
  const input = draft();
  const first = await service.saveDraft(editor, input);
  const edited = await service.saveDraft(contributor, { ...input, ...first });
  const latest = await service.saveDraft(editor, { ...input, ...edited });
  assert.equal(await db.revisionContributor.count({ where: { revisionId: latest.revisionId } }), 2);
  await service.submitRevision(editor, latest.itemId, latest.revisionId, latest.version);
  await accounts.manageUser(admin, { operation: "update", userId: contributor.id, role: "approver", active: true });
  for (const decision of ["publish", "return"] as const) await assert.rejects(service.reviewRevision({ ...contributor, role: "approver" }, latest.itemId, latest.revisionId, latest.version + 1, decision, "Uji pemisahan peran"), /kontributor.*sendiri/);
  await service.reviewRevision(approver, latest.itemId, latest.revisionId, latest.version + 1, "publish", "Pemeriksa independen.");
  const approved = await db.contentRevision.findUniqueOrThrow({ where: { id: latest.revisionId } });
  const next = await service.saveDraft(editor, { ...input, ...latest, version: approved.version });
  assert.equal(await db.revisionContributor.count({ where: { revisionId: next.revisionId } }), 1);
  await service.submitRevision(editor, next.itemId, next.revisionId, next.version);
  await service.reviewRevision({ ...contributor, role: "approver" }, next.itemId, next.revisionId, next.version + 1, "publish", "Tidak berkontribusi pada revisi baru.");
});

test("gagal audit membatalkan penerbitan dan proyeksi", async () => {
  const input = draft(); const saved = await service.saveDraft(editor, input);
  await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
  await memory.engine.exec(`CREATE FUNCTION reject_publication_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'content.publish' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_audit_failure BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_publication_audit();`);
  try {
    await assert.rejects(service.reviewRevision(approver, saved.itemId, saved.revisionId, 2, "publish", ""));
    assert.equal((await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } })).status, "submitted");
    assert.equal((await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } })).publishedRevisionId, null);
    assert.equal(await db.publishedSearchEntry.findUnique({ where: { itemId: saved.itemId } }), null);
  } finally { await memory.engine.exec('DROP TRIGGER test_audit_failure ON "AuditEvent"; DROP FUNCTION reject_publication_audit();'); }
});

test("media tetap publik hanya selama ada revisi terbit yang merujuk", async () => {
  const asset = await db.mediaAsset.create({ data: { storageKey: `${"a".repeat(48)}.webp`, mime: "image/webp", size: 40, width: 8, height: 8, attribution: "Uji", uploadedBy: editor.id } });
  const input = draft({ kind: "faq", professions: [], payload: payloadSchema.parse({ title: "FAQ media terkurasi", summary: "Uji", body: "Jawaban yang sama di seluruh portal.", image: `/api/media/${asset.id}`, imageAlt: "Uji", imageCredit: "Uji" }) });
  const first = await service.saveDraft(editor, input);
  assert.equal(await media.publicMedia(asset.id), false);
  await service.submitRevision(editor, first.itemId, first.revisionId, 1); await service.reviewRevision(approver, first.itemId, first.revisionId, 2, "publish", "");
  const second = await service.saveDraft(editor, { ...input, slug: `${input.slug}-kedua` });
  await service.submitRevision(editor, second.itemId, second.revisionId, 1); await service.reviewRevision(approver, second.itemId, second.revisionId, 2, "publish", "");
  assert.equal(await media.publicMedia(asset.id), true);
  const faqs = await repository.allPublishedFaq(); assert.ok(repository.matchFaq(faqs, "FAQ media terkurasi").length);
  await service.withdrawContent(approver, first.itemId, first.revisionId, "Tarik pertama"); assert.equal(await media.publicMedia(asset.id), true);
  await service.withdrawContent(approver, second.itemId, second.revisionId, "Tarik kedua"); assert.equal(await media.publicMedia(asset.id), false);
  assert.equal(repository.matchFaq(await repository.allPublishedFaq(), "FAQ media terkurasi").length, 0);
});

test("admin terakhir dilindungi dan reset/perubahan peran mencabut sesi", async () => {
  await assert.rejects(accounts.manageUser(admin, { operation: "update", userId: admin.id, role: "editor", active: true }), /terakhir/);
  await assert.rejects(accounts.manageUser(editor, { operation: "create", name: "Petugas", email: "baru@uji.invalid", role: "editor" }), /Peran/);
  const created = await accounts.manageUser(admin, { operation: "create", name: "Petugas baru", email: "baru@uji.invalid", role: "editor" }); assert.ok(created.password && created.password.length >= 12);
  const user = await db.user.findUniqueOrThrow({ where: { email: "baru@uji.invalid" } }); assert.equal(user.mustChangePassword, true);
  await db.session.create({ data: { tokenHash: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + 60000) } });
  await accounts.manageUser(admin, { operation: "reset", userId: user.id }); assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
  await db.session.create({ data: { tokenHash: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + 60000) } });
  await accounts.manageUser(admin, { operation: "update", userId: user.id, role: "approver", active: false }); assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
});

test("validasi akun menunjuk kolom tanpa mengubah pengguna, kredensial, sesi, atau audit", async () => {
  const create = { operation: "create", name: "Petugas validasi akun", email: `account-validation-${randomUUID()}@uji.invalid`, role: "editor" };
  const update = { operation: "update", userId: editor.id, role: "editor", active: true };
  const snapshot = async () => ({
    users: await db.user.findMany({ orderBy: { id: "asc" } }),
    accounts: await db.account.findMany({ orderBy: { id: "asc" } }),
    sessions: await db.session.findMany({ orderBy: { id: "asc" } }),
    audits: await db.auditEvent.count()
  });
  const before = await snapshot();
  for (const [input, fields, status] of [
    [{ ...create, name: "  " }, ["name"], 400],
    [{ ...create, name: "x" }, ["name"], 400],
    [{ ...create, name: "x".repeat(101) }, ["name"], 400],
    [{ ...create, email: "bukan-email" }, ["email"], 400],
    [{ ...create, email: "x".repeat(255) + "@uji.invalid" }, ["email"], 400],
    [{ ...create, name: new File(["nama"], "name.txt"), email: new File(["email"], "email.txt"), role: "owner" }, ["name", "email", "role"], 400],
    [{ ...create, email: admin.email.toUpperCase() }, ["email"], 409],
    [{ ...update, role: "owner", active: "true" }, ["role", "active"], 400],
    [{ ...update, userId: "bukan-id" }, [], 400],
    [{ operation: "reset", userId: new File(["id"], "id.txt") }, [], 400],
    [{ operation: "reset", userId: randomUUID() }, [], 404],
    [{ operation: "delete", userId: editor.id }, [], 400]
  ] as const) {
    await assert.rejects(accounts.manageUser(admin, input), error => {
      assert.ok(error instanceof AppError); assert.equal(error.status, status);
      assert.deepEqual(Object.keys(publicError(error).fields ?? {}).sort(), [...fields].sort());
      return true;
    });
    assert.deepEqual(await snapshot(), before);
  }
});

test("penolakan admin aktif terakhir menandai pilihan penyebab tanpa mencabut sesi", async () => {
  assert.equal(await db.user.count({ where: { role: "admin", active: true } }), 1);
  await db.session.create({ data: { userId: admin.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
  const snapshot = async () => ({
    user: await db.user.findUniqueOrThrow({ where: { id: admin.id } }),
    account: await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: admin.id } } }),
    sessions: await db.session.findMany({ where: { userId: admin.id }, orderBy: { id: "asc" } }),
    audits: await db.auditEvent.count()
  });
  const before = await snapshot();
  for (const [role, active, fields] of [["editor", true, ["role"]], ["admin", false, ["active"]], ["approver", false, ["role", "active"]]] as const) {
    await assert.rejects(accounts.manageUser(admin, { operation: "update", userId: admin.id, role, active }), error => {
      assert.ok(error instanceof AppError); assert.equal(error.status, 409);
      assert.deepEqual(publicError(error).fields, Object.fromEntries(fields.map(field => [field, error.message])));
      return true;
    });
    assert.deepEqual(await snapshot(), before);
  }
});

test("validasi ganti sandi menunjuk kolom tanpa mengubah kredensial, sesi, atau audit", async () => {
  const email = `password-validation-${randomUUID()}@uji.invalid`;
  const created = await accounts.manageUser(admin, { operation: "create", name: "Petugas validasi sandi", email, role: "editor" });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await db.session.create({ data: { userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
  const snapshot = async () => ({
    user: await db.user.findUniqueOrThrow({ where: { id: user.id } }),
    account: await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } }),
    sessions: await db.session.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } }),
    audits: await db.auditEvent.count({ where: { objectId: user.id } })
  });
  const before = await snapshot();
  for (const [current, password, field] of [
    [created.password!, "x".repeat(11), "password"],
    [created.password!, "x".repeat(129), "password"],
    [created.password!, created.password!, "password"],
    ["sandi-lama-salah-123", "sandi-baru-sah-123", "current"]
  ]) {
    await assert.rejects(accounts.changePassword(user, current, password), error => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 400);
      assert.deepEqual(publicError(error).fields, { [field]: error.message });
      return true;
    });
    assert.deepEqual(await snapshot(), before);
  }
  const password = "x".repeat(12);
  await accounts.changePassword(user, created.password!, password);
  const after = await snapshot();
  assert.equal(after.user.id, user.id); assert.equal(after.user.role, user.role);
  assert.equal(after.user.mustChangePassword, false); assert.equal(after.sessions.length, 0);
  assert.equal(after.audits, before.audits + 1);
  assert.equal(await verifyPassword(password, after.account.password!), true);
  assert.equal(await verifyPassword(created.password!, after.account.password!), false);
  assert.equal(JSON.stringify(await db.auditEvent.findMany({ where: { objectId: user.id } })).includes(created.password!), false);
});

test("pemulihan admin mempertahankan ID/peran, mencabut sesi, dan mewajibkan ganti sandi dengan audit", async () => {
  const email = `recover-${randomUUID()}@uji.invalid`;
  const created = await accounts.manageUser(admin, { operation: "create", name: "Admin pemulihan uji", email, role: "admin" });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await db.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
  await db.session.create({ data: { userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
  const result = await accounts.recoverAdmin({ email, operator: "Petugas teknis uji", reason: "Akses admin sintetis hilang untuk pengujian." });
  const current = await db.user.findUniqueOrThrow({ where: { email } });
  assert.equal(current.id, user.id); assert.equal(current.role, "admin"); assert.equal(current.active, true); assert.equal(current.mustChangePassword, true);
  assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
  const account = await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } });
  assert.equal(await verifyPassword(result.password, account.password!), true);
  assert.equal(await verifyPassword(created.password!, account.password!), false);
  const audit = await db.auditEvent.findFirstOrThrow({ where: { action: "account.recover", objectId: user.id } });
  assert.equal(audit.actorId, null); assert.equal(audit.actorName, "Petugas teknis uji");
  assert.match(audit.note, /sintetis/); assert.equal(JSON.stringify(audit).includes(result.password), false);
});

test("pemulihan teknis menolak nonadmin, akun nonaktif, masukan tidak lengkap, dan mutasi melalui manageUser", async () => {
  const input = { email: editor.email, operator: "Petugas uji", reason: "Alasan pemulihan untuk pengujian." };
  await assert.rejects(accounts.recoverAdmin(input), { status: 403 });
  await assert.rejects(accounts.recoverAdmin({ ...input, reason: "" }), { status: 400 });
  await assert.rejects(accounts.manageUser(admin, { operation: "recover", ...input }), { status: 400 });
  const email = `disabled-recover-${randomUUID()}@uji.invalid`;
  await db.user.create({ data: credentialUser({ name: "Admin nonaktif uji", email, role: "admin", active: false }, await hashPassword("inactive-admin-test-123")) });
  await assert.rejects(accounts.recoverAdmin({ ...input, email }), { status: 403 });
});

test("audit gagal membatalkan reset kredensial, pencabutan sesi, dan kewajiban ganti sandi pemulihan", async () => {
  const email = `recover-rollback-${randomUUID()}@uji.invalid`;
  await accounts.manageUser(admin, { operation: "create", name: "Admin rollback uji", email, role: "admin" });
  const user = await db.user.update({ where: { email }, data: { mustChangePassword: false } });
  const account = await db.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: user.id } } });
  const session = await db.session.create({ data: { userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
  await memory.engine.exec("CREATE FUNCTION reject_recovery_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'account.recover' THEN RAISE EXCEPTION 'test recovery rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_recovery_failure BEFORE INSERT ON \"AuditEvent\" FOR EACH ROW EXECUTE FUNCTION reject_recovery_audit();");
  try {
    await assert.rejects(accounts.recoverAdmin({ email, operator: "Petugas uji", reason: "Uji rollback pemulihan saat audit gagal." }));
    assert.equal((await db.account.findUniqueOrThrow({ where: { id: account.id } })).password, account.password);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).mustChangePassword, false);
    assert.ok(await db.session.findUnique({ where: { id: session.id } }));
  } finally { await memory.engine.exec('DROP TRIGGER test_recovery_failure ON "AuditEvent"; DROP FUNCTION reject_recovery_audit();'); }
});

test("batas laju persisten dan kueri berbahaya tidak mengambil konten", async () => {
  const { consumeRate } = await import("../../src/lib/rate-limit");
  for (let n = 0; n < 5; n++) await consumeRate("uji-login", 5, 900);
  await assert.rejects(consumeRate("uji-login", 5, 900), /Terlalu banyak/);
  await db.rateLimit.update({ where: { key: "uji-login" }, data: { expiresAt: new Date(0) } });
  await consumeRate("uji-login", 5, 900); assert.equal((await db.rateLimit.findUniqueOrThrow({ where: { key: "uji-login" } })).count, 1);
  assert.equal((await repository.searchPublished("'; DROP TABLE User; --")).total, 0);
  assert.equal(await db.user.count() >= 3, true);
});

test("impor awal dapat diulang tanpa menerbitkan atau menimpa konten", async () => {
  const { importContent } = await import("../../scripts/import-content");
  const first = await importContent(); assert.equal(first.imported, 29);
  const second = await importContent(); assert.equal(second.imported, 0); assert.equal(second.skipped, 29);
  const items = await db.contentItem.findMany({ where: { revisions: { some: { authorId: null } } } });
  assert.equal(items.length, 29); assert.ok(items.every(i => i.publishedRevisionId === null));
});

test("revisi arsip tidak dapat diajukan atau diterbitkan lewat pemanggilan langsung", async () => {
  const input = draft(); const saved = await service.saveDraft(editor, input);
  await db.contentItem.update({ where: { id: saved.itemId }, data: { archived: true } });
  await assert.rejects(service.submitRevision(editor, saved.itemId, saved.revisionId, 1), /diarsipkan/);
  await db.contentItem.update({ where: { id: saved.itemId }, data: { archived: false } });
  await service.submitRevision(editor, saved.itemId, saved.revisionId, 1);
  await db.contentItem.update({ where: { id: saved.itemId }, data: { archived: true } });
  await assert.rejects(service.reviewRevision(approver, saved.itemId, saved.revisionId, 2, "publish", ""), /diarsipkan/);
});

test("database lokal mempertahankan data setelah ditutup dan dibuka kembali", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-persistence-"));
  let local = createLocalDatabase(join(directory, "nested", "pg"));
  try {
    await (await local.engine).exec("CREATE TABLE persistence_check (value TEXT); INSERT INTO persistence_check VALUES ('tetap tersimpan')");
    await local.close();
    local = createLocalDatabase(join(directory, "nested", "pg"));
    assert.equal((await local.pool.query("SELECT value FROM persistence_check")).rows[0].value, "tetap tersimpan");
  } finally { await local.close(); await rm(directory, { recursive: true, force: true }); }
});

test("PDF privat mengikuti revisi/persetujuan dan tidak masuk pembacaan publik", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-document-workflow-")), previousMedia = process.env.MEDIA_DIRECTORY;
  process.env.MEDIA_DIRECTORY = directory;
  try {
    const { storeDocument, readDocumentFile } = await import("../../src/lib/documents");
    const bytes = pdfFixture(), file = new File([bytes], "sintetis.pdf", { type: "application/pdf" });
    for (const actor of [admin, approver, { ...editor, mustChangePassword: true }]) await assert.rejects(storeDocument(actor, file), { status: 403 });
    const asset = await storeDocument(editor, file), stored = await db.documentAsset.findUniqueOrThrow({ where: { id: asset.id }, include: { pages: true } });
    assert.deepEqual(await readDocumentFile(stored), bytes); assert.equal(stored.pages.length, 1);
    const input = draft({ kind: "knowledge", payload: payloadSchema.parse({ title: "Sumber privat pdfworkflow", summary: "Ringkasan sumber sintetis", body: "", number: "UJI 1", year: "2026", publisher: "Instansi fixture", officialUrl: "https://www.djkn.kemenkeu.go.id/", statusNote: "Berlaku pada fixture; tidak ada perubahan terkait.", regulationStatus: "current", documentId: asset.id, documentReviewed: false }) });
    let saved = await service.saveDraft(editor, input);
    await assert.rejects(service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version), error => error instanceof AppError && !!error.fields?.documentReviewed);
    input.payload.documentReviewed = true; saved = await service.saveDraft(editor, { ...input, ...saved });
    await service.submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
    await assert.rejects(service.saveDraft(editor, { ...input, ...saved, version: saved.version + 1 }), { status: 409 });
    await service.reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "PDF dan ekstraksi fixture diperiksa.");
    assert.equal(await db.publishedSearchEntry.findUnique({ where: { itemId: saved.itemId } }), null);
    assert.ok(!(await repository.listPublished()).items.some(item => item.id === saved.itemId));
    // @ts-expect-error Request yang memalsukan jenis tetap harus ditolak saat runtime.
    assert.equal(await repository.getPublished("knowledge", input.slug), null);
    await db.publishedSearchEntry.create({ data: { itemId: saved.itemId, revisionId: saved.revisionId, kind: "article", title: "pdfworkflow", summary: "Tidak boleh bocor", text: "pdfworkflow", path: `/insight/${input.slug}`, professions: ["pp"], publishedAt: new Date() } });
    assert.equal((await repository.searchPublished("pdfworkflow")).total, 0);
    const sitemap = (await import("../../src/app/sitemap")).default;
    assert.ok(!(await sitemap()).some(entry => entry.url.includes(input.slug)));
    const approved = await db.contentRevision.findUniqueOrThrow({ where: { id: saved.revisionId } });
    const replacement = await storeDocument(editor, new File([pdfFixture(["Pasal pengganti. Isi sintetis tetap ditinjau pada revisi baru."])], "pengganti.pdf", { type: "application/pdf" }));
    const next = await service.saveDraft(editor, { ...input, ...saved, version: approved.version, payload: { ...input.payload, documentId: replacement.id, documentReviewed: false } });
    assert.notEqual(next.revisionId, approved.id);
    assert.equal((await db.revisionDocument.findUniqueOrThrow({ where: { revisionId: approved.id } })).documentId, asset.id);
    assert.equal((await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } })).publishedRevisionId, approved.id);
    await service.withdrawContent(approver, saved.itemId, approved.id, "Tinjauan ulang sumber fixture.");
    assert.equal((await db.contentItem.findUniqueOrThrow({ where: { id: saved.itemId } })).publishedRevisionId, null);
    assert.deepEqual(await readDocumentFile(stored), bytes);
    const scanned = await storeDocument(editor, new File([pdfFixture([""])], "pindai.pdf", { type: "application/pdf" }));
    const scanDraft = await service.saveDraft(editor, { ...input, slug: `scan-${randomUUID()}`, payload: { ...input.payload, documentId: scanned.id, documentReviewed: true } });
    await assert.rejects(service.submitRevision(editor, scanDraft.itemId, scanDraft.revisionId, scanDraft.version), /OCR/);
    await assert.rejects(service.saveDraft(editor, { ...input, slug: `missing-${randomUUID()}`, payload: { ...input.payload, documentId: randomUUID() } }), /PDF tidak ditemukan/);
  } finally { if (previousMedia === undefined) delete process.env.MEDIA_DIRECTORY; else process.env.MEDIA_DIRECTORY = previousMedia; await rm(directory, { recursive: true, force: true }); }
});

test("kegagalan audit PDF membatalkan metadata/halaman dan membersihkan file baru", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jafa-document-rollback-")), previousMedia = process.env.MEDIA_DIRECTORY;
  process.env.MEDIA_DIRECTORY = directory;
  try {
    const { storeDocument } = await import("../../src/lib/documents");
    const before = await db.documentAsset.count();
    await db.$executeRawUnsafe("CREATE FUNCTION reject_pdf_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'content.document-upload' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER test_pdf_audit BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_pdf_audit()');
    try { await assert.rejects(storeDocument(editor, new File([pdfFixture()], "rollback.pdf", { type: "application/pdf" }))); }
    finally { await db.$executeRawUnsafe('DROP TRIGGER test_pdf_audit ON "AuditEvent"'); await db.$executeRawUnsafe('DROP FUNCTION reject_pdf_audit()'); }
    assert.equal(await db.documentAsset.count(), before);
    const { readdir } = await import("node:fs/promises"); assert.deepEqual(await readdir(join(directory, "documents")), []);
  } finally { if (previousMedia === undefined) delete process.env.MEDIA_DIRECTORY; else process.env.MEDIA_DIRECTORY = previousMedia; await rm(directory, { recursive: true, force: true }); }
});

registerSecurityTests(() => db);
