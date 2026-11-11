# Operasional Jafa Hub

Dokumen ini menyiapkan prosedur; belum merupakan bukti deployment, backup terjadwal, atau uji pemulihan telah dilakukan.

**Pembaruan 11 November 2026:** paket persiapan runtime C1 dan smoke PostgreSQL native lokal sudah lulus pada 10 November. Artefak, konfigurasi privat dan urutan Docker/host tersedia di [RUNTIME.md](RUNTIME.md); bukti serta cakupan terbatasnya ada di [VERIFICATION.md](VERIFICATION.md). GET halaman login dan marker media persisten belum membuktikan autentikasi, otorisasi unggahan, backup/restore atau kesiapan staging.

## PostgreSQL dan konfigurasi produksi

Sediakan PostgreSQL native yang didukung penyedia, akun database khusus aplikasi, database terpisah untuk staging/produksi, Node.js yang didukung, reverse proxy HTTPS, dan volume unggahan persisten. Jangan gunakan PGlite atau disk sementara untuk produksi.

Gunakan variabel lingkungan produksi terpisah dari `.env` pengembangan:

| Variabel | Penerapan |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL dengan kredensial khusus; tidak dimasukkan ke repository/log |
| `APP_URL` | Origin HTTPS resmi; menjadi dasar canonical, sitemap, dan pemeriksaan origin |
| `JAFA_LOCAL_DATABASE` | `false` |
| `JAFA_CONTENT_PREVIEW` | `false` |
| `MEDIA_DIRECTORY` | Path absolut ke volume persisten; dapat dibaca/ditulis hanya akun aplikasi |
| `AUTH_RATE_LIMIT_KEY` | Nilai acak unik minimal 32 byte; berbeda per lingkungan |
| `BETTER_AUTH_SECRET` | Rahasia penandatanganan cookie Better Auth, minimal 32 karakter; buat dari 32 byte acak dan pisahkan per lingkungan |
| `TRUSTED_IP_HEADER` | Kosong sampai proxy tepercaya dikonfigurasi; isi hanya jika proxy menimpa header dan akses langsung aplikasi diblokir |

Masing-masing rahasia dapat dibuat dengan `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` pada terminal privat. Jangan memakai satu nilai untuk keduanya atau menyalin hasil ke issue/chat/log operasional. Pertahankan `BETTER_AUTH_SECRET` saat restart agar cookie yang masih sah tetap terbaca; rotasi direncanakan bersama pencabutan sesi.

Tanpa header IP tepercaya, pembatasan memakai satu bucket jaringan konservatif. Setelah proxy dikonfigurasi, pastikan pengunjung tidak dapat memalsukan IP lewat header langsung. Proxy harus membuang header IP kiriman pengunjung dan menetapkan nilai yang benar. Log proxy tidak boleh menyimpan body pertanyaan asisten, query pencarian, sandi, atau cookie sesi.

Langkah rilis berikut dijalankan petugas pada artefak rilis bersih, dengan seluruh environment disuntikkan oleh host dan direktori media sudah tersedia. Jangan menjalankannya pada direktori pengembangan. Pemeriksa Node dapat dijalankan sebelum instalasi dependensi, menolak `.env`/`.local`, konfigurasi yang tidak sesuai, serta media internal/invalid; tidak ada berkas yang dihapus. Jangan menghapus data pengembangan untuk melewati pemeriksaan.

```bash
set -euo pipefail
export NODE_ENV=production
node scripts/production.mjs check
npm ci --include=dev
npm run build
npm run runtime -- migrate
npm run runtime -- import
npm run runtime -- bootstrap --email "<email-petugas>" --name "<nama-petugas>"
npm start
```

Bootstrap hanya untuk admin pertama; lewati baris tersebut pada rilis berikutnya dan gunakan terminal privat interaktif. Impor juga opsional; tetap idempoten dan tidak menerbitkan konten. Perintah `runtime` memakai skrip domain yang sama tanpa memuat `.env` pengembangan. Prisma/tsx sengaja dipertahankan untuk migrasi dan administrasi. Buat editor/penyetuju melalui CMS, wajibkan penggantian sandi, tinjau dan terbitkan setiap materi awal. `npm start` menjalankan pemeriksa lalu Next pada port 3000; reverse proxy menangani HTTPS. Untuk bind loopback di host, gunakan `npm start -- --hostname 127.0.0.1`; paket Compose sudah membatasi port host ke loopback.

