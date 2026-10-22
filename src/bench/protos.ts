/**
 * The testbench's prototypes (D175; D176; D178). The game supplies Bach's pitch; the gesture gives the
 * time and, depending on the prototype, the shape or the place. Every note wants an onset of its own:
 * a tap, or a held thumb slid on. A gesture judged wrong sounds what it asked for, muffled: the wrong
 * interval, the wrong column, the wrong key (D178), so the player hears their own mistake.
 * Every prototype has an expression axis, the direction it does not judge: towards its strong end a
 * note is louder, brighter and accented; towards its gentle end softer, darker, its attack slower.
 * A note lasts while its thumb is down; a tap while the other thumb holds is joined (legato).
 *   BOW: the time only. One thumb is the down-bow (an accent), the other the up-bow (a soft start
 *     that swells), as set. Like a string touchpad: towards the middle line sul tasto (dark), towards
 *     the phone's edge sul ponticello (bright); higher, more bow pressure (louder).
 *   LADDER: the thumb's travel from its last touch is the interval, at LADDER_PX a staff step: up for
 *     up, a long way for a leap. Sideways from the middle: the expression.
 *   THUMBS ↕ (upright) and THUMBS ↔ (sideways): right thumb when the tune goes up, left when it goes
 *     down, either for a repeat or a leap. Height: the expression.
 *   SIDEWAYS: the tune across the width, up to the right; the notes fall in columns of a window that
 *     follows the passage; a note is touched in its column (one off counts). Height: the expression.
 *   PIANO (sideways): the keyboard of D172; the key exactly.
 * Pure: moves and gestures in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";
import type { Play } from "../touch/chip.ts";
import { markShapes } from "../touch/shape.ts";
import type { Side } from "../touch/thumbs.ts";

export type ProtoId = "bow" | "ladder" | "thumbsV" | "thumbsH" | "sideways" | "piano";

/** A note's move from the note before it. */
export interface Move {
  /** Up 1, down -1, a repeat 0 (and the first note). */
  dir: number;
  /** 0 a repeat, 1 a step, 2 a third, 3 a leap (a fourth or more); -1 the first note. */
  size: number;
  /** The move in staff steps (signed). */
  steps: number;
}

/** Where and how a note was given. y grows downwards (screen); dy is the slide, up negative. */
export interface Gesture {
  kind: "tap" | "slide";
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
  dy: number;
}

export interface Options {
  /** BOW: the left thumb the up-bow (the default) or the down-bow. */
  bowLeftUp: boolean;
}

export interface Verdict {
  ok: boolean;
  /** The move the gesture asked for, in staff steps from the note before (to sound a wrong note). */
  steps?: number;
}

export interface Proto {
  id: ProtoId;
  name: string;
  /** One line under the name. */
  how: string;
  /** How the screen is held and shared: the box over the play area; a tall play area under a short box; the whole screen; the box between two side bars. */
  layout: "upright" | "tall" | "wide" | "full" | "bars";
  /** What a held thumb slid on does: vertical (the next note, up or down), horizontal (into the next column), none. */
  slides: "vertical" | "horizontal" | null;
  /** The pitch is placed on the screen and judged by the game (SIDEWAYS, PIANO). */
  placed?: boolean;
  /** A shape judged here (the others: by the game). */
  judge?(m: Move, g: Gesture, last: Gesture | null, o: Options): Verdict;
  /** The expression of a touch. */
  expr(g: Gesture, o: Options): Play;
}

/** LADDER: the thumb's travel for one staff step (px), and the least room kept at a screen edge. */
export const LADDER_PX = 22;
const EDGE = 44;
/** A held thumb slid this far (px) plays the next note (BOW). */
export const SLIDE_PX = 24;

/** The strong end (1) to the gentle end (0) of an expression axis, as touch shaping. */
export function shape(e: number): Play {
  const x = Math.max(0, Math.min(1, e));
  return { level: 0.6 + 0.8 * x, bright: -0.8 + 1.6 * x, soft: x < 0.35 ? (0.35 - x) * 2 : 0, accent: x > 0.7 ? (x - 0.7) * 2.5 : 0 };
}

/** How far a touch is from the middle line, 0 to 1. */
const outward = (g: Gesture) => Math.min(1, Math.abs(g.x - g.w / 2) / (g.w / 2));
/** How high a touch is, 0 (bottom) to 1 (top). */
const height = (g: Gesture) => Math.max(0, Math.min(1, 1 - g.y / g.h));

/** Whether a thumb plays the up-bow. */
export const upBow = (side: Side, o: Options) => (side === "left") === o.bowLeftUp;

/** LADDER: the steps a landing asks for, from the last touch; at a screen edge, a run that has no more room goes on. */
export function ladderSteps(g: Gesture, last: Gesture, want: number): number {
  const steps = Math.round((last.y - g.y) / LADDER_PX);
  const target = last.y - want * LADDER_PX;
  if (target < EDGE / 2 && g.y < EDGE && want > 0) return want;
  if (target > g.h - EDGE / 2 && g.y > g.h - EDGE && want < 0) return want;
  return steps;
}

