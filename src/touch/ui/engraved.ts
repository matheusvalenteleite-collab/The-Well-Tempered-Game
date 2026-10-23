/**
 * Design study (`?ui=manuscript`): the music as notation, drawn here with a small engraver of our own
 * (staff lines, SMuFL noteheads, stems, beams by the beat, flags, dots, ledger lines, accidentals by the
 * bar against the key signature; no rests, ties or slurs) over the game's notes and their times: x is
 * time (proportional spacing), y the staff step, so the side bars still line up with the player's staff.
 * (GERUBACH and SCORE, mockups here first, are real interfaces since D227: scroll-score.ts, strip.ts.)
 *
 * MANUSCRIPT: Bach's autograph (P 415): ruled staves on foxed paper, iron-gall ink with its bleed and a
 * hand (Petaluma, a handwritten SMuFL font), the soprano clef as Bach wrote the upper staff, the entries
 * rubricated in red, the player's line in fresh black ink, a manicule for the now.
 */
import type { TouchFugue } from "../fugue.ts";
import { stepRange } from "../voice-mode.ts";
import { firstBarIn, glyph, gridLines, hash, keySignature, mix, rect, spelled, type Ctx, type Geo, type GeoIn, type Template, type UEntry, type UNote } from "./core.ts";
import { PETALUMA, type GlyphName } from "./glyphs.ts";

type Font = Partial<Record<GlyphName, string>>;
type Clef = "g" | "f" | "c1";
interface Staff {
  voices: number[];
  clef: Clef;
  /** The five lines' steps, bottom first. */
  lines: number[];
}
const LINES: Record<Clef, number[]> = { g: [30, 32, 34, 36, 38], f: [18, 20, 22, 24, 26], c1: [28, 30, 32, 34, 36] };

interface Style {
  font: Font;
  /** The note's ink. */
  ink: (n: UNote) => string;
  /** The staff's ink and line weight (in staff spaces). */
  staffInk: string;
  line: number;
  /** 0 engraved; 1 a hand (wobble, slant, bleed). */
  hand: number;
  /** Head width in staff spaces. */
  headW: number;
}

/** The grand staff's voices: the upper half on the treble staff (or Bach's soprano clef), the rest on the bass. */
function grandStaves(count: number, upper: Clef): Staff[] {
  const top = count <= 2 ? 1 : count === 5 ? 3 : 2;
  const all = Array.from({ length: count }, (_, i) => i);
  return [
    { voices: all.slice(0, top), clef: upper, lines: LINES[upper] },
    { voices: all.slice(top), clef: "f", lines: LINES.f },
  ];
}

/** The spacing's limit: a sixteenth's width (units) for a template's bars in view. */
function sixteenth(f: TouchFugue, w: number, bars: number): number {
  return (w * (f.tpq / 4)) / (bars * f.barTicks);
}

/** A grand staff over the piece's range, the steps as tall as the spacing lets the heads be. */
function grandGeo(L: GeoIn, bars: number, top: number, bottom: number): Geo {
  const r = stepRange(L.f);
  const lo = Math.min(r.lo - 1, 15);
  const hi = Math.max(r.hi + 1, 41);
  const room = L.h - top - bottom;
  const A = Math.min(room / (hi - lo + 1), 0.3 * sixteenth(L.f, L.w, bars));
  const mid = top + room / 2;
  const c = (hi + lo) / 2;
  return { yOf: (s) => mid + (c - s) * A, A: () => A };
}

interface Shape {
  n: UNote;
  x: number;
  y: number;
  sp: number;
  base: number;
  dot: boolean;
  beams: number;
  up: boolean;
  head: GlyphName;
  stem: boolean;
}

/** A note's written value: the base (in quarters) and a dot. */
function value(f: TouchFugue, dur: number): { base: number; dot: boolean } {
  const q = dur / f.tpq;
  for (const b of [4, 2, 1, 0.5, 0.25, 0.125]) {
    if (Math.abs(q - b) < 0.02) return { base: b, dot: false };
    if (Math.abs(q - b * 1.5) < 0.02) return { base: b, dot: true };
  }
  for (const b of [4, 2, 1, 0.5, 0.25, 0.125]) if (q >= b) return { base: b, dot: false };
  return { base: 0.125, dot: false };
}

