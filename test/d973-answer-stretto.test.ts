/**
 * D973 (canons session; the owner on the prototypes: "Choose the best"; the board: build both), D974 (the arc): the
 * exposition's answer built from the entry before it, the tonal answer's adjusted notes taking their own step; a
 * stretto's entry built from the entry it overlaps; one cap for every kind; on by default (⚙ CANONS & FUGUES).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { fugueMorphs } from "../src/touch/fugue-morph.ts";

const src = readFileSync(new URL("../src/touch/fugue-morph.ts", import.meta.url), "utf8");

test("the answer: I/2's, from the alto's subject, moved by a fifth, its fourth note (a fourth) adjusted", async () => {
  await loadExtras();
  const f = fugueById("wtc1f02");
  const a = fugueMorphs(f).find((m) => m.kind === "answer")!;
  assert.equal(a.entry.bar, 3);
  assert.equal(a.src, f.entries.find((e) => e.bar === 1));
  assert.equal(a.dS, 4);
  assert.deepEqual(a.adj!.map((x, i) => (x ? i : -1)).filter((i) => i >= 0), [3]);
  // a varied line (more than three notes apart) is moved as one: no adjusted notes
  for (const id of ["wtc1f08", "wtc1f16", "wtc1f22"]) for (const m of fugueMorphs(fugueById(id))) if (m.adj) assert.ok(m.adj.filter(Boolean).length <= 3, id);
});

test("the stretto: an entry in within the first half of another voice's, built from it, at least 0.45 s of flight", async () => {
  await loadExtras();
  const f = fugueById("wtc2f05");
  const ss = fugueMorphs(f).filter((m) => m.kind === "stretto");
  assert.ok(ss.length >= 2);
  for (const m of ss) {
    const p = m.src!;
    assert.ok(p.voice !== m.entry.voice && p.on < m.entry.on && m.entry.on - p.on <= 0.5 * (p.end - p.on));
    assert.ok(m.n.start >= p.on - 1 && m.n.landed < m.tB0);
    assert.ok(((m.n.landed - m.n.fly) / f.tpq) * (60 / 63) >= 0.45 - 1e-6);
  }
});

test("one cap for every kind: at most one morph in 8 bars (the first of each transformed form excepted)", async () => {
  await loadExtras();
  for (const id of ["wtc1f01", "wtc1f02", "wtc1f08", "wtc1f22", "wtc2f05", "wtc2f09"]) {
    const f = fugueById(id), ms = [...fugueMorphs(f)].sort((a, b) => a.entry.on - b.entry.on);
    const seen = new Set<string>();
    let last = -Infinity;
    for (const m of ms) {
      const fk = `${m.entry.theme ?? 1}:${!!m.entry.inverted}:${m.entry.scale ?? 1}`;
      const first = m.kind === "form" && !seen.has(fk);
      if (m.kind === "form") seen.add(fk);
      assert.ok(first || m.entry.on >= last + 8 * f.barTicks, `${id} bar ${m.entry.bar}`);
      last = m.entry.on;
    }
  }
});

test("on by default (no address flag); the adjusted note's step over the last half, its arc 1.5x higher (D974); no words", () => {
  assert.ok(!/PROTO|URLSearchParams/.test(src));
  assert.match(src, /const ru = m\.adj\?\.\[i\] \? ease\(\(u - 0\.5\) \/ 0\.5\) : u;/);
  assert.match(src, /- own \* k\.bh \* 2\.25,/);
  // drawn again over the player's notes while it takes its step (the answer may be the player's own voice)
  assert.match(src, /if \(over && m\.adj && near && k\.now >= m\.n\.fly && k\.now < m\.n\.landed\) \{/);
  assert.ok(!/k\.text\(|fillText|strokeText/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
});
