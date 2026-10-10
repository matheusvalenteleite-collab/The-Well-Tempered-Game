/**
 * A synthesized percussion section: a drum kit, hand percussion, "tribal" drums and orchestral
 * instruments (timpani tuned to the final and the fifth of the exercise's mode, bass drum,
 * field snare, cymbals, triangle).
 *
 * A pattern is one loop written as step strings (one per instrument): "X" accent, "x" normal,
 * "g" ghost, "." silence. The loop lasts `length` bars (a bar = one whole note of the cantus):
 * x2 stretches it over twice as many bars, /2 fits it twice into one bar. Each pattern also says
 * how the piece opens, how the bar before the last is filled and how the final bar is struck.
 */
export type DrumVoice =
  | "kick" | "snare" | "hat" | "openhat" | "crash" | "ride" | "tomHigh" | "tomLow" | "rim" | "clap"
  | "shaker" | "tambourine" | "cowbell" | "congaHigh" | "congaLow" | "bongo" | "woodblock" | "claves"
  | "djembeLow" | "djembeSlap" | "frameDrum" | "taiko"
  | "timpTonic" | "timpFifth" | "bassDrum" | "fieldSnare" | "cymbals" | "triangle" | "guiro";


/**
 * The sound of the drums (D71): the game's own studio kit, or a synthesized imitation of a vintage
 * machine. Any kit plays any pattern; a pattern written for a machine selects it.
 *   tr808      Roland TR-808 (1980): all analog; a ringing bridged-T bass drum around 50 Hz, the
 *              cowbell and cymbals from one bank of six square-wave oscillators (cowbell 540/800 Hz).
 *   tr909      Roland TR-909 (1983): analog bass drum (a fast pitch sweep), snare with "snappy"
 *              noise and clap; its hats and cymbals were 6-bit samples (imitated here, not sampled).
 *   cr78       Roland CR-78 CompuRhythm (1978): soft analog voices, the "metal beat", guiro, tambourine.
 *   rhythmAce  Ace Tone Rhythm Ace (1967), the preset rhythm boxes of the organ era: short, dull, plain.
 *   sdsv       Simmons SDS-V (1981): toms and snare as an oscillator with a deep pitch bend plus noise.
 *   sixties    A 1960s rock kit (D99): a muffled, felt-beater bass drum, a loose snare, thin trashy
 *              hats, washy cymbals and resonant toms with little pitch bend, as recorded in a room.
 */
export type DrumKit = "studio" | "sixties" | "tr808" | "tr909" | "cr78" | "rhythmAce" | "sdsv" | "percussion" | "tribal" | "orchestral" | SampledKit;
/**
 * Recorded kits (D107), played from one-shot samples (public/samples/drums/<kit>/): a voice the
 * kit lacks falls back on the synthesized studio voice.
 *   virtuosity  Virtuosity Drums (Versilian Studios, Karoryfer; Austin McMahon), a jazz club kit. CC0.
 *   bigRusty    Big Rusty Drums (Karoryfer), a vintage Polish kit by Zygmunt Szpaderski. CC0.
 *   naked       Naked Drums (Wilkinson Audio), a modern Yamaha studio kit. CC BY 4.0.
 *   drskit      DRSKit (DrumGizmo; Jes Eiler / DRSDrums), a handmade kit, jazz to rock. CC BY 4.0.
 *   retro       Retro Drums 1 (The Tic Tok Men), samples of old drum machines.
 *   unruly      Unruly Drums (Karoryfer), every drum with snare wires on it. CC0.
 */
export type SampledKit = "virtuosity" | "bigRusty" | "naked" | "drskit" | "retro" | "unruly";
export const SAMPLED_KITS: readonly SampledKit[] = ["virtuosity", "bigRusty", "naked", "drskit", "retro", "unruly"];
export const isSampled = (k: DrumKit): k is SampledKit => (SAMPLED_KITS as readonly string[]).includes(k);
/**
 * The kits (D100): each with its own presets, the first of them its paradigm. Hand percussion,
 * tribal drums and the orchestra are kits of their own, on the synthesized voices.
 */
export const DRUM_KITS: readonly DrumKit[] = ["naked", "drskit", "bigRusty", "virtuosity", "unruly", "retro", "studio", "sixties", "tr808", "tr909", "cr78", "rhythmAce", "sdsv", "percussion", "tribal", "orchestral"];

export interface DrumPattern {
  id: string;
  /** The kit the pattern belongs to (D100): chosen with it, never played on another. */
  kit: DrumKit;
  /** Steps per loop (16 = sixteenths of a bar at length 1; 12 for a shuffle). */
  steps: number;
  loop: Partial<Record<DrumVoice, string>>;
  /** Hits on the very first beat. */
  start?: DrumVoice[];
  /** Replaces the loop in the bar before the last (written for one bar, `steps` long). */
  fill?: Partial<Record<DrumVoice, string>>;
  /** Hits on the final bar's downbeat (the loop stops there). */
  end: DrumVoice[];
  /** The loop length it starts with, in bars (D99; 2 if absent, D100). */
  bars?: number;
  /** Variation B (D99); derived from the loop if absent (see variationB). */
  b?: Partial<Record<DrumVoice, string>>;
}

