/**
 * The game while it plays (D163; D166; D167): one voice, or two voices one per thumb, on the audio
 * clock, alone or with the other voices playing by themselves. It takes the taps (and on a computer
 * the keys), judges them by the level against the keys' rows (rows.ts), sounds only what is played,
 * plays EASY's short notes by themselves after a hit, grades the timing (PERFECT within 70 ms, else
 * GOOD), counts the combo, and gives the music box and the keys what to draw.
 * Holding a note, the thumb can slide to the next row for the next note (a slur) and wobble sideways
 * to bend it (vibrato). WAIT (D167, as Synthesia's): the music stops at each note until it is played.
 * D168, legato by substitution: a thumb lifted from a note and tapping the same part's next note within
 * CARRY_S lets the first note sound on to its end, held in full, as a finger change or the pedal would
 * (a prelude's hand holds one note under others; one thumb cannot).
 */
import { voicing, type Chip, type Sounding } from "./chip.ts";
import { beatOf, keyAt, type TouchFugue } from "./fugue.ts";
import { chordOf, markRides, options, points, release, strike, sweep, type LaneOptions, type Level as Difficulty } from "./lanes.ts";
import { rowAt, windowAt, type RowWindow } from "./rows.ts";
import type { Side } from "./thumbs.ts";
import { accompaniment, type Level, type OtherNote } from "./voice-mode.ts";

export const PERFECT_MS = 70;
/** How far ahead a note's row starts to light up, in ms. */
export const APPROACH_MS = 1100;
/** NORMAL: a tap this many staff steps off its note still plays it. */
export const REACH_STEPS = 1;
/** Sideways wobble to bend: pixels for a full bend, and the bend in cents. */
const BEND_PX = 40;
const BEND_CENTS = 30;
/** How soon after a lift the part's next tap carries the lifted note on, in seconds. */
export const CARRY_S = 0.25;

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
  /** Where: the track and the row. */
  track?: number;
  row?: number;
}

interface Held {
  track: number;
  /** The row under the thumb, and where it landed (px), for the bend. */
  row: number;
  x0: number;
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

/** Sets the voices up for a level: in EASY, their riding notes. */
export function prepare(f: TouchFugue, levels: Level[], difficulty: Difficulty) {
  if (difficulty === "easy") for (const lv of levels) markRides(lv.notes, beatOf(f).ticks);
}

export interface GameOptions {
  difficulty: Difficulty;
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

  /** The keys' rows for a track now: those of the next note to play there (or of now). */
  keys(k: number): RowWindow {
    const notes = this.tracks[k].lv.notes;
    const next = notes.find((n) => n.state === "pending" && !n.ride && n.on >= this.now - this.opt.late);
    return windowAt(this.tracks[k].lv.windows, next && next.on - this.now < (APPROACH_MS / 1000) * this.tps * 2 ? next.on : this.now);
  }

  /** The rows held down now, by track. */
  heldRows(k: number): number[] {
    return [...this.held.values()].filter((h) => h.track === k).map((h) => h.row);
  }

  /** The track a half plays (the only one, with one voice). */
  private trackOf(side: Side): number {
    const i = this.tracks.findIndex((t) => t.sides.includes(side));
    return i < 0 ? 0 : i;
  }

  /** A tap lands at (x, y) px in a play area w by h px, on a side. */
  down(id: number, side: Side, x: number, y: number, w: number, h: number, ts: number) {
    const k = this.trackOf(side);
    const win = this.keys(k);
    const row = rowAt(y / h, win.rows);
    this.play(id, k, row, x, ts, false);
  }

  /** A held thumb moves: to another row, the next note (a slur); sideways, a bend. */
  move(id: number, x: number, y: number, w: number, h: number, ts: number) {
    const cur = this.held.get(id);
    if (!cur) return;
    const win = this.keys(cur.track);
    const row = rowAt(y / h, win.rows);
    if (row !== cur.row && this.o.difficulty === "normal") {
      const slurred = this.play(id, cur.track, row, cur.x0, ts, true);
      if (slurred) return;
    }
    const cents = Math.max(-1, Math.min(1, (x - cur.x0) / BEND_PX)) * BEND_CENTS;
    for (const s of cur.sounds) s.bend(cents);
  }

  up(id: number, ts: number) {
    this.letGo(id, ts);
    this.held.delete(id);
  }

  /** A computer key goes down (EASY): a tap for one hand, or for the only voice. */
  press(id: number, side: Side | null, ts: number) {
    if (this.o.difficulty !== "easy") return;
    this.play(id, side ? this.trackOf(side) : 0, -1, 0, ts, false);
  }

  /** Plays what a tap (or a slide into a row) reaches. Returns whether it played a note. */
  private play(id: number, k: number, row: number, x0: number, ts: number, slide: boolean): boolean {
    const tr = this.tracks[k];
    const notes = tr.lv.notes;
    const t = this.tickOf(ts);
    const win = this.keys(k);
    const step = win.lo + row;
    // A note beyond the keys (a leap wider than they hold) is played on the nearest edge row.
    const onKeys = (st: number) => Math.max(win.lo, Math.min(win.lo + win.rows - 1, st));
    const ok = (j: number) => this.o.difficulty === "easy" || row < 0 || Math.abs(onKeys(notes[j].step) - step) <= REACH_STEPS;
    // A slide plays a note other than the one the thumb holds.
    const holdingNow = this.held.get(id)?.chord ?? [];
    const i = strike(notes, t, this.opt, slide ? (j) => ok(j) && !holdingNow.includes(j) : ok);
    if (slide && i < 0) {
      const cur = this.held.get(id);
      if (cur) cur.row = row;
      return false;
    }
    if (slide) this.letGo(id, ts, true);
    const chord = i >= 0 ? chordOf(notes, i) : [];
    const held: Held = { track: k, row: row < 0 ? (i >= 0 ? notes[i].step - win.lo : 0) : row, x0, note: i, chord, sounds: [] };
    if (i >= 0) {
      const v = voicing(tr.lv.voice, this.f.voices.length, true);
      for (const j of chord) held.sounds.push(this.chip.note(notes[j].midi, this.chip.ctx.currentTime, Math.max(0.05, (notes[j].on + notes[j].dur - t) / this.tps), v));
      const offMs = ((t - notes[i].on) / this.tps) * 1000;
      const perfect = Math.abs(offMs) <= PERFECT_MS;
      if (perfect) this.perfect++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const at = performance.now();
      this.grade = perfect ? { text: "PERFECT", at, track: k, row: held.row } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, track: k, row: held.row };
      if (this.waiting) this.resume(notes[i].on);
      // A lift just before, in this part: that note sounds on, held in full.
      this.lifting = this.lifting.filter((l) => l.track !== k);
    } else if (!slide) {
      this.grade = { text: "✕", at: performance.now(), track: k, row: held.row };
    }
    this.held.set(id, held);
    return i >= 0;
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
    const sounding = cur.chord.filter((j) => notes[j].on + notes[j].dur > t);
    if (final || !sounding.length) {
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
