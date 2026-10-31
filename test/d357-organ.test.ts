/**
 * D357, PIPE ORGAN's follow-ups (the owner, after D349): the stops a row of one-touch buttons while
 * playing (TUTTI a button, the changes kept for the challenges to come); ROOM (DRY · CHURCH · CATHEDRAL);
 * the plenum's bass that cut out at the start (the recorded pedal's speech, its early release, its
 * missing 16'); a more convincing Trompete.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { FakeAudioContext, FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, voicing } from "../src/touch/chip.ts";
import { PATCHES, setPreset } from "../src/touch/sound.ts";
import { SAMPLED, SPEAK_MAX, speakFrom, speechOf } from "../src/touch/sampled.ts";
import { clearStopChanges, cueMet, DEFAULT_REG, onLiveRegistration, organPatch, PEDAL_PLENO_8, pedalPatch, recordStopChange, setLiveRegistration, stopChanges, type StopChange } from "../src/touch/registration.ts";
import { DEFAULT_ROOM, liveRoom, nextRoom, resetRoom, ROOM_KEY, ROOMS, setRoom } from "../src/touch/room.ts";

register("./tsx-hooks.mjs", import.meta.url);

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };

const ctxOf = installFakeAudio(0, true);
/** Every recording "decodes" to a pipe that takes 100 ms to speak (a linear rise), then holds for 2 s. */
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const sr = this.sampleRate;
  const b = this.createBuffer(1, Math.floor(2.2 * sr), sr);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.min(1, i / (0.1 * sr)) * 0.5 * Math.sin((2 * Math.PI * 220 * i) / sr);
  return Promise.resolve(b);
} as never;

const O = "chamberOrgan";
const of = (made: FakeNode[], kind: string) => made.filter((n) => n.kind === kind);
const type = (n: FakeNode) => (n as unknown as { type: string }).type;

test("D357: a recording's speech measured (the time to half its steady level)", () => {
  const sr = 48000;
  const d = new Float32Array(2 * sr);
  for (let i = 0; i < d.length; i++) d[i] = Math.min(1, i / (0.1 * sr)) * Math.sin((2 * Math.PI * 220 * i) / sr);
  const s = speechOf(d, sr, 0);
  assert.ok(s > 0.04 && s < 0.06, `${s}`);
  // Only the organ's recorded pipes enter their speech; at most SPEAK_MAX in.
  assert.equal(speakFrom(SAMPLED.organ, { buffer: null as never, onset: 0, speech: 0.1 }), 0);
  assert.ok(Math.abs(speakFrom(SAMPLED.organPedal, { buffer: null as never, onset: 0, speech: 0.1 }) - 0.08) < 1e-9);
  assert.equal(speakFrom(SAMPLED.organPleno, { buffer: null as never, onset: 0, speech: 0.5 }), SPEAK_MAX);
});

test("D357: the plenum's pedal: a short detached note speaks (its recording entered near its speech, let go at its written end) over its 16'", async () => {
  setPreset(O);
  setLiveRegistration(O, { stops: ["principal", "mixture"], tutti: true });
  const chip = new Chip();
  await chip.prepare([41, 48, 53, 55, 60], []);
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  // I/2's bass: a sixteenth held 0.11 s, detached by the reading (Play.apart).
  chip.note(53, 1, 0.11, voicing(2, 3), { apart: true });
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  setLiveRegistration(O, DEFAULT_REG);
  // (The chiff's noise is a buffer too: the recording is the long one.)
  const rec = made.filter((n): n is FakeSource => n instanceof FakeSource && n.kind === "buffer" && ((n.buffer as { duration?: number } | undefined)?.duration ?? 0) > 2);
  assert.equal(rec.length, 1, "the recorded pedal");
  assert.ok(rec[0].offset > 0.025 && rec[0].offset < 0.04, `entered ${rec[0].offset} s in (speech about 0.05 s, 20 ms of it kept)`);
  // Not let go 30 ms in (D304's detached release, kept for the other recorded sounds): its level held to the written end.
  const lets = of(made, "gain").flatMap((g) => (g.gain as FakeParam).events.filter((e) => e.type === "target" && e.v === 0).map((e) => e.t));
  // (The chiffs' noise fades within a few ms: the release D304 gave a detached recording began 30 ms in.)
  assert.ok(lets.some((x) => x >= 1 + 0.11 - 0.011), "let go at its end");
  assert.ok(!lets.some((x) => x > 1.02 && x < 1.09), `let go early: ${lets}`);
  // The Subbass 16' under it, an octave below (synthesized: the recordings sound at 8').
  const f = of(made, "oscillator").map((o) => (o.frequency as FakeParam).value);
  const hz = 440 * 2 ** ((53 - 12 - 69) / 12);
  assert.ok(f.some((x) => Math.abs(x / hz - 1) < 0.02), `${f.map((x) => x.toFixed(1))}`);
  // Its 16' pushed in by the player, none.
  assert.equal(pedalPatch(["principal", "mixture"], false), PEDAL_PLENO_8);
  assert.equal(PEDAL_PLENO_8.under, undefined);
  assert.ok(PATCHES.orgPedalPleno.under && !PATCHES.orgPedalPleno.osc.some((o) => (o.octave ?? 0) < 0), "the 16' once, under the recording");
});

