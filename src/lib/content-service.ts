import { Prisma, type Role, type ContentKind } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { AppError } from "./errors";
import { calendarDate, contentPath, officialUrl, payloadSchema, PROFESSION_KEYS, safeUrl, searchText, type Kind, type Payload, type Source, type Staff } from "./content-types";

type Tx = Prisma.TransactionClient;
const sourceSchema = z.object({ title: z.string().trim().max(300), url: z.string().trim().max(2000).nullable().optional(), internalRef: z.string().max(1000).nullable().optional(), publisher: z.string().max(300).optional(), reviewedOn: z.string().max(10) });
const draftSchema = z.object({
  itemId: z.string().uuid().optional(), revisionId: z.string().uuid().optional(), version: z.number().int().positive().optional(),
  kind: z.enum(["profession", "article", "regulation", "faq", "page"]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  payload: payloadSchema, reviewedOn: z.string().max(10),
  professions: z.array(z.enum(PROFESSION_KEYS)).max(3), sources: z.array(sourceSchema).max(30)
});
export type DraftInput = z.infer<typeof draftSchema>;

export function assertRole(actor: Staff, role: Role) {
  if (actor.role !== role || actor.mustChangePassword) throw new AppError("Peran Anda tidak memiliki akses untuk tindakan ini.", 403);
}
export async function checkActor(tx: Tx, actor: Staff, role: Role) {
  assertRole(actor, role);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.id}::uuid FOR UPDATE`;
  const current = await tx.user.findUnique({ where: { id: actor.id } });
  if (!current?.active || current.role !== role || current.mustChangePassword) throw new AppError("Akses akun telah berubah. Silakan masuk kembali.", 403);
}
function audit(tx: Tx, actor: Staff, action: string, objectId: string, revisionId?: string, note = "") {
  return tx.auditEvent.create({ data: { actorId: actor.id, actorName: actor.name, action, objectId, revisionId, note } });
}
const conflict = () => new AppError("Versi ini telah berubah di sesi lain. Masukan Anda belum ditimpa. Muat ulang untuk membandingkan versi terbaru.", 409);
async function lockItem(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "ContentItem" WHERE id = ${id}::uuid FOR UPDATE`;
  const item = await tx.contentItem.findUnique({ where: { id }, include: { revisions: { orderBy: { number: "desc" }, take: 1, include: { sources: true, professions: true, media: true } } } });
  if (!item) throw new AppError("Konten tidak ditemukan.", 404);
  return item;
}
export function validateForPublication(kind: Kind, p: Payload, reviewedOn: string, sources: Source[], professions: string[]) {
  const fields: Record<string, string> = {};
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  if (!p.title) fields.title = "Isi judul konten.";
  if (!p.summary) fields.summary = "Isi ringkasan konten.";
  if (!calendarDate(reviewedOn) || reviewedOn > today) fields.reviewedOn = "Isi tanggal tinjauan yang sah dan tidak berada di masa depan.";
  if (kind !== "page") {
    if (!sources.length || !sources.some(s => s.title && s.url && safeUrl(s.url, false))) fields.sources = "Sertakan sedikitnya satu sumber publik HTTPS beserta judul.";
    if (sources.some(s => !s.title || !calendarDate(s.reviewedOn) || s.reviewedOn > today || (s.url && !safeUrl(s.url, false)) || (!s.url && !s.internalRef))) fields.sources = "Lengkapi judul, rujukan, dan tanggal tinjauan setiap sumber; tanggal tidak boleh di masa depan.";
    if (kind !== "faq" && !professions.length) fields.professions = "Pilih sedikitnya satu bidang JF.";
  }
  if (["profession", "article", "faq", "page"].includes(kind) && !p.body) fields.body = "Isi konten belum lengkap.";
  if (kind === "profession") {
    if (!p.definition) fields.definition = "Isi definisi profil.";
    if (!p.category) fields.category = "Isi kategori jabatan.";
    if (!p.grades.length || p.grades.some(value => !value.trim())) fields.grades = "Isi jenjang, satu entri tidak kosong per baris.";
    if (!p.tasks.length || p.tasks.some(value => !value.trim())) fields.tasks = "Isi tugas, satu entri tidak kosong per baris.";
    if (!p.competencies.length || p.competencies.some(value => !value.trim())) fields.competencies = "Isi kompetensi, satu entri tidak kosong per baris.";
    if (!p.nomenclature) fields.nomenclature = "Isi catatan nomenklatur profil.";
  }
  if (kind === "regulation") {
    if (!p.number) fields.number = "Isi nomor peraturan.";
    if (!/^\d{4}$/.test(p.year)) fields.year = "Isi tahun peraturan dengan empat angka.";
    if (!p.publisher) fields.publisher = "Isi penerbit peraturan.";
    if (!officialUrl(p.officialUrl)) fields.officialUrl = "Isi URL HTTPS dari domain resmi .go.id.";
    if (!p.statusNote) fields.statusNote = "Isi catatan status dan riwayat peraturan.";
  }
  if (kind === "article" && p.articleType === "Kabar DJKN" && (!calendarDate(p.sourceDate) || p.sourceDate > today)) fields.sourceDate = "Isi tanggal publikasi sumber berita yang sah dan tidak berada di masa depan.";
  if (p.image && (!p.imageAlt || !p.imageCredit)) fields.imageAlt = "Gambar memerlukan teks alternatif dan atribusi.";
  if (p.relatedLinks.some(l => !safeUrl(l.href))) fields.body = "Tautan terkait harus berupa path lokal atau HTTPS.";
  if (Object.keys(fields).length) throw new AppError("Konten belum lengkap untuk diajukan. Periksa kolom yang ditandai.", 400, fields);
}

