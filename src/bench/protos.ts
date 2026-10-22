/**
 * The testbench's prototypes, batch 1 (D175): the contour family. The game always supplies Bach's
 * pitch; the gesture gives the time and, depending on the prototype, the shape. Every note wants an
 * onset of its own (no note rides along): a tap, or a held thumb slid on (SLIDE_PX up or down: the
 * next note, glided into). A gesture judged wrong still sounds Bach's note, muffled.
 * Articulation is the same everywhere: a note sounds while its thumb is down (a quick tap is
 * staccato); a tap while the other thumb still holds is joined to that note (legato); a slide glides
 * (glissando); a sideways wobble is vibrato.
 * Pure: moves and gestures in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";
import { markShapes } from "../touch/shape.ts";
import type { Side } from "../touch/thumbs.ts";
import type { PlacedId } from "./placed.ts";

export type ProtoId = "bow" | "ladder" | "thumbs" | "trace" | "line" | "flick" | PlacedId;

/** A note's move from the note before it. */
export interface Move {
  /** Up 1, down -1, a repeat 0 (and the first note). */
  dir: number;
  /** 0 a repeat, 1 a step, 2 a third, 3 a leap (a fourth or more); -1 the first note. */
  size: number;
  /** The last direction that was not a repeat, before this move (0: none yet). */
  ref: number;
  /** After a rest or a long note: TRACE measures from the middle again. */
  fresh: boolean;
}

/** Where and how a note was given. y grows downwards (screen); dy is the slide or flick, up negative. */
export interface Gesture {
  kind: "tap" | "slide" | "flick";
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
  dy: number;
}

export interface Options {
  /** THUMBS: the relative rule (a change of thumb is a change of direction) instead of right = up. */
  relative: boolean;
}

export interface Proto {
  id: ProtoId;
  name: string;
  /** One line under the name. */
  how: string;
  /** Whether a held thumb slid on plays the next note. */
  slides: boolean;
  /** FLICK: the gesture is the flick after the touch. */
  flick?: boolean;
  /** Whether the gesture fits the move. `last` is the gesture before (any thumb); `held` the move of the note the sliding thumb holds. */
  fits(m: Move, g: Gesture, last: Gesture | null, o: Options, held?: Move): boolean;
  /** A level for the note (1 as the voice). */
  level?(g: Gesture): number;
  /** Batch 2 (placed.ts): the pitch is placed on the screen, and the touch counts where it lands. */
  placed?: PlacedId;
  /** How the screen is held: upright (the box over the play area), sideways, or the whole screen the play area. */
  layout?: "upright" | "wide" | "full-upright" | "full-wide";
  /** The sound: the Synth's (held while the thumb is down), a piano's (dies away, damped on lift), a dulcimer's (rings a little, whatever the thumb does). */
  sound?: "synth" | "piano" | "dulcimer";
  /** A wrong place sounds the pitch that is there (a keyboard), not Bach's note muffled. */
  literal?: boolean;
}

/** A held thumb slid this far (px) up or down plays the next note. */
export const SLIDE_PX = 24;
/** FLICK: a touch that has not moved this far (px) is a repeat; a flick is read within FLICK_MS. */
export const FLICK_MIN = 14;
export const FLICK_MS = 160;

const up = (g: Gesture, from: number) => from - g.y;

/** The least room a target keeps at a screen edge (px): a line run up to the top still has somewhere to go. */
const EDGE = 44;

/** A band of heights [top, bottom], kept on the screen with at least EDGE of room. */
function onScreen(a: number, b: number, h: number): [number, number] {
  let top = Math.max(0, Math.min(a, b));
  let bot = Math.min(h, Math.max(a, b));
  if (bot - top < EDGE) {
    if (top <= 0) bot = EDGE;
    else if (bot >= h) top = h - EDGE;
  }
  return [top, Math.max(top, bot)];
}

/** LADDER and TRACE: the heights where a tap gives the move, measured from `ref` (null: anywhere). */
export function zone(id: ProtoId, m: Move, ref: number, h: number): [number, number] | null {
  if (m.size < 0) return null;
  if (id === "ladder") {
    if (m.size === 3) return null;
    return m.dir > 0 ? onScreen(0, ref - 10, h) : m.dir < 0 ? onScreen(ref + 10, h, h) : onScreen(ref - 40, ref + 40, h);
  }
  const s = -m.dir;
  if (m.dir === 0) return onScreen(ref - 30, ref + 30, h);
  return m.size === 3 ? onScreen(ref + s * 70, s < 0 ? 0 : h, h) : onScreen(ref + s * 10, ref + s * 90, h);
}

const inZone = (z: [number, number] | null, y: number) => !z || (y >= z[0] && y <= z[1]);
const slideOk = (m: Move, g: Gesture) => m.dir !== 0 && Math.sign(-g.dy) === m.dir;

