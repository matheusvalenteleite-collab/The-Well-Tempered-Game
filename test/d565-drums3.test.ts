/**
 * D565-D574, THE OWNER'S DRUM VERDICTS AFTER 2.50: BREAKBEAT re-written with weight (layers, ghosts, swing, the breaks'
 * syncopations; IDM GLITCH with it), LIEBEZEIT's trance, MARCH as BACH BRASS's HOME (score-driven, rudiments, heard),
 * STOOGES' slapstick, ARCADE's chip kit, SWELL's sea, SYNTH KIT read from the score; the per-fugue tailoring (I/2,
 * I/6, I/7, I/8, I/20, I/24, II/18, the BACH BRASS fugues).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, TOON_PIECES, drumFilesFor, kitMix, synthKitOf, type GrooveContext } from "../src/touch/chip.ts";
import { setBacking, setPreset } from "../src/touch/sound.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { formAt, formOf as fugueForm } from "../src/touch/fugue-form.ts";
import { formOf, phaseAt } from "../src/touch/form-points.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { brushDb, brushFills, kitBeat, type KitHit } from "../src/touch/drum-presets.ts";
import { GRIDS, layoutOf } from "../src/touch/drum-grids.ts";
import { brushBeat } from "../src/touch/jazz-drums.ts";
import { BRUSH_TAILORS, GRID_TAILORS, tailorBrushes, tailoredGrid } from "../src/touch/drum-tailor.ts";
import { FUGUE_PICKS, HOME_ID, SOUND_STYLES, fits, homeStyleFor, setDrumStyle, styleIds, styleInfo } from "../src/touch/drum-library.ts";
import { SCORE_STYLES_D3, TWEAKS, arrivals, scorePlan, tweakFor } from "../src/touch/score-drums.ts";

installFakeAudio(0, true);
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const WTC = FUGUES.filter((f) => /^wtc/.test(f.id));
const NEW = ["breakbeat", "liebezeit", "march", "stooges", "arcade", "swell", "scoreSynth"];

function clock(id: string) {
  const f = fugueById(id);
  const b = beatOf(f);
  const beatS = (b.ticks / f.tpq) * (60 / tempoOf(id));
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  return { f, b, beatS, compound };
}
/** A whole fugue's beats of a kit style (with the fugue's tailoring). */
function play(id: string, style: string) {
  const { f, b, beatS, compound } = clock(id);
  const form = fugueForm(f);
  const beats: { tick: number; hits: KitHit[] }[] = [];
  for (let tick = 0, n = 0; tick < f.length; tick += b.ticks, n++) beats.push({ tick, hits: kitBeat(style, { b: n % b.perBar, per: b.perBar, compound, beatS, tick, beat: b.ticks, form, keyAt: () => f.key, home: f.key, piece: id }) });
  return { f, form, beats, beat: b.ticks, beatS, per: b.perBar };
}

test("D565-D572: the agreed ids, each in its family and engine, in every metre it fits; MARCH BACH BRASS's HOME", () => {
  for (const id of NEW) assert.ok(styleIds.includes(id), id);
  const eng: Record<string, string> = { breakbeat: "grid", liebezeit: "grid", arcade: "grid", march: "score", stooges: "score", swell: "score", scoreSynth: "score" };
  for (const [id, e] of Object.entries(eng)) assert.equal(styleInfo(id).engine, e, id);
  for (const s of SCORE_STYLES_D3) assert.ok(styleIds.includes(s));
  assert.equal(homeStyleFor("bachBrass"), "march");
  assert.ok(!SOUND_STYLES.bachBrass.includes("janissary"), "the owner: \"I hate it\"");
  assert.ok(fits("breakbeat", "wtc2f04"), "II/4's 12/16");
  assert.ok(fits("arcade", "wtc1f15") && fits("arcade", "wtc2f24"));
  assert.ok(fits("liebezeit", "wtc1f20") && fits("march", "wtc1f05") && fits("march", "wtc2f05") && fits("stooges", "wtc1f19") && fits("swell", "wtc2f18") && fits("scoreSynth", "wtc1f02"));
  for (const [id, s] of [["wtc1f02", "scoreSynth"], ["wtc1f19", "stooges"], ["wtc1f20", "liebezeit"], ["wtc2f18", "swell"], ["wtc1f15", "arcade"], ["wtc2f24", "arcade"], ["wtc2f04", "breakbeat"]] as const) assert.ok(FUGUE_PICKS[id].includes(s), `${id} ${s}`);
  assert.ok(!FUGUE_PICKS.wtc1f15.includes("tabor") && !FUGUE_PICKS.wtc2f24.includes("castanets"), "the owner's rejected pairings");
  // The synthesized kits load nothing; the march's and the swell's recordings are there (d526 checks the files).
  assert.equal(synthKitOf("arcade"), "arcade");
  assert.equal(synthKitOf("scoreSynth"), "synth");
  assert.deepEqual(drumFilesFor("arcade"), []);
  assert.deepEqual(drumFilesFor("scoreSynth"), []);
  assert.ok(drumFilesFor("march").some((p) => p.set === "kitPeriod"));
  assert.ok(drumFilesFor("stooges").some((p) => p.set === "kitClub"), "the woodblock and the claves");
});

