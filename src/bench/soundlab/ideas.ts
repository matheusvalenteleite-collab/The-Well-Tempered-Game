/**
 * D531, THE SOUND LAB's IDEAS: curated combinations to try, one tap each (the fugue, the sound, the drum style, any
 * layer and tempo setting, the bar to start from). The owner: "pre-select for me some mix combinations that you find
 * potentially interesting … Put a button for those pre-selections. I don't have enough time to check every little thing."
 *
 * D591: four kinds (IDEAS below): OWN, SAFE, TAILORED, and COMING (a style not built yet). Chosen by ear-proxy: each candidate rendered through the game's engine and its strokes
 * read against the fugue's own onsets (on the music's grid, off the beat's subdivisions, density); the ones that
 * clashed were dropped (DROPPED below; D531).
 */
import { homeFor, isStyle } from "../../touch/drum-library.ts";
import { PIECE_SOUND } from "../../touch/piece-sound.ts";
import { defaults, type LabSettings, type TempoStep } from "./lab-state.ts";

export type IdeaKind = "own" | "safe" | "tailored" | "coming";
export interface Idea {
  id: string;
  kind: IdeaKind;
  piece: string;
  sound: string;
  /** A drum-library.ts style, or (until it lands) one the drums session is building: then listed as COMING. */
  style: string;
  /** The label shown while the style is only planned. */
  styleLabel?: string;
  bar: number;
  tempo?: TempoStep;
  layers?: Partial<Pick<LabSettings, "form" | "climax" | "busoni" | "colour" | "kit">>;
  /** One dry line: why it is worth a listen. */
  why: string;
}
export const KIND_NAME: Record<IdeaKind, string> = { own: "THE FUGUES' OWN (THE NEW DEFAULTS)", safe: "SAFE MATCHES", tailored: "TAILORED COMBINATIONS", coming: "COMING WITH THE NEW DRUMS" };

const I = (id: string, kind: Exclude<IdeaKind, "coming">, piece: string, sound: string, style: string, bar: number, why: string, more: Partial<Idea> = {}): Idea => ({ id, kind, piece, sound, style, bar, why, ...more });

/**
 * D591 (the owner: "I hated most of the bold mismatches"): the bold mismatches gone, but the four that worked, now their
 * fugues' own (I/1 lo-fi, II/12 bebop, II/3 909, II/4 glitch); the rejected ones (pinball-tabor, lastdance-castanets,
 * stooges-shuffle, faust-triphop) and every other mismatch (DROPPED) not offered again. OWN: each fugue whose setup changed,
 * as it now opens (sound and drums); SAFE: the sound's own drummer or its family's, in the metre it FITS; TAILORED: a
 * fugue's character met by a style of another family, chosen for the match (a dance's period kit, a synthesizer's machine).
 * A style the drums session is still building is listed as COMING and plays once it lands (ideaPlayable), with no change here.
 */
export const IDEAS: readonly Idea[] = [
  // OWN: the new defaults (D585-D590), each its fugue's own sound and drums.
  I("canon-lofi", "own", "wtc1f01", "pianoSampled", "lofi", 1, "The C major at 49 on the grand, a dull kick behind the beat: beats to study counterpoint to."),
  I("imp-berlin", "own", "wtc1f02", "berlinSchool", "scoreSynth", 1, "The Imp's semiquavers as a step sequencer: Berlin, 1975, the kit reading the subject."),
  I("pinball-arcade", "own", "wtc1f15", "megaFm", "arcade", 1, "The bouncing 6/8 gigue on the FM chip, an arcade's kit: the pinball table."),
  I("stooges-vaudeville", "own", "wtc1f19", "vaudeville", "stooges", 1, "The 9/8 scherzo's skips and rests for a slapstick pit band: xylophone, clarinet, bassoon."),
  I("loco-liebezeit", "own", "wtc1f20", "krautrock", "liebezeit", 1, "Eighty-seven bars of A minor over a Tago Mago loop: toms and hats interlocking."),
  I("finale-orchestra", "own", "wtc1f24", "orchestraOrgan", "timpani", 63, "Book I's last fugue from bar 63: the winds held back, then the organ arriving at the final group."),
  I("switchboard-house", "own", "wtc2f03", "sid64", "house", 1, "C-sharp major on the SID chip with a 909 under it."),
  I("machine-idm", "own", "wtc2f04", "gameboy", "idm", 1, "A 12/16 perpetual motion on the handheld, glitched: the displaced kicks find the compound beat."),
  I("masquerade-bebop", "own", "wtc2f12", "jazzQuartet", "bebop", 1, "F minor 2/4 for the quartet, with the ride quick and the bombs off the beat."),
  I("sea-swell", "own", "wtc2f18", "fluteHarp", "swell", 1, "The G-sharp minor 6/8 flowing on alto flute, harp and cello, mallets and cymbal swells."),
  I("lastdance-synth", "own", "wtc2f24", "analog", "arcade", 1, "The 3/8 passepied on Carlos's analog voices, bouncing on an arcade's chip kit."),
  I("lastdance-kit", "tailored", "wtc2f24", "analog", "scoreSynth", 1, "The same passepied with the synth kit reading its score: the subject's rhythm on the snare."),
  I("coronation-march", "own", "wtc1f05", "bachBrass", "march", 1, "The French overture's dotted rhythm on a march snare: rudiments, flams, rolls into the entries."),
  I("belltower-march", "own", "wtc2f05", "bachBrass", "march", 1, "The D major alla breve from a tower: the bass drum on the strong beats, the snare on the subject."),
  // SAFE: the sound's own drummer or its family's, idiomatic in the metre.
  I("crook-salsa", "safe", "wtc2f10", "salsa", "salsa", 1, "Fast cut time in E minor; the clave was always hiding in the subject."),
  I("olympian-choro", "safe", "wtc2f01", "chorinho", "choro", 1, "A 2/4 C major in running semiquavers: a choro in all but name."),
  I("ambush-waltz", "safe", "wtc1f06", "jazzQuartet", "jazzWaltz", 1, "The D minor 3/4 on a ride across the three instead of the band's brushes."),
  I("pilgrim-brushes", "safe", "wtc1f08", "pianoSampled", "brushes", 1, "The long E-flat minor on the grand, brushes stirring under it: late-night Loussier."),
  I("bicycle-808", "safe", "wtc1f07", "analog", "machine", 1, "Switched-On Bach's own decade, with the drum machine it never had."),
  I("diary-pet", "safe", "wtc1f17", "petSounds", "pet", 1, "A-flat major, the tambourine and Hal Blaine's tom: the record's own drummer."),
  I("procession-field", "safe", "wtc1f22", "soloVoices", "fieldDrums", 1, "The B-flat minor procession behind rope-tension field drums."),
  // TAILORED: a fugue's character met across the families.
  I("coronation-military", "tailored", "wtc1f05", "bachBrass", "military", 1, "The D major's dotted French-overture rhythm on a Lully side drum."),
  I("ombra-castanets", "tailored", "wtc2f16", "baroqueBand", "castanets", 1, "The G minor 3/4 on the baroque band, castanets on its lilting subject: a dark Spanish courante."),
  I("lantern-swing", "tailored", "wtc1f14", "jazzQuartet", "jazz", 1, "The F-sharp minor 6/4 on the ride's swing in twelve: the quartet's compound beat."),
  I("quake-break", "tailored", "wtc2f20", "analog", "breakbeat", 1, "The chromatic A minor at 58 on the analog voices over a heavy funk break."),
];

