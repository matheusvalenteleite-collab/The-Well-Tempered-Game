# The chorale library: plan

> The conception of the chorale mode itself (what the library is for) is in `CONCEPT.md` (D101):
> levels top-down, judgement by idiom and comparison, not a checker as in the Fux mode.

Owner's brief: a Bach Chorales mode, built on chorale harmonization in the figured-bass tradition.
For now, no generator. First an intelligent, well-parsed, informative library of the material, so
that the principles, patterns and habits are known before anything is generated. **Bach is the
last word** (D98).

## Sources

| corpus | what it is | form | status |
|---|---|---|---|
| **Bach, 371 chorales** | The four-part chorales collected by C. P. E. Bach and Kirnberger (Breitkopf 1784-87), in the Breitkopf numbering. Sapp's edition is checked against Dörffel's 4th edition (c. 1875). No. 150 is not four-part and is absent, so there are 370 files. | Humdrum `**kern`, CC BY-NC-SA 4.0 | vendored, parsed, validated |
| **Kittel, 24 chorales** | J. C. Kittel, *Vierundzwanzig Choräle mit acht verschiedenen Bässen über eine Melodie* (Offenbach: André, 1811; ed. Rinck). Each melody has 8 figured basses (Nos. 23-24 have 9): 194 basses. | engraved PDF (Dorico), read from its vector glyphs; exported as MusicXML | extracted (0 issues), machine-checked (98.6%), not yet proofread by eye |

The two corpora have different roles:

- **Bach** is the authority. He gives one harmonization of each melody, with all four voices written.
- **Kittel** teaches the method: one melody with many correct basses, figured, the inner voices left to the player. He was Bach's pupil (1748-50).

Where they disagree, Bach decides (D98).

## Layers of the library

Each layer is built by a script from the layer below it. Nothing is typed in by hand, and every
derived fact can be traced back to the source.

1. **Sources** (`data/sources/`): the vendored files, unchanged, with their provenance.
2. **Parsed notes** (`data/chorales/bach/`, `data/chorales/kittel/`): the notation as written.
   - Spelled pitches and exact durations.
   - Fermatas, ties, repeats and sections.
   - For Kittel, the figures as stacks: each row has its interval, accidental, stroke,
     continuation and extender, editorial brackets, and its onset.
   - *Done for Bach; done in first pass for Kittel.*
3. **Analysis** (next): computed facts. Each one is labelled as a reading, not a source fact.
   - *Verticalities*: every onset where any voice moves, giving the four pitches, the intervals
     over the bass, and the **figures derived from Bach's voices**. The figures make Bach and
     Kittel comparable in one vocabulary.
   - *Phrases and cadences*: the phrases come from the fermatas. Each cadence is classed by its
     bass motion, its figures and the melody's final interval, and the key of each cadence is
     recorded.
   - *Chord and key reading*: kept modest, in figured-bass terms first (the bass plus its
     figures, and the scale degree in the local key). Roman-numeral labels come only as a
     secondary layer.
   - *Non-chord tones*: passing notes, neighbours, suspensions (preparation, dissonance,
     resolution), anticipations and appoggiaturas, per voice.
   - *Voice-leading events*: parallel and hidden fifths and octaves, crossings and overlaps,
     spacing, doublings, the resolution of leading tones and sevenths, and ranges.
4. **Knowledge** (after that): statistics and patterns over the analysis.
   - Recurring progressions, cadence formulas, suspension habits, and how the bass moves under
     each melodic gesture.
   - For each Kittel melody, the eight basses compared with each other and with Bach's setting
     of the same melody, where the 371 contain one.
   - These are written up as rules in the manner of `docs/fux/rules.md`. Each rule is grounded
     in counts over Bach and illustrated by numbered examples. No rule may contradict Bach's
     practice (the analogue of D39).
5. **Game** (later): a chorale browser and listening, figured-bass realization tasks against
   Kittel's basses, and "write a bass for this melody", compared with Kittel's eight and with
   Bach. There is no generator until layer 4 is understood.

## Order of work

1. ~~Vendor and parse Bach; validate (0 errors).~~ Done. The findings worth a look against the
   Breitkopf scan are three notes outside the usual ranges (nos. 133, 194, 197) and four
   fermata irregularities (nos. 121, 202, 252). They are listed in `data/chorales/bach/VALIDATION.md`.
2. ~~Kittel extractor; pilot on No. 1 (100% consistent); first pass over the book.~~ Done. There
   are 48 extraction issues in 10 chorales (`EXTRACTION.md`), and the harmonic cross-check
   agrees at 96.3% of onsets (`CHECK.md`).
