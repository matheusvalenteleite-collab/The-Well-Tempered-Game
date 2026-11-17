/**
 * D340 (WTC 1.54): writes data/touch/more-bach.json, the MORE BACH tab's pieces in the touch game's
 * shape (src/touch/fugue.ts TouchFugue), from the Mutopia Project's public-domain and CC BY-SA
 * editions (data/sources/{art-of-fugue,musical-offering,bach-inventions,bach-1043}/SOURCE.md):
 *   - the Art of Fugue, BWV 1080: Contrapunctus 1-11, the mirror fugues 12 (a 4) and 13 (a 3), each
 *     rectus and inversus, and the four canons (Contrapunctus 14, the unfinished fugue, stays in
 *     data/touch/pieces.json, from tools/touch/extract.ts, D169);
 *   - the two ricercars of the Musical Offering, BWV 1079;
 *   - the 15 Inventions and 15 Sinfonias, BWV 772-801;
 *   - the Concerto for Two Violins, BWV 1043, its three movements (the player: either solo violin).
 * Each piece is read from the edition's LilyPond file (tools/wtc/lily.py through lily_json.py: the
 * voices as typeset, the pitches as spelled, the bars), each \repeat volta once as printed; where that
 * reader cannot separate the voices (Contrapunctus 1's include files, the mirror fugues' tags) from the
 * edition's own MIDI file, a track a voice, spelled from the LilyPond notes where they agree. Either way
 * the LilyPond and the MIDI are checked against each other note by note (the share printed).
 * Computed as for the WTC (tools/touch/extract.ts, analysis.ts): a fugue's subject and answer (the
 * first two voices' openings, src/wtc/fugue.ts) and its entries (by the head, upright and inverted,
 * in augmentation and diminution), keyed, subject or answer by key; the cadences; the keys the music
 * reaches (entries, else cadences), brought home at the end (homeward). The canons and the concerto
 * have no entries (a canon's every bar is the subject; a concerto's ritornello is not a fugue's).
 * Run: node tools/touch/more-bach.ts   (needs python3 for the LilyPond reader)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePitch } from "../../src/music/pitch.ts";
import { TPQ } from "../../src/wtc/kern.ts";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { findEntriesByHead, findTransformed, line, subjectAndAnswer, type Note as Line } from "../../src/wtc/fugue.ts";
import { readMidi } from "./midi.ts";
import { hyphensOf, readMusicXml, type XmlPart, type XmlScore } from "./musicxml.ts";
import { buildEntries, findCadences, homeward, keySpeller, type Note, type RawEntry } from "./analysis.ts";
import { splitDivisi } from "./divisi.ts";
import { parseExpert, placeExpert, type ExpertFugue } from "./expert.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC = `${ROOT}data/sources/`;

export type Collection = "aof" | "mo" | "inv" | "sin" | "duet" | "keyboard" | "goldberg" | "concerto" | "motet" | "cantata";

interface Spec {
  /**
   * D341: a MusicXML edition instead of Mutopia's (data/sources/<dir>/imslp/<xml>): the parts kept (by
   * index, in order), the bars taken (from, to), the MIDI file checked against, the edition's page.
   */
  xml?: string;
  xmlParts?: number[];
  /** D754: the folder under data/sources/<dir>/ holding the MusicXML ("imslp" where unset; "pdmx"). */
  xmlDir?: string;
  /**
   * D754: the voices from one keyboard part's written layers, top first: each "staff:voice" as MusicXML
   * writes them, several joined by "|" (a line written in more than one layer, or moving staff).
   */
  xmlVoices?: string[];
  /**
   * D756: the bars taken, as ranges of the file's bar numbers joined in order (a movement of a file holding a whole
   * work; a repeat the edition writes out, taken once): the bars numbered again from 1, the time signature the
   * first range's. Instead of fromBar/toBar.
   */
  xmlRanges?: [from: number, to: number][];
  /** D757: xmlRanges counted by the file's measures (from 1), not their written numbers (the Goldberg's restart and repeat); the bars keep their place in the piece (a first ending left out leaves a gap). */
  xmlByIndex?: boolean;
  /** D757: the edition's ornament signs and appoggiaturas kept, as kern's signs on their notes (TouchFugue.ornaments): never written out. */
  keepOrnaments?: boolean;
  /** D757: ornaments the print gives otherwise: at a bar's place and pitch, the signs set ("" none) and/or the appoggiaturas ("Q"/"q" + pitch). */
  ornFixes?: { bar: number; at: string; pitch: string; signs?: string; graces?: string[] }[];
  fromBar?: number;
  toBar?: number;
  page?: string;
  /**
   * D347: syllables to join with a hyphen where the edition writes them apart and nothing in the score
   * shows them joined (musicxml.ts hyphensOf), as "al|ler" (lower case, punctuation left off).
   */
  joins?: string[];
  /** D341: the voice offered first. */
  defaultVoice?: number;
  id: string;
  collection: Collection;
  /** Its place in the tab's section, from 1. */
  number: number;
  title: string;
  /** What the card says it is: "CONTRAPUNCTUS 1", "CANON ALLA OTTAVA"… */
  short: string;
  bwv: string;
  key: string;
  /** The Mutopia piece (data/sources/<dir>/mutopia/<mutopia>/). */
  dir: string;
  mutopia: number;
  /** The LilyPond file (and \score) read; the MIDI file read or checked against. */
  ly?: string;
  score?: number;
  mid?: string;
  /** Voices from the MIDI tracks (the LilyPond read for spelling and checking only). */
  fromMidi?: boolean;
  /** The LilyPond voices in score order (top first), where the reader names more than the piece has. */
  lyVoices?: string[];
  /** D755: a stream holding a voice's second line for a few bars (its chords), given to that voice as its own extra notes (D363's sub-line). */
  lyAside?: Record<string, string>;
  /** D755: the folder under data/sources/<dir>/ holding the LilyPond (Mutopia's mutopia/<mutopia>/ where unset): a transcription of our own. */
  lyDir?: string;
  voiceNames: string[];
  /** Entries found (a fugue, an invention, a sinfonia); none for a canon or the concerto. */
  entries: boolean;
  /**
   * D751: the subject and its answer given where the finders take the wrong figure (BWV 802: a bare scale
   * fragment, found everywhere): each a voice's notes from the start of a bar, that many of them.
   */
  theme?: { subject: [voice: number, bar: number, notes: number]; answer: [voice: number, bar: number, notes: number] };
  /**
   * D751: the edition corrected where it disagrees with the Bach-Gesellschaft print (read from the print: SOURCE.md):
   * a voice's nth note of a bar given another pitch, or held on from the note before (a tie the edition broke).
   */
  fixes?: ({ voice: number; bar: number; nth: number; to?: string; tie?: true } | { voice: number; bar: number; at: string; from: string; to?: string; tie?: true; start?: string; length?: string; strike?: true } | { voice: number; bar: number; at: string; add: string; dur: string } | { voice: number; bar: number; at: string; until: string; toVoice?: number; remove?: true; pitch?: string; chord?: true })[];
  /** The voices the player may take (all where unset). */
  playable?: number[];
  /** The edition's typesetter and licence, for the credit line. */
  credit: string;
}

const AOF_CREDIT = "MUTOPIA PROJECT · TYPESET BY ARNAUD GOSSART FROM BREITKOPF & HÄRTEL 1885 · PUBLIC DOMAIN";
const INV_PD = "MUTOPIA PROJECT · TYPESET BY ALLEN GARVIN FROM THE BACH-GESELLSCHAFT EDITION · PUBLIC DOMAIN";
const INV_BYSA = "MUTOPIA PROJECT · TYPESET BY JEFF COVEY FROM THE BACH-GESELLSCHAFT EDITION · CC BY-SA 3.0";
const SIN_PD = "MUTOPIA PROJECT · TYPESET BY OLIVIER VERMERSCH · PUBLIC DOMAIN";

const FOUR = ["Soprano", "Alto", "Tenor", "Bass"];
const THREE = ["Soprano", "Alto", "Bass"];
const TWO_HANDS = ["Right hand", "Left hand"];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX"];

/** The Art of Fugue in today's numbering (BWV 1080/1-17), from Mutopia's (the Bach-Gesellschaft's, 1878). */
const AOF: Spec[] = [
  ...[693, 719, 720, 721, 722, 734, 736, 739, 740, 744, 745].map((mutopia, i): Spec => {
    const n = i + 1;
    const file = `contrapunctus${ROMAN[n]}`;
    return {
      id: `bwv1080-${String(n).padStart(2, "0")}`,
      collection: "aof",
      number: n,
      title: `Contrapunctus ${n}`,
      short: `CONTRAPUNCTUS ${n}`,
      bwv: `1080/${n}`,
      key: "d",
      dir: "art-of-fugue",
      mutopia,
      ly: `${file}.ly`,
      mid: `${file}.mid`,
      // Contrapunctus 1's voices are include files the reader does not take apart (its "\part" commands).
      fromMidi: n === 1,
      voiceNames: n === 8 ? THREE : FOUR,
      entries: true,
      credit: n === 1 ? "MUTOPIA PROJECT · TYPESET BY PIERRE-LUC GAUTHIER FROM BREITKOPF & HÄRTEL 1885 · PUBLIC DOMAIN" : AOF_CREDIT,
    };
  }),
  // The mirror fugues: Mutopia's XVIII (a 4) and XVI (a 3), rectus and inversus each a piece, from the MIDI (the LilyPond keeps both forms in one file by tags).
  ...(
    [
      [12, "a 4", 764, FOUR],
      [13, "a 3", 751, THREE],
    ] as const
  ).flatMap(([n, a, mutopia, names]) =>
    (["rectus", "inversus"] as const).map(
      (form): Spec => ({
        id: `bwv1080-${n}${form[0]}`,
        collection: "aof",
        number: n,
        title: `Contrapunctus ${n} ${a}, ${form}`,
        short: `CONTRAPUNCTUS ${n} · ${form.toUpperCase()}`,
        bwv: `1080/${n}`,
        key: "d",
        dir: "art-of-fugue",
        mutopia,
        ly: `${form}.ly`,
        mid: `${form}.mid`,
        fromMidi: true,
        voiceNames: [...names],
        entries: true,
        credit: AOF_CREDIT,
      }),
    ),
  ),
  // The canons, in today's order (BWV 1080/14-17): Mutopia's XV, XII, XIV, XIII.
  ...(
    [
      [14, "per Augmentationem in Contrario Motu", "PER AUGMENTATIONEM", 750, "XV"],
      [15, "alla Ottava", "ALLA OTTAVA", 746, "XII"],
      [16, "alla Decima", "ALLA DECIMA", 749, "XIV"],
      [17, "alla Duodecima", "ALLA DUODECIMA", 748, "XIII"],
    ] as const
  ).map(
    ([n, name, short, mutopia, bg]): Spec => ({
      id: `bwv1080-c${n}`,
      collection: "aof",
      number: n,
      title: `Canon ${name}`,
      short: `CANON ${short}`,
      bwv: `1080/${n}`,
      key: "d",
      dir: "art-of-fugue",
      mutopia,
      ly: `contrapunctus${bg}.ly`,
      mid: `contrapunctus${bg}.mid`,
      voiceNames: ["Upper", "Lower"],
      entries: false,
      credit: AOF_CREDIT,
    }),
  ),
];

const MO: Spec[] = [
  {
    id: "bwv1079-ric3",
    collection: "mo",
    number: 1,
    title: "Ricercar a 3",
    short: "RICERCAR A 3",
    bwv: "1079/1",
    key: "c",
    dir: "musical-offering",
    mutopia: 690,
    ly: "ricercare.ly",
    mid: "ricercare.mid",
    lyVoices: ["upper:1", "upper:2", "lower"],
    voiceNames: THREE,
    entries: true,
    credit: AOF_CREDIT,
  },
  {
    id: "bwv1079-ric6",
    collection: "mo",
    number: 2,
    title: "Ricercar a 6",
    short: "RICERCAR A 6",
    bwv: "1079/5",
    key: "c",
    dir: "musical-offering",
    mutopia: 702,
    ly: "ricercare6.ly",
    mid: "ricercare6.mid",
    lyVoices: ["staff1", "staff2", "staff3", "staff4", "staff5", "staff6"],
    voiceNames: ["Soprano", "Mezzo", "Alto", "Tenor", "Baritone", "Bass"],
    entries: true,
    credit: AOF_CREDIT,
  },
];

