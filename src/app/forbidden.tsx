import Link from "next/link";
import s from "@/components/admin.module.css";
export default function Forbidden() { return <div className={s.panel}><h1>Akses tidak diizinkan</h1><p className={s.meta}>Peran akun Anda tidak memiliki izin untuk membuka bagian ini.</p><Link href="/admin" className={s.button}>Kembali ke dashboard</Link></div>; }
