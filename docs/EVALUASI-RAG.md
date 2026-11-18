# R4a: evaluasi pencarian kata kunci

Alat ini menyiapkan baseline retrieval dari pertanyaan acuan yang disusun peninjau. Ia membaca indeks sumber disetujui melalui fungsi pencarian yang sama dengan RAG, dengan embedding **dikunci mati**, lalu membuat laporan privat. Key dan anggaran yang sudah terpasang tidak menyebabkan panggilan API. Flag AI publik tidak diubah.

Ini belum menilai pencarian semantik, jawaban generatif, ketepatan penafsiran hukum atau kelayakan beta. Pilihan embedding tetap `text-embedding-3-small`; model pembuat jawaban, plafon/tarif, key dan evaluasi PDF resmi tetap diperlukan untuk tahap berikutnya.

## Menjalankan

1. Gunakan korpus evaluasi yang stabil, sebaiknya pada database terpisah. PDF resmi harus sudah diperiksa dan disetujui petugas berbeda serta mempunyai indeks potongan. Alat ini tidak mengunggah PDF, mengindeks, memigrasikan atau menerbitkan apa pun. Persiapan indeks mengikuti [DOKUMEN-PDF.md](DOKUMEN-PDF.md).
2. Bila memakai PGlite lokal, hentikan dev terlebih dahulu. Satu proses saja boleh membuka direktori database yang sama. Jangan hapus `.local` untuk menyiapkan evaluasi. Jika migrasi R2b/R3 belum diterapkan, backup dan ikuti [RUNTIME.md](RUNTIME.md) / [DATA-LOKAL.md](DATA-LOKAL.md).
3. Salin [contoh dataset sintetis](examples/rag-evaluation.json) ke direktori privat dan ganti pertanyaan, ID revisi, halaman PDF serta catatan jawaban acuannya. UUID contoh bukan sumber resmi dan memang akan ditolak pada korpus nyata.
4. Jalankan dengan tujuan laporan **baru**. Direktori induk tujuan harus sudah ada. Laporan di dalam repositori hanya diizinkan pada `.local`; path publik/sumber kode dan alias symlink ke sana ditolak.

```bash
npm run rag:evaluate -- --help
npm run rag:evaluate -- .local/pertanyaan-r4.json .local/evaluasi-r4-pertama
```

Konfigurasi database dibaca dari `.env` bila ada, atau environment. PGlite yang belum mempunyai `PG_VERSION` ditolak sebelum dibuka; evaluator tidak membuat database kosong pada path yang salah. Keluaran berupa `report.json` dalam direktori 0700, dengan berkas 0600. Tujuan yang sudah ada ditolak tanpa menimpa laporan. Konsol hanya mencetak ringkasan dan lokasi laporan; pertanyaan, kutipan dan catatan tidak dicetak. Jika proses gagal setelah membuat direktori, direktori itu dapat tetap ada untuk pemeriksaan; pilih nama baru untuk percobaan berikutnya.

## Format pertanyaan acuan

Dataset JSON maksimal 1 MiB, berisi `name` dan 1–100 `cases`. Setiap kasus mempunyai:

| Kolom | Isi |
| --- | --- |
| `id` | ID unik 1–60 karakter: huruf, angka, `_` atau `-` |
| `question` | Pertanyaan mandiri, 1–500 karakter |
| `expected` | `answer` atau `fallback`, sebagai target untuk peninjau; belum dibandingkan dengan keluaran model |
| `references` | Maksimal enam pasangan `revisionId` UUID dan `pageNumber` 1–500; tanpa duplikat |
| `notes` | Pokok jawaban atau alasan fallback yang telah ditinjau, 1–4.000 karakter |

Kasus `answer` wajib mempunyai halaman acuan. Setiap dataset harus menyertakan sedikitnya satu kasus jawaban bersumber sebagai kontrol, supaya korpus kosong tidak menghasilkan evaluasi yang tampak baik. Kasus `fallback` boleh tanpa acuan; kasus konflik dapat mencantumkan halaman relevan beserta penjelasan konflik pada catatan.

Gunakan nomor **halaman berkas PDF**, bukan nomor halaman cetak/pasal yang ditebak. ID revisi mengunci versi sumber: revisi lama, draf, arsip, Dicabut, ditarik, halaman tidak ada dan sumber yang belum terindeks ditolak sebelum penilaian. Peninjau memperbarui acuan secara sadar ketika versi yang disetujui berubah.

