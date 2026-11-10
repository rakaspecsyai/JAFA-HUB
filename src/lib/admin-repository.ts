import { Prisma } from "@prisma/client";
import { db } from "./db";
import type { Kind } from "./content-types";

export async function listWorkingContent(kind: Kind, { q = "", status = "", jf = "", page = 1 }: { q?: string; status?: string; jf?: string; page?: number } = {}) {
  const matching = Prisma.sql`FROM "ContentItem" c JOIN "ContentRevision" r ON r."itemId" = c.id
    WHERE c.kind::text = ${kind}
      AND NOT EXISTS (SELECT 1 FROM "ContentRevision" newer WHERE newer."itemId" = c.id AND newer.number > r.number)
      ${status ? Prisma.sql`AND r.status::text = ${status}` : Prisma.empty}
      ${q ? Prisma.sql`AND POSITION(LOWER(${q}) IN LOWER(r.payload->>'title')) > 0` : Prisma.empty}
      ${jf ? Prisma.sql`AND EXISTS (SELECT 1 FROM "RevisionProfession" p WHERE p."revisionId" = r.id AND p.key = ${jf})` : Prisma.empty}`;
  return db.$transaction(async tx => {
    const [count] = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total ${matching}`);
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT c.id ${matching} ORDER BY c."updatedAt" DESC, c.id ASC LIMIT 20 OFFSET ${(page - 1) * 20}`);
    const items = await tx.contentItem.findMany({ where: { id: { in: rows.map(row => row.id) } }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], include: { revisions: { orderBy: { number: "desc" }, take: 1 } } });
    return { total: Number(count.total), items };
  });
}