const KEYS = ["C", "c", "D", "d", "Eb", "E", "e", "F", "f", "G", "g", "A", "a", "Bb", "b"];
const INV_MUTOPIA = [40, 58, 70, 67, 55, 159, 73, 61, 171, 62, 71, 174, 59, 72, 68];
const SIN_MUTOPIA = [142, 140, 143, 172, 204, 173, 175, 176, 199, 205, 200, 144, 206, 213, 145];
const keyWords = (k: string) => `${k[0].toUpperCase()}${k.slice(1).replace("b", "♭").replace("#", "♯")} ${k[0] === k[0].toLowerCase() ? "minor" : "major"}`;

const INV: Spec[] = INV_MUTOPIA.map((mutopia, i) => {
  const n = i + 1;
  const bysa = [1, 6, 9, 12].includes(n);
  return {
    id: `bwv${772 + i}`,
    collection: "inv",
    number: n,
    title: `Invention ${n} in ${keyWords(KEYS[i])}`,
    short: `INVENTION ${n}`,
    bwv: String(772 + i),
    key: KEYS[i],
    dir: "bach-inventions",
    mutopia,
    ly: `bach-invention-${String(n).padStart(2, "0")}.ly`,
    mid: `bach-invention-${String(n).padStart(2, "0")}.mid`,
    lyVoices: ["upper", "lower"],
    voiceNames: TWO_HANDS,
    entries: true,
    credit: bysa ? INV_BYSA : INV_PD,
  };
});

const SIN: Spec[] = SIN_MUTOPIA.map((mutopia, i) => ({
  id: `bwv${787 + i}`,
  collection: "sin",
  number: i + 1,
  title: `Sinfonia ${i + 1} in ${keyWords(KEYS[i])}`,
  short: `SINFONIA ${i + 1}`,
  bwv: String(787 + i),
  key: KEYS[i],
  dir: "bach-inventions",
  mutopia,
  ly: `bwv${787 + i}.ly`,
  mid: `bwv${787 + i}.mid`,
  lyVoices: ["VA", "VB", "lower"],
  voiceNames: THREE,
  entries: true,
  credit: i + 1 === 5 ? "MUTOPIA PROJECT · TYPESET BY OLIVIER VERMERSCH FROM THE BACH-GESELLSCHAFT EDITION · PUBLIC DOMAIN" : SIN_PD,
}));

const CONCERTO: Spec[] = (
  [
    [1, "I. Vivace", "d", "score.mid"],
    [2, "II. Largo ma non tanto", "F", "score-1.mid"],
    [3, "III. Allegro", "d", "score-2.mid"],
  ] as const
).map(([n, name, key, mid]) => ({
  id: `bwv1043-${n}`,
  collection: "concerto",
  number: n,
  title: `Concerto for Two Violins, ${name}`,
  short: `CONCERTO · ${name.toUpperCase()}`,
  bwv: `1043/${n}`,
  key,
  dir: "bach-1043",
  mutopia: 3,
  ly: "score.ly",
  score: n - 1,
  mid,
  lyVoices: ["SoloViolinI", "SoloViolinII", "ViolinI", "ViolinII", "Viola", "Continuo"],
  voiceNames: ["Solo Violin I", "Solo Violin II", "Violin I", "Violin II", "Viola", "Continuo"],
  entries: false,
  playable: [0, 1],
  credit: "MUTOPIA PROJECT · TYPESET BY DAVID CHAN FROM THE BACH-GESELLSCHAFT EDITION (1874) · PUBLIC DOMAIN",
}));

/**
 * D341: the motet BWV 228 "Fürchte dich nicht" (Fritz Brodersen's WIMA edition, MusicXML from Capella:
 * IMSLP, CC BY-NC 3.0) in its two sections: the double-choir opening (bars 1-77, eight voices), and,
 * from bar 78 ("Chor 1 + 2", the choirs united), the three-voice fugue in alto, tenor and bass under the
 * sopranos' chorale "Herr, mein Hirt, Brunn aller Freuden", to the end (choir II's staves silent there
 * but for the last six bars, where it sings again: kept as the band's). The cantata BWV 54 "Widerstehe
 * doch der Sünde" (Ramon Casadesus-Masanell's edition, MuseScore, IMSLP, CC BY-NC-SA 4.0): the first aria
 * as written (55 bars, the da capo not taken) and the fugal third aria "Wer Sünde tut" (72 bars); the
 * recitative left out (a recitative fits a one-line game poorly).
 */
const BWV228_PAGE = "https://imslp.org/wiki/F%C3%BCrchte_dich_nicht,_ich_bin_bei_dir,_BWV_228_(Bach,_Johann_Sebastian)";
const BWV54_PAGE = "https://imslp.org/wiki/Widerstehe_doch_der_S%C3%BCnde,_BWV_54_(Bach,_Johann_Sebastian)";
const BWV228_CREDIT = "MOTET: FRITZ BRODERSEN, WIMA EDITION (IMSLP) · CC BY-NC 3.0";
const BWV54_CREDIT = "CANTATA: RAMON CASADESUS-MASANELL (IMSLP, 2021) · CC BY-NC-SA 4.0";
/** D347: BWV 228's chorale words written apart over melismas ("Brunn al ler Freu den"), joined by hand. */
const CHORALE_JOINS = ["al|ler", "freu|den", "le|ben", "ge|ge", "ge|ben", "fas|se", "her|zen", "lan|gen", "um|fan", "fan|gen"];
const CHOIRS = ["Soprano I", "Alto I", "Tenor I", "Bass I", "Soprano II", "Alto II", "Tenor II", "Bass II"];
const VOCAL: Spec[] = [
  {
    id: "bwv228-1",
    collection: "motet",
    number: 1,
    title: "Fürchte dich nicht, BWV 228: for double choir",
    short: "FÜRCHTE DICH NICHT · I",
    bwv: "228",
    key: "A",
    dir: "bach-228",
    mutopia: 0,
    xml: "Bwv228.xml",
    xmlParts: [0, 1, 2, 3, 4, 5, 6, 7],
    toBar: 77,
    page: BWV228_PAGE,
    voiceNames: CHOIRS,
    entries: false,
    credit: BWV228_CREDIT,
  },
  {
    id: "bwv228-2",
    collection: "motet",
    number: 2,
    title: "Fürchte dich nicht, BWV 228: fugue and chorale",
    short: "FÜRCHTE DICH NICHT · II",
    bwv: "228",
    key: "A",
    dir: "bach-228",
    mutopia: 0,
    xml: "Bwv228.xml",
    xmlParts: [0, 1, 2, 3, 4, 5, 6, 7],
    fromBar: 78,
    page: BWV228_PAGE,
    voiceNames: ["Soprano (chorale)", "Alto", "Tenor", "Bass", "Soprano II", "Alto II", "Tenor II", "Bass II"],
    entries: true,
    playable: [0, 1, 2, 3],
    defaultVoice: 1,
    // D347: the chorale's words split over melismas, which no other part sings joined.
    joins: CHORALE_JOINS,
    credit: BWV228_CREDIT,
  },
  {
    id: "bwv54-1",
    collection: "cantata",
    number: 1,
    title: "Widerstehe doch der Sünde, BWV 54: 1. Aria",
    short: "WIDERSTEHE DOCH DER SÜNDE · 1",
    bwv: "54/1",
    key: "Eb",
    dir: "bach-54",
    mutopia: 0,
    xml: "Widerstehe_doch_der_S_nde_BWV_54.1_Johann_Sebastian_Bach_BWV_54.1.mxl",
    mid: "Widerstehe_doch_der_S_nde_BWV_54.1_Johann_Sebastian_Bach_BWV_54.1.mid",
    xmlParts: [0, 1, 2, 3, 4, 5],
    page: BWV54_PAGE,
    voiceNames: ["Violin I", "Violin II", "Viola I", "Viola II", "Alto", "Continuo"],
    entries: false,
    defaultVoice: 4,
    credit: BWV54_CREDIT,
  },
  {
    id: "bwv54-3",
    collection: "cantata",
    number: 3,
    title: "Widerstehe doch der Sünde, BWV 54: 3. Aria (Wer Sünde tut)",
    short: "WER SÜNDE TUT · 3",
    bwv: "54/3",
    key: "Eb",
    dir: "bach-54",
    mutopia: 0,
    xml: "Widerstehe_doch_der_S_nde_BWV_54.3_Johann_Sebastian_Bach_BWV_54.3.mxl",
    mid: "Widerstehe_doch_der_S_nde_BWV_54.3_Johann_Sebastian_Bach_BWV_54.3.mid",
    xmlParts: [0, 1, 2, 3],
    page: BWV54_PAGE,
    voiceNames: ["Violins", "Violas", "Alto", "Continuo"],
    entries: true,
    defaultVoice: 2,
    credit: BWV54_CREDIT,
  },
];

/**
 * D751: the Four Duets of Clavier-Übung III, BWV 802-805 (data/sources/bach-duets/SOURCE.md): two voices,
 * fugal (entries found). BWV 804's file as fetched leaves its \paper block open: read from a copy closed.
 * BWV 805 is held until its Mutopia notes are checked against the Bach-Gesellschaft print (a second
 * edition disagrees in about twenty places).
 */
const DUET4_FIXES: NonNullable<Spec["fixes"]> = [
  { voice: 1, bar: 16, nth: 1, to: "D#4" },
  { voice: 1, bar: 19, nth: 5, to: "C#3" },
  { voice: 0, bar: 22, nth: 3, to: "G5" },
  { voice: 1, bar: 28, nth: 2, to: "F3" },
  { voice: 0, bar: 46, nth: 1, to: "D#4" },
  { voice: 0, bar: 46, nth: 3, to: "D#4" },
  { voice: 0, bar: 48, nth: 1, to: "D#5" },
  { voice: 0, bar: 51, nth: 5, to: "G#4" },
  { voice: 1, bar: 67, nth: 6, to: "F3" },
  { voice: 0, bar: 68, nth: 1, tie: true },
  { voice: 1, bar: 74, nth: 2, to: "F#3" },
  { voice: 0, bar: 80, nth: 5, to: "C#5" },
  { voice: 1, bar: 91, nth: 1, tie: true },
];
const DUET_GILLIS = "MUTOPIA PROJECT · TYPESET BY H. GILLIS FROM THE BACH-GESELLSCHAFT EDITION";
const DUETS: Spec[] = (
  [
    [1, "e", 1596, "Bach-Duet1.ly", "Bach-Duet1.mid", `${DUET_GILLIS} · CC BY-SA 3.0`],
    [2, "F", 360, "duetto.ly", "duetto.mid", "MUTOPIA PROJECT · TYPESET BY VIT REICHEL FROM EDITION PETERS · PUBLIC DOMAIN"],
    [3, "G", 1597, "Bach-Duet3.closed.ly", "Bach-Duet3.mid", `${DUET_GILLIS} · PUBLIC DOMAIN`],
    [4, "a", 1598, "Bach-Duet4.ly", "Bach-Duet4.mid", `${DUET_GILLIS}, CORRECTED FROM THE BACH-GESELLSCHAFT PRINT · PUBLIC DOMAIN`],
  ] as const
).map(([n, key, mutopia, ly, mid, credit]): Spec => ({
  id: `bwv${801 + n}`,
  collection: "duet",
  number: n,
  title: `Duet ${n} in ${keyWords(key)}`,
  short: `DUET ${n}`,
  bwv: String(801 + n),
  key,
  dir: "bach-duets",
  mutopia,
  ly,
  mid,
  lyVoices: ["upper", "lower"],
  voiceNames: TWO_HANDS,
  entries: true,
  // D751: Duet 1's subject is the upper voice's opening run and its turn (15 notes), answered by the lower at bar 7.
  ...(n === 1 ? { theme: { subject: [0, 1, 15] as [number, number, number], answer: [1, 7, 15] as [number, number, number] } } : {}),
  // D751: Duet 4's twelve corrections, each read from the Bach-Gesellschaft print (Band 3, 1853, pp. 251-253; SOURCE.md).
  ...(n === 4 ? { fixes: DUET4_FIXES } : {}),
  credit,
}));

