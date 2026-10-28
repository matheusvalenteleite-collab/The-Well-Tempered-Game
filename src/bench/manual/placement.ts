/**
 * D342, THE MANUAL's placement test (Probespiel; design section 3), offered to anyone who answers I PLAY
 * ANOTHER INSTRUMENT or I PLAY A KEYBOARD: four excerpts, one take each (and, if wanted, a second take of
 * the one that went worst), at the game's tempo with the 1.52 defaults (B+, lenient runs: the game's own
 * MECH), the sampled piano, no reading and no crowd. It runs on THE LAB's STUDY machinery: each take is a
 * full lab log (lab/log.ts LabRecorder, as a study take), kept in memory, never in the player's
 * settings; the lens (lens.ts) reads the take as it is played.
 *
 *   #  excerpt                               tests                          placed past, if …
 *   1  Invention 1, right hand, bars 1–3     pulse, line, repeats           Part I: right ≥ 90%, |mean| ≤ 50 ms, spread ≤ 60 ms
 *   2  Fugue II/18, soprano, bars 1–5        alternation, handover, prep.   Part II but II.6: right ≥ 85%, turns ≥ 70%
 *   3  Fugue II/12, soprano, bars 1–6        runs, repeated notes           II.6 and I.3: RUN ✓ on ≥ 2 runs, right ≥ 80%
 *   4  Fugue I/2, alto, bars 1–6, NONE       touch consistency, time        Parts III and IV opened: consistency ≥ 70%, right ≥ 85%
 */
import type { LabLog } from "../lab/log.ts";
import { STUDY_SOUND } from "../lab/study.ts";
import type { LensStats } from "./lens.ts";
import { lessonsOf, ZERO_LENS as ZERO, type Material, type PartId } from "./lessons.ts";

export interface PlacementExcerpt {
  id: string;
  m: Material;
  tests: string;
  /** The lessons placed past when it goes well, and the parts it opens. */
  lessons: string[];
  opens: PartId[];
  ok: (x: LensStats) => boolean;
  /** What it showed, in a line (English: tr). */
  showed: (x: LensStats) => { text: string; vars: Record<string, string | number> };
}

const ids = (p: PartId, but: string[] = []) => lessonsOf(p).map((l) => l.id).filter((id) => !but.includes(id));
const pc = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);

/** The placement's sound (the study's: the sampled piano). */
export const PLACEMENT_SOUND = STUDY_SOUND;

export const PLACEMENT: PlacementExcerpt[] = [
  {
    id: "p-pulse",
    m: { piece: "inv01", voice: 0, fromBar: 1, toBar: 3, tempo: { bpm: 60 }, label: "Invention 1, right hand, bars 1–3", badge: "IN GAME" },
    tests: "Pulse, line, repeats",
    lessons: ids("I"),
    opens: ["II"],
    ok: (x) => x.accuracy >= 0.9 && x.timing.n > 0 && Math.abs(x.timing.mean) <= 50 && x.timing.sd <= 60,
    showed: (x) => ({ text: "RIGHT {r}% · TIMING {m} MS ±{s}", vars: { r: Math.round(100 * x.accuracy), m: x.timing.mean > 0 ? `+${x.timing.mean}` : x.timing.mean, s: x.timing.sd } }),
  },
  {
    id: "p-thumbs",
    m: { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 5, tempo: { pct: 100 }, label: "Fugue II/18, soprano, bars 1–5", badge: "IN GAME" },
    tests: "Alternation, handover, preparation",
    lessons: ids("II", ["II.6"]),
    opens: [],
    ok: (x) => x.accuracy >= 0.85 && x.alternation.of > 0 && x.alternation.alt / x.alternation.of >= 0.7,
    showed: (x) => ({ text: "RIGHT {r}% · TURNS {t}% · JOINED {j}%", vars: { r: Math.round(100 * x.accuracy), t: pc(x.alternation.alt, x.alternation.of), j: pc(x.joins.ok, x.joins.of) } }),
  },
  {
    id: "p-runs",
    m: { piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, tempo: { pct: 100 }, label: "Fugue II/12, soprano, bars 1–6", badge: "IN GAME" },
    tests: "Runs, repeated notes",
    lessons: ["II.6", "I.3"],
    opens: [],
    ok: (x) => x.runs.ok >= 2 && x.accuracy >= 0.8,
    showed: (x) => ({ text: "RIGHT {r}% · RUN ✓ {n} OF {m} · REPEATS {p} OF {q}", vars: { r: Math.round(100 * x.accuracy), n: x.runs.ok, m: x.runs.of, p: x.repeats.ok, q: x.repeats.of } }),
  },
  {
    id: "p-touch",
    m: { piece: "wtc1f02", voice: 1, fromBar: 1, toBar: 6, tempo: { bpm: 70 }, label: "Fugue I/2, alto, bars 1–6, your own articulation", badge: "IN GAME" },
    tests: "Touch consistency, time",
    lessons: [],
    opens: ["III", "IV"],
    ok: (x) => x.accuracy >= 0.85 && x.touch.of > 0 && x.touch.ok / x.touch.of >= 0.7,
    showed: (x) => ({ text: "RIGHT {r}% · TOUCH {t} {c}% CONSISTENT", vars: { r: Math.round(100 * x.accuracy), t: x.touch.style ?? "—", c: pc(x.touch.ok, x.touch.of) } }),
  },
];

