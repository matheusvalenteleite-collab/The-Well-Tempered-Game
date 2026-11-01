/**
 * D355: the Well-Tempered Clavier, Book II's fugues: each one's own sound and its colour plans, read as
 * Book I's (book1.ts): the repository's analysis and Ledbetter's sections, Keller's and Bodky's readings
 * (docs/wtc/readings, D275). Bodky gives a hand's registration where the hands differ; the plans follow his
 * right hand where his two hands agree in the bar, and a moment for the right hand alone only to soften it.
 */
import { at, beat, entry, H8, H84, H88, HFULL, HLUTE, OFLUTE, OFONDS, OPLENO, OPRIN, OWN, widths, type PieceColours } from "./kit.ts";

const E = entry;
const B = beat;

export const BOOK2: Record<string, PieceColours> = {
  wtc2f01: {
    sound: "megaFm",
    soundWhy: "'Masculine humour, not too light; high spirits intensifying toward the close' (Keller), on organ-fugue figures (Bodky): MEGA FM's lead, clav and slap bass, crisp in 2/4 and loud enough through a phone's speaker.",
    character: "Long episodes (29-39, 61-68, 74-83), the cadence on G (21-22), a dominant pedal (50-52), an intensifying close.",
    plans: {
      megaFm: [at(29, { fm: 0.7 }, "The episode 29-39 mellower."), at(E("wtc2f01", 39), OWN, "The bass's entry (39)."), at(61, { fm: 0.7 }, "The episode 61-68."), at(E("wtc2f01", 68), OWN, "The bass's entry (68)."), at(74, { fm: 1.2 }, "Keller's intensifying close a little brighter.")],
      harpsichordSampled: [at(B("wtc2f01", 22), H84, "After the cadence on G (22): 8′+4′."), at(29, H8, "The episode 29-39 on the 8′."), at(E("wtc2f01", 39), H84, "The entry."), at(74, HFULL, "The close: the manuals coupled.")],
      chamberOrgan: [at(1, OPRIN, "The organ-fugue figures (Bodky) on the principals."), at(29, OFLUTE, "The episode on the flutes."), at(E("wtc2f01", 39), OPRIN, "The entry."), at(74, OPLENO, "The close on the plenum.")],
    },
  },
  wtc2f02: {
    sound: "chamberOrgan",
    soundWhy: "Severe and reflective (Keller), four voices closing in stretti and augmentation, for which Bodky allows the pedal clavichord 'or even the organ': the organ's pedal carries the augmented bass.",
    character: "Entries to 14, then stretti and the augmentations (from 14); Bodky's terraces f, p (14½), f (21¼), coupled (23⅝).",
    plans: {
      chamberOrgan: [at(1, OPRIN, "The principals."), at(14.5, OFLUTE, "Bodky's piano from 14½: the flutes."), at(21.25, OPRIN, "Bodky's forte from 21¼."), at(23.625, OPLENO, "Bodky couples the manuals at 23⅝: the plenum for the stretti in augmentation.")],
      harpsichordSampled: [at(1, H84, "Bodky: 8″+4″."), at(14.5, H8, "Bodky: 8′ from 14½."), at(21.25, H84, "Bodky: 8″+4″ from 21¼."), at(23.625, HFULL, "Bodky: coupled from 23⅝.")],
      nocturne32: [at(14.5, { tone: -2 }, "Mozart arranged it for strings (K.405, 1782): the strings' quieter span (Bodky 14½-21¼) darker."), at(21.25, OWN, "The full tone for the stretti.")],
    },
  },
  wtc2f03: {
    sound: "harpsichordSampled",
    soundWhy: "Bathed in euphony, neither pompous nor scherzo (Keller), three voices in stretto from the first bar: the plucked string keeps them apart on a phone; Bodky's harpsichord terraces.",
    character: "Stretti and inversions; Bodky's terraces f, p (7⅝), f (11⅝), p (14⅝), f (25⅝); a dominant pedal (25-29) and the tonic pedal (33-35).",
    plans: {
      harpsichordSampled: [at(1, H84, "Bodky: 8″+4″."), at(7.625, H8, "Bodky: 8′ from 7⅝."), at(11.625, H84, "Bodky: 8″+4″ from 11⅝."), at(14.625, H8, "Bodky: 8′ from 14⅝."), at(25.625, H84, "Bodky: 8″+4″ from 25⅝, over the dominant pedal."), at(33, HFULL, "The tonic pedal: the manuals coupled.")],
      chamberOrgan: [at(1, OFLUTE, "Euphonious: the flutes."), at(11.625, OPRIN, "Bodky's forte from 11⅝."), at(14.625, OFLUTE, "Bodky's piano from 14⅝."), at(25.625, OPRIN, "The dominant pedal."), at(33, OPLENO, "The tonic pedal on the plenum.")],
      gameboy: [...widths(14.625, [0.125, 0.125], "Bodky's piano span on thinner pulses."), at(25.625, OWN, "The own widths over the pedal.")],
    },
  },
  wtc2f04: {
    sound: "pianoSampled",
    soundWhy: "A flowing 12/16 double fugue for the clavichord (Bodky): the recorded grand's legato and its three registers, clear on a phone.",
    character: "A second exposition 16-24 and an inversion 24-35 (Ledbetter), the second subject from 35, both together from 48.",
    plans: {
      pianoSampled: [at(24, { layer: "soft" }, "The inversion (Ledbetter 24-35) in the soft layer."), at(E("wtc2f04", 35), OWN, "The second subject (35).")],
      harpsichordSampled: [at(B("wtc2f04", 16), H84, "After the cadence in C♯ minor (16): the second exposition on 8′+4′."), at(24, H8, "The inversion on the 8′."), at(E("wtc2f04", 35), H84, "The second subject."), at(48, H88, "Both subjects together (Ledbetter 48-71): the coupled unison.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("wtc2f04", 35), OPRIN, "The second subject on the principals."), at(B("wtc2f04", 57), OFONDS, "After the cadence of 57: the foundations.")],
      tomita: [at(24, { room: 0.15 }, "The inversion in the space echo."), at(E("wtc2f04", 35), OWN, "Closer for the second subject.")],
    },
  },
  wtc2f05: {
    sound: "vocalSynth",
    soundWhy: "A serious, vocal (choral) fugue (Keller), sung by the Swingle Singers (Jazz Sébastien Bach, 1963): VOCAL SYNTH's four voices, light like their scat, its plate clear on a phone.",
    character: "Sections 1-10, 10-16, 20-27 (Ledbetter); Bodky's terraces (8′, 8″+4″, coupled, full) by his right hand.",
    plans: {
      vocalSynth: [at(16, { open: 0.35 }, "Bodky's quieter 16-22 on a closed vowel."), at(22, OWN, "Open again (22).")],
      harpsichordSampled: [at(1, H8, "Bodky: 8′."), at(10, H84, "Bodky: 8″+4″ (10-16)."), at(16, H8, "8′ (16-22)."), at(22, H84, "8″+4″ (22-27)."), at(27, HFULL, "Coupled after the cadence in F♯ minor (27-33)."), at(33, H84, "8″+4″ (33-44)."), at(44, HFULL, "The full work to the end (44).")],
      chamberOrgan: [at(1, OFLUTE, "Bodky's 8′: the flutes."), at(10, OPRIN, "The principals."), at(16, OFLUTE, "The flutes."), at(22, OPRIN, "The principals."), at(27, OPLENO, "Bodky's coupled span: the plenum."), at(33, OPRIN, "The principals."), at(44, OPLENO, "The full work to the end.")],
      soloVoices: [at(27, { room: 0.12 }, "The stretti after 27 in more of the hall."), at(33, OWN, "Closer."), at(44, { room: 0.12 }, "The last stretti (44-45).")],
    },
  },
  wtc2f06: {
    sound: "harpsichordSampled",
    soundWhy: "A short work of great forcefulness and terseness (Keller), 'the entire piece full work' (Bodky): the full harpsichord.",
    character: "Triplet runs, stretti throughout; Bodky's one exception, bar 20, beats 2-3, on 8″+4″.",
    plans: {
      harpsichordSampled: [at(1, HFULL, "Bodky: the full work throughout."), at(20.25, H84, "Bodky's option: bar 20, beats 2-3, on the upper manual."), at(20.75, HFULL, "The full work again.")],
      chamberOrgan: [at(1, OPLENO, "Bodky's full work: the plenum.")],
      chip: [...widths(21, [0.25, 0.5], "The last stretti (21-25): the pulses fuller.")],
    },
  },
  wtc2f07: {
    sound: "chamberOrgan",
    soundWhy: "'Saturated with euphony like a choral fugue' (Keller), 'best on the (home) organ' (Bodky): four voices in long alla breve notes.",
    character: "Bodky's spans: full to 30¾, 8″+4″ to 55¼, full from 55¾ (his milder option one degree down); the last entries in stretto (59-60).",
    plans: {
      chamberOrgan: [at(1, OPRIN, "Bodky's milder option: the principals for his full work."), at(30.75, OFLUTE, "His lighter middle (30¾-55¼): the flutes."), at(55.75, OPRIN, "The principals again (55¾)."), at(59, OPLENO, "The last stretto (59-60): the plenum, a player's choice beyond Bodky's.")],
      harpsichordSampled: [at(1, HFULL, "Bodky: the full work."), at(30.75, H84, "Bodky: 8″+4″ from 30¾."), at(55.75, HFULL, "Bodky: the full work from 55¾.")],
      soloVoices: [at(30.75, { room: 0.1 }, "Choral: the middle span further away."), at(55.75, OWN, "Closer for the close.")],
    },
  },
  wtc2f08: {
    sound: "stringConsort",
    soundWhy: "Heavy melancholy and great seriousness (Keller), one of the fugues Mozart arranged for string quartet (K. 405, 1782): STRING CONSORT, a quartet one to a part, as Mozart scored it.",
    character: "Cadences in F♯ (30), A♯ minor (35), D♯ minor (43); an episode 36-40; the inversion in stretto at 43.",
    plans: {
      nocturne32: [at(36, { tone: -2 }, "The episode 36-40 darker."), at(E("wtc2f08", 40), OWN, "The bass's entry."), at(43, { room: 0.1 }, "The last stretto (43) further into the hall.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(B("wtc2f08", 30), H84, "After the cadence in F♯ (30): 8′+4′."), at(36, H8, "The episode."), at(E("wtc2f08", 40), H84, "The entry."), at(43, H88, "The last stretto: the coupled unison.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(36, OFLUTE, "The episode on the flutes."), at(E("wtc2f08", 40), OPRIN, "The entry."), at(43, OFONDS, "The last stretto: the foundations.")],
      pianoSampled: [at(36, { layer: "soft" }, "The episode in the soft layer."), at(E("wtc2f08", 40), OWN, "The entry.")],
    },
  },
  wtc2f09: {
    sound: "soloVoices",
    soundWhy: "'Pure, transfigured vocal beauty in the style of Palestrina' (Keller), in 4/2, each voice within a singer's compass: SOLO VOICES' singers; Mozart also arranged it (K.405).",
    character: "Stretti of subject and countersubject 9-15, two new subjects 16-22, low stretti and diminutions 23-34, a final section 35-43 (Ledbetter).",
    plans: {
      soloVoices: [at(16, { room: 0.1 }, "The two new subjects (16-22) a little further away."), at(23, OWN, "Closer for the low stretti."), at(35, { room: 0.15 }, "The final section (35-43) in more of the hall.")],
      chamberOrgan: [at(1, OFLUTE, "Bodky's home organ: the flutes."), at(9, OPRIN, "The stretti (9-15)."), at(16, OFLUTE, "The new subjects."), at(23, OPRIN, "The low stretti."), at(35, OFONDS, "The final section: the foundations.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(23, H88, "The low stretti: the coupled unison."), at(35, H84, "The final section: 8′+4′.")],
      vocalSynth: [at(16, { open: 0.35 }, "The new subjects on a closed vowel."), at(23, OWN, "Open again.")],
    },
  },
  wtc2f10: {
    sound: "sid64",
    soundWhy: "A powerfully controlled allegro, an impatient subject pressing forward (Keller): SID 64's moving pulses and filtered bass, bright through a phone's speaker.",
    character: "A tonic exposition 1-18 (Ledbetter), Bodky's spans f (to 23 10/12), p (to 49 10/12), f, coupled (71⅜); a dominant pedal 68-70.",
    plans: {
      sid64: [at(23.833, { pw: 0.2 }, "Bodky's piano span (23-49) on narrower pulses."), at(49.833, OWN, "The own sweep (49)."), at(71.375, { pw: 0.5 }, "Bodky's coupled close: the pulses square.")],
      harpsichordSampled: [at(1, H84, "Bodky: 8″+4″."), at(23.833, H8, "Bodky: 8′ from 23 10/12."), at(49.833, H84, "Bodky: 8″+4″ from 49 10/12."), at(71.375, HFULL, "Bodky: coupled from 71⅜.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(23.833, OFLUTE, "Bodky's piano: the flutes."), at(49.833, OPRIN, "The principals."), at(71.375, OPLENO, "Bodky's coupled close: the plenum.")],
      chip: [...widths(23.833, [0.25, 0.125], "Bodky's piano span: the pulses' duty changed."), at(49.833, OWN, "The own widths.")],
    },
  },
  wtc2f11: {
    sound: "chip",
    soundWhy: "'Delicate charm, fleeting and light' (Keller after Kirnberger) in 6/16: the chip's thin pulses over its triangle, quick and clear on a phone (its bass a pulse there).",
    character: "Long episodes (25-52, 70-89) over held basses (61-65 on F, 76-82 on C).",
    plans: {
      chip: [...widths(25, [0.25, 0.125], "The long episode 25-52: the duties traded."), at(E("wtc2f11", 52), OWN, "The alto's entry."), ...widths(70, [0.25, 0.125], "The episode 70-89."), at(E("wtc2f11", 89), OWN, "The last bass entries.")],
      harpsichordSampled: [at(25, HLUTE, "The long episode on the buff."), at(E("wtc2f11", 52), H8, "The entry on the 8′."), at(70, HLUTE, "The episode 70-89 on the buff."), at(E("wtc2f11", 89), H84, "The last bass entries (89, 91): 8′+4′.")],
      chamberOrgan: [at(1, OFLUTE, "Light: the flutes."), at(E("wtc2f11", 89), OPRIN, "The last entries.")],
      gameboy: [...widths(25, [0.125, 0.125], "The long episode on thin pulses."), at(E("wtc2f11", 52), OWN, "The entry.")],
    },
  },
  wtc2f12: {
    sound: "tracker",
    soundWhy: "'With caprice and a certain humour, softening to ease in the episodes' (Keller): TRACKER's violin, harpsichord and bass, dry and panned.",
    character: "Episodes 15-24, 33-40, 54-71, 78-85; the relative major 24-31 (Ledbetter); dominant pedals 50-53 and 80-83.",
    plans: {
      harpsichordSampled: [at(1, H84, "8′+4′."), at(15, H8, "The episodes on the 8′ (Keller's softening)."), at(E("wtc2f12", 24), H84, "The entry."), at(54, H8, "The episode 54-71."), at(E("wtc2f12", 71), H84, "The last entries.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(15, OFLUTE, "The episode on the flutes."), at(E("wtc2f12", 24), OPRIN, "The entry."), at(54, OFLUTE, "The episode 54-71."), at(E("wtc2f12", 71), OPRIN, "The entry."), at(80, OFONDS, "The dominant pedal (80-83).")],
    },
  },
  wtc2f13: {
    sound: "harpsichordSampled",
    soundWhy: "High spirits, grace and playful lightness, with gavotte episodes 'commonly played two bars forte, two bars piano … entirely in the style of Bach's time' (Keller): the two manuals' own game.",
    character: "Expositions 1-12, 32-44, 64-84; episode 1 (12-20) and its return (44-52), episode 2 (24-32) and its return (56-64) (Ledbetter). The two-bar echoes are placed in episode 1 and its return (a reading of Keller).",
    plans: {
      harpsichordSampled: [
        at(1, H84, "8′+4′."),
        at(14, H8, "Keller's gavotte echo: two bars forte (12-13), two piano (14-15)…"),
        at(16, H84, "…forte (16-17)…"),
        at(18, H8, "…piano (18-19)."),
        at(E("wtc2f13", 20), H84, "The soprano's entry."),
        at(46, H8, "The episode's return (44-52): the echo again."),
        at(48, H84, "Forte."),
        at(50, H8, "Piano."),
        at(E("wtc2f13", 52), H84, "The alto's entry."),
      ],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(14, OFLUTE, "The echo on a second manual's flutes."), at(16, OPRIN, "The principals."), at(18, OFLUTE, "The echo."), at(E("wtc2f13", 20), OPRIN, "The entry."), at(46, OFLUTE, "The echo in the return."), at(48, OPRIN, "The principals."), at(50, OFLUTE, "The echo."), at(E("wtc2f13", 52), OPRIN, "The entry.")],
      chip: [...widths(14, [0.125, 0.125], "The echo on thinner pulses."), at(16, OWN, "Forte."), ...widths(18, [0.125, 0.125], "The echo."), at(E("wtc2f13", 20), OWN, "The entry.")],
    },
  },
  wtc2f14: {
    sound: "pianoSampled",
    soundWhy: "A three-subject fugue, 'thoughtful and capricious … terse … gently flowing' (Keller): the recorded grand, its three voices voiced apart.",
    character: "The first subject 1-20, the second from 20, the third from 36, all three together (Bodky's spans: p, f from 21, p from 37¼, f from 51).",
    plans: {
      pianoSampled: [at(1, { layer: "soft" }, "Bodky's piano first section: the soft layer."), at(21, OWN, "The second subject (Bodky's forte)."), at(37.25, { layer: "soft" }, "The third subject (Bodky's piano)."), at(51, OWN, "The subjects combined (51).")],
      harpsichordSampled: [at(1, H8, "Bodky: 8′."), at(21, H84, "Bodky: 8″+4″ for the second subject."), at(37.25, H8, "Bodky: 8′ for the third."), at(51, H84, "Bodky: 8″+4″ from 51.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(21, OPRIN, "The second subject."), at(37.25, OFLUTE, "The third subject."), at(51, OFONDS, "The subjects combined: the foundations.")],
    },
  },
  wtc2f15: {
    sound: "tracker",
    soundWhy: "A corrente-like 3/8, 'delicately moving' (Keller): TRACKER's violin, harpsichord and slapped bass, hard left and right, light and clear on a phone.",
    character: "Stretti (25-31), an episode after the cadence in B minor (45-65) over a D pedal (56-59).",
    plans: {
      tracker: [at(B("wtc2f15", 45), { vib: 10 }, "The episode after the cadence in B minor with the tracker's vibrato."), at(E("wtc2f15", 65), OWN, "The alto's entry (65).")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("wtc2f15", 45), H8, "The episode on the 8′."), at(E("wtc2f15", 65), H84, "The entry.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("wtc2f15", 65), OPRIN, "The last entry.")],
    },
  },
  wtc2f16: {
    sound: "baroqueBand",
    soundWhy: "Molto feroce (Bodky), 'a hurled protest' (Keller), four voices: BAROQUE BAND, the bass entering last (bar 13) on the cello with the continuo harpsichord.",
    character: "Bodky's terraces (both hands): f, p 17, f 20, p 24, f 28, p 40, f 45; the right hand alone p 59-63; coupled 67.",
    plans: {
      harpsichordSampled: [
        at(1, H84, "Bodky: 8″+4″."),
        at(17, H8, "Bodky: 8′ (17-20)."),
        at(20, H84, "Forte (20)."),
        at(24, H8, "Piano (24-28)."),
        at(28, H84, "Forte (28)."),
        at(40, H8, "Piano (40-45)."),
        at(45, H84, "Forte (45)."),
        at(59, { ...H8, voices: [0, 1] }, "Bodky: the right hand alone on the 8′ (59-63)."),
        at(63, H84, "Both hands forte (63)."),
        at(67, HFULL, "Bodky: coupled from the cadence in G minor (67)."),
      ],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(17, OFLUTE, "The flutes."), at(20, OPRIN, "The principals."), at(24, OFLUTE, "The flutes."), at(28, OPRIN, "The principals."), at(40, OFLUTE, "The flutes."), at(45, OPRIN, "The principals."), at(67, OPLENO, "Bodky's coupled close: the plenum.")],
      soloVoices: [at(67, { room: 0.12 }, "Bodky's 'chorus' (his Calvary scene): the close in more of the hall.")],
    },
  },
  wtc2f17: {
    sound: "baroqueBand",
    soundWhy: "A festive concerto subject with grace and solemnity (Keller): BAROQUE BAND (D275's reading), the bass entering last (bar 8) on the cello with the continuo harpsichord.",
    character: "Bodky's terraces: f, p (10⅛), f (16), p (27), f (35), full (46).",
    plans: {
      super16: [at(10.125, { room: 0.18 }, "Bodky's piano span (10-16) in the SPC echo."), at(16, OWN, "Dry (16)."), at(27, { room: 0.18 }, "The piano span 27-35."), at(35, OWN, "Dry (35).")],
      harpsichordSampled: [at(1, H84, "Bodky: 8″+4″."), at(10.125, H8, "Bodky: 8′ from 10⅛."), at(16, H84, "Forte (16)."), at(27, H8, "Piano after the cadence in C minor (27)."), at(35, H84, "Forte (35)."), at(46, HFULL, "Bodky: the full work from 46.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(10.125, OFLUTE, "The flutes."), at(16, OPRIN, "The principals."), at(27, OFLUTE, "The flutes."), at(35, OPRIN, "The principals."), at(46, OPLENO, "Bodky's full close: the plenum.")],
    },
  },
  wtc2f18: {
    sound: "pianoSampled",
    soundWhy: "A gently flowing, galant double fugue whose dynamics 'do not exceed mf' (Keller): the recorded grand, its soft layer for the first two sections.",
    character: "Section 1 on the first subject (1-61), section 2 on the second (61-97), the double fugue (97-143) (Ledbetter); Bodky's 8″ (pp), 8′ (p), 8″+4″ (f) by section.",
    plans: {
      pianoSampled: [at(1, { layer: "soft" }, "Bodky's pp and p (1-97): the soft layer."), at(97, OWN, "The double fugue (97) in the full tone.")],
      harpsichordSampled: [at(1, HLUTE, "Bodky's softest register for the first section: here the buff."), at(61.625, H8, "Bodky: 8′ for the second subject (61⅝)."), at(97, H84, "Bodky: 8″+4″ for both subjects (97).")],
      chamberOrgan: [at(1, OFLUTE, "The flutes for the two single fugues."), at(97, OPRIN, "The double fugue on the principals.")],
      tomita: [at(61.625, { room: 0.15 }, "The second subject in the space echo."), at(97, OWN, "Closer for the double fugue.")],
    },
  },
  wtc2f19: {
    sound: "nocturne32",
    soundWhy: "Simple and unpretentious, 'a quiet walk' (Keller): NOCTURNE 32-BIT's violin and harpsichord over the organ's pedal, mild in its hall.",
    character: "Cadences in E (12) and A (16); the closing entries in stretto (23-27).",
    plans: {
      nocturne32: [at(E("wtc2f19", 23), { room: 0.1 }, "The closing entries a little further into the hall.")],
      harpsichordSampled: [at(1, H8, "Mild: the 8′."), at(E("wtc2f19", 23), H88, "The closing entries: the coupled unison.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("wtc2f19", 23), OPRIN, "The closing entries.")],
    },
  },
  wtc2f20: {
    sound: "analog",
    soundWhy: "'An extraordinary outburst of temper; heavy and powerful' (Keller), Bodky's full work throughout, the bass down to A1: SWITCHED-ON's snapping synth bass and resonant lead, dry and clear on a phone.",
    character: "Three voices, the subject's chromatic descent; the bass's last entry (25).",
    plans: {
      analog: [at(E("wtc2f20", 25), { tone: 2 }, "The bass's last entry: a shade brighter.")],
      harpsichordSampled: [at(1, HFULL, "Bodky: 'full work' throughout.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(E("wtc2f20", 25), OPLENO, "The bass's last entry: the plenum.")],
      chip: [...widths(E("wtc2f20", 25), [0.5, 0.5], "The last entry: the pulses square.")],
    },
  },
  wtc2f21: {
    sound: "baroqueBand",
    soundWhy: "Lightly animated, with grace and serene unconcern (Keller), a 'cradle' (Bodky): BAROQUE BAND, the bass entering last (bar 13) on the cello with the continuo harpsichord.",
    character: "A first half 1-32 (Ledbetter) to the cadence in F; Bodky's spans pp, p (32), f (78).",
    plans: {
      super16: [at(1, { room: 0.12 }, "Bodky's pp first half in the SPC echo."), at(B("wtc2f21", 32), OWN, "Dry after the cadence in F (32).")],
      harpsichordSampled: [at(1, HLUTE, "Bodky's softest register (pp): the buff."), at(B("wtc2f21", 32), H8, "Bodky: 8′ after 32."), at(78, H84, "Bodky: 8″+4″ from 78.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(78, OPRIN, "The principals from 78.")],
    },
  },
  wtc2f22: {
    sound: "chamberOrgan",
    soundWhy: "'The most majestic fugue of volume II; the organ is more fitting' (Bodky), 'the most powerful' (Keller): four voices in 3/2, stretti recto and inverso over a dominant pedal.",
    character: "Stretto recto 27-37, the inverted subject 42-63, stretto inverso 80-93, at the tenth 96-101 (Ledbetter); Bodky's ff and f spans.",
    plans: {
      chamberOrgan: [at(1, OPLENO, "Bodky's full work (with 16′): the plenum."), at(27.75, OPRIN, "Bodky's lighter span (27¾-42): the principals."), at(42, OPLENO, "The inversion (42): the plenum."), at(67, OPRIN, "Bodky's lighter 67-80."), at(80, OPLENO, "The stretto inverso and the close (80): the plenum.")],
      harpsichordSampled: [at(1, HFULL, "Bodky: the full work."), at(27.75, H84, "8″+4″ (27¾)."), at(42, HFULL, "The full work (42)."), at(67, H84, "8″+4″ (67)."), at(80, HFULL, "The full work (80).")],
      soloVoices: [at(80, { room: 0.12 }, "The last stretti in more of the hall.")],
    },
  },
  wtc2f23: {
    sound: "tomita",
    soundWhy: "'Quietly flowing, singing; gentle euphony' (Keller), a double fugue in long notes: TOMITA's whistle, strings, flute and bass, the outer voices nearly dry for a phone.",
    character: "The second subject from 27; a long episode 63-75 (claims); Bodky's ff and f spans; a pedal on E (94-95).",
    plans: {
      tomita: [at(63, { room: 0.2 }, "The long episode 63-75 in the space echo."), at(E("wtc2f23", 75), OWN, "The bass's entry (75).")],
      harpsichordSampled: [at(1, HFULL, "Bodky: his full work minus the 8′ (here the coupled manuals)."), at(28, H84, "8″+4″ (28)."), at(49, HFULL, "Full (49)."), at(60, H84, "8″+4″ (60)."), at(86, HFULL, "Full (86).")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(28, OFLUTE, "The flutes (Bodky's lighter 28-49)."), at(49, OPRIN, "The principals."), at(60, OFLUTE, "The flutes (60-86)."), at(86, OPRIN, "The principals."), at(94, OFONDS, "The pedal on E (94-95): the foundations, gentle (Keller).")],
    },
  },
  wtc2f24: {
    sound: "gameboy",
    soundWhy: "A passepied, 'comfortable grace', an unassuming 'Ausklang' for the whole collection (Keller, Bodky): the Game Boy's pulses, light and clear on a phone.",
    character: "A long episode 61-81 and the close 90-100.",
    plans: {
      gameboy: [...widths(61, [0.125, 0.125], "The long episode (61-81) on thin pulses."), at(E("wtc2f24", 81), OWN, "The soprano's entry (81).")],
      harpsichordSampled: [at(61, HLUTE, "The long episode on the buff."), at(E("wtc2f24", 81), H8, "The entry on the 8′.")],
      chamberOrgan: [at(1, OFLUTE, "A dance: the flutes throughout.")],
    },
  },
};
