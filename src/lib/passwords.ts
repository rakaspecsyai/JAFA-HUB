import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

const algorithm = "scrypt-16384-8-5";
const derive = (password: string, salt: string, p: number) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 16384, r: 8, p, maxmem: 32 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export const DUMMY_PASSWORD_HASH = `${algorithm}$${"0".repeat(32)}$${"0".repeat(128)}`;
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new Error("Sandi harus terdiri dari 12–128 karakter.");
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 5);
  return `${algorithm}$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [format, salt, encoded, extra] = stored.split("$");
  if (!["scrypt", algorithm].includes(format) || extra !== undefined || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(encoded ?? "") || password.length > 128) return false;
  const legacy = format === "scrypt";
  const derived = await derive(password, salt, legacy ? 1 : 5);
  // Match the current work factor while old hashes await a successful login upgrade.
  if (legacy) await derive(password, salt, 4);
  return timingSafeEqual(Buffer.from(encoded, "hex"), derived);
}
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const temporaryPassword = () => randomBytes(24).toString("base64url");
