import { playerSound } from "./sound.ts";

/**
 * D246: each piece's own sound (the owner: "choose a default preset for every piece, the one which
 * suits it the most"). The player's choice for a piece (the pop-up's SOUND, ⚙ SOUND) is kept for that
 * piece; this is the sound before any choice. Read by character:
 *   ORGAN: the stile antico and the ricercar, five voices, pedal points, the long learned fugues
 *     (I/1, 4, 8, 12, 16, 20, 22, 24; II/2, 5, 7, 9, 14, 22, 23). D249: on the HARPSICHORD for now,
 *     until the new organs exist (ROADMAP Batch 2); the sampled organ is withdrawn.
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
/**
 * D266: Book I's fugues anew, from research (recordings and arrangements, Ledbetter, Dirst's notes for Ars
 * Lyrica), on recorded instruments (sampled.ts), each part within its instrument's compass:
 *   STRINGS (trio, quartet or quintet by the voices): 1, 4, 14, 16, 18, 24 (Förster's quartets, the
 *     Emerson Quartet's "Bach: Fugues", 2008; 4 and 22 with two violas, as there and as Beethoven scored 22,
 *     Hess 38), 6 and 8 (string trio: 8 is K.404a's first fugue, Mozart's circle, 1782), 10 (violin and
 *     cello: a Vivaldian unison), 11 and 12 (Phantasm's viols; strings stand in), 15 (gigue, concerted);
 *   HARPSICHORD: 2, 9, 19 (keyboard wit, a puzzle of skips and rests), 20 (the composer's own showpiece);
 *   BAROQUE BAND (oboe, violin, viola, bassoon): 5 (the French overture), 17 (a Vivaldian Spielfuge);
 *   OBOE, VIOLA & BASSOON: 3 (a bourrée); WIND TRIO (flute, oboe, bassoon): 13 ("joyful progress");
 *   FLUTE, CLARINET & BASSOON: 7 (light, "gently burbling"); FLUTE, VIOLA & CELLO: 21 (galant);
 *   WIND QUARTET: 23 ("wears its learning lightly").
 */
/**
 * D275: Book II's fugues likewise (now on play.html), each part within its instrument's compass:
 *   STRINGS: 5, 7, 8, 9 (four of the five Mozart arranged for string quartet, K.405, 1782; the fifth, 2,
 *     has a tenor below the viola's compass and stays on the harpsichord), 4 (a gigue, concerted),
 *     10, 14, 18 (the long and the double subjects, sustained lines), 16, 22 (the stile antico, as
 *     Book I's 1 and 22), 24 (a passepied in three parts);
 *   HARPSICHORD: 1, 2, 6, 15, 20 (keyboard figuration: the toccata-like and the virtuoso);
 *   BAROQUE BAND: 17 (a festive concerto subject);
 *   OBOE, VIOLA & BASSOON: 3, 19 (light three-part dances);
 *   FLUTE, VIOLA & CELLO: 11, 12, 21 (the galant ones); FLUTE, CLARINET & BASSOON: 13 (a gavotte);
 *   WIND QUARTET: 23 (four voices in long notes, as Book I's 23).
 */
/**
 * D288: every fugue on CLASSIC CHIP for now (the owner: "some kind of generic classic chip for default for
 * now"); D266 and D275's recorded ensembles withdrawn: on a phone speaker they muddled the voices ("I lost
 * all pleasure and couldn't discern any of the polyphony"). The sampled harpsichord stays a choice.
 */
/**
 * D292: five sounds only (sound.ts PRESETS), so every piece opens on one of them. The fugues stay on
 * CLASSIC CHIP (D288). The preludes: those on the harpsichord stay there (the keyboard's own
 * figuration: I/1, 14, 20; II/1, 2, 3, 10, 18, 21), joined by those written as two- and three-part
 * inventions or as a toccata (I/7, 13, 18, 19; II/8, 19, 20, 24; once WENDY CARLOS, BOSSA NOVA, CONSORT,
 * WINDS, STRINGS); the perpetual motions once on the consoles go to CLASSIC CHIP, their nearest kin
 * among the five, and so do the arioso, the pastoral, the concerto and the dance (once STRINGS,
 * WINDS, BAROQUE, CONSORT, BOSSA NOVA). The pianos are new choices; no piece opens on them yet.
 */
/**
 * D355: every fugue its own sound again, tailored (the owner: "every fugue needs a default sound chosen,
 * tailored to it"), among the fifteen the players have: by its character (Keller's and Bodky's readings,
 * docs/wtc/readings), its texture and tessitura, and how it carries on a phone's speaker; each with its
 * reason, and the sound's colour plans, in tools/touch/colour-plans/ (test/d355-colour-plans.test.ts keeps
 * the two in step). The friends' page plays each piece in this sound.
 */
