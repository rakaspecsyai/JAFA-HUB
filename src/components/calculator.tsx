"use client";
import { useRef, useState } from "react";
import { calculateCredit, CreditError, formatCredit, levels, ratings, RULE_REVIEW, RULE_SOURCE, RULE_VERSION } from "@/lib/calculator";
import { dateLabel } from "@/lib/content-types";
import { Icon } from "./icon";
import p from "./portal.module.css";
import s from "./calculator.module.css";

export function Calculator() {
  const initial = { category: "", levelId: "", ratingId: "", months: "12" };
  const [input, setInput] = useState(initial);
  const [result, setResult] = useState<ReturnType<typeof calculateCredit> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const categoryRef = useRef<HTMLSelectElement>(null);
  function update(field: keyof typeof input, value: string) {
    setInput(current => ({ ...current, [field]: value, ...(field === "category" ? { levelId: "" } : {}) }));
    setResult(null); setErrors({});
  }
  function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { setResult(calculateCredit(input)); setErrors({}); }
    catch (error) {
      if (error instanceof CreditError) {
        setErrors({ [error.field]: error.message }); setResult(null);
        (event.currentTarget.elements.namedItem(error.field) as HTMLElement | null)?.focus();
      }
    }
  }
  const error = (name: string) => errors[name] && <span className="error-text" id={`error-${name}`} role="alert">{errors[name]}</span>;
  const a11y = (name: string) => ({ "aria-labelledby": `label-${name}`, "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `error-${name}` : undefined });
  return <>
    <div className={s.grid}>
      <form className={s.form} onSubmit={calculate} noValidate>
        <h2>Masukkan data kinerja</h2>
        <div className={s.fields}>
          <label><span id="label-category">Kategori jabatan</span><select ref={categoryRef} name="category" value={input.category} onChange={e => update("category", e.target.value)} required {...a11y("category")}><option value="">Pilih kategori</option><option value="keahlian">Keahlian</option><option value="keterampilan">Keterampilan</option></select>{error("category")}</label>
          <label><span id="label-levelId">Jenjang jabatan</span><select name="levelId" value={input.levelId} onChange={e => update("levelId", e.target.value)} disabled={!input.category} required {...a11y("levelId")}><option value="">{input.category ? "Pilih jenjang" : "Pilih kategori terlebih dahulu"}</option>{(levels[input.category as keyof typeof levels] ?? []).map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select>{error("levelId")}</label>
          <label><span id="label-ratingId">Predikat kinerja</span><select name="ratingId" value={input.ratingId} onChange={e => update("ratingId", e.target.value)} required {...a11y("ratingId")}><option value="">Pilih predikat</option>{ratings.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select>{error("ratingId")}</label>
          <label><span id="label-months">Periode penilaian (bulan)</span><input name="months" type="number" inputMode="numeric" min="1" max="12" step="1" value={input.months} onChange={e => update("months", e.target.value)} required {...a11y("months")} />{error("months")}</label>
        </div>
        <div className={s.actions}><button className={`${p.button} ${p.navyButton}`} type="submit">Hitung Angka Kredit <Icon name="calculator" /></button><button className={s.reset} type="button" onClick={() => { setInput(initial); setResult(null); setErrors({}); categoryRef.current?.focus(); }}>Reset formulir</button></div>
        <p className={s.hint}>Konversi dasar untuk pembelajaran. Pilihan jenjang tidak menyatakan ketersediaan formasi di instansi Anda. Data tidak dikirim ke server.</p>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {result ? <section className={s.result} aria-label="Hasil simulasi"><h2>Hasil simulasi Anda</h2><div className={s.value}><strong>{formatCredit(result.value)}</strong><span>AK</span></div>
          <dl className={s.details}><dt>Kategori</dt><dd>{result.category}</dd><dt>Jenjang</dt><dd>{result.level}</dd><dt>Predikat</dt><dd>{result.rating}</dd><dt>Periode</dt><dd>{result.months} bulan</dd><dt>Koefisien tahunan</dt><dd>{formatCredit(result.coefficient)}</dd><dt>Faktor predikat</dt><dd>{result.percentage}%</dd></dl>
          <div className={s.formula}>({result.months} / 12) × {result.percentage}% × {formatCredit(result.coefficient)} = <strong>{formatCredit(result.value)} AK</strong></div>
          <p className={s.disclaimer}>Hasil ini tidak menetapkan PAK, AK kumulatif, kenaikan pangkat, promosi, atau keputusan kepegawaian.</p>
          <p className={s.rule}>Rujukan: <a href={RULE_SOURCE} target="_blank" rel="noopener noreferrer">Peraturan BKN Nomor 3 Tahun 2023, Pasal 13</a>.<br />Versi {RULE_VERSION} · Tinjauan prototipe {dateLabel(RULE_REVIEW)}. Memerlukan tinjauan substansi sebelum produksi.</p>
        </section> : <section className={`${s.result} ${s.resultPlaceholder}`}><Icon name="calculator" /><h2>Mulai dari kinerja Anda.</h2><p>Pilih kategori, jenjang, dan predikat, lalu hitung untuk melihat rincian konversi beserta rumusnya.</p></section>}
      </div>
    </div>
    <div className={s.tables}>
      <section><h2>Koefisien tahunan</h2><table className={s.table}><caption>Baseline Peraturan BKN Nomor 3 Tahun 2023</caption><thead><tr><th scope="col">Kategori & jenjang</th><th scope="col">Koefisien</th></tr></thead><tbody>{Object.entries(levels).flatMap(([category, items]) => items.map(l => <tr key={l.id}><td>{category === "keahlian" ? "Keahlian" : "Keterampilan"} · {l.name}</td><td>{formatCredit(l.coefficient)}</td></tr>))}</tbody></table></section>
      <section><h2>Faktor predikat kinerja</h2><table className={s.table}><caption>Persentase konversi predikat</caption><thead><tr><th scope="col">Predikat</th><th scope="col">Faktor</th></tr></thead><tbody>{ratings.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.factor * 100}%</td></tr>)}</tbody></table><p className={s.hint}>Rumus: (jumlah bulan / 12) × faktor predikat × koefisien tahunan. Periode penilaian 1–12 bulan.</p></section>
    </div>
  </>;
}
