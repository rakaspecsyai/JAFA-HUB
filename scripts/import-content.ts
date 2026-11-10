import { db } from "../src/lib/db";
import { initialContent } from "../src/lib/fixtures";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function importContent() {
  const hash = createHash("sha256").update(await readFile("data/legacy-content.mjs")).digest("hex");
  let imported = 0; let skipped = 0;
  for (const content of initialContent) {
    await db.$transaction(async tx => {
      const existing = await tx.contentItem.findUnique({ where: { kind_slug: { kind: content.kind, slug: content.slug } } });
      if (existing) { skipped++; return; }
      const item = await tx.contentItem.create({ data: { kind: content.kind, slug: content.slug } });
      const revision = await tx.contentRevision.create({ data: {
        itemId: item.id, number: 1, status: "draft", payload: content.payload as Prisma.InputJsonValue,
        reviewedOn: content.reviewedOn,
        sources: { create: content.sources.map((s, order) => ({ ...s, order })) },
        professions: { create: content.professions.map(key => ({ key })) }
      } });
      await tx.auditEvent.create({ data: { actorName: "Impor prototipe", action: "content.import", objectId: item.id, revisionId: revision.id, note: `SHA-256 sumber: ${hash}. Draf; menunggu tinjauan substansi.` } });
      imported++;
    });
  }
  console.log(`${imported} konten diimpor sebagai draf; ${skipped} rekaman sudah ada dan tidak ditimpa. Tidak ada konten diterbitkan otomatis.`);
  return { imported, skipped };
}
if (process.argv[1]?.endsWith("import-content.ts")) {
  try { await importContent(); }
  finally { await db.$disconnect(); const { closeLocalDatabase } = await import("../src/lib/local-db"); await closeLocalDatabase(); }
}
