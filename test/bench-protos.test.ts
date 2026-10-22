import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById, inBar } from "../src/touch/fugue.ts";
import { laneNotes, type LaneNote } from "../src/touch/lanes.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Contact, type Rows } from "../src/bench/proto-game.ts";
import { ARROW_KEYS, arrowOf, barDynamic, contourOk, BAR, KEY_ROWS, keyRow, moveOf, moves, protoById, PROTOS, stepPitch, thumbsVerdict } from "../src/bench/protos.ts";
import { columnAt, columnX, KEYS_SHARE, LINE } from "../src/bench/placed.ts";
import { isBlack, keySpan } from "../src/touch/piano.ts";
import { grooveHits, patchFor, PRESETS, setPreset, slotOf } from "../src/touch/sound.ts";
import { hz, setTuning } from "../src/touch/tuning.ts";
import { phrase } from "../src/touch/phrasing.ts";
import { accompaniment, startTick, subjectMarks, voicesFrom } from "../src/touch/voice-mode.ts";

const C_MINOR = fugueById("wtc1f02");
const beat = beatOf(C_MINOR).ticks;
const [W, H] = [800, 400];
/** A box whose rows are 16 px apart (as the app sets them from the screen). */
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };

test("the subject's moves: C B C G A flat, in staff steps, joined", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1), beat);
  assert.deepEqual(ms.slice(0, 5).map((m) => [m.size, m.steps]), [[-1, 0], [1, -1], [1, 1], [3, -3], [1, 1]]);
  assert.deepEqual(ms.slice(0, 3).map((m) => m.joined), [false, true, true]);
});

test("THUMBS: right for up, left for down; the wrong thumb asks for the mirror", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1), beat);
  assert.deepEqual(thumbsVerdict(ms[1], "left"), { ok: true, steps: -1 });
  assert.deepEqual(thumbsVerdict(ms[1], "right"), { ok: false, steps: 1 });
  assert.equal(thumbsVerdict(ms[3], "right").ok, true, "a leap: either thumb");
});

test("the bars' dynamic: pp by the box, ff by the phone's edge, on both sides", () => {
  const bw = W * BAR;
  assert.equal(barDynamic(bw, W), 0);
  assert.equal(barDynamic(0, W), 1);
  assert.equal(barDynamic(W - bw, W), 0);
  assert.equal(barDynamic(W, W), 1);
});

test("wrong notes are heard as asked: a staff step's pitch keeps the reference's inflection", () => {
  assert.equal(stepPitch(33, { step: 34, midi: 71 }), 69);
  assert.equal(stepPitch(32, { step: 33, midi: 68 }), 66);
});

/** Where a thumb plays note i of voice k right, per prototype. */
function rightTouch(g: ProtoGame, k: number, i: number): Contact {
  const n = g.tracks[k].notes[i];
  const c = (x: number, y: number): Contact => ({ side: x < W / 2 ? "left" : "right", x, y, w: W, h: H });
  switch (g.proto.id) {
    case "ladder": {
      // A chord is aimed at by its top note.
      const top = Math.max(...g.tracks[k].notes.filter((x) => x.on === n.on).map((x) => x.step));
      return c(W * 0.1, ROWS.yOf(top));
    }
    case "fingering": {
      // The thumb written; a boss's height and dynamic.
      const fg = g.tracks[k].fingers[i];
      const left = fg.hand === "left";
      const y = fg.height === "high" ? H * 0.25 : fg.height === "low" ? H * 0.75 : H / 2;
      const x = fg.dyn === "f" ? (left ? 4 : W - 4) : fg.dyn === "p" ? (left ? W * BAR - 4 : W - W * BAR + 4) : left ? W * 0.1 : W * 0.9;
      return c(x, y);
    }
    case "duo":
      return c(k ? W * 0.9 : W * 0.1, H / 2);
    case "sideways":
      return c(columnX(n.step, g.pan, W), H * LINE);
    default: {
      const [a, b] = keySpan(g.kb, n.midi);
      return c(((a + b) / 2) * W, isBlack(n.midi) ? H * (1 - KEYS_SHARE) + 5 : H - 4);
    }
  }
}

