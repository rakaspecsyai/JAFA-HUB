import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const paths = ["/insight", "/insight?page=40", "/insight/jafa-load-article-1", "/regulasi", "/regulasi?q=UJI", "/faq", "/pencarian?q=penilaian", "/pencarian?q=tidak-ada-fixture"];

export function loadOrigin(value: string | undefined, confirmation: string | undefined) {
  if (!value || confirmation !== "test-only") throw new Error("Tetapkan JAFA_LOAD_BASE_URL dan JAFA_LOAD_CONFIRM=test-only.");
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || Number(url.port) < 1024 || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Target harus origin HTTP 127.0.0.1 dengan port uji >=1024, tanpa kredensial/path/query.");
  }
  return url.origin;
}

export async function readLoadPage(origin: string, path: string) {
  const started = performance.now();
  try {
    const response = await fetch(origin + path, { redirect: "error", signal: AbortSignal.timeout(10_000) });
    await response.arrayBuffer();
    return { ms: performance.now() - started, status: String(response.status), failed: response.status !== 200 };
  } catch { return { ms: performance.now() - started, status: "network-or-redirect", failed: true }; }
}

export function loadSummary(samples: { ms: number; failed: boolean }[]) {
  const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
  const p95Ms = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null;
  const failureRate = samples.length ? samples.filter(s => s.failed).length / samples.length : 1;
  return { requests: samples.length, p95Ms, failureRate, pass: p95Ms !== null && p95Ms < 1000 && failureRate < 0.01 };
}

async function main() {
  const origin = loadOrigin(process.env.JAFA_LOAD_BASE_URL, process.env.JAFA_LOAD_CONFIRM);
  const marker = await fetch(origin + "/insight/jafa-load-article-1", { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (marker.status !== 200 || !(await marker.text()).includes("JAFA_LOAD_TEST_DATA article 1")) throw new Error("Penanda data uji tidak ditemukan; beban dibatalkan.");
  const samples: Record<string, Awaited<ReturnType<typeof readLoadPage>>[]> = Object.fromEntries(paths.map(path => [path, []]));
  const started = performance.now();
  await Promise.all(Array.from({ length: 50 }, async (_, reader) => {
    let n = reader;
    while (performance.now() - started < 300_000) {
      const path = paths[n++ % paths.length];
      samples[path].push(await readLoadPage(origin, path));
    }
  }));
  const routes = Object.fromEntries(paths.map(path => [path, loadSummary(samples[path])]));
  const all = Object.values(samples).flat();
  const statuses: Record<string, number> = {};
  for (const sample of all) statuses[sample.status] = (statuses[sample.status] ?? 0) + 1;
  const summary = loadSummary(all);
  console.log(JSON.stringify({ readers: 50, requestedSeconds: 300, elapsedSeconds: (performance.now() - started) / 1000, ...summary, statuses, routes }, null, 2));
  if (!summary.pass || Object.values(routes).some(route => !route.pass)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("Uji beban gagal; target uji/penanda tidak valid atau tidak dapat dijangkau. Tidak ada hasil beban yang dinyatakan lulus."); process.exitCode = 1; });
}
