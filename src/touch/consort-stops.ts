/**
 * D512, STRING CONSORT'S ARTICULATION STOPS (as the organ's and the harpsichord's pistons, D420): how the consort
 * plays, chosen as a player would mark a passage: ARCO (the bow, as the consort has always played), SPICCATO (the
 * bow bounced off the string: VSCO 2 CE's spiccato recordings, the violin's solo, the viola's and the cello's a
 * section's), PIZZICATO (plucked: VSCO 2 CE's pizzicati), CON SORDINO (muted: the mute on the bridge, the arco
 * recordings darker and softer: SORDINO) and TREMOLO (the bow's rapid strokes on one note: the arco's level shaken,
 * TREMOLO). Each recorded set's level matched to the arco's (measured: DECISIONS D512). Not scored; never by verdict.
 *
 * The state here (the stop in force, kept per piece on the device, with TUTTI: every consort voice takes it, else
 * the player's voice alone), told to whoever shows it (onConsortStop); chip.ts reads it as each note starts
 * (consortNote), so a change sounds from the next note, the band's notes following under TUTTI. The buttons are
 * the design studio's (the music box's legend, down its borders): only this API, no button here (the three
 * thumb pistons, RegistrationStops.tsx, hold three registrations; five stops do not fit them unchanged).
 * Pure numbers and state (test/d512-consort-stops.test.ts).
 */
import { PATCHES, type Patch } from "./sound.ts";

export type ConsortStop = "arco" | "spicc" | "pizz" | "sord" | "trem";
/** The stops in the order they are shown. */
export const CONSORT_STOPS: readonly ConsortStop[] = ["arco", "spicc", "pizz", "sord", "trem"];
/** The stop a piece starts on (the consort as it has always played). */
export const CONSORT_HOME: ConsortStop = "arco";
/** Each stop's name in the three languages (string players' Italian where they keep it), and a short form for a narrow button. */
export const CONSORT_STOP_LABEL: Readonly<Record<ConsortStop, { en: string; pt: string; es: string; short: string }>> = {
  arco: { en: "ARCO", pt: "ARCO", es: "ARCO", short: "ARCO" },
  spicc: { en: "SPICCATO", pt: "SPICCATO", es: "SPICCATO", short: "SPICC." },
  pizz: { en: "PIZZICATO", pt: "PIZZICATO", es: "PIZZICATO", short: "PIZZ." },
  sord: { en: "MUTED", pt: "SURDINA", es: "SORDINA", short: "SORD." },
  trem: { en: "TREMOLO", pt: "TRÊMOLO", es: "TRÉMOLO", short: "TREM." },
};
/** A stop's label in a language ("en" where another is asked). */
export const consortStopLabel = (s: ConsortStop, lang: string = "en", short = false): string => {
  const l = CONSORT_STOP_LABEL[s];
  return short ? l.short : lang === "pt" ? l.pt : lang === "es" ? l.es : l.en;
};

/** The sounds that have these stops. */
export const CONSORT_PRESETS: ReadonlySet<string> = new Set(["stringConsort"]);
export const hasConsortStops = (presetId: string) => CONSORT_PRESETS.has(presetId);

/** CON SORDINO: the mute's lowpass (Hz: the bridge's upper resonances damped) and its level (a muted string about 3 dB softer). */
export const SORDINO = { lp: 2600, gain: 0.72 } as const;
/** TREMOLO: the bow's strokes (per second), how deep each dips (the level shaken: Patch.trem), and its level against the arco (measured: its strokes heard 0.6 dB over it at the same mean). */
export const TREMOLO = { rate: 11, depth: 0.7, trim: 0.93 } as const;

/** The arco patch, its spiccato and its pizzicato (sound.ts PATCHES), by the consort's voices. */
const VARIANTS: readonly [arco: Patch, spicc: Patch, pizz: Patch][] = [
  [PATCHES.consViolin, PATCHES.consViolinSpicc, PATCHES.consViolinPizz],
  [PATCHES.consViola, PATCHES.consViolaSpicc, PATCHES.consViolaPizz],
  [PATCHES.consCello, PATCHES.consCelloSpicc, PATCHES.consCelloPizz],
];
const tremolos = new Map<Patch, Patch>();
/** TREMOLO's patch: the arco's, its level shaken (chip.ts takes depth/2 off the mean: given back). */
export function tremoloPatch(arco: Patch): Patch {
  let t = tremolos.get(arco);
  if (!t) tremolos.set(arco, (t = { ...arco, level: (arco.level * TREMOLO.trim) / (1 - TREMOLO.depth / 2), trem: { depth: TREMOLO.depth, rate: TREMOLO.rate } }));
  return t;
}
/** Whether a patch is one of the consort's arco voices. */
export const isConsortArco = (pt: Patch | null | undefined) => !!pt && VARIANTS.some((v) => v[0] === pt);

