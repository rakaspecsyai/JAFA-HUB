import { db } from "./db";
import { AppError } from "./errors";
import { aiCost, type AiBudget, type AiTokens } from "./ai-config";

const budgetMessage = "Anggaran AI bulan ini tidak mencukupi. Gunakan FAQ terkurasi atau hubungi pengelola.";
// Reservasi atomik juga menghitung permintaan yang sedang berjalan dan tetap tersimpan bila proses mati.
export async function withAiBudget<T>(budget: AiBudget, maximum: AiTokens, run: (record: (tokens: AiTokens) => void) => Promise<T>) {
  const month = new Date().toISOString().slice(0, 7), reserved = aiCost(maximum, budget), started = Date.now();
  if (reserved > budget.monthly) throw new AppError(budgetMessage, 429);
  const rows = await db.$queryRaw<{ month: string }[]>`
    INSERT INTO "AiUsageMonth" (month, "costMicrousd", requests) VALUES (${month}, ${reserved}, 1)
    ON CONFLICT (month) DO UPDATE SET "costMicrousd" = "AiUsageMonth"."costMicrousd" + EXCLUDED."costMicrousd", requests = "AiUsageMonth".requests + 1
    WHERE "AiUsageMonth"."costMicrousd" <= ${budget.monthly - reserved} RETURNING month`;
  if (!rows.length) throw new AppError(budgetMessage, 429);
  let usage: AiTokens | undefined, succeeded = false;
  try {
    const result = await run(tokens => {
      aiCost(tokens, budget);
      if ((["input", "output", "embedding"] as const).some(kind => tokens[kind] > maximum[kind])) throw new Error("Pemakaian AI melampaui batas permintaan.");
      usage = tokens;
    });
    succeeded = true;
    return result;
  } finally {
    // Saat tagihan tidak diketahui (timeout/respons rusak), pertahankan seluruh reservasi; jangan mengulang panggilan berbayar.
    const charged = usage ? aiCost(usage, budget) : reserved;
    await db.$executeRaw`UPDATE "AiUsageMonth" SET "costMicrousd" = "costMicrousd" + ${charged - reserved},
      "inputTokens" = "inputTokens" + ${BigInt(usage?.input ?? 0)}, "outputTokens" = "outputTokens" + ${BigInt(usage?.output ?? 0)},
      "embeddingTokens" = "embeddingTokens" + ${BigInt(usage?.embedding ?? 0)}, "failedRequests" = "failedRequests" + ${succeeded ? 0 : 1},
      "unmeteredRequests" = "unmeteredRequests" + ${usage ? 0 : 1}, "durationMs" = "durationMs" + ${BigInt(Date.now() - started)} WHERE month = ${month}`;
  }
}
