/**
 * D532-D534: THE SCORE-DRIVEN ORCHESTRAL AND PERIOD DRUMS (score-drums.ts): no loop; every stroke read from the fugue's own
 * score: the bass line's accents (its motion and agogic weight), the subject's rhythm during its entries (rhythm only), the
 * cadences, the timpani on the home tonic and dominant at structural arrivals only; the new period kits (side drum, tabor,
 * castanets, Janissary, field drums) on CC0 recordings; tailored tweaks wherever such a style is a fugue's default or a
 * curated pick; PET SOUNDS' timpani under the same rule; every stroke through Chip.scheduleKitHit.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, drumFilesFor, kitSource, type GrooveContext } from "../src/touch/chip.ts";
import { setBacking, setPreset } from "../src/touch/sound.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { formOf, phaseAt } from "../src/touch/form-points.ts";
import { fileOf, folderOf } from "../src/touch/sampled.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { FUGUE_PICKS, HOME_ID, PLANNED_STYLES, curatedFor, drumMenuFor, homeStyleFor, setDrumStyle, styleIds, styleInfo } from "../src/touch/drum-library.ts";
import { SCORE_KITS, SCORE_STYLES, TWEAKS, arrivals, bassLine, clockOf, homeTimpani, scoreBeat, scorePlan, isScoreStyle } from "../src/touch/score-drums.ts";

installFakeAudio(0, true);
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const WTC = FUGUES.filter((f) => /^wtc/.test(f.id));

test("D532: the period styles are in the library (no longer planned), score-driven, unpitched but the timpani, on recorded CC0 kits", () => {
  assert.equal(PLANNED_STYLES.length, 0);
  for (const s of SCORE_STYLES) {
    assert.ok(styleIds.includes(s), s);
    assert.equal(styleInfo(s).engine, "score", s);
    assert.equal(styleInfo(s).family, "orchestral", s);
    // Every piece it strikes has a recording of the period kit (the timpani their own).
    const k = SCORE_KITS[s];
    for (const p of new Set([k.bass, k.subject, k.roll, k.episodeBass, k.pedal, ...(k.strong ?? []), ...k.cadence, ...k.land, ...k.final].filter((x) => x && x !== "timp"))) {
      const src = kitSource(s, p as never);
      assert.ok(src && src.set === "kitPeriod", `${s} ${p}`);
    }
    for (const plan of drumFilesFor(s)) for (const m of plan.notes) assert.ok(existsSync(`public/samples/${folderOf(plan.set)}/${fileOf(plan.set, m)}`), `${s} ${plan.set} ${m}`);
  }
  assert.ok(existsSync("tools/playback/period-drums/build_period.py"));
});

test("D532: every style on every fugue: the strokes in the piece, never machine-gun close on one drum, the final chord struck; the timpani alone pitched", () => {
  for (const f of WTC) {
    const fp = formOf(f);
    for (const s of SCORE_STYLES) {
      const p = scorePlan(f, s);
      assert.ok(p.strokes.length > f.bars.length * 0.5, `${f.id} ${s}: ${p.strokes.length}`);
      const last = new Map<string, number>();
      const prevGrace = new Map<string, boolean>();
      for (const x of p.strokes) {
        assert.ok(x.vel > 0 && x.vel <= 1 && x.tick >= 0 && x.tick <= fp.end, `${f.id} ${s}`);
        if (s !== "timpani") assert.notEqual(x.piece, "timp", `${f.id} ${s}: unpitched`);
        const t = (x.tick / p.beat) * p.beatS + x.dt;
        const k = x.piece + (x.midi ?? "");
        if (last.has(k)) assert.ok(t - last.get(k)! >= (x.grace || prevGrace.get(k) ? 0.018 : 0.03), `${f.id} ${s} ${x.piece} at ${t.toFixed(3)}`);
        last.set(k, t);
        prevGrace.set(k, !!x.grace);
      }
      assert.ok(p.strokes.some((x) => x.src === "final" && x.tick === fp.last && x.role === "accent"), `${f.id} ${s} final`);
    }
  }
});

test("D532: the timpani: the home tonic and dominant only, and only at structural arrivals (the cadences home, the acts, the pedals, the final chord) and the rolls into them", () => {
  for (const f of WTC) {
    const home = homeTimpani(f.key);
    const arr = arrivals(f);
    const { beat, beatS } = clockOf(f);
    const near = (t: number) => arr.some((a) => a.midi !== null && (Math.abs(a.tick - t) <= Math.max(beat * 2, ((1.3 * 1.5) / beatS) * beat) || (a.kind === "pedal" && t >= a.tick && t <= (a.end ?? a.tick)) || (a.kind === "final" && t >= a.tick)));
    const timp = scorePlan(f, "timpani").strokes.filter((x) => x.piece === "timp");
    assert.ok(timp.length > 0, f.id);
    for (const x of timp) {
      assert.ok(x.midi === home.tonic || x.midi === home.dominant, `${f.id}: ${x.midi}`);
      assert.ok(near(x.tick), `${f.id}: a timpani stroke at bar ${(x.tick / f.barTicks + 1).toFixed(2)} away from any arrival`);
    }
    // Each arrival with a drum: its drum is the bass's own there (the tonic's or the dominant's pitch class).
    const line = bassLine(f);
    for (const a of arr.filter((a) => a.midi !== null)) {
      const b = line.filter((n) => n.on <= a.tick + 1 && n.on + n.dur > a.tick + 1).pop();
      assert.ok(b && b.midi % 12 === a.midi! % 12, `${f.id} ${a.kind} ${a.tick}`);
    }
    // The final chord on the tonic (its bass the tonic in all 48).
    assert.equal(arr.find((a) => a.kind === "final")!.drum, "tonic", f.id);
  }
});

test("D532: score-driven, not looped: the bass's accents on the bass line's own attacks, the subject's on its entries' attacks, the cadences struck; no two bars alike throughout", () => {
  for (const f of WTC) {
    const line = new Set(bassLine(f).map((n) => n.on));
    for (const s of ["frame", "military", "janissary"] as const) {
      const p = scorePlan(f, s);
      for (const x of p.strokes.filter((x) => x.src === "bass")) assert.ok(line.has(x.tick), `${f.id} ${s}: a bass accent off the bass line`);
      const onsets = new Set(f.entries.flatMap((e) => (f.voices[e.voice] ?? []).filter((n) => n[0] >= e.on && n[0] < e.end).map((n) => n[0])));
      for (const x of p.strokes.filter((x) => x.src === "subject")) assert.ok(onsets.has(x.tick), `${f.id} ${s}: a subject stroke off the subject`);
      const cad = f.cadences.filter((c) => c.on < formOf(f).last - p.beat && c.kind === "perfect" && !(TWEAKS[f.id]?.skip ?? []).includes(c.bar));
      for (const c of cad) assert.ok(p.strokes.some((x) => x.src === "cadence" && x.tick === c.on), `${f.id} ${s}: cadence bar ${c.bar}`);
      // Not a loop: the bars' patterns (onsets within the bar) differ.
      const bars = new Map<number, string[]>();
      for (const x of p.strokes) {
        const b = Math.floor(x.tick / f.barTicks);
        bars.set(b, [...(bars.get(b) ?? []), `${x.piece}${x.tick % f.barTicks}`]);
      }
      const kinds = new Set([...bars.values()].map((v) => v.join()));
      assert.ok(kinds.size >= Math.min(bars.size * 0.25, 8), `${f.id} ${s}: ${kinds.size} patterns in ${bars.size} bars`);
    }
  }
});

test("D532: the strong beats follow the horizontal lines: a syncopated long bass note is struck where it falls (I/1 bar 10's minim on beat 3, I/5's dotted quaver on beat 3)", () => {
  const at = (id: string, bar: number, beatPos: number, style = "tabor" as const) => {
    const f = fugueById(id);
    const { beat } = clockOf(f);
    const t = f.bars.find((b) => b.n === bar)!.on + beatPos * beat;
    return scorePlan(f, style).strokes.some((x) => x.src === "bass" && x.tick === t);
  };
  assert.ok(at("wtc1f01", 10, 2));
  assert.ok(at("wtc1f05", 9, 2));
  // And the running semiquavers of the bass leave the drum on the bar (II/16 bars 30-33).
  const f = fugueById("wtc2f16");
  const p = scorePlan(f, "castanets").strokes.filter((x) => x.src === "bass" && x.tick >= 29 * f.barTicks && x.tick < 33 * f.barTicks);
  assert.ok(p.length >= 3 && p.length <= 8, `${p.length}`);
});

test("D532: the form: the episodes thinner (no subject, fewer and softer accents), rolls into the acts' arrivals, humanised (no two strokes of a roll alike)", () => {
  for (const id of ["wtc1f05", "wtc2f16", "wtc1f15", "wtc2f22"]) {
    const f = fugueById(id);
    const fp = formOf(f);
    for (const s of SCORE_STYLES) {
      const p = scorePlan(f, s);
      const per = (ep: boolean) => {
        const bars = new Set<number>();
        let v = 0;
        for (const x of p.strokes) {
          if ((phaseAt(fp, x.tick).phase === "episode") !== ep || x.role === "roll" || x.src === "cadence") continue;
          bars.add(Math.floor(x.tick / f.barTicks));
          v += x.vel;
        }
        const nb = fp.seams.filter((z) => (z.kind === "episode") === ep && z.kind !== "coda").reduce((a, z) => a + (z.end - z.on) / f.barTicks, 0);
        return v / Math.max(1, nb);
      };
      assert.ok(per(true) < 0.75 * per(false), `${id} ${s}: episode ${per(true).toFixed(2)} vs subject ${per(false).toFixed(2)}`);
      assert.ok(!p.strokes.some((x) => x.src === "subject" && phaseAt(fp, x.tick).phase === "episode"), `${id} ${s}`);
      const roll = p.strokes.filter((x) => x.src === "roll");
      assert.ok(roll.length > 6, `${id} ${s}: rolls`);
      // Velocities rise across a roll and are uneven; the gaps uneven (the jitter).
      const vels = roll.slice(0, 8).map((x) => x.vel.toFixed(3));
      assert.ok(new Set(vels).size >= 6, `${id} ${s}: ${vels}`);
      const gaps = roll.slice(0, 8).map((x, i, a) => (i ? +(((x.tick - a[i - 1].tick) / p.beat) * p.beatS + x.dt - a[i - 1].dt).toFixed(4) : 0)).slice(1);
      assert.ok(new Set(gaps).size >= 3, `${id} ${s}: ${gaps}`);
    }
  }
});

test("D532: the side drum flams and ruffs, the castanets' carretillas, the field drums' rolls into cadences, the Janissaries' cymbals on the strongest", () => {
  const f = fugueById("wtc1f05");
  const mil = scorePlan(f, "military").strokes;
  assert.ok(mil.some((x) => x.dt < -0.02 && x.src === "bass"), "flam");
  assert.ok(mil.some((x) => x.dt < -0.05 && x.src === "cadence"), "ruff");
  assert.ok(scorePlan(fugueById("wtc2f16"), "castanets").strokes.filter((x) => x.src === "cadence" && x.role === "roll").length >= 4, "carretilla");
  assert.ok(scorePlan(f, "fieldDrums").strokes.some((x) => x.src === "cadence" && x.role === "roll"));
  assert.ok(scorePlan(fugueById("wtc2f05"), "janissary").strokes.some((x) => x.piece === "cymbals" && x.src === "bass"));
});

test("D533: tailored: every fugue where a score-driven style is the default or a curated pick has its own tweak, read from its score", () => {
  const need = new Set<string>();
  for (const f of WTC) {
    const sound = PIECE_SOUND[f.id] ?? "chip";
    const cur = [homeStyleFor(sound), ...curatedFor(f.id, sound)];
    if (cur.some((s) => isScoreStyle(s))) need.add(f.id);
  }
  for (const id of need) {
    assert.ok(TWEAKS[id], `${id} needs a tailored tweak`);
    assert.ok(TWEAKS[id].why.length >= 60, id);
  }
  for (const id of Object.keys(TWEAKS)) assert.ok(need.has(id), `${id}: a tweak for a fugue that offers no score-driven style first`);
  // The French overture, the gigues and the dances: their picks.
  assert.ok(FUGUE_PICKS.wtc1f05.includes("military"));
  assert.ok(FUGUE_PICKS.wtc1f15.includes("tabor") && FUGUE_PICKS.wtc2f15.includes("tabor"));
  assert.ok(FUGUE_PICKS.wtc2f16.includes("castanets"));
  assert.ok(need.size >= 20, `${need.size}`);
  // On the DRUMS menu: the sound's family, then the fugue's picks.
  const m = drumMenuFor("wtc1f15", "megaFm").map((x) => x.style);
  assert.ok(m.indexOf("tabor") < m.indexOf("rock"));
});

test("D532: through the one choke point: each beat's strokes scheduled by Chip.scheduleKitHit (voice kit), the tick each belongs to", async () => {
  setPreset("bachBrass");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  setBacking(true);
  const f = fugueById("wtc1f05");
  const b = beatOf(f);
  const compound = b.ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  for (const style of SCORE_STYLES) {
    setDrumStyle(f.id, style);
    chip.kitEvents.length = 0;
    let want = 0;
    const t0 = (chip.ctx as unknown as { currentTime: number }).currentTime + 0.5;
    for (let k = 0; k < 8 * b.perBar; k++) {
      const tick = k * b.ticks;
      const cx: GrooveContext = { tick, beat: b.ticks, fills: [], end: f.length, piece: f, dynDb: 0 };
      want += scoreBeat(f, style, tick, b.ticks, 1.11).length;
      assert.equal(chip.groove(t0 + k * 1.11, 1.11, k % b.perBar, Math.floor(k / b.perBar), b.perBar, compound, cx), true);
    }
    assert.equal(chip.kitEvents.length, want, style);
    assert.ok(want > 8, `${style}: ${want}`);
    for (const e of chip.kitEvents) assert.ok(e.voice === "kit" && e.style === style && e.tick >= 0 && e.vel > 0 && e.vel <= 1, JSON.stringify(e));
  }
  setBacking(false);
  setDrumStyle(f.id, HOME_ID);
});
