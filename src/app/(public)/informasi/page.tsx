import Link from "next/link";
import { listPublished } from "@/lib/repository";
import { PageHero, EmptyState } from "@/components/content";
import { Icon } from "@/components/icon";
import s from "@/components/portal.module.css";
export const metadata = { title: "Informasi Jabatan Fungsional", description: "Kenali tugas, kompetensi, dan jenjang Penilai Pemerintah, Penata Laksana Barang, serta Pelelang.", alternates: { canonical: "/informasi" } };
export default async function Professions() {
  const { items } = await listPublished("profession", { size: 3 });
  return <><PageHero title="Kenali jabatan Anda" description="Tiga pintu masuk untuk memahami peran, kompetensi, dan rujukan jabatan fungsional dalam lingkup pembinaan DJKN." trail={[{ label: "Informasi JF" }]} /><section className={`${s.container} ${s.pageSection}`} aria-label="Profil jabatan fungsional">
    {items.length ? <div className={s.professionGrid}>{items.map(item => <article className={s.professionCard} key={item.id}>
      {item.payload.image && <img src={item.payload.image} alt={item.payload.imageAlt} width="600" height="400" />}
      <div><h2>{item.payload.title}</h2><p>{item.payload.summary}</p><Link href={`/informasi/${item.slug}`} className={s.textLink}>Pelajari profil <Icon name="arrow-up-right" /></Link></div>
    </article>)}</div> : <EmptyState />}
    <p className={s.reviewDate}>Penamaan mengikuti materi awal. Periksa catatan nomenklatur dan ketentuan peralihan pada setiap profil.</p>
  </section></>;
}
