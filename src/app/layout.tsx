import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({ src: "../../public/assets/plus-jakarta-sans.ttf", variable: "--font-body", display: "swap", weight: "200 800" });
const barlow = localFont({ src: "../../public/assets/barlow-condensed-bold.ttf", variable: "--font-heading", display: "swap", weight: "700" });
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Jafa Hub — Pengetahuan untuk Kinerja JF", template: "%s | Jafa Hub" },
  description: "Portal pengetahuan jabatan fungsional dalam lingkup pembinaan DJKN. Jelajahi profil, artikel, regulasi, FAQ, dan simulator Angka Kredit.",
  openGraph: { locale: "id_ID", type: "website", siteName: "Jafa Hub", images: [{ url: "/assets/hero.webp", width: 1672, height: 941 }] },
  icons: { icon: "/assets/logo-kemenkeu.png" }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id" className={`${jakarta.variable} ${barlow.variable}`}><body>{children}</body></html>;
}
