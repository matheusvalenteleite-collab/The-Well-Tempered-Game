/**
 * PROTOTYPE (the brainstorming room, docs/design/BRAINSTORM-RESULT.md and the I/16 act map): THE KNIGHT,
 * I/16's scripted stage, drawn on the two strips in THE LAB only. Every event comes from the piece's data
 * (entries, cadences, each voice's notes) or from Busoni's reading of I/16 (his double bars and dynamics,
 * docs/wtc/readings/busoni/wtc1f16-busoni.json), never from how the player plays: a perfect run and a
 * failed one look the same. Nothing is judged and nothing is drawn in the box.
 *
 * The scripted layer agreed with the owner:
 *   I    exposition: each voice's first entry sets its knight on the board (the bass heavily, quasi f;
 *        the tenor softly, weich); a clock press at Busoni's "(Modulation)" double bar (10½).
 *   II   the light drifts warm toward B♭; a clock press at bar 12.
 *   III  each entry moves its knight one L; a stretto makes two knights leap at once (bar 17); a voice
 *        silent for eight bars or more steps off the board (the tenor, 18⅝ to 28⅝, Busoni's footnote 5).
 *   IV   p dolce (bar 20, after the shared diminuendo of 19½): the light lowers, the moves are half-moves;
 *        a clock press at 20; the opponent's hand at the 24½ cadence, one run in three.
 *   V    a clock press at 28; the tenor returns into the stretto; ff at 33: every knight moves at once;
 *        the final cadence holds the last position, the clock stopped.
 * The reserved windows (the alto's 8–10, the soprano's 12–15, the episode 25–28) are left empty.
 */
import type { TouchFugue } from "../../touch/fugue.ts";
import { BAR } from "../protos.ts";

export const KNIGHT_PIECE = "wtc1f16";

/** Busoni's I/16, as ticks (tpq 1920, a bar 7680): his double bars and the dynamics that change the light. */
const BUSONI = {
  /** The double bars: "(Modulation)" in mid-bar 10, before 12, 20 and 28. */
  clocks: [72960, 84480, 145920, 207360],
  /** The warm drift toward B♭: from the "(Modulation)" bar to the B♭ cadence. */
  warm: [72960, 84480] as const,
  /** The shared diminuendo (19.6–19.14) into p dolce (20), held until f at 28. */
  quiet: [141120, 146880, 207360] as const,
  /** ff, every voice (bar 33). */
  ff: 245760,
};

/** A voice silent this many bars or more steps off the board (in I/16 only the tenor's ten bars). */
const EXIT_BARS = 8;

type Kind = "place" | "move" | "leap" | "exit" | "return" | "all";
export interface StageEvent {
  on: number;
  kind: Kind;
  voice: number;
  /** place: how it lands. */
  style?: "heavy" | "soft" | "plain";
  /** move: a half-move (the quiet section). */
  half?: boolean;
  /** Where the knight stands after the event (col, row on its strip's board), or null when off it. */
  to: [number, number] | null;
  from: [number, number] | null;
}

export interface KnightStage {
  f: TouchFugue;
  events: StageEvent[];
  clocks: number[];
  end: number;
  /** The visitor's moment (the 24½ cadence) when this run has it. */
  visitor: number | null;
  run: number;
}

const COLS = 4;
const ROWS = 6;
/** Knight moves, in a fixed order of preference. */
const L = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] as const;
/** The upper voices (soprano, alto) on the right strip, white; the lower (tenor, bass) on the left, black. */
export const sideOf = (voice: number) => (voice <= 1 ? 1 : 0);
const START: Record<number, [number, number]> = { 0: [1, 1], 1: [2, 4], 2: [1, 4], 3: [2, 1] };

