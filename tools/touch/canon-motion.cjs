/**
 * D970 (canons session; the owner: "I want to see animation prototypes before big build"; the board: live recordings at
 * 1x, at least 24 fps): short screen recordings of the canons' rolling ribbon, live from the built game at 932 x 430,
 * each starting a little before a change of leader, at 30 fps.
 *
 * Recorded from Chromium's own screencast (CDP Page.startScreencast, ~60 frames a second, each with its timestamp), the
 * device metrics set explicitly to the phone's (a mobile context's video otherwise shows the page at about 60% in a
 * corner of the frame), the frames laid on a constant 30 fps by their timestamps (ffmpeg concat). The bar is reached by
 * moving the audio clock on (the page's AudioContext reads `currentTime + __skip`); nobody plays, so for the recording
 * only the run's fail is switched off (the crowd, proto-game.ts `this.crowd`, held above empty from the page: its field
 * defined as an accessor). The game's code is not changed; the crowd meter and the MISS marks still show.
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   node tools/touch/canon-motion.cjs OUT_DIR [http://localhost:5310/play.html] [a take's name, to record it alone]
 */
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(process.argv[2] || 'canon-motion');
const URL = process.argv[3] || 'http://localhost:5310/play.html';
const LEAD_S = 4.5;
const W = 932, H = 430, FPS = 30;
// [file, id, tab, start bar, the tempo in quarters a minute, quarters a bar, seconds]
const TAKES = [
  ['v12-double-bar', 'bwv988-12', 'GOLD', 14.2, 80, 3, 11],
  ['v12-bars-1-4', 'bwv988-12', 'GOLD', 1, 80, 3, 9],
  ['v12-bars-17-20', 'bwv988-12', 'GOLD', 17, 80, 3, 9],
  ['v24-leader-change', 'bwv988-24', 'GOLD', 6.6, 75, 4.5, 11],
  ['v27-hand-swap', 'bwv988-27', 'GOLD', 13.8, 83, 3, 11],
  ['inv2-leader-change', 'bwv773', 'INV', 9.6, 66, 4, 14],
];

/** Frames from the page's screencast for `secs` seconds: [{ t (s), jpeg (Buffer) }]. */
async function cast(page, cdp, secs) {
  const frames = [];
  const on = (f) => {
    frames.push({ t: f.metadata.timestamp, jpeg: Buffer.from(f.data, 'base64') });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  };
  cdp.on('Page.screencastFrame', on);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.waitForTimeout(secs * 1000);
  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', on);
  return frames;
}
/** The frames, each held until the next one's timestamp, as a constant-rate webm. */
function encode(frames, file, secs) {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cast-'));
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const name = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
    fs.writeFileSync(name, f.jpeg);
    const next = frames[i + 1] ? frames[i + 1].t : f.t + 1 / FPS;
    lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${path.join(dir, `f${String(frames.length - 1).padStart(5, '0')}.jpg`)}'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-t', String(secs), '-vf', `fps=${FPS},scale=${W}:${H}`, '-c:v', 'libvpx-vp9', '-b:v', '1500k', '-an', file]);
  fs.rmSync(dir, { recursive: true, force: true });
}
module.exports = { cast, encode, W, H, FPS };

async function take([file, id, tab, bar, bpm, qpb, secs]) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    window.__skip = 0;
    const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');
    Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { get() { return d.get.call(this) + window.__skip; } });
    const def = Object.defineProperty;
    Object.defineProperty = function (o, k, dd) {
      if (k !== 'crowd' || !dd || typeof dd.value !== 'number') return def(o, k, dd);
      let v = dd.value;
      return def(o, k, { configurable: true, enumerable: true, get: () => v, set: (x) => { v = Math.max(x, 0.05); } });
    };
    // (the bundle's field helper defines a field only where the name is already `in` the object: else it assigns)
    def(Object.prototype, 'crowd', { configurable: true, get() { return undefined; }, set(x) { Object.defineProperty(this, 'crowd', { value: x }); } });
  });
  const p = await ctx.newPage();
  await p.goto(URL + '?unlock=all');
  for (let i = 0; i < 10 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); }
  const x = await p.$('#install-hint-x'); if (x) await x.click().catch(() => {});
  await p.click('#tab-book-' + tab); await p.waitForTimeout(500);
  await p.click('#tile-' + id); await p.waitForTimeout(400);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true, screenWidth: W, screenHeight: H });
  await p.evaluate(() => { window.__t0 = performance.now(); });
  await p.click('#sel-play');
  await p.waitForTimeout(2500);
  const target = ((bar - 1) * qpb * 60) / bpm + LEAD_S;
  await p.evaluate((tg) => { window.__skip = tg - (performance.now() - window.__t0) / 1000; }, target);
  const frames = await cast(p, cdp, secs + 0.3);
  await b.close();
  const dst = path.join(out, `${file}-${W}x${H}.webm`);
  encode(frames, dst, secs);
  console.log(dst, `${frames.length} frames (${(frames.length / secs).toFixed(0)} a second captured), ${FPS} fps`);
}
if (require.main === module)
  (async () => {
    fs.mkdirSync(out, { recursive: true });
    for (const t of TAKES) if (!process.argv[4] || t[0] === process.argv[4]) await take(t);
  })();
