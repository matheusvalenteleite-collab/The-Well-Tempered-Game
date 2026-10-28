/**
 * The music box's events (D186; D208): the subject drawn as the character it is, the bosses, and what
 * the player's playing throws up. Drawn on the box's own pixels (half the screen's), in a 3 by 5 font.
 *   Each subject entry (D320): a soft shaded band behind it, first note to last, in a light tint of
 *   its colour, its word small at its top left ("SUBJECT"; STRETTO when it begins inside another);
 *   fainter while announced; each of its notes catches fire as it sounds (embers rising). D352: in
 *   its subject's primary (1 red, 2 blue, 3 yellow: subject-hue.ts), whoever's voice; grey once lost.
 *   D372 (Mario's report §6): no band; a SUBJECT flag on each entry's first note (flags), and each
 *   subject its own effect in its voice's own subject colour, note by note by weight (subjectFx; the
 *   cast and weights in subject-cast.ts). `strikes` (the embers) stays for the design study's variants.
 *   The countersubject is not marked.
 *   The bosses (not in LADDER): while one is near, a bar of its notes along the top.
 *   Points rise from the note struck; a captured entry bursts into pixels.
 */
import { tr, trCanvas } from "../i18n/index.ts";
import { subjectInkOf, subjectRimOf, themeOf } from "./subject-hue.ts";
import { OTHERS_SCALE, effectOf, weightsOf } from "./subject-cast.ts";

export interface Span {
  voice: number;
  on: number;
  end: number;
  form: "subject" | "answer" | "counter";
  /** D194: "INVERSION", "AUGMENTATION"…; the later subjects of a double or triple fugue (2, 3). */
  shape?: string;
  theme?: number;
  key: string;
  path: { on: number; dur: number; step: number }[];
}

export interface Pop {
  tick: number;
  step: number;
  text: string;
  at: number;
  gold: boolean;
  /** D218: its colour (a word: LEGATO, HELD, CLEAN); a legato's slur drawn from the note before. */
  ink?: string;
  from?: { tick: number; step: number };
}

export interface Burst {
  at: number;
  points: { tick: number; step: number }[];
  boss: boolean;
}

const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010", "8": "111101111101111",
  "9": "111101111001110", "+": "000010111010000", "·": "000000010000000", "×": "000101010101000", "!": "010010010000010",
  "#": "101111101111101", "~": "000011110000000", "|": "010010010010010", "♭": "100100110101110", "-": "000000111000000", " ": "000000000000000",
  // D314: the reading's wedge and the legend's punctuation.
  ">": "100010001010100", "<": "001010100010001", ":": "000010000010000", ",": "000000000010100", ".": "000000000000010", "(": "010100100100010", ")": "010001001001010", "/": "001001010100100", "'": "010010000000000",
  // D347: the sung words' punctuation.
  ";": "000010000010100", "?": "110001010000010",
};

