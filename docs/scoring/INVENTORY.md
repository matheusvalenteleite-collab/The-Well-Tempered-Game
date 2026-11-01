# Scoring inventory (WTC 2.11–2.12, branch `claude/scoring-audit`)

How a LADDER run is judged and rewarded, read from the code, then measured. Paths are under `src/bench/`; PG = `proto-game.ts`.

## 1. Verdicts per note

| Verdict | Rule | Where |
|---|---|---|
| Window | ±250 ms (`MECH.earlyMs/lateMs`), scaled by the passage's median gap between notes (D329: ×gap/360, gap clamped to 250–720, giving 174–500 ms). Cut halfway to the neighbours, floor 60 ms scaled (D290). Bluetooth +20/+25 ms (D299). | mechanics.ts:38–53, 392; PG:759–768; `src/touch/lanes.ts:214` |
| PERFECT | \|off\| ≤ 70 ms scaled by the note's own gap (49–140 ms). Also PERFECT: a late strike within the expressive-time grace (0.15 beat on strong or dissonant notes, 120 ms after a breath, up to 0.2 beat in the last 2 bars; D325b), and any hold-over appoggiatura (D364). | PG:3478–3498; intention.ts:192 |
| GOOD | Right, inside the window, not PERFECT. | PG:3623 |
| ✕ wrong | Wrong height or direction. A slip. | PG:3463–3468 |
| MISS | No touch by the window's end + 35 ms. One slip per note. | PG:157, 1218–1250 |
| Stray | A touch on no note ("✕ OFF TIME"). A slip, counted in `stray`. | PG:2382–2388 |
| Revoked | Notes passed only by the lenient run rule become wrong when the run's trend fails (D332). Their points are taken back and a slip is counted, with **no word shown**. | PG:1697–1718 |

## 2. Points

