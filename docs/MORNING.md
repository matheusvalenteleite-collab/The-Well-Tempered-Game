# Night of 9–10 October 2026: the Well-Tempered Clavier mode

Game link (always the latest): https://claude.ai/artifact/NvkaBGCHrtDebE85H7udTX. Open the first menu (voices) and choose **Well-Tempered Clavier**.

## What it is (D119)

- **Material.** 29 fugue expositions from both books, in 21 of the 24 keys, read from an open encoding (the ASAP dataset, CC BY-NC-SA). For each fugue: Bach's subject, his answer (real or tonal, with the mutated notes), and what the subject's voice sings against the answer. C minor, E♭ minor and E minor are missing because the source has no fugue in them.
- **Exercise 1, real or tonal?** (D120) Mark the subject's notes that a tonal answer must change, or none. The verdict names the degrees.
- **Exercise 2, the answer.** You write the comes under or over Bach's subject, in its rhythm (grey notes). The verdict names what you did. A real answer where Bach's is tonal is reported with the degrees: in F minor I, the subject's C (degree 5) is answered by F (1), not by G (2).
- **Exercise 3, the countersubject.** You write the subject's continuation against Bach's answer, in Bach's rhythm. It is judged by the species' doctrine carried into tonal free rhythm, then compared with Bach's own line. All 29 of Bach's lines pass these rules. A hint (H) lists the notes the rules allow at the selected place.
- **Exercise 4, study.** Bach's exposition with the subject, answer and countersubject labelled, and the mutations marked ✱. **Whole fugue** (D121) shows the complete fugue as a roll, with every entry of the subject found automatically and coloured (inversions in another colour); tap an S to hear the fugue from that entry.
- **Sound.**
  - Instrument: harpsichord by default, or organ or piano.
  - Temperaments: Werckmeister III by default, Kirnberger III, Vallotti, or equal. Kirnberger III and Vallotti are new; they are computed from the sizes of their fifths, and the same computation reproduces Werckmeister III exactly.
- **Keys tab.** The 24 keys in Bach's order, each with its fugues from Book I and Book II.

## Questions for you

1. **Bach as the last word.** In the countersubject engine I treated Bach's 29 lines as Fux's solutions were treated (D39): they must pass. The rules therefore admit what he does: implied-chord skips off the beat, a resolving tritone, a held note against the answer's passing figure. Is that the right authority for the tonal stage, or do you want a stricter, more textbook layer as well?
2. **The appoggiatura** (leapt into on the beat, resolved down by step) never occurs in these countersubjects, so I made it a fault, with a message saying that it belongs to Bach's style elsewhere. Keep it as a fault, or allow it?
3. **The subject's boundary.** The data decides where the subject ends: it lasts as long as the answer copies it. In a few fugues this keeps a short codetta inside the subject (F minor I ends "…G, F F G"). Should I trim to the textbook boundaries by hand?
4. **The licence.** The source is non-commercial (CC BY-NC-SA). That is fine for a private teaching game. If the game is ever to be sold, the fugues must be re-encoded from a public-domain edition.

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
