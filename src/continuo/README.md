# Basso continuo (dev module, not integrated)

An optional keyboard accompaniment for a solved exercise: a figured-bass realization in the
manner of early-18th-century Vienna, played with the two sung voices. For pleasure, not grading.
Occasional parallel fifths or octaves in the accompaniment are tolerated; a wrong note against
the sung voices is not.

Nothing in the game imports this folder. The only entry point is the dev harness.

## Files

| file | role |
| --- | --- |
| `types.ts` | public types (input, options, events, per-bar metadata) |
| `costs.ts` | `COSTS` (every voicing cost) and `DEFAULTS` (window, span, bass range) |
| `input.ts` | game representations → sung notes on the half-note grid |
| `frame.ts` | A1 frame of each bar, A2 chord choice |
| `voicing.ts` | A3 candidates, transition costs, Viterbi; A4 colla parte |
| `enrichment.ts` | A5 second-species upbeats and passing notes |
| `realize.ts` | `realizeContinuo`: the pipeline, timed events, statistics |
| `audio.ts` | Web Audio renderer, presets, offline rendering |
| `dev/harness.ts` + `/continuo-dev.html` | listening harness |

## API

```ts
realizeContinuo(exercise: CounterpointInput | MultiVoiceInput, options?: Partial<ContinuoOptions>): ContinuoRealization
playContinuo(exercise, realization, { preset, tempoBpm?, startTime?, includeSungVoices?, masterLevel?, inegal?, temperament?, sungSynth?, audio?, onBar? }): { stop(), done }
renderContinuoOffline(exercise, realization, options): Promise<AudioBuffer>
inputFromSolution(OriginalSolution) / inputFromPlayer(Exercise, PlayerSolution): CounterpointInput
```

The two-voice input is the rule engine's own `CounterpointInput`. `MultiVoiceInput`
(`{ modalFinal, voices: [{ id, notes }] }`) is for the 3- and 4-voice exercises to come.
Pitches stay spelled throughout (`"C#5"`), so temperaments distinguish C♯ from D♭.

Time is in half-note beats: bar *b* is `[2b, 2b+2)`. Events are
`{ startBeat, durationBeats, midi[], pitches[], role: 'bass'|'rh'|'doubling', bar, label }`;
per bar: `{ figure, chordPcs, chord, fallback, notes, bass, rh, cost, upbeat? }`.
The function is pure and deterministic (no randomness; ties broken by the lower top note).

## Rules

**A1 Frame.** At each downbeat the sounding sung notes; the bass is the lowest, whichever voice
it is (crossings switch it). With nothing sounding on the downbeat (a half rest in the only
other voice), the first sounding note is the frame.

**A2 Chord.** Material: white keys, except letters that a sung voice of the same bar inflects
(ficta). The generic interval of the upper voice over the bass decides:
6th → 6/3; 5th → 5/3; 3rd, octave, unison → 5/3, but 6/3 if (a) the bass is B natural,
(b) the bass rises by a diatonic semitone to the next bar's bass (mi → fa),
(c) the bass is sharped. *Addition:* also 6/3 when the 5/3 would have a diminished fifth
(E with B♭ in an F-mode bar).
With three distinct sung pitch classes the chord is exactly their set.
Final bar: `organist` (default) complete triad with a major third (the only accidental the
continuo may add; a sung minor third is kept), `strict` octave and fifth, with the major third
instead if the fifth would make consecutive fifths with the bass of the previous bar.
Validation: the chord must contain every sung pitch class, otherwise colla parte.

**A3 Voicing.** Three right-hand notes in the window (default G3–D5), outer notes within an
octave, all above the continuo bass, every chord tone present with the bass, sharped tones
never doubled. Doubling preferences (5/3: the bass; 6/3: the third or sixth) are a small cost,
as is a doubled unsharped leading tone (mi before fa, +10). Transition and bar costs as in the
brief; Viterbi over the whole piece.

**A4 Colla parte.** For bars whose chord fails validation, or whose cost on the best path exceeds
`COSTS.fallbackThreshold` (25). The right hand doubles the sung upper voice(s) by octaves next to
the previous right hand, and follows them on the upbeat; one more chord tone of a consistent
5/3, 6/3 or 6/4 is added if one exists, and dropped at any onset where it would clash.
*Choices:* the threshold is measured above the bar's cheapest candidate (the register cost that
every candidate shares, e.g. when both voices are low, is not a fault of the path); the final
bar never falls back on cost.

