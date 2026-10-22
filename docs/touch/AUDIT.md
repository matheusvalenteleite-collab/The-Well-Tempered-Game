# Touch game: difficulty audit (generated)

By `tools/touch/audit.ts` (D165-D168). A simulated player plays every part (a fugue's voice, a prelude's
hand) of every section of the 96 preludes and fugues through the game's own engine at the beat 50 (♩=50 in 4/4): on time within a random jitter
(normal, s.d. 40 ms), on the right row of the keys within a third of a row (normal), long notes held.
EASY counts the time only and lets the short notes ride; NORMAL wants the row (one off still counts).
80% earns a voice. This checks that each passage is fair, not how hard it is for a hand. Below: the
passages under 80%, and each fugue's lowest score at each level.

| piece | parts | sections | lowest easy | lowest normal |
|---|---|---|---|---|
| Prelude 1 in C major (I) | 2 | 5 | 100 | 100 |
| Fugue 1 in C major (I) | 4 | 5 | 100 | 100 |
| Prelude 2 in C minor (I) | 2 | 6 | 98 | 99 |
| Fugue 2 in C minor (I) | 3 | 6 | 100 | 100 |
| Prelude 3 in C♯ major (I) | 2 | 17 | 100 | 100 |
| Fugue 3 in C♯ major (I) | 3 | 10 | 100 | 100 |
| Prelude 4 in C♯ minor (I) | 4 | 6 | 100 | 99 |
| Fugue 4 in C♯ minor (I) | 5 | 20 | 100 | 100 |
| Prelude 5 in D major (I) | 2 | 6 | 99 | 100 |
| Fugue 5 in D major (I) | 4 | 6 | 100 | 98 |
| Prelude 6 in D minor (I) | 2 | 5 | 95 | 96 |
| Fugue 6 in D minor (I) | 3 | 8 | 100 | 100 |
| Prelude 7 in E♭ major (I) | 2 | 11 | 91 | 94 |
| Fugue 7 in E♭ major (I) | 3 | 5 | 100 | 100 |
| Prelude 8 in E♭ minor (I) | 2 | 7 | 89 | 92 |
| Fugue 8 in D♯ minor (I) | 3 | 15 | 100 | 100 |
| Prelude 9 in E major (I) | 2 | 4 | 98 | 99 |
| Fugue 9 in E major (I) | 3 | 6 | 100 | 100 |
| Prelude 10 in E minor (I) | 2 | 7 | 100 | 98 |
| Fugue 10 in E minor (I) | 2 | 5 | 100 | 100 |
| Prelude 11 in F major (I) | 2 | 3 | 100 | 99 |
| Fugue 11 in F major (I) | 3 | 10 | 100 | 100 |
| Prelude 12 in F minor (I) | 2 | 3 | 93 | 97 |
| Fugue 12 in F minor (I) | 4 | 7 | 100 | 100 |
| Prelude 13 in F♯ major (I) | 2 | 5 | 100 | 100 |
| Fugue 13 in F♯ major (I) | 3 | 5 | 100 | 100 |
| Prelude 14 in F♯ minor (I) | 2 | 4 | 99 | 100 |
| Fugue 14 in F♯ minor (I) | 4 | 4 | 100 | 100 |
| Prelude 15 in G major (I) | 2 | 3 | 100 | 100 |
| Fugue 15 in G major (I) | 3 | 11 | 100 | 96 |
| Prelude 16 in G minor (I) | 2 | 4 | 97 | 97 |
| Fugue 16 in G minor (I) | 4 | 6 | 100 | 100 |
| Prelude 17 in A♭ major (I) | 2 | 7 | 99 | 99 |
| Fugue 17 in A♭ major (I) | 4 | 6 | 100 | 100 |
| Prelude 18 in G♯ minor (I) | 2 | 6 | 92 | 97 |
| Fugue 18 in G♯ minor (I) | 4 | 8 | 100 | 100 |
| Prelude 19 in A major (I) | 2 | 4 | 97 | 99 |
| Fugue 19 in A major (I) | 3 | 9 | 100 | 97 |
| Prelude 20 in A minor (I) | 2 | 5 | 92 | 98 |
| Fugue 20 in A minor (I) | 4 | 16 | 98 | 99 |
| Prelude 21 in B♭ major (I) | 2 | 4 | 94 | 97 |
| Fugue 21 in B♭ major (I) | 3 | 7 | 100 | 98 |
| Prelude 22 in B♭ minor (I) | 2 | 4 | 96 | 99 |
| Fugue 22 in B♭ minor (I) | 5 | 9 | 100 | 100 |
| Prelude 23 in B major (I) | 2 | 3 | 96 | 99 |
| Fugue 23 in B major (I) | 4 | 6 | 100 | 100 |
| Prelude 24 in B minor (I) | 2 | 8 | 98 | 98 |
| Fugue 24 in B minor (I) | 4 | 12 | 98 | 98 |
| Prelude 1 in C major (II) | 2 | 6 | 97 | 98 |
| Fugue 1 in C major (II) | 3 | 12 | 100 | 100 |
| Prelude 2 in C minor (II) | 2 | 4 | 100 | 100 |
| Fugue 2 in C minor (II) | 4 | 2 | 100 | 100 |
| Prelude 3 in C♯ major (II) | 2 | 8 | 92 | 94 |
| Fugue 3 in C♯ major (II) | 3 | 8 | 95 | 96 |
| Prelude 4 in C♯ minor (II) | 2 | 10 | 88 | 93 |
| Fugue 4 in C♯ minor (II) | 3 | 12 | 100 | 100 |
| Prelude 5 in D major (II) | 2 | 9 | 98 | 93 |
| Fugue 5 in D major (II) | 4 | 9 | 100 | 100 |
| Prelude 6 in D minor (II) | 2 | 11 | 100 | 100 |
| Fugue 6 in D minor (II) | 3 | 5 | 100 | 100 |
| Prelude 7 in E♭ major (II) | 2 | 12 | 91 | 96 |
| Fugue 7 in E♭ major (II) | 4 | 7 | 100 | 100 |
| Prelude 8 in D♯ minor (II) | 2 | 6 | 100 | 100 |
| Fugue 8 in D♯ minor (II) | 4 | 8 | 98 | 99 |
| Prelude 9 in E major (II) | 2 | 10 | 93 | 94 |
| Fugue 9 in E major (II) | 4 | 7 | 100 | 100 |
| Prelude 10 in E minor (II) | 2 | 18 | 100 | 100 |
| Fugue 10 in E minor (II) | 3 | 10 | 100 | 98 |
| Prelude 11 in F major (II) | 2 | 11 | 94 | 97 |
| Fugue 11 in F major (II) | 3 | 12 | 100 | 100 |
| Prelude 12 in F minor (II) | 2 | 12 | 94 | 94 |
| Fugue 12 in F minor (II) | 3 | 11 | 100 | 100 |
| Prelude 13 in F♯ major (II) | 2 | 12 | 97 | 98 |
| Fugue 13 in F♯ major (II) | 3 | 13 | 100 | 100 |
| Prelude 14 in F♯ minor (II) | 2 | 8 | 94 | 96 |
| Fugue 14 in F♯ minor (II) | 3 | 9 | 100 | 100 |
| Prelude 15 in G major (II) | 2 | 9 | 99 | 99 |
| Fugue 15 in G major (II) | 3 | 8 | 100 | 100 |
| Prelude 16 in G minor (II) | 2 | 4 | 91 | 94 |
| Fugue 16 in G minor (II) | 4 | 11 | 100 | 100 |
| Prelude 17 in A♭ major (II) | 2 | 12 | 87 | 95 |
| Fugue 17 in A♭ major (II) | 4 | 8 | 94 | 96 |
| Prelude 18 in G♯ minor (II) | 2 | 8 | 100 | 100 |
| Fugue 18 in G♯ minor (II) | 3 | 18 | 100 | 100 |
| Prelude 19 in A major (II) | 2 | 6 | 95 | 98 |
| Fugue 19 in A major (II) | 3 | 6 | 100 | 100 |
| Prelude 20 in A minor (II) | 2 | 5 | 100 | 99 |
| Fugue 20 in A minor (II) | 3 | 5 | 100 | 98 |
| Prelude 21 in B♭ major (II) | 2 | 14 | 95 | 98 |
| Fugue 21 in B♭ major (II) | 3 | 12 | 100 | 100 |
| Prelude 22 in B♭ minor (II) | 2 | 15 | 94 | 94 |
| Fugue 22 in B♭ minor (II) | 4 | 12 | 100 | 100 |
| Prelude 23 in B major (II) | 2 | 8 | 98 | 100 |
| Fugue 23 in B major (II) | 4 | 13 | 100 | 100 |
| Prelude 24 in B minor (II) | 2 | 10 | 100 | 100 |
| Fugue 24 in B minor (II) | 3 | 11 | 100 | 100 |

## Under 80% (0 of 4444 runs)

None.
