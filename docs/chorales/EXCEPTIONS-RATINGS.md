# Bach's exceptions, X3: the owner's ratings of the 54 moments

The owner rated all 54 moments of X1 (`docs/chorales/EXCEPTIONS.md`) on the rating page, 11 October 2026.
The ratings and notes are in `data/chorales/generator/exceptions-ratings.json`.

| level | beautiful | idiomatic (the model misses why) | slip | 
|---|---|---|---|
| chord | 11 | 1 | 0 |
| cadence | 6 | 4 | 0 |
| bass | 4 | 6 | 0 |
| embellishment | 2 | 8 | 0 |
| inner voices | 0 | 12 | 0 |
| **all** | **23** | **31** | **0** |

## What the ratings say

- **Where the chords surprise, it is almost always beauty** (11 of 12). The beautiful moments are
  chromatic harmony: chords borrowed from the other mode, the flat second, chromatic descents,
  diminished chords of distant keys. A model's surprise at the chord level is a good detector of
  Bach's licences.
- **Cadences, more than half** (6 of 10). The beautiful ones go somewhere remote: no. 216 (*Es ist
  genug*) to a diminished chord on ♯4, no. 200 to ♭III, no. 267 to VII, no. 113 to ♭II. The idiomatic
  ones are mostly modal chorales the model reads as major or minor (nos. 236 and 295 end on ii in a
  minor key; a Phrygian reading would expect it).
- **Bass: the chromatic basses** (♭2, ♭5, ♭1 under their chords) are beautiful; the rare positions
  (4/3, 6/4 where the model expects root position) are idiomatic.
- **Embellishment and inner voices: surprise there is the model's failing, not Bach's licence.**
  None of the twelve inner-voice moments is a licence: the voice search's costs are too steep, so
  ordinary leaps, exchanges and unisons in Bach's inner voices look improbable to it. The only
  beautiful embellishments are two suspensions in the bass at the opening of nos. 131 and 328.
- **No slips.** At these 54 places the encoding and the readings hold.

## Consequences

- For the generator's "daring" control (X5): Bach's licences live in the harmony (the chord, the
  cadence, a chromatic bass). Those are what a catalogue of licences (X4) should hold, with their
  occasions.
- For the models: the surprise at the voice and embellishment levels measures miscalibration. The
  voice search's costs are to be softened and checked (its probabilities against Bach's frequencies)
  before its surprise means anything; the anticipation's rarity is a gap in the embellishment model.
- Readings to check (X2): some chords are labelled by pitch class (no. 290's "♭ii" in E major sounds
  E♯ and G♯, which may be read better as a dominant of the second degree); the modal chorales need a
  modal reading.
- The owner's notes point beyond the list: no. 295, a dissonant chord in the first bar of the excerpt
  (bar 5, beat 4) that X1 did not select; no. 200, a question about the Neapolitan (see the reply in
  the session: no. 200's cadence is on E♭ major, ♭III in C, borrowed from C minor; no. 113's, on ♭II,
  is the Neapolitan's chord, here as a Phrygian goal rather than a predominant). A level for
  dissonant sonorities on the beat (appoggiatura chords, accented passing chords) is a candidate for
  X1's next round.
