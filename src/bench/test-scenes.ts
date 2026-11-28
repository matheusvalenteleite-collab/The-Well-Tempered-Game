/**
 * D1069, TEST SCENES (the owner: "an easy accessible way to test those new features ... single click on a pre-selected piece in a
 * pre-selected moment of said piece which is optimal for testing whatever I need to test"). play.html's developer view (SETTINGS,
 * unlocked devices only) lists them; one tap sets the piece, its sound, the voice the player takes and the mechanics the scene needs
 * (MECH.bow, MECH.guitar, MECH.tilt: switched on and kept, the page reloading once if one was off), and starts an unscored TOOLS
 * practice run (practice.ts) of the bars named, looped, a bar or so before the moment worth testing. Each scene's line says what
 * to try (the developer view's menu, not play: words are fine there). The moments chosen from the scores: where the gesture comes
 * up often and the tempo leaves room for it (test/d1069-test-scenes.test.ts holds every piece, sound, voice and bar real).
 */

/** The mechanics a scene needs on: the bow (new-mech.ts NEW MECHANICS) or the guitars' hands and the tilt (GUITAR & TILT). */
export type SceneMech = "bow" | "guitarTilt";

export interface TestScene {
  id: string;
  /** The list's name. */
  name: string;
  piece: string;
  /** A sound.ts preset id. */
  sound: string;
  /** The voice the player takes (0 the top). */
  voice: number;
  /** The bars played (Bach's numbering), looped. */
  fromBar: number;
  toBar: number;
  /** % of the piece's tempo (TOOLS' 50-100). */
  tempo: number;
  mech: SceneMech;
  /** What to try, one short line. */
  line: string;
}

/**
 * The guitar's hands on a CLEAN guitar where it is exposed (the owner, after playing 3.37: I/20's fuzz tenor was buried in four
 * voices and the fuzz flattens the pick's place and the flick: measured offline, edge to edge 1.8 dB in 2-5 kHz on the fuzz, 5.3 on
 * ABBEY ROAD's clean guitar; DECISIONS D1070). ABBEY ROAD seats its guitar (rockGuitar, clean) on the alto of three and four voices;
 * II/8 and I/8 open with the alto alone, a second voice joining in bar 3, so the guitar is heard bare or in two parts.
 */
const CLEAN_II8 = { piece: "wtc2f08", sound: "abbeyRoad", voice: 1, mech: "guitarTilt" as const };
const CLEAN_I8 = { piece: "wtc1f08", sound: "abbeyRoad", voice: 1, mech: "guitarTilt" as const };
/** I/8 on PSYCH (its own sound): the fuzz guitar on the alto, alone for two bars of long notes (the owner tests guitars here). */
const PSYCH_I8 = { piece: "wtc1f08", sound: "krautrock", voice: 1, mech: "guitarTilt" as const };
/** STRING CONSORT's I/4 (C sharp minor, five voices: the first violin on top). */
const CONSORT = { piece: "wtc1f04", sound: "stringConsort", voice: 0, mech: "bow" as const };

export const TEST_SCENES: readonly TestScene[] = [
  { id: "clean-pick", name: "CLEAN GUITAR · PICK PLACE", ...CLEAN_II8, fromBar: 1, toBar: 3, tempo: 100, line: "The guitar alone: on bar 1's repeated D sharps land near the inner edge (bright, by the bridge), then the outer edge (warm, by the neck)." },
  { id: "clean-hard", name: "CLEAN GUITAR · HARD PICK", ...CLEAN_II8, fromBar: 1, toBar: 3, tempo: 100, line: "Bar 1's repeated notes: a still landing, then a landing with a quick sideways flick (a harder, snappier pick)." },
  { id: "clean-bend", name: "CLEAN GUITAR · BEND & VIBRATO", ...CLEAN_II8, fromBar: 1, toBar: 5, tempo: 100, line: "A long note in every bar: hold it and push sideways for a bend (a quarter tone at most); to and fro for vibrato." },
  { id: "clean-hammer", name: "CLEAN GUITAR · HAMMER-ON & PULL-OFF", ...CLEAN_II8, fromBar: 2, toBar: 5, tempo: 100, line: "Bars 3-4, two voices: pass each step thumb to thumb; down the quavers are pull-offs, up the little runs hammer-ons (no new pick)." },
  { id: "clean-slide", name: "CLEAN GUITAR · SLIDE", ...CLEAN_I8, fromBar: 1, toBar: 4, tempo: 100, line: "The guitar alone with long notes: keep the thumb down and drag it up or down to the next note for a smooth glide." },
  { id: "psych-fuzz", name: "PSYCH FUZZ · THE SAME GESTURES", ...PSYCH_I8, fromBar: 1, toBar: 4, tempo: 100, line: "The fuzz guitar alone with long notes: pick place, a flick, a bend, a slide, to compare with the clean guitar (the fuzz flattens place and flick)." },
  { id: "bossa-nylon", name: "BOSSA NOVA · NYLON GUITAR", piece: "wtc1f10", sound: "bossaNova", voice: 1, mech: "guitarTilt", fromBar: 14, toBar: 19, tempo: 50, line: "The lower voice, two parts, half speed: quavers in bars 15 and 17 for place and flick; the scales of 16, 18-19 thumb to thumb (pull-offs)." },
  { id: "consort-bow-long", name: "STRING CONSORT · BOW, LONG NOTES", ...CONSORT, fromBar: 29, toBar: 34, tempo: 100, line: "Long notes in bars 30-34: sway the held thumb sideways; faster is fuller, slower lighter; turn back for a bow change." },
  { id: "consort-bow-joins", name: "STRING CONSORT · BOW, JOINS", ...CONSORT, fromBar: 20, toBar: 25, tempo: 100, line: "Stepwise quarters, bars 21-25: join thumb to thumb; keep the sway going the same way for a slur, the other way for a new bow." },
  { id: "consort-slide", name: "STRING CONSORT · SLIDE", ...CONSORT, fromBar: 40, toBar: 45, tempo: 100, line: "Bars 41-45: keep the thumb down and drag it up or down to the next note (the slide the strings' fix is about)." },
];

export const sceneById = (id: string): TestScene | undefined => TEST_SCENES.find((s) => s.id === id);

/** The scene waiting for the page's reload (its mechanics just switched on), for this tab only. */
export const SCENE_PENDING_KEY = "tg-test-scene-pending";
export function takePendingScene(): TestScene | undefined {
  try {
    const id = sessionStorage.getItem(SCENE_PENDING_KEY);
    if (!id) return undefined;
    sessionStorage.removeItem(SCENE_PENDING_KEY);
    return sceneById(id);
  } catch {
    return undefined;
  }
}
export function keepPendingScene(id: string) {
  try {
    sessionStorage.setItem(SCENE_PENDING_KEY, id);
  } catch {
    /* the scene then needs a second tap after the reload */
  }
}
