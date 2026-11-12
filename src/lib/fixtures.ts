import { professions, articles, regulations, chatTopics, sources } from "../../data/legacy-content.mjs";
import { payloadSchema, type PublicKind, type PublicContent, type Source } from "./content-types";

const review = "2026-10-21";
const articleTitles: Record<string, string> = {
  "kompetensi-pelelang-2026": "Kompetensi & apresiasi Pelelang",
  "peran-jf-pengelolaan-aset-daerah": "Peran JF untuk aset daerah",
  "pembinaan-jf-lampung-2026": "Pembinaan JF di Lampung",
  "memahami-konversi-angka-kredit": "Memahami konversi Angka Kredit"
};
const source = (title: string, url: string): Source => ({ title, url, reviewedOn: review });
const entry = (kind: PublicKind, slug: string, payload: unknown, tags: string[], refs: Source[]): PublicContent => ({
  id: `prototype-${kind}-${slug}`, revisionId: `prototype-${kind}-${slug}-1`, kind, slug,
  payload: payloadSchema.parse(payload), reviewedOn: review, publishedAt: null, professions: tags, sources: refs
});

export const initialContent: PublicContent[] = [
  ...professions.map(p => entry("profession", p.slug, {
    title: p.name, short: p.short, summary: p.intro, body: p.definition, definition: p.definition,
    category: p.category, grades: p.grades, tasks: p.tasks, competencies: p.competence,
    nomenclature: p.nomenclature, image: `/assets/${p.image}`,
    imageAlt: `Ilustrasi konseptual kegiatan ${p.name}`, imageCredit: "Ilustrasi konseptual Jafa Hub; bukan dokumentasi resmi."
  }, [p.id], [source("PMK 132 Tahun 2023", sources.pmk132), ...(p.id === "plb" ? [source("PMK 44 Tahun 2023", sources.pmk44)] : [])])),
  ...articles.map(a => entry("article", a.id, {
    title: articleTitles[a.id] ?? a.title, summary: a.excerpt, body: a.sections.map(s => `## ${s.title}\n\n${s.text}`).join("\n\n"),
    articleType: a.type, sourceDate: a.type === "Kabar DJKN" ? a.date : "",
    image: `/assets/${a.image}`, imageAlt: "Ilustrasi konseptual pengelolaan kekayaan negara",
    imageCredit: "Ilustrasi konseptual Jafa Hub; bukan dokumentasi kegiatan yang diberitakan."
  }, a.tags, [source(a.sourceName, a.source)])),
  ...regulations.map(r => entry("regulation", r.id, {
    title: r.title, summary: r.description, body: r.description, number: r.code,
    year: r.code.includes("2017") ? "2017" : "2023", publisher: r.issuer, officialUrl: r.url,
    statusNote: "Rujukan dari prototipe. Status, riwayat perubahan, dan penerapannya perlu ditinjau pada sumber resmi."
  }, r.tags, [source(r.code, r.url)])),
  ...professions.flatMap(p => p.faq.map((faq, index) => {
    const topic = chatTopics.find(t => t.id === p.id);
    const merge = (p.id === "pp" && index === 0) || (p.id === "plb" && index === 1) || (p.id === "pelelang" && index === 2);
    return entry("faq", `${p.id}-${index + 1}`, {
      title: faq.q, summary: faq.a, body: faq.a + (merge && topic ? `\n\n${topic.answer}` : ""),
      topic: p.name, keywords: merge && topic ? topic.keywords : [p.name, p.short],
      suggestionOrder: merge ? 3 + professions.indexOf(p) : 100,
      relatedLinks: merge && topic ? topic.links.map(l => ({ ...l, href: l.href.replace(/^#/, "") })) : [{ label: "Profil jabatan", href: `/informasi/${p.slug}` }]
    }, [p.id], [source("PMK 132 Tahun 2023", sources.pmk132), ...(p.id === "plb" ? [source("PMK 44 Tahun 2023", sources.pmk44)] : [])]);
  })),
  ...chatTopics.filter(t => !["pp", "plb", "pelelang"].includes(t.id)).map((t, index) => entry("faq", t.id, {
    title: t.title, summary: t.answer, body: t.answer, topic: "Umum", keywords: t.keywords,
    suggestionOrder: index, relatedLinks: t.links.map(l => ({ ...l, href: l.href.replace(/^#/, "") }))
  }, [], [source("PMK 132 Tahun 2023", sources.pmk132), ...(t.id === "ak" || t.id === "kompetensi" ? [source("Peraturan BKN Nomor 3 Tahun 2023", sources.bknPdf)] : [])])),
  entry("page", "tentang", {
    title: "Tentang Jafa Hub", summary: "Pengetahuan jabatan fungsional dalam satu portal.",
    body: "## Pengetahuan untuk kinerja\n\nJafa Hub memusatkan informasi jabatan fungsional dalam lingkup pembinaan Direktorat Jenderal Kekayaan Negara (DJKN). Portal ini ditujukan bagi ASN, pengelola kepegawaian kementerian/lembaga dan pemerintah daerah, serta masyarakat yang ingin mengenal jabatan fungsional.\n\n## Unit pengelola\n\nSubdirektorat Pengelolaan Jabatan Fungsional, Direktorat Transformasi dan Sistem Informasi, Direktorat Jenderal Kekayaan Negara.\n\n## Sumber yang dapat ditelusuri\n\nMateri awal berasal dari paparan pembinaan DJKN tanggal 2 Agustus 2024, ringkasan publikasi DJKN, dan tautan peraturan resmi. Editor menyusun materi dan penyetuju memeriksa substansinya sebelum penerbitan. Tanggal tinjauan disertakan agar konteks sumber tetap jelas.\n\n## Batas layanan\n\nPortal ini merupakan sarana pengetahuan. Ringkasan dan simulasi tidak menggantikan naskah peraturan, penetapan PAK, atau keputusan instansi. Versi pengembangan ini belum merupakan layanan resmi produksi yang disetujui instansi."
  }, [], []),
  entry("page", "kontak", {
    title: "Kontak", summary: "Terhubung dengan pengelola melalui kanal resmi.",
    body: "## Pengelola Jafa Hub\n\nSubdirektorat Pengelolaan Jabatan Fungsional, Direktorat Transformasi dan Sistem Informasi, Direktorat Jenderal Kekayaan Negara.\n\n## Kanal resmi\n\nUntuk informasi kelembagaan dan kanal layanan yang tersedia, kunjungi [website resmi DJKN](https://www.djkn.kemenkeu.go.id/).\n\nKanal khusus Jafa Hub dan jam layanan akan dicantumkan setelah dikonfirmasi unit pengelola. Jangan menyampaikan NIP, kata sandi, atau dokumen pribadi melalui pertanyaan asisten FAQ."
  }, [], [source("Direktorat Jenderal Kekayaan Negara", "https://www.djkn.kemenkeu.go.id/")]),
  entry("page", "privasi", {
    title: "Privasi", summary: "Pengolahan data pada versi pengembangan Jafa Hub.",
    body: "## Pengunjung portal\n\nPengunjung dapat membaca informasi tanpa membuat akun. Simulator berjalan di browser; input dan hasilnya tidak dikirim ke server. Pertanyaan asisten dikirim untuk mencocokkan FAQ, tidak disimpan dalam database atau log aplikasi. Riwayat asisten hanya berada dalam memori tab dan hilang saat halaman dimuat ulang.\n\n## Akun pengelola\n\nSistem menyimpan nama, alamat email, hash sandi, peran, sesi, serta jejak tindakan pengelola untuk autentikasi dan akuntabilitas publikasi. Cookie sesi hanya digunakan oleh area pengelola, dengan masa berlaku maksimal delapan jam.\n\n## Keamanan dan pembatasan akses\n\nPembatasan laju permintaan menyimpan pengenal jaringan yang di-hash untuk mencegah penyalahgunaan. Aplikasi tidak menggunakan analitik pihak ketiga. Infrastruktur hosting dapat memiliki log akses tersendiri; retensi dan konfigurasi log harus disesuaikan sebelum produksi.\n\n## Retensi dan penanggung jawab\n\nUsulan retensi audit adalah 12 bulan dan log teknis 30 hari. Jadwal penghapusan, lokasi penyimpanan, dan kanal penanggung jawab privasi menunggu penetapan instansi. Kebijakan ini perlu disetujui kembali sesuai konfigurasi hosting sebelum peluncuran."
  }, [], [])
];

export function previewEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.JAFA_CONTENT_PREVIEW === "true";
}
