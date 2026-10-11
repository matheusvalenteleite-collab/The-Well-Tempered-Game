# Sourced commentary on Bach's four-part chorales, round 2

Compiled 2026-10-11. This is a follow-up to `chorale-commentary.md` and does not repeat its sources (Pirro pp. 136–138, Spitta II–III in English, Schweitzer/Newman II pp. 30–34, Whittaker 1924, Parry 1909).

I read both sources used here in full view on archive.org during this session. For each note I read the OCR text and checked it against the page images. I also read every music example from the page images and matched it note by note against `data/chorales/study.json`. Nothing here comes from memory.

## Conventions

- **n** is the game number in `data/chorales/study.json`. I checked each one against that file's `bwv` and `title` fields. The study file sometimes titles a chorale by its tune rather than by the stanza. For example, No. 117 (BWV 244/10, "Ich bin's, ich sollte büßen") is titled "Nun ruhen alle Wälder".
- **Bars** follow the game's numbering. Bar 0 is the pickup bar where there is one; otherwise bars count from 1. "Beat 2½" means the second quaver of beat 2.
  - I checked every pitch claim with a script that prints the sounding notes of all four voices at each onset.
  - When I write "the data shows", that describes the game's notes, not the source's music example.
- **Weber's bar numbers ("Takt")** need converting, and I give the conversion in each note.
  - Weber's essay prints Bach's settings of Nos. 1 and 2 in full on pp. 234 and 236. There the bars are numbered from the first full bar, as the game does. However, the repeated first section (Stollen) of a bar-form chorale is written out a second time.
  - So a Takt number after the repeat equals the game bar plus the length of the Stollen. In No. 1, for example, Weber's Takt 24 is game bar 17. Weber's "Vergleichungsplan der Schlußfälle" (plan of the cadences) also counts each repeated cadence twice.
  - I confirmed the conversion for every chorale by matching Weber's cadence plan against the fermatas in the game data.
- **Weber's stance.** Weber was 23 when he wrote this essay. He wrote it to show that his teacher Abbé Vogler's reharmonisations of the first twelve chorales of the 1784 Breitkopf edition were better than Bach's.
  - His remarks on Bach are therefore fault-finding. Most of them are precise technical observations: clashing passing notes, fifths covered by decoration, monotonous cadences, voice-crossing.
  - The guide should present them as "what a critic in 1810 objected to". They should not be presented as received wisdom.
  - Schweitzer (II, pp. 30–31 in English; German ed. p. 426) cites this essay as proof that Bach's chorales are not "pure music". That page was used in round 1, so I do not repeat it here.
- **Prout's music examples** are short extracts, usually two bars, without bar numbers. I identified each one by matching soprano, bass and inner voices against the game data. The bar given is the game bar.
- **Quotations** are exact. German quotations are followed by my translation in brackets. Quotations are under 30 words; longer passages are paraphrased.
- **Full view** means public domain and readable without login on archive.org. Every source used here is full view.

## Sources used (all full view, public domain)

| Short name | Full citation | URL |
|---|---|---|
| Weber | Carl Maria von Weber, "Zwölf Choräle von Seb. Bach, umgearbeitet von Vogler, zergliedert von Carl Maria von Weber" (written 1810), in Weber, *Sämtliche Schriften*, ed. Georg Kaiser (Berlin and Leipzig: Schuster & Loeffler, 1908), pp. 229–242. Bach's settings of Nos. 1–2 are printed on pp. 234 and 236, and Vogler's on pp. 235 and 237. | https://archive.org/details/smtlicheschrif00webe. Page p is at leaf n(p+131): p. 232 = `/page/n363`, p. 238 = `/page/n369`, p. 241 = `/page/n372`. |
| Prout | Ebenezer Prout, *Harmony: Its Theory and Practice*, 12th edition (London: Augener & Co., n.d.). The preface is dated June 1889; the publisher's advertisements quote reviews from 1896. | https://archive.org/details/harmonyitstheory00prouuoft. Page p is at leaf n(p+3): p. 69 = `/page/n72`, p. 93 = `/page/n96`, p. 230 = `/page/n233`. |

