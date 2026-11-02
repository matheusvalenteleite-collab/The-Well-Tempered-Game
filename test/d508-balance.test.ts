/**
 * D508 (no version bump; instruments session): THE VOICES' BALANCE. The owner, on II/18 G♯ minor: "the ALTO is almost
 * inaudible when I'm playing soprano … my own voice … dominating a bit given its bright sound"; "find a middle ground:
 * dominant when it's playing the subject … merge with the others in other occasions … when other voices play the
 * subject, they might get a bit of dominance, though not too much". The player's standing lift (D487) replaced by a
 * level match, the band's quiet voices brought up, the subject's entries forward note by note (player-lift.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { playerSound, setPreset } from "../src/touch/sound.ts";
import { BALANCE, BAND_ENTRY_DB, BAND_SPREAD_DB, BAND_TRIM_MAX_DB, BRIGHT_MAX_DB, PLAYER_ENTRY_DB, bandTrimDb, entryGain, liftDb, playerToneDb } from "../src/touch/player-lift.ts";
import { OWN_LOUD } from "../src/touch/player-lift-data.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import type { Chip, Play } from "../src/touch/chip.ts";

const IDS = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const c = (x: readonly number[]) => (x[0] + x[1]) / 2;
const dB = (g: number) => 20 * Math.log10(g);

/** The levels of a fugue on its own sound with the player in `v` (dB, the mean of K and phone): the player's, then the band's (trimmed). */
function mix(id: string, v: number): number[] {
  const o = OWN_LOUD[id];
  return o.b.map((b, u) => (u === v ? c(o.p[v]) + liftDb(id, o.s, v, o.b.length) : c(b) + bandTrimDb(id, o.s, u, o.b.length)));
}

test("D508: the subject forward: the player's own entries PLAYER_ENTRY_DB (1.5-2.5), the band's BAND_ENTRY_DB (1 at most) and never as much", () => {
  assert.ok(PLAYER_ENTRY_DB >= 1.5 && PLAYER_ENTRY_DB <= 2.5);
  assert.ok(BAND_ENTRY_DB > 0 && BAND_ENTRY_DB <= 1 && BAND_ENTRY_DB < PLAYER_ENTRY_DB);
  assert.ok(Math.abs(dB(entryGain(true)) - PLAYER_ENTRY_DB) < 1e-9);
  assert.ok(Math.abs(dB(entryGain(false)) - BAND_ENTRY_DB) < 1e-9);
  // Busoni's palette bringing an entry out itself (his marcato's entryDb): his, nothing stacked on it.
  assert.equal(entryGain(false, 1.5), 1);
});

test("D508: no standing lift: the player's voice merged with the band's levels; most band voices within BAND_SPREAD_DB of the loudest", () => {
  let voices = 0, within = 0;
  for (const id of IDS) {
    const o = OWN_LOUD[id];
    const f = fugueById(id);
    assert.equal(o.s, playerSound(PIECE_SOUND[id]));
    assert.equal(o.t.length, f.voices.length);
    // the loudest after the trims (they carry no common gain: the least-trimmed voice at 0)
    const top = Math.max(...o.b.map((b, u) => c(b) + o.t[u]));
    assert.equal(Math.min(...o.t), 0, `${id}: no common gain`);
    for (let u = 0; u < o.b.length; u++) {
      const t = bandTrimDb(id, o.s, u, o.b.length);
      assert.ok(t >= 0 && t <= BAND_TRIM_MAX_DB, `${id} ${u}: nothing lowered`);
      assert.ok(c(o.b[u]) + t >= top - 6, `${id} voice ${u}: ${(top - c(o.b[u]) - t).toFixed(1)} dB under`);
      voices++;
      if (c(o.b[u]) + t >= top - BAND_SPREAD_DB - 0.1) within++;
      assert.ok(playerToneDb(id, o.s, u, o.b.length) <= 0 && playerToneDb(id, o.s, u, o.b.length) >= -BRIGHT_MAX_DB);
    }
    // The player in each voice: never standing more than 3 dB over every other voice outside its entries (a voice brought up for its lost stretches, I/14's alto on the lute, the most: 2.8).
    for (let v = 0; v < o.b.length; v++) {
      const m = mix(id, v);
      const others = m.filter((_, u) => u !== v);
      assert.ok(m[v] <= Math.max(...others) + 3, `${id}: the player in ${v} no longer over the band (${(m[v] - Math.max(...others)).toFixed(1)} dB)`);
    }
  }
  // Within the spread but where a voice brought up for its lost stretches stands over another (I/14's alto on the lute).
  assert.ok(within >= 0.9 * voices, `${within} of ${voices} voices within the spread`);
});

test("D508: every inner voice audible: no voice more than 6 dB under the loudest, with the player on any voice (the whole piece's levels)", () => {
  for (const id of IDS) {
    const o = OWN_LOUD[id];
    for (let v = 0; v < o.b.length; v++) {
      const m = mix(id, v);
      const top = Math.max(...m);
      m.forEach((x, u) => assert.ok(x >= top - 6, `${id}, the player in ${v}: voice ${u} ${(top - x).toFixed(1)} dB under`));
    }
  }
});

