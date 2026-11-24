/* Loop maker: build a piece one voice at a time over a fixed loop. A toy, not a game: nothing is judged.
   Input: the touch-area prototype's own gesture layer (TouchGestures), thumb areas (drawAreas), pitch rows,
   contact classes and tilt (TiltReader), with the touch-area settings. Sound: loopsound.js. Pure timing
   helpers: loopcore.js. Every take is kept verbatim (raw times on the audio clock, minus the latency offset);
   quantizing is applied only when playing or drawing. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const G = window.TouchGest, C = window.LoopCore, S = window.LoopSound, SH = window.Shared;
  const H = () => window.__touchHooks;
  const nowMs = () => performance.now();
  const COLORS = ["#e0a64a", "#7fb0c9", "#c98fb8", "#93c47d"];
  const PAN = [-0.35, 0.35, -0.12, 0.12];
  const SOUNDS = ["flute", "pluck", "bowed", "voice", "lead"];
  const REG = { "-1": "low", "0": "middle", "1": "high" };

  /* ---------- session (saved on the device) ---------- */
  let ses = null;
  const load = () => { try { const s = JSON.parse(localStorage.getItem("loopsession") || "null"); return s && s.setup ? s : null; } catch (e) { return null; } };
  function save() {
    if (!ses) return;
    try { localStorage.setItem("loopsession", JSON.stringify(ses)); $("lSaveMsg").textContent = ""; }
    catch (e) { // too big: keep the music, drop the raw input logs
      try { const lite = JSON.parse(JSON.stringify(ses)); for (const v of lite.voices) v.take.csv = []; localStorage.setItem("loopsession", JSON.stringify(lite)); $("lSaveMsg").textContent = "Saved without the raw input logs (storage full)."; }
      catch (e2) { $("lSaveMsg").textContent = "Could not save on this device."; }
    }
  }
  let latency = 0;
  try { latency = +(localStorage.getItem("loopLatency") || 0) || 0; } catch (e) { /* none */ }

  /* ---------- audio ---------- */
  let ctx = null, master = null, liveCh = null;
  function audio() {
    ctx = SH.audio();
    if (!ctx) return false;
    if (!master) {
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -6; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.15;
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp); comp.connect(ctx.destination);
      const lb = ctx.createGain(); lb.connect(master); liveCh = new S.Channel(ctx, lb, 0);
    }
    return true;
  }
  /* the audio-clock time a touch happened at (what was being heard then) */
  function ctxAt(perfMs) {
    const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    return ctx.currentTime - (nowMs() - perfMs) / 1000;
  }

  /* ---------- the transport: per-note look-ahead scheduling of drums and voices ---------- */
  function schedNote(ch, sound, reg, n, t0, P, handles) {
    const o = n.oct || 0; // the note's own octave (octave latch), else 0 and the channel carries tilt's octave
    const h = S.INSTR[sound].start(ch, t0, n.midi + 12 * (reg + o), { cls: n.cls, tau: (P.tau || 80) / 1000 });
    for (const e of n.ev || []) {
      const te = t0 + (e.at - n.on); if (te >= t0 + n.dur) continue;
      if (e.type === "pitch") h.pitch(te, e.midi + 12 * (reg + o));
      else if (e.type === "contact") { const d = e.norm - e.norm0; h.expr(te, Math.pow(10, (d * (P.ctDb || 0)) / 20), d * (P.ctBright || 0) * 1200); }
    }
    if (n.off != null) h.stop(t0 + n.dur); else handles.push({ h, n: n.src || n, t0 });
    return h;
  }
  class Transport {
    /* provider(k) -> null (the end) or {voices: [{id, slot, sound, reg, take, muted}], drums: bool} */
    constructor(c, dest, setup, T0, provider, opts) {
      this.ctx = c; this.s = setup; this.T0 = T0; this.L = C.loopLen(setup); this.provider = provider; this.opts = opts || {};
      this.bus = c.createGain(); this.bus.connect(dest);
      this.drums = c.createGain(); this.drums.gain.value = setup.drumVol; this.drums.connect(this.bus);
      this.chans = new Map(); this.open = []; this.h = T0 - 0.001; this.ended = false;
    }
    chan(v) { let ch = this.chans.get(v.id); if (!ch) { ch = new S.Channel(this.ctx, this.bus, PAN[v.slot] || 0); if (this.opts.audible && !this.opts.audible(v)) ch.out.gain.value = 0; this.chans.set(v.id, ch); } return ch; }
    scheduleUntil(horizon) {
      if (this.ended || horizon <= this.h) return;
      const L = this.L, s = this.s, spb = 60 / s.bpm, a = this.h, b = horizon;
      for (let k = Math.max(0, Math.floor((a - this.T0) / L)); this.T0 + k * L < b; k++) {
        const ps = this.T0 + k * L, inWin = (t) => t >= a && t < b;
        const pass = this.provider(k);
        if (!pass) { // the end: a last downbeat, then a fade
          if (inWin(ps)) { S.kick(this.ctx, this.drums, ps, 1); this.bus.gain.setTargetAtTime(0, ps + 0.4, 0.35); this.ended = true; this.endAt = ps + 2; }
          break;
        }
        if (pass.drums) for (let e = 0; e < s.bars * s.beats * 2; e++) { const t = ps + e * spb / 2; if (!inWin(t)) continue; const beat = e / 2; if (e % 2 === 0) { const bInBar = beat % s.beats; if (bInBar === 0 || (s.beats === 4 && bInBar === 2)) S.kick(this.ctx, this.drums, t, bInBar === 0 ? 1 : 0.7); hatAt(this.ctx, this.drums, t, bInBar === 0 ? 0.5 : 0.38); } else hatAt(this.ctx, this.drums, t, 0.24); }
        for (const v of pass.voices) {
          const ch = this.chan(v), P = v.take.expr || {};
          const tl = C.playTilt(v.take, s);
          const tv = (e) => (v.take.octLatch ? { ...e, octave: 0 } : e); // latched takes: octaves are per note
          if (inWin(ps)) ch.tilt(ps, tv(v.take.tilt0 || { octave: 0 })); // the tilt as it stood when the take began
          for (const e of tl) if (inWin(ps + e.at)) ch.tilt(ps + e.at, tv(e));
          for (const n of C.playNotes(v.take, s, this.opts.quant())) if (inWin(ps + n.start)) schedNote(ch, v.sound, v.reg, n, ps + n.start, P, this.open);
        }
      }
      this.h = horizon;
    }
    mix(voices) { for (const v of voices) { const ch = this.chans.get(v.id); if (ch) ch.out.gain.setTargetAtTime(audible(v) ? 1 : 0, this.ctx.currentTime, 0.02); } }
    closeOpen(n) { // a held note was released: stop its scheduled copies at their proper length
      this.open = this.open.filter((o) => { if (o.n !== n) return true; o.h.stop(Math.max(this.ctx.currentTime, o.t0 + Math.min(this.L - 0.01, n.off - n.on))); return false; });
    }
    stop() {
      const t = this.ctx.currentTime;
      this.ended = true; this.bus.gain.cancelScheduledValues(t); this.bus.gain.setTargetAtTime(0, t, 0.03);
      for (const o of this.open) o.h.stop(t + 0.1); this.open = [];
      const b = this.bus; setTimeout(() => { try { b.disconnect(); } catch (e) { /* gone */ } }, 600);
    }
  }
  function hatAt(c, dest, t, v) { // the drum kit's hi-hat (loopsound's drumsBar draws the same; inline for windowing)
    const n = c.createBufferSource(); n.buffer = hatNoise(c); const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7500; const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random() * 0.5); n.stop(t + 0.06);
  }
  const hn = new WeakMap();
  function hatNoise(c) { let b = hn.get(c); if (!b) { b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; hn.set(c, b); } return b; }

  let tr = null, trTimer = null;
  function startTransport(T0, provider) {
    stopTransport();
    tr = new Transport(ctx, master, ses.setup, T0, provider, { quant: () => ses.quant, audible });
    trTimer = setInterval(tick, 25); tick();
  }
  function stopTransport() { if (tr) tr.stop(); tr = null; clearInterval(trTimer); trTimer = null; }

  /* ---------- state ---------- */
  let state = "idle"; // idle | countin | rec | review | loop | piece
  let rec = null, review = null; // rec: the take being recorded; review: {take, sound, reg}
  const audible = (v) => { const solo = ses.voices.some((x) => x.solo); return !v.muted && (!solo || v.solo); };
  const committed = () => ses.voices.slice().sort((a, b) => a.order - b.order);
  const freeSlot = () => [0, 1, 2, 3].find((s) => !ses.voices.some((v) => v.slot === s));

  function tick() {
    if (!tr) return;
    const now = ctx.currentTime;
    if (state === "countin" && now >= tr.T0) state = "rec";
    if (state === "rec" && now >= tr.T0 + tr.L) { state = "review"; rec.closed = true; paint(); }
    tr.scheduleUntil(now + 0.2);
    if (tr.ended && tr.endAt && now > tr.endAt) { stopTransport(); state = "idle"; paint(); }
  }

  function record() {
    if (!audio()) return;
    if (ses.voices.length >= 4) return msg("Four voices is the most. Delete one to make room.");
    const slot = freeSlot(), sound = $("lSound").value, reg = +$("lReg").value;
    const T = H().T(), bar = C.barLen(ses.setup), T0 = ctx.currentTime + 0.25 + bar;
    rec = { top: T0, offset: latency, slot, sound, reg, notes: new Map(), list: [], tilt: [], tilt0: lastTilt || { octave: 0, bend: 0, vib: 0, bright: 0 }, closed: false,
      csv: SH.makeCsv(), expr: { ctDb: T.ctDb, ctBright: T.ctBright, tau: T.ctTau }, contactOn: T.contactOn, tiltOn: T.tiltOn, octLatch: !!T.octLatch };
    rec.csv.start();
    review = { id: "new", slot, sound, reg, muted: false,
      take: { get notes() { return rec ? rec.list : []; }, tilt: rec.tilt, tilt0: rec.tilt0, expr: rec.expr, octLatch: rec.octLatch } };
    state = "countin";
    for (let b = 0; b < ses.setup.beats; b++) S.click(ctx, master, T0 - bar + b * (60 / ses.setup.bpm), b === 0);
    startTransport(T0, (k) => ({ drums: true, voices: committed().filter(audible).concat(k >= 1 ? [review] : []) }));
    paint();
  }
  function takeOf(r) { // a plain, storable take
    return { notes: r.list.map((n) => ({ on: n.on, off: n.off != null ? n.off : null, midi: n.midi, cls: n.cls, ev: n.ev, oct: n.oct || 0 })), tilt: r.tilt, tilt0: r.tilt0,
      offset: r.offset, octLatch: r.octLatch, expr: r.expr, contactOn: r.contactOn, tiltOn: r.tiltOn, csv: r.csv.rows, recordedAt: new Date().toISOString() };
  }
  function keep() {
    if (state !== "review") return;
    for (const n of rec.list) if (n.off == null) n.off = n.on + Math.min(C.loopLen(ses.setup) - 0.01, ctxAt(nowMs()) - rec.top - rec.offset - n.on);
    const order = ses.voices.reduce((m, v) => Math.max(m, v.order), 0) + 1;
    const v = { id: "v" + Date.now(), slot: rec.slot, order, sound: rec.sound, reg: rec.reg, take: takeOf(rec), muted: false, solo: false };
    ses.voices.push(v); save();
    rec = null; review = null;
    state = "loop";
    // carry on looping everything, in time: the same transport, now with the kept voice among the committed
    if (tr) tr.provider = () => ({ drums: true, voices: committed() }); else loopAll();
    paint();
  }
  function retake() { if (state !== "review" && state !== "rec" && state !== "countin") return; rec = null; review = null; record(); }
  function loopAll() { if (!audio()) return; if (state === "countin" || state === "rec" || state === "review") { rec = null; review = null; } state = "loop"; startTransport(ctx.currentTime + 0.15, () => ({ drums: true, voices: committed() })); tr.mix(ses.voices); paint(); }
  function piece() {
    if (!audio()) return; if (!ses.voices.length) return msg("Record a voice first.");
    rec = null; review = null; state = "piece";
    const vs = committed().filter((v) => !v.muted), plan = C.finalePlan(vs.map((v) => v.id));
    startTransport(ctx.currentTime + 0.15, (k) => (k < plan.length ? { drums: true, voices: vs.filter((v) => plan[k].includes(v.id)) } : null));
    paint();
  }
  function stop() { stopTransport(); if (state !== "idle") { rec = null; review = null; } state = "idle"; releaseLive(); paint(); }

  /* ---------- export: the finale rendered offline ---------- */
  async function exportAudio() {
    if (!ses.voices.length) return msg("Record a voice first.");
    $("lExport").disabled = true; msg("Rendering…");
    try {
      const vs = committed().filter((v) => !v.muted), plan = C.finalePlan(vs.map((v) => v.id)), L = C.loopLen(ses.setup);
      const sr = 44100, dur = 0.2 + plan.length * L + 2.2, oc = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
      const comp = oc.createDynamicsCompressor(); comp.threshold.value = -6; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.15;
      const m = oc.createGain(); m.gain.value = 0.8; m.connect(comp); comp.connect(oc.destination);
      const t = new Transport(oc, m, ses.setup, 0.2, (k) => (k < plan.length ? { drums: true, voices: vs.filter((v) => plan[k].includes(v.id)) } : null), { quant: () => ses.quant });
      t.scheduleUntil(dur);
      const buf = await oc.startRendering();
      const wav = C.wavBytes([buf.getChannelData(0), buf.getChannelData(1)], sr);
      const name = `loop-piece-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`;
      msg(await SH.saveBytes(name + ".wav", wav, "audio/wav", name + ".zip", () => C.zipOne(name + ".wav", wav)));
    } catch (e) { msg("Export failed: " + (e && e.message || e)); }
    $("lExport").disabled = false;
  }

  /* ---------- input: the touch-area prototype's gesture layer ---------- */
  const live = new Map(); // gesture id -> live note handle
  const activeRows = new Map();
  let gest = null, tilt = null, lastTilt = null, areas = null;
  function onEvent(ev) {
    if (!ctx || !liveCh) return;
    const t = ctx.currentTime, voiceSound = rec && !rec.closed ? rec.sound : $("lSound").value, reg = rec && !rec.closed ? rec.reg : +$("lReg").value;
    const latch = !!H().T().octLatch;
    if (ev.type === "tilt") { lastTilt = { octave: ev.octave || 0, bend: ev.bend || 0, vib: ev.vib || 0, bright: ev.bright || 0 }; liveCh.tilt(t, latch ? { ...lastTilt, octave: 0 } : lastTilt); if (recording()) rec.tilt.push({ at: takeTime(ev.t), ...lastTilt }); return; }
    if (ev.type === "onset") {
      activeRows.set(ev.id, { row: ev.row, side: ev.side });
      const old = live.get(ev.id); if (old) old.h.stop(t);
      const cls = H().T().contactOn ? ev.cls : null;
      const oct = latch && lastTilt ? lastTilt.octave : 0;
      const h = S.INSTR[voiceSound].start(liveCh, t, ev.midi + 12 * (reg + oct), { cls, tau: H().T().ctTau / 1000 });
      const entry = { h, rec: null, oct };
      if (recording()) { const at = takeTime(ev.t); if (at >= -0.5 * 60 / ses.setup.bpm && at < C.loopLen(ses.setup)) { entry.rec = { on: at, off: null, midi: ev.midi, cls, ev: [], oct }; rec.list.push(entry.rec); } }
      live.set(ev.id, entry);
    } else if (ev.type === "pitch") {
      activeRows.set(ev.id, { row: ev.row, side: (activeRows.get(ev.id) || {}).side });
      const e = live.get(ev.id); if (!e) return;
      e.h.pitch(t, ev.midi + 12 * (reg + e.oct));
      if (e.rec) e.rec.ev.push({ at: takeTime(ev.t), type: "pitch", midi: ev.midi });
    } else if (ev.type === "contact") {
      const e = live.get(ev.id); if (!e || !H().T().contactOn) return;
      const T = H().T(), d = ev.norm - ev.norm0;
      e.h.expr(t, Math.pow(10, (d * T.ctDb) / 20), d * T.ctBright * 1200);
      if (e.rec) e.rec.ev.push({ at: takeTime(ev.t), type: "contact", norm: ev.norm, norm0: ev.norm0 });
    } else if (ev.type === "release") {
      activeRows.delete(ev.id);
      const e = live.get(ev.id); if (!e) return;
      e.h.stop(t); live.delete(ev.id);
      if (e.rec && rec) { e.rec.off = takeTime(ev.t); if (tr) tr.closeOpen(e.rec); }
    }
  }
  const recording = () => rec && !rec.closed && (state === "countin" || state === "rec");
  const takeTime = (perfMs) => ctxAt(perfMs) - rec.top - rec.offset;
  function releaseLive() { if (gest) gest.releaseAll(nowMs()); for (const e of live.values()) e.h.stop(ctx.currentTime); live.clear(); activeRows.clear(); }

  function layout() {
    const W = innerWidth, Hh = innerHeight, MX = 48, MY = 44, aw = H().areaWidth(W), h = Hh - 2 * MY;
    Object.assign($("lL").style, { left: MX + "px", top: MY + "px", width: aw + "px", height: h + "px" });
    Object.assign($("lR").style, { left: W - MX - aw + "px", top: MY + "px", width: aw + "px", height: h + "px" });
    Object.assign($("lPanel").style, { left: MX + aw + 10 + "px", width: W - 2 * MX - 2 * aw - 20 + "px", top: "6px", height: Hh - 12 + "px" });
    areas = H().drawAreas($("lL"), $("lR"));
    gest.hitFn = areas.hit;
    const cv = $("lCanvas"), w = W - 2 * MX - 2 * aw - 20;
    cv.width = Math.round(w * devicePixelRatio); cv.height = Math.round(118 * devicePixelRatio); cv.style.width = w + "px"; cv.style.height = "118px";
  }

  function boot() {
    gest = new G.TouchGestures(() => areas ? areas.rect : { left: { left: 0, right: 0, top: 0, bottom: 0 }, right: { left: 0, right: 0, top: 0, bottom: 0 } }, () => H().rows(), onEvent, () => H().gopts());
    tilt = new G.TiltReader(onEvent);
    H().onMotion((e) => { if (window.__mode !== "loop" || !H().T().tiltOn) return; const g = e.accelerationIncludingGravity; if (!g || g.x == null) return; tilt.feed(nowMs(), g.x, g.y, g.z, H().T(), e.rotationRate); });
    const inLoop = () => window.__mode === "loop" && $("lSetup").hidden && $("lLatBox").hidden && $("csvBox").hidden;
    const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button,select,input,textarea,label,canvas"));
    document.addEventListener("pointerdown", (e) => {
      if (!inLoop() || onControl(e) || !areas) return;
      if (!gest.sideAt(e.clientX, e.clientY)) return;
      e.preventDefault();
      const t = SH.evTime(e);
      if (recording()) rec.csv.add({ t_ms: t, mode: "loop", event: "pointerdown", id: e.pointerId, zone: gest.sideAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY, pressure: e.pressure, width: e.width, height: e.height, note: "take " + (ses.voices.length + 1) });
      gest.down(e.pointerId, t, e.clientX, e.clientY, { width: e.width, height: e.height });
    }, { passive: false });
    document.addEventListener("pointermove", (e) => {
      if (window.__mode !== "loop" || !gest.held.has(e.pointerId)) return;
      e.preventDefault();
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const s of list.length ? list : [e]) {
        const t = SH.evTime(s);
        if (recording()) rec.csv.add({ t_ms: t, mode: "loop", event: s === e ? "pointermove" : "coalesced", id: e.pointerId, x: s.clientX, y: s.clientY, pressure: s.pressure, width: s.width, height: s.height, note: "take " + (ses.voices.length + 1) });
        gest.move(e.pointerId, t, s.clientX, s.clientY, { width: s.width, height: s.height });
      }
    }, { passive: false });
    const up = (e) => {
      if (window.__mode !== "loop" || !gest.held.has(e.pointerId)) return;
      const t = SH.evTime(e);
      if (rec && !rec.csvDone) rec.csv.add({ t_ms: t, mode: "loop", event: e.type, id: e.pointerId, x: e.clientX, y: e.clientY, note: "take " + (ses.voices.length + 1) });
      gest.up(e.pointerId, t);
    };
    document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    ["touchstart", "touchmove"].forEach((k) => document.addEventListener(k, (e) => { if (inLoop() && !onControl(e) && [...e.changedTouches].some((tc) => gest.sideAt(tc.clientX, tc.clientY) || gest.held.size)) e.preventDefault(); }, { passive: false }));

    /* controls */
    $("lSound").innerHTML = SOUNDS.map((k) => `<option value="${k}">${S.INSTR[k].name}</option>`).join("");
    $("lRec").onclick = record; $("lKeep").onclick = keep; $("lRetake").onclick = retake; $("lStop").onclick = stop;
    $("lAll").onclick = loopAll; $("lPiece").onclick = piece; $("lExport").onclick = exportAudio;
    $("lQuant").onchange = () => { ses.quant = $("lQuant").value; save(); };
    $("lDrum").oninput = () => { ses.setup.drumVol = +$("lDrum").value; $("lDrumO").textContent = (+$("lDrum").value).toFixed(2); if (tr) tr.drums.gain.setTargetAtTime(ses.setup.drumVol, ctx.currentTime, 0.03); save(); };
    $("lMenu").onclick = () => window.__home();
    $("lNew").onclick = () => { if ($("lNew").dataset.sure) { delete $("lNew").dataset.sure; $("lNew").textContent = "New session"; stop(); ses = null; try { localStorage.removeItem("loopsession"); } catch (e) { /* none */ } openSetup(); } else { $("lNew").dataset.sure = "1"; $("lNew").textContent = "Sure? Tap again"; setTimeout(() => { delete $("lNew").dataset.sure; $("lNew").textContent = "New session"; }, 2500); } };
    $("lCsv").onclick = () => {
      const all = SH.makeCsv();
      for (const v of committed()) all.rows.push(...(v.take.csv || []));
      if (review && rec) all.rows.push(...rec.csv.rows);
      window.__showCsv("loop", all);
    };
    // setup
    const sv = (id, o, f) => { $(id).oninput = () => { $(o).textContent = f(+$(id).value); }; $(id).oninput(); };
    sv("lsBpm", "lsBpmO", (v) => v + " BPM"); sv("lsDrum", "lsDrumO", (v) => v.toFixed(2));
    $("lsStart").onclick = () => {
      audio();
      ses = { setup: { bpm: +$("lsBpm").value, beats: +$("lsMeter").value, bars: +$("lsBars").value, drumVol: +$("lsDrum").value }, voices: [], quant: "off", created: new Date().toISOString() };
      save(); $("lSetup").hidden = true; syncControls(); paint();
    };
    // latency calibration
    $("lLat").onclick = () => { $("lLatBox").hidden = false; $("llRes").textContent = `Current offset: ${(latency * 1000).toFixed(0)} ms.`; };
    $("llClose").onclick = () => { $("lLatBox").hidden = true; };
    $("llGo").onclick = latencyRun;
    $("llUse").onclick = () => { if (latRes) { latency = latRes.offset; try { localStorage.setItem("loopLatency", String(latency)); } catch (e) { /* none */ } $("llRes").textContent += "  Saved."; } };
    $("lLatBox").addEventListener("pointerdown", (e) => { if (latRun && !onControl(e)) { e.preventDefault(); latRun.taps.push(ctxAt(SH.evTime(e))); $("llCount").textContent = `${latRun.taps.length} taps`; } }, { passive: false });
    addEventListener("resize", () => { if (window.__mode === "loop") layout(); });
    requestAnimationFrame(draw);
  }

  /* ---------- latency: tap along to 16 clicks; the first 4 are a lead-in ---------- */
  let latRun = null, latRes = null;
  function latencyRun() {
    if (!audio()) return;
    const spb = 60 / (ses ? ses.setup.bpm : 90), t0 = ctx.currentTime + 0.4, clicks = [];
    for (let i = 0; i < 16; i++) { const t = t0 + i * spb; S.click(ctx, master, t, i % 4 === 0); clicks.push(t); }
    latRun = { taps: [], clicks }; latRes = null;
    $("llRes").textContent = "Tap anywhere in time with the clicks (the first four are a lead-in)…"; $("llCount").textContent = "";
    setTimeout(() => {
      const r = C.latencyFrom(clicks.slice(4), latRun.taps);
      latRun = null; latRes = r;
      $("llRes").textContent = r ? `Your taps land ${(r.offset * 1000).toFixed(0)} ms ${r.offset >= 0 ? "after" : "before"} the clicks (spread ±${(r.spread * 1000).toFixed(0)} ms, ${r.n} taps). Tap "Use this" to correct new takes by it.` : "Too few taps matched the clicks: try again.";
    }, (16 * spb + 0.8) * 1000);
  }

  /* ---------- screen ---------- */
  function msg(t) { $("lMsg").textContent = t; }
  function syncControls() {
    if (!ses) return;
    $("lQuant").value = ses.quant; $("lDrum").value = ses.setup.drumVol; $("lDrumO").textContent = ses.setup.drumVol.toFixed(2);
  }
  function paint() {
    if (!ses) return;
    const s = ses.setup;
    $("lSetupLine").textContent = `${s.bpm} BPM · ${s.beats}/4 · ${s.bars} bars · latency ${(latency * 1000).toFixed(0)} ms`;
    $("lKeep").hidden = $("lRetake").hidden = state !== "review";
    $("lRec").disabled = ses.voices.length >= 4 || state === "countin" || state === "rec" || state === "review";
    const box = $("lVoices"); box.innerHTML = "";
    for (const v of committed()) {
      const row = document.createElement("div"); row.className = "lvrow";
      row.innerHTML = `<span class="lchip" style="background:${COLORS[v.slot]}"></span><span class="lvname">${v.order}. ${S.INSTR[v.sound].name}, ${REG[v.reg]}</span>`;
      const b = (label, on, f) => { const x = document.createElement("button"); x.textContent = label; if (on) x.classList.add("sel"); x.onclick = f; row.appendChild(x); return x; };
      b("M", v.muted, () => { v.muted = !v.muted; save(); if (tr) tr.mix(ses.voices); paint(); });
      b("S", v.solo, () => { v.solo = !v.solo; save(); if (tr) tr.mix(ses.voices); paint(); });
      const del = b("×", false, () => {
        if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "sure?"; setTimeout(() => { if (del.isConnected) { delete del.dataset.sure; del.textContent = "×"; } }, 2500); return; }
        ses.voices = ses.voices.filter((x) => x !== v); save(); if (state === "loop") loopAll(); paint();
      });
      box.appendChild(row);
    }
    if (!ses.voices.length) box.textContent = "No voices yet.";
  }
  function status() {
    if (!ctx || !ses) return "";
    const L = C.loopLen(ses.setup), spb = 60 / ses.setup.bpm;
    if (state === "countin") return `Count-in: ${Math.max(1, Math.ceil((tr.T0 - ctx.currentTime) / spb))}`;
    if (state === "rec") return "● Recording";
    if (state === "review") return "Listening back: Keep or Retake?";
    if (state === "loop") return "Looping everything";
    if (state === "piece") { const k = Math.floor((ctx.currentTime - tr.T0) / L); const n = committed().filter((v) => !v.muted).length; return k < n ? `Piece: voice ${k + 1} enters` : k < n + 2 ? "Piece: all together" : "Piece: ending"; }
    return ses.voices.length >= 4 ? "Four voices: play the piece, or delete one." : "Choose a sound and register, then Record.";
  }

  /* lanes: one per voice slot, notes as bars over the loop, a playhead */
  function draw() {
    requestAnimationFrame(draw);
    if (window.__mode !== "loop" || !ses) return;
    if (gest) gest.tick(nowMs());
    const cv = $("lCanvas"), g = cv.getContext("2d"), dpr = devicePixelRatio, W = cv.width / dpr, Hc = cv.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hc);
    const s = ses.setup, L = C.loopLen(s), lh = (Hc - 6) / 4, rows = H().rows(), lo = Math.min(...rows) - 12, hi = Math.max(...rows) + 12;
    // bar lines
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let b = 0; b <= s.bars * s.beats; b++) g.fillRect((b / (s.bars * s.beats)) * W, 0, b % s.beats ? 0.5 : 1, Hc);
    const lane = (slot, take, reg, live) => {
      const y0 = 3 + slot * lh;
      g.fillStyle = COLORS[slot] + "18"; g.fillRect(0, y0 + 1, W, lh - 2);
      if (!take) return;
      g.fillStyle = COLORS[slot];
      const notes = live ? take.list.map((n) => ({ ...n, start: C.mod(n.on + C.qShift(n.on, s, ses.quant), L), dur: Math.max(0.03, Math.min(L - 0.01, (n.off != null ? n.off : ctxAt(nowMs()) - take.top - take.offset) - n.on)) })) : C.playNotes(take, s, ses.quant);
      for (const n of notes) {
        const p = Math.max(0, Math.min(1, (n.midi + 12 * reg - lo) / (hi - lo))), y = y0 + lh - 3 - p * (lh - 6), x = (n.start / L) * W, w = Math.max(2, (n.dur / L) * W);
        g.fillRect(x, y - 1.5, Math.min(w, W - x), 3); if (x + w > W) g.fillRect(0, y - 1.5, x + w - W, 3);
      }
    };
    const used = new Set();
    for (const v of ses.voices) { used.add(v.slot); g.globalAlpha = audible(v) ? 1 : 0.35; lane(v.slot, v.take, v.reg, false); }
    g.globalAlpha = 1;
    if (rec) lane(rec.slot, rec, rec.reg, true);
    for (let k = 0; k < 4; k++) if (!used.has(k) && !(rec && rec.slot === k)) lane(k, null);
    if (tr && ctx.currentTime >= tr.T0) { const x = (C.mod(ctx.currentTime - tr.T0, L) / L) * W; g.fillStyle = "#e8e4da"; g.fillRect(x, 0, 1.5, Hc); }
    $("lStatus").textContent = status();
    // the thumbs' rows, as in the touch-area prototype
    for (const [side, el] of [["left", $("lL")], ["right", $("lR")]]) {
      const on = new Set([...activeRows.values()].filter((a) => a.side === side).map((a) => a.row));
      for (const d of el.querySelectorAll("[data-row]")) d.classList.toggle("on", on.has(+d.dataset.row));
    }
  }

  function openSetup() { $("lSetup").hidden = false; }
  window.__loopEnter = () => {
    audio(); layout();
    if (!ses) ses = load();
    if (!ses) openSetup(); else { $("lSetup").hidden = true; syncControls(); paint(); }
  };
  window.__loopLeave = () => { stop(); };
  window.__loop = { state: () => state, ses: () => ses, rec: () => rec, tr: () => tr, latency: () => latency, setLatency: (x) => { latency = x; }, ctxAt: (p) => ctxAt(p), gest: () => gest, onEvent };
  boot();
})();
