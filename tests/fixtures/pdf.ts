// PDF sintetis dengan xref nyata; tidak mengambil materi atau data pengguna.
export function pdfFixture(pages = ["Pasal 1. Sumber sintetis untuk pemeriksaan ekstraksi dokumen."], javascript = false) {
  const escape = (value: string) => value.replace(/[\\()]/g, "\\$&");
  const fontId = 3 + pages.length * 2, actionId = fontId + 1;
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R${javascript ? ` /OpenAction ${actionId} 0 R` : ""} >>`,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] >>`
  ];
  for (const [index, text] of pages.entries()) {
    const stream = `BT /F1 12 Tf 50 740 Td (${escape(text)}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  if (javascript) objects.push("<< /S /JavaScript /JS (throw new Error\\(\\\"Tidak boleh dieksekusi\\\"\\)) >>");
  let pdf = "%PDF-1.7\n"; const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
