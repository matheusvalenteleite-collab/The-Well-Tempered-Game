/**
 * D333 (WTC 1.49), THE LAB's STUDY: the ten excerpts hold to their length and to the feature each tests
 * (from the encoded scores, the notes the game makes the player strike); the study's configuration is the
 * preset's snapshot with band time FIXED; takes advance the position, are saved packed after each take
 * and read back (a take the device refused is played again); the owner's settings are kept aside and put
 * back; a take is a lab log the replay reads faithfully; the report finds the learning, the persistent
 * habit and the errors that went away on a synthetic study.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { barStart, beatOf, fugueById, inBar } from "../src/touch/fugue.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { replay, silentChip, tally } from "../src/bench/lab/replay.ts";
import { configById, configMech } from "../src/bench/lab/presets.ts";
import { STUDY_EXCERPTS, pieceShort, type StudyExcerpt } from "../src/bench/lab/study-excerpts.ts";
import {
  addTake,
  excerptSeconds,
  holdSettings,
  loadStudy,
  newStudy,
  pack,
  parseStudy,
  releaseSettings,
  saveHead,
  saveTake,
  studyDone,
  studyFileName,
  studyMech,
  studyText,
  takeOf,
  unpack,
  STUDY_PRESET,
  STUDY_RESTORE_KEY,
} from "../src/bench/lab/study.ts";
import { excerptReport, studyMarkdown, takeStats } from "../src/bench/lab/study-report.ts";
import { synthStudy } from "../tools/lab/study-synth.ts";

/** The notes the player strikes in an excerpt (not riding, one per onset), with their times (s). */
function struck(e: StudyExcerpt) {
  const g = labGame({ piece: e.piece, voice: e.voice, fromBar: e.fromBar, toBar: e.toBar, bpm: tempoOf(e.piece), tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null }, silentChip({ t: 0 }));
  const ns = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  return ns.map((n) => ({ on: n.on, dur: n.dur, midi: n.midi, step: n.step, t: g.timeAt(n.on) }));
}
const byId = (id: string) => STUDY_EXCERPTS.find((e) => e.id === id)!;
const iois = (ns: ReturnType<typeof struck>) => ns.slice(1).map((n, i) => (n.t - ns[i].t) * 1000);

test("D333: ten excerpts, one voice of a WTC fugue each, 8–20 s at the game's tempo, beginning at their bar's first beat", () => {
  assert.equal(STUDY_EXCERPTS.length, 10);
  assert.equal(new Set(STUDY_EXCERPTS.map((e) => e.id)).size, 10);
  assert.equal(new Set(STUDY_EXCERPTS.map((e) => e.skill)).size, 10, "distinct skills");
  for (const e of STUDY_EXCERPTS) {
    const f = fugueById(e.piece);
    assert.equal(f.id, e.piece);
    assert.equal(f.kind, "fugue");
    assert.ok(e.voice < f.voices.length);
    const s = excerptSeconds(e, tempoOf(e.piece));
    assert.ok(s >= 8 && s <= 20, `${e.id}: ${s.toFixed(1)} s`);
    const ns = struck(e);
    assert.ok(ns.length >= 10, `${e.id}: ${ns.length} notes`);
    // The voice is under way within the first beat (a phrase or entry beginning, not a held note's tail).
    const first = ns.find((n) => n.on >= barStart(f, e.fromBar)) ?? ns[0];
    assert.ok(first.on - barStart(f, e.fromBar) <= beatOf(f).ticks, `${e.id} begins late`);
    assert.ok(!f.voices[e.voice].some(([on, dur]) => on < barStart(f, e.fromBar) && on + dur > barStart(f, e.fromBar)), `${e.id}: a note tied into its first bar`);
    assert.ok(e.tests.length > 20);
    assert.match(pieceShort(e.piece), /^I{1,2}\/\d+$/);
  }
});

