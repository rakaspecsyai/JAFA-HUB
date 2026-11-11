# UAT Jafa Hub

Disiapkan 23 Oktober 2026. Pengguna mengonfirmasi bahwa staging PostgreSQL, hosting, dan petugas UAT belum tersedia. **UAT instansi belum dilaksanakan dan belum disetujui.** Hasil otomatis pada [VERIFICATION.md](VERIFICATION.md) merupakan bukti teknis dengan batas yang tercatat, bukan hasil penerimaan peserta.

## Persiapan dan penilaian

Pemilik layanan menunjuk minimal lima peserta yang mewakili ASN/pengelola kepegawaian, serta calon editor, calon penyetuju, admin akun, dan fasilitator. Petugas boleh mengikuti tugas publik bila mewakili kelompok pengguna tersebut; fasilitator tidak dihitung sebagai peserta tugas inti. Editor, penyetuju, serta admin memakai akun terpisah; seluruh kontributor revisi (pembuat, penyunting, pengaju) tidak boleh menerbitkan atau mengembalikan revisinya walaupun perannya diubah. Nama dan akun petugas belum ditetapkan. Gunakan kode P01–P05 dalam laporan ini; daftar identitas dan kredensial disimpan melalui kanal internal.

Gunakan staging berakses terbatas, PostgreSQL native, data sintetis, `JAFA_LOCAL_DATABASE=false`, dan `JAFA_CONTENT_PREVIEW=false`. Jangan menyalin data pribadi produksi. Catat commit/artefak, versi aturan simulator, browser/OS, perangkat/lebar layar, konfigurasi proxy, waktu, dan fasilitator. Materi awal tetap draf; penerbitan fixture UAT di staging tidak menyetujui substansi produksi. Jangan menjalankan skenario penarikan/reset/gangguan pada layanan operasional.

Sebelum sesi, siapkan artikel uji dengan sumber HTTPS, relasi JF, tanggal tinjauan, dua gambar buatan (satu dipakai dua artikel terbit, satu hanya draf), serta akun tiap peran. Sampaikan sandi sementara sekali melalui kanal internal; peserta menggantinya sebelum memakai CMS. Gunakan dua sesi browser editor untuk konflik versi. Siapkan empat contoh simulator bagian berikut sebagai kunci fasilitator; jangan memperlihatkan langkah penyelesaian kepada peserta.

Untuk UAT-01, mulai penghitung waktu sesudah tugas dibaca dan hentikan ketika peserta menunjukkan sumber yang diminta. Bantuan navigasi dari fasilitator membuat hasil “dibantu”, tidak dihitung berhasil tanpa arahan. Jika tugas belum selesai pada 120 detik, catat “gagal target waktu”; peserta boleh melanjutkan untuk menemukan penyebab. Untuk UAT-02, jangan memberi langkah perhitungan; catat benar/salah, bantuan, dan hambatan. Tidak ada batas waktu simulator yang ditambahkan di luar PRD.

Target PRD §3.3: minimal 80% seluruh peserta menemukan sumber dalam ≤120 detik tanpa arahan dan minimal 80% menyelesaikan satu simulasi valid tanpa bantuan. Dengan lima peserta, masing-masing memerlukan minimal empat keberhasilan. Jika peserta lebih banyak, gunakan pembulatan ke atas `ceil(0,8 × jumlah peserta)`; peserta yang berhenti/gagal tidak dihilangkan dari penyebut. Editor dan penyetuju harus menyelesaikan satu siklus revisi sampai terbit tanpa mengubah kode. Temuan kritis/tinggi tentang akses, publikasi, data, atau simulator menahan rilis.

## Skenario siap dijalankan

Kolom hasil aktual di bawah berlaku pada 23 Oktober 2026. Pemeriksaan otomatis yang disebut hanya merujuk bukti teknis di VERIFICATION.md; semua penilaian peserta dan persetujuan tetap menunggu.

