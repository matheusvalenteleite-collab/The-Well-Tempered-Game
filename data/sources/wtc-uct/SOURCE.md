# Source: the 48 fugues in open score, edited by Kyle Rother (University of Cape Town, 2015)

- Johann Sebastian Bach, *the 48 fugues and 1 prelude from 'The Well-tempered Clavier'*, in an open
  score edition prepared by Kyle Rother (University of Cape Town, 2015), typeset in LilyPond 2.18,
  one staff per voice. Repository record: https://open.uct.ac.za/handle/11427/13106 (the two zips
  `book1`, `book2`, and the editor's notes, https://open.uct.ac.za/bitstreams/94bafc3e-2769-4d43-be18-e711d181a360/download).
  Fetched 27 October 2026.
- **Licence.** The repository record gives **CC BY 4.0**. The files say `copyright = "No rights reserved."`
  and "This edition is in the public domain, and the editor does not claim any rights in the
  content"; the notes: "the editor asserts no copyright in the content or the format. All are free to
  use this content in any way." Treated as CC BY 4.0: credit "Kyle Rother, University of Cape Town
  (2015), CC BY 4.0" (src/ui/Credits.tsx, the touch game's credits).
- **Edition.** "prepared and typeset by Kyle Rother using the 1866 Breitkopf & Härtel
  Bach-Gesellschaft Ausgabe as primary source. Reference was made to both the Henle and Bärenreiter
  urtext editions, as well as the critical and scholarly commentary of Alfred Dürr."
- Files here: the LilyPond sources only (`book1/fugueNN.ly`, `book1/prelude07.ly`, `book2/fugueNN.ly`),
  renamed from `fugueN_BWV/fugueN_expanded.ly` (Book I no. 10: `fugue10_basic.ly`); the PDFs are not
  kept. The text is as published; nothing in these files is edited.
- Read by `tools/wtc/lily.py` (through `tools/touch/lily_json.py`) in `tools/wtc/sources.ts`: each staff
  a voice; a staff opened inside another's music (I/6, II/1, II/3: a voice dividing at the end) is that
  voice's; I/9's small staff in bar 26 is an ossia, left out.
- **Corrections** (`tools/wtc/corrections.ts`, each with its reason; listed in docs/wtc/IMPORT.md):
  the edition's slips, corrected to the reading two independent witnesses share (the OpenWTC or
  verits99 MusicXML, CC0, and the private Humdrum cross-check of the Bach-Gesellschaft edition; for
  I/1, I/8, II/2 also Mutopia): I/4's mezzo an octave too high from bar 25 (a missing `,` in
  `\relative`), wrong accidentals, octaves and letters, ties left out; and Rother's own interventions
  taken back to the Bach-Gesellschaft's text, as his notes describe them: I/4 bar 103 (the alto entry
  he gave the mezzo), I/5 (his triplet demisemiquavers: the Bach-Gesellschaft's three demisemiquavers
  after the double-dotted quaver, as the game played them), I/17 (his suggested ties, dashed, in bars
  6-7 and 30-31). II/3's demisemiquaver figures are the Bach-Gesellschaft's (Rother writes one
  semiquaver for two); II/10's dotted rhythms are played with the triplets, as the game always played
  them. (His note on Prelude 7's tie concerns the prelude, which the game takes from OpenWTC.)
- The check against the Humdrum encoding and the witnesses, piece by piece: docs/wtc/SOURCES-CHECK.md.
