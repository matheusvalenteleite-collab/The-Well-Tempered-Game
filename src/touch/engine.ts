/**
 * The game while it plays (D163; D166; D167; D171-D172): one voice on the audio clock, the others
 * playing by themselves. It takes the touches (and on a computer the keys), judges them by the level
 * and the instrument, sounds only what is played, plays EASY's short notes by themselves after a hit,
 * grades the timing (PERFECT within 70 ms, else GOOD), counts the combo.
 * The instruments: the SYNTH as shape (shape.ts: the thumb gives the direction, the height the size;
 * a held thumb slid up or down plays the next note rising or falling, joined; sideways it bends), and
 * the PIANO (piano.ts: a key of every semitone). Either way a note sounds as long as the thumb stays
 * down (a quick tap is staccato): the Synth holds steady, the Piano dies away; a note struck while the
 * other thumb still holds one is joined to it (legato), unless the score holds both.
 * D168, legato by substitution: where the score holds a note under the next (a prelude's hand), a
 * thumb lifted from it and tapping the next within CARRY_S lets it sound on to its end.
 * WAIT (D167, as Synthesia's): the music stops at each note until it is played (not offered now).
 */
import { voicing, type Chip, type Envelope, type Sounding } from "./chip.ts";
import { beatOf, keyAt, type TouchFugue } from "./fugue.ts";
import { chordOf, options, points, release, strike, sweep, type LaneOptions, type Level as Difficulty } from "./lanes.ts";
import { keyboard, keyAt as keyUnder, WHITE_ONLY, type Keyboard } from "./piano.ts";
import { fits, markShapes, SLIDE_PX } from "./shape.ts";
import type { Side } from "./thumbs.ts";
import { accompaniment, type Level, type OtherNote } from "./voice-mode.ts";

export type Instrument = "synth" | "piano";
export const INSTRUMENTS: Instrument[] = ["synth", "piano"];

export const PERFECT_MS = 70;
/** How far ahead a note starts to show under the thumbs, in ms. */
export const APPROACH_MS = 1100;
/** Sideways wobble to bend (the Synth): pixels for a full bend, and the bend in cents. */
const BEND_PX = 40;
const BEND_CENTS = 30;
/** How soon after a lift the part's next tap carries the lifted note on, in seconds. */
export const CARRY_S = 0.25;
/** The longest a held note sounds, in seconds. */
const HOLD_MAX = 8;

/** Where a touch is, in the play area (px), and its size; the Piano's keyboard is the lower KEYS_SHARE of it. */
export interface Contact {
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The share of the Piano's play area the keyboard takes (the notes fall above it). */
export const KEYS_SHARE = 0.45;

export interface Track {
  lv: Level;
  /** The halves of the play area (and the keys' hands) that play it. */
  sides: Side[];
}

export interface Grade {
  text: "PERFECT" | "GOOD" | "MISS" | "✕";
  /** GOOD: early (-1) or late (1). */
  lean?: -1 | 1;
  /** When (performance.now()), for the fade. */
  at: number;
  /** Where it was played: the side (the Synth), the key (the Piano). */
  side?: Side;
  key?: number;
}

interface Held {
  track: number;
  side: Side;
  /** Where it landed or last slid to (px): the bend, the next slide. */
  x0: number;
  y0: number;
  /** The key held (the Piano). */
  key?: number;
  /** The note played (-1: none), and with it the rest of its chord. */
  note: number;
  chord: number[];
  sounds: Sounding[];
}

/** The voices low to high (the left thumb's first). */
export function byPitch(levels: Level[]): Level[] {
  const mean = (lv: Level) => lv.notes.reduce((s, n) => s + n.midi, 0) / lv.notes.length;
  return [...levels].sort((a, b) => mean(a) - mean(b));
}

/** Sets the voices up: the moves the Synth wants. D175 (owner): no note rides along, at any level; every note is played. */
export function prepare(_f: TouchFugue, levels: Level[], _difficulty: Difficulty) {
  for (const lv of levels) {
    for (const n of lv.notes) n.ride = false;
    markShapes(lv.notes);
  }
}

export interface GameOptions {
  difficulty: Difficulty;
  /** The Synth unless said (D171). */
  instrument?: Instrument;
  /** Beats per minute, the beat as beatOf() counts it. */
  bpm: number;
  /** The music waits at each note until it is played (not offered since D169; kept for practice). */
  wait?: boolean;
  /** The player's own lag (calibration), in ms: taken off every event. */
  lagMs?: number;
}

export class Game {
  readonly tracks: Track[];
  /** Ticks: the count-in's start, the first beat of play, the end. */
  readonly start: number;
  readonly entry: number;
  readonly end: number;
  readonly tps: number;
  readonly opt: LaneOptions;
  readonly o: GameOptions;
  readonly f: TouchFugue;
  /** The other voices, when they play. */
  readonly others: OtherNote[];
  readonly instrument: Instrument;
  /** The Piano's keys: the voice's range. */
  readonly kb: Keyboard;
  combo = 0;
  maxCombo = 0;
  perfect = 0;
  grade: Grade | null = null;
  /** The tick the player hears now. */
  now = 0;
  /** WAIT: the music is standing at a note. */
  waiting = false;
  private chip: Chip;
  private beat: number;
  private perBar: number;
  /** The clock: at audio time anchorAt the music was at tick anchorTick. */
  private anchorAt: number;
  private anchorTick: number;
  private nextBeat: number;
  private nextOther = 0;
  private held = new Map<number, Held>();
  /** Lifts not yet final: a tap in the same part soon after carries the note on. */
  private lifting: { track: number; chord: number[]; sounds: Sounding[]; t: number; until: number }[] = [];
  /** Where the score holds a note on past the next onset in its part (a lift there may carry). */
  private overlaps: Set<number>[];

