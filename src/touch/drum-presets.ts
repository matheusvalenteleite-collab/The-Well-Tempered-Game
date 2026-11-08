/**
 * D514, THREE DRUM PRESETS PER FUGUE. The friends' DRUMS (D344: a backing track under any sound, off by default, kept
 * on the device; never scored, never the streak, D482) now plays one of three drummers chosen for each piece, each of
 * its own character: ELECTRONIC (a console's noise channel, CHIP DRUMS, under the chip sounds; else an analog DRUM
 * MACHINE), ACOUSTIC (a kit: Karoryfer's Swirly Drums brushes, JAZZ BRUSHES, for the slowest fugues and JAZZ
 * QUARTET's own, D503; sticks on the ride of the Virtuosity Drums club kit, JAZZ KIT, at a walking beat; Big Rusty
 * Drums' ROCK KIT at a quick one), PERCUSSION (VSCO-2's TIMPANI tuned to the music's key, with the club kit's bass
 * drum, cymbal and triangle, for the stately and the church sounds; FRAME DRUMS, the club kit's congas, bongo,
 * tambourine and shaker, for the dances: the compound metres, the quick triples). All CC0 (public/samples/LICENSES.txt).
 * The three are ordered for the fugue: first the one that suits its default sound (piece-sound.ts), which is the
 * default (the selection screen's DRUMS button, src/bench/LiteDrums.tsx, keeps the choice per piece and calls
 * setDrumPreset on choosing a piece and on cycling; on/off stays liteDrums()/setLiteDrums(), sound.ts setBacking).
 *
 * THE DRUMMING (kitBeat, pure numbers; chip.ts Chip.kit sounds it): a pattern by metre (the backbeat as jazz-drums.ts
 * backbeats: 4/4 beats 2 and 4, 3/4 2 and 3, 2/2 and 6/8 2) and tempo (the beat's subdivisions: in threes in a
 * compound metre; eighths at a slow beat, the beat alone at a quick one, so the strokes are never closer than about
 * 0.18 s), on the game's own beat (the final ritard followed; no tempo of the piece changes). It reads the fugue's
 * FORM (fugue-form.ts, D513: the subject zones, the episodes, the climax, from the piece's entries): fuller in the
 * subject zones (the ride, the snare), sparser and softer in the episodes (the hats, a cross-stick, the shaker), the
 * most in the climax (the ride or the crash, the kick on more beats); a ROLL into each subject zone after an episode
 * (a crescendo over ROLL_BEATS, landing with a crash or a cymbal on the entry), a ROLL OUT into each episode (a few
 * strokes falling away), a BREAK (a bar of silence) before the final entry, a FLOURISH into the final cadence (a fill
 * over the last bar's approach, the final downbeat struck, the timpani's roll under the final chord). Busoni's level
 * leads (the voices' mean at the beat, as D503's brushes: ±4 dB at most); the whole-fugue arc a little under it.
 * Where a fugue's contrast is not clear (fugue-form.ts clearContrast) the drummer keeps the subject's pattern
 * throughout, with the climax, the break where an episode precedes the final entry, and the flourish.
 *
 * JAZZ QUARTET (D503) keeps its own brushes as its built-in drums (its band always plays them); with DRUMS on, the
 * chosen preset takes their place (never two drummers), and on its two fugues (I/19, II/12) the first preset is
 * those very brushes with D503's scripted fills.
 */
import { fugueById, keyAt, beatOf, type TouchFugue } from "./fugue.ts";
import { climaxRamp, resolvedAt, formAt, formOf, type FormKind, type FugueForm } from "./fugue-form.ts";
import { backbeats, DRUM_SCRIPTS, dynGain, fillsFor, type Fill } from "./jazz-drums.ts";
import { PIECE_SOUND } from "./piece-sound.ts";
import { GRIDS, gridBeat, type FillVoice } from "./drum-grids.ts";
import { tempoOf } from "./tempi.ts";
import { FILL_STROKE_S, JITTER_S, fillPlan, fillSlice, rand, seedOf, styleSalt, type FillFeel, type FillSpec, type PlannedFill } from "./drum-fills.ts";

export type DrumCharacter = "electronic" | "acoustic" | "percussion";
/** The drummer's own sound and way: two of each character, one chosen for each fugue. */
export type DrumStyle = "chip" | "machine" | "brushes" | "jazz" | "rock" | "timpani" | "frame";
/** The API shared with the selection screen (src/bench/LiteDrums.tsx registerDrumPresets): id, the name shown (≤ 10), its character. */
export interface DrumPreset {
  /** Stable across pieces: "electronic", "acoustic", "percussion". */
  id: DrumCharacter;
  /** Short caps (≤ 10 characters), shown as given. */
  name: string;
  character: DrumCharacter;
  style: DrumStyle;
}

/** The names, shown as given in every language (short caps, ≤ 10: they read in English, Portuguese and Spanish). */
export const STYLE_NAMES: Readonly<Record<DrumStyle, string>> = {
  chip: "CHIP KIT",
  machine: "ELECTRO",
  brushes: "BRUSHES",
  jazz: "JAZZ KIT",
  rock: "ROCK KIT",
  timpani: "TIMPANI",
  frame: "FRAME DRUM",
};
export const CHARACTERS: readonly DrumCharacter[] = ["electronic", "acoustic", "percussion"];

