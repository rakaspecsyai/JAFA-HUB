import { test, expect, type Page } from "@playwright/test";
import { testAccounts, testPassword } from "./accounts";

async function login(page: Page, role: keyof typeof testAccounts) {
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.getByLabel("Email pengelola").fill(testAccounts[role].email);
  await page.getByLabel("Sandi", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
}

async function checkTextSpacing(page: Page, path: string) {
  expect((await page.goto(path))?.status()).toBe(200);
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path}: overflow setelah perubahan jarak teks`).toBe(true);
  const clipped = await page.locator("h1, h2, h3, p, button, summary").evaluateAll(elements => elements.filter(element => {
    const style = getComputedStyle(element);
    return element.getClientRects().length && element.textContent?.trim() && ((["hidden", "clip"].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1) || (["hidden", "clip"].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1));
  }).map(element => element.textContent?.trim().slice(0, 100)));
  expect.soft(clipped, `${path}: teks terpotong setelah perubahan jarak teks`).toEqual([]);
  if (["/", "/simulasi", "/admin/pengguna"].includes(path)) {
    const screenshot = test.info().outputPath(`jarak-teks-${path === "/" ? "beranda" : path.slice(1).replaceAll("/", "-")}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await test.info().attach("Jarak teks", { path: screenshot, contentType: "image/png" });
  }
}

