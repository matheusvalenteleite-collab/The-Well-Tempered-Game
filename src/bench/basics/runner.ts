/**
 * D689 (design studio; BASICS v2): a stage's take as the game's run, and where the tutorial is. DO: the aids on,
 * the music waiting at the first note (at every note in 1.1); PROVE: the aids fading. LADDER, nothing failed, the
 * timing windows a little wider in the first four acts. D941: no count-in (PROVE waits at its first note too), the
 * stage's beat (plan.ts beatFor), the take ended at its last note, each later take another version (versionAt).
 */
import { fugueById } from "../../touch/fugue.ts";
import type { Run } from "../lessons.ts";
import { runOf, type Material } from "../manual/lessons.ts";
import { ACTS, beatFor, slower, type Stage } from "./plan.ts";
import { versionOf } from "./exercises.ts";

export type Phase = "do" | "prove";

export interface BasicsAt {
  act: number;
  stage: number;
  phase: Phase;
  /** Misses so far in this stage (the help steps), and the tempo notches taken off. */
  misses: number;
  notches: number;
  /** Takes so far in this stage (Act VI's light rule: passed after three). */
  takes?: number;
  /** D941: the take's version (0, or none: the stage as written, as its clip shows it; each later take the next). */
  v?: number;
}

/** D941: what a take plays: the stage's piece, voice and bars at version k (and where its cue falls). */
export interface Version {
  piece: string;
  voice: number;
  fromBar?: number;
  toBar?: number;
  skip?: number;
  count?: number;
  cueBar?: number;
}
const barOf = (piece: string, tick: number) => fugueById(piece).bars.filter((b) => b.on <= tick).at(-1)?.n ?? 1;
/** 6.4's other passages: a trill in a tenor (CP4's second; CP10's), the bars around it. */
const TRILL_PLACES: readonly [string, number][] = [
  ["bwv1080-04", 2],
  ["bwv1080-10", 2],
];
/**
 * D941 (the owner: "minimal modifications instead of exact repetition"): a stage's take k. Our own lines: a version
 * made from (stage, k) (exercises.ts versionOf). Bach's music is never altered: a later take plays the same subject's
 * next entry (the alto's at bar 1, the soprano's answer at 5, the bass's at 9, the tenor's at 13 ...), for a stage that is
 * answered (5.2) only an entry answered four bars on; 6.4 another trill.
 */
export function versionAt(st: Stage, k: number): Version {
  const base: Version = { piece: st.piece, voice: st.voice, ...(st.fromBar ? { fromBar: st.fromBar } : {}), ...(st.toBar ? { toBar: st.toBar } : {}), ...(st.skip ? { skip: st.skip } : {}), ...(st.count ? { count: st.count } : {}), ...(st.cue ? { cueBar: st.cue.bar } : {}) };
  if (k <= 0) return base;
  if (!st.piece.startsWith("bwv")) return { ...base, piece: versionOf(st.piece, st.id, k) };
  if (st.ornaments) {
    const places = TRILL_PLACES.flatMap(([piece, voice]) =>
      (fugueById(piece).ornaments ?? [])
        .filter((o) => o[0] === voice && /^T/.test(o[2] ?? ""))
        .map((o) => barOf(piece, o[1]))
        .filter((b) => !(piece === st.piece && st.fromBar !== undefined && b >= st.fromBar && b <= (st.toBar ?? b)))
        .map((b) => ({ piece, voice, fromBar: b - 2, toBar: b + 1 })),
    );
    return places.length ? places[(k - 1) % places.length] : base;
  }
  if (st.fromBar === undefined || st.toBar === undefined) return base;
  const f = fugueById(st.piece);
  const span = st.toBar - st.fromBar;
  const answer = st.cue ? st.cue.bar - st.fromBar : null;
  const starts = f.entries.filter((e) => !e.inverted && !e.scale).map((e) => ({ voice: e.voice, bar: barOf(st.piece, e.on) }));
  const ok = starts.filter((e, i) => starts.findIndex((x) => x.voice === e.voice && x.bar === e.bar) === i && e.bar + span <= (f.bars.at(-1)?.n ?? 0) && (answer === null || starts.some((x) => x.bar === e.bar + answer && x.voice !== e.voice)));
  const turn = ok.slice(0, 6);
  const at = turn.findIndex((e) => e.voice === st.voice && e.bar === st.fromBar);
  if (at < 0 || turn.length < 2) return base;
  const e = turn[(at + k) % turn.length];
  return { piece: st.piece, voice: e.voice, fromBar: e.bar, toBar: e.bar + span, ...(answer !== null ? { cueBar: e.bar + answer } : {}) };
}

export const stageOf = (at: Pick<BasicsAt, "act" | "stage">): Stage => ACTS[at.act].stages[at.stage];

export function basicsRun(st: Stage, phase: Phase, notches: number, k = 0): Run {
  const ver = versionAt(st, k);
  const f = fugueById(ver.piece);
  const lastBar = f.bars.at(-1)?.n ?? 1;
  const m: Material = {
    piece: ver.piece,
    voice: ver.voice,
    fromBar: ver.fromBar ?? 1,
    toBar: ver.toBar ?? lastBar,
    tempo: { bpm: slower(st.bpm, notches) },
    label: `BASICS ${st.id}`,
    badge: "IN GAME",
    wait: st.wait === "all",
    solo: st.solo,
    ...(st.easy ? { easy: st.easy } : {}),
    ...(st.side ? { side: st.side } : {}),
    ...(ver.skip ? { skip: ver.skip } : {}),
    ...(ver.count ? { count: ver.count } : {}),
  };
  const r = runOf(m, undefined, [], !!st.ornaments, false);
  const beat = beatFor(st);
  const early = Number(st.id[0]) <= 4;
  return {
    ...r,
    fail: false,
    // D941: the stage's own line is the instruction: not the game's ornament hint beside it (6.4).
    ornHint: false,
    tut: {
      ...(st.side ? { side: st.side } : {}),
      ...(early ? { widen: 1.5 } : {}),
      // D941: no count-in (the owner: "no need for countdown in such simple exercises"): PROVE too waits at its first
      // note; the take over once its last note is judged; the band's drums under a solo line where the stage has them.
      ...(st.wait === "first" ? { waitFirst: true } : {}),
      endAtLast: true,
      ...(beat?.kind === "drums" ? { band: true } : {}),
    },
    ...(beat?.kind === "click" ? { click: { full: Number.MAX_SAFE_INTEGER, gone: Number.MAX_SAFE_INTEGER, gain: beat.gain } } : {}),
  };
}

/** The next stage, act, or the end (null). */
export function nextAt(at: BasicsAt, ready: number): Pick<BasicsAt, "act" | "stage"> | null {
  const a = ACTS[at.act];
  if (at.stage + 1 < a.stages.length) return { act: at.act, stage: at.stage + 1 };
  return at.act + 1 < Math.min(ready, ACTS.length) ? { act: at.act + 1, stage: 0 } : null;
}
