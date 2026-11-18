import { db } from "../src/lib/db";
import { runIndexJobs } from "../src/lib/knowledge";

try {
  const { chunked, embedded, pending } = await runIndexJobs();
  console.log(`${chunked} revisi sumber dipotong; ${embedded} teks unik di-embed; ${pending} menunggu konfigurasi key/anggaran atau retry. Pencarian kata kunci memakai potongan yang tersedia.`);
} catch (error) {
  console.error(`Indeks gagal: ${error instanceof Error ? error.message : "kesalahan tidak dikenal"} Jalankan ulang setelah penyebabnya diperbaiki; potongan yang selesai tidak dibayar ulang.`);
  process.exitCode = 1;
} finally { await db.$disconnect(); const { closeLocalDatabase } = await import("../src/lib/local-db"); await closeLocalDatabase(); }