/** The sounds after a console or a computer: their drums the console's own noise channel. */
export const CONSOLE_SOUNDS: ReadonlySet<string> = new Set(["chip", "gameboy", "super16", "nocturne32", "megaFm", "sid64", "tracker"]);
/** The synthesizers: an analog drum machine first. */
export const SYNTH_SOUNDS: ReadonlySet<string> = new Set(["analog", "tomita", "vocalSynth"]);
/** The church's, the court's and the chamber's sounds: the timpani (or the frame drums) first. */
export const PERCUSSION_FIRST: ReadonlySet<string> = new Set(["harpsichordSampled", "chamberOrgan", "organSampled", "clavichord", "lute", "traverso", "soloVoices", "stringConsort", "baroqueBand", "oboeTrio", "bachBrass", "trialWinds"]);

/** The beat (s) from which the acoustic kit is brushes (a largo), and under which sticks rock (a quick beat). */
export const BRUSH_BEAT_S = 1.3;
export const ROCK_BEAT_S = 0.85;
/** Under this beat (s) a triple metre is a dance (FRAME DRUMS, not the timpani). */
export const DANCE_BEAT_S = 0.9;

/** What a piece is to the drummer: its metre's beat and its length at the game's tempo, its metre, its default sound. */
interface PieceFacts {
  beatS: number;
  per: number;
  compound: boolean;
  sound: string;
}
function factsOf(id: string): PieceFacts {
  const f = fugueById(id);
  const known = f.id === id;
  const b = known ? beatOf(f) : { ticks: 480, perBar: 4 };
  const tpq = known ? f.tpq : 480;
  const den = known ? Number(f.meter.split("/")[1]) : 4;
  return {
    beatS: (b.ticks / tpq) * (60 / tempoOf(id)),
    per: b.perBar,
    compound: b.ticks !== tpq * (4 / den),
    sound: PIECE_SOUND[id] ?? "chip",
  };
}

/** The style of each character for a piece. */
export function stylesFor(id: string): Readonly<Record<DrumCharacter, DrumStyle>> {
  const p = factsOf(id);
  const electronic: DrumStyle = CONSOLE_SOUNDS.has(p.sound) ? "chip" : "machine";
  const acoustic: DrumStyle = p.sound === "jazzQuartet" || DRUM_SCRIPTS[id] || p.beatS >= BRUSH_BEAT_S ? "brushes" : p.beatS < ROCK_BEAT_S && !p.compound ? "rock" : "jazz";
  const dance = p.compound || (p.per === 3 && p.beatS < DANCE_BEAT_S) || p.beatS < 0.6;
  const percussion: DrumStyle = dance ? "frame" : "timpani";
  return { electronic, acoustic, percussion };
}

/** The character that suits a piece's default sound (the first of its three). */
export function firstCharacter(id: string): DrumCharacter {
  const s = factsOf(id).sound;
  if (s === "jazzQuartet" || s === "pianoSampled") return "acoustic";
  if (CONSOLE_SOUNDS.has(s) || SYNTH_SOUNDS.has(s)) return "electronic";
  if (PERCUSSION_FIRST.has(s)) return "percussion";
  return "acoustic";
}

/** D514's three presets of a piece (legacy: D526's drum-library.ts drumMenuFor replaces them on the DRUMS row). */
export function legacyPresetsFor(pieceId: string): readonly [DrumPreset, DrumPreset, DrumPreset] {
  const st = stylesFor(pieceId);
  const first = firstCharacter(pieceId);
  const order = [first, ...CHARACTERS.filter((c) => c !== first)] as [DrumCharacter, DrumCharacter, DrumCharacter];
  const mk = (c: DrumCharacter): DrumPreset => ({ id: c, name: STYLE_NAMES[st[c]], character: c, style: st[c] });
  return [mk(order[0]), mk(order[1]), mk(order[2])];
}
export const isCharacter = (s: unknown): s is DrumCharacter => s === "electronic" || s === "acoustic" || s === "percussion";

// ---------------------------------------------------------------------------------------------------------------
// The drumming.

/** The pieces a drummer strikes (chip.ts Chip.kit: the recordings of KIT_PIECES, or the synthesized kit). */
export type KitPiece = "kick" | "snare" | "rim" | "hat" | "openhat" | "crash" | "ride" | "tomHigh" | "tomLow" | "clap" | "tamb" | "shaker" | "congaHigh" | "congaLow" | "bongo" | "triangle" | "bassDrum" | "timp"
  // D532: the period kit's (score-drums.ts): the side drum, the field drum, the tabor, a stick on the rim, the frame drums' dum and tek, the castanets, the clash cymbals.
  | "sideDrum" | "fieldDrum" | "tabor" | "drumStick" | "frameDum" | "frameTek" | "castanets" | "cymbals";
