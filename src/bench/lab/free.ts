/**
 * D320, THE LAB's FREE PLAY (the owner: "a free playing mode … where one gets to play freely one's
 * selected instrument. Just for easy testing of freedom of expression. Pitches assigned via vertical
 * axis of course"). No score to follow: the two thumb bars play the sound chosen, the pitch the row
 * under the thumb (the fugue's key, or every semitone, over one to three octaves round the middle of
 * the voice's range, high at the top), each touch striking the pitch under it. Every gesture the game
 * has works as it does there, through the same code and the same MECH parameters:
 *   - D311/D315, ACROSS: where the thumb lands across its bar shapes the attack (Play.touch, protos.ts
 *     barDynamic: strength by STRONG_SIDE); moving sideways while it holds, the sustain (touch-expr.ts
 *     holdValue → Sounding.shape). MECH.expression off: every attack the middle.
 *   - SLIDES: a held thumb moved into another row (at least MECH.slideMinPx and half a row) glides there
 *     (Sounding.glide; a new joined note where the sound cannot glide). MECH.slides off: no slides.
 *   - SHAKES (free-ornament.ts feedShake, MECH.shake*): down and back a mordent, up and back a short
 *     trill, a third leg a trill from the note above (ornament-play.ts freeOrnamentParts, on the key's
 *     neighbours), D319: going on while the legs keep coming, settling on the note MECH.trillStopMs after
 *     they stop (MECH.trillFollowsShake; off: two beats of trill). MECH.freeOrnaments off: none.
 *   - JOINED: a thumb landing while the other still holds takes over without a new attack (the held
 *     note gives way, Play.legato), as in the game; D318: a handover within MECH.legatoGapMs of a lift
 *     sounds joined too (MECH.joinedSound); a touch on the half whose thumb is down, the other half
 *     free, is the other thumb (MECH.thumbCross); a contact within MECH.sameThumbPx of a thumb still
 *     down is that thumb rolling, ignored (proto-game.ts thumbSide, rollOf).
 *   - D321, DRAGS (MECH.dragMeaning "connect", drag.ts): on a sound that bends the pitch follows the
 *     thumb between the rows (follow, arrive); on a keyboard a slide plays the coulé or the Schleifer
 *     before its note. PLAY WITH IT (FreeOptions.sense, sensor.ts): the attack from the contact's size
 *     or the motion sensor's spike in place of the place across.
 * Each event a plain line for the lab's feed (WHAT HAPPENED), as the game's are. Nothing is judged,
 * scored or logged for replay. The clock is the audio clock: ticks = seconds × tps at the tempo chosen
 * (the ornaments' speed and the metronome's beat).
 */
import { voicing, type Chip, type Play, type Sounding } from "../../touch/chip.ts";
import { beatOf, type TouchFugue } from "../../touch/fugue.ts";
import { feedShake, shakeTracker, type FreeKind, type ShakeTracker } from "../../touch/free-ornament.ts";
import { freeOrnamentParts } from "../../touch/ornament-play.ts";
import { holdValue, PIANO_DB, STRONG_SIDE, TOUCH_NEUTRAL, touchKind } from "../../touch/touch-expr.ts";
import type { Side } from "../../touch/thumbs.ts";
import { MECH } from "../mechanics.ts";
import { dragFamily, dragFill, dragLine, fillNoteMs, pitchAtRow, scaleOfKey, snappedRow } from "../drag.ts";
import { preset } from "../../touch/sound.ts";
import { BAR, barAcross, barDynamic, dynamic } from "../protos.ts";
import { pitchName } from "./replay.ts";

/** D330: "keyboard" is a piano turned vertical on each bar (white keys outer, black keys inner, mirrored). */
export type FreeScale = "key" | "chromatic" | "keyboard";

/** How long a held note may ring (s), as the game's HOLD_MAX. */
const HOLD_MAX = 8;
/** The trill's notes sounded this far ahead of the clock (s), as the game's TRILL_AHEAD_S. */
const TRILL_AHEAD_S = 0.06;
/**
 * A slide waits until the thumb has stayed this long in the new row (ms): a shake's legs pass through
 * the rows faster (FREE PLAY's own: the game slides only onto the score's next note, so it needs none).
 */
export const SLIDE_DWELL_MS = 90;
/** The rows' margin at the top and the foot of the play area (px). */
const MARGIN = 10;
/** A note shown in the roll between the bars for this long (s). */
const ROLL_S = 5;

const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** The key's tonic (pitch class) and mode ("c" C minor, "Eb" E flat major). */
export function keyOf(key: string): { tonic: number; minor: boolean } {
  let pc = PC[key[0].toLowerCase()] ?? 0;
  if (key[1] === "#") pc++;
  if (key[1] === "b") pc--;
  return { tonic: (pc + 12) % 12, minor: key[0] === key[0].toLowerCase() };
}

/** The rows' pitches, low to high: the key's scale (natural minor in a minor key: its signature) or every semitone, `octaves` round the middle of the voice's range. D330, "keyboard": every semitone, the ends widened to a white key (`whites`, pitch classes; a piano's by default). */
export function freeRows(f: TouchFugue, voice: number, scale: FreeScale, octaves: number, whites: readonly number[] = PIANO_WHITES): number[] {
  const ns = f.voices[voice] ?? f.voices[0];
  const lo = Math.min(...ns.map((n) => n[2]));
  const hi = Math.max(...ns.map((n) => n[2]));
  const mid = Math.round((lo + hi) / 2);
  const half = Math.round((octaves * 12) / 2);
  const { tonic, minor } = keyOf(f.key);
  const deg = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const inKey = new Set(deg.map((d) => (tonic + d) % 12));
  const out: number[] = [];
  let a = mid - half;
  let b = mid + half;
  if (scale === "keyboard") {
    // Seven white keys an octave (the owner's "2 octaves = 14 white keys"), from the white at or
    // below the range's foot; the blacks between them.
    const w = new Set(whites);
    while (!w.has(pcOf(a))) a--;
    b = a;
    for (let n = 1; n < 7 * octaves; ) if (w.has(pcOf(++b))) n++;
  }
  for (let m = a; m <= b; m++) if (scale !== "key" || inKey.has(pcOf(m))) out.push(m);
  return out;
}

const pcOf = (m: number) => ((m % 12) + 12) % 12;

