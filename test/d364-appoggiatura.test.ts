/**
 * D364, THE HOLD-OVER APPOGGIATURA (the ornament report's "Appoggiatura by hold-over"; the tutorial
 * design's lesson, here V.5): thumb A holds the note before past the beat while thumb B rests PREPARED on
 * the new note a diatonic step away; A's lift before 75% of the note (90% on a fermata) sounds it by the
 * pull-off, unjudged for time; the held note sounds over the beat as the appoggiatura (tied, or struck
 * again), the note after it softer where the instrument has dynamics; a quick lift the short one. Only
 * where the long appoggiatura goes: a strong beat, a beat or more, the note before joined a step away.
 * On by default because the owner's logs replay identically with it (no late lift among his prepared rests).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { MECH, MECH_DEFAULTS, MECH_SPEC, withMech } from "../src/bench/mechanics.ts";
import { outcomes, replay } from "../src/bench/lab/replay.ts";
import { parseLog, type LabLog } from "../src/bench/lab/log.ts";
import { parseStudy } from "../src/bench/lab/study.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import { describe as lines } from "../src/bench/lab/describe.ts";
import { freeLine, freeTally } from "../src/bench/free-summary.ts";
import { lessonById, PLAYED, stagePassed, type Material } from "../src/bench/manual/lessons.ts";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { setPreset } from "../src/touch/sound.ts";
import { demoRun, gameFor, ROWS, tapperRun } from "./d342-sim.ts";
import { playerRun } from "./d359-players.ts";

const LOGS_DIR = new URL("./fixtures/owner-2026-10-27/", import.meta.url);
function ownerLogs(): { id: string; log: LabLog }[] {
  const out: { id: string; log: LabLog }[] = [];
  for (const name of readdirSync(LOGS_DIR).sort()) {
    const text = gunzipSync(readFileSync(new URL(name, LOGS_DIR))).toString("utf8");
    if (name.startsWith("wtc-study")) parseStudy(text).excerpts.forEach((e, x) => e.takes.forEach((log, t) => out.push({ id: `${name} ${x + 1}:${t + 1}`, log })));
    else out.push({ id: name, log: parseLog(text) });
  }
  return out;
}
const verdicts = (events: readonly LabEvent[]) => [...outcomes(events)].map(([k, o]) => `${k} ${o.out} ${o.legato ?? "-"} ${o.tick.toFixed(1)}`);
const prepWhat = (events: readonly LabEvent[], what: string) => events.filter((e) => e.kind === "prep" && e.what === what).length;

test("D364: MECH › ORNAMENTS › HOLD-OVER APPOGGIATURA, on in the game; its shares, sound and softness in the Lab", () => {
  assert.equal(MECH_DEFAULTS.holdOver, true);
  assert.equal(MECH.holdOver, true);
  assert.equal(MECH_DEFAULTS.holdOverShare, 0.75);
  assert.equal(MECH_DEFAULTS.holdOverFermataShare, 0.9);
  assert.equal(MECH_DEFAULTS.holdOverShortMs, 80);
  assert.equal(MECH_DEFAULTS.holdOverSound, "tied");
  const spec = MECH_SPEC.find((s) => s.key === "holdOver")!;
  assert.equal(spec.group, "ORNAMENTS");
  assert.equal(spec.label, "Hold-over appoggiatura");
  for (const k of ["holdOverShare", "holdOverFermataShare", "holdOverShortMs", "holdOverSound", "holdOverSoft"]) assert.ok(MECH_SPEC.some((s) => s.key === k && s.group === "ORNAMENTS"), k);
});

test("D364: the owner's logs replayed with the hold-over on and off: every verdict, join and time identical; it never arms", () => {
  const logs = ownerLogs();
  assert.equal(logs.length, 107);
  let rests = 0;
  let pullOffs = 0;
  let early = 0;
  for (const { id, log } of logs) {
    const off = replay(log, { holdOver: false });
    const on = replay(log, { holdOver: true });
    assert.deepEqual(verdicts(on.events), verdicts(off.events), id);
    assert.equal(prepWhat(on.events, "hold-over") + prepWhat(on.events, "appoggiatura"), 0, `${id}: armed`);
    rests += prepWhat(on.events, "rest");
    pullOffs += prepWhat(on.events, "pull-off");
    early += prepWhat(on.events, "early-lift");
  }
  // His thumbs rest PREPARED again and again in these runs (replayed with today's parameters), and each
  // is lifted at its note's time (a pull-off) or before it, never held over: nothing to arm.
  assert.deepEqual([rests, pullOffs, early], [113, 98, 15]);
});

const I22: Material = { piece: "wtc1f22", voice: 0, fromBar: 13, toBar: 17, tempo: { pct: 100 }, label: "I/22 soprano I 13–17", badge: "IN GAME" };

test("D364: only where the long appoggiatura goes: a strong beat, a beat or more, the note before joined a step away", () => {
  const { g } = gameFor(I22, { t: 0 });
  const ns = g.tracks[0].notes;
  const places = ns.map((_, i) => i).filter((i) => g.holdOverAt(0, i));
  // Bars 15, 16, 17: D♭5, C5, B♭4, each a whole bar or more, each entered from the step above, held.
  assert.deepEqual(places.map((i) => ns[i].midi), [73, 72, 70]);
  const f = fugueById("wtc1f22");
  for (const i of ns.map((_, k) => k).filter((k) => !places.includes(k))) {
    const n = ns[i];
    const p = ns[i - 1];
    const strong = f.bars.some((b) => b.on === n.on);
    assert.ok(!strong || n.dur < f.tpq * 2 || !p || p.on + p.dur !== n.on || Math.abs(p.step - n.step) !== 1, `${i} should be a place`);
  }
});

/** A player resting PREPARED on each note (B+), each note before lifted at the next's time, or held over a share of it where `over(k)` says. */
function heldOverRun(m: Material, over: (k: number) => number | null, opts: { chip?: (clock: { t: number }) => Chip } = {}) {
  const clock = { t: 0 };
  const { g } = gameFor(m, clock);
  if (opts.chip) (g as unknown as { chip: Chip }).chip = opts.chip(clock);
  g.o.demo = false;
  g.wall = () => 0;
  const evs: LabEvent[] = [];
  const feed = g.tap!;
  g.tap = (e) => (evs.push(e), feed(e));
  const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  type E = { t: number; k: number; fn: () => void };
  const es: E[] = [];
  const offs: number[] = [];
  heads.forEach((n, k) => {
    const side = k % 2 ? "right" : "left";
    const x = side === "left" ? 40 : 760;
    const prev = heads[k - 1];
    const next = heads[k + 1];
    const share = next ? over(k + 1) : null;
    const t1 = next ? g.timeAt(next.on + (share ?? 0) * next.dur) : g.timeAt(n.on + n.dur) - 0.02;
    offs.push(t1);
    // Down on its note early (prepared), after this thumb's own last lift.
    const t0 = !prev ? g.timeAt(n.on) : Math.max(g.timeAt(prev.on) + 0.05, (offs[k - 2] ?? -1) + 0.03);
    es.push({ t: t0, k: 1, fn: () => g.down(k + 1, { side, x, y: ROWS.yOf(n.step), w: 800, h: 1000 }, 0) });
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
  return { g, r: g.results(), evs, heads };
}

test("D364: held over and lifted: the appoggiatura, the note sounded by the lift, right and unjudged for time; drawn over its note", () => {
  // Bars 15–17's three places held over half, a third and two thirds of their notes.
  const share: Record<number, number> = { 7: 0.5, 8: 0.34, 9: 0.66 };
  const { g, evs, heads } = heldOverRun(I22, (k) => share[k] ?? null);
  const ap = evs.filter((e): e is Extract<LabEvent, { kind: "prep" }> => e.kind === "prep" && e.what === "appoggiatura");
  assert.deepEqual(ap.map((e) => [e.midi, e.grace, Math.round(e.share! * 100) / 100, e.short]), [
    [73, 75, 0.5, false],
    [72, 73, 0.34, false],
    [70, 72, 0.66, false],
  ]);
  // Every note right; the three sounded by the lift PERFECT however late (unjudged for time).
  const out = outcomes(evs);
  assert.ok(heads.every((_, k) => out.get(`0:${k}`)?.out === "right"));
  for (const e of ap) assert.equal((evs.find((x) => x.kind === "note" && x.i === e.i) as Extract<LabEvent, { kind: "note" }>).perfect, true);
  // The overlay (D353's): the held note on its row from the beat to the lift, then the note.
  const p = g.performed.get("0:7")!;
  assert.equal(p.kind, "appoggiatura");
  assert.equal(p.free, true);
  assert.equal(p.parts[0][2], 75);
  assert.equal(p.parts[1][2], 73);
  assert.ok(Math.abs(p.parts[0][1] - 0.5 * heads[7].dur) < heads[7].dur * 0.02);
  // The score sheet's count and the Lab's line.
  assert.equal(freeLine(freeTally([...g.performed.values()].map((x) => x.kind))), "YOU ADDED 3 APPOGGIATURAS");
  const said = evs.flatMap((e) => lines(I22.piece, e)).filter((l) => l.includes("APPOGGIATURA"));
  assert.equal(said.length, 3);
  assert.match(said[0], /♪ APPOGGIATURA Eb5 → Db5 · held \d+ ms \(0\.50 of the note\)/);
  // The note before is HELD (judged at its written end), the join into the note kept.
  assert.ok(evs.filter((e) => e.kind === "release" && [6, 7, 8].includes(e.i)).every((e) => e.kind === "release" && e.word.startsWith("HELD")));
});

test("D364: lifted past 75% the note is missed, as without the hold-over; with it off, any late lift misses", () => {
  const late = heldOverRun(I22, (k) => (k === 7 ? 0.8 : null));
  assert.equal(outcomes(late.evs).get("0:7")?.out, "miss");
  assert.equal(prepWhat(late.evs, "appoggiatura"), 0);
  assert.equal(prepWhat(late.evs, "hold-over"), 1);
  withMech({ holdOver: false }, () => {
    const r = heldOverRun(I22, (k) => (k === 7 ? 0.5 : null));
    assert.equal(outcomes(r.evs).get("0:7")?.out, "miss");
    assert.equal(prepWhat(r.evs, "hold-over"), 0);
  });
  // On a fermata (the piece's last note: 90%), not here: I/22's soprano 13–17 ends mid-piece.
  assert.ok(late.g.f.length > late.heads.at(-1)!.on + late.heads.at(-1)!.dur);
});

test("D364: a quick lift is the short appoggiatura; the long one's note softer where the instrument has dynamics; STRUCK AGAIN re-strikes the grace", () => {
  type Sent = { midi: number; at: number; p: Play; stopped?: number };
  const rec = (sent: Sent[]) => (clock: { t: number }) =>
    ({
      ctx: { get currentTime() { return clock.t; } },
      heard: () => clock.t,
      note: (midi: number, at: number, _d: number, _v: unknown, p: Play = {}) => {
        const s: Sent = { midi, at, p };
        sent.push(s);
        return { stop: (w?: number) => void (s.stopped ??= w ?? clock.t), bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
      },
      swoosh() {},
      tick() {},
      chime() {},
    }) as unknown as Chip;
  const f = fugueById("wtc1f22");
  const levelOf = (sent: Sent[], midi: number, on: number) => sent.find((s) => s.p.lead && s.midi === midi && s.at > on)?.p.level ?? 1;
  const n7 = (g: ReturnType<typeof heldOverRun>["g"]) => g.tracks[0].notes[7];
  // A quick lift: within 80 ms of the PERFECT window (136 ms here, RELATIVE: the note's own time): short (the note at its level).
  const quick = heldOverRun(I22, (k) => (k === 7 ? 0.06 : null));
  const q = quick.evs.find((e) => e.kind === "prep" && e.what === "appoggiatura") as Extract<LabEvent, { kind: "prep" }>;
  assert.equal(q.short, true);
  // On the piano, the long appoggiatura's note at holdOverSoft of the short's.
  setPreset("pianoSampled");
  try {
    const sLong: Sent[] = [];
    const long = heldOverRun(I22, (k) => (k === 7 ? 0.5 : null), { chip: rec(sLong) });
    const sShort: Sent[] = [];
    const short = heldOverRun(I22, (k) => (k === 7 ? 0.06 : null), { chip: rec(sShort) });
    const lv = levelOf(sLong, 73, long.g.timeAt(n7(long.g).on));
    const sv = levelOf(sShort, 73, short.g.timeAt(n7(short.g).on));
    assert.ok(Math.abs(lv / sv - MECH.holdOverSoft) < 1e-6, `${lv} / ${sv}`);
    // STRUCK AGAIN: the grace (E♭5) attacked anew as it is armed, past the beat.
    const sStruck: Sent[] = [];
    withMech({ holdOverSound: "struck" }, () => heldOverRun(I22, (k) => (k === 7 ? 0.5 : null), { chip: rec(sStruck) }));
    const on7 = long.g.timeAt(n7(long.g).on);
    assert.equal(sLong.filter((s) => s.p.lead && s.midi === 75 && s.at > on7 && s.at < on7 + 1).length, 0, "tied: no new attack");
    assert.equal(sStruck.filter((s) => s.p.lead && s.midi === 75 && s.at > on7 && s.at < on7 + 0.2).length, 1, "struck again just past the beat (its PERFECT window)");
    // The harpsichord: no softer note (it has no dynamics).
    setPreset("harpsichordSampled");
    const hLong: Sent[] = [];
    const hl = heldOverRun(I22, (k) => (k === 7 ? 0.5 : null), { chip: rec(hLong) });
    const hShort: Sent[] = [];
    const hs = heldOverRun(I22, (k) => (k === 7 ? 0.06 : null), { chip: rec(hShort) });
    assert.equal(levelOf(hLong, 73, hl.g.timeAt(n7(hl.g).on)), levelOf(hShort, 73, hs.g.timeAt(n7(hs.g).on)));
  } finally {
    setPreset("chip");
  }
  assert.ok(f.voices[0].length > 0);
});

test("D364: Herr Bach's manner APPOGGIATURA holds every place over half its note (the textbook half, I.2.2 §11)", () => {
  const x = demoRun(I22, "appoggiatura").lens!;
  assert.deepEqual([x.appo.of, x.appo.made, x.appo.short], [3, 3, 0]);
  assert.ok(x.appo.shares.every((s) => Math.abs(s - 0.5) < 0.02));
  assert.equal(x.right, x.of);
  // Prepared but lifted on time: none.
  assert.equal(demoRun(I22, "prepared").lens!.appo.made, 0);
  assert.ok(lessonById("V.5"));
});

test("D364: THE MANUAL's V.5, the appoggiatura held over: after the four, no pass mark, I/22's falling chains; his demonstration holds every one over", () => {
  const l = lessonById("V.5")!;
  assert.deepEqual(PLAYED.filter((x) => x.part === "V").map((x) => x.id), ["V.1", "V.2", "V.3", "V.4", "V.5"]);
  assert.equal(l.checks, undefined, "decision 3: passed by being played through");
  assert.deepEqual(l.hear!.styles, ["prepared", "appoggiatura"], "listening first: on time, then held over");
  assert.equal(l.sound, "piano", "the note after it softer: an instrument with dynamics");
  assert.ok(l.before.length <= 2 && l.after.length <= 1 && l.stages.every((s) => s.say));
  // The excerpts: three places (I/22 soprano I, bars 15–17), then five (soprano II, bars 63–67).
  const want = [3, 5];
  l.stages.forEach((st, k) => {
    const held = demoRun(st.m, "appoggiatura").lens!;
    assert.equal(held.appo.of, want[k], st.m.label);
    assert.equal(held.appo.made, want[k], `${st.m.label}: his demonstration holds every one over`);
    assert.equal(held.right, held.of);
    assert.equal(demoRun(st.m, "prepared").lens!.appo.made, 0, "on time: none");
    // A careful player striking each note in time makes none, and passes; so does a random tapper (no pass mark).
    const careful = playerRun(st.m, { jitterMs: 15, hold: 0.8 }).lens!;
    assert.equal(careful.appo.made, 0);
    assert.ok(stagePassed(l, st.kind, careful, k) && stagePassed(l, st.kind, tapperRun(st.m, 7).lens!, k));
  });
  // Shown: how many, and how long against the textbook half; told: a comparison, never a pass.
  const x = demoRun(l.stages[1].m, "appoggiatura").lens!;
  assert.deepEqual(l.shown!(x).map((c) => [c.text, c.vars]), [
    ["HELD OVER {n} OF {m}", { n: 5, m: 5 }],
    ["HELD {p}% OF THE NOTE · THE TEXTBOOK: HALF", { p: 50 }],
  ]);
  assert.equal(l.told!(x)!.text, "Half the note, as my son teaches it.");
  const at = (s: number) => l.told!({ ...x, appo: { of: 5, made: 1, short: 0, shares: [s] } })!.text;
  assert.match(at(0.2), /^Short and light/);
  assert.match(at(0.8), /^Long, and full of feeling/);
  assert.match(l.told!({ ...x, appo: { of: 5, made: 0, short: 0, shares: [] } })!.text, /^None held over/);
  // A player who rests prepared and holds over in their own way: each one counted.
  const own = heldOverRun(l.stages[1].m, (k) => ({ 4: 0.6, 7: 0.3 })[k] ?? null);
  assert.equal(prepWhat(own.evs, "appoggiatura"), 2);
});
