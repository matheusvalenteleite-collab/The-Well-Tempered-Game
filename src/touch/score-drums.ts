/**
 * D532, THE SCORE-DRIVEN ORCHESTRAL AND PERIOD DRUMS. The owner: "some of the timpani presets suggest a beat which doesn't
 * really match the fugue … the fugues often have strong beats according to the horizontal lines, not the vertical … Can
 * we make it such that these orchestral beats/loops have tailored tweaks to them so as to avoid that?" and "can we add a
 * couple more orchestral or period drums?". So these styles loop nothing: every stroke is read from the fugue's own score.
 *
 *   1. THE BASS'S ACCENTS. The bass line (the lowest note sounding at each attack, from whichever voice) weighs each of its
 *      notes: its place in the bar, its length (agogic weight: a long note, and a note longer than the one before it),
 *      its motion (a leap, a turn after a run of steps, a return after a rest). The drum strikes the heaviest, a few a bar
 *      at most and never closer than ACCENT_GAP_S: so a syncopated minim in the bass is struck where it falls, and a
 *      running bass leaves the drum on the notes the line itself leans on.
 *   2. THE SUBJECT'S RHYTHM during each entry, on a lighter drum: its attacks only (never a pitch), the newest entry's
 *      where entries overlap, thinned to SUBJECT_GAP_S.
 *   3. THE CADENCES (the fugue's own, TouchFugue.cadences): a stroke on each arrival (the style's: a ruff on the side drum,
 *      a carretilla on the castanets, a roll on the field drum, the bass drum and the cymbals of the Janissaries).
 *   4. THE TIMPANI on the home key's tonic and dominant only, and only at structural arrivals (form-points.ts): the cadences
 *      in the home key or on its dominant whose bass is on the tonic or the dominant, the acts' arrivals, the pedals, the
 *      final chord (`arrivals`). Elsewhere the timpani are silent.
 *   And the form (form-points.ts): rolls into the acts' arrivals (after the episodes) and into the final group, the
 *   episodes thinner (no subject; the bass's accents fewer and softer), the climax's build fuller, the coda settling.
 *   Humanised: each stroke a few ms off the grid and a little uneven (a hash of its tick, so it is the same every time),
 *   rolls crescendo with alternating hands, flams and ruffs on the side drum's accents.
 *
 * TAILORED (TWEAKS): every fugue whose default sound has one of these styles in its family, or that names one in its own
 * picks (drum-library.ts FUGUE_PICKS: the French overture, the gigues, the dances), has a hand-made tweak read from its
 * score: how heavy a bass note must be to be struck, how many a bar, how much of the subject, which rolls, which cadences.
 *
 * Pure numbers here (test/d532-score-drums.test.ts); chip.ts Chip.groove plays them through Chip.scheduleKitHit.
 * Never the score, the streak or the verdicts (D482).
 */
import { beatOf, type TouchFugue } from "./fugue.ts";
import { formOf, phaseAt } from "./form-points.ts";
import { dynGain } from "./jazz-drums.ts";
import { tempoOf } from "./tempi.ts";
import type { KitHit, KitPiece } from "./drum-presets.ts";

export const SCORE_STYLES = ["timpani", "frame", "military", "tabor", "castanets", "janissary", "fieldDrums"] as const;
export type ScoreStyle = (typeof SCORE_STYLES)[number];
export const isScoreStyle = (s: string): s is ScoreStyle => (SCORE_STYLES as readonly string[]).includes(s);

/** A style's drums: what takes each of the four sources, its roll, its landings. */
interface ScoreKit {
  /** The bass's accents (and, for the strongest, `strong` with it). */
  bass: KitPiece;
  bassVel: number;
  strong?: KitPiece[];
  /** In the episodes the bass's accents on this (a lighter stroke), if given. */
  episodeBass?: KitPiece;
  subject: KitPiece;
  subjectVel: number;
  cadence: KitPiece[];
  roll: KitPiece;
  /** The roll's strokes this far apart (s). */
  rollS: number;
  land: KitPiece[];
  final: KitPiece[];
  flam?: boolean;
  ruff?: boolean;
  carretilla?: boolean;
  /** Rolls on a pedal point (the field drums', the timpani's). */
  pedal?: KitPiece;
  /** The rolls this many times the usual length. */
  rollLen?: number;
}
export const SCORE_KITS: Readonly<Record<ScoreStyle, ScoreKit>> = {
  // The timpani: the bass's accents on a soft bass drum (the orchestra's gran cassa), the subject's head on the triangle,
  // the timpani themselves only at the arrivals (`arrivals`).
  timpani: { bass: "bassDrum", bassVel: 0.55, subject: "triangle", subjectVel: 0.6, cadence: ["bassDrum"], roll: "timp", rollS: 0.075, land: [], final: [], pedal: "timp" },
  // The frame drums: the large drum's dum on the bass, the small one's tek on the subject, the tambourine shaken into entries.
  frame: { bass: "frameDum", bassVel: 0.85, subject: "frameTek", subjectVel: 0.8, cadence: ["frameDum", "tamb"], roll: "tamb", rollS: 0.07, land: ["frameDum", "tamb"], final: ["frameDum", "tamb"] },
  // Lully's side drum: the bass's accents flammed, the subject's (the overture's dotted rhythm) lighter, ruffs at the cadences.
  military: { bass: "sideDrum", bassVel: 0.9, episodeBass: "drumStick", subject: "sideDrum", subjectVel: 0.55, cadence: ["sideDrum", "bassDrum"], roll: "sideDrum", rollS: 0.055, land: ["sideDrum", "bassDrum"], final: ["sideDrum", "bassDrum"], flam: true, ruff: true },
  // Pipe and tabor: the tabor on the bass's accents, the tambourine on the subject.
  tabor: { bass: "tabor", bassVel: 0.85, subject: "tamb", subjectVel: 0.75, cadence: ["tabor", "tamb"], roll: "tamb", rollS: 0.07, land: ["tabor", "tamb"], final: ["tabor", "tamb"] },
  // The castanets: the subject's rhythm and the bass's accents, a low drum under the strongest, carretillas at the cadences.
  castanets: { bass: "castanets", bassVel: 0.95, strong: ["tabor"], subject: "castanets", subjectVel: 0.7, cadence: ["castanets", "tabor"], roll: "castanets", rollS: 0.06, land: ["castanets", "tabor"], final: ["castanets", "tabor"], carretilla: true },
  // Alla turca: the bass drum on the bass's accents (the cymbals with the strongest), the triangle on the subject.
  janissary: { bass: "bassDrum", bassVel: 0.9, strong: ["cymbals"], subject: "triangle", subjectVel: 0.75, cadence: ["bassDrum", "cymbals"], roll: "triangle", rollS: 0.06, land: ["bassDrum", "cymbals"], final: ["bassDrum", "cymbals", "triangle"] },
  // Field drums: the rope-tension drum's deep head, long rolls (into the arrivals, on the pedals), flammed accents.
  fieldDrums: { bass: "fieldDrum", bassVel: 0.85, subject: "fieldDrum", subjectVel: 0.45, cadence: ["fieldDrum"], roll: "fieldDrum", rollS: 0.065, land: ["fieldDrum", "bassDrum"], final: ["fieldDrum", "bassDrum"], flam: true, pedal: "fieldDrum", rollLen: 1.5 },
};

