/**
 * Three-staff score for three-voice first species (D90): whole notes on every staff, the player
 * writing on two of them. A tap or click on a staff writes there (and makes it the active voice);
 * Fux's own notes, when shown, are diamonds beside the player's. The figures (intervals above the
 * bass, compound as Fux prints them) stand under each upper note. Broken into systems and zoomed
 * as the two-staff score is (D83, D87).
 */
import { useEffect, useRef } from "react";
import { Accidental, ModifierContext, Renderer, Stave, StaveConnector, StaveNote, TickContext } from "vexflow";
import { parsePitch } from "../../music/pitch.ts";
import { noteName, type NameStyle } from "../../music/names.ts";
import { harmonic } from "../../counterpoint/interval.ts";
import { pitchAtPosition, VEXFLOW_CLEF, type ClefId } from "./clefs.ts";
import { Viewport } from "./Viewport.tsx";

export interface TrioStaff {
  clef: ClefId;
  notes: (string | null)[];
  editable: boolean;
  /** Fux's notes on this staff, drawn as diamonds (player staves only). */
  fux?: (string | null)[];
  label?: string;
}

export interface TrioMark {
  bar: number;
  severity: "error" | "warning";
}

interface Props {
  staves: TrioStaff[];
  active: number;
  selected: number;
  cursor: number;
  marks?: TrioMark[];
  /** Bars pointed at in a text: they pulse (D96). */
  pulse?: number[];
  figures?: boolean;
  names?: boolean;
  nameStyle?: NameStyle;
  label: string;
  onPlace(staff: number, bar: number, natural: string): void;
  onSelect(staff: number, bar: number): void;
  zoom: number;
  onZoom(z: number): void;
  zoomLabels: { in: string; out: string; reset: string };
  tools?: React.ReactNode;
}

const BAR_W = 64;
const LEAD = 96;
const NOTE_PAD = 14;
const STAFF_Y = [24, 132, 240];
const HEIGHT = 400;

/** The three staves in one line, zoomed and scrolled sideways like the two-voice score (D100). */
export function TrioScore(p: Props) {
  const bars = p.staves[0].notes.length;
  const natural = LEAD + bars * BAR_W + 24;
  const playingX = p.cursor >= 0 ? LEAD + p.cursor * BAR_W : null;
  return (
    <Viewport natural={natural} naturalHeight={HEIGHT} zoom={p.zoom} onZoom={p.onZoom} zoomLabels={p.zoomLabels} tools={p.tools} playingX={playingX}>
      {(scale) => <TrioSystem {...p} from={0} to={bars - 1} scale={scale} last />}
    </Viewport>
  );
}

interface Geometry {
  scale: number;
  columns: { left: number; right: number }[];
  staves: { top: number; bottom: number; spacing: number }[];
}

