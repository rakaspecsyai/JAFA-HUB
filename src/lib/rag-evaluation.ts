import { createHash } from "node:crypto";
import { z } from "zod";
import { AppError } from "./errors";
import type { KnowledgeHit } from "./knowledge";

export const MAX_EVALUATION_BYTES = 1024 * 1024;
const referenceSchema = z.object({ revisionId: z.string().uuid().toLowerCase(), pageNumber: z.number().int().min(1).max(500) }).strict();
const caseSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), question: z.string().trim().min(1).max(500),
  expected: z.enum(["answer", "fallback"]), references: z.array(referenceSchema).max(6), notes: z.string().trim().min(1).max(4000)
}).strict().superRefine((item, ctx) => {
  if (item.expected === "answer" && !item.references.length) ctx.addIssue({ code: "custom", path: ["references"], message: "Kasus jawaban memerlukan halaman acuan." });
  if (new Set(item.references.map(ref => `${ref.revisionId}:${ref.pageNumber}`)).size !== item.references.length) ctx.addIssue({ code: "custom", path: ["references"], message: "Halaman acuan tidak boleh berulang." });
});
const setSchema = z.object({ name: z.string().trim().min(1).max(120), cases: z.array(caseSchema).min(1).max(100) }).strict().superRefine((set, ctx) => {
  if (new Set(set.cases.map(item => item.id)).size !== set.cases.length) ctx.addIssue({ code: "custom", path: ["cases"], message: "ID kasus harus unik." });
  if (!set.cases.some(item => item.expected === "answer" && item.references.length)) ctx.addIssue({ code: "custom", path: ["cases"], message: "Sertakan sedikitnya satu kasus jawaban bersumber sebagai kontrol." });
});
export type EvaluationSet = z.infer<typeof setSchema>;
export function parseEvaluation(text: string): EvaluationSet {
  if (Buffer.byteLength(text, "utf8") > MAX_EVALUATION_BYTES) throw new AppError("Dataset evaluasi maksimal 1 MiB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new AppError("Dataset evaluasi harus berupa JSON yang sah."); }
  const parsed = setSchema.safeParse(value);
  if (!parsed.success) throw new AppError(`Dataset evaluasi tidak valid. Periksa kolom: ${[...new Set(parsed.error.issues.map(issue => issue.path.join(".") || "root"))].join(", ")}. Gunakan format pada docs/EVALUASI-RAG.md.`);
  return parsed.data;
}

export function scoreRetrieval(item: EvaluationSet["cases"][number], hits: KnowledgeHit[], durationMs: number) {
  const top = hits.slice(0, 6);
  const references = item.references.map(ref => {
    const index = top.findIndex(hit => hit.revisionId === ref.revisionId && hit.pageNumber === ref.pageNumber);
    return { ...ref, rank: index < 0 ? null : index + 1 };
  });
  const ranks = references.flatMap(ref => ref.rank === null ? [] : [ref.rank]);
  return { ...item, references, durationMs, firstRelevantRank: ranks.length ? Math.min(...ranks) : null,
    retrieved: top.map((hit, index) => ({ rank: index + 1, ...hit, textChecksum: createHash("sha256").update(hit.text).digest("hex") })),
    manualReview: null
  };
}

export function summarizeRetrieval(cases: ReturnType<typeof scoreRetrieval>[]) {
  const controls = cases.filter(item => item.references.length), references = cases.flatMap(item => item.references);
  const found = references.filter(ref => ref.rank !== null).length, times = cases.map(item => item.durationMs).sort((a, b) => a - b);
  return { cases: cases.length, casesWithReferences: controls.length, referencePages: references.length, foundReferencePages: found,
    missingReferencePages: references.length - found, pageRecallAt6: references.length ? found / references.length : null,
    meanReciprocalRank: controls.length ? controls.reduce((sum, item) => sum + (item.firstRelevantRank ? 1 / item.firstRelevantRank : 0), 0) / controls.length : null,
    p95RetrievalMs: times[Math.ceil(times.length * 0.95) - 1] ?? null
  };
}
