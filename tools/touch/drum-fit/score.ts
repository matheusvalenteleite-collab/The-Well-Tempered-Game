/**
 * D712: THE DRUM-FIT SCORES (the brass research's criteria, section 4, as D620 measured them): for a piece on a sound,
 * every style the library has, through the engine's own strokes (test/drum-strokes.ts: Chip.groove, no audio): whether
 * it FITS the metre; the drummer's pulse a minute (a grid's layout, drum-grids.ts layoutOf) and whether it lies in the
 * style's band (or within 10 %); strokes a second; the share of strokes on the score's own onsets (a stroke within a
 * 32nd of a quarter of a note's attack); the piece's energy (the busiest voice's notes a second at the opening tempo).
 * The gap under the band needs the renders (drum-peak/render.cjs): not here.
 * usage: node tools/touch/drum-fit/score.ts <piece> <sound> [style ...]
 */
import { strokesOf } from "../../../test/drum-strokes.ts";
import { beatOf, fugueById, loadExtras } from "../../../src/touch/fugue.ts";
import { styleIds, styleInfo, fits } from "../../../src/touch/drum-library.ts";
import { GRIDS, layoutOf } from "../../../src/touch/drum-grids.ts";
import { tempoOf } from "../../../src/touch/tempi.ts";

await loadExtras();
const [id, sound, ...only] = process.argv.slice(2);
const f = fugueById(id);
const b = beatOf(f);
const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
const tps = (f.tpq * tempoOf(id)) / 60;
const secs = f.length / tps;
const onsets = [...new Set(f.voices.flatMap((v) => v.map((n) => n[0])))].sort((a, c) => a - c);
const tol = f.tpq / 8;
const near = (t: number) => {
  let lo = 0, hi = onsets.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (onsets[m] <= t) lo = m;
    else hi = m;
  }
  return Math.min(Math.abs(onsets[lo] - t), Math.abs(onsets[hi] - t)) <= tol;
};
const busiest = Math.max(...f.voices.map((v) => new Set(v.map((n) => n[0])).size)) / secs;
console.log(`${id} on ${sound}: ${f.meter}, ${tempoOf(id)} a quarter, the beat ${((60 * tps) / b.ticks).toFixed(0)} a minute, busiest voice ${busiest.toFixed(2)} notes/s`);
for (const st of only.length ? only : styleIds) {
  const g = GRIDS[st];
  const lay = g ? layoutOf(g, b.perBar, compound, b.ticks / tps) : null;
  const pulse = lay ? 60 / lay.pulseS : null;
  const inBand = g && pulse ? pulse >= g.bpm[0] * 0.9 && pulse <= g.bpm[1] * 1.1 : null;
  const s = await strokesOf(f, sound, st);
  const on = s.filter((x) => near(x.tick)).length;
  console.log(
    [st.padEnd(11), styleInfo(st).family.padEnd(10), fits(st, f) ? "fits" : "----", pulse ? `${pulse.toFixed(0)}/min [${g!.bpm.join("-")}]${inBand ? "" : " OUT"}` : "score".padEnd(16), `${(s.length / secs).toFixed(2)}/s`, `${s.length ? ((100 * on) / s.length).toFixed(0) : "-"}% on onsets`].join("  "),
  );
}
