/**
 * D321, DRAG MEANINGS (the owner's Decision 13: "the drag: one connection per instrument … try it in
 * the Lab first"; the design note "Mechanics, rethought" §1). A drag is a held thumb sliding on to
 * another note (FREE PLAY: another row; a passage: the slide onto the next note, D208/D289).
 *   "join" (the game's, D218): the slide sounds joined, earns nothing and breaks the legato chain.
 *   "connect": an instrument's own connection through the space between the two notes:
 *     - every sound that can bend (voices, synths, chips, Tomita, BLEEPS…): a PORTAMENTO, the pitch
 *       carried continuously from the old note to the new (FREE PLAY: following the thumb between the
 *       rows; a passage: a glide as long as the drag took, capped by a share of the note);
 *     - the keyboards (harpsichord, piano, organ), which cannot bend: an ORNAMENTAL FILL: across a third
 *       the passing note between (the tierce coulée), into a note from a fourth or more below (and,
 *       MECH.upThird "schleifer", a third) the Schleifer: two quick notes rising from a third below;
 *       a step: a plain joined note.
 *   In a passage "connect" counts as joined for the legato credit (the chain kept, not lengthened) and
 *   earns nothing more. Pure functions here (tested: test/d321-drag-sensor.test.ts); the engine's use:
 *   proto-game.ts slideTo/play/glideStep, lab/free.ts.
 */
import { hz } from "../touch/tuning.ts";
import { MECH } from "./mechanics.ts";

export type DragMeaning = "join" | "connect";
export type DragFamily = "glide" | "fill";

/** The keyboards: a struck or plucked string, a pipe: no pitch between the keys. */
export const KEYBOARDS: ReadonlySet<string> = new Set(["harpsichordSampled", "pianoSampled", "chamberOrgan", "organSampled"]);

/** How a sound connects two notes under a drag: a glide, or (a keyboard) an ornamental fill. */
export const dragFamily = (presetId: string): DragFamily => (KEYBOARDS.has(presetId) ? "fill" : "glide");

/** A glide never shorter than this (ms: below it a glide is a click) nor longer than this (ms). */
export const GLIDE_MIN_MS = 30;
export const GLIDE_MAX_MS = 800;

/**
 * A passage's glide: as long as the drag took (from the thumb leaving its note to its arrival), capped
 * by MECH.glideMaxShare of the arriving note's length (the note's own pitch must be heard).
 */
export function glideMs(dragMs: number, noteMs = Infinity): number {
  const cap = Math.min(GLIDE_MAX_MS, Number.isFinite(noteMs) ? Math.max(GLIDE_MIN_MS, noteMs * MECH.glideMaxShare) : GLIDE_MAX_MS);
  return Math.max(GLIDE_MIN_MS, Math.min(cap, dragMs));
}

/** The glide's time constant (ms): three of them its length (95% of the way), as setTargetAtTime would. */
export const glideTau = (ms: number): number => ms / 3;

/** Where a glide of `ms` from `from` to `to` (MIDI) is `elapsed` ms in: an exponential approach (setTargetAtTime's shape), normalised to arrive at `ms`. */
export function glideAt(from: number, to: number, elapsed: number, ms: number): number {
  if (elapsed <= 0) return from;
  if (elapsed >= ms) return to;
  const tau = glideTau(ms);
  const k = (1 - Math.exp(-elapsed / tau)) / (1 - Math.exp(-ms / tau));
  return from + (to - from) * k;
}

/**
 * A fractional MIDI number whose frequency (tuning.ts hz, in the temperament now) lies a share `f` of
 * the way from a's to b's on a log scale: hz() rounds to the key for its temperament offset, so a
 * plain linear MIDI would jump a few cents halfway; this does not.
 */
export function between(a: number, b: number, f: number): number {
  if (f <= 0) return a;
  if (f >= 1) return b;
  const target = Math.log2(hz(a)) * (1 - f) + Math.log2(hz(b)) * f;
  let m = a + (b - a) * f;
  for (let k = 0; k < 3; k++) m -= 12 * (Math.log2(hz(m)) - target);
  return m;
}

/**
 * FREE PLAY: the pitch at a fractional row position (0 the lowest row's middle, 1 the next…): each
 * row's middle ±snap a row holds its own pitch (so a thumb resting near a row plays it in tune), and
 * between those the pitch moves continuously (on a log scale) to the next row's.
 */
export function pitchAtRow(rows: readonly number[], pos: number, snap = 0.3): number {
  const p = Math.max(0, Math.min(rows.length - 1, pos));
  const i = Math.floor(p);
  const fr = p - i;
  if (i >= rows.length - 1) return rows[rows.length - 1];
  if (fr <= snap) return rows[i];
  if (fr >= 1 - snap) return rows[i + 1];
  return between(rows[i], rows[i + 1], (fr - snap) / (1 - 2 * snap));
}

