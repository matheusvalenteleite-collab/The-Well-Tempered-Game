# The chorale mode: the long-term plan (C20)

Agreed with the owner on 11 October 2026, after levels 0-6 had been built as separate views.

## The objective

**A course in harmonizing a chorale from the top down, for a learner coming from the Fux mode.**
The Fux mode is the strict discipline and the prerequisite; the chorale mode teaches harmony
through Bach's practice (C16: one style, Bach's; C21: no errors, warnings of three gravities).

Four directions were weighed:

- **A. The course** (this session's objective). The levels are stages of one task on one melody:
  plan the cadences, the chords, the bass, the figures, the inner voices, the diminution, each stage
  taking the player's own earlier choices as given, a stage skipped filled from Bach or Kittel.
- **B. The atlas** (Bach's 370 settings searchable by phenomenon): only where it serves the course,
  e.g. the examples behind a habit, Bach's settings to hear and read (level 0).
- **C. The generator and its lab**: the other session's (branch `claude/chorale-fugue-generation-fbclx4`,
  `src/chorale/generate/`, decisions in a G series). Its settings may later stand in the course as
  further answers beside Bach's and Kittel's. It judges its inner voices by `src/chorale/level5.ts`.
- **D. Checking the readings** the judgments rest on: a precondition of the course, done by this
  session, the owner consulted where the sources run out.

## Phases

1. **Consolidate.**
   - One chorale workbench instead of seven views: one melody, the levels as stages, the player's
     choices carried forward, missing stages filled from Bach or Kittel. First version done (C26):
     the stages carry the answers forward on the existing screens; next, one screen whose score
     grows stage by stage.
   - D, the readings the judgments use: Kirnberger's categories against his text (done for
     *Kunst* I, C22; *Kunst* II and *Die wahren Grundsätze* remain); the cadences classed "other"
     (249 read by the fundamental bass, C22; 45 remain); Kittel's basses proofread against the
     print where the machine check flagged them (done, C25); the owner's C10-C12 confirmations.
   - `level5.ts` split into per-chord and chord-to-chord checks for the generator to share.
2. **The path.** Melodies ordered by measured difficulty (phrases, cadences leaving the key,
   chromaticism; Kittel's 24 first, then Bach's tunes); progress and unlocking as in the Fux mode;
   tutorial lessons for each stage.
3. **Depth.** Local keys inside modulating phrases (the habits now read every chord in the home
   key); the modal chorales; the generator's settings as further comparisons.

## Not this session's

Playback and interface (the chorale's performance: fermatas, cadences, breathing; the screens'
live changes) belong to a session of their own, opened by the owner on 11 October 2026.
