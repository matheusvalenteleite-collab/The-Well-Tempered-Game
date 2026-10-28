/**
 * D370 (Glenn's notes §4): the thumbs chosen by the music's intent, not by strict alternation: a join
 * only from one thumb to the other, the same thumb only with time to lift and land again, a joined leap
 * only by a thumb free to prepare it; the best plan and the next good ones. Glenn's worked examples
 * (Invention 1 bars 1–2, I/2's subject in each reading, II/18 bars 1–4) planned as his or at a cost as
 * good, and every plan playable at 100% by a simulated preparer (tools/lab/lab-synth.ts synthEvents).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { readingsOf, type Reading } from "../src/touch/readings.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { intentsOf, PLAN_EPSILON, PLAN_K, planCost, planFingerings, planTouches, SAME_THUMB_MIN_S, type Fingering, type PlanNote, type Thumb } from "../src/bench/fingering.ts";
import { MECH_DEFAULTS } from "../src/bench/mechanics.ts";
import { presetRow } from "../src/bench/lab/preset-table.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import { synthEvents, type SynthEvent, type SynthNote } from "../tools/lab/lab-synth.ts";

await loadExtras();

const sides = (s: string): Thumb[] => [...s].map((c) => (c === "L" ? "left" : "right"));
const letters = (f: Fingering) => f.touches.map((t) => (t.side === "left" ? "L" : "R")).join("");

/** A voice's notes in bars b0..b1 as the plan reads them (seconds at `bpm`), its intents given or from a reading's first entry. */
function line(id: string, v: number, b0: number, b1: number, bpm: number, r: Reading | null, intent?: (n: readonly number[], next: readonly number[] | undefined, tpq: number) => PlanNote["intent"]): PlanNote[] {
  const f = fugueById(id);
  const on0 = f.bars.find((b) => b.n === b0)!.on;
  const on1 = f.bars.find((b) => b.n === b1 + 1)?.on ?? Infinity;
  const ns = f.voices[v].filter((n) => n[0] >= on0 && n[0] < on1);
  const e = [...f.entries].filter((x) => !x.theme && x.voice === v).sort((a, b) => a.on - b.on)[0];
  const place = new Map((e?.notes ?? []).map((n, j) => [n[0], j]));
  const spt = 60 / bpm / f.tpq;
  return ns.map((n, i) => {
    const j = place.get(n[0]);
    const rn = r && j !== undefined ? r.notes[j] : undefined;
    return { at: n[0] * spt, dur: n[1] * spt, step: n[3], join: rn?.join ?? null, short: rn?.short ?? null, accent: rn?.accent ?? null, ...(intent ? { intent: intent(n, ns[i + 1], f.tpq) } : {}) };
  });
}

/** No join on one thumb; the same thumb never quicker than SAME_THUMB_MIN_S; the plans within ε, best first. */
function sound(ns: PlanNote[], fs: Fingering[], what: string) {
  const it = intentsOf(ns);
  assert.ok(fs.length >= 1 && fs.length <= PLAN_K, what);
  fs.forEach((f, k) => {
    assert.ok(f.cost <= fs[0].cost + PLAN_EPSILON + 1e-9 && (k === 0 || f.cost >= fs[k - 1].cost), `${what}: best first, within ε`);
    f.touches.forEach((t, i) => {
      if (!i || t.slid || t.side !== f.touches[i - 1].side) return;
      assert.notEqual(it[i - 1], "join", `${what} plan ${k + 1}: a join on one thumb at ${i}`);
      assert.ok(ns[i].at - ns[i - 1].at >= SAME_THUMB_MIN_S - 1e-9, `${what} plan ${k + 1}: one thumb too quick at ${i}`);
      // The thumb lets go before it lands again.
      assert.ok(f.touches[i - 1].off < t.on, `${what} plan ${k + 1}: lifted before landing again at ${i}`);
    });
  });
  assert.equal(new Set(fs.map(letters)).size, fs.length, `${what}: the plans differ`);
}

// Glenn's tables (his intent plans, ✗ marks dropped).
const INVENTION = "LRLRLRLLLLRRLRLRLRLLLLL";
const I2_BODKY = "LRLLLLRLLLLRLLRLRLRL";
const II18_BODKY_LEAPS = "LRLRRRRLRLRL";

