import test from "node:test";
import assert from "node:assert/strict";
import { initialContent, previewEnabled } from "../src/lib/fixtures";
import { calendarDate, safeUrl, officialUrl, normalizeQuery, payloadSchema, queryParam } from "../src/lib/content-types";
import { inlineTokens } from "../src/lib/markdown";
import { validateForPublication } from "../src/lib/content-service";
import { hashPassword, verifyPassword } from "../src/lib/passwords";
import { sanitizeImage } from "../src/lib/media";
import sharp from "sharp";
test("materi awal utuh, tanggal tidak diubah, dan belum terbit", () => {
  for (const [kind, count] of [["profession", 3], ["article", 4], ["regulation", 6], ["faq", 13], ["page", 3]] as const) assert.equal(initialContent.filter(i => i.kind === kind).length, count);
  assert.equal(new Set(initialContent.map(i => `${i.kind}/${i.slug}`)).size, initialContent.length);
  for (const item of initialContent) { assert.equal(item.reviewedOn, "2026-10-21"); assert.equal(item.publishedAt, null); assert.ok(payloadSchema.safeParse(item.payload).success); }
});
test("URL dan Markdown menolak skema berbahaya serta HTML tidak ditafsirkan", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "//evil.test", "/\\evil.test", "http://example.org", "https://u:p@example.org", "/\n/evil.test"]) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl("/informasi/pelelang"), "/informasi/pelelang");
  assert.ok(officialUrl("https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023"));
  assert.equal(officialUrl("https://go.id.evil.test"), false);
  const tokens = inlineTokens('<script>alert(1)</script> [klik](javascript:evil) **tebal**');
  assert.ok(tokens.some(t => t.text.includes("<script>")));
  assert.ok(tokens.every(t => !t.href));
  assert.equal(tokens.find(t => t.bold)?.text, "tebal");
});
test("tanggal kalender dan normalisasi nomor regulasi", () => {
  assert.equal(calendarDate("2026-02-30"), false); assert.equal(calendarDate("2024-02-29"), true);
  assert.equal(normalizeQuery("  PMK   132   Tahun 2023 "), "pmk 132 tahun 2023");
  assert.equal(queryParam(["PMK", "132"]), "PMK"); assert.equal(queryParam(undefined), ""); assert.equal(queryParam({ q: "PMK" }), "");
});
test("pengajuan menuntut sumber, tinjauan, dan bidang", () => {
  const article = initialContent.find(i => i.kind === "article")!;
  assert.throws(() => validateForPublication(article.kind, article.payload, "", [], []));
  assert.doesNotThrow(() => validateForPublication(article.kind, article.payload, article.reviewedOn, article.sources, article.professions));
  assert.throws(() => validateForPublication(article.kind, article.payload, article.reviewedOn, [{ ...article.sources[0], reviewedOn: "2099-01-01" }], article.professions));
  const profile = initialContent.find(i => i.kind === "profession")!;
  assert.throws(() => validateForPublication(profile.kind, { ...profile.payload, tasks: [""] }, profile.reviewedOn, profile.sources, profile.professions));
});
test("pratinjau draf tidak dapat diaktifkan pada produksi", () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV; const flag = env.JAFA_CONTENT_PREVIEW;
  env.NODE_ENV = "production"; env.JAFA_CONTENT_PREVIEW = "true";
  try { assert.equal(previewEnabled(), false); }
  finally { if (previous === undefined) delete env.NODE_ENV; else env.NODE_ENV = previous; if (flag === undefined) delete env.JAFA_CONTENT_PREVIEW; else env.JAFA_CONTENT_PREVIEW = flag; }
});
test("sandi memakai salt acak, validasi panjang, dan verifikasi konstan", async () => {
  await assert.rejects(hashPassword("pendek")); const hash = await hashPassword("Sandi-uji-aman-123");
  assert.notEqual(hash, await hashPassword("Sandi-uji-aman-123"));
  assert.equal(await verifyPassword("Sandi-uji-aman-123", hash), true);
  assert.equal(await verifyPassword("salah", hash), false);
  assert.equal(await verifyPassword("x", "broken"), false);
});
test("gambar palsu dan SVG ditolak; JPEG dibersihkan menjadi WebP", async () => {
  await assert.rejects(sanitizeImage(Buffer.from("<svg></svg>"), "image/png"));
  await assert.rejects(sanitizeImage(Buffer.from("<svg></svg>"), "image/svg+xml"));
  await assert.rejects(sanitizeImage(new Uint8Array(5 * 1024 * 1024 + 1), "image/jpeg"));
  const input = await sharp({ create: { width: 8, height: 6, channels: 3, background: "red" } }).jpeg().withMetadata().toBuffer();
  const result = await sanitizeImage(input, "image/jpeg"); const metadata = await sharp(result.data).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(metadata.exif, undefined); assert.equal(metadata.width, 8);
});
