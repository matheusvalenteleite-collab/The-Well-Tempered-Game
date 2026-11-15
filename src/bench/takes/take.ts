/**
 * D457, RECORD YOUR FUGUE (phase 1): a take, the player's voice exactly as it was played, kept to listen to again.
 *
 * A take keeps what the sound engine was asked to play for the player's own voice (every note through
 * ProtoGame's single funnel for the player's sounds, `touchNote`): each note's pitch as sounded (a wrong
 * note's wrong pitch included), when, how long, and its touch (`Play`: strength, joins, accent, ornament),
 * and everything done to it after it began (released, slid on, bent, swelled, trimmed), each with its time.
 * Times are kept as places in the score (ticks), not seconds: the band follows the score's clock (its
 * ritardandi, its fermatas), so a take played back stays with the band at its own tempo and keeps the
 * player's early and late. The time a touch is kept at is the one the judge reads it at (the clock as
 * heard, the headphone delay taken off), so a Bluetooth take is not played back a delay late.
 *
 * With it the run's input log (THE LAB's, D317), so a take can be judged again by the game exactly as it
 * was judged: its score is the run's (the test of D457).
 */
import type { Play, Sounding, Voicing } from "../../touch/chip.ts";
import type { LabEvent } from "../lab/events.ts";
import type { LabLog } from "../lab/log.ts";

/** A note asked for: its index (the order asked), tick, MIDI, length in ticks (-1: held until a `stop`), the voicing's own parts, the touch. */
export type TakeNote = [i: number, tick: number, midi: number, len: number, voice: TakeVoicing, play: Record<string, unknown>];
/** What the engine kept of a voicing (the rest is the sound's own, rebuilt as played back). */
export interface TakeVoicing {
  pan: number;
  gain: number;
  bass?: boolean;
}
/**
 * Something done to a note after it began: [tick, the note's index, what, ...its values]. `stop` [at?]:
 * released (`how`, a bowed note's way of giving way); `trim` [level, tick, untilTick]; the rest as
 * Sounding's own (bend cents, glide midi tau?, muffle, dyn level, shape s).
 */
export type TakeCall = [tick: number, i: number, what: "stop" | "bend" | "glide" | "muffle" | "dyn" | "shape" | "trim", ...args: unknown[]];

/** Each of the player's notes in the score as the run judged it: "r" right, "w" wrong, "m" missed, "-" not reached. */
export type TakeOutcomes = string[];

export interface Take {
  v: 1;
  /** Unique, and the order of making (an ISO time and a random tail). */
  id: string;
  piece: string;
  /** The voice played (0 the top) and the voices the piece has. */
  voice: number;
  voices: number;
  /** When it was played (ISO). */
  at: string;
  /** The run's grade and score ("" grade: the crowd left). */
  grade: string;
  score: number;
  failedBar: number | null;
  /** The sound it was played on (a preset id), the reading, the tempo (quarters a minute; the piece's own at 100 %). */
  sound: string;
  reading: string | null;
  bpm: number;
  tempoPct: number;
  /** The headphone delay in force (s) and the game's version: what it was made with. */
  lag: number;
  app: string;
  /** The span played (ticks). */
  from: number;
  until: number;
  /** A name the player gave it (else it is named by `takeName`). */
  name?: string;
  /** D457: the take the fugue's voice uses ("my fugue"'s, phase 2). */
  star?: boolean;
  notes: TakeNote[];
  calls: TakeCall[];
  /** By track (the voices played), each note's outcome. */
  out: TakeOutcomes;
  /** THE LAB's log of the run (its touches), to judge it again. */
  log?: LabLog;
}

/** Ticks kept to a tenth (a tick is a 1920th of a quarter: a tenth is far under a millisecond). */
const tk = (t: number) => Math.round(t * 10) / 10;

/** A touch kept plain: no sound nodes, no functions, numbers to five places. */
export function plainPlay(p: Play): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || typeof v === "function") continue;
    if (v && typeof v === "object" && typeof (v as { connect?: unknown }).connect === "function") continue;
    out[k] = typeof v === "number" ? Math.round(v * 1e5) / 1e5 : v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
  }
  return out;
}

