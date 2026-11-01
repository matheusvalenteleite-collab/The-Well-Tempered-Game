/**
 * D280, THE THUMBS SHOWN: how a passage is played with the two thumbs, worked out once and drawn in three
 * places: HEAR THE SUBJECT (the subject played, a thumb on each side), the tutorial's demonstration
 * (the passage played by the game, the thumbs touching the bars) and its guide (a thumb hovering where
 * and how the next note asks). Each note a touch: its landing and lifting (joined: a little after the
 * next lands; detached: at three fifths; short: at a third); its loudness (where across the bar: soft on
 * the soft side, loud on the strong, touch-expr.ts STRONG_SIDE: D315, the box's side strong); its
 * ornament (shaken); a rising step slid by the same thumb where sliding is taught.
 *
 * D370 (Glenn's notes §4: "musicality first, then the fingering that gets one there"): which thumb takes
 * each note is chosen by the music's intent, no longer by strict alternation. Each note's way to the next
 * (join | detach | short | accentNext | free: the reading's marks, else joined where the next follows at
 * once, as before) and the time between them decide. A Viterbi search over (this note's thumb, the other
 * thumb's last note) finds the plan of least cost (PLAN_COST) and the other kinds of suggestion
 * (planFingerings). D409: alternation the default, across leaps too; mirrors one suggestion; sparse marks
 * (suggestionMarks), one thumb and the other as filled and hollow discs (drawThumbMark), never L and R. Hard: a join only from one thumb to the other (or a slide where it is taught); the
 * same thumb twice only with SAME_THUMB_MIN_S between the strikes; a joined leap of a fourth or more only
 * by a thumb free PREPARE_MIN_S before it (else at a near-hard cost, so that a plan always exists).
 * The judge does not ask which thumb (LADDER: either thumb's note counts).
 */
import type { Shake } from "../touch/ornament-play.ts";
import { drawThumbProxy } from "./thumb-proxy.ts";

export type Thumb = "left" | "right";
/** D370: how a note goes to the next, as the plan reads it. */
export type Intent = "join" | "detach" | "short" | "accentNext" | "free";
export interface PlanNote {
  at: number;
  dur: number;
  /** Where it is drawn (a staff step, or a MIDI note: the caller's). */
  step: number;
  /** D370: its staff step, for the plan's contour and travel (else `step`). */
  st?: number;
  /** How it goes to the next: joined, detached, or not said (joined if the next follows at once). */
  join?: boolean | null;
  short?: boolean | null;
  /** D370: the reading's accent on it (the note before it then let go first: accentNext). */
  accent?: boolean | null;
  /** D409: a written rest before it (else read from the gap after the note before). */
  rest?: boolean;
  /** D370: its way to the next, given (else from join, short and the next one's accent). */
  intent?: Intent;
  /** 0 pp .. 1 ff. */
  d?: number;
  shake?: Shake | null;
}
export interface Touch {
  i: number;
  side: Thumb;
  on: number;
  off: number;
  step: number;
  d: number;
  shake: Shake | null;
  /** Played by the thumb already down sliding on (no new touch). */
  slid: boolean;
}
export interface PlanOptions {
  overlap: number;
  first?: Thumb;
  slides?: boolean;
  /** D370: seconds per unit of `at` (1 for seconds; 1 / ticks a second for ticks). Default 1. */
  sec?: number;
}
/** D370: one fingering of the line: its touches, its cost, the kind of plan it is. */
export interface Fingering {
  touches: Touch[];
  cost: number;
  name: FingeringName;
  /** D409: the notes that carry a mark (sparse, as an editor prints fingerings). */
  marks: SuggestMark[];
}
/** D370: every note by the other thumb; one thumb taking detached notes; one thumb taking leaps. */
export type FingeringName = "HANDOVERS" | "ONE THUMB WHERE DETACHED" | "ONE-THUMB LEAPS";

/**
 * D370 (Glenn's spec, his start values; to tune by listening and from logs): the soft costs. D409 (the
 * owner: "You assumed most leaps require repeating one's finger … I find it more natural to alternate there
 * too"): alternation is the default, across leaps too; a repeat of one thumb costs `same` where nothing asks
 * for it, and only a little (`same` + `sameOnApart`) where its lift is the articulation (a detached or short
 * note, the end of a slur, before an accent). No plan prefers a repeat for its own sake any more; the
 * repeats that serve the music are offered as other suggestions (PLAN_STYLES).
 */
