# Bach's Mass in B minor (BWV 232) in the game: first research

Research only, written 28 November 2026 by the second account's session (branch `claude/mass-in-b-minor-research`). Nothing was
built, no game code changed, no decision number taken. Method and layout follow `docs/research/ORGAN-TRIO-SONATAS.md`
(branch `claude/zen-newton-g6qk06`). The files fetched are in `data/sources/mass-b-minor/` (SOURCE.md there).

## Summary

1. **The notes are there, whole and free.** A complete full score of all 27 movements, every instrument and voice, with the
   Latin words, exists as MusicXML under **CC0** (the MuseScore user "kuwitt", 2017, found in PDMX, the same dataset the game
   already uses). It is in Bach's key (B minor), not a semitone low. Nothing else needs fetching to start.
2. **It is accurate.** Checked note by note against CCARH's encoding of the Bach-Gesellschaft print (rights reserved, used
   only as a check, as D366 allows): **every line of every movement agrees at 96.6% or better, nearly all at 98-100%**. Two
   more free witnesses agree as closely: "sangerforum" (CC0) for Kyrie II, Gloria and Gratias, and Mutopia (CC BY-SA) for
   the Quoniam. The few differences are listed in SOURCE.md; the print settles them.
3. **One rights question for the owner:** kuwitt's file may have been made from CCARH's data (the note counts often match to
   the note), and CCARH's typeset score of the Mass carries CC BY-NC. Even in that case the game's own precedent for vocal
   works (BWV 228 under CC BY-NC, BWV 54 under CC BY-NC-SA) would allow it with credit. Plain answer in section 4.
4. **The game's reader needs two small fixes before any build:** it would play 750 invisible placeholder notes, and it
   ignores the trumpets' and horn's transposition (trumpets a tone low, horn a seventh high). Easy, but essential.
