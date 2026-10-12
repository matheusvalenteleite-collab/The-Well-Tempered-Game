# Sourced commentary on Bach's four-part chorales, for a listening guide

Compiled 2026-10-11. I read every source below in full view on archive.org during this session, using the OCR full text and, for Pirro's music examples, the page images. Nothing comes from memory except where a note says so and marks it as needing verification.

## Conventions

- **No.** is the number in the game's own collection, `data/chorales/bach/chorales/bach_NNN.json`. That collection follows the Breitkopf/Dörffel *371 vierstimmige Choralgesänge* and is effectively the Riemenschneider numbering. I checked each number against the BWV field in those files and against Wikipedia's *List of chorale harmonisations by J. S. Bach*.
  - Watch for older references. Spitta cites the original C. P. E. Bach print of 1784–87, and Whittaker cites a Breitkopf "371" reprint. Their numbers usually match the game's, but they sometimes differ by one. Example: Spitta's "No. 33 of 1784" is game No. 34, and Whittaker's "[C.P.E.B.] 86" is BWV 56/5, which is game No. 87.
- **Bars** use the measure numbers in the game's JSON (a pickup bar is bar 0).
  - I checked each pitch claim against that data (for example "chromatic bass", "four F sharps", "ends on the dominant").
  - Where a note ties a source's words to a bar, the tie is my reading of the source together with the score data. The source does not give a bar number in this edition unless the note says it does.
  - **Repeats:** In AAB (bar-form) chorales the opening bars are sung twice. So a line of the second Stollen (lines 4–6 in a 6+ line hymn) falls in the same bars as lines 1–3, on the repeat.
- **Quotations** are exact as printed, apart from OCR clean-up. French quotations from Pirro are followed by my own translation.
- **Pages** are taken from the running heads in the scans. Whittaker's page numbers sit at the foot of the page, so where a passage crosses a page I give a range.

## Sources used (all full view, public domain)

