# D8 amended: the cantus firmus constraints checked against Fux (for the owner's approval)

D8 accepted the generator constraints of docs/m1/M1-REPORT.md §4. Building the generator
(`src/counterpoint/choices/cantus.ts`, the Choices lab) and checking every constraint against
Fux's own cantus firmi, under D39 ("Fux is always the last word"), required the changes below. Each
is the smallest that lets all of Fux's cantus firmi pass. Nothing in the game depends on them yet.
Approve, amend or reject each.

| § 4 | as accepted | amended | why |
|---|---|---|---|
| 3 | length 10-14 | 9-14 accepted; the generator still writes 10-14 unless asked | Fux's C variant has 9 notes |
| 10 | no sixth outlined by two leaps the same way | allowed when the two leaps arpeggiate a triad | Fux's G cantus: G-C-E (a sixth outlined) |
| 11 | turn after a rising leap of a fourth or more | soft: counted, not forbidden; the generator prefers turning | Fux's G does not turn once |
| 14 | leaps 25-60% of the intervals | 20-62% | Fig. 42's A cantus has 2 leaps in 10 (20%); the G has 8 in 13 (62%) |
| new | — | the antepenultimate note on degree 1 or 3 | true of all Fux's cantus firmi (Ewing 2009); it keeps the cadence approach of his |
| 15 | every cantus admits a counterpoint | not a filter on the cantus: checked when the counterpoint is generated; where none is error-free the lab now shows the least bad one in red | a full solver per candidate cantus is costly; in practice the lab has found none without |

Unchanged: 1, 2, 4-9, 12, 13. Constraint 5 (nothing below the final in C) and the rising fifth and
octave (8; off unless asked, as Fux uses each once) stand as accepted.
