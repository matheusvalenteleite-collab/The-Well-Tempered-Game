/**
 * D324, THE LAB's TABLE (the owner: "whether we ought to introduce third and fourth finger dynamics …
 * laying the iphone flat in a table and playing over it using two fingers per hand? another hypothesis
 * is playing the iphone laying flat on table like a piano, using four fingers in each hand … just simple
 * prototypes in lab"). Two free-play prototypes for a phone lying flat, landscape, the whole screen:
 *   - FINGERS: four vertical bars, two a hand (from the left: L middle, L index, R index, R middle); the
 *     pitch is the row under the finger (FREE PLAY's rows, high at the top). ACCENT on: the inner bars
 *     (index fingers) strike soft, the outer (middle fingers) strong; off: all the middle.
 *   - PIANO: keys across the screen: the key's scale over an octave and a half (11 keys, one row), or one
 *     octave chromatic laid out as a piano's (8 white keys, 5 black above). Each touch strikes its key;
 *     the contact's size (PointerEvent width/height, when the device gives it) as the velocity.
 * JOINED as in the game: a touch landing while another holds takes over without a new attack (the held
 * note gives way, Play.legato); a handover within MECH.legatoGapMs of a lift sounds joined with
 * MECH.joinedSound. PIANO's CHORDS: every key struck and ringing, nothing joined. Every touch counted:
 * how many are down, the most seen, every iOS cancel (iPhone tracks five: a sixth may cancel them all).
 * Each event a line for WHAT HAPPENED. Nothing judged or recorded.
 */
import { voicing, type Chip, type Play, type Sounding } from "../../touch/chip.ts";
import type { TouchFugue } from "../../touch/fugue.ts";
import { MECH } from "../mechanics.ts";
import { dynamic } from "../protos.ts";
import { freeRows, keyOf, type FreeScale } from "./free.ts";
import { pitchName } from "./replay.ts";

export type TableMode = "fingers" | "piano";
export type PianoLayout = "scale" | "chromatic";
export type PianoOverlap = "legato" | "chords";

export interface TableOptions {
  mode: TableMode;
  /** FINGERS: inner bars soft, outer strong. */
  accent: boolean;
  scale: FreeScale;
  octaves: number;
  layout: PianoLayout;
  overlap: PianoOverlap;
  /** PIANO: the contact's size as the velocity (else the middle). */
  sizeVelocity: boolean;
}

const HOLD_MAX = 8;
/** FINGERS' bars across the screen (fractions of its width), from the left, and their fingers. */
export const BARS: { x0: number; x1: number; name: string; outer: boolean }[] = [
  { x0: 0.01, x1: 0.23, name: "L middle", outer: true },
  { x0: 0.25, x1: 0.47, name: "L index", outer: false },
  { x0: 0.53, x1: 0.75, name: "R index", outer: false },
  { x0: 0.77, x1: 0.99, name: "R middle", outer: true },
];
/** FINGERS' strengths with ACCENT on (inner, outer) and off. */
export const SOFT = 0.3;
export const STRONG = 0.85;
export const MIDDLE = 0.5;
/** Several cancels within this long (ms) are one: iOS taking every touch back at once. */
const CANCEL_BURST_MS = 80;

/** The bar under a place across (0..1): the nearest, a gap belonging to the bar beside it. */
export function barAt(fx: number): number {
  let best = 0;
  let d = Infinity;
  BARS.forEach((b, i) => {
    const e = fx < b.x0 ? b.x0 - fx : fx > b.x1 ? fx - b.x1 : 0;
    if (e < d) (d = e), (best = i);
  });
  return best;
}

/** The row (index into `count` rows, 0 the lowest) at a height (0 the top, 1 the foot). */
export function rowAtFrac(fy: number, count: number): number {
  return Math.max(0, Math.min(count - 1, count - 1 - Math.floor(fy * count)));
}

export interface PianoKey {
  midi: number;
  x0: number;
  x1: number;
  /** The black keys stand in the upper part (0..y1 of the height). */
  black: boolean;
  y1: number;
}