test("D565: BREAKBEAT's weight: the kick and snare layered, the ghosts, a velocity contour, swing, the breaks' syncopations; IDM with it", () => {
  const bb = GRIDS.breakbeat;
  assert.ok(bb.layer?.kick && bb.layer?.snare && GRIDS.idm.layer?.kick && GRIDS.idm.layer?.snare);
  assert.ok((bb.swing16 ?? 0) > 0);
  const kick = bb.duple.rows.kick!.replace(/ /g, "").split("|");
  const snare = bb.duple.rows.snare!.replace(/ /g, "").split("|");
  assert.ok(kick.length >= 4 && new Set(kick).size >= 3, "four bars, varied");
  // The kick's double on 1 and its and (Funky Drummer / Amen), off-beat kicks, the backbeat on 2 and 4, ghosts.
  assert.ok(kick.every((k) => k[0] !== "." && k[2] !== "."), "the double");
  assert.ok(kick.every((k) => [...k].some((c, i) => c !== "." && i % 4 !== 0)), "syncopated");
  assert.ok(snare.filter((sn) => sn[4] === "#").length >= 3 && snare.every((sn) => (sn.match(/-/g) ?? []).length >= 2), "backbeats and ghosts");
  // A contour: at least four levels a bar in the strokes played (II/4 and II/20, a 12/16 and a 4/4).
  for (const [id, style] of [["wtc2f04", "breakbeat"], ["wtc2f20", "breakbeat"], ["wtc2f04", "idm"]] as const) {
    const { beats, per } = play(id, style);
    let bars = 0;
    let rich = 0;
    for (let i = 8 * per; i < 16 * per; i += per) {
      const v = beats.slice(i, i + per).flatMap((x) => x.hits).map((h) => Math.round(h.vel * 20));
      bars++;
      if (new Set(v).size >= 4) rich++;
    }
    assert.ok(rich >= bars * 0.75, `${id} ${style}: ${rich}/${bars}`);
    const ghosts = beats.flatMap((x) => x.hits).filter((h) => h.piece === "snare" && h.vel < 0.25).length;
    assert.ok(ghosts > 40, `${id} ${style}: ${ghosts} ghosts`);
  }
});