// ——— D330, KEYBOARD: a piano turned vertical on each bar ———————————————————————————————————————
//
// The owner: two octaves of chromatic strips (~14 px each) are nearly unplayable; a piano's keyboard
// stood on end on each bar, pitch rising upward, mirror-symmetric: black keys toward the inner edge
// (the screen's centre), white keys toward the outer. As on a piano the white keys run on into the
// inner zone between the black ones, so a chromatic run can stay inner and an all-white run relax
// outward. The hit test is a weighted nearest centre (a power diagram): each white key has a centre in
// the outer zone and one in the inner, each black key one in the inner zone; d² = (wx·du)² + dy² − bias.
// Centres at the same place across (a white's inner one, a black) meet on level lines (the black key's
// height); a black and a white's outer centre meet on a slanted line, so the black key's tip tapers
// over `slant` of the bar's width round the zone split, and a touch there resolves by both across and
// along. A white key's two centres are the same key, so neighbouring whites always meet level.

/** A piano's white keys (C major's pitch classes). */
export const PIANO_WHITES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];
export type WhiteMode = "piano" | "key";
/** The keyboard's shape: the inner zone's width (fraction of the bar, from the inner edge), a black key's height (fraction of a white's), its tip's taper (fraction of the bar's width, centred on the split). */
export interface KbShape {
  split: number;
  black: number;
  slant: number;
}
export const KB_DEFAULT: KbShape = { split: 0.6, black: 0.58, slant: 0.2 };

/**
 * D330, IN THE KEY's white keys: the seven pitch classes the voice plays most (by notes), ties broken
 * toward the key's scale (harmonic minor in a minor key, else major), then the lower pitch class.
 * PIANO: C major's.
 */
export function whitePcs(f: TouchFugue, voice: number, mode: WhiteMode): number[] {
  if (mode === "piano") return [...PIANO_WHITES];
  const { tonic, minor } = keyOf(f.key);
  const scale = new Set((minor ? [0, 2, 3, 5, 7, 8, 11] : [0, 2, 4, 5, 7, 9, 11]).map((d) => (tonic + d) % 12));
  const n = new Array<number>(12).fill(0);
  for (const x of f.voices[voice] ?? f.voices[0]) n[pcOf(x[2])]++;
  const order = [...Array(12).keys()].sort((a, b) => n[b] - n[a] || Number(scale.has(b)) - Number(scale.has(a)) || a - b);
  return order.slice(0, 7).sort((a, b) => a - b);
}

/** The white keys' names: PIANO a piano's (C D E …), IN THE KEY the piece's own spelling (F𝄪 in G♯ minor). */
export function whiteNames(f: TouchFugue, pcs: readonly number[], mode: WhiteMode): string {
  const plain = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
  return pcs.map((p) => (mode === "piano" ? plain[p] : pitchName(f.id, 60 + p).replace(/-?\d+$/, ""))).join(" ");
}

/** The share (0..1) of a voice's notes on white keys. */
export function whiteShare(f: TouchFugue, voice: number, whites: readonly number[]): number {
  const ns = f.voices[voice] ?? [];
  const w = new Set(whites);
  return ns.length ? ns.filter((x) => w.has(pcOf(x[2]))).length / ns.length : 0;
}

/** A key on the keyboard: its row (index into the rows), pitch, colour, centre (px from the top) and height. */
export interface KbKey {
  row: number;
  midi: number;
  white: boolean;
  y: number;
  h: number;
}
/** A centre of the hit test: `u` px across from the bar's inner edge. */
export interface KbCentre {
  row: number;
  u: number;
  y: number;
  bias: number;
  zone: "inner" | "outer";
}
export interface KbHit {
  row: number;
  white: boolean;
  zone: "inner" | "outer";
}

/** D330: the keyboard's geometry on a bar `bw` px wide and a play area `h` px high, and its hit test. */
export class Keyboard {
  readonly keys: KbKey[];
  readonly centres: KbCentre[];
  /** A white key's height (px); the horizontal weight of the distance; how many white keys. */
  readonly wh: number;
  readonly wx: number;
  readonly whites: number;
  private readonly byRow = new Map<number, KbKey>();
  readonly rows: readonly number[];
  readonly shape: KbShape;
  readonly bw: number;
  readonly h: number;
  constructor(rows: readonly number[], whites: readonly number[], shape: KbShape, bw: number, h: number) {
    this.rows = rows;
    this.shape = shape;
    this.bw = bw;
    this.h = h;
    const isW = new Set(whites);
    const wi = rows.map((m, i) => (isW.has(pcOf(m)) ? i : -1)).filter((i) => i >= 0);
    this.whites = wi.length;
    const wh = (this.wh = Math.max(4, (h - 2 * MARGIN) / Math.max(1, wi.length)));
    const yW = (k: number) => MARGIN + (wi.length - 1 - k + 0.5) * wh;
    const uB = (shape.split * bw) / 2;
    const uW = ((1 + shape.split) * bw) / 2;
    const D = uW - uB;
    // A lone black key's tip: its half-height falls from hh/2 at split − τ/2 through hh/4 at the split
    // to nothing at split + τ/2 (the slope k): the weight wx and the outer centres' bias from that.
    const hh0 = shape.black * wh;
    const g0 = wh / 2;
    const tau = Math.max(0.5, shape.slant * bw);
    const k = hh0 / 2 / tau;
    this.wx = Math.sqrt((k * g0) / D);
    const bias0 = g0 * hh0 - g0 * g0;
    const sU = shape.split * bw;
    const biasOut = g0 * g0 + this.wx * this.wx * D * (uW + uB - 2 * sU) + bias0 - (g0 * hh0) / 2;
    const keys: KbKey[] = [];
    const centres: KbCentre[] = [];
    wi.forEach((r, j) => {
      const y = yW(j);
      keys.push({ row: r, midi: rows[r], white: true, y, h: wh });
      centres.push({ row: r, u: uB, y, bias: 0, zone: "inner" }, { row: r, u: uW, y, bias: biasOut, zone: "outer" });
      const next = wi[j + 1];
      if (next === undefined) return;
      // The black keys between this white and the next (two where the whites skip a minor third):
      // centred on their boundary, abutting; each meets the nearer white at its own edge (its bias).
      const n = next - r - 1;
      if (n <= 0) return;
      const yb = y - wh / 2;
      const hh = Math.min(shape.black, 0.95 / n) * wh;
      for (let q = 0; q < n; q++) {
        const yc = yb + ((n - 1) / 2 - q) * hh;
        const g = Math.min(Math.abs(yc - y), Math.abs(yc - (y - wh)));
        keys.push({ row: r + 1 + q, midi: rows[r + 1 + q], white: false, y: yc, h: hh });
        centres.push({ row: r + 1 + q, u: uB, y: yc, bias: g * hh - g * g, zone: "inner" });
      }
    });
    this.keys = keys.sort((a, b) => a.row - b.row);
    for (const q of this.keys) this.byRow.set(q.row, q);
    this.centres = centres;
  }
  /** The key under a touch `u` px across from the bar's inner edge, `y` px from the top. */
  hit(u: number, y: number): KbHit {
    let best = this.centres[0];
    let bd = Infinity;
    for (const c of this.centres) {
      const du = this.wx * (u - c.u);
      const dy = y - c.y;
      const d = du * du + dy * dy - c.bias;
      if (d < bd) (bd = d), (best = c);
    }
    return { row: best.row, white: this.byRow.get(best.row)!.white, zone: best.zone };
  }
  key(row: number): KbKey | undefined {
    return this.byRow.get(row);
  }
  /** A black key's outline as the hit test has it ([u, y] points round it), sampled every `step` px across. */
  outline(row: number, step = 2): [number, number][] {
    const kk = this.key(row);
    if (!kk || kk.white) return [];
    const top: [number, number][] = [];
    const bot: [number, number][] = [];
    for (let u = 0; u <= this.bw + 0.01; u += step) {
      if (this.hit(u, kk.y).row !== row) break;
      let a = kk.y;
      while (a > kk.y - this.wh && this.hit(u, a - 0.5).row === row) a -= 0.5;
      let b = kk.y;
      while (b < kk.y + this.wh && this.hit(u, b + 0.5).row === row) b += 0.5;
      top.push([u, a]);
      bot.push([u, b]);
    }
    if (!top.length) return [];
    // The tip: where along the key's centre line it ends.
    let lo = top[top.length - 1][0];
    let hi = lo + step;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      if (this.hit(m, kk.y).row === row) lo = m;
      else hi = m;
    }
    return [...top, [lo, kk.y], ...bot.reverse()];
  }
}

