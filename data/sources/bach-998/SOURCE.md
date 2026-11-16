# Source: Bach, Prelude, Fugue and Allegro in E-flat major, BWV 998

Fetched 16 November 2026 from PDMX, "PDMX: A Large-Scale Public Domain MusicXML Dataset for Symbolic Music
Processing" (Zenodo, 2025-06-01, DOI 10.5281/zenodo.15571083; the dataset CC BY 4.0), its file
`mxl/4/35/Qmeobg8zHfxSXd4Cmy2E2AHmwpcnKr5P7wakyrnKXXjF2Z.mxl`, kept as `pdmx/132011.mxl` with its MuseScore
metadata as `pdmx/132011.metadata.json`. Read by `tools/touch/more-bach.ts` into `data/touch/more-bach.json`
(play.html's MORE BACH, section FANTASIAS AND FUGUES, D756) as three pieces of one work.

| game id | movement | the file's bars | score page | typeset by | licence |
|---|---|---|---|---|---|
| bwv998-1 | Prelude, 12/8, 48 bars | 1-48 | https://musescore.com/user/13172/scores/132011 | MuseScore user "verits99" (2013, revised 2019) | CC0 1.0 (metadata `"license": "cc-zero"`, "Creative Commons copyright waiver") |
| bwv998-2 | Fugue, 4/4, 103 bars (the da capo written out, as the print has it) | 49-151 | the same | the same | the same |
| bwv998-3 | Allegro, 3/8, 96 bars (each repeated half once) | 152-183, 216-279 | the same | the same | the same |

Keyboard notation at Bach's pitch, in E-flat (not a guitar transposition). No source edition is named. The typesetter's
tempo words ("Presto", "Vivace") are not Bach's and are not used. Each movement's bars are numbered from 1 here and
below, as in the print.

## Read

One part on two staves, the voices from its written layers (`staff:voice`, `xmlVoices`; `xmlRanges` takes the bars,
the Allegro's written-out repeats left out: the print has plain repeats of bars 1-32 and 33-96, no first or second
endings, and the file's second passes are identical to its first).

- Prelude: the broken-chord line `1:1` (with the inner voice of bars 36-40, `1:2`: chords, to the band); the bass `2:5`.
- Fugue: the soprano `1:1`; the alto `1:2`, `1:5`, `2:1`, `2:2`, and `2:5` where it enters (bars 3-10, again 78-84)
  and in bars 33, 43, 45; the bass `2:5` elsewhere, `2:6`, `1:3`. In the four-part bars (23-29, 31-32, 97-103) the
  fourth part shares the bass's layers and goes to the band (D363). Notes in another voice's layer, given to the voice
  the print stems and beams them with (`toVoice` fixes): bars 29 and 103 (B♭3 to the alto, G3 to the bass), 55, 58-60,
  68, 69, 76.
- Allegro: the running line on either staff (`1:1`, `2:1`, with the few inner notes `1:2`, `1:6`: chords, to the band);
  the bass `2:5`.

## Checked against

| witness | licence | result |
|---|---|---|
| Mutopia 1627, "Fuge Es-Dur BWV 998", typeset by Hajo Dezelski (2009), LilyPond, the Fugue only | CC BY-SA 3.0 | differences in the Fugue, each read from the print below (it names "Bach-Gesellschaft Band 3" as its source: BWV 998 is in Band 45/1) |
| Davide Madrisan's typesetting, github.com/madrisan/open-scores, LilyPond, all three movements (from Gouin, Les Éditions Outremontaises, 2005) | CC BY-NC-SA 4.0: a check only, never shipped | differences in all three, each read from the print below |

## The differences read from the Bach-Gesellschaft print

Bach-Gesellschaft Ausgabe, Band 45/1 (1897, ed. Alfred Dörffel), "Verschiedene Instrumentalcompositionen", I.
Praeludium und Fuge: Prelude printed pp. 141-142, Fuga 143-146, Allegro 147-148 (PDF pages 219-226):
https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2045_1.pdf. Each spot read from a 300-dpi render.
Applied by `more-bach.ts` (`BWV998_1_FIXES`, `BWV998_2_FIXES`, `BWV998_3_FIXES`, `applyFixes`, each note found by its
voice, place and pitch); the file kept as fetched.

| movement, bar | place (of a whole note) | voice | PDMX | print (kept) |
|---|---|---|---|---|
| Prelude 9 | 3/8 | upper | D4 | D♭4 |
| Prelude 37 | 1/8 | inner | C4 | A♭3 |
| Prelude 46 | 3/4 | bass | E♭3 held from 5/8 | E♭3 quaver, then E♭3 struck again (no tie) |
| Fugue 17, 91 | 7/8 | alto | C4 | B♭3 |
| Fugue 23, 97 | 7/8 | alto | B♭3 | D4 |
| Fugue 69 | 3/16 | soprano | D3, a quaver | D3, a semiquaver |
| Fugue 75 | 1/4 | soprano | a trill written out in demisemiquavers | A4, a dotted quaver (then B♭4) |
| Allegro 31 | 1/8 | upper | a trill written out in demisemiquavers | A4, a dotted quaver (then B♭4) |
| Allegro 88 | 5/16 | upper | F3 | F4 |
| Allegro 90 | 1/8, 1/4 | upper | F3, D3 added to the line | G3 A♭3 F3 alone |

The PDMX file kept where the print agrees with it: Prelude 20 (A♭4), 47 (the chord E♭3 + C3); Fugue 26 and 100 (one
B♭3), 57 (A♮3), 66 (E♭3, F3 once), 74 (B♭2), 76 (A♭3), 77 (D4 at 3/8), 89 (one E♭4), 99 (D♭4). Fugue 18 and 92: the print
has F4 with an editorial ♯ above it (Dörffel's suggestion, not Bach's text): F4 is kept, as the file has it.
