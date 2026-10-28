#!/bin/sh
# D366: every artefact built from the WTC's notes, in order, from the licence-clean editions.
# Needs python3 (the LilyPond reader; tools/wtc/harmonic_map.py's check needs the When in Rome
# analyses, tools/wtc/fetch_wir.sh, local only). Run from the repository's root: sh tools/wtc/rebuild.sh
set -e
node tools/wtc/import.ts                 # data/wtc/{fugues,preludes,inventions,ornaments}.json, docs/wtc/IMPORT.md
node tools/wtc/local-corpus.ts           # data/local/wtc (not committed), for the Python studies
python3 tools/wtc/fugues.py              # data/wtc/fugue-analysis.json, docs/wtc/FUGUES.md
python3 tools/wtc/answers.py             # data/wtc/answers.json, docs/wtc/ANSWERS.md
python3 tools/wtc/harmonic_map.py        # data/wtc/harmonic-maps.json, docs/wtc/HARMONIC-MAPS.md
python3 tools/wtc/preludes.py            # docs/wtc/PRELUDES.md
python3 tools/wtc-extract.py --corpus data/wtc/fugues.json data/bach/wtc/fugues.json   # D119's expositions, fugues-full.json
python3 tools/wtc-preludes.py data/wtc/preludes.json data/bach/wtc/preludes-full.json  # D125's preludes
node tools/wtc/licences.ts data/wtc/licences.json
node tools/touch/extract.ts              # data/touch/pieces.json (D363's band-only voices included)
node tools/touch/tutorial.ts             # data/touch/tutorial.json
node tools/touch/colour-plans.ts         # data/touch/colour-plans.json
node tools/touch/extras-index.ts
