/**
 * D327: each sound its own tuning, after historical practice (the owner: "each instrument/preset its own
 * default temperament and pitch"). ⚙ TUNING's first choice, INSTRUMENT DEFAULT, takes it from this one
 * table (change a row here); any other choice is a temperament at a pitch of A, kept for every sound.
 *   HARPSICHORD, ORGAN: Werckmeister III (1691), the well temperament most cited for German keyboards
 *     of Bach's time, at A = 415, the "baroque pitch" period-instrument keyboards use today (Bach's own
 *     pitches varied: Chorton for the organ, Kammerton about a semitone lower elsewhere).
 *   SOLO VOICES: Vallotti (c. 1750), the milder well temperament ensembles of singers with continuo
 *     often use, at A = 415.
 *   PIANO, VOCAL SYNTH, the consoles and synthesizers: equal temperament at A = 440, their own world.
 */
import { PITCHES, TEMPERAMENTS } from "./tuning.ts";
import { RETIRED } from "./sound.ts";

export interface TuningAt {
  /** The temperament (tuning.ts TEMPERAMENTS id). */
  id: string;
  /** The pitch of A (Hz). */
  a: number;
}

/** The table: a sound (sound.ts preset id) → its tuning. A sound not named: TUNING_FALLBACK. */
export const INSTRUMENT_TUNING: Readonly<Record<string, TuningAt>> = {
  harpsichordSampled: { id: "werckmeister", a: 415 },
  chamberOrgan: { id: "werckmeister", a: 415 },
  organSampled: { id: "werckmeister", a: 415 },
  pianoSampled: { id: "equal", a: 440 },
  soloVoices: { id: "vallotti", a: 415 },
  vocalSynth: { id: "equal", a: 440 },
  // D358: the trial presets: a baroque string band at A = 415 (Vallotti, as the singers); a fretted lute near equal, at 415.
  stringConsort: { id: "vallotti", a: 415 },
  lute: { id: "equal", a: 415 },
};
/** Every other sound (the consoles, the synthesizers): equal temperament, A = 440. */
export const TUNING_FALLBACK: TuningAt = { id: "equal", a: 440 };

/** The player's choice: INSTRUMENT DEFAULT, or a temperament at a pitch (for every sound). */
export type TuningPref = "instrument" | TuningAt;

export const instrumentTuning = (sound: string): TuningAt => INSTRUMENT_TUNING[sound] ?? INSTRUMENT_TUNING[RETIRED[sound] ?? ""] ?? TUNING_FALLBACK;

/** The tuning in force for a sound under a choice. */
export const resolveTuning = (pref: TuningPref, sound: string): TuningAt => (pref === "instrument" ? instrumentTuning(sound) : pref);

/** A stored value read as a choice (anything unknown: INSTRUMENT DEFAULT). */
export function tuningPrefOf(v: unknown): TuningPref {
  if (v && typeof v === "object") {
    const { id, a } = v as Partial<TuningAt>;
    if (typeof id === "string" && TEMPERAMENTS.some((t) => t.id === id) && (PITCHES as readonly unknown[]).includes(a)) return { id, a: a as number };
  }
  return "instrument";
}

/** The select's value for a choice: "instrument" or "werckmeister@415". */
export const tuningValue = (p: TuningPref): string => (p === "instrument" ? "instrument" : `${p.id}@${p.a}`);
export const tuningOfValue = (v: string): TuningPref => {
  const [id, a] = v.split("@");
  return tuningPrefOf({ id, a: Number(a) });
};

/** "WERCKMEISTER III · A415" (a temperament's parenthesis dropped: "LEHMAN"). */
export const tuningShort = (t: TuningAt): string => `${(TEMPERAMENTS.find((x) => x.id === t.id) ?? TEMPERAMENTS[0]).name.replace(/ \(.*\)$/, "")} · A${t.a}`;