export interface KitHit {
  piece: KitPiece;
  /** Beats from the beat's start. */
  at: number;
  /** 0-1. */
  vel: number;
  /** The timpani's pitch (MIDI). */
  midi?: number;
  /** D526: a stroke of a roll (into an entry), of a fill (into the climax, the flourish, a roll out), or a landing's accent. */
  role?: "roll" | "fill" | "accent";
  /** D535: a roll's or a fill's stroke: the ticks from it to the landing (the studio's music events: a roll carries its length). */
  dur?: number;
  /** D535: a flam's or a ruff's grace note (closer to its stroke than a roll's strokes are to each other). */
  grace?: boolean;
  /** D532: the fugue's tick the stroke belongs to (a score-driven stroke; a flam's grace sounds a few ms before it). */
  tick?: number;
}
/** What the game tells the drummer about a beat (chip.ts GrooveContext's, read through the fugue). */
export interface KitContext {
  b: number;
  per: number;
  compound: boolean;
  /** The beat's length as it sounds (s; the final ritard in it). */
  beatS: number;
  tick: number;
  /** The beat (ticks). */
  beat: number;
  form: FugueForm;
  /** Busoni's level here (dB, the voices' mean; 0 without his reading). */
  dynDb?: number;
  /** The key sounding at a tick ("b", "F#"), for the timpani. */
  keyAt?: (tick: number) => string;
  /** The fugue's home key: the timpani are tuned to its tonic and dominant (else the key sounding at the tick). */
  home?: string;
}

/** The roll into a subject zone: this many beats (two at a quick beat), the closest strokes this far apart (s). */
export const ROLL_BEATS = { slow: 1, quick: 2 } as const;
export const ROLL_QUICK_S = 0.8;
export const ROLL_STROKE_S = 0.09;
/** The strokes closest in a pattern (s). */
export const PATTERN_STROKE_S = 0.18;
/** The velocity by the form: episodes this share of the subject's, the climax this; the arc from ARC_VEL to 1 by 60% of the piece. */
export const EPISODE_VEL = 0.55;
export const CLIMAX_VEL = 1.12;
export const ARC_VEL = 0.82;
/** The climax's build past this (climaxRamp), its busier pattern (the ride or the crash, the kick on more beats). */
export const CLIMAX_PATTERN_AT = 0.5;
/** How far a coda's pattern falls once the last cadence is reached (resolved 1). */
export const RESOLVE_FALL = 0.4;

/** The subdivisions a pattern's lighter strokes take in a beat. */
export function patternSubs(beatS: number, compound: boolean): number {
  if (compound) return beatS / 3 >= PATTERN_STROKE_S ? 3 : 1;
  if (beatS / 2 >= PATTERN_STROKE_S) return 2;
  return 1;
}

/** The form as the drummer reads it: the zones only where the contrast is clear, else the subject's throughout. */
function drumKind(form: FugueForm, tick: number): FormKind {
  const at = formAt(form, tick);
  if (at.kind === "climax") return "climax";
  return form.clear ? at.kind : "subject";
}
/** The ticks where a roll lands (a subject zone after an episode; the climax) and where a roll out lands (an episode). */
function landings(form: FugueForm): { into: number[]; out: number[] } {
  const into = new Set<number>();
  const out: number[] = [];
  if (form.clear) {
    form.zones.forEach((z, i) => {
      if (i === 0 || z.from >= form.climax) return;
      if (z.kind === "subject") into.add(z.from);
      else out.push(z.from);
    });
  }
  // Into the final entry (the climax's build under way: form-points' final group).
  if (form.finalEntry > 0 && form.finalEntry < form.lastBar) into.add(form.finalEntry);
  return { into: [...into].sort((a, b) => a - b), out };
}
/** Whether an episode (of a bar and a half or more) precedes the final entry: the drums break before it. */
export function breaksBefore(form: FugueForm): boolean {
  if (form.finalEntry <= 0) return false;
  const i = form.zones.findIndex((z) => z.from === form.finalEntry);
  return i > 0 && form.zones[i - 1].kind === "episode";
}

/** The timpani's tonic for a key (MIDI, within F2-E3) and its dominant (a fifth up, or a fourth down above F2). */
export function timpaniPitches(key: string): { tonic: number; dominant: number } {
  const pcs: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const k = key.toLowerCase();
  let pc = pcs[k[0]] ?? 0;
  if (k.includes("#")) pc += 1;
  if (k.length > 1 && k[1] === "b") pc -= 1;
  pc = ((pc % 12) + 12) % 12;
  // F2 (41) to E3 (52).
  const tonic = 41 + ((pc - 5 + 12) % 12);
  const dominant = tonic + 7 <= 55 ? tonic + 7 : tonic - 5;
  return { tonic, dominant };
}

/**
 * One beat of a drummer (not the brushes: brushesContext gives D503's engine its fills and level). The hits are
 * computed sub by sub, each by where its tick falls: the final bar's flourish, the break, a roll in or out, or the
 * zone's pattern.
 */
/** A style kitBeat plays: D514's own (rock, chip, timpani, frame) or a written one (drum-grids.ts GRIDS). */
export type KitStyle = string;
/** The fills' voice of a style (D514's styles their own). */
export const fillVoiceOf = (style: KitStyle): FillVoice => GRIDS[style]?.fill ?? (style as FillVoice);
export function kitBeat(style: KitStyle, cx: KitContext): KitHit[] {
  const hits = kitBeatRaw(style, cx);
  if (style !== "timpani" || timpaniTuned(cx.home ?? cx.keyAt?.(cx.tick) ?? "c", cx.keyAt ? cx.keyAt(cx.tick) : (cx.home ?? "c"))) return hits;
  // Away from the home key's harmony the timpani are silent as pitches: the bass drum takes their strokes (unpitched).
  return hits.map((h) => (h.piece === "timp" ? { piece: "bassDrum" as const, at: h.at, vel: h.vel * TIMP_AWAY_VEL } : h));
}
/** The bass drum's share of a timpani stroke it takes away from the home key. */
export const TIMP_AWAY_VEL = 0.8;
/**
 * Whether the timpani, tuned to the home key's tonic and dominant (as Bach's were: two drums, set for the piece), can
 * play under the key sounding: the home key, its dominant's key, its subdominant's (where the home tonic is the dominant).
 */
