/**
 * D520 SALSA's and D522 CHORINHO's percussion: pure numbers here (tested in test/d520-salsa.test.ts and
 * test/d522-chorinho.test.ts); chip.ts `latin` sounds them on VCSL's recordings (sampled.ts LATIN_FILES). As D503's
 * brushes: on the game's own beat (proto-game.ts passes the tick, the piece's plan and Busoni's level), never moving
 * Bach's notes, no tempo of the piece changed for them, never the score, the streak or the verdicts (D482).
 *
 * THE PULSE, from the fugue's own writing (`latinPlan`): a compound metre's beat in three; a simple metre's beat in
 * the triplets it is written in where they are a fifth of its onsets or more (II/10's quaver triplets: the 6/8 of the
 * Afro-Cuban bell over 2/2), else in semiquavers (quavers where a semiquaver would pass under 0.12 s, demisemiquavers
 * where it would last over 0.3 s). The patterns turn over a cycle of 16 pulses (two bars of the son's 2-3 clave; two of
 * samba's 2/4) or 12 (the 6/8 bell, the 3/4 bar), counted from bar 1's downbeat.
 *
 * THE FORM, through `entrySpans` (voice-mode.ts): where a subject or answer sounds the band plays FULL (salsa's bells:
 * the bongocero on the bongo bell, the timbalero on the timbal bell, the congas firmer; chorinho's tamborim and agogo
 * over the pandeiro and the surdo open), in the episodes QUIETER (salsa's cascara on the timbal's shell, the bongos'
 * martillo, the congas soft; chorinho's pandeiro and ganza, the surdo muted), the band's level about 3 dB under.
 * MOMENTS (LATIN_SCRIPTS for the fugues that open on the sound, else `latinMoments`, read from the same entries): a
 * FILL into an entry after an episode or a perfect cadence (salsa's timbal fill, macho and hembra rising to a rimshot;
 * chorinho's pandeiro roll with the tamborim's virada), a LIFT of one beat into an entry that answers while another
 * still sounds (the bongos' or the tamborim's lick), a BREAK before the final entry (everyone out for a beat, the entry
 * landed together), and the FINAL flourish (a fill over the last beats, the last chord struck by all, then silence).
 */
import type { TouchFugue } from "./fugue.ts";
import { entrySpans } from "./voice-mode.ts";
import { TEMPO } from "./tempi.ts";

export type LatinBand = "salsa" | "chorinho";
/** The kit's pieces (sampled.ts LATIN_FILES files each). */
export type LatinPiece =
  | "conga" | "slap" | "tumba" | "bongoHi" | "bongoMute" | "bongoLo" | "bell" | "bellLow" | "timbalBell" | "clave" | "hembra" | "macho" | "rimshot" | "cascara"
  | "pandJingle" | "pandHit" | "pandBass" | "pandSlap" | "surdo" | "tamborim" | "agogoHi" | "agogoLo" | "ganza";

/** The presets that play these drums, and which band's. */
export const LATIN_SOUNDS: Readonly<Record<string, LatinBand>> = { salsa: "salsa" };

export type LatinKind = "fill" | "lift" | "break" | "final";
/** A scripted moment: the bar (Bach's numbering) and the beat of it (a fraction allowed: an upbeat entry) it leads into. */
export interface LatinMoment {
  bar: number;
  beat?: number;
  kind: LatinKind;
  /** The beats before it the roll (or the break) takes: a fill FILL_BEATS, a lift and a break 1, the final FINAL_BEATS. */
  beats?: number;
  why: string;
}
/** A moment on the clock (ticks): from `from` into `at`. */
export interface LatinFill {
  kind: LatinKind;
  from: number;
  at: number;
  why: string;
}
/** What the drummers know of a piece: its pulse and cycle, its bar 1, its entries' spans, its moments, its end. */
export interface LatinPlan {
  id: string;
  pulse: number;
  cycle: 12 | 16;
  ternary: boolean;
  bar1: number;
  entries: readonly [on: number, end: number][];
  fills: readonly LatinFill[];
  end: number;
}

