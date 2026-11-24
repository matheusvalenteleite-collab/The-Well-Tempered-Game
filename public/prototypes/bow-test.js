/* Two-thumb "string instrument" control: throwaway prototype. Standalone; shares nothing with the game. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const NOTES = [293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 554.37]; // D4 E4 F#4 G4 A4 B4 C#5
const NAMES = ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5'];
const DEGREES = ['1', '2', '3', '4', '5', '6', '7'];
const T0 = performance.now();
const HAS_CO = typeof PointerEvent !== 'undefined' && 'getCoalescedEvents' in PointerEvent.prototype;
const DEAD_SPEED = 20; // px/s below which the bow counts as still
const STALE_MS = 70; // no bow sample for this long = bow still

// ---------- log ----------
const logLines = [];
const stamp = () => { const s = (performance.now() - T0) / 1000, m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + (s - m * 60).toFixed(3).padStart(6, '0'); };
function log(msg) { logLines.push('[' + stamp() + '] ' + msg); if (logLines.length > 8000) logLines.splice(0, 1000); }

// ---------- stats ----------
const mkGap = () => ({ n: 0, sum: 0, max: 0, o50: 0, o100: 0 });
const mkLag = () => ({ n: 0, sum: 0, max: 0, late: 0 });
const mkStats = () => ({ ev: mkGap(), co: mkGap(), actMs: 0, actEv: 0, actCo: 0, evN: 0, coN: 0, coMulti: 0, lag: mkLag(), tapBow: mkLag(), tapIdle: mkLag(), interrupts: 0, byZone: {}, pitchChanges: 0, reversals: 0, movingMs: 0 });
function addGap(g, d) { if (!(d > 0) || d > 2000) return; if (d < 250) { g.n++; g.sum += d; } if (d > g.max) g.max = d; if (d > 50) g.o50++; if (d > 100) g.o100++; }
function addLag(L, v) { L.n++; L.sum += v; if (v > L.max) L.max = v; if (v > 50) L.late++; }
const G = mkStats();
let R = null; // endurance run
const each = (f) => { f(G); if (R) f(R); };
const tsOf = (e) => { const t = e.timeStamp; return t > 1e11 ? t - performance.timeOrigin : t; };
const counts = { tsBow: 0, tsPitch: 0, pdBow: 0, pdPitch: 0 };

// ---------- elements ----------
const stage = $('stage'), pitchCol = $('pitchCol'), bowStrip = $('bowStrip'), bowThumb = $('bowThumb'), bowFill = $('bowFill');
NOTES.forEach((_, i) => { const r = document.createElement('div'); r.className = 'row'; const n = 6 - i; r.innerHTML = '<span>' + NAMES[n] + '</span><small>' + DEGREES[n] + '</small>'; pitchCol.appendChild(r); });
const rows = Array.from(pitchCol.children); // rows[0] = highest note
let useCo = true;

// ---------- audio ----------
const A = { ctx: null, started: false };
function initAudio() {
  if (A.ctx) { if (A.ctx.state !== 'running') A.ctx.resume(); return; }
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC({ latencyHint: 'interactive' });
  A.ctx = ctx;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 1.2; filter.frequency.value = 400;
  const dip = ctx.createGain(); dip.gain.value = 1;
  const bow = ctx.createGain(); bow.gain.value = 0;
  const gate = ctx.createGain(); gate.gain.value = 0;
  const master = ctx.createGain(); master.gain.value = 0.2;
  A.oscs = [-4, 4].map((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = c; o.frequency.value = NOTES[0]; o.connect(filter); o.start(); return o; });
  filter.connect(dip); dip.connect(bow); bow.connect(gate); gate.connect(master); master.connect(ctx.destination);
  Object.assign(A, { filter, dip, bow, gate, master, last: { bow: 0, gate: 0, cut: 400 }, lastT: 0 });
  // iOS: Web Audio is muted by the ring/silent switch unless a media element is playing; loop a silent one.
  try {
    const n = 4410, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    const au = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' }))); au.loop = true; au.volume = 0.01; au.setAttribute('playsinline', ''); au.play().catch(() => {});
    A.silent = au;
  } catch (_) {}
  ctx.resume();
  ctx.addEventListener && ctx.addEventListener('statechange', () => log('audio state: ' + ctx.state));
  log('audio started: state=' + ctx.state + ' sampleRate=' + ctx.sampleRate + ' baseLatency=' + (ctx.baseLatency != null ? (ctx.baseLatency * 1000).toFixed(1) + 'ms' : 'n/a') + ' outputLatency=' + (ctx.outputLatency != null ? (ctx.outputLatency * 1000).toFixed(1) + 'ms' : 'n/a') + ' getOutputTimestamp=' + (typeof ctx.getOutputTimestamp === 'function'));
}
function setParam(p, v, tau) { const c = A.ctx; p.cancelScheduledValues(c.currentTime); p.setTargetAtTime(v, c.currentTime, tau); }
function audioNote(i) { if (!A.ctx) return; A.oscs.forEach((o) => setParam(o.frequency, NOTES[i], 0.006)); }
function audioUpdate(level, moving, pitchHeld) {
  if (!A.ctx) return;
  const L = A.last;
  const bowT = moving ? Math.pow(level, 0.75) : 0, gateT = pitchHeld ? 1 : 0, cutT = 450 + level * 3300;
  if (Math.abs(bowT - L.bow) > 0.002) { setParam(A.bow.gain, bowT, 0.022); L.bow = bowT; }
  if (gateT !== L.gate) { setParam(A.gate.gain, gateT, 0.008); L.gate = gateT; }
  if (Math.abs(cutT - L.cut) > 20) { setParam(A.filter.frequency, cutT, 0.04); L.cut = cutT; }
}
function audioDip() { if (!A.ctx) return; const g = A.dip.gain, t = A.ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(0.06, t, 0.004); g.setTargetAtTime(1, t + 0.035, 0.015); }

// ---------- geometry ----------
const rectOf = (el) => el.getBoundingClientRect();
function rowAt(y) { const r = rectOf(pitchCol); return 6 - clamp(Math.floor(((y - r.top) / r.height) * 7), 0, 6); } // note index 0..6
function zoneAt(x, y) { const b = rectOf(bowStrip), p = rectOf(pitchCol); if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return 'bow'; if (x >= p.left && x <= p.right && y >= p.top && y <= p.bottom) return 'pitch'; return 'other'; }

// ---------- interruptions ----------
const lastInt = {};
function interruption(type, zone, extra) {
  log('INTERRUPT ' + type + ' zone=' + zone + (extra ? ' ' + extra : ''));
  const now = performance.now();
  if (lastInt[zone] && now - lastInt[zone] < 60) return; // pointercancel + touchcancel of the same event count once
  lastInt[zone] = now;
  each((S) => { S.interrupts++; S.byZone[zone] = (S.byZone[zone] || 0) + 1; });
}

// ---------- pitch zone ----------
const pitch = { id: null, note: -1 };
function showHeld() { rows.forEach((r, i) => r.classList.toggle('held', pitch.id !== null && 6 - i === pitch.note)); }
const isBowMoving = (now) => bow.id !== null && now - bow.lastArr <= STALE_MS && Math.abs(bow.v) > DEAD_SPEED;
pitchCol.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const now = performance.now(), lag = now - tsOf(e), bowing = isBowMoving(now);
  counts.pdPitch++;
  try { pitchCol.setPointerCapture(e.pointerId); } catch (_) {}
  pitch.id = e.pointerId; pitch.note = rowAt(e.clientY);
  audioNote(pitch.note); showHeld();
  each((S) => addLag(bowing ? S.tapBow : S.tapIdle, lag));
  if (lag > 50) log('LATE pitch tap: input lag ' + lag.toFixed(0) + 'ms, bow ' + (bowing ? 'moving' : 'still'));
  simTap(pitch.note, bowing, lag);
});
pitchCol.addEventListener('pointermove', (e) => {
  if (e.pointerId !== pitch.id) return;
  const n = rowAt(e.clientY);
  if (n !== pitch.note) { pitch.note = n; audioNote(n); showHeld(); each((S) => S.pitchChanges++); }
});
const pitchEnd = (e) => { if (e.pointerId !== pitch.id) return; pitch.id = null; showHeld(); };
pitchCol.addEventListener('pointerup', pitchEnd);
pitchCol.addEventListener('pointercancel', (e) => { if (e.pointerId === pitch.id) interruption('pointercancel', 'pitch'); pitchEnd(e); });
pitchCol.addEventListener('lostpointercapture', (e) => { if (e.pointerId === pitch.id) { interruption('lostpointercapture', 'pitch'); pitchEnd(e); } });

// ---------- bow zone ----------
const bow = { id: null, lastEvTs: null, lastCoTs: null, samples: [], v: 0, lastArr: 0, x: 0, dir: 0, ext: 0, level: 0 };
bowStrip.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  counts.pdBow++;
  if (bow.id !== null) return; // second finger on the strip: ignored
  try { bowStrip.setPointerCapture(e.pointerId); } catch (_) {}
  const r = rectOf(bowStrip);
  Object.assign(bow, { id: e.pointerId, lastEvTs: null, lastCoTs: null, samples: [], v: 0, lastArr: performance.now(), x: clamp(e.clientX, r.left, r.right), dir: 0 });
  bow.ext = bow.x; bowStrip.classList.add('down');
});
const TH = 4; // px of travel against the current direction that counts as a bow change
function sample(clientX, t) {
  const r = rectOf(bowStrip), x = clamp(clientX, r.left, r.right), s = bow.samples;
  if (s.length && t < s[s.length - 1].t) t = s[s.length - 1].t;
  bow.x = x; s.push({ t, x });
  while (s.length > 2 && s[0].t < t - 60) s.shift();
  if (s.length >= 2) { const span = t - s[0].t; if (span >= 10) bow.v = ((x - s[0].x) / span) * 1000; }
  if (bow.dir === 0) { if (Math.abs(x - bow.ext) >= TH) { bow.dir = Math.sign(x - bow.ext); bow.ext = x; } }
  else if (bow.dir > 0) { if (x > bow.ext) bow.ext = x; else if (bow.ext - x >= TH) { reversal(); bow.dir = -1; bow.ext = x; } }
  else { if (x < bow.ext) bow.ext = x; else if (x - bow.ext >= TH) { reversal(); bow.dir = 1; bow.ext = x; } }
}
let flashUntil = 0;
function reversal() { audioDip(); each((S) => S.reversals++); flashUntil = performance.now() + 120; }
bowStrip.addEventListener('pointermove', (e) => {
  if (e.pointerId !== bow.id) return;
  const now = performance.now(), ts = tsOf(e);
  let list = [e], coalesced = false;
  if (HAS_CO) { try { const c = e.getCoalescedEvents(); if (c && c.length) { list = c; coalesced = true; } } catch (_) {} }
  const gap = bow.lastEvTs == null ? null : ts - bow.lastEvTs;
  each((S) => {
    S.evN++; S.coN += list.length; if (list.length > 1) S.coMulti++;
    addLag(S.lag, now - ts);
    if (gap != null) { addGap(S.ev, gap); if (gap > 0 && gap < 250) { S.actMs += gap; S.actEv++; S.actCo += list.length; } }
    let prev = bow.lastCoTs;
    for (const c of list) { const cts = tsOf(c) || ts; if (prev != null) addGap(S.co, cts - prev); prev = cts; }
  });
  if (gap != null && gap > 100 && Math.abs(bow.v) > 150) log('STALL: ' + gap.toFixed(0) + 'ms between bow events while moving at ' + Math.abs(bow.v).toFixed(0) + 'px/s');
  bow.lastEvTs = ts; bow.lastCoTs = tsOf(list[list.length - 1]) || ts;
  for (const c of useCo && coalesced ? list : [e]) sample(c.clientX, tsOf(c) || ts);
  bow.lastArr = now;
});
function bowEnd() { bow.id = null; bow.v = 0; bowStrip.classList.remove('down'); }
bowStrip.addEventListener('pointerup', (e) => { if (e.pointerId === bow.id) bowEnd(); });
bowStrip.addEventListener('pointercancel', (e) => { if (e.pointerId === bow.id) { interruption('pointercancel', 'bow'); bowEnd(); } });
bowStrip.addEventListener('lostpointercapture', (e) => { if (e.pointerId === bow.id) { interruption('lostpointercapture', 'bow'); bowEnd(); } });

// ---------- whole-page watchers ----------
document.addEventListener('touchstart', (e) => { for (const t of e.changedTouches) { const z = zoneAt(t.clientX, t.clientY); if (z === 'bow') counts.tsBow++; else if (z === 'pitch') counts.tsPitch++; } if (e.touches.length >= 4) log('note: ' + e.touches.length + ' touches down (iOS may start a system gesture)'); }, { capture: true, passive: true });
document.addEventListener('touchcancel', (e) => { for (const t of e.changedTouches) interruption('touchcancel', zoneAt(t.clientX, t.clientY), 'x=' + t.clientX.toFixed(0) + ' y=' + t.clientY.toFixed(0)); }, { capture: true, passive: true });
document.addEventListener('touchmove', (e) => { if (e.target.closest && e.target.closest('#report pre, #report textarea')) return; e.preventDefault(); }, { passive: false });
['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'selectstart', 'dblclick'].forEach((n) => document.addEventListener(n, (e) => { if (e.target && e.target.id === 'logBox' && n !== 'gesturestart') return; e.preventDefault(); }, { passive: false }));
function lostAll(why) {
  if (bow.id !== null) { interruption(why, 'bow'); bowEnd(); }
  if (pitch.id !== null) { interruption(why, 'pitch'); pitch.id = null; showHeld(); }
}
document.addEventListener('visibilitychange', () => { log('visibility: ' + document.visibilityState); if (document.hidden) lostAll('page-hidden'); });
window.addEventListener('pagehide', () => lostAll('pagehide'));
window.addEventListener('blur', () => lostAll('window-blur'));

// ---------- sim test (taps while bowing) ----------
const sim = { on: false, n: 0, total: 16, target: -1, hit: 0, wrong: 0, miss: 0, hitBowing: 0, bowAtPrompt: 0, timer: null, prev: -1 };
function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.display = msg ? 'block' : 'none'; }
function simStart() {
  if (sim.on) { simStop('cancelled'); return; }
  Object.assign(sim, { on: true, n: 0, hit: 0, wrong: 0, miss: 0, hitBowing: 0, bowAtPrompt: 0, target: -1, prev: -1 });
  log('SIM TEST start: ' + sim.total + ' prompts. Bow continuously; tap the lit row.');
  $('bSim').classList.add('on'); $('bSim').textContent = 'Stop sim';
  sim.timer = setTimeout(simPrompt, 1500); toast('Sim test: keep bowing; tap the lit row');
}
function simPrompt() {
  if (!sim.on) return;
  if (sim.n >= sim.total) { simStop('done'); return; }
  let t; do { t = Math.floor(Math.random() * 7); } while (t === sim.prev);
  sim.n++; sim.target = t; sim.prev = t; sim.promptT = performance.now();
  if (isBowMoving(sim.promptT)) sim.bowAtPrompt++;
  rows.forEach((r, i) => r.classList.toggle('target', 6 - i === t));
  toast('Sim ' + sim.n + '/' + sim.total + ': tap ' + NAMES[t]);
  sim.timer = setTimeout(() => { if (sim.target >= 0) { sim.miss++; log('SIM ' + sim.n + ' MISSED (no tap within 1.6 s) target=' + NAMES[sim.target] + ' bow ' + (isBowMoving(performance.now()) ? 'moving' : 'still')); simClear(); } }, 1600);
}
function simClear() { sim.target = -1; rows.forEach((r) => r.classList.remove('target')); clearTimeout(sim.timer); sim.timer = setTimeout(simPrompt, 500 + Math.random() * 500); }
function simTap(note, bowing, lag) {
  if (!sim.on || sim.target < 0) return;
  const rt = performance.now() - sim.promptT;
  if (note === sim.target) { sim.hit++; if (bowing) sim.hitBowing++; log('SIM ' + sim.n + ' hit ' + NAMES[note] + ' rt=' + rt.toFixed(0) + 'ms inputLag=' + lag.toFixed(0) + 'ms bow ' + (bowing ? 'moving' : 'STILL')); }
  else { sim.wrong++; log('SIM ' + sim.n + ' wrong row: got ' + NAMES[note] + ' wanted ' + NAMES[sim.target]); }
  simClear();
}
function simStop(why) {
  clearTimeout(sim.timer); sim.on = false; sim.target = -1; rows.forEach((r) => r.classList.remove('target'));
  $('bSim').classList.remove('on'); $('bSim').textContent = 'Sim test';
  const m = 'SIM TEST ' + why + ': ' + sim.n + ' prompts, hit ' + sim.hit + ' (' + sim.hitBowing + ' with bow moving), wrong row ' + sim.wrong + ', missed ' + sim.miss + ', bow moving at prompt ' + sim.bowAtPrompt + '/' + sim.n;
  log(m); toast(why === 'done' ? m : ''); if (why === 'done') setTimeout(() => toast(''), 6000);
}

// ---------- endurance ----------
let runStart = 0; const RUN_MS = 60000;
function runStartNow() {
  if (R) return;
  R = mkStats(); runStart = performance.now();
  log('ENDURANCE start: bow continuously for 60 s while changing pitch');
  $('timer').style.display = 'block'; $('bEnd').classList.add('on'); toast('Endurance: bow continuously, change pitch often');
}
function runFinish() {
  const S = R, secs = (performance.now() - runStart) / 1000; R = null;
  $('timer').style.display = 'none'; $('bEnd').classList.remove('on'); toast('');
  if (A.ctx) audioUpdate(0, false, false);
  const txt = statsText(S, 'ENDURANCE RUN (' + secs.toFixed(1) + ' s)', secs);
  runResult = { txt, secs };
  $('rateText').textContent = txt; $('rate').classList.add('show');
}
let runResult = null;
$('rate').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-r]'); if (!b || !runResult) return;
  log('ENDURANCE RESULT, thumb comfort rating = ' + b.dataset.r + '/5\n' + runResult.txt);
  runResult = null; $('rate').classList.remove('show');
});
$('bEnd').addEventListener('click', () => { if (R) { log('ENDURANCE aborted'); R = null; $('timer').style.display = 'none'; $('bEnd').classList.remove('on'); toast(''); } else { initAudio(); runStartNow(); } });

// ---------- reporting ----------
const f1 = (v) => (v == null || !isFinite(v) ? '-' : v.toFixed(1));
const avg = (L) => (L.n ? L.sum / L.n : null);
function latencyText() {
  const c = A.ctx; if (!c) return ['audio not started'];
  const base = c.baseLatency != null ? c.baseLatency * 1000 : null, out = c.outputLatency != null ? c.outputLatency * 1000 : null;
  let pipe = null;
  if (typeof c.getOutputTimestamp === 'function') { try { const o = c.getOutputTimestamp(); if (o && o.performanceTime > 0) pipe = (c.currentTime - (o.contextTime + (performance.now() - o.performanceTime) / 1000)) * 1000; } catch (_) {} }
  const inLag = avg(G.tapBow) ?? avg(G.tapIdle), q = (128 / c.sampleRate) * 1000;
  const hw = pipe != null && pipe > 0 ? pipe : base != null ? base + (out ?? 0) : null;
  const est = inLag != null && hw != null ? inLag + q + hw : null;
  return [
    'ctx ' + c.state + ' ' + c.sampleRate + 'Hz, baseLatency ' + f1(base) + ' ms, outputLatency ' + f1(out) + ' ms',
    'getOutputTimestamp pipeline: ' + f1(pipe) + ' ms',
    'tap->JS (measured avg): ' + f1(inLag) + ' ms; render quantum ' + f1(q) + ' ms',
    'ESTIMATE tap->sound: ' + (est != null ? '~' + est.toFixed(0) + ' ms' : 'n/a') + (out == null && pipe == null ? ' (+ unknown hardware/speaker delay)' : ''),
    '(not a physical measurement)',
  ];
}
function statsText(S, title, secs) {
  const rate = (n) => (S.actMs ? ((n / S.actMs) * 1000).toFixed(1) : '-');
  const L = [];
  if (title) L.push('== ' + title + ' ==');
  L.push('BOW SAMPLING (thumb moving)');
  L.push(' pointermove events: ' + S.evN + ', rate ' + rate(S.actEv) + '/s');
  L.push('  gap avg ' + f1(avg({ n: S.ev.n, sum: S.ev.sum })) + ' ms, worst ' + f1(S.ev.max) + ' ms, >50ms: ' + S.ev.o50 + ', >100ms: ' + S.ev.o100);
  L.push(' getCoalescedEvents: ' + (HAS_CO ? 'supported' : 'NOT supported') + (HAS_CO ? ', ' + (S.evN ? Math.round((S.coMulti / S.evN) * 100) : 0) + '% of moves carried >1 sample' : ''));
  L.push(' with coalesced: ' + S.coN + ' samples, rate ' + rate(S.actCo) + '/s');
  L.push('  gap avg ' + (S.actCo ? f1(S.actMs / S.actCo) : '-') + ' ms, worst ' + (S.co.max ? f1(S.co.max) : 'n/a') + ' ms');
  L.push(' delivery lag (now - event time): avg ' + f1(avg(S.lag)) + ', max ' + f1(S.lag.max) + ' ms');
  L.push('INTERRUPTIONS: ' + S.interrupts + (Object.keys(S.byZone).length ? ' (' + Object.entries(S.byZone).map(([k, v]) => k + ' ' + v).join(', ') + ')' : ''));
  L.push('SIMULTANEITY');
  L.push(' pitch taps, bow moving: ' + S.tapBow.n + ', lag avg ' + f1(avg(S.tapBow)) + ' max ' + f1(S.tapBow.max) + ', late(>50): ' + S.tapBow.late);
  L.push(' pitch taps, bow still: ' + S.tapIdle.n + ', lag avg ' + f1(avg(S.tapIdle)) + ' max ' + f1(S.tapIdle.max) + ', late(>50): ' + S.tapIdle.late);
  L.push(' pitch row changes while held: ' + S.pitchChanges + '; bow reversals: ' + S.reversals);
  if (secs) L.push(' bow moving ' + (S.movingMs / 1000).toFixed(1) + ' s of ' + secs.toFixed(1) + ' s');
  return L.join('\n');
}
function fullText() {
  const L = [];
  L.push('Viewport ' + innerWidth + 'x' + innerHeight + ' (screen ' + screen.width + 'x' + screen.height + ', dpr ' + devicePixelRatio + ', standalone ' + (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches ? 'yes' : 'no') + ')');
  L.push('Coalesced in use: ' + (useCo && HAS_CO ? 'yes' : 'no'));
  L.push('');
  L.push(statsText(G, 'WHOLE SESSION'));
  L.push('touchstart vs pointerdown (a mismatch = lost touch)');
  L.push(' bow ' + counts.tsBow + '/' + counts.pdBow + ', pitch ' + counts.tsPitch + '/' + counts.pdPitch);
  L.push('SIM TEST: hit ' + sim.hit + ', wrong ' + sim.wrong + ', missed ' + sim.miss + ' of ' + sim.n + (sim.on ? ' (running)' : ''));
  L.push('AUDIO LATENCY');
  latencyText().forEach((s) => L.push(' ' + s));
  return L.join('\n');
}
function exportText() {
  return ['WTC bow-test log', 'time ' + new Date().toISOString(), 'UA ' + navigator.userAgent, '', fullText(), '', '---- events ----', ...logLines].join('\n');
}
function liveText() {
  const S = G, rate = (n) => (S.actMs ? ((n / S.actMs) * 1000).toFixed(0) : '-');
  return ['view ' + innerWidth + 'x' + innerHeight, 'move ' + rate(S.actEv) + '/s' + (HAS_CO ? ' co ' + rate(S.actCo) + '/s' : ' co n/a'), 'gap avg ' + f1(S.actEv ? S.actMs / S.actEv : null) + ' max ' + f1(S.ev.max), 'cancels ' + S.interrupts, 'taps ' + (S.tapBow.n + S.tapIdle.n) + ' late ' + (S.tapBow.late + S.tapIdle.late), 'ts/pd bow ' + counts.tsBow + '/' + counts.pdBow, 'ts/pd pit ' + counts.tsPitch + '/' + counts.pdPitch, 'sim h' + sim.hit + ' w' + sim.wrong + ' m' + sim.miss, 'lag ' + f1(avg(S.lag)) + ' ms'].join('\n');
}

// ---------- buttons ----------
$('bStart').addEventListener('click', () => { initAudio(); $('start').classList.remove('show'); log('started. UA=' + navigator.userAgent); log('viewport ' + innerWidth + 'x' + innerHeight + ' dpr ' + devicePixelRatio + ' coalesced API ' + HAS_CO + ' standalone ' + (navigator.standalone === true)); });
$('bSwap').addEventListener('click', () => { stage.classList.toggle('swap'); log('swap sides: bow on ' + (stage.classList.contains('swap') ? 'left' : 'right')); });
$('bCo').addEventListener('click', () => { useCo = !useCo; $('bCo').classList.toggle('on', useCo); $('bCo').textContent = 'Coalesced: ' + (useCo ? 'on' : 'off') + (HAS_CO ? '' : ' (n/a)'); log('coalesced samples drive the bow: ' + useCo); });
$('bSim').addEventListener('click', () => { initAudio(); simStart(); });
$('bStats').addEventListener('click', () => { const h = stage.classList.toggle('nostats'); $('bStats').textContent = h ? 'Show stats' : 'Hide stats'; });
function openReport() { $('fullStats').textContent = fullText(); $('logBox').value = exportText(); $('report').classList.add('show'); }
$('bReport').addEventListener('click', openReport);
$('rClose').addEventListener('click', () => $('report').classList.remove('show'));
$('rClear').addEventListener('click', () => { logLines.length = 0; log('log cleared'); $('logBox').value = exportText(); });
$('rCopy').addEventListener('click', async () => {
  const t = exportText(); let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (_) {}
  if (!ok) { const box = $('logBox'); box.value = t; box.removeAttribute('readonly'); box.focus(); box.select(); try { ok = document.execCommand('copy'); } catch (_) {} box.setAttribute('readonly', ''); box.blur(); }
  $('rCopy').textContent = ok ? 'Copied' : 'Copy failed: select text in the box'; setTimeout(() => ($('rCopy').textContent = 'Copy log'), 2000);
});
$('rDown').addEventListener('click', () => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportText()], { type: 'text/plain' })); a.download = 'bow-test-log.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
});
$('rShare').addEventListener('click', async () => {
  const f = new File([exportText()], 'bow-test-log.txt', { type: 'text/plain' });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'bow-test-log' }); else await navigator.share({ text: exportText() }); } catch (_) {}
});

// ---------- frame loop ----------
let lastFrame = performance.now(), liveT = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = now - lastFrame; lastFrame = now;
  const r = rectOf(bowStrip);
  const speed = bow.id !== null && now - bow.lastArr <= STALE_MS ? Math.abs(bow.v) : 0;
  const moving = speed > DEAD_SPEED;
  const level = clamp(speed / (r.width / 0.7), 0, 1); // full strip in 0.7 s = loudest
  if (moving) each((S) => (S.movingMs += dt));
  audioUpdate(level, moving, pitch.id !== null);
  bowThumb.style.opacity = bow.id !== null ? 0.9 : 0;
  bowThumb.style.transform = 'translateX(' + (bow.x - r.left) + 'px)';
  bowFill.style.opacity = moving ? level * 0.45 : 0;
  bowStrip.classList.toggle('flash', now < flashUntil);
  if (R) { const p = (now - runStart) / RUN_MS; $('timerFill').style.width = clamp(p * 100, 0, 100) + '%'; if (p >= 1) runFinish(); else toast('Endurance: ' + Math.ceil((RUN_MS - (now - runStart)) / 1000) + ' s left. Bow continuously, change pitch often'); }
  if (now - liveT > 200) { liveT = now; $('live').textContent = liveText(); }
}
requestAnimationFrame(frame);
window.addEventListener('resize', () => log('resize ' + innerWidth + 'x' + innerHeight));
window.__bowTest = { G, counts, sim, exportText, get R() { return R; } }; // for desk tests only
})();
