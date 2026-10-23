/**
 * D224, the FEATS: twenty achievements across all play, beside the fugues' seals (seals.ts) and best
 * grades (cards.ts). Each is judged at the end of a run (lessons apart) by a pure function of that
 * run's results and what this device has kept (the feats already earned, the fugues played whole, the
 * best grades and the seals), and kept with the day it was earned (tb-feats-v1). Each has a pixel
 * glyph (7×7, drawn by Achievements.tsx) in place of an emoji.
 */
import { CARDS, cardById, type Best } from "./cards.ts";
import { fugueById } from "../touch/fugue.ts";
import type { ArtStats } from "./articulation.ts";

/** CON FUOCO's run (proto-game.ts FUOCO_NOTES; kept equal there by a test). */
export const FUOCO_RUN = 24;

export type FeatId =
  | "first-note" | "first-fugue" | "clean" | "first-s" | "five-a" | "pleno" | "fuoco" | "legato" | "held" | "entries"
  | "stretto" | "triple" | "thomaskantor" | "kimiko" | "temperament" | "first-seal" | "ten-seals" | "every-voice" | "book-i" | "keys";

export interface Feat {
  id: FeatId;
  name: string;
  line: string;
  /** 7 rows of 7: "#" lit. */
  glyph: string[];
}

/** The run, as the result screen has it. */
export interface RunFeat {
  piece: string;
  /** The mode (protos.ts id). */
  mode: string;
  /** Played from the first bar to the last (the crowd stayed). */
  whole: boolean;
  failedBar: number | null;
  grade: string;
  right: number;
  of: number;
  wrong: number;
  missed: number;
  captured: number;
  entries: number;
  maxStreak: number;
  art?: ArtStats;
  /** SUBJECT's strettos cleared. */
  strettos: number;
  her: boolean;
  /** The tuning sounding (WITH KIMIKO: equal). */
  tuning: string;
}

export interface FeatStore {
  /** Each feat earned: the day (YYYY-MM-DD). */
  earned: Partial<Record<FeatId, string>>;
  /** The fugues played whole (from the first bar to the last). */
  done: string[];
}

export interface History {
  store: FeatStore;
  best: Best;
  seals: Record<string, true>;
}

const TRIPLE = ["wtc1f04", "wtc2f14", "bwv1080-14"];

export const FEATS: Feat[] = [
  { id: "first-note", name: "FIRST NOTE", line: "Strike a note right.", glyph: ["...#...", "...##..", "...#.#.", "...#...", ".###...", "####...", ".##...."] },
  { id: "first-fugue", name: "FIRST FUGUE", line: "Play a fugue from the first bar to the last.", glyph: ["#......", "##.....", "#.#....", "#..#...", "#.#....", "##.....", "#......"] },
  { id: "clean", name: "NOT A SLIP", line: "A whole fugue with no note wrong or missed.", glyph: [".......", "......#", ".....#.", "#...#..", ".#.#...", "..#....", "......."] },
  { id: "first-s", name: "GRADE S", line: "Earn an S.", glyph: [".#####.", "##...##", "##.....", ".#####.", ".....##", "##...##", ".#####."] },
  { id: "five-a", name: "FIVE AT A", line: "Grade A or better in five fugues.", glyph: ["..###..", ".##.##.", "##...##", "##...##", "#######", "##...##", "##...##"] },
  { id: "pleno", name: "ORGANO PLENO", line: "Capture an entry: the organ answers full.", glyph: ["...#...", "..###..", "#.###.#", "#.###.#", "###.###", "###.###", "#######"] },
  { id: "fuoco", name: "CON FUOCO", line: `${FUOCO_RUN} notes right in a row.`, glyph: ["...#...", "..##...", "..###.#", ".#####.", "##.####", "##..###", ".#####."] },
  { id: "legato", name: "LEGATO CHAIN", line: "Twenty notes joined legato in a chain.", glyph: [".......", "##.##.#", "#.#.#.#", "#.#.#.#", "##.##.#", ".......", "......."] },
  { id: "held", name: "EVERY NOTE ITS LENGTH", line: "A whole fugue, every note held its length (20 or more).", glyph: ["#######", "#.....#", ".#...#.", "..#.#..", ".#...#.", "#..#..#", "#######"] },
  { id: "entries", name: "ENTRY TO ENTRY", line: "A whole fugue, every entry captured.", glyph: ["...#...", "..#.#..", ".#...#.", "#..#..#", ".#...#.", "..#.#..", "...#..."] },
  { id: "stretto", name: "STRETTO CLEARED", line: "Clear a stretto in SUBJECT.", glyph: ["#####..", ".......", "..#####", ".......", "#####..", ".......", "..#####"] },
  { id: "triple", name: "THREE SUBJECTS", line: "Every entry captured, whole, in I/4, II/14 or XIV.", glyph: ["#.#.#..", "#.#.#..", "#.#.#..", "#.#.#..", "#####..", "..#....", "..#...."] },
  { id: "thomaskantor", name: "THOMASKANTOR", line: "Play a five-star fugue from first bar to last.", glyph: ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "##...##"] },
  { id: "kimiko", name: "WITH KIMIKO", line: "Play to the end with Kimiko Ishizaka.", glyph: ["..###..", ".#...#.", ".#...#.", "..###..", ".#####.", "#######", "#######"] },
  { id: "temperament", name: "WELL TEMPERED", line: "Play to the end in a historical tuning.", glyph: ["...#...", "..###..", "..#.#..", "..#.#..", ".##.##.", "##...##", "#######"] },
  { id: "first-seal", name: "FIRST SEAL", line: "Earn a fugue's seal.", glyph: [".#####.", "##...##", "#..#..#", "#.###.#", "#..#..#", "##...##", ".#####."] },
  { id: "ten-seals", name: "TEN SEALS", line: "Earn the seals of ten fugues.", glyph: ["#..###.", "#.#...#", "#.#...#", "#.#...#", "#.#...#", "#.#...#", "#..###."] },
  { id: "every-voice", name: "EVERY VOICE", line: "Finish every voice of one fugue.", glyph: ["#######", ".......", "#######", ".......", "#######", ".......", "#######"] },
  { id: "book-i", name: "BOOK I", line: "Play all 24 fugues of Book I, first bar to last.", glyph: ["..#.#..", "#####..", "#...#..", "#.#.#..", "#.#.#..", "#...#..", "#####.."] },
  { id: "keys", name: "ALL 24 KEYS", line: "A fugue whole in each of the 24 keys (either book).", glyph: ["#######", "#.#.#.#", "#.#.#.#", "#.#.#.#", "#.#.#.#", "#######", "......."] },
];

