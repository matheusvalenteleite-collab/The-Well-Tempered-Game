# The Well-Tempered Game

A videogame for learning and practising species counterpoint.

## Contents so far

- `data/fux/two-voice/fux-two-voice.json` is the game dataset: the 46 two-voice exercises from
  Fux's *Gradus ad Parnassum* (Part I), with Fux's original solutions, interval annotations and a
  cantus-firmus catalogue. `data/fux/two-voice/README.md` documents the schema and provenance, and
  `VALIDATION.md` holds the validation report.
- `data/sources/fux-species/` is a pinned, vendored copy of the source files (Four Score and More /
  Open Music Theory, CC0).
- `tools/fux_import/` holds the importer (standard-library Python) and the validator. The validator
  can optionally cross-check against music21.
- `src/music/fux/` is the typed runtime access layer: `FuxRepository` and the player-solution model.

```sh
npm install
npm run data:fetch    # re-vendor the pinned upstream commit (needs git + network)
npm run data          # build + validate (fails loudly on any error)
npm run typecheck && npm test
```

The importer needs Python ≥ 3.10. `pip install music21` enables the independent cross-parse in
validation. Node ≥ 22.18 runs the TypeScript sources directly.
