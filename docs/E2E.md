# E2E dengan database terisolasi

Suite Playwright menjalankan server Next.js sendiri di `http://127.0.0.1:5184`. Kode dan cache berada pada salinan unik `.local/e2e-code-*`; cache dev pengguna tidak dipakai. Jalankan suite dan build secara berurutan agar penggunaan sumber daya serta hasil pemeriksaan tetap jelas.

```bash
npm run test:e2e
```

Chromium Playwright harus sudah terpasang dan host harus mengizinkan browser serta socket localhost. Port dapat diganti:

```bash
PLAYWRIGHT_PORT=5185 npm run test:e2e
```

`PLAYWRIGHT_BASE_URL` ditolak dan server yang sudah aktif tidak digunakan kembali. Ini mencegah skenario publikasi berjalan pada server/database pengembangan atau operasional.

## Isolasi dan fixture

**Pemeriksa native C2 terpisah, 11 November 2026:** `node --import tsx tests/operational/native-runtime.check.ts` menjalankan image produksi, PostgreSQL native dan HTTPS loopback dengan fixture baru. **Lulus, exit 0**: login/cookie/sesi, tiga peran, penolakan persetujuan sendiri setelah perubahan peran, publikasi/penarikan, revisi draf berikutnya serta media bersama. Resource uji dibersihkan. Hasil ini tidak menambah atau mengulang 60 kasus suite PGlite di bawah; cara menjalankan, artefak privat dan batas staging/UAT ada di [RUNTIME.md](RUNTIME.md) dan [VERIFICATION.md](VERIFICATION.md).

`scripts/e2e-server.ts` membuat direktori `jafa-e2e-*` di direktori sementara sistem untuk database dan media. Harness menetapkan `JAFA_LOCAL_DATABASE_DIRECTORY`, mematikan pratinjau, serta mengganti konfigurasi database, origin, kunci rate limit, dan rahasia Better Auth untuk proses uji. `.env` asli tidak disalin/diubah dan `.local/development-pg` tidak dibuka oleh harness. Dependensi terpasang dipakai melalui symlink; root Turbopack hanya disesuaikan pada salinan config.

Database dimulai kosong. Tiga akun fiktif beralamat `.invalid` dibuat sebagai editor, penyetuju, dan admin akun; kredensial di `tests/e2e/accounts.ts` hanya berlaku pada database sementara ini. Sebanyak 29 materi prototipe diimpor sebagai draf, kemudian diajukan oleh editor dan disetujui penyetuju melalui fungsi workflow untuk menyediakan fixture rute publik. Admin sintetis dipakai untuk memeriksa halaman pengguna. Persetujuan fixture bukan persetujuan substansi instansi.

Proses persiapan menutup engine sebelum server Next membukanya. PGlite dibuka secara malas agar worker static-path yang hanya mengimpor modul tidak mengambil kunci. Shutdown memberi waktu 40 detik untuk penutupan engine 30 detik. Setelah server berhenti atau gagal mulai, harness menghapus direktori data dan salinan kodenya. Penghentian paksa seperti `SIGKILL` dapat meninggalkan direktori uji; direktori pengembangan `.local` tidak perlu dihapus.

## Cakupan

Terdapat 60 kasus: tiga puluh skenario pada Chromium desktop dan mobile. Selain simulator, pencarian, regulasi, asisten FAQ, rute publik, overflow, navigasi keyboard, perlindungan admin, fokus dialog dan reflow 320/720 CSS px, skenario workflow memeriksa:

