/**
 * D378 (WTC 1.83): Glenn's mechanics the game's default everywhere; MECHANICS: CLASSIC in the Lab only.
 * The owner on the Expression Lab: "ornaments ain't working". Each ornament gesture read with the flag
 * on at least as often as with it off, by a thumb shaped like a real one on an iPhone (shakes of 6–30 px
 * and of the owner's own 30–90 px, legs of 40–120 ms, drift, imperfect alternation, a rest at a turn),
 * also with the other thumb resting early on the next note (the owner's habit, D369 i); the owner's 20
 * logged ornaments read as before; a one-way slide still a slide.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { asRecorded, CLASSIC_VALUES, MECH, MECH_CLASSIC, MECH_DEFAULTS, withMech } from "../src/bench/mechanics.ts";
import { configById, configMech } from "../src/bench/lab/presets.ts";
import { labPlayParam } from "../src/bench/glenn.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { ShakeReader, shakeThresholds } from "../src/touch/free-ornament.ts";
import { ornamentsOf } from "../src/touch/ornament-play.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import type { Chip } from "../src/touch/chip.ts";
import { replay } from "../src/bench/lab/replay.ts";
import { parseLog, type LabLog } from "../src/bench/lab/log.ts";
import { parseStudy } from "../src/bench/lab/study.ts";
import { RULES } from "../src/bench/lite.ts";
import type { Material } from "../src/bench/manual/lessons.ts";
import { gameFor, ROWS as GROWS } from "./d342-sim.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D378: Glenn's mechanics are the default (play.html, the tutorial, the Lab); CLASSIC is the Lab's A and lab.html?glenn=0", () => {
  assert.equal(MECH_DEFAULTS.glenn, true);
  assert.equal(MECH.glenn, true);
  assert.equal(MECH_CLASSIC.glenn, false);
  assert.equal(CLASSIC_VALUES.glenn, false);
  assert.equal(configMech(configById("B+")!).glenn, true, "the Lab's default config, the game's");
  assert.equal(configMech(configById("A")!).glenn, false);
  assert.equal(labPlayParam("?glenn=0"), "classic");
  assert.equal(labPlayParam("?glenn=1"), "glenn");
  // The Lab's play page: no GLENN badge; CLASSIC's says so; the Lab's tabs link both.
  const main = src("src/bench/lab/lab-main.tsx");
  assert.doesNotMatch(main, /GLENN MECHANICS ON/);
  assert.match(main, /\{classic && <b>MECHANICS: CLASSIC<\/b>\}/);
  assert.match(main, /setMech\(\{ glenn: !classic \}\)/);
  const lab = src("src/bench/lab/LabApp.tsx");
  assert.match(lab, /href="\?glenn=1"[^]*PLAY ALL PIECES/);
  assert.match(lab, /href="\?glenn=0"[^]*MECHANICS: CLASSIC/);
  // HOW TO PLAY: joined by ear, over-legato, the slide's slur; the accent asks no hold.
  const ladder = RULES.ladder.join(" ");
  assert.match(ladder, /Joined means no gap you can hear \(25 ms or less\)/);
  assert.match(ladder, /over-legato/);
  assert.match(ladder, /on a keyboard a slur begins/);
  assert.doesNotMatch(ladder, /hold it its full length/);
});

// ---- Old takes keep their mechanics ----

const LOGS_DIR = new URL("./fixtures/owner-2026-10-27/", import.meta.url);
function ownerLogs(): LabLog[] {
  const out: LabLog[] = [];
  for (const name of readdirSync(LOGS_DIR).sort()) {
    const text = gunzipSync(readFileSync(new URL(name, LOGS_DIR))).toString("utf8");
    if (name.startsWith("wtc-study")) parseStudy(text).excerpts.forEach((e) => e.takes.forEach((log) => out.push(log)));
    else out.push(parseLog(text));
  }
  return out;
}

test("D378: a take recorded before (no glenn named) replays with the CLASSIC mechanics; one that names it, as named", () => {
  assert.equal(asRecorded({}).glenn, false);
  assert.equal(asRecorded({ glenn: true }).glenn, true);
  const log = ownerLogs()[0];
  assert.equal(log.mech.glenn, undefined);
  const r = replay(log);
  assert.equal(r.mech.glenn, false);
  // Every verdict as recorded, under CLASSIC exactly as before.
  const classic = replay(log, MECH_CLASSIC.glenn === false ? {} : { glenn: false });
  assert.deepEqual(classic.summary, r.summary);
  assert.equal(MECH.glenn, true, "the game's parameters untouched");
});

test("D378: the owner's 20 logged ornaments (shakes of 27–136 px) read with Glenn's reader as with CLASSIC's, nothing else (one a trill)", () => {
  const read = (glenn: boolean) => {
    const found: string[] = [];
    for (const log of ownerLogs()) {
      const f = fugueById(log.passage.piece);
      const th = shakeThresholds((beatOf(f).ticks / f.tpq) * (60 / log.passage.bpm), Math.max(18, log.rows?.rowH ?? 18), { ...MECH_DEFAULTS, glenn });
      let u = 0;
      const open = new Map<number, { x: number; y: number; t: number }[]>();
      for (const e of log.ev) {
        if (typeof e === "number") {
          u += e;
          continue;
        }
        u += e[1];
        const t = u * 0.1;
        if (e[0] === "d") open.set(e[2], [{ x: e[3], y: e[4], t }]);
        else if (e[0] === "m") open.get(e[2])?.push({ x: e[3], y: e[4], t });
        else if (e[0] === "u" || e[0] === "c") {
          const pts = open.get(e[2]);
          open.delete(e[2]);
          if (!pts || t - pts[0].t < 150) continue;
          const r = new ShakeReader(pts[0], th);
          let last = pts[0].t;
          for (const p of pts.slice(1)) {
            for (let fr = last + 16.7; fr < p.t; fr += 16.7) r.tick(fr);
            last = p.t;
            r.feed(p.x, p.y, p.t);
          }
          for (let fr = last + 16.7; fr < t; fr += 16.7) r.tick(fr);
          r.tick(t, true);
          if (r.kind) found.push(`${log.passage.piece} ${log.study?.take ?? ""} ${r.kind}`);
        }
      }
    }
    return found;
  };
  const glenn = read(true);
  assert.equal(glenn.length, 20, "WTC 1.82's 1.5-row cap on a leg read 4 of them");
  // The same touches; one named otherwise: II/18's large shake late in a long note (56, 129, 106 px in
  // 300 ms, after 700 ms still), its first leg timed from a frame before it moved (D378), a trill where
  // CLASSIC, timing it from the last touch, dropped it and read the turn after the note from two legs.
  assert.deepEqual(glenn, read(false).map((k) => (k === "wtc2f18 4 late" ? "wtc2f18 4 trill" : k)));
});

// ---- In a fugue at tempo: a real thumb's shakes ----

const RH = 12;
const ROWS: Rows = { yOf: (s) => 900 - s * RH, stepAt: (y) => Math.round((900 - y) / RH), rowH: RH, xOf: () => 400 };
type Kind = "mordent" | "up" | "trill" | "late" | "slide" | "written";
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}
function silent(clock: { t: number }): Chip {
  return {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    visual: 0,
    smooth: false,
    note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} }),
    swoosh() {},
    tick() {},
  } as unknown as Chip;
}
/** A shake's path ([ms, dx, dy]): eased legs, each a little off the first's size, drift across, now and then a rest at a turn. */
function shakePath(kind: Kind, r: () => number, big: boolean): [number, number, number][] {
  const legs = kind === "trill" ? 4 + Math.floor(r() * 3) : 2;
  const first = kind === "mordent" ? 1 : kind === "up" ? -1 : r() < 0.5 ? 1 : -1;
  const amp0 = big ? 30 + r() * 60 : 6 + r() * 24;
  const out: [number, number, number][] = [];
  let t = 0;
  let y = 0;
  let x = 0;
  for (let k = 0; k < legs; k++) {
    const dir = k % 2 === 0 ? first : -first;
    const amp = amp0 * (k === 0 ? 1 : 0.65 + r() * 0.5);
    const legMs = kind === "trill" ? 40 + r() * 50 : 50 + r() * 70;
    const n = Math.max(2, Math.round(legMs / 16));
    for (let j = 1; j <= n; j++) {
      t += legMs / n + (r() - 0.5) * 4;
      x += (r() - 0.5) * 2;
      out.push([t, x, y + dir * amp * ((1 - Math.cos((Math.PI * j) / n)) / 2)]);
    }
    y += dir * amp;
    if (r() < 0.35) out.push([(t += 16 + r() * 24), x, y + (r() - 0.5)]);
  }
  return out;
}
/**
 * Plays voice 0 of a fugue right, thumbs taking turns, every note of a beat or more shaken as `kind`
 * (`slide`: the held thumb slid one way to the next note's height, arriving on its time, no other thumb);
 * with `rest`, each thumb lands on its note right after the note before sounds and the lift sounds it.
 * Returns the shaken notes and how many read as asked, and the slides played.
 */
