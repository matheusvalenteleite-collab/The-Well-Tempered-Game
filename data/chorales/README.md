# Chorales: the library (parsed layer)

See `docs/chorales/PLAN.md` for the plan and `docs/DECISIONS.md` C1-C2 for the decisions.

## `bach/`: J. S. Bach, 371 four-part chorales

- `index.json` holds the conventions, provenance, licence, and a catalogue with one entry per
  chorale (number, BWV, title, key, metre, measures, fermatas).
- `chorales/bach_NNN.json` holds one chorale each:
  - references, from the edition's Humdrum header;
  - the key and mode, as designated by the editor;
  - the key signature, metres, the expansion order of the sections (with and without
    repeats), sections, measures with barline styles;
  - the four voices as lists of notes.
- `VALIDATION.md` is the validator's report.

Build: `npm run chorales:fetch` (re-vendor), then `npm run chorales:bach`.

A note carries `pitch` (spelled; C4 = middle C), `midi`, `duration` and `offset` (fractions of a
whole note), `measure` (0 = anacrusis), `section`, and `kern` (the source token). It carries
`tie`, `fermata`, `accidental_shown` and `rest` only when they are set.

Licence: the music is in the public domain; the encoding is Craig Stuart Sapp's, CC BY-NC-SA 4.0,
and so are these derived files.

### `bach/analysis/`: the analysis layer (computed readings, not source facts)

`bach_NNN.json` per chorale, built by `npm run chorales:analyse`
(`tools/chorales/bach_analyse.py`). It holds:

- `verticalities`: every onset where some voice strikes a note. Each records the four sounding
  pitches, which voices strike, and two figures derived from Bach's voices:
  - `literal`: every interval over the bass, reduced to the octave except 9, with the
    accidentals the key signature does not give;
  - `figure`: the period abbreviation (5/3 → nothing, 6/3 → 6, 6/5/3 → 6/5, 6/4/3 → 4/3,
    6/4/2 → 4/2, 7/5/3 → 7).

  It also records `on_beat` and `crossing`.
- `phrases`: the lines of the hymn, up to each soprano fermata.
- `cadences`: per phrase end, the final and penultimate chords, the degree of the final bass in
  the chorale's key, and a class. The class comes from one-line tests in `classify_cadence`,
  written to be corrected.
- `parallels`: consecutive fifths and octaves between two voices that both move.

Summary counts are in `docs/chorales/BACH-COUNTS.md`.

## `kittel/`: J. C. Kittel, 24 chorales with eight basses (extracted and machine-checked; not yet proofread by eye)

- `kittel_NN.json`: one chorale.
- `musicxml/kittel_NN.musicxml`: the same chorale for any notation program (melody and every
  bass, with the figures as `<figured-bass>`), to open, hear and proofread.
- `EXTRACTION.md`: what the extractor could not place (now nothing).
- `CHECK.md`: the harmonic cross-check, with each disagreement classed.

Build: `npm run chorales:kittel`; the MusicXML is written by `tools/chorales/kittel_musicxml.py`
and read back by `tools/chorales/kittel_musicxml_check.py` (needs `pip install music21`).

A chorale file holds:

- `measures`: number, offset, length, page, and `barline_after`. Dashed bar lines are the
  editor's. Solid ones keep the chorale's own barring at line ends. A repeat is marked
  `end-repeat`. Bar lengths are irregular, as in the edition.
- `phrases`: the lines of the hymn, ending at the melody's fermatas.
- `structure`: bar form (the first section repeated: A A B) or through-composed.
- `melody`: the melody's notes.
- `basses`: 8 or 9 basses (Nos. 23-24 have 9), each with:
  - `notes`;
  - `figures`;
  - `melody_variant`, where the melody is printed again for one bass that ends a phrase
    elsewhere (No. 21, bass [8]).
- `findings`: facts of the score worth knowing, for example a bass whose fermata note ends
  before the bar.
- `extraction_report`: what the extractor could not place.

Notes carry `pitch` (spelled; C4 = middle C), `midi`, `duration` and `offset` (fractions of a
whole note), and `measure`. When they apply, they also carry:

- `tie` (start / stop / continue) and `slur`;
- `fermata`;
- `accidental_shown` and `accidental_editorial`;
- `chord` (further pitches struck with the note: a cadence note doubled at the octave);
- `grace`.

`_x` and `_page` give the note's position in the PDF, for proofreading.

**Small notes in the melody.** The extractor keeps them as grace notes. They are not ornaments
on the beat: they are passing notes in the time of the note before them. Kittel's figures show
this, for example "5 6" over the bass under B-(C)-D, with the 6 under the small C, in the
second half of the B. Read this way, about a hundred disagreements in the cross-check disappear.
`tools/chorales/kittel_check.py` (`melody_timeline`) applies this reading. The data keep the
notation as printed.

A figure is `{onset, placed, x, page, stack}`.

- `placed` says how its time was found:
  - `over_note`: the figure stands over a bass note;
  - `column`: it is aligned with a note in another staff;
  - `subdivided`: it falls inside a held note, and the note was shared among its figures
    (evenly where that gives a plain note value, otherwise by halving). Review these.
- `stack` lists the rows from top to bottom. Each row may have:
  - `interval`, `accidental` (sharp / flat / natural, alone for the third), `raised` (a stroke
    through the figure);
  - `continuation` (a dash: the row of the previous figure is held);
  - `extender_to_x` (a line: the interval is held until that x);
  - `editorial` (in square brackets) and `accidental_editorial`;
  - `level` (0 = nearest the staff) and `y` (its baseline on the page, which matches rows across
    figures).
- A figure can stand over an empty bar: the resolution of a cadence over the bass note held under
  its fermata.

### `kittel/analysis/`: Kirnberger's reading of each bass

`kittel_NN.json` holds, for each bass, its harmonies. Each harmony has an onset, the bass, the
chord bass, the figure spelled out, the root and kind of the fundamental chord, the bass's role,
and the melody's role (or "incidental"). The comparison with Bach, one row per Kittel bass and
Bach setting, is in `data/chorales/kittel_bach_comparison.json` and summarised in
`docs/chorales/KITTEL-BACH.md`.

Source: the 1811 text is in the public domain (owner). The PDF is a modern Dorico engraving,
vendored at `data/sources/kittel-24/`.
