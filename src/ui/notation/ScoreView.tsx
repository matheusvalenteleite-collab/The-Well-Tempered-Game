/**
 * Two-staff first-species score. VexFlow draws; input is ours: a click or tap on the
 * counterpoint staff places/replaces the note of the nearest column at that staff position.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accidental, BarNote, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Voice } from "vexflow";
import { parsePitch } from "../../music/pitch.ts";
import type { Staff } from "../../music/fux/types.ts";
import { pitchAtPosition, VEXFLOW_CLEF, type ClefId } from "./clefs.ts";
import type { Overlay, Status } from "./overlay.ts";

export interface ScoreProps {
  cantus: string[];
  counterpoint: (string | null)[];
  cantusVoice: Staff;
  /** Clef of the upper and lower staff. */
  clefs: [ClefId, ClefId];
  selected: number;
  /** Column sounding during playback, or -1. */
  cursor: number;
  onPlace(column: number, naturalPitch: string): void;
  onSelect(column: number): void;
  label: string;
  /** Columns marked after evaluation. */
  marks?: { column: number; severity: "error" | "warning" }[];
  readOnly?: boolean;
  /** Bar number of the first column (excerpts start mid-exercise). Default 1. */
  firstBar?: number;
  /** Fixed drawing scale (for excerpts); otherwise the scale follows the width. */
  fixedScale?: number;
  /** Evaluation overlay: intervals between the staves and problem connectors. */
  overlay?: Overlay;
  /** Live drag of a counterpoint note to another bar and/or pitch; onDragEnd commits. */
  onDrag?(from: number, to: number, naturalPitch: string): void;
  onDragEnd?(): void;
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
/** Drawing scale on wide screens. */
const BASE_SCALE = 0.85;
const COLOR: Record<Status, string> = { ok: "var(--ok)", error: "var(--bad)", warning: "var(--warn)" };
const ACC: Record<number, string> = { [-2]: "bb", [-1]: "b", 1: "#", 2: "##" };

function vexKey(pitch: string): { key: string; acc: string | null } {
  const p = parsePitch(pitch);
  return { key: `${p.step.toLowerCase()}${ACC[p.alter] ?? ""}/${p.octave}`, acc: ACC[p.alter] ?? null };
}

interface Geometry {
  scale: number;
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
    const logicalWidth = noteStart0 + props.cantus.length * BAR_W + 24;
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

    const upperIsCantus = props.cantusVoice === "upper";
    const staffNotes = (staffIndex: number) => {
      const isCantus = upperIsCantus === (staffIndex === 0);
      const clef = VEXFLOW_CLEF[props.clefs[staffIndex]].clef;
      const notes = props.cantus.map((cf, k) => {
        const pitch = isCantus ? cf : props.counterpoint[k];
        if (pitch === null) return new GhostNote({ duration: "w" });
        const { key, acc } = vexKey(pitch);
        const n = new StaveNote({ keys: [key], duration: "w", clef });
        if (acc) n.addModifier(new Accidental(acc));
        if (!isCantus) n.setStyle({ fillStyle: "var(--ink-player)", strokeStyle: "var(--ink-player)" });
        return n;
      });
      const tickables = notes.flatMap((n, k) => (k < notes.length - 1 ? [n, new BarNote()] : [n]));
      const voice = new Voice({ num_beats: 2 * notes.length, beat_value: 2 }).addTickables(tickables);
      return { notes, voice };
    };
    const upper = staffNotes(0);
    const lower = staffNotes(1);
    new Formatter().joinVoices([upper.voice]).joinVoices([lower.voice]).format([upper.voice, lower.voice], staves[0].getNoteEndX() - start - 16);

    // Column geometry from the cantus notes (always real notes).
    const cfNotes = upperIsCantus ? upper.notes : lower.notes;
    cfNotes.forEach((n, k) => n.setStave(staves[upperIsCantus ? 0 : 1]));
    const xs = cfNotes.map((n) => n.getAbsoluteX() + 8);
    const columns = xs.map((x, k) => ({
      x,
      left: k === 0 ? start : (xs[k - 1] + x) / 2,
      right: k === xs.length - 1 ? staves[0].getNoteEndX() : (x + xs[k + 1]) / 2,
    }));

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
    upper.voice.draw(ctx, staves[0]);
    lower.voice.draw(ctx, staves[1]);

    // Discreet bar numbers above the upper staff.
    ctx.save();
    ctx.setFont("Georgia, serif", 9, "normal");
    ctx.setFillStyle("var(--bar-number)");
    const numberY = STAFF_Y[0] + 22;
    columns.forEach((c, k) => {
      const label = String((props.firstBar ?? 1) + k);
      ctx.fillText(label, c.left + 4, numberY);
    });
    ctx.restore();

    if (props.overlay) {
      const cpNotes = upperIsCantus ? lower.notes : upper.notes;
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
          const ya = na instanceof StaveNote ? na.getYs()[0] : LABEL_Y;
          const yb = nb instanceof StaveNote ? nb.getYs()[0] : LABEL_Y;
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
  }, [width, props.cantus, props.counterpoint, props.clefs, props.cantusVoice, props.selected, props.cursor, props.label, props.marks, props.firstBar, props.fixedScale, props.overlay]);

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
    return { column, onStaff, natural: pitchAtPosition(props.clefs[cpStaff], position), inside: x >= g.columns[0].left && x < g.columns[g.columns.length - 1].right };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (props.readOnly) return;
    const at = locate(e);
    if (!at || !at.inside) return;
    press.current = { x: e.clientX, y: e.clientY, dragging: false, from: at.column };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || props.readOnly || !props.onDrag) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6 || props.counterpoint[p.from] === null) return;
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
      ref={host}
      className={props.readOnly ? "score read-only" : "score"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (press.current = null)}
    />
  );
}
