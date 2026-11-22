/**
 * D952: THE SPLIT-VOICE GUARD. The Goldberg canons' fault (D908): one line handed between two of a piece's voice
 * tracks because the source writes it in whichever hand plays it. A hand-over: a voice's note ends and the voice rests
 * (a beat or more), while within half a beat another voice, resting before (a beat or more), takes up the line within
 * a major third. Counted only where a source is laid out by hand or staff, and between voices of one keyboard (a line
 * passed between different parts is the music's imitation); the concertos' "inner notes" (chord tones, by design)
 * left out. test/d952-split-guard.test.ts fails on any piece beyond the known cases (the D952 audit: all fine).
 *   node tools/touch/split-audit.ts   (every piece's count, highest first)
 */
import { readFileSync } from "node:fs";

export interface SplitPiece { id: string; kind: string; collection?: string; tpq: number; voices: number[][][]; voiceNames: string[] }
const KEYBOARD = new Set(["goldberg", "keyboard", "inv", "duet"]);
/** Whether a piece's source is laid out by hand or staff (its voices the edition's layers or hands). */
export function handBased(p: SplitPiece, collection: string): boolean {
  if (collection === "WTC prelude") return p.voices.length === 2;
  if (collection === "concerto") return /hand/i.test(p.voiceNames.join(" "));
  return KEYBOARD.has(collection);
}
/** A piece's hand-overs between voices of one keyboard. */
export function handovers(p: SplitPiece, collection: string): number {
  if (!handBased(p, collection)) return 0;
  const beat = p.tpq;
  const inst = (k: number) => (p.voiceNames[k] ?? "").split(",")[0].replace(/^Harpsichords$/, "Harpsichord");
  const inner = (k: number) => /inner notes/i.test(p.voiceNames[k] ?? "");
  const ensemble = /Harpsichord/.test(p.voiceNames.join(" "));
  const same = (i: number, j: number) => !inner(i) && !inner(j) && (!ensemble || (/Harpsichord/.test(inst(i)) && inst(i) === inst(j)));
  const V = p.voices.map((v) => [...v].sort((x, y) => x[0] - y[0] || y[2] - x[2]));
  let n = 0;
  for (let i = 0; i < V.length; i++)
    for (let j = 0; j < V.length; j++) {
      if (i === j || !same(i, j)) continue;
      for (let k = 0; k < V[i].length; k++) {
        const x = V[i][k], end = x[0] + x[1], next = V[i][k + 1];
        if (next && next[0] < end + beat) continue;
        const y = V[j].find((m) => Math.abs(m[0] - end) <= beat / 2);
        if (!y) continue;
        const before = V[j].filter((m) => m[0] < y[0]).at(-1);
        if (before && before[0] + before[1] > y[0] - beat) continue;
        if (Math.abs(y[2] - x[2]) <= 4) n++;
      }
    }
  return n;
}
/** Every piece in the game's data with its collection (as the audit groups them). */
export function allPieces(dir = new URL("../../data/touch/", import.meta.url)): [string, SplitPiece][] {
  const load = (f: string): SplitPiece[] => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  return [
    ...load("pieces.json").map((p) => [p.kind === "prelude" ? "WTC prelude" : p.id.startsWith("wtc") ? "WTC fugue" : "AoF C14", p] as [string, SplitPiece]),
    ...load("more-bach.json").map((p) => [p.collection ?? "more", p] as [string, SplitPiece]),
    ...load("concertos.json").map((p) => ["concerto", p] as [string, SplitPiece]),
    ...load("chorales.json").map((p) => ["chorale", p] as [string, SplitPiece]),
  ];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = allPieces().map(([c, p]) => [p.id, c, handovers(p, c)] as const).filter((r) => r[2] > 0).sort((a, b) => b[2] - a[2]);
  for (const [id, c, n] of rows) console.log(`${id.padEnd(12)} ${c.padEnd(12)} ${n}`);
}
