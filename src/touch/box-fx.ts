/**
 * The music box's events (D186; D208): the subject drawn as the character it is, the bosses, and what
 * the player's playing throws up. Drawn on the box's own pixels (half the screen's), in a 3 by 5 font.
 *   Each subject entry: a translucent trail through its notes, its tag where it begins ("SUBJECT ·
 *   ALTO · G MINOR"; STRETTO when it begins inside another); each of its notes flashes as it is
 *   played. Gold for the player's voice (and once captured), the voice's ink for the others, grey once
 *   lost. The countersubject is not marked.
 *   The bosses (not in LADDER): while one is near, a bar of its notes along the top.
 *   Points rise from the note struck; a captured entry bursts into pixels.
 */
import { keyWordsIn, tr, trCanvas, voiceName } from "../i18n/index.ts";

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
};

/** Text in the 3 by 5 font; returns its width. */
export function pixText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1): number {
  g.fillStyle = color;
  let cx = Math.round(x);
  // D283: the 3 by 5 font has no accents: Á É Ç Ñ drawn as A E C N.
  // D283: every word drawn in the box in the language chosen (the cadences, the points' words).
  for (const ch of trCanvas(text.toUpperCase()).normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
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
 * The entries (D208): the subject only (no countersubject marks). Each entry a translucent trail in its
 * voice's colour, passing continuously through all its notes (along each note, sloping from one to
 * the next); brighter while it sounds; its tag over its first note ("SUBJECT · ALTO · G MINOR", and
 * STRETTO when it begins inside another's). Drawn under the notes; `strikes` (over them) flashes each
 * of its notes as it is played.
 */
export function ribbons(c: Ctx, spans: Span[], player: number[], names: string[] | undefined, state: Map<string, string> | undefined) {
  const { g, w, xOf, yOf, bh, now } = c;
  const subj = spans.filter((s) => s.form !== "counter");
  for (const s of subj) {
    const x1 = xOf(s.on);
    const x2 = xOf(s.end);
    if (x2 < 0 || x1 > w || !s.path.length) continue;
    const st = state?.get(`${s.voice}:${s.on}`);
    const mine = player.includes(s.voice);
    const color = st === "lost" ? c.miss : mine || st === "captured" ? c.gold : c.ink(s.voice);
    const sounding = now >= s.on && now < s.end;
    // The trail: one continuous band through the notes' middles.
    g.save();
    g.globalAlpha = sounding ? 0.3 : 0.17;
    g.strokeStyle = color;
    // In the squeezed margins (D211) the trail as thin as the notes there.
    const th = c.hOf ? Math.min(...s.path.map((n) => c.hOf!(n.step))) : bh;
    g.lineWidth = th < bh ? th + 2 : bh + 7;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.beginPath();
    s.path.forEach((n, k) => {
      const y = yOf(n.step) + (c.hOf ? c.hOf(n.step) : bh) / 2;
      const a = xOf(n.on);
      const b = xOf(n.on + n.dur);
      if (k === 0) g.moveTo(a, y);
      else g.lineTo(a, y);
      g.lineTo(Math.max(a + 1, b - 1), y);
    });
    g.stroke();
    g.restore();
    // The tag, over its first note.
    const first = s.path[0];
    const y = Math.max(1, yOf(first.step) - 9);
    const voice = names?.[s.voice] ? voiceName(names[s.voice]) : "";
    const stretto = subj.some((o) => o !== s && o.voice !== s.voice && s.on > o.on && s.on < o.end);
    // D265: every entry a SUBJECT (the owner: "stop calling the subject answers \"answers\"").
    // D283: in the language chosen.
    const what = `${tr("SUBJECT")}${s.theme ? ` ${s.theme}` : ""}`;
    const label = `${what}${s.shape ? ` · ${trCanvas(s.shape)}` : ""} · ${voice} · ${keyWordsIn(s.key)}${stretto ? " · STRETTO" : ""}`;
    g.globalAlpha = 0.7;
    g.fillStyle = "#0c0a10";
    g.fillRect(x1 - 1, y - 1, textWidth(label) + 1, 7);
    g.globalAlpha = 1;
    pixText(g, label, x1, y, color);
  }
  g.globalAlpha = 1;
}

/** D208: each subject note, as it is played (in any voice), strikes: a bright flash swelling out from it. */
export function strikes(c: Ctx, spans: Span[]) {
  const { g, w, xOf, yOf, bh, now, tps } = c;
  for (const s of spans) {
    if (s.form === "counter" || now < s.on || now > s.end + tps) continue;
    for (const n of s.path) {
      const since = (now - n.on) / tps;
      if (since < 0 || since > 0.32) continue;
      const a = xOf(n.on);
      const b = Math.max(a + 2, xOf(n.on + n.dur));
      if (b < 0 || a > w) continue;
      const k = since / 0.32;
      const grow = Math.round(1 + k * 5);
      const y = yOf(n.step);
      const nh = c.hOf ? c.hOf(n.step) : bh;
      g.globalAlpha = 0.9 * (1 - k);
      g.fillStyle = "#fff6d0";
      g.fillRect(a, y, b - a, nh);
      g.strokeStyle = c.gold;
      g.lineWidth = 1;
      g.strokeRect(a - grow + 0.5, y - grow + 0.5, b - a + 2 * grow - 1, nh + 2 * grow - 1);
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
