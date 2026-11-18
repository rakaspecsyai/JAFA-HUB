# Pemindahan PGlite ke PostgreSQL

`npm run db:transfer` menyediakan ekspor/impor **logis** untuk mempertahankan data lokal saat menyiapkan PostgreSQL native. Sumber tidak dihapus, tidak dimigrasikan oleh alat ini, dan tidak diberi keputusan publikasi baru. Draf tetap draf; revisi terbit membawa histori persetujuan yang sudah ada. Impor materi prototipe melalui `db:import` tetap menghasilkan draf.

Alat ini menyiapkan pilihan mempertahankan data; keputusan database produksi baru atau pemindahan data pengguna masih milik penanggung jawab layanan. Staging pengujian menggunakan fixture tanpa salinan informasi pribadi pengguna sesuai PRD §6.3. Belum ada pemindahan database pengguna atau deployment cloud dari pekerjaan ini.

## Cakupan

- Mempertahankan ID dan nilai pada 16 tabel: pengguna/kredensial, konten/revisi/kontributor, sumber/bidang, media, PDF/halaman/relasi, potongan/vector, proyeksi pencarian, audit dan ledger biaya AI. Angka bigint/JSON disimpan sebagai teks PostgreSQL agar tidak dibulatkan JavaScript.
- Menyalin seluruh berkas media, termasuk subdirektori PDF privat, dengan SHA-256. Berkas yang dirujuk wajib tersedia; ukuran gambar/PDF dan checksum PDF diperiksa terhadap database.
- `Session`, `Verification` dan `RateLimit` tidak diekspor. Pengelola harus login ulang dengan rahasia lingkungan tujuan yang baru. Peran, status aktif dan kewajiban ganti sandi dipertahankan. Ledger AI tetap dipindahkan agar biaya tercatat tidak terhapus saat berpindah.
- Histori `_prisma_migrations` tujuan tetap milik tujuan. Nama/checksum seluruh migrasi dan kolom aplikasi harus cocok. Satu audit migrasi autentikasi yang otomatis dibuat pada database baru dipertahankan bersama audit sumber.
- Tidak memanggil API AI, membuat indeks, memublikasikan konten, mengimpor materi awal atau membuat admin. Flag dan key AI tetap dikonfigurasi terpisah.

## Sumber lokal

Hentikan dev dan seluruh proses yang membuka PGlite/media yang sama. Buat backup fisik privat terlebih dahulu menurut [DATA-LOKAL.md](DATA-LOKAL.md), terutama sebelum menerapkan migrasi yang masih tertunda. Gunakan source lengkap dengan lockfile dan semua migrasi; jangan memakai checkout lama.

```bash
npm run local:backup -- .local/sebelum-transfer-20261117
npm run db:transfer -- export .local/transfer-20261117
```

Kedua tujuan harus baru dan direktori induknya sudah tersedia. Ekspor memerlukan `JAFA_LOCAL_DATABASE=true` di luar produksi serta database yang sudah ada. Sumber dikunci selama pembacaan konsisten dan penyalinan media. Sumber dengan migrasi tertunda/berubah ditolak; lakukan maintenance terpisah setelah backup. `setup:local` menerapkan migrasi dan dapat menambah materi awal yang belum ada sebagai draf, sehingga jangan menjalankannya tanpa meninjau kebutuhan tersebut.

Bundle berisi `data.json`, `manifest.json` dan `media/`. Bundle memuat data akun, hash sandi, materi internal, teks PDF dan vector. Direktori dibuat 0700 dan berkas 0600. Simpan privat, enkripsi saat disimpan/dikirim sesuai kebijakan instansi, dan jangan unggah ke Git, chat, `public/` atau situs. Checksum mendeteksi perubahan; sumber bundle harus tetap dipercaya petugas.

## Tujuan native pada host

Siapkan **database PostgreSQL baru**, pgvector, akun aplikasi non-superuser dan salinan kode dengan migrasi yang sama. Jangan menjalankan bootstrap, impor prototipe atau server sebelum transfer; alat menolak tabel berisi selain histori/satu audit migrasi bawaan. Parent direktori media harus tersedia dan dapat ditulis petugas aplikasi; direktori media tujuan harus belum ada.

Pasang konfigurasi target melalui berkas privat di luar repositori, misalnya `/srv/private/jafa-target.env`, dengan `DATABASE_URL` target dan `JAFA_LOCAL_DATABASE=false`. Key AI kosong dan `JAFA_RAG_ENABLED=false` untuk jalur portal inti tanpa biaya AI. Nilai rahasia tidak dimasukkan ke argumen perintah atau laporan.

```bash
node --env-file=/srv/private/jafa-target.env node_modules/prisma/build/index.js migrate deploy
node --env-file=/srv/private/jafa-target.env --import tsx scripts/transfer-local.ts import /srv/private/transfer-20261117 /srv/jafa/media-transfer-20261117
```

Setelah berhasil, arahkan `MEDIA_DIRECTORY` aplikasi dan perintah maintenance ke `/srv/jafa/media-transfer-20261117`. Terapkan konfigurasi produksi/HTTPS dan rahasia unik menurut [RUNTIME.md](RUNTIME.md). Jangan menjalankan bootstrap ulang: akun sumber sudah dipindahkan. Penetapan akun/peran dan kebutuhan reset sandi ditinjau petugas sebelum rilis.

