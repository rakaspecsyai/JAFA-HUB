import { z } from "zod";
import { getStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, staff = await getStaff();
    if (!z.uuid().safeParse(id).success || !staff || staff.mustChangePassword || !["editor", "approver"].includes(staff.role)) throw new AppError("Dokumen tidak ditemukan.", 404);
    const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 500) throw new AppError("Nomor halaman tidak sesuai.");
    const asset = await db.documentAsset.findUnique({ where: { id }, select: { id: true, checksum: true, size: true, pageCount: true, needsOcr: true, parserVersion: true, pages: { where: { number: page }, select: { number: true, text: true, checksum: true } } } });
    if (!asset || !asset.pages.length) throw new AppError("Halaman dokumen tidak ditemukan.", 404);
    return Response.json(asset, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
