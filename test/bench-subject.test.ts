/** D214, SUBJECT: the player follows the subject through all of its entries, whichever voice. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { everyNote, fugueById, inBar, type TouchFugue } from "../src/touch/fugue.ts";
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

/**
 * The stretto rule (D217), stated anew: the entries sounding at a note's onset (begun, their last note
 * not yet over) ranked newest first (a tie: the first subject, then the upper voice; a voice's newest
 * only); a note is the main line's when its entry ranks first, the second line's (the lower row) when
 * it ranks second.
 */
function expected(f: TouchFugue, from: number): [string[], string[]] {
  const es = f.entries.filter((e) => e.on >= from);
  const stop = (e: (typeof es)[number]) => Math.max(...e.notes.map(([on, dur]) => on + dur));
  const newer = (a: (typeof es)[number], b: (typeof es)[number]) => b.on - a.on || (a.theme ?? 1) - (b.theme ?? 1) || a.voice - b.voice;
  const out: [string[], string[]] = [[], []];
  for (const e of es)
    for (const [on, , midi] of e.notes) {
      const r = es.filter((x) => x.on <= on && on < stop(x)).sort(newer).filter((x, k, all) => all.findIndex((y) => y.voice === x.voice) === k).indexOf(e);
      if (r === 0 || r === 1) out[r].push(`${e.voice}:${on}:${midi}`);
    }
  return [out[0].sort(), out[1].sort()];
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

test("D214, D217, SUBJECT: the player's notes are exactly the subject's under the stretto rule (the newest entry the main line, the next newest the lower row), and none is also in the accompaniment", () => {
  for (const id of TESTBENCH) {
    const f = fugueById(id);
    for (const share of [0, 0.5]) {
      const from = startTick(f, share);
      const { g } = game(f, from);
      const [main, second] = g.tracks.map((t) => t.notes.map((n) => `${n.voice}:${n.on}:${n.midi}`));
      const mine = [...main, ...second];
      assert.deepEqual([[...main].sort(), [...second].sort()], expected(f, from), `${id} from ${share}`);
      assert.equal(new Set(mine).size, mine.length, `${id}: no note twice`);
      const others = new Set(g.others.map((n) => `${n.voice}:${n.on}:${n.midi}`));
      assert.ok(mine.every((k) => !others.has(k)), `${id}: the player's notes are not scheduled in the accompaniment`);
      // Nothing lost: the player's notes and the accompaniment make the whole fugue from there.
      // D363: the band-only voices' notes (a divisi) too, the band's.
      const all = everyNote(f).filter(([on]) => on >= from).length;
      assert.equal(mine.length + g.others.length, all, `${id}: every note sounds once`);
      // The line in time; the entries take turns (a chord only within one entry's voice).
      assert.ok(g.notes.every((n, i) => i === 0 || g.notes[i - 1].on < n.on || (g.notes[i - 1].on === n.on && g.notes[i - 1].voice === n.voice)), `${id}: the entries take turns`);
    }
  }
});

test("D214: every entry's first note is free and struck (never riding), in either line; entries are named", () => {
  for (const id of TESTBENCH) {
    const f = fugueById(id);
    const { g } = game(f, 0, "direction");
    assert.ok(g.entries.length > 0);
    for (const e of g.entries) {
      const k = g.tracks.findIndex((t) => t.notes.some((n) => n.on === e.on && n.voice === e.voice));
      assert.ok(k >= 0, `${id}: entry at ${e.on} has its head`);
      const i = g.tracks[k].notes.findIndex((n) => n.on === e.on && n.voice === e.voice);
      assert.ok(g.isFree(i, k), `${id}: head at ${e.on} free`);
      assert.ok(!g.tracks[k].notes[i].ride, `${id}: head at ${e.on} struck`);
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

/** The struck notes of both lines in time: [track, index]. */
const struckNotes = (g: ProtoGame) =>
  g.tracks
    .flatMap((t, k) => t.notes.map((n, i) => ({ k, i, n })).filter(({ n, i }) => !n.ride && !(i > 0 && t.notes[i - 1].on === n.on)))
    .sort((a, b) => a.n.on - b.n.on || a.k - b.k);
/** Where a thumb plays a note right: its lane, the upper row for the main line, the lower for the second (D217). */
const touchOf = (g: ProtoGame, k: number, i: number, row = k) => {
  const x = ((g.lanesOf(k)[i] + 0.5) / g.laneCount) * W;
  return { side: (x < W / 2 ? "left" : "right") as "left" | "right", x, y: row ? H - 70 : H - 150, w: W, h: H };
};

test("D214, D217: a perfect two-row run through each testbench fugue is all hits, every entry and stretto captured (TIMING and EXACT LANES); each note sounds in its own voice", () => {
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
      for (const { k, i, n } of struckNotes(g)) {
        runTo(g.timeAt(n.on));
        const before = log.length;
        g.down(++id2, touchOf(g, k, i), performance.now());
        g.up(id2, performance.now());
        const struck = log.slice(before).find((e) => e.lead && e.midi === n.midi);
        assert.ok(struck, `${id}: note ${k}/${i} sounded`);
        assert.deepEqual(struck.v, voicing(n.voice!, f.voices.length, true), `${id}: note ${i} in its voice ${n.voice}`);
      }
      runTo(g.timeAt(g.end + 1));
      const r = g.results();
      assert.equal(r.right, r.of, `${id} ${easy}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed}, stray ${r.stray})`);
      assert.equal(r.captured, r.entries, `${id} ${easy}: ${r.captured}/${r.entries} entries`);
      assert.ok(r.grade === "S", `${id} ${easy}: grade ${r.grade}`);
      const ss = g.line!.strettos;
      assert.ok(ss.every((_, j) => g.strettoState[j] === "cleared"), `${id} ${easy}: strettos ${g.strettoState.filter((x) => x === "cleared").length}/${ss.length} cleared`);
      // The riding notes (the second line's quick ones among them) all sounded, played for the player.
      assert.ok(g.tracks.every((t) => t.notes.every((n) => n.state === "hit")), `${id} ${easy}: every note sounded`);
    }
  }
});

test("D217: the strettos of I/1, I/4, I/8 and Contrapunctus XIV are played in two rows (never more than two entries at once); I/2 has none", () => {
  const count = (id: string) => subjectLine(fugueById(id), 0).strettos.length;
  assert.equal(count("wtc1f02"), 0);
  for (const id of ["wtc1f01", "wtc1f04", "wtc1f08", "bwv1080-14"]) assert.ok(count(id) > 0, `${id}: ${count(id)} strettos`);
  for (const id of TESTBENCH) {
    const line = subjectLine(fugueById(id), 0);
    for (const n of line.second) assert.ok(line.strettos.some((s) => s.on <= n[0] && n[0] < s.end), `${id}: a lower-row note at ${n[0]} lies in a stretto`);
    // I/4's strettos of three and four entries: the two newest played, the older back in the accompaniment.
    const all = [...line.notes, ...line.second];
    for (const n of all) assert.ok(new Set(all.filter((m) => m[0] === n[0]).map((m) => m[4])).size <= 2, `${id}: at most two entries struck at ${n[0]}`);
    for (const s of line.strettos) assert.notEqual(line.entries[s.upper].voice, line.entries[s.lower].voice, `${id}: two voices`);
  }
});

test("D217: the second line is reduced: only its notes on a beat or of half a beat or more are struck; the quicker ones ride", () => {
  for (const id of ["wtc1f01", "wtc1f04", "bwv1080-14"]) {
    const f = fugueById(id);
    const { g } = game(f, 0, "exact");
    const t = g.tracks[1];
    assert.ok(t.notes.length > 0, id);
    for (const n of t.notes) {
      const quick = inBar(f, n.on) % g.beat !== 0 && n.dur < g.beat / 2;
      if (quick && !t.fresh!.has(n.on)) assert.ok(n.ride, `${id}: a quick note at ${n.on} rides`);
    }
    assert.ok(t.notes.some((n) => n.ride), `${id}: some ride`);
  }
});

test("D217: in a stretto a note is right only in its row; outside one either row plays the single entry", () => {
  const f = fugueById("wtc1f01");
  const { g, clock } = game(f, 0, "timing");
  const s = g.line!.strettos[0];
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  let id = 0;
  // Before the stretto: the lower row plays the main line.
  for (const { k, i, n } of struckNotes(g).filter(({ n }) => n.on < s.on - g.opt.early)) {
    assert.equal(k, 0);
    runTo(g.timeAt(n.on));
    g.down(++id, touchOf(g, 0, i, 1), performance.now());
    g.up(id, performance.now());
    assert.equal(n.state, "hit", `lower row before the stretto: note ${i}`);
  }
  // In the stretto: the main line's notes in the upper row; the first lower-row note struck in the upper row is wrong (OTHER ROW), the stretto lost.
  const j = g.tracks[1].notes.findIndex((n) => !n.ride && n.on >= s.on);
  const n1 = g.tracks[1].notes[j];
  for (const { k, i, n } of struckNotes(g).filter(({ n }) => n.on >= s.on - g.opt.early && n.on <= n1.on)) {
    if (k !== 0) continue;
    runTo(g.timeAt(n.on));
    g.down(++id, touchOf(g, 0, i, 0), performance.now());
    g.up(id, performance.now());
    assert.equal(n.state, "hit", `upper row in the stretto: note ${i}`);
  }
  runTo(g.timeAt(n1.on));
  g.down(++id, touchOf(g, 1, j, 0), performance.now());
  g.up(id, performance.now());
  assert.equal(n1.state, "miss");
  assert.equal(g.grade?.why, "hand");
  runTo(g.timeAt(n1.on + g.beat));
  assert.equal(g.strettoState[0], "lost");
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

/** D221: every Book I fugue, not only the testbench's. */
const BOOK_I = Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`);

test("D221: every Book I fugue's SUBJECT line is the stretto rule's (from the start and halfway), every head free and struck; a perfect two-row run (EXACT LANES) all hits, every entry and stretto captured", () => {
  for (const id of BOOK_I) {
    const f = fugueById(id);
    for (const share of [0, 0.5]) {
      const from = startTick(f, share);
      const { g } = game(f, from);
      const [main, second] = g.tracks.map((t) => t.notes.map((n) => `${n.voice}:${n.on}:${n.midi}`));
      assert.deepEqual([[...main].sort(), [...second].sort()], expected(f, from), `${id} from ${share}`);
      // D363: the band-only voices' notes (a divisi) too, the band's.
      const all = everyNote(f).filter(([on]) => on >= from).length;
      assert.equal(main.length + second.length + g.others.length, all, `${id}: every note sounds once`);
    }
    const log: { midi: number; at: number; v: Voicing; lead: boolean }[] = [];
    const { g, clock } = game(f, 0, "exact", log);
    for (const e of g.entries) {
      const k = g.tracks.findIndex((t) => t.notes.some((n) => n.on === e.on && n.voice === e.voice));
      assert.ok(k >= 0, `${id}: entry at ${e.on} has its head`);
      const i = g.tracks[k].notes.findIndex((n) => n.on === e.on && n.voice === e.voice);
      assert.ok(g.isFree(i, k) && !g.tracks[k].notes[i].ride, `${id}: head at ${e.on} free and struck`);
    }
    const runTo = (t: number) => {
      while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
      clock.t = Math.max(clock.t, t);
      g.step();
    };
    let id2 = 0;
    for (const { k, i, n } of struckNotes(g)) {
      runTo(g.timeAt(n.on));
      const before = log.length;
      g.down(++id2, touchOf(g, k, i), performance.now());
      g.up(id2, performance.now());
      const struck = log.slice(before).find((e) => e.lead && e.midi === n.midi);
      assert.ok(struck, `${id}: note ${k}/${i} sounded`);
      assert.deepEqual(struck.v, voicing(n.voice!, f.voices.length, true), `${id}: note ${i} in its voice ${n.voice}`);
    }
    runTo(g.timeAt(g.end + 1));
    const r = g.results();
    assert.equal(r.right, r.of, `${id}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed}, stray ${r.stray})`);
    assert.equal(r.captured, r.entries, `${id}: ${r.captured}/${r.entries} entries`);
    assert.equal(r.grade, "S", `${id}: grade ${r.grade}`);
    assert.ok(g.strettoState.every((x) => x === "cleared"), `${id}: strettos ${g.strettoState.join(",")}`);
    assert.ok(g.tracks.every((t) => t.notes.every((n) => n.state === "hit")), `${id}: every note sounded`);
  }
});
