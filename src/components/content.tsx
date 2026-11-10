import Link from "next/link";
import { contentPath, dateLabel, safeUrl, type PublicContent, type Source } from "@/lib/content-types";
import { Icon } from "./icon";
import s from "./portal.module.css";

export function PageHero({ title, description, trail = [] }: { title: string; description?: string; trail?: { label: string; href?: string }[] }) {
  return <div className={s.pageHero}><div className={s.container}>
    <nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/">Beranda</Link>{trail.map((t, i) => <span key={i} style={{ display: "contents" }}><Icon name="caret-right" />{t.href ? <Link href={t.href}>{t.label}</Link> : <span aria-current="page">{t.label}</span>}</span>)}</nav>
    <h1>{title}</h1>{description && <p>{description}</p>}
  </div></div>;
}
export function Sources({ sources }: { sources: Source[] }) {
  const visible = sources.filter(source => source.url && safeUrl(source.url, false));
  if (!visible.length) return null;
  return <aside className={s.sources} aria-label="Rujukan konten"><h2>Sumber & rujukan</h2>{visible.map((source, i) => <a key={i} href={safeUrl(source.url!, false)!} target="_blank" rel="noopener noreferrer"><Icon name="arrow-up-right" /><span>{source.title}{source.publisher ? ` · ${source.publisher}` : ""}</span></a>)}</aside>;
}
export function ArticleCard({ item }: { item: PublicContent }) {
  return <article className={s.articleCard} data-reveal="80">
    <Link href={contentPath(item.kind, item.slug)} aria-label={item.payload.title}><div className={s.imageCrop}>{item.payload.image && <img src={item.payload.image} alt={item.payload.imageAlt} width="700" height="450" loading="lazy" className={s.articleImage} />}</div></Link>
    <div className={s.articleMeta}><span>{item.payload.articleType}</span><span>{item.payload.sourceDate ? dateLabel(item.payload.sourceDate) : `Ditinjau ${dateLabel(item.reviewedOn)}`}</span></div>
    <h3><Link href={contentPath(item.kind, item.slug)}>{item.payload.title}</Link></h3>
    <p>{item.payload.summary}</p>
    <Link className={s.textLink} href={contentPath(item.kind, item.slug)}>Baca selengkapnya <Icon name="arrow-up-right" /></Link>
  </article>;
}
export function EmptyState({ title = "Belum ada konten terbit", description = "Materi sedang disiapkan dan ditinjau oleh pengelola. Silakan kembali lagi.", reset }: { title?: string; description?: string; reset?: string }) {
  return <div className={s.empty}><h2>{title}</h2><p>{description}</p>{reset && <Link className={s.textLink} href={reset}>Reset filter <Icon name="arrow-counter-clockwise" /></Link>}</div>;
}
export function Pagination({ page, size, total, path, params = {} }: { page: number; size: number; total: number; path: string; params?: Record<string, string> }) {
  const pages = Math.ceil(total / size);
  if (pages < 2) return null;
  const href = (p: number) => `${path}?${new URLSearchParams({ ...params, page: String(p) })}`;
  return <nav className={s.pagination} aria-label="Paginasi">{page > 1 && <Link href={href(page - 1)}>Sebelumnya</Link>}<span>Halaman {page} dari {pages}</span>{page < pages && <Link href={href(page + 1)}>Berikutnya</Link>}</nav>;
}
export function pageNumber(value?: string) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n < 100000 ? n : 1; }
