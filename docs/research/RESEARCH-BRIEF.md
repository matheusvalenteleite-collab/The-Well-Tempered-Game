# Brief for research sessions on new Bach works (second account)

Every research session on a new work follows this brief. The model to copy is `docs/research/ORGAN-TRIO-SONATAS.md` with
`data/sources/organ-trio-sonatas/SOURCE.md` (both on the branch `claude/zen-newton-g6qk06` until merged into dev).

## Ground rules

- **Research only.** Build nothing, change no game code, take no decision number, open no pull request, start no worker sessions.
- Read first: `CLAUDE.md`, the top of `docs/BACKLOG.md`, `docs/DECISIONS.md` (the index), and the model report above. Look at
  how the game already handles similar works: `tools/touch/more-bach.ts` (the MORE BACH pieces, their sources, `foldTrills`,
  `keepOrnaments`, `xmlRanges`, `xmlVoices`, divisi D363), `data/sources/*/SOURCE.md`; for vocal works also `bach-54`,
  `bach-228` and the chorale lyrics decisions (D347, D679); for concertos `bach-harpsichord-concertos` and `bach-1043`.
- Work only on this session's own branch; never push to dev or another session's branch; never force-push.
- **Do not edit `docs/BACKLOG.md`, `docs/DECISIONS.md` or `src/bench/version.ts`** (many research sessions run at once; the
  second account's coordinating session adds one BACKLOG line per report when merging).
- The owner's standing rules in CLAUDE.md apply to every recommendation (whole works, never add notes, ornaments from the
  print, loudness never tied to the score, the bass audible, no dull lines as the player's part, no sound change without the
  owner listening, real names in MORE BACH, MORE BACH behind the ricercar).

## Method

1. **Sources, cheap ones first:** files that already hold the notes (MusicXML/.mxl, MuseScore, LilyPond, Humdrum kern, MEI,
   MIDI). Check, at least:
   - **PDMX** (Zenodo record 15571083): download `PDMX.csv` (225 MB), search titles/song names/tags for the work's BWV numbers and
     names; then extract only the needed files by streaming `mxl.tar.gz` and `metadata.tar.gz` through `tar -xz --wildcards`
     (never keep the whole archive). verits99's CC0 sets (A = 415 Hz, a semitone low) are the game's usual source.
   - **Mutopia** (www.mutopiaproject.org, and its GitHub mirror github.com/MutopiaProject/MutopiaProject, `ftp/BachJS/`).
   - **IMSLP** work pages (file lists and licences). Its downloads sit behind a "verify you are human" page: **never try to get
     around it**; list such files for the owner to download by hand.
   - **GitHub** (`gh api -X GET search/code` / `search/repositories`): Humdrum (craigsapp, humdrum-tools, musedata), DCML,
     OpenScore, datasets; and public MIDI collections (e.g. Gary Bricault's step-entered Peters MIDI) as cross-checks only.
   - CPDL for vocal works; any other free source a search turns up.
   PDFs only as a last resort or as a cross-check of a few bars (a computer-made PDF still needs music recognition).
2. **Check the files** with the game's own readers (`tools/touch/musicxml.ts`, `tools/touch/lily_json.py`, `tools/touch/midi.ts`):
   lines per movement, ranges, notes per beat, ornament signs, repeats, tempo/metre changes. Cross-check two independent
   sources note by note where possible (onset+pitch, or pitch order with difflib) and report agreement per voice, and where
   and why they disagree.
3. **Fit with the game**, movement by movement: how many real lines; which make a good part for two thumbs; density and length;
   chords to be divided (D363); tempo changes inside a movement (D1078); repeats (D1078's REPEAT button); ornaments; words (vocal
   works); the bass; which of the game's sounds might suit (the owner chooses by ear).
4. **Rights** in plain words, with the project's precedent: CC0 and public domain used; CC BY-SA with a credit line; reserved or
   unclear rights only as a private cross-check (D366). Not legal advice.
5. **A suggested first slice**, reasons and rough effort, and questions for the owner.

## Output (commit and push to this session's branch)

- `docs/research/<WORK>.md`: summary first, plain English, "not verified" wherever unchecked, sources with URLs.
- `data/sources/<work-folder>/` with the free files fetched and a `SOURCE.md` (where from, licence, how checked). No files with
  unclear rights (give their URL instead).
- Report to the owner (a philosophy professor, not a programmer) in plain English, concisely, leading with what they must
  decide; end with a three-line handoff: what you found, what waits on the owner, what the main account must know, and the
  branch name.