Sebelum rilis, simpan artefak aplikasi sebelumnya dan backup database/media. Jalankan migrasi di staging terlebih dahulu. Jangan memakai `prisma migrate reset` pada database berisi data operasional.

## Migrasi autentikasi database lama

Migrasi `202610260001_auth_governance` mempertahankan ID, email, peran, status, dan hash sandi akun. Hash berpindah dari `User.passwordHash` ke `Account.password`; kolom lama dikosongkan. **Seluruh sesi lama dicabut**, sehingga pengelola harus login ulang dengan sandi yang sama. `Account`, `Verification`, dan `RevisionContributor` menambah jumlah tabel dari 12 menjadi 15. Kontributor lama dipulihkan dari pembuat/pengaju serta audit `content.create/save/submit` yang tersedia; histori di luar audit tersebut tidak dapat direkonstruksi otomatis.

1. Pastikan versi kode/dependensi telah lulus pemeriksaan dan tentukan jendela maintenance. Hentikan launcher/worker yang benar secara wajar; pastikan pemilik engine selesai menutup database. Jangan menghapus kunci dari namespace asing atau menghentikan proses lain berdasarkan nomor port saja.
2. Buat snapshot database dan media yang konsisten. Untuk PGlite gunakan `local:backup` menurut [DATA-LOKAL.md](DATA-LOKAL.md); PostgreSQL native memakai `pg_dump` dan salinan volume saat mutasi dihentikan. Simpan juga konfigurasi rahasia secara privat dan artefak kode sebelumnya.
3. Restore ke tujuan baru. Catat seluruh baris/ID tabel sebelum migrasi secara privat, lalu migrasikan salinan. Bandingkan akun dan hash dengan `Account.password`, konten/revisi/sumber/media/proyeksi yang tetap sama, audit lama yang tetap ada, sesi kosong, serta backfill kontributor. Tutup/buka ulang salinan dan periksa persistensi.
4. Pastikan database sumber masih sesuai snapshot dan belum dibuka proses lain. Sediakan `BETTER_AUTH_SECRET` tanpa mengganti nilai yang sudah ada. Terapkan migrasi aktif: PGlite melalui `npm run setup:local` setelah dev berhenti; PostgreSQL native melalui `npm run db:migrate` pada artefak bersih dengan environment host. Setup lokal dapat menambah materi awal yang belum ada sebagai draf; tidak menimpa rekaman yang ada.
5. Ulangi perbandingan data pada sumber, jalankan aplikasi, lalu periksa health, login ulang, peran, serta versi publik. Jangan membuat akun pengganti, mereset sandi lama, atau menerbitkan draf sebagai bagian migrasi. Catat hasil aktual dan batas pemeriksaannya.

SQL migrasi memakai satu blok `DO`; kegagalan audit membatalkan DDL, pemindahan hash, dan pencabutan sesi. Setelah migrasi sukses, kode lama yang membaca `User.passwordHash` tidak kompatibel. Pemulihan memerlukan pasangan kode/config/database/media sebelum migrasi dan keputusan petugas; jangan otomatis mengembalikan backup bila ada penyuntingan baru. Backup pra-migrasi tetap disimpan privat dan tidak dibuka sebagai database aplikasi.

## Penerbitan dan penarikan

Editor menyimpan dan mengajukan. Penyetuju memeriksa sumber serta tanggal, membandingkan isi dengan versi publik, lalu menerbitkan atau mengembalikan dengan catatan. Revisi yang diajukan terkunci. Jika ada konflik, pertahankan masukan lokal, buka versi baru untuk dibandingkan, dan simpan ulang setelah meninjau perbedaannya.

Pembuat, seluruh penyunting, dan pengaju dicatat sebagai kontributor per revisi. Mereka tidak boleh menerbitkan maupun mengembalikan revisi yang sama setelah berganti peran; gunakan penyetuju lain. Revisi baru mencatat kontributornya sendiri.

Penyetuju menarik konten dengan alasan. Verifikasi URL artikel/profil, daftar, pencarian, FAQ/asisten, sitemap, dan media. Gambar bersama tetap publik bila masih dipakai revisi terbit lain. HTTP media selalu `no-store`; proxy tidak boleh menggantinya dengan cache publik.

## Akun dan pemulihan akses

