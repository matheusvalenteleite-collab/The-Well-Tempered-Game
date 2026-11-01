/**
 * D359, THE MANUAL's coach: when a line of a lesson's lens is not met, Herr Bach names the one thing to
 * fix, in musical terms and, where the take shows it, in numbers and the bar where it happened ("Bar 18:
 * you held into the rest. Lift as the note ends."). One line, never a list; the lens sheet under it keeps
 * the figures. Each function reads the take's notes (lens.ts NoteLens) and returns null when it has
 * nothing specific to say (the lesson's own line is said instead).
 */
import type { LensStats, NoteLens } from "./lens.ts";

export interface Said {
  text: string;
  vars?: Record<string, string | number>;
}

const MS_QUICK = 400;
const firstWhere = (x: LensStats, f: (p: NoteLens, k: number) => boolean) => x.per.find(f);

/** The bar where most notes went astray (wrong or missed), and how many. */
export function worstBar(x: LensStats): { bar: number; n: number } | null {
  const by = new Map<number, number>();
  for (const p of x.per) if (p.state !== "right") by.set(p.bar, (by.get(p.bar) ?? 0) + 1);
  let best: { bar: number; n: number } | null = null;
  for (const [bar, n] of by) if (!best || n > best.n) best = { bar, n };
  return best;
}

export const fixRight = (x: LensStats): Said | null => {
  const w = worstBar(x);
  if (!w) return null;
  // A wrong way is the commonest fault: say which way.
  const way = firstWhere(x, (p) => p.bar === w.bar && p.state === "wrong" && p.moved !== undefined && p.wanted !== undefined);
  if (way) return fixWay(way);
  return w.n > 1 ? { text: "Bar {b}: {n} notes went astray. Hear the bar in your head, then play it.", vars: { b: w.bar, n: w.n } } : { text: "Bar {b}: one note went astray. Hear the bar in your head, then play it.", vars: { b: w.bar } };
};

const WAY = (d: number) => (d > 0 ? "up" : d < 0 ? "down" : "level");
function fixWay(p: NoteLens): Said {
  const want = p.wanted ?? 0;
  const went = p.moved ?? 0;
  if (want === 0) return { text: "Bar {b}: the same note again; your thumb moved. Land where you were.", vars: { b: p.bar } };
  // The right way, but not far enough (a leap must look like one), or wrong for another reason (its time).
  if (went === want) return p.why === "height" ? { text: "Bar {b}: a leap. Move your thumb further {w}: a leap must look like one.", vars: { b: p.bar, w: WAY(want) } } : { text: "Bar {b}: one note went astray. Hear the bar in your head, then play it.", vars: { b: p.bar } };
  return { text: want > 0 ? "Bar {b}: the line rises; your thumb went {w}. Higher when it rises." : "Bar {b}: the line falls; your thumb went {w}. Lower when it falls.", vars: { b: p.bar, w: WAY(went) } };
}

export const fixDirection = (x: LensStats): Said | null => {
  const p = firstWhere(x, (q) => q.state === "wrong" && q.moved !== undefined && q.wanted !== undefined);
  return p ? fixWay(p) : fixRight(x);
};

/** Early or late on average: by how much, and the bar where it was most. */
export const fixTiming = (x: LensStats): Said | null => {
  if (x.timing.n < 3) return null;
  const m = x.timing.mean;
  if (Math.abs(m) <= 15) return null;
  const by = new Map<number, number[]>();
  for (const p of x.per) if (p.state === "right" && p.off !== undefined) by.set(p.bar, [...(by.get(p.bar) ?? []), p.off]);
  let bar = 0;
  let most = 0;
  for (const [b, offs] of by) {
    const mean = offs.reduce((a, c) => a + c, 0) / offs.length;
    if (Math.sign(mean) === Math.sign(m) && Math.abs(mean) > most) (most = Math.abs(mean)), (bar = b);
  }
  const vars = { n: Math.abs(m), b: bar };
  return m < 0 ? { text: "Early by {n} ms, most in bar {b}. Let the beat bring the note to you.", vars } : { text: "Late by {n} ms, most in bar {b}. Strike with the beat, not after the light.", vars };
};

