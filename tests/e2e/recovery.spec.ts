import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { testAccounts, testPassword } from "./accounts";

async function login(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email pengelola").fill(email);
  await page.getByLabel("Sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
}

async function openRecovery(page: Page, name: string) {
  const link = page.getByRole("link", { name, exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const [opened] = await Promise.all([page.waitForEvent("popup"), link.click()]);
  await opened.waitForLoadState();
  expect(await opened.evaluate(() => window.opener === null)).toBe(true);
  return opened;
}

async function draft(page: Page, token: string) {
  await page.goto("/admin/artikel/baru");
  await page.getByRole("textbox", { name: "Judul", exact: true }).fill(`Draf pemulihan ${token}`);
  await page.getByLabel("Slug").fill(`pemulihan-${token}`);
  await page.getByRole("textbox", { name: "Ringkasan", exact: true }).fill("Ringkasan yang dipertahankan.");
  await page.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true }).fill("Masukan editor sebelum penyimpanan.");
}

test("sesi habis dapat dipulihkan di tab baru dan peran yang salah tetap ditolak", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await login(page, testAccounts.editor.email, testPassword);
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
  const token = randomUUID();
  await draft(page, token);
  const title = page.getByRole("textbox", { name: "Judul", exact: true });
  const body = page.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true });
  const save = page.getByRole("button", { name: "Simpan draf", exact: true });
  const result = page.getByRole("status");
  await page.context().clearCookies();
  await save.click();
  await expect(result).toContainText("Sesi Anda berakhir");
  await expect(result).toBeFocused();
  await expect(title).toHaveValue(`Draf pemulihan ${token}`);
  await expect(body).toHaveValue("Masukan editor sebelum penyimpanan.");
  await expect(page).toHaveURL(/\/admin\/artikel\/baru$/);
  const popup = await openRecovery(page, "Masuk kembali (tab baru)");
  try {
    await expect(popup).toHaveURL(/\/admin\/login$/);
    await login(popup, testAccounts.approver.email, testPassword);
    await expect(popup).toHaveURL(/\/admin$/, { timeout: 15000 });
    await page.bringToFront(); await save.click();
    await expect(result).toContainText("Peran Anda tidak memiliki akses");
    await expect(result).toBeFocused();
    await expect(page.getByRole("link", { name: "Masuk kembali (tab baru)", exact: true })).toHaveCount(0);
    await expect(title).toHaveValue(`Draf pemulihan ${token}`);
    await expect(body).toHaveValue("Masukan editor sebelum penyimpanan.");
    const access = await openRecovery(page, "Periksa akses akun (tab baru)");
    await expect(access.getByRole("link", { name: "Periksa antrean", exact: true })).toBeVisible();
    await access.close();
    await page.context().clearCookies();
    await login(popup, testAccounts.editor.email, testPassword);
    await expect(popup).toHaveURL(/\/admin$/, { timeout: 15000 });
    await page.bringToFront(); await save.click();
    await expect(page).toHaveURL(/\/admin\/artikel\/[a-f0-9-]{36}$/, { timeout: 15000 });
    await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    await expect(page.getByRole("link", { name: /tab baru/ })).toHaveCount(0);
    await page.reload();
    await expect(title).toHaveValue(`Draf pemulihan ${token}`);
    await expect(body).toHaveValue("Masukan editor sebelum penyimpanan.");
  } finally { await popup.close(); }
});

