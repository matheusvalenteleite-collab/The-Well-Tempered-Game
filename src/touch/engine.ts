/**
 * The game while it plays (D163; D166): one voice, or two voices one per thumb, on the audio clock.
 * It takes the taps (and on a computer the keys), judges them by the level (lanes.ts) against the
 * targets (targets.ts), sounds only what is played, plays EASY's short notes by themselves after a
 * hit, grades the timing (PERFECT within 70 ms, else GOOD), counts the combo, and draws the music
 * box's frame. With two voices the lower is the left thumb's and the upper the right's; the box shows
 * both on one ladder of their pitches.
 */
import type { Chip } from "./chip.ts";
import { keyAt, type TouchFugue } from "./fugue.ts";
import { chordOf, markRides, options, points, release, strike, sweep, type LaneNote, type LaneOptions, type Level as Difficulty } from "./lanes.ts";
import type { Frame } from "./MusicBox.tsx";
import { place, reaches } from "./targets.ts";
import type { Side } from "./thumbs.ts";
import type { Level } from "./voice-mode.ts";

export const PERFECT_MS = 70;

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
  /** Where (shares of the play area), for the burst. */
  x?: number;
  y?: number;
}

interface Held {
  track: number;
  /** The note played (-1: none), and with it the rest of its chord. */
  note: number;
  chord: number[];
  sounds: { stop: (at?: number) => void }[];
}

/** The voices low to high (the left thumb's first). */
export function byPitch(levels: Level[]): Level[] {
  const mean = (lv: Level) => lv.notes.reduce((s, n) => s + n.midi, 0) / lv.notes.length;
  return [...levels].sort((a, b) => mean(a) - mean(b));
}

/** Puts the voices on one ladder of their pitches: each note's row and voice. Returns the rows. */
export function shareRows(levels: Level[]): number {
  const pitches = [...new Set(levels.flatMap((lv) => lv.notes.map((n) => n.midi)))].sort((a, b) => a - b);
  for (const lv of levels) for (const n of lv.notes) (n.row = pitches.indexOf(n.midi)), (n.voice = lv.voice);
  return pitches.length;
}

/** Sets the voices up for a level: their targets, and in EASY their riding notes. */
export function prepare(f: TouchFugue, levels: Level[], difficulty: Difficulty) {
  const sorted = byPitch(levels);
  sorted.forEach((lv, i) => {
    if (difficulty === "easy") markRides(lv.notes, f.tpq);
    place(lv.notes, sorted.length === 1 ? "both" : i === 0 ? "left" : "right", f.tpq * 4);
  });
}

/** The box before play: the voices' opening, a beat before the first of them. */
export function previewFrame(f: TouchFugue, levels: Level[]): Frame {
  const rows = shareRows(levels);
  const first = Math.min(...levels.map((lv) => lv.first));
  return {
    now: first - f.tpq,
    tps: 1,
    key: keyAt(f, first),
    voice: levels[levels.length - 1].voice,
    voices: levels.map((lv) => lv.voice),
    notes: levels.flatMap((lv) => lv.notes),
    lanes: rows,
    touched: [],
    flashes: [],
  };
}

export class Game {
  readonly tracks: Track[];
  /** Ticks: the count-in's start, the first beat of play, the end. */
  readonly start: number;
  readonly entry: number;
  readonly end: number;
  readonly tps: number;
  readonly opt: LaneOptions;
  /** The music box's rows: every pitch of the voices played, low to high. */
  readonly rows: number;
  readonly difficulty: Difficulty;
  combo = 0;
  maxCombo = 0;
  perfect = 0;
  grade: Grade | null = null;
  /** The tick the player hears now. */
  now = 0;
  private f: TouchFugue;
  private chip: Chip;
  /** The player's own lag (calibration), in ms: taken off every event. */
  private lagMs: number;
  private T0: number;
  private nextBeat: number;
  private held = new Map<number, Held>();

  constructor(f: TouchFugue, levels: Level[], difficulty: Difficulty, bpm: number, chip: Chip, lagMs = 0) {
    this.f = f;
    this.difficulty = difficulty;
    this.chip = chip;
    this.lagMs = lagMs;
    const sorted = byPitch(levels);
    prepare(f, sorted, difficulty);
    this.tracks = sorted.map((lv, i) => ({ lv, sides: sorted.length === 1 ? ["left", "right"] : [i === 0 ? "left" : "right"] }));
    this.rows = shareRows(sorted);
    this.start = Math.min(...sorted.map((lv) => lv.start));
    this.entry = this.start + 4 * f.tpq;
    this.end = Math.max(...sorted.map((lv) => lv.end));
    this.tps = (f.tpq * bpm) / 60;
    this.opt = options(f.tpq, bpm, difficulty);
    this.T0 = chip.ctx.currentTime + 0.15;
    this.nextBeat = this.start;
  }

  private tickAt(t: number) {
    return this.start + (t - this.T0) * this.tps;
  }
  private timeAt(tick: number) {
    return this.T0 + (tick - this.start) / this.tps;
  }
  /** An event's tick: its timestamp on the clock the player hears, less their lag. */
  private tickOf(ts: number) {
    return this.tickAt(this.chip.heard() - (performance.now() - ts) / 1000 - this.lagMs / 1000);
  }

