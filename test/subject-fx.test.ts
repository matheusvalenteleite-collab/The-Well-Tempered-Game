/**
 * D213, experiment E1: the subject as protagonist, by ear: its notes brighter and crisper (a shelf, not
 * a level), the others duller during an entry, the cues strongest outside the top voice; each testbench
 * fugue's own effect (each subject of I/4 and XIV its own); the effects cheap and all released; the LAB
 * switches. On the fake context of fake-audio.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, type Play, type Voicing } from "../src/touch/chip.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { ORGAN_SAMPLED, patchFor, setPreset, type Preset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { TESTBENCH } from "../src/bench/cards.ts";
import { fxFor, GENERIC, LAB_DEFAULT, registerWeight, setLab, SubjectCues, TAILORED, type Lab } from "../src/touch/subject-fx.ts";

const ctxOf = installFakeAudio(5, true);

type Call = { midi: number; at: number; v: Voicing; p: Play };

/** A fugue played by the bench (voice `played` left to the player, who plays nothing), every chip.note logged. */
function run(piece: string, preset: string | Preset, l: Partial<Lab>, seconds: number, played = 0) {
  setPreset(preset);
  setLab(l);
  const chip = new Chip();
  const ctx = ctxOf();
  const calls: Call[] = [];
  const note = chip.note.bind(chip);
  chip.note = (midi, at, dur, v, p = {}) => (calls.push({ midi, at, v, p }), note(midi, at, dur, v, p));
  const f = fugueById(piece);
  const g = new ProtoGame(f, [played], startTick(f, 0), protoById("ladder"), { bpm: 90, legato: false, fail: false }, chip);
  const fixed = ctx.nodes.size;
  let wired = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    ctx.advance(t);
    wired = Math.max(wired, ctx.nodes.size - fixed);
    if (g.step()) break;
  }
  ctx.advance(ctx.currentTime + 12);
  setLab(LAB_DEFAULT);
  return { f, g, chip, ctx, calls, wired, left: ctx.nodes.size - fixed, made: ctx.totalMade() };
}

/** The calls that are the voices' own notes (not the effect's small layer patches). */
const own = (calls: Call[]) => calls.filter((c) => !c.v.patch || c.v.patch.level >= 0.2);

test("every testbench fugue (D221: every Book I fugue) has its own effect; each subject of I/4 and XIV its own; I/8 marks inversion and augmentation", () => {
  const all: string[] = [];
  const names: string[] = [];
  for (const id of [...TESTBENCH, ...FUGUES.filter((f) => f.book === 1).map((f) => f.id)]) assert.ok(TAILORED[id], `${id} has a tailored effect`);
  for (const t of Object.values(TAILORED))
    for (const k of [1, 2, 3, "inverted", "augmented"] as const)
      if (t[k]) {
        all.push(JSON.stringify({ ...t[k], why: "", name: "" }));
        names.push(t[k].name);
        assert.ok(t[k].why.length > 20 && t[k].layers.length > 0 && t[k].layers.length <= 2, t[k].name);
      }
  assert.equal(new Set(all).size, all.length, "no two effects alike");
  assert.equal(new Set(names).size, names.length, "no two names alike");
  for (const id of ["wtc1f04", "bwv1080-14"]) {
    const f = fugueById(id);
    const by = new Set(f.entries.map((e) => fxFor(id, { theme: e.theme ?? 1, inverted: !!e.inverted, scale: e.scale ?? 1 })));
    assert.equal(by.size, 3, `${id}: three subjects, three effects`);
  }
  assert.notEqual(fxFor("wtc1f08", { theme: 1, inverted: true, scale: 1 }), fxFor("wtc1f08", { theme: 1, inverted: false, scale: 1 }));
  assert.notEqual(fxFor("wtc1f08", { theme: 1, inverted: false, scale: 2 }), fxFor("wtc1f08", { theme: 1, inverted: false, scale: 1 }));
  // The other fugues (Book II): the gentle default.
  const others = FUGUES.filter((f) => !TAILORED[f.id]);
  assert.equal(others.length, 24);
  assert.ok(others.every((f) => f.book === 2));
  for (const f of others) assert.equal(fxFor(f.id, { theme: 1, inverted: false, scale: 1 }), GENERIC);
  // Subtle: every layer well under the instruments' own level (about 0.4), every echo and double quieter by far.
  for (const t of Object.values(TAILORED))
    for (const fx of Object.values(t))
      for (const l of fx.layers) assert.ok(l.kind === "echo" || l.kind === "halo" ? l.level <= 0.3 : l.level <= 0.08, `${fx.name}: ${l.kind} ${l.level}`);
});

