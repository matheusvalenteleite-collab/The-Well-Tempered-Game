/**
 * Two-staff score (cantus in whole notes; counterpoint in the slots of its species layout).
 * VexFlow draws; input is ours: a click or tap on the counterpoint staff places/replaces the
 * note of the nearest slot ("column") at that staff position.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accidental, Dot, ModifierContext, Renderer, Stave, StaveConnector, StaveNote, StaveTie, TickContext } from "vexflow";
import { parsePitch } from "../../music/pitch.ts";
import { noteName, type NameStyle } from "../../music/names.ts";
import { harmonic, simpleName } from "../../counterpoint/interval.ts";
import type { Staff } from "../../music/fux/types.ts";
import { pitchAtPosition, VEXFLOW_CLEF, type ClefId } from "./clefs.ts";
import type { Overlay, Status } from "./overlay.ts";
import { fifthGlyphs, HOLD, REST, slotLayout, tiedToNext, type Slot } from "../../counterpoint/layout.ts";
import type { ContinuoRealization } from "../../continuo/types.ts";
import { cueChords, cueFigures, drawFigureLine, type CueChord } from "./continuo-staff.ts";

/** Logical width of bar b of a layout, and of the clef and signature before the first bar (D83). */
export function barWidth(layout: Slot[], b: number): number {
  const first = layout[0]?.bar ?? 0;
  const n = layout.filter((sl) => sl.bar - first === b).length;
  return n > 4 ? 212 : n > 2 ? 148 : n > 1 ? 92 : 58;
}
export const SCORE_LEAD = 96;

export interface ScoreProps {
  /** One whole note per bar. */
  cantus: string[];
  /** One entry per slot of `layout` (pitch, REST or null). */
  counterpoint: (string | null)[];
  /** Slot layout of the counterpoint; default first species (one slot per bar). */
  layout?: Slot[];
  cantusVoice: Staff;
  /** Clef of the upper and lower staff. */
  clefs: [ClefId, ClefId];
  /** Selected slot, or -1. */
  selected: number;
  /** Slot sounding during playback, or -1. */
  cursor: number;
  onPlace(column: number, naturalPitch: string): void;
  onSelect(column: number): void;
  label: string;
  /** Slots marked after evaluation. */
  marks?: { column: number; severity: "error" | "warning" }[];
  /** Bars (0-based, in this score) pointed at in a text: they pulse (D96). */
  pulse?: number[];
  readOnly?: boolean;
  /** Bar number of the first bar (excerpts start mid-exercise). Default 1. */
  firstBar?: number;
  /** Fux's line is what plays (D76): the player's line and its versions fade to a trace. */
  fadePlayer?: boolean;
  /** Fixed drawing scale (for excerpts); otherwise the scale follows the width. */
  fixedScale?: number;
  /** Logical width to spread the bars over (a justified system); never narrower than the bars need. */
  fillWidth?: number;
  /** Drawing scale chosen by the zoom (the layout stays the full score's). */
  drawScale?: number;
  /** Evaluation overlay: intervals between the staves and problem connectors. */
  overlay?: Overlay;
  /** Live drag of a counterpoint note to another bar and/or pitch; onDragEnd commits. */
  onDrag?(from: number, to: number, naturalPitch: string): void;
  onDragEnd?(): void;
  /** Show a translucent "shadow" note where a click would write. */
  showGhost?: boolean;
  /** Print each note's name beside it, in small type (for readers new to notation). */
  showNames?: boolean;
  /** Letters or do-re-mi (D94). */
  nameStyle?: NameStyle;
  /** Fux's counterpoint (one entry per slot), drawn on the player's staff with diamond noteheads. */
  fux?: (string | null)[];
  /** Fourth species: a note repeated over the bar line (upbeat to downbeat) is drawn tied. */
  ties?: boolean;
  /**
   * Basso continuo under the two staves, cue-sized and in its own ink. It takes no part in input,
   * selection or the overlay, and never moves the two staves: the score grows by its height.
   */
  continuo?: { realization: ContinuoRealization; display: "figured" | "staff" | "realization" | "both" };
  /**
   * Further lines derived from the player's (inversion, retrograde, canon...), drawn on the
   * player's staff in their own ink, named in the legend (D47, D58). With `intervals`, each gets
   * its row of intervals against the cantus, in its ink and in italic.
   */
  extraLines?: { label: string; notes: (string | null)[]; ink: string }[];
  /** Interval rows for the extra lines (the "Intervals" view toggle). */
  extraIntervals?: boolean;
  /** Ink and label of the line on the player's staff when it is a derived version, not the written line. */
  playerInk?: string;
  playerLabel?: string;
  /** Key signature (F mode: one flat, decision D48). */
  signature?: Signature;
  /**
   * Systems (D83): the note each line holds into the first slot from the system before (fifth
   * species), so that its continuation is drawn; and whether this system ends the piece.
   */
  carry?: { counterpoint?: string | null; fux?: string | null; extras?: (string | null)[] };
  lastSystem?: boolean;
  /** Systems (D83): close the staves up unless the overlay needs the room. */
  compact?: boolean;
}

interface Ghost {
  /** Placement of the overlay over the VexFlow drawing, in CSS pixels. */
  box: { left: number; top: number; width: number; height: number; scale: number };
  x: number;
  y: number;
  ledgers: number[];
}

