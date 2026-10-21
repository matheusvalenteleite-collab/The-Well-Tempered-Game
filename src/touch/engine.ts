/**
 * The game while it plays (D163): one voice, or two voices one per thumb, on the audio clock. It takes
 * the thumbs' and the keys' events, judges them by the level (lanes.ts), sounds only what is played,
 * grades the timing (PERFECT within 70 ms, else GOOD), counts the combo, and draws the music box's
 * frame. With two voices the lower is the left thumb's and the upper the right's; the box shows both
 * on one ladder of their pitches.
 */
import type { Chip } from "./chip.ts";
import { keyAt, type TouchFugue } from "./fugue.ts";
import { easyLanes, fits, laneAt, points, release, SLIDE, stepInto, strike, sweep, type LaneNote, type LaneOptions, type Level as Difficulty } from "./lanes.ts";
import type { Frame } from "./MusicBox.tsx";
import type { Side } from "./thumbs.ts";
import type { Level } from "./voice-mode.ts";

export const PERFECT_MS = 70;

export interface Track {
  lv: Level;
  /** The halves of the play area (and the keys' hands) that play it. */
  sides: Side[];
  /** SHAPE: the height of the previous touch on this track, as a share of the play area (0 at the top). */
  anchor: number | null;
}

export interface Grade {
  text: "PERFECT" | "GOOD" | "MISS" | "✕";
  /** GOOD: early (-1) or late (1). */
  lean?: -1 | 1;
  /** When (performance.now()), for the fade. */
  at: number;
}

interface Held {
  track: number;
  lane: number;
  note: number;
  sound?: { stop: (at?: number) => void };
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
  combo = 0;
  maxCombo = 0;
  perfect = 0;
  grade: Grade | null = null;
  private T0: number;
  private nextBeat: number;
  private held = new Map<number, Held>();
  private flashes: { lane: number; at: number }[] = [];
  private now = 0;

  readonly difficulty: Difficulty;
  private f: TouchFugue;
  private chip: Chip;
  /** The player's own lag (calibration), in ms: taken off every event. */
  private lagMs: number;

  constructor(f: TouchFugue, levels: Level[], difficulty: Difficulty, bpm: number, chip: Chip, lagMs = 0) {
    this.f = f;
    this.difficulty = difficulty;
    this.chip = chip;
    this.lagMs = lagMs;
    const sorted = byPitch(levels);
    this.tracks = sorted.map((lv, i) => ({ lv, sides: sorted.length === 1 ? ["left", "right"] : [i === 0 ? "left" : "right"], anchor: null }));
    this.rows = shareRows(sorted);
    this.start = Math.min(...sorted.map((lv) => lv.start));
    this.entry = this.start + 4 * f.tpq;
    this.end = Math.max(...sorted.map((lv) => lv.end));
    this.tps = (f.tpq * bpm) / 60;
    this.opt = easyLanes(f.tpq, bpm, difficulty);
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

  /** One frame: the beat scheduled ahead, the notes gone by unplayed marked missed. Returns true at the end. */
  step(): boolean {
    const ch = this.chip;
    const beat = this.f.tpq;
    while (this.nextBeat <= this.end && this.timeAt(this.nextBeat) < ch.ctx.currentTime + 0.25) {
      ch.tick(this.timeAt(this.nextBeat), this.nextBeat % (4 * beat) === 0, this.nextBeat < this.entry ? 0.16 : 0.05);
      this.nextBeat += beat;
    }
    this.now = this.tickAt(ch.heard());
    for (const t of this.tracks) {
      const before = t.lv.notes.filter((n) => n.state === "miss").length;
      sweep(t.lv.notes, this.now, this.opt);
      if (t.lv.notes.filter((n) => n.state === "miss").length > before) {
        this.combo = 0;
        this.grade = { text: "MISS", at: performance.now() };
      }
    }
    this.flashes = this.flashes.filter((fl) => this.now - fl.at < this.tps);
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
      flashes: this.difficulty === "notes" ? this.flashes : [],
    };
  }

  /** The lanes under the thumbs now (NOTES, one voice). */
  lit(): number[] {
    return [...this.held.values()].map((h) => h.lane);
  }

