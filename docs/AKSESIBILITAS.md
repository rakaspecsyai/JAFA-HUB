# Pemeriksaan aksesibilitas lokal

## Kolom tautan FAQ — 10 November 2026

Kolom tautan FAQ kini mempertahankan spasi/baris baru selama pengetikan. Penolakan URL terkait ke kolom melalui nama eksplisit, `aria-invalid`, petunjuk dan error dalam `aria-describedby`; fokus menuju textarea, sedangkan masukan tetap tersedia. Kesalahan tautan tidak lagi menimpa kesalahan jawaban di server.

Baseline browser **0/2**, lalu kedua regresi lulus dalam **52/52 E2E**. Dua screenshot akhir pada 320/1440 CSS px dengan jarak teks diperbesar dan reduced-motion ditinjau: kolom, outline, petunjuk dan error terlihat. Ini bukan zoom tab 200%, pengukuran kontras baru atau pengumuman pembaca layar/perangkat nyata. Metode serta batas ada di [VERIFICATION.md](VERIFICATION.md); artefak privat `.local/faq-links-20261110-5o35grau/`. Variasi CMS lain dan exception development tetap terbuka.

## Keputusan CMS dan variasi gambar — 9 November 2026

Textarea alasan penarikan sebelumnya hanya terlihat sebagian ketika menerima Tab setelah panel dibuka, termasuk sesudah gulir ditunggu. Pemusatan saat fokus memperbaiki tiga varian yang gagal tanpa mengubah ukuran/layout, catatan, arsip atau layanan. Pelepasan gambar juga memulihkan fokus ke input berkas dan membersihkan error percobaan penggantian, dengan alt/kredit tetap.

Empat alur artikel pada zoom tab asli 200% menggabungkan lebar **720/320 CSS px** dan jarak teks normal/diperbesar (line-height 1,5, letter-spacing 0,12em, word-spacing 0,16em, margin paragraf 2em). Run final **52 state/24 screenshot lulus**, exit 0/server exit 0: minimum 1.444 sampel teks **5,35:1**, 72 batas kontrol **3,48:1**, 40 fokus **5,47:1**; nol overflow/clipping pada cakupan yang diperiksa. Sebanyak 24 border dan 40 outline cocok dengan piksel CSS. Sampler final menunggu pergantian UI dan memakai visibilitas native agar panel tertutup tidak ikut dihitung; checkbox native tidak dinyatakan lolos seluruh glyph/border.

Semua 24 screenshot zoom, enam capture variasi media dan dua capture keyboard E2E akhir dibaca. Kontrol penarikan dan outline terlihat utuh; teks panjang di bawah fold tetap mengikuti alur halaman dan dijangkau dengan gulir. Penolakan media/sesi tidak menghapus masukan, dan login tab lain mempertahankan draf. **50/50 E2E serta build produksi terisolasi lulus**, dengan typecheck/lint lulus. Metode, baseline dan batas ada di [VERIFICATION.md](VERIFICATION.md); artefak privat `.local/cms-variants-20261109-xj_1_zlc/`.

Bukan pembaca layar/perangkat nyata, semua jenis/state CMS, semua hover/lapisan foto/native glyph atau audit WCAG menyeluruh. Pengujian ini memakai emulasi reduced-motion; isu instrumentasi development sebelumnya tetap tercatat. Tidak ada perubahan desain atau deployment.

## Zoom aktual dan pemulihan unggahan — 9 November 2026

Zoom tab asli 200% kini telah diperiksa pada akun/ganti sandi/FAQ/unggahan, termasuk memproses, gagal, berhasil, reset, jawaban, pilihan dan fallback. Chrome 149.0.7827.55 memakai Tabs API faktor 2; ukuran fisik 1440×913/640×913 menjadi 720×456/320×456 CSS px, DPR 1→2 dan `visualViewport.scale=1`. Run akhir **lulus, exit 0**, server exit 0: **76 state dan 32 screenshot ditinjau**. Ini jarak teks CSS aplikasi, bukan pengujian perangkat nyata atau text-spacing tambahan.

Margin gulir `10px` pada pesan CMS memperbaiki outline hasil akun yang sebelumnya terpotong viewport. Pemulihan unggahan memberi nama/petunjuk/error terkait input, mengizinkan pemilihan ulang berkas sama, menempatkan error dekat kontrol dan mengembalikan fokus setelah gagal maupun berhasil. Draf/gambar/atribusi bertahan setelah simpan/reload dan tampil pada pratinjau. **Suite penuh 48/48 serta build terisolasi sesudahnya lulus**. Regresi awal, satu perbaikan locator transisi CMS tanpa perubahan timeout dan batas mengikuti [VERIFICATION.md](VERIFICATION.md).

Minimum 1.972 sampel teks aktif **5,35:1**, 720 batas/ikon kontrol **3,20:1**, dan 58 fokus **5,04:1**. Sebanyak 42 sampel border dan 58 outline cocok dengan piksel CSS; tidak ditemukan overflow dokumen, clipping teks yang diperiksa atau outline di luar viewport/leluhur yang diperiksa. Label `sr-only` sengaja disembunyikan; pengukuran akhir menunggu font dan dua frame agar style sesuai render. Dua puluh empat pengukuran tertunda berasal dari select nonaktif, bukan kontrol aktif yang dinyatakan lulus.

