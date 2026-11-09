/**
 * D527, THE DRUM LIBRARY's WRITTEN PATTERNS (pure numbers; drum-library.ts registers them, drum-presets.ts kitBeat plays
 * them under the fugue's form, chip.ts Chip.kit sounds them). Each style is a drummer's bar written three times: for a
 * DUPLE metre (2/4, 4/4, 2/2, 4/2), a TRIPLE one (3/4, 3/8, 3/2) and a COMPOUND one (6/8, 9/8, 12/8, 6/16, 12/16, 6/4),
 * each a grid of `pulses` drummer's beats of `steps` steps, one string a piece ("|" between the bars of a two-bar
 * pattern, spaces between the pulses only for reading): "." nothing, "-" a ghost, "o" soft, "x" medium, "X" strong,
 * "#" an accent (VEL).
 *
 * TEMPO: the drummer counts a pulse that suits the style (`bpm`, the pulses a minute it is written for): in a duple metre
 * one, two or four pulses to the fugue's beat, or one to two beats (a slow 4/4 heard in half-time, a quick 2/4 in double
 * time), whichever brings the pulse nearest the style's own (the fugue's beat itself preferred); in a triple metre the
 * beat; in a compound one the dotted beat (a very slow one, 6/4's dotted minim, its three crotchets, as a triple bar). No
 * step is struck closer than GRID_STEP_S: under it the grid thins to its eighths, then its pulses. The fugue's own tempo
 * is never changed (the owner: no tempo changes but the fermatas and Busoni's endings).
 *
 * A drummer's bar of more pulses than the fugue's bar (4 against 2/4's 2) is played half a bar at a time, the bars
 * alternating; of fewer (2 against 4/4 at four pulses a beat), repeated; 9/8's three pulses take a 4-pulse grid's first two
 * and its last (the backbeat kept).
 *
 * THE FORM (drum-presets.ts kitBeat, D514's machinery: the rolls in and out, the break, the flourish, the levels): the
 * EPISODES thin to the bar's kick, the cross-stick for the snare and the cymbals; the CLIMAX's busier half by `climax`
 * (the ride for the hats, the hats opened, a crash on the bar, or the snare comping).
 */
import type { KitPiece } from "./drum-presets.ts";

/** A grid: `pulses` drummer's beats of `steps` steps; a piece's row, one char a step ("|" between bars, spaces ignored). */
export interface Grid {
  pulses: number;
  steps: number;
  rows: Partial<Record<KitPiece, string>>;
}
/** The fills' voice (drum-fills.ts: the snare and toms, the jazz kit's, a machine's, the congas'; D514's timpani and frame drums'). */
export type FillVoice = "rock" | "jazz" | "chip" | "machine" | "latin" | "timpani" | "frame";
/** The kit that sounds a style: a recorded one (sampled.ts kitRock: Big Rusty; kitClub: Virtuosity) or a synthesized one (chip.ts drum). */
export type KitVoice = "kitRock" | "kitClub" | "chip" | "analog" | "tr909" | "linn" | "glitch" | "arcade";
export interface GridStyle {
  duple: Grid;
  triple: Grid;
  compound: Grid;
  /** The pulses a minute the style is written for (the drummer's beat). */
  bpm: readonly [number, number];
  /** The off sixteenths late by this share of a step (a lazy swing: trip-hop, lo-fi). */
  swing16?: number;
  /** The climax's busier half: the ride for the hats, the hats opened, a crash on each bar, the snare comping. */
  climax: "ride" | "open" | "crash" | "comp";
  fill: FillVoice;
  kit: KitVoice;
  /** A recorded kit read faster (> 1) or slower, and its top cut (Hz): a sampled break's colour. */
  rate?: number;
  lp?: number;
  /**
   * The level's share (chip.ts Chip.kit: KIT_DRUMS.level times this; a synthesized kit on chip.ts drum's scale), and on a
   * phone. D529: each measured alone on I/2 bars 3-14 on the phone model and set to -43 LUFS there, 15.5 dB under the
   * bands' median (-27.5; JAZZ QUARTET's brushes sit 14.7 under theirs).
   */
  share: number;
  phone?: number;
  /** A phone's low drums' harmonics (chip.ts KIT_DRUMS.phoneLow: this style's share). */
  low?: number;
  /**
   * D565: a synthesized layer under a recorded (or synthesized) stroke, for weight: the kick's SUB (a sine falling 62 to
   * 40 Hz, its harmonics on a phone) and CLICK (the beater's 3-6 kHz tick); the snare's BODY (its shell's 180-200 Hz
   * thump) and CRACK (a band of noise at 2-5 kHz, the snares' rattle). chip.ts Chip.layer.
   */
  layer?: { kick?: number; snare?: number };
  /** D566: a multi-bar pattern held this many bars a variation (a slowly evolving loop: Jaki Liebezeit's, D566). */
  hold?: number;
  /** D566: the episodes keep the groove, softer (the toms and cymbals out), in place of D527's thinning to the bar's kick. */
  episode?: "thin" | "soft";
  /** D566: a trance: no fills, rolls, breaks or roll-outs; only a soft lift of the snare's ghosts into the final entry (drum-presets.ts kitBeatTrance). */
  trance?: boolean;
  /** D566: the room's share (chip.ts KIT_DRUMS.send by default; a dry, close kit less). */
  send?: number;
}

