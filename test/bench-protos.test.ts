import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById, inBar } from "../src/touch/fugue.ts";
import { laneNotes, type LaneNote } from "../src/touch/lanes.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Contact, type Rows } from "../src/bench/proto-game.ts";
import { ARROW_KEYS, arrowOf, barDynamic, contourOk, BAR, HIGHWAY_LANES, SUBJECT_LINE, KEY_ROWS, keyRow, menuOf, moveOf, moves, protoById, PROTOS, stepPitch, takesHer, thumbsVerdict } from "../src/bench/protos.ts";
import { KEYS_SHARE } from "../src/bench/placed.ts";
import { isBlack, keySpan } from "../src/touch/piano.ts";
import { grooveHits, patchFor, PRESETS, setPreset, slotOf } from "../src/touch/sound.ts";
import { hz, setTuning } from "../src/touch/tuning.ts";
import { phrase } from "../src/touch/phrasing.ts";
import { accompaniment, entrySpans, startTick, subjectMarks, voicesFrom } from "../src/touch/voice-mode.ts";

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
    case "highway":
    case "subject":
      // D217: the note's lane; SUBJECT's second line (a stretto's older entry) in the lower row of pads.
      return c(((g.lanesOf(k)[i] + 0.5) / g.laneCount) * W, k ? H - 60 : H - 160);
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
  const g = new ProtoGame(f, voices, startTick(f, 0), protoById(id), { bpm: 54, legato }, fakeChip(clock));
  g.rows = ROWS;
  const at = (tick: number) => g.timeAt(tick);
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  // Each note down at its time; let go at once, or (LEGATO) overlapping the next.
  type Ev = { t: number; down: boolean; id: number; k: number; i: number };
  const evs: Ev[] = [];
  let nid = 0;
  g.tracks.forEach((tr, k) => {
    // The notes struck: a chord once; the riding notes (D191) are played for the player.
    const heads = tr.notes.map((n, i) => (n.ride || (i > 0 && tr.notes[i - 1].on === n.on) ? -1 : i)).filter((i) => i >= 0);
    heads.forEach((i, h) => {
      const n = tr.notes[i];
      const t0 = at(n.on);
      const nextOn = h + 1 < heads.length ? at(tr.notes[heads[h + 1]].on) : t0 + 0.2;
      let t1 = t0 + 0.02;
      {
        // D218: held over into the next note where the score joins them; else let go at the note's end (the rest respected).
        if (legato) t1 = h + 1 < heads.length && g.joinedAt(heads[h + 1], k) ? Math.max(t0 + 0.02, nextOn + 0.02) : Math.max(t0 + 0.02, at(n.on + n.dur) - 0.02);
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

test("every prototype can be played right through, on both pieces, every voice (LADDER also LEGATO; HIGHWAY's road, SUBJECT's machinery, too)", () => {
  for (const p of [...PROTOS, HIGHWAY_LANES, SUBJECT_LINE])
    for (const piece of ["wtc1f02", "bwv1080-14"]) {
      const f = fugueById(piece);
      const vs = voicesFrom(f, 0);
      const runs = vs.map((v) => [v]);
      for (const voices of runs)
        for (const legato of p.id === "ladder" ? [false, true] : [false]) {
          const r = playThrough(p.id, piece, voices, legato);
          assert.ok(r.right === r.of, `${p.id}${legato ? " legato" : ""} ${piece} v${voices}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
          // D218: played legato, every joined note is legato and every rest respected.
          if (legato) assert.ok(r.art.legato === r.art.legatoOf && r.art.clean === r.art.cleanOf, `${p.id} legato ${piece} v${voices}: ${JSON.stringify(r.art)}`);
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

test("a wrong place sounds what it asked for, not muffled (D293; the PIANO's key), and does not count", () => {
  {
    const { n, heard } = touchNote("ladder", 1, (_, n) => ({ side: "left", x: W * 0.1, y: ROWS.yOf(n.step + 6), w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, false);
    assert.ok(heard.midi > n.midi, `six steps up, heard ${heard.midi}`);
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

test("a held note swells as the thumb moves out across its bar (D293: only where dynamics are asked); a flick upwards on letting go: a swoosh", () => {
  for (const coach of ["dynamics", undefined] as const) {
    const clock = { t: 0 };
    const log: { midi: number; muffled: boolean; dyn?: number }[] = [];
    const swooshes: number[] = [];
    const g = new ProtoGame(C_MINOR, [1], 0, protoById("ladder"), { bpm: 54, legato: false, coach }, fakeChip(clock, log, swooshes));
    g.rows = ROWS;
    const n = g.notes[0];
    clock.t = 0.15 + (n.on - g.start) / g.tps;
    g.step();
    const t0 = performance.now();
    const y = ROWS.yOf(n.step);
    g.down(1, { side: "left", x: W * BAR * 0.9, y, w: W, h: H }, t0);
    g.move(1, { side: "left", x: 2, y, w: W, h: H }, t0 + 20);
    if (coach) assert.ok((log.at(-1)!.dyn ?? 1) > 1.3, "out to the edge: louder");
    else assert.equal(log.at(-1)!.dyn, undefined, "no swell where dynamics are not asked");
    g.move(1, { side: "left", x: 2, y: y - 60, w: W, h: H }, t0 + 60);
    g.up(1, t0 + 80);
    assert.deepEqual(swooshes, [n.midi]);
  }
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
  assert.deepEqual(menuOf("computer", true).map((p) => p.id), ["keys", "arrows", "piano"]);
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

test("D194: the countersubject drawn beside its entries; inversions named; a cadence in a run is a bonus", () => {
  const spans = entrySpans(C_MINOR);
  assert.ok(spans.some((s) => s.form === "counter" && s.path.length > 4), "I/2's countersubject");
  assert.ok(entrySpans(fugueById("wtc1f08")).some((s) => s.shape === "AUGMENTATION"), "I/8's augmentations");
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false, easy: "timing" }, fakeChip(clock));
  const cad = (C_MINOR.cadences ?? []).find((c) => c.on > g.notes[8].on);
  assert.ok(cad, "a cadence in the C minor fugue");
  let id = 0;
  const banners = new Set<string>();
  for (let i = 0; i < g.notes.length && g.notes[i].on <= cad!.on + 1; i++) {
    if (i > 0 && g.notes[i - 1].on === g.notes[i].on) continue;
    if (g.notes[i].ride) continue;
    const at = g.timeAt(g.notes[i].on);
    while (clock.t < at - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, at);
    g.step();
    banners.add(g.banner?.text ?? "");
    g.keyDown(++id, { velocity: 0.5 }, performance.now());
    g.keyUp(id, performance.now());
    g.step();
    banners.add(g.banner?.text ?? "");
  }
  assert.ok([...banners].some((b) => /CADENCE/.test(b)), [...banners].join(" | "));
});

test("D198: right notes warm the crowd; slips cool it and can fail the run", () => {
  const play = (good: boolean, fail = false) => {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 50, legato: false, easy: "timing", fail }, fakeChip(clock));
    let id = 0;
    let done = false;
    for (let i = 0; i < 60 && !done; i++) {
      const n = g.notes[i];
      if ((i > 0 && g.notes[i - 1].on === n.on) || n.ride) continue;
      const at = g.timeAt(n.on);
      while (clock.t < at - 0.05 && !done) (clock.t += 0.05), (done = g.step());
      clock.t = Math.max(clock.t, at);
      if (g.step()) break;
      if (good) {
        g.keyDown(++id, { velocity: 0.5 }, performance.now());
        g.keyUp(id, performance.now());
      }
    }
    return g;
  };
  const up = play(true);
  assert.ok(up.bpm === 50 && up.crowd > 0.6, `played well: ${up.bpm.toFixed(1)} bpm, crowd ${up.crowd.toFixed(2)}`);
  const down = play(false);
  assert.ok(down.bpm <= 50.01 && down.crowd < 0.2, `missed: ${down.bpm.toFixed(1)} bpm, crowd ${down.crowd.toFixed(2)}`);
  const failed = play(false, true);
  assert.ok(failed.failedAt !== null && failed.results().failedBar !== null, "the crowd lost: failed");
  assert.equal(up.lanes.length, up.notes.length);
  assert.ok(up.lanes.every((l) => l >= 0 && l <= 9));
});

test("D207, HIGHWAY: tapping each note's lane is right in DIRECTION; against the line it is wrong", () => {
  for (const follow of [true, false]) {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("highway"), { bpm: 54, legato: false, easy: "direction" }, fakeChip(clock));
    assert.equal(g.laneCount, 5);
    let id = 0;
    let wrongAt = -1;
    for (let i = 0; i < 40; i++) {
      const n = g.notes[i];
      if ((i > 0 && g.notes[i - 1].on === n.on) || n.ride) continue;
      const at = g.timeAt(n.on);
      while (clock.t < at - 0.05) (clock.t += 0.05), g.step();
      clock.t = Math.max(clock.t, at);
      g.step();
      let lane = g.lanes[i];
      const m = g.moves[i];
      if (!follow && wrongAt < 0 && !g.isFree(i) && m.dir !== 0 && m.steps !== 0 && g.lastLane > 0 && g.lastLane < 4) {
        lane = g.lastLane - m.dir;
        wrongAt = i;
      }
      const x = ((lane + 0.5) / 5) * W;
      g.down(++id, { side: x < W / 2 ? "left" : "right", x, y: H * 0.8, w: W, h: H }, performance.now());
      g.up(id, performance.now());
      if (!follow && wrongAt === i) break;
    }
    if (follow) assert.ok(g.notes.slice(0, 40).every((n, i) => n.ride || (i > 0 && g.notes[i - 1].on === n.on) || n.state === "hit"), "followed: all right");
    else assert.equal(g.notes[wrongAt].state, "miss", "the other way: wrong");
  }
});

test("the ensembles (D208: the disliked ones withdrawn); every preset gives each voice an instrument; the bands keep a beat", () => {
  for (const gone of ["rock", "jazz", "swingle", "moog1", "moog2", "moog3", "moog4"]) assert.ok(!PRESETS.some((p) => p.id === gone), gone);
  for (const kept of ["chip", "chipRound", "harpsichordSampled", "pianoSampled", "pianoFm"]) assert.ok(PRESETS.some((p) => p.id === kept), kept);
  assert.deepEqual([3, 4, 5].map((n) => Array.from({ length: n }, (_, v) => slotOf(v, n))), [[0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]]);
  setPreset("pianoFm");
  assert.ok(patchFor(0, 3), "the FM piano");
  setPreset("chip");
  assert.equal(patchFor(0, 3), null);
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

test("D208, LADDER legato as the hand plays it: the thumbs overlap briefly and the one letting go drifts as it lifts; every note counts", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("ladder"), { bpm: 54, legato: true }, fakeChip(clock));
  g.rows = ROWS;
  const heads = g.notes.map((n, i) => (n.ride || (i > 0 && g.notes[i - 1].on === n.on) ? -1 : i)).filter((i) => i >= 0).slice(0, 40);
  const runTo = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  let prev: { id: number; side: "left" | "right"; y: number } | null = null;
  heads.forEach((i, h) => {
    const n = g.notes[i];
    const side = h % 2 ? "right" : "left";
    const y = ROWS.yOf(n.step);
    runTo(g.timeAt(n.on));
    g.down(h + 1, { side, x: side === "left" ? 40 : W - 40, y, w: W, h: H }, performance.now());
    if (prev) {
      // A brief overlap; the old thumb rolls off the glass (its contact point moves a row or so) and lifts.
      const p = prev;
      runTo(clock.t + 0.04);
      for (const dy of [6, 12, 18, 24]) g.move(p.id, { side: p.side, x: p.side === "left" ? 40 : W - 40, y: p.y + (h % 3 === 0 ? dy : -dy), w: W, h: H }, performance.now());
      g.up(p.id, performance.now());
    }
    prev = { id: h + 1, side, y };
  });
  if (prev) g.up((prev as { id: number }).id, performance.now());
  const done = heads.filter((i) => g.notes[i].state === "hit").length;
  assert.equal(done, heads.length, `${done}/${heads.length} hit`);
  assert.equal(g.results().stray ?? 0, 0, "no stray strike: the lifting thumb took no note");
});

test("D208, HIGHWAY legato: a held thumb slid into the next note's lane plays it; a thumb rolling a little within its lane does not", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("highway"), { bpm: 54, legato: false, easy: "timing" }, fakeChip(clock));
  const heads = g.notes.map((n, i) => (n.ride || (i > 0 && g.notes[i - 1].on === n.on) ? -1 : i)).filter((i) => i >= 0);
  const laneW = W / g.laneCount;
  const runTo = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  const [a, b, c2] = heads;
  runTo(g.timeAt(g.notes[a].on));
  g.down(1, { side: "left", x: laneW * 0.5, y: H - 100, w: W, h: H }, performance.now());
  // A small roll inside the lane: nothing.
  runTo(g.timeAt(g.notes[b].on));
  g.move(1, { side: "left", x: laneW * 0.9, y: H - 100, w: W, h: H }, performance.now());
  assert.equal(g.notes[b].state, "pending", "a roll within the lane plays nothing");
  // Across into the next lane: the next note, joined.
  g.move(1, { side: "left", x: laneW * 1.5, y: H - 100, w: W, h: H }, performance.now());
  assert.equal(g.notes[b].state, "hit");
  runTo(g.timeAt(g.notes[c2].on));
  g.move(1, { side: "left", x: laneW * 2.5, y: H - 100, w: W, h: H }, performance.now());
  assert.equal(g.notes[c2].state, "hit");
  assert.equal(g.results().stray ?? 0, 0);
});

test("D208, computer HIGHWAY's fingering: nine lanes; across every fugue's voices the line's way is kept, a finger twice running or a pile at an edge only where a scale outruns the row", () => {
  let moves = 0;
  let same = 0;
  let wall = 0;
  for (const f of [C_MINOR, fugueById("wtc1f05"), fugueById("wtc2f05"), fugueById("bwv1080-14")])
    for (let v = 0; v < f.voices.length; v++) {
      const g = new ProtoGame(f, v, 0, protoById("keys"), { bpm: 60, legato: false, easy: "exact" }, fakeChip({ t: 0 }));
      assert.equal(g.laneCount, 9);
      const L = g.lanes;
      // The lanes struck in turn (a repeat is the thumbs' space bar: no finger of the row; a free note,
      // after a rest or a long note, starts a new run: the hand has had time).
      const seqs: number[][] = [[]];
      let prev = -1;
      g.notes.forEach((n, i) => {
        if (n.ride || (i > 0 && g.notes[i - 1].on === n.on)) return;
        assert.ok(L[i] >= 0 && L[i] <= 8);
        const m = g.moves[i];
        if (prev >= 0 && !g.isFree(i) && m.dir !== 0 && m.steps !== 0) {
          moves++;
          if ((L[i] - L[prev]) * m.dir <= 0) wall++;
        }
        if (g.isFree(i)) seqs.push([]);
        const seq = seqs.at(-1)!;
        if (!seq.length || seq.at(-1) !== L[i]) seq.push(L[i]);
        prev = i;
      });
      // Each finger has one lane, but G is either index: only F G H (or H G F) forces an index twice.
      for (const seq of seqs) for (let k = 1; k + 1 < seq.length; k++) if (seq[k] === 4 && seq[k - 1] + seq[k + 1] === 8 && seq[k - 1] !== seq[k + 1]) same++;
    }
  // A scale longer than the row (nine keys) must give somewhere: an index twice, or a pile at the edge.
  assert.ok(same / moves < 0.002, `an index twice running ${same} of ${moves}`);
  assert.ok(wall / moves < 0.02, `edge piles ${wall} of ${moves}`);
});

test("D208, EXACT LANES: the planned lane's key is right, another key is wrong, space answers a repeat", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false, easy: "exact" }, fakeChip(clock));
  const row = KEY_ROWS[2].codes;
  const heads = g.notes.map((n, i) => (n.ride || (i > 0 && g.notes[i - 1].on === n.on) ? -1 : i)).filter((i) => i >= 0).slice(0, 30);
  let id = 0;
  let wrongAt = -1;
  for (const [h, i] of heads.entries()) {
    clock.t = g.timeAt(g.notes[i].on);
    g.step();
    const m = g.moves[i];
    const lane = g.lanes[i];
    const free = g.isFree(i);
    let code = m.dir === 0 && !free ? "Space" : row[lane];
    if (h > 3 && wrongAt < 0 && !free && m.dir !== 0) (code = row[(lane + 3) % 9]), (wrongAt = i);
    g.keyDown(++id, { velocity: 0.5, code }, performance.now());
    g.keyUp(id, performance.now());
  }
  for (const i of heads) assert.equal(g.notes[i].state, i === wrongAt ? "miss" : "hit", `note ${i}`);
});

test("D217: fewer crossbars: a note is free only at the start or after a real rest (a long note frees nothing); the lanes still keep runs off the edges", () => {
  let heads = 0;
  let free = 0;
  let judged = 0;
  let wall = 0;
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f04", "wtc1f05", "wtc1f08", "wtc1f10", "wtc1f11", "bwv1080-14"]) {
    const f = fugueById(id);
    for (let v = 0; v < f.voices.length; v++) {
      const g = new ProtoGame(f, v, 0, protoById("highway"), { bpm: 60, legato: false, easy: "exact" }, fakeChip({ t: 0 }));
      const L = g.lanes;
      let prev = -1;
      g.notes.forEach((n, i) => {
        if (n.ride || (i > 0 && g.notes[i - 1].on === n.on)) return;
        heads++;
        const m = g.moves[i];
        if (g.isFree(i)) {
          free++;
          // Free: the first, or a rest of a beat or more since whatever sounded last.
          const before = g.notes.slice(0, i).filter((x) => x.on < n.on);
          if (before.length) assert.ok(n.on - Math.max(...before.map((x) => x.on + x.dur)) >= g.beat, `${id} v${v}: note ${i} free without a rest`);
        } else if (prev >= 0 && m.dir !== 0 && m.steps !== 0) {
          judged++;
          if ((L[i] - L[prev]) * m.dir <= 0) wall++;
        }
        prev = i;
      });
    }
  }
  // Before D217 nearly a third of the notes (29.8%) were open bars; now a few in a hundred.
  assert.ok(free / heads < 0.04, `crossbars ${free} of ${heads}`);
  // Five lanes cannot hold every scale: a pile at an edge stays about as rare as it was (4.7% before D217).
  assert.ok(wall / judged < 0.06, `edge piles ${wall} of ${judged}`);
});

test("D221: every Book I fugue played right through on LADDER, HIGHWAY and the computer's HIGHWAY (one voice each, the voice turning from fugue to fugue)", () => {
  for (let n = 1; n <= 24; n++) {
    const piece = `wtc1f${String(n).padStart(2, "0")}`;
    const f = fugueById(piece);
    for (const [j, id] of (["ladder", "highway", "keys"] as const).entries()) {
      const v = (n + j) % f.voices.length;
      const r = playThrough(id, piece, [v]);
      assert.ok(r.right === r.of && r.of > 0, `${id} ${piece} v${v}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
    }
  }
});

test("D219, D229: the phone's menu is exactly LADDER (HIGHWAY, TWO VOICES, KIMIKO, SUBJECT gone as modes; HIGHWAY plays the preludes); KIMIKO a switch in LADDER; every mode's rules in at most three short lines", () => {
  assert.deepEqual(menuOf("mobile").map((p) => [p.id, p.name]), [["ladder", "LADDER"]]);
  // D233: MIDI CONTROLLER (was PIANO) only while a MIDI input is connected.
  assert.deepEqual(menuOf("computer").map((p) => p.name), ["HIGHWAY", "SPACE + WASD + ←↑↓→"]);
  assert.deepEqual(menuOf("computer", true).map((p) => p.name), ["HIGHWAY", "SPACE + WASD + ←↑↓→", "MIDI CONTROLLER"]);
  for (const gone of ["duo", "kimiko", "highway", "subject"]) assert.ok(!PROTOS.some((p) => p.id === gone), gone);
  // A stored withdrawn mode falls back to the first; HIGHWAY's road stays reachable for SUBJECT's machinery.
  assert.equal(protoById("duo").id, "ladder");
  assert.equal(protoById("highway").layout, "full");
  // D233: WITH KIMIKO (once unlocked) on LADDER and the computer's modes.
  assert.deepEqual(PROTOS.filter((p) => takesHer(p.id)).map((p) => p.id), ["ladder", "keys", "arrows", "piano"]);
  assert.equal(takesHer("subject"), false);
  // The machinery stays internal (the tests' harness): a stored SUBJECT pick is not in the menu, so the app falls back to LADDER.
  assert.equal(protoById("subject"), SUBJECT_LINE);
  for (const p of PROTOS) {
    assert.ok(p.how.length >= 1 && p.how.length <= 3, p.id);
    for (const l of p.how) assert.ok(l.length <= 64, `${p.id}: ${l}`);
    assert.ok(p.short.length <= 40, `${p.id}: ${p.short}`);
  }
});
