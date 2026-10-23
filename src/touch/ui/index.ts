/**
 * Interface templates: each a whole other look for the music box. D228: some are offered in ⚙
 * INTERFACE (OFFERED, CLASSIC first: the box as it was), the choice kept on the device (`tb-ui-v1`);
 * the page's query (`bench.html?ui=NAME`, with `&auto=1` the voice plays itself) still overrides it and
 * reaches the whole design study. Each draws the same frame the game gives the box (the notes, the
 * player's states, the subject's entries) its own way, and lays the steps out its own way (the side
 * bars line up with the player's voice: uiRows).
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

/**
 * D228: the interfaces offered in ⚙ INTERFACE (the rest of the study stays behind `?ui=`), in order,
 * after CLASSIC. Each its name, its line and its family from the template.
 */
export const OFFERED = ["gameboy", "gbc", "nethack", "win95", "gerubach", "score"];
export interface UiOption {
  id: string;
  name: string;
  desc: string;
  family: string;
}
const CLASSIC: UiOption = { id: "classic", name: "CLASSIC", desc: "The 8-bit music box: every voice in its colour, the entries drawn whole.", family: "CLASSIC" };
/** Lines for templates that bring none of their own. */
const FALLBACK: Record<string, string> = {
  gerubach: "An engraved grand staff scrolling under a red band.",
  score: "Modern engraving: one staff per voice, yours full size.",
};
export function uiOptions(): UiOption[] {
  const out = [CLASSIC];
  for (const id of OFFERED) {
    const t = TEMPLATES[id];
    if (t) out.push({ id, name: t.name, desc: t.desc ?? FALLBACK[id] ?? "", family: t.family ?? t.name });
  }
  return out;
}
export function uiName(id: string): string {
  return uiOptions().find((o) => o.id === id)?.name ?? TEMPLATES[id]?.name ?? "CLASSIC";
}

export const UI_KEY = "tb-ui-v1";
/** The stored choice (an id offered, else CLASSIC). */
export function storedUi(): string {
  try {
    const v = typeof localStorage === "undefined" ? null : localStorage.getItem(UI_KEY);
    return v && uiOptions().some((o) => o.id === v) ? v : "classic";
  } catch {
    return "classic";
  }
}
/** `?ui=NAME` (any template of the study, or classic) overrides the choice, for testing. */
const ASKED: string | null = (() => {
  const q = query("ui");
  return q && (q in TEMPLATES || q === "classic") ? q : null;
})();
let current: string = ASKED ?? storedUi();
/** The interface in force ("classic" or a template's id). */
export function uiNow(): string {
  return current;
}
/** Chooses an interface: kept on this device (while `?ui=` is in the address, it wins). */
export function setUi(id: string) {
  if (id !== "classic" && !(id in TEMPLATES)) return;
  try {
    localStorage.setItem(UI_KEY, id);
  } catch {
    /* no storage */
  }
  if (!ASKED) current = id;
  restyle();
}
/** A template is drawing the box (not CLASSIC). */
export function uiActive(): boolean {
  return current !== "classic" && current in TEMPLATES;
}

let styled: string | null = null;
let sheet: HTMLStyleElement | null = null;
/** The page's look for the interface in force: a class on <html> and the template's CSS (rewritten only on a change). */
function restyle() {
  if (typeof document === "undefined" || !document.head || styled === current) return;
  const root = document.documentElement;
  if (styled) root.classList.remove(`ui-${styled}`);
  styled = current;
  const t = uiActive() ? TEMPLATES[current] : null;
  if (t) root.classList.add(`ui-${current}`);
  if (!sheet) {
    sheet = document.createElement("style");
    document.head.append(sheet);
  }
  // D228: a template with its own chrome keeps the box's header (the ✕ and ⚙ live there), restyled by its CSS; the legend goes.
  const chrome = ".tg-legend { display: none !important; } .tg-box { padding: 0 !important; gap: 0 !important; border: 0 !important; grid-template-rows: auto 1fr !important; } .tg-roll { box-shadow: none !important; } .tg-roll::after { display: none !important; }";
  sheet.textContent = t ? (t.chrome ? chrome : "") + (t.css ?? "") : "";
}

const geos = new Map<string, Geo>();
function geoOf(t: Template, piece: string, voice: number, range: { lo: number; hi: number }, w: number, h: number): Geo {
  const key = `${t.name}:${piece}:${voice}:${range.lo}:${range.hi}:${Math.round(w)}:${Math.round(h)}`;
  let g = geos.get(key);
  if (!g) {
    if (geos.size > 20) geos.clear();
    g = t.geo({ f: fugueById(piece), voice, range, w, h });
    geos.set(key, g);
  }
  return g;
}

/** Draws the template in force in place of the box (true if it did). */
export function paintUi(c: HTMLCanvasElement, cssW: number, cssH: number, fr: Frame): boolean {
  if (!uiActive()) return false;
  restyle();
  paintTemplate(c, TEMPLATES[current], cssW, cssH, fr);
  return true;
}

/** Draws a template at a size into a canvas (the box, or a thumbnail in the INTERFACE panel). */
export function paintTemplate(c: HTMLCanvasElement, t: Template, cssW: number, cssH: number, fr: Frame) {
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
}

/** The side bars' rows for the template in force (CSS px): the player's voice's steps, linear. */
export function uiRows(piece: string, voice: number, range: { lo: number; hi: number }, cssH: number): { yOf: (step: number) => number; rowH: number } | null {
  if (!uiActive()) return null;
  const t = TEMPLATES[current];
  if (!t || t.rows === false) return null;
  const roll = typeof document !== "undefined" ? document.querySelector(".tg-roll") : null;
  const w = roll?.getBoundingClientRect().width ?? cssH * 2;
  const geo = geoOf(t, piece, voice, range, w, cssH);
  // D228: linear through the player's range (the steps beyond it are squeezed in the box; the bars keep the rows).
  const mid = Math.round((range.lo + range.hi) / 2);
  const y = geo.yOf(mid, voice);
  const A = geo.A(voice);
  return { yOf: (s) => y - (s - mid) * A, rowH: A };
}

/** D228: the ⚙ button's words ("INTERFACE · CLASSIC"). */
export function uiLabel(id: string): string {
  return `INTERFACE · ${uiName(id)}`;
}

/**
 * A frame for a thumbnail: the box's own, moved to a quarter of the way into the player's first entry
 * (else the first entry), so each picture shows an entry being sung.
 */
export function thumbFrame(fr: Frame): Frame {
  const es = (fr.spans ?? []).filter((s) => s.form !== "counter");
  const e = es.find((s) => s.voice === fr.voice && s.on >= fr.now) ?? es.find((s) => s.on >= fr.now) ?? es[0];
  return e ? { ...fr, now: e.on + (e.end - e.on) / 4 } : fr;
}
