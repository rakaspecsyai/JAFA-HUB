# Sumber PDF privat — R2a

R2a menyiapkan korpus: unggah, ekstraksi per halaman, pratinjau, revisi dan persetujuan sumber. Panel publik tetap memakai FAQ terkurasi. Embedding, pgvector, antrean indeks, retrieval dan API generatif merupakan pekerjaan R2b/R3; persetujuan PDF belum mengaktifkan AI atau mengirim teks ke penyedia eksternal.

## Alur petugas

1. Editor membuka **CMS → Sumber PDF → Tambah sumber pdf** (`/admin/dokumen/baru`). Isi judul, slug internal, ringkasan, tanggal tinjauan, nomor/tahun, penerbit, URL resmi HTTPS `.go.id`, bidang JF serta rujukan.
2. Pilih status peraturan yang sudah diverifikasi dan tulis hasil pemeriksaan status/relasi perubahan pada catatan. Status belum diverifikasi tidak dapat diajukan. Status dicabut dapat dicatat untuk riwayat; kelayakan retrieval untuk status tersebut masih pekerjaan R2b.
3. Unggah PDF teks. Periksa setiap halaman hasil ekstraksi dan unduh PDF asli melalui tautan petugas untuk membandingkan teks, tabel dan lampiran. Nomor halaman selalu nomor berkas PDF, bukan nomor tercetak yang ditebak.
4. Konfirmasikan bahwa seluruh hasil ekstraksi sudah dicocokkan, simpan draf, lalu ajukan. PDF dengan halaman tanpa teks yang memadai diblokir untuk OCR/pemeriksaan; tidak ada layanan OCR otomatis. Setelah diperbaiki, unggah salinan PDF teks baru.
5. Penyetuju memeriksa PDF, teks halaman, sumber dan metadata, kemudian mengembalikan dengan catatan atau memilih **Setujui sumber PDF**. Semua kontributor revisi tetap dilarang memberi keputusan sendiri, termasuk sesudah perubahan peran. Admin akun tidak mempunyai akses konten/file.
6. Persetujuan menyiapkan sumber untuk tahap indeks; PDF tetap privat. Perubahan setelah persetujuan membuat revisi baru. Unggahan pengganti membuat aset baru, sehingga PDF/ekstraksi pada revisi disetujui sebelumnya tetap utuh. Konfirmasi tinjauan pada formulir direset saat PDF diganti.
7. Penyetuju dapat **Tarik sumber dari korpus** dengan alasan. Penunjuk revisi yang disetujui dilepas; riwayat dan file tetap tersimpan privat. R2b wajib memeriksa penunjuk ini sebelum retrieval dan sebelum mengirim jawaban.

## Batas dan penyimpanan

