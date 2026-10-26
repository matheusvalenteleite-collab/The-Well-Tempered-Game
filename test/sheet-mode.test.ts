/**
 * D298: the SHEET mode: the display setting (kept on the device, CANTUS falling back to the box), the
 * engraving's time map (tools/sheet/engrave.ts → public/sheet) and the playhead's sync with the engine's
 * clock over whole fugues, the final ritard included.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { DISPLAY_KEY, SHEET_UNIT, displayOf, drawnAs, engraved, layoutOf, readDisplay, saveDisplay, sheetNotes, tickAtX, timeMap, xAtTick, type SheetData, type SheetNote } from "../src/bench/sheet-format.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import type { Chip } from "../src/touch/chip.ts";
import { layoutKern } from "../tools/sheet/kern-layout.ts";

const sheet = (id: string, layout: "grand" | "open"): SheetData => JSON.parse(readFileSync(new URL(`../public/sheet/${id}.${layout}.json`, import.meta.url), "utf8"));

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    groove: () => true,
  } as unknown as Chip;
}

test("D298: the display setting: four modes, kept on the device, CANTUS drawn as the box", () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  try {
    assert.equal(readDisplay(), "default");
    saveDisplay("sheet2");
    assert.equal(store.get(DISPLAY_KEY), "sheet2");
    assert.equal(readDisplay(), "sheet2");
    saveDisplay("sheetN");
    assert.equal(readDisplay(), "sheetN");
    saveDisplay("default");
    assert.equal(store.has(DISPLAY_KEY), false);
    store.set(DISPLAY_KEY, "piano-roll");
    assert.equal(readDisplay(), "default");
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  assert.equal(readDisplay(), "default", "no storage: DEFAULT");
  assert.equal(displayOf("cantus"), "cantus");
  assert.equal(drawnAs("cantus"), "default");
  assert.equal(layoutOf("cantus"), null);
  assert.equal(layoutOf("default"), null);
  assert.equal(layoutOf("sheet2"), "grand");
  assert.equal(layoutOf("sheetN"), "open");
  assert.ok(engraved("wtc1f02") && engraved("wtc2f22"));
  assert.ok(!engraved("wtc1p01") && !engraved("aof14") && !engraved("inv01"));
});

test("D298: the time map: x rising through the onsets, linear between, its inverse", () => {
  const notes: SheetNote[] = [
    [0, 0, 60, 100, 0],
    [1, 0, 64, 110, 0],
    [2, 0, 67, 104, 0],
    [0, 480, 62, 300, 0],
    [0, 960, 64, 300, 0],
  ];
  const map = timeMap(notes, [1920, 900]);
  // The median head of a chord; a crowded onset nudged past the one before; the end.
  assert.deepEqual(map, [[0, 104], [480, 300], [960, 301], [1920, 900]]);
  assert.equal(xAtTick(map, 240), 202);
  assert.equal(xAtTick(map, 1440), 600.5);
  assert.ok(xAtTick(map, -480) < 104, "the count-in before the first note");
  assert.ok(Math.abs(tickAtX(map, xAtTick(map, 1234)) - 1234) < 1e-6);
});

test("D298: the kern laid out for the two staves and the open score keeps every voice", () => {
  const src = readFileSync(new URL("../data/sources/bach-wtc/kern/wtc1f01.krn", import.meta.url), "utf8");
  const grand = layoutKern(src, "grand");
  assert.deepEqual(grand.staves, [[0, 1], [2, 3]]);
  assert.equal(grand.kern.split("\n")[0], "**kern\t**kern");
  assert.equal(new Set(grand.voiceAt.values()).size, 4);
  // The ossia left out: no line with more than the voices' columns (a divisi aside) but those of the text.
  assert.ok(!grand.kern.includes("ossia"));
  const open = layoutKern(src, "open", [72, 65, 57, 48]);
  assert.deepEqual(open.staves, [[0], [1], [2], [3]]);
  assert.match(open.kern, /\*clefG2\t\*clefGv2\t\*clefG2\t\*clefG2|\*clefF4\t\*clefGv2\t\*clefG2\t\*clefG2/);
});

test("D298: every fugue engraved in both layouts, its notes the game's (99% at least)", () => {
  for (const f of FUGUES.filter((x) => engraved(x.id))) {
    for (const layout of ["grand", "open"] as const) {
      assert.ok(existsSync(new URL(`../public/sheet/${f.id}.${layout}.json`, import.meta.url)), `${f.id} ${layout}`);
      const d = sheet(f.id, layout);
      assert.equal(d.v, 2);
      const keys = new Set(sheetNotes(d).map(([v, t, m]) => `${v}:${t}:${m}`));
      const all = f.voices.flatMap((ns, v) => ns.map((n) => `${v}:${n[0]}:${n[2]}`));
      const found = all.filter((k) => keys.has(k)).length;
      assert.ok(found / all.length >= 0.99, `${f.id} ${layout}: ${found} of ${all.length}`);
      assert.equal(d.staves.length, layout === "open" ? f.voices.length : 2);
      assert.equal(d.bars.at(-1)?.[0], f.bars.at(-1)?.n, `${f.id} ${layout}: the last bar`);
    }
  }
});

/**
 * The playhead stands on the engraving's x for the engine's tick (the frame's `now`, ProtoGame.tickAtTime);
 * a note sounds when the engine's clock reaches its tick (ProtoGame.timeAt, the final ritard in it).
 *   column: when the playhead reaches the x of the note's onset (its column) against when it sounds;
 *   head:   when it reaches the note's own head (the player's voice's: the map goes through its heads).
 */
