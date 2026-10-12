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
