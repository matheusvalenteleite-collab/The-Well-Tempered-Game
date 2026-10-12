// P29: a four-voice first-species counterpoint on an original cantus (the owner's test page): the
// three parts searched by the strict rules below, every candidate then judged by the game's own
// four-voice evaluator (src/counterpoint/four-voice.ts, Fux's Lectio I); the first that passes with
// no error and the fewest warnings, at the smoothest motion, is kept. Usage: node tools/playback/compose/fux-quartet.ts
import { evaluateQuartet } from "../../../src/counterpoint/four-voice.ts";
import { parsePitch } from "../../../src/music/pitch.ts";

/** The cantus (original; D Dorian, in the alto as in Fux's first four-voice examples). */
export const CANTUS = ["D4", "F4", "E4", "G4", "A4", "F4", "G4", "E4", "F4", "E4", "D4"];
const NAMES = ["C", "D", "E", "F", "G", "A", "B"];
const diatonic = (lo: string, hi: string, extra: string[] = []) => {
  const out: string[] = [];
  for (let o = 1; o <= 6; o++) for (const n of NAMES) out.push(`${n}${o}`);
  const l = parsePitch(lo).midi;
  const h = parsePitch(hi).midi;
  return [...out, ...extra].filter((p) => parsePitch(p).midi >= l && parsePitch(p).midi <= h);
};
const m = (p: string) => parsePitch(p).midi;
const RANGE = { S: diatonic("D4", "G5"), T: diatonic("C3", "F4"), B: diatonic("D2", "D4") };
const CONS = new Set([0, 3, 4, 7, 8, 9]);
const perfect = (a: number, b: number) => [0, 7].includes(Math.abs(a - b) % 12);
const n = CANTUS.length;

function ok(prev: number[] | null, cur: number[], k: number): boolean {
  const [s, a, t, b] = cur;
  if (!(s >= a && a >= t && t > b)) return false;
  if (s - a > 12 || a - t > 12) return false;
  for (const x of [s, a, t]) if (!CONS.has((x - b) % 12)) return false;
  if (k === 0 || k === n - 1) if (![0, 7].includes((s - b) % 12) || (b % 12) !== 2) return false;
  if (!prev) return true;
  for (let i = 0; i < 4; i++) {
    const leap = Math.abs(cur[i] - prev[i]);
    if (leap > 9 && leap !== 12) return false;
    if (leap === 6 || leap === 10 || leap === 11) return false;
  }
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
      const moved = cur[i] !== prev[i] && cur[j] !== prev[j];
      if (moved && perfect(cur[i], cur[j]) && perfect(prev[i], prev[j]) && (Math.abs(cur[i] - cur[j]) % 12) === (Math.abs(prev[i] - prev[j]) % 12)) return false;
    }
  // Outer voices: no hidden fifth or octave by similar motion.
  const ds = Math.sign(s - prev[0]);
  const db = Math.sign(b - prev[3]);
  if (ds !== 0 && ds === db && perfect(s, b)) return false;
  return true;
}

const pen = n - 2;
const cand = (k: number) => {
  const sharp = (xs: string[]) => (k === pen ? xs.map((p) => (p.startsWith("C") ? p.replace("C", "C#") : p)) : xs);
  const S = sharp(RANGE.S);
  const T = sharp(RANGE.T);
  const B = k === pen ? RANGE.B.filter((p) => p.startsWith("A")) : RANGE.B;
  const out: number[][] = [];
  for (const s of S) for (const t of T) for (const b of B) out.push([m(s), m(CANTUS[k]), m(t), m(b)]);
  return out;
};
const toName = (x: number) => ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"][x % 12] + (Math.floor(x / 12) - 1);

const found: { lines: string[][]; cost: number; warnings: number }[] = [];
const C = Array.from({ length: n }, (_, k) => cand(k));
function dfs(k: number, path: number[][], cost: number) {
  if (found.length >= 500) return;
  if (k === n) {
    const lines = [0, 1, 2, 3].map((v) => path.map((c) => toName(c[v])));
    const e = evaluateQuartet({ modalFinal: "D", cantusIndex: 1, kinds: ["whole", "cantus", "whole", "whole"], voices: lines });
    if (e.passed) found.push({ lines, cost, warnings: e.warnings.length });
    return;
  }
  const prev = path[k - 1] ?? null;
  const opts = C[k]
    .filter((c) => ok(prev, c, k))
    .map((c) => {
      // Smooth lines, contrary motion against the bass, full triads (third and fifth present).
      // A repeated note stalls the line (Fux avoids it); a step is best, a small leap allowed.
      const motion = prev ? c.reduce((a, x, i) => (i === 1 ? a : a + (x === prev[i] ? 5 : Math.abs(x - prev[i]) <= 2 ? 0 : Math.abs(x - prev[i]) <= 4 ? 1.5 : 3)), 0) : 0;
      const low = c[3] < 43 ? 2 : 0;
      const pcs = new Set(c.map((x) => (x - c[3] + 120) % 12));
      const full = (pcs.has(3) || pcs.has(4)) && pcs.has(7) ? 0 : 3;
      return { c, w: motion + full + low + Math.random() * 2 };
    })
    .sort((x, y) => x.w - y.w)
    .slice(0, 4);
  for (const o of opts) dfs(k + 1, [...path, o.c], cost + o.w);
}
dfs(0, [], 0);
// Each line judged as a melody: repeats and a soprano without a single highest note cost more.
const quality = (f: { lines: string[][] }) => {
  let q = 0;
  f.lines.forEach((l, v) => {
    if (v === 1) return;
    for (let i = 1; i < l.length; i++) if (l[i] === l[i - 1]) q += 3;
  });
  const s = f.lines[0].map(m);
  const top = Math.max(...s);
  if (s.filter((x) => x === top).length > 1) q += 4;
  return q;
};
found.sort((a, b) => a.warnings - b.warnings || quality(a) - quality(b) || a.cost - b.cost);
if (found[0]) console.log("quality", quality(found[0]));
console.log(found.length, "passing");
if (found[0]) console.log(JSON.stringify(found[0]));
