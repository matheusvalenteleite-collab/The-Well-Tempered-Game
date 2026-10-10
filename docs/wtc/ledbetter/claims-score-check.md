# Claims from the gap fills, checked against the encoded score

The fills made from the full PDF text (branch claude/beautiful-mccarthy-7li5nv,
docs/wtc/ledbetter-fills/gap-fills.md) suggested 269 claim lines. 175 were already in the digest.
The other 94, with 10 that add a voice or key to an existing line, were checked against the encoded
score (data/wtc/fugues.json, preludes.json) before being added to the Machine claims blocks:

- **41** fugue claims were confirmed by the analysis (tools/wtc/ledbetter-claims.ts on the lab branch)
  and added as they stand.
- **63** (the fugue claims the analysis missed or read in another key, and all prelude claims) were
  read in the notes, bar by bar: **49 confirmed, 13 corrected, 1 undecidable**, none absent.
  Corrected lines carry the score's reading followed by `(score; L.: <his reading>)`: Ledbetter's
  point holds but a detail differs (the bar of a cadence, its mode, a voice, where a pedal lies) or
  the encoding numbers bars differently (Book II no. 10 prelude: the encoding splits bar 48 at the
  repeat, so from b.49 its numbers run one lower than his).

Also from the fills: three soprano "entries" in Book I no. 13 (bb.7½, 18, 34) are head-motif
fragments, not entries, and were removed; the [GAP] flags the fills settle were cleared.

## Verdicts for the claims read in the score

