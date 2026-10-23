/** D230, SCALE KEYS: the computer HIGHWAY's home row as the home key's scale, raised notes above, lowered below. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById, SCALE_HOW } from "../src/bench/protos.ts";
import { degreeOf, homeOf, keyOfDegree, keyPitch, rowShares, scaleKeys } from "../src/bench/scale-keys.ts";

/** A spelled pitch as (midi, staff step): "F#4", "Bb3". */
function sp(name: string) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)!;
  const L = "CDEFGAB".indexOf(m[1]);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const oct = Number(m[3]);
  return { midi: 12 * (oct + 1) + [0, 2, 4, 5, 7, 9, 11][L] + acc, step: 7 * oct + L };
}
const keyOf = (name: string, key: string) => {
  const p = sp(name);
  const d = degreeOf(p.midi, p.step, homeOf(key));
  return keyOfDegree(d.deg, d.alter).code.slice(3);
};

test("D230: C major: the scale on the home row; raised notes above (W E T Y U), lowered below (X C B N M), by spelling", () => {
  assert.deepEqual(["C4", "D4", "E4", "F4", "G4", "A4", "B4"].map((n) => keyOf(n, "C")), ["A", "S", "D", "F", "G", "H", "J"]);
  assert.deepEqual(["C#4", "D#4", "F#4", "G#4", "A#4"].map((n) => keyOf(n, "C")), ["W", "E", "T", "Y", "U"]);
  assert.deepEqual(["Db4", "Eb4", "Gb4", "Ab4", "Bb4"].map((n) => keyOf(n, "C")), ["X", "C", "B", "N", "M"]);
  // The rare ones: raised 3 and 7, lowered 4 and 1.
  assert.deepEqual(["E#4", "B#4", "Fb4", "Cb4"].map((n) => keyOf(n, "C")), ["R", "I", "V", "Z"]);
  // Same pitch, different spelling, different row: C sharp raised 1 (W), D flat lowered 2 (X).
  assert.equal(sp("C#4").midi, sp("Db4").midi);
});

test("D230: C minor: natural minor with the raised 7th at home; E natural, A natural, F sharp above; D flat, G flat, B flat below", () => {
  assert.deepEqual(["C4", "D4", "Eb4", "F4", "G4", "Ab4", "B4"].map((n) => keyOf(n, "c")), ["A", "S", "D", "F", "G", "H", "J"]);
  assert.deepEqual(["E4", "A4", "F#4", "C#4"].map((n) => keyOf(n, "c")), ["R", "U", "T", "W"]);
  assert.deepEqual(["Bb4", "Db4", "Gb4"].map((n) => keyOf(n, "c")), ["M", "X", "B"]);
  // Another tonic: E flat major's A natural is raised 4 (T), its D flat lowered 7 (M).
  assert.deepEqual(["Eb4", "A4", "Db5"].map((n) => keyOf(n, "Eb")), ["A", "T", "M"]);
  // A wrong key sounds its own pitch near the note: in C minor, U is A natural.
  assert.equal(keyPitch("KeyU", 67, "c"), 69);
  assert.equal(keyPitch("KeyM", 60, "c"), 58);
});

test("D230: the tonic folds to A or K the line's way; a repeat keeps its key", () => {
  const line = (names: string[], key = "C") => scaleKeys(names.map((n, i) => ({ on: i, ...sp(n) })), key).map((k) => k.code.slice(3)).join("");
  assert.equal(line(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]), "ASDFGHJK");
  assert.equal(line(["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"]), "KJHGFDSA");
  // Rising into the tonic from 6 or 7: K; falling from 2 or 3: A; a fourth up from 5: K.
  assert.equal(line(["E4", "D4", "C4", "G4", "C5"]), "DSAGK");
  assert.equal(line(["A4", "B4", "C5", "C5", "D5", "C5"]), "HJKKSA");
  // An octave leap on the tonic: up to K, down to A.
  assert.equal(line(["C4", "C5", "C4"]), "AKA");
  // In C minor the subject of I/2: C B C G A♭ C … (B natural the leading tone, home; the first C falls next: K).
  const f = fugueById("wtc1f02");
  const alto = f.voices[1].slice(0, 6).map(([on, , midi, step]) => ({ on, midi, step }));
  assert.equal(scaleKeys(alto, f.key).map((k) => k.code.slice(3)).join(""), "KJKGHK");
});

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    groove: () => false,
    tickAt: () => {},
  } as unknown as Chip;
}

