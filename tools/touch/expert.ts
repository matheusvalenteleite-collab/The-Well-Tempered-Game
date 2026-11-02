/**
 * D493: THE EXPERT ENTRIES. The owner: "I don't want you to figure these things out by yourself. We have a
 * lot of knowledge acquired from experts. Let's simply believe that they are right." Every entry of the
 * 48 fugues' subjects is now the published analyses' (data/wtc/expert-entries.txt: Prout 1910, Iliffe 1897,
 * Busoni's edition, Ledbetter 2002, by bar and voice, with its form: answer, inverted, augmented, diminished,
 * partial, modified, which subject). This file reads that table and places each entry in the notes:
 *   1. an entry the finders already have (the library's, the hand lists', the heads', the later subjects':
 *      the `pool`) in the same voice and theme, starting in the bar the sources give (or half a bar before,
 *      an upbeat; or within a quarter of the beat given), is taken, its form set as the sources say;
 *   2. else the entry is found in the notes: each note of that voice in the bar is tried as the theme's start
 *      (and as its second note, for a changed first note), the theme laid on at its rhythm (scaled for an
 *      augmentation or diminution) and its letter steps (mirrored for an inversion), a step's difference of
 *      one counted half (a tonal answer's, a modified entry's); the best fit is the entry.
 * A partial entry lasts as long as it keeps the theme (two misses in a row end it); `n=` fixes its notes.
 * Pool entries no source names are dropped: the audit (docs/wtc/entries/EXPERT-AUDIT.md) lists them.
 * Run by tools/touch/extract.ts; `node tools/touch/expert-audit.ts` writes the audit's JSON.
 */
import type { RawEntry } from "./analysis.ts";

type Note = [number, number, number, number];

export interface ExpertEntry {
  bar: number;
  /** Quarter-notes after the barline, where the sources give the start. */
  q?: number;
  voice: number;
  answer: boolean;
  inverted: boolean;
  scale: number;
  partial: boolean;
  modified: boolean;
  theme: number;
  /** A later subject's first statement: its length in quarter-notes. */
  len?: number;
  /** The entry's length in notes. */
  n?: number;
  sources: string[];
  note?: string;
  /** The line in the table, for messages. */
  line: string;
}

export interface ExpertFugue {
  id: string;
  sources: string[];
  multi: boolean;
  entries: ExpertEntry[];
  disagreements: string[];
}

const VOICE_LETTERS: Record<number, string[]> = {
  2: ["U", "L"],
  3: ["S", "A", "B"],
  4: ["S", "A", "T", "B"],
  5: ["S1", "S2", "A", "T", "B"],
};

/** The table, by fugue id (voice letters resolved against each fugue's voice count, `voicesOf`). */
export function parseExpert(text: string, voicesOf: (id: string) => number): Map<string, ExpertFugue> {
  const out = new Map<string, ExpertFugue>();
  let cur: ExpertFugue | undefined;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("==")) {
      const [head, src = ""] = line.slice(2).split("|");
      const words = src.trim().split(/\s+/).filter(Boolean);
      cur = { id: head.trim(), sources: words.filter((w) => w !== "multi"), multi: words.includes("multi"), entries: [], disagreements: [] };
      out.set(cur.id, cur);
      continue;
    }
    if (!cur) throw new Error(`expert-entries: a line before any fugue: ${line}`);
    if (line.startsWith("%")) {
      const last = cur.disagreements.length - 1;
      // A "%" line continued on the next "%" line (no new sentence start) joins it.
      if (last >= 0 && /^%\s+[a-z(]/.test(line) && !/[.:]$/.test(cur.disagreements[last])) cur.disagreements[last] += " " + line.slice(1).trim();
      else cur.disagreements.push(line.slice(1).trim());
      continue;
    }
    const [body, note] = line.split("#").map((s) => s.trim());
    const [spec, src] = body.split(";").map((s) => s.trim());
    const words = spec.split(/\s+/);
    const m = /^(\d+)(?:\+([\d.]+))?$/.exec(words[0]);
    if (!m) throw new Error(`expert-entries ${cur.id}: bad bar in "${line}"`);
    const letters = VOICE_LETTERS[voicesOf(cur.id)];
    const voice = letters?.indexOf(words[1]) ?? -1;
    if (voice < 0) throw new Error(`expert-entries ${cur.id}: bad voice in "${line}"`);
    const flags = words.slice(2);
    const known = /^(ans|inv|aug|dim|part|mod|t2|t3|len=\d+(\.\d+)?|n=\d+)$/;
    for (const f of flags) if (!known.test(f)) throw new Error(`expert-entries ${cur.id}: bad flag "${f}" in "${line}"`);
    const num = (k: string) => {
      const f = flags.find((x) => x.startsWith(`${k}=`));
      return f ? Number(f.slice(k.length + 1)) : undefined;
    };
    cur.entries.push({
      bar: Number(m[1]),
      q: m[2] !== undefined ? Number(m[2]) : undefined,
      voice,
      answer: flags.includes("ans"),
      inverted: flags.includes("inv"),
      scale: flags.includes("aug") ? 2 : flags.includes("dim") ? 0.5 : 1,
      partial: flags.includes("part"),
      modified: flags.includes("mod"),
      theme: flags.includes("t3") ? 3 : flags.includes("t2") ? 2 : 1,
      len: num("len"),
      n: num("n"),
      // An entry with no keys of its own: the complete analyses consulted (P, I); B, L and G only where named.
      sources: src ? src.split(/\s+/).filter(Boolean) : cur.sources.filter((s) => s === "P" || s === "I"),
      note,
      line,
    });
  }
  return out;
}

