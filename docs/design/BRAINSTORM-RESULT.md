# Brainstorm result: from a fugue's name and picture to its scripted stage and its challenges

The brainstorming room, 31 October 2026, answering `docs/design/BRAINSTORM-SCRIPTED-FUGUES.md`. Voices:
**Mario** (visual language), **Luigi** (game design, flow, pedagogy), **Glenn** (Bach keyboard, musical judgement
only). Nothing here changes game code. The page version of this document is the claude.ai artifact linked from
the session; the two say the same thing.

Facts about the music below come from `data/touch/pieces.json` (entries, keys, sections, cadences),
`docs/wtc/readings/` (Busoni's whole-piece readings of I/1 and I/2; Keller, Bodky and Riemann on the subjects),
`src/bench/cards.ts` (the cards and their seals, D192/D196) and the studio's pages. Where a claim needs the score
and we have not checked it, it says so.

## 0. The short version

1. **Every stage is one card filled from one template** (§1): palette, the strips' world, a cast of props, one
   ambient, and a table of moments bound to the piece's data. Mario fills the look; the moments come from data.
2. **Four kinds of event** (§2): *scripted* (every run, from data), *branch* (two outcomes at one fixed moment,
   chosen by how you play; both outcomes are good), *rotating* (a visitor that comes on a known schedule of runs)
   and *random* (cosmetic only). The branch is the Pokémon Snap mechanism; it is the new idea here.
3. **The owner's two families are right about the source of a challenge and wrong about its kind** (§3).
   "Play against Busoni" is still playing to a letter, someone else's. The real second kind is the challenge whose
   condition *underdetermines* the playing: the game names a property ("let the bass entry be heard without being
   louder") and the player finds the means. We propose: **Letter**, **Property**, and outside music, **Handicap**;
   with **Pursuits** (Snap's branches) as the way any of them is placed in a run.
4. **Loudness may choose, never grade.** Where a branch reads loudness (the bass entry ff or p), both outcomes are
   equally rewarded; no challenge is passed or failed by loudness. ACCENT stays what D387 made it.
5. **The camera is the voice.** In Snap the rail is fixed and you choose where to point. Here the fugue is fixed
   and you choose which voice to be. Requests should be written per voice, so I/1's four voices are four runs.
6. **No grade multipliers.** Challenges fill an album (the result screen as Professor Oak's report); the grade
   stays a judgement of the playing.

## 1. The pipeline: from name and picture to stage

A fugue's stage is one card. The order matters: steps 1–3 are Mario's from the picture, 4–6 are bound to data,
7–8 are Luigi's.

| Step | What is decided | From | Rules it keeps |
|---|---|---|---|
| 1. Palette | three colours, *shadow, world, light*, taken from the picture's own pixels; strips run shadow → world, the strong side lighter (as now) | the 64 × 40 picture | HUD contrast checked; voice inks, gold line, subject colours untouched |
| 2. The strips' world | the place the picture stands in (belfry, attic, railway, road), drawn as flat silhouettes at 6–12% in the strips' middle band | the name and picture | nothing in the box; clear of score, panel, stops, hint card |
| 3. The cast | 1–5 props that can *respond* (bells, lanterns, rods, the imp); each tied to a voice, a form (upright, inverted) or the whole | the picture, the voices | at most one prop per voice; one prop may be "everyone" |
| 4. Ambient | one slow motion, period ≥ 1 bar or 1.5 s, ≤ 10% | the character word (card, Keller) | never in time with the beat faster than a bar; respects reduced motion |
| 5. Scripted moments | a table: data event → response → duration → peak intensity | `pieces.json`, box's STRETTO flag | fire from data only; same for a perfect and a failed run |
| 6. Branch moments | at most three per fugue: a fixed moment, a condition on the player's own notes, two responses | the readings, the cards, Glenn | both outcomes rewarded; the default response if neither condition holds; said so on screen (§2) |
| 7. Count-in and result | the count-in done by the cast (a rope pulled per count, a step per count); the result screen is the stage's end state plus the run's album | the cast | no added sound over the music (below) |
| 8. Requests | the fugue's challenges: its seal (exists), 2–3 Letter, 2–3 Property, branches as Pursuits | §3 | listed before the run; one armed at a time |

**Sound.** Luigi's position: no stage sound while the music plays. The music is the sound, the bass must stay
audible on a phone, and any added noise competes with the judged line. Two places are free: a short ambient before
the count-in (a bell's hum tuned to the tonic, steam, a church's room tone), faded out before the first count;
and the result screen. Room size per stage (D389's room multiplier) is a third, quieter lever; it changes the
instrument, so it belongs to the owner (§6).

**The card, as data** (the shape a stage would be stored in; names are proposals):

```
stage: wtc1f01
  palette: { shadow, world, light }
  world: "belfry at dusk"
  cast: [ bell×3 (stretto entries), rope×4 (voices), pigeon (visitor) ]
  ambient: { kind: none }                       # I/1 is austere
  moments:                                      # scripted, every run
    - on: entry.first(voice)   do: rope.appear(voice)        for: 1 beat
    - on: stretto              do: bell.tilt(next)           for: 1 beat
    - on: cadence(bar 27)      do: bells.swing(all)          for: 1 bar
  branches:                                     # pursuits, said so on screen
    - at: stretto entries of your voice
      if: head DETACHED + ACCENT   → bell rung     else if: head JOINED → rope sways
  visitors:
    - pigeon leaves the belfry at cadence(bar 19), runs 3, 6, 9…
  countIn: rope pulled per count
  result: night belfry, bells at rest; the album
```

## 2. A taxonomy of events

| Kind | Fires | Signalled | Judged | How it keeps the rules |
|---|---|---|---|---|
| **Scripted** | every run, at a data moment: an entry (any voice, first entry, your voice's), STRETTO, a key change, a cadence (perfect, imperfect, half, deceptive), a section's start, the last entry, the end | not at all: it simply happens | no | fires from data; a failed run sees the same stage |
| **Branch** (conditional) | at a fixed moment, one of two responses chosen by how the player played their own notes there (JOINED or DETACHED across a cadence; an ACCENT on an entry's head; the thumb used; the strip zone) | while a pursuit is armed, a small glyph in the appendix row above the span (where the reading's marks live); the result screen names what triggered it | never pass/fail: both outcomes are collected; neither condition → the scripted default | the rule's exception "a challenge explicitly about the player's action", said so; loudness may select a branch, never grade it |
| **Rotating** (scheduled visitor) | a visitor at a data moment on a known schedule of runs (every third run; the run after a seal) | none; it is noticed | no | deterministic, so a player can plan for it (the Outer Wilds lesson, §4) |
| **Random** | cosmetic only: a variation inside an existing response (which bell, which bird) | none | no | never decides whether a challenge is available |

**Why branches, not gates.** A *gate* is "the event happens only if you played the stretto all JOINED"; a miss
leaves the stage poorer. A *branch* shows something on either side of the condition. Gates turn the stage into a
score display and break "scripted visuals never from hits or misses" in spirit even when declared. Branches keep
the stage complete for everyone and give the Snap choice: this run the bells, the next the ropes.

**Data the moments use**, and what is missing:

- In `pieces.json` now: entries (voice, subject/answer, key, bar, on/end), **inversions** (`inverted: true`: 81
  entries in 14 pieces, I/20's 18 of 39 among them; the brief says this is not marked, but it is), keys, sections,
  cadences with kind, countersubject (I/2's five returns). STRETTO is the box's flag.
- From the readings: Busoni's double bars, words (calmando, marc., non legg.), rules (I/2's "stets staccato");
  Bodky's and Riemann's subject marks.
- Missing: augmented entries (I/8's SLOW GIANT), trills' places, pedal points (the I/20 card speaks of "a long bass
  note, almost an organ's pedal" at the end; not checked against the score), later subjects of the double fugues.

## 3. Challenges: the hypothesis tested

**The hypothesis.** Two families: (a) playing by the reading (Busoni's marks as the score in a passage) and (b)
playing creatively under constraints, possibly against the reading, possibly prompted by events.

**Its strongest form.** A player who only ever obeys marks learns that the marks *are* the music. Bach printed
almost none in the WTC; every mark the game shows is an editor's. Playing a passage against Busoni teaches that a
reading is a reading, and makes the choice among BUSONI, KELLER, BODKY, RIEMANN (D394) something the player
understands rather than a menu. That is a real pedagogical gain and we keep it.

**Where it is weak.** At the level of what is judged, "all DETACHED in bars 14–18" is a letter exactly like
Busoni's "meno legato ma sempre molto tenuto". It is another letter: often someone's (Bodky's nonlegato, the game's
own performance data), sometimes the game's. The player executes it; nothing is invented. "Against the reading" is
a relation between two letters, not a kind of challenge. What makes a challenge creative is that **the condition
does not fix the playing**: it names a property and leaves the means open. Oak's criteria in Snap are of this kind
(size, pose, centred, several in frame): he judges properties of the photo, not a photo. Luigi adds the bandwidth
point: at tempo, a thumb game leaves little spare attention, so a creative condition must be one property, over a
short span (≤ 8 bars), announced in the box ahead.

**What we propose instead.**

| Kind | What is judged | Spec comes from | Example |
|---|---|---|---|
| **Letter** | the played notes against a given set of marks, with the existing vocabulary (JOINED, DETACHED, SHORT, ACCENT, SLUR, HELD) | a reading (Busoni, Keller, Bodky, Riemann) or the game | I/2: every unmarked eighth of your counterpoint SHORT (Busoni, footnote 1) |
| **Property** | a predicate over the played notes that many performances satisfy | the game, usually from a footnote or the music's structure | I/20: one articulation for upright entries, the other for inverted, the same all piece (either assignment) |
| **Handicap** | a bodily constraint, not a musical one | the game (osu!'s mods, §4) | one thumb only; the notes vanish before the line |
| **Pursuit** (placement) | any of the above, placed at a branch moment of the stage, with two collected outcomes | the stage card | I/22 bar 64, the deceptive cadence: walk on (JOINED across) or kneel (a breath) |

The owner's "against the reading" survives as two strong subtypes. **Letter against letter**: two runs, two
readings of the same bars (Busoni's meno legato in one, JOINED as the game's data plays it in the other); the album
shows both. **Property against letter**: do what an editor's footnote asks with means his marks don't use (I/1:
make Busoni's own 3/2 illusion heard, his footnote 1, against his tenuto marks).

**Scoring without loudness.** The grade is unchanged. Letters and Properties earn a stamp on the fugue's tile and
a still in the album; Pursuits earn one of their two stills. No multiplier on the grade: a handicap that raised the
grade would make the grade about the handicap. Loudness: no request is passed or failed by level. A branch may
read a level (the bass entry in the strong zone or the soft) because both outcomes are good. D387's ACCENT (strong
zone, on time) is the existing, declared exception and we do not extend it to mf/f levels.

**How a player finds them.** (1) *Requests board* on the fugue's card before a run, attributed: "Busoni asks…",
"Bodky asks…", "Bach's footnote…" (the seal is the first request). One is armed per run; its span shows as a glyph
above the notes. (2) *Research level* per fugue (New Pokémon Snap's word): finishing runs opens the next requests
and visitors. (3) *Found branches*: branches fire for everyone; the result screen says what the player did that
triggered one ("bar 64: you did not breathe; the procession walked on"). Whether a branch may fire before the
player has armed it is the owner's call (§6, Q2).

**Which family each belongs to.** Letter is family (a), with the seal. Property is the true family (b). Handicap
is outside both, a mod. Pursuit is not a family; it is how Snap's choice enters a fixed run, and it can carry a
Letter (bells rung by Busoni's marc.) or a Property.

## 4. Research: fixed runs with chosen goals

Only what we read; secondary sources are marked.

- **Pokémon Snap** (HAL Laboratory / Nintendo, N64, 1999). A "photography video game with rail shooter
  elements": the Zero-One follows a linear path; up to 60 photos per course; Oak scores the best photo of each
  Pokémon by size, pose and keeping it in frame, with bonuses for special poses and several Pokémon in one frame;
  apples, Pester Balls and the Poké Flute are obtained gradually, and courses are replayed to find "hidden Pokémon,
  alternate routes, or photographic opportunities" ([Wikipedia](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Snap)).
- **New Pokémon Snap** (2021). Each course has a research level raised by photographing; higher levels bring new
  Pokémon and behaviours; fluffruit lures, Illumina orbs make a Pokémon glow and act, some open a new route
  ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/New_Pok%C3%A9mon_Snap); guides, secondary).
- **Hitman** (IO Interactive, 2016). Sandbox levels with *scripted opportunities* (multi-step set pieces) and
  *challenges* (unconventional kills, finding items) that raise a level's mastery and unlock starting points;
  escalation contracts add stage-by-stage requirements ([Wikipedia](https://en.wikipedia.org/wiki/Hitman_(2016_video_game))).
  Silent Assassin, Suit Only is the rule-bound challenge (no other kills, not seen, no disguise; fan guides, secondary).
- **Star Fox 64** (Nintendo, 1997). A branch chosen at a fixed place: save Falco on Corneria and fly under the
  stone arches, and the route goes to Sector Y; otherwise the default route; medals need a hit threshold and all
  wingmen alive (guides, secondary: [VGC](https://www.videogameschronicle.com/guide/starfox-64-alternate-routes-stages/),
  [Shacknews](https://www.shacknews.com/article/149796/all-medals-alternate-paths-star-fox); their thresholds
  disagree, so we cite none).
- **Outer Wilds** (Mobius Digital, 2019). A 22-minute loop that ends in a supernova whatever the player does; places
  change at fixed points of the loop; nothing but knowledge carries over
  ([Wikipedia](https://en.wikipedia.org/wiki/Outer_Wilds)).
- **osu!** Mods as opt-in handicaps with score multipliers: Hidden 1.06×, Flashlight 1.12×, multipliers multiplied
  ([osu! wiki: Hidden](https://osu.ppy.sh/wiki/Hidden), [Flashlight](https://osu.ppy.sh/help/wiki/Flashlight)).

**What transfers.** The fixed rail with optional, mutually exclusive targets (Snap, Star Fox's branch); judging
by properties of the result (Oak); unlocks that change what the same rail shows (Snap's items and research levels,
Hitman's mastery); the challenge list visible before the run (Hitman); determinism as the condition of learning
(Outer Wilds: a schedule can be studied, a dice roll cannot).

**What does not.** Snap's camera is free while the rail moves; our player's hands are fully busy with the notes, so
every request must be expressed through *how the notes already demanded are played*, never through extra input.
Snap's apples change what the Pokémon do; nothing changes what Bach's voices do, only the stage. Star Fox's
branch changes the next level; a fugue cannot branch, so our branches change the stage's state and the album, not
the music. osu!'s multipliers raise the score; ours must not touch the grade.

## 5. Worked examples

Bars are the data's (bar 1 = the first barline). STRETTO = the box's flag. The owner's choices on the names page:
I/1 and I/2 not chosen yet (the current names used), I/20 "more ideas: something more industrial revolution? a
locomotive?" (used as *The Locomotive*, not drawn yet), I/22 kept as *The Procession*.

### I/1 C major · The Bell-Ringer (or The Round / The Tape Loop) · 4 voices, 27 bars, 24 entries

**Stage.** Belfry at dusk, blue slate to bronze; three bells high on the strips (D383: three bells for the
stretti), four ropes, one per voice; no ambient motion (austere). Count-in: a rope pulled per count.

| Bar | Data event | Response |
|---|---|---|
| 1, 2, 4, 5 | each voice's first entry (A, S, T, B) | its rope drops into the strip |
| 7 | section "To the G major entry" (Busoni's double bar before 7) | the dusk deepens one step |
| 7, 10–11 | STRETTO pairs | one bell tilts per STRETTO entry, a beat, eased |
| 14 | A minor perfect cadence (the first cadence) | the bells still; a little dust falls |
| 14–19 | the densest strettos (eight entries begin in bars 14–17) | the bells' tilt alternates; light at its highest (Busoni's dome "piled up in the middle") |
| 19 | D major perfect cadence | the light starts down |
| 24 | C major perfect cadence, the last entries | ropes still |
| 27 | final cadence | the three bells swing once together (the studio's moment) |

Visitor: a pigeon leaves the belfry at the bar 19 cadence, every third run.

**Letter.** (A1) *Busoni's template* on every entry of your voice: rising steps tenuto, the arc to a staccato
note, the leap tenuto, sixteenths slurred (his rule for every entry). (A2) *Meno legato ma sempre molto tenuto*,
bars 14–18: every note held full value, none joined (DETACHED, not SHORT). (A3) *marc.*: the bass at bar 15 or the
tenor at bar 21, ACCENT on the entry's first note (D387's strong zone, on time).

**Property and against the letter.** (B1) *Three-two* (Busoni's footnote 1: the entries every six quarters make "the
illusion of a 3/2 metre"): in the exposition, ACCENT every entry head of your voice and no accent on the next
downbeat; his analysis, against his tenuto. (B2) *The other reading*: bars 14–18 JOINED (the game's own data plays
I/1 legato, overlapping); paired with A2, two runs, two stills. (B3, Pursuit) *Ring or hum*: at each STRETTO entry of
your voice, head DETACHED + ACCENT rings that entry's bell, head JOINED sways its rope. Album: *Full peal* (three
bells rung in one run), *Vespers* (every one hummed).

Glenn: B1 is the most interesting request on this page, and the one a pianist would argue with: making 3/2 audible
with accents can turn a vocal line into a hammered one. Keep it to the exposition.

### I/2 C minor · The Imp (or The Gossips / The Typewriter) · 3 voices, 31 bars, 8 entries, no stretto

**Stage.** Night attic, deep navy; three white keys as a faint row on the left strip; the imp's red held back for
the end. Ambient: none, or a slow lamp flicker at most. Count-in: the imp hops a key per count.

| Bar | Data event | Response |
|---|---|---|
| 1, 3, 7 | the exposition (A, S, B) | a key lights per voice |
| 3, 7, 11, 15, 20 | the countersubject's five returns | a faint echo-hop on the right strip |
| 9 | Busoni's double bar, end of the exposition | the attic's window brightens a step |
| 11 | the soprano's E♭ entry | (branch below) |
| 17 | G minor perfect cadence (Busoni's double bar) | the imp sits |
| 25 | Busoni's double bar: the last episode | the attic darkens one step |
| 26 | the bass entry (Busoni: octave doubling, "f non legg.") | the floor creaks once (visual: the strip's foot shakes a pixel) |
| last bar | the final major chord (the card) | the strips' strong side warms to the imp's red (the studio's moment) |

Visitor: the attic cat crosses at the bar 17 cadence, every third run.

**Letter.** (A1) *Stets staccato* (Busoni, footnote 1): every unmarked eighth of your counterpoint SHORT. (A2) *The
caesura* (soprano, bar 11; footnote 2): a gap before the E♭ entry, the entry DETACHED from the episode. His
"weightier tone" is not judged (loudness rule). (A3) *Bars 16 and 21* (footnote 3): the counterpoint light
staccato, the subject's syncopation held its full value.

**Property and against the letter.** (B1, Pursuit, against A2) *Hide the imp*: at bar 11 JOIN the entry to the
episode so it slips in unannounced. Separated: the imp pops up; joined: when you look, the imp is already sitting
there. (B2) *No louder* (the rule as a challenge): on the harpsichord, let the bass entry at 26 be heard by
articulation alone; as the bass, your entry held and joined against the others' short eighths; as an upper voice,
your eighths SHORT through bars 26–28. (B3) *An ornament where none is written*: a cadential trill at the bar 17
perfect cadence, on the voice with the leading note, by the shake (needs the score checked and the trill's place
in data).

Glenn: B3 is a standard freedom at a perfect cadence; never on the subject's head, and not in I/22.

### I/20 A minor · The Locomotive (owner's suggestion) · 4 voices, 87 bars, 39 entries, 18 inverted

**Stage.** A night line through an industrial valley, iron and coal-red; two connecting rods on the strips, one
for the upright subject, one for the inverted (D383's mirror logic on a machine); four cars, one per voice. Ambient:
the wheel turns one revolution per bar. Count-in: the wheels take a notch per count.

| Bar | Data event | Response |
|---|---|---|
| 1, 4, 8, 11 | the exposition (A, S, B, T) | a car couples per voice |
| 14 | the first inverted entry (soprano) and the E major cadence | the second rod starts |
| any | each entry | its rod drives (upright: upper; inverted: lower); the box's FIRE already drops sparks on inversions |
| any | STRETTO (26 entries begin inside another, by our count) | the spokes blur a notch, then settle |
| 40–42 | no entry begins (37 and 43 are the nearest); Bodky's "beautiful episode, più legato" | the train crosses a viaduct; steam softens |
| 60 | the piece's only half cadence (A minor) | a signal arm rises |
| 83 | A major perfect cadence | a light ahead on the line |
| 87 | the final cadence | the train stops; steam rises |

Visitor: a train on the other track at one inverted entry, every third run.

**Letter.** (A1) *Bodky*: nonlegato throughout (his subject marks on every entry), più legato in bars 40–42.
(A2) *Riemann's see-saw*: his accents on the subject's third and eighth notes and the short notes after them, on
every upright entry. Whether his marks carry to the inversions is Glenn's call; we would not invent them.

**Property and against the letter.** (B1) *Two rods*: invent the rule: one articulation for upright entries, the
other for inverted, the same through the piece. Either assignment passes; the rods couple when it holds.
(B2, Pursuit) *Overtake*: in a stretto where your voice enters second, play your entry against the leader's
articulation (the band plays its reading, so the game knows it): contrast, your car overtakes on the parallel
track; match, the train lengthens. (B3, Handicap) *Stoker*: Bodky's ♩ = 80 instead of Keller's 66, if the game offers a
tempo choice for a run (we did not find that it does).

Glenn: Keller calls it a "stretto proving-ground", Riemann "a light see-saw" with little rhythmic energy. B1 is
the right challenge for a piece where the inversion is the argument.

### I/22 B♭ minor · The Procession (kept) · 5 voices, 75 bars, 2/2, 24 entries

**Stage.** Teal-black road at dusk; five lanterns, one per voice, lit at each voice's first entry (the studio's
look); a church door unseen until the end. Ambient: the bearers' step, one per bar. Count-in: a step per count.

| Bar | Data event | Response |
|---|---|---|
| 1, 3, 10, 12, 15 | the exposition (S I, S II, A, T, B) | a lantern lights per voice |
| 25 | D♭ major perfect cadence | the road passes under an arch; light warms |
| 37 | A♭ major perfect cadence | the arch behind |
| 48–55 | entries at 48, 50, 50½, 53 and two together at 55 | the lanterns draw closer |
| 64 | deceptive cadence | (branch below) |
| 67–69 | five entries in two and a half bars | the lanterns gather (the studio's moment) |
| 74–75 | the major tonic at the end (key B♭ in the data from bar 74½) | the church door opens (the studio's moment) |

Visitor: a bird across the high window at the bar 25 cadence, every third run.

**Letter.** (A1) *Bodky*: the subject's first two notes molto tenuto, the others ben legato, on every entry.
(A2) *Riemann*: the first minim "the stronger accent": ACCENT on every entry's first note. (A3) *Keller*: "the rest
in the subject must be bridged over": we read it as the note before the rest held its full value, no early release
(our reading of his phrase; flagged).

**Property and against the letter.** (B1) *A big church*: on the organ, the whole fugue DETACHED, against Bodky's ben
legato (Glenn: defensible in a resonant room; his judgement, not a source). (B2, Pursuit) *Walk on or kneel*: at the
bar 64 deceptive cadence, JOINED across it, the procession walks on; a breath, the bearers kneel for a beat.
(B3) *Tell the five apart*: in bars 67–69, play your entry with the opposite articulation to the voice that entered
just before you; the five-voice form of "no louder".

Glenn: the data shows two entries beginning together at bar 55 (S II in A♭, alto in F). I would look at the score
before building a moment on it.

## 6. Questions for the owner

1. **Loudness as a branch.** May a branch read where across the strip a note lands (both outcomes rewarded), or
   must branches read articulation and time only? We recommend: may.
2. **Found branches.** May a branch fire before the player has armed it, explained on the result screen
   afterwards? We recommend yes, after the fugue's first finished run.
3. **Where requests live.** In the normal fugue run (one armed per run, from the card), or in a separate
   CHALLENGES mode? We recommend the normal run, so the stage is always the same world.
4. **Stage sound.** A short ambient before the count-in, and the stage's room size on the piano: wanted, or the
   music alone? We recommend the pre-count ambient only.

## 7. Before building

Data: augmented entries (I/8), trills' places, pedal points, later subjects; the cards' MIRROR seals can now be
judged where `inverted` is set (D196 says they wait for data; I/20's is there). A pursuit's glyph in the appendix
row needs Mario's drawing, and the result screen's album needs a design pass of its own.
