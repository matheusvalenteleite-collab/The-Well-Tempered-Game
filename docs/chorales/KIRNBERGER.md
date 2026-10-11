# Kirnberger as the authority for the analysis

Owner's decision (C3): the analytical categories of the chorale library are Kirnberger's.

**The main source** is J. Ph. Kirnberger, *Die Kunst des reinen Satzes in der Musik* (Berlin, 1771-79).

**The second** is *Die wahren Grundsätze zum Gebrauch der Harmonie* (1773). It was published under
Kirnberger's name and written with J. A. P. Schulz, and it analyses two pieces by Bach by their
fundamental bass.

**Kirnberger and the corpus.** Kirnberger studied with Bach (c. 1739-41) and worked to have Bach's
chorales published. He died in 1783. C. P. E. Bach saw the Breitkopf edition (1784-87) through, and
that edition is the source of the 371 chorales used here. The details of Kirnberger's part in it are
still to be checked. He stands to this corpus roughly as Fux stands to the species exercises: a
theorist of the circle whose categories the corpus can be read with.

## Status (C22)

**Checked against the text of *Kunst* I.** The copy is the Internet Archive's
`diekunstdesreine00kirn` (University of North Carolina; title page 1774, the second printing of the
first part). The page numbers below are that copy's printed pages. The tables of chords are fold-outs
between pp. 32 and 33.

**Readings checked against the page images**:
- table II;
- pp. 80, 81, 90, 96, 97, 195.

**Readings taken from the archive's OCR**, read in context but not compared line by line with the
images: the remaining pages cited.

**Not yet consulted:**
- the second part (*Kunst* II, 1776-79);
- *Die wahren Grundsätze*.

Where the code reads more than Kirnberger states, this file says so.

## What the text says, and what the code does

### 1. Two fundamental chords

**Kirnberger:**
- **Consonant chords:**
  - Every consonant chord is the triad or one of its two inversions: the sixth chord and the
    six-four chord (pp. 26-27).
  - There are four classes of chord (p. 33):
    1. consonant;
    2. dissonant with an essential dissonance;
    3. dissonant with one or more incidental dissonances;
    4. both mixed.
  - The second class is the seventh chord and its inversions. The third and fourth classes are the
    *Vorhalte* before consonant and before dissonant chords.
- **The triad** "is of three kinds": major, minor and diminished (p. 34).
  - The diminished triad stands only on the major seventh degree in major and on the second in
    minor. It belongs neither at the beginning nor at the end (pp. 37-38).
  - Its root moves only up a fourth (p. 38).
  - Any other "triad" is "not only not consonant but entirely unusable" (p. 39). Kirnberger names
    no augmented triad among the chords.
- **The essential seventh chord** is of five kinds (table II; p. 64):
  - minor seventh, major third, perfect fifth;
  - minor seventh, minor third, perfect fifth;
  - major seventh, major third, perfect fifth;
  - minor seventh, minor third, diminished fifth;
  - minor seventh, major third, diminished fifth.
- **The diminished seventh** "is always an incidental dissonance" (p. 80).
  - The diminished seventh chord arises from the first inversion of the seventh chord on the
    dominant, "with the minor ninth held [in place of the root]" (*mit vorgehaltener kleinen None*,
    p. 90).
  - It "can be struck freely everywhere and in all its inversions" (p. 90).

**Code** (`tools/chorales/kirnberger.py`, `fundamental`):
- Three triads.
- Kirnberger's five sevenths.
- A diminished seventh chord is read as the dominant seventh a major third below, its fourth note
  labelled **ninth**: B-D-F-Ab is G7 with Ab for G.

**Changes from before:**
- The augmented triad (54 on the beat) and the minor-major seventh (2) are gone.
- The 95 diminished seventh chords, and the 7 without their third, now stand on the dominant: 225
  sonorities in all, counting the passing ones.
- The fifth kind of seventh, which the code lacked, is added.

### 2. Essential and incidental dissonance

