import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { mediaDirectory, publicMedia } from "@/lib/media";
import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; if (!z.uuid().safeParse(id).success) throw new AppError("Gambar tidak ditemukan.", 404);
    const visible = await publicMedia(id);
    if (!visible) {
      const staff = await getStaff();
      if (!staff || staff.mustChangePassword || !["editor", "approver"].includes(staff.role)) throw new AppError("Gambar tidak ditemukan.", 404);
    }
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset || !/^[a-f0-9]{48}\.webp$/.test(asset.storageKey)) throw new AppError("Gambar tidak ditemukan.", 404);
    const bytes = await readFile(resolve(mediaDirectory(), asset.storageKey)).catch(() => null);
    if (!bytes) throw new AppError("Gambar tidak ditemukan.", 404);
    return new Response(bytes, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return errorResponse(error); }
}
