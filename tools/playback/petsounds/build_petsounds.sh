#!/bin/sh
# D524, PET SOUNDS' tambourine (petKit): Virtuosity Drums' (Versilian Studios, Karoryfer Samples, CC0), already in
# public/samples/drums, copied unchanged under note names (src/touch/sampled.ts PET_KIT_FILES): soft (-1) C1, firm (-2) C#1.
# The rest of its kit is the rock kit (Big Rusty, read from drums/bigRusty: sampled.ts ROCK_KIT_SET); the timpani are
# public/samples/timpani (VSCO 2 CE, CC0) as they are. Run from the repository's root: sh tools/playback/petsounds/build_petsounds.sh
set -e
O=public/samples/petKit
mkdir -p "$O"
cp public/samples/drums/virtuosity/tambourine-1.mp3 "$O/C1.mp3"
cp public/samples/drums/virtuosity/tambourine-2.mp3 "$O/Cs1.mp3"
