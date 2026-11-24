/* Touch-area mode, PRACTICE: four items for learning the two kinds of press (not flat, flat).
   Every drill plays through the real gesture and sound layers (you hear what you pressed) and judges the
   kind from your calibration, exactly as play would. Results are kept on this device with the date.
     1 Mixed: 30 prompts, kind and area at random (balanced).
     2 Rhythm: with the loop, one bar of count-in, then 8 bars of 4 beats, each beat a kind; bars alternate
       left and right areas. Judged on the kind and on the timing (±200 ms window round each beat).
     3 Two thumbs: 18 prompts, a kind for each area at once (left and right pressed together).
     4 Progress: every finished drill, with date, accuracy per kind and per area, and timing. */
(function (root) {
  "use strict";
  const KINDS = ["normal", "flat"]; // two kinds since 24 Nov 2026: not flat, flat
  const NAME = { normal: "NOT FLAT", flat: "FLAT" };
  const SHORT = { normal: "N", flat: "F" };

  /* ---------- pure parts (tested in node) ---------- */
  function rand(seed) { let r = seed || Date.now() % 2147483647 || 1; return () => ((r = (r * 16807) % 2147483647) / 2147483647); }
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  /* n prompts, kinds (and sides) as even as n allows, shuffled */
  function makeDeck(n, sides, rnd) { // kinds even, sides even, each shuffled on its own
    const fill = (list) => shuffle(Array.from({ length: n }, (_, i) => list[i % list.length]), rnd);
    const ks = fill(KINDS), ss = fill(sides);
    return ks.map((kind, i) => ({ side: ss[i], kind }));
  }
  function tally(items) { // items: {side, kind, got}
    const by = (f) => { const m = {}; for (const it of items) { const k = f(it); m[k] = m[k] || { n: 0, ok: 0 }; m[k].n++; if (it.got === it.kind) m[k].ok++; } return m; };
    const confusion = {}; for (const k of KINDS) { confusion[k] = { normal: 0, flat: 0, none: 0 }; }
    for (const it of items) confusion[it.kind][it.got || "none"]++;
    const ok = items.filter((it) => it.got === it.kind).length;
    return { n: items.length, ok, pct: items.length ? (100 * ok) / items.length : 0, byKind: by((it) => it.kind), bySide: by((it) => it.side), confusion };
  }
  /* beats: [{t (s), side, kind}], onsets: [{t (s), side, kind}] -> one judgement per beat (nearest unused onset
     on that side within ±win) and the extra onsets */
  function rhythmScore(beats, onsets, win = 0.2) {
    const used = new Set(), res = [];
    for (const b of beats) {
      let best = -1, bd = Infinity;
      onsets.forEach((o, i) => { if (!used.has(i) && o.side === b.side && Math.abs(o.t - b.t) <= win && Math.abs(o.t - b.t) < bd) { bd = Math.abs(o.t - b.t); best = i; } });
      if (best < 0) { res.push({ ...b, got: null, err: null }); continue; }
      used.add(best);
      res.push({ ...b, got: onsets[best].kind, err: (onsets[best].t - b.t) * 1000 });
    }
    const errs = res.filter((r) => r.err != null).map((r) => r.err);
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return { res, missed: res.filter((r) => r.got === null).length, extra: onsets.length - used.size,
      meanAbsMs: mean(errs.map(Math.abs)), meanMs: mean(errs), tally: tally(res) };
  }

  /* ---------- the screen ---------- */
  function boot() {
    const H = root.__touchHooks, $ = (id) => document.getElementById(id);
    if (!H || !$("prPanel")) return;
    const G = root.TouchGest;
    let run = null;
    const pct = (x) => (x == null ? "–" : x.toFixed(0) + "%");
    const kindOf = (ev) => { const f = H.fit()[ev.side]; return f ? G.classify(f, ev.size) : null; };
    const show = (title, prompt, info, last) => { $("prTitle").textContent = title; $("prPrompt").textContent = prompt; $("prInfo").textContent = info; $("prLast").textContent = last || ""; };
    function open() { H.panel(true); $("prMenu").hidden = false; $("prRun").hidden = true; H.target(null); show("PRACTICE", "", "", H.fit().left && H.fit().right ? "Calibrated " + (H.calDate() || "").slice(0, 16).replace("T", " ") : "Calibrate first (Settings)."); }
    function close() { stop(); H.panel(false); H.target(null); }
    function stop() { if (run) { H.unlisten(run.fn); if (run.timer) clearInterval(run.timer); if (run.loopWas === false) H.loopOn(false); run = null; } $("prMenu").hidden = false; $("prRun").hidden = true; H.target(null); }
    function begin(kind, fn) {
      if (!H.fit().left || !H.fit().right) { show("PRACTICE", "", "", "Calibrate both areas first (Settings → Calibrate)."); return false; }
      if (!H.T().contactOn) H.setContactOn(true); // you hear the kind you pressed
      H.releaseAll();
      run = { kind, fn, t0: new Date().toISOString() }; H.listen(fn);
      $("prMenu").hidden = true; $("prRun").hidden = false;
      return true;
    }
    function finish(entry) {
      stop();
      entry.date = new Date().toISOString(); entry.cal = H.calDate(); entry.decideMs = H.T().decideMs;
      const all = load(); all.push(entry); try { localStorage.setItem("touchpractice", JSON.stringify(all)); } catch (e) { /* none */ }
      overlay(summary(entry) + "\n\nSaved. Progress (item 4) lists every session.");
    }
    const load = () => { try { return JSON.parse(localStorage.getItem("touchpractice") || "[]"); } catch (e) { return []; } };

    /* 1 Mixed */
    function mixed() {
      const deck = makeDeck(30, ["left", "right"], rand()), items = [];
      let i = 0, down = false;
      const prompt = () => { const d = deck[i]; H.target(d.side); show(`MIXED ${i + 1}/30`, `${d.side === "left" ? "LEFT" : "RIGHT"}\n${NAME[d.kind]}`, `${items.filter((x) => x.got === x.kind).length} right`, items.length ? lastText(items[items.length - 1]) : ""); };
      const fn = (ev) => {
        if (ev.type === "onset" && !down) {
          if (ev.side !== deck[i].side) { $("prLast").textContent = "other area: try again"; return; }
          down = true; items.push({ ...deck[i], got: kindOf(ev), size: ev.size });
        }
        if (ev.type === "release" && down) { down = false; i++; if (i >= deck.length) return finish({ drill: "mixed", tally: tally(items), items }); prompt(); }
      };
      if (begin("mixed", fn)) prompt();
    }
    const lastText = (it) => `last: ${it.got === it.kind ? "✓" : "✗"} asked ${it.kind}, got ${it.got || "?"}${it.size != null ? " (" + it.size.toFixed(0) + " px)" : ""}`;

    /* 2 Rhythm */
    function rhythm() {
      const ctx = H.ctx(); if (!ctx) return;
      const deck = makeDeck(32, ["x"], rand()).map((d) => d.kind), bars = 8;
      const loopWas = H.T().loopOn;
      const onsets = [];
      const fn = (ev) => { if (ev.type === "onset") onsets.push({ t: ctx.currentTime - (H.now() - ev.t) / 1000, side: ev.side, kind: kindOf(ev), size: ev.size }); };
      if (!begin("rhythm", fn)) return;
      run.loopWas = loopWas;
      const t0 = H.loopOn(true), spb = 60 / H.T().bpm;
      const beats = []; for (let b = 0; b < bars; b++) for (let k = 0; k < 4; k++) beats.push({ t: t0 + (4 + b * 4 + k) * spb, side: b % 2 ? "right" : "left", kind: deck[b * 4 + k] });
      const bpmAt = H.T().bpm;
      run.timer = setInterval(() => {
        if (H.T().bpm !== bpmAt) { stop(); show("RHYTHM", "", "", "Stopped: the tempo changed."); return; }
        // the beat shown is the nearest one: from halfway after a beat on, the screen shows the coming beat
        const now = ctx.currentTime, beat = Math.floor((now - t0) / spb + 0.5);
        if (beat < 4) { H.target(null); show("RHYTHM: count-in", `${4 - beat}`, "next: LEFT " + deck.slice(0, 4).map((k) => SHORT[k]).join(" "), "N not flat · F flat"); return; }
        const bar = Math.floor((beat - 4) / 4), inBar = (beat - 4) % 4;
        if (bar >= bars) { if (now > beats[beats.length - 1].t + 0.3) { const sc = rhythmScore(beats, onsets.filter((o) => o.t >= beats[0].t - 0.25)); finish({ drill: "rhythm", bpm: bpmAt, tally: sc.tally, missed: sc.missed, extra: sc.extra, meanAbsMs: sc.meanAbsMs, meanMs: sc.meanMs, items: sc.res.map((r) => ({ side: r.side, kind: r.kind, got: r.got, err: r.err })) }); } return; }
        const side = bar % 2 ? "right" : "left"; H.target(side);
        const pat = deck.slice(bar * 4, bar * 4 + 4).map((k, j) => (j === inBar ? `[${SHORT[k]}]` : SHORT[k])).join(" ");
        const nxt = bar + 1 < bars ? `next: ${bar % 2 ? "LEFT" : "RIGHT"} ` + deck.slice((bar + 1) * 4, (bar + 1) * 4 + 4).map((k) => SHORT[k]).join(" ") : "last bar";
        show(`RHYTHM bar ${bar + 1}/${bars}`, `${side === "left" ? "LEFT" : "RIGHT"}\n${pat}`, nxt, "N not flat · F flat");
      }, 30);
    }

    /* 3 Two thumbs */
    function two() {
      const rnd = rand(), pairs = [];
      for (const a of KINDS) for (const b of KINDS) pairs.push([a, b]);
      const deck = shuffle([...pairs, ...pairs, ...pairs, ...pairs], rnd); // 16: every combination four times
      const items = [], gaps = [];
      let i = 0, cur = null;
      const prompt = () => { const [l, r] = deck[i]; H.target("both"); show(`TWO THUMBS ${i + 1}/${deck.length}`, `L ${NAME[l]}\nR ${NAME[r]}`, `${items.filter((x) => x.got === x.kind).length / 2 | 0} pairs right`, ""); cur = { l: null, r: null, held: 0 }; };
      const fn = (ev) => {
        if (ev.type === "onset") { cur.held++; const s = ev.side === "left" ? "l" : "r"; if (!cur[s]) cur[s] = { kind: kindOf(ev), t: ev.t, size: ev.size }; }
        if (ev.type === "release") {
          cur.held = Math.max(0, cur.held - 1);
          if (cur.held === 0 && cur.l && cur.r) {
            const [l, r] = deck[i];
            items.push({ side: "left", kind: l, got: cur.l.kind }, { side: "right", kind: r, got: cur.r.kind });
            gaps.push(Math.abs(cur.l.t - cur.r.t));
            $("prLast").textContent = `last: L ${cur.l.kind === l ? "✓" : "✗ " + (cur.l.kind || "?")}  R ${cur.r.kind === r ? "✓" : "✗ " + (cur.r.kind || "?")}  together within ${Math.abs(cur.l.t - cur.r.t).toFixed(0)} ms`;
            i++;
            if (i >= deck.length) {
              const both = deck.filter((_, j) => items[2 * j].got === items[2 * j].kind && items[2 * j + 1].got === items[2 * j + 1].kind).length;
              return finish({ drill: "two", tally: tally(items), pairsRight: both, pairs: deck.length, meanGapMs: gaps.reduce((a, b) => a + b, 0) / gaps.length, items });
            }
            const keep = $("prLast").textContent; prompt(); $("prLast").textContent = keep;
          }
        }
      };
      if (begin("two", fn)) prompt();
    }

    /* reports */
    function summary(e) {
      const t = e.tally, L = [];
      const head = { mixed: "MIXED (30 prompts)", rhythm: `RHYTHM (32 beats at ${e.bpm} ♩/min)`, two: `TWO THUMBS (${e.pairs} pairs)` }[e.drill];
      L.push(`${head}  ${e.date.slice(0, 16).replace("T", " ")}`);
      L.push(`kinds right: ${t.ok} of ${t.n} (${pct(t.pct)})` + (e.drill === "two" ? `; both thumbs right: ${e.pairsRight} of ${e.pairs}; pressed together within ${e.meanGapMs.toFixed(0)} ms on average` : ""));
      if (e.drill === "rhythm") L.push(`beats missed ${e.missed}, extra taps ${e.extra}; timing off by ${e.meanAbsMs == null ? "–" : e.meanAbsMs.toFixed(0)} ms on average (${e.meanMs == null ? "" : e.meanMs < 0 ? "early" : "late"} ${e.meanMs == null ? "" : Math.abs(e.meanMs).toFixed(0) + " ms overall"})`);
      L.push("by kind:  " + KINDS.map((k) => `${NAME[k].toLowerCase()} ${t.byKind[k] ? pct((100 * t.byKind[k].ok) / t.byKind[k].n) : "–"}`).join("   "));
      L.push("by area:  " + ["left", "right"].map((s) => `${s} ${t.bySide[s] ? pct((100 * t.bySide[s].ok) / t.bySide[s].n) : "–"}`).join("   "));
      L.push("asked → heard as   not-flat  flat  none");
      for (const k of KINDS) { const c = t.confusion[k]; L.push(`  ${NAME[k].toLowerCase().padEnd(16)} ${String(c.normal).padStart(8)} ${String(c.flat).padStart(5)} ${String(c.none).padStart(5)}`); }
      return L.join("\n");
    }
    function progress() {
      const all = load();
      if (!all.length) { overlay("No practice sessions yet."); return; }
      const L = ["PRACTICE PROGRESS (this device)", "date              drill    right  notflat  flat   left right  timing  cal. of", ""];
      for (const e of all) {
        const t = e.tally, k = (x) => (t.byKind[x] ? pct((100 * t.byKind[x].ok) / t.byKind[x].n) : "–"), s = (x) => (t.bySide[x] ? pct((100 * t.bySide[x].ok) / t.bySide[x].n) : "–");
        L.push(`${e.date.slice(0, 16).replace("T", " ")}  ${e.drill.padEnd(7)} ${pct(t.pct).padStart(5)}  ${k("normal").padStart(7)} ${k("flat").padStart(5)}  ${s("left").padStart(5)} ${s("right").padStart(5)}  ${e.drill === "rhythm" && e.meanAbsMs != null ? (e.meanAbsMs.toFixed(0) + "ms").padStart(6) : e.drill === "two" ? (e.meanGapMs.toFixed(0) + "ms⇄").padStart(6) : "     –"}  ${(e.cal || "").slice(5, 16).replace("T", " ")}`);
      }
      L.push("", "timing: rhythm = average distance from the beat; two thumbs (⇄) = average gap between the thumbs.", "", "DETAIL", ...all.map(summary));
      overlay(L.join("\n"));
    }
    function overlay(text) { $("prOvText").value = text; $("prOvMsg").textContent = ""; $("prOverlay").hidden = false; }
    $("tPractice").onclick = open;
    $("prClose").onclick = close; $("prStop").onclick = () => { stop(); show("PRACTICE", "", "", "Stopped (nothing saved)."); };
    $("prMixed").onclick = mixed; $("prRhythm").onclick = rhythm; $("prTwo").onclick = two; $("prProgress").onclick = progress;
    $("prOvClose").onclick = () => { $("prOverlay").hidden = true; };
    $("prOvCopy").onclick = () => root.Shared.copyText($("prOvText"), (m) => { $("prOvMsg").textContent = m; });
  }

  root.Practice = { makeDeck, tally, rhythmScore, rand, KINDS };
  if (typeof document !== "undefined" && document.getElementById) boot();
})(typeof window !== "undefined" ? window : globalThis);