interface Held {
  side: Side;
  /** The row (index into rows) sounding, and its pitch. */
  row: number;
  midi: number;
  /** Where it landed (strength 0..1) and where the pitch was last set (y, for slides). */
  land: number;
  ax: number;
  ay: number;
  setY: number;
  /** D330: where across the pitch was last set (the keyboard's slides go sideways too). */
  setX: number;
  at: number;
  sounds: Sounding[];
  v: ReturnType<typeof voicing>;
  play: Play;
  /** The sustain values it went through (for the lift's line). */
  sMin: number;
  sMax: number;
  sNow: number;
  shapes: number;
  shake: ShakeTracker;
  /** A trill under way (D319): its notes, the next to sound, the tick of the latest leg. */
  trill?: { parts: [number, number, number][]; next: number; last: number; settled: boolean; live: { sd: Sounding; end: number }[] };
  ornament?: FreeKind;
  pts: number;
  /** The other thumb took over (joined): this one only holds, silent. */
  passive?: boolean;
  /** A slide waiting its dwell (the row reached, since when, where), and the latest shake leg's time (ms). */
  pend?: { row: number; since: number; x: number; y: number };
  lastLeg: number;
  /** Where the thumb is now (D318's rolling contact is measured from it). */
  cx: number;
  cy: number;
  /** D321: the last time (ms) the thumb was still where it last set its pitch (a drag's start). */
  still: number;
  /**
   * D321, "connect" on a sound that bends: the pitch follows the thumb from where it landed (a row a
   * row's height, `ref` the landing's row and y), the row it last arrived on, when it left it, the
   * row it is now in tune on and since when (arrived after SLIDE_DWELL_MS there).
   */
  gl?: { refRow: number; refY: number; leftAt: number; at?: { row: number; since: number } };
  /** D321, PLAY WITH IT by contact size: the strength and size it landed with, the size's sustain now (the thumb flattening). */
  size0?: number;
  sizeFrom?: number;
  sizeSv?: number;
  sizeTo?: number;
}

export interface FreeOptions {
  scale: FreeScale;
  octaves: number;
  bpm: number;
  click: boolean;
  /** D330, scale "keyboard": which notes are white, the keys' shape, the pitch names drawn on the keys. */
  kb?: { white: WhiteMode; shape: KbShape; labels: boolean };
  /**
   * D321, SENSOR's PLAY WITH IT: the touch's strength (0..1; null: nothing measured or no calibration
   * yet) in place of the place across the bar, from `source`:
   *   "size": the contact's size (sensor.ts sizeOf; `size(id)` now): the size at landing the attack, at
   *   once; the thumb flattening while it holds (its size growing) the sustain (D311's shape);
   *   "motion": the motion sensor's spike, `motion(ts, waitMs, done)` answered once its window is read
   *   or `waitMs` on at the latest (the note neutral meanwhile, or MECH.tapDelayMs held back).
   */
  sense?: {
    source: "size" | "motion";
    motion: (ts: number, waitMs: number, done: (r: { peak: number | null; strength: number | null; cal: string }) => void) => void;
    size: (id: number) => { size: number | null; strength: number | null; cal: string };
  };
}

/** D321: the sensor's strength on a note already sounding: the piano's level (D311's ±4 dB), the others' sustain shape (brightness, the swell). */
export function applyStrength(sounds: readonly Sounding[], strength: number, presetId: string): string {
  if (touchKind(presetId) === "piano") {
    const db = (strength - 0.5) * 2 * PIANO_DB;
    for (const s of sounds) s.dyn?.(10 ** (db / 20));
    return `${db >= 0 ? "+" : "−"}${Math.abs(db).toFixed(1)} dB`;
  }
  const sv = 2 * strength - 1;
  for (const s of sounds) s.shape ? s.shape(sv) : s.dyn?.(10 ** ((sv * 3) / 20));
  return `shape ${sv >= 0 ? "+" : "−"}${Math.abs(sv).toFixed(2)}`;
}

