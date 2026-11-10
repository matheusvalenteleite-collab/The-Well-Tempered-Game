// D628, THE PILOT WORLDS' EFFECTS MEASURED: D601's renders (tools/touch/drum-peak/render.cjs: a whole fugue offline through
// the real engine, an OfflineAudioContext stepped every 512 samples at 24 kHz, the phone model and the K-weighted full range
// measured as made) for the effects (world-sfx.ts): mode "band" (WORLD SOUNDS off), "fx" (WORLD SOUNDS on, every note
// silenced), "bass" (the lowest voice alone); no drummer in any (DRUMS off, a band's own silenced: the band's side
// conservative); `desktop` a desktop context (no touch: the computer's mix), else a phone's; `trial` the Sound Lab's
// override with the dropped effects (D626); `pcm` the output kept (<name>.s16, mono 24 kHz) for the spectral check.
// Every effect scheduled is logged (Chip.sfxEvents: kind, tick, time, until, velocity as played, the end's).
//
// usage: PORT=<vite, no hot reload> node tools/touch/world-sfx/render.cjs <out dir> <jobs.json>
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const PORT = process.env.PORT || '5300';
const [outDir, jobsFile] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const job of jobs) {
    const out = `${outDir}/${job.name}.json`;
    if (fs.existsSync(out)) continue;
    const ctx = await b.newContext(job.desktop ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.error('pageerror', job.name, e.message));
    await p.goto(`http://localhost:${PORT}/bench.html`);
    await p.waitForTimeout(1500);
    const t0 = Date.now();
    const r = await p.evaluate(async (job) => {
      const SR = 24000, N = 512, dt = N / SR;
      const { fugueById } = await import('/src/touch/fugue.ts');
      const chipM = await import('/src/touch/chip.ts');
      const { setPreset, setBacking } = await import('/src/touch/sound.ts');
      const { setDrumStyle } = await import('/src/touch/drum-library.ts');
      const { ProtoGame } = await import('/src/bench/proto-game.ts');
      const { protoById, easyOf } = await import('/src/bench/protos.ts');
      const { playReading } = await import('/src/touch/readings.ts');
      const { tempoOf } = await import('/src/touch/tempi.ts');
      const { loadColours } = await import('/src/touch/colour.ts');
      await loadColours().catch(() => {});
      const f = fugueById(job.piece);
      setPreset(job.sound);
      setBacking(false);
      const sfxM = await import('/src/touch/world-sfx.ts');
      sfxM.setSfxOn(job.mode === 'fx' || job.mode === 'mix');
      if (job.trial) sfxM.setSfxLab({ on: true, trial: true });
      if (job.style) setDrumStyle(f.id, job.style);
      if (job.setup) await new Function('W', job.setup)(window);
      const bpm = tempoOf(f.id);
      const reading = playReading(f.id);
      const dur = Math.min(600, f.length / ((f.tpq * bpm) / 60) + 14);
      // The output's taps: every node the chip connects to the destination also feeds the measuring chain.
      const Real = window.AudioContext;
      let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const origConnect = AudioNode.prototype.connect;
      let sum = null;
      AudioNode.prototype.connect = function (dest, ...rest) {
        const res = origConnect.call(this, dest, ...rest);
        if (dest instanceof AudioDestinationNode && ac && this.context === ac) {
          if (!sum) {
            sum = ac.createGain();
            sum.channelCount = 1; sum.channelCountMode = 'explicit'; sum.channelInterpretation = 'speakers';
          }
          origConnect.call(this, sum);
        }
        return res;
      };
      const ch = new chipM.Chip();
      window.AudioContext = Real;
      ch.lag = 0;
      const bq = (type, fr, q, gain = 0) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = fr; x.Q.value = q; x.gain.value = gain; return x; };
      const chain = (pre) => { const a = ac.createAnalyser(); a.fftSize = N; let n = sum; for (const x of pre) { origConnect.call(n, x); n = x; } origConnect.call(n, a); return a; };
      const all = f.voices.flat().map((n) => n[2]);
      await ch.prepare(all, f.voices[0].map((n) => n[2]), chipM.openingOf(f));
      if (!sum) { sum = ac.createGain(); sum.channelCount = 1; sum.channelCountMode = 'explicit'; sum.channelInterpretation = 'speakers'; }
      const A = {
        P: chain([bq('highpass', 600, 0.7071), bq('highpass', 600, 0.7071), bq('highshelf', 1500, 0.7, 4), bq('highpass', 38, 0.5)]),
        K: chain([bq('highshelf', 1500, 0.7, 4), bq('highpass', 38, 0.5)]),
        H: chain([bq('highpass', 2000, 0.7071), bq('highpass', 2000, 0.7071)]),
        R: chain([]),
      };
      const kit = [];
      { const o2 = ch.scheduleKitHit.bind(ch); ch.scheduleKitHit = (e, snd) => { const before = ch.kitEvents.at(-1); o2(e, snd); const x = ch.kitEvents.at(-1); if (x && x !== before) kit.push([+x.tick.toFixed(1), +x.when.toFixed(4), x.piece, +x.vel.toFixed(3), x.role ?? null]); }; }
      // the band alone: no drummer at all (a band's own, with DRUMS off, silenced too: D607)
      ch.scheduleKitHit = () => {};
      if (job.mode === 'fx') { const o = ch.note.bind(ch); ch.note = (m, at, d, v, pl = {}) => o(m, at, d, v, { ...pl, level: 1e-6 }); }
      if (job.mode === 'bass') { const o = ch.note.bind(ch); const low = f.voices.length - 1; ch.note = (m, at, d, v, pl = {}) => o(m, at, d, v, v && v.bass ? pl : { ...pl, level: 1e-6 }); }
      const proto = protoById('ladder');
      const g = new ProtoGame(f, [0], 0, proto, { bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false }, ch);
      g.wall = () => 0;
      const W = 844, H = 390, y0 = 330, rowH = 9;
      g.rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
      const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
      let ni = 0, id2 = 0, held = null, done = false;
      const buf = new Float32Array(N);
      const ms = (a) => { a.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < N; i++) s += buf[i] * buf[i]; return s / N; };
      const fr = { P: [], K: [], H: [], R: [], tick: [] };
      const end = g.timeAt(f.length) + 3;
      const step = () => {
        const now = ac.currentTime;
        while (ni < notes.length && g.timeAt(notes[ni].on) <= now + 1e-4) {
          const n = notes[ni++];
          id2++;
          const side = id2 % 2 ? 'left' : 'right';
          g.down(id2, { side, x: side === 'left' ? 0.11 * W : 0.89 * W, y: g.rows.yOf(n.step), w: W, h: H }, 0);
          if (held) g.up(typeof held === 'object' ? held.id : held, 0);
          held = id2;
          const nx = notes[ni];
          if (!nx || nx.on > n.on + n.dur) held = { id: id2, end: g.timeAt(n.on + n.dur) - 0.02 };
        }
        if (held && typeof held === 'object' && now >= held.end) { g.up(held.id, 0); held = null; }
        if (!done) done = g.step();
        fr.tick.push(Math.round(g.now));
        for (const k of ['P', 'K', 'H', 'R']) fr[k].push(+ms(A[k]).toExponential(4));
      };
      let k = 1;
      const tick = () => {
        step();
        k++;
        if (k * dt < Math.min(dur, end) - dt) ac.suspend(k * dt).then(tick);
        ac.resume();
      };
      ac.suspend(dt).then(tick);
      const rendered = await ac.startRendering();
      if (job.pcm) { const d = rendered.getChannelData(0), e2 = rendered.getChannelData(1); const i16 = new Int16Array(d.length); for (let i = 0; i < d.length; i++) i16[i] = Math.max(-1, Math.min(1, 0.5 * (d[i] + e2[i]))) * 32767; let s = ''; const u8 = new Uint8Array(i16.buffer); for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode(...u8.subarray(j, j + 0x8000)); window.__pcm64 = btoa(s); }
      AudioNode.prototype.connect = origConnect;
      return { name: job.name, sfx: ch.sfxEvents.map((e) => [e.kind, +e.tick.toFixed(1), +e.when.toFixed(4), +e.until.toFixed(4), +e.vel.toFixed(4), +e.vel1.toFixed(4)]), desktop: !!job.desktop, piece: f.id, sound: job.sound, style: job.style ?? null, mode: job.mode, dt, start: g.timeAt(0), fr, kit };
    }, job);
    if (job.pcm) { const b64 = await p.evaluate(() => window.__pcm64); fs.writeFileSync(`${outDir}/${job.name}.s16`, Buffer.from(b64, 'base64')); }
    fs.writeFileSync(out, JSON.stringify(r));
    console.log(job.name, ((Date.now() - t0) / 1000).toFixed(0) + 's', 'frames', r.fr.P.length, 'strokes', r.kit.length);
    await ctx.close();
  }
  await b.close();
})();