Desain tetap, tanpa draw/redraw. Chip exception development `Performance.measure` terlihat pada sebagian capture sandi dan dicatat sebagai batas; bukan klaim semua lapisan overlay telah diperiksa. Pembaca layar, perangkat nyata, semua hover/glyph native/foto, sisa detail CMS/keputusan dan audit WCAG lengkap masih terbuka. Artefak privat: `.local/states-zoom-20261109-uyelbzyp/`.

## Kontras CSS dan outline FAQ — 9 November 2026

Pemeriksaan dilanjutkan ke akun/ganti sandi/FAQ sesuai PRD §15.2. Bind port ditolak `EPERM` dan Chromium berhenti dengan SIGTRAP, sehingga belum ada zoom, screenshot atau E2E baru. Dua screenshot historis percakapan 4 November dibaca ulang: sisi outline area gulir terpotong. Hasil CSS terbaru masih memerlukan tinjauan visual.

Empat deklarasi CSS memperbaiki batas topik FAQ menggunakan `--muted`, fokus ikon header serta reset/tutup menggunakan `currentColor`, dan posisi outline region dengan offset `-3px`. Ikon bersama juga dipakai pembuka pencarian/menu dan tutup pencarian. Ukuran dan desain tetap. Dari 44 pasangan **deklarasi CSS**, lima pasangan baseline di bawah 3:1 menjadi **nol**; minimum teks **5,35:1**, batas/fokus **3,20:1**. Batas topik minimum **4,91:1** terhadap warna hover dan fokus ikon pada biru tua **14,47:1**. Offset baru menempatkan outline di dalam region menurut CSS, belum menurut pengukuran browser.

Sintaks skrip, lint dua CSS **0 FAIL/0 WARN**, typecheck proyek serta salinan build lulus. Build terisolasi hanya mencapai kompilasi; tahap TypeScript `--showConfig` gagal karena subprocess `EPERM`. Tidak ada pemeriksaan yang dimatikan. Ini bukan pengukuran rendered state atau kelulusan WCAG; artefak, metode serta batas ada di [VERIFICATION.md](VERIFICATION.md). Urutan berikutnya tetap zoom aktual 200% akun/ganti sandi/FAQ, termasuk pending/error/berhasil/jawaban/reset serta verifikasi fokus dan outline setelah perubahan ini.

## Zoom asli 200% dan kontras formulir profil/regulasi — 6 November 2026

Chrome 149.0.7827.55 memakai profil/ekstensi sementara dan Tabs API untuk mengatur serta membaca faktor zoom 2. Ukuran fisik 1440×913 dan 640×913 menjadi 720×456 dan 320×456 CSS px, DPR berubah 1→2, `visualViewport.scale` tetap 1. Ini zoom tab asli, dengan jarak teks CSS aplikasi; bukan penggantian viewport saja atau pengujian perangkat mobile nyata.

Empat alur mengukur **28 state**: fokus input sumber, fokus keyboard tombol sekunder, pending simpan, simpan berhasil, error wajib, error daftar/URL dan pengajuan berhasil. Koreksi melalui layanan nyata juga tercapai. Pending memakai respons Server Action yang ditahan browser, bukan respons sukses buatan. Overflow dokumen, teks label/pesan yang terpotong dan outline fokus di luar viewport tidak ditemukan. Empat screenshot error baseline dan semua **20 screenshot akhir** dibaca; pesan serta outline tetap terbaca. Input URL panjang menggunakan gulir native di dalam kontrol.

Border input di panel sumber semula **2,96:1**, sedangkan tombol sekunder **2,28:1**. Dua nilai border menjadi `#7b8ba0`. Pada pengulangan yang **lulus, exit 0**, rasio minimum 901 sampel teks aktif adalah **5,80:1**, 358 batas kontrol relevan **3,20:1**, dan 24 fokus **5,04:1**. Sampel piksel mengonfirmasi 16 border dan 24 outline. Tombol teks bergaris bawah tanpa border diperiksa melalui teks; kontrol nonaktif dicatat sebagai pengecualian, bukan dinyatakan memenuhi ambang aktif. Lint dua CSS dan build produksi terisolasi sesudahnya lulus. Hasil penuh serta metodologi ada di [VERIFICATION.md](VERIFICATION.md).

Gaya Framed sheet yang sudah ada dipertahankan; tidak ada draw/redraw. Tinjauan visual mengikuti state yang diminta: pada lebar kecil menu terlipat, pesan membungkus, serta aksi dan fokus tetap dapat ditemukan melalui scroll. Angka ini hanya sampel formulir/pesan yang dipilih. Pembaca layar, hover pointer, seluruh indikator native, pembesaran text-spacing baru, state akun/ganti sandi/FAQ, perangkat nyata dan kelulusan WCAG menyeluruh masih tersisa. Artefak privat: `.local/forms-zoom-20261106-b9i20a6i/`; log, batas dan kegagalan skrip awal dicatat di VERIFICATION.md.

## Validasi CMS dan interaksi sebelum hidrasi — 6 November 2026

Kesalahan pengajuan profil sekarang terkait langsung dengan definisi, kategori, jenjang, tugas, kompetensi dan nomenklatur; regulasi dengan nomor, tahun, penerbit, URL resmi dan catatan status. Textarea daftar memakai nama eksplisit serta menghubungkan petunjuk satu entri per baris dan pesan kesalahan melalui `aria-describedby`. Penanda/fokus mengikuti pola formulir yang sudah ada, dengan syarat kelengkapan yang sama.

