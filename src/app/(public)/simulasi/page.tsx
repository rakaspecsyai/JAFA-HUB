import { PageHero } from "@/components/content";
import { Calculator } from "@/components/calculator";
import s from "@/components/portal.module.css";
export const metadata = { title: "Simulasi Angka Kredit", description: "Pelajari konversi dasar predikat kinerja menjadi Angka Kredit. Perhitungan berjalan di browser tanpa menyimpan data.", alternates: { canonical: "/simulasi" } };
export default function SimulationPage() {
  return <><PageHero title="Simulasi Angka Kredit" description="Pahami hubungan antara jenjang, predikat kinerja, dan periode penilaian. Alat belajar ini tidak menggantikan penetapan resmi." trail={[{ label: "Simulasi Angka Kredit" }]} /><div className={`${s.container} ${s.pageSection}`}><Calculator /></div></>;
}
