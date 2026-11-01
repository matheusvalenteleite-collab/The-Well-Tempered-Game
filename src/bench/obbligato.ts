/**
 * D485, OBBLIGATO: the subject boost. Playing well in the stretch just before one of the player's own
 * subject entries offers a second instrument for that entry: a layer added on top of the player's own
 * instrument, in unison (or, rarely, an octave or two away), drawn at random from the game's instruments
 * with unequal odds (the obvious, musical mixes most often, the wackiest least). The player sees the
 * instrument on the button before taking it; an offer not taken by the entry's first note lapses.
 *
 * This file is pure (no sound, no screen): the offer's window and its test, the entries a boost covers
 * (the stretto rule), the instruments, their tiers and the weighted draws of the instrument and the octave.
 * proto-game.ts runs it; chip.ts never hears of it (the layer is an ordinary note on another patch).
 *
 * D485 retires D482 (the sound takes no input from the score) for this feature: an offer is gated by how
 * the player played. The main instrument's level is never changed by it; scoring and judging are unchanged.
 */
import { PATCHES, PRESETS, type PatchId, type Patch } from "../touch/sound.ts";
import { SAMPLED, sampledMidis } from "../touch/sampled.ts";
import type { Sounding, Timbre } from "../touch/chip.ts";

/** The boost's name, in one place (the button reads `${OBBLIGATO} · CELLO`; tr() translates the instrument). */
export const OBBLIGATO = "OBBLIGATO";

// ---------- the window ----------

/** The stretch judged before an entry: from the end of the previous entry in any voice, at least 2 and at most 4 bars, closing 1 bar before the entry. */
export const WINDOW = { minBars: 2, maxBars: 4, leadBars: 1 } as const;
/**
 * "Played well" on the judge's own grades (PERFECT, GOOD, a miss or a wrong note), over the player's struck
 * notes in the window: no miss and no wrong note, at least `minNotes` notes, and at least `perfectShare`
 * of them PERFECT. Tuned with the simulated players (test/d485-obbligato.test.ts).
 */
export const WELL = { minNotes: 4, perfectShare: 0.8, maxMisses: 0 } as const;

export type Grade = "perfect" | "good" | "miss" | "pending";
export interface GradedNote {
  on: number;
  grade: Grade;
}
export interface EntryLike {
  voice: number;
  on: number;
  end: number;
}

/** The window [from, close) judged for entry `e` of the player's voice, or null where no stretch of 2 bars fits (the piece's or passage's start). */
export function offerWindow(e: EntryLike, all: readonly EntryLike[], barTicks: number, start: number): { from: number; close: number } | null {
  const close = e.on - WINDOW.leadBars * barTicks;
  const prevEnd = Math.max(-Infinity, ...all.filter((x) => x !== e && x.end <= e.on && !(x.voice === e.voice && x.on === e.on)).map((x) => x.end));
  const from = Math.max(start, Math.min(close - WINDOW.minBars * barTicks, Math.max(close - WINDOW.maxBars * barTicks, prevEnd)));
  return close - from >= WINDOW.minBars * barTicks - 1e-6 ? { from, close } : null;
}

/** The player played well in the window: the judge's grades of the struck notes in it (WELL). */
export function playedWell(notes: readonly GradedNote[], w: { from: number; close: number }): boolean {
  // A note still in its window as the stretch closes is not counted (it is judged after the offer is shown).
  const ns = notes.filter((n) => n.on >= w.from && n.on < w.close && n.grade !== "pending");
  const misses = ns.filter((n) => n.grade === "miss").length;
  const graded = ns.length;
  const perfect = ns.filter((n) => n.grade === "perfect").length;
  return graded >= WELL.minNotes && misses <= WELL.maxMisses && perfect >= WELL.perfectShare * graded;
}

/**
 * The stretto rule: the boost covers the player's entry, and another voice's entry that starts after it
 * and overlaps it (starts before it ends). An entry that started before the player's is not covered, even
 * in stretto.
 */
export function boostedSpans(e: EntryLike, all: readonly EntryLike[]): EntryLike[] {
  return [{ voice: e.voice, on: e.on, end: e.end }, ...all.filter((x) => x.voice !== e.voice && x.on > e.on && x.on < e.end).map((x) => ({ voice: x.voice, on: x.on, end: x.end }))];
}

// ---------- the instruments ----------

/** A main instrument's family, for the tiers. */
export type Family = "keys" | "strings" | "voice" | "console" | "chip" | "synth";
/** A voice's register (by the entry's mean pitch). */
export type Register = "soprano" | "alto" | "tenor" | "bass";

