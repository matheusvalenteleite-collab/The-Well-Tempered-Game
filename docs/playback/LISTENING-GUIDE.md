# The chorales' listening guide (P17)

The owner: a toggle "for displaying information alongside the sheet music, describing special
moments in the piece, unexpected moments, whatever a specialist lover of that kind of music would
point out to someone listening to the piece for the first time". The owner chose both sources of notes:
notes computed from the music, plus hand-written ones (still to come, each on a commentary actually read). For display, the owner chose captions while
the chorale plays, which can be switched to numbered markers alone, with the full list in a tab.

## On screen (Bach's settings, level 0)

- **Guide: captions / markers / off**: a menu beside the ensemble, stored as `wtg.choraleGuide`.
- **Captions** sit above the controls while the chorale plays. Each shows the line being sung (its
  words) and the latest moment reached, which stays for two bars after its own.
- **Markers** (①, ②, …) appear over the soprano's note at each moment, before the cadence label.
- The **Guide** tab lists every moment with its bar, then the words of each line.

## The moments

The chorale session finds the moments (C28: `src/chorale/listening-notes.ts`, `data/chorales/listening.json`,
`tools/chorales/listening_notes.py`). The split between the sessions was confirmed by the owner. This session's
first computed version (P17's first commit) was withdrawn in its favour, so that the mode keeps one analysis.
The sentences are the chorale session's (`chorale.guide.*`); the screen shows them as given.

**Words**: the line sung at each phrase start, taken from the Chorale-Corpus edition (CC BY-NC-SA 4.0)
and added to `data/playback/chorale-fermatas.json` as `line` by `tools/playback/chorale_texts.py`.
Where several stanza lines are given, the first is used.

## Written notes (P22)

`data/playback/chorale-commentary.json` holds 27 notes on 25 chorales, each paraphrasing or quoting a commentary
read in full view on archive.org, with its page. The commentaries:
- André Pirro, *L'esthétique de Jean-Sébastien Bach* (1907), pp. 136–138;
- Spitta, trans. Bell and Fuller-Maitland, vols. II–III (1884–85);
- Schweitzer, trans. Newman, vol. II (1911);
- W. G. Whittaker, *Fugitive Notes on Certain Cantatas and the Motets* (1924);
- Parry (1909).

The research, with each source's URL and the cautions, is in `CHORALE-COMMENTARY-RESEARCH.md`.

- **Checked against the notes:** every number against the study's BWV and title; every claim about pitches
  against the notes, for example the bass of *Es ist genug* in bar 15 (A, G♯, G, F♯, F, E, D♯).
- **Left out:**
  - Schweitzer on "Ach großer König": he places it in the St Matthew Passion, so which setting he means is uncertain.
  - Parry on an unnamed Christmas Oratorio chorale.
  - Whittaker's "thirteenth bar" of the motet, not mapped onto the edition.
  - The research's "chromatic rising bass" in No. 279: the notes do not show it.
- **Shown:** the notes join the observations in the captions, the markers and the Guide tab, each with its citation.

## Written notes, round 2 (P27)

29 more notes on 25 chorales, from two sources read in full view: research in `CHORALE-COMMENTARY-RESEARCH-2.md`.
- **C. M. von Weber (1810), on Nos. 1–8 and 10–12.** He was 23 and arguing for his teacher Vogler's reharmonisations, so his remarks are fault-finding and the notes present them as his objections:
  - clashing passing notes;
  - closes on the third;
  - fifths covered by decoration;
  - monotonous cadences;
  - crossing voices.

  His bar numbers count the written-out repeat; they were converted and checked against the cadences.
- **E. Prout, *Harmony* (1889).** Rare chords, suspensions, anticipations and Picardy thirds in Bach's two-bar extracts, identified note by note.
- **Left out:** Prout's "Siehe welch' eine Liebe" extract, which matches No. 51 rather than the setting he names; Weber's unmapped bars in No. 11; and his "audible fifths" in No. 2, where the voices could not be identified.

## Written notes, round 3 (P28)

24 more notes on 17 chorales, 12 of them new to the guide, from sources read in full view. The research is in `CHORALE-COMMENTARY-RESEARCH-3.md`.
- **Prout, *Counterpoint* (1890):** his cadence examples, and his comparison of three Bach settings of "Jesu Leiden, Pein und Tod" (Nos. 106, 83, 61).
- **Prout, *Musical Form* (1893):** chords that pivot from one key to another.
- **Goetschius (1902):** the second half of No. 117 newly harmonised.
- **Chadwick (1897):** Bach's "illumination" of plain chords in No. 96. Chadwick gives no title, so the setting was identified by its notes.

**Left out:**
- Bussler on "O Haupt", which names no setting.
- The framing quotations.

## Not yet

- More written notes: Terry's *Bach's Chorals* I could not be downloaded, and no open modern analyses were found.