function shaken(id: string, kind: Kind, glenn: boolean, rest: boolean, big: boolean, seed = 7, voice = 0) {
  return withMech({ glenn }, () => {
    const clock = { t: 0 };
    const f = fugueById(id);
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until: f.length, wait: false, solo: false, fail: false }, silent(clock));
    g.rows = ROWS;
    g.wall = () => 0;
    const notes = g.tracks[0].notes;
    const heads = notes.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && notes[i - 1].on === n.on));
    const r = rng(seed);
    const evs: { t: number; k: number; fn: () => void }[] = [];
    const tried = new Set<number>();
    let slidFrom = -1;
    heads.forEach(({ n, i }, j) => {
      const side = j % 2 ? "right" : "left";
      const x0 = side === "left" ? 60 : 784;
      const t = g.timeAt(n.on);
      const nx = heads[j + 1] ? g.timeAt(heads[j + 1].n.on) : t + 0.6;
      const y0 = ROWS.yOf(n.step);
      const c = (x: number, y: number) => ({ side, x, y, w: 844, h: 390 }) as const;
      const noteMs = (nx - t) * 1000;
      if (kind === "slide") {
        // Every fourth note slid on to the next (the next not struck), a one-way move of 80–160 ms.
        if (j === slidFrom + 1) return;
        const next = heads[j + 1];
        evs.push({ t, k: 1, fn: () => g.down(j + 1, c(x0, y0), 0) });
        if (next && j % 4 === 0 && Math.abs(next.n.step - n.step) >= 1) {
          slidFrom = j;
          tried.add(next.i);
          const y1 = ROWS.yOf(next.n.step);
          const ms = 80 + r() * 80;
          for (let s = 1; s <= 6; s++) evs.push({ t: nx - ms / 1000 + (ms * s) / 6000, k: 2, fn: () => g.move(j + 1, c(x0 + (r() - 0.5) * 2, y0 + ((y1 - y0) * s) / 6), 0) });
          const after = heads[j + 2] ? g.timeAt(heads[j + 2].n.on) : nx + 0.5;
          evs.push({ t: after - 0.012, k: 0, fn: () => g.up(j + 1, 0) });
        } else evs.push({ t: nx - 0.012, k: 0, fn: () => g.up(j + 1, 0) });
        return;
      }
      evs.push({ t: rest && j > 0 ? g.timeAt(heads[j - 1].n.on) + 0.03 + r() * 0.05 : t, k: 1, fn: () => g.down(j + 1, c(x0, y0), 0) });
      // A written ornament (D278) shaken as a trill wherever its sign is; a free one on a beat or more.
      if (kind === "written" ? !!g.ornamentAt(0, i) && noteMs > 200 : n.dur >= g.beat && noteMs > 380) {
        const path = shakePath(kind === "written" ? "trill" : kind, r, big);
        const start = kind === "late" ? noteMs * (0.55 + r() * 0.1) : 30 + r() * 90;
        // (The turn after the note needs its last leg's rest, 50 ms, and room to sound before the note ends.)
        if (kind === "written" || start + path.at(-1)![0] <= noteMs - (kind === "late" ? 100 : 40)) tried.add(i);
        for (const [pt, dx, dy] of path) if (start + pt < noteMs - 30) evs.push({ t: t + (start + pt) / 1000, k: 2, fn: () => g.move(j + 1, c(x0 + dx, y0 + dy), 0) });
      }
      evs.push({ t: rest ? nx + 0.005 : nx - 0.012, k: 0, fn: () => g.up(j + 1, 0) });
    });
    const got = new Map<number, string[]>();
    const slid = new Set<number>();
    g.tap = (e) => {
      if (e.kind === "shake" && e.free === (kind !== "written") && e.track === 0 && !e.ornament.startsWith("settled")) got.set(e.i, [...(got.get(e.i) ?? []), e.ornament]);
      if (e.kind === "note" && e.slide && e.ok) slid.add(e.i);
    };
    evs.sort((a, b) => a.t - b.t || a.k - b.k);
    let done = false;
    for (const e of evs) {
      while (!done && clock.t + 1 / 240 < e.t) (clock.t += 1 / 240), (done = g.step());
      if (done) break;
      clock.t = Math.max(clock.t, e.t);
      e.fn();
    }
    while (!done && clock.t < 2000) (clock.t += 1 / 120), (done = g.step());
    const want = (o: string[]) =>
      kind === "written" ? o.length >= 1 : kind === "mordent" ? o.length === 1 && o[0] === "mordent" : kind === "up" ? o.length === 1 && ["short", "pralltriller", "schneller"].includes(o[0]) : kind === "trill" ? ["trill", "turn"].includes(o.at(-1)!) : o.length === 1 && o[0] === "turn after the note";
    let ok = 0;
    for (const i of tried) if (kind === "slide" ? slid.has(i) : got.has(i) && want(got.get(i)!)) ok++;
    return { ok, of: tried.size, slides: slid.size, right: g.results().right, notes: g.results().of };
  });
}

