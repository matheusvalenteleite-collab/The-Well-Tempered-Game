/**
 * D962: THE CANON-RULE CHECKER (tools/touch/canon-check.ts), built to check the Musical Offering's realised canons
 * against their rubrics. Pinned here to the canons the game already has: it must find each one's rule, at the
 * interval the title names, explaining the follower whole; and it must find a crab canon's reversal and refuse two
 * unrelated lines.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cover, KNOWN, piece, type Note } from "../tools/touch/canon-check.ts";

/** The title's interval as the first rule's diatonic steps (follower minus leader), or the mirror's sum. */
const STEPS: Record<string, number> = {
  "bwv1080-c14": 55,
  "bwv1080-c15": -7,
  "bwv1080-c16": 9,
  "bwv1080-c17": 11,
  "bwv988-03": 0,
  "bwv988-12": 61,
  "bwv988-15": 68,
};

test("D962: the game's own canons are found, each at its titled interval", () => {
  for (const k of KNOWN) {
    const p = piece(k.id);
    const { rules } = cover(p.voices, k.pair, k.kind, p.barTicks);
    assert.ok(rules.length > 0, `${k.id}: no rule`);
    const r = rules[0];
    assert.equal(r.kind, k.kind, k.id);
    assert.equal(r.steps, STEPS[k.id], `${k.id}: steps`);
    assert.ok(r.matched / r.considered >= 0.95, `${k.id}: ${r.matched}/${r.considered}`);
    assert.ok(r.matched >= 100, `${k.id}: only ${r.matched} notes explained`);
  }
});

test("D962: the canons whose voices swap roles at the half are found in both halves", () => {
  for (const id of ["bwv1080-c14", "bwv1080-c16", "bwv1080-c17", "bwv988-12"]) {
    const k = KNOWN.find((x) => x.id === id)!;
    const p = piece(id);
    const { rules } = cover(p.voices, k.pair, k.kind, p.barTicks);
    assert.ok(new Set(rules.map((r) => r.follower)).size === 2, `${id}: one direction only`);
  }
});

test("D962: a crab canon is found reversed, and two unrelated lines are refused", () => {
  // A leader of 40 notes on a scale-like walk; the crab follower is its reversal, sounding together.
  const lead: Note[] = [];
  let [t, d] = [0, 30];
  for (let i = 0; i < 40; i++) {
    const len = [480, 960, 480, 1920][i % 4];
    d += [1, -1, 2, -2, 1, 3, -4][i % 7];
    lead.push([t, len, 60 + d - 30, d]);
    t += len;
  }
  const end = t;
  const crab = lead.map(([on, len, m, dia]) => [end - on - len, len, m, dia] as Note).reverse();
  const r = cover([lead, crab], [0, 1], "crab", 7680).rules[0];
  assert.ok(r && r.matched === 40 && r.considered === 40, "crab");
  // An unrelated line: the same rhythm, its steps a different walk.
  const other = lead.map(([on, len], i) => [on + 3840, len, 0, 20 + ((i * 5) % 9)] as Note);
  assert.equal(cover([lead, other], [0, 1], "plain", 7680).rules.length, 0, "unrelated lines refused");
});
