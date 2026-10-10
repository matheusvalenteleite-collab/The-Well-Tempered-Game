/**
 * The Well-Tempered Clavier's score (D119): Bach's rhythms as he wrote them, on a grand staff,
 * with the key signature, accidentals by the bar, beams, dots, triplets and ties over the bar
 * line, laid out by VexFlow's own formatter (the species screens place their notes by hand). Each
 * voice in its colour; the notes the player writes are slots in the given rhythm (grey until
 * written); a tap selects a slot and places the note under the pointer, with the key signature.
 */
import { useEffect, useMemo, useRef } from "react";
import { Accidental, Beam, Dot, Formatter, Renderer, Stave, StaveConnector, StaveNote, StaveTie, Tuplet, Voice, type StemmableNote } from "vexflow";
import { parsePitch, type Step } from "../../music/pitch.ts";
import { pitchAtPosition, type ClefId } from "./clefs.ts";
import { Viewport } from "./Viewport.tsx";

export interface WtcScoreNote {
  /** A pitch, or null for a slot still to write. */
  pitch: string | null;
  /** Onset and length in quarters from the start of the first bar. */
  at: number;
  dur: number;
  /** Colour of this note (overrides the voice's). */
  ink?: string;
  /** A label above it ("Subject", "Answer" ...). */
  label?: string;
  /** A mark above it (a mutation). */
  mark?: string;
  /** The slot index for the player's voice (for selection and taps). */
  slot?: number;
}

export interface WtcScoreVoice {
  notes: WtcScoreNote[];
  staff: 0 | 1;
  ink: string;
  editable: boolean;
}

interface Props {
  voices: WtcScoreVoice[];
  /** VexFlow key signature ("C", "Am", "F#", "Bbm" ...), the signature's alterations, the time signature. */
  keySig: string;
  signature: Record<Step, number>;
  time: string;
  barQuarters: number;
  /** The selected slot of the editable voice, or null. */
  selected: number | null;
  /** The bar being played, or -1. */
  cursor: number;
  label: string;
  onSlot(slot: number, pitch: string | null): void;
  zoom: number;
  onZoom(z: number): void;
  zoomLabels: { in: string; out: string; reset: string };
  tools?: React.ReactNode;
}

const EPS = 1e-6;
const CLEFS: [ClefId, ClefId] = ["treble", "bass"];
const STAFF_Y = [40, 170];
const HEIGHT = 300;
const LEAD = 120;
/** VexFlow durations by length in quarters, longest first. */
const DURS: [number, string, number][] = [
  [4, "w", 0], [3, "h", 1], [2, "h", 0], [1.5, "q", 1], [1, "q", 0], [0.75, "8", 1], [0.5, "8", 0], [0.375, "16", 1], [0.25, "16", 0], [0.1875, "32", 1], [0.125, "32", 0], [0.0625, "64", 0],
];
/** Split a length into written values (greedy), each [quarters, vexflow duration, dots]. */
function values(len: number): { q: number; d: string; dots: number; triplet: boolean }[] {
  const out: { q: number; d: string; dots: number; triplet: boolean }[] = [];
  // A triplet value (two thirds of a plain one): one note in a tuplet.
  const plain = DURS.find(([q]) => Math.abs(q - len * 1.5) < EPS && !DURS.some(([r]) => Math.abs(r - len) < EPS));
  if (plain) return [{ q: len, d: plain[1], dots: plain[2], triplet: true }];
  let rest = len;
  while (rest > EPS) {
    const v = DURS.find(([q]) => q <= rest + EPS);
    if (!v) break;
    out.push({ q: v[0], d: v[1], dots: v[2], triplet: false });
    rest -= v[0];
  }
  return out;
}

interface Piece {
  pitch: string | null;
  rest: boolean;
  d: string;
  dots: number;
  triplet: boolean;
  at: number;
  /** Tied to the next piece (the same note continued). */
  tieNext: boolean;
  src?: WtcScoreNote;
}

/** One voice's pieces in a bar: its notes cut at the bar lines, rests between them. */
function piecesInBar(v: WtcScoreVoice, bar: number, barQ: number): Piece[] {
  const start = bar * barQ;
  const end = start + barQ;
  const out: Piece[] = [];
  let t = start;
  const push = (len: number, pitch: string | null, rest: boolean, src: WtcScoreNote | undefined, tieLast: boolean) => {
    const vs = values(len);
    vs.forEach((x, k) => {
      out.push({ pitch, rest, d: x.d, dots: x.dots, triplet: x.triplet, at: t, tieNext: !rest && (k < vs.length - 1 || tieLast), src });
      t += x.q;
    });
  };
  for (const n of v.notes) {
    const a = Math.max(n.at, start);
    const b = Math.min(n.at + n.dur, end);
    if (b <= a + EPS) continue;
    if (a > t + EPS) push(a - t, null, true, undefined, false);
    t = a;
    push(b - a, n.pitch, false, n, n.at + n.dur > end + EPS);
  }
  if (end > t + EPS && out.length > 0) push(end - t, null, true, undefined, false);
  return out;
}

