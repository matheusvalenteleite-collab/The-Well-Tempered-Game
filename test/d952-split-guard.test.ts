/**
 * D952: THE SPLIT-VOICE GUARD (tools/touch/split-audit.ts). The Goldberg canons' fault (D908): a line handed between
 * two of a piece's voice tracks because the source writes it in whichever hand plays it. A piece of a hand- or
 * staff-based source fails here at five hand-overs or more, unless named below with the count the D952 audit read
 * and found the music's own (none of them a split). The old Goldberg Variation 12 counted 14, Variation 24 6.
 * The canons' own guard is d930 and d908 (their legs paired, their lines whole).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { allPieces, handovers } from "../tools/touch/split-audit.ts";

const LIMIT = 5;
/** The audit's fine cases (D952): the count read, and why it is the music's. */
const KNOWN: Record<string, [number, string]> = {
  "bwv1064-3": [8, "three harpsichords' hands answering each other (imitation)"],
  bwv783: [6, "Invention 12's arpeggios imitated hand to hand a fourth apart (bars 7-8, 16-17)"],
  "bwv1063-1": [6, "three harpsichords' hands answering each other (imitation)"],
  wtc1p21: [5, "the toccata's runs passed hand to hand, as written (bars 8, 12, 14, 19, 20)"],
  wtc2p07: [5, "the falling runs continued from hand to hand, as written (bars 56-60)"],
  "bwv998-2": [5, "broken-chord episodes passing between the fugue's voices (bars 55, 63)"],
};

test("D952: no piece hands a line between its voice tracks (the Goldberg canons' fault) beyond the known cases", () => {
  const over: string[] = [];
  for (const [c, p] of allPieces()) {
    const n = handovers(p, c);
    const known = KNOWN[p.id]?.[0];
    if (n >= LIMIT && (known === undefined || n > known)) over.push(`${p.id} (${c}): ${n} hand-overs`);
  }
  assert.deepEqual(over, [], "a new split? read it against the print (as D908) or name it here with its reason");
});

test("D952: the guard catches the fault it was made for (a line passed back and forth between two voices)", () => {
  // Two voices of one hand-based keyboard piece passing a stepwise line to and fro every bar.
  const bar = 1920 * 4;
  const a: number[][] = [], b: number[][] = [];
  for (let k = 0; k < 8; k++) (k % 2 ? b : a).push([k * bar, bar, 60 + (k % 3), 0]);
  const p = { id: "split", kind: "fugue", tpq: 1920, voices: [a, b], voiceNames: ["Right hand", "Left hand"] };
  assert.ok(handovers(p, "keyboard") >= LIMIT);
  assert.equal(handovers(p, "chorale"), 0, "not counted where the source is by parts");
});
