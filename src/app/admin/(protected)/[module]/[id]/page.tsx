import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { dateLabel, kindLabels, moduleKinds, payloadSchema, contentPath } from "@/lib/content-types";
import { EditorForm } from "@/components/editor-form";
import { DecisionForm, WithdrawForm } from "@/components/workflow-forms";
import { Status } from "@/components/admin-content";
import { RevisionPreview } from "@/components/revision-preview";
import s from "@/components/admin.module.css";
export const metadata = { title: "Revisi konten" };
export default async function ContentDetail({ params }: { params: Promise<{ module: string; id: string }> }) {
  const staff = await requireStaff(); if (staff.role === "admin") forbidden();
  const { module, id } = await params; const kind = moduleKinds[module as keyof typeof moduleKinds]; if (!kind) notFound();
  if (id === "baru") {
    if (staff.role !== "editor") forbidden(); if (!["article", "regulation", "faq", "knowledge"].includes(kind)) notFound();
    return <><div className={s.titleRow}><div><h1>Tambah {kindLabels[kind].toLowerCase()}</h1><p>Simpan draf terlebih dahulu, lalu ajukan pemeriksaan setelah lengkap.</p></div><Link href={`/admin/${module}`} className={s.linkButton}>Kembali ke daftar</Link></div><EditorForm module={module} kind={kind} slug="" payload={payloadSchema.parse({ title: "", summary: "", body: "" })} reviewedOn="" professions={[]} sources={[]} slugLocked={false} /></>;
  }
  if (!z.uuid().safeParse(id).success) notFound();
  const item = await db.contentItem.findUnique({ where: { id }, include: { publishedRevision: { include: { sources: { orderBy: { order: "asc" } }, professions: true } }, revisions: { orderBy: { number: "desc" }, include: { sources: { orderBy: { order: "asc" } }, professions: true } } } });
  if (!item || item.kind !== kind) notFound();
  const r = item.revisions[0]; if (!r) notFound(); const p = payloadSchema.parse(r.payload);
  const editable = staff.role === "editor" && r.status !== "submitted" && !item.archived;
  return <><div className={s.titleRow}><div><h1>{p.title || "Tanpa judul"}</h1><p>{kindLabels[kind]} · Revisi {r.number} · <Status status={r.status} /></p></div><Link href={`/admin/${module}`} className={s.linkButton}>Kembali ke daftar</Link></div>
    <p className={s.meta}>{kind === "knowledge" ? "Persetujuan sumber" : "Publikasi"}: {item.archived ? "diarsipkan" : item.publishedRevisionId ? kind === "knowledge" ? "disetujui" : "terbit" : "belum terbit"} · Diubah {dateLabel(r.updatedAt.toISOString(), true)}{item.publishedRevisionId && kind !== "knowledge" && <> · <Link href={contentPath(kind, item.slug)} target="_blank">Lihat versi publik</Link></>}</p>
    {r.note && <div className={s.message}><strong>Catatan keputusan</strong><p>{r.note}</p></div>}
    <div className={s.twoCol}>
      <div>{editable ? <EditorForm key={r.id} module={module} kind={kind} itemId={id} revisionId={r.id} version={r.version} slug={item.slug} payload={p} reviewedOn={r.reviewedOn} professions={r.professions.map(x => x.key)} sources={r.sources} slugLocked={!!item.firstPublishedAt || ["profession", "page"].includes(kind)} /> : <RevisionPreview label={`Pratinjau revisi ${r.number}`} kind={kind} payload={p} reviewedOn={r.reviewedOn} sources={r.sources} professions={r.professions.map(x => x.key)} />}</div>
      <aside>{item.publishedRevision ? <RevisionPreview label={`${kind === "knowledge" ? "Sumber disetujui" : "Versi publik"}: revisi ${item.publishedRevision.number}`} kind={kind} payload={payloadSchema.parse(item.publishedRevision.payload)} reviewedOn={item.publishedRevision.reviewedOn} sources={item.publishedRevision.sources} professions={item.publishedRevision.professions.map(x => x.key)} /> : <p className={s.empty}>Belum ada revisi yang disetujui.</p>}
        {staff.role === "approver" && r.status === "submitted" && <section className={s.panel} style={{ marginTop: 24 }}><DecisionForm source={kind === "knowledge"} itemId={id} revisionId={r.id} version={r.version} contentHref={`/admin/${module}/${id}`} /></section>}
        {staff.role === "approver" && item.publishedRevisionId && <div style={{ marginTop: 24 }}><WithdrawForm source={kind === "knowledge"} itemId={id} publishedRevisionId={item.publishedRevisionId} fixed={["profession", "page"].includes(kind)} contentHref={`/admin/${module}/${id}`} /></div>}
        <section className={s.panel} style={{ marginTop: 24 }}><h2>Riwayat revisi</h2>{item.revisions.map(v => <p key={v.id} className={s.meta}>Revisi {v.number} · <Status status={v.status} /><br />{dateLabel(v.updatedAt.toISOString(), true)}{v.note && <><br />{v.note}</>}</p>)}</section>
      </aside>
    </div>
  </>;
}
