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
 * The levels: player-lift-data.ts (the piece's own sound exactly; another sound by its balance over four fugues of 2-5
 * voices, D703). D703: measured after the band's chain, the phone's balance and the computer's each from its own path.
 */
import { OWN_LOUD, SOUND_LOUD } from "./player-lift-data.ts";
import { SOLO_LOUD } from "./player-lift-solo.ts";

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
export const LIFT_MIN_DB = -5;
/** The player's voice brighter than the band sounding it by more than this (dB over 2.5 kHz) is shelved down. */
export const BRIGHT_SLACK_DB = 1.5;
/** The most the player's voice is shelved down (dB). */
export const BRIGHT_MAX_DB = 3;
/** For the measurement (scan.cjs): raw, nothing of the balance applied; `soloRaw` (D851) the solo pieces' player at 0 dB alone. */
export const BALANCE = { raw: false, soloRaw: false };

/** A piece's balance on a sound: per voice the band's trim `t`, the player's level `l`, the player's tone `h` (dB). */
export interface Balance {
  t: readonly number[];
  l: readonly number[];
  h: readonly number[];
}

/** D703: the path the game plays on now: a phone (a touch screen) or a computer; each has its own measured balance. */
export const phoneNow = (): boolean => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

/**
 * The balance for a piece on a sound with `count` voices (the piece's own measured; else the sound's by the count), on a
 * phone or a computer (D703: each measured after the band's chain on its own path; the computer's `d` where measured, the
 * phone's otherwise; `h`, the player's tone, one for both).
 */
export function balanceOf(id: string, sound: string, count: number, phone = phoneNow()): Balance | null {
  if (count < 2) return null;
  const own = OWN_LOUD[id];
  if (own && own.s === sound && own.t.length === count) return phone || !own.d ? own : { t: own.d.t, l: own.d.l, h: own.h };
  const by = SOUND_LOUD[sound];
  if (!by) return null;
  const ns = Object.keys(by).map(Number);
  // A count not measured (six voices, say): the nearest one measured, its last voice standing for the lowest.
  const n = ns.includes(count) ? count : ns.reduce((a, x) => (Math.abs(x - count) < Math.abs(a - count) ? x : a), ns[0]);
  const s0 = by[n];
  const s = phone || !s0.d ? s0 : { t: s0.d.t, l: s0.d.l, h: s0.h };
  const at = (v: number) => Math.max(0, count === n ? v : v === count - 1 ? n - 1 : Math.min(n - 2, Math.round((v * (n - 1)) / Math.max(1, count - 1))));
  const map = (xs: readonly number[]) => Array.from({ length: count }, (_, v) => xs[at(v)]);
  return { t: map(s.t), l: map(s.l), h: map(s.h) };
}

/** The player's level in dB for `voice` (the match to the band's sounding of it, with its trim). */
export function liftDb(id: string, sound: string, voice: number, count: number, phone = phoneNow()): number {
  if (BALANCE.raw) return 0;
  const b = balanceOf(id, sound, count, phone);
  return b ? Math.max(LIFT_MIN_DB, Math.min(LIFT_MAX_DB, b.l[voice] ?? 0)) : 0;
}
/** The level as a gain on the player's own bus (1: none). */
export const liftGain = (id: string, sound: string, voice: number, count: number, phone = phoneNow()): number => 10 ** (liftDb(id, sound, voice, count, phone) / 20);

/** The band's trim for `voice` (dB, 0 or more). */
export function bandTrimDb(id: string, sound: string, voice: number, count: number, phone = phoneNow()): number {
  if (BALANCE.raw) return 0;
  const b = balanceOf(id, sound, count, phone);
  return b ? Math.max(0, Math.min(BAND_TRIM_MAX_DB, b.t[voice] ?? 0)) : 0;
}

/** The player's tone for `voice` (Play.tone dB, 0 or less): a bright voice shelved down a little. */
export function playerToneDb(id: string, sound: string, voice: number, count: number, phone = phoneNow()): number {
  if (BALANCE.raw) return 0;
  const b = balanceOf(id, sound, count, phone);
  return b ? Math.max(-BRIGHT_MAX_DB, Math.min(0, b.h[voice] ?? 0)) : 0;
}

/** A subject note's lift (a gain): the player's PLAYER_ENTRY_DB; the band's BAND_ENTRY_DB, none where Busoni's palette brings it out. */
export function entryGain(player: boolean, busoniEntryDb = 0): number {
  if (BALANCE.raw) return 1;
  const db = player ? PLAYER_ENTRY_DB : busoniEntryDb > 0 ? 0 : BAND_ENTRY_DB;
  return 10 ** (db / 20);
}