test("D378: each ornament gesture read with Glenn's mechanics at least as often as with CLASSIC's: small and large shakes, with and without the other thumb resting early", () => {
  // Rates for the D378 row (II/12, I/2, I/22, two seeds, rows of 12 px): before the fix, with the flag on,
  // large shakes read 0–2% (the 1.5-row leg cap), small ones 81–86%, the turn after the note 0–28%; now
  // mordent, up and trill 100% (CLASSIC 85–100%), the turn after the note 36% (CLASSIC 4–31%: the rest
  // is the music's, a falling second after or no room, named otherwise).
  const rows: string[] = [];
  for (const big of [false, true])
    for (const rest of [false, true])
      for (const kind of ["mordent", "up", "trill", "late"] as const) {
        const on = shaken("wtc2f12", kind, true, rest, big);
        const off = shaken("wtc2f12", kind, false, rest, big);
        rows.push(`${big ? "large" : "small"} ${rest ? "resting" : "alone"} ${kind}: on ${on.ok}/${on.of}, CLASSIC ${off.ok}/${off.of}`);
        assert.equal(on.of, off.of);
        assert.ok(on.ok >= off.ok, rows.at(-1));
        assert.equal(on.right, off.right, `${rows.at(-1)}: every note as right`);
        // (Resting, the simulated thumb lands just after a quick note before it and strikes early, its
        // note part of a run: no ornament is read there, either way.)
        if (kind !== "late") assert.ok(on.ok >= (rest ? 0.6 : 0.8) * on.of, rows.at(-1));
      }
});

