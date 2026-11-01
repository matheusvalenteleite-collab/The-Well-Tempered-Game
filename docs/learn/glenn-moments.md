# LEARN: a moment with Glenn

A proposal for the LEARN button on every piece, with a sample script for Prelude I/1 and a sketch of the organ moment. Status: proposal, not a decision.

## 1. What the owner is after

- **Desire before mastery.** The player should *want* the piece before playing it. They get a taste of it, never the whole meal.
- **A guide with a point of view.** Herr Bach explains the rules. Glenn shows what someone in love with the music hears in it, and his jokes make that easy to take in.
- **A lesson that feels like television, not a tutorial.** The player leans back and watches, and comes away knowing what to listen for and how the first bars go under their thumbs.
- **One cast across the game.** The first-launch scene, the per-piece moments and the instrument moments all share one character and one tone.

## 2. The format

### A scripted sequence, not a video file

A moment is a **script that the game performs live**: the engine's own synth, the real music box, Glenn's bubbles, all on a timeline that can be scrubbed. What this buys:

- **Languages.** The lines are text with keys, like the tutorial's. Portuguese and Spanish cost a translation, not a re-shoot. Timing follows reading time (below), so a longer translation stretches its line rather than breaking the cut.
- **Instruments and tuning.** The excerpts play on whatever sound and temperament the player has chosen. If the player picked the harpsichord, Glenn's excerpt is harpsichord.
- **The music box draws itself.** Flags ride on the real notes at the real scroll speed. The box on screen is the box they will play on, with no recorded look-alike to fall out of step with the next build.
- **Size.** A moment is a few kilobytes of JSON. Ninety-six moments as video would run to gigabytes.
- **Editability.** A wrong bar number or a weak joke is a one-line fix and a reload, with no editing suite involved. A test can also check every moment against `data/touch/` (bars exist, flagged notes exist, rule budgets hold).

Scrubbing works because the state at any time *t* is a pure function of the cue list: which bubble is showing, whether the box is blank or playing, which bars and at what level. Seeking re-evaluates that function and restarts audio at the right offset inside the current excerpt.

### What a script contains

One file per moment (say `data/learn/wtc1p01.json`), a list of cues in time order:

- **say**: a line of Glenn's, text key, mode `bubble` (box blank, Glenn shown) or `flag` (attached to a note).
- **play**: bars *a–b*, which voices, level (`soft` / `full`), tempo factor. It turns the box on.
- **flag**: a line pinned to one note (voice, bar, beat). It scrolls with the note and fades as the note passes the gold line.
- **blank**: the box goes dark and Glenn appears (at the piano, turned to us, or away).
- **pose**: Glenn's picture (playing, turned to camera, hand raised, looking at the ceiling).
- **chapter**: a named mark on the scrub bar ("THE PIECE", "HOW TO PLAY").
- **screen**: chapter 2 only, the real play screen in its tutorial dress (D402), the demo thumbs on, Glenn's face in the corner.
- **bed**: the background layer (see the rules).

Times are given in seconds for speech and in bars for music. Each `say` lasts at least 1.2 s plus 0.35 s per word (localised). A `play` lasts as long as its bars do at the piece's tempo. The engine lays them end to end, so translators never retime anything.

### Length

**About three minutes: 100–120 s for the piece, 80–100 s for how to play.** Three reasons:

1. The pieces themselves run from about one to six minutes. A moment much longer than the piece turns the lesson into the main event.
2. Television explainers hold attention in segments of a minute or two. Two segments with a visible jump point between them respect a player who only wants the second.
3. Excerpt budgets (below) allow about 30–45 s of music. Three minutes leaves room for talk without padding.

The hard cap is four minutes, and a chapter-2 replay should never take more than about 90 s.

### Keeping the majesty for the player

Rules, checked by a test over each script:

1. **At most 4 consecutive bars per excerpt** (8 in a piece whose bars are under 1.5 s), and never two excerpts back to back without talk between.
2. **At most 30% of the piece's bars quoted** in all, counting each bar once, however often it is replayed.
3. **Never the last 15% of the piece, the final cadence, or the climax.** The climax is marked by hand per piece in the script header (`noGo: [from, to]`), and the test refuses any play, flag or bed cue inside it.
4. **Out of order is fine; through-composed is not.** No sequence of excerpts may add up to a continuous run beyond rule 1.
5. **The bed is never the piece.** The "soft background" is the harmony of already-quoted bars only, as slow sustained chords at −20 dB with no figuration, no subject and no rhythm. It gives atmosphere without a performance.
6. **Chapter 2 may only use bars chapter 1 has already quoted**, plus the opening phrase.
7. **Glenn teases what he withholds.** Once per moment he names something he won't play, so the omission reads as a promise.
8. **Once the player has beaten the piece**, LEARN may offer an extra coda that plays the withheld passage. The rule protects the first hearing, not the music.

## 3. Alternatives