**Typecheck, 18/18 unit, 45/45 integrasi dan 4/4 browser terarah lulus**. Dua skenario desktop/mobile memeriksa nama/deskripsi/penanda seluruh kolom tersebut, fokus definisi/jenjang dan nomor/URL, input yang bertahan, koreksi serta pengajuan berikutnya. Baris kosong di akhir jenjang dan URL HTTPS nonresmi tetap tersimpan saat pengajuan ditolak. Pengukuran viewport penuh pada jenjang/URL dan overflow horizontal lulus pada 320/1440 CSS px dengan jarak teks diperbesar. Delapan screenshot terarah dibaca: pesan dan outline fokus terlihat; artefak privat di `.local/cms-fields-20261106-4b9zs6y4/targeted-browser/`.

Suite penuh pertama **35/42 lulus**; tujuh kegagalan mengungkap interaksi sebelum handler siap, termasuk masukan editor yang hilang. Regresi dengan skrip klien ditahan **0/4 lulus** sebelum perbaikan. Pembuka pencarian/menu/FAQ dan kontrol editor kini menunggu mount komponen sebelum aktif; pemeriksaan keyboard menunggu status enabled sebelum fokus. Regresi sesudah perbaikan **4/4 lulus**, termasuk persistensi judul/slug/ringkasan sesudah reload. **Suite penuh terbaru 46/46 serta build terisolasi sesudahnya lulus**. Delapan screenshot profil/regulasi pada `final-e2e/` juga dibaca; pesan dan outline fokus terlihat pada kedua viewport. Hasil serta batas mengikuti [VERIFICATION.md](VERIFICATION.md). Pemeriksaan Chromium ini tidak membuktikan pengumuman pembaca layar nyata, zoom tab 200% baru, semua state kontras, seluruh alur CMS/FAQ/unggahan, kesiapan semua komponen klien, perangkat nyata atau kelulusan WCAG/UAT.

## Fokus hasil konten CMS — 4 November 2026

Hasil tindakan konten sekarang ditampilkan dalam area CMS yang bertahan ketika formulir terkunci, dilepas, atau berganti revisi/rute. Pesan hanya berasal dari keberhasilan Server Action, bukan parameter URL atau penyimpanan browser. Fokus menuju status dengan `tabIndex=-1`; pesan lama dibersihkan saat tindakan baru atau navigasi, dan hasil yang selesai setelah pengguna meninggalkan rute diabaikan. Kesalahan tetap berada pada formulir dan memfokuskan kolom bermasalah.

Regresi awal **0/2 lulus**, dengan delapan kegagalan fokus pada masing-masing desktop/mobile. Sesudah perbaikan dan koreksi satu locator H1/H3, **4/4 terarah, 38/38 E2E dan typecheck lulus**. Tab/Shift+Tab serta navigasi/Back memeriksa urutan fokus dan penghapusan pesan lama. Tinjauan delapan screenshot awal menemukan beberapa capture draf baru/penarikan tanpa pesan terlihat walaupun DOM fokus. Tes diperluas dengan assert viewport rasio 1 pada seluruh delapan status per proyek: **2/2 workflow tambahan lulus**, exit 0, tanpa perubahan kode produk/timeout atau jeda tetap. Delapan screenshot akhir dari `viewport/` dibaca pada 320/1440 CSS px; pesan dan outline fokus terlihat. **Build terisolasi sesudahnya lulus**. Hasil dan artefak mengikuti [VERIFICATION.md](VERIFICATION.md). Cakupan workflow menggunakan artikel pada komponen bersama; pembaca layar nyata, seluruh jenis/state CMS, zoom/kontras, perangkat nyata dan audit aksesibilitas menyeluruh tetap tersisa.

## Fokus hasil akun — 4 November 2026

Pesan hasil buat akun, simpan akses, reset sandi dan aktivasi ulang kini menerima fokus dalam formulir yang sesuai setelah server mengonfirmasi keberhasilan. `tabIndex=-1` pada pesan memungkinkan fokus programatis tanpa menambah perhentian Tab; kesalahan tetap memfokuskan kolom bermasalah.

Regresi awal **0/4 lulus**, kemudian pengulangan terarah **4/4 lulus** pada desktop/mobile; typecheck lulus. Shift+Tab dari hasil kembali ke tombol buat/reset yang benar, termasuk sesudah kontrol akses dipasang ulang. Empat screenshot berhasil dibaca pada 320/1440 CSS px: outline fokus terlihat, sandi sementara pembuatan dimasking. Screenshot pembuatan memakai jarak teks diperbesar; perubahan akses memakai jarak default setelah reload. **Suite penuh 38/38 dan build terisolasi sesudahnya lulus**, tanpa perubahan timeout atau pemeriksaan yang dimatikan; bukti serta artefak mengikuti [VERIFICATION.md](VERIFICATION.md). Unit/integrasi tidak diulang untuk perubahan fokus/markup klien. Ini bukan pembaca layar nyata, zoom tab 200% baru atau pemeriksaan seluruh alur CMS.

## Formulir akun — 4 November 2026

Buat/ubah akun kini menghubungkan nama dan pesan kolom melalui `aria-labelledby`/`aria-describedby`, menandai kesalahan, dan memfokuskan masalah dalam formulir yang sesuai. Nama, email, peran dan akses bertahan ketika ditolak. Reset native hanya diizinkan pada keberhasilan; pembuatan berhasil membersihkan input. Default pilihan perubahan akun dipasang ulang dari role/akses tersimpan agar reset tidak mengembalikan tampilan ke nilai awal yang sudah usang. Kontrol dinonaktifkan selama permintaan; CSS tetap memakai pola yang ada.

