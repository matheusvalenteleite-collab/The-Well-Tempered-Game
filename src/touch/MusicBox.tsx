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
import { bossBar, cadenceMarks, entryMarks, flags, pixRaw, pixText, sparks, subjectFx, textWidth, zoneGlow, type Burst, type FlagVariant, type Pop, type Span } from "./box-fx.ts";
import { firstFrom, lyricsOf, type Syllable } from "./lyrics.ts";
import { markLegend, marksHas } from "./readings.ts";
import { arpeggioSign, noteSigns, paintWholeArcs, paintWholeGuides, type WholeGeo } from "./box-whole.ts";
import { wholeLegend, type BoxMark, type WholeBox } from "./whole-marks.ts";
import { STRONG_SIDE } from "./touch-expr.ts";
import { paintVariant } from "./box-variants.ts";
import { paintUi, uiActive } from "./ui/index.ts";
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import type { LaneNote } from "./lanes.ts";
import { fugueById } from "./fugue.ts";
import { SIGN_PIXELS, alterAgainst, chromaShift, signOf, signatureOf } from "./chroma.ts";
import type { OtherNote } from "./voice-mode.ts";
import { firstSounding } from "./visible.ts";
import { ladderHeight, ladderRows, touchRows, type StepRange } from "./box-zoom.ts";
import { membership, raiseOf } from "./subject-hue.ts";

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

/** The ladder's touch rows (CSS px); D377: `floor` and the zoom's ease as the box draws them (box-zoom.ts touchRows). */
export function ladderGeometry(lo: number, hi: number, cssH: number, floor = 0, from?: StepRange, mix = 1): { yOf: (step: number) => number; rowH: number } {
  return touchRows(lo, hi, cssH, floor, from, mix);
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
  /** D375: how many bars the box shows (a lesson's passage; else BARS_SHOWN). */
  bars?: number;
  /** D375: the share of the box's height kept free at its foot (the tutorial's words sit there). */
  floor?: number;
  /** D377: while the box's range eases (box-zoom.ts): the range it comes from, and how far (0..1) toward lo..hi. */
  zoomFrom?: StepRange;
  zoomMix?: number;
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
  readingMarks?: Map<string, MarkNote>;
  /**
   * D391: a whole-piece reading (BUSONI) drawn over the player's line, the whole piece (whole-marks.ts
   * wholeBox): its arcs, levels, hairpins, words and caesuras; `readingMarks` then holds every marked note.
   */
  whole?: WholeBox;
  /** D194: the cadences, named. */
  cadences?: { on: number; text: string }[];
  /** Each voice's range of steps (the design study's staves, box-variants.ts). */
  ranges?: { lo: number; hi: number }[];
  /** The piece's id (the interface templates, ui/index.ts, `?ui=NAME`). */
  piece?: string;
  /**
   * Design studio (D415, the owner: "we ought to be able to see the music flowing behind the buttons"): the
   * CSS px of the box's canvas that lie under the side bars, left and right (the roll runs the whole width,
   * the bars translucent over it). The time scale and the playhead stay those of the part between the bars;
   * under the left bar the music just gone, under the right the music coming. Set by MusicBox each frame.
   */
  clear?: { l: number; r: number };
}

/**
 * D415: the music box's roll between the side bars (where the time scale is set and the play line stands),
 * in client px; the whole roll elsewhere. The roll itself runs under the bars in THUMBS ↔ (bench.css).
 */
export function rollRect(): { left: number; right: number; top: number; bottom: number; width: number; height: number } | null {
  const roll = typeof document !== "undefined" ? document.querySelector(".tg-roll") : null;
  if (!roll) return null;
  const r = roll.getBoundingClientRect();
  const b = roll.parentElement?.getBoundingClientRect();
  const left = b ? Math.max(r.left, b.left) : r.left;
  const right = b ? Math.min(r.right, b.right) : r.right;
  return { left, right, top: r.top, bottom: r.bottom, width: Math.max(1, right - left), height: r.height };
}

