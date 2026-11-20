/**
 * D355: MORE BACH's other pieces (the chorales aside): the Inventions and Sinfonias, the Concerto for Two
 * Violins, the motet BWV 228 and the cantata BWV 54. D731: the Inventions and Sinfonias each on a sound of its own,
 * chosen by the voices' distinctness (the voice probe, tools/touch/voice-probe: the closest pair of voices on every
 * offered sound) and the piece's character, at most two pieces a sound (WHY gives each reason with its numbers); the
 * harpsichord and the organ keep their plans for a player who chooses them. Before D731: the harpsichord, Switched-On
 * for the three Inventions Carlos recorded (1968: F major, B♭ major, D minor), the piano for the slow, chromatic ones
 * (the Aufrichtige Anleitung, 1723). The concertos, the motet and the cantata keep the sounds the owner asked
 * for (D340, D341, D348, D351). The HARPSICHORD CONCERTOS have no plan: their solo and tutti are written
 * into the orchestration already, and a terraced band would double it.
 */
import { at, beat, H8, H84, H88, HFULL, HLUTE, OFLUTE, OFONDS, OPRIN, OWN, widths, type Moment, type PieceColours } from "./kit.ts";

const B = beat;

/** An Invention or Sinfonia: the harpsichord's own terrace after a cadence (`turn`), back for the close (`home`), and the other sounds' moments. */
function piece(id: string, sound: string, soundWhy: string, character: string, turn: number, home: number, extra: Record<string, Moment[]> = {}): Record<string, PieceColours> {
  const plans: Record<string, Moment[]> = {
    // D731: the piece's own sound, where no plan of its own is written below: a timbral arc (D714's way), the opening
    // and the middle a shade darker, the return and the close brighter and in more of the room.
    ...(sound === "harpsichordSampled" || sound === "chamberOrgan" ? {} : { [sound]: arc(id, sound, turn, home) }),
    harpsichordSampled: [at(1, H8, "The 8′."), at(turn, H84, "The second part (after its cadence): 8′+4′, a terrace."), at(home, H88, "The return and the close: the coupled unison.")],
    chamberOrgan: [at(1, OFLUTE, "The flutes."), at(turn, OPRIN, "The second part on the principals.")],
    ...extra,
  };
  return { [id]: { sound, soundWhy, character, plans } };
}
/**
 * D731, D736: a sound's tone through the piece (D714's way): veiled at first, darker after the cadence (`turn`), bright and
 * in more of the room from the final group (FINAL: form-points.ts formOf's last group of entries, by its first entry), or
 * from the return (`home`) where the final group comes before the cadence (the motive heard throughout).
 */
