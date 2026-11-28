# Source: Bach, the six organ trio sonatas, BWV 525-530 (research files; nothing in the game reads them yet)

Fetched 28 November 2026 by the second account's research session (docs/research/ORGAN-TRIO-SONATAS.md). Kept here so a
later build need not download PDMX's 2 GB again.

## Mutopia (LilyPond), `mutopia/`

| sonata | files | page | typeset by, from | licence |
|---|---|---|---|---|
| BWV 528, Sonata IV in E minor | `BWV528/SonataIV.ly` (includes Adagio.ly, Andante.ly, Allegro.ly) | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=780 | Felix Braun, from Neue Bach-Ausgabe, Bärenreiter BA 5057 | Public domain (typesetter) |
| BWV 529, Sonata V in C major | `BWV529/bwv529.ly` (all three movements; \score 0, 2 and 4 are the movements) | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=703 | Urs Metzger, from Edition Peters 8656 | Public domain (typesetter) |

Read from Mutopia's GitHub mirror (github.com/MutopiaProject/MutopiaProject, `ftp/BachJS/`). Both read whole by
`tools/touch/lily_json.py`: three layers per movement, one per line (manual I, manual II, pedal). Ornament signs present
(55 `\prall`, 6 `\prallmordent`, 3 `\trill` between them).

## PDMX (MusicXML), `pdmx/<musescore id>.mxl` with `<id>.metadata.json`

PDMX: Long, Novack, Berg-Kirkpatrick and McAuley, Zenodo DOI 10.5281/zenodo.15571083 (dataset CC BY 4.0); the files
extracted from its `mxl.tar.gz` and `metadata.tar.gz`. Search of `PDMX.csv` (every row naming BWV 525-530, "trio sonata" or
"organ sonata" with Bach): these four only. **No BWV 526 or 530 in PDMX.**

| sonata | MuseScore score | by (MuseScore user) | licence | contents |
|---|---|---|---|---|
| BWV 525/I | 115160 (2013) | "Johann Sebastian Bach" (user 101554) | Public Domain Mark | 58 bars, one organ part, three layers (1:1, 2:5, 3:9) |
| BWV 525/II Adagio | 115448 (2013) | same | Public Domain Mark | 30 bars, repeats as signs |
| BWV 525/III Allegro | 115603 (2013) | same | Public Domain Mark | 64 bars, repeats as signs |
| BWV 527, all three movements | 5964748 (2020) | ninondusollie1 | CC0 | parts named flute, violin, bassoon, **at the organ's pitch**; 160 + 33 + 180 bars (movements begin at bars 1, 161, 194); 22 inverted mordents, 4 mordents, 1 trill, 1 schleifer |

## Checked against (not kept here; rights unclear)

- **Gary Bricault's MIDI files** ("J.S. Bach, Edition Peters, Arr. Gary Bricault, (c) 1997"), found in
  github.com/ianbacus/midi-and-guitar-tabs, `tabber/data/input_files/`: bwv525-1..3, bwv529-1..3, bwv530-1..3 (the 525 files are
  mislabelled "Trio Sonata 5" inside). Step-entered (on the grid), one track per line, written trills played out, repeats
  played. Against Mutopia's BWV 529: 98.7-100% of the score's notes at the same onset and pitch, voice by voice; the rest
  his trills. Against PDMX's BWV 525 (pitch order): top and pedal 98.3-99.7%, the middle line 92.4-97.9%: about eight
  passages where the two disagree, mostly an octave in the middle line (e.g. 525/I bars 32, 40-43, 50; 525/III bars 13-14,
  23). The print decides those. Licence: none stated beyond the copyright line.
- **bwv527.mid, bwv527_2.mid** (same GitHub folder): a Japanese sequencer's export (tracks Org.1, Org.2, pedal at three
  octaves), movements 1 and 2 only, author unknown. Against PDMX's BWV 527, pitch order: 91.8-94.8%. Not yet known which
  file is wrong where.

## Not machine-readable without a human step

IMSLP (pages read 28 Nov) has, behind its download check (a "verify you are human" page that a script must not pass):
Christian Mondrup's MUP sources (text files) for all six, arranged for recorders, mostly transposed, CC BY-NC-SA;
Michel Rondeau's Finale & MusicXML for BWV 525 and 526, arranged for trumpets, timpani and strings, CC BY-SA 4.0;
R. D. Tennent's MIDI (made by PhotoScore, a music-recognition program) of 526/2-3 and 528/2, CC BY-SA 4.0; Mondrup's
MIDI of 530 (CC BY-NC-SA 3.0). And the Bach-Gesellschaft scans (Band 15, 1867), public domain.
