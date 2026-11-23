/**
 * D962: THE CANON-RULE CHECKER. A canon's second voice must be its leader under the rule the rubric names:
 * shifted in time, at an interval (diatonic steps), and, where the rubric says so, inverted (per motum contrarium),
 * augmented (per augmentationem), or reversed (cancrizans). Given two voices of a piece and the rule's KIND, this
 * finds the delay and the interval that best explain the follower and reports how much of it the leader explains:
 * the share of the follower's notes (in the span the rule covers) found at the predicted time and diatonic step, and
 * of those the share at the same pitch too (the chromatic agreement: an accidental Bach alters in the answer shows
 * here, not as a miss).
 *
 * The check needs no second edition: a realised puzzle canon either obeys its rubric or it does not. Which of
 * several rule-abiding solutions an edition chose (the entry interval of a "Quaerendo invenietis") is a separate
 * question, settled against the printed resolutions (BG 31.2).
 *
 *   node tools/touch/canon-check.ts PIECE-ID VOICE VOICE KIND [--factor N]   (the first voice the likelier leader)
 *     KIND: plain | contrary | augment | augment-contrary | crab
 *   node tools/touch/canon-check.ts --known     (the canons already in the game, as the checker's own test)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The game's note: onset and length in ticks, MIDI pitch, diatonic step index (C0 = 0). */
export type Note = [on: number, dur: number, midi: number, dia: number, ...rest: unknown[]];
export type Kind = "plain" | "contrary" | "augment" | "augment-contrary" | "crab";
export interface Fit {
  kind: Kind;
  /** Ticks from the leader's time to the follower's (for crab: the axis, follower on = axis − leader end). */
  delay: number;
  /** Diatonic: the interval added (plain, augment) or the sum leader + follower (contrary). */
  steps: number;
  /** Semitones, where the follower is a strict chromatic copy (plain or augment) or mirror (contrary); else null. */
  semis: number | null;
  factor: number;
  /** Follower notes inside the rule's span, and how many the leader predicts (time and step; and pitch too). */
  considered: number;
  matched: number;
  exact: number;
}

/** The leader's notes moved by the rule: where (on) and on which step the follower should sound them. */
function image(n: Note, kind: Kind, delay: number, steps: number, factor: number): [on: number, dia: number] {
  const [on, dur, , dia] = n;
  switch (kind) {
    case "plain":
      return [on + delay, dia + steps];
    case "contrary":
      return [on + delay, steps - dia];
    case "augment":
      return [on * factor + delay, dia + steps];
    case "augment-contrary":
      return [on * factor + delay, steps - dia];
    case "crab":
      return [delay - (on + dur), dia + steps];
  }
}

/**
 * Which follower notes one rule explains: a follower note is explained when the leader's image under the rule is
 * SOUNDING at its onset on the same diatonic step (so a note the follower ties or splits differently, or re-strikes,
 * still counts). Returns the pairs (follower index → leader index) and the span the rule covers.
 */
export function explain(leader: Note[], follower: Note[], kind: Kind, delay: number, steps: number, factor = 2) {
  const byStep = new Map<number, [on: number, end: number, li: number][]>();
  let lo = Infinity;
  let hi = -Infinity;
  leader.forEach((n, li) => {
    const [on, dia] = image(n, kind, delay, steps, factor);
    const len = kind.startsWith("augment") ? n[1] * factor : n[1];
    (byStep.get(dia) ?? byStep.set(dia, []).get(dia)!).push([on, on + len, li]);
    lo = Math.min(lo, on);
    hi = Math.max(hi, on + len);
  });
  const all = new Map<number, number>();
  const inSpan: number[] = [];
  follower.forEach((n, fi) => {
    if (n[0] < lo || n[0] >= hi) return;
    inSpan.push(fi);
    const hit = byStep.get(n[3])?.find(([on, end]) => on <= n[0] && n[0] < end);
    if (hit) all.set(fi, hit[2]);
  });
  // The stretch the rule holds: the run of the follower's notes (in time order) with the greatest weight, a match
  // +1, a miss −3 (so a stretch holds at 75% or better). A canon whose voices swap roles, or whose follower stops,
  // is explained stretch by stretch; stray agreements outside the stretch are not counted.
  inSpan.sort((x, y) => follower[x][0] - follower[y][0]);
  let [best, bi, bj, cur, ci] = [0, 0, -1, 0, 0];
  inSpan.forEach((fi, k) => {
    if (cur <= 0) [cur, ci] = [0, k];
    cur += all.has(fi) ? 1 : -3;
    if (cur > best) [best, bi, bj] = [cur, ci, k];
  });
  const run = inSpan.slice(bi, bj + 1);
  const pairs = new Map(run.filter((fi) => all.has(fi)).map((fi) => [fi, all.get(fi)!] as [number, number]));
  return { pairs, considered: run.length };
}

