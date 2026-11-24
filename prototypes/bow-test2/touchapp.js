/* The start screen, and the touch-area mode's page: layout, input wiring (raw input -> TouchGest ->
   events -> TouchSound), the diagnostics probe, motion sensors, loop controls, the CSV box. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const G = window.TouchGest, S = window.TouchSound, SH = window.Shared;
  const now = () => performance.now();
  const inFrame = (() => { try { return window.top !== window; } catch (e) { return true; } })();

  /* ---------- modes ---------- */
  window.__mode = "home";
  function show(mode) {
    window.__mode = mode;
    $("home").hidden = mode !== "home"; $("bowedMode").hidden = mode !== "bowed"; $("touchMode").hidden = mode !== "touch";
    if (mode === "bowed" && window.__bowedEnter) window.__bowedEnter();
    if (mode === "touch") enterTouch();
  }
  window.__home = () => { if (window.__mode === "touch") leaveTouch(); show("home"); };
  $("goBowed").onclick = () => show("bowed");
  $("goTouch").onclick = () => {
    ctx = SH.unlockAudio(tlog); // sound first; the permission prompt below may pause it (resumed on the next tap)
    requestSensors(); // must run inside this tap (iOS asks for motion permission only from a user gesture)
    show("touch");
  };

  /* ---------- settings ---------- */
  const T_DEFAULTS = { tonic: 2, minor: false, octaves: 2, mid: 62, loopOn: false, bpm: 84, loopLevel: 0.5,
    contactOn: false, decideMs: 0, ctDb: 4, ctBright: 0.6, ctTau: 80,
    tiltOn: false, leanMode: "octave", rollMode: "off", centreDeg: 45, spanDeg: 45, deadDeg: 3, octStep1: 0.5, octStep2: 1.25, octHystDeg: 4,
    breathBright: 500, leanBright: 1, bendRange: 2, vibMax: 50, rollFullDeg: 30, tiltTau: 120, invLean: false, invRoll: false };
  let T = Object.assign({}, T_DEFAULTS);
  try { Object.assign(T, JSON.parse(localStorage.getItem("touchtest") || "{}")); } catch (e) { /* none */ }
  T.loopOn = false;
  const save = () => { try { localStorage.setItem("touchtest", JSON.stringify(T)); } catch (e) { /* none */ } };
  let ROWS = [];
  const computeRows = () => { ROWS = G.freeRows(T.tonic, T.minor, T.mid, T.octaves); };
  computeRows();

  /* ---------- layers ---------- */
  let ctx = null, sound = null;
  const TLOG = [];
  function tlog(m) { TLOG.push(((now()) / 1000).toFixed(3) + "  " + m); if (TLOG.length > 500) TLOG.shift(); }
  const active = new Map(); // gesture id -> row, for drawing
  /* ---------- contact-size calibration (kept on this device) ---------- */
  let CAL = { samples: { left: { tip: [], normal: [], flat: [] }, right: { tip: [], normal: [], flat: [] } }, savedAt: null };
  try { const c = JSON.parse(localStorage.getItem("touchcal") || "null"); if (c && c.samples) CAL = c; } catch (e) { /* none */ }
  let FIT = { left: null, right: null }, RANGE = {};
  function refit() {
    for (const side of ["left", "right"]) {
      const by = {}; for (const c of G.CLASSES) by[c] = CAL.samples[side][c].map((q) => G.sizeAt(q, T.decideMs)).filter((v) => v != null);
      FIT[side] = G.fitThresholds(by);
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      RANGE[side] = FIT[side] ? [mean(by.tip), mean(by.flat)] : [24, 194];
    }
  }
  refit();
  const gopts = () => ({ contactOn: T.contactOn, decideMs: T.decideMs, cal: FIT, sizeRange: RANGE });
  const onEvent = (ev) => {
    if (ev.type === "onset" || ev.type === "pitch") active.set(ev.id, { row: ev.row, side: ev.side || (active.get(ev.id) || {}).side });
    if (ev.type === "release") active.delete(ev.id);
    if (ev.type === "onset") { lastOnset = ev; SH.csv.add({ mode: "touch", event: "onset", id: ev.id, zone: ev.side, width: ev.size, note: (ev.cls || "") + " " + G.noteName(ev.midi) }); }
    if (sound) sound.handle(ev);
    if (ev.type !== "tilt") lastEv = ev;
  };
  const gest = new G.TouchGestures(() => ({ left: rect.left, right: rect.right }), () => ROWS, onEvent, gopts);
  const tilt = new G.TiltReader(onEvent);
  let lastEv = null, lastOnset = null;
  function onMotion(e) {
    if (!T.tiltOn || window.__mode !== "touch") return;
    const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
    tilt.feed(now(), g.x, g.y, g.z, T);
  }

  /* ---------- layout ---------- */
  const rect = { left: null, right: null };
  function layout() {
    const W = innerWidth, H = innerHeight, MX = 48, MY = 44;
    const aw = Math.round(Math.min(280, Math.max(160, W * 0.3))), h = H - 2 * MY;
    Object.assign($("tL").style, { left: MX + "px", top: MY + "px", width: aw + "px", height: h + "px" });
    Object.assign($("tR").style, { left: W - MX - aw + "px", top: MY + "px", width: aw + "px", height: h + "px" });
    Object.assign($("tPanel").style, { left: MX + aw + 10 + "px", width: W - 2 * MX - 2 * aw - 20 + "px", top: "8px", height: H - 16 + "px" });
    Object.assign($("calPanel").style, { left: MX + aw + 10 + "px", width: W - 2 * MX - 2 * aw - 20 + "px", top: MY + "px" });
    rect.left = $("tL").getBoundingClientRect(); rect.right = $("tR").getBoundingClientRect();
    for (const side of ["L", "R"]) {
      const el = $("t" + side), r = side === "L" ? rect.left : rect.right;
      el.innerHTML = "";
      ROWS.forEach((m, i) => {
        const d = document.createElement("div"); d.className = "trow" + (G.NAMES[m % 12] === G.NAMES[T.tonic] ? " tonic" : "");
        const rh = G.rowH(ROWS.length, r.height);
        Object.assign(d.style, { top: G.rowMid(ROWS.length, i, r.height) - rh / 2 + "px", height: rh + "px" });
        d.textContent = G.noteName(m); d.dataset.row = i; el.appendChild(d);
      });
    }
  }
  addEventListener("resize", () => { if (window.__mode === "touch") layout(); });

  /* ---------- controls ---------- */
  const KEYS = G.NAMES.map((n, i) => [i, n]);
  $("tKey").innerHTML = KEYS.map(([i, n]) => `<option value="${i}">${n}</option>`).join("");
  $("tKey").value = T.tonic; $("tMinor").value = T.minor ? "1" : "0"; $("tOct").value = T.octaves;
  const remap = () => {
    T.tonic = +$("tKey").value; T.minor = $("tMinor").value === "1"; T.octaves = +$("tOct").value;
    T.mid = 60 + T.tonic; // the rows centred on the tonic nearest middle C (the game centres them on a voice's range)
    computeRows(); save(); layout(); tlog(`rows: ${ROWS.map(G.noteName).join(" ")}`);
    if (sound) sound.setLoop(T.bpm, T.mid, T.loopLevel);
  };
  $("tKey").onchange = $("tMinor").onchange = $("tOct").onchange = remap;
  const slider = (id, key, fmt) => { const r = $(id), o = $(id + "o"); r.value = T[key]; o.textContent = fmt(T[key]); r.oninput = () => { T[key] = +r.value; o.textContent = fmt(T[key]); save(); if (sound) sound.setLoop(T.bpm, T.mid, T.loopLevel); }; };
  slider("tBpm", "bpm", (v) => v + " ♩/min"); slider("tLvl", "loopLevel", (v) => v.toFixed(2));
  $("tLoop").onclick = () => {
    T.loopOn = !T.loopOn; $("tLoop").textContent = "Loop: " + (T.loopOn ? "on" : "off"); $("tLoop").classList.toggle("sel", T.loopOn);
    if (!sound) return;
    if (T.loopOn) sound.startLoop(T.bpm, T.mid, T.loopLevel); else sound.stopLoop();
  };
  $("tMenu").onclick = () => window.__home();
  $("tDiag").onclick = () => { $("diag").hidden = !$("diag").hidden; };
  $("tCsv").onclick = () => {
    if (!SH.csv.on) { SH.csv.start(); $("tCsv").textContent = "Stop CSV"; $("tCsv").classList.add("sel"); return; }
    SH.csv.stop(); $("tCsv").textContent = "Record CSV"; $("tCsv").classList.remove("sel"); window.__showCsv("touch");
  };

  function enterTouch() {
    layout();
    if (!sound && ctx) { sound = new S.TouchSound(ctx); Object.assign(sound.P, { ctDb: T.ctDb, ctBright: T.ctBright, ctTau: T.ctTau }); }
    if (ctx && ctx.state !== "running") ctx.resume();
    if (T.loopOn && sound) sound.startLoop(T.bpm, T.mid, T.loopLevel);
  }
  function leaveTouch() { gest.releaseAll(now()); if (sound) { sound.silence(); sound.stopLoop(); } }

  /* ---------- CSV box (both modes) ---------- */
  window.__showCsv = (mode) => {
    $("csvText").value = SH.csv.text(); $("csvMsg").textContent = `${SH.csv.rows.length} rows`;
    $("csvBox").hidden = false; $("csvBox").dataset.mode = mode;
  };
  $("csvSave").onclick = async () => { $("csvMsg").textContent = await SH.csv.save(`input-${$("csvBox").dataset.mode}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`); };
  $("csvCopy").onclick = () => SH.copyText($("csvText"), (m) => { $("csvMsg").textContent = m; });
  $("csvClose").onclick = () => { $("csvBox").hidden = true; };

  /* ---------- the probe: what this browser reports ---------- */
  const FIELDS = ["radiusX", "radiusY", "rotationAngle", "force", "webkitForce", "webkitRadiusX", "webkitRadiusY", "touchType", "altitudeAngle"];
  const PFIELDS = ["pointerType", "width", "height", "pressure", "tangentialPressure", "tiltX", "tiltY", "twist"];
  const stat = {}; // field -> {min, max, vals:Set, n, undef}
  function note(key, v) {
    const s = stat[key] || (stat[key] = { min: Infinity, max: -Infinity, vals: new Set(), n: 0, undef: 0 });
    if (v === undefined) { s.undef++; return; }
    s.n++; if (typeof v === "number") { s.min = Math.min(s.min, v); s.max = Math.max(s.max, v); }
    if (s.vals.size < 200) s.vals.add(typeof v === "number" ? Math.round(v * 1000) / 1000 : v);
  }
  const liveTouch = new Map(), livePointer = new Map();
  const sens = { status: "not requested", ori: null, mot: null, nOri: 0, nMot: 0, t0: 0 };

  function requestSensors() {
    sens.t0 = now();
    if (!window.isSecureContext) { sens.status = "page is not HTTPS: sensors blocked"; return; }
    const attach = () => {
      addEventListener("deviceorientation", (e) => { sens.nOri++; sens.ori = e; SH.csv.add({ mode: "touch", event: "orientation", alpha: e.alpha, beta: e.beta, gamma: e.gamma }); });
      addEventListener("devicemotion", (e) => { sens.nMot++; sens.mot = e; onMotion(e); const a = e.accelerationIncludingGravity || {}, r = e.rotationRate || {}; SH.csv.add({ mode: "touch", event: "motion", accX: a.x, accY: a.y, accZ: a.z, rotA: r.alpha, rotB: r.beta, rotG: r.gamma }); });
    };
    const DOE = window.DeviceOrientationEvent, DME = window.DeviceMotionEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      sens.status = "asking…";
      const p1 = DOE.requestPermission(), p2 = DME && typeof DME.requestPermission === "function" ? DME.requestPermission() : Promise.resolve("n/a");
      Promise.all([p1, p2]).then(([a, b]) => { sens.status = `permission: orientation ${a}, motion ${b}`; if (a === "granted" || b === "granted") attach(); },
        (e) => { sens.status = "permission request failed: " + (e && e.message || e) + (inFrame ? " (inside the claude.ai frame, motion is blocked)" : ""); });
    } else { sens.status = DOE ? "no permission needed (not iOS?)" : "DeviceOrientationEvent missing"; attach(); }
  }

  /* ---------- raw input ---------- */
  const onTouchMode = () => window.__mode === "touch" && $("csvBox").hidden && $("tSet").hidden;
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button,select,input,textarea,label"));
  const inArea = (x, y) => gest.sideAt(x, y) !== null;
  document.addEventListener("pointerdown", (e) => {
    if (!onTouchMode() || onControl(e) || !inArea(e.clientX, e.clientY)) return;
    e.preventDefault();
    const t = SH.evTime(e);
    livePointer.set(e.pointerId, e); PFIELDS.forEach((k) => note("pointer." + k, e[k]));
    SH.csv.add({ t_ms: t, mode: "touch", event: "pointerdown", id: e.pointerId, zone: gest.sideAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY, pressure: e.pressure, width: e.width, height: e.height });
    if (calib) { calDown(e, t); return; }
    gest.down(e.pointerId, t, e.clientX, e.clientY, contactOf(e));
  }, { passive: false });
  document.addEventListener("pointermove", (e) => {
    if (calib && calRec && calRec.id === e.pointerId) { e.preventDefault(); const dt = SH.evTime(e) - calRec.t0; if (dt <= 400 && e.width > 1) calRec.seq.push([dt, e.width]); return; }
    if (!gest.held.has(e.pointerId)) return;
    e.preventDefault();
    const t = SH.evTime(e);
    livePointer.set(e.pointerId, e); PFIELDS.forEach((k) => note("pointer." + k, e[k]));
    SH.csv.add({ t_ms: t, mode: "touch", event: "pointermove", id: e.pointerId, zone: gest.held.get(e.pointerId).side, x: e.clientX, y: e.clientY, pressure: e.pressure, width: e.width, height: e.height });
    gest.move(e.pointerId, t, e.clientX, e.clientY, contactOf(e));
  }, { passive: false });
  const pend = (e) => {
    livePointer.delete(e.pointerId);
    if (calib && calRec && calRec.id === e.pointerId) { calUp(); return; }
    if (!gest.held.has(e.pointerId)) return;
    SH.csv.add({ t_ms: SH.evTime(e), mode: "touch", event: e.type, id: e.pointerId, x: e.clientX, y: e.clientY });
    gest.up(e.pointerId, SH.evTime(e));
  };
  document.addEventListener("pointerup", pend); document.addEventListener("pointercancel", pend);

  /* touch events: the contact data (radius, force) live only here */
  function onTouch(e) {
    if (!onTouchMode() || onControl(e)) return;
    let ours = false;
    for (const tc of e.changedTouches) {
      if (e.type === "touchend" || e.type === "touchcancel") { liveTouch.delete(tc.identifier); continue; }
      if (e.type === "touchstart" && !inArea(tc.clientX, tc.clientY) && !liveTouch.has(tc.identifier)) continue;
      ours = true;
      const p = SH.touchProps(tc); p.x = tc.clientX; p.y = tc.clientY;
      liveTouch.set(tc.identifier, p); FIELDS.forEach((k) => note("touch." + k, p[k]));
      SH.csv.add({ t_ms: SH.evTime(e), mode: "touch", event: e.type, id: tc.identifier, x: tc.clientX, y: tc.clientY, radiusX: p.radiusX, radiusY: p.radiusY, force: p.force, webkitForce: p.webkitForce });
    }
    if (ours && e.cancelable) e.preventDefault();
  }
  ["touchstart", "touchmove", "touchend", "touchcancel"].forEach((k) => document.addEventListener(k, onTouch, { passive: false }));
  /* the latest Touch near a point (pointer and touch ids differ in Safari) */
  function contactOf(e) { return Object.assign({}, touchFor(e.clientX, e.clientY) || {}, { width: e.width, height: e.height }); }
  function touchFor(x, y) { let best = null, bd = 60; for (const p of liveTouch.values()) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best; }

  /* ---------- calibration: 10 taps per class, per area ---------- */
  const STEPS = [];
  for (const side of ["left", "right"]) for (const c of G.CLASSES) STEPS.push({ side, c });
  const CNAME = { tip: "FINGERTIP", normal: "NORMAL THUMB", flat: "FLAT THUMB PAD" };
  let calib = null, calRec = null;
  function calStart() {
    calib = { step: 0, taps: STEPS.map(() => []) };
    $("tSet").hidden = true; $("tPanel").hidden = true; $("calPanel").hidden = false; gest.releaseAll(now()); if (sound) sound.silence();
    calPaint();
  }
  function calPaint() {
    const st = STEPS[calib.step], n = calib.taps[calib.step].length;
    $("calStep").textContent = `Step ${calib.step + 1} of 6`;
    $("calWhat").textContent = `${st.side === "left" ? "LEFT" : "RIGHT"} area\n${CNAME[st.c]}`;
    $("calCount").textContent = `${n} / 10 taps` + (calRec ? "" : "");
    $("tL").classList.toggle("target", st.side === "left"); $("tR").classList.toggle("target", st.side === "right");
  }
  function calDown(e, t) {
    const st = STEPS[calib.step];
    if (gest.sideAt(e.clientX, e.clientY) !== st.side || calRec) return;
    calRec = { id: e.pointerId, t0: t, seq: e.width > 1 ? [[0, e.width]] : [] };
    $("calLast").textContent = "";
  }
  function calUp() {
    const rec = calRec; calRec = null;
    if (!rec.seq.length) { $("calLast").textContent = "no size reported: tap again"; return; }
    calib.taps[calib.step].push(rec.seq);
    $("calLast").textContent = `last tap: ${rec.seq.map((q) => q[1].toFixed(0)).join("→")} px`;
    if (calib.taps[calib.step].length >= 10) {
      if (calib.step < STEPS.length - 1) calib.step++;
      else return calFinish();
    }
    calPaint();
  }
  function calFinish() {
    STEPS.forEach((st, i) => { CAL.samples[st.side][st.c] = calib.taps[i]; });
    CAL.savedAt = new Date().toISOString();
    try { localStorage.setItem("touchcal", JSON.stringify(CAL)); } catch (e) { /* none */ }
    calEnd(); refit(); T.contactOn = true; $("s_contactOn").checked = true; save();
    tlog("calibration saved"); openSettings();
  }
  function calEnd() { calib = null; calRec = null; $("calPanel").hidden = true; $("tPanel").hidden = false; $("tL").classList.remove("target"); $("tR").classList.remove("target"); }
  $("calRedo").onclick = () => { calib.taps[calib.step] = []; calPaint(); };
  $("calBack").onclick = () => { if (calib.step > 0) { calib.taps[calib.step] = []; calib.step--; calib.taps[calib.step] = []; } calPaint(); };
  $("calCancel").onclick = () => calEnd();

  function calText() {
    const L = [];
    if (!CAL.savedAt) return "Not calibrated yet. Tap Calibrate.";
    L.push(`Calibration of ${CAL.savedAt.slice(0, 16).replace("T", " ")}; class decided from the largest size within ${T.decideMs} ms of landing.`);
    for (const side of ["left", "right"]) {
      const f = FIT[side];
      L.push("", `${side.toUpperCase()} AREA`);
      if (!f) { L.push("  incomplete"); continue; }
      L.push(`  cut points: fingertip < ${f.t1.toFixed(1)} px ≤ normal < ${f.t2.toFixed(1)} px ≤ flat`);
      L.push(`  misclassified ${f.errors} of ${f.n} taps (${(f.errorRate * 100).toFixed(0)}%)`);
      L.push(`  taps inside the neighbouring class's size range: fingertip/normal ${f.overlapTipNormal}, normal/flat ${f.overlapNormalFlat}`);
      L.push("  size px   tip normal flat");
      for (const [v, a, b, c] of f.hist) L.push(`  ${v.toFixed(1).padStart(6)}   ${String(a).padStart(3)} ${String(b).padStart(6)} ${String(c).padStart(4)}`);
      L.push("  heard as →  tip normal flat");
      for (const c of G.CLASSES) { const r = f.confusion[c]; L.push(`  ${c.padEnd(7)}     ${String(r.tip).padStart(3)} ${String(r.normal).padStart(6)} ${String(r.flat).padStart(4)}`); }
      const st = G.CLASSES.flatMap((c) => CAL.samples[side][c].map((q) => G.stableAfter(f, q)));
      if (st.length) L.push(`  class settled after (calibration taps): average ${(st.reduce((a, b) => a + b, 0) / st.length).toFixed(0)} ms, worst ${Math.max(...st).toFixed(0)} ms`);
    }
    const live = gest.stable;
    L.push("", live.length ? `Live notes (last ${live.length}): class settled after average ${(live.reduce((a, b) => a + b, 0) / live.length).toFixed(0)} ms, worst ${Math.max(...live).toFixed(0)} ms` : "Live notes: none yet");
    return L.join("\n");
  }

  /* ---------- settings overlay ---------- */
  const SET = [
    ["Contact size"],
    ["contactOn", "Contact size on (class sets the sound; size moves held notes)"],
    ["decideMs", "Decision delay (wait before sounding)", 0, 120, 1, (v) => v + " ms"],
    ["ctDb", "Held note: loudness range", 0, 12, 0.5, (v) => "±" + v + " dB"],
    ["ctBright", "Held note: brightness range", 0, 1.5, 0.05, (v) => "±" + v.toFixed(2) + " oct"],
    ["ctTau", "Held note: smoothing", 10, 400, 5, (v) => v + " ms"],
    ["Tilt"],
    ["tiltOn", "Tilt on"],
    ["leanMode", "Lean (tipping toward / away) controls", ["octave", "brightness", "bend", "off"]],
    ["centreDeg", "Centre: lean that sounds normal", 20, 70, 1, (v) => v + "° (0° flat, 90° upright)"],
    ["spanDeg", "Lean for one full step (centre → flat / upright)", 20, 60, 1, (v) => v + "°"],
    ["octStep1", "Octave: first step at", 0.25, 0.95, 0.05, (v) => `${(v * 100).toFixed(0)}% of the way: ${(T.centreDeg - v * T.spanDeg).toFixed(0)}° / ${(T.centreDeg + v * T.spanDeg).toFixed(0)}°`],
    ["octStep2", "Octave: second step at", 1, 1.5, 0.05, (v) => `${(v * 100).toFixed(0)}%: ${(T.centreDeg - v * T.spanDeg).toFixed(0)}° / ${(T.centreDeg + v * T.spanDeg).toFixed(0)}°`],
    ["octHystDeg", "Octave: hysteresis", 0, 10, 0.5, (v) => v + "°"],
    ["breathBright", "Octave: brightness within a step (breath)", 0, 1200, 25, (v) => "±" + Math.round(v / 2) + " cents"],
    ["leanBright", "Brightness at full lean", 0, 2, 0.05, (v) => "±" + v.toFixed(2) + " oct"],
    ["deadDeg", "Dead zone round the centre", 0, 15, 0.5, (v) => v + "°"],
    ["rollMode", "Roll (steering wheel) controls", ["off", "bend", "vibrato"]],
    ["bendRange", "Bend at full lean / roll", 0.5, 12, 0.5, (v) => "±" + v + " semitones"],
    ["vibMax", "Vibrato depth at full roll", 0, 100, 1, (v) => v + " cents"],
    ["rollFullDeg", "Roll for full effect", 10, 60, 1, (v) => v + "°"],
    ["tiltTau", "Tilt smoothing", 10, 500, 5, (v) => v + " ms"],
    ["invLean", "Invert lean"],
    ["invRoll", "Invert roll"],
  ];
  const setInputs = {};
  function applyT(k) {
    save();
    if (sound) Object.assign(sound.P, { ctDb: T.ctDb, ctBright: T.ctBright, ctTau: T.ctTau });
    if (k === "decideMs") { refit(); $("calRes").textContent = calText(); }
    if (k === "contactOn") $("calRes").textContent = calText();
    if (k === "centreDeg" || k === "spanDeg") for (const q of ["octStep1", "octStep2"]) { const i = setInputs[q]; if (i) i.previousSibling.textContent = SET.find((d) => d[0] === q)[5](T[q]); }
    if (k === "tiltOn") { $("tNeutral").hidden = !T.tiltOn; if (!T.tiltOn && sound) sound.resetTilt(); }
    tlog(`set ${k} = ${T[k]}`);
  }
  for (const d of SET) {
    const box = $("setBody");
    if (d.length === 1) { const h = document.createElement("h3"); h.textContent = d[0]; box.appendChild(h); if (d[0] === "Contact size") { const b = document.createElement("div"); b.className = "bar"; b.innerHTML = '<button id="calGo">Calibrate…</button><button id="calClear">Forget calibration</button>'; box.appendChild(b); } if (d[0] === "Tilt") { const b = document.createElement("div"); b.className = "bar"; b.innerHTML = '<button id="setNeutral">Set neutral</button><span id="tiltRd" class="rd"></span>'; box.appendChild(b); } continue; }
    const [k, label] = d;
    if (d.length === 2) { const l = document.createElement("label"); l.className = "tg"; const c = document.createElement("input"); c.type = "checkbox"; c.id = "s_" + k; c.checked = !!T[k]; c.onchange = () => { T[k] = c.checked; applyT(k); }; l.append(c, label); box.appendChild(l); setInputs[k] = c; continue; }
    if (d.length === 3) { const l = document.createElement("label"); l.className = "tg"; const sel = document.createElement("select"); sel.id = "s_" + k; sel.innerHTML = d[2].map((o) => `<option>${o}</option>`).join(""); sel.value = T[k]; sel.onchange = () => { T[k] = sel.value; applyT(k); }; l.append(label + " ", sel); box.appendChild(l); setInputs[k] = sel; continue; }
    const [, , min, max, step, fmt] = d;
    const w = document.createElement("label"); w.className = "sl"; const o = document.createElement("output"), r = document.createElement("input");
    r.type = "range"; r.id = "s_" + k; r.min = min; r.max = max; r.step = step; r.value = T[k]; o.textContent = fmt(T[k]);
    r.oninput = () => { T[k] = parseFloat(r.value); o.textContent = fmt(T[k]); applyT(k); };
    w.append(label, o, r); box.appendChild(w); setInputs[k] = r;
  }
  const resetB = document.createElement("button"); resetB.textContent = "Reset settings"; resetB.onclick = () => { const keep = { tonic: T.tonic, minor: T.minor, octaves: T.octaves, mid: T.mid, bpm: T.bpm, loopLevel: T.loopLevel, loopOn: T.loopOn }; T = Object.assign({}, T_DEFAULTS, keep); for (const k in setInputs) { const i = setInputs[k]; if (i.type === "checkbox") i.checked = !!T[k]; else { i.value = T[k]; if (i.oninput) i.oninput(); } } applyT("tiltOn"); refit(); }; $("setBody").appendChild(resetB);
  function openSettings() { $("calRes").textContent = calText(); $("tSet").hidden = false; }
  $("tSettings").onclick = openSettings;
  $("setClose").onclick = () => { $("tSet").hidden = true; };
  $("calCopy").onclick = () => {
    const ta = $("calSel");
    ta.value = calText() + "\n\nRAW CALIBRATION (size px per tap, by area and kind; each tap: sizes seen in its first 400 ms)\n" +
      ["left", "right"].map((side) => G.CLASSES.map((c) => `${side} ${c}: ` + CAL.samples[side][c].map((q) => q.map((x) => x[1].toFixed(0)).join(">")).join("  ")).join("\n")).join("\n");
    ta.hidden = false;
    SH.copyText(ta, (m) => { $("calCopyMsg").textContent = m + ": paste it to Claude"; });
  };
  $("calGo").onclick = calStart;
  $("calClear").onclick = () => { CAL = { samples: { left: { tip: [], normal: [], flat: [] }, right: { tip: [], normal: [], flat: [] } }, savedAt: null }; try { localStorage.removeItem("touchcal"); } catch (e) { /* none */ } refit(); $("calRes").textContent = calText(); };
  $("setNeutral").onclick = $("tNeutral").onclick = () => {
    const n = tilt.setNeutral(); if (!n) return;
    T.centreDeg = Math.max(20, Math.min(70, Math.round(n.lean)));
    const r = setInputs.centreDeg; if (r) { r.value = T.centreDeg; r.oninput(); }
    tlog("tilt neutral: centre " + T.centreDeg + "°, roll zeroed");
  };
  $("tNeutral").hidden = !T.tiltOn;

  /* ---------- diagnostics text ---------- */
  const f = (v, d = 2) => (v === undefined ? "—" : v === null ? "null" : typeof v === "number" ? v.toFixed(d) : String(v));
  function verdict(key) {
    const s = stat[key];
    if (!s) return "not seen yet";
    if (!s.n) return "NOT EXPOSED (undefined)";
    const vals = [...s.vals];
    if (vals.length === 1) return `CONSTANT ${vals[0]} (n=${s.n})`;
    return `varies: ${vals.length}${vals.length >= 200 ? "+" : ""} distinct, ${f(s.min, 3)} … ${f(s.max, 3)} (n=${s.n})${vals.length <= 12 ? " values: " + vals.sort((a, b) => a - b).join(" ") : ""}`;
  }
  function probeReport() {
    const L = [];
    L.push(`PROBE  ${new Date().toISOString()}  ${navigator.userAgent}`);
    L.push(`viewport ${innerWidth}×${innerHeight}, dpr ${devicePixelRatio}, HTTPS ${window.isSecureContext}, inside a frame ${inFrame}`);
    L.push("");
    L.push("LIVE TOUCHES (touch events)");
    if (!liveTouch.size) L.push("  none down");
    for (const [id, p] of liveTouch) L.push(`  #${id}: radiusX ${f(p.radiusX)} radiusY ${f(p.radiusY)} force ${f(p.force, 3)} webkitForce ${f(p.webkitForce, 3)} webkitRadiusX ${f(p.webkitRadiusX)} rot ${f(p.rotationAngle)} type ${f(p.touchType)}`);
    L.push("LIVE POINTERS (pointer events)");
    if (!livePointer.size) L.push("  none down");
    for (const [id, e] of livePointer) L.push(`  #${id}: ${e.pointerType} width ${f(e.width)} height ${f(e.height)} pressure ${f(e.pressure, 3)}`);
    L.push("");
    L.push("SINCE LOAD (every touch in the two areas)");
    for (const k of FIELDS) L.push(`  touch.${k.padEnd(14)} ${verdict("touch." + k)}`);
    for (const k of PFIELDS) L.push(`  pointer.${k.padEnd(12)} ${verdict("pointer." + k)}`);
    L.push("");
    const age = ((now() - sens.t0) / 1000).toFixed(0);
    L.push(`MOTION SENSORS: ${sens.status}; orientation events ${sens.nOri}, motion events ${sens.nMot} in ${age} s`);
    const o = sens.ori, m = sens.mot;
    if (o) L.push(`  orientation alpha ${f(o.alpha, 1)} beta ${f(o.beta, 1)} gamma ${f(o.gamma, 1)} absolute ${o.absolute}`);
    if (m) {
      const a = m.acceleration || {}, g = m.accelerationIncludingGravity || {}, r = m.rotationRate || {};
      L.push(`  acceleration ${f(a.x)} ${f(a.y)} ${f(a.z)} | incl. gravity ${f(g.x)} ${f(g.y)} ${f(g.z)}`);
      L.push(`  rotationRate α ${f(r.alpha, 1)} β ${f(r.beta, 1)} γ ${f(r.gamma, 1)} | interval ${f(m.interval, 1)} ms`);
    }
    if (!sens.nOri && !sens.nMot && now() - sens.t0 > 2000) L.push("  no sensor events received" + (inFrame ? " (expected inside the claude.ai frame: open the standalone page)" : ""));
    return L.join("\n");
  }
  $("diagCopy").onclick = () => { $("diagSel").value = probeReport(); $("diagSel").hidden = false; SH.copyText($("diagSel"), (m) => { $("diagMsg").textContent = m; }); };
  $("diagClose").onclick = () => { $("diag").hidden = true; $("diagSel").hidden = true; };

  /* ---------- frame loop ---------- */
  let lastD = 0, lastRows = "";
  function frame() {
    if (window.__mode === "touch") {
      gest.tick(now());
      const key = [...active.values()].map((a) => a.side + a.row).join(",");
      if (key !== lastRows) {
        lastRows = key;
        for (const side of ["left", "right"]) {
          const on = new Set([...active.values()].filter((a) => a.side === side).map((a) => a.row));
          for (const d of $(side === "left" ? "tL" : "tR").children) d.classList.toggle("on", on.has(+d.dataset.row));
        }
      }
      if (now() - lastD > 100) {
        lastD = now();
        if (!$("diag").hidden) $("diagText").textContent = probeReport();
        $("tRd").textContent = (ctx && ctx.state !== "running" ? `SOUND PAUSED (${ctx.state}): tap anywhere\n` : `sound ${ctx ? ctx.state : "not started"}\n`) + `${innerWidth}×${innerHeight}  rows ${G.noteName(ROWS[0])}–${G.noteName(ROWS[ROWS.length - 1])} (${ROWS.length})\n` +
          (lastEv ? `last: ${lastEv.type}${lastEv.midi != null ? " " + G.noteName(lastEv.midi) : ""}` : "last: –") + `  held ${active.size}` +
          (T.contactOn ? `\nclass ${lastOnset ? (lastOnset.cls || "–") + " (" + (lastOnset.size != null ? lastOnset.size.toFixed(0) : "?") + " px)" : "–"}` + (gest.stable.length ? `  settles avg ${(gest.stable.reduce((a, b) => a + b, 0) / gest.stable.length).toFixed(0)} / worst ${Math.max(...gest.stable).toFixed(0)} ms` : "") : "") +
          (T.tiltOn ? `\nlean ${tilt.lean.toFixed(0)}° (step ${tilt.v >= 0 ? "+" : ""}${tilt.v.toFixed(2)})` + (T.leanMode === "octave" ? `  octave ${tilt.octave > 0 ? "+" : ""}${tilt.octave}` : "") + (T.rollMode !== "off" ? `  roll ${tilt.roll.toFixed(0)}°` : "") + (sens.nMot ? "" : "  (no motion data)") : "") +
          (SH.csv.on ? `\nCSV ${SH.csv.rows.length} rows` : "");
        if (!$("tSet").hidden) $("tiltRd").textContent = ` lean ${tilt.lean.toFixed(0)}°  octave ${tilt.octave}  roll ${tilt.roll.toFixed(0)}°` + (sens.nMot ? "" : " (no motion data)");
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__touch = { gest, tilt, rows: () => ROWS, report: probeReport, stat, sound: () => sound, rect, T: () => T, fit: () => FIT, calText, onMotion };
})();
