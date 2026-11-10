import { parseArgs } from "node:util";
import { AppError } from "../src/lib/errors";

const { values } = parseArgs({ options: { email: { type: "string" }, operator: { type: "string" }, reason: { type: "string" } } });
if (!values.email || !values.operator || !values.reason) throw new Error('Gunakan admin:recover -- --email "<email-admin>" --operator "<petugas-teknis>" --reason "<alasan-pemulihan>".');
if (!process.stdout.isTTY) throw new Error("Jalankan pemulihan dari terminal privat interaktif agar sandi sementara tidak masuk log/pipeline.");

const { db } = await import("../src/lib/db");
try {
  const { recoverAdmin } = await import("../src/lib/account-service");
  const { password } = await recoverAdmin(values);
  process.stdout.write(`Admin dipulihkan; seluruh sesinya dicabut. Sandi sementara (ditampilkan sekali): ${password}\n`);
} catch (error) {
  console.error(error instanceof AppError ? error.message : "Pemulihan gagal; tidak ada sandi ditampilkan. Tinjau koneksi, migrasi, dan audit melalui kanal teknis privat.");
  process.exitCode = 1;
} finally {
  try { await db.$disconnect(); }
  finally { const { closeLocalDatabase } = await import("../src/lib/local-db"); await closeLocalDatabase(); }
}
