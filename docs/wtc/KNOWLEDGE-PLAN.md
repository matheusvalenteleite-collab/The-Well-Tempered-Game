# Knowing Bach's fugues: the plan

The owner (12 October 2026): understanding Bach's fugues comes first; nothing is generated now
(the composer, D158-D159, is parked; the playback session's bench will receive fugues only when
generation resumes, from this session). This plan orders the work. It supersedes the step list of
RESEARCH.md section 2, which keeps the record of what was done (R1-R4 so far).

## 0. Principles

1. **Measure the reading before counting with it.** Every analytic tool (entries, cadences, harmony,
   countersubjects) is first checked against an authority outside the project (Ledbetter, Kirnberger,
   a reading by hand) and its accuracy stated. A count resting on an unmeasured reading is marked so.
2. **A number is never shown without its examples** (piece, bar, voice), as in the chorales' PRINCIPLES.md.
3. **Observations, not rules.** The owner decides what becomes a precept or a boundary, with Bach's
   counts and examples in front of him (D39, C1, C4).
4. **The sets are compared, not pooled blindly:** WTC I, WTC II, the Art of Fugue, the Musical Offering,
   BWV 903. Where they differ the difference is the finding.
5. **Readings by hand follow a written protocol** (as `data/wtc/subject-readings/PROTOCOL.md`), are kept as
   data with their reasons, and are reviewed; corrections are recorded, not overwritten.

## 1. Where we stand (12 October)

| | state |
|---|---|
| corpus | 63 fugues: the 48, Art of Fugue I-XI and XIV, the Musical Offering's two ricercars, BWV 903 |
| subjects | settled by hand for all 63 (50 sure, 11 with a named alternative); later subjects of the 11 fugues on several subjects located |
| entries | found at 91% of Ledbetter's (158 of 173); augmentation, diminution and varied rhythm found; ornamented entries missed |
| strettos | 85% of Ledbetter's (40 of 47) |
| cadences | 23% of Ledbetter's: the weakest reading |
| pedal points | 58% |
| harmony | the reader finds the analyst's root in 83% of segments on homophonic music (When in Rome); unmeasured on fugues |
| habits | HABITS.md parts 1-7: subject, answer, exposition, entries, stretto, episodes, pedals |
| theory | Fux's doctrine of fugue read (docs/fux/fugue.md, 29 claims to test); Kirnberger 1773 and Marpurg located, not read |

## 2. The phases

Each phase has a deliverable and a test of done. The order matters: phase A makes the later counts
trustworthy; phases B and C can then run side by side; D shows the results to the player; E is the
owner's.

### A. Make the reading reliable (first)

| step | what | done when |
|---|---|---|
| A1 | **A gold standard by hand.** Eight fugues read completely by hand, every entry (voice, bar, beat, form, key) and every cadence (bar, kind, key): two from each book of the 48 (one three-voice, one four-voice), two from the Art of Fugue (I, VI), the Ricercar a 3, BWV 903. Same protocol as the subjects. | `data/wtc/gold/*.json` with reasons; reviewed |
| A2 | **Entries measured on the gold standard** (precision and recall, by set), not only on Ledbetter's sampled claims; the misses classified (ornamented, altered head, voice crossing). | a table in `docs/wtc/READING.md`; fixes where a class of misses is common |
| A3 | **A cadence finder.** Cadences as the chorale mode classes them (perfect, imperfect, half, Phrygian, deceptive, evaded), read from the bass's clausula and the upper voices' (the leading note, the 7-6/4-3 suspension), not from a change of key. Measured on the gold standard and Ledbetter's 35 claims. | cadences at 70% or better of Ledbetter's (a target, to be agreed), measured on the gold |
| A4 | **The fundamental bass in a fugue.** The chorale mode's Kirnberger reading adapted to two- to four-voice counterpoint (harmony implied by fewer voices, more incidental notes). Measured against Kirnberger's own analysis of a Bach fugue (1773, Fig. 95; first identify the fugue from the plate) and on the gold standard. | the agreement with Kirnberger stated, chord by chord |
| A5 | **Countersubjects found and checked:** regular or free, where they first appear, whether they invert (at the octave, tenth, twelfth). Measured on the gold standard. | a countersubject per fugue, with confidence |
| A6 | **One pipeline.** The Python analysis (`tools/wtc/fugues.py`, `answers.py`) retired or made to agree with the TS one; FUGUES.md and ANSWERS.md regenerated from the settled subjects. | one source of truth; old documents marked superseded |

