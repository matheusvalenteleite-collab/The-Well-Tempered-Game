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
 *     strong side forte, towards the soft side piano (touch-expr.ts STRONG_SIDE: D315, the box's side strong).
 *   (FINGERING and SIDEWAYS were withdrawn in D208; TWO VOICES, mobile HIGHWAY and KIMIKO as a mode in D219.)
 *   MIDI CONTROLLER (D233; was PIANO): a MIDI keyboard, the key exactly; offered only while one is connected.
 * Pure: moves and gestures in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";
import type { Play } from "../touch/chip.ts";
import { markShapes } from "../touch/shape.ts";
import { strengthOf } from "../touch/touch-expr.ts";
import type { Side } from "../touch/thumbs.ts";
import type { Arrow } from "../touch/MusicBox.tsx";

export type ProtoId = "ladder" | "highway" | "subject" | "arrows" | "keys" | "piano";
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

import type { Reading } from "../touch/readings.ts";

export interface Options {
  /** Unused since SIDEWAYS was withdrawn (D208): kept for the test harness's legato runs. */
  legato: boolean;
  /** D198: a run fails when the crowd is lost (off in the lessons; D219: always on elsewhere). */
  fail?: boolean;
  /** D219, WITH KIMIKO ISHIZAKA (LADDER, SUBJECT): her recording the only accompaniment, the game on her clock. */
  her?: boolean;
  /** EASY (D187): the time only, or the line's direction too, or its leaps as well. */
  easy?: EasyLevel;
  /** The lessons (D185, D188): the passage ends here (a tick); the music waits for each note; the voice alone. */
  until?: number;
  wait?: boolean;
  solo?: boolean;
  /** D223, D299: BLUETOOTH MODE: the whole piece, the player's notes too, on the schedule at the written times; the touches score, silently. */
  bt?: boolean;
  /** D230, SCALE KEYS (computer HIGHWAY, an experiment): the home row the home key's scale, the rows above and below its raised and lowered degrees (scale-keys.ts). */
  scale?: boolean;
  /** D271, THE TUTORIAL's coaching drawn over LADDER: which thumb the next note wants; where soft and loud are asked. */
  coach?: "thumbs" | "dynamics" | "slide" | "colour" | "sigh" | "ring";
  /** D280: the passage played by the game, the thumbs shown (the tutorial's demonstration); or, playing, a guide thumb for each next note. */
  demo?: boolean;
  guide?: boolean;
  /** D314: the ornament's first-time hint (as THE ORNAMENT lesson teaches it): a guide thumb shaking on the bars as an ornamented note comes, till one is shaken. */
  ornHint?: boolean;
  /** D272: the reading the fugue is played by (its subject's articulation and level, its dynamic plan). */
  reading?: Reading | null;
  /** D326, TOOLS (PRACTICE, HEAR THE OTHERS): the band's voices not sounded (still drawn). */
  mute?: readonly number[];
  /**
   * D342, THE MANUAL (lesson-only, never set by the game): the metronome's click past the count-in, where
   * no band plays (a drill's "band click"): full (the count-in's level) until `full`, fading to nothing at
   * `gone` (ticks); after it, silent.
   */
  click?: { full: number; gone: number; gain?: number };
  /** D342, THE MANUAL: how Herr Bach's demonstration (`demo`) plays: every note by one thumb, or the next thumb resting early on its note and sounded by the other's lift (a pull-off). */
  demoStyle?: DemoManner;
  /**
   * D359, THE MANUAL's practice room (lesson-only, never set by the game): the game's chatter is not drawn
   * (score, multiplier, combo, the legato chain, banners, embers, the right bar's live sheet, the fugue's
   * map, the ornaments' SHAKE prompts, the SOFT/STRONG hint, the articulation words): only the verdict,
   * the lesson's own aid and the words of `words` (articulation flashes of those kinds) remain; with
 * `ornaments` (D360, Part V) the ornaments' SHAKE prompts too.
   */
  quiet?: { words?: readonly ("legato" | "held" | "short" | "clean" | "rest")[]; ornaments?: boolean };
  /**
   * D373, THE TUTORIAL (lesson-only, never set by the game): one thumb takes every note of the plan (the
   * demonstration and the hints: "the left thumb alone"); the judge never asks which thumb.
   */
  side?: "left" | "right";
  /** D373 (lesson-only): the timing windows (early, late, the halfway split's floor) this many times the game's. */
  widen?: number;
  /** D373 (lesson-only): the count-in in whole beats ("I count four"), instead of D338's by time. */
  countBeats?: number;
  /**
   * D373 (lesson-only): the reading's notes placed on these onsets of the voice played (one per note of
   * `reading`), instead of on the subject's entries: a lesson's own marks (SHORT, DETACHED, JOINED, ACCENT).
   */
  readingAt?: readonly number[];
  /** D373 (lesson-only): the thumbs drawn by the tutorial's aid (Mario's model A), not the demonstration's own. */
  thumbsA?: boolean;
  /** D409 (lesson-only): the fingering marks (● ○) on every note, not only where the plan marks them (1.4, where the marks are introduced). */
  everyMark?: boolean;
  /**
   * D402 (lesson-only): the tutorial's screen dressed lesson by lesson (manual/dress.ts DressId): the game's
   * own elements drawn over the practice room (`quiet`) only as they come on: "score" (the score, the
   * multiplier, the combo), "verdicts", "bar" (the bar counter), "accuracy", "crowd" (its meter; the crowd
   * never leaves in a lesson), "subjects" (SUBJECTS n/m and, with it, the full screen's banners and chains).
   * Absent: D359's practice room as it was.
   */
  dress?: readonly string[];
}

/**
 * D342, D359: Herr Bach's manners of playing a demonstration. D342: "one-thumb", "prepared", "held".
 * D359 (Parts III–IV): the three touches at set holds ("legato" a little over the next onset, "ordinary"
 * about three quarters, "detached" under half); "lean" (a strong beat or a dissonance struck a little late,
 * the next back on the pulse); "breath" (the note after a written rest or a cadence entered a little late);
 * "broaden" (the last two bars growing late towards the end); "accent" (the reading's accents made by time: a lift
 * before, the note held, D338).
 */
export type DemoManner = "one-thumb" | "prepared" | "held" | "legato" | "ordinary" | "detached" | "accent" | "lean" | "breath" | "broaden" | "appoggiatura";

export interface Proto {
  id: ProtoId;
  name: string;
  /** D219: the rules, at most three short lines (the settings and the help screen, beside the mode's picture). */
  how: string[];
  /** One line under the name on the title card: how it is played (D184). */
  short: string;
  /** How the screen is held: the box between two side bars (sideways), the whole screen a field (upright), the box over a keyboard (sideways), the box over the computer's keys. */
  layout: "bars" | "full" | "wide" | "desk";
  /** D182: a phone's (touch) or a computer's (keys, MIDI). */
  platform: Platform;
}

/**
 * D219: the menus. A phone: LADDER (mobile HIGHWAY, TWO VOICES and KIMIKO withdrawn as modes; KIMIKO
 * is now a switch inside LADDER; D229: SUBJECT withdrawn too, the preludes played on HIGHWAY_LANES,
 * stages.ts). A computer: HIGHWAY, LADDER, PIANO.
 * `short` is the title card's rule (one line); `how` the settings' and help screen's (at most three
 * short lines; the pictures beside them do the rest: ModeDiagram.tsx).
 */
export const PROTOS: Proto[] = [
  {
    id: "ladder",
    short: "TOUCH A BAR, UP AS THE TUNE RISES",
    name: "LADDER",
    how: ["Touch either bar, anywhere along it.", "Higher when the tune rises, lower when it falls.", "Slide for a run. Across the bar: the note's colour."],
    layout: "bars",
    platform: "mobile",
  },
  {
    id: "keys",
    short: "HOME ROW · ONE FINGER PER LANE",
    name: "HIGHWAY",
    how: ["Press the lane's key as the note lands: full points.", "Another key the right way: half · G shared · SPACE repeats.", "Hold long notes; let go at the rests."],
    layout: "desk",
    platform: "computer",
  },
  {
    id: "arrows",
    short: "PRESS THE ARROW SHOWN ON EACH NOTE",
    name: "SPACE + WASD + ←↑↓→",
    how: ["Press the key drawn on the note as it arrives.", "→ ← a step · ↑ ↓ a leap · SPACE the same note.", "A third (↗ ↘): either the step or the leap."],
    layout: "desk",
    platform: "computer",
  },
  {
    id: "piano",
    short: "THE KEY UNDER EACH FALLING NOTE",
    name: "MIDI CONTROLLER",
    how: ["Play the key the note falls onto.", "On your MIDI keyboard · a wrong key is heard."],
    layout: "wide",
    platform: "computer",
  },
];

/** D230: HIGHWAY's rules with SCALE KEYS on (in place of `how`). */
export const SCALE_HOW = ["Home row A–K: do re mi fa sol la ti do of the home key.", "Raised notes the row above (W E T Y U), lowered below (X C B N M).", "SPACE repeats a note · TIMING: any key on time."];
/** D230: the computer HIGHWAY's keyboard layouts. */
export type KeysLayout = "home" | "scale";
export const KEYS_LAYOUTS: [KeysLayout, string][] = [
  ["home", "HOME ROW"],
  ["scale", "SCALE (EXPERIMENT)"],
];

/**
 * D219: mobile HIGHWAY is out of the menus, but its single-voice road (five lanes, two rows of pads,
 * EASY's levels) is the machinery SUBJECT runs on: kept as an internal prototype (and the tests' harness).
 */
export const HIGHWAY_LANES: Proto = {
  id: "highway",
  // D229: and the phone's mode for the preludes (stage 1, stages.ts): one hand on the five lanes.
  short: "TAP THE LANE AS THE NOTE LANDS",
  name: "HIGHWAY",
  how: ["Tap the note's lane as it lands: full points.", "Another lane the right way (up: right, down: left): half.", "Quick notes play themselves: strike the strong ones."],
  layout: "full",
  platform: "mobile",
};

/**
 * D229: SUBJECT left the phone's menu (the owner); its machinery (the subject line across voices, the
 * stretto's two rows of pads, subject-line.ts) stays as an internal prototype for the tests, as
 * HIGHWAY_LANES did, and subject-line.ts still names the computer HIGHWAY's entries and strettos.
 */
export const SUBJECT_LINE: Proto = { id: "subject", short: "", name: "SUBJECT", how: [], layout: "full", platform: "mobile" };

/** D219: a platform's menu, in order. D233: MIDI CONTROLLER only while a MIDI input is connected. */
export const menuOf = (pl: Platform, midi = false) => PROTOS.filter((p) => p.platform === pl && (p.id !== "piano" || midi));
/** D233: the mode chosen if the menu offers it, else the menu's first (MIDI CONTROLLER unplugged: HIGHWAY). */
export const offered = (id: ProtoId, pl: Platform, midi: boolean): ProtoId => {
  const m = menuOf(pl, midi);
  return m.some((p) => p.id === id) ? id : m[0].id;
};

export const protoById = (id: string) => (id === "highway" ? HIGHWAY_LANES : id === "subject" ? SUBJECT_LINE : (PROTOS.find((p) => p.id === id) ?? PROTOS[0]));
/** D219: whether a mode takes the WITH KIMIKO ISHIZAKA switch (where her recording exists); D233: LADDER and the computer's modes (once unlocked). */
export const takesHer = (id: ProtoId) => id === "ladder" || id === "keys" || id === "arrows" || id === "piano";

/** D220: the computer's HIGHWAY is played on its road alone: no music box beside it while playing. */
export const roadAlone = (p: Proto, playing: boolean) => playing && p.id === "keys";

/** D182, EASY on a computer: the keyboard's rows: the numbers a trill, the next forte, the home row mezzo, the bottom piano (after Ableton's velocity keys and the research on PC rhythm games). */
export const KEY_ROWS: { codes: string[]; dyn: number; mark: string; trill?: boolean }[] = [
  { codes: ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"], dyn: 0.6, mark: "tr", trill: true },
  { codes: ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"], dyn: 0.85, mark: "f" },
  { codes: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"], dyn: 0.5, mark: "mf" },
  { codes: ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"], dyn: 0.2, mark: "p" },
];
export const keyRow = (code: string) => KEY_ROWS.findIndex((r) => r.codes.includes(code));

/** LADDER (D181; D208 wider): how many rows either side of where a note is drawn still reach it. */
export const LADDER_AREA = 5;

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

/** The bars: across a bar, from the soft side (pp) to the strong (ff): D314, by STRONG_SIDE (D315: the box's side strong). */
export function barDynamic(x: number, w: number): number {
  return strengthOf(barAcross(x, w));
}
/** D314: where across its bar a touch is, 0 the inner edge (by the box) to 1 the outer (the phone's edge), mirrored for the two bars. */
export function barAcross(x: number, w: number): number {
  const bw = w * BAR;
  return x < w / 2 ? 1 - Math.max(0, Math.min(1, x / bw)) : Math.max(0, Math.min(1, (x - (w - bw)) / bw));
}

/** The marks along a bar, from the soft side to the strong. */
export const MARKS = ["pp", "p", "mf", "f", "ff"];

/** THUMBS: the right thumb up, the left down (steps and thirds); leaps and repeats either. The wrong thumb asks for the mirror of the move. */
export function thumbsVerdict(m: Move, side: Side): { ok: boolean; steps?: number } {
  if (m.size < 0 || m.dir === 0 || m.size === 3) return { ok: true };
  const ok = side === (m.dir > 0 ? "right" : "left");
  return { ok, steps: ok ? m.steps : -m.steps };
}

/** Each note's move from the one before (a chord by its top note), and whether the score joins them. */
export function moves(notes: LaneNote[], beat: number): Move[] {
  // D191: the notes that ride (lanes.ts quickRides) are passed over: a move is from the note struck before.
  markShapes(notes);
  let prev: LaneNote | null = null;
  return notes.map((n, i) => {
    if (i > 0 && notes[i - 1].on === n.on) return { dir: n.dir ?? 0, size: n.size ?? -1, steps: 0, joined: false };
    if (n.ride) return { dir: 0, size: -1, steps: 0, joined: false };
    let top = n;
    for (let j = i + 1; j < notes.length && notes[j].on === n.on; j++) if (notes[j].midi > top.midi) top = notes[j];
    const m = { dir: n.dir ?? 0, size: n.size ?? -1, steps: prev ? top.step - prev.step : 0, joined: !!prev && n.on - (prev.on + prev.dur) < beat / 4 };
    prev = top;
    return m;
  });
}

/** D229: a note struck again (the same pitch as the note struck before; on a computer, SPACE). Not the first note. */
export const isRepeat = (m: Move) => m.size >= 0 && (m.dir === 0 || m.steps === 0);

/** A staff step as a pitch, natural, keeping a reference pitch's inflection (for a wrong note: what was asked for). */
export function stepPitch(step: number, near: { step: number; midi: number }): number {
  const nat = (s: number) => [0, 2, 4, 5, 7, 9, 11][((s % 7) + 7) % 7] + 12 * (Math.floor(s / 7) + 1);
  return nat(step) + (near.midi - nat(near.step));
}

/** A pitch's staff step near a note (a MIDI key's step, for the prototypes that judge steps). */
export const stepNear = (midi: number, near: { step: number; midi: number }) => near.step + Math.round(((midi - near.midi) * 7) / 12);

/**
 * D191: the ids a game's inputs are held under, apart: a touch by its pointer id (0 and up, growing
 * without limit on Chrome), a MIDI key and a computer key below zero, each in its own band (they
 * shared one space: 5000 + note and 7000 + keyCode could meet a touch's id).
 */
export const midiId = (note: number) => -1000 - (note & 0x7f);
export const keyId = (keyCode: number) => -2000 - (keyCode & 0x3ff);

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
export type EasyLevel = "timing" | "direction" | "leaps" | "exact";
/**
 * D233: no level to choose: the computer's HIGHWAY always DIRECTION + LEAPS (SCALE KEYS its exact
 * keys), the phone's HIGHWAY (the preludes) DIRECTION; the lessons set their own.
 */
export const easyOf = (id: ProtoId): EasyLevel => (id === "keys" ? "leaps" : "direction");

/**
 * D208, computer HIGHWAY's nine lanes (A S D F G H J K L): the fingers on the home row, left little
 * finger to right little finger; G either index finger. Finger ids: 0 to 3 the left hand (little to
 * index), 5 to 8 the right (index to little); G is 3 or 5.
 */
export const HOME_LANES = 9;
const fingersOf = (lane: number): number[] => (lane === 4 ? [3, 5] : [lane]);

/**
 * D208: a fingering of the line along the lanes, planned over the whole passage (dynamic programming):
 * a rise always to the right, a fall to the left, a repeat in place (or the thumbs' space bar); a
 * step one lane, a leap two or more; never the same finger twice running on different notes (G taken
 * by whichever index finger is free); room kept ahead, so a long run does not pile up at an edge (a
 * free note, after a rest of a beat or more, starts anew where it suits what follows). `fingers` false
 * (the phone's five lanes, two thumbs): no finger rule. D217: a `soft` note (after a long note or a
 * short rest; no longer free) still goes the line's way, but as far as suits what follows: the lanes
 * recentre there without an open bar.
 */
export function planLanes(moves: Move[], heads: boolean[], free: boolean[], count: number, fingers: boolean, soft: boolean[] = []): number[] {
  const n = moves.length;
  const S = count * 2; // lane, and (G) which index finger
  const INF = 1e9;
  const fingerOf = (st: number) => {
    const lane = st >> 1;
    const f = fingersOf(lane);
    return f[Math.min(st & 1, f.length - 1)];
  };
  const valid = (st: number) => (st & 1) === 0 || (fingers && (st >> 1) === 4);
  const mid = (count - 1) / 2;
  const cost: number[][] = [];
  const back: number[][] = [];
  let prevI = -1;
  for (let i = 0; i < n; i++) {
    cost.push(new Array(S).fill(INF));
    back.push(new Array(S).fill(-1));
    if (!heads[i]) continue;
    for (let st = 0; st < S; st++) {
      if (!valid(st)) continue;
      const lane = st >> 1;
      if (prevI < 0 || free[i]) {
        // Anywhere; a little nearer the middle by preference.
        let best = prevI < 0 ? 0 : INF;
        let arg = -1;
        if (prevI >= 0)
          for (let ps = 0; ps < S; ps++)
            if (cost[prevI][ps] < best) (best = cost[prevI][ps]), (arg = ps);
        cost[i][st] = best + Math.abs(lane - mid) * 0.05;
        back[i][st] = arg;
        continue;
      }
      const m = moves[i];
      for (let ps = 0; ps < S; ps++) {
        const c0 = cost[prevI][ps];
        if (c0 >= INF) continue;
        const pl = ps >> 1;
        let c: number;
        if (m.dir === 0 || m.steps === 0) c = lane === pl && ps === st ? 0 : INF;
        else {
          const d = (lane - pl) * m.dir;
          if (d <= 0) {
            // Past the edge: the edge again (allowed by the judging, but avoided).
            const edge = m.dir > 0 ? count - 1 : 0;
            c = pl === edge && lane === edge ? 30 : INF;
          } else if (soft[i]) c = m.size >= 3 && d === 1 ? 1.5 : 0.01 * d;
          else if (m.size >= 3) c = d === 1 ? 1.5 : d === 2 ? 0 : 0.4 * (d - 2);
          else c = d === 1 ? 0 : 0.8 * (d - 1);
          if (c < INF && fingers && fingerOf(st) === fingerOf(ps) && !(pl === lane && d <= 0)) c += 20;
        }
        if (c0 + c < cost[i][st]) (cost[i][st] = c0 + c), (back[i][st] = ps);
      }
    }
    prevI = i;
  }
  // Back from the cheapest end.
  const lanes = new Array(n).fill(Math.round(mid));
  if (prevI < 0) return lanes;
  let st = 0;
  for (let s = 1; s < S; s++) if (cost[prevI][s] < cost[prevI][st]) st = s;
  for (let i = prevI; i >= 0; i--) {
    if (!heads[i]) continue;
    lanes[i] = st >> 1;
    st = back[i][st];
    if (st < 0) {
      // A free note's start, or the first: carry on from the cheapest before.
      let j = i - 1;
      while (j >= 0 && !heads[j]) j--;
      if (j < 0) break;
      st = 0;
      for (let s = 1; s < S; s++) if (cost[j][s] < cost[j][st]) st = s;
    }
  }
  // A chord's other notes, and the riding notes, keep the lane before.
  for (let i = 1; i < n; i++) if (!heads[i]) lanes[i] = lanes[i - 1];
  return lanes;
}

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

/** D207, HIGHWAY: whether a tap's lane answers the line's move from the lane tapped before (as contourOk, by lanes). */
export function laneOk(m: Move, last: number, lane: number, leaps: boolean, count: number): boolean {
  if (m.dir === 0 || m.steps === 0) return lane === last || m.steps === 0;
  const edge = m.dir > 0 ? count - 1 : 0;
  const way = m.dir > 0 ? lane > last : lane < last;
  if (!way) return last === edge && lane === edge;
  return !leaps || m.size < 3 || Math.abs(lane - last) >= 2 || lane === edge;
}
