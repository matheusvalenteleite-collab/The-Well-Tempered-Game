/**
 * Two-staff first-species score. VexFlow draws; input is ours: a click or tap on the
 * counterpoint staff places/replaces the note of the nearest column at that staff position.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accidental, BarNote, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Voice } from "vexflow";
import { parsePitch } from "../../music/pitch.ts";
import type { Staff } from "../../music/fux/types.ts";
import { pitchAtPosition, VEXFLOW_CLEF, type ClefId } from "./clefs.ts";

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
}

const STAFF_Y = [30, 150];
const HEIGHT = 270;
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
    const scale = props.fixedScale ?? (width < 640 ? Math.max(0.55, width / 640) : 1);
    const logicalWidth = width / scale;
    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(width, HEIGHT * scale);
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
    new Formatter().joinVoices([upper.voice]).joinVoices([lower.voice]).format([upper.voice, lower.voice], staves[0].getNoteEndX() - start - 24);

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
    const top = STAFF_Y[0] - 20;
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

    const g: Geometry = {
      scale,
      columns,
      staves: staves.map((s) => ({ top: s.getYForLine(0), bottom: s.getYForLine(4), spacing: s.getSpacingBetweenLines() })),
    };
    geo.current = g;
    el.dataset.geometry = JSON.stringify(g); // read by the browser tests
  }, [width, props.cantus, props.counterpoint, props.clefs, props.cantusVoice, props.selected, props.cursor, props.label, props.marks, props.firstBar, props.fixedScale]);

  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    if (!g || props.readOnly) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / g.scale;
    const y = (e.clientY - r.top) / g.scale;
    const column = g.columns.findIndex((c) => x >= c.left && x < c.right);
    if (column < 0) return;
    const cpStaff = props.cantusVoice === "upper" ? 1 : 0;
    const s = g.staves[cpStaff];
    const margin = 5 * s.spacing; // ledger-line zone above and below the staff
    if (y < s.top - margin || y > s.bottom + margin) {
      props.onSelect(column);
      return;
    }
    const position = Math.round((s.bottom - y) / (s.spacing / 2));
    props.onPlace(column, pitchAtPosition(props.clefs[cpStaff], position));
  };

  return <div ref={host} className={props.readOnly ? "score read-only" : "score"} onPointerDown={onPointer} />;
}