/** What a stop makes of a consort note: its patch (spiccato, pizzicato, tremolo), the mute's lowpass and level. */
export interface ConsortNote {
  patch?: Patch;
  lp?: number;
  level?: number;
}
/** A consort voice's note under a stop (null: as it was: ARCO, or a patch the stops do not reach). */
export function stopNote(stop: ConsortStop, pt: Patch | null | undefined): ConsortNote | null {
  const v = VARIANTS.find((x) => x[0] === pt);
  if (!v || stop === "arco") return null;
  if (stop === "spicc") return { patch: v[1] };
  if (stop === "pizz") return { patch: v[2] };
  if (stop === "trem") return { patch: tremoloPatch(v[0]) };
  return { lp: SORDINO.lp, level: SORDINO.gain };
}

/** The stop in force and whether every consort voice takes it (TUTTI) or the player's alone. */
export interface ConsortState {
  stop: ConsortStop;
  tutti: boolean;
}
export const DEFAULT_CONSORT: ConsortState = { stop: CONSORT_HOME, tutti: false };

/**
 * The stop's answer for a note of the preset playing, of the voice whose patch is `pt`; `lead` whether it is the
 * player's. Null: the note as it was (another sound, another voice without TUTTI, ARCO).
 */
export function consortNote(presetId: string, st: ConsortState, pt: Patch | null | undefined, lead: boolean): ConsortNote | null {
  if (!hasConsortStops(presetId) || (!lead && !st.tutti)) return null;
  return stopNote(st.stop, pt);
}

// ---- The state: the stop in force (read by every note), kept per piece on the device ----

let live: { presetId: string; st: ConsortState } = { presetId: "", st: DEFAULT_CONSORT };
const listeners = new Set<(presetId: string, st: ConsortState) => void>();
/** The stop in force for the sound now playing (set by the buttons, and when a piece opens: loadConsortStop). */
export function setConsortStop(presetId: string, st: ConsortState) {
  live = { presetId, st: { stop: CONSORT_STOPS.includes(st.stop) ? st.stop : CONSORT_HOME, tutti: !!st.tutti } };
  for (const f of listeners) f(live.presetId, live.st);
}
/** The stop in force for a sound (ARCO, the player's alone, where none was set for it). */
export const consortStop = (presetId: string): ConsortState => (live.presetId === presetId ? live.st : DEFAULT_CONSORT);
/** Told of every change of the stop in force (the buttons redraw); returns the unsubscribe. */
export function onConsortStop(f: (presetId: string, st: ConsortState) => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}

export const CONSORT_KEY = "tg-consort-stops-v1";
type Stored = Record<string, ConsortState>;
function readAll(): Stored {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(CONSORT_KEY) : null;
    const o = v ? (JSON.parse(v) as unknown) : {};
    return o && typeof o === "object" ? (o as Stored) : {};
  } catch {
    return {};
  }
}
/** The stop kept for a piece (ARCO if none, or if what is kept is not understood). */
export function loadConsortStop(piece: string): ConsortState {
  const r = readAll()[piece];
  if (!r || typeof r !== "object") return DEFAULT_CONSORT;
  return { stop: CONSORT_STOPS.includes(r.stop) ? r.stop : CONSORT_HOME, tutti: r.tutti === true };
}
export function saveConsortStop(piece: string, st: ConsortState) {
  try {
    const all = readAll();
    if (st.stop === CONSORT_HOME && !st.tutti) delete all[piece];
    else all[piece] = { stop: st.stop, tutti: st.tutti };
    localStorage.setItem(CONSORT_KEY, JSON.stringify(all));
  } catch {
    /* this visit only */
  }
}
/** A piece opens on the consort: its kept stop in force. */
export function openConsortPiece(piece: string, presetId = "stringConsort") {
  setConsortStop(presetId, loadConsortStop(piece));
}
/** A stop chosen while playing (the buttons): in force from the next note, and kept for the piece. */
export function chooseConsortStop(piece: string, presetId: string, stop: ConsortStop, tutti = consortStop(presetId).tutti) {
  const st = { stop, tutti };
  setConsortStop(presetId, st);
  saveConsortStop(piece, st);
}
