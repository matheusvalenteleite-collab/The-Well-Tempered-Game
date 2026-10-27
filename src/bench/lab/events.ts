/**
 * D317, THE LAB: what the engine tells the lab as it judges (ProtoGame.tap), structured, so that the
 * lab can show why each touch went as it did and a run's log can be replayed and compared. Times in
 * ticks (the lab turns them into bars and ms); px in the play area's CSS pixels.
 */
import type { Side } from "../../touch/thumbs.ts";

/** How LADDER judged a touch's height (proto-game.ts verdict). */
export interface LadderWhy {
  /** "own": from this thumb's last touch; "travel": the line's travel from an older touch; "free": not judged (first touch, after a pause or a slide, or the last touch too old). */
  ref: "own" | "travel" | "free";
  /** Why free. */
  freeWhy?: "first note" | "first touch" | "moved since" | "too old";
  /** The tune's move from the reference note (staff steps, + up). */
  steps?: number;
  /** The thumb's move from the reference touch (px, + up). */
  movedPx?: number;
  /** The judging row (px). */
  rowPx?: number;
  /** The rule: a repeat within `needPx` of level; a step not more than `needPx` the wrong way; a leap at least `needPx` the right way. */
  rule?: "repeat" | "step" | "leap" | "travel" | "edge";
  needPx?: number;
  /** When the line's travel was judged too (after the reference passed): its figures. */
  travel?: { steps: number; movedPx: number; needPx: number; ok: boolean };
}

/** How the join into a note went (proto-game.ts play). */
export interface LegatoWhy {
  /** Joined in the score (and not detached by the reading): the join is judged. */
  judged: boolean;
  /** The other thumb was still down on the note before (an overlap). */
  holding: boolean;
  /** The note before was let go this long before this one was struck (ms); its allowance (ms). */
  gapMs?: number;
  allowedMs?: number;
  /** The note before was played right. */
  prevRight?: boolean;
  /** Credited as LEGATO (judged, holding or within the gap, the note before right, not a slide). */
  ok: boolean;
}

export type LabEvent =
  | { kind: "note"; tick: number; track: number; i: number; midi: number; side: Side; ok: boolean; why?: string; wrongMidi?: number; offMs: number; perfect: boolean; slide: boolean; lane?: string; ladder?: LadderWhy; legato?: LegatoWhy }
  | { kind: "stray"; tick: number; track: number; side: Side; near?: { i: number; midi: number; offMs: number; taken?: string } }
  | { kind: "double"; tick: number; track: number; side: Side }
  | { kind: "miss"; tick: number; track: number; i: number; midi: number }
  | { kind: "slide"; tick: number; track: number; i: number; side: Side; movedPx: number }
  | { kind: "shake"; tick: number; track: number; i: number; side: Side; ornament: string; free: boolean }
  | { kind: "cancel"; tick: number; track: number; side: Side; ringsOn: boolean; mode: string }
  | { kind: "release"; tick: number; track: number; i: number; side: Side; word: string; heldMs: number; lenMs: number };