export interface Layer {
  /** The patch played (null: the classic chip's pulse). */
  id: PatchId | "chip";
  /** Its name on the button (English; tr() gives pt and es). */
  name: string;
  family: Family;
  /** The registers it doubles naturally (the musical tier). */
  regs: readonly Register[];
  /** The lowest and highest MIDI it plays (a recording's own compass where it has one). */
  lo: number;
  hi: number;
}

/** The wackiest instruments: the rarest draw. */
export const WACKIEST: readonly Layer["id"][] = ["tomWhistle", "modBell", "solBloop", "trkChoir"];

const ALL: readonly Register[] = ["soprano", "alto", "tenor", "bass"];
type Row = [id: Layer["id"], name: string, family: Family, regs: readonly Register[], lo?: number, hi?: number];
/** Every instrument the offered sounds play (PRESETS), each once. Ranges of synthesized patches by their role. */
const ROWS: readonly Row[] = [
  // Recorded, real instruments.
  ["consViolin", "VIOLIN", "strings", ["soprano", "alto"]],
  ["consViola", "VIOLA", "strings", ["alto", "tenor"]],
  ["consCello", "CELLO", "strings", ["tenor", "bass"]],
  ["singS", "SOPRANO VOICE", "voice", ["soprano"]],
  ["singS2", "MEZZO VOICE", "voice", ["soprano", "alto"]],
  ["singA", "ALTO VOICE", "voice", ["alto"]],
  ["singT", "TENOR VOICE", "voice", ["tenor"]],
  ["singB", "BASS VOICE", "voice", ["bass"]],
  ["pianoSampled", "PIANO", "keys", ALL],
  ["harpsiSampled", "HARPSICHORD", "keys", ALL],
  ["lute2", "LUTE", "keys", ["alto", "tenor"]],
  ["orgPrincipal", "ORGAN", "keys", ["soprano", "alto", "tenor"], 36, 96],
  ["orgPedal", "PEDAL ORGAN", "keys", ["bass"], 24, 60],
  // The consoles' imitations of real instruments.
  ["s16Violin", "16-BIT VIOLIN", "console", ["soprano", "alto"]],
  ["s16Flute", "16-BIT FLUTE", "console", ["soprano"]],
  ["s16Harpsi", "16-BIT HARPSICHORD", "console", ALL],
  ["s16Strings", "16-BIT STRINGS", "console", ["alto", "tenor"]],
  ["s16Cello", "16-BIT CELLO", "console", ["tenor", "bass"]],
  ["s16Bassoon", "16-BIT BASSOON", "console", ["tenor", "bass"]],
  ["n32Violin", "32-BIT VIOLIN", "console", ["soprano", "alto"]],
  ["n32Oboe", "32-BIT OBOE", "console", ["soprano", "alto"]],
  ["n32Harpsi", "32-BIT HARPSICHORD", "console", ALL],
  ["n32Viola", "32-BIT VIOLA", "console", ["alto", "tenor"]],
  ["n32Organ", "32-BIT ORGAN", "console", ["tenor", "bass"]],
  ["trkViolin", "TRACKER VIOLIN", "console", ["soprano", "alto"]],
  ["trkFlute", "TRACKER FLUTE", "console", ["soprano"]],
  ["trkHarpsi", "TRACKER HARPSICHORD", "console", ALL],
  ["trkChoir", "8-BIT CHOIR", "console", ["alto"]],
  ["trkBass", "SLAP BASS", "console", ["bass"]],
  // Chips.
  ["chip", "CHIP PULSE", "chip", ["soprano", "alto", "tenor"], 36, 100],
  ["gbLead", "GAME BOY LEAD", "chip", ["soprano"], 48, 100],
  ["gbHarm", "GAME BOY HARMONY", "chip", ["alto"], 43, 96],
  ["gbWave", "GAME BOY WAVE", "chip", ["tenor", "bass"], 28, 84],
  ["gbThin", "GAME BOY THIN", "chip", ["alto", "tenor"], 40, 96],
  ["gbBass", "GAME BOY BASS", "chip", ["bass"], 28, 67],
  ["sidLead", "SID LEAD", "chip", ["soprano"], 48, 100],
  ["sidThin", "SID PULSE", "chip", ["alto"], 43, 96],
  ["sidSaw", "SID SAW", "chip", ["alto", "tenor"], 36, 96],
  ["sidTri", "SID TRIANGLE", "chip", ["tenor"], 36, 96],
  ["sidBass", "SID BASS", "chip", ["bass"], 28, 67],
  // Synthesizers.
  ["solLead", "SWITCHED-ON LEAD", "synth", ["soprano"], 48, 100],
  ["solSquare", "SQUARE LEAD", "synth", ["alto"], 43, 96],
  ["solNasal", "NASAL SYNTH", "synth", ["alto", "tenor"], 40, 96],
  ["solBloop", "BLOOP", "synth", ["tenor"], 36, 88],
  ["solBass", "SYNTH BASS", "synth", ["bass"], 28, 67],
  ["fmLead", "FM LEAD", "synth", ["soprano"], 48, 100],
  ["fmBrass", "FM BRASS", "synth", ["alto", "tenor"], 40, 88],
  ["fmPiano", "E-PIANO", "synth", ALL, 33, 96],
  ["fmClav", "CLAV", "synth", ["alto", "tenor"], 36, 96],
  ["fmBass", "FM BASS", "synth", ["bass"], 28, 67],
  ["modVibe", "VIBRAPHONE", "synth", ["soprano", "alto"], 53, 89],
  ["modOrgan", "COMBO ORGAN", "synth", ["alto", "tenor"], 36, 96],
  ["modBongo", "MARIMBA", "synth", ["alto", "tenor"], 45, 96],
  ["modBell", "TUBE", "synth", ["soprano"], 55, 96],
  ["modBass", "SYNTH UPRIGHT", "synth", ["bass"], 28, 67],
  ["tomWhistle", "WHISTLE", "synth", ["soprano"], 60, 100],
  ["tomStrings", "SPACE STRINGS", "synth", ["alto", "tenor"], 36, 96],
  ["tomFlute", "SPACE FLUTE", "synth", ["soprano", "alto"], 55, 96],
  ["tomChoir", "SPACE CHOIR", "synth", ["alto", "tenor"], 45, 84],
  ["tomBass", "SPACE BASS", "synth", ["bass"], 28, 67],
  ["vocLa", "SYNTH SINGER (LA)", "synth", ["soprano"], 55, 88],
  ["vocMi", "SYNTH SINGER (MI)", "synth", ["soprano", "alto"], 52, 84],
  ["vocRo", "SYNTH SINGER (RO)", "synth", ["alto"], 48, 81],
  ["vocNe", "SYNTH SINGER (NE)", "synth", ["tenor"], 43, 76],
  ["vocDa", "SYNTH SINGER (DA)", "synth", ["bass"], 36, 67],
];

