# The readings (D272)

How three standard books on the Well-Tempered Clavier say each Book I fugue should be played, as
extracted for the game (tools/touch/readings.ts → data/touch/readings.json). The owner asked for
textual descriptions only: nothing here was taken from recordings.

| file | source | what it gives |
|---|---|---|
| keller.json | Hermann Keller, *Das Wohltemperierte Klavier* (1965), Eng. trans. Leigh Gerdine, *The Well-Tempered Clavier by Johann Sebastian Bach* (1976) | each fugue's "Performance" paragraph: subject articulation (12 fugues explicit, 1 by his stated rule), metronome marks (24), few dynamics |
| bodky.json | Erwin Bodky, *The Interpretation of Bach's Keyboard Works* (Harvard, 1960), Appendix A and chapters on the instrument, tempo and articulation | subject articulation for all 24 (21 explicit, 3 by rule), metronome bands (24), forte/piano plans (13, mostly from his harpsichord registrations) |
| riemann.json | Hugo Riemann, *Katechismus der Fugen-Komposition* (1890–91), Eng. trans. J. S. Shedlock, *Analysis of J. S. Bach's Wohltemperirtes Clavier* (1893; public domain) | marks read from his music examples (24): staccato, accents, short slurs; no metronome marks; hairpins as the subject's shape |

Each object: the fugue, the pages, the tempo (shown only: D274, the game keeps the recordings'),
the subject's marks note by note against our first entry (`to_next` join/detach, `short`,
`accent`), its level and shape, the dynamic plan by bar, short verbatim quotations (≤ 40 words) and
`caveats` naming every judgement made in reading them. The books themselves are not in the
repository.

Judgements worth knowing:
- Where an author states a rule ("seconds linked, fourths and fifths set apart"), it was applied
  literally to the notes (`basis: "rule"`).
- Bodky's levels mostly come from his harpsichord registrations (8'+4' = f, 8' = p, his own key);
  portato is coded as detached, tenuto as neither.
- Riemann's long slurs are phrase marks (his preface), not legato, and were not coded; his short
  slurs over a few stepwise notes were coded as joined: a reading of his notation, not his statement.
- Keller's Fugue 21: of the three articulations he prints, Czerny's, which he calls "perhaps" the
  most suitable, was coded.
