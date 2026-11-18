# Asisten RAG: implementasi R3

R3 menambah endpoint dan pilihan AI beta pada panel asisten yang sudah ada. **Fitur mati secara default.** Adapter generatif awal memakai OpenAI Responses API; model generatif belum dipilih pengguna. Tidak ada API key, model, nominal anggaran, atau PDF pengguna yang diisi otomatis. Aktivasi nyata dan evaluasi substansi tetap memerlukan keputusan pemilik layanan.

## Perilaku

- FAQ terkurasi tetap menjadi pilihan awal. Panel menampilkan pilihan AI hanya ketika konfigurasi server lengkap dan `JAFA_RAG_ENABLED=true`.
- `GET /api/rag` hanya mengembalikan ketersediaan, tanpa key/model/anggaran. `POST /api/rag` menerima satu pertanyaan mandiri, 1–500 karakter, dengan origin yang sesuai. Riwayat atau field tambahan ditolak. Respons memakai `no-store`.
- Pertanyaan dicari pada sumber PDF yang disetujui dan masih berlaku dalam korpus. Sumber Dicabut, draf, arsip, penarikan dan revisi lama tidak dicari. Diubah membawa status dan catatan riwayat.
- Maksimal enam potongan masuk konteks. Seluruh body permintaan dibatasi 16.000 byte UTF-8; potongan beserta metadata yang tidak muat dikeluarkan utuh. Output dibatasi 1.200 token berbayar, termasuk penalaran bila model menggunakannya. Input besar tidak dipotong diam-diam di provider.
- Jawaban memakai struktur ketat: teks, ID potongan, dan penanda bukti kurang. Backend menolak ID yang tidak diberikan, ID duplikat, jawaban tanpa rujukan, URL buatan model, penolakan dan respons parsial/rusak. URL kutipan dibentuk dari metadata HTTPS `.go.id`, bukan dari keluaran model.
- Setelah generasi dan pencatatan biaya, backend membaca ulang **seluruh konteks**. Perubahan revisi, penarikan, status atau metadata sumber membatalkan jawaban. Panel menampilkan judul, status, nomor/tahun, halaman PDF, teks potongan dan tautan resmi; PDF asli tetap privat.
- Bukti kurang atau korpus kosong menghasilkan fallback yang jelas. Gangguan provider menjaga pertanyaan pada kolom input. Batas awal lima permintaan per menit per pengenal jaringan dan dua permintaan aktif per proses; permintaan berlebih ditolak, tidak diantrekan tanpa batas. Kedua panggilan provider memiliki timeout 30 detik dan tidak diulang otomatis.

Keabsahan ID/halaman tidak membuktikan ketepatan penafsiran setiap kalimat. Kalibrasi retrieval, pertanyaan lanjutan yang ambigu, konflik/riwayat peraturan, ekstraksi tabel dan mutu jawaban masih memerlukan R4 pada PDF resmi.

[Alat R4a](EVALUASI-RAG.md) menyiapkan baseline kata kunci dari pertanyaan acuan secara privat, tanpa embedding/generasi meski key terpasang. Laporan menyimpan kasus yang sengaja disusun peninjau, bukan mengumpulkan pertanyaan pengunjung. Hasilnya tidak mengaktifkan flag beta atau menggantikan evaluasi model nyata.

## Konfigurasi privat

Tambahan pada `.env.example`, `deploy/runtime.env.example` dan Compose:

| Variabel | Kegunaan |
| --- | --- |
| `OPENAI_API_KEY` | Key privat milik pemilik akun; jangan masukkan ke chat, browser atau Git |
| `JAFA_AI_MONTHLY_USD` | Batas biaya aplikasi bersama untuk embedding dokumen, embedding pertanyaan dan generasi |
| `JAFA_AI_EMBEDDING_USD_PER_MILLION` | Tarif embedding per satu juta token |
| `JAFA_AI_INPUT_USD_PER_MILLION` | Tarif input generatif tertinggi yang dapat ditagih, **termasuk cache-write** |
| `JAFA_AI_OUTPUT_USD_PER_MILLION` | Tarif output berbayar, termasuk penalaran |
| `OPENAI_RAG_MODEL` | Model pilihan yang mendukung Responses API dan Structured Outputs |
| `JAFA_RAG_ENABLED` | `false` sampai korpus, evaluasi, model, biaya dan privasi siap |

USD/tarif harus berupa angka positif kurang dari 1.000.000 dengan maksimum enam desimal; notasi eksponen dan koma tidak diterima. Tidak ada model/tarif berbayar default. Konfigurasi tidak lengkap mematikan ketersediaan AI. Tanpa key **atau** anggaran/tarif embedding, persetujuan dan `rag:index` tetap membuat potongan untuk pencarian kata kunci, sedangkan embedding menunggu.