const VEX_ACC = (alter: number) => (alter === 1 ? "#" : alter === -1 ? "b" : alter === 2 ? "##" : alter === -2 ? "bb" : "n");

export function WtcScore(p: Props) {
  const bars = Math.max(1, Math.ceil(Math.max(...p.voices.flatMap((v) => v.notes.map((n) => n.at + n.dur))) / p.barQuarters - EPS));
  // Bar widths from the busiest voice of each bar (the same for drawing and for the cursor).
  const widths = useMemo(
    () =>
      Array.from({ length: bars }, (_, b) => {
        const most = Math.max(1, ...p.voices.map((v) => piecesInBar(v, b, p.barQuarters).length));
        return Math.max(150, 46 + most * 30);
      }),
    [p.voices, p.barQuarters, bars],
  );
  const lefts = widths.reduce<number[]>((acc, w, i) => (acc.push(i === 0 ? LEAD : acc[i - 1] + widths[i - 1]), acc), []);
  const natural = LEAD + widths.reduce((a, b) => a + b, 0) + 24;
  const playingX = p.cursor >= 0 && p.cursor < bars ? lefts[p.cursor] : null;
  return (
    <Viewport natural={natural} naturalHeight={HEIGHT} zoom={p.zoom} onZoom={p.onZoom} zoomLabels={p.zoomLabels} tools={p.tools} playingX={playingX}>
      {(scale) => <WtcSystem {...p} bars={bars} widths={widths} lefts={lefts} natural={natural} scale={scale} />}
    </Viewport>
  );
}

interface Hit {
  slot: number;
  x: number;
  staff: number;
}

