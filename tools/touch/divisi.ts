/**
 * D363: a voice made one line. Where an edition writes two notes at once in one voice (the kern
 * encodings' split spines in the 48, folded back into the voice by src/wtc/kern.ts; Mutopia's extra
 * voices on a staff in the Art of Fugue), the voice keeps one line and the rest becomes a band-only
 * voice (TouchFugue.bandVoices), sounding as its parent.
 *
 *   - A passage to split (a "region"): the notes of a voice linked by sounding together, where they are
 *     not all one chord (struck together and released together), with the music joined to it without
 *     a rest before and after (each note beginning as the one before ends), so that a divisi and the
 *     parallel thirds or the final chord around it are made one line too. A chord elsewhere (struck and
 *     released whole) is left as the game has always played it, with one touch (lanes.ts chordOf).
 *   - The line through a region: notes one after another, never two at once, chosen first to keep the
 *     subject where an entry of it runs through the passage (I/20's soprano in bars 80 and 85, II/3's
 *     bass in bar 31, II/17's tenor in bar 48: the entries' notes, `subject`, as "onset:MIDI"), then
 *     to fill the most time; then, where two lines fill it alike, the one that continues the voice (the encoding's
 *     sub-line, or Mutopia's staff voice, of the note before the passage, or after it where there is
 *     none before), then the higher (an upper voice) or the lower (the bass). In the passage that ends
 *     the voice (a final chord whose notes end apart, a final divisi), the higher or lower before the
 *     sub-line, and its last notes by pitch alone: the top note of an upper voice, the bottom of the
 *     bass (Contrapunctus 5's D3 under the subject's last A3).
 *   - A note left out that doubles a note of the line exactly (the same pitch, onset and length: a
 *     unison of two sub-lines) is one key: dropped, not given to the band.
 */
import type { Note } from "./analysis.ts";

/** A note with its sub-line: 0 the voice's own (a kern spine's main line, a Mutopia staff's voice), else an extra one. */
export interface SubNote {
  n: Note;
  sub: number;
}

export interface Split {
  main: Note[];
  band: Note[];
  /** The notes dropped as exact unisons of the line. */
  unisons: number;
}

const end = (n: Note) => n[0] + n[1];

/** A voice's notes as one line (`main`) and the rest (`band`); `bass` picks the lower line where the higher would be picked. */
export function splitDivisi(notes: SubNote[], bass: boolean, subject: Set<string> = new Set()): Split {
  const ns = [...notes].sort((a, b) => a.n[0] - b.n[0] || b.n[2] - a.n[2]);
  const count = ns.length;
  // Groups of notes linked by sounding together (union-find over overlaps, by a sweep).
  const parent = ns.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let open: number[] = [];
  for (let i = 0; i < count; i++) {
    open = open.filter((j) => end(ns[j].n) > ns[i].n[0]);
    for (const j of open) parent[find(j)] = find(i);
    open.push(i);
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < count; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }
  type Group = { idx: number[]; on: number; end: number; kind: "one" | "chord" | "divisi" };
  const list: Group[] = [...groups.values()]
    .map((idx) => {
      const on = Math.min(...idx.map((i) => ns[i].n[0]));
      const e = Math.max(...idx.map((i) => end(ns[i].n)));
      const chord = idx.every((i) => ns[i].n[0] === ns[idx[0]].n[0] && ns[i].n[1] === ns[idx[0]].n[1]);
      return { idx, on, end: e, kind: idx.length === 1 ? ("one" as const) : chord ? ("chord" as const) : ("divisi" as const) };
    })
    .sort((a, b) => a.on - b.on);
  // Regions: each divisi, with the chords and divisi touching it, chained.
  const regionOf = new Array<number>(list.length).fill(-1);
  let regions = 0;
  for (let g = 0; g < list.length; g++) {
    if (list[g].kind !== "divisi" || regionOf[g] >= 0) continue;
    const r = regions++;
    regionOf[g] = r;
    // Backward and forward along touching chords/divisi.
    for (let k = g - 1; k >= 0 && list[k].end === list[k + 1].on && regionOf[k] < 0; k--) regionOf[k] = r;
    for (let k = g + 1; k < list.length && list[k].on === list[k - 1].end; k++) regionOf[k] = r;
  }
  const lastEnd = Math.max(...ns.map((x) => end(x.n)));
  const inMain = new Array<boolean>(count).fill(true);
  for (let r = 0; r < regions; r++) {
    const gs = list.map((g, k) => ({ g, k })).filter(({ k }) => regionOf[k] === r);
    const idx = gs.flatMap(({ g }) => g.idx).sort((a, b) => ns[a].n[0] - ns[b].n[0] || ns[b].n[2] - ns[a].n[2]);
    const from = gs[0].g.on;
    const to = gs.at(-1)!.g.end;
    // The sub-line the voice was on: the line's note before the passage (or the first after it).
    const before = ns
      .map((x, i) => ({ x, i }))
      .filter(({ x, i }) => inMain[i] && end(x.n) <= from && !idx.includes(i))
      .sort((a, b) => end(a.x.n) - end(b.x.n) || (bass ? b.x.n[2] - a.x.n[2] : a.x.n[2] - b.x.n[2]))
      .at(-1);
    const after = ns
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => x.n[0] >= to)
      .sort((a, b) => a.x.n[0] - b.x.n[0] || (bass ? a.x.n[2] - b.x.n[2] : b.x.n[2] - a.x.n[2]))[0];
    const ctx = (before ?? after)?.x.sub ?? 0;
    const final = to === lastEnd;
    // The line: a chain of notes one after another, scored (time filled, time on the sub-line, pitch) or, at the end, (time, pitch, sub-line).
    type Score = [number, number, number, number];
    const better = (a: Score, b: Score) => {
      for (let k = 0; k < 4; k++) if (a[k] !== b[k]) return a[k] > b[k];
      return false;
    };
    const own = (i: number): Score => {
      const { n, sub } = ns[i];
      // The last notes (a final chord's) are the top's or the bottom's, the subject's or not.
      const theme = subject.has(`${n[0]}:${n[2]}`) && end(n) !== lastEnd ? n[1] : 0;
      const time = n[1];
      const onLine = sub === ctx ? n[1] : 0;
      const pitch = n[1] * (bass ? -n[2] : n[2]);
      return final ? [theme, time, pitch, onLine] : [theme, time, onLine, pitch];
    };
    const best: Score[] = [];
    const prev: number[] = [];
    idx.forEach((i, a) => {
      let s: Score = own(i);
      let p = -1;
      for (let b = 0; b < a; b++) {
        const j = idx[b];
        if (end(ns[j].n) > ns[i].n[0]) continue;
        const o = own(i);
        const t = best[b].map((x, k) => x + o[k]) as Score;
        if (better(t, s)) (s = t), (p = b);
      }
      best.push(s);
      prev.push(p);
    });
    let at = 0;
    for (let a = 1; a < idx.length; a++) if (better(best[a], best[at])) at = a;
    const chosen = new Set<number>();
    for (let a = at; a >= 0; a = prev[a]) chosen.add(idx[a]);
    for (const i of idx) inMain[i] = chosen.has(i);
  }
  const main = ns.filter((_, i) => inMain[i]).map((x) => x.n);
  const key = (n: Note) => `${n[0]}:${n[1]}:${n[2]}`;
  const mainKeys = new Set(main.map(key));
  const rest = ns.filter((_, i) => !inMain[i]).map((x) => x.n);
  const band = rest.filter((n) => !mainKeys.has(key(n)));
  return { main, band, unisons: rest.length - band.length };
}