/** Draws the staves and the notes in view. */
function engrave(c: Ctx, staves: Staff[], st: Style, x0: number) {
  const { g, f } = c;
  const staffOf = (v: number) => Math.max(0, staves.findIndex((s) => s.voices.includes(v)));
  const sig = keySignature(f.key);
  const hand = st.hand;
  const wob = (k: number, ...n: number[]) => (hand ? (hash(k, ...n) - 0.5) * hand : 0);
  // Staff lines (a hand rules them a little unevenly).
  staves.forEach((s, i) => {
    const v = s.voices[0];
    const sp = 2 * c.A(v);
    g.strokeStyle = st.staffInk;
    for (const [j, l] of s.lines.entries()) {
      g.lineWidth = st.line * sp * (hand ? 0.8 + hash(i, j) * 0.5 : 1);
      g.beginPath();
      const y = c.y(l, v);
      if (!hand) {
        g.moveTo(x0, y);
        g.lineTo(c.W, y);
      } else {
        for (let x = x0; x <= c.W + 8; x += 8) {
          const t = (x + c.t0 / c.span * c.W) / 90;
          g.lineTo(x, y + Math.sin(t + i * 2 + j * 0.3) * 0.35 + (j - 2) * Math.sin(t * 0.37) * 0.15);
        }
      }
      g.stroke();
    }
  });
  // Bar lines through every staff.
  const topY = c.y(staves[0].lines[4], staves[0].voices[0]);
  const last = staves[staves.length - 1];
  const botY = c.y(last.lines[0], last.voices[0]);
  for (const l of gridLines(c)) {
    if (!l.bar) continue;
    const x = c.xOf(l.t) - 0.4 * 2 * c.A(staves[0].voices[0]);
    if (x < x0) continue;
    g.strokeStyle = st.staffInk;
    g.lineWidth = Math.max(1, st.line * 2 * c.A(staves[0].voices[0]) * 1.3);
    g.beginPath();
    g.moveTo(x + wob(l.t, 1) * 2, topY);
    g.lineTo(x + wob(l.t, 2) * 2, botY);
    g.stroke();
  }
  // The notes' shapes.
  const shapes: Shape[] = [];
  const bar0 = firstBarIn(c);
  for (const n of c.notes) {
    if (n.on < bar0 - 1) continue;
    const s = staves[staffOf(n.voice)];
    const sp = 2 * c.A(n.voice);
    const { base, dot } = value(f, n.dur);
    const k = s.voices.indexOf(n.voice);
    const mid = s.lines[2];
    const up = s.voices.length > 1 ? k === 0 : n.step < mid;
    shapes.push({
      n,
      x: c.xOf(n.on) + 0.1 * sp + wob(n.on, n.step, 3) * sp * 0.3,
      y: c.y(n.step, n.voice),
      sp,
      base,
      dot,
      beams: base <= 0.125 ? 3 : base <= 0.25 ? 2 : base <= 0.5 ? 1 : 0,
      up,
      head: base >= 4 ? "noteheadWhole" : base >= 2 ? "noteheadHalf" : "noteheadBlack",
      stem: base < 4,
    });
  }
  // Ledger lines, accidentals (by the bar, per staff, against the key signature), heads, dots.
  const state = new Map<string, number>();
  let barAt = -1;
  for (const sh of shapes) {
    const { n, x, y, sp } = sh;
    const bar = f.bars.filter((b) => b.on <= n.on).at(-1)?.on ?? 0;
    if (bar !== barAt) state.clear(), (barAt = bar);
    const s = staves[staffOf(n.voice)];
    const ink = st.ink(n);
    const hw = st.headW * sp;
    g.strokeStyle = st.staffInk;
    g.lineWidth = st.line * sp * 1.2;
    for (let l = s.lines[4] + 2; l <= n.step; l += 2) ledger(g, x - 0.3 * sp, c.y(l, n.voice), hw + 0.6 * sp);
    for (let l = s.lines[0] - 2; l >= n.step; l -= 2) ledger(g, x - 0.3 * sp, c.y(l, n.voice), hw + 0.6 * sp);
    const { letter, alter } = spelled(f, n.midi);
    const key = `${staffOf(n.voice)}:${letter}${Math.floor(n.step / 7)}`;
    const was = state.get(key) ?? sig.get(letter) ?? 0;
    if (alter !== was && x > x0) {
      const name: GlyphName = alter > 0 ? "accidentalSharp" : alter < 0 ? "accidentalFlat" : "accidentalNatural";
      glyph(g, st.font, name, x - 1.05 * sp, y, sp, ink);
    }
    state.set(key, alter);
    if (x < x0 - hw) continue;
    if (hand) {
      g.shadowColor = ink;
      g.shadowBlur = 0.12 * sp;
    }
    glyph(g, st.font, sh.head, x, y, sp, ink, hand ? -0.25 + wob(n.on, 7) * 0.5 : 0);
    if (sh.dot) {
      const dy = (n.step - s.lines[0]) % 2 === 0 ? -0.5 * sp : 0;
      g.fillStyle = ink;
      g.beginPath();
      g.arc(x + hw + 0.35 * sp, y + dy, 0.16 * sp, 0, Math.PI * 2);
      g.fill();
    }
    g.shadowBlur = 0;
  }
  // Stems, beams (by the beat), flags.
  const groups: Shape[][] = [];
  const byVoice = new Map<number, Shape[]>();
  for (const sh of shapes) byVoice.set(sh.n.voice, [...(byVoice.get(sh.n.voice) ?? []), sh]);
  for (const list of byVoice.values()) {
    let cur: Shape[] = [];
    let beatOf = -1;
    for (const sh of list) {
      const b = Math.floor((sh.n.on - (f.bars[0]?.on ?? 0)) / c.beat);
      const prev = cur.at(-1);
      const joins = sh.beams > 0 && prev && prev.beams > 0 && b === beatOf && Math.abs(prev.n.on + prev.n.dur - sh.n.on) < 2;
      if (!joins) {
        if (cur.length) groups.push(cur);
        cur = [];
      }
      cur.push(sh);
      beatOf = b;
    }
    if (cur.length) groups.push(cur);
  }
  for (const grp of groups) {
    const sp = grp[0].sp;
    const hw = st.headW * sp;
    const ink = st.ink(grp[0].n);
    const stemW = Math.max(0.8, 0.12 * sp * (hand ? 1.3 : 1));
    if (!grp[0].stem) continue;
    // One direction for a beamed group: its first voice's, or the majority's.
    const up = grp.length > 1 && staves[staffOf(grp[0].n.voice)].voices.length === 1 ? grp.filter((s) => s.up).length * 2 >= grp.length : grp[0].up;
    const sx = (s: Shape) => (up ? s.x + hw - stemW / 2 : s.x + stemW / 2);
    const len = 3.4 * sp;
    if (grp.length === 1 || grp[0].beams === 0) {
      for (const s of grp) {
        const x = sx(s);
        const lean = hand ? 0.08 * len : 0;
        const y2 = up ? s.y - len : s.y + len;
        stroke(g, st.ink(s.n), stemW, x, up ? s.y - 0.1 * sp : s.y + 0.1 * sp, x + (up ? lean : -lean), y2);
        if (s.beams > 0) glyph(g, st.font, (s.beams >= 2 ? (up ? "flag16thUp" : "flag16thDown") : up ? "flag8thUp" : "flag8thDown") as GlyphName, x + (up ? lean : -lean) - stemW / 2, y2, sp, st.ink(s.n));
      }
      continue;
    }
    // The beam: a straight line from the first stem to the last, its slope limited, every stem long enough.
    const xa = sx(grp[0]);
    const xb = sx(grp[grp.length - 1]);
    let slope = (grp[grp.length - 1].y - grp[0].y) / Math.max(1, xb - xa);
    slope = Math.max(-0.22, Math.min(0.22, slope)) * (hand ? 1.2 : 1);
    let ya = up ? Infinity : -Infinity;
    for (const s of grp) {
      const want = up ? s.y - len - slope * (sx(s) - xa) : s.y + len - slope * (sx(s) - xa);
      ya = up ? Math.min(ya, want) : Math.max(ya, want);
    }
    const yAt = (x: number) => ya + slope * (x - xa);
    for (const s of grp) stroke(g, st.ink(s.n), stemW, sx(s), s.y, sx(s), yAt(sx(s)));
    const th = 0.48 * sp * (hand ? 1.15 : 1);
    const gap = 0.75 * sp;
    const lvl = (k: number) => (up ? k * gap : -k * gap);
    beam(g, ink, xa - stemW / 2, yAt(xa) + (up ? 0 : -th), xb + stemW / 2, yAt(xb) + (up ? 0 : -th), th, hand);
    for (let k = 1; k < 3; k++)
      for (let i = 0; i < grp.length; i++) {
        const s = grp[i];
        if (s.beams <= k) continue;
        const nx = grp[i + 1];
        const pv = grp[i - 1];
        let a = sx(s);
        let b = a;
        if (nx && nx.beams > k) b = sx(nx);
        else if (!(pv && pv.beams > k)) {
          if (nx) b = a + hw;
          else a = a - hw;
        } else continue;
        beam(g, ink, a - stemW / 2, yAt(a) + lvl(k) + (up ? 0 : -th), b + stemW / 2, yAt(b) + lvl(k) + (up ? 0 : -th), th, hand);
      }
  }
}
function ledger(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.stroke();
}
function stroke(g: CanvasRenderingContext2D, ink: string, w: number, x1: number, y1: number, x2: number, y2: number) {
  g.strokeStyle = ink;
  g.lineWidth = w;
  g.lineCap = "butt";
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}
function beam(g: CanvasRenderingContext2D, ink: string, x1: number, y1: number, x2: number, y2: number, th: number, hand: number) {
  g.fillStyle = ink;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x2, y2 + th * (hand ? 0.7 : 1));
  g.lineTo(x1, y1 + th);
  g.closePath();
  g.fill();
}

