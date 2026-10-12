# Knowing Bach's fugues before writing them: the research plan (D160)

The owner (12 October 2026): go slowly. The fugue assistant (Compose, D158-D159) waits, kept
discreetly visible. The first step is to know and understand Bach's fugues, as the chorale session
is learning the chorales: observations counted over the corpus, each with examples to look at,
checked against the period's theory, the owner deciding which become precepts.

## 1. The corpus

| set | pieces | source | status |
|---|---|---|---|
| The Well-Tempered Clavier, I and II | 48 fugues | Humdrum (Huron 1994), `data/wtc/fugues.json` | in use since D119-D138 |
| The Art of Fugue | Contrapuncti I-XI and XIV (the unfinished fugue) | Mutopia (public domain), `data/wtc/more.json` | imported (D160); the mirror fugues (XII-XIII) not found in an open encoding; XIV tracked towards a completion (docs/wtc/XIV.md) |
| The Musical Offering | Ricercar a 3, Ricercar a 6 | Sapp's Humdrum (2024) | imported (D160); the canons left out, as the owner asked |
| Chromatic Fantasia and Fugue | the fugue, BWV 903 | Mutopia (public domain) | imported (D160) |

63 fugues. The Art of Fugue and the Musical Offering bring what the 48 have little of: one subject
treated in many ways (inversion, augmentation, diminution, stretto, combination with new subjects),
invertible counterpoint at the tenth and twelfth named in the titles (IX, X), the six-voice texture,
the stile antico (Ricercar a 6); BWV 903 a chromatic subject and the free keyboard fugue.

## 2. The steps

*Superseded as a plan by `docs/wtc/KNOWLEDGE-PLAN.md` (12 October); kept as the record of R1-R4.*

