/**
 * D325, THE MUSICIANS' PANEL (#1, #2): articulation scored by intention, expressive time legal.
 *
 * ARTICULATION BY INTENTION. LEGATO no longer scores more. Each note joined in the score to the one
 * before is judged by how the player let that one go: its hold, the share of the time between the two
 * strikes it sounded (1 when the thumbs overlapped). The engine infers the player's own touch from the
 * holds (LEGATO from 0.9, ORDINARY from 0.62, DETACHED below; no menu) and credits a note whose hold is
 * consistent with the player's recent holds on notes of the same value (the median of the last six:
 * within TOUCH_TOLERANCE of it). Notes of different values keep their own touch, so
 * "the semiquavers slurred, the quavers detached" is a consistent touch. A handover with a hair's gap
 * (JOIN_HAIR_MS) is joined for this: its hold counts as LEGATO's. Where the reading marks a join or a
 * detachment, the mark is what is judged. The credit is a bonus on the note's points, the same for
 * every touch, growing along a run of consistent notes (×0.25 a note, at most ×1), and capped at
 * ART_CAP of the run's points.
 *
 * EXPRESSIVE TIME. A late strike (never an early one) is still PERFECT where a musician delays on
 * purpose, within bounds:
 *   AGOGIC: on a strong beat or a dissonance, up to AGOGIC_SHARE of a beat, provided the next note
 *     struck is back on the pulse (else it is GOOD after all);
 *   BREATH: a re-entry after a written rest, or the first note after a cadence's arrival, up to
 *     BREATH_LATE_MS; the lift before it is never judged "not joined";
 *   BROADENING: the last BROADEN_BARS bars before a close, late up to BROADEN_SHARE of a beat, growing
 *     toward it. D384: a close is the piece's end, or a perfect or imperfect cadence (a fermata) in the
 *     run's last bar; never the bare end of a lesson's or practice's excerpt, and only in a run of at
 *     least BROADEN_MIN_BARS bars (broadenClose).
 * The windows that take a note are unchanged (a strike later than its window is a miss, as before), the
 * band never follows, and loudness plays no part. Pure: numbers in, verdicts out.
 */
import { MECH } from "./mechanics.ts";
import { beatOf, inBar, type TouchFugue } from "../touch/fugue.ts";

export type TouchStyle = "LEGATO" | "ORDINARY" | "DETACHED";
export const TOUCHES: readonly TouchStyle[] = ["LEGATO", "ORDINARY", "DETACHED"];
/** A hold of this share of the time to the next strike or more is LEGATO… */
export const LEGATO_FROM = 0.9;
/** …of this or more ORDINARY (Marpurg's ordinary touch), less DETACHED (C. P. E. Bach's half value). */
export const ORDINARY_FROM = 0.62;
/** A hold within this of the player's recent median is consistent (MECH.touchTolerance). */
export const TOUCH_TOLERANCE = 0.15;
/** The recent holds a touch is inferred from (by kind of note), and how many are taken as they come before judging. */
export const TOUCH_WINDOW = 6;
export const TOUCH_FREE = 2;
/** Articulation's points: at most this share of the run's (MECH.artCap). */
export const ART_CAP = 0.3;
/** D325b's bounds (MECH.agogicShare, breathLateMs, broadenShare). */
export const AGOGIC_SHARE = 0.15;
export const BREATH_LATE_MS = 120;
export const BROADEN_SHARE = 0.2;
export const BROADEN_BARS = 2;
/** D384: a run shorter than this (bars) never broadens: the grace would cover most of it. */
export const BROADEN_MIN_BARS = 3;

/**
 * D384 (Luigi 2, the mechanics report's §7): where a run may broaden, the tick it broadens toward, or null.
 * The piece's end (where the game's own final ritard plays: the run's end), or an arrival of a perfect or
 * imperfect cadence, or a fermata, in the run's last bar (the arrival); and only in a run at least
 * BROADEN_MIN_BARS long. An excerpt that merely stops (a lesson's, a practice's) judges its time plainly.
 */
export function broadenClose(o: { from: number; until: number; length: number; barTicks: number; cadences?: readonly { on: number; kind: string }[]; fermatas?: readonly number[] }): number | null {
  if (o.until - o.from < BROADEN_MIN_BARS * o.barTicks) return null;
  if (o.until >= o.length) return o.until;
  const lastBar = (t: number) => t > o.until - o.barTicks && t <= o.until;
  let close: number | null = null;
  for (const c of o.cadences ?? []) if ((c.kind === "perfect" || c.kind === "imperfect") && lastBar(c.on)) close = Math.max(close ?? 0, c.on);
  for (const t of o.fermatas ?? []) if (lastBar(t)) close = Math.max(close ?? 0, t);
  return close;
}

export function touchStyle(hold: number): TouchStyle {
  return hold >= LEGATO_FROM ? "LEGATO" : hold >= ORDINARY_FROM ? "ORDINARY" : "DETACHED";
}

/** The note's value as a kind of note for the touch: a quarter beat or less, a half, a beat, longer. */
export function valueClass(dur: number, beat: number): number {
  return dur <= beat / 4 ? 0 : dur <= beat / 2 ? 1 : dur <= beat ? 2 : 3;
}

/**
 * A handover with no more than this gap (ms) is joined for the touch: its hold counts as LEGATO's (a
 * thumb lifting a hair before the other lands, or iOS taking a touch back). Narrower than D289's legato
 * window (90 ms or 35% of the note), which on a quick note would take a half-value touch for a join.
 */
export const JOIN_HAIR_MS = 50;
/**
 * A note's hold: how long the note before sounded from its strike, as a share of the time from its
 * strike to this one's (ms), 0..1; `gapMs` from its lift to this strike (0 or less: still down). With
 * `hair`, a gap within JOIN_HAIR_MS is joined: the hold never under LEGATO_FROM.
 */
