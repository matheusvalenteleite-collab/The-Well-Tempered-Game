/**
 * D526, THE DRUM LIBRARY. The owner: "Drums follow the sound AND the fugue"; "Allow for all drum options for all fugues".
 * One registry of drum STYLES grouped by FAMILY, in place of D514's three generic presets per fugue. Every sound has a
 * HOME style written for it and a FAMILY of styles that suit it; every style can be chosen for every fugue and every
 * sound; with DRUMS on and nothing chosen, the sound's HOME plays. Every style plays in every metre (duple, triple,
 * compound) at the fugue's own tempo, and reads the fugue's form (D513/D514: the rolls, the thinner episodes, the climax,
 * the break, the flourish; or the bands' own scripts, which read form-points.ts).
 *
 * ===============================================================================================================
 * THE API (stages S2-S5 build on it)
 *
 *   styleIds: readonly StyleId[]            every selectable style, grouped by family (FAMILIES' order), then as written
 *   FAMILIES: readonly Family[]             "rock" | "jazz" | "latin" | "electronic" | "orchestral"
 *   styleInfo(id): StyleInfo                { id, family, label (short caps, <= 10 chars), metres (the metres it FITS),
 *                                             engine (what plays it, below), why (one line) }; an unknown id: HOME_FALLBACK's
 *   stylesIn(family): StyleId[]             a family's styles
 *   homeStyleFor(sound): StyleId            the sound's HOME (a sound id of sound.ts PRESETS/TRIALS; unknown: "rock")
 *   homeFor(pieceId, sound): StyleId        D585: what DRUMS play with nothing chosen: the fugue's own style (FUGUE_STYLES)
 *                                             on its own sound (PIECE_SOUND), else the sound's HOME; the menu's HOME entry
 *   familyFor(sound): readonly StyleId[]    the sound's family, HOME first (styles that suit the sound, any family)
 *   metreOf(fugue): Metre                   "duple" | "triple" | "compound" (fugue: a TouchFugue or its id)
 *   fits(style, fugue): boolean             the style is idiomatic in the fugue's metre (FITS); every style still plays
 *   setDrumStyle(pieceId, style)            the style the drums play for a piece ("home" or an unknown id: follow the
 *                                             sound's HOME; D514's "electronic"/"acoustic"/"percussion" are read as that
 *                                             piece's D514 style). It does not turn DRUMS on (sound.ts setBacking).
 *   chosenStyle(pieceId): StyleId | null    the style chosen for a piece (this visit, else stored), null = HOME
 *   drumStyleFor(pieceId, sound?): StyleId  the style that plays (chosen, else HOME of `sound`, default the sound now)
 *   drumMenuFor(pieceId, sound?): DrumMenuItem[]   the DRUMS row's list: HOME first (id "home"), then the sound's family,
 *                                             then the fugue's own picks (FUGUE_PICKS, D532), then every other style;
 *                                             each { id, name, style, family, home, fits }
 *   FUGUE_PICKS, curatedFor(pieceId, sound)  D532: a fugue's own period picks; its curated styles (family + picks)
 *   drumPresetsFor = drumMenuFor; setDrumPreset = setDrumStyle   (the names src/bench/drum-presets-link.ts registers
 *                                             with LiteDrums.tsx registerDrumPresets, D450: the row cycles the menu)
 *   PLANNED_STYLES                          empty since D532 (S3's styles all playable)
 *
 * ENGINES: "grid" a written pattern (drum-grids.ts GRIDS) under D514's form machinery (drum-presets.ts kitBeat) on a
 * recorded or synthesized kit; "kit" D514's own patterns (rock, chip, timpani, frame); the bands' own drummers, folded in
 * as styles, not copied: "brushes" (D503 JAZZ QUARTET, jazz-drums.ts), "rockBand" (D523 ABBEY ROAD, D525 KRAUTROCK,
 * rock-drums.ts), "latin" (D520 SALSA, D522 CHORINHO, latin-drums.ts), "bossa" (D521, bossa-drums.ts), "pet" (D524 PET
 * SOUNDS, pet-drums.ts); "score" (D532: the orchestral and period styles read from the fugue's score, score-drums.ts).
 * chip.ts Chip.groove plays each; every stroke goes through Chip.scheduleKitHit.
 *
 * To add a style: a GRIDS entry (or an engine), a STYLES row here (family, label, metres), and it is in styleIds,
 * the menus, the Sound Lab and the tests (test/d526-drum-library.test.ts plays every style on every fugue).
 * ===============================================================================================================
 *
 * The selection is kept per piece this visit, and read from the selection screen's store (LiteDrums.tsx: the key
 * `tb-lite-drum-preset:<piece>`), so a choice made on play.html's DRUMS row reaches the drummer.
 */
import { beatOf, fugueById, type TouchFugue } from "./fugue.ts";
import { isCharacter, stylesFor } from "./drum-presets.ts";
import { metreClass, type MetreClass } from "./drum-grids.ts";
import { preset } from "./sound.ts";
import { PIECE_SOUND } from "./piece-sound.ts";
import { worldOf } from "./prelude-plan.ts";

