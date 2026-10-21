# The touch game: plan

The owner's brief (21 October 2026): a touchscreen game on the Well-Tempered Clavier in which the
player touches, holds, swaps and drags in time with the music. In a fugue the player keeps to one
voice throughout; in the preludes the gestures change more. Prototype on a single fugue, **Book I,
C minor (BWV 847)**, in baby steps. Sound: 8-bit only at first, on a steady MIDI beat; richer
playback only once the game is playable.

## Layout (step 1, D158: done)

- **Music box**, the upper half: the fugue drawn as an 8-bit roll moving past a fixed playhead.
  Good moves make the notes shine; bad moves make them do something else (to be decided).
- **Play area**, the lower half: the left half for the left thumb, the right half for the right.
  A touch keeps the half it landed in, even when it slides across the midline.

Page: `touch.html` (`npm run dev`, then `/touch.html`). Single file for claude.ai:
`npx vite build -c vite.touch.config.ts && node tools/touch/build-artifact.mjs <out.html>`.
Data: `node tools/touch/extract.ts` cuts the fugue from `data/wtc/fugues.json`.

## The owner's ideas for later steps

- A harder level plays two voices at once, one per thumb. How to handle three or four voices is open.
- Progression in a fugue: first one voice alone (the others neither heard nor shown), then the next
  voice, and so on, until all the voices sound together.

## Next steps (to be agreed one at a time)

2. The beat: the roll scrolls on a steady tempo, with an 8-bit voice sounding the notes.
3. The first gesture: one thumb follows one voice.
