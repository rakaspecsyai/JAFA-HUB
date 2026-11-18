# Sumber PDF privat — R2a

R2a menyiapkan korpus: unggah, ekstraksi per halaman, pratinjau, revisi dan persetujuan sumber. R2b menambah indeks potongan, embedding dan retrieval privat (lihat [Indeks dan retrieval](#indeks-dan-retrieval-r2b)). R3 menambah [endpoint jawaban dan panel AI beta](ASISTEN-RAG.md), yang mati secara default. Teks potongan baru dikirim ke OpenAI setelah key, batas bulanan dan tarif embedding dikonfigurasi.

## Alur petugas

1. Editor membuka **CMS → Sumber PDF → Tambah sumber pdf** (`/admin/dokumen/baru`). Isi judul, slug internal, ringkasan, tanggal tinjauan, nomor/tahun, penerbit, URL resmi HTTPS `.go.id`, bidang JF serta rujukan.
2. Pilih status peraturan yang sudah diverifikasi dan tulis hasil pemeriksaan status/relasi perubahan pada catatan. Status belum diverifikasi tidak dapat diajukan. Status Dicabut tetap dicatat sebagai riwayat tetapi tidak dipotong, di-embed atau dicari; status Diubah tetap dicari dengan label.
3. Unggah PDF teks. Periksa setiap halaman hasil ekstraksi dan unduh PDF asli melalui tautan petugas untuk membandingkan teks, tabel dan lampiran. Nomor halaman selalu nomor berkas PDF, bukan nomor tercetak yang ditebak.
4. Konfirmasikan bahwa seluruh hasil ekstraksi sudah dicocokkan, simpan draf, lalu ajukan. PDF dengan halaman tanpa teks yang memadai diblokir untuk OCR/pemeriksaan; tidak ada layanan OCR otomatis. Setelah diperbaiki, unggah salinan PDF teks baru.
5. Penyetuju memeriksa PDF, teks halaman, sumber dan metadata, kemudian mengembalikan dengan catatan atau memilih **Setujui sumber PDF**. Semua kontributor revisi tetap dilarang memberi keputusan sendiri, termasuk sesudah perubahan peran. Admin akun tidak mempunyai akses konten/file.
6. Persetujuan memicu indeks sesudah respons; PDF tetap privat. Perubahan setelah persetujuan membuat revisi baru. Unggahan pengganti membuat aset baru, sehingga PDF/ekstraksi pada revisi disetujui sebelumnya tetap utuh. Konfirmasi tinjauan pada formulir direset saat PDF diganti.
7. Penyetuju dapat **Tarik sumber dari korpus** dengan alasan. Penunjuk revisi yang disetujui dilepas; riwayat dan file tetap tersimpan privat. Retrieval membaca penunjuk ini pada setiap pencarian sehingga penarikan langsung berlaku; R3 memeriksa ulang seluruh konteks sebelum mengirim jawaban.

## Batas dan penyimpanan

- PDF maksimal **20 MiB, 500 halaman**, dengan MIME dan penanda isi PDF diperiksa. PDF rusak, terenkripsi (termasuk password pembaca kosong), JavaScript dan XFA tidak didukung.
- Ekstraksi memakai **PDF.js 6.5.438** di worker server, tanpa evaluasi skrip atau pengambilan URL. Batas waktu 20 detik, paling banyak dua worker per proses, heap V8 worker 128 MiB; ini bukan batas total memori mesin. Hasil maksimal 100.000 karakter per halaman dan 5 juta karakter per dokumen. Unggahan dibatasi 10 per petugas dalam 15 menit.
- Kurang dari 20 huruf pada satu halaman menandai dokumen perlu OCR/pemeriksaan dan memblokir pengajuan. Ini heuristik awal: halaman kosong yang disengaja juga terblokir. Kalibrasi dengan PDF resmi pengguna belum dilakukan. Pemeriksaan manual tetap wajib untuk isi tabel, lampiran, urutan kolom, simbol dan teks hasil pindai; nomor pasal/ayat tidak dibuat otomatis.
- ID dan nama penyimpanan acak; file disimpan pada `MEDIA_DIRECTORY/documents/` dengan izin 0600. Tidak memakai `public/` atau endpoint gambar. Nama berkas asli dan metadata penulis PDF tidak disalin menjadi metadata konten.
- `DocumentAsset` menyimpan SHA-256, ukuran, jumlah halaman, status OCR, identitas parser dan pengunggah. `DocumentPage` menyimpan teks/checksum per halaman. `RevisionDocument` mengikat aset ke revisi; payload formulir hanya membawa ID dan metadata, bukan seluruh teks PDF.
- GET `/api/documents/[id]?page=1` dan `/api/documents/[id]/file` hanya untuk editor/penyetuju dengan sesi sah dan sandi awal sudah diganti. Anonim/admin menerima 404, termasuk setelah persetujuan. Respons `private, no-store`; file berupa attachment, checksum diperiksa saat dibaca, CSP sandbox dan nosniff diterapkan.
- Jenis `knowledge` tidak mempunyai URL publik. Query publik memakai daftar jenis eksplisit, dan sumber PDF tidak dibuatkan proyeksi pencarian/sitemap. Halaman `/regulasi` tetap berisi tautan peraturan yang disetujui melalui modul regulasi.
- PDF dan revisi tidak dihapus otomatis, termasuk unggahan yang belum dilampirkan. Kapasitas/retensi serta pengawasan disk mengikuti gerbang operasional. Kegagalan transaksi biasa membersihkan file baru; penghentian paksa dapat meninggalkan file tanpa metadata untuk pemeriksaan petugas.

## Indeks dan retrieval (R2b)

- **Pemicu.** Persetujuan sumber menjalankan indeks lewat `after()` sesudah respons, di luar transaksi persetujuan. Satu antrean per proses; pemicu berikutnya menunggu putaran sebelumnya. Retry: persetujuan berikutnya, atau `npm run rag:index` (dev, server dihentikan karena PGlite satu proses) / `runtime index` (produksi).
- **Potongan.** Dari teks halaman yang disetujui: maksimal 1.200 karakter, tidak melintasi halaman, dan dipecah pada baris "Pasal N" yang benar-benar terdeteksi. Nomor halaman adalah nomor berkas PDF; nomor pasal/ayat tidak dibuat otomatis. Potongan dibuat tanpa key sehingga pencarian kata kunci langsung berjalan.
- **Embedding.** OpenAI `text-embedding-3-small` (1.536 dimensi), hanya bila key, `JAFA_AI_MONTHLY_USD` dan `JAFA_AI_EMBEDDING_USD_PER_MILLION` lengkap. R3 menambahkan reservasi pada anggaran bersama sebelum setiap panggilan API. Satu kali per teks unik (checksum + model) dan dipakai ulang lintas revisi, sehingga revisi metadata dengan PDF sama tidak dibayar ulang. Satu putaran dibatasi jumlah teks yang menunggu di awal dan berhenti pada kegagalan penyedia/anggaran; tidak ada retry otomatis berulang.
- **Kelayakan.** Setiap pencarian membaca penunjuk terbit: hanya revisi sumber disetujui, tidak diarsipkan, status Berlaku/Diubah. Revisi lama dan sumber yang ditarik langsung keluar dari hasil walau vektornya tetap tersimpan sebagai riwayat. Sumber Dicabut tidak dipotong atau di-embed.
- **Pencarian.** Full-text PostgreSQL `simple` atas teks potongan beserta judul/nomor/tahun, digabung dengan jarak cosine pgvector melalui reciprocal rank fusion. Hasil memuat teks, halaman, judul/nomor/tahun, status/catatan dan URL resmi. Bila embedding pertanyaan gagal, hasil kembali ke kata kunci dengan `semantic=false`. Endpoint R3 tersedia dengan flag mati; cara kerja dan batas di [ASISTEN-RAG.md](ASISTEN-RAG.md).
- **Batas.** Ukuran potongan, jumlah hasil (6) dan peringkat belum dikalibrasi; tidak ada indeks GIN/HNSW karena korpus pilot kecil. Kalibrasi menunggu PDF resmi dan pertanyaan acuan.

## Migrasi dan runtime

Migrasi R2b `202611130001_knowledge_index` membuat extension `vector` dan tabel `KnowledgeChunk`. PGlite memuat modul vector bawaannya. Image database memasang pgvector dan membuat extension pada volume baru. Untuk volume lama, admin database menjalankan `CREATE EXTENSION vector` sebelum migrasi (lihat [RUNTIME.md](RUNTIME.md)); role aplikasi tidak mendapat hak superuser.

Migrasi R3 `202611160001_ai_usage` menambah agregat anggaran/token/durasi per bulan tanpa menyimpan pertanyaan atau jawaban. Backup/restore lokal mencakup tabel tersebut.

Migrasi tambahan `202611120001_private_documents` menambah nilai enum dan tiga tabel; tidak menulis ulang materi/akun lama. Payload lama mendapat default kosong saat dibaca. Pemeriksaan pengembangan memakai database/media fixture, tanpa membuka atau memigrasikan `.local/development-pg` pengguna.

Launcher `npm run dev` akan menerapkan migrasi baru saat pengguna memulai ulang lingkungan lokal seperti biasa. Hanya satu proses boleh membuka PGlite. Untuk runtime produksi, backup database/media dahulu lalu gunakan perintah migrasi manual pada [RUNTIME.md](RUNTIME.md); startup aplikasi tetap tidak menjalankan migrasi. Nilai enum baru perlu diperhitungkan sebelum mengembalikan kode ke rilis lama; jangan menghapus sumber atau memulihkan backup otomatis untuk melakukan rollback.

Dockerfile sudah menyalin `src/` beserta `src/lib/pdf-worker.mjs`. Artefak host juga harus menyertakan file worker dan dependensi dari lockfile; jangan menganggap output `.next` saja cukup. PDF.js adalah dependency aplikasi; tidak memerlukan Poppler, Python, model lokal atau API key saat runtime. Volume media yang sudah ada digunakan kembali, termasuk backup/restore rekursif pada subdirektori `documents/`.

## Pemeriksaan

```bash
npm run typecheck -- --incremental false
npm test
npm run test:integration
npm run test:e2e -- documents.spec.ts
# Proses ulang indeks/embedding yang tertunda (dev dihentikan lebih dahulu):
npm run rag:index
```

`tests/fixtures/pdf.ts` menghasilkan PDF sintetis dengan xref/halaman nyata. Dua fixture AES-256 dibuat dari teks sintetis memakai ReportLab/pypdf yang sudah tersedia saat pembuatan; menjalankan tes hanya membaca berkas fixture dan tidak membutuhkan Python. Pemeriksa native yang sudah ada juga mencakup unggah/ekstraksi/persetujuan/penarikan PDF melalui image produksi, PostgreSQL dan HTTPS lokal. Perintahnya ada di [RUNTIME.md](RUNTIME.md); hasil aktual dan batas setiap eksekusi dicatat di [VERIFICATION.md](VERIFICATION.md).

PDF resmi pengguna, penilaian substansi, API berbayar nyata, pengujian korpus besar dan kualitas jawaban belum dibuktikan oleh fixture ini. Dasar fitur: [PRD tambahan RAG](PRD-RAG-Jafa-Hub.md), [API PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).
