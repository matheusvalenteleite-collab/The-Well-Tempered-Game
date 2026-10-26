/**
 * D232, the progression (the owner: "the fugues are the most important thing in the game; if a prelude
 * is 'hard', it will be made easy because its mechanics will be tailored towards the difficulty of the
 * fugue"). Book I's 24 pairs fall into four tiers by their FUGUE's stars (D222): EASY (★–★★), open
 * from the start; INTERMEDIATE (★★★), after five EASY fugues beaten; HARD (★★★★–★★★★★), after four
 * INTERMEDIATE fugues beaten; BOSS, I/24 alone (whatever its stars), after the other 23 fugues. Each
 * prelude is tuned to its tier: the quick notes ride (D229) from a threshold set per tier, so a prelude
 * is never harder than its tier (EASY about 4 struck notes a second at most off the strong places,
 * INTERMEDIATE 5, HARD and BOSS 6).
 *
 * A leaf module (cards.ts only), so the game (proto-game.ts) and the stages (stages.ts) both read it.
 */
import { beatOf, inBar, type TouchFugue } from "../touch/fugue.ts";
import { laneNotes, preludeRides } from "../touch/lanes.ts";
import { standardTempo } from "../touch/tempi.ts";
import { bookCards, cardById, type FugueCard } from "./cards.ts";

export type Tier = "EASY" | "INTERMEDIATE" | "HARD" | "BOSS";
export const TIER_ORDER: readonly Tier[] = ["EASY", "INTERMEDIATE", "HARD", "BOSS"];

/** The boss: I/24, prelude and fugue (its stars aside). */
export const BOSS = "wtc1f24";

/** "wtc1p05" or "wtc1f05" → "wtc1f05". */
const fugueId = (id: string) => id.replace(/^wtc1p/, "wtc1f");

/** A Book I piece's tier (a prelude's is its fugue's), from the fugue's stars; null outside Book I. */
export function tierOf(id: string): Tier | null {
  const f = fugueId(id);
  // D275: Book II's fugues too (play.html's list), by their stars; the BOSS is Book I's.
  if (!/^wtc[12]f\d\d$/.test(f)) return null;
  if (f === BOSS) return "BOSS";
  const s = cardById(f)?.stars ?? 1;
  return s <= 2 ? "EASY" : s === 3 ? "INTERMEDIATE" : "HARD";
}

/** A tier's fugues, in Bach's order. */
export const tierFugues = (t: Tier): string[] => bookCards(1).filter((c) => tierOf(c.id) === t).map((c) => c.id);

/** Book I's cards as the wheel lists them: by tier, then in Bach's order within a tier. */
export const tierCards = (): FugueCard[] => TIER_ORDER.flatMap((t) => tierFugues(t).map((id) => cardById(id)!));

/** What opens a tier: so many fugues beaten of the tier before (BOSS: every other fugue of Book I). */
export const TIER_NEEDS: Record<Tier, { of: Tier | "ALL"; count: number }> = {
  EASY: { of: "EASY", count: 0 },
  INTERMEDIATE: { of: "EASY", count: 5 },
  HARD: { of: "INTERMEDIATE", count: 4 },
  BOSS: { of: "ALL", count: 23 },
};

/** How many more fugues must be beaten to open a tier (0: open), given the fugues beaten. */
export function tierToGo(t: Tier, beaten: ReadonlySet<string>): number {
  const need = TIER_NEEDS[t];
  const pool = need.of === "ALL" ? bookCards(1).map((c) => c.id).filter((id) => id !== BOSS) : tierFugues(need.of);
  return Math.max(0, need.count - pool.filter((id) => beaten.has(id)).length);
}

/** The tiers open, given the fugues beaten. */
export const openTiers = (beaten: ReadonlySet<string>): Tier[] => TIER_ORDER.filter((t) => tierToGo(t, beaten) === 0);

/** "BEAT 3 MORE EASY FUGUES TO UNLOCK" (BOSS: "BEAT 2 MORE FUGUES TO UNLOCK"). */
export function unlockLine(t: Tier, beaten: ReadonlySet<string>): string {
  const n = tierToGo(t, beaten);
  const of = TIER_NEEDS[t].of;
  return `BEAT ${n} MORE ${of === "ALL" ? "" : `${of} `}FUGUE${n === 1 ? "" : "S"} TO UNLOCK`;
}

/**
 * A prelude's riding threshold by its tier (D229's PRELUDE_RIDE_MS, 170 ms, for HARD and BOSS): a
 * note off the strong places rides when closer than this to the note struck before it.
 */
export const TIER_RIDE_MS: Record<Tier, number> = { EASY: 250, INTERMEDIATE: 200, HARD: 170, BOSS: 170 };

/**
 * The preludes whose struck notes at their tier's threshold would still come quicker than their fugue's
 * busiest voice (difficulty.ts `busiest`): the threshold raised, by 10 ms steps, to the least that
 * brings them under it (checked by a test). The steps are coarse: the strong places' grid halves.
 */
export const PRELUDE_FIT: Record<string, number> = { wtc1p07: 190, wtc1p14: 300, wtc1p18: 330, wtc1p22: 360, wtc1p24: 360 };

/** The riding threshold for a prelude: its tier's, or its fit (Book II's and any other: HARD's). */
export const preludeRideMs = (id: string): number => Math.max(TIER_RIDE_MS[tierOf(id) ?? "HARD"], PRELUDE_FIT[id] ?? 0);

/** Whether a piece's beat is compound (split by 3 first). */
export const compound = (f: TouchFugue) => beatOf(f).ticks === f.tpq * (4 / Number(f.meter.split("/")[1])) * 3;

/**
 * A prelude's struck notes a second, as the game rides them at its tier's threshold: each hand's struck
 * onsets over 4 s windows (90th percentile, difficulty.ts's way), the busier hand. Without the final ritard.
 */
export function struckLoad(p: TouchFugue, limit = preludeRideMs(p.id)): number {
  const sPerTick = 60 / (standardTempo(p.id) * p.tpq);
  const ms = (a: number, b: number) => (b - a) * sPerTick * 1000;
  const beat = beatOf(p).ticks;
  let top = 0;
  for (let v = 0; v < p.voices.length; v++) {
    const ns = laneNotes(p.voices[v], beat, v);
    preludeRides(ns, beat, ms, (t) => inBar(p, t), compound(p) ? 3 : 2, limit);
    const ons = [...new Set(ns.filter((n) => !n.ride).map((n) => n.on))].sort((a, b) => a - b).map((t) => t * sPerTick);
    const w: number[] = [];
    let a = 0;
    let b = 0;
    for (let s = 0; s < (ons.at(-1) ?? 0); s += 1) {
      while (a < ons.length && ons[a] < s) a++;
      while (b < ons.length && ons[b] < s + 4) b++;
      w.push((b - a) / 4);
    }
    w.sort((x, y) => x - y);
    top = Math.max(top, w[Math.floor(w.length * 0.9)] ?? 0);
  }
  return top;
}
