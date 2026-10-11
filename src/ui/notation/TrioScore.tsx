/**
 * The three-voice score on two staves (D113, after D90): the voices share a treble and a bass staff
 * by register, as in a keyboard reduction, each voice in its own colour (the cantus in black, the
 * player's Contra I and Contra II in their track colours). A tap on a staff writes the active voice
 * if it lives there, else the player's voice that does; Fux's notes, when shown, are diamonds
 * beside the player's. The figures above the lowest voice are stacked under the bass staff, as a
 * figured bass. One line, zoomed and scrolled sideways like the two-voice score (D100).
 */
import { useEffect, useRef } from "react";
import { Accidental, Dot, ModifierContext, Renderer, Stave, StaveConnector, StaveNote, StaveTie, TickContext } from "vexflow";
import { fifthGlyphs, REST, slotLayout } from "../../counterpoint/layout.ts";
import { parsePitch } from "../../music/pitch.ts";
import { noteName, type NameStyle } from "../../music/names.ts";
import { harmonic } from "../../counterpoint/interval.ts";
import { harmonyOf } from "../../counterpoint/choices/harmony.ts";
import type { ModalFinal } from "../../music/fux/types.ts";
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
  /**
   * Species 2-4 (D114, D116): the voice moves in minims or ligatures (2 a bar) or crotchets (4);
   * `notes` (and `fux`) are its slots (one in the last bar; rests may stand anywhere).
   * Fifth species (D117): 8 quaver slots a bar, a note held on by HOLD slots, as in two voices (D82).
   */
  per?: 2 | 4 | 8;
  /** Stem direction of its notes (up for the upper voice of a shared staff). */
  stem?: 1 | -1;
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
  /** The selected bar, and (for the moving voice) which note of it. */
  selected: number;
  selectedPart?: number | null;
  /** Four voices (D148): how many slots of the active voice the selection covers (a minim: 4 quavers). */
  selectedSpan?: number;
  cursor: number;
  marks?: TrioMark[];
  /** Bars pointed at in a text: they pulse (D96). */
  pulse?: number[];
  figures?: boolean;
  /**
   * D115: the harmonic view, a modern lens: a Roman numeral under each bar's figures, relative to
   * the final (in brackets where an incomplete chord leaves the root a guess). Never graded.
   */
  harmony?: { final: ModalFinal } | null;
  names?: boolean;
  nameStyle?: NameStyle;
  label: string;
  onPlace(voice: number, bar: number, natural: string, part: number): void;
  onSelect(voice: number | null, bar: number): void;
  zoom: number;
  onZoom(z: number): void;
  zoomLabels: { in: string; out: string; reset: string };
  tools?: React.ReactNode;
}

/** Bars in the piece: a semibreve voice's notes, or (four voices, D148: every part in slots) a slot line's bars. */
const barsOf = (voices: TrioVoice[]) => {
  const whole = voices.find((v) => !v.per);
  if (whole) return whole.notes.length;
  const v = voices[0];
  return (v.notes.length - 1) / v.per! + 1;
};
const BAR_W = 64;
/** Wider bars when a voice moves in minims (or ligatures), wider still in crotchets. */
const barWidth = (voices: TrioVoice[]) => (voices.some((v) => v.per === 8) ? 216 : voices.some((v) => v.per === 4) ? 150 : voices.some((v) => v.per) ? 104 : BAR_W);
/** Florid notes: VexFlow duration and dots by length in quaver slots (as the two-voice score). */
const FIFTH_DUR: Record<number, [string, number]> = { 1: ["8", 0], 2: ["q", 0], 3: ["q", 1], 4: ["h", 0], 5: ["h", 0], 6: ["h", 1], 7: ["h", 1], 8: ["w", 0] };
const LEAD = 96;
const NOTE_PAD = 14;
const STAFF_Y = [28, 148];
const HEIGHT = 300;

