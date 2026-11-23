// D708, THE VOICE PROBE (the slow-fugues study's distinctness measure, offline): each voice's instrument alone on a sound,
// as the piece seats it (Preset.pieces / ZELENKA TRIO's layout, the piece's level), 4 notes at the voice's median pitch,
// 1.2 s apart, 0.5 s long, 6 s a voice, straight into the chip (no phrasing), through the real engine in an
// OfflineAudioContext at 44.1 kHz on a phone (a mobile context). measure.py reads each voice's centroid, attack, decay and
// tail and the pairs' distances.
// Needs Playwright and a dev server with no hot reload on PORT.
// usage: node tools/touch/voice-probe/render.cjs <out dir> <jobs.json>   (jobs: [{name, piece, sound, midis: [...]}])
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const PORT = process.env.PORT || '5300';
const [outDir, jobsFile] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: process.env.DESKTOP ? false : true });
  for (const job of jobs) {
    const out = `${outDir}/${job.name}.wav`;
    if (fs.existsSync(out)) continue;
    // a fresh page for every job: a candidate's setup changes the modules' objects (PATCHES, the preset) for that page only
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.error('pageerror', e.message));
    await p.goto(`http://localhost:${PORT}/bench.html`);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async (job) => {
      const SR = 44100;
      const { fugueById, loadExtras } = await import('/src/touch/fugue.ts');
      await loadExtras();
      const chipM = await import('/src/touch/chip.ts');
      const snd = await import('/src/touch/sound.ts');
      const trio = await import('/src/touch/trio.ts');
      const f = fugueById(job.piece);
      snd.setPreset(job.sound);
      if (job.setup) await (new (Object.getPrototypeOf(async function () {}).constructor)('W', job.setup))(window);
      if (job.dry) for (const k of Object.keys(snd.PATCHES)) { try { snd.PATCHES[k].send = 0; } catch (e) {} }
      snd.setBacking(false);
      const tl = snd.preset().id === 'oboeTrio' ? trio.trioLayout(f) : null;
      snd.setPieceLayout(tl ? { preset: snd.preset().id, count: tl.count, slots: tl.slots } : snd.pieceLineUp(snd.preset().id, f));
      const dur = job.dur;
      const Real = window.AudioContext;
      let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const ch = new chipM.Chip();
      window.AudioContext = Real;
      ch.lag = 0;
      await ch.prepare([...f.voices.flat().map((n) => n[2]), ...job.notes.map((n) => n[1])], f.voices[0].map((n) => n[2]), chipM.openingOf(f));
      ch.pieceLevel?.(f);
      const count = f.voices.length;
      job.notes.forEach(([v, m, at, d]) => ch.note(m, at, d, chipM.voicing(v, count), {}));
      const tr0 = performance.now(); const buf = await ac.startRendering(); window.__renderMs = performance.now() - tr0;
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const pcm = new Int16Array(L.length * 2);
      for (let i = 0; i < L.length; i++) (pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767), (pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767);
      window.__pcm = pcm;
      return { n: pcm.length, sr: SR, ms: window.__renderMs, nodes: window.__nodes ?? null, dur };
    }, job);
    const size = 1 << 20, bytes = r.n * 2, parts = [];
    for (let i = 0; i * size < bytes; i++) parts.push(Buffer.from(await p.evaluate(([i, s]) => { const a = new Uint8Array(window.__pcm.buffer, i * s, Math.min(s, window.__pcm.byteLength - i * s)); let x = ''; for (let j = 0; j < a.length; j += 0x8000) x += String.fromCharCode(...a.subarray(j, j + 0x8000)); return btoa(x); }, [i, size]), 'base64'));
    const raw = `${outDir}/${job.name}.raw`;
    fs.writeFileSync(raw, Buffer.concat(parts));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(r.sr), '-ac', '2', '-i', raw, out]);
    fs.unlinkSync(raw);
    console.log(JSON.stringify({ name: job.name, ms: r.ms, nodes: r.nodes, dur: r.dur }));
    await p.close();
  }
  await b.close();
})();
