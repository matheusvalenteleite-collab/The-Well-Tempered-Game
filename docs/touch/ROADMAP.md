# The touch game: what comes next, in batches (24 October 2026)

## The philosophy (the owner, 24 October 2026)

"The philosophy behind this game is to allow anyone to rejoice in the indescribable experience of
playing Bach's polyphonic music." Not a game about harmony in a technical sense: it ought to be fun, and
to give the experience of playing the music: "one ought to feel those special things one feels when
practicing a Bach piece. One will live those special episodes of figuring out something in a piece after
playing for some time. One will rejoice in the beauty of some intervals and dissonances. One will feel the
shapes and contours of pieces. One will see how the material often derives from a common source being
developed and transformed. One will feel musical upon playing, given that one's moves reflect the music,
and ought to be done with musicality (legato in the right places, articulation, shaping the voice,
voicing, dynamics…)." What a prelude asks of the player is decided piece by piece, as Bach would: by
what the prelude consists in. Preludes are played upright (portrait), fugues sideways: the difference is
wanted. The fugues' LADDER stays theirs alone; the fugues are not to change.

The owner's requests of 24 October 2026, sorted into batches. Nothing here is built until a batch is
started; each batch ends with tests, a decision row (DECISIONS.md) and a deploy. Research behind it:
docs/touch/LEDBETTER-PRELUDES.md (Ledbetter on each Book I piece), and the three reports summarised in
the sections below (instrument libraries; iPhone multi-touch; the clipping audit).

## Batch 0: fixes (first)

1. **The combo (×9) off the middle.** It shares the count-in's centre slot (`.tg-count`, BenchApp: the
   combo from 5). Move it beside the score (the scoreboard corner: the phone's bar, the computer's
   top right), small; the centre keeps only the count-in.
2. **iPhone clipping** (audit, ranked):
   - the organ's swell is unbounded (`chip.ts` dyn: `Math.max(0.05, level)`, no ceiling) and ORGANO PLENO
     stacks 1 + 0.45 + 0.5: clamp to [0.05, 1.4], divide the stack by about 1.4, lower the organ's gain;
   - the two compressors add makeup gain and have no true ceiling: lower the limiter (about −10 dB,
     3 ms attack, 0.25 s release), trim about 0.7, and a final tanh WaveShaper (4x) at about 0.95;
   - the reverb sends skip the master level and the volume: route them through it;
   - CPU: a sampled organ note is 10–16 nodes; phone cap 16–20 for sustained sampled sounds, count the
     pleno's sources; disconnect the drive shaper outside FUOCO; a shorter impulse on phones.
   - memory is not the cause (harpsichord ≈ 60–70 MB per piece within the 96 MB budget; organ 20 MB);
     the KIMIKO track's stereo decode peaks near 100 MB (later).
3. **A touch cut by the system is not a release.** A `pointercancel` (edge gesture, a 6th touch) is graded
   now as an early let-go (BenchApp ignores `cancelled`): stop the sound, skip the judgement.
4. **The organ out.** No piece opens on the organ until the new organs exist (Batch 2); the stile antico
   fugues open on the harpsichord meanwhile, the organ preset removed.
5. **Small mistakes don't cost the whole run.** A slip now: streak to 0, multiplier one step down. Instead:
   the streak loses a quarter (at least 4), the multiplier drops only on a second slip within 8 notes; a
   riding note or an ornament missed costs nothing.

## Batch 1: Prelude 1, the whole arc