export const fixSpread = (x: LensStats): Said => ({ text: "Your strikes scatter by {s} ms. Lean on the beat; let it carry you.", vars: { s: x.timing.sd } });

export const fixRests = (x: LensStats): Said | null => {
  const p = firstWhere(x, (q) => !!q.over || q.word === "REST!");
  return p ? { text: "Bar {b}: you held into the rest. Lift as the note ends.", vars: { b: p.bar } } : null;
};

export const fixHeld = (x: LensStats): Said | null => {
  const p = firstWhere(x, (q) => q.word === "TOO SOON");
  return p ? { text: "Bar {b}: the long note ended early. Stay on it until the next is due.", vars: { b: p.bar } } : null;
};

export const fixRepeats = (x: LensStats): Said => ({ text: x.repeats.doubles ? "A thumb that bounces is not heard twice. Lift fully, then land where you were." : "Lift fully before the repeat, then land where you were." });

export const fixTurns = (x: LensStats): Said | null => {
  // Two quick right notes in a row by the same thumb: the first place it happened.
  for (let k = 1; k < x.per.length; k++) {
    const a = x.per[k - 1];
    const b = x.per[k];
    if (a.state === "right" && b.state === "right" && a.side && a.side === b.side && b.ms - a.ms < MS_QUICK) return { text: "Bar {b}: one thumb took two quick notes running. Hand every other note to the other thumb.", vars: { b: b.bar } };
  }
  return null;
};

export const fixJoins = (x: LensStats): Said | null => {
  const p = firstWhere(x, (q) => q.join === false);
  return p ? { text: "Bar {b}: a gap before the note. Land the next thumb before the last one lifts.", vars: { b: p.bar } } : null;
};

export const fixPrep = (x: LensStats): Said =>
  x.prep.rests > 0 && x.prep.letGo > 0
    ? { text: "Your thumb rested early, then let go unheard. Keep it down; lift the other thumb on the beat to sound it." }
    : { text: "No thumb rested early. As one thumb strikes, put the other on its next note; lift the first on the beat." };

export const fixRuns = (x: LensStats): Said | null => {
  const b = x.runs.badBars?.[0];
  return b !== undefined ? { text: "Bar {b}: the run's landings did not travel its way. Let the whole hand go with it.", vars: { b } } : null;
};

const HOW: Record<string, string> = {
  LEGATO: "keep each note down until the next has sounded",
  ORDINARY: "let go just before the next note",
  DETACHED: "lift at half the note",
};
export const fixTouch = (want: string, got: string | null): Said => ({ text: "That was {got}. I asked for {want}: {how}.", vars: { got: got ?? "—", want, how: HOW[want] } });

export const fixConsistency = (x: LensStats): Said => ({ text: "Your touch changed from note to note: {c}% kept. Choose one length, and keep it.", vars: { c: x.touch.of ? Math.round((100 * x.touch.ok) / x.touch.of) : 0 } });

export const fixMarks = (x: LensStats): Said => {
  const ok = x.marks.apart.ok + x.marks.short.ok;
  const of = x.marks.apart.of + x.marks.short.of;
  return { text: "{n} of {m} marks missed. SHORT, the dot: lift before three fifths of the note. DETACHED, the stroke: lift before the next.", vars: { n: of - ok, m: of } };
};

export const fixSlurs = (x: LensStats): Said => {
  const ok = x.marks.joined.ok + x.marks.apart.ok;
  const of = x.marks.joined.of + x.marks.apart.of;
  return { text: "{n} of {m} missed. Join inside the slur; lift where it ends.", vars: { n: of - ok, m: of } };
};

export const fixAccents = (x: LensStats): Said => ({ text: "{n} of {m} accents missed. Weight on time: land the accent by the box, in the strong zone, on the beat.", vars: { n: x.marks.accent.of - x.marks.accent.ok, m: x.marks.accent.of } });

