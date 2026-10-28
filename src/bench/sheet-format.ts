/**
 * D298: the SHEET mode's engraving, as tools/sheet/engrave.ts writes it (public/sheet/<id>.<layout>.json)
 * and the page reads it: pure (no DOM), so the time map is tested in node.
 *
 * Units: Verovio's (SHEET_UNIT to a staff space). The drawing is one long system: `ink[0]` the black
 * marks (staff lines, bar lines, clefs, keys, metre, ledger lines), `ink[v + 1]` voice v's marks (heads,
 * stems, flags, beams, accidentals, dots, rests, ornaments), each a flat list of records, every x but a
 * record's own offsets counted from the x of the record before (dx; the first from 0):
 *   0, glyph, dx, y                    a glyph of the music font at GLYPH_SCALE (glyph: its place in `glyphs`,
 *                                      the code points; outlines in glyphs-<font>.json)
 *   3, glyph, dx, y, scale×100         a glyph at another scale (a grace note's)
 *   1, dx, y1, x2 − x1, y2 − y1, width  a line (staff line, stem, bar line, ledger line)
 *   2, n, dx, y1, then n − 1 × (xi − x1, yi)  a filled polygon (a beam)
 * `curves`: [ink index, stroke width, SVG path in absolute units] (ties, slurs: filled crescents).
 * `notes`: each engraved note, five numbers flat: voice, tick (from the note before), MIDI, head's
 * centre x (from the note before), y (a tie's continuation not one).
 * The time map (timeMap): each onset [tick, x] (the middle of its heads), x strictly rising, then
 * `end`; the playhead runs through it, linear between two onsets, so the engraver's spacing is followed
 * note by note and the clock (the engine's ticks, the final ritard in them) moves the page.
 */

/** The music font (D300: Leland, its oval, tilted heads nearer a Henle plate than Leipzig's; tools/sheet/engrave.ts SHEET_STYLE). */
export const SHEET_FONT = "Leland";
/** Verovio's units to a staff space. */
export const SHEET_UNIT = 180;
/** A full-size glyph's scale (×100): the font's 1000 units to Verovio's 720 an em. */
export const GLYPH_SCALE = 72;

export type SheetLayoutId = "grand" | "open";

export interface SheetData {
  v: 2;
  id: string;
  layout: SheetLayoutId;
  font: string;
  /** The system's width and height (units). */
  w: number;
  h: number;
  /** Top first: each staff's top line (y, units) and its voices (top voice first). */
  staves: { top: number; voices: number[] }[];
  voices: number;
  /** [bar number, x where it begins]. */
  bars: [number, number][];
  /** The piece's end: [length in ticks, the last bar line's x]. */
  end: [number, number];
  /** Where the opening's clefs and key signatures end (the metre sign's x): the column kept at the left. */
  lead: number;
  glyphs: number[];
  notes: number[];
  ink: number[][];
  curves: [number, number, string][];
}

export type SheetNote = [voice: number, tick: number, midi: number, x: number, y: number];

/** The notes unpacked (absolute ticks and x). */
export function sheetNotes(d: Pick<SheetData, "notes">): SheetNote[] {
  const out: SheetNote[] = [];
  let t = 0;
  let x = 0;
  for (let i = 0; i + 4 < d.notes.length; i += 5) {
    t += d.notes[i + 1];
    x += d.notes[i + 3];
    out.push([d.notes[i], t, d.notes[i + 2], x, d.notes[i + 4]]);
  }
  return out;
}

/**
 * The time map from the notes (absolute, by tick): each onset at the middle of its heads (the median),
 * or, where `voice` (the player's) has a note, at that voice's own head, so the playhead goes through
 * the player's heads exactly (the engraver moves a head aside for a unison or a second between voices,
 * and a half note's head is wider than a quarter's); never back; then the end.
 */
export function timeMap(notes: SheetNote[], end: [number, number], voice = -1): [number, number][] {
  const byTick = new Map<number, { all: number[]; mine: number[] }>();
  for (const n of notes) {
    let at = byTick.get(n[1]);
    if (!at) byTick.set(n[1], (at = { all: [], mine: [] }));
    at.all.push(n[3]);
    if (n[0] === voice) at.mine.push(n[3]);
  }
  const mid = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
  const map: [number, number][] = [...byTick.entries()].sort((a, b) => a[0] - b[0]).map(([t, x]) => [t, mid(x.mine.length ? x.mine : x.all)]);
  // A crowded onset may sit a hair left of the one before: the playhead never goes back.
  for (let i = 1; i < map.length; i++) if (map[i][1] <= map[i - 1][1]) map[i][1] = map[i - 1][1] + 1;
  const last = map[map.length - 1];
  if (last && end[0] > last[0] && end[1] > last[1]) map.push([end[0], end[1]]);
  return map;
}

