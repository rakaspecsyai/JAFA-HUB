# Verifikasi implementasi

## C2: runtime native melalui HTTPS lokal — 11 November 2026

`tests/operational/native-runtime.check.ts` ditambahkan untuk paket teknis berikutnya pada status pengembangan. Kode produk, dependensi, migrasi, aturan peran/persetujuan dan data pengguna tidak berubah. Pemeriksa membuat project Compose acak, database/media kosong, tiga akun sintetis `.invalid` serta proxy HTTPS loopback; sertifikat sementara hanya dipercaya oleh context browser uji. Docker Desktop yang awalnya mati dinyalakan, lalu CLI Windows mengakses engine Linux lokal. Tidak memakai PGlite atau target staging/server yang sudah berjalan.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Tipe/build | Typecheck mandiri lulus. Kedua image dibangun; build produksi akhir mengompilasi dalam 10,0 detik, TypeScript 19,4 detik, lalu menyelesaikan pembentukan rute/optimasi. Pemeriksaan tipe tetap aktif |
| Autentikasi/sesi | Login ketiga peran melalui formulir/Server Action HTTPS; cookie `__Secure-jafa_session`, Secure/HttpOnly/SameSite=Lax/path `/`, hash token di PostgreSQL, IP/UA kosong serta expiry dalam rentang waktu login + delapan jam lulus. Registrasi 403, kredensial salah 401 dan origin login asing 403 |
| Peran dan konflik kepentingan | Halaman terlarang 403. Request Server Action simpan/terbit/tarik diputar ulang memakai peran yang salah dan ditolak; simpan anonim ditolak. Admin mengubah editor menjadi penyetuju melalui CMS: sesi lama tidak berlaku, login baru tetap tidak dapat menyetujui revisinya sendiri. Peran dipulihkan melalui CMS sebelum publikasi sah |
| Gambar | Unggahan PNG melalui editor benar-benar menjadi WebP 24×16 tanpa EXIF/ICC. Media draf 404 bagi anonim/admin dan 200 bagi editor/penyetuju. Unggahan penyetuju/admin 403 |
| Publikasi/penarikan | Artikel pertama disimpan/diajukan/diterbitkan melalui CMS. Detail/daftar/pencarian/sitemap berubah sesuai versi terbit; draf berikutnya tidak menggantinya. Artikel kedua memakai layanan draf/pengajuan untuk fixture media bersama, lalu diterbitkan/ditarik lewat browser. Penarikan pertama tetap membolehkan gambar publik, penarikan terakhir membuatnya 404; editor/penyetuju tetap dapat membaca |
| Audit dan sesi akhir | Dua event publikasi dan dua penarikan tersimpan; penunjuk publik/proyeksi akhir kosong. Logout melalui CMS menolak replay cookie lama. Expiry sesi editor di DB fixture membuat dashboard redirect login dan media privat 404 |
| Hasil/cleanup | **Pemeriksa akhir exit 0**, lima fase lulus. `.local/native-runtime-Eqi7dR/result.json`: `passed=true`, `isolatedResourcesRemoved=true`; container/network/volume project `jafa-native-check-7319979a3d60` tidak tersisa. Image/cache dipertahankan, rahasia/kunci TLS temporer dihapus |

Dua percobaan awal berhenti pada pemeriksa, lalu diperbaiki tanpa melonggarkan aturan produk: (1) batas expiry dibandingkan dengan `createdAt`, padahal Better Auth mengisinya sebelum hook aplikasi menghitung expiry kembali; pemeriksa sekarang mengukur rentang waktu login nyata, (2) locator Slug terlalu ketat terhadap nama aksesibel yang menyertakan petunjuk; nama tanggal disesuaikan menjadi “Tanggal tinjauan materi”. Resource kedua percobaan dibersihkan. Artefak privat kegagalan ada di `.local/native-runtime-9oHz80/` dan `.local/native-runtime-d8wPcG/`; trace dapat memuat kredensial/sesi sintetis. Bukti akhir, log perintah/build dan typecheck berada di `.local/native-runtime-Eqi7dR/`.

Ini satu pemeriksa operasional C2, **bukan hasil ulang suite 60 E2E atau suite unit/integrasi PGlite**. HTTPS memakai sertifikat fixture yang dipercaya hanya context uji; domain/proxy/sertifikat/forwarding IP/cache staging resmi belum dibuktikan. Tidak menunggu delapan jam secara nyata, mengulang seluruh variasi reset/nonaktif akun native, menguji CSRF Server Actions lintas origin, beban, backup/restore, aksesibilitas, audit independen atau UAT. `.env`, database/media pengguna serta cadangan lama tidak dibuka. Perintah dan batas pengulangan ada di [RUNTIME.md](RUNTIME.md).

## C1: persiapan runtime — bukti 10 November, ditutup 11 November 2026

Pekerjaan yang terinterupsi dilanjutkan dengan meninjau sumber, hasil uji dan cleanup yang sudah tersimpan. Tidak ada rerun build, unit, container atau database yang telah lulus. Paket menyediakan Dockerfile/Compose, template konfigurasi kosong, role PostgreSQL aplikasi non-superuser, volume terpisah, profil maintenance dan pemeriksa startup; prosedur ada di [RUNTIME.md](RUNTIME.md). `npm start` kini memakai pemeriksa, sedangkan `npm run dev` tidak berubah. Migrasi, impor, bootstrap dan pemulihan tetap perintah manual.

| Pemeriksaan 10 November | Hasil aktual dan batas |
| --- | --- |
| Tipe/sintaks | Typecheck mandiri, `node --check scripts/production.mjs` dan `sh -n deploy/postgres-init.sh` lulus |
| Unit | **25/25 lulus**, exit 0: termasuk konfigurasi produksi, penolakan fallback, kerahasiaan pesan, file lokal, media internal/symlink/file/absen dan perintah akun noninteraktif |
| Compose | CLI Windows memvalidasi konfigurasi terurai: database tanpa port host, app loopback, `service_healthy`, named volume, password admin tidak ada di app, `manage` profil maintenance/logging none. Hanya nilai sintetis dipakai; JSON terurai tetap privat |
| Smoke mode produksi host | **Lulus**, exit 0: salinan kode/cache dibangun, kompilasi 11,8 detik/TypeScript 21,1 detik, login GET 200, robots memakai origin runtime yang berbeda dari build, health **503** dengan body aman saat peer database sengaja menutup koneksi, SIGTERM diteruskan dan server terbukti berhenti |
| Image final | **Kedua image dibangun**, exit 0. App final: kompilasi 10,9 detik/TypeScript 17,5 detik. Image aplikasi Node **22.23.4**, UID **1000**, tanpa `.env`, `.local` atau direktori tes. Hash `production.mjs` di image cocok dengan sumber; kecocokan ditinjau kembali 11 November |
| PostgreSQL native | PostgreSQL 17 pada engine Linux lokal, diakses melalui CLI Windows/named pipe. Role `jafa`: `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false`; bukan pemakaian PGlite |
| Migrasi/impor | Masing-masing dijalankan dua kali dan lulus: tetap **29 konten draf, 0 pengguna, 0 konten terbit, 0 proyeksi pencarian**. Bootstrap non-TTY ditolak; tidak ada akun otomatis |
| HTTP container | Health **200** `{status:ok}`, halaman login GET **200**, robots memakai origin runtime. GET form login bukan autentikasi akun |
| Shutdown/restart | Stop app memberi exit **0**. Database/app direstart; jumlah data tetap dan marker pada volume media dibaca kembali dengan isi yang sama. Ini bukan upload/otorisasi gambar atau backup/restore |
| Isolasi/cleanup | Project `jafa-runtime-check-8f8f9a1e` tidak memiliki container/volume sebelum uji. Setelahnya container, network dan volume milik project itu dihapus; image/cache lokal dipertahankan. `native-check.json` mencatat `pass=true` dan `isolated_resources_removed=true` |

`robots.ts` diberi `force-dynamic` agar alamat sitemap tidak membeku pada origin build; smoke HTTP membuktikan perbedaan origin. Wrapper juga memperlakukan exit 143 Next sebagai penghentian normal hanya ketika SIGTERM memang diminta, tanpa menutupi exit gagal lain. Percobaan awal menemukan tipe environment pada tes, cleanup direktori fixture dan penanganan exit SIGTERM; semuanya diperbaiki tanpa mematikan pemeriksaan atau mengubah perilaku bisnis.

Semua bukti uji di atas berasal dari **10 November 2026**; pada **11 November** hanya status/dokumentasi dan kesesuaian sumber dituntaskan setelah interupsi. Artefak privat `.local/runtime-prep-20261110-ngmzo_3v/` memuat `before/`, log unit/typecheck/build/smoke, `compose-check.json`, `image-check-final.json`, `native-check.json`, serta driver fixture sekali pakai. File env/JSON Compose terurai memuat rahasia sintetis; jangan dibagikan. Jangan jalankan driver fixture sebagai mekanisme pengelolaan instalasi nyata.

Suite integrasi aplikasi 50 kasus, browser 60 kasus, aksesibilitas dan beban tidak diulang untuk C1. Autentikasi/sesi/cookie, publikasi/penarikan dan akses media native melalui HTTPS menjadi **C2**; bootstrap interaktif, backup/restore terenkripsi, staging resmi, UAT dan kesiapan produksi belum dibuktikan. Data, `.env`, akun/konten/media pengguna dan cadangan pengembangan tidak dibuka, dimigrasikan atau diterbitkan oleh pengujian ini; tidak ada deployment ke hosting.

## Pemulihan CMS FR-18 — 10 November 2026

`publicError/ActionState` kini membawa status error. Pesan bersama menyediakan masuk kembali (401), pemeriksaan akses (403) atau versi tersimpan (409) pada tab baru dengan `noopener noreferrer`. Formulir editor, keputusan dan penarikan meneruskan alamat konten; pesan menerima fokus jika tidak ada error kolom. Konflik tidak lagi menyuruh pengguna memuat ulang formulir. Nomor versi lokal tetap, dan penggabungan perubahan dilakukan pengguna pada versi terbaru. Tidak ada perubahan peran, aturan kontributor/publikasi, skema, dependensi atau penyimpanan browser.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Baseline | Unit **0/1** serta integrasi transport **0/1**, exit 1: status hilang pada respons action |
| Unit | **22/22 lulus**, exit 0; status 400/401/403/409/429 dipertahankan, error internal menjadi 500 generik tanpa detail privat pada hasil/log |
| Integrasi terarah | **1/1 lulus**: sesi/akses/konflik, snapshot revisi/proyeksi/audit tetap, sesi fixture benar-benar kedaluwarsa di database, login ulang dan retry domain sah |
| Integrasi penuh | **50/50 lulus**, exit 0, sekitar 86 detik; tambahan metadata 400 pada validasi sandi/keputusan serta 401/403 pada keputusan/penarikan ikut diperiksa |
| Browser | **4/4 terarah lulus**, exit 0, sekitar 4 menit termasuk persiapan, pada `e2e/`; `.last-run.json` `passed` tanpa kasus gagal. Timeout skenario tetap 120 detik |
| Sesi dan peran | Cookie browser dihapus, simpan ditolak; login penyetuju melalui tautan tetap menghasilkan 403 saat mencoba menyimpan. Login editor melalui tab baru memulihkan simpan/reload dengan judul/isi tetap. Ini bukan menunggu expiry delapan jam; expiry database diperiksa di integrasi |
| Konflik | Dua akun editor berbeda dibuat/digunakan pada database sintetis. Editor kedua ditolak setelah editor pertama menyimpan; pembanding menampilkan versi tersimpan, input lama tetap dan retry basi tetap ditolak. Penggabungan manual pada tab versi terbaru berhasil; draf tetap 404 bagi request anonim |
| Tab/fokus | Ketiga tautan pemulihan diuji melalui popup, `target=_blank`, `rel=noopener noreferrer` serta `window.opener === null`; pesan kegagalan menerima fokus dan link lama hilang setelah pemulihan |
| Typecheck/build | Typecheck mandiri **lulus**; build terisolasi setelah browser **lulus**, exit 0: Prisma generate, kompilasi 8,4 detik, TypeScript 14,3 detik, rute/optimasi; URL DB dummy, pemeriksaan tipe aktif dan workspace sukses dibersihkan |
| Screenshot | Dua capture pesan konflik ditinjau pada viewport 320/1440 CSS px; teks dan tautan terbaca. Capture elemen bukan bukti seluruh outline/halaman, zoom/kontras baru atau pembaca layar |

Fixture integrasi pertama mencoba action berhasil pada stub Next tanpa cache revalidation, sehingga setup itu gagal setelah mutasi fixture. Setup diperbaiki memakai layanan domain; baseline transport kemudian gagal pada status yang hilang. Keberhasilan transport dan revalidation diperiksa lewat browser/server nyata. Harness tidak diubah untuk mengabaikan revalidation. Locator kolom sandi memakai label karena input password tidak memiliki peran textbox implisit.

Suite tersedia kini 60 kasus; **56 kasus browser lama tidak diulang** pada paket ini. Integrasi memakai PGlite terisolasi, bukan PostgreSQL native. Seluruh akun/sandi/masukan tes sintetis, data/media/akun pengguna, `.env` dan cadangan tidak dibuka atau diubah. Trace/log privat `.local/cms-recovery-20261110-jploiaut/` dapat memuat kredensial/sesi fixture; `before/`, baseline, log unit/integrasi/typecheck/build, `e2e/` dan discovery menyimpan bukti. Tidak ada klaim nol page error, staging/UAT, perangkat nyata atau deployment. Paket berikutnya adalah persiapan runtime produksi/native, bukan membuka ulang paket yang lulus.

## Audit prioritas, filter CMS dan kanal Kontak — 10 November 2026

Audit kebutuhan/kode menemukan filter daftar yang mencocokkan histori dan kanal Kontak bertipe URL/email/telepon beserta jam layanan PRD §13.1 yang belum tersedia. Filter kini memakai revisi terbaru. Field kontak memakai payload JSON dengan default kosong untuk data lama; editor, pratinjau dan publik tetap mengikuti revisi disetujui. Tidak ada migrasi tabel, perubahan dependensi/peran atau kontak instansi yang diisi. Analisis dan urutan aktif ada di [STATUS-PENGEMBANGAN.md](STATUS-PENGEMBANGAN.md).

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Baseline fungsi | Filter **0/1**, kanal **0/2**, exit 1; filter `approved` mengembalikan draf terbaru, skema membuang kanal dan pengajuan tidak memvalidasinya |
| Unit | **21/21 lulus**, exit 0; kompatibilitas payload lama, HTTPS/mailto/tel, injeksi/skema tidak aman dan batas kanal/jam |
| Integrasi terarah | **3/3 lulus**: filter judul/status/JF terbaru, paginasi dengan waktu sama/halaman kosong, serta siklus kanal/persetujuan/penarikan |
| Integrasi penuh | **49/49 lulus**, exit 0, sekitar 93 detik; PGlite terisolasi, bukan PostgreSQL native |
| Browser pertama | **2/4 lulus**, exit 1; kedua filter lulus. Kedua Kontak terhenti pada locator label select, setelah validasi/fokus tercapai |
| Browser antara | **2 lulus, 1 gagal, 1 terinterupsi**, exit 130; URL dicatat sebelum navigasi detail selesai sehingga penyetuju membuka daftar. Runner milik paket dihentikan lewat SIGINT setelah identitas diperiksa |
| Browser akhir | **4/4 lulus**, exit 0, sekitar 1,6 menit pada `complete-e2e/`; `.last-run.json` `passed` tanpa kasus gagal. Locator memakai combobox dan URL detail ditunggu sebelum dicatat; timeout 120 detik tetap |
| Cakupan Kontak | Kanal kosong boleh disimpan tetapi pengajuan ditolak; URL tidak aman ditolak dengan fokus/input tetap; tiga jenis/jam tampil di pratinjau, bertahan setelah reload dan baru berubah publik setelah persetujuan petugas berbeda. Draf berikutnya tidak mengganti email publik |
| Cakupan filter | Judul/status/JF lama tidak menemukan revisi kerja baru; kombinasi filter draf/JF/judul terbaru cocok. Uji SQL injection dan paginasi 21 item dengan pemecah seri ID ada pada integrasi |
| Typecheck | Mandiri lulus setelah tipe array filter tes diperjelas; build akhir juga memeriksa TypeScript untuk sumber/tes terbaru |
| Build akhir | **Lulus**, exit 0, terisolasi setelah browser: Prisma generate, kompilasi 8,5 detik, TypeScript 11,5 detik, rute/optimasi; URL DB dummy, pemeriksaan tipe aktif dan workspace sukses dibersihkan |
| Screenshot | Dua capture region Kontak terbit ditinjau pada viewport 320/1440 CSS px; URL/email panjang membungkus tanpa overflow dokumen. Bukan zoom/kontras baru atau perangkat nyata |

