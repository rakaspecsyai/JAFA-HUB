import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublished, listPublished } from "@/lib/repository";
import { dateLabel } from "@/lib/content-types";
import { PageHero, Sources, ArticleCard } from "@/components/content";
import { Markdown } from "@/components/markdown";
import { Icon } from "@/components/icon";
import s from "@/components/portal.module.css";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params; const item = await getPublished("profession", slug);
  return { title: item?.payload.title ?? "Profil tidak ditemukan", description: item?.payload.summary, alternates: { canonical: `/informasi/${slug}` } };
}
export default async function ProfessionPage({ params }: Props) {
  const { slug } = await params;
  const item = await getPublished("profession", slug);
  if (!item) notFound();
  const p = item.payload;
  const [articles, faqs] = await Promise.all([listPublished("article", { jf: item.professions[0], size: 3 }), listPublished("faq", { jf: item.professions[0], size: 20 })]);
  return <><PageHero title={p.title} description={p.summary} trail={[{ label: "Informasi JF", href: "/informasi" }, { label: p.title }]} />
    <div className={`${s.container} ${s.pageSection}`}><div className={s.detailGrid}>
      <article className={s.prose}>
        {p.image && <figure><img src={p.image} alt={p.imageAlt} width="800" height="480" className={s.detailPhoto} /><figcaption className={s.imageCaption}>{p.imageCredit}</figcaption></figure>}
        <h2>Peran & ruang lingkup</h2><p>{p.definition}</p>
        <h2>Tugas jabatan</h2><ul>{p.tasks.map(task => <li key={task}>{task}</li>)}</ul>
        <h2>Kompetensi</h2><ul>{p.competencies.map(competency => <li key={competency}>{competency}</li>)}</ul>
        <aside className={s.notice}><strong>Catatan nomenklatur</strong>{p.nomenclature}</aside>
        <Sources sources={item.sources} /><p className={s.reviewDate}>Tanggal tinjauan materi: {dateLabel(item.reviewedOn)}</p>
      </article>
      <aside><div className={s.sidebarPanel}><h2>Kategori & jenjang</h2><p>{p.category}</p><ul>{p.grades.map(grade => <li key={grade}>{grade}</li>)}</ul><p className={s.reviewDate}>Ketersediaan jenjang mengikuti ketentuan serta penetapan instansi.</p></div><div className={s.sidebarPanel}><h2>Pelajari konversi AK</h2><p>Kenali hubungan jenjang, predikat, dan periode penilaian.</p><Link href="/simulasi" className={s.textLink}>Buka simulator <Icon name="calculator" /></Link></div></aside>
    </div>
    {!!faqs.items.length && <section style={{ marginTop: 60 }} aria-labelledby="faq-profil"><h2 id="faq-profil" className={s.sectionTitle} style={{ marginBottom: 28 }}>Pertanyaan seputar jabatan</h2><div className={s.faqList}>{faqs.items.map(f => <details className={s.faqItem} key={f.id}><summary>{f.payload.title}</summary><div><Markdown text={f.payload.body} /><Sources sources={f.sources} /></div></details>)}</div></section>}
    {!!articles.items.length && <section style={{ marginTop: 65 }} aria-labelledby="artikel-profil"><div className={s.sectionHead}><h2 id="artikel-profil">Wawasan terkait</h2><Link href={`/insight?jf=${item.professions[0]}`} className={s.textLink}>Semua artikel <Icon name="arrow-up-right" /></Link></div><div className={s.articleGrid}>{articles.items.map(a => <ArticleCard key={a.id} item={a} />)}</div></section>}
    </div></>;
}
