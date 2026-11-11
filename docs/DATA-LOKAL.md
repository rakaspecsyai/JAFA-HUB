# Keandalan dan backup data lokal

Prosedur ini khusus PGlite pengembangan, bukan PostgreSQL staging/produksi. Pertahankan `.local/development-pg` dan cadangan pemulihan lama. Jangan mereset WAL, menghapus `.local`, atau mengulang bootstrap akun untuk memperbaiki startup.

## Membuka dan menutup database

Gunakan launcher proyek:

```bash
npm run dev -- --port 5174
```

Semua pembukaan PGlite persisten melalui `src/lib/local-db.ts` mengambil kunci direktori `<path-database-kanonis>.jafa-lock` sebelum engine dibuka. Alias symlink memakai kunci yang sama. Kunci menyimpan PID serta identitas host/namespace proses; umur berkas tidak menentukan apakah pemilik mati. Publikasi direktori kunci yang sudah berisi token pemilik dan pelepasan hanya token miliknya mencegah pembersihan kunci lama menghapus kunci pemilik baru.

Proses kedua ditolak selama PID pemilik masih hidup. Setelah proses mati, kunci dikenali dapat diambil kembali bila pemeriksaan PID dalam host/namespace yang sama menghasilkan `ESRCH`. Penolakan izin, identitas tidak dikenal, atau namespace berbeda tidak mengizinkan penghapusan otomatis. Jangan menghapus kunci hanya berdasarkan umurnya atau kegagalan `kill -0` dari namespace lain. Untuk kasus yang tidak dapat diperiksa, hentikan seluruh pemilik pada lingkungan asal, pastikan tidak ada engine aktif, dan tinjau kunci secara manual; jangan memulai database kosong sebagai pengganti. PID yang digunakan ulang oleh proses hidup juga menyebabkan penolakan konservatif.

`Ctrl+C`/`SIGINT`, `SIGTERM`, dan akhir proses normal menutup pool lalu engine pada proses yang memilikinya. `closeLocalDatabase()` melepas listener setelah ditutup sehingga harness yang menyerahkan database ke proses Next tidak keluar lebih awal. Pemanggil `createLocalDatabase()` harus memakai `local.close()` untuk menutup pool, engine, dan kunci bersama; jangan menutup engine persisten langsung.

