# The Well-Tempered Clavier and the Inventions: the editions the game is made from (D366)

Until D366 the 48 and the Inventions and Sinfonias were read from David Huron's Humdrum encodings
("rights to all derivative electronic formats reserved") and D119/D125's exposition and prelude
files from the ASAP dataset (CC BY-NC-SA 4.0). Everything the game ships is now made from editions
that allow it. The Humdrum files stay in the repository (`data/sources/bach-wtc`,
`data/sources/bach-inventions/kern`) as a **private cross-check only**: read by
`tools/wtc/sources-check.ts` and nothing that is built for the game.

## The editions

| what | edition | licence | files |
|---|---|---|---|
| the 48 fugues | Kyle Rother, open-score edition after the Bach-Gesellschaft edition (University of Cape Town, 2015), LilyPond, a staff a voice | **CC BY 4.0** (credit: Credits.tsx, the touch game's SOURCES & CREDITS) | `data/sources/wtc-uct` |
| Book I's preludes (not 4) | The Open Well-Tempered Clavier, MuseScore edition (Kimiko Ishizaka and the OpenGoldberg team, 2015), MusicXML, via PDMX | CC0 1.0 | `data/sources/wtc-openwtc` |
| Book I, prelude 4 | the Mutopia Project, BWV 849a (Davide Castellone), four voices | public domain | `data/wtc/sources/mutopia/BachJS/BWV849/bwv849a` |
| Book II's preludes (not 1, 2, 6) | verits99's musescore.com scores (2013), MusicXML, via PDMX (score id, licence string, dates, revision in `index.json`) | CC0 1.0 | `data/sources/wtc-musescore` |
| Book II, preludes 1, 2, 6 | the Mutopia Project (Urs Metzger; Jesse Mehrbach; Gwenaël Joret) | public domain | `data/wtc/sources/mutopia/BachJS/BWV870, 871, 875` |
| Inventions and Sinfonias | the Mutopia Project, as MORE BACH has them (D340) | public domain; Inventions 1, 6, 9, 12 CC BY-SA 3.0 (Jeff Covey) | `data/sources/bach-inventions/mutopia` |
| witnesses only | OpenWTC's and verits99's fugues; verits99's scores at A = 415 Hz (both books); the Mutopia fugues | CC0 / public domain / CC BY-SA (not shipped) | as above |

Each folder's `SOURCE.md` gives the details. PDMX: Long, Novack, Berg-Kirkpatrick and McAuley, *PDMX:
A Large-Scale Public Domain MusicXML Dataset* (2024), zenodo.org/records/14648209.

## How they are read

`tools/wtc/import.ts` (`tools/wtc/sources.ts`): a staff of Rother's is a voice (a staff opened inside
another's music is that voice's; I/9's ossia staff in bar 26 left out); the preludes' two staves are the
two hands (I/4's lower staff shared between tenor and bass by register); verits99's written-out
repeats taken once as printed and his written-out trills folded back into their notes with a trill
sign; the game's metres kept where an edition writes another sign for the same bars (I/15 24/16, II/9
4/2, II/13 3/4, II/22 and II/24 4/4, I/4's prelude 6/4). D363's divisi mechanism (`tools/touch/divisi.ts`)
then makes each playable voice one line, the rest the band's. Bar numbers are the editions' and the
same as before in every piece.

**Rebuild everything** with `sh tools/wtc/rebuild.sh` (the corpus, the Python studies, D119's
expositions, D125's preludes, the licences, `data/touch/pieces.json`, the tutorial, the colour plans),
then `node tools/sheet/engrave.ts` for the SHEET mode (D298; the kern it engraves is now written from
the game's notes by `tools/sheet/to-kern.ts`).

## Corrections (tools/wtc/corrections.ts; each listed in docs/wtc/IMPORT.md)

A note is changed only where two independent readings agree against the edition: the Humdrum
cross-check and a free witness (OpenWTC or verits99's MusicXML, Mutopia). About 200 corrections: the
edition's slips (wrong accidentals, octaves, letters, ties left out), and **I/4's mezzo an octave too
high from bar 25** (a missing `,` in `\relative`).

**Rother's editorial interventions taken back to the Bach-Gesellschaft's text** (his notes describe
each): I/4 bar 103 (the alto entry he gave the mezzo, back to the alto); I/5's triplet
demisemiquavers (the BGA's three demisemiquavers after the double-dotted quaver, as the game played
them); I/9 bar 26 (the BGA's E, his ossia); I/17's suggested ties, dashed, in bars 6-7 and 30-31
(left out, as the BGA). His Prelude 7 tie concerns a prelude the game takes from OpenWTC. Rhythm
notation: II/3's demisemiquaver figures are the BGA's (he writes a semiquaver for two); II/10's
dotted figures are played with the triplets, as the game always played them; II/5's prelude
(verits99's triplet quavers) as dotted, as before.

**Not corrected** (no second free witness, the BGA scans not reachable from here): Book II's
preludes where verits99 and the cross-check differ (docs/wtc/SOURCES-CHECK.md lists every bar; II/4
and II/11's encodings mis-bar a bar, so most of their differences are the encoding's). To proofread
against the BGA, Band 14, before relying on them.

## Ornaments (data/wtc/ornaments.json)

Read from the editions' own signs (Rother's `\trill`, `\prall`, `\mordent`, `\turn`, grace notes;
MusicXML's ornaments; Mutopia's), as the kern letters the game reads. Mordents take their case (a
semitone below or a tone) from the key. Then, for the fugues, D206's reading of the BGA by eye
(`tools/wtc/ornaments.ts`): `ADDED` (the BGA's signs an edition leaves out: II/1's three mordents and
trill, I/1 bars 13 and 23, I/6 bar 20, I/8 bar 11, I/11 bar 71, I/13 bar 1, II/14's four trills) and
`BGA_SIGNS` (the BGA's sign where Rother's differs: I/3 b. 38, I/6 b. 21 and 29, I/8 b. 74, II/6
b. 16, II/20 b. 28; removed where D206 found none in the BGA: I/6's turns in bars 9-11, I/13 bars 15,
20, 28 (parenthesised), I/20 bars 52, 56 ("(tr)")).

Left as Rother has them, not checked against the BGA (none of D206's readings covers them): the short
trill (W) for the encoding's trill (T) in I/5 b. 22, II/3 b. 14, II/4 b. 26, 32, 61, II/13 b. 64,
II/18 b. 64, 69; his new signs in I/3 b. 12, I/11 b. 48, I/14 b. 6, 10, I/23 b. 4, 8, II/12 b. 1 and
25 (mordents); the encoding's signs he lacks in II/10 b. 70 (two) and II/13 b. 29, 30 (lost). The
fugues: 158 signed notes (154 before). II/24's last bar gains the edition's two appoggiaturas.

**Lost or changed beyond the fugues:** the preludes of Book II have only verits99's folded trills (he
writes no signs) and Mutopia's for 1, 2, 6; the Inventions and Sinfonias carry Mutopia's signs (221
notes, 310 from the encodings before): Sinfonia 5's ornamented version (the encoding's 92, 61 of them
grace notes) is not Mutopia's text (1 sign); Mutopia's `\prall` (W) stands where the encodings had M in
many Inventions (Invention 1 keeps a mordent).

## What changed in the game (old: the build from the Humdrum encodings)

Per piece, `node tools/wtc/sources-diff.ts OLD/pieces.json --md` (the old file from git, commit
e0bf4ea): the attacks (onset, MIDI) of the old build the new has, voice by voice, the bars, the
entries, sections, cadences, keys, the band's own voices (D363). The fugues agree 97.9-100% (most
over 99.5%); every bar that differs from the cross-check is in docs/wtc/SOURCES-CHECK.md with the third
witness's word. In short:

- **Bars**: the same everywhere but I/8's prelude (the encoding's overfull bar 29), II/4's and II/11's
  preludes (the encoding's bars 17 and 18): the recordings' bar lines moved to match
  (`tools/wtc/recordings-remap.py`).
- **Entries**: I/4 loses the alto's g# entry of bar 20 (the edition and both witnesses tie its head
  over into bar 21) and its bar 94 changes voice (Rother crosses soprano and alto there); I/8 gains one
  (b. 49, alto); I/15, I/19, I/20 (the last entries from b. 77 given to the alto staff, as Rother writes
  them) and II/1, II/3 (b. 28's inverted entry), II/17 (b. 5) differ by an entry or a voice.
- **II/17's subject** has D flat (not D natural) in bar 1 (Rother and verits99 agree against the
  encoding); D119's countersubject of II/19 is one note longer.
- **Band-only voices** (D363): 19 voices of 12 fugues (23 of 14 before): the edition's divisi.
- Book II's preludes: see above.

The full table follows (attacks: of the old build's, the new's count first).

| piece | attacks (of the Humdrum build's) | voice by voice | bars | entries | sections | cadences | keys | band voices |
|---|---|---|---|---|---|---|---|---|
| wtc1p01 | 100.0% (549/549) | 100/100 | same | same (0) | same | same | same | - |
| wtc1f01 | 99.2% (734/740) | 99/99/100/100 | same | same (24) | same | same | same | - (was v0:2) |
| wtc1p02 | 99.7% (1091/1091) | 100/96 | same | same (0) | same | same | same | - |
| wtc1f02 | 100.0% (754/754) | 100/100/100 | same | same (8) | same | same | same | - |
| wtc1p03 | 100.0% (810/810) | 99/100 | same | same (0) | same | same | same | - |
| wtc1f03 | 99.8% (1416/1418) | 99/100/100 | same | same (18) | same | same | same | - |
| wtc1p04 | 95.0% (662/677) | 87/88/82/100 | same | same (0) | same | same | F# E g# B f# G# f# C# c# C# (was F# E g# B f# G# f# c# C#) | - |
| wtc1f04 | 99.5% (1322/1326) | 95/94/100/97/100 | same | 69/70: +94v1e,94v0b −19v1g#,94v0e,94v1b | same | same | c# g# c# f# c# g# f# c# B E a# c# c# g# c# c# c# c# f# f# f# f# f# f# D A A A A c# f# c# g# c# d# d# d# g# g# g# B c# c# c# c# c# c# c# A c# f# c# A b f# c# c# c# e b b f# c# c# c# g# c# A f# c# C# (was c# g# c# f# c# g# g# f# c# B E a# c# c# g# c# c# c# c# f# f# f# f# f# f# D A A A A c# f# c# g# c# d# d# d# g# g# g# B c# c# c# c# c# c# c# A c# f# c# A b f# c# c# c# e b b f# c# c# c# g# c# A f# c# C#) | - |
| wtc1p05 | 99.3% (717/722) | 100/83 | same | same (0) | same | same | same | - |
| wtc1f05 | 99.9% (779/780) | 100/99/100/100 | same | same (19) | same | same | same | - |
| wtc1p06 | 99.9% (784/783) | 100/95 | same | same (0) | same | same | same | - |
| wtc1f06 | 100.0% (718/718) | 100/93/100 | same | same (16) | same | same | same | v2:12 (was v0:12) |
| wtc1p07 | 99.4% (1413/1416) | 100/65 | same | same (0) | same | same | same | - |
| wtc1f07 | 100.0% (900/900) | 100/98/100 | same | same (9) | same | same | same | v1:6 (was v0:4) |
| wtc1p08 | 87.4% (682/681) | 97/61 | 40/40, first at b. 30 | same (0) | same | same | same | - |
| wtc1f08 | 99.9% (1384/1385) | 100/100/100 | same | 33/32: +49v1d# − | 1-11 11-15 15-23 23-27 27-31 31-39 39-48 48-53 53-57 57-65 65-70 70-76 76-80 80-84 84-87 (was 1-11 11-15 15-23 23-27 27-31 31-39 39-48 48-55 55-60 60-65 65-70 70-76 76-80 80-84 84-87) | same | d# a# d# d# a# a# d# g# C# F# C# d# d# d# g# d# g# g# g# F# F# F# d# d# g# g# F# F# B F# d# d# g# d# D# (was d# a# d# d# a# a# d# g# C# F# C# d# d# d# g# g# g# g# F# F# F# d# d# g# g# F# F# B F# d# d# g# d# D#) | - |
| wtc1p09 | 99.8% (421/422) | 100/88 | same | same (0) | same | same | same | - |
| wtc1f09 | 100.0% (733/733) | 100/100/100 | same | same (12) | same | same | same | - |
| wtc1p10 | 99.9% (1148/1149) | 100/82 | same | same (0) | same | same | same | - |
| wtc1f10 | 100.0% (810/810) | 100/100 | same | same (9) | same | same | same | - |
| wtc1p11 | 100.0% (572/572) | 100/100 | same | same (0) | same | same | same | - |
| wtc1f11 | 99.7% (670/670) | 99/100/100 | same | same (13) | same | same | same | - |
| wtc1p12 | 96.4% (503/522) | 100/63 | same | same (0) | same | same | same | - |
| wtc1f12 | 99.8% (1318/1319) | 100/97/97/100 | same | same (10) | same | 7/8 | same | - |
| wtc1p13 | 100.0% (404/402) | 100/100 | same | same (0) | same | same | same | - |
| wtc1f13 | 100.0% (859/858) | 100/100/100 | same | same (8) | same | same | same | - |
| wtc1p14 | 100.0% (604/604) | 100/86 | same | same (0) | same | same | same | - |
| wtc1f14 | 99.8% (811/811) | 100/99/100/100 | same | same (9) | same | same | same | - |
| wtc1p15 | 100.0% (609/608) | 100/100 | same | same (0) | same | same | same | - |
| wtc1f15 | 99.9% (1697/1696) | 100/100/100 | same | 17/17: +79v1G −79v1e | same | same | G D G G D G e e b b D D G e e e G (was G D G G D G e e b b D D G e e e e G) | v0:4,v2:12 (was v0:7,v2:12) |
| wtc1p16 | 100.0% (534/534) | 100/65 | same | same (0) | same | same | same | - |
| wtc1f16 | 99.7% (753/754) | 100/100/100/100 | same | same (16) | same | same | same | - |
| wtc1p17 | 99.7% (661/663) | 100/90 | same | same (0) | same | same | same | - |
| wtc1f17 | 99.8% (891/891) | 100/100/100/99 | same | same (15) | same | same | same | - |
| wtc1p18 | 99.1% (553/558) | 100/69 | same | same (0) | same | same | g# B g# d# d# c# g# G# (was B g# d# d# c# g# G#) | - |
| wtc1f18 | 99.3% (803/805) | 100/99/99/99 | same | same (14) | same | same | g# c# g# c# c# c# g# c# d# d# E g# F# c# g# G# (was g# c# g# c# c# c# g# c# d# d# E g# F# c# g#) | - |
| wtc1p19 | 99.3% (604/607) | 100/79 | same | same (0) | same | same | same | - |
| wtc1f19 | 99.6% (1180/1182) | 96/96/100 | same | 17/17: +25v0E −25v0A,25v1E | same | same | A E A E A f# E A A E E E D D f# A E A (was A E A E A f# E A A A E E D D f# A E A) | - |
| wtc1p20 | 97.9% (610/619) | 98/83 | same | same (0) | 1-8 8-14 14-20 20-26 26-28 (was 1-8 8-13 13-19 19-26 26-28) | same | d e d C a A (was d e d C C A d a) | - |
| wtc1f20 | 99.9% (2408/2410) | 93/95/95/100 | same | 39/38: +77v0d,80v1a,81v0a,84v0d,85v1d −77v0e,80v0a,83v2di,85v0a | same | same | a e a e a G d d a a a e e e a a C a d d G G a d d d a a d d g g d d d a a A (was a e a e a G d d a a a e e e a a C a d d G G a d d d a a d d g g d d e a A) | v0:6,v1:7,v3:25 (was v0:49,v3:1) |
| wtc1p21 | 99.8% (632/633) | 63/69 | same | same (0) | same | same | same | - |
| wtc1f21 | 100.0% (952/952) | 100/100/100 | same | same (8) | same | same | same | - |
| wtc1p22 | 98.8% (779/777) | 100/60 | same | same (0) | same | same | same | - |
| wtc1f22 | 100.0% (745/745) | 100/100/100/100/100 | same | same (24) | same | same | same | - |
| wtc1p23 | 99.5% (417/419) | 100/63 | same | same (0) | same | same | same | - |
| wtc1f23 | 100.0% (827/827) | 100/100/100/100 | same | same (12) | same | same | same | - |
| wtc1p24 | 99.2% (720/726) | 100/65 | same | same (0) | same | same | same | - |
| wtc1f24 | 99.6% (1808/1810) | 98/99/99/100 | same | same (19) | same | same | same | v3:6 (was v1:5) |
| wtc2p01 | 98.5% (833/846) | 100/36 | same | same (0) | same | same | same | - |
| wtc2f01 | 99.6% (1032/1035) | 99/97/100 | same | 11/10: +76v0C − | 1-14 14-22 22-26 26-30 30-38 38-44 44-52 52-56 56-64 64-71 71-75 75-79 79-83 (was 1-14 14-22 22-26 26-30 30-38 38-44 44-52 52-56 56-64 64-71 71-75 75-83) | same | C G C d d G C G C C C (was C G C d d G C G C C) | - |
| wtc2p02 | 98.3% (692/686) | 99/96 | same | same (0) | same | same | same | - |
| wtc2f02 | 99.1% (657/660) | 99/100/99/100 | same | same (20) | same | same | same | v1:1 (was v0:3,v1:1) |
| wtc2p03 | 95.0% (804/807) | 97/55 | same | same (0) | 1-6 6-12 12-20 20-28 28-34 34-40 40-45 45-50 (was 1-6 6-12 12-20 20-26 26-32 32-37 37-43 43-50) | same | G# C# G# C# a# D# G# C# (was G# C# a# C#) | - |
| wtc2f03 | 97.9% (812/828) | 100/98/100 | same | 26/27: + −28v0G#i | 1-3 3-8 8-12 12-16 16-25 25-30 30-35 (was 1-3 3-8 8-12 12-16 16-25 25-29 29-33 33-35) | same | C# G# C# F# C# G# C# G# G# e# d# d# G# C# C# C# E# a# A# C# G# C# a# c# A# d# C# (was C# G# C# F# C# G# C# G# G# e# d# d# G# C# C# C# E# a# A# C# G# C# a# G# c# A# d# C#) | v1:4,v2:19 (was v0:10,v1:6,v2:23) |
| wtc2p04 | 61.4% (1149/1103) | 84/24 | 62/62, first at b. 18 | same (0) | 1-7 7-13 13-18 18-27 27-33 33-39 39-45 45-51 51-57 57-62 (was 1-7 7-13 13-21 21-25 25-32 32-37 37-45 45-54 54-60 60-62) | same | D# E f# c# (was f# E E E f# c# c# f# c#) | - |
| wtc2f04 | 99.7% (1353/1353) | 100/99/100 | same | same (24) | same | same | same | - |
| wtc2p05 | 94.6% (1488/1487) | 90/96 | same | same (0) | 1-8 8-13 13-19 19-28 28-33 33-39 39-48 48-53 53-56 (was 1-8 8-13 13-22 22-28 28-33 33-39 39-48 48-53 53-56) | same | A A D b b D D (was A A D G D b b D D) | - |
| wtc2f05 | 99.7% (878/880) | 100/100/99/100 | same | same (23) | same | same | same | - |
| wtc2p06 | 99.9% (1079/1079) | 100/98 | same | same (0) | same | same | same | - |
| wtc2f06 | 98.8% (800/809) | 100/100/100 | same | same (18) | same | same | same | - (was v0:8,v1:1) |
| wtc2p07 | 97.7% (910/916) | 96/97 | same | same (0) | 1-8 8-12 12-16 16-22 22-28 28-38 38-42 42-46 46-52 52-57 57-61 61-69 69-71 (was 1-8 8-16 16-22 22-28 28-38 38-42 42-46 46-52 52-57 57-61 61-69 69-71) | same | Eb Eb Bb Bb Ab Bb c D f Eb Ab Eb Eb Eb Eb Ab Eb (was Eb Eb Bb Ab Bb c D f Eb Ab Eb Eb Eb Eb Ab Eb) | - |
| wtc2f07 | 99.9% (707/707) | 100/100/100/100 | same | same (11) | same | same | same | - |
| wtc2p08 | 99.3% (977/952) | 99/100 | same | same (0) | 1-6 6-10 10-16 16-26 26-32 32-36 (was 1-6 6-12 12-18 18-26 26-32 32-36) | same | B F# F# F# d# (was B F# F# d#) | - |
| wtc2f08 | 98.5% (1019/1026) | 97/99/99/98 | same | same (16) | same | same | same | v1:7 (was v0:1,v1:8) |
| wtc2p09 | 98.1% (893/905) | 98/63 | same | same (0) | same | same | same | - |
| wtc2f09 | 99.7% (749/750) | 100/100/99/100 | same | same (34) | same | same | same | - |
| wtc2p10 | 98.1% (997/938) | 97/99 | same | same (0) | 1-7 7-11 11-15 15-21 21-30 30-36 36-42 42-51 51-59 59-63 63-73 73-81 81-86 86-92 92-98 98-108 (was 1-7 7-11 11-15 15-21 21-30 30-34 34-40 40-46 46-51 51-59 59-63 63-73 73-81 81-86 86-90 90-96 96-102 102-108) | same | e G b b G B D e a d G D G G G E e (was e G b b G B B E E D e a d G D G G G E E A e) | - |
| wtc2f10 | 99.7% (1433/1438) | 100/99/99 | same | same (9) | same | same | same | v0:4 (was v1:4,v2:1) |
| wtc2p11 | 59.4% (1236/1291) | 89/26 | 72/72, first at b. 19 | same (0) | same | same | same | - |
| wtc2f11 | 99.9% (978/979) | 100/98/99 | same | same (8) | same | same | same | v0:2,v1:2,v2:2 (was -) |
| wtc2p12 | 97.9% (748/713) | 97/100 | same | same (0) | same | same | same | - |
| wtc2f12 | 99.7% (1118/1119) | 99/100/100 | same | same (9) | same | same | same | - |
| wtc2p13 | 96.7% (1297/1302) | 95/98 | same | same (0) | 1-7 7-12 12-17 17-21 21-27 27-31 31-36 36-42 42-47 47-53 53-59 59-65 65-75 (was 1-7 7-12 12-17 17-21 21-27 27-31 31-36 36-44 44-50 50-56 56-65 65-75) | same | F# a# C# G# C# C# F# B A# d# d# a# g# d# F# (was F# a# C# G# C# C# F# B A# d# d# a# d# g# d# F#) | - |
| wtc2f13 | 99.8% (1123/1123) | 100/100/100 | same | same (11) | same | same | same | - |
| wtc2p14 | 97.9% (884/886) | 96/99 | same | same (0) | 1-6 6-13 13-17 17-21 21-30 30-36 36-43 (was 1-6 6-13 13-17 17-21 21-25 25-30 30-36 36-43) | same | f# f# c# b A D E A F# f# F# (was f# f# c# b A D E A b c# F# f# f# F#) | - |
| wtc2f14 | 99.8% (1399/1400) | 100/99/100 | same | same (32) | same | same | same | - |
| wtc2p15 | 99.0% (908/877) | 97/92 | same | same (0) | same | same | same | - |
| wtc2f15 | 99.3% (691/694) | 100/92/93 | same | same (10) | same | same | same | v0:2,v1:2 (was -) |
| wtc2p16 | 94.3% (516/510) | 96/58 | same | same (0) | same | same | same | - |
| wtc2f16 | 99.4% (1659/1662) | 99/100/99/100 | same | same (16) | same | 8/7 | same | - (was v0:3) |
| wtc2p17 | 96.9% (1543/1532) | 96/91 | same | same (0) | same | same | same | - |
| wtc2f17 | 99.0% (1346/1357) | 100/98/100/98 | same | 16/15: +5v1Eb − | same | same | Ab Eb Eb Ab Eb Ab Eb Ab Ab f eb bb ab Ab bb Ab (was Ab Eb Ab Eb Ab Eb Ab Ab f eb bb ab Ab bb Ab) | v3:9 (was v0:2,v2:8) |
| wtc2p18 | 98.1% (1282/1288) | 95/90 | same | same (0) | 1-10 10-17 17-21 21-27 27-35 35-41 41-50 (was 1-8 8-12 12-17 17-21 21-27 27-35 35-41 41-50) | same | g# c# G# F# d# d# d# G# F# g# g# g# g# (was g# d# c# G# F# d# d# d# G# F# g# g# g# g#) | - |
| wtc2f18 | 99.7% (1529/1529) | 100/100/100 | same | same (21) | same | same | same | - |
| wtc2p19 | 98.5% (687/686) | 99/58 | same | same (0) | same | same | b A f# A (was A f# A) | - |
| wtc2f19 | 99.9% (754/754) | 100/100/100 | same | same (13) | same | same | same | - |
| wtc2p20 | 98.4% (781/771) | 98/97 | same | same (0) | 1-7 7-13 13-19 19-25 25-32 (was 1-5 5-11 11-19 19-25 25-32) | same | F Bb C a (was F C Bb C a) | - |
| wtc2f20 | 99.3% (731/735) | 100/99/100 | same | same (8) | same | same | a e a C e a d a A (was a e a C e a d a) | - (was v1:2) |
| wtc2p21 | 97.8% (1747/1736) | 91/99 | same | same (0) | 1-7 7-15 15-21 21-30 30-37 37-43 43-49 49-55 55-62 62-67 67-73 73-79 79-85 85-87 (was 1-7 7-15 15-21 21-30 30-37 37-43 43-49 49-55 55-62 62-70 70-74 74-80 80-85 85-87) | same | g f bb c g Eb Bb Eb eb Bb (was g f bb c g g Bb Eb eb Bb) | - |
| wtc2f21 | 99.5% (961/964) | 99/99/100 | same | same (14) | same | same | same | - |
| wtc2p22 | 99.3% (1184/1187) | 100/63 | same | same (0) | same | same | bb f f Bb eb Db bb Gb eb Gb Db Db Ab eb bb bb bb bb bb Bb eb bb Bb (was bb f f eb Db bb Gb eb Gb Db Db Ab Db eb bb bb bb bb bb Bb eb bb Bb) | - |
| wtc2f22 | 99.8% (1752/1752) | 100/100/99/100 | same | same (24) | same | same | same | - |
| wtc2p23 | 98.8% (1048/1045) | 87/86 | same | same (0) | same | same | same | - |
| wtc2f23 | 99.8% (1316/1319) | 100/100/99/100 | same | same (30) | same | same | same | - |
| wtc2p24 | 99.1% (884/875) | 99/89 | same | same (0) | same | same | same | - |
| wtc2f24 | 99.5% (982/983) | 100/100/99 | same | same (12) | same | same | same | - |
| bwv1080-14 | 100.0% (2620/2620) | 100/100/100/100 | same | same (43) | same | same | same | - |
