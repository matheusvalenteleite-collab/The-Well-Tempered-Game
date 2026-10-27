/**
 * D329 (WTC 1.46), THE LAB's CONFIG presets: the owner found the SLURS group too complicated and asked
 * for named configurations to try one after another and comment on. Each is the game's defaults with a
 * few parameters changed (mechanics.ts MECH), and one plain sentence of what it feels like. The game
 * (play.html) is never changed: A is its own.
 *
 * Shared by C, D and E (the owner's way of playing, a II/18 log: one thumb put down on its next note in
 * the same frame as the other strikes, about a note value early): RELATIVE timing; the double contact the
 * same thumb's only, 40 ms; "Thumbs together" 0 (in his log the resting thumb lands 0–9 ms after the
 * other's strike, which D318's 40 ms (his 20) took for a chord pressed); direction from either thumb.
 */
import { MECH, MECH_DEFAULTS, type Mech, type MechKey } from "../mechanics.ts";

export interface LabConfig {
  id: string;
  /** "C · HAND-OVER" */
  name: string;
  /** What it feels like, one sentence. */
  feel: string;
  /** The parameters it sets on top of the game's defaults. */
  values: Partial<Mech>;
}

const HAND_OVER: Partial<Mech> = {
  timing: "relative",
  slurNext: true,
  slurEarlyShare: 0.15,
  slurRollMinMs: 0,
  directionRef: "either",
  doubleSameThumb: true,
  doubleMs: 40,
  waitSounds: "time",
};

export const CONFIGS: readonly LabConfig[] = [
  { id: "A", name: "A · GAME NOW", feel: "Exactly the game as it is (WTC 1.45): fixed windows in milliseconds, a thumb landing early while the other holds waits for its note.", values: {} },
  {
    id: "B",
    name: "B · CLEAN STRIKES",
    feel: "Every landing is a strike, the moment it lands: put a thumb down too early and it is a stray; only your own thumb bouncing is forgiven (40 ms). Windows follow the tempo.",
    values: { timing: "relative", slurNext: false, doubleSameThumb: true, doubleMs: 40 },
  },
  {
    // D334 (WTC 1.49): the owner's hammer-on and pull-off. B's values, and a thumb landing before its note's
    // window while the other holds rests PREPARED until the other lifts (or, MECH.prepPress, it is pressed).
    id: "B+",
    name: "B+ · PREPARED",
    feel: "Like B, but every note is sounded by a gesture: landing on it (hammer-on) or, for a thumb resting early on its note, the other thumb lifting (pull-off); nothing sounds by itself.",
    values: { timing: "relative", slurNext: false, doubleSameThumb: true, doubleMs: 40, prepare: true, prepShare: 1, slurRollMinMs: 0 },
  },
  {
    id: "C",
    name: "C · HAND-OVER",
    feel: "Rest the next thumb on its note while the other still holds, up to about a note early: it waits and sounds at its own time.",
    values: HAND_OVER,
  },
  {
    id: "D",
    name: "D · LIFT TO SOUND",
    feel: "As C, but the resting thumb's note sounds when the other thumb lifts (as on an organ or a wind instrument), and your lift's timing is what is judged.",
    values: { ...HAND_OVER, waitSounds: "lift" },
  },
  {
    id: "E",
    name: "E · GENEROUS",
    feel: "As C with wider windows everywhere (PERFECT, early and late, legato, takeovers): for fast fugues, or to compare.",
    values: { ...HAND_OVER, slurEarlyShare: 0.25, perfectMs: 100, earlyMs: 300, lateMs: 300, splitFloorMs: 80, legatoGapMs: 120, slideTakeMs: 160, waitTakeMs: 160 },
  },
];

export const DEFAULT_CONFIG = "A";

export function configById(id: string | null | undefined): LabConfig | undefined {
  return CONFIGS.find((c) => c.id === id);
}

/** A preset's whole set of parameters: the game's defaults with its own on top. */
export function configMech(c: LabConfig): Mech {
  return { ...MECH_DEFAULTS, ...c.values } as Mech;
}

/** The parameters in force that differ from the preset's (the "(changed)" mark). */
export function configEdits(c: LabConfig, m: Mech = MECH): MechKey[] {
  const want = configMech(c);
  return (Object.keys(MECH_DEFAULTS) as MechKey[]).filter((k) => m[k] !== want[k]);
}

/** The preset's name as a run's log records it: "C · HAND-OVER", or "C · HAND-OVER (changed: Legato gap…)" when edited after. */
export function configLabel(id: string | null | undefined, m: Mech = MECH): string | undefined {
  const c = configById(id);
  if (!c) return undefined;
  const ed = configEdits(c, m);
  return ed.length ? `${c.name} (changed: ${ed.join(", ")})` : c.name;
}