/** The row a fractional position holds in tune (its snap zone), or null between two rows. */
export function snappedRow(rows: readonly number[], pos: number, snap = 0.3): number | null {
  const p = Math.max(0, Math.min(rows.length - 1, pos));
  const i = Math.round(p);
  return Math.abs(p - i) <= snap ? i : null;
}

// ---- The keyboards' fill ----

/** The key's scale as pitch classes: the signature's notes (natural minor), plus a minor key's raised leading note. */
export function keyScale(tonic: number, minor: boolean): Set<number> {
  const deg = minor ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11];
  return new Set(deg.map((d) => (tonic + d) % 12));
}
const pcOf = (m: number) => ((m % 12) + 12) % 12;
const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** A piece's key ("c" C minor, "Eb" E flat major, fugue.ts) as its scale. */
export function scaleOfKey(key: string): Set<number> {
  let pc = PC[key[0].toLowerCase()] ?? 0;
  if (key[1] === "#") pc++;
  if (key[1] === "b") pc--;
  return keyScale((pc + 12) % 12, key[0] === key[0].toLowerCase());
}

/** The scale step below a note (the nearest in-key pitch 1 or 2 semitones under it; 2 if neither is). */
export function stepBelow(m: number, scale: ReadonlySet<number>): number {
  // A whole step first unless only the half step is in the key (C below D, not C sharp; B below C).
  if (scale.has(pcOf(m - 2)) && !scale.has(pcOf(m - 1))) return m - 2;
  if (scale.has(pcOf(m - 1)) && !scale.has(pcOf(m - 2))) return m - 1;
  return m - 2;
}

/** The passing note between two notes a third apart: the in-key pitch between them, the nearer to the middle. */
export function passingNote(a: number, b: number, scale: ReadonlySet<number>): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mid = (lo + hi) / 2;
  const cands: number[] = [];
  for (let m = lo + 1; m < hi; m++) if (scale.has(pcOf(m))) cands.push(m);
  if (!cands.length) return Math.round(mid);
  return cands.sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid) || x - y)[0];
}

export type FillKind = "coule" | "schleifer" | "join";
export interface Fill {
  kind: FillKind;
  /** The notes sounded before the arrival, in order (MIDI). */
  notes: number[];
}

/**
 * What a keyboard plays dragged from `from` to `to`: a third (3 or 4 semitones) either way, the passing
 * note (coulé); a fourth or more up, the Schleifer (the third below the arrival, then the step below);
 * an ascending third with MECH.upThird "schleifer" the Schleifer too (its first note the one held,
 * struck again); a step, a repeat, a fall of a fourth or more: a plain joined note.
 */
export function dragFill(from: number, to: number, scale: ReadonlySet<number>, upThird: "coule" | "schleifer" = MECH.upThird): Fill {
  const d = to - from;
  const ad = Math.abs(d);
  if (ad <= 2) return { kind: "join", notes: [] };
  const step = stepBelow(to, scale);
  const schleifer = (): Fill => ({ kind: "schleifer", notes: [stepBelow(step, scale), step] });
  if (ad <= 4) return d > 0 && upThird === "schleifer" ? schleifer() : { kind: "coule", notes: [passingNote(from, to, scale)] };
  if (d > 0) return schleifer();
  return { kind: "join", notes: [] };
}

/**
 * The fill's timing: each note's length (ms) at the trill's speed (MECH.trillPerSecond), or with
 * MECH.fillTiming "drag" the drag's own time shared out (no faster than twice the trill's, no slower
 * than half); never so long that the fill takes more than half the arriving note.
 */
export function fillNoteMs(n: number, dragMs: number, noteMs = Infinity): number {
  if (n <= 0) return 0;
  const trill = 1000 / Math.max(1, MECH.trillPerSecond);
  let each = MECH.fillTiming === "drag" ? Math.max(trill / 2, Math.min(trill * 2, dragMs / n)) : trill;
  if (Number.isFinite(noteMs)) each = Math.min(each, (noteMs * 0.5) / n);
  return Math.max(25, each);
}

/** A drag's line for the lab: "DRAG: glide 380 ms (G4 → D5)", "DRAG: coulé (passing E4)", "DRAG: Schleifer (C4 D4 → E4)". */
export function dragLine(name: (m: number) => string, from: number, to: number, how: { glideMs?: number; fill?: Fill }): string {
  if (how.glideMs !== undefined) return `DRAG: glide ${Math.round(how.glideMs)} ms (${name(from)} → ${name(to)})`;
  const f = how.fill;
  if (!f || f.kind === "join") return `DRAG: joined (${name(from)} → ${name(to)}: ${Math.abs(to - from) <= 2 ? "a step" : "a fall"}, nothing to fill)`;
  if (f.kind === "coule") return `DRAG: coulé (passing ${name(f.notes[0])}) ${name(from)} → ${name(to)}`;
  return `DRAG: Schleifer (${f.notes.map(name).join(" ")} → ${name(to)})`;
}
