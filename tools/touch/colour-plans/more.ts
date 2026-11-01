/**
 * D355: MORE BACH's other pieces (the chorales aside): the Inventions and Sinfonias, the Concerto for Two
 * Violins, the motet BWV 228 and the cantata BWV 54. The Inventions and Sinfonias stay on the HARPSICHORD,
 * the instrument Bach's title page writes for ("Clavier"), except where a reason calls another: the three
 * Inventions Carlos recorded on Switched-On Bach (1968: F major, B♭ major, D minor, checked) on SWITCHED-ON,
 * and the slow, chromatic ones on the PIANO, for the "cantabile manner of playing" Bach's title page asks
 * (the Aufrichtige Anleitung, 1723). The concertos, the motet and the cantata keep the sounds the owner asked
 * for (D340, D341, D348, D351). The HARPSICHORD CONCERTOS have no plan: their solo and tutti are written
 * into the orchestration already, and a terraced band would double it.
 */
import { at, beat, H8, H84, H88, HFULL, HLUTE, OFLUTE, OFONDS, OPRIN, OWN, widths, type Moment, type PieceColours } from "./kit.ts";

const B = beat;

/** An Invention or Sinfonia: the harpsichord's own terrace after a cadence (`turn`), back for the close (`home`), and the other sounds' moments. */
function piece(id: string, sound: string, soundWhy: string, character: string, turn: number, home: number, extra: Record<string, Moment[]> = {}): Record<string, PieceColours> {
  const plans: Record<string, Moment[]> = {
    harpsichordSampled: [at(1, H8, "The 8′."), at(turn, H84, "The second part (after its cadence): 8′+4′, a terrace."), at(home, H88, "The return and the close: the coupled unison.")],
    chamberOrgan: [at(1, OFLUTE, "The flutes."), at(turn, OPRIN, "The second part on the principals.")],
    ...extra,
  };
  return { [id]: { sound, soundWhy, character, plans } };
}
const H = "harpsichordSampled";
const HW = (n: number) => `Invention ${n}: a two-part study for the keyboard, the instrument Bach's title page names ("Clavier"): the plucked string keeps the two lines apart on a phone.`;
const SW = (n: number) => `Sinfonia ${n}: a three-part study for the keyboard ("Clavier"): the plucked string keeps the three lines apart on a phone.`;
const CARLOS = (key: string) => `Wendy Carlos recorded the Invention in ${key} on Switched-On Bach (1968): the Moog's two lines, dry and clear on a phone.`;
const CANTABILE = "Slow and chromatic: Bach's title page asks the student 'above all to arrive at a cantabile manner of playing'; the recorded grand sings the lines.";

