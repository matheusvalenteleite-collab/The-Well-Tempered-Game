# Schulenberg's tables checked against the score (I1, 12 October)

Schulenberg's Tables 10.2 and 10.3 (*The Keyboard Music of J. S. Bach*, 2nd ed., 2006, pp. 189 and 194)
classify all 30 pieces. They are transcribed from the printed pages in `data/inventions/schulenberg.json`.
This first check covers what can be read from the notes without a full reading:
- the length;
- the leader and the first imitation (interval, distance);
- for the Sinfonias, the order of entries.

**Method.**
- `node tools/inventions/openings.ts` finds the first imitation of each voice's opening. It also measures
  how long the imitation stays strict, and whether the leader meanwhile takes over the follower's own line
  (an exchange, i.e. double counterpoint).
- Where it missed (a tonal or varied head), the opening was read by hand with
  `node tools/inventions/dump.ts`.
- The form, the kind and the bars of the returns are left for the full readings.
- The pilot reading of BWV 772 (below) is the first case.

**A data fault found on the way.** `data/wtc/inventions.json` gives Sinfonias 3, 4, 5 and 14 as C major
(they are in D, D minor, E flat and B flat), and no BWV numbers for the Sinfonias. The INVENTIONS tools use
the P 610 keys. The file belongs to the FUGUE session.

## Results

**Length: 30 of 30 agree.**
- Two differ only as Schulenberg marks them: the E minor and A minor Inventions have 23 and 25 bars in
  P 610 against 21 and 24 in the Clavier-Büchlein ("expanded by several measures in P 610").

**The first imitation of the Inventions: 14 of 15 agree.**
- Octave: C, c, D, d, E, e, F, f, a. Fifth: E flat, G, A, B flat, b.

| piece | Schulenberg | score | note |
|---|---|---|---|
| C | 8 | 8 below, after 2 beats | |
| c | 8, canonic | 8 below, after 2 bars; strict for 44 notes (to b. 6) | canon |
| D | 8 | 8 below, after 2 bars | |
| d | 8 | 8 below, after 2 bars | |
| E flat | 5*, double fugue | 5 below at b. 5; the voices exchange their lines | exchange found by machine |
| E | 8*, chromatic | the bass leads; 8 above at b. 4; exchange | exchange found by machine |
| e | 8 | 8 below, after 2 beats | |
| F | 8, canonic | 8 below, after 1 bar; strict for 60 notes (to b. 8) | canon |
| f | 8*, legato | 8 below at b. 5; exchange | exchange found by machine |
| G | 5, gigue | 5 below, after 1 bar | |
| **g** | **5** | **8 below at b. 3**: the bass restates the right hand's opening line in the tonic for 38 notes, while the right hand appears to take the bass's first line back in melodic inversion (to be confirmed by the reading). The opening line reaches the fifth (D minor) only at b. 7 | **disagrees** (below) |
| A | 5*, double fugue | 5 below at b. 3; exchange | exchange found by machine |
| a | 8 | 8 below, after 2 beats | |
| B flat | 5*, double fugue | by machine: 8 below at b. 4, but that is the head only, in a sequence. The whole opening returns with the voices exchanged at the fifth (F) at b. 6 (read by hand) | agrees once "imitation" means a whole statement |
| b | 5*, double fugue | 5 below at b. 3 | |

**The Sinfonias: entry order and intervals, 15 of 15 agree.** For three of them (F, g, B flat) this needed
reading by hand, because the answering head is tonal or varied:
- **F:** the soprano answers at 2:1.5 with a tonal head (F E A against C A D).
- **g:** the soprano leads at 1:1.5; the middle voice answers at the fifth below at 2:1.5, with its fourth
  note tied over; the bass enters at the octave at 4:1.5.
- **B flat:** the soprano answers at the fifth above at 2:1.5, with a shortened first note and one step
  changed; the bass enters at the octave at 4:1.

Schulenberg's notes also check out:
- "S M (B)" in the C minor: the bass states only the head (6 notes) at b. 5.
- "S M" without bass in the E flat: no bass entry in the opening.
- "S B" in the B minor: the middle voice enters only at b. 7, later.

## What the check shows about the categories

1. **"Initial imitation" must mean a whole statement, not a head.** In the B flat Invention the first
   imitation by machine is a head-only fragment inside a sequence. Schulenberg's "5" refers to the full
   restatement at the fifth. The protocol now distinguishes a statement from a fragment.
2. **A long strict imitation is not yet a canon.** The longest strict runs are in the two pieces Schulenberg
   calls canonic (C minor, 44 notes; F major, 60). But the G minor (38) and F minor (34) come next, and they
   are exchanges: the leader takes over the follower's line instead of going on with new material. The
   protocol tests canon against exchange explicitly.
3. **The asterisk (two subjects in invertible counterpoint).** Schulenberg gives it to six Inventions: E
   flat, E, f, A, B flat, b. The machine finds an exchange at the opening in four of them (E flat, E, f, A).
   - B flat exchanges at b. 6.
   - In the B minor the second line appears only against the answer, so there is no exchange at the
     opening.

   The full readings settle these.
4. **The G minor Invention.** The score's first imitation is at the octave (b. 3), as a voice exchange,
   apparently with the countermotive inverted; the fifth comes at b. 7. Schulenberg's "5" may describe the Clavier-Büchlein
   version: his Ex. 10.10 shows that its bars 1-2 originally lacked the bass. Or it may count the first
   imitation at a new pitch level. Open; the reading of the piece will say which.

## The pilot reading: the C major Invention against Schulenberg and Dreyfus

`data/inventions/readings/inven01.json`, made under the protocol. The reader knew Dreyfus's analysis, so
this tests the protocol's categories rather than giving an independent confirmation.

- **Against Dreyfus (ch. 1, Fig. 1.2): the same map.**
  - Two paradigms: α (bars 1-2) and β (the falling chain of the inverted motive, bars 3-6).
  - Their members: α in G with the voices exchanged (7-8); β in D minor to A minor, exchanged and in the
    minor (11-14); β mirrored and abandoned in the tonic (19-20).
  - Two linking sequences (9-10, 15-18) and a close.
  - About 14 of the 22 bars belong to the paradigms. Dreyfus says the same.
- **Against Schulenberg: agrees.**
  - Tripartite. The restatement at b. 7 is α in G.
  - The "medial recapitulation of other than the opening passage" at b. 11 is β's member.
  - The final recapitulation at b. 19 is the mirrored β in the tonic.

So the two external readings, one a map of operations and the other a formal table, coincide on this piece.
The protocol produces both from the same reading.
