// Regenerate src/audio/sample-manifest.ts from public/samples (one folder per instrument).
// Files: <note>.mp3, or <note>-v<layer>.mp3 for velocity layers. Usage: node tools/sample-manifest.mjs
import { readdirSync, statSync, writeFileSync } from "node:fs";
const root = "public/samples";
const out = {};
for (const set of readdirSync(root).filter((d) => statSync(`${root}/${d}`).isDirectory()).sort()) {
  const files = readdirSync(`${root}/${set}`).filter((f) => f.endsWith(".mp3"));
  const notes = new Set();
  const layers = new Set();
  for (const f of files) {
    const m = /^([A-G]s?-?\d)(?:-v(\d+))?\.mp3$/.exec(f);
    if (!m) throw new Error(`unexpected sample ${set}/${f}`);
    notes.add(m[1]);
    if (m[2]) layers.add(Number(m[2]));
  }
  out[set] = { notes: [...notes].sort(), layers: [...layers].sort((a, b) => a - b) };
}
writeFileSync("src/audio/sample-manifest.ts", `/** Generated from public/samples (do not edit by hand): the sampled notes of each instrument. */\nexport const SAMPLE_MANIFEST: Record<string, { notes: string[]; layers: number[] }> = ${JSON.stringify(out, null, 1)};\n`);
console.log(Object.keys(out).join(" "));