- PDF maksimal **20 MiB, 500 halaman**, dengan MIME dan penanda isi PDF diperiksa. PDF rusak, terenkripsi (termasuk password pembaca kosong), JavaScript dan XFA tidak didukung.
- Ekstraksi memakai **PDF.js 6.5.438** di worker server, tanpa evaluasi skrip atau pengambilan URL. Batas waktu 20 detik, paling banyak dua worker per proses, heap V8 worker 128 MiB; ini bukan batas total memori mesin. Hasil maksimal 100.000 karakter per halaman dan 5 juta karakter per dokumen. Unggahan dibatasi 10 per petugas dalam 15 menit.
- Kurang dari 20 huruf pada satu halaman menandai dokumen perlu OCR/pemeriksaan dan memblokir pengajuan. Ini heuristik awal: halaman kosong yang disengaja juga terblokir. Kalibrasi dengan PDF resmi pengguna belum dilakukan. Pemeriksaan manual tetap wajib untuk isi tabel, lampiran, urutan kolom, simbol dan teks hasil pindai; nomor pasal/ayat tidak dibuat otomatis.
- ID dan nama penyimpanan acak; file disimpan pada `MEDIA_DIRECTORY/documents/` dengan izin 0600. Tidak memakai `public/` atau endpoint gambar. Nama berkas asli dan metadata penulis PDF tidak disalin menjadi metadata konten.
- `DocumentAsset` menyimpan SHA-256, ukuran, jumlah halaman, status OCR, identitas parser dan pengunggah. `DocumentPage` menyimpan teks/checksum per halaman. `RevisionDocument` mengikat aset ke revisi; payload formulir hanya membawa ID dan metadata, bukan seluruh teks PDF.
- GET `/api/documents/[id]?page=1` dan `/api/documents/[id]/file` hanya untuk editor/penyetuju dengan sesi sah dan sandi awal sudah diganti. Anonim/admin menerima 404, termasuk setelah persetujuan. Respons `private, no-store`; file berupa attachment, checksum diperiksa saat dibaca, CSP sandbox dan nosniff diterapkan.
- Jenis `knowledge` tidak mempunyai URL publik. Query publik memakai daftar jenis eksplisit, dan sumber PDF tidak dibuatkan proyeksi pencarian/sitemap. Halaman `/regulasi` tetap berisi tautan peraturan yang disetujui melalui modul regulasi.
- PDF dan revisi tidak dihapus otomatis, termasuk unggahan yang belum dilampirkan. Kapasitas/retensi serta pengawasan disk mengikuti gerbang operasional. Kegagalan transaksi biasa membersihkan file baru; penghentian paksa dapat meninggalkan file tanpa metadata untuk pemeriksaan petugas.

## Migrasi dan runtime

Migrasi tambahan `202611120001_private_documents` menambah nilai enum dan tiga tabel; tidak menulis ulang materi/akun lama. Payload lama mendapat default kosong saat dibaca. Pemeriksaan pengembangan memakai database/media fixture, tanpa membuka atau memigrasikan `.local/development-pg` pengguna.

Launcher `npm run dev` akan menerapkan migrasi baru saat pengguna memulai ulang lingkungan lokal seperti biasa. Hanya satu proses boleh membuka PGlite. Untuk runtime produksi, backup database/media dahulu lalu gunakan perintah migrasi manual pada [RUNTIME.md](RUNTIME.md); startup aplikasi tetap tidak menjalankan migrasi. Nilai enum baru perlu diperhitungkan sebelum mengembalikan kode ke rilis lama; jangan menghapus sumber atau memulihkan backup otomatis untuk melakukan rollback.

Dockerfile sudah menyalin `src/` beserta `src/lib/pdf-worker.mjs`. Artefak host juga harus menyertakan file worker dan dependensi dari lockfile; jangan menganggap output `.next` saja cukup. PDF.js adalah dependency aplikasi; tidak memerlukan Poppler, Python, model lokal atau API key saat runtime. Volume media yang sudah ada digunakan kembali, termasuk backup/restore rekursif pada subdirektori `documents/`.

## Pemeriksaan

```bash
npm run typecheck -- --incremental false
npm test
npm run test:integration
npm run test:e2e -- documents.spec.ts
```

`tests/fixtures/pdf.ts` menghasilkan PDF sintetis dengan xref/halaman nyata. Dua fixture AES-256 dibuat dari teks sintetis memakai ReportLab/pypdf yang sudah tersedia saat pembuatan; menjalankan tes hanya membaca berkas fixture dan tidak membutuhkan Python. Pemeriksa native yang sudah ada juga mencakup unggah/ekstraksi/persetujuan/penarikan PDF melalui image produksi, PostgreSQL dan HTTPS lokal. Perintahnya ada di [RUNTIME.md](RUNTIME.md); hasil aktual dan batas setiap eksekusi dicatat di [VERIFICATION.md](VERIFICATION.md).

PDF resmi pengguna, penilaian substansi, indeks/embedding, pengujian corpus besar dan kualitas jawaban belum dibuktikan oleh fixture ini. Dasar fitur: [PRD tambahan RAG](PRD-RAG-Jafa-Hub.md), [API PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).