/** The clefs and key signature on a plate at the left (the score scrolls under it). */
function plate(c: Ctx, staves: Staff[], st: Style, paper: string, w: number, names?: string[]) {
  const { g } = c;
  const grad = g.createLinearGradient(w - 14, 0, w, 0);
  grad.addColorStop(0, paper);
  grad.addColorStop(1, `${paper}00`);
  rect(g, 0, 0, w - 14, c.H, paper);
  g.fillStyle = grad;
  g.fillRect(w - 14, 0, 14, c.H);
  const sig = keySignature(c.f.key);
  const SH = [38, 35, 39, 36, 33, 37, 34];
  const FL = [34, 37, 33, 36, 32, 35, 31];
  staves.forEach((s, i) => {
    const v = s.voices[0];
    const sp = 2 * c.A(v);
    const x = names ? 0.9 * sp + 18 : 0.6 * sp;
    g.strokeStyle = st.staffInk;
    g.lineWidth = st.line * sp;
    for (const l of s.lines) ledger(g, names ? 18 : 0, c.y(l, v), w - (names ? 18 : 0));
    if (s.clef === "g") glyph(g, st.font, "gClef", x, c.y(32, v), sp, st.staffInk);
    else if (s.clef === "f") glyph(g, st.font, "fClef", x, c.y(24, v), sp, st.staffInk);
    else glyph(g, st.font, "cClef", x, c.y(s.lines[0], v), sp, st.staffInk);
    const n = [...sig.values()].length;
    const sharp = [...sig.values()][0] > 0;
    for (let k = 0; k < n; k++) {
      let pos = (sharp ? SH : FL)[k] - (s.clef === "f" ? 14 : 0);
      while (pos > s.lines[4] + 1) pos -= 7;
      while (pos < s.lines[0] - 1) pos += 7;
      glyph(g, st.font, sharp ? "accidentalSharp" : "accidentalFlat", x + 3.1 * sp + k * 0.95 * sp, c.y(pos, v), sp, st.staffInk);
    }
    if (names) {
      g.fillStyle = st.staffInk;
      g.font = `italic ${Math.round(Math.max(9, sp * 1.1))}px "Liberation Serif", Georgia, serif`;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText(names[i], 2, c.y(s.lines[2], v));
    }
  });
}