test("D370: Invention 1 bars 1–2 (semiquavers joined, quavers detached, ♩ = 72): Glenn's plan or one as good; the joined semiquavers alternate, the quavers by one thumb", () => {
  const ns = line("bwv772", 0, 1, 2, 72, null, (n, next, tpq) => (next && n[1] < tpq / 2 && next[1] < tpq / 2 ? "join" : "detach"));
  assert.equal(ns.length, INVENTION.length);
  const fs = planFingerings(ns, { overlap: 0.03 });
  sound(ns, fs, "Invention 1");
  const glenn = planCost(ns, sides(INVENTION), { overlap: 0.03 });
  assert.ok(fs[0].cost <= glenn + 1e-9 && glenn <= fs[0].cost + PLAN_EPSILON, `best ${fs[0].cost}, Glenn's ${glenn}`);
  // The quavers G C B C: three or more by one thumb (its lift the detachment).
  const q = letters(fs[0]).slice(7, 11);
  assert.ok(/(L{3}|R{3})/.test(q), q);
  assert.ok(fs[0].name !== "HANDOVERS");
});

test("D370: I/2's subject in each reading (and none): no join on one thumb; Bodky's as Glenn's or as good; the mordent figures alternate", () => {
  const id = "wtc1f02";
  const e = [...fugueById(id).entries].filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
  for (const r of [null, ...readingsOf(id)]) {
    const ns = line(id, e.voice, 1, 3, tempoOf(id), r).slice(0, e.notes.length);
    const fs = planFingerings(ns, { overlap: 0.03 });
    sound(ns, fs, `I/2 ${r?.id ?? "none"}`);
    if (!r) assert.equal(letters(fs[0]), "LR".repeat(10), "no reading: every note joined, every note the other thumb");
    if (r) for (const s of r.slurs) for (let i = s.from; i < s.to; i++) assert.notEqual(fs[0].touches[i].side, fs[0].touches[i + 1].side, `${r.id}: slur ${s.from}-${s.to}`);
    if (r?.id === "bodky") {
      const glenn = planCost(ns, sides(I2_BODKY), { overlap: 0.03 });
      assert.ok(Number.isFinite(glenn) && fs[0].cost <= glenn + 1e-9 && glenn <= fs[0].cost + PLAN_EPSILON, `Bodky: best ${fs[0].cost} ${letters(fs[0])}, Glenn's ${glenn}`);
    }
  }
});

test("D370: II/18 bars 1–4: every reading all joined, so the thumbs alternate (forced and right); with Bodky's leaps apart, one thumb takes them (Glenn's plan)", () => {
  const id = "wtc2f18";
  for (const r of [null, ...readingsOf(id)]) {
    const ns = line(id, 0, 1, 4, tempoOf(id), r);
    const fs = planFingerings(ns, { overlap: 0.03 });
    sound(ns, fs, `II/18 ${r?.id ?? "none"}`);
    assert.equal(fs[0].name, "HANDOVERS");
    assert.equal(letters(fs[0]), "LR".repeat(ns.length / 2));
  }
  // Glenn's second reading of Bodky: leaps of a fourth and more apart.
  const ns = line(id, 0, 1, 4, 83, null, (n, next) => (next && Math.abs(next[3] - n[3]) < 3 ? "join" : "detach"));
  const fs = planFingerings(ns, { overlap: 0.03 });
  sound(ns, fs, "II/18 leaps apart");
  assert.equal(letters(fs[0]).slice(0, 12), II18_BODKY_LEAPS);
  assert.equal(fs[0].name, "ONE-THUMB LEAPS");
});

test("D370: every reading's subject in the 48: no plan joins on one thumb, none needs a thumb quicker than it can lift", () => {
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f07", "wtc1f15", "wtc1f20", "wtc1f21", "wtc1f24", "wtc2f05", "wtc2f07", "wtc2f22", "wtc2f24"]) {
    const f = fugueById(id);
    const e = [...f.entries].filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
    const spt = 60 / tempoOf(id) / f.tpq;
    for (const r of readingsOf(id)) {
      const ns: PlanNote[] = e.notes.map((n, i) => ({ at: n[0] * spt, dur: n[1] * spt, step: n[3], join: r.notes[i]?.join ?? null, short: r.notes[i]?.short ?? null, accent: r.notes[i]?.accent ?? null }));
      sound(ns, planFingerings(ns, { overlap: 0.03 }), `${id} ${r.id}`);
    }
  }
});

test("D370: strict alternation where the plan is all joins; a slide where taught still slides; the first thumb given is kept", () => {
  const ns: PlanNote[] = [0, 1, 2, 3, 4].map((k) => ({ at: k * 0.3, dur: 0.3, step: 10 + k }));
  assert.equal(planTouches(ns, { overlap: 0.02 }).map((t) => t.side[0]).join(""), "lrlrl");
  assert.equal(planTouches(ns, { overlap: 0.02, first: "right" })[0].side, "right");
  const sl = planTouches(ns, { overlap: 0.02, slides: true });
  assert.ok(sl.slice(1).every((t) => t.slid && t.side === sl[0].side));
});

