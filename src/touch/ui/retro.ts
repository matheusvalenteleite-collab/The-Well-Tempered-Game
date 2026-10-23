/**
 * Design study (`?ui=nethack`, `?ui=pianola`, `?ui=win95`): three older machines.
 *
 * NETHACK: a terminal roguelike. One row per step, one column per sixteenth. The voices are monster
 * letters (S the soprano a snake, A the alto an angel, T the tenor a troll, B the bass a bat), quiet in
 * grey lowercase; an entry is a lit room (walls, a floor of dots, a door + where it begins and where it
 * ends) and its voice's letters capitals in their colour; the player's notes a corridor (#) with gold ($)
 * on each note to pick up, the player @; the message line above says what enters, the status lines below.
 *
 * PIANOLA: a player-piano roll running over the tracker bar: every note a punched slot. The roll's own
 * ways of marking a theme: the Themodist's accent perforations in the margins (treble side above, bass
 * side below, a "snakebite" pair under each note of the subject), red crayon round the entry's slots with
 * its name printed in red, the Metrostyle's red line; the player's slots ringed in blue crayon.
 *
 * WIN95: a 1990s MIDI sequencer's piano-roll window: title bar, menus, a transport with the LCD
 * counter, a keyboard down the side; the player's track in its colour, the other tracks as grey "ghost
 * notes" except an entry's, the entries as markers in the ruler (a flag where each begins and ends), the
 * now line.
 */
import { stepRange } from "../voice-mode.ts";
import { arrowMarks, entryWord, gridLines, hash, keyLong, ladderGeo, rect, type Ctx, type Geo, type GeoIn, type Template, type UEntry } from "./core.ts";

/** One step per row between a band of chrome above and below; the rows as large as fit. */
function rowsGeo(L: GeoIn, top: (A: number) => number, bottom: (A: number) => number, pad = 1): Geo {
  const r = stepRange(L.f);
  const lo = Math.min(r.lo, L.range.lo) - pad;
  const hi = Math.max(r.hi, L.range.hi) + pad;
  let A = L.h / (hi - lo + 1);
  for (let i = 0; i < 4; i++) A = (L.h - top(A) - bottom(A)) / (hi - lo + 1);
  const t = top(A);
  return { yOf: (s) => t + (hi - s + 0.5) * A, A: () => A };
}

// ---------------------------------------------------------------------------------------------------

const VGA = { black: "#000", grey: "#8a8a8a", dark: "#4a4a4a", white: "#fff", yellow: "#ffff55", gold: "#ffd700", red: "#ff5555", green: "#55ff55", brown: "#aa5500", magenta: "#ff55ff", cyan: "#55ffff", blue: "#5555ff", orange: "#ffaa00" };
const MONSTER = ["S", "A", "T", "B", "D"];
const MONSTER_INK = [VGA.green, VGA.yellow, VGA.red, VGA.magenta, VGA.cyan];
function monster(v: number, count: number): number {
  return count === 2 ? [0, 3][v] : count === 3 ? [0, 1, 3][v] : count === 5 ? [0, 4, 1, 2, 3][v] : v;
}

/** D228: the message line's and the status lines' heights (CSS px), and their type. */
const NH_TOP = 17;
const NH_BOTTOM = 32;
const NH_FONT = `12px "DejaVu Sans Mono", "Liberation Mono", Menlo, monospace`;

