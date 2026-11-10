import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "CMS | Jafa Hub", template: "%s | CMS Jafa Hub" }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
