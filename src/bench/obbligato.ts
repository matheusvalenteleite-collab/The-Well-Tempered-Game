/**
 * D485, OBBLIGATO: the subject boost. Playing well in the stretch just before one of the player's own
 * subject entries offers a boost for that entry; the player sees its name on the button before taking it;
 * an offer not taken by the entry's first note lapses. D509: the boost is one of three effects on the
 * player's own voice, drawn at each offer (an octave doubling, a tape echo, a chorus with a vibrato); D485's
 * second instrument (D439's merged layer) and D439's colours by instrument are gone.
 *
 * This file is pure (no sound, no screen): the offer's window and its test, the entries a boost covers
 * (the stretto rule), the effects and their draw, the instruments' compasses (LAYERS: the octave's room).
 * proto-game.ts runs it; chip.ts sounds the effects (Chip.voiceFx; the octave is an ordinary note of the
 * player's own patch).
 *
 * D485 retires D482 (the sound takes no input from the score) for this feature: an offer is gated by how
 * the player played. The main instrument's level is never changed by it; scoring and judging are unchanged.
 */
import { PATCHES, PRESETS, type PatchId, type Patch } from "../touch/sound.ts";
import { SAMPLED, sampledMidis } from "../touch/sampled.ts";
import type { Sounding } from "../touch/chip.ts";
import { tr } from "../i18n/index.ts";

/** The boost's name, in one place (the button reads `${OBBLIGATO} · TAPE ECHO`: obbligatoLabel translates the effect). */
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

/** An instrument's family. */
export type Family = "keys" | "strings" | "voice" | "console" | "chip" | "synth";
/** A voice's register (by the entry's mean pitch). */
export type Register = "soprano" | "alto" | "tenor" | "bass";

export interface Layer {
  /** The patch played (null: the classic chip's pulse). */
  id: PatchId | "chip";
  /** Its name on the button (English; tr() gives pt and es). */
  name: string;
  family: Family;
  /** The registers it doubles naturally (where it belongs). */
  regs: readonly Register[];
  /** The lowest and highest MIDI it plays (a recording's own compass where it has one). */
  lo: number;
  hi: number;
}


