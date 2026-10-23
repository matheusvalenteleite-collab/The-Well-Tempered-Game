/** D238: the fugue's architecture beside the computer's HIGHWAY: the road the player's alone, the voices on rails, the fugue map. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { paintProto } = await import("../src/bench/paint-proto.ts");
const { deskGeom } = await import("../src/bench/paint-desk.ts");
const { railsOf, railX, fugueMap, railLabel, mapBottom, gameRails } = await import("../src/bench/paint-arch.ts");
const { inkOf } = await import("../src/touch/MusicBox.tsx");

const g0 = globalThis as unknown as Record<string, unknown>;
g0.document ??= { documentElement: {} };
g0.getComputedStyle ??= () => ({ getPropertyValue: () => "" });

/** A drawn mark: the operation, its style, and its points (a path's, gathered since beginPath). */
type Mark = { op: string; style: unknown; pts: [number, number][]; text?: string };
function recorder(): { c: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = [];
  const state: Record<string, unknown> = { fillStyle: "#000", strokeStyle: "#000" };
  let path: [number, number][] = [];
  const gradient = { addColorStop: () => {} };
  const c = new Proxy(state, {
    get(s, k: string) {
      if (k in s) return s[k];
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => gradient;
      if (k === "measureText") return () => ({ width: 10 });
      return (...a: number[]) => {
        if (k === "beginPath") path = [];
        else if (k === "moveTo" || k === "lineTo") path.push([a[0], a[1]]);
        else if (k === "fill") marks.push({ op: k, style: s.fillStyle, pts: path });
        else if (k === "stroke") marks.push({ op: k, style: s.strokeStyle, pts: path });
        else if (k === "fillRect") marks.push({ op: k, style: s.fillStyle, pts: [[a[0], a[1]], [a[0] + a[2], a[1] + a[3]]] });
        else if (k === "strokeRect") marks.push({ op: k, style: s.strokeStyle, pts: [[a[0], a[1]], [a[0] + a[2], a[1] + a[3]]] });
        else if (k === "fillText") marks.push({ op: k, style: s.fillStyle, pts: [[a[1], a[2]]], text: String(a[0]) });
      };
    },
    set(s, k: string, v) {
      s[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { c, marks };
}
function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    groove: () => false,
  } as unknown as Chip;
}
function at(id: string, voice: number, tick: number) {
  const clock = { t: 0 };
  const g = new ProtoGame(fugueById(id), voice, 0, protoById("keys"), { bpm: 60, legato: false, easy: "direction" }, fakeChip(clock));
  while (g.now < tick) (clock.t += 0.05), g.step();
  return g;
}
const [w, h] = [1280, 760];

test("the rails: higher voices right, lower left, the nearest in register next to the road", () => {
  const f = fugueById("wtc1f01"); // S A T B
  const alto = railsOf(f, 1, new Set([1]));
  assert.deepEqual(alto.map((r) => [r.voice, r.side, r.slot, r.initial]), [[0, 1, 0, "S"], [2, -1, 0, "T"], [3, -1, 1, "B"]]);
  const bass = railsOf(f, 3, new Set([3]));
  assert.deepEqual(bass.map((r) => [r.voice, r.side, r.slot]), [[2, 1, 0], [1, 1, 1], [0, 1, 2]]);
  // Outside the road, further out slot by slot, at every depth.
  const road = { cx: w / 2, W: deskGeom(w, h).W };
  for (const k of [0.3, 0.6, 1]) {
    let last = road.W / 2;
    for (const r of bass) {
      const d = railX(road, r, k, r.lo) - road.cx;
      assert.ok(d > (road.W / 2) * k, "outside the road's edge");
      assert.ok(railX(road, r, k) - road.cx > last * k, "outwards slot by slot");
      last = (railX(road, r, k) - road.cx) / k;
    }
  }
  assert.equal(railLabel(f, 1), "SOPRANO · ANSWER");
});

test("the road draws no other voice's notes: their colours and the rails' dashes stay on the shoulders", () => {
  for (const [id, voice, tick] of [["wtc1f02", 2, 112000], ["wtc1f01", 1, 52000], ["wtc1f01", 3, 30000]] as const) {
    const g = at(id, voice, tick);
    const { c, marks } = recorder();
    paintProto(c, w, h, g, new Set());
    const { y0, y1, W } = deskGeom(w, h);
    const inks = new Set(g.f.voices.map((_, v) => v).filter((v) => v !== voice).map((v) => inkOf(v, g.f.voices.length)));
    let seen = 0;
    for (const m of marks) {
      const dash = typeof m.style === "string" && m.style.startsWith("rgba(225,228,240");
      if (!dash && !inks.has(m.style as string)) continue;
      for (const [x, y] of m.pts) {
        if (y < y0 || y > y1) continue;
        const k = 0.3 + 0.7 * ((y - y0) / (y1 - y0));
        seen++;
        assert.ok(Math.abs(x - w / 2) >= (W / 2) * k - 1, `${id}: ${m.op} ${m.text ?? ""} at ${x},${y} on the road`);
      }
    }
    assert.ok(seen > 20, `${id}: the other voices drawn (on their rails)`);
  }
});

test("a voice's rail lights in its colour while it states the subject (I/2: the alto's answer, bar 15)", () => {
  const g = at("wtc1f02", 2, 112000);
  const { c, marks } = recorder();
  paintProto(c, w, h, g, new Set());
  const { y1 } = deskGeom(w, h);
  const alto = inkOf(1, 3);
  const rails = gameRails(g);
  assert.deepEqual(rails.map((r) => [r.voice, r.side, r.slot]), [[1, 1, 0], [0, 1, 1]], "the bass plays: alto then soprano on the right");
  const initial = (s: string) => marks.find((m) => m.op === "fillText" && m.text === s && Math.abs(m.pts[0][1] - (y1 + 14)) < 1);
  assert.equal(initial("A")?.style, alto, "the alto's initial lit");
  assert.notEqual(initial("S")?.style, inkOf(0, 3), "the soprano's not");
  assert.ok(marks.some((m) => m.op === "stroke" && m.style === alto && m.pts.length > 6), "the answer's contour along the rail");
});

test("the fugue map: one block per entry, in its voice's colour and row; cadences and NOW", () => {
  for (const f of FUGUES) {
    const m = fugueMap(f);
    assert.equal(m.entries.length, f.entries.length, f.id);
    f.entries.forEach((e, i) => assert.deepEqual([m.entries[i].voice, m.entries[i].on, m.entries[i].end], [e.voice, e.on, e.end], f.id));
    assert.equal(m.cadences.length, f.cadences.length, f.id);
  }
  // D244: Fugue 1's map is built as it is played (below); Fugue 2's drawn whole.
  const g = at("wtc1f02", 1, 52000);
  const { c, marks } = recorder();
  paintProto(c, w, h, g, new Set());
  const inks = new Set(g.f.voices.map((_, v) => inkOf(v, 3)));
  const blocks = marks.filter((m) => m.op === "fillRect" && inks.has(m.style as string) && m.pts[1][1] <= mapBottom(3));
  assert.equal(blocks.length, g.f.entries.length, "a block per entry");
  assert.ok(marks.some((m) => m.op === "fillText" && /^BAR \d+$/.test(m.text ?? "")), "the bar");
});

test("D244: Fugue 1's map is built: the entries begun filled, the rest outlined (the plan)", () => {
  const g = at("wtc1f01", 1, 52000);
  const { c, marks } = recorder();
  paintProto(c, w, h, g, new Set());
  const inks = new Set(g.f.voices.map((_, v) => inkOf(v, 4)));
  const onMap = (m: Mark) => inks.has(m.style as string) && m.pts[1][1] <= mapBottom(4);
  const begun = g.f.entries.filter((e) => e.on <= g.now).length;
  const filled = marks.filter((m) => m.op === "fillRect" && onMap(m));
  const outlined = marks.filter((m) => m.op === "strokeRect" && onMap(m));
  assert.ok(begun > 0 && begun < g.f.entries.length);
  assert.equal(filled.length, begun, "a stone (or a stone under way) per entry begun");
  const under = g.f.entries.filter((e) => e.on <= g.now && e.end > g.now).length;
  assert.equal(outlined.length, g.f.entries.length - begun + under, "an outline per entry to come (and round each under way)");
});
