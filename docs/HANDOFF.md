# Handoff (10 October 2026, night)

Read this first in a new session. The decisions log (`docs/DECISIONS.md`: D1–D139 and D147 on for the game,
D140–D146 for the tutorial (the next free number is D165), C1–C35 for the chorale mode (next C36)) has the details; `docs/MORNING.md` has
older notes and the owner's open questions.

## How we work from now on (the owner's choice, after a usage warning)

- **One session at a time** on this repository, on branch `claude/continuo-integration`.
  The other sessions (lab, chorales, tutorial, Ledbetter, older ones) are stopped or archived; their
  pushed branches remain.
- **Short, scoped sessions**: one item, a definite end, then commit, push, publish and stop.
  No open-ended "go as far as you can" runs; no screenshot loops beyond what the change needs.
- The owner merges `claude/continuo-integration` into the default branch
  `claude/fux-gradus-two-voice-dataset-ouu87h` by pull request; GitHub Pages
  (https://matheusvalenteleite-collab.github.io/The-Well-Tempered-Game/) rebuilds from it.

## Chorale mode: where the analysis session left it (C35)

The chorale analysis session closed on 12 October 2026. Its audit, recommendations and open offers are in
`docs/chorales/AUDIT.md`; the data regenerates with `sh tools/chorales/regen.sh`. Nothing is half-done.

## Publishing

- Tests: `npm test` (264). Builds: `npm run build` (Pages, split into chunks) and
  `npm run build:artifact` then `node tools/build-artifact.mjs <out.html>` (one file, 14.4 MB of a
  16.8 MB ceiling: D156 made room, C15 took 1.9 MB of it).
- claude.ai artifact: https://claude.ai/artifact/NvkaBGCHrtDebE85H7udTX (private). It holds 501 of
  511 files (instrument samples and Ishizaka's 48 tracks): publish the page alone, no new files.

## State of the Well-Tempered Clavier mode

- Study of all 48 preludes and fugues (Humdrum corpus, David Huron; private use, the owner accepts
  the rights note): roll, Score and Page views (Page: Gerubach-style, voices change staff, chords,
  two systems), voices solo/mute/spotlight, sections and moments, the companion (commentary on
  every moment, "listening with you" line while playing, hand notes on 14 pieces in
  `src/wtc/notes.ts`), harmony strip (low priority), workshop, "Where next?" game.
- Recordings: Book I Kimiko Ishizaka (CC0), Book II Arthur Loesser 1964 (CC BY-NC-ND, streamed
  from the Internet Archive), bar-aligned (`data/recordings`, `tools/align-recording*.py`).
- Exercises (exposition: real/tonal, answer, countersubject with Bach's licences, find the
  entries) on 29 ASAP fugues.
- Also in the game: Fux species in two, three and four voices, continuo, tutorial (tutorial session),
  chorale mode and "WTC · preludes and harmony" (chorale session).

## Waiting, in the owner's order

1. **The owner listens**: recordings (does the bar highlight follow? the E minor fugue of Book II
   is the least steady alignment), the companion's texts, the Page score. Act on what they report.
2. **Ledbetter check** (done in part, D136–D137: strettos, pedals, later subjects, his sections; left: the harmony's cadences, which show only changes of key, and four emendations of the hand notes listed in D136; `node tools/wtc/ledbetter-game.ts` re-measures): session "Ledbetter's WTC book in Markdown" pushed branch
   `claude/vibrant-gates-fe6o3h` with 491 of Ledbetter's claims checked against the score
   (`docs/wtc/ledbetter/claims-score-check.md`). Merge its findings; use them to correct entries,
   sections and the companion where they disagree, and to add notes for more pieces.
   The lab session (stopped, not archived) also pushed to `claude/beautiful-mccarthy-7li5nv` its own
   analysis checked against the score (entries 90%, strettos 77%, cadences 62%, pedals 58%; 22 claims
   corrected): compare with this game's `src/wtc/library.ts` entries before changing them.
3. **Optional**: the lab's licence-safe fugue corpus (Kyle Rother's open-score edition, CC BY 4.0;
   `data/wtc/fugues-open.json` on `claude/beautiful-mccarthy-7li5nv` at 8be67d0). Only if the game
   is ever made public.
4. **The Fux mode is complete (D148, D152)**: two, three and four voices, every exercise of the 1725
   print and every task it sets (three voices: the modes left to private study and the species
   combined, Fig. 134; four voices: Exercitium III). For the owner to confirm: the readings beyond the
   text listed in D148 and D152; p. 139 (after Fig. 204, outside the vendored pages); Fig. 110's
   B flat (D116). The Lectio for three and four voices is built (D153; its scans pp. 91-138 load in
   the artifact only once the site carries this branch). Tutorial lessons for three-voice species 2-4 and
   four voices (D154); undo, saving pieces and export in three and four voices (D155).
5. **Learnability and accessibility (D149)**: the audit's first two items are done (keyboard, orientation).
   The harmony chapter is in the tutorial (D150); contrast and signs beside colour are done (D151).
   Left, in order: a spoken account of the score (live region: bar, note written, cantus) and a text
   view; targets under 24 px; reduced motion (rule demos loop, pulses, smooth scrolling); focus traps
   in dialogs; `.help` hidden on phones (it hides three WTC checkboxes and the credits).
6. **The chorale mode** (C4 conception, `docs/chorales/CONCEPT.md`): levels 1-4 on Kittel's 24 melodies
   (C5, C10-C12, the owner still to confirm C10-C12); Bach's 370 settings to hear and read with their
   cadences, figures, fundamental bass and incidental notes (C15). Level 5, the voices over Kittel's
   figured basses, in Bach's style alone (C16, C17), with warnings of three gravities and no errors (C21). No. 320, bar 8 checked in the later Breitkopf
   print (plate 12021): the consecutive fifths are there (the 1784-87 first edition not seen).
   Bach's own settings beside the player's at level 5 (C18); level 6, diminution on Bach's chorales reduced to chord tones (C19). Every level of CONCEPT.md is now on screen. The long-term plan is `docs/chorales/ROADMAP.md` (C20): one workbench, the readings checked, then the path. The generator
   (other session, branch claude/chorale-fugue-generation-fbclx4, src/chorale/generate/) is theirs;
   they were asked to judge their inner voices with src/chorale/level5.ts and to number decisions G1...
7. Old backlog, last: evaluation redesign and graded three-voice reading with Fux; rule
   demonstrations; the Mann layer.

Known faults: Book I C♯ minor fugue misses the second soprano's entry at bar 12 (altered head);
harmony reading noisy in contrapuntal textures; prelude strands are guesses (figuration preludes
are shown as one texture).
