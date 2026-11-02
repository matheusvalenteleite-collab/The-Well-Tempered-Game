/**
 * D487 → D508, THE VOICES' BALANCE: the player's voice and the band's, measured.
 *
 * D487 (the owner: "my voice was lower than all others") lifted the player's voice for the whole run to the loudest
 * other voice of the piece and 1 dB over: a standing lift, often 3 to 8 dB. D508 (the owner, on II/18 G♯ minor: "the
 * ALTO is almost inaudible when I'm playing soprano … my own voice … dominating a bit given its bright sound … we need
 * careful considerations of whether we have let the polyphony down"; "find a middle ground: dominant when it's playing
 * the subject … merge with the others in other occasions … when other voices play the subject, they might get a bit
 * of dominance, though not too much"): measured on the whole game rendered offline (tools/touch/player-lift/scan.cjs,
 * every voice of the 48 fugues on its own sound, raw: none of this applied), the balance is now three things, all
 * constants of the piece, the voice, the sound and the place in the score, never of the play (the standing rule:
 * loudness is never tied to right or wrong):
 *
 *   LEVEL. The player's voice matched to the band's own sounding of that voice (`l`: the player's way of sounding it,
 *     its touch and its expression, against the band's, the mean of K-weighted and through a phone speaker): merged,
 *     no standing lift over the others. Where the player's voice measures much brighter than the band sounding it
 *     (over 2.5 kHz against the K-weighted, by more than BRIGHT_SLACK_DB), a gentle high shelf down (`h`, Play.tone).
 *   THE BAND'S VOICES. A voice standing more than BAND_SPREAD_DB under the loudest of the piece (an inner voice under
 *     the bass's phone gain, an alto under a bright soprano) brought up by the rest (`t`, at most BAND_TRIM_MAX_DB),
 *     the player's target with it; nothing is lowered (the bass audible on a phone).
 *   THE SUBJECT. The player's own subject entries forward by PLAYER_ENTRY_DB (each note of the entry, by its place in
 *     the score, right or wrong alike); the band's entries by BAND_ENTRY_DB (not more), never as much as the player's,
 *     and not where Busoni's palette brings the entry out itself (his marcato's entryDb: the reading's own).
 *
 * The levels: player-lift-data.ts (the piece's own sound exactly; another sound by its balance over twelve fugues).
 */
import { OWN_LOUD, SOUND_LOUD } from "./player-lift-data.ts";

/** The player's own subject entries forward (dB, each note of the entry). */
export const PLAYER_ENTRY_DB = 2;
/** The band's subject entries forward (dB): a slight lift, never as much as the player's. */
export const BAND_ENTRY_DB = 1;
/** A band voice under the loudest voice of the piece by more than this (dB) is brought up by the rest. */
export const BAND_SPREAD_DB = 2;
/** The most a band voice is brought up (dB). */
export const BAND_TRIM_MAX_DB = 6;
/** The player's level match, its bounds (dB): never over LIFT_MAX_DB, never more than LIFT_MIN_DB down. */
export const LIFT_MAX_DB = 6;
export const LIFT_MIN_DB = -4;
/** The player's voice brighter than the band sounding it by more than this (dB over 2.5 kHz) is shelved down. */
export const BRIGHT_SLACK_DB = 1.5;
/** The most the player's voice is shelved down (dB). */
export const BRIGHT_MAX_DB = 3;
/** For the measurement (scan.cjs): raw, nothing of the balance applied. */
export const BALANCE = { raw: false };

/** A piece's balance on a sound: per voice the band's trim `t`, the player's level `l`, the player's tone `h` (dB). */
export interface Balance {
  t: readonly number[];
  l: readonly number[];
  h: readonly number[];
}

/** The balance for a piece on a sound with `count` voices (the piece's own measured; else the sound's by the count). */
export function balanceOf(id: string, sound: string, count: number): Balance | null {
  if (count < 2) return null;
  const own = OWN_LOUD[id];
  if (own && own.s === sound && own.t.length === count) return own;
  const by = SOUND_LOUD[sound];
  if (!by) return null;
  const ns = Object.keys(by).map(Number);
  // A count not measured (six voices, say): the nearest one measured, its last voice standing for the lowest.
  const n = ns.includes(count) ? count : ns.reduce((a, x) => (Math.abs(x - count) < Math.abs(a - count) ? x : a), ns[0]);
  const s = by[n];
  const at = (v: number) => Math.max(0, count === n ? v : v === count - 1 ? n - 1 : Math.min(n - 2, Math.round((v * (n - 1)) / Math.max(1, count - 1))));
  const map = (xs: readonly number[]) => Array.from({ length: count }, (_, v) => xs[at(v)]);
  return { t: map(s.t), l: map(s.l), h: map(s.h) };
}

/** The player's level in dB for `voice` (the match to the band's sounding of it, with its trim). */
export function liftDb(id: string, sound: string, voice: number, count: number): number {
  if (BALANCE.raw) return 0;
  const b = balanceOf(id, sound, count);
  return b ? Math.max(LIFT_MIN_DB, Math.min(LIFT_MAX_DB, b.l[voice] ?? 0)) : 0;
}
/** The level as a gain on the player's own bus (1: none). */
export const liftGain = (id: string, sound: string, voice: number, count: number): number => 10 ** (liftDb(id, sound, voice, count) / 20);

/** The band's trim for `voice` (dB, 0 or more). */
export function bandTrimDb(id: string, sound: string, voice: number, count: number): number {
  if (BALANCE.raw) return 0;
  const b = balanceOf(id, sound, count);
  return b ? Math.max(0, Math.min(BAND_TRIM_MAX_DB, b.t[voice] ?? 0)) : 0;
}

/** The player's tone for `voice` (Play.tone dB, 0 or less): a bright voice shelved down a little. */
export function playerToneDb(id: string, sound: string, voice: number, count: number): number {
  if (BALANCE.raw) return 0;
  const b = balanceOf(id, sound, count);
  return b ? Math.max(-BRIGHT_MAX_DB, Math.min(0, b.h[voice] ?? 0)) : 0;
}

/** A subject note's lift (a gain): the player's PLAYER_ENTRY_DB; the band's BAND_ENTRY_DB, none where Busoni's palette brings it out. */
export function entryGain(player: boolean, busoniEntryDb = 0): number {
  if (BALANCE.raw) return 1;
  const db = player ? PLAYER_ENTRY_DB : busoniEntryDb > 0 ? 0 : BAND_ENTRY_DB;
  return 10 ** (db / 20);
}
