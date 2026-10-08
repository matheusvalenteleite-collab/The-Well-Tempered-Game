/**
 * Saved pieces (decision D49): a snapshot of everything that shapes what is heard and shown, so
 * that a piece plays back exactly as it was. Kept per viewer in localStorage ("wtg.saved"). Pure.
 */
import type { SoundState } from "../audio/sound.ts";
import { restoreSound } from "../audio/sound.ts";
import type { DrumSettings } from "../audio/drums.ts";
import type { TemperamentId } from "../audio/temperament.ts";
import { TEMPERAMENTS } from "../audio/temperament.ts";
import type { PlayMode } from "./continuo-input.ts";
import { validContinuoSettings, type ContinuoSettings } from "./continuo-settings.ts";
import { validVersions, type Versions } from "./versions.ts";

export interface Piece {
  id: string;
  name: string;
  /** ISO time. */
  savedAt: string;
  stepId: string;
  /** The player's line as written (one entry per slot). */
  notes: (string | null)[];
  versions: Versions;
  /** "fux" / "trio" when Fux was on the score or playing; otherwise "player". */
  mode: PlayMode;
  sound: SoundState;
  drums: boolean;
  drumKit: DrumSettings;
  continuo: boolean;
  continuoSettings: ContinuoSettings;
  tuning: TemperamentId;
  /** Half notes per minute. */
  tempo: number;
  /** Master volume, 0..100. */
  volume: number;
}

export type Setup = Omit<Piece, "id" | "name" | "savedAt">;

/** Which playback a snapshot keeps: Fux playing, else Fux on the score (as a trio), else the player's lines. */
export function snapshotMode(playing: PlayMode | null, fuxShown: boolean): PlayMode {
  if (playing === "fux" || playing === "trio") return playing;
  return fuxShown ? "trio" : "player";
}

export function makePiece(setup: Setup, name: string, now = new Date()): Piece {
  return { ...structuredClone(setup), id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name, savedAt: now.toISOString() };
}

/** Restore stored pieces, dropping anything malformed and repairing settings field by field. */
export function restorePieces(raw: unknown, validDrums: (d: unknown) => DrumSettings): Piece[] {
  if (!Array.isArray(raw)) return [];
  const out: Piece[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    if (typeof r !== "object" || r === null) continue;
    if (typeof r.id !== "string" || typeof r.stepId !== "string" || !Array.isArray(r.notes)) continue;
    if (!r.notes.every((n) => n === null || typeof n === "string")) continue;
    out.push({
      id: r.id,
      name: typeof r.name === "string" ? r.name : "",
      savedAt: typeof r.savedAt === "string" ? r.savedAt : new Date(0).toISOString(),
      stepId: r.stepId,
      notes: r.notes as (string | null)[],
      versions: validVersions(r.versions),
      mode: r.mode === "fux" || r.mode === "trio" ? r.mode : "player",
      sound: restoreSound(r.sound),
      drums: r.drums === true,
      drumKit: validDrums(r.drumKit),
      continuo: r.continuo === true,
      continuoSettings: validContinuoSettings(r.continuoSettings),
      tuning: TEMPERAMENTS.includes(r.tuning as TemperamentId) ? (r.tuning as TemperamentId) : "equal",
      tempo: typeof r.tempo === "number" && r.tempo >= 30 && r.tempo <= 240 ? r.tempo : 60,
      volume: typeof r.volume === "number" && r.volume >= 0 && r.volume <= 100 ? r.volume : 70,
    });
  }
  return out;
}

/** Duration in seconds of one pass of `bars` bars at `tempo` half notes per minute. */
export const pieceSeconds = (bars: number, tempo: number) => (bars * 120) / tempo;

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
