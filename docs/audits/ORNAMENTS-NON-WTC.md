# Ornaments and articulation in the non-WTC pieces: audit (first pass)

Scope covered: **The Art of Fugue** (bwv1080-*) and the **Inventions and Sinfonias** (bwv772-801).
Not covered: the Duets, 903-2, 951, 906, 998, the Musical Offering ricercars, BWV 1043, 54, 228 and the
harpsichord concertos (see the end).

## How the game holds these marks

- **Ornaments** of the MORE BACH pieces are not in `data/touch/more-bach.json`. `src/touch/ornament-play.ts`
  reads them from `data/wtc/ornaments.json` (written by `node tools/wtc/import.ts` from the Mutopia LilyPond
  through `tools/wtc/sources.ts`, with the correction tables in `tools/wtc/ornaments.ts`), aliasing
  bwv772-786 to `inven01-15` and bwv787-801 to `sinfo01-15`. The only Art of Fugue rows are
  `bwv1080-14` (2 signs, the `CONTRAPUNCTUS` table). `more-bach.json` has an `ornaments` field only for
  the concertos. **So every Art of Fugue piece except Contrapunctus 14 plays and shows no ornaments at
  all**, although its Mutopia source has them (`lily.py` reads them; `more-bach.ts` does not pass them on).
- **Articulation**: for these pieces the game holds ties only (merged into longer notes when the
  LilyPond or MIDI is read). There are no slurs, staccato dots or strokes, or fermatas: `readings.ts` and
  `whole-reading.ts` cover the WTC fugues only (`data/touch/readings.json` has no non-WTC key), and
  `phrasing.ts` derives articulation from the instrument tables, not from the print. Every slur, dot and
  fermata in the print is therefore dropped. That is a design gap, not a data error. Each table below
  says what the print has.
