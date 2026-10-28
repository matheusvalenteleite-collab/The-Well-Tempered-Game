/**
 * D298: engraves the fugues for the SHEET mode, at build time, with Verovio (6.3.0, the Humdrum build):
 * each fugue as **kern (D366: written from the game's own notes by to-kern.ts; D298 read the Humdrum encodings)
 * laid out as the two staves of an Urtext ("grand")
 * and as one staff per voice ("open") (kern-layout.ts), on one long system (no breaks), in the style
 * SHEET_STYLE (D300: "henle", Leland with fine lines; SHEET_STYLES has the candidates the owner was
 * shown, and D298's). Verovio's SVG is read into a
 * compact drawing (sheet-format.ts): the glyphs by name (one shared table of the font's outlines,
 * public/sheet/glyphs-<font>.json), the lines, beams and ties as numbers, every mark of a note (head,
 * stem, flag, beam, accidental, dot, tie, rest, ornament) under its voice so that the page colours it
 * in the voice's colour; the notes (voice, tick, MIDI, head's place) for the game's marks; the time map
 * (each onset's tick and x) the playhead follows; the bars' places.
 * Run: node tools/sheet/engrave.ts [id…]   (Verovio: `npm i --no-save verovio@6.3.0`, or VEROVIO_DIR=…/verovio)
 * Writes public/sheet/<id>.grand.json, <id>.open.json and glyphs-<font>.json.
 * For a comparison: --style=<name> (one of SHEET_STYLES) --out=<dir>.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { kernPitch } from "../../src/wtc/kern.ts";
import { parsePitch } from "../../src/music/pitch.ts";
import { layoutKern, type SheetLayout } from "./kern-layout.ts";
import { fugueKern } from "./to-kern.ts";
import { GLYPH_SCALE, SHEET_UNIT, timeMap, type SheetData, type SheetNote } from "../../src/bench/sheet-format.ts";

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pieces: { id: string; kind: string; tpq: number; voices: [number, number, number, number][][] }[] = JSON.parse(readFileSync(root("data/touch/pieces.json"), "utf8"));

async function verovio() {
  const dir = process.env.VEROVIO_DIR;
  const mod = dir ? await import(pathToFileURL(`${dir}/dist/verovio-module-hum.mjs`).href) : await import("verovio/wasm-hum" as string);
  const esm = dir ? await import(pathToFileURL(`${dir}/dist/verovio.mjs`).href) : await import("verovio/esm" as string);
  return new esm.VerovioToolkit(await mod.default());
}

/**
 * The engraving styles (D300): the plate's font and proportions (widths in staff spaces). `d298` the
 * round-three prototype's; the others the candidates for a plate nearer Henle's (D300's comparison, engraved
 * with --style and --out); SHEET_STYLE the one engraved for the game (public/sheet).
 */
export interface SheetStyle {
  font: string;
  staffLineWidth: number;
  stemWidth: number;
  barLineWidth: number;
  ledgerLineThickness: number;
  beamMaxSlope: number;
  spacingLinear: number;
  spacingNonLinear: number;
  /** SMuFL engraving defaults over the font's own (beamThickness, tie and slur thicknesses…). */
  engravingDefaults?: Record<string, number>;
}
/** Thinner lines than Verovio's (an Urtext plate's hairline staves, slender stems), gentler beams, a little more room. */
const FINE = { staffLineWidth: 0.1, stemWidth: 0.12, barLineWidth: 0.16, ledgerLineThickness: 0.16, beamMaxSlope: 4, spacingLinear: 0.34, spacingNonLinear: 0.62 };
export const SHEET_STYLES: Record<string, SheetStyle> = {
  d298: { font: "Leipzig", staffLineWidth: 0.13, stemWidth: 0.18, barLineWidth: 0.25, ledgerLineThickness: 0.25, beamMaxSlope: 6, spacingLinear: 0.3, spacingNonLinear: 0.6 },
  leipzigFine: { font: "Leipzig", ...FINE },
  bravuraFine: { font: "Bravura", ...FINE },
  gootville: { font: "Gootville", ...FINE },
  leland: { font: "Leland", ...FINE },
  henle: { font: "Leland", staffLineWidth: 0.1, stemWidth: 0.12, barLineWidth: 0.16, ledgerLineThickness: 0.16, beamMaxSlope: 4, spacingLinear: 0.31, spacingNonLinear: 0.62 },
};
export const SHEET_STYLE = "henle";

