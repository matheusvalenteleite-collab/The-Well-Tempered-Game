/** D353: the ornaments' Phase 0 (MORE BACH's signs found; the contour reader; the overlay; the guards). */
import { test } from "node:test";
import assert from "node:assert/strict";
import ornamentsData from "../data/wtc/ornaments.json" with { type: "json" };
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { beatOf, fugueById, loadExtras } from "../src/touch/fugue.ts";
import { parsePitch } from "../src/music/pitch.ts";
import { nachschlagAt, ORNAMENT_ALIAS, ornamentsOf, realiseNote, twoLegKind } from "../src/touch/ornament-play.ts";
import { ShakeReader, shakeThresholds } from "../src/touch/free-ornament.ts";
import { MECH_DEFAULTS, MECH_SPEC, resetMech, withMech } from "../src/bench/mechanics.ts";
import { ornamentUnit } from "../src/music/ornaments.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { outcomes, replay } from "../src/bench/lab/replay.ts";
import { parseLog, type LabLog } from "../src/bench/lab/log.ts";
import { parseStudy } from "../src/bench/lab/study.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";

test("D353: MORE BACH's Inventions and Sinfonias find their 310 written ornaments, each on its note", async () => {
  await loadExtras();
  const rows = ornamentsData as unknown as Record<string, [number, number, string, string][]>;
  let found = 0;
  let total = 0;
  for (const [id, key] of Object.entries(ORNAMENT_ALIAS)) {
    if (!/^bwv/.test(id)) continue;
    const f = fugueById(id);
    assert.equal(f.id, id, `${id} is a MORE BACH piece`);
    const m = ornamentsOf(f);
    for (const [v, on, pitch] of rows[key] ?? []) {
      total++;
      const n = f.voices[v]?.find((x) => x[0] === on);
      assert.ok(n, `${id} (${key}) voice ${v} has a note at ${on}`);
      assert.equal(n![2], parsePitch(pitch).midi, `${id} (${key}) ${v}:${on} is ${pitch}`);
      assert.ok(m.has(`${v}:${on}`), `${id} ${v}:${on} carries its sign`);
      found++;
    }
  }
  assert.equal(total, 310);
  assert.equal(found, 310);
  // Invention 1's mordents (the tutorial cites them) in MORE BACH too.
  assert.ok([...ornamentsOf(fugueById("bwv772")).values()].some((o) => /[Mm]/.test(o.signs)));
});

// ---- The owner's logs (27 October 2026: the STUDY's 100 takes and seven PASSAGE runs; data only) ----

const LOGS_DIR = new URL("./fixtures/owner-2026-10-27/", import.meta.url);
/** Every run in the owner's logs (a study's takes, each a log), with its file and place. */
function ownerLogs(): { id: string; log: LabLog }[] {
  const out: { id: string; log: LabLog }[] = [];
  for (const name of readdirSync(LOGS_DIR).sort()) {
    const text = gunzipSync(readFileSync(new URL(name, LOGS_DIR))).toString("utf8");
    if (name.startsWith("wtc-study")) parseStudy(text).excerpts.forEach((e, x) => e.takes.forEach((log, t) => out.push({ id: `${name} ${x + 1}:${t + 1}`, log })));
    else out.push({ id: name, log: parseLog(text) });
  }
  return out;
}
/** Each note's verdict: right, wrong or missed, its join, when. */
const verdicts = (events: readonly LabEvent[]) => [...outcomes(events)].map(([k, o]) => `${k} ${o.out} ${o.legato ?? "-"} ${o.tick.toFixed(1)}`);