function WtcSystem(p: Props & { bars: number; widths: number[]; lefts: number[]; natural: number; scale: number }) {
  const el = useRef<HTMLDivElement>(null);
  const hits = useRef<Hit[]>([]);
  const geo = useRef<{ staves: { top: number; bottom: number; spacing: number }[] } | null>(null);

  useEffect(() => {
    const host = el.current;
    if (!host) return;
    host.innerHTML = "";
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(Math.ceil(p.natural * p.scale), Math.ceil(HEIGHT * p.scale));
    const ctx = renderer.getContext();
    ctx.scale(p.scale, p.scale);
    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", p.label);
    const [num, den] = p.time.split("/").map(Number);
    hits.current = [];
    // Only the staves the voices use (two voices on one staff, as Bach writes them, need one).
    const used = [0, 1].filter((i) => p.voices.some((v) => v.staff === i));
    const yOf = (i: number) => (used.length === 1 ? STAFF_Y[0] : STAFF_Y[i]);
    const drawnBySrc = new Map<WtcScoreNote, StaveNote[]>();
    const lastPiece = new Map<number, { note: StaveNote; tieNext: boolean }>(); // by voice, across bars
    const ties: [StaveNote, StaveNote][] = [];
    let staves0: Stave[] = [];
    for (let b = 0; b < p.bars; b++) {
      const x = b === 0 ? 8 : p.lefts[b];
      const w = b === 0 ? p.lefts[0] - 8 + p.widths[0] : p.widths[b];
      const staves = CLEFS.map((clef, i) => {
        const s = new Stave(x, yOf(i), w);
        if (b === 0) {
          s.addClef(clef);
          s.addKeySignature(p.keySig);
          s.addTimeSignature(p.time);
        }
        if (b === p.bars - 1) s.setEndBarType(1);
        s.setContext(ctx);
        return s;
      });
      if (b === 0) staves0 = staves;
      // Highlights behind the notes: the bar being played.
      if (p.cursor === b) {
        ctx.save();
        ctx.setFillStyle("var(--cursor)");
        ctx.fillRect(p.lefts[b], staves[used[0]].getYForLine(0) - 20, p.widths[b], staves[used[used.length - 1]].getYForLine(4) - staves[used[0]].getYForLine(0) + 40);
        ctx.restore();
      }
      used.forEach((i) => staves[i].draw());
      if (used.length === 2) {
        if (b === 0) {
          new StaveConnector(staves[0], staves[1]).setType("brace").setContext(ctx).draw();
          new StaveConnector(staves[0], staves[1]).setType("singleLeft").setContext(ctx).draw();
        }
        new StaveConnector(staves[0], staves[1]).setType("singleRight").setContext(ctx).draw();
      }
      // Accidentals by the bar and the staff: the signature's, then what the bar has altered.
      const state = [new Map<string, number>(), new Map<string, number>()];
      const voices: Voice[] = [];
      const perVoice: { vi: number; v: WtcScoreVoice; tick: StaveNote[]; pieces: Piece[]; stem: 1 | -1 | 0 }[] = [];
      p.voices.forEach((v, vi) => {
        const pieces = piecesInBar(v, b, p.barQuarters);
        if (!pieces.length) return;
        const mates = p.voices.filter((w) => w.staff === v.staff && w.notes.some((n) => n.at < (b + 1) * p.barQuarters && n.at + n.dur > b * p.barQuarters));
        const stem: 1 | -1 | 0 = mates.length > 1 ? (p.voices.filter((w) => w.staff === v.staff).indexOf(v) === 0 ? 1 : -1) : 0;
        perVoice.push({ vi, v, tick: [], pieces, stem });
      });
      // Accidentals in time order across the voices of a staff.
      const accOf = new Map<Piece, string | null>();
      for (const st of [0, 1]) {
        const all = perVoice.filter((x) => x.v.staff === st).flatMap((x) => x.pieces).filter((q) => !q.rest && q.pitch).sort((a, c) => a.at - c.at);
        for (const q of all) {
          const pp = parsePitch(q.pitch!);
          const k = `${pp.step}${pp.octave}`;
          const cur = state[st].get(k) ?? p.signature[pp.step];
          const continued = q.src && q.src.at < q.at - EPS; // a tied continuation shows no accidental
          accOf.set(q, !continued && cur !== pp.alter ? VEX_ACC(pp.alter) : null);
          state[st].set(k, pp.alter);
        }
      }
      for (const pv of perVoice) {
        const clef = CLEFS[pv.v.staff];
        const middle = clef === "treble" ? "b/4" : "d/3";
        for (const q of pv.pieces) {
          let n: StaveNote;
          if (q.rest) {
            n = new StaveNote({ keys: [pv.stem === -1 ? (clef === "treble" ? "g/4" : "b/2") : pv.stem === 1 ? (clef === "treble" ? "d/5" : "f/3") : middle], duration: `${q.d}r`, clef });
          } else if (!q.pitch) {
            n = new StaveNote({ keys: [middle], duration: q.d, clef, ...(pv.stem ? { stem_direction: pv.stem } : { auto_stem: false }) });
            n.setStyle({ fillStyle: "var(--slot-ink, #b9b2a0)", strokeStyle: "var(--slot-ink, #b9b2a0)" });
          } else {
            const pp = parsePitch(q.pitch);
            n = new StaveNote({ keys: [`${pp.step.toLowerCase()}/${pp.octave}`], duration: q.d, clef, ...(pv.stem ? { stem_direction: pv.stem } : { auto_stem: true }) });
            const acc = accOf.get(q);
            if (acc) n.addModifier(new Accidental(acc));
            const ink = q.src?.ink ?? pv.v.ink;
            n.setStyle({ fillStyle: ink, strokeStyle: ink });
          }
          if (q.dots) Dot.buildAndAttach([n], { all: true });
          pv.tick.push(n);
          if (!q.rest && q.src) {
            const xs = drawnBySrc.get(q.src) ?? [];
            xs.push(n);
            drawnBySrc.set(q.src, xs);
            const prev = lastPiece.get(pv.vi);
            if (prev && prev.tieNext) ties.push([prev.note, n]);
            lastPiece.set(pv.vi, { note: n, tieNext: q.tieNext });
          } else lastPiece.set(pv.vi, { note: n, tieNext: false });
        }
        const voice = new Voice({ num_beats: num, beat_value: den }).setMode(Voice.Mode.SOFT);
        voice.addTickables(pv.tick);
        voices.push(voice);
      }
      if (!voices.length) continue;
      const fmt = new Formatter();
      for (const st of [0, 1]) {
        const vs = perVoice.map((pv, i) => (pv.v.staff === st ? voices[i] : null)).filter((x): x is Voice => !!x);
        if (vs.length) fmt.joinVoices(vs);
      }
      const startX = staves[0].getNoteStartX();
      fmt.format(voices, Math.max(40, x + w - startX - 16));
      perVoice.forEach((pv, i) => voices[i].draw(ctx, staves[pv.v.staff]));
      // Beams and triplets.
      for (const pv of perVoice) {
        // Beamed by the beat (a dotted quarter in compound time), by the notes' own places in the bar:
        // a rest, a longer note or a triplet between two quavers breaks the beam.
        const beat = num % 3 === 0 && num > 3 ? (3 * 4) / den : 4 / den;
        const barStart = b * p.barQuarters;
        let group: StemmableNote[] = [];
        let groupBeat = -1;
        const flush = () => {
          if (group.length > 1) new Beam(group, pv.stem === 0).setContext(ctx).draw();
          group = [];
        };
        pv.pieces.forEach((q, k) => {
          const ok = !q.rest && !q.triplet && ["8", "16", "32", "64"].includes(q.d);
          const bt = Math.floor((q.at - barStart) / beat + EPS);
          if (!ok || bt !== groupBeat) flush();
          if (ok) {
            if (!group.length) groupBeat = bt;
            group.push(pv.tick[k] as StemmableNote);
          }
        });
        flush();
        const trip = pv.tick.filter((_, k) => pv.pieces[k].triplet);
        for (let k = 0; k + 2 < trip.length; k += 3) {
          const group = trip.slice(k, k + 3) as StemmableNote[];
          new Tuplet(group, { num_notes: 3, notes_occupied: 2 }).setContext(ctx).draw();
          if (group.every((n) => ["8", "16", "32"].includes(n.getDuration()))) new Beam(group).setContext(ctx).draw();
        }
      }
      // Slots (for taps and the selection), labels and marks.
      for (const pv of perVoice) {
        pv.pieces.forEach((q, k) => {
          if (q.rest || !q.src) return;
          const n = pv.tick[k];
          const nx = n.getAbsoluteX();
          if (q.src.slot !== undefined && q.src.at >= q.at - EPS) {
            if (pv.v.editable) hits.current.push({ slot: q.src.slot, x: nx, staff: pv.v.staff });
            if (pv.v.editable && p.selected === q.src.slot) {
              ctx.save();
              ctx.setFillStyle("var(--selection)");
              ctx.fillRect(nx - 6, staves[pv.v.staff].getYForLine(0) - 22, 24, staves[pv.v.staff].getYForLine(4) - staves[pv.v.staff].getYForLine(0) + 44);
              ctx.restore();
            }
          }
          if (q.src.at >= q.at - EPS && (q.src.label || q.src.mark)) {
            ctx.save();
            ctx.setFont("Inter, system-ui, sans-serif", 10);
            ctx.setFillStyle(q.src.ink ?? pv.v.ink);
            const y = pv.stem === -1 ? staves[pv.v.staff].getYForLine(4) + 62 : staves[pv.v.staff].getYForLine(0) - 26;
            if (q.src.label) ctx.fillText(q.src.label, nx - 2, y);
            if (q.src.mark) ctx.fillText(q.src.mark, nx + 2, y + 12);
            ctx.restore();
          }
        });
      }
    }
    for (const [a, c] of ties) new StaveTie({ first_note: a, last_note: c, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
    // The selection is drawn after the notes: redraw nothing; it sits under them as a translucent band.
    geo.current = { staves: staves0.map((s, i) => (used.includes(i) ? { top: s.getYForLine(0), bottom: s.getYForLine(4), spacing: s.getSpacingBetweenLines() } : { top: -1e6, bottom: -1e6, spacing: 10 })) };
    host.dataset.geometry = JSON.stringify(geo.current);
  }, [p.voices, p.keySig, p.signature, p.time, p.barQuarters, p.selected, p.cursor, p.label, p.bars, p.widths, p.lefts, p.natural, p.scale]);

  const press = useRef<{ x: number; y: number } | null>(null);
  const locate = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    const svg = e.currentTarget.querySelector("svg");
    if (!g || !svg || !hits.current.length) return null;
    const r = svg.getBoundingClientRect();
    const k = p.scale * (r.width / (svg.width.baseVal.value || r.width));
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    const best = hits.current.reduce((a, h) => (Math.abs(h.x + 5 - x) < Math.abs(a.x + 5 - x) ? h : a));
    if (Math.abs(best.x + 5 - x) > 40) return null;
    const s = g.staves[best.staff];
    const onStaff = y >= s.top - 5 * s.spacing && y <= s.bottom + 5 * s.spacing;
    if (!onStaff) return { slot: best.slot, pitch: null };
    const position = Math.round((s.bottom - y) / (s.spacing / 2));
    const natural = pitchAtPosition(CLEFS[best.staff], position);
    const step = natural[0] as Step;
    const alter = p.signature[step];
    const pitch = `${step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${natural.slice(1)}`;
    return { slot: best.slot, pitch };
  };
  return (
    <div
      className="score-box"
      onPointerDown={(e) => (press.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const pr = press.current;
        press.current = null;
        if (!pr || Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 8) return;
        const at = locate(e);
        if (at) p.onSlot(at.slot, at.pitch);
      }}
    >
      <div ref={el} className="score" />
    </div>
  );
}
