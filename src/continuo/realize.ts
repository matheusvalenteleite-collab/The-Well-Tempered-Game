/**
 * realizeContinuo: frame and chord per bar (A1-A2), voicing by Viterbi (A3), colla parte where
 * needed (A4), second-species enrichment (A5), then timed events. Pure and deterministic.
 */
import { parsePitch } from "../music/pitch.ts";
import { COSTS, DEFAULTS } from "./costs.ts";
import { chooseChord, clashes, consistentTriads, contextForms, frameAt, frameConsonant, letterForms, mod, spellAt, toPc, type Chord, type Frame } from "./frame.ts";
import { enrichBar, passingFill, type BarPlan, type Segment } from "./enrichment.ts";
import { FIGURES, partimento, type Device } from "./partimento.ts";
import { sungNotes } from "./input.ts";
import { candidates, collaParte, parallels, placeByOctave, viterbi, type DownbeatContext, type Voicing, type Window } from "./voicing.ts";
import type { BarInfo, ContinuoEvent, ContinuoInput, ContinuoOptions, ContinuoRealization, SungNote } from "./types.ts";

export const DEFAULT_OPTIONS: ContinuoOptions = {
  finals: "organist",
  window: DEFAULTS.window,
  bassOctaves: "auto",
  passingFill: true,
  texture: "realized",
  partimento: true,
  accidentals: true,
};

/** Octaves below the sung bass that keep the continuo bass in DEFAULTS.bassRange, without needless shifting (ties: fewer). */
function autoShift(frames: (Frame | null)[]): number {
  const bass = frames.flatMap((f) => (f ? [f.bass.pitch.midi] : []));
  let best = 0;
  let bestCost = Infinity;
  for (let k = 0; k <= DEFAULTS.maxBassOctaves; k++) {
    const cost = bass.reduce((s, m) => s + Math.max(0, m - 12 * k - DEFAULTS.bassRange.high) + Math.max(0, DEFAULTS.bassRange.low - (m - 12 * k)) + DEFAULTS.bassOctavePenalty * k, 0);
    if (cost < bestCost) {
      best = k;
      bestCost = cost;
    }
  }
  return best;
}

/**
 * Downbeat frame of a bar; with nothing sounding on the downbeat, the first onset in the bar. A
 * dissonant downbeat that becomes consonant on the upbeat is a suspension (fourth species): the
 * bar is read, as a figured-bass player reads it, from its resolution ("7 6", "4 3", "2 3").
 */
function barFrame(notes: SungNote[], b: number, suspended?: Set<number>): Frame | null {
  const f = frameAt(notes, 2 * b);
  if (f && !frameConsonant(f)) {
    const r = frameAt(notes, 2 * b + 1);
    if (r && frameConsonant(r)) {
      suspended?.add(b);
      return { ...r, time: 2 * b };
    }
  }
  if (f) return f;
  const first = notes.find((n) => n.start > 2 * b && n.start < 2 * b + 2);
  return first ? frameAt(notes, first.start) : null;
}