**Browser terarah 4/4, suite E2E penuh 38/38, typecheck, 18/18 unit, 43/43 integrasi dan build terisolasi lulus**. Kasus nama hanya spasi, email duplikat, serta proteksi admin terakhir dengan akses/peran terkait diperiksa pada 320/1440 CSS px dengan jarak teks diperbesar. Tes juga memeriksa perubahan akses yang sah, persistensi setelah reload, sesi pengguna yang dicabut, reset sandi dengan pilihan akses belum disimpan, aktivasi ulang, penolakan sandi lama dan kewajiban mengganti sandi reset.

Delapan screenshot panel/formulir hasil terarah dibaca, tersimpan di `.local/account-forms-20261104-jzou7hh2/targeted-passed/`. Capture ini tidak mencakup seluruh halaman, seluruh state, zoom tab 200%, perangkat nyata atau pengumuman pembaca layar. Hasil suite penuh/build dan penolakan nilai akses rusak pada server mengikuti [VERIFICATION.md](VERIFICATION.md). Trace/context memuat sandi/sesi fixture sintetis; tinjau sebelum dibagikan.

## Validasi ganti sandi — 4 November 2026

Kolom sandi saat ini, sandi baru dan konfirmasi mempunyai nama eksplisit, petunjuk serta kesalahan yang terkait melalui `aria-describedby`, penanda `aria-invalid`, dan fokus menuju masalah pertama. Pembatalan reset native mempertahankan input saat action ditolak; formulir tidak menyalin sandi ke localStorage maupun state respons. Panjang dan syarat sandi tetap sama. CSS dan tata letak tidak diubah.

Regresi browser membuat akun sintetis baru melalui admin CMS, masuk memakai sandi sementara, lalu memeriksa konfirmasi berbeda, sandi lama salah, serta sandi baru yang sama. Koreksi memakai keyboard dan Enter untuk mengirim; nama/deskripsi serta nilai yang bertahan diperiksa. Skenario memakai 320/1440 CSS px dengan jarak teks diperbesar, mengukur overflow horizontal, lalu membuktikan pesan keberhasilan, penolakan sandi lama, dan login sandi baru. Ini bukan seluruh alur buat/ubah akun dengan keyboard.

Percobaan awal tertahan oleh locator nama lama yang juga memuat petunjuk. Sesudah locator dikoreksi, seluruh validasi tercapai, tetapi pesan berhasil hilang karena redirect render ke login polos. Pengalihan kini dilakukan di server. **Pengulangan terarah 2/2, suite penuh 34/34, typecheck, 18/18 unit, 40/40 integrasi dan build terisolasi lulus**. Suite pertama 33/34 dan alasan penyesuaian satu assert navigasi dicatat di [VERIFICATION.md](VERIFICATION.md). Empat screenshot akhir dari `targeted-passed/` dibaca. Pengumuman pembaca layar nyata, zoom tab 200% pada state baru dan seluruh state kontras belum diperiksa. Artefak privat di `.local/password-accessibility-20261104-j177447v/` memuat sandi/sesi fixture pada trace/context; tinjau sebelum dibagikan.

## Percakapan FAQ dengan keyboard — 4 November 2026

Regresi awal gagal di desktop dan mobile karena area gulir percakapan belum mempunyai tujuan fokus keyboard. Area itu sekarang menjadi region bernama **Percakapan FAQ** dengan `tabIndex=0`; log mempunyai nama **Riwayat percakapan FAQ**. Kolom pertanyaan terhubung ke petunjuk privasi dan, saat request gagal, pesan gangguan melalui `aria-describedby`. Kesalahan layanan tidak diberi `aria-invalid` karena bukan kesalahan isi pertanyaan. Tidak ada perubahan CSS, isi jawaban, API, atau penyimpanan riwayat.

Pengulangan terarah **2/2 lulus**, exit 0, pada Chromium desktop/mobile di luar sandbox. Skenario memakai lebar 1440/320 CSS px, tinggi 900 px, dan jarak teks yang diperbesar. Dari tombol tutup, Tab memfokuskan area percakapan; Home menggulir ke awal, PageDown benar-benar mengubah posisi gulir, lalu Tab menjangkau sumber pertama. Jawaban berasal dari FAQ fixture terbit. Respons 503 disimulasikan sekali di browser untuk memeriksa pesan/deskripsi, masukan dan jawaban lama yang bertahan, reset, Escape, serta fokus kembali ke pembuka. Simulasi ini bukan bukti backend benar-benar mengalami gangguan.

Enam screenshot topik, fokus/gulir jawaban, dan gangguan dibaca dan tersedia di `.local/faq-keyboard-20261104-axkwp9vq/after-targeted/`. **Suite penuh sesudahnya 32/32 lulus**, typecheck serta build terisolasi **lulus**; hasil dan batas mengikuti [VERIFICATION.md](VERIFICATION.md). Pemeriksaan nama/deskripsi memakai accessibility tree Chromium; pengumuman serta urutan baca pembaca layar nyata belum diperiksa. Ini bukan pemeriksaan zoom tab 200% baru, seluruh state kontras, atau kelulusan WCAG/UAT.

## Workflow dan reset pilihan arsip — 3 November 2026

