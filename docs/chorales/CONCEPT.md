# The chorale mode: a conception of its own

Owner, after the first library work: this material is more sophisticated than Fux and needs a
conception of its own. Fux is an early support for basic counterpoint; the chorale mode is not
an extension of it. This document is that conception. It is the frame for every later decision
about the chorale mode (C4).

## 1. Why Fux's design does not carry over

The Fux mode is a checker.

- **The object:** a line against a line.
- **Correctness:** decidable locally, mostly by the succession of intervals between two voices
  under the constraints of a species.
- **The answer:** one model solution (Fux's).
- **The pedagogy:** a growing list of prohibitions, in the order of the *Gradus*.
- **The game:** the player writes, the rules fire, Fux's solution is the yardstick.

The chorale differs on every one of these points.

| | Fux | chorale |
|---|---|---|
| answers | one model solution | a space of correct solutions: Kittel's 8-9 basses to one melody; Bach's several settings of one tune share the root under only 69% of the melody notes |
| the main question | is it wrong? | which choice is it, and how idiomatic is it here? |
| order of decisions | bottom-up, note against note | top-down: where the phrases go, then the bass, then the voices |
| the given voice | a cantus firmus, an equal partner | a tune in the soprano, tonally loaded, to be *interpreted* |
| rules | absolute prohibitions | norms that depend on position, voice and style. The leading tone rises in the soprano and is free in the alto; parallels occur through passing notes; the seventh is prepared in the strict style and free in the free style (Kirnberger) |
| feedback | "error in bar 4" | "here Bach goes to the relative minor; Kittel's basses [3] and [6] reach the same cadence another way; your choice is rare in the corpus, and this is why" |

What stays:

- **The library** (parsed corpora, concordance, the Kirnberger reading). It is neutral as to
  conception and is what the new evaluation needs.
- **Fux as the prerequisite** of basic voice-leading. Kirnberger, too, teaches the strict style
  before the free.
- **Bach as the last word (C1).** It changes role: it is no longer a filter that clears
  prohibitions, but the reference against which every choice is placed.

## 2. The material of the exercises

- **Kittel's 24 melodies.** Each comes with 8-9 figured basses (194 in all), and 22 of them with
  Bach's settings as well (77 settings). These are the exercises with the richest comparison:
  several masters' answers to one question.
- **Bach's 370 soprano lines.** Each comes with Bach's own harmonization; the 22 above, with
  several. They give the volume of material, and a ranked path through it (section 6).

Any chorale melody becomes an exercise: the player receives the tune, and the levels below.

## 3. The levels of a harmonization

A harmonization is a set of nested decisions. The mode trains them level by level, top-down.
At each level the levels above may be given (as scaffolding) or chosen by the player.

| level | the decision | what the player makes | what the library gives to judge it |
|---|---|---|---|
| **1. Plan** | where each phrase goes: the key and the kind of each cadence | a cadence (key, kind) at each fermata | what Bach does at a phrase end like this one (the melody's last notes, the phrase's place in the chorale), and what Kittel's basses do |
| **2. Harmony** | the chord under each melody note, and the harmonic rhythm | a root (fundamental bass) per melody note, or per beat | Bach's progressions in context (from this root, over this melody degree) and Kirnberger's fundamental bass |
| **3. Bass** | the bass as a line: inversions, contour, motion against the soprano | the bass notes | Bach's and Kittel's basses: intervals, contrary motion, cadence formulas |
| **4. Figures** | the thoroughbass notation of 2 and 3 | figures under the bass | Kittel's figuring practice (the common language of the period) |
| **5. Voices** | alto and tenor, strict style | the inner voices, chord by chord | voice-leading norms counted over Bach: doubling, spacing, the leading tone, the seventh, parallels |
| **6. Diminution** | passing notes, suspensions, anticipations; the free style | embellishment of 3 and 5 | where Bach puts which incidental dissonance, by voice and beat (Kirnberger's categories) |

Levels 3-4 are Kittel's own method: given the melody, write and figure a bass. Levels 5-6 are
Bach's: the four voices written out and embellished. The mode leads from the first to the second.

## 4. Judging a solution

Three layers, each with its own place in the feedback.

### a. Boundaries (few)

What Bach virtually never does, counted over the corpus and cited:

- consecutive fifths and octaves on the beat;
- the augmented second in a line;
- an unprepared, unresolved seventh in the strict style.

Only these are reported as errors. A candidate becomes a boundary only by the owner's decision,
with its count in front of him (as in D39).

### b. Idiom

Every other choice is placed in Bach's distribution for its context: "in this position Bach does
this N times in M (for example no. 64, bar 7; no. 254, bar 3)". The player hears Bach's commonest
choice next to their own.

- **A rare choice is not an error.** It is shown as rare, with Bach's instances if there are
  any.
- **A number is never shown without examples:** what is learnt is the cases, not a score.

### c. Comparison

When the melody is one of Kittel's, or Bach set it more than once, the solution is laid beside
those settings:

- which of Kittel's basses it is nearest to;
- where it meets Bach's cadences and roots;
- where it departs from all of them.

The settings are playable alongside the player's.

**Style** is a choice the player makes, and the judgement follows it:

- **strict style** (Kirnberger's strenger Satz): prepared sevenths, few free dissonances;
- **free style** (freier Satz): Bach's practice.

Kittel's organist's thoroughbass and Bach's four-part vocal writing are two references, not one.

## 5. Kinds of task

1. **Hear and read.** Bach's setting with its levels laid open: the cadence plan, the
   fundamental bass, the figures, the incidental notes. These are the exercises in perception
   before production.
2. **Choose.** At a phrase end, or under a melody note, choose among the masters' options
   (Kittel's eight, Bach's). Then hear each.
3. **Complete.**
   - the bass under a given plan;
   - figures to a given bass (Kittel's figures as the comparison);
   - inner voices to a given figured bass (Kittel's basses: the realization of the period).
4. **Write.** A whole level, or the whole chorale, with the levels above given or not.
5. **Compare.** One's own solution against Bach's and Kittel's, level by level.

## 6. The path

- **Through the levels.** Plan first, then harmony, then bass and figures, then strict
  voices, then diminution and the free style.
- **Through the melodies, by measured difficulty:**
  - the number and length of phrases;
  - how many cadences leave the key, and how far;
  - chromaticism in the melody;
  - modal melodies (dorian, phrygian), which come later.

  Kittel's 24 come first at each level, because their comparison is the richest. Bach's 370
  then give the volume.
- **Fux first.** The Fux mode (two and three voices) is the stated prerequisite for level 5.

## 7. What the library must still provide

1. **Context models for each level** (counts with examples, not opaque scores):
   - level 1: the cadence at a phrase end, given the melody's close and the phrase's place
     (begun: `CADENCE-PLANS.md`);
   - level 2: the next root, given the root and the melody degree;
   - level 3: bass intervals and positions, given the harmony;
   - levels 5-6: the norms already counted (`BACH-COUNTS.md`), conditioned on context.
2. **Melody features and a difficulty ranking** over the melodies of both corpora (Kittel's 24 and Bach's 370 settings; fewer distinct tunes, since tunes recur).
3. **Kirnberger's text** for checking the categories (`KIRNBERGER.md`).
4. **The owner's decisions:**
   - which boundaries;
   - which styles;
   - how the first levels look on screen.

## 8. Open questions for the owner

1. **The screen.** The chorale mode has its own screen, sharing the engine (sound, notation)
   with the Fux mode. Should level 1 be played on the melody alone, with a marker at each
   fermata?
2. **Modal chorales.** Keep them, as a later stage, or set them aside?
3. **Kittel's place.** Is he a second reference throughout, or mainly the source of levels 3-4
   (bass and figures)?
4. **Figures in the interface.** Typed (as in a thoroughbass), chosen from a palette, or both?