export const MORE: Record<string, PieceColours> = {
  ...piece("bwv772", H, HW(1), "The motive in imitation; a half cadence on F (18) before the close.", B("bwv772", 18, 2), 21, {
    vocalSynth: [at(B("bwv772", 18, 2), { open: 0.35 }, "The Swingle Singers sang it (1963): after the half cadence, a closed vowel."), at(21, OWN, "Open for the close.")],
    chip: [...widths(B("bwv772", 18, 2), [0.25], "After the half cadence: the lead rounder.")],
  }),
  ...piece("bwv773", H, HW(2), "A strict canon at the octave, then reversed.", 11, 23, { pianoSampled: [at(11, { layer: "soft" }, "The canon's second half in the soft layer."), at(23, OWN, "The close.")] }),
  ...piece("bwv774", H, HW(3), "A lively 3/8; half cadences in D (5), B minor (18), D (42); an A pedal (28-30).", B("bwv774", 18), 43, { gameboy: [...widths(B("bwv774", 18), [0.25], "After the B-minor half cadence: the lead rounder."), at(43, OWN, "The return.")] }),
  ...piece("bwv775", "analog", CARLOS("D minor"), "A 3/8 perpetuum mobile; half cadences in B♭ (26) and A minor (29), an E pedal (29-34).", B("bwv775", 26), 35, { analog: [at(B("bwv775", 26), { lp: 2600 }, "After the half cadence in B♭ (26): the filter half closed, as Carlos changes colour."), at(35, OWN, "Open after the E pedal (35).")] }),
  ...piece("bwv776", H, HW(5), "A melody over a running bass and back; a cadence in F minor (23).", B("bwv776", 23), 27, { megaFm: [at(B("bwv776", 23), { fm: 0.7 }, "After the cadence in F minor, mellower."), at(27, OWN, "The close.")] }),
  ...piece("bwv777", H, HW(6), "A 3/8 in two repeated halves; cadences in B (18) and G♯ minor (42).", B("bwv777", 18), B("bwv777", 42), { tracker: [at(B("bwv777", 18), { vib: 10 }, "The second part with the tracker's vibrato."), at(B("bwv777", 42), OWN, "The close.")] }),
  ...piece("bwv778", H, HW(7), "Cadences in G (7) and D (9), a half cadence in E minor (15) over a B pedal (15-17).", B("bwv778", 9), 15, { sid64: [at(B("bwv778", 9), { pw: 0.2 }, "After the D cadence, narrower."), at(15, { pw: 0.5 }, "The B pedal: square.")] }),
  ...piece("bwv779", "analog", CARLOS("F major"), "A canon in 3/4 at the octave; a cadence in C (12).", B("bwv779", 12), 26, { analog: [at(B("bwv779", 12), { lp: 2600 }, "After the cadence in C (12): the filter half closed."), at(26, OWN, "Open for the return.")] }),
  ...piece("bwv780", "pianoSampled", CANTABILE, "A three-part counterpoint in two voices, chromatic, in 3/4.", 13, 29, { pianoSampled: [at(13, { layer: "soft" }, "The middle in the soft layer."), at(29, OWN, "The return.")] }),
  ...piece("bwv781", H, HW(10), "A 9/8 gigue in arpeggios; a cadence in D (14), a C pedal (24-26).", B("bwv781", 14), 24, { chip: [...widths(B("bwv781", 14), [0.25], "After the D cadence: the lead rounder."), at(24, OWN, "The C pedal.")] }),
  ...piece("bwv782", H, HW(11), "A chromatic subject over a descending bass; cadences in B♭ (6) and D minor (7).", B("bwv782", 7), 17, { nocturne32: [at(B("bwv782", 7), { tone: -2 }, "After the cadence in D minor, darker."), at(17, OWN, "The close.")] }),
  ...piece("bwv783", H, HW(12), "A 12/8 in two voices, a half cadence (3).", 11, 18, { gameboy: [...widths(11, [0.25], "The second part: the lead rounder."), at(18, OWN, "The close.")] }),
  ...piece("bwv784", H, HW(13), "Broken chords in A minor; a cadence in E minor (13).", B("bwv784", 13), 21, { chip: [...widths(B("bwv784", 13), [0.25], "After the cadence in E minor: the lead rounder."), at(21, OWN, "The close.")] }),
  ...piece("bwv785", "analog", CARLOS("B♭ major"), "Cadences in G minor (10) and C minor (12) before the return.", B("bwv785", 10), 15, { analog: [at(B("bwv785", 10), { lp: 2600 }, "After the G-minor cadence: the filter half closed."), at(15, OWN, "Open for the return.")] }),
  ...piece("bwv786", H, HW(15), "A fugal invention in B minor.", 11, 19, { sid64: [at(11, { pw: 0.2 }, "The second part narrower."), at(19, OWN, "The close.")] }),
  ...piece("bwv787", H, SW(1), "Three voices in imitation; the close in C (21).", 11, 18),
  ...piece("bwv788", H, SW(2), "A 12/8 with a lilting subject; a cadence in G minor (10).", B("bwv788", 10), 26),
  ...piece("bwv789", H, SW(3), "A trio over a walking bass; cadences in A (5), F♯ minor (14).", B("bwv789", 14), 20, { super16: [at(B("bwv789", 14), { room: 0.15 }, "After the F♯-minor cadence, the SPC echo."), at(20, OWN, "Dry for the close.")] }),
  ...piece("bwv790", H, SW(4), "A slow D minor over a walking bass; cadences in A minor (3), F (8), A (13).", B("bwv790", 13), 19, { chamberOrgan: [at(1, OPRIN, "A slow trio: the principals."), at(B("bwv790", 13), OFLUTE, "After the A cadence: the flutes."), at(19, OFONDS, "The close: the foundations.")] }),
  ...piece("bwv791", "pianoSampled", CANTABILE, "An ornamented duet over a bass in 3/4; cadences in C minor (13), B♭ (17), A♭ (29).", B("bwv791", 17), 29, { pianoSampled: [at(B("bwv791", 17), { layer: "soft" }, "After the B♭ cadence, the soft layer."), at(29, OWN, "The close.")] }),
  ...piece("bwv792", H, SW(6), "A 9/8 in flowing thirds; cadences in B (18), F♯ minor (21).", B("bwv792", 18), 32, { gameboy: [...widths(B("bwv792", 18), [0.25, 0.125], "After the B cadence: the duties traded."), at(32, OWN, "The close.")] }),
  ...piece("bwv793", H, SW(7), "A chromatic 3/4 in E minor; a cadence in B minor (14).", B("bwv793", 14), 36, { pianoSampled: [at(B("bwv793", 14), { layer: "soft" }, "After the cadence in B minor, the soft layer."), at(36, OWN, "The close.")] }),
  ...piece("bwv794", H, SW(8), "A lively F major; cadences in C (7), G minor (11), D minor (15).", B("bwv794", 11), B("bwv794", 15), { megaFm: [at(B("bwv794", 11), { fm: 0.7 }, "After the G-minor cadence, mellower."), at(B("bwv794", 15), OWN, "The return.")] }),
  ...piece("bwv795", "pianoSampled", CANTABILE, "Three subjects, one chromatic, over a sighing bass; cadences in A♭ (13), E♭ (15), A♭ (28), F minor (33).", B("bwv795", 13), B("bwv795", 28), { pianoSampled: [at(B("bwv795", 13), { layer: "soft" }, "After the A♭ cadence (13), the soft layer."), at(B("bwv795", 28), OWN, "The return.")] }),
  ...piece("bwv796", H, SW(10), "A bright 3/4; a cadence in B minor (22).", B("bwv796", 22), 28, { tracker: [at(B("bwv796", 22), { vib: 10 }, "After the cadence in B minor, the tracker's vibrato."), at(28, OWN, "The close.")] }),
  ...piece("bwv797", H, SW(11), "A 3/8 in G minor; cadences in B♭ (16), D minor (24, 36); pedals on A (24-29) and D (57-64).", B("bwv797", 36), 57, { harpsichordSampled: [at(1, H8, "The 8′."), at(B("bwv797", 36), H84, "After the cadence in D minor (36): 8′+4′."), at(57, HFULL, "The D pedal (57-64) and the close: coupled.")] }),
  ...piece("bwv798", H, SW(12), "Pedals on C♯ (13-14), E (18-20, 28-30); a half cadence in A (18).", 18, 28, { sid64: [at(18, { pw: 0.5 }, "The E pedal: square."), at(21, OWN, "The own sweep."), at(28, { pw: 0.5 }, "The last pedal.")] }),
  ...piece("bwv799", H, SW(13), "A 3/8 in A minor; cadences in E minor (8), D minor, C and G (37-41), A minor (50).", B("bwv799", 41), 50, { vocalSynth: [at(B("bwv799", 41), { open: 0.35 }, "After the cadences of 37-41, a closed vowel."), at(50, OWN, "The close.")] }),
  ...piece("bwv800", H, SW(14), "A B♭ trio with many cadences (C 10, F 12, D minor 14).", B("bwv800", 14), 20, { super16: [at(B("bwv800", 14), { room: 0.15 }, "After the D-minor cadence, the SPC echo."), at(20, OWN, "Dry for the close.")] }),
  ...piece("bwv801", H, SW(15), "A 9/16 in B minor; an E pedal (31-32) before the close.", 20, 31, { harpsichordSampled: [at(1, H84, "8′+4′."), at(20, HLUTE, "The second part on the buff."), at(31, HFULL, "The E pedal and the close: coupled.")] }),
  "bwv1043-2": {
    sound: "super16",
    soundWhy: "The concerto keeps SUPER 16-BIT, its strings for the band and its violin for the solos (D340, D351).",
    character: "A largo in 12/8, the two solo violins over the band; a cadence in F (16).",
    plans: { super16: [at(B("bwv1043-2", 16), { room: 0.1 }, "After the cadence in F (16), the band a little into the SPC echo."), at(46, OWN, "The close dry.")] },
  },
  "bwv228-2": {
    sound: "soloVoices",
    soundWhy: "The motet keeps SOLO VOICES (D341): singers a cappella.",
    character: "The fugue under the chorale's long notes (78-150), then all eight voices (150-154).",
    plans: { soloVoices: [at(150, { room: 0.12 }, "The last bars for all eight voices (150-154) in more of the hall.")] },
  },
  "bwv54-3": {
    sound: "super16",
    soundWhy: "The cantata keeps SUPER 16-BIT's strings (D341).",
    character: "A fugal aria, 'Wer Sünde tut'; cadences in G minor (38) and E♭ (53, 68).",
    plans: { super16: [at(B("bwv54-3", 38), { room: 0.12 }, "After the cadence in G minor (38), the SPC echo a little."), at(B("bwv54-3", 53), OWN, "Dry after the E♭ cadence (53).")] },
  },
};