export type Family = "rock" | "jazz" | "latin" | "electronic" | "orchestral";
export type Metre = MetreClass;
export type Engine = "grid" | "kit" | "brushes" | "rockBand" | "latin" | "bossa" | "pet" | "score" | "none";
export interface StyleInfo {
  id: string;
  family: Family;
  /** Short caps, <= 10 characters (the DRUMS row shows it as given in every language). */
  label: string;
  /** The metres it FITS (idiomatic); it plays in every metre. */
  metres: readonly Metre[];
  engine: Engine;
  why: string;
}
export const FAMILIES: readonly Family[] = ["rock", "jazz", "latin", "electronic", "orchestral"];
const D: Metre = "duple";
const T: Metre = "triple";
const C: Metre = "compound";
const S = (id: string, family: Family, label: string, metres: Metre[], engine: Engine, why: string): StyleInfo => ({ id, family, label, metres, engine, why });

/** The library (FAMILIES' order; each family's first the plainest). */
export const STYLES: readonly StyleInfo[] = [
  S("rock", "rock", "ROCK", [D], "kit", "straight rock: the kick on 1 and 3, the snare on the backbeat, the hats in eighths (D514's ROCK KIT)"),
  S("poprock", "rock", "POP ROCK", [D], "grid", "pop-rock: the kick's push on the and of 3, a tambourine on 2 and 4"),
  S("abbey", "rock", "ABBEY ROAD", [D, C], "rockBand", "Ringo, 1967-69: the hat and cross-stick, melodic tom fills into the entries (ABBEY ROAD's own, D523)"),
  S("psych", "rock", "PSYCH", [D, T, C], "grid", "psychedelic: loose, the ride washing, a soft crash on the bar, the floor tom"),
  S("motorik", "rock", "MOTORIK", [D], "rockBand", "Klaus Dinger's motorik: hypnotic, constant, no rolls (KRAUTROCK's own, D525)"),
  S("liebezeit", "rock", "LIEBEZEIT", [D, T, C], "grid", "Jaki Liebezeit on Tago Mago: interlocking toms and hats, the snare's ghosts, a loop evolving every six bars, never a fill (D566)"),
  S("ballad", "rock", "6/8 BALLAD", [C, T], "grid", "a 6/8 rock ballad: triplets on the hats, the snare on 2 and 4 of the 12/8"),
  S("shuffle", "rock", "SHUFFLE", [D, C], "grid", "a shuffle: the triplet's long-short on the hats, the snare's ghosts"),
  S("pet", "rock", "PET SOUNDS", [D, C], "pet", "Hal Blaine's ballad kit, the tambourine, the timpani (PET SOUNDS' own, D524)"),
  S("brushes", "jazz", "BRUSHES", [D, T, C], "brushes", "Swirly Drums' brushes: the stir, the taps, the fills (JAZZ QUARTET's own, D503)"),
  S("jazz", "jazz", "SWING", [D, C], "grid", "swing on the ride: ding, ding-a; the hi-hat's foot on 2 and 4, the bass drum feathered"),
  S("bebop", "jazz", "BEBOP", [D], "grid", "bebop: the ride quick, bombs off the beat, the snare comping"),
  S("jazzWaltz", "jazz", "JAZZ WALTZ", [T], "grid", "a jazz waltz: the ride across the three, the foot on 2 and 3"),
  S("swell", "jazz", "SWELL", [D, T, C], "score", "mallets on the toms, cymbal swells like the sea, a brush on the subject, the snare only at a few arrivals (D572)"),
  S("salsa", "latin", "SALSA", [D], "latin", "congas, timbales, bongó's bell, the clave (SALSA's own, D520)"),
  S("bossa", "latin", "BOSSA", [D], "bossa", "the bossa's cross-stick and the brushes (BOSSA NOVA's own, D521)"),
  S("choro", "latin", "CHORO", [D], "latin", "the pandeiro, the surdo's pulse, samba-choro (CHORINHO's own, D522)"),
  S("baiao", "latin", "BAIÃO", [D], "grid", "baião: the zabumba's open and muted strokes, the stick off the beat, the triangle"),
  S("machine", "electronic", "808", [D], "grid", "an analog 808: the electro kick, the clap on the backbeat, closed hats"),
  S("house", "electronic", "HOUSE 909", [D], "grid", "a 909's four on the floor, the clap on 2 and 4, the open hat off the beat"),
  S("techno", "electronic", "TECHNO", [D], "grid", "techno: four on the floor, the hats' sixteenths, the rim's syncopation"),
  S("breakbeat", "electronic", "BREAKBEAT", [D, C], "grid", "the classic breaks re-written: the kick's double, the snare's ghosts, swing, a layered kick and snare; 12/8 a half-time shuffle (D565)"),
  S("dnb", "electronic", "DRUM&BASS", [D, C], "grid", "jungle / drum'n'bass at 170: the two-step, the broken second bar (for the quick fugues)"),
  S("triphop", "electronic", "TRIP-HOP", [D, C], "grid", "trip-hop: slow, heavy, pitched down, the sixteenths lazy (for the slow fugues)"),
  S("linn", "electronic", "LINNDRUM", [D], "grid", "an 80s LinnDrum: the big snare and clap, the sixteenth hats"),
  S("lofi", "electronic", "LO-FI", [D, C], "grid", "lo-fi hip-hop: the kick behind the beat, the sixteenths lazy, the kit dull"),
  S("idm", "electronic", "IDM GLITCH", [D, T, C], "grid", "IDM / glitch: the break cut up, displaced kicks, stuttered ghosts, clicks, a layered kick and snare (D565)"),
  S("chip", "electronic", "CHIP KIT", [D, T, C], "kit", "a console's noise channel, a tracker's kit (D514's CHIP DRUMS)"),
  S("arcade", "electronic", "ARCADE", [D, T, C], "grid", "videogame drums for the pinball fugues: a swept chip kick, a noise snare, square-click hats, bouncing (D568)"),
  S("scoreSynth", "electronic", "SYNTH KIT", [D, T, C], "score", "an analog kit read from the score: the subject's rhythm on the hats, the bass's accents on the kick, the episodes lighter, the cadences marked (D570)"),
  // D532: the orchestral and period styles are SCORE-DRIVEN (score-drums.ts): no loop; the bass's accents, the subject's
  // rhythm in its entries, the cadences, the structural arrivals, read from each fugue's own score.
  // D891: the TIMPANI, the TABOR and the FIELD DRUM withdrawn (the owner's decision); score-drums.ts keeps their engine (the
  // timpani's rule still serves PET SOUNDS' kit, "pet"), no menu offers them, a stored choice of one plays the piece's HOME.
  S("frame", "orchestral", "FRAME DRUM", [T, C], "score", "frame drums on the bass's accents and the subject's rhythm, the tambourine shaken into the entries (D532)"),
  S("military", "orchestral", "SIDE DRUM", [D, T], "score", "Lully's side drum, for the French overture: the dotted rhythm of the subject, flams on the bass's accents, ruffs at the cadences (D532)"),
  S("castanets", "orchestral", "CASTANETS", [T, C], "score", "Spanish baroque castanets: the subject's rhythm, the bass's accents, carretillas into the cadences (D532)"),
  S("janissary", "orchestral", "JANISSARY", [D], "score", "alla turca: the bass drum on the bass's accents, the cymbals with the strongest, the triangle on the subject (D532)"),
  S("march", "orchestral", "MARCH", [D, T, C], "score", "a military march: the subject's rhythm on the side drum with flams, drags and rolls into the entries, the bass drum on the strong beats, the cymbals at the arrivals (D567)"),
  S("stooges", "orchestral", "STOOGES", [D, T, C], "score", "slapstick: woodblock and temple blocks on the score's rhythms, a ratchet, a whistle-like sweep, the bonk on the cadences (D569)"),
];
export type StyleId = (typeof STYLES)[number]["id"];
/**
 * D892, NO DRUMS: a HOME that plays nothing (CLASSIC CHIP's since D892, a piece's own where no remaining kit fits it: the
 * slow fugues, D893). Not in STYLES (no family, never in the rest of the menu): the DRUMS row's first entry where it is the
 * HOME, so DRUMS on with nothing chosen is silent there; any style can still be chosen.
 */
