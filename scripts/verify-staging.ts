// Verifikasi manual lingkungan staging (Vercel + Supabase) dengan akun editor.
// Tidak dipakai oleh suite otomatis; kredensial dibaca dari environment, bukan chat/log.
//
// STAGING_URL=https://<preview> \
// STAGING_EDITOR_EMAIL=<email> \
// STAGING_EDITOR_PASSWORD=<sandi> \
//   npm run staging:verify
//
// Akun yang baru dibuat CMS wajib mengganti sandi terlebih dahulu (mustChangePassword),
// karena endpoint media menolak sandi sementara.

export {};

const base = (process.env.STAGING_URL ?? "").trim().replace(/\/+$/, "");
const email = process.env.STAGING_EDITOR_EMAIL?.trim();
const password = process.env.STAGING_EDITOR_PASSWORD;
if (!base || !email || !password) throw new Error("Set STAGING_URL, STAGING_EDITOR_EMAIL, dan STAGING_EDITOR_PASSWORD.");
const expectedOrigin = new URL(base).origin;
// PNG 8x8 gambar diam; storeImage menyanitasi dan mengonversi ke WebP.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWM4ISeHFTEMLQkAkL9BAaxyLUcAAAAASUVORK5CYII=", "base64");

type SetCookieHeaders = Headers & { getSetCookie?: () => string[] };
function cookieHeader(response: Response): string {
  const headers = response.headers as SetCookieHeaders;
  const cookies = headers.getSetCookie?.() ?? [headers.get("set-cookie")].filter((value): value is string => !!value);
  return cookies.map(value => value.split(";", 1)[0]).join("; ");
}

const login = await fetch(`${base}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: expectedOrigin },
  body: JSON.stringify({ email, password })
});
const cookie = cookieHeader(login);
const loginBody = await login.text();
console.log(`login: ${login.status} ${loginBody}`);
if (!login.ok) process.exit(1);

const form = new FormData();
form.append("file", new Blob([png], { type: "image/png" }), "probe.png");
form.append("attribution", "Verifikasi staging");
const upload = await fetch(`${base}/api/media`, { method: "POST", headers: { origin: expectedOrigin, cookie }, body: form });
const uploadBody = await upload.text();
console.log(`unggah gambar: ${upload.status} ${uploadBody}`);

let id: string | undefined;
try { id = (JSON.parse(uploadBody) as { id?: string }).id; } catch { /* respons bukan JSON */ }
if (upload.status === 201 && id) {
  const owner = await fetch(`${base}/api/media/${id}`, { headers: { cookie } });
  console.log(`baca sebagai editor: ${owner.status} ${owner.headers.get("content-type") ?? ""}`);
  const anonymous = await fetch(`${base}/api/media/${id}`);
  console.log(`baca anonim (draf, harus 404): ${anonymous.status}`);
} else if (upload.status === 403) {
  console.log("Akun masih memakai sandi sementara. Ganti sandi di /admin/ganti-sandi lalu jalankan ulang.");
}