/** A recorded patch's compass (its recordings, a whole step either way), else the row's. */
function compass(id: Layer["id"], lo = 28, hi = 100): [number, number] {
  const s = id === "chip" ? undefined : PATCHES[id].sample;
  if (!s) return [lo, hi];
  const inst = SAMPLED[s];
  const ms = [...sampledMidis(inst.set), ...(inst.above ? sampledMidis(inst.above.set) : [])];
  return ms.length ? [Math.min(...ms) - 2, Math.max(...ms) + 2] : [lo, hi];
}

/** The instruments a boost can add: every one the game's sounds play. */
export const LAYERS: readonly Layer[] = ROWS.map(([id, name, family, regs, lo, hi]) => {
  const [a, b] = compass(id, lo, hi);
  return { id, name, family, regs, lo: a, hi: b };
});

/** The patch ids the offered presets play (so a new preset's instrument is noticed by the tests). */
export function presetPatchIds(): Set<string> {
  const ids = new Set<string>(["chip"]);
  for (const p of PRESETS) {
    for (const s of p.slots ?? []) ids.add(s);
    for (const vs of Object.values(p.by ?? {})) for (const [s] of vs ?? []) ids.add(s);
  }
  return ids;
}

/** A main instrument's family (its patch's row; the classic chip's null patch a chip). */
export function familyOf(id: Layer["id"] | null): Family {
  if (!id) return "chip";
  return LAYERS.find((l) => l.id === id)?.family ?? "synth";
}

/** The patch id of a voice's instrument in the sound now (null: the classic chip). */
export function mainPatchId(p: Patch | null | undefined): PatchId | null {
  if (!p) return null;
  return (Object.keys(PATCHES) as PatchId[]).find((k) => PATCHES[k] === p) ?? null;
}

/** An entry's register by its mean pitch. */
export function registerOf(midis: readonly number[]): Register {
  const m = midis.reduce((a, b) => a + b, 0) / Math.max(1, midis.length);
  return m >= 67 ? "soprano" : m >= 60 ? "alto" : m >= 52 ? "tenor" : "bass";
}

/** The three tiers' odds: the obvious, musical mixes; the wackier; the wackiest (about one offer in sixteen). */
export const TIER_ODDS = [0.72, 0.22, 0.06] as const;

/**
 * The tier of `l` as a layer on main family `main` in register `reg`: 0 the musical (a real instrument
 * of another family that belongs in that register: a cello on a piano's bass, a tenor on its tenor; on a
 * consort the voices and keyboards; on the voices the strings and keyboards; on a chip or synth sound the
 * real strings and voices), 2 the wackiest (WACKIEST), 1 everything else.
 */
