import { harmonic, interval, isAbove } from "./interval.ts";
import type { Violation } from "./rules/types.ts";
import type { Staff } from "../music/fux/types.ts";
import { parsePitch } from "../music/pitch.ts";
import { slotLayout, type Slot } from "./layout.ts";
import { fifthIsDiminished } from "./rules/second-species.ts";

const STEPS = ["C", "D", "E", "F", "G", "A", "B"];
const SUFFIX: Record<number, string> = { [-1]: "b", 0: "", 1: "#" };

/** The note the cadence requires: a major sixth above (cantus below) or a minor third below (cantus above) the penultimate cantus note. */
export function cadenceNote(cantus: string[], cantusVoice: "upper" | "lower"): string {
  const pen = parsePitch(cantus[cantus.length - 2]);
  const steps = cantusVoice === "lower" ? 5 : -2;
  const d = pen.diatonic + steps;
  const want = cantusVoice === "lower" ? "M6" : "m3";
  for (const alter of [0, 1, -1]) {
    const name = `${STEPS[((d % 7) + 7) % 7]}${SUFFIX[alter]}${Math.floor(d / 7)}`;
    if (interval(pen.name, name).name === want) return name;
  }
  throw new Error(`no cadence note for ${pen.name}`);
}


const shiftOctaves = (pitch: string, k: number) => {
  const p = parsePitch(pitch);
  return pitch.slice(0, pitch.length - String(p.octave).length) + (p.octave + k);
};

/** Among octave transpositions of `target`, the one nearest `near` that stays on the counterpoint's side. */
function nearestOctave(target: string, near: string, cantusNote: string, cantusVoice: Staff): string {
  let best = target;
  let dist = Infinity;
  for (let k = -3; k <= 3; k++) {
    const cand = shiftOctaves(target, k);
    const sideOk = cantusVoice === "lower" ? !isAbove(cantusNote, cand) : !isAbove(cand, cantusNote);
    const d = Math.abs(parsePitch(cand).midi - parsePitch(near).midi);
    if (sideOk && d < dist) {
      best = cand;
      dist = d;
    }
  }
  return best;
}

/** The note a fifth (or, where that fifth is mi contra fa, a sixth) from `cf` on the counterpoint's side. */
export function cadenceFifth(cf: string, cantusVoice: Staff): string {
  const p = parsePitch(cf);
  const sixth = fifthIsDiminished(cf, cantusVoice);
  const steps = (sixth ? 5 : 4) * (cantusVoice === "lower" ? 1 : -1);
  const d = p.diatonic + steps;
  const natural = `${STEPS[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`;
  if (sixth) return natural;
  for (const alter of [0, -1, 1]) {
    const name = `${natural[0]}${SUFFIX[alter]}${natural.slice(1)}`;
    if (interval(cf, name).name === "P5") return name;
  }
  throw new Error(`no fifth for ${cf}`);
}

/** A corrected counterpoint for the violations that have one obvious fix (the cadence), else null. */
export function correctionFor(v: Violation, cantus: string[], cp: (string | null)[], cantusVoice: Staff, layout: Slot[] = slotLayout("first", cantus.length)): (string | null)[] | null {
  if (v.ruleId === "ss.cadence") {
    const bar = cantus.length - 2;
    const down = layout.findIndex((s) => s.bar === bar && s.beat === 0);
    const up = layout.findIndex((s) => s.bar === bar && s.beat === 1);
    const fixed = [...cp];
    if (v.positions.includes(down)) fixed[down] = nearestOctave(cadenceFifth(cantus[bar], cantusVoice), cp[down]!, cantus[bar], cantusVoice);
    if (v.positions.includes(up)) fixed[up] = nearestOctave(cadenceNote(cantus, cantusVoice), cp[up]!, cantus[bar], cantusVoice);
    return fixed;
  }
  if (v.ruleId !== "fs.cadence") return null;
  const k = cantus.length - 2;
  const fixed = [...cp];
  const pen = harmonic(cantus[k], cp[k]!);
  const wantPen = cantusVoice === "lower" ? "M6" : "m3";
  if (`${pen.quality}${pen.simple}` !== wantPen) fixed[k] = nearestOctave(cadenceNote(cantus, cantusVoice), cp[k]!, cantus[k], cantusVoice);
  const fin = harmonic(cantus[k + 1], fixed[k + 1]!);
  if (!(fin.quality === "P" && fin.simple === 1)) fixed[k + 1] = nearestOctave(cantus[k + 1], cp[k + 1]!, cantus[k + 1], cantusVoice);
  return fixed;
}

