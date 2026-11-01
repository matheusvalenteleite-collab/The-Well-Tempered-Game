/**
 * D351: the MORE BACH and CHORALES pieces' three tempi, SLOW · DEFAULT · FAST, one button on the pop-up
 * cycling them (the owner: "a button which pressed cycles around 3 options slow default fast … switching
 * tempo also switches sound preset … whatever sounds best for each tempo option"), the choice kept for
 * each piece on the device.
 *
 * The tempi, in quarter notes a minute, from the piece's DEFAULT (tempi.ts: the editorial reference,
 * lowered so the busiest line keeps to 5.5 notes a second):
 *   - SLOW 0.75× the default; FAST 1.25×, but no faster than the 5.5 notes a second the game's load
 *     allows (D312) for the busiest line, and never less than 1.12× the default: where the default
 *     already sits at the cap (most quick concerto movements) FAST passes it by at most 12%;
 *   - a chorale ♩ 48 · 60 · 76 (0.8× and 1.27× of its ♩ 60; 𝅗𝅥 32 · 40 · 51 in 3/2).
 * Judging follows the tempo played (the game's windows are in time).
 *
 * The sounds (sound.ts PRESETS), by the kind of piece, for what sounds best at each tempo; DEFAULT is the
 * piece's own (piece-sound.ts), unchanged. A sound the player chose for the piece is kept at every tempo.
 */
import { lang, type Lang } from "../i18n/index.ts";
import { MORE_INDEX, CHORALE_INDEX } from "../touch/fugue.ts";
import { MORE_TEMPO, TEMPO, type PieceTempo } from "../touch/tempi.ts";
import { PIECE_SOUND } from "../touch/piece-sound.ts";

export type TempoStep = "slow" | "default" | "fast";
export const TEMPO_STEPS: readonly TempoStep[] = ["slow", "default", "fast"];
/** The button's words, in each language (the dictionaries' DEFAULT is the tuning's: feminine in Spanish). */
export const STEP_WORDS: Record<Lang, Record<TempoStep, string>> = {
  en: { slow: "SLOW", default: "DEFAULT", fast: "FAST" },
  pt: { slow: "LENTO", default: "PADRÃO", fast: "RÁPIDO" },
  es: { slow: "LENTO", default: "NORMAL", fast: "RÁPIDO" },
};
export const stepWord = (s: TempoStep): string => STEP_WORDS[lang()][s];

/** The game's load (D312): the busiest line at most 5.5 notes a second. */
export const STEP_LOAD = 5.5;
export const SLOW_SHARE = 0.75;
// D481 (the owner: "some fugues' fast tempo is quite conservative and similar to standard. The fast version
// ought to be faster"): FAST 1.4× the default, never less than 1.3×, and its own load cap (FAST_LOAD, a
// challenge chosen by the player) instead of the default's 5.5 notes a second.
export const FAST_SHARE = 1.4;
/** FAST at least this much quicker than DEFAULT, even past the load (where DEFAULT is already at it). */
export const FAST_MIN_SHARE = 1.3;
/** D481: the busiest line's notes a second FAST may reach (DEFAULT keeps STEP_LOAD). */
export const FAST_LOAD = 7.5;
/** A chorale: ♩ 48 · 60 · 76. */
export const CHORALE_SHARES = { slow: 48 / 60, fast: 76 / 60 } as const;

const COLLECTION = new Map<string, string>(MORE_INDEX.map(([id, c]) => [id, c]));
const CHORALES = new Set(CHORALE_INDEX);

/** D356: a fugue of the Well-Tempered Clavier (Book I or II). */
export const isWtcFugue = (id: string): boolean => /^wtc[12]f\d\d$/.test(id);

/** The kinds the sounds are chosen by. */
export type StepKind = "wtc" | "aof" | "ric3" | "ric6" | "inv" | "sin" | "concerto" | "hconcerto" | "motet" | "cantata" | "chorale";
export function stepKind(id: string): StepKind | null {
  if (CHORALES.has(id)) return "chorale";
  if (isWtcFugue(id)) return "wtc";
  if (id === "bwv1080-14") return "aof";
  if (id === "bwv1079-ric3") return "ric3";
  if (id === "bwv1079-ric6") return "ric6";
  const c = COLLECTION.get(id);
  return c === "aof" || c === "inv" || c === "sin" || c === "concerto" || c === "hconcerto" || c === "motet" || c === "cantata" ? c : null;
}

/**
 * The sound at SLOW and at FAST for each kind (DEFAULT: the piece's own). Why (D351's table):
 *   - keyboard counterpoint (the Art of Fugue, the Inventions and Sinfonias, the Ricercar a 3): slow on
 *     a sustaining instrument that lets each held line sing (the PIPE ORGAN for the Art of Fugue, whose
 *     open score organists have always played; the PIANO for the Inventions and Sinfonias, whose preface
 *     asks for a "cantabile" touch, and for the Ricercar a 3, improvised on Frederick's Silbermann
 *     fortepiano); fast on CLASSIC CHIP, the game's own pulses, an instant attack and no sustain, so
 *     quick lines stay apart where a harpsichord's ring would blur them;
 *   - the Ricercar a 6 (stile antico, six voices): slow SOLO VOICES (a motet's texture, sung), fast the
 *     HARPSICHORD (the organ's pipes speak too slowly for it);
 *   - the concertos (BWV 1043, the harpsichord concertos) and the cantata: slow NOCTURNE 32-BIT (bowed
 *     violin and viola, the organ's continuo, in a dark hall: held notes swell and the reverberation
 *     fills the space between them); fast TRACKER (its harpsichord for the solo hands and violins for the
 *     strings, dry, hard left and right: the semiquavers keep their edges at speed);
 *   - the motet: slow and default SOLO VOICES (a cappella, as written); fast VOCAL SYNTH (synthesized
 *     singers, a quicker attack, so a fast double choir's syllables stay distinct);
 *   - a chorale: slow SOLO VOICES (sung, as the congregation's hymn: long breaths at ♩ 48), default the
 *     PIPE ORGAN, fast the HARPSICHORD (a continuo's crisp attack where pipes would smear passing notes).
 */
