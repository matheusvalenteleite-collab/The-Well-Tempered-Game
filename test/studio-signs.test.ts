/**
 * The design studio (D419, D460): the play screen's words and signs mean one thing each (the symbol audit the
 * owner accepted), and the thumbs are ● ○ under the notes (the owner: "use only the black and white circles").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { markLegend } from "../src/touch/readings.ts";
import { cadenceName } from "../src/touch/fugue.ts";
import { LEGATO_INK } from "../src/bench/articulation.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the legend: LEGATO as the judge hears it (no gap, no overlap required), DETACHED a silence, the slur's end a silence", () => {
  const t = markLegend().map((l) => l.text);
  assert.ok(t.includes("LEGATO: NO GAP: THE NEXT THUMB LANDS AS THIS ONE LIFTS"));
  assert.ok(t.includes("DETACHED: A SMALL SILENCE BEFORE THE NEXT NOTE"));
  assert.ok(t.includes("SLUR: LEGATO UNDER IT, A SMALL SILENCE AFTER ITS LAST NOTE"));
  assert.ok(!t.some((x) => /BEFORE LIFTING|ONE GESTURE/.test(x)));
  const pt = src("src/i18n/pt.ts");
  const es = src("src/i18n/es.ts");
  for (const k of t) assert.ok(pt.includes(`"${k}"`) && es.includes(`"${k}"`), k);
});

test("SHORT means one thing: the dot done is SHORT ✓, the fault TOO SOON", () => {
  const g = src("src/bench/proto-game.ts");
  assert.ok(g.includes('"SHORT ✓"') && !g.includes('"STACCATO ✓"'));
  assert.ok(g.includes('text: "TOO SOON"') && !/text: "SHORT"/.test(g));
  for (const p of ["src/bench/manual/coach.ts", "src/bench/manual/course2.ts"]) assert.ok(!src(p).includes('word === "SHORT"'), p);
});

test("unscored signs say so; the lift tick and the caesura's // gone (the gap's stroke is the one sign for a silence)", () => {
  const w = src("src/touch/whole-marks.ts");
  assert.match(w, /TENUTO: ITS FULL VALUE \(NOT SCORED\)/);
  assert.match(w, /FERMATA: HELD LONGER \(NOT SCORED\)/);
  assert.match(w, /WEDGE: SHORT, SHARPER \(JUDGED AS SHORT\)/);
  assert.ok(!/kind: "lift"|kind: "breath"/.test(w.slice(w.indexOf("export function wholeLegend"))));
  const arcs = src("src/touch/box-whole.ts");
  const body = arcs.slice(arcs.indexOf("export function paintWholeArcs"), arcs.indexOf("\n}\n", arcs.indexOf("export function paintWholeArcs")));
  assert.ok(!/l\.breaths/.test(body) && !/bEnd\) - 1/.test(body));
});

test("colours: the reading's touch signs gold, never a voice's ink; the success words not the fourth voice's violet", () => {
  const box = src("src/touch/MusicBox.tsx");
  assert.match(box, /const DETACH_RED = "#ffd23f";/);
  assert.match(box, /const ACCENT_ORANGE = "#ffd23f";/);
  const inks = ["#5cb2ff", "#5fe08a", "#ff8c4a", "#c78bff", "#7fe3e0"];
  assert.ok(!inks.includes(LEGATO_INK.toLowerCase()));
  assert.notEqual(LEGATO_INK, "#c9a6ff");
});

test("the drawn join is the judge's; DETACHED asked only where the score has no rest; a cadence never says PERFECT", () => {
  assert.match(src("src/touch/MusicBox.tsx"), /nx\.at <= n\.up \|\| nx\.joinedIn/);
  const g = src("src/bench/proto-game.ts");
  assert.match(g, /if \(!slide\) notes\[i\]\.joinedIn = over;/);
  assert.match(g, /askJoin === false && this\.joinedAt\(i, h\.k\)\) this\.styled\(!over, at, "DETACHED ✓"\)/);
  assert.equal(cadenceName({ on: 0, bar: 1, key: "g", kind: "perfect" }), "FULL CADENCE · G MINOR");
});

test("the thumbs: ● ○ under the notes from the plan, each bar's sign; no arrows, no ghost thumb, no drawn skin thumb", () => {
  const p = src("src/bench/paint-proto.ts");
  assert.match(p, /function thumbSigns\(/);
  assert.match(p, /if \(g\.proto\.id === "ladder" && rows\) thumbSigns\(c, w, h, bw, g, t\);/);
  assert.ok(!p.includes('d === 0 ? "=" : d > 0 ? "▲" : "▼"'), "no way arrow");
  assert.ok(!p.includes("function thumbCoach") && !p.includes("#f2c9a0"), "no skin-coloured thumb");
  assert.ok(!p.includes('"LEFT THUMB" : "RIGHT THUMB"'));
  const aids = src("src/bench/manual/aids.ts");
  assert.ok(!aids.includes("function moveWord") && !aids.includes("NEXT: A BIG JUMP"));
  // Drawing only: the judge never reads the signs.
  assert.ok(!/thumbSigns|FIRST_SIDE/.test(src("src/bench/proto-game.ts")));
});
