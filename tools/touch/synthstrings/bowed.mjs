// A bowed-string digital waveguide (J. O. Smith's: two delay lines either side of the bow point, a friction curve at the
// bow, a one-pole loss filter at the bridge and the nut), in plain JS as an AudioWorklet would run it: the cost per voice.
const SR = 48000;
function voice(f0, secs) {
  const N = Math.round(SR / f0), beta = 0.127; // bow at 1/8 of the string from the bridge
  const nb = Math.max(2, Math.round(N * beta)), nn = Math.max(2, N - nb);
  const bridge = new Float32Array(nb), nut = new Float32Array(nn);
  let ib = 0, in_ = 0, lpB = 0, lpN = 0;
  const out = new Float32Array(Math.round(secs * SR));
  const vb = 0.2, fb = 3.0; // bow velocity, bow force (the friction curve's slope)
  for (let i = 0; i < out.length; i++) {
    const fromBridge = bridge[ib], fromNut = nut[in_];
    const vs = fromBridge + fromNut;                 // the string's velocity at the bow
    const dv = vb - vs;
    const refl = dv * Math.min(1, 1 / Math.pow(Math.abs(dv) * fb + 0.75, 4)); // the friction table (Smith's bow table)
    lpB = 0.95 * (-(fromNut + refl)) + 0.05 * lpB;   // to the bridge: inverted, lossy
    lpN = -(fromBridge + refl);                      // to the nut: inverted
    nut[in_] = lpB; bridge[ib] = lpN;
    ib = (ib + 1) % nb; in_ = (in_ + 1) % nn;
    out[i] = lpB;
  }
  return out;
}
const secs = 10, f0s = [196, 293.7, 440, 659.3, 987.8];
voice(440, 1);
const t0 = process.hrtime.bigint();
let s = 0; for (const f of f0s) s += voice(f, secs).reduce((a, x) => a + Math.abs(x), 0);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
const perVoiceSec = ms / (f0s.length * secs);
console.log(JSON.stringify({ msPerVoiceSecond: +perVoiceSec.toFixed(2), cpuShareOneVoice: +(perVoiceSec / 1000 * 100).toFixed(2) + "%", check: s > 0 }));