- Editor menyimpan draf dan mengajukannya; URL publik masih 404 dan draf tidak muncul di pencarian.
- Pengajuan belum lengkap menampilkan deskripsi kesalahan pada kolom dan kelompok terkait, memfokuskan kesalahan pertama, serta mempertahankan masukan. Sesudah diperbaiki dan disimpan, penanda lama hilang dan pengajuan dapat dilanjutkan.
- Pengajuan profil mengaitkan kesalahan dengan enam kolom khusus, memfokuskan definisi lalu jenjang berisi baris kosong, mempertahankan masukan dan petunjuk, serta mengunci revisi setelah dikoreksi. Dua profil tetap berbeda dipakai untuk desktop/mobile.
- Pengajuan regulasi mengaitkan kesalahan dengan lima kolom khusus, memfokuskan nomor lalu URL nonresmi yang dipertahankan, dan menerima koreksi. Draf unik tetap tidak ada di daftar publik setelah diajukan.
- Dua skenario menahan skrip chunk klien untuk memeriksa kesiapan kontrol pada HTML awal. Klik pencarian baru diproses ketika handler siap; FAQ/menu berikutnya tetap mengelola fokus. Pengisian editor menunggu kontrol aktif lalu menyimpan judul/slug/ringkasan yang sama setelah reload, tanpa jeda tetap.
- Penyetuju menggunakan sesi browser terpisah, mengembalikan dengan catatan, lalu memeriksa hasil perbaikan editor.
- Catatan pengembalian kosong/hanya spasi ditolak dengan fokus, penanda, dan deskripsi pada textarea; alasan penarikan hanya spasi mempertahankan catatan serta pilihan arsip. Koreksi kemudian dapat dilanjutkan.
- Persetujuan menerbitkan artikel pada detail dan pencarian untuk sesi publik tanpa login.
- Draf revisi berikutnya tidak mengganti judul versi publik atau masuk pencarian.
- Penarikan menghilangkan detail dan hasil pencarian.
- Akun sintetis baru dari admin CMS wajib mengganti sandi: kesalahan konfirmasi/sandi lama/sandi sama terkait kolom dengan fokus dan input bertahan; keberhasilan menampilkan pesan, menolak sandi lama dan menerima sandi baru. Akun fixture utama tidak diubah.
- Pembuatan akun menolak nama hanya spasi/email duplikat dengan fokus dan input bertahan; keberhasilan membersihkan input dan menyimpan peran yang dipilih. Perubahan akun menolak penonaktifan/demosi admin terakhir, menyimpan role/akses sah, mencabut sesi, serta mereset sandi tanpa ikut menyimpan pilihan akses yang belum diajukan.
- Hasil buat/simpan/reset/aktivasi ulang akun menerima fokus dalam formulir sendiri. Shift+Tab dari pesan berhasil kembali ke tombol buat/reset; pesan tidak menambah perhentian Tab.
- Hasil simpan draf baru/perbaikan/revisi dari versi terbit, kedua pengajuan, pengembalian, penerbitan dan penarikan menerima fokus sesudah formulir/rute berganti. Pesan lama dibersihkan saat penolakan/tindakan baru atau navigasi, termasuk Back.
- Unggahan 503 sintetis menghubungkan pesan ke input dan mempertahankan draf; pilihan native dikosongkan agar berkas sama dapat dipilih ulang. Percobaan berikut memakai unggahan nyata, memeriksa pending/fokus setelah gagal dan berhasil, dekode WebP, persistensi/pratinjau/atribusi serta 404 gambar/artikel draf tanpa sesi.
- Setelah reset akun, request simpan akses diperiksa agar tidak mengirim kembali sandi sementara dalam state tindakan; nilai sandi tidak dicetak oleh assert.
- Variasi media memakai penolakan server nyata SVG/PNG rusak/>5 MB, hilangnya cookie sesi dan login tab lain. Gambar lama/masukan tetap, penggantian tersimpan setelah reload, pelepasan membersihkan error dan memulihkan fokus, alt/kredit tetap serta media tetap privat.
- Tautan FAQ dapat diketik dengan spasi dan Enter untuk menambah baris. URL tidak aman ditolak oleh server nyata dengan fokus/nama/deskripsi/penanda pada kolom dan masukan tetap; koreksi dua tautan bertahan setelah simpan/reload dan dapat diajukan, tanpa tampil di FAQ publik sebelum persetujuan.
- Filter CMS mencocokkan judul/status/bidang revisi terbaru; judul/status/bidang histori tidak memunculkan draf yang tidak sesuai.
- Kanal Kontak URL/email/telepon dan jam layanan melewati validasi, pratinjau, simpan/reload, pengajuan dan persetujuan sebelum tampil publik. Revisi berikutnya tetap privat; semua alamat/nomor/jam fixture bersifat sintetis.
- Cookie sesi dihapus saat menyunting; masuk melalui tab baru mempertahankan masukan. Login peran penyetuju tetap menolak simpan, lalu login editor memulihkan simpan/reload. Tautan pemeriksaan akses membuka dashboard peran yang sedang masuk.
- Dua akun editor berbeda membuka draf yang sama. Simpan basi ditolak, pembanding terbuka pada tab baru tanpa mengubah input/versi lokal, retry tetap ditolak dan penggabungan manual pada versi terbaru berhasil. Request anonim tetap 404.
- Workflow penarikan dibuka dengan Enter/Tab pada tinggi 456 CSS px; textarea mendapat fokus dan terlihat utuh sebelum penolakan/koreksi berikutnya.

Uji bypass peran pada request server, persetujuan sendiri setelah perubahan peran, konflik versi, transaksi audit, serta media juga berada pada suite integrasi. E2E ini belum menggantikan UAT, pemeriksaan aksesibilitas lengkap, atau pengujian PostgreSQL native.