export const PLAN_COST = {
  /** The thumb's own move non-zero and against the tune's move into the note. */
  contour: 0.25,
  /** Each staff step of the thumb's own move beyond a fourth, at 250 ms between its notes (more when quicker). */
  travel: 0.5,
  /** D409: one thumb twice in a row: alternation is the natural default. */
  same: 0.5,
  /** D409: the same thumb after a detached or short note, or before an accent (its lift the articulation): less. */
  sameOnApart: -0.1,
  /** A repeated note alternated though slow (≥ 300 ms) and detached. */
  repeatAlternateSlow: 0.5,
  /** A repeated note by the same thumb though quick (< 250 ms). */
  repeatSameFast: 1,
  /** A joined leap whose thumb was free long enough to rest on it early. */
  prepared: -0.3,
  /** A joined leap by a thumb with no time to prepare: near-hard (a plan must exist). */
  unprepared: 50,
} as const;
/**
 * D409: the kinds of suggestion searched for, the best first: plain alternation (PLAN_COST as it stands);
 * one thumb wherever a note is let go first (its lift the articulation, D370's old default); one thumb only
 * on the leaps let go first. Each a Viterbi search with `apart` the net cost of such a repeat; a suggestion
 * kept only where its repeats fall differently from those before it (mirrors are one suggestion).
 */
const PLAN_STYLES: readonly { name: FingeringName; apart: number; leapsOnly: boolean; contour: number }[] = [
  { name: "HANDOVERS", apart: PLAN_COST.same + PLAN_COST.sameOnApart, leapsOnly: false, contour: PLAN_COST.contour },
  { name: "ONE THUMB WHERE DETACHED", apart: -0.3, leapsOnly: false, contour: 3 },
  { name: "ONE-THUMB LEAPS", apart: -0.3, leapsOnly: true, contour: 3 },
];
type Style = (typeof PLAN_STYLES)[number];
/** D370: the same thumb twice needs this long between the strikes (lift and land again; s). */
export const SAME_THUMB_MIN_S = 0.2;
/** D370: a thumb landing a joined leap must have been free this long (s). */
export const PREPARE_MIN_S = 0.15;
/** D370: a fourth, in staff steps: a leap. */
const LEAP = 3;
/** D370: the plans offered: at most PLAN_K. D409: each playable (no near-hard cost the best avoids). */
export const PLAN_K = 3;
/** D370: the states kept at each note (a beam over the other thumb's last note; ample for two thumbs). */
const BEAM = 48;

/** D370: each note's way to the next. */
export function intentsOf(notes: readonly PlanNote[]): Intent[] {
  return notes.map((n, i) => {
    if (n.intent) return n.intent;
    const next = notes[i + 1];
    if (!next) return "free";
    if (n.short) return "short";
    const follows = next.at <= n.at + n.dur + 1e-9;
    const join = n.join ?? null;
    if (join === true || (join === null && follows)) return "join";
    if (next.accent) return "accentNext";
    return join === false ? "detach" : "free";
  });
}

/** When note j's thumb lets go, by its way to the next. */
function offOf(notes: readonly PlanNote[], intents: readonly Intent[], j: number, overlap: number): number {
  const n = notes[j];
  const next = notes[j + 1];
  const it = intents[j];
  if (n.short || it === "short") return n.at + n.dur * 0.35;
  if (it === "join" && next) return next.at + overlap;
  // Not joined (detached, before an accent, a rest between, the last: as before D370) let go at three fifths.
  if (next || n.join !== true) return n.at + Math.min(n.dur, next ? next.at - n.at : n.dur) * 0.6;
  return n.at + n.dur;
}

const sgn = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/**
 * D370: the cost of note i by the same thumb as the note before or the other, that thumb's own last note
 * `last` (-1: none). Infinity where a hard rule forbids it.
 */
