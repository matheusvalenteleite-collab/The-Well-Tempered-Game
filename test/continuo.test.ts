import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { parsePitch } from "../src/music/pitch.ts";
import { realizeContinuo, inputFromSolution, sungNotes, DEFAULTS, type ContinuoInput, type ContinuoRealization, type FinalsMode } from "../src/continuo/index.ts";
import { chooseChord, frameAt, frameConsonant, letterForms, mod, pcDistance } from "../src/continuo/frame.ts";
import type { CounterpointInput } from "../src/counterpoint/rules/types.ts";

const repo = loadFuxRepository();
const SOLUTIONS = repo.dataset.solutions.filter((s) => s.species === "first" || s.species === "second");
const WIN = { low: parsePitch(DEFAULTS.window.low).midi, high: parsePitch(DEFAULTS.window.high).midi };
const FINALS: FinalsMode[] = ["organist", "strict"];

const soundingAt = (r: ContinuoRealization, t: number, roles: string[]) =>
  r.events.filter((e) => roles.includes(e.role) && e.startBeat <= t && t < e.startBeat + e.durationBeats).flatMap((e) => e.midi);
const clash = (a: number, b: number) => pcDistance(a, b) === 1 || pcDistance(a, b) === 2;

/** All structural checks of Part B; returns nothing, throws on failure. */
function check(input: ContinuoInput, r: ContinuoRealization, label: string, win = WIN) {
  const { notes } = sungNotes(input);
  for (const bar of r.bars) {
    const t = 2 * bar.bar;
    const f = frameAt(notes, t);
    if (!f) continue;
    const rh = soundingAt(r, t, ["rh", "doubling"]);
    const bass = soundingAt(r, t, ["bass"]);
    const played = new Set([...rh, ...bass].map((m) => mod(m, 12)));
    // Every downbeat chord contains all sung pitch classes, or the bar is flagged.
    if (!bar.fallback) for (const n of f.sounding) assert.ok(played.has(mod(n.pitch.midi, 12)), `${label} bar ${bar.bar}: ${n.pitch.name} missing from ${bar.figure}`);
    // No right-hand note clashes with a sung note at a consonant downbeat.
    // A prepared 7-6 or 9-8 suspension is a dissonance against the bass by design (A6), never against an upper voice.
    const suspended = bar.device === "76" || bar.device === "98";
    if (frameConsonant(f)) for (const m of rh) for (const n of f.sounding) if (!(suspended && n === f.bass)) assert.ok(!clash(m, n.pitch.midi), `${label} bar ${bar.bar}: RH ${m} clashes with ${n.pitch.name}`);
  }
  for (const e of r.events) {
    if (e.role === "bass") continue;
    for (const m of e.midi) {
      assert.ok(m >= win.low && m <= win.high, `${label} beat ${e.startBeat}: RH ${m} outside the window`);
      // Above the continuo bass for the whole of its length.
      for (let t = e.startBeat; t < e.startBeat + e.durationBeats; t += 0.5)
        for (const b of soundingAt(r, t, ["bass"])) assert.ok(m > b, `${label} beat ${t}: RH ${m} not above the bass ${b}`);
    }
  }
  // At every sung onset inside a bar (second species), no clash when the sonority is consonant.
  for (const t of [...new Set(notes.map((n) => n.start))].filter((t) => t % 2 !== 0)) {
    const f = frameAt(notes, t)!;
    const rh = soundingAt(r, t, ["rh", "doubling"]);
    if (frameConsonant(f)) for (const m of rh) for (const n of f.sounding) assert.ok(!clash(m, n.pitch.midi), `${label} beat ${t}: RH ${m} clashes with ${n.pitch.name}`);
    // Passing notes never clash with any sung note, consonant sonority or not.
    for (const e of r.events.filter((x) => x.label === "pass" && x.startBeat === t))
      for (const m of e.midi) for (const n of f.sounding) assert.ok(pcDistance(m, n.pitch.midi) > 2, `${label} beat ${t}: passing ${m} against ${n.pitch.name}`);
  }
}

function finalPcs(r: ContinuoRealization): Set<number> {
  const t = r.totalBeats - 2;
  return new Set([...soundingAt(r, t, ["rh", "doubling"]), ...soundingAt(r, t, ["bass"])].map((m) => mod(m, 12)));
}