/** One endless system in a style. */
export function options(layout: SheetLayout, style: SheetStyle = SHEET_STYLES[SHEET_STYLE]) {
  return {
    inputFrom: "humdrum",
    breaks: "none",
    scale: 40,
    pageHeight: 60000,
    pageWidth: 100000,
    adjustPageHeight: true,
    adjustPageWidth: true,
    spacingStaff: layout === "open" ? 6 : 9,
    spacingSystem: 0,
    header: "none",
    footer: "none",
    svgViewBox: true,
    spacingLinear: style.spacingLinear,
    spacingNonLinear: style.spacingNonLinear,
    staffLineWidth: style.staffLineWidth,
    stemWidth: style.stemWidth,
    barLineWidth: style.barLineWidth,
    ledgerLineThickness: style.ledgerLineThickness,
    beamMaxSlope: style.beamMaxSlope,
    ...(style.engravingDefaults ? { engravingDefaults: style.engravingDefaults } : {}),
    mnumInterval: 0,
    font: style.font,
    pageMarginLeft: 0,
    pageMarginRight: 0,
    pageMarginTop: 0,
    pageMarginBottom: 0,
  };
}

/** A path's bounding box (absolute and relative M L H V C S Q T Z; the control points count). */
function bbox(d: string): [number, number, number, number] {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "M";
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const at = (px: number, py: number) => ((b[0] = Math.min(b[0], px)), (b[1] = Math.min(b[1], py)), (b[2] = Math.max(b[2], px)), (b[3] = Math.max(b[3], py)));
  let i = 0;
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") {
      (x = sx), (y = sy);
      continue;
    }
    const n = C === "H" || C === "V" ? 1 : C === "C" ? 6 : C === "S" || C === "Q" ? 4 : 2;
    const v: number[] = [];
    for (let k = 0; k < n; k++) v.push(num());
    if (v.some((q) => Number.isNaN(q))) break;
    if (C === "H") x = rel ? x + v[0] : v[0];
    else if (C === "V") y = rel ? y + v[0] : v[0];
    else {
      for (let k = 0; k < n; k += 2) at(rel ? x + v[k] : v[k], rel ? y + v[k + 1] : v[k + 1]);
      x = rel ? x + v[n - 2] : v[n - 2];
      y = rel ? y + v[n - 1] : v[n - 1];
    }
    at(x, y);
    if (C === "M") {
      (sx = x), (sy = y);
      cmd = rel ? "l" : "L";
    }
  }
  return b as [number, number, number, number];
}

/** The classes whose marks belong to a voice (coloured): a note and everything drawn for it. */
const VOICED = new Set(["note", "rest", "chord", "beam", "tie", "slur", "mRest", "multiRest", "tuplet", "beamSpan", "mordent", "trill", "turn", "ornam", "fermata", "arpeg", "artic", "dots"]);

interface Group {
  cls: string;
  id: string;
}

