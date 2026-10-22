/**
 * The testbench's six instruments (D170): six ways for two thumbs to play one monophonic voice, to be
 * tried in free play before the game commits to one. Each takes the touches (shares of its area: x, y
 * from 0 to 1, y at the top) and steers the voice (mono.ts), and draws itself. They share a scale (D
 * minor, both forms of the sixth and seventh: Contrapunctus XIV's) and a range (the voice taken).
 *
 * 1 THEREMIN: the right thumb is the pitch (its height, gliding, settling in tune when still); the left
 *   thumb is the sound (down: on; its height: how loud; a new tap: a new note).
 * 2 BOW: the left thumb stops the string (rows of notes); the right thumb is the bow: the note sounds
 *   while it moves, as loud as it is fast; a quick tap plucks.
 * 3 POSITIONS: the right thumb has five keys, five notes of the scale; the left thumb moves the hand
 *   (four positions), as a pianist's hand shifts.
 * 4 DIAL: the right thumb turns a wheel, a step of the scale for each notch; the left thumb sounds the
 *   note (down: on, up: off); turning while it is down slurs.
 * 5 HOME & ORNAMENT: the same rows under both thumbs; the first thumb down holds the home note, the
 *   other's taps sound neighbours that fall back to it (mordents, trills, appoggiaturas).
 * 6 KEYBED (sideways): a piano keyboard; slide for a glissando, drag up on a key to bend.
 */
import type { Mono } from "./mono.ts";

/** D minor with both forms of the sixth and seventh: C, C sharp, D, E, F, G, A, B flat, B. */
const PCS = new Set([0, 1, 2, 4, 5, 7, 9, 10, 11]);
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
export const noteName = (m: number) => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

/** The scale's notes from lo to hi. */
export function scaleNotes(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = Math.ceil(lo); m <= hi; m++) if (PCS.has(m % 12)) out.push(m);
  return out;
}
const nearestIn = (notes: number[], m: number) => notes.reduce((b, n) => (Math.abs(n - m) < Math.abs(b - m) ? n : b), notes[0]);

export interface Touch {
  x: number;
  y: number;
  /** Where it landed, and when (seconds). */
  x0: number;
  y0: number;
  t0: number;
}

export interface Instrument {
  id: string;
  name: string;
  how: string;
  /** Played with the phone sideways. */
  landscape?: boolean;
  down(id: number, t: Touch): void;
  move(id: number, t: Touch, dt: number): void;
  up(id: number, t: Touch): void;
  /** Called every frame (seconds since the last), for what changes by itself. */
  tick?(dt: number): void;
  draw(g: CanvasRenderingContext2D, w: number, h: number, ink: Ink): void;
}

export interface Ink {
  fg: string;
  muted: string;
  grid: string;
  shine: string;
  voice: string;
  font: string;
}

export type Range = { lo: number; hi: number };
export type Maker = (v: Mono, r: Range) => Instrument;

const left = (t: Touch) => t.x0 < 0.5;

/** Rows of notes, lowest at the bottom, in a band of the area. */
function drawRows(g: CanvasRenderingContext2D, notes: number[], x0: number, x1: number, h: number, ink: Ink, lit: number | null, labelRight = false) {
  const rh = h / notes.length;
  notes.forEach((m, i) => {
    const y = h - (i + 1) * rh;
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.01)";
    g.fillRect(x0, y, x1 - x0, rh);
    if (m % 12 === 2) {
      g.fillStyle = ink.muted;
      g.globalAlpha = 0.5;
      g.fillRect(x0, y + rh - 1, x1 - x0, 1);
      g.globalAlpha = 1;
    }
    if (lit === m) {
      g.fillStyle = ink.voice;
      g.globalAlpha = 0.45;
      g.fillRect(x0, y, x1 - x0, rh);
      g.globalAlpha = 1;
    }
    g.fillStyle = ink.grid;
    g.fillRect(x0, y, x1 - x0, 1);
    g.fillStyle = ink.muted;
    g.font = `${Math.max(6, Math.min(9, Math.floor(rh / 3)))}px ${ink.font}`;
    g.textBaseline = "middle";
    g.textAlign = labelRight ? "right" : "left";
    g.fillText(noteName(m), labelRight ? x1 - 5 : x0 + 5, y + rh / 2);
  });
}
const rowOf = (notes: number[], y: number) => notes[Math.max(0, Math.min(notes.length - 1, notes.length - 1 - Math.floor(y * notes.length)))];

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, ink: Ink, align: CanvasTextAlign = "center") {
  g.fillStyle = ink.muted;
  g.font = `7px ${ink.font}`;
  g.textAlign = align;
  g.textBaseline = "top";
  g.fillText(text, x, y);
}

