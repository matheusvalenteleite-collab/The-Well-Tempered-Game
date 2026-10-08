# Fux knowledge base

Reference notes on Johann Joseph Fux, *Gradus ad Parnassum* (Vienna: van Ghelen, 1725), gathered
while building Fux mode. They record what the book contains, in what order, what each lesson and
exercise teaches, and how sure we are of each statement. They are written for the developers of
this game and for anyone checking its rules against the source.

| File | Contents |
|---|---|
| [structure.md](structure.md) | How the *Gradus* is organized; what this project covers; counts of exercises |
| [catalogue.md](catalogue.md) | Every strict-counterpoint exercise (two, three and four voices): figure, 1725 page, mode, cantus position, who writes it, what is new |
| [rules.md](rules.md) | The precepts of each species as Fux states them, with page references and the game's rule ids |
| [teaching-order.md](teaching-order.md) | Exercise-by-exercise account of what Aloysius teaches in two-voice first and second species |
| [terminology.md](terminology.md) | Terms of art (thesis/arsis, diminution, cambiata, ligature, *mi contra fa*, hexachords, modes, clefs) |
| [open-questions.md](open-questions.md) | What is unverified or contested, and what to check next |

## Sources and how they are cited

- **1725**: the Vienna print, read from the page scans in the upstream dataset repository
  (MarkGotham/species, `source_pdf/gap_pNNN.pdf`). Printed page = file number − 8 throughout
  the strict-counterpoint section (checked at pp. 56, 57, 58, 59, 87 and 138). Page numbers in
  this folder are printed pages of 1725 unless marked otherwise.
- **Mann**: Alfred Mann's English translation, *The Study of Counterpoint from Johann Joseph
  Fux's Gradus ad Parnassum*, rev. ed. (New York: Norton, 1965). Figure numbers follow Mann,
  as the dataset does. Mann's translation is under copyright: it is used here only as a
  finding aid and is cited by page; it is never quoted at length, and no text from it may
  appear in the game (owner decision). Latin quotations from the 1725 print are in the
  public domain.
- **Dataset**: the Four Score and More / Open Music Theory encodings by Mark Gotham (CC0),
  vendored at `data/sources/fux-species/` for Part I; Parts II and III were consulted in the
  upstream repository and are not yet in this project's dataset.

## Confidence marks

- **verified**: read in the 1725 scan.
- **Mann**: read in Mann's translation; the 1725 page is the one the dataset gives for the
  figure, or is still to be checked.
- **inferred**: our reading of the dialogue or of Fux's examples, not a statement in the text.
