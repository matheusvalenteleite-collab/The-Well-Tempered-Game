/**
 * D880: the Book I preludes measured for the main game (docs/audits/PRELUDES-PLAN.md): each hand as written, its outer
 * line (one note at a time), and both hands as one line; notes a second at the D861 tempo and in the busiest 4 s, the
 * share of repeated pitches, of leaps (over a major third), of bars repeating the bar before and of bars made of their
 * first half twice. `fugues` prints the same over the 166 WTC fugue voices, the yardstick.
 *   node tools/wtc/prelude-measure.ts [fugues | <id regex, e.g. "wtc1p(1[3-9]|2[0-4])">]
 */
import { readFileSync } from "node:fs";
import { parsePitch } from "../../src/music/pitch.ts";

const R = new URL("../../", import.meta.url).pathname;
const P = JSON.parse(readFileSync(R + "data/wtc/preludes.json", "utf8"));
const F = JSON.parse(readFileSync(R + "data/wtc/fugues.json", "utf8"));
const T = JSON.parse(readFileSync(R + "data/tempi/preludes.json", "utf8"));
const TF = JSON.parse(readFileSync(R + "data/tempi/tempi.json", "utf8"));
type N = [number, number, number]; // on, dur, midi
const TPQ = 1920;
const midi = (p: string | number) => (typeof p === "number" ? p : parsePitch(p).midi);
/** One note at a time: at each onset the top (or bottom) note. */
const line = (ns: N[], top: boolean): N[] => {
  const by = new Map<number, N>();
  for (const n of ns) { const o = by.get(n[0]); if (!o || (top ? n[2] > o[2] : n[2] < o[2])) by.set(n[0], n); }
  return [...by.values()].sort((a, b) => a[0] - b[0]);
};
function stats(ns: N[], bpm: number, barT: number) {
  const s = (t: number) => (t / TPQ) * (60 / bpm);
  const ons = ns.map((n) => s(n[0]));
  const span = Math.max(s(ns.at(-1)![0] + ns.at(-1)![1]) - ons[0], 1);
  let busy = 0;
  for (let i = 0, j = 0; i < ons.length; i++) { while (ons[j] < ons[i] - 4) j++; busy = Math.max(busy, (i - j + 1) / 4); }
  const iv = ns.slice(1).map((n, i) => n[2] - ns[i][2]);
  const rep = iv.filter((d) => d === 0).length / Math.max(iv.length, 1);
  const leap = iv.filter((d) => Math.abs(d) > 4).length / Math.max(iv.length, 1);
  // bar figure repeated: the bar's interval pattern (and rhythm) equal to the bar before's, transposition allowed
  const bars = new Map<number, N[]>();
  for (const n of ns) { const b = Math.floor(n[0] / barT); (bars.get(b) ?? bars.set(b, []).get(b)!).push(n); }
  const key = (b: N[]) => b.map((n, i) => (i ? n[2] - b[i - 1][2] : 0) + "@" + ((n[0] % barT) / 60 | 0) + ":" + n[1]).join(",");
  // half-bar figure: does the bar consist of its first half repeated?
  let same = 0, half = 0, nb = 0;
  let prev = "";
  for (const [b, x] of [...bars].sort((a, c) => a[0] - c[0])) {
    nb++;
    const k = key(x); if (k === prev) same++; prev = k;
    const h = x.filter((n) => n[0] % barT < barT / 2), h2 = x.filter((n) => n[0] % barT >= barT / 2);
    if (h.length > 2 && h.length === h2.length && h.every((n, i) => n[2] === h2[i][2] && n[1] === h2[i][1])) half++;
  }
  const durs = new Set(ns.map((n) => n[1])).size;
  return { n: ns.length, nps: +(ns.length / span).toFixed(2), busy: +busy.toFixed(2), rep: Math.round(rep * 100), leap: Math.round(leap * 100), barRep: Math.round((same / nb) * 100), halfRep: Math.round((half / nb) * 100), durs, lo: Math.min(...ns.map((n) => n[2])), hi: Math.max(...ns.map((n) => n[2])) };
}
const barTicks = (meter: string) => { const [a, b] = meter.split("/").map(Number); return (a * 4 * TPQ) / b; };
const out: Record<string, unknown> = {};
const only = process.argv[2] === "fugues";
if (only) {
  // the WTC fugue voices' range, the yardstick
  const rows = [];
  for (const f of F) { const bpm = TF[f.id]?.normal ?? 72; for (const v of f.voices) rows.push(stats(line(v.map((n: any) => [n[0], n[1], midi(n[2])]), true), bpm, barTicks(f.meter))); }
  for (const k of ["nps", "busy", "rep", "leap", "barRep", "halfRep"] as const) { const xs = rows.map((r: any) => r[k]).sort((a: number, b: number) => a - b); console.log(k, "min", xs[0], "p10", xs[Math.floor(xs.length * 0.1)], "median", xs[xs.length >> 1], "p90", xs[Math.floor(xs.length * 0.9)], "max", xs.at(-1)); }
  process.exit(0);
}
// D887: the preludes chosen by a pattern (Book I 1-12 by default).
const pick = new RegExp(`^(?:${process.argv[2] ?? "wtc1p(0[1-9]|1[0-2])"})$`);
for (const p of P.filter((x: any) => pick.test(x.id))) {
  const bpm = T[p.id].normal, bt = barTicks(p.meter);
  const hands = p.voices.map((v: any[]) => v.map((n) => [n[0], n[1], midi(n[2])] as N));
  const rows: Record<string, unknown> = {};
  if (hands.length === 2) {
    rows["RH all"] = stats(hands[0], bpm, bt);
    rows["RH top"] = stats(line(hands[0], true), bpm, bt);
    rows["LH all"] = stats(hands[1], bpm, bt);
    rows["LH bottom"] = stats(line(hands[1], false), bpm, bt);
    rows["both, one line"] = stats(line([...hands[0], ...hands[1]], true).length ? [...hands[0], ...hands[1]].sort((a, b) => a[0] - b[0] || b[2] - a[2]).filter((n, i, a) => !i || n[0] !== a[i - 1][0]) : [], bpm, bt);
  } else hands.forEach((h: N[], i: number) => (rows[`voice ${i}`] = stats(line(h, true), bpm, bt)));
  out[p.id] = { meter: p.meter, bpm, bars: p.bars.length, sec: Math.round((p.length / TPQ) * (60 / bpm)), rows };
}
console.log(JSON.stringify(out, null, 1));
