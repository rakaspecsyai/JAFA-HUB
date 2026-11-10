import Link from "next/link";
import { listPublished } from "@/lib/repository";
import { Icon } from "@/components/icon";
import { ArticleCard, EmptyState } from "@/components/content";
import s from "@/components/portal.module.css";

export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const [professions, articles, regulations] = await Promise.all([listPublished("profession", { size: 3 }), listPublished("article", { size: 3 }), listPublished("regulation", { size: 3 })]);
  return <>
    <section className={s.hero} aria-labelledby="hero-title">
      <img className={s.heroImage} src="/assets/hero.webp" alt="Ilustrasi konseptual arsitektur dan aset negara pada malam hari" width="1672" height="941" fetchPriority="high" />
      <div className={`${s.container} ${s.heroContent}`}>
        <h1 className={s.heroTitle} id="hero-title"><span><span>Pengetahuan JF.</span></span><span><span>Untuk <em>kinerja.</em></span></span></h1>
        <p className={s.heroDescription} data-reveal="120">Profil jabatan, wawasan, dan regulasi untuk mendukung pengembangan kompetensi ASN dalam lingkup pembinaan DJKN.</p>
        <div className={s.actions} data-reveal="200"><Link href="/informasi" className={s.button}>Jelajahi JF <Icon name="arrow-up-right" /></Link><Link href="/simulasi" className={`${s.button} ${s.secondaryButton}`}>Simulasi Angka Kredit <Icon name="calculator" /></Link></div>
        <p className={s.heroCaption}>Ilustrasi konseptual arsitektur</p>
      </div>
      <div className={s.professionBar}><div className={`${s.container} ${s.professionLinks}`}>
        {(professions.items.length ? professions.items : [{ slug: "penilai-pemerintah", payload: { title: "Penilai Pemerintah" } }, { slug: "penata-laksana-barang", payload: { title: "Penata Laksana Barang" } }, { slug: "pelelang", payload: { title: "Pelelang" } }]).map(p => <Link key={p.slug} href={professions.items.length ? `/informasi/${p.slug}` : "/informasi"} className={s.professionLink}><span><small>Jabatan fungsional</small><strong>{p.payload.title}</strong></span><Icon name="arrow-up-right" /></Link>)}
      </div></div>
    </section>
    <section className={s.section} aria-labelledby="peran-title"><div className={`${s.container} ${s.introGrid}`}>
      <div><h2 id="peran-title" data-reveal="0">Peran berbeda,<br />tujuan bersama.</h2><p data-reveal="70">Penilaian, pengelolaan barang, dan layanan lelang berkontribusi pada pengelolaan kekayaan negara yang tertib dan akuntabel.</p><p data-reveal="110">Jafa Hub menghubungkan pengetahuan tentang tugas, kompetensi, dan regulasi agar Anda dapat mempelajari peran jabatan secara lebih utuh.</p><Link href="/tentang" className={s.textLink} data-reveal="150">Kenali Jafa Hub <Icon name="arrow-up-right" /></Link><div className={s.topicLinks} data-reveal="190"><Link href="/regulasi"><Icon name="book-open" /> Sumber resmi</Link><Link href="/faq"><Icon name="chat-circle-dots" /> Jawaban terkurasi</Link></div></div>
      <figure data-reveal="80"><img className={s.introPhoto} src="/assets/field.webp" alt="Ilustrasi konseptual dua ASN meninjau aset bangunan" width="700" height="525" loading="lazy" /><figcaption className={s.imageCaption}>Ilustrasi konseptual pengelolaan aset, bukan dokumentasi resmi.</figcaption></figure>
    </div></section>
    <section className={`${s.section} ${s.softSection}`} aria-labelledby="wawasan-title"><div className={s.container}>
      <div className={s.sectionHead}><div><h2 id="wawasan-title" data-reveal="0">Wawasan & kabar</h2><p data-reveal="60">Pembelajaran dan perkembangan seputar jabatan fungsional dalam pembinaan DJKN.</p></div><Link href="/insight" className={s.textLink}>Semua artikel <Icon name="arrow-up-right" /></Link></div>
      {articles.items.length ? <div className={s.articleGrid}>{articles.items.map(item => <ArticleCard key={item.id} item={item} />)}</div> : <EmptyState />}
    </div></section>
    <section className={s.section} aria-labelledby="rujukan-title"><div className={`${s.container} ${s.regulationsSplit}`}>
      <div><h2 id="rujukan-title" data-reveal="0">Rujukan yang<br />Anda perlukan.</h2><p data-reveal="60">Mulai dari ringkasan, telusuri langsung ke sumber resmi. Periksa status dan riwayat aturan sebelum menerapkannya.</p><Link href="/regulasi" className={s.textLink}>Buka pustaka regulasi <Icon name="arrow-up-right" /></Link></div>
      <div className={s.regulationRows}>{regulations.items.length ? regulations.items.map((item, i) => <a key={item.id} href={item.payload.officialUrl} target="_blank" rel="noopener noreferrer" className={s.regulationRow} data-reveal={i * 70}><div><strong>{item.payload.number}</strong><p>{item.payload.title}</p></div><Icon name="arrow-up-right" /></a>) : <EmptyState />}</div>
    </div></section>
    <section className={`${s.section} ${s.softSection}`} aria-labelledby="simulator-title"><div className={s.container}><div className={s.simulatorBanner}>
      <div><h2 id="simulator-title" data-reveal="0">Pahami Angka Kredit Anda.</h2><p data-reveal="60">Pelajari konversi predikat kinerja menjadi Angka Kredit berdasarkan jenjang dan periode penilaian.</p><div className={s.actions} data-reveal="100"><Link href="/simulasi" className={s.button}>Coba simulator <Icon name="calculator" /></Link></div></div>
      <div className={s.formulaArt} data-reveal="80"><Icon name="calculator" /><span>AK</span><p>Periode × predikat × koefisien<br />Alat belajar, bukan penetapan PAK.</p></div>
    </div></div></section>
  </>;
}
