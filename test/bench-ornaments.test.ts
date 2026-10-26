/** D277: a subject's ornaments carried into every entry; D278: on a phone the ornament is shaken. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { ornamentsOf, shakeOf, SUBJECT_ORNAMENTS } from "../src/touch/ornament-play.ts";
import rawData from "../data/wtc/ornaments.json" with { type: "json" };

const raw = rawData as unknown as Record<string, [number, number, string, string][]>;

const entriesOf = (id: string) => fugueById(id).entries.filter((e) => !e.theme && !e.scale);
const has = (id: string, j: number) => entriesOf(id).filter((e) => e.notes[j] && ornamentsOf(fugueById(id)).has(`${e.voice}:${e.notes[j][0]}`)).length;

test("D277: the subject's ornament in every entry: written on the first entry (I/6, I/7, II/13), named by the books (I/12, I/14, II/12)", () => {
  for (const [id, j] of [["wtc1f06", 10], ["wtc1f07", 14], ["wtc2f13", 0], ["wtc1f12", 9], ["wtc1f14", 16], ["wtc2f12", 1], ["wtc1f23", 12]] as const) assert.equal(has(id, j), entriesOf(id).length, `${id} note ${j}`);
  assert.equal(SUBJECT_ORNAMENTS.wtc2f12[0].signs, "m", "II/12: a mordent, E natural below");
});

test("D277: not carried into augmented entries, nor where an entry's note is shorter than a quaver, nor from a lone later entry", () => {
  const f = fugueById("wtc1f08");
  const o = ornamentsOf(f);
  const written = new Set((raw.wtc1f08 ?? []).map(([v, on]) => `${v}:${on}`));
  const aug = f.entries.filter((x) => x.scale === 2);
  assert.ok(aug.length > 0);
  for (const e of aug) for (const [on] of e.notes) if (o.has(`${e.voice}:${on}`)) assert.ok(written.has(`${e.voice}:${on}`), "augmented left as written");
  // I/15: ornaments on single later entries only: none carried.
  assert.ok(has("wtc1f15", 14) <= 1);
});

test("D278: how each ornament is shaken: a trill up four moves, a mordent down two, a short trill up two, a turn up four; grace notes alone are not", () => {
  assert.deepEqual(shakeOf({ signs: "T", graces: [] }), { kind: "trill", word: "TRILL", first: 1, need: 4 });
  assert.equal(shakeOf({ signs: "m", graces: [] })?.first, -1);
  assert.equal(shakeOf({ signs: "W", graces: [] })?.need, 2);
  assert.equal(shakeOf({ signs: "S", graces: [] })?.kind, "turn");
  assert.equal(shakeOf({ signs: "", graces: [{ kind: "q", midi: 60 }] }), null);
});

test("D281: an ornament's neighbour is the next letter with the accidental in force, not the sign's case: II/13's trills on B sharp to C sharp, on A sharp to B; II/12's mordent on F to E natural; never beyond a whole step", async () => {
  const { realiseNote } = await import("../src/touch/ornament-play.ts");
  const f = fugueById("wtc2f13");
  const o = ornamentsOf(f);
  const at = (on: number, v = 0) => f.voices[v].find((n) => n[0] === on)!;
  const parts = (on: number, v = 0) => {
    const n = at(on, v);
    return realiseNote(f, o.get(`${v}:${on}`)!, n[0], n[1], n[2], undefined, 132).map((p) => p[2]);
  };
  assert.ok(parts(30720).includes(73) && !parts(30720).includes(74), "B#4 trill with C#5");
  assert.ok(parts(188160).includes(71) && !parts(188160).includes(72), "A#4 short trill with B4");
  const g = fugueById("wtc2f12");
  const e = g.entries.filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
  const [on, dur, midi] = e.notes[1];
  assert.deepEqual(realiseNote(g, ornamentsOf(g).get(`${e.voice}:${on}`)!, on, dur, midi, undefined, 84).map((p) => p[2]).slice(0, 3), [midi, midi - 1, midi], "F, E natural, F");
  for (const id of Array.from({ length: 48 }, (_, i) => `wtc${i < 24 ? 1 : 2}f${String((i % 24) + 1).padStart(2, "0")}`)) {
    const h = fugueById(id);
    for (const [k, orn] of ornamentsOf(h)) {
      const [v, t] = k.split(":").map(Number);
      const n = h.voices[v].find((x) => x[0] === t);
      if (!n) continue;
      for (const m of realiseNote(h, orn, n[0], n[1], n[2], undefined, 80).map((p) => p[2])) assert.ok(Math.abs(m - n[2]) <= 2, `${id} ${k}: ${m} against ${n[2]}`);
    }
  }
});

test("D284: HEAR THE SUBJECT sounds every ornament of the subject, in all 48 fugues", async () => {
  const { firstEntry, subjectSounds } = await import("../src/bench/hear-sound.ts");
  const { performSubject, readingsOf } = await import("../src/touch/readings.ts");
  const { tempoOf } = await import("../src/touch/tempi.ts");
  let ornamentedSubjects = 0;
  for (const b of [1, 2])
    for (let n = 1; n <= 24; n++) {
      const id = `wtc${b}f${String(n).padStart(2, "0")}`;
      const f = fugueById(id);
      const e = firstEntry(id);
      const orns = ornamentsOf(f);
      const marked = e.notes.filter(([on]) => orns.has(`${e.voice}:${on}`));
      for (const r of [null, ...readingsOf(id)]) {
        const perf = performSubject(r, e.notes, f.tpq, tempoOf(id));
        const sounds = subjectSounds(f, e, perf, tempoOf(id));
        assert.ok(sounds.length >= perf.length + marked.length, `${id}/${r?.id ?? "plain"}: ${marked.length} ornaments, ${sounds.length - perf.length} notes added`);
      }
      if (marked.length) ornamentedSubjects++;
    }
  assert.ok(ornamentedSubjects >= 11, `${ornamentedSubjects} subjects with ornaments`);
  // F sharp major, Book II: the subject opens on a trill: it alternates with the note above.
  const f = fugueById("wtc2f13");
  const e = firstEntry("wtc2f13");
  const s = subjectSounds(f, e, performSubject(null, e.notes, f.tpq, tempoOf("wtc2f13")), tempoOf("wtc2f13"));
  const head = s.filter((x) => x.at < s[0].at + 0.4).map((x) => x.midi);
  assert.ok(new Set(head).size === 2 && head.length >= 4, `the trill: ${head}`);
});