export const NO_DRUMS = "none";
const NONE_INFO: StyleInfo = S(NO_DRUMS, "electronic", "NO DRUMS", [D, T, C], "none", "no drums: the piece plays alone (D892)");
/** D891: the withdrawn kits (a stored choice of one reads as HOME). */
export const WITHDRAWN_STYLES: ReadonlySet<string> = new Set(["timpani", "tabor", "fieldDrums"]);
const BY_ID = new Map([...STYLES, NONE_INFO].map((s) => [s.id, s]));
export const styleIds: readonly StyleId[] = FAMILIES.flatMap((fam) => STYLES.filter((s) => s.family === fam).map((s) => s.id));
/** The style an unknown id is read as. */
export const HOME_FALLBACK: StyleId = "rock";
export const isStyle = (id: unknown): id is StyleId => typeof id === "string" && BY_ID.has(id);
export const styleInfo = (id: string): StyleInfo => BY_ID.get(id) ?? BY_ID.get(HOME_FALLBACK)!;
export const stylesIn = (family: Family): StyleId[] => styleIds.filter((id) => styleInfo(id).family === family);

/** S3's period and orchestral styles: all playable since D532 (military, castanets, janissary in STYLES; D891: the tabor and the field drums withdrawn). */
export const PLANNED_STYLES: readonly { id: string; family: Family; label: string }[] = [];

/**
 * Each sound's HOME (first) and family: the styles that suit it. The bands their own drummers; the chips the console's
 * kit or the tracker's breaks; the synthesizers a drum machine of their time; the piano Jacques Loussier's swing; the
 * church's, the court's and the chamber's sounds D514's timpani or frame drums (S3 gives them their period kits).
 */
