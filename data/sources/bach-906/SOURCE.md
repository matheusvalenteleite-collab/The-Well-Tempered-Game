# Source: Bach, Fantasia and Fugue in C minor, BWV 906

No free machine-readable edition of the whole work exists (a partial MuseScore file in PDMX, no. 5470809, covers only
the Fantasia's opening and was used as a check only). Both movements were therefore transcribed for the game, note by
note, from the Bach-Gesellschaft print, and read against it a second time, bar by bar, by another reader. The
transcriptions are `transcription/bwv906fan.ly` and `transcription/bwv906fug.ly` (LilyPond, absolute pitches, a
`% bar N` comment and a bar check for every bar), read by `tools/touch/more-bach.ts` (`lyDir`) into
`data/touch/more-bach.json` (play.html's MORE BACH, section FANTASIAS AND FUGUES, D755).

| game id | movement | print | bars | licence |
|---|---|---|---|---|
| bwv906-1 | Fantasia, C minor, common time, two repeated halves (bars 1-16, 17-40) | Nr. XXV "Fantasie, C moll", printed pp. 145-147 (PDF pp. 247-249) | 40 | the print public domain; the transcription public domain |
| bwv906-2 | Fugue, C minor, common time, three voices, unfinished | Anhang II, Nr. 9 "Unvollendete Fuge in C-moll. Zu der Fantasie XXV. Seite 145.", printed pp. 238-239 (PDF pp. 340-341) | 47 and one beat | the same |

The print: Bach-Gesellschaft Ausgabe, Band 36 (Clavierwerke IV, ed. Ernst Naumann, 1890):
https://archive.org/download/bach-gesellschaft-ausgabe/BGA%20Band%2036.pdf. Its preface (pp. XCVII-XCVIII) names the
sources (the autograph in Dresden, Kellner's copy, P. 213, Peters, Bischoff), calls the fugue "leider nicht zu Ende
geführt", and gives Kellner's and Peters' c'', d'', f'', d'', g'' against the print's c♭'', d♭'', f♭'', d♭'', g♭'' in the
fugue's bars 7, 8, 13, 14 and 15: the print's are kept.

## The fugue's end

The print breaks off after the first beat of bar 48, on one chord (C5, E♭4, A♭2), the staves running on empty with no
closing barline; it adds no completion and no remark. The game's fugue ends there: its length is bar 48's first
crotchet.

## Read

- Fantasia: two voices, the hands: `upper` (the right hand) and `lower` (the left), each written on whichever staff
  the print puts it (the left hand crosses over in bars 9-13, 25-28, 31); the few bars where a hand has a second line
  (`upperTwo`: bars 1, 2, 8, 17, 18, 34, 35, 37; `lowerTwo`: 37-39) are that hand's chords, given to the band (D363,
  `lyAside`). Ornaments as printed (the hooked trill of bars 1, 2, 17, 18, 34, 35, 37 as `\downprall`: a reading of
  the sign). Each repeated half played once, as the game plays every repeat.
- Fugue: soprano `upper:1`, alto `upper:2` (on the lower staff in bars 23-25 and 30-33; silent, with no rests printed,
  in bars 34-45), bass `lower:1`. Entries by the finders: S 1, A 3, B 5, S 9, B 17, A 19, S 21, A 46.

## The second reading

Each movement was read again from the print by a second reader, who wrote down each bar before comparing it with the
transcription. The Fugue: no difference in any of its 48 bars (four first-reading doubts, bars 12, 24, 29 and 47, each
settled for the transcription at a closer zoom). The Fantasia: corrected in the transcription where the second reading
found it wrong (each checked against the print again):

| bar | beat | hand | transcribed | print (kept) |
|---|---|---|---|---|
| 16 | 3 | right | G4 D4 B3 G3, four semiquavers | a triplet G4 D4 B3 and a quaver G3 |
| 31 | 2 and 4 | right | F4 A♭4 C5 F5; E♭4 G4 B♭4 E♭5, semiquavers | a triplet and a quaver, each |
| 31 | 3 | left | B♭3 D4 F4 B♭4, semiquavers | a triplet and a quaver |
| 37 | 4 | right | the triplet's last note B♭3 | B♭4 (its flat printed, on the B4 line) |
| 40 | 3 | right | C5 G4 E♭4 C4, four semiquavers | a triplet C5 G4 E♭4 and a quaver C4 |

Readings both readers took as their judgement, not certain: in the Fantasia, bar 13 beat 3 (E♭3 the left hand's, G3
the right's), bar 37 beats 2.5-3 (a tie G3, not a slur to A♭3), bar 28 beat 3.5 (C5, a rest, G4 A♭4 written as one
triplet: it sounds the same); in the Fugue, the arcs of bar 33 (bass C3) and 46 (soprano C5) read as ties, and bar 39's
last bass quaver F♯3 by the bar's sharp (it rises to G).

A check by ear's stand-in: every semitone or major-seventh clash on a beat or struck together was listed from the notes
and read as music (suspensions, leading notes, passing notes): none showed a wrong note.
