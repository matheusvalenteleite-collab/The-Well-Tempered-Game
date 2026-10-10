import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY } from "../src/wtc/library.ts";
import { mergeSections, studyMoments } from "../src/wtc/study.ts";
import { beatOf } from "../src/wtc/counterpoint.ts";
import { parsePitch } from "../src/music/pitch.ts";

// D137: the study's readings against Ledbetter's claims, as checked against the score.
function study(id: string) {
  const L = LIBRARY.find((x) => x.id === id)!;
  const f = L.fugue();
  const tonicPc = parsePitch(`${L.key[0].toUpperCase()}${L.key.slice(1)}4`).midi % 12;
  const sj = f.subject[f.subject.length - 1];
  const r = studyMoments(f.notes, f.voice, f.count, f.entries, f.barQuarters, L.key[0] === L.key[0].toLowerCase(), { beat: beatOf(f.time), tonicPc, later: f.later, subjectLength: sj.at + sj.dur });
  const end = Math.max(...f.notes.map((n) => n.at + n.dur));
  const bar = (q: number) => Math.floor(q / f.barQuarters + 1e-6) + 1 - f.pickup;
  return { f, ...r, bar, sections: mergeSections(r.sections, f.given, f.later, f.barQuarters, f.pickup, end) };
}

test("Ledbetter: a long subject's exposition is no stretto (Book II no. 9, Book I nos. 17, 22)", () => {
  for (const id of ["wtc2.09", "wtc1.17", "wtc1.22"]) {
    const s = study(id);
    assert.ok(!s.moments.some((m) => m.kind === "stretto" && s.bar(m.from) <= 4), id);
  }
  // His strettos are still there: Book I no. 1 at bb. 7 and 10.
  const c = study("wtc1.01");
  for (const b of [7, 10]) assert.ok(c.moments.some((m) => m.kind === "stretto" && Math.abs(c.bar(m.from) - b) <= 1), `b.${b}`);
});

test("Ledbetter: Book I no. 1's dominant pedal at bb. 21-2 and tonic pedal from b. 24", () => {
  const s = study("wtc1.01");
  const pedals = s.moments.filter((m) => m.kind === "pedal");
  assert.ok(pedals.some((m) => m.detail.pc === 7 && s.bar(m.from) <= 22 && s.bar(m.to - 0.01) >= 21));
  assert.ok(pedals.some((m) => m.detail.pc === 0 && s.bar(m.from) === 24));
});

test("Ledbetter: Book II no. 21's pedals in the alto (bb. 14-16) and the soprano (bb. 22-4)", () => {
  const s = study("wtc2.21");
  const above = s.moments.filter((m) => m.kind === "pedal" && m.detail.place !== "bass");
  assert.ok(above.some((m) => m.detail.place === "inner" && s.bar(m.from) <= 16 && s.bar(m.to - 0.01) >= 14));
  assert.ok(above.some((m) => m.detail.place === "upper" && s.bar(m.from) <= 24 && s.bar(m.to - 0.01) >= 22));
});

test("Ledbetter: later subjects enter where he says (Book I no. 4, Book II no. 14)", () => {
  const firstAt = (id: string, n: number) => {
    const s = study(id);
    return s.bar(s.f.later.find((e) => e.subject === n)!.at);
  };
  assert.ok(Math.abs(firstAt("wtc1.04", 2) - 35) <= 1);
  assert.equal(firstAt("wtc1.04", 3), 49);
  assert.equal(firstAt("wtc2.14", 2), 20);
  assert.equal(firstAt("wtc2.14", 3), 36);
  // A figure carried on in sequence is one statement; within a voice statements do not overlap.
  for (const id of ["wtc1.04", "wtc2.14", "wtc2.18"]) {
    const { f } = study(id);
    for (const [k, e] of f.later.entries()) for (const x of f.later.slice(0, k)) if (f.voice[x.notes[0]] === f.voice[e.notes[0]]) assert.ok(x.end <= e.at + 1e-6, id);
  }
});

test("Ledbetter: his sections where he gives them, the game's own elsewhere", () => {
  const one = study("wtc1.01");
  assert.deepEqual(one.sections.map((x) => [x.kind, one.bar(x.from)]), [["given", 1], ["given", 7], ["given", 14], ["given", 19]]);
  // Book I no. 4: his section only from b. 94; before it the game's, cut where the third subject enters.
  const four = study("wtc1.04");
  assert.ok(four.sections.some((x) => x.kind === "given" && four.bar(x.from) === 94));
  assert.ok(four.sections.some((x) => x.kind === "subject" && x.n === 3 && four.bar(x.from) === 49));
  // Contiguous, from the start to the end.
  for (const s of [one, four]) for (let k = 1; k < s.sections.length; k++) assert.equal(s.sections[k].from, s.sections[k - 1].to);
});