export function timpaniTuned(home: string, local: string): boolean {
  const h = timpaniPitches(home);
  const l = timpaniPitches(local);
  const pc = (m: number) => m % 12;
  return pc(l.tonic) === pc(h.tonic) || pc(l.tonic) === pc(h.dominant) || pc(l.dominant) === pc(h.tonic);
}
function kitBeatRaw(pattern: KitStyle, cx: KitContext): KitHit[] {
  const voice = fillVoiceOf(pattern);
  // D535: the drummers' fills humanised (drum-fills.ts); the orchestral ones (timpani, frame drums: S3's) as D514 wrote them.
  return voice === "timpani" || voice === "frame" ? kitBeatOrchestral(pattern, cx) : kitBeatFills(pattern, voice, cx);
}

/** D535: the fill's feel of a fills' voice. */
const FEEL: Partial<Record<FillVoice, FillFeel>> = { rock: "rock", jazz: "jazz", chip: "chip", machine: "machine", latin: "latin" };
/** D535: the fills' level (the contour's first and last strokes): into an entry, into the climax and the last bar. */
/** D535: the most beats the final entry's fill takes after the break. */
export const BREAK_FILL_BEATS = 3;
export const FILL_LEVEL = { in: [0.26, 0.64], big: [0.32, 0.86] } as const;
const planMemo = new Map<string, PlannedFill[]>();
/** D535: the fills a piece's drummer plays (drum-fills.ts fillPlan): which landings, how long, which fill. */
export function kitFillPlan(pattern: KitStyle, form: FugueForm, beat: number, beatS: number, per: number): PlannedFill[] {
  const feel = FEEL[fillVoiceOf(pattern)] ?? "rock";
  const key = `${pattern}:${form.end}:${form.lastBar}:${form.climax}:${form.finalEntry}:${beat}:${beatS.toFixed(3)}:${per}:${form.zones.length}`;
  const hit = planMemo.get(key);
  if (hit) return hit;
  const L = landings(form);
  // After the break the final entry's fill is short (at most the bar, or BREAK_FILL_BEATS), the silence heard.
  const brk = breaksBefore(form);
  const plan = fillPlan(feel, L.into, form.lastBar, (at) => at >= form.climax || at === form.finalEntry, beat, form.barTicks, beatS, per, styleSalt(pattern), (at) => (brk && at === form.finalEntry ? Math.min(per, BREAK_FILL_BEATS) : Infinity));
  if (planMemo.size > 256) planMemo.clear();
  planMemo.set(key, plan);
  return plan;
}

