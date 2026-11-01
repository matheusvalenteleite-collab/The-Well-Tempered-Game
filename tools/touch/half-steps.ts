/**
 * D414 (WTC 2.02): what the music box shows against what LADDER asks, for every two consecutive notes of
 * every voice of the 48 fugues. The box: one row per staff step, an altered note (against the piece's
 * signature) drawn a third of a row off it (D332). The judge: a strike by the row rule (ladder-rule.ts
 * ladderMove), a slide toward its note's target (proto-game.ts glennLead/glennSlide: before D414 the bare
 * row's middle, since D414 the block as drawn).
 *
 *   node tools/touch/half-steps.ts
 */
import { FUGUES } from "../../src/touch/fugue.ts";
import { chromaLiftPx, signatureOf } from "../../src/touch/chroma.ts";
import { ladderMove, slideWay } from "../../src/bench/ladder-rule.ts";
import { GLENN } from "../../src/bench/glenn.ts";
import { MECH } from "../../src/bench/mechanics.ts";

/** The owner's rows (D332: 10 CSS px), the judging row no smaller than LADDER_ROW_MIN. */
export const ROW = 10;
const R = Math.max(ROW, MECH.ladderRowMin);

export interface Pair { piece: string; voice: number; bar: number; from: string; to: string; steps: number; semis: number; drawnPx: number; aY: number; bY: number; bRowY: number }

/** Every two consecutive struck notes (a chord's top) of every voice of the 48, as the box draws them. */
export function pairs48(): Pair[] {
  const out: Pair[] = [];
  for (const f of FUGUES.filter((x) => x.book === 1 || x.book === 2)) {
    const sig = signatureOf(f.key);
    const y = (step: number, midi: number) => -step * ROW - chromaLiftPx(ROW, step, midi, sig);
    f.voices.forEach((v, vi) => {
      const tops = v.filter((n, i) => !(i + 1 < v.length && v[i + 1][0] === n[0] && v[i + 1][2] > n[2]) && !(i > 0 && v[i - 1][0] === n[0] && v[i - 1][2] > n[2]));
      for (let i = 1; i < tops.length; i++) {
        const a = tops[i - 1];
        const b = tops[i];
        if (a[0] === b[0]) continue;
        out.push({
          piece: `${f.book === 1 ? "I" : "II"}/${f.number}`,
          voice: vi,
          bar: f.bars.filter((x) => x.on <= b[0]).length,
          from: f.spell[a[2]] ?? String(a[2]),
          to: f.spell[b[2]] ?? String(b[2]),
          steps: b[3] - a[3],
          semis: b[2] - a[2],
          aY: y(a[3], a[2]),
          bY: y(b[3], b[2]),
          bRowY: -b[3] * ROW,
          drawnPx: y(a[3], a[2]) - y(b[3], b[2]),
        });
      }
    });
  }
  return out;
}

/** What the box shows and what the judge asks disagree on (empty: aligned). `bare`: the judge before D414. */
export function mismatches(p: Pair, bare = false): string[] {
  const out: string[] = [];
  // A strike: the thumb from the last note's block to this one's; staying where the rows are level; a row's move the rows' way.
  if (!ladderMove(p.steps, p.drawnPx, R).ok) out.push("strike at the drawn block refused");
  if (p.steps === 0 && !ladderMove(0, 0, R).ok) out.push("same row: staying refused");
  if (p.steps !== 0 && !ladderMove(p.steps, Math.sign(p.steps) * Math.abs(p.steps) * ROW, R).ok) out.push("rows' way refused");
  if (p.steps !== 0 && ladderMove(p.steps, -Math.sign(p.steps) * 3 * R, R).ok) out.push("a clear move against the rows accepted");
  // A slide from the last note's block toward this one's (Glenn's, D376): the way it must go, and where it arrives.
  const target = bare ? p.bRowY : p.bY;
  const want = slideWay(p.aY, target);
  const seen = Math.sign(p.drawnPx);
  if (seen !== 0 && want !== seen) out.push(p.steps === 0 ? "same row, nudged: slide asked the other way" : "slide asked against the rows");
  const off = want * (p.bY - target);
  if (seen !== 0 && Math.abs(p.drawnPx) >= MECH.slideMinPx && want === seen && Math.abs(off) > GLENN.slideReachRows * R)
    out.push(off < 0 ? "slide arrives before the drawn block (the bare row)" : "slide stopping on the drawn block short of the bare row (only by the 40 ms stop)");
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ps = pairs48();
  for (const bare of [true, false]) {
    const cats = new Map<string, { n: number; ex: string[] }>();
    for (const p of ps)
      for (const m of mismatches(p, bare)) {
        const c = cats.get(m) ?? { n: 0, ex: [] };
        c.n++;
        if (c.ex.length < 4) c.ex.push(`${p.piece} v${p.voice} b${p.bar} ${p.from}→${p.to}`);
        cats.set(m, c);
      }
    console.log(`\n${bare ? "BEFORE (slides at the bare row)" : "NOW (D414: slides at the drawn block)"}: ${ps.length} pairs`);
    if (!cats.size) console.log("  no mismatch");
    for (const [k, c] of cats) console.log(`  ${k}: ${c.n}  e.g. ${c.ex.join(" · ")}`);
  }
  const same = ps.filter((p) => p.steps === 0 && p.semis !== 0);
  const near = ps.filter((p) => Math.abs(p.semis) === 1 && p.steps !== 0);
  console.log(`\nsemitones on one row (judged a repeat: stay): ${same.length}; semitones a row apart (a step): ${near.length}; enharmonic row moves: ${ps.filter((p) => p.steps !== 0 && p.semis === 0).length}; row way against pitch way: ${ps.filter((p) => p.steps * p.semis < 0).length}`);
}
