/**
 * D521, BOSSA NOVA'S DRUMS. The brief: "soft nylon guitar, brushed bossa pattern (rim click), upright bass, a flute or soft
 * sax voice; intimate", a drum track "scripted to the fugue's form, with rolls and fills into subject entries, quieter
 * episodes, a break before the final entry and a closing flourish", sitting where JAZZ QUARTET's brushes sit. Pure numbers
 * here (tested in test/d521-bossa.test.ts); chip.ts `bossaDrums` sounds them on the brush kit (sampled.ts BRUSH_FILES:
 * Karoryfer's Swirly Drums) with Big Rusty's cross-stick and bass drum (BOSSA_KIT_FILES).
 *
 * THE PATTERN, on the game's own beat and the score's own eighths (no tempo of the piece changes for it, Bach's notes never
 * move): the bossa bar is four written quarters (II/7 and II/13, 2/2 at a half of 62: the bossa's own cut time and tempo;
 * a 4/4 fugue's bar, two bars of a 2/4); a compound metre's beat its quarter, its eighths the beat's first and last third.
 *   - the BASS DRUM, felt-soft, "boom-ba boom-ba": the bossa bar's quarters 1 and 3 and the eighths before 3 and the next 1;
 *   - the CROSS-STICK (the rim click) on the bossa clave over two bossa bars: 1, 2-and, 4 | 2, 3-and (eighths 0, 3, 6 | 2, 5);
 *   - the BRUSH's taps on every eighth, the beat's own a little firmer (the right hand's swish), the hi-hat's FOOT on 2 and 4.
 * A triple metre (3/4, 3/8, 3/2, 9/8) the bossa waltz: the bass drum on 1 and the last eighth, the rim's two-bar figure
 * across the beats. Busoni's level (the voices' mean at the beat) shades it within ±4 dB (jazz-drums.ts dynGain), and in
 * his p (or an episode) it is the QUIET pattern: the stir in place of the taps, the bass drum on 1 and 3 only.
 *
 * THE FORM (bossaPlan, from form-points.ts alone: formOf's seams and the entries it reads):
 *   - a FILL into each subject entry after the first (one beat of a roll; two out of an episode), no two within MIN_GAP_BARS;
 *   - the EPISODES (the form's: form-points.ts formOf, D474, the stage's own) the quiet pattern;
 *   - a BREAK before the final entry: a bar with no drums at all, a single pick-up tap at its end, and the entry landed;
 *   - the CLOSING FLOURISH: a roll into the last chord (formOf's `last`), struck (bass drum, rim, the ride), then
 *     nothing (the band's last chord alone).
 * Never the score, the streak or the verdicts (D482).
 */
import type { TouchFugue } from "./fugue.ts";
import { formOf } from "./form-points.ts";
import { dynGain, type BrushSweep } from "./jazz-drums.ts";

export type BossaKind = "fill" | "break" | "final";
/** A scripted moment on the clock: from `from` (tick) to `at` (the downbeat or entry it leads into), what and why. */
export interface BossaMoment {
  kind: BossaKind;
  from: number;
  at: number;
  why: string;
}
export interface BossaPlan {
  moments: BossaMoment[];
  /** The episodes (ticks [from, to)): no subject entry sounding. */
  quiet: [number, number][];
  /** The bars' starts (ticks), for the bossa bar's place. */
  bars: number[];
  end: number;
}

/** No two fills within this many bars (the higher kind kept). */
export const MIN_GAP_BARS = 2;
/** An episode: at least this many bars with no entry sounding. */
export const EPISODE_BARS = 1;
/** Busoni's level (dB) at or under which the quiet pattern plays. */
export const QUIET_DB = -3;
/** The quiet pattern's level (a factor). */
export const QUIET_GAIN = 0.8;
/** The bossa bar's bass drum and cross-stick (eighths of four quarters; the rim over two bars). */
export const KICK_8THS: readonly (readonly [pos: number, vel: number])[] = [[0, 0.55], [3, 0.3], [4, 0.48], [7, 0.3]];
export const RIM_8THS: readonly (readonly number[])[] = [[0, 3, 6], [2, 5]];
/** The bossa waltz (by beat, `k` the beat's eighth): the bass drum, the rim's two bars. */
export const WALTZ_KICK: readonly (readonly [beat: number, k: number, vel: number])[] = [[0, 0, 0.55], [2, 1, 0.3]];
export const WALTZ_RIM: readonly (readonly (readonly [beat: number, k: number])[])[] = [[[1, 0], [2, 1]], [[0, 1], [2, 0]]];

const memo = new Map<string, BossaPlan>();

/**
 * The plan of a fugue on its clock (ticks: its beat `beat`, `per` beats a bar): the fills into the entries, the break
 * before the last, the final flourish, the episodes.
 */
