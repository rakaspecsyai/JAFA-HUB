# PRD tambahan: asisten RAG Jafa Hub

Status 12 November 2026: **R2a selesai lokal** untuk unggah PDF privat, ekstraksi/halaman, pratinjau dan persetujuan sumber. R2b indeks/retrieval dan R3/R4 generasi/evaluasi belum selesai; AI belum aktif. Panduan implementasi dan batas di [DOKUMEN-PDF.md](DOKUMEN-PDF.md), bukti aktual di [VERIFICATION.md](VERIFICATION.md). Gerbang rilis PRD utama tetap berlaku.

## Keputusan pengguna dan keputusan terbuka

| Hal | Keadaan |
| --- | --- |
| Arah produk | Pengembangan RAG paralel dengan C2 dan beta setelah evaluasi disetujui |
| Sumber utama MVP | PDF resmi undang-undang/peraturan Jabatan Fungsional, akan diunggah pengguna kemudian; bukan mengambil korpus dari materi prototipe secara otomatis |
| Deployment model | Pengguna memilih API hosted karena tidak menyediakan perangkat untuk menjalankan model lokal; embedding dan generasi menggunakan API |
| Biaya AI | Pengguna mengizinkan anggaran API yang murah. Jawaban Rp0 sebelumnya **digantikan keputusan ini untuk komponen AI**; anggaran hosting lain tidak ikut berubah |
| Penyedia/model | Rekomendasi awal OpenAI GPT-6 Luna + text-embedding-3-small; belum dipilih pengguna, belum dibuktikan akses akun atau mutunya pada PDF pengguna |
| Batas pilot | Usulan US$5/bulan untuk komponen API, belum ditetapkan pengguna; bukan biaya langganan atau klaim minimum top-up |
| Dokumen/data | PDF, URL resmi, status/versi peraturan dan pertanyaan acuan belum diterima; jangan mengarangnya |

## Tujuan dan batas MVP

Asisten membantu pengunjung menemukan dan memahami isi peraturan JF yang sudah ditinjau. Jawaban berbahasa Indonesia menyertakan rujukan dokumen dan lokasi teks. Saat bukti tidak cukup atau sumber bertentangan tanpa metadata yang jelas, asisten menjelaskan keterbatasan dan mengarahkan ke sumber/petugas.

MVP mencakup ingest PDF privat, peninjauan/persetujuan, pencarian konteks, generasi API, kutipan dan fallback. FAQ terkurasi tetap berfungsi dengan asal jawaban yang ditampilkan jelas. Riwayat awal tetap di memori tab; pertanyaan mandiri menjadi cakupan uji awal. Penafsiran percakapan lanjutan yang ambigu harus meminta penjelasan, bukan menebak aturan yang dimaksud.

Di luar MVP: agen yang mengubah CMS, persetujuan otomatis, penetapan PAK/keputusan karier, pelatihan model sendiri, suara, personalisasi berbasis NIP, crawler URL bebas, dan unduhan publik PDF yang diunggah. Data internal yang tidak disetujui untuk publik tidak masuk asisten publik. Kalkulator Angka Kredit tetap memakai fungsi deterministik yang ada; AI tidak mengganti rumusnya.

## Alur PDF dan tata kelola

