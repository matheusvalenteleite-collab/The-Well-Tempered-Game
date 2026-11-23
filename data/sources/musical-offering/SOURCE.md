# Source: Bach, Musikalisches Opfer (The Musical Offering), BWV 1079: the two ricercars

From the Mutopia Project, LilyPond source and the edition's MIDI, fetched 27 October 2026, in
`mutopia/<id>/` (`mutopia/mutopia.json` keeps each page's fields as fetched).

| game id | piece | page | files | typeset by, from | updated |
|---|---|---|---|---|---|
| bwv1079-ric3 | Ricercar a 3 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=690 | ricercare.ly, ricercare.mid | Arnaud Gossart, Breitkopf & Härtel 1885 | 2006-03-02 |
| bwv1079-ric6 | Ricercar a 6 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=702 | ricercare6.ly, ricercare6.mid | Arnaud Gossart, Breitkopf & Härtel 1885 | 2006-03-23 |

- **Rights.** Public domain (the typesetter's dedication, in the file's header and on Mutopia's page;
  https://www.mutopiaproject.org/legal.html). The game credits it anyway.
- **Read by** `tools/touch/more-bach.ts` (D340): the voices from the LilyPond (the Ricercar a 3 on two
  staves, its upper staff's two voices taken apart; the Ricercar a 6 on six staves). The MIDI's attacks
  are all in the LilyPond (100%).
- **Checked** (`tools/touch/more-bach-check.ts --mo DIR`) against Craig Sapp's kern
  (github.com/craigsapp/bach-musical-offering, 2024, no licence stated: read for the check only, never
  shipped): the Ricercar a 3, 185 bars and 3 voices in both, 99.8% of the attacks agreeing; the
  Ricercar a 6, 206 bars of 2/2 against Sapp's 103 of 4/2, 6 voices in both, 65.5% agreeing. The
  difference is the check's kern reader, not the edition: at bar 9 the reader gives Sapp's second voice
  as G B♭ E♭ F♯ (no C), where the tonal answer, and Mutopia, has G B♭ C E♭ F♯. Not pursued further.
- Left out at first (D340): the canons and the trio sonata (no verified free encoding then). Added in D964, below.

# The canons, the Fuga canonica and the trio sonata (D964)

From PDMX ("PDMX: A Large-Scale Public Domain MusicXML Dataset for Symbolic Music Processing", Long, Novack,
Berg-Kirkpatrick and McAuley; Zenodo, DOI 10.5281/zenodo.15571083; the dataset CC BY 4.0), fetched 23 November 2026:
each score's MusicXML kept as `pdmx/<musescore id>.mxl`, with its PDMX metadata as `pdmx/<id>.metadata.json`.

| game id | piece | MuseScore score | by | licence |
|---|---|---|---|---|
| bwv1079-3a | Canon a 2 cancrizans | 143009 | Roland Bouman | CC0 |
| bwv1079-3b | Canon a 2 violini in unisono | 234011 | verits99 | CC0 |
| bwv1079-3c | Canon a 2 per motum contrarium | 234061 | verits99 | CC0 |
| bwv1079-3d | Canon a 2 per augmentationem, contrario motu | 235391 | verits99 | CC0 |
| bwv1079-3e | Canon a 2 per tonos | 235326 | verits99 | CC0 |
| bwv1079-4 | Fuga canonica in Epidiapente | 237496 | verits99 | CC0 |
| bwv1079-2 | Canon perpetuus super Thema Regium | 237336 | verits99 | CC0 |
| bwv1079-9 | Canon perpetuus (contrario motu, per giusti intervalli) | 238486 | verits99 | CC0 |
| bwv1079-6 | Canon a 2 "Quaerendo invenietis" | 238516 | verits99 | CC0 |
| bwv1079-7 | Canon a 4 | 238991 | verits99 | CC0 |
| bwv1079-8a–8d | Sonata sopr'il Soggetto Reale, I–IV | 230326, 232966, 233106, 233216 | verits99 | CC0 |

- **Read by** `tools/touch/more-bach.ts` (D964, `MO_CANONS`, `MO_TRIO`): verits99's set is written a semitone low
  (to sound at A = 415 Hz): read up a semitone and a letter (C minor back from B minor; a few spellings come back
  enharmonic). Each line a layer of its part ("part:staff:voice"). The trills the files write out as notes folded
  back into their main note with a trill sign (`foldTrills`). The trio's fourth line, the editor's continuo
  realization, left out (`xmlDrop`): Bach's bass alone.
- **The canons' solutions**: each one obeys its rubric in the game's notes (`tools/touch/canon-check.ts`;
  test/d964-musical-offering.test.ts), and each is the solution Nuno Rodrigues prints (his complete edition, IMSLP
  936489, 2022, CC BY-SA 4.0, supplied by the owner and kept on the deploy branch at
  data/source/bwv1079/; read as a check only). Where the solution is set by octaves, as printed: the crab canon at
  the unison (Bouman's file has its partner an octave down), the Canon a 4's second and fourth entries an octave
  below the first and third (verits99's has all four at one pitch). Rodrigues notes his keyboard version raises the
  left hand an octave; the Bach-Gesellschaft (BG 31.2) would settle the Canon a 4's octaves, and is not read yet.
- **Rounds**: the perpetual canons once through with the print's repeat, ending where Rodrigues ends, taken from
  the files' written-out rounds (Spec `xmlRanges`; Canon 9's last bar its first chord, `endChord`); the canon per
  tonos its six rising rounds; Quaerendo invenietis its first solution (the file holds two).
- **The trio sonata** checked against Craig Sapp's kern of BG 31.2 (github.com/craigsapp/bach-musical-offering, no
  licence stated: read as a check only): after the trills are folded, each line holds Sapp's notes at their time
  and pitch, 98–100% (I: the repeats written out in the file, the first time taken: bars 1–16, 33–63 and the
  second ending; II: its sections as Sapp's A B C B).
- Not used: verits99's "Canone inverso" (the crab canon written out four times), a second cancrizans (Gabriele
  Cardosi's, for recorders, transposed) and a second per tonos (__papageno__'s, for strings).
