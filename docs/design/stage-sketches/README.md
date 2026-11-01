# Stage sketches (design studio, 1 Nov 2026)

Mock-only code for the owner's request to give each fugue a world behind the music box and on the thumb
strips. Not wired into the game. To see it, add two temporary hooks and build to a separate folder:

- `src/touch/MusicBox.tsx` `paintClassic`, after the key-tint fill: `(globalThis as any).__studioBox?.(g, w, h, fr);`
- `src/bench/paint-proto.ts` `bars()`, in place of the strip's `fillRect`: call `__studioStrip(c, n, s.x, bw, w, h, g)` when defined;
  the coming-note light's alpha multiplied by `__studioCue ?? 1`.

`stage.js` draws I/1, I/8, I/13 and I/20 (it needs `globalThis.__STAGE`, the entries, cadences and bars per
fugue from `data/touch/pieces.json`). `shoot.cjs` and `sel2.cjs` are the Playwright scripts used for the
review page "Fugue stages".