1. **Unggah sebagai draf.** Editor mengunggah PDF ke penyimpanan persisten privat di luar `public/`. Simpan ID acak, checksum, ukuran dan metadata. PDF resmi tidak otomatis dianggap disetujui. Endpoint gambar `/api/media` tetap untuk gambar dan tidak dipakai menerima PDF.
2. **Validasi dan ekstraksi.** Verifikasi isi PDF, batas ukuran/halaman/waktu parsing; jangan menjalankan script/lampiran atau mengambil URL tertanam. PDF terenkripsi/rusak ditolak dengan pesan aman. PDF teks diproses lebih dahulu; hasil pindai ditandai perlu OCR/peninjauan sebelum dapat diajukan. Tidak menambah layanan OCR berbayar secara otomatis.
3. **Pertahankan lokasi sumber.** Simpan teks per halaman dan batas paragraf/pasal/ayat yang benar-benar terdeteksi. Jangan menebak nomor pasal/halaman. Sebut nomor halaman PDF jika berbeda dari nomor tercetak. Tabel/lampiran yang gagal diekstrak ditandai, tidak diam-diam dianggap terbaca lengkap.
4. **Tinjauan dan persetujuan.** Editor mengisi judul, nomor/tahun, penerbit, URL HTTPS resmi, tanggal tinjauan, serta status/relasi perubahan peraturan yang diverifikasi. Penyetuju memeriksa PDF dan pratinjau teks. Gunakan pemisahan peran dan catatan kontributor per revisi yang sudah ada; seluruh kontributor dilarang menyetujui revisi sendiri. Admin akun tidak menjadi penyetuju konten.
5. **Indeks setelah persetujuan.** Pekerjaan embedding berjalan di luar transaksi publikasi melalui job PostgreSQL; tidak perlu layanan antrean baru untuk MVP. Simpan identitas revisi, checksum teks/pemecahan, model embedding dan dimensinya. Retry tidak mengindeks versi basi atau membayar ulang potongan teks identik dengan konfigurasi embedding sama.
6. **Revisi/penarikan.** PDF dan hasil ekstraksi yang disetujui tidak ditimpa; perubahan menjadi revisi baru. Retrieval memeriksa revisi terbit dan status aktual di database. Penarikan/arsip langsung mengeluarkan sumber dari retrieval walau penghapusan vektor belum selesai. Sebelum jawaban final dikirim, periksa kembali kelayakan sumber; bila berubah, batalkan hasil dan lakukan fallback/retry terbatas.

R2a menerapkan batas pilot 20 MiB dan 500 halaman per PDF teks. UI unggah/pratinjau sudah tersedia pada CMS → Sumber PDF, dengan penandaan OCR dan konfirmasi pemeriksaan teks/tabel/lampiran. Batas ini baru dibuktikan pada fixture sintetis; kalibrasi PDF resmi pengguna tetap diperlukan.

## Rancangan teknis yang memakai kode sekarang

- **Next.js/backend dan panel asisten dipakai ulang.** Tambahkan jalur RAG server terpisah dari pencocokan FAQ; UI membedakan jawaban FAQ, AI beta, bukti kurang dan gangguan provider. API key hanya di server, bukan browser atau repository.
- **Revisi yang sama menjadi pusat kelayakan.** R2a memakai jenis konten pengetahuan pada alur `ContentItem/ContentRevision`, dengan aset PDF/halaman ekstraksi terpisah. Payload/form hanya membawa metadata/ID, bukan seluruh teks PDF melalui input tersembunyi 150 KB. Catatan persetujuan dan kontributor memakai aturan layanan yang sama.
- **Public query harus eksplisit.** Penambahan jenis pengetahuan wajib memperbarui `Kind`, `contentPath`, pemetaan modul, validator dan query pencarian/sitemap yang terdampak. PDF privat tidak boleh jatuh ke default URL regulasi atau terindeks publik karena filter lama `kind != page`. Metadata sumber yang boleh dilihat publik dibentuk secara eksplisit; raw file tetap akses petugas.
- **PostgreSQL + pgvector menjadi rancangan awal.** Gabungkan pencarian kata kunci/nomor peraturan dan kemiripan makna. Pilihan jumlah potongan dan pemeringkatan dibuktikan oleh pertanyaan acuan. Penyedia embedding menerima teks yang sudah ditinjau; model jawaban hanya menerima konteks terpilih, bukan seluruh PDF setiap pertanyaan.
- **Siapkan extension tanpa menaikkan hak aplikasi.** Image PostgreSQL C1 belum memasang pgvector. Provisioning extension dilakukan admin pada database uji, sebelum migrasi yang memerlukannya; role aplikasi `jafa` tetap non-superuser. Paket PGlite terpasang menyediakan modul vector, tetapi loader saat ini belum mengaktifkannya: dukungan uji/kompatibilitas harus diselesaikan sebelum migrasi umum, tanpa membuka/migrasikan data pengembangan pengguna otomatis.
- **Jawaban dan kutipan.** Model mengembalikan jawaban dan ID sumber yang tersedia. Backend memvalidasi ID, revisi dan halaman, lalu membentuk tautan dari metadata resmi; jangan mempercayai URL yang dibuat model. Teks PDF diperlakukan sebagai data, tidak sebagai instruksi untuk mengubah izin atau menjalankan tools. Model tidak memiliki tools mutasi CMS.

