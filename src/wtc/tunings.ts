/**
 * Tunings for the Well-Tempered Clavier: the game's temperaments (src/audio/temperament.ts, which
 * holds the tables, Kirnberger III and Vallotti included), with labels for the lab. In meantone the
 * remote keys have the wolf fifth: the reason "well-tempered" mattered (every one of the 24 keys
 * playable, each with its own colour).
 */
import { frequency as gameFrequency, type TemperamentId } from "../audio/temperament.ts";

export type TuningId = TemperamentId;

export const TUNINGS: { id: TuningId; label: string; note: string }[] = [
  { id: "werckmeister3", label: "Werckmeister III (1691)", note: "a well temperament: every key playable, the remote ones sharper in colour. Once taken for 'the Bach tuning'; Ledbetter (2002, ch. 2) finds the evidence by c. 1740 pointing rather to equal or near-equal temperament with a nuance of key character" },
  { id: "kirnberger3", label: "Kirnberger III (1779)", note: "a well temperament by Bach's pupil: pure C–E, four fifths tempered by ¼ comma. Not Bach's own: the only tuning advice Kirnberger reports from him is to tune all major thirds sharp (Ledbetter 2002, p. 48)" },
  { id: "vallotti", label: "Vallotti (c. 1750)", note: "six fifths tempered by ⅙ comma, six pure: gently unequal" },
  { id: "equal", label: "Equal temperament", note: "every key alike; by c. 1740 probably close to what Bach used (Ledbetter 2002, pp. 45, 49–50, after Lindley)" },
  { id: "meantone", label: "Quarter-comma meantone", note: "pure thirds in the near keys; the wolf fifth (G♯–E♭) in the far ones: hear F♯ major or B♭ minor" },
  { id: "pythagorean", label: "Pythagorean", note: "pure fifths, wide thirds" },
];

/** Frequency in Hz of a spelled pitch in a tuning. */
export const frequency = (pitch: string, t: TuningId): number => gameFrequency(pitch, t);
