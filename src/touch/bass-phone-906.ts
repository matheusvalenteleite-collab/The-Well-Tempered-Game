/**
 * D785, BWV 906'S AND 998'S BASS ON A PHONE (D645's measure for their five movements, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_906: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  "bwv906-1": {"s":"jazzQuartet","sig":"[\"piano\",0.24,{\"hz\":800,\"db\":5},null,{\"hz\":2800,\"db\":2},null]","db":null,"band":{"lu":[-30.2,-29.7],"at":[-0.9,1.9],"mix":-29},"player":{"lu":[-30.2,-29.2],"at":[0,1],"mix":-28.8}},
  "bwv906-2": {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-30.5,-29.7,-32.6],"at":[-1.7,0,0],"mix":-29.1},"player":{"lu":[-30.2,-29.6,-32],"at":[0,0,-0.8],"mix":-28.9}},
  "bwv998-1": {"s":"chorinho","sig":"[\"choroGuitar\",0.19,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-31.3,-37.6],"at":[-3,0],"mix":-31.3},"player":{"lu":[-30.5,-38.7],"at":[0,-2.5],"mix":-30.5}},
  "bwv998-2": {"s":"salsa","sig":"[\"jazzBass\",3.8,{\"hz\":320,\"db\":15,\"cut\":280},null,{\"hz\":700,\"db\":-1},[250,16,600]]","db":12,"band":{"lu":[-31.1,-30.9,-34.6],"at":[-1.8,0,1],"mix":-28.6},"player":{"lu":[-31.4,-30.9,-34.3],"at":[0,0,0.8],"mix":-28.8}},
  "bwv998-3": {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-37.1,-36.3],"at":[-3.6,0],"mix":-33.8},"player":{"lu":[-36.7,-38.5],"at":[0,-1.6],"mix":-34.7}},
};
