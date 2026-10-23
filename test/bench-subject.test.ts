/** D214, SUBJECT: the player follows the subject through all of its entries, whichever voice. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { voicing, type Chip, type Voicing } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById, type EasyLevel } from "../src/bench/protos.ts";
import { TESTBENCH } from "../src/bench/cards.ts";
import { entryLabel, subjectLine } from "../src/bench/subject-line.ts";
import { startTick } from "../src/touch/voice-mode.ts";

const [W, H] = [400, 800];

function fakeChip(clock: { t: number }, log: { midi: number; at: number; v: Voicing; lead: boolean }[] = []) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, at: number, _len: number, v: Voicing, p?: { lead?: boolean }) => {
      log.push({ midi, at, v, lead: !!p?.lead });
      return { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} };
    },
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

/** The stretto rule, stated anew: a note of an entry is the player's when that entry is the newest begun by then (a tie: the first subject, then the upper voice). */
function expected(f: TouchFugue, from: number): string[] {
  const es = f.entries.filter((e) => e.on >= from);
  const owner = (t: number) =>
    es
      .filter((e) => e.on <= t)
      .reduce<(typeof es)[number] | null>((best, e) => (!best || e.on > best.on || (e.on === best.on && ((e.theme ?? 1) < (best.theme ?? 1) || ((e.theme ?? 1) === (best.theme ?? 1) && e.voice < best.voice))) ? e : best), null);
  const out: string[] = [];
  for (const e of es) for (const [on, , midi] of e.notes) if (owner(on) === e) out.push(`${e.voice}:${on}:${midi}`);
  return out.sort();
}

const game = (f: TouchFugue, from: number, easy: EasyLevel = "timing", log?: { midi: number; at: number; v: Voicing; lead: boolean }[]) => {
  const clock = { t: 0 };
  const g = new ProtoGame(f, 0, from, protoById("subject"), { bpm: 60, legato: false, easy }, fakeChip(clock, log));
  return { g, clock };
};

test("D214: the testbench's eight fugues include the hard cases", () => {
  assert.equal(TESTBENCH.length, 8);
  for (const id of ["wtc1f04", "wtc1f10", "bwv1080-14"]) assert.ok(TESTBENCH.includes(id));
  assert.equal(protoById("subject").platform, "mobile");
  assert.equal(protoById("subject").layout, "full");
});

test("D214, SUBJECT: the player's notes are exactly the subject's under the stretto rule (newest entry wins), and none is also in the accompaniment", () => {
  for (const id of TESTBENCH) {
    const f = fugueById(id);
    for (const share of [0, 0.5]) {
      const from = startTick(f, share);
      const { g } = game(f, from);
      const mine = g.notes.map((n) => `${n.voice}:${n.on}:${n.midi}`);
      assert.deepEqual([...mine].sort(), expected(f, from), `${id} from ${share}`);
      assert.equal(new Set(mine).size, mine.length, `${id}: no note twice`);
      const others = new Set(g.others.map((n) => `${n.voice}:${n.on}:${n.midi}`));
      assert.ok(mine.every((k) => !others.has(k)), `${id}: the player's notes are not scheduled in the accompaniment`);
      // Nothing lost: the player's notes and the accompaniment make the whole fugue from there.
      const all = f.voices.reduce((a, v) => a + v.filter(([on]) => on >= from).length, 0);
      assert.equal(mine.length + g.others.length, all, `${id}: every note sounds once`);
      // The line in time; the entries take turns (a chord only within one entry's voice).
      assert.ok(g.notes.every((n, i) => i === 0 || g.notes[i - 1].on < n.on || (g.notes[i - 1].on === n.on && g.notes[i - 1].voice === n.voice)), `${id}: the entries take turns`);
    }
  }
});

test("D214: every entry's first note is free and struck (never riding); entries are named", () => {
  for (const id of TESTBENCH) {
    const f = fugueById(id);
    const { g } = game(f, 0, "direction");
    assert.ok(g.entries.length > 0);
    for (const e of g.entries) {
      const i = g.notes.findIndex((n) => n.on === e.on);
      assert.ok(i >= 0, `${id}: entry at ${e.on} has its head`);
      assert.equal(g.notes[i].voice, e.voice);
      assert.ok(g.isFree(i), `${id}: head at ${e.on} free`);
      assert.ok(!g.notes[i].ride, `${id}: head at ${e.on} struck`);
    }
  }
  const xiv = fugueById("bwv1080-14");
  const labels = xiv.entries.map((_, i) => entryLabel(xiv, i));
  assert.ok(labels.some((l) => l.startsWith("SUBJECT 2 · ")) && labels.some((l) => l.startsWith("SUBJECT 3 · ")), labels.join(" / "));
  assert.ok(labels.some((l) => l.endsWith("INVERTED")));
  const i8 = fugueById("wtc1f08");
  assert.ok(i8.entries.some((_, i) => entryLabel(i8, i).includes("AUGMENTED")));
  assert.match(entryLabel(fugueById("wtc1f02"), 0), /^SUBJECT · [A-Z]+$/);
});

test("D214: a perfect run through each testbench fugue is all hits, every entry captured (TIMING and EXACT LANES); each note sounds in its own voice", () => {
  for (const id of TESTBENCH) {
    const f = fugueById(id);
    for (const easy of ["timing", "exact"] as const) {
      const log: { midi: number; at: number; v: Voicing; lead: boolean }[] = [];
      const { g, clock } = game(f, 0, easy, log);
      const runTo = (t: number) => {
        while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
        clock.t = Math.max(clock.t, t);
        g.step();
      };
      let id2 = 0;
      g.notes.forEach((n, i) => {
        if (n.ride || (i > 0 && g.notes[i - 1].on === n.on)) return;
        runTo(g.timeAt(n.on));
        const x = ((g.lanes[i] + 0.5) / g.laneCount) * W;
        const before = log.length;
        g.down(++id2, { side: x < W / 2 ? "left" : "right", x, y: H - 150, w: W, h: H }, performance.now());
        g.up(id2, performance.now());
        const struck = log.slice(before).find((e) => e.lead && e.midi === n.midi);
        assert.ok(struck, `${id}: note ${i} sounded`);
        assert.deepEqual(struck.v, voicing(n.voice!, f.voices.length, true), `${id}: note ${i} in its voice ${n.voice}`);
      });
      runTo(g.timeAt(g.end + 1));
      const r = g.results();
      assert.equal(r.right, r.of, `${id} ${easy}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed}, stray ${r.stray})`);
      assert.equal(r.captured, r.entries, `${id} ${easy}: ${r.captured}/${r.entries} entries`);
      assert.ok(r.grade === "S", `${id} ${easy}: grade ${r.grade}`);
    }
  }
});

test("D214: the lanes: five, the contour kept within an entry (EXACT LANES' lane answers DIRECTION too)", () => {
  for (const id of TESTBENCH) {
    const { g } = game(fugueById(id), 0, "direction");
    assert.equal(g.laneCount, 5);
    assert.ok(g.lanes.every((l) => l >= 0 && l < 5));
  }
});

test("D214: the entry now and the next (for the banner and the count-in)", () => {
  const f = fugueById("bwv1080-14");
  const { g } = game(f, 0);
  const line = subjectLine(f, 0);
  const [a, b] = line.entries;
  g.now = a.on - 1;
  assert.equal(g.entryNow().current, null);
  assert.equal(g.entryNow().next?.on, a.on);
  g.now = a.on;
  assert.equal(g.entryNow().current?.on, a.on);
  assert.equal(g.entryNow().next?.on, b.on);
});
