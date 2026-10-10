#!/usr/bin/env bash
# Fetch the Four Score and More / Open Music Theory Fux dataset (MarkGotham/species)
# at a pinned commit and vendor the Part I (two-voice) files into data/sources/.
#
# Usage: tools/fux_import/fetch_source.sh [commit]
set -euo pipefail

REPO_URL="https://github.com/MarkGotham/species"
COMMIT="${1:-5c7cae40422bd5ed897a2be3b916a7bc1a2a2df7}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/data/sources/fux-species"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet "$REPO_URL" "$WORK/species"
git -C "$WORK/species" checkout --quiet "$COMMIT"

rm -rf "$DEST"
mkdir -p "$DEST/I"
cp "$WORK/species/LICENSE" "$WORK/species/README.md" "$WORK/species/corpus.json" "$DEST/"
# Part-level public-facing files (Exercises / Solutions / Annotations / Distinct) + the TSV index.
cp "$WORK/species/I/"I-*.mxl "$WORK/species/I/data.tsv" "$DEST/I/"
# Per-exercise canonical files (krn = version of record, json = metadata) and derived mxl.
# Part III (four voices, D148): the TSV index and the per-exercise krn + json.
mkdir -p "$DEST/III"
cp "$WORK/species/III/data.tsv" "$DEST/III/"
for sp in sp1 sp2 sp3 sp4 sp5; do
  mkdir -p "$DEST/III/$sp"
  cp "$WORK/species/III/$sp/"gap_*.krn "$WORK/species/III/$sp/"gap_*.json "$DEST/III/$sp/"
done
for sp in sp1 sp2 sp3 sp4 sp5; do
  mkdir -p "$DEST/I/$sp"
  cp "$WORK/species/I/$sp/"gap_*.krn "$WORK/species/I/$sp/"gap_*.json "$WORK/species/I/$sp/"gap_*.mxl "$DEST/I/$sp/"
done

cat > "$DEST/SOURCE.json" <<JSON
{
  "repository": "$REPO_URL",
  "commit": "$(git -C "$WORK/species" rev-parse HEAD)",
  "commit_date": "$(git -C "$WORK/species" log -1 --format=%cI)",
  "latest_tag": "$(git -C "$WORK/species" describe --tags --abbrev=0 2>/dev/null || echo none)",
  "fetched": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scope": "Part I (two voices) only: I/I-{Exercises,Solutions,Annotations,Distinct}.mxl, I/data.tsv, I/sp*/gap_*.{krn,json,mxl}",
  "file_last_commits": {
$(cd "$WORK/species" && first=1 && for f in I/I-*.mxl I/data.tsv I/sp*/gap_*; do
    [ $first -eq 1 ] || printf ',\n'; first=0
    printf '    "%s": "%s"' "$f" "$(git log -1 --format='%h %cI' -- "$f")"
  done)
  }
}
JSON
echo "Vendored $(find "$DEST" -type f | wc -l) files at $COMMIT into $DEST"
