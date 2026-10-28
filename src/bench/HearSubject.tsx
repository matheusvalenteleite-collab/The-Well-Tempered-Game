/**
 * D272, HEAR THE SUBJECT (play.html's list): the fugue's subject as the chosen reading says to play it,
 * drawn and heard: each note a block at its pitch and length, a slurred group under its slur (D370; a plain join a line), detached ones
 * with a gap, short ones dotted, accents marked, the level written; a light runs along as it sounds.
 * The readings (at most three) as buttons, the author's words and pages below. D325: NONE (my own
 * articulation) first, the default, and every reading open from the start; the one chosen is the run's.
 */
import { lang, pieceName, tr } from "../i18n/index.ts";
import { useEffect, useRef, useState } from "react";
import { fugueById } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { ornamentsOf, shakeOf } from "../touch/ornament-play.ts";
import { bestReading, chooseReading, chosenReading, NO_READING, performSubject, readingsOf, slurredJoin, type Reading } from "../touch/readings.ts";
import { acrossBar, drawThumb, planFingerings, type Touch } from "./fingering.ts";
import { STRONG_SIDE, strengthOf } from "../touch/touch-expr.ts";
import { markLegend } from "../touch/readings.ts";
import { tempoOf } from "../touch/tempi.ts";
import { kindsOf } from "../touch/practice.ts";
import { characterOf } from "../touch/character.ts";
import { preset } from "../touch/sound.ts";
import { firstEntry, subjectSounds, type Performed } from "./hear-sound.ts";

export type { Performed };
export { firstEntry };

