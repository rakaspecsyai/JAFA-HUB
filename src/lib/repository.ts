import { Prisma } from "@prisma/client";
import { db } from "./db";
import { initialContent, previewEnabled } from "./fixtures";
import { contentPath, normalizeQuery, payloadSchema, searchText, type Kind, type PublicContent } from "./content-types";

const includePublished = { publishedRevision: { include: { sources: { orderBy: { order: "asc" as const } }, professions: true } } };
type PublishedRecord = Prisma.ContentItemGetPayload<{ include: typeof includePublished }>;
function toPublic(item: PublishedRecord): PublicContent | null {
  const r = item.publishedRevision;
  if (!r || r.status !== "approved" || r.itemId !== item.id || item.archived) return null;
  return { id: item.id, revisionId: r.id, kind: item.kind, slug: item.slug, payload: payloadSchema.parse(r.payload),
    reviewedOn: r.reviewedOn, publishedAt: r.decidedAt?.toISOString() ?? null,
    sources: r.sources, professions: r.professions.map(p => p.key) };
}
export async function listPublished(kind?: Kind, filters: { jf?: string; type?: string; page?: number; size?: number } = {}) {
  const size = Math.min(filters.size ?? 12, 100);
  const page = Math.max(1, filters.page ?? 1);
  if (previewEnabled()) {
    const all = initialContent.filter(i => (!kind || i.kind === kind) && (!filters.jf || i.professions.includes(filters.jf)) && (!filters.type || i.payload.articleType === filters.type));
    return { items: all.slice((page - 1) * size, page * size), total: all.length, page, size };
  }
  const where: Prisma.ContentItemWhereInput = { kind, archived: false, publishedRevisionId: { not: null },
    publishedRevision: { status: "approved", ...(filters.jf ? { professions: { some: { key: filters.jf } } } : {}),
      ...(filters.type ? { payload: { path: ["articleType"], equals: filters.type } } : {}) } };
  const [total, rows] = await db.$transaction([
    db.contentItem.count({ where }),
    db.contentItem.findMany({ where, include: includePublished, orderBy: [{ publishedRevision: { decidedAt: "desc" } }, { id: "asc" }], skip: (page - 1) * size, take: size })
  ]);
  return { items: rows.map(toPublic).filter((i): i is PublicContent => i !== null), total, page, size };
}
export async function getPublished(kind: Kind, slug: string) {
  if (previewEnabled()) return initialContent.find(i => i.kind === kind && i.slug === slug) ?? null;
  const item = await db.contentItem.findUnique({ where: { kind_slug: { kind, slug } }, include: includePublished });
  return item ? toPublic(item) : null;
}
export type SearchResult = { id: string; revisionId: string; kind: Kind; title: string; summary: string; path: string; publishedAt: Date | string | null };
export async function searchPublished(query: string, kind?: Kind, page = 1) {
  const normalized = normalizeQuery(query.slice(0, 200));
  if (!normalized) return { items: [] as SearchResult[], total: 0 };
  const words = normalized.split(" ");
  if (previewEnabled()) {
    const all = initialContent.filter(i => i.kind !== "page" && (!kind || i.kind === kind) && words.every(w => searchText(i).includes(w)))
      .sort((a, b) => Number(normalizeQuery(b.payload.title).includes(normalized)) - Number(normalizeQuery(a.payload.title).includes(normalized)) || a.id.localeCompare(b.id));
    return { total: all.length, items: all.slice((page - 1) * 10, page * 10).map(i => ({ id: i.id, revisionId: i.revisionId, kind: i.kind, title: i.payload.title, summary: i.payload.summary, path: contentPath(i.kind, i.slug), publishedAt: i.publishedAt })) };
  }
  const filter = Prisma.sql`c."archived" = false AND c."publishedRevisionId" = e."revisionId" AND e.kind != 'page' AND ${Prisma.join(words.map(w => Prisma.sql`POSITION(${w} IN e.text) > 0`), " AND ")} ${kind ? Prisma.sql`AND e.kind::text = ${kind}` : Prisma.empty}`;
  const [counts, items] = await db.$transaction([
    db.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM "PublishedSearchEntry" e JOIN "ContentItem" c ON c.id = e."itemId" WHERE ${filter}`),
    db.$queryRaw<SearchResult[]>(Prisma.sql`SELECT e."itemId" AS id, e."revisionId", e.kind, e.title, e.summary, e.path, e."publishedAt" FROM "PublishedSearchEntry" e JOIN "ContentItem" c ON c.id = e."itemId" WHERE ${filter} ORDER BY CASE WHEN POSITION(${normalized} IN LOWER(e.title)) > 0 THEN 0 ELSE 1 END, e."publishedAt" DESC, e."itemId" ASC LIMIT 10 OFFSET ${(page - 1) * 10}`)
  ]);
  return { total: Number(counts[0].total), items };
}
export function matchFaq(faqs: PublicContent[], question: string) {
  const q = normalizeQuery(question);
  if (!q) return [];
  const exact = faqs.filter(f => normalizeQuery(f.payload.title) === q);
  return exact.length ? exact : faqs.filter(f => q.split(" ").every(w => searchText(f).includes(w)));
}
export async function allPublishedFaq() {
  const first = await listPublished("faq", { size: 100 });
  const pages = Math.ceil(first.total / 100);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => listPublished("faq", { size: 100, page: i + 2 })));
  return [...first.items, ...rest.flatMap(r => r.items)].sort((a, b) => a.payload.suggestionOrder - b.payload.suggestionOrder);
}
