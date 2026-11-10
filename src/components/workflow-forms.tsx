"use client";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import { decisionAction, withdrawAction, type ActionState } from "@/lib/admin-actions";
import { useContentAction } from "./content-action";
import s from "./admin.module.css";
export function ActionMessage({ state, ref }: { state: ActionState; ref?: Ref<HTMLParagraphElement> }) {
  return state.message ? <p ref={ref} role="status" tabIndex={-1} className={`${s.message} ${state.ok ? s.success : s.error}`}>{state.message}</p> : null;
}
export function DecisionForm({ itemId, revisionId, version }: { itemId: string; revisionId: string; version: number }) {
  const [state, action, pending] = useContentAction(decisionAction);
  const id = useId(); const noteRef = useRef<HTMLTextAreaElement>(null); const [note, setNote] = useState("");
  useEffect(() => { if (state.fields?.note) noteRef.current?.focus(); }, [state]);
  return <form action={action} className={s.form}>
    <h2>Keputusan pemeriksaan</h2><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="revisionId" value={revisionId} /><input type="hidden" name="version" value={version} />
    <label><span id={`${id}-label`}>Catatan keputusan</span><textarea ref={noteRef} name="note" value={note} onChange={event => setNote(event.target.value)} disabled={pending} maxLength={2000} aria-labelledby={`${id}-label`} aria-invalid={!!state.fields?.note} aria-describedby={`${id}-help${state.fields?.note ? ` ${id}-error` : ""}`} /><span className={s.formHelp} id={`${id}-help`}>Wajib diisi jika revisi dikembalikan. Maksimal 2.000 karakter.</span>{state.fields?.note && <span className="error-text" id={`${id}-error`}>{state.fields.note}</span>}</label>
    <div className={s.inlineButtons}><button className={s.button} name="decision" value="publish" disabled={pending}>Setujui & terbitkan</button><button className={`${s.button} ${s.secondary}`} name="decision" value="return" disabled={pending}>Kembalikan ke editor</button></div>{!state.ok && <ActionMessage state={state} />}
  </form>;
}
export function WithdrawForm({ itemId, publishedRevisionId, fixed }: { itemId: string; publishedRevisionId: string; fixed: boolean }) {
  const [state, action, pending] = useContentAction(withdrawAction);
  const id = useId(); const noteRef = useRef<HTMLTextAreaElement>(null); const [note, setNote] = useState(""); const [archive, setArchive] = useState(false);
  useEffect(() => { if (state.fields?.note) noteRef.current?.focus(); }, [state]);
  // React meminta reset native setelah action, termasuk saat validasi ditolak.
  return <details className={s.panel}><summary>Tarik konten dari portal</summary><form action={action} onReset={event => event.preventDefault()} className={s.form} style={{ marginTop: 22 }}>
    <p className={s.formHelp}>Konten akan hilang dari halaman publik, pencarian, FAQ, dan asisten. Riwayat tetap tersimpan.</p><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="publishedRevisionId" value={publishedRevisionId} />
    <label><span id={`${id}-label`}>Alasan penarikan</span><textarea ref={noteRef} name="note" value={note} onChange={event => setNote(event.target.value)} onFocus={event => event.currentTarget.scrollIntoView({ block: "center" })} disabled={pending} maxLength={2000} required aria-labelledby={`${id}-label`} aria-invalid={!!state.fields?.note} aria-describedby={`${id}-help${state.fields?.note ? ` ${id}-error` : ""}`} /><span className={s.formHelp} id={`${id}-help`}>Maksimal 2.000 karakter.</span>{state.fields?.note && <span className="error-text" id={`${id}-error`}>{state.fields.note}</span>}</label>
    {!fixed && <div className={s.checkRow}><label><input type="checkbox" name="archive" checked={archive} onChange={event => setArchive(event.target.checked)} disabled={pending} />Arsipkan setelah ditarik</label></div>}<button className={`${s.button} ${s.danger}`} disabled={pending}>Tarik konten</button>{!state.ok && <ActionMessage state={state} />}
  </form></details>;
}
