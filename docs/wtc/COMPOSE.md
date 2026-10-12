# Writing a fugue: audit of the fugue side and a plan for the composer

Written 11 October 2026 at the owner's request: *audit the WTC mode's fugues, and plan the way to a
player who enters a subject and some constraints and is led step by step to a fugue they can then
edit*. This is a proposal, not a decision. The open questions are in section 6. It supersedes
nothing in CONCEPT.md (levels 0-8) or PLAN.md (F1-F6). It is the route to CONCEPT.md's level 8,
with the earlier levels re-cut as the steps of one composition.

## 1. Where the fugue side stands

### What works on Bach's fugues only

The analytic layer is broad, and checked against the score and against Ledbetter:

- subject and answer;
- entries in prime, inversion, augmentation and diminution: 91% of Ledbetter's entries;
- strettos: 83%;
- episodes and sequences;
- exposition order;
- key plan;
- countersubject uses.

There are five exercises, all on the 29 ASAP expositions:

- real or tonal;
- write the answer;
- write the countersubject;
- find the entries;
- Where next?

Three of the five are tied to Bach's rhythm and Bach's notes:

- **Write the answer** and **write the countersubject**: the player fills Bach's rhythm with
  pitches.
- **The workshop** (`src/wtc/workshop.ts`): it moves Bach's notes by step and re-pitches Bach's own
  entries. It composes nothing.

### What works on arbitrary input today

These parts would serve a composer:

- **The answer:** `predictAnswer(…, "bach")` (`src/wtc/fugue.ts:104`).
  - The head rule is law-like: of the 17 subjects that begin on ^5, all 17 are answered from ^1.
  - The tail rule is crude: 28 of 48 answers come out right in every letter.
- **Two voices:** `evaluateCounterpoint` (`src/wtc/counterpoint.ts:76`). It judges a two-voice
  tonal pair in free rhythm (dissonance figures, parallels).
- **N voices:** `evaluateTrio` (`src/wtc/trio.ts:153`). It judges one voice against N others,
  using harmony read beat by beat.
- **Re-analysis:** `findEntries`, `strettos`, `episodes`, `exposition`, `entryKey`. All of these take
  any piece plus a subject, so a finished player's fugue can be analysed by the same code that
  analyses Bach's.
- **Diatonic helpers:** `scaleOf`, `moveInScale`, `invert` (`src/wtc/workshop.ts`).

### What is missing for composition

**Input and output:**

- **Free melodic input.** No screen lets the player enter a melody with its own rhythm, metre and
  key. Every input path writes pitches into fixed slots.
- **Editable multi-voice notation.** `WtcScore` draws a keyboard fugue, but only for display. A
  third voice on a staff collides with the second, and a silent voice draws no rests.
- **Saving and export.** WTC work is not saved; the workshop's state is lost on a reload. There is
  no MIDI or MusicXML export anywhere in the game.

**Checks the composer needs:**

- **Generators.** Every beam search in the game is bound to Fux's species grid (`slotLayout`, modal
  finals, Fux's habit tables). The one real dynamic programme, the continuo Viterbi, is modal and
  places chords on the downbeat only. Nothing proposes a countersubject, a free voice, a codetta or
  an episode.
- **Invertible counterpoint.** No check for the octave, tenth or twelfth.
- **Stretto feasibility.** Strettos are only detected after the fact. Nothing tests whether a
  subject can stretto with itself.
- **Implied harmony of a single line.** `readHarmony` refuses monophony (`harmony.ts:98`), and
  `harmonies()` in `trio.ts` reads windows without a model of progression.
- **The subject itself.** Nothing judges whether a subject is fugal: its range, how it ends,
  whether it modulates, its rhythmic profile.

### Faults found that matter for building on this

1. **`evaluateTrio` reads the harmony from all voices, the judged one included**
   (`trio.ts:159-161`). A wrong note can make the chord that excuses it. As a filter for a generator
   this is fatal: a search finds exactly those notes. Fix: read the harmony with the judged voice
   left out, or weighted down.