/** A fill's beats when a moment does not say; the final's; the generic rule's spacing (beats). */
export const FILL_BEATS = 2;
export const FINAL_BEATS = 2;
export const MIN_GAP_BEATS = 6;
/** A triplet pulse where this share of the onsets falls on the beat's thirds and not its halves. */
export const TERNARY_SHARE = 0.2;
/** The episodes' level against the entries' (dB). */
export const EPISODE_DB = -3;
/** Busoni's level reaches the drums at this share, within ±DYN_DB_MAX (as the brushes: jazz-drums.ts). */
export const DYN_SHARE = 0.5;
export const DYN_DB_MAX = 4;
export const dynGain = (dynDb: number) => 10 ** (Math.max(-DYN_DB_MAX, Math.min(DYN_DB_MAX, DYN_SHARE * dynDb)) / 20);

const barOn = (f: TouchFugue, n: number): number => {
  const b = f.bars.find((x) => x.n === n);
  if (b) return b.on;
  const first = f.bars[0];
  return first ? first.on + (n - first.n) * f.barTicks : 0;
};

/**
 * D520/D522: the scripts of the fugues that open on the two bands (piece-sound.ts), read from their entries
 * (data/touch/pieces.json), the game's sections and cadences: a fill into each entry after an episode, a lift into
 * an answer over a sounding subject, the break before the last entry, the final.
 */
export const LATIN_SCRIPTS: Readonly<Record<string, readonly LatinMoment[]>> = {
  // II/10 in E minor, 2/2 (two minims a bar) in quaver triplets: the subject's entries all on the bar's last third of a
  // minim (beat 1 and two thirds); the exposition to 19, the episodes 19-23, 36-41, 56-59, 66-71.
  wtc2f10: [
    { bar: 6, beat: 5 / 3, kind: "lift", why: "the alto's answer in B minor while the soprano's subject ends: the bongos bring it in" },
    { bar: 12, beat: 5 / 3, kind: "lift", why: "the bass's subject, the exposition's last entry: the congas' lick on the tumba" },
    { bar: 23, beat: 5 / 3, kind: "fill", why: "the soprano's subject after the first episode (19-23): the timbales' fill, the bells back" },
    { bar: 29, beat: 5 / 3, kind: "lift", why: "the alto's subject over the cadence in D (bar 30)" },
    { bar: 41, beat: 5 / 3, kind: "fill", why: "the bass's answer in B minor after the long episode (36-41)" },
    { bar: 49, beat: 5 / 3, kind: "fill", why: "the alto's subject in E minor, toward the perfect cadence of bar 55" },
    { bar: 59, beat: 5 / 3, kind: "fill", why: "the soprano's subject in A minor after the episode 56-59" },
    { bar: 71, beat: 5 / 3, kind: "break", why: "the last entry, the bass's subject in E minor: the band stops for a beat and lands it together" },
    { bar: 86, kind: "final", why: "the final cadence in E minor: the timbales' fill and the last chord struck by all" },
  ],
};

/** The subject's entries (and answers) as spans, through entrySpans (the countersubjects left out). */
export function entriesOf(f: TouchFugue): [number, number][] {
  return entrySpans(f)
    .filter((s) => s.form !== "counter")
    .map((s) => [s.on, s.end] as [number, number])
    .sort((a, b) => a[0] - b[0]);
}

/**
 * GENERIC: any fugue's moments, from its entries (`entriesOf`): into each entry after the first, a FILL where nothing
 * of the subject sounded in the beat before (an episode ended), else a LIFT; the last entry a BREAK; a perfect
 * cadence's downbeat (not the last) a FILL; the FINAL into the last bar. No two within MIN_GAP_BEATS beats (the
 * final, the break, then the fills, the lifts kept first).
 */
export function latinMoments(f: TouchFugue, beat: number): LatinMoment[] {
  const last = f.bars[f.bars.length - 1]?.n ?? 1;
  const ents = entriesOf(f);
  const cands: (LatinMoment & { pri: number; tick: number })[] = [{ bar: last, kind: "final", why: "the final cadence", pri: 0, tick: barOn(f, last) }];
  const at = (tick: number) => {
    let bar = f.bars[0]?.n ?? 1;
    for (const b of f.bars) if (b.on <= tick) bar = b.n;
    return { bar, beat: (tick - barOn(f, bar)) / beat };
  };
  const firstOn = ents[0]?.[0] ?? 0;
  ents.forEach(([on], i) => {
    if (on <= firstOn + beat / 2) return;
    const sounding = ents.some(([o, e], j) => j !== i && o < on && e > on - beat);
    const isLast = i === ents.length - 1 && on < barOn(f, last);
    const kind: LatinKind = isLast ? "break" : sounding ? "lift" : "fill";
    const p = at(on);
    cands.push({ bar: p.bar, ...(p.beat > 1e-6 ? { beat: p.beat } : {}), kind, why: isLast ? "the last entry: a break, landed together" : sounding ? "an entry over a sounding one" : "an entry after an episode", pri: isLast ? 1 : sounding ? 3 : 2, tick: on });
  });
  for (const c of f.cadences) if (c.kind === "perfect" && c.bar > 1 && c.bar < last) cands.push({ bar: c.bar, kind: "fill", why: `a perfect cadence in ${c.key}`, pri: 2, tick: barOn(f, c.bar) });
  cands.sort((a, b) => a.pri - b.pri || a.tick - b.tick);
  const kept: typeof cands = [];
  for (const c of cands) if (kept.every((k) => Math.abs(k.tick - c.tick) >= MIN_GAP_BEATS * beat)) kept.push(c);
  return kept.sort((a, b) => a.tick - b.tick).map(({ pri: _p, tick: _t, ...m }) => m);
}

