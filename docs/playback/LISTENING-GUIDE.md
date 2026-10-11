# The chorales' listening guide (P17)

The owner: a toggle "for displaying information alongside the sheet music, describing special
moments in the piece, unexpected moments, whatever a specialist lover of that kind of music would
point out to someone listening to the piece for the first time". The owner chose both sources of notes:
notes computed from the music, plus hand-written ones. For display, the owner chose captions while
the chorale plays, which can be switched to numbered markers alone, with the full list in a tab.

## On screen (Bach's settings, level 0)

- **Guide: captions / markers / off**: a menu beside the ensemble, stored as `wtg.choraleGuide`.
- **Captions** sit above the controls while the chorale plays. Each shows the line being sung (its
  words) and the latest moment reached, which stays for two bars after its own.
- **Markers** (①, ②, …) appear over the soprano's note at each moment, before the cadence label.
- The **Guide** tab lists every moment with its bar, then the words of each line.

## The moments (`src/music/chorale-guide.ts`), read off the notes of every chorale

There are at most eight per chorale. When there are more, the most telling are kept, in this order:

1. Picardy third
2. Neapolitan
3. deceptive cadence
4. unusual resting place
5. chromatic line
6. false relation
7. diminished seventh
8. Phrygian cadence
9. chain of suspensions
10. borrowed chord
11. pedal
12. first close in the relative major
13. the melody's summit

| moment | the test |
|---|---|
| Picardy third | minor, Dorian or Phrygian chorale whose last chord holds the tonic's major third |
| deceptive, Phrygian | the study's cadence class (`data/chorales/study.json`) |
| unusual resting place | the phrase's final chord (root above the tonic, major or minor) is not one on which at least 2% of the phrases in its mode close, over the 370 chorales |
| relative major | the first phrase of a minor chorale closing (not a half close) on the major chord a minor third up |
| chromatic line | four or more notes in one voice, one direction, each a semitone from the last |
| diminished seventh | the first chord whose four pitch classes are each a minor third apart |
| Neapolitan | in the minor, a major chord on the lowered second degree, figured 6 |
| false relation | one voice's note, then the same letter altered in another voice at the next onset; neither voice moves by that chromatic step itself (the first such) |
| chain of suspensions | three suspensions within a whole note's span |
| pedal | the bass on one pitch, held or struck again, for at least three quarters under three or more chords |
| borrowed chord | in the major, the first minor iv or major ♭VI |
| summit | the soprano's highest note, when it is sung only once |

Totals over the 370 chorales:

| moment | count |
|---|---|
| false relation | 113 |
| diminished seventh | 182 |
| Picardy third | 139 |
| chromatic line | 138 |
| relative major | 122 |
| summit | 145 |
| suspensions | 89 |
| Phrygian cadence | 68 |
| deceptive cadence | 63 |
| unusual resting place | 43 |
| pedal | 26 |
| Neapolitan | 10 |
| borrowed chord | 4 |

In all, 1,142 moments. 23 chorales show none; their tab says so and points to the lines.

The sentences are in `src/content/en.json` under `listen`. They say what happens and what to listen
for, never what Bach meant. One cites a source: Christoph Bernhard named a chromatic line
*passus duriusculus* in his *Tractatus compositionis augmentatus* (c. 1657). The chapter is
unchecked.

**Words**: the line sung at each phrase start, taken from the Chorale-Corpus edition (CC BY-NC-SA 4.0)
and added to `data/playback/chorale-fermatas.json` as `line` by `tools/playback/chorale_texts.py`.
Where several stanza lines are given, the first is used.

## Not yet

- The hand-written notes for a curated set of chorales, each resting on a commentary that has
  actually been read.
- Captions on the other chorale screens (the workbench, the diminution).
