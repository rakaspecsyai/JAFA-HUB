import Link from "next/link";
import { allPublishedFaq } from "@/lib/repository";
import { professionNames, safeUrl, dateLabel } from "@/lib/content-types";
import { PageHero, Sources, EmptyState } from "@/components/content";
import { Markdown } from "@/components/markdown";
import s from "@/components/portal.module.css";
export const metadata = { title: "Pertanyaan Umum", description: "Jawaban terkurasi seputar jabatan fungsional, pembinaan, regulasi, dan Angka Kredit.", alternates: { canonical: "/faq" } };
export default async function FaqPage({ searchParams }: { searchParams: Promise<{ jf?: string }> }) {
  const { jf = "" } = await searchParams;
  const items = (await allPublishedFaq()).filter(i => !jf || (jf === "umum" ? !i.professions.length : i.professions.includes(jf)));
  return <><PageHero title="Pertanyaan umum" description="Jawaban terkurasi untuk membantu Anda memahami jabatan fungsional dan menemukan sumber pembelajaran." trail={[{ label: "FAQ" }]} /><section className={`${s.container} ${s.pageSection}`} aria-label="Daftar pertanyaan">
    <nav className={s.filterChips} aria-label="Filter topik FAQ">{[["", "Semua topik"], ["umum", "Umum"], ...Object.entries(professionNames)].map(([key, label]) => <Link key={key} href={key ? `/faq?jf=${key}` : "/faq"} className={s.chip} aria-current={jf === key ? "true" : undefined}>{label}</Link>)}</nav>
    <div className={s.faqList}>{items.length ? items.map(item => <details className={s.faqItem} id={item.slug} key={item.id}><summary>{item.payload.title}</summary><div><Markdown text={item.payload.body} />{item.payload.relatedLinks.filter(l => safeUrl(l.href)).map((l, i) => <p key={i}><a href={safeUrl(l.href)!} className={s.textLink}>{l.label}</a></p>)}<Sources sources={item.sources} /><p className={s.reviewDate}>Tinjauan materi: {dateLabel(item.reviewedOn)}</p></div></details>) : <EmptyState reset={jf ? "/faq" : undefined} />}</div>
  </section></>;
}
