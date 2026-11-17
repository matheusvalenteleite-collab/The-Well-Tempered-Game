# Source: Bach, Goldberg Variations, BWV 988 (Aria mit verschiedenen Veränderungen, Clavier-Übung IV)

## The edition shipped

The Open Goldberg Variations score (Werner Schweer with Kimiko Ishizaka, 2012; MuseScore score 48072 by "OpenGoldberg",
https://musescore.com/user/9836/scores/48072), as MusicXML in PDMX ("PDMX: A Large-Scale Public Domain MusicXML Dataset
for Symbolic Music Processing", Zenodo 2025-06-01, DOI 10.5281/zenodo.15571083; the dataset CC BY 4.0), its file
`mxl/14/24/QmWHjTTbQJFLQHZ94V55odFCFxDY5n2sKoDBy9sSLBthdj.mxl`, kept as `pdmx/48072.mxl` with its metadata as
`pdmx/48072.metadata.json`. Fetched 17 November 2026.

- Licence: CC0 1.0 (metadata `"license": "cc-zero"`, `"is_public_domain": true`; the project released score and recording
  "into the public domain using the Creative Commons Zero (CC0) license tool", 28 May 2012). IMSLP lists the project's
  2012 PDF as CC BY 3.0; the MusicXML used here is the CC0 MuseScore score.
- No source edition named. Revised 2012, 2015, 2017.

Read by `tools/touch/more-bach.ts` (`GOLDBERG_TABLE`) into `data/touch/more-bach.json` as `bwv988-00` (the Aria) to
`bwv988-30`, MORE BACH's section GOLDBERG VARIATIONS (D757).

## How it is read

- One part on two staves, 990 measures; each piece by its measures in the file (`xmlRanges`, `xmlByIndex`: the file's
  bar numbers restart and repeat), its bars numbered as the file counts them within the piece (both endings counted).
- Repeats: each half once, as the game plays every repeat (the Inventions, BWV 906, BWV 998). Where a half has two
  endings (Variations 2, 4, 6, 16, 25) the first is left out, so the half runs on into the second, as when played the
  second time; those pieces' bar numbers skip the first ending's.
- Voices: the edition's written layers (`staff:voice`), the main ones (8 % of a piece's notes or more) each a voice, top
  first by mean pitch; a layer with a few notes joined to the main layer of its staff nearest in pitch (where it sounds
  with that voice, a chord: D363's divisi gives the extra note to the band). Two, three or four voices as the piece is
  written.
- Voices offered: only the lines worth playing (the owner); the others sound in the band as written
  (`GOLDBERG_PLAYABLE`): the Aria its melody only; Variations 13 and 25 their melodies; 26 its hands; the canons (6, 12,
  15, 21, 24), the Fughetta (10), the Ouverture (16), 22, 23, 28, 29 and the Quodlibet (30) without their partial layers
  and slow basses.
- Ornaments: the edition's signs kept as kern's signs on their notes (`keepOrnaments`): inverted mordent W, mordent M,
  trill T, turn S; and its appoggiaturas, "Q" + pitch (the game plays them: ornament-play.ts; the half or whole step read
  from the bar). Nothing written out. The trill hooked from below (Bach's Doppelt-cadence), which the edition names a
  short inverted mordent, is a trill (T) here. The Aria's two slides (Schleifer, bars 21 and 23) have no kern sign and
  are not played; listed by the importer as unplayed.
- The Aria da capo (measures 959-990) is identical to the Aria (every note, ornament, appoggiatura and repeat sign): it
  is not a piece of its own (the owner: no tile for it; NEXT after Variation 30 returns to the Aria).

## Variation 26

The file's Variation 26 is broken: its 3/4 bars hold the right hand's 18/16 run at its 18/16 length (4.5 crotchets, not
3), and bars 28-32's rests do not add up. It was transcribed for the game from the prints below, note by note
(`transcription/bwv988v26.ly`, LilyPond, written in 3/4 with the 18/16 semiquavers as sextuplets; public domain), then
read again by a second reader. Its voices: each hand as the prints write it (the running line or the sarabande's upper
voice, by turns), and the sarabande's lower voice, written under it in either hand, as a voice between them.

Where the prints differ: bar 14, the upper staff's lower voice D5 (1741) against E5 (Bach-Gesellschaft): D5. Bar 12,
the sarabande's lower voice A4 then C♯5 (1741; the Bach-Gesellschaft adds an E4): as 1741. Bar 16, the final D6 a
crotchet without its dot in 1741 (the bar short): its length the bar's, as the Bach-Gesellschaft; its sign the 1741
print's short mordent (the Bach-Gesellschaft's three-humped sign not followed; medium confidence: the stroke may be the
stem). Bar 13, the sarabande's lower voice: C♯5 kept against the 1741 print's C (no accidental), with the
Bach-Gesellschaft and Mutopia (the same note sharpened just before the bar line, the harmony towards D): contestable, as
Variation 4's bar 17.

The second reading (another reader, each bar read from both prints before the transcription was opened) found every
note of bars 1-12, 14, 15, 17, 18 and 20-32 as transcribed, bar 16's sign as above (corrected), bar 13 as above, and
bar 19's A5 doubtful in the 1741 print (its head half a space low, a ledger stroke through it) and clear in the
Bach-Gesellschaft: A5 kept.

## Checked against

| witness | licence | use |
|---|---|---|
| Mutopia Project, BWV 988 (Aria and Variations 1-30, one LilyPond file each; J. D. Erickson, B. D. Esham, Hajo Dezelski, 2013-2014; "Bach-Gesellschaft Edition 1853 Band 3") | CC BY-SA 3.0 | a check only |
| Davide Madrisan's typesetting, github.com/madrisan/open-scores ("after J. S. Bach's copy of the first edition") | CC BY-NC-SA 4.0 | a check only, never shipped |

Every difference between the shipped edition and either witness, in notes and ornaments, was read in the prints:

- the 1741 print (Balthasar Schmid, Nürnberg), the Austrian National Library's copy, SH.J.S.Bach.75, through its IIIF
  manifest https://api.onb.ac.at/iiif/presentation/v3/manifest/DTL_8411171 (the manifest states no licence; the scans
  read, not shipped). Its handwritten additions (small signs on inner voices, not engraved) were not followed;
