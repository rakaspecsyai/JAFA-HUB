"use client";
import { PageHero } from "@/components/content";
import s from "@/components/portal.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <><PageHero title="Konten belum dapat dimuat" description="Layanan sedang mengalami gangguan. Silakan coba kembali beberapa saat lagi." trail={[{ label: "Gangguan layanan" }]} /><div className={`${s.container} ${s.pageSection}`}><button onClick={reset} className={`${s.button} ${s.navyButton}`}>Coba lagi</button></div></>;
}
