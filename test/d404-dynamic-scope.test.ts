/**
 * D404 (WTC 1.96): BUSONI's dynamics scoped to the voices they govern. A scan of all 48 BUSONI readings found long
 * stretches with the voices more than 6 dB apart; each was checked against the edition: the scoping errors fixed (in
 * the data: a level printed between the staves given to one voice; in whole-reading.ts: a late level standing from
 * bar 1, a ramp that never reached the level printed for the others, a long <> left up, a one-voice hairpin made a
 * lasting level, a hairpin stacked on its own word, an entry's dim. that never brought the voice back), Busoni's
 * intent kept. And the player's line's safety net (lineDynAt).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { readingsOf, type Reading, type WholeReading } from "../src/touch/readings.ts";
import { buildWhole, LEVEL_DB, LINE_GAP_BARS, LINE_GAP_DB, OPENING_BARS, wholePlan, type WholePlan } from "../src/touch/whole-reading.ts";

const IDS = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const of = (id: string): { f: TouchFugue; r: Reading; p: WholePlan } => {
  const f = fugueById(id)!;
  const r = readingsOf(id).find((x) => x.whole)!;
  return { f, r, p: wholePlan(f, r)! };
};
const at = (f: TouchFugue, bar: number) => (bar - 1) * f.barTicks + 1;

/** The scan of D404's brief: every voice at each bar's start, the longest run of bars with the voices > 6 dB apart. */
function longestSpread(f: TouchFugue, p: WholePlan): { bars: number; from: number } {
  let run = 0;
  let worst = { bars: 0, from: 0 };
  for (let bar = 1; (bar - 1) * f.barTicks < f.length; bar++) {
    const vals = f.voices.map((_, v) => p.dynAt(v, at(f, bar)));
    if (Math.max(...vals) - Math.min(...vals) > 6) {
      run++;
      if (run > worst.bars) worst = { bars: run, from: bar - run + 1 };
    } else run = 0;
  }
  return worst;
}

/** Busoni's intent, checked against the edition (D404): the long imbalances that stay. */
const INTENDED: Record<string, string> = {
  wtc1f08: "b. 8: the upper voices p over the bass's entry mf dolce (printed for each)",
  wtc1f13: "b. 28: the alto's entry mf over the others' p (printed so), to the f of b. 34",
  wtc2f15: "b. 15–45: terraced entries, soprano p, alto mp, bass mf, to the general p of b. 46",
};

test("D404: the scan over all 48 BUSONI readings finds no long imbalance but Busoni's own", () => {
  const found: string[] = [];
  for (const id of IDS) {
    const { f, p } = of(id);
    const w = longestSpread(f, p);
    if (w.bars >= 6) found.push(id);
    if (INTENDED[id]) assert.ok(w.bars < 25, `${id}: the intended imbalance stays bounded (${w.bars} bars)`);
  }
  assert.deepEqual(found.sort(), Object.keys(INTENDED).sort(), "only the intended cases");
});

test("D404: the cases fixed: each voice takes the level printed for its system", () => {
  // I/3: the alto takes mezza voce (b. 7) and the p of b. 14 (it had stayed at its entry mf to b. 30).
  let { f, p } = of("wtc1f03");
  assert.equal(p.dynAt(1, at(f, 8)), LEVEL_DB["mezza voce"]);
  assert.equal(p.dynAt(1, at(f, 16)), LEVEL_DB.p);
  // I/4: the cresc. word and its hairpin are one ramp (+7 dB had stacked over più f).
  ({ f, p } = of("wtc1f04"));
  assert.ok(p.dynAt(1, at(f, 99)) <= LEVEL_DB["più f"] + 3 + 1e-9);
  // I/9: the episode's p (b. 13) and the p of b. 23 govern all three voices.
  ({ f, p } = of("wtc1f09"));
  for (const v of [0, 1, 2]) assert.ok(p.dynAt(v, at(f, 13) + f.barTicks / 2) <= LEVEL_DB.p + 3.5, `I/9 b. 13 voice ${v}`);
  for (const v of [0, 1, 2]) assert.equal(p.dynAt(v, at(f, 24)), LEVEL_DB.p, `I/9 b. 24 voice ${v}`);
  // I/12: the tenor dolce (b. 47); the poco a poco cresc. reaches the bass's f in every voice (b. 53).
  ({ f, p } = of("wtc1f12"));
  assert.equal(p.dynAt(2, at(f, 48)), LEVEL_DB.dolce);
  for (const v of [0, 1, 2, 3]) assert.equal(p.dynAt(v, at(f, 54)), LEVEL_DB.f, `I/12 b. 54 voice ${v}`);
  // I/14: the bass entry p quasi misterioso (it had inherited the tenor's mf of b. 1 to b. 27).
  ({ f, p } = of("wtc1f14"));
  assert.equal(p.dynAt(3, at(f, 10)), LEVEL_DB.p);
  // II/6: the bass's dim. after its entry brings it to the others' p.
  ({ f, p } = of("wtc2f06"));
  assert.equal(p.dynAt(2, at(f, 9)), LEVEL_DB.p);
  // II/11: forte dolce (b. 61, between the staves) for the bass entering under it.
  ({ f, p } = of("wtc2f11"));
  assert.equal(p.dynAt(2, at(f, 70)), LEVEL_DB["forte dolce"]);
  // II/12: the cresc. of b. 70 lands every voice on the f of b. 72.
  ({ f, p } = of("wtc2f12"));
  for (const v of [0, 1, 2]) assert.equal(p.dynAt(v, at(f, 74)), LEVEL_DB.f, `II/12 b. 74 voice ${v}`);
  // II/13: the bass dolce (b. 32); the alto's f (b. 52) ends with its dim. (b. 56).
  ({ f, p } = of("wtc2f13"));
  assert.equal(p.dynAt(2, at(f, 40)), LEVEL_DB.dolce);
  assert.equal(p.dynAt(1, at(f, 60)), LEVEL_DB.dolce);
  // II/14: the soprano's one-voice hairpins are its shaping: back at non forte after them.
  ({ f, p } = of("wtc2f14"));
  for (const bar of [40, 50, 60, 66]) assert.equal(p.dynAt(0, at(f, bar)), LEVEL_DB["non forte"], `II/14 b. ${bar}`);
  // II/24: no level before b. 50 (mf, not the p of b. 50), the mf of b. 55 for the whole system.
  ({ f, p } = of("wtc2f24"));
  assert.ok(OPENING_BARS * f.barTicks < 50 * f.barTicks);
  for (const v of [0, 1, 2]) assert.equal(p.dynAt(v, at(f, 10)), LEVEL_DB.mf, `II/24 b. 10 voice ${v}`);
  for (const v of [0, 1, 2]) assert.equal(p.dynAt(v, at(f, 60)), LEVEL_DB.mf, `II/24 b. 60 voice ${v}`);
});

