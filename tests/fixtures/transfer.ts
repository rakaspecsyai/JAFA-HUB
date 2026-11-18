import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Pool } from "pg";
import sharp from "sharp";
import { createLocalDatabase } from "../../src/lib/local-db";
import { credentialUser } from "../../src/lib/credentials";
import { hashPassword } from "../../src/lib/passwords";
import { applyLocalMigrations } from "../../scripts/local-migrations";
import { pdfFixture } from "./pdf";

export const transferPassword = "Fixture-transfer-only-2026";
export const transferImageKey = `${"a".repeat(48)}.webp`;
export const transferPdfKey = `${"b".repeat(48)}.pdf`;
export async function transferRows(pool: Pool) {
  const result: Record<string, string[]> = {};
  const tables = (await pool.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  for (const { tablename } of tables) result[tablename] = (await pool.query<{ row: string }>(`SELECT to_jsonb(t)::text AS row FROM "${tablename.replaceAll('"', '""')}" t ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows.map(row => row.row);
  return result;
}
export async function createTransferFixture(root: string) {
  const pg = join(root, "pg"), media = join(root, "media"), bundle = join(root, "bundle");
  await mkdir(join(media, "documents"), { recursive: true });
  const local = createLocalDatabase(pg), client = new PrismaClient({ adapter: new PrismaPg(local.pool) });
  try {
    await applyLocalMigrations(await local.engine);
    const password = await hashPassword(transferPassword);
    const editor = await client.user.create({ data: credentialUser({ name: "Editor sintetis", email: "editor@transfer.invalid", role: "editor", mustChangePassword: false }, password) });
    const approver = await client.user.create({ data: credentialUser({ name: "Penyetuju sintetis", email: "approver@transfer.invalid", role: "approver", mustChangePassword: false }, password) });
    await client.user.create({ data: credentialUser({ name: "Admin sintetis", email: "admin@transfer.invalid", role: "admin" }, password) });
    await client.session.create({ data: { userId: editor.id, tokenHash: "SESSION-MUST-NOT-TRANSFER", expiresAt: new Date("2027-01-01") } });
    await client.verification.create({ data: { identifier: "fixture", value: "VERIFICATION-MUST-NOT-TRANSFER", expiresAt: new Date("2027-01-01") } });
    await client.rateLimit.create({ data: { key: "RATE-LIMIT-MUST-NOT-TRANSFER", count: 5, expiresAt: new Date("2027-01-01") } });
    await client.aiUsageMonth.create({ data: { month: "2026-11", costMicrousd: 9007199254740993n, inputTokens: 100n, requests: 1 } });
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#184c52" } }).webp().toBuffer();
    const asset = await client.mediaAsset.create({ data: { storageKey: transferImageKey, mime: "image/webp", size: image.length, width: 2, height: 2, attribution: "Fixture privat", uploadedBy: editor.id } });
    await writeFile(join(media, asset.storageKey), image);
    const pdf = pdfFixture(), storageKey = transferPdfKey, checksum = createHash("sha256").update(pdf).digest("hex");
    await writeFile(join(media, "documents", storageKey), pdf);
    const document = await client.documentAsset.create({ data: { storageKey, checksum, size: pdf.length, pageCount: 1, needsOcr: false, parserVersion: "fixture-transfer", uploadedBy: editor.id, pages: { create: { number: 1, text: "Dokumen sintetis, bukan sumber resmi.", checksum: "fixture-page" } } } });
    const article = await client.contentItem.create({ data: { kind: "article", slug: "transfer-article" } });
    const approved = await client.contentRevision.create({ data: { itemId: article.id, number: 1, status: "approved", reviewedOn: "2026-11-17", authorId: editor.id, submitterId: editor.id, reviewerId: approver.id,
      payload: { title: "Materi sintetis ' ); DROP TABLE User; --", summary: "Ringkasan artikel sintetis", body: "Isi revisi terbit sintetis.\nBahasa Indonesia — baris kedua.", image: `/api/media/${asset.id}` },
      contributors: { create: { userId: editor.id } }, sources: { create: { title: "Fixture sumber", internalRef: "sintetis", reviewedOn: "2026-11-17", order: 0 } },
      professions: { create: { key: "pp" } }, media: { create: { mediaId: asset.id, alt: "Gambar sintetis" } }
    } });
    await client.contentItem.update({ where: { id: article.id }, data: { publishedRevisionId: approved.id, firstPublishedAt: new Date("2026-11-17T01:02:03.123Z") } });
    await client.contentRevision.create({ data: { itemId: article.id, number: 2, reviewedOn: "2026-11-17", payload: { title: "Draf tetap privat", summary: "Ringkasan draf", body: "Isi revisi draf sintetis." }, authorId: editor.id, contributors: { create: { userId: editor.id } } } });
    await client.publishedSearchEntry.create({ data: { itemId: article.id, revisionId: approved.id, kind: "article", title: "Artikel sintetis", summary: "Fixture", text: "Materi terbit", path: "/insight/transfer-article", professions: ["pp", "plb"], publishedAt: new Date("2026-11-17T01:02:03.123Z") } });
    const knowledge = await client.contentItem.create({ data: { kind: "knowledge", slug: "transfer-pdf" } });
    const source = await client.contentRevision.create({ data: { itemId: knowledge.id, number: 1, status: "approved", reviewedOn: "2026-11-17", authorId: editor.id, submitterId: editor.id, reviewerId: approver.id,
      payload: { title: "PDF sintetis", documentId: document.id }, document: { create: { documentId: document.id } }, contributors: { create: { userId: editor.id } }
    } });
    await client.contentItem.update({ where: { id: knowledge.id }, data: { publishedRevisionId: source.id } });
    await client.$executeRaw`INSERT INTO "KnowledgeChunk" (id, "revisionId", position, "pageNumber", text, checksum, model, embedding)
      VALUES (gen_random_uuid(), ${source.id}::uuid, 0, 1, 'Potongan sintetis', 'fixture-chunk', 'text-embedding-3-small', ${`[${Array(1536).fill(0.25).join(",")}]`}::vector)`;
    await client.$executeRaw`UPDATE "ContentRevision" SET payload=jsonb_set(payload, '{exactNumeric}', '9007199254740993'::jsonb) WHERE id=${approved.id}::uuid`;
    await client.auditEvent.create({ data: { actorId: approver.id, actorName: approver.name, action: "content.publish", objectId: article.id, revisionId: approved.id, note: "Bukti sintetis; bukan persetujuan materi pengguna." } });
    return { pg, media, bundle, imageId: asset.id, documentId: document.id, expected: await transferRows(local.pool) };
  } finally { await client.$disconnect(); await local.close(); }
}
