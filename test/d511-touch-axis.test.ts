/**
 * D511, SOFT TO STRONG ON EVERY INSTRUMENT (touch-expr.ts landing, TOUCH_LEVEL_DB; chip.ts Chip.landed): every
 * offered sound's landing, for every voice of its four-voice layout, goes from soft to strong across the strip by a
 * pure mapping check: its level rising (never falling) from the soft edge to the strong, its colour brighter or the
 * same, the two together at least TOUCH_SPAN_MIN_DB (the colour counted at half: its loudness was measured with the
 * level's, DECISIONS D511), the middle the sound as it was, the strong zone (where an accent is played) the strongest.
 * The harpsichord's lute in the soft zone and brighter pluck in the strong; the organ's echo manual and swell box;
 * the chips' thin pulse on the strong side.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATCHES, PRESETS, presetById, slotOf, type Patch } from "../src/touch/sound.ts";
import {
  ECHO_BELOW,
  HARPSI_BRIGHT_DB,
  holdMode,
  landing,
  LUTE_BELOW,
  ORGAN_SWELL_TONE,
  pulseWidth,
  STRONG_ZONE_FROM,
  touchKind,
  touchLevelDb,
  TOUCH_LEVEL_DB,
  TOUCH_SPAN_MIN_DB,
  type Landing,
} from "../src/touch/touch-expr.ts";

/** Being withdrawn by another session (D511's brief): not audited here. */
const SKIP = new Set(["lute", "clavichord", "nocturne32"]);
const AUDITED = PRESETS.map((p) => p.id).filter((id) => !SKIP.has(id));

/** The voices of a preset's four-voice layout (their patches; null: CLASSIC CHIP's own voices). */
function patches(id: string): (Patch | null)[] {
  const pr = presetById(id);
  const by = pr.by?.[4];
  if (by) return by.map(([p]) => PATCHES[p]);
  return pr.slots ? [0, 1, 2, 3].map((v) => PATCHES[pr.slots![slotOf(v, 4)]]) : [null, null, null, null];
}

/** A landing's level (dB): the piano's and the jazz quartet's as struck (their soft recording made up to it), else its gain; and the sound's own (TOUCH_LEVEL_DB). */
function levelDb(id: string, l: Landing, x: number): number {
  const own = l.vel !== undefined ? l.vel : 20 * Math.log10(l.level ?? 1);
  return own + touchLevelDb(id, x);
}
/** A landing's brightness (dB-like): a shelf's dB, a lowpass's octaves under 16 kHz, the filter's brightness, a thinner pulse, the FM index, the vowel's opening, a harder layer, the brassiness. */
function brightOf(l: Landing): number {
  let b = l.tone ?? 0;
  if (l.lp) b -= 3 * Math.log2(16000 / l.lp);
  if (l.bright !== undefined) b += 6 * l.bright;
  if (l.pw !== undefined) b += 3 * Math.log2(0.5 / l.pw);
  if (l.fmScale !== undefined) b += 6 * Math.log2(l.fmScale);
  if (l.open !== undefined) b += 6 * (l.open - 0.5);
  if (l.layer) b += l.layer === "soft" ? -2 : l.layer === "hard" ? 2 : 0;
  if (l.brass !== undefined) b += 6 * (l.brass - 0.5);
  if (l.echo) b -= 2;
  return b;
}
const at = (id: string, pt: Patch | null, x: number) => landing(touchKind(id)!, x, 67, pt, true);

test("D511: every offered sound has a family and a level across the strip", () => {
  assert.ok(AUDITED.length >= 15);
  for (const id of AUDITED) {
    assert.ok(touchKind(id), `${id}: no touch family`);
    assert.ok(TOUCH_LEVEL_DB[id], `${id}: no TOUCH_LEVEL_DB entry`);
    assert.equal(touchLevelDb(id, 0.5), 0, `${id}: the middle the sound as it was`);
    const [s, g] = TOUCH_LEVEL_DB[id];
    assert.ok(s <= 0 && g >= 0, id);
    // Never more than a few dB over the band's own at the strong edge (the player's note is the band's: D358).
    assert.ok(g <= 5 && s >= -10, `${id}: ${s} ${g}`);
  }
});

