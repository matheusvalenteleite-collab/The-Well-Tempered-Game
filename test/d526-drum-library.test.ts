/**
 * D526-D529: THE DRUM LIBRARY (drum-library.ts, drum-grids.ts): one registry of styles grouped by family, a HOME and a
 * family for every sound, FITS by the fugue's metre, every style selectable for every fugue and sound (DRUMS on: the
 * sound's HOME by default), every style played in every metre at the fugue's tempo under the form, the bands' own
 * drummers folded in as styles, and every stroke through Chip.scheduleKitHit with its tick and velocity.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, drumFilesFor, type GrooveContext } from "../src/touch/chip.ts";
import { PRESETS, TRIALS, setBacking, setPreset } from "../src/touch/sound.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { formOf } from "../src/touch/fugue-form.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { fileOf, folderOf } from "../src/touch/sampled.ts";
import { kitBeat, ROLL_STROKE_S, type KitContext, type KitHit } from "../src/touch/drum-presets.ts";
import { GRIDS, GRID_STEP_S, layoutOf } from "../src/touch/drum-grids.ts";
import { FAMILIES, HOME_ID, PLANNED_STYLES, SOUND_STYLES, chosenStyle, drumMenuFor, drumStyleFor, familyFor, fits, homeStyleFor, metreOf, setDrumStyle, styleIds, styleInfo, stylesIn } from "../src/touch/drum-library.ts";

installFakeAudio(0, true);
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const WTC = FUGUES.filter((f) => /^wtc|^bwv/.test(f.id) && f.kind !== "prelude");

test("D526: the library: unique ids grouped by family, short caps labels, the decision's styles all there, S3's planned ones apart", () => {
  assert.equal(new Set(styleIds).size, styleIds.length);
  let fam = 0;
  for (const id of styleIds) {
    const s = styleInfo(id);
    const at = FAMILIES.indexOf(s.family);
    assert.ok(at >= fam, `${id} grouped`);
    fam = at;
    assert.ok(s.label.length <= 10 && s.label === s.label.toUpperCase(), s.label);
    assert.ok(s.metres.length > 0 && s.why.length > 10, id);
    if (s.engine === "grid") assert.ok(GRIDS[id], id);
  }
  for (const id of ["rock", "poprock", "abbey", "psych", "motorik", "ballad", "shuffle", "brushes", "jazz", "bebop", "jazzWaltz", "salsa", "bossa", "choro", "baiao", "machine", "house", "techno", "breakbeat", "dnb", "triphop", "linn", "lofi", "idm", "chip", "timpani", "frame"]) assert.ok(styleIds.includes(id), id);
  for (const fam of FAMILIES) assert.ok(stylesIn(fam).length >= 2, fam);
  assert.ok(stylesIn("electronic").length >= 10);
  for (const p of PLANNED_STYLES) assert.ok(!styleIds.includes(p.id), p.id);
});

test("D526: every sound has a HOME and a family (HOME first); the bands their own drummers", () => {
  for (const p of [...PRESETS, ...TRIALS]) {
    const fam = familyFor(p.id);
    assert.ok(SOUND_STYLES[p.id], `${p.id} has a family`);
    assert.equal(fam[0], homeStyleFor(p.id));
    assert.ok(fam.length >= 2 && fam.every((s) => styleIds.includes(s)) && new Set(fam).size === fam.length, p.id);
  }
  assert.equal(homeStyleFor("abbeyRoad"), "abbey");
  assert.equal(homeStyleFor("krautrock"), "motorik");
  assert.equal(homeStyleFor("bossaNova"), "bossa");
  assert.equal(homeStyleFor("jazzQuartet"), "brushes");
  assert.equal(homeStyleFor("salsa"), "salsa");
  assert.equal(homeStyleFor("chorinho"), "choro");
  assert.equal(homeStyleFor("petSounds"), "pet");
  assert.equal(homeStyleFor("chip"), "chip");
  assert.ok(!familyFor("abbeyRoad").includes("timpani") && !familyFor("abbeyRoad").includes("brushes"), "the diagnosis: ABBEY ROAD offered timpani or brushes");
});

test("D526: FITS by the fugue's metre; every metre of the 48 has styles of most families that fit", () => {
  assert.equal(metreOf("wtc1f12"), "duple");
  assert.equal(metreOf("wtc1f11"), "triple");
  assert.equal(metreOf("wtc1f15"), "compound");
  assert.equal(metreOf("wtc2f04"), "compound", "12/16");
  assert.equal(metreOf("wtc1f14"), "compound", "6/4");
  assert.ok(fits("jazzWaltz", "wtc1f11") && !fits("jazzWaltz", "wtc1f12"));
  assert.ok(fits("ballad", "wtc2f18") && !fits("ballad", "wtc1f12"));
  assert.ok(fits("dnb", "wtc2f01") && fits("abbey", "wtc1f02"));
  for (const f of WTC) {
    const fam = new Set(styleIds.filter((s) => fits(s, f)).map((s) => styleInfo(s).family));
    assert.ok(fam.size >= 3, `${f.id} ${f.meter}: ${[...fam]}`);
  }
});

test("D526: the DRUMS menu: the whole library for every fugue and sound, HOME first (id home), then the family, then the rest", () => {
  for (const sound of ["abbeyRoad", "chip", "harpsichordSampled", "nothing"]) {
    for (const f of [WTC[0], fugueById("wtc1f11"), fugueById("wtc2f18")]) {
      const m = drumMenuFor(f.id, sound);
      assert.equal(m.length, styleIds.length);
      assert.deepEqual([...m.map((x) => x.style)].sort(), [...styleIds].sort());
      assert.equal(m[0].id, HOME_ID);
      assert.equal(m[0].style, homeStyleFor(sound));
      assert.ok(m[0].home && m.slice(1).every((x) => !x.home));
      const fam = familyFor(sound);
      assert.deepEqual(m.slice(0, fam.length).map((x) => x.style), [...fam], `${sound} family next`);
      assert.equal(new Set(m.map((x) => x.id)).size, m.length);
      for (const x of m) assert.equal(x.fits, fits(x.style, f));
    }
  }
  // The choice: any style for any piece; "home" follows the sound.
  setDrumStyle("wtc1f12", "dnb");
  assert.equal(drumStyleFor("wtc1f12", "harpsichordSampled"), "dnb");
  setDrumStyle("wtc1f12", HOME_ID);
  assert.equal(chosenStyle("wtc1f12"), null);
  assert.equal(drumStyleFor("wtc1f12", "abbeyRoad"), "abbey");
  assert.equal(drumStyleFor("wtc1f12", "krautrock"), "motorik");
});

/** A whole piece's beats for a kit style (the game's beat and tempo, Busoni's level 0). */
function play(id: string, style: string) {
  const f = fugueById(id);
  const b = beatOf(f);
  const beatS = (b.ticks / f.tpq) * (60 / tempoOf(id));
  const form = formOf(f);
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const beats: { tick: number; hits: KitHit[] }[] = [];
  for (let tick = 0, n = 0; tick < f.length; tick += b.ticks, n++) {
    const cx: KitContext = { b: n % b.perBar, per: b.perBar, compound, beatS, tick, beat: b.ticks, form, keyAt: () => f.key, home: f.key };
    beats.push({ tick, hits: kitBeat(style, cx) });
  }
  return { f, form, beats, beat: b.ticks, beatS };
}
const KIT_STYLES = styleIds.filter((s) => styleInfo(s).engine === "grid" || styleInfo(s).engine === "kit");