## Pemulihan sesi dan konflik CMS — 10 November 2026

`npm run test:e2e -- recovery.spec.ts` **4/4 lulus**, exit 0, sekitar 4 menit termasuk persiapan. Kedua alur di atas mencapai login ulang/retry atau penggabungan manual tanpa menghilangkan masukan; tautan memeriksa popup, target/rel dan opener. Batas skenario 120 detik tetap. Cookie dihapus untuk simulasi browser; expiry database nyata diperiksa di integrasi, bukan menunggu delapan jam.

**22/22 unit, 50/50 integrasi, typecheck dan build produksi terisolasi setelah browser lulus**. Dua capture pesan konflik ditinjau; suite penuh 60 kasus tidak dijalankan. Detail dan batas ada di [VERIFICATION.md](VERIFICATION.md), artefak privat `.local/cms-recovery-20261110-jploiaut/`. Kredensial editor kedua dibuat melalui admin fixture dan ganti sandi wajib; akun fixture utama serta data pengguna tetap.

## Filter CMS dan kanal Kontak — 10 November 2026

Perubahan fungsi baru diperiksa dengan `npm run test:e2e -- cms-functional.spec.ts`: **4/4 kasus terarah lulus**, exit 0, sekitar 1,6 menit pada pengulangan akhir. Suite penuh 56 kasus tidak dijalankan; hasil 52/52 berikut mendahului perubahan ini. Dua screenshot region Kontak pada viewport 320/1440 CSS px ditinjau. Integrasi penuh **49/49**, unit **21/21**, typecheck dan build produksi terisolasi setelah browser lulus.

Percobaan pertama 2/4, lalu percobaan antara dihentikan dengan exit 130 setelah dua masalah tes ditemukan: label select ikut membaca opsi, serta URL dicatat sebelum navigasi detail selesai. Locator kini memakai combobox dan URL ditunggu sebelum dicatat; timeout 120 detik tetap. Detail, bukti dan batas ada di [VERIFICATION.md](VERIFICATION.md), artefak privat `.local/development-audit-20261110-o7cxdznu/`. Tidak ada data pengguna atau materi awal yang diterbitkan; ini bukan UAT/native/perangkat nyata.

## Penyuntingan tautan FAQ — 10 November 2026

Regresi `faq-editor.spec.ts` awal **0/2 lulus**, exit 1: penulisan ulang nilai mengubah ketikan dan menghilangkan baris baru; error URL belum terkait kolom. Sesudah teks masukan dipertahankan dan penanda server/kolom diperbaiki, kedua kasus lulus dalam **suite penuh 52/52**, exit 0, sekitar 9 menit. `.last-run.json` `passed` tanpa kasus gagal; timeout 120 detik tetap.

Dua screenshot akhir pada 320/1440 CSS px dengan jarak teks diperbesar ditinjau. **18/18 unit, 46/46 integrasi, typecheck dan build produksi terisolasi setelah browser lulus**, exit 0. Metode dan batas mengikuti [VERIFICATION.md](VERIFICATION.md). Artefak privat `.local/faq-links-20261110-5o35grau/` dapat memuat sesi/kredensial sintetis pada trace baseline; data pengguna dan `.env` tetap. Bukan pembaca layar, zoom tab 200% baru, PostgreSQL native atau UAT.

## Keputusan CMS dan variasi gambar — 9 November 2026

Regresi baru `media.spec.ts` sebelum perbaikan **0/2 lulus**: enam assert gagal setelah pelepasan pada fokus/error/penanda. Penolakan 400/413 dan hilangnya sesi 401 sudah menjaga gambar dan masukan. Sesudah handler bersama diperbaiki, pengulangan **2/2 lulus**, exit 0, sekitar 3,6 menit. Sesi hilang disimulasikan dengan mengosongkan cookie, bukan menunggu expiry delapan jam.

Probe keputusan membuktikan textarea penarikan tetap terpotong setelah menunggu, dan margin CSS saja tidak cukup. Komponen kini menggulir kolom ke tengah pada fokus. Sampler zoom akhir **52 state/24 screenshot lulus**, dengan jarak teks normal/diperbesar pada 720/320 CSS px; server exit 0. Pengembalian/publikasi/penarikan fixture serta akses anonim artikel/media diuji lewat layanan nyata dengan editor/penyetuju berbeda.

