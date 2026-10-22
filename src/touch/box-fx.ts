/**
 * The music box's events (D186): the subject drawn as the character it is, the bosses, and what the
 * player's playing throws up. Drawn on the box's own pixels (half the screen's), in a 3 by 5 font.
 *   Each entry: a halo under its notes and a line through them (the subject's shape, the same each
 *   time, mirrored when inverted, stretched when augmented), a tag where it begins ("SUBJECT · ALTO ·
 *   G MINOR"), a stop where it ends; while it sounds it shimmers. Gold for the player's voice (and
 *   once captured), the voice's ink for the others, grey once lost. Two entries overlapping: STRETTO,
 *   a brace between them.
 *   The bosses (the player's entries: the last the BOSS, the others SUB BOSSES): while one is near, a
 *   bar of its notes along the top, each struck note knocked out; the box tinted.
 *   Points rise from the note struck; a captured entry bursts into pixels.
 */

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
};

/** Text in the 3 by 5 font; returns its width. */
export function pixText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1): number {
  g.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++) if (glyph[i] === "1") g.fillRect(cx + (i % 3) * scale, Math.round(y) + Math.floor(i / 3) * scale, scale, scale);
    cx += 4 * scale;
  }
  return cx - x;
}
export const textWidth = (text: string, scale = 1) => text.length * 4 * scale;

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
  bh: number;
  now: number;
  tps: number;
  gold: string;
  miss: string;
  fg: string;
  ink: (voice: number) => string;
}

/** The entries: halo, line, tag, stop; stretto braces. Drawn under the notes. */
export function ribbons(c: Ctx, spans: Span[], player: number[], names: string[] | undefined, state: Map<string, string> | undefined) {
  const { g, w, xOf, yOf, bh, now } = c;
  const t = performance.now();
  for (const s of spans) {
    const x1 = xOf(s.on);
    const x2 = xOf(s.end);
    if (x2 < 0 || x1 > w) continue;
    const st = state?.get(`${s.voice}:${s.on}`);
    const mine = player.includes(s.voice);
    const counter = s.form === "counter";
    const color = counter ? "#c9d1dc" : st === "lost" ? c.miss : mine || st === "captured" ? c.gold : c.ink(s.voice);
    const sounding = now >= s.on && now < s.end;
    // The halo: under each note, a little wider; shimmering while it sounds.
    g.globalAlpha = counter ? (sounding ? 0.16 : 0.08) : sounding ? 0.28 + 0.12 * Math.sin(t / 90) : 0.16;
    g.fillStyle = color;
    for (const n of s.path) {
      const a = xOf(n.on);
      const b = xOf(n.on + n.dur);
      if (b < 0 || a > w) continue;
      g.fillRect(a - 2, yOf(n.step) - 2, Math.max(2, b - a + 3), bh + 3);
    }
    // The line through it: the subject's shape.
    g.globalAlpha = 0.9;
    let prev: { x: number; y: number } | null = null;
    for (const n of s.path) {
      const a = xOf(n.on);
      const y = yOf(n.step) + Math.floor(bh / 2);
      if (prev) {
        g.fillRect(Math.min(prev.x, a), y, Math.max(1, Math.abs(a - prev.x)), 1);
        g.fillRect(a, Math.min(prev.y, y), 1, Math.abs(y - prev.y) + 1);
      }
      prev = { x: a, y };
    }
    const last = s.path.at(-1);
    if (last && prev) g.fillRect(prev.x, prev.y, Math.max(1, xOf(last.on + last.dur) - prev.x), 1);
    // The stop: a short upright where it ends.
    if (last) g.fillRect(x2, yOf(last.step) - 3, 1, bh + 6);
    // The tag, over its first note.
    const first = s.path[0];
    if (first) {
      const y = yOf(first.step) - 9;
      const voice = names?.[s.voice]?.toUpperCase() ?? "";
      const what = counter ? "COUNTERSUBJECT" : `${s.form === "answer" ? "ANSWER" : "SUBJECT"}${s.theme ? ` ${s.theme}` : ""}`;
      const label = counter ? `${what} · ${voice}` : `${what}${s.shape ? ` · ${s.shape}` : ""} · ${voice} · ${keyWords(s.key)}`;
      g.globalAlpha = 0.8;
      g.fillStyle = "#0c0a10";
      g.fillRect(x1 - 1, y - 1, textWidth(label) + 1, 7);
      g.globalAlpha = 1;
      pixText(g, label, x1, y, color);
      // The head: a pennant at the start.
      g.fillRect(x1, y + 6, 1, yOf(first.step) - y - 6);
    }
    g.globalAlpha = 1;
  }
  // Stretto: an entry beginning before another has ended; a brace from one to the other.
  for (let i = 0; i < spans.length; i++)
    for (let j = 0; j < spans.length; j++) {
      const a = spans[i];
      const b = spans[j];
      if (!(b.on > a.on && b.on < a.end) || a.voice === b.voice || a.form === "counter" || b.form === "counter") continue;
      const x = xOf(b.on) - 3;
      if (x < 0 || x > w) continue;
      const y1 = Math.min(yOf(a.path[0].step), yOf(b.path[0].step));
      const y2 = Math.max(yOf(a.path[0].step), yOf(b.path[0].step)) + bh;
      g.fillStyle = "#ff8c4a";
      g.fillRect(x, y1, 1, y2 - y1);
      g.fillRect(x, y1, 2, 1);
      g.fillRect(x, y2, 2, 1);
      pixText(g, "STRETTO", x - 30, y2 + 2, "#ff8c4a");
    }
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
    pixText(g, p.text, xOf(p.tick) - 2, yOf(p.step) - 8 - age / 40, p.gold ? c.gold : c.fg);
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
 * D194, the cadences: each coming one a dotted gold line, named at the top ("PERFECT CADENCE · G
 * MINOR"); as it is reached, the line flares and the name brightens for a moment.
 */
export function cadenceMarks(c: Ctx, cadences: { on: number; text: string }[]) {
  const { g, w, h, xOf, now } = c;
  for (const cd of cadences) {
    const x = xOf(cd.on);
    if (x < -40 || x > w) continue;
    const since = ((now - cd.on) / c.tps) * 1000;
    if (since > 1400) continue;
    const flare = since >= 0 ? 1 - since / 1400 : 0;
    g.globalAlpha = 0.35 + 0.65 * flare;
    g.fillStyle = c.gold;
    for (let y = 10; y < h; y += 3) g.fillRect(x, y, 1, 1);
    if (flare > 0) {
      g.globalAlpha = 0.25 * flare;
      g.fillRect(x - 3, 0, 7, h);
    }
    g.globalAlpha = since >= 0 ? flare : 0.7;
    pixText(g, cd.text, Math.min(x + 2, w - textWidth(cd.text) - 2), h - 8, c.gold);
  }
  g.globalAlpha = 1;
}
