# The Well-Tempered Game: code audit, Phase 1 (read-only survey)

Branch `claude/wtc-touchscreen-game-pzwxs4` at `446f35d` (2026-11-23). Nothing in the repo was changed. All builds, reports
and scripts went to the scratch folder (see appendix).

## (a) Summary for a non-programmer

1. The game works and is carefully tested (1,866 tests, all passing). Type safety is strict, and almost no code is copied and pasted (1.4%). The friend's "mess" is mostly about **size and organisation**, not quality.
2. The biggest thing players feel is the **first download**: before the card grid appears, a phone fetches about **1.7 MB compressed (6.3 MB raw) of code and data**. That includes the notes of all 97 WTC pieces, retired tutorial texts and an MP3 encoder nobody uses at that point. On a slow mobile connection the grid took about **14 s** to appear in our test. This can be cut by half or more.
3. A handful of huge files (5,000+ lines) and one 2,400-line screen component hold many unrelated jobs. That makes every future change slower and riskier. They can be split gradually without changing what the game does.
4. Switched-off and retired features (the old MANUAL tutorial, TWO HANDS, the other readings and so on) are still compiled into what players download.
5. Housekeeping is cheap to fix: 137 old branches are already merged, there's a stray file at the root, the decisions log is one 1.8 MB table, there's no automatic code formatter, and the test suite takes about 5 minutes (one test alone takes 2¼ minutes).

## (b) Findings ranked by payoff

