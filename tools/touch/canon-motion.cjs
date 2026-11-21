/**
 * D930 (canons session; the owner: "I want to see animation prototypes before big build"): short screen recordings of the
 * echo lane, live from the built game at 932 x 430, each starting a little before a change of leader (the audio clock moved
 * on as in canon-stills.cjs), trimmed with ffmpeg to about 11 s. Nobody plays, so for the recording only the run's fail is
 * switched off (the crowd, proto-game.ts `this.crowd`, held above empty from the page: its field defined as an accessor): the
 * game's code is not changed, and the crowd meter and the MISS marks still show.
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   node tools/touch/canon-motion.cjs OUT_DIR [http://localhost:5310/play.html]
 */
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(process.argv[2] || 'canon-motion');
const URL = process.argv[3] || 'http://localhost:5310/play.html';
const LEAD_S = 4.5;
const W = 932, H = 430, LEN = 11;
// [file, id, tab, start bar, the tempo in quarters a minute, quarters a bar]
const TAKES = [
  ['v12-double-bar', 'bwv988-12', 'GOLD', 14.2, 80, 3],
  ['v24-leader-change', 'bwv988-24', 'GOLD', 6.6, 75, 4.5],
  ['v27-hand-swap', 'bwv988-27', 'GOLD', 13.8, 83, 3],
  ['inv2-leader-change', 'bwv773', 'INV', 8.4, 66, 4],
];
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const [file, id, tab, bar, bpm, qpb] of TAKES) {
    const raw = path.join(out, 'raw-' + file);
    fs.rmSync(raw, { recursive: true, force: true });
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, recordVideo: { dir: raw, size: { width: W, height: H } } });
    const born = Date.now();
    await ctx.addInitScript(() => {
      window.__skip = 0;
      const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');
      Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { get() { return d.get.call(this) + window.__skip; } });
      const def = Object.defineProperty;
      Object.defineProperty = function (o, k, d) {
        if (k !== 'crowd' || !d || typeof d.value !== 'number') return def(o, k, d);
        let v = d.value;
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
    await p.evaluate(() => { window.__t0 = performance.now(); });
    await p.click('#sel-play');
    await p.waitForTimeout(2500);
    const target = ((bar - 1) * qpb * 60) / bpm + LEAD_S;
    await p.evaluate((tg) => { window.__skip = tg - (performance.now() - window.__t0) / 1000; }, target);
    const from = (Date.now() - born) / 1000 + 0.4;
    await p.waitForTimeout((LEN + 1) * 1000);
    const vid = await p.video().path();
    await ctx.close();
    await b.close();
    const dst = path.join(out, `${file}-${W}x${H}.webm`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(2), '-i', vid, '-t', String(LEN), '-c:v', 'libvpx-vp9', '-b:v', '900k', '-an', dst]);
    fs.rmSync(raw, { recursive: true, force: true });
    console.log(dst, `from ${from.toFixed(1)} s`);
  }
})();