| ID / PRD | Pelaksana dan tugas | Hasil yang diamati | Hasil aktual / bukti yang harus dicatat |
| --- | --- | --- | --- |
| UAT-01 / T-01, T-09 | P01–P05: “Temukan sumber resmi PMK 132 Tahun 2023 tentang JF DJKN dari portal; tunjukkan nomor dan penerbitnya.” Mulai dari beranda. | Sumber yang disiapkan fasilitator ditemukan ≤120 detik tanpa arahan; peserta dapat membedakan ringkasan portal dan dokumen sumber. | Menunggu peserta. Catat waktu detik, URL tujuan, benar/tidak, bantuan, dan hambatan. Status hukum regulasi tetap membutuhkan peninjau substansi. |
| UAT-02 / T-11 | P01–P05: hitung Keahlian → Ahli Pertama → Sangat Baik → 12 bulan. Jelaskan arti hasil dan batas penggunaannya. | 18,75 AK, input/koefisien/faktor/rumus/sumber/versi terlihat; peserta memahami hasil bukan penetapan PAK. | Regresi otomatis tercatat; keberhasilan tanpa bantuan dan pemahaman peserta belum diukur. |
| UAT-03 / T-11 | Peserta: hitung tiga contoh tambahan, ubah bulan, ubah kategori, coba input kosong/0/13/pecahan, lalu reset. | Hasil acuan cocok; input invalid tidak menghasilkan nilai; perubahan input menghapus hasil lama, perubahan kategori mengosongkan jenjang, reset mengembalikan fokus. | Otomatis tercatat; penilaian interaksi peserta menunggu. Catat nilai yang terlihat dan pesan/fokus. |
| UAT-04 / T-10 | Peserta: buka asisten, pilih topik Angka Kredit, ketik “Angka Kredit” untuk kecocokan lebih dari satu, lalu “cuaca planet merkurius”; tutup/buka, reset, muat ulang. | Jawaban sesuai FAQ terbit beserta sumber; beberapa cocok menawarkan pilihan, nihil menawarkan jalur FAQ/pencarian/kontak; riwayat hilang setelah reset/reload. | Menunggu UAT. Fasilitator memastikan istilah multi-cocok benar-benar cocok pada fixture sesi; gunakan kata yang disiapkan bila materi berubah. |
| UAT-05 / T-02, T-04, T-05 | Editor simpan draf → ajukan; penyetuju kembalikan dengan catatan; editor perbaiki dan ajukan; penyetuju terbitkan. Buka detail/daftar/pencarian/FAQ/asisten di sesi publik pada setiap tahap. | Versi publik hanya berubah saat revisi disetujui; revisi diajukan terkunci; catatan, peran, waktu, dan aktivitas tercatat. Editor/admin tidak dapat menerbitkan, penyetuju tidak dapat menyunting. | Integrasi teknis tercatat; pelaksanaan oleh calon petugas menunggu. Simpan ID konten/revisi, urutan keputusan, dan screenshot tanpa sandi/cookie. |
| UAT-06 / T-06 | Dua sesi editor membuka revisi sama; sesi pertama menyimpan, sesi kedua mencoba menyimpan versi lama. | Konflik dinyatakan; input kedua tidak diklaim tersimpan atau menimpa versi pertama. Peserta bisa membandingkan dan menyimpan ulang. | Integrasi konflik tercatat; alur pemulihan peserta menunggu. Catat pesan dan hasil akhir. |
| UAT-07 / T-07, T-12 | Editor unggah dua gambar sintetis; gunakan satu pada dua artikel terbit dan satu hanya pada draf. Publik mencoba kedua URL. Penyetuju menarik artikel terbit satu per satu, lalu arsipkan. | Media draf tidak dapat dibaca publik; media bersama tetap publik sampai rujukan terbit terakhir ditarik; pencarian/sitemap/detail diperiksa; alasan dan riwayat utuh. | Integrasi media bersama tercatat; bukti browser dan pemulihan staging menunggu. Simpan ID media/relasi tanpa data pribadi. |
| UAT-08 / T-03, T-08 | Admin buat/reset/nonaktifkan akun uji dan ubah perannya; pengguna mencoba sesi lama. Coba mengubah admin aktif terakhir, registrasi publik, dan persetujuan revisi sendiri setelah perubahan peran. | Sandi sementara wajib diganti; sesi lama ditolak; admin terakhir terlindungi; registrasi dan persetujuan sendiri ditolak server. | Integrasi teknis tercatat; UAT petugas menunggu. Jangan simpan sandi atau token sebagai bukti. |
| UAT-09 / T-01, T-09 | Peserta buka/muat ulang profil, artikel, regulasi, FAQ, halaman pendukung; cari kapital/kosong/nihil, filter dan lanjut halaman; buka URL tak dikenal. | Navigasi dan hasil dapat dipahami; hanya data terbit tampil; URL tak dikenal berstatus 404; sumber dapat ditelusuri. | HTTP/integrasi historis tercatat; penerimaan staging menunggu. Catat URL, HTTP, dan hambatan. |
| UAT-10 / T-14 | Peserta/fasilitator selesaikan pencarian, menu, asisten, simulator, dan CMS dengan keyboard; uji Escape/fokus, pembaca layar dasar, zoom 200%, reduced motion, serta 320/390/768/1440 px. | Semua alur bisa diselesaikan; label/pesan dibacakan dan fokus terlihat; tidak ada overflow yang menghalangi. Ukur kontras aktual sesuai PRD §15.2. | Screenshot dan otomatis mempunyai batas di VERIFICATION.md. Pemeriksaan manual pembaca layar/zoom/kontras belum menjadi klaim WCAG 2.2 AA. |
| UAT-11 / T-13 | Petugas teknis di database uji terisolasi memicu gagal transaksi/audit, kemudian editor/penyetuju mencoba keputusan. | Tidak ada pesan sukses palsu; versi terbit sebelumnya dan audit tetap konsisten; tersedia tindakan pemulihan. | Tes rollback integrasi tercatat; latihan gangguan staging menunggu. Fasilitator teknis mengendalikan injeksi kegagalan, bukan peserta publik. |
| UAT-12 / T-15–T-17 | Pemilik substansi dan teknis meninjau matriks di bawah serta hasil backup/pemulihan/beban. | Keputusan substansi, operasi, dan pengecualian tertulis; semua gerbang rilis terpenuhi. | Menunggu penunjukan pihak berwenang dan staging; lihat KESIAPAN-RILIS.md. |

