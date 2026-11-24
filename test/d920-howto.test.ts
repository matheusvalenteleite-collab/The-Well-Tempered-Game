/**
 * D920–D922: HOW TO PLAY, BASICS v2's written companion. PART A mirrors BASICS' acts in their order; every TRY IT
 * is a BASICS stage, run on the game's engine as BASICS runs its DO, and a careful player passes the first four
 * acts' pads; every word in three languages; the rules the cards state are the code's (the numbers checked here);
 * nothing retired is mentioned, and holding a note to sound the next by lifting is not taught.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
register("./tsx-hooks.mjs", import.meta.url);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D920: PART A is BASICS' acts, in their order; every TRY IT a BASICS stage of the same act", async () => {
  const { PLAY } = await import("../src/bench/howto-text.ts");
  const { ACTS } = await import("../src/bench/basics/plan.ts");
  assert.deepEqual(
    PLAY.map((c) => c.title.en),
    ACTS.map((a) => a.title),
  );
  PLAY.forEach((ch, k) => {
    for (const c of ch.cards)
      for (const t of c.tries ?? []) {
        const st = ACTS[k].stages.find((s) => s.id === t.stage);
        assert.ok(st, `${c.id}: ${t.stage} is act ${k + 1}'s`);
      }
  });
  // Every station of MAKE IT SING has its pad (piano ×3, harpsichord, solo voices, GAME BOY, PSYCH).
  const sing = PLAY[5].cards.flatMap((c) => (c.tries ?? []).map((t) => t.stage));
  assert.deepEqual(sing, ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7"]);
});

test("D921: a careful player passes the pads of acts I–IV, on the game's engine (BASICS' own rule judging)", async () => {
  const { PLAY } = await import("../src/bench/howto-text.ts");
  const { padGame, padStage } = await import("../src/bench/howto/TryPad.tsx");
  const { stagePassed } = await import("../src/bench/basics/plan.ts");
  const { LensTally } = await import("../src/bench/basics/lens.ts");
  const { fakeChip, ROWS } = await import("./d342-sim.ts");
  for (const ch of PLAY.slice(0, 4))
    for (const c of ch.cards)
      for (const t of c.tries ?? []) {
        const st = padStage(t);
        const clock = { t: 0 };
        const g = padGame(st, fakeChip(clock));
        g.rows = ROWS;
        const lens = new LensTally(g, () => clock.t * 1000);
        g.tap = lens.feed;
        g.lens = lens;
        g.wall = () => 0;
        const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
        const lastY = { left: 0, right: 0 };
        const lastStep: Record<"left" | "right", number> = { left: NaN, right: NaN };
        let k = 0;
        let done = false;
        let down: { id: number; upAt: number } | null = null;
        while (!done && clock.t < 200) {
          clock.t += 1 / 240;
          done = g.step();
          if (down && clock.t >= down.upAt) (g.up(down.id, 0), (down = null));
          const n = heads[k];
          if (!n || down) continue;
          const waiting = st.wait === "all" || k === 0;
          if (waiting ? g.now < n.on - 1 : clock.t < g.timeAt(n.on)) continue;
          k++;
          const side: "left" | "right" = st.side ?? (k % 2 ? "left" : "right");
          const prev = lastStep[side];
          const way = Number.isNaN(prev) ? 0 : Math.sign(n.step - prev);
          const y = Number.isNaN(prev) ? ROWS.yOf(n.step) : lastY[side] - way * ROWS.rowH * 3;
          lastY[side] = y;
          lastStep[side] = n.step;
          g.down(k, { side, x: side === "left" ? 120 : 680, y, w: 800, h: 1000 }, 0);
          const len = g.timeAt(n.on + n.dur) - g.timeAt(n.on);
          down = { id: k, upAt: clock.t + Math.max(0.05, len * 0.95) };
        }
        assert.ok(done, `${t.stage} ends`);
        assert.ok(stagePassed(st, g.results()), `${t.stage} passed`);
      }
});

test("D921: the later pads are a few bars, real Bach (5), BASICS' sound for each station (6)", async () => {
  const { PLAY } = await import("../src/bench/howto-text.ts");
  const { padStage } = await import("../src/bench/howto/TryPad.tsx");
  for (const ch of PLAY.slice(4))
    for (const c of ch.cards)
      for (const t of c.tries ?? []) {
        const st = padStage(t);
        assert.match(st.piece, /^bwv1080-/, `${t.stage}: The Art of Fugue`);
        assert.ok((st.toBar ?? 99) - (st.fromBar ?? 1) <= 5, `${t.stage}: a few bars`);
      }
  // Each station's pad plays the sound BASICS gives its stage (the pad follows BASICS: 6.6 GAME BOY's when the studio sets it).
  const { ACTS } = await import("../src/bench/basics/plan.ts");
  for (const c of PLAY[5].cards) for (const t of c.tries ?? []) assert.equal(padStage(t).sound, ACTS[5].stages.find((s) => s.id === t.stage)?.sound, t.stage);
  assert.match(src("src/bench/howto/TryPad.tsx"), /setPreset\(st\.sound \?\? "pianoSampled"\)/);
  // D691: no verdict words on the pads, as on BASICS' screen.
  assert.doesNotMatch(src("src/bench/howto/TryPad.tsx"), /g\.grade|g\.flash/);
});

test("D920: every word in three languages: the cards, the reference, the labels, the drawings", async () => {
  const { PLAY, REF, UI } = await import("../src/bench/howto-text.ts");
  const { DRAW_WORDS } = await import("../src/bench/howto/Drawings.tsx");
  const ts = [...PLAY.flatMap((ch) => [ch.title, ...(ch.intro ? [ch.intro] : []), ...ch.cards.flatMap((c) => [c.title, ...c.lead, ...(c.fine ? [c.fine] : []), ...(c.tries ?? []).map((t) => t.label)])]), ...REF.flatMap((r) => [r.title, ...r.lines]), ...Object.values(UI), ...DRAW_WORDS];
  for (const t of ts) for (const l of ["en", "pt", "es"] as const) assert.ok(t[l].trim().length > 0, `${t.en}: ${l}`);
  // One or two sentences a card (a fine line apart).
  for (const c of PLAY.flatMap((ch) => ch.cards)) assert.ok(c.lead.length <= 2, c.id);
});

test("D920: nothing retired, and no hold-and-lift-to-sound", async () => {
  const { HOWTO } = await import("../src/bench/howto-text.ts");
  const all = JSON.stringify(HOWTO);
  assert.doesNotMatch(all, /KRAUTROCK|UNLOCK|DESBLOQUE|TUTORIAL card/i);
  assert.doesNotMatch(all, /lift(ing)? (it|the thumb|your thumb)? ?to (sound|play)|sounds? when you lift|by lifting/i);
  assert.match(all, /PSYCH/);
  assert.match(all, /pass the note from one thumb to the other with no gap/);
});

test("D920: the rules the cards state are the code's", async () => {
  const { MECH_DEFAULTS } = await import("../src/bench/mechanics.ts");
  const { releaseVerdict } = await import("../src/bench/articulation.ts");
  const { PERFORMANCE_WEIGHTS, GOOD_TIMING, STREAK_STEP_NOTES, STREAK_STEP, STREAK_STEPS, gradeFor } = await import("../src/bench/scoring.ts");
  const { pulseWidth, strengthOf } = await import("../src/touch/touch-expr.ts");
  const { barDynamic } = await import("../src/bench/protos.ts");
  // DIRECTION: the same thumb's last touch; free after about three beats.
  assert.equal(MECH_DEFAULTS.directionRef, "own");
  assert.equal(MECH_DEFAULTS.ownFreshBeats, 3);
  // HOLDING: TOO SOON before half the note (the legato player's bounds, the default), REST! held through a rest.
  assert.equal(releaseVerdict(1000, 480, 0).hold, "short");
  assert.equal(releaseVerdict(1000, 980, 0).hold, "held");
  assert.equal(releaseVerdict(1000, 1600, 500).rest, "over");
  // SCORE AND GRADE.
  assert.deepEqual({ ...PERFORMANCE_WEIGHTS }, { notes: 60, timing: 15, touch: 15, entries: 10 });
  assert.equal(GOOD_TIMING, 0.75);
  assert.deepEqual([STREAK_STEP_NOTES, STREAK_STEP, STREAK_STEPS], [16, 0.1, 5]);
  assert.deepEqual([95, 94, 90, 80, 70, 69].map(gradeFor), ["S", "A", "A", "B", "C", "D"]);
  // STRONG by the box: the left bar's inner edge (by the box) strong, its outer edge soft.
  assert.ok(barDynamic(170, 800) > 0.9 && barDynamic(5, 800) < 0.1);
  // GAME BOY: the soft side the square (50%), the strong side the thin pulse (12.5%).
  assert.equal(pulseWidth(1 - strengthOf(1)), 0.5);
  assert.equal(pulseWidth(1 - 1), 0.125);
  // The guide's pads leave the piece its sound (the restore wired in BenchApp).
  assert.match(src("src/bench/BenchApp.tsx"), /<HowTo sound=\{\{ play: playClip, stop: stopHearing \}\} chip=\{ensureChip\} restore=\{\(\) => \(setPreset\(presetById\(soundNow\)\.id\), prepareSound\(\)\)\}/);
});