/** Every piece a style strikes but the timpani (its recordings, loaded with DRUMS on). */
export function scoreKitPieces(style: ScoreStyle): KitPiece[] {
  const k: ScoreKit = SCORE_KITS[style];
  const all: (KitPiece | undefined)[] = [k.bass, k.subject, k.roll, k.episodeBass, k.pedal, ...(k.strong ?? []), ...k.cadence, ...k.land, ...k.final, ...(style === "timpani" ? (["triangle", "bassDrum"] as const) : [])];
  const out: KitPiece[] = [];
  for (const p of all) if (p && p !== "timp" && !out.includes(p)) out.push(p);
  return out;
}
/** The bass's accents: no two closer (s), the subject's strokes no two closer, a roll at least this long (s). */
export const ACCENT_GAP_S = 0.4;
export const SUBJECT_GAP_S = 0.15;
export const ROLL_MIN_S = 0.55;
export const ROLL_MAX_S = 1.2;
/** A pedal's roll at most this long (s), and a bar. */
export const PEDAL_MAX_S = 4;
/** A flam's grace this far before its stroke (s), a ruff's two; the jitter's reach (s). */
export const FLAM_S = 0.03;
export const RUFF_S = [0.06, 0.03] as const;
export const JITTER_S = 0.005;
/** A grace and its stroke no closer than this (s). */
export const GRACE_MIN_S = 0.018;
/** The episodes' share of the level and the threshold added there; the climax's gain at its peak; the coda's fall. */
export const EPISODE_VEL = 0.72;
export const EPISODE_THR = 0.3;
export const CLIMAX_GAIN = 0.16;
export const RESOLVE_FALL = 0.3;

/**
 * A fugue's tailoring (TWEAKS): `thr` the weight a bass note needs to be struck (1: a downbeat crotchet of a 4/4 bar
 * just reaches it), `perBar` at most this many accents a bar, `subject` how much of each entry's rhythm ("all"; "head":
 * its first bar; "exposition": the exposition's and the final group's entries only; "none"), `rolls` into which
 * arrivals ("acts": each act after an episode and the final group; "final": the final group only; "none"), `cadences`
 * ("all" or "perfect": the perfect ones and the last), `skip` cadence bars left unstruck, `pedal` rolls on the pedals,
 * `level` the whole drum's share. `styles`: one style's own changes.
 */
export interface TweakSet {
  thr?: number;
  perBar?: number;
  subject?: "all" | "head" | "exposition" | "none";
  rolls?: "acts" | "final" | "none";
  cadences?: "all" | "perfect";
  skip?: number[];
  pedal?: boolean;
  level?: number;
}
export interface Tweak extends TweakSet {
  why: string;
  styles?: Partial<Record<ScoreStyle, TweakSet & { why?: string }>>;
}
const DEFAULT: Required<TweakSet> = { thr: 1, perBar: 2, subject: "all", rolls: "acts", cadences: "all", skip: [], pedal: true, level: 1 };

/**
 * THE TAILORED FUGUES (each read from its score: the metre and tempo, the subject's rhythm, how its entries overlap,
 * what its bass does, where its cadences and pedals fall). D532's table in docs/DECISIONS.md.
 */