/** How well one rule (kind, delay, steps) explains the follower. */
export function score(leader: Note[], follower: Note[], kind: Kind, delay: number, steps: number, factor = 2): Fit {
  const { pairs, considered } = explain(leader, follower, kind, delay, steps, factor);
  const shifts = new Map<number, number>();
  for (const [fi, li] of pairs) {
    const [f, l] = [follower[fi], leader[li]];
    const x = kind === "contrary" || kind === "augment-contrary" ? f[2] + l[2] : f[2] - l[2];
    shifts.set(x, (shifts.get(x) ?? 0) + 1);
  }
  const matched = pairs.size;
  const [semis, exact] = [...shifts.entries()].sort((x, y) => y[1] - x[1])[0] ?? [null, 0];
  return { kind, delay, steps, semis: exact === matched && matched > 0 ? semis : null, factor, considered, matched, exact };
}

/**
 * The best rule of the given kind, by voting: forty-eight of the follower's notes, spread over it, are each paired
 * with every leader note (within `reach` ticks, for the rules that do not stretch time); each pair votes for the
 * delay and interval that would map the one onto the other. The true rule gathers a vote from every note it explains;
 * the forty most-voted are scored, and the one explaining most notes (then the highest share) wins.
 */
export function bestFit(leader: Note[], follower: Note[], kind: Kind, factor = 2, reach = Infinity): Fit | null {
  const votes = new Map<string, number>();
  const every = Math.max(1, Math.floor(follower.length / 48));
  for (let i = 0; i < follower.length; i += every) {
    const f = follower[i];
    for (const l of leader) {
      if ((kind === "plain" || kind === "contrary") && Math.abs(f[0] - l[0]) > reach) continue;
      const on = kind.startsWith("augment") ? f[0] - l[0] * factor : kind === "crab" ? f[0] + l[0] + l[1] : f[0] - l[0];
      // A follower comes after its leader (an augmented one's delay may be negative: it is stretched from time 0).
      if (kind !== "crab" && f[0] <= l[0]) continue;
      const st = kind === "contrary" || kind === "augment-contrary" ? f[3] + l[3] : f[3] - l[3];
      const k = `${on}:${st}`;
      votes.set(k, (votes.get(k) ?? 0) + 1);
    }
  }
  let best: Fit | null = null;
  for (const [c] of [...votes].sort((x, y) => y[1] - x[1]).slice(0, 40)) {
    const [d, s] = c.split(":").map(Number);
    const fit = score(leader, follower, kind, d, s, factor);
    if (!best || fit.matched > best.matched || (fit.matched === best.matched && fit.matched / fit.considered > best.matched / best.considered)) best = fit;
  }
  return best;
}

export interface Rule extends Fit {
  leader: number;
  follower: number;
  /** The follower's bars the rule explains (first to last matched note, 1-based). */
  bars: [number, number];
}
/**
 * A canon as one or more rules (the voices may swap roles at the double bar, or the follower change interval in a
 * second half): the best rule in either direction over the notes not yet explained, kept while it explains at least
 * `min` notes at `share` or better; then the next. Returns the rules and, per voice, the notes left unexplained
 * that are not themselves led from (the leader's free tail and any free coda show here).
 */
export function cover(voices: Note[][], pair: [number, number], kind: Kind, barTicks: number, opts: { factor?: number; share?: number; min?: number; rules?: number } = {}) {
  const { factor = 2, share = 0.85, min = 12, rules: most = 4 } = opts;
  const left = voices.map((v) => new Set(v.map((_, i) => i)));
  const used = voices.map(() => new Set<number>());
  const rules: Rule[] = [];
  const reach = 16 * barTicks;
  for (let k = 0; k < most; k++) {
    let best: Rule | null = null;
    for (const [a, b] of [pair, [pair[1], pair[0]] as [number, number]]) {
      const rest = voices[b].filter((_, i) => left[b].has(i));
      if (rest.length < min) continue;
      const fit = bestFit(voices[a], rest, kind, factor, reach);
      if (fit && (!best || fit.matched > best.matched)) best = { ...fit, leader: a, follower: b, bars: [0, 0] };
    }
    if (!best || best.matched < min || best.matched / best.considered < share) break;
    // Mark what the rule explains, and the leader notes it uses.
    const r = best;
    const idx = [...left[r.follower]];
    const { pairs } = explain(voices[r.leader], idx.map((i) => voices[r.follower][i]), r.kind, r.delay, r.steps, r.factor);
    const hit: number[] = [];
    for (const [k, li] of pairs) {
      left[r.follower].delete(idx[k]);
      used[r.leader].add(li);
      hit.push(voices[r.follower][idx[k]][0]);
    }
    best.bars = [Math.floor(Math.min(...hit) / barTicks) + 1, Math.floor(Math.max(...hit) / barTicks) + 1];
    rules.push(best);
  }
  const free = voices.map((v, vi) => (pair.includes(vi) ? v.filter((_, i) => left[vi].has(i) && !used[vi].has(i)).map((n) => Math.floor(n[0] / barTicks) + 1) : []));
  return { rules, free };
}