**A5 Second species.** At each sung onset inside a bar:
chord tone → hold (the harpsichord re-strikes); upper voice to a consonant non-chord tone over
the held bass → the voice(s) holding the outgoing tone move by step (`5 6` / `6 5`); the bass
moves to a consonance → re-figure with A2 and voice-lead minimally (figure `6/3 · 5/3`, one
figure per bass note); dissonant passing note → hold (transitus). `passingFill` (default on):
a right-hand voice held through the bar that must move a third (or a fourth) into the next
downbeat gets a stepwise passing note on the upbeat, unless it would form a unison, octave,
second or seventh with a sung note there.

**Continuo bass octave (addition).** Fux's lowest voice is often a tenor or alto (D4–A4).
With the bass at pitch the right hand has no room above it, so with `bassOctaves: 'auto'` the
left hand plays the lowest sung voice one (rarely two) octaves lower, the shift chosen per
exercise to keep it in C2–G3 without needless shifting (as an organist does with a basso
seguente). "Above the bass" means above the continuo bass. `bassOctaves: 0` keeps it at pitch.

## Tunable constants (`costs.ts`)

`COSTS`: `motionPerSemitone` 1, `commonToneHeld` −1.5, `leap` 2 (over `leapSemitones` 4),
`parallelWithBass` 6, `parallelWithSung` 3, `doubledLeadingTone` 10, `topAboveSung` 2/semitone,
`notClose` 1, `doublingNotPreferred` 1, `fallbackThreshold` 25. Overrides per call:
`realizeContinuo(x, { costs: { parallelWithBass: 12 } })`.

`DEFAULTS`: `window` G3–D5, `maxRhSpan` 12, `bassRange` C2–G3, `bassOctavePenalty` 0.5,
`maxBassOctaves` 2.

## Presets (`audio.ts`, `PRESETS`)

1. **stile antico** — organ only, stopped-flute 8′ + quiet 4′ (bass 8′ only), right-hand common
   tones tied, no rolling, low level; second species: A5 changes and passing notes, no re-strikes.
2. **cembalo** — Karplus–Strong harpsichord (seeded), chords rolled bass-first at 25–45 ms
   (seeded, deterministic), the final chord at 90 ms per note and re-struck at half its length;
   bass doubled an octave lower above C3; upbeat: top two held notes re-struck softly.
   `inegal` (off by default, a stylistic liberty) delays that re-strike by 10% of a half note.
3. **Hofkapelle** — principal organ (8′ + 4′ + quiet 2′), the harpsichord a little softer,
   strings doubling the sung voices, cello on the continuo bass and violone at 16′.

All three: a light generated-impulse reverb (the game's `FxChain`), a compressor/limiter
before the master level. Default tempo: half = 60 (second species), whole = 40 (first).
The sung voices use the game's own `Synth` and temperaments.

Measured offline (game default sound for the voices, master 0.8): peaks about −5 dBFS in all
presets; Hofkapelle's accompaniment alone is about 6 dB below the full mix.

## Harness

`npm run dev`, then open `http://localhost:5173/continuo-dev.html`. Lists Fux's first- and
second-species solutions; preset, finals, tempo, level, passing fills, inégal, sung voices
on/off, their timbre and the temperament; a bar-by-bar table (voices, right hand, continuo
bass, figure, upbeat treatment, cost; hover a column for the rules that fired); an offline
render that reports peak and RMS. `vite build` does not include it.

## Tests

`node --test test/continuo.test.ts` (part of `npm test`): all 22 two-voice first- and
second-species solutions × both finals — chord contains the sung pitch classes or the bar is
flagged; right hand in the window and above the bass throughout; no right-hand clash with a
consonant sonority (downbeats and upbeats); passing notes never clash; determinism; finals.
Plus the A2 table, finals, colla parte on a deliberately odd counterpoint, a three-voice set,
the half-rest opening and the options. The run prints a per-exercise summary
(colla parte bars, parallels, passing notes).

## Known limitations

- Cross-relations are not avoided: a bar may use B natural next to a sung B♭ in the neighbouring
  bar (the brief forbids adding accidentals the sung voices of the bar do not have).
- Viterbi sees downbeats only; the A5 upbeat changes and passing notes are applied afterwards,
  so a parallel between an upbeat and the next downbeat is neither costed nor counted.
- Parallels are counted between consecutive downbeats only.
- Passing fills only into thirds and fourths, only in bars with a sung upbeat.
- `preset` in the options is recorded but does not change the realization.
- Tempo is read when playback starts; changing it means restarting.
- The game's `AudioEngine` keeps its `AudioContext` private, so the harness uses its own
  context. Integration would pass `{ ctx, destination }` from the engine (one getter there).
- Third-species onsets would be handled by the same A5 logic, but only first and second species
  are tested. Fourth and fifth species (ties, suspensions) are not modelled.
