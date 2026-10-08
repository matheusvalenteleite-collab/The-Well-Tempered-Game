/**
 * A5: second-species enrichment. What the right hand does when a sung voice moves on the upbeat,
 * and the optional stepwise passing notes into the next downbeat.
 *
 *   upbeat note is a chord tone             -> hold (the harpsichord re-strikes lightly)
 *   upper voice moves to a consonant
 *   non-chord tone over the held bass       -> one right-hand voice moves by step (5 6 / 6 5)
 *   the bass moves to a consonance          -> re-figure with the A2 table, voice-lead minimally
 *   dissonant passing note                  -> hold (Heinichen's transitus)
 */
import { parsePitch, type Step } from "../music/pitch.ts";
import type { Costs } from "./costs.ts";
import { chooseChord, clashes, frameAt, frameConsonant, mod, pcDistance, pcOf, spellAt, STEPS, type Chord, type Frame } from "./frame.ts";
import { candidates, placeByOctave, spellIn, transitionCost, type Voicing, type Window } from "./voicing.ts";
import type { BarInfo, EventRole, SungNote } from "./types.ts";
import type { SpelledPitch } from "../music/pitch.ts";

export interface Segment {
  bar: number;
  start: number;
  end: number;
  midi: number;
  pitch: string;
  role: EventRole;
  label: string;
}

interface Line {
  midi: number;
  pitch: string;
  role: EventRole;
  doubles: string | null;
  start: number;
  label: string;
}

export interface BarPlan {
  bar: number;
  frame: Frame | null;
  chord: Chord | null;
  voicing: Voicing | null;
  fallback: boolean;
  forms: Map<Step, number>;
  nextBass: SpelledPitch | null;
}

export interface EnrichContext {
  notes: SungNote[];
  /** Octaves the continuo bass sits below the sung bass. */
  shift: number;
  win: Window;
  costs: Costs;
}

export interface BarTimeline {
  segments: Segment[];
  upbeat?: BarInfo["upbeat"];
  notes: string[];
}

const highestSung = (f: Frame) => f.sounding[f.sounding.length - 1].pitch.midi;
const uppersOf = (f: Frame) => new Map(f.uppers.map((u) => [u.voice, u.pitch.midi]));