- **"Glenn interrupts you."** An optional mode in the real game where Glenn breaks in at three or four marked places ("you rushed that, everyone does") and the game rewinds two bars. It is more powerful than a video because it reacts to what the player just did, and it is cheap because it reuses the coach (`manual/coach.ts`) and the tutorial bubbles. Risk: it nags. Make it opt-in, at most once per section.
- **Radio Glenn.** Two minutes of words over the bed with the screen dimmed, like an audio essay. It is the cheapest option and needs no flags or chapter 2. It is weaker for teaching how to play, but good for Book II pieces nobody will learn soon.
- **Thirty-second clips placed in the game.** Split each moment into three cards: one on the piece's card ("what it is"), one before the first attempt ("how it starts"), one after a first failure ("the bar that got you"). Each card is the same script format with one cue range. This is probably the best value: no player has to choose to sit through three minutes, and everyone sees the right card at the right time. The full LEARN moment can simply be those cards in sequence.

## 4. Risks

**Gould is a real person who died in 1982.** His name, voice and likeness are managed by his estate, and personality rights after death differ by country and are actively enforced for well-known figures. A caricature also carries a reputational risk: fans of Gould are many, protective and articulate. My recommendations (not legal advice; get some before shipping):

- Ship an **original character with a different full name**. "Glenn" is already the project's in-house name for the keyboard player on the panel (D370, D376, D385), so keep that internally. On screen, either use a different name, or a bare first name with no surname, no portrait likeness and none of the famous trademarks put together (the low chair, the overcoat and gloves, audible humming, the coat in summer). Inspired-by should mean *the manner*: talking while playing, dry wit, contrarian enthusiasm.
- Never say "Glenn Gould" in the product or its marketing, and never imply endorsement. "In the spirit of classic music television" is fine.
- Note in passing: D36 and D111 name a sound preset "Glenn Gould" in the counterpoint app. That is the same issue on a smaller scale, and worth renaming at the same time.

**No invented quotations.** Nothing the character says should be presented as something Gould said. All lines are original, written for an original character, and none are paraphrases of known Gould remarks either. Paraphrase is how a fake quotation starts circulating.

**What Gould actually thought of the WTC.** I can verify that he recorded both books for Columbia in the 1960s and that the D379 fugue track already names his piece "So You Want to Write a Fugue?". I have not verified his specific opinions of individual preludes and fugues, so this document attributes none to him. The character's views below are the character's own, written as original wit. If someone later wants to draw on Gould's documented writing, cite a source for every claim and still don't put the words in the character's mouth.

**Busoni.** Mocking a long-dead editor's markings is fair game, but the target should be the edition's habits, never the man. The character is also obliged to follow those markings, which is the joke.

## 5. The first launch (the Professor Oak moment)

About 20 s, skippable after 3 s. A dim room, Glenn at the piano in profile, half turned towards the player.

```
0:00  [Glenn at the piano, side-on; he plays bar 1 of I/1 once, softly, and stops mid-bar]
0:04  "Ah. You're here. I was just playing the piece everyone plays."
0:08  "It has been arranged, sung over, and used to sell insurance." [turns fully to camera]
0:12  "It's also perfect, which is annoying. Shall we?"
0:16  [he slides along the bench to make room; title card]
```

(Charles Gounod really did write his *Ave Maria* as a melody over this prelude; Glenn can say so in the moment itself, below. The insurance line is a joke, not a claim.)

## 6. Sample script: Prelude I/1, C major

