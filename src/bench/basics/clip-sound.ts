/**
 * D991 (design studio; the owner's second BASICS playtest: "We could add sound to the hand animations, so that not only
 * player sees what they ought to do with their thumbs, but also hears how it should sound"): a stage's SHOW clip heard.
 * The clip was made from the stage's first version (exercises/runner version 0) at CLIP_RATE its tempo, its first note
 * CLIP_LEAD in (the hand renderer's own numbers); the same notes sound with it, on the stage's sound, and from 1.2 on the
 * stage's beat at the clip's tempo (a click, or the game's own drums). One clock, the audio's: loop k is laid at
 * T0 + k·L (L the video's length), scheduled a little ahead; the video follows that clock (set back on it whenever it
 * strays by more than SYNC_S), so nothing drifts however long the player watches.
 */
import type { Chip, Sounding } from "../../touch/chip.ts";
import { voicing } from "../../touch/chip.ts";
import { beatOf, fugueById, type TouchFugue } from "../../touch/fugue.ts";
import { ProtoGame } from "../proto-game.ts";
import { protoById } from "../protos.ts";
import type { Beat, Stage } from "./plan.ts";
import { basicsRun } from "./runner.ts";

/** The hand renderer's: the clip's tempo against the stage's, and its first note's time in. */
export const CLIP_RATE = 1.75;
export const CLIP_LEAD = 0.7;
/** How far the video may stray from the audio's clock before it is set back on it (s). */
export const SYNC_S = 0.04;
/** How far ahead the sound is laid (s), and how often. */
const AHEAD_S = 0.35;
const EVERY_MS = 50;

export interface ClipScore {
  piece: TouchFugue;
  /** The notes, in clip seconds. */
  notes: { t: number; d: number; midi: number }[];
  /** The beats, in clip seconds; the downbeats accented. */
  beats: { t: number; accent: boolean; tick: number; inBar: number; bar: number }[];
  beatS: number;
  perBar: number;
}

/** A stage's clip as music: its version-0 notes (the clip's), heads only, as the hand renderer took them. */
export function clipScore(st: Stage): ClipScore {
  const r = basicsRun(st, "do", 0);
  const f = fugueById(r.piece);
  const silent = { ctx: { currentTime: 0 }, heard: () => 0, note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }), swoosh() {}, tick() {} } as unknown as Chip;
  const g = new ProtoGame(f, r.voice, r.from, protoById("ladder"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: false, ...(r.tut ?? {}) }, silent);
  const ns = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  const first = ns[0]?.on ?? 0;
  const secOf = (tk: number) => CLIP_LEAD + ((tk - first) / f.tpq) * (60 / (r.bpm * CLIP_RATE));
  const b = beatOf(f);
  const beatS = secOf(first + b.ticks) - secOf(first);
  const last = ns.reduce((m, n) => Math.max(m, n.on + n.dur), first);
  const beats: ClipScore["beats"] = [];
  for (let tk = first; tk < last; tk += b.ticks) {
    const bar = f.bars.filter((x) => x.on <= tk).at(-1);
    const inBar = bar ? Math.round((tk - bar.on) / b.ticks) % b.perBar : 0;
    beats.push({ t: secOf(tk), accent: inBar === 0, tick: tk, inBar, bar: bar ? bar.n - 1 : 0 });
  }
  return { piece: f, notes: ns.map((n) => ({ t: secOf(n.on), d: secOf(n.on + n.dur) - secOf(n.on), midi: n.midi })), beats, beatS, perBar: b.perBar };
}

/**
 * The clip heard, kept on the audio's clock until stopped. `beat` as the stage's (plan.ts beatFor): a click at its gain,
 * or drums (the caller has set the style and the backing on, as a take does).
 */
export class ClipSound {
  private timer = 0;
  private t0 = 0;
  /** The time up to which sound is laid. */
  private laid = 0;
  private sounding: Sounding[] = [];
  private ch: Chip;
  private video: HTMLVideoElement;
  private score: ClipScore;
  private beat: Beat;
  constructor(ch: Chip, video: HTMLVideoElement, score: ClipScore, beat: Beat) {
    this.ch = ch;
    this.video = video;
    this.score = score;
    this.beat = beat;
  }

  /** The loop's length: the video's (each clip ends at rest, D699: a seamless loop). */
  private get len() {
    const d = this.video.duration;
    return Number.isFinite(d) && d > 0.5 ? d : Math.max(2, (this.score.notes.at(-1)?.t ?? 1) + 1);
  }

  /** The video set going at the audio's start (held on its first frame until then); the last time it was set back. */
  private rolling = false;
  private setAt = -Infinity;

  start() {
    const ctx = this.ch.ctx;
    this.t0 = ctx.currentTime + 0.15;
    this.laid = this.t0;
    this.video.loop = true;
    this.video.pause();
    this.video.currentTime = 0;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), EVERY_MS);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = 0;
    for (const s of this.sounding) s.stop();
    this.sounding = [];
  }

  private tick() {
    const ctx = this.ch.ctx;
    const L = this.len;
    const until = ctx.currentTime + AHEAD_S;
    // Lay every event of every loop that falls in (laid, until].
    const from = this.laid;
    if (until > from) {
      const k0 = Math.floor((from - this.t0) / L);
      const k1 = Math.floor((until - this.t0) / L);
      for (let k = Math.max(0, k0); k <= k1; k++) {
        const base = this.t0 + k * L;
        for (const n of this.score.notes) {
          const at = base + n.t;
          if (at > from && at <= until) this.sounding.push(this.ch.note(n.midi, at, n.d * 0.95, voicing(0, 1, true), { lead: true }));
        }
        if (!this.beat) continue;
        for (const b of this.score.beats) {
          const at = base + b.t;
          if (!(at > from && at <= until)) continue;
          if (this.beat.kind === "click") this.ch.tick(at, b.accent, this.beat.gain);
          else this.ch.groove(at, this.score.beatS, b.inBar, b.bar, this.score.perBar, false, { tick: b.tick, beat: beatOf(this.score.piece).ticks, fills: [], end: this.score.piece.length, piece: this.score.piece });
        }
      }
      this.laid = until;
    }
    if (this.sounding.length > 64) this.sounding = this.sounding.slice(-32);
    // The video on the audio's clock (what is heard now): set going as the first loop is heard; set back on it where it
    // strays, at most once a second (a seek takes a moment; it is never chased).
    const heard = this.ch.heard();
    if (heard < this.t0) return;
    if (!this.rolling) {
      this.rolling = true;
      void this.video.play().catch(() => {});
      return;
    }
    const pos = (((heard - this.t0) % L) + L) % L;
    const v = this.video.currentTime;
    const off = Math.min(Math.abs(v - pos), L - Math.abs(v - pos));
    if (off > SYNC_S && !this.video.seeking && heard - this.setAt > 1) {
      this.setAt = heard;
      this.video.currentTime = pos;
    }
  }
}
