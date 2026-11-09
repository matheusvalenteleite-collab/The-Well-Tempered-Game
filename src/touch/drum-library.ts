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

export type Family = "rock" | "jazz" | "latin" | "electronic" | "orchestral";
export type Metre = MetreClass;
export type Engine = "grid" | "kit" | "brushes" | "rockBand" | "latin" | "bossa" | "pet" | "score";
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
  S("timpani", "orchestral", "TIMPANI", [D, T, C], "score", "the timpani on the home tonic and dominant at the structural arrivals only; a soft bass drum on the bass line's own accents (D532)"),
  S("frame", "orchestral", "FRAME DRUM", [T, C], "score", "frame drums on the bass's accents and the subject's rhythm, the tambourine shaken into the entries (D532)"),
  S("military", "orchestral", "SIDE DRUM", [D, T], "score", "Lully's side drum, for the French overture: the dotted rhythm of the subject, flams on the bass's accents, ruffs at the cadences (D532)"),
  S("tabor", "orchestral", "TABOR", [T, C], "score", "pipe and tabor: the tabor on the bass's accents, the tambourine on the subject's rhythm, for the dances and gigues (D532)"),
  S("castanets", "orchestral", "CASTANETS", [T, C], "score", "Spanish baroque castanets: the subject's rhythm, the bass's accents, carretillas into the cadences (D532)"),
  S("janissary", "orchestral", "JANISSARY", [D], "score", "alla turca: the bass drum on the bass's accents, the cymbals with the strongest, the triangle on the subject (D532)"),
  S("fieldDrums", "orchestral", "FIELD DRUM", [D, T], "score", "rope-tension field drums: long rolls into the arrivals and on the pedals, flammed accents on the bass (D532)"),
  S("march", "orchestral", "MARCH", [D, T, C], "score", "a military march: the subject's rhythm on the side drum with flams, drags and rolls into the entries, the bass drum on the strong beats, the cymbals at the arrivals (D567)"),
  S("stooges", "orchestral", "STOOGES", [D, T, C], "score", "slapstick: woodblock and temple blocks on the score's rhythms, a ratchet, a whistle-like sweep, the bonk on the cadences (D569)"),
];
export type StyleId = (typeof STYLES)[number]["id"];
const BY_ID = new Map(STYLES.map((s) => [s.id, s]));
export const styleIds: readonly StyleId[] = FAMILIES.flatMap((fam) => STYLES.filter((s) => s.family === fam).map((s) => s.id));
/** The style an unknown id is read as. */
export const HOME_FALLBACK: StyleId = "rock";
export const isStyle = (id: unknown): id is StyleId => typeof id === "string" && BY_ID.has(id);
export const styleInfo = (id: string): StyleInfo => BY_ID.get(id) ?? BY_ID.get(HOME_FALLBACK)!;
export const stylesIn = (family: Family): StyleId[] => styleIds.filter((id) => styleInfo(id).family === family);

/** S3's period and orchestral styles: all playable since D532 (military, tabor, castanets, janissary, fieldDrums in STYLES). */
export const PLANNED_STYLES: readonly { id: string; family: Family; label: string }[] = [];

/**
 * Each sound's HOME (first) and family: the styles that suit it. The bands their own drummers; the chips the console's
 * kit or the tracker's breaks; the synthesizers a drum machine of their time; the piano Jacques Loussier's swing; the
 * church's, the court's and the chamber's sounds D514's timpani or frame drums (S3 gives them their period kits).
 */
