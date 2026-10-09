/** Pure helpers shared by the habit tables and the habit features. */
import { harmonic, simpleName } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { Staff } from "../../music/fux/index.ts";

/** Role of the counterpoint: "upper" when the cantus is below. */
export const roleOf = (cantusVoice: Staff): "upper" | "lower" => (cantusVoice === "lower" ? "upper" : "lower");

export const melodicKey = (from: string, to: string) => {
  const d = parsePitch(to).midi - parsePitch(from).midi;
  return String(Math.max(-12, Math.min(12, d)));
};

/**
 * The vertical interval with its octave count ("M3", "M3+1" = a tenth), so that spacing is learnt
 * too, marked "x" when the counterpoint has crossed to the cantus's side.
 */
export const verticalKey = (cantus: string, cp: string, cantusVoice: Staff) => {
  const h = harmonic(cantus, cp);
  const octaves = Math.floor((h.number - 1) / 7) - (h.number > 1 && (h.number - 1) % 7 === 0 ? 1 : 0);
  const d = parsePitch(cp).midi - parsePitch(cantus).midi;
  const crossed = cantusVoice === "lower" ? d < 0 : d > 0;
  return `${crossed ? "x" : ""}${simpleName(h)}${octaves > 0 ? `+${octaves}` : ""}`;
};

export const bits = (p: number) => -Math.log2(p);

/** Two vertical keys on successive downbeats: the same fifth or octave (unison) again? */
export const samePerfect = (a: string, b: string) => /^x?(5|8|1)(\+\d)?$/.test(a) && a.replace(/^x|\+\d$/g, "") === b.replace(/^x|\+\d$/g, "");
