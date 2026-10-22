/**
 * FINGERING (D181): a fingering for the two thumbs, written for each voice as a player would write it,
 * and the articulation with it; the subject's entries are the bosses, with more to get right.
 *   The thumbs: a legato run (steps, joined, quicker than a beat) alternates them, so that each note
 *   can be struck while the one before is still held; elsewhere the thumb follows the line (the
 *   right going up, the left going down); a repeated note changes thumb.
 *   The articulation: LEGATO in those runs (struck while the note before still sounds); STACCATO on a
 *   short repeated note or a short note before a rest (let go within STACCATO_SHARE of it); TENUTO on a
 *   long note (held most of it); otherwise free.
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

export function fingering(notes: LaneNote[], moves: Move[], entries: TouchEntry[], beat: number): Finger[] {
  const out: Finger[] = [];
  const heads = notes.map((n, i) => !(i > 0 && notes[i - 1].on === n.on));
  let prevHand: Side = "right";
  let prevIdx = -1;
  notes.forEach((n, i) => {
    if (!heads[i]) {
      out.push({ ...out[i - 1] });
      return;
    }
    const m = moves[i];
    const prev = prevIdx >= 0 ? notes[prevIdx] : null;
    const next = notes.slice(i + 1).find((x) => x.on > n.on);
    const legato = !!prev && m.joined && m.size >= 1 && m.size <= 2 && prev.dur < beat && n.dur < beat * 2;
    let hand: Side;
    if (m.size < 0) hand = m.dir >= 0 ? "right" : "left";
    else if (legato || m.dir === 0) hand = prevHand === "left" ? "right" : "left";
    else hand = m.dir > 0 ? "right" : "left";
    let art: Art = "free";
    if (legato) art = "legato";
    else if (n.dur >= beat * 1.5) art = "tenuto";
    else if (n.dur < beat && ((next && next.midi === n.midi) || (next && next.on - (n.on + n.dur) >= beat / 2))) art = "staccato";
    out.push({ hand, art });
    prevHand = hand;
    prevIdx = i;
  });
  // The bosses.
  const voice = notes[0]?.voice;
  const mine = entries.filter((e) => e.voice === voice);
  mine.forEach((e, k) => {
    const ons = new Set(e.notes.map((x) => x[0]));
    const idx = notes.map((n, i) => (heads[i] && ons.has(n.on) ? i : -1)).filter((i) => i >= 0);
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

/** The sections the bosses span, for the box: from the entry's start to its end. */
export function bossSections(entries: TouchEntry[], voice: number): { from: number; to: number; kind: "sub" | "boss" }[] {
  const mine = entries.filter((e) => e.voice === voice);
  return mine.map((e, k) => ({ from: e.on, to: e.end, kind: k === mine.length - 1 ? "boss" : "sub" }));
}
