# Status pengembangan setelah audit 10 November 2026

Dokumen ini menjadi urutan kerja aktif setelah pengguna meminta menghentikan pengulangan development. Dasarnya kode aktual dan PRD, terutama FR-01–18 serta §13–17. Audit ini menelusuri alur utama dan celah produk; bukan audit keamanan independen. Target kapasitas tetap usulan PRD: 2.000 materi dan 50 pembaca bersamaan, belum hasil pengukuran native.

Status ditinjau 11 November 2026: paket A, B, C1 dan C2 selesai lokal. C2 menjalankan image produksi dan PostgreSQL native melalui HTTPS loopback dengan fixture baru; pemeriksa exit 0 dan resource uji dibersihkan. Berikutnya R2 pada jalur RAG; gerbang staging/rilis tetap terbuka.

Pengguna menyetujui jalur RAG paralel dan beta setelah evaluasi. Keputusan berikutnya: sumber PDF resmi peraturan JF yang akan diunggah, serta API cloud beranggaran murah menggantikan rencana model lokal/Rp0 untuk komponen AI. Rancangan dan kandidat biaya ada di [PRD tambahan RAG](PRD-RAG-Jafa-Hub.md); nominal bulanan/model/key belum ditetapkan, belum ada implementasi atau panggilan berbayar.

## Mengapa pekerjaan berulang

1. PRD §17 membagi pekerjaan menjadi fondasi, CMS, portal, migrasi/tinjauan, kesiapan produksi dan peluncuran. Serah-terima memakai urutan lain dengan “tahap 3 = E2E dan aksesibilitas”; penyebutan tahap menjadi rancu.
2. Pekerjaan aksesibilitas memakai frasa terbuka seperti “seluruh state”. Setiap paket lulus diikuti variasi baru tanpa batas paket atau prioritas fungsional.
3. Bukti lokal, pemeriksaan manual dan keputusan instansi diperlakukan sebagai satu antrean. Ketika staging/petugas belum tersedia, pekerjaan kembali ke pengukuran lokal yang sudah banyak dicakup.
4. Daftar kerja tidak dipetakan kembali ke FR, sehingga celah filter CMS dan kanal Kontak terlewat meskipun bukti screenshot terus bertambah.

Perbaikan proses: selesaikan paket dengan kriteria penerimaan yang terbatas. Paket lulus dibuka kembali hanya jika ada perubahan terkait, cacat yang dapat direproduksi, atau kebutuhan baru. Pemeriksaan manual tetap gerbang rilis; pekerjaan coding dapat berlanjut pada celah fungsi yang sudah terbukti. Menjalankan ulang semua variasi bukan pengganti kemajuan produk.

## Peta kemampuan dari kode

“Ada” berarti implementasinya ditemukan, bukan seluruh persyaratan produksi sudah dinyatakan lulus. Hasil aktual dan batas pengujian ada di [VERIFICATION.md](VERIFICATION.md).

| Kebutuhan | Implementasi yang ditemukan | Status pengembangan |
| --- | --- | --- |
| FR-01/02 | Rute publik dan profil melalui `repository.getPublished/listPublished` | Ada; sumber publik berasal dari revisi disetujui |
| FR-03/04 | Artikel berpaginasi dan regulasi bertautan resmi | Ada; performa target native belum diukur |
| FR-05/06/08 | FAQ, proyeksi pencarian dan asisten jawaban terkurasi | Ada; perbaikan textarea FAQ sebelumnya sudah diverifikasi, tidak otomatis dibuka ulang |
| FR-07 | Simulator lokal dan validasi/perhitungan | Ada; persetujuan aturan oleh unit substansi menunggu |
| FR-09 | Halaman pendukung melalui persetujuan | Sebelumnya kanal URL/email/telepon dan jam layanan belum terstruktur; paket audit menambah jalur model → editor → pratinjau → persetujuan → publik |
| FR-10/11 | Better Auth, peran terpisah, akun, reset dan pencabutan sesi | Ada; validasi produksi/proxy/audit independen menunggu lingkungan |
| FR-12 | Draf lima jenis konten dan sumber | Ada; filter daftar sebelumnya membaca histori, diperbaiki agar sesuai revisi terbaru yang ditampilkan |
| FR-13/14/15 | Pengajuan, keputusan, kontribusi, konflik versi dan penarikan | Ada; paket B memeriksa pemulihan sesi dan konflik dua editor dengan versi basi tetap ditolak |
| FR-16 | Audit tersimpan bersama mutasi | Ada; regresi rollback tersedia |
| FR-17 | Media privat, sanitasi dan akses mengikuti publikasi | C1 membuktikan persistensi; C2 membuktikan unggahan/sanitasi, akses draf/terbit dan penarikan media bersama native melalui HTTPS lokal. Backup/restore staging tetap gerbang rilis |
| FR-18 | Pesan gagal/validasi serta input bertahan | Paket B selesai lokal: status 401/403/409 serta tindakan pemulihan pada tab baru, masukan tetap dan penggabungan manual |

## Temuan kode dan tindakan

