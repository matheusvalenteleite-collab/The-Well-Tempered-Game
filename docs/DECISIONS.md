# Design decisions (pedagogy and musical content)

Decisions taken by the project owner; code must follow them.

| id | decision | effect in code |
|---|---|---|
| D0 | Corrected kern reading (version of record) is canonical for Figs. 22, 85b, 86a, 87b. | `CANONICAL_READING = "kern_vor"` |
| D1 | Fux's own C cantus firmi may be offered with the player's counterpoint, without an original solution. | curriculum steps 11-12 (`fux_cf_c_01`, after "Perge ergo ad A. & C.", p. 55) |
| D2 | Voice crossing is a warning, not an error. | `fs.no-voice-crossing` severity `warning` |
| D3 | ~~Keep the descending-minor-sixth ban for now.~~ Superseded by D11. | — |
| D4 | ~~The unattested preferences stay as warnings.~~ Superseded by D11. | — |
| D5 | **Fux mode follows the book: rules enter the game in Fux's order of presentation.** | `src/counterpoint/curriculum/fux-first-species.ts` |
| D6 | No Ionian-specific gameplay rules; Fux mode is faithful to Fux. | `fs.ionian-no-accidentals` removed |
| D7 | Opening as Fux states it: perfect consonance; with the counterpoint below, octave or unison only. Cadence: M6 (cantus below) / m3 (cantus above) to octave or unison. | `fs.opening-perfect`, `fs.cadence` voicing-aware |
| D8 | Generator constraints of M1-REPORT §4 accepted. | generator not yet implemented (M4) |
| D9 | Level 1 follows the book: cantus below and above interleaved from Fig. 6 on. | curriculum steps 1-12 |
| D10 | A rule is unchecked before Fux introduces or notes it; from that step on it is checked. | `rulesForStep()` |
| D11 | Rules whose introduction cannot be found in Fux's first-species text (pp. 45, 47-55) are dropped for now: descending m6, sevenths, leaps beyond the octave, other augmented/diminished leaps, preference for imperfect consonances, avoiding successive leaps. | removed from fux-strict |
| D12 | The player is Josephus and writes every counterpoint; Josephus's faulty first versions are not staged. | — |

Note: the page supplied as "p. 46" is p. 46 of Mann's English translation (second species, Figs. 36-38), not the 1725 p. 46; per the owner's instruction, Mann's text is not used.
| D13 | Default ("modern") clefs are the per-exercise modern clefs given in the dataset (e.g. treble over treble for Fig. 5), not a fixed treble over bass. | `exerciseView().clefs.modern` |
| D14 | Two switchable sounds: sampled piano and an 8-bit square-wave synthesizer (organ dropped). | `src/audio/engine.ts`, Piano / 8-bit buttons |
| D15 | 8-bit sound only for now; the piano option is hidden (code kept). | `PIANO_ENABLED = false` in `src/ui/App.tsx` |
