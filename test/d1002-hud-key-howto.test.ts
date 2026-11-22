/**
 * D1002 (design studio): the header's key never stale: React state set whenever the frame's key changes (the frame loop, a
 * new preview), not frame.current read only when something else re-renders. D1003: HOW TO PLAY in step with the game
 * (Act VI's GAME BOY and PSYCH, the morphs and CANONS & FUGUES, the DRUMS knobs, the ● ○), en/pt/es alike.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLAY, REF } from "../src/bench/howto-text.ts";

const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");

test("D1002: the header reads the key from state; every new frame sets it (the loop, the preview)", () => {
  assert.match(app, /keyWordsIn\(bStage \? f\.key : hudKey\) : keyName\(bStage \? f\.key : hudKey\)/);
  assert.doesNotMatch(app, /keyName\(bStage \? f\.key : frame\.current\.key\)/);
  assert.equal((app.match(/keyShown\(frame\.current\.key\)/g) ?? []).length, 2);
  // In the frame loop, straight after the frame is built.
  const loop = app.slice(app.indexOf("key: bStage ? f.key : g.keyNow(),"));
  assert.ok(loop.indexOf("keyShown(frame.current.key)") < 2500);
});

test("D1003: the guide in step: PSYCH's real band, the stations' drums, the morphs' setting, the two DRUMS knobs, the dots; three languages", () => {
  const card = (id: string) => PLAY.flatMap((c) => c.cards).find((c) => c.id === id)!;
  const psych = card("psych");
  for (const t of [psych.lead[0].en, psych.fine!.en]) assert.doesNotMatch(t, /piano by its weight|organ holds/);
  assert.match(psych.lead[0].en, /Mellotron, synthesizer, clean and fuzz guitars, Moog bass/);
  assert.match(psych.fine!.en, /LIEBEZEIT/);
  assert.match(card("gameboy").fine!.en, /CHIP KIT/);
  assert.match(card("two").fine!.en, /filled, the thumb you start with; hollow, the other/);
  const ref = (id: string) => REF.find((r) => r.id === id)!.lines[0];
  assert.match(ref("flags").en, /CANONS & FUGUES on MORPH/);
  assert.match(ref("flags").pt, /CÂNONES E FUGAS em ANIMADOS/);
  assert.match(ref("flags").es, /CÁNONES Y FUGAS en ANIMADOS/);
  assert.match(ref("sound").en, /one knob turns it ON or OFF, the other shows its style \(HOME/);
  assert.match(ref("settings").en, /CANONS & FUGUES \(MORPH or OFF/);
  // No retired feature named; no developer-only control.
  const all = JSON.stringify([PLAY, REF]);
  assert.doesNotMatch(all, /TWO HANDS|PRELUDE\/FUGUE|ECHO LANE/i);
  for (const c of PLAY.flatMap((x) => x.cards)) for (const t of [...c.lead, ...(c.fine ? [c.fine] : [])]) assert.ok(t.en && t.pt && t.es && t.pt !== t.en && t.es !== t.en, c.id);
});