export class FreePlay {
  readonly rows: number[];
  readonly tps: number;
  private held = new Map<number, Held>();
  private lastLift: { side: Side; at: number; midi: number } | null = null;
  private nextClick = 0;
  private beatS: number;
  private perBar: number;
  private beatN = 0;
  private t0: number;
  /** The notes played (for the roll between the bars): pitch row, start and end (audio s), thumb. */
  private played: { row: number; on: number; off?: number; side: Side; id: number }[] = [];
  private h = 0;
  private w = 0;
  /** D330: the white keys' pitch classes (IN THE KEY or a piano's), the keyboard's geometry as last drawn. */
  readonly whites: number[];
  private kbCache?: Keyboard;
  /** Contacts taken for a thumb rolling (D318): ignored to their lift. */
  private rolls = new Set<number>();
  /** For a test driving the page: the lines so far. */
  lines = 0;

  readonly f: TouchFugue;
  readonly voice: number;
  readonly chip: Chip;
  readonly o: FreeOptions;
  private readonly line: (text: string) => void;

  constructor(f: TouchFugue, voice: number, chip: Chip, o: FreeOptions, line: (text: string) => void) {
    this.f = f;
    this.voice = voice;
    this.chip = chip;
    this.o = o;
    this.line = line;
    this.whites = whitePcs(f, voice, o.kb?.white ?? "key");
    this.rows = freeRows(f, voice, o.scale, o.octaves, this.whites);
    this.tps = (f.tpq * o.bpm) / 60;
    const b = beatOf(f);
    this.beatS = b.ticks / this.tps;
    this.perBar = b.perBar;
    this.t0 = chip.ctx.currentTime;
    this.nextClick = this.t0 + 0.1;
  }

  /** D330: the keyboard layout is on. */
  get kbOn(): boolean {
    return this.o.scale === "keyboard";
  }
  /** D330: the keyboard's geometry for a play area `w` × `h` (kept while the size and shape stay). */
  keyboard(w = this.w, h = this.h): Keyboard {
    const shape = this.o.kb?.shape ?? KB_DEFAULT;
    const c = this.kbCache;
    if (c && c.bw === w * BAR && c.h === h && c.shape === shape) return c;
    return (this.kbCache = new Keyboard(this.rows, this.whites, shape, w * BAR, h));
  }
  /** The row (and, on the keyboard, the key's colour and zone) under a touch at (x, y). */
  hitAt(x: number, y: number, w = this.w, h = this.h): { row: number; white?: boolean; zone?: "inner" | "outer" } {
    if (!this.kbOn) return { row: this.rowAt(y, h) };
    return this.keyboard(w, h).hit(barAcross(x, w) * w * BAR, y);
  }
  /** The pitch under a touch at (x, y). */
  pitchAt(x: number, y: number, w: number, h: number): number {
    return this.rows[this.hitAt(x, y, w, h).row];
  }
  /** D330: "C#4 · black key, inner" (the keyboard's line for a key struck). */
  private keyLine(hit: { white?: boolean; zone?: "inner" | "outer" }): string {
    return hit.zone ? ` · ${hit.white ? "white" : "black"} key, ${hit.zone} zone` : "";
  }

  /** The rows' geometry in a play area `h` px high: each row's middle (px), and its height (on the keyboard: a semitone's mean height). */
  rowH(h = this.h): number {
    return Math.max(4, (h - 2 * MARGIN) / this.rows.length);
  }
  yOf(row: number, h = this.h): number {
    if (this.kbOn && this.w > 0) {
      const k = this.keyboard(this.w, h).key(row);
      if (k) return k.y;
    }
    return MARGIN + (this.rows.length - 1 - row + 0.5) * this.rowH(h);
  }
  rowAt(y: number, h = this.h): number {
    const r = this.rows.length - 1 - Math.floor((y - MARGIN) / this.rowH(h));
    return Math.max(0, Math.min(this.rows.length - 1, r));
  }
  private tick(): number {
    return this.chip.ctx.currentTime * this.tps;
  }
  private stamp(): string {
    return `${(this.chip.ctx.currentTime - this.t0).toFixed(1)}s`;
  }
  private say(text: string) {
    this.lines++;
    this.line(`${this.stamp()} ${text}`);
  }
  name(midi: number): string {
    return pitchName(this.f.id, midi);
  }

  /** D318 (proto-game.ts rollOf): a contact landing on a thumb still down (within MECH.sameThumbPx of where it is now) is that thumb rolling. */
  private rollOf(x: number, y: number): boolean {
    for (const o of this.held.values()) if (Math.abs(o.cy - y) <= MECH.sameThumbPx && Math.abs(o.cx - x) <= MECH.sameThumbPx) return true;
    return false;
  }
  /** D318 (proto-game.ts thumbSide, MECH.thumbCross): a touch on the half whose thumb is down while the other half has none is the other thumb. */
  private thumbSide(side: Side): Side {
    if (!MECH.thumbCross) return side;
    const sides = [...this.held.values()].map((o) => o.side);
    return sides.length && sides.every((s) => s === side) ? (side === "left" ? "right" : "left") : side;
  }