/** 1: the theremin. */
export const theremin: Maker = (v, r) => {
  const notes = scaleNotes(r.lo, r.hi);
  const lo = r.lo - 0.5;
  const hi = r.hi + 0.5;
  let pitchId: number | null = null;
  let gateId: number | null = null;
  let raw = (lo + hi) / 2;
  let speed = 0;
  let gateY = 0.3;
  const levelOf = (y: number) => 0.25 + 0.75 * (1 - y);
  const pitchOf = (y: number) => hi - y * (hi - lo);
  /** Almost in tune: the pitch settles on the nearest note when the thumb is still, glides when it moves. */
  const tuned = () => {
    const n = nearestIn(notes, raw);
    const pull = Math.max(0, 1 - speed / 6);
    return raw + (n - raw) * pull;
  };
  return {
    id: "theremin",
    name: "THEREMIN",
    how: "Right thumb: the pitch, by its height (glide, it settles in tune). Left thumb: the sound (down on, its height the volume, tap again for a new note).",
    down(id, t) {
      if (left(t)) {
        gateId = id;
        gateY = t.y;
        v.setPitch(tuned());
        v.attack(levelOf(t.y));
      } else {
        pitchId = id;
        raw = pitchOf(t.y);
        v.setPitch(tuned());
      }
    },
    move(id, t, dt) {
      if (id === gateId) {
        gateY = t.y;
        v.setLevel(levelOf(t.y));
      } else if (id === pitchId) {
        const next = pitchOf(t.y);
        speed = speed * 0.7 + (Math.abs(next - raw) / Math.max(dt, 0.008)) * 0.3;
        raw = next;
        v.setPitch(tuned(), 0.02);
      }
    },
    up(id) {
      if (id === gateId) (gateId = null), v.release(0.08);
      if (id === pitchId) pitchId = null;
    },
    tick() {
      speed *= 0.85;
      if (pitchId !== null) v.setPitch(tuned(), 0.04);
    },
    draw(g, w, h, ink) {
      // The pitch strip: the scale's notes as lines, D's brighter.
      for (const m of notes) {
        const y = ((hi - m) / (hi - lo)) * h;
        g.fillStyle = m % 12 === 2 ? ink.muted : ink.grid;
        g.fillRect(w / 2, Math.round(y), w / 2, 1);
        g.fillStyle = ink.muted;
        g.font = `7px ${ink.font}`;
        g.textAlign = "right";
        g.textBaseline = "middle";
        g.fillText(noteName(m), w - 5, y);
      }
      const y = ((hi - v.pitch) / (hi - lo)) * h;
      g.fillStyle = ink.voice;
      g.globalAlpha = v.on ? 0.9 : 0.35;
      g.fillRect(w / 2, y - 3, w / 2, 6);
      g.globalAlpha = 1;
      // The volume: a bar the height of the left thumb.
      g.fillStyle = ink.grid;
      g.fillRect(w / 2 - 1, 0, 2, h);
      if (gateId !== null) {
        g.fillStyle = ink.shine;
        g.globalAlpha = 0.3;
        g.fillRect(0, gateY * h, w / 2, h - gateY * h);
        g.globalAlpha = 1;
      }
      label(g, "SOUND · VOLUME", w / 4, 8, ink);
      label(g, "PITCH", (3 * w) / 4, 8, ink);
    },
  };
};