test("D353: the owner's logs replayed: reading ornaments never changes a note's verdict; the slide guard only one join (a drift that turned back)", () => {
  // The reader as the game has it now (a log recorded D314's reach replays with the new one).
  const NEW = { shakeReachRows: MECH_DEFAULTS.shakeReachRows, shakeReachMinPx: MECH_DEFAULTS.shakeReachMinPx, shakeSteep: MECH_DEFAULTS.shakeSteep };
  const logs = ownerLogs();
  assert.equal(logs.length, 107);
  const changed: string[] = [];
  let shakes = 0;
  for (const { id, log } of logs) {
    const off = replay(log, { ...NEW, ornGestures: false });
    // The reading alone (no slide guard): every note's verdict, join and time as without it.
    const on = replay(log, { ...NEW, slideConfirmMs: 0 });
    assert.deepEqual(verdicts(on.events), verdicts(off.events), id);
    // With the slide guard (the game's): every note right, wrong or missed as without it.
    const game = replay(log, NEW);
    shakes += game.events.filter((e) => e.kind === "shake").length;
    const a = verdicts(off.events);
    const b = verdicts(game.events);
    assert.deepEqual(b.map((v) => v.split(" ").slice(0, 2).join(" ")), a.map((v) => v.split(" ").slice(0, 2).join(" ")), id);
    b.forEach((v, k) => v !== a[k] && changed.push(`${id} ${log.passage.piece}: ${a[k]} → ${v}`));
  }
  // II/24 take: the left thumb, holding, drifted 17 px onto the next note and back (a slide 79 ms early);
  // guarded, the slide waits, the thumb turns back, and the right thumb's strike takes the note (PERFECT).
  assert.equal(changed.length, 1, changed.join("\n"));
  assert.match(changed[0], /wtc2f24: 0:17 right - [\d.]+ → 0:17 right false [\d.]+/);
  // II/12's written mordent read in nine of ten takes, as the report found (the game's own count before: nine, another nine).
  assert.ok(shakes >= 9, `${shakes} ornaments read`);
});

test("D353: the contour reader on every held touch of the owner's logs: the 20 deliberate ornaments, nothing else", () => {
  const found: string[] = [];
  let held = 0;
  for (const { log } of ownerLogs()) {
    const f = fugueById(log.passage.piece);
    const th = shakeThresholds((beatOf(f).ticks / f.tpq) * (60 / log.passage.bpm), Math.max(18, log.rows?.rowH ?? 18));
    const label = `${log.passage.piece}${log.study ? ` take ${log.study.take}` : ""}`;
    let u = 0;
    const open = new Map<number, { side: string; pts: { x: number; y: number; t: number }[] }>();
    for (const e of log.ev) {
      if (typeof e === "number") {
        u += e;
        continue;
      }
      u += e[1];
      const t = u * 0.1;
      if (e[0] === "d") open.set(e[2], { side: e[5], pts: [{ x: e[3], y: e[4], t }] });
      else if (e[0] === "m") open.get(e[2])?.pts.push({ x: e[3], y: e[4], t });
      else if (e[0] === "u" || e[0] === "c") {
        const c = open.get(e[2]);
        open.delete(e[2]);
        if (!c || t - c.pts[0].t < 150) continue;
        held++;
        // Fed as the game feeds it: each move, and a frame's tick (60 Hz) between moves and to the lift.
        const r = new ShakeReader(c.pts[0], th);
        let read = false;
        let last = c.pts[0].t;
        for (const p of [...c.pts.slice(1), { x: NaN, y: NaN, t }]) {
          for (let fr = last + 16.7; fr < p.t; fr += 16.7) read = !!r.tick(fr) || read;
          last = p.t;
          if (Number.isNaN(p.x)) break;
          read = !!r.feed(p.x, p.y, p.t) || read;
        }
        read = !!r.tick(t, true) || read;
        if (read) found.push(`${label} ${c.side}`);
      }
    }
  }
  assert.equal(held, 2093);
  const want = [
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `wtc1f12 take ${k} ${k === 2 ? "l" : "r"}`),
    "wtc2f23 take 4 l",
    "wtc2f18 take 4 l",
    ...[0, 1, 2, 3, 4, 5, 6, 8, 9].map((k) => `wtc2f12 take ${k} ${[2, 5, 8].includes(k) ? "r" : "l"}`),
  ];
  assert.deepEqual([...found].sort(), [...want].sort());
});

// ---- The reader's thresholds by the tempo ----

