// D1061-D1065, THE GUITAR'S GESTURES MEASURED (guitar.ts PICK's trims, LEFT_HAND, STOMP's trims, BLOOM): PSYCH's clean guitar
// (voice 2 of 5, k2Clean) and fuzz guitar (voice 3, k2Fuzz), through the real engine offline on a phone (a mobile context), notes
// E3-E5 held `dur` s, each render's loudness through the phone model (two 600 Hz high-passes, ebur128) and full band, against the
// same notes as today (`base`: the landing in the middle, no Play.guitar). Each job: {name, voice, play (Play fields), cmds:
// [[at s after the onset, Sounding.guitar cmd]], every: [s, cmd] (sent every s from the onset)}.
// Needs Playwright and a dev server with no hot reload on PORT. usage: PORT=<port> node tools/touch/gesture/calib-guitar.cjs <out dir>
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs'); const { execFileSync, spawnSync } = require('child_process');
const [out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const G = {};
const J = (name, voice, play, extra = {}) => ({ name, voice, play, dur: 1.2, ...extra });
const jobs = [];
for (const [v, g] of [[2, 'clean'], [3, 'fuzz']]) {
  jobs.push(J(`${g}-today-mid`, v, { touch: 0.5 }), J(`${g}-today-soft`, v, { touch: 0.05 }), J(`${g}-today-strong`, v, { touch: 0.95 }));
  jobs.push(J(`${g}-base`, v, { touch: 0.5, guitar: {} }), J(`${g}-neck`, v, { touch: 0, guitar: {} }), J(`${g}-bridge`, v, { touch: 1, guitar: {} }));
  jobs.push(J(`${g}-hard`, v, { touch: 0.5, guitar: {} }, { cmds: [[0.02, { kind: 'hard' }]] }));
  jobs.push(J(`${g}-hammer`, v, { touch: 0.5, legato: true, guitar: { lh: 'hammer', skip: 0.08 } }), J(`${g}-pull`, v, { touch: 0.5, legato: true, guitar: { lh: 'pull', skip: 0.08 } }));
  jobs.push(J(`${g}-vibe`, v, { touch: 0.5, guitar: { stomp: 'vibe' } }), J(`${g}-fuzz`, v, { touch: 0.5, guitar: { stomp: 'fuzz' } }));
  jobs.push(J(`${g}-held`, v, { touch: 0.5, guitar: { amp: true } }, { dur: 2.5 }), J(`${g}-bloom`, v, { touch: 0.5, guitar: { amp: true } }, { dur: 2.5, every: [0.1, { kind: 'lean', v: 1 }] }));
  jobs.push(J(`${g}-bloom-half`, v, { touch: 0.5, guitar: { amp: true } }, { dur: 2.5, every: [0.1, { kind: 'lean', v: 0.5 }] }));
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto(`http://localhost:${process.env.PORT}/bench.html`); await p.waitForTimeout(1500);
  for (const job of jobs) {
    const r = await p.evaluate(async (job) => {
      const SR = 24000;
      const { fugueById } = await import('/src/touch/fugue.ts');
      const chipM = await import('/src/touch/chip.ts'); const snd = await import('/src/touch/sound.ts');
      const f = fugueById('wtc1f01'); snd.setPreset('krautrock'); snd.setBacking(false);
      const midis = [52, 57, 62, 67, 72]; const gap = job.dur + 0.4; const dur = midis.length * gap + 0.6;
      const Real = window.AudioContext; let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const ch = new chipM.Chip(); window.AudioContext = Real; ch.lag = 0;
      await ch.prepare(midis, midis, chipM.openingOf(f));
      const sds = midis.map((m, k) => { const at = 0.2 + k * gap; return { at, sd: ch.note(m, at, job.dur, chipM.voicing(job.voice, 5, true), { lead: true, ...job.play }) }; });
      const sched = [];
      for (const { at, sd } of sds) {
        for (const [dt, c] of job.cmds || []) sched.push([at + dt, () => sd.guitar?.(c)]);
        if (job.every) for (let x = 0; x < job.dur; x += job.every[0]) sched.push([at + x, () => sd.guitar?.(job.every[1])]);
      }
      sched.sort((a, b) => a[0] - b[0]);
      const q = 128 / SR; const fns = new Map();
      for (const [t, fn] of sched) { const tt = Math.ceil(t / q) * q; const k = tt.toFixed(6); if (!fns.has(k)) fns.set(k, { tt, list: [] }); fns.get(k).list.push(fn); }
      for (const { tt, list } of fns.values()) ac.suspend(tt).then(() => { for (const g of list) g(); ac.resume(); });
      const buf = await ac.startRendering(); const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const pcm = new Int16Array(L.length); let peak = 0; for (let i = 0; i < L.length; i++) { const x = (L[i] + R[i]) / 2; peak = Math.max(peak, Math.abs(x)); pcm[i] = Math.max(-1, Math.min(1, x)) * 32767; }
      let s = ''; const u8 = new Uint8Array(pcm.buffer); for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode(...u8.subarray(j, j + 0x8000));
      return { b64: btoa(s), peak, failed: ch.failed };
    }, job);
    const raw = `${out}/${job.name}.raw`; fs.writeFileSync(raw, Buffer.from(r.b64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw, `${out}/${job.name}.wav`]); fs.unlinkSync(raw);
    const lu = (af) => { const o = spawnSync('ffmpeg', ['-nostats', '-i', `${out}/${job.name}.wav`, '-af', af, '-f', 'null', '-'], { encoding: 'utf8' }).stderr; const m = o.match(/I:\s+(-?[\d.]+) LUFS/g) || []; return parseFloat((m.pop() || 'I: -99').split(/\s+/)[1]); };
    G[job.name] = { phone: lu('highpass=f=600,highpass=f=600,ebur128'), full: lu('ebur128'), peak: r.peak, failed: r.failed };
    console.log(job.name.padEnd(18), 'phone', G[job.name].phone.toFixed(2), 'full', G[job.name].full.toFixed(2), 'peak', r.peak.toFixed(3), r.failed ? `FAILED ${r.failed}` : '');
  }
  fs.writeFileSync(`${out}/levels.json`, JSON.stringify(G, null, 1));
  await b.close();
})();
