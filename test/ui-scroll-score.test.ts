/**
 * D227: GERUBACH and SCORE, the engraved interfaces: registered, the strip laid out right (every note
 * where the time map puts it, bars in order, time to x monotonic, every voice's time filled), and
 * painting them changes nothing the game judges.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById, FUGUES } from "../src/touch/fugue.ts";
import { laneNotes, options, strike, sweep, points, type LaneNote } from "../src/touch/lanes.ts";
import { register } from "node:module";
import type { Frame } from "../src/touch/MusicBox.tsx";

// core.ts imports MusicBox.tsx (its arrow pixels): loaded transpiled (test/tsx-hooks.mjs).
register("./tsx-hooks.mjs", import.meta.url);
const { TEMPLATES } = await import("../src/touch/ui/index.ts");
const { buildCtx } = await import("../src/touch/ui/core.ts");
const { grandStaves, layoutStrip, voiceStaves, writtenValues } = await import("../src/touch/ui/strip.ts");

test("the registry has GERUBACH and SCORE, and both leave the side bars their own ladder", () => {
  for (const id of ["gerubach", "score"]) {
    const t = TEMPLATES[id];
    assert.ok(t, id);
    assert.equal(t.rows, false, `${id} keeps the bars' ladder`);
    assert.equal(t.chrome, true);
  }
  assert.equal(TEMPLATES.gerubach.name, "GERUBACH");
  assert.equal(TEMPLATES.score.name, "SCORE");
});

test("written values: a half tied to an eighth, rests undotted, odd lengths as one value", () => {
  assert.deepEqual(writtenValues(2.5 * 960, 960, false), [2, 0.5]);
  assert.deepEqual(writtenValues(1.5 * 960, 960, false), [1.5]);
  assert.deepEqual(writtenValues(1.5 * 960, 960, true), [1, 0.5]);
  assert.equal(writtenValues(320, 960, false).length, 1);
});

test("the strip maps bars to x monotonically, each note at its time's x, every voice's time filled", () => {
  for (const f of [...FUGUES.filter((x) => x.book === 1), fugueById("wtc2f09"), fugueById("wtc2f15")]) {
    for (const staves of [grandStaves(f.voices.length), voiceStaves(f, 0)]) {
      const s = layoutStrip(f, staves);
      for (let i = 1; i < s.bars.length; i++) assert.ok(s.bars[i].x > s.bars[i - 1].x && s.bars[i].on > s.bars[i - 1].on, `${f.id} bar ${s.bars[i].n}`);
      for (let i = 1; i < s.cols.length; i++) assert.ok(s.cols[i].x > s.cols[i - 1].x, `${f.id} column ${i}`);
      let last = -Infinity;
      for (let t = -f.barTicks; t <= f.length + f.barTicks; t += f.tpq / 8) {
        const x = s.xOf(t);
        assert.ok(x >= last, `${f.id} xOf(${t})`);
        last = x;
      }
      for (const e of s.evs) if (!e.measure) assert.ok(Math.abs(s.xOf(e.on) - e.x) < 1e-9, `${f.id} event at ${e.on}`);
      // Each voice: notes and rests back to back from the first bar to the end.
      f.voices.forEach((_, v) => {
        const mine = s.evs.filter((e) => e.voice === v);
        const total = mine.reduce((a, e) => a + e.dur, 0);
        const start = Math.min(0, f.bars[0].on);
        const end = Math.max(f.length, f.bars[f.bars.length - 1].on + 1);
        assert.ok(Math.abs(total - (end - start)) <= f.tpq / 4 + mine.length, `${f.id} voice ${v}: ${total} of ${end - start}`);
      });
      // Every note's onset has a head there.
      const heads = new Set(s.evs.filter((e) => !e.rest).map((e) => `${e.voice}:${e.src}`));
      f.voices.forEach((ns, v) => ns.forEach(([on, dur]) => dur > 0 && assert.ok(heads.has(`${v}:${on}`), `${f.id} ${v}:${on}`)));
    }
  }
});

/** A canvas context that takes every call and remembers nothing that matters. */
function fakeCtx(): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = {};
  return new Proxy(store, {
    get: (o, k) => {
      if (k in o) return o[k];
      if (k === "measureText") return () => ({ width: 6 });
      return () => ({ addColorStop() {} });
    },
    set: (o, k, v) => ((o[k] = v), true),
  }) as unknown as CanvasRenderingContext2D;
}

test("painting GERUBACH or SCORE every frame does not change the game's judging", () => {
  const g = globalThis as Record<string, unknown>;
  const had = { document: g.document, Path2D: g.Path2D };
  g.Path2D = class {
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    bezierCurveTo() {}
    closePath() {}
  };
  g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };
  try {
    const f = fugueById("wtc1f02");
    const beat = beatOf(f).ticks;
    const o = options(f.tpq, 74, "normal");
    const run = (paint: ((fr: Frame) => void) | null) => {
      const notes: LaneNote[] = laneNotes(f.voices[1], beat, 1);
      // A player who plays every third note late, lets every seventh pass, the rest on time.
      const taps = notes.map((n, i) => (i % 7 === 3 ? null : n.on + (i % 3 === 0 ? o.late * 0.8 : 0)));
      let k = 0;
      for (let t = 0; t < 12 * f.barTicks; t += f.tpq / 12) {
        while (k < taps.length && (taps[k] === null || taps[k]! <= t)) {
          if (taps[k] !== null) strike(notes, taps[k]!, o);
          k++;
        }
        sweep(notes, t, o);
        if (paint)
          paint({ now: t, tps: (f.tpq * 74) / 60, key: f.key, barTicks: f.barTicks, beatTicks: beat, count: 3, lo: 20, hi: 40, voice: 1, notes, others: [], piece: f.id, names: f.voiceNames });
      }
      return { states: notes.map((n) => `${n.state}:${n.at ?? ""}`).join(","), pts: points(notes, o) };
    };
    const plain = run(null);
    for (const id of ["gerubach", "score"]) {
      const t = TEMPLATES[id];
      const painted = run((fr) => {
        const geo = t.geo({ f, voice: fr.voice, range: { lo: fr.lo, hi: fr.hi }, w: 700, h: 300 });
        t.paint(buildCtx(t, fakeCtx(), 700, 300, 1, fr, geo));
      });
      assert.deepEqual(painted, plain, id);
    }
  } finally {
    g.document = had.document;
    g.Path2D = had.Path2D;
  }
});
