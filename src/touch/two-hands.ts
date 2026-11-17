/**
 * D862, TWO HANDS (a prototype, play.html?proto=hands): the owner's idea for the preludes, "some pieces treat left
 * and right thumbs as, respectively, left and right hands … requiring one to treat the two thumbs as independent".
 * The left thumb plays the left hand's line (the lower staff), the right thumb the right hand's (the upper staff),
 * at the same time, each judged on its own.
 *
 * A prelude is not strict, so here (and only here) the game may play some written notes for the player (D490
 * relaxed for these pieces, never for a fugue):
 *  · a hand's chord: the player strikes one note, the top of the right hand, the bottom of the left; and a note
 *    struck under the right hand's held top note (above the left hand's held bass) is the inner voice's, the
 *    game's. What is left is the hand's outer line, one note at a time ("skyline");
 *  · a hand's line quicker than HANDS_MAX_RATE notes a second at the tempo played: the player keeps the notes
 *    that carry the beat (the bar's first, the beat's, a long note, a turn of the contour, a phrase's first and
 *    last), the game plays the quick notes between them, so no two of the player's notes fall closer than
 *    1 / HANDS_MAX_RATE s.
 * Nothing is added: every note the game plays is a written note the player was not asked for. Pure.
 */
import type { TouchFugue, TouchNote } from "./fugue.ts";

export type Hand = "left" | "right";

/** The voices that are the two hands (the data's "Right hand" and "Left hand", an invention's two parts). */
export interface HandsSpec {
  rh: number;
  lh: number;
}

/**
 * The prototype's pieces (the measurements: D862). Each hand mostly a single line, at most about 3.5 notes a
 * second at the game's tempo (90th percentile over 4 s), so the two together stay near a fugue voice's load.
 */
export const TWO_HANDS: Record<string, HandsSpec> = {
  wtc1p13: { rh: 0, lh: 1 },
  wtc1p24: { rh: 0, lh: 1 },
  wtc2p08: { rh: 0, lh: 1 },
  wtc2p10: { rh: 0, lh: 1 },
  bwv772: { rh: 0, lh: 1 },
};
export const TWO_HANDS_IDS = Object.keys(TWO_HANDS);

/** The fastest a thumb is asked to play, notes a second (the fugues' ceiling, D312). */
export const HANDS_MAX_RATE = 5.5;

/** `play.html?proto=hands`: the prototype's list on the selection screen. */
export function handsFlag(search = typeof location !== "undefined" ? location.search : ""): boolean {
  return new URLSearchParams(search).get("proto") === "hands";
}

export const handsOf = (id: string): HandsSpec | null => TWO_HANDS[id] ?? null;

/**
 * A hand's outer line: at each onset the top note (right) or the bottom (left), and no note struck while a
 * note of the same hand already sounding lies further out (the inner voice under a held melody note, above a
 * held bass). The kept notes are shortened to the next kept onset, so one thumb holds one note at a time.
 */
export function skyline(notes: readonly TouchNote[], hand: Hand): { line: TouchNote[]; inner: TouchNote[] } {
  const out = (a: number, b: number) => (hand === "right" ? a > b : a < b);
  const sorted = [...notes].sort((a, b) => a[0] - b[0] || (hand === "right" ? b[2] - a[2] : a[2] - b[2]));
  const line: TouchNote[] = [];
  const inner: TouchNote[] = [];
  for (const n of sorted) {
    const [on, , midi] = n;
    // Outermost at its onset (sorted so: the first of an onset is the outermost).
    const sameOnset = line.length && line[line.length - 1][0] === on;
    // A note of the hand still sounding, further out than this one (a held melody note, a held bass).
    const covered = sorted.some((o) => o !== n && o[0] < on && o[0] + o[1] > on && out(o[2], midi));
    if (sameOnset || covered) inner.push(n);
    else line.push([...n] as TouchNote);
  }
  for (let i = 0; i + 1 < line.length; i++) line[i][1] = Math.min(line[i][1], line[i + 1][0] - line[i][0]);
  return { line, inner };
}

export interface Meter {
  /** The felt beat and the bar, in ticks. */
  beat: number;
  barTicks: number;
  /** Where in its bar a tick falls (ticks from the bar's start). */
  inBar: (tick: number) => number;
  /** Ticks a second at the tempo played. */
  tps: number;
}

