# Contrapunctus XIV: the unfinished fugue, and the road to a completion

The owner (12 October 2026): track Contrapunctus XIV; one future goal is to write a completion of it.
This file gathers what the project knows of the fragment and what must be known before a completion
is attempted. In keeping with D160, knowledge first: the completion is the last step, not the next.

## 1. The text

- **Encoding:** Mutopia's "Contrapunctus XIX, Fuga a 3 Soggetti" (Arnaud Gossart, 2006, public domain),
  after the Bach-Gesellschaft edition (Breitkopf & Härtel), whose numbering puts the canons at XII-XV and
  the mirror fugues at XVI-XVIII; in this project `aof14` (data/wtc/more.json). 239 bars of 4/4, four
  voices, ending where the autograph breaks off, with C.P.E. Bach's note (in Mutopia's English: "While
  working on this fugue, where the name B.A.C.H. appears in the countersubject, the composer died").
- **Not yet consulted:** the autograph itself (Berlin, Staatsbibliothek; the shelf mark and the facsimile
  to be checked), and any modern critical edition. The Bach-Gesellschaft text is the 19th century's.

## 2. The fragment, as the analysis reads it (D160)

| subject | first entry | character | entries found |
|---|---|---|---|
| 1 | bass, b. 1 (beat 3): D A G F G A D, long notes | the stile antico subject; answered tonally (^5 by ^1), entries five bars apart | 27, upright and inverted, in all three sections |
| 2 | alto, b. 115 (found from b. 114) | running eighth notes | 9 (b. 114-180, 233) |
| 3 | tenor, b. 193 (beat 3): B♭ A C B♮ (B-A-C-H), then C♯ D C♯ B C♯ | chromatic | 9 (b. 193-235) |

Subject 1 returns in the second section (b. 148, 169, 182, 183) and the third (b. 234): the fragment
already combines the subjects, as the plan of a fugue on several subjects requires (Fux describes the
fugue on three subjects, each invertible with the others: docs/fux/fugue.md, Lectio VII). Entries are
found by the study's analysis; a reading by hand of every entry is still to be done.

## 3. What a completion depends on

The literature's central claim, as it is commonly reported (to be checked in the sources before it is
relied on): the three subjects combine with the principal subject of the Art of Fugue (Contrapunctus
I's), so that the unfinished fugue was to close as a quadruple fugue; this observation is usually credited
to Gustav Nottebohm (1881). Completions built on it exist (Tovey's, in *A Companion to "The Art of
Fugue"*, 1931, is on the Internet Archive; others to be listed with their sources).

The steps, each a piece of knowledge before it is a piece of writing:

1. **The fragment read by hand.** Every entry of the three subjects confirmed in the score, the
   sections and their cadences, how the subjects are combined already (which pairs, at which intervals,
   which voice above which).
2. **The combination tested.** The four subjects (the three, and Contrapunctus I's) set against one
   another at every alignment and transposition the style allows, judged by the counterpoint rules the
   project uses (the stretto table's machinery, src/wtc/compose/stretto.ts, extended to four lines):
   does the combination the literature describes come out, and is it the only one? This is a question
   the project can answer with its own tools.
3. **Bach's own endings of fugues on several subjects.** How he brings subjects together and closes:
   the 48's triple and double fugues (I/4, II/4, II/14, II/18, II/23), Contrapuncti VIII-XI, the Ricercar
   a 6; the length of the final combination, the strettos, the pedal points, the last cadence
   (docs/wtc/HABITS.md, parts 4-7, to be extended with the later subjects).
4. **The completions that exist,** as comparison only (their rights to be respected): what they share,
   where they differ, how long they make the fugue.
5. **Then the completion:** four voices, the fragment given, the quadruple combination placed, the rest
   written and judged. This needs the composer's third and fourth voices (COMPOSE.md, M3) and a
   four-voice judge that the project does not yet have.
