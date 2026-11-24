/**
 * D272, HEAR THE SUBJECT (play.html's list): the fugue's subject as the chosen reading says to play it,
 * drawn and heard: each note a block at its pitch and length, a slurred group under its slur (D370; a plain join a line), detached ones
 * with a gap, short ones dotted, accents marked, the level written; a light runs along as it sounds.
 * The readings (at most three) as buttons, the author's words and pages below. D325: NONE (my own
 * articulation) first, the default, and every reading open from the start; the one chosen is the run's.
 * D492: no fingering suggestions (the thumbs on the strips and their button gone); the playback stops
 * whenever the view closes, by any route (the close button, the backdrop, Escape, or the view taken away).
 */
import { lang, pieceName, tr } from "../i18n/index.ts";
import { useEffect, useRef, useState } from "react";
import { fugueById } from "../touch/fugue.ts";
import { inkOf } from "../touch/MusicBox.tsx";
import { busoniOn, performSubject, playReading, readingsOf, slurredJoin, type Reading } from "../touch/readings.ts";
import { fugueName } from "../touch/fugue-names.ts";
import { paleOf } from "../touch/subject-hue.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";
import { markLegend } from "../touch/readings.ts";
import { tempoOf } from "../touch/tempi.ts";
import { kindsOf } from "../touch/practice.ts";
import { characterOf } from "../touch/character.ts";
import { preset } from "../touch/sound.ts";
import { firstEntry, subjectSounds, type Performed } from "./hear-sound.ts";
import { formLabel, subjectForms } from "./subject-forms.ts";
import { canonsMode, ease, easeOut, mix } from "../touch/canon-ribbon.ts";

export type { Performed };
export { firstEntry };

/**
 * D344: `single` (play.html for the friends); D1050: every view now shows the one reading play.html plays.
 * D449: `embedded`, inside ABOUT THIS FUGUE: no veil, no title or ✕, heard only when ▶ is tapped.
 * D492: `stop` silences what `play` scheduled; called on every close and when the view is unmounted (wherever it is shown).
 */
