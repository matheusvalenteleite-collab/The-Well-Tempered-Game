import { test } from "node:test";
import assert from "node:assert/strict";
import { lectioFor, modeStudy } from "../src/ui/study.ts";

// D153: every lesson of three and four voices has its Lectio, and each quotation names a page of the print.
test("three- and four-voice Lectio: every lesson, every mode, quotes with pages in range", () => {
  const lessons: [3 | 4, string, number, number][] = [
    [3, "1", 81, 93], [3, "2", 94, 99], [3, "3", 99, 102], [3, "c", 102, 102], [3, "4", 103, 111], [3, "5", 111, 114],
    [4, "1", 114, 121], [4, "2", 121, 123], [4, "3", 123, 131], [4, "4", 131, 136], [4, "5", 136, 138], [4, "6", 138, 138],
  ];
  for (const [v, l, from, to] of lessons) {
    const s = lectioFor(v, l);
    assert.ok(s.study.length > 0, `${v}.${l}`);
    for (const b of s.study)
      if (b.type === "fux") {
        const p = Number(/\d+/.exec(b.page)![0]);
        assert.ok(p >= from && p <= to, `${v}.${l}: p. ${b.page} outside ${from}-${to}`);
        assert.ok(b.latin.length > 10 && b.english.length > 10);
      }
  }
  for (const f of ["D", "E", "F", "G", "A", "C"]) assert.ok(modeStudy(f).body.length > 0);
});
