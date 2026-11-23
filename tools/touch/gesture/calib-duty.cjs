// D1015, THE DUTY TRIMS' CALIBRATION (touch-expr.ts DUTY_TRIM_DB): GAME BOY's three pulse patches (four voices: gbLead, gbHarm,
// gbThin) each at the three widths (Play.pw: the engine's equal RMS, pulseRms), C4-C6, 0.6 s notes, through the real engine offline
// on a phone (a mobile context), each render's loudness through the phone model (two 600 Hz high-passes, ebur128). Rerun when the
// chip's tone changes (e.g. a top rolled off) and set DUTY_TRIM_DB to each width's LU against the 25% pulse, negated.
// Needs Playwright and a dev server with no hot reload on PORT. usage: PORT=<port> node tools/touch/gesture/calib-duty.cjs <out dir>
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs'); const { execFileSync } = require('child_process');
const [out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${process.env.PORT}/bench.html`); await p.waitForTimeout(1500);
  for (const [voice, pw] of [[0,0.125],[0,0.25],[0,0.5],[1,0.125],[1,0.25],[1,0.5],[2,0.125],[2,0.25],[2,0.5]]) {
    const r = await p.evaluate(async ([voice, pw]) => {
      const SR = 24000;
      const { fugueById } = await import('/src/touch/fugue.ts');
      const chipM = await import('/src/touch/chip.ts'); const snd = await import('/src/touch/sound.ts');
      const f = fugueById('wtc1f01'); snd.setPreset('gameboy'); snd.setBacking(false);
      const midis = [60, 64, 67, 72, 76, 79, 84]; const dur = midis.length * 0.8 + 0.5;
      const Real = window.AudioContext; let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const ch = new chipM.Chip(); window.AudioContext = Real; ch.lag = 0;
      await ch.prepare(midis, midis, chipM.openingOf(f));
      midis.forEach((m, k) => ch.note(m, 0.2 + k * 0.8, 0.6, chipM.voicing(voice, 4, true), { lead: true, pw }));
      const buf = await ac.startRendering(); const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const pcm = new Int16Array(L.length); for (let i = 0; i < L.length; i++) pcm[i] = Math.max(-1, Math.min(1, (L[i] + R[i]) / 2)) * 32767;
      let s = ''; const u8 = new Uint8Array(pcm.buffer); for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode(...u8.subarray(j, j + 0x8000));
      return btoa(s);
    }, [voice, pw]);
    const raw = `${out}/v${voice}-${pw}.raw`; fs.writeFileSync(raw, Buffer.from(r, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw, `${out}/v${voice}-${pw}.wav`]); fs.unlinkSync(raw);
    const o = require('child_process').spawnSync('ffmpeg', ['-nostats', '-i', `${out}/v${voice}-${pw}.wav`, '-af', 'highpass=f=600,highpass=f=600,ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    console.log(voice, pw, (o.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop());
  }
  await b.close();
})();
