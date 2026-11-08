/**
 * D531, THE SOUND LAB's IDEAS: curated combinations to try, one tap each (the fugue, the sound, the drum style, any
 * layer and tempo setting, the bar to start from). The owner: "pre-select for me some mix combinations that you find
 * potentially interesting … Put a button for those pre-selections. I don't have enough time to check every little thing."
 *
 * Three kinds: SAFE (the style the sound and the metre were written for), BOLD (a mismatch that held up), COMING (S3's
 * score-driven period styles, PLANNED_STYLES: listed, not playable until drum-library.ts makes them styles; then they
 * play with no change here). Chosen by ear-proxy: each candidate rendered through the game's engine and its strokes
 * read against the fugue's own onsets (on the music's grid, off the beat's subdivisions, density); the ones that
 * clashed were dropped (DROPPED below; D531).
 */
import { homeStyleFor, isStyle } from "../../touch/drum-library.ts";
import { PIECE_SOUND } from "../../touch/piece-sound.ts";
import { defaults, type LabSettings, type TempoStep } from "./lab-state.ts";

export type IdeaKind = "safe" | "bold" | "coming";
export interface Idea {
  id: string;
  kind: IdeaKind;
  piece: string;
  sound: string;
  /** A drum-library.ts style, or (kind "coming") a PLANNED_STYLES id. */
  style: string;
  /** The label shown while the style is only planned. */
  styleLabel?: string;
  bar: number;
  tempo?: TempoStep;
  layers?: Partial<Pick<LabSettings, "form" | "climax" | "busoni" | "colour" | "kit">>;
  /** One dry line: why it is worth a listen. */
  why: string;
}
export const KIND_NAME: Record<IdeaKind, string> = { safe: "SAFE MATCHES", bold: "BOLD MISMATCHES THAT MIGHT WORK", coming: "COMING WITH S3: PERIOD DRUMS FROM THE SCORE" };

const I = (id: string, kind: IdeaKind, piece: string, sound: string, style: string, bar: number, why: string, more: Partial<Idea> = {}): Idea => ({ id, kind, piece, sound, style, bar, why, ...more });

