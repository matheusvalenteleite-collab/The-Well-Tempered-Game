# Backlog: fixes and ideas for later

Things the owner wants kept in view but not implemented now. Newest first. Move an item to
DECISIONS.md (or delete it) when it is done or dropped.

## Study area (Lectio)

- **Facsimiles of the book.** Show page images of the *Gradus* where they look good, e.g. next to
  the Latin passages. The 1725 Vienna print is preferred (the upstream dataset's scans,
  `source_pdf/gap_pNNN.pdf`, printed page = file − 8, already cover pp. 45-138); Mann's edition
  would be a fallback, subject to copyright. (Owner wrote "Fictum"; read as the study area.)
- **Josephus's attempts.** Show his faulty first versions (e.g. Fig. 26 before Fig. 33; the
  first versions of Figs. 6, 12, 15) as images or as engraved scores with Aloysius's marks.

## Analysis, scoring and generation (plan agreed October 2026; steps in order)

Background: J. Ewing, *A Historical and Algorithmic Study of Fux's Approach to Counterpoint*
(BA thesis, New College of Florida, 2009) scored three-voice first species with weighted rules
and compared each choice with Fux's, bar by bar, given Fux's previous bar.

1. **Alternatives audit (test + report).** For every Fux solution and every slot, substitute
   each candidate pitch (mode notes, cadential sharps, B♭/E♭ where Fux uses them) into Fux's
   otherwise unchanged line and count the substitutions that raise no error. Snapshot the
   counts so a rule change shows how much it widens or narrows the game. Fux must remain legal
   at every slot (D39).
2. **Score vector.** Compare candidates lexicographically by tier, not by Ewing's powers of ten:
   errors (Fux's precepts) > Fux's recommendations (warnings) > Fux's stated counsel
   (singability, variety, look-ahead) > measured habits of Fux's solutions > modern additions
   (dev only). Never affects stars (D25).
3. **Measure Fux's habits** on all solutions in the dataset (leap rates per voice, bass vs upper
   voices, sixths by quality and direction, repeated notes, successive leaps, cadence chords),
   as data for tier 4. Done for three-voice first species (session of October 2026): bass skips
   0.65 of its moves against 0.41-0.43 in the upper voices; 21 melodic minor sixths in the whole
   corpus (13 up, 8 down), no major sixth.
4. **Fit and validate tier 4** against Fux's choices (agreement with Fux, leave-one-exercise-out);
   Ewing's text-only baseline matched Fux on 52% of chords.
5. **Hints from the audit:** "Fux had N legal choices here", the rank of the player's note.
6. **Generators** (D8): cantus firmus by the M1-REPORT §4 constraints; counterpoint by search
   under errors, ranked by the score vector; every cantus must admit a counterpoint (§4.15).
7. **Three voices:** compare-fux "singable" judged per voice with a bass allowance; motion rule
   scoped as Fux's solutions require (17 direct motions into perfect consonances, all with the
   bass, none between upper voices; 10 at the final cadence).
8. **Harmonic view toggle (modern, never graded).** Roman numerals / figured-bass labels under
   the score beside the note-name and interval views; from three voices on (two-voice dyads are
   ambiguous). Labelled as a modern lens (Rameau, Weber), not Fux's.

**State (9 October 2026): steps 1, 2, 4 and 6 built as a separate "Choices lab" page for the owner
to try; nothing in the game uses them yet, and no decision number is taken until the owner rules.**
Code: `src/counterpoint/choices/` (audit, score vector, habits, generators), `src/lab/` (the page,
`vite.lab.config.ts`, `tools/build-lab-artifact.mjs`), `test/choices.test.ts`; report:
`node tools/lab/choices-report.ts` → `docs/fux/choices-audit.md`. Two-voice species 1-4, and three
voices in first species (`choices/trio.ts`, on the game's `evaluateTrio`): the audit of Fux's 16
solutions, and "Add a third voice" (above, between, below) to a generated first-species exercise.
Not yet: fifth species; three voices beyond first species (the game has no rules for them yet).
Findings and points for the owner:

- Fux's note is legal at every one of his 691 choices (species 1-4). Where more than one pitch
  is legal, the full score vector ranks his note first, alone, at 61% (first species), 74%
  (second), 78% (third), 69% (fourth); his stated counsel alone (no habits) at 40-66%.
- Three voices: Fux's note legal at all 374 choices; first alone where free at 73% (habits alone
  77%, counsel alone 55%). A middle voice often cannot be added to a two-voice exercise written
  for two voices: the lines lie a third or less apart, and doubling one of them twice makes
  parallel unisons; Fux spaces his three voices widely from the start. Some E-mode endings leave
  no bass at all (the cadence Fux calls impossible in the regular way).
- Sharps only at the cadence in both generators: every C♯, F♯, G♯ of Fux's two- and three-voice
  solutions stands in the last four bars (F♯ in A once: Fig. 42, rising to G♯).
