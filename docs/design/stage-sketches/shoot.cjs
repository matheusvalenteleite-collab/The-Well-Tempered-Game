const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const D = __dirname;
  const init = fs.readFileSync(D + '/data.js', 'utf8') + fs.readFileSync(D + '/stage.js', 'utf8');
  const [id, waits, mode='on'] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(init);
  await p.goto(`http://localhost:4175/play.html?auto=1&stage=${mode}`);
  for (let i=0;i<10 && (await p.$('#intro'));i++){ await p.mouse.click(422,195); await p.waitForTimeout(1200); }
  const x = await p.$('#install-hint-x'); if (x) await x.click().catch(()=>{});
  await p.click('#tile-' + id); await p.waitForTimeout(300);
  await p.click('#sel-play');
  if (mode === 'on') await p.addStyleTag({ content: '.tg-half-on { background: transparent !important; }' });
  let t = 0;
  for (const w of waits.split(',').map(Number)) { await p.waitForTimeout(w - t); t = w; await p.screenshot({ path: `${D}/shots/${id}-${mode}-${w/1000}s.png` }); }
  await b.close();
})();
