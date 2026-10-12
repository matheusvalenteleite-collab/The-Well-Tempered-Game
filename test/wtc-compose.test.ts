import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUES, type WtcFugue, type WtcNote } from "../src/wtc/fugues.ts";
import { answerOptions, bachChoice, entryPoints, placeAnswer } from "../src/wtc/compose/answer.ts";
import { atPlace, dominantOf, emptyDraft, place, relativeOf, toKey, type Ev, type FugueDraft } from "../src/wtc/compose/model.ts";
import { judgeSubject } from "../src/wtc/compose/subject.ts";
import { placings } from "../src/wtc/compose/invertible.ts";
import { realise, ready } from "../src/wtc/compose/plan.ts";
import { judgeFugue } from "../src/wtc/compose/judge.ts";
import { fugueMidi } from "../src/wtc/compose/midi.ts";
import { asEvents } from "../src/wtc/compose/generate.ts";
import { proposeCountersubject, proposeFree } from "../src/wtc/compose/proposals.ts";

const pc = (p: string) => p.replace(/-?\d+$/, "");
/** Notes (quarters, from 0) as events, the gaps as rests. */
function events(ns: WtcNote[], from = 0): Ev[] {
  const out: Ev[] = [];
  let t = from;
  for (const n of ns) {
    if (n.at > t + 1e-6) out.push({ pitch: null, dur: n.at - t });
    out.push({ pitch: n.pitch, dur: n.dur });
    t = n.at + n.dur;
  }
  return out;
}
/** Bach's exposition as a draft: his subject, answer and countersubject. */
function bachDraft(f: WtcFugue): FugueDraft {
  const d = emptyDraft(f.key, f.time);
  const s0 = f.subject[0].at;
  d.phase = f.phase;
  d.subject = events(f.subject.map((n) => ({ ...n, at: n.at - s0 })));
  d.first = f.answerAbove ? 1 : 0;
  d.answer = { pitches: f.answer.map((n) => n.pitch), at: f.answerAt };
  d.countersubject = events(f.countersubject);
  return d;
}
/** The expositions the plan can take as they stand: the answer a whole number of bars after the subject, from its last note on; the countersubject from the answer's entry. */
const fits = (f: WtcFugue) =>
  Math.abs(f.answerAt / f.barQuarters - Math.round(f.answerAt / f.barQuarters)) < 1e-6 && f.answerAt >= f.subject[f.subject.length - 1].at - 1e-6 && f.countersubject[0].at >= -1e-6;

test("compose: keys, degrees and the carrying of a line into a related key", () => {
  assert.equal(dominantOf("C"), "G");
  assert.equal(dominantOf("c#"), "g#");
  assert.equal(relativeOf("C"), "a");
  assert.equal(relativeOf("c"), "Eb");
  assert.equal(relativeOf("f#"), "A");
  for (const [p, k] of [["B4", "c"], ["Ab3", "c"], ["F#5", "g"], ["E#4", "F#"], ["Bb4", "C"]]) assert.equal(atPlace(place(p, k), k), p);
  // C minor's subject in E flat major: the leading note B becomes D, the sixth A flat becomes C.
  const line = ["C4", "B3", "C4", "G3", "Ab3"].map((pitch, i) => ({ pitch, at: i, dur: 1 }));
  assert.deepEqual(toKey(line, "c", "Eb").map((n) => n.pitch), ["Eb4", "D4", "Eb4", "Bb3", "C4"]);
  // A major subject in its relative minor: the leading note stays a leading note (G#).
  const up = ["C4", "D4", "B3", "C4"].map((pitch, i) => ({ pitch, at: i, dur: 1 }));
  assert.deepEqual(toKey(up, "C", "a").map((n) => n.pitch), ["A3", "B3", "G#3", "A3"]);
});

test("compose: the answer options include Bach's answer in 24 of the 29 expositions, his rule alone in 23", () => {
  let offered = 0;
  let byRule = 0;
  const own: string[] = [];
  for (const f of FUGUES) {
    const opts = answerOptions(f.subject, f.key, f.time);
    const bach = f.answer.map((n) => pc(n.pitch)).join(" ");
    if (opts.some((o) => o.pitches.map(pc).join(" ") === bach)) offered++;
    else own.push(f.id);
    if (bachChoice(opts).pitches.map(pc).join(" ") === bach) byRule++;
  }
  assert.equal(offered, 24);
  assert.equal(byRule, 23);
  assert.deepEqual(own.sort(), ["wtc1.18", "wtc1.19", "wtc1.23", "wtc2.01", "wtc2.11"]);
});