export const TWEAKS: Readonly<Record<string, Tweak>> = {
  wtc1f01: {
    why: "I/1 C, 4/4 at a slow crotchet: 24 entries in 27 bars, stretto on stretto; the subject's head only, else the drum never stops. The bass walks in quavers: only its minims and its leaps struck, two a bar. One episode (bar 22): a roll into the final group; the C pedal (bars 24-27) rolled on the tonic.",
    thr: 1.15,
    subject: "head",
    cadences: "perfect",
    styles: { fieldDrums: { level: 0.85 } },
  },
  wtc1f04: {
    why: "I/4 c#, 2/2 at a minim of 1.2 s, five voices, a triple fugue in semibreves and minims: every move of the bass counts (its minims are its line), the subject's long notes all struck; a slow, grave drum, the field drums muffled.",
    thr: 0.85,
    cadences: "perfect",
    styles: { fieldDrums: { level: 0.85, why: "a funeral's muffled drum" }, timpani: { subject: "exposition" } },
  },
  wtc1f05: {
    why: "I/5 D, the French overture among the fugues: the subject's run of demisemiquavers and its dotted quavers, the overture's rhythm, on the drum in every entry (the run thinned to a roll's strokes); the bass runs too, so only its leaps and its long notes struck. MILITARY is its curated style: Lully's side drum.",
    thr: 1.2,
    styles: { military: { perBar: 2, why: "the side drum doubles the dotted rhythm" }, janissary: { subject: "head" }, fieldDrums: { subject: "head" } },
  },
  wtc1f09: {
    why: "I/9 E, a quick 4/4 (crotchet 0.72 s), its subject a leap then running semiquavers: the head's rhythm only; the bass's crotchets struck where they lean.",
    subject: "head",
    styles: { castanets: { perBar: 2, subject: "all" } },
  },
  wtc1f10: {
    why: "I/10 e, two voices in a quick 3/4: the lower runs semiquavers, so one accent a bar at most, on the note it leans on; no cadences in the score's list, so the drum's arrivals are the acts'. A dance: castanets or the tabor.",
    thr: 0.9,
    perBar: 1,
    subject: "head",
  },
  wtc1f11: {
    why: "I/11 F, a passepied in 3/8 (bar 1.2 s): one accent a bar, the subject's opening quavers on the tambourine or the castanets; rolls only into the final group (the episodes are short).",
    thr: 0.9,
    perBar: 1,
    subject: "head",
    rolls: "final",
  },
  wtc1f13: {
    why: "I/13 F#, 4/4 at 0.94 s, its subject's dotted turn and quavers a light dance: the whole subject's rhythm, the bass's two accents a bar.",
  },
  wtc1f15: {
    why: "I/15 G, a gigue in 6/8: two beats a bar, the subject's skipping head on the tambourine, the bass's dotted crotchets struck.",
    subject: "head",
  },
  wtc1f21: {
    why: "I/21 Bb, a lively 3/4 (0.76 s): its long subject's head only (it runs on in semiquavers), one accent a bar; the tabor's dance.",
    perBar: 1,
    subject: "head",
  },
  wtc1f22: {
    why: "I/22 bb, five voices in a grave 2/2: the subject's minims and crotchets all struck, softly; the bass's every minim a weight; the field drums muffled, a lament's.",
    thr: 0.9,
    level: 0.9,
    cadences: "perfect",
    styles: { fieldDrums: { level: 0.8 } },
  },
  wtc1f24: {
    why: "I/24 b, a largo of 76 bars (1.4 s a crotchet), the chromatic subject in even quavers over a walking bass: the subject's head only, the bass's accents where it leaps or holds, rolls into its acts.",
    thr: 1.1,
    subject: "head",
    cadences: "perfect",
    styles: { fieldDrums: { level: 0.85 } },
  },
  wtc2f02: {
    why: "II/2 c, 28 bars of entries (form-points: the exposition then the final group from bar 20): the head only, a roll into the final group alone.",
    subject: "head",
    rolls: "final",
  },
  wtc2f05: {
    why: "II/5 D, 2/2 at a slow minim (1.9 s): the subject's quaver head (its repeated notes, a fanfare) on the drum; strettos throughout, so the head only; the minim beat subdivided: three accents a bar, a lighter threshold. A festive D major: the Janissaries' band, or the side drum.",
    thr: 0.9,
    perBar: 3,
    subject: "head",
  },
  wtc2f08: {
    why: "II/8 d#, a slow 4/4 (1.43 s): the subject's quavers and dotted minims all struck, the bass's two accents a bar.",
    cadences: "perfect",
  },
  wtc2f09: {
    why: "II/9 E, stile antico in 4/2: semibreves and minims, 31 entries overlapping: the head only (the long notes), every move of the slow bass weighed; a roll only into the final group.",
    thr: 0.9,
    subject: "head",
    rolls: "final",
    cadences: "perfect",
  },
  wtc2f11: {
    why: "II/11 F, 6/16, a gigue of 99 bars: one accent a beat at most, the subject's head on the tambourine, rolls only into the final group.",
    perBar: 2,
    subject: "head",
    rolls: "final",
  },
  wtc2f13: {
    why: "II/13 F#, a gavotte in 2/2: the subject's dotted minim and its quavers, its head only; two accents a bar.",
    subject: "head",
  },
  wtc2f15: {
    why: "II/15 G, a gigue in 3/8 (0.39 s a bar's beat): the subject runs in semiquavers, so its head only, one accent a bar, a roll into the final group.",
    thr: 0.9,
    perBar: 1,
    subject: "head",
    rolls: "final",
  },
  wtc2f16: {
    why: "II/16 g, a 3/4 of crotchets and quavers (0.79 s): the subject's rhythm (its crotchet-quaver lilt) in every entry, the bass's first and its syncopated second beats; a dark dance: the castanets.",
    styles: { castanets: { perBar: 2 } },
  },
  wtc2f21: {
    why: "II/21 Bb, a quick 3/4 (0.57 s) of running quavers: one accent a bar, the head only.",
    perBar: 1,
    subject: "head",
  },
  wtc2f22: {
    why: "II/22 bb, 3/2 at a minim of 1 s, 101 bars, the subject and its inversion in stretto: the head only, rolls into the acts, the pedals rolled on the tonic and the dominant (bars 95-101).",
    subject: "head",
    cadences: "perfect",
    styles: { fieldDrums: { level: 0.85 } },
  },
  wtc2f23: {
    why: "II/23 B, 2/2 at 1.15 s, its subject in minims: all of it struck, the bass's every minim weighed; 104 bars, so the cadences the perfect ones.",
    thr: 0.95,
    cadences: "perfect",
  },
  wtc2f24: {
    why: "II/24 b, a passepied in 3/8: one accent a bar, the subject's quavers' head on the castanets, a roll into the final group.",
    thr: 0.9,
    perBar: 1,
    subject: "head",
    rolls: "final",
  },
};
/** A fugue's tweak for a style (its own, the style's over it; the defaults where it has none). */
export function tweakFor(id: string, style: ScoreStyle): Required<TweakSet> {
  const t = TWEAKS[id];
  const { why: _w, styles, ...base } = t ?? { why: "" };
  const own = styles?.[style] ?? {};
  const { why: _x, ...o } = own as TweakSet & { why?: string };
  return { ...DEFAULT, ...base, ...o };
}

