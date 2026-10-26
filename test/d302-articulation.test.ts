/**
 * D302: legato and detached heard on every sound. D304: detached and staccato only where a reading
 * marks them (held 0.75 and 0.5); by default steps joined, leaps and repeated notes a little shortened. The others' notes joined (no gap, no fresh attack:
 * the level, the filter and the FM index go on; a plucked note held into the next) or detached (an
 * audible gap) by the reading's marks on every entry of the subject, else by a rule; HEAR THE SUBJECT
 * the same. Measured on the fake audio graph: each note's envelope is the sum over its sources of the
 * gains on its way to the master (fake-audio.ts FakeParam.valueAt evaluates the automation).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play } from "../src/touch/chip.ts";
import { setPreset } from "../src/touch/sound.ts";
import { fugueById, inBar, beatOf, type TouchFugue } from "../src/touch/fugue.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { ART_HOLD, GAP_BEATS, joins, phrase, TOUCH, type Shape, type Style } from "../src/touch/phrasing.ts";
import { performSubject, readingMarks, readingsOf } from "../src/touch/readings.ts";
import { accompaniment, subjectMarks } from "../src/touch/voice-mode.ts";
import { hz } from "../src/touch/tuning.ts";

const ctxOf = installFakeAudio(0, true);

const I2 = fugueById("wtc1f02");
const KELLER = readingsOf("wtc1f02").find((r) => r.id === "keller")!;

function shapesOf(f: TouchFugue, reading: typeof KELLER | null = KELLER, style: Style = "plain") {
  const notes = accompaniment(f, 0, -1);
  const shapes = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, style, { marks: readingMarks(f.entries, reading) });
  return { notes, shapes };
}

/** A note's envelope at t: over its sources sounding, the product of the gains on the way to `bus`, summed. */
function envelope(made: FakeNode[], bus: unknown, t: number): number {
  const path = (n: FakeNode, depth: number): number => {
    if (n === bus) return 1;
    if (depth > 24) return 0;
    let best = 0;
    for (const to of n.targets) {
      if (!(to instanceof FakeNode)) continue;
      const g = to.kind === "gain" ? Math.abs((to.gain as FakeParam).valueAt(t)) : 1;
      if (g > 0) best = Math.max(best, g * path(to, depth + 1));
    }
    return best;
  };
  let sum = 0;
  // (A recording as long as it is let sound: the fake's are a tenth of a second.)
  for (const n of made) if (n instanceof FakeSource && n.startAt !== null && n.startAt <= t && t < (n.kind === "buffer" && n.stopCall < Infinity ? n.stopCall : n.stopAt)) sum += path(n, 0);
  return sum;
}

/** Plays notes i and i+1 of the subject's first entry as the game plays the others (phrasing's holds, joins); the nodes each made. */
function pair(presetId: string, i: number, count = 3, voice = 0, reading: typeof KELLER | null = KELLER) {
  setPreset(presetId);
  const chip = new Chip();
  const ctx = ctxOf();
  const { notes, shapes } = shapesOf(I2, reading);
  const e = [...I2.entries].filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
  const idx = e.notes.map(([on]) => notes.findIndex((n) => n.voice === e.voice && n.on === on));
  const spt = 60 / (tempoOf(I2.id) * I2.tpq);
  // Warm up: the preset's effect built, its nodes not a note's.
  chip.note(60, 0, 0.05, voicing(voice, count));
  const made: FakeNode[][] = [];
  const t0 = 1;
  for (const k of [i, i + 1]) {
    const n = notes[idx[k]];
    const sh: Shape = shapes[idx[k]];
    const before = new Set(ctx.nodes);
    const at = t0 + (n.on - notes[idx[i]].on) * spt + sh.nudge;
    const len = n.dur * sh.hold * spt + sh.over;
    chip.note(n.midi, at, len, voicing(voice, count), { level: 1, ...joins(sh) } as Play);
    made.push([...ctx.nodes].filter((x) => !before.has(x)));
  }
  const a = notes[idx[i]];
  return { chip, ctx, made, on1: t0 + shapes[idx[i]].nudge, on2: t0 + (notes[idx[i + 1]].on - a.on) * spt + shapes[idx[i + 1]].nudge, value: a.dur * spt, sh: [shapes[idx[i]], shapes[idx[i + 1]]], midi: [a.midi, notes[idx[i + 1]].midi] };
}

