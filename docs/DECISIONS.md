# Design decisions (pedagogy and musical content)

Decisions taken by the project owner; code must follow them.

| id | decision | effect in code |
|---|---|---|
| D0 | Corrected kern reading (version of record) is canonical for Figs. 22, 85b, 86a, 87b. | `CANONICAL_READING = "kern_vor"` |
| D1 | Fux's own C cantus firmi may be offered with the player's counterpoint, without an original solution. | pending curriculum design |
| D2 | Voice crossing is a warning, not an error. | `fs.no-voice-crossing` severity `warning` |
| D3 | Keep the descending-minor-sixth ban for now. | `fs.melodic-sixth` unchanged |
| D4 | The unattested preferences stay as warnings. | `fs.prefer-imperfect-consonances`, `fs.avoid-successive-leaps` (operationalization still provisional) |
| D5 | **Fux mode follows the book: rules enter the game in Fux's order of presentation.** | curriculum model pending confirmation |
| D6 | No Ionian-specific gameplay rules; Fux mode is faithful to Fux. | `fs.ionian-no-accidentals` removed |
| D7 | Opening as Fux states it: perfect consonance; with the counterpoint below, octave or unison only. Cadence: M6 (cantus below) / m3 (cantus above) to octave or unison. | `fs.opening-perfect`, `fs.cadence` voicing-aware |
| D8 | Generator constraints of M1-REPORT §4 accepted. | generator not yet implemented (M4) |
