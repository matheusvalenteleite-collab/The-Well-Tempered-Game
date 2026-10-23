/**
 * Design study (`?ui=gameboy`, `?ui=gbc`): the two handhelds.
 *
 * GAME BOY: the original's four shades of green and nothing else. NEGATIVE's highlighting (box-variants
 * 11, the owner's choice): everything quiet (the other voices a faint dotted outline), solid colour only
 * for the player's notes and for the entries still sounding or to come, each inside tall square brackets
 * with its name over them; an entry past goes quiet again.
 *
 * GAME BOY COLOR: what the colour model adds. The background is 8×8 tiles, each tile painted with ONE
 * of eight 4-colour palettes; the moving things are sprites with palettes of their own (three colours and
 * transparent); a "window" layer, opaque, holds the text. Here: the neutral palette for the quiet music;
 * an entry's tiles switch to its voice's palette (blocky, tile-aligned rooms: everything inside, other
 * voices too, takes the entry's colours, the attribute clash of the hardware); the player's notes are
 * sprites in their own gold palette; the window at the foot names the entry. The bright off-white of the
 * colour LCD, the saturated palettes.
 */
import { pixText, textWidth } from "../box-fx.ts";
import { arrowMarks, entryWord, gridLines, keyLong, ladderGeo, pframe, prect, type Ctx, type Template, type UEntry, type UNote } from "./core.ts";

const DMG = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];

function ends(c: Ctx, n: { on: number; dur: number }): [number, number] {
  const a = Math.round(c.xOf(n.on));
  return [a, Math.max(a + 1, Math.round(c.xOf(n.on + n.dur)) - 1)];
}
function row(c: Ctx, n: { step: number; voice: number }): [number, number] {
  // D228: a row's own height (the margins beyond the player's range are squeezed).
  const A = c.h(n.step, n.voice);
  return [Math.round(c.y(n.step, n.voice) - A / 2), Math.max(1, Math.round(A) - 1)];
}
function extent(c: Ctx, e: UEntry): [number, number] {
  let top = Infinity;
  let bot = -Infinity;
  for (const n of e.path) {
    const [y, h] = row(c, { step: n.step, voice: e.voice });
    top = Math.min(top, y);
    bot = Math.max(bot, y + h);
  }
  return [top, bot];
}
/** Labels placed so that overlapping entries' names stack (a stretto's, one above another). */
function stackLabels(c: Ctx, es: UEntry[], width: (e: UEntry) => number, want: (e: UEntry) => number, line = 8): Map<UEntry, number> {
  const out = new Map<UEntry, number>();
  const placed: { a: number; b: number; y: number }[] = [];
  for (const e of [...es].sort((p, q) => p.on - q.on)) {
    const x = c.xOf(e.on);
    let y = want(e);
    for (let moved = true; moved; ) {
      moved = false;
      for (const p of placed)
        if (p.a < x + width(e) + 3 && x < p.b + 3 && Math.abs(p.y - y) < line) {
          y = p.y - line;
          moved = true;
        }
    }
    y = Math.max(1, y);
    placed.push({ a: x, b: x + width(e), y });
    out.set(e, y);
  }
  return out;
}

function playerShade(c: Ctx, n: UNote, base: string, past: string, flash: string, miss: string): string {
  if (n.state === "miss") return miss;
  if (n.state === "hit") return c.since(n) < 0.2 ? flash : past;
  return base;
}

