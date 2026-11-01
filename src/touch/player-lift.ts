/**
 * D487 (the owner: "I was playing some fugues and constantly had the impression that my voice was lower than all
 * others. For example, in C sharp major Book I. What is happening?!"). Measured on the whole game rendered offline
 * (tools/touch/player-lift/scan.cjs: the 48 fugues on their own sounds, the player in each voice): the player's notes
 * are not struck softer than the band's (as the player sounds a voice, it is within ±3 dB of the band sounding it, 0.3 dB
 * louder on average), but the voices are not level: the bass stands 4 to 7 dB over the upper voices on most sounds (a
 * phone's bass gain, D291, the bass patches, the organ's Subbass 16'), an inner voice often 1 to 3 dB under the top, and
 * Busoni's printed dynamics (on the piano) left the player's line up to 4 dB under the loudest voice for good (D407). In
 * I/3 on GAME BOY the soprano was 5.8 dB under the bass, the alto 4.9 dB under it; over the 48 fugues 116 of the 166
 * voices played sat more than 0.5 dB under some other voice (K-weighted), the worst 7.5 dB.
 *
 * The player's voice is now lifted, for the whole run, by the gap to the loudest other voice of the piece on the sound
 * (both K-weighted and through a phone speaker, the larger), and LIFT_FORWARD_DB more: never quieter, slightly
 * forward. Applied as one gain on the player's own bus (Chip.mine, with TOOLS' balance), so every note the player
 * sounds, its touch and its expression included, is lifted alike; a constant of the piece, the voice and the sound,
 * never of the play (the standing rule: loudness is never tied to right or wrong). A voice already the loudest is not
 * lowered. The measured levels: player-lift-data.ts (the piece's own sound exactly; another sound by its balance over
 * twelve fugues).
 */
import { OWN_LOUD, SOUND_LOUD } from "./player-lift-data.ts";

/** How far forward the player's voice stands over the loudest other voice (dB). */
export const LIFT_FORWARD_DB = 0.5;
/** The most the player's voice is lifted (dB). */
export const LIFT_MAX_DB = 9;

type Loud = readonly number[];

/** The measured levels for a piece on a sound: the player's in `voice` and every voice's as the band plays it ([K, phone] dB). */
export function loudness(id: string, sound: string, voice: number, count: number): { p: Loud; b: readonly Loud[] } | null {
  if (count < 2) return null;
  const own = OWN_LOUD[id];
  if (own && own.s === sound && own.b.length === count && own.p[voice]) return { p: own.p[voice], b: own.b };
  const by = SOUND_LOUD[sound];
  if (!by) return null;
  const ns = Object.keys(by).map(Number);
  // A count not measured (six voices, say): the nearest one measured, its last voice standing for the lowest.
  const n = ns.includes(count) ? count : ns.reduce((a, x) => (Math.abs(x - count) < Math.abs(a - count) ? x : a), ns[0]);
  const t = by[n];
  const at = (v: number) => (count === n ? v : v === count - 1 ? n - 1 : Math.min(n - 2, Math.round((v * (n - 1)) / Math.max(1, count - 1))));
  const b = Array.from({ length: count }, (_, v) => t.b[Math.max(0, at(v))]);
  const me = Math.max(0, at(voice));
  return { p: [t.b[me][0] + t.off[me][0], t.b[me][1] + t.off[me][1]], b };
}

/** The player's lift in dB for `voice` of `count` in piece `id` on `sound`: to the loudest other voice, and a little over. */
export function liftDb(id: string, sound: string, voice: number, count: number): number {
  const L = loudness(id, sound, voice, count);
  if (!L) return 0;
  let gap = -Infinity;
  L.b.forEach((u, k) => {
    if (k !== voice) gap = Math.max(gap, u[0] - L.p[0], u[1] - L.p[1]);
  });
  if (!Number.isFinite(gap)) return 0;
  return Math.max(0, Math.min(LIFT_MAX_DB, gap + LIFT_FORWARD_DB));
}

/** The lift as a gain on the player's own bus (1: none). */
export const liftGain = (id: string, sound: string, voice: number, count: number): number => 10 ** (liftDb(id, sound, voice, count) / 20);
