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
import type { Arrow } from "../touch/MusicBox.tsx";

export type ProtoId = "ladder" | "fingering" | "duo" | "sideways" | "arrows" | "keys" | "piano";
/** D182: what the prototype is played on. */
export type Platform = "mobile" | "computer";

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
  /** EASY (D187): the time only, or the line's direction too, or its leaps as well. */
  easy?: EasyLevel;
  /** The lessons (D185, D188): the passage ends here (a tick); the music waits for each note; the voice alone. */
  until?: number;
  wait?: boolean;
  solo?: boolean;
}

export interface Proto {
  id: ProtoId;
  name: string;
  /** One line under the name. */
  how: string;
  /** One line under the name on the title card: how it is played (D184). */
  short: string;
  /** How the screen is held: the box between two side bars (sideways), the whole screen a field (upright), the box over a keyboard (sideways), the box over the computer's keys. */
  layout: "bars" | "full" | "wide" | "desk";
  /** D182: a phone's (touch) or a computer's (keys, MIDI). */
  platform: Platform;
}

export const PROTOS: Proto[] = [
  {
    id: "ladder",
    short: "TAP A BAR AT THE NOTE'S HEIGHT · HIGHER WHEN THE TUNE RISES",
    name: "LADDER",
    how: "Sideways. Touch either bar near the height your note is drawn in the box (the glow shows it), higher than your last touch when the tune goes up, lower when it goes down: the way matters more than the spot. A run is a slide up or down the bar. Across a bar: the middle mf, out to the phone's edge forte, in towards the box piano; slide across while a note sounds to swell or fade.",
    layout: "bars",
    platform: "mobile",
  },
  {
    id: "fingering",
    short: "THE THUMB EACH NOTE SHOWS (L / R) · LEGATO, STACCATO, TENUTO AS MARKED",
    name: "FINGERING",
    how: "Sideways. Each note has its thumb (L or R in the box) and its articulation: LEGATO (strike it while the note before still sounds), STACCATO (let go quickly), TENUTO (hold it). The subject's entries are bosses: a SUB BOSS also wants some notes high or low in the bar; the BOSS also wants forte (out) or piano (in).",
    layout: "bars",
    platform: "mobile",
  },
  {
    id: "duo",
    short: "LEFT BAR 1P, RIGHT BAR 2P · ONLY THE TIME COUNTS",
    name: "TWO VOICES",
    how: "Sideways. Choose two voices, 1P and 2P: the left bar plays the first, the right bar the second. Only the time counts. Across a bar: the middle mf, out forte, in piano; slide across while a note sounds to swell or fade; flick up as you let go for a swoosh.",
    layout: "bars",
    platform: "mobile",
  },
  {
    id: "sideways",
    short: "TOUCH EACH NOTE IN ITS COLUMN AS IT LANDS · HIGHER IS LOUDER",
    name: "SIDEWAYS",
    how: "Upright, the whole screen. The tune runs across: higher notes to the right. Touch each note in its column as it lands (one off counts), anywhere up or down: higher is louder. Cross your thumbs on a run, or slide across. LEGATO (⚙): every note joined to the one before.",
    layout: "full",
    platform: "mobile",
  },
  {
    id: "arrows",
    short: "WASD OR ARROWS: THE KEY DRAWN OVER EACH NOTE",
    name: "LADDER",
    how: "On a computer. Each note's key is drawn over it in the box. Either hand, WASD or the arrows: → (D) a step up, ← (A) a step down, ↑ (W) a leap up, ↓ (S) a leap down; a third (↗ ↘) takes either; space the same note again.",
    layout: "desk",
    platform: "computer",
  },
  {
    id: "keys",
    short: "ANY KEY ON THE BEAT · LINE UP, KEY TO THE RIGHT · THE ROW SETS THE DYNAMIC",
    name: "EASY",
    how: "On a computer. Any key on time plays your note. Three levels (⚙): TIMING, only the time counts; DIRECTION, the keys follow the line: a key further right than the last when it rises, further left when it falls, the same key (or space) when it repeats; + LEAPS, and a leap of a fourth or more skips a key. A note after a rest or a long note is free (boxed in the music box): any key. At the end of a row, the edge key again answers a move past it. Best with both hands on the home row, thumbs on space. The rows shape the note: Q W E R… forte, A S D F… mezzo, Z X C V… piano; the numbers trill it. Hold Shift as a pedal; ↑ ↓ bend a held note.",
    layout: "desk",
    platform: "computer",
  },
  {
    id: "piano",
    short: "THE KEY UNDER EACH FALLING NOTE · Z X OCTAVE",
    name: "PIANO",
    how: "On a computer: a MIDI keyboard, or the computer's keys as a piano (the home row the white keys, the row above the black: A W S E D F T G Y H U J K O L P), Z and X the octave. The notes fall onto their keys; the key exactly; a wrong key is heard.",
    layout: "wide",
    platform: "computer",
  },
];