/** D344: `single` (play.html for the friends): the one reading chosen for the fugue (readings.ts BEST_READING), no tabs. */
export function HearSubject({ id, play, close, single = false }: { id: string; play: (notes: Performed, voice: number) => Promise<number>; close: () => void; single?: boolean }) {
  const f = fugueById(id);
  const e = firstEntry(id);
  const readings = readingsOf(id);
  const [reading, setReading] = useState<Reading | null>(() => (single ? bestReading(id) : chosenReading(id)));
  const canvas = useRef<HTMLCanvasElement>(null);
  const started = useRef<{ at: number; total: number } | null>(null);
  // D309: the notes the reading leaves unmarked as the others play them on the sound chosen.
  const perf = e ? performSubject(reading, e.notes, f.tpq, tempoOf(id), { kind: kindsOf(preset().id, f.voices.length)[e.voice] ?? "organ", character: characterOf(id) }) : [];
  // D280: the thumbs that play it: landing and lifting as the reading asks, loud or soft across the bar,
  // the ornaments shaken. D370: the thumbs chosen by the music's intent (fingering.ts planFingerings): the
  // reading's marks, else the joins and gaps it is played with here; the best plan shown, the next good
  // one a tap away where there is one.
  const orns = ornamentsOf(f);
  const [alt, setAlt] = useState(0);
  const fingerings = e
    ? planFingerings(
        perf.map((p, i) => {
          const o = orns.get(`${e.voice}:${e.notes[i][0]}`);
          const rn = reading?.notes[i];
          const follows = i + 1 < perf.length && e.notes[i + 1][0] <= e.notes[i][0] + e.notes[i][1];
          const marked = rn && (rn.join !== null || rn.short);
          return { at: p.at, dur: p.len, step: p.midi, st: e.notes[i][3], join: rn?.join ?? null, short: rn?.short ?? null, accent: rn?.accent ?? null, ...(marked || !follows ? {} : { intent: p.tie !== undefined ? ("join" as const) : ("detach" as const) }), d: p.d, shake: o ? shakeOf(o) : null };
        }),
        { overlap: 0.04 },
      )
    : [];
  const touches = fingerings[Math.min(alt, fingerings.length - 1)]?.touches ?? [];
  const hear = () => {
    if (!e) return;
    const last = perf.at(-1);
    void play(subjectSounds(f, e, perf, tempoOf(id)), e.voice).then((at) => (started.current = { at, total: last ? last.at + last.len : 0 }));
  };
  useEffect(() => {
    hear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading?.id]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = canvas.current;
      if (c && e) paintSubject(c, perf, e.notes.map((n) => n[2]), inkOf(e.voice, f.voices.length), reading, started.current, touches);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });
  if (!e) return null;
  const pick = (r: Reading | null) => {
    chooseReading(id, r?.id ?? NO_READING);
    setReading(r);
    setAlt(0);
  };
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label="Hear the subject" onClick={close}>
      <div className="tg-card tb-hear" onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-hear-title">{tr("THE SUBJECT")} · {lang() === "en" ? f.title.toUpperCase() : pieceName(f.kind, f.key)}</h2>
        {single && reading && (
          <p className="tb-hear-key tb-hear-one" id="reading-one">
            {tr("THE READING")}: {reading.author} {reading.year}
          </p>
        )}
        {!single && readings.length > 0 && (
          <div className="tb-hear-readings" role="radiogroup" aria-label="Readings">
            <button type="button" id="reading-none" role="radio" aria-checked={!reading} className={`tb-hear-reading${!reading ? " on" : ""}`} onClick={() => pick(null)} title={tr("NONE: MY OWN ARTICULATION")}>
              {tr("NONE")}
            </button>
            {readings.map((r) => (
              <button key={r.id} type="button" id={`reading-${r.id}`} role="radio" aria-checked={reading?.id === r.id} className={`tb-hear-reading${reading?.id === r.id ? " on" : ""}`} onClick={() => pick(r)} title={`${r.author}, ${r.work} (${r.year})`}>
                {r.author} {r.year}
              </button>
            ))}
          </div>
        )}
        <canvas ref={canvas} className="tb-hear-canvas" />
        <p className="tb-hear-key tb-hear-thumbs">
          {STRONG_SIDE === "outer"
            ? tr("THE THUMBS: JOINED, THE OTHER THUMB HANDS OVER OR OVERLAPS · DETACHED, LIFT EARLY (ONE THUMB MAY TAKE THE NEXT) · SOFT BY THE BOX, LOUD BY THE EDGE · SHAKE ON AN ORNAMENT")
            : tr("THE THUMBS: JOINED, THE OTHER THUMB HANDS OVER OR OVERLAPS · DETACHED, LIFT EARLY (ONE THUMB MAY TAKE THE NEXT) · SOFT BY THE EDGE, LOUD BY THE BOX · SHAKE ON AN ORNAMENT")}
        </p>
        {/* D370: another good fingering, where the plan finds one close to the best. */}
        {fingerings.length > 1 && (
          <p className="tb-hear-key tb-hear-fingering">
            <button type="button" id="hear-fingering" className="tb-hear-reading" onClick={() => setAlt((a) => (a + 1) % fingerings.length)}>
              {tr("THUMBS {n} OF {m}", { n: Math.min(alt, fingerings.length - 1) + 1, m: fingerings.length })} ↻
            </button>{" "}
            {tr(fingerings[Math.min(alt, fingerings.length - 1)].name)}
          </p>
        )}
        {/* D314: each mark in plain words: what the thumbs do for it. */}
        <ul className="tb-hear-key tb-hear-marks" id="hear-marks">
          {markLegend(STRONG_SIDE).map((l) => (
            <li key={l.kind}>
              <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {l.text}
            </li>
          ))}
        </ul>
        <p className="tb-hear-key">
          <span>♩ = {tempoOf(id)}</span>
          {reading?.level ? <span> · {reading.level.toUpperCase()}</span> : null}
        </p>
        {reading?.quote && (
          <blockquote className="tb-hear-quote" id="hear-quote">
            “{reading.quote}”
            <cite>
              {reading.author.charAt(0) + reading.author.slice(1).toLowerCase()}, {reading.work.includes(String(reading.year)) ? reading.work : `${reading.work} (${reading.year})`}{reading.pages ? `, ${reading.pages}` : ""}
              {reading.basis === "rule" ? ` · ${tr("his rule, applied to the notes")}` : ""}
              {reading.tempoText ? ` · ${tr("his tempo: {t} (the game plays ♩ = {q})", { t: reading.tempoText, q: tempoOf(id) })}` : ""}
            </cite>
          </blockquote>
        )}
        {!reading && <p className="tb-hear-lock">{single ? tr("NO MARKS FOR THIS FUGUE: YOUR OWN ARTICULATION") : readings.length ? tr("NONE: MY OWN ARTICULATION · NO MARKS ASKED OR SCORED") : tr("NO READING FOUND FOR THIS FUGUE: PLAYED AS WRITTEN")}</p>}
        <button type="button" id="hear-again" className="tb-play tb-hear-play" onClick={hear}>
          ▶ {tr("HEAR IT AGAIN")}
        </button>
      </div>
    </div>
  );
}

