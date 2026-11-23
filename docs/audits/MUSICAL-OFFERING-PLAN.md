# The Musical Offering, BWV 1079, made whole: the sources and the checks (for review; nothing imported)

The owner: "Musical offering: I want it complete", with "standard solutions" allowed for the puzzle canons. The game has
the two ricercars (D340). This page lists the rest, piece by piece: the source, what the checks found, the voices, and
what the owner is asked to decide. The import comes after the owner's review.

## The sources

- **The source: PDMX** (the public-domain MuseScore dataset the Goldberg comes from; Zenodo, DOI
  10.5281/zenodo.15571083). It holds a complete set of the Offering from one encoder, "BWV 1079 Musical Offering …
  (A = 415 Hz)", **CC0**: every canon in its solution, the Fuga canonica and the four sonata movements. CC0 is better
  than Knuth (CC BY-NC-SA) and Rodrigues (CC BY-SA), and it comes as notes, not a picture.
  - The set is written a semitone low, so that it sounds at baroque pitch: C minor written as B minor. Read up a
    semitone and a letter, Bach's notes and spellings come back. A few spellings come back enharmonic (G♭ where the
    print has F♯); the game takes its spellings from the print.
  - The trills are written out as notes (C D C D …) in 12 of the 17 files. They go back to the main note with a trill
    sign, as the print has them, because the game adds no notes.
  - The trio sonata's file carries a fourth line, the editor's chords for the keyboard player. It is dropped (the
    owner: the continuo is Bach's bass only).
- **The witnesses** (checks only; nothing of theirs is shipped):
  - Nuno Rodrigues's complete edition, 2022 (IMSLP 936489, CC BY-SA 4.0), supplied by the owner. It prints each
    canon's resolution: the solution check.
  - Craig Sapp's kern of the trio sonata (github craigsapp/bach-musical-offering, encoded from BG 31.2; no licence
    stated): the trio's note check.
  - **The canon rule itself** (the D962 checker): a realised canon either obeys its rubric or it does not.

## The canons

"Rule" is the D962 checker on the PDMX notes: the share of the follower's notes the leader explains.

| # | canon | lines | rule check | against Rodrigues's resolution | to decide |
|---|---|---|---|---|---|
| 1 | Canon a 2 [cancrizans] | 2 (the line, and itself backwards) | **100%** (89/89), crab | Rodrigues: both lines at the same pitch. PDMX (harpsichord file) has the second an octave lower. | Put back at the unison (an octave, no note changed). |
| 2 | Canon a 2 violini in unisono | 3 (two violins; the royal theme in the bass) | **100%** (220/220), unison, 1 bar later | same entry and interval | how many rounds (PDMX 33 bars, Rodrigues about 18) |
| 3 | Canon a 2 per motum contrarium | 3 (the theme; the canon pair) | **100%**, contrary motion, half a bar later | same | rounds (PDMX 16, Rodrigues about 9) |
| 4 | Canon a 2 per augmentationem, contrario motu | 3 (the theme, ornamented; the canon pair) | **100%** (168/168), augmentation by contrary motion | same | rounds (PDMX 37, Rodrigues about 21) |
| 5 | Canon a 2 per tonos | 3 (the theme, ornamented; the canon pair) | **90–98%**, at the fifth, 1 bar later; it rises a tone each round, as it should | same | none: the six rounds back to C are the piece (PDMX 49 bars) |
| 6 | Fuga canonica in Epidiapente | 3 (the canon pair; the continuo) | **97.9%** (322/329), at the fifth | Rodrigues's entry is to be read from page 41: PDMX's follower enters at bar 11 | confirm the entry |
| 7 | Canon perpetuus super Thema Regium | 3 (the canon pair; the theme in the middle) | **100%** (170/170), two octaves below, 1 bar later | same | rounds (PDMX 20 bars, Rodrigues about 10) |
| 8 | Canon perpetuus [contrario motu] (per giusti intervalli) | 3 (the canon pair; the continuo) | **99%** in bars 3–20 and 33–50: an exact mirror (chromatic intervals kept), 2 bars later; the axis moves between them | to be read: pages 48–50 (about 45 bars) | read the junctions (bars 21–32) against Rodrigues; rounds (PDMX 62) |
| 9 | Canon a 2 "Quaerendo invenietis" | 2 | **87%**, an inversion canon, 2½ bars later, exact chromatic mirror | **same solution**: the same entry, bar 4 beat 2, inverted (page 52) | rounds (PDMX 82 bars, Rodrigues about 50); the 13% are junctions between rounds, to read |
| 10 | Canon a 4 "Quaerendo invenietis" | 4 | **100%**, every voice whole (163/163), entries every 7 bars | Rodrigues: the same entries every 7 bars, the lower two **an octave below**. PDMX: all four at one pitch, which no standard solution has. | Take the lower two an octave down (no note changed), confirmed against BG 31.2 |

