#!/bin/sh
# Deletes the remote branches listed in docs/audits/merged-branches.txt (all already merged into the dev branch).
# Run from the repository root, with push rights. Asks first.
set -e
list="docs/audits/merged-branches.txt"
n=$(wc -l < "$list" | tr -d ' ')
printf 'Delete %s remote branches on origin (all merged into the dev branch)? Type yes: ' "$n"
read answer
[ "$answer" = "yes" ] || { echo "Nothing deleted."; exit 1; }
while read -r name sha; do
  [ -n "$name" ] || continue
  git push origin --delete "$name" || echo "could not delete $name"
done < "$list"
echo "Done."
