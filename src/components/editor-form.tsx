"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDraftAction, submitAction } from "@/lib/admin-actions";
import { payloadSchema, professionNames, type Kind, type Payload, type Source } from "@/lib/content-types";
import { ActionMessage } from "./workflow-forms";
import { RevisionPreview } from "./revision-preview";
import { useContentAction } from "./content-action";
import s from "./admin.module.css";

type Props = { module: string; kind: Kind; itemId?: string; revisionId?: string; version?: number; slug: string; payload: Payload; reviewedOn: string; professions: string[]; sources: Source[]; slugLocked: boolean };
export function EditorForm(props: Props) {
  const router = useRouter(); const id = useId(); const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useContentAction((previous, form) => form.get("intent") === "submit" ? submitAction(previous, form) : saveDraftAction(previous, form));
  const [payload, setPayload] = useState(props.payload); const [slug, setSlug] = useState(props.slug);
  const [reviewedOn, setReviewedOn] = useState(props.reviewedOn); const [professions, setProfessions] = useState(props.professions);
  const [sources, setSources] = useState<Source[]>(props.sources); const [dirty, setDirty] = useState(false);
  // Pertahankan spasi, pemisah, dan baris baru saat tautan masih diketik.
  const [relatedLinksText, setRelatedLinksText] = useState(() => props.payload.relatedLinks.map(link => `${link.label} | ${link.href}`).join("\n"));
  const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState(""); const uploadAttempt = useRef(false);
  const [base, setBase] = useState({ itemId: props.itemId, revisionId: props.revisionId, version: props.version });
  const [preview, setPreview] = useState(false);
  const [ready, setReady] = useState(false);
  // Masukan sebelum hidrasi belum memperbarui payload tersembunyi.
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (state.ok && state.itemId) {
      setBase({ itemId: state.itemId, revisionId: state.revisionId, version: state.version }); setDirty(false);
      if (!props.itemId) router.replace(`/admin/${props.module}/${state.itemId}`);
    } else if (state.fields) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state, props.itemId, props.module, router]);
  useEffect(() => { if (uploadAttempt.current && !uploading) { uploadAttempt.current = false; formRef.current?.querySelector<HTMLInputElement>('input[type="file"]')?.focus(); } }, [uploadError, uploading, payload.image]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update<K extends keyof Payload>(key: K, value: Payload[K]) { setPayload(p => ({ ...p, [key]: value })); setDirty(true); }
  const err = (key: string) => state.fields?.[key] && <span className="error-text" id={`${id}-${key}-error`}>{state.fields[key]}</span>;
  const a11y = (key: string) => ({ "aria-labelledby": `${id}-${key}-label`, "aria-invalid": !!state.fields?.[key], "aria-describedby": state.fields?.[key] ? `${id}-${key}-error` : undefined });
  const field = (label: string, key: keyof Payload, multiline = false) => <label><span id={`${id}-${key}-label`}>{label}</span>{multiline ? <textarea {...a11y(key)} value={String(payload[key])} onChange={e => update(key, e.target.value as never)} rows={key === "body" ? 14 : 4} /> : <input {...a11y(key)} value={String(payload[key])} onChange={e => update(key, e.target.value as never)} maxLength={key === "title" ? 200 : 2000} />}{err(key)}</label>;
  const listField = (label: string, key: "tasks" | "competencies" | "grades" | "keywords") => <label><span id={`${id}-${key}-label`}>{label}</span><textarea {...a11y(key)} aria-describedby={`${id}-${key}-help${state.fields?.[key] ? ` ${id}-${key}-error` : ""}`} value={payload[key].join("\n")} onChange={e => update(key, e.target.value.split("\n"))} /><span className={s.formHelp} id={`${id}-${key}-help`}>Satu entri per baris.</span>{err(key)}</label>;
  async function upload(file?: File) {
    if (!file) return; uploadAttempt.current = true; setUploading(true); setUploadError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("attribution", payload.imageCredit);
      const response = await fetch("/api/media", { method: "POST", body: form }); const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Gambar belum berhasil diunggah.");
      update("image", `/api/media/${result.id}`);
    } catch (error) { setUploadError(error instanceof Error ? error.message : "Unggahan gagal. Coba lagi."); }
    finally { setUploading(false); }
  }
  const input = { ...base, kind: props.kind, slug, payload, reviewedOn, professions, sources };
  return <div className={s.form}>
    <form ref={formRef} action={action} className={s.form}>
      <input type="hidden" name="data" value={JSON.stringify(input)} />
      <fieldset disabled={!ready || pending || uploading}>
        {field(props.kind === "faq" ? "Pertanyaan" : "Judul", "title")}
        <div className={s.formGrid}><label>Slug<input value={slug} onChange={e => { setSlug(e.target.value); setDirty(true); }} readOnly={props.slugLocked} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} required /><span className={s.formHelp}>{props.slugLocked ? "Slug terkunci untuk menjaga tautan." : "Huruf kecil, angka, dan tanda hubung."}</span></label><label><span id={`${id}-reviewedOn-label`}>Tanggal tinjauan materi</span><input {...a11y("reviewedOn")} type="date" value={reviewedOn} onChange={e => { setReviewedOn(e.target.value); setDirty(true); }} />{err("reviewedOn")}</label></div>
        {field("Ringkasan", "summary", true)}
        {props.kind === "article" && <div className={s.formGrid}><label>Jenis artikel<select value={payload.articleType} onChange={e => update("articleType", e.target.value as Payload["articleType"])}><option>Panduan</option><option>Kabar DJKN</option></select></label><label><span id={`${id}-sourceDate-label`}>Tanggal publikasi sumber</span><input {...a11y("sourceDate")} type="date" value={payload.sourceDate} onChange={e => update("sourceDate", e.target.value)} />{err("sourceDate")}</label></div>}
        {props.kind === "regulation" && <><div className={s.formGrid}>{field("Nomor peraturan", "number")}{field("Tahun", "year")}</div>{field("Penerbit", "publisher")}{field("URL dokumen resmi (.go.id)", "officialUrl")}{field("Catatan status & riwayat", "statusNote", true)}</>}
        {field(props.kind === "faq" ? "Jawaban" : "Isi (Markdown terbatas)", "body", true)}
        <p className={s.formHelp}>Didukung: paragraf, ## judul, daftar dengan -, **teks tebal**, serta [label](https://sumber). HTML ditampilkan sebagai teks.</p>
        {props.kind === "profession" && <>{field("Singkatan", "short")}{field("Definisi", "definition", true)}{field("Kategori", "category")}{listField("Jenjang", "grades")}{listField("Tugas", "tasks")}{listField("Kompetensi", "competencies")}{field("Catatan nomenklatur", "nomenclature", true)}</>}
        {props.kind === "faq" && <>{field("Topik", "topic")}{listField("Kata kunci pencocokan", "keywords")}<label>Urutan saran asisten<input type="number" min="0" max="1000" value={payload.suggestionOrder} onChange={e => update("suggestionOrder", Number(e.target.value))} /></label><label><span id={`${id}-relatedLinks-label`}>Tautan terkait</span><textarea {...a11y("relatedLinks")} aria-describedby={`${id}-relatedLinks-help${state.fields?.relatedLinks ? ` ${id}-relatedLinks-error` : ""}`} value={relatedLinksText} onChange={e => { setRelatedLinksText(e.target.value); update("relatedLinks", e.target.value.split("\n").filter(Boolean).map(line => { const [label, ...url] = line.split("|"); return { label: label.trim(), href: url.join("|").trim() }; })); }} /><span className={s.formHelp} id={`${id}-relatedLinks-help`}>Satu tautan per baris: Label | /path atau https://sumber</span>{err("relatedLinks")}</label></>}
        {props.kind === "page" && props.slug === "kontak" && <>
          <section role="group" {...a11y("contactChannels")} aria-describedby={`${id}-contactChannels-help${state.fields?.contactChannels ? ` ${id}-contactChannels-error` : ""}`} tabIndex={state.fields?.contactChannels ? -1 : undefined}>
            <h2 id={`${id}-contactChannels-label`}>Kanal kontak resmi</h2>
            <p id={`${id}-contactChannels-help`} className={s.formHelp}>Isi hanya kanal yang telah diverifikasi pengelola. Kanal kosong boleh disimpan sebagai draf; lengkapi atau hapus sebelum pengajuan.</p>
            {payload.contactChannels.map((channel, i) => <div className={s.sourceRow} key={i}>
              <label>Jenis kanal {i + 1}<select value={channel.type} onChange={e => update("contactChannels", payload.contactChannels.map((row, n) => n === i ? { ...row, type: e.target.value as typeof channel.type } : row))}><option value="url">Website</option><option value="email">Email</option><option value="phone">Telepon</option></select></label>
              <label>Nama kanal {i + 1}<input maxLength={100} value={channel.label} onChange={e => update("contactChannels", payload.contactChannels.map((row, n) => n === i ? { ...row, label: e.target.value } : row))} /></label>
              <label>Alamat kanal {i + 1}<input maxLength={2000} inputMode={channel.type === "phone" ? "tel" : channel.type === "email" ? "email" : "url"} value={channel.value} onChange={e => update("contactChannels", payload.contactChannels.map((row, n) => n === i ? { ...row, value: e.target.value } : row))} /></label>
              <button type="button" className={s.linkButton} onClick={() => { update("contactChannels", payload.contactChannels.filter((_, n) => n !== i)); formRef.current?.querySelector<HTMLButtonElement>("[data-add-contact]")?.focus(); }}>Hapus kanal {i + 1}</button>
            </div>)}
            <button type="button" data-add-contact className={s.linkButton} disabled={payload.contactChannels.length >= 10} onClick={() => update("contactChannels", [...payload.contactChannels, { type: "url", label: "", value: "" }])}>Tambah kanal kontak</button>{err("contactChannels")}
          </section>
          <label><span id={`${id}-serviceHours-label`}>Jam layanan (opsional)</span><textarea {...a11y("serviceHours")} maxLength={500} value={payload.serviceHours} onChange={e => update("serviceHours", e.target.value)} />{err("serviceHours")}</label>
        </>}
        {props.kind !== "page" && <fieldset {...a11y("professions")} tabIndex={state.fields?.professions ? -1 : undefined}><legend id={`${id}-professions-label`}>Bidang jabatan</legend><div className={s.checkRow}>{Object.entries(professionNames).map(([key, name]) => <label key={key}><input type="checkbox" checked={professions.includes(key)} onChange={e => { setProfessions(p => e.target.checked ? [...p, key] : p.filter(k => k !== key)); setDirty(true); }} />{name}</label>)}</div>{err("professions")}{props.kind === "faq" && <span className={s.formHelp}>Kosongkan untuk FAQ umum.</span>}</fieldset>}
        <section role="group" {...a11y("sources")} tabIndex={state.fields?.sources ? -1 : undefined}><h2 id={`${id}-sources-label`}>Sumber & rujukan</h2>{sources.map((source, i) => <div className={s.sourceRow} key={i}><label>Judul sumber<input value={source.title} maxLength={300} onChange={e => { setSources(rows => rows.map((r, n) => n === i ? { ...r, title: e.target.value } : r)); setDirty(true); }} /></label><label>Tanggal tinjauan sumber<input type="date" value={source.reviewedOn} onChange={e => { setSources(rows => rows.map((r, n) => n === i ? { ...r, reviewedOn: e.target.value } : r)); setDirty(true); }} /></label><label>URL HTTPS publik<input value={source.url ?? ""} maxLength={2000} onChange={e => { setSources(rows => rows.map((r, n) => n === i ? { ...r, url: e.target.value } : r)); setDirty(true); }} /></label><label>Rujukan internal (tidak ditampilkan publik)<input value={source.internalRef ?? ""} maxLength={1000} onChange={e => { setSources(rows => rows.map((r, n) => n === i ? { ...r, internalRef: e.target.value } : r)); setDirty(true); }} /></label><button type="button" className={s.linkButton} onClick={() => { setSources(rows => rows.filter((_, n) => n !== i)); setDirty(true); }}>Hapus sumber ini</button></div>)}<button type="button" className={s.linkButton} onClick={() => { setSources(rows => [...rows, { title: "", url: "", reviewedOn }]); setDirty(true); }}>Tambah sumber</button>{err("sources")}</section>
        {["article", "profession"].includes(props.kind) && <section className={s.form}><h2>Gambar konten</h2>{field("Atribusi / kredit gambar", "imageCredit")}<label><span id={`${id}-upload-label`}>Unggah JPEG, PNG, atau WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-labelledby={`${id}-upload-label`} aria-invalid={!!uploadError} aria-describedby={`${id}-upload-help${uploadError ? ` ${id}-upload-error` : ""}`} onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; void upload(file); }} /><span id={`${id}-upload-help`} className={s.formHelp}>Maksimal 5 MB, 20 megapiksel. Isi atribusi sebelum mengunggah.</span>{uploadError && <span id={`${id}-upload-error`} role="alert" className="error-text">{uploadError}</span>}</label>{field("Teks alternatif gambar", "imageAlt")}{payload.image && <><img src={payload.image} alt={payload.imageAlt} width="500" height="280" style={{ maxHeight: 200, width: "auto" }} /><button type="button" className={s.linkButton} onClick={() => { update("image", ""); setUploadError(""); formRef.current?.querySelector<HTMLInputElement>('input[type="file"]')?.focus(); }}>Lepaskan gambar</button></>}</section>}
        <div className={s.inlineButtons}><button type="submit" className={s.button}>{pending ? "Memproses…" : uploading ? "Mengunggah…" : "Simpan draf"}</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={() => setPreview(!preview)}>{preview ? "Tutup pratinjau" : "Pratinjau isi"}</button>{dirty && <span className={s.dirty}>Perubahan belum disimpan</span>}</div>
      </fieldset>{!state.ok && <ActionMessage state={state} contentHref={base.itemId ? `/admin/${props.module}/${base.itemId}` : undefined} />}
    </form>
    {preview && <RevisionPreview label="Pratinjau revisi kerja" kind={props.kind} payload={payload} reviewedOn={reviewedOn} sources={sources} professions={professions} />}
    {base.itemId && base.revisionId && base.version && <div><form action={action}><input type="hidden" name="intent" value="submit" /><input type="hidden" name="itemId" value={base.itemId} /><input type="hidden" name="revisionId" value={base.revisionId} /><input type="hidden" name="version" value={base.version} /><button className={`${s.button} ${s.secondary}`} disabled={!ready || dirty || pending || uploading}>Ajukan pemeriksaan</button></form>{dirty && <p className={s.formHelp}>Simpan seluruh perubahan sebelum mengajukan.</p>}</div>}
  </div>;
}
export const blankPayload = () => payloadSchema.parse({ title: "", summary: "", body: "" });