export const SOUND_STYLES: Readonly<Record<string, readonly StyleId[]>> = {
  abbeyRoad: ["abbey", "psych", "poprock", "rock", "ballad", "shuffle", "pet"],
  krautrock: ["motorik", "liebezeit", "rock", "psych", "techno", "idm"],
  bossaNova: ["bossa", "baiao", "choro", "brushes", "lofi"],
  salsa: ["salsa", "choro", "baiao", "bossa"],
  chorinho: ["choro", "baiao", "bossa", "salsa"],
  jazzQuartet: ["brushes", "jazz", "bebop", "jazzWaltz", "bossa"],
  pianoSampled: ["jazz", "brushes", "jazzWaltz", "bebop", "ballad", "triphop"],
  // D892: CLASSIC CHIP without its drum (the owner): NO DRUMS its HOME, the chip kit out of its family (GAME BOY and SID 64 keep it).
  chip: ["none", "machine", "linn", "idm", "breakbeat"],
  gameboy: ["chip", "idm", "machine", "breakbeat"],
  sid64: ["chip", "linn", "idm", "machine", "techno"],
  super16: ["lofi", "chip", "breakbeat", "triphop", "linn"],
  analog: ["machine", "techno", "house", "linn", "idm"],
  tomita: ["triphop", "idm", "machine", "lofi", "psych"],
  vocalSynth: ["house", "linn", "techno", "machine", "triphop"],
  // D532: the period sounds' families take the period kits: the court's band and the brass the side drum and the
  // Janissaries, the dances' sounds the tabor and the castanets, the church's and the consort's the field drums.
  harpsichordSampled: ["frame", "castanets", "brushes"],
  // D891: the PIPE ORGAN's timpani and field drums withdrawn: NO DRUMS its HOME (the chorales, the Ricercar a 6), the frame drum and the swell a choice.
  chamberOrgan: ["none", "frame", "swell"],
  soloVoices: ["frame", "brushes"],
  stringConsort: ["frame", "ballad"],
  // D891: BAROQUE BAND's timpani withdrawn: Lully's side drum its HOME.
  baroqueBand: ["military", "castanets", "janissary", "frame"],
  oboeTrio: ["frame", "castanets", "baiao"],
  // D567: the owner: "The Janissary drum is boring and shitty, I hate it. A more march-like preset would work better":
  // MARCH is BACH BRASS's HOME, the Janissaries out of its family (still in the library).
  bachBrass: ["march", "military", "frame"],
  trialWinds: ["frame"],
  // D586-D590, the setups' new sounds: BERLIN SCHOOL a drum machine of its time; VAUDEVILLE the score's period kits (the
  // slapstick's blocks and ratchet once the drums session's STOOGES lands, FUGUE_STYLES); FLUTE & HARP the brushes and the frame
  // cymbal washes (its SWELL likewise); ORCHESTRA & ORGAN the timpani and the field drums.
  berlinSchool: ["scoreSynth", "machine", "techno", "idm", "linn"],
  vaudeville: ["stooges", "frame", "castanets"],
  fluteHarp: ["swell", "brushes", "psych", "jazzWaltz"],
  orchestraOrgan: ["march", "frame"],
};
/**
 * D532: a fugue's own period picks (after its sound's family on the DRUMS menu): the French overture (I/5) the side drum,
 * the festive D major (II/5) the Janissaries, the gigues and passepieds the tabor or the castanets, the laments the field
 * drums. Each with a tailored tweak (score-drums.ts TWEAKS).
 */
export const FUGUE_PICKS: Readonly<Record<string, readonly StyleId[]>> = {
  // D565-D574 (the owner's verdicts after 2.50): I/2 the synth kit read from its score; II/4 the break and the glitch;
  // I/15's and II/24's pinball the arcade's kit (the tabor and the castanets out: "Didn't like this as tabor and pipe");
  // I/19 the slapstick; I/20 Jaki Liebezeit's trance; II/18 the sea's swell; I/24's finale the staged timpani (D596: SYNTH KIT's staged build first, on SID 64).
  wtc1f02: ["scoreSynth"],
  wtc2f04: ["breakbeat", "idm"],
  wtc1f19: ["stooges"],
  wtc1f20: ["liebezeit"],
  wtc2f18: ["swell"],
  wtc1f05: ["military"],
  wtc2f05: ["march", "military"],
  wtc1f09: ["castanets"],
  wtc1f10: ["castanets"],
  wtc1f11: ["castanets"],
  wtc1f15: ["arcade", "scoreSynth"],
  wtc1f24: ["scoreSynth"],
  wtc2f15: ["castanets"],
  wtc2f16: ["castanets"],
  wtc2f21: ["castanets"],
  wtc2f22: ["liebezeit"],
  wtc2f24: ["arcade", "scoreSynth"],
};
/** D532: a fugue's curated styles for a sound: the sound's family, then the fugue's own picks. */
export const curatedFor = (pieceId: string, sound: string): readonly StyleId[] => [...new Set([...familyFor(sound), ...(FUGUE_PICKS[pieceId] ?? [])])];
export const homeStyleFor = (sound: string): StyleId => SOUND_STYLES[sound]?.[0] ?? HOME_FALLBACK;
/**
 * D585, THE FUGUE'S OWN DRUMS: a fugue's default style where it plays on its own sound (piece-sound.ts PIECE_SOUND), in
 * place of the sound's HOME (the owner, on the Sound Lab's IDEAS: I/1's lo-fi, II/12's bebop, II/3's 909, II/4's glitch
 * "worked out"; the brief's table for the rest). On any other sound the sound's HOME plays, as before. A style the library
 * does not have yet (the drums session's new ones) plays its nearest kin until it lands (FUGUE_STYLE_STANDIN), with no
 * change here.
 */
