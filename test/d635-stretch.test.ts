/**
 * D635-D639: NO NOTE STRETCHED. After D631 (no note in another octave from the one written) a note past a set's recordings
 * is read from its nearest recording at the written pitch, however far: the trials' horn's C#5 read seven semitones up from
 * its C4 (horn/ has a hole from C#4 to C#5: ORCHESTRA & ORGAN's stage horn on the viola's line, 2,109 notes in 43 fugues),
 * the bassoon's C2 seven down from G2, TRACKER's choir's C2 seventeen down from F3. The rule (the coordinator, D635): no
 * written note read more than STRETCH_MAX (5) semitones from the nearest recording the engine has for its set, as the
 * fugue's plan leaves it (D540's sparse zones, D631's extensions), over every sound, the 48 fugues and every voice (the
 * player's is the same patch), the line-ups per piece and the stage and continuo parts (tools/touch/stretch/audit.ts);
 * the fixes in order: the band's own seats traded (D637), a denser stride (none needed: no stretched read came from the
 * thinning), another recording of the instrument already in the repo (D636: SampledInstrument.zones), else listed below.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestSample, planFor, SAMPLED, sampledMidis, setFor, STRETCH_MAX, zonesOf } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { folderOf, midiOfName } from "../src/touch/sampled.ts";
import { AUDIT_SOUNDS, WTC_FUGUES } from "../tools/touch/octaves/audit.ts";
import { stretches, type Stretch } from "../tools/touch/stretch/audit.ts";

/**
 * D638, THE ALLOW-LIST: what is still read more than STRETCH_MAX from a recording, by sound and recorded instrument (`notes`
 * the exact count, `max` the largest shift either way), each with its reason. A change in either fails here: a new stretch
 * is fixed or listed, a fixed one is taken off.
 */
const ALLOWED: readonly { sound: string; inst: string; notes: number; max: number; why: string }[] = [
  // The bass keeps its instrument (D632): I/3's bass reaches C#5 once, six over the bass's G4 (Iowa's bass
  // trombone's top; the jazz bass's G4): no other recording of either in the repo goes higher.
  { sound: "bachBrass", inst: "brassBass", notes: 1, max: 6, why: "I/3's bass C#5, the bass keeps its instrument" },
  { sound: "jazzQuartet", inst: "jazzBass", notes: 1, max: 6, why: "I/3's bass C#5, the bass keeps its instrument" },
  { sound: "salsa", inst: "jazzBass", notes: 1, max: 6, why: "I/3's bass C#5, the bass keeps its instrument" },
  { sound: "bossaNova", inst: "jazzBass", notes: 1, max: 6, why: "I/3's bass C#5, the bass keeps its instrument" },
  // VAUDEVILLE's xylophone is the band's top line (D588): its soprano dips under D4 in 23 fugues (A#3-C#4, read 6-9 down
  // from G4, the xylophone's lowest recording); giving those fugues' tops to the clarinet would leave the xylophone on top
  // in 17 of the 48 (D632 gave it away in 8 already). VSCO's xylophone has no lower recording; the vibraphone is another
  // instrument.
  { sound: "vaudeville", inst: "vaudXylo", notes: 82, max: 9, why: "the band's own colour on its top line" },
  // ZELENKA TRIO: the alto on the bassoon in I/3, II/1, II/12 and II/21 (D632: its line A#2-E3 at its lowest) reaches G#5-A#5 once each,
  // over the bassoon's D5; the only seat that covers both ends is the harpsichord, which would cost the trio an oboe line.
  { sound: "oboeTrio", inst: "trioBassoon", notes: 4, max: 8, why: "one note a fugue; the harpsichord on a reed line is not the trio" },
  // ORCHESTRA & ORGAN's stage doublings (stage.ts) follow their line: the second violin's oboe at its E3 (I/16, I/20, II/5:
  // under the oboe's A#3, its lowest note on the instrument too), the viola's horn at I/19's B5 (over the horn's F5).
  { sound: "orchestraOrgan", inst: "trialOboe", notes: 5, max: 6, why: "a stage doubling past the oboe's compass; the violin plays the line" },
  { sound: "orchestraOrgan", inst: "trialHorn", notes: 6, max: 6, why: "a stage doubling past the horn's compass (I/19's and II/15's B5); the viola plays the line" },
  // WIND QUINTET's II/15 alto (G2-F#5) on the clarinet (D632): its G2 7 under the clarinet's D3. The horn covers the line,
  // but weighing the quintet's seats for the stretch also gives four fugues' horn tenor to a second clarinet.
  { sound: "trialWinds", inst: "trialClarinet", notes: 2, max: 7, why: "II/15's alto G2, two notes" },
  // SOLO VOICES: lines wider than any one singer (I/3's alto A#2-G#5, three octaves; II/15's soprano D3-B5): the seats
  // chosen for the fewest stretched (D637), these notes left at a line's far end, one or two a fugue but II/15's.
  { sound: "soloVoices", inst: "voiceA", notes: 13, max: 10, why: "a line's far note past every singer of the band" },
  { sound: "soloVoices", inst: "voiceS", notes: 7, max: 10, why: "a line's far note past every singer of the band" },
  { sound: "soloVoices", inst: "voiceT", notes: 2, max: 7, why: "a line's far note past every singer of the band" },
  { sound: "soloVoices", inst: "voiceB", notes: 2, max: 7, why: "I/3's bass C5-C#5, the bass keeps its singer" },
];
const all: Stretch[] = AUDIT_SOUNDS.flatMap((id) => stretches(id));

