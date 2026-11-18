import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { MAX_EVALUATION_BYTES, parseEvaluation, scoreRetrieval, summarizeRetrieval } from "../src/lib/rag-evaluation";
import type { KnowledgeHit } from "../src/lib/knowledge";

const revisionId = "11111111-1111-4111-8111-111111111111";
const positive = { id: "control", question: "Apa ketentuan contoh?", expected: "answer", references: [{ revisionId, pageNumber: 2 }], notes: "Pokok jawaban ditinjau manusia." };

test("dataset R4 memvalidasi acuan, ID unik, kontrol positif dan batas ukuran tanpa memasukkan data mentah dalam error", async () => {
  const example = parseEvaluation(await readFile("docs/examples/rag-evaluation.json", "utf8"));
  assert.equal(example.cases.length, 2);
  const parse = (cases: unknown[]) => parseEvaluation(JSON.stringify({ name: "Fixture evaluasi", cases }));
  assert.equal(parse([positive]).cases[0].references[0].pageNumber, 2);
  for (const cases of [[], [positive, positive], [{ ...positive, question: "x".repeat(501) }], [{ ...positive, references: [] }], [{ ...positive, references: [positive.references[0], positive.references[0]] }], [{ ...positive, references: [{ revisionId, pageNumber: 501 }] }], [{ ...positive, expected: "fallback", references: [] }]]) assert.throws(() => parse(cases));
  assert.throws(() => parseEvaluation("bukan JSON"), /JSON/);
  assert.throws(() => parseEvaluation(" ".repeat(MAX_EVALUATION_BYTES + 1)), /1 MiB/);
  assert.throws(() => parseEvaluation(JSON.stringify({ name: "Fixture", cases: [positive], token: "PRIVATE_SYNTHETIC_TOKEN" })), error => error instanceof Error && !error.message.includes("PRIVATE_SYNTHETIC_TOKEN"));
  assert.throws(() => parseEvaluation(JSON.stringify({ name: "Fixture", cases: [positive], PRIVATE_SYNTHETIC_TOKEN: "unused" })), error => error instanceof Error && !error.message.includes("PRIVATE_SYNTHETIC_TOKEN"));
});

test("Recall halaman dan MRR membedakan revisi/halaman, tidak menghitung potongan duplikat sebagai acuan tambahan", () => {
  const first = parseEvaluation(JSON.stringify({ name: "Fixture", cases: [{ ...positive, references: [...positive.references, { revisionId, pageNumber: 3 }] }] })).cases[0];
  const hit: KnowledgeHit = { id: randomUUID(), itemId: randomUUID(), revisionId, pageNumber: 2, title: "Sumber sintetis", number: "UJI", year: "2026", regulationStatus: "current", statusNote: "Berlaku pada fixture.", officialUrl: "https://jdih.kemenkeu.go.id/dok/fixture", text: "Teks halaman sintetis." };
  const result = scoreRetrieval(first, [{ ...hit, id: randomUUID(), revisionId: randomUUID() }, { ...hit, id: randomUUID(), pageNumber: 1 }, hit, { ...hit, id: randomUUID() }], 15);
  assert.deepEqual(result.references.map(ref => ref.rank), [3, null]);
  assert.equal(result.firstRelevantRank, 3); assert.equal(result.manualReview, null);
  assert.match(result.retrieved[0].textChecksum, /^[a-f0-9]{64}$/);
  const missing = scoreRetrieval({ ...first, id: "missing", references: [first.references[1]] }, [], 5);
  const negative = scoreRetrieval({ ...first, id: "negative", expected: "fallback", references: [] }, [hit], 50);
  const summary = summarizeRetrieval([result, missing, negative]);
  assert.equal(summary.referencePages, 3); assert.equal(summary.foundReferencePages, 1); assert.equal(summary.missingReferencePages, 2);
  assert.equal(summary.pageRecallAt6, 1 / 3); assert.equal(summary.meanReciprocalRank, 1 / 6); assert.equal(summary.p95RetrievalMs, 50);
  assert.equal(summary.casesWithReferences, 2);
  const outside = scoreRetrieval(first, [...Array.from({ length: 6 }, () => ({ ...hit, id: randomUUID(), pageNumber: 1 })), hit], 1);
  assert.equal(outside.references[0].rank, null); assert.equal(outside.retrieved.length, 6);
  assert.equal(summarizeRetrieval([]).pageRecallAt6, null); assert.equal(summarizeRetrieval([]).p95RetrievalMs, null);
});
