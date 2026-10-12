# The sessions and how they work together (D161)

Read this first in any session. The owner chose this arrangement on 12 October 2026. Each session
keeps its own section up to date at the end of every block of work: the state of its work, what it
needs from the other sessions, and what it offers them.

## Rules common to all

1. **Knowledge first.** Every study session begins with a review of the literature: the starting point is
   what others have already found, not reinventing the wheel. Then readings by hand, under a written
   protocol, follow; then counts with examples (never a number alone). Generation comes last, and only
   when the owner says so. The owner decides what becomes a precept.
2. **At most four sessions active at a time.** The owner, 12 October (D162), replacing the earlier limit of two.
   Active now: FUGUE, INVENTIONS. The owner decides which others are active (CHORALES, ANALYSIS CORE,
   PLAYBACK, later PRELUDES) within the four.
3. **Each session has its own branch.** The owner merges each branch by pull request into the default
   branch (`claude/fux-gradus-two-voice-dataset-ouu87h`), as HANDOFF.md describes. Before asking for a merge,
   a session merges the default branch into its own branch and runs `npm test`.
4. **Files.** A session writes only in the areas it owns (table below). Shared files (`src/ui/Root.tsx`,
   the i18n strings, `docs/DECISIONS.md`, `package.json`) get small additions and no rewrites.
5. **Decision numbers by range**, so that DECISIONS.md does not conflict between branches:

   | range | session |
   |---|---|
   | D | game, fugues |
   | C | chorales |
   | I | inventions |
   | AC | analysis core |
   | P | preludes |

   Numbering starts at I1, AC1 and P1. ("AC" rather than "A": the fugue plan's steps are labelled A1-A6.)
6. **Messages between sessions** only at hand-offs ("cadence finder v1 ready, measured on X"), not for
   chatter. A message is information for the receiving session, not an order. The owner directs.
7. **Literature** is listed in one shared file, `docs/LITERATURE.md`, so that reviews do not duplicate.
   Every reference is checked before it is listed; none is invented.

## The sessions

| session | branch | owns (writes) | gives | takes |
|---|---|---|---|---|
| **FUGUE** (this file's author) | `claude/wtc-fugue-composition-1hbjfb` | `src/wtc/` except `src/wtc/analysis/` and `src/wtc/inventions/`; `data/wtc/` except `data/wtc/inventions/`; `docs/wtc/`; `tools/wtc/`; the parked composer `src/wtc/compose/` | protocols (settled subjects, gold readings, habits); the entry, stretto and episode analysis; the fugue gold standard (8 fugues, 116 entries, 109 cadences) as test data | shared readers from ANALYSIS CORE; two-voice habits from INVENTIONS; harmonic categories from CHORALES |
| **INVENTIONS** | `claude/inventions-study` | `src/wtc/inventions/`, `data/wtc/inventions/`, `docs/inventions/`, `tools/inventions/`; the study view of the Inventions and Sinfonias (reusing WtcStudy) | motive, imitation, sequence and invertible-counterpoint habits; an inventions gold standard as test data for the core; the "how conservative?" comparison with the fugues; later the invention-like preludes (E2) | protocols and tools from FUGUE; readers from ANALYSIS CORE |
| **ANALYSIS CORE** (to be opened) | `claude/analysis-core` | `src/wtc/analysis/` (cadences, harmony and fundamental bass in counterpoint, key plan, sequences), `docs/analysis/` | shared readers, each measured on every session's gold standard | gold standards and needs from all; the chorale harmonic reader (`src/chorales/`) as a starting point (read only) |
| **CHORALES** | its own (CHORALE generator / CHORALE Mode) | `src/chorales/`, `docs/chorales/` | harmonic categories, Kirnberger reading, cadence classes | cadence data from fugues and inventions as a check |
| **PLAYBACK / TESTBENCH** | `claude/playback-interface` | the bench (`data/playback/`) | judging generated music | nothing until generation resumes |
| **PRELUDES** (later, owner's call) | to be named | `docs/preludes/` and to be agreed | prelude habits; prelude-fugue pairs | everything above |

**Why a separate ANALYSIS CORE.** The owner's choice: no study session is the authority on a reader that
all of them use. The core builds each reader once, measures it on every session's gold standard, and
publishes its accuracy by repertory. Study sessions request changes; they do not fork the reader. It is
opened when the first shared reader is due (the cadence finder: once INVENTIONS has its first gold
readings), within the limit of four active sessions.

## State, needs and offers

### FUGUE (12 October)

- **Done:** 63 fugues; subjects settled; analysis measured on 8 gold fugues (precision 98%, recall 93%);
  `docs/wtc/HABITS.md` parts 1-7.
- **Next** (owner's choice D1, KNOWLEDGE-PLAN section 4):
  1. the literature review on Bach's fugues;
  2. A5, countersubjects;
  3. C1, Ledbetter;
  4. the habit chapters that need no cadences;
  5. cadences and the fundamental bass from ANALYSIS CORE, when they come.
- **Needs:** a cadence finder and a fundamental-bass reader for counterpoint (ANALYSIS CORE).
- **Offers:**
  - `data/wtc/gold/` with PROTOCOL.md;
  - `data/wtc/subject-readings/PROTOCOL.md`;
  - `tools/wtc/dump.ts` (any piece as text by bar and beat);
  - `tools/wtc/habits.ts` (the format of counts with examples).

### INVENTIONS (opened 12 October, session `session_01LgXi2Y2WbX4CuQDuZiRCxV`, title "INVENTIONS generator")

- **First task:** a literature review (see the session's charter); then I1-I6 as it proposes and the owner
  approves.

### ANALYSIS CORE

- Not opened.