/** Staff positions: close together normally, apart when the evaluation overlay needs the space. */
const LAYOUT = {
  /** Excerpts: close together, apart when the overlay needs the space. */
  plain: { staffY: [20, 120], height: 240 },
  overlay: { staffY: [20, 175], height: 300 },
  /** The main score: one layout whatever is shown, so that nothing moves (D58), a little closer (D102). */
  main: { staffY: [20, 185], height: 310 },
  /** The main score with the continuo realized under it (D102): the staves closer still, the same height. */
  mainContinuo: { staffY: [20, 140], height: 310 },
};
/** Horizontal space per bar (logical units): compact, so the melodic shape reads at a glance. */
const BAR_W = 58;
/** A bar holding two half notes. */
const HALF_BAR_W = 92;
/** A bar holding four quarter notes. */
const QUARTER_BAR_W = 148;
/** Fifth species (D82): a bar of eight quaver slots. */
const EIGHTH_BAR_W = 212;
/** VexFlow duration and dots for a note of n quaver slots (fifth species). */
const FIFTH_DUR: Record<number, [string, number]> = { 1: ["8", 0], 2: ["q", 0], 3: ["q", 1], 4: ["h", 0], 5: ["h", 0], 6: ["h", 1], 7: ["h", 1], 8: ["w", 0] };
/** VexFlow duration of a slot. */
const vexDur = (sl: Slot): "w" | "h" | "q" => (sl.duration === "1/1" ? "w" : sl.duration === "1/2" ? "h" : "q");
/** Offset of a note name from the notehead's left edge. */
const nameDx = (sl: Slot) => (sl.duration === "1/1" ? 17 : sl.duration === "1/2" ? 13 : 12);
/** Notehead offset from the left edge of its slot. */
const NOTE_PAD = 12;
/** Drawing scale on wide screens. */
const BASE_SCALE = 1;
/** Smallest drawing scale: a longer score is scaled down to fit its box (D64: no scrolling). */
const MIN_SCALE = 0.25;
const COLOR: Record<Status, string> = { ok: "var(--ok)", neutral: "var(--ink-muted)", error: "var(--bad)", warning: "var(--warn)" };
/** Type: a clean sans for labels and numbers; an old-style serif, in italic, for figures and voice labels. */
const UI_FONT = "Inter, system-ui, sans-serif";
const SERIF = "'EB Garamond', Garamond, Georgia, serif";
/** Size of the continuo staves relative to the main staves. */
const CUE = 0.75;
/** Gap (logical) between the score proper and the continuo block. */
const CUE_GAP = -12;
const CONTINUO_INK = "var(--ink-continuo)";
/** Stem direction on the player's staff: up, down, or none (0). */
type Stem = 1 | -1 | 0;
const ACC: Record<number, string> = { [-2]: "bb", [-1]: "b", 1: "#", 2: "##" };

type Signature = { B?: -1 };
/** VexFlow key and the accidental to print, relative to the key signature (a natural where it cancels one). */
function vexKey(pitch: string, sig: Signature = {}): { key: string; acc: string | null } {
  const p = parsePitch(pitch);
  const expected = (sig as Record<string, number>)[p.step] ?? 0;
  const acc = p.alter === expected ? null : (ACC[p.alter] ?? "n");
  return { key: `${p.step.toLowerCase()}${ACC[p.alter] ?? ""}/${p.octave}`, acc };
}

interface Geometry {
  scale: number;
  /** One per slot. */
  columns: { x: number; left: number; right: number }[];
  staves: { top: number; bottom: number; spacing: number }[];
  /** Logical y below which the drawing is the continuo (no input there); absent without it. */
  continuoTop?: number;
}