type P = ReturnType<typeof pair>;
const E = (p: P, k: 0 | 1, t: number) => envelope(p.made[k], p.chip.input, t);
const both = (p: P, t: number) => E(p, 0, t) + E(p, 1, t);
/** The longest span (s) before the second onset where both notes are under -30 dB of the first's level (an audible gap). */
function silence(p: P): number {
  let top = 0;
  for (let t = p.on1; t < p.on2; t += 0.001) top = Math.max(top, E(p, 0, t));
  let run = 0;
  let best = 0;
  for (let t = p.on1 + 0.005; t < p.on2; t += 0.001) {
    run = both(p, t) < top * 0.0316 ? run + 0.001 : 0;
    best = Math.max(best, run);
  }
  return best;
}
/** The lowest level of the two together around the join, over the first's level before it. */
function dip(p: P): number {
  const ref = E(p, 0, p.on2 - 0.03);
  let low = Infinity;
  for (let t = p.on2 - 0.03; t <= p.on2 + 0.06; t += 0.001) low = Math.min(low, both(p, t));
  return low / ref;
}
/** The second note's peak in its first 80 ms over its level 250 ms in: a fresh attack overshoots. */
const overshoot = (p: P) => {
  let pk = 0;
  for (let t = p.on2; t <= p.on2 + 0.08; t += 0.001) pk = Math.max(pk, E(p, 1, t));
  return pk / E(p, 1, Math.min(p.on2 + 0.25, p.on2 + p.value * 0.9));
};
/** The second note's lowpass at its onset over 300 ms in: an attack opens it. */
const opening = (p: P) => {
  const fl = p.made[1].find((n) => n.kind === "filter" && (n.frequency as FakeParam).events.length);
  if (!fl) return 1;
  const f = fl.frequency as FakeParam;
  return f.valueAt(p.on2 + 0.001) / f.valueAt(p.on2 + 0.3);
};

test("D302: Keller's I/2 on every entry: the mordent's sixteenths joined, the quavers detached, in every voice", () => {
  const { notes, shapes } = shapesOf(I2);
  let entries = 0;
  for (const e of I2.entries.filter((x) => !x.theme)) {
    const at = (j: number) => shapes[notes.findIndex((n) => n.voice === e.voice && n.on === e.notes[j][0])];
    if (!at(0) || !at(2)) continue;
    entries++;
    assert.equal(at(0).art, "join", `voice ${e.voice} at ${e.on}`);
    assert.equal(at(1).legato, true);
    assert.equal(at(2).art, "detach");
    assert.equal(at(14).art, "short", "the staccato sixteenths before the syncopation");
    assert.ok(at(2).hold <= ART_HOLD.detach + 1e-9 && at(14).hold <= ART_HOLD.short + 1e-9);
    assert.ok(at(0).over >= 0.01 && at(0).over <= 0.05, "held a little over the next onset");
  }
  assert.ok(entries >= 6, `${entries} entries marked`);
  // Never louder: the same levels with or without the reading.
  const plain = phrase(notes, beatOf(I2).ticks, (t) => inBar(I2, t), subjectMarks(I2).subject, "plain");
  shapes.forEach((s, i) => assert.equal(s.level, plain[i].level));
});