/**
 * D753: the Fugue of the Chromatic Fantasia and Fugue, BWV 903 (data/sources/bach-903/SOURCE.md): three voices, the
 * middle one changing staff (two LilyPond streams); ten notes corrected from the Bach-Gesellschaft print (Band 36).
 * The Fantasia, two staves of figuration, arpeggiated chords and recitative, is not taken (the one-note rule).
 */
const BWV903_FIXES: NonNullable<Spec["fixes"]> = [
  { voice: 2, bar: 27, at: "11/16", from: "B2", to: "Bb2" },
  { voice: 1, bar: 32, at: "5/8", from: "C4", to: "Eb4" },
  { voice: 2, bar: 55, at: "1/2", from: "G3", to: "G#3" },
  { voice: 2, bar: 58, at: "11/16", from: "G3", to: "G#3" },
  { voice: 1, bar: 90, at: "1/4", from: "F4", to: "G4" },
  { voice: 2, bar: 94, at: "0", from: "G#3", to: "F#3" },
  { voice: 1, bar: 111, at: "0", from: "B4", to: "Bb4" },
  { voice: 2, bar: 114, at: "3/16", from: "E3", to: "D3" },
  { voice: 2, bar: 127, at: "9/16", from: "D3", to: "F3" },
  { voice: 1, bar: 157, at: "1/16", from: "E5", to: "D5" },
];
/**
 * D754: PDMX's BWV 951 where the Bach-Gesellschaft print (Band 36, No. XXXVI, pp. 178-183) reads otherwise
 * (data/sources/bach-951/SOURCE.md): pitches, then the notes it strikes again that the print ties.
 */
const BWV951_FIXES: NonNullable<Spec["fixes"]> = [
  { voice: 1, bar: 8, at: "1/8", from: "D4", to: "D#4" },
  { voice: 2, bar: 21, at: "3/4", from: "D3", to: "B2" },
  { voice: 1, bar: 38, at: "5/16", from: "E4", to: "D4" },
  { voice: 1, bar: 52, at: "1/8", from: "C#5", to: "C5" },
  { voice: 1, bar: 52, at: "1/4", from: "C#5", to: "C5" },
  { voice: 1, bar: 52, at: "1/4", from: "C5", tie: true },
  { voice: 1, bar: 52, at: "5/16", from: "C#5", to: "C5" },
  { voice: 2, bar: 52, at: "15/16", from: "F#3", to: "E#3" },
  { voice: 1, bar: 59, at: "7/8", from: "G4", to: "G#4" },
  { voice: 1, bar: 70, at: "0", from: "C#4", to: "A3" },
  { voice: 0, bar: 70, at: "7/16", from: "C#5", to: "A4" },
  { voice: 0, bar: 71, at: "27/32", from: "D5", to: "D#5" },
  { voice: 2, bar: 85, at: "3/16", from: "C#4", to: "C4" },
  { voice: 2, bar: 92, at: "0", from: "D#3", to: "D3" },
  { voice: 1, bar: 99, at: "5/8", from: "A#4", to: "A4" },
  { voice: 1, bar: 108, at: "13/16", from: "B3", to: "C#4" },
  // The print's ties PDMX strikes again (all read: SOURCE.md), a note it strikes early (bar 28), and the alto in bar 96 (PDMX's soprano layer).
  { voice: 1, bar: 25, at: "3/4", from: "F#4", tie: true },
  { voice: 2, bar: 27, at: "1/4", from: "D3", tie: true },
  { voice: 1, bar: 27, at: "3/4", from: "G4", tie: true },
  { voice: 2, bar: 29, at: "1/2", from: "E3", tie: true },
  { voice: 0, bar: 30, at: "0", from: "D4", tie: true },
  { voice: 2, bar: 31, at: "0", from: "E2", tie: true },
  { voice: 2, bar: 38, at: "1/2", from: "B3", tie: true },
  { voice: 2, bar: 40, at: "0", from: "B2", tie: true },
  { voice: 2, bar: 41, at: "3/4", from: "B3", tie: true },
  { voice: 2, bar: 42, at: "0", from: "A3", tie: true },
  { voice: 1, bar: 44, at: "0", from: "A4", tie: true },
  { voice: 1, bar: 47, at: "1/2", from: "G4", tie: true },
  { voice: 1, bar: 52, at: "3/4", from: "D5", tie: true },
  { voice: 1, bar: 54, at: "0", from: "F#4", tie: true },
  { voice: 0, bar: 57, at: "1/2", from: "C#5", tie: true },
  { voice: 1, bar: 73, at: "0", from: "B4", tie: true },
  { voice: 1, bar: 73, at: "1/2", from: "A4", tie: true },
  { voice: 1, bar: 88, at: "3/4", from: "A4", tie: true },
  { voice: 1, bar: 91, at: "0", from: "A#4", tie: true },
  { voice: 1, bar: 92, at: "1/2", from: "E4", tie: true },
  { voice: 1, bar: 93, at: "1/2", from: "B3", tie: true },
  { voice: 1, bar: 95, at: "0", from: "B2", tie: true },
  { voice: 0, bar: 96, at: "0", until: "1/2", toVoice: 1 },
  { voice: 1, bar: 97, at: "0", from: "B3", tie: true },
  { voice: 1, bar: 111, at: "7/8", from: "C#4", tie: true },
  { voice: 1, bar: 28, at: "1/8", from: "B3", start: "3/16" },
];

/**
 * D756: BWV 998 where the Bach-Gesellschaft print (Band 45/1, 1897, pp. 141-148) reads otherwise than the PDMX file
 * (data/sources/bach-998/SOURCE.md), in each movement's own bar numbers.
 */
const BWV998_1_FIXES: NonNullable<Spec["fixes"]> = [
  { voice: 0, bar: 9, at: "3/8", from: "D4", to: "Db4" },
  { voice: 0, bar: 37, at: "1/8", from: "C4", to: "Ab3" },
  // An eighth and a new crotchet, no tie.
  { voice: 1, bar: 46, at: "3/4", from: "Eb3", strike: true },
];
const BWV998_2_FIXES: NonNullable<Spec["fixes"]> = [
  // Pitches (the da capo, bars 78-103, repeats bars 4-29).
  ...[17, 91].map((bar) => ({ voice: 1, bar, at: "7/8", from: "C4", to: "Bb3" })),
  ...[23, 97].map((bar) => ({ voice: 1, bar, at: "7/8", from: "Bb3", to: "D4" })),
  // Notes in the layer of another voice, given to the voice the print stems and beams them with.
  ...[29, 103].flatMap((bar) => [
    // (A chord with the bass's Eb2: the band takes one note, D363.)
    { voice: 1, bar, at: "0", until: "1/16", pitch: "G3", toVoice: 2, chord: true as const },
    { voice: 0, bar, at: "0", until: "1/16", pitch: "Bb3", toVoice: 1 },
  ]),
  { voice: 1, bar: 55, at: "1/8", until: "1/4", toVoice: 0 },
  ...[58, 59, 60].map((bar) => ({ voice: 0, bar, at: "0", until: "1", toVoice: 1 })),
  { voice: 1, bar: 68, at: "5/16", until: "1", toVoice: 0 },
  { voice: 1, bar: 69, at: "0", until: "3/16", toVoice: 0 },
  { voice: 0, bar: 76, at: "0", until: "1/16", toVoice: 1 },
  // A semiquaver, not a quaver.
  { voice: 0, bar: 69, at: "3/16", from: "D3", length: "1/16" },
  // The print's plain dotted A4 where the edition writes a trill out.
  { voice: 0, bar: 75, at: "1/4", until: "7/16", remove: true },
  { voice: 0, bar: 75, at: "1/4", add: "A4", dur: "3/16" },
];
const BWV998_3_FIXES: NonNullable<Spec["fixes"]> = [
  { voice: 0, bar: 31, at: "1/8", until: "5/16", remove: true },
  { voice: 0, bar: 31, at: "1/8", add: "A4", dur: "3/16" },
  { voice: 0, bar: 88, at: "5/16", from: "F3", to: "F4" },
  { voice: 0, bar: 90, at: "1/8", until: "3/16", pitch: "F3", remove: true },
  { voice: 0, bar: 90, at: "1/4", until: "5/16", pitch: "D3", remove: true },
];
const BWV998_CREDIT = "PDMX · MUSESCORE SCORE 132011 BY VERITS99, CORRECTED FROM THE BACH-GESELLSCHAFT PRINT · CC0";

const BGA36 = "https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2036.pdf";
const BWV906_CREDIT = "TRANSCRIBED FOR THE GAME FROM THE BACH-GESELLSCHAFT EDITION, BAND 36 (1890) · PUBLIC DOMAIN";

