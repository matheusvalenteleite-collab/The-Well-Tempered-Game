/**
 * D309, the practice report's proposal (§6), per instrument: how long each of the others' notes is held
 * (a hold fraction f of the time to the next onset, its gap clamped in milliseconds), and on the
 * sampled piano alone a level from the score (§6.6). Pure: notes in, numbers out; never the player's
 * input (D293), never which voice has the subject.
 *
 * Definitions (§6.1): IOI, the time from a note's onset to the next onset in its voice at the playing
 * tempo; gap = clamp((1 - f) * IOI, min, max); the note sounds IOI - gap. A row with `join` is held
 * over the next onset (that many ms on a sampled harpsichord or piano; a sustained sound's D302
 * crossfade elsewhere). Rules are the departure note's (the earlier of the pair). Precedence (phrasing.ts):
 * a reading's marks, then ties and suspensions (a tie is one note in the score; a suspension or
 * appoggiatura joined to its resolution), then a cadence arrival, then a repeated note, then the
 * interval; the fugue's character (character.ts) moves the interval rows of quavers and slower.
 */
import { PATCHES, presetById, slotOf, type Patch } from "./sound.ts";
import { SAMPLED } from "./sampled.ts";
import type { Character } from "./character.ts";

/** How a voice is played: a keyboard's table, or the singers' way. */
export type Kind = "harpsichord" | "piano" | "organ" | "sung" | "solo";
export type KeyKind = "harpsichord" | "piano" | "organ";

/** A row: hold fraction and gap clamp (ms), or joined with an overlap (ms). */
export type Row = { f: number; min: number; max: number } | { join: number };

export interface Table {
  /** Step (or a third), IOI under 200 ms: running semiquavers. */
  fastStep: Row;
  fastThird: Row;
  /** Step, IOI 200-450 ms (walking quavers), upper voices and bass. */
  step: Row;
  stepBass: Row;
  /** Step, IOI over 450 ms. */
  slowStep: Row;
  slowStepBass: Row;
  /** Third, IOI 200 ms or more. */
  third: Row;
  /** Leap of a fourth or more, IOI under 200 ms. */
  fastLeap: Row;
  /** Leap of a fourth or more (to a seventh), IOI 200 ms or more. */
  leap: Row;
  leapBass: Row;
  /** Octave (or wider), IOI 200 ms or more. */
  octave: Row;
  octaveBass: Row;
  /** Repeated note: f for a semiquaver (IOI < 200 ms), a quaver (200-450), a crotchet or longer; one clamp. */
  repeat: { f: readonly [number, number, number]; min: number; max: number };
  /** A suspension's or appoggiatura's dissonance into its resolution. */
  resolution: Row;
  /** An upper voice's arrival at a cadence, followed by a new start in that voice. */
  cadence: Row;
  /** The bass's arrival note reached by a leap of a fourth or more, going on by step: f lowered by `df`, the gap at most `max` ms longer. */
  arrival: { df: number; max: number };
}

