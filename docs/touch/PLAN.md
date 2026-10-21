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

## Subject mode, easy (step 2, D159: built, to be tried for fun)

The player plays only the subject, wherever it enters, and hears only what they play.

1. **The subject** (alto, bar 1) with the notes in view; 80% of the notes to go on.
2. **The answer** (soprano, bar 3), the same way.
3. **From memory**: the eight entries in order (bars 1, 3, 7, 11, 15, 20, 26, 29), the notes hidden
   but for the first and the notes where Bach varies the form. A hit hidden note shows a gold outline;
   80% of the notes for gold.

Gesture: hold a thumb down (either half) and slide; its height is the pitch over the line's own
range, and the box zooms to the same range. A note sounds only if the thumb is within 1.5 semitones
of it, 160 ms either side of its onset. Notes shorter than an eighth ride along with a thumb nearby.
Tempo ♩=48, 60 or 72, with a bar of count-in; the box takes the key's colour (c, g, E♭).

## The owner's principles (21 October)

- **The player earns what they hear.** A voice sounds only while it is played right; two voices are
  heard together for the first time when the player first plays them together and gets them right.
- **Nothing but playing inside the piece**: cards and choices between passages only.
- The music box takes the colour of the key. Yes.
- No "hunt" for entries. Episodes: nothing decided; more ideas wanted later.
- Kept in mind: the thumbs "dancing" to show the subject and countersubject in their changing relations.

## The owner's ideas for later steps

- A harder level plays two voices at once, one per thumb. How to handle three or four voices is open.
- Progression in a fugue: first one voice alone (the others neither heard nor shown), then the next
  voice, and so on, until all the voices sound together.

## Next steps (to be agreed one at a time)

To be decided after the owner has tried subject mode.