  /**
   * One frame: the beat scheduled ahead, EASY's riding notes sounded (or let pass) as they come, the
   * notes gone by unplayed marked missed. Returns true at the end.
   */
  step(): boolean {
    const ch = this.chip;
    const beat = this.f.tpq;
    while (this.nextBeat <= this.end && this.timeAt(this.nextBeat) < ch.ctx.currentTime + 0.25) {
      ch.tick(this.timeAt(this.nextBeat), this.nextBeat % (4 * beat) === 0, this.nextBeat < this.entry ? 0.16 : 0.05);
      this.nextBeat += beat;
    }
    this.now = this.tickAt(ch.heard());
    const ahead = this.tickAt(ch.ctx.currentTime + 0.05);
    for (const t of this.tracks) {
      const notes = t.lv.notes;
      notes.forEach((n, i) => {
        if (!n.ride || n.state !== "pending" || n.on > ahead) return;
        // A riding note sounds if the last note the player had to play before it was hit.
        const before = notes.slice(0, i).filter((m) => !m.ride && m.on < n.on).at(-1);
        if (before && before.state === "hit") {
          n.state = "hit";
          n.at = n.on;
          ch.note(n.midi, this.timeAt(n.on), n.dur / this.tps, t.lv.voice);
        } else if (!before || before.state === "miss" || n.on <= this.now) {
          n.state = "miss";
          n.at = this.now;
        }
      });
      if (sweep(notes, this.now, this.opt)) {
        this.combo = 0;
        this.grade = { text: "MISS", at: performance.now() };
      }
    }
    if (this.now > this.end) {
      this.stopAll();
      return true;
    }
    return false;
  }

  /** The beats left in the count-in (4 … 1), or 0 once the music has begun. */
  countIn(): number {
    return this.now < this.entry ? Math.min(4, Math.ceil((this.entry - this.now) / this.f.tpq)) : 0;
  }

  frame(): Frame {
    const notes: LaneNote[] = this.tracks.flatMap((t) => t.lv.notes);
    const touched: number[] = [];
    for (const h of this.held.values()) if (h.note >= 0) touched.push(this.tracks[h.track].lv.notes[h.note].row ?? 0);
    return {
      now: this.now,
      tps: this.tps,
      key: keyAt(this.f, this.now),
      voice: this.tracks[this.tracks.length - 1].lv.voice,
      voices: this.tracks.map((t) => t.lv.voice),
      notes,
      lanes: this.rows,
      touched,
      flashes: [],
    };
  }

  /** The track a half plays (the only one, with one voice). */
  private trackOf(side: Side): number {
    const i = this.tracks.findIndex((t) => t.sides.includes(side));
    return i < 0 ? 0 : i;
  }

  /** A tap lands at (x, y) px in a play area w by h px, on a side. */
  down(id: number, side: Side, x: number, y: number, w: number, h: number, ts: number) {
    const k = this.trackOf(side);
    const notes = this.tracks[k].lv.notes;
    this.play(id, k, ts, (j) => this.difficulty === "easy" || reaches(notes[j], x, y, w, h), { x: x / w, y: y / h });
  }

  up(id: number, ts: number) {
    this.letGo(id, ts);
    this.held.delete(id);
  }

  /** A key goes down (EASY): a tap for one hand, or for the only voice. */
  key(id: number, side: Side | null, ts: number) {
    if (this.difficulty !== "easy") return;
    this.play(id, side ? this.trackOf(side) : 0, ts, () => true);
  }

  private play(id: number, k: number, ts: number, ok: (j: number) => boolean, where?: { x: number; y: number }) {
    const tr = this.tracks[k];
    const notes = tr.lv.notes;
    const t = this.tickOf(ts);
    const i = strike(notes, t, this.opt, ok);
    const chord = i >= 0 ? chordOf(notes, i) : [];
    const held: Held = { track: k, note: i, chord, sounds: [] };
    if (i >= 0) {
      for (const j of chord) held.sounds.push(this.chip.note(notes[j].midi, this.chip.ctx.currentTime, Math.max(0.05, (notes[j].on + notes[j].dur - t) / this.tps), tr.lv.voice));
      const offMs = ((t - notes[i].on) / this.tps) * 1000;
      const perfect = Math.abs(offMs) <= PERFECT_MS;
      if (perfect) this.perfect++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const at = performance.now();
      this.grade = perfect ? { text: "PERFECT", at, x: notes[i].x, y: notes[i].y } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, x: notes[i].x, y: notes[i].y };
    } else {
      this.grade = { text: "✕", at: performance.now(), ...where };
    }
    this.held.set(id, held);
  }

  private letGo(id: number, ts: number) {
    const cur = this.held.get(id);
    if (!cur) return;
    for (const sd of cur.sounds) sd.stop();
    const t = this.tickOf(ts);
    for (const j of cur.chord) release(this.tracks[cur.track].lv.notes, j, t);
  }

  /** Whether a note is being held by a thumb now. */
  holding(track: number, note: number): boolean {
    for (const h of this.held.values()) if (h.track === track && h.chord.includes(note)) return true;
    return false;
  }

  stopAll() {
    for (const h of this.held.values()) for (const sd of h.sounds) sd.stop();
    this.held.clear();
  }

  /** Points, voice by voice. */
  results(): { voice: number; got: number; of: number }[] {
    return this.tracks.map((t) => ({ voice: t.lv.voice, ...points(t.lv.notes, this.opt) }));
  }
}