/** The pulse (ticks) and whether it is ternary, for a fugue of `beat` ticks a beat (`compound`: in threes). */
export function pulseOf(f: TouchFugue, beat: number, compound: boolean): { pulse: number; ternary: boolean } {
  if (compound) return { pulse: beat / 3, ternary: true };
  const third = f.tpq / 3;
  let thirds = 0;
  let all = 0;
  for (const v of f.voices)
    for (const [on] of v) {
      all++;
      if (on % third === 0 && on % (f.tpq / 2) !== 0) thirds++;
    }
  if (all && thirds / all >= TERNARY_SHARE) return { pulse: third, ternary: true };
  const qpm = TEMPO[f.id]?.normal ?? 80;
  const semiS = 60 / qpm / 4;
  return { pulse: semiS < 0.12 ? f.tpq / 2 : semiS > 0.3 ? f.tpq / 8 : f.tpq / 4, ternary: false };
}

const plans = new Map<string, LatinPlan>();
/** A fugue's plan for the drummers (memoized by piece and beat). */
export function latinPlan(f: TouchFugue, beat: number, per: number): LatinPlan {
  const key = `${f.id}:${beat}:${per}`;
  const had = plans.get(key);
  if (had) return had;
  const den = Number(f.meter.split("/")[1]);
  const compound = beat !== f.tpq * (4 / den);
  const { pulse, ternary } = pulseOf(f, beat, compound);
  const barPulses = Math.round(f.barTicks / pulse);
  const cycle: 12 | 16 = ternary || (barPulses % 16 !== 0 && 16 % barPulses !== 0) ? 12 : 16;
  const moments = LATIN_SCRIPTS[f.id] ?? latinMoments(f, beat);
  const fills = moments.map((m) => {
    const at = barOn(f, m.bar) + (m.beat ?? 0) * beat;
    const beats = m.beats ?? (m.kind === "fill" ? FILL_BEATS : m.kind === "final" ? FINAL_BEATS : 1);
    return { kind: m.kind, from: Math.max(0, at - beats * beat), at, why: m.why };
  });
  const plan: LatinPlan = { id: f.id, pulse, cycle, ternary, bar1: barOn(f, 1), entries: entriesOf(f), fills, end: f.length };
  plans.set(key, plan);
  return plan;
}

/** A struck piece: `at` in beats from the beat, `vel` 0-1 (over LOUD_FROM the louder recording), `damp` s (a muted stroke). */
export interface LatinHit {
  piece: LatinPiece;
  at: number;
  vel: number;
  damp?: number;
}
/** The louder recording from this velocity. */
export const LOUD_FROM = 0.6;

type Row = readonly [piece: LatinPiece, pulses: readonly number[], vel: number, damp?: number];
/**
 * The grooves: per band, per cycle, the FULL (an entry sounding) and the QUIET (an episode) rows: each piece on its
 * pulses at its velocity (salsa's 2-3 son clave and the 6/8 bell; chorinho's samba in 2/4).
 */
