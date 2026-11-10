import { test, expect, type Page, type Route } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { testAccounts, testPassword } from "./accounts";
import { initialContent } from "../../src/lib/fixtures";

async function login(page: Page, role: keyof typeof testAccounts) {
  await page.goto("/admin/login");
  await page.getByLabel("Email pengelola").fill(testAccounts[role].email);
  await page.getByLabel("Sandi", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
}

test("buat akun menandai kolom dan menjaga masukan yang ditolak", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await login(page, "admin");
  await page.goto("/admin/pengguna");
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  const create = page.locator("form").filter({ has: page.getByRole("heading", { name: "Buat akun pengelola", exact: true }) });
  const name = create.getByLabel("Nama petugas", { exact: true });
  const email = create.getByLabel("Email", { exact: true });
  const role = create.getByLabel("Peran", { exact: true });
  const submit = create.getByRole("button", { name: "Buat akun & sandi sementara", exact: true });
  const token = randomUUID(), address = `create-${token}@uji.invalid`, fullName = `Petugas akun ${token.slice(0, 8)}`;
  await name.fill("  "); await email.fill(address); await role.selectOption("approver");
  await submit.focus(); await page.keyboard.press("Enter");
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("Nama petugas harus terdiri dari 2–100 karakter.");
  await expect(name).toHaveValue("  "); await expect(email).toHaveValue(address); await expect(role).toHaveValue("approver");
  await create.locator("..").screenshot({ path: test.info().outputPath("akun-nama.png") });
  await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.type(fullName);
  await email.fill(testAccounts.editor.email.toUpperCase());
  await submit.focus(); await page.keyboard.press("Enter");
  await expect(email).toBeFocused();
  await expect(email).toHaveAccessibleDescription("Email sudah digunakan.");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(name).toHaveValue(fullName); await expect(role).toHaveValue("approver");
  await create.locator("..").screenshot({ path: test.info().outputPath("akun-email.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await email.fill(address); await submit.focus(); await page.keyboard.press("Enter");
  await expect(create.getByRole("status").filter({ hasText: "Sandi sementara, tampil satu kali" })).toBeVisible();
  const saved = create.getByRole("status").filter({ hasText: "Perubahan akun berhasil disimpan." });
  await expect(saved).toBeFocused();
  await expect(saved).toHaveAttribute("tabindex", "-1");
  await expect(name).toHaveValue(""); await expect(email).toHaveValue(""); await expect(role).toHaveValue("editor");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await create.locator("..").screenshot({ path: test.info().outputPath("akun-buat-berhasil.png"), mask: [create.getByRole("status").filter({ hasText: "Sandi sementara, tampil satu kali" })] });
  await page.keyboard.press("Shift+Tab"); await expect(submit).toBeFocused();
  await page.reload();
  const account = page.getByRole("heading", { name: fullName, exact: true }).locator("..");
  await expect(account).toContainText(address);
  await expect(account.getByLabel("Peran", { exact: true })).toHaveValue("approver");
});

test("ubah akun menjaga pilihan, melindungi admin terakhir, dan mereset sandi", async ({ page, browser, baseURL, isMobile }) => {
  test.setTimeout(120000);
  const viewport = { width: isMobile ? 320 : 1440, height: 900 };
  await page.setViewportSize(viewport);
  await login(page, "admin");
  await page.goto("/admin/pengguna");
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  const admin = page.getByRole("heading", { name: `${testAccounts.admin.name} (Anda)`, exact: true }).locator("..");
  const adminRole = admin.getByLabel("Peran", { exact: true });
  const adminAccess = admin.getByLabel("Akses", { exact: true });
  const saveAdmin = admin.getByRole("button", { name: "Simpan akses", exact: true });
  await adminAccess.selectOption("false"); await saveAdmin.focus(); await page.keyboard.press("Enter");
  await expect(adminAccess).toBeFocused();
  await expect(adminAccess).toHaveAccessibleDescription(/Admin aktif terakhir tidak dapat dinonaktifkan/);
  await expect(adminAccess).toHaveValue("false"); await expect(adminRole).toHaveValue("admin");
  await admin.screenshot({ path: test.info().outputPath("akun-admin-akses.png") });
  await adminRole.selectOption("editor"); await saveAdmin.focus(); await page.keyboard.press("Enter");
  await expect(adminRole).toBeFocused();
  await expect(adminRole).toHaveAccessibleDescription(/Admin aktif terakhir tidak dapat dinonaktifkan/);
  await expect(adminAccess).toHaveAttribute("aria-invalid", "true");
  await expect(adminRole).toHaveValue("editor"); await expect(adminAccess).toHaveValue("false");
  await admin.screenshot({ path: test.info().outputPath("akun-admin-peran.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/pengguna$/);
  await expect(adminRole).toHaveValue("admin"); await expect(adminAccess).toHaveValue("true");
  const create = page.locator("form").filter({ has: page.getByRole("heading", { name: "Buat akun pengelola", exact: true }) });
  const token = randomUUID(), email = `manage-${token}@uji.invalid`, name = `Petugas akses ${token.slice(0, 8)}`;
  await create.getByLabel("Nama petugas", { exact: true }).fill(name);
  await create.getByLabel("Email", { exact: true }).fill(email);
  await create.getByRole("button", { name: "Buat akun & sandi sementara", exact: true }).click();
  const initialResult = create.getByRole("status").filter({ hasText: "Sandi sementara, tampil satu kali" });
  await expect(initialResult).toBeVisible();
  const initialPassword = (await initialResult.locator("span").innerText()).trim();
  const account = page.getByRole("heading", { name, exact: true }).locator("..");
  const form = account.locator("form");
  const staffContext = await browser.newContext({ baseURL, viewport, isMobile });
  try {
    const staff = await staffContext.newPage();
    await staff.goto("/admin/login");
    await staff.getByLabel("Email pengelola", { exact: true }).fill(email);
    await staff.getByLabel("Sandi", { exact: true }).fill(initialPassword);
    await staff.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
    await expect(staff).toHaveURL(/\/admin\/ganti-sandi$/, { timeout: 15000 });
    await form.getByLabel("Peran", { exact: true }).selectOption("approver");
    await form.getByLabel("Akses", { exact: true }).selectOption("false");
    await form.getByRole("button", { name: "Simpan akses", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(form.getByRole("status")).toHaveText("Perubahan akun berhasil disimpan.");
    await expect(form.getByRole("status")).toBeFocused();
    await expect(form.getByRole("status")).toHaveAttribute("tabindex", "-1");
    await expect(form.getByLabel("Peran", { exact: true })).toHaveValue("approver");
    await expect(form.getByLabel("Akses", { exact: true })).toHaveValue("false");
    await account.screenshot({ path: test.info().outputPath("akun-akses-berhasil.png") });
    await page.keyboard.press("Shift+Tab"); await expect(form.getByRole("button", { name: "Reset sandi", exact: true })).toBeFocused();
    await staff.goto("/admin");
    await expect(staff).toHaveURL(/\/admin\/login$/, { timeout: 15000 });
    await page.reload();
    await expect(form.getByLabel("Peran", { exact: true })).toHaveValue("approver");
    await expect(form.getByLabel("Akses", { exact: true })).toHaveValue("false");
    await form.getByLabel("Peran", { exact: true }).selectOption("admin");
    await form.getByLabel("Akses", { exact: true }).selectOption("true");
    await form.getByRole("button", { name: "Reset sandi", exact: true }).focus(); await page.keyboard.press("Enter");
    const reset = form.getByRole("status").filter({ hasText: "Sandi sementara, tampil satu kali" });
    await expect(reset).toBeVisible();
    await expect(form.getByRole("status").filter({ hasText: "Perubahan akun berhasil disimpan." })).toBeFocused();
    const password = (await reset.locator("span").innerText()).trim();
    expect(password).not.toBe(initialPassword);
    await expect(form.getByLabel("Peran", { exact: true })).toHaveValue("approver");
    await expect(form.getByLabel("Akses", { exact: true })).toHaveValue("false");
    await form.getByLabel("Akses", { exact: true }).selectOption("true");
    await form.getByRole("button", { name: "Simpan akses", exact: true }).focus();
    const [activationRequest] = await Promise.all([
      page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/admin/pengguna"),
      page.keyboard.press("Enter")
    ]);
    expect(activationRequest.postData()?.includes(password), "Sandi sementara tidak dikirim ulang dalam state tindakan akun").toBe(false);
    await expect(form.getByRole("status").filter({ hasText: "Perubahan akun berhasil disimpan." })).toBeVisible();
    await expect(form.getByRole("status").filter({ hasText: "Perubahan akun berhasil disimpan." })).toBeFocused();
    await expect(reset).toHaveCount(0);
    await staff.getByLabel("Email pengelola", { exact: true }).fill(email);
    await staff.getByLabel("Sandi", { exact: true }).fill(initialPassword);
    await staff.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
    await expect(staff.getByRole("main").getByRole("alert")).toHaveText("Email atau sandi tidak sesuai.");
    await staff.getByLabel("Sandi", { exact: true }).fill(password);
    await staff.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
    await expect(staff).toHaveURL(/\/admin\/ganti-sandi$/, { timeout: 15000 });
  } finally { await staffContext.close(); }
});

test("ganti sandi menandai kolom, mempertahankan masukan, dan mencabut sandi lama", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await login(page, "admin");
  await page.goto("/admin/pengguna");
  const create = page.locator("form").filter({ has: page.getByRole("heading", { name: "Buat akun pengelola", exact: true }) });
  const email = `password-e2e-${randomUUID()}@uji.invalid`;
  await create.getByLabel("Nama petugas", { exact: true }).fill("Petugas sandi E2E");
  await create.getByLabel("Email", { exact: true }).fill(email);
  await create.getByRole("button", { name: "Buat akun & sandi sementara", exact: true }).click();
  const result = create.getByRole("status").filter({ hasText: "Sandi sementara, tampil satu kali" });
  await expect(result).toBeVisible();
  const temporary = (await result.locator("span").innerText()).trim();
  const password = `Sandi-baru-${randomUUID()}`;
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.getByLabel("Email pengelola", { exact: true }).fill(email);
  await page.getByLabel("Sandi", { exact: true }).fill(temporary);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/ganti-sandi$/, { timeout: 15000 });
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  const current = page.getByLabel("Sandi saat ini", { exact: true });
  const next = page.getByLabel(/^Sandi baru/);
  const confirm = page.getByLabel("Ulangi sandi baru", { exact: true });
  const submit = page.getByRole("button", { name: "Simpan sandi baru", exact: true });
  await current.fill(temporary); await next.fill(password); await confirm.fill("Konfirmasi-berbeda-123");
  await submit.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Konfirmasi sandi baru tidak sama.");
  await page.screenshot({ path: test.info().outputPath("sandi-konfirmasi.png"), fullPage: true });
  await expect(confirm).toBeFocused();
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await expect(confirm).toHaveAccessibleDescription("Konfirmasi sandi baru tidak sama.");
  await expect(next).toHaveAccessibleName("Sandi baru");
  await expect(current).toHaveValue(temporary); await expect(next).toHaveValue(password);
  await expect(confirm).toHaveValue("Konfirmasi-berbeda-123");
  await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.type(password);
  await current.fill("Sandi-lama-salah-123");
  await submit.focus(); await page.keyboard.press("Enter");
  await expect(current).toBeFocused();
  await expect(current).toHaveAccessibleDescription("Sandi saat ini tidak sesuai.");
  await expect(confirm).toHaveAttribute("aria-invalid", "false");
  await expect(next).toHaveValue(password); await expect(confirm).toHaveValue(password);
  await current.fill(temporary); await next.fill(temporary); await confirm.fill(temporary);
  await submit.focus(); await page.keyboard.press("Enter");
  await expect(next).toBeFocused();
  await expect(next).toHaveAccessibleDescription(/Minimal 12 karakter, maksimal 128 karakter.*Sandi baru harus berbeda/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("sandi-baru-sama.png"), fullPage: true });
  await next.fill(password); await confirm.fill(password);
  await submit.focus(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/login\?changed=1$/, { timeout: 15000 });
  await expect(page.getByText("Sandi berhasil diganti. Silakan masuk kembali.", { exact: true })).toBeVisible();
  await page.getByLabel("Email pengelola", { exact: true }).fill(email);
  await page.getByLabel("Sandi", { exact: true }).fill(temporary);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Email atau sandi tidak sesuai.");
  await expect(page.getByLabel("Email pengelola", { exact: true })).toHaveValue(email);
  await expect(page.getByLabel("Sandi", { exact: true })).toHaveValue(temporary);
  await page.getByLabel("Sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
});

test("unggahan yang gagal dapat diulang dengan berkas sama tanpa kehilangan draf", async ({ page, browser, baseURL, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 720, height: 456 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, "editor");
  await page.goto("/admin/artikel/baru");
  const title = page.getByRole("textbox", { name: "Judul", exact: true });
  await expect(title).toBeEnabled();
  const token = randomUUID(), slug = `unggahan-${token}`, heading = `Draf unggahan ${token.slice(0, 8)}`, alt = "Gambar sintetis pemeriksaan unggahan";
  await title.fill(heading); await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Atribusi / kredit gambar", { exact: true }).fill("Fixture sintetis E2E");
  await page.getByLabel("Teks alternatif gambar", { exact: true }).fill(alt);
  const upload = page.getByLabel(/^Unggah JPEG, PNG, atau WebP/);
  const file = { name: "gambar-uji.png", mimeType: "image/png", buffer: await sharp({ create: { width: 24, height: 16, channels: 3, background: "#02275d" } }).png().toBuffer() };
  const error = "Layanan unggahan sedang terganggu. Pilih kembali berkas yang sama.";
  await page.route("**/api/media", route => route.fulfill({ status: 503, json: { error } }), { times: 1 });
  await upload.setInputFiles(file);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(error);
  await expect.soft(upload).toBeFocused();
  await expect.soft(upload).toHaveAccessibleName("Unggah JPEG, PNG, atau WebP");
  await expect.soft(upload).toHaveAttribute("aria-invalid", "true");
  await expect.soft(upload).toHaveAccessibleDescription(/Maksimal 5 MB, 20 megapiksel.*Layanan unggahan sedang terganggu/);
  expect.soft(await upload.inputValue(), "Pilihan native dikosongkan agar berkas sama dapat dipilih ulang").toBe("");
  await expect(title).toHaveValue(heading);
  await expect(page.getByRole("main").getByRole("alert")).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: test.info().outputPath("unggahan-gagal.png") });

  let release!: () => void, reached!: () => void, rejectReached!: (error: unknown) => void, completed!: () => void, routed = false, routeError: unknown;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const responseReady = new Promise<void>((resolve, reject) => { reached = resolve; rejectReached = reject; });
  const done = new Promise<void>(resolve => { completed = resolve; });
  const handler = async (route: Route) => {
    routed = true;
    try { const response = await route.fetch(); expect(response.status()).toBe(201); reached(); await gate; await route.fulfill({ response }); }
    catch (error) { routeError = error; rejectReached(error); }
    finally { completed(); }
  };
  await page.route("**/api/media", handler);
  try {
    await upload.setInputFiles(file); await responseReady;
    await expect(upload).toBeDisabled(); await expect(title).toBeDisabled();
    await expect(page.getByRole("button", { name: "Mengunggah…", exact: true })).toBeDisabled();
    await page.screenshot({ path: test.info().outputPath("unggahan-memproses.png") });
  } finally { release(); if (routed) await done; await page.unroute("**/api/media", handler); }
  if (routeError) throw routeError;
  const image = page.getByRole("img", { name: alt, exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 24, { timeout: 15000 });
  const imageUrl = (await image.getAttribute("src"))!;
  await expect(upload).toBeEnabled(); await expect(upload).toBeFocused(); await expect(upload).toHaveAttribute("aria-invalid", "false");
  await expect(upload).toHaveAccessibleDescription("Maksimal 5 MB, 20 megapiksel. Isi atribusi sebelum mengunggah.");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  expect(await upload.inputValue()).toBe(""); await expect(title).toHaveValue(heading);
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  await expect(page).toHaveURL(/\/admin\/artikel\/[a-f0-9-]+$/, { timeout: 15000 });
  await page.reload(); await expect(title).toHaveValue(heading); await expect(image).toHaveAttribute("src", imageUrl);
  await expect(page.getByLabel("Atribusi / kredit gambar", { exact: true })).toHaveValue("Fixture sintetis E2E");
  await page.getByRole("button", { name: "Pratinjau isi", exact: true }).click();
  const preview = page.getByRole("region", { name: "Pratinjau revisi kerja", exact: true });
  await expect(preview.getByRole("img", { name: alt, exact: true })).toHaveAttribute("src", imageUrl);
  await expect(preview).toContainText("Fixture sintetis E2E");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("unggahan-tersimpan-pratinjau.png") });
  const privateMedia = await page.request.get(imageUrl);
  expect(privateMedia.status()).toBe(200);
  expect(privateMedia.headers()["content-type"]).toBe("image/webp");
  expect(privateMedia.headers()["cache-control"]).toBe("private, no-store");
  const publicContext = await browser.newContext({ baseURL });
  try {
    expect((await publicContext.request.get(imageUrl)).status()).toBe(404);
    expect((await publicContext.request.get(`/insight/${slug}`)).status()).toBe(404);
  } finally { await publicContext.close(); }
});

test("pengajuan tidak lengkap menandai kolom dan menjaga masukan editor", async ({ page }) => {
  test.setTimeout(120000);
  await login(page, "editor");
  await page.goto("/admin/artikel/baru");
  const slug = `validasi-e2e-${randomUUID()}`;
  const title = page.getByRole("textbox", { name: "Judul", exact: true });
  const summary = page.getByRole("textbox", { name: "Ringkasan", exact: true });
  const body = page.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true });
  const sources = page.getByRole("group", { name: "Sumber & rujukan", exact: true });
  await page.getByLabel("Slug").fill(slug);
  await summary.fill("Ringkasan yang harus tetap tersedia setelah validasi gagal.");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/artikel\/[a-f0-9-]{36}$/);
  await page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true }).click();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAccessibleDescription("Isi judul konten.");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).not.toContainText("Draf berhasil disimpan");
  await expect(body).toHaveAccessibleDescription("Isi konten belum lengkap.");
  await expect(page.getByLabel("Tanggal tinjauan materi", { exact: true })).toHaveAccessibleDescription(/Isi tanggal tinjauan yang sah/);
  await expect(page.getByRole("group", { name: "Bidang jabatan", exact: true })).toHaveAccessibleDescription("Pilih sedikitnya satu bidang JF.");
  await expect(sources).toHaveAccessibleDescription(/Sertakan sedikitnya satu sumber publik HTTPS/);
  await expect(summary).toHaveValue("Ringkasan yang harus tetap tersedia setelah validasi gagal.");

  await page.keyboard.type("Artikel validasi pengajuan");
  await body.fill("Isi yang dilengkapi setelah pengajuan ditolak.");
  await page.getByLabel("Tanggal tinjauan materi", { exact: true }).fill("2026-10-21");
  await page.getByRole("checkbox", { name: "Penilai Pemerintah", exact: true }).check();
  await expect(page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(title).toHaveAttribute("aria-invalid", "false");
  await expect(title).toHaveAccessibleDescription("");
  await page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true }).click();
  await expect(sources).toBeFocused();
  await expect(sources).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveValue("Artikel validasi pengajuan");
  await expect(body).toHaveValue("Isi yang dilengkapi setelah pengajuan ditolak.");
  await sources.getByRole("button", { name: "Tambah sumber", exact: true }).focus();
  await page.keyboard.press("Enter");
  await sources.getByLabel("Judul sumber", { exact: true }).fill("Sumber fixture E2E");
  await sources.getByLabel("Tanggal tinjauan sumber", { exact: true }).fill("2026-10-21");
  await sources.getByLabel("URL HTTPS publik", { exact: true }).fill("https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(sources).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Simpan draf", exact: true })).toHaveCount(0);
});