  down(id: number, half: Side, x: number, y: number, w: number, h: number, ts: number) {
    this.h = h;
    this.w = w;
    const now = this.chip.ctx.currentTime;
    // D318: a thumb rolling onto a second contact: its own, ignored (the game's double contact).
    if (this.rollOf(x, y)) {
      this.rolls.add(id);
      return this.say(`· DOUBLE contact ignored (a thumb still down within ${MECH.sameThumbPx} px: rolling)`);
    }
    const side = this.thumbSide(half);
    const hit = this.hitAt(x, y, w, h);
    const row = hit.row;
    const midi = this.rows[row];
    const across = barAcross(x, w);
    const strength = barDynamic(x, w);
    // D330: on the keyboard the place across picks the key, so it shapes no attack (neutral).
    const land = MECH.expression && !this.kbOn ? strength : TOUCH_NEUTRAL;
    // Joined: the other thumb still holds: it gives way, this one comes in without a new attack.
    let joined = false;
    for (const [hid, o] of this.held) {
      if (hid === id) continue;
      if (o.passive) continue;
      joined = true;
      o.passive = true;
      for (const sd of o.sounds) sd.stop(now + 0.03);
      o.sounds = [];
      if (o.trill) o.trill.settled = true;
    }
    // D318 (MECH.joinedSound): a handover within the legato gap sounds joined too (no fresh attack).
    const gap = this.lastLift ? (now - this.lastLift.at) * 1000 : Infinity;
    const handover = !joined && gap <= MECH.legatoGapMs;
    const v = voicing(this.voice, this.f.voices.length, true);
    // D321, PLAY WITH IT: the attack the tap's strength (the sensor's), not the place across: the note
    // starts neutral and is set when the spike is read, or (MECH.tapDelayMs) waits for it.
    const sense = this.o.sense;
    const bySize = sense?.source === "size" ? sense.size(id) : null;
    const delay = sense?.source === "motion" ? MECH.tapDelayMs : 0;
    const touch = bySize ? (bySize.strength ?? TOUCH_NEUTRAL) : sense ? TOUCH_NEUTRAL : land;
    const play: Play = { ...dynamic(0.5), lead: true, envelope: "synth", touch, legato: joined || (handover && MECH.joinedSound) };
    const sounds = delay > 0 ? [] : [this.chip.note(midi, now, HOLD_MAX, v, play)];
    const hd: Held = { side, row, midi, land, ax: x, ay: y, setY: y, setX: x, at: now, sounds, v, play: { ...play, legato: true }, sMin: 0, sMax: 0, sNow: 0, shapes: 0, shake: shakeTracker(y, x, ts), pts: 1, lastLeg: -Infinity, cx: x, cy: y, still: ts };
    this.held.set(id, hd);
    if (bySize) {
      hd.size0 = bySize.strength ?? undefined;
      hd.sizeFrom = bySize.size ?? undefined;
      const st = bySize.strength === null ? (bySize.size === null ? "" : " · no calibration yet (SENSOR › LEARN): struck neutral") : ` → strength ${bySize.strength.toFixed(2)} (${bySize.cal}), the attack at once`;
      this.say(`◉ TAP ${this.name(midi)} · contact size ${bySize.size === null ? "not reported" : `${bySize.size.toFixed(1)} px`}${st}`);
    } else if (sense) this.sensed(sense.motion, id, hd, ts, delay, play);
    this.played.push({ row, on: now, side, id });
    if (this.played.length > 200) this.played.splice(0, this.played.length - 200);
    const th = `${side === "left" ? "L thumb" : "R thumb"}${side !== half ? " (crossed: landed on the other half, D318)" : ""}`;
    const strong = STRONG_SIDE === "outer" ? "outer" : "inner";
    let join = "";
    if (joined) join = " · ⌒ JOINED: other thumb still down (no new attack)";
    else if (handover) join = ` · ⌒ JOINED by handover: gap ${Math.round(gap)} ms ≤ ${MECH.legatoGapMs} ms${MECH.joinedSound ? " (joined sound)" : " (a new attack: joined sound off)"}`;
    else if (gap < 1500) join = ` · NOT JOINED: gap ${Math.round(gap)} ms > ${MECH.legatoGapMs} ms`;
    if (this.kbOn) this.say(`♩ ${this.name(midi)}${this.keyLine(hit)} · ${th} · across ${across.toFixed(2)} (0 by the box, 1 the edge) · KEYBOARD: across picks the key, the attack neutral${join}`);
    else this.say(`♩ ${this.name(midi)} · ${th} · across ${across.toFixed(2)} (0 by the box, 1 the edge) · strength ${strength.toFixed(2)} (strong ${strong})${MECH.expression ? "" : " · expression off: attack at the middle"}${join}`);
  }

  /** D321: the tap's strength from the sensor, applied to the note sounding (delay 0) or striking it (the attack held back up to `delay` ms). */
  private sensed(sense: NonNullable<FreeOptions["sense"]>["motion"], id: number, hd: Held, ts: number, delay: number, play: Play) {
    sense(ts, delay > 0 ? delay : MECH.tapWindowMs + 40, (r) => {
      const ms = Math.round(performance.now() - ts);
      const s = r.strength;
      const here = this.held.get(id) === hd && !hd.passive;
      const now = this.chip.ctx.currentTime;
      const pk = r.peak === null ? "no motion samples" : `peak ${r.peak.toFixed(2)} m/s²`;
      const st = s === null ? (r.peak === null ? "" : " · no calibration yet (SENSOR: a guided session, or eight taps)") : ` → strength ${s.toFixed(2)} (${r.cal})`;
      if (delay > 0) {
        const p = { ...play, touch: s ?? TOUCH_NEUTRAL };
        if (here && !hd.sounds.length && !hd.ornament) hd.sounds = [this.chip.note(hd.midi, now, HOLD_MAX, hd.v, p)];
        else if (!here && !hd.passive) this.chip.note(hd.midi, now, 0.15, hd.v, p);
        return this.say(`◉ TAP ${this.name(hd.midi)} · ${pk}${st} · the attack waited ${ms} ms${s === null ? " (struck neutral)" : ""}`);
      }
      const how = s !== null && here ? applyStrength(hd.sounds, s, preset().id) : "";
      this.say(`◉ TAP ${this.name(hd.midi)} · ${pk}${st} · read ${ms} ms after the touch${how ? ` · applied after the attack: ${how}` : ""}`);
    });
  }

