/**
 * The fugue cards (D192): the 48 fugues and Contrapunctus XIV, each a card on the selection wheel. A
 * card has the fugue's BWV, an evocative English title, its SEAL (one of nine reusable seal kinds: a
 * second goal naming what is peculiar about the fugue), the scene its emblem is drawn in (emblem.ts),
 * and its difficulty in stars (the playability report's campaign tier, 1 Apprentice to 5 Thomaskantor).
 *
 * The facts are those of the design study (fugue-cards.md, approved by the owner) marked verified: the
 * repo's data and notes (src/wtc/notes.ts), All of Bach (Netherlands Bach Society) and Wikipedia. Claims
 * the study marks uncertain (~ or ?) are left out of the text. A seal whose kind needs music data not
 * yet extracted (inverted, augmented entries, later subjects: MIRROR, SLOW GIANT, SUBJECTS) is not
 * `ready`; its card says the seal is coming instead of pretending.
 */

export type SealKind = "STRETTO" | "MIRROR" | "SLOW GIANT" | "SUBJECTS" | "PERFECT LINE" | "HOLD" | "NO SLIP" | "DUET" | "TEMPERAMENT";

/** Each seal kind's rule, one line. */
export const SEAL_KINDS: Record<SealKind, string> = {
  STRETTO: "Capture every entry that overlaps another.",
  MIRROR: "Capture every inverted entry, played as the mirrored line.",
  "SLOW GIANT": "Hold every note of the augmented entries, the boss in slow motion.",
  SUBJECTS: "Capture every subject at least once, and their combined entry.",
  "PERFECT LINE": "Answer the subject's telling gesture right every time it comes.",
  HOLD: "Hold the long notes to their written end.",
  "NO SLIP": "Keep the run alive through a named passage.",
  DUET: "Two voices, 1P and 2P, share the seal.",
  TEMPERAMENT: "Grade A in a historical tuning chosen for the key.",
};

/** The seal kinds that need music data the extraction does not give yet. */
export const NEEDS_DATA: ReadonlySet<SealKind> = new Set<SealKind>(["MIRROR", "SLOW GIANT", "SUBJECTS"]);

/** The light and setting the emblem is drawn in. */
export type Scene = "night" | "dusk" | "noon" | "dawn" | "interior" | "water" | "field";
/** The upright sprite drawn for each voice. */
export type Figure = "tower" | "pillar" | "cypress" | "person" | "lantern" | "tree" | "house" | "pipe" | "chess" | "post";
/** The scene's small props (emblem.ts draws each at its own place). */
export type Prop =
  | "sun" | "suns" | "moon" | "boat" | "ladder" | "lantern" | "crosswin" | "rosewin" | "arch" | "clock" | "wall" | "kite" | "drum" | "mill" | "stair"
  | "flag" | "tent" | "gem" | "candle" | "bird" | "swan" | "leaves" | "torch" | "rain" | "key" | "anvil" | "balls" | "checker";

export interface FugueCard {
  /** The piece's id in data/touch/pieces.json. */
  id: string;
  /** 1, 2; 0 for the Art of Fugue. */
  book: 0 | 1 | 2;
  number: number;
  /** "BWV 846"; Contrapunctus XIV "BWV 1080/19". */
  bwv: string;
  /** The evocative title. */
  title: string;
  /** The formal title ("Fugue 2 in C minor"). */
  formal: string;
  seal: { kind: SealKind; line: string };
  /** False while the seal needs data not yet extracted: the card says "seal coming". */
  ready: boolean;
  /** Why the fugue is peculiar, in a line or two (verified facts only). */
  why: string;
  /** The campaign tier, 1 to 5. */
  stars: number;
  scene: Scene;
  figure: Figure;
  props: Prop[];
}

/** The tiers' names (playability report). */
export const TIERS = ["APPRENTICE", "JOURNEYMAN", "CANTOR", "KAPELLMEISTER", "THOMASKANTOR"] as const;

type Row = [n: number, title: string, kind: SealKind, line: string, why: string, stars: number, scene: Scene, figure: Figure, props: Prop[]];

const KEYS = ["C major", "C minor", "C♯ major", "C♯ minor", "D major", "D minor", "E♭ major", "D♯ minor", "E major", "E minor", "F major", "F minor", "F♯ major", "F♯ minor", "G major", "G minor", "A♭ major", "G♯ minor", "A major", "A minor", "B♭ major", "B♭ minor", "B major", "B minor"];