/** The clocks a recorder reads (ProtoGame's): a time on the audio clock to its tick; the delay heard (s). */
export interface TakeClock {
  tickAtTime(t: number): number;
  /** The audio clock now (s). */
  current(): number;
  /** How far the clock as heard runs behind the audio clock (s): the headphone delay. */
  behind(): number;
}

/** Notes held until released are asked for this long (ProtoGame's HOLD_MAX); kept as -1. */
export const HELD_LEN_S = 8;

/** Records the player's sounds as they are asked for (attach to the game before its first step). */
export class TakeRecorder {
  readonly notes: TakeNote[] = [];
  readonly calls: TakeCall[] = [];
  private readonly clock: TakeClock;
  constructor(clock: TakeClock) {
    this.clock = clock;
  }
  /** The tick a time on the audio clock is kept at (as heard: the delay off). */
  private tickOf(t: number): number {
    return tk(this.clock.tickAtTime(t - this.clock.behind()));
  }
  /** A note asked for, and the sound made: hands back a sound that keeps what is done to it. */
  note(midi: number, at: number, dur: number, v: Voicing, p: Play, sd: Sounding): Sounding {
    const i = this.notes.length;
    const tick = this.tickOf(at);
    const len = dur >= HELD_LEN_S - 1e-6 ? -1 : Math.max(0, tk(this.tickOf(at + dur) - tick));
    this.notes.push([i, tick, midi, len, { pan: Math.round(v.pan * 1e3) / 1e3, gain: Math.round(v.gain * 1e4) / 1e4, ...(v.bass ? { bass: true } : {}) }, plainPlay(p)]);
    const now = () => this.tickOf(this.clock.current());
    const keep = (what: TakeCall[2], ...args: unknown[]) => this.calls.push([now(), i, what, ...args]);
    const out: Sounding = {
      stop: (at2, how) => {
        this.calls.push([at2 === undefined ? now() : this.tickOf(at2), i, "stop", ...(how !== undefined ? [typeof how === "object" ? JSON.parse(JSON.stringify(how)) : how] : [])]);
        sd.stop(at2, how);
      },
      bend: (cents) => (keep("bend", cents), sd.bend(cents)),
    };
    if (sd.glide) out.glide = (m, tau) => (keep("glide", m, ...(tau !== undefined ? [tau] : [])), sd.glide!(m, tau));
    if (sd.muffle) out.muffle = () => (keep("muffle"), sd.muffle!());
    if (sd.dyn) out.dyn = (l) => (keep("dyn", Math.round(l * 1e4) / 1e4), sd.dyn!(l));
    if (sd.shape) out.shape = (s) => (keep("shape", Math.round(s * 1e4) / 1e4), sd.shape!(s));
    if (sd.trim) out.trim = (l, a, u) => (this.calls.push([now(), i, "trim", Math.round(l * 1e4) / 1e4, this.tickOf(a), this.tickOf(u)]), sd.trim!(l, a, u));
    return out;
  }
}

/** Each note's outcome by track from the run's verdicts (THE LAB's events). */
export function outcomesOf(events: readonly LabEvent[], tracks: readonly number[]): TakeOutcomes {
  const o = tracks.map((n) => Array.from({ length: n }, () => "-"));
  for (const e of events) {
    if (e.kind !== "note" && e.kind !== "miss" && e.kind !== "revoked") continue;
    const row = o[e.track];
    if (!row || e.i < 0 || e.i >= row.length) continue;
    if (e.kind === "note") row[e.i] = e.ok ? "r" : "w";
    else if (e.kind === "miss" && row[e.i] === "-") row[e.i] = "m";
    else if (e.kind === "revoked") row[e.i] = "w";
  }
  return o.map((r) => r.join(""));
}

