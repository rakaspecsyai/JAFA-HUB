# Jalur menuju cloud

Ditinjau **17 November 2026** dari PRD §5–6/15–18, kode Docker/Compose dan bukti lokal. Ini rencana pekerjaan, bukan bukti akun cloud, staging atau produksi sudah tersedia. Penyedia, region, ukuran mesin, harga dan jadwal belum dipilih; verifikasi kemampuan/biaya penyedia saat target ditentukan.

## Dua jalur yang dapat berjalan paralel

**Portal inti** mempunyai implementasi lokal dan dapat disiapkan untuk cloud dengan FAQ terkurasi serta AI nonaktif. RAG bukan syarat otomatis P0. **RAG** menunggu PDF resmi, kasus acuan, keputusan model/biaya/key, evaluasi dan persetujuan privasi sebelum beta. Jangan menahan seluruh persiapan staging karena jalur AI belum selesai.

Jalur yang sudah didukung artefak adalah satu instance aplikasi Node.js/Docker, PostgreSQL native dan volume media persisten. PGlite hanya untuk pengembangan. Penyimpanan objek, filesystem sementara atau banyak replika memerlukan peninjauan/perubahan rancangan, bukan diasumsikan sudah didukung.

## Urutan sampai produksi

| Tahap | Pekerjaan konkret | Syarat selesai |
| --- | --- | --- |
| 1. Keputusan target | Pemilik layanan menetapkan cloud/region/lokasi data, domain, anggaran infrastruktur, pemilik akun dan PIC teknis. Pilih portal inti dahulu atau sekaligus AI yang sudah dievaluasi. Tentukan staging privat dan produksi dengan database/rahasia terpisah | Target dan tanggung jawab nyata tercatat; dukungan Node 22, PostgreSQL 17 + pgvector, volume persisten, HTTPS dan backup dikonfirmasi |
| 2. Versi dan data rilis | Tinjau working tree termasuk file/migrasi baru, commit sumber, simpan lockfile dan tetapkan versi/image yang dapat dirujuk kembali. Pilih database baru dengan impor draf atau migrasi data lokal yang sudah ada | Source lengkap bisa dibangun dari checkout bersih; rencana data dan backup disetujui; tidak memakai clone lama atau menyalin `.env`/`.local` ke image |
| 3. Cloud staging | Siapkan host/container, jaringan/firewall/proxy HTTPS, database non-superuser, pgvector dan volume media. Pasang konfigurasi privat; jalankan pemeriksa, migrasi dan bootstrap manual menurut RUNTIME.md. Batasi akses staging sebelum pengujian | URL staging privat, health/database, cookie HTTPS, volume/restart dan akun fixture/petugas yang ditetapkan bekerja pada host target |
| 4. Validasi di target | Jalankan alur login/peran/persetujuan/penarikan, gambar/PDF privat, pencarian/sitemap dan konfigurasi domain. Aktifkan/uji backup, pemantauan dan alarm; lakukan uji beban native serta restore database+media. Tinjau keamanan, aksesibilitas/perangkat dan log aman | Bukti pada host target tersedia; cacat yang menahan rilis selesai. Build, browser dan native diulang sesuai perubahan sejak bukti R3/R4a, tanpa menganggap hasil lokal sebagai hasil staging |
| 5. Penerimaan | Unit substansi menyetujui materi, nomenklatur, simulator, Kontak dan Privasi. Tetapkan admin/editor/penyetuju serta petugas backup/insiden. Jalankan UAT dan keputusan rilis tertulis | Gerbang KESIAPAN-RILIS.md/PRD §16–17 terpenuhi; keputusan nyata tercatat, bukan diisi dari hasil otomatis |
| 6. Produksi | Siapkan environment produksi terpisah, backup pra-migrasi dan artefak sebelumnya. Deploy versi/image yang telah diterima, pasang DNS/HTTPS/rahasia/volume, jalankan migrasi terencana dan verifikasi domain nyata | Backup/pemantauan produksi aktif; health, autentikasi, halaman/sumber terbit, metadata/sitemap/robots dan larangan akses draf/file privat lulus pada URL produksi sebelum diumumkan |
| 7. Operasi | Jalankan backup terenkripsi terpisah, alarm gagal, pemantauan health/error/disk/biaya dan jadwal restore. Pelihara rollback, pemulihan admin serta eskalasi | Pemilik/jadwal/kanal nyata tersedia dan prosedur pemulihan sudah diuji; pemantauan berlanjut setelah rilis |

Detail perintah build/check/migrate/import/bootstrap/start ada di [RUNTIME.md](RUNTIME.md). Target beban, retensi, backup/restore dan insiden ada di [OPERASIONAL.md](OPERASIONAL.md); angka target PRD bukan janji kapasitas server yang belum dipilih. Persetujuan dan batas hasil aktual mengikuti [KESIAPAN-RILIS.md](KESIAPAN-RILIS.md) dan [VERIFICATION.md](VERIFICATION.md).

