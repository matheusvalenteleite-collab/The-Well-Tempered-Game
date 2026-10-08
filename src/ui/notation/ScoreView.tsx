/**
 * Two-staff score (cantus in whole notes; counterpoint in the slots of its species layout).
 * VexFlow draws; input is ours: a click or tap on the counterpoint staff places/replaces the
 * note of the nearest slot ("column") at that staff position.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accidental, ModifierContext, Renderer, Stave, StaveConnector, StaveNote, TickContext } from "vexflow";
import { parsePitch } from "../../music/pitch.ts";
import type { Staff } from "../../music/fux/types.ts";
import { pitchAtPosition, VEXFLOW_CLEF, type ClefId } from "./clefs.ts";
import type { Overlay, Status } from "./overlay.ts";
import { REST, slotLayout, type Slot } from "../../counterpoint/layout.ts";

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
  readOnly?: boolean;
  /** Bar number of the first bar (excerpts start mid-exercise). Default 1. */
  firstBar?: number;
  /** Fixed drawing scale (for excerpts); otherwise the scale follows the width. */
  fixedScale?: number;
  /** Evaluation overlay: intervals between the staves and problem connectors. */
  overlay?: Overlay;
  /** Live drag of a counterpoint note to another bar and/or pitch; onDragEnd commits. */
  onDrag?(from: number, to: number, naturalPitch: string): void;
  onDragEnd?(): void;
  /** Show a translucent "shadow" note where a click would write. */
  showGhost?: boolean;
  /** Fux's counterpoint (one entry per slot), drawn on the player's staff with diamond noteheads. */
  fux?: (string | null)[];
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
  plain: { staffY: [20, 120], height: 240 },
  overlay: { staffY: [20, 175], height: 300 },
};
/** Vertical positions (logical) of the overlay between the staves. */
const LABEL_Y = 152;
const LINK_Y = 164;
/** Horizontal space per bar (logical units): compact, so the melodic shape reads at a glance. */
const BAR_W = 58;
/** A bar holding two half notes. */
const HALF_BAR_W = 92;
/** Notehead offset from the left edge of its slot. */
const NOTE_PAD = 12;
/** Drawing scale on wide screens. */
const BASE_SCALE = 1;
const COLOR: Record<Status, string> = { ok: "var(--ok)", error: "var(--bad)", warning: "var(--warn)" };
const ACC: Record<number, string> = { [-2]: "bb", [-1]: "b", 1: "#", 2: "##" };

function vexKey(pitch: string): { key: string; acc: string | null } {
  const p = parsePitch(pitch);
  return { key: `${p.step.toLowerCase()}${ACC[p.alter] ?? ""}/${p.octave}`, acc: ACC[p.alter] ?? null };
}

interface Geometry {
  scale: number;
  /** One per slot. */
  columns: { x: number; left: number; right: number }[];
  staves: { top: number; bottom: number; spacing: number }[];
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
    const { staffY: STAFF_Y, height: HEIGHT } = props.overlay ? LAYOUT.overlay : LAYOUT.plain;
    // Probe the clef/time-signature width, then size the score to its bars instead of the container.
    const probe = new Stave(8, 0, 400);
    probe.addClef(VEXFLOW_CLEF[props.clefs[0]].clef).addTimeSignature("C|");
    const noteStart0 = probe.getNoteStartX();
    const layout = props.layout ?? slotLayout("first", props.cantus.length);
    const bars = props.cantus.length;
    const firstSlotBar = layout[0]?.bar ?? 0;
    // Our own horizontal grid (the VexFlow formatter spreads unevenly around empty slots): a bar of
    // one whole note is BAR_W wide, a bar of two half notes HALF_BAR_W.
    const slotsIn = (b: number) => layout.filter((sl) => sl.bar - firstSlotBar === b).length;
    const barW = Array.from({ length: bars }, (_, b) => (slotsIn(b) > 1 ? HALF_BAR_W : BAR_W));
    const barX: number[] = [];
    barW.reduce((x, w, b) => ((barX[b] = x), x + w), 0);
    const musicWidth = barW.reduce((x, w) => x + w, 0);
    const logicalWidth = noteStart0 + musicWidth + 24;
    const scale = props.fixedScale ?? Math.max(0.45, Math.min(BASE_SCALE, width / logicalWidth));
    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(Math.ceil(logicalWidth * scale), Math.ceil(HEIGHT * scale));
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    const svg = el.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", props.label);

    const staves = props.clefs.map((c, i) => {
      const s = new Stave(8, STAFF_Y[i], logicalWidth - 16);
      const vc = VEXFLOW_CLEF[c];
      s.addClef(vc.clef, "default", vc.annotation);
      s.addTimeSignature("C|");
      s.setEndBarType(3); // final double bar
      s.setContext(ctx);
      return s;
    });
    const start = Math.max(...staves.map((s) => s.getNoteStartX()));
    staves.forEach((s) => s.setNoteStartX(start));
    const xOfBar = (b: number) => start + barX[b];

