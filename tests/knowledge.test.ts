import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chunkPages, keywordTerms } from "../src/lib/knowledge";

test("potongan sumber tetap dalam halaman, mulai pada Pasal terdeteksi, dan checksum stabil", () => {
  const long = Array.from({ length: 400 }, (_, index) => `kata${index}`).join(" ");
  const chunks = chunkPages([{ number: 1, text: "Menimbang bahwa\nPasal 1\nAyat satu.\nPasal 2\nAyat dua." }, { number: 2, text: long }, { number: 3, text: "x".repeat(2500) }]);
  assert.deepEqual(chunks.slice(0, 3).map(chunk => [chunk.pageNumber, chunk.text]), [[1, "Menimbang bahwa"], [1, "Pasal 1\nAyat satu."], [1, "Pasal 2\nAyat dua."]]);
  assert.equal(chunks.filter(chunk => chunk.pageNumber === 2).map(chunk => chunk.text).join(" "), long);
  assert.ok(chunks.filter(chunk => chunk.pageNumber === 2).length > 1);
  assert.equal(chunks.filter(chunk => chunk.pageNumber === 3).map(chunk => chunk.text).join(""), "x".repeat(2500));
  assert.ok(chunks.every(chunk => chunk.text.length <= 1200 && chunk.checksum === createHash("sha256").update(chunk.text).digest("hex")));
  assert.deepEqual(chunks.map(chunk => chunk.position), chunks.map((_, index) => index));
  assert.deepEqual(chunkPages([{ number: 1, text: " \n " }]), []);
});

test("kata kunci membuang kata umum tetapi mempertahankan singkatan dan nomor peraturan", () => {
  assert.deepEqual(keywordTerms("Apa tugas Penilai Pemerintah menurut PP 18 tahun 2021?"), ["tugas", "penilai", "pemerintah", "menurut", "pp", "18", "tahun", "2021"]);
  assert.deepEqual(keywordTerms("apa yang di?"), []);
});
