import Link from "next/link";
import { forbidden } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateUserForm, UpdateUserForm } from "@/components/user-forms";
import { pageNumber } from "@/components/content";
import s from "@/components/admin.module.css";
export const metadata = { title: "Pengguna" };
export default async function Users({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const staff = await requireStaff(); if (staff.role !== "admin") forbidden();
  const page = pageNumber((await searchParams).page);
  const [total, users] = await db.$transaction([db.user.count(), db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], skip: (page - 1) * 20, take: 20, select: { id: true, name: true, email: true, role: true, active: true, mustChangePassword: true } })]);
  return <><div className={s.titleRow}><div><h1>Pengguna</h1><p>{total} akun pengelola. Satu akun memiliki satu peran; admin akun tidak dapat menerbitkan konten.</p></div></div><div className={s.twoCol}><section><h2 style={{ font: "600 16px var(--font-body)", marginBottom: 20 }}>Akun pengelola</h2>{users.map(user => <section className={s.panel} key={user.id}><h2>{user.name}{user.id === staff.id ? " (Anda)" : ""}</h2><p>{user.email}{user.mustChangePassword ? " · Wajib ganti sandi" : ""}</p><UpdateUserForm user={user} /></section>)}{total > 20 && <nav className={s.pagination} aria-label="Paginasi pengguna">{page > 1 ? <Link href={`/admin/pengguna?page=${page - 1}`}>Sebelumnya</Link> : <span />}<span>{page} / {Math.ceil(total / 20)}</span>{page * 20 < total ? <Link href={`/admin/pengguna?page=${page + 1}`}>Berikutnya</Link> : <span />}</nav>}</section><section className={s.panel}><CreateUserForm /></section></div></>;
}
