# Source: Bach, Fugue in B minor on a Theme by Albinoni, BWV 951

Fetched 15 November 2026 from PDMX, "PDMX: A Large-Scale Public Domain MusicXML Dataset for Symbolic Music
Processing" (Zenodo, 2025-06-01, DOI 10.5281/zenodo.15571083; the dataset CC BY 4.0), its file
`mxl/4/18/QmeEejJZ5MQEzJjJzqnEFhW9Y4nDyWrK5Py3psjuCTENEe.mxl`, kept as `pdmx/2069976.mxl` with its MuseScore
metadata as `pdmx/2069976.metadata.json`. Read by `tools/touch/more-bach.ts` into `data/touch/more-bach.json`
(play.html's MORE BACH, section FANTASIAS AND FUGUES, D754) as `bwv951`.

| game id | piece | score page | typeset by | source edition | licence |
|---|---|---|---|---|---|
| bwv951 | Fugue, B minor, 4/4, 112 bars, three voices | https://musescore.com/user/18579/scores/2069976 | MuseScore user "cadams" (2016, revised 2018) | not named | the uploader's Public Domain mark (metadata `"license": "publicdomain"`, `license_id` 8); **fourteen pitches and the ties corrected from the Bach-Gesellschaft print (below)** |

The metadata also carries `"is_public_domain": false`, a MuseScore field whose meaning is not documented in the
metadata; the licence field is the uploader's choice of licence and is the one recorded here.

## Read

One harpsichord part on two staves, the voices written in layers (`staff:voice` as MusicXML writes them), joined
by `xmlVoices`: the soprano `1:1`; the alto `1:2`, with `1:7`, `2:2`, `2:6`, `2:7` where it is written in another
layer or on the lower staff (bars 12, 28-29, 40-41, 59, 67-69, 83-84, 93-95, 97, 103-104); the bass `2:5`, with
`2:1` (bar 94). Joined so, no voice overlaps itself but the soprano's last chord (bar 112, to the band: D363).
The subject and answer given by hand (`theme`): the finders take the tonal answer (bar 3, soprano) for the subject
in E.

## Checked against

| witness | licence | result |
|---|---|---|
| Davide Madrisan's typesetting, github.com/madrisan/open-scores (`bwv951`), LilyPond | CC BY-NC-SA 4.0: a check only, never shipped | 2834 notes against PDMX's 2861: pitches differ at 18 places, ties at 38, onsets at 5; each read from the print below |

## The eighteen pitch differences read from the Bach-Gesellschaft print

Bach-Gesellschaft Ausgabe, Band 36 (Clavierwerke IV, ed. Ernst Naumann, 1890), No. XXXVI, "Fuge, H-moll, über ein
Thema von Albinoni", printed pp. 178-183: https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2036.pdf
(PDF pages 280-285), each spot read from a 300-dpi render. Applied by `more-bach.ts` (`BWV951_FIXES`, `applyFixes`:
each note found by its voice, its place in the bar and its pitch as read); the file kept as fetched.

| bar | place (of a whole note) | voice | PDMX | print (kept) |
|---|---|---|---|---|
| 8 | 1/8 | alto | D4 | D♯4 |
| 21 | 3/4 | bass | D3 | B2 |
| 38 | 5/16 | alto | E4 | D4 |
| 52 | 1/8 | alto | C♯5 | C♮5 |
| 52 | 1/4 | alto | C♯5, struck | C♮5, tied from 1/8 |
| 52 | 5/16 | alto | C♯5 | C♮5 |
| 52 | 15/16 | bass | F♯3 | E♯3 |
| 59 | 7/8 | alto | G4 | G♯4 |
| 70 | 0 | alto | C♯4 | A3 |
| 70 | 7/16 | soprano | C♯5 | A4 |
| 71 | 27/32 | soprano | D5 | D♯5 |
| 85 | 3/16 | bass | C♯4 | C♮4 |
| 92 | 0 | bass | D♯3 | D♮3 |
| 99 | 5/8 | alto | A♯4 | A♮4 |
| 108 | 13/16 | alto | B3 | C♯4 |

PDMX kept where the print agrees with it (Madrisan differs): bar 55 (E4), bar 62 (D3), bar 95 (E♯4), bar 98 (F♯5).

## Ties

TIES_PENDING
