/**
 * FINGERING (D181; D191): a fingering for the two thumbs, written for each voice as a player would
 * write it, and the articulation with it; the subject's entries are the bosses, with more to get right.
 *   The thumbs: a quick note (joined, and quicker than half a beat after the note before, whatever
 *   the interval: a run, a broken chord) changes thumb, so that no thumb strikes twice in quick
 *   succession and each note can be struck while the one before is still held; so does a repeated
 *   note and every legato note; elsewhere the thumb follows the line (the right going up, the left
 *   going down).
 *   The articulation (D191, after the music audit: legato had been two notes in three):
 *   TENUTO on a long note (a beat and a half or more; held most of it), before anything else;
 *   LEGATO in a stepwise run of short notes (seconds, not thirds; notes under half a beat; three notes
 *   at least) and on the resolution of a suspension or a sigh (a held note, dissonant with another
 *   voice, falling a step): struck while the note before still sounds;
 *   STACCATO on a short repeated note or a short note before a rest (let go within STACCATO_SHARE of
 *   it), but never on the long note of a dotted figure (long-short: it is held, the short note crisp);
 *   otherwise free.
 *   Notes that ride (lanes.ts quickRides: too quick to strike) are passed over: never struck, free.
 *   The bosses: each entry of the subject in the voice is a SUB BOSS: its highest and lowest notes
 *   also want a height (the upper or lower half of the bar); the voice's last entry is the BOSS: its
 *   first and highest notes also want forte (the bar's outer half), its last note piano (the inner).
 * A first draft by rule, to be bettered by hand piece by piece.
 */
import type { TouchEntry } from "../touch/fugue.ts";
import type { LaneNote } from "../touch/lanes.ts";
import type { Side } from "../touch/thumbs.ts";
import type { Move } from "./protos.ts";

export type Art = "legato" | "staccato" | "tenuto" | "free";

export interface Finger {
  hand: Side;
  art: Art;
  /** The bosses' extra demands. */
  height?: "high" | "low";
  dyn?: "f" | "p";
  boss?: "sub" | "boss";
}

/** STACCATO: let go within this share of the note's written length. */
export const STACCATO_SHARE = 0.6;
/** TENUTO: held at least this share. */
export const TENUTO_SHARE = 0.7;

/** The other voices' notes, as the pieces give them: [on, dur, midi, step]. */
export type VoiceNotes = readonly (readonly [number, number, number, number])[];

/** The pitches of the other voices sounding at a tick. */
function soundingAt(others: readonly VoiceNotes[]): (t: number) => number[] {
  const all = others.flat().slice().sort((a, b) => a[0] - b[0]);
  const longest = all.reduce((m, x) => Math.max(m, x[1]), 0);
  return (t) => {
    // The first note starting after t, then back over those that may still sound.
    let lo = 0;
    let hi = all.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (all[mid][0] <= t) lo = mid + 1;
      else hi = mid;
    }
    const out: number[] = [];
    for (let j = lo - 1; j >= 0 && all[j][0] > t - longest; j--) if (all[j][0] + all[j][1] > t) out.push(all[j][2]);
    return out;
  };
}

/** A note dissonant with what sounds against it: a second, a seventh or a tritone; a fourth above the bass. */
export function dissonant(midi: number, against: readonly number[]): boolean {
  const bass = Math.min(midi, ...against);
  return against.some((o) => {
    const ic = Math.abs(midi - o) % 12;
    return ic === 1 || ic === 2 || ic === 6 || ic === 10 || ic === 11 || (ic === 5 && Math.min(midi, o) === bass);
  });
}

export function fingering(notes: LaneNote[], moves: Move[], entries: TouchEntry[], beat: number, others: readonly VoiceNotes[] = []): Finger[] {
  const out: Finger[] = [];
  const heads = notes.map((n, i) => !(i > 0 && notes[i - 1].on === n.on));
  // The notes struck (a chord by its first note; the riding notes passed over).
  const struck = notes.map((n, i) => (heads[i] && !n.ride ? i : -1)).filter((i) => i >= 0);
  const sounding = soundingAt(others);
  const short = (n: LaneNote) => n.dur < beat / 2;
  const isStep = (k: number) => k > 0 && moves[struck[k]].joined && moves[struck[k]].size === 1 && short(notes[struck[k - 1]]) && short(notes[struck[k]]);
  const art: Art[] = struck.map((i, k) => {
    const n = notes[i];
    if (n.dur >= beat * 1.5) return "tenuto";
    const m = moves[i];
    const prev = k > 0 ? notes[struck[k - 1]] : null;
    // A stepwise run of short notes: this step, and another before or after it.
    if (isStep(k) && (isStep(k - 1) || (k + 1 < struck.length && isStep(k + 1)))) return "legato";
    // A suspension or a sigh resolving: a held note dissonant with another voice, falling a step.
    if (prev && m.joined && m.steps === -1 && prev.dur >= beat / 2 && dissonant(prev.midi, sounding(n.on - 1))) return "legato";
    const next = notes.slice(i + 1).find((x) => x.on > n.on);
    const dotted = !!next && next.on === n.on + n.dur && next.dur * 3 <= n.dur;
    if (n.dur < beat && !dotted && next && (next.midi === n.midi || next.on - (n.on + n.dur) >= beat / 2)) return "staccato";
    return "free";
  });
  const hands: Side[] = [];
  let prevHand: Side = "right";
  struck.forEach((i, k) => {
    const n = notes[i];
    const m = moves[i];
    const prev = k > 0 ? notes[struck[k - 1]] : null;
    // A quick note, whatever its interval, a repeat, or a legato note: the other thumb.
    const quick = !!prev && m.joined && n.on - prev.on < beat / 2;
    let hand: Side;
    if (m.size < 0) hand = m.dir >= 0 ? "right" : "left";
    else if (quick || art[k] === "legato" || m.dir === 0) hand = prevHand === "left" ? "right" : "left";
    else hand = m.dir > 0 ? "right" : "left";
    hands.push(hand);
    prevHand = hand;
  });
  let k = -1;
  let hand: Side = "right";
  notes.forEach((n, i) => {
    if (!heads[i]) {
      out.push({ ...out[i - 1] });
      return;
    }
    if (n.ride) {
      out.push({ hand, art: "free" });
      return;
    }
    k++;
    hand = hands[k];
    out.push({ hand, art: art[k] });
  });
  // The bosses.
  const voice = notes[0]?.voice;
  const mine = entries.filter((e) => e.voice === voice);
  mine.forEach((e, k) => {
    const ons = new Set(e.notes.map((x) => x[0]));
    const idx = notes.map((n, i) => (heads[i] && !n.ride && ons.has(n.on) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return;
    const boss = k === mine.length - 1 ? "boss" : "sub";
    const steps = idx.map((i) => notes[i].step);
    const hi = Math.max(...steps);
    const lo = Math.min(...steps);
    for (const i of idx) {
      const f = out[i];
      f.boss = boss;
      if (hi > lo && notes[i].step === hi) f.height = "high";
      if (hi > lo && notes[i].step === lo) f.height = "low";
      if (boss === "boss") {
        if (i === idx[0] || notes[i].step === hi) f.dyn = "f";
        if (i === idx[idx.length - 1]) f.dyn = "p";
      }
    }
  });
  return out;
}