export const FUGUE_STYLES: Readonly<Record<string, string>> = {
  // D1045: the Musical Offering's canons and the Fuga canonica, all calm (the busiest voice 0.9-2.8 notes a second): no drums (D894).
  "bwv1079-2": NO_DRUMS,
  "bwv1079-3a": NO_DRUMS,
  "bwv1079-3b": NO_DRUMS,
  "bwv1079-3c": NO_DRUMS,
  "bwv1079-3d": NO_DRUMS,
  "bwv1079-3e": NO_DRUMS,
  "bwv1079-4": NO_DRUMS,
  "bwv1079-6": NO_DRUMS,
  "bwv1079-7": NO_DRUMS,
  "bwv1079-9": NO_DRUMS,
  // D999: II/20's prelude on ANALOG: ARCADE (II/24's own on the same sound), not the sound's 808, whose last-chord accent
  // (held at chip.ts ACCENT_MAX, a grid style: no TWEAKS) sits right on D601's 1 dB margin under the band (0.0 dB inside).
  wtc2p20: "arcade",
  wtc1f01: "lofi",
  wtc1f02: "scoreSynth",
  wtc1f05: "march",
  wtc1f15: "scoreSynth", // D894: I/15 on CHORINHO (D893): its other pick, the synth kit read from the score, 98 % on the onsets (ARCADE's pulse out of its band at this tempo)
  wtc1f19: "stooges",
  wtc1f20: "liebezeit",
  // D596: I/24 on SID 64: SYNTH KIT, the score-driven electronic kit, keeps D574's staged build (no timpani on a chip kit).
  wtc1f24: "scoreSynth",
  wtc2f03: "house",
  wtc2f04: "idm",
  wtc2f05: "march",
  wtc2f12: "bebop",
  wtc2f18: "swell",
  // D603: II/6 (the owner: the drums "don't fit … it wants something energetic and dancey"): HOUSE 909, four on the floor at
  // 106 (its eighth's pulse), its hats on the music's straight semiquavers: 82% of its strokes on the score's own onsets
  // (BREAKBEAT 46%, IDM 39%, ARCADE 47%), 5.2 strokes a second against the chip kit's 2.7.
  // D622: the owner on HOUSE: "That didn't fit. Try another drum."; of D620's candidates he chose BREAKBEAT as tailored to
  // II/6's score (drum-tailor.ts GRID_TAILORS.wtc2f06: the semiquavers, swung where the music runs in triplets, the hats on
  // the subject's run, the leap marked): 93% of its strokes on the score's onsets.
  wtc2f06: "breakbeat",
  // D595: II/22 on KRAUTROCK, Jaki Liebezeit's trance (the owner: "sounds much cooler as Krautrock").
  wtc2f22: "liebezeit",
  // (II/24: ARCADE over SYNTH KIT by ear-proxy, D587: the synth kit's snare on every quaver at one velocity, sd 0.05,
  // 69% of its gaps alike; the arcade's 45%, sd 0.10.)
  wtc2f24: "arcade",
  // D712: the Art of Fugue, each on its own sound (D708), by the brass research's drum-fit criteria (section 4: the
  // metre, the energy, the drummer's pulse in the style's band, the character) and the share of the strokes on the score's
  // own onsets (tools/touch/drum-fit/score.ts), the gap under the band measured (D601's renders; test/d601 holds it).
  "bwv1080-01": "swell", // stile antico, calm (1.8 notes/s): the washes at the arrivals, no beat (77 % on the onsets)
  "bwv1080-02": "jazz", // the dotted subject, moderate: the ride's swing at 106 (band 96-200), 93 % on the onsets
  "bwv1080-03": "triphop", // chromatic, introspective, calm: "at most trip-hop", 72 a minute (68-96), 70 %
  "bwv1080-04": "motorik", // the long sequences at 134: KRAUTROCK's own drummer, 96 %
  "bwv1080-05": "bossa", // the lilting counter-fugue: BOSSA NOVA's own, 90 %
  "bwv1080-06": NO_DRUMS, // D894: on TOMITA (D893), slow: no drums (the owner's Contrapunctus 3)
  "bwv1080-07": "bossa", // the augmentations, slow: BOSSA NOVA's own (D709: on ABBEY ROAD the bass stood under), 98 %
  "bwv1080-08": "chip", // angular, a 3, on SID 64: its own chip kit, 89 % (SYNTH KIT's coda roll stood 1.7 LU over the band: D713)
  "bwv1080-09": "liebezeit", // quick and motoric at 140: Jaki Liebezeit's trance at 70 (62-104), 98 %
  "bwv1080-10": NO_DRUMS, // D894: on TOMITA, slow: no drums
  "bwv1080-11": NO_DRUMS, // D894: the field drums withdrawn (D891); slow, on TOMITA: no drums
  "bwv1080-12r": NO_DRUMS, // D894: on BERLIN SCHOOL (D893), the slow 3/2: no drums
  "bwv1080-12i": NO_DRUMS,
  "bwv1080-13r": NO_DRUMS, // D892: CLASSIC CHIP without its drum; no remaining kit clearly fits (its family's at 64-69 % on the onsets)
  "bwv1080-13i": NO_DRUMS,
  "bwv1080-c14": "triphop", // the canon by augmentation, calm-moderate: trip-hop at 72 (68-96), 85 %
  "bwv1080-c15": "chip", // the 9/16 gigue, driving: GAME BOY's own chip kit, 99 %
  "bwv1080-c16": NO_DRUMS, // D894: the tabor withdrawn (D891); on SALSA (D893), calm: no drums
  "bwv1080-c17": "scoreSynth", // brisk triplets at 134: BERLIN SCHOOL's own synth kit from the score, 94 %
  "bwv1080-14": NO_DRUMS, // D894: the timpani withdrawn; on TOMITA, the slowest: no drums
  // D735: the Inventions and Sinfonias, each on its own sound (D731), by the same criteria (tools/touch/drum-fit/score.ts:
  // the style FITS the metre, a grid's pulse in its band, at least 65 % of the strokes on the score's onsets: here 83-100 %),
  // the gap under the band measured (D601's renders; test/d601 holds it).
  bwv772: "chip", // the first Invention on GAME BOY: its own chip kit
  bwv773: "scoreSynth", // the canon on BERLIN SCHOOL: its own synth kit read from the score
  bwv774: "castanets", // D894: the tabor withdrawn (D891): the castanets, its period kin (FITS 3/8; CHORINHO's own fit no 3/8; the frame drum's roll in b. 58 only 0.8 dB under the band, inside D601's 1 dB margin), 98 % on the onsets
  bwv775: "chip", // the perpetuum mobile on SID 64: its own kit
  bwv776: "brushes", // the melody over the running bass: JAZZ QUARTET's brushes
  bwv777: "brushes", // the syncopated 3/8: the brushes (BOSSA's grid does not fit it)
  bwv778: "brushes", // the sighing E minor on BOSSA NOVA: the brushes, quieter than its bossa
  bwv779: "chip", // Carlos's F major in 3/4: the chip kit, an electronic kit read from the score (the drum machines' grids do not fit 3/4; SYNTH KIT's roll at b. 34 stood 1.4 LU over the band, D601)
  bwv780: "swell", // slow and chromatic: washes at the arrivals, no beat
  bwv781: "chip", // the 9/8 gigue on GAME BOY: its own kit
  bwv782: "swell", // D894: on ZELENKA TRIO (D893), slow: its washes kept, 100 %
  bwv783: "brushes", // the pastoral 12/8 on JAZZ QUARTET: its brushes
  bwv784: "brushes", // D894: on the harpsichord (D893): the brushes of its family, 100 %
  bwv785: "chip", // Carlos's B♭ on SWITCHED-ON: the chip kit, an electronic kit read from the score (MACHINE's fill stood within 1 dB of the band by D601's model)
  bwv786: "triphop", // D894: on ZELENKA TRIO (D893): its trip-hop kept, 97 % (its family's frame and castanets do not fit 4/4)
  bwv787: "lofi", // SUPER 16-BIT's own, 76 a minute (68-92)
  bwv788: "brushes", // the lilting 12/8 on TOMITA: brushes (its machines' grids do not fit 12/8)
  bwv789: "motorik", // the walking trio on KRAUTROCK: its own drummer
  bwv790: "abbey", // the slow trio on ABBEY ROAD: its own
  bwv791: NO_DRUMS, // D894: on BAROQUE BAND (D893), the slow song: no drums
  bwv792: NO_DRUMS, // D894: the tabor withdrawn; calm (1.7 notes a second): no drums
  bwv793: "swell", // chromatic, introspective, calm: washes, no beat
  bwv794: "abbey", // the lively trio on ABBEY ROAD: its own
  bwv795: "swell", // slow, three subjects: washes at the arrivals
  bwv796: "chip", // the bright 3/4 on SID 64: its own kit
  bwv797: NO_DRUMS, // D892: CLASSIC CHIP without its drum; calm (2.0 notes a second): no drums
  bwv798: "lofi", // SUPER 16-BIT's own, 80 a minute (68-92)
  bwv799: NO_DRUMS,
  bwv800: "salsa", // D924: SALSA's own percussion (D923's calmer rows), not the bossa's brushes (their stir and taps the hiss over 7 kHz on SALSA's band), 98 % on the onsets
  bwv801: "liebezeit", // the driving 9/16 on KRAUTROCK: Jaki Liebezeit's trance, 68 a minute (62-104)
  // D744: the Four Duets, each on its own sound (D741), by the same criteria (score.ts: FITS, the pulse in its band, the onsets).
  bwv802: "scoreSynth", // the chromatic 3/8 on BERLIN SCHOOL: its own synth kit read from the score, 99 %
  bwv803: "chip", // the bright 2/4 on GAME BOY: its own chip kit, 95 %
  bwv804: "brushes", // the 12/8 gigue on JAZZ QUARTET: its brushes, 100 %
  bwv805: "motorik", // the alla breve fugue on KRAUTROCK: its own drummer, 92 %
  // D774: the Chromatic Fugue on FLUTE & HARP: the timpani, tonic and dominant at the arrivals only (the engine's rule), its climaxes marked, 87 % on the onsets.
  "bwv903-2": NO_DRUMS, // D894: the timpani withdrawn; calm (2.5 notes a second): no drums
  // D779: the Albinoni Fugue on STRING CONSORT: its FIELD DRUM, the muffled drum's rolls into the arrivals, 100 % on the onsets.
  bwv951: NO_DRUMS, // D894: the field drum withdrawn; calm: no drums
  // D784: BWV 906 and 998, each on its sound's own family (score.ts: FITS, the onsets; D601's renders: no stroke over the band).
  "bwv906-1": "brushes", // the Fantasia on JAZZ QUARTET: its brushes, 99 % on the onsets
  "bwv906-2": "abbey", // the unfinished fugue on ABBEY ROAD: its own drummer, 97 %
  "bwv998-1": NO_DRUMS, // D894: the tabor withdrawn; calm (2.85 notes a second): no drums
  "bwv998-2": "salsa", // D924: the Fugue on SALSA: its own percussion, not the bossa's brushes (as bwv800), 84 % on the onsets
  "bwv998-3": NO_DRUMS, // D894: the tabor withdrawn; no remaining kit stays under the band in its thin bars (D601: the castanets one stroke only 0.9 dB under in b. 58, inside the 1 dB margin; the frame drum, the side drum, MARCH and SYNTH KIT more strokes): no drums
  // D894: the pieces whose own drums were withdrawn (D891) or whose sound was (D893), and CLASSIC CHIP's (D892); calm ones
  // (under 3 notes a second, D618's line) play none, the owner's lean (slow fugues alone).
  wtc1f09: "military", // BAROQUE BAND's timpani withdrawn: Lully's side drum, its new HOME, 100 % on the onsets
  wtc2f11: "breakbeat", // CLASSIC CHIP without its drum, but the 6/16 runs (3.3 notes a second): the break fits clearly, 99 % on the onsets, in its band
  wtc2f15: "castanets", // on ABBEY ROAD (D893), 3/8: its own pick, the castanets, 100 % (ABBEY ROAD's own does not fit 3/8; PSYCH's pulse out of its band)
  wtc2f16: NO_DRUMS, // BAROQUE BAND, calm (2.3 notes a second)
  wtc2f21: NO_DRUMS, // BAROQUE BAND, calm (2.1)
  wtc1f17: NO_DRUMS, // on FLUTE & HARP (D893), solemnly slow
  // D902: the Goldberg Variations, a keyboard work kept close to it: no drums on any (D892's NO DRUMS), on whatever sound.
  "bwv988-00": NO_DRUMS,
  "bwv988-01": NO_DRUMS,
  "bwv988-02": NO_DRUMS,
  "bwv988-03": NO_DRUMS,
  "bwv988-04": NO_DRUMS,
  "bwv988-05": NO_DRUMS,
  "bwv988-06": NO_DRUMS,
  "bwv988-07": NO_DRUMS,
  "bwv988-08": NO_DRUMS,
  "bwv988-09": NO_DRUMS,
  "bwv988-10": NO_DRUMS,
  "bwv988-11": NO_DRUMS,
  "bwv988-12": NO_DRUMS,
  "bwv988-13": NO_DRUMS,
  "bwv988-14": NO_DRUMS,
  "bwv988-15": NO_DRUMS,
  "bwv988-16": NO_DRUMS,
  "bwv988-17": NO_DRUMS,
  "bwv988-18": NO_DRUMS,
  "bwv988-19": NO_DRUMS,
  "bwv988-20": NO_DRUMS,
  "bwv988-21": NO_DRUMS,
  "bwv988-22": NO_DRUMS,
  "bwv988-23": NO_DRUMS,
  "bwv988-24": NO_DRUMS,
  "bwv988-25": NO_DRUMS,
  "bwv988-26": NO_DRUMS,
  "bwv988-27": NO_DRUMS,
  "bwv988-28": NO_DRUMS,
  "bwv988-29": NO_DRUMS,
  "bwv988-30": NO_DRUMS,
};
/** D585: the stand-in for a fugue's style the library does not have yet (its nearest kin among the styles it has). */
export const FUGUE_STYLE_STANDIN: Readonly<Record<string, StyleId>> = {
  scoreSynth: "machine",
  arcade: "chip",
  stooges: "frame",
  liebezeit: "motorik",
  march: "military",
  swell: "brushes",
};
/** D585: the fugue's own style (FUGUE_STYLES, or its stand-in), or null where it has none. */
export function fugueStyle(pieceId: string): StyleId | null {
  // D984: a prelude shares its fugue's drums where those are NO DRUMS (looked up by world, prelude-plan.ts `worldOf`).
  if (FUGUE_STYLES[worldOf(pieceId)] === NO_DRUMS) return NO_DRUMS;
  const want = FUGUE_STYLES[pieceId];
  if (!want) return null;
  return isStyle(want) ? want : (FUGUE_STYLE_STANDIN[want] ?? null);
}
/**
 * D618, A SOUND'S HOME BY FUGUE: where a sound's HOME does not suit a fugue, the fugue's own HOME on that sound (any
 * fugue, on its own sound or not; a fugue's own style on its own sound, FUGUE_STYLES, still first). BACH BRASS's MARCH on
 * its calm fugues (the brass research's drum-fit criteria, section 4: the busiest voice under 3 notes a second, tempi.ts
 * TEMPO busiest) falls back to the score-driven orchestral drums: FIELD DRUM (the muffled drum: long rolls into the
 * arrivals and on the pedals) for the laments (I/8, I/12, I/24, II/8, II/22, the research's "pathetic, lament"), TIMPANI
 * (the tonic and dominant at the structural arrivals only) for the stile antico (I/22, II/9) and the other calm ones (I/16,
 * I/18, II/2), and for the compound ones whatever their character (I/14 in 6/4, II/18 in 6/8: FIELD DRUM is not idiomatic
 * in a compound metre, FITS). II/5 (calm by its notes, a festive alla breve: MARCH's own, D600) keeps its MARCH.
 * D891: the field drums and the timpani withdrawn: these calm fugues on BACH BRASS play NO DRUMS (the owner's lean: the slow
 * fugues alone, D893).
 */