/** The subject drawn: blocks by pitch and time, the reading's marks, the light where it sounds. */
function paintSubject(c: HTMLCanvasElement, perf: Performed, midis: number[], ink: string, r: Reading | null, started: { at: number; total: number } | null, touches: Touch[] = []) {
  const cssW = c.clientWidth || 300;
  const cssH = c.clientHeight || 140;
  const dpr = Math.min(3, devicePixelRatio || 1);
  if (c.width !== Math.round(cssW * dpr)) (c.width = Math.round(cssW * dpr)), (c.height = Math.round(cssH * dpr));
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = "#0b0d18";
  g.fillRect(0, 0, cssW, cssH);
  if (!perf.length) return;
  const lo = Math.min(...midis) - 1;
  const hi = Math.max(...midis) + 1;
  const end = Math.max(...perf.map((p, i) => (i + 1 < perf.length ? perf[i + 1].at : p.at + p.len)));
  // D280: a side bar either side (the thumbs' bars, as in the game), the notes between.
  const bar = Math.max(44, cssW * 0.15);
  const pad = bar + 12;
  const X = (s: number) => pad + (s / end) * (cssW - 2 * pad);
  const rowH = Math.max(3, Math.min(10, (cssH - 44) / (hi - lo + 1)));
  const Y = (m: number) => 26 + (hi - m) * rowH;
  const now = started ? (performance.now() / 1000 - started.at) : -1;
  perf.forEach((p, i) => {
    const n = r?.notes[i];
    const x1 = X(p.at);
    const written = i + 1 < perf.length ? X(perf[i + 1].at) - x1 : X(p.at + p.len) - x1;
    const w = Math.max(2, Math.min(written, X(p.at + p.len) - x1) - 1);
    const y = Y(p.midi);
    const sounding = now >= p.at && now < p.at + p.len;
    g.globalAlpha = 0.35 + 0.65 * p.d;
    g.fillStyle = sounding ? "#fff3b0" : ink;
    g.fillRect(x1, y, w, rowH - 1);
    g.globalAlpha = 1;
    // The marks: a slur over a joined pair, a bar in the gap of a detached one, a dot, an accent.
    // D370: ⌒ only over a real slur (one arc, its first note to its last); a plain legato join a flat line (JOINED).
    const sl = (r?.slurs ?? []).find((s) => s.from === i);
    if (sl && sl.to < perf.length) {
      const x2 = X(perf[sl.to].at);
      let top = y;
      for (let q = i; q <= sl.to; q++) top = Math.min(top, Y(perf[q].midi));
      top -= 5;
      g.strokeStyle = "#f2d16b";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x1 + w / 2, top + 3);
      g.quadraticCurveTo((x1 + w / 2 + x2 + 3) / 2, top - 7, x2 + 3, top + 3);
      g.stroke();
    } else if (n?.join && i + 1 < perf.length && !slurredJoin(r, i)) {
      const x2 = X(perf[i + 1].at);
      const top = Math.min(y, Y(perf[i + 1].midi)) - 4;
      g.fillStyle = "#f2d16b";
      g.fillRect(x1 + w / 2, top, Math.max(1, x2 + 3 - x1 - w / 2), 1.5);
    }
    if (n?.join === false && i + 1 < perf.length) {
      g.fillStyle = "#ec5a4a";
      g.fillRect(Math.round((x1 + w + X(perf[i + 1].at)) / 2), y - 2, 1.5, rowH + 3);
    }
    if (n?.short) {
      g.fillStyle = "#fff";
      g.fillRect(x1 + w / 2 - 1.5, y - 6, 3, 3);
    }
    if (n?.accent) {
      g.fillStyle = "#ff8a3d";
      g.font = "bold 10px monospace";
      g.textAlign = "center";
      g.fillText(">", x1 + w / 2, y - 7);
    }
  });
  // The bars: warm, soft (pp) to loud (ff), the sides by STRONG_SIDE.
  for (const side of ["left", "right"] as const) {
    const x0 = side === "left" ? 0 : cssW - bar;
    const grad = g.createLinearGradient(side === "left" ? bar : cssW - bar, 0, side === "left" ? 0 : cssW, 0);
    grad.addColorStop(0, "#1a1216");
    grad.addColorStop(1, "#3a2420");
    g.fillStyle = grad;
    g.fillRect(x0, 0, bar, cssH);
    g.fillStyle = "#8a7f9a";
    g.font = "8px monospace";
    g.textAlign = "center";
    // D314: pp on the soft side, ff on the strong (STRONG_SIDE).
    const [inner, outer] = STRONG_SIDE === "outer" ? ["pp", "ff"] : ["ff", "pp"];
    g.fillText(inner, side === "left" ? bar - 10 : cssW - bar + 10, cssH - 4);
    g.fillText(outer, side === "left" ? 10 : cssW - 10, cssH - 4);
  }
  const playing = !!started && now >= -0.3 && now <= started.total + 0.4;
  const t = playing ? now : -1;
  const size = Math.max(12, Math.min(22, bar * 0.36));
  for (const tc of touches) {
    if (tc.slid) continue;
    const off = touches.filter((x) => x.slid && x.side === tc.side && x.on > tc.on).reduce((m, x) => Math.max(m, x.off), tc.off);
    const across = strengthOf(acrossBar(tc.d)) * (bar - size);
    const x = tc.side === "left" ? bar - size * 0.2 - across : cssW - bar + size * 0.2 + across;
    // While it slides, it follows the notes it plays.
    const slidTo = touches.filter((x) => x.slid && x.side === tc.side && x.on > tc.on && x.on <= t && x.on < off).at(-1);
    const yc = Y(perf[slidTo ? slidTo.i : tc.i].midi) + rowH / 2;
    const wob = tc.shake && t >= tc.on && t < tc.on + (perf[tc.i].len || 0) * 0.8 ? Math.sin(t * 48) * rowH * 1.2 : 0;
    if (t >= tc.on && t < off) drawThumb(g, x, yc + wob, size, tc.side, "down");
    else if (t >= tc.on - 0.35 && t < tc.on) drawThumb(g, x, yc, size, tc.side, "hover", 1 - (tc.on - t) / 0.35);
    else if (!playing && tc.i < 2) drawThumb(g, x, yc, size, tc.side, "hover", 0.8);
  }
  if (started && now >= 0 && now <= started.total) {
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillRect(X(now), 18, 1, cssH - 26);
  }
}
