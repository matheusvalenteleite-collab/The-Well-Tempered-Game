/**
 * The three-voice reading of a two-voice exercise once Fux's line is shown (decision D47): the
 * cantus, the player's line and Fux's sounding together. Each pair with the cantus is judged by the
 * exercise's own evaluation; this reads what the third voice adds: the sonority of all three, and
 * the pair formed by the two counterpoints. It says where the texture works and where it breaks;
 * it awards nothing. Pure.
 */
import { parsePitch } from "../music/pitch.ts";
import { sounding, type Slot } from "../counterpoint/layout.ts";

export type TrioKind =
  | "dissonanceWithBass"
  | "dissonanceBetweenUppers"
  | "parallelPerfect"
  | "directPerfectOuter"
  | "unison"
  | "completeTriad"
  | "contrary";

export interface TrioFinding {
  kind: TrioKind;
  /** "fault": breaks the texture; "note": worth knowing; "good": where it works. */
  tone: "fault" | "note" | "good";
  /** Slot indices. */
  slots: number[];
  /** Interval or chord shown with the finding ("P5", "5/3" ...). */
  detail?: string;
}

interface Note {
  midi: number;
  diatonic: number;
  pc: number;
}
const note = (p: string): Note => {
  const x = parsePitch(p);
  return { midi: x.midi, diatonic: x.diatonic, pc: ((x.midi % 12) + 12) % 12 };
};
const generic = (a: Note, b: Note) => Math.abs(a.diatonic - b.diatonic) % 7; // 0 = unison/octave, 4 = fifth ...
const semis = (a: Note, b: Note) => Math.abs(a.midi - b.midi) % 12;
/** Consonant above a bass: unison/octave, 3rds, perfect 5th, 6ths. */
const consonantWithBass = (lo: Note, hi: Note) => {
  const g = generic(lo, hi);
  const s = semis(lo, hi);
  return (g === 0 && s === 0) || (g === 2 && (s === 3 || s === 4)) || (g === 4 && s === 7) || (g === 5 && (s === 8 || s === 9));
};
/** Between upper voices the perfect fourth also passes (it is not against the bass). */
const consonantBetweenUppers = (a: Note, b: Note) => consonantWithBass(a.midi <= b.midi ? a : b, a.midi <= b.midi ? b : a) || (generic(a, b) === 3 && semis(a, b) === 5);
const perfect = (a: Note, b: Note) => {
  const g = generic(a, b);
  const s = semis(a, b);
  return (g === 0 && s === 0) || (g === 4 && s === 7);
};
const name = (a: Note, b: Note) => {
  const g = generic(a, b);
  return g === 0 ? (Math.abs(a.midi - b.midi) === 0 ? "1" : "8") : String(g + 1);
};

/**
 * `cantus`: one note per bar; `player`, `fux`: one entry per slot of `layout`.
 * Only onsets where all three voices sound are read (a rest or an empty slot is skipped).
 */
