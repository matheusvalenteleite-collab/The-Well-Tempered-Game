# Handoff (10 October 2026, evening)

Read this first in a new session. The decisions log (`docs/DECISIONS.md`: D1–D135 for the game,
D140–D146 for the tutorial, C1–C14 for the chorale mode) has the details; `docs/MORNING.md` has
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

## Publishing

- Tests: `npm test` (231). Builds: `npm run build` (Pages, split into chunks) and
  `npm run build:artifact` then `node tools/build-artifact.mjs <out.html>` (one file, 16.6 MB of a
  16.8 MB ceiling: the artifact must not grow much more without splitting data out).
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
- Also in the game: Fux species in two and three voices, continuo, tutorial (tutorial session),
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
4. **Four voices in the Fux mode** (the owner's next priority, D139): source found and public domain. The
   *species* dataset already vendored for two and three voices (`tools/fux_import/fetch_source.sh`, commit
   5c7cae4) has Part III: Figs. 160–204, 32 exercises in Humdrum (CC0), and the 1725 pages to p. 138
   (`source_pdf/gap_p122.pdf` = p. 114, Exercitium III's opening). Next: vendor Part III and pp. 91–138,
   read the four-voice rules from the print, a four-voice screen like the three-voice one.
5. Old backlog, last: evaluation redesign and graded three-voice reading with Fux; rule
   demonstrations; the Mann layer.

Known faults: Book I C♯ minor fugue misses the second soprano's entry at bar 12 (altered head);
harmony reading noisy in contrapuntal textures; prelude strands are guesses (figuration preludes
are shown as one texture).