/** §6.2 harpsichord, §6.3 piano, §6.4 organ (ms). Organ rows the report leaves out (third, quick leap, a manual octave) are ours. */
export const TABLES: Record<KeyKind, Table> = {
  harpsichord: {
    fastStep: { join: 6 },
    fastThird: { join: 6 },
    step: { f: 0.94, min: 12, max: 35 },
    stepBass: { f: 0.94, min: 12, max: 35 },
    slowStep: { f: 0.93, min: 25, max: 70 },
    slowStepBass: { f: 0.93, min: 25, max: 70 },
    third: { f: 0.88, min: 20, max: 80 },
    fastLeap: { f: 0.9, min: 0, max: 25 },
    leap: { f: 0.72, min: 40, max: 130 },
    leapBass: { f: 0.66, min: 45, max: 150 },
    octave: { f: 0.55, min: 60, max: 180 },
    octaveBass: { f: 0.55, min: 60, max: 180 },
    repeat: { f: [0.55, 0.6, 0.65], min: 45, max: 200 },
    resolution: { join: 6 },
    cadence: { f: 0.85, min: 40, max: 120 },
    arrival: { df: 0.05, max: 30 },
  },
  piano: {
    fastStep: { join: 12 },
    // (Repp: a consonant interval held over longer.)
    fastThird: { join: 20 },
    step: { f: 0.93, min: 15, max: 40 },
    stepBass: { f: 0.86, min: 25, max: 60 },
    slowStep: { f: 0.86, min: 40, max: 110 },
    slowStepBass: { f: 0.86, min: 40, max: 110 },
    third: { f: 0.8, min: 30, max: 110 },
    fastLeap: { f: 0.88, min: 0, max: 30 },
    leap: { f: 0.68, min: 40, max: 130 },
    leapBass: { f: 0.62, min: 50, max: 150 },
    octave: { f: 0.48, min: 70, max: 200 },
    octaveBass: { f: 0.48, min: 70, max: 200 },
    repeat: { f: [0.45, 0.5, 0.6], min: 60, max: 220 },
    resolution: { join: 15 },
    cadence: { f: 0.85, min: 40, max: 140 },
    arrival: { df: 0.05, max: 30 },
  },
  organ: {
    fastStep: { join: 0 },
    fastThird: { join: 0 },
    step: { f: 0.92, min: 25, max: 60 },
    stepBass: { f: 0.88, min: 30, max: 80 },
    slowStep: { f: 0.92, min: 25, max: 60 },
    slowStepBass: { f: 0.88, min: 30, max: 80 },
    third: { f: 0.92, min: 25, max: 60 },
    fastLeap: { f: 0.9, min: 0, max: 25 },
    leap: { f: 0.72, min: 40, max: 140 },
    leapBass: { f: 0.62, min: 50, max: 180 },
    octave: { f: 0.6, min: 50, max: 160 },
    octaveBass: { f: 0.5, min: 50, max: 180 },
    repeat: { f: [0.5, 0.5, 0.5], min: 60, max: 250 },
    resolution: { join: 0 },
    cadence: { f: 0.85, min: 40, max: 120 },
    arrival: { df: 0.05, max: 30 },
  },
};

/**
 * §6.1, §6.3: the character's shift of f on the interval rows of quavers and slower (IOI 200 ms or
 * more): steps and thirds by `step`, leaps by `leap` (the bass's by `bassLeap`); octaves and repeated
 * notes kept; only on quavers and longer (a semiquaver at a slow tempo keeps the table's row). Capped
 * at 1.0 (f 0.995 or more: joined); the row's gap clamp scaled by (1 - f') / (1 - f). The piano's lively leaps -0.13 (the report:
 * upper-voice quaver leaps to 0.55, bass steps to 0.80).
 */
export const SHIFT: Record<KeyKind, Record<Character, { step: number; leap: number; bassLeap: number }>> = {
  harpsichord: { antico: { step: 0.1, leap: 0.2, bassLeap: 0.2 }, neutral: { step: 0, leap: 0, bassLeap: 0 }, lively: { step: -0.06, leap: -0.08, bassLeap: -0.08 } },
  piano: { antico: { step: 0.1, leap: 0.2, bassLeap: 0.2 }, neutral: { step: 0, leap: 0, bassLeap: 0 }, lively: { step: -0.06, leap: -0.13, bassLeap: -0.08 } },
  organ: { antico: { step: 0.1, leap: 0.2, bassLeap: 0.2 }, neutral: { step: 0, leap: 0, bassLeap: 0 }, lively: { step: -0.06, leap: -0.08, bassLeap: -0.08 } },
};

/** §6.5, SOLO VOICES: a breath at a cadence arrival (f 0.85, the gap 120-250 ms); everything else joined, a repeated note on a new syllable. */
export const BREATH = { f: 0.85, min: 120, max: 250 } as const;

/** No gap more than this share of the IOI (a quick repeated note keeps a sound). */
export const GAP_MAX_SHARE = 0.6;

export interface Pair {
  /** Semitones to the next note (signed). */
  interval: number;
  /** IOI, seconds. */
  ioi: number;
  bass: boolean;
  /** The bass's note reached by a leap of a fourth or more (it goes on by step). */
  arrival?: boolean;
  /** A suspension's or appoggiatura's dissonance resolving by step down to the next. */
  resolution?: boolean;
  /** An upper voice's arrival at a cadence. */
  cadence?: boolean;
  character?: Character;
  /** The note is a quaver or longer (default true): a shorter one is played as running semiquavers whatever its IOI, and the character moves only quavers and longer (§6.1). */
  quaver?: boolean;
}