/** D535: a beat of a drummer whose fills are humanised: the plan's fills, the landings, the break, the roll out, the pattern. */
function kitBeatFills(pattern: KitStyle, style: FillVoice, cx: KitContext): KitHit[] {
  const { beatS, tick, beat, form } = cx;
  const feel = FEEL[style] ?? "rock";
  const out: KitHit[] = [];
  const g = dynGain(cx.dynDb ?? 0);
  const arc = ARC_VEL + (1 - ARC_VEL) * Math.min(1, tick / Math.max(1, 0.6 * form.end));
  const pitches = timpaniPitches(cx.home ?? (cx.keyAt ? cx.keyAt(tick) : "c"));
  const L = landings(form);
  const plan = kitFillPlan(pattern, form, beat, beatS, cx.per);
  const hit = (piece: KitPiece, at: number, vel: number) => out.push({ piece, at, vel: Math.max(0.02, Math.min(1, vel)) });
  const end = tick + beat;
  const spec = (p: PlannedFill): FillSpec => {
    const [lo, hi] = p.kind === "in" ? FILL_LEVEL.in : FILL_LEVEL.big;
    return { feel, variant: p.variant, beats: p.beats, beatS, compound: cx.compound, lo: lo * g, hi: hi * g, seed: seedOf(p.at, styleSalt(pattern)) };
  };
  const landOn = landPieces(style);
  const strokes = (p: PlannedFill, stop: number): KitHit[] => {
    const role = p.kind === "in" ? ("roll" as const) : ("fill" as const);
    return fillSlice(spec(p), p.from, beat, tick, stop, landOn).map((h): KitHit => ({ piece: h.piece, at: h.t, vel: Math.max(0.02, Math.min(1, h.vel)), role, dur: Math.max(0, p.at - (tick + h.t * beat)), ...(h.grace ? { grace: true } : {}) }));
  };

  // THE LAST BAR: its downbeat struck (the kick, the crash, the snare), then nothing.
  if (tick >= form.lastBar - beat / 2) {
    if (Math.abs(tick - form.lastBar) < beat / 2) {
      const v = 0.95 * g;
      if (style === "latin") hit("congaLow", 0, v), hit("tamb", 0, 0.8 * g), hit("crash", 0, 0.4 * g);
      else hit("kick", 0, v), hit("crash", 0, 0.8 * g), style !== "jazz" && hit("snare", 0, 0.6 * g);
      for (const h of out) h.role = "accent";
    }
    return out;
  }
  const flourish = plan.find((p) => p.kind === "flourish");
  if (flourish && tick >= flourish.from - beat / 2 - 1e-6 && tick + beat > flourish.from) return strokes(flourish, flourish.at);

  // THE BREAK: a bar's silence before the final entry's fill (only where an episode precedes it).
  if (breaksBefore(form)) {
    const fin = plan.find((p) => p.at === form.finalEntry);
    const bEnd = fin && fin.filled ? fin.from : form.finalEntry - beat;
    const bFrom = bEnd - form.barTicks;
    if (tick >= bFrom - beat / 2 && tick < bEnd - beat / 2) return out;
  }

  // A FILL INTO an entry (or the climax), as planned; its landing on the entry. An entry left unfilled: its landing alone.
  for (const p of plan) {
    if (p.kind === "flourish") continue;
    const big = p.kind === "climax";
    // The landing's beat: the one the entry falls in.
    if (p.at >= tick - 1e-6 && p.at < end - 1e-6) {
      const cut = (p.at - tick) / beat;
      const land = landHits(style, cut, g, pitches, big).map((h): KitHit => ({ ...h, role: "accent" }));
      if (cut < 1e-6) return land.concat(patternHits(pattern, cx, drumKind(form, p.at), g, arc, pitches).filter((h) => h.at > 0.02));
      const before = p.filled ? strokes(p, p.at) : patternHits(pattern, cx, drumKind(form, tick), g, arc, pitches).filter((h) => h.at < cut - FILL_STROKE_S / beatS);
      return before.concat(land);
    }
    if (p.filled && tick + beat > p.from + 1e-6 && tick < p.at) {
      const s = strokes(p, p.at);
      // The fill begun inside this beat: the pattern before it.
      const start = (p.from - tick) / beat;
      if (start > 0) return patternHits(pattern, cx, drumKind(form, tick), g, arc, pitches).filter((h) => h.at < start - FILL_STROKE_S / beatS).concat(s);
      return s;
    }
  }

  // A ROLL OUT into an episode: a few strokes falling away over the beat before it, the episode's pattern after.
  for (const at of L.out) {
    if (tick >= at - beat - beat / 2 && tick < at - beat / 2) return outFill(style, beatS, g * arc, seedOf(at, styleSalt(pattern))).map((h) => ({ ...h, role: "fill" as const, dur: Math.max(0, at - tick - h.at * beat) }));
  }

  return patternHits(pattern, cx, drumKind(form, tick), g, arc, pitches);
}

/**
 * D535: the roll out, humanised: two or three strokes falling away over the beat, which drums and how they fall drawn
 * (seeded) from a few, the levels uneven, the strokes a little off the grid (not the machines').
 */
const OUT_FALLS: Readonly<Record<"kit" | "latin", readonly KitPiece[][]>> = {
  kit: [
    ["tomHigh", "tomLow", "tomLow"],
    ["snare", "tomHigh", "tomLow"],
    ["tomHigh", "tomHigh", "tomLow"],
    ["snare", "tomLow", "tomLow"],
  ],
  latin: [
    ["congaHigh", "congaHigh", "congaLow"],
    ["bongo", "congaHigh", "congaLow"],
    ["congaHigh", "bongo", "congaLow"],
  ],
};
function outFill(style: FillVoice, beatS: number, g: number, seed: number): KitHit[] {
  const n = Math.min(3, Math.max(2, Math.floor(beatS / PATTERN_STROKE_S)));
  const falls = OUT_FALLS[style === "latin" ? "latin" : "kit"];
  const fall = falls[Math.floor(rand(seed, 11) * falls.length)];
  const feel = FEEL[style] ?? "rock";
  const jit = JITTER_S[feel] / beatS;
  const out: KitHit[] = [];
  for (let j = 0; j < n; j++) {
    const piece = j === n - 1 ? fall[2] : fall[j];
    const at = Math.max(0, Math.min(0.99, j / n + (j ? jit * (rand(seed, 12 + j) * 2 - 1) : 0)));
    out.push({ piece, at, vel: Math.max(0.03, g * (0.52 - 0.13 * j) * (1 + 0.1 * (rand(seed, 20 + j) - 0.5))) });
  }
  return out;
}

/** D535: the drums a landing strikes (the fill's strokes of these kept clear of it). */
function landPieces(style: FillVoice): KitPiece[] {
  return style === "latin" || style === "frame" ? ["congaLow", "tamb"] : style === "timpani" ? ["timp", "crash", "bassDrum"] : ["kick", "crash"];
}