  constructor(f: TouchFugue, levels: Level[], o: GameOptions, chip: Chip) {
    this.f = f;
    this.o = o;
    this.chip = chip;
    const sorted = byPitch(levels);
    prepare(f, sorted, o.difficulty);
    this.tracks = sorted.map((lv, i) => ({ lv, sides: sorted.length === 1 ? ["left", "right"] : [i === 0 ? "left" : "right"] }));
    const b = beatOf(f);
    this.beat = b.ticks;
    this.perBar = b.perBar;
    this.start = Math.min(...sorted.map((lv) => lv.start));
    this.entry = this.start + 4 * this.beat;
    this.end = Math.max(...sorted.map((lv) => lv.end));
    this.tps = (this.beat * o.bpm) / 60;
    this.opt = options(this.beat, o.bpm, o.difficulty);
    this.instrument = o.instrument ?? "synth";
    this.kb = keyboard(sorted[0].notes.map((n) => n.midi));
    this.overlaps = sorted.map((lv) => {
      const out = new Set<number>();
      lv.notes.forEach((n, i) => {
        if (lv.notes.some((m) => m.on > n.on && m.on < n.on + n.dur)) out.add(i);
      });
      return out;
    });
    // D169: the other voices always play, from where the player starts.
    this.others = accompaniment(f, sorted[0].from, sorted[0].voice);
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
  /** An event's tick: its timestamp on the clock the player hears, less their lag; while waiting, the note waited at. */
  private tickOf(ts: number) {
    if (this.waiting) return this.now;
    return this.tickAt(this.chip.heard() - (performance.now() - ts) / 1000 - (this.o.lagMs ?? 0) / 1000);
  }

  /** WAIT: the first note still to play (its onset), if any. */
  private block(): number | null {
    if (!this.o.wait) return null;
    let b: number | null = null;
    for (const t of this.tracks) for (const n of t.lv.notes) if (!n.ride && n.state === "pending" && (b === null || n.on < b)) b = n.on;
    return b;
  }

  /**
   * One frame: the beat and the other voices scheduled ahead (in WAIT, no further than the note waited
   * for), EASY's riding notes sounded as they come, the notes gone by unplayed marked missed. Returns
   * true at the end.
   */
  step(): boolean {
    const ch = this.chip;
    const block = this.block();
    let now = this.tickAt(ch.heard());
    if (block !== null && now >= block) {
      if (!this.waiting) this.waiting = true;
      now = block;
    }
    this.now = now;
    const horizon = Math.min(this.tickAt(ch.ctx.currentTime + 0.25), block ?? Infinity, this.end);
    while (this.nextBeat <= horizon) {
      const accent = Math.round((this.nextBeat - this.start) / this.beat) % this.perBar === 0;
      ch.tick(this.timeAt(this.nextBeat), accent, this.nextBeat < this.entry ? 0.12 : 0.02);
      this.nextBeat += this.beat;
    }
    while (this.nextOther < this.others.length && this.others[this.nextOther].on <= horizon && !(block !== null && this.others[this.nextOther].on >= block)) {
      const n = this.others[this.nextOther++];
      if (n.on < now - this.beat) continue;
      // In WAIT a note of the others is cut where the music may stop.
      const dur = block !== null ? Math.min(n.dur, Math.max(this.beat / 4, block - n.on)) : n.dur;
      ch.note(n.midi, this.timeAt(n.on), dur / this.tps, voicing(n.voice, this.f.voices.length, false));
    }
    // Lifts that no tap carried on are final: the note stops where the thumb left it.
    this.lifting = this.lifting.filter((l) => {
      if (ch.ctx.currentTime < l.until) return true;
      for (const sd of l.sounds) sd.stop();
      for (const j of l.chord) release(this.tracks[l.track].lv.notes, j, l.t);
      return false;
    });
    const ahead = Math.min(this.tickAt(ch.ctx.currentTime + 0.05), block ?? Infinity);
    this.tracks.forEach((t) => {
      const notes = t.lv.notes;
      notes.forEach((n, i) => {
        if (!n.ride || n.state !== "pending" || n.on > ahead) return;
        // A riding note sounds if the last note the player had to play before it was hit.
        const before = notes.slice(0, i).filter((m) => !m.ride && m.on < n.on).at(-1);
        if (before && before.state === "hit") {
          n.state = "hit";
          n.at = n.on;
          ch.note(n.midi, this.timeAt(n.on), n.dur / this.tps, voicing(t.lv.voice, this.f.voices.length, true));
        } else if (!before || before.state === "miss" || n.on <= now) {
          n.state = "miss";
          n.at = now;
        }
      });
      if (!this.o.wait && sweep(notes, now, this.opt)) {
        this.combo = 0;
        this.grade = { text: "MISS", at: performance.now() };
      }
    });
    if (now > this.end) {
      this.stopAll();
      return true;
    }
    return false;
  }

  /** The beats left in the count-in (4 … 1), or 0 once the music has begun. */
  countIn(): number {
    return this.now < this.entry ? Math.min(4, Math.ceil((this.entry - this.now) / this.beat)) : 0;
  }

  /** The key the music is in now. */
  keyNow(): string {
    return keyAt(this.f, this.now);
  }

  /** The track a half plays (the only one, with one voice). */
  private trackOf(side: Side): number {
    const i = this.tracks.findIndex((t) => t.sides.includes(side));
    return i < 0 ? 0 : i;
  }

  /** The Piano: the key under a touch, if it is on the keys or above them. */
  keyAt(c: Contact): number {
    const top = c.h * (1 - KEYS_SHARE);
    const low = c.y > top + c.h * KEYS_SHARE * (1 - WHITE_ONLY);
    return keyUnder(this.kb, c.x / c.w, low);
  }

  /** A touch lands. */
  down(id: number, c: Contact, ts: number) {
    const k = this.trackOf(c.side);
    const sized = this.o.difficulty === "normal";
    if (this.instrument === "piano") {
      const key = this.keyAt(c);
      const notes = this.tracks[k].lv.notes;
      const ok = (j: number) => !sized || chordOf(notes, j).some((m) => notes[m].midi === key);
      this.play(id, k, c, ts, ok, { key });
      return;
    }
    const notes = this.tracks[k].lv.notes;
    this.play(id, k, c, ts, (j) => fits(notes[j], c.side, c.y / c.h, sized), {});
  }

  /** A held thumb moves: the Synth's slide up or down plays the next note joined; sideways, a bend. */
  move(id: number, c: Contact, ts: number) {
    const cur = this.held.get(id);
    if (!cur || this.instrument === "piano") return;
    const dy = c.y - cur.y0;
    if (Math.abs(dy) >= SLIDE_PX) {
      const dir = dy < 0 ? 1 : -1;
      const notes = this.tracks[cur.track].lv.notes;
      cur.y0 = c.y;
      const ok = (j: number) => notes[j].dir === dir && !cur.chord.includes(j);
      if (this.play(id, cur.track, { ...c, x: cur.x0 }, ts, ok, { slide: true })) return;
    }
    const cents = Math.max(-1, Math.min(1, (c.x - cur.x0) / BEND_PX)) * BEND_CENTS;
    for (const s of cur.sounds) s.bend(cents);
  }

  up(id: number, ts: number) {
    this.letGo(id, ts);
    this.held.delete(id);
  }

  /** A computer key goes down (EASY): a thumb's tap (the Synth's direction), or either. */
  press(id: number, side: Side | null, ts: number) {
    if (this.o.difficulty !== "easy") return;
    const k = side ? this.trackOf(side) : 0;
    const notes = this.tracks[k].lv.notes;
    const ok = (j: number) => this.instrument === "piano" || fits(notes[j], side, 0.5, false);
    this.play(id, k, { side: side ?? "left", x: 0, y: 0, w: 1, h: 1 }, ts, ok, {});
  }

  private envelope(): Envelope {
    return this.instrument === "piano" ? "piano" : "synth";
  }

  /**
   * Plays what a touch reaches: the pending note nearest in time that `ok` accepts. A slide plays only
   * a note; a tap that plays none is a ✕, and on the Piano at NORMAL the key sounds as it is. Returns
   * whether it played a note.
   */
  private play(id: number, k: number, c: Contact, ts: number, ok: (j: number) => boolean, how: { slide?: boolean; key?: number }): boolean {
    const tr = this.tracks[k];
    const notes = tr.lv.notes;
    const t = this.tickOf(ts);
    const i = strike(notes, t, this.opt, ok);
    if (how.slide && i < 0) return false;
    const before = this.held.get(id);
    if (how.slide && before) {
      for (const sd of before.sounds) sd.stop();
      for (const j of before.chord) release(notes, j, t);
      this.held.delete(id);
    }
    const chord = i >= 0 ? chordOf(notes, i) : [];
    const held: Held = { track: k, side: c.side, x0: c.x, y0: c.y, key: how.key, note: i, chord, sounds: [] };
    const v = voicing(tr.lv.voice, this.f.voices.length, true);
    const at = performance.now();
    if (i >= 0) {
      // Joined (legato) if slid into, or if the other thumb still holds a note the score lets go here.
      let legato = !!how.slide && this.instrument === "synth";
      for (const [hid, h] of this.held) {
        if (hid === id || h.track !== k || h.note < 0) continue;
        const ends = h.chord.every((j) => notes[j].on + notes[j].dur <= notes[i].on + this.opt.late);
        if (!ends) continue;
        if (this.instrument === "synth") legato = true;
        for (const sd of h.sounds) sd.stop();
        for (const j of h.chord) release(notes, j, t);
        h.sounds = [];
      }
      for (const j of chord) held.sounds.push(this.chip.note(notes[j].midi, this.chip.ctx.currentTime, HOLD_MAX, v, { envelope: this.envelope(), legato }));
      const offMs = ((t - notes[i].on) / this.tps) * 1000;
      const perfect = Math.abs(offMs) <= PERFECT_MS;
      if (perfect) this.perfect++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.grade = perfect ? { text: "PERFECT", at, side: c.side, key: how.key } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, side: c.side, key: how.key };
      if (this.waiting) this.resume(notes[i].on);
      // A lift just before, in this part: that note sounds on, held in full, to its end in the score.
      this.lifting = this.lifting.filter((l) => {
        if (l.track !== k) return true;
        const end = Math.max(...l.chord.map((j) => notes[j].on + notes[j].dur));
        for (const sd of l.sounds) sd.stop(this.timeAt(end));
        return false;
      });
    } else {
      this.grade = { text: "✕", at, side: c.side, key: how.key };
      // The Piano at NORMAL: the key struck is heard, a wrong note.
      if (this.instrument === "piano" && how.key !== undefined && this.o.difficulty === "normal") held.sounds.push(this.chip.note(how.key, this.chip.ctx.currentTime, HOLD_MAX, v, { envelope: "piano" }));
    }
    this.held.set(id, held);
    return i >= 0;
  }