Not used:
- PDMX's "Canone inverso" is not a canon of the Offering: it is No. 1 (cancrizans) written out four times.
- The other uploads: a second cancrizans (recorders, transposed) and a second per tonos (strings). They are kept as
  further witnesses.

**Which solution is "standard".** For every canon above, the PDMX solution is the one Rodrigues prints, where the
entry is read (all but No. 6 and No. 8 so far). Rodrigues follows the usual resolutions (BG 31.2's, as far as can be
seen). **Caveat:** BG 31.2 itself is behind IMSLP's captcha. If the owner adds its scan to the Drive batch, each
solution is checked against it too. Without it, Rodrigues is the solution witness.

**Rounds.** The perpetual canons (Nos. 2, 3, 4, 7, 8, 9) have no written end: an editor chooses how often they go
round. PDMX and Rodrigues choose differently. **Luigi recommends: once through, with the print's repeat, and the
last round ending at the cadence Rodrigues writes.** Each canon is then about 10–50 bars, as in his edition. No. 5
keeps its six rounds, because the rising modulation is the point of the piece.

## The trio sonata (Sonata sopr'il Soggetto Reale)

| movement | lines | against Sapp's kern (BG 31.2) | to do |
|---|---|---|---|
| I Largo | flute, violin, continuo bass (+ the editor's chords, dropped) | each line holds Sapp's notes in order: **100%, 100%, 99.7%** | fold the 54 written-out trills; the repeat written out (96 bars against 48 with repeat signs), taken once |
| II Allegro | the same | to measure (250 bars against Sapp's 172) | as I |
| III Andante | the same | to measure | 1 trill |
| IV Allegro | the same | **98.2%, 98.6%, 98.4%** of Sapp's notes at their exact time and pitch; the rest are the trills | fold the 20 trills |

**How it plays.** Three lines, as Bach wrote them: flute, violin and the continuo's bass. There is no realization and
no added notes; the figures are not sounded. The player takes the flute or the violin, or the bass if it passes the
dull-lines yardstick (it is a walking bass: likely yes). The band plays the other two lines, the bass on a bass
instrument alone. The movements are four pieces, as the concertos' are.

## Voices offered (proposed)

- **The canons:** the canon pair is offered.
- **The royal theme**, where it is a separate line (Nos. 2–5, 7): offered only if it passes the yardstick. In long
  notes (No. 3: 82 notes in 16 bars) it may not. Where it is ornamented (Nos. 4, 5) it likely does.
- **The continuo basses** (Nos. 6, 8): measured like every bass.
- **The Canon a 4:** all four lines.

## What the owner is asked

1. **Rounds** of the perpetual canons: once through as Rodrigues gives them (Luigi's recommendation), or as PDMX
   writes them out.
2. **Canon a 4:** the lower two entries an octave down (recommended), or all at one pitch as PDMX has them.
3. **Cancrizans:** put back at the unison (recommended).
4. Optional: the BG 31.2 scan (IMSLP, Bach-Gesellschaft Band 31.2) in the Drive batch, so the solutions are checked
   against the Bach-Gesellschaft as well as Rodrigues.

After the owner's answers, the import is about a day:
- the importer entries (the PDMX files read up a semitone, the lines, the bars taken, the trills folded);
- the checks: the rule per canon in a test, Sapp for the trio, Rodrigues read for the junctions and the entries of
  Nos. 6 and 8;
- the analysis, tempi and sounds as for the other MORE BACH pieces;
- the credits: "PDMX (Long et al.), the Musical Offering set · CC0".
