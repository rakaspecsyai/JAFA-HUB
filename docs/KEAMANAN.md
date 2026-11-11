# Tinjauan keamanan aplikasi — 26 Oktober 2026

Tinjauan ini memeriksa kode autentikasi, sesi, origin, pembatasan laju, hak akses, media, dan workflow yang tersedia. Better Auth dan larangan keputusan bagi seluruh kontributor mengikuti pilihan pengguna 26 Oktober. Pemeriksaan dilakukan oleh agen pengembang pada workspace lokal; ini bukan audit keamanan independen, pentest infrastruktur, atau persetujuan produksi. Suite memakai akun, sandi, serta sesi sintetis terisolasi; status maintenance database pengembangan dicatat terpisah di [VERIFICATION.md](VERIFICATION.md).

## Variasi media dan keputusan — 9 November 2026

Regresi browser baru memakai API nyata: MIME SVG dan isi PNG rusak ditolak 400, berkas lebih dari 5 MB ditolak 413, serta unggahan tanpa cookie sesi ditolak 401. Gambar lama/masukan tetap; login lewat tab lain memulihkan akses tanpa menavigasi draf. Media yang tidak dirujuk versi publik tetap 404 tanpa sesi. Penggantian dan pelepasan hanya mengubah referensi pada draf setelah simpan; tidak menghapus file permanen atau memintas persetujuan.

Empat alur fixture dengan editor dan penyetuju berbeda memeriksa pengembalian, pengajuan ulang, publikasi dan penarikan/arsip. Artikel dan media anonim mengikuti 404→200→404; batas catatan 2.000 karakter serta arsip pada penolakan diperiksa. **50/50 E2E dan build terisolasi lulus**. Perubahan kode hanya fokus/gulir serta pembersihan error UI; autentikasi, validasi media, peran, transaksi, skema dan dependensi tidak diubah. Rincian di [VERIFICATION.md](VERIFICATION.md). Ini bukan pengujian expiry waktu delapan jam, semua tipe file/serangan, hosting atau audit independen; data pengguna tidak disentuh.

## Argumen tindakan akun — 9 November 2026

`useUserForm` mengirim hasil tindakan sebelumnya sebagai argumen `userAction`, termasuk sandi sementara setelah reset. Log development Next memperlihatkan state tersebut; ini temuan pada fixture sintetis, bukan insiden akun pengguna. Server mengabaikan argumen pertama. Pemanggil bersama kini meneruskan `{}` sehingga sandi hasil sebelumnya tetap di klien dan tidak ikut request berikutnya; perilaku formulir dan pemeriksaan server tetap sama.

Regresi browser sebelum perubahan **0/1 lulus**: request aktivasi ulang terbukti berisi sandi reset sebelumnya. Assert hanya mencetak boolean. Kedua skenario akun desktop/mobile sesudah perbaikan lulus dalam **suite akhir 48/48**, diikuti build terisolasi yang lulus. Hasil aktual mengikuti [VERIFICATION.md](VERIFICATION.md). Tidak ada perubahan hash, sesi, peran, aturan admin terakhir, audit atau publikasi. Trace/log lama tetap privat dan dapat memuat kredensial sintetis; ini belum audit seluruh log produksi.

## Validasi akun — 4 November 2026

`userAction` sebelumnya mengubah setiap nilai akses selain string `true` menjadi `false`, termasuk nilai rusak/berkas/kolom hilang. Regresi request sebelum perubahan membuktikan akun sintetis menjadi nonaktif saat nilai rusak dikirim; bukan insiden pada data pengguna. Sekarang hanya string `true`/`false` yang dikonversi, sedangkan sisanya diteruskan ke skema boolean dan ditolak. Pemeriksaan sesi/admin tetap mendahului pemrosesan akun. Schema layanan mengirim pesan kolom, dan larangan perubahan admin aktif terakhir tetap diperiksa dalam transaksi yang sama.

