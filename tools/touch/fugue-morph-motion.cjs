/**
 * D972 (canons session; the board: live recordings at 1x of the fugues' morphs, beside the gallery's): short screen
 * recordings from the built game at 932 x 430, 30 fps, each starting a little before a transformed entry, recorded as
 * canon-motion.cjs records (Chromium's screencast; the audio clock moved on to the bar; the run's fail held off).
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   node tools/touch/fugue-morph-motion.cjs OUT_DIR [http://localhost:5310/play.html] [a take's name]
 */
const fs = require('node:fs');
const path = require('node:path');
const { take } = require('./canon-motion.cjs');
// [file, id, tab, start bar, the tempo in quarters a minute, quarters a bar, seconds]
const TAKES = [
  ['ii22-isolated-inversion', 'wtc2f22', 'II', 39.8, 164, 6, 8],
  ['i08-inversion', 'wtc1f08', 'I', 28.9, 59, 4, 10],
  ['ii02-augmentation', 'wtc2f02', 'II', 13.3, 46, 4, 11],
  ['ii09-diminution', 'wtc2f09', 'II', 25.4, 100, 8, 9],
];
if (require.main === module)
  (async () => {
    const out = path.resolve(process.argv[2] || 'fugue-morph-motion');
    fs.mkdirSync(out, { recursive: true });
    for (const t of TAKES) if (!process.argv[4] || t[0] === process.argv[4]) await take(t, out);
  })();