**Suite penuh 50/50 lulus**, exit 0, sekitar 11,1 menit; `.last-run.json` `passed` tanpa kasus gagal. Build produksi terisolasi sesudah seluruh browser **lulus**, exit 0. Enam screenshot media, dua capture keyboard penarikan dan 24 capture zoom akhir dibaca. Cakupan/metode/batas mengikuti [VERIFICATION.md](VERIFICATION.md); artefak privat `.local/cms-variants-20261109-xj_1_zlc/` dapat memuat sesi/kredensial sintetis pada trace/log. Bukan UAT, PostgreSQL native, pembaca layar atau perangkat nyata.

## Zoom, unggahan dan state akun — 9 November 2026

Paket zoom aktual **76 state/32 screenshot lulus**, exit 0, pada 720/320 CSS px lewat Tabs API faktor 2; server exit 0. Perbaikan mencakup margin gulir pesan CMS dan pemulihan unggahan. Regresi unggahan awal 0/2, perbaikan awal 2/2, perluasan fokus berhasil 0/1 sebelum pemulihan kedua hasil; kode akhir telah dilalui pada kedua lebar zoom. Regresi transport akun awal 0/1 membuktikan sandi reset lama ikut menjadi argumen tindakan berikutnya; pemanggil kini memakai state kosong yang diabaikan server.

Suite `full-e2e/` terinterupsi setelah 16 kasus lulus, tanpa hasil final. Server sintetis yang tertinggal dikonfirmasi kepemilikannya dan ditutup melalui SIGTERM; workspace/data sementara dibersihkan harness. Pengulangan `final-e2e/` menghasilkan **47/48 lulus**, exit 1, sekitar 10,8 menit; kasus unggahan dan transport sandi lulus pada kedua proyek. Satu strict locator CMS menangkap pesan lama/baru saat transisi; snapshot sesudahnya hanya menunjukkan hasil berhasil yang aktif. Tes kini menunggu fokus hasil baru dan satu status tersisa sebelum memeriksa penghapusan penanda lama, tanpa perubahan timeout/produk. **Pengulangan penuh `complete-e2e/` 48/48 lulus**, exit 0, sekitar 10,4 menit; `.last-run.json` `passed` tanpa kasus gagal. Build terisolasi sesudahnya juga **lulus**, exit 0. Hasil serta batas mengikuti [VERIFICATION.md](VERIFICATION.md); artefak privat `.local/states-zoom-20261109-uyelbzyp/` dapat memuat kredensial sintetis pada trace/log.

## Batas browser sebelum lingkungan diizinkan — 9 November 2026

Prapemeriksaan sesi terbaru kembali menolak bind loopback `EPERM` dan Chromium berhenti dengan SIGTRAP. **Tidak ada E2E, zoom atau screenshot baru**; 46/46 di bawah tetap hasil historis sebelum CSS terbaru. Empat deklarasi CSS memperbaiki batas topik FAQ, fokus ikon bersama/reset/tutup serta offset outline area percakapan. Pemeriksaan 44 pasangan deklarasi warna, lint dan typecheck lulus, tetapi belum membuktikan tampilan browser. Build terisolasi mengompilasi lalu gagal pada subprocess TypeScript `--showConfig` (`EPERM`). Bukti serta batas mengikuti [VERIFICATION.md](VERIFICATION.md).

Pada host yang mengizinkan browser/subprocess, lanjutkan zoom tab aktual 200% untuk akun/ganti sandi/FAQ beserta pending/error/berhasil/jawaban/reset; periksa fokus ikon, batas topik dan outline region dengan CSS terbaru. Jalankan build penuh secara berurutan setelah pemeriksaan. Data pengguna tetap terpisah dari harness.

## Pemeriksaan zoom/kontras formulir — 6 November 2026

Pemeriksaan lanjutan memakai harness server/data yang sama melalui skrip sekali pakai `.local/forms-zoom-20261106-b9i20a6i/check.mjs`, bukan menambah kasus suite di atas. Chromium persisten dengan ekstensi sementara mengaktifkan zoom tab asli 200% pada layout 720/320 CSS px. Empat alur profil/regulasi menyelesaikan koreksi, simpan dan pengajuan serta 28 pengukuran state; 20 screenshot akhir ditinjau. Respons simpan nyata ditahan sementara untuk membaca state pending, lalu dilepas dan hasil server diverifikasi.

Dua warna border diperbaiki setelah pengukuran nyata di bawah 3:1. Pengulangan serta server **exit 0**, lint CSS dan build terisolasi sesudahnya lulus. Suite penuh 46 kasus, unit dan integrasi sebelumnya tidak diulang untuk perubahan warna ini. Batas glyph native, kontrol nonaktif, tombol teks, hover dan gambar mengikuti [AKSESIBILITAS.md](AKSESIBILITAS.md) serta [VERIFICATION.md](VERIFICATION.md); hasil ini bukan kelulusan WCAG atau UAT.