export function bossaPlan(f: TouchFugue, beat: number, per: number): BossaPlan {
  const key = `${f.id}:${beat}:${per}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const bar = f.barTicks;
  const bars = f.bars.map((b) => b.on);
  const floorBeat = (t: number) => {
    const b0 = bars.filter((x) => x <= t).pop() ?? 0;
    return b0 + Math.floor((t - b0) / beat + 1e-6) * beat;
  };
  // The entries as form-points.ts reads them (the piece's own, D493), the one form source.
  const spans = [...f.entries].sort((a, b) => a.on - b.on);
  // The episodes: the form's (form-points.ts formOf, D474: the stage's scenes turn on the same bars), from the next beat.
  const form = formOf(f);
  const quiet: [number, number][] = form.seams.filter((x) => x.kind === "episode").map((x) => [floorBeat(x.on + beat - 1), x.end] as [number, number]).filter(([a, z]) => z > a);
  const moments: BossaMoment[] = [];
  // The final flourish: a roll into the last chord (the last attack in any voice, on its beat).
  const lastChord = floorBeat(form.last);
  const finalFrom = Math.max(0, lastChord - Math.min(per, 2) * beat);
  moments.push({ kind: "final", from: finalFrom, at: lastChord, why: "the closing flourish: a roll into the last chord, struck, then the band's chord alone" });
  // The break before the final entry (the form's final group's first: in a closing stretto, before it all), if it is not
  // in the last two bars (there the flourish speaks).
  const finalOn = form.seams.find((x) => x.kind === "final")?.on;
  const last = spans.find((x) => finalOn !== undefined && x.on >= finalOn) ?? spans[spans.length - 1];
  if (last && spans.length > 1) {
    const at = floorBeat(last.on);
    if (at < finalFrom - bar && at - bar > 0) moments.push({ kind: "break", from: at - bar, at, why: `the final entry (${last.form}, ${last.key}): a bar's break, then the entry landed` });
  }
  // A fill into each entry after the first, spaced; out of an episode a longer roll.
  for (const s of spans.slice(1).filter((x) => !last || x.on < last.on)) {
    const at = floorBeat(s.on);
    const afterEpisode = quiet.some(([, to]) => Math.abs(to - s.on) < beat);
    const n = Math.min(per, afterEpisode ? 2 : 1);
    const from = at - n * beat;
    if (from <= 0) continue;
    if (moments.some((m) => Math.abs(m.at - at) < MIN_GAP_BARS * bar || (from < m.at && at > m.from))) continue;
    moments.push({ kind: "fill", from, at, why: `the ${["soprano", "alto", "tenor", "bass", "fifth"][s.voice] ?? "voice"}'s entry (${s.form}, ${s.key})${afterEpisode ? " out of an episode: two beats' roll" : ""}` });
  }
  moments.sort((a, b) => a.at - b.at);
  const plan = { moments, quiet, bars, end: f.length };
  memo.set(key, plan);
  return plan;
}

/** A struck piece: the bass drum, the cross-stick, the brush's tap, the ride, the hi-hat's foot; `at` in beats from the beat. */
export interface BossaHit {
  piece: "kick" | "rim" | "tap" | "ride" | "foot";
  at: number;
  vel: number;
}
export interface BossaBeat {
  hits: BossaHit[];
  sweeps: BrushSweep[];
}

/** Eighths in a beat of `beat` ticks (quarter `tpq`): a half note's four, a quarter's (or a compound beat's) two, an eighth's one. */
export const eighthsPerBeat = (beat: number, tpq: number, compound: boolean) => (compound ? 2 : Math.max(1, Math.round((2 * beat) / tpq)));
/** Where the beat's eighth `k` of `n` falls (beats): evenly, or a compound beat's first and last third. */
const eighthAt = (k: number, n: number, compound: boolean) => (compound ? (k === 0 ? 0 : 2 / 3) : k / n);

/**
 * One beat of the bossa: beat `b` of a bar of `per` (`compound`: in threes), at tick `tick` (a beat of `beat` ticks, a
 * quarter `tpq`), the piece's plan, Busoni's level here (`dynDb`, 0 without a reading).
 */
