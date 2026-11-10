import { forbidden } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContentTable } from "@/components/admin-content";
import s from "@/components/admin.module.css";
export const metadata = { title: "Persetujuan" };
export default async function ApprovalQueue() {
  const staff = await requireStaff(); if (staff.role !== "approver") forbidden();
  const items = await db.contentItem.findMany({ where: { archived: false, revisions: { some: { status: "submitted" } } }, include: { revisions: { orderBy: { number: "desc" }, take: 1 } }, orderBy: { updatedAt: "asc" } });
  return <><div className={s.titleRow}><div><h1>Persetujuan</h1><p>{items.length} revisi menunggu pemeriksaan. Bandingkan isi revisi dengan versi publik sebelum memutuskan.</p></div></div><ContentTable items={items} /></>;
}