const BOOK_I: Row[] = [
  [1, "No Room to Breathe", "STRETTO", "Capture every entry that overlaps another: 12 of the 23 do.", "Almost no episodes: the subject is nearly always sounding, and the strettos crowd ever closer.", 1, "noon", "tower", ["sun"]],
  [2, "Three Lines, Reshuffled", "NO SLIP", "Keep the run alive from the first entry to the last.", "A subject and two regular countersubjects, recombined voice above voice; exactly 8 entries. It ends on a major third over a held tonic.", 2, "night", "person", ["moon"]],
  [3, "Seven Sharps of Joy", "TEMPERAMENT", "Grade A in Werckmeister III.", "Seven sharps, a key usable only in a well-tempered tuning, and one of the liveliest themes of the whole collection.", 3, "noon", "person", ["suns"]],
  [4, "The Five-Voice Cathedral", "SUBJECTS", "Three subjects, three boss families; the last boss is all three at once.", "Five voices in the old learned style: a slow five-note subject, joined later by two more subjects.", 2, "interior", "pillar", ["crosswin"]],
  [5, "The King's Overture", "NO SLIP", "Every rushing run without a slip.", "In the manner of a French overture: dotted rhythms and rushing scales, ceremonial.", 3, "noon", "person", ["flag", "stair"]],
  [6, "The Mirror and the Trill", "MIRROR", "Capture the inverted entries, read in the mirror.", "A two-bar subject with a trill on its next-to-last note, heard right way up and upside down, in overlapping entries.", 1, "water", "tree", ["moon"]],
  [7, "After the Great Prelude", "NO SLIP", "Keep the run alive from each entry to the next, through the episodes.", "A light, bold fugue after a prelude that is itself a broad fugal piece: two fugues instead of one.", 3, "water", "tower", ["boat"]],
  [8, "Upside Down, Twice as Slow", "SLOW GIANT", "The augmented entries are the last bosses, in slow motion.", "The learned fugue: the subject in inversion, in augmentation and in close stretto. Written in D♯ minor after an E♭ minor prelude.", 2, "water", "person", ["moon"]],
  [9, "Two Notes and Away", "PERFECT LINE", "Every entry's two-note head clean, nothing struck in its rest, its run unbroken.", "One of the shortest themes in the collection: a second, a rest, then a run that becomes the material of the whole fugue.", 3, "noon", "post", ["bird"]],
  [10, "The Duel in Octaves", "DUET", "Two voices, both graded A, the octave passages without a slip.", "The only two-voice fugue in the collection; twice the voices run together in octaves.", 4, "dusk", "person", []],
  [11, "Running Scales, Close to Home", "NO SLIP", "One whole voice without a slip.", "Flowing scales; the music never strays further than D minor and G minor.", 2, "field", "house", []],
  [12, "Ten Chromatic Steps", "PERFECT LINE", "Every semitone of every entry played as a step, never a repeat.", "Ten chromatic notes spanning an octave; with the answer all twelve pitches sound. Severe, with diatonic episodes as relief.", 1, "interior", "pillar", ["stair", "torch"]],
  [13, "Parry and Riposte", "DUET", "Two voices: each entry and the voice that answers it, without a slip.", "A robust theme parried by a briskly bouncing second part.", 2, "noon", "person", ["flag"]],
  [14, "The Yearning Line", "HOLD", "Every suspension and long note held to its end.", "A calm, stepwise subject; the melancholy is carried by a yearning countersubject.", 1, "dusk", "cypress", ["candle"]],
  [15, "The Clowns' Leap", "PERFECT LINE", "The double leap of a seventh answered as a leap, every time.", "A long theme with an off accent and a double leap of a seventh; the entries jump round one another and stand on their heads.", 4, "noon", "person", ["tent"]],
  [16, "Changing Places", "STRETTO", "Capture both stretto zones, bars 17 and 28.", "The answer brings no new material: the theme's two parts change places, the upper below.", 1, "interior", "chess", ["checker"]],
  [17, "Late Summer", "PERFECT LINE", "The short subject's leaps clean in all 15 entries.", "Solemn after a sunny prelude, a wistful late summer turning to autumnal minor keys. A subject of seven notes.", 2, "field", "tree", ["sun", "leaves"]],
  [18, "Double Sharps", "TEMPERAMENT", "Grade A in a historical tuning.", "Ever stranger keys on paper, with double sharps; under the fingers, plain ones.", 2, "night", "house", ["moon"]],
  [19, "The Optical Illusion", "PERFECT LINE", "No slip at the entries that cut across the felt pulse: trust the bar.", "A theme whose leaps and rhythm mislead the ear, a musical optical illusion in 9/8.", 5, "dawn", "pillar", ["stair"]],
  [20, "Thirty-Nine Entries and a Pedal", "STRETTO", "Capture the stretto entries; the bass then holds the last pedal to the end.", "One of the largest fugues of Book I, right way up and inverted, in strettos; it ends over a long bass note, almost an organ's pedal.", 3, "interior", "person", ["anvil"]],
  [21, "Strict Company", "NO SLIP", "Every entry played through without a slip.", "One of the most rigid fugues of the collection, academic at first sight, yet it seeks the limits of harmony.", 3, "noon", "person", ["flag"]],
  [22, "Five Voices Closing In", "STRETTO", "Capture the final stretto zone whole.", "Five voices in the old style; a solemn subject in ever closer stretto until the voices enter almost on top of one another.", 1, "dusk", "cypress", []],
  [23, "The Prelude's Four Notes", "MIRROR", "Capture the two inverted entries.", "The subject is the prelude's first four notes at half speed; the theme comes twice in inversion.", 2, "interior", "pillar", ["key"]],
  [24, "All Twelve Tones", "PERFECT LINE", "Every leap and sigh of every entry answered with the right gesture.", "A subject using all twelve notes of the chromatic scale, marked Largo: Book I ends with its most chromatic fugue.", 1, "night", "pillar", ["clock"]],
];

