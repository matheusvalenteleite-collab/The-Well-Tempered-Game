# Bow test 2 (throwaway prototype)

Two-thumb "bowed string" control test for iPhone. Not part of the game: nothing outside this
folder uses it, and deleting the folder removes it completely.

- `bowcore.js`: speed estimate, speed-to-loudness curve, row selection, Web Audio voice, engine.
- `app.js`, `page.html`: the page, touch handling, measurements, log.
- `node build.cjs` builds `index.html` (complete page, committed) and `dist/artifact.html` (for claude.ai).

Tests (run from this folder; the browser tests need the preinstalled Playwright):

    node --test test/core.test.cjs
    NODE_PATH=$(npm root -g) node test/offline-audio.cjs
    NODE_PATH=$(npm root -g) node test/touch-sim.cjs
