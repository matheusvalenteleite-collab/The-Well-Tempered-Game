# Bach's keyboard suites for the developer game: first research

Research only, written 28 November 2026. Nothing was built, no code was changed, no decision number was taken (the next free one is still after D1077). "Developer game" is read here as MORE BACH behind the ricercar, where the Goldberg Variations went first ("Put it in MORE BACH first. If I like it, it'll be promoted", D757).

Everything below is checked unless it says **not verified**. Where a number comes from a script I wrote, it is from the score files themselves, not from the printed Bach editions, and says so.

## Summary

1. **Scores exist, for all 18 suites, complete.** The same MuseScore user who gave the game the Book II preludes, the harpsichord concertos, BWV 998 and the Musical Offering (user "verits99", published as CC0 through the PDMX dataset) has every movement of all six English Suites, six French Suites and six Partitas, at Bach's own pitch. Nothing else free is complete: Mutopia has only 3 of the 6 French Suites, 5 English Suite pieces and, for the Partitas, a mixture (details in section 1).
2. **Two catches.** (a) verits99 writes trills out as ordinary notes and marks no ornament signs at all (0 trill signs in the 114 files I read, 508 small grace notes). So "ornaments as printed" cannot come from his files alone; the signs would have to come from Mutopia where it has the piece, or be read by eye from the Bach-Gesellschaft print, as was done for the fugues (D206). (b) His repeats are mostly written out as copies (or left out); each file then has to be cut into movements and into "each half once", which the game already does for the Goldberg and BWV 998.
3. **Mutopia's Partitas 3 and 6 are not the printed versions.** I opened the files: they are the 1725 Anna Magdalena notebook versions (Partita 3 has six movements, a Prelude and one Menuet where the print has seven, with a Fantasia, a Burlesca and a Scherzo; Partita 6 has a Prelude where the print has a Toccata and no Air; I did not check how far the music itself differs). The Mutopia page labels them with the Bach-Gesellschaft; the file's own header points at the notebook.
4. **Fit with two thumbs is good for most.** By my counts, of 136 movements (counting each da capo and Double separately) 86 look straightforward (two clear hands, light chords, not too busy), 33 are best offered as the top line only (chordal or a very sparse bass), and 17 are hard (very fast runs, or thick chords). Most Sarabandes are chordal; the Gigues are mostly fine in two or three lines; the very fast ones are English Suite 6's Gigue, Partita 3's Allemande, Partita 6's Corrente and Allemanda. These are first guesses from counts, not play-tests.
5. **What the game cannot do today:** a tempo change inside a piece (the owner's D385 line: no tempo change but at a fermata and at an ending). That matters for Partita 4's French overture, Partita 2's Sinfonia, Partita 6's Toccata and the Adagio inside English Suite 6's Prelude.
6. **Recommended first slice: French Suite No. 5 in G (BWV 816), seven movements**, all at once as one suite. Reasons and rough effort in section 4.
7. **No added notes, no swing, no overdotting anywhere in this plan.** Dotted rhythms and "notes inégales" are played as printed; the game's existing tiny timing humanisation is the only thing that touches them (question 8).

## 1. Sources

All pages and files below were opened on 28 November 2026 unless it says otherwise.

### 1.1 What the repo already does (how a new source gets in)

- Every source gets a folder `data/sources/<name>/` with a `SOURCE.md` giving the exact page or file, the licence, how it is read and what was checked against what (see `bach-998`, `bach-988`, `bach-harpsichord-concertos`, `musical-offering`).
- `tools/touch/more-bach.ts` reads each piece into `data/touch/more-bach.json`. It has two readers: LilyPond (Mutopia; `tools/touch/lily_json.py`) and MusicXML (`tools/touch/musicxml.ts`). A table says, per piece, which bars and which written layers ("staff:voice") are the voices (`xmlRanges`, `xmlVoices`), joins a line that changes hand, and corrects notes found wrong against the print (`fixes`).
- Already built for exactly this kind of file: `foldTrills` (a written-out trill folded back into one note with a trill sign; no note added; D964), `keepOrnaments` (the edition's signs and small notes kept, D757), `xmlTranspose` (for files written a semitone low), `endChord`, `ornFixes` (signs the print gives otherwise). Chords go to the band (D363 divisi) so every offered voice is one line.
- Around the notes: a section in `src/bench/lite.ts` (MORE_SECTIONS) and a collection name in `src/touch/fugue.ts`; editorial tempi in `tools/tempi/more-bach.ts` (no recordings exist for these pieces, so tempi would be editorial, as for BWV 998 and the Goldberg); card pictures and worlds (`src/bench/pictures-data.ts`, `src/touch/stage-bg.ts`, colour plans); default sound; credits (`src/ui/Credits.tsx`); translations; tests in the style of `test/d757-goldberg.test.ts`.
- Precedent for rights: verits99's CC0 files are already used in four places; CC BY-SA files are already used (the Inventions, D340) with a credit line and the derived data shared alike; Humdrum files with reserved rights are kept as a private cross-check only (D366).

### 1.2 The sources, one by one

| Source | Format | What it covers | Rights | Page or file checked |
|---|---|---|---|---|
| **verits99 on MuseScore, via PDMX** | MusicXML (compressed), one keyboard part on two staves | **All 18 suites, every movement**, each suite as one whole file (titled "(A = 415 Hz)"), plus many single movements (95 single-movement files as well; the whole files have every movement) | **CC0** per the dataset's record of MuseScore's metadata (details below) | Dataset: https://zenodo.org/records/15571083 (DOI 10.5281/zenodo.15571083), files `PDMX.csv`, `metadata.tar.gz`, `mxl.tar.gz`. Uploader page https://musescore.com/user/13172 (answered 403 to me, as it did to the earlier session, so **the licence was not re-read live on MuseScore**) |
| **Mutopia Project** | LilyPond and MIDI, from the Bach-Gesellschaft (BG) | Partitas 1, 4, 5 whole; Partita 2 only its first two movements; Partitas 3 and 6 as the 1725 early versions; French Suites 3, 5, 6; English Suites: only five pieces | Public domain, except French Suites 3 and 6 and Partita 4 (CC BY-SA 4.0). Listing and licences as shown on https://www.mutopiaproject.org/cgibin/make-table.cgi (Composer=BachJS: all 417 pieces listed were read) | Piece pages `piece-info.cgi?id=` 474, 602, 1080, 2114, 421, 1497, 100, 99, 1935, 85, 86, 82, 83, 84; files under https://www.mutopiaproject.org/ftp/BachJS/ |
| **IMSLP** | Scans only | Bach-Gesellschaft Band 3 (Partitas, 1853), Bands 13.2 / 45.2 (French Suites, 1865 / corrected 1895), Bands 13.2 / 45.1 (English Suites, 1865 / corrected 1895); Neue Bach-Ausgabe (NBA) volumes; Peters and others | "Public Domain" for the old prints; the NBA and Henle urtext editions carry IMSLP's "see notes on copyright status for urtext editions" or "Non-PD" tags | https://imslp.org/wiki/6_French_Suites,_BWV_812-817_(Bach,_Johann_Sebastian), https://imslp.org/wiki/6_English_Suites,_BWV_806-811_(Bach,_Johann_Sebastian), https://imslp.org/wiki/Partitas,_BWV_825-830_(Bach,_Johann_Sebastian). The English Suites and Partitas pages show "MIDI 0 / Source files 0"; the French Suites page lists no MusicXML or MIDI (I read its first 100,000 of 136,850 characters) |
| **ASAP dataset** | MusicXML | none of the suites | CC BY-NC-SA 4.0 (the repo's own note, D366) | `metadata.csv` of https://github.com/fosfrancesco/asap-dataset: its Bach folders are Fugue, Italian_concerto and Prelude only |
| **Humdrum / KernScores / CCARH MuseData** | kern | **not verified**. kern.humdrum.org, kernscores.stanford.edu and its UTF-8 mirror all returned 503 (maintenance) on 28 November. What I could see: the GitHub lists for craigsapp (bach-370-chorales, bach-musical-offering), humdrum-tools (inventions, bach-wtc, bach-wtc-fugues) and musedata (bach-chorales-185, bach-brandenburg) show no suites. A web search found no suite in kern | — | https://github.com/craigsapp?tab=repositories&q=bach, https://github.com/humdrum-tools?q=bach, https://github.com/musedata |
| **Other MuseScore uploaders in PDMX** | MusicXML | Partitas 3 and 5 whole ("pental"), a six-Partita set ("markpearse"), English Suite 3 ("priolin"), French Suite 1 movements ("pental"), a few more | CC0, but several carry PDMX's `license_conflict = True` | Same dataset; not used further |
| **OpenScore, Bach Digital, NBA/Henle files** | — | **not verified**: I found no suites in OpenScore; I did not open Bach Digital's catalogue (only its shelfmarks as quoted by Henle and IMSLP) | — | — |

### 1.3 The main candidate in detail: verits99's whole suites

- **The 18 whole-suite scores** (musescore.com/user/13172/scores/<id>): English Suites 770056, 770546, 774921, 775341, 778371, 779796; French Suites 757631, 759376, 762581, 762891, 764746, 765086; Partitas 785016 (No. 1), 787496 (No. 2), 789831 (No. 3), 790836 (No. 4), 792431 (No. 5), 795281 (No. 6). Each is also published in the dataset twice (one copy labelled "Harpsichord sound"); the notes are the same. All 18 show 3 December 2019 as the last update (the same day, so a bulk edit).
- **Licence field:** `cc-zero` for all 114 of his files I extracted, `license_conflict = False` for all (so the score's own text names no other licence). **One flag:** all seven of his Partita No. 1 scores (the whole suite and six movements) have the field `is_public_domain = false`, though the licence field says CC0. The BWV 951 source note has the same oddity and treated the licence field as the uploader's choice (data/sources/bach-951/SOURCE.md). For Partita 1 there is a clean fallback: Mutopia's public-domain edition (id 474).
- **PDMX's own caveat**, quoted from its Zenodo page: it found "a discrepancy between the public-facing copyright metadata on the MuseScore website and the internal copyright data of the MuseScore files themselves, which affected 31,221 (12.29% of) songs" and "decided to proceed with the former". The dataset itself is CC BY 4.0.
- **Pitch:** the titles say "A = 415 Hz" but the key signatures in all 18 files are Bach's own keys (checked: each file's first key signature, e.g. Partita 1 B-flat, Partita 6 E minor, French Suite 3 B minor). So, unlike the concertos and the Musical Offering (written a semitone low), **no transposition seems needed**. I did not compare note by note with the print.
- **Completeness:** each whole file contains every movement, in order, with the typesetter's words at each start (so a movement can be found), and the da capos written out ("Menuet I da capo", "Bourree I da capo", "Gavotte I da capo", "Passepied I da capo", and the like). Every movement in Wikipedia's lists is there (English Suite 6's Allemande and Partita 3's Sarabande carry no typesetter's word but show by their change of metre), checked against https://en.wikipedia.org/wiki/English_Suites_(Bach), .../French_Suites_(Bach) and .../Partitas_for_keyboard_(Bach).
- **Repeats:** no repeat signs are used (0 in all files). Where he wrote repeats out, the second pass is an exact copy (my script found identical doubled blocks in, for example, French Suite 1's Sarabande, 8+8+16+16 bars of 48, and French Suite 3's Menuet). In many movements the bar count does not double, so either he left the repeats out or wrote them differently: **not resolved, would have to be read against the print**. "Bars in file" in the tables is therefore not the printed bar count.
- **Ornaments:** see summary point 2. His grace notes (508 over the 114 files) are the small notes, which the game already reads. Long trills written out as notes can be folded back by `foldTrills`; a mordent or a short trill written out as three or four notes may not be recognised and would stay as notes.
- **Editorial base:** not named in any file. Wikipedia's French Suites page says that ornamentation "varies both in type and in degree across manuscripts", and there are two versions of the French Suites in Bärenreiter's edition (Fassung A, the older, and B, "embellished", as the Bärenreiter blurb found by my search describes them). **Which version his files follow is not verified.**
- **Voices:** one part, two staves, voices as written layers. My script counted them per movement (the tables below).

### 1.4 Mutopia in detail

| Suite | Mutopia page | What is there | Licence | Notes |
|---|---|---|---|---|
| Partita 1, BWV 825 | id 474 | six movements (Praeludium to Giga), source "Bach-Gesellschaft" | public domain | ornament signs kept (a text count: about 49 pralltrillers, 2 mordents) |
| Partita 2, BWV 826 | id 602 | **only the Sinfonia and the Allemande**; the other four are commented out in the file | public domain | not usable whole |
| Partita 3, BWV 827 | id 1080 | **six movements: Prelude, Allemande, Courante, Sarabande, Menuet, Gigue**: the 1725 notebook version (file header names the Anna Magdalena Bach notebook, IMSLP link) | public domain | not the printed Fantasia, Burlesca, Scherzo version |
| Partita 4, BWV 828 | id 2114 | seven movements; source "First edition by J. S. Bach, In Verlegung des Autoris" (the 1731 print itself) | **CC BY-SA 4.0** | the best-sourced one; about 47 pralltrillers, 17 mordents, 11 appoggiaturas |
| Partita 5, BWV 829 | id 421 | seven movements | public domain | about 36 pralltrillers, 9 mordents, 4 appoggiaturas, small notes |
| Partita 6, BWV 830 | id 1497 | **six movements: Prelude, Allemande, Courante, Sarabande, Tempo di Gavotta, Gigue**: the early notebook version (no Air; a Prelude in place of the Toccata) | public domain | not the printed version |
| French Suite 3, BWV 814 | id 100 | whole, source "Bach-Gesellschaft, 1863" | **CC BY-SA 4.0** | |
| French Suite 5, BWV 816 | id 99 | whole (seven movements), **source "Unknown"** | public domain | about 29 pralltrillers, 15 mordents, 3 trills, 1 turn, 14 small notes |
| French Suite 6, BWV 817 | id 1935 | whole (eight movements), source "Bach-Gesellschaft, 1863" | **CC BY-SA 4.0** | the most trills (about 13) |
| English Suite 1, BWV 806 | ids 85, 86 | **only Bourrée I and Bourrée II** | public domain | |
| English Suite 2, BWV 807 | ids 82, 83, 84 | **only Bourrée I, Bourrée II and Gigue** (a file named "prelude" on the server is the Gigue) | public domain | |
| French Suites 1, 2, 4; English Suites 3-6 | none | — | — | — |

The ornament counts are a rough text search of the LilyPond files (not checked against the print; LilyPond's `\prall` is the short upper trill, `\mordent` the lower).

Mutopia's value here is as the second reading for a check (notes and the print's ornament signs) and as the fallback for Partitas 1, 4 and 5; it cannot carry the project alone.

### 1.5 What a new source would need (summary)

For a first slice from verits99: (1) a `data/sources/bach-suites/` folder with the MusicXML and PDMX metadata kept, SOURCE.md written; (2) table rows in `more-bach.ts` per movement (bar ranges, layers, `foldTrills`, each half once); (3) a read against Mutopia (where it has the piece) and then against the Bach-Gesellschaft print, bar by bar, with differences corrected as the other sources were (the print is on IMSLP, listed above); (4) the ornament signs, from Mutopia or by eye; (5) the usual game-side files (section, tempi, pictures, credits, tests). Nothing new in kind is needed, except a decision on repeats and da capo (section 3) and, if wanted, a tempo change inside a piece.

## 2. The repertoire, movement by movement

How to read the tables. Every figure comes from a script reading verits99's MusicXML (the whole-suite file cut at the typesetter's movement words); none is from the printed score, and the "Metre" is as encoded, which I did not check against the print.

- **Bars in file:** includes repeats written out and the da capo bars; not the printed bar count.
- **Lines:** how many written layers carry at least 8% of the movement's notes (the repo's own rule for voices). This counts layers, not contrapuntal voices: in a Sarabande, four layers usually mean chords split across layers.
- **Chords:** the share of moments where three or more notes are struck together.
- **Busiest hand:** notes per quarter-note beat in the busiest hand at its busiest (the 90th percentile over four-beat windows). For comparison the game's own difficulty stars start at 4.0 notes a second and reach 7.4 (`src/bench/difficulty.ts`); the tempo is still to be chosen, so the two cannot be compared yet. A figure of 5.5 or more is very busy.
- **Bass:** notes per beat in the lowest line; under 1.1 means the bass is sparse (about one note a beat or fewer), a likely "dull line" for the owner's rule.
- **Fit (my first guess, from the counts only):** **A** suits two thumbs as it stands (chords under 15%, busiest hand under 5.5, bass not sparse); **B** offer the top line only (chords 15% or more, or a sparse bass); **C** hard (very busy, or chords 35% or more).
- **da capo rows** are the same music as the first dance, played again as the print directs (Menuet I, Bourrée I, and so on). **Repeats:** all printed repeats are to be taken once (the game's practice since the Inventions), which is the first question to the owner. **Ornaments:** written trills and short signs in these suites are everywhere (see section 3); I did not count the printed signs per movement because the file has none.

### English Suite No. 1 in A major, BWV 806

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Prelude | 12/8 | 37 | 3 | 18% | 3.25 | 1.53/beat | B |
| Allemande | 4/4 | 65 | 4 | 19% | 5.0 | 2.5/beat | B |
| Courante I | 6/4 | 41 | 3 | 11% | 4.75 | 1.38/beat | A |
| Courante II | 6/4 | 49 | 3 | 11% | 5.0 | 1.54/beat | A |
| Double I * | 3/2 | 49 | 2 | 8% | 4.0 | 1.61/beat | A |
| Double II * | 3/2 | 50 | 2 | 8% | 5.0 | 1.71/beat | A |
| Sarabande | 3/4 | 64 | 3 | 15% | 5.25 | 1.95/beat | A |
| Bourree I | 4/4 | 97 | 2 | 0% | 3.25 | 1.48/beat | A |
| Bourree II | 4/4 | 73 | 2 | 0% | 2.0 | 1.58/beat | A |
| Bourree I da capo | 4/4 | 49 | 2 | 0% | 3.25 | 1.44/beat | A |
| Gigue | 6/8 | 81 | 2 | 1% | 5.0 | 3.79/beat | A |

\* Double I: a Double of the Courante II (as the file orders them)  
\* Double II: a second Double

### English Suite No. 2 in A minor, BWV 807

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Prelude | 3/4 | 164 | 2 | 7% | 4.0 | 2.36/beat | A |
| Allemande | 4/4 | 49 | 3 | 11% | 4.25 | 2.73/beat | A |
| Courante | 3/2 | 50 | 2 | 2% | 4.25 | 1.47/beat | A |
| Sarabande | 3/4 | 56 | 4 | 22% | 4.0 | 1.15/beat | B |
| Bourree I | 4/4 | 113 | 2 | 0% | 3.0 | 1.44/beat | A |
| Bourree II | 4/4 | 49 | 4 | 25% | 2.0 | 1.1/beat | B |
| Bourree I da capo | 4/4 | 57 | 2 | 0% | 3.0 | 1.44/beat | A |
| Gigue | 6/8 | 223 | 2 | 0% | 2.75 | 1.59/beat | A |

### English Suite No. 3 in G minor, BWV 808

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Prelude | 3/8 | 213 | 3 | 20% | 4.25 | 2.51/beat | B |
| Allemande | 4/4 | 49 | 3 | 10% | 4.5 | 2.73/beat | A |
| Courante | 3/2 | 66 | 3 | 4% | 4.25 | 1.16/beat | A |
| Sarabande | 3/4 | 48 | 3 | 16% | 5.5 | 1.37/beat | C |
| Gavotte I | 4/4 | 69 | 2 | 0% | 2.75 | 1.59/beat | A |
| Gavotte II | 2/4 / 4/4 | 33 | 3 | 17% | 2.0 | 1.03/beat | B |
| Gavotte I da capo | 2/4 / 4/4 | 35 | 2 | 0% | 2.75 | 1.58/beat | A |
| Gigue | 12/8 | 89 | 2 | 6% | 2.0 | 1.45/beat | A |

### English Suite No. 4 in F major, BWV 809

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Prelude | 4/4 | 108 | 3 | 13% | 4.0 | 2.88/beat | A |
| Allemande | 4/4 | 49 | 3 | 9% | 5.25 | 3.17/beat | A |
| Courante | 3/2 | 42 | 2 | 4% | 4.5 | 1.46/beat | A |
| Sarabande | 3/4 | 49 | 4 | 31% | 5.0 | 1.02/beat | B |
| Menuet I | 3/4 | 64 | 2 | 0% | 4.5 | 1.62/beat | A |
| Menuet II | 3/4 | 64 | 2 | 4% | 4.75 | 1.85/beat | A |
| Menuet I da capo | 3/4 | 32 | 2 | 0% | 4.5 | 1.59/beat | A |
| Gigue | 12/8 | 105 | 2 | 1% | 2.25 | 1.54/beat | A |

### English Suite No. 5 in E minor, BWV 810

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Prelude | 6/8 | 156 | 3 | 10% | 4.25 | 2.73/beat | A |
| Allemande | 4/4 | 49 | 2 | 7% | 5.0 | 2.76/beat | A |
| Courante | 3/2 | 58 | 2 | 10% | 4.25 | 1.31/beat | A |
| Sarabande | 3/4 | 48 | 3 | 39% | 3.25 | 1.72/beat | C |
| Passepied I | 3/8 | 81 | 2 | 0% | 4.0 | 2.64/beat | A |
| Passepied II | 3/8 | 49 | 3 | 32% | 3.5 | 1.64/beat | B |
| Passepied I da capo | 3/8 | 82 | 2 | 0% | 4.0 | 2.62/beat | A |
| Gigue | 3/8 | 192 | 3 | 16% | 4.0 | 2.49/beat | B |

### English Suite No. 6 in D minor, BWV 811

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Prelude * | 9/8 | 195 | 2 | 9% | 4.0 | 1.98/beat | A |
| Allemande | 4/4 | 49 | 4 | 14% | 5.25 | 3.31/beat | A |
| Courante | 3/2 | 66 | 2 | 2% | 4.75 | 1.66/beat | A |
| Sarabande | 6/4 | 49 | 4 | 20% | 4.5 | 0.66/beat | B |
| Double * | 3/2 | 48 | 4 | 13% | 2.25 | 1.04/beat | B |
| Gavotte I | 2/2 | 65 | 3 | 21% | 4.0 | 1.62/beat | B |
| Gavotte II | 2/4 / 2/2 | 49 | 2 | 0% | 4.0 | 1.98/beat | A |
| Gavotte I da capo | 2/4 / 2/2 | 33 | 3 | 21% | 4.0 | 1.59/beat | B |
| Gigue | 12/16 | 112 | 3 | 14% | 8.0 | 4.1/beat | C |

\* Prelude: the file marks an Adagio inside it (bar 37); two tempi  
\* Double: a written-out, more ornamented version of the Sarabande (in the file a 48-bar variant); printed music, nothing added

### French Suite No. 1 in D minor, BWV 812

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Allemande | 4/4 | 49 | 3 | 11% | 4.75 | 2.3/beat | A |
| Courante | 6/4 | 50 | 3 | 18% | 2.0 | 1.34/beat | B |
| Sarabande | 3/4 | 49 | 4 | 50% | 2.0 | 1.4/beat | C |
| Menuet I | 3/4 | 48 | 4 | 22% | 3.0 | 1.51/beat | B |
| Menuet II | 3/4 | 81 | 3 | 21% | 3.0 | 1.79/beat | B |
| Gigue | 2/2 | 56 | 3 | 14% | 4.25 | 2.12/beat | A |

### French Suite No. 2 in C minor, BWV 813

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Allemande | 4/4 | 38 | 4 | 15% | 5.5 | 1.98/beat | C |
| Courante | 3/4 | 115 | 2 | 4% | 3.5 | 1.41/beat | A |
| Sarabande | 3/4 | 49 | 3 | 14% | 4.0 | 1.77/beat | A |
| Air | 2/2 | 33 | 2 | 0% | 4.0 | 2.6/beat | A |
| Menuet | 2/2 | 50 | 2 | 0% | 3.0 | 1.03/beat | B |
| Gigue | 3/8 | 169 | 2 | 0% | 2.75 | 1.66/beat | A |

### French Suite No. 3 in B minor, BWV 814

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Allemande | 4/4 | 49 | 2 | 0% | 4.0 | 2.52/beat | A |
| Courante | 6/4 | 58 | 3 | 9% | 3.25 | 1.54/beat | A |
| Sarabande | 3/4 | 49 | 3 | 19% | 4.0 | 2.16/beat | B |
| Anglaise | 4/4 | 65 | 3 | 16% | 2.0 | 1.19/beat | B |
| Menuet | 3/4 | 72 | 2 | 0% | 2.0 | 1.25/beat | A |
| Trio | 3/4 | 48 | 3 | 30% | 2.0 | 0.96/beat | B |
| Menuet da capo | 3/4 | 36 | 2 | 0% | 2.0 | 1.24/beat | A |
| Gigue | 3/8 | 137 | 2 | 0% | 4.0 | 3.13/beat | A |

### French Suite No. 4 in E-flat major, BWV 815

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Allemande | 4/4 | 41 | 3 | 13% | 4.0 | 1.51/beat | A |
| Courante | 3/4 | 74 | 2 | 0% | 3.0 | 1.95/beat | A |
| Sarabande | 3/4 | 49 | 3 | 19% | 4.0 | 1.69/beat | B |
| Gavotte | 4/4 | 45 | 2 | 0% | 2.0 | 1.47/beat | A |
| Menuet | 3/4 | 33 | 2 | 0% | 5.0 | 1.38/beat | A |
| Air | 4/4 | 45 | 2 | 0% | 4.0 | 1.72/beat | A |
| Gigue | 6/8 | 120 | 2 | 3% | 4.0 | 1.87/beat | A |

### French Suite No. 5 in G major, BWV 816

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Allemande | 4/4 | 49 | 3 | 13% | 4.25 | 2.37/beat | A |
| Courante | 3/4 | 66 | 2 | 4% | 4.0 | 2.65/beat | A |
| Sarabande | 3/4 | 81 | 3 | 10% | 4.5 | 1.7/beat | A |
| Gavotte | 4/4 | 49 | 3 | 32% | 2.0 | 1.44/beat | B |
| Bourree | 4/4 | 61 | 2 | 0% | 3.75 | 1.73/beat | A |
| Loure | 6/4 | 33 | 3 | 15% | 3.25 | 1.32/beat | B |
| Gigue | 12/16 | 113 | 3 | 12% | 4.0 | 2.83/beat | A |

### French Suite No. 6 in E major, BWV 817

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Allemande | 4/4 | 57 | 2 | 0% | 4.0 | 2.53/beat | A |
| Courante | 3/4 | 66 | 2 | 1% | 4.0 | 1.59/beat | A |
| Sarabande | 3/4 | 48 | 4 | 21% | 4.25 | 1.97/beat | B |
| Gavotte | 4/4 | 41 | 3 | 33% | 2.0 | 1.17/beat | B |
| Polonaise | 3/4 | 49 | 2 | 0% | 3.0 | 1.96/beat | A |
| Menuet | 3/4 | 48 | 3 | 11% | 2.0 | 0.83/beat | B |
| Bourree | 4/4 | 85 | 2 | 0% | 2.0 | 1.5/beat | A |
| Gigue | 6/8 | 97 | 2 | 0% | 4.25 | 1.96/beat | A |

### Partita No. 1 in B-flat major, BWV 825

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Praeludium | 4/4 | 21 | 3 | 15% | 5.75 | 2.55/beat | C |
| Allemande | 4/4 | 77 | 2 | 2% | 4.0 | 1.89/beat | A |
| Corrente | 3/4 | 150 | 2 | 1% | 3.75 | 2.05/beat | A |
| Sarabande | 3/4 | 57 | 2 | 7% | 6.75 | 1.44/beat | C |
| Menuet I | 3/4 | 76 | 2 | 0% | 2.0 | 0.96/beat | B |
| Menuet II | 3/4 | 32 | 4 | 51% | 1.75 | 0.92/beat | C |
| Menuet I da capo | 3/4 | 39 | 2 | 0% | 2.0 | 0.97/beat | B |
| Giga * | 4/4 | 96 | 3 | 0% | 3.0 | 0.44/beat | B |

\* Giga: hands cross (general knowledge, not checked here)

### Partita No. 2 in C minor, BWV 826

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Sinfonia * | 4/4 / 3/4 | 91 | 2 | 3% | 6.25 | 2.31/beat | C |
| Allemande | 2/2 | 65 | 2 | 4% | 4.25 | 2.98/beat | A |
| Courante | 3/2 | 50 | 3 | 11% | 4.25 | 1.41/beat | A |
| Sarabande | 3/4 | 49 | 2 | 4% | 4.0 | 2.59/beat | A |
| Rondeaux | 3/8 | 113 | 2 | 1% | 4.0 | 1.99/beat | A |
| Capriccio | 2/4 | 192 | 3 | 14% | 4.0 | 2.45/beat | A |

\* Sinfonia: three sections (slow, Andante, quick) as the file and Wikipedia mark them; several tempi

### Partita No. 3 in A minor, BWV 827

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Fantasia | 3/8 | 120 | 2 | 0% | 4.0 | 2.67/beat | A |
| Allemande | 4/4 | 33 | 4 | 13% | 8.5 | 2.86/beat | C |
| Corrente | 3/4 | 114 | 2 | 1% | 4.0 | 2.59/beat | A |
| Sarabande | 3/4 | 57 | 3 | 19% | 5.75 | 2.85/beat | C |
| Burlesca | 3/4 | 80 | 3 | 7% | 4.0 | 1.91/beat | A |
| Scherzo | 2/4 | 65 | 2 | 7% | 4.0 | 1.89/beat | A |
| Gigue | 12/8 | 101 | 4 | 12% | 2.0 | 1.5/beat | A |

### Partita No. 4 in D major, BWV 828

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Ouverture * | 2/2 / 9/8 | 128 | 3 | 10% | 4.5 | 1.86/beat | A |
| Allemande | 4/4 | 113 | 3 | 7% | 5.75 | 1.85/beat | C |
| Courante | 3/2 | 81 | 2 | 12% | 3.0 | 1.38/beat | A |
| Aria | 2/4 | 106 | 2 | 10% | 4.0 | 2.09/beat | A |
| Sarabande | 3/4 | 77 | 2 | 3% | 6.75 | 1.82/beat | C |
| Menuet | 3/4 | 57 | 3 | 16% | 3.0 | 1.42/beat | B |
| Gigue | 9/16 | 192 | 3 | 12% | 4.0 | 2.4/beat | A |

\* Ouverture: French overture: slow dotted opening, quick fugal 9/8, slow return (check in print); two tempi

### Partita No. 5 in G major, BWV 829

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Praeambulum | 3/4 | 95 | 2 | 5% | 4.0 | 1.91/beat | A |
| Allemande | 4/4 | 57 | 2 | 4% | 5.5 | 3.46/beat | C |
| Corrente | 3/8 | 130 | 2 | 2% | 4.0 | 2.72/beat | A |
| Sarabande | 3/4 | 81 | 3 | 23% | 3.25 | 1.25/beat | B |
| Tempo di Minuetto | 3/4 | 104 | 3 | 4% | 2.0 | 0.3/beat | B |
| Passepied | 3/8 | 97 | 3 | 22% | 3.75 | 2.19/beat | B |
| Gigue | 6/8 | 129 | 3 | 11% | 5.0 | 2.65/beat | A |

### Partita No. 6 in E minor, BWV 830

| Movement | Metre (file) | Bars in file | Lines | Chords | Busiest hand | Bass | Fit |
|---|---|---|---|---|---|---|---|
| Toccata * | 2/2 | 108 | 3 | 11% | 5.25 | 2.4/beat | A |
| Allemanda | 4/4 | 41 | 2 | 4% | 6.5 | 3.34/beat | C |
| Corrente | 3/8 | 233 | 2 | 0% | 8.0 | 2.0/beat | C |
| Air | 2/2 | 61 | 2 | 6% | 2.0 | 1.77/beat | A |
| Sarabande | 3/4 | 73 | 4 | 19% | 7.0 | 1.93/beat | C |
| Tempo di Gavotta | 4/4 | 64 | 2 | 0% | 3.0 | 2.23/beat | A |
| Gigue | 8/4 | 104 | 3 | 13% | 3.0 | 1.35/beat | A |

\* Toccata: slow opening then a fugue; two tempi

### Notes on the three sets

- **English Suites (BWV 806-811).** Each opens with a Prelude and goes on Allemande, Courante, Sarabande, one pair of "galanteries" with the first danced again (Bourrée I-II-I in Nos. 1 and 2, Gavotte in 3 and 6, Menuet in 4, Passepied in 5), and a Gigue. Suite 1 has two Courantes and two Doubles; Suite 6 has a Double after the Sarabande (a Double is a written-out ornamented version of the dance before it, general knowledge; in the file the Double of the Sarabande is a 48-bar, more heavily ornamented version of the same dance; either way it is printed music, nothing added). Wikipedia dates them between 1713 and 1720 (https://en.wikipedia.org/wiki/English_Suites_(Bach)); the early version of No. 1 (BWV 806a) is in the NBA's appendix (IMSLP). The Preludes of Nos. 2 to 6 are long (108 to 213 bars in the file) with two or three written lines; my judgement, not checked, is that they are the closest thing in these suites to the fugues the game already has. **Ornaments:** the files write trills out and mark no signs; Mutopia has only Bourrées and a Gigue.
- **French Suites (BWV 812-817).** No preludes; Allemande, Courante, Sarabande, then a mix of lighter dances (Menuet, Air, Anglaise, Gavotte, Bourrée, Loure, Polonaise), then a Gigue. Wikipedia: "no surviving definitive manuscript"; two further suites BWV 818-819 are attached in some manuscripts (not part of the six, not covered here). Dürr's NBA prints two versions (IMSLP's list: "Versions A and B"; NBA V/4 "first version"; V/8 complete). This is where "ornament as printed" is least settled (see section 3). 
- **Partitas (BWV 825-830).** Clavier-Übung I; each printed separately from 1726 and collected in 1731 (Wikipedia). Larger and more showy than the suites (Praeludium, Sinfonia, Fantasia, Ouverture, Praeambulum, Toccata open the suites instead of a plain Allemande); by my counts the busiest movements of all 136 are Partita 3's Allemande and Partita 6's Corrente and Allemanda. The most ornaments of the three sets (Mutopia's Partita 4 alone has about 75 signs and small notes by my text count).

Totals by my guess: **A 86, B 33, C 17** of 136 rows. Written lines: 2 in 68 movements, 3 in 53, 4 in 15 (the fours are Sarabandes and a few Allemandes: chords on layers, not four voices). The lowest note in any file is G1 and the highest D6 (checked from the pitches; Partitas 1 and 5 go lowest, Partitas 2, 3 and 5 highest); the game already handles wide pieces by seating each voice on the instrument whose range fits (D641), so range alone is not new.

## 3. Fit with the game

### 3.1 The owner's standing rules, one at a time

- **Whole works only, never add notes.** Each suite as a whole is the unit; the 136 rows above are its movements. Doubles are Bach's own printed music. No Bach suite needs an editor to complete it (unlike the Art of Fugue's last fugue). The two incomplete things I found are in Mutopia's files (Partita 2 half missing; Partitas 3 and 6 early versions), not in Bach.
- **Ornaments from the print; written trills always played.** The game's engine is ready: the band plays the edition's written-out notes (D367); the player's thumb shakes on a sign (D314, D378). What is missing is the print's signs themselves, for the reasons in 1.3. **Honest size of the job:** the French Suites and Partitas are dense with signs (Mutopia's three French Suites together carry roughly 100 signs and small notes; Partita 4 alone about 75, by text count). To meet the rule, a first slice must take its signs from a source that keeps them (Mutopia where it has the piece) or from a bar-by-bar reading of the Bach-Gesellschaft by eye, as D206 did for the fugues. Without it, the written-out trills would still sound (the band plays the notes) but the player would have no sign to shake on and the short signs would be lost, which the owner would have to accept for a first listen (question 3). The slurred-ornament sounds (SHAKE_PROTO, D1074 and D1076) are built and waiting for the owner's ear; the suites would be a heavy user of them but do not depend on them.
- **Legato = thumb to thumb, don't offer dull lines.** Keyboard dances give the player a good right-hand line almost always. The bass is another matter: of 136 movements, 12 have a bass under about one note a beat (Menuets, the Trio, Tempo di Minuetto, ES4 and ES6 Sarabandes, Partita 1's Giga whose hands cross), which I would not offer as a player's part. I did not test the repo's own "dull" measure (notes a second, repeated pitches) because it needs a tempo; repeated notes are rare (mostly under 10% in the lines I measured).
- **Two thumbs, live hit-tests at 932x430 and 667x375.** The game takes one voice per player at a time, so a two-hand piece is played one hand at a time against the other as the band. The existing divisi rule (D363) keeps each offered voice one line: the extra notes of a chord go to the band, and a chord struck together stays one touch. Thick Sarabandes would therefore be played as their top line, with the rest sounding in the band. Reach is not different from the Goldberg. Hit-tests are the normal check for new pieces and would be run on the first slice.
- **No invented names except WTC.** The suites keep Bach's own names (Allemande, Courante, ...). "No words drawn in play" is untouched.
- **No sound change without the owner listening.** A new default sound per suite is a choice, not a change to an existing sound; the harpsichord and piano exist. The trills' new sounds wait as above.

### 3.2 What the game's mechanisms would have to handle

| Question | Where the game stands | What a suite needs |
|---|---|---|
| **Voice-picking** | Voices = the file's written layers, chords to the band, each offered voice one line, a `playable` list per piece (the Goldberg's `GOLDBERG_PLAYABLE`) | One list per movement. The tables' Fit column is a starting point for it. About a day of the owner's reading to confirm, not code. |
| **Binary form, repeats** | "The game plays every repeat once" (Inventions, BWV 998, Goldberg: D757); a first ending left out | The files mostly write repeats out as copies; each movement is cut to its halves once (`xmlRanges`), checked against the print. Taking each half once about halves a dance's length: a Menuet becomes well under a minute (my estimate). Question 2. |
| **Da capo (Menuet I-II-I, Bourrée I-II-I, ...)** | BWV 998's Fugue has its da capo written out and plays it | The files write the da capo out ("Menuet I da capo"), so the game would play I, II, I as the print directs, as one piece or as three pieces (the tables show them as separate rows because the file does). Question 2. |
| **Doubles, varied reprises** | Nothing special | Doubles are ordinary pieces after their dance. **Not verified:** whether any dance prints a varied reprise written out; the doubled-block check found only exact copies, but does not see a differing one. |
| **French overture (Partita 4), Sinfonia (Partita 2), Toccata (Partita 6), the Adagio inside English Suite 6's Prelude** | One tempo for a piece; "no tempo change but at a fermata and at an ending the edition slows" (D385); the chorales have fermatas held a beat longer (D340) | A way to play two tempi in one piece, or the piece cut in two. Neither exists. If the owner wants whole works, this needs a small new feature (a tempo map) or acceptance of splitting. I did not search the code beyond tempo-steps and phrasing; **not verified** that nothing like a tempo map exists. |
| **Dotted rhythms, notes inégales, swing** | The band's timing humanisation (D179: tiny, the same every run; weight on the bar's first beat) is the only expressive layer; nothing that changes note lengths | **Nothing added.** The overture's dotted rhythm is played as printed. The question is only whether the band's tiny timing stays on (question 8). |
| **Hemiolas** | The band's weight is by the bar's first beat | Courantes (the files encode them as 3/2, 6/4 or 3/4: as encoded, unchecked) have hemiolas near their cadences; the existing bar-weight would stress the wrong beat for a moment. Small, and the owner's ear is the test. |
| **Ornament slurs** | `SHAKE_PROTO`, off, waiting for the owner (D1074, D1076) | Nothing. The suites would be a good test bed. |
| **Tempo** | Editorial tempi where there is no recording (`data/tempi/more-bach.json` has editorial entries for BWV 998 and the Goldberg); recordings are used for the WTC | No recordings for the suites in the repo: editorial tempi per movement, set by the owner's ear or a worker's proposal. The fast Gigues and Correntes are where the tempo decides whether a movement is playable: the busiest movements have up to 8 notes to the quarter-note beat in the busiest hand, and the game's own difficulty measure (notes a second, stars from 4.0 to 7.4) will show whether that is playable once a tempo is set. |
| **Cards, pictures, worlds** | Each piece has a card, a picture and a world (`pictures-data.ts`, `stage-bg.ts`, colour plans); I did not check how the Goldberg's were made | 136 cards is a lot of art. One scene per suite, with a small change per dance, is the economical choice (a decision for the owner). |

## 4. A recommended first slice

**French Suite No. 5 in G major, BWV 816** (seven movements: Allemande, Courante, Sarabande, Gavotte, Bourrée, Loure, Gigue).

Why this one:
- All seven movements are in verits99's file (and, separately, as single files) and in Mutopia (public domain, id 99), so there is a second reading to check against and the print's ornament signs to take from it (about 29 pralltrillers, 15 mordents, 3 trills, a turn, 14 small notes, by text count). Its Mutopia source is named only as "Unknown", so the check against the Bach-Gesellschaft print must be done by eye anyway.
- By my guess six of seven are straightforward or top-line-only: Allemande A (3 lines, 13% chords), Courante A, Sarabande A (10% chords), Gavotte B (top line only; 32% chords), Bourrée A, Loure B (a lute-like dance with 14 small notes), Gigue A (a three-line 12/16 piece). No movement is C. It has no multi-tempo movement and no da capo, so it tests the import without the awkward decisions.
- It is small (about 450 bars in the file), a dance suite everyone knows, and its Gigue is a real counterpoint piece, close in spirit to the game's fugues.
- Alternatives, if the owner prefers: **French Suite No. 6 in E** (eight movements, all A or B, the most trills in Mutopia; CC BY-SA 4.0 witness, names the BG 1863 as its source) or **English Suite No. 2 in A minor** (a long concerto-like Prelude, two calm galanteries with a da capo, a two-line Gigue; Mutopia has only its Bourrées and Gigue, so the check is thinner).

**Rough effort** (my estimates, in worker sessions as the owner counts them, not measured): about **two sessions** for French Suite 5: one to cut and read the file, put it in MORE BACH and check it against Mutopia and the print (with bar-by-bar corrections as for BWV 998); one for the ornament signs, tempi, the voices offered, the card and the hit-tests. A handful of listening and playing sessions of the owner's own after that. **All 18 suites** at this pace would be on the order of 20 to 30 worker sessions, mostly proofreading against the print and the ornaments; the Partitas the heaviest, and two of the six (Partitas 2 and 4) hold movements that cannot be done well without a decision on tempo changes.

**Decisions only the owner can make before building** are in the questions below.

## 5. Questions for the owner (plain English)

1. **Where to start.** Is French Suite 5 (seven dances, a small, famous suite) a good first suite? Or would you rather begin with an English Suite for its long Prelude, or with a Partita for the showpiece?
2. **Repeats and da capos.** The game has so far played every repeat once. For dances that makes them short (a Menuet well under a minute, by my estimate). Should the suites do the same, and should the Menuet I - Menuet II - Menuet I order be played as Bach prints it, as one piece or three?
3. **Ornaments.** The free scores mostly write trills out as notes and carry no sign for your thumb to shake on. For a first listen, is it acceptable to start with the written-out notes (the band plays them, no thumb ornaments), and then add the printed signs by hand from the Bach-Gesellschaft for any suite you like? Or do you want the signs from the start, which makes the first suite slower to finish?
4. **Which version of the French Suites.** There are two versions in the scholarly edition: an older plainer one and a younger, more ornamented one. Which do you want, or should I take whichever the free score follows (which I could not tell)?
5. **Partitas 3 and 6.** The only free typeset editions of these two are the early 1725 notebook versions (six movements each; no Fantasia/Burlesca/Scherzo in No. 3, no Toccata/Air in No. 6). The printed versions (1731) exist in verits99's files. Which do you want? (I would take the printed ones: the whole works as Bach published them.)
6. **Movements that change speed.** Partita 4's overture, Partita 2's Sinfonia, Partita 6's Toccata and the Adagio in English Suite 6's Prelude change tempo inside the piece, which the game cannot do. Do you want a small new feature (a tempo map), or to split them into parts, or to leave those movements out for now?
7. **Bass lines.** Chords and sparse basses (many Menuets, Sarabandes) would not be offered as your part: only the right hand. Is that the right call, or would you rather try them and judge?
8. **Rhythm.** No swing, no overdotting and no added notes: confirmed? And does the band's small existing timing humanisation (the same every run) stay on for the suites, or should they be strictly square?
9. **How many.** All 18 suites in the end, or a chosen few? And one picture-world per suite (cheap) or one per movement (136 scenes)?
10. **Rights.** The notes would come from verits99's CC0 files, which is your existing practice (four sources already). Partita 1 has a metadata oddity (its seven scores are marked "not public domain" though the licence field says CC0): fine to use Mutopia's public-domain Partita 1 instead? And the CC BY-SA Mutopia files (French Suites 3 and 6, Partita 4) would only be used to check against, never shipped, so the share-alike would not apply: agreed?

## Not verified (so nothing here rests on it)

- KernScores, Humdrum and CCARH's MuseData for the suites: the sites were down; only GitHub repository lists were read.
- The verits99 licence on musescore.com itself (403); only the dataset's record of it.
- Bach Digital's catalogue and the OpenScore project.
- Any metre, bar count or voice count against the printed score: all counts come from the score files.
- Which version of the French Suites verits99 follows; whether any dance prints a written-out varied repeat.
- That no tempo-map exists in the code (I searched only tempo-steps, phrasing and the decisions).
- The effort figures: estimates.
