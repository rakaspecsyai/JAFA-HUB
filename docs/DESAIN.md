# Keputusan desain Jafa Hub

Arah halaman: **Loud and flat**, seed **881044182**. Palet navy/kuning serta Barlow Condensed/Plus Jakarta Sans dipertahankan dari PRD. Arah CMS: **Framed sheet**, seed **989542123**, sidebar terang dan lembar kerja putih, tanpa angka trafik rekaan.

Ide: tiga pintu masuk jabatan fungsional DJKN menjadi jalur yang jelas melalui portal pengetahuan dengan tipografi tegas. Interaksi utamanya adalah simulator konversi AK; asisten menelusuri FAQ terkurasi dari sumber yang sama.

Hero portrait miring yang dibagikan oleh skill diganti dengan ilustrasi arsitektur lebar karena PRD §7.1 secara eksplisit meminta hero navy dan arsitektur/aset. Bidang warna kosong pada blueprint diisi dengan materi profil, artikel, dan regulasi sesuai PRD §9. Aksen kata kuning mengikuti identitas prototipe. Batas tombol/formulir, pemisah identitas, dan bayangan dialog/menu dipertahankan untuk fungsi dan keterbacaan. Tidak ada bayangan pada kartu isi.

## Sumber visual

| Berkas | Isi dan penggunaan | Asal/atribusi |
| --- | --- | --- |
| `hero.webp` | Ilustrasi arsitektur, hero, artikel, login | Dibuat dengan imagegen untuk prototipe Jafa Hub; bukan dokumentasi resmi |
| `field.webp` | Ilustrasi ASN meninjau aset, pengantar dan artikel | Aset generatif prototipe; bukan dokumentasi ASN/acara resmi |
| `auction.webp` | Ilustrasi administrasi lelang, artikel/profil | Aset generatif prototipe; bukan dokumentasi acara resmi |
| Identitas Kemenkeu/DJKN | Header, lambang mobile | Aset asli pengguna, proporsi dipertahankan; versi bertulisan hitam ditaruh pada alas putih agar terbaca |

Keterangan ilustrasi ada pada hero, pengantar, detail artikel, serta profil. Tidak ada stok foto, video, orang, kegiatan, testimoni, atau statistik baru yang ditambahkan. Detail font dan lisensi Phosphor ada pada `docs/SOURCES.md` dan `public/assets`.

## Kritik visual

ROUND 1

Seen in one second: judul besar dan arsitektur malam.
Idea (one sentence): pengetahuan JF DJKN diakses melalui tiga jalur jabatan.
Live thing: simulator AK dan pemilihan FAQ.
Layout words by section: hero=full-bleed / pengantar=split / artikel=editorial row / regulasi=list / simulator=colour split.
Scores: design 6.0 · usability 7.0 · creativity 6.5 · content 7.5 → overall 6.5.
Caps applied: hero mobile sempat lebih dari dua baris; hanya tiga ilustrasi sumber yang berbeda.
Top three problems:
1. Hero pada screenshot mobile terlalu panjang. Judul dipadatkan menjadi “Pengetahuan JF. Untuk kinerja.”
2. Gambar artikel mengikuti tinggi atribut HTML pada mobile. Reset tinggi responsif dan crop gambar diperbaiki.
3. Teks logo hitam tidak terbaca di navy. Aset asli diberi alas putih.

ROUND 2

Seen in one second: dua baris judul, dua tindakan, dan tiga jalur JF.
Idea (one sentence): tugas yang berbeda dirangkai lewat materi dan sumber DJKN.
Live thing: simulator AK beserta rumus dan validasi.
Layout words by section: hero=full-bleed / pengantar=split / artikel=editorial row / regulasi=list / simulator=colour split.
Scores: design 6.5 · usability 8.0 · creativity 7.0 · content 8.0 → overall 7.2.
Caps applied: tiga ilustrasi sumber berbeda dipertahankan; tidak menambah gambar yang tak diperlukan untuk memenuhi jumlah.
Top three problems:
1. Tinggi crop artikel berbeda. Gambar pada baris desktop dibuat setinggi.
2. Launcher FAQ bertabrakan dengan label JF di layar kecil. Launcher dipadatkan dan ruang kanan daftar JF dicadangkan.
3. Catatan hero bergantung pada tinggi daftar di bawahnya. Catatan dipindahkan ke bidang hero agar tidak bertabrakan ketika label membungkus.

ROUND 3

Seen in one second: portal JF beridentitas institusi dengan tindakan yang jelas.
Idea (one sentence): kombinasi Penilai, PLB, dan Pelelang menentukan isi dan navigasi portal.
Live thing: simulator lokal; FAQ bersumber tanpa model generatif.
Layout words by section: hero=full-bleed / pengantar=split / artikel=editorial row / regulasi=list / simulator=colour split / footer=columns.
Scores: design 6.5 · usability 8.0 · creativity 7.0 · content 8.0 → overall 7.2.
Caps applied: tiga ilustrasi berbeda; pengukuran inspector otomatis belum berjalan karena pembatasan lingkungan.
Top three problems:
1. Verifikasi interaksi, fokus, dan kontras masih memerlukan runner browser yang diizinkan; tidak diberi klaim lulus.
2. Identitas dan ilustrasi masih memerlukan persetujuan instansi sebelum publikasi.
3. Kontak khusus, nomenklatur, sumber historis, dan aturan simulator masih menunggu tinjauan substansi.

