# Tempo changes inside a piece, and a REPEAT button: a design (no build yet)

Written 28 November 2026 for the owner's rulings in D1078 (a) and (b). **Design only**: no game code was written or changed. One throwaway page exists to try the ideas by ear and thumb (section 10). No D number taken.

What I read: CLAUDE.md, docs/BACKLOG.md, D1078, docs/research/KEYBOARD-SUITES.md (tempo and repeat parts), and the engine: `src/bench/proto-game.ts` (the live game's engine), `src/touch/phrasing.ts` (the clock), `src/touch/tempi.ts`, `src/bench/tempo-steps.ts`, `src/touch/MusicBox.tsx`, `src/touch/lanes.ts`, `src/bench/her-clock.ts`, `src/bench/band-time.ts`, `src/touch/fugue.ts`, `src/bench/bench.css` (the thumb buttons), `tools/touch/thumb-reach.cjs`. Everything below that says "counted" is a text search, not a run; I did not run the engine on a tempo map.

## 1. Summary in plain English

1. **Tempo changes are cheaper than KEYBOARD-SUITES.md feared.** The game's clock already works by turning the score's time into "steady time" through a stretchable ruler (a function the code calls a *warp*). The final slowing, the held fermatas and, until the owner banned it (D260), the preludes' tempo drift all work that way. A tempo map is one more stretch of the same ruler. The count-in, click, drums, band and notes already follow that ruler, so they will follow a tempo map too.
2. **The real work is the judging and the music box, not the sound.** About 39 places in the engine use "one fixed number of ticks per second" (the timing window, how early a thumb may touch, lookahead, the box's fades). They are right today because the tempo never changes (and only slightly wrong in the last two bars). With a map they must ask "how fast is the music here?" instead. That is the bulk of the build and the main risk.
3. **How the player's own tempo mixes with the piece's changes: scale everything by the same share (your proportional idea).** SLOW, DEFAULT and FAST stay one button; each multiplies the whole map, so an Adagio stays half as fast as the Allegro whichever step is chosen. I examined four alternatives (section 4); none is better. Two safeguards: FAST is held back by the busiest section, and the slowest section gets a floor.
4. **Tempo changes only where the print demands them** (a slow introduction, an Adagio inside a prelude, the ritardando into a cadence), each entry citing its source. That fits D260 ("stable tempo") because nothing is invented.
5. **Recordings and the unlock are barely touched.** The "10 bpm to the fastest recording" unlock was only ever a BACKLOG proposal (tempo locks were removed in D863). The recordings feed the tempi through whole-movement durations, which is meaningless across a tempo change; a map piece needs its tempi per section (by the owner's ear first). KIMIKO (the Ishizaka recording clock) already follows any tempo changes because it is timed beat by beat.
6. **REPEAT is a jump of the clock back to the start of the section, once.** Unpressed play is exactly today's play. The hard parts are things that must not happen twice (the final slowing, scoring) and what the box does with notes already on screen beyond the section's end (sections 6 and 7).
7. **The button goes in the pistons' strip**, in the innermost slot of both bars, so it uses space that already passes the hit-tests. Two alternatives can be tried in the prototype. **Without words**: the musician's own printed repeat sign, or a plain lit key; the sign is a question for the owner (section 6).
8. **Size:** about 7 to 8 worker sessions in all, two at a time at most: tempo map about 3 (+1 if the metre also changes), REPEAT about 4, plus one short proof of the jump in the real engine before the REPEAT build.
9. **Order:** REPEAT first. French Suite 5 (the first slice) has repeats but, by the research, no tempo change; Partitas 2, 4 and 6 and English Suite 6 need the tempo map.
10. **Five questions for the owner** are in section 12.

## 2. How the engine handles time today

- **One tempo per piece.** `tempoOf(id)` (`src/touch/tempi.ts`) gives quarter notes a minute: the WTC from recordings (data/tempi/tempi.json, preludes.json), MORE BACH and the chorales editorially (data/tempi/more-bach.json: `normal`, `median`, `slow`, `unit`, `busiest`, `flag`). `stepTempi(id)` (`src/bench/tempo-steps.ts`) gives the three steps SLOW (0.75), DEFAULT, FAST (1.4, never under 1.3, capped so the busiest line stays within 7.5 notes a second). Chorales use 48/60/76. Some pieces open on FAST (D594, D710, D733). The choice is kept per piece on the device.
- **The clock** (`ProtoGame`): ticks a second = `tpq * bpm / 60` (`this.tps`, set once). Time is `anchorAt` (a moment) plus the warped ticks since `anchorTick`. `tickAt(t)` and `timeAt(tick)` convert both ways through `this.rit`, a warp built from: the final slowing (`ritard`, the last two bars to 78 per cent of the tempo, or the words of the edition's reading, D385), then `withHolds` (fermatas held, 1.8 times the value, D385), and, for the preludes' arcs, `withSpeed` (a tempo curve; no arc uses it since D260). A pause re-anchors the clock (`anchorAt`/`anchorTick`, around lines 5307-5313), so re-anchoring is an existing, working operation.
- **Everything that sounds** goes through `timeAt`: notes, the band's groove, the click, the count-in's length. They follow a warp for free. KIMIKO replaces the warp with her recorded beat map (`her-clock.ts`), so a recording's own tempo changes are already supported there.
- **What is judged is in ticks.** `options(tpq, bpm)` turns "250 ms either side" into ticks at one tempo; the Lab's windows (`MECH.earlyMs`, `perfectMs`, relative timing's median gap) do the same with `this.tps`. About 39 uses of `this.tps` in `proto-game.ts`, 5 of `fr.tps` in the box, and 2 to 3 in `BenchApp.tsx` (`zoomBox`, `initialRange`) assume one tempo. Functions that already measure in real time (`msOf`, `quickRides`'s `ms` argument, the listeners) are fine.
- **The box draws in ticks.** Every tick is the same width; the notes scroll by at the speed the warp gives (`BARS_SHOWN` = 3 bars on screen). A tempo change therefore shows as scroll speed, with nothing added to the picture.
- **Bars and sections.** `f.bars` is a list `{n, on}` (the print's bar numbers; bars may differ in length), with `barAt`, `barStart`, `inBar`. `f.sections` are `{name, fromBar, toBar, from, to}` and may overlap. The metre is **one** string per piece (`f.meter`), with one beat length (`beatOf`), used about 64 times as `this.beat` and 5 times as `perBar` (click accents, drums, the "long note" test). The chorales' fermatas are `f.fermatas` (ticks where play goes on).
- **Repeats today:** none in play. Each piece is cut "each half once" at import, and da capo bars are written out in the data. The Lab has nothing like a jump.

## 3. Representing tempo changes in the data

A new small file, **`data/tempi/tempo-maps.json`**, keyed by piece id, next to the existing tempi (an editorial layer like the arcs and fermatas; the score files stay untouched):

```
"bwv-xxx-yy": {
  "reference": "allegro",            // the section whose tempo `normal` in more-bach.json is
  "entries": [
    { "bar": 1,  "factor": 0.5,  "word": "Grave",   "source": "print"      },
    { "bar": 9,  "factor": 1.0,  "word": "Allegro", "source": "print"      },
    { "bar": 40, "ramp": { "toBar": 41, "to": 0.7 }, "source": "edition" }
  ]
}
```

- **Positions are bars** (and, where needed, a beat in the bar), using the print's own bar numbers, converted to ticks at load with the existing `barStart`. That is how the owner and the editions speak, and it survives a re-import.
- **Factors, not absolute numbers.** Each entry is a factor on the reference section's tempo. The reference section carries the piece's tempo record exactly as now (`normal`, `busiest`, `unit`), so every existing reader of `tempoOf` and `standardTempo` (difficulty, stars, tiers, cards, lessons) keeps working and shows the reference tempo. Where the print ties two tempi ("the dotted quarter of the Allegro equals the quarter of the Grave"), the factor is that ratio, written as a fraction with the source named.
- **Abrupt or gradual:** an entry with only `factor` is abrupt at that barline (the usual change of section). An entry with `ramp` goes by an even slowing or quickening over the bars named, using the same shape as the existing final ritard so the two sound alike. An explicit entry at the end overrides the automatic final slowing, as the edition's marked ending does today (`whole.ending`); otherwise the automatic one stays and rides on top of the map.
- **Every entry names a source**: `print` (Bach's own word or the Bach-Gesellschaft print), `edition` (the edition the piece is cut from), `recording`, or `editorial` (flagged like the editorial tempi already are). This keeps the owner's D260 line: the game never invents expressive tempo drift; the map holds only changes the music asks for, plus the final slowing.
- **Words** (Grave, Adagio, Allegro) are stored for the owner and for the pop-up card; whether any are drawn in play is a question (section 12).
- **If the metre changes as well** (a slow 4/4 introduction into a fast 3/4 or 12/8 section is common), the beat length must vary too: an optional `meter` on an entry, read by `beatOf`-users (about 69 places count the beat). Which suite movements need this is not known until the first is cut; I count it as one extra session.
- **Implementation of the clock:** compose one more warp with the existing `withSpeed(base, speed(tick), length, step)`, which is exactly "a factor on the tempo by tick, tabled every `step` ticks". With `step` = a sixteenth note an abrupt change is smoothed over a sixteenth, which is inaudible, and no new warp code is needed for the first version. An exact piecewise warp can replace it later.
- **Tools:** `tools/tempi/more-bach.ts` computes `busiest` (notes a second, 2 s windows) and caps FAST by it; it must read the map so that `busiest` is per section.

## 4. The player's tempo choice against the piece's changes

| Option | What happens | Verdict |
|---|---|---|
| **1. Proportional** (the owner's suggestion) | The step multiplies the whole map: SLOW 0.75, DEFAULT 1, FAST up to 1.4. Adagio and Allegro keep their ratio. | **Recommended.** One button as now; the composer's relationship is kept; the listener hears the same piece slower or faster. |
| 2. Anchored | The step sets the main section; the others keep their own absolute tempo. | Rejected: at FAST the Adagio would fall from half to about a third of the Allegro. The piece changes shape. |
| 3. A step per section | The player picks SLOW/DEFAULT/FAST for each part. | Rejected: more buttons on a screen with no room, and the first slowing of a bad Adagio is a choice nobody asked for. |
| 4. Proportional with clamps | Option 1, but a section never goes under a floor or over its load cap; where a clamp bites, the ratio squeezes a little (never the order of fast and slow). | **Recommended as the safeguard on 1.** |
| 5. Ratio from the print only | As 1, but every section's factor is fixed by the print's stated relationship, and the player cannot move a ratio. | This is already how the data is written (section 3). |

**The two safeguards in detail.**
- **A cap from the busiest section.** `fastTempo` today caps FAST by the piece's one `busiest` number. With a map it takes the smallest multiplier any section allows (the Allegro's load decides; a slow section never limits it). Nothing is clamped silently below DEFAULT.
- **A floor for slow sections.** SLOW (0.75) on a section already at half speed gives 0.375 of the Allegro: very slow for a thumb. A floor (a minimum quarter-note tempo, to be chosen with the owner's ear on a real piece) stops the squeeze from becoming boring or unplayable. I will not invent the number here.

**Where the player's choice shows:** the tempo button and cards show the reference section's tempo ("♩ = 100"), as `stepBeat` does today.

## 5. What must follow the map

- **Music box.** The notes keep their tick spacing; only the scroll speed changes, which is the correct picture. Check three things in a prototype build: the box is three bars wide in ticks, so in an Adagio you see more seconds ahead and in an Allegro fewer (as with any slow or fast piece, so fine); `zoomBox` and `initialRange` (`BenchApp.tsx`) use one tempo to size the starting view and must use the tempo at the start bar; the five `fr.tps` uses in `MusicBox.tsx` (fades, "ms since") must take the local speed.
- **Judging and windows.** Replace the fixed `this.tps` with `tpsAt(tick)` (the warp's local slope times the base), used wherever milliseconds become ticks: `options`, the Lab's windows, `relAt`, the RELATIVE timing median (`ioiMedian` now divides by one constant), the trill, slide and prep timings, the sweep grace. Rule: a window is **200 ms either side wherever the thumb lands**, so the same error in milliseconds is judged the same in an Adagio and an Allegro. The prototype draws that window to scale to show the point. Today's final slowing already leaves the windows slightly too wide in its last two bars (the slowing is to 78 per cent), and nobody noticed; the map adds ratios of 2 or more, where it would matter. Judge a note by the speed at **its own** tick, not the touch's, so a window never changes in mid-air at a tempo change.
- **Count-in:** at the first section's tempo (`countInStart` takes a tempo; give it the local one). If the player starts from a later section by the start slider, at that section's tempo.
- **Sound, band, click, drums:** nothing to do; they ask `timeAt`. Verify BAND TIME's FOLLOWS mode (`band-time.ts`), whose smoothing assumes a steady base: it takes the warp from its host, so I expect it works; test rather than assume.
- **Fermatas, final slowing, KIMIKO:** compose with the map (holds add steady time on top; the final slowing multiplies the last section's speed); KIMIKO's own clock replaces the map.
- **Difficulty and stars** (`difficulty.ts`, `tiers.ts`) must be measured on the busiest section's tempo, not on a blend.
- **Abrupt changes and the thumb.** An abrupt speed-up at a barline could cost the player the first notes. Listen for it in the prototype; remedies without words: the click/drums already change with the music (they follow the warp), and the box's scroll visibly quickens. If not enough, a one-beat lead (a short pickup) written into the map entry.

## 6. REPEAT: how it should work

**Principle:** the repeat is a decision taken in the last two bars of a section; unpressed, the game is exactly as today.

- **When it appears:** a window opening at the start of the second-last bar of a section that has a repeat, and closing **one beat before the section's end**. The closing beat is needed because the engine schedules sound a quarter to half a second ahead and the box already shows the bars beyond; the choice must be final before they are committed. At fast tempi the window is still two bars (about 5 seconds at quarter = 100 in 4/4).
- **How long it stays:** until the closing beat; pressing it lights it (latched); **pressing again before the closing beat cancels**, so a stray thumb is not punished. After the closing beat it disappears (no strobe, no flashing: it fades in over 150 ms and stays steady).
- **What pressing does:** at the section's end the clock goes back to the section's first bar, **once**, and plays it again; the second pass offers no second press (the print asks for one repeat). Unpressed, play goes on.
- **Where on the screen.** The thumb buttons are the pistons: three per bar at each bar's foot, 28 px tall, pointer-events only on the buttons, translucent (STRING CONSORT's five stops are two rows of 13 px). Each bar is 22 per cent of the screen wide less 12 px, so a piston is about **61 px wide at 932 x 430 and 42 px at 667 x 375**, below the usual 44 px target at the small size already.

| Place | Size at 667 / 932 | For | Against |
|---|---|---|---|
| **A: innermost piston's slot, on both bars** (recommended) | 42 x 28 / 61 x 28 | Uses space already cleared by the hit-tests; either thumb; nothing new over the notes. | Covers one stop for two bars (it comes back; a stop already set stays on). STRING CONSORT's two small rows need the innermost column given over as one key. |
| B: centre of the foot | 140 x 34, any size | Never touches a thumb pad or a stop; as large as wanted. | A thumb must leave its bar to reach it; shares the foot with the one-line legend, which would give way for two bars. |
| C: above the strip, inner edge, on both bars | 67 x 32 / 96 x 32 | Larger than a piston. | Sits over the rows a note can ask for; must be hit-tested against them. |

I could not settle this by arithmetic; the prototype lets the owner try all three at both sizes. Whatever the place, `tools/touch/thumb-reach.cjs` gains a case: a thumb holds a note while the other presses REPEAT, and the held note does not drop (the same test as the stops').

- **What it looks like without words or tags.** The owner's rule bars words and tags for morphs, canons and entries; a control is not one of those, but a printed word on it would be the nearest thing, so none by default. Options, all in the prototype: **(1) the musician's printed repeat sign** (a thick and a thin barline and two dots), drawn on the key and also at the section's end barline in the box (the box already draws barlines); **(2) a circular arrow**; **(3) a plain lit key** with no mark. The sign is the clearest to a musician but is a symbol drawn in play, which the rules do not clearly cover, so **it is a question for the owner**. Words are allowed outside play: the piece's pop-up can say "this piece has a repeat: tap the sign in its last bars to play the section again", and the HOW TO can show it.
- **What the box does:** it always shows the continuing bars beyond the section's end. If the player presses, the box beyond the end swaps to the repeated bars (a quick redraw of notes still more than a beat away). Showing nothing beyond the end until the choice is final is the alternative, but the player would then see the next bars late; I recommend the swap and will test it.
- **Taking it by the book, in the engine:** the jump is a re-anchoring of the clock (`anchorTick` back to the section's first tick) plus a reset of what is "already played": the notes' states in the section back to pending, the pointer into the band's notes, the beat pointer, the ornaments (they are keyed by tick and play the same again, as the print says). The per-piece layers (colour plan, drums, stages, growth, continuo, form) are mostly functions of the tick; a few may keep a "moving forward" state that a backward jump breaks. **That is the main uncertainty, and the reason for a short proof in the real engine first** (section 9).
- **Alternatives for the jump.** *Unroll the score* (the repeat written out as bars; pressed: play the copy; unpressed: skip it): the skip is a forward jump with the same trouble, and every tick-keyed layer has to be shifted. *Splice at press time*: same cost, more fragile. Rewinding the clock is the smallest change, and it matches what a repeat sign is.
- **Scoring the repeat.** The section's notes are judged again on the second pass. Questions: do the second pass's points count toward the grade? I recommend that the **grade and the per-bar "failed bar" use the first pass only**, and the second pass plays for its own sake (it feeds combos and the crowd as any music does) so that choosing the repeat never lowers or inflates the grade. Bar numbers repeat, so anything keyed by bar (failed bar, the takes recorder and its MIDI export) needs a pass number or the list of spans actually played.
- **The final slowing and a repeat of the last section.** The final slowing (the last two bars) and the REPEAT window are the same two bars. A slowing already begun cannot be taken back. For a piece whose last section can be repeated I recommend that the automatic slowing **start after the closing beat**, over the final bar and the beat before it, on the last pass only; that shortens it a little for those pieces, and only for them. Fermatas inside a repeated section are held on each pass, as the print would have them.

## 7. Edge cases

| Case | What I recommend |
|---|---|
| **Da capo (Menuet I, II, I)** | Write the da capo out in the data, as the verits99 files already do (KEYBOARD-SUITES.md): the piece simply is longer. No engine feature; plays as the print directs. The question is whether the da capo should instead be skippable by the same REPEAT key (section 12); the same jump would serve (a rewind to Menuet I, but defaulting to going back). Each Menuet's own repeats are the usual REPEAT. |
| **First and second endings** | Data: the repeat names the common body, ending 1 and ending 2. Unpressed: body, then ending 2 (as the game's practice now: first ending left out). Pressed: body, ending 1, back to the start, body, ending 2. The window therefore sits before **ending 1** (the end of the body), and unpressed needs a forward jump over ending 1's ticks. So the jump mechanism must go both ways (the same re-anchoring does). Notes inside a skipped span are never scheduled. |
| **Repeat of a section with ornaments** | Ornaments are keyed to ticks and the print's signs: the second pass is the same notes with the same ornaments. Written trills are always played. No embellishment is added on a repeat (the "never add notes" rule). Where Bach wrote out a varied repeat, the variation is in the data as other bars (it is not a repeat). |
| **Repeats in both halves of a dance** | Two independent windows, one per half; each offered once. |
| **A repeated section with a tempo change inside** | The map is by tick, so each pass plays it the same way; a ramp that ends the section (a ritardando before the double bar) is read as in the print, on each pass. |
| **Start slider (starting from a bar)** | A window is offered only if the section's first bar is at or after where play began. |
| **Pause in the window** | The window continues after the resume count; the closing beat stays the closing beat. |
| **Game variants** (BAND TIME waits, THUMBS A, lessons, TEST SCENES) | REPEAT is offered only in the main game and in test scenes at first. |

## 8. Recordings, audio sync and the unlock

- **Recorded tempi.** `tools/tempi/compute.ts` turns a recording's whole duration into one average quarter-note tempo over the piece's length. For a piece with changes that average is meaningless (an Adagio and an Allegro give a blend that is neither). A map piece needs per-section tempi: first editorial, set by the owner's ear and flagged `editorial` as the BWV 998 and Goldberg already are; later, where a recording can be time-aligned (as the Ishizaka recordings were, `tools/align-ishizaka-ticks.py`), measured per section. I did not check whether any freely licensed recording of the Partitas exists to align against.
- **Sync.** The only place the game plays alongside a real recording is KIMIKO, and her clock carries every tempo change in her performance already. Nothing else syncs to audio.
- **The unlock.** "The tempo unlock (10 bpm to the fastest recording)" is a BACKLOG idea (special challenges, the table still awaiting the owner's review); D863 removed the tempo locks and nothing implements it. If it ever returns, it would count in the reference section's tempo ("10 bpm above the fastest recording's Allegro") and move the whole map by the same share, which proportional scaling makes a one-line rule.

## 9. Size of the build, in worker sessions

| Step | Work | Sessions |
|---|---|---|
| 0 | **Proof of the jump** in the real engine on one test scene (developer view, TEST SCENES): a rewind and a forward skip on a short piece, with the layers listed in section 6; report what breaks. Before the REPEAT build, cheap, decides the design. | 1 |
| T1 | Tempo map: data file and reader; compose the map into the clock (`withSpeed`); one invented two-tempo test piece in the tests (clock round trip, monotone); the metre entry if needed. | 1 (+1 for metre changes) |
| T2 | `tpsAt` sweep: the 39 `this.tps` sites, `BenchApp` box sizing, the five `fr.tps` uses; tests that a 100 ms error is judged identically in a slow and a fast section. | 1 |
| T3 | SLOW/FAST rule per section (cap, floor), count-in, cards and tempo button, `busiest` per section in the tools, difficulty on the busiest section; a visual look at the box at both tempi. | 1 |
| R1 | REPEAT in the engine: data (`repeats`, endings), the jump, state reset, the final-slowing rule, takes. | 1 to 2 |
| R2 | The button: window, place, face, the sign in the box, the swap of notes beyond; hit-tests at 932 x 430 and 667 x 375 and the new thumb-reach case. | 1 |
| R3 | Endings, scoring of the second pass, tests; da capo written out. | 1 |

Total **7 to 8 sessions**, never more than two at once (the engine files overlap, so T and R are best run one after the other, REPEAT first, since French Suite 5 needs it and not the map). Owner time: a listening and playing session on the prototype, one on the first real movement with a tempo change (a sound-free change, so no A/B page is needed, but the owner's ear sets the ratios and the floor), and one to play REPEAT on a thumb.

## 10. The prototype

**`public/dev/tempo-repeat/index.html`** (developer-only, `noindex`, not linked from the game, not wired to any game code; the tune is an invented stand-in, not Bach). It has: an Adagio then an Allegro then a coda with a slowing; the player's tempo steps with the three ways of scaling (proportional, anchored, none); a music box at 932 x 430 or 667 x 375 with bars and the pistons' strip drawn to the real proportions; the timing window drawn to scale in milliseconds; the REPEAT button in the three places and four faces, with its window, latch, cancel and closing beat; the repeat sign at the section's end; a readout of the taps' error in ms. It is not deployed until the next deploy (no deploy was asked); until then it can be opened from the dev branch. Checked only by loading it headless (no errors; the layout renders); I did not tap through the REPEAT press in a browser.

## 11. Risks

1. **The 39 one-tempo sites** in a 5,600-line engine: a missed one gives a window that is wrong only in a section that is not the reference; tests must cover every kind of window at two tempi.
2. **A backward jump with stateful layers** (section 6). The proof session is there to find this cheaply.
3. **The box's notes beyond the section's end** change when REPEAT is pressed: a small visual jolt in the last bars. Test with the owner's eyes.
4. **The final slowing and REPEAT overlap** (section 6): a rule has to be chosen and the owner told.
5. **The ratios** between tempi are rarely stated by Bach; they come from editions and ears, and every guess costs listening time. The map's `source` field keeps it honest.
6. **The thumb button is small** at the small size (42 px); the owner's thumbs decide.
7. **Taking a repeat, then a scoring or takes bug**: bar numbers repeat; reports keyed by bar would double count.
8. **No sound changes** are involved, so the listening-page rule is not triggered; a change of scroll speed and a click are not sound design. The final-slowing change for repeatable last sections is a timing change; I would tell the owner and let him hear it.

## 12. Questions for the owner

1. **Words in play.** May the music box show a tempo word (Adagio, Allegro) for a moment where the print has one, as it already shows Busoni's printed words? Or nothing, and the player feels the change only in the scrolling speed? (My lean: nothing at first.)
2. **The repeat sign.** May the REPEAT key and the end-of-section barline carry the musician's printed repeat sign (two dots and barlines, no letters)? Or a circular arrow, or a plain lit key? Try the three in the prototype.
3. **Slow movements.** When the player chooses SLOW and the piece has an Adagio, may the Adagio be held to a floor (so SLOW makes the Allegro slower but the Adagio no slower than a set tempo)? I propose a floor of the owner's choosing, tried on the first real piece.
4. **Does the repeat count?** Should the second pass count toward the grade, or only the first (my recommendation, so that taking a repeat never changes a grade)?
5. **Da capo.** Should the Menuet I - II - I order simply be played as printed (my recommendation: the da capo written out, no button), or should "back to Menuet I" also be a REPEAT key you may skip?

(A sixth, smaller: where a last section can be repeated, I would start the final slowing after the closing beat; say if you would rather no REPEAT be offered at the very end of a piece.)