Eksekusi di luar sandbox pertama menemukan checkbox arsip tidak lagi tercentang sesudah penarikan ditolak. State React saja belum mencegah reset native setelah action. `WithdrawForm` kini membatalkan reset formulir tersebut; note dan checkbox dipertahankan sampai tindakan selesai atau komponen diganti. Tidak ada perubahan CSS/peran/validasi server.

Regresi workflow memeriksa nama/deskripsi kolom, fokus setelah penolakan, isi note dan checkbox, URL publik yang tetap tersedia saat penarikan gagal, lalu koreksi dan penarikan. Pengulangan terarah **2/2 lulus**, suite penuh **30/30 lulus**, typecheck serta build terisolasi **lulus**. Empat screenshot keputusan/penarikan desktop/mobile dari `targeted-passed/` dibaca: pesan dan fokus terlihat, checkbox tetap tercentang. Artefak dan batas ada di [VERIFICATION.md](VERIFICATION.md).

Assert URL login pada dua helper menunggu hingga 15 detik setelah trace membuktikan login berhasil tetapi navigasi dingin belum selesai dalam lima detik. Timeout workflow tetap 120 detik. Ini bukan pengukuran performa produksi atau audit WCAG.

### Zoom tab nyata 200% dan pemindaian kontras

Chromium 149.0.7827.55 memakai profil/ekstensi sementara untuk mengatur dan membaca faktor zoom 2 melalui [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom). Ruang layout berubah dari 1440×913 menjadi 720×456 CSS px, DPR dari 1 menjadi 2, dan `visualViewport.scale` tetap 1. Pemeriksaan ini memakai zoom tab, melengkapi reflow 720 px yang lebih lama.

Sebanyak 15 rute publik/login dan 14 kunjungan CMS pada tiga peran selesai tanpa overflow horizontal atau pemotongan pada elemen teks utama yang diperiksa. Dialog pencarian/FAQ dibuka lewat keyboard, berada dalam viewport, dan Escape mengembalikan fokus. Enam screenshot akhir beranda/simulator/login/pencarian/FAQ/pengguna dibuka pada dimensi fisik 1440×913. Simulator/pengguna hanya direkam pada viewport awal; gambar dialog FAQ merupakan keadaan awal, bukan semua state. Capture pertama Playwright terpotong ke 720×456; pengulangan lengkap memakai CDP tanpa clip serta assert dimensi PNG, dan hasil awal dipertahankan untuk transparansi.

Pemindaian 1.453 elemen teks, termasuk pengulangan navigasi, menemukan 0 rasio di bawah 4,5:1 atau 3:1 menurut ukuran/bobot. Rasio dihitung dari warna CSS teks/latar leluhur dan alpha; pengukuran tidak membuktikan kontras semua piksel gambar/lapisan lain, nilai input native, border/fokus, hover, disabled, atau seluruh error/dialog. Tidak ada klaim WCAG selesai. Laporan, batas pemotongan, artefak dan penutupan server ada di [VERIFICATION.md](VERIFICATION.md).

Bagian-bagian berikut mempertahankan riwayat sebelum hasil browser/zoom terbaru. Pembaca layar nyata belum tersedia pada host pengerjaan; pemeriksaan NVDA/VoiceOver/Orca oleh pengguna tetap diperlukan.

## Kelanjutan verifikasi server — 3 November 2026

Regresi langsung pada `decisionAction`/`withdrawAction` kini membuktikan kesalahan `fields.note` melewati parsing FormData dan pemeriksaan sesi dengan autentikasi Better Auth nyata pada tiga peran sintetis. Formulir rusak, akses tanpa hak, dan sesi yang dicabut ditolak; snapshot konten tetap sama saat tindakan gagal. **38/38 integrasi dan typecheck lulus**. Ini melengkapi regresi layanan, tetapi belum memeriksa fokus, nama/deskripsi yang dibaca teknologi bantu, atau masukan yang bertahan di React melalui browser.

Prapemeriksaan ulang masih menolak loopback `EPERM` dan Chromium berhenti dengan SIGTRAP. Tidak ada screenshot baru, E2E terbaru, zoom 200%, atau pembaca layar yang telah diperiksa. TypeScript langsung pada salinan build gagal lulus; build lengkap tetap belum lulus. Batas lengkap ada pada [VERIFICATION.md](VERIFICATION.md).

## Catatan keputusan dan penarikan — 3 November 2026

Pemeriksaan kode menemukan kesalahan catatan hanya menjadi pesan umum: `DecisionForm` dan `WithdrawForm` belum menghubungkannya dengan textarea. Regresi layanan awal membuktikan `fields.note` tidak tersedia. Layanan kini mengirim kesalahan kolom untuk pengembalian tanpa catatan, alasan penarikan kosong/hanya spasi, serta catatan lebih dari 2.000 karakter. Server Actions meneruskan validasi isi ke layanan tersebut; pemeriksaan identitas dan peran tetap berlaku.

Kedua textarea memiliki nama label eksplisit, petunjuk, `aria-describedby` menuju kesalahan, dan `aria-invalid`; efek formulir memfokuskan kolom ketika server mengembalikan `fields.note`. Catatan serta pilihan arsip kini memakai state agar tetap tersedia sesudah penolakan; kontrol dinonaktifkan ketika permintaan berlangsung. Pola CSS yang sudah ada dipakai tanpa perubahan visual lain.

