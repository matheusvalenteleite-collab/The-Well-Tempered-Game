/**
 * The music box's events (D186; D208): the subject drawn as the character it is, the bosses, and what
 * the player's playing throws up. Drawn on the box's own pixels (half the screen's), in a 3 by 5 font.
 *   Each subject entry (D320): a soft shaded band behind it, first note to last, in a light tint of
 *   its colour, its word small at its top left ("SUBJECT"; STRETTO when it begins inside another);
 *   fainter while announced; each of its notes catches fire as it sounds (embers rising). Gold for
 *   the player's voice (and once captured), the voice's ink for the others, grey once
 *   lost. The countersubject is not marked.
 *   The bosses (not in LADDER): while one is near, a bar of its notes along the top.
 *   Points rise from the note struck; a captured entry bursts into pixels.
 */
import { tr, trCanvas } from "../i18n/index.ts";

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
 * The entries (D208; D314 the Cantus style; D320 the owner: "that style which creates a different shade
 * background throughout the subject … What you gave me was that awkward dotted line above it, which is
 * not helpful at all and clutters"). The subject only (no countersubject marks). Each entry on a soft
 * SHADED BAND from its first note to its last: a rectangle over the rows its notes take (a row of room
 * above and below), in a lightened tint of its colour at low alpha, its corners cut, a lighter hairline
 * along its top and bottom; announced (still ahead) at half that. The word ("SUBJECT", its shape,
 * STRETTO when it begins inside another) small at the band's top left, leaving with its start (not
 * kept in sight over the music). No bracket, no dashes, no breath mark, no counted beats (D314's, gone).
 * Gold for the player's voice (and once captured), the voice's ink for the others, grey once lost.
 * Drawn under the notes; `strikes` (over them) sets each of its notes alight as it sounds.
 */
export function ribbons(c: Ctx, spans: Span[], player: number[], names: string[] | undefined, state: Map<string, string> | undefined, beat = 0) {
  const { g, w, h, xOf, yOf, bh, now } = c;
  void names;
  void beat;
  const subj = spans.filter((s) => s.form !== "counter");
  const hOf = (step: number) => (c.hOf ? c.hOf(step) : bh);
  for (const s of subj) {
    if (!s.path.length) continue;
    const x1 = xOf(s.on);
    const x2 = xOf(s.end);
    if (x1 > w || x2 < 0) continue;
    const st = state?.get(`${s.voice}:${s.on}`);
    const mine = player.includes(s.voice);
    const color = st === "lost" ? c.miss : mine || st === "captured" ? c.gold : c.ink(s.voice);
    const tint = lighten(color, 0.35);
    const ahead = now < s.on;
    let top = Infinity;
    let bot = -Infinity;
    for (const n of s.path) {
      top = Math.min(top, yOf(n.step));
      bot = Math.max(bot, yOf(n.step) + hOf(n.step));
    }
    const pad = Math.max(2, Math.round(bh * 0.8));
    const a = Math.max(-2, x1 - 2);
    const z = Math.min(w + 2, x2 + 1);
    const y0 = Math.max(0, top - pad);
    const y1 = Math.min(h, bot + pad);
    const bw = z - a;
    const bhh = y1 - y0;
    if (bw <= 2 || bhh <= 2) continue;
    const k = ahead ? 0.5 : 1;
    g.fillStyle = tint;
    // The band, its corners cut (a pixel's rounding).
    g.globalAlpha = 0.15 * k;
    g.fillRect(a + 1, y0, bw - 2, 1);
    g.fillRect(a, y0 + 1, bw, bhh - 2);
    g.fillRect(a + 1, y1 - 1, bw - 2, 1);
    // A lighter hairline along its top and bottom (where the band begins and ends in height).
    g.globalAlpha = 0.22 * k;
    g.fillRect(a + 2, y0, bw - 4, 1);
    g.fillRect(a + 2, y1 - 1, bw - 4, 1);
    g.globalAlpha = 1;
    // The word, small, at the band's top left (inside it when there is no room above).
    const stretto = subj.some((o) => o !== s && o.voice !== s.voice && s.on > o.on && s.on < o.end);
    // D265: every entry a SUBJECT; D283: in the language chosen.
    const word = `${tr("SUBJECT")}${s.theme ? ` ${s.theme}` : ""}${s.shape ? ` · ${trCanvas(s.shape)}` : ""}${stretto ? " · STRETTO" : ""}`;
    const tw = textWidth(word);
    // At the band's start only: it leaves with the start (not kept in sight over the music).
    const lx = x1 + 1;
    if (lx + tw < 0) continue;
    const ly = y0 >= 8 ? y0 - 7 : y0 + 2;
    g.globalAlpha = (ahead ? 0.55 : 0.85) * (lx + tw > z ? 0.6 : 1);
    pixText(g, word, lx, ly, color);
    g.globalAlpha = 1;
  }
}

/** A colour (#rrggbb) mixed toward white by `k` (0..1), as an rgb() string. */
function lighten(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = (sh: number) => Math.round(((v >> sh) & 255) + (255 - ((v >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** D320: the embers a subject note throws up as it sounds (per note), how long each lives (s), and the most notes alight at once. */
const EMBERS = 10;
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
    const ink = mine ? c.gold : c.ink(s.voice);
    const warm = mine ? "#ffe9a0" : lighten(ink, 0.5);
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
      for (let k = 0; k < EMBERS; k++) {
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
