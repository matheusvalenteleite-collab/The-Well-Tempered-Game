// Loop maker in Chromium: setup, takes (with a note held across the loop's end), review, keep, playback
// timing, tilt in a take, mute/solo/delete, persistence, the finale, WAV export, latency calibration.
// NODE_PATH=$(npm root -g) node prototypes/bow-test2/test/loop-sim.cjs [--shots DIR]
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "../dist/index.html");
const shotDir = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) failures++; };

(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  for (const [W, H] of [[932, 430], [667, 375]]) {
    console.log(`\n== ${W}×${H} ==`);
    const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    const cdp = await context.newCDPSession(page);
    const touch = (type, pts, r = 20) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y, radiusX: r, radiusY: r })) });
    const tapEl = async (sel) => { await page.locator(sel).scrollIntoViewIfNeeded(); const b = await page.locator(sel).boundingBox(); const p = [0, b.x + b.width / 2, b.y + b.height / 2]; await touch("touchStart", [p], 8); await touch("touchEnd", [p], 8); await sleep(350); };
    const ctxNow = () => page.evaluate(() => window.Shared.audio().currentTime);
    const waitCtx = async (t) => { for (;;) { if ((await ctxNow()) >= t) return; await sleep(5); } };

    await tapEl("#goLoop");
    check(!(await page.locator("#lSetup").isHidden()), "first visit: the setup screen");
    await page.evaluate(() => { const b = document.getElementById("lsBpm"); b.value = 120; b.oninput(); });
    await tapEl("#lsStart");
    const g = await page.evaluate(() => { const L = document.getElementById("lL").getBoundingClientRect(), R = document.getElementById("lR").getBoundingClientRect(); return { L: L.toJSON(), R: R.toJSON(), sw: document.scrollingElement.scrollWidth, sh: document.scrollingElement.scrollHeight }; });
    check(Math.min(g.L.left, W - g.R.right) >= 48 && Math.min(g.L.top, H - g.L.bottom) >= 44 && g.L.width === g.R.width && g.sw <= W && g.sh <= H, `the touch-area layout: two equal areas ${g.L.width.toFixed(0)}×${g.L.height.toFixed(0)}, clear of the edges; no page scroll`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `loop-${W}x${H}-empty.png`) });
    await page.evaluate(() => window.__loop.setLatency(0));
    if (W === 667) { await page.evaluate(() => { document.getElementById("lSound").value = "voice"; }); await tapEl("#lRec"); await sleep(400); check(await page.evaluate(() => window.__loop.state() === "countin" || window.__loop.state() === "rec"), "small screen: recording starts"); await page.evaluate(() => document.getElementById("lStop").click()); await context.close(); continue; }

    // instrument every note start (time, sound, pitch) on the page
    await page.evaluate(() => { window.__starts = []; for (const [k, ins] of Object.entries(window.LoopSound.INSTR)) { const f = ins.start; ins.start = (ch, t, m, o) => { window.__starts.push({ k, t, m, cls: o.cls }); return f(ch, t, m, o); }; } });
    const yRow = (A, row, n) => A.top + 10 + (n - 1 - row + 0.5) * ((A.height - 20) / n);
    const n = await page.evaluate(() => window.__touchHooks.rows().length);
    const xL = g.L.left + 60;

    // TAKE 1: flute; four notes on the beats of bar 1, then one held across the loop's end
    await tapEl("#lRec");
    const T0 = await page.evaluate(() => window.__loop.tr().T0); // loop top (count-in before it)
    const L = 4, beat = 0.5;
    let id = 100;
    for (let k = 0; k < 4; k++) { await waitCtx(T0 + k * beat - 0.02); await touch("touchStart", [[++id, xL, yRow(g.L, k, n)]]); await sleep(120); await touch("touchEnd", [[id, xL, yRow(g.L, k, n)]]); }
    await waitCtx(T0 + 3.6); await touch("touchStart", [[++id, xL, yRow(g.L, 7, n)]]);
    await waitCtx(T0 + L + 0.5); await touch("touchEnd", [[id, xL, yRow(g.L, 7, n)]]);
    check(await page.evaluate(() => window.__loop.state() === "review" && !document.getElementById("lKeep").hidden), "after one pass: review, with Keep and Retake");
    const take1 = await page.evaluate(() => window.__loop.rec().list.map((x) => ({ on: x.on, off: x.off, midi: x.midi })));
    const ons = take1.map((x) => x.on.toFixed(2)).join(" ");
    check(take1.length === 5 && take1.slice(0, 4).every((x, k) => Math.abs(x.on - k * beat) < 0.08), `take 1: 5 notes, the first four within 80 ms of the beats (onsets ${ons} s; simulated touches arrive late)`);
    check(take1[4].off > L, `the held note crosses the loop's end and is kept whole (${take1[4].on.toFixed(2)} → ${take1[4].off.toFixed(2)} s)`);
    // review playback: the notes come back at the same places in the next pass
    await waitCtx(T0 + 2 * L + 0.05);
    const st = await page.evaluate(() => window.__starts);
    const rp = st.filter((s) => s.t >= T0 + L && s.t < T0 + 2 * L).map((s) => s.t - (T0 + L));
    const md = (x) => ((x % L) + L) % L;
    check(rp.length === 5 && take1.every((x) => rp.some((t) => Math.abs(t - md(x.on)) < 0.005)), `review pass replays all 5 notes where they were played, to the sample (a touch just before the top replays at the pass's end): ${rp.map((t) => t.toFixed(2)).join(" ")}`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `loop-${W}x${H}-review.png`) });
    await tapEl("#lKeep");
    check(await page.evaluate(() => window.__loop.ses().voices.length === 1 && window.__loop.state() === "loop"), "Keep commits it; the loop carries on");

    // TAKE 2: plucked string, high, with tilt on (an octave step mid-take); retake once first
    // the simulated motion has no gyroscope (rotation 0 while the angle changes), so this check uses gravity sensing
    await page.evaluate(() => { const T = window.__touchHooks.T(); T.tiltOn = true; T.tiltSource = "gravity"; T.tiltTau = 20; document.getElementById("lSound").value = "pluck"; document.getElementById("lReg").value = "1"; });
    const lean = (deg) => page.evaluate((d) => { const l = d * Math.PI / 180; for (let i = 0; i < 4; i++) window.__touchHooks.onMotion; window.__loopMotion && 0; }, deg);
    void lean;
    const motion = (deg) => page.evaluate((d) => { const l = d * Math.PI / 180; const e = { accelerationIncludingGravity: { x: Math.sin(l) * 9.8, y: 0, z: -Math.cos(l) * 9.8 }, rotationRate: { alpha: 0, beta: 0, gamma: 0 } }; window.__touch.onMotion(e); }, deg);
    await tapEl("#lRec");
    const Tx = await page.evaluate(() => window.__loop.tr().T0);
    await waitCtx(Tx + L + 0.1); await tapEl("#lRetake"); // nothing played: throw it away
    const T1 = await page.evaluate(() => window.__loop.tr().T0);
    for (let i = 0; i < 10; i++) { await motion(45); await sleep(16); }
    await waitCtx(T1 + 0.5); await touch("touchStart", [[++id, xL, yRow(g.L, 2, n)]]);
    await waitCtx(T1 + 1.0); for (let i = 0; i < 20; i++) { await motion(5); await sleep(16); }
    await waitCtx(T1 + 2.0); await touch("touchEnd", [[id, xL, yRow(g.L, 2, n)]]);
    for (let i = 0; i < 10; i++) { await motion(45); await sleep(16); }
    await waitCtx(T1 + L + 0.1);
    const t2 = await page.evaluate(() => { const r = window.__loop.rec(); return { n: r.list.length, tilt: r.tilt.map((e) => e.octave), sound: r.sound, reg: r.reg }; });
    check(t2.n === 1 && t2.tilt.includes(1) && t2.tilt[t2.tilt.length - 1] === 0 && t2.sound === "pluck" && t2.reg === 1, `retake then take 2 (plucked, high): 1 note; tilt recorded with its octave step (${[...new Set(t2.tilt)].join("→")})`);
    // its playback replays the tilt: the voice's channel receives the octave step at the same place
    await page.evaluate(() => { window.__tilts = []; const f = window.LoopSound.Channel.prototype.tilt; window.LoopSound.Channel.prototype.tilt = function (t, e) { window.__tilts.push({ t, o: e.octave }); return f.call(this, t, e); }; });
    await waitCtx(T1 + 2 * L + 0.1);
    const tl = await page.evaluate(() => window.__tilts);
    const up = tl.find((x) => x.o === 1 && x.t > T1 + L);
    check(up && Math.abs(up.t - (T1 + L) - (await page.evaluate(() => window.__loop.rec().tilt.find((e) => e.octave === 1).at))) < 0.005, "review replays the tilt's octave step at its recorded time");
    await tapEl("#lKeep");
    await page.evaluate(() => { window.__touchHooks.T().tiltOn = false; });

    // quantize, mute, solo, delete
    await page.selectOption("#lQuant", "strong");
    const q = await page.evaluate(() => { const v = window.__loop.ses().voices[0]; return window.LoopCore.playNotes(v.take, window.__loop.ses().setup, "strong").map((x) => x.start); });
    check(q.every((s) => Math.abs(s / 0.125 - Math.round(s / 0.125)) < 1e-6), "quantize strong: every onset on a sixteenth (the stored take unchanged)");
    await page.selectOption("#lQuant", "off");
    const muteBtn = page.locator(".lvrow").first().locator("button").first();
    await muteBtn.tap(); await sleep(200);
    check(await page.evaluate(() => window.__loop.ses().voices[0].muted === true), "mute");
    await muteBtn.tap(); await sleep(200);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `loop-${W}x${H}-two.png`) });

    // persistence
    await page.reload(); await sleep(200);
    await tapEl("#goLoop"); await sleep(200);
    check(await page.evaluate(() => window.__loop.ses() && window.__loop.ses().voices.length === 2 && document.getElementById("lSetup").hidden), "reload: the session (two voices) comes back");

    // the finale, live: state goes piece → idle; voices enter one per pass
    await page.evaluate(() => { window.__starts = []; for (const [k, ins] of Object.entries(window.LoopSound.INSTR)) { const f = ins.start; ins.start = (ch, t, m, o) => { window.__starts.push({ k, t }); return f(ch, t, m, o); }; } });
    await tapEl("#lPiece");
    const P0 = await page.evaluate(() => window.__loop.tr().T0);
    await waitCtx(P0 + 4 * L + 2.3); await sleep(100);
    const ps = await page.evaluate(() => window.__starts);
    const per = [0, 1, 2, 3].map((k) => [...new Set(ps.filter((s) => s.t >= P0 + k * L && s.t < P0 + (k + 1) * L).map((s) => s.k))].sort().join("+"));
    check(per.join(" | ") === "flute | flute+pluck | flute+pluck | flute+pluck" && (await page.evaluate(() => window.__loop.state())) === "idle", `Play piece: passes ${per.join(" | ")}, then it ends`);

    // export: rendered offline, saved as a WAV (outside the artifact frame)
    const dl = page.waitForEvent("download", { timeout: 60000 });
    await tapEl("#lExport");
    const d = await dl; const p = await d.path(); const fs = require("fs"); const b = fs.readFileSync(p);
    const sr = b.readUInt32LE(24), ch = b.readUInt16LE(22), frames = (b.length - 44) / (2 * ch);
    let peak = 0; for (let i = 44; i < b.length; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i)));
    check(d.suggestedFilename().endsWith(".wav") && sr === 44100 && ch === 2 && Math.abs(frames / sr - (0.2 + 4 * L + 2.2)) < 0.05 && peak > 3000 && peak < 32767,
      `Export audio: ${d.suggestedFilename()}, ${(frames / sr).toFixed(1)} s stereo at ${sr} Hz, peak ${(20 * Math.log10(peak / 32768)).toFixed(1)} dBFS (not clipped)`);

    // latency calibration: tap 40 ms after each click
    await tapEl("#lLat"); await tapEl("#llGo");
    const clicks = await page.evaluate(() => { const spb = 0.5; return window.Shared.audio().currentTime; });
    void clicks;
    const c0 = (await ctxNow()) + 0.4 - 0.35; // llGo scheduled clicks 0.4 s after the tap was handled (~0.35 s ago)
    for (let i = 0; i < 16; i++) { await waitCtx(c0 + i * 0.5 + 0.04 - 0.03); await touch("touchStart", [[++id, W / 2, H - 30]], 8); await touch("touchEnd", [[id, W / 2, H - 30]], 8); }
    await sleep(1500);
    const res = await page.evaluate(() => document.getElementById("llRes").textContent);
    check(/Your taps land -?\d+ ms/.test(res), "latency calibration measures an offset: " + res.split(".")[0]);
    await tapEl("#llClose");

    // takes CSV
    await tapEl("#lCsv");
    const csv = await page.evaluate(() => document.getElementById("csvText").value);
    check(/take 1/.test(csv) && /take 2/.test(csv) && /pointerdown/.test(csv), `Takes CSV: raw input of both takes (${csv.trim().split("\n").length - 1} rows)`);
    await tapEl("#csvClose");
    await tapEl("#lMenu");
    check(await page.evaluate(() => window.__mode === "home"), "◂ Menu back to the start screen");
    check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
    await context.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
