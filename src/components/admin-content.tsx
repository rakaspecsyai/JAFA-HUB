import Link from "next/link";
import { dateLabel, kindLabels, type Kind } from "@/lib/content-types";
import s from "./admin.module.css";
export const statusNames: Record<string, string> = { draft: "Draf", submitted: "Diajukan", returned: "Dikembalikan", approved: "Disetujui" };
export const kindModules: Record<Kind, string> = { profession: "profil-jf", article: "artikel", regulation: "regulasi", faq: "faq", page: "halaman" };
export function Status({ status }: { status: string }) { return <span className={`${s.badge} ${s[status] ?? ""}`}>{statusNames[status] ?? status}</span>; }
type Row = { id: string; kind: Kind; publishedRevisionId: string | null; archived: boolean; revisions: { status: string; payload: unknown; updatedAt: Date; authorId: string | null }[] };
export function ContentTable({ items, authors = {} }: { items: Row[]; authors?: Record<string, string> }) {
  if (!items.length) return <p className={s.empty}>Tidak ada konten pada pilihan ini.</p>;
  return <div className={s.tableWrap} role="region" aria-label="Daftar konten" tabIndex={0}><table className={s.table}><thead><tr><th scope="col">Judul</th><th scope="col">Revisi kerja</th><th scope="col">Publikasi</th><th scope="col">Diubah</th><th scope="col">Tindakan</th></tr></thead><tbody>{items.map(item => {
    const r = item.revisions[0]; const p = r?.payload as { title?: string };
    return <tr key={item.id}><td><Link href={`/admin/${kindModules[item.kind]}/${item.id}`}>{p?.title || "Tanpa judul"}</Link><small>{kindLabels[item.kind]}{r?.authorId && authors[r.authorId] ? ` · ${authors[r.authorId]}` : ""}</small></td><td>{r ? <Status status={r.status} /> : "Belum ada revisi"}</td><td>{item.archived ? "Diarsipkan" : item.publishedRevisionId ? "Terbit" : "Belum terbit"}</td><td>{r ? dateLabel(r.updatedAt.toISOString(), true) : "—"}</td><td><Link href={`/admin/${kindModules[item.kind]}/${item.id}`}>Buka</Link></td></tr>;
  })}</tbody></table></div>;
}