/** The events of the stage, from the piece's data and Busoni's marks: a pure function of the piece. */
export function stageEvents(f: TouchFugue): StageEvent[] {
  const bt = f.barTicks;
  const beat = bt / 4;
  const raw: { on: number; kind: Kind; voice: number; style?: StageEvent["style"]; half?: boolean }[] = [];
  const entries = [...f.entries].sort((a, b) => a.on - b.on);
  const seen = new Set<number>();
  for (const e of entries) {
    if (!seen.has(e.voice)) {
      seen.add(e.voice);
      raw.push({ on: e.on, kind: "place", voice: e.voice, style: e.voice === 3 ? "heavy" : e.voice === 2 ? "soft" : "plain" });
      continue;
    }
    const lead = entries.find((p) => p.voice !== e.voice && p.on < e.on && e.on < p.end - beat);
    const half = e.on >= BUSONI.quiet[1] && e.on < BUSONI.quiet[2];
    if (lead) {
      raw.push({ on: e.on, kind: "leap", voice: e.voice });
      raw.push({ on: e.on, kind: "leap", voice: lead.voice });
    } else raw.push({ on: e.on, kind: "move", voice: e.voice, half });
  }
  // A long silence: off the board at the last note's end, back at the next note.
  f.voices.forEach((notes, v) => {
    const ns = [...notes].sort((a, b) => a[0] - b[0]);
    let end = 0;
    for (const n of ns) {
      if (end > 0 && n[0] - end >= EXIT_BARS * bt) {
        raw.push({ on: end, kind: "exit", voice: v });
        raw.push({ on: n[0], kind: "return", voice: v });
      }
      end = Math.max(end, n[0] + n[1]);
    }
  });
  for (let v = 0; v < f.voices.length; v++) if (seen.has(v)) raw.push({ on: BUSONI.ff, kind: "all", voice: v });
  const order: Record<Kind, number> = { return: 0, place: 1, exit: 2, move: 3, leap: 3, all: 3 };
  raw.sort((a, b) => a.on - b.on || order[a.kind] - order[b.kind] || a.voice - b.voice);

  // Walk the board: every knight's square after each event.
  const at = new Map<number, [number, number] | null>();
  const last = new Map<number, [number, number]>();
  let k = 0;
  return raw.map((r) => {
    const from = at.get(r.voice) ?? null;
    let to: [number, number] | null = from;
    if (r.kind === "place") to = START[r.voice] ?? [1, 1];
    else if (r.kind === "exit") (to = null), from && last.set(r.voice, from);
    else if (r.kind === "return") to = last.get(r.voice) ?? START[r.voice];
    else if (from) {
      const side = sideOf(r.voice);
      const taken = [...at.entries()].filter(([v, sq]) => v !== r.voice && sq && sideOf(v) === side).map(([, sq]) => sq!);
      const ok = L.map(([dc, dr]) => [from[0] + dc, from[1] + dr] as [number, number]).filter(([c, rr]) => c >= 0 && c < COLS && rr >= 0 && rr < ROWS && !taken.some(([tc, tr]) => tc === c && tr === rr));
      if (ok.length) to = ok[(k++ * 5 + r.voice * 3) % ok.length];
    }
    at.set(r.voice, to);
    return { ...r, from: r.kind === "return" ? null : from, to };
  });
}

/** The stage for a run of I/16 (null for any other piece). `run` counts the stage's runs (the visitor comes on every third). */
export function knightStage(f: TouchFugue, run: number): KnightStage | null {
  if (f.id !== KNIGHT_PIECE) return null;
  const cad = [...f.cadences].sort((a, b) => a.on - b.on);
  const visitAt = cad.find((c) => c.bar === 24)?.on ?? null;
  return { f, events: stageEvents(f), clocks: BUSONI.clocks, end: cad[cad.length - 1]?.on ?? f.length, visitor: run % 3 === 0 ? visitAt : null, run };
}

const RUNS = "tb-lab-knight-runs";
/** The next run's number (kept in this browser), from 1. */
export function nextKnightRun(): number {
  let n = 1;
  try {
    n = (Number(localStorage.getItem(RUNS)) || 0) + 1;
    localStorage.setItem(RUNS, String(n));
  } catch {
    /* private window: every run is run 1 */
  }
  return n;
}

