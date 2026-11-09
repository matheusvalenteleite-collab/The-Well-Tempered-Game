/**
 * D540, the sounds' memory budget (BRIEF-BANDS2: "≤25 MB of decoded audio per preset, ≤40 MB resident in total (mid-range
 * iPhone 12/13)"): what each preset's recordings take once decoded, as the game loads them (chip.ts soundPlans, loadPlan:
 * Float32 at the context's 48 kHz, a plan's stereo sets folded to mono where it passes the phone's BUDGET, a slimmed set as
 * its Slim says), for its worst fugue and voice (every voice's pitches, the player's an octave either side). Resident: the
 * preset's own and the largest DRUMS kit with it (the game lets every other sound's go: soundPlans). Reported by
 * tools/playback/budget/report.ts and held by test/d540-budget.test.ts.
 */
import { openingOf, soundPlans } from "./chip.ts";
import { FUGUES, everyNote, fugueById } from "./fugue.ts";
import { BUDGET, decodedBytes, FETCH_MAX, monoFor, wireBytes, type Plan, type Wire } from "./sampled.ts";
import { preset, presetById, setPreset, BAND_SLIM, type Preset } from "./sound.ts";
import type { Slim } from "./sampled.ts";
import { styleIds } from "./drum-library.ts";

export const PRESET_MB = 25;
export const RESIDENT_MB = 40;
/** The context's rate on the phones measured (an iPhone's AudioContext: 48 kHz). */
export const BUDGET_RATE = 48000;
/** The DRUMS styles that load recordings (chip.ts kitFiles). */
// D526: every style of the drum library (its recordings by its engine: chip.ts drumFilesFor).
export const KIT_STYLES: readonly string[] = styleIds;

/** Bytes a set of plans holds as loadPlan would hold them on a phone. */
export function plansBytes(plans: Plan[], rate = BUDGET_RATE): number {
  return plans.reduce((t, plan) => t + decodedBytes(plan, rate, monoFor(plan, rate, BUDGET.phone)), 0);
}

export interface PresetBudget {
  id: string;
  name: string;
  /** The preset's own recordings, its worst piece (MB). */
  mb: number;
  piece: string;
  voice: number;
  /** Its own drums (with DRUMS off: the band's kit) within `mb`, and the largest DRUMS kit (MB). */
  ownDrumsMb: number;
  drumsOnMb: number;
  /** The preset's with the largest DRUMS kit: what stays decoded while it plays (MB). */
  residentMb: number;
}

const MB = 1e6;
/** One preset's budget over the 48 fugues (each voice the player's, the top and the bottom: the octave doubles at each end). */
export function presetBudget(id: string, pieces = FUGUES.map((f) => f.id), slim?: Slim): PresetBudget {
  const was = preset();
  // (`slim`: the preset as it would be held slimmed: what a slim version of it would save.)
  const p: Preset = presetById(id);
  setPreset(slim ? { ...p, slim } : p);
  try {
    let worst = { b: 0, piece: "", voice: 0, drums: 0 };
    for (const pid of pieces) {
      const f = fugueById(pid);
      const all = everyNote(f).map((n) => n[2]);
      for (const voice of [0, f.voices.length - 1]) {
        const lead = (f.voices[voice] ?? []).map((n) => n[2]);
        const plans = soundPlans(all, lead, null);
        const b = plansBytes(plans);
        if (b > worst.b) worst = { b, piece: pid, voice, drums: 0 };
      }
    }
    // (No pitches: the instruments' plans are empty, the drums' alone left.)
    worst.drums = plansBytes(soundPlans([], [], null));
    const kit = Math.max(0, ...KIT_STYLES.map((st) => plansBytes(soundPlans([], [], st))));
    return { id, name: presetById(id).name, mb: worst.b / MB, piece: worst.piece, voice: worst.voice, ownDrumsMb: worst.drums / MB, drumsOnMb: kit / MB, residentMb: (worst.b - worst.drums + Math.max(kit, worst.drums)) / MB };
  } finally {
    setPreset(was);
  }
}

/** Why a preset's budget fails (null: within it). */
export function overBudget(b: PresetBudget): string | null {
  if (b.mb > PRESET_MB) return `${b.id}: ${b.mb.toFixed(1)} MB decoded (${b.piece} v${b.voice}) over ${PRESET_MB} MB`;
  if (b.residentMb > RESIDENT_MB) return `${b.id}: ${b.residentMb.toFixed(1)} MB resident with the DRUMS kit over ${RESIDENT_MB} MB`;
  return null;
}

/** D540: a preset's MB now and slimmed (BAND_SLIM: 24 kHz mono, plucked notes 3 s, every third semitone, one layer). */
export function slimSaving(id: string, slim: Slim = BAND_SLIM): { now: PresetBudget; slim: PresetBudget } {
  return { now: presetBudget(id), slim: presetBudget(id, undefined, slim) };
}

/**
 * D542, the wire: what a preset's worst fugue fetches (each file in a format: Opus, AAC, the MP3), all of it and the opening's
 * zones (Plan `first`), and the time those take by a simple model of a line (`rtt` s a round of FETCH_MAX fetches, then the
 * bytes at `mbps`), for slow 4G (Lighthouse's: 150 ms, 1.6 Mbit/s) and a mid 4G (85 ms, 9 Mbit/s). Measured in a browser
 * by tools/playback/cpu/load-cost.mjs; this is the test's reported estimate.
 */
export const LINES = { slow4g: { rtt: 0.15, mbps: 1.6 }, mid4g: { rtt: 0.085, mbps: 9 } } as const;
export interface WireBudget {
  id: string;
  files: number;
  firstFiles: number;
  /** MB on the wire, all and the opening, by format. */
  mb: Record<Wire, number>;
  firstMb: Record<Wire, number>;
  /** Seconds to the opening's zones and to all, by line (the format this browser would take: `w`). */
  firstS: Record<keyof typeof LINES, number>;
  allS: Record<keyof typeof LINES, number>;
}
const lineS = (files: number, bytes: number, l: { rtt: number; mbps: number }) => Math.ceil(files / FETCH_MAX) * l.rtt + (bytes * 8) / (l.mbps * 1e6);
export function wireBudget(id: string, w: Wire = "m4a"): WireBudget {
  const b = presetBudget(id);
  const was = preset();
  setPreset(presetById(id));
  try {
    const f = fugueById(b.piece || "wtc1f01");
    const plans = soundPlans(everyNote(f).map((n) => n[2]), (f.voices[b.voice] ?? []).map((n) => n[2]), null, openingOf(f)).flat();
    const all = plans.flatMap((e) => e.notes.map((m) => [e.set, m] as const));
    const first = plans.flatMap((e) => (e.first ?? []).map((m) => [e.set, m] as const));
    const sum = (xs: readonly (readonly [string, number])[], ww: Wire) => xs.reduce((t, [s, m]) => t + wireBytes(s, m, ww), 0) / 1e6;
    const fmt = (xs: readonly (readonly [string, number])[]) => ({ webm: sum(xs, "webm"), m4a: sum(xs, "m4a"), mp3: sum(xs, "mp3") });
    const mb = fmt(all);
    const firstMb = fmt(first);
    const t = (n: number, x: number) => ({ slow4g: lineS(n, x * 1e6, LINES.slow4g), mid4g: lineS(n, x * 1e6, LINES.mid4g) });
    return { id, files: all.length, firstFiles: first.length, mb, firstMb, firstS: t(first.length, firstMb[w]), allS: t(all.length, mb[w]) };
  } finally {
    setPreset(was);
  }
}
