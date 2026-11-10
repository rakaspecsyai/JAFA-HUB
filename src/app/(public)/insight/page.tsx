import Link from "next/link";
import { listPublished } from "@/lib/repository";
import { professionNames } from "@/lib/content-types";
import { ArticleCard, EmptyState, PageHero, Pagination, pageNumber } from "@/components/content";
import s from "@/components/portal.module.css";
export const metadata = { title: "Wawasan & Kabar", description: "Ringkasan kabar DJKN dan panduan pembelajaran jabatan fungsional beserta sumbernya.", alternates: { canonical: "/insight" } };
export default async function Insights({ searchParams }: { searchParams: Promise<{ jf?: string; type?: string; page?: string }> }) {
  const query = await searchParams;
  const jf = Object.hasOwn(professionNames, query.jf ?? "") ? query.jf! : "";
  const type = ["Panduan", "Kabar DJKN"].includes(query.type ?? "") ? query.type! : "";
  const page = pageNumber(query.page);
  const result = await listPublished("article", { jf, type, page });
  return <><PageHero title="Wawasan & kabar" description="Baca perkembangan pembinaan, peran jabatan, dan panduan untuk mendukung pembelajaran Anda." trail={[{ label: "Wawasan & Kabar" }]} /><section className={`${s.container} ${s.pageSection}`} aria-label="Daftar artikel">
    <form className={s.filters} action="/insight"><label>Bidang jabatan<select name="jf" defaultValue={jf}><option value="">Semua jabatan</option>{Object.entries(professionNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><label>Jenis artikel<select name="type" defaultValue={type}><option value="">Semua jenis</option><option>Panduan</option><option>Kabar DJKN</option></select></label><button className={`${s.button} ${s.navyButton}`}>Terapkan filter</button>{(jf || type) && <Link href="/insight" className={s.textLink}>Reset</Link>}</form>
    <p className={s.resultCount}>{result.total} artikel{jf ? ` untuk ${professionNames[jf]}` : ""}</p>
    {result.items.length ? <div className={s.articleGrid}>{result.items.map(item => <ArticleCard key={item.id} item={item} />)}</div> : <EmptyState title={jf || type ? "Artikel belum ditemukan" : undefined} description={jf || type ? "Coba pilih bidang atau jenis artikel lainnya." : undefined} reset={jf || type ? "/insight" : undefined} />}
    <Pagination {...result} path="/insight" params={{ jf, type }} />
  </section></>;
}