    const upperIsCantus = props.cantusVoice === "upper";
    const cpIndex = upperIsCantus ? 1 : 0;
    /** A note (or rest) placed with its notehead's left edge at logical x. */
    type Look = "cantus" | "player" | "fux";
    const placed = (staffIndex: number, pitch: string, dur: "w" | "h", x: number, look: Look, stem?: 1 | -1) => {
      const clef = VEXFLOW_CLEF[props.clefs[staffIndex]].clef;
      let n: StaveNote;
      if (pitch === REST) n = new StaveNote({ keys: [clef === "bass" ? "d/3" : "b/4"], duration: `${dur}r`, clef });
      else {
        const { key, acc } = vexKey(pitch);
        // Fux's notes in diamonds, as in the 1725 print, so they never read as the player's.
        n = new StaveNote({ keys: [look === "fux" ? `${key}/D` : key], duration: dur, clef, ...(stem ? { stem_direction: stem } : {}) });
        if (acc) n.addModifier(new Accidental(acc));
        const ink = look === "player" ? "var(--ink-player)" : look === "fux" ? "var(--ink-fux)" : null;
        if (ink) n.setStyle({ fillStyle: ink, strokeStyle: ink });
      }
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
    const cfNotes = props.cantus.map((p, b) => placed(1 - cpIndex, p, "w", xOfBar(b) + NOTE_PAD, "cantus"));
    // Slot geometry: each slot owns its share of the bar; x is the notehead centre.
    const columns = layout.map((sl) => {
      const b = sl.bar - firstSlotBar;
      const share = barW[b] / slotsIn(b);
      const left = xOfBar(b) + sl.beat * share;
      return { left, right: left + share, x: left + NOTE_PAD + (sl.duration === "1/1" ? 8 : 6) };
    });
    const cpNotes = layout.map((sl, k) => {
      const p = props.counterpoint[k];
      return p === null || p === undefined ? null : placed(cpIndex, p, sl.duration === "1/1" ? "w" : "h", columns[k].left + NOTE_PAD, "player", props.fux ? 1 : undefined);
    });
    // Fux's line: stems down (the player's go up), nudged right where the two notes would collide.
    const fuxNotes = (props.fux ?? []).map((p, k) => {
      const sl = layout[k];
      if (!sl || p === null || p === REST) return null;
      const mine = props.counterpoint[k];
      const near = mine && mine !== REST && Math.abs(parsePitch(mine).diatonic - parsePitch(p).diatonic) <= 1;
      return placed(cpIndex, p, sl.duration === "1/1" ? "w" : "h", columns[k].left + NOTE_PAD + (near ? 11 : 0), "fux", -1);
    });

    // Column highlights under the music.
    const top = STAFF_Y[0] - 10;
    const bottom = STAFF_Y[1] + 100;
    const rect = (k: number, cls: string) => {
      const c = columns[k];
      ctx.save();
      ctx.setFillStyle(cls === "cursor" ? "var(--cursor)" : "var(--selection)");
      ctx.fillRect(c.left + 2, top, c.right - c.left - 4, bottom - top);
      ctx.restore();
    };
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
    for (const n of [...cfNotes, ...fuxNotes, ...cpNotes]) n?.setContext(ctx).draw();
    if (props.fux) {
      // Legend, top right of the counterpoint staff.
      ctx.save();
      ctx.setFont("Georgia, serif", 10, "normal");
      const y = 11;
      const xr = staves[0].getNoteEndX() - 4;
      ctx.setFillStyle("var(--ink-fux)");
      const fuxLabel = "◇ Fux";
      ctx.fillText(fuxLabel, xr - ctx.measureText(fuxLabel).width, y);
      ctx.setFillStyle("var(--ink-player)");
      const meLabel = "● you    ";
      ctx.fillText(meLabel, xr - ctx.measureText(fuxLabel).width - ctx.measureText(meLabel).width, y);
      ctx.restore();
    }

    // Discreet bar numbers above the upper staff.
    ctx.save();
    ctx.setFont("Georgia, serif", 9, "normal");
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
        ctx.setFont("Georgia, serif", size, bold ? "bold" : "normal");
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
    };
    geo.current = g;
    el.dataset.geometry = JSON.stringify(g); // read by the browser tests
  }, [width, props.cantus, props.counterpoint, props.fux, props.layout, props.clefs, props.cantusVoice, props.selected, props.cursor, props.label, props.marks, props.firstBar, props.fixedScale, props.overlay]);

  const press = useRef<{ x: number; y: number; dragging: boolean; from: number } | null>(null);

  /** Logical coordinates, bar and staff position under the pointer. */
  const locate = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    if (!g) return null;
    const svg = e.currentTarget.querySelector("svg");
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / g.scale;
    const y = (e.clientY - r.top) / g.scale;
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
    if (props.readOnly) return;
    const at = locate(e);
    if (!at || !at.inside) return;
    press.current = { x: e.clientX, y: e.clientY, dragging: false, from: at.column };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateGhost(e);
    const p = press.current;
    if (!p || props.readOnly || !props.onDrag) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6 || props.counterpoint[p.from] === null || props.counterpoint[p.from] === REST) return;
      p.dragging = true;
    }
    const at = locate(e);
    if (at) props.onDrag(p.from, at.column, at.natural);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
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
      onPointerCancel={() => (press.current = null)}
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
