/* Shared by both modes: the audio start (with the iOS silent-switch workaround),
   the raw touch-property reader, and the CSV recorder. */
(function () {
  "use strict";
  let ctx = null;

  function silentWavUrl() {
    const sr = 8000, n = sr, b = new ArrayBuffer(44 + n * 2), d = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true);
    d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }

  /* One AudioContext for the whole page, started from a tap. Returns it. */
  function unlockAudio(log) {
    if (ctx) { if (ctx.state !== "running") ctx.resume(); return ctx; }
    try { if (navigator.audioSession) { navigator.audioSession.type = "playback"; log("audioSession.type = playback (" + navigator.audioSession.type + ")"); } else log("navigator.audioSession not available"); } catch (e) { log("audioSession error " + e.message); }
    try { const a = new Audio(silentWavUrl()); a.loop = true; a.setAttribute("playsinline", ""); a.play().then(() => log("silent <audio> loop playing"), (e) => log("silent <audio> refused: " + e.message)); } catch (e) { log("silent audio error " + e.message); }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    ctx.resume();
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(() => log("screen wake lock on"), () => log("screen wake lock refused"));
    return ctx;
  }

  /* Event time on the performance.now() clock. */
  function evTime(e) { const t = e.timeStamp; return t > 1e12 ? t - performance.timeOrigin : t; }

  /* Everything a Touch object may carry about the contact (undefined = not exposed). */
  function touchProps(tc) {
    return { radiusX: tc.radiusX, radiusY: tc.radiusY, rotationAngle: tc.rotationAngle, force: tc.force,
      webkitForce: tc.webkitForce, webkitRadiusX: tc.webkitRadiusX, webkitRadiusY: tc.webkitRadiusY,
      touchType: tc.touchType, altitudeAngle: tc.altitudeAngle };
  }

  /* CSV recorder: one row per raw input event while recording. */
  const COLS = ["t_ms", "mode", "event", "id", "zone", "x", "y", "radiusX", "radiusY", "force", "webkitForce",
    "pressure", "width", "height", "alpha", "beta", "gamma", "accX", "accY", "accZ", "rotA", "rotB", "rotG", "note"];
  const csv = {
    on: false, rows: [], t0: 0,
    start() { this.rows = []; this.t0 = performance.now(); this.on = true; },
    stop() { this.on = false; },
    add(r) {
      if (!this.on) return;
      if (this.rows.length >= 200000) { this.on = false; return; }
      const t = r.t_ms != null ? r.t_ms : performance.now();
      this.rows.push(COLS.map((k) => { const v = k === "t_ms" ? t - this.t0 : r[k]; return v == null ? "" : typeof v === "number" ? (Number.isInteger(v) ? v : +v.toFixed(3)) : String(v).replace(/[,\n"]/g, " "); }).join(","));
    },
    text() { return COLS.join(",") + "\n" + this.rows.join("\n") + "\n"; },
    /* Save as a file: the claude.ai downloads capability inside an Artifact, a plain download elsewhere.
       Resolves to a short message for the screen. */
    async save(filename) {
      const data = this.text();
      try {
        const dl = window.claude && window.claude.use ? await Promise.race([window.claude.use("downloads"), new Promise((r) => setTimeout(() => r(null), 1500))]) : null;
        if (dl) { await dl.save({ filename, data }); return "Saved " + filename; }
      } catch (e) { return "Save refused (" + (e && e.code || e) + "): copy the text instead"; }
      try {
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "text/csv" })); a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        return "Download started (if nothing happens, copy the text)";
      } catch (e) { return "Download failed: copy the text instead"; }
    },
  };

  /* Copy text: clipboard API in the click, else select it for the phone's own Copy. */
  function copyText(ta, done) {
    const fallback = () => { ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); let ok = false; try { ok = document.execCommand("copy"); } catch (e) { /* none */ } done(ok ? "Copied" : "Text selected: use the phone's Copy"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => done("Copied"), fallback); else fallback();
  }

  window.Shared = { unlockAudio, evTime, touchProps, csv, copyText, audio: () => ctx };
})();