test("the register's compensation: an entry in the top voice gets the slightest cues", () => {
  assert.ok(registerWeight(0, 4) < 0.5);
  assert.equal(registerWeight(1, 4), 1);
  assert.equal(registerWeight(3, 4), 1);
  assert.equal(registerWeight(1, 2), 1);
});

test("in the game (SUBJECT SOUND on; D293: off by default): the subject brighter and crisper, the others duller during an entry, nothing outside the entries", () => {
  const r = run("wtc1f02", "harpsichordSampled", { subject: true }, 40, 0);
  const plain = run("wtc1f02", "harpsichordSampled", { subject: false, effect: false }, 40, 0);
  const cues = new SubjectCues(r.f);
  const notes = own(r.calls);
  assert.ok(notes.length > 100);
  let subj = 0;
  let dulled = 0;
  for (const n of r.g.others) {
    const at = r.g.timeAt(n.on);
    const c = notes.find((x) => x.midi === n.midi && Math.abs(x.at - at) < 0.06 && Math.abs(x.v.pan - (0.5 - n.voice / 2) * 0.9) < 1e-9);
    if (!c) continue;
    const sn = cues.note(n.voice, n.on);
    if (sn) {
      subj++;
      assert.ok((c.p.tone ?? 0) > 0 && (c.p.crisp ?? 0) > 0, `subject note ${n.voice}:${n.on} emphasised`);
      // Not by loudness: the level is the phrasing's own (no boost).
      const was = plain.calls.find((x) => x.midi === c.midi && x.at === c.at && x.v.pan === c.v.pan)!;
      assert.equal(c.p.level, was.p.level);
      // The top voice's entry: slight.
      if (n.voice === 0) assert.ok(c.p.tone! < 1.5);
      else assert.ok(c.p.tone! >= 2.5);
    } else if (cues.dullness(n.voice, n.on) > 0) {
      dulled++;
      assert.ok((c.p.tone ?? 0) < 0, `${n.voice}:${n.on} dulled`);
      assert.ok((c.p.tone ?? 0) >= -2.5);
      // At most about half a dB quieter.
      const was = plain.calls.find((x) => x.midi === c.midi && x.at === c.at && x.v.pan === c.v.pan)!;
      assert.ok(c.p.level! / was.p.level! >= 0.93);
    } else assert.equal(c.p.tone, undefined);
  }
  assert.ok(subj > 20 && dulled > 20, `${subj} subject notes, ${dulled} dulled`);
});

test("the effect's layers are cheap: every node released, few more made", () => {
  for (const [piece, preset] of [
    ["wtc1f04", "harpsichordSampled"],
    ["bwv1080-14", "chip"],
    ["wtc1f05", "analog"],
    ["wtc1f10", "harpsichordSampled"],
  ] as const) {
    const on = run(piece, preset, {}, 90);
    const off = run(piece, preset, { subject: false, effect: false }, 90);
    assert.ok(on.calls.length > off.calls.length, `${piece}: layers played`);
    assert.equal(on.left, 0, `${piece} ${preset}: nodes left wired`);
    const ratio = on.made / off.made;
    assert.ok(ratio < 1.5, `${piece} ${preset}: ${on.made} nodes against ${off.made} (${ratio.toFixed(2)})`);
    assert.ok(on.wired < 400, `${piece}: at most ${on.wired} wired at once`);
    assert.ok(on.chip.sounding() === 0);
  }
});

test("D221: the other seventeen Book I effects cheap too: every node released, few more made", () => {
  // D249: the organ, withdrawn from the choices, still played as a preset object.
  const presets = ["harpsichordSampled", "chip", "gameboy", ORGAN_SAMPLED];
  const ratios: string[] = [];
  FUGUES.filter((f) => f.book === 1 && !TESTBENCH.includes(f.id)).forEach((f, i) => {
    const preset = presets[i % presets.length];
    const pid = typeof preset === "string" ? preset : preset.id;
    const on = run(f.id, preset, {}, 60);
    const off = run(f.id, preset, { subject: false, effect: false }, 60);
    assert.ok(on.calls.length > off.calls.length, `${f.id}: layers played`);
    assert.equal(on.left, 0, `${f.id} ${pid}: nodes left wired`);
    const ratio = on.made / off.made;
    ratios.push(`${f.id} ${ratio.toFixed(2)} (${on.wired})`);
    assert.ok(ratio < 1.5, `${f.id} ${pid}: ${on.made} nodes against ${off.made} (${ratio.toFixed(2)})`);
    assert.ok(on.wired < 400, `${f.id}: at most ${on.wired} wired at once`);
  });
  if (process.env.D221_TABLE) console.log(ratios.join(" · "));
});