const KEYBOARD: Spec[] = [
  {
    id: "bwv903-2",
    collection: "keyboard",
    number: 1,
    title: "Chromatic Fantasia and Fugue in D minor, Fugue",
    short: "CHROMATIC FUGUE",
    bwv: "903",
    key: "d",
    dir: "bach-903",
    mutopia: 1604,
    ly: "bwv903fug.ly",
    mid: "bwv903fug.mid",
    lyVoices: ["upper:1", "upper:2|lower:1", "lower:2"],
    voiceNames: THREE,
    entries: true,
    fixes: BWV903_FIXES,
    credit: "MUTOPIA PROJECT · TYPESET BY GREG LOUIS FROM THE BACH-GESELLSCHAFT EDITION, CORRECTED FROM ITS PRINT · PUBLIC DOMAIN",
  },
  {
    // D754: from PDMX (MuseScore score 2069976, its uploader's Public Domain mark), its written layers joined into the three voices, corrected from the Bach-Gesellschaft print.
    id: "bwv951",
    collection: "keyboard",
    number: 2,
    title: "Fugue in B minor on a Theme by Albinoni",
    short: "FUGUE ON A THEME BY ALBINONI",
    bwv: "951",
    key: "b",
    dir: "bach-951",
    mutopia: 0,
    xml: "2069976.mxl",
    xmlDir: "pdmx",
    page: "https://musescore.com/user/18579/scores/2069976",
    xmlVoices: ["1:1|2:1", "1:2|1:7|2:2|2:6|2:7", "2:5"],
    // The answer is tonal (the subject's falling fifth answered by a fourth): given by hand (the finders call it the subject in E).
    theme: { subject: [1, 1, 17], answer: [0, 3, 17] },
    voiceNames: THREE,
    entries: true,
    fixes: BWV951_FIXES,
    credit: "PDMX · MUSESCORE SCORE 2069976 BY CADAMS, CORRECTED FROM THE BACH-GESELLSCHAFT PRINT · PUBLIC DOMAIN",
  },
  // D755: no free edition exists; transcribed for the game from the Bach-Gesellschaft print and read again bar by bar (data/sources/bach-906/SOURCE.md).
  {
    id: "bwv906-1",
    collection: "keyboard",
    number: 3,
    title: "Fantasia and Fugue in C minor, Fantasia",
    short: "FANTASIA IN C MINOR",
    bwv: "906",
    key: "c",
    dir: "bach-906",
    mutopia: 0,
    lyDir: "transcription",
    page: BGA36,
    ly: "bwv906fan.ly",
    lyVoices: ["upper", "lower"],
    lyAside: { upperTwo: "upper", lowerTwo: "lower" },
    voiceNames: TWO_HANDS,
    entries: false,
    credit: BWV906_CREDIT,
  },
  {
    id: "bwv906-2",
    collection: "keyboard",
    number: 4,
    title: "Fantasia and Fugue in C minor, Fugue (unfinished)",
    short: "FUGUE IN C MINOR (UNFINISHED)",
    bwv: "906",
    key: "c",
    dir: "bach-906",
    mutopia: 0,
    lyDir: "transcription",
    page: BGA36,
    ly: "bwv906fug.ly",
    lyVoices: ["upper:1", "upper:2", "lower:1"],
    voiceNames: THREE,
    entries: true,
    credit: BWV906_CREDIT,
  },
  // D756: Prelude, Fugue and Allegro in E-flat major, one work, three movements from one PDMX file (data/sources/bach-998/SOURCE.md).
  {
    id: "bwv998-1",
    collection: "keyboard",
    number: 5,
    title: "Prelude, Fugue and Allegro in E-flat major, Prelude",
    short: "PRELUDE IN E-FLAT MAJOR",
    bwv: "998",
    key: "Eb",
    dir: "bach-998",
    mutopia: 0,
    xml: "132011.mxl",
    xmlDir: "pdmx",
    page: "https://musescore.com/user/13172/scores/132011",
    xmlRanges: [[1, 48]],
    // The broken-chord line (and the inner voice of bars 36-40, its chords); the bass.
    xmlVoices: ["1:1|1:2", "2:5"],
    voiceNames: TWO_HANDS,
    entries: false,
    fixes: BWV998_1_FIXES,
    credit: BWV998_CREDIT,
  },
  {
    id: "bwv998-2",
    collection: "keyboard",
    number: 6,
    title: "Prelude, Fugue and Allegro in E-flat major, Fugue",
    short: "FUGUE IN E-FLAT MAJOR",
    bwv: "998",
    key: "Eb",
    dir: "bach-998",
    mutopia: 0,
    xml: "132011.mxl",
    xmlDir: "pdmx",
    page: "https://musescore.com/user/13172/scores/132011",
    xmlRanges: [[49, 151]],
    // Its layers follow the staves, not the voices: 2:5 is the alto where it enters (bars 3-10, again 78-84) and in bars 33, 43, 45, else the bass.
    xmlVoices: ["1:1", "1:2|1:5|2:1|2:2|2:5@3-10|2:5@33|2:5@43|2:5@45|2:5@78-84", "2:5|2:6|1:3"],
    voiceNames: THREE,
    entries: true,
    fixes: BWV998_2_FIXES,
    credit: BWV998_CREDIT,
  },
  {
    id: "bwv998-3",
    collection: "keyboard",
    number: 7,
    title: "Prelude, Fugue and Allegro in E-flat major, Allegro",
    short: "ALLEGRO IN E-FLAT MAJOR",
    bwv: "998",
    key: "Eb",
    dir: "bach-998",
    mutopia: 0,
    xml: "132011.mxl",
    xmlDir: "pdmx",
    page: "https://musescore.com/user/13172/scores/132011",
    // The edition writes both repeats out (its bars 152-215, 216-343); each half taken once, as the print gives it.
    xmlRanges: [[152, 183], [216, 279]],
    // The running line on either staff (with the few inner notes, its chords); the bass.
    xmlVoices: ["1:1|2:1|1:2|1:6", "2:5"],
    voiceNames: TWO_HANDS,
    entries: false,
    fixes: BWV998_3_FIXES,
    credit: BWV998_CREDIT,
  },
];

/**
 * D757: THE GOLDBERG VARIATIONS, BWV 988: the Aria and thirty variations from the Open Goldberg score (PDMX, MuseScore
 * score 48072, CC0; data/sources/bach-988/SOURCE.md), each piece by its measures in the file (`xmlByIndex`), each half
 * once (the game plays every repeat once: a first ending left out), its voices the edition's written layers (the main
 * ones, a few notes in another layer joined to the voice of their staff nearest in pitch: their chords to the band,
 * D363), its ornaments kept as signs (`keepOrnaments`). Variation 26 is the file's broken (its bars' lengths do not add
 * up): transcribed from the prints instead (lyDir). The Aria da capo is the Aria again (the file's copy identical):
 * not a piece of its own.
 */
const GOLDBERG_TABLE: [n: number, ranges: [number, number][], voices: string[]][] = [
  [0, [[1, 32]], ["1:1|1:3|1:2|1:4", "2:5|2:7", "2:6"]],
  [1, [[33, 64]], ["1:1|1:5|1:2", "2:5|2:1|2:2|2:7"]],
  [2, [[65, 79], [81, 96], [98, 98]], ["1:1", "1:2", "2:5|2:2"]],
  [3, [[99, 114]], ["1:1", "1:2", "2:5"]],
  [4, [[115, 129], [131, 146], [148, 148]], ["1:1", "1:2", "2:5", "2:6"]],
  [5, [[149, 180]], ["1:1", "2:5"]],
  [6, [[181, 195], [198, 213], [216, 216]], ["1:1", "1:2", "2:5|2:2|2:1", "2:6"]],
  [7, [[217, 248]], ["1:1", "2:5"]],
  [8, [[249, 280]], ["1:1", "2:5"]],
  [9, [[281, 296]], ["1:1|1:3", "1:2", "2:5"]],
  [10, [[297, 328]], ["1:1", "1:2", "2:5", "2:6"]],
  [11, [[329, 360]], ["1:1", "2:5"]],
  [12, [[361, 392]], ["1:1", "1:2|1:5", "2:5|2:2", "2:6"]],
  [13, [[393, 424]], ["1:1|1:2", "2:5", "2:6|2:8"]],
  [14, [[425, 456]], ["1:1", "2:5"]],
  [15, [[457, 488]], ["1:1", "1:2|1:5", "2:5|2:2", "2:6"]],
  [16, [[489, 503], [505, 535], [538, 538]], ["1:1|1:3", "1:2|1:4", "2:5|2:6|2:7|2:8"]],
  [17, [[539, 570]], ["1:1", "2:5"]],
  [18, [[571, 602]], ["1:1", "1:2", "2:5"]],
  [19, [[603, 634]], ["1:1", "1:2", "2:5|2:6|2:2"]],
  [20, [[635, 666]], ["1:1", "2:5"]],
  [21, [[667, 682]], ["1:1", "1:2|1:5", "2:5|2:2", "2:6"]],
  [22, [[683, 714]], ["1:1", "1:2", "2:5", "2:6"]],
  [23, [[715, 746]], ["1:1", "2:5", "1:2", "2:6"]],
  [24, [[747, 778]], ["1:1", "1:2|1:5", "2:5|2:2|2:7", "2:6"]],
  [25, [[779, 793], [795, 810], [812, 812]], ["1:1", "2:5", "2:6"]],
  [27, [[845, 876]], ["1:1", "2:5"]],
  [28, [[877, 908]], ["1:1|1:3", "1:2|1:4", "2:5|2:6"]],
  [29, [[909, 940]], ["1:2", "1:1", "2:6", "2:5"]],
  [30, [[941, 958]], ["1:1", "1:2|1:3|1:4", "2:5|2:2|2:7", "2:6"]],
];
/** D757: each variation's heading in the 1741 print (the canons' interval, the Fughetta, the Ouverture, the Quodlibet). */
const GOLDBERG_KIND: Record<number, string> = {
  3: "Canone all'Unisono", 6: "Canone alla Seconda", 9: "Canone alla Terza", 10: "Fughetta", 12: "Canone alla Quarta",
  15: "Canone alla Quinta", 16: "Ouverture", 18: "Canone alla Sesta", 21: "Canone alla Settima", 24: "Canone all'Ottava",
  27: "Canone alla Nona", 30: "Quodlibet",
};
const GOLDBERG_MINOR = new Set([15, 21, 25]);
const GOLDBERG_CREDIT = "THE OPEN GOLDBERG VARIATIONS SCORE (WERNER SCHWEER, KIMIKO ISHIZAKA, 2012), PDMX · CORRECTED FROM THE 1741 PRINT AND THE BACH-GESELLSCHAFT · CC0";
/**
 * D757: where the prints read otherwise than the Open Goldberg score (data/sources/bach-988/SOURCE.md: every difference
 * from Mutopia's and Madrisan's typesettings read in the 1741 print and the Bach-Gesellschaft; the 1741 print first),
 * each piece's own bars (as the file counts them, both endings) and voices (GOLDBERG_TABLE's order).
 */
const GOLDBERG_FIXES: Record<number, NonNullable<Spec["fixes"]>> = {
  // The second ending's C5 the C♯5 held from bar 15 (the Bach-Gesellschaft's tie; the 1741 print's arcs there mark the endings).
  4: [
    { voice: 0, bar: 17, at: "0", from: "C5", to: "C#5" },
    { voice: 0, bar: 17, at: "0", from: "C#5", tie: true },
  ],
  6: [
    { voice: 1, bar: 28, at: "0", from: "C4", tie: true },
    { voice: 1, bar: 30, at: "0", from: "E4", tie: true },
  ],
  16: [{ voice: 2, bar: 11, at: "15/16", from: "Ab3", to: "G#3" }],
  21: [
    { voice: 2, bar: 7, at: "15/16", from: "Db3", to: "C#3" },
    { voice: 2, bar: 12, at: "1/4", from: "A3", to: "Ab3" },
    { voice: 1, bar: 16, at: "0", from: "D4", tie: true },
  ],
  22: [{ voice: 3, bar: 30, at: "1/2", from: "Db3", to: "C#3" }],
  // The C5 under the E5 the edition leaves out.
  23: [{ voice: 2, bar: 25, at: "1/2", add: "C5", dur: "1/8" }],
  24: [
    { voice: 3, bar: 20, at: "0", from: "Eb3", to: "D#3" },
    { voice: 2, bar: 21, at: "0", from: "B3", tie: true },
    { voice: 2, bar: 21, at: "3/4", from: "C4", tie: true },
    { voice: 2, bar: 22, at: "0", from: "A3", tie: true },
    { voice: 2, bar: 27, at: "1/8", from: "Ab3", to: "G#3" },
  ],
  25: [
    { voice: 0, bar: 2, at: "0", from: "Db5", to: "C#5" },
    { voice: 0, bar: 2, at: "0", from: "C#5", tie: true },
    { voice: 0, bar: 9, at: "3/16", from: "G4", to: "A4" },
    { voice: 1, bar: 21, at: "1/2", from: "G4", to: "Gb4" },
    { voice: 1, bar: 21, at: "11/16", from: "C4", to: "Cb4" },
    { voice: 1, bar: 22, at: "0", from: "Cb4", strike: true },
    { voice: 0, bar: 22, at: "21/32", from: "C5", to: "Cb5" },
  ],
  27: [{ voice: 0, bar: 20, at: "0", from: "Eb5", to: "D#5" }],
  28: [
    { voice: 0, bar: 4, at: "1/4", from: "Db6", to: "C#6" },
    { voice: 0, bar: 9, at: "1/4", from: "D5", to: "E5" },
  ],
  29: [
    { voice: 3, bar: 4, at: "3/8", from: "F#3", to: "E3" },
    { voice: 1, bar: 27, at: "1/12", from: "F#4", to: "F4" },
    ...["1/4", "3/8"].map((at) => ({ voice: 3, bar: 16, at, from: "Db4", to: "C#4" })),
    ...["1/4", "3/8", "5/8"].map((at) => ({ voice: 3, bar: 22, at, from: "Eb5", to: "D#5" })),
  ],
  30: [{ voice: 3, bar: 17, at: "7/8", from: "Db4", to: "C#4" }],
};
const GOLDBERG_ORN_FIXES: Record<number, NonNullable<Spec["ornFixes"]>> = {
  // The trill hooked from below (Bach's Doppelt-cadence): a trill, not the short one the edition names.
  0: [
    { bar: 3, at: "1/4", pitch: "G4", signs: "T" },
    { bar: 11, at: "1/4", pitch: "G5", signs: "T" },
    { bar: 12, at: "1/4", pitch: "C#5", signs: "T" },
    { bar: 17, at: "1/4", pitch: "A4", signs: "T" },
  ],
  // The hooked trill with a mordent (Doppelt-cadence und Mordant).
  5: [{ bar: 17, at: "1/2", pitch: "F#5", signs: "TM" }],
  // The hooked long trill of the prints, not a short one.
  24: [
    { bar: 17, at: "0", pitch: "A4", signs: "T" },
    { bar: 19, at: "0", pitch: "A5", signs: "T" },
  ],
  // Appoggiaturas neither print has (bars 5, 6, 14); and bars 1-2's, which the Bach-Gesellschaft prints and the 1741 print does not.
  25: [
    { bar: 1, at: "1/4", pitch: "Bb5", graces: [] },
    { bar: 2, at: "1/4", pitch: "Ab5", graces: [] },
    { bar: 5, at: "1/4", pitch: "D5", graces: [] },
    { bar: 6, at: "1/4", pitch: "Eb5", graces: [] },
    { bar: 14, at: "1/4", pitch: "Bb5", graces: [] },
  ],
  20: [{ bar: 10, at: "1/4", pitch: "A5", signs: "" }],
  // Two signs the print does not have; an appoggiatura it has (its pitch, D5, the likelier reading of a small head between the C5 space and the D5 line).
  23: [
    { bar: 11, at: "1/2", pitch: "B5", signs: "" },
    { bar: 19, at: "0", pitch: "C4", signs: "" },
    { bar: 23, at: "1/16", pitch: "C5", graces: ["QD5"] },
  ],
  30: [{ bar: 12, at: "1/2", pitch: "D#5", signs: "" }],
};
const voicesNamed = (n: number) => (n === 2 ? TWO_HANDS : n === 3 ? THREE : FOUR);
const goldbergTitle = (n: number) => (n === 0 ? "Goldberg Variations, Aria" : `Goldberg Variations, Variation ${n}${GOLDBERG_KIND[n] ? `, ${GOLDBERG_KIND[n]}` : ""}`);
const GOLDBERG: Spec[] = [
  ...GOLDBERG_TABLE.map(([n, ranges, voices]): Spec => ({
    id: `bwv988-${String(n).padStart(2, "0")}`,
    collection: "goldberg",
    number: n + 1,
    title: goldbergTitle(n),
    short: n === 0 ? "ARIA" : `VARIATION ${n}`,
    bwv: "988",
    key: GOLDBERG_MINOR.has(n) ? "g" : "G",
    dir: "bach-988",
    mutopia: 0,
    xml: "48072.mxl",
    xmlDir: "pdmx",
    page: "https://musescore.com/user/9836/scores/48072",
    xmlRanges: ranges,
    xmlByIndex: true,
    xmlVoices: voices,
    keepOrnaments: true,
    voiceNames: voicesNamed(voices.length),
    entries: n === 10,
    ...(GOLDBERG_FIXES[n] ? { fixes: GOLDBERG_FIXES[n] } : {}),
    ...(GOLDBERG_ORN_FIXES[n] ? { ornFixes: GOLDBERG_ORN_FIXES[n] } : {}),
    credit: GOLDBERG_CREDIT,
  })),
].sort((a, b) => a.number - b.number);