  /** The track a half plays (the only one, with one voice). */
  private trackOf(side: Side): number {
    const i = this.tracks.findIndex((t) => t.sides.includes(side));
    return i < 0 ? 0 : i;
  }

  /** A thumb lands at height y (a share of the play area, 0 at the top) on a side. */
  down(id: number, side: Side, y: number, ts: number) {
    const k = this.trackOf(side);
    const lane = laneAt(y, 1, this.tracks[k].lv.lanes.length);
    this.play(id, k, { lane, y }, ts);
  }

  /** A held thumb moves: in NOTES a new lane is a new note; in SHAPE a slide far enough may slur. */
  move(id: number, y: number, ts: number) {
    const cur = this.held.get(id);
    if (!cur) return;
    const t = this.tracks[cur.track];
    if (this.difficulty === "notes") {
      const lane = laneAt(y, 1, t.lv.lanes.length);
      if (lane === cur.lane) return;
      this.letGo(id, ts);
      this.play(id, cur.track, { lane, y }, ts);
    } else if (this.difficulty === "shape" && t.anchor !== null && Math.abs(t.anchor - y) >= SLIDE) {
      this.play(id, cur.track, { lane: cur.lane, y }, ts, 0, true);
    }
  }

  up(id: number, ts: number) {
    this.letGo(id, ts);
    this.held.delete(id);
  }

  /** A key goes down: a tap, with a direction in SHAPE, for one hand (or the only voice). */
  key(id: number, side: Side | null, dir: -1 | 0 | 1, ts: number) {
    this.play(id, side ? this.trackOf(side) : this.tracks.length - 1, null, ts, dir);
  }

  /** SHAPE: the anchors, by side, for the play area to draw. */
  anchors(): Partial<Record<Side, number>> {
    const out: Partial<Record<Side, number>> = {};
    for (const t of this.tracks) if (t.anchor !== null) for (const s of t.sides) out[s] = t.anchor;
    return out;
  }

  private play(id: number, k: number, at: { lane: number; y: number } | null, ts: number, keyDir: -1 | 0 | 1 = 0, slide = false) {
    const tr = this.tracks[k];
    const notes = tr.lv.notes;
    const t = this.tickOf(ts);
    const dy = at === null ? keyDir * 0.1 : tr.anchor === null ? null : tr.anchor - at.y;
    const i = strike(notes, at?.lane ?? 0, t, this.opt, (j) => (!slide || stepInto(notes, j) !== 0) && fits(this.difficulty, notes, j, at?.lane ?? notes[j].lane, dy, this.opt, at ? tr.anchor : null));
    if (slide && i < 0) return;
    if (slide) this.letGo(id, ts);
    if (at) tr.anchor = at.y;
    const lane = at?.lane ?? (i >= 0 ? notes[i].lane : 0);
    const held: Held = { track: k, lane, note: i };
    if (i >= 0) {
      const n = notes[i];
      held.sound = this.chip.note(n.midi, this.chip.ctx.currentTime, Math.max(0.05, (n.on + n.dur - t) / this.tps), tr.lv.voice);
      const offMs = ((t - n.on) / this.tps) * 1000;
      const perfect = Math.abs(offMs) <= PERFECT_MS;
      if (perfect) this.perfect++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.grade = perfect ? { text: "PERFECT", at: performance.now() } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at: performance.now() };
    } else {
      this.flashes.push({ lane, at: t });
      this.grade = { text: "✕", at: performance.now() };
    }
    this.held.set(id, held);
  }

  private letGo(id: number, ts: number) {
    const cur = this.held.get(id);
    if (!cur) return;
    cur.sound?.stop();
    if (cur.note >= 0) release(this.tracks[cur.track].lv.notes, cur.note, this.tickOf(ts));
  }

  stopAll() {
    for (const h of this.held.values()) h.sound?.stop();
    this.held.clear();
  }

  /** Points, voice by voice and in all. */
  results(): { voice: number; got: number; of: number }[] {
    return this.tracks.map((t) => ({ voice: t.lv.voice, ...points(t.lv.notes, this.opt) }));
  }
}
