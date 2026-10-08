import { interval } from "./interval.ts";
import { parsePitch } from "../music/pitch.ts";

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

