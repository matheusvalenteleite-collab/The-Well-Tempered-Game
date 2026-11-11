/**
 * D609-D618, BACH BRASS v3 (the brass research's section 3, approved): the main sets at mf (BACH BRASS's alone), the EQ
 * and the room, the climax at +1.5 dB, the low brass's lengths, the horn on the alto of four, the straight-muted trumpet
 * in the episodes and on the second trumpet of five, the entries' doubles (jitter, detune, their own seats), the two
 * choirs on a computer (a phone's seats unchanged), and the calm fugues' drums on BACH BRASS (TIMPANI or FIELD DRUM).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { OWN_PIECES, PATCHES, presetById, setPreset, setPieceLayout, pieceLineUp, sampledNow } from "../src/touch/sound.ts";
import { SAMPLED, reachOf, sampledMidis } from "../src/touch/sampled.ts";
import { BAND_CHAINS, BRASS_CLEAR, BRASS_HORN_LANE, BRASS_LOW_LANE, BRASS_TRUMPET_LANE } from "../src/touch/band-fx.ts";
import { BRASS_GROWTH, BRASS_LENGTHS, BRASS_MUTE, BRASS_UNISON, growthAt, lengthCaps, unisonLate, unisonSpans } from "../src/touch/band-growth.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { formOf, phaseAt } from "../src/touch/form-points.ts";
import { voicing } from "../src/touch/chip.ts";
import { SOUND_FUGUE_HOME, fits, homeFor, homeStyleFor, styleInfo } from "../src/touch/drum-library.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { TEMPO } from "../src/touch/tempi.ts";

const setPhone = (on: boolean) => Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: on ? 5 : 0, userAgent: on ? "iPhone" : "node" }, configurable: true, writable: true });
const p = presetById("bachBrass");

test("D609: BACH BRASS's trumpet and tenor trombone on the mf sets, the same pitches; SALSA's and ABBEY ROAD's keep the ff", () => {
  assert.equal(PATCHES.bachTrumpet.sample, "brassTrumpetMf");
  assert.equal(PATCHES.bachTrombone.sample, "brassTromboneMf");
  assert.deepEqual(sampledMidis("brassTrumpetMf"), sampledMidis("brassTrumpet"));
  assert.deepEqual(sampledMidis("brassTromboneMf"), sampledMidis("brassTrombone"));
  assert.equal(SAMPLED.brassTrumpetMf.blend?.set, "brassTrumpetP");
  for (const id of ["salTrumpet", "s2Trumpet", "a2Trumpet"] as const) assert.equal(PATCHES[id].sample, "brassTrumpet", id);
  for (const id of ["salTrombone", "s2Trombone"] as const) assert.equal(PATCHES[id].sample, "brassTrombone", id);
  // The horn keeps its 2014 ff, the bass its mf.
  assert.equal(PATCHES.bachHorn.sample, "brassHorn");
  assert.equal(PATCHES.bachBass.sample, "brassBass");
});

test("D610/D613: the lanes (the trumpets off-axis, the horn's and the low brass's low mids), no presence boost, the early reflection, the church shorter and darker", () => {
  const c = BAND_CHAINS.bachBrass;
  assert.equal(PATCHES.bachTrumpet.lane, "trumpets");
  assert.equal(PATCHES.bachTrumpetMute.lane, "trumpets");
  assert.equal(PATCHES.bachHorn.lane, "horn");
  assert.equal(PATCHES.bachTrombone.lane, "low");
  assert.equal(PATCHES.bachBass.lane, "low");
  assert.deepEqual(Object.keys(c.lanes ?? {}).sort(), ["horn", "low", "trumpets"]);
  assert.ok(BRASS_TRUMPET_LANE.some((b) => b.type === "peaking" && b.hz === 3200 && b.db === -3));
  assert.ok(BRASS_TRUMPET_LANE.some((b) => b.type === "highshelf" && b.hz === 7000 && b.db === -2));
  assert.ok(BRASS_LOW_LANE.some((b) => b.type === "peaking" && b.hz === 220 && b.db === -2.5) && BRASS_LOW_LANE.some((b) => b.type === "highpass" && b.hz === 45));
  assert.ok(BRASS_HORN_LANE.every((b) => (b.db ?? 0) < 0 && b.hz < 400));
  // The cut at 300 Hz kept, the +1 dB at 2.5 kHz gone; no treble lift anywhere on the bus.
  assert.ok(BRASS_CLEAR.some((b) => b.hz === 300 && (b.db ?? 0) < -3));
  for (const s of c.bus) if (s.kind === "eq") for (const b of s.bands ?? []) assert.ok((b.db ?? 0) <= 0, `${b.type} ${b.hz}`);
  const echo = c.bus.find((s) => s.kind === "echo");
  assert.ok(echo && echo.kind === "echo" && echo.feedback === 0 && echo.time >= 0.017 && echo.time <= 0.022 && echo.mix === 0.15);
  assert.equal(c.reverb?.rt60, 1.95);
  assert.equal(c.reverb?.predelay, 0.04);
  assert.equal(c.reverb?.lp, 4200);
  assert.equal(c.reverb?.hp, 280);
});

test("D611: the climax +1.5 dB brighter (was +3), its room kept", () => {
  assert.equal(BRASS_GROWTH.climax.tone, 1.5);
  assert.equal(BRASS_GROWTH.climax.room, 1.7);
});

test("D612: the low brass's running quavers 70 %, crotchets 90 %; never the trumpets or the horn; lengths only (no note added or moved)", () => {
  setPreset("bachBrass");
  for (const id of ["wtc1f05", "wtc2f05", "wtc1f22", "wtc1f21"]) {
    const f = fugueById(id);
    const n = f.voices.length;
    const ids = f.voices.map((_, v) => (p.by![n as 4]![v]?.[0] ?? null));
    const caps = lengthCaps(f, ids, BRASS_LENGTHS);
    f.voices.forEach((vs, v) => {
      const low = ids[v] === "bachTrombone" || ids[v] === "bachBass";
      for (const [on, dur] of vs) {
        const c = caps.get(`${v}:${on}`);
        if (!low) assert.equal(c, undefined, `${id} v${v}`);
        else {
          assert.ok(c !== undefined && c >= 0.7 && c <= 0.9, `${id} v${v} ${on}`);
          if (dur >= f.tpq) assert.equal(c, 0.9);
        }
      }
    });
    assert.ok([...caps.values()].includes(0.7), `${id}: running quavers`);
  }
  setPreset("chip");
});

test("D613: the alto of four on the horn, within its compass (no fold) but where I/24's and II/17's keep the second trumpet; their horn doubles loaded", () => {
  assert.deepEqual(p.by![4]!.map(([id]) => id), ["bachTrumpet", "bachHorn", "bachTrombone", "bachBass"]);
  const horn = SAMPLED[PATCHES.bachHorn.sample!];
  for (const f of FUGUES.filter((x) => x.voices.length === 4 && x.kind === "fugue")) {
    const own = p.pieces?.[f.id]?.[4];
    const alto = own ? own[1][0] : "bachHorn";
    if (alto !== "bachHorn") continue;
    const r = reachOf(horn, horn.set);
    for (const [, , m] of f.voices[1]) assert.ok(m >= r.lo && m <= r.hi, `${f.id} ${m}`);
  }
  // (D632: and the seats by range, octave-seats.ts, merged into the sound's pieces beside its own two.)
  assert.deepEqual(Object.keys(OWN_PIECES.bachBrass ?? {}).sort(), ["wtc1f24", "wtc2f17"]);
  setPreset("bachBrass");
  setPieceLayout(pieceLineUp("bachBrass", fugueById("wtc1f24")));
  assert.ok(sampledNow().includes("brassHorn"), "the entries' horn with the piece's own line-up");
  setPieceLayout(null);
  setPreset("chip");
});

test("D614: the straight mute on the second trumpet of five and on the episodes' trumpets (veiled only, open in the climax); its compass the trumpet II's", () => {
  assert.equal(p.by![5]![1][0], "bachTrumpetMute");
  assert.equal(PATCHES.bachTrumpetMute.sample, "brassTrumpetMute");
  assert.deepEqual(sampledMidis("brassTrumpetMute"), [58, 60, 62, 67, 70, 74, 77, 81]);
  assert.deepEqual(BRASS_MUTE.compass, [sampledMidis("brassTrumpetMute")[0] - 3, sampledMidis("brassTrumpetMute").at(-1)! + 3]);
  for (const id of ["wtc1f04", "wtc1f22"]) for (const [, , m] of fugueById(id).voices[1]) assert.ok(m >= BRASS_MUTE.compass[0] && m <= BRASS_MUTE.compass[1], `${id} ${m}`);
  for (const id of ["wtc1f05", "wtc2f05"]) {
    const f = fugueById(id);
    const form = formOf(f);
    let veiled = 0;
    for (const b of f.bars) {
      const g = growthAt(f, b.on, BRASS_GROWTH);
      const ph = phaseAt(form, b.on);
      if (g.veiled) veiled++;
      assert.equal(g.veiled, ph.phase === "episode" && Math.max(ph.climax, ph.resolved) < 0.5, `${id} bar ${b.n}`);
    }
    assert.ok(veiled > 0, id);
  }
});

test("D616: the entries' doubles 6 ± 4 ms late by note (fixed per note), +3 cents, at 0.7, in their own instruments' seats", () => {
  assert.equal(BRASS_UNISON.level, 0.7);
  assert.equal(BRASS_UNISON.detune, 3);
  const lates = new Set<number>();
  for (let v = 0; v < 5; v++)
    for (let t = 0; t < 20000; t += 37) {
      const l = unisonLate(BRASS_UNISON, v, t);
      assert.ok(l >= 0.002 - 1e-9 && l <= 0.01 + 1e-9, `${l}`);
      assert.equal(l, unisonLate(BRASS_UNISON, v, t));
      lates.add(Math.round(l * 1e4));
    }
  assert.ok(lates.size > 50, "spread, not one delay");
  // Every partner has a seat in the five-voice choir; every entry of I/5 and II/5 still doubled (D576).
  setPreset("bachBrass");
  for (const id of ["wtc1f05", "wtc2f05"]) {
    const f = fugueById(id);
    const ids = f.voices.map((_, v) => p.by![4]![v][0]);
    for (const s of unisonSpans(f, ids, BRASS_UNISON)) assert.ok(BRASS_UNISON.seat?.[s.patch] !== undefined, `${id} ${s.patch}`);
  }
  setPreset("chip");
});

test("D615: two choirs on a computer (±0.35 at most, the bass centred); a phone's seats as they were", () => {
  const was = (globalThis as { navigator?: unknown }).navigator;
  setPreset("bachBrass");
  // The phone's seats, D579's and D576's (the horn's now on the alto's).
  const phone = { 2: [-0.1, 0.08], 3: [-0.14, 0, 0.1], 4: [-0.18, -0.06, 0.08, 0.12], 5: [-0.2, -0.08, 0.02, 0.16, 0.1] } as const;
  for (const [n, pans] of Object.entries(phone)) {
    const c = Number(n);
    setPhone(true);
    assert.deepEqual(pans.map((_, v) => voicing(v, c).pan), pans, `phone ${n}`);
    setPhone(false);
    const desk = pans.map((_, v) => voicing(v, c).pan);
    assert.deepEqual(desk, p.desk![c as 4]);
    for (const x of desk) assert.ok(Math.abs(x) <= 0.35);
    assert.equal(desk.at(-1), 0, "the bass in the centre");
    assert.ok(desk[0] < 0, "the trumpets left");
  }
  setPreset("chip");
  Object.defineProperty(globalThis, "navigator", { value: was, configurable: true, writable: true });
});

test("D618: BACH BRASS's calm fugues (busiest voice under 3 notes a second) on TIMPANI or FIELD DRUM, idiomatic in their metre; II/5 keeps its MARCH", () => {
  const calm = FUGUES.filter((f) => /^wtc[12]f\d\d$/.test(f.id) && (TEMPO[f.id]?.busiest ?? 9) < 3).map((f) => f.id);
  const homes = SOUND_FUGUE_HOME.bachBrass;
  assert.deepEqual(Object.keys(homes).sort(), calm.filter((id) => PIECE_SOUND[id] !== "bachBrass").sort());
  for (const [id, st] of Object.entries(homes)) {
    assert.ok(st === "timpani" || st === "fieldDrums", id);
    assert.ok(fits(st, id), `${id}: ${st} in its metre`);
    assert.equal(styleInfo(st).engine, "score");
    assert.equal(homeFor(id, "bachBrass"), st);
  }
  assert.equal(homeFor("wtc2f05", "bachBrass"), "march");
  assert.equal(homeFor("wtc1f05", "bachBrass"), "march");
  // Another sound's HOME on those fugues as before (the fugue's own on its own sound, else the sound's).
  for (const id of Object.keys(homes)) for (const snd of ["chip", "pianoSampled", "jazzQuartet"]) if (PIECE_SOUND[id] !== snd) assert.equal(homeFor(id, snd), homeStyleFor(snd), `${id} on ${snd}`);
});
