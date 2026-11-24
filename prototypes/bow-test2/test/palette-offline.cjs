// Renders one note of each Loop-maker instrument offline and measures level, attack and brightness.
// NODE_PATH=$(npm root -g) node prototypes/bow-test2/test/palette-offline.cjs
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); await p.setContent("<html></html>");
  await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, "../loopsound.js"), "utf8") });
  const res = await p.evaluate(async () => {
    const out = [];
    for (const k of Object.keys(LoopSound.INSTR)) {
      const sr = 44100, oc = new OfflineAudioContext(1, sr * 1.6, sr), ch = new LoopSound.Channel(oc, oc.destination, 0);
      const n = LoopSound.INSTR[k].start(ch, 0.05, 62, { cls: null, tau: 0.08 }); n.stop(1.05);
      const x = (await oc.startRendering()).getChannelData(0);
      let peak = 0, s = 0, zc = 0, d = 0; const a = Math.floor(0.3 * sr), e = Math.floor(0.9 * sr);
      for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
      for (let i = a; i < e; i++) { s += x[i] * x[i]; d += (x[i] - x[i - 1]) ** 2; }
      const rms = Math.sqrt(s / (e - a)), bright = Math.sqrt(d / (e - a)) / (rms || 1);
      let t90 = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= 0.9 * peak) { t90 = i / sr - 0.05; break; }
      const tail = Math.max(...Array.from(x.slice(Math.floor(1.5 * sr))).map(Math.abs));
      out.push({ instrument: k, peakDb: +(20 * Math.log10(peak)).toFixed(1), sustainRmsDb: +(20 * Math.log10(rms || 1e-9)).toFixed(1), attackMs: Math.round(t90 * 1000), brightness: +bright.toFixed(3), silentAfterStop: tail < 1e-3 });
    }
    return out;
  });
  console.table(res); await b.close();
  const ok = res.every((r) => r.peakDb > -30 && r.peakDb < -1 && r.silentAfterStop) && new Set(res.map((r) => r.brightness.toFixed(2))).size === res.length;
  console.log(ok ? "PASS: every instrument sounds, none clips, all stop cleanly, all differ in brightness" : "FAIL"); process.exit(ok ? 0 : 1);
})();
