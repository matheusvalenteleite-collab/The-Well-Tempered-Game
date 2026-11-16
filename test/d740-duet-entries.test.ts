/**
 * D740: THE FOUR DUETS' ENTRIES, FROM THEIR TABLE (data/touch/duet-entries.txt, placed by tools/touch/expert.ts, built by
 * tools/touch/more-bach.ts): each Duet's subject, and its countersubject where it returns with it (theme 2: Duets 2 and 4);
 * Duet 2's middle part in close imitation, dux and comes. The counts exact; every statement on a note of its voice.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";

before(async () => {
  await loadExtras();
});

/** [all, theme 2, inverted, in canon]. */
const COUNTS: Record<string, [number, number, number, number]> = {
  bwv802: [14, 0, 2, 0],
  bwv803: [28, 10, 1, 8],
  bwv804: [9, 0, 0, 0],
  bwv805: [9, 3, 0, 0],
};

test("D740: the four Duets' entries as the table places them, by theme and form, each on a note of its voice", () => {
  for (const [id, want] of Object.entries(COUNTS)) {
    const f = fugueById(id);
    assert.equal(f.id, id);
    const E = f.entries;
    assert.deepEqual([E.length, E.filter((e) => e.theme === 2).length, E.filter((e) => e.inverted).length, E.filter((e) => e.canon).length], want, id);
    for (const e of E) {
      assert.ok(f.voices[e.voice].some((n) => n[0] === e.on), `${id}: b. ${e.bar} starts on a note`);
      assert.ok(e.end > e.on && e.notes.length >= 3, `${id}: b. ${e.bar} has notes`);
    }
    assert.equal(E[0].bar, 1, `${id}: the first statement in bar 1`);
  }
  // Duet 2's canonic pairs: the leader first, the follower in the other voice within two bars.
  const d2 = fugueById("bwv803").entries.filter((e) => e.canon);
  for (let k = 0; k < d2.length; k += 2) {
    assert.deepEqual([d2[k].canon, d2[k + 1].canon], ["dux", "comes"]);
    assert.notEqual(d2[k].voice, d2[k + 1].voice);
    assert.ok(d2[k + 1].bar - d2[k].bar <= 2);
  }
});
