/**
 * The whole piece as a page of music (D147), the owner: "something like a hybrid of Gerubach and
 * MuseScore". The engraving (src/wtc/engrave.ts) laid out in systems that fill the width, every
 * bar of the piece, drawn once by VexFlow; what changes while the music plays is drawn over it
 * without drawing the music again:
 *
 *   - the notes being played: struck (a key pressed: the head swells and glows in its voice's
 *     colour) and still sounding (a softer glow until the note ends);
 *   - a cursor that moves through the bar with the music, and the page following it;
 *   - the chosen passage shaded; a click plays from the beat clicked, a drag across bars chooses
 *     a passage (to play, or to loop).
 *
 * Drawing order matters for VexFlow: tuplets and beams are made before the notes are formatted
 * and drawn (so flags give way to beams and stems are lengthened to meet them), and a dotted
 * value carries its dots in its duration (so it takes its full time in the bar).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Accidental, Beam, Dot, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, StaveTie, Tuplet, Voice, type RenderContext, type StemmableNote } from "vexflow";
import { parsePitch, type Step } from "../../music/pitch.ts";
import type { EngBar, EngItem, EngLayer, Engraving } from "../../wtc/engrave.ts";
import { onFrames, playhead } from "../playhead.ts";

const EPS = 1e-6;
const CLEFS = ["treble", "bass"] as const;
const VEX_ACC = (alter: number) => (alter === 1 ? "#" : alter === -1 ? "b" : alter === 2 ? "##" : alter === -2 ? "bb" : "n");

export type Ink = "voices" | "entries" | "plain";

export interface SheetProps {
  eng: Engraving;
  /** Changes when the piece changes (resets the scroll). */
  pieceId: string;
  keySig: string;
  signature: Record<Step, number>;
  time: string;
  barQuarters: number;
  /** Bar number of the first bar (0 for a pickup). */
  firstBar: number;
  /** Each note's onset, end and voice (for the highlights). */
  notes: { at: number; dur: number }[];
  voice: number[];
  colors: string[];
  ink: Ink;
  /** Notes of the subject's entries (coloured in the "entries" ink). */
  entryNotes: Set<number>;
  /** A label above a note (the start of an entry). */
  labels: Map<number, string>;
  /** The harmonic reading under the bass staff. */
  chords?: { from: number; text: string; title: string }[];
  /** Voices drawn faint (muted, or another soloed). */
  faint: Set<number>;
  /** Voices drawn a little paler (another in the spotlight). */
  dim?: Set<number>;
  /** Words over the music at a moment (the keys the cadences reach). */
  marks?: { at: number; text: string; title?: string }[];
  /** The reader's notes, by bar (a mark over the bar; a click opens it). */
  notes2?: Map<number, string>;
  onNote?(bar: number): void;
  /** The subject's entries, bracketed over (or under) their staff. */
  brackets?: { from: number; to: number; voice: number; inverted: boolean }[];
  /** The passage chosen, in quarters. */
  span: { from: number; to: number } | null;
  /** Where playback will start (a marker when stopped). */
  marker: number | null;
  zoom: number;
  follow: boolean;
  label: string;
  /** What a note is, for the info line when it is pointed at. */
  describe?(i: number): string;
  onSeek(q: number): void;
  onSelect(from: number, to: number): void;
}

interface BarGeo {
  bar: number;
  x0: number;
  x1: number;
  /** Onsets and their x, in time order (the bar's start and end included). */
  ticks: [number, number][];
}
interface SysGeo {
  top: number;
  height: number;
  trebleTop: number;
  bassBottom: number;
  /** The first and last bar of the system. */
  first: number;
  last: number;
  bars: BarGeo[];
}
interface Geometry {
  systems: SysGeo[];
  /** Each note's heads, for the highlights. */
  heads: Map<number, SVGElement[]>;
  scale: number;
}

/** Staff space in units; the staves' line positions in diatonic steps. */
const SP = 10;
const TOP_LINE = [38, 26];
const BOTTOM_LINE = [30, 18];

/** The x of a quarter position in a bar, between the onsets around it. */
function xAt(g: BarGeo, q: number): number {
  const t = g.ticks;
  if (q <= t[0][0]) return t[0][1];
  for (let k = 1; k < t.length; k++) if (q <= t[k][0] + EPS) return t[k - 1][1] + ((q - t[k - 1][0]) / Math.max(EPS, t[k][0] - t[k - 1][0])) * (t[k][1] - t[k - 1][1]);
  return t[t.length - 1][1];
}

interface Built {
  voices: [Voice[], Voice[]];
  drawn: { item: EngItem; layer: EngLayer; staff: number; note: StemmableNote }[];
  beams: Beam[];
  tuplets: Tuplet[];
}

