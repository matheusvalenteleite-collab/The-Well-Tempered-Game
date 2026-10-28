/**
 * D342, THE MANUAL's lens (design 4.4): what a lesson's pass rule may look at, gathered from what the
 * engine already tells THE LAB (ProtoGame.tap's LabEvents) and from the run's notes, as an addition to
 * the run's results (RunResults). It never changes a verdict or a point: the game's own judging is the
 * game's (same windows, same MECH). Also kept as the run goes: what the lessons' visual aids draw (the
 * timing dial's last strikes, the move trace, the run trend line, each note's hold).
 */
import type { LabEvent, LadderWhy } from "../lab/events.ts";
import type { ProtoGame, RunResults } from "../proto-game.ts";
import { isRepeat } from "../protos.ts";
import type { Side } from "../../touch/thumbs.ts";
import { beatOf, inBar, type TouchFugue } from "../../touch/fugue.ts";

/**
 * D359: one note of the take as the coach reads it: where it is (bar, beat from 1), how it went (right,
 * wrong and why, missed), how early or late (ms, + late), which thumb, its release word, whether a join
 * into it was asked and made, and how it was sounded (a pull-off, a hammer-on).
 */
export interface NoteLens {
  i: number;
  bar: number;
  beat: number;
  state: "right" | "wrong" | "missed";
  why?: string;
  /** For a wrong note judged by its direction: the way the thumb went (+1 up, -1 down, 0 level) and the line's. */
  moved?: number;
  wanted?: number;
  off?: number;
  side?: Side;
  word?: string;
  join?: boolean;
  gesture?: string;
  /** Written length (ticks); the written onset (ms from the piece's start, as heard). */
  dur: number;
  ms: number;
  /** D359: held into the rest written after it. */
  over?: boolean;
}

/** The bar a tick is in (paint-proto.ts barNumberAt's, without the painter). */
export function barAt(f: Pick<TouchFugue, "bars">, tick: number): number {
  const bars = f.bars;
  if (!bars.length) return 1;
  let n = bars[0].n;
  for (const b of bars) if (b.on <= tick) n = b.n;
  return n;
}

/** The lens's figures for one run. Shares are numbers of notes (ok of of); a share with of 0 is not measured. */
export interface LensStats {
  of: number;
  right: number;
  /** The share right, a stray strike half a note (lessons.ts accuracy). */
  accuracy: number;
  /** Notes struck within their window, right or not (I.1: height is not judged there). */
  struck: number;
  /** The right notes' timing: how many, mean and spread (ms, + late), PERFECT among them. */
  timing: { n: number; mean: number; sd: number; perfect: number };
  /** The notes whose height was judged from a thumb's own last touch: the way right. */
  direction: { ok: number; of: number };
  /** The repeated notes struck right, of those in the passage; second contacts within the bounce window ignored; the gap before each repeat (ms, the lift to the strike). */
  repeats: { ok: number; of: number; doubles: number; gaps: number[] };
  held: { ok: number; of: number };
  rests: { ok: number; of: number };
  /** Successive right strikes under 400 ms apart (or a quaver apart as written): taken by the other thumb. */
  alternation: { alt: number; of: number };
  /** Notes that follow one another in the score, joined (legato, the gap at most MECH's). */
  joins: { ok: number; of: number };
  /** D334's gestures: pull-offs, hammer-ons, rests (how early, ms), prepared notes let go unsounded. */
  prep: { pullOffs: number; hammerOns: number; rests: number; letGo: number; earlyMs: number[] };
  /** D332's runs: RUN ✓ of runs; their notes right of their notes; the spread of their right notes' timing (ms). */
  runs: { ok: number; of: number; notesRight: number; notesOf: number; spreadMs: number | null; badBars?: number[] };
  /** Leaps (a fourth or more) judged: right, and by which thumb. */
  leaps: { ok: number; of: number; left: number; right: number };
  /** D325's touch inferred and the joins consistent with it. */
  touch: { style: string | null; ok: number; of: number };
  /** Each note's release word (HELD, SHORT, CLEAN, REST!, HELD · CLEAN), by its index. */
  words: Record<number, string>;
  /** The passage's last note: struck right, and its release word (null: not judged before the passage ended). */
  last: { hit: boolean; word: string | null };
  /** D359: every note of the take, for the coach (where a fault was, in bars and beats). */
  per: NoteLens[];
  /** D359: the reading's asks by mark (ProtoGame.styleBy): joined, apart, the dot, the accent. */
  marks: { joined: { ok: number; of: number }; apart: { ok: number; of: number }; short: { ok: number; of: number }; accent: { ok: number; of: number } };
  /** D359: D325b's expressive time taken: agogic leans kept, breaths, the close broadened, leans taken back. */
  graces: { agogic: number; breath: number; broaden: number; revoked: number };
  /** D359: the short note of each dotted pair (a note a third of the one before, or less): PERFECT of all. */
  dotted: { perfect: number; of: number };
  /** D359: the notes struck off the beat and sounding across the next (syncopes, ties): HELD of all. */
  ties: { held: number; of: number };
  /** D360 (Part V): the written ornaments read from the thumb's shake (of those in the passage), the player's own graces, and their kinds. */
  orn: { read: number; of: number; free: number; kinds: string[] };
  /**
   * D364 (V.5): the hold-over appoggiaturas: the places in the passage (ProtoGame.holdOverAt), those
   * made, how many short (a quick lift), and how long each held over as a share of its note.
   */
  appo: { of: number; made: number; short: number; shares: number[] };
}

