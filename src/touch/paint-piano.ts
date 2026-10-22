/**
 * Painting the Piano's play area (D172): the keyboard across the bottom (KEYS_SHARE of the height),
 * the voice's notes falling onto their keys from above, the other voices' notes in that range falling
 * too, dimmer and narrower; the notes of the subject dotted along their top. A key lights in the
 * voice's colour as its note comes down to it; the keys held are pressed; a wrong key flashes red.
 */
import { APPROACH_MS, KEYS_SHARE, type Game, type Grade } from "./engine.ts";
import type { LaneNote } from "./lanes.ts";
import { inkOf } from "./MusicBox.tsx";
import { isBlack, keySpan, WHITE_ONLY, type Keyboard } from "./piano.ts";
import type { OtherNote } from "./voice-mode.ts";

/** What the keyboard and its falling notes are drawn from (the game, or the testbench's PIANO). */
export interface PianoView {
  kb: Keyboard;
  now: number;
  tps: number;
  /** The voice played, of how many. */
  voice: number;
  count: number;
  notes: LaneNote[];
  others: OtherNote[];
  /** The window's late edge, in ticks. */
  late: number;
  held: number[];
  grade: Grade | null;
}

export function pianoView(game: Game): PianoView {
  const lv = game.tracks[0].lv;
  return { kb: game.kb, now: game.now, tps: game.tps, voice: lv.voice, count: game.f.voices.length, notes: lv.notes, others: game.others, late: game.opt.late, held: game.heldKeys(), grade: game.grade };
}

const FONT = '"TG Accidentals", "Press Start 2P", ui-monospace, monospace';
/** How long a note takes to fall the height above the keys, as a share of the approach. */
const FALL = 1.8;

export function paintPiano(g: CanvasRenderingContext2D, w: number, h: number, game: PianoView, subject: Set<string>) {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string) => css.getPropertyValue(name).trim() || "#fff";
  const shine = tok("--tg-shine");
  const wrong = tok("--tg-wrong");
  const fg = tok("--tg-fg");
  const muted = tok("--tg-muted");
  const grid = tok("--tg-grid");
  const kb = game.kb;
  const now = game.now;
  const { count, voice } = game;
  const ink = inkOf(voice, count);
  const top = h * (1 - KEYS_SHARE);
  const fall = (APPROACH_MS / 1000) * game.tps * FALL;
  const yOf = (tick: number) => top - ((tick - now) / fall) * top;
  const inRange = (m: number) => m >= kb.lo && m <= kb.hi;

  // The lanes of the black keys, faint, so a falling note's key reads straight down.
  for (let m = kb.lo; m <= kb.hi; m++) {
    const [a, b] = keySpan(kb, m);
    if (isBlack(m)) {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(a * w, 0, (b - a) * w, top);
    } else if (m % 12 === 0 || m % 12 === 5) {
      g.fillStyle = grid;
      g.fillRect(a * w, 0, 1, top);
    }
  }

  // The others' notes in range: dimmer, narrower.
  g.globalAlpha = 0.45;
  for (const o of game.others) {
    if (o.on > now + fall) break;
    if (o.on + o.dur < now || !inRange(o.midi)) continue;
    const [a, b] = keySpan(kb, o.midi);
    const y1 = yOf(o.on);
    const y0 = Math.max(0, yOf(o.on + o.dur));
    if (y1 < 0) continue;
    g.fillStyle = inkOf(o.voice, count);
    const pad = (b - a) * w * 0.3;
    g.fillRect(a * w + pad, y0, (b - a) * w - 2 * pad, Math.min(top, y1) - y0 - 1);
  }
  g.globalAlpha = 1;

  // The voice's notes, falling onto their keys.
  const notes = game.notes;
  const coming = new Set<number>();
  for (const n of notes) {
    if (n.on > now + fall) break;
    if (n.on + n.dur < now - game.late) continue;
    const [a, b] = keySpan(kb, n.midi);
    const y1 = Math.min(top, yOf(n.on));
    const y0 = Math.max(0, yOf(n.on + n.dur));
    if (y1 <= 0) continue;
    if (n.state === "pending" && !n.ride && n.on >= now - game.late && n.on - now < (APPROACH_MS / 1000) * game.tps) coming.add(n.midi);
    g.fillStyle = n.state === "miss" ? tok("--tg-miss") : ink;
    g.globalAlpha = n.ride ? 0.6 : 1;
    g.fillRect(a * w + 1, y0, (b - a) * w - 2, Math.max(2, y1 - y0 - 1));
    if (n.state === "hit") {
      g.fillStyle = shine;
      g.globalAlpha = 0.5;
      g.fillRect(a * w + 1, y0, (b - a) * w - 2, Math.max(2, y1 - y0 - 1));
    }
    g.globalAlpha = 1;
    if (subject.has(`${voice}:${n.on}`)) {
      g.fillStyle = fg;
      for (let x = Math.ceil(a * w) + 2; x < b * w - 2; x += 4) g.fillRect(x, Math.max(0, y1 - 4), 2, 2);
    }
  }

  // The keyboard.
  const kh = h - top;
  const held = new Set(game.held);
  const gr = game.grade;
  const wrongKey = gr && gr.text === "✕" && gr.key !== undefined && performance.now() - gr.at < 300 ? gr.key : null;
  const fill = (m: number, x: number, y: number, ww: number, hh: number, base: string) => {
    g.fillStyle = base;
    g.fillRect(x, y, ww, hh);
    if (coming.has(m)) {
      g.fillStyle = ink;
      g.globalAlpha = 0.55;
      g.fillRect(x, y, ww, hh);
      g.globalAlpha = 1;
    }
    if (held.has(m)) {
      g.fillStyle = m === wrongKey ? wrong : shine;
      g.globalAlpha = 0.5;
      g.fillRect(x, y, ww, hh);
      g.globalAlpha = 1;
    }
  };
  for (let m = kb.lo; m <= kb.hi; m++) {
    if (isBlack(m)) continue;
    const [a, b] = keySpan(kb, m);
    fill(m, a * w + 1, top + 2, (b - a) * w - 2, kh - 2, "#d9d6c3");
    if (m % 12 === 0) {
      g.fillStyle = muted;
      g.font = `7px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "bottom";
      g.fillText(`C${Math.floor(m / 12) - 1}`, ((a + b) / 2) * w, h - 4);
    }
  }
  for (let m = kb.lo; m <= kb.hi; m++) {
    if (!isBlack(m)) continue;
    const [a, b] = keySpan(kb, m);
    fill(m, a * w, top + 2, (b - a) * w, kh * (1 - WHITE_ONLY), "#1a1c2c");
  }
  g.fillStyle = shine;
  g.fillRect(0, top, w, 2);
}
