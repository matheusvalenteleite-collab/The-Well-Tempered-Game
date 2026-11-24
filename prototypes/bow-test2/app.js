/* Bow test 2: the page. Wires touches to BowCore.BowEngine and keeps the measurements. */
(function () {
  "use strict";
  const C = window.BowCore;
  const $ = (id) => document.getElementById(id);
  const T0 = performance.now();
  const now = () => performance.now();
  const ts = (t) => ((t - T0) / 1000).toFixed(3);

  /* ---------- settings (kept on this phone between visits) ---------- */
  let P = Object.assign({}, C.DEFAULTS);
  try { const s = JSON.parse(localStorage.getItem("bowtest2") || "{}"); Object.assign(P, s.P || {}); } catch (e) { /* none */ }
  let swapped = false, panelHidden = false;
  try { const s = JSON.parse(localStorage.getItem("bowtest2") || "{}"); swapped = !!s.swapped; panelHidden = !!s.panelHidden; } catch (e) { /* none */ }
  function save() { try { localStorage.setItem("bowtest2", JSON.stringify({ P, swapped, panelHidden })); } catch (e) { /* none */ } }

  /* ---------- log ---------- */
  const LOG = [];
  function log(msg) { LOG.push(ts(now()) + "  " + msg); if (LOG.length > 3000) LOG.splice(1, 500); }

  /* ---------- measurements ---------- */
  const M = {
    coalescedSupported: typeof PointerEvent !== "undefined" && "getCoalescedEvents" in PointerEvent.prototype,
    clock: "unknown",
    bow: { events: 0, samples: 0, touchmoves: 0, evInt: [], smpInt: [], tmInt: [], lastEv: 0, lastSmp: 0, lastTm: 0, fractional: false, minStep: Infinity, lastY: null },
    press: { force: new Set(), rx: new Set(), ry: new Set(), pPressure: new Set(), pW: new Set(), pH: new Set() },
    pitch: { touchstart: 0, pointerdown: 0, tsDuringBow: 0, pdDuringBow: 0, late: 0, unmatched: 0, pending: [] },
    lag: [], cancels: [], lost: [],
  };
  function pushInt(arr, v) { arr.push(v); if (arr.length > 4000) arr.shift(); }
  function stats(arr) {
    if (!arr.length) return "none";
    const a = arr.slice().sort((x, y) => x - y), n = a.length;
    const mean = a.reduce((s, x) => s + x, 0) / n, p = (q) => a[Math.min(n - 1, Math.floor(q * n))];
    return `n=${n} rate≈${(1000 / mean).toFixed(0)}/s median=${p(0.5).toFixed(1)}ms p95=${p(0.95).toFixed(1)}ms max=${a[n - 1].toFixed(0)}ms gaps>34ms=${a.filter((x) => x > 34).length}`;
  }
  function addVal(set, v) { if (v != null && set.size < 60) set.add(Math.round(v * 1000) / 1000); }
  function setDesc(set) { if (!set.size) return "not reported"; const a = [...set].sort((x, y) => x - y); return a.length === 1 ? `constant ${a[0]}` : `${a.length}${a.length >= 60 ? "+" : ""} distinct values, ${a[0]} … ${a[a.length - 1]}`; }
  /* event time on the performance.now() clock */
  function evTime(e) {
    const t = e.timeStamp;
    if (t > 1e12) { M.clock = "epoch (converted)"; return t - performance.timeOrigin; }
    if (M.clock === "unknown") M.clock = "high-res, same clock as performance.now()";
    return t;
  }

  /* ---------- audio ---------- */
  let ctx = null, voice = null, engine = null, silentAudio = null;
  const silentEngine = { setFreq() {}, setBend() {}, setLevel() {}, setCutoff() {}, setNoise() {}, gate() {}, dip() {}, chiff() {} };
  engine = new C.BowEngine(silentEngine, P, () => 0, log);

  function silentWavUrl() {
    const sr = 8000, n = sr, b = new ArrayBuffer(44 + n * 2), d = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true);
    d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }
  function startAudio() {
    try { if (navigator.audioSession) { navigator.audioSession.type = "playback"; log("audioSession.type = playback (" + navigator.audioSession.type + ")"); } else log("navigator.audioSession not available"); } catch (e) { log("audioSession error " + e.message); }
    try { silentAudio = new Audio(silentWavUrl()); silentAudio.loop = true; silentAudio.setAttribute("playsinline", ""); silentAudio.play().then(() => log("silent <audio> loop playing"), (e) => log("silent <audio> refused: " + e.message)); } catch (e) { log("silent audio error " + e.message); }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    ctx.resume();
    voice = C.buildVoice(ctx);
    const counts = engine.counts;
    engine = new C.BowEngine(voice, P, () => ctx.currentTime, log);
    engine.counts = counts;
    log(`AudioContext started: ${ctx.sampleRate} Hz, state ${ctx.state}`);
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(() => log("screen wake lock on"), () => log("screen wake lock refused"));
    setTimeout(logLatency, 1500);
  }
  function audioLatency() {
    if (!ctx) return null;
    const r = { base: ctx.baseLatency, output: ctx.outputLatency };
    if (ctx.getOutputTimestamp) {
      const o = ctx.getOutputTimestamp();
      if (o && o.performanceTime > 0) r.pipe = (ctx.currentTime - o.contextTime) * 1000 + (o.performanceTime - now());
    }
    return r;
  }
  function lagText() {
    const a = audioLatency(), lag = M.lag.slice().sort((x, y) => x - y);
    const mid = lag.length ? lag[Math.floor(lag.length / 2)] : null;
    const f = (x) => (x == null || isNaN(x) ? "n/a" : (x * 1000).toFixed(1) + " ms");
    let s = `input lag (handler time − touch time), pitch taps: ${lag.length ? `median ${mid.toFixed(1)} ms, max ${lag[lag.length - 1].toFixed(1)} ms, n=${lag.length}` : "no taps yet"}\n`;
    if (a) {
      s += `AudioContext baseLatency ${f(a.base)}, outputLatency ${f(a.output)}, getOutputTimestamp lag ${a.pipe != null ? a.pipe.toFixed(1) + " ms" : "n/a"}\n`;
      const audio = a.pipe != null && a.pipe > 0 ? a.pipe : ((a.base || 0) + (a.output || 0)) * 1000;
      s += `estimated tap-to-sound ≈ ${((mid || 0) + audio + 3).toFixed(0)} ms (input lag + audio output + ~3 ms for the 4 ms attack), excluding the screen's own touch scan (~8-16 ms, not measurable from a page)`;
    }
    return s;
  }
  function logLatency() { log("latency: " + lagText().replace(/\n/g, " | ")); }

  /* ---------- layout ---------- */
  const strip = $("strip"), rowsEl = $("rows"), panel = $("panel"), mini = $("mini");
  C.NOTE_NAMES.forEach((n, i) => { const d = document.createElement("div"); d.className = "row"; d.textContent = n + (i === 0 ? "4" : ""); rowsEl.appendChild(d); });
  const rowDivs = [...rowsEl.children];
  let G = {};
  function layout() {
    const W = innerWidth, H = innerHeight;
    const probe = getComputedStyle(document.documentElement);
    const MX = 48, MY = 44;
    const stripW = Math.round(Math.min(120, Math.max(84, W * 0.11)));
    const rowsW = Math.round(Math.min(330, Math.max(200, W * 0.33)));
    const top = MY, h = H - 2 * MY;
    const left = swapped ? W - MX - stripW : MX;
    const rLeft = swapped ? MX : W - MX - rowsW;
    Object.assign(strip.style, { left: left + "px", top: top + "px", width: stripW + "px", height: h + "px" });
    Object.assign(rowsEl.style, { left: rLeft + "px", top: top + "px", width: rowsW + "px", height: h + "px" });
    const cL = Math.min(left, rLeft) + (swapped ? rowsW : stripW) + 12, cR = Math.max(left, rLeft) - 12;
    Object.assign(panel.style, { left: cL + "px", top: "10px", width: cR - cL + "px", height: H - 20 + "px" });
    Object.assign(mini.style, { left: cL + "px", top: "10px", width: cR - cL + "px" });
    Object.assign($("endur").style, { left: cL + "px", width: cR - cL + "px", top: H / 2 - 20 + "px" });
    panel.hidden = panelHidden; mini.hidden = !panelHidden;
    G = { W, H, strip: strip.getBoundingClientRect(), rows: rowsEl.getBoundingClientRect() };
    void probe;
  }
  addEventListener("resize", () => { layout(); log(`viewport ${innerWidth}×${innerHeight}`); });

  /* ---------- panel ---------- */
  const MODES = [["hold", "V1 HOLD"], ["latch", "LATCH"], ["slide", "SLIDE"], ["latchslide", "LATCH+SLIDE"]];
  const modeBtns = MODES.map(([k, label]) => {
    const b = document.createElement("button"); b.textContent = label;
    b.onclick = () => { P.mode = k; engine.set("mode", k); save(); paintModes(); };
    $("modes").appendChild(b); return [k, b];
  });
  function paintModes() { modeBtns.forEach(([k, b]) => b.classList.toggle("sel", P.mode === k)); }
  const SLIDERS = [
    ["Bow → loudness"],
    ["floorDb", "Quietest tone (at 2 px/s)", -60, -15, 1, (v) => v + " dB"],
    ["sMax", "Speed for full volume", 100, 1500, 10, (v) => v + " px/s"],
    ["exp", "Curve (lower = slow bow louder)", 0.4, 2, 0.05, (v) => v.toFixed(2)],
    ["tauMs", "Smoothing", 5, 150, 1, (v) => v + " ms"],
    ["bright", "Brightness follows speed", 0, 1, 0.05, (v) => v.toFixed(2)],
    ["noise", "Bow noise", 0, 0.3, 0.01, (v) => v.toFixed(2)],
    ["Bow changes"],
    ["gapMs", "Bow-change gap", 0, 80, 1, (v) => (v ? v + " ms" : "0 (seamless)")],
    ["chiff", "Attack noise", 0, 0.5, 0.01, (v) => v.toFixed(2)],
    ["Pitch thumb"],
    ["glideMs", "Glide between notes", 0, 60, 1, (v) => v + " ms"],
    ["dwellMs", "Skip rows crossed faster than", 0, 80, 1, (v) => v + " ms"],
    ["rowHystPx", "Row edge hysteresis", 0, 20, 1, (v) => v + " px"],
    ["Speed measurement"],
    ["jitterPx", "Jitter hysteresis", 0, 1.5, 0.05, (v) => v.toFixed(2) + " px"],
    ["minWin", "Shortest speed window", 10, 80, 1, (v) => v + " ms"],
    ["minTravel", "Window needs travel of", 0.3, 4, 0.1, (v) => v.toFixed(1) + " px"],
    ["Experiments"],
    ["pressure", "Pressure: contact size moves brightness and bow noise"],
    ["vibrato", "Sideways wiggle of the bow thumb = vibrato"],
    ["vibDepth", "Vibrato depth", 0, 80, 1, (v) => v + " cents"],
  ];
  const tune = $("tune"), outs = {}, inputs = {};
  let settingLogTimer = null;
  function logSettingSoon(k) { clearTimeout(settingLogTimer); settingLogTimer = setTimeout(() => log(`set ${k} = ${P[k]}`), 600); }
  for (const s of SLIDERS) {
    if (s.length === 1) { const h = document.createElement("h3"); h.textContent = s[0]; tune.appendChild(h); continue; }
    const [k, label, min, max, step, fmt] = s;
    if (s.length === 2) {
      const l = document.createElement("label"); l.className = "tg";
      const c = document.createElement("input"); c.type = "checkbox"; c.id = "t_" + k; c.checked = !!P[k];
      c.onchange = () => { P[k] = c.checked; engine.set(k, c.checked); save(); log(`set ${k} = ${c.checked}`); };
      l.append(c, label); tune.appendChild(l); inputs[k] = c; continue;
    }
    const wrap = document.createElement("label"); wrap.className = "sl";
    const o = document.createElement("output"), r = document.createElement("input");
    r.type = "range"; r.id = "s_" + k; r.min = min; r.max = max; r.step = step; r.value = P[k];
    r.oninput = () => { P[k] = parseFloat(r.value); o.textContent = fmt(P[k]); engine.set(k, P[k]); save(); logSettingSoon(k); };
    o.textContent = fmt(P[k]);
    wrap.append(label, o, r); tune.appendChild(wrap); outs[k] = o; inputs[k] = r;
  }
  const reset = document.createElement("button"); reset.textContent = "Reset to defaults"; reset.style.margin = "8px 0 20px";
  reset.onclick = () => { P = Object.assign({}, C.DEFAULTS); for (const k in P) { engine.set(k, P[k]); const i = inputs[k]; if (!i) continue; if (i.type === "checkbox") i.checked = !!P[k]; else { i.value = P[k]; i.oninput(); } } paintModes(); save(); log("settings reset to defaults"); };
  tune.appendChild(reset);

  $("bSwap").onclick = () => { swapped = !swapped; save(); layout(); log("sides swapped: bow on the " + (swapped ? "right" : "left")); };
  $("bHide").onclick = () => { panelHidden = true; save(); layout(); };
  $("bShow").onclick = () => { panelHidden = false; save(); layout(); };
  $("bLog").onclick = () => { $("logtext").value = report(); $("log").hidden = false; };
  $("bCloseLog").onclick = () => { $("log").hidden = true; };
  $("bCopy").onclick = () => {
    const ta = $("logtext"); ta.value = report();
    const done = (m) => { $("copied").textContent = m; };
    const fallback = () => { ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); let ok = false; try { ok = document.execCommand("copy"); } catch (e) { /* none */ } done(ok ? "Copied" : "Text selected: use the phone's Copy"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => done("Copied"), fallback); else fallback();
  };
  $("bStart").onclick = () => { $("start").hidden = true; startAudio(); };

  /* ---------- 60-second endurance test ---------- */
  let endur = null;
  function snap() { return { t: now(), ev: M.bow.events, smp: M.bow.samples, ivN: M.bow.smpInt.length, cancels: M.cancels.length, lost: M.lost.length, pd: M.pitch.pointerdown, ts: M.pitch.touchstart, late: M.pitch.late, un: M.pitch.unmatched, c: Object.assign({}, engine.counts) }; }
  $("bEnd").onclick = () => {
    if (endur) return;
    endur = snap(); log("60 s test started, mode " + P.mode);
    $("endur").hidden = false;
    const iv = setInterval(() => {
      const left = 60 - (now() - endur.t) / 1000;
      $("endur").textContent = Math.max(0, Math.ceil(left)) + " s";
      if (left <= 0) { clearInterval(iv); $("endur").hidden = true; $("rate").hidden = false; }
    }, 200);
  };
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button"); b.textContent = String(i); b.style.cssText = "font-size:18px;padding:10px 18px";
    b.onclick = () => {
      const e = endur, n = snap(), c = engine.counts;
      const gaps = M.bow.smpInt.slice(e.ivN);
      log(`60 s test done: comfort ${i}/5, mode ${P.mode}, bow samples ${n.smp - e.smp} (${n.ev - e.ev} events), sample gaps: ${stats(gaps)}, ` +
        `cancels ${n.cancels - e.cancels}, lost touches ${n.lost - e.lost}, pitch pointerdowns ${n.pd - e.pd} / touchstarts ${n.ts - e.ts}, late ${n.late - e.late}, unmatched ${n.un - e.un}, ` +
        `reversals ${c.reversal - e.c.reversal}, restarts ${c.restart - e.c.restart}, slurs ${c.slur - e.c.slur}`);
      endur = null; $("rate").hidden = true;
    };
    $("rateBtns").appendChild(b);
  }

  /* ---------- touches ---------- */
  const zones = new Map(); // pointerId -> "bow" | "pitch"
  const inRect = (r, x, y, pad) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  function zoneAt(x, y) { if (inRect(G.strip, x, y, 6)) return "bow"; if (inRect(G.rows, x, y, 4)) return "pitch"; return null; }
  const rowU = (y) => (G.rows.bottom - y) / (G.rows.height / 7);
  const isOverlay = () => !$("start").hidden || !$("log").hidden || !$("rate").hidden;

  document.addEventListener("pointerdown", (e) => {
    if (isOverlay() || e.pointerType === "mouse" && e.button !== 0) return;
    const z = zoneAt(e.clientX, e.clientY);
    if (!z) return;
    e.preventDefault();
    const t = evTime(e);
    zones.set(e.pointerId, z);
    if (z === "bow") {
      if (engine.bowId !== null) { zones.set(e.pointerId, "extra"); return; }
      engine.bowDown(e.pointerId, t, e.clientX, e.clientY);
      M.bow.lastEv = M.bow.lastSmp = t; M.bow.lastY = e.clientY;
    } else {
      M.pitch.pointerdown++;
      const lag = now() - t; if (lag >= 0 && lag < 1000) M.lag.push(lag);
      if (lag > 50) M.pitch.late++;
      if (engine.speed > 5) M.pitch.pdDuringBow++;
      matchTap("pd", t, e.clientX, e.clientY);
      engine.pitchDown(e.pointerId, t, rowU(e.clientY));
    }
  }, { passive: false });

  document.addEventListener("pointermove", (e) => {
    const z = zones.get(e.pointerId);
    if (!z) return;
    e.preventDefault();
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const samples = list.length ? list : [e];
    if (z === "bow") {
      const te = evTime(e); M.bow.events++;
      if (engine.speed > 5) pushInt(M.bow.evInt, te - M.bow.lastEv);
      M.bow.lastEv = te;
      addVal(M.press.pPressure, e.pressure); addVal(M.press.pW, e.width); addVal(M.press.pH, e.height);
      for (const s of samples) {
        const t = evTime(s), y = s.clientY;
        M.bow.samples++;
        if (engine.speed > 5 && t > M.bow.lastSmp) pushInt(M.bow.smpInt, t - M.bow.lastSmp);
        M.bow.lastSmp = Math.max(M.bow.lastSmp, t);
        if (y % 1 !== 0) M.bow.fractional = true;
        if (M.bow.lastY !== null) { const d = Math.abs(y - M.bow.lastY); if (d > 0 && d < M.bow.minStep) M.bow.minStep = d; }
        M.bow.lastY = y;
        const area = P.pressure && touchArea != null ? touchArea : (e.width > 1 ? e.width * e.height : null);
        engine.bowMove(e.pointerId, t, s.clientX, y, area);
      }
    } else if (z === "pitch") {
      const s = samples[samples.length - 1];
      engine.pitchMove(e.pointerId, evTime(s), rowU(s.clientY), G.rows.height / 7);
    }
  }, { passive: false });

  function endPointer(e, cancelled) {
    const z = zones.get(e.pointerId);
    if (!z) return;
    zones.delete(e.pointerId);
    const t = evTime(e);
    if (cancelled) { M.cancels.push(`${ts(t)} pointercancel zone=${z}`); log(`POINTERCANCEL zone=${z}`); }
    if (z === "bow") engine.bowUp(e.pointerId, t);
    else if (z === "pitch") engine.pitchUp(e.pointerId, t);
  }
  document.addEventListener("pointerup", (e) => endPointer(e, false));
  document.addEventListener("pointercancel", (e) => endPointer(e, true));

  /* touch events: only for the measurements (counts, force, contact size, cancels, lost touches) */
  const touchZones = new Map(); let touchArea = null;
  document.addEventListener("touchstart", (e) => {
    if (isOverlay()) return;
    for (const tc of e.changedTouches) {
      const z = zoneAt(tc.clientX, tc.clientY);
      if (!z) continue;
      touchZones.set(tc.identifier, z);
      if (z === "pitch") { M.pitch.touchstart++; if (engine.speed > 5) M.pitch.tsDuringBow++; matchTap("ts", evTime(e), tc.clientX, tc.clientY); }
    }
    if ([...e.changedTouches].some((tc) => touchZones.has(tc.identifier))) e.preventDefault();
    checkLost(e);
  }, { passive: false });
  document.addEventListener("touchmove", (e) => {
    let ours = false;
    for (const tc of e.changedTouches) {
      const z = touchZones.get(tc.identifier);
      if (!z) continue;
      ours = true;
      if (z === "bow") {
        const t = evTime(e); M.bow.touchmoves++;
        if (engine.speed > 5) pushInt(M.bow.tmInt, t - M.bow.lastTm);
        M.bow.lastTm = t;
        addVal(M.press.force, tc.force); addVal(M.press.rx, tc.radiusX); addVal(M.press.ry, tc.radiusY);
        if (tc.radiusX > 0) touchArea = tc.radiusX * (tc.radiusY || tc.radiusX);
      }
    }
    if (ours) e.preventDefault();
    checkLost(e);
  }, { passive: false });
  function touchEnd(e, cancelled) {
    for (const tc of e.changedTouches) {
      const z = touchZones.get(tc.identifier);
      if (!z) continue;
      touchZones.delete(tc.identifier);
      if (cancelled) { M.cancels.push(`${ts(evTime(e))} touchcancel zone=${z}`); log(`TOUCHCANCEL zone=${z}`); }
    }
  }
  document.addEventListener("touchend", (e) => touchEnd(e, false));
  document.addEventListener("touchcancel", (e) => touchEnd(e, true));
  function checkLost(e) {
    const live = new Set([...e.touches].map((tc) => tc.identifier));
    for (const [id, z] of touchZones) if (!live.has(id)) { touchZones.delete(id); M.lost.push(`${ts(now())} lost touch zone=${z}`); log(`LOST TOUCH zone=${z} (vanished without touchend)`); }
  }
  /* pair touchstart and pointerdown for the same tap */
  function matchTap(kind, t, x, y) {
    const other = kind === "pd" ? "ts" : "pd";
    const q = M.pitch.pending;
    const i = q.findIndex((p) => p.kind === other && Math.abs(p.t - t) < 100 && Math.hypot(p.x - x, p.y - y) < 30);
    if (i >= 0) q.splice(i, 1); else q.push({ kind, t, x, y });
    while (q.length && now() - q[0].t > 300) { q.shift(); M.pitch.unmatched++; }
  }
  setInterval(() => { const q = M.pitch.pending; while (q.length && now() - q[0].t > 300) { const p = q.shift(); M.pitch.unmatched++; log(`unmatched ${p.kind === "pd" ? "pointerdown" : "touchstart"} on pitch rows`); } }, 500);
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => { if (e.target.id !== "logtext") e.preventDefault(); });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

  /* ---------- report ---------- */
  function report() {
    const b = M.bow, pr = M.press, pi = M.pitch;
    const out = [];
    out.push("BOW TEST 2 LOG  " + new Date().toISOString());
    out.push(`viewport ${innerWidth}×${innerHeight}, devicePixelRatio ${devicePixelRatio}, ${navigator.userAgent}`);
    out.push(`standalone (home screen): ${!!navigator.standalone || matchMedia("(display-mode: standalone)").matches}; in a frame: ${window.top !== window}`);
    out.push(`mode ${P.mode}; settings ${JSON.stringify(P)}`);
    out.push("");
    out.push(`bow thumb, Safari coalesced events supported: ${M.coalescedSupported ? "yes" : "no"}; event clock: ${M.clock}`);
    out.push(`  pointermove events while bowing: ${stats(b.evInt)}`);
    out.push(`  samples incl. coalesced:        ${stats(b.smpInt)}  (${b.samples} samples from ${b.events} events)`);
    out.push(`  touchmove events:               ${stats(b.tmInt)}`);
    out.push(`  coordinates fractional: ${b.fractional ? "yes" : "no"}; smallest step seen ${isFinite(b.minStep) ? b.minStep.toFixed(3) + " px" : "n/a"}`);
    out.push(`pressure/contact: touch.force ${setDesc(pr.force)}; radiusX ${setDesc(pr.rx)}; radiusY ${setDesc(pr.ry)}; pointer pressure ${setDesc(pr.pPressure)}; pointer width ${setDesc(pr.pW)}; height ${setDesc(pr.pH)}`);
    out.push(`pitch taps: touchstart ${pi.touchstart}, pointerdown ${pi.pointerdown}; while bowing: touchstart ${pi.tsDuringBow}, pointerdown ${pi.pdDuringBow}; late (>50 ms) ${pi.late}; unmatched ${pi.unmatched}`);
    out.push(`articulation counts: ${JSON.stringify(engine.counts)}`);
    out.push(lagText());
    out.push(`cancels: ${M.cancels.length ? M.cancels.join("; ") : "none"}; lost touches: ${M.lost.length ? M.lost.join("; ") : "none"}`);
    out.push("");
    out.push("EVENTS");
    return out.concat(LOG).join("\n");
  }

  /* ---------- frame loop ---------- */
  let lastRd = 0, lastRow = -2, lastState = "";
  function frame() {
    const t = now();
    engine.tick(t);
    const mark = $("bowmark"), glow = $("bowglow");
    if (engine.bowId !== null && M.bow.lastY != null) {
      mark.style.top = (M.bow.lastY - G.strip.top) + "px";
      mark.style.opacity = String(0.35 + 0.65 * engine.norm);
      glow.style.opacity = String(engine.gain > 0.001 ? 0.25 + 0.75 * engine.norm : 0);
    } else { mark.style.opacity = "0"; glow.style.opacity = "0"; }
    const fingerDown = engine.pitchPtrs.size > 0;
    let cand = -1; for (const pp of engine.pitchPtrs.values()) if (pp.sel.cand >= 0) cand = pp.sel.cand;
    const st = engine.row + "|" + fingerDown + "|" + engine.gateOpen + "|" + cand;
    if (st !== lastState) {
      lastState = st;
      rowDivs.forEach((d, i) => { d.classList.toggle("on", i === engine.row && fingerDown); d.classList.toggle("latched", i === engine.row && !fingerDown && engine.gateOpen); d.classList.toggle("cand", i === cand); });
    }
    if (t - lastRd > 100) {
      lastRd = t;
      const db = C.ampToDb(engine.gain);
      const ev = M.bow.evInt.slice(-30), rate = ev.length ? (1000 / (ev.reduce((s, x) => s + x, 0) / ev.length)).toFixed(0) : "–";
      $("readout").innerHTML = `speed <b>${engine.speed.toFixed(1).padStart(6)}</b> px/s  gain <b>${isFinite(db) ? db.toFixed(1).padStart(5) : "  -∞ "}</b> dB\n` +
        `note <b>${engine.row >= 0 ? C.NOTE_NAMES[engine.row] : "–"}</b>  bow ev <b>${rate}</b>/s  ${innerWidth}×${innerHeight}` +
        `<div id="meter"><i style="width:${(engine.norm * 100).toFixed(1)}%"></i></div>`;
      $("minird").textContent = `${engine.speed.toFixed(1)} px/s  ${isFinite(db) ? db.toFixed(1) : "-∞"} dB  ${innerWidth}×${innerHeight}`;
      if (engine.row !== lastRow) lastRow = engine.row;
    }
    requestAnimationFrame(frame);
  }

  layout(); paintModes();
  log(`page loaded; viewport ${innerWidth}×${innerHeight}; coalesced events ${M.coalescedSupported ? "supported" : "not supported"}; mode ${P.mode}`);
  requestAnimationFrame(frame);
  window.__bow = { engine: () => engine, M, report, P: () => P, layout: () => G, ctx: () => ctx };
})();
