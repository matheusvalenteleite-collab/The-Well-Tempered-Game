/**
 * D921, HOW TO PLAY's TRY IT: a few notes played right in the guide, on the game's own engine. The pad runs the
 * BASICS v2 stage the card names (plan.ts ACTS, runner.ts basicsRun) as BASICS runs its DO: LADDER, the music
 * waiting at the first note (at every note in 1.1), nothing failed, BASICS' timing windows, its sound; and it
 * paints BASICS' own aids (aids2.ts paintBasics2: the rings, the arrow, the gold line, the draining block, LIFT,
 * and after a wrong move exactly two arrows, YOU DID and NEEDED). The bars are the game's: each a BAR share of the
 * pad's width, STRONG by the box (protos.ts barDynamic reads the touch's x as the game does). When the take ends
 * the stage's own rule (stagePassed) says whether it was it; no score is kept, nothing is saved.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Chip } from "../../touch/chip.ts";
import { beatOf, fugueById, loadExtras } from "../../touch/fugue.ts";
import { inkOf } from "../../touch/MusicBox.tsx";
import { pixText } from "../../touch/box-fx.ts";
import { setPreset } from "../../touch/sound.ts";
import { trCanvas, lang } from "../../i18n/index.ts";
import { BASICS_PT } from "../../i18n/basics-pt.ts";
import { BASICS_ES } from "../../i18n/basics-es.ts";
import { ProtoGame, type Rows } from "../proto-game.ts";
import { BAR, protoById } from "../protos.ts";
import { LensTally } from "../manual/lens.ts";
import { ACTS, stagePassed, type Stage } from "../basics/plan.ts";
import { basicsRun } from "../basics/runner.ts";
import { paintBasics2, type MissShown } from "../basics/aids2.ts";
import { label } from "../paint-proto.ts";
import { UI, type T, type Try } from "../howto-text.ts";

const sayT = (t: T): string => (lang() === "pt" ? t.pt : lang() === "es" ? t.es : t.en);
const basicsWord = (s: string): string => (lang() === "pt" ? (BASICS_PT[s] ?? s) : lang() === "es" ? (BASICS_ES[s] ?? s) : s);

const BOX = "#0f1730";
const STRIP = "#1c1f2c";
const EDGE = "#4b8ef0";
const GOLD = "#f3d26b";
/** The box's line: a quarter of the way in, as the game's. */
const LINE_AT = 0.25;
/** Seconds of music the box shows ahead of the line. */
const AHEAD_S = 3.2;
/** How long the samples may take before the pad starts anyway (the synthesized fallback plays meanwhile). */
const LOAD_CAP_MS = 3500;

/** The stage a pad runs: BASICS' own, cut to the pad's last bar. */
export function padStage(t: Try): Stage {
  const st = ACTS.flatMap((a) => a.stages).find((s) => s.id === t.stage);
  if (!st) throw new Error(`no BASICS stage ${t.stage}`);
  return t.toBar ? { ...st, toBar: t.toBar } : st;
}

/** The game a pad plays (the test builds it the same way, on a fake chip). */
export function padGame(st: Stage, chip: Chip): ProtoGame {
  const r = basicsRun(st, "do", 0);
  return new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById("ladder"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: false, bt: false, scale: false, ornHint: false, ...(r.tut ?? {}) }, chip);
}

/** The box's rows over the pad: the player's notes' range, a little room either side. */
export function padRows(g: ProtoGame, w: number, h: number): Rows {
  const steps = g.tracks[0].notes.map((n) => n.step);
  const lo = Math.min(...steps) - 2;
  const hi = Math.max(...steps) + 2;
  const top = 26;
  const bot = h - 18;
  const rowH = Math.max(6, (bot - top) / Math.max(1, hi - lo));
  const bw = w * BAR;
  const lineX = bw + (w - 2 * bw) * LINE_AT;
  const pps = ((w - 2 * bw) * (1 - LINE_AT)) / AHEAD_S;
  return {
    rowH,
    yOf: (s) => bot - (s - lo) * rowH - rowH / 2,
    stepAt: (y) => Math.round(lo + (bot - rowH / 2 - y) / rowH),
    xOf: (tick) => lineX + ((tick - g.viewNow) / g.tps) * pps,
  };
}

type Phase = { kind: "loading" } | { kind: "play" } | { kind: "done"; passed: boolean; right: number; of: number };

