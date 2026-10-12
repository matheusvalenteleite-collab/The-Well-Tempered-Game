/**
 * The Well-Tempered Clavier's score (D119): Bach's rhythms as he wrote them, on a grand staff,
 * with the key signature, accidentals by the bar, beams, dots, triplets and ties over the bar
 * line, laid out by VexFlow's own formatter (the species screens place their notes by hand). Each
 * voice in its colour; the notes the player writes are slots in the given rhythm (grey until
 * written); a tap selects a slot and places the note under the pointer, with the key signature.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Accidental, Articulation, Beam, GraceNote, GraceNoteGroup, Ornament, Dot, Formatter, Renderer, Stave, StaveConnector, StaveNote, StaveTie, Tuplet, Voice, type StemmableNote } from "vexflow";
import { parsePitch, type Step } from "../../music/pitch.ts";
import { pitchAtPosition, type ClefId } from "./clefs.ts";
import { chooseClefs } from "./clef-chooser.ts";
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
  /** Other notes struck with it in the same voice (a chord, D134). */
  chord?: string[];
  /** A fermata over (or under) it (the chorales, C15). */
  fermata?: boolean;
  /** P8: its ornament signs as the kern encoding writes them (T t trill, M m mordent, W w short trill, S turn, $ inverted turn), and the grace notes before it. */
  orn?: string;
  grace?: string[];
  /** P30: the syllable sung on it, drawn under its staff (the hymn's words under the soprano). */
  lyric?: string;
}

/**
 * P15: one clef plan for a whole piece (to pass as `clefPlan`): each staff's clef bar by bar from its
 * voices' notes (`chooseClefs`), `clefs` giving the staves and the clef each should rather start in.
 */
export function planClefs(voices: WtcScoreVoice[], clefs: ClefId[], barQuarters: number): ClefId[][] {
  const end = Math.max(0, ...voices.flatMap((v) => v.notes.map((n) => n.at + n.dur)));
  const bars = Math.max(1, Math.ceil(end / barQuarters - EPS));
  return chooseClefs(
    clefs.map((_, st) =>
      Array.from({ length: bars }, (_, b) =>
        voices.filter((v) => v.staff === st).flatMap((v) => v.notes.filter((n) => n.pitch && n.at < (b + 1) * barQuarters - EPS && n.at + n.dur > b * barQuarters + EPS).flatMap((n) => [n.pitch!, ...(n.chord ?? [])])),
      ),
    ),
    { prefer: clefs.map((c) => (c === "treble" || c === "bass" ? c : undefined)) },
  );
}

/** P8: the sign drawn for kern ornament signs (VexFlow's names). */
function ornamentGlyph(signs: string): string | null {
  if (/[Tt]/.test(signs)) return "tr";
  if (/[Mm]/.test(signs)) return "mordent";
  if (/[Ww]/.test(signs)) return "mordent_inverted";
  if (signs.includes("$")) return "turn_inverted";
  if (signs.includes("S")) return "turn";
  if (signs.includes("O")) return "tr";
  return null;
}

export interface WtcScoreVoice {
  notes: WtcScoreNote[];
  /** The staff it is drawn on, from the top (P4: as many as `clefs`; two by default). */
  staff: number;
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
  /**
   * Lines of text under the lower staff at onsets (quarters), placed under the notes struck there
   * (the chorales' figures and fundamental bass, C15); `ink` colours them.
   */
  under?: { at: number; lines: string[]; ink?: string }[];
  /** P4: the clefs of the staves, top down (default a grand staff, treble and bass); one a voice for an open score. */
  clefs?: ClefId[];
  /**
   * P6: each staff's clef chosen bar by bar from its notes (G and F, and their octave forms), a
   * change marked by a small clef at the bar; `clefs` then gives only the number of staves.
   */
  autoClefs?: boolean;
  /**
   * P15: a clef plan for the whole piece, clefs[staff][bar] (e.g. `chooseClefs` over every bar, so
   * that the clefs hold across the rows of a page); it takes the place of `autoClefs`. On the page,
   * each row takes the bars from its `from`.
   */
  clefPlan?: ClefId[][];
}

