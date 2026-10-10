#!/usr/bin/env bash
# Fetch the Humdrum edition of the Well-Tempered Clavier (humdrum-tools/bach-wtc) at a pinned
# commit into data/local/sources/bach-wtc/. LOCAL ONLY: the files carry "Copyright 1994, David
# Huron / Rights to all derivative electronic formats reserved" (fugues) and "Copyright (c) 1994,
# 2000 CCARH / Rights to all derivative editions reserved" (preludes), so neither the encodings nor
# note-level data derived from them are committed (data/local/ is in .gitignore). What is
# committed: these tools and the findings (facts about Bach's music), see docs/wtc/.
set -euo pipefail
REPO_URL="https://github.com/humdrum-tools/bach-wtc"
COMMIT="${1:-0b4f4d84b90b254615e7ac09730ec473c9611cb6}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/data/local/sources/bach-wtc"
rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
git clone --quiet "$REPO_URL" "$DEST"
git -C "$DEST" checkout --quiet "$COMMIT"
echo "Fetched $(ls "$DEST"/kern/*.krn | wc -l) files at $COMMIT into $DEST (local only)"