Suite browser sekarang memuat 56 kasus; **52 kasus lama tidak diulang pada paket ini**. Hasil 52/52 di bagian berikut adalah historis. Tidak ada klaim nol page error; log development tetap memuat peringatan `pg`/smooth-scroll dan penolakan sesi fixture. Nomor/email/jam pada tes seluruhnya sintetis; materi awal dan akun/kontak pengguna tetap.

Artefak privat `.local/development-audit-20261110-o7cxdznu/` berisi snapshot sumber/dokumen awal, log baseline/unit/integrasi/typecheck/build, `e2e/`, `e2e-final/` dan `complete-e2e/`. Trace dapat memuat kredensial/sesi sintetis. Database/media/kode/cache uji terisolasi, `.env` serta data/cadangan pengguna tidak dibuka atau diubah. Docker mengembalikan pesan integrasi WSL belum tersedia; executable PostgreSQL tidak ditemukan pada pemeriksaan lokal. Tidak ada staging, UAT, deployment atau persetujuan substansi. Paket berikutnya adalah pemulihan CMS FR-18; pengujian aksesibilitas yang sudah lulus tidak otomatis dibuka ulang.

## Penyuntingan tautan FAQ — 10 November 2026

Paket ini mengikuti PRD §13.1/§14/§15.2. Textarea tautan FAQ kini mempertahankan teks yang sedang diketik, sementara payload tetap memakai parser yang sudah ada. Penolakan URL saat simpan/pemeriksaan publikasi menunjuk `relatedLinks`; kesalahan isi jawaban tetap terpisah. Nama, petunjuk, penanda kesalahan dan fokus memakai pola formulir yang sama. Predikat URL, batas skema, peran, transaksi, publikasi, CSS dan dependensi tidak berubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Baseline server | **0/1 lulus**, exit 1; URL ditolak tanpa penanda kolom |
| Baseline browser | **0/2 lulus**, exit 1; kedua proyek membuktikan `Profil ` berubah menjadi `P \| rofil`, baris baru hilang, serta fokus/nama/deskripsi/penanda belum benar |
| Regresi server akhir | **1/1 lulus**, enam bentuk URL tidak aman ditolak; revisi/relasi/proyeksi/audit dan versi publik tetap. Koreksi melalui revisi baru dapat diajukan dan disetujui petugas berbeda |
| Kesalahan independen | Jawaban kosong dan tautan tidak aman menghasilkan `fields.body` serta `fields.relatedLinks`, tanpa saling menimpa |
| Typecheck | **Lulus**, exit 0, `npm run typecheck -- --incremental false` |
| Unit | **18/18 lulus**, exit 0 |
| Integrasi penuh | **46/46 lulus**, exit 0, sekitar 130 detik; PGlite terisolasi, bukan PostgreSQL native |
| E2E penuh | **52/52 lulus**, exit 0, sekitar 9 menit; `.last-run.json` berstatus `passed` tanpa kasus gagal |
| Build setelah browser | **Lulus**, exit 0: Prisma generate, kompilasi 8,9 detik, TypeScript 15,1 detik, rute dan optimasi; salinan kode/cache serta URL DB dummy, pemeriksaan tipe aktif, workspace sukses dibersihkan |
| Regresi browser akhir | Kedua kasus FAQ lulus dalam suite penuh: spasi/baris baru/dua tautan, penolakan nyata, fokus/atribut/input tetap, koreksi, simpan/reload, pengajuan dan FAQ yang masih privat |
| Screenshot | Dua capture akhir pada **320/1440 CSS px** dengan jarak teks diperbesar ditinjau; kolom, outline, petunjuk dan error terbaca. Satu capture baseline mobile juga ditinjau |

Node 22.22.1 dan Chromium 149.0.7827.55 dipakai. Jarak teks diinjeksi setelah penolakan: line-height 1,5, letter-spacing 0,12em, word-spacing 0,16em dan margin paragraf 2em; reduced-motion aktif. Pemeriksaan baru ini bukan zoom tab 200%, pengukuran kontras, pembaca layar/perangkat nyata, atau audit WCAG lengkap. Exception instrumentasi development sebelumnya belum ditelusuri; kelulusan suite bukan klaim nol page error. Log masih mencatat peringatan `pg`/smooth-scroll serta penolakan sesi yang diharapkan pada fixture akses.

Artefak privat `.local/faq-links-20261110-5o35grau/` menyimpan sumber awal, log baseline/perbaikan/typecheck/unit/integrasi/build, `before-e2e/` dan `full-e2e/`. Trace baseline dapat memuat kredensial/sesi sintetis. Kode/cache dan database/media uji terisolasi; data pengguna, `.env` dan cadangan tidak dibuka atau diubah. Tidak ada deployment, staging atau UAT.

Pemeriksaan akhir lima dokumen menemukan **72 tautan lokal valid** dan **17 blok Bash lolos sintaks** tanpa dieksekusi; anchor dan URL eksternal tidak diuji. `git diff --check` lulus; workspace sukses dibersihkan harness, artefak/data lama tetap dipertahankan.

## Keputusan CMS dan variasi unggahan — 9 November 2026

Paket ini melanjutkan PRD §11.2/§15.2/FR-17/18. Perubahan produk hanya dua handler bersama: pelepasan gambar membersihkan error dan memfokuskan input berkas; textarea alasan penarikan menggulir ke tengah saat menerima fokus. API, validasi server, peran, larangan keputusan kontributor, publikasi, skema, dependensi dan CSS tidak diubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Regresi variasi gambar | Baseline **0/2**, enam assert gagal setelah pelepasan: fokus hilang, error lama dan penanda invalid tetap. Sesudah perbaikan **2/2 lulus**, exit 0, sekitar 3,6 menit |
| Penolakan nyata | SVG dan PNG rusak **400**, berkas 5 MB + 1 byte **413**; gambar lama, judul, alt/kredit dan data draf tetap. Tidak memakai mock respons penolakan |
| Sesi dan penggantian | Cookie dikosongkan, unggahan nyata **401**; masukan tetap, media tanpa sesi **404**. Login melalui tab lain memulihkan sesi, penggantian **201** terdekode 32 px, lalu simpan/reload mempertahankan referensi baru. Ini bukan pengujian menunggu expiry delapan jam |
| Pelepasan | Fokus kembali ke input, error/penanda lama dibersihkan, alt/kredit tetap; simpan/reload menghilangkan gambar dari draf. Media lama/baru tetap **404** tanpa sesi; tidak menghapus berkas media secara permanen |
| Baseline fokus keputusan | Empat alur menyelesaikan **52 state** lalu keluar 1 pada tiga clipping textarea penarikan saat Tab setelah panel dibuka; server exit 0 |
| Probe | Clipping tetap sesudah menunggu viewport penuh; margin CSS gagal pada tiga varian. Pemusatan pada fokus berhasil di empat varian. Probe selesai dan server exit 0 sebelum interupsi; tidak ada prosesnya tersisa |
| Zoom asli | Chrome 149.0.7827.55, Tabs API faktor 2 pada setiap state; 1440×913→720×456 dan 640×913→320×456 CSS px, DPR 1→2, `visualViewport.scale=1` |
| Jarak teks | Masing-masing lebar memakai CSS normal dan line-height **1,5**, letter-spacing **0,12em**, word-spacing **0,16em**, margin bawah paragraf **2em**; emulasi reduced-motion aktif |
| Run final | `final-fG573n/` **lulus, exit 0**, server exit 0; **52 state dan 24 screenshot ditinjau**, termasuk pending/error/berhasil serta fokus awal penarikan |
| Kontras | **1.444 sampel teks aktif**, minimum **5,3457:1**; **72 batas kontrol**, minimum **3,4752:1**; **40 fokus**, minimum **5,4666:1**. Nol temuan di bawah ambang dan nol pengukuran tertunda |
| Geometri/piksel | Nol overflow dokumen, clipping teks yang diperiksa atau outline di luar viewport/leluhur yang diperiksa. **24 border dan 40 outline** cocok dengan CSS; border/glyph checkbox native dikecualikan |
| Keputusan nyata | Editor dan penyetuju berbeda. Catatan kosong/2.000 spasi ditolak dan dipertahankan; penarikan tepat 2.000 karakter diterima, arsip tetap tercentang pada penolakan. Artikel dan media anonim mengikuti **404→200→404** sebelum persetujuan, setelah publikasi, setelah penarikan/arsip |
| Suite penuh | **50/50 lulus**, exit 0, sekitar 11,1 menit; `full-e2e/.last-run.json` `passed` tanpa kasus gagal. Dua capture keyboard E2E pada tinggi 456 CSS px ditinjau |
| Typecheck/lint | Typecheck mandiri lulus; lint dua komponen **0 FAIL/0 WARN**; sintaks skrip final lulus |
| Build sesudah browser | **Lulus**, exit 0, terisolasi: Prisma generate, kompilasi **9,9 detik**, TypeScript **14,5 detik**, rute dan optimasi; URL DB dummy, pemeriksaan tipe aktif, workspace sukses dibersihkan |
| Unit/integrasi | Tidak diulang untuk dua handler antarmuka; 18/18 dan 45/45 pada bagian historis bukan hasil baru |

Run antara `after-4f6Tv1/` keluar 0 pada 52 state/20 capture sebelum pemeriksaan kualitas sampler. Browser dapat memberi rectangle pada keturunan `details` tertutup dan feedback berhasil bisa mendahului lepasnya formulir lama. Self-check tertutup/terbuka membuktikan `checkVisibility` membedakan keadaan tersebut. Sampler final memakai visibilitas native serta menunggu kontrol lama hilang dan metadata hasil tersedia; ambang tidak diturunkan, hasil antara tetap disimpan dan bukan ringkasan hitungan akhir. Pending tetap memakai respons server nyata yang ditahan browser, bukan respons sukses buatan atau pengukuran latensi.

Desain tetap tanpa draw/redraw atau pengulangan inspector halaman umum. Seluruh 24 capture zoom akhir, enam screenshot regresi media dan dua capture keyboard E2E ditinjau, bersama empat contoh baseline/probe. Beberapa teks panjang ada di bawah fold dan dapat dijangkau dengan gulir; screenshot viewport bukan bukti seluruh halaman tampak sekaligus. Pemeriksaan browser tidak menggantikan pembaca layar/perangkat nyata atau audit WCAG lengkap, seluruh jenis/state CMS, hover/glyph native, lapisan foto/sibling dan exception instrumentasi development terdahulu.

Artefak privat `.local/cms-variants-20261109-xj_1_zlc/`: scope, sumber/diff/hash, laporan sebelum/probe/antara/final, `focus-diagnosis.json`, `visibility-self-check.json`, `sampling-review.json`, `decision-summary.json`, `visual-review.json`, `media-before/`, `media-after/`, suite penuh dan log pemeriksaan. Hash mencakup 108 berkas baseline dan satu tes baru; hanya dua komponen, satu tes lama dan satu tes baru berubah. Database/media/akun pengguna, `.env`, cadangan dan proses pengguna tidak disentuh. Data/profil/workspace sementara run selesai dibersihkan; log/trace dapat memuat sesi sintetis, tinjau sebelum dibagikan. Tidak ada deployment, PostgreSQL native, staging atau UAT.

## Zoom aktual, unggahan dan state akun — 9 November 2026

Paket ini melanjutkan PRD §10.2/§11.3/§15.2. Lingkungan sudah mengizinkan loopback/Chromium; status sandbox pada bagian berikut adalah riwayat sebelum izin lingkungan berubah. Desain yang ada dipertahankan. Perubahan produk dibatasi ke margin gulir pesan CMS, pemulihan input unggahan dan argumen aksi akun; layanan, peran, publikasi, skema dan dependensi tetap.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Zoom asli | Chrome 149.0.7827.55; Tabs API faktor 2 pada setiap state, 1440×913→720×456 dan 640×913→320×456 CSS px, DPR 1→2, `visualViewport.scale=1` |
| Cakupan akhir | **76 state, 32 screenshot ditinjau**: akun, ganti sandi, FAQ, unggahan dan pratinjau; termasuk pending/error/berhasil/reset/pilihan/fallback |
| Kontras teks aktif | **1.972 sampel**, minimum **5,3457:1**; nol temuan di bawah ambang sesuai ukuran/bobot |
| Batas/ikon kontrol | **720 sampel**, minimum **3,2040:1**; tombol teks tanpa border diperiksa melalui teks, kontrol nonaktif dikecualikan |
| Fokus dan geometri | **58 sampel fokus**, minimum **5,0400:1**; nol outline terpotong viewport/leluhur yang diperiksa, overflow dokumen atau pemotongan teks yang diperiksa |
| Piksel | **42 sampel border dan 58 outline** cocok dengan warna CSS; bukan seluruh glyph native atau seluruh piksel gambar |
| Run akhir | `after-iUhRAS/` **lulus, exit 0**, server exit 0; data/profil/workspace sementara run selesai dibersihkan harness |
| Regresi unggahan | Baseline **0/2**; perbaikan awal **2/2**; perluasan fokus berhasil **0/1** sebelum pemulihan kedua hasil. Kedua kasus akhir desktop/mobile lulus dalam suite akhir **48/48**, juga dilalui pada kedua lebar zoom |
| Regresi state sandi | Sebelum perbaikan **0/1**: payload aktivasi ulang mengandung sandi reset sebelumnya; assert hanya mencetak boolean. Pemanggil kini mengirim `{}`; kedua kasus akun desktop/mobile lulus dalam suite akhir **48/48** |
| Typecheck/lint | Typecheck kode akhir **lulus**, exit 0; lint tiga sumber **0 FAIL/0 WARN**; sintaks skrip zoom lulus |
| Suite penuh terbaru | **48/48 lulus**, exit 0, sekitar 10,4 menit, di `complete-e2e/`; `.last-run.json` `passed` tanpa kasus gagal. Run `final-e2e/` sebelumnya 47/48, dan `full-e2e/` terinterupsi setelah 16 kasus lulus |
| Build terisolasi | **Lulus**, exit 0, sesudah E2E: Prisma generate, kompilasi, TypeScript, rute serta optimasi. URL DB dummy dan salinan kode/cache dipakai, tanpa mematikan pemeriksaan tipe; workspace sukses dibersihkan |
| Unit/integrasi | Tidak diulang untuk perubahan komponen/transport state yang diabaikan server. Hasil 18/18 dan 45/45 tetap historis |

Baseline zoom `verify-Zddh4j/` menyelesaikan 64 state dan keluar 1 dengan 30 catatan mentah. Klasifikasi mempertahankan artefak asli: 24 label `sr-only` sengaja disembunyikan, dua style fokus dibaca sebelum frame render, dan empat pemotongan outline hasil akun terkonfirmasi. Probe setelah font/dua frame memastikan outline region FAQ `-3px` bekerja. Produk menambah `scroll-margin-block: 10px` pada pesan CMS. Pengulangan akhir memakai dua frame render dan mengecualikan label yang memang disembunyikan, tanpa menonaktifkan pemeriksaan fokus. Dua puluh empat pengukuran tertunda berasal dari 12 select nonaktif; ini dicatat sebagai pengecualian, bukan kelulusan aktif.

Input berkas sekarang mempunyai nama, petunjuk dan error yang terkait, dikosongkan sesudah pemilihan agar berkas sama dapat dipilih lagi, serta menerima fokus ketika request gagal maupun berhasil. Pesan error dipindahkan ke dekat kontrol. Pengujian memakai 503 sintetis hanya untuk kegagalan awal, kemudian meneruskan unggahan nyata: gambar WebP terdekode, draf/atribusi bertahan setelah reload, pratinjau memakai media yang sama, pembaca tanpa sesi menerima 404 untuk gambar dan artikel draf. Pending memakai respons server nyata yang ditahan browser; bukan respons sukses buatan atau pengukuran latensi.

