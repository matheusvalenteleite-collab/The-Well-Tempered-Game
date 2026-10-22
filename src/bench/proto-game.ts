/**
 * The testbench's game (D175): one voice of a piece played against the others, judged by a prototype
 * (protos.ts). The time picks the note (the pending one nearest in time, within the window); the
 * prototype judges the gesture: right, Bach's note sounds clear; wrong, it sounds muffled and does not
 * count. Every note wants its own onset. On the audio clock as heard (the sound's delay set by
 * tapping, chip.lag).
 */
import { voicing, type Chip, type Sounding } from "../touch/chip.ts";
import type { Grade } from "../touch/engine.ts";
import { beatOf, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { chordOf, laneNotes, options, strike, sweep, type LaneNote, type LaneOptions } from "../touch/lanes.ts";
import type { Side } from "../touch/thumbs.ts";
import { accompaniment, type OtherNote } from "../touch/voice-mode.ts";
import { FLICK_MS, moves, SLIDE_PX, type Gesture, type Move, type Options, type Proto } from "./protos.ts";

export const PERFECT_MS = 70;
/** How far ahead the next note shows under the thumbs, in ms. */
export const APPROACH_MS = 1100;
const BEND_PX = 40;
const BEND_CENTS = 30;
const HOLD_MAX = 8;

export interface Contact {
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Held {
  side: Side;
  x0: number;
  /** Where it landed or last slid on (y), for the next slide. */
  ay: number;
  y0: number;
  /** The note it plays (-1 none), its chord, its sound. */
  note: number;
  chord: number[];
  sounds: Sounding[];
  /** FLICK: the note waits to be judged until the flick is read (by this time, ms). */
  judgeBy?: number;
  dy: number;
}

export class ProtoGame {
  readonly f: TouchFugue;
  readonly voice: number;
  readonly notes: LaneNote[];
  readonly moves: Move[];
  readonly others: OtherNote[];
  readonly start: number;
  readonly entry: number;
  readonly end: number;
  readonly tps: number;
  readonly opt: LaneOptions;
  readonly proto: Proto;
  readonly o: Options;
  now = 0;
  combo = 0;
  grade: Grade | null = null;
  /** The last gesture that played a note, for the rules that measure from it. */
  last: Gesture | null = null;
  private chip: Chip;
  private beat: number;
  private perBar: number;
  private anchorAt: number;
  private anchorTick: number;
  private nextBeat: number;
  private nextOther = 0;
  private held = new Map<number, Held>();

  constructor(f: TouchFugue, voice: number, from: number, proto: Proto, o: Options & { bpm: number }, chip: Chip) {
    this.f = f;
    this.voice = voice;
    this.proto = proto;
    this.o = o;
    this.chip = chip;
    const b = beatOf(f);
    this.beat = b.ticks;
    this.perBar = b.perBar;
    this.notes = laneNotes(
      f.voices[voice].filter(([on]) => on >= from),
      this.beat,
      voice,
    );
    this.moves = moves(this.notes, this.beat);
    this.others = accompaniment(f, from, voice);
    this.start = from - 4 * this.beat;
    this.entry = from;
    this.end = f.length + this.beat;
    this.tps = (this.beat * o.bpm) / 60;
    this.opt = options(this.beat, o.bpm, "easy");
    this.anchorAt = chip.ctx.currentTime + 0.15;
    this.anchorTick = this.start;
    this.nextBeat = this.start;
  }

  private tickAt(t: number) {
    return this.anchorTick + (t - this.anchorAt) * this.tps;
  }
  private timeAt(tick: number) {
    return this.anchorAt + (tick - this.anchorTick) / this.tps;
  }
  private tickOf(ts: number) {
    return this.tickAt(this.chip.heard() - (performance.now() - ts) / 1000);
  }

  /** One frame: the beat and the others scheduled ahead; flicks read; notes gone by marked missed. True at the end. */
  step(): boolean {
    const ch = this.chip;
    this.now = this.tickAt(ch.heard());
    const horizon = Math.min(this.tickAt(ch.ctx.currentTime + 0.25), this.end);
    while (this.nextBeat <= horizon) {
      const accent = Math.round((this.nextBeat - this.start) / this.beat) % this.perBar === 0;
      ch.tick(this.timeAt(this.nextBeat), accent, this.nextBeat < this.entry ? 0.12 : 0.02);
      this.nextBeat += this.beat;
    }
    while (this.nextOther < this.others.length && this.others[this.nextOther].on <= horizon) {
      const n = this.others[this.nextOther++];
      if (n.on < this.now - this.beat) continue;
      ch.note(n.midi, this.timeAt(n.on), n.dur / this.tps, voicing(n.voice, this.f.voices.length, false));
    }
    const t = performance.now();
    for (const h of this.held.values()) if (h.judgeBy !== undefined && t >= h.judgeBy) this.judgeFlick(h);
    if (sweep(this.notes, this.now, this.opt)) {
      this.combo = 0;
      this.grade = { text: "MISS", at: t };
    }
    if (this.now > this.end) {
      this.stopAll();
      return true;
    }
    return false;
  }

  countIn(): number {
    return this.now < this.entry ? Math.min(4, Math.ceil((this.entry - this.now) / this.beat)) : 0;
  }

  keyNow(): string {
    return keyAt(this.f, this.now);
  }

  /** The next note to play (index), if any. */
  next(): number {
    return this.notes.findIndex((n, i) => n.state === "pending" && n.on >= this.now - this.opt.late && !(i > 0 && this.notes[i - 1].on === n.on));
  }

  heldSides(): { side: Side; y: number }[] {
    return [...this.held.values()].map((h) => ({ side: h.side, y: h.ay }));
  }

  holding(i: number): boolean {
    for (const h of this.held.values()) if (h.chord.includes(i)) return true;
    return false;
  }

  down(id: number, c: Contact, ts: number) {
    const g: Gesture = { kind: "tap", ...c, dy: 0 };
    const h: Held = { side: c.side, x0: c.x, ay: c.y, y0: c.y, note: -1, chord: [], sounds: [], dy: 0 };
    this.held.set(id, h);
    const i = strike(this.notes, this.tickOf(ts), this.opt);
    if (i < 0) {
      this.grade = { text: "✕", at: performance.now(), side: c.side };
      return;
    }
    // Joined to the note the other thumb still holds.
    let legato = false;
    for (const [hid, o] of this.held) {
      if (hid === id || !o.sounds.length) continue;
      legato = true;
      for (const sd of o.sounds) sd.stop();
      o.sounds = [];
    }
    this.sound(h, i, g, legato);
    if (this.proto.flick) {
      h.judgeBy = performance.now() + FLICK_MS;
      return;
    }
    this.judge(h, g, this.last);
    this.last = g;
  }

  move(id: number, c: Contact, ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    if (h.judgeBy !== undefined) {
      if (Math.abs(c.y - h.y0) > Math.abs(h.dy)) h.dy = c.y - h.y0;
    }
    const cents = Math.max(-1, Math.min(1, (c.x - h.x0) / BEND_PX)) * BEND_CENTS;
    for (const s of h.sounds) s.bend(cents);
    if (!this.proto.slides || Math.abs(c.y - h.ay) < SLIDE_PX) return;
    // Slid on: the next note, glided into.
    const g: Gesture = { kind: "slide", ...c, dy: c.y - h.ay };
    h.ay = c.y;
    const before = h.note >= 0 ? this.moves[h.note] : undefined;
    const i = strike(this.notes, this.tickOf(ts), this.opt);
    if (i < 0) return;
    const glide = h.sounds.length === 1 && chordOf(this.notes, i).length === 1;
    if (glide) {
      h.sounds[0].glide?.(this.notes[i].midi);
      h.note = i;
      h.chord = [i];
    } else {
      for (const sd of h.sounds) sd.stop();
      this.sound(h, i, g, true);
    }
    this.judge(h, g, this.last, before);
    this.last = g;
  }

  up(id: number, _ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    if (h.judgeBy !== undefined) this.judgeFlick(h);
    for (const sd of h.sounds) sd.stop();
    this.held.delete(id);
  }

  private sound(h: Held, i: number, g: Gesture, legato: boolean) {
    const v = voicing(this.voice, this.f.voices.length, true);
    const level = this.proto.level?.(g) ?? 1;
    h.note = i;
    h.chord = chordOf(this.notes, i);
    h.sounds = h.chord.map((j) => this.chip.note(this.notes[j].midi, this.chip.ctx.currentTime, HOLD_MAX, v, { legato, level, muffleable: true }));
  }

  private judgeFlick(h: Held) {
    h.judgeBy = undefined;
    const g: Gesture = { kind: "flick", side: h.side, x: h.x0, y: h.y0, w: 0, h: 0, dy: h.dy };
    this.judge(h, g, this.last);
    this.last = g;
  }

  /** The gesture against the note's move: right, a hit graded by its time; wrong, muffled and not counted. */
  private judge(h: Held, g: Gesture, last: Gesture | null, heldMove?: Move) {
    const i = h.note;
    const n = this.notes[i];
    const at = performance.now();
    if (!this.proto.fits(this.moves[i], g, last, this.o, heldMove)) {
      for (const sd of h.sounds) sd.muffle?.();
      for (const j of h.chord) Object.assign(this.notes[j], { state: "miss", wrong: true });
      this.combo = 0;
      this.grade = { text: "✕", at, side: g.side };
      return;
    }
    const offMs = (((n.at ?? n.on) - n.on) / this.tps) * 1000;
    this.combo++;
    this.grade = Math.abs(offMs) <= PERFECT_MS ? { text: "PERFECT", at, side: g.side } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, side: g.side };
  }

  stopAll() {
    for (const h of this.held.values()) for (const sd of h.sounds) sd.stop();
    this.held.clear();
  }

  /** The notes (a chord once): played right, played with the wrong gesture, missed. */
  results(): { right: number; wrong: number; missed: number; of: number } {
    const r = { right: 0, wrong: 0, missed: 0, of: 0 };
    this.notes.forEach((n, i) => {
      if (i > 0 && this.notes[i - 1].on === n.on) return;
      r.of++;
      if (n.state === "hit") r.right++;
      else if (n.wrong) r.wrong++;
      else r.missed++;
    });
    return r;
  }
}