export const NETHACK: Template = {
  name: "NETHACK",
  desc: "A terminal dungeon: voices as letters, each entry a lit room with a door at either end, your line a # corridor, you the @.",
  pixel: 0,
  chrome: true,
  css: '.ui-nethack .tg-box { background: #000 !important; } .ui-nethack .tg-hud { background: #000 !important; box-shadow: none !important; padding: 2px 6px; border-bottom: 1px solid #2a2a2a; } .ui-nethack .tg-hud-title { color: #cfcfcf !important; } .ui-nethack .tg-hud-bar { color: #ffff55 !important; }',
  // D228: the player's range a ladder of full rows; the other voices beyond it in half-height rows.
  geo: (L) => ladderGeo(L, () => NH_TOP, () => NH_BOTTOM),
  paint(c) {
    const { g, W, H } = c;
    rect(g, 0, 0, W, H, "#000");
    const v0 = c.fr.voice;
    const A = c.A(v0);
    // One column a character; the type no larger than a row, nor so wide that time is coarse.
    const cw = Math.max(5, Math.min(A * 0.62, 11));
    const big = Math.max(6, Math.min(A * 1.02, cw / 0.6));
    const small = Math.max(5, Math.min(big, c.h(c.fr.hi + 2, v0) * 1.15));
    let curF = 0;
    const font = (px: number) => {
      if (px !== curF) {
        g.font = `${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, monospace`;
        curF = px;
      }
    };
    g.textAlign = "left";
    g.textBaseline = "middle";
    const col = (t: number) => Math.floor(c.xOf(t) / cw);
    const put = (cx: number, step: number, ch: string, ink: string, clear = false) => {
      const x = cx * cw;
      if (x < -cw || x > W) return;
      const y = c.y(step, v0);
      const h = c.h(step, v0);
      if (clear) rect(g, x, y - h / 2, cw, h, "#000");
      font(h < A - 0.01 ? small : big);
      g.fillStyle = ink;
      g.fillText(ch, x, y);
    };
    const r = stepRange(c.f);
    // The bar lines: a wall of dim dots.
    for (const l of gridLines(c)) if (l.bar) for (let s = r.lo - 1; s <= r.hi + 1; s += 2) put(col(l.t), s, ":", "#1f2a44");
    // The rooms: an entry still to come or sounding lit (walls, floor, a door where it begins and one
    // where it ends, its name let into the top wall); one past, its walls dark.
    for (const e of c.entries) {
      const steps = e.path.map((n) => n.step);
      const top = Math.max(...steps) + 1;
      const bot = Math.min(...steps) - 1;
      const a = col(e.on) - 1;
      const b = col(e.end);
      const wall = !e.live ? "#3a3a3a" : e.mine ? "#d8b040" : "#9a9a9a";
      for (let x = a; x <= b; x++) {
        put(x, top, "-", wall);
        put(x, bot, "-", wall);
      }
      for (let s = bot + 1; s < top; s++) {
        put(a, s, "|", wall);
        put(b, s, "|", wall);
        if (e.live) for (let x = a + 1; x < b; x++) put(x, s, "·", "#333");
      }
      if (e.live) {
        put(a, e.path[0].step, "+", VGA.orange, true);
        put(b, e.path[e.path.length - 1].step, "+", VGA.orange, true);
        const who = (c.names[e.voice] ?? "").toLowerCase();
        const name = ` ${e.form === "answer" ? "answer" : "subject"}${e.theme ? ` ${e.theme}` : ""} · ${who}${e.stretto ? " · stretto" : ""} `;
        const room = b - a - 2;
        const text = name.length <= room ? name : ` ${e.form === "answer" ? "ans" : "subj"} ${who.slice(0, 3)} `.slice(0, Math.max(0, room));
        for (let i = 0; i < text.length; i++) put(a + 2 + i, top, text[i], e.mine ? VGA.gold : MONSTER_INK[monster(e.voice, c.count)], true);
      }
    }
    // The other voices: monster letters, quiet lowercase grey; an entry's capitals in the voice's colour.
    for (const n of c.notes) {
      if (n.mine) continue;
      const m = monster(n.voice, c.count);
      const a = col(n.on);
      const b = Math.max(a + 1, col(n.on + n.dur));
      const lit = n.entry?.live;
      put(a, n.step, lit ? MONSTER[m] : MONSTER[m].toLowerCase(), lit ? MONSTER_INK[m] : "#6a6a6a", true);
      for (let x = a + 1; x < b; x++) put(x, n.step, lit ? "=" : "-", lit ? MONSTER_INK[m] : "#383838", true);
    }
    // The player's way: a corridor, gold on each note to come, a corpse where one was missed.
    let here: number | null = null;
    for (const n of c.notes) {
      if (!n.mine) continue;
      const a = col(n.on);
      const b = Math.max(a + 1, col(n.on + n.dur));
      if (n.on <= c.now) here = n.step;
      for (let x = a + 1; x < b; x++) put(x, n.step, "#", n.state === "pending" ? "#d0d0d0" : "#606060", true);
      if (n.state === "miss") put(a, n.step, "%", VGA.red, true);
      else if (n.state === "hit") put(a, n.step, "#", c.since(n) < 0.2 ? VGA.white : "#808080", true);
      else put(a, n.step, "$", n.entry?.live ? VGA.gold : VGA.yellow, true);
    }
    // You.
    if (here !== null) {
      const x = col(c.now) * cw;
      rect(g, x - 1, c.y(here, v0) - A / 2, cw + 2, A, "#303030");
      put(col(c.now), here, "@", VGA.white);
    }
    arrowMarks(c, VGA.white, "#000", 2);
    // The message line.
    g.font = NH_FONT;
    curF = 0;
    rect(g, 0, 0, W, NH_TOP, "#000");
    const near = c.entries.filter((e) => e.live && c.xOf(e.on) < W * 0.85).sort((a, b) => b.on - a.on)[0];
    g.fillStyle = VGA.white;
    g.fillText(fit(g, near ? message(c, near) : "You hear the voices going about their business.", W - 4), 2, NH_TOP / 2 + 1);
    // The status lines (as much of them as fits).
    const sy = H - NH_BOTTOM;
    rect(g, 0, sy, W, NH_BOTTOM, "#000");
    const bar = c.f.bars.filter((b) => b.on <= c.now).at(-1)?.n ?? 1;
    const me = c.names[v0] ?? "";
    const hp = Math.round((c.game?.crowd ?? 0.6) * 100);
    g.fillStyle = "#cfcfcf";
    g.fillText(fit(g, `${me[0]}${me.slice(1).toLowerCase()} the Contrapuntist   St:18 Dx:16 Co:14 In:18 Wi:20 Ch:9  Lawful`, W - 4), 2, sy + 8);
    g.fillText(fit(g, `Dlvl:${bar}  $:${Math.round(c.game?.score ?? 0)}  HP:${hp}(100)  Pw:${c.game?.combo ?? 0}  ${keyLong(c.fr.key).toLowerCase()}`, W - 40), 2, sy + 23);
    if (hp < 40) {
      g.fillStyle = VGA.red;
      g.textAlign = "right";
      g.fillText("Weak", W - 4, sy + 23);
      g.textAlign = "left";
    }
  },
};
/** A line cut to a width (the terminal's own way: the end dropped). */
function fit(g: CanvasRenderingContext2D, s: string, w: number): string {
  if (g.measureText(s).width <= w) return s;
  let n = s.length;
  while (n > 4 && g.measureText(s.slice(0, n)).width > w) n -= 4;
  return s.slice(0, n);
}
function message(c: Ctx, e: UEntry): string {
  const who = (c.names[e.voice] ?? "").toLowerCase();
  const what = e.form === "answer" ? "the answer" : "the subject";
  if (e.mine) return e.sounding ? `You sing ${what}! (${keyLong(e.key).toLowerCase()})` : `You feel ${what} coming to you...--More--`;
  if (e.stretto) return `The ${who} enters with ${what} before the last has ended! It's a stretto!`;
  return e.sounding ? `The ${who} sings ${what} in ${keyLong(e.key).toLowerCase()}.` : `You hear ${what} approaching in the ${who}.`;
}

