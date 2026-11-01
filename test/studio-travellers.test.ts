/**
 * The design studio (D465): twelve travellers glide along each entry (travellers.ts), one cast to each of the 48,
 * in the voice's own ink, within the budget, drawing only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TRAVELLERS, TRAVEL_CAST, drawTraveller, travellerOf, type TravelNote } from "../src/touch/travellers.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("twelve travellers, each cast at least once, one for every fugue of both books", () => {
  assert.equal(TRAVELLERS.length, 12);
  const ids = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
  assert.deepEqual(Object.keys(TRAVEL_CAST).sort(), ids);
  for (const k of TRAVELLERS) assert.ok(Object.values(TRAVEL_CAST).includes(k), k);
  assert.equal(travellerOf("wtc1f02"), "HOP");
  assert.equal(travellerOf("bwv1052-1"), "HOP");
});

function fake() {
  const rects: { x: number; y: number; w: number; h: number; style: string }[] = [];
  const g = { globalAlpha: 1, fillStyle: "", fillRect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h, style: this.fillStyle }); }, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {} };
  return { g: g as unknown as CanvasRenderingContext2D, rects };
}
const ns: TravelNote[] = [0, 1, 2, 3].map((k) => ({ on: k * 480, dur: 480, top: 60 - k * 5 }));

test("each traveller moves forward while the entry sounds (always something drawn, never at a note's place), nothing outside it", () => {
  for (const k of TRAVELLERS) {
    let lastX = -Infinity;
    for (const now of [100, 500, 900, 1300]) {
      const { g, rects } = fake();
      const used = drawTraveller(k, ns, { g, xOf: (t) => t / 10, now, beat: 480, t: 1.3, ink: "#5cb2ff", rim: "#bfe0ff", a: 1 }, 700);
      assert.ok(used > 0 && used <= 60, `${k} at ${now}: ${used}`);
      const xs = rects.map((r) => r.x + r.w / 2);
      const mid = xs.reduce((s, x) => s + x, 0) / xs.length;
      if (k !== "SKIP" && k !== "BOLT" && k !== "DROP") assert.ok(mid >= lastX - 8, `${k} goes forward`);
      lastX = mid;
    }
    const { g } = fake();
    assert.equal(drawTraveller(k, ns, { g, xOf: (t) => t / 10, now: 5000, beat: 480, t: 0, ink: "#5cb2ff", rim: "#bfe0ff", a: 1 }, 700), 0, `${k} after the entry`);
  }
});

test("drawn in place of the per-note effects, the voice's own ink, nothing read from right or wrong", () => {
  const fx = src("src/touch/box-fx.ts");
  assert.match(fx, /budget -= drawTraveller\(travellerOf\(piece\), TRAVEL_VIEW, \{ g, xOf, now, beat, t, ink: voiceInk, rim, a: mine \? 1 : OTHERS_SCALE \}, budget\);/);
  const tr = src("src/touch/travellers.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/state|"hit"|"miss"|score/.test(tr));
});