export const fixBreath = (): Said => ({ text: "You came in exactly on time after every rest. Breathe: enter a hair late, then go on." });

export const fixLean = (x: LensStats): Said =>
  x.graces.revoked > 0 ? { text: "You leaned, then stayed late. After the lean, the next note is back on the beat." } : { text: "No lean yet. On a bar's first note, arrive a moment late; the next note on time." };

export const fixDotted = (x: LensStats): Said => {
  const late = x.per.filter((p) => p.state === "right" && (p.off ?? 0) > 70).length;
  const early = x.per.filter((p) => p.state === "right" && (p.off ?? 0) < -70).length;
  return early >= late ? { text: "The short notes came early. Wait on the dot; the short note leans into the next." } : { text: "The short notes came late. After the dot, go on: the short note belongs to the next." };
};

export const fixTies = (x: LensStats): Said | null => {
  const p = firstWhere(x, (q) => q.word === "TOO SOON" && q.state === "right");
  return p ? { text: "Bar {b}: the tied note was let go. Hold it across the beat while the others move.", vars: { b: p.bar } } : { text: "Hold each tied note across the beat while the others move." };
};

export const fixLast = (x: LensStats): Said => (!x.last.hit ? { text: "The last note went astray. Find it before you arrive." } : { text: "The last note ended early. Stay on it to the end." });

/** The fixes' texts (for the translations' check). */
export function coachTexts(): string[] {
  return [
    "Bar {b}: {n} notes went astray. Hear the bar in your head, then play it.",
    "Bar {b}: one note went astray. Hear the bar in your head, then play it.",
    "Bar {b}: the same note again; your thumb moved. Land where you were.",
    "Bar {b}: the line rises; your thumb went {w}. Higher when it rises.",
    "Bar {b}: the line falls; your thumb went {w}. Lower when it falls.",
    "Bar {b}: a leap. Move your thumb further {w}: a leap must look like one.",
    "up",
    "down",
    "level",
    "Early by {n} ms, most in bar {b}. Let the beat bring the note to you.",
    "Late by {n} ms, most in bar {b}. Strike with the beat, not after the light.",
    "Your strikes scatter by {s} ms. Lean on the beat; let it carry you.",
    "Bar {b}: you held into the rest. Lift as the note ends.",
    "Bar {b}: the long note ended early. Stay on it until the next is due.",
    "A thumb that bounces is not heard twice. Lift fully, then land where you were.",
    "Lift fully before the repeat, then land where you were.",
    "Bar {b}: one thumb took two quick notes running. Hand every other note to the other thumb.",
    "Bar {b}: a gap before the note. Land the next thumb before the last one lifts.",
    "Your thumb rested early, then let go unheard. Keep it down; lift the other thumb on the beat to sound it.",
    "No thumb rested early. As one thumb strikes, put the other on its next note; lift the first on the beat.",
    "Bar {b}: the run's landings did not travel its way. Let the whole hand go with it.",
    "That was {got}. I asked for {want}: {how}.",
    ...Object.values(HOW),
    "Your touch changed from note to note: {c}% kept. Choose one length, and keep it.",
    "{n} of {m} marks missed. SHORT, the dot: lift before three fifths of the note. DETACHED, the stroke: lift before the next.",
    "{n} of {m} missed. Join inside the slur; lift where it ends.",
    "{n} of {m} accents missed. Weight on time: land the accent by the box, in the strong zone, on the beat.",
    "You came in exactly on time after every rest. Breathe: enter a hair late, then go on.",
    "You leaned, then stayed late. After the lean, the next note is back on the beat.",
    "No lean yet. On a bar's first note, arrive a moment late; the next note on time.",
    "The short notes came early. Wait on the dot; the short note leans into the next.",
    "The short notes came late. After the dot, go on: the short note belongs to the next.",
    "Bar {b}: the tied note was let go. Hold it across the beat while the others move.",
    "Hold each tied note across the beat while the others move.",
    "The last note went astray. Find it before you arrive.",
    "The last note ended early. Stay on it to the end.",
  ];
}
