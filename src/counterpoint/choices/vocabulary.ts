/**
 * The pitches a candidate may take: the mode's naturals plus the accidentals Fux himself writes in
 * his two-voice solutions on that final (C♯ and B♭ in D, B♭ in F, F♯ in G, G♯ and F♯ in A), within
 * a register window around the cantus. Used by the alternatives audit and the generators.
 */
import { parsePitch } from "../../music/pitch.ts";
import type { FuxRepository, ModalFinal, Staff } from "../../music/fux/index.ts";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** Accidentals ("C#", "Bb") found in Fux's two-voice counterpoints, by final. */
export function fuxAccidentals(repo: FuxRepository): Record<ModalFinal, string[]> {
  const out: Record<ModalFinal, Set<string>> = { D: new Set(), E: new Set(), F: new Set(), G: new Set(), A: new Set(), C: new Set() };
  for (const s of repo.dataset.solutions) {
    for (const n of s.counterpoint.notes) {
      if (n.pitch && /[#b]/.test(n.pitch)) out[s.modal_final as ModalFinal].add(n.pitch.replace(/-?\d+$/, ""));
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()])) as Record<ModalFinal, string[]>;
}

/** Spelled pitches between lo and hi (MIDI, inclusive): naturals and the given accidentals. */
export function pitchesBetween(lo: number, hi: number, accidentals: string[]): string[] {
  const out: string[] = [];
  for (let octave = 0; octave <= 8; octave++) {
    for (const l of LETTERS) {
      for (const name of [l, ...accidentals.filter((a) => a[0] === l)]) {
        const p = `${name}${octave}`;
        const m = parsePitch(p).midi;
        if (m >= lo && m <= hi) out.push(p);
      }
    }
  }
  return out.sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);
}

/**
 * Register window of the counterpoint: from a little across the cantus (crossing is allowed, D39)
 * to an octave and a fourth beyond its outer note on the counterpoint's side, widened to take in
 * Fux's own line when there is one.
 */
export function registerWindow(cantus: string[], cantusVoice: Staff, fux: (string | null)[] = []): [number, number] {
  const cf = cantus.map((p) => parsePitch(p).midi);
  let [lo, hi] = cantusVoice === "lower" ? [Math.min(...cf) - 2, Math.max(...cf) + 17] : [Math.min(...cf) - 17, Math.max(...cf) + 2];
  for (const p of fux) {
    if (!p || !/^[A-G]/.test(p)) continue;
    const m = parsePitch(p).midi;
    lo = Math.min(lo, m - 2);
    hi = Math.max(hi, m + 2);
  }
  return [lo, hi];
}