/** Build the right hand of one bar, from its downbeat voicing through every sung onset in the bar. */
export function enrichBar(plan: BarPlan, ctx: EnrichContext): BarTimeline {
  const t0 = 2 * plan.bar;
  const t1 = t0 + 2;
  const out: Segment[] = [];
  const notes: string[] = [];
  if (!plan.voicing || !plan.frame) return { segments: out, notes };
  const lines: Line[] = plan.voicing.midi.map((m, i) => ({
    midi: m,
    pitch: plan.voicing!.pitches[i],
    role: plan.voicing!.roles[i],
    doubles: plan.voicing!.doubles[i],
    start: t0,
    label: plan.fallback ? "c.p." : plan.chord?.figure ?? "",
  }));
  const close = (l: Line, t: number) => {
    if (t > l.start) out.push({ bar: plan.bar, start: l.start, end: t, midi: l.midi, pitch: l.pitch, role: l.role, label: l.label });
  };
  const change = (l: Line, t: number, midi: number, pitch: string, label: string) => {
    if (midi === l.midi) return;
    close(l, t);
    Object.assign(l, { midi, pitch, start: t, label });
  };
  const drop = (l: Line, t: number) => {
    close(l, t);
    lines.splice(lines.indexOf(l), 1);
  };
  const lhAt = (f: Frame) => f.bass.pitch.midi - 12 * ctx.shift;

  /** Re-voice to `chord` with the least cost from the current right hand. */
  const revoice = (chord: Chord, from: Frame, to: Frame, t: number, label: string) => {
    lines.sort((a, b) => a.midi - b.midi);
    const cur: Voicing = { midi: lines.map((l) => l.midi), pitches: lines.map((l) => l.pitch), roles: lines.map((l) => l.role), doubles: lines.map(() => null), barCost: 0 };
    const a = { bassMidi: lhAt(from), uppers: uppersOf(from) };
    const b = { bassMidi: lhAt(to), uppers: uppersOf(to) };
    let best: Voicing | null = null;
    let bestCost = Infinity;
    for (const c of candidates(chord, lhAt(to), highestSung(to), ctx.win, ctx.costs)) {
      const cost = c.barCost + transitionCost(cur, c, a, b, ctx.costs);
      if (cost < bestCost - 1e-9) {
        best = c;
        bestCost = cost;
      }
    }
    if (best && best.midi.length === lines.length) {
      lines.forEach((l, i) => change(l, t, best!.midi[i], best!.pitches[i], label));
      return;
    }
    // No voicing fits: keep only the notes that belong to the new chord and do not clash.
    notes.push(`beat ${t}: no voicing of ${chord.figure}; right-hand notes thinned`);
    for (const l of [...lines]) if (!chord.pcs.includes(mod(l.midi, 12)) || l.midi <= lhAt(to)) drop(l, t);
  };

  /** Keep every right-hand note above the continuo bass. */
  const ensureAbove = (chord: Chord, from: Frame, to: Frame, t: number) => {
    if (lines.some((l) => l.midi <= lhAt(to))) {
      notes.push(`beat ${t}: right hand re-voiced above the moving bass`);
      revoice(chord, from, to, t, chord.figure);
    }
  };

  const onsets = [...new Set(ctx.notes.filter((n) => n.start > t0 && n.start < t1).map((n) => n.start))].sort((a, b) => a - b);
  let chord = plan.chord;
  let last = plan.frame;
  let upbeat: BarInfo["upbeat"];
  for (const t of onsets) {
    const frame = frameAt(ctx.notes, t);
    if (!frame) continue;
    const lh = lhAt(frame);
    if (plan.fallback || !chord) {
      // Colla parte: the doublings follow their voices; the added chord tone yields to any clash.
      for (const l of [...lines]) {
        if (l.doubles) {
          const n = frame.sounding.find((s) => s.voice === l.doubles);
          if (!n) drop(l, t);
          else if (n.start === t) {
            const m = placeByOctave(n.pitch.midi, [l.midi], lh, ctx.win);
            if (m === null) drop(l, t);
            else change(l, t, m, spellAt({ step: n.pitch.step, alter: n.pitch.alter }, m), "c.p.");
          }
        } else if (l.midi <= lh || frame.sounding.some((s) => clashes(s.pitch.midi, l.midi) && mod(s.pitch.midi, 12) !== mod(l.midi, 12))) drop(l, t);
      }
      last = frame;
      continue;
    }
    const sungPcs = frame.sounding.map((n) => mod(n.pitch.midi, 12));
    const kindLabel = (k: NonNullable<BarInfo["upbeat"]>["kind"], figure?: string, c?: Chord) => {
      // The first change of the bar decides its label; later onsets (third species) only adjust.
      if (!upbeat || upbeat.kind === "chordTone" || upbeat.kind === "transitus") upbeat = { kind: k, ...(figure ? { figure } : {}), ...(c ? { chord: c.tones.map((x) => x.step + (x.alter > 0 ? "#" : x.alter < 0 ? "b" : "")) } : {}) };
    };
    if (sungPcs.every((pc) => chord!.pcs.includes(pc))) {
      kindLabel("chordTone");
      ensureAbove(chord, last, frame, t);
    } else if (frame.bass === last.bass) {
      if (!frameConsonant(frame)) {
        kindLabel("transitus");
        ensureAbove(chord, last, frame, t);
      } else {
        const next = chooseChord({ frame, nextBass: plan.nextBass, forms: plan.forms });
        const label = `${chord.short} ${next.short}`;
        if (!next.valid) {
          kindLabel("transitus");
        } else if (!innerChange(lines, chord, next, frame, lh, t, change, ctx.win)) {
          notes.push(`beat ${t}: no stepwise inner change to ${next.figure}; re-voiced`);
          revoice(next, last, frame, t, label);
          kindLabel("innerChange", label, next);
          chord = next;
        } else {
          kindLabel("innerChange", label, next);
          chord = next;
        }
      }
    } else if (frameConsonant(frame)) {
      const next = chooseChord({ frame, nextBass: plan.nextBass, forms: plan.forms });
      if (next.valid) {
        const label = `${chord.figure} · ${next.figure}`;
        revoice(next, last, frame, t, next.figure);
        kindLabel("refigured", label, next);
        chord = next;
      } else {
        kindLabel("transitus");
        ensureAbove(chord, last, frame, t);
      }
    } else {
      kindLabel("transitus");
      ensureAbove(chord, last, frame, t);
    }
    // Whatever happened, no right-hand note may clash with a consonant sung note.
    if (frameConsonant(frame)) {
      for (const l of [...lines]) if (frame.sounding.some((s) => pcDistance(s.pitch.midi, l.midi) === 1 || pcDistance(s.pitch.midi, l.midi) === 2)) {
        notes.push(`beat ${t}: ${l.pitch} dropped (clash)`);
        drop(l, t);
      }
    }
    last = frame;
  }
  for (const l of lines) close(l, t1);
  return { segments: out, upbeat, notes };
}