- **Rising complexity by section** (the harmonic map's cadences: bb. 1–4, 5–11, 12–19, 20–23, 24–31,
  32–35): fewer notes ride as it goes (the tier's cap never exceeded).
- **The pedal point** (bb. 24–31, G): hold the pedal while the figure goes on. Phone: the pedal gets its own
  pad (the leftmost, lower row), the figure folds into the other four lanes for those bars; computer: hold
  A. Two touches are well within an iPhone's five (one held, one tapping: reliable); keep the targets
  20–30 pt from the top and bottom edges (system gestures). A failed pedal costs a bonus, not the run.
- **Tempo**: the owner suggests a subtly rising tempo. Proposal: +2% a section to +6%, held steady through
  the pedal, a ritardando into the last bar (phrasing.ts already ritards the last cadence).
- **The close**: the final chord struck with both thumbs (keys) together.
- **No percussion** (the owner: none in a piece like Prelude 1; percussion only where the piece calls for it).
- Built: D250.
- No echo (rejected: no memory puzzles); no precision-only rule (too complex for the flow).

## Batch 2: sounds I (new instruments; the subject's colour)

**What we have.** The touch game plays two recorded instruments (VCSL harpsichord "Unk", one register;
VCSL pipe organ, one loud registration, short loops: the sound the owner hates); every ensemble preset
(STRINGS, BAROQUE BAND, WINDS, CONSORT, TRAVERSO) is synthesised. Recorded sets on disk but unused by it:
VSCO 2 CE (CC0) violin/viola/cello/bass articulations, oboe, clarinet, timpani; the tonejs copies (sparse).

**To fetch (licences verified by the research; all fit the mobile budget as mono, a note every minor third):**
| need | source | licence |
|---|---|---|
| harpsichord registers 8′, 4′ (Flemish) + lute (English) | VCSL (github.com/sgossner/VCSL) | CC0 |
| chamber/positive organ 8′, 4′, full | VCSL Renaissance Organ | CC0 |
| a softer pipe organ manual + quiet pedal | VCSL Pipe Organ (Quiet, Quiet Pedal) | CC0 |
| a real baroque organ, stop by stop (principal, flutes 8′/4′, reed, mixture, pedal 16′) | Lars Palo, Norrfjärden Baroque Organ | CC BY-SA 4.0 (our derived files must be CC BY-SA too, with credit) |
| recorders (alto, tenor) | VCSL | CC0 |
| oboe without vibrato, flute (no vibrato), solo violin, bassoon, trumpet, timpani | VSCO 2 CE | CC0 |
| solo cello | Karoryfer Bigcat Cello | CC0 |
Unusable: Grabowski and Sonus Paradisi organs (no redistribution), Sonimusicae harpsichords (unverified),
Philharmonia (no redistribution "as samples"), the SSO choirs (non-commercial). No free gamba, theorbo,
natural trumpet or real traverso found: synthesised for now.

- Harpsichord registrations pre-mixed offline (8′; 8′+4′; 8′+8′+4′; lute), one set loaded at a time.
- Organs by stops, loaded lazily, so a fugue's voices can be registered differently.
- **The player's voice gets the preset's best instrument** (the lead slot), whatever voice it is: never a
  feeble sound for the player.
- **The subject's colour** (replacing the bright e-piano spark, subject-fx.ts): harpsichord: the full
  registration (8′+8′+4′) while the player's voice states the subject; ensembles: a second instrument
  doubling the subject (colla parte); organ: a reed or principal added; consoles: the duty cycle and an
  octave; MOOG: the filter opened.

## Batch 3: defaults, unlocks, the selection screen

**Default voice of each fugue** (one of the first three to enter; often the second, so the player hears
the subject before answering it; never a voice with too little to do):

| fugue | entries | default | why |
|---|---|---|---|
| 1 C | A S T B | Soprano | answers the alto's subject; the top line of the strettos |
| 2 c | A S B | Soprano | answers after hearing it; the witty upper line |
| 3 C♯ | S A B | Alto | the soprano's 584 notes are much; hear it first, answer |
| 4 c♯ | B T A S2 S1 | Alto | the middle of five; carries all three subjects; long notes suit a beginner of the piece |
| 5 D | B T A S | Bass | the busiest voice (275 notes) and the subject's tirata; the alto has only 121 |
| 6 d | S A B | Alto | answers; the inversions come to it |
| 7 E♭ | S A B | Alto | answers; the light ritornello |
| 8 d♯ | A S B | Soprano | answers; the augmentation and inversion entries reach it |
| 9 E | A S B | Soprano | answers; the witty top |
| 10 e | U L | Upper | two voices: the subject's own voice, the octave unisons |
| 11 F | A S B | Soprano | answers; the passepied's tune |
| 12 f | T A B S | Alto | answers the tenor; central in the chromatic web |
| 13 F♯ | S A B | Alto | answers |
| 14 f♯ | T A B S | Alto | answers; the sighs |
| 15 G | S A B | Alto | answers; the soprano's 688 notes too many |
| 16 g | A S B T | Soprano | answers; the tenor (109 notes) too thin |
| 17 A♭ | T B S A | Soprano | the third entry: the subject heard twice first; the top |
| 18 g♯ | T A S B | Alto | answers |
| 19 A | S A B | Alto | answers; the second subject's |
| 20 a | A S B T | Soprano | answers; the anapaest drive on top |
| 21 B♭ | S A B | Alto | answers |
| 22 b♭ | S1 S2 A T B | Soprano II | answers; the motet's entries from the top down |
| 23 B | T A S B | Alto | answers |
| 24 b | A T B S | Tenor | answers; the labyrinth's middle |

Preludes: the right hand by default; the left where it carries the piece (to be read per prelude).

**Default sound of each piece**, by Ledbetter's genre (docs/touch/LEDBETTER-PRELUDES.md) and the
default voice (once Batch 2's instruments exist; consoles, bossa and MOOG become unlockables):

| | prelude | fugue (voice) |
|---|---|---|
| 1 | harpsichord 8′ (a toccata arpeggiata, meant "wet") | chamber organ (verset, a study of line) (S) |
| 2 | harpsichord 8′+4′ (étude, concert ending) | baroque band, violin on top (Venetian concerto rhythm) (S) |
| 3 | harpsichord 8′+4′ (solfeggio, batterie) | baroque band, oboe (a bourrée, concerto da capo) (A) |
| 4 | oboe over strings (siciliano, cantabile) | chamber organ (stile antico, five voices) (A) |
| 5 | harpsichord (thumb exercise, cadenza) | French orchestra: strings, oboes, bassoon on the bass (overture) (B) |
| 6 | violin over strings (Corellian moto perpetuo, legatissimo) | viols (affective dance-sonata) (A) |
| 7 | chamber organ (the organ-toccata type) | baroque band (Vivaldi ritornello) (A) |
| 8 | violin over strings (Vivaldian slow movement, tombeau) | chamber organ (modal ricercar) (S) |
| 9 | recorders (pastorale) | harpsichord, lute stop (light verset) (S) |
| 10 | violin and continuo (Corelli's ornamented style; Presto) | strings in unison (rage aria) (U) |
| 11 | harpsichord (the trill study) | consort (a passepied) (S) |
| 12 | harpsichord 8′+8′ (overholding sonority) | viols (the pleurants) (A) |
| 13 | traverso and harpsichord (French character) | winds (joyful) (A) |
| 14 | harpsichord (Couperin's progrès de quartes) | viols (stile antico, sighs) (A) |
| 15 | harpsichord 8′+4′ (finger exercise, range burst) | baroque band (Vivaldi allegro, gigue) (A) |
| 16 | oboe over strings (sonata Adagio, messa di voce: a sustaining voice) | chamber organ (verset, cantabile) (S) |
| 17 | violin band (violin style, bariolage) | baroque band, tutti and solo (Spielfuge) (S) |
| 18 | harpsichord (invention) | chamber organ (Kerll verset) (A) |
| 19 | trio of winds (three lines characterised) | harpsichord (partimento puzzle) (A) |
| 20 | harpsichord (the mordent évolution) | organ with pedal 16′ (needs a pedal for the final A) (S) |
| 21 | harpsichord 8′+4′ (toccata, free rhetoric) | consort (galant) (A) |
| 22 | strings (lamento, dynamics from chord density) | viols or sackbuts colla parte (a motet) (S2) |
| 23 | harpsichord, lute stop (cantabile clavichord exercise; no clavichord yet) | consort (A) |
| 24 | strings trio (Corelli trio sonata) | string quartet (Largo; the tenor on the viola/cello) (T) |

**Unlocks, per piece, by score** (grades as now):
- sounds: the default; then the other historical family (harpsichord ↔ ensemble/organ); then a kindred
  ensemble (strings, winds, consort, band, by character); then the console sound of its temper; then the
  wildcards (bossa nova, Wendy Carlos);
- voices: the default; each grade up unlocks the next voice in the order of entry; all at the top grade
  (preludes: the other hand at the second grade).

**The selection screen**: two columns, preludes left, fugues right, a row per pair from C major to B minor;
pairs still locked shown grey, in place; the difficulty (stars) on each card; no tier headings (the tiers
still decide what is unlocked).

## Batch 4: ornaments as gestures (the two rows of pads)

The two rows of the phone's prelude pads give each lane an upper and a lower pad: room for gestures
(after Bach's *Explication* table and C. P. E. Bach's *Versuch*):
- **mordent** (main–lower–main): touch, a quick slide down into the lower row and back;
- **trill** (from the upper note): down–up–down–up between the lane's two pads, or two thumbs alternating
  for a long one; judged by its evenness; the ribattuta (Prelude 16) accelerating;
- **trill and mordent** (the trill's close): the alternation, then the slide down and back;
- **turn** (cadence: upper–main–lower–main): an arc up over the pad and down below it;
- **appoggiatura** (accent, rising or falling): touch the neighbouring lane, lean into the main one;
- **Doppelt-cadence** (Prelude 11's study): the turn into the trill;
- **arpeggio** (Preludes 4, 5, 22): a sweep across the lanes, spread in time.
Computer: a trill alternates the lane's key with the next; a mordent: key, key below, key, quickly; a turn:
above, key, below, key. Showcases: Preludes 11 (the long left-hand trill), 16 (the ribattuta), 20 (the
mordents), 8 (turn, mordent), 14 (trills); in the fugues the ornaments Ledbetter expects (8, 12).
Graded generously (the class of gesture first), never failing the run.

## Batch 5: the other Book I preludes' arcs

From Ledbetter's notes, checked against the score: pedals (2 b. 21, 3 bb. 63–98, 5 b. 27, 6 b. 15 tonic
then dominant, 12 to b. 20, 9 in each ritornello); tempo changes honoured (2: Presto, Adagio in free
time; 10: the Presto; 21's "adagio" is a manner, not a tempo); fermatas from the score; the climaxes he
names (4 bb. 30–1, 8 bb. 28–35, 15 bb. 13–18, 18 b. 25, 21 bb. 11–14, 23 the last four bars); one
challenge per prelude. Built: Prelude 4 (D258: the sweep; the bass's descent taken over).

## Batch 6: what the music adds when the player plays well

Each fugue its own earned layers, what a baroque ensemble would add, never a drum kit: 1, the pedal 16′
doubling the bass's entries; 2, a pizzicato bass on the downbeats (Venetian concerto); 3, a tabor on the
bourrée's upbeat; 5, timpani on the dotted cadences, a trumpet doubling the last entry; 10, the octave
unisons doubled; 11, a hand drum on the passepied's downbeats; 15, a tambourine on the gigue; 17, the
tutti joining in the tutti passages; 20, the pedal's 16′ under the final A; 22, sackbuts colla parte; 24,
a muffled timpani heartbeat. The preludes: the percussion design (intensity curve per bar; family-aware).

## Batch 7: playing beautifully (articulation, dynamics, shaping)

A design study first. Ideas: an ARTISTRY score beside accuracy, only rewarding, never punishing; rules
from the treatises rather than one right reading: steps joined, leaps detached, the "ordinary" touch
(C. P. E. Bach: a note held about half its value), sigh pairs (the first long, the second short),
repeated notes detached; dynamics by the thumb's place across the bar (phone, exists) and the key rows
(computer): the subject brought out over its accompaniment, a dissonance louder than its resolution, the
sequence's echo softer, the phrase arched to its cadence; a breath before an entry; rests clean.

## Batch 8: interpretations as unlocks (tempo and more)

The owner: default tempos follow Kimiko Ishizaka's; unlocks let a piece be played "through someone else's
interpretation" (its tempo and its other constraints). Research: docs/touch/INTERPRETATIONS.md. First: the
fugues' default tempo from Ishizaka's recording (now the median of the recordings); then per-piece factors
from the recordings' durations (data/tempi/recordings.csv), and the rules each style imposes (Gould's
detached touch, Tureck's strict time, Richter's legato, Landowska's registrations, Busoni's octaves,
Mozart's string quartet). The owner (24 October 2026): no Czerny; performers named, with their photos and
a short biography (photos from free sources only, e.g. Wikimedia Commons with their licences credited).
Later: the basics first.

## The score scale (to assess)

The owner has no settled view; after testing the new Prelude 1 he will report on difficulty. Then: what a
grade means, how unlocks (sounds, voices, tempos) follow from it.

## Later

- The Norrfjärden organ stop by stop (CC BY-SA 4.0: our derived samples released under it, credited; the
  owner agreed, 24 October 2026).
- Book II: defaults, voices and arcs read the same way.
- The KIMIKO track decoded without the stereo peak.
- Three-finger play: only with the phone flat (optional, never required).
- The list's cards (play.html, D265): the text on the right is to show each piece's BONUS CHALLENGE as well
  (the owner, 25 October 2026); the challenges themselves to be revised first (cards.ts seals), and improved
  over time. Not shown yet.
