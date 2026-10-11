/**
 * The composer's first step: the player's subject, read against the subjects of Bach's 29
 * expositions in the dataset (fugues.ts; their ends are the dataset's, read by hand, D119). Only
 * what makes a subject unusable is an error (too short to answer, a note that cannot be spelled in
 * the answer); everything else is Bach's practice, with his numbers and his examples, as the
 * chorale mode places a choice in Bach's habit (C4).
 */
import { interval } from "../../counterpoint/interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import { FUGUES, transpose, type WtcFugue, type WtcNote } from "../fugues.ts";
import { barQuarters, EPS, lengthOf, place, toNotes, type FugueDraft } from "./model.ts";

export interface Remark {
  severity: "error" | "advice" | "info";
  /** A content key under "ui." (src/content/en.json), with its variables. */
  key: string;
  vars: Record<string, string | number>;
  /** Bach's fugues that show the point (ids in fugues.ts). */
  examples: string[];
}

const DEG = ["1", "2", "3", "4", "5", "6", "7"];
const degName = (p: string, key: string) => {
  const pl = place(p, key);
  return `${pl.alter > 0 ? "♯" : pl.alter < 0 ? "♭" : ""}${DEG[pl.deg]}`;
};
const span = (ns: WtcNote[]) => ns[ns.length - 1].at + ns[ns.length - 1].dur - ns[0].at;
const range = (ns: WtcNote[]) => {
  const m = ns.map((n) => parsePitch(n.pitch).midi);
  return Math.max(...m) - Math.min(...m);
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const label = (f: WtcFugue) => f.id;

/** Facts about Bach's subjects, computed once. */
const BACH = FUGUES.map((f) => ({
  f,
  first: degName(f.subject[0].pitch, f.key),
  last: degName(f.subject[f.subject.length - 1].pitch, f.key),
  bars: span(f.subject) / f.barQuarters,
  range: range(f.subject),
  notes: f.subject.length,
  upbeat: f.phase > EPS,
}));

/** Which of Bach's subjects share a feature: their count and up to three examples. */
function like(pred: (b: (typeof BACH)[number]) => boolean) {
  const xs = BACH.filter(pred);
  return { n: xs.length, examples: xs.slice(0, 3).map((b) => label(b.f)) };
}

export function judgeSubject(d: FugueDraft): Remark[] {
  const out: Remark[] = [];
  const ns = toNotes(d.subject);
  const total = BACH.length;
  if (ns.length < 3) {
    out.push({ severity: "error", key: "compose.subj.tooShort", vars: {}, examples: [] });
    return out;
  }
  // Every note must be spellable a fifth up and a fourth up (the answer's two intervals).
  const bad = ns.findIndex((n) => {
    try {
      transpose(n.pitch, 4, 7);
      transpose(n.pitch, 3, 5);
      return false;
    } catch {
      return true;
    }
  });
  if (bad >= 0) out.push({ severity: "error", key: "compose.subj.spelling", vars: { note: bad + 1, pitch: ns[bad].pitch }, examples: [] });

  const first = degName(ns[0].pitch, d.key);
  const l1 = like((b) => b.first === first);
  if (first === "1" || first === "5") out.push({ severity: "info", key: "compose.subj.first", vars: { deg: first, n: l1.n, total }, examples: l1.examples });
  else out.push({ severity: "advice", key: "compose.subj.firstOther", vars: { deg: first, n: l1.n, total }, examples: l1.examples });

  const last = degName(ns[ns.length - 1].pitch, d.key);
  const l2 = like((b) => b.last === last);
  out.push({ severity: l2.n === 0 ? "advice" : "info", key: l2.n === 0 ? "compose.subj.lastNone" : "compose.subj.last", vars: { deg: last, n: l2.n, total }, examples: l2.examples });

  const bars = (lengthOf(d.subject) - (d.subject[d.subject.length - 1]?.pitch ? 0 : d.subject[d.subject.length - 1].dur)) / barQuarters(d.time);
  const bs = BACH.map((b) => b.bars);
  const shortest = BACH.reduce((a, b) => (b.bars < a.bars ? b : a));
  const longest = BACH.reduce((a, b) => (b.bars > a.bars ? b : a));
  const lengthVars = { bars: round(bars), min: round(shortest.bars), median: round(median(bs)), max: round(longest.bars) };
  if (bars < shortest.bars - EPS) out.push({ severity: "advice", key: "compose.subj.short", vars: lengthVars, examples: [label(shortest.f)] });
  else if (bars > longest.bars + EPS) out.push({ severity: "advice", key: "compose.subj.long", vars: lengthVars, examples: [label(longest.f)] });
  else out.push({ severity: "info", key: "compose.subj.length", vars: lengthVars, examples: [] });

  const r = range(ns);
  const rs = BACH.map((b) => b.range);
  const widest = BACH.reduce((a, b) => (b.range > a.range ? b : a));
  const rangeVars = { semis: r, median: median(rs), max: Math.max(...rs) };
  if (r > Math.max(...rs)) out.push({ severity: "advice", key: "compose.subj.wide", vars: rangeVars, examples: [label(widest.f)] });
  else out.push({ severity: "info", key: "compose.subj.range", vars: rangeVars, examples: [] });

  // Leaps: an augmented interval, or beyond the octave.
  for (let i = 1; i < ns.length; i++) {
    const iv = interval(ns[i - 1].pitch, ns[i].pitch);
    if (iv.quality === "A" || iv.quality === "AA") {
      const n = BACH.filter((b) => b.f.subject.some((x, k) => k > 0 && ["A", "AA"].includes(interval(b.f.subject[k - 1].pitch, x.pitch).quality))).length;
      out.push({ severity: "advice", key: "compose.subj.augmented", vars: { note: i + 1, interval: iv.name, n, total }, examples: [] });
    } else if (iv.number > 8) out.push({ severity: "advice", key: "compose.subj.beyondOctave", vars: { note: i + 1, interval: iv.name }, examples: [] });
  }

  // A subject that ends in the dominant key: its tail will be answered back in the tonic.
  const pl = ns.map((n) => place(n.pitch, d.key));
  const from = Math.floor((2 * ns.length) / 3);
  if (pl.some((p, i) => i >= from && i + 1 < ns.length && p.deg === 3 && p.alter > 0 && pl[i + 1].deg === 4 && pl[i + 1].alter === 0)) out.push({ severity: "info", key: "compose.subj.modulates", vars: {}, examples: [] });

  if (d.phase > EPS) {
    const l = like((b) => b.upbeat);
    out.push({ severity: "info", key: "compose.subj.upbeat", vars: { n: l.n, total }, examples: l.examples });
  }
  if (d.subject.some((e, i) => !e.pitch && i > 0 && i < d.subject.length - 1)) {
    const l = like((b) => b.f.subject.some((x, k) => k > 0 && x.at > b.f.subject[k - 1].at + b.f.subject[k - 1].dur + EPS));
    out.push({ severity: "info", key: "compose.subj.rests", vars: { n: l.n, total }, examples: l.examples });
  }
  return out;
}

const round = (x: number) => Math.round(x * 10) / 10;
