import { requireStaff } from "@/lib/auth";
import { MAX_PDF_BYTES, storeDocument } from "@/lib/documents";
import { consumeRate } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { assertOrigin, errorResponse, readBody } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertOrigin(request); const actor = await requireStaff(["editor"]);
    await consumeRate(`pdf:${actor.id}`, 10, 900);
    const bytes = await readBody(request, MAX_PDF_BYTES + 1024 * 1024);
    const form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("file"); if (!(file instanceof File)) throw new AppError("Pilih satu berkas PDF.");
    return Response.json(await storeDocument(actor, file), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