Sandi sementara muncul sekali setelah pembuatan/reset. Sampaikan melalui kanal internal terverifikasi. Reset, perubahan peran, dan penonaktifan mencabut seluruh sesi. Simpan setidaknya dua admin aktif yang ditunjuk bila kebijakan instansi mengizinkan, agar pemulihan tidak bergantung pada satu petugas.

Jika seluruh admin kehilangan akses, petugas teknis berwenang memeriksa identitas pemohon melalui kanal internal dan memakai CLI pemulihan. Untuk PGlite, hentikan dev terlebih dahulu dan buat backup privat. Jalankan dari terminal privat interaktif, tanpa redirect, `tee`, rekaman terminal, atau pipeline:

```bash
npm run admin:recover -- --email "<email-admin>" --operator "<petugas-teknis>" --reason "<alasan-pemulihan-minimal-10-karakter>"
```

Pada produksi, gunakan artefak bersih dengan environment host dan `npm run runtime -- recover` diikuti argumen yang sama; npm script `admin:recover` di atas khusus `.env` lokal. Untuk Compose gunakan layanan `manage` sesuai [RUNTIME.md](RUNTIME.md). Wrapper menolak stdin/stdout non-TTY sebelum membuka database. Hanya admin yang masih aktif dapat dipulihkan; ID, peran, dan status dipertahankan. Reset kredensial, pencabutan seluruh sesi, kewajiban ganti sandi, serta audit `account.recover` dengan identitas operator/alasan berada dalam satu transaksi. Jika audit gagal, perubahan dibatalkan dan sandi tidak ditampilkan.

Sandi sementara acak tampil sekali setelah commit; serahkan melalui kanal internal, lalu admin harus menggantinya sebelum memakai CMS. Jangan simpan sandi pada laporan. Jika terminal terputus setelah commit, lakukan pemulihan ulang dengan alasan baru; jangan mencoba membaca hash sebagai sandi. Periksa metadata audit dan login/ganti sandi bersama petugas. CLI tidak mengaktifkan akun nonaktif atau memberi peran admin. Endpoint bypass dan akun pemulihan bawaan tidak disediakan; bootstrap hanya untuk instalasi tanpa admin aktif. Regresi sintetis lulus, sedangkan latihan dengan petugas pada staging tetap diperlukan.

## Backup dan retensi

Untuk PGlite pengembangan, gunakan [prosedur data lokal](DATA-LOKAL.md): hentikan aplikasi, backup database/media dengan kunci antarproses, lalu restore ke direktori baru dan cocokkan checksum. Hasil lokal tidak menggantikan backup terenkripsi serta latihan PostgreSQL native/staging berikut.

Tetapkan job harian pada host, terpisah dari proses web. Gunakan kredensial backup dengan hak minimum. Jangan memasukkan password database ke argumen command; gunakan `.pgpass` berizin `0600` atau secret environment terkelola.

Backup harus mencakup hasil `pg_dump --format=custom` dan seluruh volume `MEDIA_DIRECTORY` pada titik waktu yang konsisten. Saat membuat snapshot, hentikan sementara unggahan/publikasi atau gunakan snapshot volume terkoordinasi. Enkripsi arsip dengan alat yang disetujui instansi, simpan di lokasi terpisah dari server aplikasi, batasi akses, dan catat checksum, waktu, versi aplikasi, serta status keberhasilan. Job tidak boleh mengumumkan berhasil sebelum arsip terenkripsi selesai disalin dan diverifikasi.

Default usulan: backup 30 hari, audit 12 bulan, log teknis 30 hari; retensi akhir ditetapkan instansi. Bersihkan sesi kedaluwarsa dan entri rate limit kedaluwarsa melalui maintenance database terjadwal. Jangan menghapus revisi konten atau audit lewat CMS. Aplikasi tidak menyediakan job retensi yang berjalan diam-diam sebelum kebijakan host ditetapkan.

Target usulan RPO 24 jam dan pemulihan satu hari kerja perlu diuji. Minimal tiap tiga bulan, pulihkan ke staging yang terisolasi: database dan media, bukan salah satunya saja. Periksa akun/peran, revisi terbit, pencarian, gambar bersama, privasi media draf, dan login. Dokumentasikan durasi, data yang berhasil pulih, dan temuan; backup belum memenuhi kesiapan operasional sampai pemulihan terbukti.

