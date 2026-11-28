# Source: ornament signs of Bach, French Suite No. 5 in G, BWV 816 (research prototype, 28 November 2026)

Derived lists only. The fetched Mutopia files are not kept in the repo.

| item | detail |
|---|---|
| Fetched from | Mutopia Project, piece page https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=99 ; files https://www.mutopiaproject.org/ftp/BachJS/BWV816/french-suite-5/french-suite-5-lys.zip (seven .ly files, one per movement; dated 2008 in the zip) |
| Licence | **Public Domain** (the piece page's "Copyright" field; the files' own header says the typesetter, Joel Mayes, placed them in the public domain). Source edition: the page says "Unknown". |
| Kept here | `french-suite-5.ornaments.json`: per movement, one row per sign or small note: [bar, staff:voice, pitch, sign(s), small-note?]. Repeats are unfolded, so a sign in a repeated half appears twice. `french-suite-5.alignment.json`: the line-up against the MuseScore file. |
| Made by | `tools/suites/mutopia_ornaments.py` (uses the repo's LilyPond reader `tools/wtc/lily.py`) |
| Lined up against | MuseScore user "verits99", "BWV 816: French Suite V (A = 415 Hz)", score 764746, via PDMX (Zenodo DOI 10.5281/zenodo.15571083), licence field `cc-zero`. Not kept here either. |