/** Each absolute record of a packed list, in order (a visitor: no arrays made per mark). */
export function eachMark(
  list: number[],
  glyph: (gi: number, x: number, y: number, scale: number) => void,
  line: (x1: number, y1: number, x2: number, y2: number, w: number) => void,
  poly: (list: number[], at: number, n: number, x1: number) => void,
) {
  let px = 0;
  for (let i = 0; i < list.length; ) {
    const k = list[i];
    if (k === 0 || k === 3) {
      px += list[i + 2];
      glyph(list[i + 1], px, list[i + 3], k === 3 ? list[i + 4] : GLYPH_SCALE);
      i += k === 3 ? 5 : 4;
    } else if (k === 1) {
      px += list[i + 1];
      line(px, list[i + 2], px + list[i + 3], list[i + 2] + list[i + 4], list[i + 5]);
      i += 6;
    } else {
      const n = list[i + 1];
      px += list[i + 2];
      poly(list, i + 3, n, px);
      i += 4 + 2 * (n - 1);
    }
  }
}

/** x (units) at a tick: linear between the onsets around it; before the first, after the last, at its speed. */
export function xAtTick(map: [number, number][], tick: number): number {
  const n = map.length;
  if (n === 0) return 0;
  if (n === 1) return map[0][1];
  if (tick <= map[0][0]) {
    const k = (map[1][1] - map[0][1]) / Math.max(1, map[1][0] - map[0][0]);
    return map[0][1] - (map[0][0] - tick) * k;
  }
  if (tick >= map[n - 1][0]) {
    const k = (map[n - 1][1] - map[n - 2][1]) / Math.max(1, map[n - 1][0] - map[n - 2][0]);
    return map[n - 1][1] + (tick - map[n - 1][0]) * k;
  }
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (map[mid][0] <= tick) lo = mid;
    else hi = mid;
  }
  const [t0, x0] = map[lo];
  const [t1, x1] = map[hi];
  return x0 + ((tick - t0) / (t1 - t0)) * (x1 - x0);
}

/** The tick at an x (the map's inverse), for the tiles in view and the tests. */
export function tickAtX(map: [number, number][], x: number): number {
  const n = map.length;
  if (n < 2) return map[0]?.[0] ?? 0;
  let lo = 0;
  let hi = n - 1;
  if (x <= map[0][1]) (lo = 0), (hi = 1);
  else if (x >= map[n - 1][1]) (lo = n - 2), (hi = n - 1);
  else
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (map[mid][1] <= x) lo = mid;
      else hi = mid;
    }
  const [t0, x0] = map[lo];
  const [t1, x1] = map[hi];
  return t0 + ((x - x0) / (x1 - x0)) * (t1 - t0);
}