Petugas teknis dapat mengambil metadata acuan dari penunjuk revisi yang disetujui. Contoh kueri baca pada database evaluasi:

```sql
SELECT DISTINCT c.slug, r.id AS "revisionId", k."pageNumber"
FROM "ContentItem" c
JOIN "ContentRevision" r ON r.id = c."publishedRevisionId" AND r."itemId" = c.id
JOIN "KnowledgeChunk" k ON k."revisionId" = r.id
WHERE c.kind = 'knowledge' AND NOT c.archived AND r.status = 'approved'
  AND r.payload->>'regulationStatus' IN ('current', 'amended')
ORDER BY c.slug, r.id, k."pageNumber";
```

Untuk skenario penarikan/Dicabut, pertanyaan negatif tidak memakai revisi yang sudah tidak layak sebagai halaman acuan. Sertakan kontrol positif dari sumber lain yang masih layak dan jelaskan hasil yang diharapkan pada `notes`.

## Membaca hasil

Laporan memuat hash SHA-256 dataset yang dinormalisasi, urutan enam hasil, ID revisi/halaman, metadata/status/URL resmi, teks potongan serta checksum teks. Setiap kasus menyertakan durasi retrieval dan peringkat pertama setiap halaman acuan. `manualReview` tetap `null` untuk dilengkapi peninjau dalam salinan kerja privat.

- **Recall halaman @6:** jumlah halaman acuan yang ditemukan dibagi jumlah halaman acuan. Setiap pasangan kasus/halaman dihitung sekali; halaman yang sama pada dua pertanyaan tetap menjadi dua acuan. Beberapa potongan dari halaman yang sama pada satu kasus tidak menambah pembilang.
- **MRR:** rata-rata kebalikan peringkat halaman relevan pertama pada kasus dengan acuan; kasus tanpa hasil memberi 0. Kasus tanpa acuan tidak masuk penyebut.
- **P95 retrieval:** waktu fungsi pencarian hingga hasil diterima. Ini bukan latensi jawaban AI, beban produksi atau Core Web Vitals.
- `providerCalls=0`, biaya API run ini 0, `generationEvaluated=false` dan `betaReady=false`. Hasil sempurna tidak otomatis menyetujui beta.

Kode keluar 0 berarti laporan selesai dan semua halaman acuan ditemukan; 2 berarti laporan selesai tetapi ada halaman acuan yang terlewat; 1 berarti input, sumber, koneksi atau penyimpanan bermasalah. Penutupan PGlite mempertahankan status kegagalan ini.

Sumber acuan dan hasil yang terekam diperiksa kembali sebelum laporan dikembalikan. Perubahan sumber membatalkan laporan. Ini bukan snapshot seluruh korpus: gunakan korpus stabil tanpa mutasi CMS selama run, terutama bila mengevaluasi database native bersama proses lain.

## Peninjauan dan tahap berikutnya

Dataset disusun secara khusus dari materi resmi yang sudah disetujui, bukan mengumpulkan pertanyaan pengunjung. Berkas ini memang menyimpan pertanyaan acuan, kutipan dan catatan untuk evaluasi privat; kebijakan pertanyaan publik yang tidak disimpan ke database/log aplikasi tetap berlaku. Jangan menaruh key atau data pribadi pada dataset, Git atau laporan yang dibagikan.

Peninjau memeriksa kesesuaian halaman/kutipan, pokok ketentuan, status/riwayat perubahan, tabel/lampiran, variasi nomor/parafrasa, bukti kurang, konflik dan pertanyaan lanjutan ambigu. Setelah korpus dan keputusan biaya/model siap, evaluasi semantik dan generasi perlu menilai ketepatan setiap jawaban, fallback, kutipan, Bahasa Indonesia serta token/biaya/latensi nyata. Ambang mutu ditetapkan dari pilot sebelum aktivasi; alat R4a tidak menetapkannya sepihak.

Tidak ada model generatif, plafon, key, persetujuan privasi, atau sumber resmi yang diisi otomatis. Rincian aktivasi ada di [ASISTEN-RAG.md](ASISTEN-RAG.md), hasil pengujian alat di [VERIFICATION.md](VERIFICATION.md).