test("D527: every written style in every fugue: strokes in the beat, never too close, the final downbeat struck, a roll before the final entry", () => {
  for (const style of KIT_STYLES) {
    for (const f of WTC) {
      const { form, beats, beat, beatS } = play(f.id, style);
      let n = 0;
      for (const x of beats) {
        const by = new Map<string, number[]>();
        for (const h of x.hits) {
          assert.ok(h.vel > 0 && h.vel <= 1 && h.at >= 0 && h.at < 1, `${style} ${f.id}`);
          by.set(h.piece, [...(by.get(h.piece) ?? []), h.at]);
          n++;
        }
        for (const ats of by.values()) {
          ats.sort((a, b) => a - b);
          for (let i = 1; i < ats.length; i++) assert.ok((ats[i] - ats[i - 1]) * beatS >= Math.min(GRID_STEP_S, ROLL_STROKE_S) - 1e-6 || ats[i] === ats[i - 1], `${style} ${f.id} ${x.tick}`);
        }
      }
      assert.ok(n > beats.length * 0.8, `${style} ${f.id}: ${n} strokes`);
      const last = beats.find((x) => Math.abs(x.tick - form.lastBar) < beat / 2);
      if (last) assert.ok(last.hits.some((h) => h.at === 0 && (h.piece === "crash" || h.piece === "timp" || h.piece === "congaLow")), `${f.id} ${style} final`);
      if (form.finalEntry > 0 && form.finalEntry < form.lastBar) {
        const before = beats.filter((x) => x.tick < form.finalEntry && x.tick >= form.finalEntry - 2 * beat).flatMap((x) => x.hits);
        assert.ok(before.some((h) => h.role === "roll" || h.role === "fill"), `${style} ${f.id} roll into the final entry`);
      }
    }
  }
});

