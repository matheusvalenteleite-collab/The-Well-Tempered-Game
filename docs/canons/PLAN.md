# Knowing Bach's canons: the plan (CANON session)

The owner (12 October 2026), after the first prototype (`lab/canon/canon-at-the-octave.html`): "I'm very disappointed by
the quality of this generator's writing." This session becomes the CANON session, on the model of FUGUE, CHORALE and
INVENTIONS: first learn how Bach writes canons — the Art of Fugue, the Musical Offering, the Goldberg Variations,
BWV 1087 — then deploy what is learnt.

The rules shared by the study sessions (`docs/SESSIONS.md` on the FUGUE branch, D161) apply: knowledge first (literature,
then readings by hand under a protocol, then counts with examples, never a number alone); generation last, when the
owner says so; the owner decides what becomes a precept. Branch: `claude/interactive-canon-builder-p4n57s`. Proposed
areas owned: `docs/canons/`, `data/canons/`, `data/sources/bach-canons/`, `tools/canons/`, `lab/canon/`. Proposed
decision range: **K** (Kanon), starting at K1.

## Where we stand (12 October, end of the first block)

| | state |
|---|---|
| corpus | 29 pieces symbolic (`data/canons/corpus.json`): the Aria and the nine Goldberg canons (and Var. 30), the four Art of Fugue canons, the fourteen canons BWV 1087. The Musical Offering canons as Bach-Gesellschaft page images only (`data/sources/bach-canons/SOURCE.md`) |
| reading | a canon detector (`tools/canons/detect.py`, candidates in `CANDIDATES.md`) finds the interval each title names in all nine Goldberg canons and the four Art of Fugue canons; the reading by hand (`data/canons/readings.json`, protocol in `READING-PROTOCOL.md`) is settled for the Goldberg canons and the canon at the octave, open for the other three Art of Fugue canons (their second halves) and for the voice roles in BWV 1087 nos. 11-14 |
| first measurements | `HABITS-1.md`: consonance, dissonance treatment, rhythmic complementarity, sequence and melodic profile in 13 canonic sections; the same measured on the prototype |
| literature | `LITERATURE-REVIEW.md` (K0): 53 references in tiers 1-2, verified; none read yet; the owner chooses |

**The first result, and why it shapes the plan.** On local measures (share of consonances, imperfect consonances first,
dissonance treated as passing note or suspension, one voice moving while the other holds) the prototype's canons are
already inside Bach's range (HABITS-1, section 4). Two local differences only: its line is more stepwise and never leaps
a sixth or more, and 28% of its dissonances are passing or neighbour notes on the beat, against 4-16% in Bach (25% in
Var. 6). So what makes Bach's canons beautiful and the prototype's aimless is not at the level of the note-against-note
rules the prototype obeys. It must be looked for higher: harmony (the ground under the Goldberg canons; the harmony the
two voices imply alone in the Art of Fugue), cadences and phrase, motive and its working, sequence, register and climax,
and the large plan (the halves, the exchanged roles, the invertible restatements). K3-K5 measure those.

## The phases

| step | what | done when |
|---|---|---|
| K0 | **Literature review.** Studies of Bach's canons (Wolff on BWV 1087 and the Musical Offering; David; Kirkendale; Williams and Schulenberg on the Goldberg; Butler and others on the Art of Fugue), period theory (Marpurg, Kirnberger, Mattheson), the pedagogy of canon writing, computational canon generation. Every reference verified; the owner chooses what is read. | `LITERATURE-REVIEW.md`; rows proposed for the shared `docs/LITERATURE.md` |
| K1 | **Corpus.** Done for 29 pieces. **K1b:** the Musical Offering canons encoded by hand from the Bach-Gesellschaft's resolutions (Kirnberger's), as LilyPond read by the same tools; the encoding is checked by the canon itself (the follower must reproduce the leader under the rule the title gives). Optional, the owner's call: the small canons BWV 1072-1078 and 1086. | the Musical Offering canons in `corpus.json`, each one passing its own canon check |
| K2 | **Readings by hand** under `READING-PROTOCOL.md`: the Art of Fugue canons alla duodecima, alla decima and per augmentationem complete (where the invertible restatement starts, at which interval, which voice carries what); BWV 1087 nos. 1-14 (which voice states the ground, the pairs, the perpetual period); the Musical Offering canons. | `readings.json` complete; every row checked and the checks recorded |
| K3 | **Harmony.** The Goldberg canons against the ground as the literature states it (the 32 fundamental notes; the test in HABITS-1 section 3 is withdrawn); the harmony implied by the two voices alone (Art of Fugue, Goldberg 27): chord per beat or half bar, harmonic rhythm, the cadences and their keys. Shared readers from ANALYSIS CORE where they exist (cadence finder, fundamental bass), not forked. | a harmonic reading of every canon, measured against a hand reading of two of them |
| K4 | **Form, motive, sequence.** Where the canon lapses and why (the free cadences at the half and the end); the leader's motives and how often they return; sequence at the level of the pair (the two-voice pattern that repeats a step lower or higher, the engine of canons at a short lag); register and climax; how the lag relates to the length of the motive and of the harmonic unit. | HABITS-2 with examples for every count |
| K5 | **Technique by interval and transformation.** What each interval of imitation demands of the line and how Bach meets it (the canons at the second, seventh and ninth: syncopation and suspension; the sixth; contrary motion and its axis; augmentation); invertible counterpoint in the Art of Fugue canons; how one ground carries fourteen canons (BWV 1087). | a chapter per technique, each with Bach's examples |
| K6 | **Period theory as a check.** Marpurg's and Kirnberger's teaching of canon (the Bach-Gesellschaft's resolutions of the Musical Offering canons are Kirnberger's); what they say against what the counts show. | a table: claim, source, what the score shows |
| K7 | **From knowledge to precepts** (the owner's decision), then the generator's design: what the prototype must gain (a harmonic plan or ground, phrase and cadence, a motive and its working, sequence), in what order. Generation resumes only then, with the playback session's bench for judging. | the owner's list of precepts; a design note |

## Proposed row for docs/SESSIONS.md (for the owner, who decides whether CANON is one of the four active sessions)

| **CANON** | `claude/interactive-canon-builder-p4n57s` | `docs/canons/`, `data/canons/`, `data/sources/bach-canons/`, `tools/canons/`, `lab/canon/` | canon readings and a canon detector (any imitation at any interval, lag and transformation: usable for strettos and inventions); habits of canonic writing | the LilyPond reader from FUGUE (copied, not forked in place); readers from ANALYSIS CORE (cadences, harmony) |