const BASE_PATTERNS: DrumPattern[] = [
  // ---- drum kit
  {
    id: "rock", kit: "studio", steps: 16,
    loop: { kick: "X.......x.......", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x.", openhat: "..............x." },
    b: { kick: "X.......x.x.....", snare: "....X.......X..g", hat: "x.x.x.x.x.x.x...", openhat: "..............x." },
    start: ["crash"], fill: { kick: "X.......x.......", snare: "....X.......X...", tomHigh: "..........x.x...", tomLow: "..............xx" }, end: ["kick", "crash"],
  },
  {
    id: "funk", kit: "studio", steps: 16,
    loop: { kick: "X..x..x...x..x..", snare: "....X..g.g..X..g", hat: "xgxgxgxgxgxgxgxg", openhat: "..........x....." },
    b: { kick: "X..x..x.x.x...x.", snare: "....X..g.g..X.gX", hat: "xgxgxgxgxgxgxg..", openhat: "..............x." },
    start: ["crash"], fill: { kick: "X..x..x.........", snare: "....X..gx.xxXxXX" }, end: ["kick", "crash"], bars: 2,
  },
  {
    id: "halftime", kit: "studio", steps: 16, bars: 1,
    loop: { kick: "X.........x.....", snare: "........X.......", hat: "x.x.x.x.x.x.x.x.", ride: "x...x...x...x..." },
    start: ["crash"], fill: { kick: "X.........x.....", snare: "........X...xxXX" }, end: ["kick", "crash"],
  },
  {
    id: "motorik", kit: "studio", steps: 16,
    loop: { kick: "X...x...X...x.x.", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", tambourine: "....x.......x..." },
    start: ["crash"], fill: { kick: "X...x...X...x.x.", snare: "....x...x.x.xxXX", tambourine: "....x.......x...", hat: "xxxxxxxx........" }, end: ["kick", "crash"],
  },
  {
    id: "shuffle", kit: "studio", steps: 12,
    loop: { kick: "X.....x.....", snare: "...X.....X..", hat: "x.xx.xx.xx.x" },
    start: ["crash"], fill: { kick: "X.....x.....", snare: "...X..x.xXxX" }, end: ["kick", "crash"],
  },
  // 1960s (D99), on the sixties kit
  {
    id: "beat60s", kit: "sixties", steps: 16,
    loop: { kick: "X.......X.x.....", snare: "....X.......X...", ride: "x.x.x.x.x.x.x.x.", tambourine: "....x.......x..." },
    b: { kick: "X.......X.x...x.", snare: "....X.......X.g.", ride: "x.x.x.x.x.x.x.x.", tambourine: "....x.......x..." },
    start: ["crash"], fill: { kick: "X...............", snare: "....X.x.x.x.....", tomHigh: "............x.x.", tomLow: "..............XX" }, end: ["kick", "crash"],
  },
  {
    id: "motown", kit: "sixties", steps: 16,
    loop: { kick: "X.x.....X.x.....", snare: "X...X...X...X...", hat: "x.x.x.x.x.x.x.x.", tambourine: "....X.......X..." },
    start: ["crash"], fill: { kick: "X.......X.......", snare: "X...X...x.x.xxXX" }, end: ["kick", "crash"],
  },
  {
    id: "garage", kit: "sixties", steps: 16,
    loop: { kick: "X.x.....X.x.....", snare: "....X.......X...", openhat: "x.x.x.x.x.x.x.x.", tambourine: "x.x.x.x.x.x.x.x." },
    start: ["crash"], fill: { kick: "X...............", snare: "....X...x.x.xxXX", crash: "................" }, end: ["kick", "crash"],
  },
  {
    // A hypnotic loop of bass drum, damped snare and floor tom, in the manner of the studio
    // psychedelia of 1966-67 (not a transcription of any record).
    id: "psych", kit: "sixties", steps: 16,
    loop: { kick: "X.....x.X.......", snare: "....X.....xX....", tomLow: "..x.......x...x.", ride: "x...x...x...x...", tambourine: "..x...x...x...x." },
    b: { kick: "X.....x.X.....x.", snare: "....X.....xX..g.", tomLow: "..x.......x...xx", ride: "x...x...x...x...", tambourine: "..x...x...x...x." },
    start: ["crash"], fill: { kick: "X...............", tomHigh: "....x.x.x.x.....", tomLow: "............XxXx" }, end: ["kick", "crash"],
  },
  {
    id: "surf", kit: "sixties", steps: 16,
    loop: { tomLow: "X.xxX.xxX.xxX.xx", tomHigh: "..x...x...x...x.", kick: "X.......X.......", snare: "....x.......x..." },
    start: ["crash"], fill: { tomLow: "X.x.X.x.XxXxXxXx", tomHigh: "x.x.x.x.x.x.x.x." }, end: ["tomLow", "crash"],
  },
  // ---- drum machines (D71)
  {
    id: "electro", kit: "tr808", steps: 16,
    loop: { kick: "X.....x...X..x..", clap: "....X.......X...", hat: "x.x.x.x.x.xxx.x.", cowbell: "......x.......x.", congaHigh: "..x.......x....." },
    start: ["crash"], fill: { kick: "X.....x...X.....", clap: "....X.......X.X.", tomLow: "........x.x.x.xx", tomHigh: "..........x.x..." }, end: ["kick", "crash"],
  },
  {
    id: "slowjam", kit: "tr808", steps: 16,
    loop: { kick: "X......x..X.....", snare: "....X.......X...", hat: "x.xx.xx.x.xx.x.x", rim: "..x.....x.....x.", congaLow: "..........x....." },
    fill: { kick: "X......x..X.....", snare: "....X.......X.xx", congaLow: "..........x.x.xX", rim: "..x.....x......." }, end: ["kick", "crash"], bars: 2,
  },
  {
    id: "house", kit: "tr909", steps: 16,
    loop: { kick: "X...X...X...X...", clap: "....X.......X...", openhat: "..x...x...x...x.", hat: "x.xxx.xxx.xxx.x." },
    start: ["crash"], fill: { kick: "X...X...X...X...", snare: "....x.x.xxxxXXXX" }, end: ["kick", "crash"],
  },
  {
    // D100: written over two bars (32 steps): a deep four-on-the-floor at the pulse of the half
    // notes, an off-beat open hat, sixteenth hats with accents, clap on the backbeat, a rim figure
    // that shifts in the second bar, and a ride swelling at the end.
    id: "techno", kit: "tr909", steps: 32,
    loop: {
      kick: "X.......X.......X.......X.......",
      hat: "xgxXxgxgxgxXxgxgxgxXxgxgxgxXxgxx",
      openhat: "....x.......x.......x.......x...",
      clap: "........X...............X.......",
      rim: "..x..x.....x..........x..x.x....",
      ride: "........................x.x.x.x.",
    },
    b: {
      kick: "X.......X.......X.......X.....x.",
      hat: "xgxXxgxgxgxXxgxgxgxXxgxgxgxXxgxx",
      openhat: "....x.......x.......x.......x.x.",
      clap: "........X...............X.....x.",
      rim: "..x..x.....x..x.......x..x.x..x.",
      ride: "x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.",
    },
    start: ["crash"],
    fill: { kick: "X.......X.......X.......X.......", clap: "........X.......x.x.x.x.XxXxXXXX", tomLow: "................x...x...x.x.x.xx" },
    end: ["kick", "crash"],
  },
  {
    id: "newwave", kit: "cr78", steps: 16,
    loop: { kick: "X.....x.X.......", snare: "....X.......X...", hat: "xgxgxgxgxgxgxgxg", tambourine: "....x.......x...", guiro: "x.......x......." },
    fill: { kick: "X.....x.X.......", snare: "....X...x.x.xxXX", hat: "xgxgxgxg........", guiro: "x..............." }, end: ["kick", "cymbals"],
  },
  {
    id: "crDisco", kit: "cr78", steps: 16,
    loop: { kick: "X...X...X...X...", snare: "....X.......X...", hat: "..x...x...x...x.", openhat: "......x.......x.", tambourine: "xxxxxxxxxxxxxxxx", cowbell: "x.......x......." },
    fill: { kick: "X...X...X...X...", snare: "....X...x.x.xxXX", tambourine: "xxxxxxxxxxxxxxxx", openhat: "......x........." }, end: ["kick", "cymbals"],
  },
  {
    id: "rhythmbox", kit: "rhythmAce", steps: 16,
    loop: { kick: "X.......x.x.....", snare: "....x.......x...", claves: "x..x..x...x.x...", ride: "x.x.x.x.x.x.x.x." },
    fill: { kick: "X.......x.x.....", snare: "....x...x.x.xxxx", claves: "x..x..x.........", ride: "x.x.x.x.x......." }, end: ["kick", "ride"],
  },
  {
    id: "aceWaltz", kit: "rhythmAce", steps: 12,
    loop: { kick: "X...........", snare: "....x...x...", ride: "x...x...x..." },
    fill: { kick: "X...........", snare: "....x.x.xxxx", ride: "x..........." }, end: ["kick", "ride"],
  },
  {
    id: "aceSlowRock", kit: "rhythmAce", steps: 12,
    loop: { kick: "X.....x.....", snare: "...x.....x..", ride: "xxxxxxxxxxxx" },
    fill: { kick: "X.....x.....", snare: "...x..xxxXXX", ride: "xxxxxx......" }, end: ["kick", "ride"],
  },
  {
    id: "aceBossa", kit: "rhythmAce", steps: 16,
    loop: { kick: "X..xX..xX..xX..x", claves: "x..x..x...x..x..", ride: "x.x.x.x.x.x.x.x." },
    fill: { kick: "X..xX..xX..xX..x", claves: "x..x..x...x.xxxx", ride: "x.x.x.x........." }, end: ["kick", "claves"],
  },
  {
    id: "synthtoms", kit: "sdsv", steps: 16,
    loop: { kick: "X.......X.x.....", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x.", tomLow: "..............x." },
    start: ["crash"], fill: { kick: "X.......x.......", tomHigh: "x.x.x.x.........", tomLow: "........x.x.xXXX" }, end: ["kick", "crash"],
  },
  {
    id: "big80s", kit: "sdsv", steps: 16,
    loop: { kick: "X.......X.......", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x.", tomHigh: "..........x.....", tomLow: "...........x.x.." },
    start: ["crash"], fill: { kick: "X...............", tomHigh: "x.x.x.x.........", tomLow: "........x.x.x.x.", snare: "............XXXX" }, end: ["kick", "crash"],
  },
  // ---- hand percussion
  {
    id: "bossa", kit: "percussion", steps: 16,
    loop: { kick: "X..xx..xX..xx..x", rim: "x..x..x...x..x..", shaker: "xgxgxgxgxgxgxgxg" },
    fill: { kick: "X..xX..xX..x....", rim: "x..x..x...x.x.xx", shaker: "xgxgxgxgxgxgxgxg" }, end: ["kick", "rim"], bars: 2,
  },
  {
    id: "conga", kit: "percussion", steps: 16,
    loop: { congaLow: "x.....x...x.....", congaHigh: "...x.x.x...x.xx.", cowbell: "x.x.xx.x.x.xx.x.", shaker: "xgxgxgxgxgxgxgxg" },
    fill: { congaHigh: "x.x.x.x.xxxxXXXX", congaLow: "x.......x......." }, end: ["congaLow", "cowbell"],
  },
  {
    id: "clave", kit: "percussion", steps: 16,
    loop: { claves: "x..x..x...x.x...", woodblock: "..x...x...x...x.", bongo: "x.gx.gx.x.gx.gxg" },
    fill: { claves: "x..x..x...x.x...", bongo: "x.gx.gx.xxxxXxXX", woodblock: "..............x." }, end: ["claves", "woodblock"],
  },
  // ---- tribal
  {
    id: "tribal", kit: "tribal", steps: 16,
    loop: { djembeLow: "X.....x...X.....", djembeSlap: "...x.....x..x..x", frameDrum: "x.......x.......", shaker: "x.x.x.x.x.x.x.x." },
    fill: { djembeLow: "X.x.X.x.X.x.XxXx", djembeSlap: "................" }, end: ["djembeLow", "frameDrum"],
  },
  {
    id: "taiko", kit: "tribal", steps: 16,
    loop: { taiko: "X...x.x.X...x...", rim: "..x...x...x...x.", clap: "....x.......x..." },
    fill: { taiko: "X.x.x.x.XxXxXxXX" }, end: ["taiko", "clap"],
  },
  {
    id: "ritual", kit: "tribal", steps: 16,
    loop: { frameDrum: "X..x............", shaker: "....x.......x...", triangle: "........x......." },
    fill: { frameDrum: "X..x....x.x.xXxX", triangle: "........x......." }, end: ["frameDrum", "triangle"], bars: 2,
  },
  // ---- orchestral
  {
    id: "timpani", kit: "orchestral", steps: 16,
    loop: { timpTonic: "X...............", timpFifth: "........x......." },
    fill: { timpFifth: "x.g.g.g.x.x.xxxx" }, end: ["timpTonic", "cymbals"],
  },
  {
    id: "march", kit: "orchestral", steps: 16,
    loop: { fieldSnare: "X.xxx.x.X.xxx.x.", bassDrum: "X.......x.......", cymbals: "x...............", timpTonic: "x..............." },
    fill: { fieldSnare: "xxxxxxxxXXXXXXXX", bassDrum: "X.......x......." }, end: ["bassDrum", "cymbals", "timpTonic"],
  },
  {
    id: "processional", kit: "orchestral", steps: 16,
    loop: { bassDrum: "X...............", timpTonic: "........g.......", timpFifth: "............g...", triangle: "....x.......x..." },
    fill: { timpFifth: "g.g.g.g.x.x.x.x.", timpTonic: "................" }, end: ["bassDrum", "timpTonic", "cymbals"], bars: 2,
  },
];

/** A preset of another kit, played on a recorded kit (D107). */
const on = (kit: DrumKit, from: string, id: string, extra: Partial<DrumPattern> = {}): DrumPattern => ({ ...BASE_PATTERNS.find((p) => p.id === from)!, id, kit, ...extra });
const JAZZ: DrumPattern = {
  id: "jazzRide", kit: "virtuosity", steps: 12,
  loop: { ride: "X..x.xX..x.x", hat: "...x.....x..", kick: "g..g..g..g..", snare: "........g..." },
  b: { ride: "X..x.xX..x.x", hat: "...x.....x..", kick: "g..g..g..g..", snare: "..g.....g.x." },
  start: ["crash"], fill: { ride: "X..x........", snare: "...x.xx.xX.X", kick: "X.........x." }, end: ["kick", "crash"],
};
const JAZZ_BRUSH_FREE: DrumPattern = {
  id: "jazzTwo", kit: "virtuosity", steps: 12,
  loop: { ride: "X.....X..x.x", hat: "...x.....x..", kick: "X.....g.....", rim: ".........x.." },
  start: ["ride"], fill: { snare: "x..x.xx.xX.X", kick: "X.....x....." }, end: ["kick", "crash"],
};

export const DRUM_PATTERNS: readonly DrumPattern[] = [
  on("naked", "rock", "nakedRock"), on("naked", "funk", "nakedFunk"), on("naked", "halftime", "nakedHalftime"), on("naked", "motorik", "nakedMotorik"),
  on("drskit", "rock", "drsRock"), on("drskit", "shuffle", "drsShuffle"), on("drskit", "motown", "drsMotown"), on("drskit", "halftime", "drsHalftime"),
  on("bigRusty", "beat60s", "rustyBeat"), on("bigRusty", "psych", "rustyPsych"), on("bigRusty", "garage", "rustyGarage"), on("bigRusty", "surf", "rustySurf"),
  JAZZ, JAZZ_BRUSH_FREE, on("virtuosity", "bossa", "virtBossa", { kit: "virtuosity" }), on("virtuosity", "conga", "virtLatin"), on("virtuosity", "shuffle", "virtShuffle"),
  on("unruly", "garage", "unrulyGarage"), on("unruly", "funk", "unrulyFunk"), on("unruly", "halftime", "unrulyHalftime"),
  on("retro", "electro", "retroElectro"), on("retro", "newwave", "retroNewwave"), on("retro", "rhythmbox", "retroBox"), on("retro", "house", "retroHouse"),
  ...BASE_PATTERNS,
];


/** A kit's presets, its paradigm first (D100). */
export const presetsOf = (kit: DrumKit) => DRUM_PATTERNS.filter((p) => p.kit === kit);
/** The loop length a pattern starts with (D100: two bars unless it says otherwise). */
export const defaultLength = (p: DrumPattern) => p.bars ?? 2;
/**
 * The settings of a pattern freshly chosen (D100): choosing a kit or a preset resets the loop
 * length, the feel and the mutes to the preset's own; only the level stays.
 */
export const freshDrums = (pattern: string, level: number): DrumSettings => ({ pattern, length: defaultLength(patternById(pattern)), level });

export type DrumVariation = "A" | "B" | "AB";

export interface DrumSettings {
  pattern: string;
  /** Loop length in bars, 1/8..8, an exact fraction n/d with d a product of 2s and 3s (D70, D99). */
  length: number;
  /** 0..1 */
  level: number;
  /** Swing (D99): 0.5 = straight, up to 0.75; the off-beat sixteenths are delayed. */
  swing?: number;
  /** Accent (D99): the accented steps (X) louder, the rest softer, as on the vintage machines. */
  accent?: boolean;
  /** Variation A, B, or A and B alternating loop by loop (D99). */
  variation?: DrumVariation;
  /** Voices silenced (D99), by the pads that carry them. */
  mutes?: DrumVoice[];
  /** Parts given to pads by clicking (D107): the pad's voice → the number (1…) of its part. */
  parts?: Partial<Record<DrumVoice, number>>;
  /** Fill at the end of every pass of the loop and before the last bar (D99); on if absent. */
  autoFill?: boolean;
}

export const DEFAULT_DRUMS: DrumSettings = { pattern: "rock", length: 2, level: 0.55 };
/** The kit a setting plays with. */
export const kitOf = (s: DrumSettings): DrumKit => patternById(s.pattern).kit;
export const LOOP_MIN = 1 / 8;
export const LOOP_MAX = 8;
/**
 * The loop lengths the arrows step through (D99, D100, D102). Not in order of size: the most used
 * come together, 1, 2, 4 and 8 bars; then 3, 5 and 6; the odd lengths 4/3 and 3/2 before 1 with
 * the short ones.
 */
export const LOOP_STEPS: readonly number[] = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1, 2, 4, 8, 3, 5, 6, 4 / 3, 3 / 2, 5 / 4, 5 / 3, 8 / 5, 8 / 3];
/** The next loop length in the list (dir 1) or the one before (dir -1), or null at its ends. */
export function stepLoop(length: number, dir: 1 | -1): number | null {
  let i = LOOP_STEPS.findIndex((l) => Math.abs(l - length) < 1e-9);
  if (i < 0) {
    // A stored length off the list: its nearest neighbour in size stands in for it.
    i = LOOP_STEPS.reduce((best, l, j) => (Math.abs(l - length) < Math.abs(LOOP_STEPS[best] - length) ? j : best), 0);
    if ((dir > 0 && LOOP_STEPS[i] > length) || (dir < 0 && LOOP_STEPS[i] < length)) return LOOP_STEPS[i];
  }
  return LOOP_STEPS[i + dir] ?? null;
}
/** The swing settings offered (D99), as the delayed sixteenth's place in its pair: straight to triplet and beyond. */
export const SWING_STEPS: readonly number[] = [0.5, 0.54, 0.58, 0.62, 0.66, 0.71];

const DENOMINATORS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 27, 30, 32, 36, 40, 48, 54, 64, 72, 80, 81, 96, 108, 128, 144, 160, 162, 216, 243, 256];
/** The loop length as a fraction n/d (d a product of 2s and 3s), or null if it is not one. */
export function loopFraction(length: number): [number, number] | null {
  for (const d of DENOMINATORS) {
    const n = Math.round(length * d);
    if (n > 0 && Math.abs(n / d - length) < 1e-9) return [n, d];
  }
  return null;
}
export const validLoopLength = (l: unknown): l is number => typeof l === "number" && l >= LOOP_MIN - 1e-9 && l <= LOOP_MAX + 1e-9 && loopFraction(l) !== null;

export const patternById = (id: string) => DRUM_PATTERNS.find((p) => p.id === id) ?? DRUM_PATTERNS[0];

const VELOCITY: Record<string, number> = { X: 1, x: 0.75, g: 0.3 };
/** With accent on (D99): the accented steps stand out, as on the 808's accent bus. */
const ACCENTED: Record<string, number> = { X: 1.35, x: 0.62, g: 0.24 };

/** A roll for the last bar of a looped piece (D72), leading back into bar 1 instead of ending. */
const ROLL: Partial<Record<DrumVoice, string>> = { snare: "x...x...x.x.xxXX", kick: "X.......x......." };

/** The low voice that carries a pattern, and the voice that marks its off-beats. */
const LOWS: DrumVoice[] = ["kick", "bassDrum", "taiko", "djembeLow", "congaLow", "frameDrum", "timpTonic"];

/**
 * Variation B of a pattern (D99): its own if written; otherwise the loop with a push of the low
 * voice before the last beat and its last step left open, a little busier than A.
 */
export function variationB(p: DrumPattern): Partial<Record<DrumVoice, string>> {
  if (p.b) return p.b;
  const out = { ...p.loop };
  const low = LOWS.find((v) => out[v]);
  const put = (line: string, at: number, ch: string) => (line[at] === "." ? line.slice(0, at) + ch + line.slice(at + 1) : line);
  if (low) out[low] = put(put(out[low]!, Math.round(p.steps * 0.6875), "x"), p.steps - 2, "g");
  return out;
}

/** The step lines of the loop that covers bar position `loopIndex` (A, B or alternating). */
function linesFor(p: DrumPattern, s: DrumSettings, loopIndex: number) {
  const v = s.variation ?? "A";
  const base = v === "B" || (v === "AB" && loopIndex % 2 === 1) ? variationB(p) : p.loop;
  if (!s.parts || !Object.keys(s.parts).length) return base;
  const out = { ...base };
  for (const [voice, k] of Object.entries(s.parts) as [DrumVoice, number][]) {
    const line = padParts(p, voice)[k - 1];
    if (!line) continue;
    // A part replaces what the pad's voices played (the group of the pad), or adds the voice.
    const pad = padsFor(s).find((x) => x.voice === voice);
    for (const g of pad?.group ?? [voice]) delete out[g];
    out[voice] = line;
  }
  return out;
}

/** Fills fired by hand (D99): the pattern's own, a snare roll, a tom cascade, stop-time hits. */
export type DrumCue = "fill1" | "fill2" | "fill3" | "fill4" | "break" | "break2";
export const DRUM_CUES: readonly DrumCue[] = ["fill1", "fill2", "fill3", "fill4", "break", "break2"];
/** Bars a cue takes (D100: a one-bar and a two-bar break). */
export const cueBars = (c: DrumCue) => (c === "break2" ? 2 : 1);
const CUE_LINES: Record<Exclude<DrumCue, "fill1" | "break2">, Partial<Record<DrumVoice, string>>> = {
  fill2: { kick: "X.......x.......", snare: "g.g.x.x.xxxxXXXX" },
  fill3: { kick: "X...............", snare: "X.x.............", tomHigh: "....X.x.x.......", tomLow: "..........X.x.XX" },
  fill4: { kick: "X.....X.....X...", snare: "X.....X.....X.xX", crash: "X..............." },
  break: { kick: "X...............", crash: "X..............." },
};

/**
 * The generic lines (the roll, Fills II–IV, the break, the landing crash) are written for a drum
 * kit; a kit without snare and toms plays them on its own drums (D102).
 */
const SUBSTITUTE: Partial<Record<DrumKit, Partial<Record<DrumVoice, DrumVoice>>>> = {
  percussion: { kick: "congaLow", snare: "congaHigh", tomHigh: "bongo", tomLow: "congaLow", crash: "cowbell", hat: "shaker" },
  tribal: { kick: "taiko", snare: "djembeSlap", tomHigh: "djembeSlap", tomLow: "djembeLow", crash: "frameDrum", hat: "shaker" },
  orchestral: { kick: "bassDrum", snare: "fieldSnare", tomHigh: "timpFifth", tomLow: "timpTonic", crash: "cymbals", hat: "triangle" },
  rhythmAce: { crash: "ride" },
  cr78: { crash: "cymbals" },
};
export const kitVoice = (kit: DrumKit, v: DrumVoice): DrumVoice => SUBSTITUTE[kit]?.[v] ?? v;
const onKit = (kit: DrumKit, lines: Partial<Record<DrumVoice, string>>) => {
  const out: Partial<Record<DrumVoice, string>> = {};
  for (const [v, line] of Object.entries(lines) as [DrumVoice, string][]) {
    const w = kitVoice(kit, v);
    // Two lines on one voice merge, the stronger step winning.
    const rank = (c: string) => ".gxX".indexOf(c);
    out[w] = out[w] ? [...line].map((c, i) => (rank(c) > rank(out[w]![i]) ? c : out[w]![i])).join("") : line;
  }
  return out;
};

/** The step lines of a cue (one pattern loop long), on the pattern's kit. */
export function cueLines(p: DrumPattern, cue: DrumCue): { lines: Partial<Record<DrumVoice, string>>; steps: number } {
  if (cue === "fill1") return p.fill ? { lines: p.fill, steps: p.steps } : { lines: onKit(p.kit, ROLL), steps: 16 };
  return { lines: onKit(p.kit, CUE_LINES[cue === "break2" ? "break" : cue]), steps: 16 };
}

type Hit = [DrumVoice, number, number];

/**
 * Write step lines into `out`: lines spanning [from, from + span) bars, kept within bar `bar` and
 * within [lo, hi) (absolute bars).
 */
function writeLines(out: Hit[], s: DrumSettings, lines: Partial<Record<DrumVoice, string>>, steps: number, bar: number, from: number, span: number, lo = -Infinity, hi = Infinity) {
  const vel = s.accent ? ACCENTED : VELOCITY;
  const swing = s.swing ?? 0.5;
  // Swing delays the second sixteenth of each pair (only in straight patterns of 8, 16 or 32 steps).
  const swung = swing > 0.5 && steps % 8 === 0;
  for (const [v, line] of Object.entries(lines) as [DrumVoice, string][]) {
    [...line].forEach((ch, i) => {
      const w = vel[ch];
      if (!w) return;
      const step = span / steps;
      const at = from + i * step + (swung && i % 2 === 1 ? (swing - 0.5) * 2 * step : 0);
      if (at >= bar - 1e-9 && at < bar + 1 - 1e-9 && at >= lo - 1e-9 && at < hi - 1e-9) out.push([v, w, at - bar]);
    });
  }
}

/**
 * The groove of bar `bar` up to `fillStart`, then a fill that ends exactly at `end` (D102): the
 * fill is one pattern loop long at the loop's own scale, so it keeps the groove's tempo; when the
 * window is shorter than the loop only its end is heard (the second half of a two-bar fill).
 */
function grooveThenFill(out: Hit[], s: DrumSettings, p: DrumPattern, bar: number, fill: { lines: Partial<Record<DrumVoice, string>>; steps: number }, windowStart: number, end: number) {
  const L = s.length;
  const fillStart = Math.max(windowStart, end - L);
  for (let loop = Math.floor(bar / L + 1e-9); loop * L < bar + 1 - 1e-9; loop++) writeLines(out, s, linesFor(p, s, loop), p.steps, bar, loop * L, L, -Infinity, fillStart);
  writeLines(out, s, fill.lines, fill.steps, bar, end - L, L, fillStart, end);
}

const unmuted = (s: DrumSettings, hits: Hit[]) => (s.mutes?.length ? hits.filter(([v]) => !s.mutes!.includes(v)) : hits);

/**
 * The hits of bar `bar` as [voice, velocity, offset within the bar (0..1)]. When the piece loops,
 * the drums never stop (D72): the last bar keeps the groove, and the breath before the next pass
 * carries the roll into bar 1 (see hitsForBreath).
 */
export function hitsForBar(settings: DrumSettings, bar: number, totalBars: number, looping = false): Hit[] {
  const p = patternById(settings.pattern);
  const out: Hit[] = [];
  if (bar === totalBars - 1 && !looping) return unmuted(settings, p.end.map((v) => [v, 1, 0]));
  if (!looping && bar === totalBars - 2 && settings.autoFill !== false) {
    grooveThenFill(out, settings, p, bar, cueLines(p, "fill1"), bar, bar + 1);
  } else {
    const L = settings.length;
    for (let loop = Math.floor(bar / L + 1e-9); loop * L < bar + 1 - 1e-9; loop++) writeLines(out, settings, linesFor(p, settings, loop), p.steps, bar, loop * L, L);
  }
  if (bar === 0) for (const v of p.start ?? []) out.push([v, 1, 0]);
  return unmuted(settings, out);
}

/** The hits of a bar given over to a cue (D99), and the crash that lands on the bar after it. */
export function hitsForCue(settings: DrumSettings, cue: DrumCue): Hit[] {
  const p = patternById(settings.pattern);
  const out: Hit[] = [];
  if (cue === "break" || cue === "break2") writeLines(out, settings, cueLines(p, cue).lines, 16, 0, 0, 1);
  else grooveThenFill(out, settings, p, 0, cueLines(p, cue), 0, 1);
  return unmuted(settings, out);
}

/**
 * The breath between two passes of a loop (`span` bars, half a bar in the engine): the second half
 * of the pattern's fill (or a snare roll), stretched to the breath, leading into bar 1 (D72). With
 * the auto fill off (D99) the groove simply goes on through it.
 */
export function hitsForBreath(settings: DrumSettings, span = 0.5): Hit[] {
  const p = patternById(settings.pattern);
  const out: Hit[] = [];
  const L = settings.length;
  if (settings.autoFill === false) {
    writeLines(out, settings, linesFor(p, settings, 0), p.steps, 0, 0, L);
    return unmuted(settings, out.filter(([, , at]) => at < span - 1e-9));
  }
  // The breath is `span` bars: the end of the fill, at the loop's scale, landing on bar 1 (D102).
  const fill = cueLines(p, "fill1");
  writeLines(out, settings, fill.lines, fill.steps, 0, span - L, L, Math.max(0, span - L), span);
  if (span > L) for (let loop = 0; loop * L < span - L - 1e-9; loop++) writeLines(out, settings, linesFor(p, settings, loop), p.steps, 0, loop * L, L, 0, span - L);
  return unmuted(settings, out);
}

/**
 * Parts for a pad (D107): what an instrument can play in this preset, by its role. Clicking a pad
 * steps through them: a pad the pattern uses goes original → its parts → off; a pad it does not
 * use goes off → its parts → off. Written on sixteen steps per loop and fitted to the pattern's.
 */
const PARTS16: Record<string, { name: string; line: string }[]> = {
  bell: [
    { name: "downbeats", line: "X...x...X...x..." },
    { name: "offbeats", line: "..x...x...x...x." },
    { name: "clave", line: "x..x..x...x.x..." },
  ],
  shaker: [
    { name: "sixteenths", line: "xgxgXgxgxgxgXgxg" },
    { name: "backbeat", line: "....X.......X..." },
  ],
  openhat: [
    { name: "offbeats", line: "..x...x...x...x." },
    { name: "last eighth", line: "..............x." },
  ],
  hat: [
    { name: "eighths", line: "x.x.x.x.x.x.x.x." },
    { name: "sixteenths", line: "xgxgxgxgxgxgxgxg" },
    { name: "offbeats", line: "..x...x...x...x." },
  ],
  ride: [
    { name: "eighths", line: "X.x.x.x.X.x.x.x." },
    { name: "quarters", line: "x...x...x...x..." },
  ],
  crash: [
    { name: "first beat", line: "X..............." },
    { name: "every half bar", line: "X.......x......." },
  ],
  snare: [
    { name: "backbeat", line: "....X.......X..." },
    { name: "beat four", line: "............X..." },
    { name: "ghosts", line: "..g.X..g.g..X.g." },
  ],
  rim: [
    { name: "cross-stick", line: "....x.......x..." },
    { name: "bossa", line: "x..x..x...x..x.." },
  ],
  tom: [
    { name: "answer", line: "............x.xx" },
    { name: "floor beat", line: "x...x...x...x..." },
  ],
  kick: [
    { name: "one and three", line: "X.......X......." },
    { name: "four on the floor", line: "X...X...X...X..." },
  ],
  drum: [
    { name: "tumbao", line: "......x.x.....x." },
    { name: "offbeats", line: "..x...x...x...x." },
  ],
  timpani: [
    { name: "on one", line: "X..............." },
    { name: "one and three", line: "X.......x......." },
  ],
  bright: [
    { name: "quarters", line: "x...x...x...x..." },
    { name: "offbeats", line: "..x...x...x...x." },
  ],
};
const ROLE: Partial<Record<DrumVoice, string>> = {
  cowbell: "bell", woodblock: "bell", claves: "bell", shaker: "shaker", tambourine: "shaker", guiro: "shaker",
  openhat: "openhat", hat: "hat", ride: "ride", crash: "crash", cymbals: "crash", snare: "snare", clap: "snare", fieldSnare: "snare", djembeSlap: "snare",
  rim: "rim", tomHigh: "tom", tomLow: "tom", kick: "kick", bassDrum: "kick", taiko: "kick", frameDrum: "kick", djembeLow: "kick",
  congaHigh: "drum", congaLow: "drum", bongo: "drum", timpTonic: "timpani", timpFifth: "timpani", triangle: "bright",
};
/** Fit a sixteen-step line to `steps` steps per loop. */
function fitLine(line16: string, steps: number): string {
  if (steps === 16) return line16;
  const out = Array.from({ length: steps }, () => ".");
  [...line16].forEach((ch, i) => {
    if (ch === ".") return;
    const j = Math.round((i * steps) / 16) % steps;
    if (out[j] === "." || ch === "X") out[j] = ch;
  });
  return out.join("");
}
export function padPartNames(voice: DrumVoice): string[] {
  return (PARTS16[ROLE[voice] ?? "bright"] ?? []).map((x) => x.name);
}
export function padParts(p: DrumPattern, voice: DrumVoice): string[] {
  return (PARTS16[ROLE[voice] ?? "bright"] ?? []).map((x) => fitLine(x.line, p.steps));
}
/** Whether the preset's own loop plays a pad. */
export const padInPattern = (p: DrumPattern, pad: DrumPad) => pad.group.some((v) => p.loop[v] !== undefined);
/**
 * The next state of a pad (D107) as settings: parts and mutes. States: the original (pads the
 * pattern uses), each part, off.
 */
export function cyclePad(s: DrumSettings, pad: DrumPad): DrumSettings {
  const p = patternById(s.pattern);
  const used = padInPattern(p, pad);
  const n = padParts(p, pad.voice).length;
  type State = "original" | number | "off";
  const states: State[] = used ? ["original", ...Array.from({ length: n }, (_, i) => i + 1), "off"] : ["off", ...Array.from({ length: n }, (_, i) => i + 1)];
  const muted = pad.group.every((v) => (s.mutes ?? []).includes(v));
  const k = s.parts?.[pad.voice];
  const now: State = muted ? "off" : k ? k : used ? "original" : "off";
  const next = states[(states.indexOf(now) + 1) % states.length];
  const parts = { ...(s.parts ?? {}) };
  const mutes = new Set((s.mutes ?? []).filter((v) => !pad.group.includes(v)));
  delete parts[pad.voice];
  if (typeof next === "number") parts[pad.voice] = next;
  else if (next === "off" && used) pad.group.forEach((v) => mutes.add(v));
  return { ...s, parts, mutes: [...mutes] };
}
/** What a pad is doing now, in words for its tooltip. */
export function padState(s: DrumSettings, pad: DrumPad): { kind: "original" | "part" | "off"; part?: string } {
  if (pad.group.every((v) => (s.mutes ?? []).includes(v))) return { kind: "off" };
  const k = s.parts?.[pad.voice];
  if (k) return { kind: "part", part: padPartNames(pad.voice)[k - 1] };
  return padInPattern(patternById(s.pattern), pad) ? { kind: "original" } : { kind: "off" };
}

/** A pad of the vintage pad area (D99): what it plays, and the voices it mutes with it. */
export interface DrumPad {
  voice: DrumVoice;
  group: DrumVoice[];
  kind: "low" | "snare" | "hat" | "tom" | "cymbal" | "perc";
}
const pad = (kind: DrumPad["kind"], voice: DrumVoice, ...more: DrumVoice[]): DrumPad => ({ voice, group: [voice, ...more], kind });
const KIT_PADS: DrumPad[] = [
  pad("low", "kick"), pad("snare", "snare"), pad("snare", "rim", "claves", "woodblock"),
  pad("hat", "hat", "shaker"), pad("hat", "openhat", "tambourine"), pad("snare", "clap"),
  pad("tom", "tomHigh", "congaHigh", "bongo"), pad("tom", "tomLow", "congaLow"), pad("cymbal", "crash", "ride", "cymbals"),
];
const PADS: Record<string, DrumPad[]> = {
  virtuosity: [
    pad("low", "kick"), pad("snare", "snare"), pad("snare", "rim", "claves", "woodblock"),
    pad("hat", "hat", "shaker"), pad("hat", "openhat", "tambourine"), pad("perc", "cowbell"),
    pad("tom", "congaHigh", "bongo", "tomHigh"), pad("tom", "congaLow", "tomLow"), pad("cymbal", "ride", "crash", "cymbals"),
  ],
  retro: [
    pad("low", "kick"), pad("snare", "snare"), pad("snare", "clap"),
    pad("hat", "hat"), pad("hat", "openhat"), pad("perc", "cowbell", "rim", "claves", "guiro", "tambourine"),
    pad("tom", "tomHigh", "congaHigh"), pad("tom", "tomLow", "congaLow"), pad("cymbal", "crash", "ride", "cymbals"),
  ],
  studio: KIT_PADS,
  sixties: [
    pad("low", "kick"), pad("snare", "snare"), pad("perc", "tambourine"),
    pad("hat", "hat", "openhat"), pad("cymbal", "ride"), pad("snare", "rim"),
    pad("tom", "tomHigh"), pad("tom", "tomLow"), pad("cymbal", "crash", "cymbals"),
  ],
  tr808: [
    pad("low", "kick"), pad("snare", "snare"), pad("snare", "clap"),
    pad("hat", "hat"), pad("hat", "openhat"), pad("perc", "cowbell", "rim", "claves"),
    pad("tom", "congaHigh", "tomHigh"), pad("tom", "congaLow", "tomLow"), pad("cymbal", "crash", "cymbals", "ride"),
  ],
  tr909: [
    pad("low", "kick"), pad("snare", "snare"), pad("snare", "clap"),
    pad("hat", "hat"), pad("hat", "openhat"), pad("snare", "rim"),
    pad("tom", "tomHigh"), pad("tom", "tomLow"), pad("cymbal", "ride", "crash", "cymbals"),
  ],
  cr78: [
    pad("low", "kick"), pad("snare", "snare"), pad("perc", "guiro"),
    pad("hat", "hat"), pad("hat", "openhat"), pad("perc", "tambourine"),
    pad("perc", "cowbell"), pad("snare", "rim"), pad("cymbal", "cymbals", "crash", "ride"),
  ],
  rhythmAce: [
    pad("low", "kick"), pad("snare", "snare", "clap"), pad("perc", "claves", "rim"),
    pad("hat", "hat", "shaker"), pad("cymbal", "ride"), pad("perc", "cowbell"),
    pad("tom", "congaHigh", "bongo"), pad("tom", "congaLow", "tomLow", "tomHigh"), pad("cymbal", "crash", "cymbals", "openhat"),
  ],
  sdsv: [
    pad("low", "kick"), pad("snare", "snare"), pad("snare", "clap"),
    pad("hat", "hat"), pad("hat", "openhat"), pad("snare", "rim"),
    pad("tom", "tomHigh"), pad("tom", "tomLow"), pad("cymbal", "crash", "ride", "cymbals"),
  ],
  percussion: [
    pad("low", "kick"), pad("perc", "rim"), pad("perc", "shaker"),
    pad("tom", "congaHigh"), pad("tom", "congaLow"), pad("perc", "cowbell"),
    pad("tom", "bongo"), pad("perc", "claves"), pad("perc", "woodblock"),
  ],
  tribal: [
    pad("low", "djembeLow"), pad("snare", "djembeSlap"), pad("low", "frameDrum"),
    pad("low", "taiko"), pad("snare", "rim"), pad("snare", "clap"),
    pad("hat", "shaker"), pad("cymbal", "triangle"), pad("perc", "claves"),
  ],
  orchestral: [
    pad("low", "timpTonic"), pad("low", "timpFifth"), pad("low", "bassDrum"),
    pad("snare", "fieldSnare"), pad("cymbal", "cymbals"), pad("cymbal", "triangle"),
    pad("perc", "woodblock"), pad("perc", "tambourine"), pad("cymbal", "crash"),
  ],
};
/** The nine pads of the pattern's kit (D99). */
export function padsFor(s: DrumSettings): DrumPad[] {
  return PADS[kitOf(s)] ?? KIT_PADS;
}

const FINAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** The six square-wave pitches commonly given for the TR-808 cymbal bank (approximate values). */
const METAL_FREQS = [205.3, 304.4, 369.6, 522.7, 540, 800];

export class DrumMachine {
  private ctx: BaseAudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private live = new Set<AudioScheduledSourceNode>();
  settings: DrumSettings = { ...DEFAULT_DRUMS };
  /** The mode's final: the timpani are tuned to it and to its fifth. */
  final = "D";

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = DEFAULT_DRUMS.level;
    this.out.connect(destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  setLevel(level: number) {
    this.out.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
  }

  private track<T extends AudioScheduledSourceNode>(n: T): T {
    this.live.add(n);
    n.onended = () => this.live.delete(n);
    return n;
  }

  private env(t: number, peak: number, decay: number, attack = 0.002): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    g.connect(this.out);
    return g;
  }

  private tone(t: number, f0: number, f1: number, decay: number, peak: number, type: OscillatorType = "sine", attack = 0.002) {
    const o = this.track(this.ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
    o.connect(this.env(t, peak, decay, attack));
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  private hiss(t: number, filter: BiquadFilterType, freq: number, decay: number, peak: number, q = 1, attack = 0.002) {
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.noise;
    src.loop = decay > 0.9;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(t, peak, decay, attack));
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  /** Timpano: a few inharmonic partials over a pitched fundamental, and the felt of the mallet. */
  private timpano(t: number, freq: number, vel: number) {
    for (const [ratio, level, decay] of [[1, 1, 1.6], [1.5, 0.35, 1.0], [1.98, 0.22, 0.8], [2.44, 0.1, 0.5]]) {
      this.tone(t, freq * ratio * 1.02, freq * ratio, decay, 0.6 * vel * level);
    }
    this.hiss(t, "lowpass", 600, 0.08, 0.25 * vel);
  }

  /** Pitch of the timpano on the final (octave 2) or on its fifth. */
  private timpFreq(fifth: boolean) {
    const pc = FINAL_PC[this.final[0]] ?? 2;
    const midi = 36 + pc + (fifth ? 7 : 0); // C2..A2, the fifth above

    return 440 * 2 ** ((midi - 69) / 12);
  }

  /** An oscillator with a fast pitch sweep (f0 to f1 in `sweep` seconds), then a decay. */
  private sweep(t: number, f0: number, f1: number, sweep: number, decay: number, peak: number, type: OscillatorType = "sine") {
    const o = this.track(this.ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    o.connect(this.env(t, peak, decay));
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  /** Metallic voices: square waves at inharmonic pitches, band-passed and high-passed (808 style). */
  private metal(t: number, decay: number, peak: number, highpass = 7000, freqs = METAL_FREQS) {
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 10000;
    bp.Q.value = 0.7;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;
    bp.connect(hp).connect(this.env(t, peak, decay));
    for (const f of freqs) {
      const o = this.track(this.ctx.createOscillator());
      o.type = "square";
      o.frequency.value = f;
      o.connect(bp);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  /** The kit in use (D71). */
  kit: DrumKit = "studio";

  /** A machine's own voice, or false to fall back on the studio kit. */
  private machine(v: DrumVoice, t: number, vel: number): boolean {
    switch (this.kit) {
      case "tr808":
        switch (v) {
          case "kick": this.sweep(t, 62, 49, 0.03, 0.9, vel); this.hiss(t, "lowpass", 1500, 0.006, 0.25 * vel); return true;
          case "snare": this.tone(t, 185, 180, 0.12, 0.45 * vel); this.tone(t, 330, 325, 0.07, 0.25 * vel); this.hiss(t, "highpass", 1800, 0.16, 0.5 * vel); return true;
          case "clap": for (const d of [0, 0.01, 0.02]) this.hiss(t + d, "bandpass", 1000, 0.012, 0.9 * vel, 1.2); this.hiss(t + 0.03, "bandpass", 1000, 0.3, 0.55 * vel, 1.2); return true;
          case "hat": this.metal(t, 0.045, 0.32 * vel); return true;
          case "openhat": this.metal(t, 0.35, 0.28 * vel); return true;
          case "crash": case "cymbals": this.metal(t, 1.3, 0.3 * vel, 4500); return true;
          case "ride": this.metal(t, 0.7, 0.16 * vel, 5500); return true;
          case "cowbell": this.metal(t, 0.28, 0.5 * vel, 600, [540, 800]); return true;
          case "tomHigh": case "congaHigh": this.sweep(t, v === "tomHigh" ? 210 : 370, v === "tomHigh" ? 190 : 340, 0.05, 0.35, 0.65 * vel); return true;
          case "tomLow": case "congaLow": this.sweep(t, v === "tomLow" ? 140 : 250, v === "tomLow" ? 125 : 225, 0.05, 0.45, 0.75 * vel); return true;
          case "rim": this.tone(t, 1670, 1660, 0.025, 0.35 * vel, "square"); return true;
          case "claves": this.tone(t, 2500, 2500, 0.06, 0.4 * vel); return true;
          case "shaker": this.hiss(t, "highpass", 6000, 0.03, 0.3 * vel); return true;
        }
        return false;
      case "tr909":
        switch (v) {
          case "kick": this.sweep(t, 250, 47, 0.04, 0.62, vel); this.tone(t, 52, 45, 0.5, 0.35 * vel); this.hiss(t, "lowpass", 3000, 0.008, 0.4 * vel); return true;
          case "snare": this.sweep(t, 200, 180, 0.02, 0.1, 0.4 * vel, "triangle"); this.sweep(t, 340, 320, 0.02, 0.06, 0.25 * vel, "triangle"); this.hiss(t, "highpass", 2200, 0.22, 0.65 * vel); return true;
          case "clap": for (const d of [0, 0.009, 0.018]) this.hiss(t + d, "bandpass", 1300, 0.01, 0.9 * vel, 1); this.hiss(t + 0.027, "bandpass", 1300, 0.22, 0.6 * vel, 1); return true;
          case "hat": this.metal(t, 0.06, 0.2 * vel, 8500); this.hiss(t, "highpass", 9000, 0.05, 0.18 * vel); return true;
          case "openhat": this.metal(t, 0.4, 0.17 * vel, 8000); this.hiss(t, "highpass", 8500, 0.35, 0.15 * vel); return true;
          case "ride": this.metal(t, 0.9, 0.1 * vel, 5000); this.hiss(t, "bandpass", 7000, 0.8, 0.08 * vel, 2); return true;
          case "crash": case "cymbals": this.metal(t, 1.6, 0.2 * vel, 4000); this.hiss(t, "highpass", 5000, 1.5, 0.22 * vel); return true;
          case "tomHigh": this.sweep(t, 300, 190, 0.08, 0.3, 0.7 * vel); return true;
          case "tomLow": this.sweep(t, 200, 120, 0.08, 0.4, 0.8 * vel); return true;
          case "rim": this.tone(t, 1900, 1880, 0.02, 0.35 * vel, "triangle"); this.hiss(t, "bandpass", 3500, 0.02, 0.3 * vel, 3); return true;
        }
        return false;
      case "cr78":
        switch (v) {
          case "kick": this.sweep(t, 75, 62, 0.02, 0.25, 0.75 * vel); return true;
          case "snare": this.hiss(t, "lowpass", 4000, 0.12, 0.45 * vel); this.tone(t, 250, 240, 0.06, 0.25 * vel); return true;
          case "hat": case "openhat": this.hiss(t, "bandpass", 9000, v === "hat" ? 0.035 : 0.2, 0.3 * vel, 2); this.metal(t, v === "hat" ? 0.03 : 0.18, 0.06 * vel, 9000); return true;
          case "crash": case "cymbals": case "ride": this.hiss(t, "highpass", 6000, v === "ride" ? 0.5 : 1.0, 0.2 * vel); return true;
          case "tambourine": this.hiss(t, "highpass", 7000, 0.12, 0.22 * vel); this.metal(t, 0.1, 0.05 * vel, 6000); return true;
          case "cowbell": this.tone(t, 800, 800, 0.12, 0.18 * vel, "square"); return true;
          case "rim": this.tone(t, 1200, 1200, 0.02, 0.3 * vel, "triangle"); return true;
        }
        return false;
      case "rhythmAce":
        switch (v) {
          case "kick": this.tone(t, 95, 80, 0.16, 0.7 * vel); return true;
          case "snare": case "clap": this.hiss(t, "bandpass", 1500, 0.1, 0.5 * vel, 0.8); return true;
          case "hat": case "openhat": case "shaker": this.hiss(t, "highpass", 6500, v === "openhat" ? 0.15 : 0.04, 0.2 * vel); return true;
          case "ride": case "crash": case "cymbals": this.hiss(t, "highpass", 5000, 0.25, 0.14 * vel); return true;
          case "claves": case "rim": this.tone(t, 2000, 2000, 0.04, 0.3 * vel); return true;
          case "cowbell": this.tone(t, 700, 700, 0.1, 0.15 * vel, "square"); return true;
          case "congaHigh": case "bongo": this.tone(t, 420, 400, 0.08, 0.45 * vel); return true;
          case "congaLow": case "tomLow": case "tomHigh": this.tone(t, 220, 210, 0.12, 0.5 * vel); return true;
        }
        return false;
      case "sixties":
        switch (v) {
          case "kick": this.tone(t, 105, 52, 0.32, 0.9 * vel); this.hiss(t, "lowpass", 500, 0.04, 0.25 * vel); return true;
          case "snare": this.hiss(t, "bandpass", 1500, 0.3, 0.6 * vel, 0.6); this.tone(t, 190, 172, 0.14, 0.35 * vel, "triangle"); this.hiss(t, "highpass", 4000, 0.18, 0.12 * vel); return true;
          case "hat": this.hiss(t, "bandpass", 7500, 0.07, 0.24 * vel, 1.4); this.metal(t, 0.05, 0.04 * vel, 7000); return true;
          case "openhat": this.hiss(t, "bandpass", 6500, 0.5, 0.2 * vel, 1); this.metal(t, 0.4, 0.04 * vel, 6000); return true;
          case "ride": this.metal(t, 1.4, 0.08 * vel, 4500); this.hiss(t, "bandpass", 5000, 1.1, 0.1 * vel, 1.2); return true;
          case "crash": case "cymbals": this.hiss(t, "highpass", 3200, 2.0, 0.3 * vel, 0.7); this.metal(t, 1.5, 0.07 * vel, 3500); return true;
          case "tomHigh": this.tone(t, 205, 186, 0.4, 0.62 * vel); this.hiss(t, "lowpass", 900, 0.03, 0.15 * vel); return true;
          case "tomLow": this.tone(t, 128, 112, 0.55, 0.72 * vel); this.hiss(t, "lowpass", 700, 0.04, 0.15 * vel); return true;
          case "rim": this.tone(t, 1500, 1450, 0.04, 0.3 * vel, "triangle"); this.hiss(t, "bandpass", 2800, 0.03, 0.25 * vel, 3); return true;
        }
        return false;
      case "sdsv":
        switch (v) {
          case "kick": this.sweep(t, 130, 48, 0.08, 0.4, vel); this.hiss(t, "lowpass", 800, 0.03, 0.3 * vel); return true;
          case "snare": this.sweep(t, 320, 170, 0.1, 0.18, 0.4 * vel, "triangle"); this.hiss(t, "bandpass", 2500, 0.28, 0.6 * vel, 0.7); return true;
          case "tomHigh": this.sweep(t, 440, 170, 0.3, 0.5, 0.7 * vel, "triangle"); this.hiss(t, "lowpass", 1200, 0.05, 0.2 * vel); return true;
          case "tomLow": this.sweep(t, 280, 95, 0.35, 0.6, 0.8 * vel, "triangle"); this.hiss(t, "lowpass", 900, 0.06, 0.2 * vel); return true;
        }
        return false;
      default:
        return false;
    }
  }

  /** Called for every hit with its time, for the pads to light up (D99). */
  onHit: ((v: DrumVoice, t: number) => void) | null = null;

  /** The recorded kits' one-shots (D107): kit → voice → [soft, loud], loaded on first use. */
  private static manifest: Promise<Record<string, { voices: string[] }>> | null = null;
  private samples = new Map<string, Map<string, AudioBuffer[]>>();
  private loadingKits = new Set<string>();

  /** Fetch and decode a recorded kit (once); until it arrives the synthesized voices play. */
  loadKit(kit: SampledKit): Promise<void> {
    if (this.samples.has(kit) || this.loadingKits.has(kit) || typeof document === "undefined") return Promise.resolve();
    this.loadingKits.add(kit);
    const url = (f: string) => new URL(`samples/drums/${f}`, document.baseURI);
    DrumMachine.manifest ??= fetch(url("manifest.json")).then((r) => (r.ok ? r.json() : {}));
    return DrumMachine.manifest
      .then(async (m) => {
        const voices = m[kit]?.voices ?? [];
        const bank = new Map<string, AudioBuffer[]>();
        await Promise.all(
          voices.map(async (v) => {
            const layers = await Promise.all(
              [1, 2].map(async (l) => {
                const r = await fetch(url(`${kit}/${v}-${l}.mp3`));
                return r.ok ? this.ctx.decodeAudioData(await r.arrayBuffer()) : null;
              }),
            );
            const ok = layers.filter((b): b is AudioBuffer => b !== null);
            if (ok.length) bank.set(v, ok.length === 2 ? ok : [ok[0], ok[0]]);
          }),
        );
        this.samples.set(kit, bank);
      })
      .catch(() => undefined)
      .finally(() => this.loadingKits.delete(kit));
  }

  /** A recorded hit, if the kit has the voice; false to fall back on synthesis. */
  private sampled(v: DrumVoice, t: number, vel: number): boolean {
    if (!isSampled(this.kit)) return false;
    const bank = this.samples.get(this.kit);
    if (!bank) {
      void this.loadKit(this.kit);
      return false;
    }
    const layers = bank.get(v);
    if (!layers) return false;
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = layers[vel >= 0.7 ? 1 : 0];
    const g = this.ctx.createGain();
    g.gain.value = Math.min(1.4, 0.35 + 0.75 * vel);
    src.connect(g).connect(this.out);
    src.start(t);
    return true;
  }

  hit(v: DrumVoice, t: number, vel = 1) {
    this.onHit?.(v, t);
    if (this.sampled(v, t, vel)) return;
    if (this.kit !== "studio" && !isSampled(this.kit) && this.machine(v, t, vel)) return;
    switch (v) {
      case "kick": return this.tone(t, 150, 42, 0.38, vel);
      case "snare": this.hiss(t, "bandpass", 1900, 0.2, 0.7 * vel); return this.tone(t, 220, 160, 0.12, 0.4 * vel, "triangle");
      case "hat": return this.hiss(t, "highpass", 7500, 0.05, 0.28 * vel);
      case "openhat": return this.hiss(t, "highpass", 7000, 0.28, 0.25 * vel);
      case "crash": return this.hiss(t, "highpass", 4500, 1.4, 0.35 * vel);
      case "ride": this.hiss(t, "bandpass", 6000, 0.6, 0.12 * vel, 2); return this.tone(t, 3100, 3000, 0.4, 0.04 * vel);
      case "tomHigh": return this.tone(t, 260, 170, 0.25, 0.7 * vel);
      case "tomLow": return this.tone(t, 170, 105, 0.3, 0.8 * vel);
      case "rim": this.tone(t, 1700, 1600, 0.03, 0.3 * vel, "square"); return this.hiss(t, "bandpass", 3200, 0.03, 0.4 * vel, 4);
      case "clap":
        for (const d of [0, 0.011, 0.023]) this.hiss(t + d, "bandpass", 1200, 0.03, 0.8 * vel, 1.5);
        return this.hiss(t + 0.03, "bandpass", 1200, 0.18, 0.55 * vel, 1.5);
      case "shaker": return this.hiss(t, "highpass", 5500, 0.06, 0.22 * vel, 1, 0.012);
      case "tambourine": this.hiss(t, "highpass", 8000, 0.16, 0.25 * vel); return this.hiss(t, "bandpass", 5200, 0.1, 0.2 * vel, 8);
      case "cowbell": this.tone(t, 545, 540, 0.25, 0.16 * vel, "square"); return this.tone(t, 815, 810, 0.25, 0.12 * vel, "square");
      case "congaHigh": this.tone(t, 380, 330, 0.18, 0.6 * vel); return this.hiss(t, "bandpass", 1800, 0.015, 0.2 * vel);
      case "congaLow": this.tone(t, 240, 200, 0.25, 0.7 * vel); return this.hiss(t, "bandpass", 1200, 0.015, 0.2 * vel);
      case "bongo": return this.tone(t, 520, 450, 0.1, 0.5 * vel);
      case "woodblock": return this.tone(t, 950, 900, 0.06, 0.45 * vel, "triangle");
      case "claves": return this.tone(t, 2500, 2480, 0.05, 0.35 * vel);
      case "djembeLow": this.tone(t, 95, 70, 0.4, vel); return this.hiss(t, "lowpass", 400, 0.05, 0.3 * vel);
      case "djembeSlap": this.hiss(t, "bandpass", 2200, 0.06, 0.55 * vel, 2); return this.tone(t, 420, 380, 0.05, 0.3 * vel);
      case "frameDrum": this.tone(t, 75, 55, 0.6, 0.9 * vel); return this.hiss(t, "lowpass", 300, 0.2, 0.25 * vel);
      case "taiko": this.tone(t, 60, 40, 0.9, vel); return this.hiss(t, "lowpass", 220, 0.6, 0.5 * vel);
      case "timpTonic": return this.timpano(t, this.timpFreq(false), vel);
      case "timpFifth": return this.timpano(t, this.timpFreq(true), vel);
      case "bassDrum": this.tone(t, 55, 45, 1.2, vel); return this.hiss(t, "lowpass", 150, 0.8, 0.4 * vel);
      case "fieldSnare": this.hiss(t, "bandpass", 2400, 0.3, 0.6 * vel, 0.8); return this.tone(t, 200, 180, 0.08, 0.3 * vel, "triangle");
      case "cymbals": return this.hiss(t, "highpass", 3800, 2.4, 0.4 * vel, 0.7);
      case "triangle": this.tone(t, 4200, 4200, 1.4, 0.09 * vel); return this.tone(t, 6150, 6150, 1.0, 0.05 * vel);
      case "guiro":
        // A scraped gourd: a quick train of filtered noise ticks.
        for (let i = 0; i < 7; i++) this.hiss(t + i * 0.014, "bandpass", 3200, 0.012, 0.25 * vel, 3);
        return;
    }
  }

  /** A fill or break fired by hand (D99), waiting for the next bar; `onCue` hears it start and end. */
  cue: DrumCue | null = null;
  onCue: ((cue: DrumCue | null) => void) | null = null;
  /** The bar after a cue opens with a crash. */
  private landing = false;
  /** Bars of a break still to keep silent. */
  private silent = 0;

  /** Schedule bar `bar` starting at time `t`, a bar lasting `barSeconds`. */
  scheduleBar(t: number, barSeconds: number, bar: number, totalBars: number, looping = false) {
    this.kit = kitOf(this.settings);
    const ending = bar === totalBars - 1 && !looping;
    let hits: Hit[];
    if (this.silent > 0 && !ending) {
      hits = [];
      this.silent--;
    } else if (this.cue && !ending && bar > 0) {
      hits = hitsForCue(this.settings, this.cue);
      this.silent = cueBars(this.cue) - 1;
      this.cue = null;
      this.landing = true;
      this.onCue?.(null);
    } else {
      hits = hitsForBar(this.settings, bar, totalBars, looping);
      const crash = kitVoice(kitOf(this.settings), "crash");
      if (this.landing && !hits.some(([v, , at]) => at === 0 && v === crash)) hits.push([crash, 1, 0]);
      this.landing = false;
    }
    for (const [v, vel, at] of hits) this.hit(v, t + at * barSeconds, vel);
  }

  /** Play a cue at once (when nothing is playing): the cue's bar and the landing crash. */
  scheduleCue(t: number, barSeconds: number, cue: DrumCue) {
    this.kit = kitOf(this.settings);
    for (const [v, vel, at] of hitsForCue(this.settings, cue)) this.hit(v, t + at * barSeconds, vel);
    this.hit(kitVoice(kitOf(this.settings), "crash"), t + cueBars(cue) * barSeconds, 1);
  }

  /** The breath before the next pass of a loop, starting at `t` (D72). */
  scheduleBreath(t: number, barSeconds: number, span = 0.5) {
    this.kit = kitOf(this.settings);
    for (const [v, vel, at] of hitsForBreath(this.settings, span)) this.hit(v, t + at * barSeconds, vel);
  }

  stop() {
    for (const n of this.live) n.stop();
    this.live.clear();
    this.landing = false;
    this.silent = 0;
    if (this.cue) {
      this.cue = null;
      this.onCue?.(null);
    }
  }
}
