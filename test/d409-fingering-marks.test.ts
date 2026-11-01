/**
 * D409 (the owner's critique of the fingering suggestions): alternation the natural default, across leaps
 * too (I/1's E–A–D); a plan and its mirror one suggestion, the others kept only where their same-thumb
 * repeats fall differently; marks sparse, as an editor prints fingerings; ● and ○ for one thumb and the
 * other, never L and R; the button FINGERING SUGGESTION n OF m, nothing more.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { performSubject, playReading, readingsOf, type Reading } from "../src/touch/readings.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { characterOf } from "../src/touch/character.ts";
import { firstEntry, subjectFingerings, subjectPlanNotes } from "../src/bench/hear-sound.ts";
import { pattern, planFingerings, REMIND_EVERY, suggestionMarks, THUMB_GLYPH, THUMB_LEGEND, type Fingering, type PlanNote } from "../src/bench/fingering.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

await loadExtras();

const KINDS = ["piano", "harpsichord", "organ"] as const;
const ALL = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, k) => `wtc${b}f${String(k + 1).padStart(2, "0")}`));
const sideStr = (f: Fingering) => f.touches.map((t) => t.side[0]).join("");

function suggestions(id: string, reading: Reading | null, kind: (typeof KINDS)[number]) {
  const f = fugueById(id);
  const e = firstEntry(id);
  const perf = performSubject(reading, e.notes, f.tpq, tempoOf(id), { kind, character: characterOf(id) });
  return { e, notes: subjectPlanNotes(f, e, perf, reading), fs: subjectFingerings(f, e, perf, reading) };
}

test("D409: I/1's subject: the best suggestion alternates over the leaps E–A–D (and on to G), on every sound and reading", () => {
  const id = "wtc1f01";
  const midis = firstEntry(id).notes.map((n) => n[2]);
  // C D E F G F E A D G A G F E: the leapy part E A D G at 6..9.
  assert.deepEqual(midis.slice(6, 10), [64, 69, 62, 67]);
  for (const r of [playReading(id), null, ...readingsOf(id)])
    for (const kind of KINDS) {
      const { fs } = suggestions(id, r, kind);
      const s = sideStr(fs[0]);
      for (let k = 6; k < 9; k++) assert.notEqual(s[k], s[k + 1], `${r?.id ?? "none"} ${kind}: ${s} repeats a thumb at ${k + 1}`);
    }
  // Busoni's (the default): the whole subject alternates; the detached E A D by one thumb another suggestion.
  for (const kind of KINDS) {
    const { fs } = suggestions(id, playReading(id), kind);
    assert.equal(sideStr(fs[0]), "lr".repeat(7), kind);
    assert.ok(fs.length >= 2 && fs.length <= 3, fs.map(sideStr).join(" "));
    assert.ok(fs.slice(1).some((f) => /^(l{3,4}|r{3,4})/.test(sideStr(f).slice(6, 10))), fs.map(sideStr).join(" "));
  }
});

test("D409: a plan and its mirror are one suggestion: no two suggestions share their pattern of repeats, on all 48 subjects", () => {
  for (const id of ALL)
    for (const kind of KINDS) {
      const { notes, fs } = suggestions(id, playReading(id), kind);
      assert.equal(new Set(fs.map((f) => pattern(f.touches))).size, fs.length, `${id} ${kind}`);
      // The planner started on the other thumb gives the mirror: the same pattern, the same marks (A and B by the first mark).
      const right = planFingerings(notes, { overlap: 0.04, first: "right" });
      const left = planFingerings(notes, { overlap: 0.04, first: "left" });
      assert.equal(pattern(right[0].touches), pattern(left[0].touches), `${id} ${kind}: mirrors`);
      assert.deepEqual(right[0].marks, left[0].marks, `${id} ${kind}: the marks don't say which thumb`);
    }
  // The owner's case: I/1 offered three, two of them mirrors (one starting each thumb); now none a mirror of another.
  for (const kind of KINDS) {
    const { fs } = suggestions("wtc1f01", playReading("wtc1f01"), kind);
    const mirror = (s: string) => [...s].map((c) => (c === "l" ? "r" : "l")).join("");
    for (const a of fs) for (const b of fs) assert.notEqual(sideStr(a), mirror(sideStr(b)), kind);
  }
});

test("D409: marks are sparse: the start, every same-thumb repeat, a rest, a slide, the first leap let go, a reminder; A the first mark's thumb", () => {
  let marks = 0;
  let touches = 0;
  for (const id of ALL)
    for (const kind of KINDS) {
      const { fs } = suggestions(id, playReading(id), kind);
      for (const f of fs) {
        const t = f.touches;
        assert.equal(f.marks[0]?.k, t.findIndex((x) => !x.slid), `${id}: the start marked`);
        assert.equal(f.marks[0].thumb, "A");
        const at = new Map(f.marks.map((m) => [m.k, m]));
        t.forEach((x, k) => {
          if (x.slid) return assert.ok(!at.has(k), `${id}: no mark on a slide`);
          const m = at.get(k);
          if (m) assert.equal(m.thumb, x.side === t[f.marks[0].k].side ? "A" : "B", `${id}: A one thumb, B the other`);
          let prev = k - 1;
          while (prev >= 0 && t[prev].slid) prev--;
          if (prev >= 0 && t[prev].side === x.side) assert.equal(m?.why, "repeat", `${id} ${kind} ${sideStr(f)}: a repeat at ${k} unmarked`);
        });
        // Never more than REMIND_EVERY unmarked touches in a row.
        let quiet = 0;
        t.forEach((x, k) => (x.slid ? 0 : at.has(k) ? (quiet = 0) : quiet++) && assert.ok(quiet <= REMIND_EVERY, `${id}: a reminder due at ${k}`));
      }
      marks += fs[0].marks.length;
      touches += fs[0].touches.length;
    }
  // The best suggestions across the 48 mark about a quarter of the notes (an editor's share), not every one.
  assert.ok(marks / touches < 0.35, `${marks} of ${touches}`);
  // A plain run, every note joined: the start and a reminder every REMIND_EVERY + 1 notes, nothing else.
  const run: PlanNote[] = Array.from({ length: 20 }, (_, k) => ({ at: k * 0.25, dur: 0.25, step: 10 + (k % 5) }));
  const [f] = planFingerings(run, { overlap: 0.02 });
  assert.equal(pattern(f.touches), "/".repeat(19));
  assert.deepEqual(f.marks.map((m) => [m.k, m.why]), [[0, "start"], [REMIND_EVERY + 1, "reminder"], [2 * REMIND_EVERY + 2, "reminder"]]);
  // A rest and a repeat each marked; the leap after a detached note marked once, the next leaps implied.
  const ns: PlanNote[] = [
    { at: 0, dur: 0.25, step: 10 },
    { at: 0.25, dur: 0.25, step: 11 },
    { at: 1, dur: 0.25, step: 12, rest: true },
    { at: 1.25, dur: 0.5, step: 12, join: false },
    { at: 1.75, dur: 0.5, step: 16, join: false },
    { at: 2.25, dur: 0.5, step: 11, join: false },
    { at: 2.75, dur: 0.5, step: 15 },
  ];
  const tc = ns.map((n, i) => ({ i, side: (["left", "right", "left", "left", "right", "left", "right"] as const)[i], on: n.at, off: n.at + n.dur * 0.6, step: n.step, d: 0.5, shake: null, slid: false }));
  assert.deepEqual(suggestionMarks(ns, tc).map((m) => `${m.k}${m.thumb}${m.why}`), ["0Astart", "2Arest", "3Arepeat", "4Bleap"]);
});

test("D409: no L or R in the suggestion marks: ● and ○ with their legend; the button FINGERING SUGGESTION n OF m, nothing more", () => {
  assert.deepEqual(THUMB_GLYPH, { A: "●", B: "○" });
  assert.equal(THUMB_LEGEND, "● ○ = your two thumbs, either way round");
  const hear = readFileSync(new URL("../src/bench/HearSubject.tsx", import.meta.url), "utf8");
  const aids = readFileSync(new URL("../src/bench/manual/aids.ts", import.meta.url), "utf8");
  for (const [name, src] of [["HearSubject", hear], ["aids", aids]] as const) assert.doesNotMatch(src, /tr\("[LR]"\)|"[LR]"\s*:\s*tr|\? "L" : "R"|\? tr\("L"\)/, `${name}: an L or R letter drawn`);
  // D482 (the owner: "eliminate the bloody white and black balls … from anywhere, except the TUTORIALS"): the tutorial's aid draws them; HEAR THE SUBJECT no longer does.
  assert.match(aids, /drawThumbMark/, "aids: the neutral marks drawn");
  assert.doesNotMatch(hear, /drawThumbMark|THUMB_LEGEND|hear-thumbs-key/, "HearSubject: no ● ○ under the notes");
  assert.match(hear, /"FINGERING SUGGESTION \{n\} OF \{m\}"/);
  assert.doesNotMatch(hear, /THUMBS \{n\} OF \{m\}|tr\(fg\.name\)|ONE THUMB WHERE DETACHED/);
  assert.equal(PT["FINGERING SUGGESTION {n} OF {m}"], "SUGESTÃO DE DEDILHADO {n} DE {m}");
  assert.equal(ES["FINGERING SUGGESTION {n} OF {m}"], "SUGERENCIA DE DIGITACIÓN {n} DE {m}");
  assert.ok(PT[THUMB_LEGEND] && ES[THUMB_LEGEND]);
  assert.equal(PT["THUMBS {n} OF {m}"], undefined);
});
