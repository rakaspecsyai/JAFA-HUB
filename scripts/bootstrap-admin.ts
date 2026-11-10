import { parseArgs } from "node:util";
import { db } from "../src/lib/db";
import { hashPassword, temporaryPassword } from "../src/lib/passwords";
import { credentialUser } from "../src/lib/credentials";

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
if (!values.email || !values.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
  throw new Error("Usage: npm run admin:bootstrap -- --email <email> --name <name>");
}
try {
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await db.$transaction(async tx => {
    if (await tx.user.count({ where: { role: "admin", active: true } })) throw new Error("Admin aktif sudah ada. Gunakan pengelolaan pengguna di CMS.");
    const user = await tx.user.create({ data: credentialUser({ name: values.name!, email: values.email!.trim().toLowerCase(), role: "admin" }, passwordHash) });
    await tx.auditEvent.create({ data: { actorId: user.id, actorName: "Bootstrap lokal", action: "account.bootstrap", objectId: user.id } });
  }, { isolationLevel: "Serializable" });
  process.stdout.write(`Admin dibuat. Sandi sementara (ditampilkan sekali): ${password}\n`);
} finally { await db.$disconnect(); const { closeLocalDatabase } = await import("../src/lib/local-db"); await closeLocalDatabase(); }
