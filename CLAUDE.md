# The Well-Tempered Game: notes for every Claude session

Bach played on a sideways phone with two thumbs (Vite + React + TypeScript, Web Audio). The owner is a philosophy professor, not a programmer: report in plain English, concisely, and lead with what they need to decide or hear.

## Where things are
- **Dev branch:** `claude/wtc-touchscreen-game-pzwxs4`. **Deploy branch (GitHub Pages):** `claude/fux-gradus-two-voice-dataset-ouu87h`; deploy = PR dev → deploy branch, merged.
- **Live site:** https://matheusvalenteleite-collab.github.io/The-Well-Tempered-Game/play.html. The version mark is in `src/bench/version.ts` ("WTC x.yy"); bump it by 0.01 per deploy.
- **docs/DECISIONS.md** is the index; the log is split by number into `docs/decisions/` (`grep -n "^| D123 " docs/decisions/*.md`). Every decision is a D-number row; the code cites them (`D123`). Take new numbers from the end of the newest range file (next: D1079) and say which.
- **docs/BACKLOG.md:** what is approved, parked or paused, newest first. Read it before starting.
- **docs/audits/CODE-AUDIT-PHASE1.md:** the code audit. Phase 2's quick wins are done (D1050-D1053); what remains is in BACKLOG. **docs/PROJECT-BRIEF.md:** a two-page description of the game to paste into Claude chat.

## Checks before any merge or deploy
`npx tsc --noEmit -p .` (no memory flag needed any more) · `npm run test:full` (everyday work: `npm test`, the quick tier, which skips the 14 exhaustive files listed in `test/full-tier.txt`; the Pages build runs the full tier) · `npx vite build` · `node tools/touch/thumb-reach.cjs` (needs `npx vite preview --port 5310` running). End commits with the attribution lines the session gives.

## The owner's standing rules (never break without asking)
- Whole works only; **never add notes**. Ornaments come from the print, and written trills are always played. Editors' standard solutions of puzzle canons are allowed.
- **Loudness is never tied to the score.** The bass stays audible. Any loudness effect on the player's own voice is subtle (D508).
- **No words or tags drawn in play** for morphs, canons or entries. No strobe.
- Legato = passing a note from thumb to thumb; never teach hold-and-lift. Don't offer dull lines as the player's part.
- Live hit-tests at 932×430 and 667×375. Invented names only for the WTC pieces. MORE BACH stays behind the ricercar.
- **No sound change ships without the owner listening** (a listening page with A/B clips); pure level refits that fix a rule violation may ship without that.
- ZELENKA TRIO, FLUTE & HARP and BACH BRASS stay (D1067; a player's favourites). "Drag"/"slide" = vertical, "sway" = sideways (D1068).
- Plan and show prototypes before a big build. When the owner says "choose the best", choose, and say what you chose.

## Working style (to save the owner's tokens)
- **One or two worker sessions at most.** Workers report only when something is ready to see or decide, never with progress notes.
- **Don't inspect every frame.** Look at screenshots or video frames only when the change is visual and the risk is real (new visuals, layout changes, a reported visual bug). For routine changes, passing tests and hit-tests are enough.
- Use the strongest model only for design and judgement; routine merges, refits and imports can use a cheaper model or lower effort.
- Start fresh sessions rather than letting one run for days; this file plus BACKLOG carries the context.

## Released and pending (as of 24 Nov 2026)
- **Live:** WTC 3.41: the SHEET display modes and `public/sheet` retired (D1077; nothing audible changes; the ornament-slur switch stays off, the two listening pages under /dev/shake-slur and shake-slur2 are out). 3.40: the strings' slide is the glissando timed by the thumb (D1073, approved by ear). 3.39: the strings' slide listening page (D1072, developer-only: …/dev/strings-slide/; the fix and the glissando behind `MECH.slideGlide`, off, waiting for the owner's pick). WTC 3.38: TEST SCENES in the developer view's SETTINGS (D1069-D1070: one tap to a piece, sound, voice and moment; the guitar scenes on exposed guitars, ABBEY ROAD's clean first); the TILT RETIRED (D1071: off for every player, parked for research; the developer view's TILT (PARKED) switch, default off). WTC 3.37: Batch 2 (D1061-D1066), every guitar's hands (pick position, hard pick, quarter-tone bend/vibrato, hammer-on/pull-off, glide slides), the main game's default; the developer view's GUITAR HANDS turns it off. 3.36: string bowing (D1055-D1059, `MECH.bow`) the default for STRING CONSORT (D1060); NEW MECHANICS turns it off; the New Lab has it too. Before it: 3.34 (per-piece notes split, D1054; Canons batch B #496; the Musical Offering voicing #498; the Phase 2 quick wins).
- **Owner's top priority (24 Nov):** horizontal and vertical gestures that let the player improvise on the sound ("I'm rediscovering the game, and it rocks"). Batch 2's guitar hands are live (the tilt retired, D1071); the owner is testing guitars (TEST SCENES). Next in BACKLOG: the strings' slide as glissando (a listening page), then PSYCH's guitar plain at the tap with effects by gesture (approved to prototype); Batch 3 after ("Instrument gestures, by batches").
- **Owner to do:** run `sh tools/delete-merged-branches.sh` from a computer with push rights (211 merged branches, see `docs/audits/MERGED-BRANCHES.md`); set GitHub's default branch to the dev branch.
- **Open, unmerged:**
  - #474, prelude ABOUT notes: the owner hasn't read them;
  - older studio PRs #182, #374, #380: stale, to triage.