test("D333: the owner's three passages are in: II/7 bars 41–46, II/10's opening, II/18's subject, all soprano", () => {
  for (const [id, piece, from] of [["ii7-neighbour", "wtc2f07", 41], ["ii10-fast", "wtc2f10", 1], ["ii18-alternating", "wtc2f18", 1]] as const) {
    const e = byId(id);
    assert.equal(e.piece, piece);
    assert.equal(e.voice, 0);
    assert.equal(e.fromBar, from);
  }
  // II/7 41–46: X X Y X three times (a repeat, a step down, back up).
  const ns = struck(byId("ii7-neighbour"));
  let fig = 0;
  for (let i = 0; i + 3 < ns.length; i++) if (ns[i].midi === ns[i + 1].midi && ns[i + 2].step === ns[i].step - 1 && ns[i + 3].midi === ns[i].midi) fig++;
  assert.equal(fig, 3);
  // II/10: notes at 182 ms; II/18: running quavers (361 ms) for at least 20 in a row.
  assert.ok(Math.min(...iois(struck(byId("ii10-fast")))) < 200);
  const q = iois(struck(byId("ii18-alternating")));
  let run = 0;
  let best = 0;
  for (const x of q) (run = Math.abs(x - 361) < 5 ? run + 1 : 0), (best = Math.max(best, run));
  assert.ok(best >= 20, `II/18 quavers in a row ${best}`);
});

test("D333: each other excerpt has the feature it tests", () => {
  // Chromatic: most moves a semitone.
  const ch = struck(byId("i12-chromatic"));
  const semis = ch.slice(1).filter((n, i) => Math.abs(n.midi - ch[i].midi) === 1).length;
  assert.ok(semis / (ch.length - 1) >= 0.7, `chromatic ${semis}/${ch.length - 1}`);
  // Slow legato: the notes at least 340 ms apart, most 650 ms or more.
  const lg = iois(struck(byId("i22-legato")));
  assert.ok(Math.min(...lg) >= 340 && lg.filter((x) => x >= 650).length >= lg.length / 2);
  // Repeated notes: three Ds struck in a row.
  const rp = struck(byId("ii5-repeats"));
  assert.ok(rp[0].midi === rp[1].midi && rp[1].midi === rp[2].midi);
  // Syncopation: notes struck off the beat and held across it (at least three).
  const sy = byId("ii23-syncopation");
  const f = fugueById(sy.piece);
  const beat = beatOf(f).ticks;
  const sync = struck(sy).filter((n) => inBar(f, n.on) % beat !== 0 && (inBar(f, n.on) % beat) + n.dur > beat);
  assert.ok(sync.length >= 3, `syncopations ${sync.length}`);
  // Dotted rhythm: at least five long–short pairs of 3:1.
  const dt = struck(byId("i5-dotted"));
  const dots = dt.slice(0, -1).filter((n, i) => n.dur === 3 * dt[i + 1].dur && dt[i + 1].on === n.on + n.dur).length;
  assert.ok(dots >= 5, `dotted pairs ${dots}`);
  // Leaps: octaves (seven staff steps) both ways.
  const lp = struck(byId("ii24-leaps"));
  const oct = lp.slice(1).filter((n, i) => Math.abs(n.step - lp[i].step) === 7).length;
  assert.ok(oct >= 4, `octave leaps ${oct}`);
  // Fast run: 30 or more semiquavers in a row under 200 ms each, nine in ten of their moves a step.
  const rn = struck(byId("ii12-run"));
  let from = 0;
  let span: [number, number] = [0, 0];
  for (let i = 1; i <= rn.length; i++) {
    if (i < rn.length && (rn[i].t - rn[i - 1].t) * 1000 < 200) continue;
    if (i - 1 - from > span[1] - span[0]) span = [from, i - 1];
    from = i;
  }
  const runNotes = rn.slice(span[0], span[1] + 1);
  const steps = runNotes.slice(1).filter((n, i) => Math.abs(n.step - runNotes[i].step) === 1).length;
  assert.ok(runNotes.length >= 30 && steps / (runNotes.length - 1) >= 0.9, `run ${runNotes.length}, steps ${steps}`);
});