3. ~~**Finish Kittel**~~ Done.
   - 0 extraction issues. The fixes:
     - a bar grid shared by the staves (empty bars carry no rests);
     - chords in the bass;
     - flat beams drawn as rectangles;
     - flags attached through their stems;
     - grace notes;
     - staves identified by their labels, with the melody reprinted for No. 21 [8];
     - row-aware figure columns, with measured spacing.
   - Cross-check at 98.6%. Every disagreement is classed, and only 3 remain unexplained by
     the music.
   - Bars numbered, and checked against every printed bar number. Phrases come from the
     fermatas; the bar-form repeat structure comes from the repeat signs.
   - MusicXML for all 24, read back note for note by an independent parser (music21).
   - Finding: the small notes of the melody are passing notes in the time of the note before
     them (Kittel's figures show it).
4. ~~**Kittel-Bach concordance**~~ Done (`CONCORDANCE.md`, `data/chorales/concordance.json`).
   - 22 of Kittel's 24 melodies are among Bach's 371, in 77 settings; 25 of those settings are
     in Kittel's key.
   - Not there: No. 16 *Ach, wie heilig ist der Ort* and No. 22 *Das Jesulein soll doch mein
     Trost*.
   - The match is made on the notes, which catches tunes under other texts and keeps apart
     texts sung to other tunes:
     - Kittel's *Nun freut euch* is Bach's *Es ist gewißlich an der Zeit*, not his no. 183;
     - *Mir nach* is *Mach's mit mir, Gott*;
     - *Ach Herr, mich armen Sünder* is *Herzlich tut mich verlangen*;
     - *Lobe den Herren* is *Hast du denn, Jesu*, as a variant.
5. **Analysis layer**. Begun over Bach (`data/chorales/bach/analysis/`, `BACH-COUNTS.md`):
   - Verticalities with figures derived from Bach's voices, both literal and in period
     abbreviation: 30,050 onsets, 17,980 of them on the beat.
   - Phrases, and cadences with a first classification.
   - Consecutive fifths and octaves: 18 inside phrases in 370 chorales, 17 of them involving
     passing notes off the beat.
   - Kirnberger's categories (D100, `KIRNBERGER.md`), applied to every sonority:
     - the fundamental chord (triad or seventh chord) and its root (the fundamental bass);
     - the part each voice plays in it, or the kind of incidental dissonance it is;
     - how each seventh is treated.

     All 30,050 sonorities are read. The tests are marked for checking against his text, which
     could not be reached yet.
   - The same reading over Kittel's 194 basses (`data/chorales/kittel/analysis/`). Each
     fundamental chord is built from the bass, its figure as a continuo player reads it, and
     the melody.
   - Kittel against Bach (`KITTEL-BACH.md`): each melody note is aligned with its note in Bach's
     soprano, and the fundamental chords under the two are compared.

     | comparison | same root | same root at cadences |
     |---|---|---|
     | Kittel's basses against Bach's settings | 53% | 75% |
     | two of Bach's own settings of one tune (benchmark) | 69% | 86% |

     Kittel's bass [1] is the closest to Bach (59%); agreement falls slowly with the number of
     the bass ([8] 50%, [9] 45%).
   - Doubling, spacing, the leading tone and melodic intervals in Bach (`BACH-COUNTS.md`).
6. **Knowledge write-up**: first draft in `PRINCIPLES.md`, generated by `tools/chorales/principles.py`.
   It gives eight groups of observations, each with counts and examples linked to the Breitkopf
   1784 print:
   - the fundamental bass;
   - the seventh;
   - suspensions;
   - where the incidental notes are;
   - the leading tone;
   - cadences;
   - consecutive fifths and octaves;
   - the lines.

   For the owner to read and correct before any of it becomes a game rule.

## Open questions for the owner

- **Licence.** Sapp's Bach encoding is non-commercial and share-alike. That is fine for a free
  game, but the chorale data could not go into a commercial product without being re-encoded.
- **Repeats.** Should analysis count a repeated *Stollen* once (as written) or twice (as sung)?
  The library keeps both orders.
- **Modes.** The library keeps Sapp's modal labels (dorian, mixolydian, phrygian). Should the
  analysis read such chorales modally, or tonally in the key of their cadences?

## After the library: the first level of the mode

- Level 1, the cadence plan (`CADENCE-PLANS.md`, `data/chorales/cadence_plans.json`). For each
  phrase end of Bach's 2,277, the context is how the melody closes, where the phrase stands, and
  the mode; Bach's cadence chords are counted per context, with examples. For Kittel's 24
  melodies, his basses' cadence chords stand beside Bach's at each phrase end.
- Level 1 on screen (D102): "Chorales" in the voices selector. Kittel's 24 melodies, with a cadence
  choice at each fermata, Compare, and playback. The data are in `data/chorales/level1.json`
  (from `cadence_plans.py`); the tests are in `test/chorale-level1.test.ts`.
- Fixed while building it: a fermata written on the second half of a tied note was lost when the
  ties were merged (Kittel No. 23's last phrase; 13 phrase ends in Bach). It now belongs to the
  note, and the counts are regenerated.
