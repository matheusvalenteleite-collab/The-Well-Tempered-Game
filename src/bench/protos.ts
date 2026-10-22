/**
 * The testbench's prototypes (D175-D178; D179). The game supplies Bach's pitch; the touch gives the
 * time and the place. A wrong place sounds what it asked for, muffled (the PIANO's wrong key, plain).
 * A note lasts while its thumb is down; a tap while the other thumb holds is joined (legato); a held
 * thumb slid onto the next note's place plays it, glided; a thumb flicked upwards as it lets go sends
 * the note off with a swoosh. Each prototype has a dynamic axis, pp to ff, also while a note sounds
 * (a swell, a diminuendo).
 *   LADDER: sideways, the music box between two side bars; the bars' heights are the box's rows (the
 *     voice's range filling the box), so a note is touched at the height it is drawn, either bar; a
 *     glow runs from the coming note across to the bars. Across a bar: the middle mf, towards the
 *     phone's edge forte, towards the box piano.
 *   FINGERING (D181): the same screen; each note its thumb and its articulation, the subject's entries
 *     bosses with more to get right (fingering.ts).
 *   TWO VOICES: the same screen; two voices chosen (1P, 2P), one to each bar; the time only.
 *   SIDEWAYS: upright, the whole screen: the tune across the width, higher to the right, in columns
 *     of a window following the passage; a note is touched in its column anywhere up or down the
 *     screen; height is the dynamic. LEGATO (the hard level): every note joined to the one before
 *     (struck while that one is still held, or slid into), the thumbs crossing.
 *   PIANO: sideways, the keyboard of D172; the key exactly.
 * Pure: moves and gestures in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";
import type { Play } from "../touch/chip.ts";
import { markShapes } from "../touch/shape.ts";
import type { Side } from "../touch/thumbs.ts";

export type ProtoId = "ladder" | "fingering" | "duo" | "sideways" | "piano";

/** A note's move from the note before it. */
export interface Move {
  /** Up 1, down -1, a repeat 0 (and the first note). */
  dir: number;
  /** 0 a repeat, 1 a step, 2 a third, 3 a leap (a fourth or more); -1 the first note. */
  size: number;
  /** The move in staff steps (signed). */
  steps: number;
  /** Joined to the note before in the score (no rest between). */
  joined: boolean;
}

export interface Options {
  /** SIDEWAYS: every note joined to the one before (the hard level). */
  legato: boolean;
}

export interface Proto {
  id: ProtoId;
  name: string;
  /** One line under the name. */
  how: string;
  /** How the screen is held: the box between two side bars (sideways), the whole screen a field (upright), the box over a keyboard (sideways). */
  layout: "bars" | "full" | "wide";
}

export const PROTOS: Proto[] = [
  {
    id: "ladder",
    name: "LADDER",
    how: "Sideways. Touch either bar near the height your note is drawn in the box (the glow shows it), higher than your last touch when the tune goes up, lower when it goes down: the way matters more than the spot. A run is a slide up or down the bar. Across a bar: the middle mf, out to the phone's edge forte, in towards the box piano; slide across while a note sounds to swell or fade.",
    layout: "bars",
  },
  {
    id: "fingering",
    name: "FINGERING",
    how: "Sideways. Each note has its thumb (L or R in the box) and its articulation: LEGATO (strike it while the note before still sounds), STACCATO (let go quickly), TENUTO (hold it). The subject's entries are bosses: a SUB BOSS also wants some notes high or low in the bar; the BOSS also wants forte (out) or piano (in).",
    layout: "bars",
  },
  {
    id: "duo",
    name: "TWO VOICES",
    how: "Sideways. Choose two voices, 1P and 2P: the left bar plays the first, the right bar the second. Only the time counts. Across a bar: the middle mf, out forte, in piano; slide across while a note sounds to swell or fade; flick up as you let go for a swoosh.",
    layout: "bars",
  },
  {
    id: "sideways",
    name: "SIDEWAYS",
    how: "Upright, the whole screen. The tune runs across: higher notes to the right. Touch each note in its column as it lands (one off counts), anywhere up or down: higher is louder. Cross your thumbs on a run, or slide across. LEGATO (⚙): every note joined to the one before.",
    layout: "full",
  },
  {
    id: "piano",
    name: "PIANO",
    how: "Sideways. The voice's whole range; the notes fall onto their keys. The key exactly; a wrong key is heard. On a computer: A W S E D F T G Y H U J K O L P are the keys, Z and X the octave; or a MIDI keyboard.",
    layout: "wide",
  },
];