/** The decision for a pair: joined (overlap, s) or a gap (s). */
export type Decision = { join: number } | { gap: number };

const gapOf = (f: number, ioi: number, min: number, max: number) => Math.min(GAP_MAX_SHARE * ioi, Math.max(min / 1000, Math.min(max / 1000, (1 - f) * ioi)));

/** One pair by an instrument's table (the reading's marks are phrasing.ts's, before this). */
export function decide(kind: KeyKind, p: Pair): Decision {
  const T = TABLES[kind];
  const row = (r: Row, shift = 0): Decision => {
    if ("join" in r) return { join: r.join / 1000 };
    const f = Math.min(1, r.f + (p.quaver === false ? 0 : shift));
    if (f >= 0.995) return { join: ("join" in T.fastStep ? T.fastStep.join : 0) / 1000 };
    // The clamp moves with f (antico's 0.97 is not held to a neutral 0.86's least gap).
    const k = (1 - f) / (1 - r.f);
    let gap = gapOf(f, p.ioi, r.min * k, r.max * k);
    if (p.arrival && p.bass) gap = Math.min(gap + T.arrival.max / 1000, Math.max(gap, gapOf(f - T.arrival.df, p.ioi, r.min * k, r.max * k + T.arrival.max)));
    return { gap };
  };
  if (p.resolution) return row(T.resolution);
  if (p.cadence && !p.bass) return row(T.cadence);
  const semis = Math.abs(p.interval);
  // Running semiquavers (by IOI, or by value at a slow tempo: the corpus joins stepwise semiquavers in every voice, §3.1).
  const fast = p.ioi < 0.2 || p.quaver === false;
  if (semis === 0) {
    const r = T.repeat;
    const f = r.f[fast ? 0 : p.ioi <= 0.45 ? 1 : 2];
    return { gap: gapOf(f, p.ioi, r.min, r.max) };
  }
  const sh = SHIFT[kind][p.character ?? "neutral"];
  if (semis <= 2) return fast ? row(T.fastStep) : row(p.ioi <= 0.45 ? (p.bass ? T.stepBass : T.step) : p.bass ? T.slowStepBass : T.slowStep, sh.step);
  if (semis <= 4) return fast ? row(T.fastThird) : row(T.third, sh.step);
  if (fast) return row(T.fastLeap);
  if (semis >= 12) return row(p.bass ? T.octaveBass : T.octave);
  return row(p.bass ? T.leapBass : T.leap, p.bass ? sh.bassLeap : sh.leap);
}

/**
 * §6.5: a patch's way: plucked or decaying (a recording plucked, a synthesized pluck or a sustain
 * at half its peak or under, a period envelope fading) the harpsichord's table; sustaining the organ's.
 */
export function patchKind(p: Patch | null | undefined, bass: boolean): KeyKind {
  // The classic chip sound (no patch): its pulses fall to 0.42 of their peak (chip.ts CHIP_ENV); its triangle bass holds.
  if (!p) return bass ? "organ" : "harpsichord";
  if (p.sample) return SAMPLED[p.sample]?.plucked ? "harpsichord" : "organ";
  if (p.rec?.fade !== undefined && p.rec.fade <= 1.5) return "harpsichord";
  const s = p.steps ? p.steps.to / p.steps.from : p.amp.s;
  return s <= 0.5 ? "harpsichord" : "organ";
}

/** Each voice's way for a sound (by its id) and a number of voices. */
export function kindsOf(soundId: string, count: number): Kind[] {
  const pr = presetById(soundId);
  return Array.from({ length: count }, (_, v): Kind => {
    if (pr.id === "harpsichordSampled") return "harpsichord";
    if (pr.id === "pianoSampled") return "piano";
    if (pr.id === "chamberOrgan" || pr.id === "organSampled") return "organ";
    if (pr.id === "vocalSynth") return "sung";
    if (pr.id === "soloVoices") return "solo";
    const by = pr.by?.[count];
    const id = by ? by[Math.min(v, by.length - 1)][0] : pr.slots?.[slotOf(v, count)];
    return patchKind(id ? (PATCHES as Record<string, Patch>)[id] : null, count > 1 && v === count - 1);
  });
}

