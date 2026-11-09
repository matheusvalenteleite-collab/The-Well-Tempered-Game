// D487, THE VOICES' LOUDNESS AS THE GAME SOUNDS THEM (the measurement behind src/touch/player-lift-data.ts).
// The whole game rendered offline (an OfflineAudioContext stepped by suspend, every 512 samples at 24 kHz): the real
// engine, a fugue on its own sound (PIECE_SOUND) or one named, play.html's reading (Busoni's), the player's voice
// played by a driver (each note struck on time at its row, at the bar's middle, held legato to the next), every
// ch.note routed through a tap per voice (the band's by the voice the game shapes it for, the player's by `lead`);
// each tap K-weighted (a 38 Hz high-pass, +4 dB over 1.5 kHz) and through a phone speaker (two 550 Hz high-passes and
// the same shelf); the energy over the windows where the voice sounds (over -40 dB of the loudest window), and the
// player against each other voice over the windows where both sound. ProtoGame.lift (D487) is applied as the game
// applies it, through the player's own bus (WTG_NOLIFT=1 measures without it).
//
// Needs Playwright (not a dependency: /opt/node-tools here) and a dev server with no hot reload on PORT (default 5300):
//   npx vite --config <a config with server.hmr false and server.watch.ignored ['**/*']> --port 5300
// usage: node tools/touch/player-lift/scan.cjs <out.json> <piece[:v,v][@sound]>...   (no voice: every voice)
// then: node tools/touch/player-lift/build.ts <own.json> <sounds.json>   (writes src/touch/player-lift-data.ts)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const PORT = process.env.PORT || '5300';
const [out, ...jobs] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text().slice(0, 300)); });
  await p.goto(`http://localhost:${PORT}/bench.html`);
  await p.waitForTimeout(2500);
  const results = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  for (const job of jobs) {
    const [pv, snd = ''] = job.split('@');
    const [piece, vs] = pv.split(':');
    const nv = await p.evaluate(async (id) => (await import('/src/touch/fugue.ts')).fugueById(id).voices.length, piece);
    const voices = vs !== undefined ? vs.split(',').map(Number) : [...Array(nv).keys()];
    for (const voice of voices) {
      const key = `${piece}:${voice}${snd ? '@' + snd : ''}`;
      if (results[key]) continue;
      const t0 = Date.now();
      const r = await p.evaluate(async ([id, voice, snd, nolift]) => {
        window.__sound = snd || undefined;
        window.__nolift = nolift;
        // D508: raw (WTG_NOLIFT=1): no balance at all (no lift, no band trims, no entries brought forward, no tone).
        (await import('/src/touch/player-lift.ts')).BALANCE.raw = !!nolift;
        const SR = 24000, N = 512, dt = N / SR;
        const { fugueById } = await import('/src/touch/fugue.ts');
        const chipM = await import('/src/touch/chip.ts');
        const { setPreset, playerSound } = await import('/src/touch/sound.ts');
        const { PIECE_SOUND } = await import('/src/touch/piece-sound.ts');
        const { ProtoGame } = await import('/src/bench/proto-game.ts');
        const { protoById, easyOf } = await import('/src/bench/protos.ts');
        const { playReading } = await import('/src/touch/readings.ts');
        const { tempoOf } = await import('/src/touch/tempi.ts');
        const { loadColours } = await import('/src/touch/colour.ts');
        await loadColours().catch(() => {});
        const f = fugueById(id);
        const sound = playerSound(window.__sound || PIECE_SOUND[id] || 'chip');
        setPreset(sound);
        const bpm = tempoOf(id);
        const reading = playReading(id);
        // A first pass with a silent chip to learn the length.
        const len = (() => { const tps = (f.tpq * bpm) / 60; return f.length / tps + 12; })();
        const dur = Math.min(420, len);
        const Real = window.AudioContext;
        window.AudioContext = function () { return new OfflineAudioContext(2, Math.ceil(SR * dur), SR); };
        const ch = new chipM.Chip();
        window.AudioContext = Real;
        ch.lag = 0;
        const ac = ch.ctx;
        const all = f.voices.flat().map((n) => n[2]);
        // D578: as the game prepares a piece (TouchApp: its opening, so a piece's own line-up is planned first).
        await ch.prepare(all, f.voices[voice].map((n) => n[2]), chipM.openingOf(f));
        const proto = protoById('ladder');
        const g = new ProtoGame(f, [voice], 0, proto, { bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: false, reading, ornHint: false, scale: false }, ch);
        g.wall = () => 0;
        window.__g = g;
        // D487: the player's lift as BenchApp applies it (the player's own bus), unless measuring without it.
        ch.mine.gain.value = window.__nolift ? 1 : (g.lift ?? 1);
        const W = 844, H = 390, y0 = 330, rowH = 9;
        g.rows = { yOf: (st) => y0 - st * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 };
        // The taps: by voice (the band's by its pan; the player's by lead).
        const pans = f.voices.map((_, u) => +chipM.voicing(u, f.voices.length, false).pan.toFixed(4));
        const dup = new Set(pans).size !== pans.length;
        const taps = new Map();
        const bq = (type, fr, q, gain = 0) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = fr; x.Q.value = q; x.gain.value = gain; return x; };
        const tapOf = (k, lead) => {
          if (taps.has(k)) return taps.get(k);
          const t = ac.createGain();
          t.connect(lead ? ch.mine : ch.bus);
          // Measured as heard: the player's tap after its own bus's gain (the lift, D487), the band's as it is.
          const src = ac.createGain();
          src.gain.value = lead ? ch.mine.gain.value : 1;
          t.connect(src);
          const an = (pre) => { const a = ac.createAnalyser(); a.fftSize = N; let n = src; for (const x of pre) { n.connect(x); n = x; } n.connect(a); return a; };
          const tap = { t, K: an([bq('highpass', 38, 0.5), bq('highshelf', 1500, 0.7, 4)]), P: an([bq('highpass', 550, 0.7), bq('highpass', 550, 0.7), bq('highshelf', 1500, 0.7, 4)]), H: an([bq('highpass', 2500, 0.7), bq('highpass', 2500, 0.7)]), w: [], notes: 0, lv: 0 };
          taps.set(k, tap);
          return tap;
        };
        const orig = ch.note.bind(ch);
        // The band's voice: the game shapes each band note by its voice (subject-fx shape) just before sounding it.
        let cur = -1;
        const shape0 = g.subj.shape.bind(g.subj);
        g.subj.shape = (vv, on, v) => ((cur = vv), shape0(vv, on, v));
        ch.note = (midi, at, d, v, pl = {}) => {
          const lead = !!pl.lead;
          const k = lead ? 'P' : `v${cur}`;
          const tap = tapOf(k, lead);
          tap.notes++; tap.lv += pl.level ?? 1;
          return orig(midi, at, d, v, { ...pl, into: tap.t });
        };
        // The driver: the player's notes (no riding note, one per onset) struck at their onset, held to the next's.
        const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
        let ni = 0, id2 = 0, held = null;
        const buf = new Float32Array(N);
        const ms = (a) => { a.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < N; i++) s += buf[i] * buf[i]; return s / N; };
        let done = false;
        const ticks = [];
        const end = g.timeAt(f.length) + 3;
        const step = () => {
          const now = ac.currentTime;
          while (ni < notes.length && g.timeAt(notes[ni].on) <= now + 1e-4) {
            const n = notes[ni++];
            id2++;
            const side = id2 % 2 ? 'left' : 'right';
            g.down(id2, { side, x: side === 'left' ? 0.11 * W : 0.89 * W, y: g.rows.yOf(n.step), w: W, h: H }, 0);
            if (held) g.up(held, 0);
            held = id2;
            const nx = notes[ni];
            if (!nx || nx.on > n.on + n.dur) held = { id: id2, end: g.timeAt(n.on + n.dur) - 0.02 };
          }
          if (held && typeof held === 'object' && now >= held.end) { g.up(held.id, 0); held = null; }
          if (!done) done = g.step();
          ticks.push(g.now);
          // every tap a window each step (a tap made late: its earlier windows silent), so the windows line up in time
          for (const tap of taps.values()) { while (tap.w.length < ticks.length - 1) tap.w.push([0, 0, 0]); tap.w.push([ms(tap.K), ms(tap.P), ms(tap.H)]); }
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
        // The loudness: windows where a voice sounds (over -40 dB of the loudest window of all); the player against each voice where both sound.
        const nW = Math.max(...[...taps.values()].map((t) => t.w.length));
        let mx = 0; for (const t of taps.values()) for (const w of t.w) mx = Math.max(mx, w[0]);
        const on = (t, i) => t.w[i] && t.w[i][0] > mx * 1e-4;
        const db = (x) => (x > 0 ? +(10 * Math.log10(x)).toFixed(2) : null);
        const res = { id, voice, sound, lift: window.__nolift ? 1 : (g.lift ?? 1), reading: reading?.id ?? null, dup, pans, voices: {} };
        const P = taps.get('P');
        for (const [kk, t] of taps) {
          let n = 0, eK = 0, eP = 0;
          for (let i = 0; i < nW; i++) if (on(t, i)) { n++; eK += t.w[i][0]; eP += t.w[i][1]; }
          const v = { notes: t.notes, level: +(t.lv / Math.max(1, t.notes)).toFixed(3), windows: n, K: db(eK / Math.max(1, n)), Ph: db(eP / Math.max(1, n)) };
          if (P && kk !== 'P') {
            let m = 0, pk = 0, ok = 0, pp = 0, op = 0;
            // and the share of the shared time (2 s stretches) where the player is more than 1 dB under it
            const seg = Math.round(2 / dt); let segs = 0, under = 0, worst = 0;
            for (let s0 = 0; s0 < nW; s0 += seg) {
              let a = 0, bb = 0, c = 0;
              for (let i = s0; i < Math.min(nW, s0 + seg); i++) if (on(P, i) && on(t, i)) { m++; c++; a += P.w[i][0]; bb += t.w[i][0]; pp += P.w[i][1]; op += t.w[i][1]; pk += P.w[i][0]; ok += t.w[i][0]; }
              if (c > seg / 3) { segs++; const d = 10 * Math.log10(a / bb); if (d < -1) under++; worst = Math.min(worst, d); }
            }
            v.shared = m; v.playerMinusK = m ? +(10 * Math.log10(pk / ok)).toFixed(2) : null; v.playerMinusPh = m ? +(10 * Math.log10(pp / op)).toFixed(2) : null;
            v.segs = segs; v.segsUnder1dB = under; v.worst2s = +worst.toFixed(2);
          }
          res.voices[kk] = v;
        }
        // D508: each voice's level in its own subject entries and outside them (the windows by the tick then), the
        // brightness (energy over 2.5 kHz against the K-weighted, dB), and every 2 s stretch's level per voice
        // (the mean of K and phone, dB; null where it sounds under a third of the stretch) with Busoni's printed level.
        // the entries through the game's own API (voice-mode.ts entrySpans; D493's entries), not the countersubjects
        const spans = (await import('/src/touch/voice-mode.ts')).entrySpans(f).filter((e) => e.form !== 'counter');
        const inE = (u, tk) => spans.some((e) => e.voice === u && e.on <= tk && tk < e.end);
        // a voice sounding by the score at each window (a note of it held there), for the 2 s stretches: a tail dying
        // away under a rest is not the voice lost.
        const byScore = f.voices.map((ns) => ticks.map((tk) => ns.some((n) => n[0] <= tk && tk < n[0] + n[1])));
        for (const [kk, t] of taps) {
          const u = kk === 'P' ? voice : +kk.slice(1);
          let a = [0, 0, 0], b2 = [0, 0, 0];
          for (let i = 0; i < nW; i++) if (on(t, i)) { const x = inE(u, ticks[i] ?? 0) ? a : b2; x[0]++; x[1] += t.w[i][0] + t.w[i][1]; x[2] += t.w[i][2]; }
          const v = res.voices[kk];
          let eK = 0, eH = 0;
          for (let i = 0; i < nW; i++) if (on(t, i)) { eK += t.w[i][0]; eH += t.w[i][2]; }
          v.bright = eK > 0 && eH > 0 ? +(10 * Math.log10(eH / eK)).toFixed(2) : null;
          v.inEntry = a[0] > 20 ? +(10 * Math.log10(a[1] / a[0] / 2)).toFixed(2) : null;
          v.outEntry = b2[0] > 20 ? +(10 * Math.log10(b2[1] / b2[0] / 2)).toFixed(2) : null;
          v.entryWindows = a[0];
          const seg = Math.round(2 / dt);
          v.seg = [];
          for (let s0 = 0; s0 < nW; s0 += seg) {
            let c = 0, e = 0;
            for (let i = s0; i < Math.min(nW, s0 + seg); i++) if (on(t, i) && byScore[u]?.[i]) { c++; e += (t.w[i][0] + t.w[i][1]) / 2; }
            v.seg.push(c > seg / 3 ? +(10 * Math.log10(e / c)).toFixed(1) : null);
          }
        }
        {
          const seg = Math.round(2 / dt);
          res.segTick = []; res.printed = [];
          for (let s0 = 0; s0 < nW; s0 += seg) {
            const tk = ticks[Math.min(nW - 1, s0 + (seg >> 1))] ?? 0;
            res.segTick.push(tk);
            res.printed.push(g.whole?.levelAt ? f.voices.map((_, u) => +g.whole.levelAt(u, tk).toFixed(1)) : null);
          }
        }
        res.marks = g.marks?.length; res.hits = g.hits;
        return res;
      }, [piece, voice, snd, process.env.WTG_NOLIFT === '1']);
      results[key] = r;
      fs.writeFileSync(out, JSON.stringify(results, null, 1));
      const others = Object.entries(r.voices).filter(([k]) => k !== 'P');
      console.log(key, r.sound, r.reading ?? '-', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'P K', r.voices.P?.K, 'Ph', r.voices.P?.Ph, others.map(([k, v]) => `${k} K${v.K} Ph${v.Ph} dK${v.playerMinusK} dPh${v.playerMinusPh} u${v.segsUnder1dB}/${v.segs} w${v.worst2s}`).join(' | '), r.dup ? 'DUP' : '');
    }
  }
  await b.close();
})();