test("D566: LIEBEZEIT, a trance: no fill but a soft lift into the final entry, the loop changing every six bars, the episodes the same loop softer", () => {
  const { f, form, beats, beat, per } = play("wtc1f20", "liebezeit");
  const fills = beats.flatMap((x) => x.hits.filter((h) => h.role === "fill" || h.role === "roll").map((h) => ({ ...h, tick: x.tick })));
  assert.ok(fills.length > 0);
  for (const h of fills) {
    assert.ok(h.tick >= form.finalEntry - per * beat - 1 && h.tick < form.finalEntry || h.tick >= form.lastBar - per * beat - 1, `a fill at bar ${(h.tick / f.barTicks + 1).toFixed(1)}`);
    assert.equal(h.piece, "snare");
    assert.ok(h.vel <= 0.35, "a lift of ghosts");
  }
  // The pattern of each bar (the snare's and the toms' onsets) changes at most once in six bars, and at least four ways.
  const sig = new Map<number, string>();
  for (const x of beats) {
    const bar = Math.round(x.tick / f.barTicks - 0.5 + 1e-9);
    if (phaseAt(formOf(f), x.tick).phase === "episode" || x.tick >= Math.min(form.climax, form.finalEntry - 2 * f.barTicks)) continue;
    sig.set(bar, (sig.get(bar) ?? "") + x.hits.filter((h) => (h.piece === "tomHigh" || h.piece === "tomLow" || h.piece === "kick") && h.role !== "accent").map((h) => `${h.piece[0]}${(((x.tick % f.barTicks) / beat) + h.at).toFixed(2)}`).join());
  }
  // (bars with an episode's beat in them left out: their loop is the softer one)
  for (const x of beats) if (phaseAt(formOf(f), x.tick).phase === "episode" || formAt(form, x.tick).kind !== "subject") sig.delete(Math.round(x.tick / f.barTicks - 0.5 + 1e-9));
  const bars = [...sig.keys()].sort((a, b) => a - b);
  let changes = 0;
  for (let i = 1; i < bars.length; i++) if (bars[i] === bars[i - 1] + 1 && sig.get(bars[i]) !== sig.get(bars[i - 1]) && Math.floor(bars[i] / 6) !== Math.floor(bars[i - 1] / 6)) changes++;
  for (let i = 1; i < bars.length; i++) if (bars[i] === bars[i - 1] + 1 && Math.floor(bars[i] / 6) === Math.floor(bars[i - 1] / 6)) assert.equal(sig.get(bars[i]), sig.get(bars[i - 1]), `bar ${bars[i] + 1}: changed inside its six`);
  assert.ok(new Set(sig.values()).size >= 4 && changes >= 4, `${new Set(sig.values()).size} patterns, ${changes} changes`);
  assert.equal(GRIDS.liebezeit.trance, true);
  assert.ok((GRIDS.liebezeit.send ?? 1) < 0.05, "dry and close");
});

test("D567: MARCH, score-driven: the subject's rhythm on the side drum, flams and rolls into the clear entries, the bass drum on the strong beats, the cymbals at the arrivals only, quieter episodes", () => {
  for (const id of ["wtc1f05", "wtc2f05"]) {
    const f = fugueById(id);
    const fp = formOf(f);
    const p = scorePlan(f, "march");
    const s = p.strokes;
    const onsets = new Set(f.entries.flatMap((e) => (f.voices[e.voice] ?? []).filter((n) => n[0] >= e.on && n[0] < e.end).map((n) => n[0])));
    const subj = s.filter((x) => x.src === "subject" && !x.grace);
    assert.ok(subj.length > 20 && subj.every((x) => x.piece === "sideDrum" && onsets.has(x.tick)), id);
    assert.ok(s.some((x) => x.src === "subject" && x.grace), `${id}: flams`);
    assert.ok(s.filter((x) => x.src === "roll" && x.dt < 0 && x.piece === "sideDrum").length >= 8, `${id}: rolls into entries`);
    // The bass drum on the bars' first beats in the entries.
    const ent = f.bars.filter((b) => phaseAt(fp, b.on).phase === "subject" && b.on < fp.last);
    const struck = ent.filter((b) => s.some((x) => x.piece === "bassDrum" && Math.abs(x.tick - b.on) < p.beat / 4)).length;
    assert.ok(struck >= ent.length * 0.7, `${id}: ${struck}/${ent.length}`);
    // The cymbals only at the arrivals and the final chord.
    const arr = arrivals(f).map((a) => a.tick);
    for (const x of s.filter((x) => x.piece === "cymbals")) assert.ok(arr.some((a) => Math.abs(a - x.tick) < p.beat) || x.tick >= fp.last - p.beat, `${id}: a cymbal at bar ${(x.tick / f.barTicks + 1).toFixed(1)}`);
    // The episodes quieter (each bar's sum of levels).
    const per = (ep: boolean) => {
      const bars = new Map<number, number>();
      for (const x of s) if ((phaseAt(fp, x.tick).phase === "episode") === ep && x.role !== "roll" && x.src !== "cadence") bars.set(Math.floor(x.tick / f.barTicks), (bars.get(Math.floor(x.tick / f.barTicks)) ?? 0) + x.vel);
      return [...bars.values()].reduce((a, v) => a + v, 0) / Math.max(1, bars.size);
    };
    assert.ok(per(true) < 0.6 * per(false), `${id}: episodes ${per(true).toFixed(2)} vs entries ${per(false).toFixed(2)}`);
    assert.ok(s.some((x) => x.piece === "drumStick" && phaseAt(fp, x.tick).phase === "episode"), `${id}: the street beat`);
    assert.ok(tweakFor(id, "march").entryRolls);
  }
  // Heard under BACH BRASS (the owner: "virtually inaudible"): its share well above the side drum's.
  assert.ok(kitMix("march").share >= 1.5 * kitMix("military").share);
});