// ---------------------------------------------------------------------------------------------------

export const PIANOLA: Template = {
  name: "PIANOLA",
  pixel: 0,
  chrome: true,
  css: ".ui-pianola .tg-box { background: #2b1a0e !important; }",
  geo: (L) => rowsGeo(L, () => 22, () => 20),
  paint(c) {
    const { g, W, H } = c;
    // The spool box's wood, the roll's paper over it.
    rect(g, 0, 0, W, H, "#3a2412");
    const p0 = 4;
    const p1 = H - 4;
    const paper = g.createLinearGradient(0, p0, 0, p1);
    paper.addColorStop(0, "#e6d8b4");
    paper.addColorStop(0.5, "#f1e7cc");
    paper.addColorStop(1, "#e3d3ad");
    g.fillStyle = paper;
    g.fillRect(0, p0, W, p1 - p0);
    // Grain that moves with the roll.
    for (let i = 0; i < 160; i++) {
      const x = ((hash(i, 1) * W * 3 - (c.now / c.span) * W) % (W * 3) + W * 3) % (W * 3);
      if (x > W) continue;
      rect(g, x, p0 + hash(i, 2) * (p1 - p0), 6 + hash(i, 3) * 30, 1, "#b49a6a", 0.18);
    }
    // Faint printed beat lines.
    for (const l of gridLines(c)) rect(g, c.xOf(l.t), p0 + 14, 1, p1 - p0 - 28, "#9b8156", l.bar ? 0.28 : 0.1);
    // The Metrostyle line: the editor's tempo, a red line wandering along the roll.
    g.strokeStyle = "rgba(190,40,30,0.55)";
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const t = (c.t0 + (x / W) * c.span) / c.f.barTicks;
      g.lineTo(x, p0 + 26 + Math.sin(t * 2.1) * 4 + Math.sin(t * 0.7) * 3);
    }
    g.stroke();
    const A = c.A(c.fr.voice);
    const slot = (x1: number, x2: number, y: number, h: number, fill: string, ring?: string) => {
      const r = Math.min(h / 2, 3);
      g.beginPath();
      g.roundRect(x1, y - h / 2, Math.max(2, x2 - x1), h, r);
      g.fillStyle = fill;
      g.fill();
      if (ring) {
        g.strokeStyle = ring;
        g.lineWidth = 1.6;
        g.beginPath();
        g.roundRect(x1 - 2, y - h / 2 - 2, Math.max(2, x2 - x1) + 4, h + 4, r + 2);
        g.stroke();
      }
    };
    // The red crayon round each entry still to come or sounding, its name in red print.
    for (const e of c.entries.filter((e) => e.live)) {
      const ys = e.path.map((n) => c.y(n.step, e.voice));
      const x1 = c.xOf(e.on) - 4;
      const x2 = c.xOf(e.end) + 2;
      const y1 = Math.min(...ys) - A * 1.4;
      const y2 = Math.max(...ys) + A * 1.4;
      g.strokeStyle = e.mine ? "rgba(40,80,200,0.75)" : "rgba(200,40,30,0.75)";
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(x1, y1, x2 - x1, y2 - y1, 8);
      g.stroke();
      g.fillStyle = e.mine ? "#2850c8" : "#b8281e";
      g.font = `bold 10px "Liberation Serif", Georgia, serif`;
      g.textAlign = "left";
      g.textBaseline = "bottom";
      g.fillText(`${entryWord(e)} — ${(c.names[e.voice] ?? "").toUpperCase()}${e.stretto ? " · STRETTO" : ""}`, x1 + 4, y1 - 1);
      // The Themodist's accents: a snakebite pair in the margin (treble side above, bass below) under each note.
      const upper = e.voice < c.count / 2;
      for (const n of e.path) {
        const x = c.xOf(n.on) + 1;
        const y = upper ? p0 + 7 : p1 - 7;
        for (const dx of [0, 5]) {
          g.fillStyle = "#1c130b";
          g.beginPath();
          g.arc(x + dx, y, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // The slots: the quiet music thin and pale, an entry's full, the player's ringed in blue.
    for (const n of c.notes) {
      const y = c.y(n.step, n.voice);
      const x1 = c.xOf(n.on) + 1;
      const x2 = c.xOf(n.on + n.dur) - 2;
      if (n.mine) {
        const done = n.state === "hit" && c.since(n) > 0.25;
        slot(x1, x2, y, A * 0.72, n.state === "miss" ? "#8a7a62" : done ? "#3b2c1c" : "#140d07", n.state === "miss" ? undefined : "rgba(40,80,200,0.85)");
        if (n.state === "hit" && c.since(n) < 0.25) slot(x1, x2, y, A * 0.72, "#fff4c8");
      } else if (n.entry?.live) slot(x1, x2, y, A * 0.62, "#1c130b");
      else slot(x1, x2, y, A * 0.38, "#6d5c45");
    }
    // The roll's title, printed.
    g.fillStyle = "#7a2a1a";
    g.font = `bold 9px "Liberation Serif", Georgia, serif`;
    g.textAlign = "left";
    g.textBaseline = "top";
    g.fillText(`J. S. BACH · DAS WOHLTEMPERIRTE CLAVIER ${c.f.book === 2 ? "II" : "I"} · FUGA ${c.f.number} · THEMODIST`, 8, p0 + 12);
    // The tracker bar: brass, a hole for every step; the paper past it in its shadow.
    rect(g, 0, p0, c.playX - 5, p1 - p0, "#000", 0.08);
    const brass = g.createLinearGradient(c.playX - 5, 0, c.playX + 6, 0);
    brass.addColorStop(0, "#7a5a22");
    brass.addColorStop(0.45, "#e7cd7c");
    brass.addColorStop(1, "#8b6a2a");
    rect(g, c.playX - 6, 0, 13, H, "#000", 0.25);
    g.fillStyle = brass;
    g.fillRect(c.playX - 5, 0, 11, H);
    const r = stepRange(c.f);
    for (let s = r.lo; s <= r.hi; s++) rect(g, c.playX - 1, c.y(s, c.fr.voice) - 1, 3, 2, "#2a1a08");
  },
};

// ---------------------------------------------------------------------------------------------------

const W95 = { face: "#c0c0c0", light: "#ffffff", shadow: "#808080", dark: "#000000", navy: "#000080", sky: "#1084d0", text: "#000" };
const TRACK = ["#ff0000", "#0000ff", "#008000", "#800080", "#808000"];
function bevel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sunk = false) {
  rect(g, x, y, w, h, W95.face);
  rect(g, x, y, w, 1, sunk ? W95.shadow : W95.light);
  rect(g, x, y, 1, h, sunk ? W95.shadow : W95.light);
  rect(g, x, y + h - 1, w, 1, sunk ? W95.light : W95.dark);
  rect(g, x + w - 1, y, 1, h, sunk ? W95.light : W95.dark);
}
/** D228: the window's bands (CSS px). The title bar is the box's own header, restyled (its ✕ quits); a short box (a phone held sideways) drops the menus. */
function chromeOf(h: number) {
  const short = h < 380;
  return { title: 0, menu: short ? 0 : 16, tool: short ? 22 : 24, ruler: short ? 26 : 28, status: short ? 16 : 17, keys: 30 };
}
export const WIN95: Template = {
  name: "WIN95",
  desc: "A 1990s MIDI sequencer: your track in colour, the others as ghost notes, a marker flag where each entry starts and ends.",
  pixel: 0,
  chrome: true,
  css: '.ui-win95 .tg-box { background: #c0c0c0 !important; border: 2px outset #dfdfdf !important; } .ui-win95 .tg-hud { background: linear-gradient(to right, #000080, #1084d0) !important; box-shadow: none !important; padding: 2px 3px 2px 6px; align-items: center; font: bold 11px "Liberation Sans", Arial, sans-serif !important; letter-spacing: 0 !important; } .ui-win95 .tg-hud-title, .ui-win95 .tg-hud-bar { color: #fff !important; } .ui-win95 .tg-hud .tg-x { width: 18px !important; height: 16px !important; min-height: 0 !important; padding: 0 !important; background: #c0c0c0 !important; color: #000 !important; border: 1px solid !important; border-color: #fff #000 #000 #fff !important; font: bold 10px Arial, sans-serif !important; box-shadow: none !important; }',
  geo: (L) => {
    const k = chromeOf(L.h);
    return ladderGeo(L, () => k.title + k.menu + k.tool + k.ruler, () => k.status);
  },
  paint(c) {
    const { g, W, H } = c;
    const k = chromeOf(H);
    const rollTop = k.title + k.menu + k.tool + k.ruler;
    const rollBot = H - k.status;
    const trackInk = (v: number) => TRACK[v % TRACK.length];
    // The roll: white rows, the C rows grey, the grid.
    rect(g, 0, rollTop, W, rollBot - rollTop, "#ffffff");
    const v0 = c.fr.voice;
    const r = stepRange(c.f);
    for (let s = r.lo - 2; s <= r.hi + 2; s++) {
      const A = c.h(s, v0);
      const y = c.y(s, v0) - A / 2;
      if (s % 7 === 0) rect(g, 0, y, W, A, "#e8e8e8");
      rect(g, 0, y + A - 0.5, W, 0.5, "#f0f0f0");
    }
    // The player's range: the rows outside it shaded (the other tracks squeezed there).
    rect(g, 0, rollTop, W, c.y(c.fr.hi, v0) - c.h(c.fr.hi, v0) / 2 - rollTop, "#000080", 0.05);
    const below = c.y(c.fr.lo, v0) + c.h(c.fr.lo, v0) / 2;
    rect(g, 0, below, W, rollBot - below, "#000080", 0.05);
    for (const l of gridLines(c)) rect(g, c.xOf(l.t), rollTop, 1, rollBot - rollTop, l.bar ? "#a0a0a0" : "#dcdcdc");
    // D228: each live entry selected, as a sequencer shows a selection: a pale band over its notes, from its marker to its end.
    for (const e of c.entries) {
      if (!e.live) continue;
      const steps = e.path.map((n) => n.step);
      const y1 = c.y(Math.max(...steps), e.voice) - c.h(Math.max(...steps), e.voice) / 2 - 2;
      const y2 = c.y(Math.min(...steps), e.voice) + c.h(Math.min(...steps), e.voice) / 2 + 2;
      rect(g, c.xOf(e.on), y1, c.xOf(e.end) - c.xOf(e.on), y2 - y1, e.mine ? "#ffff80" : "#fff4c8", e.mine ? 0.6 : 0.8);
    }
    // The notes: the player's track in its colour, the others' ghost notes grey (an entry's in its track's colour).
    for (const n of c.notes) {
      const A = c.h(n.step, n.voice);
      const y = c.y(n.step, n.voice) - A / 2 + 0.5;
      const x1 = c.xOf(n.on);
      const w = Math.max(2, c.xOf(n.on + n.dur) - x1 - 1);
      const h = Math.max(2, A - 1);
      if (n.mine) {
        const fill = n.state === "miss" ? "#c0c0c0" : n.state === "hit" && c.since(n) < 0.2 ? "#ffff00" : trackInk(n.voice);
        rect(g, x1, y, w, h, "#000");
        rect(g, x1 + 1, y + 1, w - 2, h - 2, fill);
      } else if (n.entry?.live) {
        rect(g, x1, y, w, h, "#404040");
        rect(g, x1 + 1, y + 1, w - 2, h - 2, trackInk(n.voice));
      } else {
        rect(g, x1, y, w, h, "#b0b0b0");
        rect(g, x1 + 1, y + 1, w - 2, h - 2, "#dedede");
      }
    }
    arrowMarks(c, "#000", "#fff", 2);
    // The now line.
    rect(g, c.playX, rollTop, 1, rollBot - rollTop, "#000");
    // The keyboard down the side.
    rect(g, 0, rollTop, k.keys, rollBot - rollTop, "#fff");
    for (let s = r.lo - 2; s <= r.hi + 2; s++) {
      const A = c.h(s, v0);
      const y = c.y(s, v0) - A / 2;
      if (y + A < rollTop || y > rollBot) continue;
      rect(g, 0, y + A - 1, k.keys, 1, "#808080");
      if ([1, 2, 4, 5, 6].includes(((s % 7) + 7) % 7)) rect(g, 0, y + A - 1 - A * 0.3, k.keys * 0.58, A * 0.6, "#000");
      if (s % 7 === 0 && A >= 5) {
        g.fillStyle = "#000";
        g.font = `${Math.min(9, A + 2)}px "Liberation Sans", Arial, sans-serif`;
        g.textAlign = "right";
        g.textBaseline = "middle";
        g.fillText(`C${Math.floor(s / 7)}`, k.keys - 2, y + A / 2);
      }
    }
    rect(g, k.keys, rollTop, 1, rollBot - rollTop, "#000");
    // The ruler: bar numbers above, the markers below (a flag where each entry begins and ends).
    const ry = k.title + k.menu + k.tool;
    bevel(g, 0, ry, W, k.ruler);
    g.font = `10px "Liberation Sans", Arial, sans-serif`;
    g.textBaseline = "top";
    g.textAlign = "left";
    for (const l of gridLines(c)) {
      const x = c.xOf(l.t);
      rect(g, x, ry + (l.bar ? 2 : 9), 1, l.bar ? 11 : 4, "#000");
      if (l.bar && x > k.keys) {
        g.fillStyle = "#000";
        g.fillText(String(l.n), x + 2, ry + 1);
      }
    }
    for (const e of c.entries) {
      const flag = (x: number, text: string) => {
        g.font = `bold 9px "Liberation Sans", Arial, sans-serif`;
        const tw = g.measureText(text).width;
        const y = ry + k.ruler * 0.52;
        // D228: a live entry's marker lines drawn solid down the roll (2 px), so its start and end cannot be missed.
        rect(g, x, y, e.live ? 2 : 1, rollBot - y, e.live ? (e.mine ? "#c08000" : "#806000") : "#c0c0c0", e.live ? 0.9 : 0.4);
        rect(g, x, y, tw + 5, 11, e.live ? (e.mine ? "#ffff00" : "#ffffc0") : "#d8d8d8");
        rect(g, x, y, tw + 5, 1, "#808080");
        g.fillStyle = e.live ? "#000" : "#808080";
        g.fillText(text, x + 3, y + 1);
      };
      const who = c.names[e.voice] ?? "";
      flag(c.xOf(e.on), `▶ ${e.form === "answer" ? "Ans" : "Subj"} ${who[0]}${who.slice(1, 3).toLowerCase()}${e.stretto ? " (stretto)" : ""}`);
      flag(c.xOf(e.end), "■ end");
    }
    // The window: menus (where there is room), the transport and the counter.
    bevel(g, 0, 0, W, k.title + k.menu + k.tool);
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.font = `11px "Liberation Sans", Arial, sans-serif`;
    let mx = 8;
    for (const m of k.menu ? ["File", "Edit", "View", "Insert", "Realtime", "Track", "Tools", "Window", "Help"] : []) {
      g.fillStyle = "#000";
      g.fillText(m, mx, k.title + k.menu / 2 + 1);
      rect(g, mx, k.title + k.menu / 2 + 6, g.measureText(m[0]).width, 1, "#000");
      mx += g.measureText(m).width + 12;
    }
    const ty = k.title + k.menu;
    const btn = (x: number, label: string, down = false) => {
      bevel(g, x, ty + 2, 22, k.tool - 4, down);
      g.fillStyle = "#000";
      g.textAlign = "center";
      g.font = `10px "DejaVu Sans", sans-serif`;
      g.fillText(label, x + 11, ty + k.tool / 2);
    };
    ["⏮", "◀◀", "▶", "■", "●"].forEach((l, i) => btn(6 + i * 24, l, i === 2));
    // The LCD: bar:beat:tick, the key, the score.
    const lx = 136;
    rect(g, lx, ty + 2, Math.min(230, W - lx - 4), k.tool - 4, "#000");
    const bar = c.f.bars.filter((b) => b.on <= c.now).at(-1);
    const inBar = bar ? c.now - bar.on : 0;
    const beatN = Math.floor(inBar / c.beat) + 1;
    const tick = Math.floor(((inBar % c.beat) / c.beat) * 480);
    g.fillStyle = "#00ff40";
    g.textAlign = "left";
    g.font = `bold 13px "DejaVu Sans Mono", monospace`;
    g.fillText(`${String(bar?.n ?? 1).padStart(4, "0")}:${String(beatN).padStart(2, "0")}:${String(tick).padStart(3, "0")}`, lx + 6, ty + k.tool / 2 + 1);
    g.font = `11px "DejaVu Sans Mono", monospace`;
    g.fillText(keyLong(c.fr.key), lx + 128, ty + k.tool / 2 + 1);
    // The status bar.
    bevel(g, 0, rollBot, W, k.status);
    bevel(g, 2, rollBot + 2, W * 0.45, k.status - 4, true);
    bevel(g, W * 0.45 + 4, rollBot + 2, W * 0.55 - 6, k.status - 4, true);
    g.fillStyle = "#000";
    g.font = `11px "Liberation Sans", Arial, sans-serif`;
    g.textAlign = "left";
    g.fillText(`FUGUE${String(c.f.number).padStart(2, "0")}.MID · Track ${v0 + 1}: ${c.names[v0] ?? ""}`, 6, rollBot + k.status / 2 + 1);
    const cur = c.entries.filter((e) => e.sounding).sort((a, b) => b.on - a.on)[0];
    g.fillText(`${cur ? `Marker: ${entryWord(cur)} · ${c.names[cur.voice]}` : "No marker"}   Score ${Math.round(c.game?.score ?? 0)}`, W * 0.45 + 8, rollBot + k.status / 2 + 1);
  },
};
