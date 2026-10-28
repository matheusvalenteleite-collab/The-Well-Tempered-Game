# The friends' readings (D344)

play.html for the friends (not unlocked; `src/bench/unlock.ts`) shows one reading a fugue in HEAR THE
SUBJECT, and the game asks and scores that same reading (`src/touch/readings.ts` `BEST_READING`). The
unlocked page keeps NONE, KELLER, BODKY and RIEMANN to choose from, as before (D325).

**How the choice was made.** Only among the readings in `data/touch/readings.json` (taken from each
author's own words, D272), on three grounds:

1. Fidelity to the subject's character and to Baroque articulation practice (seconds joined, leaps set
   apart; the autograph's slurs; the dance's upbeats).
2. Playability with two thumbs at the game's tempo (`src/touch/tempi.ts`): a staccato (·) has to be
   let go within three fifths of the note, so a dot on a semiquaver of under about 200 ms is hard. An
   accent (>) asks for the note before to be lifted (D338), so it can't fall inside a legato, and a
   row of accents can't be played.
3. Few marks for a newcomer: at a similar fidelity, the reading with fewer judged marks (or one rule
   kept throughout) wins.

NONE is chosen where no reading meets all three. "Judged" counts the reading's marks on the subject's
first entry that the game checks (joins, detached notes, dots, accents).

| Piece | Reading | Why |
|---|---|---|
| I/1 C major | KELLER | Seconds linked and fourths and fifths set apart (Bodky's rule is the same); slow and easy. Riemann's dots on the opening contradict his own call for continuity. |
| I/2 C minor | BODKY | Mordent figures legato, quavers non-legato, the tail legato: the subject's two characters with no accents or dots. Keller asks for eight accents and Riemann for dots on 214 ms semiquavers. |
| I/3 C♯ major | BODKY | A short rule ("The first note staccato; the next five notes slurred; … all the other notes staccato"). The dots fall on 361 ms quavers, which can be played. Keller's version is close but less regular. |
| I/4 C♯ minor | BODKY | Molto legato on the five-note stile antico subject (4 joins). Riemann's dots on minims don't suit the ricercar. |
| I/5 D major | BODKY | Marcato e quasi legato: the run joined and the dotted notes apart, as a French overture. Riemann adds two dots and an accent on the quick notes. |
| I/6 D minor | BODKY | Legato, with the autograph's dash on B♭ as portato. Keller's accented legato (five accents in a row) can't be played under the accent rule, and Riemann starts with dots. |
| I/7 E♭ major | KELLER | Only the quavers after each figure are separated (6 judged), light and capricious. Bodky has dots on 190 ms semiquavers. |
| I/8 D♯ minor | KELLER | One light separation at the syncopation, and the vocal line otherwise left alone (1 mark). Bodky's portato rule gives 12 marks for no clearer gain. |
| I/9 E major | RIEMANN | The opening joined and the run left free (5 judged, one accent on the first note). Bodky's sixteen detached semiquavers are too much for a first go. |
| I/10 E minor | BODKY | One idea throughout, every semiquaver leggiero (detached): the harpsichord's two-part toccata. Riemann puts dots on 181 ms semiquavers and adds accents. |
| I/11 F major | BODKY | Passepied articulation: the upbeat portato, two quavers slurred, the third staccato (395 ms), the rest legato. Clear and danceable. |
| I/12 F minor | KELLER | A continual legato for the chromatic subject ("inner cohesion of thought"); Bodky says molto legato, the same. Long notes, easy. |
| I/13 F♯ major | BODKY | Legato with the wave figure slurred: gentle, nothing to detach. Keller's broken slurs are fussier, and Riemann marks only one accent. |
| I/14 F♯ minor | BODKY | Legato for a pensive, chromatic subject. Riemann's only marks are two detached notes at the start. |
| I/15 G major | KELLER | Two separations only. Keller rejects Czerny's slurs as "false to Bach's style" and asks for sharp articulation through tempo. Bodky marks 26 notes, 7 of them with dots. |
| I/16 G minor | BODKY | Two quavers legato, crotchets tenuto, semiquavers leggiero (6 judged): energetic and short. Riemann's 8 marks include an accent, which asks for a lift before it (D338). |
| I/17 A♭ major | KELLER | Continuous legato and no upbeat caesura ("would destroy its peace"); Bodky's marks are identical. |
| I/18 G♯ minor | KELLER | Legato, except that the repeated quavers are lightly separated, which a repeated note needs anyway. Riemann adds dots at the end. |
| I/19 A major | BODKY | Dolce e molto espressivo: molto legato with one comma (Keller's, cited by Bodky). Riemann's two accents mark feminine endings that a lift would break. |
| I/20 A minor | NONE | Bodky marks 29 of 31 notes with mixed slurs, dots and strokes. Riemann has four accents and dots, and the data sum up his view of the fugue as somewhat colourless. Both are too much for a long, four-voice fugue, so the touch is left to the player. |
| I/21 B♭ major | KELLER | Czerny's articulation as Keller gives it: four staccato crotchets (380 ms), then free (5 judged), scherzando. Bodky marks 40 of 41 notes and Riemann 31 marks with four accents. |
| I/22 B♭ minor | BODKY | The first two notes molto tenuto, the rest ben legato: solemn and vocal. Riemann's accent on the first minim adds little. |
| I/23 B major | BODKY | Legato with a slight tenuto at the end. Riemann marks only two notes. |
| I/24 B minor | KELLER | The autograph's sigh slurs in pairs, the resolution shorter (dots on 698 ms notes, easy): 12 judged. Bodky slurs the same pairs but marks all 20 notes. |

Counts of judged marks and note lengths are from the readings data and the game's tempi. Any words
quoted above are the authors' as `readings.json` holds them.
