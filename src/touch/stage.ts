/**
 * D590, A STAGED SOUND (sound.ts `orchestraOrgan`, ORCHESTRA & ORGAN): which stage of the piece's form a note starts in,
 * and so which of the band's doubling parts (ContinuoPart.from) join its line in unison. The owner, on I/24: "Definitely
 * not harpsichord for the big ending of Book I. This requires a much more involved and ambitious setup"; the brief: "a
 * staged climax (instruments joining by form phase, the organ arriving late)".
 *
 * The stages: 0 the strings alone; 1 the oboe on the top line and the bassoon on the bass; 2 the second oboe and the horn on
 * the inner lines too; 3 the organ on every line (the bass its pedal), in the winds' place. Written for I/24 bar by bar (STAGE_SCRIPTS, each
 * moment with its reason); any other fugue a player gives the sound takes them from its form (form-points.ts, `stageRule`).
 *
 * The rules (test/d585-setups.test.ts):
 *   - by the music only: the script reads the piece (its bars, entries, form), never the player's score, streak or
 *     accuracy (D482's rule); the player's own notes take the stage the band's would at that place;
 *   - at a note's start: each note reads the stage where it starts, so a sounding note keeps what it began with and a
 *     part joins a line on its next note (as a player enters);
 *   - no added notes: a doubling part plays the line's own note in unison (the organ's ranks are its registration);
 *   - no level of its own: the parts are the band's, at the levels sound.ts ORCH_STAGE_DB sets.
 */
import type { TouchFugue } from "./fugue.ts";
import { tickOfBar } from "./colour.ts";
import { formOf } from "./form-points.ts";

type Fugue = Pick<TouchFugue, "id" | "voices" | "bars" | "barTicks" | "length" | "meter" | "tpq" | "entries" | "cadences" | "kind">;

/** The sounds whose doubling parts join by stage. */
export const STAGED_SOUNDS: ReadonlySet<string> = new Set(["orchestraOrgan"]);
/** The last stage (the organ). */
export const STAGE_MAX = 3;

/** A moment of a stage script: from this bar on, this stage, and why. */
export type StageMoment = readonly [bar: number, stage: number, why: string];

/**
 * The pieces written bar by bar. I/24 (B minor, 76 bars at a crotchet of 43; entries alto 1, tenor 4, bass 9, soprano 13;
 * the middle entries 21-60 in two groups; the final group 69-74; the cadence in F# at 24, the last in B at 76):
 */
export const STAGE_SCRIPTS: Readonly<Record<string, readonly StageMoment[]>> = {
  wtc1f24: [
    [1, 0, "The exposition (1-20) on the string quartet alone, as Förster's quartet arrangement begins it: the four entries, the sighing pairs."],
    [21, 1, "The first middle entry (the alto, 21) toward the cadence in F# (24): the oboe joins the top line, the bassoon the bass."],
    [24, 0, "The long episode after the cadence in F# (24-29): the strings alone again, its sighs as quiet as the exposition's."],
    [30, 1, "The tenor's entry (30), then the alto's and the soprano's (34, 35): the oboe and the bassoon back."],
    [38, 2, "The crowded entries (38-47: the bass, the soprano, the alto, the bass, the tenor, the bass, all within ten bars): the second oboe and the horn join the inner lines."],
    [50, 1, "The short episode 50-52: the inner winds out."],
    [53, 2, "The tenor's and the bass's entries (53, 57, 60): the full woodwinds and the horn."],
    [63, 1, "The episode 63-68 before the last group: the horn and the second oboe out, the tension held back for the organ."],
    [67, 2, "The climax gathering (67-68: the form's rise): the inner winds return."],
    [69, 3, "The final group (the tenor 69, the bass 70, the alto 74) to the end: the organ arrives on every line in the winds' place, the pedal under the bass, held to the B major chord."],
  ],
};

/** For a fugue without a script: from its form (phaseAt): the exposition 0, the middle entries by act (1, then 2), the episodes a stage under the act's, the final group and after 3. */
export function stageRule(f: Fugue): StageMoment[] {
  const form = formOf(f as TouchFugue);
  const barOf = (tick: number) => {
    let n = f.bars[0]?.n ?? 1;
    for (const b of f.bars) if (b.on <= tick) n = b.n;
    return n;
  };
  const out: StageMoment[] = [];
  const last = form.seams.find((s) => s.kind === "final");
  for (const s of form.seams) {
    const stage =
      s.kind === "exposition" ? 0 : last && s.on >= last.on ? STAGE_MAX : s.kind === "episode" ? Math.max(0, Math.min(2, s.act) - 1) : s.kind === "middle" ? Math.min(2, s.act) : STAGE_MAX;
    const bar = barOf(s.on);
    const prev = out[out.length - 1];
    if (prev && prev[0] === bar) out[out.length - 1] = [bar, stage, `${s.kind} (bar ${bar})`];
    else if (!prev || prev[1] !== stage) out.push([bar, stage, `${s.kind} (bar ${bar})`]);
  }
  // A one-act piece (no later entries): the strings alone throughout.
  return out.length ? out : [[1, 0, "no middle or final entries: the strings alone"]];
}

/** The stage moments for a piece: its script, else the rule. */
export const stageMoments = (f: Fugue): readonly StageMoment[] => STAGE_SCRIPTS[f.id] ?? stageRule(f);

/** The piece's stages made ready: the stage where a tick falls. */
export class StageScript {
  /** [from tick, stage], in order. */
  readonly steps: readonly (readonly [number, number])[];
  constructor(f: Fugue) {
    this.steps = [...stageMoments(f)].sort((a, b) => a[0] - b[0]).map(([bar, st]) => [tickOfBar(f as TouchFugue, bar), st] as const);
  }
  /** The stage at `tick` (0 before the first moment). */
  at(tick: number): number {
    let st = 0;
    for (const [t, s] of this.steps) if (t <= tick) st = s;
    return st;
  }
}

/** For a piece on a sound: its stage script (null on any sound that is not staged, or a piece that is not a fugue). */
export function stageFor(f: Fugue, presetId: string): StageScript | null {
  return STAGED_SOUNDS.has(presetId) && f.kind === "fugue" ? new StageScript(f) : null;
}
