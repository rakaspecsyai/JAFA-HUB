import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadDatabaseTarget } from "../scripts/seed-load";
import { loadOrigin, loadSummary, readLoadPage } from "../scripts/load-public";

test("seed beban menolak target di luar database uji loopback", () => {
  assert.equal(loadDatabaseTarget("postgresql://tester@127.0.0.1:54339/jafa_load_source"), "postgresql://tester@127.0.0.1:54339/jafa_load_source");
  for (const value of [undefined, "postgresql://host/jafa_load_source", "postgresql://127.0.0.1/production", "postgresql://127.0.0.1/jafa_load_source?host=live", "file:///jafa_load_source"]) assert.throws(() => loadDatabaseTarget(value));
});

test("beban hanya menerima origin uji dan batas PRD bersifat ketat", () => {
  assert.equal(loadOrigin("http://127.0.0.1:53174", "test-only"), "http://127.0.0.1:53174");
  for (const value of ["https://live.example", "http://127.0.0.1:80", "http://user@127.0.0.1:53174", "http://127.0.0.1:53174/path", "http://127.0.0.1:53174?host=live"]) assert.throws(() => loadOrigin(value, "test-only"));
  assert.throws(() => loadOrigin("http://127.0.0.1:53174", undefined));
  assert.equal(loadSummary([]).pass, false);
  assert.equal(loadSummary([{ ms: 1000, failed: false }]).pass, false);
  assert.equal(loadSummary(Array.from({ length: 100 }, (_, n) => ({ ms: n, failed: n === 0 }))).pass, false);
  assert.deepEqual(loadSummary(Array.from({ length: 100 }, (_, n) => ({ ms: n + 1, failed: false }))), { requests: 100, p95Ms: 95, failureRate: 0, pass: true });
});

test("pembaca beban menolak redirect dan menghitung HTTP gagal", async () => {
  const fetch = mock.method(globalThis, "fetch", async (_input: unknown, init: RequestInit | undefined) => {
    assert.equal(init?.redirect, "error");
    return new Response("unavailable", { status: 503 });
  });
  try {
    assert.equal((await readLoadPage("http://127.0.0.1:53174", "/faq")).failed, true);
    fetch.mock.mockImplementation(async () => { throw new TypeError("redirect rejected"); });
    assert.equal((await readLoadPage("http://127.0.0.1:53174", "/faq")).status, "network-or-redirect");
  } finally { fetch.mock.restore(); }
});