test("D353: the thresholds scale with the beat (the report's table at crotchet = 50, 80, 120) and are MECH's, every one in the Lab", () => {
  const at = (bpm: number) => shakeThresholds(60 / bpm, 18);
  assert.deepEqual([at(50).reach, at(80).reach, at(120).reach], [3, 3, 3]);
  assert.deepEqual([at(50).Lm, at(80).Lm, at(120).Lm].map(Math.round), [220, 220, 150]);
  assert.deepEqual([at(50).Lt, at(80).Lt, at(120).Lt].map(Math.round), [160, 150, 100]);
  assert.deepEqual([at(50).S, at(80).S, at(120).S].map(Math.round), [500, 450, 300]);
  assert.equal(shakeThresholds(0.75, 40).reach, 6, "0.15 of a larger row");
  for (const k of ["ornGestures", "shakeReachRows", "shakeReachMinPx", "shakeWholeLeg", "ornLegBeats", "ornLegMinMs", "ornLegMaxMs", "trillLegBeats", "trillLegMinMs", "trillLegMaxMs", "ornStartBeats", "ornStartMinMs", "ornStartMaxMs", "turnAfterShare", "turnAfterMinMs", "trillEnding", "slideConfirmMs"])
    assert.ok(MECH_SPEC.some((s) => s.key === k && s.group === "ORNAMENTS"), k);
  assert.equal(MECH_DEFAULTS.shakeReachMinPx, 3);
  assert.equal(MECH_DEFAULTS.trillEnding, "rule");
});

test("D353: whole-leg steepness: an elliptical thumb's large shake is read; D314's steepness at the reach loses it", () => {
  // A mordent 40 px deep whose legs start sideways (an elliptical thumb): steep over the whole leg, not where it passes 3 px.
  const path: [number, number, number][] = [[0, 100, 200]];
  const pts = 8;
  for (let k = 1; k <= pts; k++) path.push([k * 12, 100 + (k === 1 ? 4 : 5 - (k - 2) * 0.66), 200 + (40 * k) / pts]);
  for (let k = 1; k <= pts; k++) path.push([pts * 12 + k * 12, 101 - k * 0.3, 240 - (40 * k) / pts]);
  const read = (wholeLeg: boolean) => {
    const r = new ShakeReader({ x: 100, y: 200, t: 0 }, { ...shakeThresholds(0.75, 18), wholeLeg });
    const out: string[] = [];
    for (const [t, x, y] of path.slice(1)) {
      const g = r.feed(x, y, t);
      if (g) out.push(g);
    }
    for (let f = 200; f < 400; f += 16) {
      const g = r.tick(f);
      if (g) out.push(g);
    }
    return out;
  };
  assert.deepEqual(read(true), ["down"]);
  assert.deepEqual(read(false), []);
});

// ---- In a fugue ----

