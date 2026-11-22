/**
 * D941 (design studio): the owner's first BASICS playtest. Every later take a version (never the same notes twice running,
 * the stage's idea kept); no count-in; the take over at its last note; the beat a stage has; the stage's line in play.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { ACTS, beatFor, type Stage } from "../src/bench/basics/plan.ts";
import { basicsRun, versionAt } from "../src/bench/basics/runner.ts";
import { fakeChip, ROWS } from "./d342-sim.ts";

const stage = (id: string): Stage => ACTS.flatMap((a) => a.stages).find((s) => s.id === id)!;
const line = (piece: string) => fugueById(piece).voices[0];
const pairsOf = (piece: string) => {
  const ns = line(piece);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ns.length; i++) if (ns[i + 1][0] === ns[i][0] + ns[i][1]) (out.push([ns[i][2], ns[i + 1][2]]), i++);
  return out;
};

test("a later take is another version of the stage's own line: different notes, the idea kept (k 1-20)", () => {
  for (const act of ACTS.slice(0, 4))
    for (const st of act.stages) {
      let prev = JSON.stringify(line(versionAt(st, 0).piece));
      for (let k = 1; k <= 20; k++) {
        const v = versionAt(st, k);
        assert.notEqual(v.piece, st.piece, `${st.id} ${k}`);
        const now = JSON.stringify(line(v.piece));
        assert.notEqual(now, prev, `${st.id} ${k}: the same notes twice running`);
        prev = now;
        const ns = line(v.piece);
        assert.ok(ns.length >= 5, `${st.id} ${k}: ${ns.length} notes`);
        for (const [, dur, midi] of ns) assert.ok(dur >= 480 && midi >= 60 && midi <= 76, `${st.id} ${k}`);
        const ps = pairsOf(v.piece);
        const ways = ps.map(([a, b]) => Math.sign(b - a));
        if (st.id === "2.1") assert.deepEqual(ways, [1, 1, 1, 1]);
        if (st.id === "2.2") assert.deepEqual(ways, [-1, -1, -1, -1]);
        if (st.id === "2.3") assert.deepEqual(ways, [0, 0, 0, 0]);
        if (st.id === "2.4") assert.deepEqual([1, -1, 0].map((w) => ways.filter((x) => x === w).length), [3, 3, 2]);
        if (st.id === "1.1" || st.id === "1.2") assert.equal(new Set(ns.map((x) => x[2])).size, 1);
        if (st.id === "4.2") assert.ok(ns.every((x, i) => i === 0 || x[0] > ns[i - 1][0] + ns[i - 1][1]), "a rest after each note");
        if (st.id === "4.1") assert.ok(ns.every((x) => x[1] >= 960), "long notes");
      }
      // Deterministic: the same take, the same version.
      assert.equal(JSON.stringify(line(versionAt(st, 3).piece)), JSON.stringify(line(versionAt(st, 3).piece)));
    }
});

test("Bach's music is never altered: a later take the subject's next entry (5.2 answered four bars on), 6.4 another trill", async () => {
  await loadExtras();
  assert.deepEqual(versionAt(stage("5.1"), 0), { piece: "bwv1080-01", voice: 1, fromBar: 1, toBar: 4 });
  assert.deepEqual(versionAt(stage("5.1"), 1), { piece: "bwv1080-01", voice: 0, fromBar: 5, toBar: 8 });
  assert.deepEqual(versionAt(stage("5.1"), 2), { piece: "bwv1080-01", voice: 3, fromBar: 9, toBar: 12 });
  assert.deepEqual(versionAt(stage("5.2"), 1), { piece: "bwv1080-01", voice: 0, fromBar: 5, toBar: 12, cueBar: 9 });
  for (let k = 0; k < 6; k++) {
    const v = versionAt(stage("6.1"), k);
    assert.equal(v.toBar! - v.fromBar!, 3);
  }
  const t1 = versionAt(stage("6.4"), 1);
  assert.equal(t1.piece, "bwv1080-04");
  assert.ok(t1.fromBar! > 60, `${t1.fromBar}`);
  for (let k = 1; k < 4; k++) assert.ok(versionAt(stage("6.4"), k).fromBar! > 0);
});

test("no count-in (PROVE waits at its first note too); the take ends at its last note; the beat each stage has", () => {
  for (const act of ACTS)
    for (const st of act.stages)
      for (const phase of ["do", "prove"] as const) {
        const r = basicsRun(st, phase, 0);
        assert.equal(r.tut?.countBeats, undefined, st.id);
        assert.equal(r.tut?.endAtLast, true, st.id);
        if (st.wait === "first") assert.equal(r.tut?.waitFirst, true, `${st.id} ${phase}`);
      }
  assert.deepEqual(["1.1", "1.2", "2.4", "3.1", "4.2", "5.1", "5.2", "6.6"].map((id) => beatFor(stage(id))), [null, { kind: "click", gain: 0.07 }, { kind: "click", gain: 0.07 }, { kind: "drums", style: "rock" }, { kind: "drums", style: "rock" }, { kind: "click", gain: 0.05 }, null, { kind: "drums", style: "home" }]);
  assert.ok(basicsRun(stage("1.2"), "do", 0).click);
  assert.deepEqual(beatFor(stage("6.7")), { kind: "drums", style: "liebezeit" });
  assert.equal(basicsRun(stage("3.1"), "do", 0).tut?.band, true);
});

test("the take is over the moment the last note is judged (no tail), and no click while the first note is waited for", () => {
  const st = stage("1.2");
  const r = basicsRun(st, "do", 0);
  const clock = { t: 0 };
  const ticks: number[] = [];
  const chip = Object.assign(fakeChip(clock), { tick: (at: number) => ticks.push(at) });
  const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById("ladder"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: false, ...(r.click ? { click: r.click } : {}), ...(r.tut ?? {}) }, chip);
  g.rows = ROWS;
  g.wall = () => 0;
  const ns = g.tracks[0].notes;
  let k = 0;
  let down: { id: number; up: number } | null = null;
  let done = false;
  for (let i = 0; i < 2 * 240; i++) (clock.t += 1 / 240), g.step();
  assert.equal(ticks.length, 0, "silent while it waits");
  while (!done && clock.t < 60) {
    clock.t += 1 / 240;
    done = g.step();
    if (down && clock.t >= down.up) (g.up(down.id, 0), (down = null));
    const n = ns[k];
    if (!n || down || (k > 0 && clock.t < g.timeAt(n.on))) continue;
    k++;
    g.down(k, { side: "right", x: 680, y: ROWS.yOf(n.step), w: 800, h: 1000 }, 0);
    down = { id: k, up: clock.t + 0.2 };
  }
  assert.ok(done);
  const last = ns.at(-1)!;
  assert.ok(g.now < last.on + last.dur, `ended at ${g.now}, the last note from ${last.on}`);
  assert.ok(ticks.length >= 3, `${ticks.length} clicks`);
});

test("the stage's line kept on in play, plain (no box), in a strip kept clear at the foot", () => {
  const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  assert.match(app, /const boxFloor = bStage \? BASICS_STRIP/);
  assert.match(app, /paintInstruction\(ctx, w, h, tr\(bs\.st\.hint\)/);
  const aids = readFileSync(new URL("../src/bench/basics/aids2.ts", import.meta.url), "utf8");
  const fn = aids.slice(aids.indexOf("export function paintInstruction"));
  assert.doesNotMatch(fn, /fillRect/);
});

test("one clip a stage that shows one, its own file (the HOW TO page keeps D690's thirteen)", async () => {
  const { existsSync } = await import("node:fs");
  const host = readFileSync(new URL("../src/bench/basics/BasicsHost.tsx", import.meta.url), "utf8");
  for (const st of ACTS.flatMap((a) => a.stages).filter((s) => s.clip)) {
    assert.match(host, new RegExp(`"${st.id.replace(".", "\\.")}": new URL\\("\\./clips/${st.id.replace(".", "-")}\\.mp4"`), st.id);
    assert.ok(existsSync(new URL(`../src/bench/basics/clips/${st.id.replace(".", "-")}.mp4`, import.meta.url)), st.id);
  }
  for (const c of ["tap", "up", "two", "hold", "shake"]) assert.ok(existsSync(new URL(`../src/bench/basics/clips/${c}.mp4`, import.meta.url)), c);
});