/** A note of the score: onset and length in ticks, MIDI, voice. */
export interface ScoreNote {
  on: number;
  dur: number;
  midi: number;
  voice: number;
}

const DISSONANT = new Set([1, 2, 5, 6, 10, 11]);
const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);

/** The notes sounding at a tick, quickly (sorted by onset, the longest note bounding the look back). */
export function soundingIndex(score: readonly ScoreNote[]): (t: number) => ScoreNote[] {
  const s = [...score].sort((a, b) => a.on - b.on);
  const longest = s.reduce((m, n) => Math.max(m, n.dur), 0);
  return (t) => {
    let lo = 0;
    let hi = s.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid].on <= t) lo = mid + 1;
      else hi = mid;
    }
    const out: ScoreNote[] = [];
    for (let k = lo - 1; k >= 0 && s[k].on > t - longest - 1; k--) if (s[k].on + s[k].dur > t) out.push(s[k]);
    return out;
  };
}

/**
 * Suspensions and appoggiature (§6.2's "dissonance → resolution"): a note dissonant against the bass
 * (a second, fourth, tritone or seventh above the lowest other note sounding) on a beat, either struck
 * there (an appoggiatura or accented passing note) or held into it while another voice moves
 * (a suspension: tied over in the score, one note here), resolving by a step down to a note
 * consonant with the bass. Keys "voice:on": the dissonance and its resolution. Never the bass's own.
 */
export function suspensions(score: readonly ScoreNote[], beat: number, inBar: (t: number) => number): { dissonance: Set<string>; resolution: Set<string> } {
  const at = soundingIndex(score);
  const dissonance = new Set<string>();
  const resolution = new Set<string>();
  const byVoice = new Map<number, ScoreNote[]>();
  for (const n of score) {
    const v = byVoice.get(n.voice);
    if (v) v.push(n);
    else byVoice.set(n.voice, [n]);
  }
  const bassUnder = (t: number, voice: number, below: number) => {
    let b: ScoreNote | null = null;
    for (const m of at(t)) if (m.voice !== voice && m.midi < below && (!b || m.midi < b.midi)) b = m;
    return b;
  };
  for (const ns of byVoice.values()) {
    ns.sort((a, b) => a.on - b.on);
    for (let k = 0; k + 1 < ns.length; k++) {
      const n = ns[k];
      const r = ns[k + 1];
      if (r.on !== n.on + n.dur || n.midi - r.midi < 1 || n.midi - r.midi > 2) continue;
      // The beat it is dissonant on: its own onset (struck on a beat), or a beat it is held into while
      // another voice moves (a suspension).
      const pos = inBar(n.on);
      let s = pos % beat === 0 ? n.on : n.on + (beat - (pos % beat));
      let found = false;
      for (let q = 0; q < 4 && s < n.on + n.dur && !found; q++, s += beat) {
        const b = bassUnder(s, n.voice, n.midi);
        if (!b || !DISSONANT.has((n.midi - b.midi) % 12)) continue;
        if (s > n.on && !at(s).some((m) => m.voice !== n.voice && m.on === s)) continue;
        found = true;
      }
      if (!found) continue;
      const rb = bassUnder(r.on, r.voice, r.midi);
      if (!rb || !CONSONANT.has((r.midi - rb.midi) % 12)) continue;
      dissonance.add(`${n.voice}:${n.on}`);
      resolution.add(`${r.voice}:${r.on}`);
    }
  }
  return { dissonance, resolution };
}

/** §6.6, the piano's terms (dB). */
export const DYN = {
  register: 1,
  contour: [1.2, 0.6, 0] as const,
  contourClamp: 1,
  metric: { beat: 0.3, sub: -0.3 },
  arc: { from: -1.5, peak: 1.5, at: 0.65, to: -0.5, minBars: 2 },
  tension: { dissonance: 0.6, resolution: -0.4 },
  ending: { db: 1.5, bars: 2 },
  limit: 4,
  /** The soft recording below this (dB): sampled.ts SAMPLED.piano.soft.below. */
  soft: -1.5,
} as const;