/** What the paint needs from the running game. */
export interface StageClock {
  now: number;
  tps: number;
  beat: number;
  entry: number;
  startTick: number;
  voice: number;
  /** A voice's ink (MusicBox inkOf), passed in so this file stays free of React. */
  ink: (voice: number) => string;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (now: number, a: number, b: number) => clamp01((now - a) / (b - a));
const GOLD = "#f3d26b";

/** Paints the stage on the two strips (CSS pixels), under the HUD. */
export function paintKnightStage(c: CanvasRenderingContext2D, w: number, h: number, s: KnightStage, g: StageClock) {
  const now = g.now;
  const sec = (t: number) => (now - t) / g.tps;
  const bw = w * BAR;
  const y0 = h * 0.36;
  const y1 = h * 0.88;
  const sq = Math.max(8, Math.min((bw - 12) / (COLS + 1), (y1 - y0) / ROWS));
  const gridW = sq * COLS;
  const gridH = sq * ROWS;
  const top = y0 + (y1 - y0 - gridH) / 2;
  // Each board sits on its strip's inner side (by the box); its outer column is the edge where a knight waits.
  const left0 = (side: number) => (side === 0 ? bw - 6 - gridW : w - bw + 6);
  const offX = (side: number) => (side === 0 ? left0(0) - sq * 0.75 : left0(1) + gridW + sq * 0.75);

  // The mood: warm toward B♭ (II), lower and cooler in p dolce (IV), back at 28.
  const warm = ramp(now, BUSONI.warm[0], BUSONI.warm[1]);
  const quiet = ramp(now, BUSONI.quiet[0], BUSONI.quiet[1]) * (1 - ramp(now, BUSONI.quiet[2], BUSONI.quiet[2] + 1920));
  const light = (1 - 0.45 * quiet) * (0.92 + 0.03 * Math.sin(now / g.tps / 1.7));
  // The first heavy landing shakes the board a little (quarter of a second).
  const heavy = s.events.find((e) => e.kind === "place" && e.style === "heavy");
  const shake = heavy && sec(heavy.on) >= 0 && sec(heavy.on) < 0.25 ? Math.round(Math.sin(sec(heavy.on) * 80) * 2) : 0;

  c.save();
  for (const side of [0, 1]) {
    const x0 = left0(side);
    // The candle's light over the board.
    const glow = c.createRadialGradient(x0 + gridW / 2, top - sq, sq * 0.5, x0 + gridW / 2, top + gridH / 2, gridH * 0.8);
    const wa = (0.05 + 0.04 * warm) * light;
    glow.addColorStop(0, `rgba(255,${Math.round(196 - 20 * warm)},${Math.round(120 - 30 * warm)},${wa.toFixed(3)})`);
    glow.addColorStop(1, "rgba(255,190,110,0)");
    c.fillStyle = glow;
    c.fillRect(side === 0 ? 0 : w - bw, top - sq * 1.5, bw, gridH + sq * 3);
    // The squares: the light ones only, faint; a hairline frame.
    c.globalAlpha = (0.085 - 0.03 * quiet) * light;
    c.fillStyle = "#efe6cf";
    for (let col = 0; col < COLS; col++) for (let row = 0; row < ROWS; row++) if ((col + row) % 2 === 0) c.fillRect(x0 + col * sq, top + row * sq + shake, sq, sq);
    c.globalAlpha = 0.14 * light;
    c.strokeStyle = "#efe6cf";
    c.lineWidth = 1;
    c.strokeRect(x0 + 0.5, top + 0.5 + shake, gridW - 1, gridH - 1);
    c.globalAlpha = 1;
  }

  // The knights: each one's state from the events up to now.
  const cell = (side: number, [col, row]: [number, number]) => [left0(side) + (col + 0.5) * sq, top + (row + 0.5) * sq + shake] as const;
  const byVoice = new Map<number, StageEvent>();
  for (const e of s.events) if (e.on <= now) byVoice.set(e.voice, e);
  const ended = now >= s.end;
  for (const [v, e] of byVoice) {
    const side = sideOf(v);
    const t = sec(e.on);
    const mine = v === g.voice;
    let alpha = (mine ? 0.5 : 0.3) * light;
    let x: number;
    let y: number;
    if (e.kind === "exit" || (e.to === null && e.kind !== "return")) {
      // Off the board: walks to the outer edge over half a second, then waits there, dim.
      const k = ease(clamp01(t / 0.5));
      const [fx, fy] = e.from ? cell(side, e.from) : [offX(side), top + gridH / 2];
      x = fx + (offX(side) - fx) * k;
      y = fy;
      alpha *= 1 - 0.55 * k;
    } else {
      const [tx, ty] = cell(side, e.to!);
      if (e.kind === "place") {
        x = tx;
        y = ty;
        if (e.style === "heavy") y -= sq * 1.5 * (1 - ease(clamp01(t / 0.25)));
        alpha *= clamp01(t / (e.style === "soft" ? 1.5 : 0.4));
      } else if (e.kind === "return") {
        const k = ease(clamp01(t / 0.5));
        x = offX(side) + (tx - offX(side)) * k;
        y = ty;
        alpha *= 0.45 + 0.55 * k;
      } else {
        const dur = e.half ? 0.6 : 0.45;
        const k = ease(clamp01(t / dur));
        const [fx, fy] = e.from ? cell(side, e.from) : [tx, ty];
        x = fx + (tx - fx) * k;
        y = fy + (ty - fy) * k - Math.sin(Math.PI * k) * sq * (e.half ? 0.25 : 0.6);
        if (e.half) alpha *= 0.8;
        // A stretto's leap or the ff: a gold ring that fades over 0.7 s.
        if ((e.kind === "leap" || e.kind === "all") && t < 0.7) {
          c.globalAlpha = 0.4 * (1 - t / 0.7);
          c.strokeStyle = GOLD;
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(x, y, sq * (0.45 + 0.35 * (t / 0.7)), 0, Math.PI * 2);
          c.stroke();
        }
      }
    }
    if (ended) {
      // The final position held: a gold rim.
      c.globalAlpha = 0.5 * clamp01(sec(s.end) / 0.8);
      c.strokeStyle = GOLD;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, sq * 0.44, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = clamp01(alpha);
    c.fillStyle = g.ink(v);
    c.font = `${Math.round(sq * 0.86)}px "Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2",serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(side === 1 ? "♘" : "♞", x, y);
  }

  // The opponent's hand at the 24½ cadence (one run in three): reaches in from the outer edge and withdraws, one bar.
  if (s.visitor !== null) {
    const p = (now - s.visitor) / s.f.barTicks;
    if (p >= 0 && p < 1) {
      const reach = Math.sin(Math.PI * p);
      const hx = reach * (bw * 0.45);
      const hy = top + gridH * 0.35;
      c.globalAlpha = 0.22 * light;
      c.fillStyle = "#c9a98a";
      c.beginPath();
      c.roundRect(hx - bw * 0.35, hy, bw * 0.35, sq * 0.5, sq * 0.2);
      c.fill();
      c.fillStyle = "#3a3048";
      c.fillRect(hx - bw * 0.42, hy - 1, bw * 0.12, sq * 0.5 + 2);
    }
  }

  // The chess clock, on the left strip under the score: pressed on each count of the count-in and at Busoni's double bars.
  const cx = bw / 2;
  const cy = h * 0.27;
  const presses = s.clocks.filter((t) => t <= now).length;
  let pressT = s.clocks.filter((t) => t <= now).map(sec).pop() ?? Infinity;
  if (now < g.entry && now >= g.startTick) pressT = ((now - g.startTick) % g.beat) / g.tps;
  const white = presses % 2 === 0;
  const fw = Math.min(bw * 0.28, 30);
  const fh = fw * 0.62;
  c.globalAlpha = (ended ? 0.18 : 0.32) * light;
  c.fillStyle = "#d9cdb0";
  for (const [k, isWhite] of [[-1, false], [1, true]] as const) {
    const x = cx + k * (fw / 2 + 2) - fw / 2;
    c.fillRect(x, cy, fw, fh);
    // The plunger: up on the side to move; down (pressed) on the other; level when the game is over.
    const down = ended ? 0.5 : isWhite === white ? 0 : 1;
    const bump = pressT < 0.15 && isWhite !== white ? 2 : 0;
    c.fillRect(x + fw * 0.3, cy - 5 + 3 * down + bump, fw * 0.4, 4);
  }
  if (pressT < 0.3) {
    c.globalAlpha = 0.3 * (1 - pressT / 0.3);
    c.fillStyle = GOLD;
    c.fillRect(cx - fw - 2, cy, fw * 2 + 4, fh);
  }
  c.restore();
}
