/* Loop maker, CORE: the pure parts (no page, no sound), tested in node.
   Times are in seconds. A take's times are relative to the top of the loop pass it was recorded in, on the
   audio clock, already corrected by the latency offset; they may run past the loop's end (a note held across
   the boundary) and are kept verbatim: quantizing happens only when a take is played or drawn. */
(function (root) {
  "use strict";

  function loopLen(s) { return s.bars * s.beats * (60 / s.bpm); }
  function barLen(s) { return s.beats * (60 / s.bpm); }
  const mod = (x, m) => ((x % m) + m) % m;

  /* Quantize an onset time: off = raw; light = halfway to the nearest sixteenth; strong = onto it.
     Returns the shift to apply to the whole note (its sub-events move with it). */
  function qShift(at, s, mode) {
    if (mode === "off") return 0;
    const grid = 60 / s.bpm / 4, target = Math.round(at / grid) * grid;
    return (target - at) * (mode === "light" ? 0.5 : 1);
  }

  /* A finished take's notes for playback: each note's start folded into the loop [0, L), quantized,
     its duration capped just under one loop (so a note never overlaps its own next pass). */
  function playNotes(take, s, mode) {
    const L = loopLen(s);
    return take.notes.map((n) => {
      const sh = qShift(n.on, s, mode);
      const on = mod(n.on + sh, L);
      // a note still held (no release yet: the take is being reviewed while the thumb is down) runs open
      const dur = n.off != null ? Math.max(0.03, Math.min(L - 0.01, n.off - n.on)) : L - 0.01;
      return { ...n, start: on, dur, shift: sh, src: n };
    });
  }
  /* Tilt events within the pass (wrapped), sorted; the state at the pass's top is the last one before. */
  function playTilt(take, s) {
    const L = loopLen(s);
    return (take.tilt || []).filter((e) => e.at < L).map((e) => ({ ...e, at: mod(e.at, L) })).sort((a, b) => a.at - b.at);
  }

  /* The finale: the voices enter one at a time in the order they were recorded (one pass each, the earlier
     ones carrying on), then everything twice. Returns a list of passes: [voice ids], and the total length. */
  function finalePlan(voiceIds) {
    const passes = [];
    for (let i = 0; i < voiceIds.length; i++) passes.push(voiceIds.slice(0, i + 1));
    if (voiceIds.length) { passes.push(voiceIds.slice()); passes.push(voiceIds.slice()); }
    return passes;
  }

  /* Latency calibration: taps against click times -> the offset (median), its spread, and how many matched. */
  function latencyFrom(clicks, taps, win = 0.25) {
    const d = [];
    for (const t of taps) { let best = null; for (const c of clicks) if (Math.abs(t - c) <= win && (best === null || Math.abs(t - c) < Math.abs(best))) best = t - c; if (best !== null) d.push(best); }
    if (d.length < 4) return null;
    const s = d.slice().sort((a, b) => a - b), med = s[Math.floor(s.length / 2)];
    const mad = s.map((x) => Math.abs(x - med)).sort((a, b) => a - b)[Math.floor(s.length / 2)];
    return { offset: med, spread: mad, n: d.length };
  }

  /* WAV (16-bit PCM) and a stored (uncompressed) ZIP holding it (the artifact frame only saves .zip, not .wav). */
  function wavBytes(chans, sr) {
    const n = chans[0].length, nc = chans.length, b = new ArrayBuffer(44 + n * nc * 2), d = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); d.setUint32(4, 36 + n * nc * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true); d.setUint16(22, nc, true); d.setUint32(24, sr, true); d.setUint32(28, sr * nc * 2, true);
    d.setUint16(32, nc * 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * nc * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); d.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
    return new Uint8Array(b);
  }
  let CRC = null;
  function crc32(u8) {
    if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zipOne(name, data) {
    const nm = new TextEncoder().encode(name), crc = crc32(data), size = data.length;
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nm.length, true);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, nm.length, true);
    const cdOff = 30 + nm.length + size;
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true); end.setUint32(12, 46 + nm.length, true); end.setUint32(16, cdOff, true);
    const parts = [new Uint8Array(lh.buffer), nm, data, new Uint8Array(ch.buffer), nm, new Uint8Array(end.buffer)];
    const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  root.LoopCore = { loopLen, barLen, mod, qShift, playNotes, playTilt, finalePlan, latencyFrom, wavBytes, zipOne, crc32 };
})(typeof window !== "undefined" ? window : globalThis);
