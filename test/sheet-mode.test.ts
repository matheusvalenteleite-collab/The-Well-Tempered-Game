/**
 * D298: the SHEET mode: the display setting (kept on the device, CANTUS falling back to the box), the
 * engraving's time map (tools/sheet/engrave.ts → public/sheet) and the playhead's sync with the engine's
 * clock over whole fugues, the final ritard included.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { DISPLAY_KEY, SHEET_FONT, SHEET_INK, SHEET_PLAYHEAD, SHEET_UNIT, displayOf, drawnAs, engraved, entryBand, layoutOf, markInk, paperInk, playheadX, readDisplay, saveDisplay, sheetNotes, tickAtX, timeMap, xAtTick, type SheetData, type SheetNote } from "../src/bench/sheet-format.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import type { Chip } from "../src/touch/chip.ts";
import { layoutKern } from "../tools/sheet/kern-layout.ts";
import { fugueKern } from "../tools/sheet/to-kern.ts";

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
  // D366: the kern written from the game's notes (tools/sheet/to-kern.ts), as the engraving reads it.
  const src = fugueKern("wtc1f01");
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

/** The box on an iPhone 13 held sideways (CSS px) and the staff space the view draws there (sheet-view.ts). */
const IPHONE = { w: 434, h: 272 };
const kOf = (d: SheetData) => Math.min(IPHONE.h / (d.h + 6.2 * SHEET_UNIT), 12 / SHEET_UNIT);

test("D300: the playhead toward the middle: the music played stays in sight right of the clefs", () => {
  assert.equal(SHEET_PLAYHEAD, 0.35);
  assert.equal(playheadX(400, 100), 205);
  assert.equal(playheadX(400, 0), 140);
  for (const id of ["wtc1f02", "wtc2f22", "wtc1f04", "wtc2f18"])
    for (const layout of ["grand", "open"] as const) {
      const d = sheet(id, layout);
      const column = d.lead * kOf(d);
      const x = playheadX(IPHONE.w, column);
      // 40–55% from the box's left edge (D298: 30%), whatever the key signature's width.
      assert.ok(x / IPHONE.w >= 0.4 && x / IPHONE.w <= 0.55, `${id} ${layout}: ${(x / IPHONE.w).toFixed(2)}`);
      // What was played: at least a fifth of the box in sight, about half as much as what is coming.
      const past = x - column;
      const coming = IPHONE.w - x;
      assert.ok(past / IPHONE.w >= 0.2, `${id} ${layout}: ${past.toFixed(0)} px played in sight`);
      assert.ok(Math.abs(past / coming - 0.35 / 0.65) < 0.02);
      assert.ok(column / IPHONE.w < 0.3, `${id} ${layout}: the clefs' column ${column.toFixed(0)} px`);
    }
});

test("D300: each entry's band spans its first note to its last, on its voice's notes (two staves) or its staff (open score)", () => {
  for (const id of ["wtc1f02", "wtc2f22"]) {
    const f = fugueById(id);
    const spans = entrySpans(f).filter((s) => s.form !== "counter");
    assert.ok(spans.length >= 4, `${id}: ${spans.length} entries`);
    for (const layout of ["grand", "open"] as const) {
      const d = sheet(id, layout);
      const notes = sheetNotes(d);
      let banded = 0;
      for (const s of spans) {
        // The heads the view finds (sheet-view.ts headsAt: the top head of the voice at each onset).
        const heads = s.path
          .map((n) => notes.filter((e) => e[0] === s.voice && e[1] === n.on).sort((a, b) => a[4] - b[4])[0])
          .filter((e) => !!e)
          .map((e) => ({ x: e[3], y: e[4] }));
        const b = entryBand(d, s.voice, heads);
        if (!heads.length) {
          assert.equal(b, null);
          continue;
        }
        assert.ok(b);
        banded++;
        // From the first head to the last, 0.9 space beyond each.
        assert.equal(b.x0, heads[0].x - 0.9 * SHEET_UNIT);
        assert.equal(b.x1, heads[heads.length - 1].x + 0.9 * SHEET_UNIT);
        for (const h of heads) assert.ok(h.y > b.y0 && h.y < b.y1 && h.x > b.x0 && h.x < b.x1, `${id} ${layout}: a head outside its band`);
        const st = d.staves.findIndex((x) => x.voices.includes(s.voice));
        const staff = d.staves[st];
        if (layout === "open") {
          // Its staff's five lines inside; the neighbours' middle lines outside.
          assert.ok(b.y0 < staff.top && b.y1 > staff.top + 4 * SHEET_UNIT);
          if (d.staves[st + 1]) assert.ok(b.y1 < d.staves[st + 1].top + 2 * SHEET_UNIT, `${id}: the band into the staff below`);
          if (d.staves[st - 1]) assert.ok(b.y0 > d.staves[st - 1].top + 2 * SHEET_UNIT, `${id}: the band into the staff above`);
        } else {
          // Hugging its voice's heads (0.9 space beyond), never on the other staff's lines.
          const ys = heads.map((h) => h.y);
          assert.ok(Math.abs(b.y1 - b.y0 - (Math.max(...ys) - Math.min(...ys) + 1.8 * SHEET_UNIT)) < 1e-6);
          const other = d.staves[1 - st];
          assert.ok(b.y1 < other.top || b.y0 > other.top + 4 * SHEET_UNIT, `${id} grand: the band on the other staff`);
        }
      }
      assert.ok(banded / spans.length > 0.95, `${id} ${layout}: ${banded} of ${spans.length} banded`);
    }
  }
});

test("D300: one staff per voice in black ink, the two staves in the voices' colours; the plate in Leland", () => {
  for (let v = 0; v < 4; v++) {
    assert.equal(markInk("open", v + 1, 4), SHEET_INK, "the open score: every voice black");
    assert.equal(markInk("grand", v + 1, 4), paperInk(v, 4), "the two staves: each voice its colour");
  }
  assert.equal(markInk("grand", 0, 4), SHEET_INK);
  assert.equal(new Set([0, 1, 2, 3].map((v) => paperInk(v, 4))).size, 4);
  assert.equal(SHEET_FONT, "Leland");
  for (const id of ["wtc1f02", "wtc2f22"]) for (const layout of ["grand", "open"] as const) assert.equal(sheet(id, layout).font, SHEET_FONT);
  assert.ok(existsSync(new URL(`../public/sheet/glyphs-${SHEET_FONT}.json`, import.meta.url)));
});
