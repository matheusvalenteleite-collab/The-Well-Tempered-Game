# The Well-Tempered Clavier mode: a conception

Status: written overnight without the owner. These are proposals, not decisions; what is already
built is marked as built. The owner's word for it: "it's all about the Well-Tempered Clavier: this
is the end goal".

## 1. Why the WTC comes last, and what it needs from the earlier modes

The game has three stages, and each needs the one before it.

- **Fux** (Exercitium I-II) teaches voice-leading: consonance and dissonance, motion between voices,
  the treatment of the dissonance. That is the grammar of every line in the WTC.
- **The chorales** (C series) teach harmony as Bach practised it: the plan of cadences, the
  fundamental bass, the bass line, the figures, four real voices. That is the grammar of every
  chord in the WTC.
- **The WTC** is where Bach composes with both at once, in two ways that the two halves of each
  pair make plain:
  - a **prelude** often unfolds a harmony in a figuration. Prelude 1 in C is a figured bass realised
    as a keyboard texture: one figuration pattern, one chord per bar;
  - a **fugue** is counterpoint governed by a subject: every voice takes the subject in turn, and
    the rest of the texture has to fit against it (answer, countersubject, episodes, stretto).

So the WTC mode is not a new grammar. It applies the grammar of the two earlier modes to the forms
Bach wrote in. That fixes the order of its levels: first harmony laid out in time (the preludes),
then counterpoint laid out against a subject (the fugues).

## 2. The preludes

The levels below follow the chorale mode's top-down order (plan before detail; C4).

| level | the player | judged by | status |
|---|---|---|---|
| P1 harmonic plan | chooses the chord of each bar from four over Bach's bass, hears it in Bach's figuration | the bar-by-bar comparison with Bach's chord, its figures and fundamental | **built for Prelude 1** (`src/ui/PreludeApp.tsx`) |
| P2 figured bass | is given Bach's bass and figures and realises each bar (types or places the upper notes) | voice-leading by the Fux and chorale rules; the realisation compared with Bach's voicing | proposed |
| P3 the bass | is given the upper voices and writes the bass | the chorale mode's bass criteria; comparison with Bach | proposed |
| P4 figuration | chooses or designs the pattern that breaks the chords | listening; comparison with the other figuration preludes | proposed |

Prelude 1 is the model. Next would come the other preludes built on a single figuration pattern.
Which preludes those are should be measured, not assumed: a measure of how regularly each bar
repeats one pattern, computed from the notes, is the next tool to write.

## 3. The fugues

The fugue analysis of all 48 is built (`tools/wtc/fugues.py`, `docs/wtc/FUGUES.md`). It finds the
subject, the answer (real or tonal), the entries (in prime, inversion, augmentation and
diminution), the exposition, the stretti and the episodes. It reproduces the facts any analysis
states: 1/1 has 24 entries, 1/8 is augmented from bar 62, 2/2 is augmented, 2/9 is diminished. That
analysis is the data for these levels:

| level | the player | judged by |
|---|---|---|
| F1 hearing the subject | marks where the subject enters, in which voice and form | the computed entries (with the reading's stated limits) |
| F2 the answer | writes the answer to a subject: real or tonal, and where the mutation falls | Bach's answer; the rule of tonal mutation (the fifth answered by the fourth) |
| F3 the countersubject | writes a line against the answer that also works inverted at the octave | Fux's rules (two voices) checked in both positions; Bach's countersubject |
| F4 the exposition | plans the order of voices and keys of the entries | Bach's expositions (the 48, counted) |
| F5 episodes | builds a sequence from a fragment of the subject | comparison with Bach's episodes |
| F6 stretto | tries the subject against itself at a chosen distance and interval | the engine's rules, then Bach's stretti (190 found) |

F3 and F6 are where the Fux mode pays off: invertible counterpoint and stretto are two-voice
counterpoint problems that the existing engine can already judge.

## 4. Judging

As in the chorale mode (C4), the masters' choices are the feedback. A choice is set beside Bach's
and beside his habit across the 48, with examples. Only what Bach virtually never does counts as
an error, and the owner decides those boundaries.

The WTC harmonic reader (`tools/wtc/harmony.py`) shows how far computed judgement goes. Measured
against the When in Rome analyses (31 pieces, 3,679 segments), it finds the analyst's root in
83.3% of segments, with each piece read on parameters fitted to the other 30. Reading the bass as
the root gets 48.3%. Some of the remaining disagreements are rival theories of the fundamental
(six-four chords, diminished sevenths, leading-tone chords), not errors. So computed harmony can
inform the comparison, but it should not decide right and wrong.

## 5. Sources and rights: the owner's decision

- The Humdrum edition (`humdrum-tools/bach-wtc`) reserves "derivative electronic formats", so its
  notes stay local (`data/local/`, git-ignored). Only facts derived from it are committed:
  subjects as pitch names, entries by bar, counts.
- For notes the game plays and shows, the public-domain Mutopia editions are used.
  - Prelude 1 is vendored (`data/wtc/sources/mutopia/`), and its 32 chord bars match the Humdrum
    edition pitch for pitch.
  - Mutopia's coverage of the 48 still has to be surveyed piece by piece.
- Options for the rest, for the owner to choose:
  1. Mutopia only, levels built where it has the piece.
  2. Ask CCARH or the Humdrum editors for permission.
  3. Encode from the Bach-Gesellschaft edition (public domain). The scans are raster images, not
     vector glyphs, so the Kittel extractor does not apply, and the cost is high.
  4. Fugue levels use subjects and answers only: short, and transcribable from any public-domain
     print.
