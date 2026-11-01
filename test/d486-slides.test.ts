/**
 * D486: the slide made forgiving, explained and coloured by its instrument. The thresholds (slide-rule.ts),
 * the gesture table (slide-sound.ts), the cues drawn at the thumb, and the simulated human slides' success
 * rates through the real judge on both phones (test/slide-sim.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLIDE, SLIDE_CUE, slideReach } from "../src/bench/slide-rule.ts";
import { GESTURE, intervalClass, slideFamily, slideGesture, stepAbove } from "../src/bench/slide-sound.ts";
import { scaleOfKey } from "../src/bench/drag.ts";
import { RULE_LEVELS } from "../src/bench/lite.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { CAUSES, PHONES, simulateSlides, sumSlides, type SlideCause } from "./slide-sim.ts";

test("D486: a slide arrives halfway to the next note in the thumb's own frame, at least 8 px", () => {
  const row = 22;
  // A step drawn 22 px up from the note held (y 200 → 178), the thumb landed on its block (off 0).
  const at = (y: number, off = 0) => slideReach({ y, curY: 200, nextY: 178, off, row });
  assert.equal(at(200).way, 1);
  assert.equal(at(200).need, 11, "half the interval");
  assert.equal(at(190).arrived, false, "10 px: not yet");
  assert.equal(at(189).arrived, true, "11 px: halfway");
  // Landed 7 px low (right by the strike's rule): measured from there, not from the block.
  assert.equal(at(196, 7).arrived, true, "halfway from where it landed");
  assert.equal(at(189, 7).travel, 18);
  // A small interval: at least SLIDE.minPx.
  assert.equal(slideReach({ y: 200, curY: 200, nextY: 194, off: 0, row }).need, SLIDE.minPx);
  // On the block itself, having moved half of minPx: arrived (a thumb that landed a little toward the next note).
  assert.equal(at(180, -14).arrived, true);
  assert.equal(at(186, -14).arrived, false, "4.5 px off the block");
  // Overshoot is no fault; a fling past the next note by more than max(2 rows, the interval) is too far.
  assert.equal(at(170).tooFar, false);
  assert.equal(at(178 - 44).tooFar, false);
  assert.equal(at(178 - 45).tooFar, true);
  // An armed slide is dropped under 60% of the need (a shake's return); 40% of it is an attempt (explained).
  assert.equal(at(194).back, true);
  assert.equal(at(193).back, false);
  assert.equal(at(196).tried, false);
  assert.equal(at(195.6).tried, true);
  // Down the screen: the same rule, mirrored.
  const down = slideReach({ y: 211, curY: 200, nextY: 222, off: 0, row });
  assert.deepEqual([down.way, down.arrived], [-1, true]);
  // A same-row semitone (drawn 4 px up): the way it lies from the thumb.
  assert.equal(slideReach({ y: 200, curY: 200, nextY: 196, off: 0, row }).way, 1);
});

test("D486: the cues' words are the game's, translated", () => {
  assert.deepEqual(Object.values(SLIDE_CUE), ["FURTHER", "TOO FAR", "TOO EARLY", "TOO LATE", "LIFTED", "LIFT TO TURN"]);
  for (const w of Object.values(SLIDE_CUE)) {
    assert.ok(PT[w], `pt: ${w}`);
    assert.ok(ES[w], `es: ${w}`);
  }
  const line = RULE_LEVELS.ladder.intermediate.find((l) => l.startsWith("SLIDES:"));
  assert.ok(line && line.includes("halfway") && line.includes("LIFT TO TURN"), "HOW TO PLAY says it in plain words");
  assert.ok(PT[line!] && ES[line!], "HOW TO PLAY's line in pt and es");
});

test("D486: each instrument family colours a slide its own way, by interval", () => {
  const c = scaleOfKey("C");
  const g = (id: string, from: number, to: number, ms = 500) => slideGesture(id, from, to, ms, c);
  const name = (id: string, from: number, to: number, ms = 500) => g(id, from, to, ms).name;
  // The harpsichord (the owner's): a quick trill to the note on a step or half step; the coulé, the Schleifer.
  assert.equal(name("harpsichordSampled", 60, 62), "Pralltriller");
  assert.equal(name("harpsichordSampled", 64, 65), "Pralltriller");
  assert.equal(name("harpsichordSampled", 64, 62), "Pralltriller");
  assert.deepEqual(g("harpsichordSampled", 64, 62), { kind: "notes", name: "Pralltriller", notes: [62, 64], eachS: GESTURE.eachMs / 1000 }, "on a falling second: N U N, U the note slid from");
  assert.equal(name("harpsichordSampled", 60, 64), "Schleifer");
  assert.equal(name("harpsichordSampled", 64, 60), "coulé");
  assert.equal(name("harpsichordSampled", 60, 67), "Schleifer");
  assert.equal(name("lute", 67, 60), "legato");
  // The piano: a crushed grace note, a turn into a leap; the organ: legato, coulé, mordent.
  assert.equal(name("pianoSampled", 60, 61), "legato");
  assert.equal(name("pianoSampled", 60, 62), "acciaccatura");
  assert.equal(name("pianoSampled", 60, 64), "acciaccatura");
  assert.equal(name("pianoSampled", 60, 67), "turn");
  assert.equal(name("organSampled", 60, 62), "legato");
  assert.equal(name("chamberOrgan", 60, 64), "coulé");
  assert.equal(name("chamberOrgan", 60, 67), "mordent");
  // Strings shift, voices portamento, the flute slurs or leans in from above.
  assert.equal(name("stringConsort", 60, 62), "shift");
  assert.equal(name("soloVoices", 60, 67), "portamento");
  assert.equal(name("traverso", 60, 62), "slur");
  assert.deepEqual(g("traverso", 60, 64), { kind: "notes", name: "appoggiatura", notes: [65], eachS: GESTURE.eachMs / 1000 });
  // The chips: a pitch slide on a step, an arpeggio sweep on a leap; Game Boy and tracker their pitch-slide; FM a bend; Moog and Tomita portamento.
  assert.equal(name("chip", 60, 62), "pitch slide");
  assert.equal(name("chip", 60, 67), "arpeggio");
  assert.equal(name("gameboy", 60, 67), "pitch slide");
  assert.equal(name("megaFm", 60, 64), "bend");
  assert.equal(name("tomita", 60, 64), "portamento");
  assert.equal(name("analog", 60, 64), "portamento");
  // Glides longer for larger intervals; a falling leap on the strings slower still.
  const tau = (id: string, a: number, b: number) => (g(id, a, b) as { tau: number }).tau;
  assert.ok(tau("tomita", 60, 62) < tau("tomita", 60, 64) && tau("tomita", 60, 64) < tau("tomita", 60, 67));
  assert.ok(tau("stringConsort", 67, 60) > tau("stringConsort", 60, 67));
  // Families and classes as named.
  assert.equal(slideFamily("harpsichordSampled"), "plucked");
  assert.equal(slideFamily("sid64"), "chip");
  assert.deepEqual([intervalClass(60, 61), intervalClass(60, 62), intervalClass(60, 64), intervalClass(60, 65)], ["half", "step", "third", "leap"]);
  assert.equal(stepAbove(64, c), 65);
  assert.equal(stepAbove(60, c), 62);
});

test("D486: a gesture is colour only: within 130 ms and a third of the note, none on a quick note", () => {
  const c = scaleOfKey("c");
  for (const id of ["harpsichordSampled", "lute", "pianoSampled", "chamberOrgan", "organSampled", "traverso", "chip", "sid64"])
    for (const [a, b] of [[60, 61], [60, 62], [62, 60], [60, 63], [63, 60], [60, 67], [67, 60], [60, 72]])
      for (const ms of [120, 210, 300, 600, 2000]) {
        const g = slideGesture(id, a, b, ms, c);
        if (g.kind === "notes") {
          const total = g.notes.length * g.eachS * 1000;
          assert.ok(total <= GESTURE.maxMs + 1e-6 && total <= GESTURE.maxShare * ms + 1e-6, `${id} ${a}→${b} ${ms} ms: ${g.name} ${total} ms`);
          assert.ok(ms >= GESTURE.minNoteMs, `${id}: none on a quick note`);
        }
        if (g.kind === "glide") assert.ok(g.tau <= 0.095 && g.tau <= (0.25 * ms) / 1000 + 1e-9, `${id} glide ${g.tau}`);
      }
});

// ---- Simulated human slides through the real judge (both phones, five pieces). ----

const rate = (cause: SlideCause, bars = 8) => sumSlides(PHONES.flatMap((ph) => (["wtc1f02", "wtc2f12", "wtc1f22"] as const).map((id, k) => simulateSlides(id, [0, 0, 2][k], cause, ph, 1, { bars }))));

test("D486: simulated slides succeed whatever the reasonable way of going wrong (both phones)", () => {
  // Before D486 (the same players, 16 bars, five pieces, seeds 1–3): clean 92.0%, relative 62.2%, short 24.4%,
  // overshoot 93.3%, early 80.9%, late 83.0%, sideways 94.7%, pause 85.5%, run 75.1% (after: 96.6–100%, late 91.3%).
  const floor: Record<SlideCause, number> = { clean: 0.98, relative: 0.97, short: 0.9, overshoot: 0.97, early: 0.97, late: 0.8, sideways: 0.97, pause: 0.97, run: 0.95, lifted: 0, fling: 0, back: 0 };
  for (const cause of CAUSES) {
    const r = rate(cause);
    assert.ok(r.attempts >= 20, `${cause}: ${r.attempts} slides tried`);
    assert.ok(r.ok / r.attempts >= floor[cause], `${cause}: ${r.ok}/${r.attempts}`);
    // The struck notes around them are unharmed, and a slide is never taken for a shake more than rarely.
    assert.ok(r.struckRight / r.struck >= 0.99, `${cause}: struck ${r.struckRight}/${r.struck}`);
    assert.ok(r.orns <= Math.max(2, 0.02 * r.attempts), `${cause}: ${r.orns} ornaments read`);
    // Every failed slide is told why.
    const told = Object.values(r.why).reduce((a, b) => a + b, 0);
    assert.ok(told >= 0.9 * (r.attempts - r.ok), `${cause}: ${told} told of ${r.attempts - r.ok} failed`);
  }
});

test("D486: a slide that fails says why at the thumb: LIFTED, TOO FAR, LIFT TO TURN, TOO LATE", () => {
  const lifted = rate("lifted");
  assert.ok((lifted.why.lifted ?? 0) >= 0.9 * lifted.attempts, JSON.stringify(lifted.why));
  const fling = rate("fling");
  assert.equal(fling.ok, 0, "flung far past: no slide");
  assert.ok((fling.why.far ?? 0) >= 0.9 * fling.attempts, JSON.stringify(fling.why));
  const back = rate("back");
  assert.ok((back.why.oneway ?? 0) >= 0.4 * back.attempts, JSON.stringify(back.why));
  const late = rate("late");
  assert.ok((late.why.late ?? 0) >= 0.8 * (late.attempts - late.ok), JSON.stringify(late.why));
});
