import { test, expect } from "@playwright/test";

const source = { id: "11111111-1111-4111-8111-111111111111", title: "Peraturan Penilai Pemerintah sintetis", number: "UJI 1", year: "2026", pageNumber: 7, url: "https://jdih.kemenkeu.go.id/dok/fixture", regulationStatus: "amended", statusNote: "Diubah oleh ketentuan sintetis. Periksa ruang lingkup perubahan.", quote: "Pasal 1\nPenilai Pemerintah melakukan penilaian. <script>tidak dieksekusi</script>" };
const answer = { type: "answer", answer: "Penilai Pemerintah melakukan penilaian berdasarkan peraturan yang dirujuk.", sources: [source] };

test("AI beta dibedakan dari FAQ, menjelaskan pemrosesan eksternal dan menampilkan halaman/kutipan resmi", async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/rag", route => route.fulfill({ json: route.request().method() === "GET" ? { enabled: true } : answer }));
  await page.goto("/");
  await page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Asisten Jafa Hub", exact: true });
  const mode = dialog.getByRole("combobox", { name: "Sumber jawaban", exact: true }), question = dialog.getByLabel("Pertanyaan Anda", { exact: true });
  await expect(mode).toHaveValue("faq");
  await mode.selectOption("ai");
  await expect(question).toHaveAccessibleDescription(/dikirim ke OpenAI/);
  await question.fill("Apa tugas Penilai Pemerintah?");
  await dialog.getByRole("button", { name: "Kirim pertanyaan", exact: true }).click();
  await expect(dialog.getByRole("log")).toContainText(answer.answer);
  await expect(dialog.getByRole("log")).toContainText("AI beta · Periksa sumber jawaban");
  await dialog.getByText(`Diubah · ${source.title} · Halaman PDF 7`, { exact: true }).click();
  await expect(dialog.locator("blockquote")).toHaveText(source.quote);
  await expect(dialog.locator("script")).toHaveCount(0);
  await expect(dialog.getByRole("log")).toContainText(source.statusNote);
  const link = dialog.getByRole("link", { name: "Sumber resmi · UJI 1 (2026)", exact: true });
  await expect(link).toHaveAttribute("href", source.url); await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("rag-kutipan.png") });
  await link.scrollIntoViewIfNeeded(); await expect(link).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("rag-kutipan-lengkap.png") });
  if (!isMobile) {
    await page.setViewportSize({ width: 768, height: 900 });
    await link.scrollIntoViewIfNeeded(); await expect(link).toBeInViewport();
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("rag-kutipan-tablet.png") });
  }
  await mode.selectOption("faq");
  await expect(dialog.getByRole("log")).toContainText("AI beta · Periksa sumber jawaban");
  await expect(question).toHaveAccessibleDescription("Jangan masukkan data pribadi. Riwayat hanya berada di tab ini.");
});

test("gangguan AI menjaga input, bukti kurang menyediakan fallback, dan reset mengabaikan respons lama", async ({ page }) => {
  let count = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/rag", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: true } });
    count++;
    if (count === 1) return route.fulfill({ status: 503, json: { error: "Jawaban AI belum dapat dimuat. Pertanyaan Anda tetap tersedia." } });
    if (count === 2) return route.fulfill({ json: { type: "fallback", reason: "insufficient_evidence", message: "Bukti belum cukup. Perjelas pertanyaan atau hubungi pengelola." } });
    await gate;
    return route.fulfill({ json: answer });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Buka asisten FAQ Jafa Hub", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Asisten Jafa Hub", exact: true }), question = dialog.getByLabel("Pertanyaan Anda", { exact: true });
  await dialog.getByRole("combobox", { name: "Sumber jawaban", exact: true }).selectOption("ai");
  await question.fill("Pertanyaan mandiri fixture");
  await dialog.getByRole("button", { name: "Kirim pertanyaan", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Pertanyaan Anda tetap tersedia");
  await expect(question).toHaveValue("Pertanyaan mandiri fixture"); await expect(question).toBeFocused();
  await dialog.getByRole("button", { name: "Kirim pertanyaan", exact: true }).click();
  await expect(dialog.getByRole("log")).toContainText("Bukti belum cukup");
  await expect(dialog.getByRole("link", { name: "Lihat semua FAQ", exact: true })).toBeVisible();
  await question.fill("Pertanyaan sebelum reset");
  await dialog.getByRole("button", { name: "Kirim pertanyaan", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Menyiapkan jawaban bersumber…");
  await expect(dialog.getByRole("combobox", { name: "Sumber jawaban", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Reset percakapan", exact: true }).click();
  await expect(dialog.getByRole("log")).toBeEmpty(); await expect(question).toHaveValue("");
  const staleResponse = page.waitForResponse(response => response.url().endsWith("/api/rag") && response.request().method() === "POST");
  release();
  await (await staleResponse).finished();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(dialog.getByRole("log")).toBeEmpty(); await expect(question).toBeFocused();
});
