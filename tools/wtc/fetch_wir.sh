#!/usr/bin/env bash
# Fetch the When in Rome analyses of the Well-Tempered Clavier (Mark Gotham et al., CC BY-SA 4.0:
# https://github.com/MarkGotham/When-in-Rome) at a pinned commit, sparse (the Bach keyboard folders
# only), into data/local/sources/when-in-rome/. Human Roman-numeral analyses (RomanText) of the 24
# preludes of Book I and of fugues I/19, I/22, II/7, II/11, II/16, II/23, II/24: the yardstick
# for tools/wtc/harmony.py. Kept local for symmetry with the WTC notes; the licence would allow
# committing them with attribution.
set -euo pipefail
REPO_URL="https://github.com/MarkGotham/When-in-Rome"
COMMIT="${1:-1c61fe41b8c2910296d7d2bcbf6476c7c1f2fe35}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/data/local/sources/when-in-rome"
rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
git clone --quiet --filter=blob:none --no-checkout "$REPO_URL" "$DEST"
git -C "$DEST" sparse-checkout set "Corpus/Keyboard_Other/Bach,_Johann_Sebastian/The_Well-Tempered_Clavier_I" "Corpus/Keyboard_Other/Bach,_Johann_Sebastian/The_Well-Tempered_Clavier_II"
git -C "$DEST" checkout --quiet "$COMMIT"
echo "Fetched $(ls "$DEST"/Corpus/Keyboard_Other/Bach,_Johann_Sebastian/*/*/analysis.txt | wc -l) analyses at $COMMIT into $DEST (local only)"
