/**
 * D540, the sounds' memory budget (BRIEF-BANDS2: "≤25 MB of decoded audio per preset, ≤40 MB resident in total (mid-range
 * iPhone 12/13)"): what each preset's recordings take once decoded, as the game loads them (chip.ts soundPlans, loadPlan:
 * Float32 at the context's 48 kHz, a plan's stereo sets folded to mono where it passes the phone's BUDGET, a slimmed set as
 * its Slim says), for its worst fugue and voice (every voice's pitches, the player's an octave either side). Resident: the
 * preset's own and the largest DRUMS kit with it (the game lets every other sound's go: soundPlans). Reported by
 * tools/playback/budget/report.ts and held by test/d540-budget.test.ts.
 */
import { soundPlans } from "./chip.ts";
import { FUGUES, everyNote, fugueById } from "./fugue.ts";
import { BUDGET, decodedBytes, monoFor, type Plan } from "./sampled.ts";
import { preset, presetById, setPreset, V2_SLIM, type Preset } from "./sound.ts";
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

/** D540: a preset's MB now and slimmed (V2_SLIM: 24 kHz mono, plucked notes 3 s, every third semitone, one layer). */
export function slimSaving(id: string, slim: Slim = V2_SLIM): { now: PresetBudget; slim: PresetBudget } {
  return { now: presetBudget(id), slim: presetBudget(id, undefined, slim) };
}