test("D527: the form heard in every written style (I/12): the episodes thinner, the climax fuller", () => {
  for (const style of KIT_STYLES) {
    const { form, beats } = play("wtc1f12", style);
    const inZone = (kind: "subject" | "episode") => beats.filter((x) => form.zones.some((z) => z.kind === kind && x.tick >= z.from + 2 * form.beat && x.tick < z.to - 2 * form.beat && z.to <= form.climax));
    const sum = (bs: { hits: KitHit[] }[]) => bs.reduce((s, x) => s + x.hits.reduce((a, h) => a + h.vel, 0), 0) / Math.max(1, bs.length);
    const cl = beats.filter((x) => x.tick >= form.climax + 2 * form.beat && x.tick < form.lastBar - 4 * form.beat);
    assert.ok(sum(inZone("episode")) < 0.8 * sum(inZone("subject")), style);
    assert.ok(sum(cl) > sum(inZone("subject")), `${style}: climax ${sum(cl).toFixed(2)} vs subject ${sum(inZone("subject")).toFixed(2)}`);
  }
});

test("D527: scaled to tempo: the drummer's pulse near the style's own in every fugue (DRUM'N'BASS doubles a walking beat, TRIP-HOP halves a quick one)", () => {
  for (const [id, st] of Object.entries(GRIDS)) {
    for (const f of WTC) {
      const b = beatOf(f);
      const beatS = (b.ticks / f.tpq) * (60 / tempoOf(f.id));
      const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
      const L = layoutOf(st, b.perBar, compound, beatS);
      const bpm = 60 / L.pulseS;
      assert.ok(bpm >= 30 && bpm <= 330, `${id} ${f.id}: ${bpm.toFixed(0)}`);
      if (b.perBar !== 3 && !compound) assert.ok(bpm >= st.bpm[0] / 1.5 && bpm <= st.bpm[1] * 1.5, `${id} ${f.id} ${f.meter}: ${bpm.toFixed(0)} for ${st.bpm}`);
    }
  }
  const dnb = layoutOf(GRIDS.dnb, 2, false, 0.72);
  assert.equal(dnb.r, 2);
  assert.equal(layoutOf(GRIDS.triphop, 4, false, 0.4).r, 0.5);
  assert.equal(layoutOf(GRIDS.house, 4, false, 0.5).r, 1);
});

test("D526: with DRUMS on, every style plays through the one choke point (Chip.scheduleKitHit: the tick, the velocity); the bands' own engines folded in", async () => {
  setPreset("chip");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  setBacking(true);
  for (const f of [fugueById("wtc1f12"), fugueById("wtc2f18"), fugueById("wtc1f11")]) {
    const b = beatOf(f);
    const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
    for (const style of styleIds) {
      setDrumStyle(f.id, style);
      chip.kitEvents.length = 0;
      const n0 = 0;
      const t0 = (chip.ctx as unknown as { currentTime: number }).currentTime + 0.5;
      for (let k = 0; k < 2 * b.perBar; k++) {
        const tick = f.barTicks * 3 + k * b.ticks;
        const cx: GrooveContext = { tick, beat: b.ticks, fills: [], end: f.length, piece: f, dynDb: 0 };
        assert.equal(chip.groove(t0 + k * 0.5, 0.5, k % b.perBar, 3, b.perBar, compound, cx), true);
      }
      const ev = chip.kitEvents.slice(n0);
      assert.ok(ev.length > 0, `${style} on ${f.id}`);
      for (const e of ev) {
        assert.ok(e.style === style && Number.isFinite(e.tick) && e.tick >= f.barTicks * 3 - 1 && e.vel > 0 && e.vel <= 1.5, `${style} ${JSON.stringify(e)}`);
      }
      const voice = { brushes: "brush", rockBand: "rock", latin: "latin", bossa: "bossa", pet: "pet", grid: "kit", kit: "kit", score: "kit" }[styleInfo(style).engine];
      assert.ok(ev.some((e) => e.voice === voice || (voice === "brush" && e.voice === "sweep") || (voice === "bossa" && e.voice === "sweep")), `${style}: ${voice}`);
    }
  }
  setBacking(false);
  for (const f of ["wtc1f12", "wtc2f18", "wtc1f11"]) setDrumStyle(f, HOME_ID);
});

test("D526: every recorded style's files are in public/samples", () => {
  for (const style of styleIds) {
    for (const plan of drumFilesFor(style)) for (const m of plan.notes) {
      const p = `public/samples/${folderOf(plan.set)}/${fileOf(plan.set, m)}`;
      assert.ok(existsSync(p), `${style}: ${p}`);
    }
  }
});