- wtc1f02 section b.1-15 — CONFIRMED — top voice climbs to C6 (c''') at 15:1, and a new G-minor answer begins in the middle voice at 15:1.5 (G4 F#4 G4 C4 Eb4 G4 F#4 G4 A4 D4…), opening the second half's exposition. There is no V–I cadence at 15:1 (bass D3→Eb3).
- wtc1f03 section b.42-55 reprise — CONFIRMED — 42:2.5 top G#4 A#4 G#4 F#4 G#4 E#5 C#5 is identical to 1:2.5. Answer in the middle voice at 44:2.5 (= 3:2.5), bass at 46:2.5 (= 5:2.5), bass reaches C#2 at 51:3, and the final C# chord falls at 55:3.
- wtc1f04 section b.94-115 stretto — CONFIRMED — perfect cadence D#2–G#2 | C#2 at 94:1. S1 stretti follow: soprano E5 D#5 G5 F#5 (94:1), alto B4 A#4 D5 C#5 (95:2), soprano F#4 E#4 A4 G#4 (96:2), bass C#3 B#2 E3 D#3 (97:2), all against S3 repeated crotchets (no S2). The piece ends on a C# chord in b.115.
- wtc1f05 cadence b.11 b — CORRECTED — b.11 is on G (bass G2 at 11:1, then C3 D3 → G3 at 12:1, a G-major cadence). The only B-minor perfect cadence nearby is 8:3 E3 C#3, 8:4 F#3 → 9:1 B2 (top E5→D5, alto A#4→B4). b.13:1 (B2) comes from an A-major chord, not from V. The G (15:1) and e (17:1) cadences match exactly, so there is no bar offset. — corrected: wtc1f05 cadence b.9 b
- wtc1f05 section b.1-6 exposition — CONFIRMED — entries come in the bass (1:2), tenor (2:2), alto (4:2) and soprano (5:2), and the bass E3→A2 ends the exposition on the dominant at 6:1.
- wtc1f06 section b.1-21 — CONFIRMED — perfect cadence in A minor at 21:1 (bass E3→A3, top G#4→A4). Inverted-subject material starts right after, in the soprano at 21:1.5ff (A4 G4 F4 E4 G4 F4 E4 D4).
- wtc1f09 section b.19-29 reprise — CONFIRMED — after the C#-minor passage (bb.17–18), a closer stretto starts: tonic entry in the bass at 19:2.5 (E3 F#3 B2 C#3 D#3 E3), dominant entry in the cantus at 20:3 (C#5, F#4 G#4 A#4 B4; head varied), and tonic entry in the alto at 21:2.5 (E4 F#4 B3…). The piece ends on E in b.29.
- wtc1f11 entry b.1 tenor (refines) — CORRECTED — the subject at 1:1 (D4 C4 Bb3 C4 E3 F3 G3 A3 Bb3…) is in the middle of the encoding's three voices, which is the alto in a 3-voice fugue. It sits in tenor register (E3–D4), which is why Ledbetter says "tenor". The later entries (cantus 4:3, bass 9:3) match Ledbetter's bar numbers, so there is no offset. — corrected: wtc1f11 entry b.1 alto
- wtc1f11 section b.46-56 stretto — CONFIRMED — perfect cadence in D minor at 46:1 (bass A2→D2). Then a G-minor stretto: bass 46:3 (D3 Eb3 D3 C3 D3 F#2 G2 A2 Bb2), alto 48:3 (D4 Eb4 D4 C4 D4 F#3…), and soprano at the end of b.50 (D5 Eb5 D5 C5 D5 F#4…). It closes with a G-minor cadence into 56:1 (bass D3→G2).
- wtc1f11 section b.56-72 — CONFIRMED — G-minor cadence at 56:1, then the bass scale G2 A2 Bb2 C3 D3 E3 F3 G3 A3 reaches Bb3 at 59:1. Outer-voice scales run from 68:1, and the final F cadence falls at 72:1 (C2→F2).
- wtc1f13 entry b.22 bass — CORRECTED — no bass entry begins in b.22. A D#-minor bass entry starts at 20:1.5 (A#2 D#3 C##3 D#3 C#3 B2 A#2 … A#2) and lands on low D#2 at 22:1. Ledbetter's point (the bass reaching the low tonic at b.22) describes where that entry ends; the low note is D#, the local tonic, not F#. — corrected: wtc1f13 entry b.20 bass d#
- wtc1f13 entry b.7 bass — CORRECTED — the bass entry begins at 5:1.5 (C#3 F#3 E#3 F#3 E#3 D#3 C#3 … C#3) and ends on low F#2 at 7:1. Nothing in the bass starts a subject at b.7: from 7:1.5 it is free (F#3 E#3 C#3 F#3 A#3…). — corrected: wtc1f13 entry b.5 bass
- wtc1f14 cadence b.20 C# — CORRECTED — bass G#2 (20:3) → C#3 (20:4) gives a dominant cadence in mid-bar, but the chord is minor: C#3, E4 (alto), C#5 (soprano). — corrected: wtc1f14 cadence b.20 c#
- wtc1f14 entry b.20 alto C# — CONFIRMED — the inverted subject begins on the dominant degree in the alto (voice 1) at 20:5, right after the c# cadence: C#5 B4 A#4(long) B4 A4 G#4(long), then A4 B4 A4 G#4 F#4. Because it starts on C# and includes A#, the analyser read it in f#. As a dominant-degree inverso it matches Ledbetter.
- wtc1f14 entry b.25 soprano C# — CONFIRMED — recto entry on C# in the soprano with an ornamented head: C#5 (25:2.5), D#5 (25:3.5), E5 held (25:4), then D#5 E#5 F#5 held (26:2–3), then E#5 D#5 E#5 F##5 G#5. That is the subject's F# G# A | G# A# B | A# G# A# B# C# outline transposed to C#.
- wtc1f17 section b.27-35 reprise — CONFIRMED — the bass voice descends Eb3 Db3 C3 Bb2 to Ab2, where a tonic subject entry starts at 27:2 (Ab2 Eb3 C3 Ab2 F3 Db3 Eb3). A tenor entry follows at 28:2 (G3 C4 Ab3 F3 D4 B3 C4), and the final Ab cadence falls in b.35 (Eb2→Ab2).
- wtc1f18 section b.1-20 — CONFIRMED — the last exposition entry (alto on D#, 19:2: D#4 B#3 C#4 D#4 E4 D#4 C#4 F##4 G#4…) ends at 21:1. The bass moves E3 D#3 C#3 in b.20 (the first move away from the tonic), and a new semiquaver motif with a rising sequence starts at 21:1.5 (bass B2 A#2 B2 G#2; then 22:1.5 C#3 B#2 C#3 A#2). There is no full cadence at the join; the division is shown by texture.
- wtc1f19 section b.1-20 — CONFIRMED — dominant cadence at 20:1 (bass B2→E2, top F#4→E4), followed by the link in parallel imitation with no bass (bb.20–22).
- wtc1f19 section b.22-42 — CORRECTED — the link's paired imitation (voices 0/1, no bass) carries on through 22:8. The new section starts with the S2 semiquaver upbeat at 22:8.5 (F#5 E5 D5 C#5…) and the bass subject entry with an A arrival at 23:1 (A2; soprano G#5→A5), which agrees with Ledbetter's "S2 bb.23ff". The end is confirmed: perfect cadence into F# minor at 42:1 (C#2→F#2), with a subject entry from 42:1 (F#4, G#3 C#4 A3 D4 B3 E4). — corrected: wtc1f19 section b.23-42
- wtc1f20 section b.1-14 exposition — CONFIRMED — the exposition closes on E at 14:3 (bass B2→E3, with G#3 and E4), and the inverted subject starts in the soprano at 14:3.5 (E5 F5 E5 D5 C5 C5 D5 C5 B4), matching Ledbetter's 14½.
- wtc1f22 section b.1-25 exposition — CONFIRMED — b.24 bass Ab3–Ab2 (V) → b.25:1 Db3 under Db4 F4 Db5 (perfect cadence in Db, as Ledbetter says); soprano starts the next subject statement Db5 Ab4 … Cb6 Bb5 Ab5 at b.25–26
- wtc1f22 stretto b.50 voice? voice? — CONFIRMED — half-bar stretto: v0 (soprano) 50:1 F5 Bb4 | Cb6 Bb5 Ab5 Gb5 Fb5 Eb5; v1 (alto 1) 50:2 Bb4 Eb4 | F5 Eb5 Db5 Cb5 (Eb minor area; bass has a statement just before, 48:1 F3 Bb2 | Db4 C4 Bb3) — corrected: wtc1f22 stretto b.50 soprano alto
- wtc1f24 entry b.30 tenor Em — CONFIRMED — v2 (tenor) 30:1.5 B3 G3 E3 C4 B3 E4 D#4 A3 G#3 F4 E4 …, the subject on E minor (the subdominant), turning chromatic after the opening notes, as Ledbetter describes
- wtc1p01 pedal b.24-35 V — CORRECTED — bass G2 is held on every half-bar from b.24 to b.31; at b.32 the bass moves to C2, which is a tonic pedal for bb.32–35, so the dominant pedal stops at b.31 — corrected: wtc1p01 pedal b.24-31 V
- wtc1p02 cadence b.14 Eb — CONFIRMED — b.13 D3 F3 Ab3 Bb3 C4 D4 Ab4 (Bb7/D) → b.14 Eb3 G3 Bb3 Eb4 G4 (Eb major), the single Eb station in the descending bass
- wtc1p04 cadence b.14 G# — CORRECTED — 13:6 D#2 F##4 A#4 (V of G#) → 14:1 G#2 B3 D#4 G#4, a G# minor triad (B natural) held all bar; the cadence is on the minor dominant — corrected: wtc1p04 cadence b.14 g#
- wtc1p09 cadence b.8 B — CONFIRMED — 8:4–6 F#3 A#3 E4 C#5 (F#7) → 8:7 B2 D#4 B4 (B major) at b.8½, as Ledbetter says
- wtc1p14 cadence b.12 C# — CONFIRMED — 12:2–2.5 G#2 with D#5 trill (V of C#) → 12:3 C#2 and C#5 (bare octave, mode unstated) at b.12½; B# appears in b.12
- wtc1p17 section b.35-44 reprise — CONFIRMED — 34:3.5 Eb2 → 35:1 Ab2 and Ab4, then the opening rhythm (quaver, two semiquavers, quavers: Ab4 Eb5 Db5 Eb5 C5) returns over the tonic, slightly varied; the piece ends at b.44 on an Ab chord
- wtc2f01 cadence b.67 C — UNDECIDABLE — Ledbetter places this cadence in the early version (BWV 870a), which is not encoded. In the encoded final version, bb.67–8 have a deceptive cadence: bass E3 F3 G3 G#3 → A2 at 68:1 under C4/C5, with soprano B4–C5. A coda follows to b.83 (perfect cadence G2–C2 at 82–83). This fits a cadence that was later turned into a deceptive one
- wtc2f03 cadence b.7 G# — CONFIRMED — 6:2–6:4.5 G##2/D#2 with F##5 (D#7, V of G#) → 7:1 G#5 B#4, bass G#2 B#2 at 7:1.5 (G# major)
- wtc2f03 pedal b.25-26 V — CORRECTED — Ledbetter's bb.25–9 is the whole inserted passage, not where the pedal lies. In the encoded 35-bar version, the dominant pedal is bass G#3 held from 28:1 to 29:3 (8¼ beats). There is also a tonic pedal, C#2 from 33:3 to the end. Nothing is held over bb.25–26: the bass there moves G#3 … D#3 B#2 E#2 C#2 — corrected: wtc2f03 pedal b.28-29 V
- wtc2f04 entry b.35 soprano — CONFIRMED — v0 35:1 F#5(dotted crotchet ×2) E#5 E5 D#5 G#5 C#5 F#5 …: the second subject enters in the cantus over the arrival on F# (bass E#3 → F#3); alto answers at 36:4 B4 A#4 A4 G#4 C#5
- wtc2f04 section b.24-35 inversion — CONFIRMED — inverted subject: soprano 24:1 F#5 G#5 F#5 E5 F#5 E5 B5 A#5 G#5 …; alto 26:1 C#5 D#5 C#5 B4 C#5 B4 F#5 …; bass 28:1 G#3 A3 G#3 F#3 G#3 F#3 C#4 …. The second subject starts at b.35. Note that an upright tonic entry also falls inside the section (alto 30:1 C#4 B#3 C#4 D#4 …)
- wtc2f04 section b.48-71 — CONFIRMED — from b.48 the two subjects are combined: S1 in the soprano (C#5 tied from 47:7, then 48:2 B#4 C#5 D#5 C#5 D#5 G#4 …) against S2 in the bass (48:1 F#3 E#3 E3 D#3 G#3 C#3), the inverse of the b.35 layout. b.71 is the final bar (C#2 E#4 C#5)
- wtc2f05 cadence b.16 D — CONFIRMED — 15:2 A2 with C#4 G4 (V7) → 16:1 D2 D3 F#4 (D major)
- wtc2f05 cadence b.20 A — CONFIRMED — 20:1.5 E3 with G#4 (V of A) → 20:2 A2 with A4 (mid-bar 20)
- wtc2f09 cadence b.9 B — CONFIRMED — over bass B2 (held from 8:1), 8:4–4.5 C#4 E4 A#3 (F#7) → 9:1 B3 D#4 F#3 (B major); the cadence is in the upper parts over a held B rather than through bass motion
- wtc2f13 section b.32-44 exposition — CONFIRMED — dominant entry in the bass (32:2 B#3 trill → 33:1 C#4 G#3 A#3 B3 …); tonic entry in the alto (36:2 E#4 → 37:1 F#4 C#4 D#4 E4 …); relative-minor entry in the soprano (40:2 C##5 → 41:1 D#5 A#4 B#4 C#5 …). The section closes 43:2 C##4 → 44:1 D#3/D#4 (cadence on d#)
- wtc2f24 cadence b.28 F# — CORRECTED — 27:3 C#3 E#3 G#4 (V of F#) → 28:1 F#2 F#3 A4: the chord is F# minor (A natural), so the cadence is in the minor dominant, in the middle of the alto's entry — corrected: wtc2f24 cadence b.28 f#
- wtc2p03 cadence b.20 C# — CONFIRMED — 19:3 G#2 B#2 D#4 F#4 (V7) → 20:1 C#2, with the suspensions resolving to C#3 C#4 E#4 at 20:3 (tonic arrival)
- wtc2p03 cadence b.6 G# — CONFIRMED — b.5 beats 3-4 bass D#3 with F##3/A#4 (V of V) → b.6:1 bass G#2 with G#3, b.6:3-4 G#/B#/D# chord: arrival on the dominant G# at b.6 (a half cadence in C#)
- wtc2p05 section b.41-56 reprise — CONFIRMED — b.40 G#2–A2 (vii7–V) → b.41:1 D2 bass, and b.41-42 restate the b.1-2 head in the tonic (D-E-F#-G triplet run then A/D/F# arpeggio, upper and lower parts swapped); the piece ends b.56 (b.55-56 G–A–D cadence, D2)
- wtc2p07 section b.1-12 — CONFIRMED — b.11 bass Bb3–Eb3–F3 (melody D5…C4–A4) → b.12 bass Bb3/F3/D3/Bb2 arpeggio with D4/Bb4: cadence in Bb (V) at b.12; b.13 begins a new texture over a Bb2 pedal
- wtc2p08 cadence b.9 F# (wtc2f08, p.274–6:) wtc2f08 entry b.1 alto — CONFIRMED — (malformed line, holds two claims; both checked) prelude: b.8 beat 4 E#3–C#3 (V7 of F#) → b.9:1 F#2 with A#4: cadence in F# major at b.9; fugue: the subject D#4-D#4-D#4-C##4-D#4-E#4 begins b.1:1.5 in voice 1 = alto (soprano voice 0 enters only at b.9, tenor b.3, bass b.7)
- wtc2p10 section b.81-110 reprise — CORRECTED — the encoding has 108 bars, with bar 48 split into two records at the repeat. The tonic reprise of b.23-48 starts at b.80: b.80-83 ≈ b.23-26 at pitch, and b.82-83 = b.25-26 exactly. It then continues up a 4th, in the tonic: b.86-92 ← b.29-32 (sequence), b.98-102 = b.43-47, b.108 = b.48. b.80 follows the b.79 F#3 bass that resolves to E. Ledbetter's "b.81-end" fits if the split bar 48 counts as two bars (+1 from b.49 on). In that count the end is b.109, not 110 — corrected: wtc2p10 section b.80-108 reprise
- wtc2p13 cadence b.17 C# — CONFIRMED — b.16 bass F#3–G#3 (IV–V of C#) → b.17:1 C#3 with C#5, then G#3/E#5/G#5: cadence in C# major (the dominant)
- wtc2p13 section b.57-68 reprise — CONFIRMED — b.57-60 = b.1-4 at pitch (match 0.5/1.0/1.0/0.74), b.60-66 = b.7-13 a 4th up (subdominant phase); b.67:3 C#3 → b.68:1 F#3/A#3 with F#5: tonic cadence at b.68; b.69 begins the coda over E3 (the flat-7 of the subdominant)
- wtc2p14 cadence b.12 c# — CONFIRMED — b.11:3 G#2 bass with B#4/D#5 → b.12:1 C#3 with C#5, G#4, E3: C# minor cadence
- wtc2p14 cadence b.21 A — CONFIRMED — b.20:3 E3/G#3 bass with B4/D4 (V7 of A) → b.21:1 A3 with C#4/A4: cadence in A major
- wtc2p14 cadence b.30 f# — CONFIRMED — b.29 C#3 bass (with C#5, then C#3 alone) → b.30:1 F#2 with F#5, C#4/A3: F# minor cadence
- wtc2p16 cadence b.11 g — CONFIRMED — b.10:4 D3 with F#4/C5 (V7) → b.11:1 G2 with D3/Bb4: G minor cadence
- wtc2p16 cadence b.5 c — CONFIRMED — b.4:4 G3 with B4/F5 (V7 of c) → b.5:1 C3 with G3/Eb5: C minor cadence
- wtc2p17 section b.64-77 coda — CONFIRMED — b.62 Bb3, b.63 Eb3 (V) → b.64:1 Ab2: tonic arrival; b.64-66 start a new sequence (b.66 = b.64 a step down); b.76 Eb3 → b.77 Ab2 final chord
- wtc2p19 cadence b.16 f# — CONFIRMED — b.15:12 C#3 with E#5 → b.16:1 F#3 with A4/F#5: F# minor cadence
- wtc2p19 cadence b.9 E — CONFIRMED — b.8:7-8 B major (D#4/B3/B4), b.8:12 D#4+A4 (V7) → b.9:1 E4/G#4: cadence in E (all parts in one encoded voice; no lower bass sounds at 9:1)
- wtc2p19 pedal b.30-32 I — CONFIRMED — A2 is held or repeated from b.30:7 through b.32, under shifting upper harmonies (G4, D4, F#4 over A2), and continues to the final b.33
- wtc2p19 section b.22-33 reprise — CONFIRMED — b.21 A2 (V7 of D) → b.22 D3; b.22-29 = b.1-8 transposed up a 4th to D (match 0.76, 0.75, 0.58, 1.0, 1.0, 0.9, 0.74, 0.64); the piece ends b.33
- wtc2p21 section b.1-32 — CONFIRMED — b.32:4-6 C4/C3 → b.32:7 F2 with F5: cadence in F (V) in b.32; b.33 starts a new figure over F2
- wtc2p21 section b.33-48 — CONFIRMED — b.33 new start after the F cadence; b.48:6 D3 → b.48:7 G3/G4: G minor (vi) cadence closing the middle section in b.48
- wtc2p21 section b.49-87 reprise — CONFIRMED — b.49-50 restate b.1-2 at pitch (match 0.73/0.65, recast); the piece ends b.87
- wtc2p22 section b.55-82 reprise — CORRECTED — b.55 top-voice Gb5-F5-Eb5-D5-Eb5-Bb4 | Cb5-Ab4-F4 = the b.1 subject (Db5-C5-Bb4-A4-Bb4-F4 | Gb4-Eb4-C4) in Eb minor (subdominant); b.56-69 = b.2-15 up a 4th (match ≥0.89 for b.57-69). The bar numbers line up with no offset at the start, but the encoding has 83 bars: b.82 F2 (V) → b.83 Bb2/D4/Bb4 final chord, so the reprise runs to b.83 — corrected: wtc2p22 section b.55-83 reprise
- wtc2p23 cadence b.12 F# — CONFIRMED — b.11:4-4.5 C#3/E#3 bass (V of F#) → b.12:1 F#3/F#2 with A#4/F#4: cadence in F#, followed by the scalar bass run F#2–G#3 in b.12
