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
  megaFm: [at(1, { tone: -2 }, "The exposition in a darker tone."), at(18, { fm: 0.7, tone: -2 }, "After the cadences of 12 and 17: the FM mellower."), at(50, { tone: 2 }, "The final group (50): bright."), at(54, { tone: 2, room: 0.1 }, "The closing pedal in more of the room.")],
  soloVoices: [at(18, { room: 0.08 }, "After the cadences of 12 and 17, a little further away."), at(inv ? 50 : 54, { room: 0.12 }, "The closing pedal on D in more of the hall.")],
  harpsichordSampled: [at(1, H88, "A slow 3/2, sarabande-like: the coupled unison's weight."), at(18, H8, "After the cadence (17): the 8′."), at(inv ? 50 : 54, H88, "The closing pedal: the coupled unison.")],
  chamberOrgan: [at(1, OPRIN, "The principals."), at(18, OFLUTE, "After the cadence: the flutes."), at(inv ? 50 : 54, OFONDS, "The closing pedal: the foundations.")],
});
const C13 = {
  chip: [at(1, { tone: -2 }, "The exposition in a darker tone."), ...widths(38, [0.25, 0.25], "The long middle without entries (from 38): the pulses rounder."), at(62, { tone: -1 }, "The entries of 62: the own widths."), at(66, { tone: 2, room: 0.12 }, "The last entries and the close (66): bright, in more of the room.")],
  harpsichordSampled: [at(1, H84, "8′+4′."), at(38, H8, "The long middle without entries (from 38) on the 8′."), at(62, H84, "The entries of 62."), at(66, HFULL, "The last entry and the close: the manuals coupled.")],
  chamberOrgan: [at(1, OFLUTE, "Lively, three voices: the flutes."), at(62, OPRIN, "The last entries on the principals.")],
  megaFm: [at(38, { fm: 0.7 }, "The middle without entries, mellower."), at(62, OWN, "The last entries.")],
};

