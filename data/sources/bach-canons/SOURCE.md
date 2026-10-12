# Source: Bach's canons (CANON session, K1)

The owner (12 October 2026): study Bach's canons — the Art of Fugue, the Musical Offering, the Goldberg
Variations and BWV 1087 — to learn how Bach writes canons before writing any.

| set | pieces | file | source | rights |
|---|---|---|---|---|
| Goldberg Variations BWV 988 | Aria (for the ground); the nine canons, Var. 3, 6, 9, 12, 15, 18, 21, 24, 27; Var. 30 (Quodlibet, the ground's last statement) | `mutopia/bwv-988-aria.ly`, `bwv-988-vNN.ly` | Mutopia (Hajo Dezelski, 2013-2014), after the Bach-Gesellschaft edition, vol. 3 (1853) | CC BY-SA 3.0 |
| Art of Fugue BWV 1080 | the four canons: alla Ottava, alla Duodecima in contrapunto alla quinta, alla Decima in contrapunto alla terza, per Augmentationem in contrario motu | `mutopia/contrapunctusXII.ly` ... `XV.ly` (the Bach-Gesellschaft's numbering, in which the canons are XII-XV) | Mutopia 2006/04/28-746, -748, 2006/05/03-749, -750 (Arnaud Gossart), after Breitkopf & Härtel 1885 | public domain |
| Fourteen canons BWV 1087 | on the first eight notes of the Aria's ground (G F♯ E D B C D G) | `mutopia/bwv-1087-NN.ly`; the set as one score in `mutopia/14-canons-bwv-1087/` | Mutopia 2008/06/01-1434 ... 2008/06/11-1454, resolved after a photocopy of the autograph (Bach's own copy of the Goldberg print) | CC BY-SA 3.0 (the set file: public domain) |
| Musical Offering BWV 1079 | the canons (Canon perpetuus super thema regium, Canones diversi 1-10, Fuga canonica in Epidiapente) | `bg31-musical-offering/djvu-p156.png` ... `p159.png`, `p168.png` (the enigmatic notation of the print) and `djvu-p187.png` ... `p206.png` (Anhang: "Auflösungen der Canons", the canonic fugue resolved, the Ricercar a 6 in short score, Kirnberger's realisation of the trio's continuo) | Bach-Gesellschaft vol. 31.2 (ed. Alfred Dörffel, 1885), scan in the Internet Archive item `BachGesellschaftalmostCompleteMusicOfJ.s.Bachscores`, file `BgaBand31.djvu`, pages (of the DjVu) as named; rendered at 150 dpi | public domain |

**Not symbolic yet: the Musical Offering canons.** No MusicXML, kern, MEI or LilyPond edition of them could be reached
from here (IMSLP's MIDI files sit behind a bot check; the Humdrum repository `craigsapp/bach-musical-offering` has the
ricercars and the trio only; Mutopia has the ricercars only). They are to be encoded by hand from the Bach-Gesellschaft's
resolutions (PLAN.md, K1b). The appendix's resolutions name their source: Kirnberger, *Die Kunst des reinen Satzes* II,
part 3 (pp. 45, 50 cited on the first page), so they are an eighteenth-century reading, not Dörffel's.

Read with `tools/canons/lily.py` (a copy of the FUGUE session's `tools/wtc/lily.py`, with one addition: repeats read as
written, so that bar numbers follow the print) by `tools/canons/import_canons.py` into `data/canons/corpus.json`.
Fetched 12 October 2026 (Mutopia's ftp area; archive.org).
