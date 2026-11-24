// Two-thumb touch simulation in Chromium (CDP Input.dispatchTouchEvent) at both phone sizes.
// node prototypes/bow-test2/test/touch-sim.cjs [--shots DIR]
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "../dist/index.html");
const shotDir = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };

async function run(W, H) {
  console.log(`\n== ${W}×${H} landscape ==`);
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const cdp = await context.newCDPSession(page);
  const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y, radiusX: 8, radiusY: 8, force: 0.5 })) });

  // the start screen: choose the bowed prototype, then start sound with a tap
  const gb = await page.locator("#goBowed").boundingBox();
  await touch("touchStart", [[0, gb.x + gb.width / 2, gb.y + gb.height / 2]]); await touch("touchEnd", [[0, gb.x + gb.width / 2, gb.y + gb.height / 2]]);
  await sleep(100);
  const sb = await page.locator("#bStart").boundingBox();
  await touch("touchStart", [[0, sb.x + sb.width / 2, sb.y + sb.height / 2]]); await touch("touchEnd", [[0, sb.x + sb.width / 2, sb.y + sb.height / 2]]);
  await sleep(300);
  check(await page.evaluate(() => !!window.__bow.ctx()), "AudioContext started on the first tap");

  for (const swapped of [false, true]) {
    if (swapped) { await page.evaluate(() => document.getElementById("bSwap").click()); await sleep(50); }
    const g = await page.evaluate(() => { const L = window.__bow.layout(); return { s: L.strip.toJSON(), r: L.rows.toJSON(), sw: document.scrollingElement.scrollWidth, sh: document.scrollingElement.scrollHeight }; });
    const side = swapped ? "bow right" : "bow left";
    const minSide = Math.min(g.s.left, W - g.s.right, g.r.left, W - g.r.right), minTop = Math.min(g.s.top, H - g.s.bottom, g.r.top, H - g.r.bottom);
    check(minSide >= 48 && minTop >= 44, `${side}: strip and rows clear of edges (sides ≥ ${minSide.toFixed(0)} px, top/bottom ≥ ${minTop.toFixed(0)} px); strip ${g.s.width.toFixed(0)}×${g.s.height.toFixed(0)}, rows ${g.r.width.toFixed(0)}×${(g.r.height / 7).toFixed(0)} each`);
    check(g.sw <= W && g.sh <= H, `${side}: page does not scroll (content ${g.sw}×${g.sh})`);
    // every row is hit at its centre
    const hits = await page.evaluate(() => { const L = window.__bow.layout(), rows = [...document.querySelectorAll(".row")]; return rows.map((r, i) => { const b = r.getBoundingClientRect(); return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === r; }); });
    check(hits.every(Boolean), `${side}: all 7 rows hit-test at their centres`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `bow2-${W}x${H}-${swapped ? "R" : "L"}.png`) });

    // two thumbs: bow slides at ~120 px/s; pitch thumb taps each row in turn
    const bx = g.s.left + g.s.width / 2, y0 = g.s.top + 40, rowH = g.r.height / 7, rx = g.r.left + g.r.width / 2;
    const before = await page.evaluate(() => ({ pd: window.__bow.M.pitch.pointerdown, ts: window.__bow.M.pitch.touchstart, during: window.__bow.M.pitch.pdDuringBow }));
    let y = y0, dir = 1; const sounded = [], gains = [];
    await touch("touchStart", [[1, bx, y]]);
    for (let k = 0; k < 7 * 12; k++) {
      y += dir * 2; if (y > g.s.bottom - 40 || y < y0) dir = -dir;
      const tapRow = Math.floor(k / 12), phase = k % 12;
      const py = g.r.bottom - (tapRow + 0.5) * rowH;
      if (phase === 4) await touch("touchStart", [[1, bx, y], [2, rx, py]]);
      else if (phase === 7) await touch("touchEnd", [[2, rx, py]]);
      else await touch("touchMove", phase > 4 && phase < 7 ? [[1, bx, y], [2, rx, py]] : [[1, bx, y]]);
      if (phase === 6) { const st = await page.evaluate(() => { const e = window.__bow.engine(); return { row: e.row, gain: e.gain, speed: e.speed }; }); sounded.push(st.row); gains.push(st); }
      await sleep(16);
    }
    const after = await page.evaluate(() => ({ pd: window.__bow.M.pitch.pointerdown, ts: window.__bow.M.pitch.touchstart, during: window.__bow.M.pitch.pdDuringBow, cancels: window.__bow.M.cancels.length, gainNow: window.__bow.engine().gain, latched: window.__bow.engine().gateOpen }));
    check(after.pd - before.pd === 7 && after.ts - before.ts === 7, `${side}: 7 pitch taps while bowing → pointerdown ${after.pd - before.pd}, touchstart ${after.ts - before.ts}; counted as during bow ${after.during - before.during}`);
    check(JSON.stringify(sounded) === "[0,1,2,3,4,5,6]", `${side}: each tap set its note: ${sounded.join(",")}`);
    check(gains.every((s) => s.gain > 0.01), `${side}: tone sounding during every tap (speed ${gains.map((s) => s.speed.toFixed(0)).join("/")} px/s)`);
    check(after.latched && after.gainNow > 0.01, `${side}: LATCH+SLIDE: tone continues after the pitch thumb lifts (gain ${after.gainNow.toFixed(3)})`);
    check(after.cancels === 0, `${side}: no touch cancels`);
    await touch("touchEnd", [[1, bx, y]]);
    await sleep(120);
    check(await page.evaluate(() => window.__bow.engine().gain === 0), `${side}: bow lifted → silence`);

    // slide: land on row 1, flick to row 5 in ~30 ms, rest there; then hover on an edge
    await touch("touchStart", [[1, bx, y0]]);
    for (let k = 0; k < 10; k++) { await touch("touchMove", [[1, bx, y0 + 3 * k]]); await sleep(16); }
    const rows = await page.evaluate(() => { const e = window.__bow.engine(); window.__rowsSeen = []; const orig = e.setRow.bind(e); e.setRow = (r, t, how) => { window.__rowsSeen.push(r); orig(r, t, how); }; return true; });
    void rows;
    const yRow = (r) => g.r.bottom - (r + 0.5) * rowH;
    // Headless Chromium delivers simulated touches only ~every 50 ms (see the event rate in the log),
    // so a real 30 ms dwell cannot be exercised here; scale it to 150 ms for this check
    // (the 30 ms case is covered by the unit test on the row selector).
    await page.evaluate(() => window.__bow.engine().set("dwellMs", 150));
    let by = y0 + 30;
    await touch("touchStart", [[1, bx, by], [2, rx, yRow(1)]]);
    for (let k = 1; k <= 4; k++) { by += 3; await touch("touchMove", [[1, bx, by], [2, rx, yRow(1) - k * rowH]]); await sleep(7); }
    for (let k = 0; k < 6; k++) { by += 3; await touch("touchMove", [[1, bx, by], [2, rx, yRow(5) + (k % 2)]]); await sleep(16); }
    const edge = g.r.bottom - 5 * rowH; // boundary between row 4 and row 5
    for (let k = 0; k < 10; k++) { by += 3; await touch("touchMove", [[1, bx, by], [2, rx, edge + (k % 2 ? 3 : -3)]]); await sleep(16); }
    await touch("touchEnd", [[2, rx, edge]]);
    for (let k = 0; k < 4; k++) { by += 3; await touch("touchMove", [[1, bx, by]]); await sleep(16); }
    const seen = await page.evaluate(() => window.__rowsSeen);
    check(JSON.stringify(seen.filter((r, i) => i === 0 || r !== seen[i - 1])) === "[1,5]", `${side}: quick slide 1→5 sounds only rows ${[...new Set(seen)].join(",")} (hovering ±3 px on the 4/5 edge did not flip)`);
    await touch("touchEnd", [[1, bx, by]]);
    await page.evaluate(() => window.__bow.engine().set("dwellMs", window.__bow.P().dwellMs));
    await sleep(50);
  }

  // hide the panel: the layout stays inside the margins
  await page.evaluate(() => document.getElementById("bHide").click()); await sleep(50);
  check(await page.evaluate(() => document.getElementById("panel").hidden && !document.getElementById("mini").hidden), "panel hides, small readout remains");
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `bow2-${W}x${H}-hidden.png`) });
  await page.evaluate(() => document.getElementById("bShow").click());
  // log
  const rep = await page.evaluate(() => window.__bow.report());
  check(/coalesced events supported/.test(rep) && /pitch taps:/.test(rep) && /baseLatency/.test(rep), "log report has event rates, pitch-tap counts and latency lines");
  console.log("  --- log excerpt ---\n  " + rep.split("\n").slice(4, 14).join("\n  "));
  check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
}

(async () => {
  await run(932, 430);
  await run(667, 375);
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
