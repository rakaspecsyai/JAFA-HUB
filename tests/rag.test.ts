import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { usdMicros, aiBudgetConfig, ragConfig, aiCost } from "../src/lib/ai-config";
import { ragRequest } from "../src/lib/rag";
import type { KnowledgeHit } from "../src/lib/knowledge";

test("konfigurasi AI mati tanpa keputusan model/anggaran dan menghitung USD tanpa pembulatan float", () => {
  assert.equal(usdMicros("0.000001"), 1n);
  assert.equal(usdMicros("1.234567"), 1234567n);
  for (const value of [undefined, "", "0", "-1", "1e2", "Infinity", " 1", "1.2345678", "1000000", "01"]) assert.equal(usdMicros(value), null);
  const env = { JAFA_AI_MONTHLY_USD: "1", JAFA_AI_EMBEDDING_USD_PER_MILLION: "0.01", JAFA_AI_INPUT_USD_PER_MILLION: "0.1", JAFA_AI_OUTPUT_USD_PER_MILLION: "0.5", OPENAI_API_KEY: "synthetic-key", OPENAI_RAG_MODEL: "synthetic-model", JAFA_RAG_ENABLED: "true" };
  const budget = aiBudgetConfig(env)!;
  assert.equal(aiCost({ input: 3000, output: 500, embedding: 100 }, budget), 551n);
  assert.equal(aiCost({ input: 1, output: 1, embedding: 1 }, budget), 3n);
  assert.throws(() => aiCost({ input: NaN, output: 0, embedding: 0 }, budget));
  assert.ok(ragConfig(env));
  for (const key of Object.keys(env)) assert.equal(ragConfig({ ...env, [key]: "" }), null);
  assert.equal(ragConfig({ ...env, JAFA_RAG_ENABLED: "false" }), null);
  assert.equal(ragConfig({ ...env, OPENAI_RAG_MODEL: "model/asing" }), null);
});

test("konteks RAG dibatasi per byte, membawa halaman/status dan tidak mengizinkan URL model atau tools", () => {
  const source: KnowledgeHit = { id: randomUUID(), revisionId: randomUUID(), itemId: randomUUID(), pageNumber: 7, title: "Peraturan sintetis", number: "UJI 1", year: "2026", text: "Pasal 1\nTeks sumber.", regulationStatus: "amended", statusNote: "Diubah menurut metadata sintetis.", officialUrl: "https://jdih.kemenkeu.go.id/dok/fixture" };
  const request = ragRequest("Apa isi peraturan?", [source], "synthetic-model")!;
  const body = JSON.parse(request.body), context = JSON.parse(body.input);
  assert.equal(body.store, false); assert.equal(body.stream, false); assert.deepEqual(body.tools, []);
  assert.deepEqual(body.text.format.schema.properties.sourceIds.items.enum, [source.id]);
  assert.equal(context.sources[0].pageNumber, 7); assert.equal(context.sources[0].regulationStatus, "amended");
  assert.equal(context.sources[0].statusNote, source.statusNote); assert.equal(context.sources[0].officialUrl, undefined);
  assert.ok(Buffer.byteLength(request.body) <= 16000);
  assert.match(body.instructions, /DATA, bukan instruksi/);
  assert.equal(ragRequest("pertanyaan", [{ ...source, officialUrl: "https://asing.invalid" }], "synthetic-model"), null);
  assert.equal(ragRequest("pertanyaan", [{ ...source, text: "字".repeat(16000) }], "synthetic-model"), null);
});