function stepCost(notes: readonly PlanNote[], intents: readonly Intent[], st: readonly number[], sec: number, overlap: number, i: number, same: boolean, last: number, style: Style = PLAN_STYLES[0]): number {
  const ioi = (notes[i].at - notes[i - 1].at) * sec;
  const it = intents[i - 1];
  const mel = st[i] - st[i - 1];
  if (same && it === "join") return Infinity;
  if (same && ioi < SAME_THUMB_MIN_S - 1e-9) return Infinity;
  let c = 0;
  if (last >= 0) {
    const own = st[i] - st[last];
    if (own !== 0 && mel !== 0 && sgn(own) !== sgn(mel)) c += style.contour;
    const move = Math.max(0.05, (notes[i].at - notes[last].at) * sec);
    c += Math.max(0, Math.abs(own) - LEAP) * PLAN_COST.travel * (0.25 / move);
  }
  const apart = it === "detach" || it === "short" || it === "accentNext";
  // D409: one thumb twice: a repeat nothing asks for costs `same`; where its lift is the articulation, the style's.
  if (same) c += apart && (!style.leapsOnly || Math.abs(mel) >= LEAP) ? style.apart : PLAN_COST.same;
  const repeat = mel === 0 && notes[i].step === notes[i - 1].step;
  if (repeat && !same && ioi >= 0.3 && apart) c += PLAN_COST.repeatAlternateSlow;
  if (repeat && same && ioi < 0.25) c += PLAN_COST.repeatSameFast;
  if (it === "join" && !same && Math.abs(mel) >= LEAP) {
    // The landing thumb free since it let go of its own last note.
    const free = last < 0 ? Infinity : (notes[i].at - offOf(notes, intents, last, overlap)) * sec;
    c += free < PREPARE_MIN_S ? PLAN_COST.unprepared : PLAN_COST.prepared;
  }
  return c;
}

/** The touches of a line with its thumbs chosen. */
function touchesFor(notes: readonly PlanNote[], sides: readonly Thumb[], slid: readonly boolean[], intents: readonly Intent[], o: PlanOptions): Touch[] {
  const out: Touch[] = [];
  notes.forEach((n, i) => {
    const off = offOf(notes, intents, i, o.overlap);
    const prev = out[out.length - 1];
    if (slid[i] && prev) prev.off = Math.max(prev.off, off);
    out.push({ i, side: sides[i], on: n.at, off, step: n.step, d: n.d ?? 0.5, shake: n.shake ?? null, slid: slid[i] });
  });
  return out;
}

const STARTS: Thumb[] = ["left", "right"];
/** A hair against the right thumb first (the left first, as before D370, where all else is equal). */
const RIGHT_FIRST = 0.001;

/**
 * D370: the fingerings of a line, best first (Glenn's spec, §4). D409: one Viterbi search a kind of
 * suggestion (PLAN_STYLES): plain alternation first, then one thumb where a note is let go first, then one
 * thumb on the leaps let go first; a suggestion kept only where its same-thumb repeats fall differently from
 * those already kept (a plan and its mirror are one suggestion: `pattern`) and only if playable (no
 * near-hard cost the best avoids). Each carries its sparse marks (suggestionMarks). Times in any unit
 * (`o.sec` seconds each; `o.overlap` in the same).
 */
export function planFingerings(notes: readonly PlanNote[], o: PlanOptions = { overlap: 0 }): Fingering[] {
  if (!notes.length) return [{ touches: [], cost: 0, name: "HANDOVERS", marks: [] }];
  const sec = o.sec ?? 1;
  const intents = intentsOf(notes);
  const st = notes.map((n) => n.st ?? n.step);
  // A rising step joined to the note before, where sliding is taught: the same thumb slides on (as before D370).
  const slidable = notes.map((n, i) => !!o.slides && i > 0 && intents[i - 1] === "join" && st[i] > st[i - 1] && st[i] - st[i - 1] <= 2 && !n.shake);
  const out: Fingering[] = [];
  const seen = new Set<string>();
  for (const style of PLAN_STYLES) {
    const { sides, slid } = search(notes, intents, st, slidable, sec, o, style);
    const cost = costOf(notes, intents, st, sec, o.overlap, sides, slid);
    if (!Number.isFinite(cost) || (out.length && cost >= out[0].cost + PLAN_COST.unprepared / 2)) continue;
    const touches = touchesFor(notes, sides, slid, intents, o);
    const key = pattern(touches);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ touches, cost: Math.round(cost * 1000) / 1000, name: nameOf(touches, st), marks: suggestionMarks(notes, touches, o) });
  }
  return out.slice(0, PLAN_K);
}

