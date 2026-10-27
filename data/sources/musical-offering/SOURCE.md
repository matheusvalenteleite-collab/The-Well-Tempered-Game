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
- Left out (D340): the canons and the trio sonata (no verified free encoding: see the sources report).
