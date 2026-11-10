import { AppError } from "./errors";
export async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw new AppError("Ukuran permintaan terlalu besar.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Permintaan tidak lengkap.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new AppError("Ukuran permintaan terlalu besar.", 413); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  return buffer;
}
export async function readJson(request: Request) {
  const bytes = await readBody(request, 8192);
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError("Format permintaan tidak sesuai."); }
}
export function assertOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL ?? "http://localhost:3000");
  const origin = request.headers.get("origin");
  if (origin === expected.origin) return;
  if (process.env.NODE_ENV !== "production" && origin) {
    try {
      const actual = new URL(origin);
      if (["localhost", "127.0.0.1"].includes(expected.hostname) && ["localhost", "127.0.0.1"].includes(actual.hostname) && actual.port === expected.port && actual.protocol === expected.protocol) return;
    } catch { /* Invalid origins are rejected below. */ }
  }
  throw new AppError("Asal permintaan tidak diizinkan.", 403);
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store", ...(error.status === 429 ? { "Retry-After": "60" } : {}) } });
  console.error(JSON.stringify({ at: new Date().toISOString(), category: "request-failure", requestId: crypto.randomUUID() }));
  return Response.json({ error: "Layanan sedang mengalami gangguan. Silakan coba kembali." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
