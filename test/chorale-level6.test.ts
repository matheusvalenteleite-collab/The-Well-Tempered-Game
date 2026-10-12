import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/chorales/study.json" with { type: "json" };
import { augmentedSeconds, bachAs, options, realise, reduce, type StudyLike } from "../src/chorale/level6.ts";

const D = data as unknown as { kinds: string[]; chorales: StudyLike[] };

// C19: Bach reduced to chord tones, and his diminution found again by the player's options.
test("level 6: the reduction keeps every voice's length, and Bach's embellishments are mostly offered where he wrote them", () => {
  let points = 0;
  let offered = 0;
  let same = 0;
  let made = 0;
  for (const c of D.chorales) {
    const r = reduce(c, D.kinds);
    for (let v = 1; v < 4; v++) {
      const len = (ns: [number, number, string, 1?][]) => ns.reduce((s, n) => s + n[1], 0);
      assert.equal(len(r.voices[v]), len(c.voices[v]), `no. ${c.n} voice ${v}`);
      for (let k = 1; k < r.voices[v].length; k++) assert.ok(r.voices[v][k][0] >= r.voices[v][k - 1][0] + r.voices[v][k - 1][1], `no. ${c.n} voice ${v}: overlap`);
    }
    for (const p of r.bach) {
      const line = r.voices[p.voice];
      const e = bachAs(p, line);
      if (!e) continue;
      points++;
      if (!options(line, p.index).includes(e)) continue;
      offered++;
      if (e === "suspension") continue;
      const added = realise(line, { [p.index]: e }, c.sig).find((n) => n[0] > line[p.index][0] && n[0] < line[p.index][0] + line[p.index][1]);
      made++;
      if (added && added[2] === p.pitch) same++;
    }
  }
  assert.ok(offered / points > 0.75, `${offered}/${points} offered`);
  assert.ok(same / made > 0.85, `${same}/${made} on Bach's pitch`);
});

test("level 6: options by the interval to the next note; the augmented second found", () => {
  const line: [number, number, string][] = [[0, 8, "C4"], [8, 8, "E4"], [16, 8, "E4"], [24, 8, "D4"], [32, 8, "A3"]];
  assert.deepEqual(options(line, 0), ["passing", "anticipation"]);
  assert.deepEqual(options(line, 1), ["neighbourUp", "neighbourDown"]);
  assert.ok(options(line, 2).includes("suspension"));
  const r = realise(line, { 0: "passing" }, 0);
  assert.deepEqual(r.slice(0, 2), [[0, 4, "C4"], [4, 4, "D4"]]);
  // In A minor without a signature, G# down to E passes by F#, not F (an augmented second).
  assert.equal(realise([[0, 8, "G#4"], [8, 8, "E4"]], { 0: "passing" }, 0)[1][2], "F#4");
  assert.deepEqual(augmentedSeconds([[0, 8, "G#4"], [8, 8, "F4"]]), [1]);
});