test("D304: without a reading, the default playing: steps joined, leaps and repeated notes a little shortened, nothing detached, the bass as the others", () => {
  const f = fugueById("wtc2f22");
  const beat = beatOf(f).ticks;
  const bass = f.voices.length - 1;
  for (const style of ["plain", "harpsichord", "piano"] as const) {
    const { notes, shapes } = shapesOf(f, null, style);
    const count = (a: string) => shapes.filter((s) => s.art === a).length;
    assert.equal(count("detach") + count("short"), 0, `${style}: nothing detached without a reading`);
    assert.ok(count("join") > notes.length * 0.5, `${style}: ${count("join")} joined of ${notes.length}`);
    const least = style === "plain" ? ART_HOLD.repeat : TOUCH[style].repeat;
    let bassSteps = 0;
    notes.forEach((n, i) => {
      const s = shapes[i];
      assert.ok(s.hold >= least - 1e-9, `${style}: at most a little shortened (${s.hold.toFixed(2)} at ${n.voice}:${n.on})`);
      if (s.art === "join") assert.ok(s.hold >= 1 - 1e-9 && s.over > 0, "joined: held to the next and over");
      if (s.art === "nonlegato") assert.ok((1 - s.hold) * n.dur <= GAP_BEATS * beat + 1e-6, "a small gap");
      // D302 detached the bass's notes of a third of a beat to a beat; its steps are joined now.
      if (n.voice === bass && s.art === "join" && n.dur >= beat / 3 && n.dur <= beat) bassSteps++;
    });
    assert.ok(bassSteps >= 10, `${style}: the bass's steps joined (${bassSteps})`);
  }
});

test("D304: a fugue's reading marks only its subject's entries; elsewhere the default", () => {
  const f = fugueById("wtc2f22");
  const r = readingsOf(f.id)[0];
  const withR = shapesOf(f, r).shapes;
  const without = shapesOf(f, null).shapes;
  const marks = readingMarks(f.entries, r);
  const { notes } = shapesOf(f, null);
  let marked = 0;
  notes.forEach((n, i) => {
    if (marks.has(`${n.voice}:${n.on}`)) marked++;
    else assert.deepEqual([withR[i].art, withR[i].hold], [without[i].art, without[i].hold], `${n.voice}:${n.on} unmarked: the default`);
  });
  assert.ok(marked > 0);
});

test("D302: a synthesized sound (SWITCHED-ON): joined, no gap and no new attack; detached by the reading, a gap of a fifth of the note at least; by default a leap's gap small", () => {
  // Notes 0-1 (C-B, joined) and 2-3 (C-G, detached) of the subject's first entry (the alto of three).
  const j = pair("analog", 0, 4, 0);
  assert.equal(j.sh[0].art, "join");
  assert.ok(dip(j) > 0.6, `dip ${dip(j).toFixed(2)}`);
  assert.ok(overshoot(j) < 1.08, `overshoot ${overshoot(j).toFixed(2)}`);
  assert.ok(opening(j) < 1.05, `the filter does not open anew: ${opening(j).toFixed(2)}`);
  const d = pair("analog", 2, 4, 0);
  assert.equal(d.sh[0].art, "detach");
  assert.ok(Math.abs(d.sh[0].hold - ART_HOLD.detach) < 1e-9, `held three quarters (${d.sh[0].hold})`);
  assert.ok(silence(d) >= 0.2 * d.value, `silent ${silence(d).toFixed(3)} s of ${d.value.toFixed(3)}`);
  assert.ok(overshoot(d) > 1.15 || opening(d) > 1.5, "a fresh attack after the gap");
  // The same leap (C-G) with no reading: a little shortened only.
  const l = pair("analog", 2, 4, 0, null);
  assert.equal(l.sh[0].art, "nonlegato");
  assert.ok(silence(l) < 0.16 * l.value && silence(l) < 0.6 * silence(d), `the default leap's gap ${silence(l).toFixed(3)} s of ${l.value.toFixed(3)} (detached ${silence(d).toFixed(3)})`);
});

