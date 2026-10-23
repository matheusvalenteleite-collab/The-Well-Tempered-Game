/**
 * Design study (not in play): ten interface templates, each a whole other look for the music box, chosen
 * by the page's query (`bench.html?ui=NAME`, with `&auto=1` the voice plays itself). Without the query
 * nothing here runs and the box is drawn as before (MusicBox.paint). Mockups: each draws the same frame
 * the game gives the box (the notes, the player's states, the subject's entries) its own way, and lays
 * the steps out its own way (the side bars line up with the player's voice: uiRows).
 *
 *   gameboy   the original handheld's four greens; everything quiet, the player and the current entries
 *             in colour, each entry in tall square brackets (NEGATIVE's highlighting)
 *   gbc       its colour successor: a 4-colour palette per voice on the background tiles, the player as
 *             sprites with their own palette, a window layer for the text
 *   gerubach  an engraved grand staff scrolling under a red band, a black title bar, the 24 keys below
 *             (D227: a real interface, scroll-score.ts: the whole piece engraved once, strip.ts)
 *   score     modern engraving, one staff per voice (the player's full size, the others cue size), a
 *             playback cursor over the bar (D227: as GERUBACH)
 *   manuscript Bach's autograph: sepia paper, iron-gall ink, a handwritten music font, the soprano clef,
 *             the entries in red ink
 *   ocarina   five-line staff whose notes are the keys to press (the computer's arrows)
 *   nethack   a terminal roguelike: the voices as monster letters, the entries as lit rooms, @ the player
 *   pianola   a player-piano roll: punched slots over a tracker bar, the subject's notes accented by
 *             the Themodist's margin perforations
 *   tunnel    a wireframe tunnel, each voice a rail flying at the player, the entries as gates
 *   win95     a 1990s MIDI sequencer: piano roll, ghost notes for the other tracks, markers for the entries
 */
import type { Frame } from "../MusicBox.tsx";
import { fugueById } from "../fugue.ts";
import { buildCtx, type Geo, type Template } from "./core.ts";
import { GAMEBOY, GBC } from "./pixel.ts";
import { MANUSCRIPT } from "./engraved.ts";
import { GERUBACH, SCORE } from "./scroll-score.ts";
import { NETHACK, PIANOLA, WIN95 } from "./retro.ts";
import { OCARINA, TUNNEL } from "./arcade.ts";

function query(name: string): string | null {
  try {
    return typeof location === "undefined" ? null : new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

export const TEMPLATES: Record<string, Template> = {
  gameboy: GAMEBOY,
  gbc: GBC,
  gerubach: GERUBACH,
  score: SCORE,
  manuscript: MANUSCRIPT,
  ocarina: OCARINA,
  nethack: NETHACK,
  pianola: PIANOLA,
  tunnel: TUNNEL,
  win95: WIN95,
};

/** The template asked for (`?ui=NAME`), or null. */
export const UI: string | null = (() => {
  const q = query("ui");
  return q && q in TEMPLATES ? q : null;
})();

let styled = false;
function style(t: Template) {
  if (styled || typeof document === "undefined") return;
  styled = true;
  document.documentElement.classList.add(`ui-${UI}`);
  const css = (t.chrome ? ".tg-hud, .tg-legend { display: none !important; } .tg-box { padding: 0 !important; gap: 0 !important; border: 0 !important; grid-template-rows: 1fr !important; } .tg-roll { box-shadow: none !important; } .tg-roll::after { display: none !important; }" : "") + (t.css ?? "");
  const el = document.createElement("style");
  el.textContent = css;
  document.head.append(el);
}

const geos = new Map<string, Geo>();
function geoOf(t: Template, piece: string, voice: number, range: { lo: number; hi: number }, w: number, h: number): Geo {
  const key = `${piece}:${voice}:${range.lo}:${range.hi}:${Math.round(w)}:${Math.round(h)}`;
  let g = geos.get(key);
  if (!g) {
    if (geos.size > 20) geos.clear();
    g = t.geo({ f: fugueById(piece), voice, range, w, h });
    geos.set(key, g);
  }
  return g;
}

/** Draws the template in place of the box (true if it did). */
export function paintUi(c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame): boolean {
  const t = UI ? TEMPLATES[UI] : null;
  if (!t) return false;
  style(t);
  const dpr = Math.min(3, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
  const u = t.pixel || 1;
  const res = t.pixel ? 1 / t.pixel : dpr;
  const w = Math.max(1, Math.floor(cssW * res));
  const h = Math.max(1, Math.floor(cssH * res));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
  }
  const g = c.getContext("2d")!;
  g.setTransform(t.pixel ? 1 : dpr, 0, 0, t.pixel ? 1 : dpr, 0, 0);
  g.imageSmoothingEnabled = !t.pixel;
  const range = { lo: fr.lo, hi: fr.hi };
  const geo = geoOf(t, fr.piece ?? "wtc1f02", fr.voice, range, cssW, cssH);
  const W = t.pixel ? w : cssW;
  const H = t.pixel ? h : cssH;
  g.save();
  t.paint(buildCtx(t, g, W, H, u, fr, geo));
  g.restore();
  g.globalAlpha = 1;
  return true;
}

/** The side bars' rows for the template (CSS px): the player's voice's steps, linear. */
export function uiRows(piece: string, voice: number, range: { lo: number; hi: number }, cssH: number): { yOf: (step: number) => number; rowH: number } | null {
  const t = UI ? TEMPLATES[UI] : null;
  if (!t || t.rows === false) return null;
  const roll = typeof document !== "undefined" ? document.querySelector(".tg-roll") : null;
  const w = roll?.getBoundingClientRect().width ?? cssH * 2;
  const geo = geoOf(t, piece, voice, range, w, cssH);
  return { yOf: (s) => geo.yOf(s, voice), rowH: geo.A(voice) };
}
