# Preludes on a phone: a design brainstorm (24 October 2026)

The owner: "Take some time to think about the other easy preludes, and start brainstorming ideas of
tailored gameplay mechanics for them. We should be open even to mechanics which substitute, or modify,
the two rows of 5 buttons layout ... wouldn't vertical rows be more useful for mobile vertical gameplay
than horizontal? ... Since the preludes are not as uniform as the fugues, the door is open to different
game designs being instantiated in them." Open questions for the owner at the end. Sources: Ledbetter's
notes (docs/touch/LEDBETTER-PRELUDES.md); prior-art research (to be added when it returns).

## The design space

What a prelude asks of a player differs more than a fugue does. The easy ten, by Ledbetter's types:

| prelude | type (Ledbetter) | what it is about |
|---|---|---|
| 1 C | toccata arpeggiata; harmony elaborated | the chord progression; the pedal |
| 4 c♯ | siciliano, cantabile, sonata shape | a sung line; the rocking rhythm; spread chords |
| 6 d | Corellian violin moto perpetuo | unbroken motion, legatissimo; two pedals; cadenza |
| 8 e♭ | tombeau, Vivaldian slow movement | a florid line over chords; ornaments; the great descent; cadenza |
| 12 f | sonata moto perpetuo; overholding | resonance (notes held over); the pedal's ramp; the release |
| 14 f♯ | two-part invention (Couperin's progrès de quartes) | two voices in conversation; trills; the return |
| 16 g | sonata Adagio; messa di voce as a trill | one long swelling trill; a sung line |
| 18 g♯ | invention over a harmonic formula | the stages of intensification; a hemiola; Bebung chords |
| 22 b♭ | toccata arpeggiata of chords; lamento | chord density as dynamics; the bass's descent |
| 23 B | cantabile clavichord exercise | touch; the pause on the leading note; the four-part close |

So there are at least five "verbs" a prelude can be about: **figuring a harmony** (1, 22), **singing a
line** (4, 8, 16, 23), **keeping motion unbroken** (6, 12), **conversing in two voices** (14, 18),
**ornamenting and shaping** (8, 16, 18). A single layout serves some of them badly.

## Layout families (to compare; several could coexist, one per prelude)

1. **The highway** (now): five lanes, notes falling to a line, two rows of pads. Strength: familiar,
   reads ahead well. Weakness: pitch is left–right (a keyboard's logic) while the eye reads it falling;
   the second row of pads is unused.
2. **Two vertical ladders in portrait** (the owner's idea): a column for each thumb at the screen's
   sides, pitch by height (up = higher, the staff's logic, as the fugues' LADDER), the music scrolling
   between them right to left (the music box) or downward. Strength: pitch as height is how melody is
   heard; each thumb owns a line (inventions: 14, 18; melody and bass). Weakness: thumbs travel
   vertically, a long way on a tall phone; less read-ahead than a highway.
3. **Chord strips** (after GarageBand's smart instruments): the screen a few vertical strips, each a
   chord of the progression as it comes; the player strums or taps within the strip, the game supplying
   the right notes of the figure in the order touched. Strength: plays the harmony itself (1, 22, 4's
   spread chords); a sweep is an arpeggio. Weakness: pitch accuracy fades into gesture.
4. **Trace the contour** (after path-tracing games): the line drawn as a path; the thumb stays down and
   follows it in time, legato by nature. Strength: unbroken motion (6), the great descent (8, bb. 28–35),
   the bass's lamento descent (22). Weakness: tiring if long; best in passages.
5. **Free time** (a wait mode: the music waits for the player): cadenzas and recitative (2's Adagio, 6, 8
   and 5's cadenzas); scored on the shape (an arch of speed, the arrival), not the clock.
6. **Expressive strip**: one thumb's place along a strip is loudness (or the swell), the other plays;
   messa di voce (16), Bebung (18, 23), chord density (22).
7. **Call and answer**: the game plays a phrase, the player answers (imitation in 14 and 18; the head
   entries in pairs in 13). Not a memory test: the answer is shown.
8. **A minigame per prelude** (after Rhythm Heaven: each song its own small game fitted to its
   character): the extreme of "designs instantiated in each prelude". Strength: variety, character.
   Weakness: a new thing to learn each time; harder to build and balance.

A middle way: a few layouts (highway, two ladders, strips, trace, free time) used by several preludes
each, with one tailored challenge per prelude on top (as Prelude 1's pedal).

## Tailored ideas, the easy preludes

- **1 C** (built: the figure passed on by section, the pedal, the final chord). Alternative to test:
  chord strips, the player choosing each bar's chord from two or three (the harmony heard and chosen)
  and strumming the figure; the hidden top line (the voice leading through the chords) lit.
- **4 c♯, siciliano.** Two ladders: the right thumb the sung line, long notes held to their end; the
  siciliano's long–short–long as a rocking gesture; the arpeggio signs (bb. 3, 8, 34) as a sweep. Climax
  (bb. 30–31): the bass takes the siciliano rhythm down to its lowest note: the player crosses to the bass
  ladder for those bars and descends to the bottom, holding the last note.
- **6 d, violin moto perpetuo.** Trace: the thumb keeps down and follows the triplets' contour (bowing:
  continuity is the skill, legatissimo); the two pedals from b. 15 (tonic, then dominant) held by the other
  thumb; the cadenza chords in free time.
- **8 e♭, tombeau.** A slow sung line: holding each note its length, the ornaments as gestures (turn
  b. 13, mordent); the descent from the top c‴ (b. 28) to the bottom D♯ (bb. 32–35) as one traced sweep;
  the cadenza after b. 35 in free time.
- **12 f, overholding.** Resonance: each note of the broken chord held on builds the chord (two thumbs
  alternating holds; pillars of sound rising); letting go early thins it. Climax: the dominant pedal's
  ramp to b. 20, then the release: everything let go on b. 21's downbeat and the low C struck.
- **14 f♯, two-part invention.** Two ladders, two voices: the player takes one voice and taps the other's
  strong beats, or both at the easy tier with the quicker voice riding; the trills (bb. 12, 18) by the two
  thumbs alternating; the return at b. 22 (the opening, intensified) as the climax: both voices.
- **16 g, the swelling trill.** The trill as the main event: two thumbs alternating, starting slowly on the
  main note and accelerating (Ledbetter: a ribattuta, not "an alarm clock"), with a swell (an expressive
  strip, or the thumbs moving outward) as messa di voce.
- **18 g♯, intensification by stages.** From b. 19: a chord a beat, two a beat, then the hemiola (the beat
  regrouped: the accents move, shown as the grid redrawn), the Bebung chords at b. 24 (a held thumb
  wiggled), the diminished seventh at b. 25 as the summit.
- **22 b♭, chordal lamento.** Chord strips: a sweep's width is the chord's size, and fuller chords are
  louder (Ledbetter: dynamics from the number of notes); the bass's descent (bb. 16–19) traced step by step.
- **23 B, clavichord touch.** A sung line with touch (the dynamic strip); the pause on the leading note
  held until the resolution is cued (tension and release); the last four bars in four parts with the low
  F♯: chords with both thumbs.

## How to keep avenues open (experiments)

- A **prelude mechanic** as its own module: layout, judgement and drawing (arc.ts already gives each
  prelude its own arc); a piece declares its default, and a dev switch in the address (`?mech=ladders`,
  `?mech=strips`, …) puts any prelude in any layout, so they can be compared on the same music.
- Prototypes small and quick: one prelude per layout first (14 on two ladders; 22 or 1 on strips; 6 or 8
  on tracing), playable on the phone, judged by the owner before anything is generalised.
- A short questionnaire after each test (fun, clarity, insight, comfort), so the comparison is not only
  impressions.

## What prior art teaches (research, 24 October 2026)

- **Fit the mechanic to the music, keep the inputs simple.** Rhythm Heaven was pitched because button
  timing in rhythm games "had nothing to do with music"; its maker sometimes wrote the song first and
  built the game round it (Tsunku♂: Nintendo Life 2009; Iwata Asks, *Megamix*). Rhythm Doctor uses one
  button to "do away with arbitrary beatmaps" (Hafiz Azman, Game Developer, 2014). Sayonara Wild Hearts
  changes the mechanics every level but keeps the inputs, and so never needs a tutorial (Simogo, Game
  Developer, 2019).
- **Anchor changes to the music.** VOEZ's lanes multiply, move and merge with the song, on beats without
  notes (TouchArcade 2016; Nintendo Life): structure shown without new inputs.
- **The player must choose something real.** Magic Piano's player "drives the performance" (tempo follows
  them; US patent 9,082,380), but a review called it "by no means any way to learn the piano" (AOL 2010):
  supply too much and play is hollow. Let the player own the voice, the harmony, the contour or the time.
- **Chord strips** exist and work (GarageBand Smart Guitar/Strings: strum a strip, tap a string, Autoplay;
  on Strings, swipe speed is loudness, lifting plays pizzicato). **Tracing** works (Groove Coaster: "the
  musicality that is being tested… not a mastery over tricky controls"; Arcaea's arcs). **Wait mode**
  works (flowkey). **Fugue Machine** (a sequencer, 2016) shows fugue-like playheads; no Bach rhythm game found.
- **Ergonomics.** People touch the centre more, faster and more accurately (about 7 mm there, 12 mm in
  the corners); key actions belong in the middle half to two-thirds of the screen; grips change every few
  seconds (Hoober, UXmatters 2013, 2017). Touch timing is noisier than keys' (Lee and Oulasvirta, CHI
  2016): generous windows, or holds and slides where timing matters less.
- **Consequences for us.** Our two rows of pads sit at the bottom edge, the least accurate zone and the
  home indicator's; vertical ladders suit a two-thumb cradle and show pitch as height, but if pitch is
  vertical, time cannot also fall vertically: the notes must come sideways (the music box's scrolling,
  centre outward as in Lanota) or the timing come from a sweep line or the sound.

## Questions for the owner

1. **The core experience.** On a phone, what should a prelude make the player feel they are doing: playing
   the notes (accuracy), feeling the motion (flow), understanding the structure (harmony, voices), or
   shaping it (expression)? A ranking would steer every choice.
2. **Orientation and hands.** Preludes in portrait with two thumbs (now), portrait with one hand, or
   landscape like the fugues? Is it a virtue that preludes and fugues feel physically different?
3. **Pitch as height or as left–right?** Up = higher (the staff, the fugues' ladder) or right = higher (the
   keyboard)? Should the whole game agree?
4. **One system or many?** A consistent prelude system with a tailored challenge per piece (as Prelude 1),
   a handful of layouts shared among the preludes, or a distinct small game per prelude?
5. **Playing harmony instead of notes.** In the chordal preludes (1, 22), is it acceptable that the
   player chooses or strums chords and the game supplies the exact notes, or must the player always
   produce each note?
6. **Free time.** Can the music wait for the player in cadenzas (breaking the rhythm game's clock for a
   few bars), scored on shape rather than timing?
7. **Two lines at once.** Should a player ever play both hands (simplified: the line and the bass's
   strong beats), or always one hand as now?
8. **Learning load.** At most one new mechanic per prelude, taught in its first bars, or are you happy
   with more?
