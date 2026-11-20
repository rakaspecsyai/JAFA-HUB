# Serah-terima aktif Jafa Hub

Diperbarui **20 November 2026** setelah penyiapan Preview Vercel dan database Supabase staging. Build Preview serta proteksi akses sudah terverifikasi. Pemeriksaan `/api/health` dan login CMS dari browser yang sudah masuk ke Vercel masih perlu dikonfirmasi.

## Mulai di sini

1. Baca `AGENTS.md`, dokumen ini dan `README.md`, lalu periksa `git status` serta kode yang terkait. Catatan ini bukan pengganti pemeriksaan kode.
2. [STATUS-PENGEMBANGAN.md](docs/STATUS-PENGEMBANGAN.md) memetakan kemampuan/paket; [JALUR-DEPLOY.md](docs/JALUR-DEPLOY.md) memetakan pekerjaan sampai cloud. Baca bagian relevan dalam `PRD-Jafa-Hub.md` sebelum mengubah produk.
3. Paket lulus dibuka kembali hanya karena perubahan terkait, cacat yang dapat direproduksi atau kebutuhan baru; jangan kembali mengulang aksesibilitas/screenshot tanpa batas.
4. Pada pemeriksaan 20 November, checkout aktif adalah `main` (`2ad4d70`). Perubahan TLS untuk Preview sudah di-push ke `staging` (`8dc8bc5`). Periksa branch sebelum mengubah atau menguji kode yang dipakai Preview.

## Staging aktif

