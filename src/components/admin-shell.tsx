"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/lib/admin-actions";
import type { Staff } from "@/lib/content-types";
import { Icon } from "./icon";
import { ContentActionContext, type ContentFeedback } from "./content-action";
import { ActionMessage } from "./workflow-forms";
import s from "./admin.module.css";
export const roleLabels = { editor: "Editor", approver: "Penyetuju", admin: "Admin akun" };
export function AdminShell({ staff, children }: { staff: Staff; children: React.ReactNode }) {
  const [open, setOpen] = useState(false); const path = usePathname() ?? "/admin";
  const menuButton = useRef<HTMLButtonElement>(null);
  const [feedback, setFeedback] = useState<ContentFeedback>(); const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { setFeedback(previous => previous?.path === path ? previous : undefined); }, [path]);
  useEffect(() => { if (feedback?.path === path) resultRef.current?.focus(); }, [feedback, path]);
  const links = [["/admin", "Dashboard", "buildings"], ...(staff.role !== "admin" ? [["/admin/profil-jf", "Profil JF", "briefcase"], ["/admin/artikel", "Artikel", "file-text"], ["/admin/regulasi", "Regulasi", "book-open"], ["/admin/faq", "FAQ", "chat-circle-dots"], ["/admin/halaman", "Halaman pendukung", "file-text"]] : []), ...(staff.role === "approver" ? [["/admin/persetujuan", "Persetujuan", "shield-check"]] : []), ...(staff.role === "admin" ? [["/admin/pengguna", "Pengguna", "briefcase"]] : []), ["/admin/aktivitas", "Aktivitas", "clock"]];
  return <ContentActionContext value={setFeedback}><div className={s.shell} onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); menuButton.current?.focus(); } }}><div className={s.mobileBar}><button ref={menuButton} aria-label={open ? "Tutup navigasi CMS" : "Buka navigasi CMS"} aria-expanded={open} aria-controls="navigasi-cms" onClick={() => setOpen(!open)}><Icon name={open ? "x" : "list"} /></button><strong>Jafa Hub CMS</strong></div><aside id="navigasi-cms" className={s.sidebar} data-open={open}>
    <Link href="/admin" className={s.brand}><img src="/assets/logo-kemenkeu.png" width="31" height="31" alt="" /><div><strong>JafaHub</strong><span>Content Management System</span></div></Link>
    <nav className={s.nav} aria-label="Navigasi CMS">{links.map(([href, label, icon]) => <Link key={href} href={href} aria-current={(href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined} onClick={() => setOpen(false)}><Icon name={icon} />{label}</Link>)}<span className={s.navLabel}>Portal publik</span><Link href="/" target="_blank"><Icon name="arrow-up-right" />Lihat website</Link><Link href="/admin/ganti-sandi"><Icon name="shield-check" />Ganti sandi</Link></nav>
    <div className={s.staff}><strong>{staff.name}</strong><p>{roleLabels[staff.role]}</p><p>{staff.email}</p><form action={logoutAction}><button>Keluar dari CMS</button></form></div>
  </aside><main className={s.workspace} id="konten" tabIndex={-1}>{feedback?.path === path && <ActionMessage ref={resultRef} state={{ ok: true, message: feedback.message }} />}{children}</main></div></ContentActionContext>;
}
