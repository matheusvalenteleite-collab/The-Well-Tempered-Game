/**
 * D317, THE LAB: what the engine tells the lab as it judges (ProtoGame.tap), structured, so that the
 * lab can show why each touch went as it did and a run's log can be replayed and compared. Times in
 * ticks (the lab turns them into bars and ms); px in the play area's CSS pixels.
 */
import type { Side } from "../../touch/thumbs.ts";
import type { BandEvent } from "../band-time.ts";

/** How LADDER judged a touch's height (proto-game.ts verdict). */
export interface LadderWhy {
  /** "own": from this thumb's last touch; "travel": the line's travel from an older touch; "free": not judged (first touch, after a pause or a slide, or the last touch too old). */
  ref: "own" | "travel" | "free" | "held";
  /** Why free. */
  freeWhy?: "first note" | "first touch" | "moved since" | "too old";
  /** The tune's move from the reference note (staff steps, + up). */
  steps?: number;
  /** The thumb's move from the reference touch (px, + up). */
  movedPx?: number;
  /** The judging row (px). */
  rowPx?: number;
  /** The rule: a repeat within `needPx` of level; a step not more than `needPx` the wrong way; a leap at least `needPx` the right way. */
  rule?: "repeat" | "step" | "leap" | "travel" | "edge" | "run";
  needPx?: number;
  /** When the line's travel was judged too (after the reference passed): its figures. */
  travel?: { steps: number; movedPx: number; needPx: number; ok: boolean };
  /** D332, RUNS "lenient": judged under the run rule (the run's way from either thumb's last touch; no line travel). */
  run?: { dir: 1 | -1; from: "own" | "other" | "none" | "strict" };
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
  /** D321: credited as joined because it was a drag with MECH.dragMeaning "connect" (no bonus, the chain kept). */
  drag?: boolean;
}

export type LabEvent =
  | { kind: "note"; tick: number; track: number; i: number; midi: number; side: Side; ok: boolean; why?: string; wrongMidi?: number; offMs: number; perfect: boolean; slide: boolean; lane?: string; ladder?: LadderWhy; legato?: LegatoWhy; gesture?: "hammer-on" | "pull-off" | "press" }
  /**
   * D334, PREPARED (B+): a thumb resting early on its note ("rest", how early), sounded by the other's
   * lift ("pull-off") or a press ("press": px moved, the other still down?), the other lifting before the
   * note's window ("early-lift", by how much), a press before it ("early-press"), the resting thumb let go
   * unsounded ("let-go"), and a press's over-legato as the other thumb lifts ("overlap", ms).
   */
  // D364: "hold-over" (armed: the note before still held past the note's PERFECT window, a step away, where a long appoggiatura goes), "appoggiatura" (the lift that resolved it: `grace` the held note, `ms` after the note's time, `share` of the note, `short` under MECH.holdOverShortMs).
  | { kind: "prep"; what: "rest" | "pull-off" | "press" | "early-lift" | "early-press" | "let-go" | "overlap" | "hold-over" | "appoggiatura"; tick: number; track: number; i: number; midi: number; side: Side; earlyMs?: number; px?: number; holding?: boolean; ms?: number; grace?: number; share?: number; short?: boolean }
  | { kind: "stray"; tick: number; track: number; side: Side; near?: { i: number; midi: number; offMs: number; taken?: string } }
  | { kind: "double"; tick: number; track: number; side: Side }
  | { kind: "miss"; tick: number; track: number; i: number; midi: number }
  | { kind: "slide"; tick: number; track: number; i: number; side: Side; movedPx: number }
  /** D486: a slide that failed, and why (slide-rule.ts SLIDE_CUE: the words shown at the thumb). */
  | { kind: "slideMiss"; tick: number; track: number; side: Side; why: "short" | "far" | "early" | "late" | "lifted" | "oneway"; on: number }
  /** D321, a drag with MECH.dragMeaning "connect": a glide (its length), or a keyboard's fill (coulé, Schleifer, a plain join) and its notes. */
  | { kind: "drag"; tick: number; track: number; i: number; side: Side; from: number; to: number; how: "glide" | "coule" | "schleifer" | "join" | "slur" | "gliss"; ms?: number; fill?: number[]; dragMs?: number }
  | { kind: "shake"; tick: number; track: number; i: number; side: Side; ornament: string; free: boolean }
  | { kind: "cancel"; tick: number; track: number; side: Side; ringsOn: boolean; mode: string }
  | { kind: "wait"; tick: number; track: number; i: number; side: Side; earlyMs: number }
  | { kind: "takeover"; tick: number; track: number; i: number; side: Side }
  /** D332, RUNS "lenient": a run ended (its last note judged or missed): its landings' fitted travel (px, + the run's way) against the travel needed. */
  | { kind: "run"; tick: number; track: number; i: number; dir: 1 | -1; notes: number; touches: number; slope: number; travelPx: number; needPx: number; maxPx: number; ok: boolean; ownShare?: number }
  /** D332: on RUN ✗, a note right only by the run rule re-judged WRONG (its points taken back). */
  | { kind: "revoked"; tick: number; track: number; i: number; midi: number; side: Side; pts: number }
  | { kind: "release"; tick: number; track: number; i: number; side: Side; word: string; heldMs: number; lenMs: number }
  /** D328, BAND TIME: the band waited for the player (ms), or set a beat's tempo (% of the written; its drift from the written time, ms). */
  | ({ kind: "band"; track: number } & BandEvent);