test("editor menjaga masukan saat skrip klien ditahan", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await login(page, "editor");
  let resume!: () => void;
  const scripts = new Promise<void>(resolve => { resume = resolve; });
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/, async route => { await scripts; await route.continue(); });
  const title = page.getByRole("textbox", { name: "Judul", exact: true });
  const slug = page.getByLabel("Slug");
  const summary = page.getByRole("textbox", { name: "Ringkasan", exact: true });
  const save = page.getByRole("button", { name: "Simpan draf", exact: true });
  const token = randomUUID(), text = `Artikel hidrasi ${token.slice(0, 8)}`;
  let editing: Promise<void> | undefined;
  try {
    expect((await page.goto("/admin/artikel/baru", { waitUntil: "commit" }))?.status()).toBe(200);
    await expect(title).toBeVisible();
    editing = (async () => { await title.fill(text); await slug.fill(`hidrasi-${token}`); await summary.fill("Ringkasan yang diisi sesudah kontrol siap."); await save.click(); })();
    expect.soft({ title: await title.isDisabled(), slug: await slug.isDisabled(), summary: await summary.isDisabled(), save: await save.isDisabled() }).toEqual({ title: true, slug: true, summary: true, save: true });
  } finally { resume(); }
  await page.waitForLoadState("load");
  await editing;
  await expect(page.getByRole("heading", { name: text, exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  await page.reload();
  await expect(title).toHaveValue(text); await expect(slug).toHaveValue(`hidrasi-${token}`);
  await expect(summary).toHaveValue("Ringkasan yang diisi sesudah kontrol siap.");
});

test("pengajuan profil menandai kolom khusus dan memfokuskan daftar yang bermasalah", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, "editor");
  const fixture = initialContent.find(item => item.kind === "profession" && item.professions.includes(isMobile ? "plb" : "pp"))!;
  await page.goto("/admin/profil-jf");
  await page.getByRole("link", { name: fixture.payload.title, exact: true }).click();
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  const fields = [
    ["Definisi", "definition", "Isi definisi profil."],
    ["Kategori", "category", "Isi kategori jabatan."],
    ["Jenjang", "grades", "Isi jenjang, satu entri tidak kosong per baris."],
    ["Tugas", "tasks", "Isi tugas, satu entri tidak kosong per baris."],
    ["Kompetensi", "competencies", "Isi kompetensi, satu entri tidak kosong per baris."],
    ["Catatan nomenklatur", "nomenclature", "Isi catatan nomenklatur profil."]
  ] as const;
  for (const [label] of fields) await page.getByRole("textbox", { name: new RegExp(`^${label}`) }).fill("");
  const save = page.getByRole("button", { name: "Simpan draf", exact: true });
  const submit = page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true });
  await save.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  await expect(submit).toBeEnabled(); await submit.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Definisi", exact: true })).toBeFocused();
  for (const [label, key, message] of fields) {
    const control = page.getByRole("textbox", { name: label, exact: true });
    await expect(control).toHaveAttribute("aria-invalid", "true");
    await expect(control).toHaveAccessibleDescription(["grades", "tasks", "competencies"].includes(key) ? `Satu entri per baris. ${message}` : message);
    await expect(control).toHaveValue("");
  }
  await expect(page.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true })).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByRole("textbox", { name: "Ringkasan", exact: true })).toHaveValue(fixture.payload.summary);
  await page.screenshot({ path: test.info().outputPath("profil-kesalahan-kolom.png") });
  for (const [label, key] of fields.slice(0, 2).concat(fields.slice(5))) await page.getByRole("textbox", { name: label, exact: true }).fill(fixture.payload[key] as string);
  await page.getByRole("textbox", { name: "Jenjang", exact: true }).fill("Jenjang uji\n");
  await save.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  await expect(submit).toBeEnabled(); await submit.focus(); await page.keyboard.press("Enter");
  const grades = page.getByRole("textbox", { name: "Jenjang", exact: true });
  await expect(grades).toBeFocused();
  await expect(grades).toBeInViewport({ ratio: 1 });
  await expect(grades).toHaveValue("Jenjang uji\n");
  await expect(grades).toHaveAccessibleDescription("Satu entri per baris. Isi jenjang, satu entri tidak kosong per baris.");
  await page.screenshot({ path: test.info().outputPath("profil-fokus-daftar.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const [label, key] of fields.slice(2, 5)) {
    const control = page.getByRole("textbox", { name: label, exact: true });
    await control.fill((fixture.payload[key] as string[]).join("\n"));
  }
  await save.focus(); await page.keyboard.press("Enter");
  await expect(grades).toHaveAttribute("aria-invalid", "false");
  await expect(grades).toHaveAccessibleDescription("Satu entri per baris.");
  await expect(submit).toBeEnabled(); await submit.focus(); await page.keyboard.press("Enter");
  await expect(save).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Revisi diajukan dan dikunci" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Lihat versi publik", exact: true })).toHaveAttribute("href", `/informasi/${fixture.slug}`);
});