/** The voice's middle (MIDI): FREE PLAY's centre. */
function middleOf(f: TouchFugue, voice: number): number {
  const ns = f.voices[voice] ?? f.voices[0];
  return Math.round((Math.min(...ns.map((n) => n[2])) + Math.max(...ns.map((n) => n[2]))) / 2);
}

/**
 * PIANO's keys: SCALE, the key's scale (natural minor in a minor key) from the tonic below the voice's
 * middle up an octave and a half, 11 equal keys; CHROMATIC, one octave from the C below the middle as a
 * piano lays it out (C to C: 8 white keys across, the 5 black above between them, 60% of the height).
 */
export function pianoKeys(f: TouchFugue, voice: number, layout: PianoLayout): PianoKey[] {
  const mid = middleOf(f, voice);
  if (layout === "scale") {
    const { tonic, minor } = keyOf(f.key);
    const deg = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    let root = mid - (((mid - tonic) % 12) + 12) % 12;
    if (mid - root < 3) root -= 12;
    const ms: number[] = [];
    for (let k = 0; ms.length < 11; k++) ms.push(root + 12 * Math.floor(k / 7) + deg[k % 7]);
    return ms.map((midi, i) => ({ midi, x0: i / 11, x1: (i + 1) / 11, black: false, y1: 1 }));
  }
  const c = mid - (((mid % 12) + 12) % 12);
  const whites = [0, 2, 4, 5, 7, 9, 11, 12];
  const ww = 1 / whites.length;
  const keys: PianoKey[] = whites.map((s, i) => ({ midi: c + s, x0: i * ww, x1: (i + 1) * ww, black: false, y1: 1 }));
  // A black key over the line between two whites (after C, D, F, G, A).
  for (const [after, s] of [[0, 1], [1, 3], [3, 6], [4, 8], [5, 10]] as const) {
    const x = (after + 1) * ww;
    keys.push({ midi: c + s, x0: x - ww * 0.32, x1: x + ww * 0.32, black: true, y1: 0.6 });
  }
  return keys;
}

/** The key under a place (fractions of the screen): a black key first, where it stands. */
export function keyAt(keys: readonly PianoKey[], fx: number, fy: number): number {
  const i = keys.findIndex((k) => k.black && fy <= k.y1 && fx >= k.x0 && fx < k.x1);
  if (i >= 0) return i;
  const j = keys.findIndex((k) => !k.black && fx >= k.x0 && fx < k.x1);
  return j >= 0 ? j : fx < 0.5 ? keys.findIndex((k) => !k.black) : keys.length - 1 - [...keys].reverse().findIndex((k) => !k.black);
}

/** The velocity from a contact's size (CSS px, the larger of width and height): null when the device gives none (a mouse's 1, or 0). */
export function sizeVelocity(size: number): number | null {
  if (!(size > 1.5)) return null;
  return Math.max(0.1, Math.min(1, 0.1 + ((size - 10) / 40) * 0.9));
}

interface Held {
  /** The bar or key, its pitch, its strength. */
  place: number;
  midi: number;
  strength: number;
  at: number;
  sounds: Sounding[];
  /** Another took over (joined): this one only holds, silent. */
  passive?: boolean;
  label: string;
}

export class TablePlay {
  readonly rows: number[];
  readonly keys: PianoKey[];
  readonly f: TouchFugue;
  readonly voice: number;
  readonly o: TableOptions;
  private readonly chip: Chip;
  private readonly line: (text: string) => void;
  private readonly t0: number;
  held = new Map<number, Held>();
  private lastLift: number | null = null;
  /** Touches down now, the most at once, the cancels and the cancel bursts (iOS taking all back). */
  maxSeen = 0;
  cancels = 0;
  bursts = 0;
  private burst: { at: number; n: number; of: number } | null = null;
  lines = 0;