test("D333: easier to harder: the first three slow, the last two the fastest", () => {
  const minIoi = STUDY_EXCERPTS.map((e) => Math.min(...iois(struck(e))));
  for (const i of [0, 1, 2]) assert.ok(minIoi[i] >= 340, `${STUDY_EXCERPTS[i].id} ${minIoi[i]}`);
  for (const i of [8, 9]) assert.ok(minIoi[i] < 200, `${STUDY_EXCERPTS[i].id} ${minIoi[i]}`);
  const rate = STUDY_EXCERPTS.map((e) => struck(e).length / excerptSeconds(e, tempoOf(e.piece)));
  assert.ok(rate[9] === Math.max(...rate), "the fast run last");
});

test("D333: the study's configuration is the preset's snapshot, band time fixed, piano, no reading; its name recorded", () => {
  const s = newStudy("WTC test", tempoOf, new Date("2026-10-27T10:00:00Z"));
  const c = configById(STUDY_PRESET)!;
  assert.equal(STUDY_PRESET, "B");
  assert.equal(s.preset.id, c.id);
  assert.equal(s.preset.name, c.name);
  assert.deepEqual(s.mech, { ...configMech(c), bandTime: "fixed" });
  assert.deepEqual(studyMech(), s.mech);
  assert.equal(s.sound, "pianoSampled");
  assert.equal(s.reading, null);
  assert.equal(s.wait, false);
  assert.equal(s.bt, false);
  assert.equal(s.excerpts.length, 10);
  assert.equal(s.excerpts[0].bpm, tempoOf(s.excerpts[0].piece));
  assert.equal(studyFileName(new Date(2026, 9, 27, 23, 5)), "wtc-study-2026-10-27.json");
});

/** A storage in memory, refusing writes past `limit` characters. */
function memStore(limit = Infinity) {
  const m = new Map<string, string>();
  return {
    m,
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const used = [...m.entries()].reduce((a, [kk, vv]) => a + (kk === k ? 0 : vv.length), 0);
      if (used + v.length > limit) throw new Error("QuotaExceededError");
      m.set(k, v);
    },
    removeItem: (k: string) => void m.delete(k),
  };
}

test("D333: takes move the study on; saved packed after each take and read back; a take refused is played again", async () => {
  const small = synthStudy({ excerpts: 2, takes: 3 });
  assert.deepEqual(small.pos, { excerpt: 2, take: 0 });
  assert.ok(studyDone(small));
  assert.ok(small.finishedAt);
  assert.equal(small.excerpts[1].takes[2].study?.take, 2);
  // Rebuilt take by take into a storage.
  const st = memStore();
  let s = { ...newStudy("WTC test", tempoOf), takesPer: 3 };
  s = { ...s, excerpts: s.excerpts.slice(0, 2) };
  saveHead(s, st);
  for (let e = 0; e < 2; e++)
    for (let t = 0; t < 3; t++) {
      s = addTake(s, small.excerpts[e].takes[t], "WTC test");
      saveHead(s, st);
      assert.ok(await saveTake(s, e, t, st));
    }
  const back = await loadStudy(st);
  assert.ok(back);
  assert.deepEqual(back!.pos, s.pos);
  assert.deepEqual(back!.excerpts[1].takes[2], JSON.parse(JSON.stringify(s.excerpts[1].takes[2])));
  // Packed: a take's stored text a fraction of its JSON.
  const key = [...st.m.keys()].find((k) => k.includes(":1:2"))!;
  assert.ok(st.m.get(key)!.startsWith("gz:"));
  assert.ok(st.m.get(key)!.length < JSON.stringify(s.excerpts[1].takes[2]).length / 3);
  assert.equal(await unpack(await pack("plain ✓ text")), "plain ✓ text");
  // A device that refuses the last take: the study resumes at it.
  const full = memStore(0);
  for (const [k, v] of st.m) if (!k.endsWith(":1:2")) full.m.set(k, v);
  const resumed = await loadStudy(full);
  assert.deepEqual(resumed!.pos, { excerpt: 1, take: 2 });
  assert.equal(resumed!.finishedAt, undefined);
  assert.equal(await saveTake(s, 1, 2, full), false);
});

