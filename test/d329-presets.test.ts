/**
 * D329 (WTC 1.46), THE LAB: RELATIVE timing units, the double contact the same thumb's only, the
 * waiting note's own takeover window, WAITING NOTE SOUNDS (at its time / when the other thumb lifts),
 * and the CONFIG presets. The game's defaults unchanged; a player resting the next thumb on its note as
 * the other strikes (the owner's II/18 log) missed in A and B, right in C, D and E.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MECH, MECH_DEFAULTS, MECH_SPEC, REL_KEYS, ownFreshSeconds, relMs, withMech, type Mech } from "../src/bench/mechanics.ts";
import { legatoGapMs } from "../src/bench/articulation.ts";
import { CONFIGS, DEFAULT_CONFIG, configById, configEdits, configLabel, configMech } from "../src/bench/lab/presets.ts";
import { presetRow } from "../src/bench/lab/preset-table.ts";
import { replay } from "../src/bench/lab/replay.ts";
import { parseLog, logText, type LabPassage } from "../src/bench/lab/log.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const II12: LabPassage = { piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, bpm: 79, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };

test("D329: the game's defaults unchanged (ABSOLUTE, any thumb's double, takeover = the double contact's, AT ITS TIME)", () => {
  assert.equal(MECH_DEFAULTS.timing, "absolute");
  assert.equal(MECH_DEFAULTS.doubleSameThumb, false);
  assert.equal(MECH_DEFAULTS.waitTakeMs, MECH_DEFAULTS.doubleMs);
  assert.equal(MECH_DEFAULTS.waitSounds, "time");
  assert.deepEqual(MECH, MECH_DEFAULTS);
  for (const k of ["timing", "refIoiMs", "kneeIoiMs", "relFloorMs", "ownFreshBeats", "ownFreshMinS", "doubleSameThumb", "waitTakeMs", "waitSounds"]) assert.ok(MECH_SPEC.some((s) => s.key === k), k);
  // ABSOLUTE: every window as set, whatever the time between notes.
  for (const ioi of [100, 250, 360, 1000]) assert.equal(relMs(70, ioi), 70);
  assert.equal(ownFreshSeconds(0.4), 3);
  assert.equal(legatoGapMs(100), 90);
});

test("D329: RELATIVE: as set at the reference (361 ms), Weber-like above the knee, constant below, capped at 2×, floored", () => {
  withMech({ timing: "relative" }, () => {
    assert.equal(relMs(70, 360), 70);
    assert.ok(Math.abs(relMs(70, 361) - 70) < 0.3);
    assert.equal(relMs(70, 720), 140);
    assert.equal(relMs(70, 5000), 140, "at most twice the reference");
    assert.ok(Math.abs(relMs(70, 250) - 48.6) < 0.1);
    assert.equal(relMs(70, 120), relMs(70, 250), "constant below the knee");
    assert.equal(relMs(40, 100), 30, "never under the floor (40 × 250/360 = 27.8)");
    assert.equal(relMs(20, 100), 20, "a value set under the floor is kept");
    // The last touch: beats, at least the floor (II/18's beat 1.084 s: 3.25 s, about the game's 3 s).
    assert.ok(Math.abs(ownFreshSeconds(1.084) - 3.252) < 1e-9);
    assert.equal(ownFreshSeconds(0.395), 1.5);
    // The legato gap scales with the note (the share still the larger for long notes).
    assert.ok(Math.abs(legatoGapMs(200) - 70) < 1e-9, String(legatoGapMs(200)));
    assert.equal(legatoGapMs(1000), 350);
  });
  for (const k of REL_KEYS) assert.ok(MECH_SPEC.find((s) => s.key === k)?.help.includes("RELATIVE"), k);
});

test("D329: RELATIVE at the reference tempo judges a careful run as ABSOLUTE does (II/18's quavers, 361 ms)", () => {
  const log = synthRun(II18, { gap: 0.03, jitter: 0.05, seed: 3 });
  const a = presetRow(log, { ...MECH_DEFAULTS });
  const r = presetRow(log, { ...MECH_DEFAULTS, timing: "relative" } as Mech);
  assert.equal(r.right, a.right);
  assert.equal(r.missed, a.missed);
  assert.ok(Math.abs(r.perfect - a.perfect) <= 2, `${r.perfect} vs ${a.perfect}`);
  // A fast fugue (II/12's semiquavers, 190 ms): PERFECT narrower (49 ms, not 70).
  const fast = synthRun(II12, { gap: 0.03, jitter: 0.06, seed: 5 });
  const fa = presetRow(fast, { ...MECH_DEFAULTS });
  const fr = presetRow(fast, { ...MECH_DEFAULTS, timing: "relative" } as Mech);
  assert.ok(fr.perfect < fa.perfect, `${fr.perfect} < ${fa.perfect}`);
});

test("D329: the double contact the same thumb's only; the other thumb's contact judged for itself", () => {
  // The other thumb landing 5 ms after each other strike (no waiting: slurNext off): any thumb's double
  // swallows it; the same thumb's only, it is a stray (B · CLEAN STRIKES).
  const log = synthRun(II18, { gap: 0.09, preplaceEvery: 2, seed: 11 });
  const b = configMech(configById("B")!);
  const any = presetRow(log, { ...b, doubleSameThumb: false });
  const same = presetRow(log, b);
  assert.ok(any.doubles >= 5 && any.stray === 0, JSON.stringify(any));
  assert.equal(same.doubles, 0);
  assert.equal(same.stray, any.doubles);
});

test("D329: a thumb resting on its next note as the other strikes: missed by A and B, right by C, D and E", () => {
  const log = parseLog(logText(synthRun(II18, { gap: 0.09, preplaceEvery: 2, seed: 11 })));
  const rows = Object.fromEntries(CONFIGS.map((c) => [c.id, presetRow(log, configMech(c))]));
  const notes = rows.A.right + rows.A.wrong + rows.A.missed;
  assert.ok(rows.A.missed >= notes / 3, JSON.stringify(rows.A));
  assert.ok(rows.B.missed >= notes / 3 && rows.B.stray > 0, JSON.stringify(rows.B));
  for (const id of ["C", "D", "E"]) {
    assert.ok(rows[id].missed <= 1, `${id} ${JSON.stringify(rows[id])}`);
    assert.ok(rows[id].waits >= notes / 3, `${id} waits ${rows[id].waits}`);
  }
  // D: the release sounds it, judged then (the holder lifts 90 ms early): earlier than C on those notes.
  const off = (id: string) => {
    const ev = replay(log, configMech(configById(id)!)).events;
    const waited = new Set(ev.filter((e) => e.kind === "wait").map((e) => (e as { i: number }).i));
    const xs = ev.filter((e) => e.kind === "note" && waited.has(e.i)).map((e) => (e as { offMs: number }).offMs);
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  assert.ok(off("D") < off("C") - 10, `D ${off("D")} vs C ${off("C")}`);
});

test("D329: the presets: A is the game, each differs, the log's label marks an edit", () => {
  assert.equal(DEFAULT_CONFIG, "A");
  assert.deepEqual(configMech(configById("A")!), MECH_DEFAULTS);
  assert.deepEqual(CONFIGS.map((c) => c.name), ["A · GAME NOW", "B · CLEAN STRIKES", "C · HAND-OVER", "D · LIFT TO SOUND", "E · GENEROUS"]);
  const sets = CONFIGS.map((c) => JSON.stringify(configMech(c)));
  assert.equal(new Set(sets).size, CONFIGS.length);
  for (const c of CONFIGS) {
    assert.ok(c.feel.length > 20 && c.feel.endsWith("."), c.id);
    for (const k of Object.keys(c.values)) assert.ok(k in MECH_DEFAULTS, `${c.id}: ${k}`);
  }
  const c = configById("C")!;
  assert.equal(configById("D")!.values.waitSounds, "lift");
  assert.equal(c.values.timing, "relative");
  assert.equal(configById("B")!.values.slurNext, false);
  withMech(c.values, () => {
    assert.deepEqual(configEdits(c), []);
    assert.equal(configLabel("C"), "C · HAND-OVER");
    MECH.legatoGapMs = 120;
    assert.deepEqual(configEdits(c), ["legatoGapMs"]);
    assert.match(configLabel("C") ?? "", /^C · HAND-OVER \(changed: legatoGapMs\)$/);
  });
  assert.equal(configLabel("nope"), undefined);
});

test("D329: an old log replays as it was played (its takeover window the double contact's)", () => {
  const log = synthRun(II18, { gap: 0.09, preplaceEvery: 2, seed: 11 });
  const old = { ...log, mech: { ...log.mech, doubleMs: 10 } as Partial<Mech> as Mech };
  delete (old.mech as Partial<Mech>).waitTakeMs;
  const r = replay(old);
  assert.equal(r.mech.waitTakeMs, 10);
});
