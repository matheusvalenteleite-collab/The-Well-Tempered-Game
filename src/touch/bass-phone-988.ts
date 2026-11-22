/**
 * D904, THE GOLDBERG VARIATIONS' BASS ON A PHONE (D645's measure for its 31, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_988: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  "bwv988-00": {"s":"super16","sig":"[\"bassoon16\",0.64,null,null,null,null]","db":null,"band":{"lu":[-33.4,-37.1,-37.1],"at":[-2,0,0],"mix":-31.2},"player":{"lu":[-32.5,-37.1,-38.7],"at":[0,0,-1.6],"mix":-31}},
  "bwv988-01": {"s":"berlinSchool","sig":"[null,0.28,null,null,null,null]","db":null,"band":{"lu":[-30.8,-34.1],"at":[-2.4,0],"mix":-29.3},"player":{"lu":[-30,-34.4],"at":[0,-2.8],"mix":-29}},
  "bwv988-02": {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-29.2,-31,-31.4],"at":[-1.9,0,0],"mix":-29.4},"player":{"lu":[-29.1,-31,-31.4],"at":[0,0,-1.2],"mix":-29.4}},
  "bwv988-03": {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-28.9,-30.8,-32.3],"at":[-1.9,0,0],"mix":-29.7},"player":{"lu":[-29.1,-30.8,-32.3],"at":[0,0,-1.2],"mix":-29.7}},
  "bwv988-04": {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-28.8,-28.7,-38,-33.2],"at":[-0.9,0,3.4,0.1],"mix":-28.9},"player":{"lu":[-28.4,-28.8,-38,-33.2],"at":[0,0,3.4,-0.5],"mix":-28.8}},
  "bwv988-05": {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-35.7,-31.2],"at":[-3.6,0],"mix":-30},"player":{"lu":[-34.6,-31.4],"at":[0,-1.6],"mix":-29.8}},
  "bwv988-06": {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-31.1,-28,-30.8],"at":[-1.7,0,0],"mix":-27},"player":{"lu":[-29.2,-28,-31.1],"at":[0,0,-0.8],"mix":-26.8}},
  "bwv988-07": {"s":"jazzQuartet","sig":"[\"jazzBass\",0.85,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":6,"band":{"lu":[-28.5,-34.5],"at":[-0.9,1.9],"mix":-29.2},"player":{"lu":[-28.1,-34.8],"at":[0,1],"mix":-29}},
  "bwv988-08": {"s":"harpsichordSampled","sig":"[\"harpsichord\",0.36,null,null,null,null]","db":null,"band":{"lu":[-28.1,-29.6],"at":[0.1,0],"mix":-25.8},"player":{"lu":[-28.7,-29.6],"at":[0,-0.7],"mix":-26.2}},
  "bwv988-09": {"s":"chorinho","sig":"[\"choroGuitar\",0.19,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-29.8,-30.9,-32.4],"at":[-1.7,0,0],"mix":-28.8},"player":{"lu":[-29.9,-30.9,-32.7],"at":[0,0,-1.8],"mix":-28.8}},
  "bwv988-10": {"s":"bossaNova","sig":"[\"jazzBass\",1.07,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":8,"band":{"lu":[-29.7,-32.5,-31.7,-33.9],"at":[0.2,0,0,0.4],"mix":-29},"player":{"lu":[-28.9,-32.5,-31.7,-34.2],"at":[2,0,0,-0.4],"mix":-28.8}},
  "bwv988-11": {"s":"jazzQuartet","sig":"[\"piano\",0.24,{\"hz\":800,\"db\":5},null,{\"hz\":2800,\"db\":2},null]","db":null,"band":{"lu":[-30.4,-27.7],"at":[-0.9,1.9],"mix":-27.6},"player":{"lu":[-30.1,-27.7],"at":[0,1],"mix":-27.6}},
  "bwv988-12": {"s":"chorinho","sig":"[\"choroGuitar\",0.19,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-29,-29.6,-30],"at":[-1.7,0,0],"mix":-27.5},"player":{"lu":[-29.3,-29.6,-30.7],"at":[0,0,-1.8],"mix":-27.6}},
  "bwv988-13": {"s":"super16","sig":"[\"bassoon16\",0.64,null,null,null,null]","db":null,"band":{"lu":[-33.2,-37.8,-37.3],"at":[-2,0,0],"mix":-31.2},"player":{"lu":[-33.1,-37.8,-38.3],"at":[0,0,-1.6],"mix":-31.3}},
  "bwv988-14": {"s":"berlinSchool","sig":"[null,0.28,null,null,null,null]","db":null,"band":{"lu":[-33.3,-29.8],"at":[-2.4,0],"mix":-28.5},"player":{"lu":[-32.6,-30.3],"at":[0,-2.8],"mix":-28.6}},
  "bwv988-15": {"s":"harpsichordSampled","sig":"[\"harpsichord\",0.36,null,null,null,null]","db":null,"band":{"lu":[-29,-33.1,-32.6],"at":[1.3,0,0],"mix":-27},"player":{"lu":[-30,-33.1,-31.2],"at":[0,0,1.3],"mix":-27.1}},
  "bwv988-16": {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-28.5,-28.9,-32.1],"at":[-1.7,0,0],"mix":-28.1},"player":{"lu":[-28,-28.7,-32],"at":[0,0,-0.8],"mix":-27.9}},
  "bwv988-17": {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-34.6,-32],"at":[-3.6,0],"mix":-30.1},"player":{"lu":[-34.8,-32.4],"at":[0,-1.6],"mix":-30.5}},
  "bwv988-18": {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-27.5,-32.3,-30.7],"at":[-1.9,0,0],"mix":-28.5},"player":{"lu":[-27.7,-32.3,-30.7],"at":[0,0,-1.2],"mix":-28.6}},
  "bwv988-19": {"s":"bossaNova","sig":"[\"jazzBass\",1.07,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":8,"band":{"lu":[-29.5,-26.9,-29.3],"at":[0.9,0,0.1],"mix":-26.5},"player":{"lu":[-29.1,-26.9,-29.2],"at":[2.8,0,-0.2],"mix":-26.3}},
  "bwv988-20": {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-36.7,-31.6],"at":[-3.6,0],"mix":-30.5},"player":{"lu":[-36.1,-31.9],"at":[0,-1.6],"mix":-30.6}},
  "bwv988-21": {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-33.1,-37.6,-31],"at":[-2.4,1.3,0],"mix":-28.9},"player":{"lu":[-31.6,-37.6,-31.3],"at":[0,1.3,-2.1],"mix":-28.7}},
  "bwv988-22": {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-31.9,-33.4,-31.4,-33.2],"at":[-1.2,0,0,0],"mix":-27.3},"player":{"lu":[-31.3,-33.4,-31.4,-34.3],"at":[0,0,0,-1.5],"mix":-27.4}},
  "bwv988-23": {"s":"berlinSchool","sig":"[null,0.28,null,null,null,null]","db":null,"band":{"lu":[-29.6,-31.6,-24.6,-34.7],"at":[-1.3,0,6,0],"mix":-27},"player":{"lu":[-29.6,-31.6,-24.6,-33.6],"at":[0,0,6,-1.5],"mix":-27.1}},
  "bwv988-24": {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-31.8,-38.6,-31.2],"at":[-2.4,1.3,0],"mix":-29.1},"player":{"lu":[-31.1,-38.6,-32.1],"at":[0,1.3,-2.1],"mix":-29.2}},
  "bwv988-25": {"s":"vocalSynth","sig":"[null,0.5,null,null,null,null]","db":null,"band":{"lu":[-31.1,-32.1,-31.5],"at":[-0.9,1,0],"mix":-27.4},"player":{"lu":[-30.3,-32.1,-32.4],"at":[0,1,-0.9],"mix":-27.4}},
  "bwv988-26": {"s":"salsa","sig":"[\"choroGuitar\",0.5,null,null,{\"hz\":2500,\"db\":3},null]","db":null,"band":{"lu":[-32.6,-42.7,-37.9],"at":[-1.4,0,0],"mix":-31.7},"player":{"lu":[-32.5,-42.7,-39],"at":[0,0,-1.8],"mix":-31.8}},
  "bwv988-27": {"s":"harpsichordSampled","sig":"[\"harpsichord\",0.36,null,null,null,null]","db":null,"band":{"lu":[-28.7,-29.9],"at":[0.1,0],"mix":-26.9},"player":{"lu":[-29.2,-30],"at":[0,-0.7],"mix":-27.2}},
  "bwv988-28": {"s":"salsa","sig":"[\"choroGuitar\",0.5,null,null,{\"hz\":2500,\"db\":3},null]","db":null,"band":{"lu":[-32.9,-40,-37.7],"at":[-1.4,0,0],"mix":-31.9},"player":{"lu":[-32.7,-40,-38.7],"at":[0,0,-1.8],"mix":-32}},
  "bwv988-29": {"s":"vocalSynth","sig":"[null,0.5,null,null,null,null]","db":null,"band":{"lu":[-35.8,-34.2,-35.7,-31.7],"at":[-1.5,0.7,0,0],"mix":-29.9},"player":{"lu":[-36.6,-34.2,-35.7,-31.5],"at":[0,0.7,0,-0.9],"mix":-29.7}},
  "bwv988-30": {"s":"bossaNova","sig":"[\"jazzBass\",1.07,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":8,"band":{"lu":[-30,-30.2,-30.7,-33.6],"at":[0.2,0,0,0.4],"mix":-28},"player":{"lu":[-29.7,-30.2,-30.7,-33.8],"at":[2,0,0,-0.4],"mix":-27.9}},
};