function syncErrors(id: string, layout: "grand" | "open", voice: number) {
  const f = fugueById(id);
  const d = sheet(id, layout);
  const notes = sheetNotes(d);
  const map = timeMap(notes, d.end, voice);
  const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false }, fakeChip({ t: 0 }));
  const column: number[] = [];
  const head: number[] = [];
  /** Heads the engraver moved aside (a unison or second between two voices on a staff), in staff spaces. */
  let aside = 0;
  let near = 0;
  for (const n of f.voices[voice].map((x) => ({ v: voice, on: x[0], midi: x[2] }))) {
    const h = notes.find((e) => e[0] === n.v && e[1] === n.on && e[2] === n.midi);
    if (!h) continue;
    const at = g.timeAt(n.on);
    // The frame's tick for the time the note sounds, its x, and back: the clock and the map agree.
    column.push(Math.abs(g.timeAt(tickAtX(map, xAtTick(map, g.tickAtTime(at)))) - at) * 1000);
    head.push(Math.abs(g.timeAt(tickAtX(map, h[3])) - at) * 1000);
    const off = Math.abs(h[3] - xAtTick(map, n.on)) / SHEET_UNIT;
    if (off >= 0.8) aside++;
    else if (off <= 0.25) near++;
  }
  // The playhead never goes back, through the final ritard to the end.
  let last = -Infinity;
  const t1 = g.timeAt(f.length);
  for (let t = g.timeAt(0); t <= t1; t += 0.01) {
    const x = xAtTick(map, g.tickAtTime(t));
    assert.ok(x >= last - 1e-6, `${id}: back at ${t.toFixed(2)} s`);
    last = x;
  }
  const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
  return { n: head.length, columnMax: Math.max(...column), headMedian: q(head, 0.5), headP90: q(head, 0.9), headP99: q(head, 0.99), near: near / head.length, aside: aside / head.length };
}

test("D298: the playhead on the sounding note over whole fugues, the final ritard included (ms)", () => {
  for (const id of ["wtc1f02", "wtc2f22", "wtc1f04", "wtc2f18"]) {
    for (const layout of ["grand", "open"] as const) for (let voice = 0; voice < fugueById(id).voices.length; voice++) {
      const s = syncErrors(id, layout, voice);
      if (process.env.SHEET_SYNC) console.log(id, layout, voice, JSON.stringify(s));
      // On each note's column when it sounds (the engine's clock and the map are one).
      assert.ok(s.columnMax < 1, `${id} ${layout}: the column within ${s.columnMax.toFixed(3)} ms`);
      // On the player's heads: all but a chord's second head exactly.
      assert.ok(s.headP99 < 5, `${id} ${layout} ${voice}: 99% within ${s.headP99.toFixed(2)} ms`);
    }
  }
});
