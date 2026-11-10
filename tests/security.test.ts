import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../src/lib/passwords";
import { assertOrigin } from "../src/lib/http";
import { clientKey } from "../src/lib/rate-limit";
import { AppError, publicError } from "../src/lib/errors";

test("hasil action membedakan status publik tanpa membocorkan kesalahan internal", t => {
  for (const status of [400, 401, 403, 409, 429]) {
    const error = new AppError("Pesan untuk pengguna.", status, { title: "Periksa judul." });
    assert.deepEqual(publicError(error), { status, message: error.message, fields: error.fields });
  }
  const log = t.mock.method(console, "error", () => {});
  const result = publicError(new Error("PRIVATE_DATABASE_DETAIL"));
  assert.equal(result.status, 500);
  assert.match(result.message, /Permintaan belum berhasil disimpan/);
  assert.equal(JSON.stringify(result).includes("PRIVATE_DATABASE_DETAIL"), false);
  assert.equal(JSON.stringify(log.mock.calls.map(call => call.arguments)).includes("PRIVATE_DATABASE_DETAIL"), false);
});

test("profil scrypt baru cocok dengan Node dan hash lama tetap dapat diverifikasi", async () => {
  const password = "Sandi-sintetis-regresi-123";
  const hash = await hashPassword(password);
  const [algorithm, salt, encoded] = hash.split("$");
  assert.equal(algorithm, "scrypt-16384-8-5");
  assert.equal(encoded, scryptSync(password, salt, 64, { N: 16384, r: 8, p: 5 }).toString("hex"));
  const legacy = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
  assert.equal(await verifyPassword(password, legacy), true);
  assert.equal(await verifyPassword("salah", legacy), false);
  assert.equal(await verifyPassword(password, `${hash}$tambahan`), false);
  assert.equal(await verifyPassword(password, hash.replace(algorithm, "scrypt-1073741824-8-5")), false);
  assert.equal(await verifyPassword(password, DUMMY_PASSWORD_HASH), false);
  assert.equal(await verifyPassword("x".repeat(129), hash), false);
});

test("origin asing/kosong ditolak; alias localhost hanya diterima saat pengembangan", () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = { NODE_ENV: env.NODE_ENV, APP_URL: env.APP_URL };
  try {
    env.APP_URL = "http://localhost:5174"; env.NODE_ENV = "test";
    const request = (origin?: string) => new Request("http://localhost:5174/api/auth/sign-in/email", { headers: origin ? { origin } : {} });
    assert.doesNotThrow(() => assertOrigin(request("http://localhost:5174")));
    assert.doesNotThrow(() => assertOrigin(request("http://127.0.0.1:5174")));
    for (const origin of [undefined, "null", "http://evil.invalid:5174", "http://localhost:5173", "https://localhost:5174"]) assert.throws(() => assertOrigin(request(origin)), /Asal/);
    env.NODE_ENV = "production";
    assert.throws(() => assertOrigin(request("http://127.0.0.1:5174")), /Asal/);
    env.APP_URL = "https://portal.example.invalid";
    assert.doesNotThrow(() => assertOrigin(request("https://portal.example.invalid")));
    assert.throws(() => assertOrigin(request("https://portal.example.invalid.evil.invalid")), /Asal/);
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete env[key]; else env[key] = value; } }
});

test("header IP pengunjung diabaikan sampai proxy dipercaya secara eksplisit", () => {
  const previous = { AUTH_RATE_LIMIT_KEY: process.env.AUTH_RATE_LIMIT_KEY, TRUSTED_IP_HEADER: process.env.TRUSTED_IP_HEADER };
  try {
    process.env.AUTH_RATE_LIMIT_KEY = "unit-only-synthetic-key";
    delete process.env.TRUSTED_IP_HEADER;
    const first = new Headers({ "x-forwarded-for": "192.0.2.1" });
    const second = new Headers({ "x-forwarded-for": "198.51.100.2" });
    assert.equal(clientKey(first), clientKey(second));
    process.env.TRUSTED_IP_HEADER = "x-real-ip";
    first.set("x-real-ip", "192.0.2.1"); second.set("x-real-ip", "198.51.100.2");
    assert.notEqual(clientKey(first), clientKey(second));
    assert.match(clientKey(first), /^[a-f0-9]{64}$/);
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