test("D569: STOOGES: unpitched slapstick, the bonk on each cadence after a cartoon pause and a ta-da, the whistle through the rolls into the acts", () => {
  const f = fugueById("wtc1f19");
  const p = scorePlan(f, "stooges");
  const s = p.strokes;
  const allowed = new Set(["templeHi", "templeLo", "woodblock", "claves", "ratchet", "slapstick", "whistleUp", "whistleDown", "bonk"]);
  for (const x of s) assert.ok(allowed.has(x.piece) && x.midi === undefined, x.piece);
  for (const c of f.cadences.filter((c) => c.on < formOf(f).last - p.beat)) {
    assert.ok(s.some((x) => x.piece === "bonk" && x.tick === c.on), `bonk at bar ${c.bar}`);
    assert.ok(!s.some((x) => (x.src === "bass" || x.src === "subject") && x.tick >= c.on - p.beat / 2 && x.tick < c.on), `the pause before bar ${c.bar}`);
    assert.ok(s.filter((x) => x.src === "cadence" && x.tick < c.on && x.tick >= c.on - p.beat / 2).length >= 2, `ta-da into bar ${c.bar}`);
    if (c.kind === "perfect") assert.ok(s.some((x) => x.piece === "slapstick" && x.tick === c.on));
  }
  assert.ok(s.some((x) => x.piece === "whistleUp" && (x.len ?? 0) > 0.3));
  assert.ok(s.some((x) => x.piece === "whistleDown" && x.src === "final"));
  assert.ok(s.some((x) => x.piece === "templeHi") && s.some((x) => x.piece === "templeLo"), "the blocks by the bass's contour");
  for (const pc of ["templeHi", "ratchet", "slapstick", "whistleUp", "bonk", "malletLow", "cymSwell"] as const) assert.ok(TOON_PIECES.has(pc));
});

