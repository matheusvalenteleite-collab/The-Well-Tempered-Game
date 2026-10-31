/** D272: the readings (the books' words on each Book I fugue): their data, HEAR THE SUBJECT's performance, the lock, the scoring. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { chooseReading, chosenReading, LEVEL_D, NO_READING, performSubject, READINGS, readingsOf, type Reading } from "../src/touch/readings.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

const firstEntry = (id: string) => [...fugueById(id).entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];

test("D272: every reading belongs to a Book I fugue, at most three a fugue (D385: and one whole-piece edition), one mark per note of its first entry, levels and tempi sane", () => {
  const ids = Object.keys(READINGS);
  assert.ok(ids.length >= 10, `${ids.length} fugues with a reading`);
  for (const id of ids) {
    assert.match(id, /^wtc[12]f\d\d$/);
    const rs = readingsOf(id);
    const books = rs.filter((r) => !r.whole);
    assert.ok(rs.length >= 1 && books.length <= 3 && rs.length - books.length <= 1, id);
    assert.equal(new Set(rs.map((r) => r.id)).size, rs.length, `${id}: one reading an author`);
    for (const r of rs) {
      assert.equal(r.notes.length, firstEntry(id).notes.length, `${id}/${r.id}: a mark per note`);
      if (r.tempo !== null) assert.ok(r.tempo >= 30 && r.tempo <= 200, `${id}/${r.id}: ♩ = ${r.tempo}`);
      if (r.level) assert.ok(r.level in LEVEL_D);
      assert.ok(r.notes.some((n) => n.join !== null || n.short || n.accent) || r.level || r.plan.length || r.whole, `${id}/${r.id}: something to play by`);
      if (r.quote) assert.ok(r.quote.split(/\s+/).length <= 45, `${id}/${r.id}: a short quotation`);
    }
  }
});

test("D272: HEAR THE SUBJECT: joined notes reach the next, detached ones stop short, staccato shorter, an accent louder; at the game's tempo", () => {
  const notes: [number, number, number][] = [
    [0, 480, 60],
    [480, 480, 62],
    [960, 480, 64],
    [1440, 480, 65],
  ];
  const r = { tempo: 60, level: "mf", shape: null, notes: [{ join: true, short: null, accent: null }, { join: false, short: null, accent: true }, { join: null, short: true, accent: null }, { join: null, short: null, accent: null }] } as unknown as Reading;
  // D274: at the tempo given (the recordings'), not the reading's.
  const p = performSubject(r, notes, 1920, 120);
  assert.equal(p[1].at, 0.125, "♩ = 120: a sixteenth an eighth of a second");
  assert.ok(p[0].len >= 0.125, "joined: to the next");
  assert.ok(p[1].len < 0.125 * 0.8, "detached (D304: three quarters)");
  assert.ok(p[2].len < p[1].len, "staccato shorter");
  assert.ok(p[1].d > p[0].d, "the accent louder");
});

test("D325: every reading is open from the start and remembered (D369: nothing chosen, D344's reading for the fugue, here none)", () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  const id = "wtc1f99";
  const rs = [{ id: "a" }, { id: "b" }] as Reading[];
  READINGS[id] = rs;
  assert.equal(chosenReading(id), null, "no reading chosen for this made-up fugue by D344: NONE");
  chooseReading(id, "b");
  assert.equal(chosenReading(id)?.id, "b", "open at once (D272 locked it until the fugue was finished)");
  chooseReading(id, NO_READING);
  assert.equal(chosenReading(id), null, "NONE chosen again");
  chooseReading(id, "gone");
  assert.equal(chosenReading(id), null, "a reading the fugue no longer has: NONE");
  delete READINGS[id];
});

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

test("D272: in play, a subject note detached where the reading says so scores THE READING; joined there it does not (nor legato)", () => {
  const f = fugueById("wtc1f02");
  const e = firstEntry("wtc1f02");
  // A reading: every note detached from the next.
  const reading = { id: "t", notes: e.notes.map(() => ({ join: false, short: null, accent: null })), level: null, plan: [], tempo: 60 } as unknown as Reading;
  const W = 800;
  const H = 400;
  const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };
  const run = (overlap: boolean) => {
    const clock = { t: 0 };
    const g = new ProtoGame(f, e.voice, 0, protoById("ladder"), { bpm: 60, legato: false, until: e.end, solo: true, easy: "direction", fail: false, reading }, fakeChip(clock));
    g.rows = ROWS;
    const to = (t: number) => {
      while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
      clock.t = Math.max(clock.t, t);
      g.step();
    };
    let id = 0;
    let held = 0;
    let side: "left" | "right" = "left";
    for (const n of g.notes) {
      to(g.timeAt(n.on));
      side = side === "left" ? "right" : "left";
      const nid = ++id;
      if (held && !overlap) g.up(held, performance.now());
      g.down(nid, { side, x: side === "left" ? 40 : W - 40, y: ROWS.yOf(n.step), w: W, h: H }, performance.now());
      if (held && overlap) g.up(held, performance.now() + 1);
      held = nid;
      // Detached: let go at three fifths of the note (the next struck after a gap).
      if (!overlap) (to(g.timeAt(n.on + n.dur * 0.6)), g.up(nid, performance.now()), (held = 0));
    }
    if (held) g.up(held, performance.now());
    to(g.timeAt(g.end + 1));
    return g;
  };
  const apart = run(false);
  const joined = run(true);
  assert.ok(apart.style.of > 5);
  assert.ok(apart.style.hit / apart.style.of > 0.9, `detached: ${apart.style.hit}/${apart.style.of}`);
  assert.ok(apart.earned.reading > 0);
  assert.equal(joined.style.hit, 0, "joined where it asks detached");
  assert.equal(joined.earned.articulation, 0, "and no articulation credit there (D325: the mark is what is judged)");
  assert.ok(apart.earned.articulation > 0, "detached as marked: credited");
  assert.ok(apart.results().sheet.qualities.some((q) => q.key === "reading"));
});