const STEP_NAMES = ["c", "d", "e", "f", "g", "a", "b"];
const keyOfDiatonic = (d: number) => `${STEP_NAMES[((d % 7) + 7) % 7]}/${Math.floor(d / 7)}`;
/**
 * Where a rest sits: in the middle of a staff with one layer; in a staff shared by several, out of
 * the other layers' way (up for the stems-up layer, down for the stems-down) and near its own notes.
 */
function restKey(staff: number, stem: number, layer: EngLayer, k: number): string {
  const base = staff === 0 ? (stem === 1 ? 36 : stem === -1 ? 30 : 34) : stem === 1 ? 24 : stem === -1 ? 18 : 22;
  if (stem === 0) return keyOfDiatonic(base);
  // The nearest note of the layer.
  let near: EngItem | null = null;
  for (let d = 1; d < layer.items.length && !near; d++) for (const j of [k - d, k + d]) if (!near && layer.items[j] && !layer.items[j].rest) near = layer.items[j];
  if (!near) return keyOfDiatonic(base);
  const ds = near.keys.map((x) => parsePitch(x.pitch).diatonic);
  return keyOfDiatonic(stem === 1 ? Math.max(base, Math.max(...ds) + 1) : Math.min(base, Math.min(...ds) - 1));
}

/** One bar's VexFlow notes, tuplets and beams (not yet formatted or drawn). */
function buildBar(bar: EngBar, inkOf: (layer: EngLayer, key: number | null) => string, signature: Record<Step, number>): Built {
  const out: Built = { voices: [[], []], drawn: [], beams: [], tuplets: [] };
  const [num, den] = bar.time.split("/").map(Number);
  // Accidentals: by staff, in time order across the layers; a tied continuation shows none.
  const acc = new Map<EngItem, (string | null)[]>();
  bar.staves.forEach((layers) => {
    const state = new Map<string, number>();
    const items = layers.flatMap((l) => l.items).filter((it) => !it.rest).sort((a, b) => a.at - b.at);
    for (const it of items) {
      acc.set(
        it,
        it.keys.map((k) => {
          const p = parsePitch(k.pitch);
          const id = `${p.step}${p.octave}`;
          const cur = state.get(id) ?? signature[p.step];
          // A note tied over the bar line carries its accidental through the tie only.
          if (it.tieIn) return null;
          state.set(id, p.alter);
          return cur !== p.alter ? VEX_ACC(p.alter) : null;
        }),
      );
    }
  });
  bar.staves.forEach((layers, staff) => {
    const clef = CLEFS[staff];
    for (const layer of layers) {
      const notes: StemmableNote[] = [];
      for (const [k, it] of layer.items.entries()) {
        const duration = it.dur;
        let n: StemmableNote;
        if (it.rest && it.ghost && it.tuplet === undefined) n = new GhostNote({ duration, dots: it.dots });
        else if (it.rest && it.ghost) {
          // In a triplet, an invisible rest (a tuplet needs stems to place itself).
          const sn = new StaveNote({ keys: [restKey(staff, 0, layer, k)], duration: `${duration}r`, dots: it.dots, clef });
          sn.setStyle({ fillStyle: "transparent", strokeStyle: "transparent" });
          n = sn;
        }
        else if (it.rest) {
          const sn = new StaveNote({ keys: [restKey(staff, layers.length > 1 ? layer.stem : 0, layer, k)], duration: `${duration}r`, dots: it.dots, clef });
          if (it.dots) Dot.buildAndAttach([sn], { all: true });
          const ink = inkOf(layer, null);
          sn.setStyle({ fillStyle: ink, strokeStyle: ink });
          n = sn;
        } else {
          const keys = it.keys.map((k) => {
            const p = parsePitch(k.pitch);
            return `${p.step.toLowerCase()}/${p.octave}`;
          });
          const sn = new StaveNote({ keys, duration, dots: it.dots, clef, ...(layer.stem ? { stem_direction: layer.stem } : { auto_stem: true }) });
          if (it.dots) Dot.buildAndAttach([sn], { all: true });
          (acc.get(it) ?? []).forEach((a, k) => a && sn.addModifier(new Accidental(a), k));
          const ink = inkOf(layer, null);
          sn.setStyle({ fillStyle: ink, strokeStyle: ink });
          it.keys.forEach((k, idx) => {
            const c = inkOf(layer, k.i);
            if (c !== ink) sn.setKeyStyle(idx, { fillStyle: c, strokeStyle: c });
          });
          n = sn;
        }
        notes.push(n);
        out.drawn.push({ item: it, layer, staff, note: n });
      }
      // Tuplets before the voice takes the notes (they change the notes' ticks).
      const groups = new Map<number, StemmableNote[]>();
      layer.items.forEach((it, k) => it.tuplet !== undefined && groups.set(it.tuplet, [...(groups.get(it.tuplet) ?? []), notes[k]]));
      for (const [id, g] of groups) {
        const tp = new Tuplet(g, { num_notes: 3, notes_occupied: 2, bracketed: !g.every((n) => ["8", "16", "32"].includes(n.getDuration())) });
        // A triplet of invisible rests keeps its time but shows no 3.
        if (!layer.items.every((it) => it.tuplet !== id || it.ghost)) out.tuplets.push(tp);
      }
      const v = new Voice({ num_beats: num, beat_value: den }).setMode(Voice.Mode.SOFT);
      v.addTickables(notes);
      out.voices[staff].push(v);
      // Beams before formatting (stems meet the beam, flags give way).
      const beams = new Map<number, StemmableNote[]>();
      layer.items.forEach((it, k) => it.beam !== undefined && beams.set(it.beam, [...(beams.get(it.beam) ?? []), notes[k]]));
      for (const g of beams.values()) {
        const b = new Beam(g, layer.stem === 0);
        const ink = inkOf(layer, null);
        b.setStyle({ fillStyle: ink, strokeStyle: ink });
        out.beams.push(b);
      }
      // Triplets of quavers beam together.
      for (const g of groups.values()) if (g.length > 1 && g.every((n) => ["8", "16", "32"].includes(n.getDuration())) && !g.some((n) => n instanceof GhostNote || (n as StaveNote).isRest())) {
        const b = new Beam(g, layer.stem === 0);
        out.beams.push(b);
      }
    }
  });
  return out;
}

