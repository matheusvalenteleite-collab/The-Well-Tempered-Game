// D487 → D508 → D703, THE VOICES' LOUDNESS AS THE GAME SOUNDS THEM (the measurement behind src/touch/player-lift-data.ts).
// The whole game rendered offline (an OfflineAudioContext stepped by suspend, every 512 samples at 24 kHz): the real
// engine, a fugue on its own sound (PIECE_SOUND) or one named, play.html's reading (Busoni's), the player's voice played
// by a driver (each note struck on time at its row, at the bar's middle, held legato to the next), nothing of the balance
// applied (player-lift.ts BALANCE.raw), DRUMS off.
// D703: measured AFTER THE BAND'S CHAIN, as the game sounds it: each voice alone through the whole engine (its lane, the
// band's chain, its reverb, the master), the output read every step (D508's scan tapped every note before the chain, where
// a band's compressors, era EQ and trims, and a phone's own chain, were not heard). Per fugue 2n renders: the player alone in
// each voice (every band voice muted: ProtoGame's mute), and each band voice alone (the player on another voice, its notes
// at 1e-6); assembled as D508's runs (the player in voice v: `P` its own render, `v<u>` the band's voice u alone), the band's
// sounding of a voice not depending on where the player is with nothing of the balance applied. Each render's output, mono,
// K-weighted (a 38 Hz high-pass, +4 dB over 1.5 kHz) and through a phone speaker (two 550 Hz high-passes and the same shelf),
// and over 2.5 kHz (brightness); a voice's level over the windows where the score has it sounding and it is heard (over
// -40 dB of its loudest window).
// PHONE (default): a mobile context (the phone's path and chain); DESKTOP=1: a computer's (its own path and chain).
//
// Needs Playwright (not a dependency: /opt/node-tools here) and a dev server with no hot reload on PORT (default 5300):
//   npx vite --config <a config with server.hmr false and server.watch.ignored ['**/*']> --port 5300
// usage: node tools/touch/player-lift/scan.cjs <out.json> <piece[@sound][~fromBar:secs]>...   (every voice of each)
// then: node tools/touch/player-lift/build.ts (see its header)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const PORT = process.env.PORT || '5300';
const DESKTOP = process.env.DESKTOP === '1';
const [out, ...jobs] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(DESKTOP ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  let p = null;
  const page = async () => {
    if (p) return p;
    p = await ctx.newPage();
    p.on('pageerror', (e) => console.error('pageerror', e.message));
    p.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text().slice(0, 300)); });
    await p.goto(`http://localhost:${PORT}/bench.html`);
    await p.waitForTimeout(2500);
    return p;
  };
  const results = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  let renders = 0;
  for (const job of jobs) {
    const [main, part = ''] = job.split('~');
    const [piece, snd = ''] = main.split('@');
    const [fromBar, secs] = part ? part.split(':').map(Number) : [0, 0];
    const pg = await page();
    const nv = await pg.evaluate(async (id) => (await import('/src/touch/fugue.ts')).fugueById(id).voices.length, piece);
    const keyOf = (v) => `${piece}:${v}${snd ? '@' + snd : ''}${part ? '~' + part : ''}`;
    if ([...Array(nv).keys()].every((v) => results[keyOf(v)])) continue;
    const t0 = Date.now();
    // one render: the player in `pv`, only `solo` heard ('P': the player's own voice; a number: that band voice)
    const render = (pv, solo) => pg.evaluate(async ([id, snd, pv, solo, fromBar, secs]) => {
      const SR = 24000, N = 512, dt = N / SR;
      const { fugueById, barStart } = await import('/src/touch/fugue.ts');
      const chipM = await import('/src/touch/chip.ts');
      const { setPreset, setBacking, playerSound } = await import('/src/touch/sound.ts');
      const { PIECE_SOUND } = await import('/src/touch/piece-sound.ts');
      const { ProtoGame } = await import('/src/bench/proto-game.ts');
      const { protoById, easyOf } = await import('/src/bench/protos.ts');
      const { playReading } = await import('/src/touch/readings.ts');
      const { tempoOf } = await import('/src/touch/tempi.ts');
      const { loadColours } = await import('/src/touch/colour.ts');
      (await import('/src/touch/player-lift.ts')).BALANCE.raw = true;
      await loadColours().catch(() => {});
      const f = fugueById(id);
      const sound = playerSound(snd || PIECE_SOUND[id] || 'chip');
      setPreset(sound);
      setBacking(false);
      const bpm = tempoOf(id);
      const reading = playReading(id);
      const from = fromBar ? barStart(f, fromBar) : 0;
      const tps = (f.tpq * bpm) / 60;
      const dur = Math.min(secs || 600, (f.length - from) / tps + 6);
      // the output: everything the chip connects to the destination also feeds one mono sum, read every step
      const Real = window.AudioContext;
      let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const origConnect = AudioNode.prototype.connect;
      let sum = null;
      const sumOf = () => { if (!sum) { sum = ac.createGain(); sum.channelCount = 1; sum.channelCountMode = 'explicit'; sum.channelInterpretation = 'speakers'; } return sum; };
      AudioNode.prototype.connect = function (dest, ...rest) {
        const res = origConnect.call(this, dest, ...rest);
        if (dest instanceof AudioDestinationNode && ac && this.context === ac) origConnect.call(this, sumOf());
        return res;
      };
      try {
        const ch = new chipM.Chip();
        window.AudioContext = Real;
        ch.lag = 0;
        const all = f.voices.flat().map((n) => n[2]);
        // D578: as the game prepares a piece (TouchApp: its opening, so a piece's own line-up is planned first).
        await ch.prepare(all, f.voices[pv].map((n) => n[2]), chipM.openingOf(f));
        const mute = f.voices.map((_, u) => u).filter((u) => u !== pv && u !== solo);
        if (solo !== 'P') { const o = ch.note.bind(ch); ch.note = (m, at, d, v, pl = {}) => o(m, at, d, v, pl.lead ? { ...pl, level: 1e-6 } : pl); }
        const proto = protoById('ladder');
        const g = new ProtoGame(f, [pv], from, proto, { bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false, mute }, ch);
        g.wall = () => 0;
        ch.mine.gain.value = 1;
        const W = 844, H = 390, y0 = 330, rowH = 9;
        g.rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
        const bq = (type, fr, q, gain = 0) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = fr; x.Q.value = q; x.gain.value = gain; return x; };
        const an = (pre) => { const a = ac.createAnalyser(); a.fftSize = N; let n = sumOf(); for (const x of pre) { origConnect.call(n, x); n = x; } origConnect.call(n, a); return a; };
        const A = { K: an([bq('highpass', 38, 0.5), bq('highshelf', 1500, 0.7, 4)]), P: an([bq('highpass', 550, 0.7), bq('highpass', 550, 0.7), bq('highshelf', 1500, 0.7, 4)]), H: an([bq('highpass', 2500, 0.7), bq('highpass', 2500, 0.7)]) };
        const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on) && n.on >= from);
        let ni = 0, id2 = 0, held = null, done = false;
        const buf = new Float32Array(N);
        const ms = (a) => { a.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < N; i++) s += buf[i] * buf[i]; return s / N; };
        const ticks = [], w = [];
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
          ticks.push(g.now);
          w.push([ms(A.K), ms(A.P), ms(A.H)]);
        };
        let k = 1;
        const tick = () => {
          step();
          k++;
          if (k * dt < Math.min(dur, end) - dt) ac.suspend(k * dt).then(tick);
          ac.resume();
        };
        ac.suspend(dt).then(tick);
        await ac.startRendering();
        // the voice measured: where the score has it sounding (a note of it held there), its energy there
        const u = solo === 'P' ? pv : solo;
        const nW = w.length;
        // (and heard: over -40 dB of its loudest window, D508's gate: a plucked note's tail died away under a held note is not the voice)
        let mx = 0; for (const x of w) mx = Math.max(mx, x[0]);
        const sounding = ticks.map((tk, i) => w[i][0] > mx * 1e-4 && f.voices[u].some((n) => n[0] <= tk && tk < n[0] + n[1]));
        const db = (x) => (x > 0 ? +(10 * Math.log10(x)).toFixed(2) : null);
        let n = 0, eK = 0, eP = 0, eH = 0;
        for (let i = 0; i < nW; i++) if (sounding[i] && w[i][0] > 0) { n++; eK += w[i][0]; eP += w[i][1]; eH += w[i][2]; }
        const v = { windows: n, K: db(eK / Math.max(1, n)), Ph: db(eP / Math.max(1, n)), bright: eK > 0 && eH > 0 ? +(10 * Math.log10(eH / eK)).toFixed(2) : null };
        // D508: in its own subject entries and outside them (the mean of K and phone); every 2 s stretch's level
        // (`seg`: the mean of K and phone, dB; `segK`: K alone, a computer's) where it sounds a third of the stretch or more.
        const spans = (await import('/src/touch/voice-mode.ts')).entrySpans(f).filter((e) => e.form !== 'counter');
        const inE = (tk) => spans.some((e) => e.voice === u && e.on <= tk && tk < e.end);
        const a = [0, 0], b2 = [0, 0];
        for (let i = 0; i < nW; i++) if (sounding[i] && w[i][0] > 0) { const x = inE(ticks[i]) ? a : b2; x[0]++; x[1] += w[i][0] + w[i][1]; }
        v.inEntry = a[0] > 20 ? +(10 * Math.log10(a[1] / a[0] / 2)).toFixed(2) : null;
        v.outEntry = b2[0] > 20 ? +(10 * Math.log10(b2[1] / b2[0] / 2)).toFixed(2) : null;
        v.entryWindows = a[0];
        const seg = Math.round(2 / dt);
        v.seg = []; v.segK = [];
        const segTick = [], printed = [];
        for (let s0 = 0; s0 < nW; s0 += seg) {
          let c = 0, e = 0, eKs = 0;
          for (let i = s0; i < Math.min(nW, s0 + seg); i++) if (sounding[i] && w[i][0] > 0) { c++; e += (w[i][0] + w[i][1]) / 2; eKs += w[i][0]; }
          v.seg.push(c > seg / 3 ? +(10 * Math.log10(e / c)).toFixed(1) : null);
          v.segK.push(c > seg / 3 ? +(10 * Math.log10(eKs / c)).toFixed(1) : null);
          const tk = ticks[Math.min(nW - 1, s0 + (seg >> 1))] ?? 0;
          segTick.push(tk);
          printed.push(g.whole?.levelAt ? f.voices.map((_, uu) => +g.whole.levelAt(uu, tk).toFixed(1)) : null);
        }
        return { id: f.id, sound, reading: reading?.id ?? null, phone: navigator.maxTouchPoints > 0, v, segTick, printed };
      } finally {
        AudioNode.prototype.connect = origConnect;
        window.AudioContext = Real;
      }
    }, [piece, snd, pv, solo, fromBar, secs]);
    const own = [], band = [];
    for (let v = 0; v < nv; v++) { own.push(await render(v, 'P')); renders++; }
    for (let u = 0; u < nv; u++) { band.push(await render(u === 0 ? 1 : 0, u)); renders++; }
    for (let v = 0; v < nv; v++) {
      const voices = { P: own[v].v };
      for (let u = 0; u < nv; u++) if (u !== v) voices[`v${u}`] = band[u].v;
      results[keyOf(v)] = { id: own[v].id, voice: v, sound: own[v].sound, reading: own[v].reading, phone: own[v].phone, chain: 'after', voices, segTick: own[v].segTick, printed: own[v].printed };
    }
    fs.writeFileSync(out, JSON.stringify(results, null, 1));
    console.log(keyOf('*'), own[0].sound, DESKTOP ? 'desktop' : 'phone', ((Date.now() - t0) / 1000).toFixed(0) + 's', own.map((x, v) => `P${v} K${x.v.K} Ph${x.v.Ph}`).join(' '), '|', band.map((x, u) => `v${u} K${x.v.K} Ph${x.v.Ph}`).join(' '));
    // a fresh page now and then (the offline contexts' memory)
    if (renders > 60) { await p.close(); p = null; renders = 0; }
  }
  await b.close();
})();
