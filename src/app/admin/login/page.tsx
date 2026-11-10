import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import s from "@/components/admin.module.css";
export const metadata = { title: "Masuk" };
export default async function Login({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const staff = await getStaff();
  if (staff) redirect(staff.mustChangePassword ? "/admin/ganti-sandi" : "/admin");
  const { changed } = await searchParams;
  return <main className={s.authPage}>
    <aside className={s.authBrand}>
      <img src="/assets/hero.webp" alt="" width="900" height="1200" />
      <div className={s.brand}>
        <img src="/assets/logo-kemenkeu.png" alt="" width="42" height="42" />
        <div>
          <strong>JafaHub
          </strong>
          <span>Pusat Informasi Jabatan Fungsional
          </span>
        </div>
      </div>
            <div>
              <h2>Admin datang 😹
              </h2>

              <p>Susun materi, tinjau sumber, dan terbitkan pengetahuan melalui proses persetujuan.
              </p>
              <img src="/assets/admint-sayang.jpg" alt=""/>

            </div>
            <div>

              <p>Subdirektorat Pengelolaan Jabatan Fungsional</p>

            </div>
    </aside>
              <div className={s.authContent}>
                <div className={s.authBox}>
                  <h1>Masuk ke pengelola</h1>
                    <p>Gunakan akun yang diberikan admin. Akses pengelola mengikuti peran yang ditetapkan.
                    </p>
                      <AuthForm changed={changed === "1"} />
                      <Link href="/">Kembali ke portal Jafa Hub
                      </Link>
                </div>
              </div>            
</main>;
}
