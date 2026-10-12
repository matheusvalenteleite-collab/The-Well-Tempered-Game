/**
 * The other subjects of a fugue: melodic figures that recur, with the same intervals (by letter) and
 * rhythm, in more than one voice, outside the entries of the first subject. A figure whose first
 * appearances mostly sound against entries of the first subject travels with it (a countersubject);
 * a new subject (a double or triple fugue's second and third, as in Book I's C sharp minor or
 * Book II's F sharp minor, G sharp minor and B major) cannot be told from an imitative episode by
 * the notes alone (both pass between voices at the fourth and fifth), so where a later subject
 * enters is taken from the literature, and the notes give its shape and all its entries.
 *
 * The search: every run of eight notes (or fewer, down to five, for a short later subject) is keyed by its intervals and rhythm; keys found three times
 * or more, in two voices or more, are candidates; each is grown note by note while it still recurs
 * as often; overlapping candidates (the same figure found from a different first note) are merged.
 */
import { parsePitch } from "../music/pitch.ts";
import type { WtcPiece } from "./corpus.ts";
import { findEntriesByHead, findTransformed, line, type Note } from "./fugue.ts";
import { subjectLength } from "./structure.ts";

export interface Occurrence {
  voice: number;
  on: number;
  end: number;
}

export interface OtherSubject {
  role: "subject" | "countersubject";
  /** The figure as it first appears. */
  notes: Note[];
  occurrences: Occurrence[];
}

const D = (p: string) => parsePitch(p).diatonic;

/** Recurring figures outside the first subject's entries, each grown to its full recurring length. */
export function figures(p: WtcPiece, subject: Note[], answer: Note[], K = 8): { notes: Note[]; occurrences: Occurrence[] }[] {
  const len = subjectLength(subject);
  const firstSubject: Occurrence[] = [
    ...findEntriesByHead(p, subject).entries.map((e) => ({ voice: e.voice, on: e.on, end: e.on + len })),
    ...findEntriesByHead(p, answer).entries.map((e) => ({ voice: e.voice, on: e.on, end: e.on + len })),
    ...findTransformed(p, subject).map((e) => ({ voice: e.voice, on: e.on, end: e.on + len * e.scale })),
  ];
  const lines = p.voices.map(line);
  const inFirst = (v: number, t: number) => firstSubject.some((o) => o.voice === v && t >= o.on && t < o.end);
  const key = (l: Note[], s: number, k: number) => {
    const iv: number[] = [];
    const io: number[] = [];
    for (let i = 0; i < k - 1; i++) {
      iv.push(D(l[s + i + 1].pitch) - D(l[s + i].pitch));
      io.push(l[s + i + 1].on - l[s + i].on);
    }
    return `${iv.join(",")}|${io.join(",")}`;
  };
  const find = (k: number, starts?: [number, number][]) => {
    const occ = new Map<string, [number, number][]>();
    const each = starts ?? lines.flatMap((l, v) => l.map((_, s) => [v, s] as [number, number]));
    for (const [v, s] of each) {
      const l = lines[v];
      if (s + k > l.length || inFirst(v, l[s].on)) continue;
      const kk = key(l, s, k);
      if (!occ.has(kk)) occ.set(kk, []);
      occ.get(kk)!.push([v, s]);
    }
    return occ;
  };
  // Candidates: recurring three times or more, in two voices or more.
  const candidates = [...find(K).values()].filter((o) => o.length >= 3 && new Set(o.map(([v]) => v)).size >= 2).sort((a, b) => b.length - a.length);
  const picked: { k: number; occ: [number, number][] }[] = [];
  for (const c of candidates) {
    const overlaps = (o: [number, number][]) => picked.some((q) => q.occ.some(([v, s]) => o.some(([w, t]) => w === v && Math.abs(t - s) < q.k)));
    if (overlaps(c)) continue;
    // Grow the figure while it recurs as often.
    let k = K;
    let occ = c;
    while (true) {
      const grown = [...find(k + 1, occ).values()].sort((a, b) => b.length - a.length)[0];
      if (!grown || grown.length < occ.length) break;
      k++;
      occ = grown;
    }
    // And backwards (D160): while every occurrence is preceded by the same interval and rhythm, the
    // figure begins earlier (a subject found from its second note: AoF IX's theme, a bar late).
    while (true) {
      const prevKey = ([v, s]: [number, number]) => {
        if (s < 1) return null;
        const l = lines[v];
        return `${D(l[s].pitch) - D(l[s - 1].pitch)}|${l[s].on - l[s - 1].on}`;
      };
      const tally = new Map<string, number>();
      for (const o of occ) {
        const kk = prevKey(o);
        if (kk) tally.set(kk, (tally.get(kk) ?? 0) + 1);
      }
      const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!best || best[1] < occ.length) break;
      occ = occ.map((o) => [o[0], o[1] - 1] as [number, number]);
      k++;
    }
    picked.push({ k, occ });
    if (picked.length >= 12) break;
  }
  return picked.map(({ k, occ }) => {
    const occurrences = occ
      .map(([v, s]) => ({ voice: v, on: lines[v][s].on, end: lines[v][s + k - 1].on + lines[v][s + k - 1].dur, s }))
      .sort((a, b) => a.on - b.on);
    return { notes: lines[occurrences[0].voice].slice(occurrences[0].s, occurrences[0].s + k), occurrences: occurrences.map(({ voice, on, end }) => ({ voice, on, end })) };
  });
}

