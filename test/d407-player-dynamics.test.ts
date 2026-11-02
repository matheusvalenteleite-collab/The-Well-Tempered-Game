/**
 * D407 (WTC 1.99): the player's line compressed under mf. Busoni's p, pp and the like reach the band in full; the
 * player's line takes 40% of a drop under mf (a soft knee into −3 dB), loud levels as printed, and D404's safety net
 * folded in: never more than 4 dB under the loudest sounding band voice for more than 2 bars. D487: never under it
 * (LINE_GAP_DB 0, LINE_GAP_BARS 0: the player's line at least the loudest sounding band voice's printed level, at once).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { readingsOf, type WholeReading } from "../src/touch/readings.ts";
import { buildWhole, LEVEL_DB, LINE_GAP_BARS, LINE_GAP_DB, PLAYER_FLOOR_DB, playerDb, wholePlan, type WholePlan } from "../src/touch/whole-reading.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { setPreset } from "../src/touch/sound.ts";
import type { Chip } from "../src/touch/chip.ts";

const IDS = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const of = (id: string): { f: TouchFugue; p: WholePlan } => {
  const f = fugueById(id)!;
  return { f, p: wholePlan(f, readingsOf(id).find((x) => x.whole))! };
};
const sounds = (f: TouchFugue, u: number, t: number) => f.voices[u].some((n) => n[0] <= t && n[0] + n[1] > t);

test("D407: playerDb: mf and louder as printed; under mf 40% of the drop, eased into −3 dB, monotone", () => {
  for (const d of [0, 1.5, 3.5, 6.5, 9]) assert.equal(playerDb(d), d);
  const p = playerDb(LEVEL_DB.p);
  assert.ok(p > -2.4 && p < -1.9, `p → ${p}`);
  const pp = playerDb(LEVEL_DB.pp);
  assert.ok(pp > -3 && pp < p, `pp → ${pp}`);
  assert.ok(playerDb(-40) >= PLAYER_FLOOR_DB);
  // The slope at mf is the share (a small dip stays 40% of itself), and a ramp keeps its order (its shape, scaled).
  assert.ok(Math.abs(playerDb(-0.1) / -0.1 - 0.4) < 0.01);
  for (let d = -20; d < 0; d += 0.5) assert.ok(playerDb(d) < playerDb(d + 0.5));
});

test("D407: the band keeps Busoni's full range; the player's line takes the compressed level (I/2's p opening)", () => {
  const { f, p } = of("wtc1f02");
  const t = 2 * f.barTicks + 1;
  assert.ok(p.dynAt(1, t) < -4.5, `the band's alto: p as printed (its hairpin), ${p.dynAt(1, t)}`);
  assert.ok(Math.abs(p.lineDynAt(1, t) - playerDb(p.dynAt(1, t))) < 1e-9, "the player's alto: the same level compressed");
  assert.ok(p.lineDynAt(1, t) > -2.5);
});

test("D407: the scan of all 48 with a player in each voice: never under −3 dB, never under the loudest band voice (D487)", () => {
  for (const id of IDS) {
    const { f, p } = of(id);
    for (let v = 0; v < f.voices.length; v++) {
      let run = 0;
      for (let t = 1; t < f.length; t += f.tpq) {
        if (!sounds(f, v, t)) continue;
        const L = p.lineDynAt(v, t);
        assert.ok(L >= PLAYER_FLOOR_DB - 1e-9, `${id} voice ${v} at ${t}: ${L.toFixed(2)} dB`);
        assert.ok(L >= p.dynAt(v, t) - 1e-9, "the line never under the band's own level");
        const others = f.voices.map((_, u) => u).filter((u) => u !== v && sounds(f, u, t));
        if (!others.length) continue;
        const gap = Math.max(...others.map((u) => p.dynAt(u, t))) - L;
        run = gap > LINE_GAP_DB + 0.01 ? run + f.tpq : 0;
        assert.ok(run <= LINE_GAP_BARS * f.barTicks, `${id} voice ${v}: ${(run / f.barTicks).toFixed(1)} bars more than ${LINE_GAP_DB} dB under`);
      }
    }
  }
});

test("D407/D487: the safety net lifts the line under a printed f too (D404's exemption gone), to the loudest voice's level", () => {
  const f = fugueById("wtc1f02")!;
  const base = readingsOf("wtc1f02").find((x) => x.whole)!.whole!;
  const make = (loud: string): WholeReading => ({ ...base, dyn: [{ on: 0, voices: [0], mark: "p" }, { on: 0, voices: [1, 2], mark: loud }], hairpins: [], text: [] });
  const t = (bar: number) => (bar - 1) * f.barTicks + f.tpq + 1;
  const both = Array.from({ length: 16 }, (_, i) => i + 1).filter((b) => sounds(f, 0, t(b)) && sounds(f, 1, t(b)));
  const late = both.filter((b) => b >= both[0] + LINE_GAP_BARS);
  assert.ok(late.length > 0);
  // Under mf (D487): the compressed p (−2.1) lifted to the band's mf (0 dB) where both sound.
  const mf = buildWhole(f, make("mf"));
  for (const b of both) assert.ok(Math.abs(mf.lineDynAt(0, t(b)) - Math.max(playerDb(LEVEL_DB.p), LEVEL_DB.mf ?? 0)) < 1e-6, `mf, bar ${b}`);
  // Under ff (+6.5): the band keeps its p, the player's line is brought to the ff (D487: at once).
  const ff = buildWhole(f, make("ff"));
  assert.equal(ff.dynAt(0, t(12)), LEVEL_DB.p);
  assert.ok(Math.abs(ff.lineDynAt(0, t(late[late.length - 1])) - (LEVEL_DB.ff - LINE_GAP_DB)) < 1e-6);
});

const fakeChip = (clock: { t: number }) =>
  ({ ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: () => ({ stop() {}, setLevel() {}, bend() {}, rel: 0 }), click() {}, sweep() {}, setPan() {}, wake() {} }) as unknown as Chip;

test("D407: on the piano the player's note takes the compressed line (ProtoGame.lineAt → Play.lineDb)", () => {
  setPreset("pianoSampled");
  const f = fugueById("wtc2f21")!;
  const r = readingsOf("wtc2f21").find((x) => x.whole)!;
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 60, legato: false, solo: true, easy: "direction", fail: false, reading: r, until: 90 * f.barTicks }, { ...fakeChip({ t: 0 }) } as Chip);
  const notes = g.tracks[0].notes;
  const p = wholePlan(f, r)!;
  // II/21's long pp/p stretch (b. 9–90: the band down to −11 dB): the player's base never under −3 dB.
  const soft = notes.filter((n) => p.dynAt(0, n.on) <= LEVEL_DB.p);
  assert.ok(soft.length > 50);
  for (const n of soft) assert.ok(p.lineDynAt(0, n.on) >= PLAYER_FLOOR_DB);
  const i = notes.indexOf(soft[Math.floor(soft.length / 2)]);
  assert.ok(g.lineAt(0, i).lineDb! > p.dynAt(0, notes[i].on) + 3, "the line well over the band's level there");
});