---

## Aus meines Herzens Grunde — BWV 269 — No. 1

1. **Bar 3: the inner voices against the bass.**
   - Weber: "Bei Bach finden wir Takt 3 in den Mittelstimmen gegen den Baß eine unangenehme Zusammenstellung" [In Bach we find in bar 3 an unpleasant combination of the middle voices against the bass]. Interlinear letters show that the clash is first D and B against C in the bass, then E and C against B in the bass.
   - The data confirms this. On beat 1, alto D4 and tenor B3 are struck over bass C3. On beat 2, alto E4 and tenor C4 sound over bass B2, because the bass is walking down C–B–A–G.
   - Weber's Takt 3 is game bar 3. Weber, p. 232 (leaf n363). Full view.
2. **Bars 13–14: the melody's drop at the cadence.**
   - Weber (his Takt 20–21) calls the melody's leap here "eine auffallende Härte" [a striking harshness]. The bass G with its minor seventh turns the soprano's B into a leading note that "should" rise to C. Instead the melody falls.
   - The data shows a G7 chord on the last beat of bar 13: soprano B4, alto F4, tenor D4, bass G2. The soprano then drops to G4 over a C-major chord at the bar-14 fermata.
   - Weber's numbering includes the written-out repeat of bars 1–7, so his Takt 20–21 are game bars 13–14. Weber, p. 232. Full view.
3. **Bar 17: walking quavers in the bass.**
   - Weber: "Der Takt 24 ist bei Bach voll übelzusammentreffender Durchgänge" [Bar 24 in Bach is full of badly colliding passing notes].
   - The data shows the bass running in quavers, E3–D3–C3–B2–A2–G2, against moving alto and tenor.
   - Weber's Takt 24 is game bar 17 (24 − 7). Weber, pp. 232–233. Full view.

## Ich dank dir, lieber Herre — BWV 347 — No. 2

