/* Touch-area mode, GESTURE LAYER: raw touches in, musical events out. Knows nothing about sound.
   Events: {type:"onset", id, t, side, row, midi, cls, size, norm, contact}
           {type:"pitch", id, t, row, midi}            (a held thumb slid to another row)
           {type:"contact", id, t, size, norm, norm0}  (continuous: contact size now, and at the onset)
           {type:"release", id, t}
           {type:"tilt", t, bend, vib, bright}         (bend in semitones, vib depth and bright in cents)
   onset carries cls ("tip" | "normal" | "flat" | null) and size; contact carries size and norm (0..1).
   Contact size = PointerEvent.width (CSS px). The probe on an iPhone (iOS 27, 24 Nov 2026) found it in
   8 steps of 24.2 px (24…194); touch.radiusX has only 4 steps and force is always 0, so width is the signal.

   Pitch mapping ported from the game's own free-play mapping, THE LAB's FREE PLAY (D320,
   src/bench/lab/free.ts): freeRows (scale "the key's notes", major or natural minor, `octaves`
   round a middle pitch), rowAt (rows high at the top, 10 px margin at the top and foot), and its
   slide rule (a held thumb moved at least max(MECH.slideMinPx = 10 px, half a row) into another
   row and stayed there SLIDE_DWELL_MS = 90 ms). Both thumb areas carry the same rows, as there.
   A touch belongs to the area where it landed and keeps it while it slides (src/touch/thumbs.ts). */