/** D514's beat, as written: the timpani's and the frame drums' (the orchestral styles: S3's to change). */
function kitBeatOrchestral(pattern: KitStyle, cx: KitContext): KitHit[] {
  const style = fillVoiceOf(pattern);
  const { per, beatS, tick, beat, form } = cx;
  const out: KitHit[] = [];
  const g = dynGain(cx.dynDb ?? 0);
  const arc = ARC_VEL + (1 - ARC_VEL) * Math.min(1, tick / Math.max(1, 0.6 * form.end));
  // The timpani on the HOME key's tonic and dominant only (rhythm, never a line: the owner, "Don't meddle with the MUSIC").
  const pitches = timpaniPitches(cx.home ?? (cx.keyAt ? cx.keyAt(tick) : "c"));
  const L = landings(form);
  const rollLen = (beatS < ROLL_QUICK_S ? ROLL_BEATS.quick : ROLL_BEATS.slow) * beat;
  const hit = (piece: KitPiece, at: number, vel: number, midi?: number) => out.push({ piece, at, vel: Math.max(0.02, Math.min(1, vel)), ...(midi !== undefined ? { midi } : {}) });
  const end = tick + beat;

  // THE FLOURISH: the approach to the last bar (a fill), its downbeat struck, the timpani's roll under the final chord.
  const fillFrom = form.lastBar - rollLen * (per >= 3 ? 2 : 1);
  if (tick >= form.lastBar - beat / 2) {
    if (Math.abs(tick - form.lastBar) < beat / 2) {
      const v = 0.95 * g;
      if (style === "timpani") hit("timp", 0, v, pitches.tonic), hit("bassDrum", 0, 0.8 * g), hit("crash", 0, 0.55 * g);
      else if (style === "frame") hit("congaLow", 0, v), hit("tamb", 0, 0.8 * g), hit("crash", 0, 0.4 * g);
      else hit("kick", 0, v), hit("crash", 0, 0.8 * g), style !== "jazz" && hit("snare", 0, 0.6 * g);
    }
    // The timpani hold the final chord with a soft roll, dying away over the bar.
    if (style === "timpani") {
      const k = (tick - form.lastBar) / Math.max(1, form.end - form.lastBar);
      const n = rollStrokes(beatS);
      for (let j = 1; j < n; j++) hit("timp", j / n, 0.32 * g * Math.max(0.15, 1 - k - j / n / per), pitches.tonic);
    }
    return out;
  }
  if (tick >= fillFrom - beat / 2) {
    const x = Math.max(0, Math.min(1, (tick - fillFrom) / Math.max(1, form.lastBar - fillFrom)));
    return fillStrokes(style, beatS, x, 1 / Math.max(1, Math.round((form.lastBar - fillFrom) / beat)), g, pitches, "flourish").map((h) => ({ ...h, role: "fill" as const }));
  }

  // THE BREAK: a bar's silence before the final entry's roll (only where an episode precedes it).
  if (breaksBefore(form)) {
    const bEnd = form.finalEntry - rollLen;
    const bFrom = bEnd - form.barTicks;
    if (tick >= bFrom - beat / 2 && tick < bEnd - beat / 2) return out;
  }

  // A ROLL INTO a subject zone (or the climax): crescendo strokes up to it, the landing struck on it.
  for (const at of L.into) {
    if (at <= tick - beat / 2 || at - rollLen >= end) continue;
    if (tick < at - beat / 2) {
      const from = at - rollLen;
      const x = Math.max(0, (tick - from) / rollLen);
      const strokes = fillStrokes(style, beatS, x, beat / rollLen, g, pitches, at >= form.climax ? "climax" : "in");
      // The strokes after the landing's tick (an entry off the beat) are left out.
      const cut = (at - tick) / beat;
      // And those before the roll's start (an entry off the beat: the roll begins in the beat).
      const start = (from - tick) / beat;
      const role = at >= form.climax ? ("fill" as const) : ("roll" as const);
      return strokes
        .filter((h) => h.at < cut - (ROLL_STROKE_S * 0.999) / beatS && h.at >= start - 0.02)
        .map((h): KitHit => ({ ...h, role }))
        .concat(cut < 1 ? landHits(style, cut, g, pitches, at >= form.climax).map((h) => ({ ...h, role: "accent" as const })) : []);
    }
    // The landing beat: the landing, then the zone's pattern.
    if (Math.abs(tick - at) < beat / 2) {
      const pat = patternHits(pattern, cx, drumKind(form, at), g, arc, pitches).filter((h) => h.at > 0.02);
      return landHits(style, 0, g, pitches, at >= form.climax)
        .map((h): KitHit => ({ ...h, role: "accent" }))
        .concat(pat);
    }
  }

  // A ROLL OUT into an episode: a few strokes falling away over the beat before it, the episode's pattern after.
  for (const at of L.out) {
    if (tick >= at - beat - beat / 2 && tick < at - beat / 2) return outStrokes(style, beatS, g * arc, pitches).map((h) => ({ ...h, role: "fill" as const }));
  }

  return patternHits(pattern, cx, drumKind(form, tick), g, arc, pitches);
}

/** The strokes of a roll in a beat at a beat of `beatS` s (the closest ROLL_STROKE_S apart, at most 8). */
export const rollStrokes = (beatS: number) => Math.max(2, Math.min(8, Math.floor(beatS / ROLL_STROKE_S)));