export function ScoreView(props: ScoreProps) {
  const host = useRef<HTMLDivElement>(null);
  const geo = useRef<Geometry | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || width === 0) return;
    el.innerHTML = "";
    const main = props.fixedScale === undefined && !props.compact;
    const realized = !!props.continuo && props.continuo.display !== "figured" && props.continuo.realization.bars.length === props.cantus.length;
    const { staffY: STAFF_Y, height: HEIGHT } = main ? (realized ? LAYOUT.mainContinuo : LAYOUT.main) : props.overlay || props.extraIntervals ? LAYOUT.overlay : LAYOUT.plain;
    // Overlay rows between the staves: the player's intervals, the links under them, and above
    // them one row per derived line.
    const LABEL_Y = STAFF_Y[1] - 23;
    const LINK_Y = LABEL_Y + 12;
    // Probe the clef/time-signature width, then size the score to its bars instead of the container.
    const probe = new Stave(8, 0, 400);
    const sig = props.signature ?? {};
    const keySpec = sig.B === -1 ? "F" : null;
    probe.addClef(VEXFLOW_CLEF[props.clefs[0]].clef);
    if (keySpec) probe.addKeySignature(keySpec);
    probe.addTimeSignature("C|");
    const noteStart0 = probe.getNoteStartX();
    const layout = props.layout ?? slotLayout("first", props.cantus.length);
    const bars = props.cantus.length;
    const firstSlotBar = layout[0]?.bar ?? 0;
    // Our own horizontal grid (the VexFlow formatter spreads unevenly around empty slots): a bar of
    // one whole note is BAR_W wide, a bar of two half notes HALF_BAR_W.
    const slotsIn = (b: number) => layout.filter((sl) => sl.bar - firstSlotBar === b).length;
    const natural = Array.from({ length: bars }, (_, b) => (slotsIn(b) > 4 ? EIGHTH_BAR_W : slotsIn(b) > 2 ? QUARTER_BAR_W : slotsIn(b) > 1 ? HALF_BAR_W : BAR_W));
    const naturalMusic = natural.reduce((x, w) => x + w, 0);
    const spread = props.fillWidth ? Math.max(1, (props.fillWidth - noteStart0 - 24) / naturalMusic) : 1;
    const barW = natural.map((w) => w * spread);
    // Fifth species: each slot shows the note begun there with its real value (D82).
    // (An excerpt of the final bar alone has no quaver slots: a held note there still marks it.)
    const fifth = layout.some((sl) => sl.duration === "1/8") || [props.counterpoint, props.fux ?? [], ...(props.extraLines ?? []).map((l) => l.notes)].some((l) => l.includes(HOLD));
    type Glyph = { value: string; dur: string; dots: number; tied: boolean };
    const glyphsOf = (line: (string | null | undefined)[], held?: string | null): (Glyph | null)[] =>
      fifth
        ? fifthGlyphs(line, layout, held ?? null).map((g, k) => (g ? { value: g.value, dur: layout[k].duration === "1/1" ? "w" : FIFTH_DUR[g.slots][0], dots: layout[k].duration === "1/1" ? 0 : FIFTH_DUR[g.slots][1], tied: g.tied } : null))
            .map((g) => (g && g.value === HOLD ? null : g))
        : layout.map((sl, k) => (line[k] === null || line[k] === undefined ? null : { value: line[k]!, dur: vexDur(sl), dots: 0, tied: false }));
    const barX: number[] = [];
    barW.reduce((x, w, b) => ((barX[b] = x), x + w), 0);
    const musicWidth = barW.reduce((x, w) => x + w, 0);
    const logicalWidth = noteStart0 + musicWidth + 24;
    const scale = props.fixedScale ?? props.drawScale ?? Math.max(MIN_SCALE, Math.min(BASE_SCALE, width / logicalWidth));

    const staves = props.clefs.map((c, i) => {
      const s = new Stave(8, STAFF_Y[i], logicalWidth - 16);
      const vc = VEXFLOW_CLEF[c];
      s.addClef(vc.clef, "default", vc.annotation);
      if (keySpec) s.addKeySignature(keySpec);
      s.addTimeSignature("C|");
      s.setEndBarType(props.lastSystem === false ? 1 : 3); // final double bar (a plain one inside a system break)
      return s;
    });
    const start = Math.max(...staves.map((s) => s.getNoteStartX()));
    staves.forEach((s) => s.setNoteStartX(start));
    const xOfBar = (b: number) => start + barX[b];

    // The continuo is laid out first (in its own, cue-scaled coordinates) to know its height; it
    // takes no part in input.
    const extras = props.extraLines ?? [];
    const cpClef = VEXFLOW_CLEF[props.clefs[props.cantusVoice === "upper" ? 1 : 0]];
    // Figures alone (D93) sit under the lower staff, as a continuo player reads them, within the
    // score's height; the realization goes under the staves at whatever small size fits the room
    // left there, so that the score never grows when the continuo is shown (D102).
    const scoreBottom = main ? HEIGHT : HEIGHT + (props.continuo?.display === "figured" ? 26 : 0);
    const figuresOnly = props.continuo?.display === "figured" && props.continuo.realization.bars.length === bars;
    const lay = (k: number) => layoutContinuo(props.continuo!, logicalWidth, start, xOfBar, barW, sig, props.lastSystem !== false, k);
    let cueK = CUE;
    let cue = props.continuo && !figuresOnly && props.continuo.realization.bars.length === bars ? lay(CUE) : null;
    let continuoTop = scoreBottom + CUE_GAP;
    const cueHeight = cue?.height ?? 0;
    /** Under the main score, the realization takes the room below `top`, as small as it must be. */
    const fitCue = (top: number) => {
      continuoTop = top;
      cueK = Math.min(CUE, (HEIGHT - top - 2) / cueHeight);
      cue = lay(cueK);
    };
    if (cue && main) fitCue(STAFF_Y[1] + 40 + 30);
    const totalHeight = cue ? (main ? HEIGHT : continuoTop + cue.height * cueK) : scoreBottom;
    let inertTop = cue ? continuoTop : undefined;

    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(Math.ceil(logicalWidth * scale), Math.ceil(totalHeight * scale));
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    const svg = el.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", props.label);
    staves.forEach((s) => s.setContext(ctx));

    const upperIsCantus = props.cantusVoice === "upper";
    const cpIndex = upperIsCantus ? 1 : 0;
    /** A note (or rest) placed with its notehead's left edge at logical x. */
    type Look = "cantus" | "player" | "fux";
    const placed = (staffIndex: number, pitch: string, dur: string, x: number, look: Look, stem?: Stem, dots = 0) => {
      const clef = VEXFLOW_CLEF[props.clefs[staffIndex]].clef;
      let n: StaveNote;
      if (pitch === REST) n = new StaveNote({ keys: [clef === "bass" ? "d/3" : "b/4"], duration: `${dur}r`, clef, dots });
      else {
        const { key, acc } = vexKey(pitch, sig);
        // Fux's notes in diamonds, as in the 1725 print, so they never read as the player's.
        n = new StaveNote({ keys: [look === "fux" ? `${key}/D` : key], duration: dur, clef, dots, ...(stem ? { stem_direction: stem } : {}) });
        if (stem === 0) n.getStem()?.setVisibility(false);
        if (acc) n.addModifier(new Accidental(acc));
        const ink = look === "player" ? (props.playerInk ?? "var(--ink-player)") : look === "fux" ? "var(--ink-fux)" : null;
        if (ink) n.setStyle({ fillStyle: ink, strokeStyle: ink });
      }
      if (dots) Dot.buildAndAttach([n], { all: true });
      n.setStave(staves[staffIndex]);
      const mc = new ModifierContext();
      n.addToModifierContext(mc);
      mc.preFormat();
      const tc = new TickContext();
      tc.addTickable(n);
      tc.preFormat();
      tc.setX(0);
      tc.setX(x - n.getAbsoluteX());
      return n;
    };
    // Stems on the player's staff (D60): with two lines, the higher has its stems up and the lower
    // down; with more, the highest up, the lowest down, and those between without stems. Lines are
    // ranked by their mean pitch, so each keeps one look through the piece.
    const extrasEarly = props.extraLines ?? [];
    const staffLines: { id: string; notes: (string | null | undefined)[] }[] = [
      { id: "player", notes: props.counterpoint },
      ...(props.fux ? [{ id: "fux", notes: props.fux }] : []),
      ...extrasEarly.map((l, i) => ({ id: `extra${i}`, notes: l.notes })),
    ];
    const meanOf = (xs: (string | null | undefined)[]) => {
      const ms = xs.filter((q): q is string => !!q && q !== REST && q !== HOLD).map((q) => parsePitch(q).midi);
      return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
    };
    const ranked = staffLines.map((l) => ({ id: l.id, mean: meanOf(l.notes) })).filter((l) => l.mean !== null).sort((a, b) => b.mean! - a.mean!);
    const stemOf = (id: string): Stem | undefined => {
      if (ranked.length < 2) return undefined;
      const i = ranked.findIndex((l) => l.id === id);
      if (i < 0) return undefined;
      return i === 0 ? 1 : i === ranked.length - 1 ? -1 : 0;
    };
    const cfNotes = props.cantus.map((p, b) => placed(1 - cpIndex, p, "w", xOfBar(b) + NOTE_PAD, "cantus"));
    // Slot geometry: each slot owns its share of the bar; x is the notehead centre.
    const columns = layout.map((sl) => {
      const b = sl.bar - firstSlotBar;
      const share = barW[b] / slotsIn(b);
      const left = xOfBar(b) + sl.beat * share;
      return { left, right: left + share, x: left + NOTE_PAD + (sl.duration === "1/1" ? 8 : 6) };
    });
    const cpGlyphs = glyphsOf(props.counterpoint, props.carry?.counterpoint);
    const cpNotes = layout.map((_, k) => {
      const g = cpGlyphs[k];
      return g ? placed(cpIndex, g.value, g.dur, columns[k].left + NOTE_PAD, "player", stemOf("player"), g.dots) : null;
    });
    // Fux's line: stems down (the player's go up), nudged right where the two notes would collide.
    const fuxGlyphs = props.fux ? glyphsOf(props.fux, props.carry?.fux) : [];
    const fuxNotes = (props.fux ?? []).map((_, k) => {
      const g = fuxGlyphs[k];
      if (!layout[k] || !g || g.value === REST) return null;
      const mine = cpGlyphs[k]?.value;
      const near = mine && mine !== REST && Math.abs(parsePitch(mine).diatonic - parsePitch(g.value).diatonic) <= 1;
      return placed(cpIndex, g.value, g.dur, columns[k].left + NOTE_PAD + (near ? 11 : 0), "fux", stemOf("fux"), g.dots);
    });

    // Column highlights under the music.
    const top = STAFF_Y[0] - 10;
    // The playback cursor runs down through the continuo; marks and selection stay on the score.
    const bottom = STAFF_Y[1] + 100;
    const cursorBottom = cue ? totalHeight - 4 : bottom;
    const rect = (k: number, cls: string) => {
      const c = columns[k];
      ctx.save();
      ctx.setFillStyle(cls === "cursor" ? "var(--cursor)" : "var(--selection)");
      ctx.fillRect(c.left + 2, top, c.right - c.left - 4, (cls === "cursor" ? cursorBottom : bottom) - top);
      ctx.restore();
    };
    if (props.pulse?.length) {
      ctx.openGroup("pulse");
      ctx.save();
      ctx.setFillStyle("var(--pulse)");
      for (const b of props.pulse) if (b >= 0 && b < bars) ctx.fillRect(xOfBar(b) + 1, top - 6, barW[b] - 2, bottom - top + 12);
      ctx.restore();
      ctx.closeGroup();
    }
    for (const m of props.marks ?? []) {
      const c = columns[m.column];
      ctx.save();
      ctx.setFillStyle(m.severity === "error" ? "var(--mark-error)" : "var(--mark-warning)");
      ctx.fillRect(c.left + 2, top, c.right - c.left - 4, bottom - top);
      ctx.restore();
    }
    if (props.selected >= 0) rect(props.selected, "selected");
    if (props.cursor >= 0) rect(props.cursor, "cursor");

    staves.forEach((s) => s.draw());
    new StaveConnector(staves[0], staves[1]).setType("singleLeft").setContext(ctx).draw();
    new StaveConnector(staves[0], staves[1]).setType("bracket").setContext(ctx).draw();
    ctx.save();
    ctx.setFillStyle("currentColor");
    for (let b = 1; b < bars; b++) staves.forEach((s) => ctx.fillRect(xOfBar(b) - 2, s.getYForLine(0), 1, s.getYForLine(4) - s.getYForLine(0)));
    ctx.restore();
    for (const n of [...cfNotes, ...fuxNotes]) n?.setContext(ctx).draw();
    // The player's line and its versions in one group, which fades to a trace while Fux's own
    // line is what plays (D76).
    const playerGroup = ctx.openGroup("player-lines");
    if (props.fadePlayer) playerGroup.setAttribute("opacity", "0.12");
    for (const n of cpNotes) n?.setContext(ctx).draw();
    // Ligatures (fourth species): a tie from each upbeat to the same note on the next downbeat.
    const drawTies = (line: (string | null | undefined)[], notes: (StaveNote | null | undefined)[], ink: string) => {
      if (fifth) {
        // A note held over the bar line: tied from the glyph before to its continuation.
        const gl = glyphsOf(line);
        let prev = -1;
        gl.forEach((g, k) => {
          if (!g) return;
          if (g.tied && prev >= 0 && notes[prev] && notes[k]) {
            const tie = new StaveTie({ first_note: notes[prev]!, last_note: notes[k]!, first_indices: [0], last_indices: [0] });
            tie.setStyle({ fillStyle: ink, strokeStyle: ink });
            tie.setContext(ctx).draw();
          }
          prev = k;
        });
        return;
      }
      if (!props.ties) return;
      for (let k = 0; k + 1 < layout.length; k++) {
        const a = notes[k];
        const b = notes[k + 1];
        if (!a || !b || !tiedToNext(layout, line.map((x) => x ?? null), k)) continue;
        const tie = new StaveTie({ first_note: a, last_note: b, first_indices: [0], last_indices: [0] });
        tie.setStyle({ fillStyle: ink, strokeStyle: ink });
        tie.setContext(ctx).draw();
      }
    };
    drawTies(props.counterpoint, cpNotes, props.playerInk ?? "var(--ink-player)");
    // Derived lines, on the player's staff in their own ink; a notehead that would touch one
    // already in its slot moves right (D58).
    const occupied: number[][] = layout.map((_, k) => {
      const out: number[] = [];
      for (const q of [cpGlyphs[k]?.value, fuxGlyphs[k]?.value]) if (q && q !== REST) out.push(parsePitch(q).diatonic);
      return out;
    });
    const extraNotes = extras.map((line, li) => {
      const gl = glyphsOf(line.notes, props.carry?.extras?.[li]);
      return layout.map((_, k) => {
        const g = gl[k];
        if (!g || g.value === REST) return null;
        const p = g.value;
        const { key, acc } = vexKey(p, sig);
        const stem = stemOf(`extra${extras.indexOf(line)}`);
        const n = new StaveNote({ keys: [key], duration: g.dur, clef: cpClef.clef, dots: g.dots, ...(stem ? { stem_direction: stem } : {}) });
        if (g.dots) Dot.buildAndAttach([n], { all: true });
        if (stem === 0) n.getStem()?.setVisibility(false);
        if (acc) n.addModifier(new Accidental(acc));
        n.setStyle({ fillStyle: line.ink, strokeStyle: line.ink });
        n.setStave(staves[cpIndex]);
        const d = parsePitch(p).diatonic;
        const nudges = occupied[k].filter((o) => Math.abs(o - d) <= 1).length;
        occupied[k].push(d);
        const mc = new ModifierContext();
        n.addToModifierContext(mc);
        mc.preFormat();
        const tc = new TickContext();
        tc.addTickable(n);
        tc.preFormat();
        tc.setX(0);
        tc.setX(columns[k].left + NOTE_PAD + nudges * 9 - n.getAbsoluteX());
        n.setContext(ctx).draw();
        return { n, x: columns[k].left + NOTE_PAD + nudges * 9 };
      });
    });
    extras.forEach((line, i) => drawTies(line.notes, extraNotes[i].map((x) => x?.n ?? null), line.ink));
    ctx.closeGroup();
    if (props.fux) drawTies(props.fux, fuxNotes, "var(--ink-fux)");
    if (props.extraIntervals)
      extras.forEach((line, i) => {
        ctx.save();
        ctx.setFillStyle(line.ink);
        ctx.setFont(UI_FONT, 9, "italic");
        layout.forEach((sl, k) => {
          const p = line.notes[k];
          if (!p || p === REST || p === HOLD) return;
          const text = simpleName(harmonic(props.cantus[sl.bar - firstSlotBar], p));
          ctx.fillText(text, columns[k].x - ctx.measureText(text).width / 2, LABEL_Y - 13 * (i + 1));
        });
        ctx.restore();
      });

    if (figuresOnly) {
      const lower = staves[staves.length - 1];
      const deepest = Math.max(1, ...cueFigures(props.continuo!.realization).map((f) => f.stack.length));
      const y0 = Math.min(HEIGHT - 4 - 12 * (deepest - 1), Math.max(lower.getYForLine(4) + 34, ...[...cpNotes, ...cfNotes].filter((n): n is StaveNote => !!n && n.getStave() === lower).map((n) => Math.max(...n.getYs()) + 22)));
      ctx.save();
      ctx.setFont(SERIF, 12, "italic");
      ctx.setFillStyle(CONTINUO_INK);
      for (const f of cueFigures(props.continuo!.realization)) {
        const b = f.bar;
        if (b < 0 || b >= bars) continue;
        const x = xOfBar(b) + NOTE_PAD + 2 + (f.half * barW[b]) / 2;
        f.stack.forEach((t, i) => drawFigureLine(ctx, t, x, y0 + i * 12));
      }
      ctx.restore();
    }
    if (cue && main) {
      // Below the lowest note actually drawn on the lower staff (ledger lines included).
      const lower = staves[staves.length - 1];
      const lowest = Math.max(lower.getYForLine(4), ...[...cpNotes, ...cfNotes].filter((n): n is StaveNote => !!n && n.getStave() === lower).map((n) => Math.max(...n.getYs()))) + 14;
      if (lowest > continuoTop) {
        fitCue(lowest);
        inertTop = continuoTop;
      }
    }
    if (cue) {
      const g = ctx.openGroup("continuo") as SVGGElement;
      g.setAttribute("transform", `translate(0 ${continuoTop}) scale(${cueK})`);
      g.setAttribute("aria-label", "basso continuo");
      cue.draw(ctx);
      ctx.closeGroup();
    }
    if (props.showNames) {
      // Note names beside the noteheads: cantus, the player's notes and (if shown) Fux's.
      const label = (pitch: string, n: StaveNote | null, x: number, ink: string) => {
        if (!n || pitch === REST || pitch === HOLD) return;
        const name = noteName(pitch, props.nameStyle);
        ctx.save();
        ctx.setFont(UI_FONT, 8, "500");
        ctx.setFillStyle(ink);
        ctx.fillText(name, x, n.getYs()[0] + 3);
        ctx.restore();
      };
      props.cantus.forEach((p, b) => label(p, cfNotes[b], xOfBar(b) + NOTE_PAD + 17, "var(--ink-muted)"));
      layout.forEach((sl, k) => {
        const p = props.counterpoint[k];
        if (p) label(p, cpNotes[k], columns[k].left + NOTE_PAD + nameDx(sl), props.playerInk ?? "var(--ink-player)");
        const f = props.fux?.[k];
        if (f) label(f, fuxNotes[k], columns[k].left + NOTE_PAD + nameDx(sl) + 10, "var(--ink-fux)");
        extras.forEach((line, i) => {
          const e = extraNotes[i][k];
          const q = line.notes[k];
          if (e && q) label(q, e.n, e.x + nameDx(sl), line.ink);
        });
      });
    }
    if (props.fux || extras.length) {
      // Legend, top right: every line on the player's staff, in its ink.
      ctx.save();
      ctx.setFont(UI_FONT, 9, "500");
      const y = 11;
      let xr = staves[0].getNoteEndX() - 4;
      const items: [string, string][] = [
        [`● ${props.playerLabel ?? "you"}`, props.playerInk ?? "var(--ink-player)"],
        ...extras.map((l): [string, string] => [`● ${l.label}`, l.ink]),
        ...(props.fux ? [["◇ Fux", "var(--ink-fux)"] as [string, string]] : []),
      ];
      for (const [text, ink] of items.reverse()) {
        ctx.setFillStyle(ink);
        const w = ctx.measureText(text).width;
        ctx.fillText(text, xr - w, y);
        xr -= w + 12;
      }
      ctx.restore();
    }

    // Discreet bar numbers above the upper staff.
    ctx.save();
    ctx.setFont(UI_FONT, 8, "normal");
    ctx.setFillStyle("var(--bar-number)");
    const numberY = STAFF_Y[0] + 22;
    columns.forEach((c, k) => {
      if (layout[k].beat !== 0) return;
      const label = String((props.firstBar ?? 1) + layout[k].bar - firstSlotBar);
      ctx.fillText(label, c.left + 4, numberY);
    });
    ctx.restore();

    if (props.overlay) {
      const centerText = (text: string, x: number, y: number, size: number, bold = false) => {
        ctx.setFont(UI_FONT, size - 1, bold ? "600" : "normal");
        ctx.fillText(text, x - ctx.measureText(text).width / 2, y);
      };
      for (const lab of props.overlay.intervals) {
        ctx.save();
        ctx.setFillStyle(COLOR[lab.status]);
        centerText(lab.text, columns[lab.column].x, LABEL_Y, 12, lab.status !== "ok");
        ctx.restore();
      }
      for (const link of props.overlay.links) {
        const xa = columns[link.from].x;
        const xb = columns[link.to].x;
        const ly = LINK_Y + link.row * 18;
        ctx.save();
        ctx.setStrokeStyle(COLOR[link.severity]);
        ctx.setFillStyle(COLOR[link.severity]);
        ctx.setLineWidth(2);
        if (link.kind === "motion") {
          // Bracket under the two interval labels, with an arrowhead into the second.
          ctx.beginPath();
          ctx.moveTo(xa, ly - 6);
          ctx.lineTo(xa, ly);
          ctx.lineTo(xb, ly);
          ctx.lineTo(xb, ly - 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(xb - 4, ly - 2);
          ctx.lineTo(xb, ly - 8);
          ctx.lineTo(xb + 4, ly - 2);
          ctx.closePath();
          ctx.fill();
          centerText(link.text, (xa + xb) / 2, ly + 11, 9);
        } else {
          // Arc between the two counterpoint notes, on the outside of the counterpoint staff.
          const na = cpNotes[link.from];
          const nb = cpNotes[link.to];
          const ya = na ? na.getYs()[0] : LABEL_Y;
          const yb = nb ? nb.getYs()[0] : LABEL_Y;
          const outward = upperIsCantus ? 1 : -1;
          const peak = (outward < 0 ? Math.min(ya, yb) : Math.max(ya, yb)) + outward * (26 + link.row * 14);
          ctx.beginPath();
          ctx.moveTo(xa, ya + outward * 8);
          ctx.quadraticCurveTo((xa + xb) / 2, peak, xb, yb + outward * 8);
          ctx.stroke();
          centerText(link.text, (xa + xb) / 2, peak + (outward < 0 ? 2 : 10), 10, true);
        }
        ctx.restore();
      }
    }

    const g: Geometry = {
      scale,
      columns,
      staves: staves.map((s) => ({ top: s.getYForLine(0), bottom: s.getYForLine(4), spacing: s.getSpacingBetweenLines() })),
      ...(inertTop !== undefined ? { continuoTop: inertTop } : {}),
    };
    geo.current = g;
    el.dataset.geometry = JSON.stringify(g); // read by the browser tests
  }, [width, props.showNames, props.cantus, props.counterpoint, props.fux, props.layout, props.clefs, props.cantusVoice, props.selected, props.cursor, props.label, props.marks, props.firstBar, props.fixedScale, props.overlay, props.continuo, props.extraLines, props.extraIntervals, props.ties, props.playerInk, props.playerLabel, props.signature, props.fadePlayer, props.carry, props.lastSystem, props.compact, props.fillWidth, props.drawScale, props.nameStyle, props.pulse]);

  const press = useRef<{ x: number; y: number; dragging: boolean; from: number } | null>(null);
  /** Fingers on the score: a second one makes the gesture a pinch, which places nothing. */
  const fingers = useRef(new Set<number>());
  const pinched = useRef(false);

  /** Logical coordinates, bar and staff position under the pointer. */
  const locate = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    if (!g) return null;
    const svg = e.currentTarget.querySelector("svg");
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / g.scale;
    const y = (e.clientY - r.top) / g.scale;
    if (g.continuoTop !== undefined && y >= g.continuoTop) return null;
    let column = g.columns.findIndex((c) => x >= c.left && x < c.right);
    if (column < 0) column = x < g.columns[0].left ? 0 : g.columns.length - 1;
    const cpStaff = props.cantusVoice === "upper" ? 1 : 0;
    const s = g.staves[cpStaff];
    const margin = 5 * s.spacing; // ledger-line zone above and below the staff
    const onStaff = y >= s.top - margin && y <= s.bottom + margin;
    const position = Math.round((s.bottom - y) / (s.spacing / 2));
    return {
      column,
      onStaff,
      position,
      staff: s,
      svgRect: r,
      natural: pitchAtPosition(props.clefs[cpStaff], position),
      inside: x >= g.columns[0].left && x < g.columns[g.columns.length - 1].right,
    };
  };

  const [ghost, setGhost] = useState<Ghost | null>(null);
  const updateGhost = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    const at = props.showGhost && !props.readOnly && !press.current?.dragging ? locate(e) : null;
    if (!g || !at || !at.inside || !at.onStaff) {
      if (ghost) setGhost(null);
      return;
    }
    const st = at.staff;
    const yOf = (p: number) => st.bottom - (p * st.spacing) / 2;
    const ledgers: number[] = [];
    for (let p = -2; p >= at.position; p -= 2) ledgers.push(yOf(p));
    for (let p = 10; p <= at.position; p += 2) ledgers.push(yOf(p));
    const outer = e.currentTarget.getBoundingClientRect();
    const box = { left: at.svgRect.left - outer.left, top: at.svgRect.top - outer.top, width: at.svgRect.width, height: at.svgRect.height, scale: g.scale };
    const x = g.columns[at.column].x;
    const y = yOf(at.position);
    if (ghost && ghost.x === x && ghost.y === y) return;
    setGhost({ box, x, y, ledgers });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      fingers.current.add(e.pointerId);
      if (fingers.current.size > 1) {
        pinched.current = true;
        press.current = null;
        return;
      }
    }
    if (props.readOnly) return;
    const at = locate(e);
    if (!at || !at.inside) return;
    press.current = { x: e.clientX, y: e.clientY, dragging: false, from: at.column };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateGhost(e);
    const p = press.current;
    // A finger scrolls the page; only a mouse or pen drags a note to another pitch.
    if (!p || props.readOnly || !props.onDrag || e.pointerType === "touch") return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6 || props.counterpoint[p.from] === null || props.counterpoint[p.from] === REST) return;
      p.dragging = true;
    }
    const at = locate(e);
    if (at) props.onDrag(p.from, at.column, at.natural);
  };
  const lift = (e: React.PointerEvent<HTMLDivElement>) => {
    fingers.current.delete(e.pointerId);
    const was = pinched.current;
    if (fingers.current.size === 0) pinched.current = false;
    return was;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (lift(e) || !p) return;
    if (p.dragging) {
      props.onDragEnd?.();
      return;
    }
    const at = locate(e);
    if (!at) return;
    if (at.onStaff) props.onPlace(at.column, at.natural);
    else props.onSelect(at.column);
  };

  return (
    <div
      className="score-box"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setGhost(null)}
      onPointerCancel={(e) => {
        lift(e);
        press.current = null;
      }}
    >
      <div ref={host} className={props.readOnly ? "score read-only" : "score"} />
      {ghost && (
        <svg
          className="ghost"
          aria-hidden="true"
          style={{ left: ghost.box.left, top: ghost.box.top, width: ghost.box.width, height: ghost.box.height }}
          viewBox={`0 0 ${ghost.box.width / ghost.box.scale} ${ghost.box.height / ghost.box.scale}`}
        >
          {ghost.ledgers.map((ly) => (
            <line key={ly} x1={ghost.x - 10} x2={ghost.x + 10} y1={ly} y2={ly} />
          ))}
          <ellipse cx={ghost.x} cy={ghost.y} rx={6.5} ry={4.6} />
          <ellipse className="hole" cx={ghost.x} cy={ghost.y} rx={2.6} ry={3.6} transform={`rotate(-35 ${ghost.x} ${ghost.y})`} />
        </svg>
      )}
    </div>
  );
}

