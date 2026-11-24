// Renders the real voice + engine offline in Chromium and measures the result.
// node prototypes/bow-test2/test/offline-audio.cjs
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const core = fs.readFileSync(path.join(__dirname, "../bowcore.js"), "utf8");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ content: core });
  const res = await page.evaluate(async () => {
    const C = window.BowCore, SR = 48000;
    // digitizer model: 60 Hz, 1/3 px resolution, event only when the value changes; engine ticks at 60 Hz
    async function render(name, params, yOf, durMs, extra) {
      const oc = new OfflineAudioContext(1, Math.ceil((SR * (durMs + 400)) / 1000), SR);
      const voice = C.buildVoice(oc);
      const eng = new C.BowEngine(voice, params, (t) => t / 1000, () => {});
      eng.pitchDown(1, 0, 0.5); eng.pitchUp(1, 5); // latch D4
      eng.bowDown(9, 100, 50, yOf(100));
      let lastQ = null;
      for (let t = 100; t <= durMs; t += 1000 / 120) {
        const q = Math.round(yOf(t) * 3) / 3;
        if (q !== lastQ) { lastQ = q; eng.bowMove(9, t, 50, q, null); }
        if (extra) extra(eng, t);
        eng.tick(t);
      }
      eng.bowUp(9, durMs);
      const buf = await oc.startRendering();
      return { name, x: buf.getChannelData(0) };
    }
    function analyse(r, fromMs, toMs) {
      const x = r.x, a = Math.floor((fromMs / 1000) * SR), b = Math.floor((toMs / 1000) * SR);
      let s = 0, sd = 0, maxD = 0, peak = 0;
      for (let i = a; i < b; i++) { s += x[i] * x[i]; const d = x[i] - x[i - 1]; sd += d * d; maxD = Math.max(maxD, Math.abs(d)); peak = Math.max(peak, Math.abs(x[i])); }
      const n = b - a, rms = Math.sqrt(s / n), rmsD = Math.sqrt(sd / n);
      // 20 ms frames: biggest level jump between neighbouring frames
      const F = SR * 0.02, fr = [];
      for (let i = a; i + F < b; i += F) { let e = 0; for (let j = i; j < i + F; j++) e += x[j] * x[j]; fr.push(10 * Math.log10(e / F + 1e-20)); }
      let jump = 0; for (let i = 1; i < fr.length; i++) jump = Math.max(jump, Math.abs(fr[i] - fr[i - 1]));
      // whole render: a click shows as one sample step far above the signal's normal steps
      let maxAll = 0, sAll = 0; for (let i = 1; i < x.length; i++) { const d = Math.abs(x[i] - x[i - 1]); maxAll = Math.max(maxAll, d); sAll += d * d; }
      // click finder: 4 ms blocks (longer than one period); a click is a block whose largest
      // sample step is 3x the median of its neighbours within 40 ms
      const B = Math.floor(SR * 0.004), bm = [];
      for (let i = Math.max(1, a); i + B < b; i += B) { let m = 0; for (let j = i; j < i + B; j++) m = Math.max(m, Math.abs(x[j] - x[j - 1])); bm.push(m); }
      let clicks = 0, worst = 0;
      for (let i = 0; i < bm.length; i++) {
        const nb = []; for (let k = i - 10; k <= i + 10; k++) if (k !== i && Math.abs(k - i) > 1 && k >= 0 && k < bm.length) nb.push(bm[k]);
        nb.sort((p, q) => p - q); const med = nb[Math.floor(nb.length / 2)] || 1e-9;
        const ratio = bm[i] / Math.max(med, 1e-6); worst = Math.max(worst, ratio); if (ratio > 3) clicks++;
      }
      return { name: r.name, clicks, worstStepRatio: +worst.toFixed(2), rmsDb: +(20 * Math.log10(rms)).toFixed(1), peakDb: +(20 * Math.log10(peak)).toFixed(1), stepCrest: +(maxD / rmsD).toFixed(1), maxFrameJumpDb: +jump.toFixed(2), wholeRenderMaxStep: +maxAll.toExponential(2) };
    }
    const out = [];
    const slow = await render("3 px/s steady", {}, (t) => 100 + (3 * t) / 1000, 3000);
    out.push(analyse(slow, 1000, 2900));
    const slow2 = await render("2 px/s steady", {}, (t) => 100 + (2 * t) / 1000, 3000);
    out.push(analyse(slow2, 1000, 2900));
    const fast = await render("800 px/s steady", {}, (t) => 100 + (800 * t) / 1000, 400);
    out.push(analyse(fast, 200, 390));
    // back-and-forth at 300 px/s, 150 px strokes: 4 reversals
    const tri = (t) => { const p = ((t - 100) * 0.3) % 300; return 100 + (p < 150 ? p : 300 - p); };
    const rev0 = await render("reversals, gap 0", { gapMs: 0 }, tri, 2200);
    out.push(analyse(rev0, 300, 2150));
    const rev40 = await render("reversals, gap 40 ms", { gapMs: 40 }, tri, 2200);
    out.push(analyse(rev40, 300, 2150));
    // slur: pitch changes mid-stroke at 50 px/s
    const slur = await render("slurs at 50 px/s", { glideMs: 15 }, (t) => 100 + (50 * t) / 1000, 2000,
      (eng, t) => { if (Math.abs(t - 800) < 4) { eng.pitchDown(2, t, 4.5); eng.pitchUp(2, t + 50); } if (Math.abs(t - 1400) < 4) { eng.pitchDown(3, t, 2.5); eng.pitchUp(3, t + 50); } });
    out.push(analyse(slur, 300, 1950));
    return out;
  });
  await browser.close();
  console.table(res);
  const s3 = res[0];
  const ok = s3.rmsDb > -70 && s3.maxFrameJumpDb < 1.5 && res.every((r) => r.clicks === 0);
  console.log(ok ? "PASS: 3 px/s gives a steady non-silent tone; no isolated sample spikes (clicks) in any render" : "FAIL");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
