# Paket persiapan runtime

Paket ini menyediakan artefak dan prosedur untuk satu aplikasi Node.js, PostgreSQL native, dan volume media persisten. Tidak menetapkan penyedia hosting, domain, petugas, atau persetujuan produksi. Bukti pemeriksaan aktual berada di [VERIFICATION.md](VERIFICATION.md); pekerjaan kesiapan/rilis tetap di [KESIAPAN-RILIS.md](KESIAPAN-RILIS.md).

**C1 dan C2 selesai lokal.** C1 memakai bukti 10 November: 25 unit, typecheck, smoke produksi, build kedua image, migrasi/impor idempoten PostgreSQL native, health dan restart/persistensi lulus. C2 pada 11 November menambahkan login/sesi, tiga peran, publikasi/penarikan serta otorisasi media melalui HTTPS fixture lokal; pemeriksa exit 0 dan cleanup lulus. Staging resmi dan UAT tetap terbuka; rincian hasil di [VERIFICATION.md](VERIFICATION.md).

## Isi paket

- `Dockerfile`: target `database` berbasis PostgreSQL 17 dan target `runtime` berbasis Node 22 Bookworm. Runtime berjalan sebagai pengguna `node`. Prisma/tsx tetap tersedia karena migrasi dan perintah akun yang sudah ada memerlukannya.
- `compose.yaml`: aplikasi dan database, dua volume bernama (`postgres`/`media`), serta layanan `manage` pada profil maintenance. Aplikasi menunggu health database. Database tidak membuka port host; aplikasi dipublikasikan pada `127.0.0.1:53174` secara default.
- `.dockerignore`: daftar sumber yang boleh masuk build; `.env`, `.local`, cache/test-results dan data pengembangan tidak ikut. Image runtime juga tidak menyalin direktori tes.
- `scripts/production.mjs`: pemeriksaan konfigurasi sebelum startup/migrasi/impor/bootstrap/pemulihan. Menolak pratinjau/PGlite, origin selain HTTPS, rahasia pendek/sama, media di dalam artefak atau melalui symlink ke artefak, media tak dapat dibaca/ditulis, serta artefak yang membawa `.env`/`.local`. Nilai konfigurasi tidak dicetak oleh pemeriksa.
- `deploy/postgres-init.sh`: membuat akun aplikasi `jafa` tanpa superuser/createdb/createrole. Password admin database tidak diberikan ke aplikasi. Inisialisasi ini hanya berlaku pada volume database baru; tidak dijalankan ulang terhadap volume berisi data.
- `deploy/runtime.env.example`: template kosong untuk konfigurasi privat Compose.

Build memakai database dummy tanpa rahasia runtime. Startup tidak menjalankan migrasi, impor, atau bootstrap otomatis. `robots.txt` dibentuk saat runtime agar alamat sitemap mengikuti `APP_URL` lingkungan tujuan, bukan origin build.

## Konfigurasi privat

Salin `deploy/runtime.env.example` ke berkas privat **di luar repositori/konteks build**. Batasi direktori/berkas ke pemiliknya (Linux 0700/0600 atau ACL setara). Isi origin HTTPS dan empat rahasia berbeda; masing-masing dapat dibuat dari 32 byte acak pada terminal privat:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Password database pada template Compose harus berupa hex agar aman disisipkan ke URL. Pertahankan nama project, rahasia dan volume saat restart/rilis berikutnya. Mengubah password pada berkas konfigurasi tidak mengubah password role yang sudah tersimpan; rotasi memerlukan prosedur database terencana, bukan membuat ulang volume.

`APP_URL` berupa origin, misalnya HTTPS pada domain yang benar-benar ditetapkan, tanpa path atau garis miring akhir. Jangan mengisi domain/kontak perkiraan. `TRUSTED_IP_HEADER` tetap kosong sampai reverse proxy menimpa header dan koneksi langsung aplikasi dibatasi.

## Menjalankan dari Docker Compose