test("continuo: every first- and second-species Fux solution, both finals", () => {
  assert.equal(SOLUTIONS.length, 22);
  const rows: string[] = [];
  for (const sol of SOLUTIONS) {
    const input = inputFromSolution(sol);
    for (const finals of FINALS) {
      const label = `${sol.id} (${finals})`;
      const r = realizeContinuo(input, { finals });
      check(input, r, label);
      // Deterministic.
      assert.equal(JSON.stringify(realizeContinuo(input, { finals })), JSON.stringify(r), `${label}: not deterministic`);
      // Finals.
      const root = parsePitch(`${sol.modal_final}4`).midi % 12;
      const pcs = finalPcs(r);
      const last = r.bars[r.bars.length - 1];
      if (finals === "organist") assert.deepEqual([...pcs].sort((a, b) => a - b), [root, (root + 4) % 12, (root + 7) % 12].sort((a, b) => a - b), `${label}: final triad`);
      else if (last.notes.some((n) => n.includes("major third instead of the fifth"))) assert.deepEqual([...pcs].sort((a, b) => a - b), [root, (root + 4) % 12].sort((a, b) => a - b), `${label}: strict final with third`);
      else assert.deepEqual([...pcs].sort((a, b) => a - b), [root, (root + 7) % 12].sort((a, b) => a - b), `${label}: strict final`);
      assert.ok(!last.fallback, `${label}: the final bar fell back`);
      if (finals === "organist") rows.push(`${sol.id.replace("_solution", "").padEnd(16)} ${sol.species.padEnd(7)} ${sol.modal_final}  cantus ${sol.cantus_voice.padEnd(5)}  bass -${r.bassOctaves} oct  fallback ${r.stats.fallbackBars}  ‖5/8 with bass ${r.stats.parallels.withBass}  ‖5 with sung ${r.stats.parallels.withSung}  passing ${r.events.filter((e) => e.label === "pass").length}`);
    }
  }
  console.log(`\ncontinuo summary (organist finals)\n${rows.join("\n")}\n`);
});

const D_CF = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];
const firstSpecies = (cf: string[], cp: string[], cantusVoice: "upper" | "lower" = "lower"): CounterpointInput => ({
  species: "first",
  modalFinal: "D",
  cantusVoice,
  cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })),
  counterpoint: cp.map((p) => ({ pitch: p, duration: "1/1" })),
});

test("continuo: A2 chord table", () => {
  const frame = (bass: string, upper: string) => {
    const notes = sungNotes(firstSpecies([bass], [upper])).notes;
    return { frame: frameAt(notes, 0)!, forms: letterForms(notes, 0, 2) };
  };
  const chord = (bass: string, upper: string, next: string | null = null) => {
    const { frame: f, forms } = frame(bass, upper);
    return chooseChord({ frame: f, forms, nextBass: next ? parsePitch(next) : null });
  };
  assert.equal(chord("D3", "B3").figure, "6/3");
  assert.equal(chord("D3", "A3").figure, "5/3");
  assert.equal(chord("D3", "F4").figure, "5/3");
  assert.equal(chord("B2", "D4").figure, "6/3", "(a) B natural");
  assert.equal(chord("E3", "G3", "F3").figure, "6/3", "(b) mi to fa");
  assert.equal(chord("E3", "G3", "D3").figure, "5/3");
  assert.equal(chord("C#3", "E3").figure, "6/3", "(c) sharped bass");
  // Ficta of the sung voices enters the chord; nothing else is added.
  assert.deepEqual(chord("E3", "C#4").tones.map((t) => t.step + t.alter), ["E0", "G0", "C1"]);
  // A fourth or a second over the bass cannot be harmonized by the table.
  assert.equal(chord("D3", "G3").valid, false);
  assert.equal(chord("D3", "E3").valid, false);
});

test("continuo: A2 finals", () => {
  const final = (bass: string, upper: string, mode: FinalsMode, modalFinal: "D" | "E" | "F" = "D") => {
    const notes = sungNotes(firstSpecies([bass], [upper])).notes;
    return chooseChord({ frame: frameAt(notes, 0)!, forms: letterForms(notes, 0, 2), nextBass: null, final: { mode, modalFinal } });
  };
  assert.equal(final("D3", "D4", "organist").figure, "5/♯3");
  assert.equal(final("E3", "E4", "organist", "E").tones.map((t) => t.step + (t.alter ? "#" : "")).join(" "), "E G# B");
  assert.equal(final("F3", "F4", "organist", "F").figure, "5/3");
  assert.equal(final("D3", "D4", "strict").figure, "8/5");
  // A sung minor third is kept, never contradicted.
  const minor = final("D3", "F4", "organist");
  assert.ok(minor.valid && minor.tones.some((t) => t.step === "F" && t.alter === 0));
});