export const IDEAS: readonly Idea[] = [
  // SAFE
  I("imp-abbey", "safe", "wtc1f02", "abbeyRoad", "abbey", 1, "The Imp's semiquavers want a drummer who fills only where the subject comes back."),
  I("loco-motorik", "safe", "wtc1f20", "krautrock", "motorik", 1, "Eighty-seven bars of A minor on a beat that never changes its mind."),
  I("crook-salsa", "safe", "wtc2f10", "salsa", "salsa", 1, "Fast cut time in E minor; the clave was always hiding in the subject."),
  I("olympian-choro", "safe", "wtc2f01", "chorinho", "choro", 1, "A 2/4 C major in running semiquavers: a choro in all but name."),
  I("ambush-waltz", "safe", "wtc1f06", "jazzQuartet", "jazzWaltz", 1, "The D minor 3/4 on a ride across the three instead of the band's brushes."),
  I("pilgrim-brushes", "safe", "wtc1f08", "pianoSampled", "brushes", 1, "The long E-flat minor on the grand, brushes stirring under it: late-night Loussier."),
  I("bicycle-808", "safe", "wtc1f07", "analog", "machine", 1, "Switched-On Bach's own decade, with the drum machine it never had."),
  I("pinball-linn", "safe", "wtc1f15", "megaFm", "linn", 1, "A 6/8 gigue on FM bells and a LinnDrum: the console's attract mode."),
  I("diary-pet", "safe", "wtc1f17", "petSounds", "pet", 1, "A-flat major, the tambourine and Hal Blaine's tom: the record's own drummer."),
  I("coronation-timp", "safe", "wtc1f05", "bachBrass", "timpani", 1, "D major, trumpets, and the timpani on tonic and dominant, as Bach would have it."),
  I("hopscotch-break", "safe", "wtc2f15", "tracker", "breakbeat", 1, "A 3/8 G major on the Amiga tracker's own break, the kick doubling on the sixteenth."),
  // BOLD
  I("requiem-triphop", "bold", "wtc1f12", "vocalSynth", "triphop", 1, "The slow F minor with its chromatic subject, pitched down and heavy: Bristol, 1994."),
  I("faust-triphop", "bold", "wtc1f24", "harpsichordSampled", "triphop", 1, "The twelve-note B minor at 43 on a harpsichord over a lazy break."),
  I("telephone-dnb", "bold", "wtc2f13", "tracker", "dnb", 12, "F-sharp major at 124: the fastest duple fugue, the broken second bar under the episodes."),
  I("skipper-dnb", "bold", "wtc1f03", "gameboy", "dnb", 1, "C-sharp major skipping over a jungle break on a handheld."),
  I("machine-idm", "bold", "wtc2f04", "gameboy", "idm", 1, "A 12/16 perpetual motion, glitched: the displaced kicks find the compound beat."),
  I("cross-motorik", "bold", "wtc1f04", "stringConsort", "motorik", 1, "The five-voice C-sharp minor's long breves over a motorik eighth: patience against patience."),
  I("canon-lofi", "bold", "wtc1f01", "pianoSampled", "lofi", 1, "The C major at 49 on the grand, a dull kick behind the beat: beats to study counterpoint to."),
  I("masquerade-bebop", "bold", "wtc2f12", "jazzQuartet", "bebop", 1, "F minor 2/4 for the quartet, with the ride quick and the bombs off the beat."),
  I("sparrow-poprock", "bold", "wtc1f09", "baroqueBand", "poprock", 1, "E major and a tambourine on two and four: the baroque band goes to the radio."),
  I("stooges-shuffle", "bold", "wtc1f19", "jazzQuartet", "shuffle", 1, "The 9/8's three beats on a shuffle's long-short."),
  I("quake-break", "bold", "wtc2f20", "analog", "breakbeat", 1, "The chromatic A minor at 58 on a sampled funk break."),
  I("switchboard-house", "bold", "wtc2f03", "sid64", "house", 1, "C-sharp major on the SID chip with a 909 under it."),
  I("aquarium-bossa", "bold", "wtc1f13", "oboeTrio", "bossa", 1, "Zelenka's oboes in F-sharp major, a cross-stick under them."),
  I("knight-psych", "bold", "wtc1f16", "abbeyRoad", "psych", 1, "G minor in the band's later, looser mood: the ride washing, the floor tom."),
  // COMING (S3)
  I("coronation-military", "coming", "wtc1f05", "bachBrass", "military", 1, "The D major's dotted French-overture rhythm on a Lully side drum.", { styleLabel: "SIDE DRUM" }),
  I("procession-field", "coming", "wtc1f22", "soloVoices", "fieldDrums", 1, "The B-flat minor procession behind rope-tension field drums.", { styleLabel: "FIELD DRUMS" }),
  I("pinball-tabor", "coming", "wtc1f15", "oboeTrio", "tabor", 1, "The 6/8 G major as a pipe-and-tabor dance.", { styleLabel: "TABOR" }),
  I("lastdance-castanets", "coming", "wtc2f24", "harpsichordSampled", "castanets", 1, "The 3/8 B minor dance on a harpsichord and castanets: Scarlatti's Spain.", { styleLabel: "CASTANETS" }),
  I("belltower-janissary", "coming", "wtc2f05", "bachBrass", "janissary", 1, "The D major cut time alla turca: bass drum, cymbals, triangle.", { styleLabel: "JANISSARY" }),
];

/** The candidates the proxy dropped (rendered, then read against the fugue's onsets), with the reason: not to offer again. */
export const DROPPED: Readonly<Record<string, string>> = {
  "wtc2f18/dnb": "6/8: S1's compound grid turns the two-step into a plain 6/8 backbeat; nothing of drum'n'bass left",
  "wtc1f15/dnb": "6/8: the same plain backbeat as II/18, stroke for stroke",
  "wtc1f14/ballad": "6/4: hats in triplet quarters against straight quavers, 42% on the music's grid",
  "wtc1f11/ballad": "3/8: sixteenth triplets against straight semiquavers, 41% on the grid",
  "wtc1f10/bebop": "3/4: a swung ride under straight semiquavers, 63% on the grid",
  "wtc2f16/jazzWaltz": "a swung ride under a band that does not swing, 67% on the grid",
  "wtc2f22/techno": "3/2: three kicks a bar, the clap on 2 of 3: lopsided",
  "wtc2f21/baiao": "3/4: the two-beat baião cut to three, 11 strokes a second",
  "wtc2f24/salsa": "3/8: the clave squeezed into six quavers, 11 strokes a second",
  "wtc2f10/dnb": "the snare on every quarter's off-beat, 11 strokes a second over the subject's quavers",
};
/** Whether an idea can be played now (its style a style of the library: S3's planned ones once they land). */
export const ideaPlayable = (it: Idea): boolean => isStyle(it.style);
/** An idea as the lab's whole setting: its fugue, its sound (null where it is the fugue's own), the drums on with its style. */
export function ideaSettings(it: Idea): LabSettings {
  const own = (PIECE_SOUND[it.piece] ?? "chip") === it.sound;
  return { ...defaults(it.piece), sound: own ? null : it.sound, drums: 1, style: it.style === homeStyleFor(it.sound) ? null : it.style, tempo: it.tempo ?? "default", ...(it.layers ?? {}) };
}