export function MusicBox({ frame, hud, legend, children }: { frame: MutableRefObject<Frame>; hud: ReactNode; legend: ReactNode; children?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = wrap.current;
      if (el && canvas.current) {
        // D415: the classic box runs under the translucent bars (the class lets bench.css widen the roll);
        // a picture drawn in its place (the sheet, an interface template) keeps the space between them.
        const box = el.parentElement;
        const wide = !boxPainter && !uiActive();
        if (box && box.classList.contains("tg-box-wide") !== wide) box.classList.toggle("tg-box-wide", wide);
        const r = el.getBoundingClientRect();
        const b = box?.getBoundingClientRect();
        frame.current.clear = wide && b ? { l: Math.max(0, b.left - r.left), r: Math.max(0, r.right - b.right) } : undefined;
        paint(canvas.current, el.clientWidth, el.clientHeight, frame.current);
      }
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

  // D415: the bars' share of the canvas (clear): the time scale is the part between them, the rest more of the
  // same scale (the past under the left bar, the future under the right); span and t0 cover the whole canvas.
  const vis = (fr.bars ?? BARS_SHOWN) * fr.barTicks;
  const cl = fr.clear ? fr.clear.l / PX : 0;
  const cr = fr.clear ? fr.clear.r / PX : 0;
  const wi = Math.max(1, w - cl - cr);
  const span = (vis * w) / wi;
  const t0 = fr.now - PLAYHEAD * vis - (cl / wi) * vis;
  const xOf = (tick: number) => Math.round(((tick - t0) / span) * w);
  const playX = xOf(fr.now);
  // The ladder: one row per staff step over the piece's range, a step of room either side.
  // D375: the ladder keeps clear of the box's foot where something sits over it (Herr Bach's words).
  // D377: while the range eases, the rows blended (box-zoom.ts ladderRows: the touch rows the same).
  const easing = !!fr.zoomFrom && (fr.zoomMix ?? 1) < 1;
  const L = ladderRows(ladderHeight(cssH, fr.floor ?? 0), fr.lo, fr.hi, easing ? fr.zoomFrom : undefined, fr.zoomMix ?? 1);
  const rowH = L.rowH;
  const lin = (step: number) => Math.round(L.a - step * rowH);
  const bh = Math.max(2, Math.round(rowH));
  // The ladder's steps (while easing, both ranges': the notes leaving slide off rather than jump into the margins).
  const ladHi = easing ? Math.max(fr.hi, fr.zoomFrom!.hi) : fr.hi;
  const ladLo = easing ? Math.min(fr.lo, fr.zoomFrom!.lo) : fr.lo;
  // D211: beyond the ladder, the margins: every step above it squeezed into the space over the top
  // row, every step below into the space under the bottom one.
  const sp = fr.spill;
  const upTo = sp ? Math.max(ladHi, sp.hi) : ladHi;
  const downTo = sp ? Math.min(ladLo, sp.lo) : ladLo;
  const capH = Math.max(0, lin(ladHi));
  const footY = Math.min(h, Math.round(lin(ladLo) + rowH));
  const footH = h - footY;
  const upTh = Math.max(1, Math.floor(capH / Math.max(1, upTo - ladHi + 1)));
  const downTh = Math.max(1, Math.floor(footH / Math.max(1, ladLo - downTo + 1)));
  const yOf = (step: number) =>
    !sp || (step <= ladHi && step >= ladLo)
      ? lin(step)
      : step > ladHi
        ? Math.max(0, Math.round(capH - ((step - ladHi) / (upTo - ladHi + 1)) * capH) - upTh)
        : Math.min(h - downTh, Math.round(footY + ((ladLo - step) / (ladLo - downTo + 1)) * footH));
  const hOf = (step: number) => (!sp || (step <= ladHi && step >= ladLo) ? bh : step > ladHi ? upTh : downTh);
  if (sp && (upTo > ladHi || downTo < ladLo)) {
    // The margins a shade darker, a hairline where the ladder begins and ends.
    g.fillStyle = "rgba(0,0,0,0.22)";
    if (upTo > ladHi) g.fillRect(0, 0, w, capH);
    if (downTo < ladLo) g.fillRect(0, footY, w, footH);
    g.fillStyle = "rgba(255,255,255,0.08)";
    if (upTo > ladHi) g.fillRect(0, capH, w, 1);
    if (downTo < ladLo) g.fillRect(0, footY - 1, w, 1);
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

  const fx = { g, w, h, left: Math.round(cl), xOf, yOf, hOf, bh, now: fr.now, tps: fr.tps, gold: tok("--tg-gold"), miss: tok("--tg-miss"), fg: tok("--tg-fg"), ink: (v: number) => inkOf(v, fr.count) };
  // D372: the effects' clock (s), and the voices played (the effects' passes).
  const fxClock = performance.now() / 1000;
  PLAYED_VOICES[0] = fr.voice;
  PLAYED_VOICES[1] = fr.notes2 && fr.voice2 !== undefined ? fr.voice2 : fr.voice;
  const playedVoices = PLAYED_VOICES;

  // The other voices: their colours, dimmer.
  // D269: never mistaken for the player's: thinner (half a row, centred), flat (no shadow, no white
  // outline); a note glows while it sounds (brighter, a faint halo in its colour), never in the player's
  // hit colour.
  // D352's raise kept: while its entry sounds a voice's subject notes are taller and fuller (faded in
  // and out over 150 ms), never a full row nor the player's outline. The design studio (the owner: the
  // subject hue "makes the colour coding inscrutable"): no subject tint, rim, keel or halo: every note
  // in its voice's own ink.
  const spans = fr.spans;
  const otherIdx = spans ? membership(fr.others, spans) : null;
  // The design studio: where the notes are (the entry marks keep off them). blockedAt: whether a rectangle
  // holds a note of another voice than `voice` (any voice for -1); noteTop: the highest note's top over
  // some columns (h where none; over the player's, room kept for the reading's marks).
  const playedLists = PLAYED_LISTS;
  playedLists[0] = fr.notes;
  playedLists[1] = fr.notes2 && fr.voice2 !== undefined ? fr.notes2 : null;
  const blockedAt = (x0: number, x1: number, y0: number, y1: number, voice: number) => {
    for (let oi = firstSounding(fr.others, t0, span); oi < fr.others.length; oi++) {
      const o = fr.others[oi];
      if (xOf(o.on) > x1) break;
      if (xOf(o.on + o.dur) < x0 || o.voice === voice) continue;
      const oy = yOf(o.step) - altOf(o.step, o.midi) * shift;
      if (oy + hOf(o.step) > y0 && oy < y1) return true;
    }
    for (let k = 0; k < 2; k++) {
      const pnotes = playedLists[k];
      const pv = k === 0 ? fr.voice : fr.voice2;
      if (!pnotes || pv === voice) continue;
      for (let ni = firstSounding(pnotes, t0, span); ni < pnotes.length; ni++) {
        const n = pnotes[ni];
        if (xOf(n.on) > x1) break;
        if (xOf(n.on + n.dur) < x0) continue;
        const ny = yOf(n.step) - altOf(n.step, n.midi) * shift - 1;
        if (ny + bh + 1 > y0 && ny < y1) return true;
      }
    }
    return false;
  };
  const noteTop = (x0: number, x1: number) => {
    let top = h;
    for (let oi = firstSounding(fr.others, t0, span); oi < fr.others.length; oi++) {
      const o = fr.others[oi];
      if (xOf(o.on) > x1) break;
      if (xOf(o.on + o.dur) >= x0) top = Math.min(top, yOf(o.step) - altOf(o.step, o.midi) * shift);
    }
    for (let k = 0; k < 2; k++) {
      const pnotes = playedLists[k];
      if (!pnotes) continue;
      for (let ni = firstSounding(pnotes, t0, span); ni < pnotes.length; ni++) {
        const n = pnotes[ni];
        if (xOf(n.on) > x1) break;
        // The player's notes: their outline, and the reading's marks and arcs over them (up to 8 px).
        if (xOf(n.on + n.dur) >= x0) top = Math.min(top, yOf(n.step) - altOf(n.step, n.midi) * shift - 9);
      }
    }
    return top;
  };
  // The entry marks' leaders, brackets and rails, under every note.
  if (spans && FLAG_VARIANT !== "o") entryMarks(fx, spans, FLAG_VARIANT, "under", noteTop, blockedAt);
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
    const r = si >= 0 ? raiseOf(spans![si], fr.now, fr.tps) : 0;
    const th = full ? Math.max(1, Math.round(bh * (0.5 + 0.22 * r))) : oh;
    const y = oy + (full ? Math.floor((bh - 1 - th) / 2) : 0);
    if (sounding && full) {
      g.globalAlpha = 0.22;
      g.fillStyle = voiceInk;
      g.fillRect(x1 - 1, oy - 1, bw + 2, bh + 1);
    }
    g.globalAlpha = sounding ? 1 : (full ? 0.45 : 0.7) + 0.4 * r;
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
  // D374 (the owner: the box shows Bach's music): every note not yet played a plain block (D332's gap
  // after it); the reading's marks hang over the blocks as before D372 (below). A note the player has
  // played and let go takes the shape of how it was played: joined to the next (the next taken before
  // this one was let go, or slid onto) the blocks touch; let go before its end, filled to the lift and
  // the rest of its written length an outline; else the gap. Never a colour of right or wrong but the
  // long note's early lift D198 already showed.
  for (const [pv, pnotes] of played) {
    const inkPv = inkOf(pv, fr.count);
    const sinceMs = (at: number | undefined) => (at === undefined ? Infinity : ((fr.now - at) / fr.tps) * 1000);
    for (let ni = firstSounding(pnotes, t0, span); ni < pnotes.length; ni++) {
      const n = pnotes[ni];
      // D214: SUBJECT's line passes between voices, each note in its own colour.
      const voiceInk = n.voice === undefined || n.voice === pv ? inkPv : inkOf(n.voice, fr.count);
      // The design studio: no subject hue (D368 gone): every note in its voice's own ink.
      const ink = voiceInk;
      let x1 = xOf(n.on);
      if (x1 > w) break;
      const x2 = xOf(n.on + n.dur);
      // D332: altered against the key, a fraction of a row off its row (raised up, lowered down).
      const alt = altOf(n.step, n.midi);
      const y = yOf(n.step) - alt * shift;
      // D332: every block its own, a gap of the roll between it and the next (the owner read E♭ E♭ D E♭
      // quavers as one long block): the fill stops 3 px before the next onset where the note is long enough.
      let bw = Math.max(1, x2 - x1 - (x2 - x1 >= 7 ? 3 : x2 - x1 >= 4 ? 2 : 1));
      let fw = bw;
      // D374: the played shape (only once the thumb has let go of it).
      if (n.state === "hit" && !n.ride && n.up !== undefined) {
        let q = ni + 1;
        while (q < pnotes.length && pnotes[q].on <= n.on) q++;
        const nx = pnotes[q];
        if (nx && nx.state === "hit" && !nx.ride && nx.at !== undefined && (nx.via === "slide" || nx.at <= n.up || nx.joinedIn) && nx.on <= n.on + n.dur) bw = fw = Math.max(1, xOf(nx.on) - x1);
        else if (n.up < n.on + n.dur) fw = Math.max(1, Math.min(bw, xOf(n.up) - x1));
      }
      if (x1 + bw < 0) continue;
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
      // D202: each block extruded a pixel down and right (a voxel), then outlined and filled.
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(x1 + 1, y + 1, fw + 1, bh);
      // D279: the player's notes always outlined white (the owner took the gold frame for "yours").
      g.fillStyle = edge;
      g.fillRect(x1 - 1, y - 1, fw + 2, bh + 1);
      g.fillStyle = ink;
      g.fillRect(x1, y, fw, bh - 1);
      if (fw < bw) {
        // D374: let go early: the rest of the written length an outline (the long note's in D198's colour).
        // D417 (the audit): never miss-grey on a note the reading asked short (let go early is right there).
        g.fillStyle = n.long && !fr.readingMarks?.get(`${pv}:${n.on}`)?.short ? miss : ink;
        g.fillRect(x1 + fw, y - 1, bw - fw + 1, 1);
        g.fillRect(x1 + fw, y + bh - 1, bw - fw + 1, 1);
        g.fillRect(x1 + bw, y - 1, 1, bh + 1);
      }
      if (bh > 3) {
        g.fillStyle = "rgba(255,255,255,0.28)";
        g.fillRect(x1, y, fw, 1);
      }
      if (!fr.spans && fr.subject?.has(`${pv}:${n.on}`)) dots(g, x1, x1 + bw, y, edge);
      // D332: the sign (♯ ♭ ♮), dark on the block's start, where the block holds it.
      if (alt && bh - 1 >= 4 && fw >= 6) {
        g.fillStyle = "rgba(0,0,0,0.6)";
        const gx = x1 + (fw >= 9 ? 3 : 1);
        const gy = y + Math.floor((bh - 1 - 4) / 2);
        SIGN_PIXELS[signOf(n.step, n.midi)].forEach((row, ry) => [...row].forEach((on, rx) => on === "1" && g.fillRect(gx + rx, gy + ry, 1, 1)));
      }
      if (n.state === "hit") {
        g.fillStyle = shine;
        g.fillRect(x1, y, Math.max(1, Math.min(fw, 2)), bh - 1);
        const t = sinceMs(n.at);
        if (t < 240) {
          g.fillStyle = shine;
          g.globalAlpha = 1 - t / 240;
          g.fillRect(x1 - 1, y - 1, fw + 2, bh + 1);
          g.globalAlpha = 1;
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
    const ys = (step: number) => L.a - step * rowH + rowH / 2;
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
  // yours is never a guess. The design studio: it breathes (youLabel), slowly, on the wall clock.
  {
    let n: LaneNote | undefined;
    for (let i = firstSounding(fr.notes, fr.now); i < fr.notes.length && !n; i++) if (fr.notes[i].on + fr.notes[i].dur >= fr.now && !fr.notes[i].ride) n = fr.notes[i];
    if (n) {
      const x = Math.max(playX + 2, xOf(n.on));
      // D347: where the words stand under the notes, YOU over the voice's next entry only (after a rest),
      // not over a note the words already mark.
      if (!syls) {
        if (x < w - 12) youLabel(g, x, Math.min(h - 6, yOf(n.step) + bh + 7), inkOf(fr.voice, fr.count), edge, fxClock);
      } else if (x < w - 12 && xOf(n.on) > playX + 24) youLabel(g, x, Math.max(0, yOf(n.step) - 8), inkOf(fr.voice, fr.count), edge, fxClock);
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
  // D384 (Mario 1): the strikes' points and bursts under the reading's marks, so a mark is never hidden by them.
  sparks(fx, fr.pops ?? [], fr.bursts ?? []);
  // D391: a whole-piece reading's arcs (slurs and their lifts, portato, phrases), levels, hairpins, words and
  // caesuras on the player's line, over the sparks as its other marks are (D384).
  if (fr.whole) {
    const wg = WHOLE_GEO;
    wg.g = g;
    wg.w = w;
    wg.h = h;
    wg.t0 = t0;
    wg.t1 = t0 + span;
    wg.xOf = xOf;
    wg.yOf = yOf;
    wg.bh = bh;
    wg.voices = playedVoices;
    wg.fg = edge;
    wg.gold = fx.gold;
    paintWholeArcs(wg, fr.whole);
    paintWholeGuides(wg, fr.whole);
  }
  // D272, D374 (D372's in-block designs reverted): the reading's marks over the player's notes, only where
  // a reading marks them: a gold line to the next where joined, a red stroke in the gap where detached, a
  // dot where short, an accent; D370: ⌒ only for a reading's real slur, one arc over the group.
  if (fr.readingMarks?.size)
    for (const [pv, pnotes] of played) {
      const mks = marksIndex(pnotes, pv, fr.readingMarks);
      for (let j = firstSounding(pnotes, t0, span); j < pnotes.length; j++) {
        const n = pnotes[j];
        const x = xOf(n.on);
        if (x > w) break;
        const mk = x < -40 ? undefined : mks[j];
        if (!mk) continue;
        const y = yOf(n.step);
        let nx: LaneNote | undefined;
        for (let q = j + 1; q < pnotes.length && !nx; q++) if (pnotes[q].on > n.on) nx = pnotes[q];
        // D391: a whole reading's arcs are drawn from its spans (paintWholeArcs), long phrases and all.
        if (mk.slur === "first" && !fr.whole) {
          let last = j;
          for (let q = j + 1; q < pnotes.length; q++) {
            const m = mks[q];
            if (!m?.slur || m.slur === "first") break;
            last = q;
            if (m.slur === "last") break;
          }
          if (last > j) {
            const x2 = xOf(pnotes[last].on) + 2;
            let top = y;
            for (let q = j; q <= last; q++) top = Math.min(top, yOf(pnotes[q].step));
            const lift = Math.max(2, Math.min(6, (x2 - x) / 6));
            g.fillStyle = fx.gold;
            for (let px = Math.round(x); px <= x2; px++) {
              const u = (px - x) / Math.max(1, x2 - x);
              g.fillRect(px, Math.round(top - 3 - lift * 4 * u * (1 - u)), 1, 1);
            }
          }
        }
        // JOINED (a plain legato join, D370): the flat gold line over the pair.
        if (mk.join && nx && mk.slur !== "first" && mk.slur !== "mid" && !(fr.whole && mk.slur)) {
          const x2 = xOf(nx.on);
          const top = Math.min(y, yOf(nx.step)) - 3;
          g.fillStyle = fx.gold;
          g.fillRect(x + 1, top, Math.max(1, x2 - x - 1), 1);
          g.fillRect(x, top + 1, 1, 1);
          g.fillRect(x2, top + 1, 1, 1);
        }
        if (mk.join === false && nx) {
          g.fillStyle = DETACH_RED;
          g.fillRect(Math.round((xOf(n.on + n.dur) + xOf(nx.on)) / 2) - 1, y - 2, 1, bh + 3);
        }
        const xm = Math.round((x + xOf(n.on + n.dur)) / 2);
        if (mk.short && !mk.wedge && !mk.marcato) {
          // D314: the staccato dot, 2 by 2, over the note's middle.
          g.fillStyle = edge;
          g.fillRect(xm - 1, y - 4, 2, 2);
        }
        if (mk.accent && !mk.marcato) pixText(g, ">", x, y - 6, ACCENT_ORANGE);
        // D391: BUSONI's own signs (wedge, ^, tenuto, portato, fermata, arpeggio), over the block.
        if (fr.whole) {
          noteSigns(g, mk, x, xm, y, edge, ACCENT_ORANGE);
          if (mk.arpeggio) arpeggioSign(g, x, y, bh, edge);
        }
      }
    }
  // D372: the subject's effect over the player's own subject notes, then each entry's mark (the design
  // studio: the tabs and words, only where no note is; FLAG_VARIANT).
  if (spans) {
    subjectFx(fx, spans, playedVoices, true, fr.piece, fr.beatTicks, fxClock);
    if (FLAG_VARIANT === "o") flags(fx, spans, blockedAt);
    else entryMarks(fx, spans, FLAG_VARIANT, "over", noteTop, blockedAt);
  }
  // D314: what the reading's marks ask, at the start of a round where they appear; the ornament's hint.
  if (fr.readingMarks?.size && fr.legendUntil !== undefined && fr.now < fr.legendUntil) marksLegend(g, w, h, fr, edge, Math.min(1, (fr.legendUntil - fr.now) / (2 * fr.tps)));
  if (fr.banner) banner(g, w, fr.banner, fx.gold);
  if (fr.cadences) cadenceMarks(fx, fr.cadences);
  if (fr.spans && fr.bossFight) bossBar(fx, fr.spans.filter((s) => s.form !== "counter"), fr.voice, fr.notes);
  zoneGlow(fx, fr.zone ?? null);
}

/** The design studio (the owner: YOU should "glow or blink" to be seen): one breath every YOU_BREATH_S. */
export const YOU_BREATH_S = 1.8;
/**
 * The YOU label, breathing: a soft glow of the player's ink round the word, swelling and fading once every
 * YOU_BREATH_S (about 0.56 Hz, under the owner's 1 Hz ceiling), on the wall clock: never on the music, never
 * on right or wrong. The word itself stays white.
 */
function youLabel(g: CanvasRenderingContext2D, x: number, y: number, ink: string, edge: string, t: number) {
  const word = tr("YOU");
  const tw = textWidth(word) - 1;
  // 0 .. 1 .. 0, smooth (a sine), one breath every YOU_BREATH_S.
  const b = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / YOU_BREATH_S);
  g.fillStyle = ink;
  g.globalAlpha = 0.18 + 0.32 * b;
  g.fillRect(x - 3, y - 3, tw + 6, 11);
  g.globalAlpha = 0.3 + 0.5 * b;
  g.fillRect(x - 2, y - 2, tw + 4, 9);
  g.globalAlpha = 1;
  pixText(g, word, x, y, edge);
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
  const lines = legendOf(fr);
  if (!lines.length) return;
  const lh = 8;
  // D391: a whole reading's signs too: in columns where one would not fit the box.
  const rows = Math.max(1, Math.min(lines.length, Math.floor((h - 14) / lh)));
  const cols = Math.ceil(lines.length / rows);
  const colW = Math.floor((w - 8) / cols);
  const lw = Math.min(w - 8, cols > 1 ? colW * cols : 10 + Math.max(...lines.map((l) => textWidth(l.text))) + 5);
  const y0 = h - 6 - rows * lh - 4;
  g.globalAlpha = 0.62 * alpha;
  g.fillStyle = "#0c0a10";
  g.fillRect(3, y0, lw + 4, rows * lh + 5);
  g.globalAlpha = alpha;
  if (cols > 1) {
    g.save();
    g.beginPath();
  }
  lines.forEach((l, k) => {
    const x0 = Math.floor(k / rows) * colW;
    const y = y0 + 3 + (k % rows) * lh;
    if (cols > 1) {
      g.restore();
      g.save();
      g.beginPath();
      g.rect(x0 + 3, y - 1, colW - 2, lh);
      g.clip();
    }
    legendSign(g, l.kind, x0, y, edge);
    pixText(g, l.text, x0 + 15, y, edge);
  });
  if (cols > 1) g.restore();
  g.globalAlpha = 1;
}
const legendMemo = new WeakMap<object, { kind: string; text: string }[]>();
/** The legend's lines for a frame's marks (made once per marks: the judged signs, then a whole reading's). */
function legendOf(fr: Frame): { kind: string; text: string }[] {
  const key = fr.readingMarks!;
  let lines = legendMemo.get(key);
  if (!lines) {
    const has = marksHas(fr.readingMarks!.values());
    lines = [...markLegend(STRONG_SIDE).filter((l) => has[l.kind]), ...(fr.whole ? wholeLegend(fr.whole) : [])];
    legendMemo.set(key, lines);
  }
  return lines;
}
/** The sign as drawn over (or under) the notes, at the legend's left. */
function legendSign(g: CanvasRenderingContext2D, kind: string, x0: number, y: number, edge: string) {
  const x = x0;
  g.fillStyle = edge;
  switch (kind) {
    // D374: the dot, the red stroke, the gold line (JOINED), the gold arc (D370: SLUR), the orange >.
    case "short":
      return g.fillRect(x + 7, y + 2, 2, 2);
    case "apart":
      return (g.fillStyle = DETACH_RED), g.fillRect(x + 7, y, 1, 5);
    case "joined":
      return (g.fillStyle = GOLD_SLUR), g.fillRect(x + 6, y + 1, 5, 1), g.fillRect(x + 5, y + 2, 1, 1), g.fillRect(x + 11, y + 2, 1, 1);
    case "slur":
    case "phrase":
      if (kind === "phrase") g.globalAlpha *= 0.5;
      g.fillStyle = kind === "phrase" ? edge : GOLD_SLUR;
      g.fillRect(x + 4, y + 3, 1, 1), g.fillRect(x + 5, y + 2, 1, 1), g.fillRect(x + 6, y + 1, 4, 1), g.fillRect(x + 10, y + 2, 1, 1), g.fillRect(x + 11, y + 3, 1, 1);
      if (kind === "phrase") g.globalAlpha *= 2;
      return;
    case "strong":
      return void pixText(g, ">", x + 6, y, ACCENT_ORANGE);
    // D391: BUSONI's own (box-whole.ts draws them the same).
    case "lift":
      return g.fillRect(x + 8, y, 1, 2), g.fillRect(x + 7, y + 2, 1, 1);
    case "breath":
      for (let r = 0; r < 4; r++) g.fillRect(x + 8 - r, y + r, 1, 1), g.fillRect(x + 11 - r, y + r, 1, 1);
      return;
    case "dynamics":
      return void pixText(g, "P", x + 5, y, edge);
    case "hairpin":
      return void pixText(g, "<", x + 6, y, edge);
    case "words":
      return void pixText(g, "AA", x + 4, y, edge);
    default:
      // wedge, marcato, tenuto, portato, fermata: as over a note (its top at y + 6).
      noteSigns(g, { join: null, short: null, accent: null, [kind]: true }, x + 6, x + 8, y + (kind === "fermata" ? 10 : 6), edge, ACCENT_ORANGE);
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
const PLAYED_LISTS: (readonly LaneNote[] | null)[] = [null, null];
/**
 * The design studio: the entry marks' variant (box-fx.ts entryMarks), `?flagv=a|b|c` in the page's
 * address (`o` D372's flag, for comparison); TAB (a) unless asked.
 */
export const FLAG_VARIANT: FlagVariant = (() => {
  try {
    const v = new URLSearchParams(globalThis.location?.search ?? "").get("flagv");
    return v === "a" || v === "b" || v === "c" || v === "o" ? v : "a";
  } catch {
    return "a";
  }
})();
/** D391: the whole reading's geometry, one object kept (filled each frame: nothing allocated). */
const WHOLE_GEO = {} as WholeGeo;
/** D391: a reading's mark (readings.ts MarkNote), with a whole-piece reading's own signs (whole-marks.ts BoxMark). */
type MarkNote = BoxMark;

/**
 * D374: the detached stroke and the accent's sign. Design studio (D417, the audit): the reading's touch signs are
 * gold, never a voice's colour (the accent was the alto's orange) nor next to the error red (the stroke was).
 */
const DETACH_RED = "#ffd23f";
const ACCENT_ORANGE = "#ffd23f";
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