**Kirnberger:**
- **The *Vorhalt*.** A dissonance held over from the chord before, standing in the place of the
  consonance a step below it, into which it falls. It could be left out without fault or ambiguity,
  "so we will call them incidental dissonances" (*zufällige Dißonanzen*, pp. 28-30).
  - The *Vorhalte* are the second, fourth, sixth, seventh and ninth, struck on the good part of the
    bar in place of the unison, third, fifth, sixth and octave. Each is held over from the chord on
    the weak part and then falls (p. 71).
  - They "must always enter on the good part of the bar and be resolved on the weak", unlike the
    essential seventh, which mostly enters on the weak part (pp. 72-73).
- **The essential seventh** cannot be left out without ambiguity. It "holds a place of its own" and
  is "necessary or essential" (*nothwendige oder wesentliche*, pp. 30-31).
- **Passing notes** (*durchgehende Töne*) are notes not taken from the harmony, struck as "pleasant
  or fitting transitions" to the next notes (p. 195).
  - In the **regular** passing (*transitus regularis*) the passing note comes after the main note.
  - In the **irregular** one (*transitus irregularis*) it comes on the beginning of the step and the
    main note follows (p. 195).
  - The irregular passing note "is avoided in the strict style and frequent in the light one" (p. 81,
    note 42).
  - The irregular passing note may not open a piece: a consonance of the main note must come first
    (p. 214).
- **Displacements.** Kirnberger names the displacement of the voices against the beat
  *Anticipatio* and *Retardatio*, the "uneven" counterpoint (pp. 192-193).
- **Not found in the pages read:** he treats neighbour notes, appoggiaturas and escape notes
  under the passing note; separate names for them were not found.

**Code:**
- **Incidental notes** are still labelled by melodic shape, and the labels are kept:
  - suspension, retardation, passing, neighbour, anticipation, appoggiatura, escape, free.
  - Only "suspension" (*Vorhalt*) and "passing" (*durchgehend*) are Kirnberger's words.
  - "Passing on the beat" is his irregular passing note.
  - "Anticipation" corresponds only loosely to his *Anticipatio*.
  - "Retardation" (a held note rising by step) is not his category. His *Vorhalte* fall (p. 71),
    with one exception: the augmented fourth may fall into the third (p. 78).
  - Neighbour, appoggiatura and escape are modern names for kinds of his passing note.
- **Two corrections:**
  - **The seventh resolving over the same bass is a *Vorhalt*.** In Kirnberger the 7-6 is the
    suspension of the sixth. It is to be told from the essential seventh because:
    - it does not take the fifth with it;
    - it resolves over the same bass, where the essential seventh's descent would not fit the
      harmony;
    - the bass then rises a step, where after the essential seventh it rises a fourth or falls a
      fifth (pp. 63, 78-80).

    The code now reads a seventh that is held, then falls by step while the bass stays, as a
    suspension. The chord is the triad into which it resolves. Of the 494 such sevenths counted
    before, 238 remain sevenths: their next note is itself a passing note, or they sound with their
    fifth.
  - **The dissonant six-four.** The consonant 6/4 needs no resolution and may fall on any part of
    the bar. The dissonant one is two *Vorhalte*, of the third and the fifth, over the root, on the
    good part of the bar (pp. 50-51). Kirnberger: the fourth is consonant against the dominant and
    dissonant only where it disturbs the triad of the key heard (p. 72, note 38).

    The code now reads a 6/4 on the beat whose sixth and fourth both fall by step over the same bass
    as the triad on the bass, with two suspensions: 149 sonorities.
- **The fourth over the bass:** see "The dissonant six-four" above.
- **An added sixth on the penultimate chord.** Kirnberger: the French add a sixth to the triad on the
  penultimate note and treat it as an essential dissonance. Neither the Germans nor the Italians
  close that way. With them the sixth appears on the half cadence "only as passing", and not in a
  heavy or slow movement (p. 97).
  - The sixth-fifth chord is in any case the first inversion of a seventh chord (table II; p. 67).
  - The code agrees with both:
    - F-A-C-D struck as a chord is D's seventh chord in first inversion;
    - a sixth struck in passing over a held triad is a passing note.

### 3. The strict and the free style

**Kirnberger** (fifth section, pp. 80-90):
- **The strict style** is the heavy one, of church music.
  - Every chord and almost every note is struck with weight.
  - There are few passing notes.
  - Dissonances are prepared, resolve down by step, last no longer than their preparation, and are
    not repeated.
