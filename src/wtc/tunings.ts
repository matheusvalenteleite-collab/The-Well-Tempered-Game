/**
 * Tunings for the Well-Tempered Clavier: the game's temperaments (src/audio/temperament.ts, which
 * holds the tables, Kirnberger III and Vallotti included), with labels for the lab. In meantone the
 * remote keys have the wolf fifth: the reason "well-tempered" mattered (every one of the 24 keys
 * playable, each with its own colour).
 */
import { frequency as gameFrequency, type TemperamentId } from "../audio/temperament.ts";

export type TuningId = TemperamentId;

export const TUNINGS: { id: TuningId; label: string; note: string }[] = [
  { id: "werckmeister3", label: "Werckmeister III (1691)", note: "a well temperament: every key playable, the remote ones sharper in colour" },
  { id: "kirnberger3", label: "Kirnberger III (1779)", note: "a well temperament by Bach's pupil: pure C–E, four fifths tempered by ¼ comma" },
  { id: "vallotti", label: "Vallotti (c. 1750)", note: "six fifths tempered by ⅙ comma, six pure: gently unequal" },
  { id: "equal", label: "Equal temperament", note: "every key alike" },
  { id: "meantone", label: "Quarter-comma meantone", note: "pure thirds in the near keys; the wolf fifth (G♯–E♭) in the far ones: hear F♯ major or B♭ minor" },
  { id: "pythagorean", label: "Pythagorean", note: "pure fifths, wide thirds" },
];

/** Frequency in Hz of a spelled pitch in a tuning. */
export const frequency = (pitch: string, t: TuningId): number => gameFrequency(pitch, t);