export function tierOf(l: Layer, main: Family, reg: Register): 0 | 1 | 2 {
  if (WACKIEST.includes(l.id)) return 2;
  const real = l.family === "keys" || l.family === "strings" || l.family === "voice";
  if (!real || !l.regs.includes(reg)) return 1;
  if (main === "keys") return l.family === "keys" ? 1 : 0;
  if (main === "strings") return l.family === "strings" ? 1 : 0;
  if (main === "voice") return l.family === "voice" ? 1 : 0;
  // A chip, a synth or a console's imitation: the real strings and voices are the obvious mix.
  return l.family === "keys" ? 1 : 0;
}

/** The octave's odds: the same octave most often, one either way rarer, two rarest. */
export const OCTAVE_ODDS: Readonly<Record<number, number>> = { 0: 0.8, 1: 0.075, [-1]: 0.075, 2: 0.025, [-2]: 0.025 };
/** No layer below this MIDI (a phone's speaker gives nothing there; the bass stays clear). */
export const LAYER_FLOOR = 36;

/** The octaves `l` may take for an entry spanning lo..hi (MIDI): within its compass, and not under LAYER_FLOOR. */
export function octavesFor(l: Layer, lo: number, hi: number): number[] {
  return [0, 1, -1, 2, -2].filter((k) => lo + 12 * k >= Math.max(l.lo, LAYER_FLOOR) && hi + 12 * k <= l.hi);
}

/** A weighted pick (`rnd` in [0, 1)). */
function pick<T>(items: readonly T[], weight: (t: T) => number, rnd: number): T | null {
  const total = items.reduce((a, t) => a + weight(t), 0);
  if (!(total > 0)) return null;
  let x = rnd * total;
  for (const t of items) if ((x -= weight(t)) < 0) return t;
  return items[items.length - 1];
}

export interface Draw {
  layer: Layer;
  tier: 0 | 1 | 2;
  /** Octaves from unison (0 most of the time). */
  octave: number;
}

/**
 * The layer offered: a tier by TIER_ODDS (an empty tier's share spread over the others), an instrument
 * within it evenly, then an octave by OCTAVE_ODDS among those its compass allows for the entry's notes.
 * `pool` filters the instruments (for now every one; later perhaps only those the player has met); the
 * main instrument itself is never drawn.
 */
export function drawLayer(o: { main: Layer["id"] | null; midis: readonly number[]; pool?: (l: Layer) => boolean; rng?: () => number }): Draw | null {
  const rng = o.rng ?? Math.random;
  const fam = familyOf(o.main);
  const reg = registerOf(o.midis);
  const lo = Math.min(...o.midis);
  const hi = Math.max(...o.midis);
  const ok = LAYERS.filter((l) => l.id !== (o.main ?? "chip") && (o.pool ? o.pool(l) : true) && octavesFor(l, lo, hi).length > 0);
  const tiers = [0, 1, 2].map((t) => ok.filter((l) => tierOf(l, fam, reg) === t));
  const t = pick([0, 1, 2] as const, (k) => (tiers[k].length ? TIER_ODDS[k] : 0), rng());
  if (t === null) return null;
  const list = tiers[t];
  const layer = list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const octave = pick(octavesFor(layer, lo, hi), (k) => OCTAVE_ODDS[k] ?? 0, rng()) ?? 0;
  return { layer, tier: t, octave };
}

/** The layer's voicing: its patch (the classic chip's pulse for "chip"), at the main voice's place. */
export function layerVoicing(l: Layer, pan: number): { timbre: Timbre; pan: number; gain: number; patch: Patch | null } {
  return { timbre: "pulse25", pan, gain: 1, patch: l.id === "chip" ? null : PATCHES[l.id] };
}

/** The layer's share of the note's level: it colours the voice, never swamps it (the main note's own level is untouched). */
export const LAYER_LEVEL = 0.75;


/**
 * The player's note with its layer, as one sound: stopped, bent and glided together (the layer `shift`
 * semitones away); the touch's own gestures (a sideways shape, the lab's trim) are the main note's alone.
 */
export function withLayer(main: Sounding, layer: Sounding, shift: number): Sounding {
  // The arguments passed on as given (a stop with no time is a stop now, for both).
  return {
    stop: (...a) => (main.stop(...a), layer.stop(...a)),
    bend: (...a) => (main.bend(...a), layer.bend(...a)),
    glide: (m, ...a) => (main.glide?.(m, ...a), layer.glide?.(m + shift, ...a)),
    muffle: () => main.muffle?.(),
    dyn: (...a) => (main.dyn?.(...a), layer.dyn?.(...a)),
    shape: (...a) => main.shape?.(...a),
    trim: (...a) => main.trim?.(...a),
  };
}
