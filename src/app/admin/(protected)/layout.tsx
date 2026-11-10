import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff(); if (!staff) redirect("/admin/login");
  if (staff.mustChangePassword) redirect("/admin/ganti-sandi");
  return <><a className="skip-link" href="#konten">Langsung ke konten</a><AdminShell staff={staff}>{children}</AdminShell></>;
}