/** The width a bar needs (its notes at their closest), in units. */
function minWidth(bar: EngBar, signature: Record<Step, number>): number {
  try {
    const b = buildBar(bar, () => "#000", signature);
    const all = [...b.voices[0], ...b.voices[1]];
    if (!all.length) return 60;
    const fmt = new Formatter();
    for (const vs of b.voices) if (vs.length) fmt.joinVoices(vs);
    return fmt.preCalculateMinTotalWidth(all);
  } catch {
    return 40 + bar.staves.flat().reduce((a, l) => Math.max(a, l.items.length), 0) * 24;
  }
}

/** The width of a system's opening (clef, key signature, and the time signature on the first). */
function headerWidth(keySig: string, time: string | null): number {
  const s = new Stave(0, 0, 400);
  s.addClef("treble").addKeySignature(keySig);
  if (time) s.addTimeSignature(time);
  return s.getNoteStartX() + 6;
}

export function WtcSheet(p: SheetProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const geoRef = useRef<Geometry | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current!;
    // The page is laid out again when its width settles (not at every step of a window being resized).
    let timer = 0;
    const measure = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setWidth(el.clientWidth), 120);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    autoScroll.current = performance.now();
    scroller.current?.scrollTo({ top: 0 });
  }, [p.pieceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bar widths depend only on the music: measured once a piece (a change of metre needs room for its signature).
  const mins = useMemo(() => p.eng.bars.map((b, k) => minWidth(b, p.signature) + (k > 0 && b.time !== p.eng.bars[k - 1].time ? 26 : 0)), [p.eng, p.signature]);

  // Draw (only when the music, the width or the look changes).
  useLayoutEffect(() => {
    const host = page.current;
    if (!host || width < 50) return;
    const t0 = performance.now();
    host.innerHTML = "";
    // On a narrow screen the music is engraved smaller (a phone shows two bars a line, not one).
    const scale = p.zoom * (width < 760 ? Math.max(0.55, width / 760) : 1);
    const W = Math.max(320, (width - 6) / scale);
    const MARGIN = 8;
    const head0 = headerWidth(p.keySig, p.eng.bars[0]?.time ?? p.time);
    const headN = headerWidth(p.keySig, null);
    // Systems: bars at their natural width (a little more than their least) while they fit.
    const natural = mins.map((m) => Math.max(64, m * 1.12 + 24));
    const systems: { bars: number[]; ws: number[]; head: number }[] = [];
    let cur: number[] = [];
    let used = 0;
    let head = head0;
    natural.forEach((w, b) => {
      if (cur.length && used + w > W - MARGIN * 2 - head) {
        systems.push({ bars: cur, ws: [], head });
        cur = [];
        used = 0;
        head = headN;
      }
      cur.push(b);
      used += w;
    });
    if (cur.length) systems.push({ bars: cur, ws: [], head });
    for (const [k, s] of systems.entries()) {
      const nat = s.bars.reduce((a, b) => a + natural[b], 0);
      const room = W - MARGIN * 2 - s.head;
      // The last system is stretched only when it is nearly full.
      const f = k === systems.length - 1 && nat < room * 0.7 ? 1 : room / nat;
      s.ws = s.bars.map((b) => natural[b] * f);
    }

    const inkOf = (layer: EngLayer, key: number | null): string => {
      const c = p.colors[layer.voice % p.colors.length];
      if (p.ink === "voices") return c;
      if (p.ink === "entries") return key !== null && p.entryNotes.has(key) ? c : "var(--sheet-ink, #222)";
      return "var(--sheet-ink, #222)";
    };

    const heads = new Map<number, SVGElement[]>();
    const sysGeo: SysGeo[] = [];
    const lastTie = new Map<number, { note: StemmableNote; k: number; ctx: RenderContext }>();
    let top = 0;
    systems.forEach((s, si) => {
      // Vertical room: from the highest and lowest notes on each staff, and the stems that reach out.
      const STEM = 3.5 * SP;
      const up = [0, 0];
      const down = [0, 0];
      for (const b of s.bars)
        p.eng.bars[b].staves.forEach((layers, st) =>
          layers.forEach((l) =>
            l.items.forEach((it) => {
              if (!it.keys.length) return;
              const ds = it.keys.map((k) => parsePitch(k.pitch).diatonic);
              const hi = Math.max(...ds);
              const lo = Math.min(...ds);
              const middle = (TOP_LINE[st] + BOTTOM_LINE[st]) / 2;
              const stemUp = l.stem === 1 || (l.stem === 0 && (hi + lo) / 2 < middle);
              up[st] = Math.max(up[st], (hi - TOP_LINE[st]) * (SP / 2) + (stemUp ? STEM : 6));
              down[st] = Math.max(down[st], (BOTTOM_LINE[st] - lo) * (SP / 2) + (stemUp ? 6 : STEM));
            }),
          ),
        );
      const above = Math.max(30, up[0] + 16);
      const gap = Math.min(230, Math.max(76, down[0] + up[1] + 18));
      const below = Math.max(24, down[1] + 16) + (p.chords?.length ? 18 : 0);
      const trebleY = above;
      const bassY = trebleY + 4 * SP + gap;
      const height = bassY + 4 * SP + below;
      const div = document.createElement("div");
      div.className = "sheet-sys";
      div.dataset.sys = String(si);
      host.appendChild(div);
      const renderer = new Renderer(div, Renderer.Backends.SVG);
      renderer.resize(Math.ceil(W * scale), Math.ceil(height * scale));
      const ctx = renderer.getContext();
      ctx.scale(scale, scale);
      const svg = div.querySelector("svg")!;
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `${p.label}, ${s.bars[0] + p.firstBar}–${s.bars[s.bars.length - 1] + p.firstBar}`);
      const bars: BarGeo[] = [];
      let x = MARGIN;
      s.bars.forEach((b, k) => {
        const first = k === 0;
        const w = s.ws[k] + (first ? s.head : 0);
        const staves = CLEFS.map((clef, st) => {
          const sv = new Stave(x, st === 0 ? trebleY : bassY, w, { space_above_staff_ln: 0, space_below_staff_ln: 0 });
          if (first) sv.addClef(clef).addKeySignature(p.keySig);
          const bar = p.eng.bars[b];
          if (b === 0 || bar.time !== p.eng.bars[b - 1].time) sv.addTimeSignature(bar.time);
          if (b === p.eng.bars.length - 1) sv.setEndBarType(3);
          sv.setContext(ctx).draw();
          return sv;
        });
        if (first) {
          new StaveConnector(staves[0], staves[1]).setType("brace").setContext(ctx).draw();
          new StaveConnector(staves[0], staves[1]).setType("singleLeft").setContext(ctx).draw();
        }
        new StaveConnector(staves[0], staves[1]).setType(b === p.eng.bars.length - 1 ? "boldDoubleRight" : "singleRight").setContext(ctx).draw();
        // The bar number, small, over each bar.
        ctx.save();
        ctx.setFont("Inter, system-ui, sans-serif", first ? 11 : 9);
        ctx.setFillStyle("var(--bar-number, #9a948a)");
        // At the top of the system, clear of the highest note.
        ctx.fillText(String(b + p.firstBar), first ? x + 2 : x + 3, 11);
        ctx.restore();

        const startX = staves[0].getNoteStartX();
        const endX = staves[0].getNoteEndX();
        const ticks: [number, number][] = [[p.eng.bars[b].from, startX - 4]];
        // A bar that cannot be drawn is left empty rather than losing the page.
        try {
          const built = buildBar(p.eng.bars[b], inkOf, p.signature);
          const all = [...built.voices[0], ...built.voices[1]];
          if (all.length) {
            const fmt = new Formatter();
            for (const vs of built.voices) if (vs.length) fmt.joinVoices(vs);
            fmt.format(all, Math.max(20, endX - startX - 12));
            built.voices.forEach((vs, st) => vs.forEach((v) => v.draw(ctx, staves[st])));
            for (const bm of built.beams) bm.setContext(ctx).draw();
            for (const tp of built.tuplets) tp.setContext(ctx).draw();
            // Geometry, heads, voices' classes, ties.
            const seen = new Map<number, number>();
            for (const d of built.drawn) {
              const nx = d.note.getAbsoluteX();
              if (!d.item.ghost && (!seen.has(Math.round(d.item.at * 96)) || seen.get(Math.round(d.item.at * 96))! > nx)) seen.set(Math.round(d.item.at * 96), nx);
              const g = svg.querySelector(`#vf-${d.note.getAttribute("id")}`);
              g?.classList.add(`v${d.layer.voice}`);
              if (d.item.rest) continue;
              const sn = d.note as StaveNote;
              d.item.keys.forEach((key, idx) => {
                const h = sn.noteHeads[idx];
                const el = h && svg.querySelector<SVGElement>(`#vf-${h.getAttribute("id")}`);
                if (!el) return;
                el.style.setProperty("--hl", p.colors[d.layer.voice % p.colors.length]);
                if (p.describe) el.setAttribute("data-info", p.describe(key.i));
                heads.set(key.i, [...(heads.get(key.i) ?? []), el]);
              });
              // Ties: from the last piece of the same note.
              if (d.item.tieIn) {
                const pairs = new Map<StemmableNote, { from: number[]; to: number[]; ctx: RenderContext }>();
                d.item.keys.forEach((key, idx) => {
                  const prev = lastTie.get(key.i);
                  if (!prev) return;
                  const e = pairs.get(prev.note) ?? { from: [], to: [], ctx: prev.ctx };
                  e.from.push(prev.k);
                  e.to.push(idx);
                  pairs.set(prev.note, e);
                });
                for (const [prevNote, e] of pairs) {
                  if (e.ctx === ctx) new StaveTie({ first_note: prevNote, last_note: sn, first_indices: e.from, last_indices: e.to }).setContext(ctx).draw();
                  else {
                    new StaveTie({ first_note: prevNote, last_note: null as unknown as StaveNote, first_indices: e.from, last_indices: e.from }).setContext(e.ctx).draw();
                    new StaveTie({ first_note: null as unknown as StaveNote, last_note: sn, first_indices: e.to, last_indices: e.to }).setContext(ctx).draw();
                  }
                }
              }
              d.item.keys.forEach((key, idx) => (d.item.tieOut ? lastTie.set(key.i, { note: sn, k: idx, ctx }) : lastTie.delete(key.i)));
            }
            for (const [q, nx] of [...seen.entries()].sort((a, c) => a[0] - c[0])) ticks.push([q / 96, nx]);
            // Labels (the entries) above their notes.
            for (const d of built.drawn) {
              if (d.item.rest || d.item.tieIn) continue;
              const lab = d.item.keys.map((k) => p.labels.get(k.i)).find(Boolean);
              if (!lab) continue;
              const sn = d.note as StaveNote;
              let yTop = Math.min(...sn.getYs()) - 12;
              if (sn.hasStem()) {
                const ext = sn.getStemExtents();
                yTop = Math.min(ext.topY, ext.baseY, ...sn.getYs()) - 7;
              }
              ctx.save();
              ctx.setFont("Inter, system-ui, sans-serif", 10, "bold");
              ctx.setFillStyle(p.colors[d.layer.voice % p.colors.length]);
              ctx.fillText(lab, d.note.getAbsoluteX() - 3, Math.min(yTop, (d.staff === 0 ? trebleY : bassY) - 4));
              ctx.restore();
            }
          }
        } catch (err) {
          console.warn(`bar ${b + p.firstBar} not drawn`, err);
        }
        ticks.push([p.eng.bars[b].to, x + w - 6]);
        // The chords under the bass staff.
        if (p.chords?.length) {
          const g: BarGeo = { bar: b, x0: x, x1: x + w, ticks };
          ctx.save();
          ctx.setFont("Inter, system-ui, sans-serif", 10);
          ctx.setFillStyle("var(--sheet-harmony, #6b5a3a)");
          for (const c of p.chords) if (c.from >= p.eng.bars[b].from - EPS && c.from < p.eng.bars[b].to - EPS) ctx.fillText(c.text, xAt(g, c.from) - 2, bassY + 4 * SP + below - 8);
          ctx.restore();
        }
        bars.push({ bar: b, x0: first ? startX - 6 : x, x1: x + w, ticks });
        x += w;
      });
      sysGeo.push({ top, height, trebleTop: trebleY, bassBottom: bassY + 4 * SP, bars, first: s.bars[0], last: s.bars[s.bars.length - 1] });
      top += height;
    });
    // System tops in pixels, from the page.
    const divs = host.querySelectorAll<HTMLDivElement>(".sheet-sys");
    sysGeo.forEach((s, k) => (s.top = divs[k].offsetTop));
    const g = { systems: sysGeo, heads, scale };
    host.dataset.ms = String(Math.round(performance.now() - t0));
    geoRef.current = g;
    setGeo(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.eng, mins, width, p.zoom, p.ink, p.colors, p.labels, p.chords, p.keySig, p.time, p.signature, p.firstBar, p.entryNotes]);

  // Faint voices: by class, without drawing again.
  useEffect(() => {
    const host = page.current;
    if (!host) return;
    host.dataset.faint = [...p.faint].map((v) => `v${v}`).join(" ");
    host.dataset.dim = [...(p.dim ?? [])].map((v) => `v${v}`).join(" ");
  }, [p.faint, p.dim, geo]);

  // Where a quarter is: its system and x.
  const locate = (g: Geometry, q: number): { s: number; x: number } | null => {
    for (let s = 0; s < g.systems.length; s++) {
      const sys = g.systems[s];
      const last = sys.bars[sys.bars.length - 1];
      const lastTo = last.ticks[last.ticks.length - 1][0];
      if (q < lastTo - EPS || s === g.systems.length - 1) {
        const bg = sys.bars.find((b) => q < b.ticks[b.ticks.length - 1][0] - EPS) ?? last;
        return { s, x: xAt(bg, q) };
      }
    }
    return null;
  };

  // The highlights and the cursor, every frame while the music plays.
  const cursor = useRef<HTMLDivElement>(null);
  const followRef = useRef(p.follow);
  followRef.current = p.follow;
  const userScroll = useRef(0);
  /** When the page last scrolled itself (a scroll soon after is its own, not the reader's). */
  const autoScroll = useRef(0);
  useEffect(() => {
    const lit = new Map<number, string>();
    let lastSys = -1;
    const order = p.notes.map((_, i) => i).sort((a, b) => p.notes[a].at - p.notes[b].at);
    const maxDur = Math.max(...p.notes.map((n) => n.dur));
    return onFrames((pos) => {
      const g = geoRef.current;
      const cur = cursor.current;
      if (!g || !cur) return;
      const next = new Map<number, string>();
      if (pos !== null) {
        const strike = Math.max(0.05, playhead.rate * 0.16);
        // Notes sounding: those begun no earlier than the longest note before now.
        let lo = 0;
        let hi = order.length;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (p.notes[order[m]].at < pos - maxDur - EPS) lo = m + 1;
          else hi = m;
        }
        for (let k = lo; k < order.length; k++) {
          const i = order[k];
          const n = p.notes[i];
          if (n.at > pos + EPS) break;
          if (pos < n.at + n.dur - EPS) next.set(i, pos - n.at < strike ? "hl-hit" : "hl-on");
        }
      }
      for (const [i, c] of lit) if (next.get(i) !== c) g.heads.get(i)?.forEach((el) => el.classList.remove(c));
      for (const [i, c] of next) if (lit.get(i) !== c) g.heads.get(i)?.forEach((el) => el.classList.add(c));
      lit.clear();
      for (const [i, c] of next) lit.set(i, c);
      // The cursor.
      const at = pos === null ? null : locate(g, pos);
      if (!at) {
        cur.style.display = "none";
        lastSys = -1;
        return;
      }
      const sys = g.systems[at.s];
      cur.style.display = "block";
      cur.style.transform = `translate(${at.x * g.scale}px, ${sys.top + (sys.trebleTop - 14) * g.scale}px)`;
      cur.style.height = `${(sys.bassBottom - sys.trebleTop + 28) * g.scale}px`;
      // Following: a new system brings the page along (unless the reader has just scrolled).
      if (at.s !== lastSys) {
        lastSys = at.s;
        const sc = scroller.current;
        if (sc && followRef.current && performance.now() - userScroll.current > 2500) {
          const want = sys.top - Math.min(40, sc.clientHeight * 0.08);
          const bottom = sys.top + sys.height * g.scale;
          const nextSys = g.systems[at.s + 1];
          const needed = nextSys ? nextSys.top + nextSys.height * g.scale : bottom;
          if (sys.top < sc.scrollTop || needed > sc.scrollTop + sc.clientHeight) {
            autoScroll.current = performance.now();
            sc.scrollTo({ top: want, behavior: "smooth" });
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.notes]);

  // Pointer: a click plays from the onset clicked, a drag across bars chooses a passage.
  const drag = useRef<{ q: number; x: number; y: number; moved: boolean } | null>(null);
  const [dragSpan, setDragSpan] = useState<{ from: number; to: number } | null>(null);
  const hit = (e: React.PointerEvent): { q: number; barFrom: number; barTo: number } | null => {
    const g = geoRef.current;
    const host = page.current;
    if (!g || !host) return null;
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / g.scale;
    const y = e.clientY - r.top;
    const s = g.systems.find((sy) => y >= sy.top && y < sy.top + sy.height * g.scale) ?? null;
    if (!s) return null;
    const b = s.bars.find((bg) => x >= bg.x0 && x < bg.x1) ?? (x < s.bars[0].x0 ? s.bars[0] : s.bars[s.bars.length - 1]);
    // The onset nearest the pointer (the bar's start before the first).
    let best = b.ticks[0];
    for (const t of b.ticks.slice(0, -1)) if (Math.abs(t[1] - x) < Math.abs(best[1] - x)) best = t;
    return { q: best[0], barFrom: b.ticks[0][0], barTo: b.ticks[b.ticks.length - 1][0] };
  };

  // Overlays: the chosen passage, the marker, a drag in progress.
  const shades = (span: { from: number; to: number } | null, cls: string) => {
    if (!geo || !span) return null;
    const out: JSX.Element[] = [];
    geo.systems.forEach((s, k) => {
      const a = s.bars[0].ticks[0][0];
      const last = s.bars[s.bars.length - 1];
      const z = last.ticks[last.ticks.length - 1][0];
      if (span.to <= a + EPS || span.from >= z - EPS) return;
      const from = locate(geo, Math.max(span.from, a))!;
      const toQ = Math.min(span.to, z);
      const bg = s.bars.find((b) => toQ <= b.ticks[b.ticks.length - 1][0] + EPS) ?? last;
      const x1 = toQ >= bg.ticks[bg.ticks.length - 1][0] - EPS ? bg.x1 : xAt(bg, toQ);
      out.push(<div key={`${cls}${k}`} className={cls} style={{ left: from.x * geo.scale, top: s.top + (s.trebleTop - 18) * geo.scale, width: Math.max(2, (x1 - from.x) * geo.scale), height: (s.bassBottom - s.trebleTop + 36) * geo.scale }} />);
    });
    return out;
  };
  const markerAt = geo && p.marker !== null ? locate(geo, p.marker) : null;
  // A marker or a passage chosen while nothing plays (a link, ← →, a moment) is brought into view.
  const into = (q: number | null) => {
    const sc = scroller.current;
    if (!geo || !sc || q === null || playhead.active) return;
    const at = locate(geo, q);
    if (!at) return;
    const sys = geo.systems[at.s];
    if (sys.top < sc.scrollTop || sys.top + sys.height * geo.scale > sc.scrollTop + sc.clientHeight) {
      autoScroll.current = performance.now();
      sc.scrollTo({ top: Math.max(0, sys.top - 8), behavior: "smooth" });
    }
  };
  useEffect(() => into(p.marker), [p.marker, geo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => into(p.span?.from ?? null), [p.span?.from, geo]); // eslint-disable-line react-hooks/exhaustive-deps
  // The entries, each a light band of its voice's colour behind its staff; broken where a system ends.
  const brackets = useMemo(() => {
    if (!geo || !p.brackets?.length) return null;
    const out: JSX.Element[] = [];
    p.brackets.forEach((e, k) => {
      geo.systems.forEach((s, si) => {
        const a = s.bars[0].ticks[0][0];
        const last = s.bars[s.bars.length - 1];
        const z = last.ticks[last.ticks.length - 1][0];
        if (e.to <= a + EPS || e.from >= z - EPS) return;
        const x0 = locate(geo, Math.max(e.from, a))!.x;
        const toQ = Math.min(e.to, z);
        const bg = s.bars.find((b) => toQ <= b.ticks[b.ticks.length - 1][0] + EPS) ?? last;
        const x1 = toQ >= bg.ticks[bg.ticks.length - 1][0] - EPS ? bg.x1 - 4 : xAt(bg, toQ);
        const bar = s.bars.find((b) => Math.max(e.from, a) < b.ticks[b.ticks.length - 1][0] - EPS)?.bar ?? s.first;
        const staff = p.eng.staffOf[e.voice]?.[bar] ?? 0;
        // A band behind the entry, over the staff it is on.
        const yTop = staff === 0 ? s.trebleTop : s.bassBottom - 4 * SP;
        const y = yTop - 12;
        out.push(
          <div
            key={`b${k}-${si}`}
            className={e.inverted ? "sheet-bracket inv" : "sheet-bracket"}
            style={{ left: (x0 - 6) * geo.scale, top: s.top + y * geo.scale, width: Math.max(4, (x1 - x0 + 8) * geo.scale), height: (4 * SP + 24) * geo.scale, ["--bc" as string]: p.colors[e.voice % p.colors.length] }}
          />,
        );
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, p.brackets, p.colors, p.eng]);

  return (
    <div
      className="wtc-sheet"
      ref={scroller}
      onWheel={() => (userScroll.current = performance.now())}
      onTouchMove={() => (userScroll.current = performance.now())}
      onScroll={() => {
        if (performance.now() - autoScroll.current > 1000) userScroll.current = performance.now();
      }}
    >
      <div
        className="sheet-page"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const h = hit(e);
          if (!h) return;
          drag.current = { q: h.barFrom, x: e.clientX, y: e.clientY, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) return;
          d.moved = true;
          const h = hit(e);
          if (!h) return;
          setDragSpan(h.barFrom >= d.q ? { from: d.q, to: h.barTo } : { from: h.barFrom, to: d.q + p.barQuarters });
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.moved) {
            if (dragSpan) p.onSelect(dragSpan.from, dragSpan.to);
            setDragSpan(null);
            return;
          }
          const h = hit(e);
          if (!h) return;
          // Shift: the passage from the marker (or the passage's start) to the bar clicked.
          const anchor = p.span?.from ?? p.marker;
          if (e.shiftKey && anchor !== null && geoRef.current) {
            const bars = geoRef.current.systems.flatMap((sy) => sy.bars);
            const ab = bars.find((bg) => anchor < bg.ticks[bg.ticks.length - 1][0] - EPS) ?? bars[bars.length - 1];
            const aFrom = ab.ticks[0][0];
            const aTo = p.span?.to ?? ab.ticks[ab.ticks.length - 1][0];
            p.onSelect(Math.min(aFrom, h.barFrom), Math.max(aTo, h.barTo));
            return;
          }
          p.onSeek(h.q);
        }}
        onDoubleClick={(e) => {
          const h = hit(e as unknown as React.PointerEvent);
          if (h) p.onSelect(h.barFrom, h.barTo);
        }}
        onPointerCancel={() => ((drag.current = null), setDragSpan(null))}
      >
        <div ref={page} className="sheet-music" />
        <div className="sheet-over" aria-hidden="true">
          {brackets}
          {geo &&
            p.marks?.map((m, k) => {
              const at = locate(geo, m.at);
              if (!at) return null;
              const sys = geo.systems[at.s];
              // Beside the bar number when it falls at the start of a bar.
              const bar = sys.bars.find((b) => m.at < b.ticks[b.ticks.length - 1][0] - EPS);
              const x = bar && at.x - bar.x0 < 26 ? bar.x0 + 26 : at.x - 2;
              return (
                <span key={`m${k}`} className="sheet-mark" style={{ left: x * geo.scale, top: sys.top }} data-info={m.title ?? m.text}>
                  {m.text}
                </span>
              );
            })}
          {geo &&
            p.notes2 &&
            [...p.notes2.entries()].map(([b, text]) => {
              const s = geo.systems.find((sy) => b >= sy.first && b <= sy.last);
              const bg = s?.bars.find((x) => x.bar === b);
              if (!s || !bg) return null;
              return (
                <button
                  key={`n${b}`}
                  className="sheet-note"
                  style={{ left: (bg.x0 + 14) * geo.scale, top: s.top + Math.max(0, s.trebleTop - 30) * geo.scale }}
                  data-info={text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => p.onNote?.(b)}
                >
                  ✎
                </button>
              );
            })}
          {shades(p.span, "sheet-span")}
          {shades(dragSpan, "sheet-drag")}
          {markerAt && geo && <div className="sheet-marker" style={{ left: markerAt.x * geo.scale, top: geo.systems[markerAt.s].top + (geo.systems[markerAt.s].trebleTop - 18) * geo.scale, height: (geo.systems[markerAt.s].bassBottom - geo.systems[markerAt.s].trebleTop + 36) * geo.scale }} />}
          <div ref={cursor} className="sheet-cursor" style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}