/**
 * The later subjects of a double or triple fugue, given the bars where they first enter (from the
 * literature: data/wtc/later-subjects.json): for each, the recurring figure that first appears
 * within a bar of that point, the one heard most often.
 */
export function laterSubjects(p: WtcPiece, subject: Note[], answer: Note[], bars: number[]): OtherSubject[] {
  const barOf = (t: number) => [...p.bars].reverse().find((b) => b.on <= t)?.n ?? 1;
  const out: OtherSubject[] = [];
  // Figures of eight notes first; a shorter subject (Book II's C sharp minor: five notes) where none is found.
  const byLength = [8, 7, 6, 5].map((k) => figures(p, subject, answer, k));
  for (const b of bars) {
    const best = byLength.map((fs) => fs.filter((f) => Math.abs(barOf(f.occurrences[0].on) - b) <= 1 && !out.some((o) => o.occurrences[0].on === f.occurrences[0].on)).sort((x, y) => y.occurrences.length - x.occurrences.length)[0]);
    // Eight notes where a figure of eight is found; otherwise the shorter figure heard most often
    // (shorter figures recur more often merely for being short, so they are a fallback only).
    const shorter = best.slice(1).filter(Boolean).sort((x, y) => y!.occurrences.length - x!.occurrences.length)[0];
    const pick = best[0] ?? shorter;
    if (pick) out.push({ role: "subject", ...pick });
  }
  return out;
}

/**
 * Further occurrences of a later subject whose rhythm Bach varies (D163: Groocock counts 35 statements of Book I
 * no. 4's third subject, the exact-rhythm search finds 8: its repeated notes are re-divided). The figure with its
 * repeated notes merged, matched by its intervals (by letter, exactly) in a rhythm that may differ note by note
 * (each time-span between a third and three times the figure's), the whole lasting the figure's length within
 * half again either way; the last interval free (the end is bent to the harmony: b. 52, D-E for D#-E#-F#). Freeing
 * two found more of no. 4's final section (b. 95) but doubled Book II no. 4's second subject with false ones.
 * Figures of fewer than five distinct notes are not searched (too common).
 */
export function laterByContour(p: WtcPiece, notes: Note[]): Occurrence[] {
  const merge = (l: Note[]) => l.filter((n, i) => i === 0 || n.pitch !== l[i - 1].pitch);
  const fig = merge(notes);
  const n = fig.length;
  if (n < 5) return [];
  const fInt = fig.slice(1).map((x, i) => D(x.pitch) - D(fig[i].pitch));
  const fIoi = fig.slice(1).map((x, i) => x.on - fig[i].on);
  const last = notes[notes.length - 1];
  const span = last.on + last.dur - notes[0].on;
  const out: Occurrence[] = [];
  p.voices.forEach((v, voice) => {
    const l = merge(line(v));
    for (let s = 0; s + n <= l.length; s++) {
      let ok = true;
      for (let i = 0; i < n - 1 && ok; i++) {
        if (i < n - 2 && D(l[s + i + 1].pitch) - D(l[s + i].pitch) !== fInt[i]) ok = false;
        else {
          const r = (l[s + i + 1].on - l[s + i].on) / fIoi[i];
          if (r < 1 / 3 - 1e-9 || r > 3 + 1e-9) ok = false;
        }
      }
      if (!ok) continue;
      // The occurrence ends where its last merged note ends (the next different pitch).
      const end = l[s + n] ? l[s + n].on : l[s + n - 1].on + l[s + n - 1].dur;
      const len = end - l[s].on;
      if (len < span / 1.5 || len > span * 1.5) continue;
      out.push({ voice, on: l[s].on, end });
    }
  });
  return out;
}