export const PROTOS: Proto[] = [
  {
    id: "bow",
    name: "BOW",
    how: "Tap each note in time, anywhere. Your thumbs are the bow: right a down-bow (heavier), left an up-bow (lighter). Hold to sustain; slide to glide on.",
    slides: true,
    fits: () => true,
    level: (g) => (g.side === "right" ? 1.15 : 0.82),
  },
  {
    id: "ladder",
    name: "LADDER",
    how: "Land higher than your last touch when the tune goes up, lower when it goes down, level for a repeat. After a leap, land anywhere. Either thumb.",
    slides: true,
    fits(m, g, last) {
      if (m.size < 0 || m.size === 3 || !last) return true;
      if (g.kind === "slide") return slideOk(m, g);
      return inZone(zone("ladder", m, last.y, g.h), g.y);
    },
  },
  {
    id: "thumbs",
    name: "THUMBS",
    how: "Right thumb when the tune steps up, left when it steps down. Leaps and repeats: either thumb. (Relative, in settings: change thumb when the tune turns, keep it while it goes on.)",
    slides: true,
    fits(m, g, last, o) {
      if (m.size < 0 || m.dir === 0) return true;
      if (g.kind === "slide") return slideOk(m, g);
      if (!o.relative) return m.size === 3 || g.side === (m.dir > 0 ? "right" : "left");
      if (m.size === 3 || m.ref === 0 || !last) return true;
      const same = g.side === last.side;
      if (same === (m.dir === m.ref)) return true;
      // The same thumb against the rule, but landing clearly the way the tune goes (G A flat).
      return same && Math.sign(up(g, last.y)) === m.dir && Math.abs(up(g, last.y)) >= 20;
    },
  },
  {
    id: "trace",
    name: "TRACE",
    how: "Trace the tune: land above your last touch for up, below for down, a little for a step or third, far for a leap. After a rest or a long note, measure from the middle line. Further out sideways: louder.",
    slides: true,
    fits(m, g, last) {
      if (m.size < 0 || !last) return true;
      if (g.kind === "slide") return slideOk(m, g) && m.size < 3;
      return inZone(zone("trace", m, m.fresh ? g.h / 2 : last.y, g.h), g.y);
    },
    level: (g) => 0.75 + 0.5 * Math.min(1, Math.abs(g.x - g.w / 2) / (g.w / 2)),
  },
  {
    id: "line",
    name: "INTERVAL LINE",
    how: "The width is the interval: the middle a repeat; right of it up, left down; near the middle a step, further a third, at the edge a leap. Slide to keep going the same way.",
    slides: true,
    fits(m, g, _last, _o, held) {
      if (m.size < 0) return true;
      if (g.kind === "slide") return !!held && slideOk(m, g) && held.dir === m.dir && held.size === m.size;
      const u = (g.x - g.w / 2) / (g.w / 2);
      if (m.dir === 0) return Math.abs(u) < 0.15;
      if (Math.sign(u) !== m.dir) return false;
      const a = Math.abs(u);
      return m.size === 1 ? a >= 0.08 && a <= 0.48 : m.size === 2 ? a >= 0.38 && a <= 0.78 : a >= 0.68;
    },
  },
  {
    id: "flick",
    name: "FLICK",
    how: "Touch and flick: up for a higher note, down for a lower, short a step, longer a third, long a leap; no flick for a repeat. Either thumb, any order.",
    slides: false,
    flick: true,
    fits(m, g) {
      if (m.size < 0) return true;
      const travel = Math.abs(g.dy);
      if (m.dir === 0) return travel < FLICK_MIN;
      if (Math.sign(-g.dy) !== m.dir || travel < FLICK_MIN) return false;
      return m.size === 1 ? travel <= 60 : m.size === 2 ? travel >= 40 && travel <= 100 : travel >= 80;
    },
  },
];

/** Batch 2 (D176): the pitch placed on the screen (placed.ts). */
const placed = (p: Omit<Proto, "fits" | "slides">): Proto => ({ ...p, slides: true, fits: () => true });
PROTOS.push(
  placed({
    id: "dulcimer",
    name: "DULCIMER",
    how: "Strings across, low at the bottom, following the passage. Strike the lit string as its note comes (one off still counts); a thumb slid onto the next string plays it. The notes ring a little.",
    placed: "dulcimer",
    sound: "dulcimer",
  }),
  placed({
    id: "upright",
    name: "UPRIGHT PIANO",
    how: "A keyboard on its end, low at the bottom, following the passage: white keys across, black keys in the middle. The key exactly; a wrong key is heard. Slide onto the next key to play it.",
    placed: "upright",
    sound: "piano",
    literal: true,
  }),
  placed({
    id: "piano",
    name: "PIANO",
    how: "Sideways. The voice's whole range; the notes fall onto their keys. The key exactly; a wrong key is heard. Slide onto the next key to play it.",
    placed: "piano",
    sound: "piano",
    literal: true,
    layout: "wide",
  }),
  placed({
    id: "snes",
    name: "SNES",
    how: "Sideways, the whole screen. Every voice scrolls past the line in the middle; touch your notes on their blocks as they cross it. Slide to follow a run.",
    placed: "snes",
    layout: "full-wide",
  }),
  placed({
    id: "tetris",
    name: "TETRIS",
    how: "The whole screen. Every voice falls, set across as on a keyboard; touch your notes in their column as they reach the line. Slide sideways to follow a run.",
    placed: "tetris",
    layout: "full-upright",
  }),
);

export const protoById = (id: string) => PROTOS.find((p) => p.id === id) ?? PROTOS[0];

/** Each note's move (a chord by its top note): its direction and size, the direction before it, whether it comes after a rest or a long note. */
export function moves(notes: LaneNote[], beat: number): Move[] {
  for (const n of notes) n.ride = false;
  markShapes(notes);
  let ref = 0;
  let prev: LaneNote | null = null;
  return notes.map((n, i) => {
    if (i > 0 && notes[i - 1].on === n.on) return { dir: n.dir ?? 0, size: n.size ?? -1, ref, fresh: false };
    const fresh = !prev || n.on - (prev.on + prev.dur) >= beat / 2 || prev.dur >= 2 * beat;
    const m = { dir: n.dir ?? 0, size: n.size ?? -1, ref, fresh };
    if (m.dir !== 0) ref = m.dir;
    prev = n;
    return m;
  });
}
