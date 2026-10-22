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

## Pared down; the picker; the instrument bench (D169, D170: built, to be tried)

- One voice, the others always playing (as loud), the whole piece from a chosen point; SLOW, MEDIUM,
  FAST; quit at any time; a piece picker laid out as the book; Contrapunctus XIV.
- The box shows every voice in fixed places, blocks one height.
- `bench.html`: six free-play instruments (theremin, bow, positions, dial, home & ornament, keybed)
  on Contrapunctus XIV, to choose how the thumbs should play before the game commits to one.

## All 48 preludes too (D168: built)

- The 96 pieces in the book's order; a prelude is played by hands (both hands: left thumb, right thumb).
- Prelude sections end on cadences; the box's colour follows the keys they reach.
- A lifted note carries on if the same hand's next tap follows at once (a held bass under a figure).

## All 48 fugues, keys, with the others (D167: built)

- Every fugue of both books, sections cut automatically (the C minor keeps its hand-read ones).
- The keys: rows of staff steps under the thumbs, the same rows as in the box; the coming notes
  light their rows. NORMAL: tap the lit row (one off counts); hold, slide a row to slur, wobble to bend.
- WITH OTHERS (default): the other voices play around you. WAIT: the music waits for each note.
- Sound: envelope, vibrato on long notes, voices panned, soft filter, a small room.

## Squares under the thumbs (D166: replaced by the keys in D167)

The owner: no indication where to tap; impossible; and it did not work on the iPhone at all.
- iPhone: the sound (the game's clock) now starts on a finished tap, as Safari requires; the
  silent switch no longer mutes it.
- Each note to tap is a square in the play area, with a frame closing in on it that meets it on the
  beat; HOLD squares fill while held; a dotted line shows the next one. One voice: squares alternate
  left and right thumb. Two voices: lower voice left, higher right.
- EASY: tap anywhere on time; the quick little notes play themselves. NORMAL: tap each square.
  SHAPE, NOTES and the lanes are gone. Default ♩=48.

## Done while the owner was away (21 October, D163-D165)

- **The whole fugue**, in six sections (bars 1–9, 9–13, 13–17, 17–22, 22–29, 29–31), each ending where
  an entry lands; ◀ ▶ on the title.
- **Two voices, one per thumb**: choose a second voice. Lower voice left, higher right. Opens only when
  both are earned alone in that section at that level (the owner's rule: the counterpoint is first
  heard when first played); "open everything (for testing)" bypasses it. RHYTHM and SHAPE.
- **Feedback**: PERFECT (≤ 70 ms) / GOOD early or late / MISS / ✕, combo from 5, max combo on the result.
- **Timbres**: soprano a thin pulse, alto a fuller pulse, bass a triangle (as on the NES).
- **Sync**: tap along with 12 clicks; the game allows for your lag (phone screens and Bluetooth add some).
- **The map**: tap the section's name; sections by voices and pairs, stars, ◆ where the subject enters.
- **Chords** in a voice (the final cadence) are one tap; found by a difficulty audit (`docs/touch/AUDIT.md`).
- Not touched (the owner's to decide): episodes, the thumbs' "dance", contextual NOTES, the loom.

## SHAPE made fluid (D162: built)

After "too hard: the pitch separation must be less strict, more fluid, contextual": SHAPE has no
lanes. Each touch is judged against the player's own previous touch, with overlapping zones (a
little movement makes a step, roughly the same place a repeat), lenient at the edges; sliding
while holding slurs. A sloppy scripted player that follows the line scores 97-100%; random
movement 41%; a still thumb 13%.

## Levels (D161: built)

After "way too hard" (with a mouse): the same gesture at three levels. RHYTHM: only the time (tap
anywhere; the voice plays its own notes). SHAPE: time and direction (higher, lower, the same).
NOTES: the lane itself. Computer: space bar taps; ↑ ↓ in SHAPE; the mouse for NOTES.

## One voice on lanes (step 3, D160: built)

Choose soprano, alto or bass; play it through the exposition (bars 1–9, to the end of the bass
entry), hearing only that voice. Each pitch of the voice in the passage is a lane, lowest at the
bottom; the box's rows are the same lanes. Tap = a detached note; hold = sustain (let go and it
stops); slide into the next lane = slur. 80% earns the voice.

## Subject mode, easy (step 2, D159: tried and dropped)

The owner: the mode "sucks", but the playing was exciting; holding all the time and re-landing at an
absolute height were not fun. Removed in D160.

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