/** 2: the bow. */
export const bow: Maker = (v, r) => {
  const notes = scaleNotes(r.lo, r.hi);
  let stopId: number | null = null;
  let bowId: number | null = null;
  let stopped = notes[Math.floor(notes.length / 2)];
  let bowSpeed = 0;
  let still = 0;
  let lastY = 0;
  return {
    id: "bow",
    name: "BOW",
    how: "Left thumb: stop the string on a note (slide for a portamento). Right thumb: the bow; the note sounds while it moves, louder as it goes faster; a quick tap plucks.",
    down(id, t) {
      if (left(t)) {
        stopId = id;
        stopped = rowOf(notes, t.y);
        v.setPitch(stopped, 0.03);
      } else {
        bowId = id;
        lastY = t.y;
        still = 0;
        bowSpeed = 0;
        v.setPitch(stopped);
      }
    },
    move(id, t, dt) {
      if (id === stopId) {
        const m = rowOf(notes, t.y);
        if (m !== stopped) (stopped = m), v.setPitch(m, 0.06);
      } else if (id === bowId) {
        const sp = Math.abs(t.y - lastY) / Math.max(dt, 0.008);
        lastY = t.y;
        bowSpeed = bowSpeed * 0.6 + sp * 0.4;
        still = 0;
        const level = Math.min(1, bowSpeed / 1.2);
        if (!v.on && level > 0.08) v.attack(level);
        else v.setLevel(level, 0.05);
      }
    },
    up(id, t) {
      if (id === stopId) stopId = null;
      if (id === bowId) {
        bowId = null;
        const tap = performance.now() / 1000 - t.t0 < 0.18 && Math.abs(t.y - t.y0) < 0.03;
        if (tap) v.pluck(0.9);
        else v.release(0.15);
      }
    },
    tick(dt) {
      if (bowId === null) return;
      still += dt;
      if (still > 0.08) {
        bowSpeed *= 0.8;
        v.setLevel(Math.min(1, bowSpeed / 1.2), 0.08);
      }
    },
    draw(g, w, h, ink) {
      drawRows(g, notes, 0, w / 2, h, ink, stopId !== null ? stopped : null);
      g.fillStyle = ink.grid;
      g.fillRect(w / 2 - 1, 0, 2, h);
      // The string, and the bow's speed as its glow.
      g.fillStyle = ink.voice;
      g.globalAlpha = 0.25 + 0.75 * Math.min(1, v.on ? v.level : 0);
      g.fillRect((3 * w) / 4 - 2, 0, 4, h);
      g.globalAlpha = 1;
      label(g, "STRING", w / 4, 8, ink);
      label(g, "BOW ↕", (3 * w) / 4, 8, ink);
    },
  };
};

