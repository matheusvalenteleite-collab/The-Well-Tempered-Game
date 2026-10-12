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

## Lines with direction, a voice that leads, the bench (12 October 2026)

The owner on the A/B page: the inner voices "quite poor in conception and independence... would you sing these
lines?" Beat by beat the generator already matched Bach (held notes, steps, leaps, motion against the outer
voices); over several beats it did not: Bach's inner voices run three or more steps one way twice as often, his
alto and tenor move against each other twice as often, his alto rises with the melody's climax, and his movement
stays with one voice for a passage (MOTIVES.md). Four changes, each calibrated on held-out melodies against Bach's
settings of them (`voices.ts` VOICING; `diminution.ts` LEADER, STAY, RESTRAINT):

| | Bach | before | now |
|---|---|---|---|
| moves inside runs of 3+ steps one way | 4.7% | 2.5% | 4.8% |
| alto and tenor in contrary motion | 15% | 8% | 16% |
| alto's high point with the soprano's (of 60) | 26 | 17 | 22 |
| bars where one lower voice moves alone, a chorale | 0.55 | 0.38 | 0.53 |
| the next such bar the same voice's | 74% | 56% | 79% |

1. **A longer line memory**: each line re-written with Bach's shapes over three moves, exactly (the search
   remembers three notes), and a reward for a step continuing a step (2.5 bits).
2. **Alto against tenor**: a reward for contrary motion (1.3 bits). (Costing their motion by its frequency in
   Bach made contrary motion rarer: the cheapest path then avoids the rarer option. Every rate here had to be
   brought to Bach's by a calibrated bias, not by a cost from his frequencies.)
3. **The alto's contour**: a reward for height within two beats of the soprano's high point (4 bits an octave).
4. **One voice leads**: in the diminution each phrase has a leading voice (drawn: bass about half the time), its
   embellishments made likelier and the others' less; the lead stays from one phrase to the next three times in
   four; the restraint on passing notes recalibrated (alto 1.5, tenor 1.6, bass 3.8 bits) for Bach's density.

What it costs: chords without their fifth 2.1 per 100 (from 1.2; the search on Bach's own chorales 2.3), unusual
doublings 1.0 (from 0.6), and agreement with Bach's own voicings down a point or two (alto 59%, tenor 55%).

**The bench.** The playback session now runs the listening room where the owner judges all generated music
blind against Bach; the owner approved putting the chorales there and retiring this session's own pages
("Could It Be Bach?", "Which Is Better?"). `tools/chorales/bench_report.ts` writes
`data/playback/bench/gen-chorale-<no>-v1.json`: eight held-out melodies Bach set (four major, four minor), each
to be heard beside his own setting.

## Bach's surface: figures, not embellishments (12 October 2026)

The owner, hearing the voices alone on the bench: "your generations are of a much lesser quality than Bach's
chorales". The playback session measured why: the generated lower voices were block crotchets (short notes 11-14%
of their notes against Bach's 34-54%). The cause was mine: the diminution (diminution.ts) knows five dissonant
kinds, one per note, and was calibrated against Bach's embellishments as the game's reduction reads them; but
most of Bach's quavers are not embellishments. Of his short notes, the incidental ones (passing, neighbour,
suspension...) are a third in the inner voices and a fifth in the bass; the rest are chord tones: a voice moving
within the chord, the bass's octaves, thirds and walking, a harmony changing on the quaver.

`src/chorale/generate/figures.ts` takes Bach's surface as it is: every beat of every lower voice, from its chord
tone to the next one, is a *figure* (its notes, with their onsets and distances from the chord tone, a note held
over), counted by voice, the move to the next chord tone and the beat's length. The generator draws the figures
(as often as Bach writes them, not the commonest), each voice's whole line at once (looking ahead, so that no
figure is chosen that leaves no good way on), the bass first, then alto, then tenor, each against the voices
already written: parallel fifths or octaves, two dissonances struck together, a crossing.

| short notes (v2 bench pieces, against Bach's settings of the same melodies) | alto | tenor | bass |
|---|---|---|---|
| Bach | 37% | 34% | 54% |
| v1 (the old diminution) | 11% | 13% | 14% |
| v2 (figures) | 34% | 33% | 44% |

Repeated notes and leaps come within a few points of Bach's (the bass still repeats more: 10% against 4%), and
parallel fifths and octaves on the surface are at his rate (on 30 held-out chorales: 0-2 against his 3). The
bench has v2 of all fourteen pieces (`tools/chorales/bench_report.ts`).

## v3: every figure licensed (12 October 2026)

The owner on v2, after many blind tests (relayed by the playback session): "it was always obvious which
harmonisations were of your own doing and which were Bach's. the quality difference is vast ... your ALTO and TENOR
are full of wrong notes, weird counterpoint, oddities which are not earned, simply bad contrapuntal writing with
oddities that come out of the blue, less variety in movement and flow". The playback session's count, per 100 inner
notes, v2 against Bach: augmented seconds 1.1 / 0.0, dissonances unresolved 3.4 / 1.7, leapt into 4.8 / 2.0.

The cause: v2 drew Bach's figures by their frequency, but a figure is right only where its context licenses it, and
it copied his semitones into other harmonies (an A-flat where the key has G-sharp). v3 admits a figure only if a
counterpoint teacher would pass every note (`figures.ts` licensed): a chord tone; or a dissonance reached and left by
step; or a suspension prepared as a chord tone of the beat before, making a fourth, seventh or ninth over the bass,
resolved down by step; an anticipation reached by step; spelled as the key or the chord spells it (the figure keeps
Bach's shape in letters and takes this context's notes); no augmented second, fourth or fifth in a line.

On 30 held-out chorales, inner voices between Bach's outer voices, per 100 inner notes (this session's checker; Bach's
own figures are its noise floor):

