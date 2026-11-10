export const levels = {
  keahlian: [
    { id: "pertama", name: "Ahli Pertama", coefficient: 12.5 },
    { id: "muda", name: "Ahli Muda", coefficient: 25 },
    { id: "madya", name: "Ahli Madya", coefficient: 37.5 },
    { id: "utama", name: "Ahli Utama", coefficient: 50 }
  ],
  keterampilan: [
    { id: "terampil", name: "Terampil", coefficient: 5 },
    { id: "mahir", name: "Mahir", coefficient: 12.5 },
    { id: "penyelia", name: "Penyelia", coefficient: 25 }
  ]
};
export const ratings = [
  { id: "sangat-baik", name: "Sangat Baik", factor: 1.5 },
  { id: "baik", name: "Baik", factor: 1 },
  { id: "butuh-perbaikan", name: "Butuh Perbaikan", factor: 0.75 },
  { id: "kurang", name: "Kurang", factor: 0.5 },
  { id: "sangat-kurang", name: "Sangat Kurang", factor: 0.25 }
];
export const RULE_VERSION = "konversi-dasar-1.0";
export const RULE_REVIEW = "2026-10-21";
export const RULE_SOURCE = "https://dispakati.bkn.go.id/assets/download/new/perban_3_2023.pdf";

export class CreditError extends Error {
  constructor(public field: string, message: string) { super(message); }
}

export function calculateCredit(input: { category: unknown; levelId: unknown; ratingId: unknown; months: unknown }) {
  const { category, levelId, ratingId, months } = input;
  if (typeof category !== "string" || !Object.hasOwn(levels, category))
    throw new CreditError("category", "Pilih kategori jabatan yang tersedia.");
  const level = levels[category as keyof typeof levels].find(item => item.id === levelId);
  if (!level) throw new CreditError("levelId", "Pilih jenjang sesuai kategori jabatan.");
  const rating = ratings.find(item => item.id === ratingId);
  if (!rating) throw new CreditError("ratingId", "Pilih predikat kinerja yang tersedia.");
  const validShape = typeof months === "number" || (typeof months === "string" && /^\d{1,2}$/.test(months));
  if (!validShape || !Number.isInteger(Number(months)) || Number(months) < 1 || Number(months) > 12)
    throw new CreditError("months", "Isi periode dengan bilangan bulat antara 1 dan 12 bulan.");
  return {
    value: (Number(months) / 12) * rating.factor * level.coefficient,
    coefficient: level.coefficient, percentage: rating.factor * 100,
    months: Number(months), level: level.name, rating: rating.name,
    category: category === "keahlian" ? "Keahlian" : "Keterampilan"
  };
}
export const formatCredit = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(value);