export const SOUND_FUGUE_HOME: Readonly<Record<string, Readonly<Record<string, StyleId>>>> = {
  bachBrass: {
    wtc1f08: NO_DRUMS,
    wtc1f12: NO_DRUMS,
    wtc1f14: NO_DRUMS,
    wtc1f16: NO_DRUMS,
    wtc1f18: NO_DRUMS,
    wtc1f22: NO_DRUMS,
    wtc1f24: NO_DRUMS,
    wtc2f02: NO_DRUMS,
    wtc2f08: NO_DRUMS,
    wtc2f09: NO_DRUMS,
    wtc2f18: NO_DRUMS,
    wtc2f22: NO_DRUMS,
  },
};
/** D585: the style a fugue's DRUMS play with nothing chosen: the fugue's own on its own sound, else (D618) the sound's HOME for that fugue, else the sound's HOME. */
// D984: and a sound's NO DRUMS for a fugue (SOUND_FUGUE_HOME) its prelude's too, by world.
const soundFugueHome = (pieceId: string, sound: string): StyleId | undefined =>
  SOUND_FUGUE_HOME[sound]?.[pieceId] ?? (SOUND_FUGUE_HOME[sound]?.[worldOf(pieceId)] === NO_DRUMS ? NO_DRUMS : undefined);
