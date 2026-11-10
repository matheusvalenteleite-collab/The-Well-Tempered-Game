// D630, THE AUDITION CLIPS ENCODED: render.cjs's phrases (mono float, 32 kHz, from the first note) as public/audition/
// <sound>.mp3: 10 ms fade in, 150 ms fade out at 3.5 s, the level matched to -23 LUFS on the phone model (mono, two 2nd-order
// 600 Hz high-passes, ffmpeg's ebur128 integrated), a peak limiter at -1 dBFS where the gain needs it; MP3 at 48 kbps mono
// (lame, 32 kHz). Each clip measured again as decoded and the gain corrected (up to four passes, to within 0.2 LU); the
// measurements in public/audition/clips.json ({ phrase, target, clips: { sound: { lufs, peakDb, gainDb, drums, bytes } } }).
//
// usage: node tools/touch/audition/encode.cjs <render dir> [out dir = public/audition]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [inDir, outDir = path.join(__dirname, '../../../public/audition')] = process.argv.slice(2);
const TARGET = -23, SR = 32000, SECS = 3.5, KBPS = 48;
const PHONE = 'highpass=f=600:p=2,highpass=f=600:p=2';
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
function measure(input, inArgs = []) {
  // ffmpeg prints the ebur128 summary on stderr; run with -f null and capture it.
  const r = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...inArgs, '-i', input, '-af', `${PHONE},ebur128=peak=sample`, '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const lufs = +/I:\s+(-?[\d.]+) LUFS/.exec(s)[1];
  const r2 = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...inArgs, '-i', input, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], { encoding: 'utf8' });
  const s2 = r2.stderr.slice(r2.stderr.lastIndexOf('Summary:'));
  const peakDb = +/Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(s2)[1];
  return { lufs, peakDb };
}
fs.mkdirSync(outDir, { recursive: true });
const raw = ['-f', 'f32le', '-ar', String(SR), '-ac', '1'];
const clips = {};
let phrase = null;
for (const f of fs.readdirSync(inDir).filter((x) => x.endsWith('.json')).sort()) {
  const info = JSON.parse(fs.readFileSync(path.join(inDir, f), 'utf8'));
  phrase = info.phrase;
  const src = path.join(inDir, `${info.sound}.f32`);
  const out = path.join(outDir, `${info.sound}.mp3`);
  let gainDb = TARGET - measure(src, raw).lufs;
  let m = null;
  for (let pass = 0; pass < 4; pass++) {
    const af = `afade=t=in:d=0.01,afade=t=out:st=${SECS - 0.15}:d=0.15,volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.891:attack=1:release=40:level=false:latency=1,atrim=0:${SECS}`;
    ff(['-y', '-loglevel', 'error', ...raw, '-i', src, '-af', af, '-c:a', 'libmp3lame', '-b:a', `${KBPS}k`, '-ar', String(SR), '-ac', '1', '-map_metadata', '-1', '-write_xing', '0', out]);
    m = measure(out);
    if (Math.abs(m.lufs - TARGET) <= 0.2) break;
    gainDb += TARGET - m.lufs;
  }
  const notes = [];
  if (info.stageAt !== null && info.stageAt !== undefined) notes.push(`the full complement: forced to stage ${info.stageAt}, the final group's line-up (the render only)`);
  if (info.harmony?.length) notes.push(`timpani as at an arrival: ${info.harmony.map((h) => `${h.drum} ${h.midi} at beat ${h.beat} over [${h.sounding.join(' ')}] ${h.ok ? 'struck' : 'not struck (clash)'}`).join('; ')}`);
  clips[info.sound] = { lufs: m.lufs, peakDb: m.peakDb, gainDb: +gainDb.toFixed(2), drums: info.drums, strokes: info.strokes, ...(info.timp?.length ? { timpAt: info.timp } : {}), ...(notes.length ? { notes } : {}), bytes: fs.statSync(out).size };
  console.log(info.sound, JSON.stringify(clips[info.sound]));
}
fs.writeFileSync(path.join(outDir, 'clips.json'), JSON.stringify({ phrase, target: TARGET, model: 'mono, 2x 2nd-order 600 Hz high-pass, ebur128 integrated', kbps: KBPS, clips }, null, 1) + '\n');
const total = Object.values(clips).reduce((a, c) => a + c.bytes, 0);
console.log('total', total, 'bytes', (total / 1024).toFixed(1), 'KB');