export async function saveDraft(actor: Staff, raw: unknown) {
  assertRole(actor, "editor");
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("Format draf tidak sesuai. Periksa slug, isi, dan sumber.", 400);
  const input = parsed.data;
  if (input.sources.some(s => s.url && !safeUrl(s.url, false)) || input.payload.relatedLinks.some(l => !safeUrl(l.href))) throw new AppError("Gunakan tautan HTTPS atau tautan lokal yang aman.");
  if (input.payload.image && !/^\/assets\/(hero|field|auction)\.webp$/.test(input.payload.image) && !/^\/api\/media\/[a-f0-9-]{36}$/.test(input.payload.image)) throw new AppError("Pilih gambar dari aset aplikasi atau unggahan CMS.");
  return db.$transaction(async tx => {
    await checkActor(tx, actor, "editor");
    let item;
    if (!input.itemId) {
      if (!["article", "regulation", "faq"].includes(input.kind)) throw new AppError("Profil JF dan halaman pendukung merupakan rekaman tetap.", 403);
      if (await tx.contentItem.findUnique({ where: { kind_slug: { kind: input.kind, slug: input.slug } } })) throw new AppError("Slug telah digunakan. Pilih slug lain.", 409);
      item = await tx.contentItem.create({ data: { kind: input.kind, slug: input.slug }, include: { revisions: { include: { sources: true, professions: true, media: true } } } });
    } else item = await lockItem(tx, input.itemId);
    if (item.kind !== input.kind || item.archived) throw new AppError("Jenis konten tidak sesuai atau konten telah diarsipkan.", 403);
    if (item.slug !== input.slug) {
      if (item.firstPublishedAt || ["profession", "page"].includes(item.kind)) throw new AppError("Slug konten ini telah dikunci.", 403);
      if (await tx.contentItem.findUnique({ where: { kind_slug: { kind: item.kind, slug: input.slug } } })) throw new AppError("Slug telah digunakan.", 409);
      await tx.contentItem.update({ where: { id: item.id }, data: { slug: input.slug } });
    }
    const previous = item.revisions[0];
    if (previous && (previous.id !== input.revisionId || previous.version !== input.version)) throw conflict();
    if (previous?.status === "submitted") throw new AppError("Revisi sedang diperiksa dan tidak dapat disunting.", 409);
    const mediaId = input.payload.image.startsWith("/api/media/") ? input.payload.image.split("/").pop() : undefined;
    if (mediaId && !(await tx.mediaAsset.findUnique({ where: { id: mediaId } }))) throw new AppError("Gambar tidak ditemukan. Unggah kembali.");
    const data = { payload: input.payload as Prisma.InputJsonValue, reviewedOn: input.reviewedOn };
    const revision = previous && previous.status !== "approved"
      ? await tx.contentRevision.update({ where: { id: previous.id }, data: { ...data, version: { increment: 1 } } })
      : await tx.contentRevision.create({ data: { ...data, itemId: item.id, authorId: actor.id, number: (previous?.number ?? 0) + 1 } });
    await tx.revisionContributor.upsert({ where: { revisionId_userId: { revisionId: revision.id, userId: actor.id } }, create: { revisionId: revision.id, userId: actor.id }, update: {} });
    await tx.sourceReference.deleteMany({ where: { revisionId: revision.id } });
    await tx.revisionProfession.deleteMany({ where: { revisionId: revision.id } });
    await tx.revisionMedia.deleteMany({ where: { revisionId: revision.id } });
    if (input.sources.length) await tx.sourceReference.createMany({ data: input.sources.map((s, order) => ({ ...s, url: s.url || null, revisionId: revision.id, order })) });
    if (input.professions.length) await tx.revisionProfession.createMany({ data: [...new Set(input.professions)].map(key => ({ revisionId: revision.id, key })) });
    if (mediaId) await tx.revisionMedia.create({ data: { revisionId: revision.id, mediaId, alt: input.payload.imageAlt, caption: input.payload.imageCredit } });
    await audit(tx, actor, previous ? "content.save" : "content.create", item.id, revision.id);
    await tx.contentItem.update({ where: { id: item.id }, data: { updatedAt: new Date() } });
    return { itemId: item.id, revisionId: revision.id, version: revision.version };
  });
}

