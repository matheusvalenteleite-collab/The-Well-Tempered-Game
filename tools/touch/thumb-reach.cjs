/**
 * D472 addendum (design studio): THE THUMBS' REACH, live. On the built game (play.html), at 844 x 390 and 667 x 375, for a
 * fugue of each kind of foot (no stops, STRING CONSORT's stops, the harpsichord's pistons): every bar's centre and inner
 * edge is the play area, a touch 2 px above the lowest thing over the roll's foot (the legend, the stops) holds a row
 * for either thumb (no stop takes it: the tappable play area), both thumbs hold at once, and a stop pressed while the
 * other thumb holds a note lights without dropping it.
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   node tools/touch/thumb-reach.cjs [http://localhost:5310/play.html]
 */
const { chromium } = require('playwright');
const FUGUES = { wtc1f01: 'I/1', wtc1f02: 'I/2', wtc1f04: 'I/4 string consort', wtc1f08: 'I/8 piano', wtc1f10: 'I/10 voices', wtc2f02: 'II/2 harpsichord pistons', wtc2f09: 'II/9 harpsichord pistons' };
const URL = process.argv[2] || 'http://localhost:5310/play.html';
let failed = 0;
(async () => {
  for (const [W, H] of [[844, 390], [667, 375]]) for (const [id, name] of Object.entries(FUGUES)) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(URL + '?unlock=all');
    for (let i = 0; i < 10 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); }
    const x = await p.$('#install-hint-x'); if (x) await x.click().catch(() => {});
    if (id.startsWith('wtc2')) { await p.click('#tab-book-II').catch(() => {}); await p.waitForTimeout(400); }
    await p.click('#tile-' + id); await p.waitForTimeout(300); await p.click('#sel-play'); await p.waitForTimeout(3000);
    const geo = await p.evaluate(() => {
      const play = document.querySelector('.tg-play').getBoundingClientRect();
      const roll = document.querySelector('.tg-roll').getBoundingClientRect();
      const tops = {};
      for (const s of ['.tg-legend', '.tb-stops-right', '.tb-obbligato-slot']) { const e = document.querySelector(s); if (e) tops[s] = Math.round(e.getBoundingClientRect().top); }
      const leg = document.querySelector('.tg-legend');
      const minTop = Math.min(...Object.values(tops));
      const bw = play.width * 0.22;
      const yMid = play.top + play.height * 0.45, yLow = minTop - 2;
      const hits = {};
      for (const [yk, y] of [['mid', yMid], ['low', yLow]]) for (const [k, px] of Object.entries({ Lc: play.left + bw / 2, Li: play.left + bw - 3, Ri: play.right - bw + 3, Rc: play.right - bw / 2 })) { const e = document.elementFromPoint(px, y); hits[yk + k] = e && e.closest('.tg-play') ? 'play' : (e && (e.id || e.className)); }
      const btn = document.querySelector('.tb-stops-right .tg-piston:not(.on)');
      const br = btn && btn.getBoundingClientRect();
      const oneLine = leg.scrollWidth <= leg.clientWidth + 1 && [...leg.children].every((c) => Math.abs(c.getBoundingClientRect().top - leg.children[0].getBoundingClientRect().top) < 4);
      return { roll: [Math.round(roll.top), Math.round(roll.bottom)], playBottom: Math.round(play.bottom), tops, foot: Math.round(roll.bottom - minTop), oneLine, yMid, yLow, lx: play.left + bw / 2, rx: play.right - bw / 2, btn: btn ? { id: btn.id, x: br.left + br.width / 2, y: br.top + br.height / 2 } : null, hits };
    });
    const cdp = await ctx.newCDPSession(p);
    const on = () => p.evaluate(() => document.querySelectorAll('.tg-half-on').length);
    const t = (pts) => cdp.send('Input.dispatchTouchEvent', { type: pts.length ? 'touchStart' : 'touchEnd', touchPoints: pts });
    const r = {};
    await t([{ x: geo.lx, y: geo.yLow, id: 1 }]); await p.waitForTimeout(120); r.lowLeft = await on();
    await t([{ x: geo.lx, y: geo.yLow, id: 1 }, { x: geo.rx, y: geo.yLow, id: 2 }]); await p.waitForTimeout(120); r.lowBoth = await on();
    await t([]); await p.waitForTimeout(150);
    if (geo.btn) {
      await t([{ x: geo.lx, y: geo.yMid, id: 1 }]); await p.waitForTimeout(120);
      await t([{ x: geo.lx, y: geo.yMid, id: 1 }, { x: geo.btn.x, y: geo.btn.y, id: 2 }]); await p.waitForTimeout(150);
      r.stopLit = await p.evaluate((i) => document.getElementById(i).classList.contains('on'), geo.btn.id);
      r.stillHolding = await on();
      await t([]);
    }
    const ok = Object.values(geo.hits).every((v) => v === 'play') && r.lowLeft >= 1 && r.lowBoth === 2 && (!geo.btn || (r.stopLit && r.stillHolding >= 1));
    if (!ok) failed++;
    console.log(`${W}x${H} ${name}: ${ok ? 'ok' : 'FAIL'} (each thumb 2 px above the lowest cover at y ${geo.yLow}; both thumbs at once${geo.btn ? '; a stop pressed while the other thumb holds' : ''}) ${ok ? '' : JSON.stringify({ hits: geo.hits, ...r })}`);
    await b.close();
  }
  console.log(failed ? `thumb-reach: ${failed} FAILED` : 'thumb-reach: ok');
  process.exit(failed ? 1 : 0);
})();