export function HearSubject({ id, play, stop, close: onClose, single = false, embedded = false }: { id: string; play: (notes: Performed, voice: number) => Promise<number>; stop: () => void; close: () => void; single?: boolean; embedded?: boolean }) {
  const f = fugueById(id);
  // D676: each subject and each transformation the fugue uses, as its own form on the card (heard and drawn on its
  // own); the first is the subject as before, and only it carries the reading (the readings mark the subject's notes).
  const forms = subjectForms(id);
  const [fi, setFi] = useState(0);
  // A fugue on one form only shows it too when that form is a transformation (Contrapunctus 3 on the inverted subject).
  const listed = forms.length > 1 || (forms.length === 1 && (forms[0].inverted || forms[0].scale !== 1));
  const form = listed ? forms[Math.min(fi, forms.length - 1)] : null;
  const e = form && fi > 0 ? form.entry : firstEntry(id);
  const readings = readingsOf(id);
  // D393: only BUSONI offered: the reading play.html plays, shown, no chooser. D1050: the chooser and the books' readings deleted.
  const [reading] = useState<Reading | null>(() => playReading(id));
  const shown = fi > 0 ? null : reading;
  const canvas = useRef<HTMLCanvasElement>(null);
  const started = useRef<{ at: number; total: number } | null>(null);
  // D972 (the owner's step 1): a form chosen is first shown being made from the subject (it turns, stretches,
  // squeezes or moves to its pitch), then heard; the ⚙ CANONS & FUGUES setting OFF shows it at once, as before.
  const morph = useRef<FormMorph | null>(null);
  // D309: the notes the reading leaves unmarked as the others play them on the sound chosen.
  const perf = e ? performSubject(shown, e.notes, f.tpq, tempoOf(id), { kind: kindsOf(preset().id, f.voices.length)[e.voice] ?? "organ", character: characterOf(id) }) : [];
  // D492: the playback stopped on every close, and when the view goes (unmounted) by any other route.
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);
  const close = () => {
    stopRef.current();
    started.current = null;
    onClose();
  };
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });
  const hear = () => {
    if (!e) return;
    const last = perf.at(-1);
    void play(subjectSounds(f, e, perf, tempoOf(id)), e.voice).then((at) => (started.current = { at, total: last ? last.at + last.len : 0 }));
  };
  const shownOnce = useRef(false);
  useEffect(() => {
    // D449: embedded, the first showing waits for ▶ (the box opens in silence); a reading chosen is heard at once.
    // D972: a form's morph first, then the form heard.
    const m = morph.current;
    if (m && (!embedded || shownOnce.current)) {
      const id2 = setTimeout(hear, FORM_MORPH_S * 1000);
      shownOnce.current = true;
      return () => clearTimeout(id2);
    }
    if (!embedded || shownOnce.current) hear();
    shownOnce.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading?.id, fi]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = canvas.current;
      const m = morph.current;
      if (m && performance.now() / 1000 - m.t0 >= FORM_MORPH_S) morph.current = null;
      if (c && e && morph.current) paintFormMorph(c, morph.current, (performance.now() / 1000 - morph.current.t0) / FORM_MORPH_S);
      else if (c && e) paintSubject(c, perf, e.notes.map((n) => n[2]), inkOf(e.voice, f.voices.length), shown, started.current);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });
  if (!e) return null;
  // D972: to a transformed form (not back to the subject), made from the subject before the eyes
  const choose = (i: number) => {
    const to = forms[i], from = forms[0];
    morph.current = i > 0 && canonsMode() !== "off" && to.entry !== from.entry ? { from: from.entry.notes, to: to.entry.notes, fromInk: inkOf(from.entry.voice, f.voices.length), toInk: inkOf(to.entry.voice, f.voices.length), inv: to.inverted !== from.inverted, t0: performance.now() / 1000 } : null;
    stopRef.current();
    started.current = null;
    setFi(i);
  };

  const nick = fugueName(id, lang());
  // Design studio (D398): the legend only of the signs this subject bears in this reading.
  const ns = shown?.notes ?? [];
  const has: Record<string, boolean> | null = shown
    ? { short: ns.some((n) => !!n.short), apart: ns.some((n) => n.join === false), joined: ns.some((n, i) => !!n.join && !slurredJoin(shown, i)), slur: (shown.slurs ?? []).length > 0, strong: ns.some((n) => !!n.accent) }
    : null;
  const legend = has ? markLegend(STRONG_SIDE).filter((l) => has[l.kind]) : [];
  const card = (
      <div className={embedded ? "tb-hear tb-hear-in" : "tg-card tb-hear"} id={embedded ? "about-subject" : undefined} onClick={(ev) => ev.stopPropagation()}>
        {!embedded && <div className="tb-hear-top">
          {nick && <span className="tb-hear-nick">{nick.toUpperCase()}</span>}
          <h2 className="tb-hear-title">
            {lang() === "en" ? f.title.toUpperCase() : pieceName(f.kind, f.key)} · {new Set(forms.map((x) => x.theme)).size > 1 ? tr("THE SUBJECTS") : tr("THE SUBJECT")}
          </h2>
          <button type="button" className="tg-x tb-hear-x" aria-label="Close" onClick={close}>
            ✕
          </button>
        </div>}
        <div className="tb-hear-stage">
          <canvas ref={canvas} className="tb-hear-canvas" />
        </div>
        {form && (
          <div className="tb-hear-forms" id="hear-forms" role="radiogroup" aria-label={tr("ITS FORMS")}>
            {forms.map((x, i) => (
              <button key={i} type="button" id={`hear-form-${i}`} role="radio" aria-checked={i === fi} className={`tb-hear-form${i === fi ? " on" : ""}`} onClick={() => (i === fi ? hear() : choose(i))}>
                <span className="tb-hear-form-play" aria-hidden="true">▶</span>
                <FormContour notes={x.entry.notes} />
                <span className="tb-hear-form-name">{formLabel(id, x, forms)}</span>
                <span className="tb-hear-form-bar">{tr("BAR {n}", { n: x.bar })}</span>
              </button>
            ))}
          </div>
        )}
        <div className="tb-hear-row">
          <button type="button" id="hear-again" className="tb-hear-btn2 tb-hear-again" onClick={hear}>
            ▶ {embedded ? tr("HEAR THE SUBJECT") : tr("HEAR IT AGAIN")}
          </button>
          {fi > 0 ? (
            <span className="tb-hear-one">{tr("PLAYED AS WRITTEN")}</span>
          ) : reading ? (
            <span className="tb-hear-one" id="reading-one">
              {tr("THE READING")}: {reading.author} {reading.year}
            </span>
          ) : (
            <span className="tb-hear-one">{tr("NO READING")}</span>
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
        {shown?.quote && (
          <blockquote className="tb-hear-quote" id="hear-quote">
            “{shown.quote}”
            <cite>
              {shown.author.charAt(0) + shown.author.slice(1).toLowerCase()}, {shown.work.includes(String(shown.year)) ? shown.work : `${shown.work} (${shown.year})`}{shown.pages ? `, ${shown.pages}` : ""}
              {shown.basis === "rule" ? ` · ${tr("his rule, applied to the notes")}` : ""}
              {shown.tempoText ? ` · ${tr("his tempo: {t} (the game plays ♩ = {q})", { t: shown.tempoText, q: tempoOf(id) })}` : ""}
            </cite>
          </blockquote>
        )}
        {!reading && fi === 0 && <p className="tb-hear-lock">{!busoniOn() && readings.some((r) => r.whole) ? tr("BUSONI'S MARKINGS ARE OFF (SETTINGS): YOUR OWN ARTICULATION") : tr("NO MARKS FOR THIS FUGUE: YOUR OWN ARTICULATION")}</p>}
      </div>
  );
  if (embedded) return card;
  return (
    <div className="tb-hear-wrap" role="dialog" aria-label="Hear the subject" onClick={close}>
      {card}
    </div>
  );
}

const BOX = "#0f1730";
const STRIP = "#1c1f2c";
const EDGE = "#4b8ef0";
const LINE = "#18223f";
const GOLD_LINE = "#f3d26b";

/**
 * Design studio (D398): the subject drawn as the play screen draws it: the box between the two strips, its
 * blocks in the voice's subject ink (D368) with their rims, the reading's marks over them (D374), a gold
 * line where it sounds. D492: no fingering drawn (the thumbs that stood on the strips, D374/D396/D444, gone).
 */
function paintSubject(c: HTMLCanvasElement, perf: Performed, midis: number[], ink: string, r: Reading | null, started: { at: number; total: number } | null) {
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
  // The design studio: the subject in its voice's own ink (no subject hue), a pale rim of the same ink.
  const fill = ink;
  const rim = paleOf(ink);
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
}

/** D676: a form's contour, small: its notes as a line (pitch up, time across), for the form's button. */
function FormContour({ notes }: { notes: readonly (readonly [number, number, number, ...unknown[]])[] }) {
  const W = 46, H = 16;
  if (!notes.length) return null;
  const on0 = notes[0][0];
  const end = notes.at(-1)![0] + notes.at(-1)![1];
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) (lo = Math.min(lo, n[2])), (hi = Math.max(hi, n[2]));
  const x = (t: number) => 1 + ((t - on0) / Math.max(1, end - on0)) * (W - 2);
  const y = (m: number) => 1 + ((hi - m) / Math.max(1, hi - lo)) * (H - 2);
  const pts = notes.flatMap(([on, dur, m]) => [`${x(on).toFixed(1)},${y(m).toFixed(1)}`, `${x(on + dur).toFixed(1)},${y(m).toFixed(1)}`]).join(" ");
  return (
    <svg className="tb-hear-form-line" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** D972: the card's morph, from the subject's notes to a form's ([onset, length, MIDI, …]), and how long it takes. */
interface FormMorph { from: readonly (readonly [number, number, number, ...unknown[]])[]; to: readonly (readonly [number, number, number, ...unknown[]])[]; fromInk: string; toInk: string; inv: boolean; t0: number }
const FORM_MORPH_S = 2.2;

/**
 * D972: the subject becoming one of its forms, on the card's own stage (paintSubject's box, strips and pitch lines):
 * note for note it slides to the form's time and pitch, turns over (an inversion: its height folding through the
 * half-turn), stretches or squeezes, its colour going from the subject's voice to the form's in step with the motion;
 * both laid out at one scale (the longer's: so an augmentation is seen to double), the subject first easing out of its
 * own layout into it, and at the end the form into its own, where paintSubject takes over. Notes the form has beyond the subject's fade in; the subject's beyond the form's fade out.
 */
function paintFormMorph(c: HTMLCanvasElement, m: FormMorph, p: number) {
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
  const pad = bar + 14, span = cssW - 2 * pad;
  const lay = (ns: FormMorph["from"]) => {
    const on0 = ns[0][0], end = Math.max(...ns.map((n) => n[0] + n[1])) - on0;
    const ms = ns.map((n) => n[2]);
    return { on0, end, lo: Math.min(...ms) - 1, hi: Math.max(...ms) + 1 };
  };
  const A = lay(m.from), B = lay(m.to);
  const end = Math.max(A.end, B.end), lo = Math.min(A.lo, B.lo), hi = Math.max(A.hi, B.hi);
  // the subject into the shared scale (to 0.2), the move (0.2 to 0.8), the form into its own layout (0.8 to 1)
  const zA = 1 - ease(p / 0.2), u = easeOut(Math.min(1, (p - 0.2) / 0.6)), z = ease((p - 0.8) / 0.2);
  const rowOf = (l: number, h: number) => Math.max(4, Math.min(14, (cssH - 46) / (h - l + 1)));
  const topOf = (l: number, h: number, r: number) => Math.max(22, (cssH - (h - l + 1) * r) / 2);
  const rC = rowOf(lo, hi), tC = topOf(lo, hi, rC), rB = rowOf(B.lo, B.hi), tB = topOf(B.lo, B.hi, rB), rA = rowOf(A.lo, A.hi), tA = topOf(A.lo, A.hi, rA);
  const xC = (t: number) => pad + (t / end) * span, xB = (t: number) => pad + (t / B.end) * span, xA = (t: number) => pad + (t / A.end) * span;
  const yC = (mi: number) => tC + (hi - mi) * rC, yB = (mi: number) => tB + (B.hi - mi) * rB, yA = (mi: number) => tA + (A.hi - mi) * rA;
  const X = (t: number) => xC(t) + (xA(t) - xC(t)) * zA + (xB(t) - xC(t)) * z;
  const Y = (mi: number) => yC(mi) + (yA(mi) - yC(mi)) * zA + (yB(mi) - yC(mi)) * z;
  const rowH = rC + (rA - rC) * zA + (rB - rC) * z;
  g.strokeStyle = LINE;
  g.lineWidth = 1;
  for (let mi = lo; mi <= hi; mi++) {
    g.beginPath();
    g.moveTo(bar, Y(mi) + rowH / 2);
    g.lineTo(cssW - bar, Y(mi) + rowH / 2);
    g.stroke();
  }
  const n = Math.min(m.from.length, m.to.length), bh = Math.max(4, rowH - 2);
  const am = m.from.map((x) => x[2]), cA = (Math.min(...am) + Math.max(...am)) / 2;
  const col = mix(m.fromInk, m.toInk, u);
  const block = (x: number, w: number, y: number, h: number, ink: string, alpha: number) => {
    g.globalAlpha = alpha;
    g.fillStyle = ink;
    g.fillRect(x, y - h / 2, Math.max(3, w), h);
    g.strokeStyle = paleOf(ink);
    g.lineWidth = 1.25;
    g.strokeRect(x + 0.5, y - h / 2 + 0.5, Math.max(3, w) - 1, h - 1);
  };
  for (let i = 0; i < Math.max(m.from.length, m.to.length); i++) {
    if (i >= n) {
      // a note one has and the other has not
      const extraTo = i < m.to.length, nt = extraTo ? m.to[i] : m.from[i], L = extraTo ? B : A;
      const t = nt[0] - L.on0, al = extraTo ? z : 1 - u;
      if (al > 0) block(X(t), X(t + nt[1]) - X(t) - 2, Y(nt[2]) + rowH / 2, bh, extraTo ? m.toInk : m.fromInk, al);
      continue;
    }
    const a = m.from[i], b = m.to[i];
    const ta = a[0] - A.on0, tb = b[0] - B.on0;
    const t = ta + (tb - ta) * u, d = a[1] + (b[1] - a[1]) * u;
    // the pitch: an inversion turns about the subject's centre line on its way; the rest moves straight
    let mi: number, h = bh;
    if (m.inv) {
      const cos = Math.cos(Math.PI * u), turned = cA + (a[2] - cA) * cos;
      mi = turned + (b[2] - (cA - (a[2] - cA))) * u;
      h = Math.max(bh * 0.4, bh * Math.abs(cos));
    } else mi = a[2] + (b[2] - a[2]) * u;
    block(X(t), X(t + d) - X(t) - 2, Y(mi) + rowH / 2, h, col, 1);
  }
  g.globalAlpha = 1;
}
