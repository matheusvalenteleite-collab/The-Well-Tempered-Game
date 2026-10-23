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

// ---------------------------------------------------------------------------------------------------
// D231: the staves where they belong (the owner's I/12, ALTO, on the title screen: the inner voices
// adrift between staves fifteen spaces apart, no staff lines before the first bar, a black entry
// bracket read as a stray staff line).

const { planStaves, paintStrip, plate, staffLineYs, grandGap } = await import("../src/touch/ui/scroll-score.ts");
const { LINES, ledgersOf, clefOf } = await import("../src/touch/ui/strip.ts");

/** A context that records its horizontal strokes (y, from x, to x); everything else taken and dropped. */
function recorder(): { g: CanvasRenderingContext2D; lines: [number, number, number][] } {
  const lines: [number, number, number][] = [];
  let at: [number, number] = [0, 0];
  const store: Record<string | symbol, unknown> = {
    moveTo: (x: number, y: number) => (at = [x, y]),
    lineTo: (x: number, y: number) => {
      if (y === at[1] && Math.abs(x - at[0]) > 40) lines.push([y, Math.min(x, at[0]), Math.max(x, at[0])]);
      at = [x, y];
    },
    measureText: () => ({ width: 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  const g = new Proxy(store, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) }) as unknown as CanvasRenderingContext2D;
  return { g, lines };
}

function withPath2D<T>(fn: () => T): T {
  const g = globalThis as Record<string, unknown>;
  const had = g.Path2D;
  g.Path2D = class {
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    bezierCurveTo() {}
    closePath() {}
  };
  try {
    return fn();
  } finally {
    g.Path2D = had;
  }
}

test("I/12 on the grand staff: the alto on the treble, the tenor on the bass, each head at its clef's place, the alto within 4 ledger lines", () => {
  const f = fugueById("wtc1f12");
  const staves = grandStaves(f.voices.length);
  assert.deepEqual(staves.map((s) => [s.clef, s.voices]), [["g", [0, 1]], ["f", [2, 3]]]);
  const s = layoutStrip(f, staves);
  // The owner's box on the title screen (1600×1172) and in play.
  for (const [top, bottom] of [[152, 1018], [80, 414]]) {
    const p = planStaves(f, staves, top, bottom, 15, 6, 6, true);
    const half = p.sp / 2;
    // E4 is the treble's bottom line, G2 the bass's.
    assert.ok(Math.abs(p.y(30, 0) - (p.top[0] + 8 * half)) < 1e-9);
    assert.ok(Math.abs(p.y(18, 1) - (p.top[1] + 8 * half)) < 1e-9);
    // A keyboard system's gap: the staves 6 to 9 spaces apart, not 15.
    const gap = (p.top[1] - p.y(30, 0)) / p.sp;
    assert.ok(gap >= 6 - 1e-9 && gap <= 9 + 1e-9, `gap ${gap}`);
    for (const e of s.evs) {
      if (e.rest) continue;
      assert.equal(e.staff, e.voice < 2 ? 0 : 1, `voice ${e.voice} at ${e.on}`);
      for (const h of e.heads) {
        const y = p.y(h.step, e.staff);
        assert.ok(Math.abs(y - (p.top[e.staff] + (staves[e.staff].lines[4] - h.step) * half)) < 1e-9);
        if (e.voice === 1) assert.ok(ledgersOf(h.step, LINES.g) <= 4, `alto ${h.midi} at ${e.on}: ${ledgersOf(h.step, LINES.g)} ledger lines`);
      }
    }
  }
  assert.ok(grandGap(0, 0) === 12 && grandGap(30, 2) === 18);
});

test("the staff lines: the plate's and the strip's at the same y, unbroken through the past before the first bar", () => {
  for (const id of ["wtc1f12", "wtc1f02", "wtc1f04", "wtc1f10"]) {
    const f = fugueById(id);
    for (const [staves, grand] of [[grandStaves(f.voices.length), true], [voiceStaves(f, 1), false]] as const) {
      const s = layoutStrip(f, staves);
      const p = planStaves(f, staves, 150, 1000, 15, 6, 6, grand);
      const look = { paper: "#fff", staffInk: "#111", ink: () => "#000", marks: "numbers" as const, barNumbers: true, mine: null, player: 1, mineInk: "#00f" };
      const want = staffLineYs(p, staves).flat().sort((a, b) => a - b);
      const plateRec = recorder();
      withPath2D(() => plate({ g: plateRec.g, H: 1172, f } as never, { f, strip: s, plan: p, look } as never, 200));
      const plateYs = [...new Set(plateRec.lines.map((l) => l[0]))].sort((a, b) => a - b);
      assert.deepEqual(plateYs, want, `${id} plate`);
      // A tile wholly before the first bar (the past at the start), and one in the music.
      for (const u0 of [-60, -20, 30]) {
        const r = recorder();
        withPath2D(() => paintStrip(r.g, f, s, p, look, u0, u0 + 512 / p.sp, 1172));
        for (const y of want) assert.ok(r.lines.some((l) => l[0] === y && l[1] <= 0 && l[2] >= 511), `${id} tile at ${u0}: line ${y} across`);
      }
    }
  }
});

test("SCORE: one staff per voice in its clef (I/12's tenor in the octave treble, an alto never)", () => {
  const f = fugueById("wtc1f12");
  assert.deepEqual(voiceStaves(f, 1).map((s) => s.clef), ["g", "g", "g8", "f"]);
  assert.deepEqual(voiceStaves(fugueById("wtc1f02"), 1).map((s) => s.clef), ["g", "g", "f"]);
  assert.deepEqual(voiceStaves(fugueById("wtc1f10"), 1).map((s) => s.clef), ["g", "f"]);
  for (const g of FUGUES) for (const [v, s] of voiceStaves(g, 0).entries()) if (/alto|soprano/i.test(g.voiceNames[v])) assert.notEqual(s.clef, "g8", `${g.id} ${g.voiceNames[v]}`);
  // The octave treble reads a step 7 higher: C4 (28) in its third space, as C5 (35) on the treble.
  assert.equal(LINES.g8[2] + 7, LINES.g[2]);
  assert.equal(clefOf([20, 25, 28, 29, 30], true), "g8");
});
