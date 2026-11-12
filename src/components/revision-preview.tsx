import { dateLabel, professionNames, regulationStatuses, safeUrl, type Kind, type Payload, type Source } from "@/lib/content-types";
import { Markdown } from "./markdown";
import { ContactChannels } from "./contact-channels";
import { DocumentPreview } from "./document-preview";
import s from "./admin.module.css";

export function RevisionPreview({ label, kind, payload: p, reviewedOn, sources, professions }: { label: string; kind: Kind; payload: Payload; reviewedOn: string; sources: Source[]; professions: string[] }) {
  return <section className={s.preview} aria-label={label}>
    <h2>{label}</h2><h3>{p.title || "Tanpa judul"}</h3><p>{p.summary}</p>
    <p className={s.meta}>Tinjauan: {reviewedOn && !Number.isNaN(Date.parse(reviewedOn)) ? dateLabel(reviewedOn) : "Belum diisi"}<br />Bidang: {professions.map(k => professionNames[k]).join(", ") || "Umum / belum diisi"}</p>
    {p.image && <figure><img src={p.image} alt={p.imageAlt} width="700" height="400" /><figcaption className={s.formHelp}>{p.imageCredit}<br />Teks alternatif: {p.imageAlt}</figcaption></figure>}
    {kind === "article" && <p className={s.meta}>Jenis: {p.articleType}{p.sourceDate ? ` · Publikasi sumber: ${p.sourceDate}` : ""}</p>}
    <Markdown text={p.body} />
    {kind === "knowledge" && <><h2>Identitas sumber PDF</h2><p>{p.number} · {p.year}<br />{p.publisher} · {regulationStatuses[p.regulationStatus]}</p><p>{safeUrl(p.officialUrl, false) && <a href={safeUrl(p.officialUrl, false)!} target="_blank" rel="noopener noreferrer">Sumber resmi</a>}</p><p>{p.statusNote}</p><p>Tinjauan ekstraksi editor: {p.documentReviewed ? "dikonfirmasi" : "belum dikonfirmasi"}. PDF tetap privat; indeks dan AI belum aktif.</p>{p.documentId && <DocumentPreview key={p.documentId} id={p.documentId} />}</>}
    {kind === "page" && <ContactChannels channels={p.contactChannels} serviceHours={p.serviceHours} />}
    {kind === "profession" && <><h2>Identitas & jenjang</h2><p>{p.short} · {p.category}</p><ul>{p.grades.map((g, i) => <li key={i}>{g}</li>)}</ul><h2>Definisi</h2><p>{p.definition}</p><h2>Tugas</h2><ul>{p.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul><h2>Kompetensi</h2><ul>{p.competencies.map((t, i) => <li key={i}>{t}</li>)}</ul><h2>Catatan nomenklatur</h2><p>{p.nomenclature}</p></>}
    {kind === "regulation" && <><h2>Identitas regulasi</h2><p>{p.number} · {p.year}<br />Penerbit: {p.publisher}</p><p>{safeUrl(p.officialUrl, false) ? <a href={safeUrl(p.officialUrl, false)!} target="_blank" rel="noopener noreferrer">{p.officialUrl}</a> : p.officialUrl}</p><h2>Status & riwayat</h2><p>{p.statusNote}</p></>}
    {kind === "faq" && <><h2>Pengelompokan FAQ</h2><p>Topik: {p.topic}<br />Kata kunci: {p.keywords.join(", ")}<br />Urutan saran: {p.suggestionOrder}</p>{p.relatedLinks.map((link, i) => <p key={i}>{link.label}: {link.href}</p>)}</>}
    <h2>Sumber & rujukan</h2>{sources.length ? sources.map((source, i) => <p key={i}>{source.title}<br />{source.url && safeUrl(source.url, false) ? <a href={safeUrl(source.url, false)!} target="_blank" rel="noopener noreferrer">{source.url}</a> : source.url}{source.internalRef && <><br />Rujukan internal: {source.internalRef}</>}<br />{source.publisher && <>{source.publisher} · </>}Tinjauan: {source.reviewedOn || "Belum diisi"}</p>) : <p>Belum ada sumber.</p>}
  </section>;
}