const EPS = 1e-6;
const GRAND: ClefId[] = ["treble", "bass"];
/** The staves' places (P4: any number of them, 130 apart). */
const STAFF_GAP = 130;
const staffY = (i: number) => 40 + i * STAFF_GAP;
const HEIGHT = 300;
/** Room for the staves beyond two (P4) and for the lines of text under them (C15). */
const heightOf = (under?: unknown[], staves = 2) => HEIGHT + Math.max(0, staves - 2) * STAFF_GAP + (under?.length ? 56 : 0);
/** A treble clef with an 8 below is written an octave above the sound; a bass clef with an 8 above, below it. */
const written = (clef: ClefId) => (clef === "treble_8vb" ? 1 : clef === "bass_8va" ? -1 : 0);
/** VexFlow's clef name and its octave mark. */
const vexClef = (clef: ClefId): [string, string | undefined] => (clef === "treble_8vb" ? ["treble", "8vb"] : clef === "bass_8va" ? ["bass", "8va"] : [clef, undefined]);
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
    <Viewport natural={natural} naturalHeight={heightOf(p.under, (p.clefs ?? GRAND).length)} zoom={p.zoom} onZoom={p.onZoom} zoomLabels={p.zoomLabels} tools={p.tools} playingX={playingX}>
      {(scale) => <WtcSystem {...p} bars={bars} widths={widths} lefts={lefts} natural={natural} scale={scale} />}
    </Viewport>
  );
}

/**
 * A page of systems, one under the other (D127, the owner: "see the sheet music playing", as in
 * Gerubach's videos): each row a few bars, fitted to the page's width; the row playing on top.
 */