const REPEAT_LIMIT_MS = 400;

export interface LiveStrike {
  at: number;
  offMs: number;
  perfect: boolean;
  ok: boolean;
  side: Side;
  /** D359: PERFECT by expressive time (D325b): a lean kept, a breath, the close broadened. */
  grace?: "agogic" | "breath" | "broaden";
}
export interface LiveTrace {
  at: number;
  side: Side;
  fromY: number;
  toY: number;
  ok: boolean;
  /** What the move needed (px), for a leap; "=" for a repeat. */
  need?: string;
  rule?: LadderWhy["rule"];
}
export interface LiveRun {
  at: number;
  ok: boolean;
  /** The landings (tick, y). */
  pts: { tick: number; y: number }[];
}
export interface LiveTag {
  at: number;
  i: number;
  word: "PULL-OFF" | "HAMMER-ON";
  side: Side;
}

const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

export class LensTally {
  readonly g: ProtoGame;
  private readonly notes = new Map<number, LabEvent & { kind: "note" }>();
  private doubles = 0;
  /** D364: the appoggiaturas made (their share of the note, short or long). */
  private appos: { share: number; short: boolean }[] = [];
  private pullOffs = 0;
  private hammerOns = 0;
  private rests = 0;
  private letGo = 0;
  private readonly earlyMs: number[] = [];
  private readonly runEvents: (LabEvent & { kind: "run" })[] = [];
  private readonly revoked = new Set<number>();
  private readonly words: Record<number, string> = {};
  /** Where each note landed (y, px), by index. */
  private readonly landings = new Map<number, number>();
  private readonly lastY: Partial<Record<Side, number>> = {};
  // THE AIDS' live state.
  readonly strikes: LiveStrike[] = [];
  readonly traces: LiveTrace[] = [];
  readonly trends: LiveRun[] = [];
  readonly tags: LiveTag[] = [];
  private readonly clock: () => number;
  private seen = { agogic: 0, breath: 0, broaden: 0 };
  private readonly readShakes = new Set<number>();
  private readonly shakeKinds: string[] = [];
  private readonly freeShakes: string[] = [];

  constructor(g: ProtoGame, clock: () => number = () => (typeof performance !== "undefined" ? performance.now() : 0)) {
    this.g = g;
    this.clock = clock;
  }

