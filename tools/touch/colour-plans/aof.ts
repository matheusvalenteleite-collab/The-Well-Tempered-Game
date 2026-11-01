/**
 * D355: the Art of Fugue (Contrapuncti 1-14, the mirror fugues rectus and inversus, the four canons) and the
 * Musical Offering's two ricercars: each one's own sound and its colour plans. No Ledbetter or Bodky here:
 * read from the encoding (entries, inversions, augmentations, cadences, pedals: data/touch/more-bach.json)
 * and from each piece's title (Bach's own: "in Stylo Francese", "per Augmentationem"). Recordings named as
 * reasons were checked (Gould's organ Contrapuncti 1-9, 1962; the Swingle Singers' Contrapunctus 9, 1963);
 * Bach's own arrangement of Contrapunctus 13 for two harpsichords is in the print of 1751 (BWV 1080/18).
 */
import { at, beat, entry, H8, H84, H88, HFULL, HLUTE, OFLUTE, OFONDS, OPLENO, OPRIN, OWN, widths, type Moment, type PieceColours } from "./kit.ts";

const B = beat;
const E = entry;

/** The mirror fugues: the same plan for the rectus and the inversus (they share their bars). */
function mirror(id: string, sound: string, soundWhy: string, character: string, plans: Record<string, Moment[]>): Record<string, PieceColours> {
  return { [id]: { sound, soundWhy, character, plans } };
}

const C12 = (inv: boolean) => ({
  soloVoices: [at(18, { room: 0.08 }, "After the cadences of 12 and 17, a little further away."), at(inv ? 50 : 54, { room: 0.12 }, "The closing pedal on D in more of the hall.")],
  harpsichordSampled: [at(1, H88, "A slow 3/2, sarabande-like: the coupled unison's weight."), at(18, H8, "After the cadence (17): the 8′."), at(inv ? 50 : 54, H88, "The closing pedal: the coupled unison.")],
  chamberOrgan: [at(1, OPRIN, "The principals."), at(18, OFLUTE, "After the cadence: the flutes."), at(inv ? 50 : 54, OFONDS, "The closing pedal: the foundations.")],
});
const C13 = {
  harpsichordSampled: [at(1, H84, "8′+4′."), at(38, H8, "The long middle without entries (from 38) on the 8′."), at(62, H84, "The entries of 62."), at(66, HFULL, "The last entry and the close: the manuals coupled.")],
  chamberOrgan: [at(1, OFLUTE, "Lively, three voices: the flutes."), at(62, OPRIN, "The last entries on the principals.")],
  megaFm: [at(38, { fm: 0.7 }, "The middle without entries, mellower."), at(62, OWN, "The last entries.")],
};