export function bossaBeat(b: number, per: number, compound: boolean, tick: number, beat: number, tpq: number, plan: BossaPlan, dynDb = 0): BossaBeat {
  const hits: BossaHit[] = [];
  const sweeps: BrushSweep[] = [];
  const g = dynGain(dynDb);
  const half = beat / 2;
  const n8 = eighthsPerBeat(beat, tpq, compound);
  const at8 = (k: number) => eighthAt(k, n8, compound);
  const fin = plan.moments.find((m) => m.kind === "final");
  // After the last downbeat: nothing (the band's chord alone).
  if (fin && tick > fin.at + half) return { hits, sweeps };
  const land = plan.moments.find((m) => Math.abs(tick - m.at) < half);
  const roll = plan.moments.find((m) => tick >= m.from - half && tick < m.at - half);
  if (roll?.kind === "break") {
    // The break: silence, a single pick-up tap on the bar's last eighth.
    if (tick + beat >= roll.at - half) hits.push({ piece: "tap", at: at8(n8 - 1), vel: 0.4 * g });
    return { hits, sweeps };
  }
  if (roll) {
    // The roll: the flutter rising over its beats with sixteenths on the snare over it, the last two firmer.
    const n = Math.max(1, Math.round((roll.at - roll.from) / beat));
    const k = Math.max(0, Math.min(n - 1, Math.round((tick - roll.from) / beat)));
    const big = roll.kind === "final" ? 1.15 : 1;
    const lv = (x: number) => (0.2 + 0.4 * x) * big;
    sweeps.push({ piece: "flutter", at: 0, len: 1, from: lv(k / n) * g, peak: lv((k + 0.6) / n) * g, peakAt: 0.6, to: lv((k + 1) / n) * g, firm: k === n - 1 });
    const n16 = compound ? 3 : 2 * n8;
    for (let j = 0; j < n16; j++) {
      const x = (k + j / n16) / n;
      const lastTwo = k === n - 1 && j >= n16 - 2;
      hits.push({ piece: "tap", at: j / n16, vel: (lastTwo ? 0.55 : 0.18 + 0.3 * x) * big * g });
    }
    if (k === 0) hits.push({ piece: "kick", at: 0, vel: 0.35 * g });
    return { hits, sweeps };
  }
  // The pattern: the episode's (or Busoni's p) quiet one, else the full.
  const quiet = dynDb <= QUIET_DB || plan.quiet.some(([a, z]) => tick >= a && tick < z);
  const q = quiet ? QUIET_GAIN : 1;
  const barOn = plan.bars.filter((x) => x <= tick + 1e-6).pop() ?? 0;
  const barIdx = Math.max(0, plan.bars.indexOf(barOn));
  if (per === 3) {
    // The bossa waltz.
    const clave = barIdx % 2;
    for (const [bb, k, v] of WALTZ_KICK) if (bb === b && k < n8 && !(quiet && v < 0.4)) hits.push({ piece: "kick", at: at8(k), vel: v * q * g });
    for (const [bb, k] of WALTZ_RIM[clave]) if (bb === b && k < n8) hits.push({ piece: "rim", at: at8(k), vel: 0.5 * q * g });
    if (b === 1) hits.push({ piece: "foot", at: 0, vel: 0.32 * q * g });
  } else {
    // The bossa bar of eight eighths, over the beats (G: the eighth's place counted from bar 1 of the piece).
    const inBar = Math.round((tick - barOn) / (beat / n8));
    const perBar8 = per * n8;
    for (let k = 0; k < n8; k++) {
      const G = barIdx * perBar8 + inBar + k;
      const pos = ((G % 8) + 8) % 8;
      const clave = Math.floor(G / 8) % 2;
      const kick = KICK_8THS.find(([p]) => p === pos);
      if (kick && !(quiet && kick[1] < 0.4)) hits.push({ piece: "kick", at: at8(k), vel: kick[1] * q * g });
      if (RIM_8THS[clave].includes(pos)) hits.push({ piece: "rim", at: at8(k), vel: (pos === 0 ? 0.55 : 0.48) * q * g });
      if (pos === 2 || pos === 6) hits.push({ piece: "foot", at: at8(k), vel: 0.32 * q * g });
    }
  }
  if (quiet) sweeps.push({ piece: "stir", at: 0, len: 1, from: 0.25 * g, peak: 0.4 * g, peakAt: 0.35, to: 0.25 * g });
  else for (let k = 0; k < n8; k++) hits.push({ piece: "tap", at: at8(k), vel: (k === 0 ? 0.24 : 0.17) * g });
  if (land) {
    // The downbeat or entry a moment leads into: the bass drum, the rim and the ride struck together.
    const fv = land.kind === "final" ? 0.7 : 0.6;
    for (const h of hits) if (h.at === 0 && (h.piece === "kick" || h.piece === "rim")) h.vel = 0;
    hits.push({ piece: "kick", at: 0, vel: fv * g }, { piece: "rim", at: 0, vel: fv * g }, { piece: "ride", at: 0, vel: (fv - 0.05) * g });
    if (land.kind === "final") return { hits: hits.filter((h) => h.at === 0 && h.vel > 0 && h.piece !== "tap" && h.piece !== "foot"), sweeps: [] };
  }
  return { hits: hits.filter((h) => h.vel > 0), sweeps };
}
