# The WTC preludes in the main game: the per-piece plan, Book I 1–12 (D880–D885)

**Ruled** (the board, for the owner, D881–D885): I/1 the RH figure, the one named exception to the dull-lines rule; I/2 held back; I/5 the RH at the slow tempo; I/4 soprano and bass only; the re-import of I/7, I/9 and I/12 done (D881), with I/8 and I/10's melody split from the right hand. The plan as data: src/touch/prelude-plan.ts.

Written for the owner's approval. Measured by `tools/wtc/prelude-measure.ts` on the game's notes
(the OpenWTC edition, CC0, data/wtc/preludes.json) and, where it has real voices, the Mutopia edition (data/wtc/sources/mutopia/).
Tempi are D861's. The game's ceiling is 5.5 notes a second (D312).

**The yardstick for "dull"** is the 166 WTC fugue voices:
- repeated pitches: at most 20 %;
- a bar repeating the bar before: at most 13 %;
- a bar made of its own first half twice: at most 8 %;
- notes a second: at least 0.56.

## What the sources hold

Both free editions (OpenWTC and Mutopia) and the Humdrum check engrave almost every prelude as two hands. They split
voices only where the music does.

Real voices exist in:
- I/4 (four, already in the game);
- I/7 (four, from bar 10: OpenWTC's two layers a staff, stable);
- I/9 (three: Mutopia, public domain);
- I/12 (four: Mutopia, CC BY-SA 4.0).

I/3 and I/11 are two-part: the two hands are the two voices. I/8 and I/10 are a melody over an accompaniment, and the
melody is the right hand's top line. For I/1, I/2, I/5 and I/6 (figuration) no source separates a voice, and none could:
the voices are implied by the broken chords.

So the re-import is needed for I/7, I/9 and I/12 only. Each will be read against the OpenWTC notes and the Humdrum
encoding, as for 906.

## The table

The n/s figure is the mean notes a second at the tempo, with the busiest 4 s in brackets. "Rep" is the share of repeated
pitches, "½" the share of bars made of their first half twice.

| prelude | tempo | texture | real voices | offered | excluded (why) | n/s | verdict |
|---|---|---|---|---|---|---|---|
| I/1 C | ♩ 61 | figuration (broken chords) | none separable (an implied five-part chorale) | — | — | RH 3.0 (3.75); ½ 91 % | **design decision** (below) |
| I/2 c | ♩ 83 | figuration in both hands, then Presto, Adagio, Allegro | none separable | — | — | RH 5.3 (9.5); ½ 65 % | **design decision**: over the ceiling in the Presto |
| I/3 C♯ | ♩. 61 | two-part figuration, the hands swapping the broken chords and the tune | the two hands | RH, LH | — | RH 4.1 (6.25), LH 3.7 (6.25); rep 10 %, bar-repeat 15 % | **playable**, fast: brief peaks over the ceiling, at the edge of the yardstick |
| I/4 c♯ | 𝅗𝅥. 26 | four-part arioso | 4 (in the game) | soprano, bass | alto 0.6 n/s, tenor 0.5 n/s: too sparse, as D864's 998-1 left hand (0.5); melodic, though (rep 2–6 %): owner's call | S 1.4 (2.75), B 1.1 (2.75) | **playable** |
| I/5 D | ♩ 83 | figuration over a leaping staccato bass, free coda | none separable in the RH | — | — | RH 5.35 (7.75); LH 1.5, leaps 68 % | **design decision**: the RH over the ceiling at the tempo |
| I/6 d | ♩ 55 | figuration over a walking quaver bass | RH figure; the bass | RH | LH: ½ 19 % (yardstick 8 %) | RH 5.1 (5.75) | **playable** (RH at the ceiling) |
| I/7 E♭ | ♩ 68 | **fugal**: toccata (1–9), fugato (10–24), double fugue (25–70) | 4 (OpenWTC layers, from bar 10) | all four, as a fugue (owner's rule) | — | staves 2.8 / 2.3 (9 in the toccata, one line) | **re-import**, then measured per voice; the toccata's semiquavers likely over the ceiling |
| I/8 e♭ | 𝅗𝅥 30 | a melody over arpeggiated chords | melody; chords | the melody (RH top) | LH bass: rep 24 %, bar-repeat 18 % | 1.2 (4.0) | **playable** |
| I/9 E | ♩. 64 | three-part pastorale, invention-like | 3 (Mutopia) | all three | — | S 2.2 (5.0), A 1.1 (2.5), B 1.1 (3.75); rep ≤ 1 % | **re-import**, then playable |
| I/10 e | ♩ 66 | an ornate melody over semiquaver broken chords; Presto | melody; figuration | the melody (RH top) | LH: ½ 17 % | 3.0 (4.75) | **playable** |
| I/11 F | ♩. 55 | two-part, invention-like | the two hands | RH, LH | — | RH 4.1 (5.75), LH 3.2 (5.75) | **playable** (as an invention) |
| I/12 f | ♩ 39 | four voices: a sighing soprano and alto, a tenor, a walking bass | 4 (Mutopia) | all four | — (bass 0.66 n/s, but rep 6 %, leaps 31 %) | S 1.4, A 1.1, T 1.1, B 0.66 (≤ 2.75) | **re-import**, then playable |

## The figuration preludes (I/1, I/2, I/5): a decision for the owner

No voice can be taken out of these, and the rule allows no new mode.

**I/1.** Luigi proposes the right hand's figure as the player's line: 3.0 notes a second, under the ceiling. Each half bar
repeats (91 %), which is the piece itself. The implied top voice (the highest note of each half bar) would be 0.5 notes a
second, a chorale tune in long notes, and duller still.

**I/2 and I/5.** Their right hands run over the ceiling at the D861 tempo (9.5 and 7.75 in the busiest seconds). Three
options:
- the slow tempo only (♩ 46: about 3 notes a second);
- I/5's leaping bass as the line (1.5 n/s; lively by the measures, but an accompaniment);
- leave both for a later batch.

Luigi: leave I/2 for later; offer I/5's right hand at the slow tempo.
