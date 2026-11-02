# The expert audit of the fugue entries (D493)

The owner: "check your understanding of the fugue entries, and how to individuate the subjects, of all the 48
fugues … I don't want you to figure these things out by yourself. We have a lot of knowledge acquired from
experts. Let's simply believe that they are right."

The game's entries are now the published analyses' entries. The table is `data/wtc/expert-entries.txt`: every
entry, by bar and voice, with its form and the sources that name it. `tools/touch/expert.ts` places each one in
the notes and `tools/touch/extract.ts` builds `data/touch/pieces.json` from it. The placed entries, with their
sources, notes, keys and fit, are in `docs/wtc/entries/expert-entries.json`. The numbers below come from
`python3 tools/touch/expert_audit.py OLD.json`, where OLD.json is the base's `pieces.json` (WTC 2.27, 381019e).

## Sources

| Key | Source | Covers | How it was used |
|---|---|---|---|
| P | Ebenezer Prout, *Analysis of J. S. Bach's Forty-Eight Fugues*, ed. Louis B. Prout (Ashdown, 1910), archive.org `analysisofjsbach00prouuoft` | all 48 | Prose: it names entries by bar and voice, and says which are inverted, augmented, incomplete or altered. It explains which passages are episodes made from the subject's head. |
| I | Frederick Iliffe, *The Forty-Eight Preludes and Fugues … Analysed for the Use of Students* (Novello, 1897), archive.org `fortyeightprelud00ilifuoft` | all 48 | A bar-by-bar table of every entry: voice, key, and form (inversion, augmentation, diminution, fragment, altered). It was read from the OCR with word positions. Where the OCR lost the table (II/3), it was read from the page image. |
| B | Busoni's edition (Schirmer, 1894), our transcriptions in `docs/wtc/readings/busoni/` | about 20 fugues carry entry labels | His S A T B labels, the turned letters for inversion, V (variation), D (diminution), augmentation brackets, "Contrasubject I/II" (I/4) and the "subject 3" brackets (II/14). |
| L | Ledbetter, *Bach's Well-tempered Clavier* (Yale, 2002): `data/wtc/ledbetter-claims.txt`, `later-subjects.json` | sparse | His strettos, variant entries, and where later subjects enter. |
| G | the game's own entry | | Kept only where no source names it and none denies it. This applies to 18 later-subject statements in I/4, II/4, II/14 and II/23, and to one subject entry: I/22 b. 61, the owner's report in D308. |

The sources I could not reach:
- **Siglind Bruhn's** analyses are no longer freely online. Her book is on archive.org only for loan (access-restricted), so I did not use it.
- **Keller's** book and **Tovey's** Associated Board notes are not freely available.
- **Prout's *Fugal Analysis*** (1892) contains only one fugue from the 48 (II/20). In its preface Prout defers to complete analyses of the 48.
- Riemann's *Analysis* (Augener) was downloaded but not needed: P and I cover every fugue entry by entry.

**Every fugue is covered by P and I.** No fugue was left on the game's data alone.

## Rules followed

- An entry is in the table when a source names it. A source's form is believed: answer, inverted, augmented,
  diminished, partial (only the head, a fragment, incomplete), modified (altered, varied, first note changed),
  and which subject (1, 2, 3).
- A game entry was dropped only where the sources deny it. That means one of two things: I's table, which lists
  every entry, has nothing there, or P or I calls the passage an episode made from the subject.
- Where the sources disagree, the more detailed one was followed, and the disagreement is listed below and in the
  table's `%` lines. Usually the more detailed source is I, because its table gives voice and bar for every entry.
- The notes decide only where the entry starts within the bar a source gives. They also decide the voice where the
  parts cross in the game's encoding, so that a source's voice is a different line in the game (I/4 bb. 94-97,
  I/22 bb. 37 and 46). One form was settled by the notes against a source: II/3 b. 9, where I writes "Answer in
  Treble" but the notes are the inversion.
- A partial or modified entry is still an entry, and it gets its flag.

## What changed

