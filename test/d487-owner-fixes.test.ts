/**
 * D487 (WTC 2.16, no version bump): four of the owner's reports.
 * (1) "hear the subject no endings": HEAR THE SUBJECT ends on its last note held a beat at least, let go naturally.
 * (2) "obbligato at bottom of buttons instead": OBBLIGATO's buttons at the bars' feet, over the stops (the live hit-test
 *     is in the decision row: it needs the production build in a browser).
 * (3) "my voice was lower than all others": the player's voice lifted to the loudest other voice and a little over,
 *     measured (player-lift-data.ts); Busoni's line never under the loudest voice (d407-player-dynamics.test.ts).
 *     D508 replaced the standing lift: the player matched to the band's sounding of its voice, the band's quiet
 *     voices brought up, the subject's entries forward (d508-balance.test.ts).
 * (4) "a black rectangle at the bottom": the page no longer padded by the safe areas; the game's screen keeps them inside.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import { performSubject, playReading } from "../src/touch/readings.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { characterOf } from "../src/touch/character.ts";
import { kindsOf } from "../src/touch/practice.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { PRESETS, playerSound, preset, setPreset } from "../src/touch/sound.ts";
import { ENDING_BEATS, firstEntry, subjectSounds } from "../src/bench/hear-sound.ts";
import { BAND_SPREAD_DB, LIFT_MAX_DB, LIFT_MIN_DB, bandTrimDb, liftDb, liftGain } from "../src/touch/player-lift.ts";
import { OWN_LOUD, SOUND_LOUD } from "../src/touch/player-lift-data.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import type { Chip } from "../src/touch/chip.ts";

const IDS = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));
const css = readFileSync(new URL("../src/bench/bench.css", import.meta.url), "utf8");
const rule = (sel: string) => {
  const i = css.indexOf(`\n${sel} {`);
  assert.ok(i >= 0, `rule ${sel}`);
  return css.slice(i, css.indexOf("}", i));
};

test("D487 (1): HEAR THE SUBJECT's last note held its full length and a beat at least, never detached; the notes before it as they were", () => {
  for (const id of IDS) {
    const f = fugueById(id);
    setPreset(playerSound(PIECE_SOUND[id] ?? "chip"));
    const e = firstEntry(id);
    const r = playReading(id);
    const bpm = tempoOf(id);
    const tps = (f.tpq * bpm) / 60;
    const perf = performSubject(r, e.notes, f.tpq, bpm, { kind: kindsOf(preset().id, f.voices.length)[e.voice] ?? "organ", character: characterOf(id) });
    const s = subjectSounds(f, e, perf, bpm);
    const last = s.at(-1)!;
    const p = perf.at(-1)!;
    const written = e.notes.at(-1)![1];
    assert.ok(last.at + last.len >= p.at + Math.max(written, ENDING_BEATS * f.tpq) / tps - 1e-9, `${id}: the last note rings ${(last.at + last.len - p.at).toFixed(2)} s`);
    assert.ok(!last.apart && last.final, `${id}: the last note let go naturally`);
    assert.ok(!last.tie, `${id}: nothing tied past the end`);
    // Only the last sound changed: the ones before it as the reading performs them (the plain notes: their lengths).
    perf.slice(0, -1).forEach((q, i) => {
      const at = s.findIndex((x) => Math.abs(x.at - q.at) < 1e-9);
      if (at >= 0 && at < s.length - 1 && s[at + 1].at > q.at + q.len - 1e-9) assert.ok(Math.abs(s[at].len - q.len) < 1e-9, `${id} note ${i}`);
    });
  }
});

test("D487 (2): OBBLIGATO's buttons at the bars' feet (no longer the top corners), over the stops where there are any, readable", () => {
  const b = rule(".tb-obbligato");
  assert.ok(/\bbottom: calc\(env\(safe-area-inset-bottom/.test(b), "at the foot, over the home indicator");
  assert.ok(!/\btop:/.test(b), "not at the top (it covered the bar counter)");
  assert.ok(/background: #[0-9a-f]{6};/.test(b), "an opaque ground, whatever the tinted bar under it");
  assert.ok(/--tb-stop-rows, 1\) \* 47px/.test(rule(".tb-has-side-stops .tb-obbligato-left")), "the left one over the left foot's pistons (D420, 58 px a row)");
  assert.ok(/--tb-stop-rows-right/.test(rule(".tb-has-side-stops .tb-obbligato-right")), "the right one over the right foot's");
  assert.ok(/font-size: 9px/.test(rule(".tb-obbligato-inst")), "the instrument in the HUD's 9 px");
  const h = Number(/height: (\d+)px/.exec(b)![1]);
  // The legend's floor over the stops: the strip under the roll deep enough for the button (bench.css: 26 px over the pistons).
  const floor = /\.tb-has-side-stops\.tb-bars \.tg-legend \{ min-height: calc\(var\(--tb-stop-rows, 1\) \* 47px \+ (\d+)px\); \}/.exec(css);
  assert.ok(floor && Number(floor[1]) >= h - 10, `the floor ${floor?.[1]} px for a ${h} px button`);
});

test("D487 (3), D508: every voice of the 48 fugues measured on its own sound; the player matched to the band's sounding of its voice (no standing lift)", () => {
  for (const id of IDS) {
    const f = fugueById(id);
    const own = OWN_LOUD[id];
    assert.ok(own, `${id} measured`);
    assert.equal(own.s, playerSound(PIECE_SOUND[id]), `${id} on its own sound`);
    assert.equal(own.p.length, f.voices.length);
    for (let v = 0; v < f.voices.length; v++) {
      const L = liftDb(id, own.s, v, f.voices.length);
      assert.ok(L >= LIFT_MIN_DB && L <= LIFT_MAX_DB);
      // D508: the player's voice where the band would sound it (its trim included), the mean of K and phone.
      const mine = (own.p[v][0] + own.p[v][1]) / 2 + L;
      const band = (own.b[v][0] + own.b[v][1]) / 2 + own.t[v];
      if (L > LIFT_MIN_DB && L < LIFT_MAX_DB) assert.ok(Math.abs(mine - band) <= 0.15, `${id} voice ${v}: ${(mine - band).toFixed(2)} dB from the band's`);
    }
  }
  // I/3 (D487's example) on GAME BOY: the soprano no longer under the bass by more than the band's spread.
  const o3 = OWN_LOUD.wtc1f03;
  const c = (x: number[]) => (x[0] + x[1]) / 2;
  assert.ok(c(o3.p[0]) + liftDb("wtc1f03", "gameboy", 0, 3) >= c(o3.b[2]) + o3.t[2] - BAND_SPREAD_DB - 0.15, "I/3's soprano within the spread of the bass");
});

test("D487 (3), D508: on every offered sound and number of voices the balance is measured and built", () => {
  for (const p of PRESETS) {
    const by = SOUND_LOUD[p.id];
    assert.ok(by, `${p.id} measured`);
    for (const n of [2, 3, 4, 5]) {
      assert.ok(by[n], `${p.id}, ${n} voices`);
      assert.equal(by[n].t.length, n);
      for (let v = 0; v < n; v++) assert.ok(Number.isFinite(liftDb("none", p.id, v, n)) && bandTrimDb("none", p.id, v, n) >= 0);
    }
    // A piece of six voices or one: still an answer (the nearest count; none alone).
    assert.ok(Number.isFinite(liftDb("none", p.id, 5, 6)));
    assert.equal(liftDb("none", p.id, 0, 1), 0);
  }
});

const fakeChip = (clock: { t: number }) =>
  ({ ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: () => ({ stop() {}, setLevel() {}, bend() {}, rel: 0 }), click() {}, sweep() {}, setPan() {}, wake() {} }) as unknown as Chip;
const game = (f: TouchFugue, v: number, extra: Record<string, unknown> = {}) => new ProtoGame(f, v, 0, protoById("ladder"), { bpm: 60, legato: false, easy: "direction", fail: false, ...extra }, fakeChip({ t: 0 }));

test("D487 (3): the game carries the lift for its run (the piece, the voice, the sound); none WITH KIMIKO or alone; BenchApp sets it on the player's bus", () => {
  setPreset("gameboy");
  const f = fugueById("wtc1f03");
  const g = game(f, 0);
  assert.ok(Math.abs(g.lift - liftGain("wtc1f03", "gameboy", 0, 3)) < 1e-12);
  assert.ok(g.lift > 1.25, `the soprano lifted (${g.lift.toFixed(2)})`);
  assert.equal(game(f, 0, { her: true }).lift, 1);
  assert.equal(game(f, 0, { solo: true }).lift, 1);
  // The lift reads nothing of the play: the same however the score stands (a readonly of the run).
  const s = g as unknown as Record<string, number>;
  s.streak = 999;
  s.score = 1e6;
  assert.ok(Math.abs(g.lift - liftGain("wtc1f03", "gameboy", 0, 3)) < 1e-12);
  const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  assert.ok(/ch\.mine\.gain\.value = mineGain\(readTools\(f\)\.balance, prac\) \* g\.lift/.test(app));
});

test("D487 (4): the page runs to the glass: no safe-area padding on the page; the bars' screen keeps the insets inside it", () => {
  assert.ok(/\n:root \{ padding-top: 0; padding-bottom: 0; \}/.test(css), "the page unpadded");
  assert.ok(/\.tg-app\.tb-bars, \.tg-app\.tg-wide \{ padding-top: 0; padding-bottom: 0; \}/.test(css), "the bars' screen to the bottom edge");
  assert.ok(/\.tb-bars \.tg-box \{ padding-bottom: calc\(6px \+ env\(safe-area-inset-bottom/.test(css), "the box's words above the home indicator");
  const sel = readFileSync(new URL("../src/bench/selection.css", import.meta.url), "utf8");
  assert.ok(/\.tb-sel \{ position: fixed; inset: 0;/.test(sel) && /\.tb-intro \{ position: fixed; inset: 0;/.test(sel), "the selection and the title page fill the screen");
  const html = readFileSync(new URL("../play.html", import.meta.url), "utf8");
  assert.ok(/viewport-fit=cover/.test(html) && /apple-mobile-web-app-status-bar-style" content="black-translucent"/.test(html));
});