### 1. The play page downloads far more than it needs before the first screen (high payoff: players)
- **What:** `play.html` loads 9 JS chunks and 3 CSS files at once (`modulepreload`). That's 6.30 MB raw and 1.67 MB gzip. The single largest is the chunk named `piano-*.js` (4.41 MB raw, 1.08 MB gzip).
- **Evidence:** the contents of the eagerly loaded chunks (rollup-plugin-visualizer, sizes before minification, then gzip):
  | content | raw | gzip |
  |---|---|---|
  | all 97 WTC scores, `data/touch/pieces.json` (48 preludes 0.89 MB, 48 fugues 1.55 MB) | 2.53 MB | 541 KB |
  | `data/touch/readings.json` (Busoni plus the Keller/Bodky/Riemann readings that play.html does not offer: `OFFER_READINGS = false`, src/touch/readings.ts:234) | 660 KB | 88 KB |
  | tutorial/manual/lessons code (src/bench/manual/*, lessons.ts, howto) | 341 KB | 101 KB |
  | manual/course translations (src/i18n/manual-*, course-*, course2-*) | 271 KB | 90 KB |
  | MP3 encoder `@breezystack/lamejs` (the `export-*.js` chunk, needed only to save a take) | 259 KB | 67 KB |
  | recordings JSON (`notes-*.js`: data/recordings/*) | 132 KB | 42 KB |
  | `src/audio/sample-manifest.ts` (offsets for 3 formats x 1,702 files) | 124 KB | 28 KB |
  | the alternative skins (src/touch/ui/arcade, retro, pixel, engraved, strip; the game forces "classic", lite-main.tsx:26) | 67 KB | 22 KB |
  | lab/glenn/takes/film code | 62 KB | 23 KB |
  | the rest of the game code, React, card pictures | ~3.2 MB | ~0.9 MB |
- **Measured** (Chromium, 932x430, DPR 3, 4x CPU throttle, 150 ms RTT and 1.6 Mbit/s down, gzip served): first DOM content at **10.1 s** after 1.70 MB transferred. The grid was usable at **13.9 s** (2.15 MB; this includes ~1.2 s of our intro tap waits), and 2.60 MB had arrived after 3 s idle on the grid. With the CPU throttled but no network throttle: first DOM at 1.4 s.
- **Why it matters:** this is the first impression on every phone, and it gets worse on poor connections. The offline worker caches it afterwards, so repeat visits are fine.
- **Phase 2 fix (in order of ease):**
  1. Load lamejs with `import()` when SAVE is pressed (`src/audio/export.ts`).
  2. Split readings.json into a Busoni-only part and lazy-load the rest.
  3. Load the manual/course i18n and the manual code lazily, only in the developer view.
  4. Split `pieces.json` into a small index for the grid (titles, keys, voices) plus one lazily fetched file per piece, the same pattern already used for MORE BACH and the concertos (`loadExtras`, src/touch/fugue.ts:196).
  5. Check whether the sample manifest can carry only the format the device uses.
- **Expected:** the eager download falls from ~1.67 MB to roughly 0.6–0.8 MB gzip (an estimate).
- **Risk:** low for steps 1–3, medium for step 4, which touches the loading path that every piece uses. **Proof:** the tests, identical screenshots of the grid and of a piece in play (tools/touch/mo-stills.cjs pattern), the same notes judged in a scripted run, and a before/after bundle report.
- **Effort:** steps 1–3 small; step 4 medium.

### 2. Giant files and one giant component (high payoff: cost of every future change)
- **What:** a few files each hold many jobs, so any change means reading thousands of lines and risks side effects.
- **Evidence (lines / characters):**
  | file | lines | chars | mixed responsibilities |
  |---|---|---|---|
  | src/bench/proto-game.ts | 5,525 | 343 k | The real game engine (note picking, judging, scoring, entries, lens, ornaments, demo plans, logging) in one file with 64 imports, despite the "prototype" name. |
  | src/touch/chip.ts | 5,327 | 292 k | The whole audio engine: synth voices, sampled-note playback (`sampledNote` 505 lines, :2566), patch playback (`patchNote` 409 lines, :3130), FX input, metronome, drum gain tables, room. 105 exports, imported by 151 files. |
  | src/touch/stage-bg.ts | 5,574 | 278 k | 48+ hand-drawn fugue "worlds" (canvas painters) plus the shared sprite and drawing helpers, all in one file. |
  | src/touch/sound.ts | 2,996 | 266 k | Instrument presets (data), wave shapes, seat tables and helper code. 215 exports, 78 lines over 300 characters. |
  | src/bench/BenchApp.tsx | 2,850 | 179 k | The whole player app shell. The `BenchApp` component alone is **2,416 lines** (:297), with 96 `useState`/`useRef`, 20 `useEffect` and 65 `APP.lite` branches: the developer bench and the player page interleaved. |
  | src/touch/sampled.ts | 1,497 | 111 k | Sample loading, format probing, caching, instrument tables. |

  Other very long functions: `paintClassic` (MusicBox.tsx:363, 586 lines), `play` (proto-game.ts:3749, 490 lines), `highway` (paint-proto.ts:276, 437 lines). In the old counterpoint app: `App` (ui/App.tsx:97, 1,196 lines) and `WtcStudy` (ui/WtcStudy.tsx:92, 1,025 lines). Across the codebase, 43 functions run over 200 lines and 12 over 500.
- **Hub modules** (number of files importing them): touch/fugue.ts 106, music/pitch.ts 86, counterpoint/layout.ts 64, i18n 50, touch/sound.ts 41, touch/chip.ts 27 (madge, src only). Tests: chip.ts 151 and sound.ts 158 including tests.
- **Phase 2 fix:** move-only refactors, one file at a time, with no logic changes:
  - stage-bg.ts into one file per world plus shared helpers (it has only 4 imports and 8 exports, so it's the easiest and safest first move);
  - sound.ts into preset data and code;
  - chip.ts into synth, sampled, drums and metronome;
  - BenchApp into the player shell and the developer bench, pulling state into hooks.
- **Risk:** medium (the files are large and stateful). **Proof:** tsc, the full tests, byte-identical offline audio renders of a fixed set of pieces and sounds (tools/playback/ has render tooling to adapt), and identical screenshots of each world.
- **Effort:** large overall, but every step stands alone.

### 3. Frame rate during play on a slow phone (potentially high payoff: needs a real-device check)
- **Measured:** WTC I/2 in play, 4x CPU throttle. Over 12.4 s of gameplay: **19–28 fps**, median frame 33–50 ms, p95 67–100 ms, max 133–250 ms (three runs). Unthrottled it holds a steady **60 fps** (p95 16.8 ms).
- **Where the time goes** (CDP profile, mapped through source maps): 72% "(program)", which is browser internals (canvas rasterising and compositing; headless Chromium draws in software). Only about 17% is our JS, led by MusicBox.tsx `paintClassic` (2.2%), stage-bg.ts `paintStage` (1.1%) and `fillRect` (2.5%).
- **Caveat:** headless software rendering exaggerates canvas cost, so this is not proof of a problem on a real phone.
- **Phase 2 fix:**
  - First measure on a real mid-range Android over Chrome remote DevTools, and an older iPhone.
  - If it confirms: cache each world's static layers in an offscreen canvas, and cap the backing-store DPR for the stage (PlayArea.tsx:57 already caps for targets).
- **Risk:** medium (visual). **Proof:** identical screenshots plus frame-time numbers.
- **Effort:** measuring is small; fixes are medium.

### 4. Retired and switched-off features still compiled into the player's download (medium payoff: players and maintenance)
- **Evidence:**
  - The old tutorial THE MANUAL: src/bench/manual/ (3,943 lines), including `retired.ts`, which is "kept as data only, for their tests" (retired.ts:1–7). Its translations (manual-es/pt and course-es/pt/course2-es/pt, 2,600+ lines) sit in the eager chunk, although play.html runs with "no tutorial" (src/bench/config.ts:2–4).
  - TWO HANDS: `TWO_HANDS_RETIRED = true` (src/touch/two-hands.ts:24), with 31 references remaining.
  - Flags set to off: `OFFER_READINGS = false` (readings.ts:234), `FILM_OFFERED = false` (bench/takes/film.ts:42) and `SYNTH_LAYERS_SOUND = false` (subject-fx.ts:487). Also "the other patches are kept for later" (sound.ts:8).
  - Five of the six UI skins are unused on play.html.
  - The echo lane (D990) is already gone: only 2 comments mention it, so nothing to do there.
- **Phase 2 fix:** for each item, the owner decides between delete and keep-for-developer-view. Kept items go behind `import()` so players never download them. Tests that exist only to exercise retired code are deleted or moved with it.
- **Risk:** low to medium. **Proof:** tests, plus a bundle report showing the modules gone from the play chunks, plus identical play screenshots.
- **Effort:** medium (mostly decisions, then deletions).

### 5. Slow test suite (medium payoff: speed of every change)
- **Evidence:** `npm test` took **4 min 53 s** wall time (13 min 46 s CPU on 4 cores); 1,866 tests in 366 files, all passing. The slowest single tests:
  - 134 s: "every prototype can be played right through…" (test/bench-protos.test.ts)
  - 53 s: D378 Glenn ornament gestures (test/d378-glenn-default.test.ts)
  - 39 s: D214/D217 perfect two-row run
  - 35 s: D221 every Book I fugue on LADDER/HIGHWAY
  - 28 s: D221 SUBJECT line
  - 19 s: D628/D644 worlds' effects
  - ten more between 4 and 17 s

  These are slow because they **simulate whole pieces**: every fugue, every voice, every prototype, every sound. None renders audio offline (no `OfflineAudioContext` in any test).
- **Phase 2 fix:** tag the ~15 exhaustive tests as a "full" tier that CI and pre-release always run, and keep a quick tier for everyday local runs. Also drop prototypes nobody plays any more from the exhaustive loop.
- **Risk:** low (no product code changes). **Effort:** small.

### 6. Developer-machine cost: typecheck uses 2.5 GB of memory (medium payoff: tooling)
- **Evidence:** `tsc --noEmit` takes 41 s total (34 s checking, 1,256 files) and uses **2.53 GB** of memory, which is why `--max-old-space-size=4096` is needed. Production build: 38 s.
- **Likely cause (a hypothesis to confirm):** tsc infers literal types for the multi-megabyte JSON imports (`resolveJsonModule`, with pieces.json, concertos.json, more-bach.json and chorale levels up to 1.3 MB each).
- **Phase 2 fix:** give the big JSON files hand-written type declarations (`allowArbitraryExtensions` is already on), then re-measure with `--extendedDiagnostics`.
- **Risk:** low (types only; the bundle should be byte-identical). **Effort:** small.

### 7. Misleading names for the real game (medium payoff: readability for any newcomer)
- **Evidence:** the player's game is `src/bench/BenchApp.tsx`. Its file header calls it "The testbench (D170…): prototypes of the instrument". It is driven by `src/bench/proto-game.ts`, "The testbench's game", and launched by `src/bench/lite-main.tsx`. The main code chunk is named `piano-*.js`.
- **Why it matters:** a professional opening the repo concludes it is prototype code. That is part of why it looked like "a mess".
- **Phase 2 fix:** rename folders and files (bench to game, proto-game to engine, and so on) after the splits in finding 2, so the moves happen once.
- **Risk:** low (tsc catches every import). **Effort:** small to medium (churn in test imports).

### 8. Repository housekeeping (low risk, quick wins)
- **Branches:** 235 remote branches (one more besides HEAD since the earlier count). **137 are fully merged** into the dev branch and can be deleted safely. 98 are not merged (81 last touched in Nov 2026, 17 in Oct; 15 have 1–3 commits of their own), so the owner should triage them. GitHub's default branch is `claude/fux-gradus-…`, not the dev branch, but it differs only by merge commits (98 merge commits ahead, dev 5 ahead; diff touches 20 files). Consider making the dev branch the default, so visitors see the current code.
- **docs/DECISIONS.md:** 1.77 MB in 990 table rows. The average row is 1,800 characters, the longest 11,090. It doesn't render readably on GitHub. The code cites it 8,716 times (`D123`-style references), so it is load-bearing. Fix: keep the IDs, split the file by range (D0–D199, …) or into one file per decision with a short index table.
- **Stray file:** `x.tmp.ts` at the root, tracked since 2026-11-09, is a 6-line debugging script. Delete it.
- **Repo weight:** `.git` is 459 MB. `public/samples` holds each of 1,702 recordings in 3 formats (MP3 56 MB, Opus 32 MB, AAC 37 MB). That is by design, see section (c).
- **Risk:** low. **Effort:** small.

### 9. No formatter or linter (lower payoff: consistency)
- **Evidence:**
  - There's no ESLint, Prettier or Biome config or dependency.
  - Yet the code has 42 `eslint-disable-next-line react-hooks/exhaustive-deps` comments for a linter that never runs.
  - 5,194 source lines are over 160 characters and 173 over 1,000. Many of those are data tables (e.g. `KIT_RMS`, chip.ts:481), which is fine. But code lines up to ~500 characters are common in sound.ts and chip.ts.
- **Phase 2 fix:**
  - Add Prettier with a long print width, plus ESLint with react-hooks.
  - Reformat in one isolated commit (it changes no behaviour) and exclude the generated/data files.
  - Lint then catches real hook-dependency bugs.
- **Risk:** low. **Proof:** tsc, tests and an identical minified bundle. **Effort:** medium (one big diff to review once).

### 10. The older counterpoint app (index.html) is still built and deployed (owner decision)
- **Evidence:**
  - The production build has 6 pages: index, play, touch, bench, lab and soundlab. `continuo-dev.html` and the separate `lab/index.html` (vite.lab.config.ts) are not in it.
  - index.html is the species-counterpoint, chorale and WTC-study app. Its chunks: `main` 4.2 MB raw, which includes all four VexFlow fonts (~0.7 MB, probably only one used), and `fux-two-voice.game.json` at 1.3 MB. ChoraleApp is 3.6 MB, study 2.5 MB and library 2.2 MB. Its 46 scan JPGs are inlined as base64 JS chunks (~100 KB each, which base64 makes 33% larger).
  - Players of play.html never download any of this.
  - Most of the duplicated code is here: QuartetApp/TrioApp share ~634 lines, and PlanApp/PreludeApp and the Chorale screens share more.
- **Phase 2 fix:** the owner decides whether the app is still a product. If it is, load one VexFlow font, ship the scans as image files and merge Trio/Quartet. If not, remove it from the production inputs.
- **Risk:** low. **Effort:** small (deciding) to medium (cleanup).

### 11. Import cycles (low payoff)
- madge reports 82 cycles, but **74 involve type-only imports**, which don't exist at runtime. Only **8 runtime cycles** remain, in 4 knots:
  - touch/ui/* with MusicBox.tsx (9 files)
  - bench/paint-* (4)
  - ui/WtcRoot with Answer/Plan/Prelude (4)
  - bench/Selection with FugueAbout (2)
- None is causing a known bug. Fix them in passing during the splits in finding 2. Low risk, small effort.

### 12. Unused exports (cosmetic)
- knip lists 632 unused exports and 339 unused types. Spot checks show these are mostly internal constants marked `export` but used only inside their own file (e.g. 19 tuning constants in score-drums.ts:119–149).
- No unused source files: the 11 that knip flags are entries it can't see. src/lab/* is used by lab/index.html and continuo/dev/harness.ts by continuo-dev.html.
- Fix: let the linter (finding 9) flag them over time. Not worth a dedicated pass.

## (c) Not a problem: leave alone

- **The large data files are just data.** concertos.json (4.4 MB), more-bach.json (2.9 MB), chorales.json (2.6 MB), `drum-peak-data.ts` (331 KB in 12 lines), `world-sfx-data.ts` and `pictures-data.ts`. MORE BACH, chorales and concertos already load only on demand (fugue.ts `loadExtras`). Vite's `json.stringify` already turns JSON into a fast `JSON.parse` string, so shipping it inside JS costs no more than a .json file (both are gzipped in transit).
- **Samples are already well compressed.** Each recording exists as Opus .webm (~70 kbit/s), AAC .m4a (~79 kbit/s) and MP3 (128 kbit/s). The player probes the browser and downloads only one format (sampled.ts:1191–1230). All sample sets are referenced by code. Lower bitrates would save little and risk sound quality.
- **data/ holds mostly build inputs.** data/sources (14.7 MB), data/source (2.0 MB) and most of data/chorales (34 MB, of which 4.6 MB is imported) never ship. What ships is what src imports (data/touch is essentially all of it).
- **Copy-paste is low.** The duplication is 1.4% of lines (1.7% of tokens). Most of it is in the older counterpoint app (finding 10), not the game.
- **Type safety is strong.** `strict: true` and `noUnusedLocals` are on. There are 0 `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`, 27 `any` in 133k lines, 6 non-null `!.` and 58 `as unknown as`. That is good.
- **Comments are plentiful.** About 18% of lines are comments (23,483 of 132,645) and they explain intent. The `Dnnn` references are a strength once DECISIONS.md is readable (finding 8).
- **The echo lane (D990) is already removed.** Only 2 comments mention it.
- **The very long lines in chip.ts and sound.ts are mostly data tables** (lookup tables of gains, RMS values and seats), not tangled logic.
- **The service worker and offline caching** (tools/play-app/sw-plugin.ts) are sensible: it pre-caches only chunks under 256 KB plus the shell.
- **No orphan source files** (see finding 12).

## (d) How measured

S=/tmp/claude-0/-home-user-The-Well-Tempered-Game/4f235f47-6dbe-5194-91ff-329ec435ea40/scratchpad/audit. The audit tools went into `$S/tools` with `npm i madge@8 jscpd@4 source-map-explorer@2 typescript@5 rollup-plugin-visualizer@5 source-map@0.7`.

```sh
cd /home/user/The-Well-Tempered-Game
# sizes
find src -name '*.ts' -o -name '*.tsx' | xargs wc -lc | sort -k2 -n -r | head -22
# longest functions (TypeScript AST)
node $S/longfn.cjs $S/tools
# cycles (all imports, then runtime-only via madge API with skipTypeImports, Tarjan SCC)
npx --yes madge@8 --circular --extensions ts,tsx --ts-config tsconfig.json src
node $S/madge-scc.cjs $S/tools
npx --yes madge@8 --extensions ts,tsx --ts-config tsconfig.json --json src   # fan-in hubs
# duplication
$S/tools/node_modules/.bin/jscpd src --min-tokens 70 --reporters json --output $S/jscpd --silent \
  --format typescript,tsx --ignore "**/*-data.ts,**/sample-manifest.ts"
# dead code (config in $S/knip.json: entries = the 7 page mains, tests, tools, vite configs)
npx --yes knip@5 --config $S/knip.json --reporter json --no-progress
# production build with source maps, outside the repo
NODE_OPTIONS=--max-old-space-size=6144 npx vite build --outDir $S/dist --emptyOutDir --sourcemap
# module-level bundle report: external config importing vite.config.ts and adding the visualizer
npx vite build --config $S/tools/vite.audit.config.mjs     # writes $S/viz.json; analysed by $S/viz.cjs
# eager set of play.html: the <script>/<link> tags in $S/dist/play.html, sized raw and with gzip -9
# runtime: gzip static server + Playwright (Chromium from /opt/node-tools)
node $S/serve.cjs $S/dist 5398 &
node $S/perf.cjs                        # 932x430, DPR 3, isMobile, 4x CPU, 150 ms / 1.6 Mbit/s
NET=0 node $S/perf.cjs                  # CPU throttle only
RATE=1 NET=0 node $S/perf2.cjs          # no throttle (baseline)
RATE=4 NET=0 PROF=$S/play.cpuprofile node $S/perf2.cjs && node $S/agg.cjs $S/play.cpuprofile $S/tools $S/dist
#   (opens WTC I/2 via #name-wtc1f02, then #sel-play; frames counted until the result screen appears,
#    since nobody plays and "the crowd leaves" around bar 4)
# tests
time node --test --test-reporter=spec test/*.test.ts      # durations per test from the spec output
# typecheck
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit -p . --extendedDiagnostics
# hygiene
grep -rnoE ':\s*any\b|as any\b|<any>|any\[\]' src | wc -l ; grep -rn '@ts-ignore\|@ts-expect-error' src | wc -l
grep -rn 'eslint-disable' src | wc -l
# samples
find public/samples -type f | sed 's/.*\.//' | sort | uniq -c ; ffprobe <one .webm/.mp3/.m4a>
# data shipped: data/ files imported by src (grep of import paths) vs du of each data/ folder
# branches
git branch -r --merged origin/claude/wtc-touchscreen-game-pzwxs4 | wc -l
git branch -r --no-merged origin/claude/wtc-touchscreen-game-pzwxs4
git rev-list --left-right --count origin/claude/fux-gradus-two-voice-dataset-ouu87h...origin/claude/wtc-touchscreen-game-pzwxs4
```

Notes on calibration:
- The visualizer sizes are module sizes before minification. The real chunk sizes (raw and gzip -9) come from the files in `$S/dist`.
- `vite preview` serves without compression, so the runtime test used a small gzip server, close to GitHub Pages.
- Frame times come from headless, software-rendered Chromium, so read them as relative, not as phone truth.
