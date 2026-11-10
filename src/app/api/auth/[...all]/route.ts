import { z } from "zod";
import { authenticate, logout } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertOrigin, errorResponse, readJson } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ all: string[] }> }) {
  try {
    assertOrigin(request); const path = (await params).all.join("/");
    if (path.startsWith("sign-up") || path === "register") throw new AppError("Registrasi publik tidak tersedia.", 403);
    if (path === "sign-out") { await logout(); return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); }
    if (path !== "sign-in/email") throw new AppError("Layanan tidak ditemukan.", 404);
    const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) }).safeParse(await readJson(request));
    if (!input.success) throw new AppError("Email atau sandi tidak sesuai.", 401);
    const result = await authenticate(input.data.email, input.data.password, request.headers);
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