export const SOUND_STYLES: Readonly<Record<string, readonly StyleId[]>> = {
  abbeyRoad: ["abbey", "psych", "poprock", "rock", "ballad", "shuffle", "pet"],
  krautrock: ["motorik", "liebezeit", "rock", "psych", "techno", "idm"],
  petSounds: ["pet", "ballad", "poprock", "abbey", "psych", "brushes"],
  bossaNova: ["bossa", "baiao", "choro", "brushes", "lofi"],
  salsa: ["salsa", "choro", "baiao", "bossa"],
  chorinho: ["choro", "baiao", "bossa", "salsa"],
  jazzQuartet: ["brushes", "jazz", "bebop", "jazzWaltz", "bossa"],
  pianoSampled: ["jazz", "brushes", "jazzWaltz", "bebop", "ballad", "triphop"],
  chip: ["chip", "machine", "linn", "idm", "breakbeat"],
  gameboy: ["chip", "idm", "machine", "breakbeat"],
  sid64: ["chip", "linn", "idm", "machine", "techno"],
  tracker: ["breakbeat", "dnb", "chip", "idm", "house"],
  super16: ["lofi", "chip", "breakbeat", "triphop", "linn"],
  megaFm: ["linn", "machine", "breakbeat", "chip", "house"],
  analog: ["machine", "techno", "house", "linn", "idm"],
  tomita: ["triphop", "idm", "machine", "lofi", "psych"],
  vocalSynth: ["house", "linn", "techno", "machine", "triphop"],
  // D532: the period sounds' families take the period kits: the court's band and the brass the side drum and the
  // Janissaries, the dances' sounds the tabor and the castanets, the church's and the consort's the field drums.
  harpsichordSampled: ["frame", "castanets", "tabor", "timpani", "brushes"],
  chamberOrgan: ["timpani", "fieldDrums", "frame"],
  soloVoices: ["frame", "tabor", "timpani", "brushes"],
  stringConsort: ["frame", "fieldDrums", "timpani", "ballad"],
  baroqueBand: ["timpani", "military", "castanets", "janissary", "frame"],
  oboeTrio: ["frame", "tabor", "castanets", "timpani", "baiao"],
  // D567: the owner: "The Janissary drum is boring and shitty, I hate it. A more march-like preset would work better":
  // MARCH is BACH BRASS's HOME, the Janissaries out of its family (still in the library).
  bachBrass: ["march", "timpani", "military", "fieldDrums", "frame"],
  trialWinds: ["frame", "tabor", "timpani"],
};
/**
 * D532: a fugue's own period picks (after its sound's family on the DRUMS menu): the French overture (I/5) the side drum,
 * the festive D major (II/5) the Janissaries, the gigues and passepieds the tabor or the castanets, the laments the field
 * drums. Each with a tailored tweak (score-drums.ts TWEAKS).
 */
export const FUGUE_PICKS: Readonly<Record<string, readonly StyleId[]>> = {
  // D565-D574 (the owner's verdicts after 2.50): I/2 the synth kit read from its score; II/4 the break and the glitch;
  // I/15's and II/24's pinball the arcade's kit (the tabor and the castanets out: "Didn't like this as tabor and pipe");
  // I/19 the slapstick; I/20 Jaki Liebezeit's trance; II/18 the sea's swell; I/24's finale the staged timpani.
  wtc1f02: ["scoreSynth"],
  wtc2f04: ["breakbeat", "idm"],
  wtc1f19: ["stooges"],
  wtc1f20: ["liebezeit"],
  wtc2f18: ["swell"],
  wtc1f05: ["military", "fieldDrums"],
  wtc2f05: ["march", "military"],
  wtc1f09: ["castanets"],
  wtc1f10: ["castanets", "tabor"],
  wtc1f11: ["tabor", "castanets"],
  wtc1f15: ["arcade", "scoreSynth"],
  wtc1f21: ["tabor"],
  wtc1f22: ["fieldDrums"],
  wtc1f24: ["timpani", "fieldDrums"],
  wtc2f11: ["tabor"],
  wtc2f13: ["tabor"],
  wtc2f15: ["tabor", "castanets"],
  wtc2f16: ["castanets"],
  wtc2f21: ["castanets", "tabor"],
  wtc2f24: ["arcade", "scoreSynth"],
};
/** D532: a fugue's curated styles for a sound: the sound's family, then the fugue's own picks. */
export const curatedFor = (pieceId: string, sound: string): readonly StyleId[] => [...new Set([...familyFor(sound), ...(FUGUE_PICKS[pieceId] ?? [])])];
export const homeStyleFor = (sound: string): StyleId => SOUND_STYLES[sound]?.[0] ?? HOME_FALLBACK;
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
  if (isCharacter(id)) return stylesFor(pieceId)[id];
  return null;
}
/** Chooses the drums the backing plays for a piece ("home" or an unknown id: the sound's HOME). It does not turn DRUMS on. */
export function setDrumStyle(pieceId: string, style: string) {
  chosen.set(pieceId, readChoice(pieceId, style));
  currentPiece = pieceId;
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
/** The style the drums play for a piece: the chosen one, else the HOME of the sound (the one playing, by default). */
export const drumStyleFor = (pieceId: string, sound: string = soundNow()): StyleId => chosenStyle(pieceId) ?? homeStyleFor(sound);
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
  const home = homeStyleFor(sound);
  const cur = curatedFor(pieceId, sound);
  const order = [home, ...cur.filter((s) => s !== home), ...styleIds.filter((s) => s !== home && !cur.includes(s))];
  return order.map((style, i) => ({ id: i === 0 ? HOME_ID : style, name: styleInfo(style).label, style, family: styleInfo(style).family, home: i === 0, fits: fits(style, pieceId) }));
}
/** The names the selection screen's link registers (D450's row: STYLE n/N cycles the menu). */
export const drumPresetsFor = drumMenuFor;
export const setDrumPreset = setDrumStyle;
