import { parentPort, workerData } from "node:worker_threads";
import { createHash } from "node:crypto";

// Dokumen diperlakukan sebagai data; worker tidak boleh mengambil URL dari berkas.
globalThis.fetch = async () => { throw new Error("Network disabled for PDF extraction."); };
const hash = value => createHash("sha256").update(value).digest("hex");
let task;
try {
  const { getDocument, version } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  task = getDocument({ data: workerData, stopAtErrors: true, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, useWasm: false, verbosity: 0 });
  const pdf = await task.promise;
  const { info } = await pdf.getMetadata();
  if (info.EncryptFilterName) throw new Error("encrypted");
  if (pdf.numPages > 500 || pdf.numPages < 1) throw new Error("pages");
  if (pdf.isPureXfa || await pdf.hasJSActions()) throw new Error("active");
  const pages = []; let total = 0;
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent({ disableNormalization: true });
    const text = content.items.filter(item => "str" in item).map(item => item.str + (item.hasEOL ? "\n" : " ")).join("").replace(/\u0000/g, "").trim();
    total += text.length;
    if (text.length > 100000 || total > 5000000) throw new Error("text-limit");
    pages.push({ number, text, checksum: hash(text) });
    page.cleanup();
  }
  // shortcut: halaman dengan kurang dari 20 huruf memblokir pengajuan, kalibrasikan setelah PDF resmi tersedia.
  const needsOcr = pages.some(page => (page.text.match(/\p{L}/gu)?.length ?? 0) < 20);
  parentPort.postMessage({ pages, needsOcr, parserVersion: `pdfjs-${version}-lines-v1` });
} catch (error) {
  parentPort.postMessage({ error: error?.name === "PasswordException" ? "encrypted" : ["encrypted", "pages", "active", "text-limit"].includes(error?.message) ? error.message : "invalid" });
} finally { await task?.destroy(); }
