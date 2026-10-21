/**
 * One voice on lanes (D160). Each pitch the voice sings in the passage has a lane, lowest at the
 * bottom, the same ladder in the music box and under the thumbs. A note is played by an event: a
 * thumb landing in its lane (a tap: detached, staccato) or sliding into it from the next lane (a
 * slur), within a window around its onset. A long note (a quarter or more) wants the thumb held:
 * let go early and it stops sounding and scores half. Three levels (D161), each asking more of the
 * same gesture: RHYTHM (the time only: any lane plays the right note), SHAPE (the direction too:
 * higher, lower or the same as the last), NOTES (the lane itself, a lane either side forgiven).
 * D162: SHAPE has no lanes. A touch is judged by how far it lies above or below the player's own
 * previous one (the anchor), as a share of the play area's height, with overlapping zones: a step
 * wants a little movement the right way, a repeat wants the thumb roughly where it was, and
 * between the two either will do. Only a clear move the wrong way fails.
 * Pure: ticks in, states out.
 */
export type Level = "rhythm" | "shape" | "notes";
export const LEVELS: Level[] = ["rhythm", "shape", "notes"];
export type NoteState = "pending" | "hit" | "miss";

export interface LaneNote {
  on: number;
  dur: number;
  midi: number;
  lane: number;
  long: boolean;
  state: NoteState;
  /** Tick of the hit or the miss (for the shine and the shake). */
  at?: number;
  /** Tick the thumb let go of a hit note (or slid on), if before its end. */
  off?: number;
  /** The voice, and the row in the music box when several voices share it (engine.ts). */
  voice?: number;
  row?: number;
}

export interface LaneOptions {
  /** How far around the onset an event counts, in ticks. */
  early: number;
  late: number;
  /** Lanes of tolerance either side. */
  reach: number;
  /** Of a long note, the part that must be held for a full point. */
  hold: number;
}

export function easyLanes(tpq: number, bpm: number, level: Level = "notes"): LaneOptions {
  const perMs = (tpq * bpm) / 60000;
  const ms = level === "notes" ? 170 : 200;
  return { early: ms * perMs, late: ms * perMs, reach: 1, hold: 0.6 };
}

/** SHAPE's zones, as shares of the play area's height: a move counts from MOVE on; a repeat holds within SAME. */
export const MOVE = 0.025;
export const SAME = 0.09;
/** A held thumb that slides this far from its anchor plays the next note (a slur). */
export const SLIDE = 0.03;

/** Near the top or bottom of the play area (a share of its height), a step that has no room counts anyway. */
export const EDGE = 0.12;

/**
 * SHAPE: whether a touch `dy` above the anchor (negative: below; null: no anchor yet) fits the way
 * the line moves (`want`; null for the first note). With the anchor at an edge (`anchor`, 0 at the
 * top), a step towards that edge only needs not to move clearly away.
 */
export function shapeFits(want: -1 | 0 | 1 | null, dy: number | null, anchor: number | null = null): boolean {
  if (want === null || dy === null) return true;
  if (want === 0) return Math.abs(dy) <= SAME;
  const cornered = anchor !== null && (want === 1 ? anchor < EDGE : anchor > 1 - EDGE);
  return dy * want >= (cornered ? -SAME : MOVE);
}

/** The way the line moves into note i: 1 up, -1 down, 0 the same (the first note: null, anything goes). */
export function stepInto(notes: readonly LaneNote[], i: number): -1 | 0 | 1 | null {
  return i === 0 ? null : (Math.sign(notes[i].lane - notes[i - 1].lane) as -1 | 0 | 1);
}

/**
 * What a player's event must match, by level: `lane` where the thumb is (NOTES), `dy` how far above
 * the anchor (SHAPE; null for the first).
 */
export function fits(level: Level, notes: readonly LaneNote[], i: number, lane: number, dy: number | null, o: LaneOptions, anchor: number | null = null): boolean {
  if (level === "rhythm") return true;
  if (level === "notes") return Math.abs(notes[i].lane - lane) <= o.reach;
  return shapeFits(stepInto(notes, i), dy, anchor);
}

/** The lanes: every pitch of the notes, low to high. */
export function lanePitches(notes: readonly (readonly [number, number, number, ...unknown[]])[]): number[] {
  return [...new Set(notes.map((n) => n[2]))].sort((a, b) => a - b);
}

export function laneNotes(notes: readonly (readonly [number, number, number, ...unknown[]])[], pitches: number[], tpq: number): LaneNote[] {
  return notes.map(([on, dur, midi]) => ({ on, dur, midi, lane: pitches.indexOf(midi), long: dur >= tpq, state: "pending" }));
}

/** The lane under a thumb at height y in an area h high (0 at the top), of n lanes, lowest at the bottom. */
export function laneAt(y: number, h: number, n: number): number {
  const f = Math.min(0.9999, Math.max(0, y / Math.max(1, h)));
  return n - 1 - Math.floor(f * n);
}

/**
 * A thumb lands in (or slides into) `lane` at tick t. Returns the index of the note it plays, or -1:
 * the pending note nearest in time within the window that the event fits (fits(); by default the
 * lane, within reach), the exact lane first.
 */
export function strike(notes: LaneNote[], lane: number, t: number, o: LaneOptions, ok: (i: number) => boolean = (i) => Math.abs(notes[i].lane - lane) <= o.reach): number {
  let best = -1;
  let bestCost = Infinity;
  notes.forEach((n, i) => {
    if (n.state !== "pending" || t < n.on - o.early || t > n.on + o.late) return;
    if (!ok(i)) return;
    const d = Math.min(Math.abs(n.lane - lane), o.reach + 1);
    const cost = Math.abs(t - n.on) + d * o.late;
    if (cost < bestCost) (best = i), (bestCost = cost);
  });
  if (best >= 0) Object.assign(notes[best], { state: "hit", at: t });
  return best;
}

/** The thumb leaves a note it was playing (lifted, or slid on) at tick t. */
export function release(notes: LaneNote[], i: number, t: number) {
  const n = notes[i];
  if (n && n.state === "hit" && t < n.on + n.dur && n.off === undefined) n.off = t;
}

/** Notes whose window has passed unplayed become misses. */
export function sweep(notes: LaneNote[], now: number, o: LaneOptions) {
  for (const n of notes) if (n.state === "pending" && now > n.on + o.late) Object.assign(n, { state: "miss", at: now });
}

/** A long note held long enough. */
export function heldEnough(n: LaneNote, o: LaneOptions): boolean {
  return !n.long || n.off === undefined || n.off - n.on >= o.hold * n.dur;
}

/** Points: a note hit is one, a long note let go too early a half. */
export function points(notes: readonly LaneNote[], o: LaneOptions): { got: number; of: number } {
  let got = 0;
  for (const n of notes) if (n.state === "hit") got += heldEnough(n, o) ? 1 : 0.5;
  return { got, of: notes.length };
}