/** Tall square brackets round the entries (a hand's, or an engraver's), their names over them. */
function brackets(c: Ctx, es: UEntry[], color: (e: UEntry) => string, font: string, word: (e: UEntry) => string, hand = 0) {
  const { g } = c;
  const placed: { a: number; b: number; y: number }[] = [];
  for (const e of [...es].sort((a, b) => a.on - b.on)) {
    const A = c.A(e.voice);
    let top = Infinity;
    let bot = -Infinity;
    for (const n of e.path) (top = Math.min(top, c.y(n.step, e.voice))), (bot = Math.max(bot, c.y(n.step, e.voice)));
    top -= 4.2 * A;
    bot += 1.6 * A;
    const x1 = c.xOf(e.on) - 0.6 * A;
    const x2 = c.xOf(e.end) - 0.6 * A;
    const col = color(e);
    g.strokeStyle = col;
    g.lineWidth = Math.max(1.2, A * 0.22);
    const j = (k: number) => (hand ? (hash(e.on, k) - 0.5) * hand * A : 0);
    g.beginPath();
    g.moveTo(x1 + 0.9 * A + j(1), top + j(2));
    g.lineTo(x1 + j(3), top);
    g.lineTo(x1 + j(4), bot);
    g.lineTo(x1 + 0.9 * A + j(5), bot + j(6));
    g.moveTo(x2 - 0.9 * A + j(7), top);
    g.lineTo(x2 + j(8), top + j(9));
    g.lineTo(x2 + j(10), bot);
    g.lineTo(x2 - 0.9 * A, bot + j(11));
    g.stroke();
    g.font = font;
    const text = word(e);
    const tw = g.measureText(text).width;
    let y = top - 0.6 * A;
    for (let moved = true; moved; ) {
      moved = false;
      for (const p of placed)
        if (p.a < x1 + tw + 6 && x1 < p.b + 6 && Math.abs(p.y - y) < 2.4 * A + 6) {
          y = p.y - 2.4 * A - 6;
          moved = true;
        }
    }
    placed.push({ a: x1, b: x1 + tw, y });
    g.fillStyle = col;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillText(text, x1 + 0.2 * A, Math.max(10, y));
  }
}

