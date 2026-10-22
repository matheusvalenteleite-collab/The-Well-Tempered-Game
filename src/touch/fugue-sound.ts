/**
 * D200: each fugue its own designated sound (owner: "each fugue will have its own designated preset,
 * precisely designed to raise its qualities"). For each of the 48 fugues and Contrapunctus XIV an
 * ensemble (sound.ts `Preset`): an instrument per voice, chosen for that fugue's character and for the
 * register each voice actually uses (pieces.json), a loop fitted to its metre (or none), the room, and
 * sometimes a tuning to suggest.
 *
 * Every one keeps what makes the BOSSA NOVA the owner's favourite (D193): soft spectra (a sine or
 * triangle body under any edge); each voice its own way of speaking (sustained, bell-like, plucked,
 * bowed), so that the voices part by how they sound and not only by pitch, most of all where entries
 * crowd in stretto; a light loop above the voices with no backbeat (no snare, no clap), stating the
 * written metre and never fighting it; a room about 0.3; a slow vibrato or tremolo in the sustained
 * voices. Old-style (stile antico) fugues have a consort with a sung top and often no loop; gigues and
 * dances, plucks and a dance loop; the chromatic and lamenting ones, dark breathing winds over a bowed
 * bass; the two-voice fugue a duel of unlike instruments; the five-voice ones five colours; the Art of
 * Fugue an organ.
 */
import { presetById, setPreset, slotOf, type Groove, type PatchId, type Preset } from "./sound.ts";
import { FUGUES, fugueById } from "./fugue.ts";

/**
 * Where each instrument the fugues use sounds well (MIDI, lowest and highest): its real compass, or,
 * where a synthesized imitation carries further, a little more. A voice is given an instrument only if
 * every one of its notes lies inside (tested).
 */
export const REGISTER: Partial<Record<PatchId, [number, number]>> = {
  choirOo: [55, 86],
  altoDoo: [50, 79],
  cornetto: [55, 88],
  sackbut: [34, 74],
  traverso: [59, 91],
  softFlute: [55, 96],
  recorder: [55, 91],
  oboe: [58, 91],
  oboeDamore: [55, 86],
  clarinet: [50, 94],
  bassetHorn: [41, 82],
  bassoon: [34, 75],
  horn: [41, 79],
  clarino: [60, 91],
  violin: [55, 100],
  viola: [48, 88],
  cello: [36, 79],
  gamba: [33, 79],
  violone: [28, 67],
  harp: [36, 96],
  lute: [40, 81],
  lautenwerk: [36, 89],
  theorbo: [28, 69],
  harpsiBass: [28, 72],
  harpsiBassSampled: [33, 77],
  celesta: [60, 108],
  marimba: [45, 96],
  vibraphone: [53, 89],
  rhodes: [40, 91],
  nylonGuitar: [40, 83],
  uprightBass: [28, 67],
  softBass: [28, 67],
  organSampled: [24, 96],
  organFlute: [36, 96],
  organReed: [36, 84],
  pedalBourdon: [24, 67],
};

export type Temperament = "werckmeister" | "kirnberger" | "vallotti";

export interface FugueSound {
  /** The piece's id in pieces.json ("wtc1f02", "bwv1080-14"). */
  id: string;
  /** "I/2 · NIGHT TRIO". */
  name: string;
  /** The instruments of the fugue's voices, from the top down (as many as it has voices). */
  voices: PatchId[];
  /** Its loop (played when DRUMS is on), or none. */
  groove?: Groove;
  room: number;
  /** A tuning to suggest (tuning.ts), where the key's colour is the point. */
  temperament?: Temperament;
  /** Why these, in a line. */
  why: string;
}

const S = (id: string, name: string, voices: PatchId[], groove: Groove | undefined, room: number, why: string, temperament?: Temperament): FugueSound => ({
  id,
  name,
  voices,
  groove,
  room,
  why,
  ...(temperament ? { temperament } : {}),
});

