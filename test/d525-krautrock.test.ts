/**
 * D525: KRAUTROCK, ONE OF THE GAME'S SOUNDS (the owner: "motorik drums, hypnotic and constant, electric bass, psychedelic
 * guitar with a slight delay that isn't protagonist, keyboard (Can, Tago Mago; Neu!, 'Hallogallo')"): the piano, the
 * echoed guitar, the combo organ and the picked bass one to a voice (the echo an effect, no note added), one dry room;
 * and THE MOTORIK BEAT (rock-drums.ts): steady through the whole fugue, no roll anywhere, the form only felt (an open
 * hi-hat before an entry, quieter episodes, the hat alone in the bar before the final entry), on the game's clock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { BAND_ECHO, Chip, REVERBS, type GrooveContext } from "../src/touch/chip.ts";
import { DYNAMIC_SOUNDS, KRAUTROCK_CREDIT, PATCHES, PRESETS, creditFor, grooveNow, offered, presetById, setPreset } from "../src/touch/sound.ts";
import { DRIFT, MOTORIK_DOUBLE_FROM_S, formOf, rockBeat } from "../src/touch/rock-drums.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";

installFakeAudio(0, true);
const of = (id: string) => {
  const f = fugueById(id);
  return { f, beat: f.barTicks / Number(f.meter.split("/")[0]) };
};

test("D525: KRAUTROCK offered, one instrument a voice, the guitar's echo an effect and behind the piano", () => {
  const p = presetById("krautrock");
  assert.equal(p.id, "krautrock");
  assert.ok(offered("krautrock"));
  assert.equal(p.groove, "motorik");
  assert.equal(p.kit, "rock");
  assert.equal(p.fx, "inner");
  assert.ok(REVERBS.inner.rt60 < REVERBS.studio.rt60, "a drier room than ABBEY ROAD's");
  for (const n of [1, 2, 3, 4, 5] as const) assert.equal(p.by?.[n]?.length, n);
  assert.deepEqual(p.by?.[4]?.map(([id]) => id), ["krPiano", "krGuitar", "krOrgan", "krBass"]);
  assert.ok(PATCHES.krGuitar.echo && PATCHES.krGuitar.echo > 0 && PATCHES.krGuitar.echo < 0.6, "a slight delay");
  assert.ok(PATCHES.krGuitar.level * 2.2 < PATCHES.krPiano.level * 3.8 * 1.5, "the guitar not the protagonist");
  for (const id of ["krPiano", "krOrgan", "krBass"] as const) assert.equal(PATCHES[id].echo, undefined, id);
  assert.ok(BAND_ECHO.feedback < 0.4 && BAND_ECHO.beats === 0.75);
  assert.ok(PATCHES.krBass.phoneLift, "the bass lifted on a phone");
  assert.ok(DYNAMIC_SOUNDS.has("krautrock"));
  assert.equal(TOUCH_KINDS.krautrock, "jazz");
  assert.equal(creditFor("krautrock"), KRAUTROCK_CREDIT);
});

test("D525: the motorik beat: constant, no roll, the kick and the snare on every bar, the form only felt", () => {
  const { f, beat } = of("wtc1f20");
  const form = formOf(f, beat, "motorik");
  const toms = (hs: { piece: string }[]) => hs.some((h) => h.piece.startsWith("tom"));
  let kicks = 0;
  for (let t = 0; t < form.finalAt; t += beat) {
    const b = Math.round((t % f.barTicks) / beat);
    const hs = rockBeat("motorik", b, 4, false, t, beat, 0.857, form, 0);
    assert.ok(!toms(hs), `no tom roll at ${t}`);
    assert.ok(hs.some((h) => h.piece === "hat" || h.piece === "openhat"), `the hat never stops (${t})`);
    if (hs.some((h) => h.piece === "kick")) kicks++;
  }
  const brk = form.moments.find((m) => m.kind === "break")!;
  assert.ok(brk, "a break before the final entry");
  const inBreak = rockBeat("motorik", 0, 4, false, brk.from, beat, 0.857, form, 0);
  assert.ok(inBreak.every((h) => h.piece === "hat" || h.piece === "openhat"), "the break: the hat alone");
  const bars = Math.round(form.finalAt / f.barTicks);
  assert.ok(kicks >= (bars - 2) * 4 * 0.95, "the kick on every beat under a slow beat");
  // Under a slow beat the motorik bar spans two of the fugue's beats (its quaver the drummer's crotchet).
  const t0 = form.intro + 30 * f.barTicks;
  const slow = rockBeat("motorik", 1, 4, false, t0 + beat, beat, MOTORIK_DOUBLE_FROM_S + 0.1, form);
  assert.equal(slow.filter((h) => h.piece === "hat" || h.piece === "openhat").length, 4);
  assert.ok(slow.some((h) => h.piece === "snare" && h.at === 0.5));
  // The episodes only a little quieter.
  assert.ok(DRIFT > 0.8 && DRIFT < 1);
  // An open hat on the last eighth before an entry that follows a fill moment.
  const fill = form.moments.find((m) => m.kind === "fill" && m.at > beat * 8)!;
  const before = rockBeat("motorik", 3, 4, false, fill.at - beat, beat, 0.857, form);
  assert.ok(before.some((h) => h.piece === "openhat"));
  // The end: the crash and the kick on the last chord, then nothing.
  assert.ok(rockBeat("motorik", 0, 4, false, form.finalAt, beat, 0.857, form).some((h) => h.piece === "crash"));
  assert.deepEqual(rockBeat("motorik", 0, 4, false, form.finalAt + 2 * beat, beat, 0.857, form), []);
  for (const g of FUGUES) {
    const bt = g.barTicks / Number(g.meter.split("/")[0]);
    const fm = formOf(g, bt, "motorik");
    for (const per of [2, 3, 4]) for (let b = 0; b < per; b++) for (const h of rockBeat("motorik", b, per, false, fm.intro + 4 * g.barTicks, bt, 0.5, fm)) assert.ok(h.at >= 0 && h.at < 1 && h.vel > 0 && h.vel <= 1 && !h.piece.startsWith("tom"), g.id);
  }
});

test("D525: the chip plays the motorik kit for KRAUTROCK", () => {
  const chip = new Chip();
  setPreset("krautrock");
  assert.equal(grooveNow()?.kit, "rock");
  const { f, beat } = of("wtc1f20");
  const cx: GrooveContext = { tick: 20 * f.barTicks + beat, beat, fills: [], end: f.length, piece: f };
  const t0 = (chip as unknown as { ctx: { currentTime: number } }).ctx.currentTime + 1;
  const n0 = chip.rockLog.length;
  assert.equal(chip.groove(t0, 0.857, 1, 20, 4, false, cx), true);
  const log = chip.rockLog.slice(n0);
  assert.ok(log.some((l) => l.piece === "kick") && log.some((l) => l.piece === "snare"));
  assert.ok(log.every((l) => l.at >= t0 && l.at < t0 + 0.857));
  setPreset("chip");
  for (const p of PRESETS) assert.equal(p.groove === "motorik", p.id === "krautrock", p.id);
});

test("D525: I/20 opens on KRAUTROCK, with its reason", () => {
  assert.equal(PIECE_SOUND.wtc1f20, "krautrock");
  assert.equal(COLOURS.wtc1f20.sound, "krautrock");
  assert.match(COLOURS.wtc1f20.soundWhy ?? "", /D525/);
});
