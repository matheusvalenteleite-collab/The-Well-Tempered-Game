/**
 * D1043, THE GUITARS' ORNAMENTS AT THE LINE'S LEVEL (D508): on a plucked, fretted string (touch-expr.ts GUITAR_SAMPLES: the
 * guitars, the bandolim, the cavaquinho, the tres) every note of the player's ornament is a fresh pluck (proto-game.ts
 * soundParts, startTrill), four to eight of them where the held note it ornaments has been dying away: measured, the
 * ornaments sat 3-9 LU over the same notes held without them. Each ornament note plucked GUITAR_ORNAMENT_DB softer, by the
 * recording (its notes and times as they were; the fuzz guitar's more, its fuzz squashing the level put into it), so an
 * ornamented note is as loud as the plain one within 1 LU (measured: PSYCH I/20, BOSSA NOVA I/1, CHORINHO II/1 and the II/1
 * prelude, DECISIONS D1043). Every other sound as it was.
 */
import type { Play, Voicing } from "./chip.ts";
import { GUITAR_SAMPLES } from "./touch-expr.ts";

export const GUITAR_ORNAMENT_DB: Readonly<Record<string, number>> = { rockGuitar: -8, rockGuitar2: -20, choroGuitar: -9, bossaGuitar: -15 };
/** D1043: the Play an ornament's notes take on the player's voice `v` (a guitar's: softer; any other: the same object). */
export function ornamentPlay(v: Voicing, play: Play): Play {
  const smp = v.patch?.sample;
  if (!smp || !GUITAR_SAMPLES.has(smp)) return play;
  return { ...play, level: (play.level ?? 1) * 10 ** ((GUITAR_ORNAMENT_DB[smp] ?? 0) / 20) };
}