MVP mengembalikan jawaban final setelah validasi sumber. Streaming dan konteks panjang ditunda sampai kebutuhan/biayanya terbukti. Tidak menambah framework agen, vector database terpisah atau layanan file-search berbayar sebelum diperlukan.

## Kandidat API dan perhitungan biaya

Tarif resmi ditinjau **11 November 2026**, USD per satu juta token, input tidak tercache, mode standar. Ini perbandingan kandidat yang ditinjau, bukan klaim termurah di seluruh pasar. Sumber resmi ada di akhir dokumen. Mutu Bahasa Indonesia/hukum dan akses akun belum diuji.

| Model generatif | Input | Output | Estimasi per 1.000 pertanyaan |
| --- | --- | --- | --- |
| GPT-6 Luna | US$0,10 | US$0,50 | US$0,55 |
| DeepSeek Flash, off-peak | US$0,15 | US$0,60 | US$0,75 |
| DeepSeek Flash, peak | US$0,30 | US$1,20 | US$1,50 |
| Gemini 3.5 Flash-Lite | US$0,30 | US$2,50 | US$2,15 |

Asumsi tiap pertanyaan: **3.000 token input total** (instruksi, pertanyaan dan potongan dokumen), **500 token output berbayar total**, tanpa retry/tools/search/penulisan cache. Rumus per 1.000: `3 × tarif input + 0,5 × tarif output`. Token penalaran yang dibebankan termasuk anggaran output, bukan tambahan tersembunyi di luar asumsi. GPT-6 Luna mendukung `reasoning.effort=none`; itu kandidat awal pilot agar biaya bisa diperkirakan, lalu mutu diuji.

Embedding awal yang diusulkan: `text-embedding-3-small`, **US$0,02 per satu juta token yang dikirim untuk embedding dokumen** pada tarif standar, termasuk pengulangan akibat overlap/versi bila ada. Pertanyaan juga memerlukan embedding: asumsi 100 token per pertanyaan menambah **US$0,002 per 1.000**. Pada tarif input biasa, total kandidat satu penyedia sekitar **US$0,552 per 1.000 pertanyaan**, ditambah embedding dokumen yang berubah.

Untuk anggaran, perhitungkan cache-write GPT-6 Luna: default lifetime 30 menit memakai tarif input 1,25× untuk token yang ditulis, **menggantikan** tarif input biasa, bukan ditambah lagi. Jika seluruh 3 juta input pada contoh ditulis pada tarif itu, biaya model menjadi `3 × 0,125 + 0,5 × 0,50 = US$0,625`; dengan embedding pertanyaan menjadi **US$0,627 per 1.000**. Rencanakan sekitar **US$0,55–0,63**, bukan menjanjikan cache selalu menghemat. Tidak mengaktifkan lifetime 12 jam pada baseline. Satu juta token dokumen awal + 1.000 pertanyaan pada kedua skenario sekitar **US$0,572–0,647**. Ini bukan pemetaan halaman PDF ke token atau janji tagihan tetap.

Biaya hosting/database/penyimpanan, OCR bila diperlukan, token di atas asumsi, retry, pajak, kurs/biaya pembayaran, syarat saldo awal dan perubahan tarif belum termasuk. Ukur token nyata setelah PDF tersedia. Harga cached input, Batch/Flex, promo/free tier dan tools pencarian web tidak dipakai untuk memperkecil estimasi chat interaktif. RAG mencari korpus sendiri; tidak memerlukan web-search/file-search provider pada MVP.

GPT-5 nano tidak dijadikan baseline proyek baru karena halaman model menandainya deprecated. Gemini 2.5 Flash-Lite memang bertarif rendah tetapi akses model 2.5 dibatasi untuk pengguna lama; tidak dijanjikan kepada akun baru. Ketersediaan GPT-6 Luna juga harus dibuktikan pada akun API yang dipilih, bukan disimpulkan dari tabel harga/rate limit.

## Pengendalian biaya dan data