const voiceWord = (c: Ctx, v: number) => (c.names[v] ?? "").toLowerCase().replace(/^./, (s) => s.toUpperCase());

// ---------------------------------------------------------------------------------------------------

const MS_BARS = 1.5;
const paperCache = new Map<string, HTMLCanvasElement>();
/** Foxed paper: a warm ground, darker edges, fibres, brown spots (made once per size). */
function paper(w: number, h: number): HTMLCanvasElement {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  const hit = paperCache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  const g = cv.getContext("2d")!;
  const base = g.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  base.addColorStop(0, "#ead9b0");
  base.addColorStop(1, "#cdb07c");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 60; i++) {
    const x = hash(i, 1) * w;
    const y = hash(i, 2) * h;
    g.fillStyle = hash(i, 3) > 0.5 ? "rgba(120,80,40,0.06)" : "rgba(255,250,230,0.08)";
    g.fillRect(x, y, 1 + hash(i, 4) * 2, 1);
  }
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 5) * w;
    const y = hash(i, 6) * h;
    const r = 4 + hash(i, 7) * 26;
    const s = g.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, `rgba(140,90,40,${0.06 + hash(i, 8) * 0.12})`);
    s.addColorStop(1, "rgba(140,90,40,0)");
    g.fillStyle = s;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  paperCache.set(key, cv);
  return cv;
}
export const MANUSCRIPT: Template = {
  name: "MANUSCRIPT",
  pixel: 0,
  bars: MS_BARS,
  playhead: 0.32,
  chrome: true,
  css: ".ui-manuscript .tg-box { background: #3a2a1a !important; }",
  geo: (L) => grandGeo(L, MS_BARS, 22, 6),
  paint(c) {
    const { g, W, H } = c;
    g.drawImage(paper(W, H), 0, 0, W, H);
    const A = c.A(0);
    const sp = 2 * A;
    // The other side showing through: faint strokes, mirrored, tied to the bars (they scroll with the page).
    for (const l of gridLines(c)) {
      if (!l.bar) continue;
      for (let k = 0; k < 14; k++) {
        const x = c.xOf(l.t) + hash(l.n, k, 1) * (c.xOf(l.t + c.f.barTicks) - c.xOf(l.t));
        const y = c.y(18 + hash(l.n, k, 2) * 22, 0);
        g.globalAlpha = 0.07;
        g.fillStyle = "#4a2e17";
        g.beginPath();
        g.ellipse(x, y, 0.6 * sp, 0.4 * sp, 0.4, 0, Math.PI * 2);
        g.fill();
        g.fillRect(x - 0.6 * sp, y, 1.2, 3 * sp);
      }
      g.globalAlpha = 1;
    }
    const staves = grandStaves(c.count, "c1");
    const brown = "#5a3a1e";
    const ink = (n: UNote) => (n.mine ? (n.state === "miss" ? "#9c8466" : "#140b05") : n.entry?.live ? "#9a2a14" : "#6b4a2c");
    const st: Style = { font: PETALUMA, ink, staffInk: brown, line: 0.07, hand: 1, headW: 1.25 };
    const plateW = sp * (4.8 + keySignature(c.f.key).size * 0.95);
    engrave(c, staves, st, plateW - 12);
    brackets(c, c.entries.filter((e) => e.live), (e) => (e.mine ? "#140b05" : "#a8321e"), `italic ${Math.round(Math.max(11, A * 1.9))}px "Liberation Serif", Georgia, serif`, (e) => `${e.form === "answer" ? "Risposta" : "Thema"} · ${voiceWord(c, e.voice)}${e.stretto ? " · stretto" : ""}`, 0.5);
    // The plate: the paper again, Bach's clefs and signature in his hand.
    g.save();
    g.beginPath();
    g.rect(0, 0, plateW, H);
    g.clip();
    g.drawImage(paper(W, H), 0, 0, W, H);
    g.restore();
    plate(c, staves, st, "#e2cd9f", plateW);
    // The heading, as he wrote it: "Fuga 2. à 3."
    g.fillStyle = "#4a2e17";
    g.font = `italic ${Math.round(17)}px "Liberation Serif", Georgia, serif`;
    g.textAlign = "left";
    g.textBaseline = "top";
    g.fillText(`${c.f.kind === "prelude" ? "Praeludium" : "Fuga"} ${c.f.number}. à ${c.count}.`, plateW + 4, 3);
    // The now: a graphite line and a manicule.
    rect(g, c.playX, 20, 1, H - 24, "#4b4b50", 0.5);
    g.fillStyle = "#3c2a18";
    g.font = `20px "DejaVu Sans", serif`;
    g.textAlign = "center";
    g.fillText("☟", c.playX, 1);
    // The edge of the leaf.
    const v = g.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(90,60,30,0.25)");
    v.addColorStop(0.08, "rgba(90,60,30,0)");
    v.addColorStop(0.92, "rgba(90,60,30,0)");
    v.addColorStop(1, "rgba(90,60,30,0.3)");
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    void mix;
  },
};