export function realizeContinuo(exercise: ContinuoInput, options: Partial<ContinuoOptions> = {}): ContinuoRealization {
  const opts: ContinuoOptions = { ...DEFAULT_OPTIONS, ...options, window: { ...DEFAULT_OPTIONS.window, ...options.window } };
  const costs = { ...COSTS, ...opts.costs };
  const win: Window = { low: parsePitch(opts.window.low).midi, high: parsePitch(opts.window.high).midi };
  if (win.high - win.low < 12) throw new Error("the right-hand window must span at least an octave");
  const { notes, bars: n, modalFinal } = sungNotes(exercise);

  const suspended = new Set<number>();
  const frames = Array.from({ length: n }, (_, b) => barFrame(notes, b, suspended));
  const shift = opts.bassOctaves === "auto" ? autoShift(frames) : opts.bassOctaves;
  const lh = (f: Frame) => f.bass.pitch.midi - 12 * shift;
  if (opts.texture === "doubling") return realizeDoubling(notes, n, frames, shift, win, costs, modalFinal, opts);
  const ctxs: DownbeatContext[] = frames.map((f) => (f ? { bassMidi: lh(f), uppers: new Map(f.uppers.map((u) => [u.voice, u.pitch.midi])) } : { bassMidi: 0, uppers: new Map() }));

  const plans: BarPlan[] = frames.map((frame, b) => {
    const forms = contextForms(notes, b, modalFinal, opts.accidentals !== false);
    const nextBass = frames[b + 1]?.bass.pitch ?? null;
    const chord = frame ? chooseChord({ frame, nextBass, forms, ...(b === n - 1 ? { final: { mode: opts.finals, modalFinal } } : {}) }) : null;
    return { bar: b, frame, chord, voicing: null, fallback: !!chord && !chord.valid, forms, nextBass };
  });
  const highest = (f: Frame) => f.sounding[f.sounding.length - 1].pitch.midi;
  const layerFor = (p: BarPlan): Voicing[] => (p.frame && p.chord && !p.fallback ? candidates(p.chord, lh(p.frame), highest(p.frame), win, costs) : []);
  let layers = plans.map(layerFor);
  for (const p of plans) if (p.frame && p.chord && !p.fallback && layers[p.bar].length === 0) {
    p.fallback = true;
    p.chord.notes.push("no right-hand voicing fits the window");
  }

  // Pass 1, then the bars that cost too much go colla parte, then pass 2 with those fixed.
  const solve = () => {
    const first = viterbi(layers, ctxs, costs);
    // The register cost every candidate of a bar shares (e.g. low sung voices) is not a fault of the path.
    // The final chord is never replaced: it is the cadence.
    const excess = (b: number) => first.local[b] - Math.min(...layers[b].map((v) => v.barCost));
    for (const p of plans) if (!p.fallback && p.frame && p.frame.uppers.length > 0 && p.bar < n - 1 && excess(p.bar) > costs.fallbackThreshold) {
      p.fallback = true;
      p.chord?.notes.push(`best cost ${excess(p.bar).toFixed(1)} (above the bar's minimum) exceeds ${costs.fallbackThreshold}`);
    }
    let ref: number[] = [];
    const fixed = layers.map((layer, b) => {
      const p = plans[b];
      if (p.fallback && p.frame) {
        const v = collaParte(p.frame, lh(p.frame), ref, win, consistentTriads(p.frame, p.forms));
        ref = v.midi.length ? v.midi : ref;
        return [v];
      }
      ref = first.choice[b]?.midi ?? ref;
      return layer;
    });
    return viterbi(fixed, ctxs, costs);
  };
  let result = solve();

  // Strict finals: if the fifth makes consecutive fifths with the bass, take the major third.
  const last = plans[n - 1];
  if (opts.finals === "strict" && last?.frame && last.chord?.valid && !last.fallback && n > 1) {
    const prev = result.choice[n - 2];
    const cur = result.choice[n - 1];
    if (prev && cur && hasFifths(prev, cur, ctxs[n - 2], ctxs[n - 1])) {
      const fifth = last.chord;
      last.chord = chooseChord({ frame: last.frame, nextBass: null, forms: last.forms, final: { mode: "strict", modalFinal, majorThirdInsteadOfFifth: true } });
      const alt = layerFor(last);
      if (alt.length > 0) {
        layers[n - 1] = alt;
        result = solve();
      } else {
        last.chord = fifth;
        fifth.notes.push("strict final: consecutive fifths kept (no voicing with the major third fits)");
      }
    }
  }
  plans.forEach((p, b) => (p.voicing = result.choice[b]));

  // A5 and the right-hand timeline.
  const ectx = { notes, shift, win, costs };
  const timelines = plans.map((p) => enrichBar(p, ectx));
  let segments: Segment[][] = timelines.map((t) => t.segments);
  if (opts.passingFill)
    segments = segments.map((segs, b) =>
      b < n - 1 && !plans[b].fallback && !plans[b + 1].fallback ? passingFill(segs, segments[b + 1], b, plans[b], plans[b + 1].forms, ectx) : segs,
    );

  let devices: (Device | null)[] = plans.map(() => null);
  if (opts.partimento) {
    const pt = partimento(segments, plans, ectx, modalFinal);
    segments = pt.segments;
    devices = pt.devices;
    pt.notes.forEach((x, b) => timelines[b].notes.push(...x));
  }
  // Suspended bars: a right-hand note that would rub against the held dissonance (a second or a
  // seventh with any sung note on the downbeat) waits for the resolution on the upbeat.
  segments = segments.map((segs, b) => {
    if (!suspended.has(b)) return segs;
    const f = frameAt(notes, 2 * b);
    if (!f) return segs;
    return segs.flatMap((sg) => {
      if (sg.start > 2 * b || sg.end <= 2 * b + 1 || !f.sounding.some((x) => clashes(x.pitch.midi, sg.midi) && mod(x.pitch.midi, 12) !== mod(sg.midi, 12))) return [sg];
      return [{ ...sg, start: 2 * b + 1 }];
    });
  });
  const events: ContinuoEvent[] = [...bassEvents(notes, n, shift, plans, timelines), ...rhEvents(segments.flat())];
  events.sort((a, b) => a.startBeat - b.startBeat || order(a.role) - order(b.role) || a.midi[0] - b.midi[0]);

  const parallelsTotal = { withBass: 0, withSung: 0 };
  for (let b = 1; b < n; b++) {
    const a = plans[b - 1];
    const c = plans[b];
    if (!a.voicing || !c.voicing || a.fallback || c.fallback) continue;
    const par = parallels(a.voicing, c.voicing, ctxs[b - 1], ctxs[b]);
    parallelsTotal.withBass += par.withBass;
    parallelsTotal.withSung += par.withSung;
  }

  const bars: BarInfo[] = plans.map((p, b) => {
    const chord = p.chord;
    const info: BarInfo = {
      bar: b,
      figure: p.fallback ? "c.p." : timelines[b].upbeat?.figure ?? chord?.figure ?? "",
      chordPcs: chord ? chord.pcs : [],
      chord: chord ? chord.tones.map(pcLabel) : [],
      fallback: p.fallback,
      notes: [...(chord?.notes ?? []), ...timelines[b].notes],
      bass: p.frame ? spellLh(p.frame, shift) : "",
      rh: p.voicing?.pitches ?? [],
      cost: Math.round(result.local[b] * 100) / 100,
    };
    if (timelines[b].upbeat) info.upbeat = timelines[b].upbeat;
    if (suspended.has(b) && !p.fallback) {
      // The figure of a suspension: the sung intervals over the bass, on the downbeat then the upbeat.
      const down = doublingFigure(frameAt(notes, 2 * b));
      const up = doublingFigure(frameAt(notes, 2 * b + 1));
      info.figure = down && up && down !== up ? `${down} ${up}` : info.figure;
      info.suspension = true;
    }
    const d = devices[b];
    if (d) {
      info.device = d;
      info.figure = FIGURES[d];
    }
    return info;
  });

  return {
    events,
    bars,
    beatsPerBar: 2,
    totalBeats: 2 * n,
    bassOctaves: shift,
    modalFinal,
    options: opts,
    stats: { fallbackBars: plans.filter((p) => p.fallback).length, parallels: parallelsTotal },
  };
}

