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
import { bestReading, busoniOn, chooseReading, chosenReading, NO_READING, OFFER_READINGS, performSubject, playReading, readingsOf, slurredJoin, type Reading } from "../touch/readings.ts";
import { acrossBar, drawThumb, planFingerings, type Touch } from "./fingering.ts";
import { drawThumbProxy } from "./thumb-proxy.ts";
import { fugueName } from "../touch/fugue-names.ts";
import { subjectInkOf, subjectRimOf } from "../touch/subject-hue.ts";
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
  // D393: only BUSONI offered (OFFER_READINGS off): the reading play.html plays, shown, no chooser.
  const offered = OFFER_READINGS && !single;
  const [reading, setReading] = useState<Reading | null>(() => (!OFFER_READINGS ? playReading(id) : single ? bestReading(id, preset().id) : chosenReading(id, preset().id)));
  const [picking, setPicking] = useState(false);
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
    setPicking(false);
  };
  const nick = fugueName(id, lang());
  const fg = fingerings[Math.min(alt, fingerings.length - 1)];
  // Design studio (D398): the legend only of the signs this subject bears in this reading.
  const ns = reading?.notes ?? [];
  const has: Record<string, boolean> | null = reading
    ? { short: ns.some((n) => !!n.short), apart: ns.some((n) => n.join === false), joined: ns.some((n, i) => !!n.join && !slurredJoin(reading, i)), slur: (reading.slurs ?? []).length > 0, strong: ns.some((n) => !!n.accent) }
    : null;
  const legend = has ? markLegend(STRONG_SIDE).filter((l) => has[l.kind]) : [];
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label="Hear the subject" onClick={close}>
      <div className="tg-card tb-hear" onClick={(ev) => ev.stopPropagation()}>
        <div className="tb-hear-top">
          {nick && <span className="tb-hear-nick">{nick.toUpperCase()}</span>}
          <h2 className="tb-hear-title">
            {lang() === "en" ? f.title.toUpperCase() : pieceName(f.kind, f.key)} · {tr("THE SUBJECT")}
          </h2>
          <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
            ✕
          </button>
        </div>
        <div className="tb-hear-stage">
          <canvas ref={canvas} className="tb-hear-canvas" />
          {offered && readings.length > 0 && (
            <div className="tb-hear-picker" role="radiogroup" aria-label={tr("WHOSE READING?")} hidden={!picking}>
              <p className="tb-hear-picker-head">{tr("WHOSE READING?")}</p>
              <button type="button" id="reading-none" role="radio" aria-checked={!reading} className={`tb-hear-pick${!reading ? " on" : ""}`} onClick={() => pick(null)}>
                <b>{tr("NO READING")}</b>
                <span>{tr("Your own articulation: no marks asked or scored.")}</span>
              </button>
              {readings.map((r) => (
                <button key={r.id} type="button" id={`reading-${r.id}`} role="radio" aria-checked={reading?.id === r.id} className={`tb-hear-pick${reading?.id === r.id ? " on" : ""}`} onClick={() => pick(r)}>
                  <b>
                    {r.author} {r.year}
                  </b>
                  <span>{READING_WHO[r.id] ? tr(READING_WHO[r.id]) : `${r.work}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="tb-hear-row">
          <button type="button" id="hear-again" className="tb-hear-btn2 tb-hear-again" onClick={hear}>
            ▶ {tr("HEAR IT AGAIN")}
          </button>
          {!offered || !readings.length ? (
            reading ? (
              <span className="tb-hear-one" id="reading-one">
                {tr("THE READING")}: {reading.author} {reading.year}
              </span>
            ) : (
              <span className="tb-hear-one">{tr("NO READING")}</span>
            )
          ) : (
            <button type="button" id="reading-pick" className={`tb-hear-btn2${picking ? " on" : ""}`} aria-expanded={picking} onClick={() => setPicking((x) => !x)}>
              {reading ? `${reading.author} ${reading.year}` : tr("NO READING")} ▾
            </button>
          )}
          {fg && (
            <button type="button" id="hear-fingering" className="tb-hear-btn2" disabled={fingerings.length < 2} onClick={() => setAlt((a) => (a + 1) % fingerings.length)}>
              {fingerings.length > 1 ? `${tr("THUMBS {n} OF {m}", { n: Math.min(alt, fingerings.length - 1) + 1, m: fingerings.length })} · ` : ""}
              {tr(fg.name)}
              {fingerings.length > 1 ? " ↻" : ""}
            </button>
          )}
          <span className="tb-hear-tempo">♩ = {tempoOf(id)}</span>
        </div>
        {legend.length > 0 && (
          <ul className="tb-hear-key tb-hear-marks" id="hear-marks">
            {legend.map((l) => (
              <li key={l.kind}>
                <b className={`tb-mark tb-mark-${l.kind}`}>{l.sym}</b> {l.text}
              </li>
            ))}
          </ul>
        )}
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
        {!reading && <p className="tb-hear-lock">{!OFFER_READINGS && !busoniOn() && readings.some((r) => r.whole) ? tr("BUSONI'S MARKINGS ARE OFF (SETTINGS): YOUR OWN ARTICULATION") : !offered ? tr("NO MARKS FOR THIS FUGUE: YOUR OWN ARTICULATION") : readings.length ? tr("NONE: MY OWN ARTICULATION · NO MARKS ASKED OR SCORED") : tr("NO READING FOUND FOR THIS FUGUE: PLAYED AS WRITTEN")}</p>}
      </div>
    </div>
  );
}

/** Design studio (D398): what each reading is, one line in the picker (the studio's rating of 31 Oct 2026). */
const READING_WHO: Readonly<Record<string, string>> = {
  bodky: "A harpsichordist after Quantz. Marks almost every note.",
  keller: "An organist's articulation, from Bach's marked parts. Not every fugue.",
  riemann: "A Romantic theorist's phrasing. No tempo.",
  busoni: "A pianist's edition. The default on every instrument.",
};

const BOX = "#0f1730";
const STRIP = "#1c1f2c";
const EDGE = "#4b8ef0";
const LINE = "#18223f";
const GOLD_LINE = "#f3d26b";
const LETTER = "#fff3b0";

/**
 * Design studio (D398): the subject drawn as the play screen draws it: the box between the two strips, its
 * blocks in the voice's subject ink (D368) with their rims, the reading's marks over them (D374), a gold
 * line where it sounds; both thumbs always on their strips (D374's mark, glowing as it presses, D396), each
 * played note's L or R under it as its thumb lands (D396).
 */
function paintSubject(c: HTMLCanvasElement, perf: Performed, midis: number[], ink: string, r: Reading | null, started: { at: number; total: number } | null, touches: Touch[] = []) {
  const cssW = c.clientWidth || 300;
  const cssH = c.clientHeight || 160;
  const dpr = Math.min(3, devicePixelRatio || 1);
  if (c.width !== Math.round(cssW * dpr) || c.height !== Math.round(cssH * dpr)) (c.width = Math.round(cssW * dpr)), (c.height = Math.round(cssH * dpr));
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bar = Math.max(52, cssW * 0.15);
  g.fillStyle = STRIP;
  g.fillRect(0, 0, cssW, cssH);
  g.fillStyle = BOX;
  g.fillRect(bar, 0, cssW - 2 * bar, cssH);
  g.fillStyle = EDGE;
  g.fillRect(bar - 2, 0, 2, cssH);
  g.fillRect(cssW - bar, 0, 2, cssH);
  if (!perf.length) return;
  const lo = Math.min(...midis) - 1;
  const hi = Math.max(...midis) + 1;
  const end = Math.max(...perf.map((p, i) => (i + 1 < perf.length ? perf[i + 1].at : p.at + p.len)));
  const pad = bar + 14;
  const X = (s: number) => pad + (s / end) * (cssW - 2 * pad);
  const rowH = Math.max(4, Math.min(14, (cssH - 46) / (hi - lo + 1)));
  const top0 = Math.max(22, (cssH - (hi - lo + 1) * rowH) / 2);
  const Y = (m: number) => top0 + (hi - m) * rowH;
  g.strokeStyle = LINE;
  g.lineWidth = 1;
  for (let m = lo; m <= hi; m++) {
    g.beginPath();
    g.moveTo(bar, Y(m) + rowH / 2);
    g.lineTo(cssW - bar, Y(m) + rowH / 2);
    g.stroke();
  }
  const now = started ? performance.now() / 1000 - started.at : -1;
  const playing = !!started && now >= -0.3 && now <= started.total + 0.4;
  const finished = !!started && now > started.total + 0.4;
  const fill = subjectInkOf(ink, 1);
  const rim = subjectRimOf(ink, 1);
  const bh = Math.max(4, rowH - 2);
  perf.forEach((p, i) => {
    const n = r?.notes[i];
    const x1 = X(p.at);
    const written = i + 1 < perf.length ? X(perf[i + 1].at) - x1 : X(p.at + p.len) - x1;
    const w = Math.max(3, Math.min(written, X(p.at + p.len) - x1) - 2);
    const y = Y(p.midi) + (rowH - bh) / 2;
    const past = playing && now >= p.at + p.len;
    g.globalAlpha = past ? 0.55 : 1;
    g.fillStyle = fill;
    g.fillRect(x1, y, w, bh);
    g.strokeStyle = rim;
    g.lineWidth = 1.25;
    g.strokeRect(x1 + 0.5, y + 0.5, w - 1, bh - 1);
    g.globalAlpha = 1;
    // The reading's marks over the notes (D370, D374): ⌒ over a real slur, a flat line for a plain join,
    // a red stroke in a detached gap, a dot for short, > for an accent.
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
      g.fillRect(Math.round((x1 + w + X(perf[i + 1].at)) / 2), y - 2, 1.5, bh + 4);
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
  // D314: pp on the soft side of each strip, ff on the strong (STRONG_SIDE).
  g.fillStyle = "#8a7f9a";
  g.font = "8px monospace";
  g.textAlign = "center";
  const [inner, outer] = STRONG_SIDE === "outer" ? ["pp", "ff"] : ["ff", "pp"];
  g.fillText(inner, bar - 12, cssH - 5);
  g.fillText(outer, 12, cssH - 5);
  g.fillText(inner, cssW - bar + 12, cssH - 5);
  g.fillText(outer, cssW - 12, cssH - 5);
  // The gold line where it sounds.
  if (started && now >= 0 && now <= started.total) {
    g.fillStyle = GOLD_LINE;
    g.fillRect(X(now) - 1, 4, 2, cssH - 8);
  }
  const t = playing ? now : finished ? Infinity : -1;
  const size = Math.max(12, Math.min(22, bar * 0.34));
  // Each played note's thumb, L or R, appearing as it lands (D396: one ink for both thumbs).
  for (const tc of touches) {
    if (tc.slid || t < tc.on) continue;
    const p = perf[tc.i];
    const x1 = X(p.at);
    const since = t - tc.on;
    const k = Math.min(1, since / 0.35);
    const ly = Y(p.midi) + rowH + 7;
    if (k < 1) {
      g.globalAlpha = 0.5 * (1 - k);
      g.fillStyle = LETTER;
      g.beginPath();
      g.arc(x1 + 4, ly, 5 + 7 * k, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    g.fillStyle = LETTER;
    g.font = `${k < 1 ? 10 : 8}px monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(tc.side === "left" ? tr("L") : tr("R"), x1 + 4, ly);
    g.textBaseline = "alphabetic";
  }
  // Both thumbs, always on their strips: pressing (glowing) while they play a note, else resting where they last were.
  for (const side of ["left", "right"] as const) {
    const mine = touches.filter((x) => x.side === side && !x.slid);
    if (!mine.length) continue;
    const down = mine.find((tc) => {
      const off = touches.filter((x) => x.slid && x.side === side && x.on > tc.on).reduce((m, x) => Math.max(m, x.off), tc.off);
      return t >= tc.on && t < off;
    });
    const at = down ?? [...mine].reverse().find((tc) => tc.on <= t) ?? mine[0];
    const across = strengthOf(acrossBar(at.d)) * (bar - size);
    const x = side === "left" ? bar - size * 0.2 - across : cssW - bar + size * 0.2 + across;
    const slidTo = down ? touches.filter((x2) => x2.slid && x2.side === side && x2.on > down.on && x2.on <= t).at(-1) : undefined;
    const yc = Y(perf[slidTo ? slidTo.i : at.i].midi) + rowH / 2;
    if (down) {
      const wob = down.shake && t < down.on + (perf[down.i].len || 0) * 0.8 ? Math.sin(t * 48) * rowH * 1.2 : 0;
      drawThumb(g, x, yc + wob, size, side, "down");
    } else drawThumbProxy(g, x, yc, size, side, "rest", 0.75);
  }
}
