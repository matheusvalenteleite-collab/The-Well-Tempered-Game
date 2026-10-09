/**
 * The three-voice score on two staves (D113, after D90): the voices share a treble and a bass staff
 * by register, as in a keyboard reduction, each voice in its own colour (the cantus in black, the
 * player's Contra I and Contra II in their track colours). A tap on a staff writes the active voice
 * if it lives there, else the player's voice that does; Fux's notes, when shown, are diamonds
 * beside the player's. The figures above the lowest voice are stacked under the bass staff, as a
 * figured bass. One line, zoomed and scrolled sideways like the two-voice score (D100).
 */
import { useEffect, useRef } from "react";
import { Accidental, ModifierContext, Renderer, Stave, StaveConnector, StaveNote, TickContext } from "vexflow";
import { parsePitch } from "../../music/pitch.ts";
import { noteName, type NameStyle } from "../../music/names.ts";
import { harmonic } from "../../counterpoint/interval.ts";
import { pitchAtPosition, VEXFLOW_CLEF, type ClefId } from "./clefs.ts";
import { Viewport } from "./Viewport.tsx";

/** One voice: its notes, the staff it is drawn on (0 upper, 1 lower) and its ink. */
export interface TrioVoice {
  notes: (string | null)[];
  editable: boolean;
  staff: 0 | 1;
  /** CSS colour of its notes (none: the ink of the page). */
  ink?: string;
  /** Fux's notes for this voice, drawn as diamonds (player voices only). */
  fux?: (string | null)[];
}

export interface TrioMark {
  bar: number;
  severity: "error" | "warning";
}

interface Props {
  voices: TrioVoice[];
  /** The clefs of the two staves. */
  clefs: [ClefId, ClefId];
  /** The voice being written. */
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
  onPlace(voice: number, bar: number, natural: string): void;
  onSelect(voice: number | null, bar: number): void;
  zoom: number;
  onZoom(z: number): void;
  zoomLabels: { in: string; out: string; reset: string };
  tools?: React.ReactNode;
}

const BAR_W = 64;
const LEAD = 96;
const NOTE_PAD = 14;
const STAFF_Y = [28, 148];
const HEIGHT = 300;

