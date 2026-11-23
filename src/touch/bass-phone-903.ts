/**
 * D775, THE FANTASIAS AND FUGUES' BASS ON A PHONE (D645's measure for BWV 903-2 and, D779, BWV 951, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_903: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  "bwv903-2": {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-29.9,-29,-32.9],"at":[-1.7,0,0],"mix":-28},"player":{"lu":[-29.1,-28.9,-32.5],"at":[0,0,-0.8],"mix":-27.8}},
  bwv951: {"s":"stringConsort","sig":"[\"consortCelloSolo\",0.56,{\"hz\":700,\"db\":8},null,null,null]","db":null,"band":{"lu":[-30.2,-30.5,-30.1],"at":[1,5.2,0],"mix":-26.2},"player":{"lu":[-30.6,-30.5,-29.8],"at":[2.6,5.2,-1.5],"mix":-26.2}},
};
