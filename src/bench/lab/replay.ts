/**
 * D317, THE LAB's replay: a run's log played again through the engine, silently and deterministically
 * (the clock injected: the frames and the inputs at their recorded times, no performance.now, nothing
 * random), with the parameters as recorded or changed, and the verdicts compared with the log's.
 * Runs in the browser (the lab's REPLAY) and in node (tools/lab/replay.ts).
 */
import type { Chip, Sounding } from "../../touch/chip.ts";
import { barAt, barStart, beatOf, fugueById } from "../../touch/fugue.ts";
import { MECH, MECH_DEFAULTS, mechPhrase, withMech, type Mech, type MechKey } from "../mechanics.ts";
import type { Rows } from "../proto-game.ts";
import type { LabEvent } from "./events.ts";
import { labGame } from "./game.ts";
import { summaryOf, UNIT_S, type LabLog, type LabSummary } from "./log.ts";

const SILENT: Sounding = { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} };

/** A sound engine that sounds nothing, its clock the replay's. */
export function silentChip(clock: { t: number }): Chip {
  return {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    note: () => SILENT,
    swoosh() {},
    tick() {},
    chime() {},
    lag: 0,
    visual: 0,
    smooth: false,
  } as unknown as Chip;
}

/** The box's rows from a log's (y0, rowH). */
export function rowsOf(y0: number, rowH: number): Rows {
  return { yOf: (s) => y0 - s * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
}

export interface ReplayResult {
  events: LabEvent[];
  summary: LabSummary;
  mech: Mech;
}

/** The log played again with its own parameters, or with `mech` (a whole set or some changes on the log's). */
export function replay(log: LabLog, mech?: Partial<Mech>): ReplayResult {
  const values = { ...log.mech, ...(mech ?? {}) };
  return withMech(values, () => {
    const clock = { t: 0 };
    const chip = silentChip(clock);
    const g = labGame(log.passage, chip);
    g.wall = () => 0;
    const events: LabEvent[] = [];
    g.tap = (e) => events.push(e);
    // The game's anchor (its first beat) is 0.15 s after its making (ProtoGame: anchorAt).
    const base = g.timeAt(g.start);
    let area = { ...log.area };
    if (log.rows) g.rows = rowsOf(log.rows.y0, log.rows.rowH);
    let u = 0;
    let done = false;
    for (const e of log.ev) {
      if (done) break;
      if (typeof e === "number") {
        u += e;
        clock.t = base + u * UNIT_S;
        done = g.step();
        continue;
      }
      u += e[1];
      clock.t = base + u * UNIT_S;
      switch (e[0]) {
        case "d":
          g.down(e[2], { side: e[5] === "l" ? "left" : "right", x: e[3], y: e[4], w: area.w, h: area.h }, 0);
          break;
        case "m":
          g.move(e[2], { side: "left", x: e[3], y: e[4], w: area.w, h: area.h }, 0);
          break;
        case "u":
          g.up(e[2], 0);
          break;
        case "c":
          g.up(e[2], 0, true);
          break;
        case "k":
          g.keyDown(e[2], { code: e[3], velocity: e[4], trill: !!e[5] }, 0);
          break;
        case "K":
          g.keyUp(e[2], 0);
          break;
        case "r":
          g.rows = rowsOf(e[2], e[3]);
          break;
        case "a":
          area = { w: e[2], h: e[3] };
          break;
      }
    }
    // On to the end (the notes after the last touch go by missed), unless the run was stopped there.
    for (let n = 0; !done && !log.stopped && n < 60 * 600; n++) {
      clock.t += 1 / 60;
      done = g.step();
    }
    return { events, summary: summaryOf(g), mech: { ...MECH } };
  });
}

/** A note's outcome, by track and index: right, wrong or missed, and whether its join was credited. */
export interface Outcome {
  out: "right" | "wrong" | "miss";
  legato?: boolean;
  tick: number;
  midi: number;
}
export function outcomes(events: readonly LabEvent[]): Map<string, Outcome> {
  const m = new Map<string, Outcome>();
  for (const e of events) {
    if (e.kind === "note") m.set(`${e.track}:${e.i}`, { out: e.ok ? "right" : "wrong", legato: e.legato?.judged ? e.legato.ok : undefined, tick: e.tick, midi: e.midi });
    else if (e.kind === "miss" && !m.has(`${e.track}:${e.i}`)) m.set(`${e.track}:${e.i}`, { out: "miss", tick: e.tick, midi: e.midi });
  }
  return m;
}

export interface Tally {
  right: number;
  wrong: number;
  missed: number;
  stray: number;
  joined: number;
  notJoined: number;
  slides: number;
  shakes: number;
  cancels: number;
}
export function tally(events: readonly LabEvent[]): Tally {
  const t: Tally = { right: 0, wrong: 0, missed: 0, stray: 0, joined: 0, notJoined: 0, slides: 0, shakes: 0, cancels: 0 };
  for (const o of outcomes(events).values()) {
    if (o.out === "right") t.right++;
    else if (o.out === "wrong") t.wrong++;
    else t.missed++;
    if (o.legato === true) t.joined++;
    if (o.legato === false) t.notJoined++;
  }
  for (const e of events) {
    if (e.kind === "stray") t.stray++;
    if (e.kind === "slide") t.slides++;
    if (e.kind === "shake") t.shakes++;
    if (e.kind === "cancel") t.cancels++;
  }
  return t;
}

export interface Diff {
  /** The parameters changed against the log's, as phrases ("Legato gap 100 ms (was 90)"). */
  changed: string[];
  before: Tally;
  after: Tally;
  /** Notes whose outcome changed: "b3.2 G4: WRONG → RIGHT", "b4.1 A4: NOT JOINED → JOINED". */
  notes: string[];
  /** Identical verdicts (every note's outcome and join, the strays): a faithful replay. */
  same: boolean;
  /** One line: "with Legato gap 100 ms: 7 more joined, 2 fewer wrong". */
  line: string;
}

/** A bar and beat ("b3.2") for a tick. */
export function where(piece: string, tick: number): string {
  const f = fugueById(piece);
  const first = f.bars[0];
  // Before the first bar (an upbeat): "b0.n", counted back in beats from bar 1.
  const bar = first && tick < first.on ? first.n - 1 : barAt(f, tick);
  const start = first && tick < first.on ? first.on - f.barTicks : barStart(f, bar);
  const beat = (tick - start) / beatOf(f).ticks + 1;
  return `b${bar}.${Math.max(1, Math.floor(beat + 1e-6))}`;
}

const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
/** A pitch as the score spells it ("Eb4"), else plainly. */
export function pitchName(piece: string, midi: number): string {
  const sp = fugueById(piece).spell?.[String(midi)];
  return sp ?? `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

const WORD = { right: "RIGHT", wrong: "WRONG", miss: "MISSED" } as const;

export function diff(log: LabLog, before: readonly LabEvent[], after: readonly LabEvent[], mechAfter: Mech): Diff {
  const changed = (Object.keys(MECH_DEFAULTS) as MechKey[]).filter((k) => log.mech[k] !== mechAfter[k] && !(log.mech[k] === undefined && mechAfter[k] === MECH_DEFAULTS[k])).map((k) => `${mechPhrase(k, mechAfter[k])} (was ${String(log.mech[k] ?? MECH_DEFAULTS[k])})`);
  const a = outcomes(before);
  const b = outcomes(after);
  const notes: string[] = [];
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => (a.get(x) ?? b.get(x))!.tick - (a.get(y) ?? b.get(y))!.tick);
  for (const k of keys) {
    const x = a.get(k);
    const y = b.get(k);
    const o = (x ?? y)!;
    const name = `${where(log.passage.piece, o.tick)} ${pitchName(log.passage.piece, o.midi)}`;
    if (x?.out !== y?.out) notes.push(`${name}: ${x ? WORD[x.out] : "—"} → ${y ? WORD[y.out] : "—"}`);
    else if (x?.legato !== y?.legato && (x?.legato !== undefined || y?.legato !== undefined)) notes.push(`${name}: ${x?.legato ? "JOINED" : "NOT JOINED"} → ${y?.legato ? "JOINED" : "NOT JOINED"}`);
  }
  const t0 = tally(before);
  const t1 = tally(after);
  const same = notes.length === 0 && t0.stray === t1.stray;
  const parts: string[] = [];
  const say = (n: number, more: string, fewer: string, what: string) => n && parts.push(`${Math.abs(n)} ${n > 0 ? more : fewer} ${what}`);
  say(t1.right - t0.right, "more", "fewer", "right");
  say(t1.wrong - t0.wrong, "more", "fewer", "wrong");
  say(t1.missed - t0.missed, "more", "fewer", "missed");
  say(t1.stray - t0.stray, "more", "fewer", "stray");
  say(t1.joined - t0.joined, "more", "fewer", "joined");
  say(t1.slides - t0.slides, "more", "fewer", "slides");
  const head = changed.length ? `with ${changed.map((c) => c.replace(/ \(was .*\)$/, "")).join(", ")}` : "with the same parameters";
  const line = `${head}: ${same ? "identical verdicts" : parts.length ? parts.join(", ") : `${notes.length} notes changed, the counts the same`}`;
  return { changed, before: t0, after: t1, notes, same, line };
}
