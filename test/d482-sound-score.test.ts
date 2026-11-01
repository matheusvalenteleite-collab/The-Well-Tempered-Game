/**
 * D482 (WTC 2.08): THE SOUND TAKES NO INPUT FROM THE SCORE. The standing rule (loudness is never tied to
 * right or wrong) made whole: no sound parameter depends on the streak, the combo, the multiplier, the
 * accuracy, the crowd, the hits or a bonus zone (ORGANO PLENO, CON FUOCO). CON FUOCO stays a word and
 * embers on the screen; its drive (D249) is gone, as are ORGANO PLENO's brighter room and crowned organ
 * (D186, D349), D186's drum layers that grew with the run, and the HIGHWAY's chime on the planned lane (D239).
 *
 * The proof: the same touches played twice through a recording sound engine, the second game's score
 * state thrown about before every frame and every touch (a streak of 999, the multiplier at 4, the
 * crowd full or empty, ORGANO PLENO on, the hits and the combo huge); every call the game makes to the
 * sound engine, with every argument, is the same.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Chip, Sounding } from "../src/touch/chip.ts";
import { withMech, asRecorded } from "../src/bench/mechanics.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { rowsOf } from "../src/bench/lab/replay.ts";
import { UNIT_S, type LabLog, type LabPassage } from "../src/bench/lab/log.ts";
import { FUOCO_NOTES, type ProtoGame } from "../src/bench/proto-game.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };

/** Every call into the sound engine (method and arguments) and every Sounding's own calls, in order. */
function recordingChip(clock: { t: number }, log: string[]): Chip {
  const enc = (a: unknown) => JSON.stringify(a, (_k, v) => (typeof v === "function" ? "fn" : typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v));
  const sounding = (tag: string): Sounding =>
    new Proxy({} as Sounding, {
      get: (_t, p) => (...args: unknown[]) => void log.push(`${tag}.${String(p)}(${enc(args)})`),
    });
  let n = 0;
  const base: Record<string, unknown> = {
    ctx: { get currentTime() { return clock.t; } },
    lag: 0,
    visual: 0,
    smooth: false,
  };
  return new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p as string];
      if (p === "then") return undefined;
      // Any method, known or not (an optional `chip.zone?.(…)` included): logged with its arguments.
      return (...args: unknown[]) => {
        if (p === "heard") return clock.t;
        const tag = `s${n++}`;
        log.push(`${String(p)}(${enc(args)}) -> ${tag}`);
        return sounding(tag);
      };
    },
    set(t, p, v) {
      log.push(`set ${String(p)} = ${enc(v)}`);
      t[p as string] = v;
      return true;
    },
  }) as unknown as Chip;
}

/** The score state thrown about: everything a player earns or loses, nothing the player does. */
function scramble(g: ProtoGame, k: number) {
  const s = g as unknown as Record<string, number>;
  s.streak = k % 2 ? 999 : FUOCO_NOTES + k;
  s.maxStreak = 999;
  s.combo = 500 + k;
  s.mult = 4;
  s.hits = 10_000 + k;
  s.score = 1e6 * k;
  s.crowd = k % 3 === 0 ? 0 : 1;
  s.plenoUntil = k % 2 ? Infinity : -1;
  s.chain = 50;
}

function play(log: LabLog, mess: boolean): string[] {
  return withMech(asRecorded(log.mech), () => {
    const calls: string[] = [];
    const clock = { t: 0 };
    const g = labGame(log.passage, recordingChip(clock, calls));
    g.wall = () => 0;
    const base = g.timeAt(g.start);
    let area = { ...log.area };
    if (log.rows) g.rows = rowsOf(log.rows.y0, log.rows.rowH);
    let u = 0;
    let k = 0;
    let done = false;
    const before = () => mess && scramble(g, k++);
    for (const e of log.ev) {
      if (done) break;
      if (typeof e === "number") {
        u += e;
        clock.t = base + u * UNIT_S;
        before();
        done = g.step();
        continue;
      }
      u += e[1];
      clock.t = base + u * UNIT_S;
      before();
      if (e[0] === "d") g.down(e[2], { side: e[5] === "l" ? "left" : "right", x: e[3], y: e[4], w: area.w, h: area.h }, 0);
      else if (e[0] === "m") g.move(e[2], { side: "left", x: e[3], y: e[4], w: area.w, h: area.h }, 0);
      else if (e[0] === "u") g.up(e[2], 0);
      else if (e[0] === "c") g.up(e[2], 0, true);
      else if (e[0] === "r") g.rows = rowsOf(e[2], e[3]);
      else if (e[0] === "a") area = { w: e[2], h: e[3] };
    }
    for (let n = 0; !done && n < 60 * 120; n++) {
      clock.t += 1 / 60;
      before();
      done = g.step();
    }
    g.stopAll();
    return calls;
  });
}

test("D482: the same touches sound the same whatever the score state (streak, combo, multiplier, crowd, hits, ORGANO PLENO, CON FUOCO)", () => {
  for (const [seed, gap] of [[3, 0.03], [7, 0.09]] as const) {
    const log = synthRun(II18, { gap, jitter: 0.05, seed });
    const plain = play(log, false);
    const messed = play(log, true);
    assert.ok(plain.filter((c) => c.startsWith("note(")).length > 20, "notes sounded");
    assert.equal(messed.length, plain.length, "as many calls");
    for (let i = 0; i < plain.length; i++) assert.equal(messed[i], plain[i], `call ${i}`);
  }
});

test("D482: the sound engine has no zone, no drive, no chime and no run-grown drums; the game names no score state in a call to it", () => {
  const chip = readFileSync(new URL("../src/touch/chip.ts", import.meta.url), "utf8");
  assert.ok(!/\bzone\s*\(/.test(chip), "no chip.zone");
  assert.ok(!/\bzoneNow\b|\bwireDrive\b|\bdriveOn\b/.test(chip), "no CON FUOCO drive");
  assert.ok(!/\bchime\s*\(/.test(chip), "no lane chime");
  assert.ok(!/\b(streak|combo|accuracy|crowd)\b/i.test(chip.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")), "the engine's code reads no score word");
  const sound = readFileSync(new URL("../src/touch/sound.ts", import.meta.url), "utf8");
  assert.ok(!/export function layerHits/.test(sound), "no drums grown by the run");
  // Every call the game makes into the engine, its arguments free of the score's state.
  const game = readFileSync(new URL("../src/bench/proto-game.ts", import.meta.url), "utf8");
  const calls = game.match(/this\.chip\.[a-zA-Z]+\??\.?\([^;]*\)/g) ?? [];
  assert.ok(calls.length > 3);
  for (const c of calls) assert.ok(!/\b(streak|combo|mult|crowd|hits|score|pleno|zone|accuracy|perfects|chain)\b/.test(c), c);
});