/** One take of the test: its figures and its log. */
export interface PlacementTake {
  id: string;
  x: LensStats;
  log?: LabLog;
}

export interface Placement {
  /** The lessons placed past (TESTED) and the parts opened. */
  lessons: string[];
  opened: PartId[];
  /** Per excerpt: passed, its share right. */
  results: { id: string; right: number; ok: boolean }[];
  /** The lesson Herr Bach would begin with (null: none left in Phase A), and the line he says. */
  start: string | null;
  line: { text: string; vars?: Record<string, string | number> };
}

/** The verdict from the takes (the best take of each excerpt counts, where it was played twice). */
export function place(takes: PlacementTake[]): Placement {
  const best = new Map<string, LensStats>();
  for (const t of takes) {
    const b = best.get(t.id);
    if (!b || t.x.accuracy > b.accuracy) best.set(t.id, t.x);
  }
  const results = PLACEMENT.map((e) => {
    const x = best.get(e.id);
    return { id: e.id, right: x ? Math.round(1000 * x.accuracy) / 1000 : 0, ok: !!x && e.ok(x) };
  });
  const passed = PLACEMENT.filter((_, k) => results[k].ok);
  const lessons = [...new Set(passed.flatMap((e) => e.lessons))];
  const opened = [...new Set(passed.flatMap((e) => e.opens))];
  // Part II opens with Part I placed past (its checkpoint TESTED); III and IV with the fourth.
  // D360: Parts III and IV are built: past Parts I and II the placement seats a player at III.1.
  const order = [...lessonsOf("I"), ...lessonsOf("II"), ...lessonsOf("III")].map((l) => l.id);
  const start = order.find((id) => !lessons.includes(id)) ?? null;
  const p1 = results[0].ok;
  const line = !start || start === "III.1"
    ? { text: opened.includes("III") ? "Begin with Part III; your hands know the rest." : "Your hands know Parts I and II. Begin with Part III, on touch." }
    : !p1
      ? { text: "Begin at the beginning, with Part I: the time first, then the rest." }
      : start.startsWith("II")
        ? { text: "Begin with lesson {l}; your hands know what comes before it.", vars: { l: start } }
        : { text: "Begin with lesson {l}; the rest of Part I you have.", vars: { l: start } };
  return { lessons, opened, results, start, line };
}

/** The excerpt that went worst (by the share right), for the optional second take. */
export function worst(takes: PlacementTake[]): string | null {
  const firsts = PLACEMENT.map((e) => takes.find((t) => t.id === e.id)).filter((t): t is PlacementTake => !!t);
  if (!firsts.length) return null;
  return firsts.reduce((a, b) => (b.x.accuracy < a.x.accuracy ? b : a)).id;
}

/** The placement's texts (for the translations' check). */
export function placementTexts(): string[] {
  const out = PLACEMENT.flatMap((e) => [e.m.label, e.tests]);
  for (const e of PLACEMENT) out.push(e.showed({ ...ZERO }).text);
  out.push(
    "Begin with Part III; your hands know the rest.",
    "Your hands know Parts I and II. Begin with Part III, on touch.",
    "Begin at the beginning, with Part I: the time first, then the rest.",
    "Begin with lesson {l}; your hands know what comes before it.",
    "Begin with lesson {l}; the rest of Part I you have.",
  );
  return out;
}
