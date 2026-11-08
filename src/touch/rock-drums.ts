/**
 * D523, ABBEY ROAD's drums, and D525, KRAUTROCK's: an acoustic kit (Karoryfer's Big Rusty Drums, CC0, already in
 * public/samples/drums/bigRusty: sampled.ts ROCK_KIT) on the game's own beat, scripted by the fugue's own form. Pure
 * numbers here (tested in test/d523-abbey-road.test.ts and test/d525-krautrock.test.ts); chip.ts `rockDrums` sounds them.
 *
 * THE FORM (formOf): the fugue's subject entries (f.entries, the experts', D493: the same entries the box's flags draw,
 * voice-mode.ts entrySpans), each landing on the beat it begins in; the EPISODES, every stretch of a bar or more where no
 * entry sounds (D474's form-points.ts, the stage's own); the FINAL ENTRY (the last begun) and the bar before it, the
 * BREAK; the FINAL CHORD (the last attack, form-points.ts `last`).
 * Never the score, the streak or the verdicts (D482); the beat and the tempo the game's (proto-game.ts: no tempo of the
 * piece changes for the drums; the final ritard and the fermatas followed, as the brushes follow them).
 *
 * ABBEY ROAD ("Beatles 1967-69 … acoustic drums": Ringo Starr's kit, the loose, deadened Ludwig of Abbey Road's
 * Studio Two): during the first entry alone, the hi-hat and the cross-stick only (the band not yet in); a tom FILL into
 * every later entry (Ringo's slow, tumbling fills: the snare, then down the toms, sixteenths in simple time, triplets in
 * compound), two beats long into an entry after an episode, one beat otherwise, a crash and the kick on the entry's beat;
 * entries in stretto (nearer than MIN_FILL_GAP_BARS) a crash only. The groove: the kick on the bar's strong beats, the
 * snare on the backbeat, the hi-hat in eighths (sixteenths under a slow beat: SIXTEENTHS_FROM_S); the EPISODES quieter
 * (the cross-stick for the snare, the hat lighter, the kick softer); Busoni's f busier (the kick's push before the
 * third beat, the hat opened on the last eighth of the bar), his p quieter; the BREAK: a bar of silence before the final
 * entry but for a two-note snare pick-up; the FLOURISH: a two-beat roll into the final chord, a crash, the kick and the
 * floor tom on it, then nothing (the cymbal rings out).
 *
 * KRAUTROCK ("motorik drums, hypnotic and constant … no rolls that break the trance, at most subtle fills"): Klaus
 * Dinger's motorik beat (Neu!, "Hallogallo"), the kick on 1, 3 and the and of 3, the snare on 2 and 4, the hi-hat in
 * even eighths, all the way through; under a slow beat (MOTORIK_DOUBLE_FROM_S: the fugue's quaver the drummer's
 * crotchet) the motorik bar fills two of the fugue's beats, at the fugue's own tempo. The form heard only in subtle
 * ways: an open hi-hat on the last eighth before an entry (a crash, soft, on one not in stretto); the EPISODES a
 * little quieter (DRIFT); the BREAK, a bar of the hi-hat alone before the final entry; the end, the crash and the kick
 * on the final chord, then nothing. No roll anywhere.
 */
import type { TouchFugue } from "./fugue.ts";
import { formOf as formPoints } from "./form-points.ts";
import { FILL_AFTER_FILL, fillBeats, fillSlice, nextVariant, rand, seedOf } from "./drum-fills.ts";
import { tempoOf } from "./tempi.ts";

export type RockStyle = "abbey" | "motorik";
/** The kit's pieces (Big Rusty Drums: sampled.ts ROCK_KIT, two strengths each). */
export type KitPiece = "kick" | "snare" | "rim" | "hat" | "openhat" | "crash" | "ride" | "tomHigh" | "tomLow";
/** A struck piece: `at` beats from the beat, `vel` 0-1. */
export interface KitHit {
  piece: KitPiece;
  at: number;
  vel: number;
  /** D535: a fill's stroke (into an entry: "roll"; into the final chord: "fill"), the ticks from it to the landing. */
  role?: "roll" | "fill" | "accent";
  dur?: number;
  /** D535: a flam's or a ruff's grace note. */
  grace?: boolean;
}

