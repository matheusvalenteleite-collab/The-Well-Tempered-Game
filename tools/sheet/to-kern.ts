/**
 * D366: a fugue as Humdrum **kern for the SHEET mode's engraving (engrave.ts, kern-layout.ts), written
 * from the game's own notes (data/wtc/fugues.json, from the licence-clean editions; D298 engraved the
 * Humdrum encodings themselves). One spine a voice, the bass first, each voice on the staff of a grand
 * staff its place gives (the upper half of the voices the upper staff); a voice's line as the game
 * plays it (data/touch/pieces.json) in its first layer, its divisi (D363's band-only notes) in a layer
 * of their own (invisible rests between); notes across a bar line tied; the written ornaments
 * (data/wtc/ornaments.json) as kern's signs. Grace notes are not engraved.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
type Raw = [number, number, string, number];
interface Piece {
  id: string;
  key: string;
  mode: string;
  meter: string;
  voices: Raw[][];
  bars: { n: number; on: number }[];
  length: number;
}
interface Touch {
  id: string;
  voices: [number, number, number, number][][];
  bandVoices?: { of: number; notes: [number, number, number, number][] }[];
}
let cache: { fugues: Piece[]; touch: Touch[]; orn: Record<string, [number, number, string, string][]> } | null = null;
function data() {
  cache ??= {
    fugues: JSON.parse(readFileSync(root("data/wtc/fugues.json"), "utf8")),
    touch: JSON.parse(readFileSync(root("data/touch/pieces.json"), "utf8")),
    orn: JSON.parse(readFileSync(root("data/wtc/ornaments.json"), "utf8")),
  };
  return cache;
}

const WHOLE = 7680; // ticks (1920 a crotchet)
/** Every written length (recip, dots) with its ticks, longest first: the breve to the 128th, dotted, and the triplets. */
const LENGTHS: [string, number][] = (() => {
  const out: [string, number][] = [];
  for (const r of [0, 1, 2, 4, 8, 16, 32, 64, 128])
    for (let d = 0; d <= 2; d++) {
      const base = r === 0 ? 2 * WHOLE : WHOLE / r;
      out.push([`${r}${".".repeat(d)}`, base * (2 - 1 / 2 ** d)]);
    }
  for (const r of [3, 6, 12, 24, 48, 96, 192]) out.push([`${r}`, WHOLE / r]);
  return out.filter(([, t]) => Number.isInteger(t)).sort((a, b) => b[1] - a[1]);
})();
function lengths(ticks: number, what: string): string[] {
  const out: string[] = [];
  let left = ticks;
  while (left > 0) {
    const l = LENGTHS.find(([, t]) => t <= left);
    if (!l) throw new Error(`${what}: ${ticks} ticks not writable`);
    out.push(l[0]);
    left -= l[1];
  }
  return out;
}

/** "C#5" → "cc#", "Bb3" → "B-". */
export function kernOf(name: string): string {
  const m = /^([A-G])(#*|b*)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`pitch ${name}`);
  const oct = Number(m[3]);
  const letter = oct >= 4 ? m[1].toLowerCase().repeat(oct - 3) : m[1].repeat(4 - oct);
  return letter + m[2].replace(/b/g, "-");
}
const FIFTHS: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7, "G#": 8, "D#": 9, "A#": 10 };
function keySig(key: string, mode: string): string {
  const n = (FIFTHS[key] ?? 0) - (mode === "minor" ? 3 : 0);
  if (n > 0) return "*k[" + "fcgdaeb".slice(0, n).split("").map((l) => l + "#").join("") + "]";
  return "*k[" + "beadgcf".slice(0, -n).split("").map((l) => l + "-").join("") + "]";
}

interface Ev {
  on: number;
  dur: number;
  names: string[];
  orn: string;
}
/** A layer's notes as written events: chords (struck and released together) one event; the rest pushed to the next layer. */
function layers(notes: Ev[]): Ev[][] {
  const out: Ev[][] = [];
  let left = [...notes].sort((a, b) => a.on - b.on);
  while (left.length) {
    const layer: Ev[] = [];
    const next: Ev[] = [];
    for (const e of left) {
      const last = layer.at(-1);
      if (last && last.on === e.on && last.dur === e.dur) {
        last.names.push(...e.names);
        last.orn += e.orn;
      } else if (last && e.on < last.on + last.dur) next.push(e);
      else layer.push({ ...e, names: [...e.names] });
    }
    out.push(layer);
    left = next;
    if (out.length > 6) throw new Error("too many layers");
  }
  return out;
}

