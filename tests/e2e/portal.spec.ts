import { test, expect } from "@playwright/test";

test("simulator memvalidasi, menghitung, menghapus hasil lama, dan mereset", async ({ page }) => {
  await page.goto("/simulasi");
  await expect(page.getByLabel("Kategori jabatan", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Jenjang jabatan", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Hitung Angka Kredit" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Pilih kategori");
  await page.getByLabel("Kategori jabatan", { exact: true }).selectOption("keahlian");
  await page.getByLabel("Jenjang jabatan", { exact: true }).selectOption("pertama");
  await page.getByLabel("Predikat kinerja", { exact: true }).selectOption("sangat-baik");
  await page.getByRole("button", { name: "Hitung Angka Kredit" }).click();
  await expect(page.getByRole("region", { name: "Hasil simulasi" })).toContainText("18,75");
  await page.getByLabel("Periode penilaian (bulan)").fill("6");
  await expect(page.getByRole("heading", { name: "Hasil simulasi Anda" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reset formulir" }).click();
  await expect(page.getByLabel("Kategori jabatan", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Kategori jabatan", { exact: true })).toBeFocused();
});

test("pencarian dialog dan filter regulasi", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Buka pencarian", exact: true }).click();
  await page.getByRole("dialog").getByPlaceholder("Jabatan, nomor regulasi, atau topik…").fill("PMK 132");
  await page.getByRole("dialog").getByRole("button", { name: "Cari", exact: true }).click();
  await expect(page).toHaveURL(/pencarian\?q=PMK/);
  await expect(page.locator("main")).toContainText("hasil untuk");
  await page.goto("/regulasi");
  await page.getByLabel("Cari nomor atau judul").fill("124");
  await page.getByRole("button", { name: "Cari regulasi" }).click();
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Sumber resmi", exact: true })).toHaveAttribute("href", "https://jdih.kemenkeu.go.id/dok/pmk-124-tahun-2023");
});

test("asisten menjawab dari FAQ dan mempertahankan riwayat tab", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub" }).click();
  const dialog = page.getByRole("dialog", { name: "Asisten Jafa Hub" });
  await dialog.getByRole("button", { name: "Bagaimana menghitung Angka Kredit?", exact: true }).click();
  await expect(dialog.getByRole("log")).toContainText("18,75 AK");
  await dialog.getByLabel("Pertanyaan Anda").fill("cuaca planet merkurius");
  await dialog.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(dialog.getByRole("log")).toContainText("Belum ada jawaban terkurasi yang cocok");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub" }).click();
  await expect(dialog.getByRole("log")).toContainText("cuaca planet merkurius");
  await dialog.getByRole("button", { name: "Reset percakapan" }).click();
  await expect(dialog.getByRole("log")).toBeEmpty();
});

test("rute publik dapat dimuat langsung dan tanpa overflow", async ({ page }) => {
  test.setTimeout(120000);
  for (const path of ["/", "/informasi", "/informasi/penilai-pemerintah", "/informasi/penata-laksana-barang", "/informasi/pelelang", "/insight", "/insight/kompetensi-pelelang-2026", "/regulasi", "/faq", "/tentang", "/kontak", "/privasi"]) {
    const response = await page.goto(path); expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("navigasi keyboard dan tampilan reduced motion", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Buka menu", exact: true }).click();
    const nav = page.getByRole("navigation", { name: "Navigasi utama" });
    await nav.getByText("Informasi JF", { exact: true }).click();
    await nav.getByRole("link", { name: "Penilai Pemerintah", exact: true }).click();
    await expect(page).toHaveURL(/informasi\/penilai-pemerintah/);
  } else {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Langsung ke konten" })).toBeFocused();
  }
});

test("admin terlindungi dan registrasi publik ditolak", async ({ page, request, baseURL }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await expect(page.getByRole("heading", { name: "Masuk ke pengelola" })).toBeVisible();
  const result = await request.post("/api/auth/sign-up/email", { headers: { Origin: new URL(baseURL!).origin }, data: { email: "uji@uji.invalid", password: "tidak-membuat-akun" } });
  expect(result.status()).toBe(403);
});