const FINAL: Record<string, number> = {"bwv906-1": 33.5, "bwv906-2": 46.125, "bwv998-2": 95.25, "bwv951": 106.625, "bwv903-2": 154, "bwv802": 65.667, "bwv803": 141, "bwv804": 38.25, "bwv805": 96.5, "bwv772": 2.062, "bwv773": 23.125, "bwv774": 56.667, "bwv775": 38.0, "bwv776": 23.062, "bwv777": 56.167, "bwv778": 7.125, "bwv779": 16.167, "bwv780": 29.0, "bwv781": 27.0, "bwv782": 16.5, "bwv783": 18.0, "bwv784": 22.562, "bwv785": 16.562, "bwv786": 18.125, "bwv787": 18.938, "bwv788": 28.0, "bwv789": 19.125, "bwv790": 20.062, "bwv792": 29.0, "bwv793": 35.167, "bwv794": 21.125, "bwv795": 23.875, "bwv796": 31.333, "bwv797": 65.167, "bwv798": 24.0, "bwv799": 53.0, "bwv800": 18.938, "bwv801": 35.333};
const arc = (id: string, sound: string, turn: number, home: number): Moment[] => {
  const fin = FINAL[id] !== undefined && FINAL[id] > turn ? FINAL[id] : home;
  return [
    at(1, { tone: -1.5 }, "The opening a shade veiled (the sound's tone down)."),
    ...(turn < fin ? [at(turn, { tone: -2 }, "After the cadence, darker.")] : []),
    // (SID 64 has no room to send to: the tone alone.)
    at(fin, sound === "sid64" ? { tone: 2 } : { tone: 2, room: 0.12 }, fin === home ? "The return and the close: bright, in more of the room." : "The final group of entries: bright, in more of the room."),
  ];
};
/** D731: each piece's own sound and why (the voice probe, tools/touch/voice-probe; piece-sound.ts PIECE_SOUND). */
const WHY: Record<string, string> = {
  "bwv772": "D731: GAME BOY's lead over its bass: the motive's imitations told apart at once, as the first Invention asks of a beginner's two hands (the voice probe's closest pair 5.55 against HARPSICHORD's 1.31).",
  "bwv773": "D731: the strict canon in C minor on BERLIN SCHOOL's lead over its synth bass, a dark, patient machine: leader and follower in two colours, the canon's lag heard (the voice probe's closest pair 3.75 against HARPSICHORD's 2.46).",
  "bwv774": "D731: the lively 3/8 a dance: CHORINHO's flute against its seven-string guitar, as a choro duo plays (the voice probe's closest pair 3.26 against HARPSICHORD's 2.72).",
  "bwv775": "D731: the perpetuum mobile in D minor on SID 64's lead and its filtered bass: the running semiquavers clear in each hand, the chip set the owner loves (Carlos's Moog, SWITCHED-ON, measured closer) (the voice probe's closest pair 3.42 against SWITCHED-ON's 1.97).",
  "bwv776": "D731: a melody over a running bass and back: JAZZ QUARTET's vibraphone on the tune, its double bass on the run, two attacks apart (the voice probe's closest pair 4.98 against HARPSICHORD's 2.48).",
  "bwv777": "D731: the syncopated line against the even scale, a lilt: BOSSA NOVA's flute over its bass (the voice probe's closest pair 4.63 against HARPSICHORD's 1.17).",
  "bwv778": "D731: the sighing motive in E minor on BOSSA NOVA's flute over its bass, a saudade (VAUDEVILLE, as distinct, left the bass 6.4 LU under on a phone) (the voice probe's closest pair 6.18 against HARPSICHORD's 3.10).",
  "bwv779": "D731: Wendy Carlos recorded the Invention in F major on Switched-On Bach (1968): the Moog's two lines (SWITCHED-ON), kept (the voice probe's closest pair 2.84).",
  "bwv780": "D731: slow and chromatic, three parts in two: BERLIN SCHOOL's lead and synth bass, the long lines held, a darker cantabile than the piano's (one instrument for both hands) (the voice probe's closest pair 4.13 against PIANO's 2.30).",
  "bwv781": "D731: the 9/8 gigue in arpeggios, at its FAST step: GAME BOY's lead and bass, a game's quick arpeggio figures (the voice probe's closest pair 5.21 against HARPSICHORD's 1.62).",
  "bwv782": "D893: the chromatic subject over its descending bass, slow: ZELENKA TRIO's oboe over its bassoon, two reeds held, a lament's breath (the voice probe's closest pair 2.79 against TRACKER's 2.86; HARPSICHORD's 2.85 plucked, VAUDEVILLE's 3.51 a xylophone; the sounds nearer already two Inventions' each, D731).",
  "bwv783": "D731: the pastoral 12/8: JAZZ QUARTET's vibraphone over its double bass, a lilting jazz 12/8 (ZELENKA TRIO's harpsichord over bassoon, as distinct, left the harpsichord 10 dB under the bassoon on a phone) (the voice probe's closest pair 5.27 against HARPSICHORD's 2.72).",
  "bwv784": "D893: broken chords in A minor on the harpsichord, the keyboard's own figuration (the voice probe's closest pair 3.01 against PET SOUNDS' 4.70: the nearest of the sounds not yet on two Inventions, D731).",
  "bwv785": "D731: Wendy Carlos recorded the Invention in B♭ major on Switched-On Bach (1968): the Moog's two lines (SWITCHED-ON) (the voice probe's closest pair 2.93).",
  "bwv786": "D893: the fugal Invention in B minor: ZELENKA TRIO's oboe over its bassoon, the subject's entries clear (the voice probe's closest pair 3.28 against TRACKER's 3.06).",
  "bwv787": "D731: the C major scales in imitation: SUPER 16-BIT's violin, harpsichord and bassoon, bright and plain (the voice probe's closest pair 2.59 against HARPSICHORD's 1.58).",
  "bwv788": "D731: the lilting 12/8 in C minor: TOMITA's whistle, flute and bass, a dreamlike sway (the voice probe's closest pair 2.12 against HARPSICHORD's 1.29).",
  "bwv789": "D731: a trio over a walking bass in steady quavers: KRAUTROCK's Mellotron, clean guitar and Moog bass over the motorik pulse (the voice probe's closest pair 5.90 against HARPSICHORD's 1.00).",
  "bwv790": "D731: slow, D minor over a walking bass: ABBEY ROAD's Moog, trumpet and bass, three colours for three slow lines (the voice probe's closest pair 2.95 against HARPSICHORD's 1.99).",
  "bwv791": "D893: the ornamented duet over its bass in 3/4, slow: BAROQUE BAND's violin, oboe and cello, a song on held voices, no drums (the voice probe's closest pair 2.00 against PET SOUNDS' 2.84; FLUTE & HARP's 2.06 its harp plucked, KRAUTROCK's 5.56 already two Inventions').",
  "bwv792": "D731: the 9/8 in flowing thirds, at its FAST step: CHORINHO's flute, bandolim and seven-string guitar, a choro waltz's flow (the voice probe's closest pair 2.62 against HARPSICHORD's 1.67).",
  "bwv793": "D731: chromatic and introspective, E minor: TOMITA's whistle, flute and bass, as Isao Tomita voiced slow chromatic music (the voice probe's closest pair 2.21 against HARPSICHORD's 1.41).",
  "bwv794": "D731: a lively F major: ABBEY ROAD's Moog, trumpet and bass, a bright pop trio (the voice probe's closest pair 3.54 against HARPSICHORD's 1.35).",
  "bwv795": "D731: three subjects, one chromatic, over a sighing bass: Bach's title page asks 'above all to arrive at a cantabile manner of playing'; the recorded grand sings the lines: kept, its three registers told apart as well as any other sound but three (the voice probe's closest pair 3.05).",
  "bwv796": "D731: a bright 3/4 in G: SID 64's lead, saw and bass, one waveform to a line (the voice probe's closest pair 2.54 against HARPSICHORD's 1.00).",
  "bwv797": "D731: the 3/8 in G minor: CLASSIC CHIP's pulse voices of three widths (the bass a pulse on a phone) (the voice probe's closest pair 2.14 against HARPSICHORD's 1.29).",
  "bwv798": "D731: A major over its pedals: SUPER 16-BIT's violin, harpsichord and bassoon (the voice probe's closest pair 2.58 against HARPSICHORD's 1.00).",
  "bwv799": "D731: the 3/8 in A minor, running semiquavers: CLASSIC CHIP's three pulse widths (the voice probe's closest pair 2.09 against HARPSICHORD's 1.52).",
  "bwv800": "D731: the cheerful B♭ trio with many cadences: SALSA's trumpet, trombone and bass (VAUDEVILLE, as distinct, left the bass 7.0 LU under on a phone) (the voice probe's closest pair 2.40 against HARPSICHORD's 0.77).",
  "bwv801": "D731: the driving 9/16 in B minor: KRAUTROCK's Mellotron, clean guitar and Moog bass, the motorik pulse under the gigue (the voice probe's closest pair 6.02 against HARPSICHORD's 0.79).",
  "bwv802": "D741: the chromatic E minor Duet in 3/8, its runs against a chromatic line: BERLIN SCHOOL's lead over its synth bass, dark and patient (the voice probe's closest pair 4.12 against HARPSICHORD's 2.72).",
  "bwv803": "D741: the bright F major Duet in 2/4, its middle part in close canon: GAME BOY's lead over its bass, the canon's two voices told apart at once (the voice probe's closest pair 5.32 against HARPSICHORD's 2.04).",
  "bwv804": "D741: the G major gigue in 12/8: JAZZ QUARTET's vibraphone over its double bass, the 12/8 swung (the voice probe's closest pair 5.27 against HARPSICHORD's 2.72).",
  "bwv805": "D741: the strict A minor fugue alla breve, its long chromatic subject: KRAUTROCK's Mellotron over its Moog bass, the motorik pulse under the relentless crotchets (the voice probe's closest pair 3.68 against HARPSICHORD's 1.58).",
  "bwv903-2": "D771: the Chromatic Fugue's three voices, a long chromatic subject: FLUTE & HARP's alto flute, harp and cello, a plucked keyboard-like harp among two sustained lines (the voice probe's closest pair 2.20 against HARPSICHORD's 1.14; of the sounds serving fewer than three pieces, the clearest).",
  bwv951: "D779: the Albinoni Fugue's three voices, a Venetian theme worked in long episodes: STRING CONSORT, Albinoni's own medium, its three strings of different weight (the voice probe's closest pair 1.69 against HARPSICHORD's 1.41). SALSA measured clearer (2.52) but its trombone left the alto's low B (bar 94, the bass resting) 7.9 LU under the soprano on a phone; here 3.6.",
  "bwv906-1": "D782: the Fantasia's two hands, the left crossing over the right up to A♭5: JAZZ QUARTET's vibraphone on the right hand and its piano on the left (its own seat, D781: the piano covers the crossings), a struck bar over a keyboard (the voice probe's closest pair 4.34 against HARPSICHORD's 3.02; GAME BOY 4.73 and KRAUTROCK 4.43 measured a little clearer, each already on six or seven pieces).",
  "bwv906-2": "D782: the unfinished C minor fugue's three voices: ABBEY ROAD's Moog, guitar and bass, three different attacks, the bass's climbs to E♭5 within reach (the voice probe's closest pair 3.61 against HARPSICHORD's 1.55; KRAUTROCK 5.15 clearer, already on seven pieces; BOSSA NOVA 3.79, its bass past its reach there).",
  "bwv998-1": "D789: \"pour la luth ò cembal\": the Prelude's broken-chord line over a slow bass on CHORINHO's plucked strings (the cavaquinho and the seven-string guitar), a lute's family (the voice probe's closest pair 3.04 against HARPSICHORD's 1.35 and its lute stop's 1.16; GAME BOY 5.79 and BOSSA NOVA 5.03 clearer, BOSSA NOVA's bass past its reach).",
  "bwv998-2": "D789: the da capo fugue's three voices: SALSA's trumpets over the tres and the baby bass, the plucked tres a lute's cousin (the voice probe's closest pair 2.98 against HARPSICHORD's 0.75 and its lute stop's 0.91; KRAUTROCK 5.60 clearer, already on seven pieces).",
  "bwv998-3": "D789: the Allegro's running line on either staff over the bass: GAME BOY's lead over its bass, a game's quick figures (the voice probe's closest pair 5.55 against HARPSICHORD's 1.13 and its lute stop's 1.01)."
};


