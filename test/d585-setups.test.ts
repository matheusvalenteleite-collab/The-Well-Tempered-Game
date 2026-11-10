/**
 * D585-D594, THE SETUPS after 2.50 (the owner's listening verdicts): each changed fugue's own sound and drums (piece-sound.ts
 * PIECE_SOUND, drum-library.ts FUGUE_STYLES, homeFor), the four new sounds (BERLIN SCHOOL, VAUDEVILLE, FLUTE & HARP, ORCHESTRA
 * & ORGAN: offered, named, credited, within their instruments' recordings), ORCHESTRA & ORGAN's stages (stage.ts: by the form
 * only, the organ last, through the chip in unison), and the colour plans' reasons in step.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play } from "../src/touch/chip.ts";
import { PATCHES, PRESETS, creditFor, offered, presetById, setPreset, busoniReaches } from "../src/touch/sound.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { FUGUE_STYLES, FUGUE_STYLE_STANDIN, fugueStyle, homeFor, homeStyleFor, isStyle, drumMenuFor, HOME_ID, FUGUE_PICKS } from "../src/touch/drum-library.ts";
import { fugueById, FUGUES } from "../src/touch/fugue.ts";
import { formOf } from "../src/touch/form-points.ts";
import { tickOfBar } from "../src/touch/colour.ts";
import { STAGE_MAX, STAGE_SCRIPTS, StageScript, stageFor, stageRule } from "../src/touch/stage.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { instrumentTuning } from "../src/touch/instrument-tuning.ts";
import { TOUCH_KINDS, TOUCH_LEVEL_DB } from "../src/touch/touch-expr.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

const ctxOf = installFakeAudio(0, true);

const NEW = ["berlinSchool", "vaudeville", "fluteHarp", "orchestraOrgan"] as const;

test("D585-D590: the fugues' own sounds and drums as the owner's verdicts set them (the brief's table)", () => {
  const want: Record<string, [string, string]> = {
    wtc1f01: ["pianoSampled", "lofi"],
    wtc2f12: ["jazzQuartet", "bebop"],
    wtc2f03: ["sid64", "house"],
    wtc2f04: ["gameboy", "idm"],
    wtc1f02: ["berlinSchool", "scoreSynth"],
    wtc1f15: ["megaFm", "arcade"],
    wtc2f24: ["analog", "arcade"],
    wtc1f19: ["vaudeville", "stooges"],
    wtc2f18: ["fluteHarp", "swell"],
    // D594, D596: I/24 then on SID 64 with SYNTH KIT's staged build (the owner: "too slow and boring … change its instrument").
    wtc1f24: ["sid64", "scoreSynth"],
    wtc1f20: ["krautrock", "liebezeit"],
    wtc1f05: ["bachBrass", "march"],
    wtc2f05: ["bachBrass", "march"],
  };
  for (const [id, [sound, style]] of Object.entries(want)) {
    assert.equal(PIECE_SOUND[id], sound, id);
    assert.equal(FUGUE_STYLES[id], style, id);
  }
  // I/13 unchanged (the owner: keep its default).
  assert.equal(PIECE_SOUND.wtc1f13, "oboeTrio");
  assert.equal(FUGUE_STYLES.wtc1f13, undefined);
  // Every fugue's own style plays (or its stand-in, until the drums session's lands); every stand-in a style.
  for (const id of Object.keys(FUGUE_STYLES)) assert.ok(isStyle(fugueStyle(id)), id);
  for (const s of Object.values(FUGUE_STYLE_STANDIN)) assert.ok(isStyle(s), s);
});

test("D585: the fugue's own drums on its own sound only; on any other sound the sound's HOME; the DRUMS menu's HOME entry the same", () => {
  assert.equal(homeFor("wtc1f01", "pianoSampled"), fugueStyle("wtc1f01"));
  assert.equal(homeFor("wtc1f01", "pianoSampled"), "lofi");
  assert.equal(homeFor("wtc1f01", "chamberOrgan"), homeStyleFor("chamberOrgan"));
  assert.equal(homeFor("wtc1f13", "oboeTrio"), homeStyleFor("oboeTrio"));
  const m = drumMenuFor("wtc2f12", "jazzQuartet");
  assert.equal(m[0].id, HOME_ID);
  assert.equal(m[0].style, "bebop");
  assert.equal(new Set(m.map((x) => x.style)).size, m.length, "each style once");
  // The rejected picks gone: I/15's tabor, II/24's castanets.
  assert.ok(!(FUGUE_PICKS.wtc1f15 ?? []).includes("tabor"));
  assert.ok(!(FUGUE_PICKS.wtc2f24 ?? []).includes("castanets"));
});

test("D586-D590: the four new sounds offered, named in every language, credited where recorded, tuned, touched, Busoni reaching them", () => {
  const ids = PRESETS.map((p) => p.id);
  for (const id of NEW) {
    assert.ok(offered(id), id);
    assert.ok(ids.includes(id));
    const p = presetById(id);
    assert.ok(PT[p.name] && ES[p.name], `${p.name} in pt and es`);
    assert.ok(instrumentTuning(id), id);
    assert.ok(TOUCH_KINDS[id] && TOUCH_LEVEL_DB[id], id);
    assert.ok(busoniReaches(id), `${id}: Busoni's reading reaches it`);
    // Seated within ±0.3 (one band on a phone's speaker); every voice count 1-5 laid out.
    for (let n = 1; n <= 5; n++) {
      const by = p.by?.[n];
      assert.ok(by && by.length === n, `${id} ${n}`);
      for (const [pid, pan] of by!) {
        assert.ok(PATCHES[pid], `${id}: ${pid}`);
        assert.ok(Math.abs(pan) <= 0.3, `${id}: ${pid} at ${pan}`);
      }
    }
  }
  // BERLIN SCHOOL synthesized (no recordings, no credit); the others' recordings credited.
  assert.ok(!presetById("berlinSchool").slots!.some((s) => PATCHES[s].sample));
  for (const id of ["vaudeville", "fluteHarp", "orchestraOrgan"]) assert.ok((creditFor(id) ?? "").length > 40, id);
  // The new recordings' sets: the xylophone and the harp (VSO2's, CC BY 3.0, credited in LICENSES.txt), struck and plucked.
  assert.equal(SAMPLED.vaudXylo.plucked, true);
  assert.equal(SAMPLED.seaHarp.plucked, true);
  const lic = readFileSync(new URL("../public/samples/LICENSES.txt", import.meta.url), "utf8");
  assert.ok(/xylophone\//.test(lic) && /harp\//.test(lic));
});

test("D590: ORCHESTRA & ORGAN's stages for I/24: the strings alone in the exposition, the organ only from the final group, every moment with its reason", () => {
  const f = fugueById("wtc1f24");
  const ms = STAGE_SCRIPTS.wtc1f24;
  assert.ok(ms.length >= 6);
  for (const [bar, st, why] of ms) {
    assert.ok(st >= 0 && st <= STAGE_MAX && Number.isInteger(st), `${bar}`);
    assert.ok(why.length > 30, `${bar}: a reason`);
  }
  const s = new StageScript(f);
  assert.equal(s.at(0), 0, "the exposition");
  assert.equal(s.at(tickOfBar(f, 13)), 0, "the soprano's exposition entry");
  // The organ only at the final group (69) and after: never before.
  // (The final group's first entry, the tenor's, in bar 69: the organ from that bar's downbeat.)
  const final = formOf(f).seams.find((x) => x.kind === "final")!;
  const on = tickOfBar(f, 69);
  assert.ok(final.on >= on && final.on < on + f.barTicks);
  for (let t = 0; t < on; t += f.barTicks / 4) assert.ok(s.at(t) < STAGE_MAX, `tick ${t}`);
  assert.equal(s.at(on), STAGE_MAX);
  assert.equal(s.at(f.length - 1), STAGE_MAX, "held to the last chord");
  // The script's moments on Bach's bars; the stage at a bar is the script's.
  assert.equal(s.at(tickOfBar(f, 38)), 2);
  assert.equal(s.at(tickOfBar(f, 24)), 0, "the long episode the strings alone again");
  // Only on the staged sound, and only for a fugue.
  assert.equal(stageFor(f, "stringConsort"), null);
  assert.ok(stageFor(f, "orchestraOrgan"));
});

test("D590: any other fugue on ORCHESTRA & ORGAN takes its stages from its form: the exposition 0, the final group the organ, within 0-3", () => {
  for (const f of FUGUES) {
    const ms = stageRule(f);
    assert.ok(ms.length >= 1, f.id);
    assert.equal(ms[0][1], 0, `${f.id}: the strings begin`);
    for (const [, st] of ms) assert.ok(st >= 0 && st <= STAGE_MAX, f.id);
    const form = formOf(f);
    const final = form.seams.find((x) => x.kind === "final");
    const s = new StageScript(f);
    if (final) {
      const barOn = f.bars.filter((b) => b.on <= final.on).at(-1)!.on;
      for (let t = 0; t < barOn; t += f.barTicks / 2) assert.ok(s.at(t) < STAGE_MAX, `${f.id}: the organ before the final group (${t})`);
      assert.equal(s.at(f.length - 1), STAGE_MAX, `${f.id}: the organ at the close`);
    }
  }
});

test("D590: by the music only: the stage script reads the piece, never the player's score (no verdict in stage.ts)", () => {
  const src = readFileSync(new URL("../src/touch/stage.ts", import.meta.url), "utf8");
  assert.ok(!/score\b.*player|streak|accuracy|verdict|right|wrong/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
  const game = readFileSync(new URL("../src/bench/proto-game.ts", import.meta.url), "utf8");
  // The band's notes and the player's take the stage where they start.
  assert.ok(game.includes("this.stage.at(n.on)") && game.includes("this.stage?.at(notes[i].on)"));
});

test("D590: through the chip: a staged line sounds its strings alone at stage 0, its winds from theirs, the organ at the last; in unison", async () => {
  setPreset("orchestraOrgan");
  const chip = new Chip();
  await chip.prepare([40, 52, 64, 67, 72, 76], [72]);
  const notes = (voice: number, count: number, play: Play = {}) => {
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(64, 1, 1, voicing(voice, count, false), play);
    return [...ctx.nodes].filter((x) => !before.has(x) && x instanceof FakeSource && (x as FakeSource).startAt !== null && (x as FakeSource).startAt! - 1 < 0.2);
  };
  const n0 = notes(0, 4).length;
  const n1 = notes(0, 4, { stage: 1 }).length;
  const n3 = notes(0, 4, { stage: 3 }).length;
  assert.ok(n1 > n0, `the oboe joins the first violin at stage 1 (${n0} → ${n1})`);
  assert.ok(n3 > n1, `the organ at stage 3 (${n1} → ${n3})`);
  // At the last stage the organ in the winds' place: one recording (the violin's), the oboe's gone (ContinuoPart.until).
  const recs = (play: Play) => notes(0, 4, play).filter((x) => (x as FakeSource).kind === "buffer").length;
  assert.equal(recs({ stage: 1 }), recs({}) + 1, "the oboe's recording at stage 1");
  assert.equal(recs({ stage: 2 }), recs({ stage: 1 }), "the first violin's oboe only (the second's on its own line)");
  for (const pid of ["orViolin1", "orViolin2", "orViola", "orCello"] as const) for (const c of PATCHES[pid].continuo ?? []) if (c.from! < 3) assert.equal(c.until, 3, pid);
  // The second violin's oboe only from stage 2.
  assert.equal(notes(1, 4, { stage: 1 }).length, notes(1, 4).length);
  assert.ok(notes(1, 4, { stage: 2 }).length > notes(1, 4).length);
  // A continuo's ask does nothing on a staged part (its parts join by stage alone).
  assert.equal(notes(0, 4, { continuo: "on" }).length, n0);
  // Unison: every doubling part's patch plays the line's own pitch (no octave: ContinuoPart.octave unset).
  for (const pid of ["orViolin1", "orViolin2", "orViola", "orCello"] as const) for (const c of PATCHES[pid].continuo ?? []) assert.ok(c.from !== undefined && !c.octave, pid);
  setPreset("chip");
});

test("D585-D590: every changed fugue's colour plan gives its new sound and its reason, quoting the owner", () => {
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f19", "wtc1f24", "wtc2f04", "wtc2f18", "wtc2f24"]) {
    assert.equal(COLOURS[id].sound, PIECE_SOUND[id], id);
    assert.ok(/D58\d|D590/.test(COLOURS[id].soundWhy), `${id}: the decision's reason`);
    if (id !== "wtc2f04") assert.ok(COLOURS[id].soundWhy.includes("\""), `${id}: the owner's words`);
  }
});