Typecheck, **18/18 unit**, dan **37/37 integrasi** lulus. Regresi membuktikan penolakan tidak mengubah revisi, publikasi, pencarian, audit, atau arsip dan batas tepat 2.000 karakter diterima. Workflow E2E yang ada diperluas untuk keyboard, nama/deskripsi kolom, fokus, pemeliharaan masukan/arsip, koreksi, serta publikasi/penarikan berikutnya; discovery tetap 30 kasus. Screenshot state kesalahan akan ditulis saat workflow dijalankan.

**E2E terbaru dan screenshot tersebut belum dijalankan/dibaca.** Prapemeriksaan sesi ini menolak bind loopback dengan `EPERM` dan Chromium gagal mulai. Build terisolasi juga gagal membaca subprocess TypeScript setelah kompilasi berhasil; diagnosis/batas ada di [VERIFICATION.md](VERIFICATION.md). Hasil 30/30 serta build lulus pada bagian berikut mendahului perubahan ini. Fokus dan pengumuman pembaca layar pada formulir terbaru masih perlu diperiksa di browser nyata, bersama zoom 200%, jarak teks pada state kesalahan, dan sisa cakupan CMS. Tidak ada klaim WCAG atau UAT lulus.

## Pembuka FAQ di header — 3 November 2026

Pengukuran browser pada salinan/data sintetis membuktikan pembuka fixed tetap menutup target setelah target difokuskan. Dengan jarak teks yang sama seperti temuan sebelumnya, luas perpotongannya adalah 10.508,51 CSS px² pada tautan Penilai Pemerintah di 1440×900 dan 1.241 CSS px² pada pilihan predikat di 320×900. Fokus/gulir native tidak menghilangkan overlap.

Pembuka FAQ dipindahkan ke header memakai tombol ikon pencarian/menu yang sudah ada. Nama aksesibel dipertahankan dan title menyebut Asisten FAQ Jafa Hub. CSS pembuka fixed dihapus; dialog tetap modal native. Kontrol header dapat membungkus pada lebar sempit, dan identitas header mengikuti pola ringkas yang sudah ada pada lebar menengah. PRD §8.3 serta README mencatat lokasi baru.

| Pengukuran sebelum/saat fokus | Sebelum | Sesudah |
| --- | --- | --- |
| Tautan JF desktop | 10.508,51 CSS px² | 0 |
| Predikat simulator mobile | 1.241 CSS px² | 0 |
| Posisi pembuka | `fixed`, di luar header | `static`, dalam header |
| Inspector gaya beranda | 5 FAIL / 4 WARN | 5 FAIL / 3 WARN |

Screenshot terarah serta seluruh fold/lembar inspector 1440/768/390 sebelum/sesudah dibuka. Tautan JF, kontrol simulator, dan footer tidak lagi tertutup pembuka pada gambar hasil. Laporan, screenshot dan angka mentah berada di `.local/faq-header-20261103-oqua_4iz/`. Inspector masih mengeluarkan lima temuan gaya lama; ini tidak disamakan dengan pelanggaran WCAG atau kelulusan desain menyeluruh. Kritik dan batasnya ada di [DESAIN.md](DESAIN.md).

Regresi E2E baru memeriksa satu pembuka dalam header, overflow/overlap dengan tautan dan kontrol, target yang difokuskan, footer, serta buka/Escape/fokus kembali pada 320/390/768/1024/1100/1440 CSS px dengan jarak teks. Kedua kasus baru lulus dalam suite penuh **30/30**, exit 0. Enam screenshot regresi header dibaca dan disimpan pada `e2e-header/` di direktori artefak tersebut. Hasil akhir suite/build mengikuti [VERIFICATION.md](VERIFICATION.md). Kasus overlap pembuka di atas menggantikan status temuan lama pada bagian historis berikut; audit semua state, zoom browser 200%, dan pembaca layar nyata tetap tersisa.

## Menu, skip link, dan jarak teks — lanjutan 3 November 2026

Empat regresi awal mobile menghasilkan dua kasus lulus dan dua gagal: pemeriksaan jarak teks publik/CMS lulus; menu publik kehilangan fokus saat Escape menutup seluruh navigasi, sedangkan skip link CMS tidak memfokuskan konten dan Escape menu CMS tidak ditangani. Bukti kegagalan ini berasal dari interaksi browser, bukan hanya pemeriksaan kode.

Menu publik kini menutup dropdown terlebih dahulu sambil memfokuskan summary; Escape berikutnya menutup menu mobile dan memfokuskan tombol pembukanya. Saat dialog native terbuka, Escape tetap ditangani dialog. Menu CMS menutup lewat Escape dengan fokus kembali ke pembukanya dan memiliki hubungan `aria-controls`. Tujuan skip link publik/CMS dapat menerima fokus melalui `tabIndex=-1`. Area gulir aktivitas dashboard diberi label dan `tabIndex=0` seperti tabel CMS lainnya. Warna, ukuran teks, dan tata letak tidak diubah.

`accessibility.spec.ts` menambah empat skenario desktop/mobile. Pemeriksaan jarak teks menetapkan line-height 1,5, jarak setelah paragraf 2em, jarak huruf 0,12em, dan jarak kata 0,16em sesuai [penjelasan W3C untuk SC 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html). Lima belas rute publik/login dan empat belas kunjungan CMS diperiksa pada lebar 320/1440 CSS px. CMS mencakup dashboard, daftar, formulir artikel/regulasi/FAQ baru, antrean penyetuju, aktivitas, pengguna, dan ganti sandi dengan tiga peran sintetis. Admin fixture tidak menerbitkan materi.