/** The velocity of each grid char. */
export const VEL: Readonly<Record<string, number>> = { "-": 0.18, o: 0.32, x: 0.45, X: 0.62, "#": 0.75 };
/** No two steps of a grid closer than this (s): the grid thins (D514's PATTERN_STROKE_S is the old patterns'). */
export const GRID_STEP_S = 0.085;
/** A compound beat longer than this (s) is played as its three pulses (6/4's dotted minim: three crotchets). */
export const COMPOUND_SPLIT_S = 1.6;
/** The climax's strokes this much firmer (the whole of it; drum-presets.ts CLIMAX_VEL's build on top). */
export const CLIMAX_FIRM = 1.08;
/** The fugue's own beat as the pulse is preferred by this much (the log-distance to the style's tempo). */
export const OWN_BEAT_BIAS = 0.18;

const g = (pulses: number, steps: number, rows: Grid["rows"]): Grid => ({ pulses, steps, rows });

/**
 * The written styles. Duple grids 4 pulses of 4 sixteenths (or of 3 triplets for the triplet-feel styles), triple 3 of 4
 * (or 3), compound 4 of 3 (12/8; 6/8 alternates halves, 9/8 takes pulses 1, 2 and 4).
 */
export const GRIDS: Readonly<Record<string, GridStyle>> = {
  // ROCK -------------------------------------------------------------------------------------------------------
  // POP-ROCK: the kick on 1, 3 and the and of 3, the snare on the backbeat, the hats in eighths, a tambourine on 2 and 4.
  poprock: {
    duple: g(4, 4, { kick: "#... .... X.x. ....|#... ..o. X.x. ....", snare: ".... X... .... X...", hat: "x.o. x.o. x.o. x.o.", tamb: ".... o... .... o..." }),
    triple: g(3, 4, { kick: "#... .... ..x.", snare: ".... X... X...", hat: "x.o. x.o. x.o.", tamb: ".... o... o..." }),
    compound: g(4, 3, { kick: "#.. ... X.. ..o", snare: "... X.. ... X..", hat: "xoo xoo xoo xoo", tamb: "... o.. ... o.." }),
    bpm: [95, 130],
    climax: "open",
    fill: "rock",
    kit: "kitRock",
    share: 0.34,
  },
  // PSYCHEDELIC: loose, cymbal-washed (the ride in eighths, a soft crash on the bar), the floor tom answering the snare.
  psych: {
    duple: g(4, 4, { kick: "#... ..x. .... x...|#... .... ..x. ....", snare: ".... X... .... X...|.... X... .... X.-.", ride: "x.o. x.o. x.o. x.o.", crash: "o... .... .... ....|.... .... .... ....", tomLow: ".... .... ..o. ....|.... .... .... ..o." }),
    triple: g(3, 4, { kick: "#... .... ....", snare: ".... X... ....", ride: "x.o. x.o. x.o.", crash: "o... .... ....", tomLow: ".... .... o..." }),
    compound: g(4, 3, { kick: "#.. ... x.. ...", snare: "... X.. ... X..", ride: "xoo xoo xoo xoo", crash: "o.. ... ... ...", tomLow: "... ... ..o ..." }),
    bpm: [70, 115],
    climax: "crash",
    fill: "rock",
    kit: "kitRock",
    share: 0.32,
  },
  // 6/8 ROCK BALLAD: the triplets on the hats, the kick on 1 and 3, the snare on 2 and 4 (a 12/8 ballad; 4/4 felt in 12/8).
  ballad: {
    duple: g(4, 3, { kick: "#.. ... X.. ..o", snare: "... X.. ... X..", hat: "xoo xoo xoo xoo" }),
    triple: g(3, 3, { kick: "#.. ... ..o", snare: "... X.. ...", hat: "xoo xoo xoo" }),
    compound: g(4, 3, { kick: "#.. ... X.. ..o", snare: "... X.. ... X..", hat: "xoo xoo xoo xoo" }),
    bpm: [48, 80],
    climax: "ride",
    fill: "rock",
    kit: "kitRock",
    share: 0.55,
  },
  // SHUFFLE: the long-short of the triplet on the hats, the snare's ghosts on the triplet's last, the kick's push.
  shuffle: {
    duple: g(4, 3, { kick: "#.. ... X.. ..o", snare: "..- X.. ..- X..", hat: "x.o x.o x.o x.o" }),
    triple: g(3, 3, { kick: "#.. ... ..o", snare: "..- X.. X..", hat: "x.o x.o x.o" }),
    compound: g(4, 3, { kick: "#.. ... X.. ..o", snare: "..- X.. ..- X..", hat: "x.o x.o x.o x.o" }),
    bpm: [88, 140],
    climax: "ride",
    fill: "rock",
    kit: "kitRock",
    share: 0.37,
  },
  // BREAKBEAT (D565, rewritten: "so flat and feeble"): the classic breaks' family, re-written, not sampled: four bars of
  // the Funky Drummer's and the Amen's syncopations (the kick's double on 1 and the and of 1, its push on the and of 3 and
  // the "a" of 3, the backbeat moved a sixteenth late in the fourth bar), the snare's ghosts on the e's and a's, the hats'
  // sixteenths with an accent contour (the beat strong, the "and" medium, the e and a ghosted, the open hat on the and of
  // 4), a light swing; Big Rusty at its own speed, each kick layered with a sub and a click and each backbeat with the
  // shell's body and a noise crack (chip.ts Chip.layer). 12/8 (and 12/16, II/4's): a half-time shuffle in the triplets
  // (Purdie's family: the backbeat on 2 and 4, the ghosts on each triplet's middle, the hats on its first and last).
  breakbeat: {
    duple: g(4, 4, {
      kick: "#.x. ...o ..X. .x..|#.#. .... ..#x ....|#.x. ...o ..X. ..x.|#.#. .... ..X. .xo.",
      snare: "..-. #..- .-.. #.-.|.... #..- .-.. #..-|..-. #..- .-.- #.-.|.-.. #..- .-#. ..#-",
      hat: "X-x- x-x- X-x- x-.-|X-x- x-x- X-x- x-x-|X-x- x-x- X-x- x-.-|X-x- x-x- X-x- x-x-",
      openhat: ".... .... .... ..o.|.... .... .... ....|.... .... .... ..o.|.... .... .... ....",
    }),
    triple: g(3, 4, {
      kick: "#.x. .... ..X.|#.#. ...o ..x.",
      snare: "..-. #..- .-.-|.... #..- .-#.",
      hat: "X-x- x-x- x-.-|X-x- x-x- x-x-",
      openhat: ".... .... ..o.|.... .... ....",
    }),
    compound: g(4, 3, {
      kick: "#.. ..x .x. ...|#.x ... #.. ..o",
      snare: ".-. #-. .-. #.-|.-. #-. .-- .#-",
      hat: "X.x x.x X.x x.x",
    }),
    bpm: [84, 116],
    swing16: 0.1,
    climax: "open",
    fill: "rock",
    kit: "kitRock",
    layer: { kick: 1, snare: 1 },
    episode: "soft",
    share: 0.5,
  },
  // TRIP-HOP: slow and heavy, the sixteenths lazy; the kit read slow (pitched down), its top dulled.
  triphop: {
    duple: g(4, 4, { kick: "#... ...x ..x. ....|#... .... ..x. ..o.", snare: ".... X... .... X...", hat: "x.o. x.o. x.o. x.o-", rim: ".... .... ...- ...." }),
    triple: g(3, 4, { kick: "#... ..x. ....", snare: ".... X... ....", hat: "x.o. x.o. x.o." }),
    compound: g(4, 3, { kick: "#.. ..x ... ...", snare: "... X.. ... X..", hat: "x.o x.o x.o x.o" }),
    bpm: [68, 96],
    swing16: 0.22,
    climax: "open",
    fill: "rock",
    kit: "kitRock",
    rate: 0.84,
    lp: 4500,
    share: 0.44,
  },
  // JAZZ ------------------------------------------------------------------------------------------------------
  // SWING (the JAZZ KIT): the ride's "ding, ding-a", the hi-hat's foot on 2 and 4, the bass drum feathered, the snare comping.
  jazz: {
    duple: g(4, 3, { ride: "x.. X.o x.. X.o", hat: "... x.. ... x..", kick: "-.. -.. -.. -..", snare: "... ... ..- ...|... ..- ... ..." }),
    triple: g(3, 3, { ride: "x.. X.o X.o", hat: "... x.. x..", kick: "-.. ... ...", snare: "... ... ..-" }),
    compound: g(4, 3, { ride: "x.. X.o x.. X.o", hat: "... x.. ... x..", kick: "-.. -.. -.. -..", snare: "... ... ..- ..." }),
    bpm: [96, 200],
    climax: "comp",
    fill: "jazz",
    kit: "kitClub",
    share: 0.44,
  },
  // BEBOP: the ride quick, the bass drum's "bombs" off the beat, the snare comping more.
  bebop: {
    duple: g(4, 3, { ride: "x.. X.o x.. X.o", hat: "... x.. ... x..", kick: "... ... ... ..o|-.. ... ..o ...", snare: "..- ... -.. ..o|... ..- ... -.." }),
    triple: g(3, 3, { ride: "x.. x.o x.o", hat: "... x.. x..", kick: "..o ... ...", snare: "... ..- -.." }),
    compound: g(4, 3, { ride: "x.. X.o x.. X.o", hat: "... x.. ... x..", kick: "... ... ... ..o", snare: "..- ... -.. ..o" }),
    bpm: [150, 290],
    climax: "comp",
    fill: "jazz",
    kit: "kitClub",
    share: 0.25,
  },
  // JAZZ WALTZ: the ride across the three ("1, 2-let, 3-let"), the foot on 2 and 3, the bass drum on 1.
  jazzWaltz: {
    duple: g(4, 3, { ride: "x.. x.o x.. x.o", hat: "... x.. ... x..", kick: "o.. ... ... ...", snare: "... ... ..- ..." }),
    triple: g(3, 3, { ride: "x.. x.o x.o", hat: "... x.. x..", kick: "o.. ... ...", snare: "... ... ..-|... ..- ..." }),
    compound: g(3, 3, { ride: "x.. x.o x.o", hat: "... x.. x..", kick: "o.. ... ...", snare: "... ... ..-" }),
    bpm: [110, 210],
    climax: "comp",
    fill: "jazz",
    kit: "kitClub",
    share: 0.36,
  },
  // LATIN / BRAZIL --------------------------------------------------------------------------------------------
  // BAIÃO: the zabumba's open stroke on 1 and its "a", the muted one on 2 (the low tom), the bacalhau's stick (the rim)
  // off the beat, the triangle in sixteenths, open on the "and".
  baiao: {
    duple: g(4, 4, { kick: "#..x .... #..x ....", tomLow: ".... x... .... x...", rim: "..o. ..o. ..o. ..o.", triangle: "o-x- o-x- o-x- o-x-" }),
    triple: g(3, 4, { kick: "#..x .... ....", tomLow: ".... x... x...", rim: "..o. ..o. ..o.", triangle: "o-x- o-x- o-x-" }),
    compound: g(4, 3, { kick: "#.x ... #.x ...", tomLow: "... x.. ... x..", rim: ".o. .o. .o. .o.", triangle: "oxo oxo oxo oxo" }),
    bpm: [80, 130],
    climax: "crash",
    fill: "latin",
    kit: "kitClub",
    share: 0.5,
  },
  // ELECTRONIC ------------------------------------------------------------------------------------------------
  // 808 (the analog drum machine, D514's ELECTRO): the electro kick's syncopation, the clap and the snare on the
  // backbeat, the closed hats in eighths with a sixteenth's flick.
  machine: {
    duple: g(4, 4, { kick: "#... ...x ..x. ....", snare: ".... X... .... X...", clap: ".... x... .... x...", hat: "x.o. x.o. x.oo x.o." }),
    triple: g(3, 4, { kick: "#... ..x. ....", snare: ".... X... ....", clap: ".... x... ....", hat: "x.o. x.o. x.oo" }),
    compound: g(4, 3, { kick: "#.. ..x ..x ...", snare: "... X.. ... X..", clap: "... x.. ... x..", hat: "xoo xoo xoo xoo" }),
    bpm: [84, 126],
    climax: "open",
    fill: "machine",
    kit: "analog",
    share: 3.4,
  },
  // HOUSE 909: four on the floor, the clap on 2 and 4, the open hat off the beat.
  house: {
    duple: g(4, 4, { kick: "#... X... X... X...", clap: ".... X... .... X...", openhat: "..x. ..x. ..x. ..x.", hat: "o... o... o... o..." }),
    triple: g(3, 4, { kick: "#... X... X...", clap: ".... X... ....", openhat: "..x. ..x. ..x." }),
    compound: g(4, 3, { kick: "#.. X.. X.. X..", clap: "... X.. ... X..", openhat: "..x ..x ..x ..x" }),
    bpm: [116, 130],
    climax: "crash",
    fill: "machine",
    kit: "tr909",
    share: 1.88,
  },
  // TECHNO: four on the floor, the closed hats' sixteenths with the off-beat stressed, the rim's syncopation, a soft clap.
  techno: {
    duple: g(4, 4, { kick: "#... #... #... #...", hat: "-.x- -.x- -.x- -.x-", clap: ".... o... .... o...", rim: "...o ..o. ...o ..o." }),
    triple: g(3, 4, { kick: "#... #... #...", hat: "-.x- -.x- -.x-", clap: ".... o... ....", rim: "...o ..o. ...o" }),
    compound: g(4, 3, { kick: "#.. #.. #.. #..", hat: "-x- -x- -x- -x-", clap: "... o.. ... o..", rim: "..o .o. ..o .o." }),
    bpm: [124, 140],
    climax: "open",
    fill: "machine",
    kit: "tr909",
    share: 2.09,
  },
  // DRUM'N'BASS (jungle): the two-step at 170 (the kick on 1 and the and of 3, the snare on 2 and 4), the ghosts, the
  // second bar's broken kick; the club kit read fast. FITS duple and compound (its 12/8 a half-time two-step); in a
  // triple metre it plays a squeezed form and is not marked FITS.
  dnb: {
    duple: g(4, 4, { kick: "#... .... ..#. ....|#... .... ..x. ...x", snare: ".... X... .... X..-|.... X..- .-.. X...", hat: "x.x. x.x. x.x. x.x." }),
    triple: g(3, 4, { kick: "#... .... ..#.", snare: ".... X... ...-", hat: "x.x. x.x. x.x." }),
    // 12/8 (6/8 two bars at a time): the half-time two-step over the dotted beats, each split in six (the triplet's
    // sixteenths): the kick on 1 and the middle of 3, the snare on 2 and 4 with its ghosts, the hats in the triplets
    // (written firmer: the sparser bar measured 19.5 dB under II/18's band at the duple's strengths; now 16.6).
    compound: g(4, 6, { kick: "#..... ...... ...#.. ......|#..... ...... ...X.. .....x", snare: "...... #..... ...... #...o.|...... #...o. ..o... #.....", hat: "X.x.x. X.x.x. X.x.x. X.x.x.", ride: "...... ...... ...... ......|o..... ...... ...... ......" }),
    bpm: [158, 180],
    climax: "ride",
    fill: "machine",
    kit: "kitClub",
    rate: 1.1,
    share: 0.46,
  },
  // LINNDRUM (80s synth-pop): the big snare with the clap on the backbeat, the sixteenth hats, the kick on 1, 3 and its push.
  linn: {
    duple: g(4, 4, { kick: "#... ..x. X... ....", snare: ".... X... .... X...", clap: ".... x... .... x...", hat: "xoxo xoxo xoxo xoxo" }),
    triple: g(3, 4, { kick: "#... .... ..x.", snare: ".... X... ....", clap: ".... x... ....", hat: "xoxo xoxo xoxo" }),
    compound: g(4, 3, { kick: "#.. ... X.. ...", snare: "... X.. ... X..", clap: "... x.. ... x..", hat: "xoo xoo xoo xoo" }),
    bpm: [98, 132],
    climax: "crash",
    fill: "machine",
    kit: "linn",
    share: 2.45,
  },
  // LO-FI HIP-HOP: the lazy sixteenths, the kick behind the beat, a ghosted rim; the club kit slow and dull.
  lofi: {
    duple: g(4, 4, { kick: "#... ..x. .x.. ....|#... ..x. .... ..o.", snare: ".... X... .... X...", hat: "x.o. x.o. x.o. x.oo", rim: "...- .... .-.. ...." }),
    triple: g(3, 4, { kick: "#... ..x. .x..", snare: ".... X... ....", hat: "x.o. x.o. x.o." }),
    compound: g(4, 3, { kick: "#.. .x. ... ..o", snare: "... X.. ... X..", hat: "x.o x.o x.o x.o" }),
    bpm: [68, 92],
    swing16: 0.33,
    climax: "open",
    fill: "rock",
    kit: "kitClub",
    rate: 0.9,
    lp: 3200,
    share: 0.84,
  },
  // IDM / GLITCH (D565: given the break's weight): the break cut up and displaced: the kick's double and the backbeat
  // moved by a sixteenth bar by bar, the snare's ghosts in stutters, the hats' sixteenths of uneven weight with drops, the
  // clicks of a cut-up rim; the glitch kit's kick under a sub and its snare over a crack (Chip.layer). 12/8 (12/16):
  // the triplet grid split in two (the stutters), the backbeat on 2 and 4 kept.
  idm: {
    duple: g(4, 4, {
      kick: "#.x. ..x. .#.. x...|#... .x.. ..#. .x.x|#.x. .... .x#. ..x.|#..x ..x. ..#. x..o",
      snare: "..-. #..- ..X. ...-|.... #... -..# ..--|.-.. #.-- .... #..-|..-. .#.- ..-. #-#-",
      hat: "xoxo -x-o x-xo -oxx|x-o- xo-x -xo- x-oo|xoxo x-.- xoxo -x-x|x-xo -xo- xxo- x.o-",
      rim: "..o. o... ...o .o..|.o.. ...o o... ..o.|...o .o.. o... ...o|o... ..o. .o.. o...",
    }),
    triple: g(3, 4, {
      kick: "#..x .x.. ..#.|#.x. ...x .x..",
      snare: ".... #..- ..X.|..-. .#.. -..#",
      hat: "xoxo -x-o x-xo|x-o- xo-x -xox",
      rim: "..o. o... ...o|.o.. ...o o...",
    }),
    compound: g(4, 6, {
      kick: "#..... ..x... .#.... x.....|#...x. ...... ..#... .x..x.",
      snare: "...... #...-- ..-.X. ......|...... #..-.. -..... #.-.--",
      hat: "x-o-x- -x-o-x x-x-o- o-x-x-|x-o-.- xx-o-. x-.-o- -oxx-o",
      rim: "..o... o..... ...o.. .o....|.o.... ...o.. o..... ..o...",
    }),
    bpm: [96, 140],
    climax: "crash",
    fill: "machine",
    kit: "glitch",
    layer: { kick: 1, snare: 1 },
    share: 2.98,
  },
  // LIEBEZEIT (D566): Jaki Liebezeit on Tago Mago ("Halleluwah", "Mushroom"): a hypnotic loop of interlocking parts, the
  // hats' sixteenths accented off the beat, the high and the low tom answering each other between the backbeats, the
  // snare's ghosts, the kick never on all four; six variations, each held six bars (one change every six bars, never a
  // fill that breaks the trance: drum-presets.ts kitBeatTrance), the episodes the same loop softer. The club kit dry and
  // close (the room's share a fifth of the others').
  liebezeit: {
    duple: g(4, 4, {
      kick: "#... ..x. ..#. ....|#... ..x. ..#. ....|#... ...x ..#. ..x.|#... ..x. ..#. ....|#..x ..x. ..#. ....|#... ...x ..#. ..x.",
      snare: "..-. X..- .-.. X.-.|..-. X..- .-.. X.-.|.-.. X..- ..-. X.-.|..-. X.-- .-.. X.-.|..-. X..- .-.. X..-|.-.. X..- ..-. X.--",
      hat: "x-X- x-x- x-X- x-x-|x-X- x-x- x-X- x-x-|x-X- x-x- x-X- x-x-|x-X- x-x- x-X- x-.-|x-X- x-x- x-X- x-x-|x-X- x-x- x-X- x-.-",
      openhat: ".... .... .... ....|.... .... .... ....|.... .... .... ....|.... .... .... ..o.|.... .... .... ....|.... .... .... ..o.",
      tomHigh: ".... .... .o.. ....|.... ...o .... .o..|.... .... .o.. ....|...o .... .o.. ....|.... .... .o.o ....|...o .... .... .o..",
      tomLow: ".... ..o. .... ..o.|.... .... ..o. ...o|.... ..o. .... ..o.|.... ..o. .... ...o|.... ..o. .... ...o|.... ..o. ..o. ....",
    }),
    triple: g(3, 4, {
      kick: "#... ..x. ....|#... .... ..x.|#..x .... ..x.",
      snare: "..-. X..- .-..|..-. X..- ..-.|.-.. X.-- .-..",
      hat: "x-X- x-x- x-X-",
      tomHigh: ".... .... .o..|...o .... .o..|.... ...o ....",
      tomLow: ".... ..o. ...o|.... ..o. ....|.... ..o. ..o.",
    }),
    compound: g(4, 3, {
      kick: "#.. .x. #.. ...|#.. .x. #.. ..x|#.x ... #.. .x.",
      snare: ".-. X.- .-. X..|.-. X.- ..- X.-|.-. X.- .-. X--",
      hat: "xoX xoX xoX xoX",
      tomHigh: "... ..o ... o..|..o ... ... ..o|... ..o .o. ...",
      tomLow: "..o ... ..o ...|... ..o ..o ...|..o ... ... o..",
    }),
    bpm: [62, 104],
    climax: "open",
    fill: "rock",
    kit: "kitClub",
    hold: 6,
    episode: "soft",
    trance: true,
    send: 0.02,
    share: 0.4,
  },
  // ARCADE (D568): videogame drums for "such a bouncy videogamey fugue … keep the PINBALL vibe": a chip kit (a kick swept
  // down from a pulse's chirp, a noise-channel snare, square clicks for the hats), bouncing: the kick on 1 and the
  // gigue's lilt (the third quaver of a 6/8 beat), the snare on the backbeat with a pick-up, the hats' clicks skipping.
  // 3/8 (II/24): the bar's kick, the snare on its third quaver, the next bar answering.
  arcade: {
    duple: g(4, 4, {
      kick: "#..o ..x. #..o ..x.|#..o ..x. #... .x..",
      snare: ".... X... .... X..o|.... X... .... X.o.",
      hat: "xox. xoxo xox. xoxo",
      openhat: ".... .... .... ....|.... .... .... ..o.",
    }),
    triple: g(3, 4, {
      kick: "#.o. .... ....|#... ..x. ....",
      snare: ".... .... X...|.... X... ..o.",
      hat: "x.ox x.o. x.o.|x.o. x.ox x.o.",
    }),
    compound: g(4, 6, {
      kick: "#...o. ...... #...o. ......|#...o. ...... #..... ..x...",
      snare: "...... X..... ...... X...o.|...... X..... ...... X.o.o.",
      hat: "x.o.x. x.o.x. x.o.x. x.o.xo|x.o.x. x.o.xo x.o.x. x.o.x.",
    }),
    bpm: [104, 160],
    climax: "open",
    fill: "chip",
    kit: "arcade",
    share: 2.6,
  },
};

