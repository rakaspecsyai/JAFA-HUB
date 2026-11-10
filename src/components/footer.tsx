import Link from "next/link";
import { Icon } from "./icon";
import s from "./portal.module.css";

export function Footer() {
  return <footer className={s.footer}>
    <div className={`${s.container} ${s.footerGrid}`}>
      <div className={s.footerAbout}>
        <Link href="/" aria-label="Jafa Hub, beranda" className={s.wordmark}>Jafa<span>Hub</span></Link>
        <p>Portal pengetahuan jabatan fungsional dalam lingkup pembinaan Direktorat Jenderal Kekayaan Negara.</p>
        <p>Subdirektorat Pengelolaan Jabatan Fungsional<br />Direktorat Transformasi dan Sistem Informasi</p>
      </div>
      <div className={s.footerGroup}><h2>Jelajahi pengetahuan</h2><Link href="/informasi">Informasi JF</Link><Link href="/insight">Wawasan & Kabar</Link><Link href="/regulasi">Pustaka Regulasi</Link><Link href="/simulasi">Simulasi Angka Kredit</Link></div>
      <div className={s.footerGroup}><h2>Tentang portal</h2><Link href="/tentang">Tentang Jafa Hub</Link><Link href="/faq">Pertanyaan umum</Link><Link href="/kontak">Kontak</Link><Link href="/privasi">Privasi</Link><a href="https://www.djkn.kemenkeu.go.id/" target="_blank" rel="noopener noreferrer">Website DJKN <Icon name="arrow-up-right" /></a></div>
    </div>
    <div className={s.footerBottom}><div className={s.container}><span>© {new Date().getFullYear()} Jafa Hub. Pengetahuan untuk kinerja.</span><span>Simulasi merupakan alat belajar, bukan penetapan PAK.</span></div></div>
  </footer>;
}
