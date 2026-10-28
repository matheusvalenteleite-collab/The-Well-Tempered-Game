// D366: data/local/wtc/ (not committed) in the shape tools/wtc/import_wtc.py gave it, but from the
// licence-clean corpus (data/wtc/fugues.json and preludes.json, tools/wtc/import.ts) instead of the
// Humdrum encodings, so that the Python studies (tools/wtc/fugues.py → data/wtc/fugue-analysis.json,
// harmonic_map.py → data/wtc/harmonic-maps.json, harmony.py, preludes.py) read the notes the game ships.
// Each voice a "spine", the lowest first ("1"); a note struck while the voice's line sounds (`sub` 1)
// the spine's second branch ("1.2"); rests where the line is silent; onsets and lengths in whole notes.
// Usage: node tools/wtc/local-corpus.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ, type WtcPiece } from "../../src/wtc/corpus.ts";
import { ROOT } from "./sources.ts";

const read = (f: string): WtcPiece[] => JSON.parse(readFileSync(`${ROOT}data/wtc/${f}`, "utf8"));
const W = 4 * TPQ;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const fr = (t: number) => {
  const g = gcd(Math.abs(t), W);
  return `${t / g}/${W / g}`;
};
const KEYS: Record<number, string> = { 1: "C", 2: "c", 3: "C#", 4: "c#", 5: "D", 6: "d", 7: "Eb", 8: "eb/d#", 9: "E", 10: "e", 11: "F", 12: "f", 13: "F#", 14: "f#", 15: "G", 16: "g", 17: "Ab", 18: "g#", 19: "A", 20: "a", 21: "Bb", 22: "bb", 23: "B", 24: "b" };

const out = `${ROOT}data/local/wtc`;
mkdirSync(out, { recursive: true });
const index: object[] = [];
for (const p of [...read("preludes.json"), ...read("fugues.json")]) {
  const n0 = p.voices.length;
  const measures = [...(p.bars[0].on > 0 ? [{ number: 0, onset: "0/1", style: "" }] : []), ...p.bars.map((b) => ({ number: b.n, onset: fr(b.on), style: "" }))];
  const barAt = (t: number) => [{ n: 0, on: 0 }, ...p.bars].filter((b) => b.on <= t).at(-1)!.n;
  const notes: object[] = [];
  p.voices.forEach((v, vi) => {
    const spine = String(n0 - vi);
    let lineEnd = 0;
    for (const [on, dur, pitch, sub] of [...v].sort((a, b) => a[0] - b[0] || a[3] - b[3])) {
      if (sub === 0 && on > lineEnd) notes.push({ spine, onset: fr(lineEnd), duration: fr(on - lineEnd), pitch: null, midi: null, measure: barAt(lineEnd) });
      notes.push({ spine: sub ? `${spine}.2` : spine, onset: fr(on), duration: fr(dur), pitch, midi: parsePitch(pitch).midi, measure: barAt(on) });
      if (sub === 0) lineEnd = Math.max(lineEnd, on + dur);
    }
  });
  notes.sort((a, b) => {
    const x = a as { onset: string; spine: string };
    const y = b as { onset: string; spine: string };
    const q = (s: string) => s.split("/").map(Number).reduce((u, w) => u / w);
    return q(x.onset) - q(y.onset) || x.spine.localeCompare(y.spine);
  });
  const piece = {
    id: p.id,
    book: p.book,
    kind: p.kind,
    number: p.number,
    key: KEYS[p.number],
    bwv: p.bwv,
    title: null,
    description: null,
    rights: null,
    keys: [{ onset: "0/1", key: p.mode === "minor" ? p.key.toLowerCase() : p.key }],
    meters: [p.meter],
    measures,
    length: fr(p.length),
    spines_initial: n0,
    spines: [...new Set(notes.map((n) => (n as { spine: string }).spine))].sort(),
    notes,
    problems: [],
  };
  writeFileSync(`${out}/${p.id}.json`, JSON.stringify(piece) + "\n");
  index.push({ id: p.id, book: p.book, kind: p.kind, number: p.number, key: KEYS[p.number], bwv: p.bwv, description: null, length: fr(p.length), spines_initial: n0, notes: p.voices.flat().length });
}
writeFileSync(`${out}/index.json`, JSON.stringify(index, null, 1) + "\n");
console.log(`wrote data/local/wtc: ${index.length} movements`);