export const STEP_SOUNDS: Record<StepKind, { slow: string; fast: string }> = {
  // D356: the WTC's fugues as the Art of Fugue (keyboard counterpoint); WTC_SOUND_ELSE where the fugue's own sound is already the step's.
  wtc: { slow: "chamberOrgan", fast: "chip" },
  aof: { slow: "chamberOrgan", fast: "chip" },
  ric3: { slow: "pianoSampled", fast: "chip" },
  ric6: { slow: "soloVoices", fast: "harpsichordSampled" },
  inv: { slow: "pianoSampled", fast: "chip" },
  sin: { slow: "pianoSampled", fast: "chip" },
  concerto: { slow: "nocturne32", fast: "tracker" },
  hconcerto: { slow: "nocturne32", fast: "tracker" },
  motet: { slow: "soloVoices", fast: "vocalSynth" },
  cantata: { slow: "nocturne32", fast: "tracker" },
  chorale: { slow: "soloVoices", fast: "harpsichordSampled" },
};

/** A piece's tempo record (the WTC's file for its fugues and the unfinished fugue, else MORE BACH's). */
const recordOf = (id: string): PieceTempo | undefined => TEMPO[id] ?? MORE_TEMPO[id];

/** The three tempi of a MORE BACH or CHORALES piece or (D356) a WTC fugue (quarter notes a minute), or null for any other. */
export function stepTempi(id: string): Record<TempoStep, number> | null {
  const t = recordOf(id);
  const kind = stepKind(id);
  if (!t || !kind) return null;
  const d = t.normal;
  if (kind === "chorale") return { slow: Math.round(d * CHORALE_SHARES.slow), default: d, fast: Math.round(d * CHORALE_SHARES.fast) };
  // The busiest line at DEFAULT, in notes a second: the cap is the tempo where it reaches STEP_LOAD.
  const cap = t.busiest > 0 ? (d * FAST_LOAD) / t.busiest : Infinity;
  return { slow: Math.round(d * SLOW_SHARE), default: d, fast: Math.round(Math.max(d * FAST_MIN_SHARE, Math.min(d * FAST_SHARE, cap))) };
}

/** The tempo in the meter's beat, for the button ("♩. 44"). */
export function stepBeat(id: string, bpm: number): string {
  const t = recordOf(id);
  if (!t) return `♩ ${bpm}`;
  const per = t.normal ? t.unitBpm.normal / t.normal : 1;
  return `${t.unit} ${Math.round(bpm * per)}`;
}

/**
 * D356: a WTC fugue whose own sound (PIECE_SOUND, read when asked: D355 chooses the fugues' sounds) is
 * already the step's plays this one instead, so every step changes the sound: SLOW the PIANO (sustained,
 * singing), FAST the HARPSICHORD (a crisp attack).
 */
export const WTC_SOUND_ELSE = { slow: "pianoSampled", fast: "harpsichordSampled" } as const;

/** The sound a step plays in, where it is not the piece's own (DEFAULT: undefined). */
export function stepSound(id: string, step: TempoStep): string | undefined {
  const kind = stepKind(id);
  if (!kind || step === "default") return undefined;
  const s = STEP_SOUNDS[kind][step];
  return kind === "wtc" && PIECE_SOUND[id] === s ? WTC_SOUND_ELSE[step] : s;
}

/**
 * D356: where the tempo button is shown: every MORE BACH and CHORALES piece and every WTC fugue in the
 * unlocked view (`full`, tb-unlock-all); in the friends' view a WTC fugue once finished with an A or
 * better (`gradedA`: lite.ts tempoEarned).
 */
export const tempoOpen = (id: string, full: boolean, gradedA: boolean): boolean => !!stepTempi(id) && (full || (isWtcFugue(id) && gradedA));

export const nextStep = (s: TempoStep): TempoStep => TEMPO_STEPS[(TEMPO_STEPS.indexOf(s) + 1) % TEMPO_STEPS.length];

/** Kept on the device, a step for each piece (DEFAULT where none). */
export const TEMPO_STEP_KEY = "tb-lite-tempo-v1";
export function readSteps(): Record<string, TempoStep> {
  try {
    const o = JSON.parse(localStorage.getItem(TEMPO_STEP_KEY) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v === "slow" || v === "fast")) as Record<string, TempoStep>;
  } catch {
    return {};
  }
}
export function saveStep(id: string, step: TempoStep): Record<string, TempoStep> {
  const next = { ...readSteps() };
  if (step === "default") delete next[id];
  else next[id] = step;
  try {
    localStorage.setItem(TEMPO_STEP_KEY, JSON.stringify(next));
  } catch {
    /* this visit only */
  }
  return next;
}
