#!/bin/sh
# D524, PET SOUNDS' rhythm section (petKit): the one-shots of two CC0 kits already in public/samples/drums, copied unchanged
# under note names (src/touch/sampled.ts PET_KIT_FILES): Big Rusty Drums (Karoryfer Samples: a vintage kit of the sixties'
# kind) for the bass drum, the snare, the two toms and the crash; Virtuosity Drums (Versilian Studios, Karoryfer) for the
# tambourine. Each piece soft (the -1 file) and firm (-2). The timpani are public/samples/timpani (VSCO 2 CE, CC0) as they are.
# Run from the repository's root: sh tools/playback/petsounds/build_petsounds.sh
set -e
D=public/samples/drums
O=public/samples/petKit
mkdir -p "$O"
cp "$D/bigRusty/kick-1.mp3" "$O/C1.mp3"; cp "$D/bigRusty/kick-2.mp3" "$O/Cs1.mp3"
cp "$D/bigRusty/snare-1.mp3" "$O/D1.mp3"; cp "$D/bigRusty/snare-2.mp3" "$O/Ds1.mp3"
cp "$D/bigRusty/tomHigh-1.mp3" "$O/E1.mp3"; cp "$D/bigRusty/tomHigh-2.mp3" "$O/F1.mp3"
cp "$D/bigRusty/tomLow-1.mp3" "$O/Fs1.mp3"; cp "$D/bigRusty/tomLow-2.mp3" "$O/G1.mp3"
cp "$D/bigRusty/crash-1.mp3" "$O/Gs1.mp3"; cp "$D/bigRusty/crash-2.mp3" "$O/A1.mp3"
cp "$D/virtuosity/tambourine-1.mp3" "$O/As1.mp3"; cp "$D/virtuosity/tambourine-2.mp3" "$O/B1.mp3"