test("D378: a late shake after a still thumb (no touches meanwhile) is read: the turn after the note; CLASSIC's reader as before", () => {
  // A long note at crotchet = 60: the thumb lands, lies still 600 ms (a still thumb sends no touches),
  // then a quick large down-and-back (40 px, 60 ms each way): its first leg once timed from the landing.
  const read = (glenn: boolean) => {
    const th = shakeThresholds(1, 18, { ...MECH_DEFAULTS, glenn });
    const r = new ShakeReader({ x: 100, y: 500, t: 0 }, th);
    for (let t = 16.7; t < 600; t += 16.7) r.tick(t);
    for (let k = 1; k <= 4; k++) r.feed(100, 500 + 10 * k, 600 + 15 * k);
    for (let k = 1; k <= 4; k++) r.feed(100, 540 - 10 * k, 660 + 15 * k);
    for (let t = 736; t < 900; t += 16.7) r.tick(t);
    return r.kind;
  };
  assert.equal(read(true), "late");
  assert.equal(read(false), null, "CLASSIC unchanged (its first leg timed from the landing, slow)");
});

test("D378: a written ornament shaken (I/6's trills) read with Glenn's mechanics as with CLASSIC's, large and small, resting or not", () => {
  const f = fugueById("wtc1f06");
  const orn = ornamentsOf(f);
  const voice = [0, 1, 2].find((v) => f.voices[v].some((n) => orn.has(`${v}:${n[0]}`)))!;
  for (const big of [false, true])
    for (const rest of [false, true]) {
      const on = shaken("wtc1f06", "written", true, rest, big, 7, voice);
      const off = shaken("wtc1f06", "written", false, rest, big, 7, voice);
      assert.ok(on.of > 0 && on.of === off.of);
      assert.equal(on.ok, on.of, `${big ? "large" : "small"} ${rest ? "resting" : "alone"}: ${on.ok}/${on.of} (CLASSIC ${off.ok})`);
    }
});