test("kontrol header menunggu hidrasi saat skrip klien ditahan", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  let resume!: () => void;
  const scripts = new Promise<void>(resolve => { resume = resolve; });
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/, async route => { await scripts; await route.continue(); });
  const search = page.getByRole("button", { name: "Buka pencarian", exact: true });
  const faq = page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub", exact: true });
  const menu = page.getByRole("button", { name: /^(Buka|Tutup) menu$/, includeHidden: true });
  let activate: Promise<void> | undefined;
  try {
    expect((await page.goto("/", { waitUntil: "commit" }))?.status()).toBe(200);
    await expect(search).toBeVisible();
    activate = search.click();
    expect.soft({ search: await search.isDisabled(), faq: await faq.isDisabled(), menu: await menu.isDisabled() }).toEqual({ search: true, faq: true, menu: true });
  } finally { resume(); }
  await page.waitForLoadState("load");
  await activate;
  await expect(page.getByRole("dialog", { name: "Apa yang Anda cari?", exact: true }).getByRole("searchbox")).toBeFocused();
  await page.keyboard.press("Escape"); await expect(search).toBeFocused();
  await expect(faq).toBeEnabled(); await faq.click();
  await expect(page.getByRole("dialog", { name: "Asisten Jafa Hub", exact: true }).getByRole("textbox", { name: "Pertanyaan Anda", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(faq).toBeFocused();
  if (isMobile) {
    await menu.click();
    await expect(menu).toHaveAccessibleName("Tutup menu");
    await page.keyboard.press("Escape"); await expect(menu).toBeFocused();
  }
});

test("dialog pencarian dan FAQ menjaga fokus keyboard lalu mengembalikannya", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("button", { name: "Buka pencarian", exact: true });
  await expect(search).toBeEnabled();
  await search.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Apa yang Anda cari?" });
  await expect(dialog.getByRole("searchbox", { name: "Kata kunci pencarian" })).toBeFocused();
  await page.locator("header a").first().focus();
  await expect(dialog.getByRole("searchbox", { name: "Kata kunci pencarian" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Tutup pencarian", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("searchbox", { name: "Kata kunci pencarian" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cari", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(search).toBeFocused();

  const assistant = page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub" });
  await expect(assistant).toBeEnabled();
  await assistant.focus();
  await page.keyboard.press("Enter");
  const faq = page.getByRole("dialog", { name: "Asisten Jafa Hub" });
  await expect(faq.getByRole("textbox", { name: "Pertanyaan Anda" })).toBeFocused();
  await page.locator("header a").first().focus();
  await expect(faq.getByRole("textbox", { name: "Pertanyaan Anda" })).toBeFocused();
  await faq.getByRole("textbox", { name: "Pertanyaan Anda" }).fill("Angka Kredit");
  await page.keyboard.press("Tab");
  await expect(faq.getByRole("button", { name: "Kirim pertanyaan" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(faq.getByRole("textbox", { name: "Pertanyaan Anda" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(faq).not.toBeVisible();
  await expect(assistant).toBeFocused();
});

test("percakapan FAQ dapat digulir dengan keyboard dan menjelaskan gangguan pada kolom", async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
  const launcher = page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub", exact: true });
  await expect(launcher).toBeEnabled();
  await launcher.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Asisten Jafa Hub", exact: true });
  const question = dialog.getByRole("textbox", { name: "Pertanyaan Anda", exact: true });
  await expect(question).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("faq-topik.png") });
  const conversation = dialog.getByRole("region", { name: "Percakapan FAQ", exact: true });
  await expect(conversation).toHaveAttribute("tabindex", "0");
  const history = conversation.getByRole("log", { name: "Riwayat percakapan FAQ", exact: true });
  await conversation.getByRole("button", { name: "Bagaimana menghitung Angka Kredit?", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(history).toContainText("18,75 AK");
  await expect(question).toBeFocused();
  await dialog.getByRole("button", { name: "Tutup asisten", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(conversation).toBeFocused();
  await page.keyboard.press("Home");
  await expect.poll(() => conversation.evaluate(element => element.scrollTop)).toBe(0);
  expect(await conversation.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.keyboard.press("PageDown");
  await expect.poll(() => conversation.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath("faq-gulir-keyboard.png") });
  await page.keyboard.press("Tab");
  await expect(conversation.getByRole("link").first()).toBeFocused();

  await page.route("**/api/faq/match", route => route.fulfill({ status: 503, json: { error: "Layanan FAQ sedang terganggu. Coba kembali." } }), { times: 1 });
  await question.fill("Pertanyaan yang tetap tersedia saat gangguan");
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("alert")).toHaveText("Layanan FAQ sedang terganggu. Coba kembali.");
  await expect(question).toBeFocused();
  await expect(question).toHaveValue("Pertanyaan yang tetap tersedia saat gangguan");
  await expect(question).toHaveAccessibleDescription(/Layanan FAQ sedang terganggu/);
  await expect(question).toHaveAccessibleDescription(/Jangan masukkan data pribadi/);
  await expect(history).toContainText("18,75 AK");
  await page.screenshot({ path: test.info().outputPath("faq-gangguan.png") });

  await dialog.getByRole("button", { name: "Reset percakapan", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(history).toBeEmpty();
  await expect(question).toBeFocused();
  await expect(question).toHaveValue("");
  await expect(question).toHaveAccessibleDescription("Jangan masukkan data pribadi. Riwayat hanya berada di tab ini.");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(launcher).toBeFocused();
});

test("reflow portal, simulator, dan login pada lebar CSS 720 dan 320 piksel", async ({ page }) => {
  test.setTimeout(120000);
  for (const width of [720, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/regulasi", "/simulasi", "/admin/login"]) {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} pada ${width}px`).toBe(true);
    }
    await expect(page.getByRole("textbox", { name: "Email pengelola" })).toBeVisible();
    await expect(page.getByLabel("Sandi", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk ke CMS", exact: true })).toBeVisible();
  }
});

test("menu publik menutup bertahap dengan Escape dan mengembalikan fokus", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Langsung ke konten", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("button", { name: "Buka pencarian", exact: true })).toBeEnabled();
  const menu = page.getByRole("button", { name: "Buka menu", exact: true });
  if (isMobile) { await menu.focus(); await page.keyboard.press("Enter"); }
  const navigation = page.getByRole("navigation", { name: "Navigasi utama", exact: true });
  const dropdown = navigation.locator("summary");
  await dropdown.focus();
  await page.keyboard.press("Enter");
  await navigation.getByRole("link", { name: "Penilai Pemerintah", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(navigation.getByRole("link", { name: "Penilai Pemerintah", exact: true })).not.toBeVisible();
  await expect(dropdown).toBeFocused();
  if (isMobile) {
    await expect(navigation).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(navigation).not.toBeVisible();
    await expect(menu).toBeFocused();
  }
});

test("keyboard CMS melewati navigasi, menutup menu, dan menggulir tabel", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await login(page, "editor");
  await page.goto("/admin");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Langsung ke konten", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.soft(page.getByRole("main")).toBeFocused();
  const navigation = page.getByRole("navigation", { name: "Navigasi CMS", exact: true });
  if (isMobile) {
    const menu = page.getByRole("button", { name: "Buka navigasi CMS", exact: true });
    await menu.focus();
    await page.keyboard.press("Enter");
    await navigation.getByRole("link", { name: "Artikel", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(navigation).not.toBeVisible();
    await expect(menu).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await navigation.getByRole("link", { name: "Artikel", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/artikel$/, { timeout: 15000 });
  if (isMobile) await expect(navigation).not.toBeVisible();
  await page.goto("/admin");
  const activity = page.getByRole("region", { name: "Aktivitas terbaru", exact: true });
  await expect(activity).toHaveAttribute("tabindex", "0");
  await activity.focus();
  await expect(activity).toBeFocused();
  if (isMobile) {
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => activity.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  }
});

test("jarak teks publik tetap terbaca pada lebar 320 dan 1440 piksel", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  for (const path of ["/", "/informasi", "/informasi/penilai-pemerintah", "/informasi/penata-laksana-barang", "/informasi/pelelang", "/insight", "/insight/kompetensi-pelelang-2026", "/regulasi", "/faq", "/pencarian?q=PMK", "/simulasi", "/tentang", "/kontak", "/privasi", "/admin/login"]) await checkTextSpacing(page, path);
});

test("jarak teks CMS tetap terbaca untuk editor, penyetuju, dan admin", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  const routes = {
    editor: ["/admin", "/admin/artikel", "/admin/artikel/baru", "/admin/regulasi/baru", "/admin/faq/baru", "/admin/aktivitas", "/admin/ganti-sandi"],
    approver: ["/admin", "/admin/persetujuan", "/admin/aktivitas"],
    admin: ["/admin", "/admin/pengguna", "/admin/aktivitas", "/admin/ganti-sandi"]
  };
  for (const role of ["editor", "approver", "admin"] as const) {
    await login(page, role);
    for (const path of routes[role]) await checkTextSpacing(page, path);
  }
});

test("pembuka FAQ di header tidak menutupi konten dan fokus saat bergulir", async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of isMobile ? [320, 390] : [768, 1024, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/simulasi"]) {
      expect((await page.goto(path))?.status()).toBe(200);
      await page.addStyleTag({ content: "* { line-height:1.5!important; letter-spacing:.12em!important; word-spacing:.16em!important } p { margin-bottom:2em!important }" });
      await page.evaluate(() => document.fonts.ready);
      const launcher = page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub", exact: true });
      await expect(launcher).toHaveCount(1);
      await expect(page.locator("header").getByRole("button", { name: "Buka asisten FAQ Jafa Hub", exact: true })).toBeVisible();
      await expect(launcher).toBeEnabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} pada ${width}px`).toBe(true);
      const overlap = () => launcher.evaluate(button => {
        const a = button.getBoundingClientRect();
        return Array.from(document.querySelectorAll<HTMLElement>("main a, main input, main select, main button, footer a")).filter(element => {
          if (!element.getClientRects().length) return false;
          const b = element.getBoundingClientRect();
          return Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
        }).map(element => element.getAttribute("aria-label") || element.textContent?.trim());
      });
      expect(await overlap(), `${path} pada ${width}px sebelum fokus`).toEqual([]);
      const target = path === "/" ? page.locator('main a[href="/informasi/penilai-pemerintah"]').first() : page.getByLabel("Predikat kinerja", { exact: true });
      await target.focus();
      await expect(target).toBeFocused();
      expect(await overlap(), `${path} pada ${width}px saat fokus`).toEqual([]);
      await page.locator("footer a").first().focus();
      expect(await overlap(), `${path} pada ${width}px di footer`).toEqual([]);
      await launcher.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Asisten Jafa Hub", exact: true });
      await expect(dialog.getByRole("textbox", { name: "Pertanyaan Anda", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(launcher).toBeFocused();
      if (path === "/") await page.screenshot({ path: test.info().outputPath(`header-faq-${width}.png`) });
    }
  }
});