2. **`predictAnswer` assumes 4/4** for the head window (`barLen = 4 * TPQ`, `fugue.ts:106`).
3. **After a mutation, `predictAnswer` moves the note by a fourth and leaves its neighbours' intervals
   unsmoothed.** It handles no minor ^6/^7 and does not choose between a fifth up and a fourth down.
   It is tested on two fugues only.
4. **Three note models, three time units:**
   - `fugues.ts` `WtcNote`: quarters;
   - `corpus.ts` `WtcNote` tuple: ticks at 1920 per quarter;
   - `entries.ts` `FullNote`: MIDI in quarters.

   The two judges take different units.
5. **Duplicated helpers that disagree:**
   - `findEntries` (twice) and `degree` (twice);
   - `transpose`;
   - chord tables (three);
   - `step`: a ninth counts as a step in `counterpoint.ts:58` but not in `trio.ts:59`.

   Two classes share a name: `evaluateTrio` / `TrioViolation` exist in both `src/wtc` and
   `src/counterpoint`.
6. **`isConsonant` treats the fourth as dissonant between any two voices** (`interval.ts:74`). This
   is wrong between upper voices, and it will matter in three voices.
7. **The two halves of the mode do not agree on which fugues they have.** Opening the exercises
   after studying one of the 19 fugues without an ASAP exposition silently shows the first fugue
   (`WtcApp.tsx:89`).
8. **There are three answer exercises:** the game's, the chorale branch's F2 (`AnswerApp`), and the
   lab's. None has been merged.
9. **The rights note contradicts what is committed.** `IMPORT-LOCAL.md` says the Humdrum notes stay
   local, but the `.krn` files and `data/wtc/fugues.json` are committed and bundled.
10. **`npm test`: 256 of 257 pass.** The failure (`export.test.ts`) is a missing `npm install` of
    `@breezystack/lamejs`, not a fault in the code.

## 2. The idea: a guided composition, modelled on how fugue was taught

A fugue is not written top to bottom. The teaching tradition breaks it into a fixed series of
decisions, each constrained by the ones before:

- Marpurg's *Abhandlung von der Fuge* (1753-54);
- the partimento fugues of the Neapolitans, as presented by Sanguinetti, *The Art of Partimento*
  (2012).

The series runs: subject, answer, countersubject, exposition, episodes, middle entries in related
keys, stretto and pedal, cadence. The composer follows that series.

Five principles:

1. **Each step is a small, checkable decision.** The player either writes it, or picks one of a few
   proposals and edits it. Nothing is ever composed without the player's choice, and every
   proposal stays editable.
2. **The judge distinguishes three things, as the chorale mode does (C4):**
   - **boundaries** (errors): few, each checked against the 48 first;
   - **idiom:** Bach's practice, with examples;
   - **comparison:** a passage of Bach's that does the same job. For example, an episode that leads
     from the tonic to the relative major, found in the 48, playable beside the player's.

   "Like Bach's" comes from the comparison, not from the generator. The machine's proposals will be
   correct and plain; Bach's passages show what correct and plain leaves out.
3. **The fugue is one document.** A `FugueDraft` holds:
   - the key, mode and metre;
   - the subject, answer and countersubject(s);
   - the plan (sections, entries, keys);
   - the realised voices.

   Every step reads and writes it. Going back to change the subject re-derives what depends on it
   (answer, entries) and marks what has gone stale (a countersubject that no longer fits).
4. **The finished fugue is re-analysed** by the analytic layer that reads Bach's 48. The analysis
   must find the entries the plan put there. This is both a test of the composer and a lesson for
   the player: *this is what a listener will hear in your fugue*.
5. **Two voices first, then three.** Book I no. 10 is the two-voice model. Most of the hard
   machinery (free voices, spacing, N-voice judging) comes only with the third voice.

## 3. The steps the player goes through

The "existing" column names what can be built on.

