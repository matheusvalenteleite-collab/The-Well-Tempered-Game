# The readings (D272)

How three standard books on the Well-Tempered Clavier say each Book I fugue should be played, as
extracted for the game (tools/touch/readings.ts → data/touch/readings.json). The owner asked for
textual descriptions only: nothing here was taken from recordings.

| file | source | what it gives |
|---|---|---|
| keller.json | Hermann Keller, *Das Wohltemperierte Klavier* (1965), Eng. trans. Leigh Gerdine, *The Well-Tempered Clavier by Johann Sebastian Bach* (1976) | each fugue's "Performance" paragraph: subject articulation (12 fugues explicit, 1 by his stated rule), metronome marks (24), few dynamics |
| bodky.json | Erwin Bodky, *The Interpretation of Bach's Keyboard Works* (Harvard, 1960), Appendix A and chapters on the instrument, tempo and articulation | subject articulation for all 24 (21 explicit, 3 by rule), metronome bands (24), forte/piano plans (13, mostly from his harpsichord registrations) |
| riemann.json | Hugo Riemann, *Katechismus der Fugen-Komposition* (1890–91), Eng. trans. J. S. Shedlock, *Analysis of J. S. Bach's Wohltemperirtes Clavier* (1893; public domain) | marks read from his music examples (24): staccato, accents, short slurs; no metronome marks; hairpins as the subject's shape |

Book II (D275): `keller2.json`, `bodky2.json`, `riemann2.json`, by the same rules (Keller marks the
subject in 10 Book II fugues; Bodky all 24, dynamics for 13 from registrations, his 8' alone taken
as pp; Riemann 20 from his examples, rebarred subjects matched by order and outline).

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

## Slurs and legato (D370)

Glenn's notes (§1): a slur is a grouping (one gesture: the first leaned on, joined inside, the last
let go early and lighter), legato a manner (an even line, no air). The extractions coded both as
`to_next: "join"`. `slurs.json` now says, for every reading with a join, which joins are a slur and
which are the author's plain legato, and why: `legato` (the author's words ask the joins as a manner
or rule: "linked", "legato", "quasi legato") and `slurs` (`[from, to]`, both notes of the subject
included). tools/touch/readings.ts writes them into data/touch/readings.json as `legato` and
`slurs: [{ v, from, to }]` (`v` the voice of the first entry the marks were read against; every entry
takes them by place). The per-note `join` is unchanged: the derived view the game judges.

Choices, conservatively:
- An author's word for a manner or rule ("legato", "molto legato", "linked", "quasi legato", "seconds
  linked") is legato, even over two notes (Bodky's "first two eighths legato" in I/16).
- A figure named as a group and closed by a break (Keller's and Bodky's I/2 mordent figure, "the two
  next ones slurred", "slurred in pairs"), or a slur printed in an author's example (Keller's, Czerny's
  via Keller, Bodky's Ex. A3–A7, Riemann's close slurs), is a slur.
- Where a slur was never placed on the notes (Bodky's "wave figure" pairs in I/13, his "falling second
  of bar 4" in II/13), nothing is invented: legato only.
- A slur running past the end of an author's example ends on our last note.
