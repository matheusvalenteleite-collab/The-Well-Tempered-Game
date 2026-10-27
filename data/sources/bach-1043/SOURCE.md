# Source: Bach, Concerto for Two Violins in D minor, BWV 1043

- The Mutopia Project, piece 3: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=3 (Mutopia-2015/09/02-3),
  fetched 27 October 2026. Typeset by David Chan in LilyPond 2.16 from the Bach-Gesellschaft edition
  (Leipzig, 1874, BG xxi/1). Files in `mutopia/3/`: the LilyPond source, one file per part per movement
  (`solo_violin1_1.ly` … `continuo_3.ly`, `header.ly`, the parts' and the score's main files), and the
  score's MIDI per movement (`score.mid` I, `score-1.mid` II, `score-2.mid` III; the parts' MIDI files
  left out, the same notes). `mutopia/mutopia.json` keeps the page's fields as fetched.
- **Rights.** Public domain (the typesetter's dedication: the file's header and Mutopia's page;
  https://www.mutopiaproject.org/legal.html). The game credits it anyway.
- **What it has.** Six parts: Solo Violin I and II, Violin I, Violin II, Viola, Continuo (unfigured; no
  keyboard realisation). The solo parts play with the tutti in the ritornelli, as printed.
- **Read by** `tools/touch/more-bach.ts` (D340): `score.ly`, its three `\score`s (I Vivace, 4/4, 88
  bars; II Largo ma non tanto, 12/8, 50 bars; III Allegro, 3/4, 154 bars after a quaver upbeat), the six
  parts as voices in score order. The MIDI's attacks are in the LilyPond: 99.9-100%. The player takes
  Solo Violin I or II (`playable`); the others are the band: the two ripieno violins and the viola on
  SUPER 16-BIT's strings, the continuo on its bassoon (D340; no sampled string orchestra is offered).
- **Checked against** CCARH's MuseData (bitbucket.org/musedata/bach, `bg/orch/1043/stage2/01-03`),
  for this private check only: CCARH's terms allow personal research use and forbid redistribution, so
  nothing of it is in this repository or the build. Every MuseData part has the same number of bars as
  Mutopia's: 88, 50 and 154 (MuseData has 8 parts: the 6 above, a Violoncello and a Violone doubling
  the continuo line, and a figured "Continuo [Harpsichord]"). The research report also found Solo Violin
  I's entry in bar 5 note for note the same in both.

| movement | bars (Mutopia) | bars (MuseData, each of its 8 parts) | voices (Mutopia) |
|---|---|---|---|
| I Vivace | 88 | 88 | 6 |
| II Largo ma non tanto | 50 | 50 | 6 |
| III Allegro | 154 | 154 | 6 |
