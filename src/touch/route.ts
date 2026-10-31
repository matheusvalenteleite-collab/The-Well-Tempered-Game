/**
 * D381: the headphones gone (or back): what to do with the sound's delay when the audio route may have
 * changed. The owner: "the game will keep a bluetooth latency compensator even if the player has turned
 * off their headphones … is there a way for the game to know that they have disconnected the headphones,
 * and thus, to immediately switch to wired mode?"
 *
 * What browsers give (see D381): no event says "headphones gone". The signals are indirect: the output
 * latency the AudioContext reports (`outputLatency`: Chrome, Firefox, Safari 18.4+; where it tells a
 * Bluetooth route from the speaker it is the best signal there is), `devicechange` (Chrome on Android
 * fires it on a Bluetooth connect or disconnect; iOS Safari only in pages that have used the microphone),
 * the AudioContext's state (iOS Safari passes through "interrupted" on some route changes), a playing
 * <audio> paused by the system (iOS pauses media when the headphones go: the game's silent keep-alive,
 * chip.ts), `navigator.audioSession`'s statechange (Safari 16.4+), and the page coming back to view.
 *
 * The rule, decided here from a reading of the latency and what prompted it (pure, so it is tested):
 * - a Bluetooth delay (over BT_AUTO_S) in force, tapped while the browser reported a Bluetooth-like latency
 *   (so this browser tells the routes apart), and now a speaker- or wire-like latency (BT_AUTO_S or less,
 *   JUMP_S under what it was): DROP the delay at once (kept to give back);
 * - a Bluetooth delay in force where the browser cannot tell (no latency, or the same latency either way):
 *   ASK (a chip, "Using speaker? Tap to reset delay") after a sign of a route change, or whenever the latency
 *   reads like the speaker's;
 * - no Bluetooth delay, and a Bluetooth-like latency again: RESTORE the delay dropped this visit (its
 *   latency within RESTORE_S) or the one D223's book keeps for that latency's setup; a Bluetooth-like
 *   latency with no delay known: RECALIBRATE (D223's banner).
 */
import { BT_AUTO_S, JUMP_S, lagFor, setupKey, type LagBook } from "./headphones.ts";

/** A reported latency at or under this (s) reads as the phone's speaker or a wire. */
export const SPEAKER_MAX_S = 0.06;
/** A dropped delay is given back when the latency comes back within this (s) of the one it was tapped with. */
export const RESTORE_S = 0.06;
/** After a sign of a route change, the latency read again at these delays (ms): it settles a moment after the switch. */
export const REREAD_MS = [300, 1200, 3500] as const;
/** The page back after at least this long hidden (ms) counts as a sign (the headphones may have gone meanwhile). */
export const AWAY_MS = 20000;

export type RouteSignal = "poll" | "start" | "devicechange" | "statechange" | "mediapause" | "resume";
/** The signs that the route may have changed (not the regular poll, nor the first reading). */
export const routeSign = (s: RouteSignal): boolean => s !== "poll" && s !== "start";

/** A Bluetooth delay dropped this visit, and the latency the browser reported when it was tapped. */
export interface Held {
  lag: number;
  at: number;
}

export interface RouteInput {
  /** The delay in force (s), or none. */
  lag: number | null;
  /** The output latency the browser reports now (s), if any. */
  reported: number | undefined;
  /** The latency the browser reported when the delay in force was tapped (s), if it reported one. */
  tappedAt: number | undefined;
  /** A delay dropped this visit, to give back. */
  held: Held | null;
  /** D223's delays by setup (headphones.ts setupKey). */
  book: LagBook;
  signal: RouteSignal;
}

export type RouteAction = { kind: "none" } | { kind: "drop" } | { kind: "restore"; lag: number } | { kind: "ask" } | { kind: "recalibrate" };

/** The latency (s) a setup's key was made from (its 50 ms bucket), if it was made from one. */
export function latOfSetup(key: string | undefined): number | undefined {
  const m = key ? /^lat:(\d+)$/.exec(key) : null;
  return m ? Number(m[1]) * 0.05 : undefined;
}

/** Whether the browser told the Bluetooth route apart when the delay was tapped (a Bluetooth-like latency then). */
export const tells = (tappedAt: number | undefined): tappedAt is number => tappedAt !== undefined && tappedAt > BT_AUTO_S;

export function routeDecision(i: RouteInput): RouteAction {
  const bt = i.lag !== null && i.lag > BT_AUTO_S;
  const r = i.reported;
  if (bt) {
    if (tells(i.tappedAt) && r !== undefined) return r <= BT_AUTO_S && r < i.tappedAt - JUMP_S ? { kind: "drop" } : { kind: "none" };
    // This browser cannot tell: ask, after a sign, or when the latency reads like the speaker's.
    if (r !== undefined && r <= SPEAKER_MAX_S) return { kind: "ask" };
    return routeSign(i.signal) ? { kind: "ask" } : { kind: "none" };
  }
  if (r === undefined || r <= BT_AUTO_S) return { kind: "none" };
  // A Bluetooth-like latency, no Bluetooth delay in force.
  if (i.held && Math.abs(r - i.held.at) <= RESTORE_S) return { kind: "restore", lag: i.held.lag };
  const stored = lagFor(i.book, setupKey(r));
  if (stored !== undefined && stored > BT_AUTO_S) return { kind: "restore", lag: stored };
  return i.lag === null && routeSign(i.signal) ? { kind: "recalibrate" } : { kind: "none" };
}
