/**
 * D524, PET SOUNDS' DRUMS. The owner: "orchestral plus electric, 1960s"; the brief: a drum track "scripted to the fugue's
 * form, with rolls and fills into subject entries, quieter episodes, a break before the final entry and a closing
 * flourish", sitting where JAZZ QUARTET's brushes sit; "Don't meddle with the MUSIC. Make the music shine": the timpani give
 * rhythm only. Pure numbers here (tested in test/d524-pet-sounds.test.ts); chip.ts `petDrums` sounds them on Big Rusty's kit
 * and Virtuosity's tambourine (sampled.ts PET_KIT_FILES) and VSCO's timpani (PET_TIMP_SETS).
 *
 * THE PATTERN, a Wrecking Crew ballad's on the game's own beat (no tempo of the piece changes for it, Bach's notes never
 * move): the bass drum on 1 and 3 (and softly on 2-and), the snare on the backbeat (2 and 4; 2/2 and 2/4 beat 2; a triple
 * metre 2 and 3, the third lighter), the tambourine on the eighths (the backbeat's firmer: the session's shaken tambourine),
 * and the TIMPANI on the bar's first beat, soft: one stroke, never a line, tuned to the note the bass is sounding there (the
 * drum nearest its pitch class, so the timpani add no pitch of their own: rhythm only). Busoni's level shades it within ±4 dB
 * (jazz-drums.ts dynGain); in his p (or an episode) the QUIET pattern: the bass drum on 1, the snare soft, no tambourine, no
 * timpani.
 *
 * THE FORM (petPlan: the game's subject marks, voice-mode.ts entrySpans, and D474's form, form-points.ts formOf):
 *   - a FILL into each subject entry after the first (one beat of a tom fill over a timpani roll, on the bass's note where
 *     the bass sounds; two beats out of an episode),
 *     no two within MIN_GAP_BARS, landed with the bass drum and the timpani;
 *   - the EPISODES (formOf's) the quiet pattern;
 *   - a BREAK before the final group's first entry: a bar with no drums, a single pick-up snare at its end;
 *   - the CLOSING FLOURISH: a timpani roll with the toms into the last chord, struck (bass drum, timpani, the crash), then
 *     the band's chord alone.
 * Never the score, the streak or the verdicts (D482).
 */
import type { TouchFugue } from "./fugue.ts";
import { entrySpans } from "./voice-mode.ts";
import { formOf } from "./form-points.ts";
import { dynGain } from "./jazz-drums.ts";

export type PetKind = "fill" | "break" | "final";
export interface PetMoment {
  kind: PetKind;
  from: number;
  at: number;
  why: string;
}
export interface PetPlan {
  moments: PetMoment[];
  quiet: [number, number][];
  /** The bass voice's notes (on, end, MIDI), for the timpani's tuning. */
  bass: [number, number, number][];
  end: number;
}
/** No two fills within this many bars. */
export const MIN_GAP_BARS = 2;
/** Busoni's level (dB) at or under which the quiet pattern plays. */
export const QUIET_DB = -3;
export const QUIET_GAIN = 0.8;
/** The timpani's drums (VSCO's: F2, B2, C#3, E3, G3) and the compass a stroke is tuned within. */
export const TIMP_MIDIS = [41, 47, 49, 52, 55] as const;
export const TIMP_LO = 41;

const memo = new Map<string, PetPlan>();

/** The plan of a fugue on its clock (ticks: its beat `beat`, `per` beats a bar). */
export function petPlan(f: TouchFugue, beat: number, per: number): PetPlan {
  const key = `${f.id}:${beat}:${per}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const bar = f.barTicks;
  const bars = f.bars.map((b) => b.on);
  const floorBeat = (t: number) => {
    const b0 = bars.filter((x) => x <= t).pop() ?? 0;
    return b0 + Math.floor((t - b0) / beat + 1e-6) * beat;
  };
  const spans = entrySpans(f)
    .filter((s) => s.form !== "counter")
    .sort((a, b) => a.on - b.on);
  const form = formOf(f);
  const quiet = form.seams
    .filter((x) => x.kind === "episode")
    .map((x) => [floorBeat(x.on + beat - 1), x.end] as [number, number])
    .filter(([a, z]) => z > a);
  const moments: PetMoment[] = [];
  const lastChord = floorBeat(form.last);
  const finalFrom = Math.max(0, lastChord - Math.min(per, 2) * beat);
  moments.push({ kind: "final", from: finalFrom, at: lastChord, why: "the closing flourish: a timpani roll with the toms into the last chord, struck, then the band's chord alone" });
  const finalOn = form.seams.find((x) => x.kind === "final")?.on;
  const last = spans.find((x) => finalOn !== undefined && x.on >= finalOn) ?? spans[spans.length - 1];
  if (last && spans.length > 1) {
    const at = floorBeat(last.on);
    if (at < finalFrom - bar && at - bar > 0) moments.push({ kind: "break", from: at - bar, at, why: `the final entry (${last.form}, ${last.key}): a bar's break, then the entry landed` });
  }
  for (const s of spans.slice(1).filter((x) => !last || x.on < last.on)) {
    const at = floorBeat(s.on);
    const afterEpisode = quiet.some(([, to]) => Math.abs(to - s.on) < beat);
    const n = Math.min(per, afterEpisode ? 2 : 1);
    const from = at - n * beat;
    if (from <= 0) continue;
    if (moments.some((m) => Math.abs(m.at - at) < MIN_GAP_BARS * bar || (from < m.at && at > m.from))) continue;
    moments.push({ kind: "fill", from, at, why: `the ${["soprano", "alto", "tenor", "bass", "fifth"][s.voice] ?? "voice"}'s entry (${s.form}, ${s.key})${afterEpisode ? " out of an episode: two beats' fill" : ""}` });
  }
  moments.sort((a, b) => a.at - b.at);
  const low = f.voices[f.voices.length - 1] ?? [];
  const plan: PetPlan = { moments, quiet, bass: low.map((n) => [n[0], n[0] + n[1], n[2]]), end: f.length };
  memo.set(key, plan);
  return plan;
}