Kunci contoh tambahan UAT-03:

| Kategori / jenjang / predikat / bulan | Hasil |
| --- | --- |
| Keahlian / Ahli Muda / Baik / 6 | 12,5 AK |
| Keterampilan / Terampil / Baik / 12 | 5 AK |
| Keahlian / Ahli Pertama / Butuh Perbaikan / 12 | 9,375 AK |

## Lembar hasil peserta

Salin baris untuk setiap peserta/tugas; jangan mengubah status “menunggu” menjadi lulus hanya karena tes otomatis lulus.

| Peserta | Perangkat/browser | Tugas | Waktu detik | Hasil acuan cocok | Bantuan | Status | Hambatan / bukti |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | Belum diisi | UAT-01 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P01 | Belum diisi | UAT-02 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P02 | Belum diisi | UAT-01 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P02 | Belum diisi | UAT-02 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P03 | Belum diisi | UAT-01 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P03 | Belum diisi | UAT-02 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P04 | Belum diisi | UAT-01 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P04 | Belum diisi | UAT-02 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P05 | Belum diisi | UAT-01 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |
| P05 | Belum diisi | UAT-02 | Belum diukur | Belum dinilai | Belum dicatat | Menunggu | — |

Laporan sesi memuat jumlah peserta, jumlah sukses masing-masing tugas inti dan persentasenya, hasil siklus CMS, daftar temuan (ID, dampak, langkah ulang, bukti, penanggung jawab, keputusan, hasil uji ulang), serta keputusan menerima/menunda dari pihak berwenang. Nilai persentase saat ini **belum tersedia**, bukan 0% atau 100%.

## Matriks persetujuan materi dan kebijakan

“Peran penanggung jawab” di sini berasal dari PRD §4/§18, bukan nama approver yang sudah ditunjuk. Tidak ada persetujuan yang diberikan oleh pengembang melalui dokumen ini. Catat ID revisi/commit yang diperiksa agar perubahan berikutnya tidak mewarisi persetujuan versi lama.

| Objek | Peran penanggung jawab; nama aktual | Pemeriksaan / bukti keputusan yang diperlukan | Status |
| --- | --- | --- | --- |
| Substansi 29 materi awal | Unit pemilik substansi; belum ditetapkan | Daftar tiap ID/revisi: 3 profil, 4 artikel, 6 regulasi, 13 FAQ, 3 halaman; ketepatan isi/konteks historis, tanggal tinjauan aktual, catatan diterima/dikembalikan. Keputusan di CMS oleh penyetuju yang terpisah. | Menunggu; impor tetap draf |
| Nomenklatur dan identitas | Unit pemilik substansi; belum ditetapkan | Nama tiga JF, jenjang/kompetensi, unit pengelola, label ilustrasi konseptual, identitas dan pernyataan status layanan. | Menunggu |
| Sumber dan lisensi | Unit pemilik substansi/pengelola; belum ditetapkan | Tiap tautan/sumber, penerbit, status dan riwayat aturan, tanggal tinjauan, atribusi aset. Inventaris di SOURCES.md hanya bahan tinjauan. | Menunggu |
| Simulator | Unit pemilik substansi; belum ditetapkan | Koefisien/faktor/validasi, empat contoh acuan, versi aplikasi, sumber dan riwayat Peraturan BKN 3/2023, batas pembelajaran, tanggal tinjauan substantif. Tes deterministik tidak menyetujui relevansi aturan. | Menunggu |
| Kontak dan layanan | Unit pemilik substansi/pengelola layanan; belum ditetapkan | Kanal resmi diverifikasi, pemilik kanal, jam layanan bila ditetapkan, isi halaman Kontak. Jangan mengisi email/telepon perkiraan. | Menunggu |
| Privasi | Pemilik layanan/penanggung jawab privasi dan teknis; belum ditetapkan | Kesesuaian teks dengan auth, data pengelola/sesi/audit/rate limit, input simulator/asisten, hosting/proxy/log nyata, lokasi simpan, retensi, akses dan kanal permintaan. | Menunggu konfigurasi nyata dan persetujuan |

Dokumen pendamping: [prosedur operasional](OPERASIONAL.md), [gerbang rilis](KESIAPAN-RILIS.md), [hasil teknis](VERIFICATION.md), [PRD](../PRD-Jafa-Hub.md).
