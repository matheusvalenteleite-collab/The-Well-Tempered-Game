/**
 * D851-D854: THE SOLO OVER THE RIPIENO. The owner: "I tried playing some of the harpsichord concertos … in those orchestral
 * pieces, the players' voice was getting too drowned in the background (remember that the game is playing through phone
 * speakers)." In the many-voiced pieces (a soloist over an orchestra: the harpsichord concertos, BWV 1043, BWV 54) the
 * player's level is measured on the piece's own sound so that its line stands SOLO_TARGET_DB over the whole band (median),
 * the band takes none of a fugue table's trims and the continuo is floored on a phone (D645): constants of the piece, the
 * voice and the sound. D857: D853's doubling duck withdrawn (it tied a level to the notes): no band note is lowered.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras, FUGUES } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { setPreset } from "../src/touch/sound.ts";
import { BALANCE, BAND_TRIM_MAX_DB, SOLO_LIFT_MAX_DB, SOLO_LIFT_MIN_DB, SOLO_TARGET_DB, bandTrimDb, isSoloPiece, liftGain, soloLiftDb, soloTrimDb } from "../src/touch/player-lift.ts";
import { SOLO_LOUD } from "../src/touch/player-lift-solo.ts";
import { OWN_LOUD } from "../src/touch/player-lift-data.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import type { Chip, Play } from "../src/touch/chip.ts";

await loadExtras();
const dB = (g: number) => 20 * Math.log10(g);
const SOLO = ["hconcerto", "concerto", "cantata"];
const soloIds = (): string[] => {
  const out: string[] = [];
  for (const [id] of Object.entries(PIECE_SOUND)) {
    const f = fugueById(id);
    if (f.id === id && f.collection && SOLO.includes(f.collection)) out.push(id);
  }
  return out.sort();
};

test("D851: the solo pieces are the collections with a soloist over an orchestra, and only they", () => {
  const ids = soloIds();
  assert.equal(ids.length, 42 + 3 + 2, ids.join(" "));
  for (const id of ids) assert.ok(isSoloPiece(fugueById(id)), id);
  for (const f of FUGUES) assert.ok(!isSoloPiece(f), f.id);
  for (const id of ["bwv1080-01", "bwv772", "bwv228-1", "bwv1079-ric6", "chor001"]) assert.ok(!isSoloPiece(fugueById(id)), id);
});

test("D852: SOLO_LOUD: every solo piece on its own sound, every voice a player can choose, its level within bounds, both paths; the continuo's floor within the band's", () => {
  assert.ok(SOLO_TARGET_DB >= 0 && SOLO_TARGET_DB <= 3);
  for (const id of soloIds()) {
    const f = fugueById(id);
    const row = SOLO_LOUD[id];
    assert.ok(row, `${id}: a row`);
    assert.equal(row.s, PIECE_SOUND[id], id);
    const playable = f.playable ?? f.voices.map((_, v) => v);
    assert.deepEqual(row.v, [...playable], id);
    assert.ok(row.d && row.d.length === row.v.length, `${id}: the computer's`);
    for (const x of [...row.l, ...row.d]) assert.ok(x >= SOLO_LIFT_MIN_DB && x <= SOLO_LIFT_MAX_DB, `${id}: ${x}`);
    assert.ok((row.tb ?? 0) >= 0 && (row.tb ?? 0) <= BAND_TRIM_MAX_DB, id);
    // none of the fugues' table rows (OWN_LOUD) for them
    assert.ok(!OWN_LOUD[id], id);
  }
});

test("D852: the band takes no fugue table's trims in a solo piece (the bass's floor alone); a fugue's balance as before", () => {
  const f = fugueById("bwv1052-1");
  const n = f.voices.length;
  // the fugue table mapped onto seven voices raised the ripieno (the reason for D851)
  assert.ok(Math.max(...f.voices.map((_, u) => bandTrimDb(f.id, "super16", u, n, true))) > 3);
  for (let u = 0; u < n - 1; u++) assert.equal(soloTrimDb(f, "super16", u, true), 0);
  assert.equal(soloTrimDb(f, "super16", n - 1, true), SOLO_LOUD[f.id].tb ?? 0);
  assert.equal(soloTrimDb(f, "super16", n - 1, false), 0);
  // a fugue: the game's lift as it was
  setPreset("jazzQuartet");
  const w = fugueById("wtc2f18");
  const g = new ProtoGame(w, 0, 0, protoById("ladder"), { bpm: 60, legato: false, easy: "direction", fail: false }, quietChip({ t: 0 }, []));
  assert.equal(g.lift, liftGain("wtc2f18", "jazzQuartet", 0, 3));
});

const quietChip = (clock: { t: number }, log: { at: number; p: Play; m: number }[]) =>
  ({ ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: (m: number, at: number, _d: number, _v: unknown, p: Play = {}) => (log.push({ at, p, m }), { stop() {}, setLevel() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, rel: 0 }), click() {}, sweep() {}, setPan() {}, wake() {}, swoosh() {}, tick() {}, groove: () => false, chime() {} }) as unknown as Chip;

/** The band's notes of a piece's first bars, the player in `voice`: tick, voice and level. */
function band(id: string, voice: number, bars: number, raw: boolean): { tick: number; level: number }[] {
  BALANCE.raw = raw;
  setPreset(PIECE_SOUND[id]);
  const f = fugueById(id);
  const clock = { t: 0 };
  const log: { at: number; p: Play; m: number }[] = [];
  const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: 60, legato: false, easy: "direction", fail: false }, quietChip(clock, log));
  const end = g.timeAt(bars * f.barTicks);
  while (clock.t < end) (clock.t += 0.02), g.step();
  BALANCE.raw = false;
  return log.filter((x) => !x.p.lead).map((x) => ({ tick: g.tickAtTime(x.at), level: x.p.level ?? 1 }));
}