test("D302: an FM sound (MEGA FM's reed): joined, no gap and no burst of the index; detached, a gap", () => {
  const j = pair("megaFm", 0, 3, 0);
  assert.ok(dip(j) > 0.6, `dip ${dip(j).toFixed(2)}`);
  assert.ok(overshoot(j) < 1.08, `overshoot ${overshoot(j).toFixed(2)}`);
  const index = (p: P, k: 0 | 1, t: number) => {
    const f0 = hz(p.midi[k]);
    let best = 0;
    for (const n of p.made[k]) if (n.kind === "gain" && n.targets.some((x) => x instanceof FakeParam) && (n.gain as FakeParam).events.length) best = Math.max(best, (n.gain as FakeParam).valueAt(t) / f0);
    return best;
  };
  const idx2 = index(j, 1, j.on2 + 0.001);
  const body = index(j, 1, j.on2 + 0.4);
  assert.ok(idx2 <= body * 1.05, `the index at the joined onset ${idx2.toFixed(2)}, its body ${body.toFixed(2)}`);
  const d = pair("megaFm", 2, 3, 0);
  assert.ok(silence(d) >= 0.2 * d.value, `silent ${silence(d).toFixed(3)} s`);
  assert.ok(index(d, 1, d.on2 + 0.001) > index(d, 1, d.on2 + 0.4) * 1.3, "a detached note's onset bright (the index falling)");
});

test("D302: a recorded sustained sound (NOCTURNE 32-BIT's violin): joined, crossfaded past the attack; detached, a gap", async () => {
  setPreset("nocturne32");
  await new Chip().prepare(I2.voices.flat().map((n) => n[2]));
  const j = pair("nocturne32", 0, 3, 0);
  assert.ok(dip(j) > 0.6, `dip ${dip(j).toFixed(2)}`);
  const src = j.made[1].find((n) => n instanceof FakeSource && n.kind === "buffer") as FakeSource;
  assert.ok(src.offset >= 0.2, `started past its attack (${src.offset.toFixed(3)} s in)`);
  const d = pair("nocturne32", 2, 3, 0);
  assert.ok(silence(d) >= 0.2 * d.value, `silent ${silence(d).toFixed(3)} s`);
  const src2 = d.made[1].find((n) => n instanceof FakeSource && n.kind === "buffer") as FakeSource;
  assert.ok(src2.offset < 0.05, "a detached note from its attack");
});

test("D302: a plucked recording (the harpsichord): joined, held into the next (overlegato); detached, a gap", async () => {
  setPreset("harpsichordSampled");
  await new Chip().prepare(I2.voices.flat().map((n) => n[2]));
  const j = pair("harpsichordSampled", 0, 3, 0);
  assert.ok(E(j, 0, j.on2 + 0.015) > 0.3 * E(j, 0, j.on2 - 0.03), "the first still sounding after the second is plucked");
  const d = pair("harpsichordSampled", 2, 3, 0);
  // Its damper and key-up noise in the gap: still a fifth of the note at -30 dB.
  assert.ok(silence(d) >= 0.15 * d.value, `silent ${silence(d).toFixed(3)} s`);
});

test("D302: HEAR THE SUBJECT joins the reading's joined notes (held to the next and over, no new attack)", () => {
  const e = [...I2.entries].filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
  const perf = performSubject(KELLER, e.notes, I2.tpq, tempoOf(I2.id));
  assert.ok(perf[0].tie && perf[1].legato, "C-B joined");
  assert.ok(perf[0].at + perf[0].len > perf[1].at, "held over the next onset");
  assert.ok(!perf[2].tie && !perf[3].legato, "the quaver detached");
  assert.ok(perf[2].at + perf[2].len <= perf[3].at - 0.2 * (perf[3].at - perf[2].at) + 1e-9, "a gap of a fifth of its value at least (D304: held three quarters)");
  assert.ok(perf[2].apart && !perf[0].apart, "the detached note's gap heard on every sound (Play.apart)");
});