Pada 26 Oktober, `tests/e2e/accessibility.spec.ts` menambah dua skenario per proyek; pengulangan khusus saat itu lulus 4/4. Fokus diuji melalui latar modal yang inert, traversal Tab/Shift+Tab, Escape dan tombol pembuka. Batas reflow terhadap zoom browser nyata serta hasil inspector ada di [AKSESIBILITAS.md](AKSESIBILITAS.md).

Lanjutan 3 November menambah skip link publik/CMS, Escape bertahap pada menu publik, Escape menu CMS dengan fokus kembali, dan gulir keyboard tabel dashboard. Jarak teks diperiksa pada 15 rute publik/login serta 14 kunjungan CMS pada ketiga peran, masing-masing di 320 dan 1440 CSS px. Screenshot beranda/simulator/pengguna dilampirkan oleh tes untuk tinjauan visual; pengukuran otomatis bukan pemeriksaan seluruh pemotongan oleh leluhur, overlap, atau state interaktif.

Pembuka FAQ berada di header. Regresi tambahan memeriksa satu tombol, overflow dan perpotongan dengan tautan/kontrol di beranda serta simulator, fokus target/footer, lalu buka dan Escape dengan fokus kembali pada lebar 320/390/768/1024/1100/1440 CSS px. Jarak teks ditingkatkan selama pemeriksaan. Dialog native memang menutupi latar yang inert saat dibuka; pengukuran overlap dilakukan saat dialog tertutup.

## Validasi CMS dan interaksi sebelum hidrasi — 6 November 2026

Discovery menemukan empat kasus baru. Percobaan dalam sandbox gagal memulai server tanpa menjalankan tes. Pengulangan di luar sandbox **4/4 lulus**, exit 0, sekitar 4,4 menit termasuk persiapan; timeout skenario 120 detik tetap. Delapan screenshot dibaca pada 320/1440 CSS px dengan jarak teks diperbesar. Nama/deskripsi/penanda, fokus, input yang bertahan, viewport jenjang/URL, overflow dokumen dan koreksi/pengajuan diperiksa. Self-check fixture E2E juga lulus.

Suite penuh pertama **35/42 lulus**, exit 1, sekitar 14,9 menit. Trace menunjukkan pembuka tidak membuka dialog serta payload editor kosong meskipun kolom telah diisi. Regresi dengan skrip klien sengaja ditahan menghasilkan **0/4 lulus** sebelum perbaikan, lalu **4/4 lulus**, exit 0, sekitar 3,7 menit sesudah kontrol header/FAQ/editor dinonaktifkan sampai komponen terpasang. **Suite penuh terbaru 46/46 lulus**, sekitar 17,1 menit; `.last-run.json` `passed` tanpa kasus gagal. Build terisolasi sesudahnya juga **lulus**, exit 0, di luar sandbox. Timeout tetap sama. Delapan screenshot profil/regulasi pada suite akhir dibaca dan menunjukkan pesan serta outline fokus pada kedua viewport.

Hasil 38/38 pada bagian 4 November berikut tetap historis. Artefak privat di `.local/cms-fields-20261106-4b9zs6y4/`, termasuk `targeted-browser/`, `full-e2e/`, `before-hydration/`, `after-hydration/`, `final-e2e/`, log dan diagnosis; hasil serta batas ada pada [VERIFICATION.md](VERIFICATION.md). Ini bukan pembaca layar nyata, zoom tab 200% baru, seluruh state/jenis CMS, PostgreSQL native atau UAT.

## Fokus hasil konten CMS — 4 November 2026

Workflow memakai Enter pada tindakan utama dan viewport 320/1440 CSS px. Delapan hasil per proyek diperiksa; assert fokus lunak tetap menggagalkan tes sambil meneruskan transisi berikutnya. Regresi awal **0/2 lulus** dengan 16 kegagalan fokus. Pengulangan pertama **2/4 lulus**: kedua validasi dan seluruh assert fokus tercapai, tetapi pemeriksaan kembali tertahan locator judul H1/H3. Sesudah locator dibatasi ke H1, **4/4 terarah lulus**, exit 0, sekitar 2,4 menit; **suite penuh 38/38 lulus**, exit 0, sekitar 6,1 menit. Timeout tidak dinaikkan.

