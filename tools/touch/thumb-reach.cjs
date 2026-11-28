/**
 * D472 addendum (design studio): THE THUMBS' REACH, live. On the built game (play.html), at 932 x 430, 844 x 390 and 667 x 375, for a
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
  if (!process.env.REPEAT_ONLY) for (const [W, H] of [[932, 430], [844, 390], [667, 375]]) for (const [id, name] of Object.entries(FUGUES)) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(URL + '?unlock=all');
    for (let i = 0; i < 30 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); } await p.waitForTimeout(500); for (let i = 0; i < 10 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); }
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
  // D1081, REPEAT (developer-only; the flag on): the button in the pistons' innermost slot, both bars, on the test fugue (I/2, its made-up
  // section, bars 2-5). Waits for it (it shows from bar 4), then: it sits inside the bar's foot strip, is what a touch on it hits, and a thumb
  // holding a note does not drop when the other presses it (it lights); pressed again it goes out (cancel); pressed once more it is lit again.
  for (const [W, H] of [[932, 430], [667, 375]]) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('tb-unlock-all', '1'); localStorage.setItem('tg-repeat-dev-v1', 'on'); } catch (e) {} });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(URL + '?unlock=all');
    for (let i = 0; i < 30 && (await p.$('#intro')); i++) { await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1200); } await p.waitForTimeout(500);
    const x = await p.$('#install-hint-x'); if (x) await x.click().catch(() => {});
    await p.click('#tile-wtc1f02'); await p.waitForTimeout(300); await p.click('#sel-play');
    let shown = false;
    for (let i = 0; i < 400 && !shown; i++) { await p.waitForTimeout(250); shown = !!(await p.$('#repeat-left')); }
    const cdp = await ctx.newCDPSession(p);
    const t = (pts) => cdp.send('Input.dispatchTouchEvent', { type: pts.length ? 'touchStart' : 'touchEnd', touchPoints: pts });
    const on = () => p.evaluate(() => document.querySelectorAll('.tg-half-on').length);
    const lit = (id) => p.evaluate((i) => { const e = document.getElementById(i); return !!e && e.classList.contains('on'); }, id);
    const g = shown ? await p.evaluate(() => {
      const play = document.querySelector('.tg-play').getBoundingClientRect();
      const out = { play: [play.left, play.top, play.right, play.bottom] };
      for (const side of ['left', 'right']) {
        const r = document.getElementById('repeat-' + side).getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        out[side] = { x: cx, y: cy, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), inner: side === 'left' ? Math.round(r.right) : Math.round(r.left), hit: !!hit && hit.closest('#repeat-' + side) !== null };
      }
      return out;
    }) : null;
    let r = {};
    if (g) {
      await t([{ x: g.left.x - 80, y: g.play[1] + (g.play[3] - g.play[1]) * 0.45, id: 1 }]); await p.waitForTimeout(150);
      await t([{ x: g.left.x - 80, y: g.play[1] + (g.play[3] - g.play[1]) * 0.45, id: 1 }, { x: g.right.x, y: g.right.y, id: 2 }]); await p.waitForTimeout(150);
      r.lit = await lit('repeat-right'); r.holding = await on();
      await t([{ x: g.left.x - 80, y: g.play[1] + (g.play[3] - g.play[1]) * 0.45, id: 1 }]); await p.waitForTimeout(150);
      await t([{ x: g.left.x - 80, y: g.play[1] + (g.play[3] - g.play[1]) * 0.45, id: 1 }, { x: g.left.x, y: g.left.y, id: 3 }]); await p.waitForTimeout(150);
      r.cancelled = !(await lit('repeat-left')); await t([]); await p.waitForTimeout(150);
      await t([{ x: g.left.x, y: g.left.y, id: 4 }]); await p.waitForTimeout(150); await t([]); await p.waitForTimeout(100);
      r.litAgain = await lit('repeat-left');
      if (W === 932) await p.screenshot({ path: process.env.REPEAT_SHOT || 'repeat-key-932x430.png' });
    }
    const ok = !!g && g.left.w >= 40 && g.left.h === 28 && g.right.h === 28 && g.left.hit && g.right.hit && g.left.bottom <= H && g.right.bottom <= H && g.left.bottom > g.play[3] - 40 && r.lit && r.holding >= 1 && r.cancelled && r.litAgain;
    if (!ok) failed++;
    console.log(`${W}x${H} REPEAT key (flag on): ${ok ? 'ok' : 'FAIL'}${g ? ` (key ${g.left.w} x ${g.left.h} px at the foot of each bar, inner edge ${g.left.inner}/${g.right.inner}; a touch on it hits it; pressed while the other thumb holds: lit ${r.lit}, thumb still holding ${r.holding}; pressed again: cancelled ${r.cancelled}; pressed once more: lit ${r.litAgain})` : ' (the key never appeared)'}`);
    await b.close();
  }
  console.log(failed ? `thumb-reach: ${failed} FAILED` : 'thumb-reach: ok');
  process.exit(failed ? 1 : 0);
})();