/** The fugue's metre as the drummer reads it: the class of its bar. */
export type MetreClass = "duple" | "triple" | "compound";
export const metreClass = (per: number, compound: boolean): MetreClass => (compound ? "compound" : per === 3 ? "triple" : "duple");

/** How a style lays out over the fugue's bar: the grid, the drummer's pulses to the fugue's beat (r), to its bar (Pb). */
export interface GridLayout {
  grid: Grid;
  r: number;
  Pb: number;
  pulseS: number;
}
export function layoutOf(st: GridStyle, per: number, compound: boolean, beatS: number): GridLayout {
  const cls = metreClass(per, compound);
  if (cls === "compound" && beatS > COMPOUND_SPLIT_S) return { grid: st.triple, r: 3, Pb: per * 3, pulseS: beatS / 3 };
  const cands = cls === "duple" ? (per % 2 === 0 ? [0.5, 1, 2, 4] : [1, 2, 4]) : [1];
  const centre = Math.sqrt(st.bpm[0] * st.bpm[1]);
  let best = 1;
  let score = Infinity;
  for (const r of cands) {
    const bpm = (60 * r) / beatS;
    const s = Math.abs(Math.log(bpm / centre)) + (r === 1 ? 0 : OWN_BEAT_BIAS);
    if (s < score) (score = s), (best = r);
  }
  return { grid: st[cls], r: best, Pb: per * best, pulseS: beatS / best };
}

