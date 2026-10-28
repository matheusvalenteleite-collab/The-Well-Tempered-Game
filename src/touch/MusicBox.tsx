/**
 * The music box (D169): the whole piece, every voice, drawn as an 8-bit roll on a low-resolution canvas
 * (one canvas pixel is PX CSS pixels), time running right to left past a fixed playhead. One fixed
 * ladder of staff steps covers the piece's whole range, so the voices keep their places (the bass
 * always below the soprano) and every note is a block of the same height. The voice played is drawn
 * full and outlined; the others in their colours, dimmer. A hit note shines; a missed one goes dark and
 * shakes; a long note let go early goes dark from there. The roll takes the colour of the key.
 * D174, the subject: its notes, in whatever voice, are dotted along their top; a ◆ stands over the
 * first note of each entry as it comes, in the voice's colour, gold when the voice is the player's.
 */
import { tr } from "../i18n/index.ts";
import { bossBar, cadenceMarks, flags, pixRaw, pixText, sparks, subjectFx, textWidth, zoneGlow, type Burst, type Pop, type Span } from "./box-fx.ts";
import { ART_HOLD } from "./phrasing.ts";
import { firstFrom, lyricsOf, type Syllable } from "./lyrics.ts";
import { markLegend, marksHas } from "./readings.ts";
import { STRONG_SIDE } from "./touch-expr.ts";
import { paintVariant } from "./box-variants.ts";
import { paintUi } from "./ui/index.ts";
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import type { LaneNote } from "./lanes.ts";
import { fugueById } from "./fugue.ts";
import { SIGN_PIXELS, alterAgainst, chromaShift, signOf, signatureOf } from "./chroma.ts";
import type { OtherNote } from "./voice-mode.ts";
import { firstSounding } from "./visible.ts";
import { membership, raiseOf, subjectInkOf, subjectRimOf, themeOf } from "./subject-hue.ts";

/** CSS pixels per canvas pixel: the chunkiness of the 8-bit look. */
const PX = 2;
/** How many bars the box shows at once, and where the playhead stands (fraction of the width). */
const BARS_SHOWN = 3;
const PLAYHEAD = 0.25;

/** The voices' colours, top voice first, for two to five voices. */
const INKS: Record<number, string[]> = {
  2: ["#5cb2ff", "#5fe08a"],
  3: ["#5cb2ff", "#ff8c4a", "#5fe08a"],
  4: ["#5cb2ff", "#ff8c4a", "#c78bff", "#5fe08a"],
  5: ["#5cb2ff", "#7fe3e0", "#ff8c4a", "#c78bff", "#5fe08a"],
};
export function inkOf(voice: number, count: number): string {
  return (INKS[count] ?? INKS[4])[voice] ?? "#ecead9";
}

/** The roll's colour in a key (D167: all 24): the circle of fifths round the hue wheel, minor keys darker. */
export function keyTint(key: string, light = 0): string {
  const pcs: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  let pc = pcs[key[0].toLowerCase()] ?? 0;
  if (key[1] === "#") pc++;
  if (key[1] === "b") pc--;
  pc = (pc + 12) % 12;
  const fifths = (pc * 7) % 12;
  const minor = key[0] === key[0].toLowerCase();
  const hue = (220 + fifths * 30) % 360;
  return `hsl(${hue} ${minor ? 55 : 45}% ${(minor ? 13 : 17) + light}%)`;
}

/**
 * The ladder as paint() lays it out in a roll `cssH` pixels high: each staff step's middle (CSS px from
 * the roll's top), and a row's height (D179: the testbench's side bars line up with it).
 */
/** A key of LADDER on a computer: a step or a leap, up or down, or the same note. */
export type Arrow = "up" | "down" | "left" | "right" | "rise" | "fall" | "same" | "right2" | "left2" | "free";
/** The keys' arrows, 5 by 5. */
export const ARROW_PIXELS: Record<Arrow, string[]> = {
  up: ["00100", "01110", "10101", "00100", "00100"],
  down: ["00100", "00100", "10101", "01110", "00100"],
  right: ["00100", "00010", "11111", "00010", "00100"],
  left: ["00100", "01000", "11111", "01000", "00100"],
  rise: ["00111", "00011", "00101", "01000", "10000"],
  fall: ["10000", "01000", "00101", "00011", "00111"],
  same: ["00000", "00000", "01100", "01100", "00000"],
  right2: ["10100", "01010", "00101", "01010", "10100"],
  left2: ["00101", "01010", "10100", "01010", "00101"],
  free: ["11111", "10001", "10001", "10001", "11111"],
};