/** Text in the 3 by 5 font; returns its width. */
export function pixText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1): number {
  // D283: every word drawn in the box in the language chosen (the cadences, the points' words).
  return pixRaw(g as PixTarget, trCanvas(text.toUpperCase()), x, y, color, scale);
}
/** What pixRaw draws on: the box's canvas, or a small one it keeps a word on (D347). */
export type PixTarget = Pick<CanvasRenderingContext2D, "fillStyle" | "fillRect">;
/** D347: the pixel font on text as given (upper case already, never translated: the sung words). */
export function pixRaw(g: PixTarget, text: string, x: number, y: number, color: string, scale = 1): number {
  g.fillStyle = color;
  let cx = Math.round(x);
  // D301: the accents drawn too (the owner: "why are there no accents … like VOCÊ"): the letter, then its
  // marks in two rows above it (the cedilla below), as the 3 by 5 font's own pixels.
  for (const [base, marks] of letters(text)) {
    const glyph = GLYPHS[base] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++) if (glyph[i] === "1") g.fillRect(cx + (i % 3) * scale, Math.round(y) + Math.floor(i / 3) * scale, scale, scale);
    for (const m of marks) {
      const mk = MARKS[m];
      if (!mk) continue;
      for (let i = 0; i < 6; i++) if (mk.px[i] === "1") g.fillRect(cx + (i % 3) * scale, Math.round(y) + (mk.row + Math.floor(i / 3)) * scale, scale, scale);
    }
    cx += 4 * scale;
  }
  return cx - x;
}
/** D301: the diacritics as 3 by 2 pixels: rows above the letter (row -2), the cedilla below (row 5). */
const MARKS: Record<string, { px: string; row: number }> = {
  "\u0301": { px: "001010", row: -2 }, // acute
  "\u0300": { px: "100010", row: -2 }, // grave
  "\u0302": { px: "010101", row: -2 }, // circumflex
  "\u0303": { px: "011110", row: -2 }, // tilde
  "\u0308": { px: "101000", row: -2 }, // diaeresis
  "\u0327": { px: "010100", row: 5 }, // cedilla
};
/** D301: the text as letters, each with its combining marks. */
function letters(text: string): [string, string[]][] {
  const out: [string, string[]][] = [];
  for (const ch of text.normalize("NFD")) {
    if (/[\u0300-\u036f]/.test(ch)) out.at(-1)?.[1].push(ch);
    else out.push([ch, []]);
  }
  return out;
}
export const textWidth = (text: string, scale = 1) => letters(text).length * 4 * scale;

/** "c" → "C MINOR", "Eb" → "E♭ MAJOR". */
export function keyWords(key: string): string {
  const minor = key[0] === key[0].toLowerCase();
  const name = key[0].toUpperCase() + key.slice(1).replace("b", "♭");
  return `${name} ${minor ? "MINOR" : "MAJOR"}`;
}

interface Ctx {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  xOf: (tick: number) => number;
  yOf: (step: number) => number;
  /** D211: a step's row height (smaller in the squeezed margins). */
  hOf?: (step: number) => number;
  bh: number;
  now: number;
  tps: number;
  gold: string;
  miss: string;
  fg: string;
  ink: (voice: number) => string;
}

/**
 * D372 (Mario's report §6; replaces D320's shaded band, quieted by D352): THE SUBJECT FLAG. No band
 * behind the entry; a small cream flag on a 1 px pole at each entry's first note, moving with it, above
 * the note (below it where another voice's note is in the way, or no room above), the word SUBJECT
 * (SUJEITO, SUJETO; SUBJECT 2 for a later subject) in the 3 by 5 font. One flag an entry, so in a
 * stretto each entry has its own. It fades once the entry's first three notes have passed. D265 kept:
 * every entry a SUBJECT (no ANSWER). Never tied to right or wrong (the same flag captured or lost).
 * `blocked` says whether a rectangle is taken by another voice's note (the entry's own never push it below).
 */