function TrioSystem(p: Props & { from: number; to: number; scale: number; fill?: number; last: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const geo = useRef<Geometry | null>(null);
  const n = p.to - p.from + 1;

  useEffect(() => {
    const host = el.current;
    if (!host) return;
    host.innerHTML = "";
    const probe = new Stave(8, 0, 400);
    probe.addClef("treble");
    probe.addTimeSignature("C|");
    const start0 = probe.getNoteStartX();
    const naturalW = start0 + n * BAR_W + 24;
    const logicalWidth = Math.max(naturalW, p.fill ?? 0);
    const barW = (logicalWidth - start0 - 24) / n;
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(Math.ceil(logicalWidth * p.scale), Math.ceil(HEIGHT * p.scale));
    const ctx = renderer.getContext();
    ctx.scale(p.scale, p.scale);
    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", p.label);
    const staves = p.staves.map((st, i) => {
      const s = new Stave(8, STAFF_Y[i], logicalWidth - 16);
      s.addClef(VEXFLOW_CLEF[st.clef].clef);
      s.addTimeSignature("C|");
      s.setEndBarType(p.last ? 3 : 1);
      s.setContext(ctx);
      return s;
    });
    const start = Math.max(...staves.map((s) => s.getNoteStartX()));
    staves.forEach((s) => s.setNoteStartX(start));
    const columns = Array.from({ length: n }, (_, j) => ({ left: start + j * barW, right: start + (j + 1) * barW }));

    // Highlights: marks and the cursor over the whole column, the selection on the active staff.
    const band = (i: number) => ({ top: staves[i].getYForLine(0) - 22, bottom: staves[i].getYForLine(4) + 22 });
    const fill = (j: number, top: number, bottom: number, color: string) => {
      ctx.save();
      ctx.setFillStyle(color);
      ctx.fillRect(columns[j].left + 2, top, columns[j].right - columns[j].left - 4, bottom - top);
      ctx.restore();
    };
    const whole = { top: band(0).top, bottom: band(2).bottom };
    for (const m of p.marks ?? []) if (m.bar >= p.from && m.bar <= p.to) fill(m.bar - p.from, whole.top, whole.bottom, m.severity === "error" ? "var(--mark-error)" : "var(--mark-warning)");
    for (const b of p.pulse ?? []) if (b >= p.from && b <= p.to) {
      const g = ctx.openGroup("pulse");
      fill(b - p.from, whole.top - 6, whole.bottom + 6, "var(--pulse)");
      ctx.closeGroup();
      void g;
    }
    if (p.selected >= p.from && p.selected <= p.to) fill(p.selected - p.from, band(p.active).top, band(p.active).bottom, "var(--selection)");
    if (p.cursor >= p.from && p.cursor <= p.to) fill(p.cursor - p.from, whole.top, whole.bottom, "var(--cursor)");

    staves.forEach((s) => s.draw());
    new StaveConnector(staves[0], staves[2]).setType("singleLeft").setContext(ctx).draw();
    new StaveConnector(staves[0], staves[2]).setType("bracket").setContext(ctx).draw();
    ctx.save();
    ctx.setFillStyle("currentColor");
    for (let j = 1; j < n; j++) staves.forEach((s) => ctx.fillRect(columns[j].left - 2, s.getYForLine(0), 1, s.getYForLine(4) - s.getYForLine(0)));
    ctx.restore();

    const placeNote = (i: number, pitch: string, x: number, ink: string | null, diamond: boolean) => {
      const clef = VEXFLOW_CLEF[p.staves[i].clef].clef;
      const q = parsePitch(pitch);
      const acc = q.alter === 0 ? null : q.alter === 1 ? "#" : q.alter === -1 ? "b" : q.alter === 2 ? "##" : "bb";
      const key = `${q.step.toLowerCase()}${acc ?? ""}/${q.octave}`;
      const note = new StaveNote({ keys: [diamond ? `${key}/D` : key], duration: "w", clef });
      if (acc) note.addModifier(new Accidental(acc));
      if (ink) note.setStyle({ fillStyle: ink, strokeStyle: ink });
      note.setStave(staves[i]);
      const mc = new ModifierContext();
      note.addToModifierContext(mc);
      mc.preFormat();
      const tc = new TickContext();
      tc.addTickable(note);
      tc.preFormat();
      tc.setX(0);
      tc.setX(x - note.getAbsoluteX());
      note.setContext(ctx).draw();
      return note;
    };
    ctx.save();
    ctx.setFont("Inter, system-ui, sans-serif", 9);
    ctx.setFillStyle("var(--bar-number)");
    for (let j = 0; j < n; j++) ctx.fillText(String(p.from + j + 1), columns[j].left + 4, STAFF_Y[0] + 20);
    ctx.restore();
    for (let j = 0; j < n; j++) {
      const bar = p.from + j;
      const x = columns[j].left + NOTE_PAD;
      p.staves.forEach((st, i) => {
        const mine = st.notes[bar];
        const fux = st.fux?.[bar];
        if (fux) {
          const near = mine && Math.abs(parsePitch(mine).diatonic - parsePitch(fux).diatonic) <= 1;
          placeNote(i, fux, x + (near ? 13 : 0), "var(--ink-fux)", true);
        }
        if (mine) {
          const note = placeNote(i, mine, x, st.editable ? "var(--ink-player)" : null, false);
          if (p.names) {
            ctx.save();
            ctx.setFont("Inter, system-ui, sans-serif", 9);
            ctx.setFillStyle("var(--ink-muted)");
            ctx.fillText(noteName(mine, p.nameStyle), x + 20, note.getYs()[0] + 3);
            ctx.restore();
          }
        }
      });
      // Figures above the bass, under each upper note, when all three are written.
      if (p.figures) {
        const ps = p.staves.map((st) => st.notes[bar]);
        if (ps.every(Boolean)) {
          const bass = [0, 1, 2].reduce((lo, i) => (parsePitch(ps[i]!).midi < parsePitch(ps[lo]!).midi ? i : lo), 2);
          ctx.save();
          ctx.setFont("'EB Garamond', Garamond, Georgia, serif", 12);
          ctx.setFillStyle("var(--ink-muted)");
          for (let i = 0; i < 3; i++) {
            if (i === bass) continue;
            const f = harmonic(ps[bass]!, ps[i]!);
            const text = `${f.quality === "A" || f.quality === "d" ? f.quality : ""}${f.number}`;
            ctx.fillText(text, x + 2, staves[i].getYForLine(4) + 30);
          }
          ctx.restore();
        }
      }
    }
    geo.current = {
      scale: p.scale,
      columns,
      staves: staves.map((s) => ({ top: s.getYForLine(0), bottom: s.getYForLine(4), spacing: s.getSpacingBetweenLines() })),
    };
    host.dataset.geometry = JSON.stringify(geo.current);
  }, [p.staves, p.active, p.selected, p.cursor, p.marks, p.figures, p.names, p.nameStyle, p.pulse, p.from, p.to, p.scale, p.fill, p.last, p.label, n]);

  // Pointer: the nearest staff takes the tap; a second finger makes it a pinch, which writes nothing.
  const fingers = useRef(new Set<number>());
  const pinched = useRef(false);
  const press = useRef<{ x: number; y: number } | null>(null);
  const locate = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    const svg = e.currentTarget.querySelector("svg");
    if (!g || !svg) return null;
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / g.scale;
    const y = (e.clientY - r.top) / g.scale;
    let column = g.columns.findIndex((c) => x >= c.left && x < c.right);
    if (column < 0) column = x < g.columns[0].left ? 0 : g.columns.length - 1;
    const centre = (s: Geometry["staves"][number]) => (s.top + s.bottom) / 2;
    const staff = g.staves.reduce((best, s, i) => (Math.abs(centre(s) - y) < Math.abs(centre(g.staves[best]) - y) ? i : best), 0);
    const s = g.staves[staff];
    const onStaff = y >= s.top - 5 * s.spacing && y <= s.bottom + 5 * s.spacing;
    const position = Math.round((s.bottom - y) / (s.spacing / 2));
    return { bar: p.from + column, staff, onStaff, natural: pitchAtPosition(p.staves[staff].clef, position) };
  };
  const lift = (e: React.PointerEvent) => {
    fingers.current.delete(e.pointerId);
    const was = pinched.current;
    if (fingers.current.size === 0) pinched.current = false;
    return was;
  };
  return (
    <div
      className="score-box"
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          fingers.current.add(e.pointerId);
          if (fingers.current.size > 1) {
            pinched.current = true;
            press.current = null;
            return;
          }
        }
        press.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const pr = press.current;
        press.current = null;
        if (lift(e) || !pr || Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 8) return;
        const at = locate(e);
        if (!at) return;
        if (at.onStaff && p.staves[at.staff].editable) p.onPlace(at.staff, at.bar, at.natural);
        else p.onSelect(at.staff, at.bar);
      }}
      onPointerCancel={(e) => {
        lift(e);
        press.current = null;
      }}
    >
      <div ref={el} className="score" />
    </div>
  );
}