/** The two staves in one line, zoomed and scrolled sideways like the two-voice score (D100). */
export function TrioScore(p: Props) {
  const bars = p.voices[0].notes.length;
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
    const staves = p.clefs.map((clef, i) => {
      const s = new Stave(8, STAFF_Y[i], logicalWidth - 16);
      s.addClef(VEXFLOW_CLEF[clef].clef);
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
    const whole = { top: band(0).top, bottom: band(1).bottom };
    for (const m of p.marks ?? []) if (m.bar >= p.from && m.bar <= p.to) fill(m.bar - p.from, whole.top, whole.bottom, m.severity === "error" ? "var(--mark-error)" : "var(--mark-warning)");
    for (const b of p.pulse ?? []) if (b >= p.from && b <= p.to) {
      const g = ctx.openGroup("pulse");
      fill(b - p.from, whole.top - 6, whole.bottom + 6, "var(--pulse)");
      ctx.closeGroup();
      void g;
    }
    const activeStaff = p.voices[p.active]?.staff ?? 0;
    if (p.selected >= p.from && p.selected <= p.to) fill(p.selected - p.from, band(activeStaff).top, band(activeStaff).bottom, "var(--selection)");
    if (p.cursor >= p.from && p.cursor <= p.to) fill(p.cursor - p.from, whole.top, whole.bottom, "var(--cursor)");

    staves.forEach((s) => s.draw());
    new StaveConnector(staves[0], staves[1]).setType("singleLeft").setContext(ctx).draw();
    new StaveConnector(staves[0], staves[1]).setType("brace").setContext(ctx).draw();
    ctx.save();
    ctx.setFillStyle("currentColor");
    for (let j = 1; j < n; j++) staves.forEach((s) => ctx.fillRect(columns[j].left - 2, s.getYForLine(0), 1, s.getYForLine(4) - s.getYForLine(0)));
    ctx.restore();

    const placeNote = (i: number, pitch: string, x: number, ink: string | null, diamond: boolean) => {
      const clef = VEXFLOW_CLEF[p.clefs[i]].clef;
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
      // Two voices a second apart (or in unison) on one staff: the lower one steps to the right.
      const shift = p.voices.map(() => 0);
      for (const st of [0, 1]) {
        const on = p.voices.map((v, i) => ({ i, q: v.notes[bar] })).filter((x) => x.q && p.voices[x.i].staff === st).sort((a, b) => parsePitch(b.q!).diatonic - parsePitch(a.q!).diatonic);
        for (let k = 1; k < on.length; k++) if (parsePitch(on[k - 1].q!).diatonic - parsePitch(on[k].q!).diatonic <= 1 && !shift[on[k - 1].i]) shift[on[k].i] = 15;
      }
      p.voices.forEach((v, i) => {
        const mine = v.notes[bar];
        const fux = v.fux?.[bar];
        const at = x + shift[i];
        if (fux) {
          const near = mine && Math.abs(parsePitch(mine).diatonic - parsePitch(fux).diatonic) <= 1;
          placeNote(v.staff, fux, at + (near ? 13 : 0), "var(--ink-fux)", true);
        }
        if (mine) {
          const note = placeNote(v.staff, mine, at, v.ink ?? null, false);
          if (p.names) {
            // Names stand after the last notehead on the staff; two close notes' names part vertically.
            const others = p.voices.filter((w, k) => k !== i && w.staff === v.staff && w.notes[bar]).map((w) => parsePitch(w.notes[bar]!).diatonic);
            const d = parsePitch(mine).diatonic;
            const nudge = others.some((o) => Math.abs(o - d) <= 2) ? (others.some((o) => o < d || (o === d && i > 0)) ? -4 : 5) : 0;
            const after = Math.max(0, ...p.voices.map((w, k) => (w.staff === v.staff ? shift[k] : 0)));
            ctx.save();
            ctx.setFont("Inter, system-ui, sans-serif", 9);
            ctx.setFillStyle(v.ink ?? "var(--ink-muted)");
            ctx.fillText(noteName(mine, p.nameStyle), x + 20 + after, note.getYs()[0] + 3 + nudge);
            ctx.restore();
          }
        }
      });
      // Figures above the lowest voice, stacked under the bass staff as a figured bass (highest on top).
      if (p.figures) {
        const ps = p.voices.map((v) => v.notes[bar]);
        if (ps.every(Boolean)) {
          const bass = ps.reduce((lo, q, i) => (parsePitch(q!).midi < parsePitch(ps[lo]!).midi ? i : lo), ps.length - 1);
          const figs = ps
            .map((q, i) => ({ i, q: q! }))
            .filter(({ i }) => i !== bass)
            .sort((a, b) => parsePitch(b.q).midi - parsePitch(a.q).midi)
            .map(({ q }) => {
              const f = harmonic(ps[bass]!, q);
              return `${f.quality === "A" || f.quality === "d" ? f.quality : ""}${f.number}`;
            });
          ctx.save();
          ctx.setFont("'EB Garamond', Garamond, Georgia, serif", 12);
          ctx.setFillStyle("var(--ink-muted)");
          figs.forEach((text, k) => ctx.fillText(text, x + 2, staves[1].getYForLine(4) + 34 + k * 13));
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
  }, [p.voices, p.clefs, p.active, p.selected, p.cursor, p.marks, p.figures, p.names, p.nameStyle, p.pulse, p.from, p.to, p.scale, p.fill, p.last, p.label, n]);

  // Pointer: the nearest staff takes the tap; a second finger makes it a pinch, which writes nothing.
  const fingers = useRef(new Set<number>());
  const pinched = useRef(false);
  const press = useRef<{ x: number; y: number } | null>(null);
  const locate = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    const svg = e.currentTarget.querySelector("svg");
    if (!g || !svg) return null;
    const r = svg.getBoundingClientRect();
    // On screen the drawing may be scaled again (the whole screen fitted to a small window, D103).
    const k = g.scale * (r.width / (svg.width.baseVal.value || r.width));
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    let column = g.columns.findIndex((c) => x >= c.left && x < c.right);
    if (column < 0) column = x < g.columns[0].left ? 0 : g.columns.length - 1;
    const centre = (s: Geometry["staves"][number]) => (s.top + s.bottom) / 2;
    const staff = g.staves.reduce((best, s, i) => (Math.abs(centre(s) - y) < Math.abs(centre(g.staves[best]) - y) ? i : best), 0);
    const s = g.staves[staff];
    const onStaff = y >= s.top - 5 * s.spacing && y <= s.bottom + 5 * s.spacing;
    const position = Math.round((s.bottom - y) / (s.spacing / 2));
    // The active voice if it lives on this staff, else the player's voice that does (if any).
    const here = p.voices.map((v, i) => ({ v, i })).filter(({ v }) => v.staff === staff && v.editable).map(({ i }) => i);
    const voice = here.includes(p.active) ? p.active : (here[0] ?? null);
    return { bar: p.from + column, voice, onStaff, natural: pitchAtPosition(p.clefs[staff], position) };
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
        if (at.onStaff && at.voice !== null) p.onPlace(at.voice, at.bar, at.natural);
        else p.onSelect(at.voice, at.bar);
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