export function WtcPage(p: Omit<Props, "voices" | "cursor" | "label" | "zoom" | "onZoom" | "zoomLabels" | "tools" | "under"> & { rows: { voices: WtcScoreVoice[]; bars: number; cursor: number; label: string; key: string; under?: Props["under"]; from?: number }[]; fitWidth?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = host.current!;
    const measure = () => (setW(el.clientWidth), setH(el.clientHeight));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  return (
    <div className="wtc-page" ref={host}>
      {w > 0 &&
        p.rows.map((r) => {
          const voices = r.voices;
          const bars = r.bars;
          const widths = Array.from({ length: bars }, (_, b) => Math.max(150, 46 + Math.max(1, ...voices.map((v) => piecesInBar(v, b, p.barQuarters).length)) * 30));
          const lefts = widths.reduce<number[]>((acc, x, i) => (acc.push(i === 0 ? LEAD : acc[i - 1] + widths[i - 1]), acc), []);
          const natural = LEAD + widths.reduce((a, b) => a + b, 0) + 24;
          // Fitted to the width, and small enough that two systems fit the page's height (reading ahead, as in a printed score).
          // `fitWidth` (the chorales, C17): rows as wide as the page, scrolled, large enough to write on.
          const scale = Math.min(1.1, (w - 8) / natural, !p.fitWidth && h > 100 ? (h - 12) / 2 / heightOf(r.under, (p.clefs ?? GRAND).length) : Infinity);
          return (
            <div key={r.key} className={r.cursor >= 0 ? "wtc-sys playing" : "wtc-sys"}>
              <WtcSystem {...p} voices={voices} cursor={r.cursor} label={r.label} under={r.under} clefPlan={p.clefPlan?.map((st) => st.slice(r.from ?? 0, (r.from ?? 0) + r.bars))} zoom={1} onZoom={() => undefined} zoomLabels={{ in: "", out: "", reset: "" }} bars={bars} widths={widths} lefts={lefts} natural={natural} scale={scale} bothStaves />
            </div>
          );
        })}
    </div>
  );
}

interface Hit {
  slot: number;
  x: number;
  staff: number;
  /** The clef in force where the slot stands (P6). */
  clef: ClefId;
}

function WtcSystem(p: Props & { bars: number; widths: number[]; lefts: number[]; natural: number; scale: number; bothStaves?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const hits = useRef<Hit[]>([]);
  const geo = useRef<{ staves: { top: number; bottom: number; spacing: number }[] } | null>(null);

  useEffect(() => {
    const host = el.current;
    if (!host) return;
    host.innerHTML = "";
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    const CLEFS = p.clefs ?? GRAND;
    const ALL = CLEFS.map((_, i) => i);
    renderer.resize(Math.ceil(p.natural * p.scale), Math.ceil(heightOf(p.under, CLEFS.length) * p.scale));
    const ctx = renderer.getContext();
    ctx.scale(p.scale, p.scale);
    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", p.label);
    const [num, den] = p.time.split("/").map(Number);
    hits.current = [];
    // Only the staves the voices use (two voices on one staff, as Bach writes them, need one).
    // P6: the clef of each staff in each bar.
    const plan: ClefId[][] = p.clefPlan
      ? ALL.map((st) => Array.from({ length: p.bars }, (_, b) => p.clefPlan![st]?.[b] ?? p.clefPlan![st]?.[p.clefPlan![st].length - 1] ?? CLEFS[st]))
      : p.autoClefs
      ? chooseClefs(ALL.map((st) => Array.from({ length: p.bars }, (_, b) => p.voices.filter((v) => v.staff === st).flatMap((v) => v.notes.filter((n) => n.pitch && n.at < (b + 1) * p.barQuarters - EPS && n.at + n.dur > b * p.barQuarters + EPS).flatMap((n) => [n.pitch!, ...(n.chord ?? [])])))), { prefer: CLEFS.map((c) => (c === "treble" || c === "bass" ? c : undefined)) })
      : ALL.map((st) => Array.from({ length: p.bars }, () => CLEFS[st]));
    const used = p.bothStaves ? ALL : ALL.filter((i) => p.voices.some((v) => v.staff === i));
    const yOf = (i: number) => staffY(Math.max(0, used.indexOf(i)));
    const drawnBySrc = new Map<WtcScoreNote, StaveNote[]>();
    const lastPiece = new Map<number, { note: StaveNote; tieNext: boolean }>(); // by voice, across bars
    const ties: [StaveNote, StaveNote][] = [];
    let staves0: Stave[] = [];
    /** Where each onset is drawn (the leftmost note struck there), for the text under the staves. */
    const onsetX = new Map<number, number>();
    for (let b = 0; b < p.bars; b++) {
      const x = b === 0 ? 8 : p.lefts[b];
      const w = b === 0 ? p.lefts[0] - 8 + p.widths[0] : p.widths[b];
      const staves = CLEFS.map((_, i) => {
        const s = new Stave(x, yOf(i), w);
        const clef = plan[i][b];
        if (b === 0) {
          s.addClef(vexClef(clef)[0], "default", vexClef(clef)[1]);
          s.addKeySignature(p.keySig);
          s.addTimeSignature(p.time);
        }
        // A change of clef, marked small at the start of the bar.
        else if (clef !== plan[i][b - 1]) s.addClef(vexClef(clef)[0], "small", vexClef(clef)[1]);
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
      if (used.length >= 2) {
        const [top, bottom] = [staves[used[0]], staves[used[used.length - 1]]];
        if (b === 0) {
          // A keyboard's brace over two staves; a choir's bracket over more (P4).
          new StaveConnector(top, bottom).setType(used.length === 2 ? "brace" : "bracket").setContext(ctx).draw();
          new StaveConnector(top, bottom).setType("singleLeft").setContext(ctx).draw();
        }
        new StaveConnector(top, bottom).setType("singleRight").setContext(ctx).draw();
      }
      // Accidentals by the bar and the staff: the signature's, then what the bar has altered.
      const state = CLEFS.map(() => new Map<string, number>());
      const voices: Voice[] = [];
      const perVoice: { vi: number; v: WtcScoreVoice; tick: StaveNote[]; pieces: Piece[]; stem: 1 | -1 | 0 }[] = [];
      p.voices.forEach((v, vi) => {
        const pieces = piecesInBar(v, b, p.barQuarters);
        if (!pieces.length) return;
        const mates = p.voices.filter((w) => w.staff === v.staff && w.notes.some((n) => n.at < (b + 1) * p.barQuarters && n.at + n.dur > b * p.barQuarters));
        const stem: 1 | -1 | 0 = mates.length > 1 ? (p.voices.filter((w) => w.staff === v.staff).indexOf(v) === 0 ? 1 : -1) : 0;
        perVoice.push({ vi, v, tick: [], pieces, stem });
      });
      // Accidentals in time order across the voices of a staff, for every note of a chord.
      const keysOf = (q: Piece) => [q.pitch!, ...(q.src?.chord ?? [])].sort((a, c) => parsePitch(a).midi - parsePitch(c).midi);
      const accOf = new Map<Piece, (string | null)[]>();
      for (const st of ALL) {
        const all = perVoice.filter((x) => x.v.staff === st).flatMap((x) => x.pieces).filter((q) => !q.rest && q.pitch).sort((a, c) => a.at - c.at);
        for (const q of all) {
          const continued = q.src && q.src.at < q.at - EPS; // a tied continuation shows no accidental
          accOf.set(
            q,
            keysOf(q).map((x) => {
              const pp = parsePitch(x);
              const k = `${pp.step}${pp.octave}`;
              const cur = state[st].get(k) ?? p.signature[pp.step];
              state[st].set(k, pp.alter);
              return !continued && cur !== pp.alter ? VEX_ACC(pp.alter) : null;
            }),
          );
        }
      }
      for (const pv of perVoice) {
        const clefId = plan[pv.v.staff][b];
        const clef = clefId.startsWith("bass") ? "bass" : "treble";
        const up = written(clefId);
        const middle = clef === "treble" ? "b/4" : "d/3";
        for (const q of pv.pieces) {
          let n: StaveNote;
          if (q.rest) {
            n = new StaveNote({ keys: [pv.stem === -1 ? (clef === "treble" ? "g/4" : "b/2") : pv.stem === 1 ? (clef === "treble" ? "d/5" : "f/3") : middle], duration: `${q.d}r`, clef });
          } else if (!q.pitch) {
            // An empty slot where its voice lives: low on the staff for the lower of two voices, high for the upper (C17).
            const home = pv.stem === -1 ? (clef === "treble" ? "e/4" : "g/2") : pv.stem === 1 ? (clef === "treble" ? "e/5" : "a/3") : middle;
            n = new StaveNote({ keys: [home], duration: q.d, clef, ...(pv.stem ? { stem_direction: pv.stem } : { auto_stem: false }) });
            n.setStyle({ fillStyle: "var(--slot-ink, #b9b2a0)", strokeStyle: "var(--slot-ink, #b9b2a0)" });
          } else {
            const keys = keysOf(q).map((x) => {
              const pp = parsePitch(x);
              return `${pp.step.toLowerCase()}/${pp.octave + up}`;
            });
            n = new StaveNote({ keys, duration: q.d, clef, ...(pv.stem ? { stem_direction: pv.stem } : { auto_stem: true }) });
            (accOf.get(q) ?? []).forEach((acc, i) => acc && n.addModifier(new Accidental(acc), i));
            // P8: the ornament over the note's first piece, its grace notes before it.
            if (q.src && q.src.at >= q.at - EPS) {
              const glyph = q.src.orn ? ornamentGlyph(q.src.orn) : null;
              if (glyph) n.addModifier(new Ornament(glyph).setPosition(pv.stem === -1 ? 4 : 3), 0);
              if (q.src.grace?.length) {
                const gs = q.src.grace.map((g) => {
                  const gp = parsePitch(g);
                  const gn = new GraceNote({ keys: [`${gp.step.toLowerCase()}/${gp.octave + up}`], duration: "8", slash: q.src!.grace!.length === 1, clef });
                  if (gp.alter) gn.addModifier(new Accidental(VEX_ACC(gp.alter)), 0);
                  return gn;
                });
                n.addModifier(new GraceNoteGroup(gs, q.src.grace.length > 1), 0);
              }
            }
            const ink = q.src?.ink ?? pv.v.ink;
            n.setStyle({ fillStyle: ink, strokeStyle: ink });
          }
          if (q.dots) Dot.buildAndAttach([n], { all: true });
          // The fermata on the note's last written piece (the one not tied on).
          if (!q.rest && q.src?.fermata && !q.tieNext)
            n.addModifier(new Articulation("a@a").setPosition(pv.stem === -1 ? 4 : 3));
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
      for (const st of ALL) {
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
          if (q.src.at >= q.at - EPS) {
            const key = Math.round(q.at * 64);
            onsetX.set(key, Math.min(onsetX.get(key) ?? Infinity, nx));
          }
          if (q.src.slot !== undefined && q.src.at >= q.at - EPS) {
            if (pv.v.editable) hits.current.push({ slot: q.src.slot, x: nx, staff: pv.v.staff, clef: plan[pv.v.staff][b] });
            if (pv.v.editable && p.selected === q.src.slot) {
              ctx.save();
              ctx.setFillStyle("var(--selection)");
              ctx.fillRect(nx - 6, staves[pv.v.staff].getYForLine(0) - 22, 24, staves[pv.v.staff].getYForLine(4) - staves[pv.v.staff].getYForLine(0) + 44);
              ctx.restore();
            }
          }
          if (q.src.lyric && q.src.at >= q.at - EPS) {
            ctx.save();
            ctx.setFont("Georgia, serif", 12, "normal", "italic");
            // On a light backing, so that the words read across the inner voices' stems between the staves.
            const ly = staves[pv.v.staff].getYForLine(4) + 44;
            const w = q.src.lyric.length * 6.4 + 4;
            ctx.setFillStyle("rgba(251, 248, 241, 0.92)");
            ctx.fillRect(nx - 4, ly - 11, w, 15);
            ctx.setFillStyle("#1d1b17");
            ctx.fillText(q.src.lyric, nx - 2, ly);
            ctx.restore();
          }
          if (q.src.at >= q.at - EPS && (q.src.label || q.src.mark)) {
            ctx.save();
            ctx.setFont("Inter, system-ui, sans-serif", 10);
            ctx.setFillStyle(q.src.ink ?? pv.v.ink);
            // Above a fermata, clear of it.
            const y = pv.stem === -1 ? staves[pv.v.staff].getYForLine(4) + 62 : staves[pv.v.staff].getYForLine(0) - (q.src.fermata ? 38 : 26);
            if (q.src.label) ctx.fillText(q.src.label, nx - 2, y);
            if (q.src.mark) ctx.fillText(q.src.mark, nx + 2, y + 12);
            ctx.restore();
          }
        });
      }
    }
    if (p.under?.length && staves0.length) {
      const underY = staves0[used[used.length - 1]].getYForLine(4) + 42;
      ctx.save();
      ctx.setFont("Inter, system-ui, sans-serif", 10);
      for (const u of p.under) {
        const x = onsetX.get(Math.round(u.at * 64));
        if (x === undefined) continue;
        ctx.setFillStyle(u.ink ?? "var(--ink)");
        u.lines.forEach((line, i) => line && ctx.fillText(line, x, underY + i * 12));
      }
      ctx.restore();
    }
    for (const [a, c] of ties) new StaveTie({ first_note: a, last_note: c, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
    // The selection is drawn after the notes: redraw nothing; it sits under them as a translucent band.
    geo.current = { staves: staves0.map((s, i) => (used.includes(i) ? { top: s.getYForLine(0), bottom: s.getYForLine(4), spacing: s.getSpacingBetweenLines() } : { top: -1e6, bottom: -1e6, spacing: 10 })) };
    host.dataset.geometry = JSON.stringify(geo.current);
    host.dataset.clefs = JSON.stringify(plan);
  }, [p.voices, p.keySig, p.signature, p.time, p.barQuarters, p.selected, p.cursor, p.label, p.bars, p.widths, p.lefts, p.natural, p.scale, p.under, p.clefs, p.autoClefs, p.clefPlan]);

  const press = useRef<{ x: number; y: number } | null>(null);
  const locate = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geo.current;
    const svg = e.currentTarget.querySelector("svg");
    if (!g || !svg || !hits.current.length) return null;
    const r = svg.getBoundingClientRect();
    const k = p.scale * (r.width / (svg.width.baseVal.value || r.width));
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    // The staff tapped first (two editable voices, one on each staff: the chorales' alto and tenor, C17), then the nearest slot on it.
    const near = (i: number) => {
      const st = g.staves[i];
      return st ? Math.abs((st.top + st.bottom) / 2 - y) : Infinity;
    };
    const tapped = g.staves.map((_, i) => i).reduce((a, i) => (near(i) < near(a) ? i : a), 0);
    const pool = hits.current.some((h) => h.staff === tapped) ? hits.current.filter((h) => h.staff === tapped) : hits.current;
    const best = pool.reduce((a, h) => (Math.abs(h.x + 5 - x) < Math.abs(a.x + 5 - x) ? h : a));
    if (Math.abs(best.x + 5 - x) > 40) return null;
    const s = g.staves[best.staff];
    const onStaff = y >= s.top - 5 * s.spacing && y <= s.bottom + 5 * s.spacing;
    if (!onStaff) return { slot: best.slot, pitch: null };
    const position = Math.round((s.bottom - y) / (s.spacing / 2));
    const natural = pitchAtPosition(best.clef, position);
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
