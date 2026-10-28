/**
 * D353: MORE BACH's Inventions (BWV 772-786) and Sinfonias (BWV 787-801) get the encodings' ornaments
 * (data/wtc/ornaments.json, inven01-15 and sinfo01-15) as written: on their notes, not carried along the
 * subject's entries (D277 is the fugues'); the band plays Invention 1's mordents.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { ornamentMark, ornamentsOf } from "../src/touch/ornament-play.ts";
import rawData from "../data/wtc/ornaments.json" with { type: "json" };

await loadExtras();
const RAW = rawData as unknown as Record<string, [number, number, string, string, string[]?][]>;
const corpusId = (n: number) => (n <= 786 ? `inven${String(n - 771).padStart(2, "0")}` : `sinfo${String(n - 786).padStart(2, "0")}`);

test("D353: Invention 1 has its 6 ornaments; the 30 pieces their 310, each on its note", () => {
  assert.equal(ornamentsOf(fugueById("bwv772")).size, 6);
  let total = 0;
  for (let n = 772; n <= 801; n++) {
    const f = fugueById(`bwv${n}`);
    assert.equal(f.id, `bwv${n}`);
    const orn = ornamentsOf(f);
    assert.equal(orn.size, RAW[corpusId(n)]?.length ?? 0, `bwv${n}: as written, none carried`);
    for (const [key, o] of orn) {
      const [v, on] = key.split(":").map(Number);
      assert.ok(f.voices[v].some((x) => x[0] === on), `bwv${n} ${key}`);
      assert.ok(ornamentMark(o).length > 0);
    }
    total += orn.size;
  }
  assert.equal(total, 310);
});

test("D353: the band plays Invention 1's mordents", () => {
  const f = fugueById("bwv772");
  const [key] = [...ornamentsOf(f).keys()];
  const [v, on] = key.split(":").map(Number);
  const clock = { t: 0 };
  const log: { midi: number; at: number }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, at: number) => (log.push({ midi, at }), { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
  const g = new ProtoGame(f, (v + 1) % f.voices.length, 0, protoById("keys"), { bpm: 50, legato: false, easy: "timing" }, chip);
  const t0 = g.timeAt(on);
  while (clock.t < t0 + 0.5) (clock.t += 0.05), g.step();
  const near = log.filter((x) => x.at >= t0 - 0.01 && x.at < t0 + 0.3);
  assert.ok(near.length >= 3, `the mordent's notes at its onset: ${near.length}`);
});
