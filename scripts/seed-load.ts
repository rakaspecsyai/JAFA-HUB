import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { payloadSchema, type Staff } from "../src/lib/content-types";
import { hashPassword } from "../src/lib/passwords";
import { credentialUser } from "../src/lib/credentials";

export function loadDatabaseTarget(value: string | undefined) {
  if (!value) throw new Error("Tetapkan JAFA_LOAD_DATABASE_URL untuk database uji kosong.");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || !/^\/jafa_load_[a-z0-9_]+$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("Hanya PostgreSQL 127.0.0.1 dengan database jafa_load_* tanpa parameter tambahan yang diizinkan.");
  }
  return value;
}

export async function seedLoad() {
  process.env.DATABASE_URL = loadDatabaseTarget(process.env.JAFA_LOAD_DATABASE_URL);
  process.env.JAFA_LOCAL_DATABASE = "false";
  process.env.JAFA_CONTENT_PREVIEW = "false";
  const { db } = await import("../src/lib/db");
  try {
    const counts = await Promise.all([db.user.count(), db.session.count(), db.contentItem.count(), db.contentRevision.count(), db.sourceReference.count(), db.revisionProfession.count(), db.mediaAsset.count(), db.revisionMedia.count(), db.publishedSearchEntry.count(), db.auditEvent.count(), db.rateLimit.count()]);
    if (counts.some(Boolean)) throw new Error("Database berisi data aplikasi; seed dibatalkan tanpa menulis. Buat database uji kosong yang baru.");
    const actors: Staff[] = [];
    for (const role of ["editor", "approver"] as const) {
      const user = await db.user.create({ data: credentialUser({ name: `Uji beban ${role}`, email: `${role}@uji.invalid`, role, mustChangePassword: false }, await hashPassword(randomBytes(32).toString("hex"))) });
      actors.push({ ...user, role });
    }
    const [editor, approver] = actors;
    const { saveDraft, submitRevision, reviewRevision } = await import("../src/lib/content-service");
    const reviewedOn = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    for (const [kind, count] of [["article", 1000], ["regulation", 500], ["faq", 500]] as const) {
      for (let n = 1; n <= count; n++) {
        const saved = await saveDraft(editor, {
          kind, slug: `jafa-load-${kind}-${n}`, reviewedOn, professions: ["pp"],
          payload: payloadSchema.parse({ title: `JAFA_LOAD_TEST_DATA ${kind} ${n}`, summary: "Materi sintetis untuk uji beban terisolasi.", body: "Data uji beban penilaian aset; bukan materi layanan atau persetujuan substansi.", number: `UJI ${n}`, year: "2026", publisher: "Fixture pengujian", officialUrl: "https://www.djkn.kemenkeu.go.id/", statusNote: "Data sintetis; bukan peraturan." }),
          sources: [{ title: "Tautan fixture; bukan tinjauan substansi", url: "https://www.djkn.kemenkeu.go.id/", reviewedOn }]
        });
        await submitRevision(editor, saved.itemId, saved.revisionId, saved.version);
        await reviewRevision(approver, saved.itemId, saved.revisionId, saved.version + 1, "publish", "Publikasi data sintetis pada database uji terisolasi; bukan persetujuan materi awal.");
      }
    }
    const totals = await db.contentItem.groupBy({ by: ["kind"], _count: true });
    if (await db.publishedSearchEntry.count() !== 2000) throw new Error("Jumlah proyeksi fixture tidak sesuai; jangan lanjutkan beban.");
    console.log(JSON.stringify({ synthetic: true, totals, published: 2000 }));
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedLoad().catch(() => { console.error("Seed gagal; periksa target, migrasi, dan kekosongan database uji. Database parsial dipertahankan untuk pemeriksaan."); process.exitCode = 1; });
}