export const PIECE_SOUND: Readonly<Record<string, string>> = {
  // Book I
  wtc1p01: "harpsichordSampled",
  wtc1f01: "chamberOrgan",
  wtc1p02: "chip",
  wtc1f02: "harpsichordSampled",
  wtc1p03: "chip",
  wtc1f03: "gameboy",
  wtc1p04: "chip",
  wtc1f04: "chamberOrgan",
  wtc1p05: "chip",
  wtc1f05: "harpsichordSampled",
  wtc1p06: "chip",
  wtc1f06: "pianoSampled",
  wtc1p07: "harpsichordSampled",
  wtc1f07: "analog",
  wtc1p08: "chip",
  wtc1f08: "pianoSampled",
  wtc1p09: "chip",
  wtc1f09: "super16",
  wtc1p10: "chip",
  wtc1f10: "chip",
  wtc1p11: "chip",
  wtc1f11: "modular",
  wtc1p12: "chip",
  wtc1f12: "nocturne32",
  wtc1p13: "harpsichordSampled",
  wtc1f13: "tomita",
  wtc1p14: "harpsichordSampled",
  wtc1f14: "pianoSampled",
  wtc1p15: "chip",
  wtc1f15: "megaFm",
  wtc1p16: "chip",
  wtc1f16: "harpsichordSampled",
  wtc1p17: "chip",
  wtc1f17: "chamberOrgan",
  wtc1p18: "harpsichordSampled",
  wtc1f18: "pianoSampled",
  wtc1p19: "harpsichordSampled",
  wtc1f19: "tracker",
  wtc1p20: "harpsichordSampled",
  wtc1f20: "harpsichordSampled",
  wtc1p21: "chip",
  wtc1f21: "harpsichordSampled",
  wtc1p22: "chip",
  wtc1f22: "soloVoices",
  wtc1p23: "chip",
  wtc1f23: "vocalSynth",
  wtc1p24: "chip",
  wtc1f24: "nocturne32",
  // Book II
  wtc2p01: "harpsichordSampled",
  wtc2f01: "megaFm",
  wtc2p02: "harpsichordSampled",
  wtc2f02: "chamberOrgan",
  wtc2p03: "harpsichordSampled",
  wtc2f03: "harpsichordSampled",
  wtc2p04: "chip",
  wtc2f04: "pianoSampled",
  wtc2p05: "chip",
  wtc2f05: "vocalSynth",
  wtc2p06: "chip",
  wtc2f06: "harpsichordSampled",
  wtc2p07: "chip",
  wtc2f07: "chamberOrgan",
  wtc2p08: "harpsichordSampled",
  wtc2f08: "nocturne32",
  wtc2p09: "chip",
  wtc2f09: "soloVoices",
  wtc2p10: "harpsichordSampled",
  wtc2f10: "sid64",
  wtc2p11: "chip",
  wtc2f11: "chip",
  wtc2p12: "chip",
  wtc2f12: "modular",
  wtc2p13: "chip",
  wtc2f13: "harpsichordSampled",
  wtc2p14: "chip",
  wtc2f14: "pianoSampled",
  wtc2p15: "chip",
  wtc2f15: "tracker",
  wtc2p16: "chip",
  wtc2f16: "harpsichordSampled",
  wtc2p17: "chip",
  wtc2f17: "super16",
  wtc2p18: "harpsichordSampled",
  wtc2f18: "pianoSampled",
  wtc2p19: "harpsichordSampled",
  wtc2f19: "nocturne32",
  wtc2p20: "harpsichordSampled",
  wtc2f20: "analog",
  wtc2p21: "harpsichordSampled",
  wtc2f21: "super16",
  wtc2p22: "chip",
  wtc2f22: "chamberOrgan",
  wtc2p23: "chip",
  wtc2f23: "tomita",
  wtc2p24: "harpsichordSampled",
  wtc2f24: "gameboy",
  // The Art of Fugue
  "bwv1080-14": "harpsichordSampled",
  ...moreBachSounds(),
};

/**
 * D340: the MORE BACH and CHORALES tabs (among the sounds the players have, sound.ts PRESETS): the Art
 * of Fugue on the HARPSICHORD as Contrapunctus 14 (Bach's open score, a keyboard work in the hands);
 * the Ricercar a 3 on the harpsichord (Bach improvised it at the keyboard), the Ricercar a 6 on the PIPE
 * ORGAN (D246: the ricercar, the stile antico, six voices); the Inventions and Sinfonias on the
 * harpsichord (D246: "the invention"); the Concerto for Two Violins on SUPER 16-BIT, the only sound
 * with bowed strings (its violin for the two solos, its strings for the band, its bassoon for the
 * continuo bass: sound.ts gives it a six-voice layout; no sampled string orchestra is offered, D288); the
 * chorales on the PIPE ORGAN (the organ leading a congregation; SOLO VOICES, the choir, a choice away).
 */
function moreBachSounds(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12r", "12i", "13r", "13i", "c14", "c15", "c16", "c17"]) out[`bwv1080-${n}`] = "harpsichordSampled";
  out["bwv1079-ric3"] = "harpsichordSampled";
  out["bwv1079-ric6"] = "chamberOrgan";
  for (let b = 772; b <= 801; b++) out[`bwv${b}`] = "harpsichordSampled";
  for (let m = 1; m <= 3; m++) out[`bwv1043-${m}`] = "super16";
  for (let c = 1; c <= 371; c++) out[`chor${String(c).padStart(3, "0")}`] = "chamberOrgan";
  // D341: the motet BWV 228 a cappella on SOLO VOICES (singers and the choir; an eight-voice layout, the
  // two choirs apart), the cantata BWV 54 on SUPER 16-BIT's strings as the concerto (the alto line on its strings).
  out["bwv228-1"] = out["bwv228-2"] = "soloVoices";
  out["bwv54-1"] = out["bwv54-3"] = "super16";
  // D348: the harpsichord concertos on SUPER 16-BIT too: its harpsichord for the solo part(s), its strings
  // for the violins and the viola, its bassoon for the continuo bass (sound.ts: a layout for each voice count).
  for (const b of [1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065]) for (let m = 1; m <= 3; m++) out[`bwv${b}-${m}`] = "super16";
  return out;
}

/** The sound a piece opens with: the player's choice for it, else its own, else the game's default. */
export function soundFor(id: string, chosen: Readonly<Record<string, string>>, fallback: string): string {
  const s = chosen[id] ?? PIECE_SOUND[id] ?? fallback;
  // D249: a choice of a withdrawn preset (the organ, kept from before) opens on its stand-in;
  // D292: anything else not among the five (TRAVERSO, an unknown id) on CLASSIC CHIP.
  return playerSound(s);
}
