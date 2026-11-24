# Bow test 2 (throwaway prototype)

Two-thumb test bench for iPhone: a start screen leads to the bowed prototype, the touch-area prototype or the Loop maker. Not part of the game: nothing outside this
folder uses it, and deleting the folder removes it completely.

- `bowcore.js`: speed estimate, speed-to-loudness curve, row selection, Web Audio voice, engine.
- `app.js`, `page.html`: the bowed prototype's page, touch handling, measurements, log.
- `shared.js`: audio start (iOS silent-switch workaround), touch-property reader, CSV recorder.
- `touchgest.js` (gesture layer: touches to musical events; pitch rows ported from THE LAB's FREE PLAY, `src/bench/lab/free.ts`),
  `touchsound.js` (sound layer: events to sound, background loop), `touchapp.js` (start screen, touch-area page, probe overlay),
  `practice.js` (the four practice items).
- Loop maker: `loopcore.js` (timing, quantize, wrap, finale plan, latency, WAV/ZIP; pure), `loopsound.js` (five instruments,
  drums, clicks, a channel per voice; works live and offline), `loopapp.js` (transport, takes, review, finale, export, saving).
- `node build.cjs` builds `index.html` (complete page, committed) and `dist/artifact.html` (for claude.ai).

Tests (run from this folder; the browser tests need the preinstalled Playwright):

    node --test test/core.test.cjs
    NODE_PATH=$(npm root -g) node test/offline-audio.cjs
    NODE_PATH=$(npm root -g) node test/touch-sim.cjs
    node --test test/touch.test.cjs
    NODE_PATH=$(npm root -g) node test/touch-area-sim.cjs
    NODE_PATH=$(npm root -g) node test/practice-sim.cjs
    node --test test/loop.test.cjs
    NODE_PATH=$(npm root -g) node test/loop-sim.cjs
    NODE_PATH=$(npm root -g) node test/palette-offline.cjs
    node test/port.test.mts       # the pitch-row port matches the game's free.ts
