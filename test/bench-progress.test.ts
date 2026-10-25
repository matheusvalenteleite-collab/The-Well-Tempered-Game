/** D251: how far into the piece: a thin line along the canvas's top edge in every layout, BAR n / N beside it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { paintProto, barNumberAt, PROGRESS_H } = await import("../src/bench/paint-proto.ts");

const g0 = globalThis as unknown as Record<string, unknown>;
g0.document ??= { documentElement: {} };
g0.getComputedStyle ??= () => ({ getPropertyValue: () => "" });

type Op = { op: string; args: unknown[]; fill: unknown };
function recorder(): { c: CanvasRenderingContext2D; ops: Op[] } {
  const ops: Op[] = [];
  const state: Record<string, unknown> = { fillStyle: "#000", strokeStyle: "#000" };
  const gradient = { addColorStop: () => {} };
  const c = new Proxy(state, {
    get(s, k: string) {
      if (k in s) return s[k];
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => gradient;
      if (k === "measureText") return () => ({ width: 10 });
      return (...args: unknown[]) => void ops.push({ op: k, args, fill: s.fillStyle });
    },
    set(s, k: string, v) {
      s[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { c, ops };
}

function at(id: string, proto: string, voice: number, tick: number) {
  const clock = { t: 0 };
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    groove: () => false,
    chime: () => {},
  } as unknown as Chip;
  const g = new ProtoGame(fugueById(id), voice, 0, protoById(proto), { bpm: 60, legato: false, easy: "direction" }, chip);
  while (g.now < tick) (clock.t += 0.05), g.step();
  return g;
}

const texts = (ops: Op[]) => ops.filter((o) => o.op === "fillText").map((o) => String(o.args[0]));
/** The filled part of the line: the top-edge rect drawn from x 0 in the shine (fallback "#fff"). */
const filled = (ops: Op[], w: number) => ops.find((o) => o.op === "fillRect" && o.args[0] === 0 && o.args[1] === 0 && o.args[3] === PROGRESS_H && (o.args[2] as number) < w);

test("D251: the bar a tick falls in", () => {
  const f = fugueById("wtc1p01");
  assert.equal(barNumberAt(f, -500), f.bars[0].n);
  assert.equal(barNumberAt(f, 0), 1);
  assert.equal(barNumberAt(f, barStart(f, 12)), 12);
  assert.equal(barNumberAt(f, barStart(f, 12) - 1), 11);
  assert.equal(barNumberAt(f, f.length + 9999), f.bars[f.bars.length - 1].n);
  assert.equal(barNumberAt({ bars: [] }, 10), 1);
});

test("D251: the phone's HIGHWAY (a prelude): the line filled as far as the music, BAR n / N, the arc's sections and pedal marked", () => {
  const f = fugueById("wtc1p01");
  const tick = barStart(f, 8) + 10;
  const g = at("wtc1p01", "highway", 0, tick);
  const { c, ops } = recorder();
  const w = 390;
  paintProto(c, w, 760, g, new Set());
  const fill = filled(ops, w);
  assert.ok(fill, "the line's filled part");
  assert.ok(Math.abs((fill.args[2] as number) - (g.now / f.length) * w) <= 1);
  assert.ok(texts(ops).includes(`BAR ${barNumberAt(f, g.now)} / 35`), texts(ops).join(","));
  // The sections' ticks (D259: bars 5 and 32, where the riding changes) and the pedal's span (bars 24 to 32).
  for (const bar of [5, 32]) {
    const x = Math.round((barStart(f, bar) / f.length) * w);
    assert.ok(ops.some((o) => o.op === "fillRect" && o.args[0] === x && o.args[1] === 0 && o.args[2] === 1), `tick at bar ${bar}`);
  }
  const px = Math.round((barStart(f, 24) / f.length) * w);
  assert.ok(ops.some((o) => o.op === "fillRect" && o.args[0] === px && o.args[1] === 0 && (o.args[2] as number) > 20 && o.args[3] === PROGRESS_H), "the pedal's span");
});

test("D251: LADDER and the computer: the line in both; BAR n / N once (on the computer's fugue map, not twice)", () => {
  const f = fugueById("wtc1f02");
  const lad = at("wtc1f02", "ladder", 1, 9000);
  const r1 = recorder();
  paintProto(r1.c, 844, 390, lad, new Set());
  assert.ok(filled(r1.ops, 844));
  assert.ok(texts(r1.ops).includes(`BAR ${barNumberAt(f, lad.now)} / ${f.bars[f.bars.length - 1].n}`));
  const keys = at("wtc1f02", "keys", 1, 9000);
  const r2 = recorder();
  paintProto(r2.c, 1280, 760, keys, new Set());
  assert.ok(filled(r2.ops, 1280));
  const bars = texts(r2.ops).filter((s) => /^BAR \d/.test(s));
  assert.deepEqual(bars, [`BAR ${barNumberAt(f, keys.now)} / ${f.bars[f.bars.length - 1].n}`]);
});
