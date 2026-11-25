# The Well-Tempered Game: project brief

For pasting into a Claude chat (no access to the code). Written 24 November 2026, for the live version WTC 3.34 (the version mark is in the top left of the card grid).

## What it is

A browser-based game in which you play Bach with two thumbs on a phone held sideways. You do not need to read music or have played an instrument. The pieces are Bach's own, whole and unaltered: the 48 fugues of the *Well-Tempered Clavier* (Books I and II) come first, then *The Art of Fugue*, the Inventions and Sinfonias, the Goldberg Variations, and a growing shelf of further Bach (concertos, chorales, the *Musical Offering*) kept behind a secret. It is a rhythm game in shape, and a way of learning how counterpoint works in practice: you learn a fugue by being inside one of its voices while the others play around you.

It runs at https://matheusvalenteleite-collab.github.io/The-Well-Tempered-Game/play.html and can be added to a phone's home screen, after which it works offline. It is meant for friends, students and anyone curious; it is not (yet) in an app store.

## How you play

The screen is split in three. In the middle is the **music box**: the piece drawn as a scrolling roll of coloured blocks, one colour and one place for each voice, height meaning pitch. Notes drift from right to left toward a gold line, the "now". On each side is a **thumb pad** for the left and right thumb. When a note of your voice reaches the gold line you touch the matching row of the pad, and the moment your thumb lands is the note. On the line scores PERFECT, near it GOOD, and a note let go by is a MISS. You choose which voice to take (soprano, alto, bass and so on); the other voices keep sounding, so you always hear the whole fugue, and what you play joins them.

