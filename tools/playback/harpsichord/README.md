# The sampled harpsichord and organ (D190)

Source: Versilian Community Sample Library (github.com/sgossner/VCSL), CC0: "Harpsichord, Unk" (Harpsi4:
57 keys with key-up releases) and "Pipe Organ" (Ivy Audio, loud manual every minor third and loud pedal).

1. `python3 -I fetch.py RAW`: downloads the 114 harpsichord and 32 organ WAVs (about 200 MB) from
   raw.githubusercontent.com into RAW (keep it outside the repository).
2. `python3 -I build.py RAW public/samples src/touch/sampled-data.ts`: trims, levels and encodes them (needs
   ffmpeg with libmp3lame and numpy); writes each note's measured tuning, length and (organ) loop to
   `sampled-data.ts`. Then `node tools/sample-manifest.mjs` (or `npm run build`) lists the files.

VCSL names C3 as middle C; the files here use C4 (MIDI 60), as the other sets do.
