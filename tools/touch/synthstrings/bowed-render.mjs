// The waveguide (bowed.mjs) rendered standalone (not in the engine): a scale of 0.5 s notes and three 4 s held notes, raw
// float32 mono at 48 kHz, with a 60 ms bow-in on the bow velocity and a 5.3 Hz, 14-cent vibrato from 0.28 s (by delay-line
// interpolation); the post filters (the body EQ, the 2.5 kHz top) are applied by bowed-post.py as the lanes would.
import fs from "node:fs";
const SR = 48000;
function note(midi, secs) {
  const f0 = 440 * 2 ** ((midi - 69) / 12), L = SR / f0, beta = 0.127;
  const size = Math.ceil(L) + 4, line = new Float32Array(size * 2);
  const bridge = new Float32Array(size), nut = new Float32Array(size);
  let ib = 0, in_ = 0, lp = 0;
  const out = new Float32Array(Math.round(secs * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const vib = t > 0.28 ? 1 + (2 ** (14 / 1200) - 1) * Math.sin(2 * Math.PI * 5.3 * t) * Math.min(1, (t - 0.28) / 0.3) : 1;
    const Lt = L / vib, nb = Math.max(2, Lt * beta), nn = Math.max(2, Lt - nb);
    const rd = (buf, w, d) => { const p = (w - d + size * 4) % size, i0 = Math.floor(p), fr = p - i0; return buf[i0] * (1 - fr) + buf[(i0 + 1) % size] * fr; };
    const fromBridge = rd(bridge, ib, nb), fromNut = rd(nut, in_, nn);
    const vb = 0.2 * Math.min(1, t / 0.06) * (t > secs - 0.12 ? Math.max(0, (secs - t) / 0.12) : 1);
    const dv = vb - (fromBridge + fromNut);
    const refl = dv * Math.min(1, 1 / Math.pow(Math.abs(dv) * 3 + 0.75, 4));
    lp = 0.6 * (-(fromNut + refl)) + 0.4 * lp;
    nut[in_] = lp; bridge[ib] = -(fromBridge + refl);
    ib = (ib + 1) % size; in_ = (in_ + 1) % size;
    out[i] = lp;
  }
  return out;
}
const seq = (ms, len, gap) => { const parts = []; for (const m of ms) { parts.push(note(m, len)); parts.push(new Float32Array(Math.round(gap * SR))); } return parts; };
const write = (name, parts, lead = 0.5) => { const n = parts.reduce((a, p) => a + p.length, 0) + lead * SR + SR; const o = new Float32Array(n); let k = lead * SR; for (const p of parts) { o.set(p, k); k += p.length; } fs.writeFileSync(name, Buffer.from(o.buffer)); };
const D = process.argv[2];
write(`${D}/wg-vscale.f32`, seq(Array.from({ length: 30 }, (_, i) => 59 + i), 0.5, 0.1));
write(`${D}/wg-vhold.f32`, seq([68, 75, 83], 4, 1.0));
write(`${D}/wg-cscale.f32`, seq(Array.from({ length: 29 }, (_, i) => 36 + i), 0.5, 0.1));
