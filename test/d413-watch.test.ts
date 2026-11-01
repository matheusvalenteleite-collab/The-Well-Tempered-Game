/**
 * D413: the tutorial's WATCH steps (Herr Bach plays, the player watches): no count-in (no digits, no
 * clicks; a short silent lead, then he begins), the TRY and PLAY count-in kept; the gold arrow from his
 * words to the next note (the "point" aid) withdrawn everywhere; nothing scored or counted on the screen
 * while he plays (the score, the multiplier, the combo, ACCURACY, SUBJECTS, the crowd and the verdicts
 * stand still at where the step began).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { loadExtras } from "../src/touch/fugue.ts";
import { isCourse, lessonById, MANUAL, type Material } from "../src/bench/manual/lessons.ts";
import { dressOf } from "../src/bench/manual/dress-of.ts";
import { gameFor } from "./d342-sim.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { paintProto } = await import("../src/bench/paint-proto.ts");
await loadExtras();

const g0 = globalThis as unknown as Record<string, unknown>;
g0.document ??= { documentElement: {} };
g0.getComputedStyle ??= () => ({ getPropertyValue: () => "" });

function recorder() {
  const texts: string[] = [];
  const state: Record<string, unknown> = { fillStyle: "#000", strokeStyle: "#000" };
  const c = new Proxy(state, {
    get(s, k: string) {
      if (k in s) return s[k];
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop: () => {} });
      if (k === "measureText") return () => ({ width: 10 });
      if (k === "fillText") return (t: unknown) => void texts.push(String(t));
      return () => {};
    },
    set(s, k: string, v) {
      s[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { c, texts };
}

/** A game of the material with the clicks counted (his demonstration when `demo`). */
function run(m: Material, demo: boolean) {
  const clock = { t: 0 };
  const { g } = gameFor(m, clock, demo ? "plain" : undefined);
  // His demonstration has no lesson metronome (BenchApp: runOf(…, click = false) in a WATCH).
  if (demo) delete (g.o as { click?: unknown }).click;
  let clicks = 0;
  (g as unknown as { chip: { tick: () => void } }).chip.tick = () => void clicks++;
  return { g, clock, clicks: () => clicks };
}

const WATCHES = MANUAL.filter(isCourse).flatMap((l) => l.stages.filter((s) => s.kind === "watch").map((s) => ({ id: l.id, m: s.m })));

test("D413: no lesson asks for the gold arrow to the next note (point)", () => {
  for (const l of MANUAL) {
    assert.ok(!(l.aids as readonly string[]).includes("point"), l.id);
    for (const s of l.stages) assert.ok(!((s.aids ?? []) as readonly string[]).includes("point"), `${l.id} ${s.kind}`);
  }
});

test("D413: every WATCH begins after a short silent lead: no count-in digit, no click before his first note", () => {
  assert.ok(WATCHES.length > 30, String(WATCHES.length));
  for (const { id, m } of WATCHES) {
    const { g, clock, clicks } = run(m, true);
    const lead = (g.entry - g.start) / g.tps;
    assert.ok(lead > 0 && lead <= 0.6 + 1e-9, `${id}: lead ${lead.toFixed(2)} s`);
    while (g.now < g.entry && clock.t < 10) {
      clock.t += 1 / 60;
      g.step();
      assert.equal(g.countIn(), 0, id);
    }
    assert.equal(clicks(), 0, `${id}: no count-in clicks`);
  }
});

test("D413: TRY and PLAY keep their count-in (PLAY: four beats, digits and clicks)", () => {
  const play = lessonById("F.6")!.stages.find((s) => s.kind === "play")!.m;
  const { g, clock, clicks } = run(play, false);
  clock.t += 1 / 60;
  g.step();
  assert.ok(g.countIn() >= 4, String(g.countIn()));
  while (g.now < g.entry && clock.t < 20) (clock.t += 1 / 60), g.step();
  assert.ok(clicks() >= 4, String(clicks()));
});

test("D413: nothing scored on the screen while he plays: the counters stand at the step's start", () => {
  const watch = lessonById("F.6")!.stages.find((s) => s.kind === "watch")!.m;
  const { g, clock } = run(watch, true);
  (g.o as { dress?: unknown }).dress = dressOf("F.6");
  let done = false;
  while (!done && g.score < 1 && clock.t < 60) (clock.t += 1 / 120), (done = g.step());
  while (!done && clock.t < 60 && g.combo < 5) (clock.t += 1 / 120), (done = g.step());
  assert.ok(g.score > 0 && g.combo >= 5, "the engine still tallies his notes underneath");
  const { c, texts } = recorder();
  paintProto(c, 844, 390, g, new Set());
  assert.ok(texts.includes("0"), texts.join(","));
  assert.ok(!texts.includes(Math.floor(g.score).toLocaleString("en")), "his score not shown");
  assert.ok(!texts.some((t) => /^COMBO|^×\d|^\+\d+%$|^PERFECT$|^GOOD$/.test(t)), texts.join(","));
  // D445: the live PERFORMANCE (was ACCURACY), frozen at —.
  assert.ok(texts.includes("—") && texts.includes("PERFORMANCE"), "PERFORMANCE frozen at —");
});
