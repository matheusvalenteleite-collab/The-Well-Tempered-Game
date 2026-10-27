/**
 * D326, TOOLS (play.html): PRACTICE (unscored bars, LOOP, tempo 50-100%, WAIT FOR ME) and REHEARSAL
 * (HEAR THE OTHERS, solo and mute per voice, the player's own level −6 to +3 dB).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { balanceGain, mineGain, practiceOptions, practiceRun, readTools, saneTools, saveTools, silenced, toolsDefault, TOOLS_KEY } from "../src/bench/practice.ts";
import { TOOLS_ES, TOOLS_PT, tt } from "../src/bench/tools-i18n.ts";
import { useLang } from "../src/i18n/index.ts";

interface Rec {
  midi: number;
  at: number;
  lead: boolean;
}
function fakeChip(clock: { t: number }) {
  const notes: Rec[] = [];
  const chip = {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    visual: 0,
    note: (midi: number, at: number, _d: number, _v: unknown, p?: { lead?: boolean }) => {
      notes.push({ midi, at, lead: !!p?.lead });
      return { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} };
    },
    swoosh() {},
    tick() {},
  };
  return { chip: chip as unknown as Chip, notes };
}
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => 400 };

const f2 = fugueById("wtc1f02");

test("D326: the stored tools made sound for the piece (bars in range and ordered, tempo 50-100 by 5, balance −6..+3, voices real)", () => {
  const d = toolsDefault(f2);
  assert.deepEqual(saneTools(f2, null), d);
  assert.equal(d.tempo, 75);
  assert.equal(d.loop, true);
  assert.equal(d.wait, false);
  assert.equal(d.balance, 0);
  const s = saneTools(f2, { fromBar: 9, toBar: 4, tempo: 130, balance: 12, mute: [2, 2, 7, -1], solo: [1.5 as number], loop: false, wait: true });
  assert.equal(s.fromBar, 9);
  assert.equal(s.toBar, 9, "the end never before the start");
  assert.equal(s.tempo, 100);
  assert.equal(s.balance, 3);
  assert.deepEqual(s.mute, [2]);
  assert.deepEqual(s.solo, []);
  assert.equal(s.loop, false);
  assert.equal(s.wait, true);
  assert.equal(saneTools(f2, { tempo: 12, balance: -40 }).tempo, 50);
  assert.equal(saneTools(f2, { balance: -40 }).balance, -6);
  assert.equal(saneTools(f2, { toBar: 9999 }).toBar, f2.bars.at(-1)!.n);
});

test("D326: kept per piece on the device; storage that throws or is missing leaves the defaults", () => {
  const g = globalThis as { localStorage?: unknown };
  const was = g.localStorage;
  try {
    const box = new Map<string, string>();
    g.localStorage = { getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => void box.set(k, v) };
    const f7 = fugueById("wtc1f07");
    saveTools(f2, { ...toolsDefault(f2), fromBar: 3, toBar: 5, tempo: 60, balance: -2.5, mute: [2] });
    saveTools(f7, { ...toolsDefault(f7), tempo: 90 });
    assert.equal(readTools(f2).tempo, 60);
    assert.equal(readTools(f2).balance, -2.5);
    assert.deepEqual(readTools(f2).mute, [2]);
    assert.equal(readTools(f7).tempo, 90);
    assert.equal(readTools(fugueById("wtc1f01")).tempo, 75, "another piece: its defaults");
    assert.ok(JSON.parse(box.get(TOOLS_KEY)!).wtc1f02);
    box.set(TOOLS_KEY, "{not json");
    assert.deepEqual(readTools(f2), toolsDefault(f2));
    g.localStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    assert.deepEqual(readTools(f2), toolsDefault(f2));
    saveTools(f2, toolsDefault(f2));
  } finally {
    g.localStorage = was;
  }
});

test("D326: the balance is a fixed gain, −6 to +3 dB; silent only while the others are heard alone", () => {
  assert.equal(balanceGain(0), 1);
  assert.ok(Math.abs(balanceGain(-6) - 0.5012) < 1e-3);
  assert.ok(Math.abs(balanceGain(3) - 1.4125) < 1e-3);
  assert.equal(balanceGain(20), balanceGain(3));
  assert.equal(balanceGain(-20), balanceGain(-6));
  assert.equal(balanceGain(Number.NaN), 1);
  const s = { ...toolsDefault(f2), balance: -3 };
  const run = practiceRun(f2, s, 0, 80, false);
  // The level depends on the balance (and on listening) only: nothing about the notes played enters it.
  assert.equal(mineGain(-3, null), balanceGain(-3));
  assert.equal(mineGain(-3, run), balanceGain(-3));
  assert.equal(mineGain(-3, practiceRun(f2, s, 0, 80, true)), 0);
  assert.equal(mineGain.length, 2);
});

test("D326: solo and mute: a voice soloed silences every other band voice; muted voices otherwise; never the player's own", () => {
  assert.deepEqual(silenced({ mute: [], solo: [] }, 4, 1), []);
  assert.deepEqual(silenced({ mute: [0, 1], solo: [] }, 4, 1), [0]);
  assert.deepEqual(silenced({ mute: [], solo: [2] }, 4, 1), [0, 3]);
  assert.deepEqual(silenced({ mute: [2], solo: [2, 3] }, 4, 1), [0]);
  assert.deepEqual(silenced({ mute: [], solo: [1] }, 4, 1), [], "soloing one's own voice silences nobody");
});

test("D326: a practice run: the bars chosen, the tempo scaled, no crowd, no hints; HEAR THE OTHERS never waits and is played by the game", () => {
  const s = { ...toolsDefault(f2), fromBar: 3, toBar: 5, tempo: 60, wait: true, mute: [2] };
  const p = practiceRun(f2, s, 0, 80, false);
  assert.equal(p.from, barStart(f2, 3));
  assert.equal(p.until, barStart(f2, 6));
  assert.equal(p.bpm, 48);
  assert.equal(p.wait, true);
  assert.deepEqual(p.mute, [2]);
  assert.equal(p.bars, "3–5 · 60%");
  const o = practiceOptions(p);
  assert.equal(o.fail, false);
  assert.equal(o.ornHint, false);
  assert.equal(o.demo, false);
  assert.equal(o.until, p.until);
  const l = practiceRun(f2, s, 0, 80, true);
  assert.equal(l.wait, false);
  assert.equal(practiceOptions(l).demo, true);
});

test("D326: a muted voice's band notes are not sounded; the others are; the run ends at the last bar chosen and no crowd ends it", () => {
  const s = { ...toolsDefault(f2), fromBar: 7, toBar: 10, tempo: 100 };
  const sound = (mute: number[]) => {
    const clock = { t: 0 };
    const fc = fakeChip(clock);
    const p = practiceRun(f2, { ...s, mute }, 0, 80, false);
    const g = new ProtoGame(f2, 0, p.from, protoById("ladder"), { legato: false, easy: "timing", ...practiceOptions(p) }, fc.chip);
    let done = false;
    while (!done && clock.t < 120) (clock.t += 1 / 60), (done = g.step());
    return { g, notes: fc.notes, done, p };
  };
  const all = sound([]);
  const muted = sound([2]);
  assert.ok(all.done && muted.done);
  assert.equal(muted.g.failedAt, null, "no crowd: nothing played, the run still goes to its end");
  assert.ok(muted.g.notes.every((n) => n.on >= muted.p.from && n.on < muted.p.until));
  const key = (r: Rec) => `${r.midi}@${Math.round(r.at * 100)}`;
  const heard = new Set(muted.notes.filter((r) => !r.lead).map(key));
  const alto = f2.voices[1].filter(([on]) => on >= muted.p.from && on < muted.p.until).length;
  const bass = f2.voices[2].filter(([on]) => on >= muted.p.from && on < muted.p.until).length;
  assert.ok(bass > 0 && alto > 0);
  const band = (r: { notes: Rec[] }) => r.notes.filter((x) => !x.lead).length;
  assert.ok(band(muted) < band(all), `fewer band notes with the bass muted (${band(muted)} vs ${band(all)})`);
  // Every band note sounded with the bass muted was sounded without the mute too (nothing else changed).
  const unmuted = new Set(all.notes.filter((r) => !r.lead).map(key));
  for (const k of heard) assert.ok(unmuted.has(k), k);
});

test("D326: WAIT FOR ME: the clock holds at the next note until it is played", () => {
  const clock = { t: 0 };
  const fc = fakeChip(clock);
  const p = practiceRun(f2, { ...toolsDefault(f2), fromBar: 3, toBar: 4, wait: true }, 0, 80, false);
  const g = new ProtoGame(f2, 0, p.from, protoById("ladder"), { legato: false, easy: "timing", ...practiceOptions(p) }, fc.chip);
  for (; clock.t < 20; clock.t += 1 / 60) g.step();
  const first = g.notes.find((n) => !n.ride)!;
  assert.ok(g.now <= first.on + 1, `held at the first note (${g.now} vs ${first.on})`);
  assert.ok(g.notes.every((n) => n.state !== "miss"), "nothing missed while waiting");
});

test("D326: HEAR THE OTHERS: the game plays the player's voice itself, every note through the player's own level (silenced there)", () => {
  const clock = { t: 0 };
  const fc = fakeChip(clock);
  const p = practiceRun(f2, { ...toolsDefault(f2), fromBar: 3, toBar: 6 }, 1, 80, true);
  const g = new ProtoGame(f2, 1, p.from, protoById("ladder"), { legato: false, easy: "timing", ...practiceOptions(p) }, fc.chip);
  g.rows = ROWS;
  let done = false;
  while (!done && clock.t < 120) (clock.t += 1 / 100), (done = g.step());
  const r = g.results();
  assert.ok(r.right >= r.of - 1, `the voice played through (${r.right}/${r.of})`);
  const own = new Set(g.notes.map((n) => n.midi));
  const lead = fc.notes.filter((x) => x.lead);
  assert.ok(lead.length >= g.notes.filter((n) => !n.ride).length * 0.8, `the voice's notes went to the player's level (${lead.length})`);
  assert.ok(lead.every((x) => own.has(x.midi) || own.has(x.midi + 1) || own.has(x.midi - 1) || own.has(x.midi + 2) || own.has(x.midi - 2)), "only the voice's own notes (and its ornaments) on the player's level");
});

test("D326: TOOLS' words in Portuguese and Spanish, the same blanks; every tt() text has them", () => {
  const vars = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  assert.deepEqual(Object.keys(TOOLS_PT).sort(), Object.keys(TOOLS_ES).sort());
  for (const [k, v] of [...Object.entries(TOOLS_PT), ...Object.entries(TOOLS_ES)]) assert.equal(vars(v), vars(k), k);
  for (const m of readFileSync("src/bench/ToolsPanel.tsx", "utf8").matchAll(/\btt\(\s*"((?:[^"\\]|\\.)*)"/g)) assert.ok(TOOLS_PT[m[1]], `pt lacks: ${m[1]}`);
  useLang("pt");
  assert.equal(tt("TEMPO {n}%", { n: 60 }), "ANDAMENTO 60%");
  useLang("es");
  assert.equal(tt("LAST PRACTICE: {n} OF {m} RIGHT", { n: 3, m: 9 }), "ÚLTIMA PRÁCTICA: 3 DE 9 CORRECTAS");
  useLang("en");
  assert.equal(tt("TOOLS"), "TOOLS");
});