const RH = 18;
const ROWS: Rows = { yOf: (s) => 600 - s * RH, stepAt: (y) => Math.round((600 - y) / RH), rowH: RH, xOf: () => 400 };
const W = 844;
type Heard = { midi: number; at: number };
function fakeChip(clock: { t: number }, heard: Heard[]) {
  return {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    visual: 0,
    smooth: false,
    note: (midi: number, at: number, _d: number, _v: unknown, p: Play = {}) => {
      if (p.lead) heard.push({ midi, at });
      return { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
    },
    swoosh() {},
    tick() {},
  } as unknown as Chip;
}
type Move = (dy: number, dx: number, ms: number) => void;
const msOf = (g: ProtoGame, a: number, b: number) => (g.timeAt(b) - g.timeAt(a)) * 1000;
/**
 * Plays track 0 of a fugue right on LADDER, a fresh thumb each note; `during(g, i, move, wait)` may move
 * the held thumb (frames between: the game's clock) or let time pass. Returns the game, what sounded.
 */
function play(id: string, voice: number, during: (g: ProtoGame, i: number, move: Move, wait: (ms: number) => void) => void, after?: (g: ProtoGame, i: number) => void) {
  const clock = { t: 0 };
  const heard: Heard[] = [];
  const realNow = performance.now.bind(performance);
  Object.defineProperty(performance, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  try {
    const f = fugueById(id);
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until: f.length, wait: false, solo: false, fail: false }, fakeChip(clock, heard));
    g.rows = ROWS;
    const notes = g.tracks[0].notes;
    notes.forEach((n, i) => {
      if (n.ride || (i > 0 && notes[i - 1].on === n.on)) return;
      const t0 = g.timeAt(n.on);
      if (clock.t > t0) return;
      while (clock.t < t0 - 0.016) (clock.t += 0.016), g.step();
      clock.t = t0;
      g.step();
      const side = i % 2 ? "right" : "left";
      const c = { side, x: side === "left" ? 60 : W - 60, y: ROWS.yOf(n.step), w: W, h: 390 } as const;
      g.down(i + 1, c, performance.now());
      let y = c.y;
      let x = c.x;
      const end = g.timeAt(n.on + n.dur);
      const wait = (ms: number) => {
        const until = Math.min(end - 0.04, clock.t + ms / 1000);
        while (clock.t < until) (clock.t += 0.016), g.step();
      };
      during(g, i, (dy, dx, ms) => {
        clock.t += ms / 1000;
        y += dy;
        x += dx;
        g.move(i + 1, { ...c, x, y }, performance.now());
        g.step();
      }, wait);
      while (clock.t < end - 0.03) (clock.t += 0.016), g.step();
      g.up(i + 1, performance.now());
      after?.(g, i);
    });
    while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), g.step();
    return { r: g.results(), g, heard };
  } finally {
    Object.defineProperty(performance, "now", { value: realNow, configurable: true, writable: true });
  }
}
/** Legs along the bar, `amp` px each, `ms` long (two moves each), the first up (1) or down (-1). */
const legs = (move: Move, n: number, first: 1 | -1, amp = 6, ms = 60) => {
  for (let k = 0; k < n; k++) {
    const up = k % 2 === 0 ? first : -first;
    move(-up * amp * 0.5, 0, ms / 2);
    move(-up * amp * 0.5, 0, ms / 2);
  }
};

test("D353: the two-leg shake named by its direction and the music: down a mordent; up a Pralltriller after a falling second, joined", () => {
  resetMech();
  const f = fugueById("wtc1f02");
  const notes = f.voices[0];
  const fallen = (i: number) => i > 0 && notes[i - 1][3] - notes[i][3] === 1 && notes[i - 1][0] + notes[i - 1][1] >= notes[i][0];
  const kinds = new Map<number, string>();
  const { g } = play("wtc1f02", 0, (g, i, move) => {
    const n = g.tracks[0].notes[i];
    if (n.dur < g.f.tpq / 2 || g.ornamentAt(0, i) || !(i % 3 === 0 || fallen(notes.findIndex((x) => x[0] === n.on)))) return;
    legs(move, 2, i % 3 === 0 && !fallen(notes.findIndex((x) => x[0] === n.on)) ? -1 : 1, 5, 70);
    kinds.set(i, "");
  });
  const done = [...g.performed.entries()].filter(([, p]) => p.free);
  assert.ok(done.length >= 6, `${done.length} read`);
  for (const [k, p] of done) {
    const i = Number(k.split(":")[1]);
    const n = g.tracks[0].notes[i];
    const j = notes.findIndex((x) => x[0] === n.on);
    if (fallen(j)) assert.equal(p.kind, "pralltriller", `${k}: up after a falling second`);
    else assert.equal(p.kind, "mordent", `${k}: down`);
    assert.ok(p.parts.length >= 2 && p.parts.at(-1)![2] === n.midi, "ends on the note");
  }
  // The context names only: a clear direction wins (a mordent on a note reached by a falling second, unstylish, is the player's).
  assert.equal(twoLegKind(f, notes[19][0], notes[19][2], notes[19][1], "down"), "mordent");
  assert.equal(twoLegKind(f, notes[19][0], notes[19][2], notes[19][1], "blur"), "pralltriller");
  assert.equal(twoLegKind(f, notes[19][0], notes[19][2], notes[19][1], "up"), "pralltriller");
});

