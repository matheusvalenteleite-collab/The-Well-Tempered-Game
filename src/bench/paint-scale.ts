/**
 * D230, SCALE KEYS on the computer's HIGHWAY (scale-keys.ts): what the road draws differently.
 *   Eight home lanes, A to K, the home key's degrees 1 to 8 (the tonic gold at both ends);
 *   an altered note a narrower "black-key" gem riding on the seam between two lanes: a raised note
 *   (the row above) set a little higher, dark with an amber rim; a lowered note (the row below) a
 *   little lower, dark with a blue rim; every gem labelled with its key's letter;
 *   under the road a key-strip of the three rows (the row above over the home row, the row below
 *   under it, each key lit while down), the home key named (HOME: C MINOR) and an AWAY meter: of
 *   the last notes passed, the share on the row above and on the row below (how far it has modulated,
 *   and which way).
 * Kept apart from paint-desk.ts (its own functions, called from paint-proto.ts `highway`).
 */
import type { ProtoGame } from "./proto-game.ts";
import { homeName, SCALE_DOWN, SCALE_HOME, SCALE_UP, type ScaleKey } from "./scale-keys.ts";
import { label, shade, type Tok } from "./paint-proto.ts";
import type { Road } from "./paint-desk.ts";

/** Each home degree's colour: the tonic gold (A and K alike), then round the wheel. */
export const SCALE_INK = ["#ffd66e", "#ff9248", "#ff6b5a", "#ff7dd6", "#b47dff", "#4cb8ff", "#4fd6b2", "#ffd66e"];
/** The row above (raised: the dominant side) and the row below (lowered: the subdominant side). */
export const UP_INK = "#ffa94d";
export const DOWN_INK = "#6f9bff";

/** A lane's colour (a home lane's degree; a seam between two, neutral). */
export const scaleInk = (pos: number) => (Number.isInteger(pos) && pos >= 0 && pos < 8 ? SCALE_INK[pos] : "#e8e0ff");

const letter = (code: string) => code.slice(3);

/**
 * One note's gem in this layout, at its lane (x) and depth (k). Returns where it was drawn (for the
 * subject's crown and the ornament's sign).
 */
export function scaleGem(c: CanvasRenderingContext2D, x: number, y: number, lw: number, gh: number, k: number, key: ScaleKey, miss: boolean, t: Tok): { y: number; gw: number; gh: number } {
  if (key.row === 0) {
    const ink = SCALE_INK[Math.round(key.pos)] ?? SCALE_INK[0];
    const gw = lw * 0.8;
    c.fillStyle = "rgba(0,0,0,0.45)";
    c.fillRect(x - gw / 2 + 2 * k, y - gh / 2 + gh * 0.9, gw, gh * 0.45);
    c.fillStyle = miss ? "#3a3644" : shade(ink, 0.55);
    c.fillRect(x - gw / 2, y, gw, gh * 0.55);
    c.fillStyle = miss ? t.miss : ink;
    c.fillRect(x - gw / 2, y - gh / 2, gw, gh * 0.6);
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.fillRect(x - gw / 2, y - gh / 2, gw, Math.max(1, gh * 0.16));
    return { y, gw, gh };
  }
  // A black key: narrower, taller, dark; raised above the line, or lowered below it.
  const up = key.row > 0;
  const ink = up ? UP_INK : DOWN_INK;
  const gw = lw * 0.5;
  const bh = gh * 1.15;
  const yy = y + (up ? -0.55 : 0.55) * gh;
  c.fillStyle = "rgba(0,0,0,0.5)";
  c.fillRect(x - gw / 2 + 2 * k, yy - bh / 2 + bh * 0.9, gw, bh * 0.4);
  c.fillStyle = miss ? "#2a2733" : shade(ink, 0.25);
  c.fillRect(x - gw / 2, yy, gw, bh * 0.55);
  c.fillStyle = miss ? "#3a3644" : shade(ink, 0.5);
  c.fillRect(x - gw / 2, yy - bh / 2, gw, bh * 0.62);
  c.strokeStyle = miss ? t.miss : ink;
  c.lineWidth = Math.max(1, 2 * k);
  c.strokeRect(x - gw / 2, yy - bh / 2, gw, bh);
  return { y: yy, gw, gh: bh };
}

/** A gem's key letter (drawn last, over the subject's frame): dark on a home gem, the rim's colour on a black key's. */
export function scaleLetter(c: CanvasRenderingContext2D, x: number, y: number, gh: number, k: number, key: ScaleKey, miss: boolean, t: Tok) {
  if (k < 0.34) return;
  const size = Math.max(6, Math.round(11 * k));
  const ink = miss ? t.miss : key.row === 0 ? "#1a1408" : "#fff6e0";
  label(c, letter(key.code), x, y - gh * (key.row === 0 ? 0.2 : 0.12), ink, size);
}

