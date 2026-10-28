/**
 * D317, THE LAB: a run's log and its recorder. A log holds what is needed to play the run again through
 * the engine without sound (replay.ts): the passage and the options the game was made with, the
 * parameters (MECH) in force, the device, the music box's rows, and every input the engine received
 * with the time it was judged at (the audio clock as heard), every frame (the engine's `step`, whose
 * timing decides a few things: a note held into its rest, a thumb's last touch's age), and every
 * verdict the engine reported (the tap), to compare a replay against.
 *
 * Times are integers in tenths of a millisecond, each event's as the delta from the event before; the
 * first is measured from the game's anchor (its first count-in beat, `timeAt(start)`). A frame is a
 * bare number; an input a short array:
 *   ["d", dt, id, x, y, side ("l"|"r")]   a touch down (play-area CSS px)
 *   ["m", dt, id, x, y]                    it moves
 *   ["u", dt, id]  ["c", dt, id]           it lifts; the system takes it back (pointercancel)
 *   ["k", dt, id, code, velocity, trill]   a computer's key down (KeyPress); ["K", dt, id] up
 *   ["r", dt, y0, rowH]                    the box's rows (yOf(step) = y0 - step * rowH)
 *   ["a", dt, w, h]                        the play area's size
 */
import type { ProtoGame, KeyPress } from "../proto-game.ts";
import type { Side } from "../../touch/thumbs.ts";
import { MECH, type Mech } from "../mechanics.ts";
import type { LabEvent } from "./events.ts";
import type { SensorExport } from "./sensor.ts";

export interface LabPassage {
  piece: string;
  voice: number;
  /** Bars, inclusive. */
  fromBar: number;
  toBar: number;
  /** Quarter notes a minute played, and as a share of the game's tempo (%). */
  bpm: number;
  tempoPct: number;
  proto: "ladder" | "keys";
  wait: boolean;
  bt: boolean;
  reading: string | null;
  sound?: string;
  loop?: boolean;
  drill?: string;
}

export type LabInput =
  | ["d", number, number, number, number, "l" | "r"]
  | ["m", number, number, number, number]
  | ["u", number, number]
  | ["c", number, number]
  | ["k", number, number, string, number, 0 | 1]
  | ["K", number, number]
  | ["r", number, number, number]
  | ["a", number, number, number];

export interface LabSummary {
  right: number;
  wrong: number;
  missed: number;
  stray: number;
  of: number;
  legato: number;
  legatoOf: number;
  slides: number;
  score: number;
}

export interface LabLog {
  v: 1;
  app: string;
  at: string;
  passage: LabPassage;
  mech: Mech;
  device: { w: number; h: number; dpr: number; ua: string; outputLatency?: number; baseLatency?: number; lag: number | null; platform?: string };
  /** The play area's size and the box's rows at the start (later changes are events). */
  area: { w: number; h: number };
  rows: { y0: number; rowH: number } | null;
  ev: (number | LabInput)[];
  verdicts: LabEvent[];
  result?: LabSummary;
  /** Stopped before the passage ended (STOP): a replay stops where it did. */
  stopped?: boolean;
  /** D329: the CONFIG preset the run was played with ("C · HAND-OVER", "(changed: …)" when edited after choosing it). */
  preset?: string;
  /** D321: the SENSOR tab's session (tap-strength test) at the run's end, when it has taps (not replayed). */
  sensor?: SensorExport;
  /** D333: a STUDY take: the study's id, its excerpt and take (from 0). */
  study?: { id: string; excerpt: number; take: number };
  /** D336: DYNAMICS on the player's notes (the sound only, never judged): the design, the strike's references at the start, each note's line. */
  dynamics?: { mode: string; adaptive: boolean; refs: { soft: number; hard: number; from: string; n?: number }; lines: string[] };
  /** D376: a take played in THE EXPRESSION LAB (lab.html?glenn=1: MECH.glenn on). */
  glenn?: true;
}

/** Units of the log's times: tenths of a millisecond. */
export const UNIT_S = 1e-4;