export const AOF: Record<string, PieceColours> = {
  "bwv1080-01": {
    sound: "chamberOrgan",
    soundWhy: "The plain fugue in long, vocal lines, closing over a tonic pedal (74-78) after a dramatic pause: the organ, as Gould recorded Contrapuncti 1-9 (1962); the pedal carries on a phone through the organ's upper ranks.",
    character: "Four voices, the subject plain; a half cadence (63) over an A pedal, the pause, the tonic pedal (74-78).",
    plans: {
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-01", 30), OFLUTE, "After the cadence in A minor (30): the flutes."), at(E("bwv1080-01", 40), OPRIN, "The tenor's entry (40)."), at(74, OPLENO, "The tonic pedal (74-78): the plenum.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(E("bwv1080-01", 40), H84, "The tenor's entry: 8′+4′."), at(74, HFULL, "The tonic pedal: the manuals coupled.")],
      soloVoices: [at(74, { room: 0.12 }, "The closing pedal in more of the hall.")],
    },
  },
  "bwv1080-02": {
    sound: "harpsichordSampled",
    soundWhy: "The subject in dotted rhythm throughout, crisp and keyboard-like: the plucked string keeps the dots sharp on a phone.",
    character: "Dotted figures in every voice; cadences to 44; the bass's entry (61); a dominant pedal (76-78) before the close.",
    plans: {
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-02", 44), H8, "After the cadence in D minor (44): the 8′."), at(E("bwv1080-02", 61), H84, "The bass's entry (61)."), at(76, HFULL, "The dominant pedal and the close: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-02", 44), OFLUTE, "After the cadence: the flutes."), at(E("bwv1080-02", 61), OPRIN, "The bass's entry."), at(76, OPLENO, "The dominant pedal and the close: the plenum.")],
      analog: [at(B("bwv1080-02", 44), { lp: 2600 }, "After the cadence, the filter half closed."), at(E("bwv1080-02", 61), OWN, "Open at the bass's entry.")],
    },
  },
  "bwv1080-03": {
    sound: "pianoSampled",
    soundWhy: "The subject inverted against a chromatic countersubject, introspective: the recorded grand's singing line and its voicing.",
    character: "Entries to 15, a long chromatic span without the subject (19-43), entries again from 43, a tonic pedal (68-71).",
    plans: {
      pianoSampled: [at(19, { layer: "soft" }, "The long span without the subject in the soft layer."), at(E("bwv1080-03", 43), OWN, "The soprano's entry (43).")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(19, HLUTE, "The chromatic span without the subject: the buff."), at(E("bwv1080-03", 43), H84, "The entry (43)."), at(68, H88, "The tonic pedal: the coupled unison.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("bwv1080-03", 43), OPRIN, "The entries from 43."), at(E("bwv1080-03", 63), OFONDS, "The last entry (63): the foundations.")],
    },
  },
  "bwv1080-04": {
    sound: "nocturne32",
    soundWhy: "The longest simple fugue, on the inversion, with long sequential episodes: NOCTURNE 32-BIT's violin and viola over the organ's pedal, as the many string-quartet recordings play the work.",
    character: "Expositions 1-39, 61-77, 107-133, between them long episodes (43-61, 81-107); a tonic pedal (135-138).",
    plans: {
      nocturne32: [at(43, { tone: -2 }, "The episode 43-61 darker."), at(E("bwv1080-04", 61), OWN, "The bass's entry."), at(81, { tone: -2 }, "The episode 81-107."), at(E("bwv1080-04", 107), OWN, "The tenor's entry."), at(135, { room: 0.1 }, "The closing pedal into the hall.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(43, H8, "The episode on the 8′."), at(E("bwv1080-04", 61), H84, "The entry."), at(81, H8, "The episode."), at(E("bwv1080-04", 107), H84, "The entry."), at(E("bwv1080-04", 129), HFULL, "The last entries: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(43, OFLUTE, "The episode on the flutes."), at(E("bwv1080-04", 61), OPRIN, "The entry."), at(81, OFLUTE, "The episode."), at(E("bwv1080-04", 107), OPRIN, "The entry."), at(E("bwv1080-04", 129), OPLENO, "The last entries and the pedal: the plenum.")],
    },
  },
  "bwv1080-05": {
    sound: "super16",
    soundWhy: "A counter-fugue, subject and inversion in stretto throughout: SUPER 16-BIT's violin, flute, harpsichord, strings and bassoon keep the four entries apart by colour on a phone.",
    character: "Stretti of subject and inversion; an F pedal after the B♭ cadences (51-53); the close in D (86-91).",
    plans: {
      super16: [at(51, { room: 0.15 }, "The F pedal after the B♭ cadences in the SPC echo."), at(E("bwv1080-05", 58), OWN, "Dry at the inverted entry (58).")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(51, H8, "The F pedal on the 8′."), at(E("bwv1080-05", 58), H84, "The entry."), at(86, HFULL, "The close in D: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(51, OFLUTE, "The F pedal on the flutes."), at(E("bwv1080-05", 58), OPRIN, "The entry."), at(86, OPLENO, "The close: the plenum.")],
    },
  },
  "bwv1080-06": {
    sound: "harpsichordSampled",
    soundWhy: "'In Stylo Francese' (Bach's title): the French overture's dotted rhythms and diminutions, the full harpsichord's own style.",
    character: "Diminutions in stretto from bar 2; pedals on A (7-9, 31-33) and D (74-79); a cadence in D minor (33).",
    plans: {
      harpsichordSampled: [at(1, HFULL, "The French style on the full harpsichord."), at(B("bwv1080-06", 33), H84, "After the cadence in D minor (33): 8′+4′."), at(E("bwv1080-06", 57), HFULL, "The diminution's entry (57): coupled again.")],
      chamberOrgan: [at(1, OPLENO, "The overture style on the plenum."), at(B("bwv1080-06", 33), OPRIN, "After the cadence: the principals."), at(E("bwv1080-06", 57), OPLENO, "The plenum again.")],
      super16: [at(B("bwv1080-06", 33), { room: 0.15 }, "The middle span in the SPC echo."), at(E("bwv1080-06", 57), OWN, "Dry from 57.")],
    },
  },
  "bwv1080-07": {
    sound: "chamberOrgan",
    soundWhy: "'Per Augmentationem et Diminutionem' (Bach's title): the subject in long augmented notes, the organ's sustained pipes (Gould's organ recording, 1962), its pedal for the bass.",
    character: "Augmented and diminished entries in stretto; cadences in D (33) and F (44), a half cadence (52) before the close.",
    plans: {
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-07", 44), OFONDS, "After the cadence in F (44): the foundations."), at(B("bwv1080-07", 52), OPLENO, "After the half cadence (52): the plenum for the close.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-07", 52), HFULL, "The close: coupled.")],
      pianoSampled: [at(B("bwv1080-07", 33), { layer: "soft" }, "After the cadence in D (33), the soft layer."), at(B("bwv1080-07", 44), OWN, "The full tone from 44.")],
    },
  },
  "bwv1080-08": {
    sound: "sid64",
    soundWhy: "A triple fugue in three voices, angular and long: SID 64's three pulse colours and filtered bass keep the lines apart and bright on a phone.",
    character: "Three voices; cadences in D minor (39), B♭ (71), A minor (124); the subject in the soprano (147) and the last entries.",
    plans: {
      sid64: [at(B("bwv1080-08", 39), { pw: 0.2 }, "After the cadence in D minor (39): narrower pulses."), at(72, OWN, "After the B♭ cadence, the own sweep."), at(E("bwv1080-08", 147), { pw: 0.5 }, "The soprano's entry (147) to the end: square pulses.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-08", 39), H8, "After the cadence: the 8′."), at(72, H84, "8′+4′ (72)."), at(B("bwv1080-08", 124), H8, "After the cadence in A minor (124)."), at(E("bwv1080-08", 147), HFULL, "The soprano's entry: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-08", 39), OFLUTE, "The flutes."), at(72, OPRIN, "The principals."), at(B("bwv1080-08", 124), OFLUTE, "The flutes."), at(E("bwv1080-08", 147), OPLENO, "The last entries: the plenum.")],
    },
  },
  "bwv1080-09": {
    sound: "vocalSynth",
    soundWhy: "'Alla Duodecima': a running subject against the main theme in long notes, the movement the Swingle Singers sang (Jazz Sébastien Bach, 1963): VOCAL SYNTH's four singers, light and bright on a phone.",
    character: "The running subject's exposition (1-22), the main theme's entry in long notes (35), cadences in G minor (103) and D minor (120), the last entry (119).",
    plans: {
      vocalSynth: [at(B("bwv1080-09", 24), { open: 0.35 }, "After the cadence in A minor (24), a closed vowel."), at(E("bwv1080-09", 35), OWN, "The main theme's entry (35): open."), at(B("bwv1080-09", 103), { open: 0.35 }, "After the G-minor cadence."), at(E("bwv1080-09", 119), OWN, "The last entry.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(E("bwv1080-09", 35), HFULL, "The main theme in long notes: coupled."), at(B("bwv1080-09", 103), H8, "After the cadence: the 8′."), at(E("bwv1080-09", 119), HFULL, "The last entry: coupled.")],
      chamberOrgan: [at(1, OFLUTE, "The running subject on the flutes."), at(E("bwv1080-09", 35), OPRIN, "The main theme on the principals."), at(B("bwv1080-09", 103), OFLUTE, "The flutes."), at(E("bwv1080-09", 119), OPLENO, "The last entry: the plenum.")],
      soloVoices: [at(E("bwv1080-09", 119), { room: 0.12 }, "The last entry in more of the hall.")],
    },
  },
  "bwv1080-10": {
    sound: "tracker",
    soundWhy: "'Alla Decima', a double fugue opening on the inverted subject: TRACKER's violin, harpsichord, 8-bit choir and slapped bass, hard left and right, each entry its own colour.",
    character: "The inverted subject's exposition (1-14), a new section from 44, the subjects combined from 85.",
    plans: {
      tracker: [at(B("bwv1080-10", 33), { tone: -2 }, "After the cadence in D minor (33), darker."), at(E("bwv1080-10", 44), OWN, "The tenor's entry (44).")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(E("bwv1080-10", 44), H84, "The section from 44: 8′+4′."), at(E("bwv1080-10", 85), HFULL, "The subjects combined (85): coupled.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("bwv1080-10", 44), OPRIN, "The principals."), at(E("bwv1080-10", 85), OPLENO, "The subjects combined: the plenum.")],
    },
  },
  "bwv1080-11": {
    sound: "chamberOrgan",
    soundWhy: "A triple fugue in four voices, chromatic and dense, on Contrapunctus 8's subjects inverted: the organ holds its long chromatic lines and pedal points.",
    character: "Exposition 1-22; the inversions (71-84); cadences in D minor (27), C (146), D minor (175); the last stretti (154-184).",
    plans: {
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-11", 27), OFLUTE, "After the cadence in D minor (27): the flutes."), at(E("bwv1080-11", 71), OPRIN, "The inversions (71)."), at(B("bwv1080-11", 146), OFONDS, "After the cadence in C (146): the foundations."), at(B("bwv1080-11", 175), OPLENO, "After the cadence in D minor (175): the plenum.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-11", 27), H8, "The 8′."), at(E("bwv1080-11", 71), H84, "The inversions."), at(B("bwv1080-11", 146), HFULL, "The last stretti: coupled.")],
      pianoSampled: [at(B("bwv1080-11", 27), { layer: "soft" }, "After the cadence, the soft layer."), at(E("bwv1080-11", 71), OWN, "The inversions.")],
    },
  },
  ...mirror("bwv1080-12r", "soloVoices", "A mirror fugue in a slow 3/2, four voices: SOLO VOICES' singers and choir, the sarabande-like lines sung.", "Four entries (1-14), cadences in D minor (12) and A minor (17), a closing pedal on D (54-56).", C12(false)),
  ...mirror("bwv1080-12i", "soloVoices", "The mirror of Contrapunctus 12: the same singers (its tenor and bass low, sung by the choir's lowest voices).", "The rectus turned upside down: the same bars, a closing pedal (50-54).", C12(true)),
  ...mirror("bwv1080-13r", "harpsichordSampled", "A lively mirror fugue in three voices that Bach also arranged for two harpsichords (BWV 1080/18): the harpsichord's own piece.", "Entries to 37, a long middle with a G pedal (38-42), the last entries (62, 66).", C13),
  ...mirror("bwv1080-13i", "harpsichordSampled", "The inversus, which Bach arranged for two harpsichords too: the harpsichord.", "The rectus upside down, the same bars; a pedal on C (30-33).", C13),
  "bwv1080-c14": {
    sound: "chip",
    soundWhy: "A two-voice canon by augmentation in contrary motion: the chip's pulse over its triangle, a console's two channels; on a phone the bass is a pulse.",
    character: "Two voices, the second twice as slow and upside down; a break (55-56) between the halves.",
    plans: {
      chip: [...widths(57, [0.25], "The second half: the lead's duty rounder.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(57, H84, "The second half (57): 8′+4′.")],
      chamberOrgan: [at(1, OFLUTE, "Two voices: the flutes."), at(57, OPRIN, "The second half on the principals.")],
    },
  },
  "bwv1080-c15": {
    sound: "gameboy",
    soundWhy: "A canon at the octave in 9/16, a gigue: the Game Boy's pulses, quick and clear on a phone.",
    character: "Two voices in a running gigue; brief breaks (24, 28) between phrases.",
    plans: {
      gameboy: [...widths(52, [0.25], "The second half (52): the lead's duty rounder."), at(79, OWN, "The last quarter in the own width.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(52, H8, "The second half on the 8′, a terrace."), at(79, H84, "8′+4′ for the end.")],
      chamberOrgan: [at(1, OFLUTE, "A gigue: the flutes.")],
    },
  },
  "bwv1080-c16": {
    sound: "lute",
    soundWhy: "A canon at the tenth in 12/8, lilting, two voices: the LUTE's plucked courses, one player's two lines.",
    character: "Two voices in compound time; a cadence in F (17).",
    plans: {
      harpsichordSampled: [at(1, H8, "The 8′."), at(42, H84, "The second half: 8′+4′.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes.")],
    },
  },
  "bwv1080-c17": {
    sound: "analog",
    soundWhy: "A canon at the twelfth in two voices: SWITCHED-ON's lead over its synth bass, dry and clear, as Carlos played Bach's two-part inventions (1968).",
    character: "Two voices; cadences in D minor (30, 42).",
    plans: {
      analog: [at(B("bwv1080-c17", 30), { lp: 2600 }, "After the cadence (30), the filter half closed."), at(B("bwv1080-c17", 42), OWN, "Open after the cadence of 42.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-c17", 30), H8, "After the cadence (30): the 8′."), at(B("bwv1080-c17", 42), H84, "After the cadence of 42.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-c17", 30), OFLUTE, "The flutes."), at(B("bwv1080-c17", 42), OPRIN, "The principals.")],
    },
  },
  "bwv1080-14": {
    sound: "harpsichordSampled",
    soundWhy: "The unfinished triple fugue, Bach's open score as a keyboard work in the hands (D340), breaking off on a plucked string: the harpsichord.",
    character: "The first subject (1-113), the running second subject (from 114, after the cadence in D), the third, B-A-C-H (from 193, after the cadence in G minor), all three together (233-239).",
    plans: {
      harpsichordSampled: [at(1, H8, "The first subject in the stile antico: the 8′."), at(E("bwv1080-14", 114), H84, "The second subject (114): 8′+4′."), at(E("bwv1080-14", 193), HFULL, "B-A-C-H (193): the manuals coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(E("bwv1080-14", 114), OFLUTE, "The running second subject on the flutes."), at(E("bwv1080-14", 147), OPRIN, "The second subject with the first (147)."), at(E("bwv1080-14", 193), OPLENO, "B-A-C-H: the plenum.")],
      soloVoices: [at(E("bwv1080-14", 193), { room: 0.12 }, "B-A-C-H in more of the hall.")],
    },
  },
  "bwv1079-ric3": {
    sound: "pianoSampled",
    soundWhy: "Bach improvised the three-part ricercar for Frederick the Great in 1747, on one of the king's Silbermann fortepianos: the recorded grand is the nearest of the sounds.",
    character: "Entries to 95, a long chromatic span without the subject (96-141), the last entries (141-169), pedals on C and G at the close (177-182).",
    plans: {
      pianoSampled: [at(96, { layer: "soft" }, "The long span without the subject in the soft layer."), at(E("bwv1079-ric3", 141), OWN, "The soprano's entry (141).")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(96, H8, "The long span on the 8′."), at(E("bwv1079-ric3", 141), H84, "The entry."), at(177, HFULL, "The closing pedals: coupled.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("bwv1079-ric3", 141), OPRIN, "The last entries."), at(177, OFONDS, "The closing pedals: the foundations.")],
    },
  },
  "bwv1079-ric6": {
    sound: "chamberOrgan",
    soundWhy: "Six voices in the stile antico (D246, D340): the organ, its pedal for the bass.",
    character: "The exposition of six (1-49), cadences in G minor (103) and the middle entries (115-171), the last bass entry (197) and the close in C minor.",
    plans: {
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1079-ric6", 103), OFLUTE, "After the cadence in G minor (103): the flutes."), at(E("bwv1079-ric6", 115), OPRIN, "The alto's entry (115)."), at(E("bwv1079-ric6", 197), OPLENO, "The last bass entry (197) and the close: the plenum.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(E("bwv1079-ric6", 115), H84, "The entries from 115: 8′+4′."), at(E("bwv1079-ric6", 197), HFULL, "The last entry: coupled.")],
      soloVoices: [at(E("bwv1079-ric6", 197), { room: 0.12 }, "Sung (its SLOW tempo, D351): the close in more of the hall.")],
    },
  },
};