export function trioReading(cantus: string[], player: (string | null)[], fux: (string | null)[], layout: Slot[]): TrioFinding[] {
  const out: TrioFinding[] = [];
  const firstBar = layout[0]?.bar ?? 0;
  const at = layout
    .map((sl, k) => ({ k, sl, c: cantus[sl.bar - firstBar], p: player[k], f: fux[k] }))
    .filter((x) => x.c && sounding(x.p ?? null) && sounding(x.f ?? null))
    .map((x) => ({ k: x.k, beat: x.sl.beat, c: note(x.c), p: note(x.p as string), f: note(x.f as string) }));

  const triads: number[] = [];
  const contrary: number[] = [];
  for (let i = 0; i < at.length; i++) {
    const { k, beat, c, p, f } = at[i];
    const voices = [c, p, f].sort((a, b) => a.midi - b.midi);
    const [lo, mid, hi] = voices;
    // Sonority. In second species an upbeat dissonance between the two counterpoints passes if
    // either line moves by step into and out of its note (a passing note).
    const passing = beat === 1 && (stepwiseAround(player, k) || stepwiseAround(fux, k));
    if (!(beat === 1 && passing)) {
      if (!consonantWithBass(lo, mid) || !consonantWithBass(lo, hi)) {
        const bad = !consonantWithBass(lo, mid) ? mid : hi;
        // The cantus-player and cantus-Fux pairs are judged elsewhere; report only clashes that involve both counterpoints.
        if (bad !== c && lo !== c) out.push({ kind: "dissonanceWithBass", tone: "fault", slots: [k], detail: name(lo, bad) });
      }
      if (lo === c && !consonantBetweenUppers(p, f)) out.push({ kind: "dissonanceBetweenUppers", tone: "fault", slots: [k], detail: name(p, f) });
    }
    if (p.midi === f.midi && i > 0 && i < at.length - 1) out.push({ kind: "unison", tone: "note", slots: [k] });
    const pcs = new Set(voices.map((v) => v.pc));
    if (pcs.size === 3 && consonantWithBass(lo, mid) && consonantWithBass(lo, hi) && consonantBetweenUppers(mid, hi)) triads.push(k);

    if (i === 0) continue;
    const prev = at[i - 1];
    if (prev.k !== k - 1) continue; // only immediate successions
    const dp = p.midi - prev.p.midi;
    const df = f.midi - prev.f.midi;
    if (dp * df < 0) contrary.push(k);
    // Parallel (consecutive) perfect consonances between the two counterpoints.
    if (perfect(prev.p, prev.f) && perfect(p, f) && name(prev.p, prev.f) === name(p, f) && (dp !== 0 || df !== 0) && dp * df > 0)
      out.push({ kind: "parallelPerfect", tone: "fault", slots: [prev.k, k], detail: name(p, f) });
    // Similar motion into a perfect consonance between the outer voices (when both outer voices are counterpoints or include the cantus).
    const pv = [prev.c, prev.p, prev.f];
    const cv = [c, p, f];
    const iLo = [0, 1, 2].reduce((m, j) => (cv[j].midi < cv[m].midi ? j : m), 0);
    const iHi = [0, 1, 2].reduce((m, j) => (cv[j].midi > cv[m].midi ? j : m), 0);
    const pLo = [0, 1, 2].reduce((m, j) => (pv[j].midi < pv[m].midi ? j : m), 0);
    const pHi = [0, 1, 2].reduce((m, j) => (pv[j].midi > pv[m].midi ? j : m), 0);
    if (iLo === pLo && iHi === pHi && iLo !== iHi && (iLo !== 0 || iHi !== 0)) {
      const a0 = pv[iLo];
      const b0 = pv[iHi];
      const a1 = cv[iLo];
      const b1 = cv[iHi];
      const da = a1.midi - a0.midi;
      const db = b1.midi - b0.midi;
      const involvesBoth = iLo !== 0 && iHi !== 0;
      if (involvesBoth && perfect(a1, b1) && da * db > 0 && !(perfect(a0, b0) && name(a0, b0) === name(a1, b1)))
        out.push({ kind: "directPerfectOuter", tone: "note", slots: [prev.k, k], detail: name(a1, b1) });
    }
  }
  if (triads.length) out.push({ kind: "completeTriad", tone: "good", slots: triads });
  if (contrary.length) out.push({ kind: "contrary", tone: "good", slots: contrary });
  // The cadence (owner): the final two bars are exempt from the faults and notes between the two
  // counterpoints; there both lines usually take the same formula (7-8 or 2-1) by necessity.
  const lastBars = new Set(layout.filter((sl) => sl.bar - firstBar >= cantus.length - 2).map((sl) => layout.indexOf(sl)));
  return out.filter((f) => f.tone === "good" || !f.slots.every((k) => lastBars.has(k)));
}

/** The note at slot k is approached and left by step (a passing note). */
function stepwiseAround(line: (string | null)[], k: number): boolean {
  const [a, b, c] = [line[k - 1], line[k], line[k + 1]];
  if (!sounding(a ?? null) || !sounding(b ?? null) || !sounding(c ?? null)) return false;
  const d1 = parsePitch(b as string).diatonic - parsePitch(a as string).diatonic;
  const d2 = parsePitch(c as string).diatonic - parsePitch(b as string).diatonic;
  return Math.abs(d1) === 1 && Math.abs(d2) === 1 && Math.sign(d1) === Math.sign(d2);
}