Checked against `fugueById("wtc1p01")` in `data/touch/pieces.json`: 35 bars, two voices (RIGHT HAND, the player's part by D251, and LEFT HAND), tempo about 55 quarters a minute (D229), so a bar takes about 4.4 s. Each half-bar is one chord: the left hand strikes a bass and then a held tenor note, and the right hand plays a three-note figure twice. Each half-bar's pattern is played twice in every bar. The highest note is the A5 of bar 5. The figure first turns around in bars 33–34. A G pedal in the bass runs through bars 24–31, and a C pedal through 32–35.

**Busoni:** the game's Busoni readings cover the 48 *fugues* only (`docs/wtc/readings/busoni/wtc1f01…wtc2f24`; `data/touch/readings.json` has no entry for `wtc1p01`). So for this prelude there are no Busoni markings to teach, and I have not checked what his printed edition does with it, so Glenn must not describe it. Chapter 2 teaches the plain notes and the game's own judging, and the Busoni gag becomes his *absence*. For a fugue moment, chapter 2 follows the reading's marks on the subject as the box shows them.

Header: `noGo: bars 24–35` (the pedal, the climax and the ending). Quoted: bars 1–4, 8–10 and 12. Total 8 of 35 bars, 23%. Bar 5 (the top A) is named but not played.

```
[chapter mark: THE PIECE]
0:00  [box blank; Glenn at the piano, turned to us]
      "Prelude One. Book One. The first page of the Well-Tempered Clavier,
       and very possibly the most-played page in the history of keyboards."
0:08  "Gounod liked it so much he wrote a tune on top of it and called it Ave Maria.
       Bach, I think, would have sent him an invoice."
0:15  "Here's the whole idea." [turns to the piano]
0:17  [plays bars 1–4, soft; box on]
      [flag on bar 1, LH C4: "One chord a bar. That's it. That's the trick."]
      [flag on bar 2, LH C4: "The bass hasn't moved. The harmony has."]
      [flag on bar 3, LH B3: "Down a step…"]
      [flag on bar 4, LH C4: "…and home. Four bars: leave, come back."]
0:35  [box blank] "A cadence in four bars, and no tune. Nobody hums this prelude.
       They hum the feeling of it."
0:42  [bed: chords of bars 1–4, −20 dB]
      "So the music is all in the bass, and in which chord comes next.
       Your right hand is the weather. The left hand is the geography."
0:50  [box blank] "Next bar, he reaches the highest note in the entire piece. Bar five.
       I'll let you find it yourself. He's spent his whole altitude budget by then."
0:58  [plays bars 8–10, soft]
      [flag on bar 8, LH B3: "A B under a C in the tenor. Rub the two together."]
      [flag on bar 10, LH D3: "A D seventh. Something in G is coming, and nobody's said so."]
1:12  [box blank] "Bar six borrowed an F sharp. That was a loan. This is a scandal."
1:16  [plays bar 12, soft]
      [flag on bar 12, RH C#5: "C sharp: not in C, not in G either. Enjoy it."]
1:21  [box blank] "Every bar is one chord, and every chord asks where the next one is.
       That's the whole piece: a conversation that keeps changing the subject."
1:28  [box blank; Glenn turns away from the piano]
      "Later, the bass gets stuck on a G for eight bars, and the chords pile up on it
       like snow on a roof. I am not going to play it for you."
1:36  "You'll get there yourself. That's rather the point."
1:40  [Glenn, to camera] "Right. Hands."

[chapter mark: HOW TO PLAY]
1:42  [screen: the real play screen, tutorial dress; Glenn's face in the corner]
      "Your part is the right hand. Three notes up, three notes up, then a new chord."
1:48  "Normally I'd tell you what Signor Busoni wants. He's not been given the preludes.
       Savour it. It won't last."
1:55  [demo thumbs play bar 1, at 0.8 tempo; box on]
      [flag on bar 1, RH G4: "You come in third. The left hand has two notes first."]
      [flag on bar 1, RH G4 (second time): "Again: wait for the bass."]
2:00  [flag on bar 1, RH E5: "Mostly alternate thumbs: left, right, left. The guide shows you. Don't think, rock."]
2:04  [demo thumbs play bars 2–3, at 0.8]
      [flag on bar 2, RH A4: "New chord: the shape changes, the rhythm doesn't."]
      [flag on bar 3, RH G4: "Bottom note back to G. Your thumb knows this one."]
2:15  "Even. Even. Every note the same size. This piece hates a show-off."
2:19  [demo thumbs play bar 4, at 0.8]
      [flag on bar 4, RH G4: "Home. Same as bar one, and that's a reward, not a repeat."]
2:24  "Once more, at speed. Wait for the bass, rock the thumbs, keep it even."
2:28  [demo thumbs play bars 1–4 at tempo]
      [flag on bar 2, RH F5: "Don't lean on the top. Let it float."]
      [flag on bar 4, RH E5: "Good. Breathe here, then keep going."]
2:46  [box blank on the play screen; Glenn's face]
      "That's the opening. Almost every bar after it has the same shape and
       goes somewhere entirely different. Off you go."
2:52  [end; button: PLAY]
```

Rules check: every excerpt is at most 4 bars; no two excerpts touch (1–4, 8–10, 12, with talk between each); nothing is quoted from bars 24–35; chapter 2 uses only bars 1–4. The withheld G pedal (bars 24–31) is teased at 1:28. Running time is 2:52.

## 7. The instrument moment: organ, on Sinfonia 9

One moment shared by every piece whose default sound is the organ, around 2:30. Built on Sinfonia 9 in F minor (BWV 795, `more-bach.json`, 35 bars, three voices). The data shows the alto opening alone over a bass that falls by semitone, F3 E3 E♭3 D3 D♭3 C3 (bars 1–2), with the soprano entering in bar 3.

- **Opening (blank):** Glenn at a small organ console, turned to us. "The piano lets you cheat with loudness. This thing doesn't. Every key is the same weight. Whatever you want to say, you say with *when* you let go."
- **Excerpt:** bars 1–2, the bass alone, flags on each falling semitone: "a staircase, all the way down." Then bars 1–2 with the alto, a flag where the voices clash.
- **The lesson:** on an organ, a gap is your only accent. Two quick demos of bar 3: everything joined (mush), then the same with lifts before the strong beats (speech). The flag reads: "Silence is the organ's forte."
- **Registration, briefly:** each voice on its own colour, so three voices stay three people, not a chord.
- **Close:** "Every organ piece in this game asks the same question: where do you breathe? Go and find out." Same rules: no more than 4 bars, nothing from the last 15%. For the harpsichord, a consort or a choir, the same frame applies with its own one question (harpsichord: "when does the note start?"; choir: "where does the word go?").