## Pemantauan dan insiden

`GET /api/health` memberikan `200 {"status":"ok"}` atau `503 {"status":"unavailable"}` tanpa rincian koneksi. Pantau respons, kegagalan request, kapasitas disk media/database, hasil backup, dan antrean persetujuan melalui alat operasional host. Log error aplikasi hanya mencatat waktu, kategori, dan request ID, tanpa SQL, body, atau token.

Jika migrasi/rilis gagal, pertahankan database dan alihkan ke artefak yang kompatibel atau halaman gangguan. Pemulihan database yang membuang penyuntingan terbaru memerlukan keputusan petugas berwenang. Jangan memulihkan atau menghapus data otomatis.

## Gerbang peluncuran

Tinjau seluruh Definition of Done PRD: persetujuan substansi/identitas/kontak/privasi, penetapan petugas, migrasi dan tinjauan konfigurasi Better Auth, uji akses dan sesi pada PostgreSQL native, browser/keyboard/zoom/pembaca layar, UAT, uji beban, pemulihan, HTTPS, proxy, dan kebijakan retensi. Pengembangan lokal bukan pengganti gerbang tersebut.

Matriks keputusan, pemilik yang belum ditunjuk, dan bukti wajib ada di [KESIAPAN-RILIS.md](KESIAPAN-RILIS.md). [UAT.md](UAT.md) menyediakan skenario langsung pakai, lembar hasil, kriteria ≥80%/minimal lima peserta, dan matriks persetujuan substansi/nomenklatur/sumber/simulator/kontak/privasi.

## Hasil pemeriksaan sarana lokal — 23 Oktober 2026

Pengguna mengonfirmasi staging PostgreSQL, hosting, dan petugas UAT belum tersedia. Node.js lokal adalah 22.22.1. `command -v` tidak menemukan `psql`, `postgres`, `initdb`, `pg_ctl`, `pg_dump`, `pg_restore`, `pgbench`, `k6`, `ab`, `wrk`, atau `hey`; `/usr/lib/postgresql` juga tidak tersedia. Launcher Docker Windows terdeteksi, tetapi `docker version` menyatakan integrasi WSL belum aktif dan socket `/var/run/docker.sock` tidak ditemukan. Tidak ada instalasi, unduhan image, pembukaan `.env`/database pengembangan, atau deployment yang dilakukan pada pemeriksaan ini.

Karena sarana native tidak tersedia, **uji beban PostgreSQL native dan latihan backup/restore belum dijalankan**. Langkah berikut merupakan prosedur yang disiapkan, bukan bukti keberhasilan. Self-check skrip di PGlite in-memory hanya menguji fixture/workflow dan batas keselamatan; bukan hasil performa atau pemulihan native. Hasil rinci mengikuti [VERIFICATION.md](VERIFICATION.md).

Verifikasi lokal skrip pada 23 Oktober 2026:

```bash
node --import tsx --test --experimental-test-isolation=none tests/operasional.test.ts
node --import tsx tests/operational/load-fixture.check.ts
```

Tiga tes batas target, ambang P95/gagal, dan penolakan redirect/HTTP gagal lulus. Self-check terpisah menghasilkan tepat 1.000 artikel/500 regulasi/500 FAQ melalui workflow, memeriksa 2.000 revisi approved oleh petugas berbeda dari pembuat/pengaju, serta menolak seed ulang tanpa tambahan audit. Pemeriksaan memakai database in-memory baru, bukan `.local/development-pg`; peringatan antrean query pg yang sudah dikenal tetap muncul. Typecheck lulus. CLI juga menolak origin luar dan nama database produksi dengan exit 1 sebelum koneksi; seluruh blok Bash diperiksa sintaksnya dengan `bash -n`, tanpa mengeksekusi latihan native.

## Latihan PostgreSQL native yang terisolasi

Gunakan host uji Linux dengan client/server PostgreSQL versi yang sama dan didukung, Bash, Node.js yang sesuai, dependensi proyek, `tar`, `sha256sum`, serta izin menjalankan PostgreSQL sebagai pengguna biasa. Jalankan dari salinan artefak rilis bersih tanpa `.env`, `.env.local`, `.env.production`, atau `.env.production.local`, bukan direktori data pengembangan. Pasang alat melalui prosedur host yang disetujui sebelum latihan. Jangan mengarahkan perintah ini ke database operasional. Tidak ada `dropdb`, reset migrasi, atau penghapusan `.local` pada prosedur ini.