export const SPECS: Spec[] = [...AOF, ...MO, ...INV, ...SIN, ...DUETS, ...KEYBOARD, ...GOLDBERG, ...CONCERTO, ...VOCAL];

/**
 * D361: a sung part is one line, the MusicXML voice(s) carrying its words. Another voice written on its
 * staff (BWV 54/1's alto in bar 26: plain crotchets Bb4 and G4 under the sung semiquavers, both in the
 * game's alto before) is left out where another part kept plays the same pitch while it sounds (it
 * doubles the band: there Violin II's Bb4 and Viola I's G4); one doubling nothing stops the import (it
 * would be the band's, a voice of its own: none so far). A part without words is returned whole.
 */
export function sungLine(x: XmlScore, i: number, kept: readonly number[]): { notes: XmlPart["notes"]; dropped: XmlPart["notes"] } {
  const p = x.parts[i];
  const sung = new Set(p.lyrics.map((l) => l.voice));
  if (!sung.size) return { notes: p.notes, dropped: [] };
  const notes: XmlPart["notes"] = [];
  const dropped: XmlPart["notes"] = [];
  for (const n of p.notes) {
    if (sung.has(n[4])) {
      notes.push(n);
      continue;
    }
    const midi = parsePitch(n[2]).midi;
    const doubled = kept.some((j) => j !== i && x.parts[j].notes.some((o) => o[0] <= n[0] && n[0] < o[0] + o[1] && parsePitch(o[2]).midi === midi));
    if (!doubled) throw new Error(`${p.name}: a note of voice ${n[4]} beside the sung line (${n[2]} at ${n[0]}) doubles no other part`);
    dropped.push(n);
  }
  return { notes, dropped };
}

/** D756: a movement from a file holding the whole work (Spec.xmlRanges), its voices from one part's layers (xmlVoices). */
function readXmlRanges(s: Spec, x: XmlScore): Read {
  if (!s.xmlVoices) throw new Error(`${s.id}: xmlRanges wants xmlVoices`);
  const part = x.parts[(s.xmlParts ?? [0])[0]].notes;
  // A layer may be qualified by the (new) bars where it is that voice ("2:5@3-10"): those read before the plain ones.
  const rules = s.xmlVoices.flatMap((v, vi) =>
    v.split("|").map((l) => {
      const [layer, span] = l.split("@");
      const [a, b] = span ? span.split("-").map(Number) : [0, 0];
      return { layer, vi, a, b: span ? (b ?? a) : 0, qualified: !!span };
    }),
  );
  rules.sort((p, q) => Number(q.qualified) - Number(p.qualified));
  let bar = 0;
  const home = (n: XmlPart["notes"][number]) => rules.find((r) => r.layer === `${n[3]}:${n[4]}` && (!r.qualified || (bar >= r.a && bar <= r.b)))?.vi ?? -1;
  const start = (n: number) => {
    const b = s.xmlByIndex ? x.measures[n - 1] : x.bars.find((m) => m.n === n);
    if (!b) throw new Error(`${s.id}: no bar ${n}`);
    return b.on;
  };
  const end = (n: number) => (s.xmlByIndex ? x.measures[n]?.on : x.bars.find((m) => m.n === n + 1)?.on) ?? x.length;
  const first = s.xmlRanges![0][0];
  const orn: NonNullable<Read["orn"]> = [];
  const unplayed: NonNullable<Read["unplayed"]> = [];
  const p0 = x.parts[(s.xmlParts ?? [0])[0]];
  const spell: Record<number, string> = {};
  const spelled: string[] = [];
  const voices: Note[][] = s.xmlVoices.map(() => []);
  const bars: { n: number; on: number }[] = [];
  const lost = new Set<string>();
  let base = 0;
  for (const [fb, tb] of s.xmlRanges!) {
    const a = start(fb);
    const z = end(tb);
    if (s.xmlByIndex) for (let i = fb; i <= tb; i++) bars.push({ n: i - first + 1, on: x.measures[i - 1].on - a + base });
    else for (const b of x.bars) if (b.on >= a && b.on < z) bars.push({ n: bars.length + 1, on: b.on - a + base });
    if (s.keepOrnaments) {
      const marks = new Map<string, { on: number; midi: number; signs: string; graces: string[] }>();
      const mark = (on: number, pitch: string) => {
        const k = `${on}:${pitch}`;
        if (!marks.has(k)) marks.set(k, { on: on - a + base, midi: parsePitch(pitch).midi, signs: "", graces: [] });
        return marks.get(k)!;
      };
      for (const o of p0.ornaments)
        if (o.on >= a && o.on < z)
          for (const g of o.signs) {
            if (KERN_SIGN[g]) mark(o.on, o.pitch).signs += KERN_SIGN[g];
            else unplayed.push({ on: o.on - a + base, midi: parsePitch(o.pitch).midi, sign: g });
          }
      // An appoggiatura: on the note it leads to (the same staff and voice; the top of a chord).
      for (const g of p0.graces) {
        if (g.on < a || g.on >= z) continue;
        const host = part.filter((n) => n[0] === g.on && n[3] === g.staff && n[4] === g.voice).sort((p, q) => parsePitch(q[2]).midi - parsePitch(p[2]).midi)[0];
        if (!host) throw new Error(`${s.id}: an appoggiatura ${g.pitch} with no note at ${g.on}`);
        mark(host[0], host[2]).graces.push(`${g.slash ? "q" : "Q"}${g.pitch}`);
      }
      orn.push(...marks.values());
    }
    for (const n of part) {
      if (n[0] < a || n[0] >= z) continue;
      bar = bars.filter((b) => b.on <= n[0] - a + base).at(-1)!.n;
      const vi = home(n);
      if (vi < 0) {
        lost.add(`${n[3]}:${n[4]}`);
        continue;
      }
      const p = parsePitch(n[2]);
      spell[p.midi] ??= n[2];
      spelled.push(n[2]);
      voices[vi].push([n[0] - a + base, Math.min(n[1], z - n[0]), p.midi, p.diatonic]);
    }
    base += z - a;
  }
  if (lost.size) throw new Error(`${s.id}: MusicXML layers ${[...lost].join(", ")} not in ${s.xmlVoices.join(", ")}`);
  const a0 = start(s.xmlRanges![0][0]);
  const meter = [...x.measures].filter((m) => m.on <= a0 && m.time).at(-1)?.time ?? x.meter;
  return { voices: voices.map(sortVoice), spell, spelled, bars, meter, length: base, agree: { midiInLy: 0, lyInMidi: 0, midiNotes: 0, lyNotes: 0 }, ...(s.keepOrnaments ? { orn, unplayed } : {}) };
}

/** D341: a piece from a MusicXML edition: its parts as voices, its bars from `fromBar` to `toBar` (moved to begin at 0), checked against its MIDI (the piano reduction left out). */
export function readXmlPiece(s: Spec): Read {
  const dir = `${SRC}${s.dir}/${s.xmlDir ?? "imslp"}/`;
  const x = readMusicXml(`${dir}${s.xml}`);
  const from = s.fromBar ? x.bars.find((b) => b.n === s.fromBar)!.on : 0;
  const toBar = s.toBar;
  const to = toBar ? (x.bars.find((b) => b.n === toBar + 1)?.on ?? x.length) : x.length;
  if (s.xmlRanges) return readXmlRanges(s, x);
  const spell: Record<number, string> = {};
  const spelled: string[] = [];
  const kept = s.xmlParts ?? x.parts.map((_, i) => i);
  // D754: one part's layers as the voices, each layer named once (none left over).
  const layered = s.xmlVoices
    ? (() => {
        const part = x.parts[kept[0]].notes;
        const home = (n: XmlPart["notes"][number]) => s.xmlVoices!.findIndex((v) => v.split("|").includes(`${n[3]}:${n[4]}`));
        const lost = [...new Set(part.filter((n) => home(n) < 0).map((n) => `${n[3]}:${n[4]}`))];
        if (lost.length) throw new Error(`${s.id}: MusicXML layers ${lost.join(", ")} not in ${s.xmlVoices!.join(", ")}`);
        return s.xmlVoices!.map((_, vi) => part.filter((n) => home(n) === vi));
      })()
    : null;
  const voices: Note[][] = (layered ?? kept.map((i) => sungLine(x, i, kept).notes)).map((notes) =>
    sortVoice(notes
      .filter((n) => n[0] >= from && n[0] < to)
      .map(([on, dur, pitch]) => {
        const p = parsePitch(pitch);
        spell[p.midi] ??= pitch;
        spelled.push(pitch);
        return [on - from, Math.min(dur, to - on), p.midi, p.diatonic] as Note;
      })),
  );
  const length = to - from;
  const bars = x.bars.filter((b) => b.on >= from && b.on < to).map((b) => ({ n: b.n, on: b.on - from }));
  // D347: the words of each voice kept (none for an instrument), as packLyrics stores them.
  const hy = hyphensOf(x.parts, s.joins);
  const lyrics = (layered ? [] : (s.xmlParts ?? x.parts.map((_, i) => i))).map((i) =>
    packLyrics(x.parts[i].lyrics.flatMap((l, k) => (l.on >= from && l.on < to ? [{ on: l.on - from, end: Math.min(l.end, to) - from, text: l.text, joined: hy.joined[i][k] }] : []))),
  );
  let agree = { midiInLy: 0, lyInMidi: 0, midiNotes: 0, lyNotes: 0 };
  if (s.mid) {
    const m = readMidi(readFileSync(`${dir}${s.mid}`));
    const k = TPQ / m.division;
    const b = new Set(m.tracks.filter((t) => !/piano/i.test(t.name)).flatMap((t) => t.notes.map(([on, , midi]) => `${Math.round(on * k)}:${midi}`)));
    const a = new Set(voices.flat().map((n) => `${n[0] + from}:${n[2]}`));
    const inter = [...a].filter((v) => b.has(v)).length;
    agree = { midiInLy: inter / Math.max(1, b.size), lyInMidi: inter / Math.max(1, a.size), midiNotes: b.size, lyNotes: a.size };
  }
  return { voices, spell, spelled, bars, meter: x.meter, length, agree, ...(lyrics.some((l) => l.length) ? { lyrics } : {}) };
}

