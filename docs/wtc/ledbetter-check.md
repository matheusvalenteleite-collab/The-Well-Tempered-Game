# The analysis checked against Ledbetter

David Ledbetter, *Bach's Well-tempered Clavier: The 48 Preludes and Fugues* (New Haven and London:
Yale University Press, 2002). Part Two, the commentaries, is pp. 143–332 (Book I pp. 143–234,
Book II pp. 235–332). Page numbers below are the book's printed pages. Ledbetter is paraphrased
except where a phrase is quoted; the book itself is not in the repository.

The eight fugues of the review sheet (tools/wtc/review-sheet.ts) were compared with his commentary.
What he confirms became tests (test/wtc-corpus.test.ts, "readings checked against Ledbetter");
what he contradicts was fixed where the fix was general, and is listed below where it is not.

## What he confirms

- **Book I no. 1, C major** (pp. 147–51).
  - The exposition is dux–comes–comes–dux, alto–soprano–tenor–bass. He explains it by the verset
    tradition (authentic and plagal ranges), not by tonal alternation. The analysis reads I V V I.
  - The subject's end is indefinite by design. Smend and Marpurg put it at the e′ in the middle of
    b. 2, the 14th note; the analysis reads 14 notes, ending in b. 2.
  - Strettos at b. 7 and b. 10, triple at bb. 14–15 and quadruple from b. 15. Pedals on the
    dominant at bb. 21–2 and on the tonic from b. 24. The second section reaches the relative minor
    by b. 14.
- **Book I no. 2, C minor** (pp. 153–6).
  - The codetta of bb. 5–6 before the bass entry.
  - The entries of the second half: middle voice b. 15, cantus b. 20, bass b. 26.
  - No strettos; the final pedal.
- **Book I no. 16, G minor** (pp. 203–6).
  - The cadence on the relative major at b. 12 and the major-mode entries from there.
  - Strettos at bb. 17–18 and bb. 28–9; the final tonic cadence at b. 34.
- **Book I no. 21, B♭ major** (p. 222).
  - Entries at b. 9 (the first full statement of the triple counterpoint), b. 13, b. 37 (subdominant)
    and b. 41 (tonic).
  - The analysis found these only after a fix (below).
- **Book II no. 7, E♭ major** (p. 271).
  - Exactly three stretto pairs: b. 30 (tenor and bass), b. 37 (alto and soprano) and b. 59 (the
    b. 30 stretto in the outer parts).
- **Book II no. 9, E major** (pp. 278–81).
  - Ledbetter counts in Bach's breve bars, as the encoding does (4/2, 43 bars).
  - His cadences on the 6th degree (b. 16), the 2nd (b. 23) and the 3rd (b. 35) and the final tonic
    are the analysis's perfect cadences in vi, ii, iii and I, bar for bar.
  - The bass entries at bb. 1, 10, 36 and 40, where a Kirnberger-derived copy writes "Pedal".
  - The high treble entry at b. 37.
- **Book II no. 2, C minor** (pp. 244–5). The augmentation: b. 14 (the bar he cites), and the bass,
  kept for an augmentation entry two thirds of the way through (b. 19).

## What he corrected, and how

- **Entries missed where Bach varies a long subject's opening** (Book I no. 21).
  - The entries at bb. 5, 13 and 41 differ from the subject only in the first three intervals (the
    upbeat turn) and a note or two of the tail.
  - Subjects of sixteen notes or more may now vary all three opening intervals, and one tail interval
    in every twelve notes.
  - No other fugue of the 48 gained or lost an entry by it.
- **A long subject's exposition read as stretto** (Book II no. 7).
  - Its 24-note subject is still sounding when the answer enters, so the exposition passed for a
    stretto.
  - A stretto now needs the next voice to enter before the one before is halfway through the subject.
- **Held notes read as pedal points** (Book II no. 7, bb. 46–53).
  - A whole note held across a 2/2 bar is a suspension.
  - A pedal point now lasts four beats or more, and at least a bar. Ledbetter's short dominant
    pedal in Book I no. 1 (a G held four beats across bb. 21–2) still counts.
- **No augmentation or diminution.**
  - The analysis now also searches for the subject at doubled and halved values, straight and
    inverted, for subjects of six notes or more.
  - It finds Book II no. 2's augmentation, Book I no. 8's at bb. 62, 67 and 77, and Book II
    no. 9's diminutions from b. 23 (his "diminution and inversion" at b. 27).

## Where the analysis still differs

- **Sections.**
  - Ledbetter's sections often end at cadences the analysis does not call perfect: Book I no. 1 at
    b. 19, Book II no. 9 at b. 9 (on the dominant), Book I no. 16 at b. 24.
  - Elsewhere the analysis cuts too often: Book I no. 2 into four sections, where he reads one binary
    form divided at b. 15, with interludes at bb. 9–10 and 22–5.
  - Cadence finding is the weakest part of the analysis. His sections are the better guide for the
    study guide.
- **Book I no. 5, D major** (p. 170).
  - His structural markers are the perfect cadences in falling thirds: B minor at b. 11, G major at
    b. 15, E minor at b. 17.
  - The analysis finds E minor at b. 17 and G at b. 15 (not as perfect), but B minor at b. 9, not
    b. 11.
- **Book II no. 9** (p. 280). The low close strettos at bb. 23 and 25, where crotchets enter the
  subject, are not found as strettos.
- **Book II no. 2** (p. 245).
  - The final stretti are at bb. 23–6. The analysis finds them, and also a five-entry passage at
    bb. 16–19 that he does not mention.
  - The exposition's fourth voice (the bass) is "not found" because its first entry is the
    augmentation.

## What he does not settle

- **Tonal answers.** He gives no general rule. Answers are explained case by case, often by mode
  (C major, p. 147; G♯ minor, p. 210, where Marpurg's "subdominant answer" is a "red herring"). So the
  rule the analysis found in the 48 (docs/wtc/answer-study.md) is neither confirmed nor contradicted
  by him.
- **Where a subject ends.** He treats a clouded ending as one of Bach's deliberate features
  (pp. 148, 190). A subject's "end" is often a matter of reading, and the review sheet should ask for
  it as such.
- **Temperament** (ch. 2, pp. 35–50, and Appendix B). He rejects Werckmeister III and Kirnberger III
  as "the Bach tuning" and, following Lindley, finds the evidence by c. 1740 pointing to equal or
  near-equal temperament with a nuance of key character. Vallotti is not discussed. The game's
  tuning notes should say this rather than imply that a well temperament was Bach's.
