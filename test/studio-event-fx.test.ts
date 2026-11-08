/**
 * The design studio (D477): each musical event seen (event-fx.ts), read from the one stream (music-events.ts), under
 * the notes; the photosensitivity rule (fewer than three brightenings a second, each capped); QUIET and OFF.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { BURSTS_PER_S, FX_MAX, fxState, keepBursts } from "../src/touch/event-fx.ts";
import { scoreEvents, setOutputLevel, type MusicEvent } from "../src/touch/music-events.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D477: photosensitivity: fewer than three brightenings begin in any second, whatever the stream; each capped", () => {
  assert.ok(BURSTS_PER_S < 3);
  const tps = 960;
  // A storm: a crash every 50 ms for 10 s, fp's between.
  const ev: MusicEvent[] = [];
  for (let i = 0; i < 200; i++) ev.push({ tick: i * 48, kind: i % 3 ? "crash" : "fp", level: 1 });
  const kept = keepBursts(ev, tps);
  for (let s = 0; s < 10; s += 0.05) {
    const n = kept.filter((e) => e.tick >= s * tps && e.tick < (s + 1) * tps).length;
    assert.ok(n <= Math.ceil(BURSTS_PER_S), `${n} bursts in the second from ${s.toFixed(2)} s`);
  }
  // Drawn over a real piece with the storm and the meter at full: nothing past its cap.
  const f = fugueById("wtc2f22");
  setOutputLevel(() => 1);
  for (let t = 0; t < f.length; t += 97) {
    const st = fxState(f, t, tps, false, ev.map((e) => ({ ...e, tick: e.tick + t - 2000 })));
    assert.ok(st.burst <= FX_MAX.burst + 1e-9 && st.glow <= FX_MAX.glow + 1e-9 && st.edge <= FX_MAX.edge + 1e-9 && Math.abs(st.swell) <= FX_MAX.swell + 1e-9);
    for (const r of st.rings) assert.ok(r.a <= FX_MAX.ring + 1e-9);
  }
  setOutputLevel(null);
  // Every cap stays soft: no effect brighter than 0.6 alpha, a whole-world light under 0.1.
  for (const v of Object.values(FX_MAX)) assert.ok(v <= 0.6);
  assert.ok(FX_MAX.burst <= 0.1 && FX_MAX.swell <= 0.1);
});

test("D477: the events show: an entry's rings, II/22's fp glow, I/12's hush, an episode's breath, the climax, the held chord", () => {
  const f = fugueById("wtc2f22");
  const tps = 1000;
  const ev = scoreEvents(f);
  const entry = ev.find((e) => e.kind === "entry" && e.tick > 10 * f.barTicks)!;
  assert.ok(fxState(f, entry.tick - 200, tps, false).rings.some((r) => r.spread === 0 && r.gather > 0), "gathering before");
  assert.ok(fxState(f, entry.tick + 100, tps, false).rings.some((r) => r.spread > 0), "spreading after");
  const fp = ev.find((e) => e.kind === "fp")!;
  assert.ok(fxState(f, fp.tick + 50, tps, false).glow > 0);
  const ep = ev.find((e) => e.kind === "episode")!;
  assert.ok(fxState(f, ep.tick + (ep.dur ?? 0) / 2, tps, false).breath > 0);
  const peak = ev.find((e) => e.kind === "peak")!;
  assert.ok(fxState(f, peak.tick, tps, false).climax > 0.9);
  const last = ev.find((e) => e.kind === "resolve")!;
  assert.ok(fxState(f, f.length - 1, tps, false).held > 0 || last.tick >= f.length - 1);
  const g = fugueById("wtc1f12");
  const hush = scoreEvents(g).find((e) => e.kind === "subito-p")!;
  assert.ok(fxState(g, hush.tick + 100, tps, false).hush > 0.5);
});

test("D477: QUIET keeps only the slow effects; the drums' strokes pulse the edges; drawn under the notes, with the stage (OFF: none); nothing judged", () => {
  const f = fugueById("wtc2f22");
  const fp = scoreEvents(f).find((e) => e.kind === "fp")!;
  const q = fxState(f, fp.tick + 50, 1000, true, [{ tick: fp.tick, kind: "crash", level: 1 }]);
  assert.equal(q.glow + q.burst + q.edge + q.rings.length, 0);
  const live = fxState(f, 5000, 1000, false, [{ tick: 4990, kind: "kick", level: 0.8 }]);
  assert.ok(live.edge > 0);
  const mb = src("src/touch/MusicBox.tsx");
  assert.ok(mb.indexOf("paintFx(") < mb.indexOf("// D332: a note altered"), "under the notes");
  assert.match(mb, /if \(staged\) \{\s*const mode = stageMode\(\);\s*paintFx\(/);
  const s = src("src/touch/event-fx.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/"hit"|"miss"|score\(|streak|judge/.test(s));
  assert.match(src("src/bench/BenchApp.tsx"), /game\.current = g;\s*\/\/ D477[^\n]*\n\s*resetLive\(\);/);
});
