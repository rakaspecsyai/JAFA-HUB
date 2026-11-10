import Link from "next/link";
import { listPublished } from "@/lib/repository";
import { dateLabel, normalizeQuery, professionNames, safeUrl, queryParam } from "@/lib/content-types";
import { PageHero, EmptyState, Pagination, pageNumber } from "@/components/content";
import { Icon } from "@/components/icon";
import s from "@/components/portal.module.css";
export const metadata = { title: "Pustaka Regulasi", description: "Telusuri nomor, judul, dan rujukan resmi peraturan jabatan fungsional.", alternates: { canonical: "/regulasi" } };
export default async function Regulations({ searchParams }: { searchParams: Promise<{ q?: string; jf?: string; page?: string }> }) {
  const query = await searchParams;
  const q = queryParam(query.q).slice(0, 200); const jf = Object.hasOwn(professionNames, query.jf ?? "") ? query.jf! : "";
  const page = pageNumber(query.page);
  const batches = await listPublished("regulation", { jf, size: 100 });
  const extra = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(batches.total / 100) - 1) }, (_, i) => listPublished("regulation", { jf, size: 100, page: i + 2 })));
  const words = normalizeQuery(q).split(" ").filter(Boolean);
  const filtered = [...batches.items, ...extra.flatMap(b => b.items)].filter(i => words.every(w => normalizeQuery(`${i.payload.number} ${i.payload.title} ${i.payload.summary}`).includes(w)));
  const items = filtered.slice((page - 1) * 12, page * 12);
  return <><PageHero title="Pustaka regulasi" description="Temukan rujukan jabatan fungsional dan telusuri dokumennya langsung pada sumber resmi." trail={[{ label: "Regulasi" }]} /><section className={`${s.container} ${s.pageSection}`} aria-label="Daftar regulasi">
    <form action="/regulasi" className={s.filters}><label>Cari nomor atau judul<input type="search" name="q" defaultValue={q} maxLength={200} placeholder="Contoh: PMK 132 atau Angka Kredit" /></label><label>Bidang jabatan<select name="jf" defaultValue={jf}><option value="">Semua jabatan</option>{Object.entries(professionNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><button className={`${s.button} ${s.navyButton}`}>Cari regulasi</button>{(q || jf) && <Link href="/regulasi" className={s.textLink}>Reset</Link>}</form>
    <p className={s.resultCount}>{filtered.length} regulasi{q ? ` untuk “${q}”` : ""}</p>
    <div className={s.regulationList}>{items.length ? items.map(item => <article id={item.slug} key={item.id} className={s.regulationDetail}><div><strong>{item.payload.number}</strong><h2>{item.payload.title}</h2><p>{item.payload.summary}</p><p>{item.payload.publisher} · Tinjauan {dateLabel(item.reviewedOn)}</p><p className={s.reviewDate}>{item.payload.statusNote}</p></div>{safeUrl(item.payload.officialUrl, false) && <a href={safeUrl(item.payload.officialUrl, false)!} target="_blank" rel="noopener noreferrer" className={s.textLink}>Sumber resmi <Icon name="arrow-up-right" /></a>}</article>) : <EmptyState title={q || jf ? "Regulasi belum ditemukan" : undefined} description={q || jf ? "Coba nomor yang lebih singkat atau pilih bidang jabatan lainnya." : undefined} reset={q || jf ? "/regulasi" : undefined} />}</div>
    <Pagination page={page} size={12} total={filtered.length} path="/regulasi" params={{ q, jf }} />
  </section></>;
}