export const homeFor = (pieceId: string, sound: string): StyleId => (sound === PIECE_SOUND[pieceId] ? fugueStyle(pieceId) : null) ?? soundFugueHome(pieceId, sound) ?? homeStyleFor(sound);
export const familyFor = (sound: string): readonly StyleId[] => SOUND_STYLES[sound] ?? stylesIn(styleInfo(HOME_FALLBACK).family);

const fugueOf = (f: TouchFugue | string): TouchFugue | null => {
  if (typeof f !== "string") return f;
  const g = fugueById(f);
  return g.id === f ? g : null;
};
/** The fugue's metre: compound where its beat divides in three (6/8, 9/8, 12/8, 6/16, 12/16, 6/4), triple in threes (3/4, 3/8, 3/2), else duple. */
export function metreOf(fugue: TouchFugue | string): Metre {
  const f = fugueOf(fugue);
  if (!f) return "duple";
  const b = beatOf(f);
  const den = Number(f.meter.split("/")[1]);
  return metreClass(b.perBar, b.ticks !== f.tpq * (4 / den));
}
export const fits = (style: string, fugue: TouchFugue | string): boolean => styleInfo(style).metres.includes(metreOf(fugue));

// ---------------------------------------------------------------------------------------------------------------
// The choice.

/** The selection screen's stored choice (src/bench/LiteDrums.tsx), read where nothing was set this visit. */
export const STORED_PRESET_KEY = (pieceId: string) => `tb-lite-drum-preset:${pieceId}`;
/** The DRUMS row's first entry: the sound's HOME, whatever the sound. */
export const HOME_ID = "home";
const chosen = new Map<string, StyleId | null>();
let currentPiece: string | null = null;
/** A stored or given id as a style (null: HOME). */
function readChoice(pieceId: string, id: unknown): StyleId | null {
  if (isStyle(id)) return id;
  // D891: a D514 character read as a withdrawn style (its TIMPANI) is HOME.
  if (isCharacter(id)) { const st = stylesFor(pieceId)[id]; return isStyle(st) ? st : null; }
  return null;
}
/** Chooses the drums the backing plays for a piece ("home" or an unknown id: the sound's HOME). It does not turn DRUMS on. */
export function setDrumStyle(pieceId: string, style: string) {
  chosen.set(pieceId, readChoice(pieceId, style));
  currentPiece = pieceId;
}
/** D941: a choice made for this visit forgotten (BASICS's own beat: the piece's stored choice, or HOME, again). */
export function forgetDrumStyle(pieceId: string) {
  chosen.delete(pieceId);
}
/** The style chosen for a piece (this visit, else stored), null where HOME plays. */
export function chosenStyle(pieceId: string): StyleId | null {
  if (chosen.has(pieceId)) return chosen.get(pieceId)!;
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(STORED_PRESET_KEY(pieceId)) : null;
    return readChoice(pieceId, s);
  } catch {
    return null;
  }
}
const soundNow = () => preset().id;
/** The style the drums play for a piece: the chosen one, else the fugue's own on its own sound (D585), else the HOME of the sound (the one playing, by default). */
export const drumStyleFor = (pieceId: string, sound: string = soundNow()): StyleId => chosenStyle(pieceId) ?? homeFor(pieceId, sound);
/** The piece last chosen for (the sound's loading asks it before a piece's first beat). */
export const drumPiece = () => currentPiece;

/** The DRUMS row's entry (LiteDrums.tsx DrumPreset: id and name; the rest for the Sound Lab and S5's grid). */
export interface DrumMenuItem {
  id: string;
  name: string;
  style: StyleId;
  family: Family;
  home: boolean;
  fits: boolean;
}
/** The whole library for a piece and sound: HOME first, then the sound's family, then the rest (styleIds' order). */
export function drumMenuFor(pieceId: string, sound: string = soundNow()): DrumMenuItem[] {
  const home = homeFor(pieceId, sound);
  const cur = curatedFor(pieceId, sound);
  const order = [home, ...cur.filter((s) => s !== home), ...styleIds.filter((s) => s !== home && !cur.includes(s))];
  return order.map((style, i) => ({ id: i === 0 ? HOME_ID : style, name: styleInfo(style).label, style, family: styleInfo(style).family, home: i === 0, fits: fits(style, pieceId) }));
}
/** The names the selection screen's link registers (D450's row: STYLE n/N cycles the menu). */
export const drumPresetsFor = drumMenuFor;
export const setDrumPreset = setDrumStyle;