Tab dari status menuju tautan kembali, Shift+Tab melewati status, dan navigasi daftar/Back tidak memunculkan pesan lama. Tinjauan delapan screenshot awal menemukan beberapa capture draf baru/penarikan tanpa pesan terlihat walaupun DOM fokus. Tes kemudian menambah assert viewport rasio 1 pada seluruh delapan status per proyek: **2/2 workflow tambahan lulus**, exit 0, sekitar 3,9 menit termasuk persiapan, tanpa perubahan produk/timeout atau jeda tetap. Delapan screenshot akhir dari `viewport/` dibaca: pesan dan outline fokus terlihat. Suite penuh mendahului penambahan assert viewport; kode produk tetap sama. **Build terisolasi sesudahnya lulus**. Hasil serta batas terbaru mengikuti [VERIFICATION.md](VERIFICATION.md). Artefak privat `.local/content-focus-20261104-t9snqe40/` dapat memuat kredensial/sesi sintetis pada trace/context. Ini bukan zoom tab 200% baru, seluruh jenis/state CMS, pembaca layar nyata atau UAT.

## Fokus hasil akun — 4 November 2026

Kedua skenario akun diperluas tanpa menambah jumlah kasus atau timeout. Regresi awal **0/4 lulus** karena status berhasil belum menerima fokus; sesudah perbaikan **4/4 lulus**, exit 0, sekitar 1,3 menit. Empat screenshot keberhasilan dibaca pada 320/1440 CSS px, sandi sementara pembuatan dimasking. **Suite penuh 38/38 lulus**, exit 0, sekitar 9 menit; build terisolasi sesudahnya juga lulus. `.last-run.json` pada `full-e2e/` berstatus `passed` tanpa kasus gagal. Bukti final mengikuti [VERIFICATION.md](VERIFICATION.md). Artefak privat berada di `.local/account-focus-20261104-hb9y1rfw/`; trace/context tetap dapat memuat sandi/sesi sintetis. Pemeriksaan ini bukan pengumuman pembaca layar nyata atau UAT.

## Formulir akun — 4 November 2026

Dua skenario baru pada `workflow.spec.ts` memakai 320/1440 CSS px dan jarak teks diperbesar untuk state kesalahan. Akun target dibuat unik melalui admin CMS; kredensial/peran tiga fixture utama dipertahankan. Skenario memeriksa nilai dan deskripsi kolom, fokus, reset pada kegagalan/keberhasilan, proteksi admin terakhir, persistensi reload, sesi yang dicabut, reset sandi, aktivasi ulang serta penolakan sandi lama. Delapan screenshot panel/formulir pada `targeted-passed/` dibaca; trace/context dapat memuat sandi/sesi sintetis sehingga tetap privat.

Percobaan terarah pertama **2/4 lulus**: pembuatan akun lulus, select perubahan akun kembali ke default lama setelah penyimpanan berhasil. Kelompok kontrol kini dipasang ulang saat data tersimpan berubah; **pengulangan terarah 4/4 lulus**, exit 0, sekitar 3,3 menit. **Suite penuh 38/38 lulus**, exit 0, sekitar 8,5 menit; build terisolasi sesudahnya juga lulus. `.last-run.json` pada `full-e2e/` berstatus `passed` tanpa kasus gagal. Timeout skenario tetap 120 detik, tanpa penyesuaian batas baru pada lanjutan akun ini. Bukti serta batas mengikuti [VERIFICATION.md](VERIFICATION.md). Tidak ada klaim pembaca layar nyata atau UAT selesai.

## Validasi ganti sandi — 4 November 2026

Skenario baru di `workflow.spec.ts` memakai 320/1440 CSS px dengan jarak teks diperbesar. Admin membuat akun unik pada database uji; akun itu masuk dengan sandi sementara, memperbaiki tiga penolakan memakai Enter/keyboard, lalu berhasil masuk dengan sandi baru. Input login juga bertahan ketika sandi lama ditolak. Dua screenshot per proyek memotret kesalahan konfirmasi dan sandi sama; trace/context gagal dapat memuat sandi/sesi sintetis sehingga tetap privat.

Percobaan pertama **0/2 lulus** karena locator nama kolom yang terlalu ketat; percobaan sesudah koreksi **0/2** karena redirect sukses kehilangan `changed=1`, setelah seluruh validasi tercapai. Redirect dipindah ke server di luar catch; **pengulangan terarah 2/2 lulus**, exit 0, sekitar 3,2 menit. Suite penuh pertama **33/34**: navigasi artikel CMS desktop melewati assert lima detik setelah header 200 baru diterima dalam 4,5 detik. Hanya assert itu menjadi 15 detik, timeout skenario tetap 120 detik. **Pengulangan penuh 34/34 lulus**, exit 0, sekitar 5,8 menit; build terisolasi sesudahnya lulus. `.last-run.json` pada `full-passed/` berstatus `passed` tanpa kasus gagal. Bukti serta batas ada di [VERIFICATION.md](VERIFICATION.md). Pengujian ini belum mencakup pembaca layar nyata, zoom tab 200% baru, atau UAT.

