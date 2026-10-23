/** D228: ⚙ INTERFACE: the interfaces offered, the choice kept on the device, each drawn without a fault. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { fugueById } from "../src/touch/fugue.ts";
import { laneNotes } from "../src/touch/lanes.ts";
import { accompaniment, entrySpans, stepRange, subjectMarks } from "../src/touch/voice-mode.ts";
import { beatOf } from "../src/touch/fugue.ts";

// The browser the painters expect: storage, a document, Path2D (the engraved glyphs).
const g0 = globalThis as unknown as Record<string, unknown>;
const store = new Map<string, string>();
g0.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
g0.getComputedStyle ??= () => ({ getPropertyValue: () => "" });
g0.Path2D ??= class {
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  bezierCurveTo() {}
  closePath() {}
};

register("./tsx-hooks.mjs", import.meta.url);
const ui = await import("../src/touch/ui/index.ts");
const { paintClassic } = await import("../src/touch/MusicBox.tsx");

/** A canvas whose 2D context accepts every call (and counts them). */
function fakeCanvas() {
  let calls = 0;
  const state: Record<string, unknown> = { fillStyle: "#000", strokeStyle: "#000", font: "10px sans-serif" };
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy(state, {
    get(s, k: string) {
      if (k in s) return s[k];
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return () => gradient;
      if (k === "measureText") return (t: string) => ({ width: String(t).length * 6 });
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      return () => void calls++;
    },
    set(s, k: string, v) {
      s[k] = v;
      return true;
    },
  });
  const c = { width: 0, height: 0, style: {} as Record<string, string>, getContext: () => ctx };
  return { c: c as unknown as HTMLCanvasElement, calls: () => calls };
}

/** The box's frame in I/2's alto, LADDER (the voice's range, the rest spilling), a quarter into an entry. */
function frame(arrows: boolean) {
  const f = fugueById("wtc1f02");
  const voice = 1;
  const b = beatOf(f);
  const spans = entrySpans(f);
  const e = spans.find((s) => s.voice === voice && s.form !== "counter" && s.on > 0)!;
  const now = e.on + (e.end - e.on) / 4;
  const steps = f.voices[voice].map((n) => n[3]);
  const notes = laneNotes(f.voices[voice], b.ticks, voice).map((n, i) => (n.on < now ? { ...n, state: i % 5 ? ("hit" as const) : ("miss" as const), at: n.on } : n));
  return {
    now,
    tps: 400,
    key: f.key,
    barTicks: f.barTicks,
    beatTicks: b.ticks,
    count: f.voices.length,
    lo: Math.min(...steps) - 1,
    hi: Math.max(...steps) + 1,
    spill: stepRange(f),
    voice,
    notes,
    others: accompaniment(f, 0, voice),
    ...subjectMarks(f),
    spans,
    names: f.voiceNames,
    piece: f.id,
    entryState: new Map([[`${e.voice}:${e.on}`, "open" as const]]),
    arrows: arrows ? notes.map(() => "up" as const) : undefined,
  };
}

test("D228: INTERFACE lists CLASSIC, the RETRO pair, NETHACK, WIN95 and whatever else is offered, each named with a line", () => {
  const opts = ui.uiOptions();
  const ids = opts.map((o) => o.id);
  assert.equal(ids[0], "classic");
  for (const id of ["gameboy", "gbc", "nethack", "win95"]) assert.ok(ids.includes(id), id);
  for (const id of ids.slice(1)) assert.ok(id in ui.TEMPLATES, id);
  assert.deepEqual(ids.slice(1), ui.OFFERED.filter((id) => id in ui.TEMPLATES));
  for (const o of opts) {
    assert.ok(o.name.length > 0 && o.desc.length > 10 && !o.desc.includes("\n"), o.id);
  }
  assert.equal(opts.find((o) => o.id === "gameboy")!.family, "RETRO");
  assert.equal(opts.find((o) => o.id === "gbc")!.family, "RETRO");
  assert.equal(opts.find((o) => o.id === "gbc")!.name, "GAME BOY COLOR");
  // The study's other templates stay behind ?ui= only.
  for (const id of ["manuscript", "ocarina", "pianola", "tunnel"]) assert.ok(!ids.includes(id), id);
});

test("D228: the choice is kept on the device; an unknown one changes nothing; the button names it", () => {
  assert.equal(ui.storedUi(), "classic");
  assert.equal(ui.uiNow(), "classic");
  assert.equal(ui.uiActive(), false);
  assert.equal(ui.uiLabel("classic"), "INTERFACE · CLASSIC");
  ui.setUi("nethack");
  assert.equal(store.get(ui.UI_KEY), "nethack");
  assert.equal(ui.storedUi(), "nethack");
  assert.equal(ui.uiNow(), "nethack");
  assert.equal(ui.uiActive(), true);
  assert.equal(ui.uiLabel(ui.uiNow()), "INTERFACE · NETHACK");
  ui.setUi("nonsense");
  assert.equal(ui.uiNow(), "nethack");
  store.set(ui.UI_KEY, "pianola"); // not offered: read back as CLASSIC
  assert.equal(ui.storedUi(), "classic");
  ui.setUi("classic");
  assert.equal(ui.uiActive(), false);
  // Storage that throws: CLASSIC, no fault.
  const saved = g0.localStorage;
  g0.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(ui.storedUi(), "classic");
  ui.setUi("win95");
  assert.equal(ui.uiNow(), "win95");
  g0.localStorage = saved;
  ui.setUi("classic");
});

test("D228: every interface offered draws a frame (phone LADDER and computer arrows, and a thumbnail) without a fault", () => {
  for (const o of ui.uiOptions())
    for (const [w, h, arrows] of [[520, 300, false], [1000, 330, true], [336, 150, false]] as const) {
      const fr = frame(arrows);
      const { c, calls } = fakeCanvas();
      if (o.id === "classic") paintClassic(c, w, h, fr);
      else ui.paintTemplate(c, ui.TEMPLATES[o.id], w, h, fr);
      assert.ok(calls() > 50, `${o.id} drew ${calls()} calls`);
    }
});

test("D228: the side bars' rows are the player's range, linear, and as tall as the interface draws them", () => {
  const f = fugueById("wtc1f02");
  const steps = f.voices[1].map((n) => n[3]);
  const range = { lo: Math.min(...steps) - 1, hi: Math.max(...steps) + 1 };
  for (const id of ["gameboy", "gbc", "nethack", "win95"]) {
    ui.setUi(id);
    const rows = ui.uiRows(f.id, 1, range, 300)!;
    const geo = ui.TEMPLATES[id].geo({ f, voice: 1, range, w: 600, h: 300 });
    for (let s = range.lo; s <= range.hi; s++) assert.ok(Math.abs(rows.yOf(s) - geo.yOf(s, 1)) < 1e-6, `${id} ${s}`);
    assert.equal(rows.rowH, geo.A(1));
    // The voice's rows larger than the piece's whole range would give them; the spill squeezed but shown.
    const all = stepRange(f);
    assert.ok(rows.rowH > ui.TEMPLATES[id].geo({ f, voice: 1, range: all, w: 600, h: 300 }).A(1), id);
    assert.ok(geo.yOf(all.hi, 1) >= 0 && geo.yOf(all.lo, 1) <= 300, id);
  }
  ui.setUi("classic");
});