test("compose: the answer lies in the other voice's register and enters at the subject's place in the bar", () => {
  const d = emptyDraft("C", "4/4");
  d.subject = [{ pitch: "C4", dur: 1 }, { pitch: "D4", dur: 1 }, { pitch: "E4", dur: 1 }, { pitch: "C4", dur: 1 }, { pitch: "G4", dur: 2 }, { pitch: "C4", dur: 2 }];
  assert.deepEqual(entryPoints(d), [8, 12]);
  const fifthUp = ["G4", "A4", "B4", "G4", "D5", "G4"];
  d.first = 1; // the subject below: the answer a fifth above
  assert.deepEqual(placeAnswer(fifthUp, d), fifthUp);
  d.first = 0; // the subject above: the answer a fourth below
  assert.deepEqual(placeAnswer(fifthUp, d), ["G3", "A3", "B3", "G3", "D4", "G3"]);
});

test("compose: the subject judge: errors only for what cannot be answered; the rest is Bach's practice", () => {
  const d = emptyDraft("c", "4/4");
  d.subject = [{ pitch: "C4", dur: 1 }, { pitch: "G4", dur: 1 }];
  assert.equal(judgeSubject(d)[0].key, "compose.subj.tooShort");
  d.subject = [{ pitch: "C5", dur: 0.5 }, { pitch: "B4", dur: 0.5 }, { pitch: "C5", dur: 1 }, { pitch: "G4", dur: 1 }, { pitch: "Ab4", dur: 1 }];
  const r = judgeSubject(d);
  assert.ok(r.every((x) => x.severity !== "error"));
  assert.ok(r.some((x) => x.key === "compose.subj.first" && x.vars.deg === "1"));
  d.subject = [{ pitch: "D4", dur: 1 }, { pitch: "Eb4", dur: 1 }, { pitch: "F#4", dur: 1 }, { pitch: "G4", dur: 1 }];
  assert.ok(judgeSubject(d).some((x) => x.key === "compose.subj.firstOther"));
  assert.ok(judgeSubject(d).some((x) => x.key === "compose.subj.augmented"));
});

test("compose: Bach's countersubjects pass where he wrote them, against his answers", () => {
  const fitting = FUGUES.filter(fits);
  assert.ok(fitting.length >= 10, String(fitting.length));
  for (const f of fitting) {
    const d = bachDraft(f);
    const written = placings(d).find((p) => p.placing === "written")!;
    assert.deepEqual(written.violations.filter((v) => v.severity === "error"), [], f.id);
  }
});

test("compose: a fifth that stands below turns into a fourth above: the inverted placing is judged", () => {
  const d = emptyDraft("C", "4/4");
  d.subject = ["C4", "D4", "E4", "F4"].map((pitch) => ({ pitch, dur: 1 }));
  d.first = 1;
  d.answer = { pitches: ["G4", "A4", "B4", "C5"], at: 4 };
  d.countersubject = ["C4", "F4", "G4", "A4"].map((pitch) => ({ pitch, dur: 1 }));
  const [written, inverted] = placings(d);
  assert.deepEqual(written.violations.filter((v) => v.severity === "error"), []);
  assert.ok(!written.above && inverted.above);
  assert.equal(inverted.line[0].pitch, "C5");
  // The fourth over the bass, leapt into on the beat: a fault Bach commits (11 times in his two-voice
  // writing, D132), so a licence, named with its place, not an error.
  assert.deepEqual(inverted.violations.map((v) => [v.ruleId, v.at, v.detail?.interval]), [["wtc.cp.dissonance", 0, "P4"]]);
  assert.ok(inverted.violations[0].detail?.bach);
});

test("compose: Bach's licences excuse an isolated fault, not a habit: a countersubject doubling the answer fails", () => {
  const f = FUGUES.find((x) => x.id === "wtc1.12")!;
  const d = bachDraft(f);
  d.countersubject = f.answer.map((n) => ({ pitch: n.pitch.replace(/\d+$/, (o) => String(Number(o) - 1)), dur: n.dur }));
  for (const p of placings(d)) assert.ok(p.violations.filter((v) => v.ruleId === "wtc.cp.parallel" && v.severity === "error").length >= 5, p.placing);
});

test("compose: the plan of a two-voice fugue from Bach's exposition; the analysis hears its entries", () => {
  const f = FUGUES.find((x) => x.id === "wtc1.12")!; // F minor: a tonal answer, a regular countersubject
  const d = bachDraft(f);
  assert.ok(ready(d));
  const r = realise(d);
  assert.deepEqual(r.sections.map((s) => s.id), ["expo", "ep1", "mid", "ep2", "final", "close"]);
  assert.equal(r.sections.find((s) => s.id === "mid")!.key, "Ab");
  // Contiguous sections, entries at the subject's place in the bar.
  for (let i = 1; i < r.sections.length; i++) assert.equal(r.sections[i].from, r.sections[i - 1].to);
  const entries = r.parts.filter((p) => p.kind === "subject" || p.kind === "answer");
  assert.equal(entries.length, 4);
  for (const e of entries) assert.ok(Math.abs((e.from - d.phase) % 4) < 1e-6, String(e.from));
  // The free passages: a codetta-free exposition's tail, two episodes in both voices, the close.
  const free = r.parts.filter((p) => p.kind === "free");
  assert.ok(free.some((p) => p.section === "ep1" && p.voice === 0) && free.some((p) => p.section === "ep1" && p.voice === 1));
  const rep = judgeFugue(d, r);
  assert.deepEqual(rep.missed.map((p) => `${p.section}:${p.voice}`), []);
  assert.ok(rep.heard.filter((h) => h.planned).length >= 4);
  // The middle entry is heard in the relative key.
  assert.ok(rep.heard.some((h) => h.planned && h.key === "Ab"));
  assert.ok(rep.empty.length > 0);
  // Written free passages fill their room; too long a passage is cut and reported.
  const ep = free.find((p) => p.section === "ep1" && p.voice === 0)!;
  d.free[ep.slot] = Array.from({ length: 20 }, () => ({ pitch: "C5", dur: 1 }));
  const r2 = realise(d);
  assert.ok(r2.parts.find((p) => p.slot === ep.slot)!.overflow);
  assert.equal(judgeFugue(d, r2).overflow.length, 1);
});