export const GROOVES: Readonly<Record<LatinBand, Record<12 | 16, { full: readonly Row[]; quiet: readonly Row[] }>>> = {
  salsa: {
    16: {
      full: [
        ["clave", [2, 4, 8, 11, 14], 0.55],
        ["bellLow", [0, 8], 0.62],
        ["bell", [4, 12], 0.5],
        ["bell", [2, 6, 10, 14], 0.32],
        ["timbalBell", [0, 3, 6, 8, 10, 12, 14], 0.36],
        ["slap", [2, 10], 0.5],
        ["conga", [6, 14], 0.62],
        ["tumba", [7, 15], 0.62],
        ["slap", [0, 1, 3, 4, 5, 8, 9, 11, 12, 13], 0.14],
        ["hembra", [15], 0.3],
      ],
      quiet: [
        ["clave", [2, 4, 8, 11, 14], 0.45],
        ["cascara", [0, 2, 4, 6, 7, 8, 10, 11, 13, 15], 0.4],
        ["bongoMute", [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], 0.28],
        ["bongoHi", [3, 11], 0.4],
        ["bongoLo", [7, 15], 0.4],
        ["slap", [2, 10], 0.36],
        ["conga", [6, 14], 0.45],
        ["tumba", [15], 0.42],
        ["slap", [0, 1, 4, 5, 8, 9, 12, 13], 0.1],
      ],
    },
    12: {
      full: [
        ["clave", [0, 3, 7, 10], 0.5],
        ["timbalBell", [0, 2, 4, 5, 7, 9, 11], 0.42],
        ["bellLow", [0], 0.6],
        ["bell", [6], 0.5],
        ["bell", [3, 9], 0.3],
        ["slap", [3, 9], 0.48],
        ["conga", [4, 10], 0.6],
        ["tumba", [5, 11], 0.6],
        ["slap", [1, 2, 7, 8], 0.13],
        ["hembra", [11], 0.28],
      ],
      quiet: [
        ["clave", [0, 3, 7, 10], 0.42],
        ["cascara", [0, 2, 4, 5, 7, 9, 11], 0.4],
        ["bongoMute", [0, 1, 2, 3, 4, 6, 7, 8, 9, 10], 0.26],
        ["bongoHi", [5], 0.38],
        ["bongoLo", [11], 0.38],
        ["slap", [3, 9], 0.34],
        ["conga", [4, 10], 0.42],
        ["tumba", [11], 0.4],
      ],
    },
  },
  chorinho: {
    16: {
      full: [
        ["pandBass", [0, 8], 0.4, 0.12],
        ["pandBass", [4, 12], 0.62],
        ["pandJingle", [1, 5, 9, 13], 0.3],
        ["pandHit", [2, 6, 10, 14], 0.36],
        ["pandJingle", [3, 7, 11, 15], 0.46],
        ["pandSlap", [6, 14], 0.4],
        ["surdo", [0, 8], 0.35, 0.18],
        ["surdo", [4, 12], 0.62],
        ["tamborim", [0, 2, 5, 7, 10, 12, 14], 0.45],
        ["agogoLo", [0, 8], 0.4],
        ["agogoHi", [3, 6, 11, 14], 0.34],
      ],
      quiet: [
        ["pandBass", [0, 8], 0.34, 0.12],
        ["pandBass", [4, 12], 0.5],
        ["pandJingle", [1, 5, 9, 13], 0.24],
        ["pandHit", [2, 6, 10, 14], 0.28],
        ["pandJingle", [3, 7, 11, 15], 0.38],
        ["ganza", [0, 2, 4, 6, 8, 10, 12, 14], 0.3],
        ["ganza", [1, 3, 5, 7, 9, 11, 13, 15], 0.18],
        ["surdo", [4, 12], 0.42, 0.25],
      ],
    },
    12: {
      full: [
        ["pandBass", [0], 0.42, 0.12],
        ["pandBass", [6], 0.62],
        ["pandJingle", [1, 4, 7, 10], 0.3],
        ["pandHit", [2, 5, 8, 11], 0.38],
        ["pandSlap", [3, 9], 0.38],
        ["surdo", [0], 0.35, 0.18],
        ["surdo", [6], 0.62],
        ["tamborim", [0, 2, 4, 7, 9], 0.44],
        ["agogoLo", [0, 6], 0.4],
        ["agogoHi", [3, 9], 0.32],
      ],
      quiet: [
        ["pandBass", [0], 0.34, 0.12],
        ["pandBass", [6], 0.5],
        ["pandJingle", [1, 4, 7, 10], 0.24],
        ["pandHit", [2, 5, 8, 11], 0.3],
        ["ganza", [0, 3, 6, 9], 0.3],
        ["ganza", [1, 2, 4, 5, 7, 8, 10, 11], 0.16],
        ["surdo", [6], 0.42, 0.25],
      ],
    },
  },
};

const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Whether a subject or answer sounds at `tick`. */
export const inEntry = (plan: LatinPlan, tick: number) => plan.entries.some(([on, end]) => tick >= on && tick < end);