Pemeriksa mencari overflow halaman dan pemotongan oleh `overflow: hidden/clip` pada heading, paragraf, tombol, serta summary. Tabel tetap boleh bergulir di areanya. Screenshot beranda, simulator, dan pengguna dilampirkan oleh tes untuk tinjauan visual. Ini tidak mencakup setiap elemen/leluhur, overlap, seluruh state error/dialog, atau pemeriksaan pengguna pembaca layar; pengubahan jarak teks juga bukan zoom browser. Hasil akhir suite dan build mengikuti [VERIFICATION.md](VERIFICATION.md).

**Suite akhir 28/28 dan build terisolasi lulus.** Enam screenshot di `.local/accessibility-navigation-20261103-beapj4ln/after/` dibuka dan diperiksa: formulir pengguna tersusun kembali di mobile dan tabel simulator tetap terbaca. Pada `jarak-teks-beranda.png` desktop, launcher FAQ menutup sebagian label Penilai Pemerintah; pada `jarak-teks-simulasi.png` mobile, launcher menutup sisi kanan kontrol predikat. Ini temuan overlap yang tidak ditangkap pemeriksa ukuran. Pemeriksaan fokus terarah sempat timeout saat memuat halaman, sehingga belum ada bukti apakah perpindahan fokus/gulir menghindarinya. Tindak lanjut perlu memeriksa kontrol/tautan/footer pada beberapa posisi gulir dan memperbaiki overlap sesuai hasil, bukan menganggap suite lulus sebagai kelulusan aksesibilitas menyeluruh.

## Kelanjutan CMS — 3 November 2026

Pemeriksaan kode menemukan pesan kesalahan pengajuan hanya tersimpan dalam state `SubmitForm`, sedangkan penanda kolom membaca state simpan di `EditorForm`. Akibatnya, pengajuan yang belum lengkap meminta editor memeriksa kolom bertanda tanpa menampilkan penandanya.

Kedua tindakan kini memakai state yang sama dalam `EditorForm`. Pesan dihubungkan ke kontrol melalui `aria-describedby`; nama kontrol tetap memakai label tersendiri melalui `aria-labelledby`, sehingga pesan atau isi textarea tidak menjadi nama kontrol. `aria-invalid` menandai kesalahan, fokus berpindah ke masalah pertama, dan kelompok bidang/sumber dapat menerima fokus bila kesalahannya berlaku pada kelompok. Penanda dihapus sesudah koreksi disimpan, sementara masukan dipertahankan saat pengajuan ditolak. Aturan validasi serta persetujuan server tetap berlaku.

Regresi di `tests/e2e/workflow.spec.ts` memeriksa kolom kosong, deskripsi tanggal/bidang/sumber, fokus input dan kelompok sumber, masukan yang bertahan, koreksi dengan keyboard, penanda lama yang hilang, serta pengajuan berikutnya. Kedua kasus baru lulus dalam suite penuh **20/20**, exit 0, desktop/mobile melalui eksekusi di luar sandbox. Hasil aktual mengikuti bagian 3 November di [VERIFICATION.md](VERIFICATION.md). Ini belum membuktikan seluruh CMS dapat diselesaikan dengan keyboard atau pembaca layar nyata.

## Pemeriksaan 26 Oktober 2026

Pemeriksaan ini melanjutkan tahap 3 pada CONTEXT.md. Server memakai database sintetis yang fixture-nya diterbitkan melalui editor/penyetuju berbeda, tanpa mode pratinjau. Identitas visual dan komponen produk tidak diubah. Ini bukan audit WCAG menyeluruh atau pengujian oleh pengguna pembaca layar.

## Bukti browser

`tests/e2e/accessibility.spec.ts` menambah dua skenario untuk Chromium desktop dan mobile:

- Pencarian dan FAQ dibuka dengan keyboard; nama dialog serta input terbaca melalui role/nama aksesibel. Latar modal tidak dapat mengambil fokus. Tab/Shift+Tab berpindah antar kontrol yang relevan; Escape menutup dialog dan mengembalikan fokus ke tombol pembuka.
- Beranda, regulasi, simulator, dan login dimuat pada lebar CSS 720 dan 320 piksel; tidak ada overflow horizontal, satu H1 tersedia, dan kontrol login tetap terlihat.

Lebar 720 piksel mewakili ruang layout 1440 piksel yang dipersempit separuh. Ini **pengujian reflow**, bukan bukti tombol zoom browser sudah dipakai pada 200%. Lebar 320 piksel juga tidak membuktikan penggunaan nyata pada perangkat atau pembaca layar tertentu.

Tes fokus pertama sempat gagal karena mengharuskan Tab dari tombol terakhir langsung menuju tombol pertama. Koreksi tes memeriksa latar inert dan perpindahan Tab/Shift+Tab antarkontrol, tanpa mengasumsikan urutan fokus di batas antarmuka browser. Komponen dialog native tidak diubah. Pengulangan khusus lulus **4/4**, kemudian suite gabungan akhir lulus **18/18**, exit 0; bukti dan batas mengikuti [VERIFICATION.md](VERIFICATION.md).

Suite portal sebelumnya memeriksa skip link, menu mobile, `prefers-reduced-motion`, validasi simulator/alert, serta workflow CMS desktop/mobile. Cakupan baru melengkapi kasus tersebut; UI editor/penyetuju belum diuji seluruhnya dengan keyboard atau pembaca layar.

## Inspeksi tiga ukuran

