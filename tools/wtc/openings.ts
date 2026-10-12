// The openings of the fugues, for settling subjects by hand (docs/wtc/SUBJECTS.md): for each fugue, every
// voice in the order of entry, its notes from its entry to the fourth entry (or 3 bars after the third),
// as bar:beat pitch duration; and the machine's reading (subjectAndAnswer). One text file per fugue.
// Usage: node tools/wtc/openings.ts <out-dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { WtcPiece } from "../../src/wtc/corpus.ts";
import { entryOrder, line, subjectAndAnswer, TPQ } from "../../src/wtc/fugue.ts";

const out = process.argv[2] ?? "openings";
mkdirSync(out, { recursive: true });
const all = [...(JSON.parse(readFileSync("data/wtc/fugues.json", "utf8")) as WtcPiece[]), ...(JSON.parse(readFileSync("data/wtc/more.json", "utf8")) as WtcPiece[])];
const VAL: Record<number, string> = { 4: "w", 3: "h.", 2: "h", 1.5: "q.", 1: "q", 0.75: "e.", 0.5: "e", 0.375: "s.", 0.25: "s", 0.125: "t" };
for (const p of all) {
  const [n, d] = p.meter.split("/").map(Number);
  const bar = (n * 4 * TPQ) / d;
  const beat = (4 * TPQ) / d;
  // Bars from the encoding when it has them (a pickup is bar 0), else from time 0.
  const first = p.bars.find((b) => b.n === 1)?.on ?? 0;
  const where = (t: number) => {
    const k = Math.floor((t - first) / bar);
    const r = t - first - k * bar;
    return `${k + 1}:${+(1 + r / beat).toFixed(3)}`;
  };
  const order = entryOrder(p);
  const stop = order[3]?.[1] ?? (order[2] ? order[2][1] + 3 * bar : order[1][1] + 4 * bar);
  const lines: string[] = [`# ${p.id} key ${p.key} ${p.mode} metre ${p.meter} voices ${p.voices.length} (voice 0 = top)`];
  order.forEach(([v, on], k) => {
    const l = line(p.voices[v]).filter((x) => x.on >= on && x.on < stop + bar);
    lines.push(`## entry ${k + 1}: voice ${v} at ${where(on)}`);
    lines.push(l.map((x, i) => `${i}|${where(x.on)} ${x.pitch} ${VAL[x.dur / TPQ] ?? (x.dur / TPQ).toFixed(3)}`).join("  "));
  });
  const sa = subjectAndAnswer(p);
  lines.push(`## machine reading: subject ${sa.subject.length} notes, ending ${where(sa.subject[sa.subject.length - 1].on)} ${sa.subject[sa.subject.length - 1].pitch}`);
  writeFileSync(`${out}/${p.id}.txt`, lines.join("\n") + "\n");
}
console.log(all.length, "openings");