test("D635: every note of the 48 fugues on every sound read within STRETCH_MAX semitones of a recording, but the allow-list", () => {
  assert.equal(STRETCH_MAX, 5);
  assert.equal(WTC_FUGUES.length, 48);
  const got = new Map<string, { notes: number; max: number }>();
  for (const s of all) {
    const k = `${s.sound} ${s.inst}`;
    const e = got.get(k) ?? { notes: 0, max: 0 };
    e.notes += s.n;
    e.max = Math.max(e.max, Math.abs(s.shift));
    got.set(k, e);
  }
  for (const [k, e] of got) {
    const a = ALLOWED.find((x) => `${x.sound} ${x.inst}` === k);
    const where = all.filter((s) => `${s.sound} ${s.inst}` === k).slice(0, 3).map((s) => `${s.piece} v${s.voice} ${s.patch} ${s.written} from ${s.from}`);
    assert.ok(a, `${k}: ${e.notes} notes stretched, up to ${e.max} (${where.join("; ")}): fix it or list it`);
    assert.deepEqual(e, { notes: a.notes, max: a.max }, `${k} as listed`);
  }
  for (const a of ALLOWED) assert.ok(got.has(`${a.sound} ${a.inst}`), `${a.sound} ${a.inst} listed, no longer stretched: take it off`);
});

test("D636: the fills: the trials' horn's hole and the bassoons' low notes from the instrument's other recordings in the repo, every note of their spans within 3 of a recording", () => {
  const spans: [keyof typeof SAMPLED, string, number, number][] = [
    ["trialHorn", "trialHornMid", 63, 72],
    ["trialBassoon", "trialBassoonLow", 33, 37],
    ["bassoon16", "bassoon16Low", 33, 37],
  ];
  for (const [id, set, lo, hi] of spans) {
    const inst = SAMPLED[id];
    for (let m = lo; m <= hi; m++) {
      assert.equal(setFor(inst, m), set, `${id} ${m}`);
      const near = nearestSample(set, m)!;
      assert.ok(Math.abs(near - m) <= 3, `${id} ${m} from ${near}`);
    }
    if (id === "trialHorn") assert.notEqual(setFor(inst, lo - 1), set);
    assert.notEqual(setFor(inst, hi + 1), set);
    // Only the recordings named, all in the repo (two each: D540's budget).
    const names = SAMPLE_MANIFEST[folderOf(set)]?.notes ?? [];
    assert.equal(sampledMidis(set).length, 2, set);
    for (const m of sampledMidis(set)) assert.ok(names.map(midiOfName).includes(m), `${set} ${m} in public/samples/${folderOf(set)}`);
    // A plan for the span loads the fill's recordings, not the main set's.
    const plan = planFor(inst, [lo, hi]);
    assert.deepEqual(plan.find((e) => e.set === set)?.notes, [...new Set([nearestSample(set, lo), nearestSample(set, hi)])].sort((a, b) => a! - b!));
  }
  // The horn's hole: every pitch from C4 to D5 now within 3 of a recording (it was C#5 seven up from C4).
  for (let m = 60; m <= 74; m++) assert.ok(Math.abs(nearestSample(setFor(SAMPLED.trialHorn, m), m)! - m) <= 3, `trialHorn ${m}`);
  // Thinned (D540: stride 3 or 4) a fill keeps both its recordings.
  assert.deepEqual(zonesOf([34, 37], 4), [34, 37]);
});
