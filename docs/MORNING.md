# Night of 8–9 October 2026: what changed, how to go back, questions

Game link (always the latest): https://claude.ai/artifact/NvkaBGCHrtDebE85H7udTX

## How to go back

- **Everything as it was before the night:** branch `backup/before-night-2026-10-08` (commit 07285c9), the same as artifact version 32.
- **Partial reverts:** each step below is its own commit on `claude/continuo-integration`, so any one of them can be undone alone. Ask me and I will revert and republish.
- **The 1990s look:** the "Look" button at the top right switches between 1990s and Classic and remembers your choice. No code change is needed to go back.

## What was done, in order

| Commit | Decision | What |
|---|---|---|
| 98552ea | D78 | **No stutter.** Switching lines on and off (versions, the written line, continuo) no longer restarts playback; each line's channel fades in or out in about 20 ms. Checked: a pass recorded while switching tracks five times lasts exactly its length. |
| 04cdc0f | D79 | **Octave moves are drawn.** Fux's line and the four versions move on the score with their octave steppers. The cantus and the Contrapunctus get steppers too. What you wrote, and what is judged, never moves: a click on a raised Contrapunctus writes the pitch where it is written. |
| 8a8e3cc | D80, D81 | **The mixer after Ableton.** Track colours; a numbered on/off button ("activator") for every track; solo; faders with a dB scale and level meters; dB readouts. **The 1990s look:** Silkscreen and VT323 type, hard-shadowed square buttons, a dark desk, stronger contrast. Fux's text keeps its Garamond. |
| a9089c9, 17af77f | D82 | **Fifth species, two voices.** All twelve of Fux's exercises (Figs. 82–88). New rhythm model: quaver slots and held notes. Entry: choose the note value (keys 8 4 3 2 6 1), type the letters, T to hold or tie. Rules come from pp. 76–81, read from the 1725 scans. Fux's twelve solutions clear every rule, except Aloysius's "limping crotchets" advice in Fig. 88a bar 5, which is exactly where Fux prints his own NB. |
| 9aff3ec | D83 | **Systems on a phone.** On narrow screens a long score breaks into lines of bars at a readable size. On a computer nothing changes: it still shrinks to fit. |
| e242a88 | D84 | The study panels in the 1990s look; Aloysius's first fifth-species example in the demo area. |
| 5a05586 | D85 | **F1–F9** switch the numbered tracks on and off, as in Ableton. |

## Questions for you

1. **Fux's activator** (track 3 on the mixer): I made it mean "Fux sings along with you" in your own playback. His separate Fux and Trio play buttons are unchanged. Is that the meaning you want, or should it do something else?
2. **The O / I / R / RI / C chips** on the Contrapunctus strip are gone, because each version now has its own activator on its own strip. The canon's displacement (C+n) stays on the Canon strip. Do you miss the chips?
3. **M (mute) is gone** from the strips: the activator does that job, as in Ableton. Solo (S) stays. Agreed?
4. **Octave moves of the Contrapunctus and the cantus** are drawn and heard, but the evaluation keeps the written pitches. Is that right, or should a moved line be judged where it sounds?
5. **Fifth species, two of my readings that go beyond the text.** Both are in Fux's own solutions, which must pass:
   - a dissonant crotchet may be a lower neighbour on the second or fourth crotchet (Fig. 86b, bar 8);
   - a tied dissonance may resolve on the half bar after a consonant note in between (p. 76's "variations"; Figs. 82, 83, 87a, 87b, 88a, 88b).

   Are you comfortable with both?
6. **Three and four voices (Exercitia II and III)** are next in the plan, but they need decisions from you first:
   - Do you write both added voices, or one while Fux's or a generated other voice sits beside it?
   - In what order should they come?

   The scores are available (the same open dataset has three- and four-voice folders), but the rules and the interface depend on your answer. I have not started them.
7. **The 1990s look** is now the default. Keep it, or make Classic the default?
8. **Systems on the phone** (D83): the continuo is not drawn when the score is broken into systems. Is that acceptable for now?

## Answers (9 October)

1. No separate Fux and Trio buttons: the activators choose what plays (D88).
2. The chips are not missed; the canon's controls live on the Canon strip.
3, 4, 5, 7. Agreed as proposed.
6. Three voices: the player writes everything Fux writes (both added voices), in whatever order.
8. Yes: no continuo in systems for now.
