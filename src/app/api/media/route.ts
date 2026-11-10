import { requireStaff } from "@/lib/auth";
import { storeImage } from "@/lib/media";
import { AppError } from "@/lib/errors";
import { assertOrigin, errorResponse, readBody } from "@/lib/http";
export async function POST(request: Request) {
  try {
    assertOrigin(request); const staff = await requireStaff(["editor"]);
    const bytes = await readBody(request, 6 * 1024 * 1024);
    const form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("file"); if (!(file instanceof File)) throw new AppError("Pilih satu berkas gambar.");
    const asset = await storeImage(staff, file, String(form.get("attribution") ?? ""));
    return Response.json({ id: asset.id, width: asset.width, height: asset.height }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