test("compose: the close, by the clausulae", () => {
  const f = FUGUES.find((x) => x.id === "wtc1.12")!;
  const d = bachDraft(f);
  assert.deepEqual(judgeFugue(d, realise(d)).close, []);
  // The upper voice ^7 rising to ^1, the lower ^5 to ^1, the last sonority on the downbeat.
  d.free["close:0:0"] = [{ pitch: null, dur: 1 }, { pitch: "E4", dur: 2 }, { pitch: "F4", dur: 4 }];
  d.free["close:1:0"] = [{ pitch: null, dur: 1 }, { pitch: "C3", dur: 2 }, { pitch: "F2", dur: 4 }];
  assert.deepEqual(judgeFugue(d, realise(d)).close.map((x) => x.key), ["compose.close.ok"]);
  // The leading note left unraised in minor; the bass ending on ^5.
  d.free["close:0:0"] = [{ pitch: null, dur: 1 }, { pitch: "Eb4", dur: 2 }, { pitch: "F4", dur: 4 }];
  d.free["close:1:0"] = [{ pitch: null, dur: 1 }, { pitch: "F2", dur: 2 }, { pitch: "C3", dur: 4 }];
  const keys = judgeFugue(d, realise(d)).close.map((x) => x.key);
  assert.ok(keys.includes("compose.close.leadingNote") && keys.includes("compose.close.bassNotTonic"), keys.join());
});

test("compose M2: proposed countersubjects pass the judge where they stand and inverted, against Bach's answers", () => {
  let clean = 0;
  let tried = 0;
  for (const f of FUGUES.filter((x) => Math.abs(x.answerAt / x.barQuarters - Math.round(x.answerAt / x.barQuarters)) < 1e-6).slice(0, 12)) {
    const d = bachDraft(f);
    d.countersubject = [];
    const ps = proposeCountersubject(d, 3);
    tried++;
    assert.ok(ps.length >= 2, f.id);
    // Each fills the answer's span exactly, and they differ.
    for (const p of ps) {
      const last = p.notes[p.notes.length - 1];
      assert.ok(Math.abs(last.at + last.dur - (f.subject[f.subject.length - 1].at + f.subject[f.subject.length - 1].dur - f.subject[0].at)) < 1e-6, f.id);
    }
    assert.notDeepEqual(ps[0].notes, ps[1].notes);
    if (ps[0].faults === 0) {
      clean++;
      d.countersubject = asEvents(ps[0].notes, 0);
      const [written, inverted] = placings(d);
      assert.deepEqual([...written.violations, ...inverted.violations].filter((v) => v.severity === "error"), [], f.id);
    }
  }
  assert.ok(clean >= tried - 1, `${clean} of ${tried}`);
  // The same seed, the same proposals.
  const d = bachDraft(FUGUES.find((x) => x.id === "wtc1.12")!);
  assert.deepEqual(proposeCountersubject(d, 5)[0].notes, proposeCountersubject(d, 5)[0].notes);
});

test("compose M2: a free passage proposed against the other voice, filling its room", () => {
  const d = bachDraft(FUGUES.find((x) => x.id === "wtc1.12")!);
  const r = realise(d);
  const ep = r.parts.find((p) => p.section === "ep1" && p.voice === 0)!;
  const ps = proposeFree(d, r, ep, 2);
  assert.ok(ps.length >= 1);
  const n = ps[0].notes;
  assert.ok(Math.abs(n[0].at - ep.from) < 1e-6 && Math.abs(n[n.length - 1].at + n[n.length - 1].dur - ep.to) < 1e-6);
});

test("compose: a standard MIDI file, a track per voice", () => {
  const bytes = fugueMidi([[{ pitch: "C4", at: 0, dur: 1 }], [{ pitch: "G4", at: 1, dur: 1 }]], { key: "c", time: "4/4", tempo: 80, title: "Fugue" });
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "MThd");
  assert.equal(bytes[10] * 256 + bytes[11], 3);
  assert.equal(String.fromCharCode(...bytes.slice(14, 18)), "MTrk");
});
