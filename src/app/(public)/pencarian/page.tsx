import Link from "next/link";
import { searchPublished } from "@/lib/repository";
import { kindLabels, queryParam, type Kind } from "@/lib/content-types";
import { PageHero, EmptyState, Pagination, pageNumber } from "@/components/content";
import { Icon } from "@/components/icon";
import s from "@/components/portal.module.css";
export const metadata = { title: "Pencarian", robots: { index: false }, description: "Cari profil, artikel, peraturan, dan FAQ terbit di Jafa Hub." };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; page?: string }> }) {
  const query = await searchParams; const q = queryParam(query.q).slice(0, 200); const page = pageNumber(query.page);
  const kind = ["profession", "article", "regulation", "faq"].includes(query.kind ?? "") ? query.kind as Kind : undefined;
  const result = await searchPublished(q, kind, page);
  return <><PageHero title="Temukan pengetahuan" description="Cari dengan nama jabatan, topik pembelajaran, atau nomor peraturan." trail={[{ label: "Pencarian" }]} /><section className={`${s.container} ${s.pageSection}`} aria-label="Hasil pencarian">
    <form action="/pencarian" className={s.filters}><label>Kata kunci<input name="q" type="search" defaultValue={q} placeholder="Apa yang ingin Anda pelajari?" maxLength={200} required /></label><label>Jenis konten<select name="kind" defaultValue={kind ?? ""}><option value="">Semua konten</option>{Object.entries(kindLabels).filter(([key]) => key !== "page").map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label><button className={`${s.button} ${s.navyButton}`}>Cari <Icon name="magnifying-glass" /></button></form>
    {q.trim() ? <><p className={s.resultCount}>{result.total} hasil untuk “{q}”</p>{result.items.length ? result.items.map(item => <Link className={s.searchResult} href={item.path} key={item.id}><small>{kindLabels[item.kind]}</small><h2>{item.title}</h2><p>{item.summary}</p></Link>) : <EmptyState title="Belum ada hasil yang cocok" description="Coba gunakan kata kunci lebih singkat, periksa ejaan, atau cari nomor regulasi tanpa kata tambahan." reset="/pencarian" />}<Pagination page={page} size={10} total={result.total} path="/pencarian" params={{ q, kind: kind ?? "" }} /></> : <EmptyState title="Mulai dengan kata kunci" description="Contohnya: Penilai, PMK 132, kompetensi, atau Angka Kredit." />}
  </section></>;
}