  constructor(f: TouchFugue, voice: number, chip: Chip, o: TableOptions, line: (text: string) => void) {
    this.f = f;
    this.voice = voice;
    this.chip = chip;
    this.o = o;
    this.line = line;
    this.rows = freeRows(f, voice, o.scale, o.octaves);
    this.keys = pianoKeys(f, voice, o.layout);
    this.t0 = chip.ctx.currentTime;
  }

  get active(): number {
    return this.held.size;
  }
  name(midi: number): string {
    return pitchName(this.f.id, midi);
  }
  private say(text: string) {
    this.lines++;
    this.line(`${(this.chip.ctx.currentTime - this.t0).toFixed(1)}s ${text}`);
  }
  /** Every pitch it may play (for the chip to prepare). */
  pitches(): number[] {
    return this.o.mode === "fingers" ? this.rows : this.keys.map((k) => k.midi);
  }

  /** A touch at (fx, fy) (fractions of the screen), its contact `size` px (0: none given). */
  down(id: number, fx: number, fy: number, size: number, ts: number) {
    const now = this.chip.ctx.currentTime;
    let place: number, midi: number, strength: number, label: string, what: string;
    if (this.o.mode === "fingers") {
      place = barAt(fx);
      const b = BARS[place];
      midi = this.rows[rowAtFrac(fy, this.rows.length)];
      strength = this.o.accent ? (b.outer ? STRONG : SOFT) : MIDDLE;
      label = b.name;
      what = `${b.name} (${b.outer ? "outer" : "inner"} bar) · strength ${strength.toFixed(2)}${this.o.accent ? (b.outer ? " (accent: outer strong)" : " (accent: inner soft)") : " (accent off)"}`;
    } else {
      place = keyAt(this.keys, fx, fy);
      const k = this.keys[place];
      midi = k.midi;
      const v = sizeVelocity(size);
      strength = this.o.sizeVelocity && v !== null ? v : MIDDLE;
      label = `${k.black ? "black" : "white"} key ${place + 1}`;
      what = `${label} · size ${size ? size.toFixed(1) : "0"} px${v === null ? " (none given)" : ""} · velocity ${strength.toFixed(2)}${this.o.sizeVelocity ? "" : " (size off: the middle)"}`;
    }
    const chords = this.o.mode === "piano" && this.o.overlap === "chords";
    let joined = false;
    if (!chords)
      for (const [hid, o] of this.held) {
        if (hid === id || o.passive) continue;
        joined = true;
        o.passive = true;
        for (const sd of o.sounds) sd.stop(now + 0.03);
        o.sounds = [];
      }
    const gap = this.lastLift === null ? Infinity : (now - this.lastLift) * 1000;
    const handover = !chords && !joined && gap <= MECH.legatoGapMs;
    const v = voicing(this.voice, this.f.voices.length, true);
    const play: Play = { ...dynamic(0.5), lead: true, envelope: "synth", touch: strength, legato: joined || (handover && MECH.joinedSound) };
    const sounds = [this.chip.note(midi, now, HOLD_MAX, v, play)];
    this.held.set(id, { place, midi, strength, at: now, sounds, label });
    this.maxSeen = Math.max(this.maxSeen, this.held.size);
    let join = "";
    if (joined) join = " · ⌒ JOINED: another finger still down (no new attack)";
    else if (handover) join = ` · ⌒ JOINED by handover: gap ${Math.round(gap)} ms ≤ ${MECH.legatoGapMs} ms${MECH.joinedSound ? "" : " (a new attack: joined sound off)"}`;
    else if (chords && this.held.size > 1) join = " · CHORD (all ring)";
    else if (gap < 1500) join = ` · NOT JOINED: gap ${Math.round(gap)} ms > ${MECH.legatoGapMs} ms`;
    this.say(`♩ ${this.name(midi)} · ${what} · ${this.held.size} down${join}`);
    void ts;
  }

