import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extractPdf, MAX_PDF_BYTES } from "../src/lib/documents";
import { contentPath } from "../src/lib/content-types";
import { pdfFixture } from "./fixtures/pdf";

test("PDF mempertahankan nomor halaman, teks dan checksum serta menandai halaman tanpa teks", async () => {
  const lines = ["Pasal 1. Sumber sintetis yang pertama untuk tinjauan.", "Pasal 2. Sumber sintetis kedua beserta lampiran."];
  const result = await extractPdf(pdfFixture(lines));
  assert.equal(result.needsOcr, false); assert.match(result.parserVersion, /^pdfjs-6\.5\.438-/);
  assert.deepEqual(result.pages.map(page => page.number), [1, 2]);
  for (const [index, page] of result.pages.entries()) {
    assert.equal(page.text, lines[index]);
    assert.equal(page.checksum, createHash("sha256").update(page.text).digest("hex"));
  }
  const scanned = await extractPdf(pdfFixture([lines[0], ""]));
  assert.equal(scanned.needsOcr, true); assert.equal(scanned.pages[1].text, "");
});
test("PDF palsu, rusak, terlalu besar/banyak halaman dan JavaScript ditolak", async () => {
  for (const bytes of [Buffer.from("bukan PDF"), Buffer.from("%PDF-1.7\nrusak\n%%EOF"), pdfFixture().subarray(0, 100)]) await assert.rejects(extractPdf(bytes), { status: 400 });
  await assert.rejects(extractPdf(Buffer.alloc(MAX_PDF_BYTES + 1)), { status: 413 });
  await assert.rejects(extractPdf(pdfFixture(Array.from({ length: 501 }, () => ""))), /500 halaman/);
  await assert.rejects(extractPdf(pdfFixture(undefined, true)), /JavaScript/);
  for (const name of ["encrypted.pdf", "encrypted-empty.pdf"]) await assert.rejects(extractPdf(await readFile(`tests/fixtures/${name}`)), /terenkripsi/);
  // @ts-expect-error Sumber PDF tidak boleh memakai default path regulasi pada pemanggil tidak bertipe.
  assert.throws(() => contentPath("knowledge", "privat"), /URL publik/);
});
