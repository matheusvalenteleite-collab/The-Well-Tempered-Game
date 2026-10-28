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
  /** D290: how a hit note was taken (a new touch, or a held thumb sliding on), for the report. */
  via?: "touch" | "slide";
  /** Tick the thumb let go of a hit note, if before its end. */
  off?: number;
  /** D374: tick the thumb first let go of a hit note, before or after its end (drawing only: the played shape). */
  up?: number;
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
  /**
   * D290: each note's window no wider than halfway to its neighbours' onsets (never under `floor`
   * ticks), so a touch cannot take a note that is not the nearest one in time: in running notes a
   * ±250 ms window spans two notes, and an early or extra contact took the next note, its own touch
   * then striking nothing.
   */
  split?: boolean;
  floor?: number;
  /**
   * D325b: an agogic delay (a strong beat, a dissonance): how far late (ticks) the note at this onset
   * may still be taken, past the halfway split (never so far that the next note keeps less than `floor`
   * early); the next note's early window gives way by as much.
   */
  lean?: (on: number) => number;
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

/** D229: in a prelude (stage 1, a little easier than its fugue) notes closer than this to the note struck before ride (about 6 a second). */
export const PRELUDE_RIDE_MS = 170;

/**
 * D229, a prelude's riders, more generous than a fugue's (D191): the player strikes the strong notes
 * and the quick ones between ride. First the fugues' riders (quickRides: the ornaments, the notes no
 * thumb can strike), except on the strong places; then a grid of strong places, the finest subdivision of the beat (by `split`
 * first, 3 in a compound metre, then by halves) whose points sound at least `limit` ms apart at the
 * tempo played: a note off that grid rides if it comes less than `limit` after the note struck before
 * it; a note on it is struck. Last, of two struck notes still closer than `limit`, the earlier (off
 * the grid) rides. The first note is always struck; a chord rides or is struck whole. `pos` is a
 * tick's place in its bar (fugue.ts inBar). Returns how many onsets ride. D250: `limit` may vary through
 * the piece (a prelude's arc: arc.ts), a function of the tick.
 */
export function preludeRides(notes: LaneNote[], beat: number, ms: (a: number, b: number) => number, pos: (tick: number) => number, split: 2 | 3, limitAt: number | ((tick: number) => number) = PRELUDE_RIDE_MS): number {
  const lim = (on: number) => (typeof limitAt === "number" ? limitAt : limitAt(on));
  quickRides(notes, beat, ms);
  const ons = [...new Set(notes.map((n) => n.on))].sort((a, b) => a - b);
  if (ons.length < 2) return 0;
  const ride = new Set(notes.filter((n) => n.ride).map((n) => n.on));
  const grid = (on: number) => {
    let g = beat;
    for (;;) {
      const next = g === beat ? beat / split : g / 2;
      if (!Number.isInteger(next) || next < 1 || ms(on, on + next) < lim(on)) return g;
      g = next;
    }
  };
  const strong = (on: number) => pos(on) % grid(on) === 0;
  let last = ons[0];
  ride.delete(last);
  for (let k = 1; k < ons.length; k++) {
    const on = ons[k];
    // A strong note is struck (even where a fugue's rule, in an unbroken stream, would let it ride).
    if (strong(on)) (ride.delete(on), (last = on));
    else if (ride.has(on)) continue;
    else if (ms(last, on) < lim(on)) ride.add(on);
    else last = on;
  }
  // Two struck notes still too close (an off-grid note struck just before a strong one): the earlier rides.
  const struck = ons.filter((on) => !ride.has(on));
  for (let k = 1; k + 1 < struck.length; k++) if (ms(struck[k], struck[k + 1]) < lim(struck[k + 1]) && !strong(struck[k])) ride.add(struck[k]);
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
const onsetsMemo = new WeakMap<LaneNote[], number[]>();
/** D290: the onsets a player strikes (riders not), in order. */
function struckOnsets(notes: LaneNote[]): number[] {
  let xs = onsetsMemo.get(notes);
  if (!xs) onsetsMemo.set(notes, (xs = [...new Set(notes.filter((n) => !n.ride).map((n) => n.on))].sort((a, b) => a - b)));
  return xs;
}
/** A note's window: the options', or (D290, split) no wider than halfway to its neighbours. */
export function windowOf(notes: LaneNote[], n: LaneNote, o: LaneOptions): { early: number; late: number } {
  if (!o.split) return { early: o.early, late: o.late };
  const xs = struckOnsets(notes);
  let lo = 0;
  let hi = xs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < n.on) lo = mid + 1;
    else hi = mid;
  }
  const floor = o.floor ?? 0;
  const prev = lo > 0 ? xs[lo - 1] : undefined;
  const next = xs[lo] === n.on ? xs[lo + 1] : xs[lo];
  // D325b: a note's late side: halfway to the next, or as far as its lean asks (the next keeping its floor).
  const lateOf = (on: number, nx: number) => Math.max(floor, Math.min(o.late, Math.max((nx - on) / 2, Math.min(o.lean?.(on) ?? 0, nx - on - floor))));
  return {
    early: prev === undefined ? o.early : Math.max(floor, Math.min(o.early, (n.on - prev) / 2, n.on - prev - lateOf(prev, n.on))),
    late: next === undefined ? o.late : lateOf(n.on, next),
  };
}

export function strike(notes: LaneNote[], t: number, o: LaneOptions, ok: (i: number) => boolean = () => true): number {
  let best = -1;
  let bestCost = Infinity;
  notes.forEach((n, i) => {
    if (n.state !== "pending" || n.ride) return;
    const w = windowOf(notes, n, o);
    if (t < n.on - w.early || t > n.on + w.late || !ok(i)) return;
    const cost = Math.abs(t - n.on);
    if (cost < bestCost) (best = i), (bestCost = cost);
  });
  if (best >= 0) for (const j of chordOf(notes, best)) if (notes[j].state === "pending") Object.assign(notes[j], { state: "hit", at: t });
  return best;
}

/**
 * D331: a touch on the halfway line's near side of a note already struck goes to the next note (if it has
 * not come yet, within the full early window, and at least `minAfter` ticks after that strike): the owner's
 * thumb landing for G 134 ms early between quavers was a STRAY, and G was lost. The caller rules out a
 * rolling thumb's re-contact first.
 */
export function strikeNext(notes: LaneNote[], t: number, o: LaneOptions, minAfter: number, ok: (i: number) => boolean = () => true): number {
  if (!o.split) return -1;
  let best = -1;
  const xs = struckOnsets(notes);
  for (let k = 0; k + 1 < xs.length && best < 0; k++) {
    const prev = xs[k], on = xs[k + 1];
    if (t <= prev || t >= on || t < on - o.early) continue;
    if (!notes.some((n) => n.on === prev && n.state === "hit" && n.at !== undefined && t - n.at >= Math.max(minAfter, (on - prev) / 4))) continue;
    notes.forEach((n, i) => {
      if (best < 0 && n.on === on && n.state === "pending" && !n.ride && ok(i)) best = i;
    });
  }
  if (best >= 0) for (const j of chordOf(notes, best)) if (notes[j].state === "pending") Object.assign(notes[j], { state: "hit", at: t });
  return best;
}

/** The thumb leaves a note it was playing at tick t. */
export function release(notes: LaneNote[], i: number, t: number) {
  const n = notes[i];
  if (n && n.state === "hit" && t < n.on + n.dur && n.off === undefined) n.off = t;
  if (n && n.state === "hit" && n.up === undefined) n.up = t;
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