/** The arc's value at x (0..1) through a segment: -1.5 rising to +1.5 at 0.65, falling to -0.5 at its cadence. */
export function arcAt(x: number): number {
  const A = DYN.arc;
  return x <= A.at ? A.from + ((A.peak - A.from) * x) / A.at : A.peak + ((A.to - A.peak) * (x - A.at)) / (1 - A.at);
}

/**
 * §6.6, the piano's dynamics: each note's level (dB) from the score alone: register balance at each
 * onset (the highest note sounding +1, the lowest -1), contour against its voice's median pitch, the
 * metre, phrase arcs between cadences (perfect and imperfect: fugue.ts cadences; shorter than two
 * bars merged with the next), a suspension's tension and release, the last two bars' rise; soft-limited
 * to ±4 dB. Keys "voice:on:midi". No term knows which voice has the subject or what the player does.
 */
export function pianoLevels(score: readonly ScoreNote[], o: { beat: number; inBar: (t: number) => number; bar: number; cadences?: readonly { on: number; kind?: string }[]; harmony?: { dissonance: Set<string>; resolution: Set<string> } }): Map<string, number> {
  const out = new Map<string, number>();
  if (!score.length) return out;
  const at = soundingIndex(score);
  const voices = [...new Set(score.map((n) => n.voice))].sort((a, b) => a - b);
  const top = voices[0];
  const bottom = voices[voices.length - 1];
  const median = new Map<number, number>();
  for (const v of voices) {
    const ps = score.filter((n) => n.voice === v).map((n) => n.midi).sort((a, b) => a - b);
    median.set(v, ps[ps.length >> 1]);
  }
  const first = Math.min(...score.map((n) => n.on));
  const lastOn = Math.max(...score.map((n) => n.on));
  // The arcs' boundaries: the cadences' arrivals (V-I), the piece's last onset.
  const cads = [...new Set((o.cadences ?? []).filter((c) => !c.kind || c.kind === "perfect" || c.kind === "imperfect").map((c) => c.on))].filter((t) => t > first && t < lastOn).sort((a, b) => a - b);
  const bounds: number[] = [];
  let prev = first;
  for (const c of cads) {
    if (c - prev < DYN.arc.minBars * o.bar) continue;
    bounds.push(c);
    prev = c;
  }
  if (bounds.length && lastOn - bounds[bounds.length - 1] < DYN.arc.minBars * o.bar) bounds.pop();
  bounds.push(lastOn);
  const arc = (t: number) => {
    let a = first;
    for (const c of bounds) {
      if (t <= c) return arcAt(c > a ? (t - a) / (c - a) : 1);
      a = c;
    }
    return DYN.arc.to;
  };
  const endFrom = lastOn - DYN.ending.bars * o.bar;
  const h = o.harmony;
  for (const n of score) {
    let db = 0;
    const sound = at(n.on);
    if (new Set(sound.map((m) => m.voice)).size >= 2) {
      const hi = Math.max(...sound.map((m) => m.midi));
      const lo = Math.min(...sound.map((m) => m.midi));
      if (hi > lo) db += n.midi === hi ? DYN.register : n.midi === lo ? -DYN.register : 0;
    }
    const slope = voices.length === 1 || n.voice === top ? DYN.contour[0] : n.voice === bottom ? DYN.contour[2] : DYN.contour[1];
    db += Math.max(-DYN.contourClamp, Math.min(DYN.contourClamp, (slope * (n.midi - (median.get(n.voice) ?? n.midi))) / 12));
    const pos = o.inBar(n.on);
    db += pos % o.beat === 0 ? DYN.metric.beat : pos % (o.beat / 2) === 0 || pos % (o.beat / 3) === 0 ? 0 : DYN.metric.sub;
    db += arc(n.on);
    const key = `${n.voice}:${n.on}`;
    if (h?.dissonance.has(key)) db += DYN.tension.dissonance;
    else if (h?.resolution.has(key)) db += DYN.tension.resolution;
    if (n.on > endFrom) db += (DYN.ending.db * Math.min(1, (n.on - endFrom) / (lastOn - endFrom))) || 0;
    out.set(`${n.voice}:${n.on}:${n.midi}`, DYN.limit * Math.tanh(db / DYN.limit));
  }
  return out;
}

export const dbToLevel = (db: number) => 10 ** (db / 20);