Di Bash khusus untuk latihan, buat cluster baru dalam direktori privat dan port uji kosong. Jika port sudah dipakai atau langkah gagal, hentikan; jangan mematikan proses/database lain. Password sintetis hanya disimpan pada direktori privat sementara, tidak dicetak. `pgpass` digunakan oleh client PostgreSQL.

```bash
set -euo pipefail
umask 077
for tool in initdb pg_ctl createdb psql pg_dump pg_restore tar sha256sum node; do
  command -v "$tool" >/dev/null
done
for file in .env .env.local .env.production .env.production.local; do
  test ! -e "$file"
done
unset PGSERVICE PGSERVICEFILE PGOPTIONS PGHOSTADDR
export JAFA_DRILL_ROOT
JAFA_DRILL_ROOT=$(mktemp -d /tmp/jafa-native-drill.XXXXXX)
export PGHOST=127.0.0.1 PGPORT=54339 PGUSER=jafa_drill
export PGPASSFILE="$JAFA_DRILL_ROOT/pgpass"
node --input-type=module <<'NODE'
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const root = process.env.JAFA_DRILL_ROOT;
const password = randomBytes(32).toString('hex');
writeFileSync(root + '/password', password + '\n', {mode: 0o600});
writeFileSync(process.env.PGPASSFILE, `127.0.0.1:54339:*:jafa_drill:${password}\n`, {mode: 0o600});
NODE
initdb -D "$JAFA_DRILL_ROOT/pg" --username=jafa_drill --auth=scram-sha-256 --pwfile="$JAFA_DRILL_ROOT/password" --encoding=UTF8 --no-locale
pg_ctl -D "$JAFA_DRILL_ROOT/pg" -l "$JAFA_DRILL_ROOT/postgres.log" -o "-h 127.0.0.1 -p 54339 -k $JAFA_DRILL_ROOT" -w start
trap 'if test -n "${JAFA_DRILL_APP_PID:-}"; then kill "$JAFA_DRILL_APP_PID" 2>/dev/null || true; wait "$JAFA_DRILL_APP_PID" 2>/dev/null || true; fi; pg_ctl -D "$JAFA_DRILL_ROOT/pg" -m fast -w stop' EXIT
createdb --template=template0 jafa_load_source
export DATABASE_URL
DATABASE_URL=$(node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
const password = readFileSync(process.env.JAFA_DRILL_ROOT + '/password', 'utf8').trim();
process.stdout.write(`postgresql://jafa_drill:${password}@127.0.0.1:54339/jafa_load_source`);
NODE
)
export JAFA_LOCAL_DATABASE=false JAFA_CONTENT_PREVIEW=false
export APP_URL=http://127.0.0.1:53174
export MEDIA_DIRECTORY="$JAFA_DRILL_ROOT/media"
export AUTH_RATE_LIMIT_KEY
AUTH_RATE_LIMIT_KEY=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
export BETTER_AUTH_SECRET
BETTER_AUTH_SECRET=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
mkdir "$MEDIA_DIRECTORY"
npm run db:migrate
JAFA_LOAD_DATABASE_URL="$DATABASE_URL" node --import tsx scripts/seed-load.ts
```

`seed-load.ts` menolak host selain `127.0.0.1`, database di luar awalan `jafa_load_`, parameter URL tambahan, serta database yang telah berisi data aplikasi. Seed hanya membuat akun editor/penyetuju sintetis `@uji.invalid` dengan sandi acak yang tidak ditampilkan, lalu 1.000 artikel, 500 regulasi, dan 500 FAQ melalui draf → ajukan → persetujuan oleh akun berbeda. Tidak ada materi prototipe yang disetujui. Bila seed terhenti, pertahankan artefak untuk pemeriksaan dan buat cluster uji baru; script tidak membersihkan data parsial.

### Beban halaman/list/pencarian

Masih di shell/cluster latihan tadi, bangun aplikasi dan jalankan server khusus pada `127.0.0.1:53174`. Jangan memakai `npm run dev`, yang menyiapkan data pengembangan. Tunggu hingga `/api/health` pada origin itu berstatus 200 (periksa melalui browser lokal) sebelum menjalankan blok beban; bila server gagal, periksa log privat dan hentikan latihan. Server berjalan di latar agar snapshot dapat dilanjutkan pada shell yang sama; hasil JSON disimpan di direktori bukti privat:

```bash
NODE_ENV=production npm run build
NODE_ENV=production node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 53174 > "$JAFA_DRILL_ROOT/app.log" 2>&1 &
JAFA_DRILL_APP_PID=$!
```

```bash
JAFA_LOAD_BASE_URL=http://127.0.0.1:53174 JAFA_LOAD_CONFIRM=test-only \
  node --import tsx scripts/load-public.ts > "$JAFA_DRILL_ROOT/load-result.json"