// ---------------------------------------------------------------------------------------------------------------
// The score's reading.

export interface BassNote {
  on: number;
  dur: number;
  midi: number;
  /** Its weight: place in the bar, length, motion (below). */
  w: number;
  /** On a bar's first beat. */
  down: boolean;
}
/** The bass line: at each attack, the lowest note sounding, where that note is the one attacked (any voice). */
export function bassLine(f: TouchFugue): { on: number; dur: number; midi: number }[] {
  const all = f.voices.flatMap((v) => v.map((n) => ({ on: n[0], dur: n[1], midi: n[2] }))).sort((a, b) => a.on - b.on || a.midi - b.midi);
  const out: { on: number; dur: number; midi: number }[] = [];
  let active: typeof all = [];
  for (let i = 0; i < all.length; ) {
    const t = all[i].on;
    const starting: typeof all = [];
    while (i < all.length && all[i].on === t) starting.push(all[i++]);
    active = active.filter((n) => n.on + n.dur > t).concat(starting);
    const low = Math.min(...active.map((n) => n.midi));
    const s = starting.find((n) => n.midi === low);
    if (s) out.push(s);
  }
  return out;
}
const barOnOf = (f: TouchFugue) => {
  const ons = f.bars.map((b) => b.on);
  return (t: number) => {
    let lo = 0;
    let hi = ons.length - 1;
    if (!ons.length || t < ons[0]) return Math.floor(t / f.barTicks) * f.barTicks;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ons[mid] <= t) lo = mid;
      else hi = mid - 1;
    }
    return ons[lo];
  };
};
/** The metric weight of a tick: the bar's first beat 1, its middle 0.6 (4/4's third beat, a duple bar's second), the other beats 0.35, a half beat 0.1. */
function metric(pos: number, beat: number, per: number): number {
  if (pos === 0) return 1;
  if (pos % beat === 0) {
    const b = pos / beat;
    return (per === 4 && b === 2) || (per === 2 && b === 1) ? 0.6 : 0.35;
  }
  return pos % (beat / 2) === 0 ? 0.1 : 0;
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** Each bass note's weight: metre (1 on the bar), length (log2 of beats, 0.45 a doubling within -1..2), agogic (longer than the note before: 0.5 a doubling within -1..1.5), a leap (a fourth 0.25, a fifth or more 0.45, the octave 0.55), a turn after steps (0.25), a return after a rest (0.4). */
export function weighBass(f: TouchFugue, beat: number, per: number): BassNote[] {
  const line = bassLine(f);
  const barOn = barOnOf(f);
  const out: BassNote[] = [];
  for (let i = 0; i < line.length; i++) {
    const n = line[i];
    const p = line[i - 1];
    const pp = line[i - 2];
    const pos = n.on - barOn(n.on);
    let w = metric(pos, beat, per);
    w += 0.45 * clamp(Math.log2(n.dur / beat), -1, 2);
    if (p) {
      w += 0.5 * clamp(Math.log2(n.dur / p.dur), -1, 1.5);
      const leap = Math.abs(n.midi - p.midi);
      w += leap >= 12 ? 0.55 : leap >= 7 ? 0.45 : leap >= 5 ? 0.25 : 0;
      if (pp && Math.abs(p.midi - pp.midi) <= 2 && Math.sign(n.midi - p.midi) !== Math.sign(p.midi - pp.midi) && n.midi !== p.midi) w += 0.25;
      if (n.on - (p.on + p.dur) >= beat / 2) w += 0.4;
    } else w += 0.4;
    out.push({ on: n.on, dur: n.dur, midi: n.midi, w, down: pos === 0 });
  }
  return out;
}

const pcOf = (key: string) => {
  const pcs: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const k = key.toLowerCase();
  let pc = pcs[k[0]] ?? 0;
  if (k.includes("#")) pc += 1;
  if (k.length > 1 && k[1] === "b") pc -= 1;
  return ((pc % 12) + 12) % 12;
};
/** The timpani of a home key: its tonic (F2-E3) and its dominant (a fifth up, or a fourth down above F2), as D514's. */
export function homeTimpani(key: string): { tonic: number; dominant: number } {
  const pc = pcOf(key);
  const tonic = 41 + ((pc - 5 + 12) % 12);
  return { tonic, dominant: tonic + 7 <= 55 ? tonic + 7 : tonic - 5 };
}
/** The bass's note sounding at a tick (the bass line's), or null. */
function bassAtTick(line: { on: number; dur: number; midi: number }[], t: number): number | null {
  let best: number | null = null;
  for (const n of line) {
    if (n.on > t) break;
    if (n.on + n.dur > t) best = n.midi;
  }
  return best;
}
export interface Arrival {
  tick: number;
  kind: "act" | "cadence" | "pedal" | "final";
  /** The timpani's drum there (the bass on the home tonic or dominant), or null: silent timpani. */
  drum: "tonic" | "dominant" | null;
  midi: number | null;
  /** A pedal's end. */
  end?: number;
}
const arrMemo = new Map<string, Arrival[]>();
/**
 * THE STRUCTURAL ARRIVALS (the timpani's only moments, form-points.ts and the score's cadences): the final chord; the last
 * cadence (form-points' climax.arrival); each act's arrival (form-points actOn); the cadences that close in the home key or
 * on its dominant (perfect or half, or any within a bar of an act's arrival); the pedals of the last quarter. Each with the
 * drum the bass is on there: the home tonic, its dominant, or neither.
 */
export function arrivals(f: TouchFugue): Arrival[] {
  const key = `${f.id}:${f.entries.length}:${f.cadences.length}`;
  const hit = arrMemo.get(key);
  if (hit) return hit;
  const fp = formOf(f);
  const line = bassLine(f);
  const tp = homeTimpani(f.key);
  const T = tp.tonic % 12;
  const Dm = tp.dominant % 12;
  const drumAt = (t: number): Pick<Arrival, "drum" | "midi"> => {
    const b = bassAtTick(line, t + 1);
    if (b === null) return { drum: null, midi: null };
    return b % 12 === T ? { drum: "tonic", midi: tp.tonic } : b % 12 === Dm ? { drum: "dominant", midi: tp.dominant } : { drum: null, midi: null };
  };
  const out: Arrival[] = [];
  const add = (a: Omit<Arrival, "drum" | "midi">) => {
    if (out.some((x) => Math.abs(x.tick - a.tick) < f.barTicks / 4 && x.kind !== "pedal" && a.kind !== "pedal")) return;
    out.push({ ...a, ...drumAt(a.tick) });
  };
  add({ tick: fp.last, kind: "final" });
  const homePcs = new Set([pcOf(f.key), (pcOf(f.key) + 7) % 12]);
  for (const c of f.cadences) {
    if (c.on >= fp.last - f.barTicks / 4) continue;
    const nearAct = fp.actOn.slice(1).some((a) => Math.abs(a - c.on) <= f.barTicks);
    const home = homePcs.has(pcOf(c.key));
    if (c.on === fp.climax.arrival || (home && (c.kind === "perfect" || c.kind === "half")) || (home && nearAct)) add({ tick: c.on, kind: "cadence" });
  }
  for (const a of fp.actOn.slice(1)) if (a < fp.last) add({ tick: a, kind: "act" });
  for (const p of fp.pedals) out.push({ tick: p.on, kind: "pedal", end: p.end, ...drumAt(p.on) });
  out.sort((a, b) => a.tick - b.tick);
  arrMemo.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The plan.

export type StrokeSource = "bass" | "subject" | "cadence" | "arrival" | "roll" | "final" | "pedal";
export interface ScoreStroke {
  /** The fugue's tick the stroke belongs to. */
  tick: number;
  /** Its offset from that tick (s): a flam's or a ruff's grace before, the jitter. */
  dt: number;
  piece: KitPiece;
  vel: number;
  midi?: number;
  role?: "roll" | "fill" | "accent";
  src: StrokeSource;
  /** A flam's or a ruff's grace note (before its stroke). */
  grace?: boolean;
}
export interface ScorePlan {
  style: ScoreStyle;
  beat: number;
  beatS: number;
  strokes: ScoreStroke[];
}
/** A deterministic hash in [0, 1) of a tick and a salt (the humanising: the same every time). */
const hash = (t: number, salt: number) => {
  let x = (Math.floor(t) * 2654435761 + salt * 40503) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
};
const smooth = (x: number) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};

const planMemo = new Map<string, ScorePlan>();
/** The fugue's beat (ticks), bar, and the beat's length at the game's tempo (s). */
export function clockOf(f: TouchFugue): { beat: number; per: number; beatS: number } {
  const b = beatOf(f);
  return { beat: b.ticks, per: b.perBar, beatS: (b.ticks / f.tpq) * (60 / tempoOf(f.id)) };
}

/** The whole fugue's strokes for a style (memoised). */
export function scorePlan(f: TouchFugue, style: ScoreStyle): ScorePlan {
  const key = `${f.id}:${style}:${f.entries.length}:${f.cadences.length}`;
  const hit = planMemo.get(key);
  if (hit) return hit;
  const { beat, per, beatS } = clockOf(f);
  const kit = SCORE_KITS[style];
  const tw = tweakFor(f.id, style);
  const fp = formOf(f);
  const sToT = (s: number) => (s / beatS) * beat;
  const strokes: ScoreStroke[] = [];
  const barOn = barOnOf(f);
  const isEpisode = (t: number) => phaseAt(fp, t).phase === "episode";
  const end = fp.last;
  const timp = homeTimpani(f.key);
  const arr = arrivals(f);

  // THE ROLLS' windows first (the bass's and the subject's strokes give way inside them).
  const rollTargets: number[] = [];
  if (tw.rolls !== "none") {
    const finalOn = fp.seams.find((s) => s.kind === "final")?.on;
    const acts = tw.rolls === "acts" ? fp.actOn.slice(1) : [];
    for (const t of [...acts, ...(finalOn !== undefined ? [finalOn] : [])]) if (t > beat && t < end - beat && !rollTargets.some((x) => Math.abs(x - t) < f.barTicks)) rollTargets.push(t);
  }
  const rollSpan = () => {
    const nBeats = beatS < 0.8 ? 2 : 1;
    return clamp(nBeats * beat, sToT(ROLL_MIN_S), sToT(ROLL_MAX_S)) * (kit.rollLen ?? 1);
  };
  const windows: [number, number][] = rollTargets.map((t) => [t - rollSpan(), t]);
  const finalRoll: [number, number] = [end - clamp(beat, sToT(ROLL_MIN_S), sToT(ROLL_MAX_S)) * (kit.rollLen ?? 1), end];
  const inRoll = (t: number) => windows.some(([a, z]) => t >= a && t < z) || (t >= finalRoll[0] && t < finalRoll[1]);

  // 1. THE BASS'S ACCENTS.
  const bass = weighBass(f, beat, per);
  const gap = Math.max(sToT(ACCENT_GAP_S), beat / 4);
  const chosen: BassNote[] = [];
  const byBar = new Map<number, BassNote[]>();
  for (const n of bass) {
    if (n.on >= end) continue;
    const b = barOn(n.on);
    byBar.set(b, [...(byBar.get(b) ?? []), n]);
  }
  for (const [, ns] of byBar) {
    const ep = isEpisode(ns[0].on);
    const thr = tw.thr + (ep ? EPISODE_THR : 0);
    const cap = ep ? Math.max(1, Math.floor(tw.perBar / 2)) : tw.perBar;
    const cand = ns.filter((n) => n.w >= thr && !inRoll(n.on)).sort((a, b) => b.w - a.w || a.on - b.on);
    const pick: BassNote[] = [];
    for (const n of cand) {
      if (pick.length >= cap) break;
      if ([...pick, ...chosen.slice(-2)].some((x) => Math.abs(x.on - n.on) < gap)) continue;
      pick.push(n);
    }
    // A bar of the subject's zones with nothing heavy enough: its heaviest note (the line keeps a pulse; the episodes may rest).
    if (!pick.length && !ep) {
      const best = ns.filter((n) => !inRoll(n.on) && n.w >= 0.4 && !chosen.slice(-2).some((x) => Math.abs(x.on - n.on) < gap)).sort((a, b) => b.w - a.w)[0];
      if (best) pick.push(best);
    }
    chosen.push(...pick.sort((a, b) => a.on - b.on));
  }
  for (const n of chosen) {
    const ep = isEpisode(n.on);
    const v = kit.bassVel * (0.4 + 0.22 * clamp((n.w - tw.thr) / 1.2, 0, 1) + (n.down ? 0.06 : 0));
    const piece = ep && kit.episodeBass ? kit.episodeBass : kit.bass;
    strokes.push({ tick: n.on, dt: 0, piece, vel: v, src: "bass" });
    if (kit.strong && n.w >= tw.thr + 0.8 && n.down && !ep) for (const p of kit.strong) strokes.push({ tick: n.on, dt: 0, piece: p, vel: v * 0.7, src: "bass" });
    if (kit.flam && n.down && !ep && n.w >= tw.thr + 0.3) strokes.push({ tick: n.on, dt: -FLAM_S, piece, vel: v * 0.42, src: "bass", grace: true });
  }

  // 2. THE SUBJECT'S RHYTHM, entry by entry (the newest where they overlap).
  // The timpani's triangle strikes only each entry's first note (a glint on the entry, not a line).
  const subjMode = tw.subject;
  if (subjMode !== "none") {
    const ents = [...f.entries].sort((a, b) => a.on - b.on);
    const expoEnd = fp.seams.find((s) => s.kind === "exposition")?.end ?? 0;
    const finalOn = fp.seams.find((s) => s.kind === "final")?.on ?? Infinity;
    const sgap = sToT(SUBJECT_GAP_S);
    ents.forEach((e, i) => {
      if (subjMode === "exposition" && e.on >= expoEnd && e.on < finalOn) return;
      const next = ents[i + 1];
      let to = Math.min(e.end, next ? next.on : Infinity, end);
      if (subjMode === "head") to = Math.min(to, e.on + Math.max(f.barTicks, 2 * beat));
      if (style === "timpani") to = Math.min(to, e.on + 1);
      let last = -Infinity;
      const notes = (f.voices[e.voice] ?? []).filter((n) => n[0] >= e.on && n[0] < to);
      notes.forEach((n, j) => {
        if (n[0] - last < sgap || inRoll(n[0]) || isEpisode(n[0])) return;
        last = n[0];
        const pos = n[0] - barOn(n[0]);
        const v = kit.subjectVel * (j === 0 ? 0.42 : 0.24 + (n[1] >= beat ? 0.06 : 0) + (pos % beat === 0 ? 0.04 : 0));
        strokes.push({ tick: n[0], dt: 0, piece: kit.subject, vel: v, src: "subject" });
      });
    });
  }

  // 3. THE CADENCES.
  const struct = new Map(arr.filter((a) => a.kind !== "pedal").map((a) => [a.tick, a]));
  const cadVel = { perfect: 0.62, imperfect: 0.5, half: 0.48, deceptive: 0.42, phrygian: 0.48 } as const;
  for (const c of f.cadences) {
    if (c.on >= end - beat / 2 || tw.skip.includes(c.bar)) continue;
    if (tw.cadences === "perfect" && c.kind !== "perfect") continue;
    const v = cadVel[c.kind];
    const a = struct.get(c.on);
    if (style === "timpani") {
      if (a?.midi) strokes.push({ tick: c.on, dt: 0, piece: "timp", vel: v * 1.1, midi: a.midi, role: "accent", src: "arrival" });
      else strokes.push({ tick: c.on, dt: 0, piece: "bassDrum", vel: v * 0.6, role: "accent", src: "cadence" });
      continue;
    }
    for (const p of kit.cadence) strokes.push({ tick: c.on, dt: 0, piece: p, vel: v * (p === kit.cadence[0] ? 1 : 0.7) * (p === "cymbals" && c.kind !== "perfect" ? 0 : 1), role: "accent", src: "cadence" });
    if (kit.ruff) for (const d of RUFF_S) strokes.push({ tick: c.on, dt: -d, piece: kit.cadence[0], vel: v * 0.38, src: "cadence", grace: true });
    if (kit.carretilla) {
      // The castanets' carretilla: a quick run of four into the arrival.
      for (let j = 4; j >= 1; j--) strokes.push({ tick: c.on, dt: -j * kit.rollS, piece: "castanets", vel: v * (0.3 + 0.08 * (4 - j)), role: "roll", src: "cadence" });
    }
    if (style === "fieldDrums") {
      const n = Math.max(3, Math.floor(Math.min(beatS, 0.7) / kit.rollS));
      for (let j = n; j >= 1; j--) strokes.push({ tick: c.on, dt: -j * kit.rollS, piece: "fieldDrum", vel: v * (0.18 + 0.4 * smooth(1 - j / n)), role: "roll", src: "cadence" });
    }
  }

  // 4. THE TIMPANI'S ARRIVALS (the timpani style only): the acts' arrivals, the pedals rolled, the final chord.
  if (style === "timpani") {
    for (const a of arr) {
      if (a.midi === null) continue;
      if (a.kind === "act" && !rollTargets.includes(a.tick)) strokes.push({ tick: a.tick, dt: 0, piece: "timp", vel: 0.5, midi: a.midi, role: "accent", src: "arrival" });
      if (a.kind === "pedal" && tw.pedal) {
        // A soft roll on the pedal's drum through its first bar or two, swelling a little, then let go.
        const len = Math.min((a.end ?? a.tick) - a.tick, f.barTicks, sToT(PEDAL_MAX_S), end - a.tick);
        const n = Math.floor(((len / beat) * beatS) / kit.rollS);
        for (let j = 0; j < n; j++) strokes.push({ tick: a.tick + (j / n) * len, dt: 0, piece: "timp", vel: 0.16 + 0.14 * Math.sin(Math.PI * (j / n)) * (j % 2 ? 0.9 : 1), midi: a.midi, role: "roll", src: "pedal" });
      }
    }
  } else if (kit.pedal && tw.pedal) {
    for (const a of arr.filter((x) => x.kind === "pedal")) {
      const len = Math.min((a.end ?? a.tick) - a.tick, f.barTicks, sToT(PEDAL_MAX_S), end - a.tick);
      const n = Math.floor(((len / beat) * beatS) / kit.rollS);
      for (let j = 0; j < n; j++) strokes.push({ tick: a.tick + (j / n) * len, dt: 0, piece: kit.pedal, vel: 0.14 + 0.16 * Math.sin(Math.PI * (j / n)) * (j % 2 ? 0.9 : 1), role: "roll", src: "pedal" });
    }
  }

  // THE ROLLS into the arrivals: a crescendo, alternating hands, landed on the entry.
  const roll = (from: number, to: number, top: number, land: boolean) => {
    const at = arr.find((a) => Math.abs(a.tick - to) < beat / 2 && a.kind !== "pedal");
    const tp = style === "timpani" ? (at?.midi ?? null) : null;
    const piece: KitPiece = style === "timpani" && tp === null ? "bassDrum" : kit.roll;
    const lenS = ((to - from) / beat) * beatS;
    const n = Math.max(3, Math.floor(lenS / kit.rollS));
    for (let j = 0; j < n; j++) {
      const x = j / n;
      strokes.push({ tick: from + x * (to - from), dt: 0, piece, vel: (0.14 + (top - 0.14) * smooth(x)) * (j % 2 ? 0.88 : 1), ...(tp !== null ? { midi: tp } : {}), role: "roll", src: "roll" });
    }
    if (!land) return;
    if (style === "timpani") {
      if (tp !== null) strokes.push({ tick: to, dt: 0, piece: "timp", vel: 0.62, midi: tp, role: "accent", src: "arrival" });
      else strokes.push({ tick: to, dt: 0, piece: "bassDrum", vel: 0.45, role: "accent", src: "roll" });
      strokes.push({ tick: to, dt: 0, piece: "triangle", vel: 0.3, role: "accent", src: "roll" });
    } else for (const p of kit.land) strokes.push({ tick: to, dt: 0, piece: p, vel: p === kit.land[0] ? 0.6 : 0.42, role: "accent", src: "roll" });
  };
  for (const [a, z] of windows) roll(a, z, 0.5, true);

  // THE FINAL CHORD: a roll into it, struck; the timpani's tonic roll dying under it.
  roll(finalRoll[0], end, 0.62, false);
  if (style === "timpani") {
    const fa = arr.find((a) => a.kind === "final");
    const m = fa?.midi ?? timp.tonic;
    strokes.push({ tick: end, dt: 0, piece: "timp", vel: 0.75, midi: m, role: "accent", src: "final" }, { tick: end, dt: 0, piece: "bassDrum", vel: 0.45, role: "accent", src: "final" });
    const len = Math.min(fp.end - end, f.barTicks, sToT(PEDAL_MAX_S));
    const n = Math.floor(((len / beat) * beatS) / kit.rollS);
    for (let j = 1; j < n; j++) strokes.push({ tick: end + (j / n) * len, dt: 0, piece: "timp", vel: Math.max(0.05, 0.3 * (1 - j / n)) * (j % 2 ? 0.88 : 1), midi: m, role: "roll", src: "final" });
  } else {
    for (const p of kit.final) strokes.push({ tick: end, dt: 0, piece: p, vel: p === kit.final[0] ? 0.75 : 0.55, role: "accent", src: "final" });
    if (kit.ruff) for (const d of RUFF_S) strokes.push({ tick: end, dt: -d, piece: kit.final[0], vel: 0.32, src: "final", grace: true });
    if (kit.carretilla) for (let j = 4; j >= 1; j--) strokes.push({ tick: end, dt: -j * kit.rollS, piece: "castanets", vel: 0.3 + 0.08 * (4 - j), role: "roll", src: "final" });
  }

  // THE FORM's level (the episodes softer, the climax's build fuller, the coda settling), the tweak's level, the
  // humanising (a few ms, a few per cent), and the strokes too close on one drum merged (the stronger kept).
  const arcAt = (t: number) => 0.86 + 0.14 * Math.min(1, t / Math.max(1, 0.6 * fp.end));
  const out: ScoreStroke[] = [];
  const sorted = strokes.filter((s) => s.vel > 0.01 && s.tick <= fp.end).sort((a, b) => a.tick + sToT(a.dt) - (b.tick + sToT(b.dt)));
  const lastOn = new Map<string, ScoreStroke>();
  for (const s of sorted) {
    const ph = phaseAt(fp, s.tick);
    const form = (ph.phase === "episode" && (s.src === "bass" || s.src === "subject") ? EPISODE_VEL : 1) * (1 + CLIMAX_GAIN * ph.climax) * (1 - RESOLVE_FALL * (s.src === "final" ? 0 : ph.resolved));
    const jit = s.role === "roll" ? 0.6 : 1;
    const t = { ...s, dt: s.dt + (hash(s.tick, 7 + s.piece.length) - 0.5) * 2 * JITTER_S * jit, vel: clamp(s.vel * form * arcAt(s.tick) * tw.level * (0.96 + 0.08 * hash(s.tick, 13)), 0.02, 1) };
    const k = t.piece + (t.midi ?? "");
    const prev = lastOn.get(k);
    const timeOf = (x: ScoreStroke) => x.tick + sToT(x.dt);
    // (a grace and its stroke: a flam's 30 ms, a ruff's; else a roll's strokes' spacing at the closest)
    const minGap = sToT(s.grace || prev?.grace ? GRACE_MIN_S : (s.role === "roll" || prev?.role === "roll" ? 0.75 : 1) * Math.min(kit.rollS, 0.05));
    if (prev && timeOf(t) - timeOf(prev) < minGap) {
      // Merged: the louder level, the weightier source (an arrival over an accent over the subject), an accent's role kept.
      const rank: Record<StrokeSource, number> = { subject: 0, bass: 1, roll: 2, pedal: 2, cadence: 3, arrival: 4, final: 5 };
      const both = prev.tick === t.tick;
      Object.assign(prev, { vel: Math.max(prev.vel, t.vel), ...(both && rank[t.src] > rank[prev.src] ? { src: t.src, role: t.role ?? prev.role } : {}) });
      continue;
    }
    lastOn.set(k, t);
    out.push(t);
  }
  const plan: ScorePlan = { style, beat, beatS, strokes: out };
  planMemo.set(key, plan);
  return plan;
}

/**
 * One beat of a score-driven style: the plan's strokes whose tick falls in [tick, tick + beat), as KitHits in beats from
 * the beat's start (a grace a little before it), at Busoni's level (`dynDb`, D503's ±4 dB). `beatS`: the beat as it
 * sounds (the final ritard in it).
 */
export function scoreBeat(f: TouchFugue, style: ScoreStyle, tick: number, beat: number, beatS: number, dynDb = 0): KitHit[] {
  const plan = scorePlan(f, style);
  const g = dynGain(dynDb);
  const s = plan.strokes;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].tick < tick - beat) lo = mid + 1;
    else hi = mid;
  }
  const out: KitHit[] = [];
  for (let i = lo; i < s.length && s[i].tick < tick + 2 * beat; i++) {
    const x = s[i];
    if (x.tick < tick || x.tick >= tick + beat) continue;
    out.push({ piece: x.piece, tick: x.tick, at: (x.tick - tick) / beat + x.dt / beatS, vel: clamp(x.vel * g, 0.02, 1), ...(x.midi !== undefined ? { midi: x.midi } : {}), ...(x.role ? { role: x.role } : {}) });
  }
  return out;
}
