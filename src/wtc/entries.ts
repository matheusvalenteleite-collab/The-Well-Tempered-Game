/**
 * The whole fugue (D121): every note, and every entry of the subject found in it. An entry keeps
 * the subject's rhythm exactly (each note at the subject's onset, of the subject's length, the
 * last free) and its intervals at one transposition after the head (from the sixth note, or the
 * fourth of a short subject); the head's notes may differ by up to two semitones (the tonal
 * answer's mutations), and one at most may be missing (a
 * note tied over, or shared with another voice). Entries upside down (inversus) are found the
 * same way. Only the first ten notes of a long subject are matched.
 */
export interface FullNote {
  midi: number;
  /** Onset and length in quarters from the start of the first full bar. */
  at: number;
  dur: number;
}

export interface Entry {
  /** Onset of the entry's first note, in quarters. */
  at: number;
  /** Semitones from the subject as Bach first states it. */
  shift: number;
  inverted: boolean;
  /** The notes of the entry (indices into the fugue's notes). */
  notes: number[];
  /** Where the entry ends (the last matched note's end). */
  end: number;
  /** A later subject of a double or triple fugue (2, 3); absent for the first subject (D137). */
  subject?: number;
  /** The subject in augmentation (2: every value doubled) or diminution (0.5) (D138). */
  scale?: 2 | 0.5;
}

const EPS = 1e-6;

export function findEntries(all: FullNote[], subject: { midi: number; at: number; dur: number }[]): Entry[] {
  const L = Math.min(subject.length, 10);
  const pat = subject.slice(0, L);
  // Notes by onset, for quick lookup.
  const byOnset = new Map<number, number[]>();
  all.forEach((n, i) => {
    const k = Math.round(n.at * 96);
    const xs = byOnset.get(k) ?? [];
    xs.push(i);
    byOnset.set(k, xs);
  });
  const at = (t: number) => byOnset.get(Math.round(t * 96)) ?? [];
  const best = new Map<string, { score: number; entry: Entry }>();
  for (const inverted of [false, true]) {
    const target = (k: number, base: number) => (inverted ? base - (pat[k].midi - pat[0].midi) : base + (pat[k].midi - pat[0].midi));
    for (let i = 0; i < all.length; i++) {
      const start = all[i];
      if (Math.abs(start.dur - pat[0].dur) > EPS && L > 1) continue;
      // The transposition is read after the head (at the sixth note, or the fourth of a short
      // subject) and then held; the notes before it may be mutated.
      for (const k0 of [...new Set([Math.min(5, L - 1), Math.min(3, L - 1)])]) {
      const t0 = start.at + (pat[k0].at - pat[0].at);
      for (const j of at(t0)) {
        const anchor = all[j];
        if (k0 < L - 1 && Math.abs(anchor.dur - pat[k0].dur) > EPS) continue;
        // The base pitch that puts pat[k0] on the anchor.
        const base = inverted ? anchor.midi + (pat[k0].midi - pat[0].midi) : anchor.midi - (pat[k0].midi - pat[0].midi);
        const notes: number[] = [];
        let exactCount = 0;
        let missing = 0;
        let ok = true;
        for (let k = 0; k < L && ok; k++) {
          const t = start.at + (pat[k].at - pat[0].at);
          const want = target(k, base);
          const cands = at(t).filter((x) => k === L - 1 || Math.abs(all[x].dur - pat[k].dur) < EPS);
          const exact = cands.find((x) => all[x].midi === want);
          const near = k < k0 ? cands.find((x) => Math.abs(all[x].midi - want) <= 2) : undefined;
          const hit = exact ?? near;
          if (exact !== undefined) exactCount++;
          if (hit === undefined) {
            missing++;
            if (missing > 1 || k === 0) ok = false;
          } else notes.push(hit);
        }
        if (!ok || notes.length < Math.max(3, L - 1) || exactCount < Math.max(3, L - 5)) continue;
        const shift = base - pat[0].midi;
        // One entry per onset and direction: the match with the most exact notes.
        const key = `${Math.round(start.at * 96)}:${inverted}`;
        const prev = best.get(key);
        if (prev && prev.score >= exactCount) continue;
        const last = all[notes[notes.length - 1]];
        best.set(key, { score: exactCount, entry: { at: start.at, shift, inverted, notes, end: last.at + last.dur } });
      }
      }
    }
  }
  return [...best.values()].map((x) => x.entry).sort((a, b) => a.at - b.at || a.shift - b.shift);
}