test("D230: a perfect run with SCALE KEYS on I/1 and I/2, every voice: all hits; a wrong key a miss; SPACE answers a repeat", () => {
  for (const id of ["wtc1f01", "wtc1f02"]) {
    const f = fugueById(id);
    for (let v = 0; v < f.voices.length; v++) {
      const clock = { t: 0 };
      const g = new ProtoGame(f, v, 0, protoById("keys"), { bpm: 60, legato: false, easy: "exact", scale: true }, fakeChip(clock));
      const sk = g.scale!;
      assert.ok(sk && sk.length === g.notes.length);
      assert.equal(g.laneCount, 8);
      const heads = g.notes.map((n, i) => (n.ride || (i > 0 && g.notes[i - 1].on === n.on) ? -1 : i)).filter((i) => i >= 0);
      let id2 = 0;
      let space = 0;
      let prevMidi = -1;
      for (const i of heads) {
        clock.t = g.timeAt(g.notes[i].on);
        g.step();
        // Every other repeated note on SPACE.
        const code = g.notes[i].midi === prevMidi && space++ % 2 === 0 ? "Space" : sk[i].code;
        prevMidi = g.notes[i].midi;
        g.keyDown(++id2, { velocity: 0.6, code }, performance.now());
        g.keyUp(id2, performance.now());
      }
      const missed = heads.filter((i) => g.notes[i].state !== "hit");
      assert.equal(missed.length, 0, `${id} voice ${v}: ${missed.map((i) => `${i}:${g.notes[i].state}:${g.notes[i].midi}:${sk[i].code}`).join(" ")} of ${heads.length} not hit`);
    }
  }
  // A wrong key: the next row's key in place of the note's.
  const f = fugueById("wtc1f02");
  const clock = { t: 0 };
  const g = new ProtoGame(f, 1, 0, protoById("keys"), { bpm: 60, legato: false, easy: "exact", scale: true }, fakeChip(clock));
  clock.t = g.timeAt(g.notes[0].on);
  g.step();
  g.keyDown(1, { velocity: 0.6, code: "KeyQ" }, performance.now());
  assert.equal(g.notes[0].state, "miss");
  // TIMING: any key on time.
  const t = new ProtoGame(f, 1, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing", scale: true }, fakeChip(clock));
  clock.t = t.timeAt(t.notes[0].on);
  t.step();
  t.keyDown(1, { velocity: 0.6, code: "KeyQ" }, performance.now());
  assert.equal(t.notes[0].state, "hit");
  // Off: the nine lanes as before.
  const off = new ProtoGame(f, 1, 0, protoById("keys"), { bpm: 60, legato: false, easy: "exact" }, fakeChip(clock));
  assert.equal(off.scale, null);
  assert.equal(off.laneCount, 9);
  assert.ok(SCALE_HOW.length <= 3);
});

test("D230: Book I's fugues, every voice: the share on each row (home, above, below)", (t) => {
  const rows: string[] = [];
  for (const f of FUGUES.filter((x) => x.book === 1)) {
    const r = rowShares(f.voices.flat().map(([, , midi, step]) => ({ midi, step })), f.key);
    assert.ok(Math.abs(r.home + r.up + r.down - 1) < 1e-9);
    // Home most of the time; a minor fugue strays further (its raised 6th and lowered 7th are altered).
    assert.ok(r.home > 0.65, `${f.id} home ${r.home}`);
    rows.push(`I/${f.number} ${f.key}: home ${(r.home * 100).toFixed(1)}% · above ${(r.up * 100).toFixed(1)}% · below ${(r.down * 100).toFixed(1)}%`);
  }
  for (const r of rows) t.diagnostic(r);
  const mean = (minor: boolean) => {
    const fs = FUGUES.filter((x) => x.book === 1 && (x.key[0] === x.key[0].toLowerCase()) === minor);
    return fs.reduce((a, f) => a + rowShares(f.voices.flat().map(([, , midi, step]) => ({ midi, step })), f.key).home, 0) / fs.length;
  };
  assert.ok(mean(false) > mean(true));
});

test("D230: the road paints SCALE KEYS: eight home keys, the black keys above and below, the home key named, no G seam", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { paintProto } = await import("../src/bench/paint-proto.ts");
  const g0 = globalThis as unknown as Record<string, unknown>;
  g0.document ??= { documentElement: {} };
  g0.getComputedStyle ??= () => ({ getPropertyValue: () => "" });
  const texts: string[] = [];
  const state: Record<string, unknown> = { fillStyle: "#000", strokeStyle: "#000" };
  const c = new Proxy(state, {
    get(s, k: string) {
      if (k in s) return s[k];
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop: () => {} });
      if (k === "measureText") return () => ({ width: 10 });
      if (k === "fillText") return (t: string) => void texts.push(t);
      return () => {};
    },
    set(s, k: string, v) {
      s[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const clock = { t: 0 };
  const g = new ProtoGame(fugueById("wtc1f02"), 1, 0, protoById("keys"), { bpm: 60, legato: false, easy: "exact", scale: true }, fakeChip(clock));
  while (g.now < g.notes[20].on) (clock.t += 0.05), g.step();
  paintProto(c, 1280, 760, g, new Set());
  for (const k of ["A", "S", "D", "F", "G", "H", "J", "K", "W", "E", "T", "Y", "U", "X", "C", "B", "N", "M"]) assert.ok(texts.includes(k), k);
  assert.ok(texts.includes("HOME: C MINOR"));
  assert.ok(!texts.includes("SHARED") && !texts.includes("LEFT HAND"));
});