### B. Complete the habits (HABITS.md), on the measured reading

| chapter | the questions |
|---|---|
| 3. the exposition (extend) | redundant entries, counter-expositions, the codetta's length and material, the order of voices by number of voices |
| 8. the countersubject | how many fugues keep one; invertible at which intervals; rhythmic complement to the subject (moving where it holds); where it begins against the answer |
| 9. episodes (extend) | what material (subject head, tail, countersubject, free), which sequences (descending fifths, ascending 5-6, by step), how long, modulating or not, how they lead into the next entry; Fux's suspension chains ("modulatio") as a type |
| 10. the key plan | the keys reached by cadences (not entry transpositions): order, distance from the tonic, the first key away, the return; by set |
| 11. cadences | where (after which section), which kind, how prepared; evaded cadences under an entry (Fux's claim 15) |
| 12. stretto (extend) | interval of the second entry, closeness against place in the fugue (Fux's claim 18: tightening towards the end), stretto by inversion |
| 13. inversion | the axis Bach inverts about (Fux's claim 20), which subjects he inverts |
| 14. the close | final pedal, final stretto, coda, the Picardy third in minor fugues, how many bars after the last entry |
| 15. dissonance | Kirnberger's categories counted (passing, neighbour, suspension, anticipation, appoggiatura, échappée) by set and by voice; suspension chains |
| 16. texture | voices sounding at once (thinning and filling), rests and how a voice re-enters (Fux's claim 13), ranges and crossing |
| 17. fugues on several subjects | separate expositions or not, the order of combination, at which intervals they invert |
| 18. the late works against the 48 | every chapter's differences by set gathered in one place |

Done when each chapter has its counts with examples, and HABITS.md's "What stands out" is rewritten
from the whole.

### C. The theory of the period, as a check

| step | what | done when |
|---|---|---|
| C1 | **Fux's 29 claims answered** one by one from the counts (docs/fux/fugue.md section 12): where Bach follows, where he departs, with examples | `docs/wtc/FUX-AND-BACH.md` |
| C2 | **Marpurg, *Abhandlung von der Fuge*** read (the chapters on Führer and Gefährte, the answer, Gegensatz, Zwischenspiel, Engführung, the plan): his rules and his examples from Bach, stated as claims and tested like Fux's | `docs/wtc/marpurg.md` and the tests |
| C3 | **Kirnberger 1773**: the fugue of Fig. 95 identified, his fundamental bass transcribed, set beside ours (A4) | `docs/wtc/kirnberger.md` |
| C4 | **Ledbetter's remaining claims** (sections, cadences) re-run once A3 is done; his disagreements with the project listed for the owner | ledbetter-game-check.md regenerated |

### D. Hear and read (the study screen)

What is learnt becomes visible in the study, as the chorale mode's "hear and read" (C15): the settled
subject and answer (mutations marked), the countersubject, the later subjects; cadences and the key
plan; episodes with their material; incidental notes by kind; the Art of Fugue, the Musical Offering
and BWV 903 in the study beside the 48. Each layer only once its reading is measured (phase A).

### E. For the owner

1. The 11 subjects with a named alternative end (SUBJECTS.md, "unsure").
2. Which observations become precepts or boundaries: the first candidate is the head rule (20 of 20,
   no exception).
3. The gold-standard readings (A1), where the readers disagree with the literature.

## 3. Not in this plan

Generating fugues (the composer), and the completion of Contrapunctus XIV: both wait for the knowledge
above. XIV is tracked (docs/wtc/XIV.md), and its prerequisites are this plan's phases A, B (chapters 9,
12, 14, 17) and C.

## 4. The order of work

A1 → A2 → A3 → A4 (with C3) → A5 → A6; then B and C1-C2 side by side, chapter by chapter; D as layers
become measured; E whenever a decision is ripe. Each step ends with a commit and a line in RESEARCH.md.
