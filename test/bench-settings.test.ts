/** D219: the bench's folded settings (TUNING, LAB) and the computer HIGHWAY's drawn home row. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseTuning, HOME_ROW, LAB_ROWS, labLabel, temperName, toggleLab, tuningLabel } from "../src/bench/settings-logic.ts";
import { LAB_DEFAULT } from "../src/touch/subject-fx.ts";
import { TEMPERAMENTS } from "../src/touch/tuning.ts";
import { presetById } from "../src/touch/sound.ts";

test("D219, TUNING: one button shows the choice; any choice applies and closes the panel", () => {
  assert.equal(tuningLabel("equal", 440), "TUNING · EQUAL · A440");
  assert.equal(tuningLabel("werckmeister", 415), "TUNING · WERCKMEISTER III · A415");
  assert.equal(temperName("lehman"), "LEHMAN");
  assert.equal(temperName("nonsense"), "EQUAL");
  const cur = { id: "equal", a: 440 };
  assert.deepEqual(chooseTuning(cur, { temper: "vallotti" }), { id: "vallotti", a: 440, open: false });
  assert.deepEqual(chooseTuning(cur, { a: 415 }), { id: "equal", a: 415, open: false });
  // An unknown choice changes nothing, but still closes.
  assert.deepEqual(chooseTuning(cur, { temper: "nope" }), { id: "equal", a: 440, open: false });
  assert.deepEqual(chooseTuning(cur, { a: 432 }), { id: "equal", a: 440, open: false });
  for (const t of TEMPERAMENTS) assert.equal(chooseTuning(cur, { temper: t.id }).id, t.id);
});

test("D219, LAB: one button shows what is on; each switch has a one-line explanation and flips alone", () => {
  assert.deepEqual(LAB_ROWS.map(([k]) => k).sort(), Object.keys(LAB_DEFAULT).sort(), "every switch listed");
  for (const [, name, what] of LAB_ROWS) {
    assert.ok(what.length > 10 && what.length <= 90 && !what.includes("\n"), name);
    assert.ok(what.endsWith("."), name);
  }
  assert.equal(labLabel(LAB_DEFAULT), "LAB · SUBJECT SOUND + EFFECT");
  const off = { subject: false, effect: false, vibrato: false, stereo: false };
  assert.equal(labLabel(off), "LAB · ALL OFF");
  const v = toggleLab(off, "vibrato");
  assert.deepEqual(v, { ...off, vibrato: true });
  assert.deepEqual(off.vibrato, false, "not changed in place");
  assert.deepEqual(toggleLab(v, "vibrato"), off);
});

test("D219: the computer HIGHWAY's home row as drawn: A S D F left, G shared, H J K L right; WITH KIMIKO's voice a real preset", () => {
  assert.deepEqual(HOME_ROW.map((k) => k.key).join(""), "ASDFGHJKL");
  assert.deepEqual(HOME_ROW.filter((k) => k.hand === "left").map((k) => k.key), ["A", "S", "D", "F"]);
  assert.deepEqual(HOME_ROW.filter((k) => k.hand === "both").map((k) => k.key), ["G"]);
  assert.deepEqual(HOME_ROW.filter((k) => k.hand === "right").map((k) => k.key), ["H", "J", "K", "L"]);
  const p = presetById("traverso");
  assert.equal(p.id, "traverso");
  assert.ok(!p.groove && !p.drums, "no rhythm section under her");
});
