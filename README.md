# Jafa Hub

Portal pengetahuan jabatan fungsional DJKN berdasarkan [PRD-Jafa-Hub.md](PRD-Jafa-Hub.md) dan prototipe lokal. Dibangun dengan Next.js App Router, React, TypeScript, CSS Modules, Prisma, dan PostgreSQL.

## Menjalankan lokal

Gunakan Node.js 22.22 atau lebih baru pada lini Node 22 yang didukung.

```bash
npm ci
npm run dev
```

Buka **http://localhost:3000**. Tangkapan layar hasil tersedia untuk [desktop](docs/hasil/beranda-desktop.png), [mobile](docs/hasil/beranda-mobile.png), dan [login pengelola](docs/hasil/login-pengelola.png). Jika port tersebut digunakan aplikasi lain:

```bash
npm run dev -- --port 5174
```

Perintah dev membuat `.env` beserta `AUTH_RATE_LIMIT_KEY` dan `BETTER_AUTH_SECRET` acak bila belum tersedia, menyiapkan database pengembangan di `.local/development-pg`, menerapkan migrasi, dan mengimpor materi sebagai **draf**. Impor berulang tidak menggandakan slug atau menimpa penyuntingan. Jangan hapus `.local` jika ingin mempertahankan data pengembangan. Untuk database lama, ikuti maintenance dan backup sebelum migrasi autentikasi di [docs/OPERASIONAL.md](docs/OPERASIONAL.md#migrasi-autentikasi-database-lama).

Database lokal memakai PGlite, mesin PostgreSQL tertanam. Produksi tetap memakai PostgreSQL melalui `DATABASE_URL`; jalur tertanam dinonaktifkan pada `NODE_ENV=production`. Satu proses boleh membuka database lokal ini pada satu waktu. Hentikan dev sebelum menjalankan perintah bootstrap/impor yang membuka database yang sama.

Pembukaan database persisten kini dilindungi kunci antarproses; launcher menutup engine pada worker pemilik sebelum keluar. Backup database beserta media dan restore ke direktori baru tersedia melalui `npm run local:backup -- <tujuan-baru>` serta `npm run local:restore -- <backup> <tujuan-baru>`. Prosedur, batas kunci, dan perlindungan cadangan privat ada di [docs/DATA-LOKAL.md](docs/DATA-LOKAL.md).

## Pratinjau dan publikasi

`.env.example` memakai `JAFA_CONTENT_PREVIEW=false`. Ubah ke `true` hanya untuk memperlihatkan materi prototipe tanpa menerbitkan draf. Banner menandai pratinjau ini. Profil, artikel, FAQ, pencarian, dan asisten menggunakan data pratinjau ketika mode tersebut aktif; perubahan CMS tidak mengganti data pratinjau.

Untuk menguji portal dari database dan alur publikasi, ubah menjadi:

```dotenv
JAFA_CONTENT_PREVIEW="false"
```

Mulai ulang dev. Konten hanya muncul setelah editor mengajukan dan penyetuju menerbitkannya. Dalam produksi, pratinjau selalu mati sekalipun variabel tersebut salah diaktifkan. Gangguan database ditampilkan sebagai gangguan layanan, bukan daftar kosong.

## Membuat admin pertama

Jalankan setelah persiapan lokal selesai dan dev dihentikan:

```bash
npm run admin:bootstrap -- --email "<email-petugas>" --name "<nama-petugas>"
```

Sandi sementara acak ditampilkan sekali di terminal; tidak ada akun bawaan. Simpan melalui kanal internal, jalankan dev kembali, lalu buka **/admin/login** dan ganti sandi awal. Bootstrap menolak membuat admin tambahan ketika admin aktif sudah ada.

Admin membuat akun editor dan penyetuju pada **/admin/pengguna**. Peran tidak saling merangkap:

| Peran | Pekerjaan |
| --- | --- |
| Editor | Menyimpan draf, mengunggah gambar, mengajukan revisi |
| Penyetuju | Membandingkan revisi, mengembalikan dengan catatan, menerbitkan, menarik |
| Admin akun | Membuat akun, mengubah peran/akses, mereset sandi |

Admin akun tidak dapat menyunting atau menerbitkan konten. Semua kontributor revisi—pembuat, penyunting, dan pengaju—dilarang menerbitkan atau mengembalikan revisi itu, termasuk setelah perubahan peran. Sesi dicabut saat sandi, peran, atau akses diubah. Admin aktif terakhir dilindungi.

Jika semua admin kehilangan akses, petugas teknis memakai `npm run admin:recover -- --email "<email-admin>" --operator "<petugas-teknis>" --reason "<alasan-pemulihan>"` dari terminal privat interaktif setelah dev dihentikan. CLI hanya memulihkan admin aktif, mencabut sesi, mewajibkan ganti sandi, dan mencatat operator/alasan. Prosedur lengkap ada di [docs/OPERASIONAL.md](docs/OPERASIONAL.md#akun-dan-pemulihan-akses).

## Halaman dan kemampuan

- `/`: hero, akses tiga JF, pengantar, artikel, regulasi, dan akses simulator.
- `/informasi` dan tiga profil: definisi, jenjang, tugas, kompetensi, nomenklatur, sumber, artikel, FAQ.
- `/insight` dan `/insight/[slug]`: filter bidang/jenis, paginasi, isi dan rujukan artikel.
- `/regulasi`: nomor/judul, filter, catatan status, dan tautan sumber resmi.
- `/faq`: jawaban yang sama dengan asisten terkurasi global, dibuka dari tombol gelembung percakapan pada header. Asisten tidak memakai model AI.
- `/pencarian`: pencarian seluruh kata, tidak membedakan kapital, hanya proyeksi versi terbit.
- `/simulasi`: konversi lokal tanpa pengiriman input ke server, rincian rumus, validasi, reset, dan tabel baseline.
- `/tentang`, `/kontak`, `/privasi`: halaman pendukung tetap melalui persetujuan.
- `/admin`: dashboard dan modul CMS, revisi, persetujuan, pengguna, aktivitas.
- `/api/health`, `sitemap.xml`, `robots.txt`: pemeriksaan layanan dan metadata publik.

Revisi kerja terpisah dari penunjuk publik. Pengajuan mengunci isi; simpan versi basi ditolak. Keputusan, proyeksi pencarian, dan audit disimpan dalam satu transaksi. Media unggahan disimpan di luar `public/`, diperiksa isinya, dibersihkan metadata, dan hanya dapat dibaca publik selama dirujuk revisi terbit.

Markdown terbatas mendukung paragraf, heading `##`, daftar `-`, `**tebal**`, serta tautan HTTPS/path lokal. Raw HTML tidak dieksekusi. Unggahan hanya JPEG/PNG/WebP diam, maksimal 5 MB dan 20 megapiksel.

## Materi awal

29 rekaman: 3 profil, 4 artikel, 6 regulasi, 13 FAQ, dan 3 halaman pendukung. Tiga topik asisten yang tumpang tindih digabung dengan FAQ profil. Tanggal tinjauan prototipe **21 Oktober 2026** dipertahankan; tanggal deploy tidak menggantinya. Judul artikel pratinjau diringkas untuk keterbacaan tanpa mengubah ringkasan dan sumber.

Sumber asli disimpan di `data/legacy-content.mjs`; atribusi di [docs/SOURCES.md](docs/SOURCES.md). Font Barlow Condensed dan Plus Jakarta Sans serta lisensi Phosphor disertakan di `public/assets`. Ketiga ilustrasi berasal dari prototipe dan dilabeli konseptual. PPT asli dan biografi narasumber tidak disalin ke aset publik. Kanal khusus Jafa Hub tidak diisi dengan email/nomor/jam layanan perkiraan.

## Verifikasi

```bash
npm run typecheck
npm test
npm run test:integration
npm run build
```

Unit mencakup empat hasil acuan dan 105 kombinasi simulator, input yang tidak sah, sumber, URL/Markdown, sandi, serta gambar. Integrasi memakai PostgreSQL tertanam terisolasi dengan Prisma/driver PostgreSQL yang sama: siklus revisi, bypass peran, konflik versi, transaksi audit, media bersama, akun, rate limit, dan impor idempoten.

[docs/VERIFICATION.md](docs/VERIFICATION.md) mencatat hasil aktual dan batas verifikasi. [docs/DESAIN.md](docs/DESAIN.md) memuat arah visual, atribusi, dan kritik screenshot. Jangan menafsirkan hasil pengembangan sebagai persetujuan substansi atau kesiapan produksi.

Suite browser membuat server sendiri pada port 5184, salinan kode/cache unik, serta database dan media sementara di direktori temporer sistem. Data uji melewati alur pengajuan/persetujuan dengan akun editor dan penyetuju berbeda; mode pratinjau dimatikan. Jalankan pada host yang mendukung Chromium dan port lokal:

```bash
npm run test:e2e
# Jika port 5184 dipakai:
PLAYWRIGHT_PORT=5185 npm run test:e2e
```

Suite menolak `PLAYWRIGHT_BASE_URL` dan tidak memakai ulang server dev. Petunjuk serta batas pemeriksaan ada di [docs/E2E.md](docs/E2E.md). Skenario penerimaan instansi ada di [docs/UAT.md](docs/UAT.md); keputusan dan bukti yang masih diperlukan dicatat di [docs/KESIAPAN-RILIS.md](docs/KESIAPAN-RILIS.md).

Regresi fokus dialog/menu, skip link, validasi CMS/ganti sandi/akun, gulir keyboard tabel/percakapan FAQ, reflow dan jarak teks dicatat di [docs/AKSESIBILITAS.md](docs/AKSESIBILITAS.md). Kesalahan terkait kolom dengan fokus menuju masalah dan input bertahan ketika tindakan ditolak, termasuk kolom khusus profil/regulasi serta daftar jenjang/tugas/kompetensi. Formulir akun mengikuti pilihan tersimpan sesudah simpan/reset; nilai akses rusak ditolak. Hasil akun serta simpan/ajukan/putuskan/tarik konten menerima fokus. Pesan konten bertahan saat formulir/rute berganti dan dibersihkan ketika tindakan baru atau navigasi.

**Pemeriksaan terbaru, 9 November 2026:** keputusan CMS pada zoom tab asli 200% dengan jarak teks normal/diperbesar lulus di 720/320 CSS px: **52 state, 24 screenshot ditinjau**, minimum teks 5,35:1, batas kontrol 3,48:1 dan fokus 5,47:1. Pelepasan gambar membersihkan error dan memulihkan fokus; textarea penarikan tetap terlihat saat menerima fokus. Regresi penolakan berkas/penggantian/sesi dan **50/50 E2E, lint/typecheck serta build produksi terisolasi lulus**. Hasil serta batas ada di [docs/VERIFICATION.md](docs/VERIFICATION.md).

Paket akun/ganti sandi/FAQ/unggahan sebelumnya mencakup 76 state dan 32 screenshot zoom; aksi akun juga sudah berhenti mengirim ulang state sandi sementara. Hasil 48/48 E2E pada paket itu mendahului perubahan terbaru.

**Paket zoom tab asli 200% dan kontras profil/regulasi lulus pada 6 November 2026:** 28 pengukuran state di 720/320 CSS px, 20 screenshot ditinjau, lint CSS dan build terisolasi lulus. Dua warna border diperbaiki agar melewati 3:1; rasio minimum sampel aktif adalah 5,80:1 untuk teks, 3,20:1 untuk batas kontrol dan 5,04:1 untuk fokus. Hasil ini mendahului CSS 9 November.

Hasil 18/18 unit dan 45/45 integrasi tetap historis, tidak diulang untuk perubahan komponen/argumen state yang diabaikan server. Hasil 46/46 E2E juga mendahului paket terbaru. Pembaca layar nyata, seluruh hover/indikator native/state aksesibilitas, variasi detail CMS serta perangkat nyata masih perlu diperiksa; bukan klaim WCAG atau UAT selesai.

## Produksi dan perbedaan dari default PRD

Gunakan PostgreSQL native, HTTPS, dan volume media persisten. Set `JAFA_LOCAL_DATABASE=false`, `JAFA_CONTENT_PREVIEW=false`, `APP_URL` ke domain nyata, serta `AUTH_RATE_LIMIT_KEY` dan `BETTER_AUTH_SECRET` ke nilai acak unik per lingkungan. Tetapkan `MEDIA_DIRECTORY` ke direktori volume di luar artefak build. Petunjuk lengkap ada di [docs/OPERASIONAL.md](docs/OPERASIONAL.md).

Autentikasi memakai **Better Auth 1.7.13** melalui API server login/sesi/logout dan adapter Prisma. Facade aplikasi mempertahankan registrasi tertutup, hash token sesi di database, cookie bertanda tangan, batas sesi absolut delapan jam, dan rate limit persisten untuk API maupun Server Actions. Hash scrypt lama dipindahkan ke `Account.password` tanpa reset, lalu diperkuat saat login berhasil. Seluruh sesi lama dicabut oleh migrasi. Endpoint aplikasi tetap terbatas; seluruh handler Better Auth tidak diekspos. Hasil dan batas pemeriksaan ada di [docs/KEAMANAN.md](docs/KEAMANAN.md).

Belum dilakukan: UAT instansi, persetujuan nama jabatan/sumber/simulator/kontak/privasi, audit keamanan independen, uji beban PostgreSQL native, serta backup dan pemulihan staging. Hosting/domain dan petugas produksi tetap ditetapkan instansi.
