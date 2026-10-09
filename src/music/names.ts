/** Note names for the View menu (D94): letters, or fixed-do solfège (do = C, as in Italian, French, Spanish). */
import { parsePitch } from "./pitch.ts";

export type NameStyle = "letters" | "solfege";
const SOLFEGE: Record<string, string> = { C: "do", D: "re", E: "mi", F: "fa", G: "sol", A: "la", B: "si" };

export function noteName(pitch: string, style: NameStyle = "letters"): string {
  const p = parsePitch(pitch);
  const acc = p.alter > 0 ? "♯".repeat(p.alter) : p.alter < 0 ? "♭".repeat(-p.alter) : "";
  return (style === "solfege" ? SOLFEGE[p.step] : p.step) + acc;
}