Jalankan dari shell yang dapat mengakses Docker Linux dan repositori: PowerShell Docker Desktop atau WSL dengan integrasi aktif. Pada pemeriksaan paket, CLI Windows `docker.exe` juga dapat dipanggil dari WSL. Ganti `/path/privat/runtime.env` dengan berkas privat milik lingkungan tujuan.

```bash
docker compose --env-file /path/privat/runtime.env config --quiet
docker compose --env-file /path/privat/runtime.env build app database
docker compose --env-file /path/privat/runtime.env run --rm --no-deps manage check
docker compose --env-file /path/privat/runtime.env up -d --wait database
docker compose --env-file /path/privat/runtime.env run --rm manage migrate
```

`check` memeriksa konfigurasi dan akses direktori media; tidak membuktikan koneksi/schema database. Impor awal bersifat opsional, idempoten, dan selalu draf:

```bash
docker compose --env-file /path/privat/runtime.env run --rm manage import
```

Bootstrap hanya saat belum ada admin aktif. Jalankan dari terminal privat interaktif, tanpa redirect/rekaman/pipeline:

```bash
docker compose --env-file /path/privat/runtime.env run --rm -it manage bootstrap --email "<email-petugas>" --name "<nama-petugas>"
```

Layanan `manage` memakai logging driver `none` dan perintah akun menolak terminal noninteraktif agar sandi sementara tidak masuk log container. Pemulihan admin memakai `manage recover --email ... --operator ... --reason ...` pada terminal privat yang sama, sesuai [OPERASIONAL.md](OPERASIONAL.md). Peran/persetujuan tidak dipintas.

```bash
docker compose --env-file /path/privat/runtime.env up -d --wait app
```

Reverse proxy HTTPS harus diarahkan ke port loopback aplikasi sebelum penggunaan CMS nyata. Cookie produksi tetap Secure; paket tidak menurunkannya untuk menerima HTTP. Buat editor/penyetuju melalui CMS, ganti sandi awal, tinjau dan setujui materi. Rilis kode maupun impor tidak menerbitkan materi otomatis.

## Restart dan data

`docker compose stop/start app` atau `docker compose down` mempertahankan volume bernama. Jangan memakai `down --volumes`, menghapus volume, atau mengganti project untuk mereset instalasi berisi data. Restart bukan backup; prosedur backup/restore terkoordinasi database+media dan enkripsi tetap mengikuti [OPERASIONAL.md](OPERASIONAL.md).

Saat database diperbarui, hentikan mutasi/aplikasi terlebih dahulu, pertahankan backup dan artefak sebelumnya, terapkan perubahan di staging, lalu verifikasi sebelum melanjutkan. Jangan mengubah major PostgreSQL pada volume lama tanpa prosedur upgrade.

## Host tanpa container

Gunakan artefak rilis bersih, Node 22.22 atau lebih baru pada lini 22, dependensi dari lockfile (`npm ci --include=dev`), build, PostgreSQL terpisah, serta direktori media di luar artefak. Environment mengikuti tabel [OPERASIONAL.md](OPERASIONAL.md), dengan `DATABASE_URL` yang disediakan host, `JAFA_LOCAL_DATABASE=false` dan `JAFA_CONTENT_PREVIEW=false`; template `POSTGRES_*` khusus Compose.

```bash
node --env-file=/path/privat/runtime.env scripts/production.mjs check
node --env-file=/path/privat/runtime.env scripts/production.mjs migrate
node --env-file=/path/privat/runtime.env scripts/production.mjs import
node --env-file=/path/privat/runtime.env scripts/production.mjs start --hostname 127.0.0.1 --port 3000
```

Jika environment disuntikkan pengelola layanan, gunakan `npm run runtime -- check`, `npm run runtime -- migrate` dan `npm start`. `npm start` kini menggunakan pemeriksa produksi; `npm run dev` tetap jalur pengembangan. Jangan menghapus `.env`/`.local` pengembangan untuk melewati pemeriksaan; buat artefak rilis terpisah.

## Pemeriksaan yang dapat diulang