- Fifths or octaves on successive downbeats, broken by the upbeat or the syncopation: allowed by
  the rules (Fux's Fig. 77 has one; p. 72 judges ligatures "retardatione sublata"), rare in his
  practice (3 of 118 successive downbeats in second species, 1 of 54 in fourth), and so scored
  as rare by the habits.
- Generator settings: counsel weight 0 and variety 1 by default, i.e. each move drawn about as
  often as Fux makes it (Gumbel-max sampling); generated first-species lines then match his
  rates of repetition, leaps and spacing (14%, 32%, 7.4 semitones; Fux 11%, 32%, 7.1).
- Fux's habits, measured (docs/fux/habits-study.md; the lab's "Fux's habits" tab): of eleven
  candidate habits, five predict his notes once the others are in, each exercise judged by a model
  learnt without it: the melodic move by voice position, the interval with the cantus, pairs of
  successive moves, how a downbeat is reached, the same fifth or octave on successive downbeats.
  Weighted, they cut the surprise at his notes from 1.24 to 0.96 bits per real choice (his note
  first 72%; 68% before; second species 63% → 75-78%). In words: perfect consonances on a
  downbeat reached by contrary motion 99% (oblique would mean a repeated note, legal only in first
  species, so this is partly the rules); after a leap of a fourth or
  more he turns back 76% (up) and 95% (down), after a downward one more often by another leap
  than by step. The audit and both generators use this model; the generator's variety is
  calibrated at 0.75 on his rates of leaps and spacing. Not yet modelled: first-species repeated
  notes (3% generated against his 11%).
- Three voices, the same method (docs/fux/trio-habits-study.md; same tab): of eleven candidate
  features, five predict Fux's notes once the others are in: the sonority (by far the strongest),
  the melodic move (pooled over staves: by staff adds nothing once the rest is in), pairs of moves,
  the chord member the voice takes, and its motion with each other voice. Weighted, they cut the
  surprise at his notes from 1.00 to 0.73 bits (his note first 77% → 84% where the rules leave a
  choice). Spacing and the final chord's top note add nothing once these are in; the generated
  third voices still end with the final on top 84% of the time (Fux 88%), with his rates of leaps
  (47% against 43%) and repeated notes (14%). The audit and the third-voice generator use it.
- Motives and imitation (docs/fux/motives-study.md): Fux's species solutions imitate the cantus
  (displaced 1-4 bars, straight or inverted, at any transposition) and repeat their own
  three-interval figures no more than counterpoints generated without any notion of either
  (percentiles 33-69% against the generator's, mostly about 50%; the 3-interval "imitations" found
  are short scalar runs). Not a habit in the species exercises; Fux teaches imitation after
  Exercitium III. An imitative mode for the generators would be our addition, to be labelled so.
- Habits are measured per role (counterpoint above or below) and with register and crossing
  (a tenth is not a third; a crossed third is not a third).
- Ranking by the most typical move alone gives far fewer leaps than Fux writes (6-19% against
  his 32% in first species): hence the sampling above.
- D8 bands checked against Fux's own cantus firmi ("Fux is the last word"): the leap band
  widened from 25-60% to 20-62% (Fig. 42's A has 20%, the G 62%); "turn after a rising fourth"
  is soft (Fux's G does not turn once); outlined sixths allowed when they arpeggiate a triad
  (Fux's G: G-C-E); length 9-14 accepted (Fux's C variant has 9; generator default 10-14); and
  Ewing's antepenultimate degree 1 or 3 (true of all Fux's) added. To approve or amend.

## Rules

- Fig. 110, bar 6 (and Figs. 169, 170, bar 6): an unmarked B repeats the B♭ of bar 5 in the same
  voice. The dataset reads B♮ (a chromatic step found nowhere else in Fux); B♭ is far more likely.
  Decide the reading before three or four voices are built.
- The hint "leap a minor sixth (upward)" (pp. 59-60): the Latin gives no direction ("per saltum
  Sextae minoris, (qui licitus est)"), and Fux leaps a minor sixth downward 8 times. Check the
  examples on p. 60 and reword if needed.
- Decide whether the crossing warning (D2) goes, given D39 ("Fux is always the last word"): it
  fires on Fux's own Figs. 14, 37 and 39, so those solutions cannot earn a star.

## Basso continuo

- Assess first (prompt for an external survey was drafted in the session of October 2026);
  open questions: final chord with or without the third, organ or harpsichord, timing.

## Data

- Report the upstream defects listed in docs/fux/open-questions.md, and the B♮ readings of
  Figs. 110, 169, 170, bar 6 (see Rules above) once decided.
- Check Fig. 42's A cantus against 1725 p. 62.

## For Batch 4 — "What is the Gradus?" (owner, 9 October 2026)

- Open the section with Fux's line (owner's English): "I will not be deterred by the most passionate haters of study, nor by the depravity of the present time." To verify against the 1725 preface ("Ad lectorem") before use, and give the Latin beside it.
- Reception (owner's note): Leopold Mozart is said to have taught Wolfgang from the Gradus; J. S. Bach and Beethoven held it in great esteem; Haydn worked out each of its exercises; in translation it remains in use for teaching counterpoint. Source: Alfred Mann (tr., ed.), *The Study of Counterpoint from Johann Joseph Fux's Gradus ad Parnassum* (New York: Norton, 1943; rev. 1965) — the owner consulted the 34th printing of the paperback. Cite without page numbers unless verified.