test("pengajuan regulasi menandai kolom khusus dan mempertahankan URL yang ditolak", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, "editor");
  await page.goto("/admin/regulasi/baru");
  const slug = `regulasi-validasi-${randomUUID()}`, title = `Regulasi validasi ${slug.slice(-8)}`;
  await page.getByRole("textbox", { name: "Judul", exact: true }).fill(title);
  await page.getByLabel("Slug").fill(slug);
  await page.getByRole("textbox", { name: "Ringkasan", exact: true }).fill("Ringkasan regulasi yang harus bertahan.");
  await page.getByLabel("Tanggal tinjauan materi", { exact: true }).fill("2026-10-21");
  await page.getByRole("checkbox", { name: "Penilai Pemerintah", exact: true }).check();
  const sources = page.getByRole("group", { name: "Sumber & rujukan", exact: true });
  await sources.getByRole("button", { name: "Tambah sumber", exact: true }).click();
  await sources.getByLabel("Judul sumber", { exact: true }).fill("Sumber regulasi fixture");
  await sources.getByLabel("Tanggal tinjauan sumber", { exact: true }).fill("2026-10-21");
  const officialUrl = "https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023";
  await sources.getByLabel("URL HTTPS publik", { exact: true }).fill(officialUrl);
  await page.getByRole("textbox", { name: "Tahun", exact: true }).fill("20x6");
  const url = page.getByRole("textbox", { name: "URL dokumen resmi (.go.id)", exact: true });
  await url.fill("https://example.invalid/aturan");
  await page.getByRole("textbox", { name: "Catatan status & riwayat", exact: true }).fill("");
  const save = page.getByRole("button", { name: "Simpan draf", exact: true });
  const submit = page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true });
  await save.focus(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/regulasi\/[a-f0-9-]{36}$/);
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  await expect(submit).toBeEnabled(); await submit.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Nomor peraturan", exact: true })).toBeFocused();
  for (const [label, message] of [
    ["Nomor peraturan", "Isi nomor peraturan."], ["Tahun", "Isi tahun peraturan dengan empat angka."],
    ["Penerbit", "Isi penerbit peraturan."], ["URL dokumen resmi (.go.id)", "Isi URL HTTPS dari domain resmi .go.id."],
    ["Catatan status & riwayat", "Isi catatan status dan riwayat peraturan."]
  ]) {
    const control = page.getByRole("textbox", { name: label, exact: true });
    await expect(control).toHaveAttribute("aria-invalid", "true");
    await expect(control).toHaveAccessibleDescription(message);
  }
  await expect(page.getByRole("textbox", { name: "Tahun", exact: true })).toHaveValue("20x6");
  await expect(url).toHaveValue("https://example.invalid/aturan");
  await expect(page.getByRole("textbox", { name: "Ringkasan", exact: true })).toHaveValue("Ringkasan regulasi yang harus bertahan.");
  await page.screenshot({ path: test.info().outputPath("regulasi-kesalahan-kolom.png") });
  await page.getByRole("textbox", { name: "Nomor peraturan", exact: true }).fill("Nomor 1 Tahun 2026");
  await page.getByRole("textbox", { name: "Tahun", exact: true }).fill("2026");
  await page.getByRole("textbox", { name: "Penerbit", exact: true }).fill("Penerbit fixture");
  await page.getByRole("textbox", { name: "Catatan status & riwayat", exact: true }).fill("Status fixture untuk pengujian, bukan aturan resmi.");
  await save.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  await expect(submit).toBeEnabled(); await submit.focus(); await page.keyboard.press("Enter");
  await expect(url).toBeFocused();
  await expect(url).toBeInViewport({ ratio: 1 });
  await expect(url).toHaveValue("https://example.invalid/aturan");
  await expect(page.getByRole("textbox", { name: "Nomor peraturan", exact: true })).toHaveAttribute("aria-invalid", "false");
  await page.screenshot({ path: test.info().outputPath("regulasi-fokus-url.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await url.fill(officialUrl);
  await save.focus(); await page.keyboard.press("Enter");
  await expect(url).toHaveAttribute("aria-invalid", "false");
  await expect(submit).toBeEnabled(); await submit.focus(); await page.keyboard.press("Enter");
  await expect(save).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Revisi diajukan dan dikunci" })).toBeFocused();
  const publicResponse = await page.request.get("/regulasi");
  expect(publicResponse.status()).toBe(200); expect(await publicResponse.text()).not.toContain(title);
});

test("editor dan penyetuju menyelesaikan revisi tanpa membocorkan draf", async ({ browser, page, baseURL, isMobile }) => {
  test.setTimeout(120000);
  const viewport = { width: isMobile ? 320 : 1440, height: 900 };
  const editorContext = await browser.newContext({ baseURL, viewport, isMobile });
  const approverContext = await browser.newContext({ baseURL, viewport, isMobile });
  try {
    const editor = await editorContext.newPage();
    const approver = await approverContext.newPage();
    const slug = `publikasi-e2e-${randomUUID()}`;
    const title = `Artikel uji ${slug}`;
    const publicPath = `/insight/${slug}`;
    await login(editor, "editor");
    await editor.goto("/admin/artikel/baru");
    await editor.getByLabel("Judul", { exact: true }).fill(title);
    await editor.getByLabel("Slug").fill(slug);
    await editor.getByLabel("Tanggal tinjauan materi").fill("2026-10-21");
    await editor.getByLabel("Ringkasan", { exact: true }).fill("Materi pengujian browser terisolasi.");
    await editor.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true }).fill("Isi draf sebelum tinjauan penyetuju.");
    await editor.getByRole("checkbox", { name: "Penilai Pemerintah", exact: true }).check();
    await editor.getByRole("button", { name: "Tambah sumber", exact: true }).click();
    await editor.getByLabel("Judul sumber", { exact: true }).fill("Sumber fixture E2E");
    await editor.getByLabel("Tanggal tinjauan sumber").fill("2026-10-21");
    await editor.getByLabel("URL HTTPS publik").fill("https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023");
    await editor.getByRole("button", { name: "Simpan draf", exact: true }).focus(); await editor.keyboard.press("Enter");
    await expect(editor).toHaveURL(/\/admin\/artikel\/[a-f0-9-]{36}$/);
    const adminPath = new URL(editor.url()).pathname;
    await expect(editor.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect.soft(editor.getByRole("status").filter({ hasText: "Draf berhasil disimpan. Versi publik belum berubah." })).toBeFocused();
    await expect(editor.getByRole("status")).toBeInViewport({ ratio: 1 });
    await editor.screenshot({ path: test.info().outputPath("fokus-draf-baru.png") });
    expect((await page.goto(publicPath))?.status()).toBe(404);
    await page.goto(`/pencarian?q=${encodeURIComponent(slug)}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await editor.getByRole("button", { name: "Ajukan pemeriksaan", exact: true }).focus(); await editor.keyboard.press("Enter");
    await expect(editor.getByRole("button", { name: "Simpan draf", exact: true })).toHaveCount(0);
    await expect.soft(editor.getByRole("status").filter({ hasText: "Revisi diajukan dan dikunci sampai keputusan penyetuju." })).toBeFocused();
    await expect(editor.getByRole("status")).toBeInViewport({ ratio: 1 });
    await editor.screenshot({ path: test.info().outputPath("fokus-pengajuan.png") });
    await expect(editor.getByRole("button", { name: "Setujui & terbitkan", exact: true })).toHaveCount(0);
    expect((await page.goto(publicPath))?.status()).toBe(404);

    await login(approver, "approver");
    await approver.goto("/admin/persetujuan");
    await approver.getByRole("link", { name: title, exact: true }).click();
    await expect(approver.getByRole("button", { name: "Simpan draf", exact: true })).toHaveCount(0);
    const decisionNote = approver.getByRole("textbox", { name: "Catatan keputusan", exact: true });
    for (const note of ["", "   "]) {
      await decisionNote.fill(note);
      await approver.getByRole("button", { name: "Kembalikan ke editor", exact: true }).focus();
      await approver.keyboard.press("Enter");
      await expect(decisionNote).toBeFocused();
      await expect(decisionNote).toHaveAttribute("aria-invalid", "true");
      await expect(decisionNote).toHaveAccessibleDescription(/Pengembalian memerlukan catatan/);
      await expect(decisionNote).toHaveValue(note);
      expect((await page.goto(publicPath))?.status()).toBe(404);
    }
    await approver.screenshot({ path: test.info().outputPath("validasi-keputusan.png"), fullPage: true });
    await decisionNote.fill("Perjelas isi sebelum diterbitkan.");
    await approver.getByRole("button", { name: "Kembalikan ke editor", exact: true }).focus(); await approver.keyboard.press("Enter");
    await expect(approver.getByRole("button", { name: "Setujui & terbitkan", exact: true })).toHaveCount(0);
    await expect.soft(approver.getByRole("status").filter({ hasText: "Revisi dikembalikan kepada editor." })).toBeFocused();
    await expect(approver.getByRole("status")).toBeInViewport({ ratio: 1 });
    await editor.reload();
    await expect(editor.locator("main")).toContainText("Perjelas isi sebelum diterbitkan.");
    await editor.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true }).fill("Isi diperbaiki setelah tinjauan penyetuju.");
    await editor.getByRole("button", { name: "Simpan draf", exact: true }).focus(); await editor.keyboard.press("Enter");
    await expect(editor.getByRole("status")).toContainText("Draf berhasil disimpan");
    await expect.soft(editor.getByRole("status")).toBeFocused();
    await expect(editor.getByRole("status")).toBeInViewport({ ratio: 1 });
    await editor.getByRole("button", { name: "Ajukan pemeriksaan", exact: true }).focus(); await editor.keyboard.press("Enter");
    await expect(editor.getByRole("button", { name: "Simpan draf", exact: true })).toHaveCount(0);
    await expect.soft(editor.getByRole("status").filter({ hasText: "Revisi diajukan dan dikunci sampai keputusan penyetuju." })).toBeFocused();
    await expect(editor.getByRole("status")).toBeInViewport({ ratio: 1 });
    await approver.reload();
    await expect(approver.locator("main")).toContainText("Isi diperbaiki setelah tinjauan penyetuju.");
    await expect(decisionNote).toHaveAttribute("aria-invalid", "false");
    await expect(decisionNote).toHaveAccessibleDescription("Wajib diisi jika revisi dikembalikan. Maksimal 2.000 karakter.");
    await decisionNote.fill("Fixture uji telah diperiksa.");
    await approver.getByRole("button", { name: "Setujui & terbitkan", exact: true }).focus(); await approver.keyboard.press("Enter");
    // Trace action dev memerlukan 4,5 detik sebelum klien merender hasilnya.
    await expect(approver.getByRole("link", { name: "Lihat versi publik", exact: true })).toBeVisible({ timeout: 15000 });
    await expect.soft(approver.getByRole("status").filter({ hasText: "Revisi berhasil diterbitkan." })).toBeFocused();
    await expect(approver.getByRole("status")).toBeInViewport({ ratio: 1 });
    await approver.screenshot({ path: test.info().outputPath("fokus-publication.png") });
    expect((await page.goto(publicPath))?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("Isi diperbaiki setelah tinjauan penyetuju.");
    await page.goto(`/pencarian?q=${encodeURIComponent(slug)}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();

    await editor.reload();
    const draftTitle = `RAHASIA ${title}`;
    await editor.getByLabel("Judul", { exact: true }).fill(draftTitle);
    await editor.getByRole("button", { name: "Simpan draf", exact: true }).focus(); await editor.keyboard.press("Enter");
    await expect(editor.getByRole("heading", { name: draftTitle, exact: true })).toBeVisible();
    await expect.soft(editor.getByRole("status").filter({ hasText: "Draf berhasil disimpan. Versi publik belum berubah." })).toBeFocused();
    await expect(editor.getByRole("status")).toBeInViewport({ ratio: 1 });
    await page.goto(publicPath);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(draftTitle);
    await page.goto(`/pencarian?q=${encodeURIComponent(draftTitle)}`);
    await expect(page.getByRole("heading", { name: draftTitle, exact: true })).toHaveCount(0);

    await approver.goto(adminPath);
    await approver.setViewportSize({ width: viewport.width, height: 456 });
    const withdrawal = approver.locator("summary").filter({ hasText: "Tarik konten dari portal" });
    await withdrawal.focus(); await approver.keyboard.press("Enter"); await approver.keyboard.press("Tab");
    const withdrawNote = approver.getByRole("textbox", { name: "Alasan penarikan", exact: true });
    await expect(withdrawNote).toBeFocused(); await expect(withdrawNote).toBeInViewport({ ratio: 1 });
    await approver.screenshot({ path: test.info().outputPath("penarikan-dibuka-keyboard.png") });
    const archive = approver.getByRole("checkbox", { name: "Arsipkan setelah ditarik", exact: true });
    await withdrawNote.fill("   ");
    await archive.check();
    await approver.getByRole("button", { name: "Tarik konten", exact: true }).focus();
    await approver.keyboard.press("Enter");
    await expect(withdrawNote).toBeFocused();
    await expect(withdrawNote).toHaveAttribute("aria-invalid", "true");
    await expect(withdrawNote).toHaveAccessibleDescription(/Isi alasan penarikan, maksimal 2.000 karakter/);
    await expect(withdrawNote).toHaveValue("   ");
    await expect(archive).toBeChecked();
    expect((await page.goto(publicPath))?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await approver.screenshot({ path: test.info().outputPath("validasi-penarikan.png"), fullPage: true });
    await archive.uncheck();
    await withdrawNote.fill("Akhir skenario E2E terisolasi.");
    await approver.getByRole("button", { name: "Tarik konten", exact: true }).focus(); await approver.keyboard.press("Enter");
    await expect(approver.getByRole("link", { name: "Lihat versi publik", exact: true })).toHaveCount(0);
    await expect.soft(approver.getByRole("status").filter({ hasText: "Konten berhasil ditarik dari portal publik." })).toBeFocused();
    await expect(approver.getByRole("status")).toBeInViewport({ ratio: 1 });
    await approver.screenshot({ path: test.info().outputPath("fokus-penarikan.png") });
    await expect(approver.getByRole("status")).toHaveCount(1);
    await expect(approver.getByRole("status")).toHaveAttribute("tabindex", "-1");
    await approver.keyboard.press("Tab");
    const back = approver.getByRole("link", { name: "Kembali ke daftar", exact: true });
    await expect(back).toBeFocused();
    await approver.keyboard.press("Shift+Tab");
    await expect(approver.getByRole("status")).not.toBeFocused();
    await back.focus(); await approver.keyboard.press("Enter");
    await expect(approver).toHaveURL(/\/admin\/artikel$/, { timeout: 15000 });
    await expect(approver.getByRole("status")).toHaveCount(0);
    await approver.goBack();
    await expect(approver.getByRole("heading", { level: 1, name: draftTitle, exact: true })).toBeVisible();
    await expect(approver.getByRole("status")).toHaveCount(0);
    expect((await page.goto(publicPath))?.status()).toBe(404);
    await page.goto(`/pencarian?q=${encodeURIComponent(slug)}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
  } finally {
    await editorContext.close();
    await approverContext.close();
  }
});