| step | the player | the machine proposes | the judge | existing |
|---|---|---|---|---|
| S1 Subject | enters a subject (free rhythm, key, metre, upbeat), or picks one: Bach's, a textbook one, or their own from the Fux mode | — | range, beginning and end degrees, whether it modulates, its rhythmic profile, its implied harmony; all set against the 48's subjects ("like 1/2: ends on ^3, implies i-V-i") | the subjects of the 48 (`FUGUES.md`) |
| S2 Answer | chooses real or tonal, the mutation points, where it enters (after the subject or on its last note), and the octave | the real answer and Bach's tonal rule, with variants where the tail is ambiguous | the head rule as a boundary; the tail as idiom, with Bach's answers of the same shape | `predictAnswer` (to be generalised) |
| S3 Countersubject | writes a line against the answer, or picks one of 3 proposals and edits it | candidates in rhythms that complement the subject's (moving where it holds, holding where it moves) | two voices in both positions (invertible at the octave; optionally the tenth or twelfth); idiom: Bach's countersubjects (contrast of rhythm, few perfect intervals on the beat) | `evaluateCounterpoint`; the hint search in `wtc/hints.ts` |
| S4 Exposition | orders the voices; in three voices writes or accepts the codetta before the third entry, and the free voice against subject and countersubject | voice orders from the 48 (subject and answer alternate in 42 of 48); a codetta that leads the answer's key back to the tonic | N-voice judge; codetta length set beside Bach's (a link before the third entry in 60%) | `exposition-study.md`; `evaluateTrio` (after fault 1 is fixed) |
| S5 Plan | chooses the middle keys and the order of sections (episode, entry group, …), and the length | key plans drawn from the 48's statistics (in major the first key away is vi in 54%); the subject's possible strettos (see S7) shown on the plan | idiom only: the 48's plans with examples | `keyplan.ts`; `keyplan-study.md` (figures to be made data) |
| S6 Episodes | picks a fragment of the subject or countersubject and a sequence pattern (descending fifths, ascending 5-6, descending thirds), or writes freely | the sequence realised from the fragment over the pattern, leading from key A to key B | voice-leading; whether the episode is built from the subject (motive match); Bach's episodes between the same two keys | `structure.ts` episodes and sequences (detection only) |
| S7 Middle entries and stretto | places entries in the planned keys; tries strettos | the subject and countersubject transposed into the key; a stretto table (each distance × interval, with how many faults each gives) | N-voice judge | `strettos` (detection only) |
| S8 Ending | final entry, pedal point, cadence, optional coda | a dominant pedal under the last entry; cadence formulas | the judge; Bach's endings | `study.ts` finds pedals and cadences in the 48 |
| S9 The whole | edits any note; plays it; saves; exports | — | a report on the whole fugue, plus the re-analysis (principle 4) | the study screen's views (roll, Score, Page, companion) could show the player's fugue as they show Bach's |

## 4. What has to be built, in layers

**L0 Foundations (refactoring; nothing the player sees).**

- One note model: spelled pitch, onset and duration in ticks, voice. Converters for the other
  three models. Retire the duplicated helpers listed in fault 5.
- Fix faults 1, 2, 6 and 7.
- `FugueDraft`, the document type, with derivation and staleness.
- Make data of the figures that the study documents state only in prose: key plans, exposition
  orders, answer kinds, and the 48's subjects with their features. Each idiom message then cites a
  number and a passage.

**L1 Input and display.**

- A melody editor: a grid of sixteenths (triplets later), holds and ties, rests, accidentals, key,
  metre and upbeat; typing by letter as the exercises already do, and MIDI input later.
- Editable multi-voice notation: the grand staff with two voices per staff, rests in each voice,
  and stems by voice. Stretto passages will need more.
- MIDI and MusicXML export, so a player can take the fugue into MuseScore.

**L2 Judges, generalised.**

- An invertibility checker: run `evaluateCounterpoint` on the pair transposed by the octave, tenth
  or twelfth, with the rules each inversion needs. For example, inverted at the twelfth a sixth
  becomes a seventh, and parallel thirds inverted at the tenth become parallel octaves.
- A stretto table: the subject against itself at each metric distance and interval.
- The subject judge (S1).
- Implied harmony: a Viterbi over chords with a key and a progression prior (the continuo DP's
  shape). It reads the harmony of a subject, and is the harmonic skeleton under a generated voice.
- The N-voice judge's missing checks: hidden fifths and octaves, consecutives by contrary motion,
  melodic intervals, crossing, keyboard span.

