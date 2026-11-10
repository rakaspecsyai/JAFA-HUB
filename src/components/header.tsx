"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";  
import { Icon } from "./icon";
import { FaqAssistant } from "./faq-assistant";
import s from "./portal.module.css";

export function Wordmark() { return <span className={s.wordmark}>Jafa<span>Hub</span></span>; }
export function Header() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dropdown = useRef<HTMLDetailsElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") { event.preventDefault(); dialog.current?.showModal(); }
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        if (dropdown.current?.open) { event.preventDefault(); dropdown.current.open = false; dropdown.current.querySelector("summary")?.focus(); }
        else if (open) { event.preventDefault(); setOpen(false); menuButton.current?.focus(); }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [open]);
  function closeMenus() { setOpen(false); if (dropdown.current) dropdown.current.open = false; }
  const active = (href: string) => href === "/" ? path === "/" : path.startsWith(href);
  return <header className={s.header}>
    <div className={`${s.container} ${s.headerInner}`}>
      <Link href="/" className={s.logo} aria-label="Jafa Hub, beranda" onClick={closeMenus}>
        <img className={s.officialLogo} src="/assets/kemenkeu-djkn.svg" width="210" height="52" alt="Kementerian Keuangan, Direktorat Jenderal Kekayaan Negara" />
        <span className={s.logoDivider} aria-hidden="true" /><Wordmark />
      </Link>
      <nav className={s.navigation} id="navigasi-utama" aria-label="Navigasi utama" data-open={open}>
        <Link className={s.navLink} href="/" aria-current={active("/") ? "page" : undefined} onClick={closeMenus}>Beranda</Link>
        <details className={s.navDrop} ref={dropdown}>
          <summary className={s.navLink}>Informasi JF <Icon name="caret-down" /></summary>
          <div className={s.dropdown}>
            <Link href="/informasi" onClick={closeMenus}>Kenali jabatan fungsional</Link>
            <Link href="/informasi/penilai-pemerintah" onClick={closeMenus}>Penilai Pemerintah</Link>
            <Link href="/informasi/penata-laksana-barang" onClick={closeMenus}>Penata Laksana Barang</Link>
            <Link href="/informasi/pelelang" onClick={closeMenus}>Pelelang</Link>
          </div>
        </details>
        {[["/insight", "Wawasan & Kabar"], ["/regulasi", "Regulasi"], ["/simulasi", "Simulasi"]].map(([href, label]) =>
          <Link key={href} href={href} className={s.navLink} aria-current={active(href) ? "page" : undefined} onClick={closeMenus}>{label}</Link>)}
      </nav>
      <div className={s.headerTools}>
        <button type="button" className={s.iconButton} aria-label="Buka pencarian" disabled={!ready} onClick={() => dialog.current?.showModal()}><Icon name="magnifying-glass" /></button>
        <FaqAssistant />
        <button ref={menuButton} type="button" className={`${s.iconButton} ${s.menuButton}`} aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} aria-controls="navigasi-utama" disabled={!ready} onClick={() => setOpen(!open)}><Icon name={open ? "x" : "list"} /></button>
      </div>
    </div>
    <dialog ref={dialog} className={s.searchDialog} aria-labelledby="search-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={s.dialogHead}><h2 id="search-title">Apa yang Anda cari?</h2><button className={s.iconButton} aria-label="Tutup pencarian" onClick={() => dialog.current?.close()}><Icon name="x" /></button></div>
      <form action="/pencarian" onSubmit={() => dialog.current?.close()}>
        <label><span className="sr-only">Kata kunci pencarian</span><input autoFocus type="search" name="q" maxLength={200} placeholder="Jabatan, nomor regulasi, atau topik…" required /></label>
        <button className={`${s.button} ${s.navyButton}`}>Cari <Icon name="magnifying-glass" /></button>
      </form>
      <p>Telusuri profil JF, artikel, regulasi, dan koleksi jawaban.</p>
    </dialog>
  </header>;
}
