import { Worker } from "node:worker_threads";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "./db";
import { mediaDirectory } from "./media";
import { assertRole, checkActor } from "./content-service";
import { AppError } from "./errors";
import type { Staff } from "./content-types";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
type Extraction = { pages: { number: number; text: string; checksum: string }[]; needsOcr: boolean; parserVersion: string };
const parserState = globalThis as unknown as { jafaPdfWorkers?: number };
export async function extractPdf(bytes: Uint8Array): Promise<Extraction> {
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) throw new AppError("PDF maksimal 20 MB.", 413);
  if (!/^%PDF-(?:1\.[0-7]|2\.0)\b/.test(Buffer.from(bytes.subarray(0, 16)).toString("ascii")) || !/%%EOF\s*$/.test(Buffer.from(bytes.subarray(-1024)).toString("latin1"))) throw new AppError("Berkas tidak dapat dibaca sebagai PDF yang sah.");
  if ((parserState.jafaPdfWorkers ?? 0) >= 2) throw new AppError("Pemroses PDF sedang penuh. Coba kembali beberapa saat lagi.", 503);
  parserState.jafaPdfWorkers = (parserState.jafaPdfWorkers ?? 0) + 1;
  let worker: Worker | undefined;
  try {
    worker = new Worker(resolve(/* turbopackIgnore: true */ "src/lib/pdf-worker.mjs"), { workerData: bytes, resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32 }, stdout: true, stderr: true });
    // Peringatan parser dapat berisi teks PDF; jangan teruskan ke log aplikasi.
    worker.stdout.resume(); worker.stderr.resume();
    return await new Promise<Extraction>((accept, reject) => {
      const timer = setTimeout(() => reject(new AppError("PDF melewati batas waktu pemrosesan. Gunakan PDF teks yang lebih kecil.")), 20000);
      const finish = (error?: AppError, value?: Extraction) => { clearTimeout(timer); if (error) reject(error); else accept(value!); };
      worker!.once("message", (result: Extraction & { error?: string }) => {
        if (!result.error) return finish(undefined, result);
        const messages: Record<string, string> = { encrypted: "PDF terenkripsi tidak didukung. Gunakan salinan resmi tanpa enkripsi.", pages: "PDF maksimal 500 halaman.", active: "PDF dengan JavaScript atau formulir XFA tidak didukung.", "text-limit": "Hasil teks PDF terlalu besar. Gunakan dokumen yang lebih kecil." };
        finish(new AppError(messages[result.error] ?? "Berkas tidak dapat dibaca sebagai PDF yang sah."));
      });
      worker!.once("error", () => finish(new AppError("Pemrosesan PDF gagal. Gunakan PDF teks yang lebih kecil atau periksa berkasnya.")));
      worker!.once("exit", () => finish(new AppError("Pemrosesan PDF berhenti sebelum selesai.")));
    });
  } finally { try { await worker?.terminate(); } finally { parserState.jafaPdfWorkers!--; } }
}
export async function storeDocument(actor: Staff, file: File) {
  assertRole(actor, "editor");
  if (file.type !== "application/pdf") throw new AppError("Gunakan berkas PDF.");
  if (file.size > MAX_PDF_BYTES) throw new AppError("PDF maksimal 20 MB.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer()), extraction = await extractPdf(bytes);
  const checksum = createHash("sha256").update(bytes).digest("hex"), storageKey = `${randomBytes(24).toString("hex")}.pdf`;
  const directory = resolve(mediaDirectory(), "documents"); await mkdir(directory, { recursive: true });
  const path = resolve(directory, storageKey); await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  try {
    return await db.$transaction(async tx => {
      await checkActor(tx, actor, "editor");
      const { pages, ...metadata } = extraction;
      const asset = await tx.documentAsset.create({ data: { storageKey, checksum, size: bytes.length, pageCount: pages.length, uploadedBy: actor.id, ...metadata, pages: { create: pages } } });
      await tx.auditEvent.create({ data: { actorId: actor.id, actorName: actor.name, action: "content.document-upload", objectId: asset.id } });
      return { id: asset.id, pageCount: asset.pageCount, needsOcr: asset.needsOcr };
    });
  } catch (error) { await unlink(path).catch(() => {}); throw error; }
}
export async function readDocumentFile(asset: { storageKey: string; checksum: string }) {
  if (!/^[a-f0-9]{48}\.pdf$/.test(asset.storageKey)) throw new AppError("Dokumen tidak ditemukan.", 404);
  const bytes = await readFile(resolve(mediaDirectory(), "documents", asset.storageKey)).catch(() => null);
  if (!bytes || createHash("sha256").update(bytes).digest("hex") !== asset.checksum) throw new AppError("Dokumen tidak dapat dibaca. Hubungi pengelola.", 404);
  return bytes;
}
