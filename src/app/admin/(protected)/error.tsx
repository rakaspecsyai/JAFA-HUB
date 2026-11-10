"use client";
import s from "@/components/admin.module.css";
export default function AdminError({ reset }: { reset: () => void }) { return <div className={s.panel}><h1>Data belum dapat dimuat</h1><p className={s.meta}>Koneksi layanan terganggu. Silakan coba lagi; data sebelumnya tetap tersimpan.</p><button className={s.button} onClick={reset}>Coba lagi</button></div>; }