const ALL: readonly Register[] = ["soprano", "alto", "tenor", "bass"];
type Row = [id: Layer["id"], name: string, family: Family, regs: readonly Register[], lo?: number, hi?: number];
/** Every instrument the offered sounds play (PRESETS), each once. Ranges of synthesized patches by their role. */
const ROWS: readonly Row[] = [
  // Recorded, real instruments.
  ["consViolin", "VIOLIN", "strings", ["soprano", "alto"]],
  ["consViola", "VIOLA", "strings", ["alto", "tenor"]],
  ["consCello", "CELLO", "strings", ["tenor", "bass"]],
  // D438: the instruments session's BAROQUE BAND (D430), its own patches (the oboe with its strings: the band's family).
  ["bandViolin", "BAROQUE VIOLIN", "strings", ["soprano", "alto"]],
  ["bandOboe", "OBOE", "strings", ["soprano", "alto"]],
  ["bandViola", "BAROQUE VIOLA", "strings", ["alto", "tenor"]],
  ["bandCello", "BAROQUE CELLO", "strings", ["tenor", "bass"]],
  // D504: ZELENKA TRIO's own (the reeds with the strings' family, as the band's oboe; the harpsichord the keyboard's).
  ["trioOboe1", "OBOE I", "strings", ["soprano", "alto"]],
  ["trioOboe2", "OBOE II", "strings", ["soprano", "alto"]],
  ["trioBassoon", "BASSOON", "strings", ["tenor", "bass"]],
  ["trioCello", "CONTINUO CELLO", "strings", ["tenor", "bass"]],
  ["trioHarpsi", "CONTINUO HARPSICHORD", "keys", ALL],
  // D502: BACH BRASS's recorded brass (the orchestra's real instruments: the strings' family).
  ["bachTrumpet", "TRUMPET", "strings", ["soprano", "alto"]],
  ["bachHorn", "HORN", "strings", ["alto", "tenor"]],
  ["bachTrombone", "TROMBONE", "strings", ["tenor", "bass"]],
  ["bachBass", "BASS TROMBONE", "strings", ["bass"]],
  // D503: JAZZ QUARTET's (the vibraphone C3-F6 recorded, the bass pizzicato E1-G4).
  ["jqVibes", "VIBRAPHONE", "keys", ["soprano", "alto"], 48, 89],
  ["jqPiano", "JAZZ PIANO", "keys", ALL],
  ["jqBass", "DOUBLE BASS", "strings", ["bass"], 28, 70],
  ["singS", "SOPRANO VOICE", "voice", ["soprano"]],
  ["singS2", "MEZZO VOICE", "voice", ["soprano", "alto"]],
  ["singA", "ALTO VOICE", "voice", ["alto"]],
  ["singT", "TENOR VOICE", "voice", ["tenor"]],
  ["singB", "BASS VOICE", "voice", ["bass"]],
  ["pianoSampled", "PIANO", "keys", ALL],
  ["harpsiSampled", "HARPSICHORD", "keys", ALL],
  ["lute2", "LUTE", "keys", ["alto", "tenor"]],
  // D501: CLAVICHORD, offered (synthesized: no recording to wait for).
  ["clavichord", "CLAVICHORD", "keys", ALL],
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

/** Every instrument the game's sounds play, with its compass (D509: the octave's room). */
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

// ---------- D509: how the boost sounds (three effects on the player's own voice) ----------

/**
 * D509, the owner on D439/D501's layer and effect modes: "OBBLIGATO's effects on sound are disappointing and
 * dumb … one possibility would be that it octaves the player's voice during the subject entrance … another
 * adds a bit of delay … that sounds analog and cool but will not dominate … a flanger … a vibrato". Both modes
 * (the second instrument, the six colours by instrument) gone; each offer draws one of three effects, all on
 * the player's own voice over the player's own entry, ramped in and out with it (chip.ts VOICE_FX_RAMP), the
 * whole as loud as the voice without it (chip.ts VOICE_FX's trims, measured on the renders):
 * - "octave": the player's own notes doubled an octave away on the player's own instrument (the same patch,
 *   envelope, touch and room: the same Play), OCTAVE_DB under each note; up for a low voice, down for a high
 *   one (octaveShift), the other way where that would leave the instrument's compass, none where both would.
 * - "tape": a tape echo a dotted eighth late at the tempo there (TAPE_QUARTERS), low feedback, band-limited
 *   and a little saturated, its delay swaying (wow and flutter: a slow, slight pitch drift of the echoes).
 * - "chorus": a gentle chorus-flanger on the voice, and a gentle vibrato (VIBRATO_HZ) on a sustaining sound;
 *   on a plucked or struck one only the faintest wobble (vibratoCents).
 * The trigger (the window, playedWell, the stretto rule, the button) is D485's, unchanged.
 */
export type ObbFx = "octave" | "tape" | "chorus";
export const OBB_FX: readonly ObbFx[] = ["octave", "tape", "chorus"];
/** The effects' names on the button (tr() gives pt and es: obbligatoLabel). */
export const FX_NAMES: Readonly<Record<ObbFx, string>> = { octave: "OCTAVE", tape: "TAPE ECHO", chorus: "CHORUS" };
/** The draw's odds: even (an effect not open to the entry, the octave out of compass, its share to the others). */
export const FX_ODDS: Readonly<Record<ObbFx, number>> = { octave: 1, tape: 1, chorus: 1 };
/** The octave's level under each note it doubles (dB of the note's own level). */
export const OCTAVE_DB = -9;
export const OCTAVE_LEVEL = 10 ** (OCTAVE_DB / 20);
/** The tape echo's delay in quarter notes: a dotted eighth. */
export const TAPE_QUARTERS = 0.75;
/** The vibrato's rate (Hz) and depth (cents, peak): a sustaining sound's, and a plucked or struck one's faint wobble. */
export const VIBRATO_HZ = 5.2;
export const VIBRATO_CENTS = { sustained: 12, struck: 3 } as const;
/** No octave below this MIDI (a phone's speaker gives nothing there; the bass stays clear). */
export const LAYER_FLOOR = 36;

/** The main instrument's kind (its envelope: struck or plucked, bowed, blown, sung, a chip's or a synth's). */
export type MainKind = "piano" | "harpsichord" | "organ" | "strings" | "voice" | "chip" | "synth";
export function mainKind(id: PatchId | null, pt: Patch | null): MainKind {
  if (!pt) return "chip";
  if (id === "pianoSampled") return "piano";
  // D501: the clavichord a struck keyboard that dies away, as the harpsichord and the lute.
  if (id === "harpsiSampled" || id === "lute2" || id === "clavichord") return "harpsichord";
  if (pt.pipe || (id && id.startsWith("org"))) return "organ";
  if (id && (id.startsWith("voc") || id === "tomChoir")) return "voice";
  const fam = familyOf(id);
  if (fam === "strings") return "strings";
  if (fam === "voice") return "voice";
  if (fam === "chip" || fam === "console") return "chip";
  return "synth";
}

/** The player's sound dies away by itself (plucked or struck: a recording's own, or a patch with no sustain). */
export function struck(id: PatchId | null): boolean {
  const pt = id ? PATCHES[id] : null;
  if (!pt) return false;
  const k = mainKind(id, pt);
  if (k === "piano" || k === "harpsichord") return true;
  if (pt.sample) return SAMPLED[pt.sample].plucked;
  return pt.amp.s === 0;
}

/** The vibrato's depth (cents) on the player's instrument: a sustaining sound's, or a struck one's faint wobble. */
export function vibratoCents(id: PatchId | null): number {
  return struck(id) ? VIBRATO_CENTS.struck : VIBRATO_CENTS.sustained;
}

/** The player's instrument's compass (MIDI): its LAYERS row (a recording's own compass), else its recordings', else the chip's. */
export function compassOf(id: PatchId | null): [number, number] {
  const row = LAYERS.find((l) => l.id === (id ?? "chip"));
  return row ? [row.lo, row.hi] : compass(id ?? "chip");
}

/** The octave for an entry's notes on the player's instrument: up (+1) for a low voice, down (-1) for a high one; the other way where that leaves the compass; null where both do. */
export function octaveShift(id: PatchId | null, midis: readonly number[]): 1 | -1 | null {
  if (!midis.length) return null;
  const [lo, hi] = compassOf(id);
  const a = Math.min(...midis);
  const b = Math.max(...midis);
  const reg = registerOf(midis);
  const prefer: (1 | -1)[] = reg === "tenor" || reg === "bass" ? [1, -1] : [-1, 1];
  return prefer.find((k) => a + 12 * k >= Math.max(lo, LAYER_FLOOR) && b + 12 * k <= hi) ?? null;
}

/** A weighted pick (`rnd` in [0, 1)). */
function pick<T>(items: readonly T[], weight: (t: T) => number, rnd: number): T | null {
  const total = items.reduce((a, t) => a + weight(t), 0);
  if (!(total > 0)) return null;
  let x = rnd * total;
  for (const t of items) if ((x -= weight(t)) < 0) return t;
  return items[items.length - 1];
}

/** An effect drawn for an entry: which, the octave's direction (0 for the others), the vibrato's depth (cents; the chorus's only), the player's sound plucked or struck (the chorus's trim). */
export interface Effect {
  fx: ObbFx;
  shift: 0 | 1 | -1;
  vib: number;
  dies: boolean;
}

/** The effect offered for an entry of `midis` on the player's instrument `main` (FX_ODDS; the octave only where octaveShift allows). */
export function drawEffect(o: { main: PatchId | null; midis: readonly number[]; rng?: () => number }): Effect {
  const shift = octaveShift(o.main, o.midis);
  const fx = pick(OBB_FX, (k) => (k === "octave" && shift === null ? 0 : FX_ODDS[k]), (o.rng ?? Math.random)()) ?? "tape";
  return effectOf(fx, o.main, o.midis) ?? { fx: "tape", shift: 0, vib: 0, dies: struck(o.main) };
}

/** The effect `fx` on an entry of `midis` on `main` (null: the octave, where it has no room). */
export function effectOf(fx: ObbFx, main: PatchId | null, midis: readonly number[]): Effect | null {
  if (fx === "octave") {
    const shift = octaveShift(main, midis);
    return shift === null ? null : { fx, shift, vib: 0, dies: struck(main) };
  }
  return { fx, shift: 0, vib: fx === "chorus" ? vibratoCents(main) : 0, dies: struck(main) };
}

/** The offer's stand-in "instrument" (the button's `layer`: its name the effect's; nothing else is played). */
export function shownFor(fx: ObbFx, main: PatchId | null): Layer {
  return { id: main ?? "chip", name: FX_NAMES[fx], family: familyOf(main), regs: [], lo: 0, hi: 127 };
}

/** The button's label for an offer (or a boost): the drawn effect's name in the language chosen ("OCTAVE", "TAPE ECHO", "CHORUS"). */
export function obbligatoLabel(o: { fx: ObbFx } | null | undefined): string {
  return o ? tr(FX_NAMES[o.fx]) : "";
}

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
