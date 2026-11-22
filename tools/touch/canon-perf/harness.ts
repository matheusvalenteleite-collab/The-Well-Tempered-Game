/**
 * D970, D972: the rolling ribbon's (and the fugues' morphs') cost a frame. The game's own paintCanon over a canon's whole length (every frame at 60 fps of
 * music time), on a canvas of the box's pixels (PX 2: 466 x 190 for a 932 x 430 phone), timed in the page.
 */
import { fugueById, loadExtras } from "../../../src/touch/fugue.ts";
import { paintCanon } from "../../../src/touch/canon-ribbon.ts";
import { paintFugueMorphs } from "../../../src/touch/fugue-morph.ts";
import { CANONS } from "../../../src/touch/canon-echo.ts";
import { tempoOf } from "../../../src/touch/tempi.ts";
import { inkOf } from "../../../src/touch/voice-inks.ts";

const REPS = 20;
async function run(id: string) {
  await loadExtras();
  const f = fugueById(id);
  const c = document.createElement("canvas");
  c.width = 466;
  c.height = 190;
  const g = c.getContext("2d")!;
  const lo = Math.min(...f.voices.flat().map((n) => n[3])) - 1, hi = Math.max(...f.voices.flat().map((n) => n[3])) + 1;
  const rh = 186 / (hi - lo + 1), bh = Math.max(2, Math.round(rh * 0.8));
  const span = (3 * f.barTicks * 466) / 260, tps = (tempoOf(f.id) * f.tpq) / 60, step = tps / 60;
  const times: number[] = [];
  for (let now = 0; now < f.length; now += step) {
    const t0 = now - 0.25 * 3 * f.barTicks - (103 / 260) * 3 * f.barTicks;
    g.clearRect(0, 0, 466, 190);
    const geo = { xOf: (t: number) => Math.round(((t - t0) / span) * 466), yOf: (s: number) => 2 + (hi - s) * rh, bh, w: 466, h: 190, t0, t1: t0 + span, now, barTicks: f.barTicks, ink: (v: number) => inkOf(v, f.voices.length), text: () => {}, fg: "#fff", gold: "#f3d26b", left: 103 };
    // each frame painted REPS times and timed together (the page's clock is coarse: 0.1 ms)
    const a = performance.now();
    for (let r = 0; r < REPS; r++) if (CANONS[id]) paintCanon(g, f, geo);
    else paintFugueMorphs(g, f, geo);
    times.push((performance.now() - a) / REPS);
  }
  times.sort((x, y) => x - y);
  const mean = times.reduce((s, x) => s + x, 0) / times.length;
  return { id, frames: times.length, mean: +mean.toFixed(4), p95: +times[Math.floor(times.length * 0.95)].toFixed(4), max: +times[times.length - 1].toFixed(4) };
}
(globalThis as Record<string, unknown>).canonPerf = run;