test("D857: no band note lowered by the score (the duck withdrawn): the band's notes as raw but for the continuo's floor; the player's level SOLO_LOUD's", () => {
  const id = "bwv1052-1";
  const f = fugueById(id);
  const a = band(id, 0, 16, true);
  const b = band(id, 0, 16, false);
  assert.equal(a.length, b.length);
  const tb = soloTrimDb(f, "super16", f.voices.length - 1);
  for (let i = 0; i < a.length; i++) {
    const r = dB(b[i].level / a[i].level);
    assert.ok([0, tb].some((x) => Math.abs(r - x) < 0.01), `note ${i}: ${r.toFixed(2)} dB`);
  }
  setPreset("super16");
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: 60, legato: false, easy: "direction", fail: false }, quietChip({ t: 0 }, []));
  assert.ok(Math.abs(dB(g.lift) - soloLiftDb(f, "super16", 0)) < 1e-9);
  assert.equal(g.tone, 0);
});

test("D852: SUPER 16-BIT's continuo cello lifted on a phone (CONSOLE_CELLO_PHONE_LIFT): the cello only the many-voiced layouts seat", async () => {
  const { CONSOLE_CELLO_PHONE_LIFT, PATCHES, PRESETS } = await import("../src/touch/sound.ts");
  assert.deepEqual(PATCHES.s16Cello.phoneLift, CONSOLE_CELLO_PHONE_LIFT);
  const s16 = PRESETS.find((p) => p.id === "super16")!;
  for (const [n, slots] of Object.entries(s16.by ?? {})) if (+n <= 5) assert.ok(!slots!.some(([id]) => id === "s16Cello"), `${n} voices`);
  // no seat table puts it anywhere else (the fugues' D645 measures are not moved)
  for (const p of PRESETS) for (const [id, byCount] of Object.entries(p.pieces ?? {})) for (const slots of Object.values(byCount)) if (p.id !== "super16") assert.ok(!slots!.some(([x]) => x === "s16Cello"), `${p.id} ${id}`);
});