Beyond tapping there are simple gestures that carry the music: hold a thumb to sustain a note; pass a note from one thumb to the other to join notes smoothly (legato is taught as passing a note from thumb to thumb, never as holding and lifting); slide to a neighbouring row for a slurred step; ornaments, where Bach's print writes one, are played with the thumb's own small gesture. Ornaments follow the printed score and written trills are always played. A **performance score** out of 100 (notes right, timing, touch, and the subject's entries) gives a grade from S down to D. A small **crowd** listens to the last few seconds of your playing and walks out if nothing is right for about six seconds, which ends the round. Each fugue is marked EASY, NORMAL or HARD, there are three tempos, and a practice mode lets you replay a stretch from a chosen bar.

## What is on screen between pieces

A card grid, laid out as the books are: each fugue is a card with a small pixel-art scene and an invented title ("The Imp" for the C minor, "The Stone-Skipper" for the C sharp major, and so on). Every fugue has its own pixel-art world behind the roll, a little journey that follows the music's keys and sections. The WTC pieces have invented names only; other works keep their own. A guide called BASICS, hosted by the pixel character Glenn, teaches the gestures in short steps. Herr Bach, a second pixel character, speaks in some of the guide's bubbles. The interface is in English, Brazilian Portuguese and Spanish.

## Sound

Everything is synthesized or sampled in the browser (Web Audio). You choose the sound of the whole piece, and each fugue has a default fitted to it. The choices include piano, harpsichord, organ, a string consort, solo voices, a baroque band, and deliberately playful "other worlds": GAME BOY, PSYCH, SWITCHED-ON (after *Switched-On Bach*), BERLIN SCHOOL and a 16-bit console. A drum kit can be switched on over the band sounds. Recordings (Kimiko Ishizaka's Book I, Arthur Loesser's Book II) were used to set tempi and to check the timing, not played in the game.

## What the owner will not compromise on

These are standing rules, useful to know before suggesting anything:
- Whole works only, and never any added notes. Ornaments come from the print.
- Loudness is never tied to the score; the bass stays audible; any effect on the player's own voice is subtle.
- No words or labels flashed in play for canons, morphs or entries, and no strobing.
- Lines that would be dull to play are not offered as the player's part.
- It must work with thumbs on small phones (tested at 932×430 and 667×375).
- No change to the sound ships until the owner has listened to A/B clips.

## State of play

Live now: Book I and II fugues, *The Art of Fugue*, Inventions and Sinfonias, Goldberg Variations, the BASICS guide, sound choices, the pixel worlds. Behind the secret: the 48 preludes (played by hands rather than voices), more Bach, the chorales, and developer tools. Approved but not built: slurred ornaments ("shakes") for each instrument's own way of trilling, and a morph for the crab canon of the *Musical Offering*. Open design questions: a visual redesign of the music box, fewer fermata slowdowns in the chorales, special challenges for the 48 fugues. The site's front page (`index.html`) now simply sends visitors to the game.

## The people and the shape of the work

One owner and designer, a philosophy professor, not a programmer; Claude Code sessions do the building and report in plain English. Decisions are kept as numbered rows (D1 to D1054) in `docs/decisions/`; the open and parked work is in `docs/BACKLOG.md`.

## Useful things to ask Claude chat

For a new repertoire, see the section just above. For the Bach game itself: how a gesture could teach a specific contrapunctal idea (stretto, inversion, answer at the fifth); how to word an explanation for a player with no theory; whether a design idea would break one of the standing rules above; how a given Bach piece might be shown on the roll. Claude chat cannot see the code or hear the sound, so judgement about feel and sound stays with the owner.

## For brainstorming another repertoire (a Beatles version)

The aim of this section is to help think about what a Beatles game could be, so these are the things to reason from, not conclusions.

**What the game is really made of.** (1) A piece is a set of separate lines, and you take one line while the rest keep sounding, so you always hear the whole piece and your part is inside it. (2) A big, readable picture of the piece scrolling toward a "now" line: a rhythm-game layout that doubles as a score. (3) Two thumbs and a few gestures (tap, hold, slide, pass a note between thumbs) that stand in for how the music is shaped. (4) Honest judging: right note, right time, plus touch. (5) A world for each piece, so the grid is a gallery you want to browse. (6) The sound is chosen by the player, and the piece survives being played on very different instruments. (7) The learning is a side effect of playing: you hear how a fugue works because you were inside one of its voices.

**What fits a Beatles repertoire naturally.** The bass lines (a bass part worth playing for its own sake), the vocal harmonies (two- and three-part singing as separate lines), the guitar and piano countermelodies, and the studio-era songs where several parts interlock. "Don't offer dull lines as the player's part" is the test: a rhythm-guitar strum is dull to tap, a McCartney bass line or a harmony vocal is not.

**What does not carry over without rethinking.**
- Bach's pieces are written as independent voices. Most pop songs are one lead voice over accompaniment, so "take a voice" needs a new meaning: a part (bass, lead, harmony, a guitar line), or a layer of the arrangement.
- The game's rule is whole works and no added notes, taken from a printed score. For the Beatles the source would be a transcription or the recording itself. Which of those, and who vouches for it, is open.
- Bach is out of copyright; the Beatles' songs and their published transcriptions are not. A version with their music would need permission, and that decides much about how public it could be. A good brainstorm should say early whether it assumes a private or friends-only toy, a licensed product, or an original game inspired by the idea with no Beatles music in it.
- Lyrics and the sound of the recordings carry much of a Beatles song's identity. Bach's pieces were designed to survive any instrument; a song may not.
- Names and pictures: the game gives each Bach piece an invented title and pixel scene, a rule kept only for the WTC pieces. For songs, the real titles would probably stay, which changes what the cards can say.

**Open questions worth brainstorming.** What is a "voice" in a Beatles song, and which songs have enough of them? Would the player play melody or the part underneath it? Is the unit one song or an album as a journey (the grid as a record sleeve)? What could the "crowd" and the "subject's entries" be in a pop song: the chorus coming back, the hook? How would the gestures map onto a bass slide or a guitar bend? What would the worlds be: one scene per song? What is the teaching, if any: harmony, arrangement, the studio?

## Technical footing, in one paragraph

A web page built with Vite, React and TypeScript, with Web Audio for sound and canvas for the picture; about 1,800 automated tests; the whole game downloads about 0.9 MB compressed before the grid appears, and instrument recordings load as needed. The score data comes from open editions of the notes (the Humdrum WTC encoding and others); its rights must be settled before any wider public release.
