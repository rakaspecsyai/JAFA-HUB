"use client";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import { decisionAction, withdrawAction, type ActionState } from "@/lib/admin-actions";
import { useContentAction } from "./content-action";
import s from "./admin.module.css";
export function ActionMessage({ state, ref, contentHref }: { state: ActionState; ref?: Ref<HTMLParagraphElement>; contentHref?: string }) {
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (!state.fields && [401, 403, 409].includes(state.status ?? 0)) messageRef.current?.focus(); }, [state]);
  return state.message ? <p ref={ref ?? messageRef} role="status" tabIndex={-1} className={`${s.message} ${state.ok ? s.success : s.error}`}>
    {state.message}
    {state.status === 401 && <> <a className={s.linkButton} href="/admin/login" target="_blank" rel="noopener noreferrer">Masuk kembali (tab baru)</a>. Setelah masuk, kembali ke formulir ini untuk mencoba lagi.</>}
    {state.status === 403 && <> <a className={s.linkButton} href="/admin" target="_blank" rel="noopener noreferrer">Periksa akses akun (tab baru)</a>.</>}
    {state.status === 409 && contentHref && <> <a className={s.linkButton} href={contentHref} target="_blank" rel="noopener noreferrer">Lihat versi tersimpan (tab baru)</a>. Masukan di halaman ini tetap tersedia.</>}
  </p> : null;
}
export function DecisionForm({ itemId, revisionId, version, contentHref, source = false }: { itemId: string; revisionId: string; version: number; contentHref: string; source?: boolean }) {
  const [state, action, pending] = useContentAction(decisionAction);
  const id = useId(); const noteRef = useRef<HTMLTextAreaElement>(null); const [note, setNote] = useState("");
  useEffect(() => { if (state.fields?.note) noteRef.current?.focus(); }, [state]);
  return <form action={action} className={s.form}>
    <h2>Keputusan pemeriksaan</h2><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="revisionId" value={revisionId} /><input type="hidden" name="version" value={version} />
    <label><span id={`${id}-label`}>Catatan keputusan</span><textarea ref={noteRef} name="note" value={note} onChange={event => setNote(event.target.value)} disabled={pending} maxLength={2000} aria-labelledby={`${id}-label`} aria-invalid={!!state.fields?.note} aria-describedby={`${id}-help${state.fields?.note ? ` ${id}-error` : ""}`} /><span className={s.formHelp} id={`${id}-help`}>Wajib diisi jika revisi dikembalikan. Maksimal 2.000 karakter.</span>{state.fields?.note && <span className="error-text" id={`${id}-error`}>{state.fields.note}</span>}</label>
    <div className={s.inlineButtons}><button className={s.button} name="decision" value="publish" disabled={pending}>{source ? "Setujui sumber PDF" : "Setujui & terbitkan"}</button><button className={`${s.button} ${s.secondary}`} name="decision" value="return" disabled={pending}>Kembalikan ke editor</button></div>{!state.ok && <ActionMessage state={state} contentHref={contentHref} />}
  </form>;
}
export function WithdrawForm({ itemId, publishedRevisionId, fixed, contentHref, source = false }: { itemId: string; publishedRevisionId: string; fixed: boolean; contentHref: string; source?: boolean }) {
  const [state, action, pending] = useContentAction(withdrawAction);
  const id = useId(); const noteRef = useRef<HTMLTextAreaElement>(null); const [note, setNote] = useState(""); const [archive, setArchive] = useState(false);
  useEffect(() => { if (state.fields?.note) noteRef.current?.focus(); }, [state]);
  // React meminta reset native setelah action, termasuk saat validasi ditolak.
  return <details className={s.panel}><summary>{source ? "Tarik sumber dari korpus" : "Tarik konten dari portal"}</summary><form action={action} onReset={event => event.preventDefault()} className={s.form} style={{ marginTop: 22 }}>
    <p className={s.formHelp}>{source ? "Sumber tidak lagi disetujui untuk tahap indeks. PDF dan riwayat tetap privat." : "Konten akan hilang dari halaman publik, pencarian, FAQ, dan asisten. Riwayat tetap tersimpan."}</p><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="publishedRevisionId" value={publishedRevisionId} />
    <label><span id={`${id}-label`}>Alasan penarikan</span><textarea ref={noteRef} name="note" value={note} onChange={event => setNote(event.target.value)} onFocus={event => event.currentTarget.scrollIntoView({ block: "center" })} disabled={pending} maxLength={2000} required aria-labelledby={`${id}-label`} aria-invalid={!!state.fields?.note} aria-describedby={`${id}-help${state.fields?.note ? ` ${id}-error` : ""}`} /><span className={s.formHelp} id={`${id}-help`}>Maksimal 2.000 karakter.</span>{state.fields?.note && <span className="error-text" id={`${id}-error`}>{state.fields.note}</span>}</label>
    {!fixed && <div className={s.checkRow}><label><input type="checkbox" name="archive" checked={archive} onChange={event => setArchive(event.target.checked)} disabled={pending} />Arsipkan setelah ditarik</label></div>}<button className={`${s.button} ${s.danger}`} disabled={pending}>{source ? "Tarik sumber PDF" : "Tarik konten"}</button>{!state.ok && <ActionMessage state={state} contentHref={contentHref} />}
  </form></details>;
}