Sesudah sesi terinterupsi, parent Playwright sudah tidak ada tetapi harness/Next sintetis masih berjalan. Identitas proses, workspace dan direktori `/tmp/jafa-e2e-*` dikonfirmasi sebelum SIGTERM. Harness, Next serta `.local/e2e-code-bLbL4f/` kemudian hilang; tidak ada proses atau database pengguna dihentikan. Regresi transport akun ditambahkan setelahnya; zoom tidak diulang karena perubahan berikut hanya menghilangkan pengiriman state lama, tanpa mengubah tampilan.

Suite 47/48 berhenti pada satu assert `getByRole('status')` yang sesaat cocok dengan pesan berhasil pada shell dan validasi sebelumnya pada formulir. Snapshot sesudah kegagalan hanya memiliki status berhasil yang aktif. Tes kini memeriksa status berhasil menerima fokus, menunggu jumlah status menjadi satu, lalu tetap memastikan penanda/deskripsi kesalahan lama terhapus. Timeout, logika produk dan pengelolaan fokus tidak diubah. Diagnosis: `cms-message-diagnosis.json`.

Log dan sebagian screenshot sandi mencatat exception development `Performance.measure` pada komponen Login beserta chip overlay Next. Polanya sesuai laporan [React #37561](https://github.com/react/react/issues/37561); ini petunjuk asal instrumentasi, bukan diagnosis produksi lengkap. Tidak ada patch dependensi atau penekanan exception; pemeriksaan ini tidak mengklaim nol page error. Peringatan `pg`, smooth-scroll Next dan 401 pada uji akses juga tetap dicatat.

Artefak privat `.local/states-zoom-20261109-uyelbzyp/` menyimpan scope, sumber/diff, seluruh run zoom/probe, `zoom-summary.json`, `visual-review.json`, regresi unggahan/state akun, log lint/typecheck/build, hasil suite dan cleanup interupsi. Perbandingan 105 sumber/tes/skrip mengonfirmasi perubahan pada tiga sumber produk dan satu tes saja; hash kode yang diuji diperiksa kembali. Trace/log development dapat memuat kredensial sintetis; jangan dibagikan tanpa peninjauan. Database/media/akun pengguna, `.env` serta cadangan tidak disentuh. Bukan pembaca layar/perangkat nyata, semua hover/native glyph/foto, WCAG menyeluruh, PostgreSQL native, UAT atau deployment.

## Kontras deklarasi CSS akun/sandi/FAQ — 9 November 2026

PRD §10.2/§11.3/§15.2 dilanjutkan dengan membaca komponen, semua pemakai gaya yang diubah serta pola pengujian sebelumnya. Browser tidak dapat dimulai pada lingkungan sesi ini; hasil berikut **source-only**, bukan computed style, piksel atau pengukuran zoom.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Prapemeriksaan | Bind loopback ditolak `EPERM`; Chromium berhenti pada `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`/SIGTRAP. Tidak ada server atau kasus browser berjalan |
| Baseline CSS | 44 pasangan, lima di bawah 3:1: batas topik terhadap luar/isi/hover **1,6358 / 1,7743 / 1,5019:1**, fokus reset/tutup dan ikon header **2,6478:1** |
| Perubahan produk | Empat deklarasi pada dua CSS Modules: border topik `var(--muted)`, warna outline fokus ikon bersama dan kepala FAQ `currentColor`, offset outline region `-3px` |
| Sesudah perubahan | **44/44 pasangan deklarasi lulus**, exit 0; minimum teks **5,3457:1**, batas/fokus **3,2040:1**. Batas topik minimum **4,9081:1**, fokus ikon putih/biru tua **14,4743:1** |
| Outline region | Dua screenshot historis 4 November dibaca ulang; sisi outline terpotong. Offset baru menjaga outline di dalam region menurut CSS; visibilitas/geometri hasil render belum diperiksa |
| Sintaks/lint | `node --check` skrip sekali pakai lulus; lint Design Taste `--app` pada dua CSS **0 FAIL/0 WARN**. Desain/palet tetap, tanpa draw/redraw; inspector browser belum berjalan |
| Typecheck | `npm run typecheck -- --incremental false` **lulus**, exit 0; `node node_modules/typescript/bin/tsc --noEmit --incremental false` pada salinan build, termasuk tipe rute hasil kompilasi, **lulus**, exit 0 |
| Build terisolasi | **Gagal, exit 1**: Prisma generate dan kompilasi Next 9,9 detik berhasil, lalu `Could not parse output from TypeScript's --showConfig`. Diagnosis `spawnSync` menghasilkan `error.code=EPERM` serta stdout/stderr kosong. Pemeriksaan build tetap aktif |
| Unit/integrasi/E2E | Tidak diulang untuk empat deklarasi CSS. Hasil 18/18, 45/45 dan 46/46 di bagian historis mendahului CSS terbaru |

Skrip menghitung luminansi sRGB dari warna hex/token pada selector yang ditentukan, menguji teks pada ambang 4,5:1 serta batas/fokus 3:1, dengan self-check hitam/putih, warna sama, simetri, hex singkat dan selector utuh. Parser awal sempat mencocokkan akhiran selector gabungan; diperbaiki sebelum baseline lengkap dihasilkan. Pasangan akun/ganti sandi mencakup label, input, placeholder, petunjuk, error, hasil berhasil dan sandi sementara; FAQ mencakup kepala, topik, hover yang dideklarasikan, pesan, sumber, loading, error, kirim dan fokus. Ini bukan pembuktian semua state benar-benar tampil. Kontrol native/nonaktif, alpha hover ikon, gambar, overlap dan pembaca layar tidak diperiksa.

Artefak privat: `.local/a11y-states-20261109-8y4g4p1q/`, termasuk snapshot sumber, `scope.json`, `check-colours.mjs`, kedua laporan warna, `preflight.json`, log serta `build-diagnosis.json`. Salinan build gagal `.local/build-check-code-6aMhit/` dipertahankan; URL database dummy dipakai, database/media/akun pengguna, `.env`, cadangan dan proses pengguna tidak disentuh. Tidak ada deployment. Berikutnya tetap zoom aktual 200% akun/ganti sandi/FAQ, tinjauan visual fokus/batas/outline CSS baru dan build penuh pada host yang mengizinkan browser/subprocess; tidak ada klaim WCAG/UAT selesai.

## Zoom 200% dan kontras profil/regulasi — 6 November 2026

Paket ini mengikuti PRD §15.2 dan dibatasi ke dua jenis formulir. Warna border default input/select/textarea dan tombol sekunder CMS menjadi `#7b8ba0`; dua nilai warna merupakan seluruh perubahan produk. Layout, ukuran border, font, error, layanan, peran, skema dan publikasi tidak berubah. Pemakai gaya bersama dibaca sebelum edit.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Zoom tab asli | Chrome 149.0.7827.55, Tabs API faktor 2; 1440×913→720×456 dan 640×913→320×456 CSS px, DPR 1→2, `visualViewport.scale=1` |
| Cakupan | Empat alur profil/regulasi; **28 pengukuran** fokus sumber/tombol sekunder, pending simpan, berhasil simpan, error wajib, error daftar/URL dan berhasil ajukan; koreksi juga dilalui |
| Geometri | Tidak ada overflow dokumen, pemotongan teks label/pesan yang diperiksa atau outline fokus yang terpotong viewport |
| Temuan sebelum perbaikan | Border input di panel sumber **2,9625:1**, border tombol sekunder **2,2779:1**; warna CSS dikonfirmasi lewat piksel border |
| Sesudah perbaikan | **Lulus**, exit 0: 901 pengukuran teks aktif (minimum **5,7982:1**), 358 batas kontrol relevan (**3,2040:1**) dan 24 fokus (**5,0400:1**); nol temuan di bawah ambang sesuai ukuran/jenis |
| Piksel | 16 sampel border dan 24 sampel outline cocok dengan warna CSS; bukan pemeriksaan seluruh piksel atau glyph native |
| Screenshot | Empat capture error baseline dan seluruh **20 capture akhir** dibaca, berukuran fisik 1440×913 atau 640×913; pesan, kontrol dan outline terbaca pada zoom 200% |
| Respons pending | POST Server Action nyata diteruskan ke server, responsnya ditahan sementara oleh browser; bukan hasil mock atau pengukuran latensi |
| Lifecycle | Baseline lengkap dan pengulangan akhir masing-masing menutup server exit 0, lalu membersihkan profil browser dan workspace/data sementara masing-masing |
| Sintaks/lint | `node --check` lulus; lint dua CSS Design Taste **0 FAIL/0 WARN**; tidak ada draw/redraw atau pengulangan inspector desain umum |
| Build terbaru | **Lulus**, exit 0, terisolasi sesudah pemeriksaan: Prisma generate, kompilasi 11,5 detik, TypeScript 15,1 detik, pembentukan rute/optimasi |
| Unit/integrasi/E2E penuh | Tidak diulang untuk perubahan CSS dua warna; hasil 18/18, 45/45 dan 46/46 berikut tetap bukti sebelum perubahan ini |

Kandidat mentah baseline berjumlah 168 pengukuran berulang, bukan 168 cacat. Sebanyak 48 merupakan tombol teks bergaris bawah tanpa border/fill (`linkButton`), sehingga diperiksa lewat kontras teks 4,5:1; 120 pengukuran batas kontrol yang digambar berada di bawah 3:1. `classified-before.json` menyimpan klasifikasi beserta bukti teks. Pengulangan membedakan tombol teks, kontrol nonaktif (pengecualian), dan batas kontrol aktif. Nama state hover pada skrip awal tidak menjadi bukti hover; run akhir secara eksplisit memeriksa fokus keyboard. Jarak teks tetap CSS aplikasi; text-spacing tambahan belum diuji ulang.

Percobaan awal sandbox ditolak `listen EPERM` sebelum server/data dibuat. Run pertama di luar sandbox terhenti pada kesalahan skrip pemeriksaan `Route is already handled`: route dicabut sebelum respons tertahan selesai dikirim. Skrip diperbaiki dengan menunggu handler selesai. Run gagal beserta salinan sumber `.local/e2e-code-Jfn5NU/` dipertahankan; pemeriksaan proses yang dicocokkan dengan log tidak menemukan kandidat, sehingga tidak ada PID pengguna yang dihentikan. Baseline berikut menyelesaikan seluruh alur/server exit 0 lalu keluar 1 pada assert kontras; pengulangan akhir **exit 0** setelah perubahan CSS.

Artefak privat `.local/forms-zoom-20261106-b9i20a6i/`: `scope.json`, `classified-before.json`, `before-lzCaFh/` (terhenti), `before-q08OuN/` (baseline lengkap), `after-QFXIkz/` (lulus), salinan skrip/laporan/log per run, `lint.log` dan `build.log`. Skrip sekali pakai memakai ekstensi/profil Chromium serta harness E2E yang terisolasi; bukan CLI proyek. Mode pratinjau mati, editor/penyetuju fixture berbeda, materi fixture saja yang disetujui saat persiapan. Data pengembangan, media, akun, `.env`, cadangan dan server pengguna tidak disentuh. Build memakai URL database dummy, bukan DB pengguna.

Angka di atas menghitung sampel berulang per state. Cakupannya formulir dan pesan yang dipilih, bukan semua halaman, pembaca layar/perangkat nyata, hover pointer, seluruh glyph native, foto/lapisan saudara, atau audit WCAG menyeluruh. Nilai input panjang boleh bergulir di dalam kontrol; ini berbeda dari overflow dokumen. State baru akun/ganti sandi/FAQ, modul lain, PostgreSQL native, staging/UAT dan kesiapan produksi masih belum dibuktikan.

## Validasi CMS dan interaksi sebelum hidrasi — 6 November 2026

`validateForPublication` memetakan kesalahan ke enam kolom profil dan lima kolom regulasi masing-masing, menggantikan penumpukan pada `body`/`officialUrl`. Syarat kelengkapan tetap sama. Textarea daftar pada `EditorForm` mempunyai nama eksplisit, petunjuk dan kesalahan yang terkait, penanda `aria-invalid`, serta tujuan fokus melalui logika formulir yang sudah ada. CSS, skema, dependensi, peran, transaksi dan aturan publikasi tidak berubah.

Suite penuh pertama menemukan kontrol yang menerima interaksi sebelum hidrasi. Dua POST CMS memuat payload tersembunyi dengan nilai masih kosong meskipun kolom telah diisi; satu draf tersimpan sebagai “Tanpa judul”. Profil mobile juga mengembalikan nilai definisi lama setelah dikosongkan. Regresi deterministis menahan seluruh skrip chunk klien, mengantrekan klik atau pengisian, lalu melepas skrip dan memeriksa hasilnya. Keempat kasus awal gagal. Pembuka pencarian/menu/FAQ serta kontrol editor sekarang dinonaktifkan sampai komponen terpasang; tes keyboard menunggu kontrol aktif sebelum fokus. Ini mencegah interaksi yang belum ditangani, tanpa menambah jeda tetap atau mengubah timeout.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Regresi server awal | **0/2 lulus**, exit 1; pemetaan kolom profil/regulasi tidak sesuai |
| Regresi sesudah perbaikan | **2/2 lulus**, exit 0, sekitar 11 detik; 19 kombinasi kesalahan, snapshot penolakan tetap dan koreksi/publikasi sah |
| Typecheck | **Lulus**, exit 0; juga sesudah perbaikan kesiapan kontrol |
| Unit | **18/18 lulus**, exit 0 |
| Integrasi penuh | **45/45 lulus**, exit 0, sekitar 106 detik; PGlite terisolasi, bukan PostgreSQL native |
| Self-check fixture E2E | **Lulus**, exit 0; tiga peran, 29 materi melalui persetujuan sintetis, persistensi sesudah buka ulang |
| Browser dalam sandbox | Server tidak dapat dimulai, exit 1; `.last-run.json` gagal tanpa kasus gagal karena tes belum berjalan |
| Browser terarah di luar sandbox | **4/4 lulus**, exit 0, sekitar 4,4 menit termasuk persiapan; dua skenario desktop/mobile, timeout 120 detik tetap |
| Screenshot | Delapan capture terarah dan delapan capture profil/regulasi pada suite akhir dibaca di 320/1440 CSS px dengan jarak teks diperbesar; pesan dan outline fokus terlihat |
| E2E penuh pertama | **35/42 lulus**, exit 1, sekitar 14,9 menit; tujuh kegagalan pembuka/menu, workflow CMS dan validasi profil/regulasi mobile |
| Regresi skrip ditahan sebelum perbaikan | **0/4 lulus**, exit 1; kontrol HTML awal aktif meskipun handler belum siap, dialog/penyimpanan gagal |
| Regresi skrip ditahan sesudah perbaikan | **4/4 lulus**, exit 0, sekitar 3,7 menit; pembukaan dialog/menu dan persistensi judul/slug/ringkasan setelah reload |
| E2E penuh terbaru | **46/46 lulus**, sekitar 17,1 menit; formatter dan `.last-run.json` mengonfirmasi `passed` tanpa kasus gagal |
| Build pertama dalam sandbox | Kompilasi berhasil 10,7 detik, kemudian gagal membaca output TypeScript `--showConfig`; exit 1, salinan gagal dipertahankan |
| Build terisolasi di luar sandbox | **Lulus**, exit 0 setelah E2E; Prisma generate, kompilasi 7,7 detik, TypeScript 14,1 detik, rute dan optimasi |
| Lima dokumen | **61 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi; anchor/URL eksternal tidak diuji |

Regresi server menggunakan fixture profil/regulasi yang sah, menerbitkannya dengan editor/penyetuju berbeda, lalu menyimpan revisi tidak lengkap. Penolakan pengajuan mempertahankan seluruh nilai item/revisi, proyeksi pencarian, kontributor dan jumlah audit serta versi publik. Pengosongan setiap kolom, daftar kosong/entri spasi, tahun rusak, URL HTTP atau domain tiruan ditolak pada kolom terkait; koreksi berikutnya dapat diajukan dan diterbitkan. Predikat tidak diperketat atau dilonggarkan oleh perubahan pemetaan ini.

Browser memeriksa nama/deskripsi/penanda enam kolom profil dan lima kolom regulasi, fokus menuju definisi/jenjang serta nomor/URL, nilai yang bertahan, penghapusan penanda sesudah simpan, dan penguncian sesudah pengajuan. Dua fixture profil tetap berbeda dipakai untuk desktop/mobile; draf regulasi unik tetap tidak tampil publik setelah diajukan. Jenjang dengan baris kosong di akhir dan URL HTTPS nonresmi dapat disimpan sebagai draf tetapi pengajuannya ditolak. Viewport penuh pada jenjang/URL serta pengukuran overflow dokumen lulus. Ini bukan zoom tab 200%, seluruh state, pembaca layar nyata, perangkat nyata atau UAT.

Artefak privat: `.local/cms-fields-20261106-4b9zs6y4/`, berisi sumber awal, `scope.json`, `source-review.json`, `source.diff`, log regresi/typecheck/unit/integrasi/fixture, `targeted-e2e/` (server gagal), `targeted-browser/` (4/4), `full-e2e/` (35/42), `before-hydration/` (0/4), `after-hydration/` (4/4), `final-e2e/` (46/46), `build.log` (gagal) dan `build-approved.log` (lulus), serta diagnosis tanpa nilai akun. Salinan build gagal `.local/build-check-code-9JGTbo/` dipertahankan; salinan build sukses dibersihkan harness. Setelah jeda, sesi proses E2E lama tidak lagi tersedia untuk membaca kode keluar induk; hasil 46/46 berasal dari log akhir dan `.last-run.json`. Hash tujuh berkas sumber/tes cocok dengan versi yang diuji dan tidak ada salinan workspace E2E tersisa.

Trace/context dapat memuat sesi/kredensial sintetis; tinjau sebelum dibagikan. Unit/integrasi memeriksa perubahan layanan dan tidak diulang untuk tambahan state klien hidrasi. Semua database/media uji dan kode/cache terisolasi; build memakai URL database dummy tanpa mematikan pemeriksaan tipe. Database/media/akun pengguna, `.env`, cadangan dan server pengguna tidak disentuh. Belum ada pemeriksaan zoom 200% atau pembaca layar baru, PostgreSQL native, staging, UAT, deployment atau persetujuan produksi.

## Fokus hasil konten CMS — 4 November 2026

Pesan keberhasilan simpan draf, pengajuan, pengembalian, penerbitan dan penarikan kini dilaporkan sebelum formulir diganti, lalu ditampilkan oleh `AdminShell` pada rute konten terkait. Fokus menuju status yang tetap tersedia setelah form dikunci/dilepas atau revisi baru dibuat. Pesan dibersihkan ketika tindakan baru dimulai atau rute berganti; hasil setelah pengguna meninggalkan rute diabaikan. Refresh klien berulang dihapus karena Server Actions sudah merevalidasi rute. Tidak ada perubahan CSS, layanan, skema, dependensi atau aturan publikasi.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Workflow awal | **0/2 lulus**, exit 1; 16 assert fokus gagal, sedangkan transisi/publikasi lainnya tercapai. Per desktop/mobile: tujuh pesan hilang, satu tampil tanpa fokus |
| Typecheck | **Lulus**, exit 0 termasuk sesudah koreksi tes |
| Terarah pertama | **2/4 lulus**, exit 1; dua validasi lulus, workflow mencapai seluruh assert fokus lalu tertahan locator judul H1/H3 yang ambigu saat kembali |
| Terarah sesudah koreksi locator | **4/4 lulus**, exit 0, sekitar 2,4 menit; locator dibatasi ke H1, timeout 120 detik dan kode produk tetap |
| Status dan navigasi | Delapan tindakan per proyek menerima fokus; Tab/Shift+Tab tidak menambah perhentian status, pesan lama hilang saat mulai tindakan/rute baru dan tidak kembali saat Back |
| Workflow tambahan dengan viewport | **2/2 lulus**, exit 0, sekitar 3,9 menit termasuk persiapan; seluruh 16 status berada penuh dalam viewport pada 320/1440 CSS px |
| Screenshot akhir | Delapan capture dari `viewport/` dibaca; pesan dan outline fokus terlihat. Capture awal yang belum menampilkan pesan dipertahankan |
| Suite penuh | **38/38 lulus**, exit 0, sekitar 6,1 menit; `.last-run.json` `passed` tanpa kasus gagal |
| Build terisolasi | **Lulus**, exit 0 sesudah pemeriksaan viewport; Prisma generate, kompilasi 9,4 detik, TypeScript 12,3 detik, pembentukan rute dan optimasi |
| Unit/integrasi | Tidak diulang; perubahan hanya state, markup dan fokus klien |
| Lima dokumen | **58 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |
| Cleanup harness | Tidak ada salinan kode E2E tersisa; build sukses dibersihkan dan tiga salinan build gagal lama dipertahankan |

Assert fokus lunak tetap menggagalkan kasus sambil memeriksa seluruh tindakan berikutnya; kelulusan bukan hasil pengabaian assert. Tinjauan delapan screenshot terarah awal menemukan beberapa capture draf baru/penarikan tanpa pesan terlihat walaupun fokus DOM lulus. Sesudah suite penuh, tes diperluas dengan assert viewport rasio 1 pada seluruh delapan hasil per proyek; kedua workflow tambahan lulus tanpa perubahan produk/timeout atau jeda tetap. Delapan screenshot akhir memperlihatkan pesan dan outline fokus; bukti akhir berasal dari `viewport/`. Suite penuh mendahului penambahan assert viewport tersebut, bukan perubahan produk.

Pesan status dan validasi server, peran editor/penyetuju/admin, serta larangan menyetujui kontribusi sendiri tetap mengikuti layanan yang ada. Regresi memakai alur artikel pada komponen yang digunakan bersama dan data nyata pada database sintetis; bukan bukti semua jenis/state CMS, pembaca layar, perangkat nyata atau zoom tab 200% baru.

Artefak privat berada di `.local/content-focus-20261104-t9snqe40/`: sumber awal, `scope.json`, `baseline-summary.json`, `locator-diagnosis.json`, `source-review.json`, log typecheck, `before-targeted/`, `targeted/`, `targeted-passed/`, `full-e2e/`, `viewport/`, log masing-masing, `build.log`, `document-check.json` dan `final-result.json`. `.last-run.json` pada ketiga pengulangan berhasil berstatus `passed` tanpa kasus gagal. Trace/context dapat memuat sesi/kredensial sintetis; tinjau sebelum dibagikan. Kode/cache, database dan media uji terpisah; build memakai URL database dummy tanpa mematikan pemeriksaan. `.env`, database/media/akun pengguna, cadangan dan server pengguna tidak disentuh. Peringatan `pg`, smooth-scroll Next serta 401 yang diharapkan pada uji akses tetap muncul. Pembaca layar nyata, seluruh state kontras/zoom/fokus, perangkat nyata, PostgreSQL native/staging serta UAT tetap belum dibuktikan. Tidak ada deployment.

## Fokus hasil akun — 4 November 2026

Sesudah buat akun, simpan akses atau reset sandi berhasil, `useUserForm` memfokuskan pesan hasil dalam formulir sendiri. `ActionMessage` memakai `tabIndex=-1` agar menjadi tujuan fokus programatis tanpa menambah perhentian Tab. Fokus kesalahan tetap menuju kolom bermasalah. Perubahan mengikuti PRD §11.3/§15.2; CSS, layanan, skema, dependensi dan aturan publikasi tidak berubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Regresi browser sebelum perubahan | **0/4 lulus**, exit 1; pesan berhasil buat/simpan tampil tetapi tidak menerima fokus pada desktop/mobile |
| Typecheck | **Lulus**, exit 0 |
| Browser terarah sesudah perbaikan | **4/4 lulus**, exit 0, sekitar 1,3 menit termasuk persiapan sintetis |
| Fokus keberhasilan | Buat/simpan/reset/aktivasi ulang memfokuskan status dalam formulir yang benar; Shift+Tab kembali ke tombol buat/reset |
| Screenshot | Empat hasil berhasil dibaca pada 320/1440 CSS px; outline fokus terlihat dan sandi sementara pembuatan dimasking |
| Suite E2E penuh | **38/38 lulus**, exit 0, sekitar 9 menit; `.last-run.json` `passed` tanpa kasus gagal |
| Build produksi terisolasi | **Lulus**, exit 0 sesudah E2E; Prisma generate, kompilasi 12 detik, TypeScript 14 detik, pembentukan rute dan optimasi |
| Unit/integrasi | Tidak diulang; perubahan hanya markup/fokus klien. Hasil 18/18 dan 43/43 sebelumnya tetap historis |
| Lima dokumen | **56 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |
| Cleanup harness | Tidak ada salinan kode E2E tersisa; build sukses dibersihkan, tiga salinan build gagal lama dipertahankan |

Percobaan sandbox gagal memulai server sebelum tes. Percobaan pertama di luar sandbox tidak menemukan kasus karena filter terlalu ketat; filter diperbaiki dan discovery menemukan empat kasus sebelum regresi awal dijalankan. Empat trace regresi awal mengonfirmasi `toBeFocused` menerima `inactive`, kemudian seluruh kasus yang sama lulus sesudah perbaikan. Timeout tidak diubah. Screenshot pembuatan memakai jarak teks diperbesar; screenshot perubahan akses memakai jarak default setelah reload. Ini bukan zoom tab 200% baru atau bukti pengumuman pembaca layar nyata.

Artefak privat `.local/account-focus-20261104-hb9y1rfw/` menyimpan sumber awal, `scope.json`, `baseline-summary.json`, `before-e2e.log`, `before-browser.log`, `before-targeted/`, `before-targeted.log`, `typecheck.log`, `targeted/`, `targeted.log`, `full-e2e/`, `full-e2e.log`, `build.log`, `document-check.json` dan `final-result.json`. Trace/context dapat memuat sandi/sesi sintetis; tinjau sebelum dibagikan. Browser memakai salinan kode/cache serta database/media sementara; build memakai URL database dummy dan salinan kode/cache tanpa mematikan pemeriksaan. `.env`, database/media/akun pengguna, cadangan dan server pengguna tidak disentuh. Peringatan antrean `pg`, smooth-scroll Next dan 401 yang diharapkan pada pemeriksaan sesi tanpa hak tetap muncul; seluruh assert lulus. Pembaca layar nyata, fokus keberhasilan alur CMS selain akun, semua state kontras/zoom, perangkat nyata, PostgreSQL native/staging dan UAT tetap belum dibuktikan. Tidak ada deployment.

## Formulir akun — 4 November 2026

Kesalahan buat/ubah akun kini mencapai kolom nama, email, peran dan akses. Email duplikat serta penolakan admin aktif terakhir mempunyai kolom terkait. Nilai `active` rusak, berkas atau hilang pada update tidak lagi dikonversi menjadi nonaktif; hanya string `true`/`false` yang dikonversi, sisanya ditolak skema. Formulir memberi nama/deskripsi/fokus kesalahan dan mempertahankan masukan saat ditolak. Reset native hanya diizinkan setelah action berhasil; kontrol memakai fieldset yang dinonaktifkan selama permintaan. CSS, skema dan dependensi tidak berubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Regresi server awal | **0/3 lulus**, exit 1; penanda kolom hilang dan nilai akses rusak benar-benar menonaktifkan target sintetis |
| Regresi server terarah sesudah perbaikan | **3/3 lulus**, exit 0 |
| Typecheck | **Lulus**, exit 0 sesudah penyesuaian default kontrol |
| Unit | **18/18 lulus**, exit 0 |
| Integrasi penuh | **43/43 lulus**, exit 0, sekitar 78 detik |
| Browser terarah pertama | **2/4 lulus**, exit 1: pembuatan akun desktop/mobile lulus; perubahan akun mengembalikan tampilan select ke nilai lama setelah simpan |
| Browser terarah sesudah penyesuaian default | **4/4 lulus**, exit 0, sekitar 3,3 menit termasuk persiapan sintetis |
| Screenshot | Delapan panel/formulir dari pengulangan yang lulus dibaca; nama/email dan akses/peran admin terakhir pada 320/1440 CSS px dengan jarak teks diperbesar |
| Suite E2E penuh | **38/38 lulus**, exit 0, sekitar 8,5 menit; seluruh kasus akun, ganti sandi dan publikasi desktop/mobile lulus |
| Build produksi terisolasi | **Lulus**, exit 0 sesudah E2E; Prisma generate, kompilasi 9,6 detik, TypeScript 21,3 detik, pembentukan rute serta optimasi |
| Enam dokumen | **59 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |
| Cleanup harness | Tidak ada salinan kode E2E tersisa; build sukses dibersihkan, tiga salinan build gagal lama dipertahankan |

Trace mobile memuat props tersimpan `approver` dan nonaktif, sedangkan select masih `editor`; ini kesalahan tampilan/reset default, bukan bukti penyimpanan role gagal. `UpdateUserForm` memasang ulang kelompok kontrol saat role/akses tersimpan berubah. Pengulangan terarah kemudian membuktikan nilai sesudah simpan sesuai data, reset sandi tidak ikut menyimpan pilihan role/akses yang belum diajukan, sesi lama tercabut, serta sandi lama ditolak dan sandi reset memaksa penggantian. Suite penuh **38/38** dan build terisolasi sesudahnya **lulus** tanpa melonggarkan timeout atau mematikan pemeriksaan. Hasil 34/34 dan build pada bagian ganti sandi berikut mendahului perubahan ini.

Regresi server memeriksa batas nama/email, berkas, role/akses rusak, identitas dan operasi tidak sah, email duplikat tanpa membedakan kapital, serta penolakan admin terakhir karena role, akses, atau keduanya. Snapshot pengguna, kredensial, sesi dan jumlah audit tetap sama pada penolakan. Action langsung memeriksa tanpa sesi/editor/penyetuju/sesi admin dicabut; akses rusak tidak mengubah target. Keberhasilan reset/perubahan peran tetap memiliki regresi yang sudah ada. Harness request menggunakan internal Next dan tidak membuktikan transport HTTP, origin, atau pengumuman pembaca layar.

Artefak privat `.local/account-forms-20261104-jzou7hh2/` mencakup sumber awal, log regresi gagal, `targeted-integration.log`, `unit.log`, `integration.log`, `targeted-passed/`, `targeted-passed.log`, `full-e2e/`, `full-e2e.log`, `build.log`, serta diagnosis tanpa nilai akun `select-reset-diagnosis.json`. `.last-run.json` suite penuh berstatus `passed` tanpa kasus gagal. Trace/context dapat memuat sandi dan sesi fixture sintetis; tinjau sebelum dibagikan. Tes memakai database/media sementara dan salinan kode/cache; build memakai URL DB dummy. `.env`, data/akun/media pengguna, cadangan dan server pengguna tidak disentuh. Peringatan antrean `pg`, smooth-scroll Next, serta 401 yang diharapkan pada uji sesi dicabut tetap muncul. Tidak ada deployment atau persetujuan UAT, audit independen, atau pembaca layar nyata.

## Validasi ganti sandi — 4 November 2026

Kesalahan ganti sandi kini mencapai kolom `current`, `password`, atau `confirm`. Server Action menolak nilai berkas sebelum layanan; layanan tetap memvalidasi sandi baru 12–128 karakter, harus berbeda, serta sandi lama. `AuthForm` menghubungkan nama/petunjuk/kesalahan, memfokuskan masalah, dan membatalkan reset native setelah action agar masukan login/ganti sandi bertahan pada kegagalan. CSS, skema, dependensi, peran dan aturan publikasi tidak berubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Dua regresi server sebelum perbaikan | **0/2 lulus**, exit 1: kesalahan belum mempunyai `fields.password`/`fields.confirm` |
| Pengulangan server terarah | **2/2 lulus**, exit 0; validasi layanan dan Server Action dengan cookie/sesi nyata sintetis |
| Typecheck | **Lulus**, exit 0 |
| Unit | **18/18 lulus**, exit 0 |
| Integrasi penuh sesudah perbaikan redirect | **40/40 lulus**, exit 0, sekitar 78 detik; database/media sintetis terisolasi |
| Browser pertama | **0/2 lulus**, exit 1: locator persis `Sandi baru` tertahan karena nama lama memuat petunjuk; belum mencapai pengiriman/validasi |
| Browser sesudah koreksi locator/validasi | **0/2 lulus**, exit 1: validasi/fokus/masukan lulus sampai keberhasilan; tujuan login kehilangan `changed=1` |
| Diagnosis redirect | Dua trace: POST 200 memuat pesan sukses dan tujuan `changed=1`, tetapi render juga memuat `NEXT_REDIRECT` ke `/admin/login` |
| Pengulangan browser sesudah perbaikan redirect | **2/2 lulus**, exit 0, sekitar 3,2 menit termasuk persiapan sintetis; pesan sukses serta login dengan sandi baru tercapai |
| Discovery E2E | **34 kasus** dalam tiga berkas |
| Suite penuh pertama | **33/34 lulus**, exit 1; satu assert navigasi keyboard CMS desktop melewati lima detik, semua kasus lain termasuk ganti sandi/publikasi lulus |
| Pengulangan suite penuh | **34/34 lulus**, exit 0, sekitar 5,8 menit; kedua ukuran Chromium dan seluruh workflow lulus |
| Build produksi terisolasi sesudah E2E | **Lulus**, exit 0; Prisma generate, kompilasi 11,4 detik, TypeScript 17,2 detik, pembentukan rute serta optimasi |
| Enam dokumen | **56 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |
| Cleanup | Tidak ada salinan kode E2E tersisa; salinan build sukses dibersihkan harness, tiga salinan build gagal lama dipertahankan |

Locator diperbaiki memakai awalan nama, dan alert dibatasi pada main agar tidak mencocokkan pengumuman navigasi Next. Timeout skenario tetap 120 detik. Setelah logout, pemuatan ulang halaman ganti sandi mengarahkan pengguna ke login polos sebelum efek pengalihan dari state klien. `passwordAction` kini mengarahkan di server melalui `redirect('/admin/login?changed=1')` di luar catch, mengikuti pola `logoutAction`. Typecheck, kedua regresi request terarah, unit dan integrasi penuh lulus kembali sesudah perubahan redirect. Hasil 32/32 serta build pada bagian FAQ berikut mendahului perubahan ini.

Suite penuh pertama berhenti pada assert URL daftar artikel desktop, setelah Enter memulai request dan header 200 baru diterima dalam 4.504 ms. Isi respons belum terekam saat penghentian kasus, sehingga ini bukan bukti halaman artikel sudah selesai ditampilkan. Mobile dengan cache server yang sudah hangat lulus dengan batas lama. Hanya assert navigasi itu diubah menjadi 15 detik; timeout 120 detik dan kode produk tetap. Pengulangan penuh kemudian lulus **34/34**, termasuk navigasi tersebut, disusul build terisolasi yang lulus tanpa mematikan pemeriksaan. `navigation-diagnosis.json` dan `navigation-response-diagnosis.json` menyimpan angka tanpa nilai akun.

Regresi layanan mencakup panjang 11/129 karakter, sandi sama, sandi lama salah, serta keberhasilan tepat 12 karakter. Snapshot pengguna, kredensial, sesi dan jumlah audit tetap sama pada penolakan. Regresi action memeriksa akses tanpa sesi, konfirmasi berbeda, berkas pada masing-masing input, keberhasilan sandi sementara, dan sesi lama yang sudah dicabut. Counter laju memang bertambah pada permintaan terautentikasi dan dikecualikan dari snapshot tanpa mutasi akun. Input sandi tidak dikembalikan dalam state action; kegagalan tidak mengungkap rahasia.

Empat screenshot validasi dari percobaan kedua dan empat dari pengulangan terarah yang lulus dibaca: pesan dan fokus terlihat di 320/1440 CSS px dengan jarak teks diperbesar, sandi tetap dimasking. Artefak privat berada di `.local/password-accessibility-20261104-j177447v/`: sumber awal, log/trace percobaan gagal, `unit-final.log`, `integration-final.log`, `targeted-passed/`, `targeted-passed.log`, `full-passed/`, `full-passed.log`, `build.log`, dan diagnosis tanpa nilai akun. `.last-run.json` pada `full-passed/` berstatus `passed` tanpa kasus gagal. Trace/context gagal memuat sandi serta sesi fixture sintetis, sehingga perlu ditinjau sebelum dibagikan. Browser memakai akun baru lewat CMS pada server/database/media/salinan kode terisolasi; build memakai URL database dummy. `.env`, akun/data/media pengguna, cadangan, dan server pengguna tidak disentuh. Peringatan antrean `pg`/smooth-scroll Next serta 401 yang diharapkan pada uji admin tanpa sesi tetap muncul. Tidak ada deployment. Harness action internal Next tidak menggantikan browser, pembaca layar nyata, pengujian origin Server Actions, atau UAT.

## Percakapan FAQ dengan keyboard — 4 November 2026

Area gulir FAQ kini dapat menerima fokus keyboard dan mempunyai nama region; log mempunyai nama aksesibel, dan kolom pertanyaan membaca petunjuk privasi serta pesan gangguan melalui `aria-describedby`. Perubahan hanya markup komponen dan regresi browser; CSS, API, dependensi, skema, dan aturan publikasi tidak berubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Prapemeriksaan sandbox | Loopback ditolak `EPERM`; Chromium gagal mulai dengan SIGTRAP. Browser kemudian dijalankan melalui eksekusi di luar sandbox yang disetujui |
| Regresi sebelum perbaikan | **0/2 lulus**, exit 1; desktop/mobile tidak menemukan region yang dapat difokuskan |
| Regresi sesudah perbaikan | **2/2 lulus**, exit 0, sekitar 2,8 menit termasuk persiapan server/database sintetis |
| `npm run typecheck` | **Lulus**, exit 0 sesudah perubahan |
| Discovery E2E | **32 kasus** dalam tiga berkas; discovery bukan kelulusan interaksi |
| Suite E2E penuh | **32/32 lulus**, exit 0, sekitar 7,5 menit; Chromium desktop/mobile, data sintetis, pratinjau mati |
| Build produksi terisolasi | **Lulus**, exit 0 setelah E2E; Prisma generate, kompilasi 9,3 detik, TypeScript 13,9 detik, pembentukan rute dan optimasi |
| Screenshot | Dua baseline dan enam hasil terarah dibaca: topik, fokus/gulir jawaban, serta gangguan di desktop/mobile |
| Lima dokumen yang diperbarui | **50 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |
| Cleanup harness | Tidak ada salinan kode E2E tersisa; salinan build sukses dibersihkan harness. Tiga salinan build gagal lama tetap dipertahankan |

Regresi baru memakai lebar 1440/320 CSS px, tinggi 900 px, dan jarak teks diperbesar. Tab dari tombol tutup memfokuskan area gulir, Home/PageDown mengubah posisi gulir, lalu Tab memfokuskan sumber pertama. Jawaban berasal dari API/database fixture terbit. Satu respons 503 disimulasikan pada browser untuk memeriksa deskripsi, masukan/jawaban yang bertahan, reset dan pengembalian fokus; bukan gangguan backend nyata.

Artefak privat berada di `.local/faq-keyboard-20261104-axkwp9vq/`, termasuk `before-source/`, `before-e2e/`, `after-targeted/`, `full-e2e/`, `full-e2e.log`, dan `build.log`. `.last-run.json` suite penuh berstatus `passed` tanpa kasus gagal. Harness memakai salinan kode/cache dan database/media sementara; build memakai URL database dummy. `.env`, data/akun/media pengguna, serta server pengguna tidak disentuh. Unit/integrasi tidak diulang karena tidak ada perubahan logika layanan. Log memuat peringatan antrean `pg` dan atribut smooth-scroll Next, serta 401 yang diharapkan pada pemeriksaan admin tanpa sesi; seluruh assert tetap lulus. Pembaca layar nyata, zoom tab 200% pada state baru, seluruh state kontras/fokus, perangkat nyata, staging/UAT dan audit aksesibilitas lengkap tetap belum terbukti. Tidak ada deployment.

## Workflow browser dan build — 3 November 2026

Pengujian kini dijalankan di luar sandbox dengan izin pengguna. Percobaan terarah pertama menemukan reset checkbox arsip sesudah validasi ditolak, walaupun checkbox sudah memakai state. `WithdrawForm` membatalkan reset native formulir yang diminta React setelah action. Tidak ada perubahan layanan, peran, skema, dependensi, atau CSS.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Workflow terarah pertama | **0/2 lulus**, exit 1: desktop timeout URL login lima detik; mobile kehilangan pilihan arsip setelah penolakan penarikan |
| Diagnosis login desktop | Trace: POST login 200 sekitar 945 ms memuat `ok: true` dan tujuan admin; dua GET admin 200. Snapshot klien belum selesai bernavigasi dalam lima detik |
| Perbaikan pengujian | Hanya assert URL login pada dua helper memakai 15 detik; timeout workflow tetap 120 detik |
| Workflow terarah sesudah perbaikan | **2/2 lulus**, exit 0, sekitar 4,4 menit termasuk persiapan sintetis |
| `npm run test:e2e` | **30/30 lulus**, exit 0, sekitar 5,4 menit; Chromium desktop/mobile, pratinjau mati, data sintetis terisolasi |
| `npm run typecheck` | **Lulus**, exit 0 |
| Build produksi terisolasi | **Lulus**, exit 0 setelah suite; Prisma generate, kompilasi 7,7 detik, TypeScript 15,9 detik, pembentukan rute dan optimasi |
| Screenshot | Empat gambar validasi keputusan/penarikan desktop/mobile dari pengulangan terarah dibaca; pilihan arsip terlihat tercentang |
| Hasil suite akhir | `.last-run.json` `passed`, tanpa kasus gagal; salinan hasil dipertahankan |
| Lima dokumen yang diperbarui | **47 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |

Artefak privat `.local/verification-20261103-8k7mv2wc/` memuat `first-targeted/`, `targeted-passed/`, `e2e-full-passed/`, `e2e-full.log`, dan `build.log`. Trace gagal mengandung sesi/kredensial fixture sintetis sehingga perlu ditinjau sebelum dibagikan. Harness memakai salinan kode/cache dan database/media sementara; build memakai URL DB dummy. `.env`, database/media/akun pengguna dan server pengguna tidak disentuh. Salinan build gagal lama dipertahankan; salinan build yang berhasil dibersihkan harness.

Hasil ini menggantikan status browser/build yang masih terhalang pada bagian historis berikut. Unit/integrasi tidak diulang untuk perbaikan UI ini; hasil 18/18 dan 38/38 tetap historis. Pembaca layar nyata, seluruh state kontras, staging/UAT dan kesiapan produksi belum terbukti.

### Zoom tab 200% dan kontras terbatas

Pemeriksaan memakai Chromium 149.0.7827.55, profil/ekstensi sementara, dan server sintetis pada port 5191. Zoom tab diatur dengan [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom), lalu dibaca kembali sebagai faktor 2. Ekstensi dijalankan pada konteks persisten Chromium sesuai [panduan Playwright](https://playwright.dev/docs/chrome-extensions); profil pengguna tidak digunakan.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Bukti zoom | Layout 1440×913→720×456 CSS px; DPR 1→2, `visualViewport.scale` tetap 1, faktor zoom 2 dengan mode otomatis/per-origin |
| Cakupan | 15 rute publik/login serta 14 kunjungan CMS dengan tiga peran; 29 kunjungan selesai, exit 0 |
| Overflow/pemotongan | 0 overflow horizontal; 0 pemotongan pada heading, paragraf, tombol, summary yang diperiksa. Tabel tetap boleh bergulir di areanya |
| Dialog pada zoom | Pencarian/FAQ dibuka dengan keyboard, bounding rectangle berada dalam viewport, Escape mengembalikan fokus |
| Pemindaian kontras teks | 1.453 pengukuran elemen teks termasuk pengulangan antarhalaman, 0 temuan di bawah ambang 4,5:1/3:1 sesuai ukuran/bobot |
| Capture pertama | Playwright menghasilkan potongan kiri 720×456; gambar/laporan ini dipertahankan di `zoom-first-capture/` dan tidak menjadi bukti visual akhir |
| Capture akhir | Pengulangan lengkap memakai CDP tanpa clip, assert PNG 1440×913; enam screenshot beranda/simulator/login/pencarian/FAQ/pengguna dibaca |
| Penutupan | Server zoom exit 0, profil sementara dihapus; tidak ada salinan kode E2E tersisa. Tiga salinan build gagal lama dipertahankan |

Pemindaian menghitung warna teks dan latar leluhur dari CSS, termasuk alpha. Pemeriksa tidak menilai semua piksel gambar/lapisan saudara, nilai input native, indikator nonteks/fokus, hover, disabled, atau seluruh state error/dialog; nol temuan bukan kelulusan WCAG. Pemeriksaan pemotongan juga tidak mencakup semua leluhur/overlap. Screenshot simulator/pengguna adalah viewport awal, bukan seluruh halaman; screenshot FAQ merekam keadaan awal dialog. Skip link yang belum difokuskan terukur di luar viewport (bottom terbesar −41,20 CSS px) pada kunjungan zoom; gambar penuh workflow dapat menampilkan elemen fixed di luar viewport aktif sehingga tidak menjadi pengukuran overlap viewport.

Artefak akhir berada dalam direktori yang sama: `zoom-check.mjs` (skrip sekali pakai, bukan CLI proyek), `zoom-report.json`, `zoom-server.log`, dan enam `zoom-*.png`. Semua pengukuran diulang setelah koreksi capture. Pembaca layar nyata, seluruh state, perangkat nyata, serta sisa cakupan CMS tetap mengikuti [AKSESIBILITAS.md](AKSESIBILITAS.md).

Bagian-bagian berikut mempertahankan riwayat sebelum eksekusi browser/zoom di atas, termasuk hambatan sandbox yang kini sudah terlewati. Ringkasan tanpa data akun terdapat pada `final-result.json` di direktori artefak.

## Server Actions catatan — 3 November 2026

Satu regresi menambah cakupan dari fungsi layanan ke `decisionAction` dan `withdrawAction` melalui harness request Next yang sudah ada. Fixture memakai tiga akun sintetis, autentikasi Better Auth dan cookie sesungguhnya pada database uji. Kode produk tidak berubah.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Regresi Server Actions terarah | **1/1 lulus**, exit 0; hasil ini sebelum penegasan pesan penolakan diperketat pada tes yang sama |
| `npm run test:integration` sesudah penegasan diperketat | **38/38 lulus**, exit 0, sekitar 75 detik |
| `npm run typecheck` | **Lulus**, exit 0 |
| TypeScript langsung pada salinan build gagal | **Lulus**, exit 0 dengan `node node_modules/typescript/bin/tsc --noEmit --incremental false` pada `.local/build-check-code-IqnMiD/`, termasuk tipe rute hasil kompilasi sebelumnya |
| Prapemeriksaan browser ulang | Loopback `EPERM`; Chromium gagal pada `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`, SIGTRAP. E2E terbaru tetap belum dijalankan |
| Unit/build lengkap/inspector | Tidak diulang pada penambahan tes ini; hasil unit 18/18 tetap historis, build lengkap terakhir tetap gagal pada subprocess TypeScript |
| Lima dokumen yang diperbarui | **30 tautan lokal valid**, **12 blok Bash lolos sintaks** tanpa dieksekusi |

Tes memeriksa catatan kosong/hanya spasi/lebih dari 2.000 karakter mencapai `fields.note`, catatan berupa berkas dan ID rusak ditolak sebagai formulir tidak sah, penolakan tanpa sesi serta bagi editor/admin, dan penolakan setelah sesi penyetuju dicabut. Snapshot item/revisi/proyeksi pencarian/jumlah audit tetap sama setelah penolakan, termasuk penarikan dengan arsip. Fixture diterbitkan melalui fungsi layanan oleh penyetuju berbeda dari editor; tes ini tidak membuktikan respons sukses atau revalidasi cache dari Server Actions.

Harness menggunakan internal Next versi yang dikunci dan memanggil fungsi action langsung di dalam konteks request; **ini bukan E2E HTTP/browser**, pengujian origin/transport, fokus, pemeliharaan masukan di React, atau pembaca layar. Pemeriksaan TypeScript langsung juga bukan kelulusan build lengkap. Tidak ada perubahan `.env`, database/media/akun pengguna, aturan publikasi, skema, dependensi, atau deployment. Bukti dan pekerjaan browser berikutnya tetap pada bagian di bawah serta [E2E.md](E2E.md).

## Catatan keputusan dan penarikan — 3 November 2026

Kesalahan catatan pengembalian/alasan penarikan kini dikirim sebagai `fields.note` dari layanan bersama. Server Actions memeriksa tipe/identitas, lalu layanan tetap memvalidasi isi dan batas 2.000 karakter. Formulir menghubungkan kesalahan melalui `aria-describedby`, menjaga nama kontrol melalui `aria-labelledby`, menandai `aria-invalid`, serta memfokuskan textarea. Catatan dan pilihan arsip dipertahankan dalam state saat permintaan gagal. Ini melengkapi PRD §11.2/§14/§15.2 tanpa mengubah aturan peran/persetujuan.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Regresi awal catatan sebelum perbaikan | Gagal: `publicError(error).fields` tidak berisi `note` |
| Regresi terarah sesudah perbaikan | **1/1 lulus**, exit 0; kosong, hanya spasi, lebih dari 2.000 karakter, batas tepat 2.000 karakter, dan snapshot tanpa mutasi pada kegagalan |
| `npm run typecheck` | **Lulus**, exit 0 |
| `npm test` | **18/18 lulus**, exit 0 |
| `npm run test:integration` | **37/37 lulus**, exit 0, sekitar 71 detik; database/media sintetis terisolasi |
| `npm run test:e2e -- --list` | **30 kasus** ditemukan; workflow yang ada diperluas, bukan 30 kasus interaktif yang sudah diulang |
| Prapemeriksaan localhost/Chromium | Bind loopback ditolak `EPERM`; Chromium gagal mulai (`Target page, context or browser has been closed`). E2E terbaru, screenshot baru, inspector dan zoom belum dijalankan |
| Build produksi terisolasi | **Gagal**, exit 1 setelah Prisma generate dan kompilasi Next berhasil; `Could not parse output from TypeScript's --showConfig` |
| Diagnosis subprocess pada salinan build | `spawnSync /usr/bin/node EPERM`, stdout kosong; tidak ada penonaktifan pemeriksaan tipe atau pengulangan di luar sandbox |
| Lima dokumen yang diperbarui | **41 tautan lokal valid**, **17 blok Bash lolos sintaks** tanpa dieksekusi |

Regresi snapshot membandingkan rekaman konten, revisi, proyeksi pencarian, dan jumlah audit sebelum/sesudah penolakan, termasuk percobaan penarikan dengan arsip. Workflow browser menambah pemeriksaan keyboard, nama/deskripsi kolom, penanda kesalahan, masukan/pilihan arsip yang bertahan, URL tetap privat/terbit saat validasi gagal, serta koreksi berikutnya. **Perilaku UI tersebut belum diverifikasi melalui browser pada kode terbaru.** Hasil E2E 30/30 dan build lulus yang dicatat pada bagian berikut mendahului lanjutan ini.

Salinan build gagal dipertahankan di `.local/build-check-code-IqnMiD/`; harness memakai URL DB dummy dan tidak menyalin `.env` pengguna. Database/media/akun pengguna, skema, dependensi, CSS, serta aturan publikasi tidak berubah. Peringatan antrean `pg` yang sudah dikenal masih muncul pada integrasi. Tidak ada deployment atau persetujuan UAT/produksi.

Pada host yang mendukung browser/subprocess, ulangi workflow sebelum suite penuh dan build secara berurutan:

```bash
npm run test:e2e -- --grep 'editor dan penyetuju'
npm run test:e2e
PRISMA_SCHEMA_ENGINE_BINARY=/home/asus/Projects/JAFA-HUB/.local/schema-engine \
  node --import tsx tests/operational/build.check.ts
```

Zoom browser nyata 200%, pembaca layar, tinjauan screenshot kesalahan, seluruh state kontras dan sisa cakupan CMS tetap terbuka. Cakupan dan batas ada pada [AKSESIBILITAS.md](AKSESIBILITAS.md) serta [E2E.md](E2E.md).

## Pembuka FAQ pada header — 3 November 2026

Pembuka FAQ fixed menutupi tautan dan kontrol walaupun target sudah difokuskan. Komponen dipindahkan ke header dengan pola tombol ikon yang sudah ada; CSS pembuka fixed dihapus. Header dapat membungkus pada lebar sempit dan memakai identitas ringkas pada lebar menengah. PRD §8.3 mencatat lokasi baru. Dialog native, API jawaban terkurasi, dan layanan CMS tetap memakai pola yang sama.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| Pengukuran sebelum perubahan | Server/data sintetis tetap aktif saat diukur. Tautan JF desktop tertutup 10.508,51 CSS px², kontrol predikat 320 px tertutup 1.241 CSS px², termasuk saat target difokuskan |
| Pengukuran sesudah perubahan | Kedua kasus **0 overlap** sebelum/saat fokus; satu pembuka `static` dalam header |
| `npm run typecheck` | Lulus |
| Discovery E2E | 30 kasus dalam tiga berkas |
| `npm run test:e2e` | **30/30 lulus**, exit 0, sekitar 7,2 menit, Chromium desktop/mobile di luar sandbox, pratinjau mati dan data sintetis terisolasi |
| Kasus baru pembuka FAQ | **2/2 lulus** dalam suite penuh; 320/390/768/1024/1100/1440 CSS px dengan jarak teks, satu pembuka, overflow/overlap tautan/kontrol, fokus, footer, Enter/Escape dan fokus kembali |
| Build produksi terisolasi | **Lulus**, exit 0 sesudah E2E; Prisma generate, kompilasi, TypeScript, pembentukan rute dan optimasi. URL DB dummy; database pengguna tidak dipakai |
| Lint tiga berkas komponen | 0 FAIL/1 WARN; batas tombol topik merupakan affordance kontrol yang dipertahankan |
| Inspector beranda 1440/768/390 | Sebelum 5 FAIL/4 WARN, sesudah 5 FAIL/3 WARN. Lima aturan gaya lama tetap; tidak ada temuan overflow baru yang dilaporkan. Ini bukan kelulusan seluruh gate gaya/WCAG |
| Screenshot | Seluruh fold/lembar inspector sebelum/sesudah, screenshot overlap terarah, dan enam screenshot regresi header dibaca |
| Tujuh dokumen yang diubah | 42 tautan lokal valid dan 16 blok Bash lolos sintaks tanpa dieksekusi |

Dua server pengukuran port 5189 memakai kode/cache serta database/media sintetis terpisah. Keduanya dihentikan dengan exit 0 sebelum suite; server pengguna tidak disentuh. Percobaan ini menyelesaikan batas pengukuran fokus yang sempat timeout pada lanjutan sebelumnya. Angka berasal dari perpotongan bounding rectangle CSS, bukan analisis piksel atau audit aksesibilitas menyeluruh.

Artefak: `.local/faq-header-20261103-oqua_4iz/` dengan laporan overlap sebelum/sesudah, `before-inspect/`, `after-inspect/`, dan `e2e-header/`. Catatan artefak menjelaskan snapshot awal yang belum menampilkan teks hero; gambar inspector/regresi berikutnya menampilkan teks lengkap dan menjadi acuan render stabil. `.last-run.json` akhir `passed`, enam screenshot header tersedia, dan salinan kode uji sesi ini dibersihkan. Arah Loud and flat, palet/font/aset tetap; tidak ada draw ulang. [AKSESIBILITAS.md](AKSESIBILITAS.md) mencatat cakupan serta sisa pemeriksaan, [DESAIN.md](DESAIN.md) memuat kritik dan perbandingan visual.

Unit/integrasi tidak diulang pada perubahan komponen ini; jalur layanan, peran, skema, dependensi, akun/database/media pengguna, `.env`, dan aturan publikasi tidak berubah. Hasil unit/integrasi terdahulu tetap historis. Pembaca layar nyata, zoom browser 200%, kontras/semua state dan sisa cakupan CMS, native/staging, UAT, audit independen, dan kesiapan produksi belum terbukti. Tidak ada deployment.

## Keyboard dan jarak teks — lanjutan 3 November 2026

Perbaikan mengikuti PRD §15.2: Escape menu publik menutup dropdown dahulu dan mengembalikan fokus, Escape menu CMS menutup navigasi dengan fokus kembali ke pembukanya, skip link memfokuskan main publik/CMS, dan tabel aktivitas dashboard memiliki area gulir berlabel serta fokus keyboard. Fixture admin sintetis ditambahkan untuk memeriksa pengguna; editor/penyetuju tetap melakukan publikasi fixture. Tidak ada perubahan layanan, skema, atau peran produksi.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| `npm run typecheck` | Lulus setelah perubahan komponen; build akhir turut memeriksa tipe setelah penyesuaian tes |
| `node --import tsx scripts/e2e-server.ts --check` | Lulus: tiga peran, 29 draf sebelum persetujuan, publikasi fixture oleh dua pengguna berbeda, dan persistensi |
| Discovery E2E | 28 kasus dalam tiga berkas; bukan hasil interaksi |
| Regresi awal mobile sebelum perbaikan | 2/4 lulus, exit 1: dua kasus jarak teks lulus; menu publik kehilangan fokus, skip link CMS tidak memfokuskan main, dan Escape menu CMS belum ditangani |
| Suite penuh pertama setelah perbaikan | 27/28 lulus, exit 1, sekitar 7,1 menit. Delapan kasus aksesibilitas baru lulus; workflow desktop gagal pada assert hasil persetujuan lima detik |
| Pengulangan penuh `npm run test:e2e` | **28/28 lulus**, exit 0, sekitar 7,1 menit; desktop/mobile di luar sandbox, pratinjau mati, data sintetis, tanpa server dev pengguna |
| Build produksi terisolasi | **Lulus**, exit 0 sesudah E2E; Prisma generate, kompilasi, TypeScript, pembentukan rute, dan optimasi dengan URL DB dummy |
| Tinjauan screenshot | Enam gambar jarak teks beranda/simulator/pengguna pada 320/1440 CSS px dibuka. Overlay launcher FAQ tetap ditemukan; rincian di AKSESIBILITAS.md |
| Lima dokumen yang diubah | 33 tautan lokal valid dan 16 blok Bash lolos `bash -n` tanpa dieksekusi |

Trace kegagalan workflow menunjukkan POST persetujuan **200 dalam 4.513 ms**, dengan pesan sukses, status disetujui, dan tautan publik di payload; snapshot UI masih pending saat assert lima detik berakhir. Batas hanya pada assert tautan hasil tersebut diubah menjadi 15 detik untuk pembaruan klien. Timeout seluruh workflow tetap 120 detik dan tidak ada aturan publikasi yang diubah. Pengulangan penuh sesudahnya lulus; ini tidak menyatakan target performa produksi tercapai.

Jarak teks diperiksa pada 15 rute publik/login dan 14 kunjungan CMS pada tiga peran, di masing-masing lebar 320/1440 CSS px. Pengukuran mencari overflow halaman serta pemotongan `hidden/clip` pada elemen teks utama; tidak mengukur setiap leluhur, overlap, atau state. Screenshot memperlihatkan launcher FAQ menutup sebagian tautan JF desktop dan kontrol simulator mobile pada posisi awal viewport. Percobaan pengukuran overlap fokus timeout saat memuat halaman; tidak ada klaim pengukuran fokus/overlay selesai. Rincian dan acuan: [AKSESIBILITAS.md](AKSESIBILITAS.md).

Artefak lokal: `.local/accessibility-navigation-20261103-beapj4ln/`, meliputi trace kegagalan sintetis, laporan ringkas, dan enam screenshot akhir pada `after/`. Trace dapat memuat cookie fixture; tinjau sebelum dibagikan. `.last-run.json` akhir berstatus `passed` dengan daftar kasus gagal kosong. Harness membersihkan salinan kode/cache/data uji setelah proses selesai; data pengembangan dan cadangan tidak dipakai sebagai fixture atau diubah.

Unit/integrasi tidak diulang pada lanjutan UI ini karena jalur layanannya tetap; angka 18/18 dan 36/36 pada bagian sebelumnya adalah hasil terdahulu. Overlay FAQ, pembaca layar nyata, zoom browser 200%, kontras/seluruh state dan sisa alur CMS, performa/native/staging, UAT, audit independen, serta kesiapan produksi masih terbuka. Tidak ada deployment.

## Kelanjutan tahap 3 — 3 November 2026

Perbaikan CMS mengikuti PRD §11.2, §14.2, dan §15.2. State kesalahan pengajuan sebelumnya terpisah dari editor sehingga daftar `fields` tidak ditampilkan pada kolom. Simpan/pengajuan kini berbagi state; kesalahan memiliki nama/deskripsi aksesibel, penanda invalid, dan fokus menuju masalah pertama. Kelompok bidang/sumber dapat menerima fokus saat bermasalah. Masukan dipertahankan saat ditolak dan penanda lama hilang sesudah koreksi disimpan. Tidak ada perubahan validasi server, peran, skema, dependensi, atau aturan publikasi.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| `npm run typecheck` | Lulus |
| `npm test` | **18/18 lulus** |
| `npm run test:integration` | **36/36 lulus**, exit 0, sekitar 78 detik; hasil lengkap berasal dari pengulangan setelah server alat restart memutus proses sebelumnya |
| `npm run test:e2e -- --list` | 20 kasus ditemukan dalam tiga berkas; discovery bukan pengujian interaksi |
| `npm run test:e2e` | **20/20 lulus**, exit 0, sekitar enam menit; Chromium desktop/mobile di luar sandbox dengan server/database sintetis terisolasi dan pratinjau mati |
| Kasus baru pengajuan belum lengkap | **2/2 lulus** dalam suite penuh: desktop 20 detik/mobile 16 detik. Nama dan deskripsi kolom/kelompok, fokus input/kelompok sumber, penolakan tanpa kehilangan masukan, koreksi, penghapusan penanda lama, serta pengajuan berikutnya diperiksa |
| Build produksi terisolasi | **Lulus**, exit 0; Prisma generate, kompilasi Next, TypeScript, pembentukan rute, dan optimasi. Dijalankan setelah E2E melalui `tests/operational/build.check.ts`, dengan `PRISMA_SCHEMA_ENGINE_BINARY` lokal dan URL DB dummy |
| Lima dokumen yang diubah | **31 tautan lokal valid**, **16 blok Bash lolos `bash -n`** tanpa dieksekusi |

Prapemeriksaan dalam sandbox gagal pada bind `127.0.0.1:5184` (`EPERM`) serta startup Chromium (`shutdown: Operation not permitted`, SIGTRAP). Pengulangan E2E dan build melalui eksekusi di luar sandbox benar-benar selesai sebagaimana tabel; tidak ada timeout yang dinaikkan. `.last-run.json` berstatus `passed` dengan daftar kasus gagal kosong. Salinan kode/cache E2E dan build sesi ini dibersihkan oleh harness setelah prosesnya selesai; salinan build gagal dari 26 Oktober tetap dipertahankan.

Semua pemeriksaan memakai data sintetis. `.env`, database pengembangan, media pengguna, dan cadangan lama tidak dibuka sebagai fixture atau diganti; tidak ada akun nyata yang dipakai, publikasi data pengguna, deployment, atau persetujuan UAT. Peringatan antrean query `pg`, warna terminal, pesan `scroll-behavior` Next, serta log `AppError` saat admin dibuka tanpa sesi masih muncul; tes redirect/peran yang terkait lulus.

Bukti ini mencakup skenario yang dijalankan, bukan kesesuaian WCAG menyeluruh. Pembaca layar nyata, zoom browser 200%, text-spacing, seluruh state kontras/fokus, seluruh alur CMS dengan keyboard, metrik performa browser, PostgreSQL native/staging, beban, job backup operasional, audit independen, UAT dan kesiapan produksi masih belum dibuktikan. Rincian aksesibilitas: [AKSESIBILITAS.md](AKSESIBILITAS.md).

## Tahap 2 — kelanjutan 26 Oktober 2026

Kode yang diperiksa: Node.js 22.22.1, Next.js 16.4.3, Prisma 7.10.1, Better Auth 1.7.13, dan PGlite 0.4.1. Pengguna meminta melanjutkan sesi yang sempat dijeda. Better Auth dan larangan keputusan bagi seluruh kontributor sudah dipilih sebelumnya. Semua suite memakai data sintetis; maintenance data lama dipisahkan di bawah. Bukti pada bagian historis tidak dianggap hasil kode terbaru.

| Pemeriksaan | Hasil aktual dan batas |
| --- | --- |
| `npm run typecheck` | Lulus, termasuk pengulangan setelah koreksi salinan workspace |
| `npm test` | **18/18 lulus**; mencakup CLI pemulihan menolak non-TTY sebelum membuka database |
| `npm run test:integration` | **36/36 lulus**, sekitar 97 detik; termasuk lazy-init, migrasi/rollback, Better Auth, pemulihan, semua kontributor, serta backup/restore 15 tabel |
| `node --import tsx scripts/e2e-server.ts --check` | Lulus; migrasi, 29 fixture lewat persetujuan, dua peran, proyeksi, dan persistensi |
| Workflow browser terarah | **2/2 lulus**, desktop sekitar 60 detik/mobile 39 detik; eksekusi di luar sandbox |
| `npm run test:e2e` | **18/18 lulus** pada pengulangan akhir, exit 0, sekitar enam menit; Chromium desktop/mobile, database terisolasi dan pratinjau mati |
| Build produksi terisolasi | **Lulus**, exit 0; Prisma generate, kompilasi Next, TypeScript, pembentukan rute, dan optimasi. URL DB dummy; tidak tersambung database aktif |
| Lifecycle Next versi baru | **Lulus** di luar sandbox: dua startup pada 5196, health/beranda 200, admin 307, penolakan proses kedua/backup, SIGTERM/SIGINT exit 0, serta persistensi seluruh 15 tabel; 29 fixture tetap draf |
| Regresi aksesibilitas terarah | **4/4 lulus**, desktop/mobile; latar dialog inert, Tab/Shift+Tab, Escape, fokus kembali, dan reflow 320/720 CSS px |
| Dokumen | **52 tautan lokal valid**, **29 blok Bash lolos `bash -n`**; prosedur native tidak dieksekusi |

Timeout workflow sebelumnya bukan bukti navigasi publik macet. Trace terakhir menunjukkan pengembalian berhasil, editor reload, lalu `getByLabel(..., { exact: true })` menunggu textarea yang label pembungkusnya memuat teks isi server. Dua locator isi diganti ke peran `textbox` dan nama aksesibel kontrol. Timeout workflow 120 detik dan aturan produk tetap. Suite penuh kemudian membuktikan draf tetap 404/tidak tercari, catatan pengembalian dan perbaikan, publikasi/detail/pencarian, revisi baru tetap privat, serta penarikan.

Build pertama di sandbox berhasil kompilasi tetapi gagal membaca keluaran `tsc --showConfig`. Pengulangan di luar sandbox memberikan kesalahan konkret: salinan kode belum membawa `tests/e2e/accounts.ts`, yang diimpor harness. `createTestWorkspace()` kini ikut menyalin `tests`; build berikutnya lulus tanpa menonaktifkan pemeriksaan tipe. Build terakhir dijalankan dengan:

```bash
PRISMA_SCHEMA_ENGINE_BINARY=/home/asus/Projects/JAFA-HUB/.local/schema-engine \
  node --import tsx tests/operational/build.check.ts
```

Suite 14 kasus lulus sebelum koreksi penyalinan direktori `tests`; helper kemudian diperiksa lewat build terisolasi dan lifecycle Next. Tahap 3 menambah empat kasus aksesibilitas; pengulangan awal menghasilkan 16/18 karena asumsi urutan Tab pada dua tes baru. Tes disesuaikan untuk memeriksa latar inert dan traversal kontrol tanpa mengharuskan lompatan dari kontrol terakhir ke pertama; pengulangan khusus lulus 4/4, lalu **seluruh 18 kasus lulus dalam satu pengulangan akhir**, exit 0. Typecheck terakhir juga lulus. Tidak ada kode produk berubah pada koreksi tersebut. Suite unit/integrasi dan build tidak diulang sesudah penambahan tes karena jalur aplikasi/invariannya tidak berubah.

### Backup dan latihan migrasi data lama

Database sumber tidak dibuka untuk suite. Langkah maintenance terpisah membuat backup offline DB+media melalui helper yang sama, memverifikasi **1.032 berkas**, lalu restore ke tujuan baru. Latihan migrasi pada salinan lulus: 3 akun dan hash asli dipertahankan di `Account`, 30 konten, 30 revisi, 2 proyeksi terbit, 1 media, dan seluruh baris tabel konten tetap sama; 2 pasangan kontributor dipulihkan dari histori yang tersedia. Tiga sesi lama pada snapshot dicabut sesuai rancangan. Audit/migrasi lama tetap ada dengan satu catatan migrasi baru. Migrasi ulang tidak mengubah baris; perbandingan seluruh 15 tabel sesudah tutup/buka ulang sama.

Penerapan ke sumber **berhasil** setelah pemeriksaan akhir. Backup kedua sebelum penerapan mempunyai manifest yang sama dengan backup pertama; seluruh baseline tabel cocok sebelum migrasi. Sumber kini mempunyai 15 tabel, 3 `Account`, serta 2 pasangan kontributor. Seluruh ID/peran/status/hash dan konten dipertahankan, tiga sesi lama dicabut; migrasi ulang serta tutup/buka ulang tidak mengubah hasil. `BETTER_AUTH_SECRET` dibuat secara privat karena sebelumnya belum tersedia; konfigurasi lainnya dipertahankan dan sandi tidak direset.

Pemeriksaan HTTP sumber setelah migrasi memakai salinan kode/cache terpisah pada port 5197, pratinjau dimatikan hanya pada proses pemeriksa: health/beranda/login **200**, admin tanpa sesi **307**, dua URL terbit **200**, dan media terbit **200** dengan checksum sesuai berkas. Server milik pemeriksa dihentikan wajar; seluruh ID/nilai 15 tabel dibandingkan sama sesudahnya. Login akun nyata belum dicoba karena sandi tidak diakses; login/ganti sandi/logout dibuktikan dengan fixture terisolasi. Tidak ada publikasi, reset sandi, atau akun baru pada data pengguna.

Artefak privat: `.local/auth-governance-20261026-9e4ZkY/`. Backup asli tidak dibuka engine; baseline, konfigurasi, serta salinan latihan dapat memuat hash/sesi/data akun. Jangan hapus atau unggah artefak. Laporan `rehearsal-result.json`, `active-result.json`, dan `http-result.json` hanya memuat jumlah/status. Skrip di dalam direktori ini adalah catatan maintenance sekali pakai, bukan CLI umum atau instruksi untuk database lain.

### Inspeksi aksesibilitas lokal

Inspector Chromium memeriksa beranda dan login pada 1440/768/390 piksel; seluruh screenshot dibuka. Tidak ada temuan aturan kontras/overflow pada sampel itu. Inspector beranda tetap melaporkan 5 FAIL gaya/4 WARN, login 0 FAIL/1 WARN komposisi; hasil tersebut tidak diubah menjadi klaim lolos desain atau WCAG. Lint sumber publik 0 FAIL/2 WARN, formulir CMS 0 FAIL/0 WARN. [AKSESIBILITAS.md](AKSESIBILITAS.md) mencatat kritik, artefak, serta batas pembaca layar, zoom browser nyata, dan state lain yang belum diperiksa.

### Batas hasil terbaru

Peringatan antrean `pg`, kombinasi `NO_COLOR`/`FORCE_COLOR`, serta petunjuk Next tentang `scroll-behavior` masih muncul. Request admin tanpa sesi juga mencatat `AppError` di log dev meski redirect/login yang diuji berhasil. Tidak ada kredensial nyata dimasukkan ke suite.

Browser lokal hanya membuktikan skenario yang dijalankan. Aksesibilitas penuh (pembaca layar, zoom, seluruh state kontras), metrik browser, PostgreSQL native/staging, beban 50 pembaca, job backup terenkripsi, latihan pemulihan dengan petugas, audit independen, UAT/persetujuan substansi, deployment, dan kesiapan produksi belum dibuktikan. Pengguna kembali mengonfirmasi hosting/staging belum tersedia dan meminta melanjutkan yang dapat diuji lokal; anggaran langganan tetap Rp0.

## Pemeriksaan historis — 22 Oktober 2026

Lingkungan: Node.js 22.22.1, Next.js 16.2.10, React 19.2.4, Prisma 7.8.0, PGlite 0.4.1 (mesin PostgreSQL 17.5), Chromium melalui Playwright CLI. Versi paket dikunci di `package-lock.json`.

## Hasil yang telah diperiksa

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript `npm run typecheck` | Lulus |
| Unit `npm test` | 11 lulus, termasuk 105 kombinasi simulator dalam satu tes regresi |
| Integrasi `npm run test:integration` | 9 lulus, database terisolasi tanpa data operasional |
| Build `npm run build` | Lulus; semua rute publik, admin, API, sitemap, dan robots terbentuk |
| Impor lokal | 29 materi sebagai draf; impor ulang melewati rekaman yang sudah ada |
| Persistensi lokal | Data bertahan setelah engine ditutup/dibuka; direktori bersarang yang belum ada juga didukung |
| Lint desain publik | 0 FAIL, 4 WARN yang merupakan batas kontrol interaktif |
| Lint desain CMS | 0 FAIL, 0 WARN |
| Screenshot beranda | Dibuka dan diperiksa pada 320, 390, 768, 1440 px |
| Screenshot tambahan | Simulator mobile dan login CMS desktop diperiksa |
| HTTP `/api/health` | 200, `status: ok` |
| HTTP `/api/faq/match` | Jawaban FAQ AK beserta ID revisi dan sumber; isi tidak dibentuk ulang |
| HTTP `/pencarian?q=PMK%20132` | 200 dan hasil pencarian tampil |
| Parameter `q` berulang | 200, nilai pertama ditangani dengan aman |
| HTTP `/admin` tanpa sesi | 307 ke `/admin/login` |
| POST registrasi publik | 403 |
| Halaman/artikel tidak ditemukan | 404 |

Skenario integrasi menguji draf → ajukan → kembalikan → perbaiki → terbit, penyuntingan versi basi, upaya bypass editor/admin, persetujuan sendiri sesudah peran berubah, isolasi draf dari pencarian/detail, rollback saat audit gagal, media bersama setelah penarikan, perlindungan admin terakhir, pencabutan sesi, rate limit, kueri berbahaya, arsip, dan impor berulang.

Pemeriksaan tambahan menemukan dan memperbaiki dua masalah: direktori induk database lokal yang belum ada, serta HTTP 200 pada halaman 404 akibat boundary streaming. Keduanya sudah diperiksa ulang.

## Batas verifikasi

Pada 22 Oktober, suite Playwright berisi 12 kasus untuk desktop/mobile, tetapi runner tidak dapat memulai browser karena pembatasan socket sandbox (`shutdown: Operation not permitted`). **Tidak ada hasil interaksi E2E yang dinyatakan lulus.** Screenshot menggunakan jalur Playwright CLI yang diizinkan; screenshot bukan pengganti uji interaksi. Perubahan harness dan hasil terbaru dicatat di bawah.

Inspector browser otomatis Design Taste juga terhenti oleh `listen EPERM`. Kontras, pembaca layar, fokus keyboard, zoom 200%, metrik performa, dan pengukuran overflow otomatis belum dapat dinyatakan memenuhi WCAG/Core Web Vitals. Pemeriksaan screenshot hanya menunjukkan tampilan visual pada ukuran yang tercantum.

Integrasi menggunakan engine PostgreSQL tertanam dan driver Prisma/pg, bukan PostgreSQL native pada staging. Uji beban PRD, migrasi/deployment di host nyata, bootstrap pada environment produksi, backup/pemulihan staging, serta persetujuan substansi belum dilakukan. Ada peringatan kompatibilitas pg tentang antrean query; pg dikunci pada versi 8.22.0 yang dipakai pada pengujian ini. Tinjau ulang adapter saat menaikkan versi pg.

Pada implementasi awal dan tinjauan 23 Oktober, autentikasi memakai scrypt/sesi database dan Better Auth belum terpasang. Ini catatan historis; keputusan serta implementasi tahap 2 pada bagian terbaru di atas menggantikannya.

## Pemeriksaan historis — 23 Oktober 2026

Pengguna meminta pelaksanaan pekerjaan terbuka melalui tiga subagent, kemudian mengonfirmasi staging PostgreSQL, hosting, dan petugas UAT belum tersedia. Pemeriksaan memakai data sintetis dan database terisolasi; `.local/development-pg` tidak dibuka atau dihapus.

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run typecheck` | Lulus setelah perubahan digabungkan |
| `npm test` | 17 lulus: 11 sebelumnya, 3 regresi keamanan, 3 pengaman skrip beban |
| `npm run test:integration` | 14 lulus: 9 sebelumnya dan 5 regresi autentikasi/sesi/rollback |
| `PRISMA_SCHEMA_ENGINE_BINARY=.local/schema-engine npm run build` | Lulus; kompilasi, TypeScript, pembentukan rute, dan optimasi selesai |
| Self-check `scripts/e2e-server.ts --check` | Lulus: database temporer kosong, migrasi, dua peran, 29 fixture melalui pengajuan/persetujuan, proyeksi dan persistensi |
| Discovery Playwright | Lulus; 14 kasus desktop/mobile termasuk workflow editor dan penyetuju |
| E2E workflow desktop | Terhenti sebelum tes: server gagal mulai; percobaan harness langsung menunjukkan `listen EPERM` pada `127.0.0.1:5184` |
| Prasyarat Chromium | Gagal mulai dengan `shutdown: Operation not permitted` dan SIGTRAP |
| Sarana PostgreSQL native | `psql`, `postgres`, `initdb`, `pg_ctl`, `pg_dump`, `pg_restore`, dan `pgbench` tidak tersedia; launcher Docker Windows tidak mempunyai integrasi WSL aktif |
| `node --import tsx tests/operational/load-fixture.check.ts` | Lulus: 1.000 artikel/500 regulasi/500 FAQ, 2.000 revisi disetujui pengguna berbeda dari pembuat/pengaju; seed ulang ditolak tanpa menambah audit. PGlite in-memory, bukan hasil beban/native |
| Tautan dan sintaks prosedur | Tautan lokal delapan dokumen valid; enam blok Bash operasional lolos `bash -n` tanpa dieksekusi |

Percobaan build pertama berhenti pada worker TypeScript dengan exit 1 tanpa rincian. Pemeriksaan tipe terpisah dan pemeriksa tipe Next langsung lulus; build diulang setelah perubahan tes stabil dan selesai dengan exit 0. Hasil historis di atas bukan hasil pemeriksaan ulang HTTP atau screenshot pada sesi ini.

Regresi keamanan menjalankan fungsi autentikasi, handler auth, dan `cookies()` melalui request store internal Next yang versinya dikunci. Cakupannya meliputi profil scrypt baru/hash lama, origin dan header IP, batas login serta pemulihan interval, cookie produksi, expiry/logout/nonaktif/peran, penolakan registrasi, upgrade hash, serta rollback ketika pembuatan sesi gagal. Ini bukan interaksi HTTP/browser dan bukan audit independen. Rincian serta batas keputusan produksi ada di [KEAMANAN.md](KEAMANAN.md).

Harness E2E kini membuat database/media temporer sendiri, mematikan pratinjau, menolak `PLAYWRIGHT_BASE_URL`, dan tidak memakai ulang server dev. Fixture diterbitkan melalui editor/penyetuju sintetis yang berbeda; materi pengembangan tetap draf. Direktori temporer dibersihkan setelah self-check dan server gagal mulai. [E2E.md](E2E.md) mencatat cakupan dan perintah. **14 kasus ditemukan runner; belum ada kelulusan E2E interaktif.**

Skrip `scripts/seed-load.ts` dan `scripts/load-public.ts` menyiapkan dataset 1.000 artikel/500 regulasi/500 FAQ serta 50 pembaca selama 300 detik. Pengaman target, ambang P95 <1.000 ms/gagal <1%, dan penolakan redirect diuji. **Uji beban HTTP/PostgreSQL native serta backup/restore belum dilaksanakan.** Prosedur cluster baru, snapshot DB/media, checksum, restore ke database baru, dan pemeriksaan aplikasi tersedia di [OPERASIONAL.md](OPERASIONAL.md).

Self-check penuh dataset menguji 6.000 transaksi workflow pada PGlite di memori dan tidak termasuk suite unit/integrasi standar. Percobaan awal mencapai 2.000 publikasi, lalu assertion pemeriksa keliru mengasumsikan urutan alfabet enum; pemeriksa diperbaiki menggunakan pemetaan jenis/jumlah dan pengulangan lengkap lulus. CLI seed yang diarahkan ke database bernama `production` serta runner beban yang diarahkan ke origin HTTPS eksternal juga ditolak dengan exit 1 sebelum koneksi. Tidak ada hasil throughput/latensi yang disimpulkan dari self-check ini.

[UAT.md](UAT.md) menyiapkan 12 skenario, lima lembar peserta, kriteria 80%, serta matriks persetujuan materi/kebijakan. [KESIAPAN-RILIS.md](KESIAPAN-RILIS.md) mencatat pemilik keputusan yang belum ditetapkan dan bukti yang masih wajib. Penyusunan dokumen ini tidak memberikan persetujuan UAT, substansi, keamanan independen, atau produksi.

## Pemulihan database lokal — 26 Oktober 2026

Pengguna meminta pemulihan database lama setelah `npm run dev` berhenti dengan `RuntimeError: Aborted()`. Database aktif tetap menggunakan `.local/development-pg`; `.env`, dependensi, dan kode aplikasi tidak diganti. Tidak ada pengisian ulang database aktif dari fixture kosong.

Analisis berkas menemukan CRC32C `pg_control` valid, dengan state shutdown dan pointer checkpoint `0/150D2D8`; lokasi tersebut bukan lagi checkpoint valid dalam WAL. Identitas cluster pada WAL cocok dengan `pg_control`. Checkpoint shutdown valid terakhir yang ditemukan berada di `0/150C2B0`. Rangkaian 433 catatan mulai dari checkpoint ini hingga `0/151DC78` mempunyai CRC dan hubungan `xl_prev` yang valid, termasuk record yang melintasi batas halaman. Counter transaksi di control tertinggal dari WAL (next XID 776, maksimum XID tercatat 832). Ini membuktikan ketidakselarasan metadata dan WAL; belum membuktikan proses atau peristiwa yang menyebabkannya.

Cadangan 1.031 berkas (40.100.147 byte) dibuat dan seluruh SHA-256 dibandingkan dengan sumber. Pada salinan kerja saja, referensi dan salinan checkpoint diperbaiki ke checkpoint valid, state diubah agar engine menjalankan crash recovery, dan CRC control dihitung ulang. PGlite memutar ulang WAL dari `0/150C328` sampai `0/151DC78` dan selesai tanpa PANIC. Pesan panjang record nol pada `0/151DCA0` menandai ujung WAL yang belum terisi. Tidak dilakukan reset/penghapusan WAL. Hasil baru dipasang setelah pemeriksaan salinan dan pengecekan bahwa database sumber masih sama dengan cadangan.

| Pemeriksaan | Hasil aktual |
| --- | --- |
| Pembacaan penuh 12 tabel dan ekspor privat | Lulus; seluruh baris terbaca |
| Jumlah data pulih | 30 konten, 30 revisi (28 draf/2 disetujui), 3 akun, 45 audit, 2 sesi, 1 media, 2 proyeksi publikasi, 33 relasi profesi, 34 sumber, 1 relasi media, 6 rate limit, dan 1 migrasi |
| Foreign key | 8 diperiksa langsung; tidak ditemukan referensi yatim |
| Workflow | Revisi terbit sesuai item/status, proyeksi sesuai publikasi, publikasi memiliki proyeksi, dan persetujuan sendiri tidak ditemukan |
| Payload dan media | 30 payload lolos skema; berkas media tersedia, ukuran/dimensi/format dan SHA-256 diperiksa |
| Latihan restore logis lokal | Migrasi ke database uji terpisah, impor seluruh baris dengan ID/nilai asli, lalu perbandingan seluruh tabel lulus; constraint diterapkan saat restore |
| Persistensi | Perbandingan seluruh baris setelah buka ulang salinan dan setelah server memakai database aktif lulus |
| `npm run dev -- --port 5174` | Lulus; Next.js mencapai `Ready`, penyiapan database melewati 29 materi awal tanpa menimpa data |
| `npm run dev` tanpa argumen | Lulus; Next.js mencapai `Ready` pada port 3000, health `200/status: ok` |
| HTTP `/api/health` | `200`, `{"status":"ok"}` |
| HTTP `/` | `200`, HTML Jafa Hub terbaca |
| HTTP `/admin` tanpa sesi | `307` ke `/admin/login` |
| HTTP media yang dirujuk revisi terbit | `200`, SHA-256 respons sama dengan media pulih |
| `npm run setup:local` setelah server dihentikan | Lulus; 0 impor, 29 dilewati |

Permintaan HTTP dari sandbox biasa sempat ditolak `EPERM`; pemeriksaan HTTP di atas kemudian dijalankan melalui eksekusi lokal yang diizinkan dan benar-benar menerima respons server. Server verifikasi dihentikan sebelum membuka database dalam proses pemeriksa lain. Hasil HTTP ini bukan pengujian browser/login atau kelulusan E2E.

Artefak privat berada di `.local/recovery-20261026-0p886W/`: snapshot sumber yang belum dibuka (`original/`), direktori rusak sebelum penggantian (`damaged-active/`), manifest SHA-256, log recovery, ekspor logis, salinan media, dan hasil pemeriksaan. Jangan menghapus atau mengunggah direktori ini; ekspor mengandung data akun/sesi. Skrip di dalamnya adalah catatan prosedur sekali pakai, bukan perintah pemulihan otomatis untuk kasus lain.

Tidak ada baseline inventaris sebelum insiden, sehingga hasil ini tidak membuktikan bahwa setiap transaksi historis sebelum kerusakan terselamatkan. Pemicu awal belum pasti; aturan satu proses PGlite tetap berlaku. Tidak ada perubahan peran/sandi atau publikasi tambahan. Suite unit/integrasi, typecheck, build, dan E2E tidak diulang karena kode aplikasi tidak diubah. Batas produksi dan UAT terdahulu tetap berlaku.

Rujukan format dan recovery: [struktur control PostgreSQL 17](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/include/catalog/pg_control.h), [kode crash recovery PostgreSQL 17](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/access/transam/xlogrecovery.c). Reset WAL merupakan langkah terakhir yang dapat meninggalkan inkonsistensi menurut [dokumentasi PostgreSQL](https://www.postgresql.org/docs/17/app-pgresetwal.html); langkah itu tidak diperlukan pada pemulihan ini.

## Keandalan data lokal — 26 Oktober 2026

Pengguna meminta melanjutkan pengembangan dari catatan serah-terima. Tahap 1 menambahkan penguncian PGlite persisten, penutupan pemilik, serta backup/restore database dan media lokal. `.local/development-pg`, cadangan pemulihan lama, dan `.env` tidak diubah/dibuka sebagai database uji; semua fixture memakai direktori temporer sistem. Tidak ada dependensi baru, migrasi skema, perubahan autentikasi, atau perubahan aturan publikasi.

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm test` | Lulus, 17 tes unit |
| `npm run test:integration` | Lulus, 27 tes: 14 semula, 9 kunci/lifecycle, 4 backup/restore |
| `npm run typecheck` | Lulus setelah penambahan tes CLI dan perbaikan tipe environment fixture |
| `PRISMA_SCHEMA_ENGINE_BINARY=.local/schema-engine npm run build` | Build akhir lulus: kompilasi, pemeriksaan tipe, pembentukan seluruh rute, dan optimasi |
| Dokumen yang diubah | 25 tautan lokal valid; 22 blok Bash lolos `bash -n` tanpa dieksekusi |
| Persaingan dua proses | Satu engine terbuka; proses kedua ditolak sebelum membuka engine dan tidak mengubah token kunci aktif |
| Alias dan identitas kunci | Symlink ke direktori yang sama memakai kunci sama; timestamp lama tidak mengalahkan PID hidup; metadata tak dikenal/lintas host atau namespace ditolak tanpa dihapus |
| Inisialisasi gagal | Mock `PGlite.create()` menolak setelah kunci diambil; kunci dilepas dan berkas sumber tetap ada. Bukan percobaan recovery database rusak |
| `SIGINT`, `SIGTERM`, akhir proses normal | Proses Node pemilik menutup pool/engine, keluar 0, dan melepas kunci; restart membaca nilai yang sama. Penutupan berulang serta pelepasan listener sebelum membuka ulang juga diperiksa |
| `SIGKILL` dan pengambilan kunci mati | Pemilik fixture benar-benar dibunuh; tiga proses bersaing mengambil kunci lama pada namespace sama, hanya satu berhasil; nilai yang sudah tersimpan tetap terbaca |
| Backup/restore data aplikasi | Salinan fisik PGlite terpisah berhasil dibuka. Seluruh ID/nilai baris pada 12 tabel dibandingkan sama, mencakup akun/sesi, versi terbit/draf, sumber/profesi, media bersama, proyeksi pencarian, audit, rate limit, dan migrasi; byte media juga sama |
| Batas snapshot/CLI | Database aktif, tujuan sudah ada/bertumpuk/alias, symlink/berkas khusus, serta checksum berubah/berkas tambahan ditolak. Instalasi tanpa media dan CLI backup/restore berhasil; CLI produksi keluar 1 sebelum membuat tujuan |
| `npm run dev -- --port 5196` dengan DB/media temporer | Setup mengimpor 29 draf, lalu server gagal membuka port: `listen EPERM` pada `0.0.0.0:5196`. Tidak mencapai `Ready`; tidak ada hasil HTTP/siklus hidup Next yang dinyatakan lulus |

Penguncian berada di `src/lib/local-db-lock.ts`; direktori calon yang sudah berisi token dipublikasikan atomik agar pembersihan token pemilik lama tidak dapat menghapus direktori pemilik baru yang berisi token berbeda. Pembukaan/penutupan dipusatkan di `src/lib/local-db.ts`; pemanggil langsung engine persisten berpindah ke `local.close()`. Launcher dan harness mengatur sinyal manual worker serta batas tunggu CLI 30 detik. Kebijakan produksi tetap menolak singleton PGlite dan memakai PostgreSQL native.

Pemeriksaan namespace mencatat identitas `/proc/self/ns/pid` berbeda antarperintah sandbox. Penolakan identitas asing diuji dengan mengganti metadata fixture, tanpa membuka engine lain dari namespace asing. Kunci hanya direklamasi otomatis jika identitas sama dan `kill(pid, 0)` menghasilkan `ESRCH`; izin yang ditolak, PID yang digunakan ulang oleh proses hidup, atau identitas tidak dikenal tetap memblokir secara konservatif. Ini bukan kunci lintas host, dan program yang membuka PGlite langsung tanpa helper tetap dapat melewati protokol.

Tes lifecycle memakai proses Node tersendiri yang menjalankan helper database, bukan worker server Next yang melayani HTTP. Percobaan otomatis launcher dengan stdout/stderr dipipa sempat keluar 1 tanpa rincian; percobaan langsung `npm run dev` dengan terminal kemudian memberikan bukti `listen EPERM` di atas. Proses pengujian sudah keluar, tidak ada kunci tersisa pada fixture startup, dan direktori tersebut dibersihkan. Batas sandbox tidak diatasi dengan membuka database aktif atau mengubah hak akses host.

Percobaan awal restore menemukan `cp` menolak direktori tujuan `pg/` yang sudah dibuat untuk penguncian; penyalinan diperbaiki per entri ke direktori baru yang tetap terkunci. Regresi CLI kemudian diubah agar memeriksa artefak dan exit code, karena keluaran subprocess yang dipipa tidak terbaca pada lingkungan ini. Typecheck menemukan inferensi `NODE_ENV` terlalu luas pada fixture; tipe input proses ditetapkan dan pengulangan typecheck lulus. Hasil suite final di atas berasal dari pengulangan lengkap setelah koreksi tersebut. Peringatan antrean query `pg` yang sudah dicatat sebelumnya tetap muncul.

Prosedur dapat diulang melalui [DATA-LOKAL.md](DATA-LOKAL.md). Backup lokal belum dienkripsi/terjadwal dan salinan pada disk yang sama bukan cadangan terhadap kerusakan perangkat. Uji `SIGKILL` ini hanya membuktikan fixture yang dijalankan; tidak menjamin transaksi yang belum selesai selamat atau membuktikan penyebab insiden lama. Belum ada HTTP baru, E2E, UAT, aksesibilitas lengkap, beban native, pemulihan staging, atau bukti kesiapan produksi.

## Pengulangan port dan worker Next — 26 Oktober 2026

Pengguna meminta mengulang pengujian setelah mengubah izin. Self-check `tests/operational/local-dev.check.ts` ditambahkan agar perintah yang dimintakan izin konkret dan dapat diulang. Kode aplikasi, autentikasi, workflow publikasi, database pengembangan, dan `.env` asli tidak diubah.

| Pemeriksaan | Hasil aktual |
| --- | --- |
| Bind `0.0.0.0:5196` dalam sandbox biasa | Tetap ditolak `listen EPERM`; belum ada fixture database yang dibuat saat prapemeriksaan ini gagal |
| Perintah self-check di luar sandbox dengan persetujuan | Bind port 5196 berhasil |
| Isolasi cache | Percobaan awal ditolak karena dev port 3000 memakai `.next` proyek. Pengulangan memakai salinan kode/cache unik dalam `.local/port-check-code-*`, dependensi terpasang melalui symlink, serta DB/media temporer sistem |
| Startup Next | Dua kali mencapai `Ready`, memakai launcher `scripts/dev.ts` pada salinan dengan mode pratinjau mati |
| HTTP `/api/health` | Dua siklus: 200, `{"status":"ok"}` |
| HTTP `/` | Dua siklus: 200, HTML Jafa Hub terbaca |
| HTTP `/admin` tanpa sesi | Dua siklus: 307 ke `/admin/login` |
| Proses kedua dan backup ketika engine aktif | Ditolak oleh kunci pemilik; direktori backup tujuan tidak dibuat |
| SIGTERM dan SIGINT | Masing-masing mengakhiri launcher dengan exit 0; kunci database telah terlepas sebelum pemeriksa membuka engine |
| Persistensi saat restart | Digest seluruh ID/nilai baris pada 12 tabel sama setelah dua siklus; 29 konten/revisi tetap draf, tidak diterbitkan |
| Cleanup berhasil | Server uji telah berhenti; direktori data dan salinan kode/cache pengulangan yang berhasil dibersihkan oleh self-check |
| `npm run typecheck` | Lulus setelah penambahan self-check dan isolasi salinan kode/cache |
| Dokumen dan cleanup salinan | 25 tautan lokal valid; 24 blok Bash lolos `bash -n` tanpa dieksekusi; dependensi asli tersedia dan tidak ada salinan `.local/port-check-code-*` tersisa |

Perintah yang benar-benar lulus melalui eksekusi di luar sandbox:

```bash
node --import tsx tests/operational/local-dev.check.ts
```

Server lain yang dilaporkan Next pada port 3000 tidak dihentikan oleh pengujian ini. Fixture percobaan pertama yang berbenturan dengan cache dipertahankan pada `/tmp/jafa-local-dev-check-IqiOQI` untuk pemeriksaan; isinya database uji sintetis, bukan salinan akun/data pengguna. Salinan kode pengulangan tidak membawa `.env` asli dan hanya mengubah root Turbopack pada config salinan untuk akses dependensi, sehingga pengujian tetap memakai kode launcher/aplikasi proyek.

Log dev mengeluarkan `AppError` 401 dari pemeriksaan sesi saat `/admin` dibaca tanpa cookie; respons HTTP yang diperiksa tetap 307 menuju login. Tidak dilakukan login browser. Unit/integrasi/build tidak diulang pada pengujian port ini; hasil sesi pengembangan sebelumnya tetap dipertahankan sebagai hasil historis.

Persetujuan menyelesaikan kebutuhan eksekusi self-check di luar sandbox; sandbox biasa tetap membatasi bind. Bukti ini mencakup HTTP dan lifecycle lokal, bukan E2E browser, UAT, aksesibilitas penuh, PostgreSQL native/staging, beban, atau kesiapan produksi. Harness Playwright masih berbagi `.next` proyek dan belum diulang selama dev lain aktif.

## Mengulang pemeriksaan

```bash
npm run typecheck
npm test
npm run test:integration
npm run build
```

Regresi data lokal dapat dijalankan tersendiri tanpa port/browser:

```bash
node --import tsx --test --experimental-test-isolation=none tests/integration/local-db.test.ts tests/integration/local-backup.test.ts
```

Periksa persiapan database E2E tanpa browser dan temukan kasus:

```bash
node --import tsx scripts/e2e-server.ts --check
npm run test:e2e -- --list
```

Untuk memeriksa seluruh dataset beban di PGlite memori tanpa server/native, jalankan pemeriksaan terpisah berikut. Pemeriksaan 6.000 transaksi ini lebih lama daripada suite standar:

```bash
node --import tsx tests/operational/load-fixture.check.ts
```

Jalankan seluruh suite pada host yang mengizinkan Chromium dan socket localhost:

```bash
npm run test:e2e
# Jika port bawaan 5184 dipakai:
PLAYWRIGHT_PORT=5185 npm run test:e2e
```

Harness terbaru membuat salinan kode/cache unik; untuk build selama dev aktif, gunakan pemeriksa build terisolasi di atas. Jalankan E2E dan build berurutan agar pemakaian sumber daya serta hasil jelas. Suite memakai server/database sendiri dan menolak `PLAYWRIGHT_BASE_URL`. Jangan menjalankan bootstrap/impor sebagai proses terpisah ketika database pengembangan lokal sedang dibuka server dev.