/** The candidates the proxy dropped (rendered, then read against the fugue's onsets), with the reason: not to offer again. */
export const DROPPED: Readonly<Record<string, string>> = {
  "wtc1f15/linn": "6/8: the LinnDrum no longer FITS a compound metre (S1's final FITS); its 6/8 is a plain backbeat",
  "wtc1f14/ballad": "6/4: hats in triplet quarters against straight quavers, 42% on the music's grid",
  "wtc1f11/ballad": "3/8: sixteenth triplets against straight semiquavers, 41% on the grid",
  "wtc1f10/bebop": "3/4: a swung ride under straight semiquavers, 63% on the grid",
  "wtc2f16/jazzWaltz": "a swung ride under a band that does not swing, 67% on the grid",
  "wtc2f22/techno": "3/2: three kicks a bar, the clap on 2 of 3: lopsided",
  "wtc2f21/baiao": "3/4: the two-beat baião cut to three, 11 strokes a second",
  "wtc2f24/salsa": "3/8: the clave squeezed into six quavers, 11 strokes a second",
  "wtc2f10/dnb": "the snare on every quarter's off-beat, 11 strokes a second over the subject's quavers",
  // D591, the owner's verdicts after 2.50 ("I hated most of the bold mismatches") and the rest judged mismatches with them.
  "wtc1f15/tabor": "the owner: \"didn't like this as tabor and pipe … keep its synthy idea\"",
  "wtc2f24/castanets": "the owner: \"very bad idea to go for this Scarlatti sound\"",
  "wtc1f19/shuffle": "the owner: \"didn't work out as shuffle\"",
  "wtc1f24/triphop": "the owner hated the bold mismatches; Book I's finale on the harpsichord over a lazy break",
  "wtc1f02/abbey": "the owner: ABBEY ROAD \"didn't fit at all\" on I/2",
  "wtc2f05/janissary": "the owner: \"the Janissary drum is boring and shitty, I hate it\"",
  "wtc2f18/dnb": "a bold mismatch: II/18's gigue on a jungle two-step (the owner hated most of them)",
  "wtc2f15/breakbeat": "a bold mismatch: a funk break squeezed into 3/8",
  "wtc1f12/triphop": "a bold mismatch: the vocal synth's slow F minor over a lazy break",
  "wtc2f13/dnb": "a bold mismatch: drum'n'bass under a gavotte",
  "wtc1f03/dnb": "a bold mismatch: a jungle break under the handheld's C-sharp major",
  "wtc1f04/motorik": "a bold mismatch: the five-voice ricercar's breves over a motorik eighth",
  "wtc1f09/poprock": "a bold mismatch: the baroque band on a pop-rock backbeat",
  "wtc1f13/bossa": "a bold mismatch: Zelenka's oboes over a cross-stick (I/13 keeps its own)",
};
/** Whether an idea can be played now (its style a style of the library: S3's planned ones once they land). */
export const ideaPlayable = (it: Idea): boolean => isStyle(it.style);
/** An idea as the lab's whole setting: its fugue, its sound (null where it is the fugue's own), the drums on with its style. */
export function ideaSettings(it: Idea): LabSettings {
  const own = (PIECE_SOUND[it.piece] ?? "chip") === it.sound;
  return { ...defaults(it.piece), sound: own ? null : it.sound, drums: 1, style: it.style === homeFor(it.piece, it.sound) ? null : it.style, tempo: it.tempo ?? "default", ...(it.layers ?? {}) };
}