test("D333: the owner's settings kept aside while a session runs and put back (once)", () => {
  const st = memStore();
  st.setItem("tb-lab-v1", '{"piece":"wtc1f01"}');
  holdSettings(["tb-lab-v1", "tb-lab-config-v1"], st);
  assert.ok(st.getItem(STUDY_RESTORE_KEY));
  st.setItem("tb-lab-v1", '{"piece":"wtc2f07"}');
  st.setItem("tb-lab-config-v1", '"B"');
  holdSettings(["tb-lab-v1", "tb-lab-config-v1"], st); // a second hold keeps the first
  assert.equal(releaseSettings(st), true);
  assert.equal(st.getItem("tb-lab-v1"), '{"piece":"wtc1f01"}');
  assert.equal(st.getItem("tb-lab-config-v1"), null);
  assert.equal(releaseSettings(st), false);
});

test("D333: a take is a full lab log: extracted from the file, it replays to the same verdicts", () => {
  const s = parseStudy(`pasted\n${studyText(synthStudy({ excerpts: 1, takes: 2 }))}`);
  const log = takeOf(s, "1:2");
  assert.equal(log.v, 1);
  assert.equal(log.passage.piece, STUDY_EXCERPTS[0].piece);
  assert.equal(log.mech.bandTime, "fixed");
  assert.deepEqual(tally(replay(log).events), tally(log.verdicts));
  assert.throws(() => takeOf(s, "2:1"));
  assert.throws(() => parseStudy('{"v":1}'));
});

test("D333: the report finds the learning, the habit that stays and the errors that went away (synthetic study)", () => {
  const s = synthStudy({ excerpts: 3, takes: 10 });
  const r0 = excerptReport(s.excerpts[0]);
  assert.equal(r0.takes.length, 10);
  // The scatter shrinks over the takes.
  assert.ok(r0.last.offSd < r0.first.offSd / 2, `${r0.first.offSd} → ${r0.last.offSd}`);
  // Excerpt 1 (stuckEvery 11 from note 5) keeps a wrong note in every take, by direction, with its detail.
  assert.ok(r0.persistent.length >= 1);
  const p = r0.persistent[0];
  assert.equal(p.wrongIn.length, 10);
  assert.match(p.detail, /wrong ×10: .*(the wrong way allowed|needs)/);
  assert.match(p.at, /^b\d+\.\d$/);
  // Excerpt 2 has no habit: its early wrong notes go away.
  const r1 = excerptReport(s.excerpts[1]);
  assert.equal(r1.persistent.length, 0);
  assert.ok(s.excerpts.map(excerptReport).reduce((a, r) => a + r.gone.length, 0) >= 1, "errors that went away");
  assert.notEqual(r1.verdict, "worse");
  const t = takeStats(s.excerpts[1].takes[0], 1);
  assert.equal(t.right + t.wrong + t.missed, t.of);
  const md = studyMarkdown(s);
  for (const h of ["# WTC study 2026-10-27", "## Overall", "## 1. I/12 · tenor · bars 1–3", "**Persistent errors**", "| **first 3** |", "| **last 3** |", "B · CLEAN STRIKES"]) assert.ok(md.includes(h), h);
});

test("D333: tools/lab/study-report.ts prints the markdown and a take; tools/lab/replay.ts --take reads it", () => {
  const dir = mkdtempSync(join(tmpdir(), "wtc-study-"));
  const file = join(dir, "wtc-study-2026-10-27.json");
  writeFileSync(file, studyText(synthStudy({ excerpts: 1, takes: 4 })));
  const md = execFileSync("node", ["tools/lab/study-report.ts", file], { encoding: "utf8" });
  assert.match(md, /## 1\. I\/12/);
  const take = JSON.parse(execFileSync("node", ["tools/lab/study-report.ts", file, "--take", "1:3"], { encoding: "utf8" }));
  assert.equal(take.study.take, 2);
  const out = execFileSync("node", ["tools/lab/replay.ts", file, "--take", "1:3"], { encoding: "utf8" });
  assert.match(out, /identical verdicts/);
});