/** The bass's note sounding at `tick` (the lowest, where it divides), or null: the timpani then rest. */
export function bassAt(plan: PetPlan, tick: number): number | null {
  let best: number | null = null;
  for (const n of plan.bass) {
    if (n[0] > tick) break;
    if (n[1] > tick && (best === null || n[2] < best)) best = n[2];
  }
  return best;
}
/** The timpani's stroke for a bass note: its pitch class within the drums' compass (F2-E3), never a pitch of its own. */
export const timpPitch = (bass: number) => TIMP_LO + ((((bass - TIMP_LO) % 12) + 12) % 12);

export interface PetHit {
  piece: "kick" | "snare" | "tomHigh" | "tomLow" | "crash" | "tamb" | "timp";
  at: number;
  vel: number;
  /** The timpani's pitch (MIDI). */
  midi?: number;
}

/**
 * One beat: beat `b` of a bar of `per` (`compound`: in threes), at tick `tick` (a beat of `beat` ticks), the piece's plan,
 * Busoni's level here (`dynDb`, 0 without a reading).
 */
export function petBeat(b: number, per: number, compound: boolean, tick: number, beat: number, plan: PetPlan, dynDb = 0): PetHit[] {
  const hits: PetHit[] = [];
  const g = dynGain(dynDb);
  const half = beat / 2;
  const subs = compound ? [0, 1 / 3, 2 / 3] : [0, 0.5];
  const fin = plan.moments.find((m) => m.kind === "final");
  if (fin && tick > fin.at + half) return hits;
  const bass = bassAt(plan, tick + 1);
  // A stroke only where the bass sounds, on its pitch class: never a pitch of the timpani's own.
  const timp = (vel: number, at = 0): PetHit => ({ piece: "timp", at, vel: bass === null ? 0 : vel, midi: timpPitch(bass ?? TIMP_LO) });
  const land = plan.moments.find((m) => Math.abs(tick - m.at) < half);
  const roll = plan.moments.find((m) => tick >= m.from - half && tick < m.at - half);
  if (roll?.kind === "break") {
    if (tick + beat >= roll.at - half) hits.push({ piece: "snare", at: subs[subs.length - 1], vel: 0.45 * g });
    return hits;
  }
  if (roll) {
    // The fill: sixteenths (a compound beat's sixths) down the toms, rising, over a timpani roll; the flourish fuller.
    const n = Math.max(1, Math.round((roll.at - roll.from) / beat));
    const k = Math.max(0, Math.min(n - 1, Math.round((tick - roll.from) / beat)));
    const big = roll.kind === "final" ? 1.2 : 1;
    const steps = compound ? 6 : 4;
    for (let j = 0; j < steps; j++) {
      const x = (k + j / steps) / n;
      const piece = x < 0.5 ? "tomHigh" : x < 0.85 ? "tomLow" : "snare";
      hits.push({ piece, at: j / steps, vel: (0.25 + 0.35 * x) * big * g });
      hits.push(timp((0.15 + 0.3 * x) * big * g, (j + 0.5) / steps));
    }
    return hits.filter((h) => h.vel > 0);
  }
  const quiet = dynDb <= QUIET_DB || plan.quiet.some(([a, z]) => tick >= a && tick < z);
  const q = quiet ? QUIET_GAIN : 1;
  const back = per === 3 ? b > 0 : per % 2 === 0 ? b % 2 === 1 : false;
  if (b === 0 || (!quiet && per === 4 && b === 2)) hits.push({ piece: "kick", at: 0, vel: (b === 0 ? 0.55 : 0.48) * q * g });
  if (!quiet && per === 4 && b === 1) hits.push({ piece: "kick", at: subs[subs.length - 1], vel: 0.28 * g });
  if (back) hits.push({ piece: "snare", at: 0, vel: (per === 3 && b === 2 ? 0.38 : 0.48) * (quiet ? 0.7 : 1) * g });
  if (!quiet) for (const s of subs) hits.push({ piece: "tamb", at: s, vel: (s === 0 ? (back ? 0.42 : 0.32) : 0.24) * g });
  if (!quiet && b === 0) hits.push(timp(0.32 * g));
  if (land) {
    const fv = land.kind === "final" ? 0.7 : 0.6;
    for (const h of hits) if (h.at === 0 && (h.piece === "kick" || h.piece === "timp")) h.vel = 0;
    hits.push({ piece: "kick", at: 0, vel: fv * g }, timp(fv * g));
    if (land.kind === "final") {
      hits.push({ piece: "crash", at: 0, vel: 0.45 * g });
      return hits.filter((h) => h.at === 0 && h.vel > 0 && h.piece !== "tamb" && h.piece !== "snare");
    }
  }
  return hits.filter((h) => h.vel > 0);
}
