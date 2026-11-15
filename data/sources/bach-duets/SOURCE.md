# Source: Bach, Four Duets (Clavier-Übung III), BWV 802-805

Fetched 15 November 2026 from the Mutopia Project: LilyPond source and the edition's MIDI, in
`mutopia/<id>/` (`mutopia/mutopia.json` keeps each page's fields as fetched). Read by
`tools/touch/more-bach.ts` into `data/touch/more-bach.json` (play.html's MORE BACH, section FOUR DUETS, D751).

| game id | piece | Mutopia page | typeset by | source edition | licence |
|---|---|---|---|---|---|
| bwv802 | Duet 1, E minor, 3/8, 73 bars | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1596 | H. Gillis | Bach-Gesellschaft / Ernst Naumann 1890 | **CC BY-SA 3.0** |
| bwv803 | Duet 2, F major, 2/4, 149 bars | …?id=360 | Vit Reichel | Edition Peters | public domain |
| bwv804 | Duet 3, G major, 12/8, 39 bars | …?id=1597 | H. Gillis | Bach-Gesellschaft / Ernst Naumann 1890 | public domain |
| bwv805 | Duet 4, A minor, 2/2, 108 bars | …?id=1598 | H. Gillis | Bach-Gesellschaft / Ernst Naumann 1890 | public domain; **twelve notes corrected from the Bach-Gesellschaft print (below)** |

## Rights

The public-domain pieces are dedicated to the public domain by their typesetters (https://www.mutopiaproject.org/legal.html).
Duet 1 is under Creative Commons Attribution-ShareAlike 3.0 (https://creativecommons.org/licenses/by-sa/3.0/): its card's
credit names the edition and the licence, and the note data derived from it is shared alike (as the Inventions'
CC BY-SA pieces, D340).

## Read

Each piece from its LilyPond file (`tools/touch/lily_json.py --as-written`), two voices, one a staff, no chords; checked
against the edition's MIDI note by note: 802 and 804 100 % both ways; 803 99.6 % (its six appoggiaturas, which the
reader leaves out, and its MIDI's two trills played out). 803, bar 112: four notes of the lower voice written on the
upper staff (`\change Staff`) are kept in the lower voice. BWV 804's file as fetched leaves its final `\paper` block
open, which the reader refuses: `Bach-Duet3.closed.ly` is that file with one `}` appended, nothing else changed.

Entries: 803, 804 and 805 by the finders (D340: the first two voices' openings), 9 each. 802's finders took a bare
scale fragment for the subject (48 "entries"): its subject is given by hand (more-bach.ts `theme`): the upper voice's
opening run and turn, 15 notes, answered by the lower at bar 7: 26 entries.

## Checked against

| piece | witness | licence | result |
|---|---|---|---|
| 804 | MuseScore score 5857390 ("DUETTO No. 3, BWV 804.", user 7789841), from the PDMX dataset (https://zenodo.org/records/15571083, record `license` cc-zero) | CC0 (as PDMX records it) | 715/715 and 648/649 notes agree in pitch; bar 21, lower voice, 6th group, 2nd sixteenth: Mutopia G♯3, witness G3 (to settle against the Bach-Gesellschaft print); rhythm differs in bars 16-19 and the last bar's length |
| 802, 803 | none independent found (KernScores offline on the day; IMSLP PDFs only; the copies on GitHub and Wikimedia are Mutopia's own) | | each LilyPond agrees with its own MIDI as above |
| 805 | an independent LilyPond arrangement for flute and cello (github.com/cellist/Lilypond-Sheet-Music, "Duett BWV 805"; no licence stated: a check only, never shipped) | UNCONFIRMED | about twenty pitches differ; each settled from the print below |

## BWV 805 (and 804, bar 21) read from the Bach-Gesellschaft print

The print: Bach-Gesellschaft Ausgabe, Band 3 (ed. C. F. Becker, Breitkopf & Härtel 1853, plate "B.W. III"), the
copy at https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2003.pdf (the same plates as IMSLP's
#00821-#00822, which refused automated download): BWV 804 on its pp. 248-250, BWV 805 on pp. 251-253, each
difference read from a 300-dpi render (an accidental lasting the bar in its octave; a tied note not re-marked).
Applied by `more-bach.ts` (`DUET4_FIXES`, `applyFixes`) to the notes as read; the files kept as fetched (their
LilyPond-against-MIDI agreement is measured before the corrections).

| bar | voice | Mutopia | print (kept) |
|---|---|---|---|
| 16 | lower | D4 | D♯4 |
| 19 | lower | C3 (5th note) | C♯3 (the bar's sharp) |
| 22 | upper | E5 (beat 3) | G5 |
| 28 | lower | G3 | F3 |
| 46 | upper | F♯4, D4 | D♯4, D♯4 |
| 48 | upper | D5 | D♯5 |
| 51 | upper | B4 (5th note) | G♯4 |
| 67 | lower | G3 (6th note) | F3 |
| 67-68 | upper | B♭4 tied to B4 | B♭4 held |
| 74 | lower | G♯3 | F♯3 |
| 80 | upper | C5 (5th note) | C♯5 (the bar's sharp) |
| 90-91 | lower | E♭4 tied to E4 | E♭4 held |

Mutopia kept where the print agrees with it (the arrangement differs): bars 20, 27, 32-33 (the arranger's octave),
64, 66, 83 (the lower staff in the treble clef there), 89; and BWV 804, bar 21: G♯3 as printed.
