# Backlog: fixes and ideas for later

Things the owner wants kept in view but not implemented now. Newest first. Move an item to
DECISIONS.md (or delete it) when it is done or dropped.

## Well-Tempered Clavier (the goal; night of 9-10 October 2026)

The owner: the end goal of the whole game is a Well-Tempered Clavier mode. The lab session's work
towards it (branch claude/beautiful-mccarthy-7li5nv); the proposal is docs/wtc/CONCEPT.md (levels
0-8, preludes beside). The main session has its own first layer (D119, ASAP expositions, answer and
tonal two-voice engines) and builds the screen; the two readings were cross-checked
(docs/wtc/crosscheck.md).

- Data: the 48 preludes and fugues and the 30 Inventions and Sinfonias from the Humdrum encoding
  (Huron 1994; **rights to settle before any public build**: data/sources/bach-wtc/SOURCE.md).
- Analysis (src/wtc/): subject and answer, answer rules (Bach's head rule law-like: 17 of 17, 7 of
  7), entries through each fugue (by the subject's head where tails vary), the key of each entry,
  strettos, episodes and sequences, countersubjects, harmonic reduction of the preludes, tunings.
- Studies (docs/wtc/): answers, countersubjects, key plans, strettos and episodes, cross-check.
- Lab prototype: the WTC tab (map, period tunings, harmony of the preludes; exercises: find the
  entries, answer the subject, plan the keys).
- Open: countersubject invertibility needs a test with the bass; Book II no. 11's answer note 2 to
  check; entries in a few fugues are still under-found (Book I nos. 3, 6, 12; Book II no. 18).

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
`node tools/lab/choices-report.ts` → `docs/fux/choices-audit.md`. Two-voice species 1-5, and three
voices in first species (`choices/trio.ts`, on the game's `evaluateTrio`): the audit of Fux's 16
solutions, and "Add a third voice" (above, between, below) to a generated first-species exercise.
Fifth species since added (below). Not yet: three voices beyond first species (the game has no rules for them yet).
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
- Three voices, the same method (docs/fux/trio-habits-study.md; same tab): of twelve candidate
  features, six predict Fux's notes once the others are in: the sonority (by far the strongest),
  the melodic move (pooled over staves: by staff adds nothing once the rest is in), pairs of moves,
  the chord member the voice takes, its motion with each other voice, and the opening sonority.
  Weighted, they cut the surprise at his notes from 1.00 to 0.72 bits (his note first 77% → 84% where the rules leave a
  choice). Spacing and the final chord's top note add nothing once these are in; the generated
  third voices still end with the final on top 84% of the time (Fux 88%), with his rates of leaps
  (47% against 43%) and repeated notes (14%). The audit and the third-voice generator use it.
- After a leap (docs/fux/leap-study.md): tested against von Hippel & Huron's regression to the
  mean (Music Perception 18/1, 2000). In whole-note lines (first species, three voices) the turn
  after a leap is accounted for by where the leap lands relative to the line's middle; leap size
  adds nothing measurable. In the running lines of species 2-5 leaps turn back far more than steps
  landing alike, even counting only consonant landings; whether that is a rule for leaps or the
  inertia of steps in scales, these data cannot say. The "habit" of the habits study is to be read
  accordingly.
- Independence of the precepts (docs/fux/independence-study.md): every precept of species 1-4 has
  a witness (a line, usually Fux's own with one or two notes changed, that breaks it alone), except
  `fs.final-octave-or-unison`, which the first-species cadence rule already contains (an encoding
  redundancy). Fifth species: the three rhythm precepts untested (pitches varied only). The
  witnesses show the precepts allow leaps beyond the octave (a thirteenth): check whether Fux
  forbids them.
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
  Ewing's antepenultimate degree 1 or 3 (true of all Fux's) added. Approved by the owner,
  9 October 2026 (docs/fux/cantus-constraints-amendment.md); decision number to be assigned.
- Fifth species, two voices (`choices/florid.ts`): the audit now covers Fux's twelve florid
  solutions (his note legal at all 299 choices; first where free 74% with the full score vector,
  habits learnt on his florid lines with the weights fitted on species 1-4). The generator draws
  each bar's rhythm from Fux's own middle bars under the grammar his solutions keep (the opening
  half rest and minim; the cadence bar a held minim and a minim; a tie into a bar only after a
  minim on the half bar; after two crotchets and a minim, a tie, so that the melody does not
  "limp", pp. 80-81), then the pitches by beam search judged by the game's fifth-species rules
  (D82), with Fux's counsel of variety against lines rocking between two notes (p. 77). 24 of 24
  trials (six finals, cantus below and above) found a line with no error. Not yet: writing your
  own florid line in the lab (rhythm entry), a habits study of florid rhythm beyond bar patterns.
- Three voices written together (`generateTrio` in `choices/trio.ts`; Generators, step 3, "write
  two voices together over the cantus"): the cantus on the top, middle or bottom staff, moved by
  octaves to where Fux writes it there; both added voices searched bar by bar as pairs, in his
  registers for that staff (from his solutions with the cantus on the same staff), ranked by the
  three-voice habits (the chord's own habits counted once), judged by the three-voice rules.
  52 of 54 trials (six finals, three staves, three cantus each) found a clean pair; the two
  failures were G and C with the cantus in the bass, positions Fux does not write. Generated
  sonorities at the default variety (0.75): 3 8 37%, 3 5 36%, 3 6 9% (Fux 33%, 41%, 14%).
  The three-voice habit model gained the opening sonority (weight 0.59; it predicts his notes once
  the others are in), which keeps the generator from opening on a sixth over the final.
- Harmonic view (plan step 8; `choices/harmony.ts`, lab `Harmony.tsx`): a "harmonic view
  (modern)" toggle under three-voice scores (the generated trio, Fux's sixteen in the audit):
  figures above the bass, stacked, and a Roman numeral relative to the final (upper case major,
  lower case minor, ° diminished, 6 and 6/4 for inversions, in brackets where an incomplete chord
  leaves the root a guess). Labelled a later lens; never graded. Not yet in the game.
- Write your own (lab tab; `choices/hints.ts`, step 5 of the plan): write on one of Fux's cantus
  firmi or a generated one; at each note the errors it causes (the game's hint text and Fux's
  page), the number of legal pitches given the rest of the line, the note's rank, and on request
  the most Fux-like note (habits learnt without the exercise) beside Fux's own. The engine judges
  whole lines only, so a line being written is judged in the stretch of written bars around the
  note, the opening and ending rules waiting until the stretch reaches them; the note at the
  frontier of the writing is judged with its best continuation to the next downbeat (searched
  steps first), so that a passing note is not read as a last note. Writing Fux's own lines left
  to right, his note is legal at every step in all four species. `hintAt` / `legalCounts` are
  ready for the game.
- Difficulty (docs/fux/difficulty.md; `choices/difficulty.ts`): freedom per choice, log2 of the
  legal pitches with the rest of a good line in place. Fux's species tighten steadily (2.17 bits in
  first species, 1.67, 1.57, 0.89 in fourth, where 53% of choices are forced; fifth loosens again
  per note, 1.75, its rhythm not counted); within a species his
  order goes through the modes and is not one of difficulty (weak correlations of both signs). For
  the game: order generated practice by it. Shown in the lab's audit lists and summaries.
- Two-voice generator: when no error-free line exists it returns the one breaking the fewest
  rules (as the third voice does), marked in red in the score.

## Rules

- Fig. 110, bar 6 (and Figs. 169, 170, bar 6): an unmarked B repeats the B♭ of bar 5 in the same
  voice. The dataset reads B♮ (a chromatic step found nowhere else in Fux); B♭ is far more likely.
  Decide the reading before three or four voices are built. (Now item 7 of docs/fux/open-questions.md.)
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
