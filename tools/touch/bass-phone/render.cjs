// D645, THE BASS ON A PHONE: each voice alone, as the game sounds it, through the phone model. A whole fugue (or its
// first `secs`) through the real engine offline (drum-peak/render.cjs's way: an OfflineAudioContext stepped by suspend
// every 512 samples at 24 kHz, ProtoGame with play.html's reading, the player's voice driven note by note, a mobile
// context, DRUMS off), the fugue's own sound (PIECE_SOUND) or one named; every voice but `solo` silent (the band's by
// ProtoGame's own mute, the player's notes at 1e-6; the player's level, D508's `l`, on its bus as BenchApp sets it), or `solo: "mix"` for the whole band and the player. The output
// (the destination, the master after Preset.levels, the band's chain and the limiter) is written as a mono 24 kHz wav
// ((L+R)/2); measure.py reads it through the phone model (two 2nd-order 600 Hz high-passes, ebur128).
//
// Needs Playwright and a dev server with no hot reload on PORT (as scan.cjs).
// usage: node tools/touch/bass-phone/render.cjs <out dir> <jobs.json>
//   jobs: [{name, piece, sound?, player, solo: voice | "mix", secs?, setup?, computer?}]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const PORT = process.env.PORT || '5300';
const [outDir, jobsFile] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const job of jobs) {
    const out = `${outDir}/${job.name}.wav`;
    if (fs.existsSync(out)) continue;
    // a phone (a mobile context); `computer: true` a computer's engine (no touch: the desktop mix, for comparison)
    const ctx = await b.newContext(job.computer ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.error('pageerror', job.name, e.message));
    await p.goto(`http://localhost:${PORT}/bench.html`);
    await p.waitForTimeout(1500);
    const t0 = Date.now();
    const r = await p.evaluate(async (job) => {
      const SR = 24000, N = 512, dt = N / SR;
      const { fugueById } = await import('/src/touch/fugue.ts');
      const chipM = await import('/src/touch/chip.ts');
      const { setPreset, setBacking, playerSound } = await import('/src/touch/sound.ts');
      const { PIECE_SOUND } = await import('/src/touch/piece-sound.ts');
      const { ProtoGame } = await import('/src/bench/proto-game.ts');
      const { protoById, easyOf } = await import('/src/bench/protos.ts');
      const { playReading } = await import('/src/touch/readings.ts');
      const { tempoOf } = await import('/src/touch/tempi.ts');
      const { loadColours } = await import('/src/touch/colour.ts');
      await loadColours().catch(() => {});
      const f = fugueById(job.piece);
      const sound = playerSound(job.sound || PIECE_SOUND[f.id] || 'chip');
      setPreset(sound);
      setBacking(false);
      if (job.setup) await new Function('W', job.setup)(window);
      const bpm = tempoOf(f.id);
      const reading = playReading(f.id);
      const whole = f.length / ((f.tpq * bpm) / 60) + 4;
      const dur = Math.min(job.secs ?? 600, whole);
      const Real = window.AudioContext;
      let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const ch = new chipM.Chip();
      window.AudioContext = Real;
      ch.lag = 0;
      const pv = job.player;
      const all = f.voices.flat().map((n) => n[2]);
      await ch.prepare(all, f.voices[pv].map((n) => n[2]), chipM.openingOf(f));
      const solo = job.solo;
      const mute = solo === 'mix' ? [] : f.voices.map((_, u) => u).filter((u) => u !== solo);
      if (solo !== 'mix' && solo !== pv) { const o = ch.note.bind(ch); ch.note = (m, at, d, v, pl = {}) => o(m, at, d, v, pl.lead ? { ...pl, level: 1e-6 } : pl); }
      const proto = protoById('ladder');
      const g = new ProtoGame(f, [pv], 0, proto, { bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false, mute }, ch);
      g.wall = () => 0;
      // the player's level as the game applies it (BenchApp: the player's own bus, D508's `l`; the default balance 0 dB)
      ch.mine.gain.value = g.lift ?? 1;
      const W = 844, H = 390, y0 = 330, rowH = 9;
      g.rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
      const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
      let ni = 0, id2 = 0, held = null, done = false;
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
      };
      let k = 1;
      const tick = () => {
        step();
        k++;
        if (k * dt < Math.min(dur, end) - dt) ac.suspend(k * dt).then(tick);
        ac.resume();
      };
      ac.suspend(dt).then(tick);
      const buf = await ac.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const pcm = new Int16Array(L.length);
      for (let i = 0; i < L.length; i++) pcm[i] = Math.max(-1, Math.min(1, (L[i] + R[i]) / 2)) * 32767;
      window.__pcm = pcm;
      return { piece: f.id, sound, player: pv, solo, sr: SR, n: pcm.length, start: g.timeAt(0) };
    }, job);
    const size = 1 << 20, bytes = r.n * 2, parts = [];
    for (let i = 0; i * size < bytes; i++) parts.push(Buffer.from(await p.evaluate(([i, s]) => { const a = new Uint8Array(window.__pcm.buffer, i * s, Math.min(s, window.__pcm.byteLength - i * s)); let x = ''; for (let j = 0; j < a.length; j += 0x8000) x += String.fromCharCode(...a.subarray(j, j + 0x8000)); return btoa(x); }, [i, size]), 'base64'));
    const raw = `${outDir}/${job.name}.raw`;
    fs.writeFileSync(raw, Buffer.concat(parts));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(r.sr), '-ac', '1', '-i', raw, out]);
    fs.unlinkSync(raw);
    console.log(job.name, r.sound, `p${r.player}`, `solo ${r.solo}`, ((Date.now() - t0) / 1000).toFixed(0) + 's', (r.n / r.sr).toFixed(1) + 's audio');
    await ctx.close();
  }
  await b.close();
})();