const BOOK_II: Row[] = [
  [1, "The Bass Gets the Last Word", "NO SLIP", "No slip through the added coda.", "Playful and dancing; Bach added 16 bars to give the ending more power in the bass.", 4, "noon", "person", ["kite", "drum"]],
  [2, "The Fourth Voice Arrives", "SLOW GIANT", "The augmented entries in slow motion, the inverted ones in the mirror.", "It starts in three parts; a fourth joins later, lowest of all. Inversion and augmentation; it ends on a major third.", 1, "water", "lantern", ["moon"]],
  [3, "Five Notes, Many Shapes", "STRETTO", "Capture every overlapping entry: 14 of the 27 do.", "A tiny subject built on the major triad, transformed many times, in a game of shapes.", 4, "noon", "person", ["gem"]],
  [4, "Gigue with a Hidden Chromatic Theme", "SUBJECTS", "Find the hidden chromatic theme: it is the boss.", "An energetic gigue with a second theme, and a slow chromatic theme that emerges in the soprano. It ends in major.", 4, "interior", "person", ["torch"]],
  [5, "The Stretto Ladder", "STRETTO", "Capture your entry in the four-voice stretto of bar 44.", "A series of close strettos, the last with the subject in all four voices in bar 44.", 1, "noon", "person", ["ladder"]],
  [6, "Three Strettos", "STRETTO", "Capture all three strettos; the last is the boss.", "Rising triplets and falling chromatic quavers; three strettos, the last in all three voices, right way up and inverted at once.", 5, "night", "tower", ["stair", "rain"]],
  [7, "The Organ Loft", "HOLD", "Every tied long note held full, the leaps clean.", "Strict old style, like organ music, a long theme with striking leaps.", 1, "interior", "pipe", ["rosewin"]],
  [8, "Repeated Notes, Patient Grief", "PERFECT LINE", "Each repeated note struck again, never held.", "Long and tough; the sadness is in the theme's repeated notes. Near the end theme and inversion sound together for the first time.", 1, "night", "house", ["rain"]],
  [9, "The Old Style", "HOLD", "Hold every long note of the old style to its end.", "A subject in the old vocal style, like one by J. C. F. Fischer, drawn into long lines; quicker strettos, a new countersubject, inversion.", 1, "interior", "pillar", ["arch"]],
  [10, "The Galant Leaper", "PERFECT LINE", "Every leap answered as a leap; nothing struck in the two halts.", "A long theme of abrupt leaps and bouncing triplets, two halts before the end. The hardest fugue of the set to play.", 5, "field", "person", []],
  [11, "Six Beats Become Nine", "NO SLIP", "No slip through the shift from six beats to nine.", "Leaps and short motifs; the rhythm shifts from six to what sounds like nine beats a bar.", 3, "noon", "person", ["balls"]],
  [12, "An Elegy in Thirds", "HOLD", "Each sigh pair joined, then let go.", "Parallel thirds and sixths and galant sighs: \"a sort of elegy in a bygone style\" (Reichardt, 1782).", 4, "water", "tree", ["swan"]],
  [13, "A Gavotte on the Leading Note", "PERFECT LINE", "Every half-bar upbeat on time, the trill note clean.", "A gavotte, starting halfway through the bar with a trill on the leading note; endless motion to the end.", 4, "interior", "person", ["rosewin"]],
  [14, "Three Subjects, One Fugue", "SUBJECTS", "Three subjects, three boss families; the last boss is all three combined.", "The only triple fugue in Book II: each subject has its own exposition, and all three combine at the end.", 4, "water", "tree", []],
  [15, "From an Improvisation", "NO SLIP", "No slip to the final race, the run alive at the last note.", "A written-out improvised fugue made into a fully worked three-part piece; the last bar races to the final chord.", 4, "interior", "pipe", ["candle"]],
  [16, "The Voices in Pairs", "DUET", "Two voices: the pair that moves together.", "Sober and academic; three-quarters through, the four parts stick together in pairs, with two halts before the climax.", 3, "noon", "person", []],
  [17, "The Fughetta Grown Up", "NO SLIP", "The old fughetta's half and the new half, each without a slip.", "It began around 1720 as the three-part fughetta BWV 901, which forms the first half of this four-part fugue.", 2, "field", "tree", ["sun"]],
  [18, "The Double Fugue", "SUBJECTS", "A second subject's boss from bar 61; the five combined statements are the finale.", "A second, chromatic subject at bar 61; from bar 97 both subjects sound together. The longest of the 48 in bars.", 2, "night", "lantern", ["moon"]],
  [19, "The Breath Before", "PERFECT LINE", "Nothing struck in the opening rest of any entry.", "The theme opens with a quaver rest, heard only once another part gives it context.", 4, "water", "person", []],
  [20, "Bach at His Wittiest", "PERFECT LINE", "Every grotesque leap answered as a leap.", "Almost grotesque leaps, a pompous theme bordering on parody, runs out of hand: Bach at his wittiest.", 5, "noon", "person", ["stair"]],
  [21, "Repeated Notes Push", "PERFECT LINE", "Every repeated note a fresh tap.", "Repeated notes propel the movement; the theme travels through every register.", 2, "noon", "house", ["mill"]],
  [22, "Stretto in the Mirror", "MIRROR", "The strettos of right way up and inverted entries are the boss.", "Inversions from bar 42; strettos of the subject and its inversion together at bars 89 and 96.", 3, "water", "tree", []],
  [23, "Two Subjects, No Tricks", "SUBJECTS", "The combined entries of the two subjects are the bosses.", "A half-note subject spanning an octave with great dignity, and a second of falling quavers; no inversion, no stretto.", 2, "dusk", "tower", ["clock", "leaves"]],
  [24, "The Last Passepied", "PERFECT LINE", "Every leap clean through the last entry, Book II's final boss.", "A light passepied with a theme full of leaps; the whole collection ends lightly.", 4, "dawn", "person", ["lantern"]],
];