test("D353: a trill with no room becomes a turn; a late two-leg shake on a long note, the turn after the note", () => {
  resetMech();
  // A trill begun too near the end of a quaver: the turn (U N L N).
  let short = -1;
  const a = play("wtc1f02", 0, (g, i, move, wait) => {
    const n = g.tracks[0].notes[i];
    if (short >= 0 || g.ornamentAt(0, i) || n.dur !== g.f.tpq / 2 || g.timeAt(n.on) < 1) return;
    short = i;
    wait(90);
    legs(move, 3, 1, 5, 40);
  });
  const t = a.g.performed.get(`0:${short}`)!;
  assert.equal(t.kind, "turn", JSON.stringify(t));
  assert.ok(t.parts[0][2] > t.midi && t.parts.some((p) => p[2] < t.midi), "U N L N");
  // A crotchet or longer, the shake past 40% of it: the turn after the note.
  let long = -1;
  const b = play("wtc1f02", 0, (g, i, move, wait) => {
    const n = g.tracks[0].notes[i];
    if (long >= 0 || g.ornamentAt(0, i) || n.dur < g.f.tpq || g.timeAt(n.on) < 1 || msOf(g, n.on, n.on + n.dur) < 1200) return;
    const next = g.tracks[0].notes[i + 1];
    if (next && n.step - next.step === 1) return;
    long = i;
    // Past S (the first leg begun more than half a second after the landing at this tempo) and past 40% of the note.
    wait(0.55 * msOf(g, n.on, n.on + n.dur));
    legs(move, 2, 1, 5, 60);
  });
  const p = b.g.performed.get(`0:${long}`)!;
  assert.equal(p.kind, "turn");
  const n = b.g.tracks[0].notes[long];
  assert.ok(p.parts[0][0] > n.on + n.dur * 0.4, "late in the note");
  // Early on the same note, the same gesture is the Pralltriller's or the short trill's.
  let early = -1;
  const c = play("wtc1f02", 0, (g, i, move) => {
    if (i !== long) return;
    early = i;
    legs(move, 2, 1, 5, 60);
  });
  assert.notEqual(c.g.performed.get(`0:${early}`)!.kind, "turn");
});

test("D353: the trill's ending by C. P. E. Bach's rule: the Nachschlag on a long note, none in a falling series or on a short note; SETTLE settles", () => {
  resetMech();
  const f = fugueById("wtc1f02");
  const bpm = tempoOf("wtc1f02");
  const v = f.voices[0];
  const long = v.find((n) => n[1] >= f.tpq)!;
  assert.equal(nachschlagAt(f, long[0], long[2], long[1], bpm), true, "a beat or more");
  const short = v.find((n) => n[1] <= f.tpq / 4)!;
  assert.equal(nachschlagAt(f, short[0], short[2], short[1], bpm), false, "no room");
  // A note stepping down from the note before to the note after (a falling series): none (I/12's minims).
  const series = fugueById("wtc1f12").voices.flatMap((w) => w.filter((n, k) => k > 0 && k < w.length - 1 && w[k - 1][3] - n[3] === 1 && n[3] - w[k + 1][3] === 1 && w[k - 1][0] + w[k - 1][1] >= n[0] && n[1] >= f.tpq));
  assert.ok(series.length > 0);
  for (const n of series) assert.equal(nachschlagAt(fugueById("wtc1f12"), n[0], n[2], n[1], tempoOf("wtc1f12")), false, "a falling series");
  // The band's long trills close … U N L N; SETTLE, the main note settles after the upper.
  const fs = fugueById("wtc1f06");
  const noteOf = (k: string) => fs.voices[Number(k.split(":")[0])].find((n) => n[0] === Number(k.split(":")[1]))!;
  const [key, o] = [...ornamentsOf(fs)].find(([k, x]) => /[Tt]/.test(x.signs) && !x.signs.includes("R") && noteOf(k)[1] >= fs.tpq && nachschlagAt(fs, noteOf(k)[0], noteOf(k)[2], noteOf(k)[1], tempoOf(fs.id)))!;
  const [vv, on] = key.split(":").map(Number);
  const note = fs.voices[vv].find((n) => n[0] === on)!;
  const rule = realiseNote(fs, o, on, note[1], note[2], undefined, tempoOf(fs.id));
  assert.ok(rule.at(-2)![2] < note[2] && rule.at(-3)![2] === note[2] && rule.at(-4)![2] > note[2], "… U N L N");
  assert.equal(rule[0][2] > note[2], true, "from the upper note");
  const settle = withMech({ trillEnding: "settle" }, () => realiseNote(fs, o, on, note[1], note[2], undefined, tempoOf(fs.id)));
  assert.ok(settle.at(-2)![2] > note[2], "U, then the note held");
});