/** A roll's strokes in one beat: x, how far into the roll it is (0-1); share, the beat's share of it. */
function fillStrokes(style: FillVoice, beatS: number, x: number, share: number, g: number, p: { tonic: number; dominant: number }, kind: "in" | "climax" | "flourish"): KitHit[] {
  const out: KitHit[] = [];
  const n = rollStrokes(beatS);
  const top = kind === "in" ? 0.62 : 0.85;
  const lv = (j: number) => g * (0.25 + (top - 0.25) * Math.min(1, x + (j / n) * share));
  for (let j = 0; j < n; j++) {
    const at = j / n;
    const v = lv(j);
    switch (style) {
      case "rock":
      case "jazz":
        // The snare's roll; in the flourish (and into the climax) down the toms in its second half.
        if ((kind !== "in" && x + (j / n) * share >= 0.5) || (kind === "flourish" && share >= 1)) out.push({ piece: j < n / 2 ? "tomHigh" : "tomLow", at, vel: v });
        else out.push({ piece: "snare", at, vel: v * (j % 2 ? 0.8 : 1) });
        if (j === 0 && kind !== "in") out.push({ piece: "kick", at: 0, vel: v * 0.8 });
        break;
      case "chip":
      case "machine":
        out.push({ piece: kind === "flourish" && j >= n / 2 ? "tomLow" : "snare", at, vel: v });
        if (j === 0) out.push({ piece: "kick", at: 0, vel: v * 0.8 });
        break;
      case "timpani":
        // The timpani's roll on the dominant (single strokes, alternating hands), the bass drum's swell under the climax.
        out.push({ piece: "timp", at, vel: v * (j % 2 ? 0.85 : 1), midi: p.dominant });
        if (j === 0 && kind !== "in") out.push({ piece: "bassDrum", at: 0, vel: v * 0.5 });
        break;
      case "frame":
        // The tambourine shaken and the bongo's strokes, the conga under them.
        out.push({ piece: j % 2 ? "bongo" : "congaHigh", at, vel: v * 0.9 });
        if (j % 2 === 0) out.push({ piece: "tamb", at, vel: v * 0.6 });
        break;
    }
  }
  return out;
}

/** The landing of a roll (on the entry): a cymbal over the low drum; fuller into the climax. */
function landHits(style: FillVoice, at: number, g: number, p: { tonic: number }, climax: boolean): KitHit[] {
  const k = climax ? 1 : 0.8;
  switch (style) {
    case "rock":
    case "jazz":
    case "chip":
    case "machine":
      return [
        { piece: "kick", at, vel: 0.8 * k * g },
        { piece: "crash", at, vel: (style === "jazz" ? 0.5 : 0.6) * k * g },
      ];
    case "timpani":
      return [
        { piece: "timp", at, vel: 0.85 * k * g, midi: p.tonic },
        { piece: "crash", at, vel: 0.35 * k * g },
        ...(climax ? [{ piece: "bassDrum" as const, at, vel: 0.6 * g }] : []),
      ];
    case "frame":
    case "latin":
      return [
        { piece: "congaLow", at, vel: 0.85 * k * g },
        { piece: "tamb", at, vel: 0.6 * k * g },
      ];
  }
}

/** The roll out: three strokes falling away over the beat (the toms down, the timpani's dominant to tonic). */
function outStrokes(style: FillVoice, beatS: number, g: number, p: { tonic: number; dominant: number }): KitHit[] {
  const n = Math.min(3, Math.max(2, Math.floor(beatS / PATTERN_STROKE_S)));
  const out: KitHit[] = [];
  for (let j = 0; j < n; j++) {
    const at = j / n;
    const v = g * (0.5 - 0.12 * j);
    if (style === "timpani") out.push({ piece: "timp", at, vel: v, midi: j === n - 1 ? p.tonic : p.dominant });
    else if (style === "frame" || style === "latin") out.push({ piece: j === n - 1 ? "congaLow" : "congaHigh", at, vel: v });
    else out.push({ piece: j === 0 ? "tomHigh" : "tomLow", at, vel: v });
  }
  return out;
}