/** A layer's column: time → token, rests in the gaps (invisible in a divisi layer), tied over the bar lines. */
function column(layer: Ev[], cuts: number[], length: number, hidden: boolean, what: string): Map<number, string> {
  const col = new Map<number, string>();
  const put = (on: number, dur: number, names: string[] | null, orn: string) => {
    // Split at the bar lines, then into writable lengths.
    const pieces: [number, number][] = [];
    let t = on;
    for (const c of cuts.filter((c) => c > on && c < on + dur)) (pieces.push([t, c - t]), (t = c));
    pieces.push([t, on + dur - t]);
    // An invisible rest the length of a whole bar Verovio draws as a bar's rest: in two halves.
    if (!names && hidden)
      for (let i = pieces.length - 1; i >= 0; i--) {
        const [s, d] = pieces[i];
        const whole = (s === 0 || cuts.includes(s)) && (s + d === length || cuts.includes(s + d));
        if (whole) pieces.splice(i, 1, [s, d / 2], [s + d / 2, d / 2]);
      }
    const parts: [number, string][] = [];
    for (const [s, d] of pieces) {
      let at = s;
      for (const l of lengths(d, what)) {
        parts.push([at, l]);
        at += LENGTHS.find(([r]) => r === l)![1];
      }
    }
    parts.forEach(([at, l], i) => {
      if (!names) col.set(at, `${l}r${hidden ? "yy" : ""}`);
      else {
        const tie = parts.length === 1 ? ["", ""] : i === 0 ? ["[", ""] : i === parts.length - 1 ? ["", "]"] : ["", "_"];
        col.set(at, names.map((n) => `${tie[0]}${l}${kernOf(n)}${i === 0 ? orn : ""}${tie[1]}`).join(" "));
      }
    });
  };
  let t = 0;
  for (const e of layer) {
    if (e.on > t) put(t, e.on - t, null, "");
    put(e.on, e.dur, e.names, e.orn);
    t = e.on + e.dur;
  }
  if (t < length) put(t, length - t, null, "");
  return col;
}

/** The fugue `id` as **kern for kern-layout.ts. */
export function fugueKern(id: string): string {
  const { fugues, touch, orn } = data();
  const p = fugues.find((x) => x.id === id);
  const g = touch.find((x) => x.id === id);
  if (!p || !g) throw new Error(`no fugue ${id}`);
  const n = p.voices.length;
  const signs = new Map((orn[id] ?? []).filter((r) => r[3]).map((r) => [`${r[0]}:${r[1]}`, r[3].replace(/W/g, "m")]));
  const cuts = p.bars.map((b) => b.on).filter((on) => on > 0);
  // Each voice's columns: its line, then its divisi.
  const cols: { voice: number; col: Map<number, string> }[] = [];
  for (let v = n - 1; v >= 0; v--) {
    const main = new Set(g.voices[v].map((x) => `${x[0]}:${x[1]}:${x[2]}`));
    const evs = (sub: boolean) =>
      p.voices[v]
        .filter((x) => x[1] > 0 && main.has(`${x[0]}:${x[1]}:${parsePitch(x[2]).midi}`) !== sub)
        .map((x) => ({ on: x[0], dur: x[1], names: [x[2]], orn: sub ? "" : (signs.get(`${v}:${x[0]}`) ?? "") }));
    const ls = [...layers(evs(false)), ...layers(evs(true))].filter((l) => l.length);
    ls.forEach((l, k) => cols.push({ voice: v, col: column(l, cuts, p.length, k > 0, `${id} voice ${v}`) }));
  }
  const spines = Array.from({ length: n }, (_, k) => n - 1 - k); // voices, bass first
  const upper = Math.ceil(n / 2);
  const staff = (v: number) => (v < upper ? 1 : 2);
  const lines: string[] = [];
  const row = (f: (v: number) => string) => lines.push(spines.map(f).join("\t"));
  row(() => "**kern");
  row((v) => `*staff${staff(v)}`);
  row((v) => (staff(v) === 1 ? "*clefG2" : "*clefF4"));
  row(() => keySig(p.key, p.mode));
  row(() => `*M${p.meter}`);
  // The divisi layers: each voice split as often as it has more layers.
  const extra = spines.map((v) => cols.filter((c) => c.voice === v).length - 1);
  const have = spines.map(() => 1);
  while (have.some((h, k) => h <= extra[k])) {
    const toks: string[] = [];
    have.forEach((h, k) => {
      for (let j = 0; j < h; j++) toks.push(j === h - 1 && h <= extra[k] ? "*^" : "*");
    });
    have.forEach((h, k) => h <= extra[k] && (have[k] = h + 1));
    lines.push(toks.join("\t"));
  }
  const barAt = new Map(p.bars.map((b) => [b.on, b.n]));
  const times = [...new Set(cols.flatMap((c) => [...c.col.keys()]))].sort((a, b) => a - b);
  for (const t of times) {
    const bar = barAt.get(t);
    if (bar !== undefined) lines.push(cols.map(() => `=${bar}`).join("\t"));
    lines.push(cols.map((c) => c.col.get(t) ?? ".").join("\t"));
  }
  lines.push(cols.map(() => "==").join("\t"));
  // Merge the layers back, a voice at a time.
  let width = cols.map((c) => c.voice);
  for (const v of spines) {
    while (width.filter((x) => x === v).length > 1) {
      const first = width.indexOf(v);
      lines.push(width.map((x, i) => (i === first || i === first + 1 ? "*v" : "*")).join("\t"));
      width = width.filter((_, i) => i !== first + 1);
    }
  }
  lines.push(width.map(() => "*-").join("\t"));
  return lines.join("\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.stdout.write(fugueKern(process.argv[2] ?? "wtc1f01"));
