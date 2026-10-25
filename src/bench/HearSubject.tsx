/**
 * D272, HEAR THE SUBJECT (play.html's list): the fugue's subject as the chosen reading says to play it,
 * drawn and heard: each note a block at its pitch and length, joined notes under a slur, detached ones
 * with a gap, short ones dotted, accents marked, the level written; a light runs along as it sounds.
 * The readings (at most three) as buttons, the first open, the others once the fugue is finished; the
 * author's words and pages below.
 */
import { useEffect, useRef, useState } from "react";
import { fugueById } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { chooseReading, chosenReading, performSubject, readingsOf, type Reading } from "../touch/readings.ts";
import { tempoOf } from "../touch/tempi.ts";

export type Performed = ReturnType<typeof performSubject>;

/** The fugue's first entry of its (first) subject. */
export function firstEntry(id: string) {
  const f = fugueById(id);
  return [...f.entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];
}

export function HearSubject({ id, open, play, close }: { id: string; open: boolean; play: (notes: Performed, voice: number) => Promise<number>; close: () => void }) {
  const f = fugueById(id);
  const e = firstEntry(id);
  const readings = readingsOf(id);
  const [reading, setReading] = useState<Reading | null>(() => chosenReading(id, open));
  const canvas = useRef<HTMLCanvasElement>(null);
  const started = useRef<{ at: number; total: number } | null>(null);
  const perf = e ? performSubject(reading, e.notes, f.tpq, tempoOf(id)) : [];
  const hear = () => {
    if (!e) return;
    const last = perf.at(-1);
    void play(perf, e.voice).then((at) => (started.current = { at, total: last ? last.at + last.len : 0 }));
  };
  useEffect(() => {
    hear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading?.id]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = canvas.current;
      if (c && e) paintSubject(c, perf, e.notes.map((n) => n[2]), inkOf(e.voice, f.voices.length), reading, started.current);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });
  if (!e) return null;
  const pick = (r: Reading, k: number) => {
    if (k > 0 && !open) return;
    chooseReading(id, r.id);
    setReading(r);
  };
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label="Hear the subject" onClick={close}>
      <div className="tg-card tb-hear" onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
          ✕
        </button>
        <h2 className="tb-hear-title">THE SUBJECT · {f.title.toUpperCase()}</h2>
        {readings.length > 0 && (
          <div className="tb-hear-readings" role="radiogroup" aria-label="Readings">
            {readings.map((r, k) => {
              const locked = k > 0 && !open;
              return (
                <button key={r.id} type="button" id={`reading-${r.id}`} role="radio" aria-checked={reading?.id === r.id} className={`tb-hear-reading${reading?.id === r.id ? " on" : ""}${locked ? " locked" : ""}`} onClick={() => pick(r, k)} title={locked ? "Finish the fugue to open" : `${r.author}, ${r.work} (${r.year})`}>
                  {locked ? "🔒 " : ""}
                  {r.author} {r.year}
                </button>
              );
            })}
          </div>
        )}
        {readings.length > 1 && !open && <p className="tb-hear-lock">FINISH THE FUGUE TO OPEN THE OTHER READINGS</p>}
        <canvas ref={canvas} className="tb-hear-canvas" />
        <p className="tb-hear-key">
          <span>⌒ JOINED</span> <span>| DETACHED</span> <span>· SHORT</span> <span>&gt; ACCENT</span>
          <span> · ♩ = {tempoOf(id)}</span>
          {reading?.level ? <span> · {reading.level.toUpperCase()}</span> : null}
        </p>
        {reading?.quote && (
          <blockquote className="tb-hear-quote" id="hear-quote">
            “{reading.quote}”
            <cite>
              {reading.author.charAt(0) + reading.author.slice(1).toLowerCase()}, {reading.work.includes(String(reading.year)) ? reading.work : `${reading.work} (${reading.year})`}{reading.pages ? `, ${reading.pages}` : ""}
              {reading.basis === "rule" ? " · his rule, applied to the notes" : ""}
              {reading.tempoText ? ` · his tempo: ${reading.tempoText} (the game keeps the recordings' ♩ = ${tempoOf(id)})` : ""}
            </cite>
          </blockquote>
        )}
        {!reading && <p className="tb-hear-lock">NO READING FOUND FOR THIS FUGUE: PLAYED AS WRITTEN</p>}
        <button type="button" id="hear-again" className="tb-play tb-hear-play" onClick={hear}>
          ▶ HEAR IT AGAIN
        </button>
      </div>
    </div>
  );
}

/** The subject drawn: blocks by pitch and time, the reading's marks, the light where it sounds. */
function paintSubject(c: HTMLCanvasElement, perf: Performed, midis: number[], ink: string, r: Reading | null, started: { at: number; total: number } | null) {
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
  const pad = 14;
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
    if (n?.join && i + 1 < perf.length) {
      const x2 = X(perf[i + 1].at);
      const top = Math.min(y, Y(perf[i + 1].midi)) - 5;
      g.strokeStyle = "#f2d16b";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x1 + w / 2, top + 3);
      g.quadraticCurveTo((x1 + w / 2 + x2 + 3) / 2, top - 5, x2 + 3, top + 3);
      g.stroke();
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
  if (started && now >= 0 && now <= started.total) {
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillRect(X(now), 18, 1, cssH - 26);
  }
}
