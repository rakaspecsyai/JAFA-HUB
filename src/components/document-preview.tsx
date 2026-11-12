"use client";
import { useEffect, useId, useRef, useState } from "react";
import s from "./admin.module.css";

type Document = { checksum: string; size: number; pageCount: number; needsOcr: boolean; parserVersion: string; pages: { number: number; text: string }[] };
export function DocumentPreview({ id }: { id: string }) {
  const label = useId(), [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const text = useRef<HTMLPreElement>(null), lastPage = useRef(1);
  const [state, setState] = useState<{ document?: Document; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController(); setState({});
    fetch(`/api/documents/${id}?page=${page}`, { signal: controller.signal }).then(async response => {
      const value = await response.json(); if (!response.ok) throw new Error(value.error ?? "Pratinjau PDF belum dapat dimuat.");
      if (!controller.signal.aborted) setState({ document: value });
    }).catch(error => { if (!controller.signal.aborted) setState({ error: error instanceof Error ? error.message : "Pratinjau PDF belum dapat dimuat." }); });
    return () => controller.abort();
  }, [id, page, retry]);
  const document = state.document;
  useEffect(() => { if (document && document.pages[0].number !== lastPage.current) { lastPage.current = document.pages[0].number; text.current?.focus(); } }, [document]);
  return <section className={s.form} aria-labelledby={label}>
    <h3 id={label}>Hasil ekstraksi PDF</h3>
    <p className={s.formHelp}>PDF tetap privat. Nomor di bawah adalah halaman berkas PDF, dapat berbeda dari nomor tercetak. Cocokkan teks, tabel dan lampiran dengan dokumen asli; ekstraksi tidak menjamin susunan kolom atau tabel.</p>
    <a className={s.linkButton} href={`/api/documents/${id}/file`} target="_blank" rel="noopener noreferrer">Unduh PDF untuk pemeriksaan</a>
    {!document && !state.error && <p role="status">Memuat halaman PDF…</p>}
    {state.error && <div><p role="alert" className="error-text">{state.error}</p><button type="button" className={s.linkButton} onClick={() => setRetry(value => value + 1)}>Coba muat lagi</button></div>}
    {document && <>
      <p className={s.formHelp}>{document.pageCount} halaman · {new Intl.NumberFormat("id-ID").format(document.size)} byte<br />SHA-256: <span className={s.checksum}>{document.checksum}</span></p>
      {document.needsOcr && <p className={`${s.message} ${s.error}`}>Ada halaman tanpa teks yang memadai. Dokumen memerlukan OCR atau pemeriksaan sebelum dapat diajukan. Unggah ulang hasil PDF teks setelah diperbaiki.</p>}
      <nav className={s.inlineButtons} aria-label="Halaman ekstraksi PDF">
        <button type="button" className={s.linkButton} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Halaman sebelumnya</button>
        <span role="status">Halaman PDF {page} dari {document.pageCount}</span>
        <button type="button" className={s.linkButton} disabled={page === document.pageCount} onClick={() => setPage(value => value + 1)}>Halaman berikutnya</button>
      </nav>
      <pre ref={text} className={s.documentText} role="region" aria-label={`Teks halaman PDF ${page}`} tabIndex={0}>{document.pages[0].text || "Tidak ada teks yang berhasil diekstrak pada halaman ini."}</pre>
    </>}
  </section>;
}