export const protoById = (id: string) => PROTOS.find((p) => p.id === id) ?? PROTOS[0];

/** D182, EASY on a computer: the keyboard's rows: the numbers a trill, the next forte, the home row mezzo, the bottom piano (after Ableton's velocity keys and the research on PC rhythm games). */
export const KEY_ROWS: { codes: string[]; dyn: number; mark: string; trill?: boolean }[] = [
  { codes: ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"], dyn: 0.6, mark: "tr", trill: true },
  { codes: ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"], dyn: 0.85, mark: "f" },
  { codes: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"], dyn: 0.5, mark: "mf" },
  { codes: ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"], dyn: 0.2, mark: "p" },
];
export const keyRow = (code: string) => KEY_ROWS.findIndex((r) => r.codes.includes(code));

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

/** D183, LADDER on a computer: the eight keys (WASD the left hand, the arrows the right, the same moves) and space. */
export const ARROW_KEYS: Record<string, Arrow> = {
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Space: "same",
};
/**
 * The key a move asks for (none for the first note: any key): a second a step, a fourth or more a
 * leap; a third (D184) either, drawn as a diagonal (↗ ↘).
 */
export function arrowOf(m: Move): Arrow | null {
  if (m.size < 0) return null;
  if (m.dir === 0) return "same";
  if (m.size === 2) return m.dir > 0 ? "rise" : "fall";
  const big = m.size >= 3;
  return m.dir > 0 ? (big ? "up" : "right") : big ? "down" : "left";
}
/** Whether a key answers the arrow asked for (a third: the step or the leap). */
export function fits(asked: Arrow, key: Arrow): boolean {
  if (asked === "rise") return key === "up" || key === "right";
  if (asked === "fall") return key === "down" || key === "left";
  return asked === key;
}
/** And back: the move a key makes. */
export function moveOf(a: Arrow): { dir: number; big: boolean } {
  return { dir: a === "up" || a === "right" || a === "rise" ? 1 : a === "same" ? 0 : -1, big: a === "up" || a === "down" };
}

/**
 * D187, EASY's levels. TIMING: any key on time. DIRECTION: the key further right than the last when
 * the line rises, further left when it falls, the same key (or space) on a repeated note. LEAPS: and a
 * leap (a fourth or more) skips at least one key.
 */
export type EasyLevel = "timing" | "direction" | "leaps";
export const EASY_LEVELS: [EasyLevel, string][] = [
  ["timing", "TIMING"],
  ["direction", "DIRECTION"],
  ["leaps", "+ LEAPS"],
];

/** Where a key lies (D187): its finger's column (1, Q, A and Z one column) and its place across the board (the rows staggered). */
export function keyPlace(code: string): { col: number; x: number; row: number; first: boolean; last: boolean } | null {
  const r = keyRow(code);
  if (r < 0) return null;
  const codes = KEY_ROWS[r].codes;
  const c = codes.indexOf(code);
  const col = r === 0 ? c - 1 : c;
  const x = col + [0, 0.5, 0.75, 1.25][r];
  return { col, x, row: r, first: c === 0, last: c === codes.length - 1 };
}

/**
 * Whether a key answers the line's move (D187), from the key struck before. Further right: by
 * column or by place across the board (either will do: the rows are staggered). At the board's edge,
 * the edge key again answers a move past it.
 */
export function contourOk(m: Move, prev: string, code: string, leaps: boolean): boolean {
  if (code === "Space") return m.dir === 0 || m.steps === 0;
  const a = keyPlace(prev);
  const b = keyPlace(code);
  // From space (a repeated note), any key: the hand is where it was.
  if (!a || !b) return true;
  const same = b.col === a.col;
  if (m.dir === 0 || m.steps === 0) return same || m.steps === 0;
  const right = b.col > a.col || b.x > a.x + 0.3;
  const left = b.col < a.col || b.x < a.x - 0.3;
  const wall = m.dir > 0 ? a.last && b.col >= a.col : a.first && b.col <= a.col;
  const way = m.dir > 0 ? right : left;
  if (!way) return wall;
  // A leap skips a key, unless the edge comes first.
  return !leaps || m.size < 3 || Math.abs(b.col - a.col) >= 2 || wall || (m.dir > 0 ? b.last : b.first);
}

/** What the box draws over a note in EASY's DIRECTION (D187): the way along the keys, or free. */
export function contourCue(m: Move, free: boolean, leaps: boolean): Arrow {
  if (free) return "free";
  if (m.dir === 0 || m.steps === 0) return "same";
  const big = leaps && m.size >= 3;
  return m.dir > 0 ? (big ? "right2" : "right") : big ? "left2" : "left";
}
