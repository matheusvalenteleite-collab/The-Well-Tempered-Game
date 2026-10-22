/**
 * The testbench's game (D175; D178): one voice of a piece played against the others, judged by a
 * prototype (protos.ts). The time picks the note (the pending one nearest in time, within the
 * window); the prototype judges the gesture: right, Bach's note sounds; wrong, what the gesture asked
 * for sounds, muffled (the wrong interval, column or key), and it does not count. A held thumb slid on
 * plays the next note only where the slide reaches it. The touch's expression shapes every note. On
 * the audio clock as heard (the sound's delay set by tapping, chip.lag); a band's rhythm section
 * keeps the beat.
 */
import { voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";
import type { Grade } from "../touch/engine.ts";
import { beatOf, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { chordOf, laneNotes, options, strike, sweep, type LaneNote, type LaneOptions } from "../touch/lanes.ts";
import type { Keyboard } from "../touch/piano.ts";
import type { Side } from "../touch/thumbs.ts";
import { accompaniment, type OtherNote } from "../touch/voice-mode.ts";
import { aim, columnAt, COLUMNS, pianoKey, pianoKeys, TOUCH_FROM } from "./placed.ts";
import { LADDER_PX, moves, SLIDE_PX, stepPitch, type Gesture, type Move, type Options, type Proto } from "./protos.ts";

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
  /** Where it landed or last played a note (y), for the next slide. */
  ay: number;
  /** The note it plays (-1 none), its chord, its sound, its place (column, key). */
  note: number;
  chord: number[];
  sounds: Sounding[];
  cell?: number;
}

/** A touch as the music box shows it: when, at what step (the one asked for), right or wrong. */
export interface Mark {
  tick: number;
  step: number;
  ok: boolean;
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
  /** The sideways PIANO's keyboard. */
  readonly kb: Keyboard;
  now = 0;
  combo = 0;
  grade: Grade | null = null;
  /** The last gesture that played a note, for the rules that measure from it. */
  last: Gesture | null = null;
  /** SIDEWAYS: the window's middle (a staff step, fractional), following the passage. */
  pan = 0;
  /** The touches, for the music box. */
  readonly marks: Mark[] = [];
  private chip: Chip;
  private beat: number;
  private perBar: number;
  private anchorAt: number;
  private anchorTick: number;
  private nextBeat: number;
  private nextOther = 0;
  private held = new Map<number, Held>();
  private stepAt = 0;

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
    this.moves = moves(this.notes);
    this.others = accompaniment(f, from, voice);
    this.start = from - 4 * this.beat;
    this.entry = from;
    this.end = f.length + this.beat;
    this.tps = (this.beat * o.bpm) / 60;
    this.opt = options(this.beat, o.bpm, "easy");
    this.anchorAt = chip.ctx.currentTime + 0.15;
    this.anchorTick = this.start;
    this.nextBeat = this.start;
    this.kb = pianoKeys(this.notes);
    this.pan = aim(this.notes, from, f.barTicks) ?? this.notes[0].step;
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

  /** One frame: the beat (or the band) and the others scheduled ahead; the window panned; notes gone by marked missed. True at the end. */
  step(): boolean {
    const ch = this.chip;
    this.now = this.tickAt(ch.heard());
    const horizon = Math.min(this.tickAt(ch.ctx.currentTime + 0.25), this.end);
    while (this.nextBeat <= horizon) {
      const n = Math.round((this.nextBeat - this.start) / this.beat);
      const accent = n % this.perBar === 0;
      // D177: past the count-in, a band's rhythm section plays the beat instead of the click.
      const compound = this.beat !== this.f.tpq * (4 / Number(this.f.meter.split("/")[1]));
      const band = this.nextBeat >= this.entry && ch.groove?.(this.timeAt(this.nextBeat), this.beat / this.tps, n % this.perBar, Math.floor(n / this.perBar), this.perBar, compound);
      if (!band) ch.tick(this.timeAt(this.nextBeat), accent, this.nextBeat < this.entry ? 0.12 : 0.02);
      this.nextBeat += this.beat;
    }
    while (this.nextOther < this.others.length && this.others[this.nextOther].on <= horizon) {
      const n = this.others[this.nextOther++];
      if (n.on < this.now - this.beat) continue;
      ch.note(n.midi, this.timeAt(n.on), n.dur / this.tps, voicing(n.voice, this.f.voices.length, false));
    }
    // SIDEWAYS: the window glides towards the passage ahead (on the audio clock).
    const t = performance.now();
    const clock = ch.ctx.currentTime;
    const dt = this.stepAt ? Math.max(0, Math.min(0.1, clock - this.stepAt)) : 0;
    this.stepAt = clock;
    const target = aim(this.notes, this.now, this.f.barTicks);
    if (target !== null) this.pan += (target - this.pan) * Math.min(1, dt * 1.5);
    // The next note is always in the window, a column in from its edges.
    const nx = this.next();
    if (nx >= 0) {
      const room = COLUMNS / 2 - 1;
      this.pan = Math.max(this.notes[nx].step - room, Math.min(this.notes[nx].step + room, this.pan));
    }
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

  /** The places held now (columns, keys). */
  heldCells(): number[] {
    return [...this.held.values()].flatMap((h) => (h.cell === undefined ? [] : [h.cell]));
  }

  holding(i: number): boolean {
    for (const h of this.held.values()) if (h.chord.includes(i)) return true;
    return false;
  }

  /** The place under a touch: SIDEWAYS a column (a staff step), the PIANO a key. */
  cellAt(c: Contact): number | undefined {
    if (this.proto.id === "sideways") return columnAt(c.x, this.pan, c.w);
    if (this.proto.id === "piano") return pianoKey(this.kb, c.x / c.w, c.y / c.h);
    return undefined;
  }

  /** The note before note i (the top of its chord), for a wrong interval. */
  private before(i: number): LaneNote | null {
    let j = i - 1;
    while (j >= 0 && this.notes[j].on === this.notes[i].on) j--;
    return j >= 0 ? this.notes[j] : null;
  }

  /** Judges a gesture on note i: whether it is right, and what to sound if not (a MIDI pitch: the interval, column or key it asked for). */
  private verdict(i: number, g: Gesture): { ok: boolean; wrong?: number } {
    const n = this.notes[i];
    const chord = chordOf(this.notes, i).map((j) => this.notes[j]);
    if (this.proto.id === "sideways") {
      const col = columnAt(g.x, this.pan, g.w);
      if (g.y < g.h * TOUCH_FROM) return { ok: false, wrong: stepPitch(col, n) };
      return chord.some((m) => Math.abs(m.step - col) <= 1) ? { ok: true } : { ok: false, wrong: stepPitch(col, n) };
    }
    if (this.proto.id === "piano") {
      const key = pianoKey(this.kb, g.x / g.w, g.y / g.h);
      return chord.some((m) => m.midi === key) ? { ok: true } : { ok: false, wrong: key };
    }
    const v = this.proto.judge!(this.moves[i], g, this.last, this.o);
    if (v.ok) return { ok: true };
    const prev = this.before(i);
    return { ok: false, wrong: prev && v.steps !== undefined ? stepPitch(prev.step + v.steps, prev) : undefined };
  }

  down(id: number, c: Contact, ts: number) {
    const g: Gesture = { kind: "tap", ...c, dy: 0 };
    const h: Held = { side: c.side, x0: c.x, ay: c.y, note: -1, chord: [], sounds: [], cell: this.cellAt(c) };
    this.held.set(id, h);
    const i = strike(this.notes, this.tickOf(ts), this.opt);
    if (i < 0) {
      this.grade = { text: "✕", at: performance.now(), side: c.side, why: "time" };
      // A keyboard: the key struck is heard all the same.
      if (this.proto.id === "piano" && h.cell !== undefined) h.sounds = [this.chip.note(h.cell, this.chip.ctx.currentTime, HOLD_MAX, voicing(this.voice, this.f.voices.length, true), { envelope: "piano" })];
      return;
    }
    this.play(id, h, i, g, this.verdict(i, g), false);
    this.last = g;
  }

  move(id: number, c: Contact, ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    if (this.proto.slides !== "horizontal") {
      const cents = Math.max(-1, Math.min(1, (c.x - h.x0) / BEND_PX)) * BEND_CENTS;
      for (const s of h.sounds) s.bend(cents);
    }
    const t = this.tickOf(ts);
    if (this.proto.slides === "vertical") {
      const dy = c.y - h.ay;
      if (Math.abs(dy) < Math.min(SLIDE_PX, LADDER_PX) * 0.8) return;
      const g: Gesture = { kind: "slide", ...c, dy };
      // Only a note the slide reaches is played: LADDER, when the travel is its interval; BOW, any.
      const i = strike(this.notes, t, this.opt, (j) => !h.chord.includes(j) && (this.proto.id === "bow" ? Math.abs(dy) >= SLIDE_PX : this.verdict(j, g).ok));
      if (i < 0) return;
      this.play(id, h, i, g, { ok: true }, true);
      h.ay = c.y;
      this.last = g;
    } else if (this.proto.slides === "horizontal") {
      const cell = this.cellAt(c);
      if (cell === h.cell) return;
      h.cell = cell;
      const g: Gesture = { kind: "slide", ...c, dy: 0 };
      const i = strike(this.notes, t, this.opt, (j) => !h.chord.includes(j) && this.verdict(j, g).ok);
      if (i < 0) return;
      this.play(id, h, i, g, { ok: true }, true);
      this.last = g;
    }
  }

  up(id: number, _ts: number) {
    const h = this.held.get(id);
    if (!h) return;
    for (const sd of h.sounds) sd.stop();
    this.held.delete(id);
  }

  /** Sounds note i (or the wrong pitch asked for, muffled) and grades it. A slide glides on held sounds; the piano strikes again. */
  private play(id: number, h: Held, i: number, g: Gesture, v: { ok: boolean; wrong?: number }, slide: boolean) {
    const voiceV = voicing(this.voice, this.f.voices.length, true);
    const piano = this.proto.id === "piano";
    const chord = chordOf(this.notes, i);
    const expr: Play = { ...this.proto.expr(g, this.o), muffleable: true, envelope: piano ? "piano" : "synth" };
    if (slide && !piano && h.sounds.length === 1 && chord.length === 1) {
      h.sounds[0].glide?.(this.notes[i].midi);
    } else {
      for (const sd of h.sounds) sd.stop();
      // Joined to the note the other thumb still holds.
      let legato = slide;
      for (const [hid, o] of this.held) {
        if (hid === id || !o.sounds.length) continue;
        legato = true;
        for (const sd of o.sounds) sd.stop();
        o.sounds = [];
      }
      const pitches = v.ok ? chord.map((j) => this.notes[j].midi) : [v.wrong ?? this.notes[i].midi];
      h.sounds = pitches.map((m) => this.chip.note(m, this.chip.ctx.currentTime, HOLD_MAX, voiceV, { ...expr, legato: legato && !piano }));
      // Wrong: muffled (a keyboard's wrong key is simply heard).
      if (!v.ok && !piano) for (const sd of h.sounds) sd.muffle?.();
    }
    h.note = i;
    h.chord = chord;
    const n = this.notes[i];
    const at = performance.now();
    this.marks.push({ tick: this.now, step: v.ok || v.wrong === undefined ? n.step : n.step + Math.round(((v.wrong - n.midi) * 7) / 12), ok: v.ok });
    if (this.marks.length > 400) this.marks.splice(0, 100);
    if (!v.ok) {
      for (const j of chord) Object.assign(this.notes[j], { state: "miss", wrong: true });
      this.combo = 0;
      this.grade = { text: "✕", at, side: g.side, why: "gesture" };
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
