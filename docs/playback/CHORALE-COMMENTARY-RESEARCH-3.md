# Sourced commentary on Bach's four-part chorales, round 3

Compiled 2026-10-12. This follows `chorale-commentary.md` (round 1) and `chorale-commentary-2.md` (round 2). It does not reuse their sources: Pirro 1907, Spitta (Eng.), Schweitzer (Eng./Ger.), Whittaker 1924, Parry 1909, Weber 1810, and Prout's *Harmony*.

I read every source used here in full view on archive.org during this session. For each one I read the OCR text and checked it against the page images. I read every music example from the page image and matched it against `data/chorales/study.json`, note by note in the soprano and bass and as far as legible in the inner voices. Nothing here comes from memory.

## Conventions

These are the same as in round 2.

- **n** is the game number in `data/chorales/study.json`. I checked each one against that file's `bwv` and `title` fields.
  - The study file sometimes titles a chorale by its tune rather than by its stanza. For example, No. 341 (BWV 37/6) is titled "Ich dank dir, lieber Herre", and No. 265 (BWV 144/6) is titled "Was mein Gott will".
- **Bars** follow the game's numbering. Bar 0 is the pickup bar where there is one; otherwise bars count from 1. "Beat 2½" means the second quaver of beat 2.
- **Checking pitch claims.** Every pitch claim was checked with a script (`r3/verify.py`), which prints the sounding SATB notes at a given bar and beat. It ran 63 checks; the only mismatches were my own typing slips while drafting, corrected below.
  - "The data shows" describes the game's notes, not the source's example.
  - The game data has no ties: a held note may appear as a repeated note.
- **No bar numbers in the sources.** None of the sources gives bar numbers. I identified each extract by matching it against the game data, and the bar given is the game bar.
  - Prout and the others often print an extract in a different key signature from the game's file, or quote it from a different movement title. Where this matters, the note says so.
- **Quotations** are exact as printed, apart from OCR clean-up, and under 30 words. Longer passages are paraphrased.
- **Full view** means the item is public domain and readable without login on archive.org. Every source used here is full view.

## Sources used (all full view, public domain)

| Short name | Full citation | URL and page-to-leaf mapping |
|---|---|---|
| Prout *Cpt* | Ebenezer Prout, *Counterpoint: Strict and Free*, 3rd edition (London: Augener & Co., [1890]), Augener's Edition No. 9185 | https://archive.org/details/cu31924021789650. Page p is at leaf n(p+3): p. 204 = `/page/n207`, p. 222 = `/page/n225`. |
| Prout *Form* | Ebenezer Prout, *Musical Form* (London: Augener, first published 1893; this copy is the "Eighth impression", n.d.), Augener's Edition No. 9187 | https://archive.org/details/cu31924022495513. p. 46 = `/page/n63`; p. 59 = `/page/n76`; p. 60 = `/page/n77`; p. 61 = `/page/n78`. |
| Goetschius *Tone-Relations* | Percy Goetschius, *The Theory and Practice of Tone-Relations: A Condensed Course of Harmony, Conducted upon a Contrapuntal Basis*, "Seventh edition" (New York: G. Schirmer, 1902) | https://archive.org/details/theorypracticeof1902goet. p. 172 = `/page/n179`; p. 174 = `/page/n181`. |
| Chadwick | George W. Chadwick, *Harmony: A Course of Study*, "Thirty-first edition" (Boston: B. F. Wood, copyright 1897) | https://archive.org/details/cu31924021756469. p. 221 = `/page/n238`. |
| Bussler | Ludwig Bussler, *Practical Harmony: A Systematic Course in Fifty-four Lessons*, translated by N. Gans (Philadelphia: Hatch Music Co., 1896) | https://archive.org/details/practicalharmony00bussuoft. p. 230 = `/page/n241`. |

On the exclusions: Prout *Counterpoint* and *Musical Form* are separate books from Prout's *Harmony*, which was excluded. I did not use *Harmony* in any edition. The 1903 "30th edition, revised and largely rewritten" (`cu31924021757285`) is listed under "Sources tried".

---

## Ich dank dir, lieber Herre — BWV 37/6 — No. 341