test("D357: ROOM: CHURCH is D349's church (the default); DRY shorter and less sent; CATHEDRAL longer, more sent, its send high-passed higher; kept on the device", () => {
  const c = ROOMS.church;
  const old = REVERBS.cathedral;
  assert.deepEqual([c.rt60, c.phoneRt60, c.seconds, c.phoneSeconds, c.hp, c.send], [old.rt60, old.phoneRt60, old.seconds, old.phoneSeconds, old.hp, 1]);
  assert.ok(ROOMS.dry.rt60 < c.rt60 && ROOMS.dry.phoneRt60 < c.phoneRt60 && ROOMS.dry.send < 1);
  assert.ok(ROOMS.cathedral.rt60 > c.rt60 && ROOMS.cathedral.phoneRt60 > c.phoneRt60 && ROOMS.cathedral.send > 1);
  // More room never swamps the pedal: the longer the room, the higher its send's high-pass (higher still on a phone).
  assert.ok(ROOMS.cathedral.hp > c.hp && ROOMS.cathedral.phoneHp > ROOMS.cathedral.hp);
  store.clear();
  resetRoom();
  assert.equal(liveRoom(), DEFAULT_ROOM);
  assert.equal(DEFAULT_ROOM, "church");
  assert.deepEqual([nextRoom("dry"), nextRoom("church"), nextRoom("cathedral")], ["church", "cathedral", "dry"]);
  setRoom("cathedral");
  resetRoom();
  assert.equal(liveRoom(), "cathedral", "kept");
  store.set(ROOM_KEY, "bogus");
  resetRoom();
  assert.equal(liveRoom(), "church");
});

test("D357: the organ's church built from the ROOM in force; another room from the next note (the old tail rings out)", () => {
  store.clear();
  resetRoom();
  setPreset(O);
  const chip = new Chip();
  const ctx = ctxOf();
  const built = () => [...ctx.nodes].filter((n) => n.kind === "convolver").length;
  const hps = () => [...ctx.nodes].filter((n) => n.kind === "filter" && type(n) === "highpass").map((n) => (n.frequency as FakeParam).value);
  chip.note(64, 0.1, 0.3, voicing(0, 3));
  const one = built();
  assert.ok(one >= 1);
  assert.ok(hps().includes(ROOMS.church.hp));
  setRoom("cathedral");
  chip.note(64, 0.5, 0.3, voicing(0, 3));
  assert.equal(built(), one + 1, "the cathedral built beside the church's ringing tail");
  assert.ok(hps().includes(ROOMS.cathedral.hp));
  setRoom("church");
  store.clear();
  resetRoom();
});

test("D357: the Trompete: a reed's speech and body, its level kept; carried into the chorus by its share", async () => {
  const t = PATCHES.orgTrompete;
  assert.ok(t.reed, "a reed");
  assert.equal(t.vib, undefined, "steady: no vibrato");
  assert.equal(t.level, 0.3, "not louder");
  assert.ok(t.reed.formant >= 1000 && t.reed.formant <= 2000, "the formant between 1 and 2 kHz");
  assert.ok(t.reed.compass.low > 0 && t.reed.compass.high < 0, "fuller low, thinner high");
  setPreset(O);
  setLiveRegistration(O, { stops: ["reed"], tutti: true });
  const strike = (midi: number) => {
    const chip = new Chip();
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(midi, 1, 1, voicing(0, 3));
    return [...ctx.nodes].filter((x) => !before.has(x));
  };
  const low = strike(40);
  const high = strike(84);
  setLiveRegistration(O, DEFAULT_REG);
  const shelf = (made: FakeNode[]) => (of(made, "filter").find((f) => type(f) === "lowshelf")!.gain as FakeParam).value;
  assert.ok(shelf(low) > 1 && shelf(high) < -3, `${shelf(low)} ${shelf(high)}`);
  assert.ok(of(low, "filter").some((f) => type(f) === "peaking" && (f.frequency as FakeParam).value === t.reed!.formant), "the formant");
  // The tongue's rattle: a square LFO on the level, stopped within the attack; the pitch speaking flat.
  const lfo = of(low, "oscillator").find((o) => (o as unknown as { type: string }).type === "square") as FakeSource | undefined;
  assert.ok(lfo && lfo.stopAt <= 1 + 0.1, "the rattle, gone within the attack");
  const det = of(low, "oscillator").map((o) => (o.detune as FakeParam).events[0]?.v ?? 0);
  assert.ok(det.some((d) => d <= -t.reed!.bloom.cents + 1), "the bloom");
  // With the Principal: the reed's character carried at its share.
  const pr = organPatch(PATCHES.orgPrincipal, ["principal", "reed"], 64);
  assert.ok(pr.reed && Math.abs(pr.reed.share! - 0.5) < 1e-9);
  assert.equal(organPatch(PATCHES.orgPrincipal, ["principal"], 64).reed, undefined);
});