  move(id: number, x: number, y: number, w: number, h: number, ts: number) {
    const hd = this.held.get(id);
    if (!hd) return;
    hd.cx = x;
    hd.cy = y;
    if (hd.passive) return;
    this.h = h;
    this.w = w;
    hd.pts++;
    // D321, PLAY WITH IT by contact size: the thumb flattening (its size growing) swells the note, as
    // D311's sustain (twice the strength gained, −1..1); in place of the sideways move.
    const sense = this.o.sense;
    if (sense?.source === "size") {
      const r = sense.size(id);
      if (r.size !== null) hd.sizeTo = r.size;
      if (r.strength !== null && hd.size0 !== undefined) {
        const sv = Math.max(-1, Math.min(1, 2 * (r.strength - hd.size0)));
        if (Math.abs(sv - (hd.sizeSv ?? 0)) > 0.05) {
          hd.sizeSv = sv;
          hd.shapes++;
          hd.sMin = Math.min(hd.sMin, sv);
          hd.sMax = Math.max(hd.sMax, sv);
          for (const s of hd.sounds) s.shape?.(sv);
        }
      }
    } else if (MECH.expression && !this.kbOn) {
      // D311: the sustain, sideways from where it landed (D330: not on the keyboard, where sideways is pitch).
      const sv = holdValue(barDynamic(x, w) - hd.land);
      if (Math.abs(sv - hd.sNow) > 0.05) {
        hd.sNow = sv;
        hd.shapes++;
        hd.sMin = Math.min(hd.sMin, sv);
        hd.sMax = Math.max(hd.sMax, sv);
        for (const s of hd.sounds) s.shape?.(sv);
        for (const l of hd.trill?.live ?? []) l.sd.shape?.(sv);
      }
    }
    const t = this.tick();
    // D314/D319: a shake along the bar: a free ornament; once begun, no slides.
    if (MECH.freeOrnaments) {
      const legs = hd.shake.count;
      const kind = feedShake(hd.shake, x, y, ts, Math.max(MECH.shakeReachMinPx, this.rowH() * MECH.shakeReachRows));
      if (hd.shake.count > legs) (hd.lastLeg = ts), hd.shake.count >= 2 && (hd.pend = undefined);
      if (kind) return this.ornament(hd, kind, t);
      if (hd.shake.count > legs && hd.trill && !hd.trill.settled) hd.trill.last = Math.max(hd.trill.last, t);
      if (hd.shake.kind) return;
    }
    // A slide: the held thumb travelled into another row and stayed there a moment (SLIDE_DWELL_MS: a
    // shake's legs pass through the rows faster), not while a shake's legs are coming (two or more).
    if (!MECH.slides || hd.trill || hd.ornament) return;
    // D330: on the keyboard a slide may go sideways (white to black and back): the distance moved, both ways.
    const moved = this.kbOn ? Math.hypot(x - hd.setX, y - hd.setY) : Math.abs(y - hd.setY);
    if (moved < 3) hd.still = ts;
    // D321, "connect" on a sound that bends: the pitch follows the thumb between the rows.
    if (this.glides(hd)) return this.follow(id, hd, x, y, ts);
    const row = this.hitAt(x, y, w, h).row;
    if (row === hd.row || moved < Math.max(MECH.slideMinPx, this.rowH() * 0.5)) return void (hd.pend = undefined);
    if (hd.pend?.row !== row) hd.pend = { row, since: ts, x, y };
    else (hd.pend.x = x), (hd.pend.y = y);
    this.trySlide(id, hd, ts);
  }

  /** A slide waiting its dwell: taken once the thumb has stayed in the new row SLIDE_DWELL_MS, no shake leg meanwhile. */
  private trySlide(id: number, hd: Held, ts: number) {
    const p = hd.pend;
    if (!p || ts - p.since < SLIDE_DWELL_MS || (hd.shake.count >= 2 && ts - hd.lastLeg < MECH.shakeWindowMs) || hd.shake.kind) return;
    hd.pend = undefined;
    const { row, x, y } = p;
    const from = hd.midi;
    const midi = this.rows[row];
    const now = this.chip.ctx.currentTime;
    const one = hd.sounds.length === 1 ? hd.sounds[0] : null;
    const fill = MECH.dragMeaning === "connect" && dragFamily(preset().id) === "fill" ? dragFill(from, midi, scaleOfKey(this.f.key)) : null;
    const dragMs = Math.max(0, p.since - hd.still);
    if (fill) {
      // D321, "connect" on a keyboard: the coulé or the Schleifer, then the note, joined (a step: the note).
      const each = fillNoteMs(fill.notes.length, dragMs) / 1000;
      for (const s of hd.sounds) s.stop(now + 0.02);
      hd.sounds = [...fill.notes.map((m, k) => this.chip.note(m, now + k * each, each, hd.v, hd.play)), this.chip.note(midi, now + fill.notes.length * each, HOLD_MAX, hd.v, hd.play)];
    } else if (one?.glide) one.glide(midi);
    else {
      for (const s of hd.sounds) s.stop(now + 0.02);
      hd.sounds = [this.chip.note(midi, now, HOLD_MAX, hd.v, hd.play)];
    }
    const last = [...this.played].reverse().find((q) => q.id === id && q.off === undefined);
    if (last) last.off = now;
    this.played.push({ row, on: now, side: hd.side, id });
    if (fill) this.say(`↝ ${dragLine((m) => this.name(m), from, midi, { fill })} · the drag took ${Math.round(dragMs)} ms`);
    else if (this.kbOn) this.say(`↕ SLIDE ${this.name(from)} → ${this.name(midi)}${this.keyLine(this.hitAt(x, y))} (${hd.side === "left" ? "L" : "R"} thumb moved ${Math.round(Math.abs(y - hd.setY))} px ${y < hd.setY ? "up" : "down"}, ${Math.round(Math.abs(barAcross(x, this.w) - barAcross(hd.setX, this.w)) * this.w * BAR)} px ${barAcross(x, this.w) < barAcross(hd.setX, this.w) ? "in" : "out"} while held)${one?.glide ? "" : " · this sound cannot glide: a new joined note"}`);
    else this.say(`↕ SLIDE ${this.name(from)} → ${this.name(midi)} (${hd.side === "left" ? "L" : "R"} thumb moved ${Math.round(Math.abs(y - hd.setY))} px ${y < hd.setY ? "up" : "down"} while held)${one?.glide ? "" : " · this sound cannot glide: a new joined note"}`);
    hd.row = row;
    hd.midi = midi;
    hd.setY = y;
    hd.setX = x;
    hd.shake = shakeTracker(y, x, ts);
  }

  /** D321: a drag here is a glide (MECH.dragMeaning "connect", a sound that bends, one note sounding). */
  private glides(hd: Held): boolean {
    return MECH.dragMeaning === "connect" && dragFamily(preset().id) === "glide" && hd.sounds.length === 1 && !!hd.sounds[0].glide;
  }