1. **Bar 8, beat 1: a seventh chord on the subdominant in place of the plain subdominant triad.**
   - Prout §493 (his example (a)): "More rarely a chord of the seventh on the subdominant is similarly used instead of the subdominant triad, as in the following examples."
   - His footnote adds: "This chord is in reality the third inversion of the dominant thirteenth."
   - The data confirms the chord. The extract runs from the pickup at bar 6, beat 4 to the E-major cadence at bar 8, beat 3.
     - At bar 8, beat 1 the notes are bass A2, tenor E4, alto C♯4 and soprano G♯4. That is A–C♯–E–G♯, the seventh chord on IV of E.
     - It moves through B to E (E3–G♯3–B3–E4) at the fermata.
   - Prout titles the extract Cantata "Wer da glaubet, und getauft wird" (BWV 37). His key signature is A major, as in the game.
   - Prout *Cpt*, p. 204 (leaf n207). Full view.

## Ach Gott, wie manches Herzeleid — BWV 153/9 — No. 217

2. **Bar 15, beat 1: a chromatic supertonic seventh in first inversion, going straight to the dominant.**
   - Prout §492 gives two Bach examples of a chromatic chord on the supertonic before the dominant in a cadence. This is example (c): "At (c) (d) are seen the fundamental (chromatic) chord on the supertonic. At (c) the first inversion proceeds straight to the dominant chord".
   - The data confirms this.
     - At bar 15, beat 1 the notes are bass F♯3, tenor D4, alto A4 and soprano C5. That is D–F♯–A–C with F♯ in the bass, a chromatic chord in C major.
     - Beat 2 is a G-major chord, and the phrase cadences on C at bar 16.
   - The extract runs over bars 13–16.
   - Prout titles it Cantata "Schau', lieber Gott" (BWV 153, *Schau, lieber Gott, wie meine Feind*).
   - Prout *Cpt*, p. 204 (leaf n207). Full view.

## Allein zu dir, Herr Jesu Christ — BWV 33/6 — No. 13

3. **Bar 2, beat 2½: the chromatic supertonic chord in second inversion, then a tonic 6/4.**
   - Prout §492, example (d): "while at (d) the second inversion is followed by the second inversion of the tonic chord."
   - The data confirms this.
     - At bar 2, beat 2½ the notes are bass A3, tenor D4, alto F♯4 and soprano C5. That is D–F♯–A–C with A in the bass.
     - Beat 3 has bass G3 with E4, G4 and C5 above: C major with G in the bass, a tonic 6/4 in C.
     - The opening phrase moves in quavers in the alto, tenor and bass over bars 0–2.
   - Prout prints the extract with no key signature, in C. The game file labels the chorale A minor, but this first phrase cadences in C.
   - Prout titles it Cantata "Allein zu dir, Herr Jesu Christ" (BWV 33).
   - Prout *Cpt*, p. 204 (leaf n207). Full view.

## Du Lebensfürst, Herr Jesu Christ — BWV 43/11 — No. 102

4. **Bar 7: the dominant approached from the submediant.**
   - Prout §494 names two less common ways to approach the dominant in a full cadence: "It may be preceded by the tonic chord as (a) below, or by the submediant chord, as at (b)." Bach is example (b).
   - The data confirms this.
     - At bar 7, beat 1 the notes are bass E3, tenor E3, alto B3 and soprano G4, an E-minor chord (vi in G).
     - Beat 2 is D major (D3, A3, D4, F♯4).
     - The cadence on G follows at bar 8.
   - The extract runs from bar 4, beat 3 to bar 8.
   - Prout titles it Cantata "Gott fähret auf mit Jauchzen" (BWV 43).
   - Prout *Cpt*, p. 205 (leaf n208). Full view.

## Gelobet seist du, Jesu Christ — BWV 91/6 — No. 51

