import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { initialContent } from "../../src/lib/fixtures";
import { testAccounts, testPassword } from "./accounts";

async function login(page: Page, role: keyof typeof testAccounts) {
  await page.goto("/admin/login");
  await page.getByLabel("Email pengelola").fill(testAccounts[role].email);
  await page.getByLabel("Sandi", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
}

test("filter daftar CMS mengikuti revisi kerja dan tidak mencocokkan histori", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await login(page, "editor");
  const fixture = initialContent.filter(item => item.kind === "article")[isMobile ? 1 : 0];
  await page.goto("/admin/artikel");
  await page.getByRole("link", { name: fixture.payload.title, exact: true }).click();
  const token = randomUUID(), title = `Revisi kerja ${token}`;
  await page.getByRole("textbox", { name: "Judul", exact: true }).fill(title);
  for (const checkbox of await page.getByRole("group", { name: "Bidang jabatan", exact: true }).getByRole("checkbox").all()) await checkbox.uncheck();
  const oldJf = fixture.professions[0], newJf = oldJf === "pp" ? "plb" : "pp";
  await page.getByRole("checkbox", { name: newJf === "pp" ? "Penilai Pemerintah" : "Penata Laksana Barang", exact: true }).check();
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
  const excluded: Record<string, string>[] = [{ q: token, status: "approved" }, { q: fixture.payload.title }, { q: token, jf: oldJf }];
  for (const filters of excluded) {
    await page.goto(`/admin/artikel?${new URLSearchParams(filters)}`);
    await expect(page.locator("main")).toContainText("0 konten.");
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  }
  await page.goto(`/admin/artikel?${new URLSearchParams({ q: token, status: "draft", jf: newJf })}`);
  await expect(page.locator("main")).toContainText("1 konten.");
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Daftar konten", exact: true })).toContainText("Draf");
});

test("kanal kontak melewati validasi, pratinjau dan persetujuan sebelum tampil publik", async ({ page, browser, baseURL, isMobile }) => {
  test.setTimeout(120000);
  const viewport = { width: isMobile ? 320 : 1440, height: 900 };
  await page.setViewportSize(viewport);
  const approverContext = await browser.newContext({ baseURL, viewport });
  const publicContext = await browser.newContext({ baseURL, viewport });
  try {
    const approver = await approverContext.newPage(), visitor = await publicContext.newPage();
    await login(page, "editor");
    await page.goto("/admin/halaman");
    await page.getByRole("link", { name: "Kontak", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/halaman\/[a-f0-9-]{36}$/, { timeout: 15000 });
    const path = new URL(page.url()).pathname;
    const remove = page.getByRole("button", { name: /^Hapus kanal / });
    while (await remove.count()) await remove.first().click();
    const add = page.getByRole("button", { name: "Tambah kanal kontak", exact: true });
    const save = page.getByRole("button", { name: "Simpan draf", exact: true });
    const submit = page.getByRole("button", { name: "Ajukan pemeriksaan", exact: true });
    const group = page.getByRole("group", { name: "Kanal kontak resmi", exact: true });
    await add.click(); await save.click();
    await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    await submit.click();
    await expect(group).toBeFocused();
    await expect(group).toHaveAttribute("aria-invalid", "true");
    await expect(group).toHaveAccessibleDescription(/Lengkapi nama dan alamat setiap kanal/);
    await page.getByLabel("Nama kanal 1", { exact: true }).fill("Situs fixture");
    await page.getByLabel("Alamat kanal 1", { exact: true }).fill("javascript:alert(1)");
    await save.click();
    await expect(group).toBeFocused();
    await expect(group).toHaveAccessibleDescription(/Gunakan URL HTTPS, email, atau nomor telepon yang sah/);
    await expect(page.getByLabel("Alamat kanal 1", { exact: true })).toHaveValue("javascript:alert(1)");
    const token = randomUUID();
    const channels = [
      { type: "url", name: "Situs fixture", value: `https://uji.invalid/kontak/${token}`, href: `https://uji.invalid/kontak/${token}` },
      { type: "email", name: "Email fixture", value: `layanan-${token}@uji.invalid`, href: `mailto:layanan-${token}@uji.invalid` },
      { type: "phone", name: "Telepon fixture", value: "+1 (202) 555-0143", href: "tel:+12025550143" }
    ];
    for (const [i, channel] of channels.entries()) {
      if (i) await add.click();
      await page.getByRole("combobox", { name: `Jenis kanal ${i + 1}`, exact: true }).selectOption(channel.type);
      await page.getByLabel(`Nama kanal ${i + 1}`, { exact: true }).fill(channel.name);
      await page.getByLabel(`Alamat kanal ${i + 1}`, { exact: true }).fill(channel.value);
    }
    const hours = `Jam layanan sintetis ${token}`;
    await page.getByRole("textbox", { name: "Jam layanan (opsional)", exact: true }).fill(hours);
    await page.getByRole("button", { name: "Pratinjau isi", exact: true }).click();
    const preview = page.getByRole("region", { name: "Pratinjau revisi kerja", exact: true });
    await expect(preview.getByRole("link", { name: channels[1].value, exact: true })).toHaveAttribute("href", channels[1].href);
    await save.click();
    await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    await page.reload();
    for (const [i, channel] of channels.entries()) await expect(page.getByLabel(`Alamat kanal ${i + 1}`, { exact: true })).toHaveValue(channel.value);
    await expect(page.getByRole("textbox", { name: "Jam layanan (opsional)", exact: true })).toHaveValue(hours);
    await visitor.goto("/kontak");
    await expect(visitor.getByRole("link", { name: channels[1].value, exact: true })).toHaveCount(0);
    await submit.click();
    await expect(save).toHaveCount(0);
    await login(approver, "approver"); await approver.goto(path);
    await expect(approver.getByRole("link", { name: channels[1].value, exact: true })).toHaveAttribute("href", channels[1].href);
    await approver.getByRole("button", { name: "Setujui & terbitkan", exact: true }).click();
    await expect(approver.getByRole("status").filter({ hasText: "Revisi berhasil diterbitkan" })).toBeFocused();
    await visitor.goto("/kontak");
    const published = visitor.getByRole("region", { name: "Kanal kontak resmi", exact: true });
    for (const channel of channels) await expect(published.getByRole("link", { name: channel.value, exact: true })).toHaveAttribute("href", channel.href);
    await expect(published).toContainText(hours);
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await published.screenshot({ path: test.info().outputPath("kontak-terbit.png") });
    await page.reload();
    const privateEmail = `draf-${token}@uji.invalid`;
    await page.getByLabel("Alamat kanal 2", { exact: true }).fill(privateEmail); await save.click();
    await expect(page.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeFocused();
    await visitor.reload();
    await expect(published.getByRole("link", { name: channels[1].value, exact: true })).toBeVisible();
    await expect(visitor.getByRole("link", { name: privateEmail, exact: true })).toHaveCount(0);
  } finally { await approverContext.close(); await publicContext.close(); }
});