| Bagian | Status |
| --- | --- |
| Branch | `main` masih memakai Next.js `16.4.3`. Commit `8dc8bc5` di `staging` menambah `DATABASE_CA_CERT` dan menaikkan Next.js ke `16.4.6`. Prisma CLI, Client dan adapter tetap `7.10.1`. Instal sesuai lockfile dengan `npm ci`. |
| Vercel Preview | GitHub mencatat deployment `8dc8bc5` berhasil. Pada 20 November, akses tanpa sesi ke `/api/health` dan `/admin/login` menerima `302` ke login Vercel. Hasil ini membuktikan proteksi Preview aktif. Health database dan login CMS dari browser yang sudah masuk belum terkonfirmasi. |
| Supabase staging | `vector` terpasang di skema `public`. `prisma migrate status` melaporkan lima migrasi mutakhir. Dari WSL, role `jafa_app` berhasil memakai Transaction pooler `6543` dengan verifikasi TLS dan membaca tabel aplikasi. Pemeriksaan sebelumnya menemukan satu admin aktif yang masih wajib mengganti sandi. Hasil pemulihan atau login belum terkonfirmasi. |
| Variabel Preview | Pengguna melaporkan variabel sudah diisi. Periksa cakupan **Preview → `staging`** dan pastikan deployment yang dipakai dibuat setelah penyimpanan variabel terakhir. Panduan ada di [konfigurasi operasional](docs/OPERASIONAL.md#postgresql-dan-konfigurasi-produksi). Rincian `DATABASE_CA_CERT` tersedia pada branch `staging`. |

- Preview memakai URL HTTPS branch `staging` sebagai `APP_URL`, tanpa garis miring akhir. Ambil URL dari Vercel. Isikan `DATABASE_URL` dengan role aplikasi pada Transaction pooler `6543` dan `DATABASE_CA_CERT` dengan isi PEM CA Supabase. Hapus parameter SSL dari URL saat memakai CA melalui environment. Gunakan `BETTER_AUTH_SECRET` dan `AUTH_RATE_LIMIT_KEY` yang berbeda. Set `JAFA_LOCAL_DATABASE`, `JAFA_CONTENT_PREVIEW` dan `JAFA_RAG_ENABLED` ke `false`. Biarkan `OPENAI_API_KEY` kosong.
- Migrasi dari WSL memakai Session pooler `5432` dalam konfigurasi privat. `~/.config/jafa/staging-migrate.env` untuk migrasi dan `~/.config/jafa/staging-app.env` untuk role aplikasi. Pastikan Data API Supabase mati sesuai rancangan akses server melalui Prisma. Sandi database berbeda dari sandi login CMS. Jika admin kehilangan sandi, gunakan `scripts/recover-admin.ts` dengan konfigurasi staging dari terminal privat. Prosedur ini mereset akun aktif yang sudah ada. [Pemulihan akses](docs/OPERASIONAL.md#akun-dan-pemulihan-akses)
- Pengguna melakukan deploy dan konfigurasi cloud sendiri. Dukungan Storage Vercel masih terbuka. Unggahan gambar dan PDF saat ini bergantung pada direktori media persisten. Gunakan data sintetis untuk uji CMS teks di Preview sambil menyiapkan penyimpanan objek privat.

## Keadaan produk sekarang

| Bagian | Keadaan yang ditemukan |
| --- | --- |
| Portal/CMS | Next.js App Router, React, TypeScript, CSS Modules, Prisma/PostgreSQL dan Better Auth. Portal, simulator, akun/peran, revisi/persetujuan, pencarian dan media sudah diimplementasikan lokal |
| A/B | Filter revisi terbaru, kanal Kontak dan pemulihan sesi/konflik CMS mempunyai bukti; rincian historis di VERIFICATION.md |
| C1/C2 | Docker/Compose, pemeriksa konfigurasi produksi dan alur native HTTPS tersedia; ini bukan deployment cloud |
| C3 | Transfer logis PGlite → PostgreSQL dengan checksum media/PDF, verifikasi skema/tujuan baru, rollback dan sesi baru. CLI host serta alur Compose dengan volume persisten teruji pada data sintetis |
| R2a/R2b | PDF privat, ekstraksi/halaman, persetujuan, indeks/cache embedding, pencarian kata kunci + pgvector dan penarikan sumber tersedia |
| R3 | Endpoint/panel jawaban bersumber, kutipan/fallback dan anggaran bersama tersedia melalui adapter awal OpenAI Responses API; model/API nyata belum dievaluasi |
| R4a | `npm run rag:evaluate` mengevaluasi **kata kunci saja**, tanpa API, dari acuan revisi/halaman; laporan privat dan `betaReady=false` |
| R4/rilis | PDF resmi/kasus acuan, evaluasi semantik/generatif, penilaian substansi, staging dan gerbang produksi masih diperlukan |

**Portal inti dapat menuju staging/rilis dengan FAQ terkurasi dan AI nonaktif. RAG bukan syarat otomatis P0** (PRD §5). Jalur cloud dan RAG dapat berjalan paralel; jangan menahan seluruh persiapan cloud karena model/PDF AI belum tersedia.

## Keputusan yang dipertahankan

- Editor, penyetuju dan admin akun terpisah. Seluruh kontributor revisi dilarang memberi keputusan atas revisinya sendiri, termasuk setelah perubahan peran. Publikasi hanya dari revisi disetujui; impor tetap draf.
- PDF asli tetap privat setelah persetujuan. RAG hanya memakai sumber layak/disetujui; **Dicabut** dikeluarkan, **Diubah** dicari dengan label. Sumber diperiksa ulang sebelum jawaban dikirim. Jangan memakai sumber draf/internal atau prototipe sebagai korpus AI publik otomatis.
- Pengguna memilih API hosted berbiaya murah, bukan model lokal. Keputusan Rp0 sebelumnya tidak berlaku lagi untuk AI; anggaran infrastruktur tidak otomatis berubah.
- Embedding **`text-embedding-3-small`**, 1.536 dimensi, dipilih 13 November dan dikonfirmasi 16 November. Ini belum memilih model pembuat jawaban. Model generatif, plafon/tarif, akses akun dan privasi provider belum disepakati. Rekomendasi model/harga pada PRD RAG adalah proposal historis, bukan persetujuan biaya; periksa harga/akses saat akan dipakai.
- `JAFA_RAG_ENABLED=false` adalah default. Key + anggaran/tarif embedding dapat memicu indeks berbayar meski panel AI mati. Untuk rilis inti tanpa biaya AI, pastikan **key kosong pada konfigurasi efektif**, selain flag mati.
- Vercel dan Supabase dipilih untuk staging sementara. Target dan domain produksi, anggaran, serta petugas masih perlu ditetapkan sebelum peluncuran.

## Konfigurasi dan data lokal

- Metadata `.env` pada 17 November: PGlite dipilih, **pratinjau prototipe aktif**, flag RAG mati, key/model generatif tidak terisi dan konfigurasi anggaran AI belum lengkap. Tidak ada nilai rahasia dicatat. Ini keadaan **berkas lokal**, bukan bukti environment proses aktif atau cloud.
- Dengan pratinjau aktif, halaman publik menampilkan prototipe; itu bukan bukti konten CMS diterbitkan. Produksi harus memakai `JAFA_CONTENT_PREVIEW=false` dan `JAFA_LOCAL_DATABASE=false`.
- **Jangan hapus `.local`, mengganti database dengan database kosong, mereset WAL, mengulang bootstrap atau pemulihan lama untuk setup.** Data/cadangan pengguna dan artefak uji di sana berbeda fungsi.
- Satu proses saja boleh membuka PGlite yang sama. Tes memakai database/media/cache terisolasi; hentikan dev sebelum CLI yang membuka database pengembangan. Pengujian terakhir tidak memigrasikan database pengguna; skema/data live tidak dibuka pada audit ini. Backup sebelum launcher dev berikutnya menerapkan migrasi yang belum ada.
- Maintenance Better Auth lama pada 26 Oktober sudah selesai; jangan mengulang prosedur historis tanpa kebutuhan baru. Akun/hash/ID dan materi harus dipertahankan.
- `local:backup`/`local:restore` tetap khusus backup fisik PGlite. **Alat transfer logis kini tersedia** melalui `db:transfer` ([panduan](docs/PEMINDAHAN-DATA.md)): 16 tabel aplikasi/media/PDF dipertahankan, Session/Verification/RateLimit tidak dipindahkan, tujuan baru/skema sama wajib, satu audit migrasi tujuan dipertahankan. Sebelum cloud, petugas tetap memilih database produksi baru atau transfer data pengguna; jangan menyalin `.local/development-pg` ke volume native.
- `.agents/skills` dan symlink `.claude/skills` adalah tooling lokal yang diabaikan Git, bukan kebutuhan hosting. Jangan hapus salinan kanonis tanpa memperbarui symlink; clone lain perlu menyiapkan tooling yang diperlukan secara terpisah.
- Skill `supabase` dan `supabase-postgres-best-practices` tersedia lokal untuk Codex. Pada clone lain, pasang dengan `npx skills add supabase/agent-skills --agent codex` bila diperlukan.

## Bukti verifikasi dan batas

- **TLS dan Preview, 19–20 November:** perubahan di `8dc8bc5` lulus 34 tes unit, typecheck, build produksi terisolasi dan uji CA melalui PostgreSQL native. CA yang salah ditolak. `npm audit --omit=dev` saat itu melaporkan 0 temuan setelah pembaruan Next.js. Status deployment dan proteksi Preview diperiksa ulang pada 20 November. Koneksi dari runtime Vercel dan alur browser CMS masih menunggu bukti.
- **C3 Compose, 18 November:** typecheck, 4/4 integrasi transfer, uji native, build kedua image dan uji Compose lulus. Aplikasi membaca artikel terbit dan hasil pencarian, menyajikan gambar utuh serta membatasi PDF privat menurut peran setelah login ulang, termasuk setelah pembuatan ulang container dengan volume yang sama. Bukti `.local/transfer-compose-WqsxvE/result.json`. Batas HTTP loopback dan konfigurasi yang dipakai dicatat di [VERIFICATION.md](docs/VERIFICATION.md).
- **C3 transfer data, 17 November:** 33/33 unit, 68/68 integrasi penuh, regresi status SQL dan typecheck lulus. Ekspor/impor native oleh role non-superuser mempertahankan 16 tabel/media/PDF/vector, mengecualikan sesi dan menolak impor ulang; seluruh nilai tetap setelah restart. `.local/transfer-native-yfkrET/result.json` mencatat `passed=true` dan cleanup container/volume/fixture. Log tambahan `.local/data-transfer-20261117-VdC43G/`. Sandbox gagal menangkap stdout beberapa tes CLI lama; pengulangan lengkap di luar sandbox lulus. Error SQL WASM yang mengubah status proses menjadi 100 kini dipulihkan di adapter tanpa menelan penolakan SQL. Tidak ada perubahan skema/dependensi, data pengguna, UI atau API berbayar.
- **R4a, 16 November:** 33/33 unit, 63/63 integrasi penuh, 13/13 lifecycle/CLI dan typecheck lulus. Guard database belum ada kemudian lulus 2/2 CLI final + typecheck. Bukti `.local/rag-r4a-BV3jg0/result.json` dan log di direktori yang sama.
- R4a juga memperbaiki efek WASM/PGlite pada `process.exitCode` saat buka/tutup. Regresi kunci, sinyal/restart, backup/restore, normal exit dan exit gagal lulus. Evaluator tidak membuat database baru atau menimpa laporan lama; laporan hanya `.local`/direktori privat, dengan pemeriksaan symlink dan izin berkas.
- Demo `demo-final/report/report.json` di direktori bukti R4a berasal dari PDF sintetis yang disetujui petugas berbeda. Satu kasus sengaja meleset; Recall/MRR 0,5 dan exit 2 adalah hasil fixture, **bukan mutu korpus resmi**. DB/media demo dibersihkan; PDF/laporan dipertahankan privat.
- **R3, 16 November (sebelum R4a):** 31 unit, 59 integrasi, 4 browser RAG, 4 regresi FAQ, capture 2 kasus/3 lebar, typecheck/lint dan build kedua image lulus. Bukti `.local/rag-r3-stEt90/result.json`.
- **Native R2b/R3, 16 November:** tujuh fase HTTPS, PostgreSQL 17 + pgvector 0.8.7 dan lima migrasi sebagai role `jafa` non-superuser lulus; `.local/native-runtime-5hEJIe/result.json` memuat `passed=true` dan `isolatedResourcesRemoved=true`. Key kosong/AI mati; ini bukan generasi API nyata. Container/network/volume fixture dibersihkan, image/cache dipertahankan.
- Build aplikasi diulang dalam uji transfer Compose 18 November dan paket TLS 19 November. Browser dan alur native HTTPS terakhir diuji pada R3. Audit dokumentasi 17 November mencocokkan berkas dan bukti dengan manifest `.local/context-audit-20261117-I9cX6H/result.json`. [Rincian verifikasi](docs/VERIFICATION.md)
- Belum ada benchmark PDF resmi, kualitas semantik/generasi, UAT, persetujuan sumber/nomenklatur/simulator/kontak/privasi, audit keamanan/aksesibilitas independen, beban/backup-restore staging atau kelulusan produksi. Exception dev `Performance.measure` hanya didiagnosis bila ada reproduksi yang mengganggu alur inti.

## Pekerjaan berikutnya

**Portal/cloud:** konfirmasi variabel Preview dan redeploy `staging` bila variabel disimpan sesudah build. Buka `/api/health` dari browser yang sudah masuk ke Vercel dan pastikan `{"status":"ok"}`. Lanjutkan login admin dan ganti sandi sementara, lalu uji akun editor dan penyetuju berbeda, penerbitan, pencarian dan kerahasiaan draf. Siapkan Storage privat serta pengujian unggahan dan akses media sebelum rilis lengkap. Pindahkan perbaikan staging ke branch produksi sesuai alur rilis setelah verifikasi, lalu lanjutkan uji beban, restore, dan UAT. [Jalur deploy](docs/JALUR-DEPLOY.md) · [Kesiapan rilis](docs/KESIAPAN-RILIS.md)

**RAG:** PDF resmi dan metadata → editor/penyetuju memeriksa sumber → pertanyaan/halaman acuan + R4a → keputusan model, cap/tarif, data provider dan key privat → evaluasi semantik/generasi privat → peninjauan mutu/Privasi → beta. R4a tidak menjalankan bagian semantik/generasi. Jangan menaruh key pada chat/Git.

Untuk sesi baru di workspace ini, baca berkas awal dan pilih pekerjaan dari dua jalur berdasarkan keputusan yang tersedia. Untuk mesin/clone baru, simpan dulu **seluruh source dan berkas baru dalam commit**; data/media/konfigurasi privat dipindahkan lewat backup terpisah. Bukti `.local`, `.env` dan tooling agen tidak ikut Git. Jangan mengandalkan clone lama atau riwayat chat sebagai pengganti serah-terima.

## Rujukan dan riwayat

- Kebutuhan: [PRD utama](PRD-Jafa-Hub.md), [PRD RAG](docs/PRD-RAG-Jafa-Hub.md), [panduan RAG](docs/ASISTEN-RAG.md), [R4a](docs/EVALUASI-RAG.md).
- Operasi: [DATA-LOKAL.md](docs/DATA-LOKAL.md), [OPERASIONAL.md](docs/OPERASIONAL.md), [KEAMANAN.md](docs/KEAMANAN.md), [UAT.md](docs/UAT.md), [AKSESIBILITAS.md](docs/AKSESIBILITAS.md).
- Pemindahan data: [PEMINDAHAN-DATA.md](docs/PEMINDAHAN-DATA.md); keputusan produksi baru/transfer dan pelaksanaan pada data pengguna masih terbuka.
- [Arsip 16 November](docs/RIWAYAT-CONTEXT-20261116.md) mempertahankan isi sebelum perapian ini; [arsip 10 November](docs/RIWAYAT-CONTEXT-20261110.md) memuat riwayat lebih lama. Status “belum/berikutnya” di arsip berlaku saat ditulis, bukan antrean aktif.

Setelah perubahan bermakna, perbarui status/keputusan/bukti/pekerjaan tersisa tanpa rahasia atau data pribadi. Simpan rincian di dokumen bukti/arsip agar serah-terima tetap ringkas.