Tiga regresi baru membuktikan batas nama/email, berkas, role/akses tidak sah, identitas/operasi rusak, email duplikat tanpa membedakan kapital, serta penolakan admin terakhir karena role/akses/keduanya. Snapshot pengguna/kredensial/sesi/audit tetap sama pada penolakan; request tanpa sesi/editor/penyetuju/sesi admin dicabut juga ditolak. **43/43 integrasi, 18/18 unit dan typecheck lulus**. **4/4 browser terarah dan 38/38 suite penuh lulus**, termasuk pencabutan sesi, reset sandi dan penolakan sandi lama; build terisolasi sesudahnya lulus. Bukti serta batas mengikuti [VERIFICATION.md](VERIFICATION.md). Ini belum menguji persaingan admin pada PostgreSQL native, origin Server Actions lintas situs, atau audit independen.

## Validasi ganti sandi — 4 November 2026

`passwordAction` kini memeriksa tiga nilai FormData sebagai string, menolak berkas, lalu meneruskan validasi panjang/sandi lama ke layanan. Konfirmasi berbeda dan kesalahan layanan mempunyai penanda kolom; state action hanya mengembalikan pesan/identitas kolom, tanpa sandi. Batas 12–128 karakter, syarat berbeda, pemeriksaan sesi, batas lima permintaan per 15 menit, hash, pencabutan sesi dan audit tetap berlaku.

Dua regresi baru membuktikan penolakan mempertahankan akun, hash, sesi, kewajiban ganti sandi dan jumlah audit; counter laju sengaja tidak termasuk snapshot tersebut. Input 11/129 karakter, sandi sama, sandi lama salah, konfirmasi berbeda, berkas pada setiap input, tanpa sesi dan sesi dicabut diperiksa. Keberhasilan tepat 12 karakter diuji di layanan; Server Action juga mengganti sandi sementara, mencabut sesi, dan mengarahkan ke login di server tanpa menaruh rahasia pada URL. Redirect berada di luar catch agar tidak diubah menjadi pesan kegagalan. **40/40 integrasi, 18/18 unit dan typecheck lulus sesudah koreksi redirect**. Pengulangan browser terarah **2/2 lulus**, termasuk penolakan sandi lama dan login sandi baru. Hasil suite penuh/build terbaru mengikuti [VERIFICATION.md](VERIFICATION.md); tes request internal Next bukan bukti perlindungan origin HTTP atau pengumuman pembaca layar.

## Temuan yang diperbaiki

