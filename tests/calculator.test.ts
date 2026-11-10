import test from "node:test";
import assert from "node:assert/strict";
import { calculateCredit, formatCredit, levels, ratings } from "../src/lib/calculator";
const base = { category: "keahlian", levelId: "pertama", ratingId: "sangat-baik", months: 12 };
test("empat hasil acuan PRD", () => {
  assert.equal(calculateCredit(base).value, 18.75);
  assert.equal(calculateCredit({ ...base, levelId: "muda", ratingId: "baik", months: 6 }).value, 12.5);
  assert.equal(calculateCredit({ ...base, category: "keterampilan", levelId: "terampil", ratingId: "baik" }).value, 5);
  assert.equal(calculateCredit({ ...base, ratingId: "butuh-perbaikan" }).value, 9.375);
  assert.equal(formatCredit(18.75), "18,75");
});
test("105 kombinasi jenjang, predikat, dan periode", () => {
  let count = 0;
  for (const [category, items] of Object.entries(levels)) for (const level of items) for (const rating of ratings) for (const months of [1, 6, 12]) {
    assert.equal(calculateCredit({ category, levelId: level.id, ratingId: rating.id, months }).value, months / 12 * rating.factor * level.coefficient);
    count++;
  }
  assert.equal(count, 105);
});
test("menolak bentuk periode tidak sah dan menerima digit HTML", () => {
  for (const months of ["", " ", " 1 ", null, undefined, 0, -1, 13, 1.5, true, false, {}, [], Infinity, NaN, "1e1", "0x0c", "12.0", "00012"]) assert.throws(() => calculateCredit({ ...base, months }), /1 dan 12/);
  assert.equal(calculateCredit({ ...base, months: "12" }).value, 18.75);
});
test("menolak kategori, jenjang, dan predikat tak dikenal", () => {
  for (const category of ["__proto__", "constructor", null, {}, "lain"]) assert.throws(() => calculateCredit({ ...base, category }));
  assert.throws(() => calculateCredit({ ...base, category: "keterampilan" }), /jenjang/);
  assert.throws(() => calculateCredit({ ...base, ratingId: "lain" }), /predikat/);
});