5. **Fit:** the Mass mixes three kinds of piece. **Choral fugues** (Kyrie II, Gratias, Credo, Confiteor, Dona nobis pacem…)
   have 5-8 real lines, the instruments mostly doubling the voices: the best fit. **Arias and duets** (Laudamus, Domine Deus,
   Qui sedes, Quoniam, Et in Spiritum, Benedictus, Agnus Dei) have 3-7 lines, with brilliant obbligato parts: like BWV 54,
   already in the game. **The big choruses** (Kyrie I, Gloria, Cum Sancto, Patrem, Et resurrexit, Sanctus, Osanna…) have 10-20
   independent lines, more than the game has ever played at once (BWV 228's eight).
6. **Suggested first slice: Kyrie II** (no. 3): a four-voice fugue, 59 bars, under 3 minutes, five real lines, no tempo
   change, three sources agreeing 99-100%. Then Gratias and Dona nobis pacem (the same music twice), then one aria
   (Quoniam or Agnus Dei). Reasons and effort in section 5.

## 1. Sources

| Source | What | Format | Licence | Edition | Pitch | Whole? | Lyrics |
|---|---|---|---|---|---|---|---|
| **kuwitt** (musescore.com, via PDMX) | all 27 movements in 4 files | MusicXML (.mxl) | **CC0** | not stated; matches BG 97-100% | written key, modern pitch | whole, full score, 40 staves | yes, all voices |
| sangerforum (musescore.com, via PDMX) | nos. 3, 4-5, 7 | MusicXML | CC0 | not stated (modern layout) | same | whole movements, full score | yes |
| Mutopia, Jay Anderson (2008) | no. 11 Quoniam | LilyPond | CC BY-SA 3.0 | BGA Band 6 | same | whole, full score | yes |
| CCARH MuseData (Rasmussen, 1994-95) | all, as 25 BG movements | MuseData | © CCARH (check only) | BG Band 6 | same | whole | yes |
| CCARH typeset score (IMSLP) | all | PDF | CC BY-NC 3.0 | BG | | | |
| Rondeau (IMSLP, behind the human check) | no. 10 Qui sedes | MusicXML, Finale | CC BY 3.0 | | | | not checked |
| PDMX others | Kyrie I vocal score with piano; vocal-only Gratias; a Gratias/Dona score flagged for a licence conflict; arrangements | MusicXML | mixed | | | | |
| CPDL | **not verified** (the site is blocked from this session) | | | | | | |
| Bach-Gesellschaft Band 6 (1856), Eulenburg, Peters vocal score | scans on IMSLP | PDF | public domain | | | | |

**For the owner to download by hand from IMSLP** (only if wanted; nothing depends on them): Rondeau's Qui sedes MusicXML
(`WIMA.8fd0-Mass232X-xml.zip`), CCARH's PDF (`PMLP04197-CCARH_Mass_in_b_minor.pdf`), and a few pages of the BG scan to settle
the disagreements below.

## 2. The files checked

Read with the game's own readers: `tools/touch/musicxml.ts` (kuwitt, sangerforum), `tools/touch/lily_json.py` (Mutopia), plus a
small MuseData reader for CCARH's files (scratch only). Onset and pitch compared part by part.

| Pair | Agreement per line | Where they differ |
|---|---|---|
| kuwitt vs CCARH, all 27 movements | 96.6-100%; 98-100% in all but two lines | Dona nobis pacem viola bars 31, 41; Sanctus/Pleni oboe III, a few bars; Cum Sancto trumpet I bars 27-28 |
| sangerforum vs kuwitt (Kyrie II, Gloria, Gratias) | 97-100% (Kyrie II 99-100%) | Gloria: a handful of repeated notes in violins and viola |
| sangerforum vs CCARH (same three) | 97-100% | the same places |
| Mutopia Quoniam vs CCARH | 99.0-100% | a few notes per line |

Independence: sangerforum and Mutopia look independent; kuwitt may derive from CCARH (identical note counts), though his Dona
differs where his Gratias (the same music) does not, so it was edited by hand. **Three-way agreement where it can be tested,
and nothing above 3% different anywhere: the notes can be trusted**, with a look at the print for the listed bars.

Ornament signs in kuwitt's file (trills, mostly): about 240 in all, most in the Quoniam (59), Sanctus (31), Et resurrexit
(26), Gloria (21), Et in Spiritum (21), Laudamus (20); grace notes about 30 (Benedictus 11). Not yet checked against the
print ("ornaments from the print" would need that look, as for the fugues).

## 3. Fit with the game, movement by movement

"Real lines": parts that are not a copy (90%+) of another. Minutes at the encoder's playback tempi (editorial; total about
1 h 45). Player's part: lines lively enough to offer ("no dull lines"); band-only: sparse trumpets and timpani, doublings.