| | Count |
|---|---|
| Entries before | 854 |
| Entries now | 877 |
| Added (named by the sources, missing in the game) | 74 |
| Removed (the game's, which the sources deny) | 51 |
| Inversions newly marked | 15 |
| Augmentations newly marked | 2 (II/3: alto b. 25, bass b. 27) |
| Diminutions newly marked | 7 (II/3: six; II/9: the treble's inverted diminution, b. 35) |
| Entries now numbered SUBJECT 1 in the five fugues of several subjects (before: plain SUBJECT) | 82 |
| Entries the sources call partial (all flagged) | 60 |
| Entries the sources call modified or altered (all flagged) | 57 |

The game never lacked the inversions and augmentations of I/8, I/6, I/14, I/15, I/20, I/23 or II/22: it already
marked them all. The newly marked inversions are I/8 b. 39 (bass) and b. 47 (treble), II/2's four, II/3's six,
II/4 b. 53, II/9 b. 35 and I/4's tenor at b. 41 (subject 2).

### The biggest changes

- **I/4** (+19, −9). The second and third subjects' statements now follow I's table: five more for subject 2,
  including the tenor's inversion at b. 41, and nine more for subject 3. Subject 2 now begins on its upbeat at
  b. 35. The coda's subject in F sharp minor (b. 112, P and B) was added. Five game entries no source names were
  dropped. The stretto of bb. 94-97 was re-placed (the parts cross).
- **II/3** (+13, −1). Following I's table: the diminutions (bb. 5, 6, 18-19), the inverted diminutions, and the two
  augmentations (bb. 25, 27). Also inversions at bb. 15 and 28, and the varied entries of bb. 29-30.
- **I/3** (−6). P and I hear bb. 22-23 and 35-40 as episodes on the subject's first bar, not entries.
- **I/8** (+5, −1). The bass's inverted answer at b. 39 (Busoni's turned B), the treble's inverted fragment at
  b. 47, the altered alto entries at bb. 24 and 77, and the treble's altered entry at b. 43.
- **II/2** (+5). The tenor's free inversion (b. 15), the treble's inversion (b. 19, I), the bass's inverted answer
  (b. 21), the bass's modified inversion (b. 26), and the treble's varied entry (b. 8).
- **II/6, II/9, II/15, II/21** (−4 each) and **II/19** (−3). Entries inside the sources' episodes were dropped.
  In II/9 these were diminutions that neither Busoni nor I names.
- **I/5** (+3, −4). The bass heads of bb. 10-11 (P), the four voices' heads at b. 20 (P, I) and the bass's
  incomplete answer at b. 13 (I) were added. Bb. 22-25 are "built on repetitions of the first figure" (P), so those
  entries were dropped.

### Per fugue

| Fugue | Before | Now | Added | Removed | New inv. | New aug. | New dim. | Partial | Modified | Subjects | Sources |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I/1 | 24 | 26 | 2 | 0 | 0 | 0 | 0 | 4 | 1 | 1 | P I B L |
| I/2 | 8 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| I/3 | 18 | 12 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| I/4 | 69 | 79 | 19 | 9 | 1 | 0 | 0 | 0 | 4 | 1-3 | P I B L |
| I/5 | 19 | 18 | 3 | 4 | 0 | 0 | 0 | 7 | 0 | 1 | P I |
| I/6 | 16 | 17 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | P I B |
| I/7 | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | P I L |
| I/8 | 33 | 37 | 5 | 1 | 2 | 0 | 0 | 9 | 3 | 1 | P I B L |
| I/9 | 12 | 13 | 1 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | P I L |
| I/10 | 9 | 10 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 1 | P I L |
| I/11 | 13 | 15 | 2 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | P I L |
| I/12 | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| I/13 | 8 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I L |
| I/14 | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | P I B L |
| I/15 | 17 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | P I L |
| I/16 | 16 | 17 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| I/17 | 15 | 18 | 3 | 0 | 0 | 0 | 0 | 2 | 2 | 1 | P I B L |
| I/18 | 14 | 12 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| I/19 | 17 | 15 | 0 | 2 | 0 | 0 | 0 | 1 | 7 | 1 | P I B L |
| I/20 | 39 | 38 | 0 | 1 | 0 | 0 | 0 | 10 | 0 | 1 | P I B L |
| I/21 | 8 | 9 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I L |
| I/22 | 24 | 25 | 2 | 1 | 0 | 0 | 0 | 4 | 1 | 1 | P I B L |
| I/23 | 12 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| I/24 | 19 | 20 | 1 | 0 | 0 | 0 | 0 | 6 | 0 | 1 | P I B L |
| II/1 | 11 | 11 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | P I B |
| II/2 | 20 | 25 | 5 | 0 | 4 | 0 | 0 | 0 | 2 | 1 | P I B L |
| II/3 | 26 | 38 | 13 | 1 | 6 | 2 | 6 | 0 | 3 | 1 | P I B |
| II/4 | 24 | 24 | 1 | 1 | 1 | 0 | 0 | 0 | 2 | 1-2 | P I L |
| II/5 | 23 | 25 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 1 | P I B L |
| II/6 | 18 | 14 | 0 | 4 | 0 | 0 | 0 | 4 | 0 | 1 | P I B L |
| II/7 | 11 | 12 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | P I B L |
| II/8 | 16 | 17 | 1 | 0 | 0 | 0 | 0 | 1 | 4 | 1 | P I B L |
| II/9 | 34 | 31 | 1 | 4 | 1 | 0 | 1 | 0 | 5 | 1 | P I B L |
| II/10 | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| II/11 | 8 | 8 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | P I L |
| II/12 | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| II/13 | 11 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| II/14 | 32 | 34 | 4 | 2 | 0 | 0 | 0 | 0 | 2 | 1-3 | P I B L |
| II/15 | 10 | 6 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| II/16 | 16 | 18 | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | P I B |
| II/17 | 16 | 15 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | P I B L |
| II/18 | 21 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1-2 | P I L |
| II/19 | 13 | 10 | 0 | 3 | 0 | 0 | 0 | 0 | 3 | 1 | P I L |
| II/20 | 8 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | P I L |
| II/21 | 14 | 10 | 0 | 4 | 0 | 0 | 0 | 0 | 1 | 1 | P I B L |
| II/22 | 24 | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | P I B L |
| II/23 | 30 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1-2 | P I B L |
| II/24 | 12 | 13 | 1 | 0 | 0 | 0 | 0 | 2 | 1 | 1 | P I L |

"Partial" and "Modified" count the entries the sources describe so. They are flagged like any other entry.
"Subjects 1-3" marks a fugue of several subjects: every flag in it is numbered.

## Several subjects

The flags read SUBJECT 1, 2, 3 in five fugues: I/4 (three), II/4 (two), II/14 (three), II/18 (two) and II/23 (two).
In each case Busoni or Ledbetter reads the later themes as subjects, and the owner names I/4 a fugue of three
subjects. Prout and Iliffe call them countersubjects or counterpoints; that disagreement is listed below. II/9
keeps one subject: Busoni and Iliffe label the entries of bb. 16-20 as the subject's, against Ledbetter's "two new
subjects".

## Where the sources disagree

- **I/1**: b. 20 bass: only I names the incomplete bass entry; P names the treble and tenor only.
- **I/3**: bb. 22-23 and 35-40: P and I read the subject's first bar treated in sequence (episodes IV and V), not entries; the game had flagged six. B prints "marcato" on the bass at b. 39 (its gloss: the subject brought out): followed P and I, the more detailed.
- **I/4**: Three subjects: B (his "Contrasubject I, II", "three subjects labelled throughout"), L and the game read a triple fugue; P ("a fugue with two countersubjects") and I (countersubjects I and II) read one subject with two countersubjects. Followed B and L (the owner's reading too): SUBJECT 1, 2, 3, the statements as P and I place the countersubjects.
- **I/4**: b. 49, the third subject's first statement: alto (P, the game), tenor (I), second soprano (B's label).
- **I/4**: b. 51: tenor (P, B's label), bass (I). bb. 60-74: I gives several third-subject statements to the other inner voice (alto for tenor); the game's voices kept. I's third-subject statements at bb. 92 (first soprano) and 103 (alto) are not in those voices' notes: left out.
- **I/4**: Dropped (no source; I's table lists every voice): the game's bb. 34 bass, 44 first soprano, 70 first soprano, 72 second soprano, 101 first soprano.
- **I/5**: b. 13: P names the treble's answer, I the bass's incomplete answer (and not the treble): both kept.
- **I/5**: bb. 22-25: P ("the complete subject is never heard after bar 15 ... bars 23, 24 are built on repetitions of the first figure") and I ("coda founded on figures of the Subject"): the game's four entries there dropped.
- **I/8**: b. 49, alto: the game's entry; no source names it (I lists every entry of bb. 47-52): dropped.
- **I/8**: b. 80, alto: only B labels it.
- **I/13**: bb. 30-31: I hears "imitations of the Subject" in the treble and alto, which P does not name: not taken as entries.
- **I/18**: Dropped: the tenor's head at b. 24 (D242) and the alto's inversion at b. 33 (the game's): P and I list every entry (P: entries at bb. 11, 15, 17, 19, 24, 26, 32, 37) and name neither.
- **I/19**: b. 25: P's treble (tonal answer), I's alto; the game's two lines there (the finder's and D242's) were one entry.
- **I/19**: b. 21, alto: the game's; P ("it is only necessary to indicate the various entries") and I name none there (B's transcription glosses a "non cresc." there as the alto's entry): dropped.
- **I/20**: b. 53: P hears the inverse form (alto and bass), I the direct (bass and treble); the notes have the inverse in the bass and treble: kept so. bb. 73-76: inverted (I); P does not say.
- **I/20**: Not taken: the closing section's imitations at bb. 45-46 (tenor, alto: the subject's second part, P and I), and the coda's inverted bass and tenor over the pedal (P), which do not lie in the game's voices as P puts them.
- **I/20**: b. 32, soprano: the game's; P and I name the alto and bass only there: dropped.
- **I/22**: b. 36, tenor: the game's; P lists the group of bb. 25-39 as five entries (first and second treble, tenor, bass, alto) and I the same: dropped. bb. 46-50: P and I give whole answers; the notes go their own way after six or seven (D242): marked partial. b. 61: the game keeps the owner's entry (D308), which no source names. b. 73: P's other "abortive" answers (bb. 73-74; I: "reminiscence of the first limb of Answer in Alto", b. 74) are not in the game's voices as named: not placed.
- **I/24**: I points out three-note fragments of the subject in the episodes (alto b. 19, tenor b. 28): not taken as entries.
- **II/2**: b. 7: P (and the notes) give the answer to the tenor, I to the bass; the bass enters only at b. 19 (P).
- **II/3**: b. 3, bass (an inversion, the game's): not in I's table, which lists every entry: dropped.
- **II/4**: Two subjects: L (and the game) read a double fugue, the second subject from b. 35; P and I a single subject (P: the treble's theme of bb. 35-36, combined with the subject in double counterpoint at the twelfth).
- **II/4**: b. 51, bass: the game's; P and I put the varied inversion of this passage in the alto at b. 53: replaced.
- **II/6**: Dropped: the treble's inversion at b. 5 (P: the codetta "made from the inversion of the first half bar of the subject"), the treble's inversion at b. 10 and the treble and bass at b. 21 (episode III, bb. 19-24, P and I).
- **II/6**: b. 18: the answering voice is the treble (I) or the alto (P).
- **II/9**: One subject: B and I label the entries of bb. 16-20 as the subject's (alto, soprano, bass, tenor); L reads "two new subjects in double counterpoint, bb. 16-22" there. Followed B and I.
- **II/9**: Dropped (the game's diminutions which neither B nor I names): bass b. 23, soprano b. 25, alto b. 28, soprano b. 39.
- **II/10**: I also notes the subject's last fragment in the bass (b. 70) and, inverted, in the treble (b. 71): tails, not taken.
- **II/11**: b. 91, bass: the game's second bass entry two bars after b. 89; I and L name only b. 89: dropped.
- **II/11**: b. 21: I counts the bass's answer; L calls it a false entry: kept.
- **II/14**: Three subjects: B (his "subject 3" brackets) and L read a triple fugue; P ("sometimes described as a triple fugue, but this is not strictly accurate": two counterpoints introduced later, bb. 20 and 36) and I (who counts them as episodes) one subject. Followed B and L.
- **II/14**: Dropped: the alto at b. 17 and the bass at b. 30 (P: "only two voices participate" in the counter-exposition; the bass of b. 30 is the second theme, P).
- **II/15**: bb. 23-31: P ("two episodes (bars 23 to 33 ...) ... only one middle entry of the subject, namely, in the bass from bar 33") and I: the game's four entries there (bass bb. 23, 27, 31, soprano b. 25) dropped.
- **II/17**: b. 5, alto (a seven-note answer, the game's): I's codetta, bb. 5-6: dropped.
- **II/18**: Two subjects: L and the game read a double fugue (the second subject's own exposition, bb. 61-83); I a single subject whose countersubject is first given alone ("Theme absent. Counter-subject in Treble"). Followed L.
- **II/19**: bb. 24-26: the game's three entries (alto b. 24, soprano bb. 25, 26) lie in I's episode IV (bb. 25-27): dropped.
- **II/21**: Dropped (the game's, inside I's episodes II, VI and the coda): soprano b. 25, bass b. 27, alto b. 62, soprano b. 85.
- **II/23**: Two subjects: L and the game read the theme of b. 28 as a second subject; I ("Counter-subject II") and B ("the new countersubject") as a countersubject. Followed L.

## Not placed

Every entry in the table was placed in the notes; `unplaced` is empty for all 48. Four kinds of passage the
sources mention were not entered. Each is recorded in its fugue's `%` lines:
- I/20: the coda's inverted bass and tenor over the pedal, which do not lie in the game's voices as P names them.
- I/22: the "abortive" answers of bb. 73-74, for the same reason.
- I/20 bb. 45-46 and II/10 bb. 70-71: fragments of the subject's tail only.
- I/13 bb. 30-31 and I/24 bb. 19 and 28: what Iliffe calls "imitations" and three-note fragments.

## What follows the data

Everything that reads `f.entries` takes the new entries with no code change:
- the flags, the pinned tag (D466) and the travellers (D465);
- OBBLIGATO's windows (D485);
- the stage backgrounds (D464);
- the ABOUT THIS FUGUE box, which now also counts diminished entries;
- the sections;
- the colour plans, regenerated. A plan moment written against an entry that is now gone (I/3 b. 35) keeps its
  bar.

The tests that encoded the old entries were brought to the experts' entries:
- I/1 has 26 entries and 16 in stretto.
- I/4's subject 2 enters at b. 35.
- II/9 has seven diminutions.
- II/4's varied inversion is at b. 53 in the alto.
- I/4's first soprano has three statements of subject 3.

## The flags

`box-fx.ts formText` draws the label in the entry's form, wherever an entry's label is drawn: the D466 pinned tag
(kept as the owner chose it), the tabs, the bracket and rail words, and the old flag.
- **Inverted:** the label is turned through 180°.
- **Augmented:** the label is twice as wide, at the entry's longer length.
- **Diminished:** the letters are drawn without the gap between them, so the label is three quarters as wide.

The word is SUBJECT, or SUBJECT 1, 2, 3 in a fugue of several subjects, translated (SUJEITO 1, SUJETO 1).
Screenshots are in `docs/wtc/entries/shots/`, made by `node tools/pictures/flag-shots.cjs`, at two phone widths
(200 and 300 box pixels): I/8 (the inverted stretto, the augmentations), I/4 (SUBJECT 1, 2, 3), II/9 (the
diminutions), II/22 (the inverted strettos) and II/3.
