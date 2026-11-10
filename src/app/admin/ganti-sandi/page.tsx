import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import s from "@/components/admin.module.css";
export const metadata = { title: "Ganti sandi" };
export default async function PasswordPage() {
  const staff = await getStaff(); if (!staff) redirect("/admin/login");
  return <main className={s.authContent} style={{ minHeight: "100vh", background: "var(--soft)" }}><div className={s.authBox}><h1>Ganti sandi Anda</h1><p>{staff.mustChangePassword ? "Sandi sementara wajib diganti sebelum mengakses fitur CMS." : "Setelah sandi diganti, semua sesi akun akan dicabut dan Anda perlu masuk kembali."}</p><AuthForm mode="password" /><Link href={staff.mustChangePassword ? "/" : "/admin"}>Kembali</Link></div></main>;
}
