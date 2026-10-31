# Brainstorm brief: from a fugue's title and picture to its scripted stage and its challenges

Written by the design studio session on 31 October 2026 for a separate brainstorming session the owner asked
for ("open a new conversation just for brainstorming"). Self-contained: everything needed is in this file,
the repo, or the claude.ai pages linked below (read them with the Artifact tool's `read` action).

## The owner's words (the brief)

> "Start doing some research on how you'll get from the titles and pictures to a complete art design of the
> fugues' gameplay, with scripted events and all. These scripted events happening at specific moments of the
> fugue, under the condition that some constraints are fulfilled, will also be the way from which we'll work
> out the special challenges of each fugue.
>
> I remember Pokémon Snap, a game I liked for how the stages were scripted in one sense, while also allowing
> for innovative gameplay during runs (e.g. this time I'm going to try to photograph the X instead of the Y,
> which requires me to do different things). The analogy is how a fugue run goes with the fugue inevitably.
> This is the scripted part and scripted events and design can be tailored without problem on this. The other
> aspects are non-scripted, possibly random events, that may happen at some times or not, or perhaps which are
> scripted too but require the player to engage in certain types of gameplay that are not what they would
> usually do, perhaps because it's against the reading. Perhaps special challenges require you to go against
> Busoni's reading. Maybe this distinguishes two general types of gameplay? Challenges based on playing
> according to Busoni's reading, and challenges based on playing in a more creative way following some
> constraints, and perhaps following some events, scripted and non-scripted? (I don't know what these could be
> like; I'm giving you general ideas for brainstorming.)"

## The game in one paragraph

Play.html: Bach's 48 WTC fugues (Book I for the friends; Book II unlocked) played on a sideways iPhone. The
player takes one voice; Bach's other voices play themselves. A scrolling "music box" (notes as blocks, a gold
NOW line at a quarter of its width) sits between two vertical touch strips; a thumb touches a strip at the
note's height. Judged: timing, the note's height, how a note is let go (JOINED, DETACHED, SHORT, ACCENT, SLUR
from a "reading"), whole subject entries ("SUBJECTS 2/5"), a crowd meter, a grade. Readings: Keller, Bodky,
Riemann (subjects only) and Busoni (whole pieces, I/1, I/2, I/8, I/16, I/24; the piano's default, D385).
Loudness comes from where across the strip the thumb lands (D311). Ornaments are shaken. Sounds: piano,
harpsichord, organ with one-touch stops, lute, etc. Read `docs/DECISIONS.md` (rows D340 onwards in particular,
and D383 the 48 pictures, D385–D390 Busoni and the expressive piano, D395–D399 the studio's latest).

## What the music data already gives every fugue (`data/touch/pieces.json`)

Per fugue: `entries` (voice, form subject/answer, key, bar, on/end, notes), `keys` (modulations with ticks),
`sections` (named spans: Exposition, "To the E♭ entry", …), `cadences` (bar, key, perfect/imperfect),
`countersubject` (entry, voice, on/end), bars, meter, voices. Elsewhere: the box's STRETTO flag (an entry
beginning inside another), subject effects per fugue (`src/touch/subject-cast.ts`: FIRE, EMBERS, SHIMMER,
GLINT, RIPPLE, PULSE, SMOKE, RAYS, HOP, TEARS), characters (`src/touch/character.ts`), readings
(`docs/wtc/readings/*.json`, `data/touch/readings.json`), notes on each fugue (`src/wtc/notes.ts`).
Not yet marked anywhere: which entries are inverted or augmented, where a trill falls (say so where an idea needs it).

## Where the studio has got to (read these pages)

- The 48 names, two new ideas each, every idea = name + picture + look on the play screen:
  https://claude.ai/artifact/MXDJttm8dG9ZmRmrdTnidQ (the owner is choosing now; read its `choices` store with
  ArtifactData if you have it, else work from the ideas).
- Each fugue's own look (the system: strip tint, a shape from the picture, one slow ambient, one quiet moment
  triggered by the music's data; four mocked on the real game): https://claude.ai/artifact/RxWe9ondiaLqEzfLDN9KsL
- The current pictures and the owner's verdicts: https://claude.ai/artifact/DrKtGUQgod9BM14bfvvmoS (store `verdicts`).

## Standing rules (never broken by any idea)

- Loudness is never tied to right or wrong. The subject is never louder.
- The box shows Bach's music: editorial marks are appendices above the notes; played notes may show how they
  were played. Nothing decorative inside the box beyond what exists (key-tinted ground, subject effects).
- The bass must stay audible on a phone. Zoom subtle and sparing, only at seams of the player's line (D399).
- Thumbs are the abstract disc-and-beam marks (glowing when pressing); L/R letters under played notes (D396).
- The game's fundamentals stay constant: note inks, the gold line, judging, the marks' vocabulary.
- Scripted visuals fire from the piece's data, never from hits or misses, unless a challenge explicitly is
  about the player's action (then say so and keep it honest).
- Never fabricate references, facts about the music, or claims about other games; mark anything unverified.

## What to produce

1. **The pipeline**: from a chosen name and picture to a full stage design: palette, the strips' world,
   ambient, the scripted moments (which data event, what happens, how long), sound-side ideas that respect
   the rules, the count-in and the result screen. A template the 48 can be filled in from.
2. **A taxonomy of events**: scripted (fire every run at a data moment: an entry, a stretto, a key change, a
   cadence, a section), conditional (fire only if a condition holds: e.g. "every note of the stretto JOINED",
   "the bass entry played at ff"), and unscripted/random (may or may not happen in a run: e.g. a visitor in
   the picture's world that appears at some cadence 1 run in 3). For each, how it is signalled, whether it is
   judged, and how it keeps the rules.
3. **Challenges, in two families** (the owner's hypothesis, to be tested, refined or argued against):
   (a) **by the reading** (play Busoni's or Keller's marks to the letter in a passage; the reading as the
   score), and (b) **creative under constraints** (play against the reading, or to a constraint the reading
   doesn't ask: a passage all DETACHED, one thumb only, the answer louder than the subject but the subject
   never louder, an ornament where none is written…), possibly prompted by events. The Pokémon Snap analogy:
   the run is fixed (the fugue goes on inevitably), but what you choose to "photograph" in a run changes how
   you play it. Propose concrete challenge types, how a player picks or discovers them, how they're scored
   without making loudness a verdict, and which belong to which family. Argue where the hypothesis is weak.
4. **Research**: games with scripted rails and player-chosen goals inside them (Pokémon Snap is the owner's
   reference; rhythm games and on-rails games with optional objectives are fair game). Only what you can
   verify; cite what you read. What transfers and what doesn't.
5. **Worked examples** for four fugues, using the current or proposed names: I/1, I/2 (Busoni whole-piece
   readings exist for both), I/20, I/22. Each: stage, scripted moments by bar, 2–3 challenges per family.
6. **Questions for the owner** where a choice is genuinely theirs.

Personas: Mario (graphic designer, visual language), Luigi (game designer, flow and pedagogy), Glenn (Bach
keyboard specialist, only for musical judgement). The owner is a professor of philosophy and an amateur
musician; treat them as a peer, no flattery, take positions.

Deliver as a claude.ai page (Artifact) and a Markdown file `docs/design/BRAINSTORM-RESULT.md` on your own
branch; do not change game code; do not merge.
