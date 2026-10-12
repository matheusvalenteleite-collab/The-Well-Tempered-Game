# Chorale mode: audit (12 October 2026, C35)

The audit delivered to the owner before C34, kept here for the session that continues the chorale work.

## Findings

1. **The data pipeline was not reproducible.** The regeneration order lived only in a scratchpad script;
   it is now `tools/chorales/regen.sh` (bach_analyse, kittel_analyse, principles, cadence_plans,
   harmony_plans, bass_plans, figure_plans, voice_plans, study_data, listening_notes). `package.json`
   covers only part of it, and the Python tools have no tests.
2. **The local keys are unvalidated.** They are the generator session's HMM reading
   (`data/chorales/local-keys.json`, imported by `import_local_keys.py`), never checked against human
   analyses (a candidate corpus, When in Rome, has not been checked for coverage). 43 closes still read on V.
3. **Four of Kittel's melodies (8, 16, 22, 24) have no aligned Bach setting**: no local keys (home key
   throughout) and no Bach comparison.
4. **The 27 commentators' notes are unverified** against their sources.
5. **Seams in the workbench**: stage 4 leaves the player's bass for Kittel's nearest one (a seam only
   for the melody-down route; bass-up, C34, it is the historical starting exercise); stage 5 ignores the
   player's stage-4 figures; the option lists at stages 2-3 cue the answers.
6. **No path, progress or tutorial** orders the stages into a course.
7. **The stage-5 judge is not calibrated** on Bach's own settings (how many warnings Bach himself draws).
8. **`src/ui/ChoraleWorkbench.tsx` is a monolith** (~760 lines).
9. **`claude/continuo-integration` is far ahead** of the default branch; merge only when the owner asks.

## Recommendations, in order

1. Pipeline: wire `regen.sh` into `package.json`, add smoke tests for the Python tools.
2. Calibrate the stage-5 judge on Bach's settings.
3. Validate the local keys against a human analysis.
4. Close the seams (figures from the player's own bass; stage 5 reading stage-4 figures; fewer cues).
5. The path, with both routes: bass-up after C. P. E. Bach's account (figured bass realised, inner voices
   over a given bass, then devising basses) and melody-down.
6. Verify the commentary; finish Kunst II and Die wahren Grundsätze.
7. Split the workbench.

## Open offers

- The playback session proposed a **style yardstick** (a profile of the 370 by voice motion, harmonic
  rhythm, suspensions, incidental notes, cadences by phrase, bass motion, ranges and leaps, and a
  per-dimension departure report for generated chorales for the test bench). Accepted in principle on
  two conditions (no single grade, per C23; the cadence dimension flagged until the local keys are
  validated); not assigned by the owner.
- Hymn texts under the soprano: the playback session's `lyric` field and `chorale_texts` syllables;
  ChoraleStudy to show them when the data exists. The data exists on `claude/playback-interface`
  (a2fe5e2): `data/playback/chorale-lyrics.json`, `{ "chorales": { "chor001": [syllable | null, ...] } }`,
  keyed like chorale-fermatas.json (chorNNN = study n), one entry per soprano note of study.json in order
  (all 367 texted chorales match). Syllables as printed ("mei-", "-nes", "1*. Es"); for display strip with
  `x.replace(/^\d+\*?\.\s*/, "").replace(/^-/, "")`. Set `lyric` on the soprano WtcScoreNotes only; the
  file is 128 KB, so import it lazily in ChoraleStudy.
