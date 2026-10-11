#!/usr/bin/env bash
# Fetch Craig Sapp's digital edition of the Bach four-part chorales (Breitkopf numbering, 370
# files: no. 150 is not a four-part chorale and is omitted upstream) at a pinned commit and vendor
# the **kern files into data/sources/bach-370-chorales/.
#
# Licence: CC BY-NC-SA 4.0 (upstream LICENSE.txt, copied alongside).
#
# Usage: tools/chorales/fetch_bach.sh [commit]
set -euo pipefail

REPO_URL="https://github.com/craigsapp/bach-370-chorales"
COMMIT="${1:-0fd9e00542445a522c6030c80c687b874aa569d5}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/data/sources/bach-370-chorales"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet "$REPO_URL" "$WORK/bach"
git -C "$WORK/bach" checkout --quiet "$COMMIT"

rm -rf "$DEST"
mkdir -p "$DEST/kern"
cp "$WORK/bach/LICENSE.txt" "$WORK/bach/README.md" "$DEST/"
cp "$WORK/bach/kern/"chor*.krn "$DEST/kern/"

cat > "$DEST/SOURCE.json" <<JSON
{
  "repository": "$REPO_URL",
  "commit": "$(git -C "$WORK/bach" rev-parse HEAD)",
  "commit_date": "$(git -C "$WORK/bach" log -1 --format=%cI)",
  "fetched": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "licence": "CC BY-NC-SA 4.0",
  "edition": "Craig Stuart Sapp (2009-), referenced against 371 vierstimmige Choralgesaenge, 4th ed. A. Doerffel, Breitkopf & Haertel, c. 1875",
  "scope": "kern/chor*.krn (370 files; no. 150 omitted upstream), LICENSE.txt, README.md",
  "files": $(ls "$DEST/kern" | wc -l)
}
JSON
echo "Vendored $(ls "$DEST/kern" | wc -l) chorales at $COMMIT into $DEST"
