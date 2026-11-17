/**
 * D711, THE ART OF FUGUE'S BASS ON A PHONE (D645's measure for its 20 pieces, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_AOF: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  "bwv1080-01": {"s":"berlinSchool","sig":"[null,0.28,null,null,null,null]","db":null,"band":{"lu":[-29.6,-29.1,-36.1,-34.3],"at":[-0.6,0,6,0],"mix":-26.7},"player":{"lu":[-29.9,-29.1,-36.1,-34.2],"at":[0,0,6,-0.5],"mix":-26.9}},
  "bwv1080-02": {"s":"jazzQuartet","sig":"[\"jazzBass\",0.85,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":6,"band":{"lu":[-28.8,-30.2,-30.9,-34.3],"at":[-0.7,1.1,1.3,5.9],"mix":-28},"player":{"lu":[-28.8,-30.2,-30.9,-34],"at":[0,1.1,1.3,5.1],"mix":-28}},
  "bwv1080-03": {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-31.5,-35.4,-30.1,-33.3],"at":[-1.2,0,0,0],"mix":-27.6},"player":{"lu":[-31.2,-35.4,-30.1,-33.2],"at":[0,0,0,-1.5],"mix":-27.5}},
  "bwv1080-04": {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-27.5,-32.7,-32.7,-31.8],"at":[-0.7,1.2,2.2,0],"mix":-28.8},"player":{"lu":[-28.6,-32.7,-32.7,-31.4],"at":[0,1.2,2.2,-0.6],"mix":-29.4}},
  "bwv1080-05": {"s":"bossaNova","sig":"[\"jazzBass\",1.07,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":8,"band":{"lu":[-28.2,-31.2,-33.3,-32.4],"at":[0.2,0,0,0.4],"mix":-28.2},"player":{"lu":[-28.6,-31.2,-33.3,-32],"at":[2,0,0,-0.4],"mix":-28.2}},
  "bwv1080-06": {"s":"petSounds","sig":"[\"rockBass\",0.85,{\"hz\":500,\"db\":11},null,{\"hz\":1600,\"db\":-4},null]","db":null,"band":{"lu":[-29.6,-27.8,-30.7,-32.9],"at":[-0.8,0,0,0],"mix":-27.9},"player":{"lu":[-30.3,-27.8,-30.6,-32.6],"at":[0,0,0,-0.5],"mix":-28.1}},
  "bwv1080-07": {"s":"bossaNova","sig":"[\"jazzBass\",1.07,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":8,"band":{"lu":[-28.5,-32.5,-33.2,-32.6],"at":[0.2,0,0,0.4],"mix":-28.4},"player":{"lu":[-27.9,-32.5,-33.2,-32.6],"at":[2,0,0,-0.4],"mix":-28.1}},
  "bwv1080-08": {"s":"sid64","sig":"[null,0.45,null,null,null,null]","db":null,"band":{"lu":[-30.6,-32.1,-35.5],"at":[-1.4,0,0],"mix":-27.9},"player":{"lu":[-32.6,-32.1,-33.9],"at":[0,0,-1],"mix":-28.4}},
  "bwv1080-09": {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-27.8,-33.3,-32.6,-31.6],"at":[-0.7,1.2,2.2,0],"mix":-28.8},"player":{"lu":[-29.1,-33.3,-32.6,-31.3],"at":[0,1.2,2.2,-0.6],"mix":-29.5}},
  "bwv1080-10": {"s":"tracker","sig":"[\"bassMod\",0.4,null,null,null,null]","db":null,"band":{"lu":[-30.8,-33,-34.6,-34.8],"at":[0.3,0,0.3,0],"mix":-28},"player":{"lu":[-32.1,-33,-34.6,-34.2],"at":[1.3,0,0.3,-0.6],"mix":-28.5}},
  "bwv1080-11": {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-32,-37.7,-33.5,-33.3],"at":[-1.2,0,0,0],"mix":-28.3},"player":{"lu":[-33.8,-37.7,-33.5,-32.2],"at":[0,0,0,-1.5],"mix":-28.5}},
  "bwv1080-12i": {"s":"megaFm","sig":"[null,0.289,null,null,null,null]","db":null,"band":{"lu":[-30.4,-36.1,-33.2,-34.1],"at":[-0.8,4.3,0,0],"mix":-28.1},"player":{"lu":[-31.2,-36.1,-33.2,-34.2],"at":[0.9,4.3,0,-1.5],"mix":-28.5}},
  "bwv1080-12r": {"s":"megaFm","sig":"[null,0.289,null,null,null,null]","db":null,"band":{"lu":[-30.5,-37.8,-32.7,-33.3],"at":[-0.8,4.3,0,0],"mix":-28},"player":{"lu":[-31.9,-37.8,-32.7,-34.1],"at":[0.9,4.3,0,-1.5],"mix":-28.6}},
  "bwv1080-13i": {"s":"chip","sig":"-","db":null,"band":{"lu":[-29.7,-34,-34.5],"at":[-1.8,0,1],"mix":-28},"player":{"lu":[-30.1,-34,-32.7],"at":[0,0,-2.1],"mix":-27.9}},
  "bwv1080-13r": {"s":"chip","sig":"-","db":null,"band":{"lu":[-29.7,-33.2,-34.8],"at":[-1.8,0,1],"mix":-28.1},"player":{"lu":[-30,-33.2,-33.4],"at":[0,0,-2.1],"mix":-27.9}},
  "bwv1080-14": {"s":"petSounds","sig":"[\"rockBass\",0.85,{\"hz\":500,\"db\":11},null,{\"hz\":1600,\"db\":-4},null]","db":null,"band":{"lu":[-30.2,-28.4,-30,-31.7],"at":[-0.8,0,0,0],"mix":-28},"player":{"lu":[-30.8,-28.4,-30,-31.6],"at":[0,0,0,-0.5],"mix":-28.1}},
  "bwv1080-c14": {"s":"vocalSynth","sig":"[null,0.5,null,null,null,null]","db":null,"band":{"lu":[-28.3,-32.3],"at":[0.9,0],"mix":-27.1},"player":{"lu":[-28.8,-30.8],"at":[2.3,0],"mix":-27.1}},
  "bwv1080-c15": {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-31.3,-30.3],"at":[-3.6,0],"mix":-28},"player":{"lu":[-32.4,-29.9],"at":[0,-1.6],"mix":-28.3}},
  "bwv1080-c16": {"s":"tracker","sig":"[\"bassMod\",0.4,null,null,null,null]","db":null,"band":{"lu":[-29.7,-35.1],"at":[3.6,0],"mix":-28.8},"player":{"lu":[-30.1,-34.6],"at":[4.9,-0.6],"mix":-29}},
  "bwv1080-c17": {"s":"berlinSchool","sig":"[null,0.28,null,null,null,null]","db":null,"band":{"lu":[-28.8,-33.4],"at":[-2.1,0],"mix":-28},"player":{"lu":[-28,-32.9],"at":[0,-1.9],"mix":-27.5}},
};