  /** The keys held down now (the Piano). */
  heldKeys(): number[] {
    return [...this.held.values()].flatMap((h) => (h.key === undefined ? [] : [h.key]));
  }

  /** The thumbs held down now and where (the Synth). */
  heldSides(): { side: Side; y: number }[] {
    return [...this.held.values()].map((h) => ({ side: h.side, y: h.y0 }));
  }

  /** WAIT: the note waited for is played; the music goes on from it. */
  private resume(tick: number) {
    if (this.block() !== null && this.block()! <= tick) return;
    this.waiting = false;
    this.anchorTick = tick;
    this.anchorAt = this.chip.heard();
    this.nextBeat = Math.max(this.nextBeat, Math.ceil(tick / this.beat) * this.beat);
  }

  private holdingNote(track: number, note: number): boolean {
    for (const h of this.held.values()) if (h.track === track && h.chord.includes(note)) return true;
    return false;
  }

  /** A thumb leaves its note: final unless the part's next tap comes within CARRY_S (a slide is final at once). */
  private letGo(id: number, ts: number, final = false) {
    const cur = this.held.get(id);
    if (!cur) return;
    const t = this.tickOf(ts);
    const notes = this.tracks[cur.track].lv.notes;
    const carry = cur.chord.some((j) => this.overlaps[cur.track].has(j) && notes[j].on + notes[j].dur > t);
    if (final || !carry) {
      for (const sd of cur.sounds) sd.stop();
      for (const j of cur.chord) release(notes, j, t);
      return;
    }
    this.lifting.push({ track: cur.track, chord: cur.chord, sounds: cur.sounds, t, until: this.chip.ctx.currentTime + CARRY_S });
  }

  /** Whether a note is being held by a thumb now. */
  holding(track: number, note: number): boolean {
    return this.holdingNote(track, note);
  }

  stopAll() {
    for (const h of this.held.values()) for (const sd of h.sounds) sd.stop();
    for (const l of this.lifting) for (const sd of l.sounds) sd.stop();
    this.held.clear();
    this.lifting = [];
  }

  /** Points, voice by voice. */
  results(): { voice: number; got: number; of: number }[] {
    return this.tracks.map((t) => ({ voice: t.lv.voice, ...points(t.lv.notes, this.opt) }));
  }
}
