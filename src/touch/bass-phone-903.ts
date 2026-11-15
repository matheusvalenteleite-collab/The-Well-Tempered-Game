/**
 * D775, THE CHROMATIC FUGUE'S BASS ON A PHONE (D645's measure for BWV 903-2 on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_903: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  "bwv903-2": {"s":"fluteHarp","sig":"[\"consortCello\",0.3,{\"hz\":700,\"db\":4},null,null,null]","db":null,"band":{"lu":[-30.5,-32.5,-33.4],"at":[-0.2,0,1.6],"mix":-28.1},"player":{"lu":[-31.5,-32.5,-33],"at":[0.3,0,0.4],"mix":-28.5}},
};