| No. | Movement | Bars | Min | Real lines | Tempo/metre change inside | Good player's parts | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Kyrie I | 126 | 9 | 13 (SSATB, 6 instr., bc) | **yes**: 4 bars Adagio, then Largo | the five voices (fugue) | long; the instruments independent in the ritornelli |
| 2 | Christe | 85 | 4 | 4 (S I, S II, violins in unison, bc) | no | the two sopranos, the violins | a duet; violins busy (2.8 notes a beat) |
| 3 | **Kyrie II** | 59 | 2.7 | **5** (SATB, bc) | no | all four voices | every instrument doubles a voice; stile antico fugue |
| 4-5 | Gloria + Et in terra | 176 | 4.8 | 15 | **yes**: 3/8 Vivace, then 4/4 at bar 101 | voices, flutes, violin I | trumpets and timpani |
| 6 | Laudamus te | 63 | 3.4 | 6 | no | solo violin (3.3 notes a beat), soprano II | 20 ornament signs |
| 7 | Gratias | 46 | 2.5 | 8 (SATB, 3 tpt, timp, bc) | no | the four voices | the instruments double the voices |
| 8 | Domine Deus | 95 | 5 | 7 | no | flute, soprano, tenor | runs straight into Qui tollis |
| 9 | Qui tollis | 51 | 3 | 10 | no | flutes, voices | slow |
| 10 | Qui sedes | 87 | 3.9 | 6 | an Adagio near the end in this file (not checked in the print) | oboe d'amore, alto | |
| 11 | Quoniam | 127 | 4.5 | 5 (horn, 2 bassoons, bass, bc) | no | horn, bassoons, bass | 59 ornament signs; three witnesses |
| 12 | Cum Sancto Spiritu | 128 | 3.5 | 15 | no | voices, flutes, violins | fast and dense |
| 13 | Credo | 45 | 2 | 8 (SSATB, 2 vn, bc) | no | the voices, violins | plainchant subject; the continuo walks in quarters (plain) |
| 14 | Patrem omnipotentem | 84 | 1.7 | 14 | no | voices, oboes, violins | |
| 15 | Et in unum | 80 | 4.3 | 7 | no | soprano, alto, violins | BG's opening differs from modern editions (IMSLP notes an error in BG-based scores; not checked) |
| 16 | Et incarnatus | 49 | 2.7 | 7 | no | violins (busy), voices | slow, voices sparse |
| 17 | Crucifixus | 53 | 2.6 | 10 | no | flutes, voices | bass: the ground repeated 13 times (owner to judge if dull) |
| 18 | Et resurrexit | 131 | 3.8 | 17 | no | voices, flutes, violins | a bass solo passage |
| 19 | Et in Spiritum | 144 | 5.1 | 4 (2 oboes d'amore, bass, bc) | no | oboes d'amore, bass | 21 ornament signs |
| 20 | Confiteor | 145 | 3.7 | 6 (SSATB, bc) | **yes**: Adagio from bar 121, the famous transition | the voices | runs straight into Et expecto |
| 21 | Et expecto | 106 | 1.9 | 16 | (starts Vivace e Allegro) | voices, trumpet I | |
| 22 | Sanctus + Pleni | 168 | 6.7 | 17 (SSAATB + instr.) | **yes**: 4/4 to 3/8 at bar 48; the file plays both at one tempo (Pleni far too slow) | voices, oboes, violins | |
| 23 | Osanna | 149 | 2.5 | **20** (two SATB choirs + 12 instr.) | no | the voices, flutes | the densest; double choir like BWV 228 |
| 24 | Benedictus | 58 | 3.7 | 3 (violin/flute, tenor, bc) | no | the obbligato (3.3 notes a beat), tenor | BG names no instrument; flute usual |
| 25 | Osanna repeated | 149 | 2.5 | 20 | | | written out again, identical: one piece covers both |
| 26 | Agnus Dei | 49 | 4.6 | 3 (violins in unison, alto, bc) | no | violins, alto | slow, three lines: simplest texture |
| 27 | Dona nobis pacem | 46 | 3.8 | 8 | no | the four voices | the Gratias music again |

What this means for play:
- **Line counts.** Up to eight is proven (BWV 228). The choral fugues and arias (15 of the 27 movements) stay within it, once
  doublings play as one line in the band. The other twelve have 10-20 independent lines: dropping any would drop notes
  (not allowed), so they need the engine and music box to carry more voices. **Not verified** whether they can.
- **Tempo changes inside a movement** in four places (Kyrie I, Gloria/Et in terra, Confiteor, Sanctus/Pleni): the D1078
  tempo-map work for the suites covers them; nothing is needed for the first slice.
- **The bass stays audible:** the continuo plays in every movement. The usual balance measurement applies.
- **Words.** The file's syllables go straight into the path BWV 54 and BWV 228 already use (D347: words in the music box,
  carried over melismas; D679's own line for the chorales). Each vocal part has its own words. Latin syllables need one
  check of the joins, as D347 did for BWV 228's chorale ("Ky-ri-e e-le-i-son" splits as BG prints it). Lyrics follow the
  notes, so they are not a word or tag drawn for an entry (the standing rule).
- **Sounds (the owner listens first).** Candidates the game already has: SOLO VOICES (BWV 228's choir) for the choruses;
  SUPER 16-BIT (BWV 54's strings) or BAROQUE BAND for the arias; ORCHESTRA & ORGAN, BACH BRASS for the trumpets; FLUTE &
  HARP or ZELENKA TRIO for the flute and oboe arias. A listening page with A/B clips before any choice.
- **Whole works:** each movement a piece of its own, as the Musical Offering and BWV 54 are; the Osanna's repeat counted
  once; Domine Deus → Qui tollis and Confiteor → Et expecto run on in performance but are separate in every edition.

## 4. Rights, in plain words

- The music is Bach's: public domain. The Bach-Gesellschaft print (1856) is public domain.
- **kuwitt's and sangerforum's files are CC0**: free for any use, no credit required (the game would credit them anyway).
  This is the same kind of source as the 48's preludes (D366).
- **The doubt:** kuwitt's file may have been made from CCARH's encoding. CCARH's raw files say "(C) CCARH"; its typeset full
  score on IMSLP is CC BY-NC 3.0. If kuwitt started from CCARH, his CC0 label may claim more than he could give. The risk is
  low (a mass-market site, eight years public, the notes themselves Bach's and BG's), and the game's precedent for vocal works
  already accepts CC BY-NC with credit (BWV 228, D341; BWV 54, CC BY-NC-SA). **Not legal advice.**
- Options: (a) use kuwitt's file as CC0, crediting kuwitt and noting CCARH and BG; (b) also credit CCARH and treat it as
  CC BY-NC (as for BWV 228); (c) write to CCARH for a plain permission (cheap, and settles it).
- Mutopia's Quoniam is CC BY-SA (credit and share-alike), as some Inventions (D366); not needed if kuwitt's is used.
- CCARH's MuseData was read only as a check, never kept or shipped (D366).

## 5. Suggested first slice: Kyrie II (no. 3)

- **Why:** short (59 bars, under 3 minutes); five real lines (S, A, T, B, continuo), each lively in a fugue, so any voice
  makes a good part; no tempo change; the subject enters in turn (the game's entries already handle that); three sources agree
  99-100%; the words are only "Kyrie eleison". It proves the whole chain (cut a movement from kuwitt's big file, skip the
  hidden notes, fold the doubling instruments into the voices' band lines, words, a choral sound) at the lowest risk.
- **Next:** Gratias and Dona nobis pacem (one design, two pieces; adds the transposing trumpets), then one aria with a
  brilliant obbligato: Quoniam (horn, bassoons, bass) or Agnus Dei (three lines). The big choruses wait for a voice-count test.
- **Rough work for the first slice:** the two reader fixes (invisible notes; a part's transposition) with tests; a
  `more-bach.ts` entry cutting bars from the Part 1 file (as `bwv228-2` does with `fromBar`); entries; editorial tempo;
  credit line; card picture; sound trial with a listening page; tests like BWV 228's. Small to medium; the riskiest part is
  the sound of a choir, as before.

## 6. Questions for the owner

1. First slice: Kyrie II as suggested, or an aria first (Quoniam, Agnus Dei, Benedictus)?
2. Rights: use kuwitt's CC0 file with credit (a), treat it as CC BY-NC like BWV 228 (b), or ask CCARH first (c)?
3. The big choruses (10-20 lines): worth testing whether the game can carry them, or leave them for later?
4. Words: show the Latin in the music box as for BWV 54 and 228?
5. Sound: which to hear on a listening page first (SOLO VOICES alone, or voices with BAROQUE BAND / ORCHESTRA & ORGAN)?
6. MORE BACH section name: MASS IN B MINOR, or MISSA?

## Not verified (nothing above rests on it)

CPDL's editions (site blocked); the BG print itself for the listed disagreements, the ornament signs and the Qui sedes
Adagio; whether kuwitt really started from CCARH's data; whether the engine and music box can show more than eight lines;
the minutes (the encoder's playback tempi, not recordings).
