/**
 * D720, MY FUGUE: a piece's set of takes, one starred per voice (D457's `star`), played together, every
 * voice not yet recorded played by the game. The set's sound and tempo are the piece's own (chosen as
 * ever, on the selection): every voice sounds on that one sound, whatever sound each take was recorded
 * on (only one sound is loaded at a time), and every take follows that tempo (a take is kept in the
 * score's places, so it keeps its own early and late at any tempo).
 *
 * The mixer: a level per voice (0 to 1.5, 1 as played), MUTE and SOLO, kept per piece on the device.
 */
import type { Take } from "./take.ts";

export interface MixVoice {
  level: number;
  mute: boolean;
  solo: boolean;
}

const KEY = "tb-myfugue-mix-v1";
export const LEVEL_MAX = 1.5;
export const LEVEL_STEP = 0.25;

export const flatMix = (voices: number): MixVoice[] => Array.from({ length: voices }, () => ({ level: 1, mute: false, solo: false }));

/** A piece's mixer as kept (a fresh one where none is, or the voices do not match). */
export function readMix(piece: string, voices: number): MixVoice[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, MixVoice[]>;
    const m = all[piece];
    if (Array.isArray(m) && m.length === voices) return m.map((v) => ({ level: clampLevel(Number(v.level)), mute: !!v.mute, solo: !!v.solo }));
  } catch {
    /* no storage */
  }
  return flatMix(voices);
}

export function saveMix(piece: string, mix: readonly MixVoice[]) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, MixVoice[]>;
    all[piece] = mix.map((v) => ({ ...v }));
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* no storage: for the visit only */
  }
}

export const clampLevel = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(LEVEL_MAX, Math.round(x / LEVEL_STEP) * LEVEL_STEP)) : 1);

/** Each voice's level as heard: a voice muted, or not soloed while another is, is silent. */
export function gains(mix: readonly MixVoice[]): number[] {
  const solo = mix.some((v) => v.solo);
  return mix.map((v) => (v.mute || (solo && !v.solo) ? 0 : v.level));
}

/** The starred take of each voice (the set), by voice. */
export function starred(takes: readonly Take[]): Map<number, Take> {
  const m = new Map<number, Take>();
  for (const t of takes) if (t.star && !m.has(t.voice)) m.set(t.voice, t);
  return m;
}

/**
 * What a run of MY FUGUE plays: LISTEN (no voice played) puts the first starred take as the "player's"
 * voice and the rest behind it; RECORD (a voice played) puts every starred take of another voice behind.
 */
export function backingFor(set: ReadonlyMap<number, Take>, played: number | null): { main: Take | null; backing: Take[] } {
  const all = [...set.values()].sort((a, b) => a.voice - b.voice);
  if (played === null) return { main: all[0] ?? null, backing: all.slice(1) };
  return { main: null, backing: all.filter((t) => t.voice !== played) };
}