export function ladderGeometry(lo: number, hi: number, cssH: number): { yOf: (step: number) => number; rowH: number } {
  const h = Math.max(1, Math.floor(cssH / PX));
  const rows = hi - (lo - 1) + 2;
  const rowH = Math.max(2, Math.floor(h / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  return { yOf: (step) => (top + (hi + 1 - step) * rowH + rowH / 2) * PX, rowH: rowH * PX };
}

/**
 * D353: an ornament as performed (proto-game.ts Performed): whose (the band's or the player's), its note
 * (the voice, the staff step and pitch, its written end) and its notes as they sounded ([onset, length,
 * MIDI] in ticks).
 */
export interface OverlayOrnament {
  band: boolean;
  voice: number;
  step: number;
  midi: number;
  /** D362: its note's written onset (its sign moved aside once it sounds). */
  on: number;
  end: number;
  parts: [number, number, number][];
}

/** D353: the overlay fades over this long (s) once its note has gone by. */
export const OVERLAY_FADE_S = 1;

/**
 * D353, THE OVERLAY (the owner's design: "a performed ornament drawn as a translucent layer over the
 * written melody, only when performed"): each realised note on the box's own rows (its staff step, a
 * neighbour raised or lowered against the key as D332 draws it), from its onset for its length, only
 * once it sounds, in the voice's colour (gold for the player); once the note has gone by it fades over
 * OVERLAY_FADE_S. D362, legible on a phone: drawn above the ornament signs (the player's sign steps up
 * and dims once its ornament sounds), on a dark 1 px halo; the player's notes at least 3 px high and 2 px
 * wide, at 90% opacity; a neighbour at least 3 px from the main note's row (rows are about 4 px apart on
 * the box), so a trill's alternation reads; notes narrower than 3 px drawn as a 2 px zig-zag between the
 * rows. The band's fainter (50%) and thinner (2 px, 1 px line), over their thin bars.
 */
function paintOverlay(
  g: CanvasRenderingContext2D,
  fr: Frame,
  b: { xOf: (t: number) => number; yOf: (s: number) => number; hOf: (s: number) => number; bh: number; w: number; lift: (step: number, midi: number) => number; gold: string },
) {
  for (const p of fr.performed ?? []) {
    const fade = 1 - (fr.now - p.end) / (OVERLAY_FADE_S * fr.tps);
    if (fade <= 0 || !p.parts.length) continue;
    const shown = p.parts.filter((q) => q[0] <= fr.now);
    if (!shown.length || b.xOf(shown[0][0]) > b.w || b.xOf(p.end) < 0) continue;
    const alpha = Math.min(1, fade) * (p.band ? 0.5 : 0.9);
    const ink = p.band ? inkOf(p.voice, fr.count) : b.gold;
    const thick = p.band ? 1 : 2;
    const rowOf = (m: number) => p.step + Math.sign(m - p.midi);
    const centre = (m: number) => {
      const st = rowOf(m);
      return b.yOf(st) - b.lift(st, m) + Math.floor((b.hOf(st) - 1) / 2);
    };
    const y0 = centre(p.midi);
    // A neighbour at least 3 px off the main note's row (more when the rows are wider apart).
    const mid = (m: number) => {
      const y = centre(m);
      const d = Math.sign(m - p.midi);
      return d === 0 ? y0 : d > 0 ? Math.min(y, y0 - 3) : Math.max(y, y0 + 3);
    };
    // The shapes once: blocks and the zig-zag's points.
    const blocks: [number, number, number, number][] = [];
    const lines: { x: number; y: number }[][] = [];
    let line: { x: number; y: number }[] = [];
    const flush = () => {
      if (line.length) lines.push(line);
      line = [];
    };
    for (let k = 0; k < shown.length; k++) {
      const [on, len, m] = shown[k];
      const x1 = b.xOf(on);
      const x2 = b.xOf(on + len);
      const y = mid(m);
      if (x2 - x1 < 3) {
        line.push({ x: x1, y });
        // The line runs on to this note's end where the next is a block or none has sounded yet.
        const nx = shown[k + 1];
        if (!nx || b.xOf(nx[0] + nx[1]) - b.xOf(nx[0]) >= 3) line.push({ x: Math.max(x1 + 1, x2 - 1), y });
        continue;
      }
      if (line.length) (line.push({ x: x1, y }), flush());
      const hh = b.hOf(rowOf(m));
      const th = p.band ? Math.max(2, Math.round(hh * 0.35)) : Math.max(3, Math.round(hh * 0.6));
      blocks.push([x1, y - Math.floor((th - 1) / 2), Math.max(2, x2 - x1 - 1), th]);
    }
    flush();
    // The halo (dark, a pixel round every shape), then the colour.
    for (const [pass, style, grow] of [[0, "#000", 1], [1, ink, 0]] as const) {
      g.globalAlpha = pass === 0 ? alpha * 0.55 : alpha;
      g.fillStyle = style;
      for (const [x, y, bw, th] of blocks) g.fillRect(x - grow, y - grow, bw + 2 * grow, th + 2 * grow);
      for (const l of lines) {
        for (let k = 1; k < l.length; k++) seg(g, l[k - 1].x, l[k - 1].y, l[k].x, l[k].y, thick + 2 * grow, grow);
        if (l.length === 1) g.fillRect(l[0].x - grow, l[0].y - grow, thick + 2 * grow, thick + 2 * grow);
      }
    }
  }
  g.globalAlpha = 1;
}

/** A line `t` px thick from (x0, y0) to (x1, y1) (its pixels from `o` px up and left of the path). */
function seg(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t = 1, o = 0) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, t, t);
}

export interface Frame {
  /** The tick the ear is at. */
  now: number;
  /** Ticks per second, for the effects timed in seconds. */
  tps: number;
  key: string;
  barTicks: number;
  beatTicks: number;
  /** How many voices the piece has (for the inks). */
  count: number;
  /** The piece's range of staff steps: the ladder. */
  lo: number;
  hi: number;
  /**
   * D211: the whole piece's range, where the ladder is only the voice's (LADDER): the other voices'
   * notes beyond it are drawn squeezed into the box's margins above and below, so all the music shows
   * and the rows (lined up with the bars) keep their size.
   */
  spill?: { lo: number; hi: number };
  /** The voice played, and its notes as the game judges them. */
  voice: number;
  notes: LaneNote[];
  /** Every other voice's notes. */
  others: OtherNote[];
  /** The subject's notes ("voice:onset") and the entries' first notes, if the piece has them. */
  subject?: Set<string>;
  entries?: { voice: number; on: number; step: number }[];
  /** What the player has sounded (the testbench, D170): the pitch as a step, fractions allowed, in time. */
  trace?: { tick: number; step: number; on: boolean }[];
  /** The testbench (D178): each touch, at the step it asked for, right or wrong. */
  marks?: { tick: number; step: number; ok: boolean }[];
  /** The testbench's score (D181): each entry ("voice:onset") captured (gold) or lost (grey). */
  entryState?: Map<string, "captured" | "lost" | "open">;
  /** The testbench's TWO VOICES (D180): a second voice played, drawn as the first. */
  voice2?: number;
  notes2?: LaneNote[];
  /** The testbench's THUMBS ↔ (D178): each note's move (aligned with `notes`), drawn as the thumb it wants. */
  /** LADDER on a computer (D183): the key each note asks for, drawn over it. */
  arrows?: (Arrow | null)[];
  /** D186: the entries drawn whole (box-fx.ts), the voices' names, the bosses (the player's entries), points and bursts, the zone. */
  spans?: Span[];
  names?: string[];
  bossFight?: boolean;
  pops?: Pop[];
  bursts?: Burst[];
  zone?: "pleno" | "fuoco" | null;
  /** D205: each ornamented note's sign ("voice:onset" → "TR", "~|"…). */
  ornaments?: Map<string, string>;
  /** D353: the ornaments performed (the player's, the band's), drawn over their notes as they sound (the overlay). */
  performed?: OverlayOrnament[];
  /** D314: a line over the box (the ornament's first-time hint: "A SIGN OVER A NOTE: TOUCH IT, THEN SHAKE YOUR THUMB"). */
  banner?: string;
  /** D314: the reading's marks explained (a small legend) until this tick: the start of a round where marks appear. */
  legendUntil?: number;
  /** D272: the reading's marks on the subject's notes ("voice:onset"): joined to the next, detached, short, accented. */
  readingMarks?: Map<string, { join: boolean | null; short: boolean | null; accent: boolean | null; slur?: "first" | "mid" | "last" }>;
  /** D194: the cadences, named. */
  cadences?: { on: number; text: string }[];
  /** Each voice's range of steps (the design study's staves, box-variants.ts). */
  ranges?: { lo: number; hi: number }[];
  /** The piece's id (the interface templates, ui/index.ts, `?ui=NAME`). */
  piece?: string;
}

export function MusicBox({ frame, hud, legend, children }: { frame: MutableRefObject<Frame>; hud: ReactNode; legend: ReactNode; children?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = wrap.current;
      if (el && canvas.current) paint(canvas.current, el.clientWidth, el.clientHeight, frame.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frame]);

  return (
    <section className="tg-box" aria-label="Music box">
      <header className="tg-hud">{hud}</header>
      <div className="tg-roll" ref={wrap}>
        <canvas ref={canvas} />
        {children}
      </div>
      <footer className="tg-legend">{legend}</footer>
    </section>
  );
}