test("D508, D510: II/18 (the owner's case, CLAVICHORD; now JAZZ QUARTET): the alto heard with the player on the soprano; the two mixes alike", () => {
  const sop = mix("wtc2f18", 0);
  const alt = mix("wtc2f18", 1);
  assert.equal(OWN_LOUD.wtc2f18.s, "jazzQuartet", "D510: CLAVICHORD withdrawn, II/18 reallocated");
  // The alto (the band's) against the player's soprano: within 2 dB.
  assert.ok(sop[0] - sop[1] <= 2, `the alto ${(sop[0] - sop[1]).toFixed(1)} dB under the player's soprano`);
  // Comparably balanced: each voice's level within 1.5 dB between the two mixes, the spreads within 1 dB.
  sop.forEach((x, u) => assert.ok(Math.abs(x - alt[u]) <= 1.5, `voice ${u}: ${x.toFixed(1)} against ${alt[u].toFixed(1)}`));
  const spread = (m: number[]) => Math.max(...m) - Math.min(...m);
  assert.ok(Math.abs(spread(sop) - spread(alt)) <= 1, `spreads ${spread(sop).toFixed(1)} and ${spread(alt).toFixed(1)}`);
});

const quietChip = (clock: { t: number }, log: { at: number; p: Play }[]) =>
  ({ ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: (_m: number, at: number, _d: number, _v: unknown, p: Play = {}) => (log.push({ at, p }), { stop() {}, setLevel() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, rel: 0 }), click() {}, sweep() {}, setPan() {}, wake() {}, swoosh() {}, tick() {}, groove: () => false, chime() {} }) as unknown as Chip;

/** The band's notes of II/18's first 24 bars (the player on the soprano): when, and at what level. */
function band(raw: boolean): { tick: number; level: number }[] {
  BALANCE.raw = raw;
  setPreset("jazzQuartet"); // D510: II/18's sound now (CLAVICHORD withdrawn)
  const f = fugueById("wtc2f18");
  const clock = { t: 0 };
  const log: { at: number; p: Play }[] = [];
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 60, legato: false, easy: "direction", fail: false }, quietChip(clock, log));
  const end = g.timeAt(24 * f.barTicks);
  while (clock.t < end) (clock.t += 0.02), g.step();
  BALANCE.raw = false;
  return log.filter((x) => !x.p.lead).map((x) => ({ tick: g.tickAtTime(x.at), level: x.p.level ?? 1 }));
}

test("D508: the band's notes take their voice's trim and, in a subject entry, BAND_ENTRY_DB more: by the score's place alone", () => {
  const f = fugueById("wtc2f18");
  const a = band(true);
  const b = band(false);
  assert.equal(a.length, b.length);
  assert.ok(a.length > 100);
  const trims = f.voices.map((_, u) => bandTrimDb("wtc2f18", "jazzQuartet", u, 3));
  let lifted = 0;
  for (let i = 0; i < a.length; i++) {
    const r = dB(b[i].level / a[i].level);
    const plain = trims.some((t) => Math.abs(r - t) < 0.01);
    const entry = trims.some((t) => Math.abs(r - t - BAND_ENTRY_DB) < 0.01);
    assert.ok(plain || entry, `note ${i}: ${r.toFixed(2)} dB`);
    if (entry && !plain) {
      lifted++;
      // D510: JAZZ QUARTET plays a note a few ticks off its written place (its feel): the score's place within that.
      const tol = f.barTicks / 192;
      assert.ok(f.entries.some((e) => e.voice !== 0 && e.on <= a[i].tick + tol && a[i].tick < e.end + tol), `a lifted note in a band entry (tick ${a[i].tick})`);
    }
  }
  assert.ok(lifted > 10, `the band's entries forward (${lifted} notes)`);
});

test("D508: the player's note forward in its own entry, by the note's place (right or wrong alike), and its tone", () => {
  setPreset("jazzQuartet"); // D510: II/18's sound now (CLAVICHORD withdrawn)
  const f = fugueById("wtc2f18");
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 60, legato: false, easy: "direction", fail: false }, quietChip({ t: 0 }, []));
  const bal = (g as unknown as { balanced: (e: Play, v: number, on: number) => Play }).balanced.bind(g);
  const e = f.entries.find((x) => x.voice === 0)!;
  assert.ok(Math.abs(dB(bal({ level: 1 }, 0, e.notes[1][0]).level ?? 1) - PLAYER_ENTRY_DB) < 1e-9);
  const free = f.voices[0].find(([on]) => !f.entries.some((x) => x.voice === 0 && x.on <= on && on < x.end))!;
  assert.equal(bal({ level: 1 }, 0, free[0]).level ?? 1, 1);
  // In the touch path it is not behind the verdict (v.ok): loudness never tied to right or wrong.
  const src = readFileSync(new URL("../src/bench/proto-game.ts", import.meta.url), "utf8");
  const at = src.indexOf("if (!this.o.her) expr = this.balanced(expr, this.voiceOf(h.k, i), notes[i].on);");
  assert.ok(at > 0);
  assert.ok(!/v\.ok/.test(src.slice(at, at + 90)));
});
