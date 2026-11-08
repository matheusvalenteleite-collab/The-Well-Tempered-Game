/**
 * D530-D531, THE SOUND LAB's DRUM PAD AND IDEAS: the whole library by family with HOME and FITS marked, S3's planned
 * styles shown as COMING; the style kept in the setting and the link; the IDEAS list's data checked entry by entry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, fits, homeStyleFor, isStyle, PLANNED_STYLES, styleIds } from "../src/touch/drum-library.ts";
import { padChoice, padGroups, padStyle } from "../src/bench/soundlab/drum-pad.ts";
import { changeKind, defaults, linkOf, parseLink } from "../src/bench/soundlab/lab-state.ts";
import { FUGUES, LAB_SOUNDS, planOf } from "../src/bench/soundlab/lab-engine.ts";
import { DROPPED, IDEAS, ideaPlayable, ideaSettings } from "../src/bench/soundlab/ideas.ts";
import { summaryOf } from "../src/bench/soundlab/summary.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";

test("D530: the pad shows every style once, by family, HOME and FITS marked, the planned ones COMING", () => {
  for (const [piece, sound] of [["wtc1f12", "vocalSynth"], ["wtc2f18", "jazzQuartet"], ["wtc1f11", "tomita"], ["wtc1f05", "bachBrass"]] as const) {
    const g = padGroups(piece, sound);
    assert.deepEqual(g.map((x) => x.family), [...FAMILIES]);
    const playable = g.flatMap((x) => x.items.filter((i) => !i.coming).map((i) => i.style));
    assert.deepEqual([...playable].sort(), [...styleIds].sort(), "every style once");
    for (const x of g) for (const i of x.items) if (!i.coming) assert.equal(i.family, x.family);
    const homes = g.flatMap((x) => x.items.filter((i) => i.home));
    assert.equal(homes.length, 1);
    assert.equal(homes[0].style, homeStyleFor(sound));
    for (const x of g) for (const i of x.items) if (!i.coming) assert.equal(i.fits, fits(i.style, piece), `${i.style} FITS ${piece}`);
    const coming = g.flatMap((x) => x.items.filter((i) => i.coming).map((i) => i.style));
    assert.deepEqual(coming, PLANNED_STYLES.filter((p) => !isStyle(p.id)).map((p) => p.id));
  }
  // The compound gigue: the 6/8 ballad fits it, the 808 does not.
  const gig = padGroups("wtc2f18", "jazzQuartet").flatMap((x) => x.items);
  assert.ok(gig.find((i) => i.style === "ballad")!.fits);
  assert.ok(!gig.find((i) => i.style === "machine")!.fits);
});

test("D530: the style chosen is the setting's; HOME follows the sound; older links read as before", () => {
  const s = { ...defaults("wtc1f12"), drums: 1 };
  assert.equal(padStyle(s, "vocalSynth"), "house");
  assert.equal(padStyle(s, "chamberOrgan"), "timpani");
  assert.equal(padChoice(s, "vocalSynth"), "home");
  assert.equal(padStyle({ ...s, style: "triphop" }, "vocalSynth"), "triphop");
  assert.equal(padChoice({ ...s, style: "triphop" }, "vocalSynth"), "triphop");
  assert.equal(padStyle({ ...s, drums: 0, style: "triphop" }, "vocalSynth"), null);
  assert.equal(padStyle({ ...s, drums: 3 }, "vocalSynth"), "techno", "D497's drums=3: the menu's third");
  assert.equal(padStyle({ ...s, style: "nope" }, "vocalSynth"), "house");
  const l = parseLink("#wtc1f12?drums=1&style=triphop&bar=12&b=own:1:dnb", (id) => FUGUES.includes(id));
  assert.equal(l.settings.style, "triphop");
  assert.deepEqual(l.b, { sound: null, drums: 1, style: "dnb" });
  assert.deepEqual(parseLink(linkOf(l.settings, l.bar, l.b), (id) => FUGUES.includes(id)), l);
  assert.equal(parseLink("#wtc1f12?drums=1&style=<x>", (id) => FUGUES.includes(id)).settings.style, null);
  assert.equal(changeKind(s, { ...s, style: "dnb" }), "live");
  // The plan loads the style's files; the summary names it.
  const f = fugueById("wtc1f12");
  assert.ok(planOf("vocalSynth", f, 1, "brushes").some((p) => p.set === "jazzBrushes"));
  assert.ok(summaryOf(f, { ...s, style: "triphop" }, "vocalSynth").some((it) => it.text.includes("TRIP-HOP")));
});

test("D531: IDEAS, 25-30 combinations, each complete; none \"coming\" whose style is built", () => {
  assert.ok(IDEAS.length >= 25 && IDEAS.length <= 30, `${IDEAS.length} ideas`);
  assert.equal(new Set(IDEAS.map((i) => i.id)).size, IDEAS.length);
  const kinds = new Set(IDEAS.map((i) => i.kind));
  // D532-D534 (S3) built the period styles: their ideas are SAFE (each FITS its fugue's metre) or BOLD, none "coming".
  assert.deepEqual([...kinds].sort(), ["bold", "safe"]);
  assert.ok(IDEAS.filter((i) => i.kind === "bold").length >= 8);
  for (const it of IDEAS) assert.ok(!DROPPED[`${it.piece}/${it.style}`], `${it.id} was dropped by the proxy`);
  const sounds = LAB_SOUNDS.map((x) => x.id);
  for (const it of IDEAS) {
    assert.ok(FUGUES.includes(it.piece), it.id);
    assert.ok(sounds.includes(it.sound), `${it.id}: ${it.sound}`);
    const f = fugueById(it.piece);
    assert.ok(it.bar >= (f.bars[0]?.n ?? 1) && it.bar <= f.bars[f.bars.length - 1].n, `${it.id}: bar ${it.bar}`);
    assert.ok(it.why.length > 10 && it.why.length <= 140 && !it.why.includes("\n"), `${it.id}: one dry line`);
    if (it.kind === "coming") {
      // Strict: "coming" only for a style not yet built (none now).
      assert.ok(!isStyle(it.style) && PLANNED_STYLES.some((p) => p.id === it.style), `${it.id}: "coming" but ${it.style} is in styleIds`);
      assert.equal(ideaPlayable(it), false);
    } else {
      assert.ok(isStyle(it.style), `${it.id}: ${it.style}`);
      assert.ok(ideaPlayable(it));
      if (it.kind === "safe") assert.ok(fits(it.style, it.piece), `${it.id}: a SAFE match FITS`);
      // Loaded whole: the fugue, the sound (null where it is the fugue's own), the drums on with the style.
      const s = ideaSettings(it);
      assert.equal(s.piece, it.piece);
      assert.equal(s.sound, it.sound === PIECE_SOUND[it.piece] ? null : it.sound);
      assert.equal(s.drums, 1);
      assert.equal(padStyle(s, it.sound), it.style);
      for (const [k, v] of Object.entries(it.layers ?? {})) assert.equal(s[k as "form"], v);
    }
  }
});