Launcher dan harness E2E mengatur `NEXT_MANUAL_SIG_HANDLE=true` untuk worker lokal dan `NEXT_EXIT_TIMEOUT_MS=30000` agar CLI memberi waktu engine ditutup. Pola sinyal manual dijelaskan dalam [dokumentasi Next.js](https://nextjs.org/docs/pages/guides/self-hosting#manual-graceful-shutdowns); hasil aktual per versi mengikuti [VERIFICATION.md](VERIFICATION.md). Jalur ini hanya untuk pengembangan lokal; perubahan versi Next perlu mengulang pemeriksaan startup/shutdown. Menjalankan `next dev` langsung melewati konfigurasi launcher. Penutupan ini menguras kueri database; tidak menjanjikan seluruh respons HTTP dev selesai dikirim. Proses yang dipaksa mati tetap berisiko kehilangan transaksi yang belum selesai; kunci bukan perbaikan otomatis untuk database rusak.

Kunci ini bekerja untuk pemanggil yang mengikuti protokol proyek, pada satu host/namespace proses dan filesystem lokal dengan rename direktori atomik. Program yang membuka PGlite secara langsung dapat melewati perlindungan. Jangan berbagi direktori data antarhost/container; gunakan PostgreSQL native untuk kebutuhan tersebut.

## Backup database dan media

Hentikan dev, impor, bootstrap, serta proses lain yang menggunakan database/media yang sama. Jalankan dari akar proyek, dengan `.env` lokal tersedia. Pilih tujuan **baru** yang induknya sudah ada, terpisah dari direktori database/media:

```bash
npm run local:backup -- .local/backup-sebelum-perubahan
```

Sumber mengikuti `JAFA_LOCAL_DATABASE_DIRECTORY` (default `.local/development-pg`) dan `MEDIA_DIRECTORY` (default `.local/media`). Skrip hanya berjalan dengan `JAFA_LOCAL_DATABASE=true` di luar produksi. Backup mengambil kunci yang sama tanpa membuka engine, menyalin database dan media dalam keadaan offline, lalu membandingkan seluruh SHA-256 terhadap sumber sebelum menulis `manifest.json`. Instalasi yang belum memiliki direktori media menghasilkan direktori media kosong.

Hasil terdiri atas `pg/`, `media/`, dan `manifest.json`. Direktori backup berizin `0700` dan manifest `0600`. Sumber tidak dihapus atau diganti. Tujuan yang sudah ada, path yang saling menampung, alias yang bertumpuk, serta symlink/berkas khusus di dalam sumber ditolak. Bila proses gagal, pertahankan tujuan parsial untuk pemeriksaan dan ulangi ke tujuan baru; tanpa manifest lengkap, backup tidak dapat direstore oleh skrip ini.

Backup memuat akun, hash sandi, sesi, draf, dan media privat. Hasil lokal **belum dienkripsi** dan salinan pada disk yang sama belum melindungi dari kerusakan perangkat. Enkripsi dan simpan salinan terverifikasi pada lokasi terpisah sebelum diperlakukan sebagai cadangan operasional. Jangan unggah ke repository atau percakapan. Ini belum memenuhi job harian/retensi/RPO PRD; prosedur produksi tetap mengikuti [OPERASIONAL.md](OPERASIONAL.md).

## Restore ke tujuan baru

Gunakan hanya backup tepercaya dan versi PGlite/Node serta dependensi proyek yang cocok dengan saat snapshot dibuat. Ini salinan fisik untuk latihan pemulihan lokal, bukan format migrasi lintas versi PostgreSQL/PGlite.

```bash
npm run local:restore -- .local/backup-sebelum-perubahan .local/latihan-pulih
```

Skrip memeriksa manifest serta seluruh checksum sebelum membuat tujuan, menolak tujuan yang sudah ada/bertumpuk, mengunci sumber database dan tujuan salinan, lalu membandingkan checksum hasil. Database aktif dan cadangan asal tidak ditimpa. Jika gagal setelah penyalinan dimulai, tujuan parsial tidak boleh digunakan.

Untuk memeriksa melalui aplikasi, hentikan dev lain lalu jalankan dengan kedua lokasi hasil restore secara eksplisit:

```bash
JAFA_LOCAL_DATABASE_DIRECTORY=.local/latihan-pulih/pg \
MEDIA_DIRECTORY=.local/latihan-pulih/media \
JAFA_CONTENT_PREVIEW=false npm run dev -- --port 5174
```

Launcher akan memeriksa migrasi dan mengimpor materi awal yang belum ada sebagai draf; ini dapat mengubah salinan latihan, sehingga perbandingan checksum dilakukan sebelum aplikasi/engine membukanya. Periksa health, akun/peran, revisi terbit/draf, pencarian, serta privasi media. Jangan mencetak nilai akun/sesi. Pemeriksaan browser dan staging tetap membutuhkan bukti terpisah.

## Mengulang regresi terisolasi

```bash
node --import tsx --test --experimental-test-isolation=none tests/integration/local-db.test.ts tests/integration/local-backup.test.ts
```

Tes memakai direktori temporer sistem; tidak membuka `.local/development-pg`. Cakupannya meliputi persaingan proses, alias, kunci aktif yang berumur lama, identitas lintas host/namespace, inisialisasi gagal, sinyal, proses mati, penutupan berulang, listener yang dilepas, dan backup/restore seluruh tabel serta media, termasuk `Account`, `Verification`, dan `RevisionContributor`. Hasil aktual dan batas lingkungan dicatat di [VERIFICATION.md](VERIFICATION.md).

Untuk menguji port, HTTP, dan siklus launcher Next, jalankan self-check terpisah berikut pada lingkungan yang mengizinkan bind port 5196:

```bash
node --import tsx tests/operational/local-dev.check.ts
```

Self-check memeriksa bind terlebih dahulu, menyalin kode/cache ke direktori unik `.local/port-check-code-*`, dan memakai dependensi terpasang melalui symlink. Konfigurasi Turbopack pada salinan menjaga symlink tersebut dalam root proyek; konfigurasi serta cache dev asli tidak diubah oleh persiapan salinan. `.env` asli tidak disalin. Database/media berada di direktori temporer sistem dan mode pratinjau dimatikan.

Pemeriksaan mencakup dua startup, health/beranda, redirect admin tanpa sesi, penolakan proses kedua/backup saat aktif, SIGTERM/SIGINT, pelepasan kunci, dan perbandingan seluruh ID/nilai 15 tabel setelah restart. Salinan yang berhasil dibersihkan setelah server uji berhenti; fixture yang gagal dipertahankan untuk pemeriksaan. Jangan menghapus `.local` atau menghentikan dev lain hanya untuk menjalankan self-check. Pada lingkungan sesi ini, perintah harus dijalankan melalui persetujuan eksekusi di luar sandbox; pengujian ini tidak mengubah kebijakan jaringan permanen.