| Short name | Full citation | URL |
|---|---|---|
| Schweitzer II | Albert Schweitzer, *J. S. Bach*, Eng. tr. Ernest Newman, vol. II (Leipzig/London: Breitkopf & Härtel, 1911) | https://archive.org/details/jsbach0002schw |
| Spitta II / III | Philipp Spitta, *Johann Sebastian Bach: His Work and Influence on the Music of Germany, 1685–1750*, tr. Clara Bell and J. A. Fuller-Maitland, vol. II (London: Novello, Ewer & Co., 1884); vol. III (1885) | https://archive.org/details/johannsebastia02spit ; https://archive.org/details/johannsebastian03spit |
| Parry | C. Hubert H. Parry, *Johann Sebastian Bach: The Story of the Development of a Great Personality* (New York and London: G. P. Putnam's Sons, 1909) | https://archive.org/details/johannsebastianb00parruoft |
| Whittaker | W. G. Whittaker, *Fugitive Notes on Certain Cantatas and the Motets of J. S. Bach* (London: Oxford University Press / Humphrey Milford, 1924) | https://archive.org/details/bwb_KR-555-468 |
| Pirro | André Pirro, *L'esthétique de Jean-Sébastien Bach* (Paris: Librairie Fischbacher, 1907) | https://archive.org/details/lesthtiquedeje00pirr (pp. 136–138 = scan leaves n145–n147) |
| Terry II | Charles Sanford Terry, *Bach's Chorals, Part II: The Hymns and Hymn Melodies of the Cantatas and Motetts* (Cambridge University Press, 1917) | https://archive.org/details/bachschorals02terr |

---

## Es ist genug — BWV 60/5 — No. 216

1. **Last line, "Mein großer Jammer bleibt danieden" (bars 15–17).**
   - Pirro quotes this passage as a music example. It is an instance where the descending chromatic theme, "évoqué par des mots de sens douloureux, détermine une succession harmonique audacieuse, pleine de surprises" ("called up by words of painful meaning, produces a bold harmonic succession, full of surprises").
   - The game data confirms the bass sliding down by semitones: A–G♯–G–F♯–F–E–D♯ in bars 15–16.
   - Pirro, p. 137 (text) and p. 138 (example B, footnote: "O Ewigkeit, du Donnerwort (2e version, B. G. 60, XII², p. 190)").
2. **The line before it, "Ich fahre sicher hin mit Frieden" (bars 12–14).**
   - By contrast, the words "partir en paix" are glossed "par un motif uni et doucement animé de la basse" ("by a smooth, gently moving figure in the bass").
   - The data shows steady stepwise quavers in the bass in bars 12–13.
   - Pirro, p. 138.
3. *Background only.* Terry identifies the tune as Johann Rudolph Ahle's melody (1662) to Burmeister's hymn and the words as its fifth stanza. Terry, Part II, pp. 253–254. Terry makes no comment on the harmony.

## O Ewigkeit, du Donnerwort — BWV 20/7 and 20/11 — No. 26

4. **"Dann wird sich enden diese Pein" (bars 7–8).**
   - Pirro gives this as example A. It shows a threatening text ("this torment will end only when God ceases to be eternal") accompanied by an altered, Schütz-like dissonant chord.
   - He adds that "le trouble harmonique, dans ces derniers exemples, est causé par la présence, à la basse, des motifs chromatiques" ("the harmonic disturbance in these examples comes from chromatic figures in the bass").
   - The data shows the bass descending chromatically: E–E♭–D–C♯ in bar 7.
   - Pirro, p. 137 (footnote: B. G. 20, II, p. 317).

## Schwing dich auf zu deinem Gott — BWV 40/6 — No. 142

5. **"Was erneu'rst du deinen Stich?" (bars 5–6).**
   - This is the line addressed to "the old serpent". Pirro's example B shows the same altered chord returning here, again over a chromatic bass.
   - The data shows the bass rising by semitones: F–F♯–G–G♯–A–B♭–A–G♯ in bars 5–6.
   - Pirro, p. 137 (footnote: Cantate *Dazu ist erschienen der Sohn Gottes*, B. G. 40, VII, p. 387).

## Wir Christenleut ("Die Sünd macht Leid") — BWV 40/3 — No. 321

6. **Opening words, "Die Sünd macht Leid" (bars 0–1).**
   - Pirro gives this among his examples of how, in Bach's chorale harmonisations, "les paroles de l'affliction y reçoivent la parure sombre des sonorités douteuses ou mordantes" ("words of affliction are clothed in the dark finery of doubtful or biting sonorities").
   - He also says that harmonisations of chorales are where one can best study what Bach meant by dissonant chords.
   - Pirro, p. 136 (example labelled "Die Sünd' macht Leid", footnote: B. G. 40, VII, p. 377).

## Herzliebster Jesu ("Wie wunderbarlich ist doch diese Strafe") — BWV 244/46 (St Matthew) — No. 105

7. **The word "Strafe" at the first fermata (bar 3).**
   - This is one of Pirro's examples of dark or dissonant harmony on a word of affliction.
   - Pirro, p. 136 (example "Stra-fe", footnote: *Matthäus-Passion*, B. G. IV, p. 102).
   - I made the identification with No. 105 from the BG page, the key signature and the fact that "Strafe" ends line 1 of this verse.

## Herzliebster Jesu ("Ach großer König") — BWV 245/17 (St John) — No. 111

8. **The bass throughout (bars 1–10).**
   - Schweitzer, contrasting this setting with other harmonisations of the melody, writes: "The quaver sequence in the bass, which is inexplicable from the standpoint of pure music, is the triumphal chariot that carries it."
   - He also writes, of Bach's chorales generally: "every line, every word is painted".
   - Schweitzer II, pp. 31–32.
   - **Caution:** Schweitzer places this verse in the *St Matthew* Passion. The verse "Ach großer König, groß zu allen Zeiten" is in fact sung in the *St John* Passion. That identification is my own knowledge and should be checked against a libretto. The game data agrees with his description: the bass of No. 111 moves in almost continuous quavers.

## Wer hat dich so geschlagen — BWV 245/11 (St John) — No. 63

9. **The word "Plagen" (end of the line at the bar-4 fermata).**
   - Pirro's example "Pla-gen" is another case of affliction words given "sonorités douteuses ou mordantes".
   - The data has the bass rising chromatically, B–B♯–C♯, under that cadence. Bar 2 ("geschlagen") similarly has E♯ in the bass.
   - Pirro, p. 136 (footnote: *Johannes-Passion*, B. G. XII¹, p. 31). I made the identification from the BG page, the key and the text.

## Befiehl du deine Wege — BWV 244/44 (St Matthew) — No. 80

10. **"Der Wolken, Luft und Winden gibt Wege, Lauf und Bahn" (lines 5–6, the start of the Abgesang, bars 5–8; walking quavers in the bass in bar 7).**
    - Pirro: in this chorale Bach makes "à la partie de basse, une allusion discrète" (a discreet allusion in the bass) to the words about the one who gives the clouds and winds their paths. He uses figures like those he elsewhere uses for walking or following a road.
    - Pirro, p. 138 (footnote: B. G. IV, p. 186).
    - The data shows that the Stollen (bars 1–4, sung twice) carries lines 1–4, so lines 5–6 fall in bars 5–8. The bass in bar 7 runs in stepwise quavers, G–F♯–E–D♯–E–F♯–G–A. Pirro does not give a bar number.
11. **Placement and choice of text.**
    - Spitta argues that setting Gerhardt's gentle "Befiehl du deine Wege" at the moment Jesus silently accepts Pilate's verdict is "one of the few passages in this incomparable work to which perhaps exception might be taken".
    - He suggests Bach chiefly wanted to bring the melody back here.
    - Spitta II, p. 549.

## O Haupt voll Blut und Wunden ("Wenn ich einmal soll scheiden") — BWV 244/62 (St Matthew) — No. 89

12. **The whole setting, especially the final cadence (bars 11–12).**
    - This is the last chorale of the Passion, sung after Jesus' death. Spitta: "Bach has chosen for it a particularly low pitch". Elsewhere Bach treats the mode as Ionian, but here he "worked out the solemn and twilight effects of the Phrygian".
    - Spitta calls this climax "one of the most thrilling of the whole work".
    - Spitta II, p. 550.
    - The data confirms a Phrygian-type close: the final chord is F♯ with F♯ in the bass, in a B-minor signature.
    - *Caution:* the game's key may differ from the Passion's key, so "low pitch" refers to the Passion.

## O Haupt voll Blut und Wunden ("Wie soll ich dich empfangen") — BWV 248/5 (Christmas Oratorio) — No. 345

13. **Mode of the whole harmonisation, heard at the final cadence on E (bar 12).**
    - Spitta: "The melody of 'O Haupt voll Blut und Wunden' is harmonised by Bach in the Phrygian mode, thus excluding all doubt as to his purpose in introducing it."
    - In other words, the Passion melody sounds within the Advent and Christmas text. Spitta relates this to "the character of fervent humility" that the modal treatment gives.
    - Spitta II, p. 583.
    - The data confirms an A-minor signature with a final chord on E.

## Warum sollt ich mich denn grämen ("Ich will dich mit Fleiß bewahren") — BWV 248/33 — No. 139

14. **Modal colour, for example the F naturals in G major (bass A♭/G in bar 2, tenor F in bar 3, bass F in bar 8).**
    - Spitta: Mixolydian chords are "strongly stamped" on this chorale, and the melody is "somewhat modified by Bach".
    - He groups it with No. 345 as gaining "fervent humility" from the modal treatment.
    - Spitta II, p. 583.

## Wir Christenleut ("Seid froh dieweil") — BWV 248/35 — No. 360

15. **Last line (bars 9–11).**
    - Parry: "a singularly fine chorale, the last line of which is almost unique even among Bach's examples for the extraordinary scope of its progressions".
    - The data shows the bass climbing through D–G–G♯–A–A♯–B–B♯–C♯.
    - Parry, p. 363.
    - *Doubt:* Parry names no title. He describes the chorale that "completes the music" of Part III, which is No. 35 in the score, but this identification is mine.

## Komm, Gott Schöpfer, heiliger Geist — BWV 370 — No. 187

16. **Whole setting.**
    - Spitta: "When it seemed suitable he would arrange a chorale strictly in accordance with the rules of its mode; for example, in the Mixolydian melody 'Komm, Gott Schöpfer, heiliger Geist.'"
    - His footnote identifies it as "the chorales published 1785, No. 187".
    - Spitta III, p. 132. The game file marks this chorale as G Mixolydian.

## Nun preiset alle Gottes Barmherzigkeit — BWV 391 — No. 222

17. **Whole setting.**
    - Spitta lists this as a Mixolydian chorale harmonised in the "mixed" style. Kittel's term means Bach gives more or less prominence to the modulations characteristic of the mode.
    - His footnote cites "No. 222 in the chorales of 1786".
    - Spitta III, p. 132.

## Erbarm dich mein, o Herre Gott — BWV 305 — No. 34

18. **Whole setting.**
    - Spitta gives this as an example of a Phrygian chorale treated in the "mixed" style. His footnote reads "No. 33 in the chorales of 1784", which is game No. 34.
    - Spitta III, p. 132. The game file marks it as E Phrygian.
    - Spitta also says (p. 133) that Bach harmonised "O Haupt voll Blut und Wunden" "now in the Ionian, now in the Phrygian mode". For a comparison, see Nos. 80, 89 and 345.

## Ach Gott und Herr ("So soll's ja so sein, dass Straf und Pein") — BWV 48/3 — No. 279

19. **Second half (bars 6–10), with A♭, D♭ and G♭ in a B♭ setting and a chromatic rising bass in bar 9.**
    - Schweitzer uses this harmonisation as his showpiece of Bach following the words rather than "pure music". He says it "as pure music is indeed intolerable, Bach's purpose being to express all the wild grief for sin that is suggested in the words."
    - Schweitzer II, p. 31.
    - The tie to specific bars is mine. Schweitzer refers to the setting as a whole.

## Jesu, meine Freude — BWV 227/1 and /11 (motet) — No. 263

20. **First and last verses.**
    - Spitta says they are set "simplici stilo" and that "the harmony being the same for both verses". So the motet begins and ends with the same plain harmonisation.
    - Spitta II, p. 600.
    - Whittaker: the longing and sadness of the opening and closing lines "are set to the plain four parts, simplicity ... being clearly the object of the composer".
    - Whittaker, pp. 204–205.

## Jesu, meine Freude ("Weg mit allen Schätzen") — BWV 227/7 — No. 283

21. **Overall.**
    - Whittaker describes this verse as a "version in four parts, lower voices intensifying the meaning of the words".
    - He notes the repeated opening word of lines 1 and 3 ("Weg mit allen Schätzen — Weg, ihr eitlen Ehren").
    - Whittaker, pp. 204, 213.
22. **"Elend, Not, Kreuz, Schmach und Tod" (bar 7).**
    - Whittaker asks for each group in the lower voices on "Elend, Noth, Kreuz" to be sung in a particular way. He links these to "the little two-note figure so beloved by Johann Sebastian".
    - Whittaker, pp. 214–215.
    - The data shows paired repeated quavers in tenor and bass in bar 7.
    - Whittaker also mentions the figure "at the thirteenth bar" of the motet movement. **I did not map that bar onto the game's numbering.**

## Ach Gott, vom Himmel sieh darein — BWV 2/6 — No. 262

23. **Whole setting.**
    - "The lovely harmonies of the concluding chorale are a never-ending delight. They create an atmosphere widely different from that of the first chorus".
    - Whittaker, p. 40.

## Ach Gott, vom Himmel sieh darein (same melody) — BWV 77/6 — No. 253

24. **Final bar (bar 17).**
    - Whittaker: "an exceedingly fine harmonisation, with a surprising final bar."
    - Whittaker, p. 33. He gives it as "[E.] II, No. 155" and "[C.P.E.B.] 253".
    - The data shows why: the setting stops on a D-major chord, the dominant of G minor, instead of returning to G.

## Christ lag in Todesbanden — BWV 278 — No. 371

25. **Overall, and the final bar (bar 12).**
    - Whittaker: "The latter contains exceptionally bold part-writing, and concludes with this bar". He quotes the last bar.
    - Whittaker, p. 132.

## Christ lag in Todesbanden ("Hier ist das rechte Osterlamm") — BWV 158/4 (≈ BWV 279) — No. 261

26. **Tenor at the end of bar 1 into bar 2.**
    - Whittaker: "a four-fold F sharp in the upper part of the register of the tenor voice is clearly the interpretation of the line 'Das ist hoch an des Kreuzes Stamm' ('High on the Cross')".
    - Whittaker, pp. 132–133.
    - The data confirms F♯4 ×4 in the tenor in bars 1–2. That line is line 3 of the verse, so it falls on the **repeat** of bars 1–2.

## Christ lag in Todesbanden ("Wir essen und leben wohl") — BWV 4/8 — No. 184

27. **Whole setting.**
    - The last verse is "set in simple chorale style". Whittaker contrasts this with modern variation sets that end with an extended coda: "Bach is content to end with the plain tune."
    - Whittaker, p. 145.

## Wachet auf, ruft uns die Stimme ("Gloria sei dir gesungen") — BWV 140/7 — No. 179

28. **Whole setting.**
    - Whittaker: "The cantata ends with the chorale in its unadorned form, harmonised in a simple and direct way quite unusual with Bach".
    - He adds that "no more imposing finish can be conceived".
    - Whittaker, p. 63.

## Du, o schönes Weltgebäude ("Komm, o Tod, du Schlafes Bruder") — BWV 56/5 — No. 87

29. **Whole setting.**
    - "Quietly and reverently the cantata closes with a soft, tenderly harmonised four-part chorale, in which Death is likened to the Brother of Sleep, who guides the ship to the last haven."
    - Whittaker, p. 128. He gives it as "[C.P.E.B.] 86", but in the game it is **No. 87**.

## Straf mich nicht in deinem Zorn ("Mache dich, mein Geist, bereit") — BWV 115/6 — No. 38

30. **Bass line (bars 1, 3 and 9 especially).**
    - The setting is "harmonised quite simply", but Bach "only permits himself one point of technical development, the varied and persistent use of a little four-note figure which opens the bass line."
    - Whittaker, pp. 157–158.
    - The data confirms the recurring four-quaver bass groups, for example E♭–D–C–E♭ and A♭–G–F–A♭.

## Komm, heiliger Geist, Herre Gott ("Du heilige Brunst") — BWV 226 (motet) — No. 69

31. **The pauses after each phrase (rests after the fermatas in bars 3, 8, 11, 18).**
    - Parry: the final chorale "is peculiarly untender". Its tune is made up of very short phrases. "Each little phrase comes to represent a short ejaculation with a pause of reflection after it".
    - Parry, p. 286. Whittaker quotes the same passage on p. 229.
    - *Doubt:* Parry names the tune "Lass' freudiger Geist", which seems to be an error. Whittaker, quoting him, notes that the BG gives "Komm, heiliger Geist, Herre Gott".
    - Whittaker also notes that the chorale is not in Bach's original score: there is only "Choral sequitur" in his hand. Its connection to the motet is therefore partly editorial.

---

## General statements usable as framing (not tied to a single chorale)

- Schweitzer: "Eccard, Praetorius and others, harmonised the melody; Bach harmonised the words." He also writes "in Bach's chorales every line, every word is painted, and thrown into a kind of embossed relief." (Schweitzer II, pp. 30, 32.)
- Pirro: accompaniment is the only means Bach has to comment on the text of a chorale "revêtus déjà d'une mélodie presque invariable" ("already clothed in an almost unchangeable melody"). (Pirro, p. 136.)
- Spitta: Bach used the church modes "as a kind of subsidiary keys". (Spitta III, p. 131.)

## Sources tried, not usable

- **Terry, *Bach's Chorals* Part I** (Cambridge, 1915). The archive.org text download (`bachschorals01terruoft`, and the Cornell copies `cu31924022453264`/`…272`) returned server error 500 every time I tried. Not read.
- **Terry, *Bach's Chorals* Part II** (1917, full view). Readable but purely hymnological: tune and text sources, and stanza numbers. It has no comments on harmony or word-painting, so I used it only for background on *Es ist genug*.
- **Terry, *Bach's Chorals* Part III** (1921, full view). Covers the organ chorales, not the four-part settings, so it is out of scope.
- **Whittaker, *The Cantatas of J. S. Bach* (1959).** archive.org lending library only (access-restricted). Not used.
- **Bach-Cantatas.com, BWV 60 discussion pages.** These paraphrase Alfred Dürr on the whole-tone opening of *Es ist genug*. I could not read Dürr's original in full view, so I did not use them.
- **Searches for open-access modern analyses** (Music Theory Online, dissertations) of text painting in specific four-part chorales found nothing usable. The hits were pedagogical or computational: harmonisation models, and a 2024 dissertation on the chorale in American music theory.
- **Pirro, *L'esthétique*, other examples that are not in the 371.** These include "und trägest Schmerz" (BWV 138), "bitterness" in the St John Passion (B. G. XII¹, p. 121) and the St Matthew interjection "Was ist die Ursach" (also in Schweitzer). None maps to a game chorale, so I left them out.
- **Schweitzer on the *Te Deum* ("Herr Gott, dich loben wir").** The bar-by-bar comments (II, pp. 33–34) refer to an organ accompaniment, not a four-part chorale, so I left them out.