test("D353: the player's trill from the upper note; stopped early under the rule it closes with the Nachschlag", () => {
  resetMech();
  let at = -1;
  const { g } = play("wtc1f02", 0, (g, i, move) => {
    const n = g.tracks[0].notes[i];
    if (at >= 0 || g.ornamentAt(0, i) || n.dur < g.f.tpq || g.timeAt(n.on) < 1 || !nachschlagAt(g.f, n.on, n.midi, n.dur, g.bpm)) return;
    at = i;
    legs(move, 5, -1, 5, 50);
  });
  const p = g.performed.get(`0:${at}`)!;
  assert.equal(p.kind, "trill");
  assert.ok(p.parts[0][2] > p.midi, "the realised trill starts on the upper note, though the thumb began down");
  const tail = p.parts.slice(-3).map((q) => Math.sign(q[2] - p.midi));
  assert.deepEqual(tail.slice(-2), [-1, 0], `ends L N: ${JSON.stringify(p.parts.map((q) => q[2]))}`);
});

test("D353: no reading on a run's notes, on a note riders follow, nor on a note too short; BLUETOOTH MODE none", () => {
  resetMech();
  const { g } = play("wtc1f02", 0, (g, i, move) => {
    if (!g.ornamentAt(0, i)) legs(move, 4, 1, 5, 30);
  });
  const notes = g.tracks[0].notes;
  for (const k of g.performed.keys()) {
    const i = Number(k.split(":")[1]);
    assert.ok(msOf(g, notes[i].on, notes[i].on + notes[i].dur) >= 100 + 2 * (60000 / g.bpm) * ornamentUnit(g.bpm / 2), `${k} long enough`);
    assert.ok(!notes[i + 1]?.ride, `${k}: no riders after`);
  }
  assert.ok(g.performed.size > 3);
});

test("D353: after an ornament the thumb's reference returns to its landing; the overlay holds the notes as they sound", () => {
  resetMech();
  let at = -1;
  let during: boolean | undefined;
  let lifted: boolean | undefined;
  const { g } = play(
    "wtc1f02",
    0,
    (g, i, move) => {
      const n = g.tracks[0].notes[i];
      if (at >= 0 || g.ornamentAt(0, i) || n.dur < g.f.tpq || g.timeAt(n.on) < 1) return;
      at = i;
      // A large mordent (two and a half rows down and back): D286 calls the thumb moved while it shakes...
      legs(move, 2, -1, 45, 80);
      during = g.lastBySide[i % 2 ? "right" : "left"]?.moved;
    },
    (g, i) => {
      if (i === at) lifted = g.lastBySide[i % 2 ? "right" : "left"]?.moved;
    },
  );
  assert.equal(during, true, "moved while it shook");
  // ...and, lifted where it landed, its reference is its landing again (the next note judged from it).
  assert.equal(lifted, false);
  const p = g.performed.get(`0:${at}`)!;
  assert.equal(p.kind, "mordent");
  assert.ok(p.parts.length === 2 && p.parts.every((q) => q[0] >= p.on && q[0] < p.end), "its notes as they sounded, in its note");
  // The band's written ornaments are drawn too (I/2 has none in the other voices: I/6's band trills).
  const six = play("wtc1f06", 0, () => {});
  assert.ok(six.g.bandPerformed.length > 0 || [...ornamentsOf(fugueById("wtc1f06")).keys()].every((k) => k.startsWith("0:")), "the band's performed");
  assert.ok(six.g.overlay().every((o) => o.end > six.g.now - 1.2 * six.g.tps), "faded a second after its note");
});

test("D353: PRESS disabled on a resting thumb whose shake is read", () => {
  const src = readFileSync(new URL("../src/bench/proto-game.ts", import.meta.url), "utf8");
  assert.match(src, /if \(!p\.read\?\.kind\) this\.prepPress\(id, h, c, ts\);/);
});
