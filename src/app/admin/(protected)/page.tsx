import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { dateLabel, PUBLIC_KINDS } from "@/lib/content-types";
import { ContentTable } from "@/components/admin-content";
import s from "@/components/admin.module.css";
export const metadata = { title: "Dashboard" };
export default async function Dashboard() {
  const staff = await requireStaff();
  const [users, total, drafts, submitted, published, recent, activities] = await Promise.all([
    staff.role === "admin" ? db.user.groupBy({ by: ["role"], _count: true, where: { active: true } }) : Promise.resolve([]),
    db.contentItem.count(), db.contentRevision.count({ where: { status: { in: ["draft", "returned"] } } }),
    db.contentRevision.count({ where: { status: "submitted" } }), db.contentItem.count({ where: { kind: { in: [...PUBLIC_KINDS] }, publishedRevisionId: { not: null }, archived: false } }),
    staff.role !== "admin" ? db.contentItem.findMany({ where: staff.role === "approver" ? { revisions: { some: { status: "submitted" } } } : {}, orderBy: { updatedAt: "desc" }, take: 5, include: { revisions: { orderBy: { number: "desc" }, take: 1 } } }) : Promise.resolve([]),
    db.auditEvent.findMany({ where: staff.role === "admin" ? {} : { action: { startsWith: "content." } }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);
  const metrics = staff.role === "admin" ? [["Akun aktif", users.reduce((n, u) => n + u._count, 0)], ["Editor", users.find(u => u.role === "editor")?._count ?? 0], ["Penyetuju", users.find(u => u.role === "approver")?._count ?? 0], ["Admin akun", users.find(u => u.role === "admin")?._count ?? 0]] : [["Seluruh konten", total], ["Draf & dikembalikan", drafts], ["Menunggu keputusan", submitted], ["Konten terbit", published]];
  return <><div className={s.titleRow}><div><h1>Dashboard</h1><p>{staff.role === "admin" ? "Kelola akun dan peran petugas. Hak publikasi tetap berada pada penyetuju." : staff.role === "approver" ? `${submitted} revisi menunggu keputusan substansi.` : `${drafts} revisi draf atau dikembalikan dapat dilanjutkan.`}</p></div><Link href={staff.role === "admin" ? "/admin/pengguna" : staff.role === "approver" ? "/admin/persetujuan" : "/admin/artikel/baru"} className={s.button}>{staff.role === "admin" ? "Kelola pengguna" : staff.role === "approver" ? "Periksa antrean" : "Tulis artikel"}</Link></div>
    <div className={s.metrics}>{metrics.map(([label, value]) => <div className={s.metric} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {staff.role !== "admin" && <section className={s.panel}><h2>{staff.role === "approver" ? "Revisi menunggu pemeriksaan" : "Konten terbaru"}</h2><ContentTable items={recent} /></section>}
    <section className={s.panel}><h2>Aktivitas terbaru</h2>{activities.length ? <div className={s.tableWrap} role="region" aria-label="Aktivitas terbaru" tabIndex={0}><table className={s.table}><thead><tr><th>Petugas</th><th>Tindakan</th><th>Waktu</th></tr></thead><tbody>{activities.map(a => <tr key={a.id}><td>{a.actorName}</td><td>{a.action}</td><td>{dateLabel(a.createdAt.toISOString(), true)}</td></tr>)}</tbody></table></div> : <p className={s.empty}>Belum ada aktivitas yang tercatat.</p>}<Link className={s.linkButton} href="/admin/aktivitas">Semua aktivitas</Link></section>
  </>;
}