test("D568, D570, D572: ARCADE bounces in 6/8 and 3/8; SYNTH KIT's hats on the subject, its episodes lighter, its cadences marked; SWELL's snare only at a few arrivals", () => {
  for (const id of ["wtc1f15", "wtc2f24"]) {
    const { beats, beatS, per } = play(id, "arcade");
    const L = layoutOf(GRIDS.arcade, per, clock(id).compound, beatS);
    assert.ok(60 / L.pulseS > 40 && 60 / L.pulseS < 200, `${id}`);
    const k = beats.slice(4 * per, 12 * per).flatMap((x) => x.hits).filter((h) => h.piece === "kick").length;
    assert.ok(k >= 8, `${id}: the bouncing kick ${k}`);
  }
  const f = fugueById("wtc1f02");
  const fp = formOf(f);
  const s = scorePlan(f, "scoreSynth").strokes;
  const onsets = new Set(f.entries.flatMap((e) => (f.voices[e.voice] ?? []).filter((n) => n[0] >= e.on && n[0] < e.end).map((n) => n[0])));
  const hats = s.filter((x) => x.piece === "hat");
  assert.ok(hats.length > 60 && hats.every((x) => onsets.has(x.tick)), "the subject's rhythm on the hats");
  assert.ok(s.filter((x) => x.piece === "shaker").every((x) => phaseAt(fp, x.tick).phase === "episode") && s.some((x) => x.piece === "shaker"), "the episodes' figure");
  for (const c of f.cadences.filter((c) => c.on < fp.last - 1000)) assert.ok(s.some((x) => x.piece === "clap" && x.tick === c.on), `bar ${c.bar}`);
  assert.ok(TWEAKS.wtc1f02.why.length > 100, "I/2 tailored by hand");

  const g = fugueById("wtc2f18");
  const gp = formOf(g);
  const w = scorePlan(g, "swell").strokes;
  const snares = w.filter((x) => x.piece === "snare");
  const fin = gp.seams.find((x) => x.kind === "final")!;
  for (const x of snares) assert.ok((x.tick >= fin.on && x.tick <= fin.end) || gp.actOn.some((a) => Math.abs(a - x.tick) < g.barTicks / 2), `a snare at bar ${(x.tick / g.barTicks + 1).toFixed(1)}`);
  assert.ok(snares.length >= 3 && snares.length <= 16, `${snares.length} snares in 143 bars`);
  assert.ok(w.filter((x) => x.piece === "cymSwell").length >= 20);
  // Almost no backbeat: strokes a bar on average under four.
  assert.ok(w.length / g.bars.length < 4, `${(w.length / g.bars.length).toFixed(1)} a bar`);
});

test("D565-D572: every new score-driven style on every fugue: in the piece, never machine-gun close on one drum, the final chord struck, unpitched", () => {
  for (const f of WTC) {
    const fp = formOf(f);
    for (const st of SCORE_STYLES_D3) {
      const p = scorePlan(f, st);
      assert.ok(p.strokes.length > f.bars.length * 0.5, `${f.id} ${st}: ${p.strokes.length}`);
      const last = new Map<string, number>();
      const prevGrace = new Map<string, boolean>();
      for (const x of p.strokes) {
        assert.ok(x.vel > 0 && x.vel <= 1 && x.tick >= 0 && x.tick <= fp.end, `${f.id} ${st}`);
        assert.notEqual(x.piece, "timp");
        const t = (x.tick / p.beat) * p.beatS + x.dt;
        if (last.has(x.piece)) assert.ok(t - last.get(x.piece)! >= (x.grace || prevGrace.get(x.piece) ? 0.018 : 0.03), `${f.id} ${st} ${x.piece} at ${t.toFixed(3)}`);
        last.set(x.piece, t);
        prevGrace.set(x.piece, !!x.grace);
      }
      assert.ok(p.strokes.some((x) => x.src === "final" && x.tick === fp.last && x.role === "accent"), `${f.id} ${st} final`);
    }
  }
});

