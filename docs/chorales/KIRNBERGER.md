# Kirnberger as the authority for the analysis

Owner's decision (C3): the analytical categories of the chorale library are Kirnberger's. The
main source is J. Ph. Kirnberger, *Die Kunst des reinen Satzes in der Musik* (Berlin, 1771-79).
The second is *Die wahren Grundsätze zum Gebrauche der Harmonie* (1773), published under
Kirnberger's name and written with J. A. P. Schulz; it analyses two pieces by Bach by their
fundamental bass. Kirnberger studied with Bach (c. 1739-41) and worked to have Bach's chorales published. He died
in 1783; C. P. E. Bach saw the Breitkopf edition (1784-87) through, and that edition is the
source of the 371 used here. The details of Kirnberger's part in it are to be checked. He stands
to this corpus roughly as Fux stands to the species exercises: a theorist of the circle whose
categories the corpus can be read with.

## Status

**The text has not been consulted yet.** The digital libraries that hold it (the Bayerische
Staatsbibliothek's digital collections, the Internet Archive, IMSLP) cannot be reached from the
build environment. What follows uses Kirnberger's central distinctions as they are generally
reported. It gives no quotations and no page numbers. Every name and every test below is marked
for checking against the text, as the Fux rules were checked against the 1725 *Gradus*.
Until that is done, these are operational readings, not Kirnberger's rules.

## The distinctions used, and how the code applies them

`tools/chorales/kirnberger.py` holds the tests; `tools/chorales/bach_analyse.py` applies them.

1. **Two fundamental chords: the triad and the seventh chord.** Each stands on a fundamental bass
   (*Grundbass*). Every other sonority is one of them inverted, or one of them with incidental
   notes.
   - *Code:* a sonority is read by letters. Its notes must stand in thirds above one of them,
     the root. A triad may lack its fifth.
   - A chord may lack its third when a suspension holds the third's place: the 4 in 5/4 or in
     7/5/4. Such a chord is labelled "third not sounding".
   - There is no ninth chord and no eleventh chord: a 9 or a 4 over the bass is always
     incidental.
   - *To verify:*
     - which triads Kirnberger admits as consonant (the diminished triad, the augmented);
     - how he names the seventh chords;
     - whether he reads the "added sixth" (F-A-C-D) as a seventh chord on D, as the code does.

2. **Essential and incidental dissonance** (*wesentliche* and *zufällige Dissonanzen*). The
   seventh of the seventh chord belongs to the harmony. Suspensions and passing notes stand in
   the place of a consonance.
   - *Code:* when the notes do not stand in thirds, the fewest notes whose melodic shape allows
     it are taken away (one or two; the bass last), and each is labelled by its shape:
     - **suspension** (*Vorhalt*): prepared by being held or struck again, then falling by step;
     - **retardation**: prepared, rising by step;
     - **passing** note (*durchgehende Note*);
     - **neighbour**;
     - **anticipation**;
     - **appoggiatura**: leapt to, left by step;
     - **escape**: stepped to, leapt from in the other direction;
     - **free**: none of these.
   - A seventh struck in passing or as a neighbour is read as incidental when the remaining
     notes make a triad. Example: the bass B under C major on its way from C to A.
   - *To verify:*
     - Kirnberger's own names and kinds of incidental dissonance, and whether he calls a passing
       note on the beat by another name;
     - whether the "passing seventh" is his category;
     - how he treats the 4th: a dissonance over the bass, but consonant in some uses of the 6/4.

3. **The treatment of the essential seventh.** In the strict style it is prepared and resolves
   down by step. In the free style it may enter unprepared.
   - *Code:* each seventh that sounds on the beat is recorded as prepared or not, and as
     resolving down by step or not. When it resolves, the code records whether the bass moves
     at that moment (the harmony moves on) or stays (the seventh resolves over one bass, as a
     suspension does).
   - *To verify:* the strict/free distinction and its conditions, and whether a seventh that
     resolves over a held bass counts for Kirnberger as a suspension.

4. **The fundamental bass and its progressions.** The counts give how the root moves from beat to
   beat.
   - *To verify:* which progressions Kirnberger prefers or restricts.

## What the readings give over Bach's 370 chorales (from `BACH-COUNTS.md`)

- Every sonority is read: none is left unanalysed. 85 notes are "free" (incidental notes of no
  recognised shape).
- **Fundamental bass:**
  - falls a fifth (or rises a fourth) about twice as often as it rises a fifth;
  - steps up more often than it steps down;
  - falls a third about twice as often as it rises one.
- **Sevenths on the beat:**
  - 1,272 are prepared and resolve down as the harmony moves on;
  - 494 resolve over the same bass;
  - 184 enter unprepared and resolve;
  - 364 do not resolve down by step. These are to look at: the resolution passed to another
    voice, or ornamented, or a reading to correct.
- **Incidental dissonances:** the passing note (mostly off the beat) and the suspension (mostly
  on it) dominate. The suspension lives above all in the alto; the passing note above all in
  the bass.

## When the text is available

The task is the one already done for Fux:

1. Read the relevant chapters.
2. Replace each operational test by Kirnberger's own wording, with its page.
3. Correct the code where he differs.
4. Rerun the counts.

One of these would make it possible:
- open network access to `digitale-sammlungen.de`, `archive.org` or `imslp.org`;
- upload a scan or PDF of *Die Kunst des reinen Satzes* (and, if possible, of *Die wahren
  Grundsätze*).
