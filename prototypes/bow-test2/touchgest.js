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
  /* free.ts freeRows, scale "keyboard" (D330): every semitone, seven white keys an octave from the white at or
     below the range's foot (a piano's whites). */
  const PIANO_WHITES = [0, 2, 4, 5, 7, 9, 11];
  function keyboardRows(mid, octaves, whites = PIANO_WHITES) {
    const half = Math.round((octaves * 12) / 2), w = new Set(whites);
    let a = mid - half;
    while (!w.has(pcOf(a))) a--;
    let b = a;
    for (let n = 1; n < 7 * octaves; ) if (w.has(pcOf(++b))) n++;
    const out = []; for (let m = a; m <= b; m++) out.push(m);
    return out;
  }
  /* free.ts Keyboard (D330), ported line for line: a piano stood on end on each bar, pitch rising upward,
     black keys toward the inner edge (the screen's centre), white keys running on into the inner zone between
     them. Hit test: weighted nearest centre (a power diagram); a black key's tip tapers over `slant` of the
     bar's width round the zone split. u = px across from the bar's inner edge, y = px from its top. */
  const KB_DEFAULT = { split: 0.6, black: 0.58, slant: 0.2 };
  class Keyboard {
    constructor(rows, whites, shape, bw, h) {
      this.rows = rows; this.shape = shape; this.bw = bw; this.h = h;
      const isW = new Set(whites);
      const wi = rows.map((m, i) => (isW.has(pcOf(m)) ? i : -1)).filter((i) => i >= 0);
      this.whites = wi.length;
      const wh = (this.wh = Math.max(4, (h - 2 * MARGIN) / Math.max(1, wi.length)));
      const yW = (k) => MARGIN + (wi.length - 1 - k + 0.5) * wh;
      const uB = (shape.split * bw) / 2, uW = ((1 + shape.split) * bw) / 2, D = uW - uB;
      const hh0 = shape.black * wh, g0 = wh / 2, tau = Math.max(0.5, shape.slant * bw), k = hh0 / 2 / tau;
      this.wx = Math.sqrt((k * g0) / D);
      const bias0 = g0 * hh0 - g0 * g0, sU = shape.split * bw;
      const biasOut = g0 * g0 + this.wx * this.wx * D * (uW + uB - 2 * sU) + bias0 - (g0 * hh0) / 2;
      const keys = [], centres = [];
      wi.forEach((r, j) => {
        const y = yW(j);
        keys.push({ row: r, midi: rows[r], white: true, y, h: wh });
        centres.push({ row: r, u: uB, y, bias: 0, zone: "inner" }, { row: r, u: uW, y, bias: biasOut, zone: "outer" });
        const next = wi[j + 1];
        if (next === undefined) return;
        const n = next - r - 1;
        if (n <= 0) return;
        const yb = y - wh / 2, hh = Math.min(shape.black, 0.95 / n) * wh;
        for (let q = 0; q < n; q++) {
          const yc = yb + ((n - 1) / 2 - q) * hh, g = Math.min(Math.abs(yc - y), Math.abs(yc - (y - wh)));
          keys.push({ row: r + 1 + q, midi: rows[r + 1 + q], white: false, y: yc, h: hh });
          centres.push({ row: r + 1 + q, u: uB, y: yc, bias: g * hh - g * g, zone: "inner" });
        }
      });
      this.keys = keys.sort((a, b) => a.row - b.row);
      this.byRow = new Map(this.keys.map((q) => [q.row, q]));
      this.centres = centres;
    }
    hit(u, y) {
      let best = this.centres[0], bd = Infinity;
      for (const c of this.centres) { const du = this.wx * (u - c.u), dy = y - c.y, d = du * du + dy * dy - c.bias; if (d < bd) { bd = d; best = c; } }
      return { row: best.row, white: this.byRow.get(best.row).white, zone: best.zone };
    }
  }

  /* The owner (24 Nov 2026): "octave goes from do to do". Rows from the tonic up to the tonic (key notes) or
     from C up to C (piano), `octaves` octaves, starting in octave 4 (one octave lower for 2 or 3). This
     replaces the Lab's centred range (freeRows / keyboardRows above, kept for the port test). */
  function doToDo(tonic, minor, octaves, piano) {
    const start = 60 + (piano ? 0 : tonic) - 12 * Math.floor(octaves / 2), end = start + 12 * octaves;
    const deg = new Set((minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map((d) => (tonic + d) % 12));
    const out = []; for (let m = start; m <= end; m++) if (piano || deg.has(pcOf(m))) out.push(m);
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
  /* LEAN = the screen's angle to the horizontal: 0° flat face up, 90° upright facing you, below 0° tipped
     past flat (top edge away and down), above 90° tipped past upright. Measured absolutely from gravity,
     so the owner's natural hold (45°) is the centre by default and needs no "set neutral".
     v = (centre − lean) / span: 0 at the centre, +1 at flat, −1 at upright (span 45°); flatter is positive.
     ROLL = turning the phone like a steering wheel, relative to the neutral (set neutral).
     The face-up direction of the sensor's z axis and the in-plane "down" are taken from the first reading
     (the phone held, not lying flat), so the sign conventions of the browser do not matter.
     SOURCE "fused" (default): the gravity direction is carried forward by the gyroscope (fast, no jolts)
     and pulled slowly toward the accelerometer's gravity (no drift): a complementary filter. The
     gyroscope's sign and unit conventions are not assumed: four candidate trackers run side by side
     (±, degrees or radians per second) and the one that best predicts the accelerometer is used.
     SOURCE "gravity": the accelerometer alone, low-passed (P.tiltTau), as before. */
  const CANDS = [[1, Math.PI / 180], [-1, Math.PI / 180], [1, 1], [-1, 1]];
  class TiltReader {
    constructor(emit) { this.emit = emit; this.g = null; this.gl = null; this.ref = null; this.rollZero = null; this.lean = 0; this.v = 0; this.roll = 0; this.octave = 0; this.breath = 0; this.lastT = 0; this.cands = null; this.best = 0; this.source = "gravity"; }
    /* the fused gravity estimate: returns false if no gyroscope data */
    fuse(dt, gm, rot, P) {
      if (!rot || rot.alpha == null || rot.beta == null || rot.gamma == null) return false;
      if (!this.cands) this.cands = CANDS.map(([sg, k]) => ({ sg, k, g: gm.slice(), err: 0 }));
      const corr = Math.min(1, dt / Math.max(0.05, P.gyroCorrS));
      for (const c of this.cands) {
        const w = [rot.beta * c.sg * c.k, rot.gamma * c.sg * c.k, rot.alpha * c.sg * c.k]; // about x, y, z
        const g = c.g, cr = [w[1] * g[2] - w[2] * g[1], w[2] * g[0] - w[0] * g[2], w[0] * g[1] - w[1] * g[0]];
        const pred = [g[0] - cr[0] * dt, g[1] - cr[1] * dt, g[2] - cr[2] * dt]; // a world-fixed vector seen from a rotating body
        const cos = (pred[0] * this.gl[0] + pred[1] * this.gl[1] + pred[2] * this.gl[2]) / (Math.hypot(...pred) * Math.hypot(...this.gl) || 1);
        c.err += (Math.acos(Math.max(-1, Math.min(1, cos))) - c.err) * Math.min(1, dt / 2);
        c.g = pred.map((v, i) => v + (gm[i] - v) * corr);
      }
      const cur = this.cands[this.best];
      this.cands.forEach((c, i) => { if (c.err < cur.err * 0.7 - 1e-4) this.best = i; });
      this.g = this.cands[this.best].g;
      return true;
    }
    gyroLabel() { if (this.source !== "fused" || !this.cands) return this.source; const c = this.cands[this.best]; return `gyro (sign ${c.sg > 0 ? "+" : "−"}, ${c.k === 1 ? "rad" : "deg"}/s)`; }
    takeRef() {
      const g = this.g, m = Math.hypot(g[0], g[1]);
      if (m < 1) return false; // lying flat: wait for a held reading
      this.ref = { s: Math.sign(g[2]) || 1, ux: g[0] / m, uy: g[1] / m };
      return true;
    }
    leanOf(g) { const m = Math.hypot(g[0], g[1]), dot = g[0] * this.ref.ux + g[1] * this.ref.uy; return Math.atan2(Math.sign(dot || 1) * m, this.ref.s * g[2]) * 180 / Math.PI; }
    setNeutral() { if (!this.g) return null; if (!this.ref) this.takeRef(); this.rollZero = Math.atan2(this.g[0], this.g[1]) * 180 / Math.PI; return this.ref ? { lean: this.leanOf(this.g), roll: 0 } : null; }
    feed(t, gx, gy, gz, P, rot) {
      if (gx == null) return;
      const first = !this.g, dtMs = first ? 0 : Math.max(0, Math.min(100, t - this.lastT));
      this.lastT = t;
      const gm = [gx, gy, gz];
      // the accelerometer, low-passed: the "gravity only" estimate, and the reference the gyro trackers are judged by
      const a = this.gl ? 1 - Math.exp(-dtMs / Math.max(1, P.tiltTau)) : 1;
      this.gl = this.gl ? this.gl.map((v, i) => v + (gm[i] - v) * a) : gm.slice();
      if (P.tiltSource === "fused" && !first && this.fuse(dtMs / 1000, gm, rot, P)) this.source = "fused";
      else { this.g = this.gl.slice(); this.source = "gravity"; if (P.tiltSource !== "fused") this.cands = null; }
      if (!this.ref && !this.takeRef()) return;
      if (this.rollZero === null) this.rollZero = Math.atan2(this.g[0], this.g[1]) * 180 / Math.PI;
      let lean = this.leanOf(this.g);
      if (P.invLean) lean = 2 * P.centreDeg - lean;
      let roll = Math.atan2(this.g[0], this.g[1]) * 180 / Math.PI - this.rollZero; roll = ((roll + 540) % 360) - 180;
      if (P.invRoll) roll = -roll;
      this.lean = lean; this.roll = roll;
      const v = Math.max(-1.6, Math.min(1.6, (P.centreDeg - lean) / P.spanDeg));
      this.v = v;
      // continuous uses: a small dead zone round the centre, and a little room past flat/upright (to ±1.2)
      const dz = P.deadDeg / P.spanDeg;
      const cont = Math.sign(v) * Math.min(1.2, Math.max(0, Math.abs(v) - dz) / (1 - dz));
      // octave steps with hysteresis, at lean angles set in degrees (up1: one octave up at or flatter than it,
      // up2: two up; down1, down2 likewise toward upright), kept in order round the centre
      const h = P.octHystDeg / P.spanDeg, toV = (deg) => (P.centreDeg - deg) / P.spanDeg;
      const up1 = Math.min(P.up1Deg, P.centreDeg - 1), up2 = Math.min(P.up2Deg, up1 - 1), dn1 = Math.max(P.down1Deg, P.centreDeg + 1), dn2 = Math.max(P.down2Deg, dn1 + 1);
      const B = { 0: toV(up1), 1: toV(up2), "-1": toV(dn1), "-2": toV(dn2) };
      const between = (k) => B[k]; // the boundary between step k and k+1
      let o = this.octave;
      for (let k = 0; k < 4; k++) {
        if (o < 2 && v >= between(o) + h / 2) o++;
        else if (o > -2 && v <= between(o - 1) - h / 2) o--;
        else break;
      }
      this.octave = P.leanMode === "octave" ? o : 0;
      // breath: where v sits inside the current step (−0.5…+0.5 round its middle), like blowing harder toward the break
      const mid = (k) => ({ 0: (B[-1] + B[0]) / 2, 1: (B[0] + B[1]) / 2, 2: B[1] + 0.3, "-1": (B[-2] + B[-1]) / 2, "-2": B[-2] - 0.3 })[k];
      this.breath = P.leanMode === "octave" ? Math.max(-0.6, Math.min(0.6, v - mid(this.octave))) : 0;
      const ru = Math.sign(roll) * Math.min(1, Math.max(0, Math.abs(roll) - P.deadDeg) / Math.max(1, P.rollFullDeg - P.deadDeg));
      this.emit({ type: "tilt", t, octave: this.octave,
        bend: (P.leanMode === "bend" ? cont * P.bendRange : 0) + (P.rollMode === "bend" ? ru * P.bendRange : 0),
        vib: P.rollMode === "vibrato" ? Math.abs(ru) * P.vibMax : 0,
        bright: P.leanMode === "brightness" ? cont * P.leanBright * 1200 : P.leanMode === "octave" ? this.breath * P.breathBright : 0 });
    }
  }

  class TouchGestures {
    /* areas(): {left: DOMRect, right: DOMRect}; rows(): pitch list; emit(event);
       opts(): {contactOn, decideMs, cal: {left: thresholds|null, right: ...}, sizeRange: {left:[lo,hi], right:[lo,hi]}} */
    constructor(areas, rows, emit, opts) {
      this.areas = areas; this.rows = rows; this.emit = emit; this.held = new Map();
      this.opts = opts || (() => ({ contactOn: false, decideMs: 0, cal: {}, sizeRange: {} }));
      this.stable = []; // ms until the class settled, recent notes
      this.hitFn = null; // (side, x, y) -> row; the piano layout sets it, else rows by height
    }
    rowOf(side, x, y) { const r = this.areas()[side]; return this.hitFn ? this.hitFn(side, x, y) : rowAt(this.rows().length, y - r.top, r.height); }
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
      const row = this.rowOf(side, x, y);
      const size = contact && contact.width > 1 ? contact.width : null;
      const hd = { side, row, setY: y, setX: x, pend: null, t0: t, seq: size == null ? [] : [[0, size]], fired: false, contact };
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
      const r = this.areas()[hd.side], n = this.rows().length;
      const row = this.rowOf(hd.side, x, y);
      // free.ts: on the keyboard a slide may go sideways (white to black and back): the distance moved, both ways
      const moved = this.hitFn ? Math.hypot(x - hd.setX, y - hd.setY) : Math.abs(y - hd.setY);
      if (row === hd.row || moved < Math.max(SLIDE_MIN_PX, rowH(n, r.height) * 0.5)) { hd.pend = null; return; }
      if (!hd.pend || hd.pend.row !== row) hd.pend = { row, since: t, y, x };
      else { hd.pend.y = y; hd.pend.x = x; }
      this.tick(t);
    }
    tick(t) {
      const rows = this.rows();
      for (const [id, hd] of this.held) {
        if (!hd.fired && t - hd.t0 >= this.opts().decideMs) this.fire(id, hd, t);
        if (!hd.done && t - hd.t0 > 400) this.settle(hd);
        const p = hd.pend;
        if (!p || t - p.since < SLIDE_DWELL_MS) continue;
        hd.pend = null; hd.row = p.row; hd.setY = p.y; hd.setX = p.x;
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
  window.TouchGest = { doToDo, Keyboard, KB_DEFAULT, keyboardRows, PIANO_WHITES, TouchGestures, TiltReader, CLASSES, classify, sizeAt, fitThresholds, stableAfter, freeRows, rowAt, rowMid, rowH, noteName, NAMES, MARGIN, SLIDE_DWELL_MS };
})();