## Percakapan FAQ — 4 November 2026

Regresi tambahan di `accessibility.spec.ts` memeriksa fokus Tab pada area gulir bernama, Home/PageDown yang mengubah posisi gulir, akses keyboard ke sumber, serta nama log. Pada lebar 320/1440 CSS px dengan jarak teks diperbesar, respons 503 yang disimulasikan sekali harus mempertahankan pertanyaan/jawaban, menghubungkan pesan gangguan dan petunjuk privasi ke input, kemudian dapat direset dan ditutup dengan fokus kembali. Jawaban awal tetap berasal dari API/database fixture terbit, bukan jawaban tiruan.

Sebelum perbaikan **0/2 lulus** karena region fokus tidak ditemukan; sesudahnya **2/2 lulus**, exit 0, sekitar 2,8 menit termasuk persiapan. **Suite penuh berikutnya 32/32 lulus**, exit 0, sekitar 7,5 menit, termasuk workflow editor/penyetuju desktop dan mobile. `.last-run.json` berstatus `passed` tanpa kasus gagal. Hasil build terbaru dan lokasi artefak ada di [VERIFICATION.md](VERIFICATION.md). Tes ini tidak memakai pembaca layar nyata atau menambah hasil zoom tab 200%.

## Validasi catatan — 3 November 2026

Workflow `editor dan penyetuju` memeriksa validasi catatan di atas, URL publik saat tindakan ditolak, dan menyimpan screenshot `validasi-keputusan.png`/`validasi-penarikan.png`. Percobaan di luar sandbox pertama **0/2 lulus**: navigasi setelah login desktop melewati assert lima detik; checkbox arsip mobile direset setelah penolakan. Formulir penarikan kini membatalkan reset native, dan dua helper login menunggu URL admin hingga 15 detik. Timeout workflow tetap 120 detik.

Pengulangan terarah **2/2 lulus**, exit 0; suite penuh sesudahnya **30/30 lulus**, exit 0, sekitar 5,4 menit. Empat screenshot dari pengulangan terarah dibaca dan checkbox arsip terlihat tercentang. `.last-run.json` suite penuh `passed` tanpa kasus gagal. Build terisolasi serta typecheck lulus. Unit 18/18 dan integrasi 38/38 adalah hasil sebelum perbaikan UI ini dan tidak diulang. Log, trace awal, salinan hasil, dan batas verifikasi ada di [VERIFICATION.md](VERIFICATION.md). Hambatan browser/subprocess historis pada bagian berikut sudah terlewati lewat eksekusi di luar sandbox; ini bukan persetujuan UAT atau aksesibilitas menyeluruh.

Pemeriksaan tambahan di luar suite memakai zoom tab Chromium 200% pada 29 kunjungan publik/login/CMS, pemeriksaan batas dua dialog dan kontras teks CSS terbatas. Keenam screenshot akhir dibaca setelah koreksi capture viewport fisik. Hasil ini tidak menambah jumlah 30 kasus suite; metode dan batasnya ada di [AKSESIBILITAS.md](AKSESIBILITAS.md).

## Pemeriksaan harness tanpa browser

```bash
node --import tsx scripts/e2e-server.ts --check
npm run test:e2e -- --list
```

Self-check memeriksa database awal kosong, migrasi, impor tetap draf sebelum persetujuan, tiga peran berbeda, proyeksi publikasi, dan persistensi setelah engine ditutup/dibuka. Perintah ini tidak menjalankan interaksi browser.

## Riwayat — 23 Oktober 2026

| Pemeriksaan | Hasil |
| --- | --- |
| Self-check harness | Lulus; 29 fixture melewati pengajuan/persetujuan pada database sementara |
| Discovery `npm run test:e2e -- --list` | Lulus; 14 kasus dalam dua berkas untuk desktop/mobile |
| Percobaan `npm run test:e2e -- --project=desktop --grep 'editor dan penyetuju'` | Gagal sebelum tes dimulai: `Process from config.webServer was not able to start. Exit code: 1` |
| Harness server dijalankan langsung | Gagal pada `listen EPERM: operation not permitted 127.0.0.1:5184`; direktori database uji dibersihkan |
| Prasyarat Chromium | Gagal mulai; `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`, SIGTRAP |