/** How much a note carries the music: the bar's first beat most, then a beat, half a beat; length; a turn; a phrase's ends. */
export function weight(line: readonly TouchNote[], i: number, m: Meter): number {
  const [on, dur, midi] = line[i];
  const at = m.inBar(on);
  const prev = line[i - 1];
  const next = line[i + 1];
  let w = 0;
  if (at === 0) w += 8;
  else if (at % m.beat === 0) w += 6;
  else if ((2 * at) % m.beat === 0) w += 3;
  else if ((4 * at) % m.beat === 0) w += 1;
  // A long note: longer than the note before it (an arrival), or half a beat and more.
  const ioiIn = prev ? on - prev[0] : Infinity;
  const ioiOut = next ? next[0] - on : dur;
  if (ioiOut > ioiIn * 1.5) w += 3;
  if (dur >= m.beat / 2) w += 2;
  // A turn of the contour (a peak or a trough), and a leap's arrival.
  if (prev && next && Math.sign(midi - prev[2]) * Math.sign(next[2] - midi) < 0) w += 3;
  if (prev && Math.abs(midi - prev[2]) >= 5) w += 1;
  // A phrase's first note (after a gap) and its last (before one).
  if (!prev || on - (prev[0] + prev[1]) > 0) w += 4;
  if (!next || next[0] - (on + dur) > 0) w += 2;
  return w;
}

/**
 * Thins a hand's line to at most `rate` notes a second: in each stretch where notes come faster, the notes
 * carrying the most (weight) are kept first, each only if no kept note lies closer than 1/rate s; the rest are
 * the game's. A stretch at or under the rate is left whole.
 */
export function thin(line: readonly TouchNote[], m: Meter, rate = HANDS_MAX_RATE): { kept: TouchNote[]; given: TouchNote[] } {
  const gap = m.tps / rate;
  const eps = 1e-6 * m.tps;
  const n = line.length;
  // The stretches of quick notes: runs of onsets closer than the gap.
  const quick = new Array<boolean>(n).fill(false);
  for (let i = 0; i + 1 < n; i++) if (line[i + 1][0] - line[i][0] < gap - eps) quick[i] = quick[i + 1] = true;
  const keep = new Array<boolean>(n).fill(true);
  let i = 0;
  while (i < n) {
    if (!quick[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && line[j + 1][0] - line[j][0] < gap - eps) j++;
    // [i, j] is one quick stretch; its neighbours outside it are kept.
    const order = Array.from({ length: j - i + 1 }, (_, k) => i + k).sort((a, b) => weight(line, b, m) - weight(line, a, m) || a - b);
    const chosen: number[] = [];
    const before = i > 0 ? line[i - 1][0] : -Infinity;
    const after = j + 1 < n ? line[j + 1][0] : Infinity;
    for (const k of order) {
      const on = line[k][0];
      if (on - before < gap - eps || after - on < gap - eps) continue;
      if (chosen.some((c) => Math.abs(line[c][0] - on) < gap - eps)) continue;
      chosen.push(k);
    }
    for (let k = i; k <= j; k++) keep[k] = chosen.includes(k);
    i = j + 1;
  }
  const kept: TouchNote[] = [];
  const given: TouchNote[] = [];
  line.forEach((x, k) => (keep[k] ? kept : given).push(x));
  // The kept note sounds to the next kept onset or its own end (the game's quick notes sound over it).
  return { kept, given };
}

/** A hand's part: the player's notes, and the written notes the game plays for that hand. */
export function handPart(notes: readonly TouchNote[], hand: Hand, m: Meter, rate = HANDS_MAX_RATE): { mine: TouchNote[]; game: TouchNote[] } {
  const { line, inner } = skyline(notes, hand);
  const { kept, given } = thin(line, m, rate);
  return { mine: kept, game: [...inner, ...given].sort((a, b) => a[0] - b[0] || b[2] - a[2]) };
}

/** The meter of a piece at a tempo (quarter notes a minute). */
export function meterOf(f: TouchFugue, bpm: number, inBar: (tick: number) => number): Meter {
  const [num, den] = f.meter.split("/").map(Number);
  const unit = (f.tpq * 4) / den;
  const beat = num % 3 === 0 && num > 3 ? unit * 3 : unit;
  return { beat, barTicks: f.barTicks, inBar, tps: (f.tpq * bpm) / 60 };
}

/** The measure (D862's table): a hand's notes a second as written and as the player plays it, and its chord share. */
export function handLoad(f: TouchFugue, voice: number, hand: Hand, bpm: number, inBar: (tick: number) => number) {
  const m = meterOf(f, bpm, inBar);
  const notes = f.voices[voice];
  const onsets = new Set(notes.map((n) => n[0]));
  const chords = [...onsets].filter((on) => notes.filter((n) => n[0] === on).length > 1).length;
  const part = handPart(notes, hand, m);
  const secs = f.length / m.tps;
  return { written: onsets.size / secs, played: part.mine.length / secs, chordShare: chords / Math.max(1, onsets.size), mine: part.mine.length, game: part.game.length };
}