4. **Bar 2: the repeated cadence on E.**
   - Weber: "Die fünf Schlüsse in E bei Bach erzeugen Eintönigkeit und sind besonders Takt 2 und 6 etwas hart" [Bach's five cadences on E produce monotony, and those in bars 2 and 6 are rather hard].
   - Weber's Takt 2 and 6 are game bar 2, heard first time and on the repeat.
   - The data shows the bar-2 cadence moving E minor (soprano G♮4) → B7 → E major in this A-major chorale. The cadences at bars 2, 4, 6 and 10 all land on E.
   - Weber, p. 233 (leaf n364). Full view.
5. **Bar 12, beat 1½: a three-note clash.**
   - Weber (Takt 16) calls the bar stiff. He calls the meeting of B, A and G♯ "sehr unangenehm" [very unpleasant].
   - The data shows soprano B4 passing over alto A4 (held) and bass G♯3 at beat 1½.
   - Weber's Takt 16 is game bar 12 (16 − 4). Weber, p. 233. Full view.
   - *Not used:* Weber also says bar 14 (game bar 10) "will let the ear hear fifths" that are avoided on paper. I could not find which voices he means, so I left that claim out.

## Ach Gott, vom Himmel sieh darein — BWV 153/1 — No. 3

6. **Bar 3, beat 4: a three-note clash before the cadence; semiquavers in the melody.**
   - Weber: "Dieser Choral ist einer der schönsten und fließendsten von Bach, bis auf Takt 3, wo, um den Baß singend zu machen, im letzten Viertel f/d/e zusammentreffen." [This chorale is one of Bach's most beautiful and flowing, except bar 3, where, to make the bass sing, F, D and E collide on the last beat.]
   - He adds that the semiquavers in the melody seem arbitrary and against the nature of the chorale.
   - The data shows alto F4, tenor D4 and bass E3 on beat 4. The bass then steps down to D3. The soprano has semiquavers C5–D5 at the end of the bar.
   - Weber, p. 238 (leaf n369). Full view.

## Es ist das Heil uns kommen her — BWV 86/6 — No. 4

7. **Bar 3: the upper voices hold one harmony while the bass passes underneath.**
   - Weber: in his "Takt 3 und 7" (game bar 3, both times), the three upper voices carry "eine ganz andere Harmonie, als die dem Basse nach zu erwartende" [a quite different harmony from the one the bass leads you to expect].
   - He generalises: "daß Bach oft, um den Gang einzelner Stimmen zu erhalten, die Harmonie opferte" [that Bach often sacrificed the harmony to keep the course of individual voices].
   - The data shows an E-major chord (G♯4–E4–B3) held over the bass's passing F♯3 at beat 1½. At beat 2½ there is F♯4–D♯4–A3 over G♯3.
   - Weber, p. 238. Full view.

## An Wasserflüssen Babylon — BWV 267 — No. 5

8. **Bar 2: first cadence, and beat 1½.**
   - Weber: "Bei Bach fünf Schlußfälle in G, wovon der erste choralwidrig in der Terz schließt" [In Bach five cadences on G, the first of which, against chorale practice, closes on the third].
   - He adds that at bar 2, second quaver, the three upper voices outline a harmony "ganz fremde" [quite foreign] to the bass, as in No. 4.
   - The data confirms both. At the bar-2 fermata the soprano is on B4 over bass G3. At beat 1½ the soprano, alto and tenor (B4, G4, E4) form E minor over a held A3 in the bass.
   - Weber, p. 239 (leaf n370). Full view.
9. **Bars 8–9: tenor and bass collide.**
   - Weber (Takt 12–13): the passage "ist besonders mit unangenehmen Zusammentreffen des Tenors mit dem Basse überhäuft" [is especially loaded with unpleasant collisions of tenor and bass].
   - The data shows tenor and bass in unison on G3 (bar 8, beat 4) and on C4 (bar 9, beat 2). In between, the bass rises above the tenor: bass B3 against tenor G3 at bar 9, beat 1.
   - Weber's Takt 12–13 are game bars 8–9 (the 4-bar Stollen is repeated). Weber, p. 239. Full view.

## Christus, der ist mein Leben — BWV 281 — No. 6

10. **Bar 5, beat 2: alto semiquavers that cover parallel fifths.**
    - Weber: "In diesem übrigens sehr schön geschriebenen Choral sind Takt 5, zweites Viertel, im Alt zwei Sechszehntel eingeschaltet, die zwar die Fortschreitung zweier Quinten decken sollten" [In this otherwise very beautifully written chorale, two semiquavers are inserted in the alto in bar 5, second beat, which are meant to cover a progression of two fifths]. He adds that they disturb the alto's flow.
    - The data shows the alto moving G4 (over bass C3) → C5–B♭4 → A4 (over bass D3). Without the semiquavers, alto and bass would move in parallel fifths (G/C → A/D).
    - Weber also notes that Bach's cadences at bars 2 and 4 close with the melody on the third: A4 over F.
    - Weber, p. 240 (leaf n371). No repeat here, so Takt = game bar. Full view.

## Nun lob, mein Seel, den Herren — BWV 17/7 — No. 7

11. **Bar 4 and bar 13: a first cadence on the third, and a bare two-note beat.**
    - Weber: "Der erste Schlußfall bei Bach wieder in der Terz. Takt 21 das zweite Viertel nur zweistimmig." [Bach's first cadence again on the third. Bar 21, second beat, only two-part.]
    - The data shows soprano C♯5 over A at the bar-4 fermata. At bar 13, beat 2, only A and E sound: soprano A4, alto E4, tenor A3, bass E3.
    - Weber's Takt 21 is game bar 13 (the 8-bar Stollen is repeated). Weber, p. 239. Full view.
12. **Bars 23–24 and bar 35: crowded and crossing voices.**
    - Weber: "Takt 31—32 drängt sich Baß und Tenor, im Takt 43 windet sich der Diskant um den Alt." [In bars 31–32 bass and tenor crowd each other; in bar 43 the soprano winds around the alto.]
    - The data shows tenor and bass on the same note at the start of bar 23 (A3) and bar 24 (B3).
    - In bar 35 the soprano turns B4–A4–G♯4–A4–B4 around a held alto A4. Its G♯4 dips below the alto.
    - Weber's Takt 31–32 and 43 are game bars 23–24 and 35. Weber, p. 239. Full view.

## Freuet euch, ihr Christen alle — BWV 40/8 — No. 8

13. **Bars 2, 8, 14, 16, 20, and bar 19: repeated cadence chords and a voice exchange.**
    - Weber: "In den Takten 2, 8, 14, 16 und 20 hat Bach immer die letzten zwei Viertel in gleichen Akkorden anschlagen lassen" [In bars 2, 8, 14, 16 and 20 Bach always has the last two beats struck on the same chord]. He says this spreads a certain monotony; Vogler adds a dissonance each time.
    - He also says that in bar 19 the bass collides with the alto. His interlinear notation shows alto B♭–A♭ against bass A♭–B♭.
    - The data confirms both points.
      - In each of those bars, beats 3 and 4 repeat the same chord: F minor in bar 2, A♭ in bar 8, C in bar 14, A♭ in bar 16, F major in bar 20.
      - In bar 19, beat 4, the alto moves B♭4→A♭4 while the bass moves A♭3→B♭3.
    - No repeat here, so Takt = game bar. Weber, p. 240. Full view.
14. **Bars 3–4: a rare chord, and fifths excused by an anticipation.**
    - Prout gives this passage as his example (h) of a second inversion of the diminished triad on the leading note. He says this chord "is only very rarely to be found in four-part harmony."
    - He also notes "consecutive fifths between the treble and tenor" in the second bar. They are excused because the treble's A♭ is "an *anticipation* of a note of the next chord". At the end, the alto shows "Bach's partiality ... for taking the leading note down to the fifth of a chord in a cadence."
    - The data confirms the details.
      - At bar 3, beat 2½, soprano B♭4, alto G4 and tenor B♭3 sit over bass D♭3, so the triad G–B♭–D♭ has D♭ in the bass.
      - In bar 4, soprano and tenor move B♭4/E♭4 → A♭4/D♭4, which is the pair of fifths.
      - The alto falls G4 → E♭4 into the A♭ cadence.
    - Prout titles it "Dazu ist erschienen" (BWV 40). His extract is printed with four flats; the game's signature has three flats with the same pitches.
    - Prout §§160 and 163, pp. 69–70 (leaves n72–n73). Full view.

## Aus tiefer Not schrei ich zu dir — BWV 38/6 — No. 10

15. **Cadences in bars 3 and 5 (each heard twice).**
    - Weber: "Die vier Schlußfälle in E klingen einförmig." [The four cadences on E sound monotonous.]
    - The data shows E-major fermata chords at bars 3 and 5. With the repeated Stollen, that makes four cadences on E before the cadences on A and G.
    - Weber, p. 241 (leaf n372). Full view.

## Jesu, nun sei gepreiset — BWV 41/6 & 171/6 — No. 11

16. **Bar 2: the first cadence is on B♭ in a C-major chorale.**
    - Weber: "In der Tonart C begründet Bach gleich den ersten Schluß in B" [In the key of C, Bach makes the very first cadence on B♭]. He also complains of many clashing passing notes.
    - The data shows a B♭-major chord at the bar-2 fermata: soprano D5, alto B♭4, tenor F4, bass B♭3.
    - Weber, pp. 241–242 (leaves n372–n373). Full view.
    - *Not used:* Weber's bar references (Takt 17, 19, 38, 39) cannot be mapped. His cadence plan suggests 36 bars including the repeat, so Takt 38–39 do not exist in the game's version. His source evidently differed.

## Puer natus in Bethlehem — BWV 65/2 — No. 12

17. **Bars 4 and 7: two successive phrases cadence in C.**
    - Weber: "Wieder bei Bach zwei aufeinanderfolgende Abschnitte in C, die in diesem ohnedies kurzen Choral auffallend sind." [Again in Bach two consecutive phrases in C, which is conspicuous in this already short chorale.]
    - The data shows C-major fermata chords at bars 4 and 7 in this A-minor setting.
    - Weber notes that this chorale and No. 11 appear in the reverse order in the printed edition, so he discusses this one as his "Choral XI".
    - Weber, p. 241. Full view.

## O Ewigkeit, du Donnerwort — BWV 20/7 & 20/11 — No. 26

18. **Bars 3–4: a chain of seventh chords before the bar-4 cadence.**
    - Prout §496(a): "At (a) is seen the chord of the mediant seventh, with the seventh prepared, resolving on the submediant seventh."
    - He continues: the submediant seventh then resolves on the first inversion of the leading-note triad, "the root rising only a second instead of a fourth". His footnote treats the alto F as a suspension.
    - The data confirms the chords.
      - Bar 3, beat 3: A2–C4–G4–C5 is a mediant seventh in F, with the alto's G held over from beat 2.
      - Bar 3, beat 4: D3–A3–F4–C5 is the submediant seventh.
      - Bar 4: the alto's F4 resolves to E4 over bass G2, with B♭ above, forming E–G–B♭ (first inversion of the leading-note triad).
    - Prout, pp. 217–218 (leaves n220–n221). Full view.
    - (No. 26 is also in round 1, where Pirro discusses bar 7. This is a different passage.)

## Gelobet seist du, Jesu Christ — BWV 91/6 — No. 51

19. **Bar 8, beat 3½: a leading-note triad standing in for the dominant seventh.**
    - Prout §208(c): "At (c) is a rarer use, the generator being omitted, and the chord ... appearing as the diminished triad on the leading note". Here "the third above the bass is the note doubled."
    - The data shows soprano A4, alto A4, tenor C4 and bass F♯3 in bar 8, beat 3½. That is F♯–A–C, with A doubled, before the half-close on D in bar 9.
    - Prout, p. 93 (leaf n96). Full view.
    - **Doubt:** Prout labels the extract "Siehe welch' eine Liebe" (BWV 64). His notes match game No. 51 (BWV 91/6) note for note in the soprano and bass of bar 8. They do *not* match game No. 160 (BWV 64/2), the setting of the same stanza in Cantata 64. Either Prout mislabelled the extract or the attributions differ between editions. This should be checked against the BG scores before use.

## O Gott, du frommer Gott ("Gib, dass ich tu mit Fleiß") — BWV 45/7 — No. 85

20. **Bar 1, beat 2½: the soprano anticipates the alto's note.**
    - Prout §264 gives this as a rare case of a note anticipated in one voice and then taken by another: "At (a) the E of the alto is anticipated in the treble".
    - The data shows the soprano running G♯4–F♯4–E4. Its quaver E4 at beat 2½ is the note the alto moves to (D♯4→E4) on beat 3. The soprano then leaps up to B4.
    - Prout titles it "Es ist dir gesagt" (BWV 45). The example is on p. 119 and the explanation at the top of p. 120 (leaves n122–n123). Full view.

## Werde munter, mein Gemüte ("Bin ich gleich von dir gewichen") — BWV 55/5 — No. 95

21. **Bar 1, beat 4, and bar 3, beats 3–4: two seventh chords, one with a decorated resolution.**
    - Prout §496(c) titles this extract "Ich armer Mensch, ich Sündenknecht" (BWV 55). He writes: "The chord ✱ at the end of the first bar of (c) is a parallel case to the second at (a)", meaning a submediant seventh.
    - Then: "in the third bar of this passage is a mediant seventh with an ornamental resolution". The seventh goes to the fifth of the chord before the harmony changes, and the chord resolves "on the first inversion of a subdominant triad".
    - The data confirms both.
      - Bar 1, beat 4: G3–D4–B♭4–F5, the submediant seventh in B♭.
      - Bar 3, beat 3: D3–C4–F4–F5, a mediant seventh. The tenor's seventh C4 moves to A3 at beat 3½. At beat 4 the chord is G3–B♭3–G4–E♭5, which is E♭ major in first inversion.
    - Prout, p. 218 (leaf n221). Full view.

## Herzliebster Jesu ("Ach großer König") — BWV 245/17 — No. 111

22. **Bars 10–11: a leading-note triad, then a Picardy-third ending.**
    - Prout §208(d) quotes the last two bars. At the starred chord (bar 10, beat 1½: G♯3–B3–B4–D5) the chord appears without its root, as the triad on the leading note, with "the third above the bass ... doubled".
    - "Example (d) is further interesting as containing in its last chord a good example of the 'Tierce de Picardie'". It also illustrates "Bach's partiality ... to making the leading note, when in a middle voice, fall to the fifth of the final chord".
    - The data confirms this. The final chord at bar 11 is A major, with alto C♯4 in an A-minor setting. The tenor's G♯3 (leading note) at the end of bar 10 falls to E3, the fifth of the final chord.
    - Prout titles it "Johannes Passion". p. 93 (leaf n96). Full view.
    - (No. 111 is also in round 1, where Schweitzer discusses its bass. This is a different observation.)

## Christus, der uns selig macht ("O hilf, Christe, Gottes Sohn") — BWV 245/37 — No. 113

23. **Bars 3–4: a minor ninth on the tonic.**
    - Prout §338: "We add one example of a tonic minor ninth, also in the first inversion." Then: "The key of this passage is unquestionably B flat minor." The D♭ that comes back in the next bar contradicts the D♮, which rules out a modulation to E♭ minor.
    - The data confirms this.
      - Bar 3, beat 3: bass D3, tenor C♭4, alto A♭4, soprano F5. That is D–F–A♭–C♭, the B♭ minor ninth without its root, in first inversion.
      - On beat 4 the tenor's C♭ resolves to B♭3 over the same D3.
      - In bar 4 the soprano has D♭5 over B♭2.
    - The game file labels the mode "F dorian" with three flats; the pitches are the same as Prout's.
    - Prout, p. 152 (leaf n155). Full view.

## O Welt, ich muss dich lassen ("Ich bin's, ich sollte büßen") — BWV 244/10 — No. 117 (titled "Nun ruhen alle Wälder" in the game)

24. **Bar 10: a suspended ninth over F minor.**
    - Prout §510: "Here the G in the last bar of the alto is a ninth suspended over the root position of the chord of F minor."
    - At the moment of resolution the bass moves to A♭. The suspension therefore resolves onto the first inversion of the same chord, and the bass's other notes are passing notes.
    - The data confirms this. The alto's G4 is held over bass F3 (with A♭4 and C4 above) at bar 10, beat 1, and resolves to F4 at beat 2 as the bass reaches A♭3. The phrase ends on a C-major chord (alto E♮4) at the bar-10 fermata.
    - **Small discrepancy:** Prout's text says "G and B in the bass are passing notes". The game's bass has G3 and **B♭**3.
    - Prout, p. 224 (leaf n227). Full view.

## Ist Gott mein Schild und Helfersmann — BWV 85/6 — No. 122

25. **Bar 13, beat 4½, to the end: a major sixth in the minor key, then a Picardy third.**
    - Prout §186(b): "At (b) is the first inversion of a minor common chord (with the major sixth of the scale) on the supertonic." The last chord illustrates the Tierce de Picardie (§193).
    - He warns: "These examples are given because of their historical importance, and are not intended for the imitation of the student."
    - The data confirms this. At bar 13, beat 4½, soprano A♮4, alto F4 and tenor D4 sit over bass F3. That is D–F–A♮ with F in the bass, in a C-minor setting. The final chord at bar 14 is C major, with tenor E♮4.
    - Prout titles it Cantata "Ich bin ein guter Hirt" (BWV 85). p. 81 (leaf n84). Full view.

## Gott der Vater wohn uns bei — BWV 317 — No. 135

26. **Bars 10–12: a chain of suspensions in the alto.**
    - Prout §527(a): "The first of these extracts is very rich in suspensions". He figures them 7 6, 9 8, 7 6, 5 6, 9 8.
    - Of the starred chord he writes: "This at first sight looks like the triad on the mediant ... The C is therefore the suspension of the following D". The preceding chord is a second inversion of the dominant seventh, which never resolves on a mediant chord.
    - The data confirms this.
      - The alto ties E4 (over D3) → D4, then D4 (over E3) → C♯4.
      - At bar 11, beat 3, the alto holds C♯4 over F♯3 with A4 above. This looks like F♯–A–C♯, but the C♯ rises to D4 at beat 3½.
      - The chord before it (bar 11, beat 2½) is G3–C♯4–G4 over E3: A7 with E in the bass.
    - Prout, p. 230 (leaf n233). Full view.

## Ach Gott, wie manches Herzeleid — BWV 3/6 — Nos. 156 and 308 (the same setting appears twice in the collection)

27. **Bar 8: a chromatic supertonic seventh that resolves unusually.**
    - Prout §304(c) calls this "an unusual resolution". Normally the rising third of a supertonic chord goes to the tonic chord, but "here, however, it is to the root position of the dominant seventh".
    - The tenor's C♯ is a passing note. The D♮ on beat 2 makes no false relation with the D♯ on beat 1, because the D♯ belongs to a chromatic chord of the key.
    - The data confirms this.
      - Bar 8, beat 1: bass D♯3, tenor B3, alto F♯4, soprano A4. That is B–D♯–F♯–A, the chromatic supertonic seventh in first inversion.
      - Beat 2: bass E3, tenor D♮4, alto E4, soprano G♯4, which is E7.
      - The cadence on A follows.
    - Prout, pp. 137–138 (leaves n140–n141). Full view.

## Wachet auf, ruft uns die Stimme — BWV 140/7 — No. 179

28. **Bar 14, beats 1–3: the dominant's root suspended from a tone below.**
    - Prout §528: "Here the root of the dominant chord, G, is suspended by a note a tone, instead of a semitone, below it." The F of the alto rises to G.
    - The data shows the bass rising A♮3–B♮3–C4 under soprano C5–D5–E♭5. At beat 2 the alto's F4 sits in a B–D–F chord and rises to G4 at beat 2½. The phrase cadences on C at the beat-3 fermata.
    - Prout prints the extract in minims; the game has it in crotchets.
    - Prout, p. 230 (leaf n233). Full view.
    - (No. 179 is also in round 1, where Whittaker comments on the whole setting.)

## Ach lieben Christen, seid getrost — BWV 114/7 — No. 301

29. **Bar 3, beats 1½–2½: a supertonic eleventh between a dominant ninth and the leading-note triad.**
    - Prout §393 says "The chord of the eleventh on the supertonic is even rarer than that on the tonic", and gives this Bach passage as example (c).
    - §395: "In example (c) the form of the chord is the same as at (a); but it is here preceded by a dominant ninth". It is resolved on "the root position of the diminished triad on the leading note".
    - The data confirms this.
      - Beat 1½: D3–E♭4–C5–A4, with F♯3 in the tenor just before. This is D–F♯–A–C–E♭, the dominant minor ninth of G minor.
      - Beat 2: E3–D4–B♭4–G4, the starred chord.
      - Beat 2½: F♯3–C4–A4–A4, the leading-note triad in root position.
    - Prout, pp. 175–176 (leaves n178–n179). Full view.

---

## General statements usable as framing

- Weber, on why the two harmonisations are worth comparing: comparing them "für das Harmoniestudium sehr interessante Ausbeute versprach" [promised a very interesting yield for the study of harmony]. Weber, p. 229.
- Weber's general charge, quoted above under No. 4: Bach "oft, um den Gang einzelner Stimmen zu erhalten, die Harmonie opferte" [often sacrificed the harmony to keep the course of individual voices]. Weber, p. 238. This is a useful counterpoint to Schweitzer's "Bach harmonised the words" (round 1). Weber hears the lines winning; Schweitzer hears the text winning.
- Prout on the old masters: these examples "show that even in the last century the old law as to the preparation and progression of these chords was often disregarded". Prout §497, p. 218.

## Sources tried, not usable

- **Terry, *Bach's Chorals*, Part I (1915).**
  - The University of Toronto copy (`bachschorals01terruoft`) still returns HTTP 500 for its text.
  - The Cornell copy (`cu31924022453264`) now downloads and is full view. I read its text and searched it for comments on harmony. It is purely hymnological (sources of text and melody, stanza numbers), with no comment on harmony or word-painting. Not used.
- **Terry, *Bach: The Passions* (1926) and *Bach: The Cantatas and Oratorios* (1925), Musical Pilgrim series.**
  - The only archive.org copy is the 1972 Johnson reprint of all three volumes (`bachcantatasorat0000terr`), which is access-restricted (lending library).
  - HathiTrust's reading pages (babel.hathitrust.org) are blocked behind a Cloudflare challenge (HTTP 403) from this environment, and so is its catalogue search; only the volume API answers. I could not read any HathiTrust volume.
  - Not read.
- **Schweitzer, *J.-S. Bach, le musicien-poète* (1905).** The archive.org item `jsbachlemusicie00schw` exists, but its text file returned HTTP 500 on two attempts. Not read.
- **Schweitzer, German edition *J. S. Bach* (1908, `jsbach01schwgoog`, full view).**
  - Read and searched. Its passages on four-part chorales (pp. 426–430) are the original of the English vol. II pp. 30–34 already used in round 1.
  - Elsewhere it discusses organ chorales, orchestrally accompanied closing chorales (BWV 15, 167, 13) and performance practice, but not specific four-part settings. Nothing new to add.
- **Ernst Kurth, *Grundlagen des linearen Kontrapunkts* (1917, `grundlagendesli00kurt`, full view).** I searched the text. It mentions Bach's chorales only in passing, with no analysis of a specific harmonisation. Not used.
- **Riemenschneider, *371 Harmonized Chorales* (Schirmer, 1941).** archive.org `bachriemenschnei0000bach` is access-restricted. Not read.
- **Other Prout examples that are not in the game.**
  - "Herr Gott, dich loben alle wir" (p. 118, an auxiliary note a diminished octave from the harmony note): does not match game No. 164 (BWV 326).
  - "Was Gott thut" (p. 120, auxiliary notes leaping a fourth or a diminished fifth): does not match Nos. 65, 293 or 347.
  - "Johannes Passion" (p. 218, example (b), an unprepared supertonic seventh): does not match any setting from BWV 245 in the game.
  - "Komm, Gott, Schöpfer" (p. 69, a dominant 6/4): printed in D in minims; not matched to No. 187.
  - These are probably cantata settings outside the 371, or versions that differ.
- **Prout, *Counterpoint: Strict and Free* (1890, `cu31924021789650`)** and **Goetschius's textbooks** (full view on archive.org) were found but not worked through for lack of time. They are worth a third round. Goetschius in particular cites "Bach Chorals" by number.
- **Open-access modern work.**
  - A web search for Music Theory Online articles on text painting in specific chorales found nothing usable.
  - A 2019 *Zeitschrift der Gesellschaft für Musiktheorie* article on Bach's chorale harmonisation and clausulae (via DOAJ) returned HTTP 403 to this tool. Not read.
- **Hugo Riemann** and **Hubert Parry's other writings** were not searched in this round.