export const FLAG_FADE_S = 0.4;
const FLAG_BG = "#fff3c4";
const FLAG_INK = "#2a2030";
export function flags(c: Ctx, spans: readonly Span[], blocked: (x0: number, x1: number, y0: number, y1: number, voice: number, on: number) => boolean) {
  const { g, w, h, xOf, yOf, bh, now, tps } = c;
  for (const s of spans) {
    if (s.form === "counter" || !s.path.length) continue;
    const first = s.path[0];
    const px = xOf(first.on) - 1;
    if (px > w || xOf(s.end) < -40) continue;
    const third = s.path[Math.min(2, s.path.length - 1)];
    const past = (now - (third.on + third.dur)) / tps;
    const alpha = past <= 0 ? 1 : 1 - past / FLAG_FADE_S;
    if (alpha <= 0) continue;
    const word = `${tr("SUBJECT")}${s.theme ? ` ${s.theme}` : ""}`;
    const tw = textWidth(word);
    if (px + tw + 4 < 0) continue;
    const top = yOf(first.step);
    const bot = top + (c.hOf ? c.hOf(first.step) : bh);
    const fw = tw + 2;
    // Above: the flag 7 px high, its pole 2 px on to the note's top; else below.
    let fy = top - 9;
    let poleY = fy;
    let poleH = top - fy;
    // The flag hangs back from its pole, over the rest before the entry, so it never hides the entry's
    // own next notes; it flips forward only against the box's left edge.
    const fx0 = px - fw >= 0 ? px - fw : px + 1;
    if (fy < 0 || blocked(fx0, fx0 + fw, fy, top - 1, s.voice, first.on)) {
      fy = bot + 2;
      poleY = bot;
      poleH = 9;
      if (fy + 7 > h) {
        fy = Math.max(0, top - 9);
        poleY = fy;
        poleH = top - fy;
      }
    }
    g.globalAlpha = alpha;
    g.fillStyle = FLAG_BG;
    g.fillRect(px, poleY, 1, poleH);
    g.fillRect(fx0, fy, fw, 7);
    pixText(g, word, fx0 + 1, fy + 1, FLAG_INK);
  }
  g.globalAlpha = 1;
}

const FIRE_CORE = "#fff6dc";
/** D372: the effects' share of the frame: at most this many rectangles a pass (the player's, the others'). */
export const FX_RECTS = 700;
/** D372: a subject note ahead of the playhead shows its effect at this share; once over, it fades in FX_FADE_S. */
export const FX_AHEAD = 0.5;
export const FX_FADE_S = 0.8;
/** The widest stretch of a note that burns or smokes (px), so a long note costs no more than a crotchet. */
const FX_SPAN = 32;