interface Piece {
  tpq: number;
  barTicks: number;
  length: number;
  bars: { n: number; on: number }[];
  voices: Note[][];
}

/** One note an onset (the highest), as a melody reads. */
const lineOf = (v: Note[]) => v.filter((n, i) => !(i > 0 && v[i - 1][0] === n[0]));

interface Shape {
  /** Onset from the start, letter step from the first note, MIDI, duration. */
  notes: { rel: number; step: number; midi: number; dur: number }[];
  span: number;
}

function shapeAt(line: Note[], on: number, len: number): Shape {
  const ns = line.filter((n) => n[0] >= on && n[0] < on + len);
  return { notes: ns.map((n) => ({ rel: n[0] - on, step: n[3] - ns[0][3], midi: n[2], dur: n[1] })), span: len };
}

export interface Placed {
  raw: RawEntry;
  expert: ExpertEntry;
  /** "pool" when a finder's entry was taken, "notes" when found in the notes. */
  how: "pool" | "notes";
  /** The fit (0-1) of the theme to the notes, for the audit. */
  fit: number;
}

export interface ExpertResult {
  placed: Placed[];
  /** Pool entries no source names (dropped). */
  dropped: RawEntry[];
  /** Entries the notes could not place (kept out, reported). */
  unplaced: ExpertEntry[];
}

/**
 * Places a fugue's expert entries in its notes (see the file's comment). `pool`: the finders' entries.
 */
