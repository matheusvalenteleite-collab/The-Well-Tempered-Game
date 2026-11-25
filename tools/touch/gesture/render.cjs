// D1014-D1017, THE GESTURES' RENDERS: a passage through the real engine offline (bass-phone/render.cjs's way: an
// OfflineAudioContext stepped by suspend every 512 samples at 24 kHz, ProtoGame with play.html's reading, a mobile context,
// DRUMS off), the player's line driven note by note (down on time at the bar's middle, up at the written end) and, on each
// note of `sway.minDur` s or more, the held thumb moved ACROSS its bar (never along it: no slide, no shake) by `sway`:
//   arch  out to `amp` of strength by the note's middle and back (a swell's shape)
//   out   out to `amp` within 0.25 s and held there to the end
//   tri2  out to +amp, across to -amp, back to the landing (both ways)
// Before and after are the same job on two servers (PORT: a checkout of the code before, and this one). `slides: true`: the
// held thumb slides on to the next note (along the bar, from 60% of the time between them, arriving on time, ten moves) while
// the line keeps one way, else it lifts and the other thumb strikes; no sway. `solo: "player"` mutes the band
// (ProtoGame's own mute), else the whole mix. Writes <out>/<name>.wav (mono, (L+R)/2) and <name>.json (the notes swayed).
// usage: PORT=<port> node tools/touch/gesture/render.cjs <out dir> <jobs.json>
//   jobs: [{name, piece, sound, player, fromBar, secs, solo?: "player", land?, slides?, mech?, sway: {shape, amp, delay?, minDur}}]
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
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.error('pageerror', job.name, e.message));
    p.on('console', (m) => { if (m.type() === 'error') console.error('console', job.name, m.text()); });
    await p.goto(`http://localhost:${PORT}/bench.html`);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async (job) => {
      const SR = 24000, N = 512, dt = N / SR;
      const { fugueById, barStart, loadExtras } = await import('/src/touch/fugue.ts');
      await loadExtras();
      const chipM = await import('/src/touch/chip.ts');
      const { setPreset, setBacking, playerSound } = await import('/src/touch/sound.ts');
      const { ProtoGame } = await import('/src/bench/proto-game.ts');
      const { protoById, easyOf, BAR } = await import('/src/bench/protos.ts');
      const { playReading } = await import('/src/touch/readings.ts');
      const { tempoOf } = await import('/src/touch/tempi.ts');
      const { loadColours } = await import('/src/touch/colour.ts');
      await loadColours().catch(() => {});
      const f = fugueById(job.piece);
      const sound = playerSound(job.sound);
      setPreset(sound);
      setBacking(false);
      const bpm = tempoOf(f.id);
      const reading = playReading(f.id);
      const from = barStart(f, job.fromBar);
      const tps = (f.tpq * bpm) / 60;
      const Real = window.AudioContext;
      let ac = null;
      const lead = 1.5;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * (job.secs + 10)), SR); return ac; };
      const ch = new chipM.Chip();
      window.AudioContext = Real;
      ch.lag = 0;
      const pv = job.player;
      await ch.prepare(f.voices.flat().map((n) => n[2]), f.voices[pv].map((n) => n[2]), chipM.openingOf(f));
      const mute = job.solo === 'player' ? f.voices.map((_, u) => u).filter((u) => u !== pv) : [];
      // D1061: `mech`: the game's mechanics held for the job (e.g. {guitar: true, tilt: true}: play.html's GUITAR & TILT).
      if (job.mech) (await import('/src/bench/mechanics.ts')).lockMech(job.mech);
      const proto = protoById('ladder');
      const g = new ProtoGame(f, [pv], from, proto, { bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false, mute }, ch);
      g.wall = () => 0;
      ch.mine.gain.value = g.lift ?? 1;
      const W = 844, H = 390, y0 = 330, rowH = job.slides ? 12 : 9, bw = W * BAR;
      g.rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
      const xOf = (side, strength) => (side === 'left' ? strength * bw : W - strength * bw);
      const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on) && n.on >= from);
      const t0 = g.timeAt(from);
      const tEnd = t0 + job.secs;
      const sw = job.sway;
      const swayAt = (u) => (sw.shape === 'arch' ? Math.sin(Math.PI * u) : sw.shape === 'out' ? Math.min(1, u * 4) : u < 0.25 ? u * 4 : u < 0.75 ? 1 - (u - 0.25) * 4 : -1 + (u - 0.75) * 4);
      let ni = 0, id2 = 0, held = null, done = false;
      const swayed = [];
      const slid = [];
      const step = () => {
        const now = ac.currentTime;
        // `slides`: the held thumb on its way to the next note (it arrives as the note is due).
        if (job.slides && held && ni < notes.length) {
          const n = notes[ni], prev = notes[ni - 1];
          const dir = Math.sign(n.step - prev.step);
          const a = g.timeAt(prev.on), on = g.timeAt(n.on), from = a + 0.6 * (on - a);
          if (dir && prev.on + prev.dur >= n.on && (!held.dir || held.dir === dir) && on < tEnd && now >= from) {
            held.e = Math.max(held.e, on + 0.01);
            const k = Math.min(1, Math.ceil(((now - from) / Math.max(1e-3, on - from)) * 10) / 10);
            g.move(held.id, { side: held.side, x: xOf(held.side, job.land ?? 0.5), y: g.rows.yOf(prev.step) + (g.rows.yOf(n.step) - g.rows.yOf(prev.step)) * k, w: W, h: H }, 0);
            if (now >= on - 1e-4) { ni++; held.dir = dir; held.e = g.timeAt(n.on + n.dur) - 0.02; held.y = g.rows.yOf(n.step); slid.push(+(on - t0).toFixed(3)); }
          }
        }
        while (ni < notes.length && g.timeAt(notes[ni].on) <= now + 1e-4 && g.timeAt(notes[ni].on) < tEnd) {
          const n = notes[ni++];
          id2++;
          const side = id2 % 2 ? 'left' : 'right';
          const y = g.rows.yOf(n.step);
          g.down(id2, { side, x: xOf(side, job.land ?? 0.5), y, w: W, h: H }, 0);
          if (held) g.up(held.id, 0);
          const a = g.timeAt(n.on), e = g.timeAt(n.on + n.dur) - 0.02;
          held = { id: id2, side, y, a, e, sway: !job.slides && e - a >= sw.minDur };
          if (held.sway) swayed.push({ midi: n.midi ?? null, at: +(a - t0).toFixed(3), dur: +(e - a).toFixed(3) });
        }
        if (held && now >= held.e) { g.up(held.id, 0); held = null; }
        else if (held && held.sway) {
          const s0 = held.a + (sw.delay ?? 0.08);
          if (now >= s0) {
            const u = Math.min(1, (now - s0) / Math.max(0.05, held.e - 0.03 - s0));
            g.move(held.id, { side: held.side, x: xOf(held.side, (job.land ?? 0.5) + sw.amp * swayAt(u)), y: held.y, w: W, h: H }, 0);
          }
        }
        if (!done) done = g.step();
      };
      let k = 1;
      const tick = () => {
        step();
        k++;
        if (k * dt < Math.min(tEnd + 1.5, job.secs + 10 - 2 * dt)) ac.suspend(k * dt).then(tick);
        ac.resume();
      };
      ac.suspend(dt).then(tick);
      const buf = await ac.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const i0 = Math.max(0, Math.round((t0 - 0.05) * SR)), n = Math.min(L.length - i0, Math.round((job.secs + 1.2) * SR));
      const pcm = new Int16Array(n);
      for (let i = 0; i < n; i++) pcm[i] = Math.max(-1, Math.min(1, (L[i0 + i] + R[i0 + i]) / 2)) * 32767;
      window.__pcm = pcm;
      if (job.slides) for (const n of notes) { const a = g.timeAt(n.on) - t0, e = g.timeAt(n.on + n.dur) - t0 - 0.02; if (a < job.secs && e - a >= (sw?.minDur ?? 0.2)) swayed.push({ midi: n.midi ?? null, at: +a.toFixed(3), dur: +(e - a).toFixed(3) }); }
      return { slid, piece: f.id, sound, player: pv, sr: SR, n: pcm.length, t0, swayed, failed: ch.failed, stolen: ch.stolen, slides: g.slides ?? null };
    }, job);
    const size = 1 << 20, bytes = r.n * 2, parts = [];
    for (let i = 0; i * size < bytes; i++) parts.push(Buffer.from(await p.evaluate(([i, s]) => { const a = new Uint8Array(window.__pcm.buffer, i * s, Math.min(s, window.__pcm.byteLength - i * s)); let x = ''; for (let j = 0; j < a.length; j += 0x8000) x += String.fromCharCode(...a.subarray(j, j + 0x8000)); return btoa(x); }, [i, size]), 'base64'));
    const raw = `${outDir}/${job.name}.raw`;
    fs.writeFileSync(raw, Buffer.concat(parts));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(r.sr), '-ac', '1', '-i', raw, out]);
    fs.unlinkSync(raw);
    fs.writeFileSync(`${outDir}/${job.name}.json`, JSON.stringify({ job, ...r }));
    console.log(job.name, r.sound, `p${r.player}`, `swayed ${r.swayed.length}`, `failed ${r.failed}`);
    await ctx.close();
  }
  await b.close();
})();