/**
 * D347: a voice's words, compact: [onset after the last syllable's onset, length to the melisma's last
 * note's end, text], three values a syllable, in time; a text ending in "-" is followed by a hyphen (the
 * word goes on). src/touch/lyrics.ts unpacks it.
 */
export function packLyrics(syls: { on: number; end: number; text: string; joined: boolean }[]): (number | string)[] {
  const out: (number | string)[] = [];
  let last = 0;
  for (const l of syls) {
    out.push(l.on - last, l.end - l.on, l.joined ? `${l.text}-` : l.text);
    last = l.on;
  }
  return out;
}

// --- Reading --------------------------------------------------------------------------------------

export interface LyNote {
  on: string;
  dur: string;
  pitch: string;
  midi: number;
  voice: string;
  staff: string;
  /** D366: the staff whose music it is (before any \\change Staff). */
  part: string;
  grace: boolean;
  /** D366: its ornament signs (LilyPond's names), and a grace note's kind (grace, acciaccatura, appoggiatura). */
  orn?: string[];
  graceKind?: string;
  /** D366: for a staff opened inside another staff's music (a voice dividing onto an extra staff), that staff. */
  host?: string;
}
export interface LyScore {
  notes: LyNote[];
  measures: { n: number; on: string }[];
  times: { on: string; text: string }[];
  partial: string | null;
  length: string;
  /** D366: the staves in order of appearance. */
  staves: string[];
  warnings: string[];
}

/** Whole notes as "n/d" to ticks. */
const ticks = (f: string) => {
  const [n, d] = f.split("/").map(Number);
  return Math.round((n / d) * 4 * TPQ);
};

export function readLy(path: string, score = 0, asWritten = true): LyScore {
  const args = ["-I", `${ROOT}tools/touch/lily_json.py`, path, String(score)];
  if (asWritten) args.push("--as-written");
  return JSON.parse(execFileSync("python3", args, { encoding: "utf8", maxBuffer: 64 << 20 }));
}

/** The bars from the time signatures (a MIDI file's), bar 1 at the first downbeat after an upbeat of `partial` ticks. */
function barsFrom(times: { tick: number; num: number; den: number }[], length: number, partial = 0) {
  const bars: { n: number; on: number }[] = [];
  const sig = (t: number) => times.filter((x) => x.tick <= t).at(-1) ?? { tick: 0, num: 4, den: 4 };
  let t = 0;
  let n = 1;
  if (partial) {
    bars.push({ n: 0, on: 0 });
    t = partial;
  }
  while (t < length - 1) {
    bars.push({ n, on: t });
    const s = sig(t);
    t += (s.num * 4 * TPQ) / s.den;
    n++;
  }
  return bars;
}

const mean = (v: Note[]) => v.reduce((t, n) => t + n[2], 0) / Math.max(1, v.length);
const sortVoice = (v: Note[]) => v.sort((a, b) => a[0] - b[0] || b[2] - a[2]);
/** D363: the notes read from a voice of their own within a staff ("staff1/v2"), given to the staff's voice: its sub-line, not its own. */
const ASIDE = new WeakSet<Note>();

export interface Read {
  voices: Note[][];
  spell: Record<number, string>;
  spelled: string[];
  bars: { n: number; on: number }[];
  meter: string;
  length: number;
  /** The share of the MIDI file's attacks (onset, pitch) the LilyPond notes hold, and the other way round. */
  agree: { midiInLy: number; lyInMidi: number; midiNotes: number; lyNotes: number };
  /** D347: each voice's words (packLyrics), where any voice is sung. */
  lyrics?: (number | string)[][];
  /** D757: the ornaments kept (Spec.keepOrnaments): each note's onset and pitch, its kern signs, its appoggiaturas; and the signs the game cannot play. */
  orn?: { on: number; midi: number; signs: string; graces: string[] }[];
  unplayed?: { on: number; midi: number; sign: string }[];
}

/** D757: MusicXML's and LilyPond's ornament names as kern's signs (ornament-play.ts: the step read from the bar, upper case its default); others unplayed. */
const KERN_SIGN: Record<string, string> = { "trill-mark": "T", trill: "T", downprall: "T", mordent: "M", "inverted-mordent": "W", prall: "W", turn: "S", "inverted-turn": "$", reverseturn: "$" };

