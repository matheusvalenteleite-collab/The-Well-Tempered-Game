/**
 * D379: the tutorial's shared kit: the pass lines its lessons are judged by (lens.ts's figures, each with
 * the fix the coach names), a passage of the game's own as a material, a step, and the Inventions' ids.
 * Kept apart from lessons.ts so the parts in their own modules (course2.ts, fugue-track.ts, retired.ts)
 * build their lessons with the same hands.
 */
import type { LensStats } from "./lens.ts";
import type { Check, Material, Stage } from "./lessons.ts";
import * as C from "./coach.ts";

export const pctOf = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
export const atLeast = (a: number, b: number, share: number) => b > 0 && a / b >= share - 1e-9;
/** The share right (of the notes, a stray strike half a note). */
export const right = (x: LensStats, share: number): Check => ({ text: "RIGHT {p}% (AIM {a}%)", vars: { p: Math.round(100 * x.accuracy), a: Math.round(100 * share) }, ok: x.accuracy >= share - 1e-9 && x.of > 0, fix: C.fixRight(x) });
export const perfectLine = (x: LensStats): Check => ({ text: "PERFECT {p}% · SPREAD {s} MS", vars: { p: pctOf(x.timing.perfect, x.timing.n), s: x.timing.sd }, ok: true });
export const consistency = (x: LensStats, share = 0.7): Check => ({ text: "TOUCH KEPT {p}% (AIM {a}%)", vars: { p: pctOf(x.touch.ok, x.touch.of), a: Math.round(100 * share) }, ok: atLeast(x.touch.ok, x.touch.of, share), na: !x.touch.of, fix: C.fixConsistency(x) });
export const touchLine = (x: LensStats): Check => ({ text: "YOUR TOUCH: {t}", vars: { t: x.touch.style ?? "—" }, ok: true });
/** D360 (Part V): the written signs read from the shake, of those in the passage; the player's own. */
export const graceLine = (x: LensStats): Check => ({ text: "SIGNS READ {n} OF {m} · YOUR OWN {f}", vars: { n: x.orn.read, m: x.orn.of, f: x.orn.free }, ok: true });

/** D373: the notes right, of the notes (a stray strike half a note), at least so many in every `of`. */
export const notesRight = (x: LensStats, share: number): Check => ({ text: "NOTES {n} OF {m}", vars: { n: x.right, m: x.of }, ok: x.of > 0 && x.accuracy >= share - 1e-9, fix: C.fixRight(x) });
/** D373: the moves the right way (each note after the first: up, down or the same), of the moves. */
export const movesRight = (x: LensStats, share: number): Check => {
  const of = Math.max(0, x.of - 1);
  return { text: "MOVES THE RIGHT WAY {n} OF {m}", vars: { n: Math.min(x.direction.ok, of), m: of }, ok: of > 0 && x.direction.ok >= Math.ceil(share * of - 1e-9), fix: C.fixDirection(x) };
};

/** A passage of the game's own, as a material. */
export const ex = (piece: string, voice: number, fromBar: number, toBar: number, tempo: Material["tempo"], label: string, o: Partial<Material> = {}): Material => ({ piece, voice, fromBar, toBar, tempo, label, badge: "IN GAME", ...o });
export const st = (kind: Stage["kind"], m: Material, say: string, o: Partial<Stage> = {}): Stage => ({ kind, m, say, ...o });

export const INV = "inv01";
export const RH = 0;
/** D373: Inventions 4, 8 and 12 (MORE BACH's chunk: loaded before their lessons begin, fugue.ts loadExtras). */
export const INV4 = "bwv775";
export const INV8 = "bwv779";
export const INV12 = "bwv783";

/** D373: the notes of the passages the Inventions lend the tutorial, as written (held to data/touch/ by the tests). */
export const SUBJECT = ["C4", "D4", "E4", "F4", "D4", "E4", "C4", "G4"];
export const LOWER_1_2 = ["C3", "D3", "E3", "F3", "D3", "E3", "C3", "G3", "G2", "G3", "A3", "B3", "C4", "A3", "B3", "G3", "C4"];
export const INV8_1_2 = ["F4", "A4", "F4", "C5", "F4", "F5", "E5", "D5", "C5", "D5", "C5", "B♭4", "A4", "B♭4", "A4", "G4", "F4"];
export const INV8_1_3 = [...INV8_1_2, "A4", "C5", "A4", "F5", "C5", "A5"];
export const INV8_1_4 = [...INV8_1_3, "C6", "B♭5", "C6", "A5", "C6", "B♭5", "C6", "A5", "C6", "B♭5", "C6", "F5"];
export const INV4_1 = ["D4", "E4", "F4", "G4", "A4", "B♭4"];
export const INV4_1_2 = [...INV4_1, "C♯4", "B♭4", "A4", "G4", "F4", "E4", "F4"];
export const INV1_1_4 = [
  ...SUBJECT, "C5", "B4", "C5", "D5", "G4", "A4", "B4", "C5", "A4", "B4", "G4", "D5", "G5", "F5", "G5",
  "E5", "A5", "G5", "F5", "E5", "G5", "F5", "A5", "G5", "F5", "E5", "D5", "C5", "E5", "D5", "F5",
  "E5", "D5", "C5", "B4", "A4", "C5", "B4", "D5", "C5", "B4", "A4", "G4", "F♯4", "A4", "G4", "B4", "A4",
];

