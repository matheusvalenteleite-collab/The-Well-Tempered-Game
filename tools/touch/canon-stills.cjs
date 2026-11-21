/**
 * D930 (canons session): live stills of the echo lane on the built game, each canon reached at its bar, at 932 x 430 and
 * 667 x 375, and a live hit-test at each (both halves of the box, every visible button answers a touch at its centre).
 * The bar is reached by moving the audio clock on (the page's AudioContext reads `currentTime + __skip`): the game itself
 * is not changed. LEAD_S is the start's lead-in, measured (the box's bar counter against the target).
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   node tools/touch/canon-stills.cjs OUT_DIR [http://localhost:5310/play.html]
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(process.argv[2] || 'canon-stills');
const URL = process.argv[3] || 'http://localhost:5310/play.html';
const LEAD_S = 4.5;
// [file, id, tab, bar (1-based, fractional), the tempo in quarters a minute (tempi.ts tempoOf), quarters a bar]
const SHOTS = [
  ['v03', 'bwv988-03', 'GOLD', 2.4, 66, 6],
  ['v06', 'bwv988-06', 'GOLD', 3.5, 81, 1.5],
  ['v09', 'bwv988-09', 'GOLD', 2.5, 66, 4],
  ['v12-after-double-bar', 'bwv988-12', 'GOLD', 17.4, 80, 3],
  ['v15', 'bwv988-15', 'GOLD', 3.4, 54, 2],
  ['v18', 'bwv988-18', 'GOLD', 3.3, 112, 4],
  ['v21', 'bwv988-21', 'GOLD', 2.6, 60, 4],
  ['v24-bar9', 'bwv988-24', 'GOLD', 9.6, 75, 4.5],
  ['v24-bar25', 'bwv988-24', 'GOLD', 25.6, 75, 4.5],
  ['v27-bar17', 'bwv988-27', 'GOLD', 17.2, 83, 3],
  ['inv2-open', 'bwv773', 'INV', 1.0, 66, 4],
  ['inv2-bar11', 'bwv773', 'INV', 11.6, 66, 4],
  ['inv8', 'bwv779', 'INV', 2.6, 84, 3],
];
fs.mkdirSync(out, { recursive: true });
let failed = 0;
async function shot([file, id, tab, bar, bpm, qpb], W, H) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    window.__skip = 0;
    const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');
    Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { get() { return d.get.call(this) + window.__skip; } });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(URL + '?unlock=all');
  for (let i = 0; i < 10 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); }
  const x = await p.$('#install-hint-x'); if (x) await x.click().catch(() => {});
  await p.click('#tab-book-' + tab); await p.waitForTimeout(500);
  await p.click('#tile-' + id); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__t0 = performance.now(); });
  await p.click('#sel-play');
  await p.waitForTimeout(2500);
  const target = ((bar - 1) * qpb * 60) / bpm + LEAD_S;
  await p.evaluate((tg) => { window.__skip = tg - (performance.now() - window.__t0) / 1000 - 0.25; }, target);
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(out, `${file}-${W}x${H}.png`) });
  const r = await p.evaluate(() => {
    const play = document.querySelector('.tg-play').getBoundingClientRect();
    const half = (px) => { const e = document.elementFromPoint(px, play.top + play.height * 0.5); return !!(e && e.closest('.tg-play')); };
    const btns = [...document.querySelectorAll('button')].filter((b) => { const q = b.getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < innerHeight; });
    const hidden = btns.filter((b) => { const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(e && (e === b || b.contains(e))); });
    return { left: half(play.left + play.width * 0.11), right: half(play.right - play.width * 0.11), buttons: btns.length, hidden: hidden.map((b) => b.id || b.className) };
  });
  const ok = r.left && r.right && !r.hidden.length;
  if (!ok) failed++;
  console.log(`${W}x${H} ${file}: ${ok ? 'ok' : 'FAIL'} (both halves; ${r.buttons} buttons, none hidden) ${ok ? '' : JSON.stringify(r)}`);
  await b.close();
}
(async () => {
  for (const [W, H] of [[932, 430], [667, 375]]) for (const s of SHOTS) await shot(s, W, H);
  console.log(failed ? `canon-stills: ${failed} FAILED` : 'canon-stills: ok');
  process.exit(failed ? 1 : 0);
})();
