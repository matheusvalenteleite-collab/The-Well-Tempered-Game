/**
 * D298: a fugue's Humdrum **kern (data/sources/bach-wtc/kern, one voice per spine, bass first) laid out
 * for engraving as the sheet mode prints it:
 *   grand  the two staves an Urtext prints (the voices on the staves the encoding names, *staff1/2), each
 *          staff one spine whose sub-spines are its voices (the upper voice first: Verovio's layer 1,
 *          stems up), a voice's own brief divisi kept as more sub-spines;
 *   open   one staff per voice, top voice first, each in the clef its range asks (G, G an octave down,
 *          F), all staves the same size.
 * The ossia sub-spines (*S/ossia) are left out (the text as Bach wrote it, "sic"), tempo marks
 * dropped, C and alla-breve signs for 4/4 and 2/2, Verovio's autobeam. Each data token's line and field
 * in the output (Verovio's element ids, "note-L12F3") is recorded with its voice (top voice 0), so
 * the engraved notes are known by voice.
 */

export type SheetLayout = "grand" | "open";

export interface KernLayout {
  kern: string;
  /** "L:F" (1-based line and field of the output) → voice (0 the highest). */
  voiceAt: Map<string, number>;
  /** Staves top first: the voices each holds (highest first). */
  staves: number[][];
  voices: number;
}

interface Col {
  /** Voice, top first; -1 for a non-kern spine. */
  voice: number;
  /** A column created by a split, read as an ossia: left out. */
  ossia: boolean;
  id: number;
}

/** The median MIDI pitch of a voice → its clef in open score. */
export function clefFor(median: number): string {
  if (median >= 62) return "*clefG2";
  if (median >= 53) return "*clefGv2";
  return "*clefF4";
}

const MANIP = new Set(["*^", "*v", "*-", "*+", "*x"]);

/**
 * `medians`: each voice's median MIDI pitch (top first), for the open score's clefs.
 */
