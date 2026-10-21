/**
 * One voice on lanes (D160). Each pitch the voice sings in the passage has a lane, lowest at the
 * bottom, the same ladder in the music box and under the thumbs. A note is played by an event: a
 * thumb landing in its lane (a tap: detached, staccato) or sliding into it from the next lane (a
 * slur), within a window around its onset; easy mode forgives a lane either side. A long note (a
 * quarter or more) wants the thumb held: let go early and it stops sounding and scores half.
 * Pure: ticks in, states out.
 */
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

export function easyLanes(tpq: number, bpm: number): LaneOptions {
  const perMs = (tpq * bpm) / 60000;
  return { early: 150 * perMs, late: 150 * perMs, reach: 1, hold: 0.6 };
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
 * the pending note nearest in time within the window and within reach, the exact lane first.
 */
export function strike(notes: LaneNote[], lane: number, t: number, o: LaneOptions): number {
  let best = -1;
  let bestCost = Infinity;
  notes.forEach((n, i) => {
    if (n.state !== "pending" || t < n.on - o.early || t > n.on + o.late) return;
    const d = Math.abs(n.lane - lane);
    if (d > o.reach) return;
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