type Ctx = ReturnType<InstanceType<typeof Renderer>["getContext"]>;

/**
 * The continuo staves in cue coordinates (logical x / CUE, y from the top of the block): one
 * bass staff ("figured"), or a grand staff ("realization", "both"); figures under the bass.
 */
function layoutContinuo(
  c: NonNullable<ScoreProps["continuo"]>,
  logicalWidth: number,
  start: number,
  xOfBar: (b: number) => number,
  barW: number[],
  sig: Signature = {},
  last = true,
  k = CUE,
): { height: number; draw(ctx: Ctx): void } {
  const keySpec = sig.B === -1 ? "F" : null;
  const r = c.realization;
  const grand = c.display !== "staff";
  const figures = c.display !== "realization";
  const left = 8 / k + (grand ? 22 : 0); // room for the brace
  const width = (logicalWidth - 8) / k - left;
  const mk = (y: number, clef: "treble" | "bass") => {
    const s = new Stave(left, y, width, { space_above_staff_ln: 2 });
    s.addClef(clef, "default");
    if (keySpec) s.addKeySignature(keySpec);
    s.addTimeSignature("C|");
    if (s.getNoteStartX() > start / k) {
      // Too narrow beside the main staves' signature: drop the cue time signature.
      const t = new Stave(left, y, width, { space_above_staff_ln: 2 });
      t.addClef(clef, "default");
      if (keySpec) t.addKeySignature(keySpec);
      t.setEndBarType(last ? 3 : 1);
      t.setNoteStartX(start / k);
      return t;
    }
    s.setEndBarType(last ? 3 : 1);
    s.setNoteStartX(start / k);
    return s;
  };
  const rhStave = grand ? mk(0, "treble") : null;
  const bassStave = mk(grand ? 82 : 0, "bass");
  const ink = { fillStyle: CONTINUO_INK, strokeStyle: CONTINUO_INK };
  for (const s of [rhStave, bassStave]) s?.setStyle(ink);

  const xOf = (ch: CueChord) => (xOfBar(ch.bar) + (ch.duration === "w" ? 0 : (ch.half * barW[ch.bar]) / 2) + NOTE_PAD) / k;
  const build = (stave: Stave, clef: "treble" | "bass", chords: CueChord[]) =>
    chords.map((ch) => {
      let n: StaveNote;
      if (!ch.tones.length) n = new StaveNote({ keys: [clef === "bass" ? "d/3" : "b/4"], duration: `${ch.duration}r`, clef });
      else {
        const keys = ch.tones.map((t) => vexKey(t.pitch, sig));
        n = new StaveNote({ keys: keys.map((k) => k.key), duration: ch.duration, clef, auto_stem: true });
        keys.forEach((k, i) => k.acc && n.addModifier(new Accidental(k.acc), i));
      }
      n.setStyle(ink);
      n.setStave(stave);
      const mc = new ModifierContext();
      n.addToModifierContext(mc);
      mc.preFormat();
      const tc = new TickContext();
      tc.addTickable(n);
      tc.preFormat();
      tc.setX(0);
      tc.setX(xOf(ch) - n.getAbsoluteX());
      return { ch, n };
    });
  const rh = rhStave ? build(rhStave, "treble", cueChords(r, "rh")) : [];
  const bass = build(bassStave, "bass", cueChords(r, "bass"));

  const lowest = Math.max(bassStave.getYForLine(4), ...bass.filter((b) => b.ch.tones.length).map((b) => b.n.getYs()[0] + 4));
  const figY = lowest + 16;
  const figs = figures ? cueFigures(r) : [];
  const deepest = figs.reduce((m, f) => Math.max(m, f.stack.length), 1);
  const height = figures ? figY + 11 * (deepest - 1) + 14 : Math.max(lowest, bassStave.getYForLine(4)) + 12;

  return {
    height,
    draw(ctx) {
      const staves = [rhStave, bassStave].filter((s): s is Stave => !!s);
      for (const s of staves) s.setContext(ctx).draw();
      ctx.save();
      ctx.setFillStyle(CONTINUO_INK);
      ctx.setStrokeStyle(CONTINUO_INK);
      if (rhStave) {
        new StaveConnector(rhStave, bassStave).setType("brace").setContext(ctx).setStyle(ink).draw();
        new StaveConnector(rhStave, bassStave).setType("singleLeft").setContext(ctx).setStyle(ink).draw();
      }
      // Bar lines, aligned with the main staves'.
      for (let b = 1; b < r.bars.length; b++)
        for (const s of staves) ctx.fillRect((xOfBar(b) - 2) / k, s.getYForLine(0), 1 / k, s.getYForLine(4) - s.getYForLine(0));
      ctx.setFont(SERIF, 11, "italic");
      const top = staves[0].getYForLine(0);
      ctx.fillText("B.c.", 2, top - (grand ? 4 : 6));
      ctx.restore();
      const all = [...rh, ...bass];
      for (const { n } of all) n.setContext(ctx).draw();
      for (const list of [rh, bass])
        list.forEach(({ ch, n }, i) => {
          if (!ch.tiedFrom.length) return;
          const prev = list[i - 1];
          if (!prev) return;
          const first = ch.tiedFrom.map((k) => prev.ch.tones.findIndex((t) => t.midi === ch.tones[k].midi)).filter((k) => k >= 0);
          if (first.length !== ch.tiedFrom.length) return;
          const tie = new StaveTie({ first_note: prev.n, last_note: n, first_indices: first, last_indices: ch.tiedFrom });
          tie.setStyle(ink);
          tie.setContext(ctx).draw();
        });
      if (figs.length) {
        ctx.save();
        ctx.setFillStyle(CONTINUO_INK);
        ctx.setFont(SERIF, 12, "italic");
        for (const f of figs) {
          const x = xOf({ bar: f.bar, half: f.half, duration: barW[f.bar] > 60 || f.half ? "h" : "w", tones: [], tiedFrom: [] }) + 6;
          f.stack.forEach((t, i) => drawFigureLine(ctx, t, x - ctx.measureText(t.replace(/\\$/, "")).width / 2, figY + 11 * i));
        }
        ctx.restore();
      }
    },
  };
}