```

Runner memakai 50 pembaca HTTP simultan selama 300 detik tanpa jeda berpikir, merotasi delapan rute detail/list/pencarian, dengan timeout request 10 detik. Origin harus loopback HTTP dengan port uji ≥1024; penanda artikel sintetis diperiksa sebelum beban. Redirect ditolak dan tidak diikuti, termasuk ke origin luar. HTTP selain 200, redirect, timeout, dan error jaringan dihitung gagal. JSON melaporkan jumlah request, status, P95 dan tingkat gagal total serta setiap rute; exit nonzero bila preflight gagal, tidak ada sampel, P95 ≥1.000 ms, atau tingkat gagal ≥1% pada total/salah satu rute. Periksa exit code sebelum menyatakan lulus; berkas kosong bukan hasil uji sukses.

Catat commit/versi Node/PostgreSQL, CPU/RAM/disk, ukuran data terbit aktual, proses lain, konfigurasi pool/proxy, mesin pembangkit beban, waktu, dan apakah cache dingin/hangat. Runner mengukur waktu HTTP lokal sampai body selesai dibaca, termasuk transfer/antrean; itu bukan pengukuran waktu server murni. Prapemeriksaan penanda menghangatkan satu rute. Jangan menyebut hasil lokal sebagai kapasitas hosting staging atau Core Web Vitals. Ukur LCP ≤2,5 detik, CLS ≤0,1, dan interaksi ≤200 ms terpisah melalui browser pada host nyata. Jika target gagal, simpan hasil dan perbaiki kapasitas/jalur lambat sebelum mengulang; jangan melonggarkan ambang diam-diam.

### Backup dan pemulihan ke database baru

Untuk latihan pemulihan lengkap, setelah uji beban buat admin **uji** melalui bootstrap Node langsung, jalankan UAT-05/07/08 pada cluster ini, dan catat ID revisi, akun/peran, media bersama, serta media draf. Sandi sementara tidak disimpan dalam laporan. Seed beban saja tidak menyediakan media atau bukti login; snapshot tanpa persiapan ini hanya membuktikan salinan data sintetis, belum memenuhi T-16.

Hentikan server aplikasi latihan secara wajar sebelum snapshot; jangan menerima unggahan/keputusan saat database dan media disalin. Lanjutkan pada shell cluster yang sama. Arsip berikut hanya berisi fixture lokal; untuk backup operasional, tambahkan enkripsi dan pengiriman ke lokasi terpisah sebagaimana kebijakan di atas, lalu uji pulihkan dari salinan tersebut.

```bash
kill "$JAFA_DRILL_APP_PID"
wait "$JAFA_DRILL_APP_PID" || true
unset JAFA_DRILL_APP_PID
pg_dump --format=custom --file="$JAFA_DRILL_ROOT/database.dump" jafa_load_source
tar -C "$MEDIA_DIRECTORY" -cf "$JAFA_DRILL_ROOT/media.tar" .
sha256sum "$JAFA_DRILL_ROOT/database.dump" "$JAFA_DRILL_ROOT/media.tar" > "$JAFA_DRILL_ROOT/archives.sha256"
sha256sum --check "$JAFA_DRILL_ROOT/archives.sha256"
for table in User Account Session Verification ContentItem ContentRevision RevisionContributor SourceReference RevisionProfession MediaAsset RevisionMedia PublishedSearchEntry AuditEvent RateLimit _prisma_migrations; do
  printf '%s ' "$table"
  psql -X --set=ON_ERROR_STOP=on --dbname=jafa_load_source --command="COPY (SELECT row_to_json(t)::text FROM \"$table\" t ORDER BY row_to_json(t)::text) TO STDOUT" | sha256sum
