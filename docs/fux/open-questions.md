# Open questions and things to verify

1. **Liber I and printed p. 46** are not among the upstream scans. The four rules of motion
   (Liber I) and the imperfect-consonance precept (p. 46) were read in Mann (p. 28). Check them
   in a complete scan of the 1725 print.
2. **The part after Exercitium III** (imitation, fugue, double counterpoint, styles): order,
   titles and the number of worked examples are unverified. Needed before any non-strict level
   is designed.
3. **Three- and four-voice attributions** ("written by") in catalogue.md come from reading
   Mann's translation. They should be checked against the 1725 dialogue (pp. 81-139), especially
   those marked "inferred" (Figs. 154-159, 200-203).
4. **First-species precepts in later species.** The game carries into second species only what
   Fux says carries ("motion and progression", p. 56) and what his examples obey. Third to fifth
   species will raise the same question (e.g. is the major-sixth leap still forbidden in florid
   counterpoint? Fux's melodic audit of all 46 solutions found no such leap).
5. **Upstream defects** to report to MarkGotham/species: `III/sp5/gap_201.json` is not valid JSON
   (trailing comma); the combined MusicXML of Part I predates the kern corrections of Figs. 22,
   85b, 86a, 87b; `gap_059.json` lacks the figure `note` key.
6. **Fig. 42** uses an A cantus different from Figs. 22-23 and 43 in the dataset
   (`fux_cf_a_02`). Check against p. 62 whether Fux really changes the cantus or the encoding
   differs.
7. **Fig. 110, bar 6** (middle voice, p. 91): an unmarked B repeats the B♭ of bar 5. The dataset
   reads B♮ (a chromatic step B♭–B♮ found nowhere else in Fux's three-voice solutions); by the
   period's convention that an accidental holds for an immediately repeated note, B♭ is likelier.
   Fux writes the resulting sonority (E over B♭ over G) himself in Fig. 105, bar 5, so consonance
   does not decide it, and both readings pass the game's rules. The game reads B♭ (owner, D116,
   `READINGS` in src/game/trio.ts), but the question stays open: check other copies of the 1725
   print (and Figs. 169-170, bar 6, in Exercitium III, which have the same passage) before
   reporting it upstream (item 5).