/** D370: the plan of least cost for one kind of suggestion (D409), over (this note's thumb, the other thumb's last note). */
function search(notes: readonly PlanNote[], intents: readonly Intent[], st: readonly number[], slidable: readonly boolean[], sec: number, o: PlanOptions, style: Style): { sides: Thumb[]; slid: boolean[] } {
  type Node = { u: Thumb; slid: boolean; prev: Node | null };
  type State = { t: Thumb; o: number; cost: number; node: Node };
  let states = new Map<string, State>();
  for (const t of STARTS) if (!o.first || t === o.first) states.set(`${t}:-1`, { t, o: -1, cost: t === "right" ? RIGHT_FIRST : 0, node: { u: t, slid: false, prev: null } });
  for (let i = 1; i < notes.length; i++) {
    const next = new Map<string, State>();
    for (const s of states.values()) {
      const other: Thumb = s.t === "left" ? "right" : "left";
      const options = slidable[i] ? [{ u: s.t, slid: true }] : [{ u: s.t, slid: false }, { u: other, slid: false }];
      for (const op of options) {
        const same = op.u === s.t;
        const c = op.slid ? 0 : stepCost(notes, intents, st, sec, o.overlap, i, same, same ? i - 1 : s.o, style);
        if (!Number.isFinite(c)) continue;
        // A slide: the thumb is still on note i - 1's line, its last note now i.
        const no = same ? s.o : i - 1;
        const key = `${op.u}:${no}`;
        const was = next.get(key);
        if (!was || s.cost + c < was.cost) next.set(key, { t: op.u, o: no, cost: s.cost + c, node: { u: op.u, slid: op.slid, prev: s.node } });
      }
    }
    states = new Map([...next.entries()].sort((a, b) => a[1].cost - b[1].cost).slice(0, BEAM));
  }
  const end = [...states.values()].sort((a, b) => a.cost - b.cost)[0];
  const sides: Thumb[] = [];
  const slid: boolean[] = [];
  for (let n: Node | null = end.node; n; n = n.prev) sides.unshift(n.u), slid.unshift(n.slid);
  return { sides, slid };
}

/** D409: a fingering's cost as the best (plain alternation) counts it, slides as the search takes them. */
function costOf(notes: readonly PlanNote[], intents: readonly Intent[], st: readonly number[], sec: number, overlap: number, sides: readonly Thumb[], slid: readonly boolean[]): number {
  let c = sides[0] === "right" ? RIGHT_FIRST : 0;
  const lastOf: Record<Thumb, number> = { left: -1, right: -1 };
  lastOf[sides[0]] = 0;
  for (let i = 1; i < notes.length; i++) {
    const u = sides[i];
    if (!slid[i]) c += stepCost(notes, intents, st, sec, overlap, i, u === sides[i - 1], u === sides[i - 1] ? i - 1 : lastOf[u]);
    lastOf[u] = i;
  }
  return c;
}

/**
 * D409 (the owner: "a plan and its left/right mirror are the same suggestion"): where the same thumb comes
 * again ("=") and where the other takes over ("/"), a slide "~": the fingering without saying which thumb is
 * which. Two plans with one pattern are one suggestion.
 */
export function pattern(touches: readonly Touch[]): string {
  return touches.map((t, k) => (!k ? "" : t.slid ? "~" : t.side === touches[k - 1].side ? "=" : "/")).join("");
}

/** D409: the two thumbs named without settling which is which: A takes the first marked note, B the other. */
export type ThumbMark = "A" | "B";
/** D409: a mark under a note: the touch's place in the plan, the note it plays (Touch.i), which of the two, and why. */
export interface SuggestMark {
  k: number;
  i: number;
  thumb: ThumbMark;
  why: "start" | "repeat" | "rest" | "leap" | "slide" | "reminder";
}
/** D409: the two marks, one thumb and the other (drawn as pixel discs, drawThumbMark), and their one-line legend. */
export const THUMB_GLYPH: Readonly<Record<ThumbMark, string>> = { A: "●", B: "○" };
export const THUMB_LEGEND = "● ○ = your two thumbs, either way round";
/** D409: a reminder after so many unmarked touches in a row. */
export const REMIND_EVERY = 8;
/** D409: a gap before a note of at least this long (s) is a rest: the passage starts again. */
const REST_S = 0.2;

/**
 * D409 (the owner: "the editor doesn't suggest fingerings for ALL notes, only for those that present some
 * challenge"): the notes of a plan that carry a mark, as an editor would print them; plain alternation is
 * implied everywhere else. A mark: the passage's first touch; a same-thumb repeat (where it differs from
 * simple alternation: a detached or short note let go, a repeated note); the first touch after a rest or a
 * slide; the landing of a leap of a fourth or more let go first (where either thumb could take it; only the
 * first of such leaps in a row, the rest follow by alternation); a reminder after REMIND_EVERY unmarked
 * touches. A is the thumb of the first mark.
 */
