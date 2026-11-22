/**
 * D678 (design studio; the owner approved the pilot, THE ECHO LANE, on the Goldberg Variations 3 and 12; "the animations
 * rotate and move in a way that display the canonic features"): a canon's architecture drawn in the box. Each note of the
 * leader (dux) is joined by a faint arc to the note of the follower (comes) that answers it, later by the canon's delay
 * and at its interval; while the answer is on its way a small token of the note travels along the arc (in a canon in
 * contrary motion it turns over as it goes: the inversion drawn as a turn); as the follower sounds it, its note is lit
 * in the follower's colour. Drawing only: nothing judged reads it.
 *
 * D970: the drawing is now THE ROLLING RIBBON (canon-ribbon.ts, paintCanon), which replaced the dotted arcs and tokens;
 * this file keeps the canons' tags (CANONS, the legs) and the pairs (echoPairs) it is drawn from.
 *
 * D930 (canons session; the board approved batches 1 and 2): every Goldberg canon and the Inventions' two canons. A canon
 * is now a list of LEGS, because the leader changes voice: Var. 12's second half is led from below (the pilot, tagging the
 * soprano as leader throughout, paired 11 of the soprano's 95 notes there), Var. 24's leader changes at bars 9 and 25,
 * Var. 27's hands change places at bar 17, Invention 2's leader at bars 11 and 23. And the match is DIATONIC (the notes'
 * staff `step`): a third, a sixth, a seventh or a ninth changes size in semitones with the scale. All tagged from the
 * game's own notes (each leader's onset + the delay against the follower's voices; the canons session's survey, proposal
 * at https://claude.ai/artifact/N64gm5aPPKggXTHoen5zo7); the label of each leg names the canon, or the change of leader.
 */
import { beatOf, type TouchFugue } from "./fugue.ts";

/** One stretch of a canon: who leads, who follows, how much later and at what interval. */
export interface CanonLeg {
  /** The bars (1-based, counted by the tick: bar b begins at (b - 1) x barTicks) whose leader's notes this leg reads, [from, to). */
  from: number;
  to: number;
  /** The leader's voices, and the voices the follower is written in (the edition splits either across voices). */
  dux: readonly number[];
  comes: readonly number[];
  /** How much later the follower answers, in ticks. */
  delay: number;
  /** In contrary motion: dux step + comes step = `steps` (the mirror). Else comes step - dux step = `steps` (a 2nd: 1). */
  contrary: boolean;
  steps: number;
  /** What the box says over the leg's first bars. */
  label: string;
}

export interface CanonSpec {
  legs: readonly CanonLeg[];
}

const leg = (from: number, to: number, dux: number[], comes: number[], delay: number, contrary: boolean, steps: number, label: string): CanonLeg => ({ from, to, dux, comes, delay, contrary, steps, label });

// D908: Variations 6, 12, 15, 21 and 24 hold their second canonic line whole in voice 1 (more-bach.ts joinCanon), its
// bass in voice 2: the legs that read it across voices 1 and 2 read voice 1.
/** Bar lengths in ticks (tpq 1920): 12/8 11520, 3/8 2880, 4/4 7680, 3/4 5760, 2/4 3840, 2/2 7680, 9/8 8640, 6/8 5760. */
export const CANONS: Readonly<Record<string, CanonSpec>> = {
  // Canone all'Unisono: the soprano led, the alto one bar later at the same pitch.
  "bwv988-03": { legs: [leg(1, 17, [0], [1], 11520, false, 0, "CANON AT THE UNISON · ONE BAR LATER")] },
  // Canone alla Seconda: the leader in the alto (the edition hands it to the tenor at times), the soprano a second above.
  "bwv988-06": { legs: [leg(1, 33, [1], [0], 2880, false, 1, "CANON AT THE SECOND · ONE BAR LATER")] },
  // Canone alla Terza: the soprano led, the alto a third below.
  "bwv988-09": { legs: [leg(1, 17, [0], [1], 7680, false, -2, "CANON AT THE THIRD · ONE BAR LATER")] },
  // Canone alla Quarta, in contrary motion (steps summing to 61: the soprano's G answered by the D a fourth below); after
  // the double bar the leader is below (alto, tenor) and the soprano answers.
  "bwv988-12": {
    legs: [
      leg(1, 17, [0], [1], 5760, true, 61, "CANON AT THE FOURTH · IN CONTRARY MOTION"),
      leg(17, 33, [1], [0], 5760, true, 61, "NOW THE LOWER VOICE LEADS"),
    ],
  },
  // Canone alla Quinta, in contrary motion (steps summing to 68): the leader's first bar written in the soprano, then in
  // the alto and tenor; the soprano answers a fifth above, turned over.
  "bwv988-15": {
    legs: [
      leg(1, 2, [0], [0], 3840, true, 68, "CANON AT THE FIFTH · IN CONTRARY MOTION"),
      leg(2, 33, [1], [0], 3840, true, 68, "CANON AT THE FIFTH · IN CONTRARY MOTION"),
    ],
  },
  // Canone alla Sesta: the alto led, the soprano a sixth above, half a bar (a minim) later.
  "bwv988-18": { legs: [leg(1, 33, [1], [0], 3840, false, 5, "CANON AT THE SIXTH · HALF A BAR LATER")] },
  // Canone alla Settima: the leader in the tenor and alto, the soprano a seventh above, half a bar later.
  "bwv988-21": { legs: [leg(1, 17, [1], [0], 3840, false, 6, "CANON AT THE SEVENTH · HALF A BAR LATER")] },
  // Canone all'Ottava, two bars later: the soprano leads, then the lower voices (bars 9-24), then the soprano again.
  "bwv988-24": {
    legs: [
      leg(1, 9, [0], [1], 17280, false, -7, "CANON AT THE OCTAVE · TWO BARS LATER"),
      leg(9, 25, [1], [0], 17280, false, 7, "NOW THE LOWER VOICE LEADS"),
      leg(25, 33, [0], [1], 17280, false, -7, "THE TOP VOICE LEADS AGAIN"),
    ],
  },
  // Canone alla Nona, two voices: the left hand leads, the right a ninth above; after the double bar the hands change places.
  "bwv988-27": {
    legs: [
      leg(1, 17, [1], [0], 5760, false, 8, "CANON AT THE NINTH · ONE BAR LATER"),
      leg(17, 33, [0], [1], 5760, false, -8, "NOW THE RIGHT HAND LEADS"),
    ],
  },
  // Invention 2: a canon at the octave two bars later (bars 1-9); the left hand leads in bars 11-19, the right again in
  // bars 23-24 (two octaves apart then); the bars between are free.
  bwv773: {
    legs: [
      leg(1, 10, [0], [1], 15360, false, -7, "CANON AT THE OCTAVE · TWO BARS LATER"),
      leg(11, 20, [1], [0], 15360, false, 7, "NOW THE LEFT HAND LEADS"),
      leg(23, 25, [0], [1], 15360, false, -14, "THE RIGHT HAND LEADS AGAIN"),
    ],
  },
  // Invention 8: canonic in its opening (bars 1-7) and its return (bars 26-29) only, a bar later, an octave below.
  bwv779: {
    legs: [
      leg(1, 8, [0], [1], 5760, false, -7, "CANON AT THE OCTAVE · ONE BAR LATER"),
      leg(26, 30, [0], [1], 5760, false, -7, "THE CANON RETURNS"),
    ],
  },
};