**L3 The generator.** One engine, used for the countersubject, the free voice, the codetta and the
episode. It generalises the Fux beam (`src/counterpoint/choices/`) to tonal music in free rhythm:

- a lattice of onsets on the metric grid;
- the rhythm sampled from Bach's countersubject rhythms, as `florid.ts` samples Fux's bars, at a
  cost when it moves together with the given voices;
- a pitch beam under the harmonic skeleton from L2;
- prefixes judged incrementally by the L2 judges;
- the cost given by a habit model fitted on the 48, as `modelBits` is fitted on Fux;
- Gumbel temperature, so that "three proposals" differ;
- the least-bad fallback.

Episodes add one constraint: the fragment repeated at the sequence's interval.

**L4 The composer screen.** A new view of the WTC mode, beside Study and Exercises. It is the
S1-S9 stepper over a `FugueDraft`: each step with its own panel, the score always visible, and
going back allowed at any step.

## 5. Order of work: a thin slice first

The composer's value lies in whether the whole path works. Its risk lies in the editor (L1) and the
generator (L3). Hence:

**M1, two voices end to end, no generator.**

| item | |
|---|---|
| foundations | L0 |
| editor | the melody editor (L1), and editable notation for two voices |
| steps | S1 (subject judge in its simple form), S2 (generalised answer), S3 written by hand and judged in both positions (invertibility checker), then a fixed plan: exposition, episode, entry in the relative, episode, final entry with a cadence |
| episodes and ending | written by the player and judged |
| at the end | the re-analysis, saving and MIDI export |

At the end of M1, a player can write a short two-voice fugue on their own subject with a judge at
every step. That is level 8 of CONCEPT.md in its two-voice form.

**M2, proposals:**

- the generator (L3), for the countersubject first, then episodes from a fragment and a sequence
  pattern, then codettas;
- the stretto table;
- the plan step (S5) with key plans from the 48;
- comparison passages from the 48 at each step.

**M3, three voices:**

- the N-voice judge completed;
- the free voice;
- exposition orders;
- stretto entries;
- the pedal point;
- notation for three voices on two staves.

**M4, later and optional:**

- four voices;
- a second subject (double fugue);
- inversion and augmentation as plan options;
- a "continue for me" mode in which the machine drafts the whole fugue from the subject, for the
  player to take apart and correct. Pedagogically this is the reverse of the composer, and it
  should come last.

The existing exercises are kept. Each step of the composer is also one of the exercises: S2 is
"write the answer", S3 is "write the countersubject". The exercises become practice on Bach's
material for the step the player will meet on their own.

## 5a. Status (11 October 2026)

M1 is built (D158), with the owner's go-ahead on the recommended answers to section 6: the two-voice
slice, the judge only, Bach's practice with his licences, the Humdrum notes for private use. What it
does not yet do, against the M1 list above:

