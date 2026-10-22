/**
 * Judging one voice (D160; D166; D167). A note is played by a tap within a window around its onset
 * that fits it (the instrument says what fits: shape.ts, piano.ts); a long note (a quarter or more) wants the thumb
 * held: let go early and it stops sounding and scores half. Two levels (D166): EASY, the time only
 * (and with the Synth, the direction) on the main notes, the short notes riding along after a hit;
 * NORMAL, every note, each as the instrument wants it. A chord within a voice is struck whole. Pure: ticks in, states out.
 */
export type NoteState = "pending" | "hit" | "miss";

export type Level = "easy" | "normal";
export const LEVELS: Level[] = ["easy", "normal"];

export interface LaneNote {
  on: number;
  dur: number;
  midi: number;
  /** The note's staff step (letter and octave, 7 to the octave). */
  step: number;
  long: boolean;
  state: NoteState;
  /** Tick of the hit or the miss (for the shine and the shake). */
  at?: number;
  /** Tick the thumb let go of a hit note, if before its end. */
  off?: number;
  /** The voice. */
  voice?: number;
  /** EASY: a short note that plays by itself after a hit, and does not score (D166); the testbench: a note too quick to strike (D191 quickRides). */
  ride?: boolean;
  /** D198: held on after it was struck (its sustain scoring). */
  held?: boolean;
  /** The testbench (D175): played on time but with the wrong gesture. */
  wrong?: boolean;
  /** The Synth (shape.ts): the move from the note played before, up (1), down (-1) or a repeat (0), and its size band (-1: free). */
  dir?: number;
  size?: number;
}

export interface LaneOptions {
  /** How far around the onset a tap counts, in ticks. */
  early: number;
  late: number;
  /** Of a long note, the part that must be held for a full point. */
  hold: number;
}

export function options(tpq: number, bpm: number, level: Level): LaneOptions {
  const perMs = (tpq * bpm) / 60000;
  const ms = level === "easy" ? 250 : 200;
  return { early: ms * perMs, late: ms * perMs, hold: 0.6 };
}

export function laneNotes(notes: readonly (readonly [number, number, number, number])[], beat: number, voice: number): LaneNote[] {
  return notes.map(([on, dur, midi, step]) => ({ on, dur, midi, step, long: dur >= beat, state: "pending", voice }));
}

/**
 * EASY: a note shorter than half a beat rides along (D166) when a note the player taps comes no more
 * than a beat before it; a short note with none before it (the subject's head) is tapped. Notes struck
 * together ride or are tapped together (D168: a prelude's hand strikes a quick note with a long one).
 */
export function markRides(notes: LaneNote[], beat: number) {
  let last: number | null = null;
  const onsets = [...new Set(notes.map((n) => n.on))].sort((a, b) => a - b);
  for (const on of onsets) {
    const chord = notes.filter((n) => n.on === on);
    const ride = chord.every((n) => n.dur < beat / 2) && last !== null && on - last <= beat;
    for (const n of chord) n.ride = ride;
    if (!ride) last = on;
  }
}

/** D191: a note closer than this to the note struck before it cannot be struck on its own: it rides. */
export const RIDE_MS = 120;

/**
 * The testbench (D191): the notes too quick to strike ride after the note before them, as EASY's did
 * (markRides), whatever the level: a note whose onset follows the note before by less than `limit`
 * ms at the tempo played (`ms` measures between two ticks, so a faster tempo, or the final ritard
 * slowing it, changes which ride), and ornament-like figures (two or more notes of an eighth of a
 * beat or less, each over within 1.25 × `limit`, starting within half a beat of the end of a struck
 * note at least four times as long). Of two notes too close, the shorter rides: the quick note
 * before a longer one rides after its own predecessor and the longer note is struck (the note after
 * a snap is not given away). The first note is always struck. A chord rides or is struck whole.
 * Returns how many onsets ride.
 */
