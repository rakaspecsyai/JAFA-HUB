# Petunjuk proyek Jafa Hub

- Gunakan bahasa Indonesia untuk komunikasi dengan pengguna.
- Pada awal sesi, baca `CONTEXT.md` dan `README.md`. Baca bagian terkait dalam `PRD-Jafa-Hub.md` sebelum mengubah perilaku produk. Implementasi sudah ada; lanjutkan dari keadaan aktual.
- `CONTEXT.md` adalah catatan serah-terima, bukan pengganti pemeriksaan kode. Setelah perubahan bermakna, perbarui status, keputusan, hasil verifikasi, dan pekerjaan tersisa tanpa menyimpan rahasia atau data pribadi.
- Pertahankan pemisahan editor, penyetuju, dan admin akun; larangan menyetujui revisi sendiri; serta publikasi hanya melalui revisi yang disetujui. Materi impor tetap draf sampai disetujui.
- Jangan hapus `.local` untuk mengulang setup: direktori ini menyimpan data pengembangan. Database PGlite lokal hanya boleh dibuka satu proses pada satu waktu.
- Ikuti pola Next.js App Router, TypeScript, dan CSS Modules yang sudah ada. Jalankan pemeriksaan yang sesuai perubahan; daftar perintah dan batas hasil sebelumnya tersedia di `docs/VERIFICATION.md`.
- Jangan menyatakan E2E, UAT, deployment, atau kesiapan produksi berhasil tanpa bukti aktual. Catat perbedaan terhadap PRD dan keterbatasan verifikasi.
