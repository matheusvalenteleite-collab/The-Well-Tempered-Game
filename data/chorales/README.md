# Chorales: the library (parsed layer)

See `docs/chorales/PLAN.md` for the plan and `docs/DECISIONS.md` D98-D99 for the decisions.

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

## `kittel/`: J. C. Kittel, 24 chorales with eight basses (first pass, not yet proofread)

- `kittel_NN.json` holds one chorale each:
  - `melody`: the notes;
  - `basses`: 8 (or 9) basses, each with notes and `figures`;
  - `extraction_report`: what the extractor could not place.
- `EXTRACTION.md` lists those issues for the whole book.
- `CHECK.md` is the harmonic cross-check: each line is a melody note outside the chord implied
  by the bass and its figure.

Build: `npm run chorales:kittel`.

A figure is `{onset, placed, x, page, stack}`:

- `placed` says how its time was found:
  - `over_note`: the figure stands over a bass note;
  - `column`: it is aligned with a note in another staff;
  - `subdivided`: it falls inside a held note, and the note was divided evenly among its
    figures. Review these.
- `stack` lists the rows from top to bottom. Each row may have:
  - `interval`, `accidental` (sharp / flat / natural), `raised` (a stroke through the figure);
  - `continuation` (a dash: the row above the previous figure is held);
  - `extender_to_x` (a line: the interval is held until that x);
  - `editorial` (the figure is in square brackets) and `accidental_editorial`;
  - `level` (0 = nearest the staff) and `y` (its baseline on the page, which matches rows across
    figures).

`_x` on notes and `x` on figures are page positions, kept for proofreading against the PDF.

Source: the 1811 text is in the public domain (owner). The PDF is a modern Dorico engraving,
vendored at `data/sources/kittel-24/`.
