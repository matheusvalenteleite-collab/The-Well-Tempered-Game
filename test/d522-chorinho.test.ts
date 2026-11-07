/**
 * D522: CHORINHO, ONE OF THE GAME'S SOUNDS: Bach's voices one instrument each (the flute on top, the clarinet second in
 * five voices, the cavaquinho in four and five, the grand on a middle voice, the seven-string guitar on Bach's bass),
 * nothing added to his notes; the regional's unpitched percussion (the pandeiro, the surdo, the tamborim, the agogo, the
 * ganza: VCSL, CC0, D520's kit) on the game's clock, read from the fugue's form; never the score, never with another sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { Chip, type GrooveContext } from "../src/touch/chip.ts";
import { CHORINHO_CREDIT, DYNAMIC_SOUNDS, PATCHES, creditFor, grooveNow, presetById, setPreset } from "../src/touch/sound.ts";
import { SAMPLED, latinMidis } from "../src/touch/sampled.ts";
import { TOUCH_KINDS, bandFamily, holdMode } from "../src/touch/touch-expr.ts";
import { GROOVES, LATIN_SCRIPTS, LATIN_SOUNDS, inEntry, latinBeat, latinPlan } from "../src/touch/latin-drums.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { slideFamily } from "../src/bench/slide-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 1 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const CHORO = presetById("chorinho");
const planOf = (id: string) => {
  const f = fugueById(id);
  const { ticks, perBar } = beatOf(f);
  return { f, beat: ticks, plan: latinPlan(f, ticks, perBar) };
};

test("D522: offered, one instrument a voice, the seven-string on Bach's bass", () => {
  assert.equal(CHORO.name, "CHORINHO");
  assert.ok(POP_SOUNDS.some(([id]) => id === "chorinho"));
  assert.ok(SOUND_GROUPS.some(([, ids]) => ids.includes("chorinho")));
  assert.equal(CHORO.groove, "choroBand");
  assert.equal(CHORO.kit, "latin");
  for (let n = 1; n <= 5; n++) assert.equal(CHORO.by?.[n]?.length, n, `${n} voices, ${n} instruments`);
  assert.deepEqual(CHORO.by?.[3]?.map(([p]) => p), ["choFlute", "choPiano", "cho7"]);
  assert.deepEqual(CHORO.by?.[5]?.map(([p]) => p), ["choFlute", "choClarinet", "choCavaco", "choPiano", "cho7"]);
  for (let n = 2; n <= 5; n++) assert.equal(CHORO.by?.[n]?.at(-1)?.[0], "cho7", `${n}: the bass the seven-string's`);
  assert.equal(PATCHES.cho7.sample, "choroGuitar");
  assert.equal(SAMPLED.choroGuitar.plucked, true);
  assert.ok(DYNAMIC_SOUNDS.has("chorinho"));
  assert.equal(creditFor("chorinho"), CHORINHO_CREDIT);
  assert.equal(TOUCH_KINDS.chorinho, "band");
  assert.equal(PT.CHORINHO, "CHORINHO");
  assert.equal(ES.CHORINHO, "CHORINHO");
});

test("D522: the touch and the slide each instrument's own", () => {
  assert.equal(bandFamily(PATCHES.choFlute), "winds");
  assert.equal(bandFamily(PATCHES.choClarinet), "winds");
  assert.equal(bandFamily(PATCHES.cho7), "jazz");
  assert.equal(bandFamily(PATCHES.choPiano), "piano");
  assert.equal(holdMode("band", PATCHES.choFlute, false), "breath");
  assert.equal(slideFamily("chorinho", PATCHES.choFlute), "flute");
  assert.equal(slideFamily("chorinho", PATCHES.choClarinet), "reed");
  assert.equal(slideFamily("chorinho", PATCHES.cho7), "plucked");
});

test("D522: II/1 opens on CHORINHO: samba's sixteen pulses over two bars of 2/4, its script on the entries", () => {
  assert.equal(PIECE_SOUND.wtc2f01, "chorinho");
  assert.equal(COLOURS.wtc2f01.sound, "chorinho");
  assert.equal(LATIN_SOUNDS.chorinho, "chorinho");
  const { f, plan } = planOf("wtc2f01");
  assert.equal(plan.ternary, false);
  assert.equal(plan.pulse, f.tpq / 4);
  assert.equal(plan.cycle, 16);
  const ents = f.entries.map((e) => e.on);
  assert.equal(plan.fills.length, LATIN_SCRIPTS.wtc2f01.length);
  for (const m of plan.fills.filter((x) => x.kind !== "final")) assert.ok(ents.includes(m.at), m.why);
  assert.equal(plan.fills.find((x) => x.kind === "break")?.at, Math.max(...ents));
  // The surdo's accent on the second beat; the pandeiro on every pulse.
  const full = GROOVES.chorinho[16].full;
  assert.ok(full.some(([p, ps, v]) => p === "surdo" && ps.includes(4) && v > 0.5));
  const pand = new Set(full.filter(([p]) => p.startsWith("pand")).flatMap(([, ps]) => ps));
  assert.equal(pand.size, 16);
  assert.equal(latinMidis("chorinho").length, 21);
});

test("D522: full under an entry (tamborim, agogo), quieter in an episode (the ganza); the break and the final", () => {
  const { f, plan, beat } = planOf("wtc2f01");
  const on3 = f.bars.find((b) => b.n === 3)!.on;
  const on17 = f.bars.find((b) => b.n === 17)!.on;
  assert.ok(inEntry(plan, on3) && !inEntry(plan, on17));
  assert.ok(latinBeat("chorinho", plan, on3, beat).some((h) => h.piece === "tamborim"));
  assert.ok(latinBeat("chorinho", plan, on17, beat).some((h) => h.piece === "ganza"));
  assert.ok(!latinBeat("chorinho", plan, on17, beat).some((h) => h.piece === "tamborim"));
  const brk = plan.fills.find((x) => x.kind === "break")!;
  assert.equal(latinBeat("chorinho", plan, brk.from, beat).filter((h) => h.at * beat < brk.at - brk.from - 1).length, 0);
  const fin = plan.fills.find((x) => x.kind === "final")!;
  assert.ok(latinBeat("chorinho", plan, fin.at, beat).some((h) => h.piece === "surdo"));
  assert.equal(latinBeat("chorinho", plan, fin.at + beat, beat).length, 0);
});

test("D522: the chip plays the regional's percussion with this sound only", async () => {
  setPreset("chorinho");
  assert.deepEqual(grooveNow(), { groove: "choroBand", kit: "latin" });
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  await new Promise((r) => setTimeout(r, 20));
  const { f, plan, beat } = planOf("wtc2f01");
  const cx: GrooveContext = { tick: f.bars.find((b) => b.n === 3)!.on, beat, fills: [], end: f.length, latin: plan };
  const n0 = chip.latinLog.length;
  assert.equal(chip.groove(chip.ctx.currentTime + 0.1, 0.72, 0, 2, 2, false, cx), true);
  assert.ok(chip.latinLog.slice(n0).some((l) => l.piece.startsWith("pand")));
  setPreset("chip");
});