/** Reads Verovio's SVG into the compact drawing. */
export function readSvg(svg: string, voiceAt: Map<string, number>, glyphs: Map<string, { d: string; box: [number, number, number, number] }>) {
  // The glyph outlines (defs: <g id="E0A4-xyz"><path transform="scale(1,-1)" d="…"/></g>).
  for (const m of svg.matchAll(/<g id="([0-9A-F]{4})-[a-z0-9]+"\s*>\s*<path transform="scale\(1,-1\)" d="([^"]+)"/g)) if (!glyphs.has(m[1])) glyphs.set(m[1], { d: m[2], box: bbox(m[2]) });
  const inner = /<svg class="definition-scale"[^>]*viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  if (!inner) throw new Error("no definition-scale");
  const W = Number(inner[1]);
  const H = Number(inner[2]);
  const body = svg.slice(svg.indexOf('class="definition-scale"'));
  const stack: Group[] = [];
  /** Draw lists: index 0 black, v + 1 voice v. */
  const ink: number[][] = [];
  const curves: [number, number, string][] = [];
  const list = (k: number) => (ink[k] ??= []);
  const heads = new Map<string, { x: number; y: number; w: number }>();
  const barsX: { id: string; x: number }[] = [];
  const staffLines: number[][] = [];
  /** Where the metre sign begins (the clefs and keys before it: the column kept at the left as the music scrolls). */
  let meterX = Infinity;
  const voiceOf = (): number => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const g = stack[i];
      const cls = g.cls.split(" ")[0];
      if (!VOICED.has(cls)) continue;
      const m = /L(\d+)F(\d+)/.exec(g.id);
      if (m) {
        const v = voiceAt.get(`${m[1]}:${m[2]}`);
        if (v !== undefined) return v;
      }
    }
    return -1;
  };
  const within = (cls: string) => stack.some((g) => g.cls.split(" ")[0] === cls);
  const nearest = (cls: string) => [...stack].reverse().find((g) => g.cls.split(" ")[0] === cls);
  const attr = (a: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(a)?.[1];
  let skipText = 0;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, close, tag, a, self] = m;
    if (tag === "g") {
      if (close) stack.pop();
      else if (!self) stack.push({ cls: attr(a, "class") ?? "", id: attr(a, "id") ?? attr(a, "data-id") ?? "" });
      continue;
    }
    if (tag === "text") {
      skipText += close ? -1 : self ? 0 : 1;
      continue;
    }
    if (close || skipText > 0) continue;
    if (within("mNum") || within("tempo")) continue;
    const v = voiceOf();
    const out = list(v + 1);
    if (tag === "use") {
      const href = attr(a, "xlink:href") ?? attr(a, "href") ?? "";
      const code = /#([0-9A-F]{4})-/.exec(href)?.[1];
      const t = /translate\((-?[\d.]+),\s*(-?[\d.]+)\)\s*scale\(([\d.]+),\s*([\d.]+)\)/.exec(attr(a, "transform") ?? "");
      if (!code || !t) continue;
      const x = Math.round(Number(t[1]));
      const y = Math.round(Number(t[2]));
      const s = Math.round(Number(t[3]) * 100);
      out.push(0, parseInt(code, 16), x, y, s);
      if (within("meterSig")) meterX = Math.min(meterX, x);
      const note = nearest("note");
      if (within("notehead") && note && !heads.has(note.id)) {
        const g = glyphs.get(code);
        const sc = Number(t[3]);
        const w = g ? (g.box[2] - g.box[0]) * sc : 220;
        heads.set(note.id, { x: x + (g ? g.box[0] * sc : 0) + w / 2, y, w });
      }
    } else if (tag === "path") {
      const d = attr(a, "d") ?? "";
      const sw = Math.round(Number(attr(a, "stroke-width") ?? 0));
      const line = /^M(-?\d+)[ ,](-?\d+) L(-?\d+)[ ,](-?\d+)$/.exec(d.trim());
      if (line) {
        const [x1, y1, x2, y2] = line.slice(1).map(Number);
        out.push(1, x1, y1, x2, y2, sw);
        if (within("barLine") && !within("note")) {
          const ms = nearest("measure");
          if (ms) barsX.push({ id: ms.id, x: x1 });
        }
        if (stack.at(-1)?.cls === "staff" && y1 === y2) {
          const st = stack.filter((g) => g.cls.split(" ")[0] === "staff").length;
          if (st) (staffLines[0] ??= []).push(y1);
        }
      } else curves.push([v + 1, sw, d]);
    } else if (tag === "polygon") {
      const pts = (attr(a, "points") ?? "").trim().split(/[\s,]+/).map(Number);
      out.push(2, pts.length / 2, ...pts.map(Math.round));
    } else if (tag === "rect") {
      const x = Number(attr(a, "x") ?? 0);
      const y = Number(attr(a, "y") ?? 0);
      const w = Number(attr(a, "width") ?? 0);
      const h = Number(attr(a, "height") ?? 0);
      out.push(2, 4, ...[x, y, x + w, y, x + w, y + h, x, y + h].map(Math.round));
    } else if (tag === "ellipse") {
      const cx = Number(attr(a, "cx"));
      const cy = Number(attr(a, "cy"));
      const rx = Number(attr(a, "rx"));
      const ry = Number(attr(a, "ry"));
      curves.push([v + 1, 0, `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`]);
    }
  }
  for (let k = 0; k < ink.length; k++) ink[k] ??= [];
  const lines = [...new Set(staffLines[0] ?? [])].sort((p, q) => p - q);
  return { W, H, ink, curves, heads, barsX, lines, meterX };
}

