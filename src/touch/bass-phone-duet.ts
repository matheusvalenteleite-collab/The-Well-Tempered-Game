/**
 * D745, THE FOUR DUETS' BASS ON A PHONE (D645's measure for BWV 802-805, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_DUET: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  bwv802: {"s":"berlinSchool","sig":"[null,0.27,null,null,null,null]","db":null,"band":{"lu":[-29.1,-32.5],"at":[-1.4,0],"mix":-27.7},"player":{"lu":[-29.9,-31.2],"at":[0,-1.9],"mix":-27.8}},
  bwv803: {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-30.9,-30.9],"at":[-2.2,0],"mix":-28},"player":{"lu":[-31.5,-31.3],"at":[0.6,-1.2],"mix":-28.5}},
  bwv804: {"s":"jazzQuartet","sig":"[\"jazzBass\",0.85,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":6,"band":{"lu":[-27.7,-31.2],"at":[-0.6,2.7],"mix":-27.9},"player":{"lu":[-28.1,-30.7],"at":[0,2.1],"mix":-28}},
  bwv805: {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-29.7,-29.9],"at":[-1.7,0],"mix":-28.7},"player":{"lu":[-31.1,-30.1],"at":[0,-0.8],"mix":-29.4}},
};