/** A moment of the form on the clock: a roll (or a pick-up) from `from` to `at` (ticks), what lands at `at`, and why. */
export interface RockMoment {
  kind: "fill" | "accent" | "break" | "final";
  from: number;
  at: number;
  why: string;
  /** D535: which of drum-fills.ts's rock fills (never the one before), for a fill or the final flourish. */
  variant?: number;
}
export interface RockForm {
  /** Ticks where the first entry ends (the band comes in with the second: ABBEY ROAD's hat and cross-stick before). */
  intro: number;
  moments: RockMoment[];
  /** The episodes [from, to) in ticks: no entry sounding for a bar or more. */
  episodes: [number, number][];
  /** The final chord's beat (tick): the drums stop on it. */
  finalAt: number;
}

/** No two fills nearer than this (bars): a later entry in stretto gets a crash only. */
export const MIN_FILL_GAP_BARS = 2;
/** A stretch with no entry this long or more (bars) is an episode. */
export const EPISODE_BARS = 1;
/** ABBEY ROAD: a beat this long (s) or longer plays the hi-hat in sixteenths, not eighths. */
export const SIXTEENTHS_FROM_S = 0.9;
/** KRAUTROCK: a beat this long (s) or longer is two of the motorik beat's crotchets (the fugue's quaver the drummer's beat). */
export const MOTORIK_DOUBLE_FROM_S = 0.6;
/** KRAUTROCK: the episodes this much quieter (a factor): the trance kept, the form only felt. */
export const DRIFT = 0.84;
/** ABBEY ROAD: the episodes this much quieter. */
export const EPISODE_SOFT = 0.72;
/** Busoni's level (dB, the voices' mean) from which the drums are busier (f), and under which quieter (p). */
export const BUSY_DB = 3;
export const QUIET_DB = -3;
/** The drums' level follows Busoni's at this share (dB per dB), within ±DYN_DB_MAX. */
export const DYN_SHARE = 0.5;
export const DYN_DB_MAX = 4;
/** The drums' level (a factor) at Busoni's level `dynDb`. */
export const dynGain = (dynDb: number) => 10 ** (Math.max(-DYN_DB_MAX, Math.min(DYN_DB_MAX, DYN_SHARE * dynDb)) / 20);

/** The tick bar `n` begins (Bach's numbering), and the bar a tick is in. */
function barOn(f: TouchFugue, n: number): number {
  const b = f.bars.find((x) => x.n === n);
  if (b) return b.on;
  const last = f.bars[f.bars.length - 1];
  return last ? last.on + (n - last.n) * f.barTicks : 0;
}
function barStartOf(f: TouchFugue, tick: number): number {
  let on = f.bars[0]?.on ?? 0;
  for (const b of f.bars) if (b.on <= tick) on = b.on;
  return on;
}
/** The beat a tick falls in (its tick), by the bar it is in. */
const beatOf = (f: TouchFugue, tick: number, beat: number) => {
  const b0 = barStartOf(f, tick);
  return b0 + Math.floor((tick - b0) / beat + 1e-6) * beat;
};

