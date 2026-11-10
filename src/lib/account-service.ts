import { z } from "zod";
import { db } from "./db";
import { checkActor } from "./content-service";
import { AppError } from "./errors";
import { hashPassword, temporaryPassword, verifyPassword } from "./passwords";
import type { Staff } from "./content-types";
import type { Prisma } from "@prisma/client";
import { credentialUser } from "./credentials";

async function savePassword(tx: Prisma.TransactionClient, userId: string, password: string, mustChangePassword: boolean) {
  const changed = await tx.account.updateMany({ where: { userId, accountId: userId, providerId: "credential" }, data: { password } });
  if (changed.count !== 1) throw new AppError("Kredensial akun tidak tersedia. Periksa migrasi autentikasi.", 409);
  await tx.user.update({ where: { id: userId }, data: { mustChangePassword } });
  await tx.session.deleteMany({ where: { userId } });
}

const inputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), name: z.string().trim().min(2).max(100), email: z.email().max(254), role: z.enum(["editor", "approver", "admin"]) }),
  z.object({ operation: z.literal("reset"), userId: z.string().uuid() }),
  z.object({ operation: z.literal("update"), userId: z.string().uuid(), role: z.enum(["editor", "approver", "admin"]), active: z.boolean() })
]);
export async function manageUser(actor: Staff, raw: unknown) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const [key, message] of Object.entries({ name: "Nama petugas harus terdiri dari 2–100 karakter.", email: "Masukkan email yang sah, maksimal 254 karakter.", role: "Pilih peran Editor, Penyetuju, atau Admin akun.", active: "Pilih akses Aktif atau Nonaktif." })) {
      if (parsed.error.issues.some(issue => issue.path[0] === key)) fields[key] = message;
    }
    if (Object.keys(fields).length) throw new AppError("Periksa kolom akun yang ditandai.", 400, fields);
    throw new AppError("Formulir akun tidak sesuai.");
  }
  const input = parsed.data;
  const password = input.operation !== "update" ? temporaryPassword() : undefined;
  const passwordHash = password ? await hashPassword(password) : undefined;
  await db.$transaction(async tx => {
    await checkActor(tx, actor, "admin");
    let objectId: string;
    if (input.operation === "create") {
      const email = input.email.trim().toLowerCase();
      if (await tx.user.findUnique({ where: { email } })) throw new AppError("Email sudah digunakan.", 409, { email: "Email sudah digunakan." });
      const user = await tx.user.create({ data: credentialUser({ name: input.name, email, role: input.role, mustChangePassword: true }, passwordHash!) });
      objectId = user.id;
    } else {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${input.userId}::uuid FOR UPDATE`;
      const target = await tx.user.findUnique({ where: { id: input.userId } });
      if (!target) throw new AppError("Akun tidak ditemukan.", 404);
      if (input.operation === "update" && target.role === "admin" && target.active && (!input.active || input.role !== "admin") && await tx.user.count({ where: { role: "admin", active: true } }) <= 1) {
        const message = "Admin aktif terakhir tidak dapat dinonaktifkan atau diubah perannya.", fields: Record<string, string> = {};
        if (input.role !== "admin") fields.role = message;
        if (!input.active) fields.active = message;
        throw new AppError(message, 409, fields);
      }
      if (input.operation === "reset") await savePassword(tx, target.id, passwordHash!, true);
      else {
        await tx.user.update({ where: { id: target.id }, data: { role: input.role, active: input.active } });
        await tx.session.deleteMany({ where: { userId: target.id } });
      }
      objectId = target.id;
    }
    await tx.auditEvent.create({ data: { actorId: actor.id, actorName: actor.name, action: `account.${input.operation}`, objectId } });
  }, { isolationLevel: "Serializable" });
  return { password };
}
export async function changePassword(actor: Staff, oldPassword: string, newPassword: string) {
  if (newPassword.length < 12 || newPassword.length > 128) throw new AppError("Sandi baru harus terdiri dari 12–128 karakter.", 400, { password: "Sandi baru harus terdiri dari 12–128 karakter." });
  if (oldPassword === newPassword) throw new AppError("Sandi baru harus berbeda dari sandi sementara atau sandi sebelumnya.", 400, { password: "Sandi baru harus berbeda dari sandi sementara atau sandi sebelumnya." });
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.id}::uuid FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: actor.id }, include: { accounts: { where: { providerId: "credential", accountId: actor.id } } } });
    const password = user?.accounts[0]?.password;
    if (!user?.active || !password || !await verifyPassword(oldPassword, password)) throw new AppError("Sandi saat ini tidak sesuai.", 400, { current: "Sandi saat ini tidak sesuai." });
    await savePassword(tx, actor.id, passwordHash, false);
    await tx.auditEvent.create({ data: { actorId: actor.id, actorName: actor.name, action: "account.password-change", objectId: actor.id } });
  });
}

const recoverySchema = z.object({ email: z.email().max(254), operator: z.string().trim().min(2).max(100), reason: z.string().trim().min(10).max(2000) }).strict();
export async function recoverAdmin(raw: unknown) {
  const parsed = recoverySchema.safeParse(raw);
  if (!parsed.success) throw new AppError("Isi email admin, identitas petugas teknis, dan alasan pemulihan (10–2.000 karakter).");
  const { email, operator, reason } = parsed.data;
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await db.$transaction(async tx => {
    const target = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!target) throw new AppError("Admin aktif tidak ditemukan.", 404);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${target.id}::uuid FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: target.id } });
    if (!current?.active || current.role !== "admin") throw new AppError("Pemulihan teknis hanya untuk admin yang masih aktif.", 403);
    await savePassword(tx, target.id, passwordHash, true);
    await tx.auditEvent.create({ data: { actorName: operator, action: "account.recover", objectId: target.id, note: reason } });
  }, { isolationLevel: "Serializable" });
  return { password };
}
