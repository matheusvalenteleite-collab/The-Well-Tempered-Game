# Recordings: bar timings

`ishizaka-book1.json` (D128): for each of the 48 pieces of Book I in Kimiko Ishizaka's *The Open
Well-Tempered Clavier* (2015, welltemperedclavier.org; dedicated to the public domain under CC0 1.0,
as the licence file in the album download states), the time in seconds of every bar line, from the
first bar's start to the last bar's end, keyed `wtc1-NNp` / `wtc1-NNf`. Bar 0 is a padded pickup bar
where the piece has one (as in `src/wtc/library.ts`).

Made by `tools/align-recording.py`: the score's chroma (from the Humdrum corpus, each note's onset
weighted and decaying) matched to the recording's CQT chroma by dynamic time warping. Checked by
the steadiness of the bar lengths (and their changes where Bach changes tempo: the C minor prelude's
Presto, Adagio and Allegro; the E minor prelude's Presto), not by ear.

The audio itself is not in the repository. The game streams it from the Internet Archive (item
`bach-well-tempered-clavier-book-1`, the same 48 tracks; file names under `files`), or, re-encoded at
128 kbps (`wtc1-NN{p,f}.mp3`), it is
published beside the page under `recordings/ishizaka/`, and for local builds copied into
`public/recordings/ishizaka/` (ignored by git).