const memo = new Map<string, RockForm>();
/** The form of a fugue for the drums (`beat` ticks a beat): its entries' landings, episodes, break and final chord. */
export function formOf(f: TouchFugue, beat: number, style: RockStyle): RockForm {
  const key = `${f.id}:${beat}:${style}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const bar = f.barTicks;
  const entries = [...f.entries].sort((a, b) => a.on - b.on);
  // D474's form (form-points.ts: one source for the stage and the sound): its episodes (no entry sounding for a bar or
  // more) and its last chord (the last attack in any voice), so what is seen and what is heard turn on the same bars.
  const fp = formPoints(f);
  const finalAt = beatOf(f, fp.last, beat);
  const episodes: [number, number][] = fp.seams.filter((x) => x.kind === "episode" && x.end - x.on >= EPISODE_BARS * bar).map((x) => [x.on, x.end]);
  const moments: RockMoment[] = [];
  const first = entries[0];
  const intro = style === "abbey" && first ? beatOf(f, Math.min(first.end, entries[1]?.on ?? first.end), beat) : 0;
  const finalEntry = entries.length > 1 ? entries[entries.length - 1] : undefined;
  const finalLand = finalEntry ? beatOf(f, finalEntry.on, beat) : -1;
  let lastFill = -Infinity;
  // D535: the fills' phrasing and choice (drum-fills.ts): the tempo, the bar, the landing before, the fill before.
  const beatS = (beat / f.tpq) * (60 / tempoOf(f.id));
  const per = Math.max(1, Math.round(bar / beat));
  let prevLand = intro;
  let prevFilled = false;
  let prevVar = -1;
  entries.forEach((e, i) => {
    if (i === 0) return;
    const at = beatOf(f, e.on, beat);
    if (at <= 0 || at >= finalAt) return;
    const what = `the ${f.voiceNames[e.voice] ?? `voice ${e.voice + 1}`}'s ${e.form} in ${e.key} (bar ${e.bar})`;
    if (finalEntry && e === finalEntry) {
      // The break: the bar before the final entry (not into the entry before it), the drums out.
      const prev = beatOf(f, entries[i - 1].on, beat);
      const from = Math.max(at - bar, prev + beat);
      if (from < at) moments.push({ kind: "break", from, at, why: `the break before the final entry, ${what}` });
      lastFill = at;
      return;
    }
    const afterEpisode = episodes.some(([, to]) => Math.abs(to - e.on) < bar);
    if (at - lastFill < MIN_FILL_GAP_BARS * bar) {
      moments.push({ kind: "accent", from: at, at, why: `${what}, in stretto: a crash only` });
      prevLand = at;
      return;
    }
    // D535: not every entry: after a fill the next is left to its crash more often than not (seeded: the same each time).
    const seed = seedOf(at, 17);
    if (prevFilled && rand(seed, 2) >= FILL_AFTER_FILL) {
      moments.push({ kind: "accent", from: at, at, why: `${what}: a crash only (the fill before it enough)` });
      prevFilled = false;
      prevLand = at;
      return;
    }
    // Its length by the phrase it ends (the bars since the landing before: 1, 2 or 4) and the tempo, two beats at least
    // after an episode; never the fill before it.
    const room = Math.max(1, Math.floor((at - prevLand) / beat + 1e-6) - 1);
    const beats = Math.max(afterEpisode ? Math.min(2, room) : 1, fillBeats((at - prevLand) / bar, beatS, per, room));
    const variant = nextVariant("rock", prevVar, seed);
    moments.push({ kind: "fill", from: Math.max(0, at - beats * beat), at, why: `${afterEpisode ? "after the episode, " : ""}${what}`, variant });
    prevVar = variant;
    prevFilled = true;
    prevLand = at;
    lastFill = at;
  });
  if (finalLand !== finalAt) moments.push({ kind: "final", from: Math.max(0, finalAt - 2 * beat), at: finalAt, why: "the final chord: the closing flourish", variant: nextVariant("rock", prevVar, seedOf(finalAt, 17)) });
  const out: RockForm = { intro, moments: moments.sort((a, b) => a.at - b.at), episodes, finalAt };
  memo.set(key, out);
  return out;
}

const within = (spans: readonly [number, number][], tick: number) => spans.some(([a, b]) => tick >= a && tick < b);

/**
 * One beat of the drums: style, beat `b` of a bar of `per` (`compound`: the beat in threes), at tick `tick` (a beat of
 * `beat` ticks, `beatS` seconds as it sounds), the fugue's form, Busoni's level here (`dynDb`).
 */