- **The free or galant style** is that of the theatre and the concert.
  - It admits unprepared dissonance, the resolution passed over or taken by another voice, long and
    irregular passing notes, and augmented melodic steps (pp. 80-81).
  - The essential seventh may change voice or be inverted while it lasts (pp. 82-85). A *Vorhalt*
    may not, "because a *Vorhalt* must by its nature lie close beside the note it stands for"
    (p. 84).

**Code:**
- Each essential seventh is still recorded as prepared or free and resolving or not. The counts
  are in BACH-COUNTS.md.
- **Not applied (C16):** the strict/free distinction itself. The owner ruled that the chorale mode
  has one style, Bach's, with no strict/free distinction.
- **For the owner:**
  - By Kirnberger's own definition, church music, and so the chorale, belongs to the strict style.
  - Bach's unprepared sevenths (459 on the beat, 244 of them resolving as the harmony moves on), his irregular passing notes and his
    long-held passing dissonances are licences of the free style.
  - So, by the book, the chorales show Bach using free-style licences in the strict style.

### 4. The fundamental bass and its progressions

**Kirnberger:**
- **Root motion.** Consonant leaps of the root (fifths, fourths, thirds) make the closest connection,
  but each step can then be a point of rest. Inversions and tied dissonances bind the chords more
  tightly (pp. 92-93).
- **After the essential seventh** the bass "rises four notes or falls five", unless an inversion of
  the chord is taken (p. 63).
- **The improper seventh** (*unächte Septime*). A seventh after which the bass rises a step is the
  ninth of a root a third lower, resolving late (pp. 62, 66-67).

**Die wahren Grundsätze** (1773; Bayerische Staatsbibliothek copy, Internet Archive
`10527344bsb`, read in the OCR; section and page numbers as printed, to be checked against the
images):
- **§ 9 (p. 16).** The test between the accidental and the essential seventh. If the sixth follows
  the seventh over the same bass, or could be struck in its place, the seventh is accidental and
  counts as a sixth in the fundamental harmony. Otherwise it is essential.
- **§§ 10-11 (pp. 17-19).** An accidental dissonance may resolve only on the following harmony, and
  so look essential. Such a delay "can effect no change in the fundamental harmony" (p. 18). The
  seventh chord that results, "whether diminished or not", the treatise calls the *uneigentliche*
  (improper) seventh chord. It is a seventh-ninth chord on the third below the bass, whose ninth is a
  *Vorhalt* of the octave, and so "nothing other than our essential seventh chord" (p. 19). Take the
  accidental seventh away and the sixth-fifth chord, the first inversion of the essential seventh,
  remains. Its bass therefore moves as that chord's does, up a step, "which experience also
  confirms" (p. 20).
- **§ 12.** The same holds for the inversions of the improper seventh chord.
- **§ 13 (pp. 23-24).** The preceding and the following harmony decide. The diminished seventh chord
  "cannot be regarded in two ways at all": its seventh always stands for the sixth, with the third
  below the bass as root. That is how C22 now reads it.
- **Bach.** The *Vorbericht* (unpaginated) and p. 43: all of Bach's works reduce "to a naturally
  progressing fundamental bass and to two simple fundamental chords, the triad and the essential
  seventh chord". The treatise ends (§ 23, pp. 52 ff.) with a fugue by Bach analysed by its
  fundamental bass.

**Finding.** The improper seventh is not a marginal device of *Kunst* I. It is a systematic part of
the theory, and the *Grundsätze* give it operational tests:
- whether the sixth could stand for the seventh;
- whether the bass then rises a step;
- the preceding and the following harmony.

C22's reading of the diminished seventh chord is the same doctrine. Reading the diminished seventh
on the root a third lower while reading F-A-C-E going to G on F would be inconsistent with it.

**Secondary literature** (located, not yet read):
- D. W. Beach and J. Thym, "The True Principles for the Practice of Harmony by Johann Philipp
  Kirnberger: A Translation", *Journal of Music Theory* 23/2 (1979), pp. 163-225;