const order = (r: ContinuoEvent["role"]) => (r === "bass" ? 0 : r === "rh" ? 1 : 2);
const pcLabel = (t: { step: string; alter: number }) => t.step + (t.alter > 0 ? "#".repeat(t.alter) : "b".repeat(-t.alter));

function spellLh(f: Frame, shift: number): string {
  const p = f.bass.pitch;
  return `${p.step}${p.alter > 0 ? "#".repeat(p.alter) : "b".repeat(-p.alter)}${p.octave - shift}`;
}

function hasFifths(prev: Voicing, cur: Voicing, a: DownbeatContext, b: DownbeatContext): boolean {
  if (prev.midi.length !== cur.midi.length || a.bassMidi === b.bassMidi) return false;
  return cur.midi.some((c, i) => c !== prev.midi[i] && mod(prev.midi[i] - a.bassMidi, 12) === 7 && mod(c - b.bassMidi, 12) === 7);
}

/** The left hand: the lowest sung voice (octave-shifted), re-struck whenever it re-attacks or changes. */
function bassEvents(notes: SungNote[], n: number, shift: number, plans: BarPlan[], timelines: { upbeat?: BarInfo["upbeat"] }[]): ContinuoEvent[] {
  const out: ContinuoEvent[] = [];
  let prev: SungNote | null = null;
  const onsets = [...new Set([...Array.from({ length: n }, (_, b) => 2 * b), ...notes.map((x) => x.start)])].sort((a, b) => a - b);
  for (const t of onsets) {
    const f = frameAt(notes, t);
    if (!f) {
      prev = null;
      continue;
    }
    const bass = f.bass;
    if (bass === prev || (prev && bass.start < t && bass.pitch.midi === prev.pitch.midi)) continue;
    const bar = Math.floor(t / 2);
    const label = t === 2 * bar ? (plans[bar].fallback ? "c.p." : plans[bar].chord?.figure ?? "") : timelines[bar].upbeat?.kind === "refigured" ? timelines[bar].upbeat!.figure ?? "" : "";
    const p = bass.pitch;
    const name = `${p.step}${p.alter > 0 ? "#".repeat(p.alter) : "b".repeat(-p.alter)}${p.octave - shift}`;
    if (out.length) {
      const last = out[out.length - 1];
      last.durationBeats = Math.min(last.durationBeats, t - last.startBeat);
    }
    out.push({ startBeat: t, durationBeats: bass.end - t, midi: [p.midi - 12 * shift], pitches: [name], role: "bass", bar, label });
    prev = bass;
  }
  return out;
}