export function quickRides(notes: LaneNote[], beat: number, ms: (a: number, b: number) => number, limit = RIDE_MS): number {
  for (const n of notes) n.ride = false;
  const ons = [...new Set(notes.map((n) => n.on))].sort((a, b) => a - b);
  if (!ons.length) return 0;
  const len = new Map<number, number>();
  for (const n of notes) len.set(n.on, Math.max(len.get(n.on) ?? 0, n.dur));
  const dur = (on: number) => len.get(on) ?? 0;
  const ride = new Set<number>();
  const tiny = (k: number) => k >= 0 && k < ons.length && dur(ons[k]) <= beat / 8 && ms(ons[k], ons[k] + dur(ons[k])) < limit * 1.25;
  // The last onset struck, and the one struck before it.
  let last = ons[0];
  let before: number | null = null;
  const strikeAt = (on: number) => {
    before = last;
    last = on;
  };
  for (let k = 1; k < ons.length; k++) {
    const on = ons[k];
    const prev = ons[k - 1];
    const d = dur(on);
    const ornament = tiny(k) && (tiny(k + 1) || ride.has(prev)) && d * 4 <= dur(last) && on - (last + dur(last)) < beat / 2;
    if (!ornament) {
      if (ms(prev, on) >= limit) {
        // Far enough from the note before (and so from the one struck).
        strikeAt(on);
        continue;
      } else if (!ride.has(prev) && prev !== ons[0] && dur(prev) < d && before !== null && ms(before, on) >= limit) {
        // A snap: the quick note before rides after its own predecessor; this longer one is struck.
        ride.add(prev);
        last = on;
        continue;
      } else if (ride.has(prev) && dur(prev) < d && ms(last, on) >= limit) {
        // Landing after a quick figure.
        strikeAt(on);
        continue;
      }
    }
    ride.add(on);
  }
  for (const n of notes) n.ride = ride.has(n.on);
  return ride.size;
}

/** The notes struck together with note i (D165: the final chords put two notes in one voice). */
export function chordOf(notes: readonly LaneNote[], i: number): number[] {
  const out: number[] = [];
  notes.forEach((n, j) => n.on === notes[i].on && out.push(j));
  return out;
}

/**
 * A tap at tick t. Returns the index of the note it plays, or -1: the pending scoring note nearest in
 * time within the window that `ok` accepts. A chord is struck whole.
 */
export function strike(notes: LaneNote[], t: number, o: LaneOptions, ok: (i: number) => boolean = () => true): number {
  let best = -1;
  let bestCost = Infinity;
  notes.forEach((n, i) => {
    if (n.state !== "pending" || n.ride || t < n.on - o.early || t > n.on + o.late || !ok(i)) return;
    const cost = Math.abs(t - n.on);
    if (cost < bestCost) (best = i), (bestCost = cost);
  });
  if (best >= 0) for (const j of chordOf(notes, best)) if (notes[j].state === "pending") Object.assign(notes[j], { state: "hit", at: t });
  return best;
}

/** The thumb leaves a note it was playing at tick t. */
export function release(notes: LaneNote[], i: number, t: number) {
  const n = notes[i];
  if (n && n.state === "hit" && t < n.on + n.dur && n.off === undefined) n.off = t;
}

/** Scoring notes whose window has passed unplayed become misses. Returns how many. */
export function sweep(notes: LaneNote[], now: number, o: LaneOptions): number {
  let missed = 0;
  for (const n of notes)
    if (n.state === "pending" && !n.ride && now > n.on + o.late) {
      Object.assign(n, { state: "miss", at: now });
      missed++;
    }
  return missed;
}

/** A long note held long enough. */
export function heldEnough(n: LaneNote, o: LaneOptions): boolean {
  return !n.long || n.off === undefined || n.off - n.on >= o.hold * n.dur;
}

/** Points: a note hit is one, a long note let go too early a half; riding notes do not count. */
export function points(notes: readonly LaneNote[], o: LaneOptions): { got: number; of: number } {
  let got = 0;
  let of = 0;
  for (const n of notes) {
    if (n.ride) continue;
    of++;
    if (n.state === "hit") got += heldEnough(n, o) ? 1 : 0.5;
  }
  return { got, of };
}
