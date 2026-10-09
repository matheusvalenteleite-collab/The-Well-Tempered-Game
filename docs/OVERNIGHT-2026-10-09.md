# Overnight report, 9–10 October 2026 (chorale branch `claude/loving-noether-81pf56`)

This was written for the owner, who left the instruction: "work on choices lab intensively …
develop it as further as you can without my help … do work on the Well-Tempered Clavier … this is
the end goal."

Everything below is committed and pushed on this branch. Decisions C6–C10 were taken without the
owner and are marked *assumed, owner to confirm* in `docs/DECISIONS.md`.

## 1. What to look at first

1. **The game, Well-Tempered Clavier mode** (the voices selector, then "Well-Tempered Clavier").
   It has three levels:
   - **P1, Prelude 1's harmonic plan.** Choose the chord of each of the 32 bars, hear it in Bach's
     figuration, and compare the plan with Bach's.
   - **P2, Prelude 1's figured bass.** Voice each figured chord. Parallels from the bar before are
     marked as faults; Bach's prelude has none.
   - **F2, the answer.** Choose the answer to 26 fugue subjects: real, textbook tonal, or Bach's
     own mutation.
2. **The game, Chorales**, now with **level 2**: the chord under every melody note, compared with
   Kittel's basses, Bach's settings and Bach's habit.
3. **`docs/wtc/PLAN.md`**: the WTC plan from this branch, and how it relates to the Choices lab's
   concept (section 3 below).

## 2. Findings worth knowing

- **Fugues** (`docs/wtc/FUGUES.md`). The analysis of the 48 reproduces the facts any analysis
  states:
  - 1/1 has 24 entries;
  - 1/8 is augmented from bar 62;
  - 2/2 is augmented;
  - 2/9 is diminished.
- **Answers** (`docs/wtc/ANSWERS.md`). Bach answers 20 subjects really and 18 with the textbook
  tonal mutation. The other 10 have a tonal answer of his own.
- **Three independent readings agree** (`docs/wtc/THREE-READINGS.md`). This branch, the Choices
  lab and the main session's D119 (from the ASAP scores) agree on the mutated notes of the answer
  in 27 of 29 fugues. The lab and this branch agree in 48 of 48.
- **Harmonic reader** (`docs/wtc/HARMONY.md`). Measured against the human Roman-numeral analyses
  of When in Rome, it finds the analyst's root in 83.3% of 3,679 segments, with each piece read
  on parameters fitted to the others. Reading the bass as the root gets 48.3%. Six-four chords,
  diminished sevenths and leading-tone chords are counted apart as rival theories of the
  fundamental.
- **Figuration preludes** (`docs/wtc/PRELUDES.md`). Measured, not assumed: 1/1, 1/5, 1/6 and 1/2.
  Every other prelude repeats one pattern in at most a third of its bars.
- **Chorale level 2** (`docs/chorales/LEVEL2.md`). Held out by tune, Bach's chord under a melody
  note is the habit's first choice 58% of the time and among its first three 87% of the time.
  Where Bach's chord is known, one of Kittel's basses has it under 82% of Kittel's melody notes.

## 3. Coordination with the other sessions

- **The Choices-lab session also worked on the WTC tonight** (branch
  `claude/beautiful-mccarthy-7li5nv`). It went further on the fugues:
  - a map of the 48;
  - the entries, key plans, strettos and episodes;
  - an answer exercise in staff notation;
  - a guided listening.

  So that the two branches can merge without collisions, this branch renamed its own files:
  - `docs/wtc/CONCEPT.md` → `PLAN.md`;
  - `docs/wtc/IMPORT.md` → `IMPORT-LOCAL.md`;
  - `data/wtc/fugues.json` → `fugue-analysis.json`.

  I sent the lab a note proposing that this branch stay on preludes and harmony, and leave the
  fugue levels to the lab. **Reconciling the two WTC concepts is your call.** The F2 answer level
  here overlaps the lab's level 2.
- The lab also tested the chorale level 1 on held-out tunes, and two chorale habits for
  confounds: `docs/chorales-lab/` on its branch. That covers the "choices-lab methods on the
  chorales" task I had planned, so I did not duplicate it.

## 4. Decisions waiting for you

1. **Rights of the Humdrum WTC encodings.** Each file says "Rights to all derivative electronic
   formats reserved" (Huron 1994; CCARH). The two branches handle this differently:
   - this branch keeps the notes local (`data/local/`, git-ignored). It commits only facts derived
     from them;
   - the lab's branch commits the `.krn` files and the parsed notes, with the same caveat noted
     for you.

   Options (C7, `docs/wtc/PLAN.md` §5):
   1. public-domain Mutopia editions where they exist;
   2. ask for permission;
   3. re-encode from the Bach-Gesellschaft edition;
   4. subjects only for the fugue levels.
2. **C6–C10**: confirm or amend.
   - C6: the WTC screen and P1.
   - C7: sources.
   - C8: F2, the answer.
   - C9: P2, the figured bass.
   - C10: chorale level 2.
3. **Kirnberger's text** is still unreachable from here: the proxy refuses archive.org and IMSLP.
   The analytical categories remain operational readings marked "to verify".

## 5. Next steps proposed

- P1 and P2 for Preludes 2, 5 and 6, once their Mutopia sources are read and checked against
  Humdrum. A LilyPond reader for that was in progress at the time of writing; see the commit log.
- Chorale level 3, the bass, using the same method as levels 1 and 2.
- Local keys in the chorale habits (a passage in the dominant now reads as II and V of the home
  key).