## Tujuan dengan Compose

Bangun image dari sumber lengkap, siapkan konfigurasi privat dan jalankan migrasi. Hentikan layanan `app` sebelum impor. Letakkan bundle pada host Docker dan pastikan pengguna `node` dalam image dapat membaca direktori dan berkasnya dengan izin terbatas. `manage` memakai image dan volume media yang sama dengan `app`. [Panduan runtime](RUNTIME.md) · [Dokumentasi bind mount Docker](https://docs.docker.com/engine/storage/bind-mounts/)

```bash
docker compose --env-file /srv/private/runtime.env stop app
docker compose --env-file /srv/private/runtime.env run --rm -T --volume /srv/private/transfer-20261117:/run/jafa-transfer:ro --entrypoint node manage --import tsx scripts/transfer-local.ts import /run/jafa-transfer /var/lib/jafa/media/transfer-20261117
```

Direktori anak baru memungkinkan transfer tanpa menimpa root volume media yang sudah dibuat Compose. Sesudah impor, simpan override privat `/srv/private/media-transfer.yaml` berikut dan gunakan berkas ini pada **seluruh** perintah Compose selanjutnya:

```yaml
services:
  app:
    environment:
      MEDIA_DIRECTORY: /var/lib/jafa/media/transfer-20261117
  manage:
    environment:
      MEDIA_DIRECTORY: /var/lib/jafa/media/transfer-20261117
```

```bash
docker compose --env-file /srv/private/runtime.env -f compose.yaml -f /srv/private/media-transfer.yaml run --rm -T manage check
docker compose --env-file /srv/private/runtime.env -f compose.yaml -f /srv/private/media-transfer.yaml up -d --wait app
```

Pertahankan nama project agar database dan volume media sama dengan saat migrasi. Setelah layanan sehat, buka halaman terbit dan pencarian, lalu login ulang dan periksa akses gambar/PDF menurut peran. Pertahankan override saat container dibuat ulang agar aplikasi tetap membaca direktori media hasil transfer.

## Penolakan dan verifikasi

Impor memverifikasi checksum dan format bundle, mengunci tabel tujuan, memeriksa skema/kekosongan, mempertahankan constraint, mengisi relasi dan penunjuk publikasi, lalu membandingkan seluruh nilai dengan sumber. Publikasi/proyeksi dan larangan persetujuan sendiri diperiksa sebelum commit. SQL selalu berparameter; bundle tidak berisi SQL yang dieksekusi. Tidak membutuhkan superuser atau penonaktifan foreign key.

Jika isi/relasi/media tidak cocok, transaksi database dibatalkan. Jika gagal setelah penyalinan atau koneksi terputus saat commit, tujuan media mungkin parsial dan hasil commit perlu diperiksa petugas; jangan menjalankan aplikasi pada tujuan itu atau menghapus sumber untuk mengulang. Tujuan yang sudah ada tidak ditimpa. Simpan hasil/log secara privat dan pilih tujuan baru setelah memeriksa keadaan database.

Data logis dibatasi 256 MiB, manifest 8 MiB dan dibaca di memori. Skema di luar versi alat ini ditolak. Sumber dan tujuan harus dihentikan dari mutasi aplikasi selama transfer. Ini bukan sinkronisasi dua arah, backup terjadwal/terenkripsi, restore fisik PGlite ke native, atau pengganti latihan backup/restore staging.

Uji terisolasi yang dapat diulang:

```bash
node --import tsx --test --experimental-test-isolation=none tests/integration/transfer-local.test.ts
node --import tsx tests/operational/transfer-native.check.ts
node --import tsx tests/operational/transfer-compose.check.ts
```

Pemeriksa native membutuhkan Docker engine dan membangun target `database` pada Dockerfile. Gunakan `JAFA_TEST_DOCKER=docker.exe` bila melalui CLI Windows/WSL. Ia membuat fixture akun/konten/PDF sintetis, memigrasikan PostgreSQL/pgvector sebagai role aplikasi, menguji CLI impor, penolakan ulang dan persistensi setelah restart, lalu menghapus hanya container/volume miliknya. Image/cache build dipertahankan. Bukti privat berada di `.local/transfer-native-*/result.json`; kegagalan menyimpan fixture untuk pemeriksaan. Pengujian ini tidak menyalin data pengguna, menjalankan server/browser, membayar API atau menutup gerbang staging/UAT/produksi. Hasil aktual mengikuti [VERIFICATION.md](VERIFICATION.md).

Pemeriksa Compose membangun kedua image, mengimpor bundle fixture lewat bind mount baca saja, lalu memeriksa halaman terbit, pencarian, login ulang dan akses media sebelum dan sesudah container dibuat ulang. Pada Docker Desktop dengan WSL, kedua CLI (`docker` dan `JAFA_TEST_DOCKER=docker.exe`) lulus. Bukti privat berada di `.local/transfer-compose-*/result.json`. [Hasil verifikasi](VERIFICATION.md)

Representasi nilai menggunakan fungsi [JSON PostgreSQL 17](https://www.postgresql.org/docs/17/functions-json.html); pembacaan sumber menggunakan [transaksi Repeatable Read](https://www.postgresql.org/docs/17/transaction-iso.html).
