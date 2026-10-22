# Touch game: difficulty audit (generated)

By `tools/touch/audit.ts` (D165-D169). A simulated player plays every part (a fugue's voice, a prelude's
hand) of the 96 preludes and fugues and Contrapunctus XIV, whole, through the game's own engine at MEDIUM (the beat 54): on time within a random jitter
(normal, s.d. 40 ms), on the right row of the keys within a third of a row (normal), long notes held.
EASY counts the time only and lets the short notes ride; NORMAL wants the row (one off still counts).
80% earns a voice. This checks that each passage is fair, not how hard it is for a hand. Below: the
passages under 80%, and each fugue's lowest score at each level.

| piece | parts | bars | lowest easy | lowest normal |
|---|---|---|---|---|
| Prelude 1 in C major (I) | 2 | 35 | 100 | 100 |
| Fugue 1 in C major (I) | 4 | 27 | 100 | 100 |
| Prelude 2 in C minor (I) | 2 | 38 | 100 | 100 |
| Fugue 2 in C minor (I) | 3 | 31 | 100 | 100 |
| Prelude 3 in C♯ major (I) | 2 | 104 | 100 | 100 |
| Fugue 3 in C♯ major (I) | 3 | 55 | 100 | 100 |
| Prelude 4 in C♯ minor (I) | 4 | 39 | 100 | 100 |
| Fugue 4 in C♯ minor (I) | 5 | 115 | 100 | 100 |
| Prelude 5 in D major (I) | 2 | 35 | 100 | 100 |
| Fugue 5 in D major (I) | 4 | 27 | 100 | 99 |
| Prelude 6 in D minor (I) | 2 | 26 | 99 | 99 |
| Fugue 6 in D minor (I) | 3 | 44 | 100 | 100 |
| Prelude 7 in E♭ major (I) | 2 | 70 | 94 | 98 |
| Fugue 7 in E♭ major (I) | 3 | 37 | 100 | 100 |
| Prelude 8 in E♭ minor (I) | 2 | 40 | 95 | 97 |
| Fugue 8 in D♯ minor (I) | 3 | 87 | 100 | 100 |
| Prelude 9 in E major (I) | 2 | 24 | 99 | 100 |
| Fugue 9 in E major (I) | 3 | 29 | 100 | 100 |
| Prelude 10 in E minor (I) | 2 | 41 | 100 | 100 |
| Fugue 10 in E minor (I) | 2 | 42 | 100 | 100 |
| Prelude 11 in F major (I) | 2 | 18 | 100 | 100 |
| Fugue 11 in F major (I) | 3 | 72 | 100 | 100 |
| Prelude 12 in F minor (I) | 2 | 22 | 94 | 98 |
| Fugue 12 in F minor (I) | 4 | 58 | 100 | 100 |
| Prelude 13 in F♯ major (I) | 2 | 30 | 100 | 100 |
| Fugue 13 in F♯ major (I) | 3 | 35 | 100 | 100 |
| Prelude 14 in F♯ minor (I) | 2 | 24 | 100 | 100 |
| Fugue 14 in F♯ minor (I) | 4 | 40 | 100 | 100 |
| Prelude 15 in G major (I) | 2 | 19 | 100 | 100 |
| Fugue 15 in G major (I) | 3 | 86 | 100 | 100 |
| Prelude 16 in G minor (I) | 2 | 19 | 98 | 98 |
| Fugue 16 in G minor (I) | 4 | 34 | 100 | 100 |
| Prelude 17 in A♭ major (I) | 2 | 44 | 100 | 100 |
| Fugue 17 in A♭ major (I) | 4 | 35 | 100 | 100 |
| Prelude 18 in G♯ minor (I) | 2 | 29 | 96 | 99 |
| Fugue 18 in G♯ minor (I) | 4 | 41 | 100 | 100 |
| Prelude 19 in A major (I) | 2 | 24 | 98 | 99 |
| Fugue 19 in A major (I) | 3 | 54 | 100 | 100 |
| Prelude 20 in A minor (I) | 2 | 28 | 99 | 100 |
| Fugue 20 in A minor (I) | 4 | 87 | 100 | 100 |
| Prelude 21 in B♭ major (I) | 2 | 20 | 98 | 99 |
| Fugue 21 in B♭ major (I) | 3 | 48 | 100 | 100 |
| Prelude 22 in B♭ minor (I) | 2 | 24 | 99 | 99 |
| Fugue 22 in B♭ minor (I) | 5 | 75 | 100 | 100 |
| Prelude 23 in B major (I) | 2 | 19 | 98 | 100 |
| Fugue 23 in B major (I) | 4 | 34 | 100 | 100 |
| Prelude 24 in B minor (I) | 2 | 47 | 100 | 100 |
| Fugue 24 in B minor (I) | 4 | 76 | 100 | 100 |
| Prelude 1 in C major (II) | 2 | 34 | 98 | 99 |
| Fugue 1 in C major (II) | 3 | 83 | 100 | 100 |
| Prelude 2 in C minor (II) | 2 | 28 | 100 | 100 |
| Fugue 2 in C minor (II) | 4 | 28 | 100 | 100 |
| Prelude 3 in C♯ major (II) | 2 | 50 | 94 | 96 |
| Fugue 3 in C♯ major (II) | 3 | 35 | 100 | 99 |
| Prelude 4 in C♯ minor (II) | 2 | 62 | 98 | 99 |
| Fugue 4 in C♯ minor (II) | 3 | 71 | 100 | 100 |
| Prelude 5 in D major (II) | 2 | 56 | 100 | 98 |
| Fugue 5 in D major (II) | 4 | 50 | 100 | 100 |
| Prelude 6 in D minor (II) | 2 | 61 | 100 | 100 |
| Fugue 6 in D minor (II) | 3 | 27 | 100 | 99 |
| Prelude 7 in E♭ major (II) | 2 | 71 | 97 | 99 |
| Fugue 7 in E♭ major (II) | 4 | 70 | 100 | 100 |
| Prelude 8 in D♯ minor (II) | 2 | 36 | 100 | 100 |
| Fugue 8 in D♯ minor (II) | 4 | 46 | 100 | 99 |
| Prelude 9 in E major (II) | 2 | 54 | 99 | 99 |
| Fugue 9 in E major (II) | 4 | 43 | 100 | 100 |
| Prelude 10 in E minor (II) | 2 | 109 | 100 | 100 |
| Fugue 10 in E minor (II) | 3 | 86 | 100 | 100 |
| Prelude 11 in F major (II) | 2 | 72 | 97 | 99 |
| Fugue 11 in F major (II) | 3 | 99 | 100 | 100 |
| Prelude 12 in F minor (II) | 2 | 70 | 99 | 100 |
| Fugue 12 in F minor (II) | 3 | 85 | 100 | 100 |
| Prelude 13 in F♯ major (II) | 2 | 75 | 100 | 100 |
| Fugue 13 in F♯ major (II) | 3 | 84 | 100 | 100 |
| Prelude 14 in F♯ minor (II) | 2 | 43 | 97 | 98 |
| Fugue 14 in F♯ minor (II) | 3 | 70 | 100 | 100 |
| Prelude 15 in G major (II) | 2 | 48 | 100 | 100 |
| Fugue 15 in G major (II) | 3 | 72 | 100 | 100 |
| Prelude 16 in G minor (II) | 2 | 21 | 94 | 96 |
| Fugue 16 in G minor (II) | 4 | 84 | 100 | 100 |
| Prelude 17 in A♭ major (II) | 2 | 77 | 97 | 99 |
| Fugue 17 in A♭ major (II) | 4 | 50 | 99 | 99 |
| Prelude 18 in G♯ minor (II) | 2 | 50 | 100 | 100 |
| Fugue 18 in G♯ minor (II) | 3 | 143 | 100 | 100 |
| Prelude 19 in A major (II) | 2 | 33 | 98 | 99 |
| Fugue 19 in A major (II) | 3 | 29 | 100 | 100 |
| Prelude 20 in A minor (II) | 2 | 32 | 100 | 100 |
| Fugue 20 in A minor (II) | 3 | 28 | 100 | 99 |
| Prelude 21 in B♭ major (II) | 2 | 87 | 97 | 99 |
| Fugue 21 in B♭ major (II) | 3 | 93 | 100 | 100 |
| Prelude 22 in B♭ minor (II) | 2 | 83 | 98 | 98 |
| Fugue 22 in B♭ minor (II) | 4 | 101 | 100 | 100 |
| Prelude 23 in B major (II) | 2 | 46 | 100 | 100 |
| Fugue 23 in B major (II) | 4 | 104 | 100 | 100 |
| Prelude 24 in B minor (II) | 2 | 66 | 100 | 100 |
| Fugue 24 in B minor (II) | 3 | 100 | 100 | 100 |
| Contrapunctus XIV (unfinished) (II) | 4 | 239 | 100 | 100 |

## Under 80% (0 of 536 runs)

None.
