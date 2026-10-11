# Bach's licences, X3 round 2: the owner's ratings of the 34 examples

The owner rated the 34 examples of the licence catalogue (`docs/chorales/LICENCES.md`) on the page "Bach's
Licences", 11 October 2026. The question: *immediately special*, or *beautiful in an ordinary way*. The ratings,
flags and note are in `data/chorales/generator/licences-ratings.json`. As in the first round, they are first
impressions.

| category | special | ordinary | flagged as a wrong reading |
|---|---|---|---|
| Chromatic bass lines | 4 | 0 | 0 |
| Diminished sevenths of distant keys | 5 | 1 | 0 |
| Mixture | 3 | 1 | 0 |
| The flat second | 2 | 0 | 2 |
| Remote cadences | 1 | 3 | 0 |
| Dissonant sonorities found once | 1 | 4 | 0 |
| Inner voices (the calibrated costs) | 0 | 4 | 0 |
| Two incidental dissonances at once | 0 | 4 | 0 |
| **all** | **16** | **17** | **2** |

## What the ratings say

- **Chromaticism is the licence.** Every chromatic bass line (nos. 310, 67, 360, 142), five of six remote
  diminished sevenths (no. 295 bar 5, the owner's own find, among them), three of four mixture chords and both
  well-read flat seconds are special. What they share is a chromatic note outside the key, mostly reached by
  step. The owner's note on no. 67: chromatic lines are one of Bach's special tools, and Bach may need to be
  thought of motivically and imitatively too, not only chord by chord.
- **Remote cadences are mostly ordinary** (only no. 216, *Es ist genug*, on G♯ with a seventh, again special).
  The others are modal chorales or minor dominants, which the major/minor reading makes remote and the ear does
  not. No. 200's ♭III/v cadence, beautiful in round 1, is ordinary here: first impressions, as said.
- **Incidental dissonance is not a licence.** All four double dissonances and four of five sonorities found
  only once are ordinary; the exception is no. 3 bar 2, a minor ninth chord over the second degree in a Dorian
  chorale (again chromatic). Rarity of a sonority, counted exactly, mostly measures how fine the count is.
- **Inner voices: no licences**, now that the voice costs are calibrated: their surprise is gone and what is
  left is ordinary, as the first round found.

## The two flags (the readings were wrong)

- **No. 132 bar 23** (*Kyrie! Gott Vater*, A minor): read as ♭II (B♭ with a major seventh) in A minor. The
  phrase before has just cadenced on D minor, so the chord is VI7 of D minor, a plain chord of the local key.
- **No. 205 bar 7** (*Herr Gott, dich loben wir*, E Phrygian): the F major chord is ♭II only against a minor
  key; in the Phrygian mode it is the second degree, diatonic.

Both are the global key read where the local key (or the mode) governs. The flat second's count (57, 75% in
modal chorales) is inflated by exactly this: the category must be read against the local key and leave the
Phrygian second out. The same correction applies to the remote cadences in modal chorales.

## Consequences

- For X4: the catalogue narrows to the chromatic licences (chromatic bass lines; diminished sevenths of
  distant keys; mixture; the flat second as a Neapolitan, in the local key and not in Phrygian; the rare
  remote cadence of the *Es ist genug* kind). Double dissonances and once-found sonorities leave it.
- For the models: a local key (tonicisations) is now the most needed refinement; without it the generator
  can neither recognise these licences' occasions nor use them where they belong.
- For X5 ("daring"): the control should raise the chromatic options at their occasions (a semitone step in
  the bass, a borrowed or applied chord on a melody note that allows it), not the rare in general.
- The owner's note (motive and imitation) points beyond the chord: chromatic lines as lines, and imitation
  between the voices, are a level the models do not have; it is also where the chorales meet the fugue
  (Phase B).