- **Additions by code (against the owner's rule)**: every MORE BACH piece has `kind: "fugue"`, so
  `carrySubjectOrnaments()` (D277, `ornament-play.ts`) copies an ornament from the first entry of a
  subject, or from any note that has one in two entries, to that note of **every** entry that lacks it.
  Replayed on the current data, it adds **44 signs that neither the print (as the Humdrum encodings of it
  have it) nor the Mutopia edition has**:
  - Invention 2: 1, at bar 26.
  - Invention 5: 4, at bars 5, 6, 12 and 13.
  - Invention 7: 15 mordents, at bars 2-5, 11, 12, 17, 22 and 23.
  - Invention 10: 5, at bars 18, 28 and 29.
  - Invention 15: 1, at bar 19.
  - Sinfonia 8: 18 short wavy lines, at bars 6-14, 18, 19, 21 and 22.

  Removing them needs a code change (skip the carry for MORE BACH pieces, or everywhere), so it was not
  made here. **Recommended FIX (code).**
- **Sign mapping** (`tools/wtc/sources.ts` `SIGN`):
  - `\prallmordent` (a wavy line with a stroke, Bach's *Trillo und Mordant*) becomes `"WM"`, played as
    the short wavy sign plus a mordent. ORNAMENTS.md gives `TR` for the Trillo und Mordant.
  - `\prallprall`, the longer wavy line (Bach's *Trillo* on a long note), becomes `W`, which is played
    as a short Pralltriller.
  - `\upmordent` and the hooked signs of the print (Doppelt-Cadence, a trill with a hook from above or
    below, with or without the stroke) have no kern letter in the game. They are played as a plain
    mordent or a short wavy sign.
  - Verdict: **UNSURE**, for the owner (Explication nos. 5-8).
- **Reader loss**: an ornament written on the second note of a tie is dropped (the tie-merge keeps the
  first note's signs only). Found in Invention 3 (two turns) and Invention 9 (one turn); the note does
  not start there in the game, so it cannot be put back as data. **FIX (code, `lily.py` / `sources.ts`).**
- **Humdrum letters**: in the Huron and Sapp encodings used for the cross-check, `M`/`m` is the plain
  short wavy line and `W`/`w` the wavy line with a stroke, the reverse of the kern reference (as D206
  found for the WTC). The comparisons below allow for this. `O` is a sign with no kern letter (a hooked
  or compound sign).

## Sources and method

- **BG vol. 3** (Clavierwerke I, ed. Becker, 1853) and **BG vol. 25.1** (Die Kunst der Fuge, ed. Rust,
  1878): the scans in archive.org's `bach-gesellschaft-ausgabe` collection (`BGA Band 03.pdf`,
  `BGA Band 25.pdf`). IMSLP's own files would not download without its disclaimer cookie, so they were not
  used.
  - Vol. 3: printed page n is PDF page n + 16.
  - Vol. 25.1: printed page n is PDF page n + 28.
- **"scan"** in a table means that bar was read on the scan, at 120 to 300 dpi.
- **"Mut+kern"** means the Mutopia LilyPond and the Humdrum encoding agree, but the scan was not read
  there. Two independent transcriptions agree, so the sign is taken as the print's. The scan was not
  re-checked.
- **Encodings used for the cross-check**:
  - The Humdrum encodings in `data/sources/bach-inventions/kern` (study only).
  - For the Art of Fugue, Craig Sapp's kern (github.com/craigsapp/art-of-the-fugue, encoded from BG 25.1,
    already used by `more-bach-check.ts`). It was read for comparison only and not shipped.
- Bars are the game's (Mutopia's), which equal the BG's here. Beats are quarters from the bar line.
  Voice 0 is the top voice.

## Fixes made (branch `ornament-audit`)

Data only: rows in `tools/wtc/ornaments.ts`, then `node tools/wtc/import.ts`. That writes
`data/wtc/ornaments.json` and `docs/wtc/IMPORT.md` and was checked to reproduce the files byte for byte
before the change.

| piece | bar | voice | change | basis |
|---|---|---|---|---|
| Invention 7 (bwv778) | 10, beat 0 | 0 | mordent on C5 added (`m`) | scan p. 9 (wavy with stroke); kern `8.ccW`; Mutopia lacks it |
| Sinfonia 1 (bwv787) | 5, beat 2.5 | 0 | short wavy on B4 removed | scan p. 19 (no sign); kern none |
| Sinfonia 1 (bwv787) | 14, beat 2.5 | 0 | short wavy on E5 added | scan p. 19; kern `16eem` |
| Sinfonia 13 (bwv799) | 3, beat 0.5 | 0 | short wavy on B4 removed | scan p. 38 (no sign); kern none |
| Sinfonia 13 (bwv799) | 7, beat 0.5 | 1 | short wavy on F#4 removed | scan p. 38 (no sign); kern none |

---

## The Art of Fugue (BG 25.1)

**Every row below is "game has: nothing".** Each sign is in the Mutopia source (from Breitkopf &
Härtel, i.e. the BG text) and in Sapp's encoding of BG 25.1, at the same bar, voice and note unless a row
says otherwise. Verdict FIX means: the print has it and the game should have it. **None of these were
added.** Adding them is a data change (rows in `ornaments.json` keyed by the game ids, as `CONTRAPUNCTUS`
does). They were left out for three reasons:
- D277 would then carry them into every entry.
- The sign mapping for `prallprall`/`prallmordent` is unsettled (above).
- The appoggiaturas need a short/long decision.

These are owner decisions.

### Contrapunctus 1, 2, 5 (bwv1080-01, -02, -05)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| — | — | no ornaments | no ornaments | Mut + Sapp | KEEP |
| 78 (end) | all | no fermata | fermata (C1, C2, C5) | Mut + Sapp | FIX (articulation, design gap) |
| (C2) passim | — | no slurs | ~14-20 slurs over the dotted figures | Mut + Sapp | FIX (articulation, design gap) |

### Contrapunctus 3 (bwv1080-03)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 27, beat 0 | bass (3) | — | tr on F#3 | Mut + Sapp | FIX |
| 28, beat 0 | bass (3) | — | tr on C#3 | Mut + Sapp | FIX |
| end | all | — | fermatas | Mut | FIX (articulation) |

### Contrapunctus 4 (bwv1080-04)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 52, beat 2 | tenor (2) | — | tr on B3 | Mut + Sapp | FIX |
| 102, beat 2 | tenor (2) | — | tr on A3 | Mut + Sapp | FIX |

### Contrapunctus 6, in Stylo Francese (bwv1080-06)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 4, beat 2 | soprano (0) | — | tr on Bb4 | Mut + Sapp | FIX |
| 20, beat 1 | alto (1) | — | tr on B4 (natural) | scan p. 23 + Mut + Sapp | FIX |
| 20, beat 3 | alto (1) | — | tr on A4 | scan p. 23 + Mut (Sapp has Bb4: wrong, the scan shows the tr over the A after the Bb) | FIX |
| 40, beat 2 | soprano (0) | — | tr on A4 | Mut + Sapp | FIX |
| 43, beat 1 | bass (3) | — | tr on A2 | Mut + Sapp | FIX |
| 49, beat 3 | soprano (0) | — | short wavy line on C#5 | Mut (`\prall`) + Sapp (`m`, plain wavy) | FIX |
| end | all | — | fermatas | Mut + Sapp | FIX (articulation) |

### Contrapunctus 7 (bwv1080-07)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 15, beat 3 | bass (3) | — | tr on B2 | Mut + Sapp | FIX |

### Contrapunctus 8, a 3 (bwv1080-08)

All 18 rows marked *wavy+stroke* are the same sign:
- Mutopia writes `\prallmordent`; Sapp writes `WW`/`ww` (the wavy line with a stroke in his letters).
- On the scan (p. 31, bar 3) it is a wavy line over the half note. The stroke is not legible at the scan's
  resolution.
- The positions are certain; the sign family is UNSURE (Trillo und Mordant, or a long Trillo?).

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 3, 8, 13, 23, 37, 41, 45, 51, 63, 69, 83, 117, 127, 133, 139, 149, 154, 172, 184 (beat 2) | the voice with the 2nd subject's half note (alto 3, 23, 51, 117, 127, 154; bass 8, 37, 45, 69, 133, 172; soprano the rest) | — | wavy+stroke on the half note | Mut + Sapp (+ scan for bar 3) | FIX (sign UNSURE) |
| 21, beat 0 | soprano (0) | — | short wavy line on F4 | Mut + Sapp | FIX |
| 39, beat 0 | soprano, alto | — | two small notes (C#4, G3) before the beat | Mut + Sapp | FIX (short/long UNSURE) |
| 92, beat 2 | bass (2) | — | Mut: `\downmordent` on Bb2; Sapp: `www` | Mut vs Sapp differ | UNSURE (scan not read) |
| 187, beat 2 | soprano (0) | — | tr on C#4 | Mut + Sapp | FIX |
| passim | — | no slurs | ~28 slurs (Sapp) | Sapp | FIX (articulation) |

### Contrapunctus 9 (bwv1080-09)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 5, beat 0 | alto (1) | — | short wavy line on Bb4 | Mut + Sapp | FIX |
| 12, beat 0 | soprano (0) | — | short wavy line on F5 | Mut + Sapp | FIX |
| 26, beat 0 | bass (3) | — | tr on G#2 | Mut + Sapp | FIX |
| passim | — | — | ~18 slurs (Sapp) | Sapp | FIX (articulation) |

### Contrapunctus 10 (bwv1080-10)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 39, 40, 41, beat 2 | bass (3) | — | tr on F#3, E3, C#3 | Mut + Sapp | FIX |
| 47, beat 2 | tenor (2) | — | tr on Bb3 | Mut + Sapp | FIX |

### Contrapunctus 11 (bwv1080-11)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 7, beat 0 | alto (1) | — | small note F4 (appoggiatura) | Mut + Sapp | FIX (short/long UNSURE) |
| 57, beat 0 | soprano (0) | — | small note D5 | Mut + Sapp | FIX (short/long UNSURE) |
| passim | — | — | ~9 slurs | Sapp | FIX (articulation) |

### Contrapunctus 12 a 4, rectus and inversus (bwv1080-12r, -12i)

The Mutopia file holds both forms by tags; `lily.py` reads both into one list (56 + 56 bars).

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| r 8, 9 (beat 2) | bass | — | tr on E3, C#3 | Mut + Sapp | FIX |
| r 11, beat 2 | bass | — | tr on Bb2 | Mut + Sapp | FIX |
| r 23, beat 4 | alto | — | tr on Bb4 | Mut + Sapp | FIX |
| r 24, 35 (beat 2) | bass | — | tr on A2, F#2 | Mut + Sapp | FIX |
| i 11 | soprano | — | tr on C#5 (whole note) | Mut + Sapp (his half-bar 68) | FIX |
| i (Sapp half-bar 80) | tenor | — | Sapp: tr on C#3; Mut: none | differ | UNSURE (scan not read) |
| i: the rectus's other trills | — | — | Mutopia and Sapp give the inversus only the 1-2 above | — | UNSURE (whether the BG mirrors them) |
| fermatas | all | — | fermatas (Mut 8 across both) | Mut | FIX (articulation) |

### Contrapunctus 13 a 3, rectus and inversus (bwv1080-13r, -13i)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| r 11, beat 2 | bass | — | tr on G#3 | Mut + Sapp | FIX |
| r 48, beat 2 | bass | — | tr on C#3 (in a triplet) | Mut + Sapp | FIX |
| r 60, beat 2 | soprano | — | tr on E5 | Mut + Sapp | FIX |
| r 61 | soprano | — | Sapp: T on G5; Mut: none | differ | UNSURE |
| r 68, beat 2 | alto | — | tr on Bb4 | Mut + Sapp | FIX |
| i (Mut 139 = 68 of the inversus) | — | — | tr on C#5 | Mut + Sapp (his 140) | FIX |
| fermatas | all | — | 12 in Mut | Mut | FIX (articulation) |

### Canon per Augmentationem in Contrario Motu (bwv1080-c14, Mutopia XV)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 23 (beats 0, 2), 24 | upper | — | small notes E4, F4, G4 | Mut + Sapp | FIX (short/long UNSURE) |
| 40, beat 2 | upper | — | longer wavy line on F#5 | Mut (`prallprall`) + Sapp (`mm`) | FIX (sign UNSURE) |
| 53, beat 2 | upper | — | short wavy line on C#4 | Mut + Sapp | FIX |
| 75, 76 | lower | — | small notes E3, F3, G3 | Mut + Sapp | FIX |
| 92, beat 2 | lower | — | longer wavy line on F#4 | Mut + Sapp | FIX (sign UNSURE) |
| 105, beat 2 | lower | — | short wavy line on C#3 | Mut + Sapp | FIX |
| passim | — | — | slurs (~34 Sapp, incl. the grace slurs), fermatas | Mut + Sapp | FIX (articulation) |

### Canon alla Ottava (bwv1080-c15, Mutopia XII)

Mutopia and Sapp agree on every position (31 signs and small notes). Mutopia's glyph names (`downprall`,
`lineprall`, `prallmordent`, `prallprall`, `downmordent`) and Sapp's letters (`m`, `M`, `W`, `mm`, `MM`)
do not translate one to one. The sign at each place is therefore **UNSURE** until the scan (pp. 75-78) is
read note by note.

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 4, 8, 11, 12, 15, 16, 28, 32, 44, 80, 84, 87, 88, 91, 92 | upper/lower as the canon passes | — | small notes (appoggiaturas) | Mut + Sapp | FIX (short/long UNSURE) |
| 13, 17, 89, 93 (beat 0) | upper, lower | — | wavy sign on G#5/G#4/G5/G4 (Mut `downprall`, i.e. a hook from below) | Mut + Sapp (position) | FIX (sign UNSURE) |
| 22, 26, 98, 102 (beat 1.5) | upper, lower | — | wavy line on C#4/C#3 | Mut + Sapp | FIX (sign UNSURE) |
| 37, 41 (beat 0.75) | upper, lower | — | wavy line on G#4/G3 | Mut + Sapp | FIX (sign UNSURE) |
| 59, 63, 65, 66, 69, 70 | upper, lower | — | wavy signs (Mut: `prallmordent`, `prallprall`, `prall`, `downmordent`) | Mut + Sapp | FIX (sign UNSURE) |
| passim | — | — | **48 staccato dots** (Mut and Sapp agree, 48 each), ~6-20 slurs | Mut + Sapp | FIX (articulation) |

### Canon alla Decima (bwv1080-c16, Mutopia XIV)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 37 (beats 2, 3) | lower | — | small notes Bb4, A4 | Mut + Sapp | FIX |
| 43, beat 3 | lower | — | longer wavy line on Bb3 | Mut + Sapp | FIX (sign UNSURE) |
| 63, beat 3 | upper | — | small note G#4 | Mut + Sapp | FIX |
| 72, beat 2 | lower | — | small note Bb4 (Mut); not in Sapp's list | Mut only | UNSURE |
| 76 (beats 2, 3) | upper | — | small notes Bb5, A5 | Mut + Sapp | FIX |
| 81, beat 3 | upper | — | short wavy line on E4 | Mut + Sapp | FIX |
| passim | — | — | 3 staccato dots, slurs, fermatas | Mut + Sapp | FIX (articulation) |

### Canon alla Duodecima (bwv1080-c17, Mutopia XIII)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| — | — | no ornaments | no ornaments | Mut + Sapp | KEEP |
| passim | — | — | 10 staccato dots, slurs (Mut 1, Sapp up to 50 incl. ties?) | Mut + Sapp | FIX (articulation; slur count UNSURE) |

### Contrapunctus 14, Fuga a 3 soggetti (bwv1080-14)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 196 | tenor (2) | W on C#4 | short wavy line (Mut `\prall`; Sapp `m`) | Mut + Sapp | KEEP |
| 220 | soprano (0) | S on D#5 | turn (Mut `\turn`; Sapp `SS`) | Mut + Sapp | KEEP |

---

## The Inventions (BG vol. 3, pp. 1-17)

The Mutopia inventions are typeset "from the Bach-Gesellschaft". After allowing for the Humdrum letters,
the game and the kern agree on almost every sign. Tables list every disagreement and summarise the
agreeing signs.

### Invention 1 (bwv772)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 1, 2, 6 (beat 3); 8 (beat 0) | 0 | W on B4, F5, B4, F#4 | short wavy line | scan p. 1 + Mut+kern | KEEP |
| 5, beat 1 | 0 | m on C5 | mordent (wavy with stroke) | scan + Mut+kern | KEEP |
| 13, beat 1 | 1 | M on D4 | mordent | scan + Mut+kern | KEEP |
| 22 | both | — | fermatas | scan | FIX (articulation, design gap) |

### Invention 2 (bwv773)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 3, 4, 6, 15, 16, 18, 25, 26 (v0); 5, 6, 8, 13, 14, 16, 23, 24 (v1) | as listed in data | W | short wavy line | scan p. 2 (bars 3-8) + Mut+kern | KEEP (17 signs) |
| 2, beat 3 | 0 | W on D5 | **wavy line with an initial hook** (a compound sign: Doppelt-Cadence / Accent und Trillo) | scan p. 2; kern `O` | FIX (wrong sign; no game letter, not made) |
| 4, beat 3 | 1 | W on D4 | the same hooked sign | scan p. 2; kern `O` | FIX (not made) |
| 12, 14, 24 (beat 3) | 1, 0, 0 | W on A3, A4, D5 | the same (kern `O`) | kern (scan not read) | FIX (not made) |

### Invention 3 (bwv774)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 3, beat 1 | 0 | M on C#5 (16th) | hook + wavy line + stroke, set between B4 and C#5 | scan p. 3; kern `O` | UNSURE (sign and note) |
| 4, beat 0 | 0 | W on C#5 | short wavy line | scan + Mut+kern | KEEP |
| 4, beat 0.5 | 0 | grace B4 (short) before A4 | small eighth B4 | scan | KEEP (short/long UNSURE) |
| **11, beat 0.25** | 0 | — (A4 tied from bar 10) | **turn** over the tied A4/B4 | scan p. 3 + Mut (`a16[\turn`) + kern | FIX (code: lost on the tie) |
| 22, 23, 34 | 0 | W | wavy line | Mut+kern | KEEP |
| 39, 40 | 0 | S on A4, C#5 | turn | Mut+kern | KEEP |
| 45, beat 1 | 0 | M on C#5 | as bar 3 (hooked sign) | kern `O` | UNSURE |
| **53, beat 0.25** | 0 | — (D5 tied) | **turn** | Mut (`d16[\turn`) + kern | FIX (code: lost on the tie) |
| passim | — | no slurs, no dots | ~11 slurs, staccato dots (e.g. bar 5 E5, bar 51) | scan + Mut | FIX (articulation; Bach's own: the autograph slurs this invention) |

### Invention 4 (bwv775)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 19, 29 | 0, 1 | W on C5, E3 | wavy line | Mut+kern | KEEP |

### Invention 5 (bwv776)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 41 signs (mordents on the subject's 8th and quarter, short wavy lines on the 16ths) | both | M/m, W | same | Mut+kern | KEEP |
| 32, beat 0 / 1 | 0 | grace Ab5 before G5; M on F5 | kern: `O` on F5 and no grace | Mut vs kern | UNSURE (scan not read) |
| bars 5, 6, 12, 13 (beat 1) | 1 | +4 mordents carried by D277 | none | code | FIX (code) |

### Inventions 6, 8, 13, 14 (bwv777, 779, 784, 785)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| — | — | none | none (Mutopia and kern both none) | Mut+kern | KEEP |
| end | — | — | fermatas (6 has a repeat, no fermata) | Mut | FIX (articulation) |

### Invention 7 (bwv778)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 17 signs | both | M/m, W | same | Mut+kern; scan p. 9 for bars 1-11 | KEEP |
| **10, beat 0** | 0 | — | **mordent on C5** | scan p. 9 + kern | **FIX (made)** |
| 2-5, 11, 12, 17, 22, 23 | both | +15 mordents carried by D277 | none | code | FIX (code) |

### Invention 9 (bwv780)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 15, beat 0 | 0 | W on B4 | hook from below + long wavy line | scan p. 11; kern `O` | FIX (wrong sign; not made) |
| 15, beat 2 | 0 | WM on C5 | wavy line with stroke (Trillo und Mordant) | scan | UNSURE (mapping: TR?) |
| **16, beat 0** | 0 | — (C5 tied from bar 15) | **turn** | scan p. 11 + kern | FIX (code: lost on the tie) |
| 16, beat 1 | 0 | W on D5 | hook + long wavy line | scan; kern `O` | FIX (wrong sign; not made) |
| **33, beat 0** | 0 | — | wavy + turn sign on C5 | scan p. 11; kern `WS` | FIX (missing; sign UNSURE, not made) |
| 33, beat 1 | 0 | W on G4 | hook + long wavy line | scan; kern `O` | FIX (wrong sign; not made) |
| passim | — | no slurs | ~18 slurs (Bach's) | scan + Mut | FIX (articulation) |

### Invention 10 (bwv781)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 25 signs | both | M/m, W | same | Mut+kern; scan p. 12 for bars 1-17 | KEEP |

### Invention 11 (bwv782)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 23 signs | both | M/m, W, S | same | Mut+kern; scan p. 13 for bars 12-23 | KEEP |
| 10, beat 2 | 0 | M on D5 | kern `WS` (mordent + turn) | Mut vs kern | UNSURE (scan not read) |
| 10, beat 3 | 0 | M on E5 | kern `O` | Mut vs kern | UNSURE |

### Invention 12 (bwv783)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 13 mordents on the quarters | both | M/m | mordent | scan pp. 14-15 + Mut+kern | KEEP |
| 1, beat 3 | 0 | M on B4 (dotted half) | **hook from above + long wavy line + stroke** (Doppelt-Cadence und Mordant) | scan p. 14; kern `O`; Mutopia `\upmordent` | FIX (wrong sign; not made) |
| 3 (b. 3), 9 (b. 3), 18 (b. 3), 20 (b. 3) | 1, 0, 1, 1 | M/m on F#3, G#4, B2, D3 | the same compound sign | scan p. 15 (18, 20) + kern | FIX (not made) |

### Invention 15 (bwv786)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 23 short wavy lines, 1 mordent (b. 3) | both | W, M | same | Mut+kern | KEEP |
| passim | — | — | ~7 slurs | Mut | FIX (articulation) |

## The Sinfonias (BG vol. 3, pp. 19-48)

The Mutopia sinfonias (Vermersch) state no source and are the weak point. The kern sinfonias were
re-encoded by Sapp from BG vol. 3, so where the two differ, the scan was read.

### Sinfonia 1 (bwv787)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 5, beat 2.5 | 0 | W on B4 | nothing | scan p. 19 + kern | **FIX (made: removed)** |
| 6, 7, 15 | 0 | W on B4 | short wavy line | scan + kern | KEEP |
| 14, beat 2.5 | 0 | — | short wavy line on E5 | scan + kern | **FIX (made: added)** |
| 5, 14, 16-19 | 0 | — | short vertical strokes over single notes | scan | UNSURE (staccato strokes or voice marks) |
| 21 | all | — | fermatas | scan | FIX (articulation) |

### Sinfonia 2 (bwv788)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 7, beat 0 | 0 | W on Eb5 (dotted half, tied) | longer wavy line (kern `MM`; Mut `\prallprall`) | Mut+kern | UNSURE (played as a short Pralltriller; the print's long wavy line is Bach's Trillo) |
| 15, 30 | 2, 0 | W | wavy line | Mut+kern | KEEP |

### Sinfonias 3, 10, 12 (bwv789, 796, 798)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| — | — | none | none in Mutopia or kern | Mut+kern | KEEP (scan not read) |

### Sinfonia 4, 6, 8, 11, 14, 15 (bwv790, 792, 794, 797, 800, 801)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 4:4 · 6:18 · 8:2, 10, 1, 3 · 11:9, 24, 28 · 14:2, 7 · 15:37 | as in data | W, T | same signs | Mut+kern | KEEP (13 signs) |
| Sinfonia 8, bars 6-22 | all | +18 short wavy lines carried by D277 | none | code | FIX (code) |

### Sinfonia 5 (bwv791): the largest gap

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| whole piece | 0, 1 | **1 sign** (W on D5, bar 12) | **about 95 ornaments and small notes**: turns, trills with turns (Doppelt-Cadence), mordents, wavy lines, and a small appoggiatura before almost every melodic quarter of the two upper voices | scan pp. 24-25 (BG prints the ornamented version, from the autograph); kern `sinfo05.krn` (97) | FIX (not made: needs a transcription from the BG; the Mutopia text is the unornamented reading) |
| passim | — | — | many slurs on the appoggiaturas | scan | FIX (articulation) |

### Sinfonia 7 (bwv793)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 43, beat 2 | 0 | T on D#5 | nothing (no sign anywhere in bars 42-44) | scan p. 29 + kern | FIX, **not made**: THE TUTORIAL's lesson 6.2 (src/bench/manual/course2.ts, "the long shake before the end") is built on this Mutopia-only trill, and `test/d379-tutorial.test.ts` checks it. Removing it needs the lesson moved to a printed trill. Owner decision. |

### Sinfonia 9 (bwv795)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 12, beat 3 | 0 | W on G4 | short wavy line (kern `m`) | Mut+kern | KEEP |
| passim | — | — | slurs on the chromatic figure (Mut 3) | Mut | FIX (articulation) |

### Sinfonia 13 (bwv799)

| bar | voice | game has | print has | source | verdict |
|---|---|---|---|---|---|
| 3, beat 0.5 | 0 | W on B4 | nothing | scan p. 38 + kern | **FIX (made: removed)** |
| 7, beat 0.5 | 1 | W on F#4 | nothing | scan p. 38 + kern | **FIX (made: removed)** |
| 15, 35 | 1, 0 | W on G#3, G5 | wavy line | Mut+kern | KEEP |

## Counts

| piece group | FIX made | FIX needed, not made (code or owner) | UNSURE | KEEP |
|---|---|---|---|---|
| Art of Fugue (19 pieces) | 0 | ~95 missing ornaments and small notes in 15 pieces; all slurs, dots and fermatas | ~25 (sign family, short/long, three Mutopia/Sapp disagreements) | C1, C2, C5, Canon 12: no ornaments, correct; C14's 2 signs |
| Inventions (15) | 1 (Inv. 7) | 15 wrong signs (Inv. 2 ×5, 9 ×3, 12 ×5, plus 2 missing in 9); 3 turns lost on ties (Inv. 3 ×2, 9 ×1); 26 signs added by the D277 carry; slurs | 6 | ~215 signs |
| Sinfonias (15) | 4 (Sinf. 1 ×2, 13 ×2) | Sinfonia 7's extra trill (tutorial depends on it); Sinfonia 5's ~95; 18 signs added by the D277 carry in Sinfonia 8 | 2 (Sinf. 1 strokes, 2's long wavy line) | 22 signs |

## Wrong notes or rhythms noticed

None beyond the above. The Sapp encoding's Bb4 in Contrapunctus 6 bar 20 is its error, not the game's.

## Not covered

- The Duets (bwv802-805), 903-2, 951, 906-1/2, 998-1/2/3, the Musical Offering ricercars (bwv1079-ric3,
  -ric6), BWV 1043, 54, 228 and the harpsichord concertos.
- None of them has rows in `data/wtc/ornaments.json` or an `ornaments` field in `more-bach.json`, so the
  game plays **no ornaments** in any of them. Their prints were not compared.
- In the Inventions and Sinfonias, bars marked "Mut+kern" were not read on the scan.
- In the Art of Fugue, only Contrapunctus 6 bar 20 and Contrapunctus 8 bar 3 were read on the scan.