test("D511: soft to strong on every voice of every offered sound: louder, brighter or the same, together >= TOUCH_SPAN_MIN_DB", () => {
  const rows: string[] = [];
  for (const id of AUDITED)
    patches(id).forEach((pt, v) => {
      const xs = [0, 0.1, 0.25, 1 / 3, 0.5, 0.6, 2 / 3, 0.8, 0.9, 1];
      const ls = xs.map((x) => levelDb(id, at(id, pt, x), x));
      for (let i = 1; i < xs.length; i++) assert.ok(ls[i] >= ls[i - 1] - 1e-9, `${id} v${v}: the level falls from ${xs[i - 1]} to ${xs[i]}`);
      const lo = at(id, pt, 0);
      const hi = at(id, pt, 1);
      const dl = ls.at(-1)! - ls[0];
      const db = brightOf(hi) - brightOf(lo);
      assert.ok(db >= -1e-9, `${id} v${v}: darker on the strong side (${db.toFixed(2)})`);
      const span = dl + 0.5 * db;
      rows.push(`${id} v${v}: ${dl.toFixed(1)} dB + colour ${db.toFixed(1)}`);
      assert.ok(span >= TOUCH_SPAN_MIN_DB, `${id} v${v}: ${dl.toFixed(1)} dB of level and ${db.toFixed(1)} of colour`);
      assert.ok(dl >= 2, `${id} v${v}: a level of its own (${dl.toFixed(1)} dB)`);
      // The strong zone (an accent's) at least as strong as anywhere outside it.
      const zone = levelDb(id, at(id, pt, STRONG_ZONE_FROM), STRONG_ZONE_FROM);
      assert.ok(zone >= ls[xs.indexOf(0.6)] - 1e-9, `${id} v${v}`);
    });
  assert.ok(rows.length > 40);
});

test("D511: HARPSICHORD: the lute stop in the soft zone, darker to the edge; the plain 8′ in the middle; a brighter pluck in the strong zone", () => {
  const pt = PATCHES.harpsiSampled;
  const l0 = landing("harpsichord", 0, 64, pt);
  const l1 = landing("harpsichord", LUTE_BELOW - 0.01, 64, pt);
  assert.ok(l0.lute && l1.lute && l0.lp! < l1.lp!);
  assert.deepEqual(landing("harpsichord", 0.5, 64, pt), {});
  assert.equal(landing("harpsichord", 1, 64, pt).tone, HARPSI_BRIGHT_DB);
  assert.ok(landing("harpsichord", STRONG_ZONE_FROM, 64, pt).tone! > 0);
  assert.ok(!landing("harpsichord", 1, 64, pt).lute);
  const [s, g] = TOUCH_LEVEL_DB.harpsichordSampled;
  assert.ok(s <= 0 && g > 0);
});

test("D511: PIPE ORGAN: the echo manual in the soft zone; the swell box across the strip; the swell pedal while held", () => {
  const lo = landing("organ", 0, 64, PATCHES.orgPrincipal);
  const hi = landing("organ", 1, 64, PATCHES.orgPrincipal);
  assert.ok(lo.echo && !hi.echo && !landing("organ", ECHO_BELOW, 64, PATCHES.orgPrincipal).echo);
  assert.equal(lo.tone, ORGAN_SWELL_TONE[0]);
  assert.equal(hi.tone, ORGAN_SWELL_TONE[1]);
  assert.deepEqual(landing("organ", 0.5, 64, PATCHES.orgPrincipal), {});
  const [s, g] = TOUCH_LEVEL_DB.chamberOrgan;
  assert.ok(g - s + ORGAN_SWELL_TONE[1] - ORGAN_SWELL_TONE[0] >= 8, "the swell box: level and brightness together");
  assert.equal(holdMode("organ", PATCHES.orgPrincipal, false), "messa");
});

test("D511: the chips: the thin pulse on the strong side (measured brighter and louder), the round square on the soft", () => {
  assert.equal(landing("chip", 0, 64, null, true).pw, 0.5);
  assert.equal(landing("chip", 1, 64, null, true).pw, 0.125);
  assert.equal(landing("chip", 0.5, 64, null, true).pw, pulseWidth(0.5));
  assert.equal(landing("chip", 1, 64, PATCHES.sidLead).pw, 0.125);
  assert.equal(landing("chip", 0, 64, PATCHES.sidLead).pw, 0.5);
});