const STEP = ["unison", "second", "third", "fourth", "fifth", "sixth", "seventh", "octave", "ninth", "tenth", "eleventh", "twelfth"];
export function describe(f: Fit, barTicks: number): string {
  const pct = f.considered ? ((100 * f.matched) / f.considered).toFixed(1) : "—";
  const ex = f.matched ? ((100 * f.exact) / f.matched).toFixed(1) : "—";
  const bars = (f.delay / barTicks).toFixed(2).replace(/\.?0+$/, "");
  const iv = f.kind === "contrary" || f.kind === "augment-contrary" ? `mirror sum ${f.steps}` : `${f.steps >= 0 ? "+" : "−"}${STEP[Math.abs(f.steps)] ?? `${Math.abs(f.steps)} steps`}`;
  const when = f.kind === "crab" ? `axis at ${bars} bars` : f.kind.startsWith("augment") ? "stretched" : `${bars} bars later`;
  return `${f.kind}${f.kind.startsWith("augment") ? ` ×${f.factor}` : ""}, ${iv}, ${when}: ${f.matched}/${f.considered} (${pct}%) by step, ${ex}% of those at the same pitch${f.semis !== null ? ` (${f.semis} semitones throughout)` : ""}`;
}

type Piece = { id: string; barTicks: number; voices: Note[][] };
export function piece(id: string): Piece {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const all: Piece[] = JSON.parse(readFileSync(`${root}data/touch/more-bach.json`, "utf8"));
  const p = all.find((x) => x.id === id);
  if (!p) throw new Error(`no piece ${id}`);
  return p;
}

/** The game's own canons: the checker must find each one's known rule, explaining all but the free notes. */
export const KNOWN: { id: string; pair: [number, number]; kind: Kind; note: string }[] = [
  { id: "bwv1080-c14", pair: [0, 1], kind: "augment-contrary", note: "Canon per Augmentationem in Contrario Motu" },
  { id: "bwv1080-c15", pair: [0, 1], kind: "plain", note: "Canon alla Ottava" },
  { id: "bwv1080-c16", pair: [1, 0], kind: "plain", note: "Canon alla Decima" },
  { id: "bwv1080-c17", pair: [1, 0], kind: "plain", note: "Canon alla Duodecima" },
  { id: "bwv988-03", pair: [0, 1], kind: "plain", note: "Goldberg Var. 3, all'Unisono" },
  { id: "bwv988-12", pair: [0, 1], kind: "contrary", note: "Goldberg Var. 12, alla Quarta (inverted)" },
  { id: "bwv988-15", pair: [1, 0], kind: "contrary", note: "Goldberg Var. 15, alla Quinta (inverted)" },
];

/** Bars as compact ranges: 1 2 3 7 → "1–3, 7". */
export function ranges(bars: number[]): string {
  const u = [...new Set(bars)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < u.length; i++) {
    let j = i;
    while (j + 1 < u.length && u[j + 1] === u[j] + 1) j++;
    out.push(i === j ? `${u[i]}` : `${u[i]}–${u[j]}`);
    i = j;
  }
  return out.join(", ");
}

export function report(id: string, voices: Note[][], barTicks: number, pair: [number, number], kind: Kind, note = "", factor = 2): string {
  const { rules, free } = cover(voices, pair, kind, barTicks, { factor });
  const lines = [`${id}${note ? ` (${note})` : ""}`];
  for (const r of rules) lines.push(`  voice ${r.leader} → ${r.follower}, bars ${r.bars[0]}–${r.bars[1]}: ${describe(r, barTicks)}`);
  if (!rules.length) lines.push("  NO RULE FOUND");
  pair.forEach((v) => lines.push(`  voice ${v}: ${free[v].length} of ${voices[v].length} notes neither led nor following${free[v].length ? ` (bars ${ranges(free[v])})` : ""}`));
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const factor = a.includes("--factor") ? Number(a[a.indexOf("--factor") + 1]) : 2;
  const runs = a[0] === "--known" ? KNOWN : [{ id: a[0], pair: [Number(a[1]), Number(a[2])] as [number, number], kind: a[3] as Kind, note: "" }];
  for (const r of runs) {
    const p = piece(r.id);
    console.log(report(r.id, p.voices, p.barTicks, r.pair, r.kind, r.note, factor));
  }
}