done > "$JAFA_DRILL_ROOT/source-rows.sha256"
createdb --template=template0 jafa_load_restore
date -u +%FT%TZ > "$JAFA_DRILL_ROOT/restore-start.txt"
pg_restore --single-transaction --exit-on-error --no-owner --no-acl --dbname=jafa_load_restore "$JAFA_DRILL_ROOT/database.dump"
mkdir "$JAFA_DRILL_ROOT/restored-media"
tar -C "$JAFA_DRILL_ROOT/restored-media" -xf "$JAFA_DRILL_ROOT/media.tar"
for table in User Account Session Verification ContentItem ContentRevision RevisionContributor SourceReference RevisionProfession MediaAsset RevisionMedia PublishedSearchEntry AuditEvent RateLimit _prisma_migrations; do
  printf '%s ' "$table"
  psql -X --set=ON_ERROR_STOP=on --dbname=jafa_load_restore --command="COPY (SELECT row_to_json(t)::text FROM \"$table\" t ORDER BY row_to_json(t)::text) TO STDOUT" | sha256sum
done > "$JAFA_DRILL_ROOT/restored-rows.sha256"
diff -u "$JAFA_DRILL_ROOT/source-rows.sha256" "$JAFA_DRILL_ROOT/restored-rows.sha256"
(cd "$MEDIA_DIRECTORY" && find . -type f -exec sha256sum {} + | sort) > "$JAFA_DRILL_ROOT/source-media.sha256"
(cd "$JAFA_DRILL_ROOT/restored-media" && find . -type f -exec sha256sum {} + | sort) > "$JAFA_DRILL_ROOT/restored-media.sha256"
diff -u "$JAFA_DRILL_ROOT/source-media.sha256" "$JAFA_DRILL_ROOT/restored-media.sha256"
psql -X --set=ON_ERROR_STOP=on --dbname=jafa_load_restore --command=ANALYZE
date -u +%FT%TZ > "$JAFA_DRILL_ROOT/restore-data-end.txt"
```

Digest baris memeriksa semua tabel aplikasi termasuk akun, sesi, revisi, proyeksi pencarian, audit, dan relasi media; digest berkas memeriksa isi media. Database tujuan dibuat baru dari `template0`; prosedur tidak menimpa sumber atau memakai `--clean`/`--create` pada restore. Gunakan hanya dump buatan latihan sendiri/backup tepercaya yang sudah ditinjau.

Arahkan aplikasi latihan ke database **`jafa_load_restore`** dengan mengganti hanya nama DB pada `DATABASE_URL` di shell privat dan `MEDIA_DIRECTORY` ke `"$JAFA_DRILL_ROOT/restored-media"`; jangan mencetak URL. Mulai ulang server latihan dengan artefak/konfigurasi auth yang sama. Periksa `/api/health`, login/peran/reset akun uji, detail/list/pencarian/sitemap, revisi kerja yang tetap privat, media bersama yang tetap publik, media draf yang ditolak publik, serta audit/riwayat. Catat HTTP dan hasil tiap ID fixture. Bila login/media tidak disiapkan atau diperiksa, nyatakan cakupan latihan parsial.

Catat waktu akhir ketika seluruh pemeriksaan aplikasi berhasil, bukan hanya saat `pg_restore` selesai. Laporan memuat versi, manifest/checksum, jumlah data sebelum/sesudah, hasil perbandingan, durasi total pemulihan, titik backup/RPO, temuan dan keputusan petugas. Tutup shell latihan untuk menghentikan cluster melalui trap; direktori privat dipertahankan sebagai bukti sementara. Tetapkan penanggung jawab pembersihan aman arsip/kredensial sintetis sesuai retensi uji; jangan menghapus `.local`. Pemulihan lokal ini tetap tidak menggantikan uji staging pada host yang akhirnya dipilih.

Rujukan perintah: [PostgreSQL — SQL Dump](https://www.postgresql.org/docs/current/backup-dump.html), [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html), [initdb](https://www.postgresql.org/docs/current/app-initdb.html), dan [pg_ctl](https://www.postgresql.org/docs/current/app-pg-ctl.html). Pilihan `--single-transaction`/`--exit-on-error` dipakai agar kegagalan restore tidak dilaporkan sebagai sukses; `pg_dump` hanya menjaga konsistensi snapshot database, sehingga snapshot media tetap memerlukan penghentian penulisan terkoordinasi.