export type EchoNote = { on: number; dur: number; midi: number; step: number; voice: number };
type N = EchoNote;
export interface EchoPair {
  a: N;
  b: N;
  /** The leg it belongs to (an index into the canon's legs). */
  leg: number;
  /**
   * D930 (the board, on Var. 24's 2-bar delay: tokens stacked at the playhead "read as a glitch"): whether a token flies
   * for this pair. One a beat, the first leader's note of each beat in each leg, so a long delay keeps a few tokens spread
   * along their arcs instead of a column of them lifting off at once. Every pair keeps its arc and its lit answer.
   */
  flies: boolean;
}

const memo = new WeakMap<TouchFugue, EchoPair[]>();
/** Each leader's note and the follower's note that answers it (its onset + the delay, its step the canon's), leg by leg, in time. */
export function echoPairs(f: TouchFugue): EchoPair[] {
  const spec = CANONS[f.id];
  if (!spec) return [];
  const had = memo.get(f);
  if (had) return had;
  const out: EchoPair[] = [];
  spec.legs.forEach((L, li) => {
    const t0 = (L.from - 1) * f.barTicks, t1 = (L.to - 1) * f.barTicks;
    const at = new Map<number, N[]>();
    for (const v of L.comes)
      for (const [on, dur, midi, step] of f.voices[v] ?? []) {
        const list = at.get(on) ?? [];
        list.push({ on, dur, midi, step, voice: v });
        at.set(on, list);
      }
    for (const v of L.dux)
      for (const [on, dur, midi, step] of f.voices[v] ?? []) {
        if (on < t0 || on >= t1) continue;
        const want = L.contrary ? L.steps - step : step + L.steps;
        const b = (at.get(on + L.delay) ?? []).find((n) => n.step === want);
        if (b) out.push({ a: { on, dur, midi, step, voice: v }, b, leg: li, flies: false });
      }
  });
  out.sort((x, y) => x.a.on - y.a.on || x.b.on - y.b.on);
  const beat = beatOf(f).ticks;
  const flown = new Set<string>();
  for (const p of out) {
    const key = `${p.leg}:${Math.floor(p.a.on / beat)}`;
    if (!flown.has(key)) (flown.add(key), (p.flies = true));
  }
  memo.set(f, out);
  return out;
}

export interface EchoGeo {
  xOf: (tick: number) => number;
  yOf: (step: number) => number;
  bh: number;
  w: number;
  h: number;
  t0: number;
  t1: number;
  now: number;
  barTicks: number;
  ink: (voice: number) => string;
  /** The box's pixel text (box-fx pixText), for the canon's label. */
  text: (g: CanvasRenderingContext2D, s: string, x: number, y: number, ink: string) => void;
  fg: string;
  /** Where the box's clear part begins (past the left bar), for the label. */
  left: number;
  /**
   * D930: the label's top: under the entry tabs' two rows where the piece has them (the Inventions: box-fx entryMarks, tabs
   * 7 px high at 1 and 12), else at the box's top; and none while the box's banner (D314's first-time hint) is up.
   */
  labelY?: number;
  quiet?: boolean;
}