export function holdOf(soundedMs: number, toNextMs: number, gapMs = 0, hair = false): number {
  const h = gapMs <= 0 ? 1 : toNextMs > 0 ? Math.max(0, Math.min(1, soundedMs / toNextMs)) : 1;
  return hair && gapMs <= JOIN_HAIR_MS ? Math.max(h, LEGATO_FROM) : h;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** The player's touch, inferred from the holds as they come, by kind of note. */
export class TouchSense {
  private readonly holds: number[][] = [[], [], [], []];
  /** The notes judged by touch, by the touch each was played with. */
  readonly tally: Record<TouchStyle, number> = { LEGATO: 0, ORDINARY: 0, DETACHED: 0 };
  /** The touch for a kind of note so far (its recent holds' median), or null before any. */
  touchFor(cls: number): TouchStyle | null {
    const h = this.holds[cls] ?? [];
    return h.length ? touchStyle(median(h.slice(-TOUCH_WINDOW))) : null;
  }
  /** The player's touch over the run: the one most notes were played with (null before any). */
  get touch(): TouchStyle | null {
    const best = TOUCHES.reduce((a, b) => (this.tally[b] > this.tally[a] ? b : a));
    return this.tally[best] ? best : null;
  }
  /** A hold judged (`raw` the hold as played, before the legato window lifts it): consistent with the player's touch for that kind of note (the first ones are). */
  judge(cls: number, hold: number, raw = hold, tolerance = MECH.touchTolerance): boolean {
    const h = this.holds[cls] ?? (this.holds[cls] = []);
    let ok = true;
    if (h.length >= TOUCH_FREE) {
      const m = median(h.slice(-TOUCH_WINDOW));
      ok = Math.abs(hold - m) <= tolerance;
    }
    h.push(hold);
    if (h.length > 4 * TOUCH_WINDOW) h.splice(0, h.length - TOUCH_WINDOW);
    // The touch shown is the hold as played (a joined note's lifted to LEGATO only for the judging).
    this.tally[touchStyle(raw)]++;
    return ok;
  }
}

/** Articulation's bonus on a note's points along a run of `chain` consistent notes (1 the first). */
export function artBonus(pts: number, chain: number): number {
  return Math.max(1, Math.round(pts * Math.min(0.25 * chain, 1)));
}

/** How many of `want` articulation points fit under the cap, the run's points `score` (articulation's `art` among them). */
export function artRoom(want: number, score: number, art: number, cap = MECH.artCap): number {
  if (cap >= 1) return want;
  // art + x <= cap * (score + x)
  const room = Math.floor((cap * score - art) / (1 - cap));
  return Math.max(0, Math.min(want, room));
}

/**
 * HELD's bounds by the player's touch (D218's 75% for LEGATO or none yet; less for a lighter touch):
 * the least share of its length a note must sound to be HELD, and under which it is SHORT.
 */
export function heldBounds(t: TouchStyle | null): { low: number; short: number } {
  return t === "DETACHED" ? { low: 0.45, short: 0.3 } : t === "ORDINARY" ? { low: 0.6, short: 0.4 } : { low: 0.75, short: 0.5 };
}

/** A strong beat: a bar's first, or its middle in a bar of four beats or more (a 4/4's third, a 12/8's third). */
export function strongBeat(f: TouchFugue, on: number): boolean {
  const x = inBar(f, on);
  if (x === 0) return true;
  const { ticks, perBar } = beatOf(f);
  return perBar >= 4 && perBar % 2 === 0 && x === (ticks * perBar) / 2;
}

/**
 * A dissonance struck: the note against another voice sounding at its onset a second, a seventh or a
 * tritone (by pitch class), or a fourth above the lowest note sounding.
 */
export function dissonantAt(f: TouchFugue, voice: number, on: number, midi: number): boolean {
  let low = Infinity;
  const others: number[] = [];
  f.voices.forEach((ns, v) => {
    if (v === voice) return;
    for (const [o, d, m] of ns) {
      if (o > on) break;
      if (o + d > on) others.push(m), (low = Math.min(low, m));
    }
  });
  for (const m of others) {
    const pc = (((midi - m) % 12) + 12) % 12;
    if (pc === 1 || pc === 2 || pc === 6 || pc === 10 || pc === 11) return true;
  }
  return low < midi && (midi - low) % 12 === 5;
}

/** The first note after a cadence's arrival: the note before it sounding at (or struck on) the arrival. */
export function afterCadence(f: TouchFugue, prevOn: number, on: number): boolean {
  return (f.cadences ?? []).some((c) => prevOn <= c.on && c.on < on);
}

export type Grace = "agogic" | "breath" | "broaden";
/**
 * D325b: how late (ms) a strike may come and still be PERFECT, and why: the largest of the graces that
 * apply (0: none). `toEndBars` how far the note is from the run's close, in bars (broadening within BROADEN_BARS;
 * Infinity where the run has no close: broadenClose).
 */
export function graceMs(o: { beatMs: number; strong: boolean; dissonant: boolean; breath: boolean; toEndBars: number }): { ms: number; why: Grace | null } {
  let ms = 0;
  let why: Grace | null = null;
  if (o.strong || o.dissonant) (ms = MECH.agogicShare * o.beatMs), (why = "agogic");
  if (o.breath && MECH.breathLateMs > ms) (ms = MECH.breathLateMs), (why = "breath");
  if (o.toEndBars <= BROADEN_BARS) {
    const b = MECH.broadenShare * o.beatMs * Math.max(0, Math.min(1, 1 - o.toEndBars / BROADEN_BARS));
    if (b > ms) (ms = b), (why = "broaden");
  }
  return { ms, why };
}
