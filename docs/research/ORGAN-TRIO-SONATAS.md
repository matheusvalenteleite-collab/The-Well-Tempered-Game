# Bach's six organ trio sonatas (BWV 525-530) in the game: first research

Research only, written 28 November 2026 by the second account's session (branch `claude/zen-newton-g6qk06`). Nothing was
built, no game code changed, no decision number taken. Read alongside `docs/research/KEYBOARD-SUITES.md`, whose method this follows.

## Summary

1. **The music suits the game very well.** Each sonata is three independent lines, two manuals and the pedal, never more and
   never chords: exactly the game's shape (one line per voice, the player takes one, the band the others), like the Sinfonias and
   the Musical Offering's trio sonata, which is already in MORE BACH (D964). Three movements each (fast–slow–fast), 18 in all.
2. **Free scores exist for only two of the six, as far as this session could check: BWV 528 (Sonata IV, E minor) and BWV 529
   (Sonata V, C major), both on Mutopia, both public domain, with ornament signs.** The game's own LilyPond reader reads both
   whole, three clean lines per movement (checked below). The other four (525, 526, 527, 530): **not verified**. This session's
   network could not reach Mutopia's site, IMSLP, Zenodo (PDMX) or MuseScore; it read Mutopia through its GitHub mirror. One
   public project (github nanase/tools) took BWV 525's first movement from a public-domain MuseScore file in PDMX, so PDMX
   has at least some of them. A session that can reach Zenodo (the first account's could, for the suites) should check PDMX next.
3. **Sound is the open question.** These are organ pieces, but the owner found the old organ trio "horrible" (D437), and
   PIPE ORGAN was remade after "flat and dull" (D302). The sonatas are often played by a chamber trio (two violins or oboes and
   cello/bassoon), so ZELENKA TRIO, BAROQUE BAND or STRING CONSORT are natural alternatives. The owner listens before choosing.
4. **One movement needs a tempo change:** BWV 528 opens with an Adagio that turns into a Vivace inside one movement (the Mutopia
   file changes 4/4 to 3/4 at bar 5). D1078 already rules the game must learn this, for the suites.
5. **Suggested first slice: BWV 529, all three movements**, then BWV 528. Reasons in section 4.

## 1. Sources

| Source | What | Rights | Checked |
|---|---|---|---|
| Mutopia, BWV 529 "Trio Sonata V in C major" (Urs Metzger), from Edition Peters 8656 | all three movements in one LilyPond file (Allegro 3/4, Largo 6/8, Allegro 2/4) | Public domain (typesetter's dedication) | file `ftp/BachJS/BWV529/bwv529/bwv529.ly` of github.com/MutopiaProject/MutopiaProject, read 28 Nov |
| Mutopia, BWV 528 "Trio Sonata IV in e minor" (Felix Braun), from Neue Bach-Ausgabe, Bärenreiter BA 5057 | all three movements (Adagio–Vivace, Andante, Un poco allegro) | Public domain (typesetter). Its source is a modern critical edition; Germany protects such editions for 25 years from publication, and the NBA volume is older than that, so the risk looks low (**not legal advice; the date not verified**) | `ftp/BachJS/BWV528/SonataIV/` of the same repository |
| PDMX (MuseScore files) | at least BWV 525/I, as a public-domain file by the MuseScore user "Johann Sebastian Bach" (2013), per github nanase/tools `src/tools/organ/scores/bwv525.ts` | PD Mark, per that project | **not verified here**; whether verits99 (the game's usual CC0 source) did the organ sonatas is unknown |
| IMSLP | scans: Bach-Gesellschaft Band 15 (1867) and later editions; probably some free typeset editions | old prints PD | **not opened** (network blocked) |
| Humdrum / KernScores, OpenScore | none found: the GitHub lists of craigsapp, humdrum-tools and musedata have no organ sonatas | | GitHub search, 28 Nov |

Ornament signs in the Mutopia files: BWV 528 and 529 together carry 55 `\prall`, 6 `\prallmordent` and 3 `\trill` marks, a
few grace notes, no written-out trills seen. So "ornaments from the print" can come from the files themselves (to be checked
against the Bach-Gesellschaft print, as for the fugues, D206).

## 2. The two sonatas measured

Read with `tools/touch/lily_json.py` (the game's reader for MORE BACH), notes counted per voice; "beats" are quarter notes.
Lines are listed top (manual I), middle (manual II), pedal.

| Movement | length | notes per quarter (top / middle / pedal) | range (MIDI) | manuals crossed |
|---|---|---|---|---|
| 529/I Allegro, 3/4 | 463 beats (about 154 bars) | 2.50 / 2.56 / 1.14 | 57-84 / 48-77 / 36-62 | 11% of the time |
| 529/II Largo, 6/8 | 162 beats | 4.23 / 3.70 / 1.50 (many 32nds; slow) | 59-84 / 50-78 / 36-62 | 5% |
| 529/III Allegro, 2/4 | 326 beats | 2.46 / 2.31 / 1.54 | 59-84 / 50-81 / 36-62 | 10% |
| 528/I Adagio–Vivace | 199 beats | 2.31 / 2.36 / 1.55 | 59-84 / 52-76 / 36-60 | 6% |
| 528/II Andante, 4/4 | 180 beats | 3.05 / 2.81 / 1.67 | 54-84 / 53-81 / 38-62 | 20% |
| 528/III Un poco allegro, 3/8 | 146 beats | 3.84 / 3.63 / 1.98 | 57-84 / 50-79 / 38-60 | 10% |

What this means for play:
- The two upper lines are equal partners in the same register and **cross each other often** (5-20% of the time). The game
  already handles crossing voices in the fugues, but here it is the rule, not the exception: worth a look at how the lanes show it.
- Busy but playable, like a lively Invention or Sinfonia; the pedal is the easiest part.
- **Long:** 529/I is about 4½ minutes at a usual tempo, the whole of 529 about 14. Each movement a piece of its own (as the
  Musical Offering's trio, D964) keeps whole works whole.
- The pedal is a real line in the fast movements; in slow ones it can be plain (repeated notes, walking quavers): the "no dull
  lines as the player's part" test (the yardstick used for the Musical Offering's continuo, D964) decides which pedal parts are offered.

## 3. Fit with the owner's rules

- **Whole works, no added notes:** yes; three lines, no chords to divide, ornaments from the print.
- **The bass stays audible:** the pedal is the bass; the usual balance measurement (bass-phone, D1046) applies.
- **MORE BACH stays behind the ricercar; real names allowed** (invented names are only for the WTC): a new MORE BACH section,
  e.g. ORGAN SONATAS.
- **Tempi editorial** (no recordings in the game for these), as for BWV 998 and the Goldberg.
- **Sound change rule:** a new default sound for these pieces needs the owner's ear (a listening page), more so given D437.
- **Repeats:** none in the two files read, so the suites' REPEAT-button question (D1078) does not arise here.

## 4. Suggested first slice: BWV 529

- Its source is clean, public domain, from a 19th-century-based Peters edition, one file, three movements; the reader takes it
  as it is.
- No tempo change inside a movement (BWV 528's Adagio–Vivace needs D1078's tempo work first).
- Famous and bright; the fast movements suit two thumbs.
- Rough work: the piece table in `tools/touch/more-bach.ts`, a MORE BACH section, entries for the fugal last movement,
  editorial tempi, card pictures, a sound choice with a listening page (PIPE ORGAN against a chamber trio), tests in the style
  of the Musical Offering's. Medium effort; the riskiest part is the sound, not the notes.

## 5. Questions for the owner

1. Organ sound, or a chamber trio (ZELENKA TRIO, BAROQUE BAND, strings), or both to hear first?
2. Start with BWV 529 alone, or wait until sources for all six are found?
3. Is the pedal offered as a player's part where it is lively, and left to the band where it is plain?
4. MORE BACH section name: ORGAN SONATAS, TRIO SONATAS, or other?

## Not verified (nothing above rests on it)

The other four sonatas' free sources (PDMX, IMSLP typeset editions); the NBA volume's publication date; tempo figures and
durations (estimates from usual tempi, not recordings).