  /** One event from the engine (attach as the game's tap, or a lab recorder's onEvent). */
  feed = (e: LabEvent) => {
    if (e.track !== 0) return;
    const at = this.clock();
    switch (e.kind) {
      case "note": {
        if (e.slide) return;
        if (!this.notes.has(e.i)) this.notes.set(e.i, e);
        const y = this.g.lastBySide[e.side]?.y;
        if (y !== undefined) this.landings.set(e.i, y);
        // D359: the grace this strike was given, if any (the engine counts it before it tells the lens).
        const gr = this.g.graces;
        const grace = gr.agogic > this.seen.agogic ? "agogic" : gr.breath > this.seen.breath ? "breath" : gr.broaden > this.seen.broaden ? "broaden" : undefined;
        this.seen = { agogic: gr.agogic, breath: gr.breath, broaden: gr.broaden };
        if (e.ok) this.strikes.push({ at, offMs: e.offMs, perfect: e.perfect, ok: e.ok, side: e.side, ...(grace ? { grace } : {}) });
        if (this.strikes.length > 64) this.strikes.splice(0, 32);
        if (e.gesture === "pull-off" || e.gesture === "hammer-on") {
          if (e.gesture === "pull-off") this.pullOffs++;
          else this.hammerOns++;
          this.tags.push({ at, i: e.i, word: e.gesture === "pull-off" ? "PULL-OFF" : "HAMMER-ON", side: e.side });
          if (this.tags.length > 24) this.tags.splice(0, 12);
        }
        const w = e.ladder;
        if (y !== undefined && w && w.ref !== "free" && w.movedPx !== undefined) {
          this.traces.push({ at, side: e.side, fromY: y + w.movedPx, toY: y, ok: e.ok, rule: w.rule, need: w.rule === "repeat" ? "=" : w.rule === "leap" && w.needPx ? `≥ ${Math.round(w.needPx)} PX ${(w.steps ?? 0) > 0 ? "UP" : "DOWN"}` : undefined });
          if (this.traces.length > 24) this.traces.splice(0, 12);
        }
        if (y !== undefined) this.lastY[e.side] = y;
        return;
      }
      case "double":
        this.doubles++;
        return;
      case "shake":
        if (e.ornament.startsWith("settled")) return;
        if (e.free) this.freeShakes.push(e.ornament.toUpperCase());
        else this.readShakes.add(e.i), this.shakeKinds.push(e.ornament.toUpperCase());
        return;
      case "prep":
        if (e.what === "rest") this.rests++, e.earlyMs !== undefined && this.earlyMs.push(e.earlyMs);
        if (e.what === "let-go") this.letGo++;
        if (e.what === "appoggiatura") this.appos.push({ share: e.share ?? 0, short: !!e.short });
        return;
      case "run": {
        this.runEvents.push(e);
        const pts: { tick: number; y: number }[] = [];
        const ns = this.g.tracks[0].notes;
        for (let j = e.i - e.notes + 1; j <= e.i; j++) {
          const y = this.landings.get(j);
          if (y !== undefined && ns[j]) pts.push({ tick: ns[j].on, y });
        }
        this.trends.push({ at, ok: e.ok, pts });
        if (this.trends.length > 8) this.trends.splice(0, 4);
        return;
      }
      case "revoked":
        this.revoked.add(e.i);
        return;
      case "release":
        this.words[e.i] = e.word;
        return;
    }
  };

  /** The thumb that struck note i (THE AIDS' thumb letters), if it was struck. */
  sideOf(i: number): Side | undefined {
    return this.notes.get(i)?.side;
  }

  /**
   * The last `n` holds (THE AIDS' touch meter): each struck note's sounding from its onset to its lift,
   * as a share of the time to the next note's onset (D325's hold: 1 joined, over 1 overlapping), with
   * the note's index; the notes not yet let go left out.
   */
  holds(n = 16): { i: number; hold: number }[] {
    const g = this.g;
    const ns = g.tracks[0].notes;
    const lifted = new Map<number, number>();
    for (const l of g.lifts) if (l.k === 0) lifted.set(l.i, l.tick);
    const out: { i: number; hold: number }[] = [];
    for (const [i] of [...this.notes].sort((a, b) => a[0] - b[0])) {
      const off = lifted.get(i);
      const n = ns[i];
      if (off === undefined || !n || n.state !== "hit") continue;
      let j = i + 1;
      while (j < ns.length && (ns[j].ride || ns[j].on === n.on)) j++;
      const to = j < ns.length ? ns[j].on : n.on + n.dur;
      // A note given over to the next before its lift is joined: its hold from the next note's strike, if it came first.
      out.push({ i, hold: Math.max(0, Math.min(1.25, (off - n.on) / Math.max(1, to - n.on))) });
    }
    return out.slice(-n);
  }

