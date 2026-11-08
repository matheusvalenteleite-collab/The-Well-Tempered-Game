/**
 * D542: the game's recordings made smaller for the wire, beside each MP3 (the masters are not in the repository; the MP3s
 * are kept as the last fallback and for src/audio's packs): Opus in WebM (.webm: what Chrome and Firefox decode best at
 * the lowest rates) and AAC-LC in MP4 (.m4a: Safari's, every iPhone's). sampled.ts takes the first its browser decodes.
 * Bit rates by what the instrument needs under the game's master lowpass (6.5 kHz): Opus stereo 64 kbit/s, mono 32, the
 * low instruments and the drums 24; AAC stereo 80, mono 48, low and drums 40 (the MP3s: 64-128). Usage:
 * node tools/playback/codec/transcode.mjs [--force] (ffmpeg's aac and libopus; a file is redone only when its MP3 is
 * newer). Then `node tools/sample-manifest.mjs`.
 */
import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { promisify } from "node:util";
import os from "node:os";

const run = promisify(execFile);
const root = "public/samples";
const force = process.argv.includes("--force");
const LOW = new Set(["rickBass", "jazzBass", "jazzBassHard", "ebass", "contrabass", "bassPizz", "bassStac", "brassBass", "brassBassP", "pipePedal", "trioBassoon", "trioBassoonMf", "trioBassoonShort", "bassoon", "celloPizz", "celloStac", "timpani"]);
const folders = [];
for (const d of readdirSync(root).sort()) {
  if (!statSync(`${root}/${d}`).isDirectory()) continue;
  if (d === "drums") for (const k of readdirSync(`${root}/drums`).sort()) statSync(`${root}/drums/${k}`).isDirectory() && folders.push(`drums/${k}`);
  else folders.push(d);
}
const jobs = [];
for (const folder of folders)
  for (const f of readdirSync(`${root}/${folder}`)) {
    if (!f.endsWith(".mp3") || f === "pack.mp3") continue;
    const src = `${root}/${folder}/${f}`;
    for (const ext of [".m4a", ".webm"]) {
      const dst = src.replace(/\.mp3$/, ext);
      if (!force && existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue;
      jobs.push({ folder, src, dst, ext });
    }
  }
export const RATES = { ".m4a": { stereo: 80, mono: 48, low: 40 }, ".webm": { stereo: 64, mono: 32, low: 24 } };
async function one({ folder, src, dst, ext }) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", src]);
  const r = RATES[ext];
  const kbps = Number(stdout.trim()) >= 2 ? r.stereo : folder.startsWith("drums/") || LOW.has(folder) ? r.low : r.mono;
  const codec = ext === ".m4a" ? ["-c:a", "aac", "-movflags", "+faststart"] : ["-c:a", "libopus", "-application", "audio"];
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-map_metadata", "-1", ...codec, "-b:a", `${kbps}k`, dst]);
}
let i = 0;
await Promise.all(Array.from({ length: Math.max(1, os.cpus().length) }, async () => {
  while (i < jobs.length) await one(jobs[i++]);
}));
console.log(`${jobs.length} files encoded`);
