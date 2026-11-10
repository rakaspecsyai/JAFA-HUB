import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublished, listPublished } from "@/lib/repository";
import { dateLabel, professionNames } from "@/lib/content-types";
import { ArticleCard, PageHero, Sources } from "@/components/content";
import { Markdown } from "@/components/markdown";
import s from "@/components/portal.module.css";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params; const item = await getPublished("article", slug);
  return { title: item?.payload.title ?? "Artikel tidak ditemukan", description: item?.payload.summary, alternates: { canonical: `/insight/${slug}` } };
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params; const item = await getPublished("article", slug);
  if (!item) notFound();
  const related = (await listPublished("article", { jf: item.professions[0], size: 4 })).items.filter(i => i.id !== item.id).slice(0, 3);
  return <><PageHero title={item.payload.title} description={item.payload.summary} trail={[{ label: "Wawasan & Kabar", href: "/insight" }, { label: item.payload.articleType }]} />
    <div className={`${s.container} ${s.pageSection}`}><div className={s.detailGrid}>
      <article>{item.payload.image && <figure><img className={s.detailPhoto} src={item.payload.image} alt={item.payload.imageAlt} width="1000" height="560" /><figcaption className={s.imageCaption}>{item.payload.imageCredit}</figcaption></figure>}
        <div className={s.articleMeta}><span>{item.payload.articleType}</span>{item.payload.sourceDate && <span>Publikasi sumber: {dateLabel(item.payload.sourceDate)}</span>}{item.publishedAt && <span>Terbit di portal: {dateLabel(item.publishedAt)}</span>}</div>
        <Markdown text={item.payload.body} /><Sources sources={item.sources} /><p className={s.reviewDate}>Tanggal tinjauan materi: {dateLabel(item.reviewedOn)}</p>
      </article>
      <aside><div className={s.sidebarPanel}><h2>Bidang terkait</h2>{item.professions.map(key => <p key={key} style={{ marginBottom: 14 }}><Link href={`/insight?jf=${key}`} className={s.textLink}>{professionNames[key]}</Link></p>)}</div><div className={s.sidebarPanel}><h2>Telusuri sumber</h2><p>Ringkasan editorial membantu pembelajaran. Baca sumber lengkap untuk konteks serta ketentuan penerapannya.</p></div></aside>
    </div>
    {!!related.length && <section style={{ marginTop: 65 }} aria-labelledby="related-title"><h2 className={s.sectionTitle} id="related-title" style={{ marginBottom: 30 }}>Bacaan berikutnya</h2><div className={s.articleGrid}>{related.map(a => <ArticleCard key={a.id} item={a} />)}</div></section>}
    </div></>;
}
