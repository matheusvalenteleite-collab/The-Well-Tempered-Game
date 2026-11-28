# Source: Bach, Mass in B minor, BWV 232 (research files; nothing in the game reads them yet)

Fetched 28 November 2026 by the second account's research session (report: docs/research/MASS-IN-B-MINOR.md). Kept here so a
later build need not download PDMX's 2 GB again. Movement numbers below are the modern 27 (NBA style).

## PDMX (MusicXML from musescore.com), `pdmx/<musescore id>.mxl` with `<id>.metadata.json`

PDMX: Long, Novack, Berg-Kirkpatrick and McAuley, Zenodo DOI 10.5281/zenodo.15571083 (dataset CC BY 4.0); files extracted
by streaming `mxl.tar.gz` and `metadata.tar.gz`, after a search of `PDMX.csv` (every row with "Bach" and 232, "B minor mass",
"h-moll", "si menor", or a movement's Latin title).

### The main source: kuwitt's complete full score (CC0)

| file | MuseScore score | contents | bars |
|---|---|---|---|
| `4266076.mxl` | https://musescore.com/user/660611/scores/4266076 (2017, updated 2019) | Part 1, Missa: nos. 1-12 (Kyrie I to Cum Sancto Spiritu; Gloria and Et in terra in one stretch, as the Bach-Gesellschaft prints them) | 1043 |
| `4522056.mxl` | …/scores/4522056 (2017) | Part 2, Symbolum Nicenum: nos. 13-21 (Credo to Et expecto) | 837 |
| `4745926.mxl` | …/scores/4745926 (2017) | Part 3, Sanctus with Pleni sunt coeli: no. 22 | 168 |
| `4822207.mxl` | …/scores/4822207 (2017) | Part 4: nos. 23-27 (Osanna, Benedictus, Osanna written out again, Agnus Dei, Dona nobis pacem) | 451 |

- **By** the MuseScore user "kuwitt" (user 660611). **Licence: CC0 1.0** (musescore.com's "public domain" flag set; PDMX finds no
  licence conflict). **Printed edition: not stated** in the files; the text matches the Bach-Gesellschaft (BG Band 6, ed.
  Rietz, 1856) as CCARH encoded it (below), 97-100% per line.
- **What it holds:** the whole orchestra and choir, 40 staves (only the ones a movement uses have notes): corno da caccia, three
  trumpets, timpani, two flutes, two oboes d'amore, three oboes, two bassoons, solo violin, violins I-II, viola, the soloists,
  the choir (up to SSAATB, and two SATB choirs in the Osanna), violoncello, continuo (written twice, identical). **No piano
  reduction.** **Lyrics: yes**, every vocal part (Latin, one verse). **Pitch:** the written key, B minor/D major, at modern
  concert pitch (not the "A = 415" semitone-low kind). Tempo words where BG has them (Adagio, Largo, Vivace, Lento, Andante,
  Vivace e Allegro…) and playback tempi of the encoder's choosing.
- **Traps for a build (the game's reader, `tools/touch/musicxml.ts`, as it stands):**
  1. **Hidden notes:** 750 notes marked invisible (`print-object="no"`; 372 + 187 + 62 + 129 in the four files), placeholders in
     the trumpet and timpani rests. The reader keeps them: they would sound. They must be skipped.
  2. **Transposing instruments:** the trumpets and timpani are written in C with a `<transpose>` of +2 (they sound in D), the
     corno da caccia in C with −10 (it sounds a seventh lower). The reader ignores a part's `<transpose>`: trumpets would sound a
     tone low, the horn a seventh high.
  3. The continuo is written twice (identical): one copy to drop.
  4. Four files, 27 movements: each movement must be cut out by bars (as BWV 228's two halves are, `fromBar`/`toBar`); the
     movement starts are where the bar numbers restart. Gloria (3/8) and Et in terra pax (4/4) are one stretch of 176 bars
     (the change at bar 101).

### Second witnesses, also CC0: "sangerforum" (three movements)

| file | MuseScore score | movement | contents |
|---|---|---|---|
| `5513792.mxl` | https://musescore.com/user/3099636/scores/5513792 (2019) | 3 Kyrie II | full score: fl, ob I-II, vn I-II, va, fagotti, SATB, continuo, violone; lyrics |
| `5513832.mxl` | …/scores/5513832 (2019) | 4-5 Gloria + Et in terra pax | full score with trumpets and timpani; lyrics |
| `5515220.mxl` | …/scores/5515220 (2019) | 7 Gratias | full score; lyrics |

By the MuseScore user "sangerforum" (3099636), CC0 1.0. Laid out differently from kuwitt (separate fagotti and violone
parts, as modern editions print them), so probably an independent encoding of an edition not named.

## Mutopia (LilyPond), `mutopia/quoniam/`

No. 11 **Quoniam tu solus sanctus** (corno da caccia, two bassoons, bass, continuo; with words), typeset by Jay Anderson from
**BGA Band 6 pp. 118-125**, Mutopia-2008/06/15-1462, https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1462.
**Licence: CC BY-SA 3.0** (credit and share-alike). `score.ly` with its `.lyi` includes, and Mutopia's MIDI. The only movement of
the Mass on Mutopia. The horn is written in C with `\transposition d`. The game's `tools/touch/lily_json.py` reads it, but puts
the horn one bar late with one stray note (from the `\outlineAria` layer it is combined with): a quirk to fix only if this file
is ever used rather than kuwitt's.

## Checked against (not kept here; rights reserved)

**CCARH's MuseData encoding** of the whole Mass after the Bach-Gesellschaft (S. Rasmussen, 1994-95; "(C) 1994, 2002 Center for
Computer Assisted Research in the Humanities"), bitbucket.org/musedata/bach, `bg/vocal/0232/stage2/01-25` (25 movements: BG's
numbering, Gloria with Et in terra, Confiteor with Et expecto). Read with a small MuseData reader written for this check
(session scratch, not kept), every note's onset and pitch compared with kuwitt's, part by part (best-matching part and
octave), hidden notes removed:

- **Every line of all 27 movements agrees at 96.6% or more, nearly all at 98-100%** (most choral and string lines 99.5-100%).
- The few differences: Dona nobis pacem, viola, bars 31 and 41; Sanctus/Pleni, oboe III, a few bars; Cum Sancto Spiritu,
  trumpet I, bars 27-28 (where the corno da caccia hands over to trumpet I); trumpet/timpani tied-note splits. The print decides.
- sangerforum's three movements against kuwitt: 97-100% per line (Kyrie II 99-100%; Gratias 98-100%; Gloria 95-100%, the
  lowest the violas and violins I-II, where the two editions differ in a handful of repeated notes).
- Mutopia's Quoniam against CCARH: 99.0-99.6% per line (the horn 100% once moved back a bar).

**How independent?** Not fully. kuwitt's per-part note counts are often the same as CCARH's to the note, so his file may have
been made from CCARH's data (CCARH's typeset full score of the Mass is on IMSLP under CC BY-NC 3.0); but his Dona nobis
pacem differs from CCARH where his Gratias (the same music) does not, so it was at least edited. sangerforum's and Mutopia's
files look independent of both, and agree as closely.

## Not machine-readable without a human step, or not reached

- **IMSLP** (work page read through its API, 28 Nov): behind the "verify you are human" page (not to be bypassed; for the owner
  to download by hand if wanted): Michel Rondeau's Finale and MusicXML of no. 10 **Qui sedes** (`WIMA.8fd0-Mass232X-xml.zip`,
  CC BY 3.0), a fourth witness for that movement; CCARH's typeset full score PDF (`PMLP04197-CCARH_Mass_in_b_minor.pdf`,
  CC BY-NC 3.0); the Bach-Gesellschaft and Eulenburg scans (public domain), for settling the few disagreements above.
- **CPDL**: not reachable from this session (blocked); **not verified** what editions it holds.
- PDMX's other hits: an unregistered user's Gratias/Dona full score (827776, CC0 but PDMX flags a licence conflict: not
  kept); a vocal-only Gratias (5770859); a Kyrie I vocal score with piano (4527621); arrangements (woodwind quintet,
  recorders, a Crucifixus reduction): not kept.