(function () {
  "use strict";
  const MARGIN = 10, SLIDE_DWELL_MS = 90, SLIDE_MIN_PX = 10;
  const pcOf = (m) => ((m % 12) + 12) % 12;

  /* free.ts freeRows, with the piece's voice replaced by a middle pitch: the rows' pitches, low to high. */
  function freeRows(tonic, minor, mid, octaves) {
    const half = Math.round((octaves * 12) / 2);
    const deg = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const inKey = new Set(deg.map((d) => (tonic + d) % 12));
    const out = [];
    for (let m = mid - half; m <= mid + half; m++) if (inKey.has(pcOf(m))) out.push(m);
    return out;
  }
  const rowH = (n, h) => Math.max(4, (h - 2 * MARGIN) / n);
  function rowAt(n, y, h) { const r = n - 1 - Math.floor((y - MARGIN) / rowH(n, h)); return Math.max(0, Math.min(n - 1, r)); }
  const rowMid = (n, row, h) => MARGIN + (n - 1 - row + 0.5) * rowH(n, h);

  /* ---------- contact classes ---------- */
  const CLASSES = ["tip", "normal", "flat"];
  const classify = (th, size) => (!th || size == null ? null : size < th.t1 ? "tip" : size < th.t2 ? "normal" : "flat");
  /* The largest size seen within `ms` of landing (seq: [[ms after landing, size], ...]). */
  function sizeAt(seq, ms) { let m = null; for (const [dt, v] of seq) if (dt <= ms + 0.5 && (m === null || v > m)) m = v; return m; }
  /* Two cut points (tip | normal | flat) with the fewest calibration taps on the wrong side;
     ties go to the cut farthest from the nearest tap. by = {tip:[sizes], normal:[...], flat:[...]}. */
  function fitThresholds(by) {
    if (CLASSES.some((c) => !by[c] || !by[c].length)) return null;
    const all = CLASSES.flatMap((c) => by[c]);
    const vals = [...new Set(all)].sort((a, b) => a - b);
    const cuts = [vals[0] - 1];
    for (let i = 1; i < vals.length; i++) cuts.push((vals[i - 1] + vals[i]) / 2);
    cuts.push(vals[vals.length - 1] + 1);
    const gap = (c) => Math.min(...all.map((v) => Math.abs(v - c)));
    let best = null;
    for (let i = 0; i < cuts.length; i++) for (let j = i; j < cuts.length; j++) {
      const th = { t1: cuts[i], t2: cuts[j] };
      let err = 0; for (const c of CLASSES) for (const v of by[c]) if (classify(th, v) !== c) err++;
      const margin = Math.min(gap(th.t1), gap(th.t2));
      if (!best || err < best.err || (err === best.err && margin > best.margin)) best = { ...th, err, margin };
    }
    const confusion = {}; for (const c of CLASSES) { confusion[c] = { tip: 0, normal: 0, flat: 0 }; for (const v of by[c]) confusion[c][classify(best, v)]++; }
    const hist = vals.map((v) => [v, ...CLASSES.map((c) => by[c].filter((x) => x === v).length)]);
    const overlap = (a, b) => by[a].filter((v) => v >= Math.min(...by[b])).length + by[b].filter((v) => v <= Math.max(...by[a])).length;
    const n = all.length;
    return { t1: best.t1, t2: best.t2, errors: best.err, n, errorRate: best.err / n, confusion, hist,
      overlapTipNormal: overlap("tip", "normal"), overlapNormalFlat: overlap("normal", "flat") };
  }
  /* How long after landing the class stopped changing (ms), from a size sequence. */
  function stableAfter(th, seq) {
    let last = 0, prev = null;
    for (const [dt, v] of seq) { const c = classify(th, v); if (prev !== null && c !== prev) last = dt; prev = c; }
    return last;
  }

  /* ---------- tilt: gravity in, musical parameters out ---------- */
  /* Roll = turning the phone like a steering wheel (about the screen's normal); pitch = tipping its top
     edge away or toward you. Both from the gravity vector, relative to the neutral, so they do not depend
     on Euler angles or on which way round landscape is. */
  class TiltReader {
    constructor(emit) { this.emit = emit; this.g = null; this.neutral = null; this.roll = 0; this.pitch = 0; this.lastT = 0; }
    angles(g) { return { phi: Math.atan2(g[0], g[1]) * 180 / Math.PI, theta: Math.atan2(g[2], Math.hypot(g[0], g[1])) * 180 / Math.PI }; }
    setNeutral() { if (this.g) this.neutral = this.angles(this.g); return this.neutral; }
    feed(t, gx, gy, gz, P) {
      if (gx == null) return;
      const a = this.g ? 1 - Math.exp(-Math.max(0, t - this.lastT) / Math.max(1, P.tiltTau)) : 1;
      this.lastT = t;
      this.g = this.g ? this.g.map((v, i) => v + ([gx, gy, gz][i] - v) * a) : [gx, gy, gz];
      if (!this.neutral) this.setNeutral();
      const A = this.angles(this.g);
      let roll = A.phi - this.neutral.phi; roll = ((roll + 540) % 360) - 180;
      let pitch = A.theta - this.neutral.theta;
      if (P.invRoll) roll = -roll;
      if (P.invPitch) pitch = -pitch;
      this.roll = roll; this.pitch = pitch;
      const shape = (x) => { const m = Math.max(0, Math.abs(x) - P.deadDeg); return Math.sign(x) * Math.min(1, m / Math.max(1, P.fullDeg - P.deadDeg)); };
      const u = shape(roll), v = shape(pitch);
      this.emit({ type: "tilt", t, bend: P.tiltMode === "bend" ? u * P.bendRange : 0, vib: P.tiltMode === "vibrato" ? Math.abs(u) * P.vibMax : 0, bright: v * P.pitchBright * 1200 });
    }
  }

  class TouchGestures {
    /* areas(): {left: DOMRect, right: DOMRect}; rows(): pitch list; emit(event);
       opts(): {contactOn, decideMs, cal: {left: thresholds|null, right: ...}, sizeRange: {left:[lo,hi], right:[lo,hi]}} */
    constructor(areas, rows, emit, opts) {
      this.areas = areas; this.rows = rows; this.emit = emit; this.held = new Map();
      this.opts = opts || (() => ({ contactOn: false, decideMs: 0, cal: {}, sizeRange: {} }));
      this.stable = []; // ms until the class settled, recent notes
    }
    th(side) { const o = this.opts(); return o.contactOn ? (o.cal[side] || null) : null; }
    norm(side, size) { const r = (this.opts().sizeRange || {})[side] || [24, 194]; return Math.max(0, Math.min(1, (size - r[0]) / Math.max(1, r[1] - r[0]))); }
    fire(id, hd, t) {
      hd.fired = true;
      const size = sizeAt(hd.seq, this.opts().decideMs);
      const cls = classify(this.th(hd.side), size);
      hd.cls = cls; hd.norm0 = size == null ? 0 : this.norm(hd.side, size);
      this.emit({ type: "onset", id, t, side: hd.side, row: hd.row, midi: this.rows()[hd.row], cls, size, norm: hd.norm0, contact: hd.contact });
    }
    sideAt(x, y) {
      const A = this.areas();
      for (const side of ["left", "right"]) { const r = A[side]; if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return side; }
      return null;
    }
    down(id, t, x, y, contact) {
      const side = this.sideAt(x, y);
      if (!side) return false;
      const r = this.areas()[side], rows = this.rows(), row = rowAt(rows.length, y - r.top, r.height);
      const size = contact && contact.width > 1 ? contact.width : null;
      const hd = { side, row, setY: y, pend: null, t0: t, seq: size == null ? [] : [[0, size]], fired: false, contact };
      this.held.set(id, hd);
      if (!(this.th(side) && this.opts().decideMs > 0)) this.fire(id, hd, t);
      return true;
    }
    move(id, t, x, y, contact) {
      const hd = this.held.get(id);
      if (!hd) return;
      const size = contact && contact.width > 1 ? contact.width : null;
      if (size != null) {
        if (t - hd.t0 <= 400) hd.seq.push([t - hd.t0, size]);
        if (hd.fired) this.emit({ type: "contact", id, t, size, norm: this.norm(hd.side, size), norm0: hd.norm0 });
      }
      const r = this.areas()[hd.side], rows = this.rows(), n = rows.length;
      const row = rowAt(n, y - r.top, r.height);
      if (row === hd.row || Math.abs(y - hd.setY) < Math.max(SLIDE_MIN_PX, rowH(n, r.height) * 0.5)) { hd.pend = null; return; }
      if (!hd.pend || hd.pend.row !== row) hd.pend = { row, since: t, y };
      else hd.pend.y = y;
      this.tick(t);
    }
    tick(t) {
      const rows = this.rows();
      for (const [id, hd] of this.held) {
        if (!hd.fired && t - hd.t0 >= this.opts().decideMs) this.fire(id, hd, t);
        if (!hd.done && t - hd.t0 > 400) this.settle(hd);
        const p = hd.pend;
        if (!p || t - p.since < SLIDE_DWELL_MS) continue;
        hd.pend = null; hd.row = p.row; hd.setY = p.y;
        this.emit({ type: "pitch", id, t, row: p.row, midi: rows[p.row] });
      }
    }
    settle(hd) { hd.done = true; const th = this.th(hd.side); if (th && hd.seq.length) { this.stable.push(stableAfter(th, hd.seq)); if (this.stable.length > 50) this.stable.shift(); } }
    up(id, t) {
      const hd = this.held.get(id);
      if (!hd) return;
      if (!hd.fired) this.fire(id, hd, t); // a tap shorter than the decision delay still sounds
      if (!hd.done) this.settle(hd);
      this.held.delete(id); this.emit({ type: "release", id, t });
    }
    releaseAll(t) { for (const id of [...this.held.keys()]) this.up(id, t); }
  }

  const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const noteName = (m) => NAMES[pcOf(m)] + (Math.floor(m / 12) - 1);
  window.TouchGest = { TouchGestures, TiltReader, CLASSES, classify, sizeAt, fitThresholds, stableAfter, freeRows, rowAt, rowMid, rowH, noteName, NAMES, MARGIN, SLIDE_DWELL_MS };
})();