export function rockBeat(style: RockStyle, b: number, per: number, compound: boolean, tick: number, beat: number, beatS: number, form: RockForm, dynDb = 0): KitHit[] {
  const g = dynGain(dynDb);
  const half = beat / 2;
  const out: KitHit[] = [];
  const hit = (piece: KitPiece, at: number, vel: number) => out.push({ piece, at, vel: Math.min(1, vel * g) });
  // After the final chord: nothing (the cymbal rings out).
  if (tick > form.finalAt + half) return out;
  const fin = form.moments.find((m) => m.kind === "final" && Math.abs(tick - m.at) < half) ?? (Math.abs(tick - form.finalAt) < half ? { kind: "final" as const, from: form.finalAt, at: form.finalAt, why: "" } : undefined);
  if (fin) {
    hit("crash", 0, 0.9);
    hit("kick", 0, 0.9);
    if (style === "abbey") hit("tomLow", 0, 0.7);
    return out;
  }
  const brk = form.moments.find((m) => m.kind === "break" && tick >= m.from - half && tick < m.at - half);
  const roll = form.moments.find((m) => (m.kind === "fill" || m.kind === "final") && tick >= m.from - half && tick < m.at - half);
  const land = form.moments.find((m) => m.kind !== "final" && Math.abs(tick - m.at) < half);
  const episode = within(form.episodes, tick);
  const busy = dynDb >= BUSY_DB && !episode;
  const quiet = dynDb <= QUIET_DB;
  return style === "abbey" ? abbey(b, per, compound, tick, beat, beatS, form, { brk, roll, land, episode, busy, quiet }, hit, out) : motorik(b, per, compound, beat, beatS, { brk, roll, land, episode, quiet }, hit, out, form, tick);
}

type Hit = (piece: KitPiece, at: number, vel: number) => void;
interface Cx {
  brk?: RockMoment;
  roll?: RockMoment;
  land?: RockMoment;
  episode: boolean;
  busy?: boolean;
  quiet: boolean;
}

/** The backbeat's beats of a bar of `per` (4: 2 and 4; 3: 2 and 3; 2: 2; 1: none): jazz-drums.ts's, the snare's. */
export function backbeats(per: number): number[] {
  if (per <= 1) return [];
  if (per === 3) return [1, 2];
  return Array.from({ length: per }, (_, b) => b).filter((b) => b % 2 === 1);
}
/** The hi-hat's strokes within a beat (beats): thirds in compound time, eighths, or sixteenths under a slow beat. */
const strokes = (compound: boolean, beatS: number, sixteenthsFrom: number): number[] => (compound ? [0, 1 / 3, 2 / 3] : beatS >= sixteenthsFrom ? [0, 0.25, 0.5, 0.75] : [0, 0.5]);

function abbey(b: number, per: number, compound: boolean, tick: number, beat: number, beatS: number, form: RockForm, c: Cx, hit: Hit, out: KitHit[]): KitHit[] {
  const sub = strokes(compound, beatS, SIXTEENTHS_FROM_S);
  if (c.brk) {
    // The break: silence, but for a two-note snare pick-up on the last beat's end.
    const n = Math.max(1, Math.round((c.brk.at - c.brk.from) / beat));
    const k = Math.round((tick - c.brk.from) / beat);
    if (k === n - 1) (hit("snare", compound ? 1 / 3 : 0.5, 0.45), hit("snare", compound ? 2 / 3 : 0.75, 0.6));
    return out;
  }
  if (c.roll) {
    // D535: the fill: Ringo's tumble (drum-fills.ts's rock fills: down the toms, the kick under them, flams and ruffs, the
    // hands uneven, a little off the grid), rising to the crash on the entry; never the same fill twice running.
    const r = c.roll;
    const beats = Math.max(1, Math.round((r.at - r.from) / beat));
    const role = r.kind === "final" ? ("fill" as const) : ("roll" as const);
    const spec = { feel: "rock" as const, variant: r.variant ?? 0, beats, beatS, compound, lo: 0.42, hi: 0.9, seed: seedOf(r.at, 17) };
    for (const h of fillSlice(spec, r.from, beat, tick, r.at)) {
      const before = out.length;
      hit(h.piece as KitPiece, h.t, h.vel);
      if (out.length > before) Object.assign(out[out.length - 1], { role, dur: Math.max(0, r.at - (tick + h.t * beat)) }, h.grace ? { grace: true } : {});
    }
    return out;
  }
  if (tick < form.intro) {
    // The first entry alone: the hi-hat and the cross-stick on the backbeat, the band not yet in.
    for (const at of sub) hit("hat", at, at === 0 ? 0.4 : 0.26);
    if (backbeats(per).includes(b)) hit("rim", 0, 0.5);
    return out;
  }
  const soft = c.episode ? EPISODE_SOFT : c.quiet ? 0.85 : 1;
  if (c.land) {
    hit("crash", 0, c.land.kind === "fill" ? 0.85 : 0.6);
    hit("kick", 0, 0.85);
  } else if (b === 0) hit("kick", 0, 0.85 * soft);
  else if (per >= 4 && b === per / 2) hit("kick", 0, 0.72 * soft);
  // The push into the third beat in f (the kick's eighth before it).
  if (c.busy && per >= 4 && b === per / 2 - 1) hit("kick", compound ? 2 / 3 : 0.5, 0.5);
  if (backbeats(per).includes(b) && !(c.land && b === 0)) hit(c.episode ? "rim" : "snare", 0, (c.episode ? 0.62 : per === 3 && b === 2 ? 0.6 : 0.8) * (c.quiet && !c.episode ? 0.85 : 1));
  sub.forEach((at, j) => {
    if (c.land && at === 0) return;
    const open = c.busy && b === per - 1 && j === sub.length - 1;
    hit(open ? "openhat" : "hat", at, (j === 0 ? 0.55 : j % 2 ? 0.34 : 0.44) * soft);
  });
  return out;
}