Memasang key beserta anggaran dan tarif embedding mengizinkan pekerjaan indeks berbayar meski panel AI masih mati. Tetapkan konfigurasi tersebut hanya setelah biaya indeks disetujui. Jalankan ulang indeks dengan prosedur pada [DOKUMEN-PDF.md](DOKUMEN-PDF.md); hentikan dev sebelum CLI membuka PGlite yang sama.

## Anggaran dan data

Migrasi `202611160001_ai_usage` menambah `AiUsageMonth`. Satu baris per bulan **UTC** menyimpan biaya dalam mikro-USD, token input/output/embedding, jumlah permintaan, kegagalan, permintaan tanpa metering dan durasi agregat. Tidak menyimpan pertanyaan, jawaban, riwayat, IP atau identitas pengunjung.

Setiap panggilan provider mereservasi biaya maksimum dengan satu upsert bersyarat yang atomik. Permintaan bersamaan ikut menghitung reservasi yang masih berjalan; restart tidak mereset anggaran. Embedding memakai batas byte UTF-8 ditambah overhead; generasi mereservasi 18.048 token input dan 1.200 output. Jika usage provider sah tersedia, selisih reservasi dikembalikan dan token dicatat. Timeout/respons tanpa usage atau usage melampaui batas mempertahankan seluruh reservasi sebagai perkiraan konservatif. Proses yang mati sebelum penyelesaian juga meninggalkan reservasi; jangan menghapus ledger untuk mengulang permintaan.

Batas ini bergantung pada tarif maksimum yang benar dan asumsi batas token model. Ini bukan pembacaan tagihan akun provider atau pengendali pengeluaran di luar aplikasi. Perubahan harga, penggunaan key oleh aplikasi lain, pajak dan biaya pembayaran tidak dicakup. Cocokkan metering dengan akun provider selama pilot; kegagalan tanpa usage harus ditinjau pengelola sebelum koreksi ledger. Batas dashboard provider tidak menggantikan pemeriksaan aplikasi.

Pengiriman generasi memakai `store:false`, tanpa tools, riwayat provider atau streaming. Teks PDF dan pertanyaan diperlakukan sebagai data, dan model tidak mempunyai alat mutasi CMS. Panel memberi tahu bahwa pertanyaan dan konteks dikirim ke OpenAI. Ini **bukan jaminan nol retensi provider**; kebijakan provider/akun/lokasi dan log infrastruktur harus diperiksa sebelum aktivasi.

## Sebelum aktivasi beta

1. Cadangkan database dan media. Terapkan migrasi R2b/R3 sesuai [RUNTIME.md](RUNTIME.md); pgvector dibuat admin database, akun aplikasi tetap non-superuser. Pengembangan paket ini tidak memigrasikan database pengguna.
2. Unggah PDF resmi, periksa seluruh halaman/ekstraksi, isi sumber/status dan jalankan persetujuan petugas yang berbeda. Nilai retrieval dan jawaban dengan peninjau substansi serta pertanyaan acuan (R4).
3. Pilih model, pastikan akses akun dan dukungan formatnya, tetapkan batas USD serta tarif maksimum yang aktual. Uji satu permintaan terkendali setelah izin biaya tersedia.
4. Editor memperbarui halaman Privasi melalui persetujuan CMS untuk menjelaskan pemrosesan cloud dan retensi yang benar. Materi awal atau halaman terbit tidak diubah otomatis oleh kode ini.
5. Konfigurasikan key secara privat di server, tinjau batas/log/proxy, lalu aktifkan flag beta. FAQ tetap tersedia jika AI tidak dapat digunakan.

## Verifikasi dan rujukan

Hasil aktual ada di [VERIFICATION.md](VERIFICATION.md). Unit menguji konfigurasi/aritmetika dan batas konteks. Integrasi memakai database PGlite temporer dengan transport provider palsu. Browser memakai endpoint ketersediaan/jawaban palsu untuk memeriksa panel; itu tidak membuktikan model nyata menjawab benar. Pemeriksa native mengunci key kosong dan memeriksa fitur mati serta ledger sebagai role aplikasi.

Kontrak provider ditinjau dari [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), dan [Embeddings API](https://developers.openai.com/api/reference/resources/embeddings/methods/create). Model, harga, kualitas PDF resmi, retensi akun, beban, staging, UAT dan kesiapan produksi tetap mempunyai gerbang tersendiri.
