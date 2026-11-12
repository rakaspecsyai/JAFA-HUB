import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { initialContent, previewEnabled } from "@/lib/fixtures";
import { contentPath } from "@/lib/content-types";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const fixed = ["/", "/informasi", "/insight", "/regulasi", "/faq", "/simulasi"];
  const entries = previewEnabled() ? initialContent.filter(i => ["profession", "article", "page"].includes(i.kind)).map(i => ({ path: contentPath(i.kind, i.slug) })) : await db.publishedSearchEntry.findMany({ where: { kind: { in: ["profession", "article", "page"] }, item: { kind: { in: ["profession", "article", "page"] }, archived: false, publishedRevisionId: { not: null } } }, select: { path: true } });
  return [...new Set([...fixed, ...entries.map(i => i.path)])].map(path => ({ url: `${base}${path}` }));
}
