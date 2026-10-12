#!/bin/sh
# Regenerates the chorale data in dependency order (C35). Run from anywhere: sh tools/chorales/regen.sh
set -e
cd "$(dirname "$0")/../.."
for s in bach_analyse kittel_analyse principles cadence_plans harmony_plans bass_plans figure_plans voice_plans study_data listening_notes; do
  python3 tools/chorales/$s.py > /dev/null || { echo "FAIL $s"; exit 1; }
done
echo done
