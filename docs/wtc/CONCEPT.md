# The Well-Tempered Clavier mode: a proposal

Written overnight (9-10 October 2026) by the Choices lab session, after the owner's brief: *the end
goal of the whole game is a Well-Tempered Clavier mode; everything so far is construction towards
it.* This is a proposal for the owner to amend, not a decision. It should be read beside the game's
own conception (Stage I, Fux's species counterpoint; then the stages towards Bach) and the chorale
mode's (docs/chorales/CONCEPT.md, on the chorale branch), and reconciled with them.

## 1. What the mode is for

The player should end able to do three things with a piece of the 48:

1. **hear and read a fugue as Bach built it**: the subject and its answer, the countersubject, the
   entries through the keys, the episodes between them, the strettos;
2. **make the parts of a fugue**: answer a subject, write a countersubject that inverts, build an
   exposition, spin an episode from the subject, plan the keys of the middle entries;
3. **write a short fugue**, in two voices, then three, judged as the chorale mode judges: a few
   boundaries, Bach's idiom, and Bach's own solution beside the player's.

And beside the fugues, the **preludes**: a harmonic progression made into a figure (Book I's C major
prelude is a chorale-like progression realized as one broken-chord pattern). That ties the WTC to the
chorale and figured-bass work: the progression is level 2 of the chorale mode, the figuration a
diminution (its level 6).

**Well-tempered** is part of the content, not a label: the 24 keys, each with its own colour in a
well temperament, unplayable in meantone. The mode plays every piece in the tunings of the period
and lets the player hear why Bach wrote the book.

## 2. Why the earlier modes lead here

| earlier mode | what it gives the fugue |
|---|---|
| Fux, two voices, species 1-5 | note against note, dissonance treatment, the suspension: the grammar of two lines |
| Fux, three voices | spacing, the complete triad, the bass's role |
| Chorales | the key, the cadence plan, the chord under a melody note, four-part voice-leading |
| Figured bass (Kittel) | the bass as the frame of a progression |
| Inventions and Sinfonias | imitation at the octave, the motive and its inversion, two and three real voices in the free style: the step from species to fugue |

## 3. Levels

As in the chorale mode, the levels go from perception to production, and each can be played with
the levels above given as scaffolding.

| level | the player | judged by | exists tonight |
|---|---|---|---|
| **0. Hear and see** | plays a fugue in a chosen tuning; sees the map (voices, entries marked); follows a guided listening, event by event | – | lab prototype: map of all 48 (entries with their keys, strettos, episodes), six tunings, a generated walkthrough (e.g. Book I no. 2: subject, answer in v, episode on a sequence, entries in III and v, return to i) |
| **1. Find the entries** | marks where the subject enters, in which voice, in which key | Bach's entries (the analysis, checked by hand where it is unsure) | lab exercise (click the entries on the map; hits, misses, false marks) |
| **2. Answer the subject** | turns a subject into its answer: each note a fifth or a fourth up | the head by rule (law-like in the 48: 17 of 17, 7 of 7), the tail against Bach's answer | lab exercise for all 48 fugues; study docs/wtc/answer-study.md |
| **3. The countersubject** | writes a line against the answer that works above and below it | two-voice rules in both positions (the free style: fifth species and its suspensions), and Bach's countersubject beside it | study docs/wtc/countersubject-study.md (regular in 12, inverted in 10 of them); exercise not yet |
| **4. The exposition** | orders the entries, writes the links (codettas) between them | the entries' keys and voices; voice-leading | analysis of entry order; not yet |
| **5. Episodes** | spins a sequence from a fragment of the subject | derivation from the subject (motive matching), sequence logic | episodes found and mapped, sequences and figures from the subject marked (docs/wtc/structure-study.md); exercise not yet |
| **6. The key plan** | chooses the keys of the middle entries (relative, dominant, subdominant...) | Bach's plans in the 48, as the chorale mode's level 1 judges cadence plans | lab exercise; study docs/wtc/keyplan-study.md (major: vi, IV, ii first; minor: III, iv, VII) |
| **7. Stretto, inversion, augmentation** | finds and then writes overlapping or transformed entries | Bach's strettos | strettos and inversions found and mapped (30 of 48 fugues have a stretto; docs/wtc/structure-study.md); exercise not yet |
| **8. Write a fugue** | two voices first (Book I no. 10 in E minor is Bach's two-voice fugue), then three | all the above | – |

Preludes run beside: **P1** a progression to realize in a given figure (C major, Book I), **P2** a
figure to choose for a progression, **P3** two-voice preludes in invention style. Tonight: the
harmonic reduction of any prelude (a chord a bar, figured, with a Roman numeral, playable as block
chords), the ground for P1.

## 4. How a solution is judged

Following the chorale mode's conception (boundaries, idiom, comparison), adapted:

- **Boundaries (few, errors):** parallel fifths and octaves between real voices on the beat; a
  dissonance on the beat neither prepared nor passing; an answer whose head breaks the tonic-dominant
  exchange. Each to be checked against all 48 before it becomes an error ("Bach is the last word",
  as Fux was for the species).
- **Idiom:** every other choice placed in Bach's practice in the 48 with examples, never a bare score.
- **Comparison:** Bach's own solution to the same task beside the player's, playable.

What the Fux work contributes here is the method: rules checked against the master's own solutions,
habits measured on pieces the model has not seen, confounds tested before a habit becomes a norm
(docs/fux/leap-study.md), independence of the precepts (docs/fux/independence-study.md).

## 5. What exists (branch claude/beautiful-mccarthy-7li5nv)

- **Data:** the 48 preludes and fugues and the 30 Inventions and Sinfonias, parsed from the Humdrum
  encoding (David Huron, 1994) into `data/wtc/*.json`: voices top first, onsets and durations in
  ticks, spelled pitches. Import check: docs/wtc/IMPORT.md (all 48 fugues clean).
- **Analysis (`src/wtc/`):** Humdrum reader; subject and answer; the answer rules (real, tonal
  variants, Bach's practice); entries of the subject (straight and inverted) for the fugue map;
  countersubjects and their uses; tunings (the game's four plus Kirnberger III and Vallotti).
- **Studies (`docs/wtc/`):** the answers (law-like head, variable tail); the countersubjects; the
  key plans; a cross-check against the main session's independent reading of 29 expositions (D119:
  the answers' mutations agree in all but one fugue).
- **Prototype:** the lab's "Well-Tempered Clavier" tab: the 48 in Bach's key order, Inventions and
  Sinfonias, the map with entries labelled by key, playback in period tunings, the harmonic reduction,
  and three exercises: find the entries (level 1), answer the subject (level 2), plan the keys (level 6).

## 6. For the owner to decide

1. **Rights.** The encoding carries "Copyright 1994, David Huron; rights to all derivative electronic
   formats reserved". Fine for study; before the public build ships it: ask, or re-encode from the
   Bach-Gesellschaft edition (public domain).
2. **The first playable level** in the game: level 0 + 2 (hear, then answer the subject) is ready in
   the lab; level 1 (find the entries) is the next cheapest.
3. **Notation:** the lab draws a map (piano roll); the game's score is built for two and three voices
   of species counterpoint. Keyboard fugues need a grand staff with several voices per staff.
4. **Who builds what:** proposed tonight to the main session: the lab session the data, analysis,
   studies and exercise logic (pure modules, as with the hints, D115); the main session the mode's
   screen, notation, sound and integration. The main session has meanwhile started its own first
   layer (D119: 29 expositions from the ASAP dataset, an answer engine, a two-voice tonal
   counterpoint engine) and the screen: the two readings were cross-checked and agree.
5. **Two data sources, two licences:** this branch's Humdrum encoding (Huron, rights reserved) and
   the main session's ASAP-derived file (CC BY-NC-SA 4.0, non-commercial). One should be chosen, or
   both kept for study only.
