/**
 * D689 (design studio; BASICS v2): a stage's take as the game's run, and where the tutorial is. DO: the aids on,
 * the music waiting at the first note (at every note in 1.1); PROVE: the same music, the aids fading, a count-in.
 * LADDER, nothing failed, no metronome, the timing windows a little wider in the first four acts.
 */
import { fugueById } from "../../touch/fugue.ts";
import type { Run } from "../lessons.ts";
import { runOf, type Material } from "../manual/lessons.ts";
import { ACTS, slower, type Stage } from "./plan.ts";

export type Phase = "do" | "prove";

export interface BasicsAt {
  act: number;
  stage: number;
  phase: Phase;
  /** Misses so far in this stage (the help steps), and the tempo notches taken off. */
  misses: number;
  notches: number;
}

export const stageOf = (at: Pick<BasicsAt, "act" | "stage">): Stage => ACTS[at.act].stages[at.stage];

export function basicsRun(st: Stage, phase: Phase, notches: number): Run {
  const f = fugueById(st.piece);
  const lastBar = f.bars.at(-1)?.n ?? 1;
  const m: Material = {
    piece: st.piece,
    voice: st.voice,
    fromBar: st.fromBar ?? 1,
    toBar: st.toBar ?? lastBar,
    tempo: { bpm: slower(st.bpm, notches) },
    label: `BASICS ${st.id}`,
    badge: "IN GAME",
    wait: st.wait === "all",
    solo: st.solo,
    ...(st.easy ? { easy: st.easy } : {}),
    ...(st.side ? { side: st.side } : {}),
  };
  const r = runOf(m, undefined, [], false, false);
  const early = Number(st.id[0]) <= 4;
  return {
    ...r,
    fail: false,
    tut: {
      ...(st.side ? { side: st.side } : {}),
      ...(early ? { widen: 1.5 } : {}),
      ...(st.wait === "first" && phase === "do" ? { waitFirst: true } : {}),
      ...(st.wait === "first" && phase === "prove" ? { countBeats: 4 } : {}),
    },
  };
}

/** The next stage, act, or the end (null). */
export function nextAt(at: BasicsAt, ready: number): Pick<BasicsAt, "act" | "stage"> | null {
  const a = ACTS[at.act];
  if (at.stage + 1 < a.stages.length) return { act: at.act, stage: at.stage + 1 };
  return at.act + 1 < Math.min(ready, ACTS.length) ? { act: at.act + 1, stage: 0 } : null;
}