/**
 * A preparer playing a plan: a note joined from the other thumb's is rested on early (5–9 ms after that
 * one sounds) and sounds by its lift (a pull-off), the first two struck; a note by the same thumb, or after
 * a gap, struck at its time, the thumb before lifting at three fifths.
 */
function synthPlanned(p: LabPassage, plan: (notes: SynthNote[], spt: number) => { sides: Thumb[]; intents: PlanNote["intent"][] }) {
  return synthEvents(p, 5, (notes, t, rand, rows) => {
    const spt = t(notes[1].on) - t(notes[0].on) > 0 ? (t(notes[1].on) - t(notes[0].on)) / (notes[1].on - notes[0].on) : 0.001;
    const { sides: sd, intents } = plan(notes, spt);
    const evs: SynthEvent[] = [];
    const land: number[] = [];
    const sound: number[] = [];
    const prepared = (i: number) => i >= 2 && sd[i] !== sd[i - 1] && intents[i - 1] === "join";
    notes.forEach((n, i) => {
      const at = t(n.on) + rand() * 0.004;
      if (prepared(i)) (land[i] = sound[i - 1] + 0.006 + rand() * 0.003), (sound[i] = at);
      else land[i] = sound[i] = at;
    });
    notes.forEach((n, i) => {
      const next = notes[i + 1];
      let lift: number;
      if (!next) lift = t(n.on + n.dur) - 0.02;
      else if (prepared(i + 1)) lift = sound[i + 1];
      else if (sd[i + 1] !== sd[i] && intents[i] === "join") lift = land[i + 1] + 0.001;
      else lift = sound[i] + Math.max(0.05, (t(next.on) - t(n.on)) * 0.6);
      const x = sd[i] === "left" ? 40 : 804;
      evs.push({ t: land[i], k: 1, kind: "d", id: i + 1, side: sd[i], x, y: rows.yOf(n.step) + rand() * 3 });
      evs.push({ t: Math.max(lift, land[i] + 0.03), k: 0, kind: "u", id: i + 1 });
    });
    return evs;
  });
}

test("D370: every plan above played by the simulated preparer at 100% (any thumb counts: LADDER does not ask which)", () => {
  const cases: { p: LabPassage; reading: Reading | null; intent?: (n: SynthNote, next: SynthNote | undefined, tpq: number) => PlanNote["intent"] }[] = [];
  const pass = (piece: string, voice: number, toBar: number, reading: string | null, bpm = tempoOf(piece)): LabPassage => ({ piece, voice, fromBar: 1, toBar, bpm, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading });
  cases.push({ p: pass("bwv772", 0, 2, null, 72), reading: null, intent: (n, next, tpq) => (next && n.dur < tpq / 2 && next.dur < tpq / 2 ? "join" : "detach") });
  const e2 = [...fugueById("wtc1f02").entries].filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
  for (const r of [null, ...readingsOf("wtc1f02")]) cases.push({ p: pass("wtc1f02", e2.voice, 3, r?.id ?? null), reading: r });
  for (const r of [null, ...readingsOf("wtc2f18")]) cases.push({ p: pass("wtc2f18", 0, 4, r?.id ?? null), reading: r });
  cases.push({ p: pass("wtc2f18", 0, 4, null, 83), reading: null, intent: (n, next) => (next && Math.abs(next.step - n.step) < 3 ? "join" : "detach") });
  for (const c of cases) {
    const f = fugueById(c.p.piece);
    const e = [...f.entries].filter((x) => !x.theme && x.voice === c.p.voice).sort((a, b) => a.on - b.on)[0];
    const place = new Map((e?.notes ?? []).map((n, j) => [n[0], j]));
    for (const k of [0, 1]) {
      let used: Fingering[] = [];
      const log = synthPlanned(c.p, (notes, spt) => {
        const ns: PlanNote[] = notes.map((n, i) => {
          const j = place.get(n.on);
          const rn = c.reading && j !== undefined ? c.reading.notes[j] : undefined;
          return { at: n.on * spt, dur: n.dur * spt, step: n.step, join: rn?.join ?? null, short: rn?.short ?? null, accent: rn?.accent ?? null, ...(c.intent ? { intent: c.intent(n, notes[i + 1], f.tpq) } : {}) };
        });
        used = planFingerings(ns, { overlap: 0.03 });
        const fg = used[Math.min(k, used.length - 1)];
        return { sides: fg.touches.map((x) => x.side), intents: intentsOf(ns) };
      });
      const row = presetRow(log, MECH_DEFAULTS);
      const n = row.right + row.wrong + row.missed;
      assert.ok(n > 10);
      assert.equal(row.right, n, `${c.p.piece} ${c.p.reading ?? (c.intent ? "intent" : "none")} plan ${k + 1} (${used[Math.min(k, used.length - 1)]?.name}): ${JSON.stringify(row)}`);
    }
  }
});
