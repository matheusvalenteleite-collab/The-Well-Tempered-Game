/**
 * Bach's licences (D132): where, in the 48 fugues, Bach's own two-voice writing (exactly two voices
 * sounding) breaks a rule of the countersubject checker (wtc/counterpoint.ts), each upper voice judged
 * against the bass. Written to data/wtc/licences.json: for each rule and simple interval, how often,
 * in how many fugues, and up to five places. Usage:
 *   node --experimental-strip-types tools/wtc/licences.ts data/wtc/licences.json
 */
import { writeFileSync } from "node:fs";
import { LIBRARY } from "../../src/wtc/library.ts";
import { beatOf, evaluateCounterpoint } from "../../src/wtc/counterpoint.ts";
import { licenceKey } from "../../src/wtc/licences.ts";

const out: Record<string, { count: number; fugues: string[]; places: { id: string; bar: number; voice: number }[] }> = {};
for (const l of LIBRARY) {
  const f = l.fugue();
  const lineOf = (v: number) =>
    f.notes
      .map((n, i) => ({ n, i }))
      .filter(({ i }) => f.voice[i] === v)
      .sort((a, b) => a.n.at - b.n.at || b.n.midi - a.n.midi)
      .filter((x, k, xs) => k === 0 || Math.abs(x.n.at - xs[k - 1].n.at) > 1e-6)
      .map(({ n, i }) => ({ pitch: f.spelled[i], at: n.at, dur: n.dur }));
  const sounding = (t: number) => new Set(f.notes.map((n, i) => ({ n, i })).filter(({ n }) => n.at <= t + 1e-6 && t < n.at + n.dur - 1e-6).map(({ i }) => f.voice[i])).size;
  const bass = f.count - 1;
  for (let v = 0; v < bass; v++) {
    const line = lineOf(v);
    const ev = evaluateCounterpoint({ line, given: lineOf(bass), bar: f.barQuarters, beat: beatOf(f.time), phase: 0, judged: new Set(line.map((_, i) => i)) });
    for (const e of ev.errors) {
      if (sounding(e.at) !== 2) continue;
      const k = licenceKey(e.ruleId, e.detail?.interval);
      const r = (out[k] ??= { count: 0, fugues: [], places: [] });
      r.count++;
      if (!r.fugues.includes(l.id)) r.fugues.push(l.id);
      if (r.places.length < 5 && !r.places.some((p) => p.id === l.id)) r.places.push({ id: l.id, bar: Math.floor(e.at / f.barQuarters) + 1 - f.pickup, voice: v });
    }
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
console.log(Object.keys(out).length, "licences");