/** One pulse of a roll at `x` of its way (0-1), pulse `j` of it: salsa's timbales (macho and hembra, a rimshot to end), the
 * bongos' lick for a lift; chorinho's tamborim virada over the pandeiro's jingles, the surdo to end; a lift the tamborim. */
function rollHit(band: LatinBand, kind: LatinKind, x: number, j: number, last: boolean, g: number): LatinHit[] {
  const lift = kind === "lift";
  const vel = (lift ? 0.25 + 0.3 * x : 0.3 + 0.5 * x) * g;
  if (band === "salsa") {
    if (lift) return [{ piece: j % 2 ? "bongoLo" : "bongoHi", at: 0, vel }];
    return last ? [{ piece: "rimshot", at: 0, vel: 0.62 * g }] : [{ piece: j % 3 === 2 ? "hembra" : "macho", at: 0, vel }];
  }
  if (lift) return [{ piece: "tamborim", at: 0, vel }];
  return [{ piece: "tamborim", at: 0, vel }, { piece: j % 2 ? "pandJingle" : "pandHit", at: 0, vel: vel * 0.8 }, ...(last ? [{ piece: "surdo" as const, at: 0, vel: 0.5 * g }] : [])];
}

/** The landing on the downbeat or the entry a moment leads into: the band's strongest strokes together. */
function landing(band: LatinBand, kind: LatinKind, g: number): LatinHit[] {
  const v = (kind === "lift" ? 0.55 : 0.8) * g;
  const fin = kind === "final" ? [{ piece: (band === "salsa" ? "clave" : "pandHit") as LatinPiece, at: 0, vel: 0.7 * g }] : [];
  if (band === "salsa") return [{ piece: kind === "lift" ? "conga" : "rimshot", at: 0, vel: v }, { piece: "timbalBell", at: 0, vel: v }, { piece: "tumba", at: 0, vel: v * 0.9 }, ...fin];
  return [{ piece: "surdo", at: 0, vel: v }, { piece: "pandSlap", at: 0, vel: v * 0.9 }, { piece: "agogoLo", at: 0, vel: v * 0.8 }, ...fin];
}

/**
 * One beat of a band's percussion, at tick `tick` (the beat `beat` ticks), Busoni's level here (`dynDb`): its hits
 * (`at` in beats from the beat), pulse by pulse: past the final's landing nothing; in a break nothing; in a roll its
 * stroke; on a moment's tick the landing; else the groove, FULL under an entry, QUIET (EPISODE_DB) in an episode.
 */
export function latinBeat(band: LatinBand, plan: LatinPlan, tick: number, beat: number, dynDb = 0): LatinHit[] {
  const g = dynGain(dynDb);
  const sub = Math.max(1, Math.round(beat / plan.pulse));
  const q = plan.pulse / 2;
  const out: LatinHit[] = [];
  const fin = plan.fills.find((x) => x.kind === "final");
  for (let j = 0; j < sub; j++) {
    const t = tick + j * plan.pulse;
    const at = j / sub;
    const put = (hs: LatinHit[], when = at) => out.push(...hs.map((h) => ({ ...h, at: when })));
    if (fin && t >= fin.at + q) break;
    const land = plan.fills.find((x) => Math.abs(t - x.at) < q);
    if (land) {
      put(landing(band, land.kind, g), (land.at - tick) / beat);
      if (land.kind === "final") break;
    }
    if (plan.fills.some((x) => x.kind === "break" && t >= x.from - q && t < x.at - q)) continue;
    const r = plan.fills.find((x) => x.kind !== "break" && t >= x.from - q && t < x.at - q);
    if (r) {
      const steps = Math.max(1, Math.round((r.at - r.from) / plan.pulse));
      const i = Math.round((t - r.from) / plan.pulse);
      put(rollHit(band, r.kind, i / steps, i, i === steps - 1, g));
      continue;
    }
    const full = inEntry(plan, t);
    const p = mod(Math.round((t - plan.bar1) / plan.pulse), plan.cycle);
    const k = (full ? 1 : 10 ** (EPISODE_DB / 20)) * g;
    for (const [piece, pulses, vel, damp] of GROOVES[band][plan.cycle][full ? "full" : "quiet"]) {
      if (!pulses.includes(p) || (land && (piece === "tumba" || piece === "surdo" || piece === "timbalBell"))) continue;
      out.push({ piece, at, vel: vel * k, ...(damp ? { damp } : {}) });
    }
  }
  return out;
}
