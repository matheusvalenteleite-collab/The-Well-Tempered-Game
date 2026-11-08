/**
 * D535, THE ROLLS AND FILLS HUMANISED (drum-fills.ts; drum-presets.ts kitBeat, rock-drums.ts ABBEY ROAD), and D536, the
 * ear-proxy and the studio's live events (chip.ts Chip.scheduleKitHit: music-events.ts emitMusic; sound.ts outputLevel).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio, type FakeAudioContext } from "./fake-audio.ts";
import { Chip, musicKindOf, type GrooveContext } from "../src/touch/chip.ts";
import { outputLevel, setBacking } from "../src/touch/sound.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { formOf } from "../src/touch/fugue-form.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { kitBeat, kitFillPlan, type KitHit } from "../src/touch/drum-presets.ts";
import { formOf as rockFormOf, rockBeat } from "../src/touch/rock-drums.ts";
import { FILL_STROKE_S, FILL_VARIANTS, JITTER_S, fillBeats, fillStrokes, repetition, type FillFeel } from "../src/touch/drum-fills.ts";
import { HOME_ID, setDrumStyle } from "../src/touch/drum-library.ts";
import { liveEvents, outputLevelNow, resetLive } from "../src/touch/music-events.ts";
import { saveStageMode } from "../src/touch/stage-bg.ts";

installFakeAudio(0, true);
const WTC = FUGUES.filter((f) => /^wtc|^bwv/.test(f.id) && f.kind !== "prelude");
const KIT = ["rock", "poprock", "psych", "jazz", "bebop", "baiao", "machine", "house", "dnb", "chip"];

function timing(id: string) {
  const f = fugueById(id);
  const b = beatOf(f);
  const beatS = (b.ticks / f.tpq) * (60 / tempoOf(id));
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  return { f, b, beatS, compound, form: formOf(f) };
}
function play(id: string, style: string) {
  const { f, b, beatS, compound, form } = timing(id);
  const beats: { tick: number; hits: KitHit[] }[] = [];
  for (let tick = 0, n = 0; tick < f.length; tick += b.ticks, n++) beats.push({ tick, hits: kitBeat(style, { b: n % b.perBar, per: b.perBar, compound, beatS, tick, beat: b.ticks, form, keyAt: () => f.key, home: f.key }) });
  return { beats, beatS, beat: b.ticks, form };
}

test("D535: never the same fill twice in a row; not every entry filled; the climax, the final entry and the last bar always", () => {
  let plain = 0;
  let filled = 0;
  for (const style of KIT) {
    for (const f of WTC) {
      const { b, beatS, form } = timing(f.id);
      const plan = kitFillPlan(style, form, b.ticks, beatS, b.perBar);
      const played = plan.filter((p) => p.filled);
      for (let i = 1; i < played.length; i++) assert.notEqual(played[i].variant, played[i - 1].variant, `${style} ${f.id} at ${played[i].at}`);
      for (const p of plan) if (p.kind !== "in") assert.ok(p.filled, `${style} ${f.id}: ${p.kind} filled`);
      const ins = plan.filter((p) => p.kind === "in");
      if (ins.length >= 2) assert.ok(ins.some((p) => !p.filled), `${style} ${f.id}: not every entry`);
      plain += ins.length;
      filled += ins.filter((p) => p.filled).length;
    }
  }
  assert.ok(filled / plain < 0.75 && filled / plain > 0.3, `${filled}/${plain}`);
  // ABBEY ROAD's Ringo too.
  let fills = 0;
  let entries = 0;
  for (const f of WTC) {
    const bt = beatOf(f).ticks;
    const m = rockFormOf(f, bt, "abbey").moments.filter((x) => x.kind === "fill" || x.kind === "final");
    for (let i = 1; i < m.length; i++) assert.notEqual(m[i].variant, m[i - 1].variant, f.id);
    fills += m.filter((x) => x.kind === "fill").length;
    entries += f.entries.length - 2;
  }
  assert.ok(fills < 0.6 * entries, `ABBEY ROAD: ${fills} fills for ${entries} entries`);
});

test("D535: a fill phrased and scaled to the tempo and the metre: longer in beats at a quick beat, after a longer phrase", () => {
  // A beat, half a bar, the bar, two bars: by the phrase (bars) and the tempo.
  assert.equal(fillBeats(1, 1.2, 4, 16), 1);
  assert.ok(fillBeats(4, 0.4, 4, 16) > fillBeats(4, 1.2, 4, 16));
  assert.ok(fillBeats(4, 0.5, 4, 16) > fillBeats(1, 0.5, 4, 16));
  assert.ok([1, 3, 6].includes(fillBeats(4, 0.4, 3, 16)), "3/8: a beat, the bar, two bars");
  assert.ok(fillBeats(4, 0.3, 4, 3) <= 3, "never more than its room");
  for (const f of WTC) {
    const { b, beatS, form } = timing(f.id);
    for (const p of kitFillPlan("rock", form, b.ticks, beatS, b.perBar).filter((x) => x.filled)) {
      const s = p.beats * beatS;
      assert.ok(s >= Math.min(beatS, 0.35) - 1e-9 && s <= Math.max(beatS, 3.6), `${f.id} ${p.at}: ${s.toFixed(2)} s`);
      assert.ok([1, b.perBar / 2, b.perBar, 2 * b.perBar].includes(p.beats), `${f.id}: ${p.beats} beats in a bar of ${b.perBar}`);
    }
  }
});

test("D535: humanised: a crescendo contour, uneven hands, flams and ruffs, a seeded jitter (none for the machines); deterministic", () => {
  let graces = 0;
  for (const feel of Object.keys(FILL_VARIANTS) as FillFeel[]) {
    for (let v = 0; v < FILL_VARIANTS[feel]; v++) {
      for (const [beats, beatS, compound] of [[2, 0.5, false], [4, 0.4, false], [2, 0.9, true], [1, 0.7, false]] as const) {
        const spec = { feel, variant: v, beats, beatS, compound, lo: 0.26, hi: 0.64, seed: 12345 + v };
        const a = fillStrokes(spec);
        assert.deepEqual(a, fillStrokes({ ...spec }), "deterministic");
        const main = a.filter((h) => !h.grace && h.piece !== "kick");
        assert.ok(main.length >= 2, `${feel} ${v}`);
        const third = Math.max(1, Math.floor(main.length / 3));
        const mean = (xs: typeof main) => xs.reduce((s, h) => s + h.vel, 0) / xs.length;
        assert.ok(mean(main.slice(-third)) > mean(main.slice(0, third)), `${feel} ${v}: crescendo`);
        for (const h of a) assert.ok(h.t >= 0 && h.t < beats && h.vel > 0 && h.vel <= 1, `${feel} ${v}`);
        // Each drum's strokes (graces aside) never closer than FILL_STROKE_S less the jitter both ways.
        const by = new Map<string, number[]>();
        for (const h of a) if (!h.grace) by.set(h.piece, [...(by.get(h.piece) ?? []), h.t]);
        for (const ts of by.values()) for (let i = 1; i < ts.length; i++) assert.ok((ts[i] - ts[i - 1]) * beatS >= FILL_STROKE_S - 2 * JITTER_S[feel] - 1e-6, `${feel} ${v}: ${ts[i] - ts[i - 1]}`);
        graces += a.filter((h) => h.grace).length;
        // The machines on their grid; the hands off it.
        const off = main.some((h) => Math.abs(h.t * 48 - Math.round(h.t * 48)) > 1e-6);
        if (JITTER_S[feel] === 0) assert.ok(!off, `${feel} ${v} on the grid`);
      }
    }
  }
  assert.ok(graces > 20, `${graces} graces`);
  const rock = fillStrokes({ feel: "rock", variant: 0, beats: 2, beatS: 0.5, compound: false, lo: 0.26, hi: 0.64, seed: 7 });
  assert.ok(rock.some((h) => !h.grace && Math.abs(h.t * 8 - Math.round(h.t * 8)) > 1e-4), "rock: off the grid a little");
  assert.ok(rock.some((h) => h.piece === "tomLow") && rock.some((h) => h.piece === "tomHigh"), "rock: down the toms");
});

test("D536: the ear-proxy: the fills' strokes no longer machine-gun (equal intervals and equal velocity steps the exception)", () => {
  const sum = { ioi: 0, step: 0, n: 0 };
  for (const style of ["rock", "jazz", "baiao"]) {
    for (const f of WTC.slice(0, 24)) {
      const { beats, beatS } = play(f.id, style);
      let run: { t: number; vel: number }[] = [];
      const flush = () => {
        if (run.length >= 4) {
          const r = repetition(run, beatS);
          sum.ioi += r.ioiSame;
          const s = [...run].sort((a, b) => a.t - b.t);
          let st = 0;
          for (let i = 2; i < s.length; i++) if (Math.abs(s[i].vel - 2 * s[i - 1].vel + s[i - 2].vel) < 0.005) st++;
          sum.step += st / (s.length - 2);
          sum.n++;
        }
        run = [];
      };
      beats.forEach((x, n) => {
        const r = x.hits.filter((h) => (h.role === "roll" || h.role === "fill") && !h.grace && h.piece !== "kick");
        if (r.length) for (const h of r) run.push({ t: n + h.at, vel: h.vel });
        else flush();
      });
      flush();
    }
  }
  assert.ok(sum.n > 50);
  assert.ok(sum.ioi / sum.n < 0.3, `equal intervals ${(sum.ioi / sum.n).toFixed(3)}`);
  assert.ok(sum.step / sum.n < 0.1, `equal velocity steps ${(sum.step / sum.n).toFixed(3)}`);
});

test("D535: ABBEY ROAD's fills: down the toms to the crash and the kick on the entry, its strokes in the beat", () => {
  const { f, b, beatS, compound } = timing("wtc1f02");
  const form = rockFormOf(f, b.ticks, "abbey");
  for (const m of form.moments.filter((x) => x.kind === "fill")) {
    const strokes: { piece: string; vel: number; grace?: boolean; role?: string }[] = [];
    for (let t = m.from; t < m.at - b.ticks / 2; t += b.ticks) for (const h of rockBeat("abbey", 0, 4, compound, t, b.ticks, beatS, form)) (assert.ok(h.at >= 0 && h.at < 1), strokes.push(h));
    const toms = strokes.filter((h) => h.piece.startsWith("tom") && !h.grace);
    assert.ok(toms.length >= 1 && strokes.every((h) => h.role === "roll"), `${m.at}`);
    const land = rockBeat("abbey", 0, 4, compound, m.at, b.ticks, beatS, form);
    assert.ok(land.some((h) => h.piece === "crash" && h.at === 0) && land.some((h) => h.piece === "kick" && h.at === 0));
  }
});

test("D536: the studio's live events from the single choke point: the kinds, the level played, a roll's length; none with the stage off", () => {
  const chip = new Chip();
  setBacking(true);
  const f = fugueById("wtc1f12");
  const { b, beatS, form } = timing(f.id);
  setDrumStyle(f.id, "rock");
  const plan = kitFillPlan("rock", form, b.ticks, beatS, b.perBar).find((p) => p.filled && p.kind === "in")!;
  const run = () => {
    resetLive();
    chip.kitEvents.length = 0;
    const t0 = (chip.ctx as unknown as { currentTime: number }).currentTime + 0.5;
    const from = plan.from - 2 * b.ticks;
    for (let k = 0, tick = from; tick < plan.at + 2 * b.ticks; tick += b.ticks, k++) {
      const cx: GrooveContext = { tick, beat: b.ticks, fills: [], end: f.length, piece: f, dynDb: 0 };
      chip.groove(t0 + k * beatS, beatS, Math.round(tick / b.ticks) % b.perBar, 0, b.perBar, false, cx);
    }
    return liveEvents(0, f.length);
  };
  const ev = run();
  const kinds = new Set(ev.map((e) => e.kind));
  for (const k of ["roll", "crash", "kick", "snare", "accent"]) assert.ok(kinds.has(k as never), `${k} in ${[...kinds]}`);
  for (const e of ev) assert.ok(e.level >= 0 && e.level <= 1);
  const rolls = ev.filter((e) => e.kind === "roll");
  assert.ok(rolls.every((e) => typeof e.dur === "number" && e.tick + e.dur! <= plan.at + 1 && e.tick + e.dur! >= plan.at - 1), "a roll carries its length to the landing");
  // The level is the velocity played, the tick the stroke's.
  const k0 = chip.kitEvents.find((e) => musicKindOf(e) === "roll")!;
  assert.ok(rolls.some((e) => e.tick === k0.tick && e.level === k0.vel));
  // The hats are time, not events.
  assert.equal(musicKindOf({ voice: "kit", style: "rock", piece: "hat", tick: 0, when: 0, vel: 0.4 }), null);
  assert.equal(musicKindOf({ voice: "kit", style: "timpani", piece: "timp", tick: 0, when: 0, vel: 0.4 }), "timp");
  // The registration's change (the organ's, the harpsichord's), on the tick of the clock the rhythm section keeps.
  const c = chip as unknown as { noteRegistration: (id: string, r: { stops: string[] | null; tutti: boolean }, lead: boolean, at: number) => void; tickAtTime: (t: number) => number | null };
  const t1 = (chip.ctx as unknown as { currentTime: number }).currentTime + 10;
  c.noteRegistration("chamberOrgan", { stops: ["p8"], tutti: false }, false, t1);
  c.noteRegistration("chamberOrgan", { stops: ["p8"], tutti: false }, false, t1 + 0.5);
  c.noteRegistration("chamberOrgan", { stops: ["p8", "p4"], tutti: false }, false, t1 + 1);
  c.noteRegistration("chamberOrgan", { stops: ["p8", "p4"], tutti: false }, false, t1 + 1.2);
  const regs = liveEvents(-1e9, 1e12).filter((e) => e.kind === "registration");
  assert.equal(regs.length, 1, "one change, once");
  assert.equal(regs[0].tick, c.tickAtTime(t1 + 1));
  // The meter: the output's level after the limiter, 0..1, given to the studio at the Chip's making.
  const ctx = chip.ctx as unknown as FakeAudioContext;
  ctx.meterValue = 0;
  assert.equal(outputLevel(), 0);
  ctx.meterValue = 0.25;
  ctx.advance(ctx.currentTime + 0.5);
  const lv = outputLevelNow()!;
  assert.ok(lv > 0.5 && lv <= 1, `${lv}`);
  // The stage off: nothing reported.
  saveStageMode("off");
  try {
    assert.equal(run().length, 0);
    c.noteRegistration("chamberOrgan", { stops: ["p8"], tutti: false }, false, t1 + 20);
    assert.equal(liveEvents(-1e9, 1e12).length, 0);
  } finally {
    saveStageMode("full");
    setBacking(false);
    setDrumStyle(f.id, HOME_ID);
  }
});

test("D535: the bands' own drummers humanised: the brushes' swept crescendo, salsa's abanico, chorinho's virada, the bossa's rim figure, PET SOUNDS' toms", async () => {
  const { brushFills } = await import("../src/touch/drum-presets.ts");
  const { brushBeat } = await import("../src/touch/jazz-drums.ts");
  const { latinPlan, latinBeat } = await import("../src/touch/latin-drums.ts");
  const { bossaPlan, bossaBeat } = await import("../src/touch/bossa-drums.ts");
  const { petPlan, petBeat } = await import("../src/touch/pet-drums.ts");
  const { f, b, beatS, compound } = timing("wtc1f12");
  const beat = b.ticks;
  const per = b.perBar;
  // The brushes: the flutter rising through each fill, its pick-ups not all the same.
  const fills = brushFills(f, beat, per).filter((x) => x.kind !== "final");
  const picks = new Set<string>();
  for (const x of fills) {
    let last = 0;
    for (let t = x.from; t < x.at - beat / 2; t += beat) {
      const bb = brushBeat(0, per, compound, t, beat, brushFills(f, beat, per), 0, f.length, beatS);
      const fl = bb.sweeps.find((s) => s.piece === "flutter")!;
      assert.ok(fl.to > fl.from && fl.from >= last - 1e-9);
      last = fl.to;
      if (t + beat >= x.at - beat / 2) picks.add(bb.hits.filter((h) => h.piece === "tap").map((h) => `${h.grace ? "g" : ""}${h.at.toFixed(2)}`).join(","));
    }
  }
  assert.ok(picks.size >= 3, [...picks].join(" | "));
  // Salsa's fills: the timbales and the abanico's ruff into the rimshot; chorinho's tamborim; both uneven and off the grid.
  const plan = latinPlan(f, beat, per);
  for (const band of ["salsa", "chorinho"] as const) {
    const hs = plan.fills.filter((x) => x.kind === "fill").flatMap((x) => {
      const out = [];
      for (let t = Math.floor(x.from / beat) * beat; t < x.at; t += beat) out.push(...latinBeat(band, plan, t, beat, 0, beatS).filter((h) => h.role));
      return out;
    });
    assert.ok(hs.length > 4, band);
    if (band === "salsa") assert.ok(hs.some((h) => h.piece === "rimshot") && hs.some((h) => h.grace) && hs.some((h) => h.piece === "macho" || h.piece === "hembra"));
    else assert.ok(hs.some((h) => h.piece === "tamborim"));
    const main = hs.filter((h) => !h.grace);
    assert.ok(repetition(main.map((h, i) => ({ t: i + h.at, vel: h.vel })), beatS).velSame < 0.3, band);
  }
  // The bossa and PET SOUNDS: fewer fills than entries, never the same twice running, the rim figure and the toms.
  const bp = bossaPlan(f, beat, per);
  const pp = petPlan(f, beat, per);
  assert.ok(bp.moments.filter((m) => m.kind === "fill").length >= 2 && pp.moments.filter((m) => m.kind === "fill").length >= 2);
  const pm = pp.moments.filter((m) => m.kind !== "break");
  for (let i = 1; i < pm.length; i++) assert.notEqual(pm[i].variant, pm[i - 1].variant);
  const bf = bp.moments.filter((m) => m.kind === "fill").flatMap((m) => {
    const out = [];
    for (let t = m.from; t < m.at - beat / 2; t += beat) out.push(...bossaBeat(0, per, compound, t, beat, f.tpq, bp, 0, beatS).hits);
    return out;
  });
  assert.ok(bf.every((h) => h.at >= 0 && h.at < 1) && bf.some((h) => h.role === "roll"));
  const pf = pm.flatMap((m) => {
    const out = [];
    for (let t = m.from; t < m.at - beat / 2; t += beat) out.push(...petBeat(0, per, compound, t, beat, pp, 0, beatS));
    return out;
  });
  assert.ok(pf.some((h) => h.piece === "tomHigh" || h.piece === "tomLow") && pf.some((h) => h.grace));
});