export function layoutKern(src: string, layout: SheetLayout, medians: number[] = []): KernLayout {
  const lines = src.split(/\r?\n/).filter((l) => l.length > 0);
  // Pass 1: every line's columns (which voice, which ossia), the split columns read ahead.
  let next = 0;
  let cols: Col[] = [];
  const colsAt: Col[][] = [];
  const ossiaIds = new Set<number>();
  let nVoices = 0;
  const staffOf: number[] = [];
  for (const line of lines) {
    if (line.startsWith("!")) {
      colsAt.push(cols);
      continue;
    }
    const f = line.split("\t");
    if (line.startsWith("**")) {
      const kern = f.filter((x) => x === "**kern").length;
      nVoices = kern;
      let k = 0;
      cols = f.map((x) => ({ voice: x === "**kern" ? kern - 1 - k++ : -1, ossia: false, id: next++ }));
      colsAt.push(cols);
      continue;
    }
    colsAt.push(cols);
    if (line.startsWith("*")) {
      f.forEach((x, i) => {
        if (x === "*S/ossia" && cols[i]) ossiaIds.add(cols[i].id);
        const sm = /^\*staff(\d+)$/.exec(x);
        if (sm && cols[i] && cols[i].voice >= 0) staffOf[cols[i].voice] = Number(sm[1]);
      });
      if (f.some((x) => MANIP.has(x))) {
        const out: Col[] = [];
        for (let i = 0; i < f.length; i++) {
          const x = f[i];
          const c = cols[i];
          if (x === "*^") out.push(c, { voice: c.voice, ossia: false, id: next++ });
          else if (x === "*v") {
            let j = i;
            while (j + 1 < f.length && f[j + 1] === "*v") j++;
            out.push(cols[i]);
            i = j;
          } else if (x === "*-") {
            /* ends */
          } else out.push(c);
        }
        cols = out;
      }
    }
  }
  const isOssia = (c: Col) => ossiaIds.has(c.id);
  // The staves: grand, as encoded (staff 1 the upper); open, a voice to a staff.
  const staves: number[][] =
    layout === "grand"
      ? [...new Set(staffOf)].sort((a, b) => a - b).map((s) => staffOf.map((st, v) => (st === s ? v : -1)).filter((v) => v >= 0))
      : Array.from({ length: nVoices }, (_, v) => [v]);
  const staffIx = (voice: number) => staves.findIndex((s) => s.includes(voice));
  // The output's column order for a line's columns: staves bottom (last) to top, left to right as
  // Humdrum has it; within a staff the voices top first; a voice's own columns as they come.
  const order = (cs: Col[]): number[] => {
    const ix = cs.map((c, i) => ({ c, i })).filter(({ c }) => c.voice >= 0 && !isOssia(c));
    ix.sort((a, b) => staffIx(b.c.voice) - staffIx(a.c.voice) || a.c.voice - b.c.voice || a.i - b.i);
    return ix.map((x) => x.i);
  };
  const groups = (cs: Col[], ord: number[]): number[] => ord.map((i) => staffIx(cs[i].voice));

  const out: string[] = [];
  const voiceAt = new Map<string, number>();
  const push = (toks: string[]) => out.push(toks.join("\t"));
  const nStaves = staves.length;
  let headerDone = false;
  /** Interpretations met before the first bar or note: written once the staves' columns exist. */
  const early: string[][] = [];
  const begin = (cs: Col[]) => {
    // The staves' spines (the lowest staff first), their names and clefs, then split into voices.
    push(Array(nStaves).fill("**kern"));
    push(staves.map((_, k) => `*staff${k + 1}`).reverse());
    const counts = staves.map(() => 0).reverse();
    const ord = order(cs);
    const gs = groups(cs, ord);
    for (const g of gs) counts[nStaves - 1 - g]++;
    const have = counts.map(() => 1);
    while (have.some((h, k) => h < counts[k])) {
      const toks: string[] = [];
      have.forEach((h, k) => {
        for (let j = 0; j < h; j++) toks.push(j === h - 1 && h < counts[k] ? "*^" : "*");
      });
      have.forEach((h, k) => h < counts[k] && (have[k] = h + 1));
      push(toks);
    }
    for (const e of early) {
      const toks = ord.map((i) => e[i] ?? "*");
      if (toks.some((t) => t !== "*")) push(toks);
    }
    if (layout === "open") {
      const toks = ord.map((i) => clefFor(medians[cs[i].voice] ?? 60));
      push(toks);
    }
    headerDone = true;
  };
  const meter = (m: string) => (m === "*M4/4" ? "*met(c)" : m === "*M2/2" ? "*met(c|)" : "*");
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.startsWith("!") || line.startsWith("**")) continue;
    const before = colsAt[li];
    const f = line.split("\t");
    const ord = order(before);
    if (line.startsWith("*")) {
      const manip = f.some((x) => MANIP.has(x));
      if (!headerDone && !manip) {
        // Interpretations of the opening: staff and clef assignments made anew, tempo dropped, the metre's sign added.
        const toks = f.map((x) => (/^\*staff|^\*MM|^\*clef/.test(x) && (layout === "open" || /^\*staff|^\*MM/.test(x)) ? "*" : x));
        early.push(toks);
        if (f.some((x) => /^\*M\d/.test(x))) early.push(f.map(meter));
        continue;
      }
      if (!headerDone) begin(before);
      if (manip) {
        if (f.every((x) => x === "*-")) {
          // The end: each staff's voices merged into its spine, a staff at a time, then the ends.
          const gs = groups(before, ord);
          for (let k = nStaves - 1; k >= 0; k--) {
            const n = gs.filter((g) => g === k).length;
            if (n < 2) continue;
            push(gs.map((g) => (g === k ? "*v" : "*")));
            // After the merge the staff is one column: rebuild the group list.
            const keep: number[] = [];
            let seen = false;
            for (const g of gs) {
              if (g === k) {
                if (!seen) keep.push(g);
                seen = true;
              } else keep.push(g);
            }
            gs.splice(0, gs.length, ...keep);
          }
          push(Array(nStaves).fill("*-"));
          continue;
        }
        // A voice's own split or merge, among the kept columns (an ossia's own: none).
        const toks: string[] = [];
        for (const i of ord) {
          const x = f[i];
          if (x === "*^") {
            // A split whose new column is an ossia is no split here.
            const after = colsAt[li + 1] ?? [];
            const born = after.find((c, j) => j > 0 && after[j - 1].id === before[i].id && c.id !== before[i].id && c.voice === before[i].voice);
            toks.push(born && isOssia(born) ? "*" : "*^");
          } else if (x === "*v") {
            // A merge with an ossia (the only other column of the run) is no merge here.
            let a = i;
            while (a > 0 && f[a - 1] === "*v") a--;
            let b = i;
            while (b + 1 < f.length && f[b + 1] === "*v") b++;
            const kept = [];
            for (let j = a; j <= b; j++) if (!isOssia(before[j])) kept.push(j);
            toks.push(kept.length > 1 ? "*v" : "*");
          } else toks.push(x === "*-" ? "*" : x);
        }
        push(toks);
        continue;
      }
      const toks = ord.map((i) => {
        const x = f[i];
        if (/^\*MM|^\*S[/-]|^\*strophe|^\*staff/.test(x)) return "*";
        if (layout === "open" && /^\*clef/.test(x)) return "*";
        return x;
      });
      if (toks.some((t) => t !== "*")) push(toks);
      if (f.some((x) => /^\*M\d/.test(x))) push(ord.map((i) => meter(f[i])));
      continue;
    }
    if (!headerDone) begin(before);
    if (line.startsWith("=")) {
      push(ord.map((i) => f[i]));
      continue;
    }
    const toks = ord.map((i) => f[i].replace(/W[x]?/g, "m"));
    push(toks);
    const L = out.length;
    ord.forEach((i, k) => voiceAt.set(`${L}:${k + 1}`, before[i].voice));
  }
  out.push("!!!filter: autobeam");
  return { kern: out.join("\n"), voiceAt, staves, voices: nVoices };
}
