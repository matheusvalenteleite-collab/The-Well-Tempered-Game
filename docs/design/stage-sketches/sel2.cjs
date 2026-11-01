const { chromium } = require('playwright');
const fs = require('fs');
const init = fs.readFileSync(__dirname + '/data.js', 'utf8') + fs.readFileSync(__dirname + '/stage.js', 'utf8');
const OBJ = {
  wtc1f20: { now: 40, play: `background: linear-gradient(180deg,#e8c070,#b8863a 55%,#8a5e22) !important; color:#3a1210 !important; border:3px solid #5a3a14 !important; box-shadow: inset 0 0 0 2px #f6dc9a, 3px 3px 0 #000 !important; background-image: radial-gradient(circle at 8px 8px,#5a3a14 2px,transparent 3px), radial-gradient(circle at calc(100% - 8px) 8px,#5a3a14 2px,transparent 3px), radial-gradient(circle at 8px calc(100% - 8px),#5a3a14 2px,transparent 3px), radial-gradient(circle at calc(100% - 8px) calc(100% - 8px),#5a3a14 2px,transparent 3px), linear-gradient(180deg,#e8c070,#b8863a 55%,#8a5e22) !important; letter-spacing:.12em;`,
    hear: `background:#2a1416 !important; border:2px solid #b8863a !important; box-shadow: 2px 2px 0 #000 !important;`, word: '▶ ALL ABOARD' },
  wtc1f13: { now: 9, play: `background: linear-gradient(180deg, rgba(200,250,250,.25) 0 18%, rgba(90,200,210,.55) 18% 100%) !important; color:#eafcff !important; text-shadow: 0 2px 0 #0b3a44; border:3px solid #c8f0f0 !important; box-shadow: inset 0 3px 0 rgba(255,255,255,.5), 3px 3px 0 #06222a !important; backdrop-filter: blur(1px);`,
    hear: `background: rgba(20,70,80,.6) !important; border:2px solid #9fe0e0 !important; box-shadow:none !important;`, word: '▶ PLAY' },
  wtc1f08: { now: 70, play: `background: repeating-linear-gradient(178deg,#8a5a32 0 3px,#7a4e2a 3px 5px,#9a6a3a 5px 9px) !important; color:#2a160a !important; text-shadow: 0 1px 0 #c89a62; border:3px solid #4a2c14 !important; box-shadow: 3px 3px 0 #1a0e06 !important;`,
    hear: `background:#2a1e14 !important; border:2px solid #e6b45a !important; box-shadow: 2px 2px 0 #000 !important;`, word: '▶ SET OUT' },
  wtc1f01: { now: 25, play: `background: linear-gradient(180deg,#8a8a96,#5e5e6a) !important; color:#f2c95a !important; text-shadow: 0 1px 0 #2a2a30, 0 0 6px rgba(242,201,90,.5); border:3px solid #3a3a44 !important; border-radius: 40px 40px 2px 2px !important; box-shadow: inset 0 0 0 2px #a8a8b4, 3px 3px 0 #000 !important;`,
    hear: `background:#1e1e28 !important; border:2px solid #d9a441 !important; box-shadow: 2px 2px 0 #000 !important;`, word: '▶ PLAY' },
};
(async () => {
  const b = await chromium.launch();
  for (const [id, o] of Object.entries(OBJ)) {
    const ctx = await b.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
    const p = await ctx.newPage(); await p.addInitScript(init);
    await p.goto('http://localhost:4173/play.html');
    for (let i=0;i<10 && (await p.$('#intro'));i++){ await p.mouse.click(422,195); await p.waitForTimeout(1200); }
    const x = await p.$('#install-hint-x'); if (x) await x.click().catch(()=>{});
    await p.click('#tile-' + id); await p.waitForTimeout(300);
    await p.addStyleTag({ content: `.sel-right{position:relative;background:#000 !important} .sel-right > *{position:relative;z-index:1} #studio-bg{position:absolute;inset:0;width:100%;height:100%;z-index:0;image-rendering:pixelated;opacity:.85} #sel-play{${o.play}} .sel-hear{${o.hear}} .sel-knob{background:rgba(0,0,0,.55) !important} .sel-piece-name,.sel-piece-meta,.sel-best-row,.sel-ask{text-shadow:0 1px 0 #000,0 0 4px #000}` });
    await p.evaluate(([id, now, word]) => {
      const col = document.querySelector('.sel-right'); const r = col.getBoundingClientRect();
      const c = document.createElement('canvas'); c.id = 'studio-bg'; c.width = Math.round(r.width / 2); c.height = Math.round(r.height / 2); col.prepend(c);
      const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0,0,c.width,c.height);
      globalThis.__studioBox(g, c.width, c.height, { piece: id, now, barTicks: 1, tps: 1.6, bars: 1.2 });
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0,0,c.width,c.height);
      document.querySelector('#sel-play').textContent = word;
    }, [id, o.now, o.word]);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${__dirname}/shots/sel2-${id}.png` });
    await ctx.close();
  }
  await b.close();
})();
