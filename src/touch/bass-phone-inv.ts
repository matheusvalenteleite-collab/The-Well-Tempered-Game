/**
 * D734, THE INVENTIONS' AND SINFONIAS' BASS ON A PHONE (D645's measure for their 30 pieces, each on its own sound). D645, THE BASS ON A PHONE (generated: tools/touch/bass-phone/render.cjs, measure.py, fit.ts; do not edit by hand). Each of the
 * 48 fugues on its own sound: `band` the player on the top voice (the bass in the band), `player` the player on the
 * bass; `lu` each voice alone through the phone model (mono, two 2nd-order 600 Hz high-passes, ebur128: integrated LUFS),
 * `at` the balance's gain on it then (dB: the player's level on the player's voice, the band's trim on the others),
 * `mix` the whole (LUFS); `sig` the bass's patch as measured, `db` its exciter's mix then (Patch.phoneExcite); `x`
 * the bass alone fitted to its exciter's mix ([E0, Ex] dB: E = E0 + Ex·10^(db/10)). The fit (measured/fitted LUFS by mix):
 * none.
 */
import type { BassRun } from "./bass-phone.ts";

export const BASS_PHONE_INV: Readonly<Record<string, { s: string; sig: string; db: number | null; band: BassRun; player: BassRun }>> = {
  bwv772: {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-33,-31.5],"at":[-1.5,0],"mix":-29.4},"player":{"lu":[-33.1,-32.1],"at":[0.8,-0.7],"mix":-29.8}},
  bwv773: {"s":"berlinSchool","sig":"[null,0.27,null,null,null,null]","db":null,"band":{"lu":[-30.3,-32.2],"at":[-1.7,0],"mix":-28.3},"player":{"lu":[-30.4,-31.1],"at":[0,-2.3],"mix":-27.9}},
  bwv774: {"s":"chorinho","sig":"[\"choroGuitar\",0.19,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-30.5,-32.6],"at":[-0.7,0],"mix":-29.8},"player":{"lu":[-29.9,-32.7],"at":[0,-0.6],"mix":-29.3}},
  bwv775: {"s":"sid64","sig":"[null,0.45,null,null,null,null]","db":null,"band":{"lu":[-33,-36.9],"at":[-2.1,0],"mix":-31.6},"player":{"lu":[-34,-35.3],"at":[0,-1.5],"mix":-31.7}},
  bwv776: {"s":"jazzQuartet","sig":"[\"jazzBass\",0.85,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":6,"band":{"lu":[-28.9,-33],"at":[-0.2,3.8],"mix":-29},"player":{"lu":[-28.9,-32.7],"at":[0,3.6],"mix":-28.9}},
  bwv777: {"s":"bossaNova","sig":"[\"bossaGuitar\",0.55,{\"hz\":700,\"db\":5},null,{\"hz\":2600,\"db\":-3},null]","db":null,"band":{"lu":[-29.5,-31.1],"at":[1.8,0],"mix":-29.1},"player":{"lu":[-28.7,-30.6],"at":[3.4,-0.3],"mix":-28.6}},
  bwv778: {"s":"bossaNova","sig":"[\"bossaGuitar\",0.55,{\"hz\":700,\"db\":5},null,{\"hz\":2600,\"db\":-3},null]","db":null,"band":{"lu":[-28.7,-29.5],"at":[1.9,0],"mix":-28.5},"player":{"lu":[-27.9,-29.4],"at":[3.5,0],"mix":-28.1}},
  bwv779: {"s":"analog","sig":"[null,0.336,null,null,null,null]","db":null,"band":{"lu":[-34.4,-34.9],"at":[-1.2,0],"mix":-31.7},"player":{"lu":[-34.3,-34.7],"at":[0,-2],"mix":-31.6}},
  bwv780: {"s":"berlinSchool","sig":"[null,0.27,null,null,null,null]","db":null,"band":{"lu":[-29.5,-32.9],"at":[-1.3,0],"mix":-27.9},"player":{"lu":[-29.6,-30.9],"at":[0,-2.4],"mix":-27.3}},
  bwv781: {"s":"gameboy","sig":"[null,0.35,null,null,null,null]","db":null,"band":{"lu":[-34.4,-35.4],"at":[-2.4,0],"mix":-32},"player":{"lu":[-33.5,-34.9],"at":[0,-2.3],"mix":-31.4}},
  bwv782: {"s":"tracker","sig":"[\"bassMod\",0.4,null,null,null,null]","db":null,"band":{"lu":[-30.1,-35.1],"at":[3.6,0],"mix":-29},"player":{"lu":[-29.5,-34.7],"at":[4.9,-0.6],"mix":-28.4}},
  bwv783: {"s":"jazzQuartet","sig":"[\"jazzBass\",0.85,{\"hz\":320,\"db\":12,\"cut\":280},null,{\"hz\":700,\"db\":3},[250,16,600]]","db":6,"band":{"lu":[-30.2,-33.5],"at":[-0.9,1.9],"mix":-30.1},"player":{"lu":[-30.5,-33.2],"at":[0,1],"mix":-30.2}},
  bwv784: {"s":"petSounds","sig":"[\"rockBass\",0.85,{\"hz\":500,\"db\":11},null,{\"hz\":1600,\"db\":-4},null]","db":null,"band":{"lu":[-30.4,-33.6],"at":[-0.7,0],"mix":-31},"player":{"lu":[-31.3,-32.8],"at":[0,-0.6],"mix":-31.4}},
  bwv785: {"s":"analog","sig":"[null,0.336,null,null,null,null]","db":null,"band":{"lu":[-35,-36.4],"at":[-1.4,0],"mix":-32.9},"player":{"lu":[-35,-35.9],"at":[0,-2.3],"mix":-32.7}},
  bwv786: {"s":"tracker","sig":"[\"bassMod\",0.4,null,null,null,null]","db":null,"band":{"lu":[-31.3,-36.3],"at":[2.2,0],"mix":-30.3},"player":{"lu":[-32.1,-35.7],"at":[3.6,-0.7],"mix":-30.7}},
  bwv787: {"s":"super16","sig":"[\"bassoon16\",0.64,null,null,null,null]","db":null,"band":{"lu":[-32.9,-33.2,-34.1],"at":[0.2,1.8,0],"mix":-29},"player":{"lu":[-32.1,-33.2,-35.1],"at":[1.3,1.8,-0.2],"mix":-29}},
  bwv788: {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-33.3,-36,-33.4],"at":[-1.2,0.5,0],"mix":-30.3},"player":{"lu":[-32.6,-36,-33.1],"at":[0,0.5,-1.8],"mix":-29.9}},
  bwv789: {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-29.1,-31.8,-31.4],"at":[-0.6,0,0],"mix":-29.2},"player":{"lu":[-29.2,-31.8,-31.4],"at":[0,0,-0.3],"mix":-29.2}},
  bwv790: {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-28.8,-29,-32.7],"at":[-0.5,0,0],"mix":-27.9},"player":{"lu":[-28.1,-28.9,-32.5],"at":[0,0,-0.4],"mix":-27.6}},
  bwv791: {"s":"petSounds","sig":"[\"rockBass\",0.85,{\"hz\":500,\"db\":11},null,{\"hz\":1600,\"db\":-4},null]","db":null,"band":{"lu":[-33.4,-32.8,-34.2],"at":[0.3,0,0],"mix":-31.8},"player":{"lu":[-33.7,-32.8,-34.4],"at":[0.5,0,-0.1],"mix":-31.9}},
  bwv792: {"s":"chorinho","sig":"[\"choroGuitar\",0.19,{\"hz\":500,\"db\":9},null,null,null]","db":null,"band":{"lu":[-30,-31,-32],"at":[-0.6,0.6,0],"mix":-28.7},"player":{"lu":[-30.2,-31,-32.1],"at":[0,0.6,-0.3],"mix":-28.8}},
  bwv793: {"s":"tomita","sig":"[null,0.3,null,null,null,null]","db":null,"band":{"lu":[-32.3,-34,-33.2],"at":[-1.3,0,0],"mix":-29.1},"player":{"lu":[-31.4,-34,-33.4],"at":[0,0,-1.4],"mix":-28.9}},
  bwv794: {"s":"abbeyRoad","sig":"[\"rockBass\",0.25,{\"hz\":400,\"db\":12,\"cut\":200},null,null,[250,16,600]]","db":14,"band":{"lu":[-28.7,-28.8,-31.8],"at":[-0.6,0,0],"mix":-27.6},"player":{"lu":[-28.2,-28.8,-31.5],"at":[0,0,-0.3],"mix":-27.5}},
  bwv795: {"s":"pianoSampled","sig":"[\"piano\",0.3,{\"hz\":800,\"db\":5},null,null,null]","db":null,"band":{"lu":[-33.1,-34.9,-34.7],"at":[1.8,4.5,3],"mix":-30.4},"player":{"lu":[-33.2,-34.9,-34.2],"at":[0,4.5,2.6],"mix":-30.2}},
  bwv796: {"s":"sid64","sig":"[null,0.45,null,null,null,null]","db":null,"band":{"lu":[-31.9,-33.4,-37.2],"at":[-2,0,0],"mix":-29.1},"player":{"lu":[-33.5,-33.4,-35.2],"at":[0,0,-1.8],"mix":-29.4}},
  bwv797: {"s":"chip","sig":"-","db":null,"band":{"lu":[-32.6,-34.8,-35.2],"at":[-1.8,0,0],"mix":-29.5},"player":{"lu":[-31.2,-34.8,-34],"at":[0,0,-3.2],"mix":-28.5}},
  bwv798: {"s":"super16","sig":"[\"bassoon16\",0.64,null,null,null,null]","db":null,"band":{"lu":[-33.2,-34.8,-36.5],"at":[-0.1,0.4,0],"mix":-30.2},"player":{"lu":[-32.6,-34.8,-36.8],"at":[1.1,0.4,-1],"mix":-30.1}},
  bwv799: {"s":"chip","sig":"-","db":null,"band":{"lu":[-31.6,-33.7,-35.4],"at":[-1.5,0,0],"mix":-28.8},"player":{"lu":[-30.3,-33.7,-33.8],"at":[0,0,-3.5],"mix":-27.7}},
  bwv800: {"s":"salsa","sig":"[\"jazzBass\",3.8,{\"hz\":320,\"db\":15,\"cut\":280},null,{\"hz\":700,\"db\":-1},[250,16,600]]","db":12,"band":{"lu":[-31.6,-31.1,-35.5],"at":[-0.6,0,0],"mix":-29.5},"player":{"lu":[-31.2,-31.1,-36.2],"at":[0,0,-0.2],"mix":-29.5}},
  bwv801: {"s":"krautrock","sig":"[null,0.3,{\"hz\":400,\"db\":14},null,null,null]","db":null,"band":{"lu":[-30.7,-33.2,-31.7],"at":[-0.9,0.3,0],"mix":-30.3},"player":{"lu":[-31,-33.2,-31.8],"at":[0,0.3,-0.3],"mix":-30.3}},
};