Inspector Design Taste dijalankan melalui eksekusi di luar sandbox dengan Chromium Playwright terpasang. Percobaan dalam sandbox gagal pada operasi socket Chromium. Lebar yang diperiksa: 1440, 768, dan 390 piksel. Ketiga screenshot fold serta seluruh lembar halaman untuk kedua rute dibuka dan diperiksa.

| Rute | Hasil inspector | Batas penafsiran |
| --- | --- | --- |
| `/` | 5 FAIL gaya, 4 WARN; tidak ada temuan aturan kontras atau overflow | Label jenis artikel, bayangan dropdown, tiga pintu JF berikon, jumlah gerak, dan dominasi teks 14 px memicu aturan gaya. Ini bukan lima pelanggaran WCAG yang telah dibuktikan |
| `/admin/login` | 0 FAIL, 1 WARN komposisi | Formulir dibatasi lebarnya; inspector menganggap ruang kanan desktop kurang terisi. Tidak ada temuan aturan kontras atau overflow |

Hasil lint sumber: publik 0 FAIL/2 WARN batas kontrol; formulir CMS 0 FAIL/0 WARN. Scanner kontras menggunakan teks/latar yang dapat dihitung; hasil ini tidak memeriksa setiap piksel teks di atas foto, setiap state hover/fokus/error, atau semua halaman. Kontras teks dominan pada tablet/mobile dilaporkan 5,8:1. Belum ada klaim kelulusan WCAG 2.2 AA.

Artefak lokal disimpan pada `.local/accessibility-20261026/{beranda,login}/`: `report.json`, screenshot fold dan lembar halaman per viewport. Berkas ini hanya memuat fixture, tetap perlu ditinjau sebelum dibagikan. Tidak ada cookie atau kredensial nyata yang dipakai.

## Kritik visual pada render yang sama

Arah yang sudah ada dipertahankan: Loud and flat, seed 881044182; CMS Framed sheet, seed 989542123. Tidak ada draw/redraw atau aset baru. Tiga ilustrasi konseptual dari prototipe tetap diberi keterangan. Dasar dan atribusi ada pada [DESAIN.md](DESAIN.md).

ROUND 1 — inspeksi kelanjutan

Seen in one second: judul JF besar dengan arsitektur navy dan dua tindakan.
Idea (one sentence): tiga jabatan DJKN menjadi jalur ke materi dan sumber.
Live thing: simulator Angka Kredit dan asisten FAQ terkurasi.
Layout words by section: hero=full-bleed / pengantar=split / artikel=row / regulasi=list / simulator=split / footer=columns.
Scores: design 6.5 · usability 7.5 · creativity 7.0 · content 8.0 → overall 6.0 setelah cap.
Caps applied: lima FAIL house style inspector; skor internal ini bukan skor aksesibilitas.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Teks kartu artikel dan catatan sekunder kecil pada `beranda/mobile-page-01.jpg`; ukuran isi perlu ditinjau bersama pemilik desain pada perangkat nyata.
2. Launcher FAQ tetap berada di kanan bawah pada `beranda/tablet-page-01.jpg`; pengujian fokus seluruh tautan/footer dan konten di belakang overlay masih diperlukan.
3. Metadata artikel dan struktur tiga jalur JF memicu aturan gaya pada `beranda/desktop-page-01.jpg`; keduanya membawa jenis materi/navigasi sesuai PRD. Menghapusnya bukan perbaikan aksesibilitas yang dibuktikan pemeriksaan ini.

Halaman login menjawab tugas masuk melalui satu formulir, label dan tombol terlihat pada ketiga ukuran, tidak menampilkan angka rekaan, dan tidak memerlukan perombakan canvas untuk menutup peringatan komposisi. Pemeriksaan ini berhenti pada review dan regresi perilaku; temuan gaya dicatat tanpa mengklaim desain lolos inspector.

## Pekerjaan yang masih memerlukan pemeriksaan

1. Lengkapi pemeriksaan target sentuh/fokus dan seluruh state dialog/menu; kedua overlap pembuka FAQ yang direkam sebelumnya sudah terukur nol sesudah pemindahan ke header.
2. Paket profil/regulasi 28 state, akun/ganti sandi/FAQ/unggahan 76 state dan keputusan CMS 52 state pada zoom 200% sudah tercatat. Paket keputusan juga memakai jarak teks diperbesar. Berikutnya variasi jenis/state yang belum dicakup, khususnya rekaman tetap dan interaksi komponen lain; hasil scoped ini tidak mewakili seluruh CMS.
3. Pembaca layar nyata (misalnya NVDA/VoiceOver): landmark, urutan baca, nama kontrol, pesan validasi/status, dialog, tabel, serta seluruh siklus CMS.
4. Lanjutkan kontras state lain, permukaan gambar/lapisan saudara, hover pointer dan indikator native, pengukuran target/fokus serta audit aksesibilitas independen. Sampel formulir/pesan profil/regulasi pada paket 6 November sudah diperiksa; hasilnya tidak mengisi cakupan yang belum diukur.
5. UAT dengan peserta yang ditunjuk. Kelulusan otomatis tidak mengisi lembar UAT atau memberi persetujuan instansi.

Pada sesi ini pengguna mengonfirmasi staging PostgreSQL native dan hosting masih belum tersedia, lalu meminta melanjutkan yang bisa diuji lokal. Biaya langganan tetap Rp0; tidak ada akun layanan, deployment, atau paket baru yang diaktifkan.