| Source (sheet label) | Amount | D | Where |
|---|---|---|---|
| NOTES | 2 for PERFECT, 1 for GOOD, × mult, × 2 in PLENO (½ for a "relative" lane: HIGHWAY only) | D181, D239 | PG:3512–3516 |
| (take-back) | half the note's points, if an agogic note is not followed on the pulse | D325b | PG:3484–3495 |
| ARTICULATION | a join consistent with the inferred touch (or the reading's ⌒/\|) earns `max(1, round(pts × min(0.25 × chain, 1)))`; capped at 30 % of the score | D325 | intention.ts:132–142; PG:3559–3582 |
| HELD NOTES: sustain | 1 point a beat × mult (× 2 in PLENO) while a note of a beat or more is held; no pop | D198 | PG:3790–3804 |
| HELD NOTES: HELD | `clamp(round(2 × beats), 1, 8)` × mult for a release within bounds | D218 | articulation.ts:81, 102; PG:3986–3991 |
| HELD NOTES: CLEAN | + mult for a rest respected | D218 | PG:3992–3998 |
| SUBJECTS | 20 × mult per entry captured (all its notes right); 40 × mult per stretto (SUBJECT proto) | D181, D217 | PG:3723, 3756 |
| CADENCES | 10 × mult, if streak ≥ 4 and ≥ 4 right notes since the last slip | D194, D249 | PG:3766–3775 |
| THE READING | + mult per ask met (⌒, \|, dot, accent) | D272, D385 | PG:4714–4729 |
| BONUSES | ECHO 1, LINE 2, SWEEP 2, PEDAL round(40 × share), HOME round(40 × charge), BOTH HANDS 20; each × mult | D250, D258, D262 | PG:3294, 4211, 4355, 4378, 4431, 4442 |
| PERFORMANCE BONUS | score × performance / 200, finished runs only (up to +50 %) | D268 | score-sheet.ts:106 |

## 3. Multiplier, streak, zones

- **mult** runs from ×1 to ×4 and goes up 1 each time `streak % 8 == 0` (PG:3510).
- **A slip** (D249, PG:3694–3705) cuts the streak and the combo by `max(4, ceil(n/4))`. mult drops 1 only if the slip comes fewer than 8 right notes after the previous slip. The crowd loses 0.045 (0.03 in a prelude).
- **combo** and **streak** are updated by the same lines (PG:3500–3502, 3700–3701). The screen shows "COMBO n" (from 5); the sheet's "MAX COMBO" is `maxStreak`.
- **ORGANO PLENO** (D181): a capture doubles note and sustain points until the next entry in any voice (PG:3728–3731). It shows a banner and "PLENO ×2". The left bar's "×n" leaves the doubling out (paint-proto.ts:99, 109).
- **CON FUOCO**: streak ≥ 24. Banner and embers only, no points; no sound since D482.

## 4. Penalties

A wrong, missed, stray or revoked note is a slip and scores nothing. TOO SOON costs the crowd 0.01. REST! costs the crowd 0.03 and breaks the chain. An agogic note not followed on the pulse loses half its points.

## 5. Crowd

It starts at 0.6 (PG:106; the comment at PG:3779 says "a half"). PERFECT +0.025, GOOD +0.015, slip −0.045. The run ends at 0 only when `o.fail` is set: on in play.html, off in lessons (PG:1257). Break-even is 1 slip per 1.8 PERFECT notes. The meter has no numbers and turns red below 0.25.

## 6. Accuracy, grade, sheet, screen

- **Accuracy** = right / (notes + stray/2). In play it covers judged notes and is floored (paint-proto.ts:147); on the sheet it is rounded (SheetCard.tsx:12).
- **Grade** (`gradeOf`, PG:4482, D181): S needs ≥ 95 % **and every entry captured**; then A ≥ 90 %, B ≥ 80 %, C ≥ 70 %, else D. Nothing else counts.
- **Stars** (1–5, from score / 2 per note) are computed (PG:4020) and shown nowhere.
- **Performance /100** weighs accuracy 40, timing 20, articulation 20, subjects 20 and the reading 15. A failed run's performance is scaled by its progress.
- **Result** (SheetCard.tsx; BenchApp.tsx:1735): the grade or THE CROWD LEFT with the bar and advice; "a POINTS + b PERFORMANCE BONUS"; the final; NEW BEST / BEST (and BEFORE 1.52); PERFORMANCE · MAX COMBO; five quality bars; points by source; the tempo. COPY REPORT appears only when unlocked.
- **In play**: score, ×mult, COMBO, LEGATO ×n, PLENO ×2, ACCURACY, SUBJECTS n/m, CROWD; the words PERFECT/GOOD/✕/MISS, articulation words (SAME TOUCH ×n, HELD, CLEAN, TOO SOON, REST!) and reading words (✓); "+n" pops; banners.

## 7. What is kept (lite.ts)

- The best grade and best final are kept per **piece id**, whatever the voice. FAST and DEFAULT share one best; SLOW is kept apart (D356). Only whole, finished runs count (BenchApp.tsx:870–874; lite.ts:276–298). Bests are stamped `JUDGING "1.52"` (D337).
- A grade of B or better opens the fugue's sound, tempo steps and seals (D417). Book II needs all 24 Book I fugues finished at any grade (D382).

## 8. Measurements

João (`playerRun`), Busoni reading, default voice, hold 0.7, crowd on; `ProtoGame.earn` instrumented (`scratchpad/score/measure.ts`). "wrongEvery" puts a note 3 rows the wrong way, and not all such notes are judged wrong (I/22 L1: 35 of about 57).

**Final (seed 3 / seed 11), grade, entries captured; x = the crowd left:**

| Fugue (notes) | L1 | L3 | L5 | L7 | L10 |
|---|---|---|---|---|---|
| I/22 (173) | 1865/1631 C 3/7 | 1744/1707 C 2/7 | 3664/3598 B 5/7 | 4511/4381 B 5/7 | 5973/5861 A 6/7 |
| I/1 (215) | x/x | 966/701 C 0/5 | 1327/1087 C 0/5 | 1978/2272 B 0/5 | 4017/3494 A 1/5 |
| I/23 (193) | x/740 | 788/833 C 0/4 | 2063/1942 B 0/4 | 3400/3290 A 0/4 | 4345/4261 A 0/4 |
| I/2 (264) | x/x | x/x | 1579/861 C 0/4 | 2083/1757 B 0/4 | 3859/3886 A 0/4 |
| I/9 (277) | x/x | x/x | 731/x C 0/4 | 897/697 C 0/4 | 3645/3259 A 2/4 |
| I/10 (390) | x/x | x/x | x/x | x/x | 4111/3871 A 0/4 |

Runs finished: 3, 6, 9, 10 and 12 of 12 per level. Mean accuracy (crowd off): 62, 68, 75, 81, 92 %. No S. L10 captured 18 of 56 entries.

**Share of points by source** (crowd off, mean):

| Level | notes | artic. | held | subj. | cad. | reading | bonuses | from mult+PLENO* | perf. bonus / final |
|---|---|---|---|---|---|---|---|---|---|
| L1 | 57 | 12 | 25 | 2 | 2 | 2 | 0 | 10 % | 19 % |
| L3 | 57 | 13 | 25 | 2 | 2 | 2 | 0 | 13 % | 20 % |
| L5 | 54 | 14 | 24 | 2 | 4 | 2 | 0 | 31 % | 21 % |
| L7 | 54 | 17 | 23 | 2 | 3 | 2 | 0 | 41 % | 22 % |
| L10 | 51 | 20 | 21 | 3 | 3 | 1 | 0 | 58 % | 25 % |

\*Points minus the same events at ×1. This is a lower bound, since articulation inherits the multiplier. A clean player (20 ms jitter, `early.ts`) on I/1 gets 4,996 points, a final of 7,144 and an S. His notes average ×4.56, and articulation sits at its cap.

**Does a better player always score higher?** No. 5 of 48 adjacent-level pairs are inverted. Finished: I/22 L1 1865 > L3 1744 (equal accuracy, better timing at L3, one capture fewer). Across all voices, I/22 voice 0 gives L5 4153 **A** and L7 2925 **B**.

**Length or skill?** Final against note count: r = −0.36. Against level: r = +0.79. Against accuracy: r = +0.86. Points per note vary about tenfold between pieces: at L1, 10.8 on I/22 and 1.2 on I/10.

**Is one early mistake disproportionate?** Not through the multiplier, since early slips happen at ×1. Through the entry: a single miss inside an entry costs I/10 995 (note 3) or 1,353 (note 195) of 10,146 and turns S into A at 99.7 %. Outside an entry it costs 17. The multiplier has a cliff: a miss every 7 notes gives 1,779, every 8 gives 4,043 (I/10). For I/1 the step is 2,124 → 4,783 between 8 and 9 (`cliff.txt`).

**Can points be farmed?** Yes, by choosing the voice, because bests are per piece. I/2 at L10: 3,859 in the default voice against 5,083 in voice 1. I/22 at L3: 1,744 against 4,069 in voice 3. Holding is paid twice. No stray or replay farm found.

**Unreachable?** BONUSES were 0 in all 120 runs. The arcs exist only for wtc1p01 and p04 (arc.ts:102–151), the touch pedal needs `road` (PG:1936), and STRETTO needs the SUBJECT proto. S appeared in 1 of 120 crowd-on runs over every voice of I/1, I/2 and I/22.

## Problems found

1. Grade and score can invert against skill: on I/22 voice 0, L5 gets A 4153 and L7 gets B 2925. *Weigh captures less.*
2. The multiplier's 8-note cliff gives ×2.3 the score for +1.8 accuracy points (I/10). *Make it gradual.*
3. One miss inside an entry costs up to 13 % of the final and the S; outside one it costs 0.2 %. *Give partial capture credit.*
4. S needs every entry captured: 0 of 60 default-voice runs reached it, including 96 % on I/23 with 0/4 captured. *Relax the entry condition.*
5. Scores are not comparable across pieces (10× points per note), and the best ignores the voice (up to +133 %). *Key bests by voice, or normalise.*
6. Holding is paid twice, as sustain (D198) and as HELD (D218): 21–25 % of points, and more than the note points on I/22 L1. *Keep one.*
7. The crowd hardly fails a player who survives the start: a miss every 4 notes ended at 1.00 (`cliff.txt`). *Retune it.*
8. combo and streak are the same number (PG:3500–3502). COMBO and NOTE STREAK keep counting after a mistake, which removes only a quarter. *Merge them; reset on a slip.*
9. Stars are computed and never shown (PG:4020). *Remove them.*
10. BONUSES (6 kinds), STRETTO and the lane half-points cannot happen on LADDER fugues: 0 in 120 runs. *Isolate them by mode.*
11. Leftovers: `PERFECT_MS` (PG:96) is read only by tests, while the engine uses `MECH.perfectMs`. There are 12 KIMIKO (`o.her`) references and 16 branches for the piano, keys, highway and arrows protos in PG. *Prune.*
12. Stale comments: lite.ts:155 says "A or S" and BenchApp.tsx:418 says "A or better", while the code unlocks at B (D417). PG:3779 says the crowd starts at "a half"; it starts at 0.6. *Correct them.*
13. Some points change invisibly: sustain shows no pop, revoked notes and agogic take-backs show nothing, and "×n" leaves out PLENO's ×2. *Show each change.*
14. Accuracy is floored in play and rounded on the sheet, while the grade uses the raw value: 89.6 % shows "90%" and grades B. *Use one rounding.*
15. The PERFORMANCE BONUS (19–25 % of the final) counts accuracy a third time, and its formula is shown nowhere. *Explain it or fold it in.*
16. The reading earns 1–2 % of points (1 × mult per ask), and usually 10–25 % of asks were met, even at L10. *Scale it or drop it.*