export function summaryOf(g: ProtoGame): LabSummary {
  const r = g.results();
  return { right: r.right, wrong: r.wrong, missed: r.missed, stray: r.stray, of: r.of, legato: r.art.legato, legatoOf: r.art.legatoOf, slides: r.slides, score: r.score };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Records a run as it is played: attach it to the game as soon as the game is made (before its first
 * step), call `frame()` before each `step()`, and pass every input through it (it hands them on to the
 * game). `heard` is the clock the engine judges by (Chip.heard).
 */
export class LabRecorder {
  readonly log: LabLog;
  private last = 0;
  private readonly anchor: number;
  private readonly g: ProtoGame;
  private readonly heard: () => number;
  private rowsKey = "";
  private areaKey = "";

  constructor(g: ProtoGame, heard: () => number, head: Omit<LabLog, "v" | "ev" | "verdicts" | "mech" | "rows"> & { rows?: LabLog["rows"] }, onEvent?: (e: LabEvent) => void) {
    this.g = g;
    this.heard = heard;
    this.anchor = g.timeAt(g.start);
    this.log = { v: 1, ...head, rows: head.rows ?? null, mech: { ...MECH }, ev: [], verdicts: [] };
    if (head.rows) this.rowsKey = `${round1(head.rows.y0)}:${head.rows.rowH}`;
    this.areaKey = `${head.area.w}:${head.area.h}`;
    g.tap = (e) => {
      this.log.verdicts.push(e);
      onEvent?.(e);
    };
  }
  /** The time (units from the anchor) an event at `ts` (its wall-clock stamp) is judged at, and its delta. */
  private dt(ts?: number): number {
    const t = this.heard() - (ts === undefined ? 0 : (this.g.wall() - ts) / 1000);
    const u = Math.round((t - this.anchor) / UNIT_S);
    const d = u - this.last;
    this.last = u;
    return d;
  }
  frame() {
    this.log.ev.push(this.dt());
  }
  rows(y0: number, rowH: number) {
    const key = `${round1(y0)}:${rowH}`;
    if (key === this.rowsKey) return;
    this.rowsKey = key;
    if (!this.log.rows) this.log.rows = { y0: round1(y0), rowH };
    else this.log.ev.push(["r", this.dt(), round1(y0), rowH]);
  }
  area(w: number, h: number) {
    const key = `${w}:${h}`;
    if (key === this.areaKey) return;
    this.areaKey = key;
    this.log.ev.push(["a", this.dt(), w, h]);
  }
  down(id: number, side: Side, x: number, y: number, w: number, h: number, ts: number) {
    this.area(w, h);
    this.log.ev.push(["d", this.dt(ts), id, round1(x), round1(y), side === "left" ? "l" : "r"]);
    this.g.down(id, { side, x, y, w, h }, ts);
  }
  move(id: number, x: number, y: number, w: number, h: number, ts: number) {
    this.log.ev.push(["m", this.dt(ts), id, round1(x), round1(y)]);
    this.g.move(id, { side: "left", x, y, w, h }, ts);
  }
  up(id: number, ts: number, cancelled = false) {
    this.log.ev.push([cancelled ? "c" : "u", this.dt(ts), id]);
    this.g.up(id, ts, cancelled);
  }
  keyDown(id: number, k: KeyPress, ts: number) {
    this.log.ev.push(["k", this.dt(ts), id, k.code ?? "", round1(k.velocity ?? 0.6), k.trill ? 1 : 0]);
    this.g.keyDown(id, k, ts);
  }
  keyUp(id: number, ts: number) {
    this.log.ev.push(["K", this.dt(ts), id]);
    this.g.keyUp(id, ts);
  }
  finish(stopped = false): LabLog {
    if (stopped) this.log.stopped = true;
    this.log.result = summaryOf(this.g);
    return this.log;
  }
}

/** A log as text, compact (one line; the owner pastes it). */
export function logText(log: LabLog): string {
  return JSON.stringify(log);
}

/** A log read back from text (pasted, a file), checked enough to replay; throws a plain message when it is not one. */
export function parseLog(text: string): LabLog {
  const at = text.indexOf("{");
  const log = JSON.parse(at > 0 ? text.slice(at) : text) as LabLog;
  if (!log || log.v !== 1 || !log.passage || !Array.isArray(log.ev)) throw new Error("not a lab log (v1)");
  return log;
}

/** D320: the Lab's runs kept on the device (LabApp's RUNS), the newest first. */
export const RUNS_KEY = "tb-lab-runs-v1";
export const MAX_RUNS = 20;

/**
 * D376: a take from THE EXPRESSION LAB kept with the Lab's own runs (the newest 20; the oldest go first
 * when the device's storage is full), titled GLENN, so the Lab's RUNS can copy and replay it. False: not kept.
 */
export function keepRun(log: LabLog, title: string): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(RUNS_KEY) ?? "[]") as { at: string; title: string; log: LabLog }[];
    let next = [{ at: log.at, title, log }, ...(Array.isArray(stored) ? stored : []).filter((r) => r.at !== log.at)].slice(0, MAX_RUNS);
    while (next.length) {
      try {
        localStorage.setItem(RUNS_KEY, JSON.stringify(next));
        return next.some((r) => r.at === log.at);
      } catch {
        next = next.slice(0, -1);
      }
    }
  } catch {
    /* no storage: nothing kept */
  }
  return false;
}