/** Group right-hand segments with the same onset, length, role and label into chord events. */
function rhEvents(segs: Segment[]): ContinuoEvent[] {
  const groups = new Map<string, ContinuoEvent>();
  for (const s of [...segs].sort((a, b) => a.start - b.start || a.midi - b.midi)) {
    const key = `${s.start}|${s.end}|${s.role}|${s.label}|${s.ornament ?? ""}`;
    const e = groups.get(key);
    if (e) {
      e.midi.push(s.midi);
      e.pitches.push(s.pitch);
    } else groups.set(key, { startBeat: s.start, durationBeats: s.end - s.start, midi: [s.midi], pitches: [s.pitch], role: s.role, bar: s.bar, label: s.label, ...(s.ornament ? { ornament: s.ornament } : {}) });
  }
  return [...groups.values()];
}

export type { Chord };

/** Figure of a doubling: the generic intervals of the sung upper voices over the bass, compounds reduced ("10" -> "3"). */
export function doublingFigure(f: Frame | null): string {
  if (!f) return "";
  const nums = new Set<number>();
  for (const u of f.uppers) {
    const k = u.pitch.diatonic - f.bass.pitch.diatonic + 1;
    nums.add(k > 8 ? ((k - 2) % 7) + 2 : k);
  }
  return [...nums].sort((a, b) => b - a).join("/");
}

/**
 * The "doubling" texture: no harmony is added. Left hand: the lowest sung voice, octave-shifted as
 * in a realization. Right hand: each upper sung voice by octaves in the window (placeByOctave),
 * following its every note through the bar (the colla parte follow of enrichBar). Only sung
 * pitch classes occur.
 */
function realizeDoubling(notes: SungNote[], n: number, frames: (Frame | null)[], shift: number, win: Window, costs: typeof COSTS, modalFinal: ContinuoRealization["modalFinal"], opts: ContinuoOptions): ContinuoRealization {
  const lh = (f: Frame) => f.bass.pitch.midi - 12 * shift;
  let ref: number[] = [];
  const plans: BarPlan[] = frames.map((frame, b) => {
    const forms = letterForms(notes, 2 * b, 2 * b + 2);
    let voicing: Voicing | null = null;
    if (frame) {
      const placed: { midi: number; pitch: string; voice: string }[] = [];
      for (const u of [...frame.uppers].reverse()) {
        const m = placeByOctave(u.pitch.midi, placed.length ? placed.map((x) => x.midi) : ref, lh(frame), win);
        if (m === null || placed.some((x) => x.midi === m)) continue;
        placed.push({ midi: m, pitch: spellAt(toPc(u.pitch), m), voice: u.voice });
      }
      placed.sort((a, c) => a.midi - c.midi);
      voicing = { midi: placed.map((x) => x.midi), pitches: placed.map((x) => x.pitch), roles: placed.map(() => "doubling" as const), doubles: placed.map((x) => x.voice), barCost: 0 };
      if (placed.length) ref = voicing.midi;
    }
    // enrichBar follows the doubled voices when the plan is marked colla parte.
    return { bar: b, frame, chord: null, voicing, fallback: true, forms, nextBass: frames[b + 1]?.bass.pitch ?? null };
  });
  const ectx = { notes, shift, win, costs, followEntries: true };
  const timelines = plans.map((p) => enrichBar(p, ectx));
  const figureAt = (t: number) => doublingFigure(frameAt(notes, t));
  const barFigure = (b: number) => {
    const down = figureAt(2 * b);
    const ups = [...new Set(notes.filter((x) => x.start > 2 * b && x.start < 2 * b + 2).map((x) => x.start))].sort((a, c) => a - c);
    const up = ups.length ? figureAt(ups[0]) : "";
    return up && up !== down ? `${down} · ${up}` : down;
  };
  const rh: ContinuoEvent[] = rhEvents(timelines.flatMap((t) => t.segments)).map((e) => ({ ...e, role: "doubling" as const, label: "doubling" }));
  const bass = bassEvents(notes, n, shift, plans, timelines.map(() => ({}))).map((e) => ({ ...e, label: figureAt(e.startBeat) }));
  const events = [...bass, ...rh].sort((a, b) => a.startBeat - b.startBeat || order(a.role) - order(b.role) || a.midi[0] - b.midi[0]);
  const bars: BarInfo[] = plans.map((p, b) => ({
    bar: b,
    figure: barFigure(b),
    chordPcs: [],
    chord: [],
    fallback: false,
    notes: ["doubling", ...timelines[b].notes],
    bass: p.frame ? spellLh(p.frame, shift) : "",
    rh: p.voicing?.pitches ?? [],
    cost: 0,
    texture: "doubling",
  }));
  return { events, bars, beatsPerBar: 2, totalBeats: 2 * n, bassOctaves: shift, modalFinal, options: opts, stats: { fallbackBars: 0, parallels: { withBass: 0, withSung: 0 } } };
}