export const FUGUE_SOUNDS: FugueSound[] = [
  // Book I.
  S("wtc1f01", "I/1 · FOUR TOWERS", ["traverso", "oboeDamore", "lautenwerk", "violone"], "tactus", 0.3,
    "Twelve of 23 entries overlap: breath, reed, pluck and bow, four ways of speaking, keep every entry in the crowd its own; only the tactus under them.", "kirnberger"),
  S("wtc1f02", "I/2 · NIGHT TRIO", ["traverso", "rhodes", "uprightBass"], "bossa", 0.3,
    "Three lines that trade places: a breathy flute, a bell-like Rhodes and a round plucked bass stay told apart wherever each line goes; the bossa's night groove carries the sixteenths."),
  S("wtc1f03", "I/3 · SEVEN SUNS", ["recorder", "marimba", "cello"], "toccata", 0.28,
    "The most joyful theme: a piping recorder, a bouncing marimba, a détaché cello, a light motor; heard in a well temperament, the remote key's own colour.", "werckmeister"),
  S("wtc1f04", "I/4 · CATHEDRAL OF FIVE", ["choirOo", "organFlute", "gamba", "sackbut", "pedalBourdon"], undefined, 0.38,
    "Five voices in the old motet style: a sung top, a flute stop, a viol, a sackbut and the organ's pedal, five colours, no loop, a church's room for the slow cross-shaped subject."),
  S("wtc1f05", "I/5 · THE KING'S ENTRANCE", ["clarino", "viola", "horn", "harpsiBass"], "overture", 0.3,
    "A French overture: a clarino over strings and horn, a harpsichord continuo crisp in the dotted rhythms and runs, timpani-like kicks on the strong beats."),
  S("wtc1f06", "I/6 · STILL POND", ["oboe", "harp", "gamba"], "minuet", 0.3,
    "A singing oboe for the trilled subject, a harp rippling between, a gamba below: the inversions reflected in unlike colours; a soft triple-time pulse."),
  S("wtc1f07", "I/7 · LITTLE BOAT", ["recorder", "lautenwerk", "uprightBass"], "bossa", 0.3,
    "A light fugue whose joy lives in its long episodes: a recorder sails over a lute-harpsichord and a plucked bass, on the bossa's easy swell."),
  S("wtc1f08", "I/8 · LONG SHADOW", ["oboeDamore", "bassetHorn", "violone"], undefined, 0.34,
    "The learned fugue of inversion and augmentation, at night: dark breathing reeds over a bowed bass that can hold the augmented subject at full length; no loop.", "werckmeister"),
  S("wtc1f09", "I/9 · BIRD ON A WIRE", ["traverso", "viola", "theorbo"], "toccata", 0.28,
    "Two notes and away: a breathy flute takes off, a détaché viola runs, a theorbo plucks below; the motor keeps the run that does not know when to stop."),
  S("wtc1f10", "I/10 · THE DUEL", ["violin", "harpsiBassSampled"], "minuet", 0.26,
    "The only two-voice fugue: a bowed violin against a recorded harpsichord, sustained against struck, so the two octave passages ring out as one gesture of two."),
  S("wtc1f11", "I/11 · BROOK DANCE", ["recorder", "harp", "uprightBass"], "passepied", 0.28,
    "A quick 3/8 felt one in a bar: recorder, harp and a pizzicato bass, a dance loop on the bar's one."),
  S("wtc1f12", "I/12 · CRYPT STAIR", ["oboeDamore", "bassetHorn", "gamba", "violone"], "lament", 0.34,
    "Ten chromatic steps: dark, breathing reeds and bowed viols, every semitone sustained and audible; a slow heartbeat, nothing more."),
  S("wtc1f13", "I/13 · PARRY AND RIPOSTE", ["clarino", "marimba", "cello"], "toccata", 0.28,
    "A robust theme parried by a bouncing part: a clarino against a marimba, a cello below; the sharps' key heard in a well temperament.", "werckmeister"),
  S("wtc1f14", "I/14 · CANDLE AT DUSK", ["violin", "oboeDamore", "gamba", "violone"], "sarabande", 0.32,
    "A yearning, sustained fugue: a violin's vibrato, an oboe d'amore, viols; every suspension held; a sarabande's weight on the second beat of each half bar."),
  S("wtc1f15", "I/15 · THE ACROBATS", ["recorder", "marimba", "uprightBass"], "gigue", 0.28,
    "Leaps of a seventh and entries standing on their heads: a recorder, a marimba and a pizzicato bass, light and plucked, on a 6/8 gigue."),
  S("wtc1f16", "I/16 · CHESSBOARD", ["oboe", "clarinet", "lute", "cello"], "chamber", 0.3,
    "The theme's two parts change places: four unlike colours (nasal reed, hollow reed, lute, cello) show which is which in every stretto."),
  S("wtc1f17", "I/17 · LATE SUMMER", ["traverso", "rhodes", "horn", "softBass"], "bossa", 0.32,
    "Solemn after a sunny prelude, turning autumnal: flute, Rhodes and a mellow horn over the soft bass, the bossa's late-summer evening."),
  S("wtc1f18", "I/18 · FROSTED GLASS", ["celesta", "oboeDamore", "gamba", "theorbo"], "tactus", 0.3,
    "Double sharps, a plain chord pattern in an astringent key: a glassy celesta over reed and viol, a theorbo below; a historical tuning to hear the far key's colour.", "vallotti"),
  S("wtc1f19", "I/19 · PENROSE STAIR", ["violin", "harp", "cello"], "gigue", 0.28,
    "A theme whose leaps fool the ear: the gigue loop states the written 9/8 bar, so the illusion is heard against the true pulse; violin, harp, cello."),
  S("wtc1f20", "I/20 · THE FORGE", ["oboe", "viola", "marimba", "violone"], "chamber", 0.3,
    "Thirty-eight entries overlapping in twos and threes: reed, bow, hammered wood and a bowed bass that holds the closing pedal like an organ's."),
  S("wtc1f21", "I/21 · WIND TRIO", ["recorder", "clarinet", "bassoon"], "minuet", 0.28,
    "A strict fugue with regular countersubjects: a wind trio, each its own breath (recorder, clarinet, bassoon), on a light triple-time pulse."),
  S("wtc1f22", "I/22 · FIVE CYPRESSES", ["choirOo", "oboeDamore", "bassetHorn", "sackbut", "violone"], undefined, 0.36,
    "Five voices in the old style closing into stretto: a sung top, two dark reeds, a sackbut, a bowed bass, five colours that stay apart when the entries pile up; no loop."),
  S("wtc1f23", "I/23 · KEY AND SHADOW", ["traverso", "vibraphone", "harp", "softBass"], "chamber", 0.3,
    "The prelude's four notes, its shadow at half speed: a gentle, bossa-like ensemble (flute, vibraphone, harp, soft bass) for B major's calm."),
  S("wtc1f24", "I/24 · TWELVE STONES", ["choirOo", "oboeDamore", "bassetHorn", "violone"], "lament", 0.36,
    "Largo, all twelve tones, Book I's darkest close: a sung top, breathing reeds, the walking bass bowed; a slow heartbeat."),
  // Book II.
  S("wtc2f01", "II/1 · HIGH KITE", ["softFlute", "lautenwerk", "cello"], "toccata", 0.28,
    "Playful and high, with a bass that gets the last word: a soft flute and a lute-harpsichord aloft, a cello to carry the added coda."),
  S("wtc2f02", "II/2 · THE FOURTH LANTERN", ["oboe", "horn", "gamba", "pedalBourdon"], "tactus", 0.32,
    "Three voices, then a fourth arriving low: the organ's pedal makes its entry an event; oboe, horn and viol above, in inversion and augmentation."),
  S("wtc2f03", "II/3 · GEM OF FIVE NOTES", ["vibraphone", "clarinet", "cello"], "toccata", 0.28,
    "A tiny triad subject in close stretto and inversion: struck, blown and bowed, so each overlapping copy is told apart; a well temperament for the key.", "werckmeister"),
  S("wtc2f04", "II/4 · TORCHLIT GIGUE", ["clarinet", "lautenwerk", "theorbo"], "gigue", 0.28,
    "An energetic gigue with a slow chromatic theme hidden in the soprano: a sustained clarinet on top lets it surface over the plucked dancers."),
  S("wtc2f05", "II/5 · FOUR LADDERS", ["choirOo", "organFlute", "sackbut", "violone"], "tactus", 0.34,
    "Old style, close strettos up to all four voices at bar 44: voice, flute stop, sackbut and bowed bass, four colours that climb apart."),
  S("wtc2f06", "II/6 · SPIRAL STORM", ["violin", "lautenwerk", "violone"], "chamber", 0.3,
    "Rising triplets, falling chromatic quavers, three strettos: a bowed violin, a plucked lute-harpsichord and a bowed bass, the storm kept clear."),
  S("wtc2f07", "II/7 · THE ORGAN LOFT", ["organReed", "organSampled", "organFlute", "pedalBourdon"], undefined, 0.4,
    "Strict stile antico, organ-like: a registration (a reed stop on top, the recorded principal, a flute stop, the 16' pedal), each voice its stop; no loop."),
  S("wtc2f08", "II/8 · RAIN ON THE PANE", ["celesta", "oboeDamore", "gamba", "theorbo"], "lament", 0.32,
    "Sadness in the theme's repeated notes: a celesta's drops re-struck on each, a breathing reed and a viol to hold the grief, a theorbo below.", "vallotti"),
  S("wtc2f09", "II/9 · STONE CHAPEL", ["choirOo", "altoDoo", "sackbut", "violone"], undefined, 0.38,
    "A stile antico subject in long notes: two sung voices, a sackbut and a bowed bass, a chapel's room; the diminution strettos heard in the sustain."),
  S("wtc2f10", "II/10 · THE HARE", ["violin", "marimba", "uprightBass"], "triplet", 0.28,
    "Detached leaps and bouncing triplets: a violin, a marimba and a pizzicato bass, a loop in triplets so the bounce is felt, not fought."),
  S("wtc2f11", "II/11 · THE JUGGLER", ["recorder", "harp", "uprightBass"], "gigue", 0.28,
    "Six beats that seem to become nine: the gigue loop keeps the written 6/16 under recorder, harp and pizzicato bass, so the shift is heard as a shift."),
  S("wtc2f12", "II/12 · TWO SWANS", ["traverso", "bassetHorn", "harp"], "bossa", 0.3,
    "An elegy in parallel thirds: flute and basset horn glide side by side, alike enough to blend, unlike enough to part; a harp below and the bossa's evening sway."),
  S("wtc2f13", "II/13 · MIRRORED BALLROOM", ["oboe", "lautenwerk", "cello"], "gavotte", 0.3,
    "A gavotte from the half bar, opening on a trill: a courtly oboe, a lute-harpsichord, a cello, the loop lifting each half-bar upbeat.", "werckmeister"),
  S("wtc2f14", "II/14 · THREE RIVERS", ["traverso", "marimba", "gamba"], "chamber", 0.3,
    "The triple fugue: three subjects, each its exposition, then together; breath, wood and bow make the three streams three colours."),
  S("wtc2f15", "II/15 · LAST CANDLE", ["organFlute", "lautenwerk", "theorbo"], "passepied", 0.3,
    "A written-out improvisation racing to its last chord: a chamber organ's flute stop, a lute-harpsichord and a theorbo, one in a bar."),
  S("wtc2f16", "II/16 · DANCERS IN PAIRS", ["oboe", "clarinet", "gamba", "violone"], "minuet", 0.3,
    "Four parts that stick together in pairs: two reeds above, two bowed viols below, each pair a family, each voice its own."),
  S("wtc2f17", "II/17 · SAPLING", ["softFlute", "rhodes", "nylonGuitar", "softBass"], "bossa", 0.3,
    "The fughetta grown into a fugue, in Ab's warmth: the owner's BOSSA NOVA itself, flute, Rhodes, nylon guitar and soft bass, for its descending chromatic countersubject."),
  S("wtc2f18", "II/18 · NIGHT CARRIAGES", ["oboeDamore", "harp", "cello"], "gigue", 0.3,
    "The longest of the 48, a double fugue whose chromatic second subject joins the first: a dark reed, a harp, a cello on a night-road 6/8.", "vallotti"),
  S("wtc2f19", "II/19 · ONE BREATH", ["traverso", "vibraphone", "gamba"], "chamber", 0.3,
    "A theme that opens with a rest: a breathy flute that inhales before it plays, a vibraphone, a gamba down to its seventh string."),
  S("wtc2f20", "II/20 · THE JESTER", ["clarinet", "marimba", "harpsiBass"], "toccata", 0.26,
    "Bach at his wittiest, grotesque leaps: a clarinet clowning over a marimba and a crisp harpsichord bass."),
  S("wtc2f21", "II/21 · WATER MILL", ["recorder", "marimba", "uprightBass"], "passepied", 0.28,
    "Repeated notes push the theme through every register: a marimba keeps each repeat crisp, a recorder above, a pizzicato bass below."),
  S("wtc2f22", "II/22 · MOUNTAIN AND LAKE", ["cornetto", "gamba", "sackbut", "violone"], "sarabande", 0.34,
    "Severe 3/2 with stretti of the subject against its mirror: a cornett-and-sackbut consort with viols, a sarabande's grave second beat."),
  S("wtc2f23", "II/23 · CLOCK TOWER", ["clarino", "oboeDamore", "horn", "violone"], "tactus", 0.32,
    "A dignified half-note subject and a falling second one, no tricks: a clarino, an oboe d'amore and a horn over the bowed bass."),
  S("wtc2f24", "II/24 · LAST PASSEPIED", ["traverso", "lautenwerk", "uprightBass"], "passepied", 0.28,
    "A light passepied full of leaps ends the set: flute, lute-harpsichord and pizzicato bass, one in a bar."),
  // The Art of Fugue.
  S("bwv1080-14", "XIV · B-A-C-H", ["organSampled", "organFlute", "organReed", "pedalBourdon"], undefined, 0.42,
    "Contrapunctus XIV on the organ: the recorded principal, a flute stop, a reed and the pedal, so each of the three subjects (B-A-C-H the last) is heard in its stop; no loop, a church's room."),
];

