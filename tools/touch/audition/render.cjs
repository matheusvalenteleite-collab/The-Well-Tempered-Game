// D630, THE AUDITION CLIPS' RENDERS: one fixed phrase on every offered sound (SoundSelect's SOUND_GROUPS), so the sounds
// can be compared: I/2 (C minor, three voices, 4/4) from bar 7, where the alto holds its C, the bass enters with the
// subject a quaver later (the third entry) and the soprano runs above it; 3.5 s from the first note, no count-in.
// Through the real engine offline (D601's way, tools/touch/drum-peak/render.cjs: an OfflineAudioContext stepped by
// suspend every 512 samples, ProtoGame with play.html's reading, BUSONI), on a phone (a mobile context: the phone mix),
// Herr Bach's demonstration on the soprano (no count-in: his silent lead, cut away), DRUMS on with nothing chosen: the
// drums the game plays for I/2 on that sound (drum-library.ts homeFor: a band's own drummer, a sound's HOME). Writes
// <out>/<sound>.f32 (mono, the two channels' mean, from the first note) and <out>/<sound>.json (the drums, the strokes).
//
// Needs Playwright and a dev server with no hot reload on PORT (render-harness/vite.render.config.ts, or
// `npx vite --port <port> --strictPort`); then tools/touch/audition/encode.cjs.
// usage: PORT=<port> node tools/touch/audition/render.cjs <out dir> [sound ...]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const PORT = process.env.PORT || '5300';
const [outDir, ...only] = process.argv.slice(2);
const PHRASE = { piece: 'wtc1f02', fromBar: 7, toBar: 8, secs: 3.5, voice: 0 };
const SR = 32000;
// The audition's own options (the render only: the game is unchanged). ORCHESTRA & ORGAN at its last stage (stage.ts
// STAGE_MAX: the final group's line-up, the organ on every line), where the phrase alone would be the strings' (I/2's bar 7
// lies in its exposition, stage 0). The timpani sounds with the phrase heard as an arrival: the timpani's strokes on the
// home tonic or dominant (score-drums.ts homeTimpani) at `timp` (the bar's beat, from 1, and the drum), each checked
// against the harmony sounding there (the bass on the drum's note, the drum's pitch class among the sounding notes and
// none a semitone from it), else not struck.
const TIMP = [
  { beat: 1.5, drum: 'tonic', vel: 0.62, why: "the bass's entry (the third entry): C under Eb and C, C minor" },
  { beat: 4, drum: 'tonic', vel: 0.42, why: 'the bass back on C under G and Eb: C minor in root position, the strong beat' },
];
const OPTS = {
  orchestraOrgan: { stage: 'last', timp: TIMP },
  chamberOrgan: { timp: TIMP },
  baroqueBand: { timp: TIMP },
};
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page0 = await (await b.newContext()).newPage();
  await page0.goto(`http://localhost:${PORT}/bench.html`);
  const ids = only.length ? only : await page0.evaluate(async () => (await import('/src/bench/SoundSelect.tsx')).SOUND_GROUPS.flatMap(([, ids]) => ids));
  for (const sound of ids) {
    if (fs.existsSync(`${outDir}/${sound}.json`)) continue;
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.error('pageerror', sound, e.message));
    // the recordings fetched, by folder (a new folder fetched from the public site, not this server, shows here too)
    const fetched = {};
    p.on('requestfinished', (q) => { const m = /\/samples\/([^/]+)\//.exec(q.url()); if (m) fetched[(q.url().startsWith(`http://localhost:${PORT}`) ? '' : 'remote:') + m[1]] = (fetched[m[1]] ?? 0) + 1; });
    await p.goto(`http://localhost:${PORT}/bench.html`);
    await p.waitForTimeout(1500);
    const t0 = Date.now();
    const r = await p.evaluate(async ([sound, PH, SR, OPT]) => {
      const N = 512, dt = N / SR;
      const { fugueById, barStart } = await import('/src/touch/fugue.ts');
      const chipM = await import('/src/touch/chip.ts');
      const { setPreset, setBacking } = await import('/src/touch/sound.ts');
      const { drumStyleFor, setDrumStyle } = await import('/src/touch/drum-library.ts');
      const { ProtoGame } = await import('/src/bench/proto-game.ts');
      const { protoById, easyOf } = await import('/src/bench/protos.ts');
      const { playReading } = await import('/src/touch/readings.ts');
      const { tempoOf } = await import('/src/touch/tempi.ts');
      const { loadColours } = await import('/src/touch/colour.ts');
      await loadColours().catch(() => {});
      const f = fugueById(PH.piece);
      setPreset(sound);
      setBacking(true);
      setDrumStyle(f.id, 'home');
      const drums = drumStyleFor(f.id, sound);
      const bpm = tempoOf(f.id);
      const reading = playReading(f.id);
      const from = barStart(f, PH.fromBar), until = barStart(f, PH.toBar + 1);
      const dur = PH.secs + 3;
      const Real = window.AudioContext;
      let ac = null;
      window.AudioContext = function () { ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); return ac; };
      const ch = new chipM.Chip();
      window.AudioContext = Real;
      ch.lag = 0;
      await ch.prepare(f.voices.flat().map((n) => n[2]), f.voices[PH.voice].map((n) => n[2]), chipM.openingOf(f));
      const kit = [];
      { const o2 = ch.scheduleKitHit.bind(ch); ch.scheduleKitHit = (e, snd) => { const before = ch.kitEvents.at(-1); o2(e, snd); const x = ch.kitEvents.at(-1); if (x && x !== before) kit.push([+x.when.toFixed(3), x.piece]); }; }
      const proto = protoById('ladder');
      // The timpani's arrival strokes (OPT.timp), each where the harmony allows it, into the style's plan for this render.
      const harmony = [];
      if (OPT.timp && drums === 'timpani') {
        const sd = await import('/src/touch/score-drums.ts');
        const tp = sd.homeTimpani(f.key);
        const plan = sd.scorePlan(f, 'timpani');
        for (const t of OPT.timp) {
          const tick = from + Math.round((t.beat - 1) * f.tpq);
          const sounding = f.voices.map((v) => v.find((n) => n[0] <= tick && n[0] + n[1] > tick)?.[2] ?? null);
          const pcs = sounding.filter((m) => m !== null).map((m) => m % 12);
          const bass = sounding.filter((m) => m !== null).reduce((a, m) => Math.min(a, m), 999) % 12;
          const midi = tp[t.drum], pc = midi % 12;
          const ok = bass === pc && pcs.includes(pc) && !pcs.some((x) => (x - pc + 12) % 12 === 1 || (pc - x + 12) % 12 === 1);
          harmony.push({ beat: t.beat, tick, drum: t.drum, midi, sounding, ok, why: t.why });
          if (ok) plan.strokes.push({ tick, dt: 0, piece: 'timp', vel: t.vel, midi, role: 'accent', src: 'arrival' });
        }
        plan.strokes.sort((a, b) => a.tick - b.tick);
      }
      const g = new ProtoGame(f, [PH.voice], from, proto, { bpm, legato: false, easy: easyOf(proto.id), fail: false, until, reading, ornHint: false, scale: false, demo: true }, ch);
      g.wall = () => 0;
      // ORCHESTRA & ORGAN's last stage for the audition (OPT.stage), every note read at it.
      if (OPT.stage === 'last') { const { STAGE_MAX } = await import('/src/touch/stage.ts'); g.stage = { at: () => STAGE_MAX }; }
      { const st = g.notes.map((n) => n.step), mid = (Math.min(...st) + Math.max(...st)) / 2, rowH = 12, y0 = 200 + mid * rowH; g.rows = { yOf: (s) => y0 - s * rowH, stepAt: (y) => Math.round((y0 - y) / rowH), rowH, xOf: () => 0 }; }
      const first = g.timeAt(from);
      let k = 1, done = false;
      const tick = () => {
        if (!done) done = g.step();
        k++;
        if (k * dt < dur - dt) ac.suspend(k * dt).then(tick);
        ac.resume();
      };
      ac.suspend(dt).then(tick);
      const buf = await ac.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const i0 = Math.round(first * SR), n = Math.round(PH.secs * SR);
      const mono = new Float32Array(n);
      for (let i = 0; i < n; i++) mono[i] = ((L[i0 + i] ?? 0) + (R[i0 + i] ?? 0)) / 2;
      const u8 = new Uint8Array(mono.buffer);
      let s = '';
      for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode(...u8.subarray(j, j + 0x8000));
      const inWin = kit.filter(([w]) => w >= first - 0.01 && w < first + PH.secs);
      return { sound, drums, bpm, opts: OPT, harmony, timp: inWin.filter(([, x]) => x === 'timp').map(([w]) => +(w - first).toFixed(2)), stageAt: g.stage ? g.stage.at(from) : null, first: +first.toFixed(3), strokes: kit.filter(([w]) => w >= first - 0.01 && w < first + PH.secs).length, pieces: [...new Set(kit.filter(([w]) => w >= first - 0.01 && w < first + PH.secs).map(([, x]) => x))], stolen: ch.stolen, failed: ch.failed, sr: SR, pcm: btoa(s) };
    }, [sound, PHRASE, SR, OPTS[sound] ?? {}]);
    fs.writeFileSync(`${outDir}/${sound}.f32`, Buffer.from(r.pcm, 'base64'));
    delete r.pcm;
    fs.writeFileSync(`${outDir}/${sound}.json`, JSON.stringify({ ...r, fetched, phrase: PHRASE }));
    console.log(sound, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify({ ...r, fetched }));
    await ctx.close();
  }
  await b.close();
})();
