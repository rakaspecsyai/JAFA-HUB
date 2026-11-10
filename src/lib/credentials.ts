import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

export function credentialUser(data: Omit<Prisma.UserCreateInput, "id" | "passwordHash" | "accounts">, passwordHash: string) {
  const id = randomUUID();
  return { ...data, id, accounts: { create: { providerId: "credential", accountId: id, password: passwordHash } } };
}