  /**
   * D321, the portamento: the pitch follows the thumb continuously, a row's height a row from where it
   * landed (drag.ts pitchAtRow: in tune within 0.3 of a row of each row's place, gliding between);
   * arrived on a row after SLIDE_DWELL_MS there (arrive: the line).
   */
  private follow(id: number, hd: Held, x: number, y: number, ts: number) {
    const g = (hd.gl ??= { refRow: hd.row, refY: hd.setY, leftAt: hd.still });
    // D330: on the keyboard the pitch goes to the key under the thumb (the hit test), the sound gliding there.
    const pos = this.kbOn ? this.hitAt(x, y).row : g.refRow + (g.refY - y) / this.rowH();
    hd.sounds[0].glide!(pitchAtRow(this.rows, pos));
    const r = snappedRow(this.rows, pos);
    if (r === hd.row) return void ((g.at = undefined), (g.leftAt = ts));
    if (r === null) return void (g.at = undefined);
    if (g.at?.row !== r) g.at = { row: r, since: ts };
    this.arrive(id, hd, ts);
  }
  private arrive(id: number, hd: Held, ts: number) {
    const g = hd.gl;
    if (!g?.at || ts - g.at.since < SLIDE_DWELL_MS) return;
    const { row, since } = g.at;
    const from = hd.midi;
    const midi = this.rows[row];
    const now = this.chip.ctx.currentTime;
    const last = [...this.played].reverse().find((q) => q.id === id && q.off === undefined);
    if (last) last.off = now;
    this.played.push({ row, on: now, side: hd.side, id });
    this.say(`↝ ${dragLine((m) => this.name(m), from, midi, { glideMs: Math.max(0, since - g.leftAt) })} · the pitch following the ${hd.side === "left" ? "L" : "R"} thumb`);
    hd.row = row;
    hd.midi = midi;
    g.at = undefined;
    g.leftAt = ts;
  }

  /** D314: a shake became an ornament: its notes from now, on the key's neighbours; a trill (D319) goes on while the shake does. */
  private ornament(hd: Held, kind: FreeKind, t: number) {
    const long = MECH.trillFollowsShake ? HOLD_MAX * this.tps : 2 * this.beatS * this.tps;
    const parts = freeOrnamentParts(this.f, kind, -1, hd.midi, t, t + (kind === "trill" ? long : HOLD_MAX * this.tps), this.o.bpm);
    if (!parts.length) return;
    const now = this.chip.ctx.currentTime;
    for (const s of hd.sounds) s.stop(now + 0.02);
    hd.sounds = [];
    hd.ornament = kind;
    if (kind === "trill") {
      hd.trill = { parts, next: 0, last: t, settled: false, live: [] };
      this.trillStep(hd, t);
    } else
      hd.sounds = parts.map(([pon, pdur, pm], k) => {
        const at = now + Math.max(0, (pon - t) / this.tps);
        const last = k === parts.length - 1;
        return this.chip.note(pm, at, last ? HOLD_MAX : Math.max(0.03, pdur / this.tps), hd.v, hd.play);
      });
    const notes = kind === "trill" ? "" : ` (${parts.map((p) => this.name(p[2])).join(" ")})`;
    this.say(`~ SHAKE: ${kind === "mordent" ? "mordent (down and back)" : kind === "short" ? "short trill (up and back)" : `trill from ${this.name(parts[0][2])} (a third leg)${MECH.trillFollowsShake ? ", on while you shake" : ", two beats"}`} on ${this.name(hd.midi)}${notes}`);
  }

  private trillStep(hd: Held, now: number) {
    const r = hd.trill!;
    const t0 = this.chip.ctx.currentTime;
    const audioAt = (tick: number) => t0 + Math.max(0, (tick - now) / this.tps);
    const keep = (sd: Sounding, end: number) => {
      r.live = r.live.filter((x) => x.end > t0);
      r.live.push({ sd, end });
      hd.sounds = r.live.map((x) => x.sd);
    };
    if (r.next < r.parts.length && MECH.trillFollowsShake && now - r.last > (MECH.trillStopMs / 1000) * this.tps) {
      const prev = r.parts[r.next - 1];
      const from = prev ? Math.max(now, prev[0] + prev[1]) : now;
      const at = audioAt(from);
      keep(this.chip.note(hd.midi, at, HOLD_MAX, hd.v, hd.play), at + HOLD_MAX);
      this.say(`~ TRILL SETTLED on ${this.name(hd.midi)} after ${r.next} trill notes (no leg for ${MECH.trillStopMs} ms)`);
      r.next = r.parts.length;
      r.settled = true;
      return;
    }
    const ahead = now + TRILL_AHEAD_S * this.tps;
    while (r.next < r.parts.length && r.parts[r.next][0] <= ahead) {
      const [pon, pdur, pm] = r.parts[r.next];
      const last = r.next === r.parts.length - 1;
      const at = audioAt(pon);
      const len = last ? HOLD_MAX : Math.max(0.03, pdur / this.tps);
      keep(this.chip.note(pm, at, len, hd.v, hd.play), at + len);
      r.next++;
    }
    if (r.next >= r.parts.length) r.settled = true;
  }

  up(id: number, _ts: number, cancelled: boolean) {
    if (this.rolls.delete(id)) return;
    const hd = this.held.get(id);
    if (!hd) return;
    this.held.delete(id);
    const now = this.chip.ctx.currentTime;
    for (const s of hd.sounds) s.stop(now);
    if (hd.trill) hd.trill.settled = true;
    const p = [...this.played].reverse().find((q) => q.id === id && q.off === undefined);
    if (p) p.off = now;
    this.lastLift = { side: hd.side, at: now, midi: hd.midi };
    const held = Math.round((now - hd.at) * 1000);
    const sus = hd.sizeFrom !== undefined ? ` · contact size ${hd.sizeFrom.toFixed(1)} → ${(hd.sizeTo ?? hd.sizeFrom).toFixed(1)} px (flattening: ${hd.shapes} sustain moves${hd.shapes ? `, up to ${hd.sMax.toFixed(2)}` : ""})` : !MECH.expression ? "" : hd.shapes ? ` · sustain moves: ${hd.shapes}, from ${hd.sMin.toFixed(2)} to ${hd.sMax.toFixed(2)} (−1 toward the soft side, +1 the strong)` : " · no sustain move";
    this.say(`${cancelled ? "! IOS CANCEL" : "↑ LIFT"} ${this.name(hd.midi)} after ${held} ms${sus}${hd.ornament ? ` · ${hd.ornament}` : ""}`);
  }

  /** Each frame: the trills' next notes, the metronome's clicks scheduled a moment ahead. */
  frame() {
    const t = this.tick();
    for (const hd of this.held.values()) if (hd.trill && !hd.trill.settled) this.trillStep(hd, t);
    const ms = performance.now();
    for (const [id, hd] of this.held) if (hd.pend && !hd.passive) this.trySlide(id, hd, ms);
    for (const [id, hd] of this.held) if (hd.gl?.at && !hd.passive) this.arrive(id, hd, ms);
    if (!this.o.click) return;
    const now = this.chip.ctx.currentTime;
    while (this.nextClick < now + 0.15) {
      if (this.nextClick >= now - 0.02) this.chip.tick(this.nextClick, this.beatN % this.perBar === 0, 0.08);
      this.nextClick += this.beatS;
      this.beatN++;
    }
  }