- the Bach-Gesellschaft Ausgabe, Band 3 (1853, ed. C. F. Becker), printed pp. 263-308:
  https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2003.pdf (Public Domain Mark).

Where the two prints differ, the 1741 print is followed, but for one place (Variation 4, bar 17, below).

## The corrections

Applied by `more-bach.ts` (`GOLDBERG_FIXES`, `GOLDBERG_ORN_FIXES`; each note found by its voice, place in the bar and
pitch; a fix that finds nothing stops the build); the file kept as fetched. Bars as the importer numbers them; places in
whole notes from the bar's start.

| piece | bar, place | edition | print (kept) |
|---|---|---|---|
| Var. 4 | 17, 0 | C5 struck | C♯5 held from bar 15 (the Bach-Gesellschaft's tie; the 1741 print's arcs there mark the endings; the harmony A7-D) |
| Var. 6 | 28, 0; 30, 0 | C4, E4 struck again | tied |
| Var. 8 | 19, 11/16 | C♯4 | C4 (the natural earlier in the bar holds) |
| Var. 9 | 13, 0 | B4 struck again | tied from bar 12 |
| Var. 11 | 26, 3/16 | B3 struck again | tied |
| Var. 12 | 11, 1/4 | C♯5 struck again | tied |
| Var. 14 | 3, 1/16 and 3/16 | D4 | E4 |
| Var. 14 | 4, 5/8 | C3 held on | struck again |
| Var. 14 | 23, 1/4 and 7/16 | E♭4 | D♯4 |
| Var. 14 | 25, 0 | E4 a quaver | a semiquaver |
| Var. 15 | 4, 5/16 | A4 | G4 |
| Var. 16 | 11, 15/16 | A♭3 | G♯3 |
| Var. 21 | 7, 15/16 | D♭3 | C♯3 |
| Var. 21 | 12, 1/4 | A3 | A♭3 (the flat earlier in the bar holds) |
| Var. 21 | 16, 0 | D4 struck again | tied |
| Var. 22 | 30, 1/2 | D♭3 | C♯3 |
| Var. 23 | 25, 1/2 | (none) | C5 under the E5 |
| Var. 24 | 20, 0 | E♭3 | D♯3 |
| Var. 24 | 21, 0; 21, 3/4; 22, 0 | B3, C4, A3 struck again | tied |
| Var. 24 | 27, 1/8 | A♭3 | G♯3 |
| Var. 25 | 2, 0 | D♭5 struck | C♯5 tied |
| Var. 25 | 9, 3/16 | G4 | A4 |
| Var. 25 | 21, 1/2 | G4 | G♭4 |
| Var. 25 | 21, 11/16; 22, 0 | C4 tied over | C♭4, struck again |
| Var. 25 | 22, 21/32 | C5 | C♭5 |
| Var. 27 | 20, 0 | E♭5 | D♯5 |
| Var. 28 | 4, 1/4 | D♭6 | C♯6 |
| Var. 28 | 9, 1/4 | D5 | E5 |
| Var. 29 | 4, 3/8 | F♯3 | E3 |
| Var. 29 | 16, 1/4 and 3/8 | D♭4 | C♯4 |
| Var. 29 | 22, 1/4, 3/8, 5/8 | E♭5 | D♯5 |
| Var. 29 | 27, 1/12 | F♯4 | F♮4 |
| Var. 30 | 17, 7/8 | D♭4 | C♯4 |

