import { test } from "node:test";
import assert from "node:assert/strict";
import { applyStyle, STYLES } from "../src/audio/styles.ts";
import { DEFAULT_SOUND } from "../src/audio/sound.ts";
import { DEFAULT_DRUMS } from "../src/audio/drums.ts";

const now = { sound: DEFAULT_SOUND, drumsOn: false, drumKit: DEFAULT_DRUMS, continuoOn: false, continuo: { preset: "cembalo" as const, figuration: "alberti" as const, figure: false }, tuning: "equal" as const, tempo: 60 };

test("styles: every style sets every track", () => {
  for (const id of STYLES) {
    const s = applyStyle(id, now, true);
    assert.ok(s.sound.synth.cantus.preset && s.sound.synth.counterpoint.preset, id);
    assert.deepEqual(s.sound.synth.fux, s.sound.synth.counterpoint, `${id}: Fux sounds like the player's line`);
    assert.ok(Object.values(s.sound.versionFollows).every(Boolean), id);
  }
});

test("styles: Glenn Gould is the grand alone; techno arpeggiates the pads over a 909", () => {
  const g = applyStyle("gould", now, true);
  assert.equal(g.sound.synth.cantus.preset, "grand");
  assert.equal(g.drumsOn, false);
  assert.equal(g.continuoOn, false);
  const tk = applyStyle("techno", now, false);
  assert.equal(tk.drumKit.pattern, "techno");
  assert.deepEqual([tk.continuo.preset, tk.continuo.figure, tk.continuo.figuration], ["analogPads", true, "arpUp"]);
});

test("styles: the upper and lower sound follow where the cantus lies", () => {
  const b = applyStyle("baroque", now, false);
  assert.equal(b.sound.synth.cantus.preset, "celloSampled");
  assert.equal(b.sound.synth.counterpoint.preset, "violinSampled");
  assert.equal(applyStyle("baroque", now, true).sound.synth.cantus.preset, "violinSampled");
});