Skor manual akhir 7,2 tidak mencapai 7,5. Ini penilaian internal atas screenshot, bukan penilaian juri atau bukti kepatuhan aksesibilitas. Tidak ada konten pembuktian yang dibuat untuk menaikkan skor. Daftar kesiapan produksi tetap mengikuti PRD dan `OPERASIONAL.md`.

## Inspeksi lanjutan — 26 Oktober 2026

Inspector kini benar-benar dijalankan di luar sandbox pada fixture terisolasi di 1440/768/390 piksel. Beranda melaporkan 5 FAIL gaya/4 WARN; login 0 FAIL/1 WARN komposisi. Aturan kontras/overflow tidak melaporkan temuan pada sampel tersebut. Seluruh fold dan lembar screenshot dibuka. Kritik terbaru menerapkan cap house style sehingga skor internal 6,0; angka historis 7,2 di atas tidak dianggap hasil inspector. Tidak ada redraw atau perubahan visual produk pada sesi ini. Rincian temuan dan batas pemeriksaan tersedia di [AKSESIBILITAS.md](AKSESIBILITAS.md).

## Pembuka FAQ pada header — 3 November 2026

Perubahan komponen mengikuti arah yang sudah ada, tanpa draw ulang, aset, font, atau warna baru. Pembuka FAQ memakai tombol ikon header yang sama dengan pencarian dan menu. Dialog tetap terkurasi. Pada layar sempit kontrol dapat membungkus; pada lebar menengah identitas memakai varian ringkas yang sudah tersedia. Tujuannya menghilangkan pembuka fixed yang menutupi materi, kontrol simulator, dan footer.

Seluruh fold dan lembar halaman sebelum/sesudah di 1440/768/390 dibuka, ditambah screenshot dengan jarak teks pada beranda desktop dan simulator 320 px. Artefak berada di `.local/faq-header-20261103-oqua_4iz/`.

| Ukuran/pemeriksaan | Sebelum | Sesudah |
| --- | --- | --- |
| Overlap tautan JF desktop, termasuk fokus | 10.508,51 CSS px² | 0 |
| Overlap kontrol predikat 320 px, termasuk fokus | 1.241 CSS px² | 0 |
| Inspector beranda pada tiga ukuran | 5 FAIL / 4 WARN | 5 FAIL / 3 WARN |
| Lint tiga berkas komponen | Tidak diulang pada baseline | 0 FAIL / 1 WARN batas tombol topik |

Lima FAIL tetap sama dengan baseline: metadata jenis artikel, bayangan dropdown, tiga pintu JF berikon, jumlah gerak, dan ukuran teks dominan 14 px. Tidak ada temuan overflow baru yang dilaporkan. Batas tombol topik dipertahankan sebagai affordance kontrol, seperti keputusan batas formulir sebelumnya. Ini perbaikan aksesibilitas komponen; halaman belum dinyatakan lulus seluruh aturan gaya atau WCAG.

ROUND 1 — pembuka FAQ setelah perbaikan

Seen in one second: identitas Jafa Hub, judul JF besar, dan kontrol bantuan bersama pencarian.
Idea (one sentence): tiga jalur jabatan menuju materi dan sumber DJKN tetap menjadi susunan utama.
Live thing: simulator AK dan dialog FAQ terkurasi dari header.
Layout words by section: header=inline controls / hero=full-bleed / pengantar=split / artikel=row / regulasi=list / simulator=split / footer=columns.
Scores: design 6.5 · usability 8.0 · creativity 7.0 · content 8.0 → overall 6.0 setelah cap.
Caps applied: lima FAIL gaya yang sudah ada pada baseline; skor ini bukan hasil audit aksesibilitas.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Isi sekunder masih kecil pada `after-inspect/mobile-page-01.jpg`; ukuran perlu ditinjau pada perangkat nyata bersama pemilik desain.
2. Ilustrasi berulang pada artikel di `after-inspect/desktop-page-01.jpg`; penggantian memerlukan aset substantif yang ditinjau pengelola.
3. Metadata jenis dan bayangan dropdown tetap memicu aturan gaya pada `after-inspect/desktop-fold.jpg`/`desktop-page-01.jpg`; tinjauan gaya berikutnya perlu menjaga informasi jenis materi dan fungsi menu.

Overlap pembuka pada screenshot awal sudah dihilangkan melalui pemindahan ke aliran header. Hasil interaksi penuh dan batas verifikasi mengikuti [VERIFICATION.md](VERIFICATION.md).
