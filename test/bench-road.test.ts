/** D220: the computer's HIGHWAY on its road alone (no music box), G's lane its own; the phone's roads still painted. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById, PROTOS, roadAlone } from "../src/bench/protos.ts";

// The painters import MusicBox.tsx (its colours): loaded transpiled (test/tsx-hooks.mjs).
register("./tsx-hooks.mjs", import.meta.url);
const { paintProto } = await import("../src/bench/paint-proto.ts");
const { deskGeom, G_LANE, SEAM } = await import("../src/bench/paint-desk.ts");

// The browser the painter expects: the theme's tokens (none: their fallbacks).
const g0 = globalThis as unknown as Record<string, unknown>;
g0.document ??= { documentElement: {} };
g0.getComputedStyle ??= () => ({ getPropertyValue: () => "" });

type Op = { op: string; args: unknown[]; fill: unknown; stroke: unknown };
/** A 2D context that records what is drawn (each call with the fill and stroke styles in force). */
function recorder(): { c: CanvasRenderingContext2D; ops: Op[] } {
  const ops: Op[] = [];
  const state: Record<string, unknown> = { fillStyle: "#000", strokeStyle: "#000" };
  const gradient = { addColorStop: () => {} };
  const c = new Proxy(state, {
    get(s, k: string) {
      if (k in s) return s[k];
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => gradient;
      if (k === "measureText") return () => ({ width: 10 });
      return (...args: unknown[]) => void ops.push({ op: k, args, fill: s.fillStyle, stroke: s.strokeStyle });
    },
    set(s, k: string, v) {
      s[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { c, ops };
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

/** A game of a prototype on a fugue, run to a tick. */
function at(id: string, proto: string, voice: number, tick: number) {
  const clock = { t: 0 };
  const f = fugueById(id);
  const g = new ProtoGame(f, voice, 0, protoById(proto), { bpm: 60, legato: false, easy: "direction" }, fakeChip(clock));
  while (g.now < tick) (clock.t += 0.05), g.step();
  return g;
}

const texts = (ops: Op[]) => ops.filter((o) => o.op === "fillText").map((o) => String(o.args[0]));

test("the computer's HIGHWAY plays on its road alone: the music box hidden while playing", () => {
  const keys = protoById("keys");
  assert.equal(roadAlone(keys, true), true);
  assert.equal(roadAlone(keys, false), false, "the title and the result keep the box (its cards)");
  for (const p of PROTOS.filter((p) => p.id !== "keys")) assert.equal(roadAlone(p, true), false, p.id);
  const css = readFileSync(new URL("../src/bench/bench.css", import.meta.url), "utf8");
  assert.match(css, /\.tb-road \.tg-box \{ display: none; \}/);
  const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  assert.match(app, /roadAlone\(proto, playing\) \? " tb-road"/);
});

test("the computer's road: G its own lane (the seam, the shared key), the hands named, the space bar; the fugue on it", () => {
  // I/2, the alto from the start, at its second entry (the soprano's, bar 3) under way.
  const g = at("wtc1f02", "keys", 1, 17000);
  const { c, ops } = recorder();
  const [w, h] = [1280, 760];
  paintProto(c, w, h, g, new Set());
  const tx = texts(ops);
  // No music box drawn on the road's canvas: no box rows; the road is the whole frame.
  const { y1, W } = deskGeom(w, h);
  assert.ok(W > 620, "a larger road than beside the box");
  // G: its seam down the lane's middle (gold), its key-cap framed and marked SHARED.
  const gx = w / 2 - W / 2 + ((G_LANE + 0.5) * W) / 9;
  assert.ok(Math.abs(gx - w / 2) < 1, "G is the middle lane");
  assert.ok(ops.some((o) => o.op === "fillRect" && o.fill === SEAM && Math.abs((o.args[0] as number) + (o.args[2] as number) / 2 - w / 2) < 3 && (o.args[1] as number) < y1), "the gold seam down G");
  assert.ok(ops.some((o) => o.op === "strokeRect" && o.stroke === SEAM && Math.abs((o.args[0] as number) + (o.args[2] as number) / 2 - w / 2) < 1), "G's key-cap framed in gold");
  for (const word of ["G", "SHARED", "LEFT HAND", "RIGHT HAND", "SPACE · THUMBS · THE SAME NOTE AGAIN"]) assert.ok(tx.includes(word), word);
  // The soprano's entry under way: its rail lit; the alto's next entry named at its gate, or an end.
  // (D238: the others' entries named as their rails name them: SOPRANO · ANSWER.)
  assert.ok(tx.some((s) => s.startsWith("YOUR ENTRY") || s.includes("SUBJECT") || s.includes("ANSWER")), "an entry named on the road");
});

test("the computer's road names cadences and strettos (I/5)", () => {
  const f = fugueById("wtc1f05");
  // A cadence ahead: its gate named.
  const cad = f.cadences[0];
  const g = at("wtc1f05", "keys", 0, cad.on - 1.5 * 960);
  const r = recorder();
  paintProto(r.c, 1280, 760, g, new Set());
  assert.ok(texts(r.ops).some((s) => s.includes("·") && /CADENCE|HALF|DECEPTIVE|PHRYGIAN|PERFECT|IMPERFECT/.test(s)), "the cadence's gate");
  // A stretto: called out as it comes, its name over the road while it lasts.
  const s = at("wtc1f05", "keys", 3, 78720 - 1440);
  const r1 = recorder();
  paintProto(r1.c, 1280, 760, s, new Set());
  assert.ok(texts(r1.ops).some((x) => x.startsWith("STRETTO!")), texts(r1.ops).join("|"));
});

test("the phone's HIGHWAY and SUBJECT still paint on their own roads (no desk marks)", () => {
  for (const proto of ["highway", "subject"]) {
    const g = at("wtc1f02", proto, 1, 17000);
    const { c, ops } = recorder();
    paintProto(c, 390, 800, g, new Set());
    const tx = texts(ops);
    assert.ok(!tx.includes("SHARED") && !tx.some((s) => s.startsWith("SPACE")), proto);
    assert.ok(ops.length > 50, proto);
    if (proto === "subject") assert.ok(tx.some((s) => s.includes("SUBJECT")), "SUBJECT names its entry");
  }
});