/** A beat of the zone's pattern. */
function patternHits(style: KitStyle, cx: KitContext, kind: FormKind, g: number, arc: number, p: { tonic: number; dominant: number }): KitHit[] {
  const { b, per, compound, beatS } = cx;
  const out: KitHit[] = [];
  const back = backbeats(per).includes(b);
  const mid = per === 4 && b === 2;
  const subs = patternSubs(beatS, compound);
  // The climax builds (fugue-form.ts climaxRamp: from two bars before the final group to the last entry).
  // A coda after the last cadence settles (phaseAt's resolved).
  const k = (kind === "episode" ? EPISODE_VEL : kind === "climax" ? (1 + (CLIMAX_VEL - 1) * climaxRamp(cx.form, cx.tick)) * (1 - RESOLVE_FALL * resolvedAt(cx.form, cx.tick)) : 1) * arc * g;
  const hit = (piece: KitPiece, at: number, vel: number, midi?: number) => out.push({ piece, at, vel: Math.max(0.02, Math.min(1, vel * k)), ...(midi !== undefined ? { midi } : {}) });
  const last = subs > 1 ? (subs - 1) / subs : 0;
  const ep = kind === "episode";
  // The climax's busier pattern once its build is past half (its level rises first).
  const top = kind === "climax" && climaxRamp(cx.form, cx.tick) >= CLIMAX_PATTERN_AT;
  // D527: a written style (drum-grids.ts): its grid for the metre, at the drummer's pulse for the tempo.
  const grid = GRIDS[style];
  if (grid) {
    const bar = Math.max(0, Math.floor((cx.tick - b * cx.beat) / Math.max(1, cx.form.barTicks) + 0.5));
    for (const h of gridBeat(grid, b, per, compound, beatS, bar, kind, top)) hit(h.piece, h.at, h.vel);
    return out;
  }
  switch (style) {
    case "rock":
      if (b === 0 || mid || (top && !back)) hit("kick", 0, b === 0 ? 0.75 : 0.6);
      if (ep) {
        if (back) hit("rim", 0, 0.5);
        hit("hat", 0, b === 0 ? 0.45 : 0.38);
      } else {
        if (back) hit("snare", 0, top ? 0.72 : 0.62);
        for (let s = 0; s < subs; s++) hit(top ? "ride" : "hat", s / subs, s ? 0.34 : 0.5);
        if (b === per - 1 && subs > 1 && (top || cx.tick % (2 * cx.form.barTicks) >= cx.form.barTicks)) hit("openhat", last, 0.38);
        if (per >= 3 && b === per - 1 && subs > 1) hit("kick", last, 0.45);
      }
      break;
    case "chip":
      if (b === 0 || mid || top) hit("kick", 0, b === 0 ? 0.75 : 0.6);
      if (back) hit(ep ? "rim" : "snare", 0, ep ? 0.42 : 0.6);
      if (ep) hit("hat", 0, 0.32);
      else for (let s = 0; s < subs; s++) hit("hat", s / subs, s ? 0.26 : 0.36);
      if (top && b === per - 1 && subs > 1) hit("openhat", last, 0.34);
      break;
    case "timpani":
      // The tonic on the bar, the dominant on its middle (4/4's third beat, 2/2's second); the episodes the bar alone,
      // the triangle's sparkle every other bar; the climax every beat, the bass drum under the bar.
      if (b === 0) hit("timp", 0, ep ? 0.42 : 0.62, p.tonic);
      else if (!ep && (mid || (per === 2 && b === 1) || (top && per !== 2))) hit("timp", 0, top ? 0.52 : 0.42, mid || per === 2 ? p.dominant : p.tonic);
      if (b === 0 && !ep) hit("bassDrum", 0, top ? 0.5 : 0.3);
      if (ep && b === 0 && cx.tick % (2 * cx.form.barTicks) < cx.form.barTicks) hit("triangle", 0, 0.4);
      if (!ep && back) hit("triangle", 0, 0.28);
      if (top && subs > 1 && b === per - 1) hit("timp", last, 0.4, p.dominant);
      break;
    case "frame":
      // The frame drum's dum on the bar (and the middle), its tek between, the tambourine on the backbeat, the shaker
      // in the subdivisions; the episodes the dum and the shaker alone.
      if (b === 0 || mid) hit("congaLow", 0, b === 0 ? 0.62 : 0.5);
      if (ep) {
        for (let s = 0; s < subs; s++) hit("shaker", s / subs, s ? 0.3 : 0.42);
      } else {
        if (b !== 0 && !mid) hit("congaHigh", 0, 0.42);
        if (subs > 1) hit("congaHigh", last, 0.3);
        if (back) hit("tamb", 0, top ? 0.6 : 0.48);
        for (let s = 0; s < subs; s++) hit("shaker", s / subs, s ? 0.26 : 0.34);
        if (top) hit("bongo", subs > 1 ? 1 / subs : 0.5, 0.36);
      }
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// JAZZ BRUSHES on a fugue not JAZZ QUARTET's own: D503's engine, its fills from the form.

/**
 * The brushes' fills for a piece: D503's script on its two fugues (and JAZZ QUARTET's generic rule there), else from
 * the form: a lift into each subject zone after an episode, a fill into the climax, a fill into the last bar, the final.
 * The level by the zone: Busoni's dB with the episodes BRUSH_EPISODE_DB lower (D503's quieter pattern), the climax
 * BRUSH_CLIMAX_DB higher (its busier one).
 */
export const BRUSH_EPISODE_DB = -4;
export const BRUSH_CLIMAX_DB = 4;
const brushMemo = new Map<string, Fill[]>();
export function brushFills(f: TouchFugue, beat: number, per: number): Fill[] {
  if (DRUM_SCRIPTS[f.id]) return fillsFor(f, beat, per);
  const key = `${f.id}:${beat}:${per}:${f.entries.length}`;
  const hit = brushMemo.get(key);
  if (hit) return hit;
  const form = formOf(f);
  const L = landings(form);
  const out: Fill[] = [];
  for (const at of L.into) out.push({ kind: at >= form.finalEntry ? "fill" : "lift", from: Math.max(0, at - (at >= form.climax ? 2 : 1) * beat), at, why: at >= form.climax ? "the climax: the final entries" : "a subject zone after an episode" });
  out.push({ kind: "fill", from: Math.max(0, form.lastBar - Math.min(per, 3) * beat), at: form.lastBar, why: "the final cadence's approach" });
  out.push({ kind: "final", from: form.lastBar, at: form.lastBar + beat, why: "the final chord: a soft flutter, fading" });
  out.sort((a, b) => a.at - b.at);
  brushMemo.set(key, out);
  return out;
}
/** The brushes' level here by the form (dB added to Busoni's). */
export function brushDb(f: TouchFugue, tick: number): number {
  if (DRUM_SCRIPTS[f.id]) return 0;
  const k = drumKind(formOf(f), tick);
  return k === "episode" ? BRUSH_EPISODE_DB : k === "climax" ? BRUSH_CLIMAX_DB * climaxRamp(formOf(f), tick) : 0;
}

/** The key at a tick for the timpani (fugue.ts keyAt). */
export const keyFor = (f: TouchFugue) => (tick: number) => keyAt(f, tick);
