# M1 report: interval arithmetic, rule engine (fux-strict), golden tests, cantus-firmus measurements

The numbers below are reproduced by `node tools/m1/report.ts`, which writes them to
`docs/m1/m1-measurements.md`. The tests in `test/m1-golden.test.ts` lock them.

## 0. Dependency check

The ingestion is complete. Rebuilding the dataset produces a byte-identical file. The validator
passes 2,173 of 2,173 checks with 0 errors. The game code reads only
`data/fux/two-voice/fux-two-voice.json` through `FuxRepository`; nothing parses MusicXML at runtime.

**Level 1 filter (first species, final C, cantus below): 0 exercises.** In Part I the C cantus
firmus occurs only in second species (Figs. 44, 45) and fifth species (Figs. 88a, 88b; the
shorter variant). Fux writes no first-species exercise on C. Level 1 therefore has no canonical
exercise in the strict sense (see decision D1).

## 1. What the 1725 text attests

The upstream repository ships page scans of the 1725 print for every page that carries an
example. I read the whole of Exercitii I, Lectio I (printed pp. 45 and 47–55) and the opening of
Lectio II (p. 56). Printed p. 46 has no example and is not among the scans. Liber I, where Fux
formally states the rules of motion that Lectio I refers back to ("in fine praecedentis Libri
expressâ", p. 45), is not among them either. I paraphrase below; the short Latin phrases quoted
are as printed.

| claim | 1725 | status |
|---|---|---|
| First species uses consonances only ("meris Consonantiis constans") | p. 45 | verified |
| Use contrary or oblique motion "ut plurimum" | p. 45 | verified (warning) |
| Begin on a perfect consonance; end on a perfect consonance | pp. 47, 48 | verified |
| With the cantus above, an opening fifth below is wrong because it lies outside the mode; the octave is substituted | pp. 48–49 | verified |
| Penultimate major sixth "because the cantus firmus is in the lower part"; minor third when the cantus is above | pp. 47, 49 (again in Lectio II, p. 56) | verified |
| Imperfect to perfect only by contrary motion, justified by the hidden fifths that diminution would reveal; the same for octave to fifth | pp. 49–50 | verified |
| The melodic tritone ("mi contra fa est diabolus in Musica") may not be used in counterpoint | pp. 51–52 | verified |
| **Voice crossing in Fig. 14 is approved** ("Optimâ observantiâ id fecisti") | p. 52 | **contradicts** the rule "no voice crossing" |
| The leap of a major sixth is forbidden | p. 53 | verified |
| The unison is never used except at the beginning and the end | pp. 53–54 | verified |
| The "octava battuta" is left to free choice | pp. 53–54 | not a rule |
| Converging into the octave or unison by leap from a remote consonance: "malè" | p. 54 | attested; not in your list |
| Leaping out of the unison (Fig. 23) is "malè", tolerated there only because the leap lies in the cantus | p. 54 | attested; not in your list |
| The raised leading note: why the sharp is added at the cadence | p. 55 | verified (concerns modes other than C) |
| The descending minor sixth is forbidden and the ascending one allowed; sevenths are forbidden; nothing exceeds the octave; imperfect consonances are to be preferred; successions of leaps are to be avoided | — | **not found** on pp. 45, 47–55 |

Each rule's metadata records its `attribution.status` (verified / unverified / contradicted), its
page reference, and any pending decision. The full table is in `m1-measurements.md`.

## 2. Golden tests

**Fux's ten first-species solutions under fux-strict.** One hard-rule failure: Fig. 14 breaks
`fs.no-voice-crossing` at notes 4–7. That is exactly the passage Aloysius praises on p. 52. I
have changed neither the data nor the rule (decision D2).

**The cadence and opening rules for the cantus above.** You stated these rules for the cantus
below, so they are not applied when the cantus is above. If they were, all five cantus-above
solutions would fail the cadence rule with m3 → P1. That is Fux's own prescription on p. 49, so it
confirms that those rules belong to the cantus-below arrangement. Level 1b will need the
mirrored rules: an opening on P1/P8 only, and a cadence of m3 to P8/P1.

**Warnings on Fux's own solutions.** `fs.prefer-contrary-motion` and
`fs.prefer-imperfect-consonances` never fire. `fs.avoid-successive-leaps`, as I provisionally
operationalized it (any two consecutive leaps), fires 12 times in 7 of the 10 solutions. Fux
himself would therefore lose stars. If the rule counts only same-direction leaps, it fires only
in Fig. 6 (m3 up then P5 up) and Fig. 21 (P5 up then M3 up; m3 down then m3 down). Decision D4.

**The superseded published reading of Fig. 22 fails three hard rules:** a vertical P4 at bar 8,
a melodic M7, and voice crossing. This independently supports the corrected kern reading that the
dataset uses.

**Engine intervals against the source annotations:** 1,111 of 1,111 agree. Quality is computed
from diatonic size plus semitones, and the unit tests include enharmonic cases (d4 against M3,
A2 against m3, A4 against d5).

**Widest distance between the voices in Fux's first species: a major tenth.** It occurs in
Figs. 6, 12, 21 and 23 (cantus above) and Fig. 13 (cantus below, F3–A4 at bar 7). With the
cantus below, Fux never exceeds the tenth. This bears on the undecided limit in
modern-additions: Fux's practice suggests a tenth.

**Melodic leaps in all 46 counterpoints (293 leaps).** There is no major sixth, no seventh,
nothing beyond the octave, and no augmented or diminished interval anywhere. **The descending
minor sixth occurs four times:** Fig. 41 bar 12, G3 → B2 (species 2); Fig. 42 bar 9, C5 → E4
(species 2); Fig. 57 bar 4, C5 → E4 (species 3); Fig. 75 bar 4, C5 → E4 (species 4). In first
species Fux uses only the ascending minor sixth, once, in Fig. 22. As you asked, I treat these
cases as evidence that the rule as stated may be mis-stated, at least beyond first species, and
not as errors by Fux. Decision D3.

## 3. Fux's cantus firmi: measurements

The analysis covers the six principal CFs (D E F G A C) plus the two variants (A, Fig. 42; C, Figs. 88a/b).

| | D | E | F | G | A | C |
|---|---|---|---|---|---|---|
| length (notes) | 11 | 10 | 12 | 14 | 12 | 12 |
| range | P5 | P8 | m7 | P8 | m6 | M6 |
| leaps / intervals | 3/10 | 4/9 | 5/11 | 8/13 | 3/11 | 4/11 |
| high point (single?) | A4, note 7 of 11 (yes) | A4, 6 of 10 (yes) | C4, 8 of 12 (yes) | G4, 8 of 14 (yes) | F4, 7 of 12 (yes) | A4, 6 of 12 (yes) |
| lowest note | final | 4th below final | 3rd below final | final | final | final |
| approach to final | −M2 | −m2 | −M2 | −M2 | −M2 | −M2 |
| repeated notes | 0 | 0 | 0 | 0 | 0 | 0 |

The intervals used, with direction, are:

- **Steps:** m2 and M2 in both directions.
- **Ascending leaps:** m3, M3, P4 (D, G ×3, C), P5 (F only), P8 (E only).
- **Descending leaps:** only m3 and M3, in all six. There is no descending fourth, fifth or octave.
- **Never used:** sixths, sevenths, tritones, augmented or diminished intervals.

How leaps continue:

- After an ascending fourth or larger, the melody turns down in 6 of 7 cases. The exception is
  G, where +P4 is followed by +M3.
- After the P5 (F) and the P8 (E), the melody always turns.
- Two leaps in the same direction occur only in F and G, and always outline a triad:
  - F: A3–F3–D3 and C4–A3–F3;
  - G: G3–C4–E4 and G4–E4–C4.

High point and frame:

- There is exactly one high point in all eight melodies.
- It falls between 45% and 64% of the way through (index ÷ (length − 1)).
- Every CF begins and ends on the final.

## 4. Proposed generator constraints (for your approval; nothing is implemented)

The bracket gives the support in Fux's six principal CFs. For Ionian specifically, the only
models are `fux_cf_c_01` and `fux_cf_c_02`.

1. Begin and end on the final (C) [6/6].
2. Approach the final by a descending step from the second degree (D → C) [6/6].
3. Length 10–14 notes [6/6]. The C variant has 9 notes; whether 9 should be allowed is your call.
4. Range between a fifth and an octave [6/6]. For Ionian, both C models stay within C4–A4 (range
   M6 or P5).
5. No note below the final in Ionian [C: 2/2; overall 4/6. E and F descend below the final].
6. No repeated notes [6/6].
7. Steps m2/M2 in either direction [6/6].
8. Ascending leaps of m3, M3 or P4 [6/6, P4 in 3/6]. Ascending P5 [1/6] and P8 [1/6] only if you
   want them.
9. Descending leaps of thirds only [6/6].
10. No sixths, sevenths, tritones, augmented or diminished intervals, melodic or outlined by
    successive leaps [6/6].
11. After an ascending leap of a fourth or more, change direction [6 of 7 cases; G is the exception].
12. At most two consecutive leaps in the same direction, and only if together they outline a
    triad [2/6: F, G].
13. Exactly one highest note, at 40–65% of the length [6/6].
14. Leaps make up between about 25% and 60% of the intervals [6/6 span 27%–62%].
15. Every generated CF must admit at least one counterpoint under the active hard rules (the solver).

These measurements describe six melodies. Constraints 3, 4, 13 and 14 are bands fitted to a tiny
sample, and constraints 5, 8 (P5/P8) and 12 rest on fewer than six. **I stop here until you
approve, amend or reject them.**

## 5. Decisions needed

- **D0. Reading of the four corrected figures (carried over from the ingestion task).** The
  dataset uses the kern version of record. The golden test above (Fig. 22) strengthens the case.
  Please confirm.
- **D1. Level 1 canonical content.** Fux has no first-species exercise on C. The options are:
  - (a) Level 1 is generated content only;
  - (b) additionally offer Fux's own C cantus firmi (`fux_cf_c_01`, `fux_cf_c_02`) as "Fux's cantus,
    your counterpoint", with no original solution, since Fux wrote none in first species;
  - (c) admit Fux's first-species exercises on other finals into Level 1. This changes your scope.
- **D2. Voice crossing.** Fux approves it (p. 52). Should Level 1 keep `fs.no-voice-crossing` as an
  error, make it a warning, or drop it from fux-strict (perhaps moving it to modern-additions)?
- **D3. Melodic sixths.** Only the M6 ban is attested in the text I could read. Fux leaps a
  descending m6 four times in species 2–4, and never in species 1. Keep the descending-m6 ban for
  first species, or drop it?
- **D4. Warnings: operationalization and attribution.** Contrary motion is attested (p. 45). The
  preference for imperfect consonances and the avoidance of successive leaps are not found in the
  available pages. Options:
  - keep them, marked "attribution unverified";
  - move them to modern-additions;
  - drop them.

  For successive leaps, choose between same-direction only and any direction (the latter penalizes
  Fux in 7 of 10 solutions).
- **D5. Rules Fux states that are not in your list** (p. 54): no leap into the octave or unison by
  converging motion from a remote consonance, and no leap out of or into the unison. Add them to
  fux-strict?
- **D6.** The severity of `fs.ionian-no-accidentals`: error or warning.
- **D7.** Whether opening on a compound perfect consonance (P12, P15) is acceptable. It is
  currently accepted, as a perfect consonance.
- **D8.** Generator constraints 1–15 above.
