import { z } from "zod";
import { getStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDocumentFile } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, staff = await getStaff();
    if (!z.uuid().safeParse(id).success || !staff || staff.mustChangePassword || !["editor", "approver"].includes(staff.role)) throw new AppError("Dokumen tidak ditemukan.", 404);
    const asset = await db.documentAsset.findUnique({ where: { id } });
    if (!asset) throw new AppError("Dokumen tidak ditemukan.", 404);
    return new Response(await readDocumentFile(asset), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="dokumen-${id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) { return errorResponse(error); }
}
