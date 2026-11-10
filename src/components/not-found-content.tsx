import Link from "next/link";
import { PageHero } from "./content";
import s from "./portal.module.css";
export function NotFoundContent() {
  return <><PageHero title="Halaman belum ditemukan" description="Tautan mungkin berubah atau konten belum diterbitkan. Anda dapat kembali ke beranda atau mencari materi lainnya." trail={[{ label: "404" }]} /><div className={`${s.container} ${s.pageSection}`}><div className={s.actions}><Link href="/" className={`${s.button} ${s.navyButton}`}>Kembali ke beranda</Link><Link href="/pencarian" className={s.textLink}>Cari pengetahuan</Link></div></div></>;
}