const smokeMemo = new Map<string, string[]>();
/** A voice's subject smoke: its pale subject colour toward a cool grey. */
function smokeOf(voiceInk: string, theme: 1 | 2 | 3): string {
  let row = smokeMemo.get(voiceInk);
  if (!row) {
    row = ["", "", "", ""];
    for (const t of [1, 2, 3] as const) row[t] = mixHex(subjectRimOf(voiceInk, t), "#8f90a8", 0.45);
    smokeMemo.set(voiceInk, row);
  }
  return row[theme];
}
function mixHex(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/**
 * D372 (Mario's report §6): each subject's own effect, tinted from its voice's own subject colour (D368:
 * a blue soprano's fire burns blue-white, an orange alto's gold), on every subject note in view, each as
 * strong as its weight (subject-cast.ts: the head 1.0, a leap's landing 0.85, longer notes 0.7, quick
 * passing notes 0.35; another voice's at half), ahead of the playhead at FX_AHEAD, full while it sounds,
 * fading over FX_FADE_S once over. FIRE: flames lick up from the note's top in 2 px columns, the voice's
 * subject ink outside, its pale rim at the core, a spark now and then (12 flickers a second). GLINT: a
 * star flashes at each note's start as it sounds (bigger on the heavy notes), and a small one travels
 * from note to note over the entry. SMOKE: slow wisps rise and drift from the notes. Stateless (each
 * mark a function of the note and the clock), nothing allocated, at most FX_RECTS rectangles a pass.
 * `mine` picks the pass: the others' (drawn under the player's notes) or the player's (over them).
 * Never tied to right or wrong: a missed note burns as a hit one.
 */
export function subjectFx(c: Ctx, spans: readonly Span[], player: readonly number[], mine: boolean, piece: string | undefined, beat: number, t: number) {
  const { g, w, xOf, yOf, bh, now, tps } = c;
  let budget = FX_RECTS;
  const flick = Math.floor(t * 12);
  for (let si = 0; si < spans.length && budget > 0; si++) {
    const s = spans[si];
    if (s.form === "counter" || !s.path.length || player.includes(s.voice) !== mine) continue;
    if (xOf(s.on) > w || (now - s.end) / tps > FX_FADE_S) continue;
    const theme = themeOf(s);
    const fx = effectOf(piece, theme);
    const voiceInk = c.ink(s.voice);
    const ink = subjectInkOf(voiceInk, theme);
    const rim = subjectRimOf(voiceInk, theme);
    const wts = weightsOf(s, beat);
    const scale = mine ? 1 : OTHERS_SCALE;
    // GLINT's travelling star: one note of the entry at a time, seven a second.
    const travel = fx === "GLINT" ? Math.floor(t * 7 + s.on * 0.37) % s.path.length : -1;
    for (let j = 0; j < s.path.length && budget > 0; j++) {
      const n = s.path[j];
      const a = xOf(n.on);
      if (a > w + 2) break;
      const b = Math.max(a + 2, xOf(n.on + n.dur) - 1);
      if (b < -8) continue;
      const over = (now - (n.on + n.dur)) / tps;
      const env = now < n.on ? FX_AHEAD : over <= 0 ? 1 : 1 - over / FX_FADE_S;
      if (env <= 0) continue;
      const wt = wts[j] * scale;
      const full = (c.hOf ? c.hOf(n.step) : bh) === bh;
      // The note's top: the player's outline; another voice's thinner block, centred in its row.
      const top = mine || !full ? yOf(n.step) - (mine ? 1 : 0) : yOf(n.step) + Math.floor((bh - 1 - Math.max(1, Math.round(bh * 0.5))) / 2);
      const span = Math.min(b - a, FX_SPAN);
      if (fx === "FIRE") {
        // Tongues 1 px wide, two to a 2 px column: the voice's pale subject colour, a warm white core,
        // now and then a tip of the voice's subject ink above (so the flame still says whose).
        const hmax = 1.5 + 5.5 * wt;
        const seed = n.on * 0.013;
        const fl = flick + s.voice;
        g.globalAlpha = 0.3 + 0.6 * env;
        g.fillStyle = rim;
        for (let k = 0; k < span; k += 2) {
          const h1 = Math.round(hmax * (0.3 + 0.7 * rnd(seed + k, fl)));
          const h2 = Math.round(hmax * (0.2 + 0.6 * rnd(seed + k + 0.5, fl)));
          if (h1 > 0) g.fillRect(a + k, top - h1, 1, h1);
          if (h2 > 0) g.fillRect(a + k + 1, top - h2, 1, h2);
          budget -= 2;
        }
        g.fillStyle = FIRE_CORE;
        for (let k = 0; k < span; k += 2) {
          const core = Math.round(hmax * (0.3 + 0.7 * rnd(seed + k, fl)) * 0.4);
          if (core > 0) g.fillRect(a + k, top - core, 2, core);
          budget--;
        }
        g.fillStyle = ink;
        for (let k = 0; k < span; k += 2) {
          const r = rnd(seed + k, fl);
          if (r > 0.6 && wt >= 0.5) g.fillRect(a + k + (flick & 1), top - Math.round(hmax * (0.3 + 0.7 * r)) - 1 - (r > 0.9 ? 1 : 0), 1, 1);
          budget--;
        }
      } else if (fx === "SMOKE") {
        const wisps = 1 + Math.round(3 * wt);
        g.fillStyle = smokeOf(voiceInk, theme);
        for (let k = 0; k < wisps; k++) {
          const ph = (t / 2.4 + rnd(n.on * 0.01, k)) % 1;
          const x0 = a + 1 + rnd(k + 1.7, n.on * 0.01) * Math.max(1, span - 2);
          const rise = 10 + 14 * wt;
          for (let d = 0; d < 5; d++) {
            const u = ph - d * 0.035;
            if (u < 0) continue;
            g.globalAlpha = env * (1 - u) * (0.45 + 0.45 * wt);
            const sz = u < 0.3 && wt >= 0.7 ? 2 : 1;
            g.fillRect(Math.round(x0 + Math.sin(u * 7 + k * 1.3) * 2 + u * 5), Math.round(top - 1 - u * rise), sz, sz);
          }
          budget -= 5;
        }
      } else {
        // GLINT: the flash as the note sounds, then the travelling star.
        const since = (now - n.on) / tps;
        let r = 0;
        let alpha = 0;
        if (since >= 0 && since < 0.4) {
          r = Math.max(1, Math.round((1.5 + 3 * wt) * (1 - 0.6 * (since / 0.4)) + 0.4));
          alpha = 1;
        } else if (j === travel && over < 0) {
          r = wt >= 0.7 ? 3 : 2;
          alpha = 0.6 * env;
        }
        if (r > 0) {
          star(g, a + 1, top - 2, r, rim, alpha);
          budget -= 5;
        }
      }
    }
  }
  g.globalAlpha = 1;
}
/** A pixel star: a white heart, arms `r` long in `ink`, its diagonals where it is big. */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string, alpha: number) {
  g.globalAlpha = alpha;
  g.fillStyle = ink;
  g.fillRect(x - r, y, 2 * r + 1, 1);
  g.fillRect(x, y - r, 1, 2 * r + 1);
  if (r >= 3) {
    g.fillRect(x - 1, y - 1, 1, 1);
    g.fillRect(x + 1, y - 1, 1, 1);
    g.fillRect(x - 1, y + 1, 1, 1);
    g.fillRect(x + 1, y + 1, 1, 1);
  }
  g.fillStyle = "#ffffff";
  g.fillRect(x, y, 1, 1);
}

