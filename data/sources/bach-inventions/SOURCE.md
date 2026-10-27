# Source: Bach, Inventions and Sinfonias (BWV 772-801)

Two sources are held here. **Only the Mutopia editions may reach the public build** (D340).

## 1. Mutopia Project (LilyPond + MIDI): the game's (`mutopia/`)

Fetched 27 October 2026, LilyPond source and the edition's MIDI, in `mutopia/<id>/`
(`mutopia/mutopia.json` keeps each page's fields as fetched). Read by `tools/touch/more-bach.ts` into
`data/touch/more-bach.json` (the MORE BACH tab); Invention 1 also by `tools/touch/tutorial.ts` into
`data/touch/tutorial.json` (THE TUTORIAL, D270), since D340.

| game id | piece | Mutopia page | typeset by | source edition | licence |
|---|---|---|---|---|---|
| bwv772 | Invention 1, C major | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=40 | Jeff Covey | Bach-Gesellschaft | **CC BY-SA 3.0** |
| bwv773 | Invention 2, C minor | …?id=58 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv774 | Invention 3, D major | …?id=70 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv775 | Invention 4, D minor | …?id=67 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv776 | Invention 5, E♭ major | …?id=55 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv777 | Invention 6, E major | …?id=159 | Jeff Covey | Bach-Gesellschaft | **CC BY-SA 3.0** |
| bwv778 | Invention 7, E minor | …?id=73 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv779 | Invention 8, F major | …?id=61 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv780 | Invention 9, F minor | …?id=171 | Jeff Covey | Bach-Gesellschaft | **CC BY-SA 3.0** |
| bwv781 | Invention 10, G major | …?id=62 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv782 | Invention 11, G minor | …?id=71 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv783 | Invention 12, A major | …?id=174 | Jeff Covey | Bach-Gesellschaft | **CC BY-SA 3.0** |
| bwv784 | Invention 13, A minor | …?id=59 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv785 | Invention 14, B♭ major | …?id=72 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv786 | Invention 15, B minor | …?id=68 | Allen Garvin | Bach-Gesellschaft | public domain |
| bwv787 | Sinfonia 1, C major | …?id=142 | Olivier Vermersch | not stated | public domain |
| bwv788 | Sinfonia 2, C minor | …?id=140 | Olivier Vermersch | not stated | public domain |
| bwv789 | Sinfonia 3, D major | …?id=143 | Olivier Vermersch | not stated | public domain |
| bwv790 | Sinfonia 4, D minor | …?id=172 | Olivier Vermersch | not stated | public domain |
| bwv791 | Sinfonia 5, E♭ major | …?id=204 | Olivier Vermersch | Bach-Gesellschaft | public domain |
| bwv792 | Sinfonia 6, E major | …?id=173 | Olivier Vermersch | not stated | public domain |
| bwv793 | Sinfonia 7, E minor | …?id=175 | Olivier Vermersch | not stated | public domain |
| bwv794 | Sinfonia 8, F major | …?id=176 | Olivier Vermersch | not stated | public domain |
| bwv795 | Sinfonia 9, F minor | …?id=199 | Olivier Vermersch | not stated | public domain |
| bwv796 | Sinfonia 10, G major | …?id=205 | Olivier Vermersch | not stated | public domain |
| bwv797 | Sinfonia 11, G minor | …?id=200 | Olivier Vermersch | not stated | public domain |
| bwv798 | Sinfonia 12, A major | …?id=144 | Olivier Vermersch | not stated | public domain |
| bwv799 | Sinfonia 13, A minor | …?id=206 | Olivier Vermersch | not stated | public domain |
| bwv800 | Sinfonia 14, B♭ major | …?id=213 | Olivier Vermersch | not stated | public domain |
| bwv801 | Sinfonia 15, B minor | …?id=145 | Olivier Vermersch | not stated | public domain |

("…?id=N" is https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=N.)

- **Public domain**: the typesetter's dedication, in each file's header and on its page
  (https://www.mutopiaproject.org/legal.html).
- **CC BY-SA 3.0** (Inventions 1, 6, 9, 12; https://creativecommons.org/licenses/by-sa/3.0/): "if you
  alter, transform, or build upon the work, you must distribute the resulting work under an identical
  license". So: (a) credit, shown in the game (each piece's pop-up; the MORE BACH tab's SOURCES &
  CREDITS) as "Invention N, typeset by Jeff Covey for the Mutopia Project (mutopiaproject.org) from the
  Bach-Gesellschaft edition, CC BY-SA 3.0"; (b) the game's note data derived from them (their entries
  in `data/touch/more-bach.json`, and `data/touch/tutorial.json`) is released under CC BY-SA 3.0 too.
- Read from the LilyPond (voices as typeset: the inventions' two staves, the sinfonias' upper staff in
  two voices and the bass); every `\repeat volta` once, as printed (Invention 6). The MIDI's attacks are
  in the LilyPond: 99.8-100%.

**Checked** (`node tools/touch/more-bach-check.ts`) against the Humdrum encodings below (study only):

| piece | bars (Mutopia) | bars (kern) | voices | voices (kern) | attacks agreeing |
|---|---|---|---|---|---|
| bwv772 | 22 | 22 | 2 | 2 | 100.0% |
| bwv773 | 27 | 27 | 2 | 2 | 100.0% |
| bwv774 | 59 | 59 | 2 | 2 | 99.8% |
| bwv775 | 52 | 52 | 2 | 2 | 100.0% |
| bwv776 | 32 | 32 | 2 | 2 | 99.2% |
| bwv777 | 62 | 62 | 2 | 2 | 100.0% |
| bwv778 | 23 | 23 | 2 | 2 | 99.4% |
| bwv779 | 34 | 34 | 2 | 2 | 100.0% |
| bwv780 | 34 | 34 | 2 | 2 | 99.8% |
| bwv781 | 32 | 32 | 2 | 2 | 100.0% |
| bwv782 | 23 | 23 | 2 | 2 | 99.6% |
| bwv783 | 21 | 21 | 2 | 2 | 100.0% |
| bwv784 | 25 | 25 | 2 | 2 | 99.8% |
| bwv785 | 20 | 20 | 2 | 2 | 100.0% |
| bwv786 | 22 | 22 | 2 | 2 | 99.8% |
| bwv787 | 21 | 21 | 3 | 3 | 100.0% |
| bwv788 | 32 | 32 | 3 | 3 | 99.9% |
| bwv789 | 25 | 25 | 3 | 3 | 99.9% |
| bwv790 | 23 | 23 | 3 | 3 | 100.0% |
| bwv791 | 38 | 38 | 3 | 3 | 99.1% |
| bwv792 | 41 | 41 | 3 | 3 | 99.8% |
| bwv793 | 44 | 44 | 3 | 3 | 99.7% |
| bwv794 | 23 | 23 | 3 | 3 | 99.1% |
| bwv795 | 35 | 35 | 3 | 3 | 99.8% |
| bwv796 | 33 | 33 | 3 | 3 | 98.7% |
| bwv797 | 72 | 72 | 3 | 3 | 99.6% |
| bwv798 | 31 | 31 | 3 | 3 | 98.9% |
| bwv799 | 64 | 64 | 3 | 3 | 99.7% |
| bwv800 | 24 | 24 | 3 | 3 | 99.2% |
| bwv801 | 39 | 38 | 3 | 3 | 99.9% |

## 2. Humdrum **kern (`kern/`): for study and cross-checking only, never to be published

- Repository: https://github.com/humdrum-tools/inventions, commit 93183f6fdb9ab7aa1fa601e3aa200b40763469cf
  (fetched 9 October 2026). 30 files: `inven01-15.krn` (two-part inventions), `sinfo01-15.krn`
  (three-part sinfonias).
- Encoding: David Huron, 1994 ("Copyright 1994, David Huron"; "Rights to all derivative electronic
  formats reserved", as the WTC files, data/sources/bach-wtc/SOURCE.md); the sinfonias re-encoded by
  Craig Sapp (2024, from Bach-Gesellschaft vol. 3), no licence stated. Read into `data/wtc/inventions.json`
  for the study (src/lab, not in the published pages) and for the check above.
- **Status of the public build (D340).** Nothing of `data/wtc/inventions.json` is bundled by
  `vite build`. Until D340 the TUTORIAL's Invention 1 (`data/touch/tutorial.json`, shipped in play.html)
  was derived from Huron's `inven01.krn`; it is now built from Mutopia's Invention 1 (the same notes).
  Still shipped and derived from this kern: the ornament positions of the inventions and sinfonias in
  `data/wtc/ornaments.json` (shipped with the game's ornament playback).
