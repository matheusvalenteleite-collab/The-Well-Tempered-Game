# Recorded voices for the chorale ensembles: the options (for the owner's choice)

**Outcome**: "Choir" uses Sonatina's chorus with FluidR3's choir (P13); "Four soloists" uses VocalSet (the owner's
choice; P16, `tools/playback/vocalset/README.md`). Both load from the website; the claude.ai page falls back to the
formant synthesizer.

**Finding**: no permissively licensed library offers separate soprano, alto, tenor and bass choir
sections sustaining vowels across their range, nor four solo singers. What exists:

| source | licence | what it gives | effort |
|---|---|---|---|
| FluidR3_GM "choir_aahs", "voice_oohs" (per-note MP3s, gleitz/midi-js-soundfonts) | MIT upstream (Frank Wen); CC BY 3.0 per the repository | one blended choir, every semitone, ~2.8 MB an instrument; General MIDI quality, somewhat synthetic | none: per-note files ready |
| Sonatina Symphonic Orchestra, Chorus (github.com/peastman/sso) | Creative Commons Sampling Plus 1.0 (retired; verbatim sharing non-commercial only); sources of the recordings uncertain | female choir G4–C6 and male choir G2–F#4, chromatic, one vowel | small; licence risk |
| VocalSet (Wilkins, Seetharaman, Wahl and Pardo, ISMIR 2018; zenodo.org/records/1442513) | CC BY 4.0 | 20 trained singers (sopranos, mezzos, tenors, baritones, basses); sustained vowels a e i o u, straight and vibrato, scales and arpeggios | 1–3 days: extract per-pitch sustained notes by pitch tracking, loop them; diatonic coverage, refilled by retuning |
| sfzinstruments/legato_vocal_tutorial | CC0 | one male voice, vowel "a", chromatic C3–A#4 | none; a single voice of another style |
| Choral Singing Dataset, ESMUC Choir Dataset, Dagstuhl ChoirSet | CC BY 4.0 | separate SATB tracks of real choirs, but singing pieces with words | hard: notes must be cut from sung text |

Excluded: Arachno (no licence), Pianobook and Philharmonia (no redistribution), Spitfire LABS
(proprietary), and the non-commercial sets (Phonation Modes, OpenSinger).

**Proposal**:
- "Choir": FluidR3's choir_aahs now (no work, permissive).
- "Four soloists": extracted from VocalSet, one singer per part (e.g. a soprano f1–f4, a mezzo f5
  or f8 for the alto, a tenor m2, m3 or m11, the bass m8). Their own vibrato and timbre give each
  part a person.
- Both would be loaded from the site, not inside the claude.ai artifact, which has room for only
  about ten more files.

Credit lines would join `public/samples/LICENSES.txt`.