/**
 * The key-strip at the strike line: the home row (each key its letter and degree), the row above
 * raised over the seams, the row below lowered under them; a key lit while down; the home key named
 * and the AWAY meter on the left. Returns the y where the space bar goes.
 */
export function scaleStrip(r: Road, sk: ScaleKey[]): number {
  const { c, g, t, laneX, W, N, y1, cx } = r;
  const down = g.keysDown;
  const bw = (W / N) * 0.8;
  const bh = 18;
  SCALE_HOME.forEach((code, l) => {
    const x = laneX(l, 1);
    const ink = SCALE_INK[l];
    const on = down.has(code);
    const sink = on ? 4 : 0;
    c.fillStyle = shade(ink, 0.35);
    c.fillRect(x - bw / 2, y1 - bh / 2 + bh, bw, 6 - sink);
    c.fillStyle = on ? ink : "#1d1a24";
    c.fillRect(x - bw / 2, y1 - bh / 2 + sink, bw, bh);
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.strokeRect(x - bw / 2, y1 - bh / 2 + sink, bw, bh);
    if (on) {
      c.fillStyle = ink;
      c.globalAlpha = 0.25;
      c.fillRect(x - bw / 2 - 6, y1 - bh / 2 - 40, bw + 12, 40);
      c.globalAlpha = 1;
    }
    label(c, letter(code), x - 6, y1 + sink, on ? "#1a1408" : t.fg, 9);
    label(c, `${l + 1}`, x + 12, y1 + 1 + sink, on ? "#1a1408" : t.muted, 6);
  });
  // The black keys: the row above over the seams (raised d between d and d + 1), the row below under them.
  const rare = new Set(["KeyR", "KeyI", "KeyV", "KeyZ"]);
  const black = (code: string, pos: number, up: boolean) => {
    const x = laneX(pos, 1);
    const y = y1 + (up ? -27 : 27);
    const ink = up ? UP_INK : DOWN_INK;
    const on = down.has(code);
    const kw = bw * 0.42;
    c.globalAlpha = rare.has(code) && !on ? 0.45 : 1;
    c.fillStyle = on ? ink : up ? "#22160b" : "#0d1526";
    c.fillRect(x - kw / 2, y - 7, kw, 14);
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.strokeRect(x - kw / 2, y - 7, kw, 14);
    label(c, letter(code), x, y, on ? "#10131c" : ink, 7);
    c.globalAlpha = 1;
  };
  SCALE_UP.forEach((code, d) => black(code, d + 0.5, true));
  SCALE_DOWN.forEach((code, d) => black(code, d - 0.5, false));
  // The home key, and how far away the music is now.
  const lx = cx - W / 2 - 84;
  label(c, homeName(g.f.key), lx, y1 + 26, SCALE_INK[0], 7);
  const away = awayNow(g, sk);
  label(c, "AWAY", lx - 44, y1 + 44, t.muted, 6, "left");
  const mw = 56;
  c.fillStyle = "#2a2533";
  c.fillRect(lx - 14, y1 + 39, mw, 4);
  c.fillRect(lx - 14, y1 + 46, mw, 4);
  c.fillStyle = UP_INK;
  c.fillRect(lx - 14, y1 + 39, Math.round(mw * Math.min(1, away.up * 2)), 4);
  c.fillStyle = DOWN_INK;
  c.fillRect(lx - 14, y1 + 46, Math.round(mw * Math.min(1, away.down * 2)), 4);
  return y1 + 42;
}

/** The AWAY meter: of the last notes passed (up to 24), the share raised and lowered. */
const AWAY_NOTES = 24;
export function awayNow(g: ProtoGame, sk: ScaleKey[]): { up: number; down: number } {
  let up = 0;
  let down = 0;
  let n = 0;
  let i = g.notes.findIndex((x) => x.on > g.now);
  if (i < 0) i = g.notes.length;
  for (let j = i - 1; j >= 0 && n < AWAY_NOTES; j--, n++) {
    const row = sk[j]?.row ?? 0;
    if (row > 0) up++;
    else if (row < 0) down++;
  }
  return n ? { up: up / n, down: down / n } : { up: 0, down: 0 };
}

/** The rules at the window's foot, in this layout. */
export function scaleHow(r: Road) {
  const { c, g, t, w, h } = r;
  const lvl = g.o.easy ?? "timing";
  label(c, lvl === "timing" ? "TIMING: ANY KEY ON THE BEAT · THE GEMS SHOW THE SCALE'S KEYS" : "HOME ROW: THE SCALE (1–8) · ROW ABOVE: RAISED ♯ · ROW BELOW: LOWERED ♭", w / 2, h - 24, t.fg, 7);
  label(c, `SAME NOTE: ITS KEY OR SPACE · THE TONIC: A OR K · SHIFT: PEDAL${g.pedalOn ? " (DOWN)" : ""}`, w / 2, h - 10, g.pedalOn ? t.gold : t.muted, 7);
}
