# Fux's precepts, species by species

What Fux states, where, and how the game encodes it. Pages are 1725 (verified in the scans)
unless marked "Mann". Game rule ids are in `src/counterpoint/rules/`. Decisions referred to
(D2, D10, D11, D24, ...) are in `docs/DECISIONS.md`.

## General precepts (stated in Liber I, recalled in first species)

The four rules of motion, recalled at p. 45 (Liber I is not among the scans): perfect to perfect
by contrary or oblique motion; perfect to imperfect by any motion; imperfect to perfect by
contrary or oblique motion; imperfect to imperfect by any motion. Game: `fs.perfect-approach`
and its successors. The rationale (hidden fifths and octaves revealed when the leap is filled in
by diminution) is shown at Figs. 7-8, pp. 49-50.

## Two voices, first species (pp. 45-55)

| Precept | Page | Game rule |
|---|---|---|
| Only consonances; all notes equal (whole notes) | 45 | `fs.vertical-consonance` |
| Use contrary and oblique motion as much as possible | 45 | `fs.prefer-contrary-motion` (warning) |
| More imperfect than perfect consonances, beginning and end excepted | 46 (Mann 28) | `fs.prefer-imperfect-consonances` (error, D24) |
| Begin and end on a perfect consonance | 46-47 | `fs.opening-perfect`, `fs.final-octave-or-unison` |
| With the counterpoint below, begin on the octave or unison (a fifth below puts it in another mode) | 48-49 | `fs.opening-perfect` (voicing-aware) |
| Penultimate bar: major sixth (cantus below), minor third (cantus above) | 47, 49 | `fs.cadence` |
| No melodic tritone (*mi contra fa*) | 51-52 | `fs.melodic-tritone` |
| Neighbouring clefs, so compound intervals are distinguishable | 52 | (notation; not a rule) |
| Crossing approved where it improves the leading | 52 | `fs.no-voice-crossing` (warning, D2) |
| No melodic major sixth; everything easy to sing | 53 | `fs.melodic-major-sixth` |
| The octave *battuta* is left to discretion | 53-54 | not checked |
| No leap into octave or unison from a remote consonance | 54 | `fs.converging-leap-into-octave` |
| Unison only at beginning and end, "in this species" | 53-54 | `fs.unison-only-at-ends` |
| No leap into or out of the unison | 54-55 | `fs.unison-leap` |
| *Fa* tends down, *mi* up: an accidental sharp may mark an ascent | 55 | not checked |

## Two voices, second species (pp. 56-63)

| Precept | Page | Game rule |
|---|---|---|
| Two minims against a semibreve; thesis = downbeat, arsis = upbeat | 56 | layout (`counterpoint/layout.ts`) |
| The thesis note is always consonant | 56 | `ss.downbeat-consonance` |
| The arsis note may be dissonant only by step, filling a third (diminution); after a skip it must be consonant | 56 | `ss.passing-dissonance` |
| The first-species precepts on motion and progression still hold (*Vel maximè*) | 56 | `ss.perfect-approach`, `ss.prefer-contrary-motion`, `ss.opening-perfect`, `ss.final-octave-or-unison`, `ss.melodic-tritone`, `ss.melodic-major-sixth`, `ss.converging-leap-into-octave`, `ss.no-voice-crossing` |
| Penultimate bar: fifth then major sixth (cantus below); fifth then minor third (cantus above) | 56-57 | `ss.cadence` |
| Where that fifth would be *mi contra fa*, a sixth | 60-61 | `ss.cadence` |
| A skip of a third does not hide two fifths or octaves between downbeats; a skip of a fourth, fifth or sixth does (the ear forgets the first note), and also licenses imperfect-to-perfect by direct motion between downbeats | 57-59 | `ss.downbeat-succession` |
| A half rest may replace the first note | 59 | layout (rest allowed in slot 0) |
| A leap of a minor sixth (upward) or an octave when the voices are too close | 59-60 | hint only |
| Look ahead to the following bars | 57, 62-63 | hint only |
| Ternary time: three notes against one; the middle note may be dissonant if all three move by step | 63 | not implemented (no exercise) |

