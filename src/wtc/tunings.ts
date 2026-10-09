/**
 * Tunings for the Well-Tempered Clavier: the game's own (equal, Pythagorean, quarter-comma meantone,
 * Werckmeister III; src/audio/temperament.ts) and two more well temperaments of the period
 * (Kirnberger III, Vallotti), given as deviations from equal temperament by pitch class. In
 * meantone the remote keys have the wolf fifth: the reason "well-tempered" mattered (every one of
 * the 24 keys playable, each with its own colour).
 */
import { frequency as gameFrequency, type TemperamentId } from "../audio/temperament.ts";
import { parsePitch } from "../music/pitch.ts";

export type TuningId = TemperamentId | "kirnberger3" | "vallotti";

export const TUNINGS: { id: TuningId; label: string; note: string }[] = [
  { id: "werckmeister3", label: "Werckmeister III (1691)", note: "a well temperament: every key playable, the remote ones sharper in colour" },
  { id: "kirnberger3", label: "Kirnberger III (1779)", note: "a well temperament by Bach's pupil: pure C–E, four fifths tempered by ¼ comma" },
  { id: "vallotti", label: "Vallotti (c. 1750)", note: "six fifths tempered by ⅙ comma, six pure: gently unequal" },
  { id: "equal", label: "Equal temperament", note: "every key alike" },
  { id: "meantone", label: "Quarter-comma meantone", note: "pure thirds in the near keys; the wolf fifth (G♯–E♭) in the far ones: hear F♯ major or B♭ minor" },
  { id: "pythagorean", label: "Pythagorean", note: "pure fifths, wide thirds" },
];

/** Deviations from equal temperament in cents, C = 0 ... B = 11. */
const TABLES: Record<"kirnberger3" | "vallotti", number[]> = {
  kirnberger3: [0, -9.8, -6.8, -5.9, -13.7, -2.0, -9.8, -3.4, -7.8, -10.3, -3.9, -11.7],
  vallotti: [5.9, 0, 2.0, 3.9, -2.0, 7.8, -2.0, 3.9, 2.0, 0, 5.9, -3.9],
};

/** Frequency in Hz of a spelled pitch in a tuning (A4 = 440 in equal temperament, anchored as the game anchors). */
export function frequency(pitch: string, t: TuningId): number {
  if (t === "kirnberger3" || t === "vallotti") {
    const p = parsePitch(pitch);
    const pc = ((p.midi % 12) + 12) % 12;
    const dev = TABLES[t][pc] - TABLES[t][2]; // anchored on D, as the game's temperaments are
    return 440 * 2 ** ((p.midi - 69 + dev / 100) / 12);
  }
  return gameFrequency(pitch, t);
}
