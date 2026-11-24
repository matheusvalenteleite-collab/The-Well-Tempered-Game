/* Touch-area mode, GESTURE LAYER: raw touches in, musical events out. Knows nothing about sound.
   Events: {type:"onset", id, t, side, row, midi, contact}
           {type:"pitch", id, t, row, midi}            (a held thumb slid to another row)
           {type:"contact", id, t, contact}            (continuous: the contact's raw size/force)
           {type:"release", id, t}
   contact = {radiusX, radiusY, force, ...} as Safari reports it; no contact class yet (waits for the probe).

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

  class TouchGestures {
    /* areas(): {left: DOMRect, right: DOMRect}; rows(): pitch list; emit(event) */
    constructor(areas, rows, emit) { this.areas = areas; this.rows = rows; this.emit = emit; this.held = new Map(); }
    sideAt(x, y) {
      const A = this.areas();
      for (const side of ["left", "right"]) { const r = A[side]; if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return side; }
      return null;
    }
    down(id, t, x, y, contact) {
      const side = this.sideAt(x, y);
      if (!side) return false;
      const r = this.areas()[side], rows = this.rows(), row = rowAt(rows.length, y - r.top, r.height);
      this.held.set(id, { side, row, setY: y, pend: null });
      this.emit({ type: "onset", id, t, side, row, midi: rows[row], contact });
      return true;
    }
    move(id, t, x, y, contact) {
      const hd = this.held.get(id);
      if (!hd) return;
      if (contact) this.emit({ type: "contact", id, t, contact });
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
        const p = hd.pend;
        if (!p || t - p.since < SLIDE_DWELL_MS) continue;
        hd.pend = null; hd.row = p.row; hd.setY = p.y;
        this.emit({ type: "pitch", id, t, row: p.row, midi: rows[p.row] });
      }
    }
    up(id, t) { if (!this.held.has(id)) return; this.held.delete(id); this.emit({ type: "release", id, t }); }
    releaseAll(t) { for (const id of [...this.held.keys()]) this.up(id, t); }
  }

  const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const noteName = (m) => NAMES[pcOf(m)] + (Math.floor(m / 12) - 1);
  window.TouchGest = { TouchGestures, freeRows, rowAt, rowMid, rowH, noteName, NAMES, MARGIN, SLIDE_DWELL_MS };
})();