Ornaments:

| piece | bar, place, note | edition | print (kept) |
|---|---|---|---|
| Aria | 3, 11, 12, 17 (1/4) | inverted mordent | the trill hooked from below: T |
| Var. 5 | 17, 1/2, F♯5 | mordent | the hooked trill with a mordent: TM |
| Var. 9 | 12, 0, E4; 13, 0, C4 | an appoggiatura | none |
| Var. 9 | 13, 1/4, B3 | inverted mordent | none |
| Var. 10 | 25, 0, C♯3 | mordent | none (low confidence: an unreadable mark in the 1741 print's upper staff) |
| Var. 11 | 6, 7 (G4), 14, 15 (D5), 0 | inverted mordent | the trill hooked from below: T |
| Var. 13 | 12, 11/16, G5 | turn | none |
| Var. 14 | 17, 1/4, C6 | inverted mordent and trill | one long trill: T |
| Var. 14 | 20, 1/4, A2 | none | a long trill: T |
| Var. 20 | 10, 1/4, A5 | mordent | none |
| Var. 23 | 11, 1/2, B5; 19, 0, C4 | mordent; trill | none |
| Var. 23 | 23, 1/16, C5 | none | an appoggiatura, D5 (its head between the C5 space and the D5 line: the likelier reading) |
| Var. 24 | 17, 0, A4; 19, 0, A5 | inverted mordent | the hooked long trill: T |
| Var. 25 | 5, 6, 14 (1/4) | an appoggiatura | none (in neither print) |
| Var. 25 | 1, 2 (1/4) | an appoggiatura | none: the 1741 print has none; the Bach-Gesellschaft has them (the 1741 print followed; contestable) |
| Var. 30 | 12, 1/2, D♯5 | inverted mordent | none |

Kept as the edition has them where the witnesses differ and the prints agree with it: among others Var. 2 bar 18 (C5,
the 1741 print, against the Bach-Gesellschaft's C♯5), Var. 3 bar 12, Var. 5 bars 16 and 25, Var. 6 bar 18, Var. 8
bar 3, Var. 9 bar 12 (D♯4), Var. 16 bar 30, Var. 20 bars 5, 9, 14, 28, Var. 23 bars 16 and 26, Var. 28 bars 18 and 27,
Var. 29 bars 11, 14, 16. The witnesses' longer ornament names (Mutopia's prallmordent, downprall) follow the
Bach-Gesellschaft's engraving; the 1741 print's short signs agree with the edition's.

Not changed, recorded: Var. 16 bar 15, the turn printed between the dotted D5 and the E5 (most likely a turn after the
D; the game plays a turn only at a note's start: the edition's turn on the E5 kept). Var. 17 bar 12, a long mordent
(three humps and a stroke): kern has no long mordent, M kept. Var. 21 bar 6, whether the D4's sign is hooked from above
(unclear): kept.

## Hand crossings

The two-manual variations (5, 8, 11, 14, 17, 20, 23, 26, 28) keep each voice as written; no voice holds two notes at once
but its chords, so none is impossible to play one note at a time. Their lines cross widely (Variation 20: the right
hand down to G2, the left up to D6): the sounds seat them by the reach rule (D850); their lowest lines climbing into the
treble are left to Instruments.
