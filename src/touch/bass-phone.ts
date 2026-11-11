/**
 * D645, THE BASS AUDIBLE ON A PHONE (the owner's standing rule): on the phone model (mono, two 2nd-order 600 Hz high-passes,
 * ebur128), each fugue's bass alone within BASS_GAP_DB of its loudest other voice alone, on its own sound, the bass in the
 * band and as the player's voice (measured: bass-phone-data.ts; test/d645-bass-phone.test.ts).
 */
import type { TouchFugue } from "./fugue.ts";
import { patchFor, pieceLineUp, setPieceLayout, setPreset, type Patch } from "./sound.ts";

/** D645: the fugue's bass patch on a sound (its own line-up, Preset.pieces), as the game seats it. */
export function bassPatchOf(sound: string, f: Pick<TouchFugue, "id" | "voices">): Patch | null {
  setPreset(sound);
  setPieceLayout(pieceLineUp(sound, f));
  const p = patchFor(f.voices.length - 1, f.voices.length);
  setPieceLayout(null);
  return p;
}
/** D645: what of the bass's patch its phone loudness rests on (the exciter's mix apart: the fit covers it). */
export function bassSig(p: Patch | null): string {
  if (!p) return "-";
  const x = p.phoneExcite;
  return JSON.stringify([p.sample ?? null, p.level ?? null, p.phoneLift ?? null, p.phoneHp ?? null, p.shelf ?? null, x ? [x.lp, x.drive, x.hp] : null]);
}
/** D645: the most the bass may sit under the loudest other voice on the phone model (LU): D508's lost voice (build.ts STRETCH_DB, test/d508's "audible"). */
export const BASS_GAP_DB = 6;
/** One run's measurement (bass-phone-data.ts). */
export type BassRun = { lu: readonly number[]; at: readonly number[]; mix: number | null; x?: readonly [number, number] };
