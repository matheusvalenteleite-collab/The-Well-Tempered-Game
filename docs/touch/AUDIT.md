# Touch game: difficulty audit (generated)

By `tools/touch/audit.ts` (D165-D169). A simulated player plays every part (a fugue's voice, a prelude's
hand) of the 96 preludes and fugues and Contrapunctus XIV, whole, through the game's own engine at MEDIUM (the beat 54): on time within a random jitter
(normal, s.d. 40 ms); the Synth with the right thumb at the band's height within a quarter of a band; the
Piano on the key within a sixth of a white key across it; long notes held. EASY counts the time (and on the
Synth the thumb) and lets the short notes ride; NORMAL wants the band, or the key.
80% earns a voice. This checks that each passage is fair, not how hard it is for a hand. Below: the
passages under 80%, and each fugue's lowest score at each level.

| piece | parts | bars | synth easy | synth normal | piano easy | piano normal |
|---|---|---|---|---|---|---|
| Prelude 1 in C major (I) | 2 | 35 | 100 | 100 | 100 | 100 |
| Fugue 1 in C major (I) | 4 | 27 | 100 | 99 | 100 | 98 |
| Prelude 2 in C minor (I) | 2 | 38 | 100 | 100 | 100 | 97 |
| Fugue 2 in C minor (I) | 3 | 31 | 100 | 100 | 100 | 98 |
| Prelude 3 in C♯ major (I) | 2 | 104 | 100 | 99 | 100 | 94 |
| Fugue 3 in C♯ major (I) | 3 | 55 | 100 | 100 | 100 | 95 |
| Prelude 4 in C♯ minor (I) | 4 | 39 | 100 | 100 | 99 | 95 |
| Fugue 4 in C♯ minor (I) | 5 | 115 | 100 | 100 | 100 | 95 |
| Prelude 5 in D major (I) | 2 | 35 | 100 | 100 | 100 | 97 |
| Fugue 5 in D major (I) | 4 | 27 | 100 | 100 | 100 | 96 |
| Prelude 6 in D minor (I) | 2 | 26 | 99 | 99 | 99 | 98 |
| Fugue 6 in D minor (I) | 3 | 44 | 100 | 100 | 100 | 98 |
| Prelude 7 in E♭ major (I) | 2 | 70 | 95 | 98 | 94 | 96 |
| Fugue 7 in E♭ major (I) | 3 | 37 | 100 | 100 | 100 | 97 |
| Prelude 8 in E♭ minor (I) | 2 | 40 | 95 | 97 | 95 | 91 |
| Fugue 8 in D♯ minor (I) | 3 | 87 | 100 | 100 | 100 | 95 |
| Prelude 9 in E major (I) | 2 | 24 | 99 | 100 | 99 | 97 |
| Fugue 9 in E major (I) | 3 | 29 | 100 | 100 | 100 | 96 |
| Prelude 10 in E minor (I) | 2 | 41 | 100 | 100 | 100 | 98 |
| Fugue 10 in E minor (I) | 2 | 42 | 100 | 100 | 100 | 98 |
| Prelude 11 in F major (I) | 2 | 18 | 100 | 100 | 100 | 99 |
| Fugue 11 in F major (I) | 3 | 72 | 100 | 100 | 100 | 99 |
| Prelude 12 in F minor (I) | 2 | 22 | 94 | 99 | 94 | 98 |
| Fugue 12 in F minor (I) | 4 | 58 | 100 | 100 | 100 | 97 |
| Prelude 13 in F♯ major (I) | 2 | 30 | 100 | 99 | 100 | 94 |
| Fugue 13 in F♯ major (I) | 3 | 35 | 100 | 100 | 100 | 96 |
| Prelude 14 in F♯ minor (I) | 2 | 24 | 100 | 100 | 100 | 96 |
| Fugue 14 in F♯ minor (I) | 4 | 40 | 100 | 98 | 100 | 95 |
| Prelude 15 in G major (I) | 2 | 19 | 100 | 100 | 100 | 99 |
| Fugue 15 in G major (I) | 3 | 86 | 100 | 100 | 100 | 99 |
| Prelude 16 in G minor (I) | 2 | 19 | 98 | 99 | 98 | 97 |
| Fugue 16 in G minor (I) | 4 | 34 | 100 | 100 | 100 | 97 |
| Prelude 17 in A♭ major (I) | 2 | 44 | 100 | 100 | 100 | 95 |
| Fugue 17 in A♭ major (I) | 4 | 35 | 100 | 99 | 100 | 97 |
| Prelude 18 in G♯ minor (I) | 2 | 29 | 96 | 99 | 96 | 96 |
| Fugue 18 in G♯ minor (I) | 4 | 41 | 100 | 99 | 100 | 96 |
| Prelude 19 in A major (I) | 2 | 24 | 98 | 99 | 98 | 97 |
| Fugue 19 in A major (I) | 3 | 54 | 100 | 100 | 100 | 96 |
| Prelude 20 in A minor (I) | 2 | 28 | 99 | 100 | 99 | 99 |
| Fugue 20 in A minor (I) | 4 | 87 | 100 | 100 | 100 | 98 |
| Prelude 21 in B♭ major (I) | 2 | 20 | 98 | 98 | 98 | 98 |
| Fugue 21 in B♭ major (I) | 3 | 48 | 100 | 100 | 100 | 98 |
| Prelude 22 in B♭ minor (I) | 2 | 24 | 99 | 99 | 99 | 96 |
| Fugue 22 in B♭ minor (I) | 5 | 75 | 100 | 99 | 100 | 95 |
| Prelude 23 in B major (I) | 2 | 19 | 97 | 100 | 97 | 95 |
| Fugue 23 in B major (I) | 4 | 34 | 100 | 99 | 100 | 95 |
| Prelude 24 in B minor (I) | 2 | 47 | 100 | 100 | 100 | 97 |
| Fugue 24 in B minor (I) | 4 | 76 | 100 | 100 | 100 | 97 |
| Prelude 1 in C major (II) | 2 | 34 | 98 | 99 | 98 | 99 |
| Fugue 1 in C major (II) | 3 | 83 | 100 | 100 | 100 | 99 |
| Prelude 2 in C minor (II) | 2 | 28 | 100 | 100 | 100 | 97 |
| Fugue 2 in C minor (II) | 4 | 28 | 100 | 99 | 100 | 98 |
| Prelude 3 in C♯ major (II) | 2 | 50 | 94 | 96 | 94 | 92 |
| Fugue 3 in C♯ major (II) | 3 | 35 | 100 | 99 | 100 | 94 |
| Prelude 4 in C♯ minor (II) | 2 | 62 | 98 | 99 | 98 | 97 |
| Fugue 4 in C♯ minor (II) | 3 | 71 | 100 | 100 | 100 | 96 |
| Prelude 5 in D major (II) | 2 | 56 | 100 | 98 | 100 | 98 |
| Fugue 5 in D major (II) | 4 | 50 | 100 | 99 | 100 | 96 |
| Prelude 6 in D minor (II) | 2 | 61 | 100 | 100 | 100 | 98 |
| Fugue 6 in D minor (II) | 3 | 27 | 100 | 100 | 100 | 97 |
| Prelude 7 in E♭ major (II) | 2 | 71 | 98 | 99 | 98 | 96 |
| Fugue 7 in E♭ major (II) | 4 | 70 | 100 | 100 | 100 | 96 |
| Prelude 8 in D♯ minor (II) | 2 | 36 | 100 | 100 | 100 | 96 |
| Fugue 8 in D♯ minor (II) | 4 | 46 | 100 | 100 | 100 | 94 |
| Prelude 9 in E major (II) | 2 | 54 | 99 | 99 | 99 | 97 |
| Fugue 9 in E major (II) | 4 | 43 | 100 | 100 | 100 | 95 |
| Prelude 10 in E minor (II) | 2 | 109 | 100 | 100 | 100 | 99 |
| Fugue 10 in E minor (II) | 3 | 86 | 100 | 99 | 100 | 98 |
| Prelude 11 in F major (II) | 2 | 72 | 96 | 99 | 97 | 97 |
| Fugue 11 in F major (II) | 3 | 99 | 100 | 100 | 100 | 98 |
| Prelude 12 in F minor (II) | 2 | 70 | 99 | 99 | 99 | 95 |
| Fugue 12 in F minor (II) | 3 | 85 | 100 | 100 | 100 | 97 |
| Prelude 13 in F♯ major (II) | 2 | 75 | 100 | 100 | 100 | 96 |
| Fugue 13 in F♯ major (II) | 3 | 84 | 100 | 100 | 100 | 95 |
| Prelude 14 in F♯ minor (II) | 2 | 43 | 97 | 98 | 97 | 95 |
| Fugue 14 in F♯ minor (II) | 3 | 70 | 100 | 100 | 100 | 96 |
| Prelude 15 in G major (II) | 2 | 48 | 100 | 100 | 100 | 99 |
| Fugue 15 in G major (II) | 3 | 72 | 100 | 100 | 100 | 98 |
| Prelude 16 in G minor (II) | 2 | 21 | 94 | 97 | 94 | 94 |
| Fugue 16 in G minor (II) | 4 | 84 | 100 | 100 | 100 | 98 |
| Prelude 17 in A♭ major (II) | 2 | 77 | 97 | 99 | 96 | 96 |
| Fugue 17 in A♭ major (II) | 4 | 50 | 99 | 99 | 99 | 96 |
| Prelude 18 in G♯ minor (II) | 2 | 50 | 100 | 100 | 100 | 97 |
| Fugue 18 in G♯ minor (II) | 3 | 143 | 100 | 100 | 100 | 95 |
| Prelude 19 in A major (II) | 2 | 33 | 98 | 99 | 98 | 97 |
| Fugue 19 in A major (II) | 3 | 29 | 100 | 100 | 100 | 97 |
| Prelude 20 in A minor (II) | 2 | 32 | 100 | 100 | 100 | 99 |
| Fugue 20 in A minor (II) | 3 | 28 | 100 | 99 | 100 | 97 |
| Prelude 21 in B♭ major (II) | 2 | 87 | 97 | 99 | 97 | 98 |
| Fugue 21 in B♭ major (II) | 3 | 93 | 100 | 100 | 100 | 98 |
| Prelude 22 in B♭ minor (II) | 2 | 83 | 97 | 98 | 98 | 95 |
| Fugue 22 in B♭ minor (II) | 4 | 101 | 100 | 100 | 100 | 96 |
| Prelude 23 in B major (II) | 2 | 46 | 100 | 100 | 100 | 96 |
| Fugue 23 in B major (II) | 4 | 104 | 100 | 100 | 100 | 97 |
| Prelude 24 in B minor (II) | 2 | 66 | 100 | 100 | 100 | 97 |
| Fugue 24 in B minor (II) | 3 | 100 | 100 | 100 | 100 | 97 |
| Contrapunctus XIV (unfinished) (AoF) | 4 | 239 | 100 | 100 | 100 | 98 |

## Under 80% (0 of 1072 runs)

None.