- Nominal bulanan belum ditetapkan. Usulan pilot US$5/bulan perlu dipilih pengguna sebelum aktivasi berbayar; belum ada top-up, API key atau panggilan model berbayar dalam R1.
- Indeks hanya revisi yang disetujui; embedding potongan sama dipakai ulang. Batasi input/output, durasi, antrean, konkurensi dan retry. Simpan statistik token/durasi/biaya tanpa isi pertanyaan; hentikan permintaan baru saat kuota aplikasi habis. Batas dashboard provider tidak diasumsikan sebagai hard cap aplikasi.
- Pertanyaan/riwayat tetap di memori tab dan tidak disimpan ke log/database aplikasi. Penyerahan teks ke API cloud harus dinyatakan pada privasi: pertanyaan dan konteks terpilih dikirim keluar server. Pemilihan akun/lokasi/retensi provider ditinjau sebelum beta.
- Bila memilih Responses API, usulkan `store:false` dan tidak memakai layanan riwayat/file/vector store provider. Ini tidak menjanjikan zero retention: dokumentasi OpenAI tetap mencantumkan retensi pemantauan penyalahgunaan hingga 30 hari; kelayakan/konfigurasi khusus berbeda. Kebijakan privasi wajib menjelaskan perbedaan penyimpanan aplikasi dan provider.
- API key dikonfigurasi privat di server oleh pemilik akun; jangan dikirim melalui chat. Aktivasi beta terpisah dari portal; saat model tidak tersedia, tampilkan kegagalan/fallback FAQ secara jujur. Label FAQ yang sekarang tidak diubah menjadi AI sebelum generasi benar-benar aktif.

## Paket kerja dan bukti penerimaan

| Paket | Hasil terbatas | Bukti selesai |
| --- | --- | --- |
| R1 | Dokumen ini, keputusan PDF/API cloud dan proposal biaya; pilihan model/cap tetap ditandai terbuka | Sumber/batas/data/aturan tercatat, aritmetika biaya diperiksa, tidak ada klaim implementasi/model aktif |
| R2a | Unggah PDF privat, ekstraksi/pratinjau dan revisi/persetujuan sumber | Implementasi lokal; fixture valid/rusak/pindai/terenkripsi/JavaScript, akses tiga peran, checksum/halaman, revisi immutable dan backup/restore diperiksa. Bukti aktual di VERIFICATION.md |
| R2b | Provisioning vector, job indeks/embedding, cache/retry dan retrieval | Belum diimplementasikan. Retry idempoten, tidak mengindeks versi basi, kelayakan sumber ditarik dan kompatibilitas extension dibuktikan sebelum aktivasi |
| R3 | Endpoint RAG dan integrasi panel dengan kutipan/fallback/batas penggunaan | API nyata hanya setelah key/cap/sumber siap; rujukan harus berasal dari konteks, error provider/input tetap, pemakaian dibatasi dan tidak ada tools mutasi |
| R4 | Evaluasi dokumen pengguna dan beta | Penilai substansi memeriksa kesesuaian jawaban, halaman/pasal, konteks ditemukan, bukti kurang/konflik sumber, dokumen lama/ditarik, Bahasa Indonesia, latensi dan token/biaya; ambang mutu ditetapkan dari pilot sebelum publik |

Keterlibatan pengguna berikutnya: menyediakan beberapa PDF resmi dan URL asal/metadata yang diketahui; memilih penyedia dan batas biaya; menunjuk peninjau substansi. PDF belum tersedia, sehingga kebenaran ekstraksi, mutu retrieval/generasi dan jumlah token belum bisa dinyatakan lulus. C2 dan kesiapan portal terus menjadi jalur tersendiri; RAG tidak mengubah publikasi draf atau gerbang UAT portal.

## Rujukan resmi

- [Konsep RAG](https://arxiv.org/abs/2005.11401), [evaluasi retrieval/faithfulness](https://arxiv.org/abs/2309.15217), [pgvector hybrid search](https://github.com/pgvector/pgvector#hybrid-search).
- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [harga OpenAI](https://developers.openai.com/api/docs/pricing), [prompt caching dan tarif write](https://developers.openai.com/api/docs/guides/prompt-caching), [text-embedding-3-small](https://developers.openai.com/api/docs/models/text-embedding-3-small), [status GPT-5 nano](https://developers.openai.com/api/docs/models/gpt-5-nano).
- [Gemini pricing](https://aistudio.google.com/docs/pricing), [akses Gemini 2.5 Flash-Lite](https://aistudio.google.com/docs/models/gemini-2.5-flash-lite), [DeepSeek pricing dan jam peak/off-peak](https://api-docs.deepseek.com/quick_start/pricing/).
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).