/** "ALTO · A · 17:30 23/05/2026" (the owner's own example), the sound added where it is not the piece's own. */
export function takeName(t: Pick<Take, "voice" | "voices" | "grade" | "at" | "name">, voiceWord: (voice: number, count: number) => string, grade?: string): string {
  if (t.name) return t.name;
  const d = new Date(t.at);
  const two = (n: number) => String(n).padStart(2, "0");
  const when = `${two(d.getHours())}:${two(d.getMinutes())} ${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
  return [voiceWord(t.voice, t.voices), grade ?? (t.grade || "—"), when].join(" · ");
}

/** A take's id: its time and a short random tail (two saved the same second stay apart). */
export function takeId(at: string): string {
  return `${at}-${Math.random().toString(36).slice(2, 7)}`;
}

/** What a take weighs as kept (bytes, its log included). */
export function takeBytes(t: Take): number {
  return JSON.stringify(t).length;
}

/**
 * Plays a take back through the game as the player's voice (ProtoGame.listen): the notes put on the
 * schedule as the band's are (a little ahead), what was done to each note done again at its time, and
 * each note of the score shown as the run judged it, as its time comes.
 */
export class TakePlayer {
  private n = 0;
  private c = 0;
  private readonly sounds = new Map<number, Sounding>();
  private readonly calls: TakeCall[];
  readonly take: Take;
  /** `from` (D724, a render in parts): the take's notes and gestures before this tick left out. */
  constructor(take: Take, from = -Infinity) {
    this.take = take;
    this.calls = [...take.calls].sort((a, b) => a[0] - b[0]);
    if (from > -Infinity) {
      while (this.n < take.notes.length && take.notes[this.n][1] < from) this.n++;
      while (this.c < this.calls.length && this.calls[this.c][0] < from) this.c++;
    }
  }
  /**
   * One frame. `ahead`: the tick scheduled up to (the band's horizon); `live`: the tick sounding on the
   * audio clock now. `play` makes a note at a tick; `timeAt` a tick's time.
   */
  step(ahead: number, live: number, timeAt: (tick: number) => number, play: (n: TakeNote, at: number, dur: number) => Sounding): void {
    const notes = this.take.notes;
    while (this.n < notes.length && notes[this.n][1] <= ahead) {
      const nt = notes[this.n++];
      const at = timeAt(nt[1]);
      const dur = nt[3] < 0 ? HELD_LEN_S : Math.max(0.01, timeAt(nt[1] + nt[3]) - at);
      this.sounds.set(nt[0], play(nt, at, dur));
    }
    // Releases and trims go on the schedule ahead with their notes; the live gestures (slides, bends, swells) at their time.
    while (this.c < this.calls.length) {
      const k = this.calls[this.c];
      const scheduled = k[2] === "stop" || k[2] === "trim";
      if (k[0] > (scheduled ? ahead : live)) break;
      const sd = this.sounds.get(k[1]);
      if (!sd && notes.some((x) => x[0] === k[1]) && notes.findIndex((x) => x[0] === k[1]) >= this.n) break;
      this.c++;
      if (!sd) continue;
      const a = k.slice(3);
      if (k[2] === "stop") sd.stop(timeAt(k[0]), a[0] as never);
      else if (k[2] === "trim") sd.trim?.(a[0] as number, timeAt(a[1] as number), timeAt(a[2] as number));
      else if (k[2] === "bend") sd.bend(a[0] as number);
      else if (k[2] === "glide") sd.glide?.(a[0] as number, a[1] as number | undefined);
      else if (k[2] === "muffle") sd.muffle?.();
      else if (k[2] === "dyn") sd.dyn?.(a[0] as number);
      else if (k[2] === "shape") sd.shape?.(a[0] as number);
    }
  }
  /** Every note released now (the end, ✕). */
  stopAll(at: number) {
    for (const sd of this.sounds.values()) sd.stop(at);
    this.sounds.clear();
  }
  /** Done: every note and every call played. */
  get done(): boolean {
    return this.n >= this.take.notes.length && this.c >= this.calls.length;
  }
}