export const AOF: Record<string, PieceColours> = {
  "bwv1080-01": {
    sound: "berlinSchool",
    soundWhy: "D708: the plain fugue's four long, vocal lines on BERLIN SCHOOL's rack, one synthesizer to a voice (the lead, the sequencer's voice, the string machine, the synth bass; the probe's most alike pair 1.79 against the organ's 0.50, whose ranks blurred the four into one on a phone): the cycle opens slow and spacious, as the Berlin school's long forms do; the bass a filtered synth bass that carries on a phone.",
    character: "Four voices, the subject plain; a half cadence (63) over an A pedal, the pause, the tonic pedal (74-78).",
    plans: {
      berlinSchool: [at(1, { tone: -2 }, "The plain fugue opens veiled (the filters' tone down)."), at(B("bwv1080-01", 30), { lp: 2400, tone: -2 }, "After the cadence in A minor (30): the filters half closed."), at(E("bwv1080-01", 40), { tone: -2 }, "The tenor's entry (40): open, still veiled."), at(74, { tone: 2, room: 0.2 }, "The final group over the tonic pedal (74-78): the filters bright, in more of the room.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-01", 30), OFLUTE, "After the cadence in A minor (30): the flutes."), at(E("bwv1080-01", 40), OPRIN, "The tenor's entry (40)."), at(74, OPLENO, "The tonic pedal (74-78): the plenum.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(E("bwv1080-01", 40), H84, "The tenor's entry: 8′+4′."), at(74, HFULL, "The tonic pedal: the manuals coupled.")],
      soloVoices: [at(74, { room: 0.12 }, "The closing pedal in more of the hall.")],
    },
  },
  "bwv1080-02": {
    sound: "jazzQuartet",
    soundWhy: "D708: the subject dotted throughout, in every voice: JAZZ QUARTET's vibraphone, piano (alto and tenor, placed by register) and double bass, with its brushes, give the dots a swing and the outer voices their own attack (the probe's closest pair 2.07 against the harpsichord's 0.73, one instrument for four lines).",
    character: "Dotted figures in every voice; cadences to 44; the bass's entry (61); a dominant pedal (76-78) before the close.",
    plans: {
      jazzQuartet: [at(1, { tone: -2 }, "The dotted subject in a mellow tone."), at(B("bwv1080-02", 44), { tone: -2 }, "After the cadence in D minor (44), darker."), at(E("bwv1080-02", 61), { tone: -1 }, "The bass's entry (61)."), at(76, { tone: 2, room: 0.1 }, "The dominant pedal and the final group (76-84): the band bright, in more of the room.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-02", 44), H8, "After the cadence in D minor (44): the 8′."), at(E("bwv1080-02", 61), H84, "The bass's entry (61)."), at(76, HFULL, "The dominant pedal and the close: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-02", 44), OFLUTE, "After the cadence: the flutes."), at(E("bwv1080-02", 61), OPRIN, "The bass's entry."), at(76, OPLENO, "The dominant pedal and the close: the plenum.")],
      analog: [at(B("bwv1080-02", 44), { lp: 2600 }, "After the cadence, the filter half closed."), at(E("bwv1080-02", 61), OWN, "Open at the bass's entry.")],
    },
  },
  "bwv1080-03": {
    sound: "tomita",
    soundWhy: "D708: the subject inverted against a chromatic countersubject, introspective: TOMITA's whistle, flute, choir and bass, each a colour of its own (the probe's closest pair 1.94 against the piano's 0.66), as Isao Tomita voiced slow, chromatic music.",
    character: "Entries to 15, a long chromatic span without the subject (19-43), entries again from 43, a tonic pedal (68-71).",
    plans: {
      tomita: [at(19, { lp: 2200 }, "The long chromatic span without the subject (19-43): the filters half closed."), at(E("bwv1080-03", 43), OWN, "The soprano's entry (43): open."), at(68, { room: 0.12 }, "The tonic pedal (68-71) in more of the room.")],
      pianoSampled: [at(19, { layer: "soft" }, "The long span without the subject in the soft layer."), at(E("bwv1080-03", 43), OWN, "The soprano's entry (43).")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(19, HLUTE, "The chromatic span without the subject: the buff."), at(E("bwv1080-03", 43), H84, "The entry (43)."), at(68, H88, "The tonic pedal: the coupled unison.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("bwv1080-03", 43), OPRIN, "The entries from 43."), at(E("bwv1080-03", 63), OFONDS, "The last entry (63): the foundations.")],
    },
  },
  "bwv1080-04": {
    sound: "krautrock",
    soundWhy: "D708: the longest of the simple fugues, at its FAST step (D710), with long sequential episodes between its expositions: KRAUTROCK's Mellotron flute, synthesizer, fuzz guitar and Moog bass, one to a voice (the probe's closest pair 3.02 against STRING CONSORT's 0.49), and the motorik pulse under the sequences.",
    character: "Expositions 1-39, 61-77, 107-133, between them long episodes (43-61, 81-107); a tonic pedal (135-138).",
    plans: {
      krautrock: [at(1, { tone: -2 }, "The exposition in a darker tone."), at(43, { tone: -2 }, "The episode 43-61 darker."), at(E("bwv1080-04", 61), { tone: -1 }, "The bass's entry (61)."), at(81, { tone: -2 }, "The episode 81-107."), at(E("bwv1080-04", 107), OWN, "The tenor's entry (107)."), at(129, { tone: 2 }, "The final group (129): bright."), at(135, { tone: 2, room: 0.1 }, "The closing pedal into the room.")],
      stringConsort: [at(43, { tone: -2 }, "The episode 43-61 darker."), at(E("bwv1080-04", 61), OWN, "The bass's entry."), at(81, { tone: -2 }, "The episode 81-107."), at(E("bwv1080-04", 107), OWN, "The tenor's entry."), at(135, { room: 0.1 }, "The closing pedal into the hall.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(43, H8, "The episode on the 8′."), at(E("bwv1080-04", 61), H84, "The entry."), at(81, H8, "The episode."), at(E("bwv1080-04", 107), H84, "The entry."), at(E("bwv1080-04", 129), HFULL, "The last entries: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(43, OFLUTE, "The episode on the flutes."), at(E("bwv1080-04", 61), OPRIN, "The entry."), at(81, OFLUTE, "The episode."), at(E("bwv1080-04", 107), OPRIN, "The entry."), at(E("bwv1080-04", 129), OPLENO, "The last entries and the pedal: the plenum.")],
    },
  },
  "bwv1080-05": {
    sound: "bossaNova",
    soundWhy: "D708: the counter-fugue, the subject varied (its thirds filled, a lilting dotted line) against its inversion in stretto: BOSSA NOVA's alto flute, Rhodes, nylon guitar and upright bass keep the four apart (the probe's closest pair 2.36 against SUPER 16-BIT's 0.49 on this piece's seats) and its lilt.",
    character: "Stretti of subject and inversion; an F pedal after the B♭ cadences (51-53); the close in D (86-91).",
    plans: {
      bossaNova: [at(1, { tone: -2 }, "The counter-fugue opens mellow."), at(51, { tone: -2, room: 0.12 }, "The F pedal after the B♭ cadences in more of the room."), at(E("bwv1080-05", 58), { tone: -1 }, "Dry at the inverted entry (58)."), at(86, { tone: 2 }, "The final group (86): bright.")],
      super16: [at(51, { room: 0.15 }, "The F pedal after the B♭ cadences in the SPC echo."), at(E("bwv1080-05", 58), OWN, "Dry at the inverted entry (58).")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(51, H8, "The F pedal on the 8′."), at(E("bwv1080-05", 58), H84, "The entry."), at(86, HFULL, "The close in D: coupled.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(51, OFLUTE, "The F pedal on the flutes."), at(E("bwv1080-05", 58), OPRIN, "The entry."), at(86, OPLENO, "The close: the plenum.")],
    },
  },
  "bwv1080-06": {
    sound: "petSounds",
    soundWhy: "D708: 'In Stylo Francese' (Bach's title): the French overture's dotted rhythms and diminutions, stately: PET SOUNDS' tack piano, twelve-string guitar, horn and bass (the bass doubled by the Wall of Sound's harp; its timpani among its drums), the orchestral pop of 1966 with the overture's pomp (the probe's closest pair 1.47 against the harpsichord's 0.76; BAROQUE BAND's 0.36 on this piece's seats).",
    character: "Diminutions in stretto from bar 2; pedals on A (7-9, 31-33) and D (74-79); a cadence in D minor (33).",
    plans: {
      petSounds: [at(B("bwv1080-06", 33), { tone: -1.5 }, "After the cadence in D minor (33), a shade darker."), at(E("bwv1080-06", 57), OWN, "The diminution's entry (57).")],
      harpsichordSampled: [at(1, HFULL, "The French style on the full harpsichord."), at(B("bwv1080-06", 33), H84, "After the cadence in D minor (33): 8′+4′."), at(E("bwv1080-06", 57), HFULL, "The diminution's entry (57): coupled again.")],
      chamberOrgan: [at(1, OPLENO, "The overture style on the plenum."), at(B("bwv1080-06", 33), OPRIN, "After the cadence: the principals."), at(E("bwv1080-06", 57), OPLENO, "The plenum again.")],
      super16: [at(B("bwv1080-06", 33), { room: 0.15 }, "The middle span in the SPC echo."), at(E("bwv1080-06", 57), OWN, "Dry from 57.")],
    },
  },
  "bwv1080-07": {
    sound: "bossaNova",
    soundWhy: "D708: 'Per Augmentationem et Diminutionem': the subject at three speeds at once, slow (crotchet 56): BOSSA NOVA's alto flute, Rhodes, nylon guitar and upright bass, one to a voice (the probe's closest pair 2.03 against the organ's 0.92), the quick values on the guitar's attack, the long ones on the flute's breath; a slow bossa, a ballad's pace. (ABBEY ROAD measured 2.57 apart, but its bass stood 6.1 LU under the Moog on a phone and its Hammond 10.8: D709.)",
    character: "Augmented and diminished entries in stretto; cadences in D (33) and F (44), a half cadence (52) before the close.",
    plans: {
      bossaNova: [at(1, { tone: -2 }, "The augmentations' exposition in a darker tone."), at(B("bwv1080-07", 44), { tone: -2 }, "After the cadence in F (44), darker."), at(B("bwv1080-07", 52), { tone: 2 }, "After the half cadence (52): the close, bright.")],
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
    sound: "krautrock",
    soundWhy: "D708: 'Alla Duodecima', at its FAST step (D710): a quick running subject against the main theme in long notes, motoric in 4/4: KRAUTROCK's Mellotron flute, synthesizer, fuzz guitar and Moog bass, one to a voice (the probe's closest pair 2.89 against VOCAL SYNTH's 0.82).",
    character: "The running subject's exposition (1-22), the main theme's entry in long notes (35), cadences in G minor (103) and D minor (120), the last entry (119).",
    plans: {
      krautrock: [at(1, { tone: -2 }, "The running subject's exposition in a darker tone."), at(B("bwv1080-09", 24), { lp: 2600, tone: -2 }, "After the cadence in A minor (24): the filters half closed."), at(E("bwv1080-09", 35), { tone: -1 }, "The main theme's entry (35): open."), at(B("bwv1080-09", 103), { tone: -2 }, "After the G-minor cadence, darker."), at(E("bwv1080-09", 119), { tone: 2 }, "The last entry and the final group (119): bright.")],
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
      tracker: [at(1, { tone: -2 }, "The exposition in a darker tone."), at(B("bwv1080-10", 33), { tone: -2 }, "After the cadence in D minor (33), darker."), at(E("bwv1080-10", 44), { tone: -1 }, "The tenor's entry (44)."), at(115, { tone: 2 }, "The final group (115): bright.")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(E("bwv1080-10", 44), H84, "The section from 44: 8′+4′."), at(E("bwv1080-10", 85), HFULL, "The subjects combined (85): coupled.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(E("bwv1080-10", 44), OPRIN, "The principals."), at(E("bwv1080-10", 85), OPLENO, "The subjects combined: the plenum.")],
    },
  },
  "bwv1080-11": {
    sound: "tomita",
    soundWhy: "D708: a triple fugue in four voices, chromatic and dense, on Contrapunctus 8's subjects inverted: TOMITA's whistle, flute, choir and bass, the long chromatic lines each in its colour (the probe's closest pair 1.94 against the organ's 0.94), grand as Tomita's orchestral transcriptions.",
    character: "Exposition 1-22; the inversions (71-84); cadences in D minor (27), C (146), D minor (175); the last stretti (154-184).",
    plans: {
      tomita: [at(B("bwv1080-11", 27), { lp: 2400 }, "After the cadence in D minor (27): the filters half closed."), at(E("bwv1080-11", 71), OWN, "The inversions (71): open."), at(B("bwv1080-11", 175), { room: 0.12 }, "After the cadence in D minor (175): the last stretti in more of the room.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-11", 27), OFLUTE, "After the cadence in D minor (27): the flutes."), at(E("bwv1080-11", 71), OPRIN, "The inversions (71)."), at(B("bwv1080-11", 146), OFONDS, "After the cadence in C (146): the foundations."), at(B("bwv1080-11", 175), OPLENO, "After the cadence in D minor (175): the plenum.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-11", 27), H8, "The 8′."), at(E("bwv1080-11", 71), H84, "The inversions."), at(B("bwv1080-11", 146), HFULL, "The last stretti: coupled.")],
      pianoSampled: [at(B("bwv1080-11", 27), { layer: "soft" }, "After the cadence, the soft layer."), at(E("bwv1080-11", 71), OWN, "The inversions.")],
    },
  },
  ...mirror("bwv1080-12r", "megaFm", "D708: a mirror fugue in a slow 3/2, four voices: MEGA FM's lead, e-piano, clav and slap bass, each its own (the probe's closest pair 1.67 against SOLO VOICES' 0.40), the sarabande-like lines as the Genesis sang them.", "Four entries (1-14), cadences in D minor (12) and A minor (17), a closing pedal on D (54-56).", C12(false)),
  ...mirror("bwv1080-12i", "megaFm", "D708: the mirror of Contrapunctus 12 on the same sound as its rectus: MEGA FM (the probe's closest pair 2.02 against SOLO VOICES' 0.59).", "The rectus turned upside down: the same bars, a closing pedal (50-54).", C12(true)),
  ...mirror("bwv1080-13r", "chip", "D708: a lively mirror fugue in three voices: CLASSIC CHIP's pulses and triangle, a console's three channels (the probe's closest pair 2.37 against the harpsichord's 0.46; Bach's own arrangement for two harpsichords, BWV 1080/18, one choice away).", "Entries to 37, a long middle with a G pedal (38-42), the last entries (62, 66).", C13),
  ...mirror("bwv1080-13i", "chip", "D708: the inversus on the same sound as its rectus: CLASSIC CHIP (the probe's closest pair 1.70 against the harpsichord's 1.41).", "The rectus upside down, the same bars; a pedal on C (30-33).", C13),
  "bwv1080-c14": {
    sound: "vocalSynth",
    soundWhy: "D708: a two-voice canon by augmentation in contrary motion, the follower twice as slow and upside down: VOCAL SYNTH's two singers (la and da), the leader's vowel against the follower's (the probe's distance 2.82 against the chip's 1.89), two voices singing the canon as the Swingle Singers sang Bach.",
    character: "Two voices, the second twice as slow and upside down; a break (55-56) between the halves.",
    plans: {
      vocalSynth: [at(1, { open: 0.5, tone: -2 }, "The canon begins on a half-open vowel, darker."), at(53, { open: 0.35, tone: -2 }, "The second half (53): the parts exchanged, a closed vowel."), at(105, { tone: 2, room: 0.15 }, "The leader's head again, the final group (105): open and bright, in more of the room.")],
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
    sound: "tracker",
    soundWhy: "D708: a canon at the tenth in 12/8, two voices: TRACKER's sampled violin and slapped bass, hard left and right (the probe's distance 5.10 against the harpsichord's 2.38: one instrument for both lines), the lilt kept dry.",
    character: "Two voices in compound time; a cadence in F (17).",
    plans: {
      tracker: [at(1, { tone: -2 }, "The canon opens in a darker tone."), at(40, { tone: 2 }, "The second half (40, the final group): the parts inverted, bright."), at(56, OWN, "The coda (56).")],
      harpsichordSampled: [at(1, H8, "The 8′."), at(42, H84, "The second half: 8′+4′.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes.")],
    },
  },
  "bwv1080-c17": {
    sound: "berlinSchool",
    soundWhy: "D708: a canon at the twelfth in brisk triplets, at its FAST step (D710): BERLIN SCHOOL's sequencer lead over its synth bass (the probe's distance 4.18 against SWITCHED-ON's 2.11), the triplets as an arpeggiator's.",
    character: "Two voices; cadences in D minor (30, 42).",
    plans: {
      berlinSchool: [at(1, { tone: -2 }, "The canon opens veiled."), at(B("bwv1080-c17", 30), { lp: 2600, tone: -2 }, "After the cadence (30), the filters half closed."), at(B("bwv1080-c17", 42), { tone: -2 }, "Open after the cadence of 42, still veiled."), at(68, { tone: 2 }, "The final group (68): the filters bright.")],
      analog: [at(B("bwv1080-c17", 30), { lp: 2600 }, "After the cadence (30), the filter half closed."), at(B("bwv1080-c17", 42), OWN, "Open after the cadence of 42.")],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(B("bwv1080-c17", 30), H8, "After the cadence (30): the 8′."), at(B("bwv1080-c17", 42), H84, "After the cadence of 42.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(B("bwv1080-c17", 30), OFLUTE, "The flutes."), at(B("bwv1080-c17", 42), OPRIN, "The principals.")],
    },
  },
  "bwv1080-14": {
    sound: "petSounds",
    soundWhy: "D708: the unfinished triple fugue, its last subject B-A-C-H, breaking off in bar 239: PET SOUNDS' tack piano, twelve-string guitar, horn and bass, each voice its own (the probe's closest pair 1.97 against the harpsichord's 0.64), Brian Wilson's melancholy for the work's last page; it ends in tempo where the text stops (D710).",
    character: "The first subject (1-113), the running second subject (from 114, after the cadence in D), the third, B-A-C-H (from 193, after the cadence in G minor), all three together (233-239).",
    plans: {
      petSounds: [at(1, { tone: -1.5 }, "The first subject in the stile antico, a darker tone."), at(E("bwv1080-14", 114), { tone: -1.5 }, "The running second subject (114)."), at(E("bwv1080-14", 193), { tone: -0.5 }, "B-A-C-H (193)."), at(E("bwv1080-14", 233), { tone: 1.5, room: 0.12 }, "All three subjects together (233): bright, in more of the room.")],
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