/** 5 -> 6 or 6 -> 5 over the held bass: the voice(s) holding the outgoing tone move by step. */
function innerChange(
  lines: Line[],
  from: Chord,
  to: Chord,
  frame: Frame,
  lh: number,
  t: number,
  change: (l: Line, t: number, midi: number, pitch: string, label: string) => void,
  win: Window,
): boolean {
  const outgoing = from.pcs.filter((pc) => !to.pcs.includes(pc));
  const incoming = to.pcs.filter((pc) => !from.pcs.includes(pc));
  const moves: { line: Line; midi: number }[] = [];
  for (const l of lines) {
    if (!outgoing.includes(mod(l.midi, 12))) continue;
    let best: number | null = null;
    for (const d of [1, -1, 2, -2]) {
      const m = l.midi + d;
      if (!incoming.includes(mod(m, 12)) || m < win.low || m > win.high || m <= lh) continue;
      if (lines.some((o) => o !== l && o.midi === m) || moves.some((x) => x.midi === m)) continue;
      best = m;
      break;
    }
    if (best === null) return false;
    moves.push({ line: l, midi: best });
  }
  const after = lines.map((l) => moves.find((x) => x.line === l)?.midi ?? l.midi);
  if (after.some((m) => !to.pcs.includes(mod(m, 12)))) return false;
  if (after.some((m) => frame.sounding.some((s) => clashes(s.pitch.midi, m) && mod(s.pitch.midi, 12) !== mod(m, 12)))) return false;
  for (const { line, midi } of moves) change(line, t, midi, spellIn(to.tones, midi), `${from.short} ${to.short}`);
  return true;
}

/**
 * Optional passing notes: a right-hand voice held through bar b that must move by a third or a
 * fourth into the next downbeat gets a stepwise passing note on the upbeat, unless it would make a
 * unison, octave, second or seventh with a sung voice there.
 */
export function passingFill(bar: Segment[], next: Segment[], b: number, plan: BarPlan, nextForms: Map<Step, number>, ctx: EnrichContext): Segment[] {
  const t0 = 2 * b;
  const up = t0 + 1;
  const t1 = t0 + 2;
  const frame = frameAt(ctx.notes, up);
  if (!frame || !ctx.notes.some((n) => n.start === up)) return bar;
  const lh = frame.bass.pitch.midi - 12 * ctx.shift;
  const ending = bar.filter((s) => s.end === t1 && s.role === "rh").sort((a, c) => a.midi - c.midi);
  const target = next.filter((s) => s.start === t1 && s.role === "rh").sort((a, c) => a.midi - c.midi);
  if (ending.length !== target.length || ending.length === 0) return bar;
  const result = [...bar];
  ending.forEach((seg, i) => {
    if (seg.start !== t0) return;
    const from = parsePitch(seg.pitch);
    const to = parsePitch(target[i].pitch);
    const steps = to.diatonic - from.diatonic;
    if (Math.abs(steps) < 2 || Math.abs(steps) > 3 || Math.abs(to.midi - from.midi) < 3) return;
    const dir = Math.sign(steps);
    const diatonic = Math.abs(steps) === 2 ? from.diatonic + dir : to.diatonic - dir;
    const step = STEPS[mod(diatonic, 7)];
    const alter = nextForms.get(step) ?? plan.forms.get(step) ?? 0;
    const octave = Math.floor(diatonic / 7);
    const name = `${step}${alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)}${octave}`;
    const p = parsePitch(name);
    const stepOk = (a: number, c: number) => Math.abs(a - c) === 1 || Math.abs(a - c) === 2;
    if (!stepOk(p.midi, to.midi) || (Math.abs(steps) === 2 && !stepOk(p.midi, from.midi))) return;
    if (p.midi < ctx.win.low || p.midi > ctx.win.high || p.midi <= lh) return;
    if (result.some((s) => s !== seg && s.start <= up && s.end > up && s.midi === p.midi)) return;
    if (frame.sounding.some((s) => clashes(s.pitch.midi, p.midi))) return;
    const k = result.indexOf(seg);
    result[k] = { ...seg, end: up };
    result.push({ bar: b, start: up, end: t1, midi: p.midi, pitch: name, role: "rh", label: "pass" });
  });
  return result;
}