export function TryPad({ t, title, chip, restore, close }: { t: Try; title: string; chip: () => Chip; restore: () => void; close: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const game = useRef<ProtoGame | null>(null);
  const miss = useRef<MissShown | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [take, setTake] = useState(0);
  const [touched, setTouched] = useState(false);
  const st = padStage(t);

  // The take: the piece (loaded if it is an extra), the stage's sound and its samples, then the game.
  useEffect(() => {
    let off = false;
    let raf = 0;
    setPhase({ kind: "loading" });
    setTouched(false);
    miss.current = null;
    void (async () => {
      if (fugueById(st.piece).id !== st.piece) await loadExtras();
      if (off) return;
      const ch = chip();
      setPreset(st.sound ?? "pianoSampled");
      const f = fugueById(st.piece);
      const pitches = f.voices.flatMap((v) => v.map((n) => n[2]));
      await Promise.race([ch.prepare(pitches, (f.voices[st.voice] ?? []).map((n) => n[2])).catch(() => {}), new Promise((r) => setTimeout(r, LOAD_CAP_MS))]);
      if (off) return;
      const g = padGame(st, ch);
      const lens = new LensTally(g);
      g.lens = lens;
      g.tap = (e) => {
        lens.feed(e);
        // As BASICS (BenchApp D689): a wrong move kept a moment, the move made beside the move needed.
        if (e.kind === "note" && !e.ok && e.ladder?.steps !== undefined && e.ladder.movedPx !== undefined) {
          const last = g.lastBySide[e.side];
          const made = Math.abs(e.ladder.movedPx) < (e.ladder.needPx ?? 6) ? 0 : Math.sign(e.ladder.movedPx);
          const y = last?.y ?? 0;
          miss.current = { side: e.side, needed: Math.sign(e.ladder.steps), made, y0: y + e.ladder.movedPx, y, at: performance.now() };
        }
      };
      game.current = g;
      setPhase({ kind: "play" });
      const loop = () => {
        const cv = canvas.current;
        const gg = game.current;
        if (!cv || !gg) return;
        const W = cv.clientWidth || 300;
        const H = cv.clientHeight || 200;
        gg.rows = padRows(gg, W, H);
        const ended = gg.step();
        paintPad(cv, gg, st, miss.current);
        if (ended) {
          const r = gg.results();
          game.current = null;
          setPhase({ kind: "done", passed: stagePassed(st, r), right: r.right, of: r.of });
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      off = true;
      cancelAnimationFrame(raf);
      game.current?.stopAll();
      game.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, t.stage]);
  // Leaving the pad gives the piece its sound back.
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  useEffect(() => () => restoreRef.current(), []);

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = area.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable: the lift still arrives */
    }
    if (!touched) setTouched(true);
    const p = at(e);
    game.current?.down(e.pointerId, { side: p.x < p.w / 2 ? "left" : "right", ...p }, e.timeStamp);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const p = at(e);
    game.current?.move(e.pointerId, { side: p.x < p.w / 2 ? "left" : "right", ...p }, e.timeStamp);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => game.current?.up(e.pointerId, e.timeStamp, e.type === "pointercancel");

  return (
    <div className="howto-pad" id="howto-pad" role="dialog" aria-label={`${sayT(UI.tryIt)} · ${title}`}>
      <header className="howto-pad-head">
        <b>{title}</b>
        <span className="howto-pad-say" id="howto-pad-say">
          {phase.kind === "loading" ? sayT(UI.loading) : phase.kind === "play" ? (touched ? basicsWord(st.hint) : sayT(UI.waiting)) : ""}
        </span>
        <button type="button" className="howto-pill" id="howto-pad-again" onClick={() => setTake((k) => k + 1)}>
          ↺ {sayT(UI.again)}
        </button>
        <button type="button" className="howto-pill howto-pill-on" id="howto-pad-done" onClick={close}>
          {sayT(UI.done)}
        </button>
      </header>
      <div ref={area} className="howto-pad-area" id="howto-pad-area" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={canvas} className="howto-pad-canvas" />
        {phase.kind === "done" && (
          <div className={`howto-pad-result${phase.passed ? " ok" : ""}`} id="howto-pad-result" aria-live="polite">
            <b>{phase.passed ? sayT(UI.passed) : basicsWord(st.hint)}</b>
            <span>{sayT(UI.right).replace("{n}", String(phase.right)).replace("{of}", String(phase.of))}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** The pad's picture: the game's strips, box and gold line; the other voices dim, yours full and rimmed; BASICS' aids; the verdict words by the thumb. */
function paintPad(cv: HTMLCanvasElement, g: ProtoGame, st: Stage, miss: MissShown | null) {
  const W = cv.clientWidth || 300;
  const H = cv.clientHeight || 200;
  const dpr = Math.min(3, devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) (cv.width = Math.round(W * dpr)), (cv.height = Math.round(H * dpr));
  const c = cv.getContext("2d");
  const rows = g.rows;
  if (!c || !rows) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bw = W * BAR;
  c.fillStyle = STRIP;
  c.fillRect(0, 0, W, H);
  c.fillStyle = BOX;
  c.fillRect(bw, 0, W - 2 * bw, H);
  c.fillStyle = EDGE;
  c.fillRect(bw - 2, 0, 2, H);
  c.fillRect(W - bw, 0, 2, H);
  // STRONG by the box, SOFT by the edge (D315), at the bars' top as the game writes them.
  for (const side of ["left", "right"] as const) {
    const x0 = side === "left" ? 0 : W - bw;
    label(c, trCanvas("SOFT"), side === "left" ? x0 + 6 : x0 + bw - 6, 12, "#8c88aa", 7, side === "left" ? "left" : "right");
    label(c, trCanvas("STRONG"), side === "left" ? x0 + bw - 6 : x0 + 6, 12, "#8c88aa", 7, side === "left" ? "right" : "left");
  }
  const f = g.f;
  const tps = g.tps;
  const xOf = rows.xOf;
  const n = f.voices.length;
  c.save();
  c.beginPath();
  c.rect(bw, 0, W - 2 * bw, H);
  c.clip();
  const bh = Math.max(4, Math.min(10, rows.rowH * 0.8));
  const pxPerTick = (xOf(tps) - xOf(0)) / tps;
  // The other voices, when the stage plays them: dim and thin, at their rows (the box's range only).
  if (!st.solo) {
    for (let v = 0; v < n; v++) {
      if (v === st.voice) continue;
      c.fillStyle = inkOf(v, n);
      c.globalAlpha = 0.45;
      for (const [on, dur, , step] of f.voices[v]) {
        const x = xOf(on);
        const w = Math.max(2, dur * pxPerTick - 1);
        if (x > W || x + w < bw) continue;
        const y = rows.yOf(step);
        if (y < 0 || y > H) continue;
        c.fillRect(Math.round(x), Math.round(y - bh / 2 + 1), Math.round(w), Math.max(1, Math.round(bh - 2)));
      }
    }
    c.globalAlpha = 1;
  }
  // Yours: full, rimmed in white; a hit shines, a miss goes dark (the game's).
  const ink = inkOf(st.voice, n);
  g.tracks[0].notes.forEach((nt, i) => {
    const x = xOf(nt.on);
    const w = Math.max(3, nt.dur * pxPerTick - 2);
    if (x > W || x + w < bw) return;
    const y = Math.round(rows.yOf(nt.step) - bh / 2);
    c.globalAlpha = nt.state === "miss" ? 0.3 : 1;
    c.fillStyle = ink;
    c.fillRect(Math.round(x), y, Math.round(w), Math.round(bh));
    c.fillStyle = "#ffffff";
    c.globalAlpha = nt.state === "miss" ? 0.25 : 0.9;
    c.fillRect(Math.round(x), y - 1, Math.round(w), 1);
    c.fillRect(Math.round(x), y + Math.round(bh), Math.round(w), 1);
    if (nt.state === "hit") {
      c.globalAlpha = 0.35;
      c.fillRect(Math.round(x), y, Math.round(w), Math.round(bh));
    }
    c.globalAlpha = 1;
    const orn = g.ornamentAt(0, i);
    if (orn) pixText(c, orn, Math.round(x), y - 9, GOLD);
  });
  c.restore();
  // The gold line, now.
  c.fillStyle = GOLD;
  c.fillRect(Math.round(xOf(g.viewNow)), 0, 2, H);
  // BASICS' aids, as BASICS draws them in DO.
  paintBasics2(c, W, H, g, { aids: st.aids, alpha: 1, ...(st.side ? { side: st.side } : {}), miss, beat: beatOf(f).ticks });
  // A thumb down: a soft disc where it is.
  for (const d of g.thumbsDown()) {
    c.fillStyle = "rgba(255,255,255,0.22)";
    c.beginPath();
    c.arc(d.side === "left" ? bw / 2 : W - bw / 2, d.y, Math.max(9, bw * 0.13), 0, Math.PI * 2);
    c.fill();
  }
  // The verdict (PERFECT, GOOD, ✕, MISS) and the end's word (HELD, TOO SOON, REST!), by the thumb, for a moment.
  const now = performance.now();
  const gr = g.grade;
  if (gr && now - gr.at < 700) {
    const ink2 = gr.text === "PERFECT" ? "#ffd23f" : gr.text === "GOOD" ? "#5fdc6a" : "#d8443a";
    label(c, trCanvas(gr.text), gr.side === "left" ? bw / 2 : gr.side === "right" ? W - bw / 2 : W / 2, H * 0.5 - 14, ink2, 9);
  }
  const fl = g.flash;
  if (fl && now - fl.at < 900) label(c, trCanvas(fl.text), W / 2, H - 8, fl.good ? "#5fdc6a" : "#f0784a", 8);
}