/** A note's id → its tick (the time map's quarter-note stamps) and MIDI pitch. */
interface Onset {
  id: string;
  q: number;
}

export async function engrave(tk: { setOptions(o: object): void; loadData(s: string): boolean; renderToSVG(p: number): string; renderToTimemap(o?: object): { qstamp: number; on?: string[] }[]; getLog(): string }, id: string, layout: SheetLayout, glyphs: Map<string, { d: string; box: [number, number, number, number] }>, style: SheetStyle = SHEET_STYLES[SHEET_STYLE]): Promise<SheetData> {
  const piece = pieces.find((p) => p.id === id);
  if (!piece) throw new Error(`no piece ${id}`);
  // D366: the kern written from the game's own notes (to-kern.ts), not the Humdrum encodings.
  const src = fugueKern(id);
  const medians = piece.voices.map((v) => {
    const s = v.map((n) => n[2]).sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? 60;
  });
  const L = layoutKern(src, layout, medians);
  tk.setOptions(options(layout, style));
  if (!tk.loadData(L.kern)) throw new Error(`${id} ${layout}: Verovio refused the kern`);
  const svg = tk.renderToSVG(1);
  const r = readSvg(svg, L.voiceAt, glyphs);
  const tm = tk.renderToTimemap({ includeMeasures: false });
  const onsets: Onset[] = [];
  for (const e of tm) for (const nid of e.on ?? []) onsets.push({ id: nid, q: e.qstamp });
  const tpq = piece.tpq;
  const kernLines = L.kern.split("\n");
  const notes: SheetNote[] = [];
  for (const o of onsets) {
    const m = /L(\d+)F(\d+)(?:S(\d+))?/.exec(o.id);
    const voice = m ? L.voiceAt.get(`${m[1]}:${m[2]}`) : undefined;
    const head = r.heads.get(o.id);
    if (!m || voice === undefined || !head) continue;
    // The pitch from the token itself (Verovio's MIDI values leave the key signature out).
    const tok = (kernLines[Number(m[1]) - 1] ?? "").split("\t")[Number(m[2]) - 1] ?? "";
    const spelled = kernPitch(tok.split(" ")[m[3] ? Number(m[3]) - 1 : 0] ?? "");
    if (!spelled) continue;
    const midi = parsePitch(spelled).midi;
    notes.push([voice, Math.round(o.q * tpq), midi, Math.round(head.x), Math.round(head.y)]);
  }
  notes.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  // The end: the last bar line, at the piece's length (the time map itself is the notes', sheet-format.ts timeMap).
  const lastBar = Math.max(...r.barsX.map((b) => b.x));
  const length = piece.voices.flat().reduce((m, n) => Math.max(m, n[0] + n[1]), 0);
  const end: [number, number] = [length, Math.round(lastBar)];
  const map = timeMap(notes, end);
  // The bars: each measure's number (its kern bar line) and where it begins (the bar line before it).
  const measures = [...new Map(r.barsX.map((b) => [b.id, b.x])).entries()].sort((a, b) => a[1] - b[1]);
  const bars: [number, number][] = [];
  let prevX = map.length ? map[0][1] - SHEET_UNIT : 0;
  for (const [mid, x] of measures) {
    const lm = /L(\d+)/.exec(mid);
    // The first measure (L1) is bar 1 where the music opens with "=1", else an upbeat (no number).
    const at = lm ? (lm[1] === "1" ? kernLines.findIndex((l) => /^[^*!]/.test(l)) + 1 : Number(lm[1])) : 0;
    const n = Number(/^=(\d+)/.exec(kernLines[at - 1] ?? "")?.[1] ?? NaN);
    if (!Number.isNaN(n)) bars.push([n, Math.round(prevX)]);
    prevX = x;
  }
  // The staves: their top lines (five lines a staff, top first) and their voices.
  const tops: number[] = [];
  for (let i = 0; i + 4 < r.lines.length; i += 5) tops.push(r.lines[i]);
  // Packed (sheet-format.ts): x as steps from the mark before, the glyphs by their place in a table.
  const codes = [...new Set(r.ink.flatMap((list) => glyphCodes(list)))].sort((a, b) => a - b);
  let px = 0;
  const packed = notes.map(([v, t, midi, x, y], i) => {
    const dt = t - (i ? notes[i - 1][1] : 0);
    const dx = x - px;
    px = x;
    return [v, dt, midi, dx, y];
  });
  return {
    v: 2,
    id,
    layout,
    font: style.font,
    w: r.W,
    h: r.H,
    staves: L.staves.map((voices, k) => ({ top: tops[k] ?? 0, voices })),
    voices: L.voices,
    bars,
    end,
    lead: Math.round(Number.isFinite(r.meterX) ? r.meterX : (notes[0]?.[3] ?? 2 * SHEET_UNIT) - 1.5 * SHEET_UNIT),
    glyphs: codes,
    notes: packed.flat(),
    ink: r.ink.map((list) => packInk(list, codes)),
    curves: r.curves,
  };
}