const good = (g: string | undefined) => g === "S" || g === "A";
const pad = (n: number) => String(n).padStart(2, "0");

/** The best grade a fugue has (any voice), and the voice. */
export function bestOf(best: Best, piece: string): { grade: string; voice: number; voices: number } | null {
  const order = ["S", "A", "B", "C", "D"];
  let top: { grade: string; voice: number } | null = null;
  let voices = 0;
  for (const [k, g] of Object.entries(best)) {
    const [p, v] = k.split(":");
    if (p !== piece || !order.includes(g)) continue;
    voices++;
    if (!top || order.indexOf(g) < order.indexOf(top.grade)) top = { grade: g, voice: Number(v) };
  }
  return top ? { ...top, voices } : null;
}

/** Whether each feat holds after this run (the store already holding this run's fugue if whole). */
function holds(id: FeatId, r: RunFeat, h: History): boolean {
  const done = new Set(h.store.done);
  const sealed = new Set(Object.keys(h.seals).map((k) => k.split(":")[0]));
  switch (id) {
    case "first-note": return r.right > 0;
    case "first-fugue": return r.whole;
    case "clean": return r.whole && r.of > 0 && r.wrong + r.missed === 0;
    case "first-s": return r.failedBar === null && r.grade === "S";
    case "five-a": {
      const pieces = new Set(CARDS.map((c) => c.id).filter((p) => good(bestOf(h.best, p)?.grade)));
      if (r.failedBar === null && good(r.grade)) pieces.add(r.piece);
      return pieces.size >= 5;
    }
    case "pleno": return r.captured > 0;
    case "fuoco": return r.maxStreak >= FUOCO_RUN;
    case "legato": return (r.art?.chain ?? 0) >= 20;
    case "held": return r.whole && !!r.art && r.art.heldOf >= 20 && r.art.held === r.art.heldOf;
    case "entries": return r.whole && r.entries > 0 && r.captured === r.entries;
    case "stretto": return r.strettos > 0;
    case "triple": return TRIPLE.includes(r.piece) && r.whole && r.entries > 0 && r.captured === r.entries;
    case "thomaskantor": return r.whole && cardById(r.piece)?.stars === 5;
    case "kimiko": return r.her && r.failedBar === null;
    case "temperament": return !r.her && r.failedBar === null && r.tuning !== "equal";
    case "first-seal": return sealed.size >= 1;
    case "ten-seals": return sealed.size >= 10;
    case "every-voice":
      return CARDS.some((c) => {
        const n = fugueById(c.id).voices.length;
        return n > 0 && Array.from({ length: n }, (_, v) => h.best[`${c.id}:${v}`]).every(Boolean);
      });
    case "book-i": return Array.from({ length: 24 }, (_, i) => `wtc1f${pad(i + 1)}`).every((p) => done.has(p));
    case "keys": return Array.from({ length: 24 }, (_, i) => pad(i + 1)).every((n) => done.has(`wtc1f${n}`) || done.has(`wtc2f${n}`));
  }
}

/** The feats after a run: the store updated (the fugue played whole, the feats newly earned dated `day`), and those new. */
export function evaluateFeats(r: RunFeat, h: History, day: string): { store: FeatStore; fresh: FeatId[] } {
  const done = r.whole && !h.store.done.includes(r.piece) ? [...h.store.done, r.piece] : h.store.done;
  const store: FeatStore = { earned: { ...h.store.earned }, done };
  const fresh: FeatId[] = [];
  for (const f of FEATS) {
    if (store.earned[f.id] || !holds(f.id, r, { ...h, store })) continue;
    store.earned[f.id] = day;
    fresh.push(f.id);
  }
  return { store, fresh };
}

export const FEATS_KEY = "tb-feats-v1";

export function readFeats(): FeatStore {
  try {
    const v = localStorage.getItem(FEATS_KEY);
    const o = (v ? JSON.parse(v) : null) as Partial<FeatStore> | null;
    return {
      earned: o && typeof o.earned === "object" && o.earned ? o.earned : {},
      done: o && Array.isArray(o.done) ? o.done.filter((p): p is string => typeof p === "string") : [],
    };
  } catch {
    return { earned: {}, done: [] };
  }
}

export function writeFeats(s: FeatStore): void {
  try {
    localStorage.setItem(FEATS_KEY, JSON.stringify(s));
  } catch {
    /* not kept */
  }
}

/** The day in the player's own calendar. */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** At the end of a run (after the best grade and the seal are recorded): the feats judged and kept; the new ones returned. */
export function earnFeats(r: RunFeat, best: Best, seals: Record<string, true>): FeatId[] {
  const { store, fresh } = evaluateFeats(r, { store: readFeats(), best, seals }, today());
  writeFeats(store);
  return fresh;
}

export const featById = (id: FeatId) => FEATS.find((f) => f.id === id)!;
