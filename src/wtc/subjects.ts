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
  // The end of the first subject's exposition: every voice has entered and stated it.
  const firsts = p.voices.map((_, v) => Math.min(...firstSubject.filter((o) => o.voice === v).map((o) => o.on), Infinity)).filter(Number.isFinite);
  const expositionEnd = (firsts.length ? Math.max(...firsts) : 0) + len;
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
