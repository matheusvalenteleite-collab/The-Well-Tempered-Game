// Piano layout, gyro tilt through the page, and the practice drills, in Chromium at 932×430.
// NODE_PATH=$(npm root -g) node prototypes/bow-test2/test/practice-sim.cjs [--shots DIR]
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "../dist/index.html");
const shotDir = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) failures++; };
const R = { tip: 12, normal: 36, flat: 72 }; // Chromium: pointer width = 2 × radius → 24 / 72 / 144 px

(async () => {
  for (const [W, H] of [[932, 430], [667, 375]]) {
    console.log(`\n== ${W}×${H} ==`);
    const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
    const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    // a stored calibration: ten taps of each kind per area
    await context.addInitScript(() => {
      const seqs = (w) => Array.from({ length: 10 }, () => [[0, w]]);
      const side = () => ({ tip: seqs(24), normal: seqs(72), flat: seqs(144) });
      if (!localStorage.getItem("touchcal")) localStorage.setItem("touchcal", JSON.stringify({ samples: { left: side(), right: side() }, savedAt: "2026-11-24T20:00:00Z" }));
    });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    const cdp = await context.newCDPSession(page);
    const touch = (type, pts, r = 36) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y, radiusX: r, radiusY: r })) });
    const tapEl = async (sel) => { const b = await page.locator(sel).boundingBox(); const p = [0, b.x + b.width / 2, b.y + b.height / 2]; await touch("touchStart", [p], 8); await touch("touchEnd", [p], 8); await sleep(350); };
    let id = 10;
    const tapAt = async (pts, r) => { const ps = pts.map(([x, y]) => [++id, x, y]); await touch("touchStart", ps, r); await sleep(40); await touch("touchEnd", ps, r); await sleep(40); };

    await tapEl("#goTouch");
    // PIANO
    await page.selectOption("#tLayout", "piano"); await sleep(100);
    const kb = await page.evaluate(() => {
      const r = window.__touch.rect, rows = window.__touch.rows(), out = [];
      for (const side of ["left", "right"]) {
        const el = document.getElementById(side === "left" ? "tL" : "tR");
        for (const k of el.querySelectorAll("[data-row]")) { const b = k.getBoundingClientRect(); out.push({ side, row: +k.dataset.row, white: k.tagName === "rect", cx: k.tagName === "rect" ? (side === "left" ? b.left + 12 : b.right - 12) : (side === "left" ? b.right - 8 : b.left + 8), cy: b.top + b.height / 2 }); }
      }
      return { rows, keys: out };
    });
    check(kb.rows.length === 25 && kb.rows[0] === 48 && kb.rows[24] === 72 && kb.keys.filter((k) => k.side === "left" && k.white).length === 15, `piano rows (2 octaves, do to do): C3–C5, ${kb.rows.length} semitones on 15 white keys`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `piano-${W}x${H}.png`) });
    // tap every key on the left at a point inside it (whites at the outer edge, blacks near the inner edge)
    const heard = [];
    await page.evaluate(() => { window.__heard = []; window.__touchHooks.listen((e) => { if (e.type === "onset") window.__heard.push(e.row); }); });
    const left = kb.keys.filter((k) => k.side === "left").sort((a, b) => a.row - b.row);
    for (const k of left) await tapAt([[k.cx, k.cy]], 36);
    const got = await page.evaluate(() => window.__heard);
    check(JSON.stringify(got) === JSON.stringify(left.map((k) => k.row)), `every key on the left plays its own note (${left.filter((k) => !k.white).length} black, ${left.filter((k) => k.white).length} white)`);
    await page.selectOption("#tLayout", "key"); await sleep(100);

    // TILT through the page with the gyroscope (minus sign, deg/s)
    await page.evaluate(() => { const c = document.getElementById("s_tiltOn"); c.checked = true; c.dispatchEvent(new Event("change")); });
    const motion = (L, w) => page.evaluate(([L, w]) => { const l = L * Math.PI / 180; window.__touch.onMotion({ accelerationIncludingGravity: { x: Math.sin(l) * 9.8, y: 0, z: -Math.cos(l) * 9.8 }, rotationRate: { alpha: 0, beta: 0, gamma: -w } }); }, [L, w]);
    for (let k = 0; k < 120; k++) { const L = 45 + 10 * Math.sin(k / 9); const L2 = 45 + 10 * Math.sin((k + 1) / 9); await motion(L, (L2 - L) * 60); await sleep(16); }
    const lab = await page.evaluate(() => window.__touch.tilt.gyroLabel());
    check(lab === "gyro (sign −, deg/s)", "the page found the gyroscope's convention: " + lab);
    await page.evaluate(() => { const c = document.getElementById("s_tiltOn"); c.checked = false; c.dispatchEvent(new Event("change")); });

    // PRACTICE 1: mixed, answered correctly every time
    await tapEl("#tPractice"); await tapEl("#prMixed");
    const rect = await page.evaluate(() => ({ L: window.__touch.rect.left.toJSON(), R: window.__touch.rect.right.toJSON() }));
    const mid = (s) => [rect[s === "left" ? "L" : "R"].left + 60, rect[s === "left" ? "L" : "R"].top + 120];
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `practice-${W}x${H}.png`) });
    for (let i = 0; i < 30; i++) {
      const p = await page.evaluate(() => document.getElementById("prPrompt").textContent);
      const side = p.startsWith("LEFT") ? "left" : "right", kind = /FINGERTIP/.test(p) ? "tip" : /FLAT/.test(p) ? "flat" : "normal";
      await tapAt([mid(side)], R[kind]);
    }
    await sleep(100);
    const sum1 = await page.evaluate(() => document.getElementById("prOvText").value);
    check(/kinds right: 30 of 30/.test(sum1), "mixed drill: 30 of 30 when every press is right; saved");
    await tapEl("#prOvClose");

    // PRACTICE 3: two thumbs, one deliberate mistake (the first pair's right thumb pressed flat)
    await tapEl("#prTwo");
    for (let i = 0; i < 18; i++) {
      const p = await page.evaluate(() => document.getElementById("prPrompt").textContent);
      const [l, r] = p.split("\n").map((s) => (/FINGERTIP/.test(s) ? "tip" : /FLAT/.test(s) ? "flat" : "normal"));
      const rr = i === 0 ? (r === "flat" ? "tip" : "flat") : r;
      const a = [++id, ...mid("left")], b = [++id, ...mid("right")];
      await touch("touchStart", [a], R[l]); await touch("touchStart", [a, b], R[rr]); await sleep(40);
      await touch("touchEnd", [a, b], R[l]); await sleep(40);
    }
    await sleep(100);
    const sum3 = await page.evaluate(() => document.getElementById("prOvText").value);
    check(/both thumbs right: 17 of 18/.test(sum3), "two-thumb drill: 17 of 18 pairs (the planted mistake caught)");
    await tapEl("#prOvClose");

    // PRACTICE 2: rhythm, tapping on the loop's beats (the simulator's touches arrive late by tens of ms)
    await tapEl("#prRhythm");
    const clock = await page.evaluate(() => ({ t0: window.__touchHooks.sound().loop.t0, spb: 60 / window.__touchHooks.T().bpm }));
    for (let b = 0; b < 32; b++) {
      const beatT = clock.t0 + (4 + b) * clock.spb;
      for (;;) { const now = await page.evaluate(() => window.__touchHooks.ctx().currentTime); if (now >= beatT - 0.035) break; await sleep(5); }
      const p = await page.evaluate(() => document.getElementById("prPrompt").textContent);
      const side = p.startsWith("LEFT") ? "left" : "right", kind = { T: "tip", N: "normal", F: "flat" }[(p.match(/\[(.)\]/) || [])[1]] || "normal";
      await tapAt([mid(side)], R[kind]);
    }
    await sleep(Math.max(600, clock.spb * 1000 + 400));
    const sum2 = await page.evaluate(() => document.getElementById("prOvText").value);
    const m = sum2.match(/kinds right: (\d+) of 32/), mm = sum2.match(/beats missed (\d+)/);
    check(m && +m[1] >= 30 && mm && +mm[1] <= 2, "rhythm drill: " + (sum2.split("\n").slice(1, 3).join(" | ")));
    await tapEl("#prOvClose");

    await tapEl("#prProgress");
    const prog = await page.evaluate(() => document.getElementById("prOvText").value);
    check(/mixed/.test(prog) && /rhythm/.test(prog) && /two/.test(prog), "progress lists all three sessions");
    console.log("  " + prog.split("\n").slice(1, 6).join("\n  "));
    check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
    await browser.close();
  }
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