  up(id: number, ts: number, cancelled: boolean) {
    const hd = this.held.get(id);
    const before = this.held.size;
    let all = false;
    if (cancelled) {
      this.cancels++;
      // Several taken back together: iOS cancelling them all (a sixth finger past its five?).
      if (this.burst && ts - this.burst.at <= CANCEL_BURST_MS) {
        this.burst.n++;
        if (this.burst.n === 2) this.bursts++;
        all = this.burst.n === this.burst.of;
      } else this.burst = { at: ts, n: 1, of: before };
    }
    if (hd) {
      this.held.delete(id);
      const now = this.chip.ctx.currentTime;
      for (const s of hd.sounds) s.stop(now);
      this.lastLift = now;
      this.say(`${cancelled ? "! IOS CANCEL" : "↑ LIFT"} ${this.name(hd.midi)} (${hd.label}) after ${Math.round((now - hd.at) * 1000)} ms · ${this.held.size} down`);
    }
    if (all) this.say(`! IOS CANCELLED ALL ${this.burst!.n} touches at once (the most seen ${this.maxSeen})`);
  }

  stop() {
    const now = this.chip.ctx.currentTime;
    for (const hd of this.held.values()) for (const s of hd.sounds) s.stop(now);
    this.held.clear();
  }

  /** The bars and their rows, or the keys; what is held lit. */
  paint(g: CanvasRenderingContext2D, w: number, h: number) {
    const lit = new Map<string, number>();
    for (const hd of this.held.values()) lit.set(`${hd.place}:${hd.midi}`, hd.strength);
    const { tonic } = keyOf(this.f.key);
    g.save();
    g.fillStyle = "#0b0d18";
    g.fillRect(0, 0, w, h);
    g.textBaseline = "middle";
    g.textAlign = "center";
    if (this.o.mode === "fingers") {
      const n = this.rows.length;
      const rh = h / n;
      g.font = `${Math.max(8, Math.min(12, rh * 0.6))}px ui-monospace, Menlo, monospace`;
      BARS.forEach((b, i) => {
        const x = b.x0 * w;
        const bw = (b.x1 - b.x0) * w;
        g.fillStyle = b.outer ? "rgba(255,127,191,0.10)" : "rgba(185,164,255,0.10)";
        g.fillRect(x, 0, bw, h);
        this.rows.forEach((m, r) => {
          const y = (n - 1 - r) * rh;
          const s = lit.get(`${i}:${m}`);
          if (s !== undefined) {
            g.fillStyle = b.outer ? "rgba(255,127,191,0.55)" : "rgba(185,164,255,0.55)";
            g.fillRect(x, y, bw, rh);
          }
          const isTonic = ((m % 12) + 12) % 12 === tonic;
          g.fillStyle = isTonic ? "rgba(255,243,166,0.35)" : "rgba(236,234,217,0.10)";
          g.fillRect(x, Math.round(y), bw, 1);
          if (rh >= 10 || isTonic) {
            g.fillStyle = s !== undefined ? "#fff3a6" : isTonic ? "rgba(255,243,166,0.8)" : "rgba(236,234,217,0.4)";
            g.fillText(this.name(m), x + bw / 2, y + rh / 2);
          }
        });
        g.fillStyle = "rgba(236,234,217,0.55)";
        g.fillText(`${b.name}${this.o.accent ? (b.outer ? " · strong" : " · soft") : ""}`, x + bw / 2, h - 8);
      });
    } else {
      g.font = "12px ui-monospace, Menlo, monospace";
      const draw = (black: boolean) =>
        this.keys.forEach((k, i) => {
          if (k.black !== black) return;
          const x = k.x0 * w + 1;
          const kw = (k.x1 - k.x0) * w - 2;
          const kh = k.y1 * h - 2;
          const on = lit.has(`${i}:${k.midi}`);
          g.fillStyle = on ? "#ffd23f" : black ? "#1d2033" : "#d9d6c3";
          g.fillRect(x, 1, kw, kh);
          if (black) (g.strokeStyle = "#555a7a"), g.strokeRect(x, 1, kw, kh);
          g.fillStyle = black ? (on ? "#0b0d18" : "#ecead9") : "#0b0d18";
          g.fillText(this.name(k.midi), x + kw / 2, kh - 14);
        });
      draw(false);
      draw(true);
    }
    g.restore();
  }
}