/** LADDER: how far off a move may be, in steps: a repeat exact, a step one either way at most, more for wider moves. */
export const ladderTolerance = (steps: number) => (steps === 0 ? 0 : Math.max(1, Math.round(Math.abs(steps) * 0.34)));

export const PROTOS: Proto[] = [
  {
    id: "bow",
    name: "BOW",
    how: "Tap each note in time. One thumb bows down (an accent), the other up (soft, swelling): set which in ⚙. Towards the middle: dark (sul tasto); towards the edge: bright (ponticello). Higher: more pressure, louder. Hold to sustain; slide up or down to glide on.",
    layout: "upright",
    slides: "vertical",
    judge: () => ({ ok: true }),
    expr(g, o) {
      const up = upBow(g.side, o);
      const press = height(g);
      return { level: 0.55 + 0.85 * press, bright: -0.9 + 1.9 * outward(g), soft: up ? 0.75 : 0, accent: up ? 0 : 0.6 + 0.4 * press };
    },
  },
  {
    id: "ladder",
    name: "LADDER",
    how: "Draw the tune with your thumb: land above your last touch for up, below for down, level for a repeat; the further, the wider the interval (a step about a finger's width). Slide on to play on. Towards the edges: louder, sharper; the middle: softer, smoother.",
    layout: "upright",
    slides: "vertical",
    judge(m, g, last) {
      if (m.size < 0 || !last) return { ok: true };
      const steps = g.kind === "slide" ? Math.round(-g.dy / LADDER_PX) : ladderSteps(g, last, m.steps);
      return { ok: Math.abs(steps - m.steps) <= ladderTolerance(m.steps) && (m.steps === 0 || Math.sign(steps) === Math.sign(m.steps)), steps };
    },
    expr: (g) => shape(outward(g)),
  },
  {
    id: "thumbsV",
    name: "THUMBS ↕",
    how: "Upright. Your notes fall in two lanes: left lane, left thumb (the tune goes down); right lane, right thumb (up); the middle, either (a repeat or a leap). Higher on the screen: louder, sharper.",
    layout: "tall",
    slides: null,
    judge: thumbs,
    expr: (g) => shape(height(g)),
  },
  {
    id: "thumbsH",
    name: "THUMBS ↔",
    how: "Sideways. The music scrolls between two bars: left bar when the tune goes down (▼), right bar when it goes up (▲), either for a repeat or a leap. Higher in a bar: louder, sharper.",
    layout: "bars",
    slides: null,
    judge: thumbs,
    expr: (g) => shape(height(g)),
  },
  {
    id: "sideways",
    name: "SIDEWAYS",
    how: "Upright, the whole screen. The tune runs across: higher notes to the right. Your notes fall in their columns, the field following the passage; touch each in its column as it lands (one off counts), crossing your thumbs on a run, or slide across. Higher: louder.",
    layout: "full",
    slides: "horizontal",
    placed: true,
    expr: (g) => shape(height(g)),
  },
  {
    id: "piano",
    name: "PIANO",
    how: "Sideways. The voice's whole range; the notes fall onto their keys. The key exactly; a wrong key is heard. Slide onto the next key to play it.",
    layout: "wide",
    slides: "horizontal",
    placed: true,
    expr: () => ({}),
  },
];

/** THUMBS: the right thumb up, the left down, steps and thirds; leaps and repeats either. A wrong thumb asks for the mirror of the move. */
function thumbs(m: Move, g: Gesture): Verdict {
  if (m.size < 0 || m.dir === 0 || m.size === 3) return { ok: true };
  const ok = g.side === (m.dir > 0 ? "right" : "left");
  return { ok, steps: ok ? m.steps : -m.steps };
}

export const protoById = (id: string) => PROTOS.find((p) => p.id === id) ?? PROTOS[0];

/** Each note's move from the one before (a chord by its top note). */
export function moves(notes: LaneNote[]): Move[] {
  for (const n of notes) n.ride = false;
  markShapes(notes);
  let prevStep: number | null = null;
  return notes.map((n, i) => {
    if (i > 0 && notes[i - 1].on === n.on) return { dir: n.dir ?? 0, size: n.size ?? -1, steps: 0 };
    let top = n;
    for (let j = i + 1; j < notes.length && notes[j].on === n.on; j++) if (notes[j].midi > top.midi) top = notes[j];
    const m = { dir: n.dir ?? 0, size: n.size ?? -1, steps: prevStep === null ? 0 : top.step - prevStep };
    prevStep = top.step;
    return m;
  });
}

/** A staff step as a pitch, natural (for a wrong note: what the gesture asked for), near a reference pitch's accidental. */
export function stepPitch(step: number, near: { step: number; midi: number }): number {
  const nat = (s: number) => [0, 2, 4, 5, 7, 9, 11][((s % 7) + 7) % 7] + 12 * (Math.floor(s / 7) + 1);
  // Keep the reference's own inflection (a flat key's notes stay flat-ish).
  return nat(step) + (near.midi - nat(near.step));
}
