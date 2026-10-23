/**
 * D246: each piece's own sound (the owner: "choose a default preset for every piece, the one which
 * suits it the most"). The player's choice for a piece (the pop-up's SOUND, ⚙ SOUND) is kept for that
 * piece; this is the sound before any choice. Read by character:
 *   ORGAN: the stile antico and the ricercar, five voices, pedal points, the long learned fugues
 *     (I/1, 4, 8, 12, 16, 20, 22, 24; II/2, 5, 7, 9, 14, 22, 23).
 *   STRINGS: the arioso, the sarabande, the lament, the sighing lines (I/4, 8, 12, 22 preludes).
 *   BAROQUE BAND: the concerto and the French overture, a tune over a continuo (I/5 fugue, I/10, 17,
 *     24 preludes).
 *   WINDS: the pastoral (I/9, 19, 23 preludes).
 *   CONSORT: the intimate dance, three parts in conversation (I/11, 13, 23 fugues; I/18 prelude).
 *   HARPSICHORD: the keyboard's own figuration, the invention, the crisp fugue (I/1 prelude, I/2 fugue).
 *   BOSSA NOVA: a lilting compound metre (I/13 prelude in 12/16; II/7 in 9/8, II/11, II/13).
 *   WENDY CARLOS: Prelude and Fugue I/7, as on Switched-On Bach (1968).
 *   THE CONSOLES: the perpetual motion and the toccata, by temper: driving minor VAMPIRE KILLER (I/2
 *     prelude), bouncing major PLUMBER BROS (I/3), relentless BLUE BOMBER (I/5 prelude, I/10 fugue),
 *     dungeon minor HYRULE (I/6 prelude), bright LIGHT WORLD (I/15 prelude), light POCKET MONSTERS
 *     and GOLD & SILVER, lively DINOSAUR LAND, brilliant BLUE BLUR.
 * Book II follows the same reading, less closely studied.
 */
export const PIECE_SOUND: Readonly<Record<string, string>> = {
  // Book I
  wtc1p01: "harpsichordSampled",
  wtc1f01: "organSampled",
  wtc1p02: "chipVampire",
  wtc1f02: "harpsichordSampled",
  wtc1p03: "chipPlumber",
  wtc1f03: "baroque",
  wtc1p04: "strings",
  wtc1f04: "organSampled",
  wtc1p05: "chipBomber",
  wtc1f05: "baroque",
  wtc1p06: "chipHyrule",
  wtc1f06: "harpsichordSampled",
  wtc1p07: "carlos",
  wtc1f07: "carlos",
  wtc1p08: "strings",
  wtc1f08: "organSampled",
  wtc1p09: "winds",
  wtc1f09: "chipPocket",
  wtc1p10: "baroque",
  wtc1f10: "chipBomber",
  wtc1p11: "chipDino",
  wtc1f11: "consort",
  wtc1p12: "strings",
  wtc1f12: "organSampled",
  wtc1p13: "bossa",
  wtc1f13: "consort",
  wtc1p14: "harpsichordSampled",
  wtc1f14: "strings",
  wtc1p15: "chipLight",
  wtc1f15: "chipDino",
  wtc1p16: "baroque",
  wtc1f16: "organSampled",
  wtc1p17: "baroque",
  wtc1f17: "winds",
  wtc1p18: "consort",
  wtc1f18: "strings",
  wtc1p19: "winds",
  wtc1f19: "chipGold",
  wtc1p20: "harpsichordSampled",
  wtc1f20: "organSampled",
  wtc1p21: "chipBlur",
  wtc1f21: "baroque",
  wtc1p22: "strings",
  wtc1f22: "organSampled",
  wtc1p23: "winds",
  wtc1f23: "consort",
  wtc1p24: "baroque",
  wtc1f24: "organSampled",
  // Book II
  wtc2p01: "organSampled",
  wtc2f01: "chipPlumber",
  wtc2p02: "harpsichordSampled",
  wtc2f02: "organSampled",
  wtc2p03: "harpsichordSampled",
  wtc2f03: "chipPocket",
  wtc2p04: "strings",
  wtc2f04: "chipVampire",
  wtc2p05: "baroque",
  wtc2f05: "organSampled",
  wtc2p06: "chipBomber",
  wtc2f06: "harpsichordSampled",
  wtc2p07: "bossa",
  wtc2f07: "organSampled",
  wtc2p08: "consort",
  wtc2f08: "strings",
  wtc2p09: "strings",
  wtc2f09: "organSampled",
  wtc2p10: "harpsichordSampled",
  wtc2f10: "chipBlur",
  wtc2p11: "bossa",
  wtc2f11: "chipDino",
  wtc2p12: "consort",
  wtc2f12: "harpsichordSampled",
  wtc2p13: "bossa",
  wtc2f13: "winds",
  wtc2p14: "strings",
  wtc2f14: "organSampled",
  wtc2p15: "chipLight",
  wtc2f15: "chipPocket",
  wtc2p16: "baroque",
  wtc2f16: "harpsichordSampled",
  wtc2p17: "baroque",
  wtc2f17: "winds",
  wtc2p18: "harpsichordSampled",
  wtc2f18: "strings",
  wtc2p19: "consort",
  wtc2f19: "chipGold",
  wtc2p20: "strings",
  wtc2f20: "chipVampire",
  wtc2p21: "harpsichordSampled",
  wtc2f21: "chipDino",
  wtc2p22: "strings",
  wtc2f22: "organSampled",
  wtc2p23: "chipHyrule",
  wtc2f23: "organSampled",
  wtc2p24: "consort",
  wtc2f24: "chipHyrule",
  // The Art of Fugue
  "bwv1080-14": "organSampled",
};

/** The sound a piece opens with: the player's choice for it, else its own, else the game's default. */
export function soundFor(id: string, chosen: Readonly<Record<string, string>>, fallback: string): string {
  return chosen[id] ?? PIECE_SOUND[id] ?? fallback;
}
