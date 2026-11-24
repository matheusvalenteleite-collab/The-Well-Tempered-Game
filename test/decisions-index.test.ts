import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// Code audit, Phase 2: docs/DECISIONS.md is an index over range files in docs/decisions/. Every D-number must stay findable:
// each row sits in the file whose name gives its range, and the index lists every file.
const DIR = new URL("../docs/decisions/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
const PRESENT = "0-225,227-309,311-315,317-411,413-417,419-458,460-514,520-536,540-552,560-598,600-645,650-653,656-728,730-748,750-757,770-789,800-809,850-913,920-924,930-935,940-941,950-964,970-976,980-1006,1010-1018,1030-1033,1038,1043,1045-1047,1050-1052";
const index = readFileSync(new URL("../docs/DECISIONS.md", import.meta.url), "utf8");

test("the decisions index links every range file", () => {
  for (const f of files) assert.ok(index.includes(`(decisions/${f})`), `${f} is not in docs/DECISIONS.md`);
});

test("every D row is in the file of its range, and no D number is lost", () => {
  const seen = new Set<number>();
  for (const f of files) {
    const m = /^D(\d+)-D(\d+)\.md$/.exec(f);
    const rows = readFileSync(new URL(f, DIR), "utf8").split("\n").filter((l) => /^\| *D\d+[a-z]? *\|/.test(l));
    if (!m) {
      assert.equal(rows.length, 0, `${f} holds D rows`);
      continue;
    }
    const [lo, hi] = [Number(m[1]), Number(m[2])];
    for (const r of rows) {
      const n = Number(/^\| *D(\d+)/.exec(r)![1]);
      assert.ok(n >= lo && n <= hi, `D${n} is in ${f}`);
      seen.add(n);
    }
  }
  // Snapshot of the numbers that had a row when the log was split (D0-D1052; the gaps were never written, D130-D139 left free).
  const expected = PRESENT.split(",").flatMap((r) => {
    const [a, b = a] = r.split("-").map(Number);
    return Array.from({ length: b - a + 1 }, (_, k) => a + k);
  });
  assert.deepEqual(expected.filter((n) => !seen.has(n)), [], "numbers that lost their row");
});