Not carried into second species: `fs.unison-only-at-ends` (stated "in this species", p. 54),
`fs.prefer-imperfect-consonances` (a first-species precept, p. 46) and `fs.unison-leap`
(Fux's Figs. 36, 39, 41 and 42 leap from or to an upbeat unison). Fux's twelve solutions clear
every second-species rule; the only findings are the crossing warnings at Figs. 37 and 39.

## Two voices, third species (pp. 63-69)

Four crotchets against a semibreve. Of five crotchets moving by step: the first consonant, the
second may be dissonant, the third consonant, the fourth may be dissonant if the fifth is
consonant (pp. 63-64). Exception 1: when the second and fourth are consonant the third may be
dissonant (diminution of a skip of a third, p. 64). Exception 2: the *nota cambiata*: from a
dissonant second note a skip of a third to a consonance; strictly the skip belongs between the
first and second notes, but the authority of the masters is followed for the sake of the melody
(pp. 64-65). Penultimate bar: specific formulas for each voicing (pp. 65-66). Accidental flats
(and sharps) to avoid *mi contra fa* relations are not essential to the diatonic genus (pp. 68-69).

Implemented (D61) as `ts.downbeat-consonance`, `ts.dissonance` (passing by step in one direction, or
the cambiata: second quarter, a step down, then a skip of a third down to a consonance), `ts.cadence`
(the penultimate bar ends on the major sixth / minor third), and the carried first-species precepts
(`ts.opening-perfect`, `ts.final-octave-or-unison`, `ts.perfect-approach`, `ts.melodic-tritone`,
`ts.melodic-major-sixth`, `ts.converging-leap-into-octave`, `ts.unison-only-at-ends` on downbeats).
Fux's six solutions (Figs. 55-60) clear every rule.

## Two voices, fourth species (pp. 69-76)

Two minims tied over the bar, the first in arsis, the second in thesis: the ligature or syncope,
consonant or dissonant (pp. 69-70). The first note of a tie is always consonant (p. 69); a
dissonance on the thesis resolves down by step to the next consonance, the tie being a
retardation of the following note (p. 70). Cantus below: 2-1, 4-3, 7-6, 9-8; not unison to
second or octave to ninth, which hide consecutive unisons/octaves; third to second and tenth to
ninth are good (pp. 71-72). Cantus above: 2-3, 4-5, 9-10; the seventh resolving to the octave is
avoided on the authority of the classical authors, while the second resolving to the unison is
common (pp. 72-73). Ascending resolution: deferred; for now always descend (p. 73). Cadence:
7-6 (cantus below); 2-3 then the unison (cantus above) (pp. 73-74). A ligature in every bar
where possible, otherwise plain minims (p. 74); avoid repeating the same ligature pattern (p. 74).
Ornamented and broken ligatures, and two quavers on the second or fourth crotchet (never the
first or third), anticipate fifth species (p. 76).

Implemented (D61) as `fos.arsis-consonant` (an untied upbeat may pass by step, as in second species),
`fos.resolution`, `fos.ligature-kinds` (no 1-2 or 8-9 with the cantus below; no 7-8 with it above),
`fos.cadence`, `fos.ligature-where-possible` (D62: an untied bar counts only where a ligature was
possible, i.e. some singable upbeat consonant with its cantus note could have been held into a
consonance or a permitted, resolvable dissonance; such omissions are allowed as often as Fux makes
them in his solution to the exercise: once in Figs. 73 and 75, never in the other four, once in the
tasks without a solution), and the carried precepts as in third species. A tie is entered as the same note on both sides of the bar line. Fux's six solutions
(Figs. 73-78) clear every rule.

## Two voices, fifth species (pp. 76-81) — not implemented yet

Florid counterpoint: all the species combined, "like a garden full of flowers"; nothing new
except care for the melody (pp. 76-77). Praised: entering the downbeat by oblique motion or
syncopation (pp. 78-79). Counsel (not precept): two crotchets at the start of a bar with no
tie after them limp; tie them or continue in crotchets (pp. 80-81).

## Three and four voices — not implemented yet

See catalogue.md for the lesson-by-lesson content (Mann pp. 71-139). In summary: the complete
triad in root position in every bar where possible (three voices); doubling third, fifth and
octave, preferably the octave (four voices); motion rules strictly above the bass and as far as
possible between upper voices; the "natural order" of consonances (fifth low, third high); many
licences in the middle species justified by the restraint of the cantus.
