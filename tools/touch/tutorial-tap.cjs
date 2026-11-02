/**
 * Regression drive for the tutorial stuck at Herr Bach's first message (WTC 2.31; test/tutorial-tap.test.ts).
 * On the production build, as an iPhone 13 in landscape with real touch taps: the intro, the TUTORIAL card,
 * 1.1's first bubble, then the first lesson with his cards (1.2) from fresh progress (1.1 passed), tapping his
 * card through its messages until its first choice (▶ WATCH) and pressing it. Exits 1 where a tap does not advance.
 *
 *   npx vite build && npx vite preview --port 5310 &
 *   node tools/touch/tutorial-tap.cjs [http://localhost:5310/play.html]
 * Playwright is resolved from the project or from /opt/node-tools/node_modules.
 */
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/node-tools/node_modules/playwright"); }
const { chromium, devices } = pw;
const URL = process.argv[2] || "http://localhost:5310/play.html";
const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const card = (p, sel) => p.evaluate((sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const r = e.getBoundingClientRect(); const x = r.x + r.width * 0.6, y = r.y + r.height * 0.45;
  const h = document.elementFromPoint(x, y);
  return { x, y, mine: !!h && e.contains(h), hit: h ? `${h.tagName}.${h.className}` : "", text: e.textContent, choice: !!e.querySelector("#bach-choice-0") };
}, sel);

async function start(b, progress) {
  const c = await b.newContext({ ...devices["iPhone 13 landscape"], hasTouch: true });
  const p = await c.newPage();
  p.on("pageerror", (e) => fail(`page error: ${e.message}`));
  if (progress) await p.addInitScript((s) => localStorage.getItem("tb-tutorial-v2") || localStorage.setItem("tb-tutorial-v2", s), JSON.stringify(progress));
  await p.goto(URL); await p.waitForTimeout(2500);
  for (let k = 0; k < 6 && (await p.$("#intro")); k++) { await p.touchscreen.tap(422, 195); await p.waitForTimeout(1200); }
  await p.locator("#card-tutorial").tap(); await p.waitForTimeout(2000);
  return p;
}

(async () => {
  const b = await chromium.launch();
  // 1.1 (THE PLAY SCREEN): BEGIN goes straight in; its first bubble passes on a tap.
  {
    const p = await start(b, null);
    const s = await card(p, "#tour-bubble");
    if (!s) fail("1.1: no bubble"); else {
      if (!s.mine) fail(`1.1: a tap on his bubble lands on ${s.hit}`);
      await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(800);
      const t = await card(p, "#tour-bubble");
      if (!t || !/2 \/ \d/.test(t.text)) fail("1.1: his first bubble did not pass on a tap"); else console.log("1.1: first bubble passed by tap");
    }
  }
  // 1.2 (THE LEFT THUMB ALONE), fresh: CONTINUE, then his card's messages by tap to ▶ WATCH.
  {
    const p = await start(b, { v: 3, carried4: true, lessons: { "1.1": { seen: true, passed: { tries: 1, best: 1, ms: 1 } } }, parts: {} });
    await p.locator("#tutorial-continue").tap(); await p.waitForTimeout(2500);
    let s = await card(p, ".tb-bach"), n = 0;
    while (s && !s.choice && n < 12) {
      if (!s.mine) { fail(`1.2: a tap on his card lands on ${s.hit}`); break; }
      const was = s.text;
      await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(900);
      s = await card(p, ".tb-bach");
      if (s && s.text === was) { await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(900); s = await card(p, ".tb-bach"); }
      if (s && s.text === was) { fail(`1.2: stuck at "${was.slice(0, 60)}"`); break; }
      n++;
    }
    if (s?.choice) {
      console.log(`1.2: ${n} message(s) passed by tap, then ▶ WATCH`);
      await p.locator("#bach-choice-0").tap(); await p.waitForTimeout(2000);
      if (await p.$(".tb-bach")) fail("1.2: ▶ WATCH did not start the step"); else console.log("1.2: WATCH started");
    } else if (!process.exitCode) fail("1.2: never reached his first choice");
  }
  await b.close();
  console.log(process.exitCode ? "tutorial-tap: FAILED" : "tutorial-tap: ok");
})();
