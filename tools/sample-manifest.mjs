// Regenerate src/audio/sample-manifest.ts from public/samples (one folder per instrument).
// Files: <note>.mp3, or <note>-v<layer>.mp3 for velocity layers. Usage: node tools/sample-manifest.mjs
// D112: each instrument's files are also packed, in sorted order, into public/samples/<set>/pack.mp3
// (not kept in git; rebuilt by `npm run build`), so that the page fetches one file per instrument;
// the manifest records each file's offset and length in the pack.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
const root = "public/samples";
const out = {};
for (const set of readdirSync(root).filter((d) => statSync(`${root}/${d}`).isDirectory() && d !== "drums").sort()) {
  const files = readdirSync(`${root}/${set}`).filter((f) => f.endsWith(".mp3") && f !== "pack.mp3").sort();
  const notes = new Set();
  const layers = new Set();
  const pack = {};
  const parts = [];
  let offset = 0;
  for (const f of files) {
    const m = /^([A-G]s?-?\d)(?:-v(\d+))?\.mp3$/.exec(f);
    if (!m) throw new Error(`unexpected sample ${set}/${f}`);
    notes.add(m[1]);
    if (m[2]) layers.add(Number(m[2]));
    const bytes = readFileSync(`${root}/${set}/${f}`);
    pack[f] = [offset, bytes.length];
    parts.push(bytes);
    offset += bytes.length;
  }
  writeFileSync(`${root}/${set}/pack.mp3`, Buffer.concat(parts));
  out[set] = { notes: [...notes].sort(), layers: [...layers].sort((a, b) => a - b), pack, ...wire(`${root}/${set}`, files) };
}
// D542: the drum kits' folders too (their files by piece, not note: no notes), for the wire formats and the lengths.
for (const kit of readdirSync(`${root}/drums`).filter((d) => statSync(`${root}/drums/${d}`).isDirectory()).sort()) {
  const files = readdirSync(`${root}/drums/${kit}`).filter((f) => f.endsWith(".mp3")).sort();
  const pack = Object.fromEntries(files.map((f) => [f, [0, statSync(`${root}/drums/${kit}/${f}`).size]]));
  out[`drums/${kit}`] = { notes: [], layers: [], pack, ...wire(`${root}/drums/${kit}`, files) };
}
/** D542: each MP3's smaller copies (tools/playback/codec/transcode.mjs), by the MP3's name: their lengths. */
function wire(dir, files) {
  const alt = {};
  for (const ext of ["webm", "m4a"]) {
    const has = Object.fromEntries(files.filter((f) => existsSync(`${dir}/${f.replace(/\.mp3$/, `.${ext}`)}`)).map((f) => [f, statSync(`${dir}/${f.replace(/\.mp3$/, `.${ext}`)}`).size]));
    if (Object.keys(has).length === files.length && files.length) alt[ext] = has;
  }
  return Object.keys(alt).length ? { alt } : {};
}
writeFileSync(
  "src/audio/sample-manifest.ts",
  `/** Generated from public/samples (do not edit by hand): the sampled notes of each instrument, and where each file lies in its pack. */\nexport const SAMPLE_MANIFEST: Record<string, { notes: string[]; layers: number[]; pack: Record<string, [number, number]>; alt?: Partial<Record<"webm" | "m4a", Record<string, number>>> }> = ${JSON.stringify(out)};\n`,
);
console.log(Object.keys(out).join(" "));
