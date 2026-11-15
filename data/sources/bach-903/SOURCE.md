# Source: Bach, Chromatic Fantasia and Fugue in D minor, BWV 903: the Fugue

Fetched 15 November 2026 from the Mutopia Project, in `mutopia/1604/` (`mutopia/mutopia.json` keeps the page's
fields). Read by `tools/touch/more-bach.ts` into `data/touch/more-bach.json` (play.html's MORE BACH, section
FANTASIAS AND FUGUES, D753) as `bwv903-2`.

| game id | piece | Mutopia page | typeset by | source edition | licence |
|---|---|---|---|---|---|
| bwv903-2 | Fugue, D minor, 3/4, 161 bars, three voices | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1604 | Greg Louis | Bach-Gesellschaft 1890 | public domain; **ten notes corrected from the Bach-Gesellschaft print (below)** |

The Fantasia (Mutopia 1603, public domain) is not taken: two staves of figuration, a quarter of its bars arpeggiated
block chords left to the player to spread, a third recitative over chords of five to eight notes; only bars 1-26 are
lines (the owner to choose: left out, or bars 1-26 as an excerpt).

## Rights

Dedicated to the public domain by its typesetter (https://www.mutopiaproject.org/legal.html).

## Read

From the LilyPond file (`tools/touch/lily_json.py --as-written`): the soprano `upper:1`, the middle voice two
streams (`upper:2` and `lower:1`: it changes staff), the bass `lower:2`; the chords at the climaxes and the end
(bars 53, 94, 135, 158-161) go to a band voice sounding as the staff's (D363 divisi). The MIDI agrees 100 % both
ways (it is made from the same file: not a witness).

## Checked against

| witness | licence | result |
|---|---|---|
| Busoni's edition (Simrock), typeset by Davide Madrisan, github.com/madrisan/open-scores (`chromatische-fantasie-und-fugue-BWV903-busoni`) | CC BY-NC-SA 4.0: a check only, never shipped | pitches agree but twelve; each read from the print below |

## The twelve differences read from the Bach-Gesellschaft print

Bach-Gesellschaft Ausgabe, Band 36 (Clavierwerke IV, ed. Ernst Naumann, 1890), No. X, the Fuga on printed pp. 75-80:
https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2036.pdf (PDF pages 177-182), each spot read from
a 300-dpi render. Applied by `more-bach.ts` (`BWV903_FIXES`, `applyFixes`: each note found by its place in the bar
and its pitch as read) to the notes as read; the files kept as fetched.

| bar | place (of a whole note) | voice | Mutopia | print (kept) |
|---|---|---|---|---|
| 27 | 11/16 | bass | B2 | B♭2 |
| 32 | 5/8 | middle | C4 | E♭4 |
| 55 | 1/2 | bass | G3 | G♯3 |
| 58 | 11/16 | bass | G3 | G♯3 |
| 90 | 1/4 | middle | F4 | G4 |
| 94 | 0 | bass (chord) | G♯3 | F♯3 |
| 111 | 0 | middle | B4 | B♭4 |
| 114 | 3/16 | bass | E3 | D3 |
| 127 | 9/16 | bass | D3 | F3 |
| 157 | 1/16 | middle | E5 | D5 |

Mutopia kept where the print agrees with it (Busoni differs): bar 35 (F4, the trill's ending) and bar 92 (F♮4).