export function readPiece(s: Spec): Read {
  const dir = s.lyDir ? `${SRC}${s.dir}/${s.lyDir}/` : `${SRC}${s.dir}/mutopia/${s.mutopia}/`;
  const ly = s.ly ? readLy(`${dir}${s.ly}`, s.score ?? 0) : null;
  const m = s.mid ? readMidi(readFileSync(`${dir}${s.mid}`)) : null;
  const k = m ? TPQ / m.division : 1;
  const midiNotes = m ? m.tracks.filter((t) => t.notes.length).map((t) => t.notes.map(([on, dur, midi]) => [Math.round(on * k), Math.round(dur * k), midi] as const)) : [];
  const lyNotes = ly ? ly.notes.filter((n) => !n.grace && n.dur !== "0/1") : [];
  // Spelling: the LilyPond's, by onset and pitch (then by pitch alone, the commonest).
  const byAttack = new Map<string, string>();
  const byMidi = new Map<number, Map<string, number>>();
  for (const n of lyNotes) {
    byAttack.set(`${ticks(n.on)}:${n.midi}`, n.pitch);
    if (!byMidi.has(n.midi)) byMidi.set(n.midi, new Map());
    const c = byMidi.get(n.midi)!;
    c.set(n.pitch, (c.get(n.pitch) ?? 0) + 1);
  }
  const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
  const spellOf = (on: number, midi: number) =>
    byAttack.get(`${on}:${midi}`) ?? [...(byMidi.get(midi)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  const spell: Record<number, string> = {};
  const spelled: string[] = [];
  const note = (on: number, dur: number, midi: number, name: string): Note => {
    spell[midi] ??= name;
    spelled.push(name);
    return [on, dur, midi, parsePitch(name).diatonic];
  };

  let voices: Note[][];
  if (s.fromMidi) {
    if (!m) throw new Error(`${s.id}: no MIDI`);
    voices = midiNotes.map((t) => sortVoice(t.map(([on, dur, midi]) => note(on, dur, midi, spellOf(on, midi)))));
    voices.sort((a, b) => mean(b) - mean(a));
  } else {
    if (!ly) throw new Error(`${s.id}: no LilyPond`);
    // The voices: those named, else those holding 3% of the notes or more; a few notes in a voice of
    // their own within a staff (a chord split for a bar, "staff1/v2", "staff1:1") go to the staff's voice.
    const count = new Map<string, number>();
    for (const n of lyNotes) count.set(n.voice, (count.get(n.voice) ?? 0) + 1);
    const ids = s.lyVoices ?? [...count].filter(([, c]) => c >= 0.03 * lyNotes.length).map(([v]) => v);
    // D753: a voice may be several LilyPond streams ("upper:2|lower:1": a line that changes staff).
    const home = (v: string) => ids.find((id) => id.split("|").includes(v)) ?? s.lyAside?.[v] ?? (ids.includes(v.split(/[:/]/)[0]) ? v.split(/[:/]/)[0] : null);
    const unknown = [...count.keys()].filter((v) => !home(v));
    if (unknown.length) throw new Error(`${s.id}: LilyPond voices ${unknown.join(", ")} not in ${ids.join(", ")}`);
    voices = ids.map((id) =>
      sortVoice(
        lyNotes
          .filter((n) => home(n.voice) === id)
          .map((n) => {
            const x = note(ticks(n.on), ticks(n.dur), n.midi, n.pitch);
            if (!id.split("|").includes(n.voice)) ASIDE.add(x);
            return x;
          }),
      ),
    );
    if (!s.lyVoices) voices.sort((a, b) => mean(b) - mean(a));
  }
  if (voices.length !== s.voiceNames.length) throw new Error(`${s.id}: ${voices.length} voices, ${s.voiceNames.length} names`);
  const length = Math.max(...voices.flat().map((n) => n[0] + n[1]));

  let bars: { n: number; on: number }[];
  let meter: string;
  // The bars: the LilyPond's where it is read as the MIDI plays (its length the same), else from the MIDI's time signatures.
  if (ly && (!s.fromMidi || Math.abs(ticks(ly.length) - length) < TPQ / 8)) {
    bars = ly.measures.map((b) => ({ n: b.n, on: ticks(b.on) })).filter((b) => b.on < length);
    meter = ly.times[0]?.text ?? "4/4";
  } else {
    const t = m!.times.map((x) => ({ ...x, tick: Math.round(x.tick * k) }));
    bars = barsFrom(t, length);
    meter = `${t[0]?.num ?? 4}/${t[0]?.den ?? 4}`;
  }

  // The check: the MIDI's attacks against the LilyPond's (the LilyPond unfolded where the MIDI plays the repeats).
  const agreeWith = (lns: LyNote[]) => {
    const a = new Set(lns.filter((n) => !n.grace && n.dur !== "0/1").map((n) => `${ticks(n.on)}:${n.midi}`));
    const b = new Set(midiNotes.flat().map(([on, , midi]) => `${on}:${midi}`));
    const inter = [...b].filter((x) => a.has(x)).length;
    return { midiInLy: b.size ? inter / b.size : 0, lyInMidi: a.size ? inter / a.size : 0, midiNotes: b.size, lyNotes: a.size };
  };
  let agree = ly && m ? agreeWith(ly.notes) : { midiInLy: 0, lyInMidi: 0, midiNotes: 0, lyNotes: 0 };
  if (ly && m && agree.midiInLy < 0.9 && s.ly) {
    const unfolded = agreeWith(readLy(`${dir}${s.ly}`, s.score ?? 0, false).notes);
    if (unfolded.midiInLy > agree.midiInLy) agree = unfolded;
  }
  // D757: the LilyPond's ornament signs and appoggiaturas kept (Spec.keepOrnaments), on the notes they mark.
  if (s.keepOrnaments && ly) {
    const marks = new Map<string, { on: number; midi: number; signs: string; graces: string[] }>();
    const unplayed: NonNullable<Read["unplayed"]> = [];
    const mark = (on: number, midi: number) => {
      const k = `${on}:${midi}`;
      if (!marks.has(k)) marks.set(k, { on, midi, signs: "", graces: [] });
      return marks.get(k)!;
    };
    for (const n of lyNotes)
      for (const g of n.orn ?? []) {
        if (KERN_SIGN[g]) mark(ticks(n.on), n.midi).signs += KERN_SIGN[g];
        else unplayed.push({ on: ticks(n.on), midi: n.midi, sign: g });
      }
    for (const g of ly.notes.filter((n) => n.grace)) {
      const host = lyNotes.filter((n) => n.on === g.on && n.voice === g.voice).sort((p, q) => q.midi - p.midi)[0];
      if (!host) throw new Error(`${s.id}: an appoggiatura ${g.pitch} with no note at ${g.on}`);
      mark(ticks(host.on), host.midi).graces.push(`${g.graceKind === "acciaccatura" ? "q" : "Q"}${g.pitch}`);
    }
    return { voices, spell, spelled, bars, meter, length, agree, orn: [...marks.values()], unplayed };
  }
  return { voices, spell, spelled, bars, meter, length, agree };
}

/** D757: the ornament fixes (Spec.ornFixes): a note's signs and appoggiaturas as the print gives them. */
export function applyOrnFixes(r: Read, fixes: NonNullable<Spec["ornFixes"]>) {
  r.orn ??= [];
  for (const x of fixes) {
    const from = r.bars.find((b) => b.n === x.bar)?.on;
    if (from === undefined) throw new Error(`orn fix: no bar ${x.bar}`);
    const [a, b] = x.at.split("/").map(Number);
    const on = from + Math.round((b ? a / b : a) * 4 * TPQ);
    const midi = parsePitch(x.pitch).midi;
    if (!r.voices.some((v) => v.some((n) => n[0] === on && n[2] === midi))) throw new Error(`orn fix: no ${x.pitch} at ${x.at} of bar ${x.bar}`);
    let o = r.orn.find((m) => m.on === on && m.midi === midi);
    if (!o) r.orn.push((o = { on, midi, signs: "", graces: [] }));
    if (x.signs !== undefined) o.signs = x.signs;
    if (x.graces) o.graces = x.graces;
  }
  r.orn = r.orn.filter((o) => o.signs || o.graces.length);
}

// --- Analysis -------------------------------------------------------------------------------------

/** A fugue's (an invention's, a sinfonia's) entries, as Contrapunctus XIV's first subject's (extract.ts contrapunctusAnalysis). */
function entriesOf(s: Spec, r: Read, piece: { tpq: number; meter: string; bars: { n: number; on: number }[]; length: number; voices: Note[][]; key: string }, speller: (pc: number, minor: boolean) => string) {
  const minor = s.key[0] === s.key[0].toLowerCase();
  const wp: WtcPiece = {
    id: s.id,
    book: 0,
    number: s.number,
    kind: "fugue",
    key: s.key[0].toUpperCase() + s.key.slice(1),
    mode: minor ? "minor" : "major",
    bwv: s.bwv,
    meter: r.meter,
    voices: r.voices.map((v) => v.filter((n, i) => !(i > 0 && v[i - 1][0] === n[0])).map(([on, dur, midi]) => [on, dur, r.spell[midi], 0])),
    bars: r.bars,
    length: r.length,
  };
  // The subject: the first two voices' openings (as the WTC's), kept where it has six notes or more and
  // is found in every voice; else (a bass entering with the first voice, an answer inverted, in
  // diminution or entering late) the first imitation (`imitation`), where it is found twice or more.
  const pool = s.entries ? (s.theme ? themed(wp, s.theme) : finders(wp)) : [];
  // D707: the Art of Fugue's entries are its table's (data/touch/aof-entries.txt), the finders' only offered to it;
  // D730: the Inventions' and Sinfonias' theirs (data/touch/inv-entries.txt, merged into AOF_TABLE).
  const ex = AOF_TABLE.get(s.id);
  if (ex) return tableEntries(s.id, piece, ex, pool, speller);
  return pool.length >= 2 ? buildEntries(piece, pool, speller) : [];
}

/** D751: the entries of a subject and answer given by hand (Spec.theme). */
function themed(wp: WtcPiece, t: NonNullable<Spec["theme"]>): RawEntry[] {
  const take = ([v, bar, count]: [number, number, number]) => {
    const at = wp.bars.find((b) => b.n === bar)?.on ?? 0;
    return line(wp.voices[v]).filter((n) => n.on >= at).slice(0, count);
  };
  return rawEntries(wp, take(t.subject), take(t.answer), false);
}

/** The finders' entries (D340): the first two voices' openings, else the first imitation. */
function finders(wp: WtcPiece): RawEntry[] {
  const sa = subjectAndAnswer(wp);
  const byOpening = sa.subject.length >= 4 ? rawEntries(wp, sa.subject, sa.answer, false) : [];
  if (sa.subject.length >= 6 && new Set(byOpening.map((e) => e.voice)).size === wp.voices.length) return byOpening;
  const im = imitation(wp);
  const byImitation = im ? rawEntries(wp, im.subject, im.answer, im.inverted || im.scale !== 1) : [];
  return byImitation.length >= 2 ? byImitation : byOpening;
}

/**
 * D707: THE ART OF FUGUE'S ENTRIES FROM ITS TABLE (data/touch/aof-entries.txt, read by expert.ts as the 48's): each
 * statement placed in the notes (placeExpert: a finder's entry where one is there, else found from the table's bar
 * and form), keyed and marked by buildEntries; then told against the cycle's own form where the table says the
 * piece's shape is the inversion ("upside": Contrapunctus 3, 4, 12 inversus; C8's third subject; C10's and C11's
 * second), and a canon's statements marked dux or comes. Every line of the table must place (else the build stops).
 */
export const AOF_TABLE: Map<string, ExpertFugue> = parseExpert(readFileSync(`${ROOT}data/touch/aof-entries.txt`, "utf8"), (id) =>
  id === "bwv1080-14" ? 4 : (SPECS.find((x) => x.id === id)?.voiceNames.length ?? 0),
);
/**
 * D730: THE INVENTIONS' AND SINFONIAS' ENTRIES FROM THEIR TABLE (data/touch/inv-entries.txt, the same grammar): an
 * Invention's subject (or motive, or canon's subject) and the countersubject it opens with in double counterpoint, a
 * Sinfonia's subject and its returning countersubject; placed as the Art of Fugue's (tableEntries).
 */
export const INV_TABLE: Map<string, ExpertFugue> = parseExpert(readFileSync(`${ROOT}data/touch/inv-entries.txt`, "utf8"), (id) => SPECS.find((x) => x.id === id)?.voiceNames.length ?? 0);
for (const [id, ex] of INV_TABLE) AOF_TABLE.set(id, ex);
/** D740: and the Four Duets' (data/touch/duet-entries.txt, the same grammar and ways). */
export const DUET_TABLE: Map<string, ExpertFugue> = parseExpert(readFileSync(`${ROOT}data/touch/duet-entries.txt`, "utf8"), (id) => SPECS.find((x) => x.id === id)?.voiceNames.length ?? 0);
for (const [id, ex] of DUET_TABLE) AOF_TABLE.set(id, ex);
/** D770: and the Chromatic Fugue's (data/touch/903-entries.txt, the same grammar and ways). */
export const FUGUE903_TABLE: Map<string, ExpertFugue> = parseExpert(readFileSync(`${ROOT}data/touch/903-entries.txt`, "utf8"), (id) => SPECS.find((x) => x.id === id)?.voiceNames.length ?? 0);
for (const [id, ex] of FUGUE903_TABLE) AOF_TABLE.set(id, ex);
/** D779: and the Albinoni Fugue's (data/touch/951-entries.txt). */
export const FUGUE951_TABLE: Map<string, ExpertFugue> = parseExpert(readFileSync(`${ROOT}data/touch/951-entries.txt`, "utf8"), (id) => SPECS.find((x) => x.id === id)?.voiceNames.length ?? 0);
for (const [id, ex] of FUGUE951_TABLE) AOF_TABLE.set(id, ex);
/** D780: and BWV 906's and 998's (data/touch/906-998-entries.txt, the same grammar and ways). */
export const F906_998_TABLE: Map<string, ExpertFugue> = parseExpert(readFileSync(`${ROOT}data/touch/906-998-entries.txt`, "utf8"), (id) => SPECS.find((x) => x.id === id)?.voiceNames.length ?? 0);
for (const [id, ex] of F906_998_TABLE) AOF_TABLE.set(id, ex);
export function tableEntries(
  id: string,
  piece: { tpq: number; meter: string; bars: { n: number; on: number }[]; length: number; voices: Note[][]; key: string },
  ex: ExpertFugue,
  pool: RawEntry[],
  speller: (pc: number, minor: boolean) => string,
) {
  const barTicks = ((Number(piece.meter.split("/")[0]) * 4) / Number(piece.meter.split("/")[1])) * TPQ;
  const res = placeExpert({ tpq: TPQ, barTicks, length: piece.length, bars: piece.bars, voices: piece.voices }, ex, pool);
  if (res.unplaced.length) throw new Error(`${id}: table entries not found in the notes: ${res.unplaced.map((u) => u.line).join(" | ")}`);
  const seen = new Set<string>();
  for (const x of res.placed) {
    const k = `${x.raw.voice}:${x.raw.on}`;
    if (seen.has(k)) throw new Error(`${id}: two table lines on one statement: ${x.expert.line}`);
    seen.add(k);
  }
  const built = buildEntries(piece, res.placed.map((x) => x.raw), speller);
  const canon = new Map(res.placed.filter((x) => x.expert.canon).map((x) => [`${x.raw.voice}:${x.raw.on}`, x.expert.canon!]));
  return built.map((e) => {
    const out: typeof e & { canon?: "dux" | "comes" } = { ...e };
    if (ex.upside.includes(e.theme ?? 1)) {
      if (out.inverted) delete out.inverted;
      else out.inverted = true;
    }
    const c = canon.get(`${e.voice}:${e.on}`);
    if (c) out.canon = c;
    return out;
  });
}

/** The entries of a subject (and of its answer, where it is not inverted or rescaled), by the head and transformed. */
function rawEntries(wp: WtcPiece, subject: Line[], answer: Line[], answerInverted: boolean): RawEntry[] {
  const midi = (p: string) => parsePitch(p).midi;
  const span = subject[subject.length - 1].on + subject[subject.length - 1].dur - subject[0].on;
  const level = midi(answer[0].pitch) - midi(subject[0].pitch);
  const raw: RawEntry[] = [];
  const models: [Line[], number][] = answerInverted ? [[subject, 0]] : [
    [subject, 0],
    [answer, level],
  ];
  for (const [model, lv] of models) {
    for (const e of findEntriesByHead(wp, [...model]).entries) {
      if (raw.some((x) => x.voice === e.voice && Math.abs(x.on - e.on) < span)) continue;
      raw.push({ voice: e.voice, on: e.on, len: span, shift: midi(e.pitch) - midi(model[0].pitch) + lv, inverted: e.form === "inversion", scale: 1, theme: 1 });
    }
  }
  for (const e of findTransformed(wp, [...subject])) {
    if (raw.some((x) => x.voice === e.voice && Math.abs(x.on - e.on) < span * e.scale)) continue;
    raw.push({ voice: e.voice, on: e.on, len: Math.round(span * e.scale), shift: midi(e.pitch) - midi(subject[0].pitch), inverted: e.form === "inversion", scale: e.scale, theme: 1 });
  }
  return raw;
}

/**
 * The first imitation in a piece: a voice's opening that another voice takes up, at the same rhythm
 * (or twice as fast or slow) and the same steps by letter (or mirrored), the first four steps free of
 * one change (a tonal answer); the earliest such entry of six notes or more, then the longest. The
 * subject: the opening as far as the imitation follows it (at most 24 notes); the answer: the imitation.
 */
export function imitation(wp: WtcPiece): { subject: Line[]; answer: Line[]; inverted: boolean; scale: number } | null {
  const lines = wp.voices.map((v) => line(v)).filter((l) => l.length);
  const dia = (p: string) => parsePitch(p).diatonic;
  const barQ = ((Number(wp.meter.split("/")[0]) * 4) / Number(wp.meter.split("/")[1])) * TPQ;
  let best: { on: number; k: number; subject: Line[]; answer: Line[]; inverted: boolean; scale: number } | null = null;
  for (const a of lines)
    for (const b of lines) {
      if (a === b) continue;
      for (let j = 0; j < b.length && b[j].on <= a[0].on + 12 * barQ; j++) {
        if (b[j].on <= a[0].on) continue;
        for (const scale of [1, 0.5, 2])
          for (const inv of [false, true]) {
            let k = 0;
            let misses = 0;
            for (let i = 0; i + 1 < a.length && j + i + 1 < b.length && k < 23; i++) {
              const rhythm = (a[i + 1].on - a[i].on) * scale === b[j + i + 1].on - b[j + i].on;
              const step = (dia(a[i + 1].pitch) - dia(a[i].pitch)) * (inv ? -1 : 1) === dia(b[j + i + 1].pitch) - dia(b[j + i].pitch);
              // The head's first note may be held longer or shorter in the answer (one change in all).
              if ((rhythm || i === 0) && (step || i < 4) && (rhythm && step ? true : misses++ < 1)) k = i + 1;
              else break;
            }
            if (k + 1 < 6) continue;
            if (!best || b[j].on < best.on || (b[j].on === best.on && k > best.k))
              best = { on: b[j].on, k, subject: a.slice(0, k + 1), answer: b.slice(j, j + k + 1), inverted: inv, scale };
          }
      }
    }
  return best;
}

/** D751: a Spec's corrections applied to the notes as read (in order; a tie merges the note into the one before). */
export function applyFixes(r: Pick<Read, "voices" | "bars" | "length" | "spell">, fixes: NonNullable<Spec["fixes"]>) {
  for (const x of fixes) {
    const from = r.bars.find((b) => b.n === x.bar)?.on;
    if (from === undefined) throw new Error(`fix: no bar ${x.bar}`);
    const to = r.bars.find((b) => b.n === x.bar + 1)?.on ?? r.length;
    const v = r.voices[x.voice];
    // D753: a note found by its place in the bar ("11/16" of a whole note in) and its pitch as read, checked.
    if ("at" in x) {
      const place = (f: string) => {
        const [a, b] = f.split("/").map(Number);
        return from + Math.round((b ? a / b : a) * 4 * TPQ);
      };
      const on = place(x.at);
      // D754: the notes a layer gives one voice that the print gives another (from `at` to before `until`), moved.
      // D756: notes the edition adds (a trill written out where the print has the plain note), removed.
      if ("until" in x && x.remove) {
        const only = x.pitch ? parsePitch(x.pitch).midi : null;
        const gone = v.filter((n) => n[0] >= on && n[0] < place(x.until) && (only === null || n[2] === only));
        if (!gone.length) throw new Error(`fix: bar ${x.bar} ${x.at}-${x.until}: voice ${x.voice} has nothing to remove`);
        for (const n of gone) v.splice(v.indexOf(n), 1);
        continue;
      }
      if ("until" in x) {
        if (x.toVoice === undefined) throw new Error(`fix: bar ${x.bar} ${x.at}-${x.until}: neither removed nor moved`);
        const end = place(x.until);
        const only = x.pitch ? parsePitch(x.pitch).midi : null;
        const moved = v.filter((n) => n[0] >= on && n[0] < end && (only === null || n[2] === only));
        if (!moved.length) throw new Error(`fix: bar ${x.bar} ${x.at}-${x.until}: voice ${x.voice} has nothing to move`);
        for (const n of moved) v.splice(v.indexOf(n), 1);
        const w = r.voices[x.toVoice!];
        if (!x.chord && w.some((n) => moved.some((m) => n[0] < m[0] + m[1] && m[0] < n[0] + n[1]))) throw new Error(`fix: bar ${x.bar}: voice ${x.toVoice} not silent where the moved notes sound`);
        w.push(...moved);
        w.sort((m, n) => m[0] - n[0] || n[2] - m[2]);
        continue;
      }
      // D754: a note the edition left out, added (its length in whole notes), where the voice is silent.
      if ("add" in x) {
        const p = parsePitch(x.add);
        const end = on + place(x.dur) - from;
        if (v.some((n) => n[0] < end && n[0] + n[1] > on)) throw new Error(`fix: bar ${x.bar} ${x.at}: voice ${x.voice} not silent for ${x.add}`);
        v.push([on, end - on, p.midi, p.diatonic]);
        v.sort((m, n) => m[0] - n[0] || n[2] - m[2]);
        r.spell[p.midi] ??= x.add;
        continue;
      }
      const was = parsePitch(x.from).midi;
      // D756: held on where the print strikes it again: the note split there.
      if ("strike" in x && x.strike) {
        const held = v.find((n) => n[0] < on && n[0] + n[1] > on && n[2] === was);
        if (!held) throw new Error(`fix: no ${x.from} held through ${x.at} of bar ${x.bar}, voice ${x.voice}`);
        v.splice(v.indexOf(held) + 1, 0, [on, held[0] + held[1] - on, held[2], held[3]]);
        held[1] = on - held[0];
        v.sort((m, n) => m[0] - n[0] || n[2] - m[2]);
        continue;
      }
      const m = v.find((n) => n[0] === on && n[2] === was);
      if (!m) throw new Error(`fix: no ${x.from} at ${x.at} of bar ${x.bar}, voice ${x.voice}`);
      // D754: struck again where the print ties it: held on from the note before (the same pitch, ending there).
      if (x.tie) {
        const before = v.find((n) => n[0] + n[1] === on && n[2] === was);
        if (!before) throw new Error(`fix: no ${x.from} held into ${x.at} of bar ${x.bar}, voice ${x.voice}`);
        before[1] += m[1];
        v.splice(v.indexOf(m), 1);
        continue;
      }
      // D756: a length the edition has wrong (in whole notes).
      if ("length" in x && x.length) {
        m[1] = place(x.length) - from;
        if (!x.to) continue;
      }
      // D754: struck later than the edition has it (a rest before it), its end kept.
      if (x.start) {
        const end = m[0] + m[1];
        m[0] = place(x.start);
        m[1] = end - m[0];
        if (m[1] <= 0) throw new Error(`fix: bar ${x.bar} ${x.at}: ${x.from} moved past its end`);
        continue;
      }
      if (!x.to) throw new Error(`fix: bar ${x.bar} ${x.at}: neither a pitch nor a tie`);
      const p = parsePitch(x.to);
      m[2] = p.midi;
      m[3] = p.diatonic;
      r.spell[p.midi] ??= x.to;
      continue;
    }
    const n = v.filter((m) => m[0] >= from && m[0] < to)[x.nth - 1];
    if (!n) throw new Error(`fix: no note ${x.nth} in bar ${x.bar}, voice ${x.voice}`);
    if (x.tie) {
      const i = v.indexOf(n);
      v[i - 1][1] += n[1];
      v.splice(i, 1);
    } else if (x.to) {
      const p = parsePitch(x.to);
      n[2] = p.midi;
      n[3] = p.diatonic;
      r.spell[p.midi] ??= x.to;
    }
  }
}

export function build(s: Spec) {
  const r = s.xml ? readXmlPiece(s) : readPiece(s);
  if (s.fixes) applyFixes(r, s.fixes);
  if (s.ornFixes) applyOrnFixes(r, s.ornFixes);
  const barTicks = ((Number(r.meter.split("/")[0]) * 4) / Number(r.meter.split("/")[1])) * TPQ;
  const piece = { tpq: TPQ, meter: r.meter, bars: r.bars, length: r.length, voices: r.voices, key: s.key };
  const speller = keySpeller(r.spelled);
  const entries = s.entries || AOF_TABLE.has(s.id) ? entriesOf(s, r, piece, speller) : [];
  const cadences = findCadences(piece, speller);
  const f = {
    id: s.id,
    kind: "fugue" as const,
    book: 3,
    number: s.number,
    title: s.title,
    key: s.key,
    bwv: s.bwv,
    meter: r.meter,
    tpq: TPQ,
    length: r.length,
    barTicks,
    bars: r.bars,
    voiceNames: s.voiceNames,
    voices: r.voices,
    entries,
    keys: (entries.length ? entries : cadences).map((e) => ({ on: e.on, key: e.key })).sort((a, b) => a.on - b.on),
    spell: r.spell,
    sections: [{ name: "Whole", fromBar: r.bars[0]?.n ?? 1, toBar: r.bars.at(-1)?.n ?? 1, from: 0, to: r.length }],
    cadences,
    countersubject: [],
    collection: s.collection,
    short: s.short,
    credit: s.credit,
    source: s.page ?? `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=${s.mutopia}`,
    ...(s.defaultVoice !== undefined ? { defaultVoice: s.defaultVoice } : {}),
    ...(s.playable ? { playable: s.playable } : {}),
    ...(r.lyrics ? { lyrics: r.lyrics } : {}),
  };
  homeward(f);
  // A piece where nothing is read (the Canon per Augmentationem: no cadence found) is in its home key throughout.
  if (!f.keys.length) f.keys = [{ on: 0, key: s.key }];
  // D363: each voice the player may take made one line, after the readings above (as extract.ts does
  // for the 48): Mutopia's extra voices on a staff at the cadences (Contrapunctus 5, 6) and in
  // Contrapunctus 7's last bars go to a band-only voice sounding as the staff's (tools/touch/divisi.ts).
  const band: { of: number; notes: Note[] }[] = [];
  f.voices = f.voices.map((v, vi) => {
    if (s.playable && !s.playable.includes(vi)) return v;
    const subject = new Set(entries.filter((e) => e.voice === vi).flatMap((e) => e.notes.filter((n) => n[3] === 0).map((n) => `${n[0]}:${n[2]}`)));
    const split = splitDivisi(v.map((n) => ({ n, sub: ASIDE.has(n) ? 1 : 0 })), vi === f.voices.length - 1, subject);
    if (!split.band.length && !split.unisons) return v;
    if (f.lyrics?.[vi]?.length) throw new Error(`${s.id}: a sung voice split (its words would lose their notes)`);
    if (split.band.length) band.push({ of: vi, notes: sortVoice(split.band) });
    return sortVoice(split.main);
  });
  // An entry's notes are its voice's: those now the band's leave it (as extract.ts).
  for (const e of band.length ? entries : []) {
    const line = new Set(f.voices[e.voice].map((n) => `${n[0]}:${n[1]}:${n[2]}`));
    e.notes = e.notes.filter((n) => line.has(`${n[0]}:${n[1]}:${n[2]}`));
  }
  // D757: the ornaments kept, each on the voice now holding its note (one the band took is the band's: not kept).
  const ornaments: [number, number, string, null, string[]?][] = [];
  for (const o of r.orn ?? []) {
    const vi = f.voices.findIndex((v) => v.some((n) => n[0] === o.on && n[2] === o.midi));
    if (vi < 0) continue;
    ornaments.push(o.graces.length ? [vi, o.on, o.signs, null, o.graces] : [vi, o.on, o.signs, null]);
  }
  ornaments.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  const g = ornaments.length ? { ...f, ornaments } : f;
  return { f: band.length ? { ...g, bandVoices: band } : g, agree: r.agree, unplayed: r.unplayed ?? [], ornLost: (r.orn?.length ?? 0) - ornaments.length };
}

// --- Write ------------------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = [];
  for (const s of SPECS) {
    const { f, agree } = build(s);
    out.push(f);
    const lastBar = f.bars.at(-1)?.n ?? 0;
    console.log(
      `${f.id.padEnd(14)} ${f.voices.length} voices ${String(lastBar).padStart(3)} bars ${f.meter.padEnd(5)} notes ${f.voices.map((v) => v.length).join("/")} entries ${f.entries.length} cadences ${f.cadences.length} · MIDI in LilyPond ${(agree.midiInLy * 100).toFixed(1)}%, LilyPond in MIDI ${(agree.lyInMidi * 100).toFixed(1)}%${"lyrics" in f && f.lyrics ? ` · syllables ${f.lyrics.map((l) => l.length / 3).join("/")}` : ""}`,
    );
  }
  writeFileSync(`${ROOT}data/touch/more-bach.json`, JSON.stringify(out) + "\n");
  console.log(`wrote data/touch/more-bach.json: ${out.length} pieces, ${out.reduce((t, f) => t + f.voices.flat().length, 0)} notes`);
}