## Rencana data yang perlu diputuskan

- **Produksi baru:** buat PostgreSQL native baru, terapkan migrasi, bootstrap admin secara privat/interaktif, lalu impor materi awal sebagai **draf**. Editor dan penyetuju menerbitkan hanya materi yang sudah ditinjau. Impor bukan pemindahan seluruh hasil suntingan/akun/data lokal.
- **Mempertahankan data lokal:** alat ekspor/impor logis kini tersedia dalam [PEMINDAHAN-DATA.md](PEMINDAHAN-DATA.md), mempertahankan 16 tabel aplikasi dan media/PDF, mengecualikan sesi/verifikasi/rate limit serta menolak tujuan berisi/skema berbeda. Pengujian memakai fixture; pemilihan cakupan data pengguna, rahasia tujuan dan pelaksanaan transfer tetap memerlukan keputusan petugas. Ini belum berarti data lokal sudah berada di cloud.
- `local:backup` dan `local:restore` adalah backup fisik PGlite beserta media untuk lingkungan lokal. Jangan menganggap menyalin `.local/development-pg` ke volume PostgreSQL cloud sebagai prosedur migrasi yang telah didukung/diuji. Data lokal tidak dihapus setelah membuat staging atau produksi.

Staging awal dapat memakai fixture terisolasi sambil keputusan data produksi diselesaikan. Jangan memakai atau mengumumkan materi sintetis sebagai isi produksi.

## Konfigurasi dan batas penting

- Gunakan `NODE_ENV=production`, `JAFA_LOCAL_DATABASE=false`, `JAFA_CONTENT_PREVIEW=false`, origin `APP_URL` HTTPS dan media persisten di luar artefak. Rahasia unik per lingkungan disediakan privat, tidak di Git/chat/log.
- Akun aplikasi database tetap non-superuser. Pada volume baru, init image menyiapkan pgvector sebagai admin; pada database lama/managed, admin menyiapkannya sebelum migrasi. Startup aplikasi tidak memigrasikan atau mengimpor otomatis.
- Aplikasi Compose hanya membuka port loopback, database tidak membuka port host. Proxy publik/sertifikat/DNS dan pembatasan akses staging perlu dikonfigurasi pada target. Cookie Secure tidak diturunkan untuk menerima HTTP.
- Untuk portal inti tanpa panggilan AI, pastikan **konfigurasi efektif** `OPENAI_API_KEY` kosong dan `JAFA_RAG_ENABLED=false`. Flag AI mati saja tidak menghentikan embedding indeks bila key serta cap/tarif embedding terpasang.
- Isi template `.env.example` bukan snapshot konfigurasi mesin. Pada audit 17 November, `.env` lokal masih memakai PGlite dan pratinjau prototipe; konfigurasi cloud harus terpisah. Jangan memindahkan berkas itu apa adanya ke produksi.
- Artefak rilis perlu menyertakan sumber/migrasi baru yang kini belum dilacak Git. Bukti/trace/database `.local`, konfigurasi rahasia dan tooling agen dipindahkan terpisah secara privat bila diperlukan, bukan dimasukkan image atau repositori.

## Jalur RAG sebelum beta

PDF resmi dan URL/metadata → unggah draf → pemeriksaan teks/halaman/status → persetujuan petugas berbeda → kasus acuan + R4a kata kunci → keputusan model, cap/tarif, pengiriman/retensi data provider dan key → evaluasi semantik/jawaban/kutipan/fallback/biaya/latensi privat → penilaian substansi dan persetujuan halaman Privasi → beta.

Embedding yang dipilih adalah `text-embedding-3-small`; itu belum memilih model pembuat jawaban. Model dan estimasi biaya pada PRD RAG masih proposal historis, harus diverifikasi saat dipakai. `rag:evaluate` saat ini hanya menjalankan bagian kata kunci tanpa API, bukan seluruh evaluasi RAG. Rujukan: [PRD RAG](PRD-RAG-Jafa-Hub.md), [ASISTEN-RAG.md](ASISTEN-RAG.md) dan [EVALUASI-RAG.md](EVALUASI-RAG.md).

## Kelanjutan pada sesi/mesin lain

Pada workspace yang sama, mulai dari `AGENTS.md`, `CONTEXT.md`, `README.md` dan status Git. Pada clone/mesin baru, commit/source lengkap harus tersedia lebih dahulu; konfigurasi, data/media dan bukti lokal tidak ikut Git. Riwayat chat bukan pengganti berkas serah-terima. Audit dokumentasi ini tidak melakukan commit/push atau deploy.
