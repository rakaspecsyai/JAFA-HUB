import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { testAccounts, testPassword } from "./accounts";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email pengelola").fill(testAccounts.editor.email);
  await page.getByLabel("Sandi", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
}

test("penggantian dan pelepasan gambar menjaga draf saat berkas ditolak atau sesi habis", async ({ page, browser, baseURL, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 720, height: 456 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page); await page.goto("/admin/artikel/baru");
  const title = page.getByRole("textbox", { name: "Judul", exact: true });
  await expect(title).toBeEnabled();
  const token = randomUUID(), heading = `Draf variasi gambar ${token.slice(0, 8)}`;
  const alt = "Gambar sintetis variasi unggahan", credit = "Fixture variasi unggahan";
  await title.fill(heading); await page.getByLabel("Slug").fill(`variasi-gambar-${token}`);
  await page.getByLabel("Atribusi / kredit gambar", { exact: true }).fill(credit);
  await page.getByLabel("Teks alternatif gambar", { exact: true }).fill(alt);
  const upload = page.getByLabel("Unggah JPEG, PNG, atau WebP", { exact: true });
  const image = page.getByRole("img", { name: alt, exact: true });
  const alert = page.getByRole("main").getByRole("alert");
  const original = { name: "gambar.png", mimeType: "image/png", buffer: await sharp({ create: { width: 24, height: 16, channels: 3, background: "#02275d" } }).png().toBuffer() };
  const replacement = { ...original, buffer: await sharp({ create: { width: 32, height: 16, channels: 3, background: "#56677b" } }).png().toBuffer() };
  const send = async (file: typeof original) => {
    const [response] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === "/api/media" && response.request().method() === "POST"),
      upload.setInputFiles(file)
    ]);
    return response;
  };
  const save = async () => {
    await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    await expect(page.getByText("Perubahan belum disimpan", { exact: true })).toHaveCount(0);
  };
  expect((await send(original)).status()).toBe(201);
  await expect(image).toHaveJSProperty("naturalWidth", 24, { timeout: 15000 });
  const originalUrl = (await image.getAttribute("src"))!;
  await save(); await expect(page).toHaveURL(/\/admin\/artikel\/[a-f0-9-]+$/, { timeout: 15000 });
  await page.reload(); await expect(image).toHaveAttribute("src", originalUrl);
  const invalid = [
    { file: { name: "gambar.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }, status: 400, message: "Gunakan gambar JPEG, PNG, atau WebP." },
    { file: { ...original, buffer: Buffer.from("Bukan isi gambar PNG.") }, status: 400, message: "Berkas tidak dapat dibaca sebagai gambar yang diizinkan." },
    { file: { ...original, buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }, status: 413, message: "Gambar maksimal 5 MB." }
  ];
  for (const entry of invalid) {
    expect((await send(entry.file)).status()).toBe(entry.status);
    await expect(alert).toHaveText(entry.message); await expect(upload).toBeFocused();
    await expect(upload).toHaveAttribute("aria-invalid", "true");
    await expect(upload).toHaveAccessibleDescription(`Maksimal 5 MB, 20 megapiksel. Isi atribusi sebelum mengunggah. ${entry.message}`);
    expect(await upload.inputValue()).toBe(""); await expect(image).toHaveAttribute("src", originalUrl);
    await expect(title).toHaveValue(heading);
  }
  await page.screenshot({ path: test.info().outputPath("gambar-ditolak.png") });
  const editedTitle = `${heading} belum disimpan`; await title.fill(editedTitle);
  await page.context().clearCookies();
  expect((await send(replacement)).status()).toBe(401);
  await expect(alert).toHaveText("Sesi Anda berakhir. Silakan masuk kembali.");
  await expect(upload).toBeFocused(); await expect(title).toHaveValue(editedTitle);
  await expect(image).toHaveAttribute("src", originalUrl);
  expect((await page.request.get(originalUrl)).status()).toBe(404);
  await page.screenshot({ path: test.info().outputPath("gambar-sesi-habis.png") });
  const loginTab = await page.context().newPage();
  try { await login(loginTab); } finally { await loginTab.close(); }
  await expect(title).toHaveValue(editedTitle);
  expect((await send(replacement)).status()).toBe(201);
  await expect(image).toHaveJSProperty("naturalWidth", 32, { timeout: 15000 });
  await expect(upload).toBeFocused(); await expect(alert).toHaveCount(0);
  const replacementUrl = (await image.getAttribute("src"))!; expect(replacementUrl).not.toBe(originalUrl);
  await save(); await page.reload(); await expect(image).toHaveAttribute("src", replacementUrl);
  await expect(title).toHaveValue(editedTitle);
  expect((await send(invalid[1].file)).status()).toBe(400);
  await expect(alert).toHaveText(invalid[1].message);
  await page.getByRole("button", { name: "Lepaskan gambar", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(image).toHaveCount(0);
  await expect.soft(upload).toBeFocused();
  await expect.soft(alert).toHaveCount(0);
  await expect.soft(upload).toHaveAttribute("aria-invalid", "false");
  await page.screenshot({ path: test.info().outputPath("gambar-dilepas.png") });
  await expect(page.getByLabel("Teks alternatif gambar", { exact: true })).toHaveValue(alt);
  await expect(page.getByLabel("Atribusi / kredit gambar", { exact: true })).toHaveValue(credit);
  await save(); await page.reload(); await expect(image).toHaveCount(0); await expect(title).toHaveValue(editedTitle);
  const visitor = await browser.newContext({ baseURL });
  try { for (const url of [originalUrl, replacementUrl]) expect((await visitor.request.get(url)).status()).toBe(404); }
  finally { await visitor.close(); }
});