5. **Bar 10: the plagal close "in its simplest form".**
   - Prout §498 says the plagal cadence is seldom found, in modern music at least, except at the close of a movement. He then gives this passage: "The following passage shows this cadence in its simplest form."
   - The data confirms this. Bar 10 begins on C major (bass C3, tenor G3, alto E4, soprano G4) and ends on G major at the fermata. In between, the alto has F♮4 at bar 9, beat 4.
   - Prout's extract runs from the end of bar 7 through bar 10. Its soprano and bass match the game.
   - Prout titles it Cantata "Gelobet seist du, Jesu Christ".
   - Prout *Cpt*, p. 206 (leaf n209). Full view.
   - *Round 2 covered No. 51 at bar 8, beat 3½* (Prout's *Harmony*, where it is labelled "Siehe welch' eine Liebe"). This is a different bar and a different source. In this book Prout's label agrees with the BWV.

## Was mein Gott will ("Was mein Gott will, das g'scheh allzeit") — BWV 144/6 — No. 265

6. **Bars 14–15: a plagal close in B minor with a dominant seventh on the tonic, a 6/4 subdominant, and a Picardy third.**
   - Prout §499: "At the beginning of the second bar the dominant seventh resolves on a tonic discord, instead of on the tonic triad."
   - He continues: "The subdominant chord of the plagal cadence is here in its second inversion, instead of its root position".
   - He also notes that, though the key is B minor, "the last chord is major—the 'Tierce de Picardie.'"
   - §501 comes back to this passage: "In old music it is by no means unusual, in approaching a plagal cadence, to introduce the minor seventh of the key".
   - The data confirms all four points.
     - Bar 14, beat 4½ is F♯7 (bass F♯3, tenor E4, alto A♯4, soprano C♯5).
     - Bar 15, beat 1 is bass B2, tenor D♯4, alto A4 and soprano B4. That is B–D♯–A, B major with the minor seventh A, which is the "tonic discord".
     - Beat 2 is bass B2 under E4, G4 and B4: E minor in second inversion.
     - Beat 3 is B major (D♯4, F♯4).
   - The extract is bars 14–15.
   - Prout titles it Cantata "Nimm was dein ist" (BWV 144).
   - Prout *Cpt*, p. 207 (leaf n210). Full view.

## Vater unser im Himmelreich — BWV 90/5 — No. 267

7. **Bar 10: an interrupted cadence onto a D-flat chord (the "minor sixth" of F), then a turn towards D minor.**
   - Prout §507, example (c): "At (c) is seen the chromatic chord on the minor sixth of the scale as the final chord of the interrupted cadence; this may or may not induce a modulation."
   - He continues: "Here Bach has followed it by chords leading to D minor."
   - The data confirms this.
     - At bar 10, beat 2½ there is a C-major chord (bass C3), the dominant of F.
     - The fermata at beat 3 is D♭ major: bass D♭3, tenor A♭3, alto F4 and soprano F4.
     - Beat 4 has D7 over C (C3, E♭4, F♯4, A4), leading to G minor in bar 11.
     - The chorale ends on D major (D3, F♯3, A3, D4) at bar 12.
   - The extract runs from bar 8, beat 4 (soprano D5 over bass G♯2) to bar 10.
   - Prout titles it Cantata "Es reifet euch ein schrecklich Ende" (BWV 90).
   - Prout *Cpt*, music on p. 210 and the comment on p. 211 (leaves n213–n214). Full view.

## Auf meinen lieben Gott ("Wo soll ich fliehen hin") — BWV 5/7 — No. 304

8. **Bar 6: an interrupted cadence followed by a modulation.**
   - Prout §507, example (d). This is an interrupted cadence in which the dominant is followed by a chord other than the tonic. Then: "In examples (d) and (e) the music modulates after the interrupted cadence."
   - The data confirms this.
     - At bar 6, beat 2 there is an F-major chord (bass F3), the dominant of B♭.
     - Instead of B♭, the fermata at beat 3 is D major (bass F♯3, tenor D4, alto A4, soprano D5).
     - Bar 7 begins on G minor.
   - The extract runs from bar 4, beat 4 to bar 6.
   - Prout titles it Cantata "Wo soll ich fliehen hin?" (BWV 5).
   - Prout *Cpt*, p. 210 (music) and p. 211 (comment). Full view.

---

## Prout's comparison of three Bach settings of "Jesu Leiden, Pein und Tod" (Nos. 106, 83, 61)

In *Counterpoint* §§536–540 (pp. 222–225) Prout first harmonises the melody himself. He then prints three complete Bach settings, from the simplest to the most elaborate, with lettered comments. I matched all three in full against the game:

- (1) "Johannes Passion", which is No. 106 (BWV 245/28);
- (2) the second "Johannes Passion" setting, which is No. 83 (BWV 245/14);
- (3) Cantata "Sehet, wir gehen hinauf", which is No. 61 (BWV 159/5).

None of these three chorales was covered in rounds 1–2.

### Jesu Leiden, Pein und Tod — BWV 245/28 — No. 106 (St John Passion)

9. **Bar 2, beat 2: the melody's sixth note is sharpened (D♯).**
   - Prout §537: "It will be seen that at (a) the sixth note of the melody is sharpened. It is not unusual with Bach to make slight alterations of this kind in his chorals."
   - He adds that the other two versions keep the subdominant.
   - The data confirms this: soprano D♯5 over bass B2 at bar 2, beat 2. Nos. 83 and 61 have the unaltered note at the same point.
   - Prout *Cpt*, p. 223 (leaf n226). Full view.
10. **Bar 4: an inner-voice leading note falls to the fifth.**
    - Prout §537: "At (b) his leading note falls to the fifth of the chord. Bach mostly does this in a cadence when the leading note is in a middle voice". His reason is "no doubt for the sake of having the last chord complete."
    - The data confirms this: alto G♯4 (bar 4, beat 2) falls to E4 in the A-major chord at the beat-3 fermata.
    - Prout *Cpt*, p. 223. Full view.
11. **Bar 6: a half cadence in the relative minor, with an accented passing note in the bass.**
    - Prout §537: "At (c) is a half cadence in the relative minor; notice also the accented passing note in the bass of the second crotchet."
    - The data confirms this.
      - The fermata at bar 6, beat 3 is C♯ major (C♯3, G♯3, E♯4, G♯4), the dominant of F♯ minor.
      - The bass runs D3–C♯3–B2–C♯3. Its C♯3 falls on beat 2 against tenor D4 before moving to B2.
    - Prout *Cpt*, p. 223. Full view.
12. **Bar 7, beats 3–4: the melody is ornamented.**
    - Prout §537: "At (d) the melody is ornamented, and the C in the treble is an accented auxiliary note."
    - The data shows the soprano C♯5 at beat 4 over an E-major chord (G♯3, B3, E4), followed by semiquavers D5–E5 into bar 8.
    - **Doubt:** in the scan Prout's "(d)" sits under bar 7 at about beat 2. Which "C" he means is my reading: the C♯5 at beat 4. The guide should keep this note general ("the melody is ornamented").
    - Prout *Cpt*, p. 223. Full view.
13. **Bar 13: a transient modulation to the subdominant.**
    - Prout §537: "At (e) is a transient modulation to the key of the subdominant, the music returning to the tonic at the third crotchet of the same bar."
    - The data shows G♮ entering at bar 13, beat 1: bass G3, tenor B♭3, alto G4 and soprano E5. That is E–G–B♭, pointing to D major. D major (bass D3) follows at beat 3.
    - Prout *Cpt*, p. 223. Full view.
14. **Bar 14, beat 2½: an anticipation in the soprano.**
    - Prout §537: "Lastly at (f) is 'an anticipation' ... of the next note of the melody. Such anticipations are frequently used by Bach."
    - The data confirms this: the soprano moves C♯5 → B4 on the second half of beat 2, which anticipates the B4 of the fermata on beat 3.
    - Prout *Cpt*, p. 223. Full view.

### Jesu Leiden, Pein und Tod — BWV 245/14 — No. 83 (St John Passion)

15. **Bar 1: the setting begins in F♯ minor, not A major.**
    - Prout §538: "Though the key of the choral is unquestionably A major, this version clearly begins in F♯ minor."
    - His explanation: the chorale "immediately follows a song in F♯ minor". Starting on the tonic and dominant of A straight after a close in the relative minor would have sounded harsher.
    - The data confirms this: the first chord is F♯ minor (F♯3, F♯4, A4, C♯5), and beat 2 has E♯3 in the bass.
    - Prout *Cpt*, p. 224 (leaf n227). Full view.
    - **Doubt:** that the preceding number is in F♯ minor is Prout's statement. I did not check it against the Passion score.
16. **Bars 2 and 8: lines that end on an inverted seventh chord.**
    - Prout §538 notes "the ending of the lines at (a) and (b) on an inversion of a chord of the seventh, which is resolved at the beginning of the next line."
    - He adds: "It is especially uncommon to find the most important of the middle cadences—that which divides the melody into equal parts—thus treated".
    - The data confirms both.
      - Bar 2 fermata: C♯3, A3, G4, E5. That is A7 in first inversion, which resolves to D major at bar 3.
      - Bar 8 fermata: E♯3, B3, G♯4, C♯5. That is C♯7 in first inversion, which resolves to F♯ minor at bar 9.
      - Bar 8 is the halfway point of the 16-bar setting.
    - He calls this version "more *contrapuntal*" than No. 106.
    - Prout *Cpt*, p. 224. Full view.

### Jesu Leiden, Pein und Tod — BWV 159/5 — No. 61 (Cantata *Sehet, wir gehn hinauf*)

17. **Bars 1–3: suspensions in the manner of fourth-species counterpoint.**
    - Prout §539: "The first three bars of this version show the practical use of the fourth species of counterpoint."
    - He calls this version "the most elaborate of the three".
    - The data shows dissonances held over the beat. For example, at bar 1, beat 3 the alto D4 sounds over bass C3 and resolves to C4 at beat 3½. The game repeats the D4 where the score has a tie.
    - Prout *Cpt*, pp. 224–225 (leaves n227–n228). Full view.
18. **Bar 5, beats 1–3: anticipations in the bass.**
    - Prout §539: "At (a) is seen a somewhat rare use of anticipations in the bass; these are seldom met with excepting in the upper part."
    - The data confirms this.
      - The bass moves E♭3 → D3 on the second half of beat 1, and D3 is then the bass of beat 2.
      - It moves D3 → C3 on beat 2½, and C3 is the bass of beat 3.
      - In each case the bass arrives half a beat early.
    - Prout *Cpt*, p. 225. Full view.
19. **Bar 6 in all three settings, and the key of No. 61.**
    - Prout §539: "It is somewhat curious that in each of the three examples we have quoted ... Bach has harmonized the third line of the choral with a half cadence in the relative minor."
    - And: "Notice also how the whole feeling of the music is altered by changing the key from A major to E flat, and thus lowering the pitch of the melody."
    - The data confirms both points.
      - The bar-6 fermata is C♯ major in No. 106, C♯ major in No. 83, and G major (B♮3 in the alto) in No. 61. Each is the dominant of the relative minor.
      - No. 61 is in E♭, a tritone below the A major of Nos. 83 and 106.
    - Prout *Cpt*, p. 225. Full view.
20. *Framing only.* Prout §540 says the three settings are given "less as models for the student's imitation than to show the harmonic possibilities of one simple melody". Prout *Cpt*, p. 225.

---

## Jesu Leiden, Pein und Tod — BWV 245/28 — No. 106 (second source)

21. **Bar 6, beat 2: the pivot chord of the modulation from A major to F♯ minor.**
    - Prout's *Musical Form* §134 quotes bars 5–7 and stars the chord on bar 6, beat 2.
    - "In this passage the quaver C in the bass is shown by the D in the tenor to be an accented passing note."
    - The starred chord is therefore taken as the diatonic seventh on the supertonic of A and left as the seventh on the subdominant of F♯ minor. In Prout's terms these are the "second inversion of the dominant eleventh" and the "third inversion of the dominant thirteenth".
    - The data confirms this. At bar 6, beat 2 the notes are bass C♯3, tenor D4, alto F♯4 and soprano A4. The bass then moves to B2 at beat 2½, which completes B–D–F♯–A.
    - This is the same passing note as in item 11, but here Prout explains the modulation.
    - Prout *Form*, p. 59 (leaf n76). Full view.

## Ist Gott mein Schild und Helfersmann — BWV 85/6 — No. 122

22. **Bar 3, beat 4: a seventh chord as the pivot from E♭ major to C minor.**
    - Prout's *Musical Form* §135: "Here the chord ✱ is taken as a seventh on the subdominant of E flat, and quitted as a seventh on the submediant of C minor."
    - He notes that, as in the St John example, "the degree of the scale in the minor key on which the chord is seen is a third higher than in the major key".
    - The data confirms this.
      - At bar 3, beat 4½ the notes are bass A♭3, tenor E♭4, alto G4 and soprano C5. That is A♭–C–E♭–G, A♭ major seventh.
      - It leads to the G-major half close at bar 4 (B♮3 in the tenor).
    - Prout's extract runs from the pickup at bar 2, beat 4 to bar 4. His key signature has two flats, as in the game.
    - Prout titles it Cantata "Ich bin ein guter Hirt" (BWV 85).
    - Prout *Form*, p. 60 (leaf n77). Full view.
    - *Round 2 covered No. 122 at bar 13* (Prout's *Harmony*). This is a different bar and a different book.

## O Ewigkeit, du Donnerwort — BWV 20/7 and 20/11 — No. 26

23. **Bar 7, beat 2: a chromatic seventh over E♭ in the bass, which turns the music to G minor.**
    - Prout's *Musical Form* §138(b) shows the supertonic and tonic major ninths used for modulation, with the generator omitted so that each looks like a seventh chord.
    - Of Bach's starred chord he writes that it "contains the same notes as the corresponding chord in the preceding example" (Mendelssohn). It is "now taken as the third inversion of a tonic major ninth in F", and quitted as the fourth inversion of the dominant eleventh of G minor.
    - The data confirms this.
      - At bar 7, beat 2 the notes are bass E♭3, tenor C4, alto G4 and soprano A4. That is E♭–G–A–C: F–A–C–E♭–G without its root F, with the seventh E♭ in the bass.
      - Beat 3 is D major with F♯4, and the phrase cadences on G at bar 8.
    - Prout's extract runs from the pickup at bar 6, beat 4 to bar 8.
    - Prout *Form*, p. 61 (leaf n78). Full view.
    - **Overlap:** round 1 (Pirro) commented on the chromatic bass of this same bar (E–E♭–D–C♯). Round 2 (Prout's *Harmony*) commented on bars 3–4. This item explains the harmony of the bar, not its expression. The guide could merge it with the round-1 note.

## O Welt, ich muss dich lassen ("Ich bin's, ich sollte büßen") — BWV 244/10 — No. 117 (titled "Nun ruhen alle Wälder" in the game)

24. **Bars 6–12: the second half repeats the melody of the first, but with new harmony.**
    - Goetschius prints the whole setting as an analysis exercise. His footnote ✱1, placed over bar 6, beat 4, reads: "At this point the second Part of the choral begins."
    - "The Melody is an almost exact reproduction of the first Part, but attention is directed to the remarkable changes in its harmonization."
    - The change "is prompted throughout ... by the *independent melodic progression* of the individual voices."
    - The data confirms this.
      - The soprano of bars 7–10 repeats bars 1–4 exactly.
      - The cadences differ. Bar 2 has an A♭-major fermata (bass A♭3); bar 8 has an F-major fermata (bass F3, A♮4 in the alto). Bar 4 has a fermata over E♭3; bar 10 has C major over C4.
    - Goetschius titles it J. S. Bach, "Matthew"-Passion. The example is Lesson 70, no. 1, on p. 172 (leaf n179), and the footnote is on p. 174 (leaf n181).
    - **Small doubts:**
      - The scan of the example is faint. I matched it by the soprano and the positions of the fermatas, not every inner note.
      - The key signature looks like three or four flats; the game has four.
      - The footnotes ✱2 and ✱3 on the same page belong to the next example (Allegretto), not to Bach.
    - Goetschius *Tone-Relations*, pp. 172, 174. Full view.
    - *Round 2 covered No. 117 at bar 10* (Prout's *Harmony*). This item describes the second half as a whole.

## Jesu, meine Freude — BWV 87/7 — No. 96

25. **Bars 1–2: plain chords brought to life by passing notes in the lower voices.**
    - Chadwick, *Harmony*, Lesson LXIX, "The Figured Chorale" (Ex. 295). He first prints a plain "Original harmony" of the first line, then the "Bach version".
    - "In fact, the licenses of progression which are allowed in part writing are entirely due to the independence and individual interest of the separate parts. Thus Bach illuminates the following simple harmony".
    - The data confirms the Bach version.
      - The bass runs D3–E3–F3–D3 in quavers.
      - The tenor adds C♯4 at bar 1, beat 3½ against bass B♭3.
      - The tenor moves A3–B♭3–A3–G3 in bar 2 before the D-minor close at bar 2, beat 3.
    - **Identification is mine:** Chadwick gives no title. The soprano, alto and bass match No. 96 (BWV 87/7). They do not match the other D-minor setting of the melody, No. 356 (BWV 358), whose alto and bass differ.
    - Chadwick, p. 221 (leaf n238). Full view.

## O Haupt voll Blut und Wunden — BWV 244/44 and 244/15, 17 — Nos. 80 and 98

26. **First and last chords: the "Phrygian" melody set in the major, beginning and ending with the melody on the third.**
    - Bussler: "The Phrygian choral, 'O Head, all bruised and wounded' has preferably been harmonized by Bach by beginning and closing with the third of the major key".
    - He adds that this harmonisation is the one "almost exclusively performed at the present day".
    - The data fits Nos. 80 and 98 exactly. Both begin (bar 0) and end (bar 12) on a D-major chord with F♯4 in the soprano.
    - The fit is partial for No. 74 (BWV 244/54). It ends on F major with A4 (the third) in the soprano, but begins with A4 over a D-minor chord.
    - **Doubt:** Bussler names no specific setting. Tying his remark to Nos. 80 and 98 is my reading.
    - Compare Spitta in round 1, who says Bach set this melody "now in the Ionian, now in the Phrygian mode".
    - Bussler, p. 230 (leaf n241). Full view.

---

## General statements usable as framing

- Prout on what the three *Jesu Leiden* settings teach: "the study of Bach's chorals will be of great value, in showing what boundless resources are open to the composer". Prout *Cpt* §540, p. 225.
- Prout, the same passage, evaluative: "the wonderful florid part-writing of the greatest contrapuntist that the world has ever seen". Prout *Cpt* §540, p. 225.
- Foote and Spalding, on the collection itself: "For an exhaustive study of part writing, and especially of suspensions and of chords of the 7th used in the freest possible manner, the student is referred to the 371 Vierstimmige Choralgesange of Bach". Arthur Foote and Walter R. Spalding, *Modern Harmony in Its Theory and Practice* (Boston: A. P. Schmidt, 1905), p. 224. https://archive.org/details/modernharmonyini00footuoft, leaf n235. Full view. I read this sentence in the OCR only; the page number is from the running heads in the OCR.
- Bussler: "The Chorals in Bach's 'Passion according to St. Matthew,' are recommended for further study." Bussler, p. 230.

## Sources tried, not usable

- **Percy Goetschius, other books.** Nowhere in his books did I find "Bach Chorals" cited by number; I could not confirm that lead.
  - *The Material Used in Musical Composition* (1889 `materialusedinmu00goet`, 1913 `cu31924021806207`, 1915 `materialusedinmu00goetuoft`): read and searched. He only recommends Bach's chorale harmonisations (St Matthew; the Schirmer/Widor–Schweitzer organ edition) as models, with no analysis of a specific passage.
  - *Tone-Relations*, 1917 edition (`theorypracticeof0000perc_b1j4`): same chorale footnote as 1902; nothing new.
  - *Exercises in Melody-Writing* (`exercisesinmelo00goetgoog`, `cu31924022370559`), *Exercises in Elementary Counterpoint* (1910), *Lessons in Music Form* (1904), *Homophonic Forms*, *Models of the Principal Musical Forms*: none analyses a Bach four-part chorale.
  - *Counterpoint Applied* (1902): treats chorale figuration and organ chorales, not four-part settings.
- **Hugo Riemann.**
  - *Harmony Simplified* (Eng. tr. 1896, `cu31924022305357`): no Bach chorale examples.
  - *Katechismus der Harmonielehre* (1890): only general remarks on Bach.
  - *Lehrbuch des einfachen, doppelten und imitierenden Kontrapunkts* (1908): mentions chorale fermatas and Bach in general terms only.
  - *Vereinfachte Harmonielehre*: the archive.org IMSLP item (`imslp-harmonielehre-…`) has no text layer.
  - *Handbuch der Harmonielehre*: no full-view copy found on archive.org.
- **Benjamin Cutter, *Harmonic Analysis* (1902, `cu31924022370948`).** Read in full; it is full view. Its two Bach examples (Ex. 52, anticipations; Ex. 94, St Matthew Passion) are not four-part chorales, and it gives exercises without commentary. Not usable.
- **Stephen A. Emery, *Elements of Harmony* (1879, `cu31924022371029`).** Its chapter on chorales is general advice on harmonising hymn tunes, with no Bach analysis.
- **Chadwick, *Harmony*: other Bach examples.** Ex. 273 and Ex. 279 (pedal points) are not chorales; Ex. 279 does not match any game chorale.
- **Foote and Spalding, *Modern Harmony* (1905).** Its St Matthew example (p. 173) is not a chorale: it has a rest, and its bass matches nothing in the game. Its Tierce de Picardie example is from the G-minor organ fugue. Only the framing sentence above was used.
- **Salomon Jadassohn.**
  - *Lehrbuch der Harmonie* (Breitkopf, 1907 printing, `lehrbuchderharm00jadagoog`), p. 176: the Bach examples of false relations are instrumental figuration, not chorales.
  - *Manual of Harmony* (`cu31924022485548`), *Lehrbuch des einfachen … Contrapunkts* (`lehrbuchdeseinfa00jada`), *Die Formen in den Werken der Tonkunst*: no Bach chorale analysis.
- **E. F. Richter.** *Manual of Harmony* (Eng., `richtersmanualof00rich`) and *Lehrbuch der Harmonie* (`lehrbuchderharmo00rich`): his chorale examples (e.g. No. 446, analysed for its cadences) are Richter's own settings, not Bach's.
- **F. J. Sawyer, *A Course of Harmony* (1899).** No Bach chorale examples.
- **Ludwig Bussler, *Theory and Practice of Musical Form* (Cornell tr., 1883).** No Bach chorale analysis. *Practical Harmony* was used for item 26.
- **J. C. Kittel, *Der angehende praktische Organist*.** No copy found on archive.org by title or author search. Not read.
- **Prout, *Musical Form* §101 ("Ach, ich sehe", BWV 162).** This is a real Bach chorale analysis: the first modulation goes to the major key on the minor seventh, and there is a Tierce de Picardie at the E-minor cadence. However, the setting (melody A–B–C–B | A–B–C–D–C–B…, in A minor) matches nothing in `study.json`. It is probably the closing chorale of BWV 162, which is not in the game's collection. Not used.
- **Prout, *Musical Form*, other chorale melodies** ("O gesegnetes Regieren", "O Gott, du frommer Gott", "Valet will ich dir geben", "Liebster Jesu, wir sind hier"). These are melodies only, with Prout's own cadence plans, not Bach's harmonisations.
- **Prout, *Counterpoint*: exercises at the end of Chapter XVI.** These are "basses taken from the works of Bach" set as figured-bass exercises, with no commentary. Chapter XVII (counterpoint on a choral) deals with chorale-based choruses and organ works, not four-part settings.
- **Prout, *Double Counterpoint and Canon* (1891) and *Fugue* (1891).** Their chorale chapters treat canons and fugues on a chorale, including Bach motet movements, not four-part harmonisations.
- **Prout, *Harmony*, 30th edition (1903, `cu31924021757285`).** This is the revised and rewritten edition. Its Chapter XVI includes Bach chorale comparisons, but *Harmony* was excluded for this round, so I did not use it. It may overlap with the Counterpoint material above.
- **Goetschius *Tone-Relations* (1902), other Bach examples** (Ex. 184 and the next page). These are instrumental, not chorales.
