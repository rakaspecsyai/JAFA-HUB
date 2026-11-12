import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile, appendFile } from "node:fs/promises";
import { createServer as createHttpServer, request as upstreamRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, expect, type Browser, type BrowserContext, type Page, type Request } from "@playwright/test";
import sharp from "sharp";
import { testAccounts, testPassword } from "../e2e/accounts";
import { pdfFixture } from "../fixtures/pdf";

assert(!process.env.PLAYWRIGHT_BASE_URL, "Pemeriksa membuat runtime sendiri; target eksternal tidak diizinkan.");
const root = process.cwd(), project = `jafa-native-check-${randomBytes(6).toString("hex")}`;
const docker = process.env.JAFA_TEST_DOCKER ?? "docker";
const directory = await mkdtemp(join(tmpdir(), "jafa-native-runtime-"));
await mkdir(join(root, ".local"), { recursive: true });
const artifact = await mkdtemp(join(root, ".local", "native-runtime-"));
const log = join(artifact, "commands.log");
let env: NodeJS.ProcessEnv = { ...process.env, COMPOSE_PROJECT_NAME: project };
async function run(command: string, args: string[], input?: string) {
  const child = spawn(command, args, { cwd: root, env, stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { errors += chunk; });
  child.stdin.on("error", () => {});
  child.stdin.end(input);
  const code = await new Promise<number | null>((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  await appendFile(log, output + errors, { mode: 0o600 });
  assert.equal(code, 0, `Perintah gagal; periksa log privat ${log}`);
  return output.trim();
}
const cliPath = async (path: string) => /\.exe$/i.test(docker) && process.platform !== "win32" ? run("wslpath", ["-w", path]) : path;
const proxy = createHttpsServer();
const probe = createHttpServer();
let browser: Browser | undefined, resources = false, passed = false;
const steps: string[] = [];
const done = (step: string) => { steps.push(step); console.log(step); };
let composeArgs: string[] = [];
const compose = (args: string[], input?: string) => run(docker, [...composeArgs, ...args], input);
const database = (code: string) => compose(["run", "--rm", "--no-deps", "-T", "--entrypoint", "node", "manage", "--import", "tsx", "--input-type=module"], `import assert from 'node:assert/strict'; import {db} from './src/lib/db.ts'; try { ${code} } finally { await db.$disconnect(); }`);

try {
  await run(docker, ["info", "--format", "{{.ServerVersion}}"]);
  await run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(directory, "key.pem"), "-out", join(directory, "cert.pem"), "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"]);
  proxy.setSecureContext({ key: await readFile(join(directory, "key.pem")), cert: await readFile(join(directory, "cert.pem")) });
  await new Promise<void>((resolve, reject) => { proxy.once("error", reject); proxy.listen(0, "127.0.0.1", resolve); });
  const origin = `https://127.0.0.1:${(proxy.address() as { port: number }).port}`;
  await new Promise<void>((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const appPort = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  proxy.on("request", (request, response) => {
    const upstream = upstreamRequest({ hostname: "127.0.0.1", port: appPort, method: request.method, path: request.url, headers: {
      ...request.headers, host: new URL(origin).host, "x-forwarded-host": new URL(origin).host,
      "x-forwarded-proto": "https", "x-forwarded-for": request.socket.remoteAddress
    } }, result => { response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response); });
    upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
    request.on("aborted", () => upstream.destroy());
    request.pipe(upstream);
  });
  const fixture = { COMPOSE_PROJECT_NAME: project, APP_URL: origin, JAFA_RUNTIME_PORT: String(appPort), TRUSTED_IP_HEADER: "", POSTGRES_ADMIN_PASSWORD: randomBytes(32).toString("hex"), POSTGRES_APP_PASSWORD: randomBytes(32).toString("hex"), AUTH_RATE_LIMIT_KEY: randomBytes(32).toString("hex"), BETTER_AUTH_SECRET: randomBytes(32).toString("hex") };
  env = { ...env, ...fixture };
  const envFile = join(directory, "fixture.env");
  await writeFile(envFile, Object.entries(fixture).map(([key, value]) => `${key}=${value}`).join("\n"), { mode: 0o600 });
  composeArgs = ["compose", "--project-name", project, "--env-file", await cliPath(envFile), "-f", await cliPath(resolve("compose.yaml"))];
  await compose(["config", "--quiet"]);
  for (const args of [["ps", "-aq"], ["volume", "ls", "-q"], ["network", "ls", "-q"]]) {
    assert.equal(await run(docker, [...args, "--filter", `label=com.docker.compose.project=${project}`]), "", "Nama resource uji sudah digunakan.");
  }
  console.log("Membangun image sumber untuk pemeriksaan native.");
  await compose(["build", "app", "database"]);
  resources = true;
  await compose(["up", "-d", "--wait", "--wait-timeout", "90", "database"]);
  await compose(["run", "--rm", "-T", "manage", "migrate"]);
  await database(`
    const [role] = await db.$queryRawUnsafe('SELECT current_user AS name, rolsuper FROM pg_roles WHERE rolname=current_user');
    assert.equal(role.name, 'jafa'); assert.equal(role.rolsuper, false);
    assert.equal(await db.user.count(), 0); assert.equal(await db.contentItem.count(), 0);
    const {hashPassword} = await import('./src/lib/passwords.ts'); const {credentialUser} = await import('./src/lib/credentials.ts');
    const hash = await hashPassword(${JSON.stringify(testPassword)});
    for (const [role, account] of Object.entries(${JSON.stringify(testAccounts)})) await db.user.create({data: credentialUser({...account, role, mustChangePassword: false}, hash)});
  `);
  await compose(["up", "-d", "--wait", "--wait-timeout", "90", "app"]);
  done("Runtime produksi dan PostgreSQL native terisolasi siap.");

  browser = await chromium.launch();
  // Sertifikat fixture hanya dipercaya oleh context uji ini; tidak mengubah trust store host.
  const context = () => browser!.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
  const visitor = await context(), editor = await context(), approver = await context(), admin = await context();
  for (const ctx of [visitor, editor, approver, admin]) await ctx.tracing.start({ screenshots: true, snapshots: true });
  const loginTimes = new Map<BrowserContext, { before: number; after: number }>();
  const login = async (ctx: BrowserContext, role: keyof typeof testAccounts) => {
    const page = await ctx.newPage(); await page.goto("/admin/login");
    await page.getByLabel("Email pengelola").fill(testAccounts[role].email);
    await page.getByLabel("Sandi", { exact: true }).fill(testPassword);
    const before = Date.now();
    await page.getByRole("button", { name: "Masuk ke CMS", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/admin`, { timeout: 15000 });
    loginTimes.set(ctx, { before, after: Date.now() });
    return page;
  };
  const post = (ctx: BrowserContext, path: string, data: unknown, requestOrigin = origin) => ctx.request.post(path, { headers: { origin: requestOrigin }, data });
  assert.equal((await visitor.request.get("/api/health")).status(), 200);
  assert.equal((await visitor.request.get("/admin", { maxRedirects: 0 })).status(), 307);
  assert.equal((await post(visitor, "/api/auth/sign-up/email", {})).status(), 403);
  assert.equal((await post(visitor, "/api/auth/sign-in/email", { email: testAccounts.editor.email, password: "sandi-salah" })).status(), 401);
  assert.equal((await post(visitor, "/api/auth/sign-in/email", { email: testAccounts.editor.email, password: testPassword }, "https://asing.invalid")).status(), 403);
  let editPage = await login(editor, "editor");
  const reviewPage = await login(approver, "approver"), adminPage = await login(admin, "admin");
  for (const ctx of [editor, approver, admin]) {
    const cookies = await ctx.cookies(); const cookie = cookies.find(cookie => cookie.name === "__Secure-jafa_session");
    assert.ok(cookie?.secure && cookie.httpOnly && cookie.sameSite === "Lax" && cookie.path === "/", "Atribut cookie produksi tidak sesuai.");
    assert.ok(!cookies.some(cookie => cookie.name === "jafa_session"));
    assert.ok(cookie.expires > Date.now() / 1000 + 28700 && cookie.expires <= Date.now() / 1000 + 28800);
    const token = decodeURIComponent(cookie.value).split(".")[0];
    const timing = loginTimes.get(ctx)!;
    await database(`
      const {tokenHash} = await import('./src/lib/passwords.ts');
      const session = await db.session.findUniqueOrThrow({where:{tokenHash:tokenHash(${JSON.stringify(token)})}});
      assert.notEqual(session.tokenHash, ${JSON.stringify(token)}); assert.equal(session.ipAddress, null); assert.equal(session.userAgent, null);
      assert.ok(session.expiresAt.getTime() >= ${timing.before} + 28800000 && session.expiresAt.getTime() <= ${timing.after} + 28800000);
    `);
  }
  for (const [ctx, path] of [[editor, "/admin/pengguna"], [approver, "/admin/artikel/baru"], [admin, "/admin/artikel"]] as const) assert.equal((await ctx.request.get(path)).status(), 403);
  done("Login browser HTTPS, cookie Secure/HttpOnly/SameSite, hash/umur sesi, registrasi tertutup dan akses tiga peran lulus.");

  const action = async (page: Page, name: string) => {
    const [request] = await Promise.all([page.waitForRequest(request => request.method() === "POST" && !!request.headers()["next-action"]), page.getByRole("button", { name, exact: true }).click()]);
    return request;
  };
  const rejectAction = async (request: Request, ctx: BrowserContext, message: string) => {
    const response = await ctx.request.post(request.url(), { headers: { origin, "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"] }, data: request.postDataBuffer()! });
    assert.ok((await response.text()).includes(message), "Bypass Server Action tidak ditolak dengan pesan yang diharapkan.");
  };
  await editPage.goto("/admin/artikel/baru");
  const title = `Artikel native ${project}`, slug = `${project}-artikel`;
  await expect(editPage.getByRole("textbox", { name: "Judul", exact: true })).toBeEnabled();
  await editPage.getByRole("textbox", { name: "Judul", exact: true }).fill(title);
  await editPage.getByLabel("Slug").fill(slug);
  await editPage.getByRole("textbox", { name: "Ringkasan", exact: true }).fill("Materi sintetis untuk pemeriksaan runtime.");
  await editPage.getByRole("textbox", { name: "Isi (Markdown terbatas)", exact: true }).fill("Isi sintetis; bukan materi pengguna atau persetujuan substansi.");
  await editPage.getByLabel("Tanggal tinjauan materi", { exact: true }).fill("2026-10-21");
  await editPage.getByLabel("Penilai Pemerintah", { exact: true }).check();
  await editPage.getByRole("button", { name: "Tambah sumber", exact: true }).click();
  await editPage.getByLabel("Judul sumber", { exact: true }).fill("Sumber fixture runtime");
  await editPage.getByLabel("URL HTTPS publik", { exact: true }).fill("https://www.djkn.kemenkeu.go.id/");
  await editPage.getByLabel("Tanggal tinjauan sumber", { exact: true }).fill("2026-10-21");
  await editPage.getByLabel("Atribusi / kredit gambar", { exact: true }).fill("Gambar sintetis runtime");
  await editPage.getByLabel("Teks alternatif gambar", { exact: true }).fill("Gambar fixture native");
  const image = await sharp({ create: { width: 24, height: 16, channels: 3, background: "#123456" } }).png().withMetadata().toBuffer();
  const [uploaded] = await Promise.all([editPage.waitForResponse(response => new URL(response.url()).pathname === "/api/media" && response.request().method() === "POST"), editPage.getByLabel("Unggah JPEG, PNG, atau WebP", { exact: true }).setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: image })]);
  assert.equal(uploaded.status(), 201);
  const media = `/api/media/${(await uploaded.json()).id}`;
  const sanitized = await editor.request.get(media); assert.equal(sanitized.status(), 200);
  const metadata = await sharp(await sanitized.body()).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(metadata.width, 24); assert.equal(metadata.height, 16); assert.ok(!metadata.exif && !metadata.icc);
  const saveRequest = await action(editPage, "Simpan draf");
  await expect(editPage).toHaveURL(/\/admin\/artikel\/[a-f0-9-]+$/, { timeout: 15000 });
  await expect(editPage.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeVisible();
  const contentUrl = editPage.url(), itemId = new URL(contentUrl).pathname.split("/").pop()!;
  for (const ctx of [visitor, admin]) assert.equal((await ctx.request.get(media)).status(), 404);
  assert.equal((await approver.request.get(media)).status(), 200);
  for (const ctx of [approver, admin]) {
    assert.equal((await ctx.request.post("/api/media", { headers: { origin }, data: "bukan gambar" })).status(), 403);
    await rejectAction(saveRequest, ctx, "Peran Anda tidak memiliki akses");
  }
  await rejectAction(saveRequest, visitor, "Sesi Anda berakhir");
  await database("assert.equal(await db.contentItem.count(), 1); assert.equal(await db.mediaAsset.count(), 1);");
  const publicState = async (path: string, visible: boolean) => {
    assert.equal((await visitor.request.get(path)).status(), visible ? 200 : 404);
    for (const url of ["/insight", `/pencarian?q=${encodeURIComponent(project)}`, "/sitemap.xml"]) {
      const reference = url === "/sitemap.xml" ? `<loc>${origin}${path}</loc>` : `href="${path}"`;
      assert.equal((await (await visitor.request.get(url)).text()).includes(reference), visible, `Status publik tidak sesuai pada ${url}.`);
    }
  };
  await publicState(`/insight/${slug}`, false);
  await action(editPage, "Ajukan pemeriksaan");
  await expect(editPage.getByRole("status").filter({ hasText: "Revisi diajukan" })).toBeVisible();

  const changeRole = async (role: "editor" | "approver") => {
    await adminPage.goto("/admin/pengguna");
    const panel = adminPage.getByRole("heading", { name: testAccounts.editor.name, exact: true }).locator("..");
    await panel.getByLabel("Peran", { exact: true }).selectOption(role);
    await panel.getByRole("button", { name: "Simpan akses", exact: true }).click();
    await expect(panel.getByRole("status")).toHaveText("Perubahan akun berhasil disimpan.");
  };
  await changeRole("approver");
  assert.equal((await editor.request.get("/admin", { maxRedirects: 0 })).status(), 307);
  const contributor = await context(), contributorPage = await login(contributor, "editor");
  await contributorPage.goto(contentUrl); await action(contributorPage, "Setujui & terbitkan");
  await expect(contributorPage.getByRole("status")).toContainText("kontributor tidak boleh menyetujui revisinya sendiri");
  await publicState(`/insight/${slug}`, false);
  await contributor.close(); await changeRole("editor");
  editPage = await login(editor, "editor");
  await reviewPage.goto(contentUrl); const publishRequest = await action(reviewPage, "Setujui & terbitkan");
  await expect(reviewPage.getByRole("status").filter({ hasText: "Revisi berhasil diterbitkan" })).toBeVisible();
  for (const ctx of [editor, admin]) await rejectAction(publishRequest, ctx, "Peran Anda tidak memiliki akses");
  await publicState(`/insight/${slug}`, true); assert.equal((await visitor.request.get(media)).status(), 200);
  done("Unggah/sanitasi, draf privat, bypass Server Actions, pencabutan sesi setelah perubahan peran dan larangan menyetujui revisi sendiri lulus.");

  const shared = JSON.parse(await database(`
    const {saveDraft,submitRevision} = await import('./src/lib/content-service.ts');
    const actor = await db.user.findUniqueOrThrow({where:{email:${JSON.stringify(testAccounts.editor.email)}}});
    const original = await db.contentItem.findUniqueOrThrow({where:{id:${JSON.stringify(itemId)}},include:{publishedRevision:{include:{sources:true,professions:true}}}});
    const r = original.publishedRevision;
    const saved = await saveDraft(actor, {kind:'article',slug:${JSON.stringify(`${slug}-bersama`)},payload:{...r.payload,title:'Artikel media bersama'},reviewedOn:r.reviewedOn,sources:r.sources,professions:r.professions.map(p=>p.key)});
    await submitRevision(actor,saved.itemId,saved.revisionId,saved.version); console.log(JSON.stringify(saved));
  `));
  const sharedUrl = `/admin/artikel/${shared.itemId}`;
  await reviewPage.goto(sharedUrl); await action(reviewPage, "Setujui & terbitkan");
  await expect(reviewPage.getByRole("status").filter({ hasText: "Revisi berhasil diterbitkan" })).toBeVisible();
  await editPage.goto(contentUrl); await editPage.getByRole("textbox", { name: "Judul", exact: true }).fill(`${title} draf berikutnya`);
  await action(editPage, "Simpan draf"); await expect(editPage.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeVisible();
  const publicText = await (await visitor.request.get(`/insight/${slug}`)).text(); assert.ok(publicText.includes(title) && !publicText.includes(`${title} draf berikutnya`));
  const withdraw = async (url: string) => {
    await reviewPage.goto(url); await reviewPage.getByText("Tarik konten dari portal", { exact: true }).click();
    await reviewPage.getByLabel("Alasan penarikan", { exact: true }).fill("Penarikan fixture pemeriksaan native.");
    const request = await action(reviewPage, "Tarik konten");
    await expect(reviewPage.getByRole("status").filter({ hasText: "Konten berhasil ditarik" })).toBeVisible(); return request;
  };
  const withdrawRequest = await withdraw(contentUrl);
  for (const ctx of [editor, admin]) await rejectAction(withdrawRequest, ctx, "Peran Anda tidak memiliki akses");
  await publicState(`/insight/${slug}`, false); assert.equal((await visitor.request.get(media)).status(), 200);
  await withdraw(sharedUrl); await publicState(`/insight/${slug}-bersama`, false);
  for (const ctx of [visitor, admin]) assert.equal((await ctx.request.get(media)).status(), 404);
  for (const ctx of [editor, approver]) assert.equal((await ctx.request.get(media)).status(), 200);
  await database(`assert.equal(await db.publishedSearchEntry.count(),0); assert.equal(await db.contentItem.count({where:{publishedRevisionId:{not:null}}}),0); assert.equal(await db.auditEvent.count({where:{action:'content.publish'}}),2); assert.equal(await db.auditEvent.count({where:{action:'content.withdraw'}}),2);`);
  done("Publikasi, revisi draf berikutnya, pencarian/sitemap, penarikan dan akses media bersama native lulus.");

  const oldApprover = await context(); await oldApprover.addCookies(await approver.cookies());
  await reviewPage.getByRole("button", { name: "Keluar dari CMS", exact: true }).click(); await expect(reviewPage).toHaveURL(`${origin}/admin/login`);
  assert.equal((await oldApprover.request.get("/admin", { maxRedirects: 0 })).status(), 307); assert.equal((await oldApprover.request.get(media)).status(), 404);
  await oldApprover.close();
  await database(`await db.session.updateMany({where:{user:{email:${JSON.stringify(testAccounts.editor.email)}}},data:{expiresAt:new Date(0)}});`);
  assert.equal((await editor.request.get("/admin", { maxRedirects: 0 })).status(), 307); assert.equal((await editor.request.get(media)).status(), 404);
  done("Logout mencabut sesi lama dan expiry database menolak akses privat.");
  const pdfEditor = await login(editor, "editor"), pdfReviewer = await login(approver, "approver");
  await pdfEditor.goto("/admin/dokumen/baru");
  const pdfSlug = `${project}-pdf`;
  for (const [name, value] of [["Judul", "Sumber PDF native"], ["Ringkasan", "Sumber sintetis native; bukan materi pengguna."], ["Nomor peraturan", "UJI 1"], ["Tahun", "2026"], ["Penerbit", "Instansi fixture"], ["URL dokumen resmi (.go.id)", "https://www.djkn.kemenkeu.go.id/"], ["Catatan status & riwayat", "Berlaku pada fixture; tidak ada aturan perubahan terkait."]]) await pdfEditor.getByRole("textbox", { name, exact: true }).fill(value);
  await pdfEditor.getByLabel("Slug").fill(pdfSlug);
  await pdfEditor.getByLabel("Tanggal tinjauan materi", { exact: true }).fill("2026-10-21");
  await pdfEditor.getByRole("combobox", { name: "Status peraturan terverifikasi", exact: true }).selectOption("current");
  await pdfEditor.getByRole("checkbox", { name: "Penilai Pemerintah", exact: true }).check();
  await pdfEditor.getByRole("button", { name: "Tambah sumber", exact: true }).click();
  await pdfEditor.getByLabel("Judul sumber", { exact: true }).fill("Sumber PDF fixture native");
  await pdfEditor.getByLabel("Tanggal tinjauan sumber", { exact: true }).fill("2026-10-21");
  await pdfEditor.getByLabel("URL HTTPS publik", { exact: true }).fill("https://www.djkn.kemenkeu.go.id/");
  const pdfText = ["Pasal 1. Sumber PDF native yang pertama untuk tinjauan.", "Pasal 2. Sumber PDF native pada halaman kedua."];
  const [pdfUpload] = await Promise.all([pdfEditor.waitForResponse(response => new URL(response.url()).pathname === "/api/documents" && response.request().method() === "POST"), pdfEditor.getByLabel("Unggah PDF", { exact: true }).setInputFiles({ name: "native.pdf", mimeType: "application/pdf", buffer: pdfFixture(pdfText) })]);
  assert.equal(pdfUpload.status(), 201); const documentId = (await pdfUpload.json()).id;
  await expect(pdfEditor.getByRole("region", { name: "Teks halaman PDF 1", exact: true })).toHaveText(pdfText[0]);
  await pdfEditor.getByRole("button", { name: "Halaman berikutnya", exact: true }).click();
  await expect(pdfEditor.getByRole("region", { name: "Teks halaman PDF 2", exact: true })).toHaveText(pdfText[1]);
  await pdfEditor.getByRole("checkbox", { name: /Saya telah mencocokkan seluruh halaman/ }).check();
  await action(pdfEditor, "Simpan draf"); await expect(pdfEditor).toHaveURL(/\/admin\/dokumen\/[a-f0-9-]{36}$/, { timeout: 15000 });
  await expect(pdfEditor.getByRole("status").filter({ hasText: "Draf berhasil disimpan" })).toBeVisible();
  const pdfUrl = pdfEditor.url(); await action(pdfEditor, "Ajukan pemeriksaan");
  await expect(pdfEditor.getByRole("status").filter({ hasText: "Revisi diajukan" })).toBeVisible();
  await pdfReviewer.goto(pdfUrl); await action(pdfReviewer, "Setujui sumber PDF");
  await expect(pdfReviewer.getByRole("status").filter({ hasText: "Sumber disetujui untuk tahap indeks" })).toBeVisible();
  await pdfReviewer.goto("/admin"); await expect(pdfReviewer.getByText("Konten terbit", { exact: true }).locator("..").locator("strong")).toHaveText("0"); await pdfReviewer.goto(pdfUrl);
  for (const ctx of [visitor, admin]) for (const path of [`/api/documents/${documentId}`, `/api/documents/${documentId}/file`]) assert.equal((await ctx.request.get(path)).status(), 404);
  assert.equal((await approver.request.get(`/api/documents/${documentId}/file`)).status(), 200);
  assert.ok(!(await (await visitor.request.get("/sitemap.xml")).text()).includes(pdfSlug));
  await database(`const asset = await db.documentAsset.findUniqueOrThrow({where:{id:${JSON.stringify(documentId)}},include:{pages:{orderBy:{number:'asc'}}}}); assert.equal(asset.pageCount,2); assert.equal(asset.pages[1].text,${JSON.stringify(pdfText[1])}); const item=await db.contentItem.findUniqueOrThrow({where:{kind_slug:{kind:'knowledge',slug:${JSON.stringify(pdfSlug)}}}}); assert.ok(item.publishedRevisionId); assert.equal(await db.publishedSearchEntry.findUnique({where:{itemId:item.id}}),null);`);
  await pdfReviewer.getByText("Tarik sumber dari korpus", { exact: true }).click();
  await pdfReviewer.getByLabel("Alasan penarikan", { exact: true }).fill("Tinjauan ulang fixture PDF native.");
  await action(pdfReviewer, "Tarik sumber PDF"); await expect(pdfReviewer.getByRole("status").filter({ hasText: "Sumber ditarik dari korpus" })).toBeVisible();
  assert.equal((await visitor.request.get(`/api/documents/${documentId}/file`)).status(), 404);
  done("PDF native: worker produksi, migrasi, ekstraksi/halaman, persetujuan/penarikan dan file tetap privat lulus.");
  for (const ctx of [visitor, editor, approver, admin]) await ctx.tracing.stop();
  passed = true;
} finally {
  if (browser) {
    if (!passed) for (const [i, ctx] of browser.contexts().entries()) await ctx.tracing.stop({ path: join(artifact, `failure-${i}.zip`) }).catch(() => {});
    await browser.close();
  }
  proxy.closeAllConnections(); await new Promise<void>(resolve => proxy.close(() => resolve()));
  let cleaned = !resources;
  try {
    if (resources) {
      await compose(["logs", "--no-color", "app"]).catch(() => {});
      assert.match(project, /^jafa-native-check-[a-f0-9]{12}$/);
      await compose(["down", "--volumes", "--remove-orphans"]);
      for (const args of [["ps", "-aq"], ["volume", "ls", "-q"], ["network", "ls", "-q"]]) assert.equal(await run(docker, [...args, "--filter", `label=com.docker.compose.project=${project}`]), "");
      cleaned = true;
    }
  } finally {
    await writeFile(join(artifact, "result.json"), JSON.stringify({ project, passed, steps, isolatedResourcesRemoved: cleaned }, null, 2) + "\n", { mode: 0o600 });
    await rm(directory, { recursive: true, force: true });
    console.log(`Bukti privat: ${artifact}`);
  }
}