/** The printed level in force (as whole-reading.ts levelAt: the last level printed for the voice, else the opening one). */
function printedAt(W: WholeReading, f: TouchFugue, v: number, t: number): number {
  const lv = W.dyn.filter((d) => LEVEL_DB[d.mark.trim()] !== undefined).sort((a, b) => a.on - b.on);
  const first = lv.length && lv[0].on < OPENING_BARS * f.barTicks ? LEVEL_DB[lv[0].mark.trim()] : 0;
  const l = lv.filter((d) => d.voices.includes(v) && d.on <= t).pop();
  return l ? LEVEL_DB[l.mark.trim()] : first;
}
const sounds = (f: TouchFugue, u: number, t: number) => f.voices[u].some((n) => n[0] <= t && n[0] + n[1] > t);

/** The longest run (ticks) where voice v's line sits more than LINE_GAP_DB (+ slack) under the loudest sounding voice, not asked. */
function longestLineGap(f: TouchFugue, W: WholeReading, p: WholePlan, v: number): number {
  let run = 0;
  let worst = 0;
  for (let t = 1; t < f.length; t += f.tpq) {
    if (!sounds(f, v, t)) continue;
    const others = f.voices.map((_, u) => u).filter((u) => u !== v && sounds(f, u, t));
    if (!others.length) continue;
    const gap = Math.max(...others.map((u) => p.dynAt(u, t))) - p.lineDynAt(v, t);
    const asked = printedAt(W, f, v, t) <= LEVEL_DB.p && others.some((u) => printedAt(W, f, u, t) >= LEVEL_DB.f);
    if (gap <= LINE_GAP_DB + 0.01 || asked) run = 0;
    else worst = Math.max(worst, (run += f.tpq));
  }
  return worst;
}

test("D404: the safety net: no player's voice of the 48 sits > 6 dB under the loudest for more than 4 bars unless asked", () => {
  for (const id of IDS) {
    const { f, r, p } = of(id);
    for (let v = 0; v < f.voices.length; v++) {
      const g = longestLineGap(f, r.whole!, p, v);
      assert.ok(g <= LINE_GAP_BARS * f.barTicks, `${id} voice ${v}: ${(g / f.barTicks).toFixed(1)} bars too far under`);
      // The net only lifts: never under the band's level.
      for (let t = 1; t < f.length; t += f.barTicks) assert.ok(p.lineDynAt(v, t) >= p.dynAt(v, t) - 1e-9);
    }
  }
});

test("D404: the safety net lifts a voice left p under an mf, not a printed p under a printed f", () => {
  const f = fugueById("wtc1f02")!;
  const base = readingsOf("wtc1f02").find((x) => x.whole)!.whole!;
  const make = (loud: string): WholeReading => ({ ...base, dyn: [{ on: 0, voices: [0], mark: "p" }, { on: 0, voices: [1, 2], mark: loud }], hairpins: [], text: [] });
  // The soprano p under the alto's and the bass's mf (6.5 dB, not asked) is lifted after four bars.
  const lifted = buildWhole(f, make("mf"));
  const t = (bar: number) => (bar - 1) * f.barTicks + f.tpq + 1;
  const plain = buildWhole(f, make("ff"));
  assert.equal(lifted.dynAt(0, t(12)), LEVEL_DB.p, "the band keeps the printed p");
  const both = Array.from({ length: 16 }, (_, i) => i + 1).filter((b) => sounds(f, 0, t(b)) && sounds(f, 1, t(b)));
  assert.ok(both.length >= 6);
  const late = both.filter((b) => b >= both[0] + LINE_GAP_BARS);
  assert.ok(late.length > 0);
  for (const b of late) assert.ok(lifted.lineDynAt(0, t(b)) > LEVEL_DB.p, `lifted at bar ${b}`);
  // With the gap 6.5 dB (p under mf) the line is brought to 6 dB under.
  assert.ok(Math.abs(lifted.lineDynAt(0, t(late[late.length - 1])) - (LEVEL_DB.mf - LINE_GAP_DB)) < 1e-6);
  // p printed against ff: the reading asks it; nothing lifted.
  for (const b of both) assert.equal(plain.lineDynAt(0, t(b)), LEVEL_DB.p, `asked at bar ${b}`);
});
