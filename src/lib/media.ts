import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "./db";
import { AppError } from "./errors";
import { checkActor } from "./content-service";
import type { Staff } from "./content-types";
export const mediaDirectory = () => resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIRECTORY ?? ".local/media");
export async function sanitizeImage(bytes: Uint8Array, mime: string) {
  if (bytes.length > 5 * 1024 * 1024 || !bytes.length) throw new AppError("Gambar maksimal 5 MB.", 413);
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new AppError("Gunakan gambar JPEG, PNG, atau WebP.");
  try {
    const image = sharp(bytes, { limitInputPixels: 20_000_000, failOn: "error" });
    const metadata = await image.metadata();
    const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[mime];
    if (metadata.format !== expected || !metadata.width || !metadata.height || metadata.width * metadata.height > 20_000_000 || (metadata.pages ?? 1) > 1) throw new AppError("Isi gambar atau dimensinya tidak sesuai. Batas 20 megapiksel; gunakan gambar diam.");
    const { data, info } = await image.rotate().webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Berkas tidak dapat dibaca sebagai gambar yang diizinkan.");
  }
}
export async function storeImage(actor: Staff, file: File, attribution: string) {
  if (!attribution.trim() || attribution.length > 1000) throw new AppError("Isi atribusi gambar sebelum mengunggah (maksimal 1.000 karakter).");
  const image = await sanitizeImage(new Uint8Array(await file.arrayBuffer()), file.type);
  const key = `${randomBytes(24).toString("hex")}.webp`;
  const directory = mediaDirectory(); await mkdir(directory, { recursive: true });
  const path = resolve(directory, key); await writeFile(path, image.data, { flag: "wx", mode: 0o600 });
  try {
    return await db.$transaction(async tx => {
      await checkActor(tx, actor, "editor");
      const asset = await tx.mediaAsset.create({ data: { storageKey: key, mime: "image/webp", size: image.data.length, width: image.width, height: image.height, attribution: attribution.trim(), uploadedBy: actor.id } });
      await tx.auditEvent.create({ data: { actorId: actor.id, actorName: actor.name, action: "content.media-upload", objectId: asset.id } });
      return asset;
    });
  } catch (error) { await unlink(path).catch(() => {}); throw error; }
}
export async function publicMedia(id: string) {
  return !!await db.revisionMedia.findFirst({ where: { mediaId: id, revision: { status: "approved", publishedFor: { is: { archived: false } } } }, select: { mediaId: true } });
}