  /** The figures, once the run is over (with its results). */
  stats(r: Pick<RunResults, "right" | "of" | "stray" | "art" | "thumbs">): LensStats {
    const g = this.g;
    const t = g.tracks[0];
    const ns = t.notes;
    const heads = ns.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && ns[i - 1].on === n.on));
    const evs = [...this.notes.values()];
    const rightEvs = evs.filter((e) => e.ok && !this.revoked.has(e.i) && ns[e.i]?.state === "hit");
    const offs = rightEvs.map((e) => e.offMs);
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    // Direction: the notes judged from a thumb's own (or the other's held) last touch.
    const judged = evs.filter((e) => e.ladder && e.ladder.ref !== "free");
    const dirOk = judged.filter((e) => e.ok && !this.revoked.has(e.i)).length;
    // Repeats in the passage, and the gap before each (the note before's lift to the strike).
    const repeatIdx = heads.filter(({ i }) => i > 0 && isRepeat(t.moves[i])).map(({ i }) => i);
    const lifted = new Map<number, number>();
    for (const l of g.lifts) if (l.k === 0 && !lifted.has(l.i)) lifted.set(l.i, l.tick);
    const gaps: number[] = [];
    for (const i of repeatIdx) {
      const prev = heads.filter((h) => h.i < i).at(-1)?.i;
      const struck = ns[i].at;
      const off = prev !== undefined ? lifted.get(prev) : undefined;
      if (struck !== undefined && off !== undefined && ns[i].state === "hit") gaps.push(Math.round((g.timeAt(struck) - g.timeAt(off)) * 1000));
    }
    // Alternation: successive right strikes under 400 ms apart.
    const bySide = rightEvs.filter((e) => ns[e.i]?.at !== undefined).sort((a, b) => a.i - b.i);
    let alt = 0;
    let altOf = 0;
    for (let k = 1; k < bySide.length; k++) {
      const a = bySide[k - 1];
      const b = bySide[k];
      const ms = (g.timeAt(ns[b.i].at!) - g.timeAt(ns[a.i].at!)) * 1000;
      // Quick notes: under 400 ms apart, or a quaver or less apart as written (a drill played slowly, WAIT FOR ME).
      if (ms > 0 && (ms < REPEAT_LIMIT_MS || ns[b.i].on - ns[a.i].on <= g.f.tpq / 2)) {
        altOf++;
        if (a.side !== b.side) alt++;
      }
    }
    const joinsJudged = evs.filter((e) => e.legato?.judged);
    // Runs: RUN ✓, the notes in them, and their timing spread.
    let notesOf = 0;
    let notesRight = 0;
    const runOffs: number[] = [];
    for (const e of this.runEvents) {
      for (let j = e.i - e.notes + 1; j <= e.i; j++) {
        if (!ns[j] || ns[j].ride) continue;
        notesOf++;
        if (ns[j].state === "hit") {
          notesRight++;
          const ev = this.notes.get(j);
          if (ev?.ok) runOffs.push(ev.offMs);
        }
      }
    }
    const leapEvs = judged.filter((e) => e.ladder?.rule === "leap");
    // D359: the coach's notes, the dotted pairs' short notes, the syncopes.
    const f = g.f;
    const beat = beatOf(f).ticks;
    const per: NoteLens[] = heads.map(({ n, i }, k) => {
      const e = this.notes.get(i);
      // A note held into the rest written after it (the engine calls REST! but tells no event of it).
      const nx = heads[k + 1]?.n;
      const restT = nx ? nx.on - (n.on + n.dur) : 0;
      const off = lifted.get(i);
      const over = restT >= beat / 4 && n.state === "hit" && (off === undefined || off > n.on + n.dur + Math.max(restT * 0.25, 0.08 * g.tps));
      const right = n.state === "hit" && !this.revoked.has(i);
      const lw = e?.ladder;
      const moved = lw?.movedPx === undefined ? undefined : Math.abs(lw.movedPx) < 3 ? 0 : Math.sign(lw.movedPx);
      return {
        i,
        bar: barAt(f, n.on),
        beat: Math.round((inBar(f, n.on) / beat + 1) * 100) / 100,
        state: right ? "right" : e ? "wrong" : "missed",
        ...(e && !right && e.why ? { why: e.why } : {}),
        ...(e && !right && moved !== undefined ? { moved, wanted: Math.sign(lw?.steps ?? 0) } : {}),
        ...(e ? { off: Math.round(e.offMs), side: e.side } : {}),
        ...(this.words[i] ? { word: this.words[i] } : {}),
        ...(e?.legato?.judged ? { join: e.legato.ok } : {}),
        ...(e?.gesture ? { gesture: e.gesture } : {}),
        dur: n.dur,
        ms: Math.round(g.timeAt(n.on) * 1000),
        ...(over ? { over: true } : {}),
      };
    });
    let dotPerfect = 0;
    let dotOf = 0;
    let tieHeld = 0;
    let tieOf = 0;
    heads.forEach(({ n, i }, k) => {
      const prev = heads[k - 1]?.n;
      if (prev && prev.on + prev.dur === n.on && prev.dur >= 3 * n.dur && n.dur < beat) {
        dotOf++;
        const e = this.notes.get(i);
        if (n.state === "hit" && e?.ok && e.perfect) dotPerfect++;
      }
      // A syncope (struck off the beat, sounding across the next) or a note tied over the bar line.
      const into = inBar(f, n.on) % beat;
      const barLine = f.bars.find((b) => b.on > n.on)?.on ?? Infinity;
      if (((into > 0 && n.on + n.dur > n.on - into + beat) || n.on + n.dur > barLine) && n.dur >= beat) {
        tieOf++;
        if (n.state === "hit" && (this.words[i] ?? "").startsWith("HELD")) tieHeld++;
      }
    });
    const sb = g.styleBy;
    return {
      of: r.of,
      right: r.right,
      accuracy: r.right / Math.max(1, r.of + r.stray / 2),
      struck: evs.length,
      timing: { n: offs.length, mean: Math.round(mean), sd: Math.round(sd(offs)), perfect: rightEvs.filter((e) => e.perfect).length },
      direction: { ok: dirOk, of: judged.length },
      repeats: { ok: repeatIdx.filter((i) => ns[i].state === "hit").length, of: repeatIdx.length, doubles: this.doubles, gaps },
      held: { ok: r.art.held, of: r.art.heldOf },
      rests: { ok: r.art.clean, of: r.art.cleanOf },
      alternation: { alt, of: altOf },
      joins: { ok: joinsJudged.filter((e) => e.legato?.ok).length, of: joinsJudged.length },
      prep: { pullOffs: this.pullOffs, hammerOns: this.hammerOns, rests: this.rests, letGo: this.letGo, earlyMs: [...this.earlyMs] },
      runs: { ok: this.runEvents.filter((e) => e.ok).length, of: this.runEvents.length, notesRight, notesOf, spreadMs: runOffs.length > 1 ? Math.round(sd(runOffs)) : null, badBars: this.runEvents.filter((e) => !e.ok && ns[e.i]).map((e) => barAt(f, ns[e.i - e.notes + 1]?.on ?? ns[e.i].on)) },
      leaps: { ok: leapEvs.filter((e) => e.ok).length, of: leapEvs.length, left: leapEvs.filter((e) => e.side === "left").length, right: leapEvs.filter((e) => e.side === "right").length },
      touch: { style: r.art.touch ?? null, ok: r.art.touchOk ?? 0, of: r.art.touchOf ?? 0 },
      words: { ...this.words },
      last: { hit: heads.at(-1)?.n.state === "hit", word: heads.length ? (this.words[heads.at(-1)!.i] ?? null) : null },
      per,
      marks: { joined: { ok: sb.joined.hit, of: sb.joined.of }, apart: { ok: sb.apart.hit, of: sb.apart.of }, short: { ok: sb.short.hit, of: sb.short.of }, accent: { ok: sb.accent.hit, of: sb.accent.of } },
      graces: { ...g.graces },
      dotted: { perfect: dotPerfect, of: dotOf },
      ties: { held: tieHeld, of: tieOf },
      orn: { read: this.readShakes.size, of: heads.filter(({ i }) => !!g.ornamentAt(0, i)).length, free: this.freeShakes.length, kinds: [...this.shakeKinds, ...this.freeShakes] },
      appo: { of: heads.filter(({ i }) => g.holdOverAt(0, i)).length, made: this.appos.length, short: this.appos.filter((a) => a.short).length, shares: this.appos.map((a) => Math.round(a.share * 100) / 100) },
    };
  }
}

/** The share ok/of (null when nothing was measured). */
export const share = (x: { ok: number; of: number } | { alt: number; of: number }): number | null => (x.of > 0 ? ("ok" in x ? x.ok : x.alt) / x.of : null);
