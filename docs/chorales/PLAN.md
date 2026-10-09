# The chorale library: plan

Owner's brief: a Bach Chorales mode, built on chorale harmonization in the figured-bass tradition.
For now, no generator. First an intelligent, well-parsed, informative library of the material, so
that the principles, patterns and habits are known before anything is generated. **Bach is the
last word** (D98).

## Sources

| corpus | what it is | form | status |
|---|---|---|---|
| **Bach, 371 chorales** | The four-part chorales collected by C. P. E. Bach and Kirnberger (Breitkopf 1784-87), in the Breitkopf numbering. Sapp's edition is checked against Dörffel's 4th edition (c. 1875). No. 150 is not four-part and is absent, so there are 370 files. | Humdrum `**kern`, CC BY-NC-SA 4.0 | vendored, parsed, validated |
| **Kittel, 24 chorales** | J. C. Kittel, *Vierundzwanzig Choräle mit acht verschiedenen Bässen über eine Melodie* (Offenbach: André, 1811; ed. Rinck). Each melody has 8 figured basses (Nos. 23-24 have 9): 194 basses. | engraved PDF (Dorico), read from its vector glyphs | extracted, first pass, checked by machine, not yet proofread |

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
3. **Finish Kittel**:
   - Resolve the 48 extraction issues.
   - Go through the cross-check list and sort it into three kinds: real non-chord tones, gaps
     in the check's reading of the figures, and extraction errors.
   - Produce a proof sheet per chorale (the PDF next to a re-engraving of the data) for the
     owner to look at.
   - Add the bar numbers and the repeat and section structure.
4. **Kittel-Bach concordance**: which of Kittel's 24 melodies Bach set among the 371, and in
   which keys.
5. **Analysis layer** over Bach first, then over Kittel's basses, with figures derived for Bach.
6. **Knowledge write-up** (`docs/chorales/`): principles and habits with counts and examples,
   for the owner to read and correct before any of it becomes a game rule.

## Open questions for the owner

- **Licence.** Sapp's Bach encoding is non-commercial and share-alike. That is fine for a free
  game, but the chorale data could not go into a commercial product without being re-encoded.
- **Repeats.** Should analysis count a repeated *Stollen* once (as written) or twice (as sung)?
  The library keeps both orders.
- **Modes.** The library keeps Sapp's modal labels (dorian, mixolydian, phrygian). Should the
  analysis read such chorales modally, or tonally in the key of their cadences?