/** The engraved heads by voice, tick and pitch ("v:tick:midi"). */
export function noteIndex(notes: SheetNote[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  for (const [v, t, midi, x, y] of notes) {
    const k = `${v}:${t}:${midi}`;
    if (!m.has(k)) m.set(k, { x, y });
  }
  return m;
}

// ---------------------------------------------------------------- D300: the page's rules (pure, tested in node)

/** The voices' colours on paper (top voice first): the game's hues (MusicBox INKS), dark enough for white. */
const PAPER_INKS: Record<number, string[]> = {
  2: ["#24589A", "#23744C"],
  3: ["#24589A", "#B24A17", "#23744C"],
  4: ["#24589A", "#B24A17", "#6E3FA0", "#23744C"],
  5: ["#24589A", "#17767A", "#B24A17", "#6E3FA0", "#23744C"],
};
export function paperInk(voice: number, count: number): string {
  return (PAPER_INKS[count] ?? PAPER_INKS[4])[voice] ?? SHEET_INK;
}
/** The page's black. */
export const SHEET_INK = "#141414";

/**
 * A mark's ink (k: its ink list, 0 the black marks, v + 1 voice v's). TWO STAVES: every voice in its colour
 * (on two staves the colour is what tells four voices apart); ONE STAFF PER VOICE: all black, as printed
 * (the staves tell the voices apart; the player's staff is marked at the clefs, the ring and the playhead
 * in the player's colour).
 */
export function markInk(layout: SheetLayoutId, k: number, voices: number): string {
  return k === 0 || layout === "open" ? SHEET_INK : paperInk(k - 1, voices);
}

/**
 * The playhead's place across the box: 35% into the score (the box right of the clefs' column), so about
 * a third of the music in sight is what was played and two thirds what is coming (the player reads
 * ahead); on an iPhone sideways about 45% from the box's left edge.
 */
export const SHEET_PLAYHEAD = 0.35;
export function playheadX(w: number, column: number): number {
  return Math.round(column + SHEET_PLAYHEAD * Math.max(0, w - column));
}

/** An entry's band behind its notes (units). */
export interface Band {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * An entry's band: from its first head to its last (0.9 space beyond each); in the two staves hugging the
 * voice's own heads (0.9 space above the highest and below the lowest: the other voice on the staff
 * mostly outside it), in the open score its staff (a space above and below, heads on ledger lines in it).
 * `heads`: the entry's heads (centres), in order. Null where there is none.
 */
export function entryBand(d: Pick<SheetData, "layout" | "staves">, voice: number, heads: { x: number; y: number }[]): Band | null {
  if (!heads.length) return null;
  const x0 = heads[0].x - 0.9 * SHEET_UNIT;
  const x1 = heads[heads.length - 1].x + 0.9 * SHEET_UNIT;
  const ys = heads.map((h) => h.y);
  let y0 = Math.min(...ys) - 0.9 * SHEET_UNIT;
  let y1 = Math.max(...ys) + 0.9 * SHEET_UNIT;
  if (d.layout === "open") {
    const staff = d.staves.find((s) => s.voices.includes(voice));
    if (staff) {
      y0 = Math.min(y0, staff.top - SHEET_UNIT);
      y1 = Math.max(y1, staff.top + 5 * SHEET_UNIT);
    }
  }
  return { x0, x1, y0, y1 };
}

/** The display modes (⚙ on play.html): today's box, CANTUS (to come), the two sheets. */
export type DisplayMode = "default" | "cantus" | "sheet2" | "sheetN";
export const DISPLAY_MODES: DisplayMode[] = ["default", "cantus", "sheet2", "sheetN"];
export const DISPLAY_KEY = "tb-display-v1";

/** A stored value read as a mode (anything else: DEFAULT). */
export function displayOf(v: unknown): DisplayMode {
  return typeof v === "string" && (DISPLAY_MODES as string[]).includes(v) ? (v as DisplayMode) : "default";
}

/** The display chosen, kept on the device (DEFAULT where nothing is, or storage is refused). */
export function readDisplay(): DisplayMode {
  try {
    return displayOf(typeof localStorage === "undefined" ? null : localStorage.getItem(DISPLAY_KEY));
  } catch {
    return "default";
  }
}
export function saveDisplay(m: DisplayMode) {
  try {
    if (m === "default") localStorage.removeItem(DISPLAY_KEY);
    else localStorage.setItem(DISPLAY_KEY, m);
  } catch {
    /* this visit only */
  }
}

/** What is drawn for a mode: CANTUS falls back to the box until it is built. */
export function drawnAs(m: DisplayMode): "default" | "sheet2" | "sheetN" {
  return m === "cantus" ? "default" : m;
}

/** The engraving a mode reads. */
export function layoutOf(m: DisplayMode): SheetLayoutId | null {
  const d = drawnAs(m);
  return d === "sheet2" ? "grand" : d === "sheetN" ? "open" : null;
}

/** The pieces engraved (the 48 fugues; not the preludes, not the Art of Fugue's XIV: no kern). */
export function engraved(id: string): boolean {
  return /^wtc[12]f\d\d$/.test(id);
}

/** D327: the display chosen for each piece (piece id → mode), kept on the device. */
export const DISPLAY_BY_PIECE_KEY = "tb-display-by-piece-v1";

function byPiece(): Record<string, DisplayMode> {
  try {
    const v = typeof localStorage === "undefined" ? null : localStorage.getItem(DISPLAY_BY_PIECE_KEY);
    const o: unknown = v ? JSON.parse(v) : {};
    return Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([, m]) => displayOf(m) === m)) as Record<string, DisplayMode>;
  } catch {
    return {};
  }
}

/**
 * D327: the display for a piece: the one chosen for it, else the last display chosen (D298's), else
 * DEFAULT. (D354: the four-and-five-voice fugues no longer open on the sheet by themselves.)
 */
export function displayFor(piece: string, voices: number, tutorialDone: boolean): DisplayMode {
  const mine = byPiece()[piece];
  if (mine) return mine;
  // D354: no piece switches to the sheet by itself any more (the owner: "beware of some fugues which are
  // switching interface to sheet … don't let it do that"); D327's four-and-five-voice rule withdrawn.
  void voices, void tutorialDone;
  return readDisplay();
}
export function saveDisplayFor(piece: string, m: DisplayMode) {
  try {
    localStorage.setItem(DISPLAY_BY_PIECE_KEY, JSON.stringify({ ...byPiece(), [piece]: m }));
  } catch {
    /* this visit only */
  }
}
