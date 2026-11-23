/**
 * D964 (progression session): stills of the Musical Offering made whole, on the built game, at 932 x 430 and 667 x 375:
 * the MORE tab at the MUSICAL OFFERING section (its tiles), and canons in play (reached at their bar by moving the audio
 * clock on, as tools/touch/canon-stills.cjs does: the game itself is not changed).
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   NODE_PATH=$(npm root -g) node tools/touch/mo-stills.cjs OUT_DIR [http://localhost:5310/play.html]
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(process.argv[2] || 'mo-stills');
const URL = process.argv[3] || 'http://localhost:5310/play.html';
const LEAD_S = 4.5;
// [file, id, bar (1-based), quarters a minute (tempi.ts), quarters a bar]
const PLAY = [
  ['canon-3e-per-tonos', 'bwv1079-3e', 3.3, 60, 4],
  ['canon-a4-all-four', 'bwv1079-7', 23.3, 66, 4],
];
fs.mkdirSync(out, { recursive: true });
async function open(W, H) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    // the unlocked view (unlock.ts UNLOCK_KEY): the MORE tab shown
    try { localStorage.setItem('tb-unlock-all', '1'); } catch {}
    window.__skip = 0;
    const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');
    Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { get() { return d.get.call(this) + window.__skip; } });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(URL + '?unlock=all');
  for (let i = 0; i < 10 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); }
  const x = await p.$('#install-hint-x'); if (x) await x.click().catch(() => {});
  await p.click('#tab-book-MORE'); await p.waitForTimeout(600);
  // the MORE tab's sections are folded: open the Musical Offering's
  await p.getByText(/^\s*.?\s*MUSICAL OFFERING/).first().click(); await p.waitForTimeout(600);
  return { b, p };
}
(async () => {
  for (const [W, H] of [[932, 430], [667, 375]]) {
    const { b, p } = await open(W, H);
    await p.$eval('#card-bwv1079-ric3', (e) => e.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(out, `tiles-${W}x${H}.png`) });
    await p.$eval('#card-bwv1079-8d', (e) => e.scrollIntoView({ block: 'end' }));
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(out, `tiles-end-${W}x${H}.png`) });
    await b.close();
    for (const [file, id, bar, bpm, qpb] of PLAY) {
      const { b: b2, p: q } = await open(W, H);
      await q.click('#card-' + id); await q.waitForTimeout(400);
      await q.evaluate(() => { window.__t0 = performance.now(); });
      await q.click('#play');
      await q.waitForTimeout(2500);
      const target = ((bar - 1) * qpb * 60) / bpm + LEAD_S;
      await q.evaluate((tg) => { window.__skip = tg - (performance.now() - window.__t0) / 1000 - 0.25; }, target);
      await q.waitForTimeout(250);
      await q.screenshot({ path: path.join(out, `${file}-${W}x${H}.png`) });
      console.log(`${W}x${H} ${file}`);
      await b2.close();
    }
  }
})();