test("continuo: odd downbeats fall back to colla parte without adding clashes", () => {
  // A player's oddities: a fourth (G over D) and a second (E over D) on downbeats.
  const cp = ["A4", "A4", "G4", "G4", "B4", "C5", "C5", "B4", "D5", "C#5", "D5"];
  const input = firstSpecies(D_CF, cp);
  const r = realizeContinuo(input);
  const bar3 = r.bars[3];
  assert.equal(bar3.fallback, true);
  assert.equal(bar3.figure, "c.p.");
  const { notes } = sungNotes(input);
  const sung = frameAt(notes, 6)!.sounding.map((n) => n.pitch.midi);
  const rh = soundingAt(r, 6, ["rh", "doubling"]);
  assert.ok(rh.length > 0);
  // Only the sung pitch classes (and at most consonant chord tones) appear; G over D adds B (6/4).
  for (const m of rh) assert.ok(sung.some((s) => mod(s, 12) === mod(m, 12)) || sung.every((s) => !clash(m, s)));
  assert.ok(r.events.some((e) => e.bar === 3 && e.role === "doubling"));
  check(input, r, "colla parte");
});

test("continuo: three sung voices with three pitch classes use exactly their set", () => {
  const input: ContinuoInput = {
    modalFinal: "D",
    voices: [
      { id: "bass", notes: ["D3", "G3", "A3", "D3"].map((p) => ({ pitch: p, duration: "1/1" })) },
      { id: "tenor", notes: ["A3", "B3", "C#4", "A3"].map((p) => ({ pitch: p, duration: "1/1" })) },
      { id: "alto", notes: ["F4", "D4", "E4", "F#4"].map((p) => ({ pitch: p, duration: "1/1" })) },
    ],
  };
  const r = realizeContinuo(input);
  assert.deepEqual(r.bars[0].chord, ["D", "F", "A"]);
  assert.deepEqual(r.bars[1].chord, ["G", "B", "D"]);
  assert.deepEqual(r.bars[2].chord, ["A", "C#", "E"]);
  check(input, r, "three voices");
});

test("continuo: second species with a half rest takes the sounding voice as bass", () => {
  const sol = repo.getSolution("fux_2v_fig_035")!;
  const r = realizeContinuo(inputFromSolution(sol));
  // The cantus (upper, D4) is the only voice at the first downbeat.
  assert.equal(r.bars[0].bass, `D${4 - r.bassOctaves}`);
  // Then the counterpoint enters below it and becomes the bass on the upbeat.
  const bass = r.events.filter((e) => e.role === "bass" && e.bar === 0);
  assert.deepEqual(bass.map((e) => e.startBeat), [0, 1]);
});

test("continuo: options are honoured", () => {
  const sol = repo.getSolution("fux_2v_fig_036")!;
  const input = inputFromSolution(sol);
  const noFill = realizeContinuo(input, { passingFill: false });
  assert.equal(noFill.events.filter((e) => e.label === "pass").length, 0);
  const atPitch = realizeContinuo(input, { bassOctaves: 0, window: { low: "C4", high: "G5" } });
  assert.equal(atPitch.bassOctaves, 0);
  check(input, atPitch, "window C4..G5", { low: 60, high: 79 });
  assert.throws(() => realizeContinuo(input, { window: { low: "C4", high: "F4" } }));
});

test("continuo A6: partimento devices are applied, prepared, resolved, and never rub against an upper voice", () => {
  const count: Record<string, number> = {};
  for (const sol of SOLUTIONS) {
    const input = inputFromSolution(sol);
    const r = realizeContinuo(input);
    const { notes } = sungNotes(input);
    for (const bar of r.bars) {
      if (!bar.device) continue;
      count[bar.device] = (count[bar.device] ?? 0) + 1;
      const t = 2 * bar.bar;
      const f = frameAt(notes, t)!;
      for (const m of soundingAt(r, t, ["rh"])) for (const u of f.uppers) assert.ok(!clash(m, u.pitch.midi), `${sol.id} bar ${bar.bar} ${bar.device}: RH ${m} against ${u.pitch.name}`);
      if (bar.device === "43" || bar.device === "76" || bar.device === "98") {
        // The suspension sounds before the downbeat (prepared) and leaves by step down on the upbeat.
        const held = r.events.filter((e) => e.role === "rh" && e.startBeat < t && e.startBeat + e.durationBeats === t + 1);
        assert.ok(held.length > 0, `${sol.id} bar ${bar.bar}: no prepared suspension`);
      }
    }
    assert.deepEqual(realizeContinuo(input), r);
    const off = realizeContinuo(input, { partimento: false });
    assert.ok(off.bars.every((b) => !b.device));
  }
  // Fux's two-voice cadences put the bass on 2 or 7 (never 5), and a sung leading tone forbids the 7-6 there,
  // so suspensions are rarer than 5-6; both must occur.
  assert.ok((count["43"] ?? 0) + (count["76"] ?? 0) + (count["98"] ?? 0) > 0 && (count["56"] ?? 0) > 0, JSON.stringify(count));
  console.log("partimento devices over Fux's solutions:", JSON.stringify(count));
});