/** 3: hand positions. */
export const positions: Maker = (v, r) => {
  const all = scaleNotes(r.lo - 2, r.hi + 2);
  const KEYS = 5;
  const POSITIONS = 4;
  const span = Math.max(0, all.length - KEYS);
  const baseOf = (p: number) => Math.round((p * span) / (POSITIONS - 1));
  let pos = 1;
  const keyIds = new Map<number, number>();
  const fingers = () => all.slice(baseOf(pos), baseOf(pos) + KEYS);
  const keyAt = (y: number) => Math.max(0, Math.min(KEYS - 1, KEYS - 1 - Math.floor(y * KEYS)));
  return {
    id: "positions",
    name: "POSITIONS",
    how: "Right thumb: five keys, five notes (tap, hold, slide to slur). Left thumb: move the hand up or down (four positions); it stays where you put it.",
    down(id, t) {
      if (left(t)) {
        pos = Math.max(0, Math.min(POSITIONS - 1, POSITIONS - 1 - Math.floor(t.y * POSITIONS)));
        return;
      }
      const k = keyAt(t.y);
      keyIds.set(id, k);
      v.setPitch(fingers()[k]);
      v.attack(0.9);
    },
    move(id, t) {
      if (!keyIds.has(id)) return;
      const k = keyAt(t.y);
      if (k !== keyIds.get(id)) keyIds.set(id, k), v.setPitch(fingers()[k], 0.015);
    },
    up(id) {
      if (keyIds.delete(id) && keyIds.size === 0) v.release(0.06);
    },
    draw(g, w, h, ink) {
      const ph = h / POSITIONS;
      for (let p = 0; p < POSITIONS; p++) {
        const y = h - (p + 1) * ph;
        const ns = all.slice(baseOf(p), baseOf(p) + KEYS);
        g.fillStyle = p === pos ? ink.voice : "rgba(255,255,255,0.03)";
        g.globalAlpha = p === pos ? 0.35 : 1;
        g.fillRect(0, y + 2, w / 2 - 4, ph - 4);
        g.globalAlpha = 1;
        g.fillStyle = p === pos ? ink.fg : ink.muted;
        g.font = `8px ${ink.font}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(`${noteName(ns[0])}–${noteName(ns[ns.length - 1])}`, w / 4, y + ph / 2);
      }
      const held = [...keyIds.values()].at(-1);
      drawRows(g, fingers(), w / 2, w, h, ink, held !== undefined ? fingers()[held] : null, true);
      label(g, "HAND", w / 4, 8, ink);
      label(g, "FIVE KEYS", (3 * w) / 4, 8, ink);
    },
  };
};

/** 4: the dial. */
export const dial: Maker = (v, r) => {
  const notes = scaleNotes(r.lo, r.hi);
  let idx = Math.floor(notes.length / 2);
  let dialId: number | null = null;
  let gateId: number | null = null;
  let angle = 0;
  let acc = 0;
  let cx = 0.75;
  let cy = 0.5;
  let aspect = 1;
  const NOTCH = (28 * Math.PI) / 180;
  const ang = (t: Touch) => Math.atan2((t.y - cy) / aspect, t.x - cx);
  return {
    id: "dial",
    name: "DIAL",
    how: "Right thumb: turn the wheel, a note of the scale for each notch (clockwise up). Left thumb: the sound (down on, up off); turn while it is down to slur.",
    down(id, t) {
      if (left(t)) {
        gateId = id;
        v.setPitch(notes[idx]);
        v.attack(0.9);
      } else {
        dialId = id;
        angle = ang(t);
        acc = 0;
      }
    },
    move(id, t) {
      if (id !== dialId) return;
      const a = ang(t);
      let d = a - angle;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      angle = a;
      acc += d;
      while (Math.abs(acc) >= NOTCH) {
        const step = acc > 0 ? 1 : -1;
        acc -= step * NOTCH;
        idx = Math.max(0, Math.min(notes.length - 1, idx + step));
        v.setPitch(notes[idx], gateId !== null ? 0.02 : 0);
      }
    },
    up(id) {
      if (id === gateId) (gateId = null), v.release(0.06);
      if (id === dialId) dialId = null;
    },
    draw(g, w, h, ink) {
      aspect = h / w;
      cx = 0.75;
      cy = 0.5;
      const R = Math.min(w / 4, h / 2) * 0.85;
      const X = cx * w;
      const Y = cy * h;
      g.strokeStyle = ink.grid;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(X, Y, R, 0, 2 * Math.PI);
      g.stroke();
      // The notches, and the current one.
      for (let k = 0; k < Math.floor((2 * Math.PI) / NOTCH); k++) {
        const a = angle + k * NOTCH - acc;
        g.fillStyle = k === 0 ? ink.shine : ink.muted;
        g.fillRect(X + Math.cos(a) * R - 2, Y + Math.sin(a) * R - 2, 4, 4);
      }
      g.fillStyle = v.on ? ink.voice : ink.fg;
      g.font = `14px ${ink.font}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(noteName(notes[idx]), X, Y);
      g.fillStyle = ink.grid;
      g.fillRect(w / 2 - 1, 0, 2, h);
      if (gateId !== null) {
        g.fillStyle = ink.shine;
        g.globalAlpha = 0.25;
        g.fillRect(0, 0, w / 2, h);
        g.globalAlpha = 1;
      }
      label(g, "SOUND", w / 4, 8, ink);
      label(g, "TURN ↻ UP", (3 * w) / 4, 8, ink);
    },
  };
};

/** 5: home and ornament. */
export const ornament: Maker = (v, r) => {
  const notes = scaleNotes(r.lo, r.hi);
  const down = new Map<number, number>();
  let home: number | null = null;
  return {
    id: "ornament",
    name: "HOME & ORNAMENT",
    how: "The same notes under both thumbs. The first thumb down holds the home note; the other thumb's taps sound other notes and fall back to it: alternate fast for a trill or mordent. One thumb alone: plain notes; slide to slur.",
    down(id, t) {
      const m = rowOf(notes, t.y);
      down.set(id, m);
      if (home === null) {
        home = id;
        v.setPitch(m);
        v.attack(0.9);
      } else {
        // An ornament: the pitch moves at once, slurred, without a new attack.
        v.setPitch(m, 0.004);
        v.setLevel(1, 0.005);
      }
    },
    move(id, t) {
      if (!down.has(id)) return;
      const m = rowOf(notes, t.y);
      if (m === down.get(id)) return;
      down.set(id, m);
      const latest = [...down.keys()].at(-1);
      if (id === latest) v.setPitch(m, 0.02);
    },
    up(id) {
      down.delete(id);
      if (id === home) {
        // The other thumb, if down, becomes home.
        const next = [...down.keys()].at(-1);
        home = next ?? null;
        if (next === undefined) v.release(0.06);
        else v.setPitch(down.get(next)!, 0.01);
        return;
      }
      // An ornament ends: back to the home note.
      const latest = [...down.keys()].at(-1);
      if (latest !== undefined) (v.setPitch(down.get(latest)!, 0.004), v.setLevel(0.9, 0.02));
    },
    draw(g, w, h, ink) {
      const latest = [...down.keys()].at(-1);
      const lit = latest !== undefined ? down.get(latest)! : null;
      drawRows(g, notes, 0, w / 2, h, ink, lit);
      drawRows(g, notes, w / 2, w, h, ink, lit, true);
      if (home !== null && down.has(home)) {
        const m = down.get(home)!;
        const i = notes.indexOf(m);
        const rh = h / notes.length;
        g.strokeStyle = ink.shine;
        g.lineWidth = 2;
        g.strokeRect(1, h - (i + 1) * rh + 1, w - 2, rh - 2);
      }
      g.fillStyle = ink.grid;
      g.fillRect(w / 2 - 1, 0, 2, h);
    },
  };
};

/** 6: the keybed, sideways. */
export const keybed: Maker = (v, r) => {
  const lo = Math.floor(r.lo / 12) * 12;
  const hi = Math.max(lo + 24, Math.ceil(r.hi / 12) * 12);
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if ([0, 2, 4, 5, 7, 9, 11].includes(m % 12)) whites.push(m);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  const keys = new Map<number, number>();
  let order: number[] = [];
  /** The key under (x, y): the black keys stand in the upper 60%. */
  const keyAt = (x: number, y: number) => {
    const wi = Math.max(0, Math.min(whites.length - 1, Math.floor(x * whites.length)));
    const wm = whites[wi];
    if (y < 0.6) {
      const frac = x * whites.length - wi;
      if (frac > 0.68 && black(wm + 1)) return wm + 1;
      if (frac < 0.32 && black(wm - 1)) return wm - 1;
    }
    return wm;
  };
  const sound = () => {
    const id = order.at(-1);
    if (id === undefined) return v.release(0.06);
    v.setPitch(keys.get(id)!, 0.005);
  };
  return {
    id: "keybed",
    name: "KEYBED",
    landscape: true,
    how: "Sideways. A piano keyboard: the last key pressed sounds; slide along the keys for a glissando; drag up on a key to bend it.",
    down(id, t) {
      const m = keyAt(t.x, t.y);
      keys.set(id, m);
      order.push(id);
      v.setPitch(m);
      v.attack(0.9);
    },
    move(id, t) {
      if (!keys.has(id)) return;
      const m = keyAt(t.x, t.y0);
      if (m !== keys.get(id)) (keys.set(id, m), id === order.at(-1) && v.setPitch(m, 0.004));
      // Up from where it landed: a bend of up to a tone.
      const bend = Math.max(0, Math.min(2, ((t.y0 - t.y) / 0.5) * 2));
      if (id === order.at(-1)) v.setPitch(m + bend, 0.01);
    },
    up(id) {
      keys.delete(id);
      order = order.filter((x) => x !== id);
      sound();
    },
    draw(g, w, h, ink) {
      const kw = w / whites.length;
      const held = new Set(keys.values());
      whites.forEach((m, i) => {
        g.fillStyle = held.has(m) ? ink.voice : "#d9d6c7";
        g.fillRect(i * kw + 1, 0, kw - 2, h);
        if (m % 12 === 0) {
          g.fillStyle = "#555";
          g.font = `7px ${ink.font}`;
          g.textAlign = "center";
          g.textBaseline = "bottom";
          g.fillText(noteName(m), i * kw + kw / 2, h - 4);
        }
      });
      whites.forEach((m, i) => {
        if (!black(m + 1) || m + 1 > hi) return;
        g.fillStyle = held.has(m + 1) ? ink.voice : "#1b1b22";
        g.fillRect((i + 1) * kw - kw * 0.32, 0, kw * 0.64, h * 0.6);
      });
    },
  };
};

export const INSTRUMENTS: Maker[] = [theremin, bow, positions, dial, ornament, keybed];