const XIV: Row = [14, "B-A-C-H, Unfinished", "SUBJECTS", "Play to the last note Bach wrote.", "The fugue on three subjects; the third spells B-A-C-H (B♭, A, C, B♮). It breaks off at bar 239.", 2, "dusk", "pillar", ["wall"]];

function card(book: 0 | 1 | 2, r: Row): FugueCard {
  const [number, title, kind, line, why, stars, scene, figure, props] = r;
  const aof = book === 0;
  return {
    id: aof ? "bwv1080-14" : `wtc${book}f${String(number).padStart(2, "0")}`,
    book,
    number,
    bwv: aof ? "BWV 1080/19" : `BWV ${(book === 1 ? 845 : 869) + number}`,
    title,
    formal: aof ? "Contrapunctus XIV · Fuga a 3 soggetti" : `Fugue ${number} in ${KEYS[number - 1]}`,
    seal: { kind, line },
    ready: !NEEDS_DATA.has(kind),
    why,
    stars,
    scene,
    figure,
    props,
  };
}

/** Book I, Book II, then Contrapunctus XIV: 49 cards. */
export const CARDS: FugueCard[] = [...BOOK_I.map((r) => card(1, r)), ...BOOK_II.map((r) => card(2, r)), card(0, XIV)];

export function cardById(id: string): FugueCard | undefined {
  return CARDS.find((c) => c.id === id);
}

/** A book's cards in Bach's order (0: Contrapunctus XIV alone). */
export function bookCards(book: 0 | 1 | 2): FugueCard[] {
  return CARDS.filter((c) => c.book === book);
}

/**
 * The best grade per piece and voice (D192), kept on this device: recorded from the result screen,
 * only a better one replacing it. Seals are not earned yet (their rules come later).
 */
export const BEST_KEY = "tb-best-v1";
const ORDER = ["S", "A", "B", "C", "D"];

export function betterGrade(a: string | undefined, b: string): string {
  if (!a || !ORDER.includes(a)) return b;
  return ORDER.indexOf(b) >= 0 && ORDER.indexOf(b) < ORDER.indexOf(a) ? b : a;
}

export type Best = Record<string, string>;

export function readBest(): Best {
  try {
    const v = localStorage.getItem(BEST_KEY);
    const o = v ? (JSON.parse(v) as unknown) : {};
    return o && typeof o === "object" ? (o as Best) : {};
  } catch {
    return {};
  }
}

export function recordBest(piece: string, voices: number[], grade: string): void {
  if (!ORDER.includes(grade)) return;
  try {
    const best = readBest();
    for (const v of voices) best[`${piece}:${v}`] = betterGrade(best[`${piece}:${v}`], grade);
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* no storage */
  }
}