/** The grid's pulse for the drummer's pulse `i` of the fugue's bar, and the grid's bar (for two-bar patterns). */
export function gridPulse(i: number, Pb: number, Pg: number, bar: number): { gp: number; gbar: number } {
  if (Pb === Pg) return { gp: i, gbar: bar };
  if (Pb < Pg) {
    if (Pg % Pb === 0) {
      const k = Pg / Pb;
      return { gp: (bar % k) * Pb + i, gbar: Math.floor(bar / k) };
    }
    return { gp: i < Pb - 1 ? i : Pg - 1, gbar: bar };
  }
  if (Pb % Pg === 0) return { gp: i % Pg, gbar: bar * (Pb / Pg) + Math.floor(i / Pg) };
  return { gp: i === Pb - 1 ? Pg - 1 : i % Pg, gbar: bar };
}

const rowsMemo = new Map<string, string[]>();
/** A row's bars (spaces gone). */
function barsOf(row: string): string[] {
  let r = rowsMemo.get(row);
  if (!r) rowsMemo.set(row, (r = row.replace(/ /g, "").split("|")));
  return r;
}
/** A deterministic share in [0, 1) for a stroke (its velocity's small variation: no machine-gun repeats). */
const jitter = (a: number, b: number) => {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

export interface GridHit {
  piece: KitPiece;
  at: number;
  vel: number;
}
/**
 * One fugue beat of a written style: the strokes of the drummer's pulses it holds (or the half pulse), each by the zone
 * (`kind`) and the climax's busier half (`top`). `bar` is the fugue's bar (counted from 0), `b` the beat in it.
 */
export function gridBeat(st: GridStyle, b: number, per: number, compound: boolean, beatS: number, bar: number, kind: "subject" | "episode" | "climax", top: boolean): GridHit[] {
  const L = layoutOf(st, per, compound, beatS);
  const { grid, r, Pb } = L;
  const steps = grid.steps;
  const stepS = L.pulseS / steps;
  const stride = stepS >= GRID_STEP_S ? 1 : steps % 2 === 0 && 2 * stepS >= GRID_STEP_S ? 2 : steps;
  const out: GridHit[] = [];
  // The pulses (and the share of a pulse) this beat holds.
  const spans: { i: number; from: number; to: number; at0: number; width: number }[] = [];
  if (r >= 1) for (let j = 0; j < r; j++) spans.push({ i: b * r + j, from: 0, to: 1, at0: j / r, width: 1 / r });
  else {
    const half = b % 2;
    spans.push({ i: Math.floor(b / 2), from: half * 0.5, to: half * 0.5 + 0.5, at0: -half, width: 2 });
  }
  const ep = kind === "episode";
  for (const sp of spans) {
    const gq = gridPulse(sp.i, Pb, grid.pulses, bar);
    const gp = gq.gp;
    const gbar = st.hold ? Math.floor(gq.gbar / st.hold) : gq.gbar;
    for (let s = 0; s < steps; s += stride) {
      const u0 = s / steps;
      if (u0 < sp.from - 1e-9 || u0 >= sp.to - 1e-9) continue;
      const late = st.swing16 && steps === 4 && s % 2 === 1 ? st.swing16 / steps : 0;
      const at = sp.at0 + (u0 + late) * sp.width;
      if (at < 0 || at >= 1) continue;
      for (const [piece0, row] of Object.entries(grid.rows) as [KitPiece, string][]) {
        const bars = barsOf(row);
        const line = bars[gbar % bars.length];
        const ch = line[gp * steps + s] ?? ".";
        let vel = VEL[ch] ?? 0;
        if (!vel) continue;
        let piece = piece0;
        if (ep && st.episode === "soft") {
          // D566: the episodes keep the groove, softer: the toms' and the cymbals' colour out, the kick on the pulses only.
          if (piece === "crash" || piece === "openhat" || piece === "tomHigh" || piece === "tomLow") continue;
          if (piece === "kick" && s !== 0) continue;
          vel *= 0.62;
        } else if (ep) {
          // The episodes: the bar's kick alone, the cross-stick for the snare (on the pulse), the cymbals lighter; the rest out.
          if (piece === "kick") {
            if (!(sp.i === 0 && s === 0)) continue;
          } else if (piece === "snare" || piece === "clap") {
            if (s !== 0 || ch === "-") continue;
            piece = "rim";
            vel *= 0.8;
          } else if (piece === "hat" || piece === "ride" || piece === "shaker" || piece === "triangle" || piece === "tamb" || piece === "rim") vel *= 0.85;
          else continue;
        } else if (top) {
          if (st.climax === "ride" && piece === "hat") piece = "ride";
        }
        // The climax a little firmer throughout (its busier half by `climax` besides).
        if (kind === "climax") vel *= CLIMAX_FIRM;
        vel *= 1 + 0.12 * (jitter(bar * 64 + sp.i * steps + s, piece.length) - 0.5);
        out.push({ piece, at, vel });
      }
      if (!ep && top && s === 0) {
        if ((st.climax === "crash" || st.climax === "ride") && sp.i === 0) out.push({ piece: "crash", at, vel: st.climax === "crash" ? 0.42 : 0.34 });
        if (st.climax === "open" && gp % 2 === 1 && steps > stride) out.push({ piece: "openhat", at: Math.min(0.999, at + (sp.width * (steps - stride)) / steps), vel: 0.4 });
        if (st.climax === "comp" && gp % 2 === 1) out.push({ piece: "snare", at: Math.min(0.999, at + (sp.width * (steps - stride)) / steps), vel: 0.3 });
      }
    }
  }
  // No piece struck twice closer than GRID_STEP_S (a climax's added stroke against the written one): the louder kept.
  out.sort((a, b) => a.at - b.at || b.vel - a.vel);
  const last = new Map<KitPiece, GridHit>();
  return out.filter((h) => {
    const p = last.get(h.piece);
    if (p && (h.at - p.at) * beatS < GRID_STEP_S - 1e-6) {
      p.vel = Math.max(p.vel, h.vel);
      return false;
    }
    last.set(h.piece, h);
    return true;
  });
}

/** The pieces a written style strikes (its recordings to load), its fills' and landings' included. */
export function gridPieces(st: GridStyle): KitPiece[] {
  const set = new Set<KitPiece>(["kick", "crash", "rim"]);
  for (const gr of [st.duple, st.triple, st.compound]) for (const p of Object.keys(gr.rows) as KitPiece[]) set.add(p);
  if (st.climax === "ride") set.add("ride");
  if (st.climax === "open") set.add("openhat");
  if (st.climax === "comp") set.add("snare");
  const fill: Record<FillVoice, KitPiece[]> = { rock: ["snare", "tomHigh", "tomLow"], jazz: ["snare", "tomHigh", "tomLow"], chip: ["snare", "tomHigh", "tomLow"], machine: ["snare", "tomHigh", "tomLow"], latin: ["congaHigh", "congaLow", "bongo", "tamb"], timpani: ["timp", "bassDrum"], frame: ["congaHigh", "congaLow", "bongo", "tamb"] };
  for (const p of fill[st.fill]) set.add(p);
  return [...set];
}