export const MORE: Record<string, PieceColours> = {
  ...piece("bwv772", "gameboy", WHY.bwv772, "The motive in imitation; a half cadence on F (18) before the close.", B("bwv772", 18, 2), 21, {
    vocalSynth: [at(B("bwv772", 18, 2), { open: 0.35 }, "The Swingle Singers sang it (1963): after the half cadence, a closed vowel."), at(21, OWN, "Open for the close.")],
    chip: [...widths(B("bwv772", 18, 2), [0.25], "After the half cadence: the lead rounder.")],
  }),
  ...piece("bwv773", "berlinSchool", WHY.bwv773, "A strict canon at the octave, then reversed.", 11, 23, { pianoSampled: [at(11, { layer: "soft" }, "The canon's second half in the soft layer."), at(23, OWN, "The close.")] }),
  ...piece("bwv774", "chorinho", WHY.bwv774, "A lively 3/8; half cadences in D (5), B minor (18), D (42); an A pedal (28-30).", B("bwv774", 18), 43, { gameboy: [...widths(B("bwv774", 18), [0.25], "After the B-minor half cadence: the lead rounder."), at(43, OWN, "The return.")] }),
  ...piece("bwv775", "sid64", WHY.bwv775, "A 3/8 perpetuum mobile; half cadences in B♭ (26) and A minor (29), an E pedal (29-34).", B("bwv775", 26), 35, { analog: [at(B("bwv775", 26), { lp: 2600 }, "After the half cadence in B♭ (26): the filter half closed, as Carlos changes colour."), at(35, OWN, "Open after the E pedal (35).")] }),
  ...piece("bwv776", "jazzQuartet", WHY.bwv776, "A melody over a running bass and back; a cadence in F minor (23).", B("bwv776", 23), 27, {}),
  ...piece("bwv777", "bossaNova", WHY.bwv777, "A 3/8 in two repeated halves; cadences in B (18) and G♯ minor (42).", B("bwv777", 18), B("bwv777", 42), {}),
  ...piece("bwv778", "bossaNova", WHY.bwv778, "Cadences in G (7) and D (9), a half cadence in E minor (15) over a B pedal (15-17).", B("bwv778", 9), 15, { sid64: [at(B("bwv778", 9), { pw: 0.2 }, "After the D cadence, narrower."), at(15, { pw: 0.5 }, "The B pedal: square.")] }),
  ...piece("bwv779", "analog", WHY.bwv779, "A canon in 3/4 at the octave; a cadence in C (12).", B("bwv779", 12), 26, { analog: [at(B("bwv779", 12), { lp: 2600 }, "After the cadence in C (12): the filter half closed."), at(FINAL.bwv779, { tone: 2, room: 0.12 }, "D736: the final group of entries (16): open, bright, in more of the room.")] }),
  ...piece("bwv780", "berlinSchool", WHY.bwv780, "A three-part counterpoint in two voices, chromatic, in 3/4.", 13, 29, { pianoSampled: [at(13, { layer: "soft" }, "The middle in the soft layer."), at(29, OWN, "The return.")] }),
  ...piece("bwv781", "gameboy", WHY.bwv781, "A 9/8 gigue in arpeggios; a cadence in D (14), a C pedal (24-26).", B("bwv781", 14), 24, { chip: [...widths(B("bwv781", 14), [0.25], "After the D cadence: the lead rounder."), at(24, OWN, "The C pedal.")] }),
  ...piece("bwv782", "oboeTrio", WHY.bwv782, "A chromatic subject over a descending bass; cadences in B♭ (6) and D minor (7).", B("bwv782", 7), 17, { super16: [at(B("bwv782", 7), { tone: -2 }, "After the cadence in D minor, darker."), at(17, OWN, "The close.")] }),
  ...piece("bwv783", "jazzQuartet", WHY.bwv783, "A 12/8 in two voices, a half cadence (3).", 11, 18, { gameboy: [...widths(11, [0.25], "The second part: the lead rounder."), at(18, OWN, "The close.")] }),
  ...piece("bwv784", "harpsichordSampled", WHY.bwv784, "Broken chords in A minor; a cadence in E minor (13).", B("bwv784", 13), 21, { chip: [...widths(B("bwv784", 13), [0.25], "After the cadence in E minor: the lead rounder."), at(21, OWN, "The close.")] }),
  ...piece("bwv785", "analog", WHY.bwv785, "Cadences in G minor (10) and C minor (12) before the return.", B("bwv785", 10), 15, { analog: [at(B("bwv785", 10), { lp: 2600 }, "After the G-minor cadence: the filter half closed."), at(15, OWN, "Open for the return."), at(FINAL.bwv785, { tone: 2, room: 0.12 }, "D736: the final group of entries: bright, in more of the room.")] }),
  ...piece("bwv786", "oboeTrio", WHY.bwv786, "A fugal invention in B minor.", 11, 19, { sid64: [at(11, { pw: 0.2 }, "The second part narrower."), at(19, OWN, "The close.")] }),
  ...piece("bwv787", "super16", WHY.bwv787, "Three voices in imitation; the close in C (21).", 11, 18),
  ...piece("bwv788", "tomita", WHY.bwv788, "A 12/8 with a lilting subject; a cadence in G minor (10).", B("bwv788", 10), 26),
  ...piece("bwv789", "krautrock", WHY.bwv789, "A trio over a walking bass; cadences in A (5), F♯ minor (14).", B("bwv789", 14), 20, { super16: [at(B("bwv789", 14), { room: 0.15 }, "After the F♯-minor cadence, the SPC echo."), at(20, OWN, "Dry for the close.")] }),
  ...piece("bwv790", "abbeyRoad", WHY.bwv790, "A slow D minor over a walking bass; cadences in A minor (3), F (8), A (13).", B("bwv790", 13), 19, { chamberOrgan: [at(1, OPRIN, "A slow trio: the principals."), at(B("bwv790", 13), OFLUTE, "After the A cadence: the flutes."), at(19, OFONDS, "The close: the foundations.")] }),
  ...piece("bwv791", "baroqueBand", WHY.bwv791, "An ornamented duet over a bass in 3/4; cadences in C minor (13), B♭ (17), A♭ (29).", B("bwv791", 17), 29, { pianoSampled: [at(B("bwv791", 17), { layer: "soft" }, "After the B♭ cadence, the soft layer."), at(29, OWN, "The close.")] }),
  ...piece("bwv792", "chorinho", WHY.bwv792, "A 9/8 in flowing thirds; cadences in B (18), F♯ minor (21).", B("bwv792", 18), 32, { gameboy: [...widths(B("bwv792", 18), [0.25, 0.125], "After the B cadence: the duties traded."), at(32, OWN, "The close.")] }),
  ...piece("bwv793", "tomita", WHY.bwv793, "A chromatic 3/4 in E minor; a cadence in B minor (14).", B("bwv793", 14), 36, { pianoSampled: [at(B("bwv793", 14), { layer: "soft" }, "After the cadence in B minor, the soft layer."), at(36, OWN, "The close.")] }),
  ...piece("bwv794", "abbeyRoad", WHY.bwv794, "A lively F major; cadences in C (7), G minor (11), D minor (15).", B("bwv794", 11), B("bwv794", 15), {}),
  ...piece("bwv795", "pianoSampled", WHY.bwv795, "Three subjects, one chromatic, over a sighing bass; cadences in A♭ (13), E♭ (15), A♭ (28), F minor (33).", B("bwv795", 13), B("bwv795", 28), { pianoSampled: [at(B("bwv795", 13), { layer: "soft" }, "After the A♭ cadence (13), the soft layer."), at(FINAL.bwv795, { layer: "firm", room: 0.1 }, "D736: the final group of entries (24): the firm layer, in more of the hall.")] }),
  ...piece("bwv796", "sid64", WHY.bwv796, "A bright 3/4; a cadence in B minor (22).", B("bwv796", 22), 28, {}),
  ...piece("bwv797", "chip", WHY.bwv797, "A 3/8 in G minor; cadences in B♭ (16), D minor (24, 36); pedals on A (24-29) and D (57-64).", B("bwv797", 36), 57, { harpsichordSampled: [at(1, H8, "The 8′."), at(B("bwv797", 36), H84, "After the cadence in D minor (36): 8′+4′."), at(57, HFULL, "The D pedal (57-64) and the close: coupled.")] }),
  ...piece("bwv798", "super16", WHY.bwv798, "Pedals on C♯ (13-14), E (18-20, 28-30); a half cadence in A (18).", 18, 28, { sid64: [at(18, { pw: 0.5 }, "The E pedal: square."), at(21, OWN, "The own sweep."), at(28, { pw: 0.5 }, "The last pedal.")] }),
  ...piece("bwv799", "chip", WHY.bwv799, "A 3/8 in A minor; cadences in E minor (8), D minor, C and G (37-41), A minor (50).", B("bwv799", 41), 50, { vocalSynth: [at(B("bwv799", 41), { open: 0.35 }, "After the cadences of 37-41, a closed vowel."), at(50, OWN, "The close.")] }),
  ...piece("bwv800", "salsa", WHY.bwv800, "A B♭ trio with many cadences (C 10, F 12, D minor 14).", B("bwv800", 14), 20, { super16: [at(B("bwv800", 14), { room: 0.15 }, "After the D-minor cadence, the SPC echo."), at(20, OWN, "Dry for the close.")] }),
  ...piece("bwv801", "krautrock", WHY.bwv801, "A 9/16 in B minor; an E pedal (31-32) before the close.", 20, 31, { harpsichordSampled: [at(1, H84, "8′+4′."), at(20, HLUTE, "The second part on the buff."), at(31, HFULL, "The E pedal and the close: coupled.")] }),
  // D741: the Four Duets (BWV 802-805), each on its own sound (no two alike), the arc as the Inventions' (D736).
  ...piece("bwv802", "berlinSchool", WHY.bwv802, "A 3/8 in E minor, runs against a chromatic line; inverted from 57; a cadence in E minor (18).", B("bwv802", 18), 57),
  ...piece("bwv803", "gameboy", WHY.bwv803, "A-B-A' in 2/4: the subject's fugue (1-37), a middle part in close canon (38-112), the da capo (113).", B("bwv803", 32), 113),
  ...piece("bwv804", "jazzQuartet", WHY.bwv804, "A gigue in 12/8; cadences in B minor (20) and G (36).", B("bwv804", 20), 36),
  ...piece("bwv805", "krautrock", WHY.bwv805, "A strict fugue alla breve on a long chromatic subject; cadences in A minor (33, 42), the last entry (96).", B("bwv805", 33), 96),
  // D771: the Chromatic Fugue (BWV 903-2) on FLUTE & HARP, the arc as the Inventions' (D736).
  ...piece("bwv903-2", "fluteHarp", WHY["bwv903-2"], "Three voices on a long chromatic subject; cadences in D minor (39, 71, 75, 147); chords at the climaxes (53, 94, 135) and the close (158-161).", B("bwv903-2", 75), 154),
  // D779: the Albinoni Fugue (BWV 951) on STRING CONSORT, the arc as the Inventions' (D736).
  ...piece("bwv951", "stringConsort", WHY.bwv951, "Three voices on Albinoni's theme, long episodes between the entries; cadences in B minor (54, 64, 78), the last entry in the bass (106).", B("bwv951", 54), 106),
  // D782: BWV 906 on its two sounds, the arc as the Inventions' (D736).
  ...piece("bwv906-1", "jazzQuartet", WHY["bwv906-1"], "A two-part fantasia in two repeated halves (each played once): the hands exchange the falling-chord motive and cross (9-13, 25-28, 31); the second half opens in G minor (17), the return (33).", B("bwv906-1", 17), 33.5),
  ...piece("bwv906-2", "abbeyRoad", WHY["bwv906-2"], "Three voices on a chromatic subject, eight entries; unfinished: it breaks off on bar 48's first beat, as the print does.", B("bwv906-2", 17), 46.125),
  // D789: BWV 998 on its two sounds, the same arc.
  ...piece("bwv998-1", "chorinho", WHY["bwv998-1"], "A prelude in 12/8: one broken-chord line over pedal notes; its head opens each phrase (1, 6, 14, 25) and returns over the tonic (42).", B("bwv998-1", 25), 42),
  ...piece("bwv998-2", "salsa", WHY["bwv998-2"], "A da capo fugue: the subject's exposition and episodes (1-74), the middle in C, G and F minor (43-54), the da capo written out (75-103).", B("bwv998-2", 50), 95.25),
  ...piece("bwv998-3", "gameboy", WHY["bwv998-3"], "A binary Allegro in 3/8 (each half played once): the running line on either staff; cadences in B♭ (23, 32), the return in E♭ (80).", B("bwv998-3", 49), 80),
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
  // D901: the Goldberg Variations, each its own sound (piece-sound.ts), the timbral arc over its two halves.
  ...piece("bwv988-00", "super16", "D901: the Aria on SUPER 16-BIT, each voice its own colour (the voice probe's closest pair 2.07 against the harpsichord's 0.85; at most three variations a sound).", "the Aria, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-01", "berlinSchool", "D901: Variation 1 on BERLIN SCHOOL, each voice its own colour (the voice probe's closest pair 6.82 against the harpsichord's 1.94; at most three variations a sound).", "Variation 1, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-02", "krautrock", "D901: Variation 2 on KRAUTROCK, each voice its own colour (the voice probe's closest pair 5.90 against the harpsichord's 1.51; at most three variations a sound).", "Variation 2, in two halves over the Aria's bass (34 bars).", 18, 27),
  ...piece("bwv988-03", "krautrock", "D901: Variation 3 on KRAUTROCK, each voice its own colour (the voice probe's closest pair 5.44 against the harpsichord's 1.48; at most three variations a sound).", "Variation 3, in two halves over the Aria's bass (16 bars).", 9, 13),
  ...piece("bwv988-04", "abbeyRoad", "D901: Variation 4 on ABBEY ROAD, each voice its own colour (the voice probe's closest pair 3.19 against the harpsichord's 0.38; at most three variations a sound).", "Variation 4, in two halves over the Aria's bass (34 bars).", 18, 27),
  ...piece("bwv988-05", "gameboy", "D901: Variation 5 on GAME BOY, each voice its own colour (the voice probe's closest pair 6.21 against the harpsichord's 0.57; at most three variations a sound).", "Variation 5, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-06", "abbeyRoad", "D901: Variation 6 on ABBEY ROAD, each voice its own colour (the voice probe's closest pair 2.55 against the harpsichord's 0.70; at most three variations a sound).", "Variation 6, in two halves over the Aria's bass (36 bars).", 19, 28),
  ...piece("bwv988-07", "jazzQuartet", "D901: Variation 7 on JAZZ QUARTET, each voice its own colour (the voice probe's closest pair 6.01 against the harpsichord's 1.74; at most three variations a sound).", "Variation 7, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-08", "harpsichordSampled", "D901: Variation 8 kept on the harpsichord, Bach's two-manual instrument (the voice probe's closest pair 2.45; one of three left on it).", "Variation 8, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-09", "chorinho", "D901: Variation 9 on CHORINHO, each voice its own colour (the voice probe's closest pair 3.28 against the harpsichord's 1.39; at most three variations a sound).", "Variation 9, in two halves over the Aria's bass (16 bars).", 9, 13),
  ...piece("bwv988-10", "bossaNova", "D901: Variation 10 on BOSSA NOVA, each voice its own colour (the voice probe's closest pair 2.14 against the harpsichord's 0.76; at most three variations a sound).", "Variation 10, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-11", "jazzQuartet", "D901: Variation 11 on JAZZ QUARTET, each voice its own colour (the voice probe's closest pair 5.47 against the harpsichord's 1.08; at most three variations a sound).", "Variation 11, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-12", "chorinho", "D901: Variation 12 on CHORINHO, each voice its own colour (the voice probe's closest pair 2.23 against the harpsichord's 0.56; at most three variations a sound).", "Variation 12, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-13", "super16", "D901: Variation 13 on SUPER 16-BIT, each voice its own colour (the voice probe's closest pair 2.45 against the harpsichord's 1.77; at most three variations a sound).", "Variation 13, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-14", "berlinSchool", "D901: Variation 14 on BERLIN SCHOOL, each voice its own colour (the voice probe's closest pair 6.84 against the harpsichord's 0.58; at most three variations a sound).", "Variation 14, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-15", "harpsichordSampled", "D901: Variation 15 kept on the harpsichord, Bach's two-manual instrument (the voice probe's closest pair 1.35; one of three left on it).", "Variation 15, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-16", "abbeyRoad", "D901: Variation 16 on ABBEY ROAD, each voice its own colour (the voice probe's closest pair 3.35 against the harpsichord's 1.58; at most three variations a sound).", "Variation 16, in two halves over the Aria's bass (50 bars).", 26, 39),
  ...piece("bwv988-17", "gameboy", "D901: Variation 17 on GAME BOY, each voice its own colour (the voice probe's closest pair 4.84 against the harpsichord's 0.94; at most three variations a sound).", "Variation 17, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-18", "krautrock", "D901: Variation 18 on KRAUTROCK, each voice its own colour (the voice probe's closest pair 5.51 against the harpsichord's 1.39; at most three variations a sound).", "Variation 18, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-19", "bossaNova", "D901: Variation 19 on BOSSA NOVA, each voice its own colour (the voice probe's closest pair 3.29 against the harpsichord's 1.35; at most three variations a sound).", "Variation 19, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-20", "gameboy", "D901: Variation 20 on GAME BOY, each voice its own colour (the voice probe's closest pair 6.11 against the harpsichord's 0.56; at most three variations a sound).", "Variation 20, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-21", "tomita", "D901: Variation 21 on TOMITA, each voice its own colour (the voice probe's closest pair 1.24 against the harpsichord's 0.81; at most three variations a sound).", "Variation 21, in two halves over the Aria's bass (16 bars).", 9, 13),
  ...piece("bwv988-22", "tomita", "D901: Variation 22 on TOMITA, each voice its own colour (the voice probe's closest pair 2.45 against the harpsichord's 0.14; at most three variations a sound).", "Variation 22, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-23", "berlinSchool", "D901: Variation 23 on BERLIN SCHOOL, each voice its own colour (the voice probe's closest pair 3.84 against the harpsichord's 0.43; at most three variations a sound).", "Variation 23, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-24", "tomita", "D901: Variation 24 on TOMITA, each voice its own colour (the voice probe's closest pair 2.21 against the harpsichord's 0.51; at most three variations a sound).", "Variation 24, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-25", "vocalSynth", "D901: Variation 25 on VOCAL SYNTH, each voice its own colour (the voice probe's closest pair 2.29 against the harpsichord's 1.45; at most three variations a sound).", "Variation 25, in two halves over the Aria's bass (34 bars).", 18, 27),
  ...piece("bwv988-26", "salsa", "D901: Variation 26 on SALSA, each voice its own colour (the voice probe's closest pair 4.38 against the harpsichord's 1.10; at most three variations a sound).", "Variation 26, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-27", "harpsichordSampled", "D901: Variation 27 kept on the harpsichord, Bach's two-manual instrument (the voice probe's closest pair 2.45; one of three left on it).", "Variation 27, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-28", "salsa", "D901: Variation 28 on SALSA, each voice its own colour (the voice probe's closest pair 4.01 against the harpsichord's 0.77; at most three variations a sound).", "Variation 28, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-29", "vocalSynth", "D901: Variation 29 on VOCAL SYNTH, each voice its own colour (the voice probe's closest pair 1.54 against the harpsichord's 0.57; at most three variations a sound).", "Variation 29, in two halves over the Aria's bass (32 bars).", 17, 25),
  ...piece("bwv988-30", "bossaNova", "D901: Variation 30 on BOSSA NOVA, each voice its own colour (the voice probe's closest pair 2.75 against the harpsichord's 0.48; at most three variations a sound).", "Variation 30, in two halves over the Aria's bass (18 bars).", 10, 15),
};
