import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateLabel } from "@/lib/content-types";
import { pageNumber } from "@/components/content";
import s from "@/components/admin.module.css";
export const metadata = { title: "Aktivitas" };
export default async function Activity({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const staff = await requireStaff(); const page = pageNumber((await searchParams).page);
  const where = staff.role === "admin" ? {} : { action: { startsWith: "content." } };
  const [total, events] = await db.$transaction([db.auditEvent.count({ where }), db.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20 })]);
  return <><div className={s.titleRow}><div><h1>Aktivitas</h1><p>{total} tindakan tercatat. Jejak tindakan tersimpan bersama mutasi terkait dan tidak dapat disunting melalui CMS.</p></div></div><div className={s.tableWrap} role="region" aria-label="Jejak tindakan" tabIndex={0}><table className={s.table}><thead><tr><th>Petugas</th><th>Tindakan</th><th>Objek</th><th>Waktu Jakarta</th><th>Catatan</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{e.actorName}</td><td>{e.action}</td><td>{e.objectId.slice(0, 8)}</td><td>{dateLabel(e.createdAt.toISOString(), true)}</td><td>{e.note || "—"}</td></tr>)}</tbody></table></div>{!events.length && <p className={s.empty}>Belum ada aktivitas.</p>}{total > 20 && <nav className={s.pagination} aria-label="Paginasi aktivitas">{page > 1 ? <Link href={`/admin/aktivitas?page=${page - 1}`}>Sebelumnya</Link> : <span />}<span>Halaman {page} dari {Math.ceil(total / 20)}</span>{page * 20 < total ? <Link href={`/admin/aktivitas?page=${page + 1}`}>Berikutnya</Link> : <span />}</nav>}</>;
}