- **L0 was done narrowly.** The composer uses one note model (`WtcNote`, quarters) and converts for the
  analysis; the duplicated helpers elsewhere (fault 5) and faults 1, 6 and 7 are untouched. Fault 1
  matters only from three voices (M3); fault 2 (`predictAnswer`'s 4/4) is avoided: the composer has its
  own answer rules, metre-aware.
- **The subject judge** has no implied-harmony reading (L2): it reports degrees, length, range, leaps,
  modulation and upbeat against the 29 subjects.
- **Entries in the relative key** are carried degree by degree (`toKey`): a minor subject's leading
  note becomes the major key's, and the reverse. Bach adapts more freely; the player retouches.
- **The judge is the two-voice countersubject judge**, lenient by design (D119: 115 of 189 injected
  faults caught); licences now excuse only isolated faults (D158 b).
- **The score** shows one section at a time in the fugue step (or the whole, small); notation is
  still the exercises' (two voices, no ties editable: a long note is a value, dotted or not).
- **Not yet**: the answer entering a fifth below in the lower voice is placed by register only;
  codettas are written only in the exposition; no comparison passages from the 48 (M2).

M1 completed (12 October): the close is judged by the two-voice clausulae (the last sonority
together, on the downbeat, the tonic in the lower voice, ^1 or ^3 above, the approaches, the raised
leading note in minor); ties in the editor (T: a note held on by the chosen value); audit fault 7
(the exercises name the study's fugue they cannot show, and open one in its key) and fault 2
(`predictAnswer` reads the head in the fugue's metre) fixed. Faults 1 and 6 belong to three voices
(M3); fault 5 (duplicated helpers) is left: the composer does not use them.

## 5b. M2 status (12 October 2026)

Built (D159):

- **The generator** (`src/wtc/compose/generate.ts`): rhythm sampled against the other voice's motion
  (holding where it moves, moving where it holds); a beam over the key's degrees (in minor both
  forms of ^6 and ^7), each note costed by local rules (consonance on the beat, an imperfect one
  preferred, a fifth costly where the line must invert; dissonance only passing, neighbouring or
  suspended; no consecutives; steps, recovered leaps, no augmented or diminished leap, no false
  relation in the line, no circling; the leading note rising; the line on its side; the last note
  leading on); Gumbel noise for variety; every candidate verified by the player's own judge (and, for
  a countersubject, inverted too), the fewest faults first. Seeded: the same request gives the same
  proposals.
- **Proposals** for the countersubject (25 of Bach's expositions tried: every first proposal passes
  where it stands and inverted), the codetta, and any free passage of the plan; the player's own
  line is kept and can be restored.
- **The stretto table** (`stretto.ts`): the subject against itself at every beat of delay and seven
  intervals, judged where the entries overlap; the last entry can be set in stretto.
- **Episodes from a sequence** (`episode.ts`): a fragment (the subject's head or tail, the
  countersubject's head) with a proposed companion, repeated a step lower, a step higher or a third
  lower in the key the episode leaves, then a free tail into the next entry.
- **The middle entry's key** from Bach's first keys away in the 48 (`keys.ts`: in major vi 54%,
  ii 17%, IV 13%, iii 8%; in minor III 50%, iv 32%, VI and VII 5%).

Not yet: **comparison passages from the 48** (a Bach episode between the same keys, a Bach
countersubject of the same rhythmic profile, played beside the player's). This is the part of M2
that makes "like Bach's" mean something, and it is next. Also left: proposals for the close (a
cadence formula), a harmonic skeleton under the generator (it reads harmony only through the
judge), and a habit model fitted on the 48 in place of hand-set costs.

## 6. For the owner to decide

1. **The first milestone.** Choose one:
   - the two-voice slice above (M1, no proposals);
   - CONCEPT.md's levels 3-7 as separate exercises on Bach's material first, and the composer
     after.

   The slice is recommended: the exercises already cover levels 1-3, and the editor is needed
   either way.
2. **How much the machine helps.** Choose one:
   - judge only, the player writes everything (M1);
   - proposals as well (M2).

   If proposals: should they come only after the player has tried?
3. **How strict the judge is.** Choose one:
   - Bach's practice in the 48, with his licences (as the exercises now judge);
   - a stricter school standard (Marpurg, the textbook fugue);
   - a switch between the two.
4. **Sources.** The habit model and the comparison passages need the notes of all 48, which today
   means the Humdrum encoding (rights reserved; fault 9). For private use the owner has accepted
   this. If the game is ever published, the open-score edition (Rother, CC BY 4.0, on the lab
   branch) is the replacement.
5. **The duplicate answer exercises** (fault 8): merge them, or keep the one the composer's S2 will
   share.

## When generation resumes: the bench (noted 12 October)

From the playback session, relaying the owner: this session owns fugue generation; the playback
session's bench (`data/playback/bench/`, format in its README there) is where the owner judges
generated music blind against Bach. Generation need not produce whole fugues: a part alone can be
judged on its own ("part": subject, answer, countersubject, exposition, episode, middle-entry,
stretto, close, whole), with Bach's surrounding voices "given" (drawn grey), files grouped in a
"batch" to rank side by side, and "compare" naming a stretch of a Bach fugue to play blind against
it. Its suggestions: subjects in batches of five or six in one key against Bach's subjects in that
key; an exposition on one of Bach's subjects against his exposition; episodes between two of Bach's
entries against his own. Nothing is sent until the owner resumes generation (D160).