test("D571-D574: the per-fugue tailoring: I/6's taps on its subject, I/7's layers, I/8's ride kept for the important parts, I/24's staged climax", () => {
  // I/6: the taps on the subject's attacks in each entry's head.
  const { f: f6, b: b6, beatS: s6, compound: c6 } = clock("wtc1f06");
  assert.ok(BRUSH_TAILORS.wtc1f06);
  const e = f6.entries[2];
  const head = new Set((f6.voices[e.voice] ?? []).filter((n) => n[0] >= e.on && n[0] < e.on + 4 * b6.ticks).map((n) => n[0]));
  const taps: number[] = [];
  for (let tick = Math.floor(e.on / b6.ticks) * b6.ticks, n = Math.floor(e.on / b6.ticks); tick < e.on + 4 * b6.ticks; tick += b6.ticks, n++) {
    const bb = tailorBrushes(f6, tick, b6.ticks, s6, brushBeat(n % b6.perBar, b6.perBar, c6, tick, b6.ticks, brushFills(f6, b6.ticks, b6.perBar), brushDb(f6, tick), f6.length, s6));
    for (const h of bb.hits) if (h.piece === "tap" && !h.role) taps.push(Math.round(tick + h.at * b6.ticks));
  }
  const on = taps.filter((t) => t >= e.on);
  assert.ok(on.length >= 6 && on.every((t) => head.has(t)), `${on.length} taps, on the subject`);
  // I/7: the 808 layered (shaker, ghosts, the rim's tresillo), swung.
  const g7 = tailoredGrid("wtc1f07", "machine", GRIDS.machine)!;
  assert.ok(g7.duple.rows.shaker && g7.duple.rows.rim && (g7.swing16 ?? 0) > 0 && g7 !== GRIDS.machine);
  assert.ok(GRID_TAILORS.wtc1f07.machine.why.length > 80);
  // I/8: the ride only in the augmentation and the final group / climax; none in the episodes.
  const { f: f8, beats } = play("wtc1f08", "jazz");
  const fp8 = formOf(f8);
  const ride = beats.filter((x) => x.hits.some((h) => h.piece === "ride"));
  assert.ok(ride.length > 20);
  for (const x of ride) {
    const ph = phaseAt(fp8, x.tick);
    assert.ok(ph.phase !== "episode" || ph.climax > 0 || ph.kind === "final", `a ride in an episode at bar ${(x.tick / f8.barTicks + 1).toFixed(1)}`);
    assert.ok(x.tick >= 61 * f8.barTicks - f8.barTicks / 2, `the ride at bar ${(x.tick / f8.barTicks + 1).toFixed(1)}: only the important parts`);
  }
  // I/24: the staged build (the first quarter's strokes softer and fewer than the last's), the climax's cymbals.
  const f24 = fugueById("wtc1f24");
  for (const st of ["timpani", "fieldDrums"] as const) {
    const s = scorePlan(f24, st).strokes.filter((x) => x.src === "bass" || x.src === "subject");
    const q = f24.length / 4;
    const early = s.filter((x) => x.tick < q);
    const late = s.filter((x) => x.tick >= 2 * q && x.tick < 3.6 * q);
    const mean = (a: typeof s) => a.reduce((m, x) => m + x.vel, 0) / Math.max(1, a.length);
    assert.ok(early.length < late.length && mean(early) < 0.75 * mean(late), `${st}: ${early.length} ${mean(early).toFixed(2)} vs ${late.length} ${mean(late).toFixed(2)}`);
    const fp = formOf(f24);
    assert.ok(scorePlan(f24, st).strokes.some((x) => x.piece === "cymbals" && Math.abs(x.tick - fp.climax.peak) < 10), st);
    assert.ok(scorePlan(f24, st).strokes.filter((x) => x.piece === "cymbals").every((x) => x.tick >= fp.climax.peak - 10), "the cymbals at the climax only");
  }
  for (const id of ["wtc1f05", "wtc2f05"]) assert.ok(TWEAKS[id].styles?.march, `${id}: MARCH tailored`);
});

test("D565-D572: through the one choke point: the synthesized pieces sounded, the layers made, nothing thrown", async () => {
  setPreset("bachBrass");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  setBacking(true);
  for (const [id, style] of [["wtc1f19", "stooges"], ["wtc2f18", "swell"], ["wtc1f02", "scoreSynth"], ["wtc2f04", "breakbeat"], ["wtc2f04", "idm"], ["wtc1f15", "arcade"], ["wtc1f20", "liebezeit"], ["wtc1f05", "march"]] as const) {
    const { f, b, compound } = clock(id);
    setDrumStyle(id, style);
    chip.kitEvents.length = 0;
    const t0 = (chip.ctx as unknown as { currentTime: number }).currentTime + 0.5;
    for (let k = 0; k < 12 * b.perBar; k++) {
      const tick = f.barTicks * 6 + k * b.ticks;
      const cx: GrooveContext = { tick, beat: b.ticks, fills: [], end: f.length, piece: f, dynDb: 0 };
      assert.equal(chip.groove(t0 + k * 0.5, 0.5, k % b.perBar, 6 + Math.floor(k / b.perBar), b.perBar, compound, cx), true);
    }
    assert.ok(chip.kitEvents.length > 10 && chip.kitEvents.every((e) => e.style === style && e.vel > 0), `${style}: ${chip.kitEvents.length}`);
    setDrumStyle(id, HOME_ID);
  }
  setBacking(false);
});