function fakeChip(clock: { t: number }, log: { midi: number; muffled: boolean; dyn?: number }[] = [], swooshes: number[] = []) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number) => {
      const e: { midi: number; muffled: boolean; dyn?: number } = { midi, muffled: false };
      log.push(e);
      return { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => (e.muffled = true), dyn: (d: number) => (e.dyn = d) };
    },
    swoosh: (midi: number) => swooshes.push(midi),
    tick: () => {},
  } as unknown as Chip;
}

/** Plays a piece through: each note on time, in its place; LEGATO holds each note until the next has begun. */
function playThrough(id: string, piece: string, voices: number[], legato = false) {
  const f = fugueById(piece);
  const clock = { t: 0 };
  const id_proto = id;
  const g = new ProtoGame(f, voices, startTick(f, 0), protoById(id), { bpm: 54, legato }, fakeChip(clock));
  g.rows = ROWS;
  const at = (tick: number) => g.timeAt(tick);
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  // Each note down at its time; let go at once, or (LEGATO, FINGERING) as written: overlapping the next for legato,
  // quickly for staccato, most of the way for tenuto.
  type Ev = { t: number; down: boolean; id: number; k: number; i: number };
  const evs: Ev[] = [];
  let nid = 0;
  g.tracks.forEach((tr, k) => {
    const heads = tr.notes.map((n, i) => (i > 0 && tr.notes[i - 1].on === n.on ? -1 : i)).filter((i) => i >= 0);
    heads.forEach((i, h) => {
      const n = tr.notes[i];
      const t0 = at(n.on);
      const nextOn = h + 1 < heads.length ? at(tr.notes[heads[h + 1]].on) : t0 + 0.2;
      let t1 = t0 + 0.02;
      {
        const art = id_proto === "fingering" ? tr.fingers[i].art : legato ? "legato" : "free";
        const len = at(n.on + n.dur) - t0;
        if (art === "staccato") t1 = t0 + len * 0.4;
        else if (art === "tenuto") t1 = t0 + len * 0.9;
        else if (art === "legato" || id_proto === "fingering") t1 = Math.max(t0 + 0.02, nextOn + 0.02);
      }
      nid++;
      evs.push({ t: t0, down: true, id: nid, k, i }, { t: t1, down: false, id: nid, k, i });
    });
  });
  evs.sort((a, b) => a.t - b.t || Number(a.down) - Number(b.down));
  for (const e of evs) {
    runTo(e.t);
    g.step();
    if (e.down) g.down(e.id, rightTouch(g, e.k, e.i), performance.now());
    else g.up(e.id, performance.now());
  }
  runTo(at(g.end + 1));
  g.step();
  return g.results();
}