/** D298: a picture drawn in the box's place (the SHEET mode, src/bench/sheet-view.ts): true where it drew. */
export type BoxPainter = (c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame) => boolean;
let boxPainter: BoxPainter | null = null;
export function setBoxPainter(p: BoxPainter | null) {
  boxPainter = p;
}

function paint(c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame) {
  if (boxPainter?.(c, cssW, cssH, fr)) return;
  // D228: the interface chosen (ui/index.ts: ⚙ INTERFACE, or `?ui=NAME`), unless CLASSIC.
  if (paintUi(c, cssW, cssH, fr)) return;
  paintClassic(c, cssW, cssH, fr);
}

/** D332: the piece's key signature (its own key; the frame's key where the piece is unknown). */
const sigMemo = new Map<string, number[]>();
function signatureFor(fr: Frame): number[] {
  const key = fr.piece ? fugueById(fr.piece).key : fr.key;
  let s = sigMemo.get(key);
  if (!s) sigMemo.set(key, (s = signatureOf(key)));
  return s;
}

/** The box as it was (CLASSIC); also the INTERFACE panel's thumbnail. */
export function paintClassic(c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame) {
  const w = Math.max(1, Math.floor(cssW / PX));
  const h = Math.max(1, Math.floor(cssH / PX));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
    c.style.width = `${w * PX}px`;
    c.style.height = `${h * PX}px`;
  }
  const g = c.getContext("2d")!;
  // D228: an interface drawn before (a change in ⚙) may have left its scale.
  g.setTransform(1, 0, 0, 1, 0, 0);
  const css = getComputedStyle(c);
  const tok = (name: string) => css.getPropertyValue(name).trim();
  // The design study (box-variants.ts): only with `?boxv=N` in the page's address.
  if (fr.spill && paintVariant(g, w, h, fr)) return;

  g.fillStyle = keyTint(fr.key);
  g.fillRect(0, 0, w, h);

  const span = BARS_SHOWN * fr.barTicks;
  const t0 = fr.now - PLAYHEAD * span;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);
  const playX = xOf(fr.now);
  // The ladder: one row per staff step over the piece's range, a step of room either side.
  const lo = fr.lo - 1;
  const rows = fr.hi - lo + 2;
  const rowH = Math.max(2, Math.floor(h / rows));
  const top = Math.floor((h - rowH * rows) / 2);
  const lin = (step: number) => top + (fr.hi + 1 - step) * rowH;
  const bh = Math.max(2, rowH);
  // D211: beyond the ladder, the margins: every step above it squeezed into the space over the top
  // row, every step below into the space under the bottom one.
  const sp = fr.spill;
  const upTo = sp ? Math.max(fr.hi, sp.hi) : fr.hi;
  const downTo = sp ? Math.min(fr.lo, sp.lo) : fr.lo;
  const capH = lin(fr.hi);
  const footY = lin(fr.lo) + rowH;
  const footH = h - footY;
  const upTh = Math.max(1, Math.floor(capH / Math.max(1, upTo - fr.hi + 1)));
  const downTh = Math.max(1, Math.floor(footH / Math.max(1, fr.lo - downTo + 1)));
  const yOf = (step: number) =>
    !sp || (step <= fr.hi && step >= fr.lo)
      ? lin(step)
      : step > fr.hi
        ? Math.max(0, Math.round(capH - ((step - fr.hi) / (upTo - fr.hi + 1)) * capH) - upTh)
        : Math.min(h - downTh, Math.round(footY + ((fr.lo - step) / (fr.lo - downTo + 1)) * footH));
  const hOf = (step: number) => (!sp || (step <= fr.hi && step >= fr.lo) ? bh : step > fr.hi ? upTh : downTh);
  if (sp && (upTo > fr.hi || downTo < fr.lo)) {
    // The margins a shade darker, a hairline where the ladder begins and ends.
    g.fillStyle = "rgba(0,0,0,0.22)";
    if (upTo > fr.hi) g.fillRect(0, 0, w, capH);
    if (downTo < fr.lo) g.fillRect(0, footY, w, footH);
    g.fillStyle = "rgba(255,255,255,0.08)";
    if (upTo > fr.hi) g.fillRect(0, capH, w, 1);
    if (downTo < fr.lo) g.fillRect(0, footY - 1, w, 1);
  }

  // Beats faint, bar lines brighter.
  for (let t = Math.floor(t0 / fr.beatTicks) * fr.beatTicks; t < t0 + span; t += fr.beatTicks) {
    g.fillStyle = tok(t % fr.barTicks === 0 ? "--tg-barline" : "--tg-grid");
    g.fillRect(xOf(t), 0, 1, h);
  }

  // D332: a note altered against the piece's key signature drawn a fraction of a row up (raised) or down
  // (lowered), so that F and F♯ (E♭ and E♮) no longer share a height; its sign on the block (chroma.ts).
  const sig = signatureFor(fr);
  const shift = chromaShift(bh);
  const altOf = (step: number, midi: number) => (shift && hOf(step) === bh ? alterAgainst(step, midi, sig) : 0);

  const fx = { g, w, h, xOf, yOf, hOf, bh, now: fr.now, tps: fr.tps, gold: tok("--tg-gold"), miss: tok("--tg-miss"), fg: tok("--tg-fg"), ink: (v: number) => inkOf(v, fr.count) };
  // D372: the effects' clock (s), and the voices played (the effects' passes).
  const fxClock = performance.now() / 1000;
  PLAYED_VOICES[0] = fr.voice;
  PLAYED_VOICES[1] = fr.notes2 && fr.voice2 !== undefined ? fr.voice2 : fr.voice;
  const playedVoices = PLAYED_VOICES;

  // The other voices: their colours, dimmer.
  // D269: never mistaken for the player's: thinner (half a row, centred), flat (no shadow, no white
  // outline); a note glows while it sounds (brighter, a faint halo in its colour), never in the player's
  // hit colour.
  // D352: a subject note (subject-hue.ts) in its voice's colour bent toward its subject's primary (1 red,
  // 2 blue, 3 yellow), a rim of the primary round it, a keel of the voice's own ink along its foot; and
  // while its entry sounds the voice is raised (taller, brighter, a halo of the primary), faded in and
  // out over 150 ms: near the player's prominence, never their white outline or their full row.
  const spans = fr.spans;
  const otherIdx = spans ? membership(fr.others, spans) : null;
  // D345: from the first note that can still show (the notes gone by not walked again every frame).
  for (let oi = firstSounding(fr.others, t0, span); oi < fr.others.length; oi++) {
    const o = fr.others[oi];
    const x1 = xOf(o.on);
    if (x1 > w) break;
    const x2 = xOf(o.on + o.dur);
    if (x2 < 0) continue;
    const oh = hOf(o.step);
    const full = oh === bh;
    const si = otherIdx ? otherIdx[oi] : -1;
    const sounding = fr.now >= o.on && fr.now < o.on + o.dur;
    const voiceInk = inkOf(o.voice, fr.count);
    const bw = Math.max(1, x2 - x1 - 1);
    const oy = yOf(o.step) - altOf(o.step, o.midi) * shift;
    if (si >= 0) {
      const sp = spans![si];
      const theme = themeOf(sp);
      const rim = subjectRimOf(voiceInk, theme);
      const r = raiseOf(sp, fr.now, fr.tps);
      const th = full ? Math.max(1, Math.round(bh * (0.5 + 0.22 * r))) : oh;
      const y = oy + (full ? Math.floor((bh - 1 - th) / 2) : 0);
      // Each block its own (D332's gap, so the rims do not run the notes together).
      const sw = Math.max(1, x2 - x1 - (x2 - x1 >= 7 ? 3 : x2 - x1 >= 4 ? 2 : 1));
      g.fillStyle = rim;
      if (r > 0 && full) {
        g.globalAlpha = 0.14 * r;
        g.fillRect(x1 - 2, y - 2, sw + 4, th + 4);
      }
      g.globalAlpha = 0.4 + 0.45 * r;
      g.fillRect(x1 - 1, y - 1, sw + 2, th + 2);
      g.globalAlpha = sounding ? 1 : 0.75 + 0.17 * r;
      g.fillStyle = subjectInkOf(voiceInk, theme);
      g.fillRect(x1, y, sw, th);
      if (th >= 4) {
        g.fillStyle = voiceInk;
        g.fillRect(x1, y + th - 1, sw, 1);
      }
      if (sounding && th > 1) {
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(x1, y, sw, 1);
      }
      continue;
    }
    const th = full ? Math.max(1, Math.round(bh * 0.5)) : oh;
    const y = oy + (full ? Math.floor((bh - 1 - th) / 2) : 0);
    if (sounding && full) {
      g.globalAlpha = 0.22;
      g.fillStyle = voiceInk;
      g.fillRect(x1 - 1, oy - 1, bw + 2, bh + 1);
    }
    g.globalAlpha = sounding ? 1 : full ? 0.45 : 0.7;
    g.fillStyle = voiceInk;
    g.fillRect(x1, y, bw, th);
    if (sounding && th > 1) {
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x1, y, bw, 1);
    }
    if (!spans && fr.subject?.has(`${o.voice}:${o.on}`)) dots(g, x1, x2, yOf(o.step), tok("--tg-fg"));
  }
  g.globalAlpha = 1;
  // D372: the others' subjects' effects, under the player's notes.
  if (spans) subjectFx(fx, spans, playedVoices, false, fr.piece, fr.beatTicks, fxClock);

  // The voice played (or two): full, outlined.
  const shine = tok("--tg-shine");
  const miss = tok("--tg-miss");
  const edge = tok("--tg-fg");
  // D347: the sung words under the player's voice (drawn first: the blocks stay on top).
  const syls = fr.piece ? lyricsOf(fugueById(fr.piece), fr.voice) : null;
  if (syls) paintLyrics(g, syls, fr, { xOf, yOf, lift: (n) => altOf(n.step, n.midi) * shift, bh, w, h, t0, t1: t0 + span, ink: edge });
  const played: [number, LaneNote[]][] = [[fr.voice, fr.notes]];
  if (fr.notes2 && fr.voice2 !== undefined) played.push([fr.voice2, fr.notes2]);
  // D372 (Mario's report §5, language A): the reading's marks live inside the notes' own shapes, nothing
  // hangs above them but a slur's arc. JOINED: the block runs on into the next (no D332 gap), a bridge
  // where the rows differ, one white outline round the group and a thin dark seam between its notes.
  // DETACHED: D332's gap, the block's end a bright wall. SHORT: the written length kept as a hollow
  // outline, only the part to play (the band's ART_HOLD.short) filled. ACCENT: a bright strike edge and
  // wedge at the note's start. Drawn in three passes (halos and shadows, outlines, fills) so a group's
  // outline is one shape.
  for (const [pv, pnotes] of played) {
    const inkPv = inkOf(pv, fr.count);
    const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
    const mineIdx = spans ? membership(pnotes, spans, pv) : null;
    const mks = fr.readingMarks?.size ? marksIndex(pnotes, pv, fr.readingMarks) : null;
    const from = firstSounding(pnotes, t0, span);
    /** The note's block (into G): its place, width, filled width, the next note it fuses into (-1 none). */
    const geo = (ni: number) => {
      const n = pnotes[ni];
      G.x1 = xOf(n.on);
      const x2 = xOf(n.on + n.dur);
      G.y = yOf(n.step) - altOf(n.step, n.midi) * shift;
      G.fuse = -1;
      // D332: every block its own, a gap of the roll between it and the next (the fill stops 3 px short).
      G.bw = Math.max(1, x2 - G.x1 - (x2 - G.x1 >= 7 ? 3 : x2 - G.x1 >= 4 ? 2 : 1));
      const mk = mks ? mks[ni] : undefined;
      G.mk = mk;
      if (mk?.join && !mk.short && n.state !== "miss" && !n.ride) {
        let q = ni + 1;
        while (q < pnotes.length && pnotes[q].on <= n.on) q++;
        const nx = pnotes[q];
        if (nx && nx.on <= n.on + n.dur && nx.state !== "miss" && !nx.ride) {
          G.fuse = q;
          G.bw = Math.max(1, xOf(nx.on) - G.x1);
          G.ny = yOf(nx.step) - altOf(nx.step, nx.midi) * shift;
        }
      }
      G.fw = mk?.short && G.bw >= 4 ? Math.max(2, Math.round(G.bw * ART_HOLD.short)) : G.bw;
      return x2;
    };
    // Pass 1: the subject's halo, the voxel shadow (D202).
    for (let ni = from; ni < pnotes.length; ni++) {
      const n = pnotes[ni];
      if (xOf(n.on) > w) break;
      if (n.state === "miss" || n.ride) continue;
      if (geo(ni) < 0) continue;
      const si = mineIdx ? mineIdx[ni] : -1;
      const r = si >= 0 ? raiseOf(spans![si], fr.now, fr.tps) : 0;
      // D352: while the player's own entry sounds, a halo of its subject colour round the white outline.
      if (r > 0) {
        g.globalAlpha = 0.85 * r;
        g.fillStyle = subjectRimOf(inkPv, themeOf(spans![si]));
        g.fillRect(G.x1 - 2, G.y - 2, G.bw + 4, bh + 3);
        if (G.fuse >= 0) bridge(g, G, bh, 2);
        g.globalAlpha = 1;
      }
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(G.x1 + 1, G.y + 1, G.fw + 1, bh);
    }
    // Pass 2: the white outline (D279), round a joined group as one shape.
    g.fillStyle = edge;
    for (let ni = from; ni < pnotes.length; ni++) {
      const n = pnotes[ni];
      if (xOf(n.on) > w) break;
      if (n.state === "miss" || n.ride) continue;
      if (geo(ni) < 0) continue;
      g.fillRect(G.x1 - 1, G.y - 1, G.fw + 2, bh + 1);
      if (G.fuse >= 0) bridge(g, G, bh, 1);
    }
    // Pass 3: the fills, the signs and the states.
    for (let ni = from; ni < pnotes.length; ni++) {
      const n = pnotes[ni];
      // D214: SUBJECT's line passes between voices, each note in its own colour.
      const voiceInk = n.voice === undefined || n.voice === pv ? inkPv : inkOf(n.voice, fr.count);
      // D352, D368: a subject note in its own voice's colour, modified (its keel the voice's plain ink).
      const si = mineIdx ? mineIdx[ni] : -1;
      const sp = si >= 0 ? spans![si] : null;
      const ink = sp ? subjectInkOf(voiceInk, themeOf(sp)) : voiceInk;
      if (xOf(n.on) > w) break;
      if (geo(ni) < 0) continue;
      let x1 = G.x1;
      const { y, bw, fw, mk } = G;
      const alt = altOf(n.step, n.midi);
      if (n.state === "miss") {
        const t = sinceMs(n.at);
        if (t < 300) x1 += Math.round(Math.sin(t / 22) * 2 * (1 - t / 300));
        g.fillStyle = miss;
        g.fillRect(x1, y, bw, bh - 1);
        continue;
      }
      if (n.ride) {
        // D191: a note that rides (too quick to strike, played for the player): thin, unoutlined, faint until it sounds.
        const th = Math.max(1, Math.floor(bh / 2));
        g.globalAlpha = n.state === "hit" ? 0.9 : 0.5;
        g.fillStyle = n.state === "hit" ? shine : ink;
        g.fillRect(x1, y + Math.floor((bh - th) / 2), bw, th);
        g.globalAlpha = 1;
        continue;
      }
      g.fillStyle = ink;
      g.fillRect(x1, y, fw, bh - 1);
      if (G.fuse >= 0) {
        bridge(g, G, bh, 0);
        // The seam: a thin dark line where one note gives way to the next (inside the group's outline).
        const a = Math.min(y, G.ny);
        const z = Math.max(y, G.ny) + bh - 1;
        g.fillStyle = "rgba(0,0,0,0.42)";
        g.fillRect(x1 + bw - 1, a + (bh >= 5 ? 1 : 0), 1, Math.max(1, z - a - (bh >= 5 ? 2 : 0)));
      }
      if (fw < bw) {
        // SHORT: the rest of the written length, hollow (a 1 px outline in the note's colour).
        g.fillStyle = ink;
        g.fillRect(x1 + fw, y - 1, bw - fw + 1, 1);
        g.fillRect(x1 + fw, y + bh - 1, bw - fw + 1, 1);
        g.fillRect(x1 + bw, y - 1, 1, bh + 1);
      }
      if (sp && bh >= 6) {
        g.fillStyle = voiceInk;
        g.fillRect(x1, y + bh - 2, fw, 1);
      }
      if (bh > 3) {
        g.fillStyle = "rgba(255,255,255,0.28)";
        g.fillRect(x1, y, fw, 1);
      }
      if (!fr.spans && fr.subject?.has(`${pv}:${n.on}`)) dots(g, x1, x1 + bw, y, edge);
      // D332: the sign (♯ ♭ ♮), dark on the block's start, where the block holds it.
      if (alt && bh - 1 >= 4 && fw >= 6 && !mk?.accent) {
        g.fillStyle = "rgba(0,0,0,0.6)";
        const gx = x1 + (fw >= 9 ? 3 : 1);
        const gy = y + Math.floor((bh - 1 - 4) / 2);
        SIGN_PIXELS[signOf(n.step, n.midi)].forEach((row, ry) => [...row].forEach((on, rx) => on === "1" && g.fillRect(gx + rx, gy + ry, 1, 1)));
      }
      if (n.state === "hit") {
        g.fillStyle = shine;
        g.fillRect(x1, y, Math.max(1, Math.min(fw, 2)), bh - 1);
        if (n.long && n.off !== undefined) {
          const xo = xOf(n.off);
          g.fillStyle = miss;
          g.fillRect(xo, y, Math.max(0, x1 + fw - xo), bh - 1);
        }
        const t = sinceMs(n.at);
        if (t < 240) {
          g.fillStyle = shine;
          g.globalAlpha = 1 - t / 240;
          g.fillRect(x1 - 1, y - 1, fw + 2, bh + 1);
          g.globalAlpha = 1;
        }
      }
      // DETACHED: the block's end a bright wall (lift before the next).
      if (mk && mk.join === false && !mk.short && bw >= 4) {
        g.fillStyle = edge;
        g.fillRect(x1 + bw - 1, y, 1, bh - 1);
      }
      // ACCENT: a bright strike edge at the start, a wedge pointing in.
      if (mk?.accent && fw >= 4) {
        g.fillStyle = ACCENT_EDGE;
        g.fillRect(x1, y, 1, bh - 1);
        for (let k = 0; k < 3; k++) {
          const hh = bh - 1 - 2 * (k + 1);
          if (hh <= 0 || k + 2 >= fw) break;
          g.fillRect(x1 + 1 + k, y + k + 1, 1, hh);
        }
      }
    }
  }
  // LADDER on a computer: each coming note's key, a small pixel arrow over it (a dot: the same note).
  if (fr.arrows)
    fr.notes.forEach((n, i) => {
      const a = fr.arrows![i];
      const x = xOf(n.on);
      if (!a || n.ride || n.state !== "pending" || x < playX || x > w || (i > 0 && fr.notes[i - 1].on === n.on)) return;
      g.fillStyle = edge;
      ARROW_PIXELS[a].forEach((row, ry) => [...row].forEach((on, rx) => on === "1" && g.fillRect(x + rx, yOf(n.step) - 7 + ry, 1, 1)));
    });

  // The touches: where each landed (the step it asked for), light when right, red when wrong.
  for (const mk of fr.marks ?? []) {
    const x = xOf(mk.tick);
    if (x < 0 || x > playX + 2) continue;
    const y = yOf(mk.step) + Math.floor(bh / 2);
    g.fillStyle = mk.ok ? shine : tok("--tg-wrong");
    g.fillRect(x - 1, y - 1, 3, 3);
  }

  // The entries coming: a diamond over each entry's first note (where they are not drawn whole).
  for (const e of fr.spans ? [] : (fr.entries ?? [])) {
    const x = xOf(e.on);
    if (x < (fr.entryState?.has(`${e.voice}:${e.on}`) ? 0 : playX - 2) || x > w) continue;
    const y = yOf(e.step) - 6;
    const st = fr.entryState?.get(`${e.voice}:${e.on}`);
    g.fillStyle = st === "captured" ? tok("--tg-gold") : st === "lost" ? tok("--tg-miss") : e.voice === fr.voice && !fr.entryState ? tok("--tg-gold") : inkOf(e.voice, fr.count);
    g.fillRect(x + 1, y, 1, 1);
    g.fillRect(x, y + 1, 3, 1);
    g.fillRect(x - 1, y + 2, 5, 1);
    g.fillRect(x, y + 3, 3, 1);
    g.fillRect(x + 1, y + 4, 1, 1);
  }

  // The player's own line: what they sounded, against the music.
  if (fr.trace?.length) {
    const ys = (step: number) => top + (fr.hi + 1 - step) * rowH + rowH / 2;
    g.fillStyle = tok("--tg-fg");
    let prev: { x: number; y: number } | null = null;
    for (const p of fr.trace) {
      const x = xOf(p.tick);
      if (x < 0 || x > playX) {
        prev = null;
        continue;
      }
      const y = Math.round(ys(p.step));
      if (p.on && prev) {
        const x0 = Math.min(prev.x, x);
        g.fillRect(x0, Math.min(prev.y, y), Math.max(1, Math.abs(x - prev.x)), Math.max(2, Math.abs(y - prev.y) + 1));
      }
      prev = p.on ? { x, y } : null;
    }
  }

  // D279: YOU over the player's next note (the voice played, whatever its colour), so which line is
  // yours is never a guess.
  {
    let n: LaneNote | undefined;
    for (let i = firstSounding(fr.notes, fr.now); i < fr.notes.length && !n; i++) if (fr.notes[i].on + fr.notes[i].dur >= fr.now && !fr.notes[i].ride) n = fr.notes[i];
    if (n) {
      const x = Math.max(playX + 2, xOf(n.on));
      // D347: where the words stand under the notes, YOU over the voice's next entry only (after a rest),
      // not over a note the words already mark.
      if (!syls) {
        if (x < w - 12) pixText(g, tr("YOU"), x, Math.min(h - 6, yOf(n.step) + bh + 2), edge);
      } else if (x < w - 12 && xOf(n.on) > playX + 24) pixText(g, tr("YOU"), x, Math.max(0, yOf(n.step) - 8), edge);
    }
  }
  g.fillStyle = tok("--tg-playhead");
  g.fillRect(playX, 0, 1, h);
  // D205: the ornaments' signs, small, over their notes (gold over the player's, the ink over the others').
  if (fr.ornaments) {
    for (let oi = firstSounding(fr.others, t0, span); oi < fr.others.length; oi++) {
      const o = fr.others[oi];
      const x = xOf(o.on);
      if (x >= w) break;
      const mk = x > -8 ? fr.ornaments.get(`${o.voice}:${o.on}`) : undefined;
      if (mk) pixText(g, mk, x, yOf(o.step) - 6, inkOf(o.voice, fr.count));
    }
    const sounding = new Set((fr.performed ?? []).filter((p) => !p.band && p.parts[0]?.[0] <= fr.now).map((p) => p.on));
    // D314: the player's, to be shaken as THE ORNAMENT lesson teaches: twice the size, on a dark backing, a
    // tick under it to its note (its word over the bars, paint-proto.ts); gone grey once its note is missed.
    for (const [pv, pnotes] of played)
      for (let ni = firstSounding(pnotes, t0, span); ni < pnotes.length; ni++) {
        const n = pnotes[ni];
        const x = xOf(n.on);
        if (x > w) break;
        const mk = x < -16 ? undefined : fr.ornaments.get(`${pv}:${n.on}`);
        if (!mk) continue;
        // D362: once its ornament sounds, the sign steps up out of the overlay's way, small and dimmed.
        if (sounding.has(n.on)) {
          g.globalAlpha = 0.6;
          pixText(g, mk, x, Math.max(0, yOf(n.step) - 14), fx.gold);
          g.globalAlpha = 1;
          continue;
        }
        const sw = textWidth(mk, 2);
        const y = Math.max(0, yOf(n.step) - 14);
        g.globalAlpha = 0.65;
        g.fillStyle = "#0c0a10";
        g.fillRect(x - 2, y - 2, sw + 2, 14);
        g.globalAlpha = 1;
        const ink = n.state === "miss" ? miss : fx.gold;
        pixText(g, mk, x, y, ink, 2);
        g.fillStyle = ink;
        g.fillRect(x, y + 11, 1, Math.max(1, yOf(n.step) - y - 11));
      }
  }
  // D353/D362: the ornaments performed, over the written blocks (the plain melody under) and above the signs.
  if (fr.performed?.length) paintOverlay(g, fr, { xOf, yOf, hOf, bh, w, lift: (step, midi) => altOf(step, midi) * shift, gold: fx.gold });
  // D370, D372: a reading's slur, one arc over its group (fused below it); everything else the reading
  // marks is drawn inside the blocks (above).
  if (fr.readingMarks?.size)
    for (const [pv, pnotes] of played) {
      const mks = marksIndex(pnotes, pv, fr.readingMarks);
      for (let j = firstSounding(pnotes, t0, span); j < pnotes.length; j++) {
        const n = pnotes[j];
        const x = xOf(n.on);
        if (x > w) break;
        if (x < -40 || mks[j]?.slur !== "first") continue;
        let last = j;
        for (let q = j + 1; q < pnotes.length; q++) {
          const m = mks[q];
          if (!m?.slur || m.slur === "first") break;
          last = q;
          if (m.slur === "last") break;
        }
        if (last === j) continue;
        const x2 = xOf(pnotes[last].on) + 2;
        let top = yOf(n.step);
        for (let q = j; q <= last; q++) top = Math.min(top, yOf(pnotes[q].step));
        const lift = Math.max(2, Math.min(6, (x2 - x) / 6));
        g.fillStyle = fx.gold;
        for (let px = Math.round(x); px <= x2; px++) {
          const u = (px - x) / Math.max(1, x2 - x);
          g.fillRect(px, Math.round(top - 3 - lift * 4 * u * (1 - u)), 1, 1);
        }
      }
    }
  // D372: the subject's effect over the player's own subject notes, then each entry's flag.
  if (spans) {
    subjectFx(fx, spans, playedVoices, true, fr.piece, fr.beatTicks, fxClock);
    flags(fx, spans, (x0, x1, y0, y1, voice, on) => {
      for (let oi = firstSounding(fr.others, t0, span); oi < fr.others.length; oi++) {
        const o = fr.others[oi];
        const a = xOf(o.on);
        if (a > x1) break;
        if (xOf(o.on + o.dur) < x0 || (o.voice === voice && o.on === on)) continue;
        const oy = yOf(o.step);
        if (oy + hOf(o.step) > y0 && oy < y1) return true;
      }
      for (const [pv, pnotes] of played)
        for (let ni = firstSounding(pnotes, t0, span); ni < pnotes.length; ni++) {
          const n = pnotes[ni];
          const a = xOf(n.on);
          if (a > x1) break;
          if (xOf(n.on + n.dur) < x0 || (pv === voice && n.on === on)) continue;
          const ny = yOf(n.step);
          if (ny + bh > y0 && ny < y1) return true;
        }
      return false;
    });
  }
  // D314: what the reading's marks ask, at the start of a round where they appear; the ornament's hint.
  if (fr.readingMarks?.size && fr.legendUntil !== undefined && fr.now < fr.legendUntil) marksLegend(g, w, h, fr, edge, Math.min(1, (fr.legendUntil - fr.now) / (2 * fr.tps)));
  if (fr.banner) banner(g, w, fr.banner, fx.gold);
  if (fr.cadences) cadenceMarks(fx, fr.cadences);
  if (fr.spans && fr.bossFight) bossBar(fx, fr.spans.filter((s) => s.form !== "counter"), fr.voice, fr.notes);
  sparks(fx, fr.pops ?? [], fr.bursts ?? []);
  zoneGlow(fx, fr.zone ?? null);
}