export async function submitRevision(actor: Staff, itemId: string, revisionId: string, version: number) {
  return db.$transaction(async tx => {
    await checkActor(tx, actor, "editor");
    const item = await lockItem(tx, itemId);
    const r = item.revisions[0];
    if (item.archived) throw new AppError("Konten diarsipkan dan tidak dapat diajukan.", 409);
    if (!r || r.id !== revisionId || r.version !== version) throw conflict();
    if (!["draft", "returned"].includes(r.status)) throw new AppError("Hanya revisi draf atau dikembalikan yang dapat diajukan.", 409);
    validateForPublication(item.kind, payloadSchema.parse(r.payload), r.reviewedOn, r.sources, r.professions.map(p => p.key));
    await tx.revisionContributor.upsert({ where: { revisionId_userId: { revisionId: r.id, userId: actor.id } }, create: { revisionId: r.id, userId: actor.id }, update: {} });
    await tx.contentRevision.update({ where: { id: r.id }, data: { status: "submitted", submitterId: actor.id, submittedAt: new Date(), version: { increment: 1 } } });
    await tx.contentItem.update({ where: { id: item.id }, data: { updatedAt: new Date() } });
    await audit(tx, actor, "content.submit", item.id, r.id);
  });
}
export async function reviewRevision(actor: Staff, itemId: string, revisionId: string, version: number, decision: "publish" | "return", note: string) {
  if (!["publish", "return"].includes(decision)) throw new AppError("Keputusan tidak sesuai.");
  if (note.length > 2000 || (decision === "return" && !note.trim())) {
    const message = note.length > 2000 ? "Catatan keputusan maksimal 2.000 karakter." : "Pengembalian memerlukan catatan.";
    throw new AppError(message, 400, { note: message });
  }
  return db.$transaction(async tx => {
    await checkActor(tx, actor, "approver");
    const item = await lockItem(tx, itemId);
    const r = item.revisions[0];
    if (item.archived) throw new AppError("Konten diarsipkan dan tidak dapat diterbitkan.", 409);
    if (!r || r.id !== revisionId || r.version !== version) throw conflict();
    if (r.status !== "submitted") throw new AppError("Revisi tidak sedang menunggu keputusan.", 409);
    if (r.authorId === actor.id || r.submitterId === actor.id || await tx.revisionContributor.findUnique({ where: { revisionId_userId: { revisionId: r.id, userId: actor.id } } })) throw new AppError("Pembuat, pengaju, atau kontributor tidak boleh menyetujui revisinya sendiri.", 403);
    const p = payloadSchema.parse(r.payload);
    if (decision === "publish") validateForPublication(item.kind, p, r.reviewedOn, r.sources, r.professions.map(p => p.key));
    const now = new Date();
    await tx.contentRevision.update({ where: { id: r.id }, data: { status: decision === "publish" ? "approved" : "returned", reviewerId: actor.id, note: note.trim(), decidedAt: now, version: { increment: 1 } } });
    if (decision === "publish") {
      await tx.contentItem.update({ where: { id: item.id }, data: { publishedRevisionId: r.id, firstPublishedAt: item.firstPublishedAt ?? now } });
      const projection = { revisionId: r.id, kind: item.kind, title: p.title, summary: p.summary, text: searchText({ payload: p, professions: r.professions.map(x => x.key) }), path: contentPath(item.kind, item.slug), professions: r.professions.map(x => x.key), publishedAt: now };
      await tx.publishedSearchEntry.upsert({ where: { itemId: item.id }, create: { itemId: item.id, ...projection }, update: projection });
    }
    await audit(tx, actor, decision === "publish" ? "content.publish" : "content.return", item.id, r.id, note.trim());
  });
}
export async function withdrawContent(actor: Staff, itemId: string, expectedRevision: string, note: string, archive = false) {
  if (!note.trim() || note.length > 2000) {
    const message = "Isi alasan penarikan, maksimal 2.000 karakter.";
    throw new AppError(message, 400, { note: message });
  }
  return db.$transaction(async tx => {
    await checkActor(tx, actor, "approver");
    const item = await lockItem(tx, itemId);
    if (!item.publishedRevisionId || item.publishedRevisionId !== expectedRevision) throw conflict();
    if (archive && ["profession", "page"].includes(item.kind)) throw new AppError("Rekaman tetap tidak dapat diarsipkan.");
    if (archive && item.revisions[0]?.status === "submitted") throw new AppError("Kembalikan revisi yang diajukan sebelum mengarsipkan konten.", 409);
    await tx.contentItem.update({ where: { id: item.id }, data: { publishedRevisionId: null, archived: archive } });
    await tx.publishedSearchEntry.deleteMany({ where: { itemId: item.id } });
    await audit(tx, actor, archive ? "content.archive" : "content.withdraw", item.id, expectedRevision, note.trim());
  });
}