1. **Settled subjects (R1).** The subject of every fugue, its end decided by hand from the score
   (the machine's reading doubtful in 22 of the 48), its answer (real or tonal, which notes mutated),
   the codettas of the exposition. Every later count rests on this. Read by five readers on one
   protocol, checked by hand where they were unsure or disagreed with the machine; the result is
   data (`data/wtc/subjects-settled.json`), not prose.
2. **One analysis (R2).** The three pipelines (TS lab, TS study, Python) reconciled into one, run over
   the 61 with the settled subjects: entries (all forms), keys of entries, episodes, strettos,
   countersubjects, pedals, cadences; checked against Ledbetter (491 claims) where he speaks.
3. **The habits (R3).** `docs/wtc/HABITS.md`, as the chorales' PRINCIPLES.md: per topic a count over
   the corpus with examples (piece, bar, voice), never a number alone. Topics: the subject (length,
   range, degrees of beginning and end, rhythm, modulation, chromaticism); the answer (real/tonal,
   the mutation's place, the interval); the countersubject (regularity, invertibility, rhythmic
   complement); the exposition (order, codettas, redundant entries); episodes (length, material,
   sequence types, harmonic pattern); the key plan; stretto (distance, interval, where in the
   fugue); inversion, augmentation, diminution; pedal points; cadences (where, which kind, how
   prepared); dissonance treatment (Kirnberger's categories, as the chorales use them); the close.
   Each topic split by set (WTC I, WTC II, Art of Fugue, Musical Offering, BWV 903) where the sets
   differ.
4. **The theory of the period as a check (R4).** Not as authority over Bach but as what he and his
   pupils could have said:
   - **Fux, *Gradus* (1725), Exercitium V *De Fugis*** (pp. 143 ff.: in general; in two, three, three
     voices; fugues on several subjects): the modal fugue Bach's tonal fugue departs from. Read from
     the 1725 print (Internet Archive `gradusadparnassu00fuxj_0`, UNC copy; the project's own scans
     stop at p. 138).
   - **Marpurg, *Abhandlung von der Fuge*** (1753-54; the Internet Archive has later printings,
     `abhandlungvonder00marp`, 1806): the first treatise built on Bach's fugues.
   - **Kirnberger, *Die wahren Grundsätze zum Gebrauch der Harmonie*** (1773; Internet Archive
     `diewahrengrundst00kirn`): its preface says it was asked to reduce "eine gewisse bekannte
     Bachische Fuge" to its fundamental chords, and it does so (Fig. 95, the fundamental bass under
     Bach's text, a realized thoroughbass between), then a prelude. Which fugue: to be read from the
     plate. Kirnberger's fundamental bass is the reading the chorale session applies (C3): his own
     analysis of a Bach fugue is the test of carrying it to the fugues.
   - **Ledbetter, *Bach's Well-tempered Clavier: The 48 Preludes and Fugues*** (Yale, 2002): the
     modern reference already checked against the score (docs/wtc/ledbetter-game-check.md).
5. **Hear and read (R5).** The study screen's missing layers, as the chorale "hear and read" view
   (C15) has them: the settled subject and answer, the cadences and key plan, the fundamental bass,
   the incidental notes by kind, the material of each episode; the new pieces in the study.

## 3. What the Fux and chorale work bring

- **Fux:** the grammar (the two-voice judge is the species carried into free rhythm, D119), the
  method (a rule is cleared by the master's own music; habits measured, confounds tested), and his
  own doctrine of fugue (step 4).
- **The chorales:** the harmonic categories (fundamental bass after Kirnberger, cadence classes,
  the kinds of incidental dissonance) and the conception of judgement (boundaries, idiom with
  examples, comparison). Not mechanically: a fugue's harmony is implied by two or three lines, with
  far more incidental notes than a chorale; the harmonic reader must be adapted and re-measured.

## 4. Status

- **R1 done (12 October):** 61 subjects settled (`docs/wtc/SUBJECTS.md`, `data/wtc/subjects-settled.json`):
  50 sure, 11 with a named alternative end. Read by five readers on one protocol; reviewed by hand, three
  readings corrected (I/4 and I/19 against the protocol, both confirmed by Ledbetter's entries;
  the Ricercar a 6's answer after a reader fault was found and fixed in the Humdrum reader: a mid-bar `=.`
  in one spine dropped the other spines' notes). The study screen uses them: its entries agree with
  Ledbetter as before (157 of 173), one more of his strettos found (40 of 47), no new unclaimed ones.
- **R3 begun (12 October):** `docs/wtc/HABITS.md`, part 1 (the subject, the answer, the opening of the
  exposition), from the settled subjects alone. The head rule holds in all 20 subjects that begin on ^5.
- **R3 part 2 (12 October):** entries, their degrees, inversion and augmentation, stretto, episodes, pedal
  points over the 61, with the analysis's blind spots named (the late works suffer most: strettos with
  transformed entries, later subjects of AoF VIII-X, varied entries).
- **R4 begun (12 October):** Fux's doctrine of fugue read from the 1725 print (`docs/fux/fugue.md`, pp.
  143-238, with 29 claims to test against Bach). Kirnberger 1773 located (the fugue of Fig. 95 still to be
  identified from the plate); Marpurg located (Internet Archive, 1806 printing), not yet read.

Next: R2 proper (transformed entries in strettos, later subjects for the Art of Fugue, cadences), then the
remaining habits (countersubject, cadences, dissonance by Kirnberger's categories) and Fux's 29 claims
answered one by one.
- **Contrapunctus XI and XIV added (12 October):** the owner asks that XIV be tracked, a completion being a
  future goal; Mutopia has it as "Contrapunctus XIX" (the Bach-Gesellschaft's numbering), and XI too. 63
  fugues. `docs/wtc/XIV.md`: the fragment as read (three subjects, b. 1, 115, 193) and the road to a
  completion, knowledge first.
- **R2, the blind spots (12 October):** entries in a changed rhythm found (AoF VI's diminutions, VII's
  augmentations, rhythmically varied entries), the later subjects of AoF VIII-XI read in the score and
  tracked, the 48's agreement with Ledbetter kept. Left: ornamented entries, cadences (HABITS.md, limits).
- **KNOWLEDGE-PLAN A1-A2 done (12 October):** eight fugues read completely by hand (I/11, I/12, II/13, II/17,
  AoF VI, AoF IX, the Ricercar a 3, BWV 903: `data/wtc/gold/`, 116 entries, 109 cadences); the analysis
  measured on them (`docs/wtc/READING.md`): precision 98%, recall 93%, after two fixes the reading prompted
  (later subjects grown back to their head; tonal heads in AoF VI's diminutions). The readers agree with 27 of
  Ledbetter's 28 entry claims there. A tool fault found and fixed: dumps from bar 1 dropped a pickup bar.
- **C0 and the Algomus reference (12 October):** the literature reviewed (`docs/wtc/LITERATURE-REVIEW.md`, 76
  references, proposed to the owner); the Algomus reference analysis of WTC I imported (ODbL, `data/wtc/algomus.json`)
  and the analysis measured on it, every disagreement judged from the notes (`docs/wtc/ALGOMUS.md`): precision 85%,
  recall 94%; the errors are mostly heads in episodes counted as entries; the reference omits a dozen real statements
  (late compressed ones in I/15, strettos in I/8). I/11's settled subject is likely too long (for the owner).
- **Groocock (12 October):** his *Fugal Composition* (2003; the owner's scan, parts 1-2 of 3) read and his tables of all
  48 fugues turned into data (`data/wtc/groocock/`); the analysis measured on them (`docs/wtc/GROOCOCK.md`): Book I
  precision 92%, recall 86%; Book II 87% and 88%. Weakest: II/3 (10 of his 31 entries: he counts the four-note head
  as the subject in most entries), I/4 and II/14 (later subjects). His subject ends differ from the settled ones in
  I/7, I/11, II/15, II/23 (his shorter, the rest a codetta) and II/7 (disputed by him): for the owner.
- **D163 applied (12 October):** the owner's criterion (a), the subject is what later statements keep. Measured for
  all 63 (`docs/wtc/KEPT.md`), the candidates read against Bach's statements: seven subjects shortened (I/7, I/11,
  II/3, II/15, II/17, II/20, II/23; the old readings kept under `previous`), seven kept (I/22, II/6, II/7, II/16,
  AoF III, IV, BWV 903). Analysis fixes: heads spun in sequence no longer entries; later subjects found in a varied
  rhythm. Groocock: Book I precision 93%, recall 88% (was 92/86); Book II 88/91 (was 87/88); II/3 15 of 31 (was 10:
  its inversions, augmentations and four-note heads still missed); the gold standard unchanged (98/93); Ledbetter's
  entries 159 of 173. One cost: I/11's stretto at b. 46 (entries two bars apart) is no longer a stretto under D137's
  "before the first is half over", the subject being shorter; Groocock and Ledbetter call it one.
