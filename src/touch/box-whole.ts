/**
 * D391 (WTC 1.89): a whole-piece reading's guides drawn in the box (CLASSIC), over and under the player's
 * own line (whole-marks.ts WholeBox): slurs as arcs with the lift at their end, portato slurs dotted,
 * phrase arcs lighter and higher; under the line the printed levels in a small italic face, hairpins as
 * thin wedges, the character and tempo words as printed (their translation in the side legend); a
 * caesura's //. The note marks themselves (dot, wedge, ^, tenuto, portato, fermata, arpeggio) are drawn
 * with the reading's other marks (MusicBox paintClassic, noteSigns below). Thin lines, small letters,
 * nothing on the band's voices; nothing allocated a frame (each list walked by index from the first in
 * view, D345; a word's picture made once and kept on it).
 */
import { textWidth } from "./box-fx.ts";
import { firstOn, type BoxMark, type LineDyn, type WholeBox } from "./whole-marks.ts";

export interface WholeGeo {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  t0: number;
  t1: number;
  xOf: (tick: number) => number;
  yOf: (step: number) => number;
  bh: number;
  /** The voices played (the lines drawn). */
  voices: readonly number[];
  fg: string;
  gold: string;
}

/** The small italic face for the levels' letters (p, m, f, s, z): rows of a 6-high cell, its width; the x-height rows 1–3. */
export const DYN_GLYPHS: Readonly<Record<string, readonly string[]>> = {
  p: ["0000", "0111", "0101", "0111", "0100", "1000"],
  m: ["000000", "011110", "010101", "101010", "000000", "000000"],
  f: ["0011", "0100", "1110", "0100", "0100", "1000"],
  s: ["0000", "0011", "0100", "0010", "1100", "0000"],
  z: ["0000", "1111", "0010", "0100", "1111", "0000"],
};
/** A level's width in the box's pixels: its letters in the italic face, its words in the pixel face. */
export function dynWidth(d: LineDyn): number {
  let wd = 0;
  for (let i = 0; i < d.parts.length; i++) {
    const p = d.parts[i];
    if (p.italic) for (let c = 0; c < p.text.length; c++) wd += (DYN_GLYPHS[p.text[c]]?.[0].length ?? 4);
    else wd += textWidth(p.text);
    wd += 2;
  }
  return wd;
}
function italic(g: CanvasRenderingContext2D, text: string, x: number, y: number): number {
  let cx = x;
  for (let c = 0; c < text.length; c++) {
    const gl = DYN_GLYPHS[text[c]];
    if (!gl) continue;
    for (let r = 0; r < gl.length; r++) for (let q = 0; q < gl[r].length; q++) if (gl[r][q] === "1") g.fillRect(cx + q, y + r, 1, 1);
    cx += gl[0].length;
  }
  return cx - x;
}

/** The levels' ink: the normal zone (the line plays the level) cream; sf/sfz the accent's gold (D419: was the alto's orange). */
export const DYN_STRONG = "#ffd23f";
const DYN_ALPHA = 0.9;
const PHRASE_ALPHA = 0.38;


/** Under the line, a row's pixels below a step's block (kept inside the box). */
const under = (k: WholeGeo, step: number, dy: number, hgt: number) => Math.min(k.h - hgt - 1, k.yOf(step) + k.bh + dy);

/** D391: the arcs (slurs, portato slurs, phrases) over the player's line (D419: the lift tick and the caesura's // gone: the gap's stroke says it). */
export function paintWholeArcs(k: WholeGeo, box: WholeBox) {
  const { g, w } = k;
  for (let li = 0; li < box.lines.length; li++) {
    const l = box.lines[li];
    if (!k.voices.includes(l.voice)) continue;
    for (let si = 0; si < l.spans.length; si++) {
      const s = l.spans[si];
      if (s.a > k.t1) break;
      if (s.bEnd < k.t0) continue;
      const x1 = k.xOf(s.a);
      const x2 = k.xOf(s.b) + 2;
      const phrase = s.kind === "phrase";
      const lift = phrase ? Math.max(3, Math.min(9, (x2 - x1) / 10)) : Math.max(2, Math.min(6, (x2 - x1) / 6));
      const top = k.yOf(s.top) - (phrase ? 8 : 3);
      g.globalAlpha = phrase ? PHRASE_ALPHA : 1;
      g.fillStyle = phrase ? k.fg : k.gold;
      const a = Math.max(0, Math.round(x1));
      const b = Math.min(w, x2);
      for (let px = a; px <= b; px++) {
        // Portato's arc dotted; a phrase's every pixel, faint.
        if (s.kind === "portato" && (px - Math.round(x1)) % 2) continue;
        const u = (px - x1) / Math.max(1, x2 - x1);
        g.fillRect(px, Math.round(top - lift * 4 * u * (1 - u)), 1, 1);
      }
      // Design studio (D419): no lift tick at a slur's end: the stroke in the gap (MusicBox) is the one sign for a silence there.
    }
    // D419: no // for a caesura: its note is DETACHED (whole-marks), and the stroke in the gap is the one sign for a silence.
  }
  g.globalAlpha = 1;
}

