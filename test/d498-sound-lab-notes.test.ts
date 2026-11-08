/**
 * D498, THE SOUND LAB: the summary of what happens where (form, D513/D514, Busoni, the colour plan), following the sound
 * and the drums chosen; the notes sent as a GitHub issue.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { summaryLine, summaryOf } from "../src/bench/soundlab/summary.ts";
import { issueUrl, MAX_NOTE, noteBody, REPO } from "../src/bench/soundlab/notes.ts";
import { defaults } from "../src/bench/soundlab/lab-state.ts";
import { FUGUES, soundOf } from "../src/bench/soundlab/lab-engine.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { formOf } from "../src/touch/form-points.ts";
import { loadColours } from "../src/touch/colour.ts";

test("D498: the summary of all 48, in bar order, the form's seams and the last chord in it", () => {
  for (const id of FUGUES) {
    const f = fugueById(id);
    const s = defaults(id);
    const items = summaryOf(f, s, soundOf(s));
    assert.ok(items.length >= formOf(f).seams.filter((x) => x.end > x.on).length, id);
    assert.ok(items.every((x, i) => i === 0 || x.bar >= items[i - 1].bar), `${id} in order`);
    assert.ok(items.some((x) => x.text.startsWith("exposition")), id);
    assert.ok(items.at(-1)!.text.startsWith("last chord"), id);
    assert.ok(items.every((x) => x.bar >= 1 && x.bar <= (f.bars.at(-1)?.n ?? 999)), id);
  }
});

test("D498: the summary follows the drums, the layers and the sound", async () => {
  await loadColours();
  const f = fugueById("wtc1f12");
  const s = defaults("wtc1f12");
  const off = summaryLine(summaryOf(f, s, "vocalSynth"));
  assert.ok(!off.includes("ELECTRO"));
  assert.match(off, /episode \(band lighter, darker\)/);
  assert.match(off, /Busoni p/);
  // D526: the drums 1 2 3 are the sound's HOME and its family (VOCAL SYNTH: HOUSE 909, LINNDRUM, TECHNO).
  const on = summaryLine(summaryOf(f, { ...s, drums: 1 }, "vocalSynth"));
  assert.match(on, /HOUSE 909 rolls in/);
  assert.match(on, /HOUSE 909 break/);
  assert.match(on, /HOUSE 909 flourish/);
  assert.match(summaryLine(summaryOf(f, { ...s, drums: 3 }, "vocalSynth")), /TECHNO/);
  // The layer off: no band colour; Busoni off: his marks gone and the colour plan heard.
  assert.ok(!summaryLine(summaryOf(f, { ...s, form: false }, "vocalSynth")).includes("band lighter"));
  const nob = summaryLine(summaryOf(f, { ...s, busoni: false }, "vocalSynth"));
  assert.ok(!nob.includes("Busoni"));
  assert.match(nob, /colour: darker/);
  // The organ's registration by the form.
  assert.match(summaryLine(summaryOf(f, s, "chamberOrgan")), /flutes/);
});

test("D498: the notes sent as a new issue in the repository, pre-filled", () => {
  const body = noteBody("Too dark at b.16 & loud?", "VOCAL SYNTH · drums OFF", "https://x/soundlab.html#wtc1f12?bar=16");
  const u = new URL(issueUrl("I/12 The Requiem", body));
  assert.equal(u.origin + u.pathname, `https://github.com/${REPO}/issues/new`);
  assert.equal(u.searchParams.get("title"), "Sound Lab notes: I/12 The Requiem");
  assert.equal(u.searchParams.get("body"), body);
  assert.match(body, /^Too dark at b\.16 & loud\?\n\n---\nSettings: VOCAL SYNTH · drums OFF\nMoment: https:\/\/x\/soundlab\.html#wtc1f12\?bar=16/);
  assert.ok(noteBody("x".repeat(MAX_NOTE + 100), "", "").includes("[note cut"));
});
