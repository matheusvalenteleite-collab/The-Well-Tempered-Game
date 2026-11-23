/**
 * D964: THE MUSICAL OFFERING MADE WHOLE (the owner: "I want it complete"; docs/audits/MUSICAL-OFFERING-PLAN.md). The
 * ten canons and the trio sonata from PDMX (CC0), read up a semitone; each canon's solution obeys its rubric (the
 * canon-rule checker, D962, on the game's own notes), the solutions Rodrigues prints; the trio's three lines Bach's
 * (the editor's realization left out, the written-out trills folded back into signs); the dull lines not offered.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cover, type Kind, type Note } from "../tools/touch/canon-check.ts";

type P = { id: string; barTicks: number; voices: Note[][]; voiceNames: string[]; entries: { voice: number; on: number }[]; credit: string; bars: unknown[] };
const DATA: P[] = JSON.parse(readFileSync(new URL("../data/touch/more-bach.json", import.meta.url), "utf8"));
const piece = (id: string) => DATA.find((p) => p.id === id)!;

/** Each canon: its two canon voices (the likelier leader first), its rule, the share of the follower the first rule must explain. */
const CANONS: [id: string, pair: [number, number], kind: Kind, share: number][] = [
  ["bwv1079-3a", [0, 1], "crab", 1],
  ["bwv1079-3b", [0, 1], "plain", 1],
  ["bwv1079-3c", [2, 1], "contrary", 1],
  ["bwv1079-3d", [2, 0], "augment-contrary", 1],
  ["bwv1079-3e", [2, 1], "plain", 0.9],
  ["bwv1079-4", [1, 0], "plain", 0.97],
  ["bwv1079-2", [0, 2], "plain", 1],
  ["bwv1079-9", [0, 1], "contrary", 0.98],
  ["bwv1079-6", [0, 1], "contrary", 0.9],
  ["bwv1079-7", [0, 1], "plain", 1],
];

test("D964: every canon of the Offering obeys its rubric in the game's notes", () => {
  for (const [id, pair, kind, share] of CANONS) {
    const p = piece(id);
    const { rules } = cover(p.voices, pair, kind, p.barTicks);
    assert.ok(rules.length > 0, `${id}: no rule`);
    const r = rules[0];
    assert.ok(r.matched / r.considered >= share, `${id}: ${r.matched}/${r.considered}`);
    assert.ok(r.matched >= 60, `${id}: only ${r.matched} notes`);
  }
  // The crab canon at the unison, as printed (the file's partner an octave down, put back).
  const crab = cover(piece("bwv1079-3a").voices, [0, 1], "crab", piece("bwv1079-3a").barTicks).rules[0];
  assert.equal(crab.semis, 0);
  // The Canon a 4: each entry seven bars after the last, the second and fourth an octave below the first and third.
  const a4 = piece("bwv1079-7");
  const first = a4.voices.map((v) => v[0]);
  assert.deepEqual(first.map((n) => Math.round(n[0] / a4.barTicks)), [0, 7, 14, 21]);
  assert.deepEqual(first.map((n) => n[2] - first[0][2]), [0, -12, 0, -12]);
});

test("D964: the trio sonata: Bach's three lines (no realization, no written-out trills), its slow movements' continuo not offered", async () => {
  for (const m of ["8a", "8b", "8c", "8d"]) {
    const p = piece(`bwv1079-${m}`);
    assert.deepEqual(p.voiceNames, ["Flute", "Violin", "Continuo"]);
    // No run of four thirty-seconds alternating between two notes is left in any line.
    for (const v of p.voices)
      for (let i = 0; i + 3 < v.length; i++) {
        const w = v.slice(i, i + 4);
        const trill = w.every((n) => n[1] <= 240) && w[0][2] === w[2][2] && w[1][2] === w[3][2] && w[0][2] !== w[1][2] && w.every((n, k) => k === 0 || n[0] === w[k - 1][0] + w[k - 1][1]);
        assert.ok(!trill, `${p.id}: a written-out trill left at ${v[i][0]}`);
      }
    // The continuo a single line: no chord anywhere in it.
    const bass = p.voices[2];
    assert.ok(bass.every((n, i) => i === 0 || n[0] > bass[i - 1][0]), `${p.id}: the continuo one note at a time`);
  }
  const { DULL_VOICES } = await import("../src/touch/voice-mode.ts");
  assert.deepEqual(DULL_VOICES["bwv1079-8a"], [2]);
  assert.deepEqual(DULL_VOICES["bwv1079-8c"], [2]);
  assert.deepEqual(DULL_VOICES["bwv1079-3b"], [2], "the royal theme as a cantus firmus in long notes");
  // The Allegros fugal (their entries in every line), the Largo and the Andante not.
  for (const m of ["8b", "8d"]) assert.deepEqual([...new Set(piece(`bwv1079-${m}`).entries.map((e) => e.voice))].sort(), [0, 1, 2], m);
  for (const m of ["8a", "8c"]) assert.equal(piece(`bwv1079-${m}`).entries.length, 0, m);
});

test("D964: the cards name the work and the piece: MUSIKALISCHES OPFER, CANON, FUGA, the sonata's tempo word", async () => {
  const { pieceWord } = await import("../src/bench/piece-word.ts");
  const TITLES: Record<string, string> = { "bwv1079-8a": "Sonata sopr'il Soggetto Reale: I. Largo", "bwv1079-8c": "Sonata sopr'il Soggetto Reale: III. Andante" };
  const w = (id: string) => pieceWord({ id, kind: "fugue", collection: "mo", short: "", title: TITLES[id] ?? "" } as never);
  assert.equal(w("bwv1079-ric3"), "RICERCAR");
  assert.equal(w("bwv1079-3a"), "CANON");
  assert.equal(w("bwv1079-4"), "FUGA");
  assert.equal(w("bwv1079-8a"), "LARGO");
  assert.equal(w("bwv1079-8c"), "ANDANTE");
  const grid = readFileSync(new URL("../src/bench/LiteGrid.tsx", import.meta.url), "utf8");
  assert.match(grid, /f\.collection === "mo" \? "MUSIKALISCHES OPFER"/);
  for (const p of DATA.filter((x) => /^bwv1079-[0-9]/.test(x.id))) assert.match(p.credit, /PDMX\) · CC0$/, p.id);
});