export const protoById = (id: string) => PROTOS.find((p) => p.id === id) ?? PROTOS[0];

/** LADDER (D181): how many rows either side of where a note is drawn still reach it. */
export const LADDER_AREA = 3.5;

/** The bars' share of the width (each). */
export const BAR = 0.2;

/** A dynamic, 0 (pp) to 1 (ff), as touch shaping: louder, brighter, a firmer attack towards ff. */
export function dynamic(d: number): Play {
  const x = Math.max(0, Math.min(1, d));
  const level = x < 0.5 ? 0.42 + (x / 0.5) * 0.58 : 1 + ((x - 0.5) / 0.5) * 0.65;
  return { level, bright: -0.7 + 1.3 * x, soft: x < 0.3 ? (0.3 - x) * 2 : 0, accent: x > 0.75 ? (x - 0.75) * 2.4 : 0 };
}

/** The level a dynamic gives (for a swell while a note sounds). */
export const levelOf = (d: number) => dynamic(d).level ?? 1;

/** The bars: across a bar, from the box's edge (pp) to the phone's edge (ff). */
export function barDynamic(x: number, w: number): number {
  const bw = w * BAR;
  return x < w / 2 ? 1 - Math.max(0, Math.min(1, x / bw)) : Math.max(0, Math.min(1, (x - (w - bw)) / bw));
}

/** The marks along a bar, from the box's edge outwards. */
export const MARKS = ["pp", "p", "mf", "f", "ff"];

/** THUMBS: the right thumb up, the left down (steps and thirds); leaps and repeats either. The wrong thumb asks for the mirror of the move. */
export function thumbsVerdict(m: Move, side: Side): { ok: boolean; steps?: number } {
  if (m.size < 0 || m.dir === 0 || m.size === 3) return { ok: true };
  const ok = side === (m.dir > 0 ? "right" : "left");
  return { ok, steps: ok ? m.steps : -m.steps };
}

/** Each note's move from the one before (a chord by its top note), and whether the score joins them. */
export function moves(notes: LaneNote[], beat: number): Move[] {
  for (const n of notes) n.ride = false;
  markShapes(notes);
  let prev: LaneNote | null = null;
  return notes.map((n, i) => {
    if (i > 0 && notes[i - 1].on === n.on) return { dir: n.dir ?? 0, size: n.size ?? -1, steps: 0, joined: false };
    let top = n;
    for (let j = i + 1; j < notes.length && notes[j].on === n.on; j++) if (notes[j].midi > top.midi) top = notes[j];
    const m = { dir: n.dir ?? 0, size: n.size ?? -1, steps: prev ? top.step - prev.step : 0, joined: !!prev && n.on - (prev.on + prev.dur) < beat / 4 };
    prev = top;
    return m;
  });
}

/** A staff step as a pitch, natural, keeping a reference pitch's inflection (for a wrong note: what was asked for). */
export function stepPitch(step: number, near: { step: number; midi: number }): number {
  const nat = (s: number) => [0, 2, 4, 5, 7, 9, 11][((s % 7) + 7) % 7] + 12 * (Math.floor(s / 7) + 1);
  return nat(step) + (near.midi - nat(near.step));
}

/** A pitch's staff step near a note (a MIDI key's step, for the prototypes that judge steps). */
export const stepNear = (midi: number, near: { step: number; midi: number }) => near.step + Math.round(((midi - near.midi) * 7) / 12);
