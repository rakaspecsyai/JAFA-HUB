import { defineConfig, devices } from "@playwright/test";
import assert from "node:assert/strict";

assert(!process.env.PLAYWRIGHT_BASE_URL, "Suite E2E membuat server terisolasi sendiri; gunakan PLAYWRIGHT_PORT untuk mengganti port.");
const port = Number(process.env.PLAYWRIGHT_PORT ?? "5184");
assert(Number.isInteger(port) && port > 0 && port < 65536, "PLAYWRIGHT_PORT harus berupa port yang sah.");
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: {
    command: "node --import tsx scripts/e2e-server.ts",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 40000 }
  }
});