/**
 * D851, THE SOLO OVER THE RIPIENO (the owner, on the harpsichord concertos through a phone: "the players' voice was getting
 * too drowned in the background"). In the many-voiced pieces, a soloist over an orchestra (the harpsichord concertos,
 * BWV 1043, the cantata BWV 54: SOLO_COLLECTIONS), D508's fugue balance does not hold: a sound's 2-5 voice table
 * (SOUND_LOUD) mapped onto 6-13 voices brought the ripieno's violins and viola up by up to 4.7 dB (a fugue's inner-voice
 * trims), and the player's level was matched to one voice while six to twelve others sum against it. Here instead, all
 * constants of the piece, the voice and the sound (never of the play; right or wrong alike; no dynamics from the notes):
 *
 *   THE BAND. No trims (none of a fugue table's); the bass floored on a phone (`tb`: D645's 6 LU, measured).
 *   (D853's doubling duck, a band note in unison with the player's lowered, withdrawn by D857: it tied a level to the notes.)
 *   THE PLAYER. Its level on its bus (`l`, `d` on a computer) measured on the piece's own sound (or a trial's, keyed
 *     `<piece>@<sound>`) so that the median margin
 *     of its line over the whole band (summed, as it sounds) is SOLO_TARGET_DB (player-lift-solo.ts), within
 *     SOLO_LIFT_MIN_DB..SOLO_LIFT_MAX_DB; on another sound D508's match alone (`l` less its trim), none of the table's trims.
 */
export const SOLO_COLLECTIONS: ReadonlySet<string> = new Set(["hconcerto", "concerto", "cantata"]);
/**
 * D851: the player's line over the whole band: the median margin aimed at (dB, on each path's own measure). D858 (the owner:
 * "any loudness assigned to player's voice ought to be subtle"): 0, level with the band's sum, from D852's +3: the smallest
 * of 0, +1, +2, +3 that keeps D508's lost stretches no more than +3's (17 on a phone, every one under the continuo's floor; none
 * under the violins at any of them; 0 on a computer).
 */
export const SOLO_TARGET_DB = 0;
/** D851: the bounds of the player's level there (dB). */
export const SOLO_LIFT_MAX_DB = 12;
export const SOLO_LIFT_MIN_DB = -3;

type SoloPiece = { id: string; collection?: string; voices: readonly unknown[] };
/** D851: a soloist over an orchestra (SOLO_COLLECTIONS). */
export const isSoloPiece = (f: Pick<SoloPiece, "collection">): boolean => !!f.collection && SOLO_COLLECTIONS.has(f.collection);

/** D851: the player's level (dB) in a solo piece: the measured row on its own sound, else D508's match without its trim. */
export function soloLiftDb(f: SoloPiece, sound: string, voice: number, phone = phoneNow()): number {
  // (BALANCE.soloRaw: the calibration's scan, the band as D851 plays it and the player at 0 dB.)
  if (BALANCE.raw || BALANCE.soloRaw) return 0;
  const row = SOLO_LOUD[`${f.id}@${sound}`] ?? SOLO_LOUD[f.id];
  const i = row && row.s === sound ? row.v.indexOf(voice) : -1;
  if (row && i >= 0) return Math.max(SOLO_LIFT_MIN_DB, Math.min(SOLO_LIFT_MAX_DB, (phone ? row.l[i] : (row.d?.[i] ?? row.l[i])) ?? 0));
  const n = f.voices.length;
  return Math.max(LIFT_MIN_DB, Math.min(LIFT_MAX_DB, liftDb(f.id, sound, voice, n, phone) - bandTrimDb(f.id, sound, voice, n, phone)));
}
/** D851: a band voice's trim (dB) in a solo piece: none, but the bass's floor on a phone where measured. */
export function soloTrimDb(f: SoloPiece, sound: string, voice: number, phone = phoneNow()): number {
  if (BALANCE.raw) return 0;
  const row = SOLO_LOUD[`${f.id}@${sound}`] ?? SOLO_LOUD[f.id];
  return row && row.s === sound && voice === f.voices.length - 1 ? Math.max(0, Math.min(BAND_TRIM_MAX_DB, (phone ? row.tb : row.tbd) ?? 0)) : 0;
}

