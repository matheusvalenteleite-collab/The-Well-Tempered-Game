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
 *   TWO VOICES: the same screen; two voices chosen (1P, 2P), one to each bar; the time only.
 *   (FINGERING and SIDEWAYS were withdrawn in D208.)
 *   PIANO: sideways, the keyboard of D172; the key exactly.
 * Pure: moves and gestures in, verdicts out.
 */
import type { LaneNote } from "../touch/lanes.ts";
import type { Play } from "../touch/chip.ts";
import { markShapes } from "../touch/shape.ts";
import type { Side } from "../touch/thumbs.ts";
import type { Arrow } from "../touch/MusicBox.tsx";

export type ProtoId = "ladder" | "duo" | "highway" | "subject" | "kimiko" | "arrows" | "keys" | "piano";
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
  /** Unused since SIDEWAYS was withdrawn (D208): kept for the test harness's legato runs. */
  legato: boolean;
  /** D198: a run fails when the crowd is lost (off in the lessons, and with NO FAIL). */
  fail?: boolean;
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
    id: "highway",
    short: "TAP THE LANE AS EACH NOTE LANDS · SLIDE TO JOIN · TWO ROWS TO CROSS THUMBS",
    name: "HIGHWAY",
    how: "Upright, the whole screen: EASY on a phone (D207). The notes come down five lanes to the strike line; tap the lane a note is in as it lands. Two rows of pads, the same lanes in each (D208): one thumb in the upper row, the other in the lower, so they can pass each other. Legato: strike the next note before letting go of the last, or slide a held thumb into the next lane. The other voices pass faintly behind, by pitch (their subject entries brighter). Three levels (⚙ EASY): TIMING, any lane on time; DIRECTION, a lane further right than your last tap when the line rises, further left when it falls, the same lane when it repeats; + LEAPS, a leap of a fourth or more skips a lane. An open bar across the road (the first note, or after a rest of a beat or more): any lane. Long notes: hold them while their tail glows.",
    layout: "full",
    platform: "mobile",
  },
  {
    id: "subject",
    short: "PLAY ONLY THE SUBJECT · EVERY ENTRY, IN EVERY VOICE · STRETTO: BOTH, ONE PER ROW",
    name: "SUBJECT",
    how: "Upright, as HIGHWAY (D214). You follow the subject, not a voice: every entry of it, in whichever voice it comes (in a double or triple fugue every subject), and you rest while the fugue plays between them. Each entry's notes come down the five lanes in its voice's colour, its name shown as it begins (SUBJECT · ALTO, SUBJECT 2 · TENOR, INVERTED, AUGMENTED); a marker at the road's far end counts in the next entry while you wait. An entry's first note is an open bar: any lane. When entries overlap (stretto, D217) you play both, one per row of pads: the newer entry in the upper row (solid gems), the older one in the lower row (hollow gems), so expect two thumbs down at once. The older entry is reduced to its main moves: its notes on the beat or of half a beat or more; the quicker ones play themselves; its long notes are held. In a stretto a note is right only in its own row; outside one either row plays. Three entries or more at once: the two newest are yours, the others go back to the fugue. A stretto played through without a slip scores STRETTO ×2 and captures both entries. Slides, the levels of ⚙ EASY, long notes held, as on HIGHWAY.",
    layout: "full",
    platform: "mobile",
  },
  {
    id: "kimiko",
    short: "YOUR VOICE OVER KIMIKO ISHIZAKA'S RECORDING · TAP THE LANE AS EACH NOTE LANDS",
    name: "KIMIKO",
    how: "Upright, as HIGHWAY (D216), but the only accompaniment is Kimiko Ishizaka's recording (The Open Well-Tempered Clavier, 2015, CC0), from the first note: no other voices from the game, no band. You play one voice on top of her; the notes land when she plays them, and come down the road spaced by her own time (her rubato, her final ritard). Your notes sound a little under her (⚙ YOUR VOICE: ON, SOFT, or OFF to tap in silence, judged only), tuned to her A. The seven Book I fugues of the testbench (1, 2, 4, 5, 8, 10, 11). Five lanes, two rows of pads, slides, the levels of ⚙ EASY, long notes held, as on HIGHWAY.",
    layout: "full",
    platform: "mobile",
  },
  {
    id: "ladder",
    short: "TAP A BAR AT THE NOTE'S HEIGHT · HIGHER WHEN THE TUNE RISES",
    name: "LADDER",
    how: "Sideways. Touch either bar near the height your note is drawn in the box (the glow shows it), higher than your last touch when the tune goes up, lower when it goes down: the way matters more than the spot. A run is a slide up or down the bar. Across a bar: the middle mf, out to the phone's edge forte, in towards the box piano; slide across while a note sounds to swell or fade.",
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
    id: "arrows",
    short: "WASD OR ARROWS: THE KEY DRAWN OVER EACH NOTE",
    name: "LADDER",
    how: "On a computer. Each note's key is drawn over it in the box. Either hand, WASD or the arrows: → (D) a step up, ← (A) a step down, ↑ (W) a leap up, ↓ (S) a leap down; a third (↗ ↘) takes either; space the same note again.",
    layout: "desk",
    platform: "computer",
  },
  {
    id: "keys",
    short: "HANDS ON A S D F · H J K L, THUMBS ON SPACE · THE LANES ARE THE FINGERING",
    name: "HIGHWAY",
    how: "On a computer (D208). Both hands on the home row: left little finger on A to left index on F, right index on H to right little finger on L, G for whichever index is free, thumbs on space (the same note again). The notes come down nine lanes, A to L: a fingering of your line, planned so no finger strikes twice running and a run never jams at an edge. Four levels (⚙ EASY): TIMING, any key on time; DIRECTION, a key further right than the last when the line rises, further left when it falls, the same key or space when it repeats; + LEAPS, and a leap of a fourth or more skips a key; EXACT LANES, the lane's own key. A note after a rest of a beat or more is free (an open bar): any key. The rows shape the note: Q W E R… forte, A S D F… mezzo, Z X C V… piano; the numbers trill it. Hold Shift as a pedal; ↑ ↓ bend a held note.",
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
export const EASY_LEVELS: [EasyLevel, string][] = [
  ["timing", "TIMING"],
  ["direction", "DIRECTION"],
  ["leaps", "+ LEAPS"],
  ["exact", "EXACT LANES"],
];

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