export function placeExpert(p: Piece, ex: ExpertFugue, pool: RawEntry[]): ExpertResult {
  const lines = p.voices.map(lineOf);
  const barOn = (n: number) => p.bars.find((b) => b.n === n)?.on ?? (n < p.bars[0].n ? p.bars[0].on - (p.bars[0].n - n) * p.barTicks : p.length);
  const taken = new Set<RawEntry>();
  const shapes = new Map<number, Shape>();
  const placed: Placed[] = [];
  const unplaced: ExpertEntry[] = [];
  /** A later subject's first statement (given by its len): its first note's onset. */
  const firstStart = new Map<ExpertEntry, number>();

  const anchorOf = (e: ExpertEntry) => barOn(e.bar) + Math.round((e.q ?? 0) * p.tpq);
  const windowOf = (e: ExpertEntry): [number, number] =>
    e.q !== undefined ? [anchorOf(e) - p.tpq, anchorOf(e) + p.tpq] : [barOn(e.bar) - p.barTicks / 2, barOn(e.bar + 1)];

  // Each theme's shape: the first subject's from the finders' first plain statement; a later one's from its
  // first statement in the table (its len), or the finders' first statement of that theme.
  const firstPool = (theme: number) =>
    pool.filter((r) => r.theme === theme && r.scale === 1 && !r.inverted).sort((a, b) => a.on - b.on)[0];
  for (const theme of [1, 2, 3]) {
    const first = ex.entries.find((e) => e.theme === theme);
    if (!first) continue;
    if (first.len) {
      const line = lines[first.voice];
      const a = anchorOf(first);
      const n = line.find((x) => x[0] >= a - p.tpq / 4);
      if (!n) throw new Error(`${ex.id}: no note for the first statement of subject ${theme} (${first.line})`);
      shapes.set(theme, shapeAt(line, n[0], Math.round(first.len * p.tpq)));
      firstStart.set(first, n[0]);
      continue;
    }
    const r = firstPool(theme);
    if (!r) throw new Error(`${ex.id}: no shape for subject ${theme} (give its first statement a len=)`);
    shapes.set(theme, shapeAt(lines[r.voice], r.on, r.len));
  }

  /** The fit of `shape` laid at onset `on`, first note's step `s0`; with the run kept from the start. */
  const fitAt = (line: Note[], shape: Shape, on: number, s0: number, sign: number, scale: number) => {
    const at = new Map(line.map((n) => [n[0], n]));
    let score = 0;
    let lastKept = -1;
    let misses = 0;
    let runOpen = true;
    shape.notes.forEach((t, k) => {
      const n = at.get(on + Math.round(t.rel * scale));
      const d = n ? Math.abs(n[3] - s0 - sign * t.step) : Infinity;
      const hit = d === 0 ? 1 : d === 1 ? 0.5 : 0;
      score += hit;
      if (runOpen) {
        if (hit > 0 || (k === 0 && n)) {
          lastKept = k;
          misses = 0;
        } else if (++misses >= 2) runOpen = false;
      }
    });
    return { score, lastKept };
  };

  /**
   * A changed rhythm's entry: the theme's intervals (letter steps) laid note after note from each note in the
   * window, the first ten of them; an interval kept 1, a step off 0.5. Kept if half the intervals fit.
   */
  const freeFit = (line: Note[], shape: Shape, sign: number, w0: number, w1: number, anchor: number) => {
    const k0 = Math.min(10, shape.notes.length);
    let best: { on: number; fit: number; kept: number; dist: number } | undefined;
    for (let i = 0; i < line.length; i++) {
      const k = Math.min(k0, line.length - i);
      if (line[i][0] < w0 || line[i][0] >= w1 || k < 4) continue;
      let score = 0;
      let kept = 1;
      let misses = 0;
      let open = true;
      for (let m = 1; m < k; m++) {
        const d = Math.abs(line[i + m][3] - line[i + m - 1][3] - sign * (shape.notes[m].step - shape.notes[m - 1].step));
        const hit = d === 0 ? 1 : d === 1 ? 0.5 : 0;
        score += hit;
        if (open) {
          if (hit > 0) (kept = m + 1), (misses = 0);
          else if (++misses >= 2) open = false;
        }
      }
      const fit = score / (k - 1);
      const dist = Math.abs(line[i][0] - anchor);
      if (fit >= 0.55 && (!best || fit > best.fit + 1e-9 || (Math.abs(fit - best.fit) < 1e-9 && dist < best.dist))) best = { on: line[i][0], fit, kept: Math.max(3, kept), dist };
    }
    return best;
  };

  const endOf = (line: Note[], shape: Shape, on: number, scale: number, e: ExpertEntry, lastKept: number) => {
    if (e.n) {
      const ns = line.filter((n) => n[0] >= on);
      return ns.length > e.n ? ns[e.n][0] : (ns.at(-1)?.[0] ?? on) + (ns.at(-1)?.[1] ?? p.tpq);
    }
    if (!e.partial) return on + Math.round(shape.span * scale);
    const k = Math.max(2, lastKept);
    const t = shape.notes[Math.min(k, shape.notes.length - 1)];
    return on + Math.round((t.rel + t.dur) * scale);
  };

  for (const e of ex.entries) {
    const shape = shapes.get(e.theme);
    if (!shape || shape.notes.length < 2) {
      unplaced.push(e);
      continue;
    }
    const line = lines[e.voice];
    const sign = e.inverted ? -1 : 1;
    const [w0, w1] = windowOf(e);
    const anchor = anchorOf(e);
    const isFirst = firstStart.has(e);
    // 1. A finder's entry.
    const cand = pool
      .filter((r) => !taken.has(r) && r.voice === e.voice && r.theme === e.theme && r.on >= w0 && r.on < w1)
      .sort((a, b) => Math.abs(a.on - anchor) - Math.abs(b.on - anchor))[0];
    let on: number;
    let s0: number;
    let how: Placed["how"];
    let fit: { score: number; lastKept: number };
    if (cand && !isFirst) {
      taken.add(cand);
      on = cand.on;
      const first = line.find((n) => n[0] >= on);
      s0 = first ? first[3] : 0;
      fit = fitAt(line, shape, on, s0, sign, e.scale);
      // A first note varied: the fit laid from the second note.
      if (shape.notes.length > 2) {
        const second = line.find((n) => n[0] >= on + Math.round(shape.notes[1].rel * e.scale) - 1);
        if (second) {
          const f2 = fitAt(line, shape, on, second[3] - sign * shape.notes[1].step, sign, e.scale);
          if (f2.score > fit.score) fit = f2;
        }
      }
      how = "pool";
    } else if (isFirst) {
      on = firstStart.get(e)!;
      s0 = line.find((n) => n[0] === on)![3];
      fit = { score: shape.notes.length, lastKept: shape.notes.length - 1 };
      how = "notes";
    } else {
      // 2. In the notes.
      let best: { on: number; s0: number; fit: { score: number; lastKept: number }; dist: number } | undefined;
      const reach = Math.round((shape.notes[Math.min(3, shape.notes.length - 1)].rel + 1) * e.scale);
      const cands = line.filter((n) => n[0] >= w0 && n[0] < w1 + reach);
      for (const c of cands) {
        for (const j of [0, 1, 2, 3]) {
          if (j >= shape.notes.length) continue;
          const t = shape.notes[j];
          const base = c[0] - Math.round(t.rel * e.scale);
          if (base < w0 || base >= w1) continue;
          const s0j = c[3] - sign * t.step;
          // The start: the note sounding at the theme's start (a changed first note), else this one.
          let start = base;
          if (j > 0) {
            const sounding = line.find((n) => n[0] <= base && n[0] + n[1] > base) ?? line.filter((n) => n[0] < c[0]).at(-1);
            if (!sounding || c[0] - sounding[0] > 2 * Math.round(t.rel * e.scale) || sounding[0] < w0 - p.tpq) continue;
            start = sounding[0];
          }
          const f = fitAt(line, shape, base, s0j, sign, e.scale);
          // A start found from the second note owes the first: a little less than the same fit from the first.
          const score = f.score - 0.25 * j;
          const dist = Math.abs(start - anchor);
          if (!best || score > best.fit.score + 1e-9 || (Math.abs(score - best.fit.score) < 1e-9 && dist < best.dist))
            best = { on: start, s0: s0j, fit: { score, lastKept: f.lastKept }, dist };
        }
      }
      const need = e.partial ? 2.5 : Math.max(2.5, (e.modified ? 0.25 : 0.4) * shape.notes.length);
      if (!best || best.fit.score < need) {
        // A modified or partial entry whose rhythm is changed: its intervals alone, note after note.
        const free = e.modified || e.partial || e.answer ? freeFit(line, shape, sign, w0, w1, anchor) : undefined;
        if (!free) {
          unplaced.push(e);
          continue;
        }
        const ns = line.filter((n) => n[0] >= free.on);
        const count = e.n ?? (e.partial ? free.kept : shape.notes.length);
        const endT = ns.length > count ? ns[count][0] : ns.at(-1)![0] + ns.at(-1)![1];
        for (const r of pool) if (!taken.has(r) && r.voice === e.voice && r.theme === e.theme && Math.abs(r.on - free.on) < p.tpq) taken.add(r);
        const firstNote = ns[0];
        placed.push({
          raw: { voice: e.voice, on: free.on, len: Math.max(1, Math.min(p.length, endT) - free.on), shift: firstNote[2] - shape.notes[0].midi, inverted: e.inverted, scale: e.scale, theme: e.theme },
          expert: e,
          how: "notes",
          fit: free.fit,
        });
        continue;
      }
      on = best.on;
      s0 = best.s0;
      fit = best.fit;
      how = "notes";
      // A finder's entry now overlapping this one in the voice (the same statement found from another note): taken.
      for (const r of pool) if (!taken.has(r) && r.voice === e.voice && r.theme === e.theme && Math.abs(r.on - on) < p.tpq) taken.add(r);
    }
    const end = Math.min(p.length, endOf(line, shape, on, e.scale, e, fit.lastKept));
    const firstNote = line.find((n) => n[0] >= on);
    const shift = firstNote ? firstNote[2] - shape.notes[0].midi : 0;
    placed.push({
      raw: { voice: e.voice, on, len: Math.max(1, end - on), shift, inverted: e.inverted, scale: e.scale, theme: e.theme },
      expert: e,
      how,
      fit: Math.max(0, Math.min(1, fit.score / shape.notes.length)),
    });
  }
  const dropped = pool.filter((r) => !taken.has(r));
  return { placed, dropped, unplaced };
}