**Biaya hash sandi terlalu rendah terhadap profil scrypt OWASP saat ini.** `src/lib/passwords.ts` sebelumnya memanggil `crypto.scrypt` tanpa opsi, sehingga memakai `N=16384`, `r=8`, `p=1`. Jika hash database bocor, biaya tebak sandi luring lebih rendah daripada profil minimum yang direkomendasikan. Nilai bawaan tersebut tercantum pada [dokumentasi Node.js 22](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback); OWASP menyediakan profil `N=16384`, `r=8`, `p=5` sebagai pilihan dengan kebutuhan memori sekitar 16 MiB. [Panduan penyimpanan sandi OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

Perbaikan mempertahankan scrypt bawaan Node dan salt acak 16 byte, menaikkan `p` menjadi 5 dengan `maxmem=32 MiB`, serta menyimpan penanda `scrypt-16384-8-5`. Verifikator menerima hanya format baru tersebut dan format lama `scrypt`; parameter bebas dan kolom tambahan ditolak. Format lama tetap terbaca, lalu diubah ke profil baru pada login berhasil dalam transaksi yang sama dengan pembuatan sesi. Kegagalan pembuatan sesi membatalkan perubahan hash. Reset dan penggantian sandi langsung menghasilkan profil baru.

Verifikasi hash lama menambahkan derivasi `p=4` setelah pemeriksaan `p=1`, sehingga pekerjaan derivasi total mendekati profil baru `p=5`. Akun yang tidak ditemukan memakai hash dummy berformat baru. Ini menghindari perbedaan kasar biaya hash lama dan baru, tetapi bukan bukti bahwa seluruh respons login memiliki waktu yang identik. Akun lama yang belum masuk atau mereset sandi masih menyimpan hash lama.

Biaya CPU meningkat. Pemeriksaan sintetis lokal tiga hash berurutan menghasilkan 304, 269, dan 284 ms; empat verifikasi bersamaan selesai dalam 498 ms dan semuanya benar. Angka ini hanya pengukuran pada host pengerjaan, bukan hasil kapasitas staging. Memori sekitar 16 MiB berlaku per derivasi yang sedang dieksekusi; `maxmem` tidak membatasi total memori proses atau panjang antrean permintaan. Uji beban dan batas reverse proxy pada host nyata tetap diperlukan.

## Kontrol yang diperiksa

| Area | Implementasi yang diperiksa | Bukti/batas |
| --- | --- | --- |
| Login | Respons kredensial salah/nonaktif/tidak dikenal sama; registrasi publik ditolak; akun dinormalisasi; hash sandi tidak dikirim ke klien | Regresi fungsi autentikasi dan handler auth langsung |
| Sesi | Token Better Auth disimpan sebagai SHA-256; cookie bertanda tangan, HttpOnly, SameSite=Lax, Secure pada produksi; batas absolut delapan jam tanpa refresh/cache cookie | Regresi atribut/tanda tangan cookie, hash token tidak dapat dipakai ulang, expiry, sesi hilang/nonaktif, dan logout yang memeriksa pencabutan |
| Peran | `requireStaff` membaca status dan peran akun dari database; `checkActor` memeriksa ulang akun dalam transaksi; sandi sementara membatasi fitur CMS | Regresi sesi/peran serta suite integrasi workflow/akun |
| Pencabutan | Reset sandi, perubahan peran/status, dan penggantian sandi menghapus sesi | Pemeriksaan `account-service.ts`; integrasi reset/perubahan peran/nonaktif dan penghapusan sesi |
| Origin | Handler mutasi auth/media/FAQ memanggil `assertOrigin`; alias localhost hanya diterima saat pengembangan; Server Actions memakai pemeriksaan framework | Regresi origin kosong/asing/protokol/port dan handler auth; perlindungan Server Actions belum diuji lewat HTTP/browser |
| Pembatasan laju | Counter di PostgreSQL memakai upsert atomik; login 5 per pasangan akun/jaringan dan 50 per jaringan dalam 15 menit; FAQ 30 per menit | Regresi batas/pemulihan login dan tes counter persisten; forwarding IP produksi belum diuji |
| Media | Unggahan JPEG/PNG/WebP diam ≤5 MB/20 MP; diproses ulang ke WebP; storage acak di luar `public`; akses draf membutuhkan editor/penyetuju yang sudah mengganti sandi; respons no-store | Unit sanitasi dan integrasi relasi media bersama/penarikan; belum ada bukti request HTTP media pada hosting |
| Publikasi | Editor dan admin tidak dapat menerbitkan; seluruh kontributor revisi dilarang menerbitkan/mengembalikan sesudah perubahan peran; hanya revisi disetujui yang ditunjuk publik; proyeksi dan audit satu transaksi | Integrasi siklus revisi, kolaborasi editor/pengaju berbeda, upaya bypass, rollback audit, arsip, penarikan, dan impor yang tetap draf |
| Pemulihan admin | CLI privat hanya untuk admin aktif; operator/alasan wajib; reset, pencabutan sesi, wajib ganti sandi, dan audit satu transaksi | Regresi rollback audit, ID/peran tetap, penolakan nonadmin/nonaktif, serta non-TTY ditolak sebelum membuka DB; belum latihan petugas staging |
| Konten/error | Markdown dirender melalui elemen React tanpa raw HTML; URL dibatasi; kueri database berparameter; respons kegagalan tidak memuat stack/SQL/hash/token | Unit URL/Markdown, integrasi kueri berbahaya, dan pemeriksaan kode handler/error |

`TRUSTED_IP_HEADER` kosong menyebabkan semua permintaan memakai satu bucket jaringan konservatif; header pengunjung diabaikan. Jika diisi, keamanan pembatasan IP bergantung pada proxy yang menimpa header dan menutup akses langsung ke aplikasi. Regresi membuktikan pemilihan header pada fungsi `clientKey`, bukan konfigurasi jaringan deployment. Kebijakan ini harus diperiksa bersama penanggung jawab hosting.

`RevisionContributor` mencatat setiap pembuat/penyunting/pengaju dalam transaksi workflow. Pemeriksaan keputusan menolak `authorId`, `submitterId`, maupun pasangan pengguna/revisi dalam tabel tersebut. Revisi baru mempunyai daftar kontributor sendiri. Backfill migrasi hanya dapat memulihkan pembuat, pengaju, dan penyunting yang tercatat pada audit yang masih tersedia; kontribusi historis tanpa catatan tidak dapat disimpulkan.

## Keputusan autentikasi

Better Auth 1.7.13 dipakai melalui `better-auth/minimal`, adapter Prisma, dan API server `signInEmail`, `getSession`, serta `signOut`. `src/lib/auth.ts` mempertahankan facade aplikasi bagi Server Actions dan rute POST login/logout. Registrasi ditolak server; seluruh handler/endpoint library tidak dipasang. Karena antarmuka HTTP terbatas, ini bukan implementasi seluruh kontrak HTTP Better Auth. MFA, SSO, dan pemulihan publik tidak ditambahkan.

`sessionAdapter` menghash token sebelum penyimpanan/pencarian/penghapusan, lalu mengembalikan token asli hanya kepada pemanggil library yang memerlukannya. Wrapper sengaja dibatasi pada tiga API itu. Jangan membuka handler penuh atau API sesi baru tanpa meninjau penanganan token. Logout library bersifat best effort; facade memastikan sesi benar-benar hilang sebelum melaporkan berhasil.

Rate limiter persisten berada di `authenticate()` untuk kedua jalur masuk; limiter library dinonaktifkan. Login mengunci akun, memverifikasi kredensial, meningkatkan hash lama bila diperlukan, membuat sesi, dan memulihkan counter dalam transaksi; cookie baru diterapkan setelah commit. Status/peran dibaca dari database setiap request, tanpa cookie cache. Kewajiban ganti sandi serta pencabutan saat reset/peran/status tetap berlaku.

Migrasi memindahkan hash lama ke `Account.password`, mengosongkan kolom warisan, dan mencabut semua sesi dalam satu blok SQL `DO` bersama penambahan skema/audit. ID/peran/konten tetap; sandi lama tidak direset. `BETTER_AUTH_SECRET` wajib minimal 32 karakter dan dibuat launcher bila belum ada; jangan cetak atau mengganti rahasia yang sudah dikonfigurasi. Prosedur maintenance dan pemulihan ada di [OPERASIONAL.md](OPERASIONAL.md).

## Verifikasi dan gerbang tersisa

Lanjutan 3 November menambah satu regresi `decisionAction`/`withdrawAction` dengan login Better Auth dan cookie sesi nyata pada tiga akun sintetis. Pemeriksaan mencakup penerusan kesalahan kolom, penolakan catatan berupa berkas/ID rusak, akses tanpa sesi/editor/admin, serta sesi penyetuju yang dicabut. Snapshot item, revisi, pencarian, dan jumlah audit tetap sama ketika tindakan ditolak, termasuk penarikan dengan arsip. **Suite ketika itu 38/38 dan typecheck lulus**; kode produk tidak berubah pada penambahan tes ini. Tes tidak mencakup respons sukses/revalidasi cache, transport HTTP, atau perlindungan origin Server Actions.

Regresi keamanan berada pada `tests/security.test.ts` dan `tests/integration/security.ts`, yang diregistrasikan pada suite integrasi agar berbagi satu database memori terisolasi. Harness request memakai internal Next.js versi yang dikunci untuk menjalankan `cookies()` nyata tanpa membuka socket. Pemeriksaan tersebut bukan E2E HTTP atau browser.

Hasil tahap 2: `npm test` 18/18 lulus, `npm run test:integration` 36/36 lulus, dan `npm run typecheck` lulus. Kasus baru mencakup kredensial Better Auth, tanda tangan cookie, pemulihan admin, migrasi/rollback, kontributor, dan lazy-init PGlite. Hasil browser/build akhir mengikuti [VERIFICATION.md](VERIFICATION.md). Integrasi tetap mengeluarkan peringatan antrean `pg` yang sudah diketahui; tidak dilakukan pengujian PostgreSQL native.

Yang belum dibuktikan: audit independen/pentest, instalasi HTTPS/proxy/header IP dan cache nyata, pengujian beban login terhadap CPU/memori/antrean, keamanan serta retensi log/backup, kebijakan instansi termasuk MFA, serta latihan pemulihan admin bersama petugas. Browser lokal memerlukan eksekusi di luar sandbox; kelulusannya tidak membuktikan konfigurasi produksi. Gerbang UAT, staging, persetujuan substansi, backup/pemulihan, serta persetujuan peluncuran tetap berlaku.