export const GAMEBOY: Template = {
  name: "GAME BOY",
  desc: "Four greens. Only your line and the entries now sounding are inked, each in tall brackets.",
  family: "RETRO",
  pixel: 2,
  css:
    ".ui-gameboy .tg-box { background: #306230 !important; } .ui-gameboy .tg-hud { background: #0f380f !important; box-shadow: none !important; padding: 2px 6px; } .ui-gameboy .tg-hud-title, .ui-gameboy .tg-hud-bar, .ui-gameboy .tg-legend span { color: #9bbc0f !important; } .ui-gameboy .tg-roll { box-shadow: inset 0 0 0 2px #0f380f !important; } .ui-gameboy .tg-roll::after { display: none !important; }",
  geo: (L) => ladderGeo(L),
  paint(c) {
    const { g, W, H } = c;
    const [d0, d1, d2, d3] = DMG;
    prect(g, 0, 0, W, H, d3);
    for (const l of gridLines(c)) if (l.bar) for (let y = 0; y < H; y += 2) prect(g, c.xOf(l.t), y, 1, 1, d2);
    // The music: quiet (a dotted outline); the current entries' notes solid d1; the player's solid d0.
    for (const n of c.notes) {
      const [a, b] = ends(c, n);
      const [y, h] = row(c, n);
      if (n.mine) {
        prect(g, a - 1, y - 1, b - a + 2, h + 2, d3);
        prect(g, a, y, b - a, h, playerShade(c, n, d0, d1, d3, d2));
        if (n.state === "miss") pframe(g, a, y, b - a, h, d0);
      } else if (n.entry?.live) prect(g, a, y, b - a, h, d1);
      else {
        // Quiet: an outline in the second-lightest shade.
        pframe(g, a, y, b - a, h, d2);
        prect(g, a, y, 1, h, d1);
      }
    }
    // Tall square brackets round each entry, its name over it; past entries quiet.
    const labels = stackLabels(c, c.entries, (e) => textWidth(label(c, e)), (e) => extent(c, e)[0] - 11);
    for (const e of c.entries) {
      const [top, bot] = extent(c, e);
      const x1 = Math.round(c.xOf(e.on)) - 3;
      const x2 = Math.round(c.xOf(e.end)) + 1;
      const col = e.live ? d0 : d2;
      const t = top - 3;
      const bt = bot + 2;
      // D228: a live entry's brackets doubled, so where it begins and ends cannot be missed.
      const th = e.live ? 2 : 1;
      prect(g, x1, t, th, bt - t + 1, col);
      prect(g, x1, t, 4, 1, col);
      prect(g, x1, bt, 4, 1, col);
      prect(g, x2 - th + 1, t, th, bt - t + 1, col);
      prect(g, x2 - 3, t, 4, 1, col);
      prect(g, x2 - 3, bt, 4, 1, col);
      const ly = labels.get(e) ?? 1;
      const text = label(c, e);
      if (e.live && (e.stretto || e.mine)) {
        prect(g, x1 - 1, ly - 2, textWidth(text) + 3, 9, d0);
        pixText(g, text, x1 + 1, ly, d3);
      } else {
        prect(g, x1 - 1, ly - 2, textWidth(text) + 3, 9, d3);
        pixText(g, text, x1 + 1, ly, col);
      }
      // How far through: a row of dots under the bracket.
      if (e.sounding) for (let x = x1; x < x1 + (x2 - x1) * e.through; x += 2) prect(g, x, bt + 2, 1, 1, d0);
    }
    for (const cd of c.fr.cadences ?? []) {
      const x = Math.round(c.xOf(cd.on));
      if (x > -60 && x < W) pixText(g, cd.text, Math.min(x + 3, W - textWidth(cd.text) - 2), H - 8, d1);
    }
    for (let y = 0; y < H; y += 3) prect(g, c.playX, y, 1, 2, d0);
    arrowMarks(c, d0, d3);
  },
};

function label(c: Ctx, e: UEntry): string {
  return `${entryWord(e)} · ${c.names[e.voice] ?? ""}${e.stretto ? " · STRETTO" : ""}`;
}

// ---------------------------------------------------------------------------------------------------