```bash
npm run typecheck -- --incremental false
npm test
sh -n deploy/postgres-init.sh
node --import tsx tests/operational/production.check.ts
```

Smoke produksi membangun salinan kode/cache, menjalankan mode produksi dengan direktori media sementara, memeriksa origin runtime pada robots, halaman login, health 503 aman ketika peer database sengaja menutup koneksi, lalu meneruskan SIGTERM dan memastikan server berhenti. Ini bukan bukti login/sesi/publikasi PostgreSQL native atau staging. Hasil image/database yang benar-benar dijalankan dicatat terpisah di VERIFICATION.md.

## C2: alur native melalui HTTPS lokal

Pemeriksa berikut membuat project Compose dengan nama acak, membangun image sumber saat ini, menerapkan migrasi pada PostgreSQL baru dan membuat tiga akun `.invalid` dari fixture E2E. Pemeriksa tidak menerima target server/database eksternal. Memerlukan Docker Linux yang aktif, OpenSSL, dependensi proyek dan Chromium Playwright terpasang, serta izin socket loopback.

```bash
node --import tsx tests/operational/native-runtime.check.ts
```

Pada WSL tanpa integrasi CLI Linux, pilih executable Windows yang dapat mengakses engine lokal. Pemeriksa menerjemahkan path Compose/fixture menggunakan `wslpath`:

```bash
JAFA_TEST_DOCKER='/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe' \
  node --import tsx tests/operational/native-runtime.check.ts
```

Proxy HTTPS sementara mempertahankan host/origin dan menimpa header forwarded sebelum meneruskan ke aplikasi produksi pada loopback. Sertifikat lokal hanya dipercaya oleh context browser uji; trust store host tidak berubah. Rahasia Compose serta kunci sertifikat dibuat acak di direktori temporer privat dan dihapus setelah pemeriksaan. Cookie produksi tetap Secure. Ini memeriksa terminasi TLS lokal, bukan konfigurasi proxy/domain/sertifikat staging resmi.

Alur browser memakai login Server Action, unggahan dan sanitasi gambar, simpan/ajukan/terbit/tarik. Request aksi diputar ulang dengan sesi peran yang salah; perubahan peran mencabut sesi editor, dan akun kontributor yang kemudian menjadi penyetuju tetap ditolak saat mencoba menyetujui revisinya. Artikel kedua memakai layanan draf/pengajuan yang sama untuk menyiapkan rujukan gambar bersama, lalu diterbitkan dan ditarik melalui CMS. Draf berikutnya tidak mengganti versi publik; penarikan diperiksa pada detail, daftar, pencarian, sitemap serta akses gambar sampai rujukan terbit terakhir hilang. Logout dan expiry database juga memeriksa penggunaan ulang cookie lama.

Hasil per fase dan cleanup tersimpan pada `.local/native-runtime-*/result.json`; `commands.log` dan trace kegagalan tetap privat karena dapat memuat kredensial/sesi sintetis. Pemeriksa menghentikan dan menghapus hanya container/network/volume project acak miliknya saat selesai atau gagal; image/cache build dipertahankan. Penghentian paksa proses/engine dapat menyisakan resource uji: periksa nama project pada hasil sebelum membersihkannya, jangan memakai prune global. Hasil lulus hanya dicatat setelah perintah benar-benar selesai; suite E2E PGlite, aksesibilitas, beban, backup/restore, UAT dan gerbang rilis tetap mempunyai bukti tersendiri.

## Rujukan resmi

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting) dan [cache robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots).
- [Prisma 7 pada Docker](https://www.prisma.io/docs/guides/v7/deployment/docker) dan [migrate deploy](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).
- [Compose menunggu dependency sehat](https://docs.docker.com/compose/how-tos/startup-order/) dan [logging driver none](https://docs.docker.com/engine/logging/configure/).
- [PostgreSQL 17 psql getenv](https://www.postgresql.org/docs/17/app-psql.html) dan [volume image resmi PostgreSQL](https://github.com/docker-library/docs/blob/master/postgres/README.md).