| | v3 | Bach |
|---|---|---|
| augmented seconds | 0.0 | 0.0 |
| dissonances unresolved | 0.0 | 2.4 |
| dissonances leapt into | 0.0 | 1.0 |
| suspensions | 1.7 | 2.1 |
| anticipations | 1.0 | 0.7 |
| neighbour notes | 2.1 | 3.2 |
| passing notes | 8.9 | 12.2 |
| short notes (all) | 30% | 40% |

Checked by hand, every dissonance of the alto and tenor in two pieces (nos. 233 and 88): before the last two rules,
three suspensions prepared by a passing note (no. 233, t76-80, t100-104, t268-272) and a held sixth over the bass
falling to a fifth (t256); after them, every dissonance a passing note between chord tones, a neighbour returning, or
a suspension prepared on a consonance and resolved down; one doubtful passage left (no. 88, tenor t68: B-C natural-D
rising in semiquavers over E major in A minor, where Bach would more often raise the sixth). The cost: fewer passing
and neighbour notes than Bach (the lines are a little plainer than v2's). v3 of the fourteen bench pieces replaces v2.

## v4: no early resolutions (12 October 2026)

The playback session's check (tools/playback/inner_voice_check.py, early_resolution, on claude/playback-interface):
a suspension whose resolution already sounds in another upper voice while the dissonance is held, heard before it
comes. v3: 10 of 32 suspensions; Bach 4 of 67. `figures.ts` now costs a note that sounds the resolution of a note
another voice holds and steps down from (tied continuations seen through), and a held note whose resolution another
voice sounds: v4 4 of 30 (13%, Bach 6%). Still open: the inner voices are plainer than Bach's (alto 29% short notes
against 37%); the licence is not the cause (it rejects 5% of Bach's moving figures); the penalties against the other
voices and the look-ahead favour the plain note, to be measured. And the lines' direction (the owner's "static").

## v5: movement and flow (12 October 2026)

v4 was plainer than Bach (alto 29% short notes against 37%) and "static". Measured where the movement was lost:
not in the beat-level lines (their moves give the same contexts as Bach's, 30% of his figures there moving) nor in
one filter, but a little in each (the licence, the suspension's preparation, the costs against the other voices,
the look-ahead). `figures.ts` MOTION (2) favours moving figures after the licence, so that nothing unearned comes
back; SUSPEND (0.5) restores suspensions where they are earned. "Static", measured on the sounding surface: moves
inside runs of three steps or more one way, Bach 23.6%, v4 16.2% (distance travelled and pitches a phrase were his).
The line's state now holds the direction of its last step, and a figure continuing it is worth FLOW (2.5) more: a
scale passage carried across the beat.

On 30 held-out chorales, inner voices between Bach's outer voices: runs 24.2% (Bach 23.6%), short notes 41% (40%),
per 100 notes passing 11.8 (12.2), neighbours 4.4 (3.2), suspensions 1.6 (2.1), anticipations 1.0 (0.7);
augmented seconds, dissonances leapt into or unresolved 0, 0, 0.1. Checked by hand: every dissonance of the alto and
tenor of nos. 195 and 350 (36): passing notes, neighbours, anticipations reached by step, suspensions prepared and
resolved down. On the v5 bench files: no augmented second; early resolutions 4 of 31 (Bach 4 of 67). A new
imbalance: the inner lines leap less than Bach's (whole settings, alto 13% of moves against 22%).

## v6: the soprano's suspension (12 October 2026)

The playback session's check of v5: early resolutions 4 of 31, one audible in no. 105's first bar (the soprano
suspends B4 over an F-sharp chord and resolves to A-sharp; the alto had sung A-sharp under it). The cause was at the
beat level: a complete chord needs its third, which is the soprano's resolution. The line re-writing (`voices.ts`
refineLines) now costs an inner voice that sounds the resolution of the soprano's dissonance (a note not of the
chord, falling a step next), and offers it the root or the fifth instead, as Bach leaves the third out under a 4-3
in the soprano. Early resolutions 2 of 31 (Bach 4 of 67); the other measures unchanged.
