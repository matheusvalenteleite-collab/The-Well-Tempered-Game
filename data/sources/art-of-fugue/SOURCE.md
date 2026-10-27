# Source: Bach, Die Kunst der Fuge (The Art of Fugue), BWV 1080

All from the Mutopia Project (https://www.mutopiaproject.org), LilyPond source and the edition's own
MIDI, fetched 27 October 2026 (Contrapunctus 14: 22 October 2026). Mutopia numbers the pieces as the
Bach-Gesellschaft did (1878); the game shows today's numbers (BWV 1080/1-19).

- **Rights.** Every piece below is **public domain**: each typesetter dedicated the edition to the public
  domain, as the file's header and Mutopia's page state (Mutopia's terms: "All music on Mutopia may be
  freely downloaded, printed, copied, distributed, modified, performed and recorded",
  https://www.mutopiaproject.org/legal.html). No credit is required; the game gives one anyway (the
  pop-up of each piece, the MORE BACH tab's SOURCES & CREDITS).
- **Read by** `tools/touch/more-bach.ts` (D340) into `data/touch/more-bach.json`, except Contrapunctus
  14 (`contrapunctus-xiv/`), read by `tools/touch/extract.ts` (`contrapunctus()`, D169, D189) into
  `data/touch/pieces.json`.

| game id | today | Mutopia | page | files (in `mutopia/<id>/`) | typeset by, from | updated |
|---|---|---|---|---|---|---|
| bwv1080-01 | Contrapunctus 1 | Contrapunctus I | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=693 | contrapunctusI.ly (+ .ily), .mid | Pierre-Luc Gauthier, Breitkopf & Härtel 1885 | 2016-07-21 |
| bwv1080-02 | Contrapunctus 2 | Contrapunctus II | …?id=719 | contrapunctusII.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-02 |
| bwv1080-03 | Contrapunctus 3 | Contrapunctus III | …?id=720 | contrapunctusIII.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-07 |
| bwv1080-04 | Contrapunctus 4 | Contrapunctus IV | …?id=721 | contrapunctusIV.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-07 |
| bwv1080-05 | Contrapunctus 5 | Contrapunctus V | …?id=722 | contrapunctusV.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-07 |
| bwv1080-06 | Contrapunctus 6 (in Stylo Francese) | Contrapunctus VI | …?id=734 | contrapunctusVI.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-09 |
| bwv1080-07 | Contrapunctus 7 | Contrapunctus VII | …?id=736 | contrapunctusVII.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-13 |
| bwv1080-08 | Contrapunctus 8 (a 3) | Contrapunctus VIII | …?id=739 | contrapunctusVIII.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-18 |
| bwv1080-09 | Contrapunctus 9 | Contrapunctus IX | …?id=740 | contrapunctusIX.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-18 |
| bwv1080-10 | Contrapunctus 10 | Contrapunctus X | …?id=744 | contrapunctusX.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-23 |
| bwv1080-11 | Contrapunctus 11 | Contrapunctus XI | …?id=745 | contrapunctusXI.ly, .mid | Arnaud Gossart, B&H 1885 | 2016-01-21 |
| bwv1080-12r, -12i | Contrapunctus 12 a 4, rectus, inversus | Contrapunctus XVIII a 4 | …?id=764 | rectus.ly, inversus.ly, contrapunctusXVIII.ly, score.ly; rectus.mid, inversus.mid | Arnaud Gossart, B&H 1885 | 2006-05-08 |
| bwv1080-13r, -13i | Contrapunctus 13 a 3, rectus, inversus | Contrapunctus XVI a 3 | …?id=751 | rectus.ly, inversus.ly, contrapunctusXVI.ly, score.ly; rectus.mid, inversus.mid | Arnaud Gossart, B&H 1885 | 2006-05-03 |
| bwv1080-c14 | Canon per Augmentationem in Contrario Motu (1080/14) | Contrapunctus XV | …?id=750 | contrapunctusXV.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-05-03 |
| bwv1080-c15 | Canon alla Ottava (1080/15) | Contrapunctus XII | …?id=746 | contrapunctusXII.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-28 |
| bwv1080-c16 | Canon alla Decima (1080/16) | Contrapunctus XIV | …?id=749 | contrapunctusXIV.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-05-03 |
| bwv1080-c17 | Canon alla Duodecima (1080/17) | Contrapunctus XIII | …?id=748 | contrapunctusXIII.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-04-28 |
| bwv1080-14 | Contrapunctus 14, Fuga a 3 soggetti (1080/19), unfinished | Contrapunctus XIX | …?id=766 | `contrapunctus-xiv/` contrapunctusXIX.ly, .mid | Arnaud Gossart, B&H 1885 | 2006-05-10 |

("…?id=N" is https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=N; `mutopia/mutopia.json` keeps
each page's fields as fetched.) Left out: Mutopia's Fuga a 2 Clav. (XVII, id 752; Bach's arrangement
of 13 for two keyboards) and its recorder-trio arrangement of a rectus (id 966).

**How it is read.** The voices, pitches as spelled, and bars from the LilyPond (tools/wtc/lily.py),
each `\repeat volta` once as printed (the Canons alla Ottava and alla Duodecima have repeats; Mutopia's
MIDI plays them twice). From the MIDI, a track a voice, where the reader cannot take the LilyPond
apart: Contrapunctus 1 (its voices are include files with `\part` commands) and the mirror fugues (one
file holds both forms, chosen by tags); there the pitches are spelled from the LilyPond's notes at the
same onset and pitch where they exist, else as the piece spells that pitch most often. The two
readings agree: 99.9-100% of the MIDI's attacks (onset, pitch) are in the LilyPond wherever it was read
(Contrapunctus 1: 27%, because the reader gets only its first voice; the MIDI is used).

**Checked against a second source** (`node tools/touch/more-bach-check.ts --aof DIR`): Craig Stuart
Sapp's kern edition (github.com/craigsapp/art-of-the-fugue, 2024; no licence stated, so read for this
check only and never shipped). Share of the game's attacks found in Sapp's, aligned at the start:

| piece | bars (Mutopia) | bars (Sapp) | voices | voices (Sapp) | attacks agreeing |
|---|---|---|---|---|---|
| bwv1080-01 | 78 | 78 | 4 | 4 | 100.0% |
| bwv1080-02 | 84 | 84 | 4 | 4 | 99.9% |
| bwv1080-03 | 72 | 72 | 4 | 4 | 100.0% |
| bwv1080-04 | 138 | 138 | 4 | 4 | 99.8% |
| bwv1080-05 | 91 | 90 | 4 | 4 | 99.4% |
| bwv1080-06 | 79 | 79 | 4 | 4 | 99.6% |
| bwv1080-07 | 61 | 61 | 4 | 4 | 99.5% |
| bwv1080-08 | 188 | 188 | 3 | 3 | 99.9% |
| bwv1080-09 | 130 | 130 | 4 | 4 | 99.9% |
| bwv1080-10 | 120 | 120 | 4 | 4 | 99.4% |
| bwv1080-11 | 184 | 184 | 4 | 4 | 99.7% |
| bwv1080-12r | 56 | 56 | 4 | 4 | 100.0% |
| bwv1080-12i | 56 | 113 | 4 | 4 | 99.8% |
| bwv1080-13r | 71 | 71 | 3 | 3 | 98.7% |
| bwv1080-13i | 71 | 143 | 3 | 3 | 98.4% |
| bwv1080-c14 | 109 | 109 | 2 | 2 | 99.9% |
| bwv1080-c15 | 103 | 103 | 2 | 2 | 99.2% |
| bwv1080-c16 | 82 | 82 | 2 | 2 | 99.8% |
| bwv1080-c17 | 78 | 78 | 2 | 2 | 100.0% |

Differences: Sapp bars the two inversus forms in half-bars (113 and 143 bar lines for 56 and 71 bars);
Mutopia writes the Canon alla Decima in 12/8 where Sapp has 4/4, every value half again (the check
rescales; the pitches agree); Contrapunctus 5 counts a bar more in Mutopia (its last). Contrapunctus 14:
239 bars in both (D169).
