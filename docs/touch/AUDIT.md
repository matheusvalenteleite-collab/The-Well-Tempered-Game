# Touch game: difficulty audit (generated)

By `tools/touch/audit.ts` (D165-D167). A simulated player plays every voice of every section of the 48
fugues through the game's own engine at the beat 50 (♩=50 in 4/4): on time within a random jitter
(normal, s.d. 40 ms), on the right row of the keys within a third of a row (normal), long notes held.
EASY counts the time only and lets the short notes ride; NORMAL wants the row (one off still counts).
80% earns a voice. This checks that each passage is fair, not how hard it is for a hand. Below: the
passages under 80%, and each fugue's lowest score at each level.

| fugue | voices | sections | lowest easy | lowest normal |
|---|---|---|---|---|
| Fugue 1 in C major (I) | 4 | 5 | 100 | 100 |
| Fugue 2 in C minor (I) | 3 | 6 | 100 | 100 |
| Fugue 3 in C♯ major (I) | 3 | 10 | 100 | 100 |
| Fugue 4 in C♯ minor (I) | 5 | 20 | 100 | 100 |
| Fugue 5 in D major (I) | 4 | 6 | 100 | 98 |
| Fugue 6 in D minor (I) | 3 | 8 | 100 | 97 |
| Fugue 7 in E♭ major (I) | 3 | 5 | 100 | 100 |
| Fugue 8 in D♯ minor (I) | 3 | 15 | 100 | 100 |
| Fugue 9 in E major (I) | 3 | 6 | 100 | 100 |
| Fugue 10 in E minor (I) | 2 | 5 | 100 | 100 |
| Fugue 11 in F major (I) | 3 | 10 | 100 | 100 |
| Fugue 12 in F minor (I) | 4 | 7 | 100 | 100 |
| Fugue 13 in F♯ major (I) | 3 | 5 | 100 | 98 |
| Fugue 14 in F♯ minor (I) | 4 | 4 | 100 | 100 |
| Fugue 15 in G major (I) | 3 | 11 | 100 | 98 |
| Fugue 16 in G minor (I) | 4 | 6 | 100 | 100 |
| Fugue 17 in A♭ major (I) | 4 | 6 | 100 | 100 |
| Fugue 18 in G♯ minor (I) | 4 | 8 | 100 | 100 |
| Fugue 19 in A major (I) | 3 | 9 | 100 | 99 |
| Fugue 20 in A minor (I) | 4 | 16 | 86 | 99 |
| Fugue 21 in B♭ major (I) | 3 | 7 | 100 | 100 |
| Fugue 22 in B♭ minor (I) | 5 | 9 | 100 | 100 |
| Fugue 23 in B major (I) | 4 | 6 | 100 | 100 |
| Fugue 24 in B minor (I) | 4 | 12 | 98 | 97 |
| Fugue 1 in C major (II) | 3 | 12 | 100 | 100 |
| Fugue 2 in C minor (II) | 4 | 2 | 100 | 100 |
| Fugue 3 in C♯ major (II) | 3 | 8 | 95 | 96 |
| Fugue 4 in C♯ minor (II) | 3 | 12 | 100 | 100 |
| Fugue 5 in D major (II) | 4 | 9 | 100 | 100 |
| Fugue 6 in D minor (II) | 3 | 5 | 98 | 100 |
| Fugue 7 in E♭ major (II) | 4 | 7 | 100 | 100 |
| Fugue 8 in D♯ minor (II) | 4 | 8 | 96 | 99 |
| Fugue 9 in E major (II) | 4 | 7 | 100 | 100 |
| Fugue 10 in E minor (II) | 3 | 10 | 100 | 97 |
| Fugue 11 in F major (II) | 3 | 12 | 100 | 100 |
| Fugue 12 in F minor (II) | 3 | 11 | 100 | 100 |
| Fugue 13 in F♯ major (II) | 3 | 13 | 100 | 100 |
| Fugue 14 in F♯ minor (II) | 3 | 9 | 100 | 100 |
| Fugue 15 in G major (II) | 3 | 8 | 100 | 100 |
| Fugue 16 in G minor (II) | 4 | 11 | 100 | 94 |
| Fugue 17 in A♭ major (II) | 4 | 8 | 94 | 96 |
| Fugue 18 in G♯ minor (II) | 3 | 18 | 100 | 100 |
| Fugue 19 in A major (II) | 3 | 6 | 100 | 100 |
| Fugue 20 in A minor (II) | 3 | 5 | 100 | 97 |
| Fugue 21 in B♭ major (II) | 3 | 12 | 100 | 100 |
| Fugue 22 in B♭ minor (II) | 4 | 12 | 100 | 100 |
| Fugue 23 in B major (II) | 4 | 13 | 100 | 100 |
| Fugue 24 in B minor (II) | 3 | 11 | 100 | 100 |

## Under 80% (0 of 2962 runs)

None.