/** A colour (#rrggbb) mixed toward white by `k` (0..1), as an rgb() string. */
function lighten(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = (sh: number) => Math.round(((v >> sh) & 255) + (255 - ((v >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** D320: the embers a subject note throws up as it sounds (per note), how long each lives (s), and the most notes alight at once. D352: fewer from the others' notes (their voice raised says it already). */
const EMBERS = 10;
const EMBERS_OTHERS = 6;
const EMBER_LIFE = 0.95;
const MAX_ALIGHT = 36;
/** Cheap deterministic noise in [0, 1) for a note's embers (no state, no allocation: a note's fire is the same every frame). */
const rnd = (a: number, b: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * D208, D320: each subject note, as it sounds (in any voice, the player's too), catches fire: the note
 * itself brightens for a moment, and a few pixel embers rise from its top edge, flickering sideways,
 * from a white-hot core through a lightened tint of the voice's colour (warm gold for the player's)
 * to nothing over about a second (the owner: "a small fire rising and subsuming above them as they're
 * played and fade"). Stateless: each ember's place is a function of the note and its age (no pool to
 * keep, nothing to allocate); at most MAX_ALIGHT notes alight at once (the latest), 1-2 px rects, no
 * blur. Non-subject notes keep their plain look.
 */
export function strikes(c: Ctx, spans: Span[], player: number[] = []) {
  const { g, w, xOf, yOf, bh, now, tps } = c;
  const life = EMBER_LIFE + (EMBERS - 1) * 0.04;
  let alight = 0;
  for (const s of spans) {
    if (s.form === "counter" || now < s.on || now > s.end + life * tps) continue;
    const mine = player.includes(s.voice);
    // D352, D368: the fire in the voice's own subject colour.
    const ink = subjectRimOf(c.ink(s.voice), themeOf(s));
    const warm = lighten(ink, 0.5);
    const embers = mine ? EMBERS : EMBERS_OTHERS;
    for (let j = s.path.length - 1; j >= 0; j--) {
      const n = s.path[j];
      const since = (now - n.on) / tps;
      if (since < 0) continue;
      if (since > life) break;
      if (++alight > MAX_ALIGHT) return void (g.globalAlpha = 1);
      const a = xOf(n.on);
      const b = Math.max(a + 2, xOf(n.on + n.dur));
      if (b < -4 || a > w + 4) continue;
      const y = yOf(n.step);
      const nh = c.hOf ? c.hOf(n.step) : bh;
      // The note lit: a short white-hot glow over it, then its tint.
      if (since < 0.25) {
        const q = since / 0.25;
        g.globalAlpha = 0.75 * (1 - q);
        g.fillStyle = "#fff6d8";
        g.fillRect(a, y, b - a, nh);
        g.globalAlpha = 0.35 * (1 - q);
        g.fillStyle = warm;
        g.fillRect(a - 1, y - 1, b - a + 2, nh + 2);
      }
      // The embers, born one after another from along the note's top (its first 30 px), rising.
      // A low glow over the note while the fire is young (the flame's foot).
      const span = Math.min(b - a, 30);
      if (since < 0.6) {
        g.globalAlpha = 0.28 * (1 - since / 0.6);
        g.fillStyle = warm;
        g.fillRect(a, y - 3, Math.min(b - a, 30), 3);
      }
      for (let k = 0; k < embers; k++) {
        const age = since - k * 0.04;
        if (age < 0) continue;
        const r1 = rnd(n.on + s.voice * 0.37, k);
        const r2 = rnd(k + 0.5, n.on * 0.11 + s.voice);
        const life1 = EMBER_LIFE * (0.6 + 0.4 * r1);
        if (age > life1) continue;
        const u = age / life1;
        const rise = (12 + 18 * r2) * age + 8 * age * age;
        const x = a + 1 + r1 * Math.max(1, span - 2) + Math.sin(age * 11 + r2 * 6.3) * (0.6 + 1.6 * u);
        const yy = y - 1 - rise;
        g.globalAlpha = Math.max(0, 1 - u * u) * 0.95;
        g.fillStyle = u < 0.22 ? "#fffbe6" : u < 0.55 ? warm : ink;
        const sz = u < 0.5 && r2 > 0.2 ? 2 : 1;
        g.fillRect(Math.round(x), Math.round(yy), sz, sz);
      }
    }
  }
  g.globalAlpha = 1;
}

/** The player's bosses: while one is near or sounding, its notes as a bar along the top, the box tinted. */
export function bossBar(c: Ctx, spans: Span[], voice: number, notes: { on: number; state: string; ride?: boolean }[]) {
  const mine = spans.filter((s) => s.voice === voice);
  const near = mine.find((s) => c.now >= s.on - (s.end - s.on) * 0.25 && c.now < s.end + 0.0001);
  if (!near) return;
  const boss = near === mine.at(-1);
  const color = boss ? "#ff5a4f" : "#c78bff";
  const { g, w, h } = c;
  g.globalAlpha = boss ? 0.1 : 0.07;
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  const ons = new Set(near.path.map((n) => n.on));
  const heads = notes.filter((n, i) => ons.has(n.on) && !n.ride && !(i > 0 && notes[i - 1].on === n.on));
  const label = boss ? "BOSS" : "SUB BOSS";
  const x0 = 4;
  pixText(g, label, x0, 3, color);
  const seg = Math.max(2, Math.min(8, Math.floor((w * 0.5) / Math.max(1, heads.length))));
  const bx = x0 + textWidth(label) + 4;
  heads.forEach((n, i) => {
    g.fillStyle = n.state === "hit" ? "#2a2232" : n.state === "miss" ? c.miss : color;
    g.fillRect(bx + i * seg, 3, seg - 1, 5);
  });
}

/** Points rising from the notes struck; captured entries bursting. */
export function sparks(c: Ctx, pops: Pop[], bursts: Burst[]) {
  const { g, xOf, yOf } = c;
  const t = performance.now();
  for (const p of pops) {
    const age = t - p.at;
    if (age > 700) continue;
    g.globalAlpha = 1 - age / 700;
    if (p.from) {
      // D218: a slur over the two notes joined, then the word over it.
      const x1 = xOf(p.from.tick);
      const x2 = xOf(p.tick);
      const base = Math.min(yOf(p.from.step), yOf(p.step)) - 4;
      const lift = Math.max(3, Math.min(8, (x2 - x1) / 4));
      g.fillStyle = p.ink ?? c.fg;
      for (let x = Math.round(x1); x <= x2; x++) {
        const u = (x - x1) / Math.max(1, x2 - x1);
        const y = yOf(p.from.step) + (yOf(p.step) - yOf(p.from.step)) * u;
        g.fillRect(x, Math.round(Math.min(y - 4, base) - lift * 4 * u * (1 - u)), 1, 1);
      }
      pixText(g, p.text, (x1 + x2) / 2 - (p.text.length * 4) / 2, base - lift - 7 - age / 60, p.ink ?? c.fg);
      continue;
    }
    pixText(g, p.text, xOf(p.tick) - 2, yOf(p.step) - 8 - age / 40, p.ink ?? (p.gold ? c.gold : c.fg));
  }
  for (const b of bursts) {
    const age = (t - b.at) / 1000;
    if (age > 1.1) continue;
    g.globalAlpha = Math.max(0, 1 - age / 1.1);
    g.fillStyle = b.boss ? "#ff8c4a" : c.gold;
    b.points.forEach((p, i) => {
      for (let k = 0; k < (b.boss ? 6 : 4); k++) {
        const ang = (i * 7 + k * 2.4) % (Math.PI * 2);
        const v = 18 + ((i * 13 + k * 5) % 17);
        const x = xOf(p.tick) + Math.cos(ang) * v * age * 2;
        const y = yOf(p.step) + Math.sin(ang) * v * age * 2 + 30 * age * age;
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    });
  }
  g.globalAlpha = 1;
}

/** The zone the player is in: a glow at the box's edges (ORGANO PLENO gold, CON FUOCO ember). */
export function zoneGlow(c: Ctx, zone: "pleno" | "fuoco" | null) {
  if (!zone) return;
  const { g, w, h } = c;
  const t = performance.now();
  const color = zone === "pleno" ? "255,214,110" : "255,120,60";
  const pulse = 0.5 + 0.5 * Math.sin(t / (zone === "pleno" ? 400 : 160));
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(${color},${(0.16 - i * 0.025) * (0.7 + 0.3 * pulse)})`;
    g.fillRect(i, i, w - 2 * i, 1);
    g.fillRect(i, h - 1 - i, w - 2 * i, 1);
    g.fillRect(i, i, 1, h - 2 * i);
    g.fillRect(w - 1 - i, i, 1, h - 2 * i);
  }
}

/**
 * D194, the cadences (D208: a tick on the timeline): each coming one a short gold tick at the foot of
 * the box, named beside it ("PERFECT CADENCE · G MINOR"); as it is reached, the tick flares.
 */
export function cadenceMarks(c: Ctx, cadences: { on: number; text: string }[]) {
  const { g, w, h, xOf, now } = c;
  for (const cd of cadences) {
    const x = xOf(cd.on);
    if (x < -40 || x > w) continue;
    const since = ((now - cd.on) / c.tps) * 1000;
    if (since > 1400) continue;
    const flare = since >= 0 ? 1 - since / 1400 : 0;
    g.globalAlpha = since >= 0 ? 0.4 + 0.6 * flare : 0.8;
    g.fillStyle = c.gold;
    g.fillRect(x, h - 12, 1, 12);
    g.fillRect(x - 1, h - 12, 3, 1);
    if (flare > 0) {
      g.globalAlpha = 0.3 * flare;
      g.fillRect(x - 2, h - 16, 5, 16);
    }
    g.globalAlpha = since >= 0 ? flare : 0.7;
    pixText(g, cd.text, Math.min(x + 3, w - textWidth(cd.text) - 2), h - 8, c.gold);
  }
  g.globalAlpha = 1;
}
