import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Reveals } from "@/components/reveals";
import { previewEnabled } from "@/lib/fixtures";
import s from "@/components/portal.module.css";

export const dynamic = "force-dynamic";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <><a className="skip-link" href="#konten">Langsung ke konten</a><Header />
    {previewEnabled() && <div className={s.previewNotice}>Pratinjau lokal · Materi prototipe menunggu persetujuan substansi.<a href="/tentang">Tentang portal</a></div>}
    <main id="konten" tabIndex={-1}>{children}</main><Footer /><Reveals /></>;
}