function motorik(b: number, per: number, compound: boolean, beat: number, beatS: number, c: Cx, hit: Hit, out: KitHit[], form: RockForm, tick: number): KitHit[] {
  const dbl = !compound && beatS >= MOTORIK_DOUBLE_FROM_S;
  const sub = compound ? [0, 1 / 3, 2 / 3] : dbl ? [0, 0.25, 0.5, 0.75] : [0, 0.5];
  const soft = c.episode ? DRIFT : c.quiet ? 0.9 : 1;
  // An entry next: the open hi-hat on the last eighth before it (no roll).
  const next = form.moments.find((m) => (m.kind === "fill" || m.kind === "accent") && m.at > tick && m.at - tick <= beat + 1e-6);
  sub.forEach((at, j) => {
    const last = j === sub.length - 1;
    const open = !!next && last && Math.abs(tick + beat - next.at) < beat / 2;
    if (c.land && at === 0 && c.land.kind === "fill") return;
    hit(open ? "openhat" : "hat", at, (j % 2 === 0 ? 0.5 : 0.36) * soft);
  });
  if (c.land && c.land.kind === "fill") hit("crash", 0, 0.42);
  // The break: the hi-hat alone.
  if (c.brk) return out;
  if (dbl) {
    // The motorik bar over two of the fugue's beats: 1 and the kick, 2 the snare (beat's half); 3 the kick and its "and", 4 the snare.
    const second = b % 2 === 1;
    hit("kick", 0, 0.8 * soft);
    if (second) hit("kick", 0.25, 0.6 * soft);
    hit("snare", 0.5, 0.7 * soft);
  } else {
    // The motorik bar on the fugue's beats: the kick on the odd beats (and the "and" of 3), the snare on the even.
    const even = b % 2 === 0;
    if (even) hit("kick", 0, 0.8 * soft);
    else hit("snare", 0, 0.7 * soft);
    if (even && b === 2) hit("kick", compound ? 2 / 3 : 0.5, 0.6 * soft);
    if (per % 2 === 1 && b === per - 1 && even) hit("snare", compound ? 2 / 3 : 0.5, 0.5 * soft);
  }
  return out;
}

/** For the decision row and the tests: a fugue's moments as bars and beats. */
export function momentsAsBars(f: TouchFugue, beat: number, style: RockStyle): { bar: number; beat: number; kind: RockMoment["kind"]; why: string }[] {
  const form = formOf(f, beat, style);
  return form.moments.map((m) => {
    const b0 = barStartOf(f, m.at);
    const n = f.bars.find((x) => x.on === b0)?.n ?? 1;
    return { bar: n, beat: Math.round((m.at - b0) / beat), kind: m.kind, why: m.why };
  });
}
export { barOn };
