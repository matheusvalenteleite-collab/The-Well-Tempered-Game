# The four soloists from VocalSet (P16)

Source: VocalSet (J. Wilkins, P. Seetharaman, A. Wahl, B. Pardo, "VocalSet: A Singing Voice Dataset",
ISMIR 2018), zenodo.org/records/1442513, CC BY 4.0.

Singers: f2 (soprano) for the soprano, f5 (mezzo-soprano) for the alto, m11 (tenor), m8 (bass); vowel "a".
Material: long tones (straight, forte, pp), slow scales and arpeggios in C and F (forte, piano),
straight and vibrato scales and arpeggios.

1. `fetch.py OUT FULL/...wav ...`: takes single files out of VocalSet11.zip without downloading it (remotezip).
2. `SEGOUT=segs-f2.json segs.py FILES`: YIN pitch track (10 ms), averaged over 0.2 s (a vibrato cycle);
   a note is a stretch of at least 0.3 s within 40 cents of one semitone.
3. `build.py SCRATCH OUT`: for each pitch, the best stretch (long, steady, straight tones preferred);
   retuned to the exact pitch with ffmpeg's rubberband (formant preserved); levelled; tiled by
   correlation-aligned crossfades into 3.25 s, of which 1.0-3.0 s is one seamless loop; MP3 96 kbit/s.
   Pitches VocalSet does not reach are shifted from the nearest sung note (formant preserved):
   the alto's F3-A3 from C4, the bass's D2-A2 from C3, the tenor's A4 from F#4.

## D305: straight tone (`build_straight.py`)

SOLO VOICES' owner asked for straight, one-singer-per-part voices (no vibrato). The parts were rebuilt
from VocalSet's straighter singers: f7 (soprano), f8 (alto), m3 (tenor), m8 (bass), from their
`straight` scales/arpeggios/long tones and their `slow_piano`/`slow_forte` scales and arpeggios ("a").

1. `fetch.py` as above, for those files (`FULL/<singer>/{long_tones,scales,arpeggios}/...`).
2. `segs2.py OUT.json FILES` (as `segs.py`, YIN at 5 ms, each note's
   vibrato and wander measured).
3. `build_straight.py SEGS.json VOCALSET_DIR OUT [parts...]`: per semitone, the steadiest note within 4
   semitones (straight takes preferred), its pitch held steady (read at a varying rate that undoes its
   wobble), its level held steady, shifted with rubberband (formant preserved), tiled into the same
   3.25 s / 1.0-3.0 s loop layout; writes `report.json` (source, shift, wobble before/after, tuning).
   Measured (3-9 Hz pitch wobble over the loop): 33 → 0.9 cents (soprano), 18 → 0.9 (alto),
   14 → 1.9 (tenor), 11 → 2.0 (bass).
