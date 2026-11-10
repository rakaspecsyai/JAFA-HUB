export class AppError extends Error {
  constructor(message: string, public status = 400, public fields?: Record<string, string>) { super(message); }
}
export function publicError(error: unknown) {
  if (error instanceof AppError) return { message: error.message, fields: error.fields };
  console.error(JSON.stringify({ at: new Date().toISOString(), category: "application-failure", requestId: crypto.randomUUID() }));
  return { message: "Permintaan belum berhasil disimpan. Masukan Anda tetap tersedia; silakan coba lagi." };
}