test("dua editor membandingkan konflik di tab baru dan versi basi tetap ditolak", async ({ page, browser, baseURL, isMobile, request }) => {
  test.setTimeout(120000);
  const viewport = { width: isMobile ? 320 : 1440, height: 900 };
  await page.setViewportSize(viewport);
  const adminContext = await browser.newContext({ baseURL, viewport });
  const secondContext = await browser.newContext({ baseURL, viewport });
  try {
    const admin = await adminContext.newPage(), second = await secondContext.newPage();
    const token = randomUUID(), email = `compare-${token}@uji.invalid`, password = `Sandi-baru-${token}`;
    await login(admin, testAccounts.admin.email, testPassword);
    await expect(admin).toHaveURL(/\/admin$/, { timeout: 15000 });
    await admin.goto("/admin/pengguna");
    const create = admin.getByRole("heading", { name: "Buat akun pengelola", exact: true }).locator("..");
    await create.getByRole("textbox", { name: "Nama petugas", exact: true }).fill(`Editor pembanding ${token.slice(0, 8)}`);
    await create.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await create.getByRole("button", { name: "Buat akun & sandi sementara", exact: true }).click();
    const temporary = create.getByRole("status").filter({ hasText: "Sandi sementara, tampil satu kali" });
    await expect(temporary).toBeVisible();
    await login(second, email, await temporary.locator("span").innerText());
    await expect(second).toHaveURL(/\/admin\/ganti-sandi$/, { timeout: 15000 });
    await second.getByLabel("Sandi saat ini", { exact: true }).fill(await temporary.locator("span").innerText());
    await second.getByLabel("Sandi baru", { exact: true }).fill(password);
    await second.getByLabel("Ulangi sandi baru", { exact: true }).fill(password);
    await second.getByRole("button", { name: "Simpan sandi baru", exact: true }).click();
    await expect(second).toHaveURL(/\/admin\/login\?changed=1$/, { timeout: 15000 });
    await login(second, email, password);
    await expect(second).toHaveURL(/\/admin$/, { timeout: 15000 });

    await login(page, testAccounts.editor.email, testPassword);
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
    await draft(page, token);
    await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/artikel\/[a-f0-9-]{36}$/, { timeout: 15000 });
    const path = new URL(page.url()).pathname;
    await second.goto(path);
    const localTitle = `Masukan lokal ${token}`, storedTitle = `Versi tersimpan ${token}`;
    const title = second.getByRole("textbox", { name: "Judul", exact: true });
    const body = second.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true });
    await title.fill(localTitle); await body.fill("Perubahan editor kedua yang belum tersimpan.");
    await page.getByRole("textbox", { name: "Judul", exact: true }).fill(storedTitle);
    await page.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true }).fill("Perubahan editor pertama.");
    await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    const save = second.getByRole("button", { name: "Simpan draf", exact: true });
    await save.click();
    const result = second.getByRole("status");
    await expect(result).toContainText("Versi ini telah berubah di sesi lain");
    await expect(result).not.toContainText("Muat ulang");
    await expect(result).toBeFocused();
    await expect(title).toHaveValue(localTitle);
    await expect(body).toHaveValue("Perubahan editor kedua yang belum tersimpan.");
    await expect(second.getByRole("link", { name: "Lihat versi tersimpan (tab baru)", exact: true })).toHaveAttribute("href", path);
    await result.screenshot({ path: test.info().outputPath("konflik-versi.png") });
    const stored = await openRecovery(second, "Lihat versi tersimpan (tab baru)");
    await expect(stored.getByRole("textbox", { name: "Judul", exact: true })).toHaveValue(storedTitle);
    await second.bringToFront();
    await save.click();
    await expect(result).toContainText("Versi ini telah berubah di sesi lain");
    await expect(title).toHaveValue(localTitle);
    await stored.reload();
    await expect(stored.getByRole("textbox", { name: "Judul", exact: true })).toHaveValue(storedTitle);
    const merged = `Gabungan ${token}`;
    await stored.getByRole("textbox", { name: "Judul", exact: true }).fill(merged);
    await stored.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true }).fill("Perubahan editor pertama.\n\nPerubahan editor kedua yang belum tersimpan.");
    await stored.getByRole("button", { name: "Simpan draf", exact: true }).click();
    await expect(stored.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Judul", exact: true })).toHaveValue(merged);
    await expect(title).toHaveValue(localTitle);
    expect((await request.get(`/insight/pemulihan-${token}`)).status()).toBe(404);
  } finally { await adminContext.close(); await secondContext.close(); }
});