/** D391: under the player's line: the levels (italic letters), the hairpins (thin wedges), the words as printed. */
export function paintWholeGuides(k: WholeGeo, box: WholeBox) {
  const { g, w } = k;
  // Words reach back a little: one begun just off the left edge still shows its end.
  const back = k.t0 - (k.t1 - k.t0) * 0.5;
  for (let li = 0; li < box.lines.length; li++) {
    const l = box.lines[li];
    if (!k.voices.includes(l.voice)) continue;
    // Hairpins: two thin lines opening (cresc.) or closing (dim.), three pixels at their widest.
    g.globalAlpha = 0.75;
    g.fillStyle = k.fg;
    for (let hi = 0; hi < l.hairpins.length; hi++) {
      const hp = l.hairpins[hi];
      if (hp.from > k.t1) break;
      if (hp.to < k.t0) continue;
      const x1 = k.xOf(hp.from);
      const x2 = k.xOf(hp.to);
      const yc = under(k, hp.step, 11, 4);
      const a = Math.max(0, x1);
      const b = Math.min(w, x2);
      for (let px = a; px <= b; px++) {
        const u = (px - x1) / Math.max(1, x2 - x1);
        const half = Math.round(2 * (hp.dir === "cresc" ? u : 1 - u));
        g.fillRect(px, yc - half, 1, 1);
        if (half) g.fillRect(px, yc + half, 1, 1);
      }
    }
    // The levels: the letters at their onset, under the line (sf the strong zone's orange).
    for (let di = firstOn(l.dyn, back); di < l.dyn.length; di++) {
      const d = l.dyn[di];
      if (d.on > k.t1) break;
      const x = k.xOf(d.on);
      const y = under(k, d.step, 2, 6);
      g.globalAlpha = DYN_ALPHA;
      g.fillStyle = d.strong ? DYN_STRONG : k.fg;
      let cx = x;
      for (let p = 0; p < d.parts.length; p++) {
        const part = d.parts[p];
        // D484: only the dynamic letters in the box; a level's words (p dolce's "dolce") go to the side legend.
        if (part.italic) cx += italic(g, part.text, cx, y) + 2;
      }
    }
    // D484 (the owner: "eliminate Busoni's written markings (molto dolce etc.) or relocate them; they're getting in
    // the way"): the words are no longer drawn in the box; the side legend shows the current one, translated.
  }
  g.globalAlpha = 1;
}

/** D391: a note's own BUSONI signs, over its block (the judge's dot, | and ‾ are MusicBox's): x the note's start, xm its middle, y its block's top. */
export function noteSigns(g: CanvasRenderingContext2D, mk: BoxMark, x: number, xm: number, y: number, fg: string, accentInk: string) {
  if (mk.wedge) {
    // ▾ (shorter than the dot).
    g.fillStyle = fg;
    g.fillRect(xm - 1, y - 5, 3, 1);
    g.fillRect(xm, y - 4, 1, 1);
  }
  if (mk.tenuto || mk.portato) {
    // The tenuto's dash; portato a dash under a dot.
    g.fillStyle = fg;
    g.fillRect(xm - 1, y - 3, 3, 1);
    if (mk.portato) g.fillRect(xm, y - 5, 1, 1);
  }
  if (mk.marcato) {
    // ^ (D387: the strong zone, on time; let go short).
    g.fillStyle = accentInk;
    g.fillRect(x + 2, y - 7, 1, 1);
    g.fillRect(x + 1, y - 6, 1, 1);
    g.fillRect(x + 3, y - 6, 1, 1);
    g.fillRect(x, y - 5, 1, 1);
    g.fillRect(x + 4, y - 5, 1, 1);
  }
  if (mk.fermata) {
    // 𝄐 over everything: an arc and its dot.
    g.fillStyle = fg;
    g.fillRect(xm - 1, y - 11, 3, 1);
    g.fillRect(xm - 2, y - 10, 1, 1);
    g.fillRect(xm + 2, y - 10, 1, 1);
    g.fillRect(xm, y - 9, 1, 1);
  }
}
/** D391: an arpeggio's wavy line before the note (Busoni's spread chord, from the bass). */
export function arpeggioSign(g: CanvasRenderingContext2D, x: number, y: number, bh: number, fg: string) {
  g.fillStyle = fg;
  for (let r = -1; r <= bh; r++) g.fillRect(x - 3 + (((r + 3) >> 1) % 2), y + r, 1, 1);
}