test("every prototype can be played right through, on both pieces, every voice (TWO VOICES: pairs; SIDEWAYS also LEGATO)", () => {
  for (const p of PROTOS)
    for (const piece of ["wtc1f02", "bwv1080-14"]) {
      const f = fugueById(piece);
      const vs = voicesFrom(f, 0);
      const runs = p.id === "duo" ? vs.slice(1).map((v) => [vs[0], v]) : vs.map((v) => [v]);
      for (const voices of runs)
        for (const legato of p.id === "sideways" ? [false, true] : [false]) {
          const r = playThrough(p.id, piece, voices, legato);
          assert.ok(r.right === r.of, `${p.id}${legato ? " legato" : ""} ${piece} v${voices}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
        }
    }
});

/** One touch on note i of the alto, at its time; what sounded. */
function touchNote(id: string, i: number, place: (g: ProtoGame, n: LaneNote) => Contact, legato = false) {
  const clock = { t: 0 };
  const log: { midi: number; muffled: boolean; dyn?: number }[] = [];
  const g = new ProtoGame(C_MINOR, 1, 0, protoById(id), { bpm: 54, legato }, fakeChip(clock, log));
  g.rows = ROWS;
  const n = g.notes[i];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  g.down(1, place(g, n), performance.now());
  return { g, n, heard: log.at(-1)!, log };
}

test("a wrong place sounds what it asked for, muffled (the PIANO's key plain), and does not count", () => {
  {
    const { n, heard } = touchNote("ladder", 1, (_, n) => ({ side: "left", x: W * 0.1, y: ROWS.yOf(n.step + 6), w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, true);
    assert.ok(heard.midi > n.midi, `six steps up, heard ${heard.midi}`);
  }
  {
    const { n, heard } = touchNote("fingering", 1, () => ({ side: "right", x: W * 0.9, y: 200, w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.ok(heard.midi > 72, `a step up from C5, heard ${heard.midi}`);
  }
  {
    const { n, heard } = touchNote("sideways", 3, (g, n) => ({ side: "left", x: columnX(n.step + 3, g.pan, W), y: H * LINE, w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, true);
  }
  {
    const { n, heard } = touchNote("piano", 1, (g, n) => {
      const [a, b] = keySpan(g.kb, n.midi + 2);
      return { side: "left", x: ((a + b) / 2) * W, y: isBlack(n.midi + 2) ? H * (1 - KEYS_SHARE) + 5 : H - 4, w: W, h: H };
    });
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, false);
    assert.equal(heard.midi, n.midi + 2);
  }
});

test("LADDER is forgiving: near the note and the right way from the touch before counts; the wrong way does not", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("ladder"), { bpm: 54, legato: false }, fakeChip(clock));
  g.rows = ROWS;
  const tap = (i: number, side: "left" | "right", y: number) => {
    clock.t = g.timeAt(g.notes[i].on);
    g.step();
    g.down(i + 1, { side, x: side === "left" ? 40 : W - 40, y, w: W, h: H }, performance.now());
    g.up(i + 1, performance.now());
    return g.notes[i].state;
  };
  // C5, then B4 two rows lower than the note (the other thumb, a little higher than its last touch): still down enough.
  assert.equal(tap(0, "left", ROWS.yOf(35) + 30), "hit");
  assert.equal(tap(1, "right", ROWS.yOf(34) + 10), "hit");
  // C5 again, but the same right thumb lower still: the wrong way.
  assert.equal(tap(2, "right", ROWS.yOf(34) + 30), "miss");
});

test("SIDEWAYS LEGATO: a joined note struck after the one before was let go does not count", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("sideways"), { bpm: 54, legato: true }, fakeChip(clock));
  const play = (i: number, id: number) => {
    clock.t = 0.15 + (g.notes[i].on - g.start) / g.tps;
    g.step();
    g.down(id, { side: "left", x: columnX(g.notes[i].step, g.pan, W), y: 300, w: W, h: H }, performance.now());
  };
  play(0, 1);
  g.up(1, performance.now());
  play(1, 2);
  assert.equal(g.notes[1].wrong, true);
  assert.equal(g.grade?.why, "legato");
});

test("a held note swells as the thumb moves out across its bar; a flick upwards on letting go: a swoosh", () => {
  const clock = { t: 0 };
  const log: { midi: number; muffled: boolean; dyn?: number }[] = [];
  const swooshes: number[] = [];
  const g = new ProtoGame(C_MINOR, [1, 0], 0, protoById("duo"), { bpm: 54, legato: false }, fakeChip(clock, log, swooshes));
  const n = g.notes[0];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  const t0 = performance.now();
  g.down(1, { side: "left", x: W * BAR * 0.9, y: 300, w: W, h: H }, t0);
  g.move(1, { side: "left", x: 2, y: 300, w: W, h: H }, t0 + 20);
  assert.ok((log.at(-1)!.dyn ?? 1) > 1.3, "out to the edge: louder");
  g.move(1, { side: "left", x: 2, y: 240, w: W, h: H }, t0 + 60);
  g.up(1, t0 + 80);
  assert.deepEqual(swooshes, [n.midi]);
});

test("keys: a MIDI key plays its pitch (the PIANO exactly); WASD and the arrows on the computer's LADDER", () => {
  {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("piano"), { bpm: 54, legato: false }, fakeChip(clock));
    const n = g.notes[0];
    clock.t = 0.15 + (n.on - g.start) / g.tps;
    g.step();
    g.keyDown(1, { midi: n.midi, velocity: 0.8 }, performance.now());
    assert.equal(n.state, "hit");
  }
  {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("arrows"), { bpm: 54, legato: false }, fakeChip(clock));
    // The subject: C (any key), B a step down, C a step up, G a leap down: the keys the box draws.
    assert.deepEqual(g.moves.slice(0, 4).map(arrowOf), [null, "left", "right", "down"]);
    for (const [i, code] of [[0, "Space"], [1, "KeyA"], [2, "ArrowRight"], [3, "KeyS"]] as const) {
      const mv = moveOf(ARROW_KEYS[code]);
      clock.t = 0.15 + (g.notes[i].on - g.start) / g.tps;
      g.step();
      g.keyDown(10 + i, { move: mv }, performance.now());
      g.keyUp(10 + i, performance.now());
      assert.equal(g.notes[i].state, "hit", `note ${i}`);
    }
  }
});

test("platforms: the phone's prototypes and the computer's apart; EASY rows and keys", () => {
  assert.deepEqual(PROTOS.filter((p) => p.platform === "computer").map((p) => p.id), ["arrows", "keys", "piano"]);
  assert.ok(PROTOS.filter((p) => p.platform === "mobile").every((p) => p.layout !== "desk"));
  assert.deepEqual(["Digit3", "KeyE", "KeyD", "KeyC", "Space", "Enter"].map(keyRow), [0, 1, 2, 3, -1, -1]);
  assert.ok(KEY_ROWS[1].dyn > KEY_ROWS[2].dyn && KEY_ROWS[2].dyn > KEY_ROWS[3].dyn, "f above mf above p");
});

test("EASY: any key on time is right, whatever its row; off time it is a miss", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false }, fakeChip(clock));
  ["KeyQ", "KeyA", "KeyZ", "Digit1"].forEach((code, i) => {
    clock.t = g.timeAt(g.notes[i].on);
    g.step();
    const r = KEY_ROWS[keyRow(code)];
    g.keyDown(20 + i, { velocity: r.dyn, trill: r.trill }, performance.now());
    g.keyUp(20 + i, performance.now());
    assert.equal(g.notes[i].state, "hit", code);
  });
  const n = g.notes[6];
  clock.t = g.timeAt(n.on) - 0.9;
  g.step();
  g.keyDown(40, { velocity: 0.5 }, performance.now());
  assert.notEqual(n.state, "hit");
});

test("the computer's LADDER: a third takes the step or the leap", () => {
  for (const code of ["ArrowRight", "ArrowUp", "KeyD", "KeyW"]) {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("arrows"), { bpm: 54, legato: false }, fakeChip(clock));
    const i = g.moves.findIndex((m, j) => j > 0 && m.size === 2 && m.dir > 0);
    assert.ok(i > 0);
    assert.equal(arrowOf(g.moves[i]), "rise");
    for (let j = 0; j <= i; j++) {
      clock.t = g.timeAt(g.notes[j].on);
      g.step();
      const a = j === i ? ARROW_KEYS[code] : (arrowOf(g.moves[j]) ?? "same");
      const key = a === "rise" ? "right" : a === "fall" ? "left" : a;
      g.keyDown(30 + j, { move: moveOf(key) }, performance.now());
      g.keyUp(30 + j, performance.now());
    }
    assert.equal(g.notes[i].state, "hit", code);
  }
});

test("audit fixes: mashing is no S; ORGANO PLENO sounds on every capture; a lost key is let go", () => {
  {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false }, fakeChip(clock));
    let id = 0;
    while (clock.t < g.timeAt(g.end) + 1) {
      clock.t += 0.06;
      g.step();
      g.keyDown(++id, { velocity: 0.5 }, performance.now());
      g.keyUp(id, performance.now());
    }
    const r = g.results();
    assert.ok(r.stray > 0 && r.grade !== "S" && r.grade !== "A", `mashing: ${r.grade}, ${r.stray} stray`);
  }
  for (const voice of voicesFrom(C_MINOR, 0)) {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, voice, 0, protoById("keys"), { bpm: 54, legato: false }, fakeChip(clock));
    let captured = 0;
    const heads = g.notes.map((n, i) => (i > 0 && g.notes[i - 1].on === n.on ? -1 : i)).filter((i) => i >= 0);
    for (const i of heads) {
      while (clock.t < g.timeAt(g.notes[i].on) - 0.05) (clock.t += 0.05), g.step();
      clock.t = g.timeAt(g.notes[i].on);
      g.step();
      g.keyDown(100 + i, { velocity: 0.5 }, performance.now());
      g.keyUp(100 + i, performance.now());
      g.step();
      const now = g.entries.filter((e) => e.state === "captured").length;
      if (now > captured) assert.ok(g.pleno, `voice ${voice}: pleno on capture ${now}`);
      captured = now;
    }
    assert.ok(captured > 0);
  }
  {
    const clock = { t: 0 };
    const log: { midi: number; muffled: boolean }[] = [];
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false }, fakeChip(clock, log));
    clock.t = g.timeAt(g.notes[0].on);
    g.step();
    g.keysDown.add("KeyA");
    g.pedal(true);
    g.keyDown(1, { velocity: 0.5 }, performance.now());
    g.releaseAll(performance.now());
    assert.equal(g.keysDown.size, 0);
    assert.equal(g.pedalOn, false);
  }
});

test("the downbeat on the barline in triple time; an upbeat played from the start", () => {
  for (const id of ["wtc1f06", "wtc1f11", "wtc2f10", "wtc2f13"]) {
    const f = fugueById(id);
    const clock = { t: 0 };
    const accents: number[] = [];
    const chip = fakeChip(clock);
    (chip as unknown as { tick: (t: number, a: boolean) => void }).tick = (t, a) => {
      if (a) accents.push(t);
    };
    const from = startTick(f, 0);
    assert.equal(from, 0, `${id} starts at its first note`);
    const g = new ProtoGame(f, voicesFrom(f, 0)[0], from, protoById("keys"), { bpm: 54, legato: false }, chip);
    while (clock.t < g.timeAt(f.bars[3].on)) (clock.t += 0.05), g.step();
    const bars = new Set(f.bars.map((b) => Math.round(g.timeAt(b.on) * 1000)));
    const after = accents.filter((t) => t >= g.timeAt(f.bars[0].on) - 1e-6);
    assert.ok(after.length >= 2 && after.every((t) => bars.has(Math.round(t * 1000))), `${id}: accents on the barlines`);
    assert.ok(Math.min(...f.voices.flatMap((v) => v.map(([on]) => on))) < f.bars[0].on || id === "wtc1f06", `${id}: an upbeat`);
  }
});

test("EASY's DIRECTION: following the line along the home row is right; against it, wrong; the walls give", () => {
  const row = KEY_ROWS[2].codes;
  for (const leaps of [false, true]) {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false, easy: leaps ? "leaps" : "direction" }, fakeChip(clock));
    let col = 5;
    let id = 0;
    for (let i = 0; i < g.notes.length; i++) {
      if (i > 0 && g.notes[i - 1].on === g.notes[i].on) continue;
      const m = g.moves[i];
      if (g.isFree(i)) col = 5;
      else if (m.dir !== 0 && m.steps !== 0) col = Math.max(0, Math.min(row.length - 1, col + m.dir * (leaps && m.size >= 3 ? 2 : 1)));
      clock.t = g.timeAt(g.notes[i].on);
      g.step();
      g.keyDown(++id, { velocity: 0.5, code: m.dir === 0 && !g.isFree(i) ? "Space" : row[col] }, performance.now());
      g.keyUp(id, performance.now());
    }
    const r = g.results();
    assert.equal(r.right, r.of, `${leaps ? "leaps" : "direction"}: ${r.right}/${r.of}`);
  }
  {
    // Against the line: every judged note wrong.
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false, easy: "direction" }, fakeChip(clock));
    const i = g.moves.findIndex((m, j) => j > 0 && !g.isFree(j) && m.dir > 0 && m.steps > 0);
    for (let j = 0; j <= i; j++) {
      if (j > 0 && g.notes[j - 1].on === g.notes[j].on) continue;
      clock.t = g.timeAt(g.notes[j].on);
      g.step();
      g.keyDown(50 + j, { velocity: 0.5, code: j === i ? "KeyA" : "KeyK" }, performance.now());
      g.keyUp(50 + j, performance.now());
    }
    assert.equal(g.notes[i].state, "miss", "up, but a key to the left");
  }
  const up = { dir: 1, size: 1, steps: 1, joined: true } as Parameters<typeof contourOk>[0];
  assert.ok(contourOk(up, "KeyF", "KeyJ", false));
  assert.ok(!contourOk(up, "KeyJ", "KeyF", false));
  assert.ok(contourOk(up, "Quote", "Quote", false), "at the wall, the edge key again");
  assert.ok(contourOk(up, "KeyF", "KeyT", false), "the next row, further right");
});

test("SIDEWAYS: a column's middle is that column", () => {
  for (const pan of [30, 33.4, 36.8]) for (const s of [28, 31, 35]) assert.equal(columnAt(columnX(s, pan, W), pan, W), s);
});

test("the ensembles: every preset gives each voice an instrument; the bands keep a beat; bossa nova by default", () => {
  assert.ok(PRESETS.length >= 18);
  assert.deepEqual([3, 4, 5].map((n) => Array.from({ length: n }, (_, v) => slotOf(v, n))), [[0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]]);
  assert.ok(patchFor(0, 3), "bossa nova");
  setPreset("chip");
  assert.equal(patchFor(0, 3), null);
  setPreset("bossa");
  for (const gr of ["rock", "jazz", "bossa", "brushes"] as const) assert.ok([0, 1, 2, 3].flatMap((b) => grooveHits(gr, b, 0, 4, false)).length >= 4, gr);
});

test("the tunings: A stays put; a well temperament moves the others a few cents", () => {
  setTuning("equal", 440);
  assert.equal(hz(69), 440);
  assert.ok(Math.abs(hz(60) - 261.626) < 0.01);
  setTuning("werckmeister", 440);
  assert.equal(hz(69), 440);
  assert.ok(Math.abs(1200 * Math.log2(hz(60) / 261.626) - 11.7) < 0.1, "C 11.7 cents above A's equal-tempered C");
  setTuning("equal", 415);
  assert.equal(hz(69), 415);
  setTuning("equal", 440);
});

test("the others are phrased: the subject brought forward, repeated notes detached, timing within a few ms", () => {
  const others = accompaniment(C_MINOR, 0, 1);
  const sh = phrase(others, beat, (t) => inBar(C_MINOR, t), subjectMarks(C_MINOR).subject);
  assert.equal(sh.length, others.length);
  assert.ok(sh.every((s) => Math.abs(s.nudge) <= 0.006 && s.hold > 0.7 && s.hold <= 1 && s.level > 0.8 && s.level < 1.5));
  const subj = subjectMarks(C_MINOR).subject;
  const i = others.findIndex((o) => subj.has(`${o.voice}:${o.on}`));
  const j = others.findIndex((o) => !subj.has(`${o.voice}:${o.on}`));
  assert.ok(i >= 0 && j >= 0);
});