test("the switches: SUBJECT SOUND and EFFECT off leave the notes as they were; VIBRATO and STEREO on", () => {
  const off = run("wtc1f01", "gameboy", { subject: false, effect: false }, 30, 0);
  assert.ok(off.calls.every((c) => c.p.tone === undefined && c.p.crisp === undefined && c.p.room === undefined));
  const plain = run("wtc1f01", "gameboy", { subject: true, effect: false }, 30, 0);
  assert.ok(plain.calls.some((c) => (c.p.tone ?? 0) > 0));
  assert.equal(plain.calls.length, off.calls.length, "no layers without the effect");
  assert.ok(plain.calls.every((c) => !c.p.vib));
  const vib = run("wtc1f01", "gameboy", { subject: true, vibrato: true, stereo: true }, 30, 0);
  const emph = vib.calls.filter((c) => (c.p.crisp ?? 0) > 0);
  assert.ok(emph.length > 5 && emph.every((c) => (c.p.vib ?? 0) > 0));
  // The entering voice nearer the centre than its own place.
  const cues = new SubjectCues(vib.f);
  const inner = vib.g.others.find((n) => n.voice === 1 && cues.note(1, n.on))!;
  const c = vib.calls.find((x) => x.midi === inner.midi && Math.abs(x.at - vib.g.timeAt(inner.on)) < 0.06 && (x.p.crisp ?? 0) > 0)!;
  assert.ok(Math.abs(c.v.pan) < 0.5 * Math.abs((0.5 - 1 / 3) * 0.9));
});

test("the player's own voice: its subject note sounds with the same emphasis and effect (SUBJECT SOUND on)", () => {
  setPreset("chip");
  setLab({ subject: true });
  const chip = new Chip();
  const ctx = ctxOf();
  const calls: Call[] = [];
  const note = chip.note.bind(chip);
  chip.note = (midi, at, dur, v, p = {}) => (calls.push({ midi, at, v, p }), note(midi, at, dur, v, p));
  // I/1: voice 1 (the alto) states the subject first.
  const f = fugueById("wtc1f01");
  const g = new ProtoGame(f, [1], startTick(f, 0), protoById("keys"), { bpm: 60, legato: false, fail: false, easy: "timing" }, chip);
  const first = g.notes[0];
  for (let t = 0; g.now < first.on; t += 1 / 120) {
    ctx.advance(t);
    g.step();
  }
  const before = calls.length;
  g.keyDown(1, { code: "KeyA" }, performance.now());
  const mine = calls.slice(before);
  assert.ok(mine.length >= 2, "the note and its 4' flute");
  const struck = mine.find((c) => c.p.lead)!;
  assert.ok((struck.p.tone ?? 0) >= 2.5 && (struck.p.crisp ?? 0) > 0);
  assert.ok(mine.some((c) => !c.p.lead && c.midi === struck.midi + 12), "the octave above");
  g.keyUp(1, performance.now());
  g.stopAll();
});

test("the recorded harpsichord and organ take the colour too: one shelf, a send, a shimmer of vibrato; all released", async () => {
  for (const p of ["harpsichordSampled", ORGAN_SAMPLED]) {
    setPreset(p);
    const preset = typeof p === "string" ? p : p.id;
    const chip = new Chip();
    const ctx = ctxOf();
    await chip.prepare([60]);
    const v: Voicing = { timbre: "pulse25", pan: 0.15, gain: 1, patch: patchFor(1, 4) };
    const fixed = ctx.nodes.size;
    const count = (p: Play) => {
      const was = new Map(ctx.made);
      chip.note(60, ctx.currentTime, 1.2, v, p);
      const d = (k: string) => (ctx.made.get(k) ?? 0) - (was.get(k) ?? 0);
      return { filters: d("filter"), oscs: d("oscillator"), buffers: d("buffer"), gains: d("gain") };
    };
    const plain = count({});
    assert.ok(plain.buffers >= 1, `${preset}: from the recording`);
    const subj = count({ tone: 3, crisp: 0.7, room: 0.4, vib: 12 });
    assert.equal(subj.filters - plain.filters, 1, `${preset}: one shelf`);
    assert.equal(subj.oscs - plain.oscs, 1, `${preset}: one vibrato`);
    assert.equal(subj.gains - plain.gains, 2, `${preset}: the vibrato's depth and the room's send`);
    const dull = count({ tone: -2 });
    assert.equal(dull.filters - plain.filters, 1);
    ctx.advance(ctx.currentTime + 10);
    assert.equal(chip.sounding(), 0);
    assert.equal(ctx.nodes.size - fixed, 0, `${preset}: all released`);
  }
});
