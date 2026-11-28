# Backlog: fixes and ideas for later

Things the owner wants kept in view but not implemented now. Newest first. Move an item to
DECISIONS.md (or delete it) when it is done or dropped.

## Organ trio sonatas, BWV 525-530 (research only, 28 November 2026, second account; nothing built, no D-number)

Report: docs/research/ORGAN-TRIO-SONATAS.md. Three lines each (two manuals, pedal): the game's shape. Free scores found for BWV 528
and 529 only (Mutopia, public domain, the game's reader takes both); the other four to look for in PDMX (Zenodo was out of this
session's reach). Suggested first slice BWV 529. Owner to decide: organ or chamber-trio sound (D437), first slice, pedal as a part.

## Keyboard suites in the developer game (owner's rulings 28 November 2026, D1078; research done, no build yet)

Report: docs/research/KEYBOARD-SUITES.md. Owner: tempo changes inside a piece must be possible (no prohibition); first slice French
Suite 5 (BWV 816); ornament signs from Mutopia by a cheap text route; no repeats in play, but a REPEAT thumb button in the last two
bars (press = repeat, otherwise none); printed versions preferred; look harder for Partita sources. Open: bass lines, rhythm,
how many suites, picture-worlds, rights (Partita 1 metadata oddity; CC BY-SA files only as a check).

## Strings: dragging should glide, not swell: DONE (D1073, WTC 3.40)

The owner approved the glissando timed by the thumb after the listening page (D1072); `MECH.slideGlide` "speed" is the default
on STRING CONSORT, BAROQUE BAND and ORCHESTRA & ORGAN. Left open: whether the lute's long-leap glissando (D426) should follow.

## PSYCH guitar: plain at the tap, effects by gesture (owner, 28 November 2026; APPROVED to prototype; no work yet)

The owner: "the psych guitar seems too much at its basic sound. Things like delay and big effects ought to be such that you can
add them by doing horizontal and vertical things, but not immediately on by simply tapping". Today the fuzz is baked into the
recording (k2Fuzz, sample rockGuitar2). Sketch shown to the owner: tap = plain, slightly crunchy guitar; a long hold grows a
delay/echo; sideways sway brings in fuzz in proportion, back-and-forth adds wah (bend/vibrato kept); slide = the glide, smeared by
the echo if on; lift = effects fade with the note. Vertical on a held note stays the ornaments. Colour and sustain only, never
level (D508). Sound change: prototype + A/B listening page before it ships.

## Instrument gestures, by batches (agreed 24 November 2026; the owner is short of tokens)

**A strong priority** (the owner, after playing 3.35: "having horizontal and vertical dynamics that can really let
the player improvise on sound is something that should be a strong priority of us ... I'm rediscovering the game,
and it rocks"). Batch 2's guitar hands (D1061-D1064, D1066) are live since WTC 3.37; the next is Batch 3 once the owner has
played them.

**Testing (WTC 3.38, D1069-D1070):** the developer view's SETTINGS › TEST SCENES. Measured: the hard pick is slight on every guitar
(+0.9 to +2.2 dB in 2-5 kHz over the first 100 ms) and the pick's place nearly lost on the fuzz (+1.8 dB edge to edge, +5 on a
clean guitar): a stronger flick, and a stronger place on the fuzz, would be sound changes (a listening page first) if the owner
wants them.

**Tilt, PARKED for research (D1071):** on the owner's phone lean and steer did nothing he could hear, and steering rotated the
screen and stopped the game (the page must not rotate or pause on a steer; investigate the sensor reading on a real
iPhone/Android before any retry). Off for every player since WTC 3.38; the developer view's TILT (PARKED) switch turns it on
(the code kept: src/touch/tilt.ts, the bloom and stompboxes in chip.ts). Kept for a retry, the per-family table once approved:
other guitars lean wah, steer neck/bridge pickup; flute lean rolling in/out, steer flattement; brass lean bell up/down, steer mute;
strings lean bow contact point, steer no vibrato / mute; organ lean swell, steer flute / reed; harpsichord steer one manual /
coupled; piano steer soft / sustain pedal; voices lean vowel, steer chest / head; synths lean mod wheel, steer glide off / chorus;
GAME BOY steer pulse / wave channel.

Batch 1 is done and live in WTC 3.35 (D1055-D1059: STRING CONSORT bowed by the held thumb, the Lab's OLD/NEW chooser, the
developer view's NEW MECHANICS switch, MECH.bow); since WTC 3.36 the main game's default for STRING CONSORT (D1060, the owner approved after playing it).
From now on new mechanics go in the developer view only (MECH flags), not the New Lab's free play.
Batch 2 (D1061-D1064, D1066): every guitar's pick place, hard pick, bend (a quarter tone), hammer-on/pull-off, glide
(`src/touch/guitar.ts`, `src/bench/guitaring.ts`, MECH.guitar), play.html's default for every player ("directly to main game, I
believe you"); the developer view's GUITAR HANDS switch turns it off. Left open: a guitar slide over more than a fifth is a fresh
pick, not a glide.
The common frame per family: on one note (landing place, landing flick, held back-and-forth sway, held
one-way push), between notes (tap with a gap, thumb-to-thumb join, set-and-release, slide); vertical shakes
stay the ornaments. Horizontal responses continuous wherever possible (no classifier). Never adds notes.
- **Batch 3** voices and winds; **4** brass, organ, harpsichord, piano; **5** synths and chips (designs to
  draft per family in the frame above, the owner to approve each).
- **Then: a USER'S MANUAL** with playable animations: the game and the music box shown, arrows drawn on or
  around the notes in sync with the thumbs' vertical and horizontal movements, extending over time as the
  sound does. Not started; after the mechanics are approved.
- **Open from Batch 1:** low cello notes
  swing about ±4 dB on headphones (fine on the phone model); PASSAGE bowing not driven live; BAROQUE BAND and
  ORCHESTRA & ORGAN strings not bowed (no pp/ff layers).

## Two-thumb test bench (`prototypes/bow-test2/`): sounds button (added 24 November 2026, not started)

The owner: add a sounds button to the touch-area prototype that switches between instruments, and bring in
some of the main game's good sounds and playing knowledge. Three instruments: one synth, one flute (the
game's flute), one piano (the game's piano). Use what the main game has learnt about playing, so the
prototype plays better. The prototype is throwaway (its own folder, not part of the game); the standing rule
on sound changes (the owner listens first) applies if anything moves into the game.

## Code audit, Phase 2 (quick wins done 24 November 2026; the rest not started)

Report: docs/audits/CODE-AUDIT-PHASE1.md. Done and live (WTC 3.28-3.33; D1050-D1053): deploy of #496/#498; quick/full test tiers
and hand-written JSON types (tsc needs no memory flag); the retired features deleted (MANUAL, TWO HANDS, unoffered readings,
FILM, SYNTH_LAYERS_SOUND, five skins); index.html is a redirect and the counterpoint app is no longer published
(`counterpoint.html`, developer only); lamejs and Glenn's film load when used; x.tmp.ts gone; DECISIONS.md split.
The play page's first download went from 1.67 to 1.41 MB compressed, the whole site's code from 10.6 to about 5.3 MB.
Also done (WTC 3.34, D1054): `pieces.json` split into stubs plus one chunk of notes per piece (play page first download 1.41 → 0.93 MB compressed).
Still open, by payoff: split the giant files (stage-bg, sound, chip, BenchApp); frame rate on a real
phone; rename bench to game; Prettier and ESLint; `public/scans` (3 MB) deleted (D1075; the old app's only);
`public/sheet` (11 MB) deleted with the SHEET display modes (D1077, WTC 3.41). Owner to do: run `tools/delete-merged-branches.sh` (see docs/audits/MERGED-BRANCHES.md); set GitHub's default
branch to the dev branch.

## Paused on 23 November 2026 (the owner: "I don't want to spend any tokens right now on these things, so add them to backlog")

All worker sessions were stopped at the owner's request; resume only when the owner says so.

- **Ornament slurs (shakes), APPROVED.** Instruments' gesture proposal (draft D1040,
  prototypes on `claude/instruments-gesture3-proto`, behind a flag that is off): an ornament plays as one slurred
  sound with the print's exact pitches and times: brass lip trill, GAME BOY pitch-command trill, SWITCHED-ON legato
  trill, guitar softer re-strike (hammer-on). Then winds and voices; strings' one-bow trill later; organ tremulant
  and brass lip vibrato onto sway. The owner: "Instrument shakes are good, I like them."
  **Status (28 Nov):** the four are built behind `SHAKE_PROTO` (off), D1074; listening page `public/dev/shake-slur/` (A today,
  B slurred, per instrument) waits for the owner's ear. Nothing flips until he has listened.
  **Status (28 Nov, later):** the rest is built behind the same switch, D1076: winds (oboe, flute, bassoon), sung voices (SOLO VOICES,
  VOCAL SYNTH), the strings' one-bow trill, and, onto the sway, PIPE ORGAN's tremulant and BACH BRASS's lip vibrato (instead of
  today's swell). Listening page `public/dev/shake-slur2/` (six trills, two sways; A today, B proposed). Nothing skipped. Waits
  for the owner's ear; defaults stay off.
- **Crab canon morph, option A ("the turn"), APPROVED.** The Canons prototype on `claude/crab-proto` (D977,
  `play.html?fm=crab`): each forward segment appears as a contour over its landing and turns back to front as it
  drops, colour in step. The owner: "I like the crab canon suggestion, build A."
- **Retiring FLUTE & HARP and ZELENKA: DROPPED (D1067).** Both stay; PR #499 closed. A player loves ZELENKA TRIO and BACH BRASS.
- **Prelude II/1's plucked bass line on a sustaining instrument:** an A/B the owner wants to hear ("Maybe yes. Try it out."). Not started.
- **Strings.** Synthesized strings REJECTED ("I hate the synthesized strings, they're pointless"); STRING CONSORT
  stays as it is. BAROQUE BAND keeps its old violin and cello with the new oboe; the sampled strings still need a
  better answer some day (stride, the 2–5 kHz share; see the strings research, D1034).
- **Also waiting:** the remaining audit items (SUPER 16-BIT strings, sung voices, BACH BRASS attacks, ORCHESTRA &
  ORGAN with no default piece); Instruments' per-instrument sway/slide/shake design beyond the ornaments; the
  Musical Offering trio sonata's real voicing (stopgap levels on SUPER 16-BIT are live); the owner's 1741 Goldberg
  print (Var. 9 bar 11, Var. 24 junctions) and BG 31.2 scan (Canon a 4 octaves) in Drive; the Fuga a 2 Clav. (no
  word yet); the prelude ABOUT notes (#474) and the preludes leaving the developer view (owner to try first).

## Chorales (22 November 2026)

- **Lyrics at the top of the music box, not the bottom.** The owner: "chorales lyrics should appear on top of
  music box, not bottom. possibly the lyrics could appear in the upper rectangle box which displays title of piece.
  but maybe it's a better idea to have them top of music box, below upper rectangle title box." Leaning: a line at
  the top of the box, just under the title bar (D679's words line moved up). Live hit-test at 932 and 667, and keep
  it clear of the cadence names and the ornament hint.

## Chorales (18 November 2026)

- **Fewer fermata slowdowns in the chorales.** The owner: "I want to eliminate the fermata slowing downs of the
  chorales, they're repetitive and disruptive. Maybe it's because they're excessive and so consistent. Perhaps they
  need be rarer and, sometimes, more subtle ... let's go for a simpler route and simply reserve them for the last
  fermatas. If there is some easy way of singling out some other important fermatas in the pieces by a general rule
  (thus avoiding the need for token intensive research into each particular chorale), you may also treat those as
  fermata worthy. The idea is that the chorales will flow more naturally now, less disruptions."
  Plan: the final fermata keeps its hold; every other fermata plays in time (at most a short breath). Candidate
  general rules for a few more, to put to the owner first: the fermata that closes the Stollen (before the repeat),
  and an interior fermata on a perfect cadence to the tonic. No per-chorale research.

## Touch game, play.html (open items, 26 October 2026)

- **The tutorial's Invention 1 subject should end on its resolving note.** The owner: "the subject
  of invention 1 in the tutorial ought to end in the concluding note for resolution. Right now it
  ends at a place which gives the impression that it still ought to finish by having one more
  note." Check every tutorial step's passage end (`toBar`, `until` in src/bench/lessons.ts), not
  only step 1, so each ends on a note of arrival.
- **Herr Bach's dialogue box covers the music box; the space below it lies empty.** The owner's
  screenshot (lesson 1, phone landscape): the box sits over the roll while the band under the
  legend is unused. Place it in the free band (or let the layout give it one) so the notes stay
  visible while he speaks. Part of the visual redesign below.
- **Visual redesign of the music box and the screens round it.** Audit and five directions made
  (Nocturne Roll, Engraved, Console Sixteen, Light and Ink, Two Scales); waiting on the owner's
  choice. The gold subject stripes are already gone (D287).
- **Sound: phases 1 to 3** (D288 is phase 0): a sound-check bench with a phone-speaker simulation
  and measurable rules (distinct spectra per voice, sharp attacks, a rich bass, dry on phones),
  three or four new presets built to them, a phone master chain, and the owner's listening
  verdicts (the Fugue Sound Trials page) to set the defaults.
- **Special challenges** for the 48 fugues and the tempo unlock (10 bpm to the fastest recording):
  table awaiting the owner's review; Book II Nos. 1 and 15 to decide.
- **Thinner entry tags** in the box (optional), and the **BGA ornament comparison** (optional).

## Well-Tempered Clavier (the goal; night of 9-10 October 2026)

The owner: the end goal of the whole game is a Well-Tempered Clavier mode. The lab session's work
towards it (branch claude/beautiful-mccarthy-7li5nv); the proposal is docs/wtc/CONCEPT.md (levels
0-8, preludes beside). The main session has its own first layer (D119, ASAP expositions, answer and
tonal two-voice engines) and builds the screen; the two readings were cross-checked
(docs/wtc/crosscheck.md).

- Data: the 48 preludes and fugues and the 30 Inventions and Sinfonias from the Humdrum encoding
  (Huron 1994; **rights to settle before any public build**: data/sources/bach-wtc/SOURCE.md).
- Analysis (src/wtc/): subject and answer, answer rules (Bach's head rule law-like: 17 of 17, 7 of
  7), entries through each fugue (by the subject's head where tails vary), the key of each entry,
  strettos, episodes and sequences, countersubjects, harmonic reduction of the preludes, tunings.
- Studies (docs/wtc/): answers, countersubjects, key plans, strettos and episodes, cross-check.
- Lab prototype: the WTC tab (map, period tunings, harmony of the preludes; exercises: find the
  entries, answer the subject, plan the keys).
- Open: countersubject invertibility needs a test with the bass; Book II no. 11's answer note 2 to
  check; entries in a few fugues are still under-found (Book I nos. 3, 6, 12; Book II no. 18).

## Study area (Lectio)

- **Facsimiles of the book.** Show page images of the *Gradus* where they look good, e.g. next to
  the Latin passages. The 1725 Vienna print is preferred (the upstream dataset's scans,
  `source_pdf/gap_pNNN.pdf`, printed page = file − 8, already cover pp. 45-138); Mann's edition
  would be a fallback, subject to copyright. (Owner wrote "Fictum"; read as the study area.)
- **Josephus's attempts.** Show his faulty first versions (e.g. Fig. 26 before Fig. 33; the
  first versions of Figs. 6, 12, 15) as images or as engraved scores with Aloysius's marks.

## Analysis, scoring and generation (plan agreed October 2026; steps in order)

Background: J. Ewing, *A Historical and Algorithmic Study of Fux's Approach to Counterpoint*
(BA thesis, New College of Florida, 2009) scored three-voice first species with weighted rules
and compared each choice with Fux's, bar by bar, given Fux's previous bar.

1. **Alternatives audit (test + report).** For every Fux solution and every slot, substitute
   each candidate pitch (mode notes, cadential sharps, B♭/E♭ where Fux uses them) into Fux's
   otherwise unchanged line and count the substitutions that raise no error. Snapshot the
   counts so a rule change shows how much it widens or narrows the game. Fux must remain legal
   at every slot (D39).
2. **Score vector.** Compare candidates lexicographically by tier, not by Ewing's powers of ten:
   errors (Fux's precepts) > Fux's recommendations (warnings) > Fux's stated counsel
   (singability, variety, look-ahead) > measured habits of Fux's solutions > modern additions
   (dev only). Never affects stars (D25).
3. **Measure Fux's habits** on all solutions in the dataset (leap rates per voice, bass vs upper
   voices, sixths by quality and direction, repeated notes, successive leaps, cadence chords),
   as data for tier 4. Done for three-voice first species (session of October 2026): bass skips
   0.65 of its moves against 0.41-0.43 in the upper voices; 21 melodic minor sixths in the whole
   corpus (13 up, 8 down), no major sixth.
4. **Fit and validate tier 4** against Fux's choices (agreement with Fux, leave-one-exercise-out);
   Ewing's text-only baseline matched Fux on 52% of chords.
5. **Hints from the audit:** "Fux had N legal choices here", the rank of the player's note.
6. **Generators** (D8): cantus firmus by the M1-REPORT §4 constraints; counterpoint by search
   under errors, ranked by the score vector; every cantus must admit a counterpoint (§4.15).
7. **Three voices:** compare-fux "singable" judged per voice with a bass allowance; motion rule
   scoped as Fux's solutions require (17 direct motions into perfect consonances, all with the
   bass, none between upper voices; 10 at the final cadence).
8. **Harmonic view toggle (modern, never graded).** Roman numerals / figured-bass labels under
   the score beside the note-name and interval views; from three voices on (two-voice dyads are
   ambiguous). Labelled as a modern lens (Rameau, Weber), not Fux's.

**State (9 October 2026): steps 1, 2, 4 and 6 built as a separate "Choices lab" page for the owner
to try; nothing in the game uses them yet, and no decision number is taken until the owner rules.**
Code: `src/counterpoint/choices/` (audit, score vector, habits, generators), `src/lab/` (the page,
`vite.lab.config.ts`, `tools/build-lab-artifact.mjs`), `test/choices.test.ts`; report:
`node tools/lab/choices-report.ts` → `docs/fux/choices-audit.md`. Two-voice species 1-5, and three
voices in first species (`choices/trio.ts`, on the game's `evaluateTrio`): the audit of Fux's 16
solutions, and "Add a third voice" (above, between, below) to a generated first-species exercise.
Fifth species since added (below). Not yet: three voices beyond first species (the game has no rules for them yet).
Findings and points for the owner:

- Fux's note is legal at every one of his 691 choices (species 1-4). Where more than one pitch
  is legal, the full score vector ranks his note first, alone, at 61% (first species), 74%
  (second), 78% (third), 69% (fourth); his stated counsel alone (no habits) at 40-66%.
- Three voices: Fux's note legal at all 374 choices; first alone where free at 73% (habits alone
  77%, counsel alone 55%). A middle voice often cannot be added to a two-voice exercise written
  for two voices: the lines lie a third or less apart, and doubling one of them twice makes
  parallel unisons; Fux spaces his three voices widely from the start. Some E-mode endings leave
  no bass at all (the cadence Fux calls impossible in the regular way).
- Sharps only at the cadence in both generators: every C♯, F♯, G♯ of Fux's two- and three-voice
  solutions stands in the last four bars (F♯ in A once: Fig. 42, rising to G♯).
- Fifths or octaves on successive downbeats, broken by the upbeat or the syncopation: allowed by
  the rules (Fux's Fig. 77 has one; p. 72 judges ligatures "retardatione sublata"), rare in his
  practice (3 of 118 successive downbeats in second species, 1 of 54 in fourth), and so scored
  as rare by the habits.
- Generator settings: counsel weight 0 and variety 1 by default, i.e. each move drawn about as
  often as Fux makes it (Gumbel-max sampling); generated first-species lines then match his
  rates of repetition, leaps and spacing (14%, 32%, 7.4 semitones; Fux 11%, 32%, 7.1).
- Fux's habits, measured (docs/fux/habits-study.md; the lab's "Fux's habits" tab): of eleven
  candidate habits, five predict his notes once the others are in, each exercise judged by a model
  learnt without it: the melodic move by voice position, the interval with the cantus, pairs of
  successive moves, how a downbeat is reached, the same fifth or octave on successive downbeats.
  Weighted, they cut the surprise at his notes from 1.24 to 0.96 bits per real choice (his note
  first 72%; 68% before; second species 63% → 75-78%). In words: perfect consonances on a
  downbeat reached by contrary motion 99% (oblique would mean a repeated note, legal only in first
  species, so this is partly the rules); after a leap of a fourth or
  more he turns back 76% (up) and 95% (down), after a downward one more often by another leap
  than by step. The audit and both generators use this model; the generator's variety is
  calibrated at 0.75 on his rates of leaps and spacing. Not yet modelled: first-species repeated
  notes (3% generated against his 11%).
- Three voices, the same method (docs/fux/trio-habits-study.md; same tab): of twelve candidate
  features, six predict Fux's notes once the others are in: the sonority (by far the strongest),
  the melodic move (pooled over staves: by staff adds nothing once the rest is in), pairs of moves,
  the chord member the voice takes, its motion with each other voice, and the opening sonority.
  Weighted, they cut the surprise at his notes from 1.00 to 0.72 bits (his note first 77% → 84% where the rules leave a
  choice). Spacing and the final chord's top note add nothing once these are in; the generated
  third voices still end with the final on top 84% of the time (Fux 88%), with his rates of leaps
  (47% against 43%) and repeated notes (14%). The audit and the third-voice generator use it.
- After a leap (docs/fux/leap-study.md): tested against von Hippel & Huron's regression to the
  mean (Music Perception 18/1, 2000). In whole-note lines (first species, three voices) the turn
  after a leap is accounted for by where the leap lands relative to the line's middle; leap size
  adds nothing measurable. In the running lines of species 2-5 leaps turn back far more than steps
  landing alike, even counting only consonant landings; whether that is a rule for leaps or the
  inertia of steps in scales, these data cannot say. The "habit" of the habits study is to be read
  accordingly.
- Independence of the precepts (docs/fux/independence-study.md): every precept of species 1-4 has
  a witness (a line, usually Fux's own with one or two notes changed, that breaks it alone), except
  `fs.final-octave-or-unison`, which the first-species cadence rule already contains (an encoding
  redundancy). Fifth species: the three rhythm precepts untested (pitches varied only). The
  witnesses show the precepts allow leaps beyond the octave (a thirteenth): check whether Fux
  forbids them.
- Motives and imitation (docs/fux/motives-study.md): Fux's species solutions imitate the cantus
  (displaced 1-4 bars, straight or inverted, at any transposition) and repeat their own
  three-interval figures no more than counterpoints generated without any notion of either
  (percentiles 33-69% against the generator's, mostly about 50%; the 3-interval "imitations" found
  are short scalar runs). Not a habit in the species exercises; Fux teaches imitation after
  Exercitium III. An imitative mode for the generators would be our addition, to be labelled so.
- Habits are measured per role (counterpoint above or below) and with register and crossing
  (a tenth is not a third; a crossed third is not a third).
- Ranking by the most typical move alone gives far fewer leaps than Fux writes (6-19% against
  his 32% in first species): hence the sampling above.
- D8 bands checked against Fux's own cantus firmi ("Fux is the last word"): the leap band
  widened from 25-60% to 20-62% (Fig. 42's A has 20%, the G 62%); "turn after a rising fourth"
  is soft (Fux's G does not turn once); outlined sixths allowed when they arpeggiate a triad
  (Fux's G: G-C-E); length 9-14 accepted (Fux's C variant has 9; generator default 10-14); and
  Ewing's antepenultimate degree 1 or 3 (true of all Fux's) added. Approved by the owner,
  9 October 2026 (docs/fux/cantus-constraints-amendment.md); decision number to be assigned.
- Fifth species, two voices (`choices/florid.ts`): the audit now covers Fux's twelve florid
  solutions (his note legal at all 299 choices; first where free 74% with the full score vector,
  habits learnt on his florid lines with the weights fitted on species 1-4). The generator draws
  each bar's rhythm from Fux's own middle bars under the grammar his solutions keep (the opening
  half rest and minim; the cadence bar a held minim and a minim; a tie into a bar only after a
  minim on the half bar; after two crotchets and a minim, a tie, so that the melody does not
  "limp", pp. 80-81), then the pitches by beam search judged by the game's fifth-species rules
  (D82), with Fux's counsel of variety against lines rocking between two notes (p. 77). 24 of 24
  trials (six finals, cantus below and above) found a line with no error. Not yet: writing your
  own florid line in the lab (rhythm entry), a habits study of florid rhythm beyond bar patterns.
- Three voices written together (`generateTrio` in `choices/trio.ts`; Generators, step 3, "write
  two voices together over the cantus"): the cantus on the top, middle or bottom staff, moved by
  octaves to where Fux writes it there; both added voices searched bar by bar as pairs, in his
  registers for that staff (from his solutions with the cantus on the same staff), ranked by the
  three-voice habits (the chord's own habits counted once), judged by the three-voice rules.
  52 of 54 trials (six finals, three staves, three cantus each) found a clean pair; the two
  failures were G and C with the cantus in the bass, positions Fux does not write. Generated
  sonorities at the default variety (0.75): 3 8 37%, 3 5 36%, 3 6 9% (Fux 33%, 41%, 14%).
  The three-voice habit model gained the opening sonority (weight 0.59; it predicts his notes once
  the others are in), which keeps the generator from opening on a sixth over the final.
- Harmonic view (plan step 8; `choices/harmony.ts`, lab `Harmony.tsx`): a "harmonic view
  (modern)" toggle under three-voice scores (the generated trio, Fux's sixteen in the audit):
  figures above the bass, stacked, and a Roman numeral relative to the final (upper case major,
  lower case minor, ° diminished, 6 and 6/4 for inversions, in brackets where an incomplete chord
  leaves the root a guess). Labelled a later lens; never graded. Not yet in the game.
- Write your own (lab tab; `choices/hints.ts`, step 5 of the plan): write on one of Fux's cantus
  firmi or a generated one; at each note the errors it causes (the game's hint text and Fux's
  page), the number of legal pitches given the rest of the line, the note's rank, and on request
  the most Fux-like note (habits learnt without the exercise) beside Fux's own. The engine judges
  whole lines only, so a line being written is judged in the stretch of written bars around the
  note, the opening and ending rules waiting until the stretch reaches them; the note at the
  frontier of the writing is judged with its best continuation to the next downbeat (searched
  steps first), so that a passing note is not read as a last note. Writing Fux's own lines left
  to right, his note is legal at every step in all four species. `hintAt` / `legalCounts` are
  ready for the game.
- Difficulty (docs/fux/difficulty.md; `choices/difficulty.ts`): freedom per choice, log2 of the
  legal pitches with the rest of a good line in place. Fux's species tighten steadily (2.17 bits in
  first species, 1.67, 1.57, 0.89 in fourth, where 53% of choices are forced; fifth loosens again
  per note, 1.75, its rhythm not counted); within a species his
  order goes through the modes and is not one of difficulty (weak correlations of both signs). For
  the game: order generated practice by it. Shown in the lab's audit lists and summaries.
- Two-voice generator: when no error-free line exists it returns the one breaking the fewest
  rules (as the third voice does), marked in red in the score.

## Rules

- Fig. 110, bar 6 (and Figs. 169, 170, bar 6): an unmarked B repeats the B♭ of bar 5 in the same
  voice. The dataset reads B♮ (a chromatic step found nowhere else in Fux); B♭ is far more likely.
  Decide the reading before three or four voices are built. (Now item 7 of docs/fux/open-questions.md.)
- The hint "leap a minor sixth (upward)" (pp. 59-60): the Latin gives no direction ("per saltum
  Sextae minoris, (qui licitus est)"), and Fux leaps a minor sixth downward 8 times. Check the
  examples on p. 60 and reword if needed.
- Settled by D143: warnings no longer withhold the star, so Fux's Figs. 14, 37 and 39 can earn it; whether the crossing warning (D2) should go at all is still open.

## Basso continuo

- Assess first (prompt for an external survey was drafted in the session of October 2026);
  open questions: final chord with or without the third, organ or harpsichord, timing.

## Data

- Report the upstream defects listed in docs/fux/open-questions.md, and the B♮ readings of
  Figs. 110, 169, 170, bar 6 (see Rules above) once decided.
- Check Fig. 42's A cantus against 1725 p. 62.

## For Batch 4 — "What is the Gradus?" (owner, 9 October 2026)

- Open the section with Fux's line (owner's English): "I will not be deterred by the most passionate haters of study, nor by the depravity of the present time." To verify against the 1725 preface ("Ad lectorem") before use, and give the Latin beside it.
- Reception (owner's note): Leopold Mozart is said to have taught Wolfgang from the Gradus; J. S. Bach and Beethoven held it in great esteem; Haydn worked out each of its exercises; in translation it remains in use for teaching counterpoint. Source: Alfred Mann (tr., ed.), *The Study of Counterpoint from Johann Joseph Fux's Gradus ad Parnassum* (New York: Norton, 1943; rev. 1965) — the owner consulted the 34th printing of the paperback. Cite without page numbers unless verified.
