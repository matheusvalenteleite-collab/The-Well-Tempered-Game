/**
 * D355: the Well-Tempered Clavier, Book I's fugues: each one's own sound and its colour plans.
 * Read from the repository's analysis (data/wtc/fugue-analysis.json: entries, episodes, stretti;
 * data/wtc/ledbetter-sections.json: Ledbetter's sections and pedal points; the cadences in
 * data/touch/pieces.json) and from the readings extracted from Keller (1965/1976) and Bodky (1960) in
 * docs/wtc/readings (D272): Bodky's harpsichord registrations by bar are followed where he gives them,
 * except where they would bring the subject out by loudness (the owner's rule: never a louder subject).
 * Bars are Bach's, as the encoding numbers them; a fraction is a part of the bar.
 */
import { at, beat, entry, H8, H84, H88, HFULL, HLUTE, OFLUTE, OFONDS, OPLENO, OPRIN, OWN, widths, type PieceColours } from "./kit.ts";

const E = entry;
const B = beat;

export const BOOK1: Record<string, PieceColours> = {
  wtc1f01: {
    sound: "chamberOrgan",
    soundWhy: "Four voices in continuous stretti over pedal points (Ledbetter's last section, bars 19-27), the subject in long, vocal steps: the stile antico of the organ ricercar, which D246 already heard on the organ. The pedal's sustained C under the close carries on a phone through the organ's upper ranks.",
    character: "Quiet, austere (Keller); stretti from bar 7, triple and quadruple stretti 14-19, stretti over pedals 19-27 (Ledbetter); hardly any episode.",
    plans: {
      chamberOrgan: [
        at(1, OFLUTE, "The exposition on the flutes: Bodky's clavichord plan begins soft (bars 1-7)."),
        at(7, OPRIN, "The close stretto (Ledbetter 7-14): the principals, Bodky's crescendo made a terrace."),
        at(14, OPLENO, "Triple and quadruple stretto after the cadence in A minor (14-19): the plenum, Bodky's loudest span."),
        at(19, OPRIN, "The stretti over the pedal points (19-27) back on the principals: Bodky's diminuendo toward a soft close."),
      ],
      harpsichordSampled: [
        at(14, H84, "The 4′ drawn for the quadruple stretto after the A-minor cadence (Ledbetter 14-19)."),
        at(24, H88, "The tonic pedal (24-27): the manuals coupled at unison, weight without glare (Bodky ends softly, so no 4′)."),
      ],
      chip: [
        ...widths(7, [0.25, 0.5, 0.125], "The stretti begin (bar 7): the pulses trade duty cycles, as a chip composer marks a new section."),
        at(19, OWN, "Over the pedals: the chip's own widths again."),
      ],
      tomita: [at(24, { room: 0.25 }, "The final tonic pedal (24-27) swells into the space echo.")],
    },
  },
  wtc1f02: {
    sound: "harpsichordSampled",
    soundWhy: "The keyboard's own capricious, half-jesting fugue (Keller), three clean voices that a plucked string keeps apart on a phone; Bodky plans it on a two-manual harpsichord, the plan the sound now plays.",
    character: "Regular alternation of entries and episodes (Bodky); episodes 5-7, 9-11, 13-15, 17-20, 22-26; the bass entry at 26 after the dominant pedal; a forte close (Keller).",
    plans: {
      harpsichordSampled: [
        at(1, H84, "Bodky: the exposition forte, 8′+4′."),
        at(B("wtc1f02", 9), H8, "Bodky: the episode piano (the 8′ alone) from just after the downbeat of 9, until the entry in 11."),
        at(E("wtc1f02", 11), H84, "The soprano's entry: back to the louder manual."),
        at(B("wtc1f02", 13), H8, "The episode 13-15 on the 8′ (Bodky's terraces)."),
        at(E("wtc1f02", 15), H84, "The second section (Ledbetter, from 15): forte."),
        at(B("wtc1f02", 17), H8, "After the cadence in G minor (17): the episode piano."),
        at(E("wtc1f02", 20), H84, "The soprano's entry in 20."),
        at(B("wtc1f02", 22), H8, "The interlude 22-25 (Ledbetter) piano."),
        at(25, H84, "The dominant pedal (25-26) and the bass entry of 26: forte (Bodky draws his 16′ here)."),
        at(28, HFULL, "Bodky couples the manuals for the close (28): the full harpsichord."),
      ],
      analog: [
        at(B("wtc1f02", 9), { lp: 2400 }, "On Switched-On Bach (1968) the episodes change colour: the filter closes for the episode 9-11."),
        at(E("wtc1f02", 11), OWN, "Open again at the entry."),
        at(B("wtc1f02", 22), { lp: 2400 }, "The interlude 22-25 filtered."),
        at(25, OWN, "Open for the pedal and the close."),
      ],
      chamberOrgan: [
        at(1, OPRIN, "The principals for the entries."),
        at(B("wtc1f02", 9), OFLUTE, "The episodes on a second manual's flutes (9-11)."),
        at(E("wtc1f02", 11), OPRIN, "Back to the principals for the entry."),
        at(B("wtc1f02", 22), OFLUTE, "The interlude 22-25 on the flutes."),
        at(25, OPRIN, "The pedal point and the bass entry."),
        at(28, OPLENO, "The plenum for the forte close."),
      ],
      soloVoices: [at(25, { room: 0.12 }, "The Swingle Singers sang it (Jazz Sébastien Bach, 1963): a little more of the hall for the close.")],
    },
  },
  wtc1f03: {
    sound: "gameboy",
    soundWhy: "Graceful, euphonious, not too brilliant (Keller), three voices with long chattering episodes: the Game Boy's thin pulses and wave channel keep the three lines apart through a phone's speaker, and its duty cycles give the episodes a colour of their own.",
    character: "A first section 1-12, long episodes (7-14, 28-34, 48-55), a reprise from 42 (Ledbetter); a proud close (Keller).",
    plans: {
      gameboy: [
        ...widths(7, [0.125, 0.125], "The episode 7-10 (Ledbetter): the upper pulses thinner, a chattering colour."),
        at(E("wtc1f03", 10), OWN, "The soprano's entry: the voices' own widths."),
        ...widths(28, [0.125, 0.125], "The long episode 28-34 thinner again."),
        at(E("wtc1f03", 35), OWN, "The entries of 35-36."),
        ...widths(42, [0.5], "The reprise (Ledbetter 42-55): the lead's square, fuller."),
      ],
      harpsichordSampled: [
        at(1, H84, "Graceful, bright: 8′+4′."),
        at(7, H8, "The episode 7-10 (Ledbetter) on the 8′."),
        at(E("wtc1f03", 10), H84, "The entry in 10."),
        at(28, H8, "The episode 28-34."),
        at(E("wtc1f03", 35), H84, "The stretto entries of 35-36."),
        at(42, HFULL, "The reprise and Keller's proud, self-confident close: the manuals coupled."),
      ],
      chamberOrgan: [
        at(1, OFLUTE, "A light fugue: the flutes."),
        at(42, OPRIN, "The reprise on the principals."),
      ],
      megaFm: [
        at(28, { fm: 0.65 }, "The long episode with a mellower FM index."),
        at(E("wtc1f03", 35), OWN, "The entries in the operators' own brightness."),
      ],
    },
  },
  wtc1f04: {
    sound: "stringConsort",
    soundWhy: "Five voices, three subjects, a ricercar in the stile antico (Bodky: 'monumental'): a viol consort's music, played by STRING CONSORT one to a part (two violins, two violas, cello), each line its own bow.",
    character: "Heavy first section, a more subjective second (the running second subject from 35), the highest inward intensity in the third (from 49; Keller); the stretto 94-115 (Ledbetter) over pedals on A♭ and C♯.",
    plans: {
      chamberOrgan: [
        at(1, OPRIN, "The first subject's heavy, encumbered section on the principals."),
        at(35, OFLUTE, "The cadence in E (35): the second subject's running quavers on a second manual (Bodky goes to his softer manual here)."),
        at(49, OPRIN, "The third subject (from 49) and all three together: the principals again."),
        at(B("wtc1f04", 105), OPLENO, "The half cadence on C♯ (105) and the pedal points to the end: the plenum."),
      ],
      harpsichordSampled: [
        at(1, HFULL, "Bodky: bars 1-35 on the full work (his 16′ aside)."),
        at(35, H84, "Bodky: 8′+4′ alone from 35."),
        at(76, HFULL, "Bodky: the full work from 76."),
        at(94, H84, "Bodky: lighter at the stretto's start (94)."),
        at(105, HFULL, "Bodky: the full work for the close over the pedals."),
      ],
      soloVoices: [at(B("wtc1f04", 105), { room: 0.15 }, "The singers' last pedal points in more of the hall.")],
      tomita: [at(B("wtc1f04", 105), { room: 0.3 }, "The closing pedals into the space echo.")],
    },
  },
  wtc1f05: {
    sound: "harpsichordSampled",
    soundWhy: "A French overture fugue, pompous and dotted, which 'lends itself excellently to the full work of the harpsichord' (Bodky): the plucked attack keeps the dotted rhythms crisp on a phone.",
    character: "Dignified, strong, with fire (Keller); the right hand on the softer manual 6-8, 9-11, 21-22, the left 17-20 (Bodky).",
    plans: {
      harpsichordSampled: [
        at(1, HFULL, "Bodky: the full work."),
        at(6.25, { ...H84, voices: [0, 1] }, "Bodky: the right hand on the softer keyboard after the first chord of 6 (the upper voices: 8′+4′ alone)."),
        at(8, HFULL, "Both hands on the full work again from the first chord of 8."),
        at(9.25, { ...H84, voices: [0, 1] }, "Bodky: the right hand softer from the second quarter of 9 to 11."),
        at(11, HFULL, "Both on the full work."),
        at(17, { ...H84, voices: [2, 3] }, "Bodky: the left hand on the softer keyboard 17-20."),
        at(20, HFULL, "Both on the full work."),
        at(21.25, { ...H84, voices: [0, 1] }, "Bodky: the right hand softer from the second quarter of 21."),
        at(22, HFULL, "The full work to the end."),
      ],
      chamberOrgan: [
        at(1, OPLENO, "The overture's pomp on the plenum."),
        at(6.25, { ...OPRIN, voices: [0, 1] }, "Bodky's softer right hand as the principals alone."),
        at(8, OPLENO, "The plenum again."),
        at(17, { ...OPRIN, voices: [2, 3] }, "Bodky's softer left hand (17-20)."),
        at(20, OPLENO, "The plenum to the end."),
      ],
      soloVoices: [
        at(1, OWN, "The Swingle Singers sang this fugue (Jazz Sébastien Bach, 1963)."),
        at(20, { room: 0.12 }, "The stretto close (20-24) with more of the hall."),
      ],
      super16: [at(6.25, { room: 0.18, voices: [0, 1] }, "The upper voices' quieter bars (Bodky 6-8) echoed by the SPC."), at(8, OWN, "Dry again.")],
    },
  },
  wtc1f06: {
    sound: "clavichord",
    soundWhy: "Bodky's clavichord fugue; Busoni's dolce and swells on the Baroque keyboard that has dynamics.",
    character: "Stretti massing throughout; a first half 1-21 and a second half in inversion 21-44 (Ledbetter); episodes 9-13, 30-33.",
    plans: {
      pianoSampled: [
        at(9, { layer: "soft" }, "The episode 9-13: the soft layer, as a pianist's una corda colour (the level unchanged)."),
        at(E("wtc1f06", 13), OWN, "The soprano's entry: the full tone."),
        at(30, { layer: "soft" }, "The episode 30-33."),
        at(E("wtc1f06", 34), OWN, "The bass's entry in 34 to the end."),
      ],
      harpsichordSampled: [
        at(1, H84, "Aggressive, marcato: 8′+4′."),
        at(9, H8, "The episode 9-13 on the 8′."),
        at(E("wtc1f06", 13), H84, "The entry in 13."),
        at(B("wtc1f06", 21), HFULL, "The second half, in inversion with stretti (Ledbetter 21-44): the manuals coupled."),
      ],
      chamberOrgan: [
        at(1, OPRIN, "The principals."),
        at(B("wtc1f06", 21), OFONDS, "The inversion half on the principal and flute together."),
        at(39, OPLENO, "The last stretti and the tonic pedal (39-44): the plenum."),
      ],
      sid64: [at(B("wtc1f06", 21), { pw: 0.5 }, "The inversion half: the SID's pulses opened to square."), at(30, { pw: 0.2 }, "The episode narrower."), at(E("wtc1f06", 34), OWN, "The close in the voices' own sweep.")],
    },
  },
  wtc1f07: {
    sound: "analog",
    soundWhy: "Wendy Carlos recorded this prelude and fugue on Switched-On Bach (1968): the Moog's lines are clear and dry on a phone, the bass a snapping synth bass.",
    character: "Charming, free and modern (Keller); an elegant 'secular' fugue, first half 1-17 (Ledbetter), episodes three quarters of it.",
    plans: {
      analog: [
        at(17, { lp: 2600 }, "The second half (17-25) with the filter half closed, Bodky's softer span."),
        at(25, OWN, "Open again from 25."),
        at(34, { tone: 2 }, "The last bars a shade brighter (Bodky's coupled close)."),
      ],
      harpsichordSampled: [
        at(1, H8, "Bodky's 'discreet' registration: the 8′."),
        at(17, HLUTE, "Bodky's softer manual for 17-25: here the buff."),
        at(25, H8, "The 8′ again."),
        at(34, HFULL, "Bodky couples the manuals for the close (34)."),
      ],
      chamberOrgan: [
        at(1, OFLUTE, "Elegant and light: the flutes."),
        at(34, OPRIN, "The close on the principals."),
      ],
      gameboy: [...widths(17, [0.125, 0.125], "The second half's thinner duty."), at(25, OWN, "The own widths from 25 (Bodky's forte).")],
    },
  },
  wtc1f08: {
    sound: "pianoSampled",
    soundWhy: "Spiritually intense, searching (Keller), with inner, not outward grandeur (Bodky, a clavichord piece): a singing piano holds its long lines and augmentations; its bass is clear on a phone.",
    character: "Six expositions, to be set off as units (Keller: mp, mf, p, mf, f): 1-19, 19-30, 30-52 (inversion), 52-62, 62-77 (augmentation), 77-87.",
    plans: {
      pianoSampled: [
        at(1, { layer: "soft" }, "Keller's mp for the first exposition: the soft layer."),
        at(B("wtc1f08", 19), OWN, "The second exposition (mf) after the cadence in A♯ minor."),
        at(E("wtc1f08", 30), { layer: "soft" }, "The inversion (Keller's p)."),
        at(E("wtc1f08", 52), OWN, "The stretto of 52 (mf)."),
      ],
      harpsichordSampled: [
        at(1, H8, "Keller's mp: the 8′."),
        at(B("wtc1f08", 19), H88, "The second exposition (mf): the coupled unison."),
        at(E("wtc1f08", 30), HLUTE, "The inversion (p): the buff."),
        at(E("wtc1f08", 52), H88, "The stretti (mf)."),
        at(E("wtc1f08", 62), HFULL, "The augmentation (f, 'inwardly felt'): the full harpsichord."),
      ],
      chamberOrgan: [
        at(1, OFLUTE, "Keller's mp: the flutes."),
        at(B("wtc1f08", 19), OPRIN, "mf: the principals."),
        at(E("wtc1f08", 30), OFLUTE, "The inversion (p) on the flutes."),
        at(E("wtc1f08", 52), OPRIN, "The stretti (mf)."),
        at(E("wtc1f08", 62), OFONDS, "The augmentations (f, 'inwardly felt'): the foundations, no mixture."),
      ],
      soloVoices: [at(E("wtc1f08", 62), { room: 0.12 }, "The augmentation's long notes with more of the hall.")],
    },
  },
  wtc1f09: {
    sound: "baroqueBand",
    soundWhy: "Cheeky and high-spirited (Keller), three voices like a trio sonata: BAROQUE BAND's violin and oboe, and the bass entering last (bar 4) on the cello with the continuo harpsichord.",
    character: "Vocal in idiom (Bodky); a long episode 10-16, a reprise from 19 (Ledbetter).",
    plans: {
      super16: [
        at(10, { room: 0.2 }, "The long episode 10-16 in the SPC's echo, the console's own effect."),
        at(E("wtc1f09", 16), OWN, "Dry at the alto's entry."),
      ],
      harpsichordSampled: [
        at(1, H84, "High spirits: 8′+4′."),
        at(10, H8, "The long episode 10-16 on the 8′."),
        at(E("wtc1f09", 16), H84, "The entry in 16 and the reprise."),
      ],
      chamberOrgan: [at(1, OFLUTE, "Light: the flutes."), at(19, OPRIN, "The reprise (Ledbetter 19-29) on the principals.")],
      soloVoices: [at(10, { room: 0.12 }, "Bodky hears the Gloria's 'Gratias agimus': the episode sung into the hall."), at(E("wtc1f09", 16), OWN, "Closer at the entry.")],
    },
  },
  wtc1f10: {
    sound: "chip",
    soundWhy: "The only two-voice fugue, aggressive and richly coloured (Keller), its two voices meeting in octaves (19, 38): the chip's pulse over its triangle is the console's own two-channel writing; on a phone the bass is a pulse.",
    character: "Two halves, the second a mirror of the first (Ledbetter 1-19, 20-38); the famous unisons in 19 and 38.",
    plans: {
      chip: [
        ...widths(19, [0.5], "The unison of bar 19: the lead opened to a square, the two voices as one."),
        at(20, OWN, "The second half in the own widths."),
        ...widths(38, [0.5], "The unison of bar 38."),
      ],
      harpsichordSampled: [
        at(19, H84, "Bodky: 8′+4′ in both hands for the unison of 19, 'the only right conclusion' (his scheme of a louder theme is left out: the subject is never louder here)."),
        at(20, H8, "The second half on the 8′."),
        at(38, H84, "Bodky: the unison of 38 to the end."),
      ],
      chamberOrgan: [at(1, OFONDS, "Two voices: principal and flute together."), at(19, OPLENO, "The unison on the plenum."), at(20, OFONDS, "The second half on the foundations."), at(38, OPLENO, "The unison of 38 and the close.")],
      sid64: [at(19, { pw: 0.5 }, "The unison: the SID's pulses square."), at(20, OWN, "Back to the sweep."), at(38, { pw: 0.5 }, "The unison of 38.")],
    },
  },
  wtc1f11: {
    sound: "super16",
    soundWhy: "A passepied (Bodky, Keller: 'with deliberate grace'), light and dancing: SUPER 16-BIT's violin, harpsichord and bassoon, three attacks a phone tells apart.",
    character: "Bodky's three terraces (1-17, 17-34, 35-46, 46-56, 56-72); first section 1-46, stretto 46-56 (Ledbetter).",
    plans: {
      harpsichordSampled: [
        at(1, H8, "Bodky's soft 8″."),
        at(17, H88, "His louder 8′ (17-34): the coupled unison."),
        at(35, HFULL, "8′+8′+4′ (35-46)."),
        at(46, H88, "The stretto (46-56)."),
        at(56, H8, "Back to the soft 8′ (56-72)."),
      ],
      chamberOrgan: [at(1, OFLUTE, "The flutes for the dance."), at(35, OPRIN, "Bodky's loudest terrace."), at(56, OFLUTE, "The last terrace.")],
    },
  },
  wtc1f12: {
    sound: "nocturne32",
    soundWhy: "Deeply earnest, an anguished chromatic subject that 'must sing' (Bodky, Keller): NOCTURNE 32-BIT's violin and viola sustain it, over the organ's pedal, in its dark hall.",
    character: "The chromatic entries against calm diatonic interludes (10-13, 16-18, 22-26, 50-52: Ledbetter), the contrast to be underlined (Keller).",
    plans: {
      nocturne32: [
        at(10, { tone: -3 }, "The interlude 10-13 darker, against the chromatic subject (Keller)."),
        at(E("wtc1f12", 13), OWN, "The soprano's entry."),
        at(22, { tone: -3 }, "The interlude 22-26."),
        at(E("wtc1f12", 27), OWN, "The bass's entry."),
        at(50, { tone: -3 }, "The interlude 50-52."),
        at(E("wtc1f12", 53), OWN, "The last entry."),
      ],
      harpsichordSampled: [
        at(1, H84, "The subject's sections on 8′+4′."),
        at(10, H8, "Keller's contrast: the interludes on the 8′ (10-13)."),
        at(E("wtc1f12", 13), H84, "The entry."),
        at(22, H8, "The interlude 22-26."),
        at(E("wtc1f12", 27), H84, "The entry."),
        at(50, H8, "The interlude 50-52."),
        at(E("wtc1f12", 53), H84, "The last entry."),
      ],
      chamberOrgan: [
        at(1, OPRIN, "The principals."),
        at(10, OFLUTE, "The interludes on a second manual's flutes."),
        at(E("wtc1f12", 13), OPRIN, "The entry."),
        at(22, OFLUTE, "The interlude 22-26."),
        at(E("wtc1f12", 27), OPRIN, "The entry."),
        at(50, OFLUTE, "The interlude 50-52."),
        at(E("wtc1f12", 53), OPRIN, "The last entry."),
      ],
      pianoSampled: [at(10, { layer: "soft" }, "The interlude in the soft layer."), at(E("wtc1f12", 13), OWN, "The entry."), at(22, { layer: "soft" }, "The interlude 22-26."), at(E("wtc1f12", 27), OWN, "The entry.")],
    },
  },
  wtc1f13: {
    sound: "tomita",
    soundWhy: "Euphonious, soft and gently flowing (Keller), the 'little brook' of water figures (Bodky): TOMITA's whistle and flute over its bass, the outer voices nearly dry so the lines stay clear on a phone.",
    character: "Exposition 1-7, then 7-23 and 23-35 (Ledbetter); episodes 7-11, 12-15, 17-20, 22-28.",
    plans: {
      tomita: [
        at(7, { room: 0.15 }, "The episodes of the middle section (from 7) in the space echo: the brook."),
        at(23, OWN, "The third section (Ledbetter, from 23)."),
        at(E("wtc1f13", 31), { room: 0.22 }, "The last entry and the close in the echo."),
      ],
      harpsichordSampled: [
        at(7, HLUTE, "The water figures of the episode 7-11 on the buff."),
        at(E("wtc1f13", 11), H8, "The soprano's entry."),
        at(23, H88, "The third section a little warmer: the coupled unison."),
      ],
      chamberOrgan: [at(1, OFLUTE, "Soft and flowing: the flutes throughout.")],
      vocalSynth: [at(7, { open: 0.3 }, "The episodes on a closed vowel."), at(23, OWN, "The third section open again.")],
    },
  },
  wtc1f14: {
    sound: "lute",
    soundWhy: "Pensive, with a sobbing countersubject (Keller, Bodky), four voices in 6/4: the LUTE's plucked courses, a lutenist's lament, its bass courses still heard on a phone.",
    character: "An episode 11-14 (Ledbetter), the cadence in C♯ minor (20) and the inversion's entry, a bass pedal on C♯ 37-39.",
    plans: {
      pianoSampled: [
        at(11, { layer: "soft" }, "The episode 11-14 in the soft layer."),
        at(E("wtc1f14", 15), OWN, "The soprano's entry."),
        at(23, { layer: "soft" }, "The episode 23-29."),
        at(E("wtc1f14", 29), OWN, "The tenor's entry."),
      ],
      harpsichordSampled: [at(1, H8, "The 8′."), at(20, H84, "After the cadence in C♯ minor (20), the inversion: 8′+4′."), at(37, H88, "The C♯ pedal (37-39): the coupled unison.")],
      chamberOrgan: [at(1, OFLUTE, "Pensive: the flutes."), at(20, OPRIN, "The inversion after the cadence."), at(37, OFONDS, "The C♯ pedal: the foundations.")],
    },
  },
  wtc1f15: {
    sound: "megaFm",
    soundWhy: "A gigue, 'a performer's fugue' of fire and humour with sharp articulation (Keller): MEGA FM's clav and slap bass articulate it crisply and cut through a phone's speaker.",
    character: "Bodky's three spans (1-37 forte, 38-61 piano, 61-86 forte); the exposition inverso 20-31 (Ledbetter); the final stretti 77-79.",
    plans: {
      megaFm: [
        at(38, { fm: 0.7 }, "Bodky's middle span (38-61) with a mellower FM index."),
        at(61.625, OWN, "The operators' own brightness from 61⅝ (Bodky)."),
        at(77, { fm: 1.2 }, "The last stretti a little brighter."),
      ],
      harpsichordSampled: [at(1, H84, "Bodky: 8″+4″ for 1-37."), at(38, H8, "Bodky: the 8′ for 38-61⅝."), at(61.625, H84, "Bodky: 8″+4″ from 61⅝ to the end.")],
      chamberOrgan: [at(1, OPRIN, "The principals."), at(38, OFLUTE, "Bodky's softer middle on the flutes."), at(61.625, OPRIN, "The principals again.")],
      chip: [...widths(38, [0.25], "The middle span: the lead's duty rounder."), at(61.625, OWN, "The own widths for the last span.")],
    },
  },
  wtc1f16: {
    sound: "harpsichordSampled",
    soundWhy: "Molto energico (Bodky), quietly moving (Keller), with an echo episode Bodky marks forte and piano: the two-manual harpsichord's own effect, which the plan plays.",
    character: "Cadences in G minor (10) and B♭ (12); the echo of 18-20; the episode after the cadence of 24; stretto 28 (Bodky).",
    plans: {
      harpsichordSampled: [
        at(1, H84, "Bodky: the exposition forte (the stretto is forte, so is the exposition)."),
        at(12, H8, "Bodky: piano after the cadence in B♭ (12)."),
        at(18.625, H84, "Bodky's echo: forte from the sixth eighth of 18…"),
        at(19.625, H8, "…piano from the sixth eighth of 19 (the echo)…"),
        at(20, H84, "…forte from 20."),
        at(24, H8, "Bodky: piano after the cadence in G minor (24)."),
        at(28, H84, "Bodky: the stretto (28) forte to the end."),
      ],
      chamberOrgan: [
        at(1, OPRIN, "The principals."),
        at(12, OFLUTE, "The second manual after the B♭ cadence."),
        at(18.625, OPRIN, "Bodky's echo: the phrase on the principals…"),
        at(19.625, OFLUTE, "…echoed on the flutes."),
        at(20, OPRIN, "Back to the principals."),
        at(24, OFLUTE, "The episode after the cadence."),
        at(28, OPLENO, "The stretto on the plenum."),
      ],
      chip: [...widths(19.625, [0.125, 0.125, 0.125], "The echo (Bodky, 19⅝): thinner pulses."), at(20, OWN, "The own widths, forte again (Bodky).")],
      super16: [at(19.625, { room: 0.25 }, "The echo into the SPC's echo."), at(20, OWN, "Dry again for the forte.")],
    },
  },
  wtc1f17: {
    sound: "chamberOrgan",
    soundWhy: "'Noble and warm, organ- or choral-like; solemnly slow' (Keller): four voices with a reprise (Ledbetter 27-35) that a plenum crowns.",
    character: "A solo at 8-9 and episodes 11-12, 14-15, 19-20 (Ledbetter), a cadence in E♭ (23), the reprise 27-35.",
    plans: {
      chamberOrgan: [
        at(1, OPRIN, "The principals."),
        at(8, OFLUTE, "The solo bars 8-9 (Ledbetter) and the episode on a second manual."),
        at(E("wtc1f17", 10), OPRIN, "The tenor's entry (10)."),
        at(19, OFLUTE, "The episode 19-20."),
        at(E("wtc1f17", 23), OPRIN, "The alto's entry after the cadence in E♭."),
        at(27, OPLENO, "The reprise (27-35) on the plenum."),
      ],
      harpsichordSampled: [at(1, H84, "8′+4′."), at(8, H8, "The solo and episode 8-10."), at(E("wtc1f17", 10), H84, "The entry."), at(27, HFULL, "The reprise: the manuals coupled.")],
      soloVoices: [at(27, { room: 0.15 }, "Choral (Keller): the reprise in more of the hall.")],
    },
  },
  wtc1f18: {
    sound: "pianoSampled",
    soundWhy: "Expressive but graceful, a free, almost romantic subject (Keller), a clavichord fugue for Bodky: the recorded grand, its four voices voiced apart (the inner ones lighter).",
    character: "Exposition 1-9 (Ledbetter); Bodky's idea: the exposition on the soft keyboard, the loud one from 11 to the end.",
    plans: {
      pianoSampled: [at(1, { layer: "soft" }, "Bodky's soft exposition: the soft layer."), at(11, OWN, "From 11 the full tone (Bodky: 'we have to stay on it to the end').")],
      harpsichordSampled: [at(1, H8, "Bodky: the exposition on the soft keyboard."), at(11, H84, "Bodky: the loud keyboard from 11 to the end.")],
      chamberOrgan: [at(1, OFLUTE, "The exposition on the flutes."), at(11, OPRIN, "The principals from 11."), at(E("wtc1f18", 37), OFONDS, "The last entry (37): the foundations.")],
      vocalSynth: [at(1, { open: 0.35 }, "The exposition on a closed vowel."), at(11, OWN, "Open from 11.")],
    },
  },
  wtc1f19: {
    sound: "tracker",
    soundWhy: "A strange subject, 'a delicate and complicated scherzo' in 9/8 (Keller after Tovey): TRACKER's violin, harpsichord and slapped bass, hard left and right, light and clear on a phone.",
    character: "Sections 1-20, 23-42 and the reprise 42-54 (Ledbetter); dolce e molto espressivo (Bodky).",
    plans: {
      tracker: [at(23, { vib: 12 }, "The middle section with the tracker's vibrato command."), at(42, OWN, "The reprise plain.")],
      harpsichordSampled: [at(1, H8, "Dolce: the 8′."), at(23, HLUTE, "The middle section (23-42) on the buff."), at(42, H84, "The reprise (42-54) on 8′+4′.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(42, OPRIN, "The reprise on the principals.")],
    },
  },
  wtc1f20: {
    sound: "harpsichordSampled",
    soundWhy: "'Among Bach's wild A minor pieces, where the virtuoso element prevails' (Bodky), a didactic stretto proving-ground (Keller): the composer's own keyboard showpiece, Bodky's pedal-harpsichord plan made the band's.",
    character: "Exposition recto 1-14½, inverso 14½-27½, stretto recto 27½-48, stretto inverso 48-64½ (Ledbetter); pedal points on E (60-62) and A (83-87).",
    plans: {
      harpsichordSampled: [
        at(1, H84, "Bodky: 8″+4″."),
        at(14.5, H8, "The exposition inverso (Ledbetter, 14½): Bodky's piano."),
        at(27.5, H84, "The stretto recto at the octave (27½)."),
        at(B("wtc1f20", 35), H8, "Bodky: piano after the cadence in E minor (35)."),
        at(43, H84, "Bodky: forte from 43."),
        at(48, H8, "The stretto inverso (48): Bodky's piano."),
        at(53, H84, "Bodky: forte from 53."),
        at(65, H88, "Bodky's 8′+16′ (65-73): the coupled unison, the game's harpsichord having no 16′."),
        at(73, H84, "Bodky: 8″+4″."),
        at(80, HFULL, "Bodky: the full harpsichord for the close over the A pedal."),
      ],
      chamberOrgan: [
        at(1, OPRIN, "The principals."),
        at(14.5, OFLUTE, "The exposition inverso on the flutes."),
        at(27.5, OPRIN, "The stretto recto."),
        at(48, OFLUTE, "The stretto inverso."),
        at(53, OPRIN, "The principals again."),
        at(80, OPLENO, "The close over the tonic pedal: the plenum."),
      ],
      sid64: [at(27.5, { pw: 0.5 }, "The stretti: the SID's pulses square."), at(48, { pw: 0.2 }, "The stretto inverso narrower."), at(65, OWN, "The voices' own sweep."), at(80, { pw: 0.5 }, "The close.")],
    },
  },
  wtc1f21: {
    sound: "sid64",
    soundWhy: "Innocent cheerfulness (Busoni), a capricious strict dance (Keller): SID 64's pulses and saw, three bright lines that dance apart.",
    character: "Episodes 13-19, 31-37, 41-48; Bodky's right hand piano 19-22 and forte 30-33 (his louder theme left out).",
    plans: {
      harpsichordSampled: [at(1, H84, "Bodky: forte."), at(19, H8, "Bodky: piano from 19 to 22."), at(22, H84, "Forte again."), at(33, H8, "Bodky: piano after 33."), at(37, H84, "Bodky: forte from 37 to the end.")],
      chamberOrgan: [at(1, OFLUTE, "A dance: the flutes."), at(37, OPRIN, "The last section on the principals.")],
      gameboy: [...widths(19, [0.125, 0.125], "Bodky's piano bars (19-22) on thinner pulses."), at(22, OWN, "The own widths, forte again.")],
    },
  },
  wtc1f22: {
    sound: "soloVoices",
    soundWhy: "'A song-like choral fugue of suffering ending in triumph; full, warm choral sound' (Keller): five voices in long alla breve notes, each within a singer's compass; SOLO VOICES' singers and choir.",
    character: "Exposition 1-25, then 25-37, 37-55, 55-75 (Ledbetter), cadences in D♭ (25), A♭ (37), E♭ minor (55), the deceptive cadence of 64 and the final stretti.",
    plans: {
      soloVoices: [at(25, { room: 0.1 }, "The second section a little further away."), at(37, OWN, "Closer again (37)."), at(64, { room: 0.15 }, "Bodky's 16′ moment (64): the final stretti in more of the hall.")],
      chamberOrgan: [
        at(1, OPRIN, "The principals (Bodky: 8″+4″ for the exposition)."),
        at(25, OFLUTE, "Bodky's softer 25-37: the flutes."),
        at(37, OPRIN, "Bodky's forte from 37."),
        at(55, OFONDS, "Bodky couples the manuals at 55: the foundations."),
        at(B("wtc1f22", 64), OPLENO, "Bodky adds the 16′ after the deceptive cadence of 64: the plenum to the end."),
      ],
      harpsichordSampled: [at(1, H84, "Bodky: 8″+4″."), at(25, H8, "Bodky: 8′ from 25."), at(37, H84, "Bodky: 8″+4″ from 37."), at(55, HFULL, "Bodky: the manuals coupled from 55 (his 16′ at 64 the game has not got).")],
    },
  },
  wtc1f23: {
    sound: "vocalSynth",
    soundWhy: "'Quiet and song-like in all voices; warm, delicate close' (Keller): VOCAL SYNTH's four singers, any compass, bright enough for a phone.",
    character: "Exposition 1-9, episodes 9-11, 14-16, 26-28 (Ledbetter), the dominant's cadence (18).",
    plans: {
      vocalSynth: [
        at(9, { open: 0.3 }, "The episode 9-11 on a closed vowel."),
        at(E("wtc1f23", 11), OWN, "The tenor's entry."),
        at(14, { open: 0.3 }, "The episode 14-16."),
        at(E("wtc1f23", 16), OWN, "The alto's entry."),
        at(26, { open: 0.3 }, "The episode 26-28."),
        at(E("wtc1f23", 29), OWN, "The last entries."),
      ],
      harpsichordSampled: [at(1, H8, "The 8′."), at(E("wtc1f23", 29), H88, "The last entries and the warm close: the coupled unison.")],
      chamberOrgan: [at(1, OFLUTE, "The flutes."), at(B("wtc1f23", 18), OPRIN, "After the dominant's cadence (18)."), at(E("wtc1f23", 31), OFONDS, "The last entry: the foundations.")],
    },
  },
  wtc1f24: {
    sound: "nocturne32",
    soundWhy: "'A solemn, broad largo, laden with Affekt', the sigh-motive subject (Keller), mourning (Bodky): NOCTURNE 32-BIT's violin and viola sustain the sighs over the organ's pedal, in its dark hall.",
    character: "Long episodes (16-21, 24-30, 63-69) between the entries; a cadence in F♯ minor (24); the last entries 69-74.",
    plans: {
      nocturne32: [
        at(16, { tone: -2 }, "The episode 16-21 darker."),
        at(E("wtc1f24", 21), OWN, "The alto's entry."),
        at(B("wtc1f24", 24), { tone: -2 }, "The episode after the cadence in F♯ minor."),
        at(E("wtc1f24", 30), OWN, "The tenor's entry."),
        at(63, { tone: -2 }, "The episode 63-69."),
        at(E("wtc1f24", 69), { room: 0.1 }, "The last entries further into the hall."),
      ],
      harpsichordSampled: [
        at(1, H88, "The largo's weight: the coupled unison."),
        at(16, H8, "The episode 16-21 on the 8′."),
        at(E("wtc1f24", 21), H88, "The entry."),
        at(B("wtc1f24", 24), H8, "The episode after the cadence."),
        at(E("wtc1f24", 30), H88, "The entry."),
        at(63, H8, "The episode 63-69."),
        at(E("wtc1f24", 69), HFULL, "The last entries: the full harpsichord."),
      ],
      chamberOrgan: [
        at(1, OPRIN, "The principals."),
        at(16, OFLUTE, "The episode on the flutes."),
        at(E("wtc1f24", 21), OPRIN, "The entry."),
        at(B("wtc1f24", 24), OFLUTE, "The episode after the cadence."),
        at(E("wtc1f24", 30), OPRIN, "The entry."),
        at(63, OFLUTE, "The episode 63-69."),
        at(E("wtc1f24", 69), OPLENO, "The last entries on the plenum."),
      ],
      pianoSampled: [at(16, { layer: "soft" }, "The episode in the soft layer."), at(E("wtc1f24", 21), OWN, "The entry."), at(63, { layer: "soft" }, "The episode 63-69."), at(E("wtc1f24", 69), OWN, "The last entries.")],
    },
  },
};