test("D378: a one-way slide is still Glenn's slide (and his slur): not taken for a shake", () => {
  const on = shaken("wtc2f12", "slide", true, false, false);
  assert.ok(on.of >= 5);
  assert.equal(on.ok, on.of, `slid ${on.ok} of ${on.of}`);
});

test("D378: the hold-over appoggiatura with Glenn's mechanics, the resting thumb rolling and drifting (to 30 px/s), the lift a little off: as with CLASSIC's", () => {
  const I22: Material = { piece: "wtc1f22", voice: 0, fromBar: 13, toBar: 17, tempo: { pct: 100 }, label: "I/22", badge: "IN GAME" };
  const run = (glenn: boolean, seed: number) =>
    withMech({ glenn }, () => {
      const r = rng(seed);
      const clock = { t: 0 };
      const { g } = gameFor(I22, clock);
      g.o.demo = false;
      g.wall = () => 0;
      let appo = 0;
      const feed = g.tap!;
      g.tap = (e) => (e.kind === "prep" && e.what === "appoggiatura" && appo++, feed(e));
      const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
      const es: { t: number; k: number; fn: () => void }[] = [];
      const offs: number[] = [];
      heads.forEach((n, k) => {
        const side = k % 2 ? "right" : "left";
        const x = side === "left" ? 40 : 760;
        const prev = heads[k - 1];
        const next = heads[k + 1];
        // Bars 15–17's three places held over a third to two thirds of their notes.
        const share = next && [7, 8, 9].includes(k + 1) ? 0.3 + r() * 0.35 : 0;
        const t1 = next ? g.timeAt(next.on + share * next.dur) + (r() - 0.5) * 0.02 : g.timeAt(n.on + n.dur) - 0.02;
        offs.push(t1);
        const t0 = !prev ? g.timeAt(n.on) : Math.max(g.timeAt(prev.on) + 0.05 + r() * 0.1, (offs[k - 2] ?? -1) + 0.03);
        const y = GROWS.yOf(n.step) + (r() - 0.5) * 6;
        const c = (dx: number, dy: number) => ({ side, x: x + dx, y: y + dy, w: 800, h: 1000 }) as const;
        es.push({ t: t0, k: 1, fn: () => g.down(k + 1, c(0, 0), 0) });
        const dir = r() < 0.5 ? 1 : -1;
        let dx = 0;
        let dy = 0;
        for (let t = t0 + 0.016; t < t1 - 0.005; t += 0.016 + r() * 0.01) {
          dy += dir * 30 * 0.016 * (0.5 + r()) + (r() - 0.5) * 1.2;
          dx += (r() - 0.5) * 1.2;
          const p = c(dx, dy);
          es.push({ t, k: 2, fn: () => g.move(k + 1, p, 0) });
        }
        es.push({ t: t1, k: 0, fn: () => g.up(k + 1, 0) });
      });
      es.sort((a, b) => a.t - b.t || a.k - b.k);
      let done = false;
      for (const e of es) {
        while (!done && clock.t + 1 / 240 < e.t) (clock.t += 1 / 240), (done = g.step());
        if (done) break;
        clock.t = Math.max(clock.t, e.t);
        e.fn();
      }
      while (!done && clock.t < 900) (clock.t += 1 / 240), (done = g.step());
      return { appo, right: g.results().right, of: g.results().of };
    });
  for (let s = 1; s <= 5; s++) {
    const on = run(true, s);
    assert.equal(on.appo, 3, `seed ${s}`);
    assert.equal(on.right, on.of);
    assert.deepEqual(run(false, s), on);
  }
});
