# Source: the Open Well-Tempered Clavier, Book I (MuseScore, 2015)

- *The Open Well-Tempered Clavier*, Book I, the MuseScore edition: Kimiko Ishizaka and the
  OpenGoldberg team (musescore.com user OpenGoldberg, 9836), publicly reviewed in 2014-15 (set "Open
  Well-Tempered Clavier - MuseScore edition", https://musescore.com/opengoldberg/sets/openwtc). One
  score per prelude and fugue (24 files, scores 719516-719631), as kept in the PDMX dataset (Long,
  Novack, Berg-Kirkpatrick and McAuley, *PDMX: A Large-Scale Public Domain MusicXML Dataset*, 2024; zenodo.org/records/14648209, CC BY 4.0), MusicXML
  (`.mxl`). Fetched 27 October 2026.
- **Licence: CC0 1.0** (dedicated to the public domain): every score's metadata, as PDMX records it,
  `license: cc-zero`, "Creative Commons copyright waiver"
  (https://creativecommons.org/publicdomain/zero/1.0/), no licence conflict flagged; the Wikimedia
  Commons page of the edition's PDF and opensource.com (2015) say the same. Credited though CC0 asks
  for nothing.
- `index.json` beside this file: for each score, the MuseScore id and page, the uploader, the licence
  string, the creation and update dates, the revision and the PDMX paths (`mxl`, `metadata`).
- **Used for** Book I's 24 preludes (`tools/wtc/sources.ts`: the measures before the fugue's first;
  the two staves as the two hands) — but no. 4, whose four voices come from the Mutopia Project's
  public-domain edition (data/wtc/sources/mutopia/BachJS/BWV849/bwv849a). The fugues of these files are
  a witness only (`tools/wtc/sources-check.ts`, the fugues' corrections).
- **Corrections** (tools/wtc/corrections.ts, docs/wtc/IMPORT.md): 25 notes, where Mutopia and/or
  verits99's score at A = 415 Hz (data/sources/wtc-musescore/a415) agree with the Humdrum cross-check;
  I/19 bar 14's bass (OpenWTC's bar ends early), I/7 bar 49 and I/23 bar 19 (a note left out). I/15's
  "24/16" (written as words over 4/4) is kept as the metre, as before.