/** The five slots of a preset from the voices' instruments (sound.ts `slotOf`); an unused slot takes its nearest voice's. */
export function slotsFor(voices: PatchId[]): NonNullable<Preset["slots"]> {
  const n = voices.length;
  const at = voices.map((_, v) => slotOf(v, n));
  return [0, 1, 2, 3, 4].map((s) => {
    let best = 0;
    for (let v = 0; v < n; v++) if (Math.abs(at[v] - s) < Math.abs(at[best] - s)) best = v;
    return voices[best];
  }) as NonNullable<Preset["slots"]>;
}

/** A fugue's sound as a preset, ready for setPreset. */
export function presetOf(s: FugueSound): Preset {
  return { id: `fugue:${s.id}`, name: s.name, slots: slotsFor(s.voices), ...(s.groove ? { drums: s.groove, kit: "acoustic" as const } : {}), room: s.room };
}

/** The designated sound of a fugue (a prelude's id gives its fugue's); an unknown id, the BOSSA NOVA. */
export function fugueSound(id: string): Preset {
  const f = fugueById(id);
  if (f.id !== id) return presetById("bossa");
  const fid = f.kind === "prelude" ? FUGUES.find((x) => x.book === f.book && x.number === f.number)?.id : f.id;
  const s = FUGUE_SOUNDS.find((x) => x.id === fid);
  return s ? presetOf(s) : presetById("bossa");
}

/** The entry (with its reasons) for a fugue, if it has one. */
export function fugueSoundInfo(id: string): FugueSound | undefined {
  return FUGUE_SOUNDS.find((x) => x.id === id);
}

/** The sound setting that means "each fugue its own" (beside the ensembles' ids). */
export const DESIGNATED = "designated";

/** The preset a sound setting gives for a fugue: its own when the setting is DESIGNATED, else the ensemble chosen. */
export function presetForFugue(id: string, setting: string = DESIGNATED): Preset {
  return setting === DESIGNATED ? fugueSound(id) : presetById(setting);
}

/** Set the fugue's sound playing (sound.ts `setPreset`). */
export function applyFugueSound(id: string, setting: string = DESIGNATED): Preset {
  const p = presetForFugue(id, setting);
  setPreset(p);
  return p;
}

/** The new instruments D200 adds (for the record and the tests). */
export const D200_PATCHES = [
  "choirOo", "cornetto", "sackbut", "gamba", "violone", "oboeDamore", "bassetHorn", "traverso", "theorbo",
  "celesta", "marimba", "horn", "clarino", "harp", "lautenwerk", "organFlute", "organReed", "pedalBourdon",
] as const satisfies readonly PatchId[];
