import { z } from "zod";

export const PROFESSION_KEYS = ["pp", "plb", "pelelang"] as const;
export const professionNames: Record<string, string> = {
  pp: "Penilai Pemerintah", plb: "Penata Laksana Barang", pelelang: "Pelelang"
};
export const kindLabels = { profession: "Profil JF", article: "Artikel", regulation: "Regulasi", faq: "FAQ", page: "Halaman" };
export const moduleKinds = { "profil-jf": "profession", artikel: "article", regulasi: "regulation", faq: "faq", halaman: "page" } as const;
export type Kind = keyof typeof kindLabels;
export type Staff = { id: string; name: string; email: string; role: "editor" | "approver" | "admin"; mustChangePassword: boolean };
export type Source = { title: string; url?: string | null; internalRef?: string | null; publisher?: string; reviewedOn: string };

const text = z.string().trim().max(100000);
const list = z.array(z.string().trim().max(1000)).max(50);
export const payloadSchema = z.object({
  title: z.string().trim().max(200), summary: text, body: text,
  articleType: z.enum(["Kabar DJKN", "Panduan"]).default("Panduan"),
  sourceDate: z.string().max(10).default(""),
  short: z.string().max(30).default(""), definition: text.default(""),
  category: z.string().max(100).default(""), grades: list.default([]),
  tasks: list.default([]), competencies: list.default([]), nomenclature: text.default(""),
  number: z.string().max(100).default(""), year: z.string().max(4).default(""),
  publisher: z.string().max(200).default(""), officialUrl: z.string().max(2000).default(""),
  statusNote: text.default("Status dan riwayat aturan perlu ditinjau pada sumber resmi."),
  topic: z.string().max(100).default("Umum"), keywords: list.default([]),
  suggestionOrder: z.number().int().min(0).max(1000).default(100),
  relatedLinks: z.array(z.object({ label: z.string().max(200), href: z.string().max(2000) })).max(20).default([]),
  contactChannels: z.array(z.object({ type: z.enum(["url", "email", "phone"]), label: z.string().trim().max(100), value: z.string().trim().max(2000) })).max(10).default([]),
  serviceHours: z.string().trim().max(500).default(""),
  image: z.string().max(200).default(""), imageAlt: z.string().max(500).default(""),
  imageCredit: z.string().max(1000).default("")
});
export type Payload = z.infer<typeof payloadSchema>;
export type ContactChannel = Payload["contactChannels"][number];
export type PublicContent = {
  id: string; revisionId: string; kind: Kind; slug: string; payload: Payload;
  reviewedOn: string; publishedAt: string | null; professions: string[]; sources: Source[];
};
export function contentPath(kind: Kind, slug: string) {
  return kind === "profession" ? `/informasi/${slug}` : kind === "article" ? `/insight/${slug}`
    : kind === "page" ? `/${slug}` : `/${kind === "faq" ? "faq" : "regulasi"}#${slug}`;
}
export function safeUrl(value: string, internal = true) {
  if (internal && /^\/(?!\/)[^\\]*$/.test(value) && !/[\u0000-\u0020]/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function officialUrl(value: string) {
  const safe = safeUrl(value, false);
  if (!safe) return false;
  const host = new URL(safe).hostname;
  return host.endsWith(".go.id") || host === "go.id";
}
export function contactHref(channel: ContactChannel) {
  const value = channel.value.trim();
  if (channel.type === "url") return safeUrl(value, false);
  if (channel.type === "email") return z.email().safeParse(value).success ? `mailto:${value}` : null;
  // shortcut: nomor telepon tanpa ekstensi, perluas bila kanal resmi memakainya.
  const number = value.replace(/[ ().-]/g, "");
  return /^\+?\d{6,15}$/.test(number) ? `tel:${number}` : null;
}
export function calendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function normalizeQuery(value: string) { return value.normalize("NFKC").toLocaleLowerCase("id-ID").replace(/\s+/g, " ").trim(); }
export function queryParam(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first : "";
}
export function searchText(item: Pick<PublicContent, "payload" | "professions">) {
  return normalizeQuery([item.payload.title, item.payload.summary, item.payload.body, item.payload.number,
    item.payload.definition, ...item.payload.tasks, ...item.payload.competencies,
    ...item.payload.keywords, ...item.professions.map(key => professionNames[key] ?? key)].join(" "));
}
export function dateLabel(value: string | null, withTime = false) {
  if (!value) return "Belum diterbitkan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(value));
}
