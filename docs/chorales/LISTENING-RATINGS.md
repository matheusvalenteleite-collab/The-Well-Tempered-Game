# Could It Be Bach? The owner's blind ratings (X6)

Six held-out melodies, four versions each, shuffled: Bach's setting and the generator's at daring 0, 1 and 3
(`tools/chorales/listening_report.ts`; key and ratings in `data/chorales/generator/listening-key.json`,
`listening-ratings.json`). Rated 12 October 2026.

| version | could be Bach | something is off | not sure / unrated |
|---|---|---|---|
| Bach | 6 | 0 | 0 |
| daring 0 | 1 | 5 | 0 |
| daring 1 | 0 | 4 | 2 |
| daring 3 | 0 | 6 | 0 |

**Bach is recognised every time; the generator almost never passes, at any daring.** Daring is not what gives it
away: the owner's notes all point at the lines: "lots of mindless repetitions", "alto repeats the same note for an
incredible amount of time", "the voices don't sound interesting by themselves", and one awkward passage after a
fermata.

The notes are borne out by the numbers. Share of moves that repeat the note, in these versions:

| | alto | tenor | bass | longest run of one note (alto) |
|---|---|---|---|---|
| Bach | 18% | 18% | 4% | 5 |
| generator, daring 0 | 59% | 26% | 12% | 15 |
| generator, daring 3 | 48% | 26% | 7% | 11 |

The inner-voice search (step 4) finds the cheapest voicing chord by chord, and holding a common tone is almost
always cheapest; nothing in it costs a line for standing still or rewards it for having a shape. The harmony and
the licences are not the bottleneck: the voices as melodies are. The next step is a model of the line: Bach's
rates of repeated notes, steps and leaps, and his contours, per voice, costed in the search and calibrated on his
chorales as the other costs are, then the listening repeated.

## The line model (12 October 2026)

Two causes, both found by measuring the inner voices beat by beat on held-out melodies against Bach's own
settings of them:

1. **The harmony**: the page set each melody with the single most likely setting, and the most likely path
   collapses into tonic and dominant in turn (no. 141: twenty beats of I-V-I-V), over which the alto holds the
   common tone. The settings are now drawn (as the diverse settings are), not the argmax.
2. **The inner voices**: the move costs had been learnt only between beats with nothing sounding between, which
   leaves out every third Bach fills with a passing note and so leans towards the held note; and the cheapest path
   over-chooses the single commonest move. The moves are now learnt from every beat, and holding a note has a
   cost (`voices.ts` LINE: 1 bit for the alto where the chord changes, 2.5 and 1.5 bits for alto and tenor where
   it repeats), calibrated on the held-out melodies.

On the beats, 77 held-out melodies:

| | alto held on change | on a repeated chord | steps | leaps | longest run |
|---|---|---|---|---|---|
| Bach | 30% | 49% | 37% | 30% | 12 |
| generator before (argmax harmony, old costs) | 46% | 84% | 30% | 16% | 22 |
| generator now | 30% | 50% | 36% | 31% | 11 |

On the surface (embellishments included), the six melodies of round 2: the alto repeats its note in 33% of moves
(Bach 17%; before 59%), longest run 7 (Bach 5; before 15); what remains is in the diminution, where Bach fills
more thirds with passing notes. Round 2 of the page, new melodies: https://claude.ai/artifact/2gjUkarYtje3j17VFXNED2
(collection "listening2", key `data/chorales/generator/listening2-key.json`).

## Earned dissonance and whole lines (12 October 2026)

Round 2 (partial: 9 of 24 rated): Bach 2 "could be Bach" and 1 unsure; the generator 5 "off" and 1 unsure. The
owner on Bach: "every dissonance is earned; none of the voices sound artificial; all are fluid and natural"; on a
generated cadence to A♭: "cool, but nothing like anything written by Bach".

- **Earned dissonance.** The diminution chose its suspensions from the voice's own line, never the bass. Where
  the held note makes a fourth, seventh or ninth over the new bass Bach suspends a fifth of the time; where it
  makes a sixth or a third, 3-5%; the generator did the latter at 16-20%. The embellishments are now weighed by
  what their incidental note makes over the bass (`DiminutionModel.choices`): the consonant "suspensions" fall
  to Bach's rate (6-5: 5% against his 3%), the real ones kept. The voicings already gave as many chances to
  suspend as Bach's (15.1 per 100 inner moves against 15.9), so the voice search needs no bonus for them.
- **Whole lines.** The joint search over alto and tenor sees each move alone. Each line is now re-written as a
  whole melody against the other three voices, with its shape two moves at a time learnt from Bach
  (`voices.ts` refineLines, VoiceModel.shape): two leaps the same way fall from 33% of leap pairs to 22%
  (Bach 22%), and the judge's parallel fifths and octaves halve (0.7 to 0.3 per 100 chords on the generator's
  settings); agreement with Bach's own alto rises from 58% to 59%.
- An A/B page (`tools/chorales/pairs_report.ts`, https://claude.ai/artifact/CnmUBaKuDp7w1Kyp8CK1Px, collection
  "pairs", key in `data/chorales/generator/pairs-key.json`): eight held-out melodies, the same chords set
  twice, before and after, in random order.