test("D357: the stop changes kept for the run (a challenge's 'draw X at bar N'); a change made elsewhere told", () => {
  clearStopChanges();
  const r = { stops: ["principal", "reed"] as never, tutti: false };
  const c = (bar: number, stop: StopChange["stop"], drawn: boolean): StopChange => ({ bar, stop, drawn, reg: r });
  recordStopChange(c(3, "reed", true));
  recordStopChange(c(9, "reed", false));
  recordStopChange(c(12, "tutti", true));
  assert.equal(stopChanges().length, 3);
  assert.ok(cueMet({ bar: 3, stop: "reed", drawn: true }));
  assert.ok(cueMet({ bar: 5, stop: "reed", drawn: true, early: 2 }));
  assert.ok(!cueMet({ bar: 5, stop: "reed", drawn: true }), "made two bars early, the cue asked for bar 5 exactly");
  assert.ok(cueMet({ bar: 9, stop: "reed", drawn: false }));
  assert.ok(!cueMet({ bar: 10, stop: "mixture", drawn: true }));
  assert.ok(cueMet({ bar: 12, stop: "tutti", drawn: true }));
  clearStopChanges();
  assert.equal(stopChanges().length, 0);
  const seen: string[] = [];
  const off = onLiveRegistration((id, reg) => seen.push(`${id}:${reg.stops?.join("+")}`));
  setLiveRegistration(O, { stops: ["flute"], tutti: true });
  off();
  setLiveRegistration(O, DEFAULT_REG);
  assert.deepEqual(seen, [`${O}:flute`]);
});

test("D357: the stop row: one-touch buttons (no fold, no long press), TUTTI and ROOM buttons, shown while playing for the friends too", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  // The server renderer's note that layout effects do not run there: expected, not shown.
  const err = console.error;
  console.error = (...a: unknown[]) => void (String(a[0]).includes("useLayoutEffect") || err(...a));
  const { RegistrationStops } = await import("../src/touch/RegistrationStops.tsx");
  const organ = renderToStaticMarkup(React.createElement(RegistrationStops, { presetId: O, patch: PATCHES.orgPrincipal, piece: "wtc1f02" }));
  for (const id of ["stop-flute", "stop-principal", "stop-reed", "stop-mixture", "stop-trem", "stop-tutti", "stop-room"]) assert.match(organ, new RegExp(`id="${id}"`), id);
  assert.match(organ, /id="stop-principal"[^>]*aria-pressed="true"/);
  assert.match(organ, /id="stop-reed"[^>]*aria-pressed="false"/);
  assert.doesNotMatch(organ, /id="stops"|stops-pop|HOLD/);
  const harpsi = renderToStaticMarkup(React.createElement(RegistrationStops, { presetId: "harpsichordSampled", patch: PATCHES.harpsiSampled, piece: "wtc1f02" }));
  assert.match(harpsi, /id="stop-unison"/);
  assert.match(harpsi, /id="stop-tutti"/);
  assert.doesNotMatch(harpsi, /id="stop-room"/, "ROOM for the organ");
  const src = readFileSync(new URL("../src/touch/RegistrationStops.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /setTimeout\([^)]*TUTTI|onPointerDown/, "no long press");
  const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  // D369: the condition kept (stopsOn); on the two bars the row moves to the bars' feet (test/d369-owner-fixes.test.ts).
  // D400: in the tutorial only from THE REAL THING on (its dressing), never in an older lesson.
  assert.match(app, /const stopsOn = hasStops\(presetById\(soundNow\)\.id\) && !lesson && \(!man \|\| !!dressNow\?\.includes\("stops"\)\) && \(full \|\| playing\);/);
  assert.match(app, /\{stopsOn && layout !== "bars" && <RegistrationStops/);
});