1. **Filter CMS mencocokkan revisi lama.** Pada `ContentList`, `revisions.some` dapat menemukan revisi 1 yang disetujui, sedangkan tabel menampilkan revisi 2 yang masih draf. Judul dan bidang JF lama juga dapat memunculkan hasil yang tidak sesuai. Query kini memakai revisi terbaru untuk filter, jumlah dan paginasi, melalui `src/lib/admin-repository.ts`; pemeriksaan sesi/peran tetap di rute sebelum query.
2. **Kanal kontak PRD §13.1 belum tersedia.** Payload lama tidak memiliki field kanal/jam layanan dan renderer Markdown hanya mengizinkan HTTPS/path. Penambahan kanal bertipe URL/email/telepon dan jam opsional memakai payload JSON serta persetujuan yang sudah ada. Payload lama memperoleh default kosong saat dibaca; tidak perlu migrasi tabel, pengisian kontak perkiraan atau penerbitan data pengguna.
3. **Pemulihan sesi/konflik sebelumnya tidak mempunyai tindakan UI.** Pada audit, `publicError/ActionState` hanya membawa pesan/kolom. Paket B menambah status 401/403/409 dan tautan masuk kembali/periksa akses/bandingkan versi pada tab baru. Masukan dan nomor versi lokal tetap; penolakan versi basi serta pemeriksaan peran tetap di server. Empat browser terarah, 22 unit, 50 integrasi, typecheck dan build lulus. Penggabungan tetap manual dan tidak ada penimpaan otomatis.

## Urutan kerja berikutnya dan syarat selesai

| Paket | Hasil konkret dan syarat selesai | Keadaan |
| --- | --- | --- |
| A. Filter dan Kontak | Filter hanya membaca revisi terbaru; kanal kontak tersimpan, ditinjau dan baru berubah publik setelah persetujuan; input salah ditolak tanpa mutasi | **Selesai lokal:** 21 unit, 49 integrasi, 4 browser terarah, typecheck dan build lulus; batas di VERIFICATION.md |
| B. Pemulihan CMS FR-18 | Sesi habis menyediakan masuk kembali tanpa menavigasi draf; konflik menyediakan pembandingan versi tersimpan sambil menjaga input; retry tetap mematuhi versi server/peran | **Selesai lokal:** 22 unit, 50 integrasi, 4 browser terarah, typecheck dan build lulus; batas di VERIFICATION.md |
| C1. Persiapan runtime | Artefak, konfigurasi, pemeriksa startup, migrasi/impor manual, image non-root, volume terpisah dan runbook; smoke startup/restart serta data draf tetap | **Selesai lokal:** 25 unit, typecheck, smoke produksi, build image dan migrasi/impor/restart PostgreSQL native lulus. CLI Windows mengakses engine Linux lokal; resource uji dibersihkan. Lihat RUNTIME.md dan VERIFICATION.md |
| C2. Alur native melalui HTTPS | Login/sesi/cookie, tiga peran, publikasi/penarikan dan akses gambar draf/terbit memakai runtime native dan fixture terpisah | **Selesai lokal 11 November:** pemeriksa native exit 0, typecheck/build image lulus, lima fase termasuk penolakan persetujuan sendiri dan penarikan media bersama. Staging resmi tetap memerlukan host/proxy/petugas; batas di VERIFICATION.md |
| D. Gerbang rilis | Pembaca layar/perangkat nyata, aksesibilitas independen, beban/backup-restore staging, audit keamanan, UAT dan persetujuan substansi | Menunggu sarana/petugas/keputusan sesuai KESIAPAN-RILIS.md; bukan backlog yang diselesaikan dengan mengulang tes lokal |
| R1. Rancangan RAG (paralel C2) | Sumber, akses, alur PDF, model/API, biaya, privasi dan evaluasi | **Rancangan tersedia** di PRD-RAG-Jafa-Hub.md. PDF/API cloud dipilih pengguna; penyedia/cap masih proposal, PDF belum diterima |
| R2. Korpus dan indeks | Ingest PDF privat, ekstraksi/halaman, peninjauan/persetujuan dan pencarian | **Paket pengembangan berikutnya:** belum ada modul unggah PDF, extension vector aktif atau korpus; PDF pengguna belum diterima |
| R3/R4. Jawaban dan beta | API generatif dengan kutipan/fallback/batas penggunaan lalu evaluasi dokumen pengguna | Menunggu korpus, key/cap dan hasil kualitas; bukan syarat otomatis rilis portal inti |

Exception development `Performance.measure` tetap memerlukan diagnosis. Prioritas naik bila reproduksi menunjukkan alur inti terganggu; belum ada dasar untuk mengganti dependensi atau menekan exception. RAG kini mempunyai permintaan dan rancangan tersendiri; SSO/fitur lain tetap di luar scope sampai ada kebutuhan baru. C2 dan RAG tidak membuka ulang paket A/B/C1 tanpa alasan terkait.

## Batas verifikasi

Pilih pemeriksaan berdasarkan perubahan: unit untuk pemetaan/validasi, integrasi untuk query/transaksi/publikasi, browser untuk alur yang berubah, lalu build jika rute/runtime berubah. Perubahan payload dan query paket A memerlukan suite integrasi penuh dan browser terarah; 52 E2E historis tidak diklaim diulang. Zoom/kontras baru, pembaca layar dan UAT tetap dicatat terpisah. Tidak mengubah izin, melompati persetujuan, membuka database pengguna atau melakukan deployment.

C1 hanya membuktikan persiapan artefak dan smoke native yang tercatat. GET halaman login 200 bukan bukti autentikasi berhasil; marker filesystem yang bertahan bukan bukti otorisasi media atau backup/restore. Suite browser/integrasi aplikasi penuh tidak diulang untuk perubahan runtime ini.

C2 menambahkan bukti browser autentikasi/publikasi/media pada image produksi dan PostgreSQL 17, dengan HTTPS dan sertifikat fixture lokal. Pemeriksa membuat seluruh target sendiri; bukti akhir `.local/native-runtime-Eqi7dR/result.json` mencatat kelulusan serta cleanup. Tidak mengubah perilaku produk, skema, dependensi, data pengguna atau keputusan hosting. Suite lama, seluruh variasi akun native, beban, audit dan UAT tidak diklaim diulang.