/**
 * D347: the sung words (BWV 228, BWV 54; lyrics.ts), very discreet: small and faint, under the player's
 * voice only, each syllable at its first note's start, just under that block (lower where the word
 * passes under a lower block, so a block is never covered; a line lower where it would touch the word
 * before); a hyphen between a word's syllables (just before the next syllable after a melisma); a
 * melisma a faint line from the word on, then just under each of its notes, to its last note
 * (Teu- … -fel). The pixel font at the box's scale, twice as large where the rows are large; each
 * word drawn once into a small canvas kept for it; only the syllables in view are looked at.
 */
interface LyricGeo {
  xOf: (tick: number) => number;
  yOf: (step: number) => number;
  /** D332: how far a note is drawn off its row (raised, lowered). */
  lift: (n: LaneNote) => number;
  bh: number;
  w: number;
  h: number;
  t0: number;
  t1: number;
  ink: string;
}
const LYRIC_ALPHA = 0.55;
const EXTENDER_ALPHA = 0.45;
const sprites = new Map<string, HTMLCanvasElement | null>();
function lyricSprite(text: string, ink: string, s: number): HTMLCanvasElement | null {
  const key = `${s}|${ink}|${text}`;
  const had = sprites.get(key);
  if (had !== undefined) return had;
  if (sprites.size > 600) sprites.clear();
  let c: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    c = document.createElement("canvas");
    c.width = Math.max(1, textWidth(text, s) - s);
    // Two rows over the letters for the umlauts, one under for a cedilla.
    c.height = 8 * s;
    const cg = c.getContext("2d");
    if (cg) pixRaw(cg, text, 0, 2 * s, ink, s);
    else c = null;
  }
  sprites.set(key, c);
  return c;
}
function paintLyrics(g: CanvasRenderingContext2D, syls: readonly Syllable[], fr: Frame, k: LyricGeo) {
  const s = k.bh >= 16 ? 2 : 1;
  const notes = fr.notes;
  const mine = (n: LaneNote) => n.voice === undefined || n.voice === fr.voice;
  /** The first note at or after a tick. */
  const at = (tick: number) => {
    let lo = 0;
    let hi = notes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (notes[mid].on < tick) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  /** Where a word's letters begin under a block: past its shadow, room left for the umlauts. */
  const under = (n: LaneNote) => k.yOf(n.step) - k.lift(n) + k.bh + 1 + 2 * s;
  const from = firstFrom(syls, k.t0);
  const placed: ({ x: number; end: number; y: number; j: number; melisma: boolean } | null)[] = [];
  g.globalAlpha = LYRIC_ALPHA;
  for (let i = from; i < syls.length; i++) {
    const sy = syls[i];
    let j = at(sy.on);
    while (j < notes.length && notes[j].on === sy.on && !mine(notes[j])) j++;
    const n = notes[j];
    // Its note not in this run (a practice of other bars): nothing.
    if (!n || n.on !== sy.on) {
      placed.push(null);
      if (sy.on >= k.t1) break;
      continue;
    }
    const x = k.xOf(sy.on);
    const sp = lyricSprite(sy.shown, k.ink, s);
    const tw = sp ? sp.width : textWidth(sy.shown, s) - s;
    let y = under(n);
    // Below every block of the player's the word passes under (its melisma's, the next syllables').
    for (let m = j + 1; m < notes.length && k.xOf(notes[m].on) <= x + tw + s; m++) if (mine(notes[m])) y = Math.max(y, under(notes[m]));
    let melisma = false;
    for (let m = j + 1; m < notes.length && notes[m].on < sy.end && !melisma; m++) melisma = mine(notes[m]);
    // Words close together: a line lower where the words before would be touched (at most two lines down).
    const recent = placed.slice(-4).filter((p) => p !== null);
    for (let r = 0; r < 3; r++) {
      const cand = y + r * 7 * s;
      if (!recent.some((p) => x < p.end + 2 * s && Math.abs(cand - p.y) < 7 * s)) {
        y = cand;
        break;
      }
    }
    y = Math.min(y, k.h - 6 * s);
    placed.push({ x, end: x + tw, y, j, melisma });
    if (x < k.w && x + tw > 0) {
      if (sp) g.drawImage(sp, x, y - 2 * s);
      else pixRaw(g, sy.shown, x, y, k.ink, s);
    }
    if (sy.on >= k.t1) break;
  }
  g.fillStyle = k.ink;
  placed.forEach((p, q) => {
    if (!p) return;
    const sy = syls[from + q];
    if (p.melisma) {
      // The melisma's line: under the first note from the word's end, then under each note to the last.
      g.globalAlpha = EXTENDER_ALPHA;
      const n0 = notes[p.j];
      const e0 = k.xOf(n0.on + n0.dur) - 1;
      if (e0 > p.end + s && p.end + s < k.w) g.fillRect(p.end + s, p.y + 4 * s, e0 - p.end - s, s);
      for (let m = p.j + 1; m < notes.length && notes[m].on < sy.end; m++) {
        const nm = notes[m];
        if (!mine(nm)) continue;
        const x1 = k.xOf(nm.on);
        if (x1 > k.w) break;
        const x2 = k.xOf(nm.on + nm.dur) - 1;
        if (x2 < 0) continue;
        g.fillRect(x1, under(nm) - 2 * s + 1, Math.max(1, x2 - x1), s);
      }
    }
    // The hyphen to the word's next syllable: midway, or just before it after a melisma.
    const nx = placed[q + 1];
    if (sy.joined && nx) {
      const left = p.end + s;
      const right = nx.x - s;
      if (right - left < 3 * s || left > k.w || right < 0) return;
      g.globalAlpha = LYRIC_ALPHA;
      const hx = p.melisma ? right - 3 * s : Math.round((left + right - 3 * s) / 2);
      g.fillRect(hx, (p.melisma ? nx.y : p.y) + 2 * s, 3 * s, s);
    }
  });
  g.globalAlpha = 1;
}

/**
 * D314: the reading's marks explained, small, at the box's foot (only the marks this round has): the
 * sign as the box draws it, then what it asks of the thumbs (readings.ts markLegend; the strong side
 * by touch-expr.ts STRONG_SIDE). Fades over its last two seconds.
 */
function marksLegend(g: CanvasRenderingContext2D, w: number, h: number, fr: Frame, edge: string, alpha: number) {
  const marks = [...fr.readingMarks!.values()];
  const has = marksHas(marks);
  const lines = markLegend(STRONG_SIDE).filter((l) => has[l.kind]);
  if (!lines.length) return;
  const lw = Math.min(w - 8, 10 + Math.max(...lines.map((l) => textWidth(l.text))));
  const lh = 8;
  const y0 = h - 6 - lines.length * lh - 4;
  g.globalAlpha = 0.62 * alpha;
  g.fillStyle = "#0c0a10";
  g.fillRect(3, y0, lw + 4, lines.length * lh + 5);
  g.globalAlpha = alpha;
  lines.forEach((l, k) => {
    const y = y0 + 3 + k * lh;
    // D372: the sign as the box now draws it, inside a small block of the player's colour.
    legendIcon(g, l.kind, 4, y, inkOf(fr.voice, fr.count), edge);
    pixText(g, l.text, 15, y, edge);
  });
  g.globalAlpha = 1;
}
/**
 * D372: a mark's sign in the legend, 10 by 5 px from (x, y): SHORT a block half filled, half hollow;
 * DETACHED a block with its bright end wall; JOINED two blocks fused with a seam (a step down); SLUR the
 * same under an arc; ACCENT a block with its strike edge and wedge.
 */
function legendIcon(g: CanvasRenderingContext2D, kind: string, x: number, y: number, ink: string, edge: string) {
  const block = (bx: number, by: number, bw: number) => {
    g.fillStyle = edge;
    g.fillRect(bx - 1, by - 1, bw + 2, 4);
    g.fillStyle = ink;
    g.fillRect(bx, by, bw, 2);
  };
  if (kind === "short") {
    block(x + 1, y + 2, 4);
    g.fillStyle = ink;
    g.fillRect(x + 5, y + 1, 5, 1);
    g.fillRect(x + 5, y + 4, 5, 1);
    g.fillRect(x + 9, y + 1, 1, 4);
  } else if (kind === "apart") {
    block(x + 1, y + 2, 8);
    g.fillStyle = edge;
    g.fillRect(x + 8, y + 2, 1, 2);
  } else if (kind === "joined" || kind === "slur") {
    const dy = kind === "slur" ? 1 : 0;
    g.fillStyle = edge;
    g.fillRect(x, y + 1 + dy, 6, 4);
    g.fillRect(x + 4, y + 2 + dy, 6, 3);
    g.fillStyle = ink;
    g.fillRect(x + 1, y + 2 + dy, 4, 2);
    g.fillRect(x + 5, y + 3 + dy, 4, 1);
    g.fillRect(x + 5, y + 2 + dy, 1, 2);
    g.fillStyle = "rgba(0,0,0,0.42)";
    g.fillRect(x + 4, y + 2 + dy, 1, 2);
    if (dy) {
      g.fillStyle = GOLD_SLUR;
      g.fillRect(x, y + 1, 1, 1);
      g.fillRect(x + 1, y, 8, 1);
      g.fillRect(x + 9, y + 1, 1, 1);
    }
  } else {
    block(x + 1, y + 2, 8);
    g.fillStyle = ACCENT_EDGE;
    g.fillRect(x + 1, y + 2, 1, 2);
    g.fillRect(x + 2, y + 2, 1, 2);
  }
}
/** D314: a line over the box's top, on a dark band (the ornament's first-time hint). */
function banner(g: CanvasRenderingContext2D, w: number, text: string, ink: string) {
  const tw = textWidth(text);
  const x = Math.max(2, Math.round((w - tw) / 2));
  const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);
  g.globalAlpha = 0.82;
  g.fillStyle = "#0c0a10";
  g.fillRect(x - 4, 3, tw + 7, 11);
  g.globalAlpha = pulse;
  pixText(g, text, x, 6, ink);
  g.globalAlpha = 1;
}
const GOLD_SLUR = "#ffd23f";
/** D372: the voices played (the effects' passes), kept. */
const PLAYED_VOICES = [0, 0];
type MarkNote = { join: boolean | null; short: boolean | null; accent: boolean | null; slur?: "first" | "mid" | "last" };

