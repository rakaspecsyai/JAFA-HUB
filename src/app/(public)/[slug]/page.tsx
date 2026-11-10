import { notFound } from "next/navigation";
import { getPublished } from "@/lib/repository";
import { PageHero, Sources } from "@/components/content";
import { Markdown } from "@/components/markdown";
import s from "@/components/portal.module.css";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (!["tentang", "kontak", "privasi"].includes(slug)) return { title: "Halaman tidak ditemukan" };
  const item = await getPublished("page", slug);
  return { title: item?.payload.title ?? "Halaman belum tersedia", description: item?.payload.summary, alternates: { canonical: `/${slug}` } };
}
export default async function SupportingPage({ params }: Props) {
  const { slug } = await params;
  if (!["tentang", "kontak", "privasi"].includes(slug)) notFound();
  const item = await getPublished("page", slug);
  if (!item) notFound();
  return <><PageHero title={item.payload.title} description={item.payload.summary} trail={[{ label: item.payload.title }]} /><article className={`${s.container} ${s.pageSection}`}><div className={s.prose}><Markdown text={item.payload.body} /><Sources sources={item.sources} /></div></article></>;
}