/** The glyphs a list of absolute records draws. */
function glyphCodes(list: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < list.length; ) {
    const k = list[i];
    if (k === 0) (out.push(list[i + 1]), (i += 5));
    else if (k === 1) i += 6;
    else i += 2 + 2 * list[i + 1];
  }
  return out;
}

/** Absolute records (readSvg) → packed (sheet-format.ts). */
function packInk(list: number[], codes: number[]): number[] {
  const out: number[] = [];
  let px = 0;
  for (let i = 0; i < list.length; ) {
    const k = list[i];
    if (k === 0) {
      const [, code, x, y, s] = list.slice(i, i + 5);
      const gi = codes.indexOf(code);
      if (s === GLYPH_SCALE) out.push(0, gi, x - px, y);
      else out.push(3, gi, x - px, y, s);
      px = x;
      i += 5;
    } else if (k === 1) {
      const [, x1, y1, x2, y2, w] = list.slice(i, i + 6);
      out.push(1, x1 - px, y1, x2 - x1, y2 - y1, w);
      px = x1;
      i += 6;
    } else {
      const n = list[i + 1];
      const pts = list.slice(i + 2, i + 2 + 2 * n);
      out.push(2, n, pts[0] - px, pts[1]);
      for (let j = 1; j < n; j++) out.push(pts[2 * j] - pts[0], pts[2 * j + 1]);
      px = pts[0];
      i += 2 + 2 * n;
    }
  }
  return out;
}

async function main() {
  // --style=<name> (SHEET_STYLES; default SHEET_STYLE), --out=<dir> (default public/sheet): for comparisons.
  const flags = new Map(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const style = SHEET_STYLES[flags.get("style") ?? SHEET_STYLE];
  if (!style) throw new Error(`no style ${flags.get("style")}`);
  const ids = args.length ? args : pieces.filter((p) => p.kind === "fugue" && /^wtc[12]f\d\d$/.test(p.id)).map((p) => p.id);
  const tk = await verovio();
  const glyphs = new Map<string, { d: string; box: [number, number, number, number] }>();
  const dir = flags.get("out") ?? root("public/sheet");
  mkdirSync(dir, { recursive: true });
  for (const id of ids) {
    for (const layout of ["grand", "open"] as const) {
      const t = performance.now();
      const data = await engrave(tk, id, layout, glyphs, style);
      const json = JSON.stringify(data);
      writeFileSync(`${dir}/${id}.${layout}.json`, json);
      const log = tk.getLog().trim();
      console.log(`${id} ${layout}: ${data.notes.length} notes, ${(json.length / 1024).toFixed(0)} KB, ${Math.round(performance.now() - t)} ms${log ? ` · ${log.split("\n").length} log lines` : ""}`);
    }
  }
  // Every glyph met so far (the table is shared: merge with what is there).
  const file = `${dir}/glyphs-${style.font}.json`;
  let table: Record<string, [string, number[]]> = {};
  try {
    table = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    /* none yet */
  }
  for (const [code, g] of glyphs) table[parseInt(code, 16)] = [g.d, g.box];
  writeFileSync(file, JSON.stringify(table));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