/** D372: the accent's strike edge and wedge. */
const ACCENT_EDGE = "#fff8dc";
/** D372: one player's note's block as the painter lays it out (kept, so the frame allocates nothing). */
const G = { x1: 0, y: 0, bw: 0, fw: 0, fuse: -1, ny: 0, mk: undefined as MarkNote | undefined };
/** D372: the bridge where a joined note's block meets the next on another row (`grow` px larger round it). */
function bridge(g: CanvasRenderingContext2D, b: typeof G, bh: number, grow: number) {
  if (b.ny === b.y) return;
  const a = Math.min(b.y, b.ny);
  const z = Math.max(b.y, b.ny) + bh - 1;
  g.fillRect(b.x1 + b.bw - 2 - grow, a + 1 - grow, 4 + 2 * grow, Math.max(1, z - a - 2 + 2 * grow));
}
const marksMemo = new WeakMap<readonly LaneNote[], { map: ReadonlyMap<string, MarkNote>; pv: number; n: number; idx: (MarkNote | undefined)[] }>();
/** D372: each of a played list's notes' reading mark (by index), made once per list and marks (D345: no strings built a frame). */
export function marksIndex(list: readonly LaneNote[], pv: number, map: ReadonlyMap<string, MarkNote>): (MarkNote | undefined)[] {
  const had = marksMemo.get(list);
  if (had && had.map === map && had.pv === pv && had.n === list.length) return had.idx;
  const idx = list.map((n) => map.get(`${pv}:${n.on}`));
  marksMemo.set(list, { map, pv, n: list.length, idx });
  return idx;
}

/** The subject's texture: dots along a block's top. */
function dots(g: CanvasRenderingContext2D, x1: number, x2: number, y: number, ink: string) {
  const a = g.globalAlpha;
  g.globalAlpha = 0.85;
  g.fillStyle = ink;
  for (let x = x1 + 1; x < x2 - 1; x += 2) g.fillRect(x, y, 1, 1);
  g.globalAlpha = a;
}