  stop() {
    const now = this.chip.ctx.currentTime;
    for (const hd of this.held.values()) for (const s of hd.sounds) s.stop(now);
    this.held.clear();
  }

  /**
   * The rows over the whole play area: a faint line a row (the key's tonic brighter), the note names
   * along each bar's inner edge; a held row lit in the thumb's colour; between the bars, the last few
   * seconds of what was played as a roll (time right to left, the newest at the right).
   */
  paint(g: CanvasRenderingContext2D, w: number, h: number) {
    this.h = h;
    const rh = this.rowH(h);
    const bw = w * BAR;
    const { tonic } = keyOf(this.f.key);
    const now = this.chip.ctx.currentTime;
    const lit = new Map<number, Side>();
    for (const hd of this.held.values()) lit.set(hd.row, hd.side);
    g.save();
    this.w = w;
    if (this.kbOn) this.paintKeys(g, w, h, lit, tonic);
    g.font = `${Math.max(8, Math.min(11, rh * 0.6))}px ui-monospace, Menlo, monospace`;
    g.textBaseline = "middle";
    if (!this.kbOn) this.rows.forEach((m, r) => {
      const y = this.yOf(r, h);
      const isTonic = ((m % 12) + 12) % 12 === tonic;
      const side = lit.get(r);
      if (side) {
        g.fillStyle = side === "left" ? "rgba(185,164,255,0.28)" : "rgba(255,127,191,0.28)";
        g.fillRect(0, y - rh / 2, bw, rh);
        g.fillRect(w - bw, y - rh / 2, bw, rh);
      }
      g.fillStyle = isTonic ? "rgba(255,243,166,0.32)" : "rgba(236,234,217,0.10)";
      g.fillRect(0, Math.round(y - rh / 2), bw, 1);
      g.fillRect(w - bw, Math.round(y - rh / 2), bw, 1);
      if (rh >= 9 || isTonic) {
        g.fillStyle = side ? "#fff3a6" : isTonic ? "rgba(255,243,166,0.8)" : "rgba(236,234,217,0.45)";
        const nm = this.name(m);
        g.textAlign = "right";
        g.fillText(nm, bw - 4, y);
        g.textAlign = "left";
        g.fillText(nm, w - bw + 4, y);
      }
    });
    // The roll between the bars.
    const x0 = bw + 6;
    const x1 = w - bw - 6;
    const xOf = (s: number) => x1 - ((now - s) / ROLL_S) * (x1 - x0);
    for (const p of this.played) {
      const a = xOf(p.on);
      const b = xOf(p.off ?? now);
      if (b < x0) continue;
      const y = this.yOf(p.row, h);
      g.fillStyle = p.side === "left" ? "#b9a4ff" : "#ff7fbf";
      g.globalAlpha = p.off === undefined ? 0.95 : 0.6;
      g.fillRect(Math.max(x0, a), y - Math.min(4, rh / 3), Math.max(2, b - Math.max(x0, a)), Math.max(3, Math.min(8, (rh * 2) / 3)));
    }
    g.restore();
  }

  /** D330's black keys' outlines for the geometry they were traced on. */
  private outlines?: { kb: Keyboard; paths: Map<number, [number, number][]> };
  /**
   * D330: the keyboard on each bar, mirrored: white keys across the whole bar (the outer edge the
   * phone's), black keys from the inner edge with the hit test's own tapered tips; a held key lit in
   * its thumb's colour; the pitch names (optional) at the white keys' outer end and the black keys' inner.
   */
  private paintKeys(g: CanvasRenderingContext2D, w: number, h: number, lit: Map<number, Side>, tonic: number) {
    const kb = this.keyboard(w, h);
    const bw = kb.bw;
    if (this.outlines?.kb !== kb) this.outlines = { kb, paths: new Map(kb.keys.filter((k) => !k.white).map((k) => [k.row, kb.outline(k.row, 2)])) };
    const tint = (s: Side) => (s === "left" ? "#b9a4ff" : "#ff7fbf");
    const labels = this.o.kb?.labels ?? true;
    // PIANO: a piano's own names (C, C♯ …), not the piece's spelling (B♯, C𝄪 in G♯ minor).
    const PLAIN = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
    const label = (m: number) => (this.o.kb?.white === "piano" ? `${PLAIN[pcOf(m)]}${Math.floor(m / 12) - 1}` : this.name(m));
    const fs = Math.max(8, Math.min(11, kb.wh * 0.45));
    g.font = `${fs}px ui-monospace, Menlo, monospace`;
    g.textBaseline = "middle";
    for (const left of [true, false]) {
      const X = (u: number) => (left ? bw - u : w - bw + u);
      const x0 = left ? 0 : w - bw;
      for (const k of kb.keys) {
        if (!k.white) continue;
        const s = lit.get(k.row);
        const top = Math.round(k.y - k.h / 2);
        g.fillStyle = s ? tint(s) : pcOf(k.midi) === tonic ? "#efe3b4" : "#dcd8c6";
        g.fillRect(x0, top, bw, Math.round(k.y + k.h / 2) - top);
        g.fillStyle = "#3b3846";
        g.fillRect(x0, top, bw, 1);
        if (labels) {
          g.fillStyle = "#3b3846";
          g.textAlign = left ? "left" : "right";
          g.fillText(label(k.midi), left ? 4 : w - 4, k.y);
        }
      }
      for (const k of kb.keys) {
        if (k.white) continue;
        const pts = this.outlines.paths.get(k.row) ?? [];
        if (!pts.length) continue;
        const s = lit.get(k.row);
        g.beginPath();
        g.moveTo(X(0), pts[0][1]);
        for (const [u, y] of pts) g.lineTo(X(u), y);
        g.lineTo(X(0), pts[pts.length - 1][1]);
        g.closePath();
        g.fillStyle = s ? tint(s) : "#1f1d27";
        g.fill();
        g.strokeStyle = "#5d5870";
        g.lineWidth = 1;
        g.stroke();
        if (labels && k.h >= 9) {
          g.fillStyle = s ? "#1f1d27" : "#cfcbe0";
          g.textAlign = left ? "right" : "left";
          g.fillText(label(k.midi), left ? bw - 3 : w - bw + 3, k.y);
        }
      }
    }
  }
}