- Kirnberger, *The Art of Strict Musical Composition*, tr. D. Beach and J. Thym (New Haven: Yale
  University Press, 1982);
- D. W. Beach, *The Harmonic Theories of Johann Philipp Kirnberger: Their Origins and Influences*
  (PhD diss., Yale University, 1974).

**Code:**
- The counts give how the root moves, beat to beat.
- **Applied (C24, owner's approval).** A root-position seventh chord on the beat, whose bass then
  rises a step and whose seventh falls by step into the following harmony, is read on the third below
  the bass. The analysis reads the chord with the seventh's resolution in its place: it must give the
  sixth-fifth chord of an essential seventh chord. The bass is then that chord's third, and the
  seventh is its ninth, an incidental note for the octave. In Bach's chorales this applies to 34
  chords on the beat, out of 54 candidates where the bass rises a step and the seventh falls; in the
  other 20 the resolution does not give such a chord. Example: B-D-F-A going to C is G's seventh
  chord with A for G, the case of § 13. The verticalities so read carry `improper_seventh`.
- **Inversions (§ 12)** are not yet applied.

### 5. Cadences

**Kirnberger** (sixth section, pp. 91-99):
- **The full close or perfect cadence** (*ganzer Schluß*, *vollkommene Cadenz*):
  - The penultimate root is the dominant of the last; the root falls a fifth.
  - It is most perfect with the seventh on the dominant and the octave of the last root in the top
    voice.
  - It is somewhat less perfect from the subdominant (p. 94).
  - In mid-piece it can close in another key, "but likewise by the fall of a fifth" (pp. 95-96).
  - With inverted chords it gives only "resting points for single phrases" and is no full close
    (p. 99).
- **The half cadence** (*halber Schluß*): a rest on the triad of the dominant, above all when
  reached by a consonant leap (p. 96). Any perfect triad gives a small resting point (p. 96).
- **The deceptive cadence** (*Inganno*, *cadence rompue*): from the dominant not into the tonic
  (pp. 97-98).

**Code** (`classify_cadence` in `bach_analyse.py`):
- The earlier tests by the bass's motion and its degree in the chorale's key are kept.
- The 249 cadences left "other" are now read by the fundamental bass:

  | class | count | Kirnberger |
  |---|---|---|
  | authentic, penultimate inverted | 17 | the root falls a fifth, chords inverted: a changed cadence, no full close (p. 99) |
  | resting point on a major triad | 159 | his half cadence if the triad is the dominant of the key the phrase is in; the analysis does not yet know the local key |
  | resting point on a minor triad | 28 | a small resting point (p. 96) |
  | other | 45 | |

  The "half" class (347) is still the final bass on degree V of the chorale's key.
- **Local keys (C31).** The generator session's reading of every chord in its local key (its
  `src/chorale/generate/keys.ts`, `docs/chorales/KEYS.md`; imported by
  `tools/chorales/import_local_keys.py`) decides the classes the chorale's key left open. A rest on
  the local dominant is Kirnberger's half cadence (p. 96); a close on the local tonic from its
  subdominant, the bass rising a fifth, is his less perfect close (p. 94); any other close on the
  local tonic is not a full close. The authentic closes are left as read: where the local reading
  calls a close on V an applied dominant going to V, Kirnberger's full close in the dominant's key
  (pp. 95-96) is the other reading, and the two are left side by side.

  | class | count |
  |---|---|
  | half, in the local key | 119 |
  | plagal, in the local key | 37 |
  | close on the local tonic, not from its dominant | 180 |
  | resting point on a major triad (undecided) | 27 |
  | resting point on a minor triad | 28 |
  | other | 5 |

## What remains

- *Kunst* II; the rest of *Die wahren Grundsätze* (read for §§ 9-13 and the Bach passages only);
  the secondary literature above.
- The page images of the pages cited from the OCR. The translated phrases in quotation marks from
  pp. 30, 34, 39, 63, 72, 84 and 214 rest on the OCR, which is clean there but has not been
  compared with the print.
- The owner's decisions:
  - the improper seventh: adopted for root position (C24); the inversions remain.
  - The strict style was decided in C23: it is the frame of the explanations, not of the judgment.
