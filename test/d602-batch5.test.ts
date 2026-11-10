/**
 * D602-D605 (the owner's batch after 2.52): II/2's two manuals scripted; II/6's alto and drums; II/1's arc; the climax
 * for every fugue.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { formOf as pointsOf } from "../src/touch/form-points.ts";
import { ColourPlan } from "../src/touch/colour.ts";
import { hasManualScript, manualAt, manualScript, manualStages } from "../src/touch/harpsi-manuals.ts";
import { pieceLineUp } from "../src/touch/sound.ts";
import { homeFor } from "../src/touch/drum-library.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { CHORO_CLIMAX_GAIN, choroStage, inEntry, latinBeat, latinPlan } from "../src/touch/latin-drums.ts";
import { BAND_GROWTH, growthAt } from "../src/touch/band-growth.ts";
import { CLIMAX_TONE, formColour, formOf } from "../src/touch/fugue-form.ts";
import { beatOf } from "../src/touch/fugue.ts";

test("D602: II/2 on the harpsichord: the entries on the brighter manual, the stops changing at the form's points only", () => {
  const f = fugueById("wtc2f02");
  assert.ok(hasManualScript("wtc2f02", "harpsichordSampled") && !hasManualScript("wtc2f02", "chamberOrgan") && !hasManualScript("wtc2f09", "harpsichordSampled"));
  const st = manualStages(f);
  assert.deepEqual(st.map((s) => s.name), ["exposition", "stretti", "final", "coda"]);
  const fp = pointsOf(f);
  assert.equal(st[2].on, fp.seams.find((s) => s.kind === "final")!.on, "the final group's stops from its start");
  // the first stretto: bar 14 (two entries in each other's first half), not the exposition's answer
  assert.ok(st[1].on > 13 * f.barTicks && st[1].on < 15 * f.barTicks);
  // every change of a voice's registration falls on an entry's start or end or a stage's start
  const points = new Set<number>([...st.map((s) => s.on), ...f.entries.flatMap((e) => [e.on, e.end])]);
  const plan = new ColourPlan(f, manualScript(f));
  for (let v = 0; v < f.voices.length; v++) {
    let last = "";
    for (const [on] of f.voices[v]) {
      const key = (plan.at(on, v)?.reg ?? []).join("+");
      if (key !== last && last !== "") {
        const prev = [...points].filter((p) => p <= on).sort((a, b) => b - a)[0];
        const notes = f.voices[v].filter((n) => n[0] >= prev && n[0] < on);
        assert.equal(notes.length, 0, `voice ${v} changes at ${on} with no point since ${prev}`);
      }
      last = key;
    }
  }
  // inside its entry a voice is on the brighter manual, outside on the other; the final group fuller than the exposition
  const e = f.entries[0];
  assert.deepEqual([...manualAt(f, e.voice, e.on)], ["four"]);
  assert.deepEqual([...manualAt(f, (e.voice + 1) % 4, e.on)], ["lute"]);
  const fin = st[2].on;
  assert.ok(manualAt(f, 0, fin).length >= 1 && manualAt(f, 3, f.length - 1).length === 2);
});

test("D603: II/6's alto on the triangle (its own line-up), the rest of SID 64 as it was; its drums HOUSE", () => {
  const f = fugueById("wtc2f06");
  const l = pieceLineUp("sid64", f)!;
  assert.deepEqual(l.slots.map((s) => s[0]), ["sidLead", "sidTri", "sidBass"]);
  assert.equal(pieceLineUp("sid64", fugueById("wtc2f03")), null);
  assert.equal(homeFor("wtc2f06", PIECE_SOUND.wtc2f06), "house");
});

test("D604: II/1's regional grows act by act: the tamborim and the agogô join, the final group the firmest; brighter by the form", () => {
  const f = fugueById("wtc2f01");
  const { ticks: beat, perBar } = beatOf(f);
  const plan = latinPlan(f, beat, perBar);
  const fp = pointsOf(f);
  const count = (from: number, to: number) => {
    let n = 0, v = 0;
    for (let t = from; t < to; t += beat) if (inEntry(plan, t)) for (const h of latinBeat("chorinho", plan, t, beat)) (n++, (v += h.vel));
    return { n, v };
  };
  const expo = fp.seams[0];
  const fin = fp.seams.find((s) => s.kind === "final")!;
  const a = count(expo.on, expo.end);
  const z = count(fin.on, fin.end);
  const rate = (x: { n: number }, len: number) => x.n / len;
  assert.ok(rate(z, fin.end - fin.on) > 1.2 * rate(a, expo.end - expo.on), "denser in the final group");
  assert.ok(z.v / z.n > a.v / a.n, "firmer");
  assert.equal(choroStage(fp, expo.on + 10).stage, 0);
  assert.equal(choroStage(fp, fin.on + 10).stage, 3);
  assert.ok(CHORO_CLIMAX_GAIN > 1 && CHORO_CLIMAX_GAIN <= 1.25);
  const g = BAND_GROWTH.chorinho.growth!;
  const ep = fp.seams.find((s) => s.kind === "episode")!;
  assert.ok((growthAt(f, ep.on + 1, g).colour.tone ?? 0) < (growthAt(f, fp.climax.peak, g).colour.tone ?? 0));
});

test("D605: a climax for every fugue: where the zones are not apart, the band brightens and the room opens into it (no level)", () => {
  const f = fugueById("wtc1f01");
  const m = formOf(f);
  assert.ok(!m.clear);
  assert.equal(formColour(m, "pianoSampled", 10), null);
  const c = formColour(m, "pianoSampled", m.peak + 1)!;
  assert.equal(c.db, 0);
  assert.ok((c.colour.tone ?? 0) >= CLIMAX_TONE - 1e-9 && (c.colour.room ?? 0) > 0);
});

test("D608: II/22's trance grown into the final group (denser, no fill or roll), the growth II/22's only", async () => {
  const { strokesOf } = await import("./drum-strokes.ts");
  const { tempoOf } = await import("../src/touch/tempi.ts");
  const { PIECE_GROWTH } = await import("../src/touch/band-growth.ts");
  const f = fugueById("wtc2f22");
  const fp = pointsOf(f);
  const tps = (f.tpq * tempoOf(f.id)) / 60;
  const s = await strokesOf(f, "krautrock", "liebezeit");
  const ee = fp.seams[0].end;
  const fin = fp.seams.find((x) => x.kind === "final")!;
  const rate = (a: number, z: number) => s.filter((x) => x.tick >= a && x.tick < z).length / ((z - a) / tps);
  assert.ok(rate(fin.on, fin.end) > 1.4 * rate(ee - 20 * tps, ee), "the loop fuller in the final group");
  // (D566's soft lift of the snare's ghosts into the final entry and the last bar its own; none else)
  assert.ok(!s.some((x) => x.tick >= fin.on && (x.role === "fill" || x.role === "roll") && x.tick < fp.last - 2 * f.barTicks), "no fill, no roll");
  assert.ok(PIECE_GROWTH.wtc2f22.krautrock && !PIECE_GROWTH.wtc1f20);
});