/** The two staves in one line, zoomed and scrolled sideways like the two-voice score (D100). */
export function TrioScore(p: Props) {
  const bars = barsOf(p.voices);
  const barW = barWidth(p.voices);
  const natural = LEAD + bars * barW + 24;
  const playingX = p.cursor >= 0 ? LEAD + p.cursor * barW : null;
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
  /** Bars in the piece (a semibreve voice has one note a bar). */
  const bars0 = barsOf(p.voices);

  useEffect(() => {
    const host = el.current;
    if (!host) return;
    host.innerHTML = "";
    const probe = new Stave(8, 0, 400);
    probe.addClef("treble");
    probe.addTimeSignature("C|");
    const start0 = probe.getNoteStartX();
    const naturalW = start0 + n * barWidth(p.voices) + 24;
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
    for (const m of p.marks ?? []) {
      if (m.bar < p.from || m.bar > p.to) continue;
      fill(m.bar - p.from, whole.top, whole.bottom, m.severity === "error" ? "var(--mark-error)" : "var(--mark-warning)");
      // D149: a shape beside the colour, ✗ a rule broken, ! a piece of advice.
      ctx.save();
      ctx.setFillStyle(m.severity === "error" ? "var(--bad)" : "var(--warn)");
      ctx.setFont("Inter, system-ui, sans-serif", 11, "700");
      ctx.fillText(m.severity === "error" ? "✗" : "!", columns[m.bar - p.from].right - 12, whole.top + 12);
      ctx.restore();
    }
    for (const b of p.pulse ?? []) if (b >= p.from && b <= p.to) {
      const g = ctx.openGroup("pulse");
      fill(b - p.from, whole.top - 6, whole.bottom + 6, "var(--pulse)");
      ctx.closeGroup();
      void g;
    }
    const activeStaff = p.voices[p.active]?.staff ?? 0;
    if (p.selected >= p.from && p.selected <= p.to) {
      const j = p.selected - p.from;
      const per = p.voices[p.active]?.per;
      const part = per && p.selectedPart != null && p.selected < bars0 - 1 ? p.selectedPart : null;
      if (part === null || !per) fill(j, band(activeStaff).top, band(activeStaff).bottom, "var(--selection)");
      else {
        const w = (columns[j].right - columns[j].left) / per;
        ctx.save();
        ctx.setFillStyle("var(--selection)");
        const span = Math.max(1, Math.min(per - part, p.selectedSpan ?? 1));
        ctx.fillRect(columns[j].left + part * w + 1, band(activeStaff).top, w * span - 2, band(activeStaff).bottom - band(activeStaff).top);
        ctx.restore();
      }
    }
    if (p.cursor >= p.from && p.cursor <= p.to) fill(p.cursor - p.from, whole.top, whole.bottom, "var(--cursor)");

    staves.forEach((s) => s.draw());
    new StaveConnector(staves[0], staves[1]).setType("singleLeft").setContext(ctx).draw();
    new StaveConnector(staves[0], staves[1]).setType("brace").setContext(ctx).draw();
    ctx.save();
    ctx.setFillStyle("currentColor");
    for (let j = 1; j < n; j++) staves.forEach((s) => ctx.fillRect(columns[j].left - 2, s.getYForLine(0), 1, s.getYForLine(4) - s.getYForLine(0)));
    ctx.restore();

    const placeNote = (i: number, pitch: string, x: number, ink: string | null, diamond: boolean, duration: string = "w", stem: 1 | -1 = 1, dots = 0) => {
      const clef = VEXFLOW_CLEF[p.clefs[i]].clef;
      if (pitch === REST) {
        // On the fourth line for the upper voice of a shared staff, the second for the lower one.
        const bass = p.clefs[i] === "bass";
        const key = stem === 1 ? (bass ? "f/3" : "d/5") : bass ? "b/2" : "g/4";
        const r = new StaveNote({ keys: [key], duration: `${duration}r`, clef });
        if (dots) Dot.buildAndAttach([r], { all: true });
        if (ink) r.setStyle({ fillStyle: ink, strokeStyle: ink });
        r.setStave(staves[i]);
        const tc = new TickContext();
        tc.addTickable(r);
        tc.preFormat();
        tc.setX(0);
        tc.setX(x - r.getAbsoluteX());
        r.setContext(ctx).draw();
        return r;
      }
      const q = parsePitch(pitch);
      const acc = q.alter === 0 ? null : q.alter === 1 ? "#" : q.alter === -1 ? "b" : q.alter === 2 ? "##" : "bb";
      const key = `${q.step.toLowerCase()}${acc ?? ""}/${q.octave}`;
      const note = new StaveNote({ keys: [diamond ? `${key}/D` : key], duration, clef, stem_direction: stem });
      if (acc) note.addModifier(new Accidental(acc));
      if (dots) Dot.buildAndAttach([note], { all: true });
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
    // Each voice's notes in a bar: one semibreve, or the moving voice's slots.
    type Cell = { k: number; q: string | null; part: number; dur: string; dots?: number; tied?: boolean };
    const florid = slotLayout("fifth", bars0);
    const inBar = (v: TrioVoice, bar: number, line: (string | null)[] | undefined): Cell[] => {
      if (!line) return [];
      if (v.per === 8) {
        // What begins in each quaver slot of the bar (a note held over the bar line: its tied continuation).
        const gs = fifthGlyphs(line, florid);
        const cells: Cell[] = [];
        florid.forEach((sl, k) => {
          const g = gs[k];
          if (sl.bar !== bar || !g) return;
          const last = sl.duration === "1/1";
          cells.push({ k, q: g.value, part: sl.beat, dur: last ? "w" : FIFTH_DUR[g.slots][0], dots: last ? 0 : FIFTH_DUR[g.slots][1], tied: g.tied });
        });
        return cells;
      }
      if (!v.per) return [{ k: bar, q: line[bar] ?? null, part: 0, dur: "w" }];
      if (bar === bars0 - 1) return [{ k: v.per * bar, q: line[v.per * bar] ?? null, part: 0, dur: "w" }];
      return Array.from({ length: v.per }, (_, h) => ({ k: v.per! * bar + h, q: line[v.per! * bar + h] ?? null, part: h, dur: v.per === 4 ? "q" : "h" }));
    };
    /** The note sounding at the downbeat (for collisions and figures): the arsis after an opening rest. */
    const downNote = (v: TrioVoice, bar: number) => {
      const xs = inBar(v, bar, v.notes).filter((e) => e.q && e.q !== REST);
      return xs.length ? xs[0].q : null;
    };
    const drawn = p.voices.map(() => new Map<number, StaveNote>());
    for (let j = 0; j < n; j++) {
      const bar = p.from + j;
      const x = columns[j].left + NOTE_PAD;
      const cellW = (per: number) => (columns[j].right - columns[j].left) / per;
      // Two voices a second apart (or in unison) on one staff: the lower one steps to the right.
      const shift = p.voices.map(() => 0);
      for (const st of [0, 1]) {
        const on = p.voices.map((v, i) => ({ i, q: v.per ? ((c) => (c && c.part === 0 && c.q !== REST ? c.q : null))(inBar(v, bar, v.notes)[0]) : v.notes[bar] })).filter((x) => x.q && p.voices[x.i].staff === st).sort((a, b) => parsePitch(b.q!).diatonic - parsePitch(a.q!).diatonic);
        for (let k = 1; k < on.length; k++) if (parsePitch(on[k - 1].q!).diatonic - parsePitch(on[k].q!).diatonic <= 1 && !shift[on[k - 1].i]) shift[on[k].i] = 15;
      }
      p.voices.forEach((v, i) => {
        const fuxes = inBar(v, bar, v.fux);
        const mineHere = inBar(v, bar, v.notes);
        if (v.per === 8)
          // Florid: Fux's notes stand at their own places in the bar (his rhythm may differ).
          for (const f of fuxes) {
            if (!f.q || f.q === REST) continue;
            const e = mineHere.find((c) => c.part === f.part);
            const near = e?.q && e.q !== REST && Math.abs(parsePitch(e.q).diatonic - parsePitch(f.q).diatonic) <= 1;
            placeNote(v.staff, f.q, x + (f.part ? f.part * cellW(8) : shift[i]) + (near ? 9 : 0), "var(--ink-fux)", true, f.dur, v.stem ?? 1, f.dots ?? 0);
          }
        mineHere.forEach((e, n2) => {
          const at = x + (e.part ? e.part * cellW(v.per ?? 1) : shift[i]);
          const fux = v.per === 8 ? null : fuxes[n2]?.q;
          if (fux && fux !== REST) {
            const near = e.q && e.q !== REST && Math.abs(parsePitch(e.q).diatonic - parsePitch(fux).diatonic) <= 1;
            placeNote(v.staff, fux, at + (near ? 13 : 0), "var(--ink-fux)", true, e.dur, v.stem ?? 1);
          }
          if (!e.q) return;
          const note = placeNote(v.staff, e.q, at, v.ink ?? null, false, e.dur, v.stem ?? 1, e.dots ?? 0);
          drawn[i].set(e.k, note);
          if (p.names && e.q !== REST) {
            // Names stand after the last notehead on the staff; two close notes' names part vertically.
            const others = p.voices.filter((w, k) => k !== i && w.staff === v.staff && downNote(w, bar)).map((w) => parsePitch(downNote(w, bar)!).diatonic);
            const d = parsePitch(e.q).diatonic;
            const nudge = !e.part && others.some((o) => Math.abs(o - d) <= 2) ? (others.some((o) => o < d || (o === d && i > 0)) ? -4 : 5) : 0;
            const after = e.part ? 0 : Math.max(0, ...p.voices.map((w, k) => (w.staff === v.staff ? shift[k] : 0)));
            ctx.save();
            ctx.setFont("Inter, system-ui, sans-serif", 9);
            ctx.setFillStyle(v.ink ?? "var(--ink-muted)");
            ctx.fillText(noteName(e.q, p.nameStyle), at + (e.dur === "w" ? 20 : 13) + after, note.getYs()[0] + 3 + nudge);
            ctx.restore();
          }
        });
      });
      // Figures above the lowest voice, stacked under the bass staff as a figured bass (highest on top).
      if (p.figures) {
        const ps = p.voices.map((v) => downNote(v, bar));
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
      if (p.harmony) {
        const ps = p.voices.map((v) => downNote(v, bar));
        if (ps.every(Boolean)) {
          const h = harmonyOf(ps as string[], p.harmony.final);
          ctx.save();
          ctx.setFont("'EB Garamond', Garamond, Georgia, serif", 13);
          ctx.setFillStyle("var(--harmony-ink, #7a5a1a)");
          ctx.fillText(h.guessed ? `(${h.roman})` : h.roman, x - 2, staves[1].getYForLine(4) + 34 + (p.figures ? 30 : 0));
          ctx.restore();
        }
      }
    }
    // The cadence tie (D114): an arsis held into the next thesis.
    p.voices.forEach((v, i) => {
      if (!v.per) return;
      if (v.per === 8) {
        // Florid (D117): a note held over the bar line, tied to its continuation.
        const keys = [...drawn[i].keys()].sort((a, b) => a - b);
        for (const c of Array.from({ length: n }, (_, j) => inBar(v, p.from + j, v.notes)).flat()) {
          if (!c.tied || c.q === REST) continue;
          const before = keys.filter((k) => k < c.k).pop();
          const a = before !== undefined ? drawn[i].get(before) : undefined;
          const b = drawn[i].get(c.k);
          if (a && b) new StaveTie({ first_note: a, last_note: b, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
        }
        return;
      }
      for (const [k, a] of drawn[i]) {
        const b = drawn[i].get(k + 1);
        if (k % v.per === v.per - 1 && b && v.notes[k] && v.notes[k] !== REST && v.notes[k] === v.notes[k + 1]) new StaveTie({ first_note: a, last_note: b, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
      }
    });
    geo.current = {
      scale: p.scale,
      columns,
      staves: staves.map((s) => ({ top: s.getYForLine(0), bottom: s.getYForLine(4), spacing: s.getSpacingBetweenLines() })),
    };
    host.dataset.geometry = JSON.stringify(geo.current);
  }, [p.voices, p.clefs, p.active, p.selected, p.selectedPart, p.selectedSpan, p.cursor, p.marks, p.figures, p.harmony, p.names, p.nameStyle, p.pulse, p.from, p.to, p.scale, p.fill, p.last, p.label, n, bars0]);

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
    const c = g.columns[column];
    const per = voice !== null ? (p.voices[voice].per ?? 1) : 1;
    const part = Math.max(0, Math.min(per - 1, Math.floor(((x - c.left) / (c.right - c.left)) * per)));
    return { bar: p.from + column, voice, onStaff, part, natural: pitchAtPosition(p.clefs[staff], position) };
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
        if (at.onStaff && at.voice !== null) p.onPlace(at.voice, at.bar, at.natural, at.part);
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
