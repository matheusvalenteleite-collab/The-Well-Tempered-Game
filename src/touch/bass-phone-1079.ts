/**
 * D1045, THE MUSICAL OFFERING'S BASS ON A PHONE (D645's measure for its canons, Fuga canonica and trio sonata, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_1079: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  "bwv1079-2": {"s":"bachBrass","sig":"[\"brassBass\",1.3,{\"hz\":600,\"db\":4.5},180,null,null]","db":null,"band":{"lu":[-34.7,-33.6,-34.2],"at":[-0.2,0,0],"mix":-29.8},"player":{"lu":[-34.7,-33.6,-35.9],"at":[0,0,-2.2],"mix":-30.3}},
  "bwv1079-3a": {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-38.1,-28.8],"at":[-3.6,0],"mix":-28.4},"player":{"lu":[-35.6,-30.4],"at":[0,-1.6],"mix":-29.3}},
  "bwv1079-3b": {"s":"vaudeville","sig":"[\"trioBassoon\",0.3,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-32.5,-29.2,-34.4],"at":[-1.9,3.6,0],"mix":-27.8},"player":{"lu":[-29.9,-29.2,-36.9],"at":[0,3.6,-2.2],"mix":-27.3}},
  "bwv1079-3c": {"s":"salsa","sig":"[\"jazzBass\",3.8,{\"hz\":320,\"db\":15,\"cut\":280},null,{\"hz\":700,\"db\":-1},[250,16,600]]","db":12,"band":{"lu":[-33.3,-32.6,-32.4],"at":[-1.4,0,0],"mix":-28.6},"player":{"lu":[-31.8,-32.6,-33.4],"at":[0,0,-1.8],"mix":-28.5}},
  "bwv1079-3d": {"s":"berlinSchool","sig":"[null,0.28,null,null,null,null]","db":null,"band":{"lu":[-31.9,-31.7,-32.6],"at":[-2.3,0,0],"mix":-27.6},"player":{"lu":[-29.5,-31.7,-32.9],"at":[0,0,-1.3],"mix":-26.7}},
  "bwv1079-3e": {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-32.4,-29.2,-32],"at":[-1.7,0,0],"mix":-28.2},"player":{"lu":[-30.4,-29.2,-32.5],"at":[0,0,-0.8],"mix":-27.9}},
  "bwv1079-4": {"s":"vaudeville","sig":"[\"trioBassoon\",0.3,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-31.7,-30.7,-35.4],"at":[-1.9,3.6,0],"mix":-28.9},"player":{"lu":[-29.3,-30.7,-37.1],"at":[0,3.6,-2.2],"mix":-28.2}},
  "bwv1079-7": {"s":"vocalSynth","sig":"[null,0.5,null,null,null,null]","db":null,"band":{"lu":[-31.7,-31.3,-28.3,-28.7],"at":[-1.5,0.7,0,0],"mix":-26.2},"player":{"lu":[-30.2,-31.3,-28.3,-29.7],"at":[0,0.7,0,-0.9],"mix":-26.2}},
  "bwv1079-8a": {"s":"super16","sig":"[\"cello16\",0.6,{\"hz\":700,\"db\":6},null,null,null]","db":null,"band":{"lu":[-30.1,-33.6,-33.1],"at":[-2,0,0],"mix":-27.6},"player":{"lu":[-28.9,-33.6,-32.6],"at":[0,0,-1.6],"mix":-26.9}},
  "bwv1079-8b": {"s":"super16","sig":"[\"cello16\",0.6,{\"hz\":700,\"db\":6},null,null,null]","db":null,"band":{"lu":[-28.7,-34.6,-33.9],"at":[-2,0,0],"mix":-27.1},"player":{"lu":[-28.6,-34.6,-32.2],"at":[0,0,-1.6],"mix":-26.7}},
  "bwv1079-8c": {"s":"super16","sig":"[\"cello16\",0.6,{\"hz\":700,\"db\":6},null,null,null]","db":null,"band":{"lu":[-30.5,-34.9,-31.9],"at":[-2,0,0],"mix":-27.7},"player":{"lu":[-29.1,-34.9,-32],"at":[0,0,-1.6],"mix":-27}},
  "bwv1079-8d": {"s":"super16","sig":"[\"cello16\",0.6,{\"hz\":700,\"db\":6},null,null,null]","db":null,"band":{"lu":[-30,-33.5,-32.7],"at":[-2,0,0],"mix":-27.4},"player":{"lu":[-29.4,-33.5,-31.9],"at":[0,0,-1.6],"mix":-26.9}},
  "bwv1079-9": {"s":"chorinho","sig":"[\"choroGuitar\",0.19,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-29.5,-29.5,-30.3],"at":[-1.7,0,0],"mix":-27.6},"player":{"lu":[-29.4,-29.5,-31.3],"at":[0,0,-1.8],"mix":-27.8}},
  "bwv1079-6": {"s":"bachBrass","sig":"[\"brassBass\",1.3,{\"hz\":600,\"db\":4.5},180,null,null]","db":null,"band":{"lu":[-32.8,-33.7],"at":[1.5,0],"mix":-30.5},"player":{"lu":[-33.7,-34.3],"at":[0,-1.2],"mix":-31.2}},
};
