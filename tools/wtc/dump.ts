// A stretch of a fugue as text, for reading by hand (D160): every voice's notes in the bars asked for, as
// bar:beat pitch value (voice 0 the top). Usage: node tools/wtc/dump.ts <id> <from-bar> <to-bar>
import { readFileSync } from "node:fs";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { line, TPQ } from "../../src/wtc/fugue.ts";

const [id, a, b] = process.argv.slice(2);
const all = [...(JSON.parse(readFileSync("data/wtc/fugues.json", "utf8")) as WtcPiece[]), ...(JSON.parse(readFileSync("data/wtc/more.json", "utf8")) as WtcPiece[])];
const p = all.find((x) => x.id === id);
if (!p) throw new Error(`no piece ${id}`);
const [n, d] = p.meter.split("/").map(Number);
const bar = (n * 4 * TPQ) / d;
const beat = (4 * TPQ) / d;
const first = p.bars.find((x) => x.n === 1)?.on ?? 0;
// From bar 1, the pickup bar (bar 0) is included: an upbeat is part of the music asked for.
const from = Number(a) <= 1 ? 0 : first + (Number(a) - 1) * bar;
const to = first + Number(b) * bar;
// A pickup is bar 0, its beats counted as if it were a whole bar (an upbeat quarter in 4/4 is 0:4).
const where = (t: number) => {
  const k = Math.floor((t - first) / bar);
  return `${k + 1}:${+(1 + (t - first - k * bar) / beat).toFixed(3)}`;
};
const VAL: Record<number, string> = { 8: "b", 6: "w.", 4: "w", 3: "h.", 2: "h", 1.5: "q.", 1: "q", 0.75: "e.", 0.5: "e", 0.375: "s.", 0.25: "s", 0.125: "t" };
console.log(`# ${id} bars ${a}-${b}, metre ${p.meter}, ${p.voices.length} voices (0 = top)`);
p.voices.forEach((v, k) => {
  const l = line(v).filter((x) => x.on + x.dur > from && x.on < to);
  console.log(`v${k}: ${l.map((x) => `${where(x.on)} ${x.pitch} ${VAL[x.dur / TPQ] ?? (x.dur / TPQ).toFixed(3)}`).join("  ")}`);
});
