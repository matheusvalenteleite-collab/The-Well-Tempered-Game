# How hard is each fugue, and what should come after Prelude I/1?

*Playtest analysis, 1 Nov 2026. All numbers come from simulated runs in the real engine (`ProtoGame`, LADDER, BUSONI reading, each fugue's fresh default voice, tempi from `stepTempi`). Nothing here is a guess unless it says so. Scripts: `ladder.ts`, `prel.ts`, `crowd.ts`, `metrics.ts` in the session scratchpad.*

## The simulated beginner

João is a simulated player with ten skill levels. Level 1 scatters his taps by ±150 ms, is 75 ms late on average, and lands one note in three the wrong way. Level 10 scatters by ±60 ms, is 30 ms late, and gets one note in ten wrong. "Finishes" means the crowd never empties. The crowd starts at 0.6, gains +0.015 for a good note and +0.025 for a perfect one, and loses 0.045 for a slip (0.03 in a prelude).

One piece of arithmetic explains most of what follows. A slip costs about two to three right notes. So the crowd stays level only if roughly **64–75% of the notes are right**. Grade C starts at 70%, D at 60%, and E means finishing below 60% (`fineGrade`). A run that survives is therefore almost always C or better.

## 1. The ladder: all 24 fugues

Each fugue was run at 10 levels × 3 seeds at DEFAULT and again at SLOW: 1,440 whole-fugue runs. I/1, I/8 and I/14 were then re-checked with 5 seeds, and the result did not change. "Needs" is the lowest level from which every seed finishes at that level and every level above it. "Any" is the lowest level at which at least one seed finishes.

| Rank | Fugue | Tempo (def/slow) | Notes/s | Fastest gap | Needs (def) | Any (def) | Needs (SLOW) | Grades of finished runs (def) |
|---|---|---|---|---|---|---|---|---|
| 1 | **I/22** | 86/65 | 0.86 | 349 ms | **1** | 1 | 1 | B 13, C 11, A 6 |
| 1 | **I/8** | 59/44 | 1.29 | 254 ms | **1** | 1 | 1 | B 19, C 16, A 15 (5 seeds) |
| 1 | **I/14** | 65/49 | 1.19 | 462 ms | **1** | 1 | 1 | B 20, **D 20**, C 10 (5 seeds) |
| 4 | I/6 | 57/43 | 1.35 | 263 ms | 2 | 1 | 1 | C 14, B 12, D 3 |
| 4 | I/24 | 43/32 | 1.05 | 349 ms | 2 | 1 | 1 | B 17, C 7, A 4 |
| 6 | I/4 | 101/76 | 0.86 | 297 ms | 3 | 1 | 1 | B 15, C 6, D 4, A 3 |
| 6 | I/23 | 57/43 | 1.48 | 263 ms | 3 | 1 | 1 | A 12, C 8, B 6 |
| 6 | I/5 | 54/41 | 1.17 | 139 ms | 3 | 2 | 3 | C 13, B 8, A 4 |
| 6 | **I/1** | 49/37 | 1.76 | 153 ms | **3** | 3 | **1** | C 9, A 8, B 7 |
| 6 | I/12 | 50/38 | 1.34 | 300 ms | 3 | 3 | 1 | B 13, C 6, A 5 |
| 11 | I/19 | 83/62 | 1.95 | 181 ms | 4 | 3 | 5 | C 11, B 8, A 3 |
| 12 | I/16 | 58/44 | 1.64 | 259 ms | 5 | 4 | 2 | B 8, A 6, C 5, D 1 |
| 12 | I/2 | 70/53 | 2.69 | 214 ms | 5 | 5 | 4 | B 7, A 6, C 5 |
| 12 | I/13 | 64/48 | 1.85 | 234 ms | 5 | 5 | 3 | B 9, C 6, A 3 |
| 12 | I/17 | 54/41 | 1.70 | 278 ms | 5 | 5 | 2 | B 11, C 4, A 3 |
| 12 | I/18 | 58/44 | 1.47 | 259 ms | 5 | 5 | 4 | B 9, C 6, A 3 |
| 17 | I/21 | 79/59 | 3.05 | 190 ms | 6 | 4 | 5 | C 11, B 7 |
| 18 | I/11 | 76/57 | 3.29 | 197 ms | 7 | 4 | 5 | B 5, C 4, A 3, D 1 |
| 18 | I/9 | 83/62 | 3.59 | 181 ms | 7 | 5 | 6 | C 8, A 3, B 2, D 1 |
| 18 | I/20 | 70/53 | 2.28 | 214 ms | 7 | 7 | 5 | B 6, A 3, C 3 |
| 21 | I/3 | 83/62 | 2.20 | 181 ms | 8 | 5 | 6 | C 6, B 3, A 3, D 2 |
| 21 | I/15 | 83/62 | 2.52 | 181 ms | 8 | 7 | 7 | C 5, B 5 |
| 23 | I/7 | 79/59 | 2.57 | 190 ms | 9 | 7 | 7 | B 6, C 3, A 1 |
| 23 | I/10 | 83/62 | 4.60 | 181 ms | 9 | 8 | 7 | B 3, A 3, C 1 |

Grades over every finished run:

| | Runs | Finished | A+ | A | B | C | D | E | Lowest accuracy that finished |
|---|---|---|---|---|---|---|---|---|---|
| DEFAULT | 720 | 486 | 0 | 91 | 203 | 168 | **24** | **0** | 63.6% |
| SLOW | 720 | 585 | 0 | 112 | 280 | 173 | **20** | **0** | 63.6% |

**D does happen.** It shows up in I/3, 4, 6, 9, 11, 14 and 16, and at SLOW in I/3, 4, 13, 14, 16 and 17. Earlier notes said nothing finished below C, but those runs already contained one D (I/23). **E never happened** under today's crowd. The arithmetic above says it almost cannot: to finish below 60% you would have to spend the crowd's opening cushion of about 13 slips and never pay it back. A+ never happened either. João is not that good.

What makes a fugue hard is mostly speed. The seven fugues at level 7 or above all have a fastest gap of 181–214 ms and more than 2.2 notes a second. The three easiest run at 0.9–1.3 notes a second and are full of long notes.

## 2. Prelude I/1 and a progressive tutorial version

**What the game asks today.** Since D261 the right thumb taps only the top of each half bar, on beats 2 and 4. That is 69 taps in 2½ minutes, 0.47 a second, with at least 1.6 s between taps. Heights are not judged at all: the lens records one direction check in the whole piece. Every João level, 1 to 10, finishes with 100% (A+). He still finishes with 100% when his scatter is ±300 ms. Today's Prelude I/1 is a pure timing exercise, and an easy one.

**A progressive version.** The engine has no setting for "only some notes". But a piece can be registered under a new id (`registerPieces`) with a hand-made voice. With a new id, Prelude I/1's arc does not apply, so heights are judged. I built the stages from the prelude's real notes:

| Stage | Notes the player strikes | Notes | Per s | Mean leap (rows) | Random tapper | João needs (every-Nth wrong) | João needs (random wrong) |
|---|---|---|---|---|---|---|---|
| 1 | the bass on beat 1 | 35 | 0.24 | 1.1 | 16–21% | level 1, A+ | level 1, A+ |
| 2 | one per beat: bass, top, bass, top | 135 | 0.91 | 11.2 | 37–42% | level 3, D | level 1, D–C |
| 3 | one per quaver, both hands | 271 | 1.83 | 5.6 | 29–34% | level 1, A+ | level 1, A+ |
| 4 | the whole right hand (12 a bar) | 413 | 2.79 | 3.5 | 27–29% | level 5, D | level 5, D–C |
| **Progressive** | bars 1–8 stage 1, 9–16 stage 2, 17–24 stage 3, 25–35 stage 4 | 229 | 1.54 | 4.9 | 26–29% | **4** (3: 4/5) | **3** (1–2: 1/5) |

Notes on the table. Wrong notes in the sim are overshoots in the right direction, and DIRECTION grading forgives an overshoot when the next move goes the other way. That is why stage 3's big, alternating leaps score 99% at every level. It is a quirk of the model, not proof that stage 3 is easy. Stage 1 cannot be failed: every note comes after a long rest, so its height is "free". Stage 4 at level 4 produced the **only E** of the study (1 run). E can happen in a prelude because its crowd is gentler (0.03 a slip).

In short, a progressive Prelude I/1 that finishes on the real figuration needs about **level 3**. That is the same level Fugue I/1 needs. It ramps from 0.24 to 2.8 notes a second, which is a real lesson.

## 3. Does Prelude I/1 prepare you for Fugue I/1?

| Skill | Prelude I/1 today | Progressive Prelude I/1 | Fugue I/1 (soprano) |
|---|---|---|---|
| Notes per second | 0.47 | 1.54 (up to 2.8) | 1.76 (busiest 4 s: 3.75) |
| Fastest gap | 1,636 ms | 273 ms (a semiquaver at 55) | **153 ms** |
| Heights judged | no | yes | yes |
| Mean leap | 0.8 rows | 4.9 rows | 1.4 rows |
| Note lengths used | 2 | not measured | 8 |
| Held notes (a beat or more) | 1% | not measured | 7% |
| Rhythm | one steady pulse | one steady pulse | dotted figures, quick pairs, ties |

Neither version teaches what kills João in Fugue I/1. Levels 1–2 die between bars 5 and 22, mostly around bar 8–12, where the subject's quick semiquaver pair and the entries pile up. The prelude teaches a steady pulse and wide leaps. The fugue asks for small steps, quick pairs and eight different note lengths.

**Verdict.** The owner's fear is right for today's prelude. A player who can do no more than today's Prelude I/1 is João level 1–2, and that player finishes Fugue I/1 in **0 of 10 runs** at DEFAULT and **10 of 10** at SLOW. The realistic first fugue is **I/22**: it finishes at level 1 at both tempi, with no D grades and long notes. **I/8** is the same level but runs for six minutes. If it has to be Fugue I/1, offer it at SLOW from the start rather than after two failures. That keeps the fugue itself constant and lets the player choose the tempo.

## 4. Crowd ideas that keep the bite

These are Fugue I/1 at DEFAULT, 5 seeds, with two weaker levels added (0: ±175 ms, one note in 3 wrong; −1: ±200 ms, one in 2). The changes exist only in the simulation (`g.slip` and `g.tap` wrapped at runtime).

| Crowd rule | Level −1 | Level 0 | Level 1 | Level 2 | Levels that all finish | D / E appear? |
|---|---|---|---|---|---|---|
| Today (0.045 any slip) | 0/5 | 0/5 | 0/5 | 0/5 | 8 of 10 (3–10) | no |
| Grace: 8 bars where the crowd can't drop below 0.6 | 0/5 | 0/5 | 1/5 | 5/5 | 9 | D yes |
| Grace, 8 bars, floor 0.3 | 0/5 | 0/5 | 0/5 | 2/5 | 8 | D |
| Grace: 13 bars (half the fugue) | 0/5 | 0/5 | 4/5 | 5/5 | 9 | D and **E** (1) |
| **Forgive wrong, not silence** (wrong/stray 0.02, miss 0.045) | 0/5 | 0/5 | **5/5** | **5/5** | **10** | D and **E** (1) |
| Forgive silence, not wrong (miss 0.02) | 0/5 | 0/5 | 1/5 | 2/5 | 8 | D |
| Rescue: Bach plays a missed note (no cost, no score) | 0/5 | 0/5 | 4/5 | 4/5 | 8 (9 nearly) | D |
| Rescue + 8-bar grace | 1/5 (E) | 0/5 | 5/5 | 5/5 | 10 | D and **E** |
| Stumble vs collapse (lone slip 0.02, slip within 8 notes 0.06) | 0/5 | 0/5 | 0/5 | 0/5 | 7 (level 3 4/5) | no |
| Veteran crowd 0.035 (earned by a best grade elsewhere) | 0/5 | 0/5 | 2/5 | 4/5 | 8 | D |
| Veteran crowd 0.03 (the prelude's) | 0/5 | 0/5 | 4/5 | 5/5 | 9 | D |

What this shows:
- **Grace alone only postpones the end.** With 8 bars of grace, level 1 still falls at bars 12–26.
- Most of João's slips are wrong notes, not missed ones (about 1,400 of 2,150 at baseline). So **forgiving wrong notes** is the rule that saves him. It lets every level finish and leaves the weakest levels at **D or E**, an honest score. Missing a note, going silent, still costs full price, so the crowd still bites.
- The "rescue" idea costs nothing in fun, because the music never stops and you earn no points for Bach's notes. Joined with a grace period it works as well as forgiving wrong notes.
- Punishing clusters of slips harder makes the game harsher.
- None of these rules saves levels 0 and −1. Those players need SLOW.

## 5. Mario and Glenn

**Glenn (keyboard).** Prelude I/1 is the right door. It is the most famous page in keyboard music, it has one figure, and the harmony does the storytelling. But today's version is a metronome game. Let the player earn the figuration: bass first, then the beat, then the whole arpeggio by the dominant pedal (bar 24). That way the climax arrives when the hands are ready for it. The fugue that best follows a prelude made of held harmony is **I/22**, which is slow, sustained and has a stile-antico subject. Then **I/8**, long but singing. Then **I/14**, which is moderate and never fast (its tightest gap is 462 ms), though it grades harshly. Fugue I/1 comes fourth or fifth, at SLOW first.

**Mario (game design).** Preludes should open in order of how many notes they ask for. The engine's counts give **I/8** (0.89 struck notes a second), **I/4** (1.06) and **I/22** (1.38) as the next three. I/8 and I/22 pair with the two easiest fugues, so a player meets each prelude–fugue pair as one key and one mood. (These preludes were measured, not played by João.) The unlock after Prelude I/1 should be **Prelude I/8 + Fugue I/22**, with Fugue I/1 also open at SLOW. If the owner insists on Fugue I/1 at DEFAULT, use the "forgive wrong, not silence" crowd: it is the only rule here that lets every level finish while still handing out Ds and Es.
