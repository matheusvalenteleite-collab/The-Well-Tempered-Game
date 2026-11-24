// Touch-area mode: two simulated thumbs in Chromium at both phone sizes.
// NODE_PATH=$(npm root -g) node prototypes/bow-test2/test/touch-area-sim.cjs [--shots DIR]
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "../dist/index.html");
const shotDir = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) failures++; };

async function run(W, H) {
  console.log(`\n== ${W}×${H} ==`);
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const cdp = await context.newCDPSession(page);
  const touch = (type, pts, r = 8) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y, radiusX: r, radiusY: r, force: 0.4 })) });
  const tapEl = async (sel) => { const b = await page.locator(sel).boundingBox(); const p = [0, b.x + b.width / 2, b.y + b.height / 2]; await touch("touchStart", [p]); await touch("touchEnd", [p]); await sleep(350); };

  check(await page.isVisible("#home") && await page.isVisible("#goBowed") && await page.isVisible("#goTouch"), "start screen offers both prototypes");
  await tapEl("#goTouch");
  check(await page.evaluate(() => window.__mode === "touch" && !!window.__touch.sound()), "touch-area mode open, sound started from the same tap");
  const g = await page.evaluate(() => { const r = window.__touch.rect; return { L: r.left.toJSON(), R: r.right.toJSON(), sw: document.scrollingElement.scrollWidth, sh: document.scrollingElement.scrollHeight, rows: window.__touch.rows() }; });
  const m = Math.min(g.L.left, W - g.R.right), mt = Math.min(g.L.top, H - g.L.bottom);
  check(m >= 48 && mt >= 44 && g.L.width === g.R.width && g.L.height === g.R.height, `two equal areas ${g.L.width.toFixed(0)}×${g.L.height.toFixed(0)}, ≥${m.toFixed(0)} px from the sides, ≥${mt.toFixed(0)} px from top/bottom`);
  check(g.sw <= W && g.sh <= H, "page does not scroll");
  check(JSON.stringify(g.rows) === JSON.stringify([50, 52, 54, 55, 57, 59, 61, 62, 64, 66, 67, 69, 71, 73, 74]), `rows do to do (D major, 2 octaves): D3…D5, ${g.rows.length} rows`);
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `touch-${W}x${H}.png`) });

  const n = g.rows.length, rh = (g.L.height - 20) / n;
  const yOf = (A, row) => A.top + 10 + (n - 1 - row + 0.5) * rh;
  const xL = g.L.left + g.L.width / 2, xR = g.R.left + g.R.width / 2;
  const evs = [];
  await page.evaluate(() => { const s = window.__touch.sound(); const h = s.handle.bind(s); window.__evs = []; s.handle = (e) => { window.__evs.push(e.type + ":" + (e.midi ?? "")); h(e); }; });
  // both thumbs at once: left on row 0 (D3), right on row 7 (D4)
  await touch("touchStart", [[1, xL, yOf(g.L, 0)], [2, xR, yOf(g.R, 7)]]);
  await sleep(60);
  check(await page.evaluate(() => window.__touch.sound().voices.size === 2), "two simultaneous thumbs: two notes sounding");
  // the left thumb slides up two rows and stays: one pitch event (after the 90 ms dwell), to row 2
  for (let k = 1; k <= 6; k++) { await touch("touchMove", [[1, xL, yOf(g.L, 0) - (k / 6) * 2 * rh], [2, xR, yOf(g.R, 7)]]); await sleep(10); }
  for (let k = 0; k < 8; k++) { await touch("touchMove", [[1, xL, yOf(g.L, 2) + (k % 2)], [2, xR, yOf(g.R, 7)]]); await sleep(20); }
  await touch("touchEnd", [[1, xL, yOf(g.L, 2)], [2, xR, yOf(g.R, 7)]]);
  await sleep(80);
  const got = await page.evaluate(() => window.__evs);
  check(got[0] === "onset:50" && got[1] === "onset:62" && got.includes("pitch:54") && got.filter((e) => e.startsWith("release")).length === 2, "events: " + got.join(" "));
  check(await page.evaluate(() => window.__touch.sound().voices.size === 0), "both lifted: silence");

  // diagnostics: Chromium passes the simulated contact values through
  await tapEl("#tDiag");
  await touch("touchStart", [[3, xL, yOf(g.L, 4)]], 11); await sleep(150);
  const rep = await page.evaluate(() => document.getElementById("diagText").textContent);
  check(/radiusX 11\.00/.test(rep) && /touch\.force\s+varies|touch\.force\s+CONSTANT/.test(rep) && /MOTION SENSORS/.test(rep), "diagnostics overlay shows live radiusX/force and the sensor status");
  console.log("  " + rep.split("\n").filter((l) => /touch\.radiusX|touch\.force |webkitForce|MOTION|LIVE|#3/.test(l)).join("\n  "));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `touch-${W}x${H}-diag.png`) });
  await touch("touchEnd", [[3, xL, yOf(g.L, 4)]]);
  await tapEl("#diagClose");

  // loop on/off
  await tapEl("#tLoop");
  check(await page.evaluate(() => !!window.__touch.sound().loop), "loop starts");
  await tapEl("#tLoop");
  check(await page.evaluate(() => !window.__touch.sound().loop), "loop stops");

  // CSV
  await tapEl("#tCsv");
  await touch("touchStart", [[4, xR, yOf(g.R, 3)]]); await touch("touchMove", [[4, xR, yOf(g.R, 3) - 4]]); await touch("touchEnd", [[4, xR, yOf(g.R, 3) - 4]]);
  await sleep(50);
  await tapEl("#tCsv");
  const csv = await page.evaluate(() => document.getElementById("csvText").value);
  const lines = csv.trim().split("\n");
  check(!(await page.locator("#csvBox").isHidden()) && lines[0].startsWith("t_ms,mode,event") && lines.length >= 5 && /touchstart/.test(csv) && /pointerdown/.test(csv), `CSV box: ${lines.length - 1} rows, e.g. ${lines[1]}`);
  await tapEl("#csvClose");

  // FEATURE 1: calibrate (Chromium reports pointer width = 2 × the simulated radius)
  await tapEl("#tSettings"); await tapEl("#calGo");
  check(await page.isVisible("#calPanel") && /LEFT/.test(await page.textContent("#calWhat")), "calibration starts: LEFT area, fingertip");
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `touch-${W}x${H}-calib.png`) });
  const R = { tip: 12, normal: 36, flat: 72 };
  let id = 100;
  for (const [A, x] of [[g.L, xL], [g.R, xR]]) for (const c of ["tip", "normal", "flat"]) for (let k = 0; k < 10; k++) {
    const r = A === g.L && c === "normal" && k === 0 ? 12 : R[c]; // one normal tap on the left as small as a fingertip
    const y = yOf(A, 2 + (k % 5)); id++;
    await touch("touchStart", [[id, x, y]], r); await sleep(20); await touch("touchEnd", [[id, x, y]], r); await sleep(20);
  }
  await sleep(200);
  const cal = await page.evaluate(() => document.getElementById("calRes").textContent);
  check(!(await page.locator("#tSet").isHidden()) && /LEFT AREA[\s\S]*misclassified 1 of 30/.test(cal) && /RIGHT AREA[\s\S]*misclassified 0 of 30/.test(cal), "calibration done: left 1 of 30 misclassified (the planted one), right 0 of 30; saved and shown");
  console.log("  " + cal.split("\n").slice(0, 14).join("\n  "));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `touch-${W}x${H}-settings.png`) });
  check(await page.evaluate(() => JSON.parse(localStorage.getItem("touchcal")).samples.right.flat.length === 10), "calibration stored on the device");
  await tapEl("#setClose");

  // the class sets the timbre
  const clsOf = async (r) => { id++; await touch("touchStart", [[id, xL, yOf(g.L, 5)]], r); await sleep(60); const c = await page.evaluate(() => [...window.__touch.sound().voices.values()].map((v) => v.cls)); await touch("touchEnd", [[id, xL, yOf(g.L, 5)]], r); await sleep(60); return c.join(","); };
  const got3 = [await clsOf(12), await clsOf(36), await clsOf(72)];
  check(got3.join(" ") === "tip normal flat", "fingertip / normal / flat touches play bell / standard / muted: " + got3.join(" "));
  // a held normal note pressed flatter gets louder and brighter (smoothed)
  id++; await touch("touchStart", [[id, xR, yOf(g.R, 5)]], 36); await sleep(40);
  for (let k = 0; k < 5; k++) { await touch("touchMove", [[id, xR, yOf(g.R, 5) + (k % 2)]], 60); await sleep(40); }
  await sleep(300);
  const ex = await page.evaluate(() => { const v = [...window.__touch.sound().voices.values()][0]; return { gain: v.expr.gain.value, cents: v.lp.detune.value }; });
  check(ex.gain > 1.05 && ex.gain < 1.6 && ex.cents > 100, `held note pressed flatter: loudness ×${ex.gain.toFixed(2)} (+${(20 * Math.log10(ex.gain)).toFixed(1)} dB), brightness +${ex.cents.toFixed(0)} cents`);
  await touch("touchEnd", [[id, xR, yOf(g.R, 5)]], 60);

  // FEATURE 2: tilt (simulated gravity; no motion sensor in a desktop browser). Lean 45° = normal.
  await page.evaluate(() => { const c = document.getElementById("s_tiltOn"); c.checked = true; c.dispatchEvent(new Event("change")); });
  const grav = (L) => { const l = L * Math.PI / 180; return { x: Math.sin(l) * 9.8, y: 0, z: -Math.cos(l) * 9.8 }; };
  const lean = async (L) => { for (let k = 0; k < 25; k++) { await page.evaluate((g2) => window.__touch.onMotion({ accelerationIncludingGravity: g2 }), grav(L)); await sleep(8); } await sleep(120); };
  const freqOf = () => page.evaluate(() => { const v = [...window.__touch.sound().voices.values()][0]; return v ? v.oscs[0][0].frequency.value : null; });
  await lean(45);
  id++; await touch("touchStart", [[id, xL, yOf(g.L, 7)]], 36); await sleep(80); // D4, held
  const f0 = await freqOf();
  await lean(10); const fUp = await freqOf();
  await lean(45); const fBack = await freqOf();
  await lean(80); const fDown = await freqOf();
  const st = await page.evaluate(() => ({ voices: window.__touch.sound().voices.size, oct: window.__touch.tilt.octave }));
  check(Math.abs(fUp / f0 - 2) < 0.02 && Math.abs(fBack / f0 - 1) < 0.02 && Math.abs(fDown / f0 - 0.5) < 0.02 && st.voices === 1,
    `held D4 (${f0.toFixed(0)} Hz) slurs with the lean: 10° → ${fUp.toFixed(0)} Hz (octave up), 45° → ${fBack.toFixed(0)}, 80° → ${fDown.toFixed(0)} (octave down), one voice throughout`);
  await touch("touchEnd", [[id, xL, yOf(g.L, 7)]], 36);
  await sleep(60);
  id++; await touch("touchStart", [[id, xL, yOf(g.L, 7)]], 36); await sleep(80);
  const fNew = await freqOf();
  check(Math.abs(fNew / f0 - 0.5) < 0.02, `a new note while leaning upright starts an octave down (${fNew.toFixed(0)} Hz)`);
  await touch("touchEnd", [[id, xL, yOf(g.L, 7)]], 36);
  await lean(45);
  if (shotDir) { await tapEl("#tSettings"); await page.screenshot({ path: path.join(shotDir, `touch-${W}x${H}-tilt-settings.png`) }); await tapEl("#setClose"); }
  await page.evaluate(() => { const c = document.getElementById("s_tiltOn"); c.checked = false; c.dispatchEvent(new Event("change")); });

  // back to the start screen, then into the bowed prototype and back
  await tapEl("#tMenu");
  check(await page.evaluate(() => window.__mode === "home" && !document.getElementById("home").hidden), "◂ Menu returns to the start screen");
  await tapEl("#goBowed");
  check(await page.evaluate(() => window.__mode === "bowed" && window.__bow.layout().strip.width > 50), "bowed prototype opens from the start screen with its layout");
  check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
}

(async () => { await run(932, 430); await run(667, 375); console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED"); process.exit(failures ? 1 : 0); })()
  .catch((e) => { console.error(e); process.exit(1); });
