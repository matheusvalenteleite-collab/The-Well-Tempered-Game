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
    requestSensors(); // must run inside this tap (iOS asks for motion permission only from a user gesture)
    ctx = SH.unlockAudio(tlog);
    show("touch");
  };

  /* ---------- settings ---------- */
  let T = { tonic: 2, minor: false, octaves: 2, mid: 62, loopOn: false, bpm: 84, loopLevel: 0.5, sides: "both" };
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
  const gest = new G.TouchGestures(() => ({ left: rect.left, right: rect.right }), () => ROWS, (ev) => {
    if (ev.type === "onset" || ev.type === "pitch") active.set(ev.id, { row: ev.row, side: ev.side || (active.get(ev.id) || {}).side });
    if (ev.type === "release") active.delete(ev.id);
    if (sound) sound.handle(ev);
    lastEv = ev;
  });
  let lastEv = null;

  /* ---------- layout ---------- */
  const rect = { left: null, right: null };
  function layout() {
    const W = innerWidth, H = innerHeight, MX = 48, MY = 44;
    const aw = Math.round(Math.min(280, Math.max(160, W * 0.3))), h = H - 2 * MY;
    Object.assign($("tL").style, { left: MX + "px", top: MY + "px", width: aw + "px", height: h + "px" });
    Object.assign($("tR").style, { left: W - MX - aw + "px", top: MY + "px", width: aw + "px", height: h + "px" });
    Object.assign($("tPanel").style, { left: MX + aw + 10 + "px", width: W - 2 * MX - 2 * aw - 20 + "px", top: "8px", height: H - 16 + "px" });
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
    if (!sound && ctx) sound = new S.TouchSound(ctx);
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
      addEventListener("devicemotion", (e) => { sens.nMot++; sens.mot = e; const a = e.accelerationIncludingGravity || {}, r = e.rotationRate || {}; SH.csv.add({ mode: "touch", event: "motion", accX: a.x, accY: a.y, accZ: a.z, rotA: r.alpha, rotB: r.beta, rotG: r.gamma }); });
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
  const onTouchMode = () => window.__mode === "touch" && $("csvBox").hidden;
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button,select,input,textarea,label"));
  const inArea = (x, y) => gest.sideAt(x, y) !== null;
  document.addEventListener("pointerdown", (e) => {
    if (!onTouchMode() || onControl(e) || !inArea(e.clientX, e.clientY)) return;
    e.preventDefault();
    const t = SH.evTime(e);
    livePointer.set(e.pointerId, e); PFIELDS.forEach((k) => note("pointer." + k, e[k]));
    SH.csv.add({ t_ms: t, mode: "touch", event: "pointerdown", id: e.pointerId, zone: gest.sideAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY, pressure: e.pressure, width: e.width, height: e.height });
    gest.down(e.pointerId, t, e.clientX, e.clientY, touchFor(e.clientX, e.clientY));
  }, { passive: false });
  document.addEventListener("pointermove", (e) => {
    if (!gest.held.has(e.pointerId)) return;
    e.preventDefault();
    const t = SH.evTime(e);
    livePointer.set(e.pointerId, e); PFIELDS.forEach((k) => note("pointer." + k, e[k]));
    SH.csv.add({ t_ms: t, mode: "touch", event: "pointermove", id: e.pointerId, zone: gest.held.get(e.pointerId).side, x: e.clientX, y: e.clientY, pressure: e.pressure, width: e.width, height: e.height });
    gest.move(e.pointerId, t, e.clientX, e.clientY, touchFor(e.clientX, e.clientY));
  }, { passive: false });
  const pend = (e) => {
    livePointer.delete(e.pointerId);
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
  function touchFor(x, y) { let best = null, bd = 60; for (const p of liveTouch.values()) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best; }

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
        $("tRd").textContent = `${innerWidth}×${innerHeight}  rows ${G.noteName(ROWS[0])}–${G.noteName(ROWS[ROWS.length - 1])} (${ROWS.length})\n` +
          (lastEv ? `last: ${lastEv.type}${lastEv.midi != null ? " " + G.noteName(lastEv.midi) : ""}` : "last: –") + `  held ${active.size}` + (SH.csv.on ? `\nCSV ${SH.csv.rows.length} rows` : "");
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__touch = { gest, rows: () => ROWS, report: probeReport, stat, sound: () => sound, rect };
})();
