/**
 * D468 (the design studio; the owner: "switch the design of the logo to that older simpler 8-bit
 * design we used to have"): the game's name as play.html's title bar printed it before D371 (LiteGrid's
 * `<h1>`, bench.css `.tb-lite-head h1`: Press Start 2P in the shine colour with a hard red drop shadow,
 * `text-shadow: 2px 2px 0 #b8322a`), here drawn from that face's own pixel letters (copied below, read
 * off the bundled press-start-2p woff2) as an inline SVG: one rect run per row of ink, the shadow the
 * same runs a pixel down and right, `shape-rendering="crispEdges"` and a viewBox in whole pixels, so it
 * is sharp at any size and device pixel ratio (no canvas, no raster, no font to wait for). It replaces
 * D371's canvas-made "title page" (a serif thresholded to pixels, shown as an enlarged PNG: soft on a 3×
 * phone). The lines are the language's WORDMARK (THE / WELL-TEMPERED / GAME, O JOGO / BEM TEMPERADO,
 * EL JUEGO / BIEN TEMPERADO), centred one above another.
 */
import { WORDMARK, type Lang } from "../i18n/index.ts";

/** Press Start 2P's capitals (and the hyphen): 7 rows of 7 pixels, "#" ink, on an 8-pixel advance. */
export const GLYPHS: Readonly<Record<string, string>> = {
  A: "..###../.##.##./##...##/##...##/#######/##...##/##...##",
  B: "######./##...##/##...##/######./##...##/##...##/######.",
  C: "..####./.##..##/##...../##...../##...../.##..##/..####.",
  D: "#####../##..##./##...##/##...##/##...##/##..##./#####..",
  E: "#######/##...../##...../######./##...../##...../#######",
  F: "#######/##...../##...../######./##...../##...../##.....",
  G: "..#####/.##..../##...../##..###/##...##/.##..##/..#####",
  H: "##...##/##...##/##...##/#######/##...##/##...##/##...##",
  I: ".######/...##../...##../...##../...##../...##../.######",
  J: ".....##/.....##/.....##/.....##/.....##/##...##/.#####.",
  K: "##...##/##..##./##.##../####.../#####../##.###./##..###",
  L: ".##..../.##..../.##..../.##..../.##..../.##..../.######",
  M: "##...##/###.###/#######/##.#.##/##.#.##/##...##/##...##",
  N: "##...##/###..##/####.##/##.####/##..###/##...##/##...##",
  O: ".#####./##...##/##...##/##...##/##...##/##...##/.#####.",
  P: "######./##...##/##...##/##...##/######./##...../##.....",
  Q: ".#####./##...##/##...##/##...##/##.####/##..##./.####.#",
  R: "######./##...##/##...##/##..###/#####../##.###./##..###",
  S: ".#####./##...##/##...../.#####./.....##/##...##/.#####.",
  T: ".######/...##../...##../...##../...##../...##../...##..",
  U: "##...##/##...##/##...##/##...##/##...##/##...##/.#####.",
  V: "##...##/##...##/##...##/###.###/.#####./..###../...#...",
  W: "##.#.##/##.#.##/##.#.##/##.#.##/#######/###.###/.#...#.",
  X: "##...##/##...##/.##.##./..###../.##.##./##...##/##...##",
  Y: ".##..##/.##..##/.##..##/..####./...##../...##../...##..",
  Z: "#######/....###/...###./..###../.###.../###..../#######",
  "-": "......./......./......./.######/......./......./.......",
};

/** The face's colour (`--tg-shine`) and the old title's red shadow. */
export const WORDMARK_INK = "#fff3a6";
export const WORDMARK_SHADOW = "#b8322a";
/** Pixels between the lines. */
const LEADING = 4;
const ADVANCE = 8;
const ROWS = 7;

export interface WordmarkPixels {
  /** The picture's size in its own pixels (the viewBox), the shadow included. */
  w: number;
  h: number;
  /** The ink as runs [x, y, length], each one pixel high. */
  runs: readonly (readonly [number, number, number])[];
}

const made = new Map<string, WordmarkPixels>();

/** A language's wordmark as pixel runs (made once per language). */
export function wordmarkPixels(l: Lang): WordmarkPixels {
  const hit = made.get(l);
  if (hit) return hit;
  const lines = WORDMARK[l].filter(Boolean);
  const width = (s: string) => s.length * ADVANCE - 1;
  const W = Math.max(...lines.map(width));
  const runs: [number, number, number][] = [];
  lines.forEach((line, li) => {
    const x0 = Math.floor((W - width(line)) / 2);
    const y0 = li * (ROWS + LEADING);
    [...line].forEach((ch, ci) => {
      const g = GLYPHS[ch];
      if (!g) return;
      g.split("/").forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== "#") continue;
          let n = 1;
          while (row[x + n] === "#") n++;
          runs.push([x0 + ci * ADVANCE + x, y0 + y, n]);
          x += n - 1;
        }
      });
    });
  });
  const res = { w: W + 1, h: lines.length * (ROWS + LEADING) - LEADING + 1, runs };
  made.set(l, res);
  return res;
}

/** The runs as one SVG path, moved by (dx, dy). */
export function runsPath(runs: WordmarkPixels["runs"], dx = 0, dy = 0): string {
  return runs.map(([x, y, n]) => `M${x + dx} ${y + dy}h${n}v1h-${n}z`).join("");
}
