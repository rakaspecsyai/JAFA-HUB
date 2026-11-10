import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { kindLabels, moduleKinds, professionNames, queryParam } from "@/lib/content-types";
import { pageNumber } from "@/components/content";
import { ContentTable } from "@/components/admin-content";
import s from "@/components/admin.module.css";
type Props = { params: Promise<{ module: string }>; searchParams: Promise<{ q?: string; status?: string; jf?: string; page?: string }> };
export async function generateMetadata({ params }: Props) { const { module } = await params; const kind = moduleKinds[module as keyof typeof moduleKinds]; return { title: kind ? kindLabels[kind] : "Konten" }; }
export default async function ContentList({ params, searchParams }: Props) {
  const staff = await requireStaff(); if (staff.role === "admin") forbidden();
  const { module } = await params; const kind = moduleKinds[module as keyof typeof moduleKinds]; if (!kind) notFound();
  const query = await searchParams; const page = pageNumber(query.page); const q = queryParam(query.q).trim().slice(0, 200);
  const status = ["draft", "submitted", "returned", "approved"].includes(query.status ?? "") ? query.status! : "";
  const jf = Object.hasOwn(professionNames, query.jf ?? "") ? query.jf! : "";
  const where: Prisma.ContentItemWhereInput = { kind, revisions: { some: { ...(status ? { status: status as "draft" } : {}), ...(q ? { payload: { path: ["title"], string_contains: q, mode: "insensitive" } } : {}), ...(jf ? { professions: { some: { key: jf } } } : {}) } } };
  const [total, items] = await db.$transaction([db.contentItem.count({ where }), db.contentItem.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20, include: { revisions: { orderBy: { number: "desc" }, take: 1 } } })]);
  const authors = await db.user.findMany({ where: { id: { in: items.flatMap(i => i.revisions.map(r => r.authorId).filter((id): id is string => !!id)) } }, select: { id: true, name: true } });
  const href = (p: number) => `/admin/${module}?${new URLSearchParams({ q, jf, status, page: String(p) })}`;
  return <><div className={s.titleRow}><div><h1>{kindLabels[kind]}</h1><p>{total} konten. Revisi kerja dan status publikasi ditampilkan terpisah.</p></div>{staff.role === "editor" && ["article", "regulation", "faq"].includes(kind) && <Link href={`/admin/${module}/baru`} className={s.button}>Tambah {kindLabels[kind].toLowerCase()}</Link>}</div>
    <form className={s.toolbar} action={`/admin/${module}`}><label>Cari judul<input type="search" name="q" maxLength={200} defaultValue={q} /></label><label>Status revisi<select name="status" defaultValue={status}><option value="">Semua status</option><option value="draft">Draf</option><option value="submitted">Diajukan</option><option value="returned">Dikembalikan</option><option value="approved">Disetujui</option></select></label><label>Bidang JF<select name="jf" defaultValue={jf}><option value="">Semua bidang</option>{Object.entries(professionNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label><button className={s.button}>Terapkan</button></form>
    <ContentTable items={items} authors={Object.fromEntries(authors.map(a => [a.id, a.name]))} />
    {total > 20 && <nav className={s.pagination} aria-label="Paginasi konten">{page > 1 ? <Link href={href(page - 1)}>Sebelumnya</Link> : <span />}<span>Halaman {page} dari {Math.ceil(total / 20)}</span>{page * 20 < total ? <Link href={href(page + 1)}>Berikutnya</Link> : <span />}</nav>}
  </>;
}