/** The colour handheld's palettes: 4 colours each (lightest first). BG 0 the quiet music; 1-5 a voice's. */
const BG = [
  ["#f8f8f0", "#d8d8c8", "#a0a090", "#585848"],
  ["#f8f8f8", "#a8d8f8", "#3880e0", "#082868"],
  ["#f8f8f8", "#f8c098", "#e86030", "#681808"],
  ["#f8f8f8", "#d8b0f8", "#9048d0", "#381060"],
  ["#f8f8f8", "#b0f0a0", "#30a840", "#083810"],
  ["#f8f8f8", "#a0f0e8", "#20a8a0", "#083830"],
];
/** The player's sprites: transparent, gold, orange, outline. */
const OBJ = [null, "#f8e050", "#f89020", "#181010"];
/** The window layer's: navy, white text, gold, red. */
const WIN = ["#182048", "#f8f8f8", "#f8d048", "#f85858"];

function voicePal(v: number, count: number): string[] {
  const order = count === 2 ? [1, 4] : count === 3 ? [1, 2, 4] : count === 5 ? [1, 5, 2, 3, 4] : [1, 2, 3, 4];
  return BG[order[v] ?? 1];
}

export const GBC: Template = {
  name: "GAME BOY COLOR",
  desc: "Colour tiles: each entry lights its tiles in its voice's palette; your notes are gold sprites.",
  family: "RETRO",
  pixel: 2,
  chrome: true,
  css: ".ui-gbc .tg-box { background: #f8f8f0 !important; } .ui-gbc .tg-hud { background: #182048 !important; box-shadow: none !important; padding: 3px 6px; } .ui-gbc .tg-hud-title { color: #f8f8f8 !important; } .ui-gbc .tg-hud-bar { color: #f8d048 !important; }",
  geo: (L) => ladderGeo(L, () => 4, () => 36),
  paint(c) {
    const { g, W, H } = c;
    const T = 8;
    const winH = 16;
    const fieldH = H - winH;
    const cols = Math.ceil(W / T);
    const rows = Math.ceil(fieldH / T);
    // The attribute map: each tile's palette (0 quiet; an entry's tiles its voice's).
    const attr: (number | null)[] = new Array(cols * rows).fill(null);
    const owner: (UEntry | null)[] = new Array(cols * rows).fill(null);
    const live = c.entries.filter((e) => e.live).sort((a, b) => Number(a.mine) - Number(b.mine) || a.on - b.on);
    for (const e of live) {
      const [top, bot] = extent(c, e);
      const tx1 = Math.floor((c.xOf(e.on) - 2) / T);
      const tx2 = Math.floor((c.xOf(e.end) + 1) / T);
      const ty1 = Math.floor((top - 3) / T);
      const ty2 = Math.floor((bot + 2) / T);
      for (let ty = Math.max(0, ty1); ty <= Math.min(rows - 1, ty2); ty++)
        for (let tx = Math.max(0, tx1); tx <= Math.min(cols - 1, tx2); tx++) {
          attr[ty * cols + tx] = e.voice;
          owner[ty * cols + tx] = e;
        }
    }
    const palAt = (x: number, y: number) => {
      const tx = Math.floor(x / T);
      const ty = Math.floor(y / T);
      const v = tx >= 0 && ty >= 0 && tx < cols && ty < rows ? attr[ty * cols + tx] : null;
      return v === null ? BG[0] : voicePal(v, c.count);
    };
    // The background tiles: quiet ones off-white with a faint grid dot; an entry's its palette's light shade, checkered.
    for (let ty = 0; ty < rows; ty++)
      for (let tx = 0; tx < cols; tx++) {
        const v = attr[ty * cols + tx];
        const p = v === null ? BG[0] : voicePal(v, c.count);
        prect(g, tx * T, ty * T, T, T, p[0]);
        if (v !== null) for (let k = 0; k < T; k += 2) prect(g, tx * T + k + ((ty + k / 2) % 2), ty * T + k, 1, 1, p[1]);
      }
    for (const l of gridLines(c)) if (l.bar) for (let y = 0; y < fieldH; y += 2) prect(g, c.xOf(l.t), y, 1, 1, palAt(c.xOf(l.t), y)[1]);
    // The music on the background: each pixel in its tile's palette (the other voices take an entry's colours inside its room).
    for (const n of c.notes) {
      if (n.mine) continue;
      const [a, b] = ends(c, n);
      const [y, h] = row(c, n);
      for (let x = a; x < b; x++) {
        const p = palAt(x, y);
        const inRoom = p !== BG[0];
        const own = n.entry?.live && inRoom;
        prect(g, x, y, 1, h, own ? p[3] : inRoom ? p[2] : p[2]);
      }
    }
    // Each room's tall brackets on its tile edges, the name in the corner.
    for (const e of live) {
      const p = voicePal(e.voice, c.count);
      const [top, bot] = extent(c, e);
      const x1 = Math.floor((c.xOf(e.on) - 2) / T) * T;
      const x2 = (Math.floor((c.xOf(e.end) + 1) / T) + 1) * T - 1;
      const y1 = Math.max(0, Math.floor((top - 3) / T) * T);
      const y2 = Math.min(fieldH - 1, (Math.floor((bot + 2) / T) + 1) * T - 1);
      prect(g, x1, y1, 2, y2 - y1 + 1, p[3]);
      prect(g, x1, y1, 5, 2, p[3]);
      prect(g, x1, y2 - 1, 5, 2, p[3]);
      prect(g, x2 - 1, y1, 2, y2 - y1 + 1, p[3]);
      prect(g, x2 - 4, y1, 5, 2, p[3]);
      prect(g, x2 - 4, y2 - 1, 5, 2, p[3]);
      const text = `${e.form === "answer" ? "ANSWER" : "SUBJECT"} ${c.names[e.voice]}`;
      prect(g, x1 + 3, y1 + 3, textWidth(text) + 3, 8, p[3]);
      pixText(g, text, x1 + 5, y1 + 4, p[0]);
    }
    // The player's notes: sprites in their own palette, outlined.
    for (const n of c.notes) {
      if (!n.mine) continue;
      const [a, b] = ends(c, n);
      const [y, h] = row(c, n);
      const fill = n.state === "miss" ? "#585848" : n.state === "hit" ? (c.since(n) < 0.2 ? "#ffffff" : OBJ[2]!) : OBJ[1]!;
      prect(g, a - 1, y - 1, b - a + 2, h + 2, OBJ[3]!);
      prect(g, a, y, b - a, h, fill);
      if (h > 2 && n.state !== "miss") prect(g, a, y, b - a, 1, "#fff8c0");
    }
    arrowMarks(c, OBJ[3]!, "#f8f8f0");
    // The now: a sprite column (a little arrow at the top, dashes down).
    for (let y = 0; y < fieldH; y += 4) prect(g, c.playX, y, 1, 2, OBJ[3]!);
    prect(g, c.playX - 2, 0, 5, 1, OBJ[3]!);
    prect(g, c.playX - 1, 1, 3, 1, OBJ[3]!);
    // The window layer: opaque, its own palette, the entry sounding (or coming) named; the score.
    prect(g, 0, fieldH, W, winH, WIN[0]);
    prect(g, 0, fieldH, W, 1, WIN[2]);
    const cur = live.filter((e) => e.sounding).sort((a, b) => b.on - a.on)[0] ?? live.sort((a, b) => a.on - b.on)[0];
    const msg = cur ? `${cur.sounding ? "♪" : "▶"} ${entryWord(cur)} · ${c.names[cur.voice]} · ${keyLong(cur.key)}` : keyLong(c.fr.key);
    pixText(g, msg.replace("♪", "~").replace("▶", ">"), 4, fieldH + 6, WIN[1]);
    if (cur?.stretto && Math.floor(c.secs * 3) % 2) pixText(g, "STRETTO!", 4 + textWidth(msg) + 8, fieldH + 6, WIN[3]);
    const sc = String(Math.round(c.game?.score ?? 0)).padStart(6, "0");
    pixText(g, sc, W - textWidth(sc) - 4, fieldH + 6, WIN[2]);
  },
};