export function suggestionMarks(notes: readonly PlanNote[], touches: readonly Touch[], o: { sec?: number } = {}): SuggestMark[] {
  const sec = o.sec ?? 1;
  const intents = intentsOf(notes);
  const st = notes.map((n) => n.st ?? n.step);
  const out: SuggestMark[] = [];
  let a: Thumb | null = null;
  let prev = -1;
  let quiet = 0;
  let leapRun = false;
  touches.forEach((t, k) => {
    if (t.slid) return;
    let why: SuggestMark["why"] | null = null;
    const leap = prev >= 0 && Math.abs(st[k] - st[prev]) >= LEAP && intents[k - 1] !== "join";
    if (prev < 0) why = "start";
    else if (t.side === touches[prev].side) why = "repeat";
    else if (touches[k - 1].slid) why = "slide";
    else if (restBefore(notes, k, sec)) why = "rest";
    else if (leap && !leapRun) why = "leap";
    else if (quiet >= REMIND_EVERY) why = "reminder";
    leapRun = leap;
    prev = k;
    if (!why) return void quiet++;
    a ??= t.side;
    quiet = 0;
    out.push({ k, i: t.i, thumb: t.side === a ? "A" : "B", why });
  });
  return out;
}

/** D409: a written rest before note k (PlanNote.rest, else a gap of REST_S or more after the note before). */
function restBefore(notes: readonly PlanNote[], k: number, sec: number): boolean {
  const n = notes[k];
  if (n.rest !== undefined) return n.rest;
  const p = notes[k - 1];
  return !!p && (n.at - (p.at + p.dur)) * sec >= REST_S - 1e-9;
}

/**
 * D409: a thumb's mark under a note: one thumb a filled disc, the other a ring of the same size (pixel
 * discs, not letters: no L or R, the order not settled). `r` the radius in px.
 */
export function drawThumbMark(c: CanvasRenderingContext2D, x: number, y: number, r: number, thumb: ThumbMark, ink: string, alpha = 1) {
  c.save();
  c.globalAlpha *= alpha;
  c.beginPath();
  c.arc(x, y, thumb === "A" ? r : r - 0.75, 0, Math.PI * 2);
  if (thumb === "A") (c.fillStyle = ink), c.fill();
  else (c.strokeStyle = ink), (c.lineWidth = 1.5), c.stroke();
  c.restore();
}

/** D370: a plan's character, for the one who chooses between plans. */
function nameOf(touches: readonly Touch[], st: readonly number[]): FingeringName {
  let leaps = 0;
  let same = 0;
  for (let k = 1; k < touches.length; k++) {
    if (touches[k].slid || touches[k].side !== touches[k - 1].side) continue;
    same++;
    if (Math.abs(st[k] - st[k - 1]) >= LEAP) leaps++;
  }
  return !same ? "HANDOVERS" : leaps * 2 >= same ? "ONE-THUMB LEAPS" : "ONE THUMB WHERE DETACHED";
}

/** The touches for a line of notes (times in any unit: ticks or seconds; `overlap` in the same): D370, the best fingering. */
export function planTouches(notes: readonly PlanNote[], o: PlanOptions = { overlap: 0 }): Touch[] {
  return planFingerings(notes, o)[0].touches;
}

/** D370: the cost of a given fingering (no slides), as planFingerings counts it; Infinity where a hard rule forbids it. */
export function planCost(notes: readonly PlanNote[], sides: readonly Thumb[], o: PlanOptions = { overlap: 0 }): number {
  const sec = o.sec ?? 1;
  const intents = intentsOf(notes);
  const st = notes.map((n) => n.st ?? n.step);
  let c = sides[0] === "right" ? RIGHT_FIRST : 0;
  const lastOf: Record<Thumb, number> = { left: -1, right: -1 };
  lastOf[sides[0]] = 0;
  for (let i = 1; i < notes.length; i++) {
    const u = sides[i];
    c += stepCost(notes, intents, st, sec, o.overlap, i, u === sides[i - 1], lastOf[u]);
    lastOf[u] = i;
  }
  return Math.round(c * 1000) / 1000;
}

/** Where a loudness sits across a side bar, as strength (0..1 of the bar's width from its soft side; strengthOf, touch-expr.ts, makes it the place from the box: D314/D315). */
export const acrossBar = (d: number) => 0.12 + 0.76 * Math.max(0, Math.min(1, d));

/**
 * A thumb on a bar at (x, y): D374, the abstract proxy (thumb-proxy.ts): down a filled disc, hover a
 * dotted ring where it is about to land, shaking a wobble. `size` its width in px.
 */
export function drawThumb(c: CanvasRenderingContext2D, x: number, y: number, size: number, side: Thumb, state: "down" | "hover", alpha = 1, wobble = 0) {
  drawThumbProxy(c, x + wobble, y, size, side, state === "down" ? "press" : "prep", alpha);
}