Pada percobaan historis tersebut belum ada kasus interaktif yang lulus. Hasil tahap 2 pada 26 Oktober dicatat berikut dan di [VERIFICATION.md](VERIFICATION.md); hasil lama bukan bukti kegagalan kode terbaru.

## Pemeriksaan tahap 2 — 26 Oktober 2026

Dua percobaan sebelum jeda terakhir menghasilkan 12/14 lulus dengan dua workflow timeout. Trace terakhir menunjukkan editor sudah menerima catatan pengembalian, lalu selector `getByLabel(..., { exact: true })` gagal menemukan textarea setelah reload: teks isi server berada di dalam label yang membungkus textarea. Locator diganti ke `getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true })`, mengikuti nama aksesibel kontrol. Alur produk dan timeout workflow 120 detik tidak diubah.

Pengulangan terarah `npm run test:e2e -- --grep 'editor dan penyetuju'` di luar sandbox lulus **2/2**: desktop sekitar 60 detik dan mobile sekitar 39 detik. Suite penuh berikutnya lulus **14/14**, exit 0, sekitar lima menit. Self-check fixture juga lulus pada kode tahap 2. Helper salinan kemudian dilengkapi direktori `tests` untuk kebutuhan typecheck build; hasil build dan lifecycle akhir dicatat di [VERIFICATION.md](VERIFICATION.md). Trace kegagalan dapat memuat cookie/kredensial sintetis; jangan dibagikan tanpa pemeriksaan.

Setelah penambahan regresi aksesibilitas, percobaan awal 16/18 lulus; dua tes baru dikoreksi karena asumsi urutan Tab pada dialog native. Pengulangan khusus lulus 4/4. **Pengulangan penuh pada 26 Oktober `npm run test:e2e` lulus 18/18**, exit 0, sekitar enam menit. Seluruh server/browser uji sudah berhenti dan salinan kode/data sementara dibersihkan. Ini bukan hasil UAT, pembaca layar nyata, zoom browser, atau PostgreSQL native.

## Kelanjutan CMS — 3 November 2026

Skenario pengajuan belum lengkap ditambahkan ke `workflow.spec.ts`; discovery menemukan 20 kasus dalam tiga berkas. Simpan/pengajuan memakai state bersama agar kesalahan server mencapai kolom editor. Kasus baru memeriksa deskripsi aksesibel, fokus input/kelompok, masukan yang dipertahankan, koreksi, dan pengajuan berikutnya. Hasil 18/18 di atas berasal dari kode sebelumnya; hasil suite terbaru dan batas lingkungannya dicatat pada bagian 3 November di [VERIFICATION.md](VERIFICATION.md).

**Suite penuh `npm run test:e2e` lulus 20/20**, exit 0, sekitar enam menit melalui eksekusi di luar sandbox. Dua kasus baru lulus dalam pengulangan yang sama dengan seluruh kasus lama; timeout workflow tetap 120 detik. `.last-run.json` berstatus `passed` tanpa kasus gagal dan salinan kode/data uji dibersihkan setelah server berhenti. Build terisolasi sesudahnya juga lulus. Tidak ada pengujian terhadap akun atau database pengguna.

Lanjutan keyboard/jarak teks menambah delapan kasus serta admin sintetis. Regresi awal mobile menghasilkan 2/4 lulus sebelum perbaikan fokus; suite pertama sesudahnya 27/28. Trace kegagalan assert publikasi membuktikan respons sukses 200 selama 4,5 detik, sehingga hanya batas assert hasil dinaikkan dari lima menjadi 15 detik untuk pembaruan klien; timeout workflow tetap 120 detik. **Pengulangan penuh setelah koreksi itu lulus 28/28**, exit 0, sekitar 7,1 menit, lalu build terisolasi lulus. Enam screenshot dibaca dan dipertahankan dalam artefak yang dicatat di VERIFICATION.md; overlap launcher FAQ pada waktu itu masih terbuka meskipun pengukuran ukuran lulus.

Pemindahan pembuka FAQ ke header selanjutnya menambah dua kasus. Pengukuran terarah membuktikan overlap nol, lalu **suite penuh 30/30 lulus**, exit 0, sekitar 7,2 menit di luar sandbox. Build terisolasi sesudahnya juga lulus. Regresi baru memeriksa enam lebar CSS, fokus/footer, dan buka/Escape/fokus kembali; kasus FAQ lama tetap memeriksa jawaban, fallback, riwayat, dan reset. Enam screenshot header dibaca dan dipertahankan di `.local/faq-header-20261103-oqua_4iz/e2e-header/`. Hasil ini menggantikan status overlap terbuka pada catatan historis sebelumnya; bukan kelulusan seluruh WCAG atau UAT.
